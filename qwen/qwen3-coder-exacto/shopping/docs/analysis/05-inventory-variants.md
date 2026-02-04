# E-Commerce Shopping Mall Platform Requirements Specification

## 1. Introduction

This document defines the comprehensive requirements for an E-Commerce Shopping Mall Platform that facilitates online buying and selling of goods between customers and sellers. The platform incorporates robust inventory management, order processing, payment handling, shipping coordination, and customer review systems.

## 2. User Account Management

### 2.1 Customer Account System

WHEN a customer accesses any feature of the platform, THE system SHALL require registration and authentication before granting access.

WHEN a customer registers, THE system SHALL collect their email address and password for authentication.

WHEN a customer logs in, THE system SHALL authenticate them using their email and password credentials.

WHEN a customer requests to change their password, THE system SHALL verify their current credentials and allow them to set a new password.

WHEN a customer requests to delete their account, THE system SHALL:
- Delete their profile information including display name and phone number
- Preserve their order history and records for seller records and legal purposes
- Preserve their reviews but display them as authored by "deleted user"

### 2.2 Customer Profile System

Each customer SHALL have a profile containing:
- Display name
- Phone number

WHEN a customer edits their profile, THE system SHALL update their display name and/or phone number with the provided values.

### 2.3 Address Management System

WHEN a customer manages addresses, THE system SHALL allow them to:
- Add multiple shipping addresses
- Edit existing addresses
- Delete addresses
- Set one address as their default shipping address

Each address SHALL contain:
- Recipient name
- Phone number
- Street address
- City
- State/province
- Postal code
- Country

### 2.4 Seller Account System

WHEN a seller registers, THE system SHALL collect their email address and password for authentication.

WHEN a seller logs in, THE system SHALL authenticate them using their email and password credentials.

WHEN a seller requests to change their password, THE system SHALL verify their current credentials and allow them to set a new password.

WHEN a seller registers, THE system SHALL place their account in pending approval status until an administrator approves it.

WHEN a seller accesses their account, THE system SHALL display their current approval status (pending, approved, rejected).

WHEN a seller's registration is rejected, THE system SHALL display the rejection reason to the seller.

WHEN a rejected seller resubmits their registration, THE system SHALL place their account in pending approval status again.

WHEN a seller requests to delete their account, THE system SHALL:
- Verify that they have no pending orders (paid or shipped status)
- Verify that they have no pending cancellation or refund requests
- IF both conditions are met, delete their account
- Delete their products from listings
- Preserve order history and snapshots
- Preserve their shop name in past orders

### 2.5 Seller Profile System

Each seller SHALL have a profile containing:
- Shop name
- Shop description
- Logo image

WHEN a seller edits their profile, THE system SHALL:
- Update their shop name, description, and/or logo with the provided values
- Create a snapshot of their profile before the edit

WHEN a customer views a seller's products, THE system SHALL display the seller's profile information.

## 3. Category Organization System

### 3.1 Category Structure

THE platform SHALL organize products into categories.

Categories SHALL support one level of subcategories.

Each category SHALL contain:
- Name
- Description

### 3.2 Category Management

WHEN an administrator creates or modifies categories, THE system SHALL allow them to define category names and descriptions.

WHEN an administrator creates subcategories, THE system SHALL associate them with a parent category.

### 3.3 Category Navigation

WHEN customers browse the platform, THE system SHALL display a list of all categories.

WHEN customers select a category, THE system SHALL display all products within that category.

## 4. Data Snapshot System

### 4.1 Snapshot Principles

WHEN editable data is modified, THE system SHALL create an immutable snapshot to preserve the previous state.

Snapshots SHALL record:
- Timestamp of the change
- What was changed
- Values before and after the change

Snapshots SHALL be immutable and cannot be deleted.

WHEN relevant parties access data records, THE system SHALL allow them to view snapshots for dispute resolution.

### 4.2 Snapshot Applications

THE system SHALL create snapshots for:
- Product modifications (all fields including images)
- Product variant modifications (SKU code, option values, price)
- Seller profile modifications (shop name, description, logo)
- Order items (product, variant, and seller profile at time of purchase)
- Reviews (rating, text content)
- Cancellation requests (reason, status changes)
- Refund requests (reason, status changes)

## 5. Product Management System

### 5.1 Product Structure

WHEN sellers create products, THE system SHALL require:
- Name (required)
- Description (required)
- Category (required, can select a subcategory)
- Base price (required)

Products SHALL belong to the seller who created them.

### 5.2 Product Operations

WHEN sellers edit their products, THE system SHALL:
- Update the product with provided values
- Create a snapshot of the product before the edit

WHEN sellers delete their products, THE system SHALL:
- Verify that there are no pending order items (paid or shipped status) for any variant of the product
- Verify that there are no pending cancellation or refund requests for any variant of the product
- IF both conditions are met, delete the product
- Delete all variants and inventory records associated with the product
- Remove the product from search and category listings

WHEN users access product information, THE system SHALL allow sellers to view snapshots of their own products.

WHEN users access product information, THE system SHALL allow administrators to view snapshots of any product.

WHEN a product is deleted, THE system SHALL preserve its snapshots.

### 5.3 Product Images

WHEN sellers manage product images, THE system SHALL allow them to:
- Upload multiple images for each product
- Reorder images (first image becomes the main/thumbnail image)
- Delete images from their products

WHEN product images are modified, THE system SHALL include these changes in product snapshots.

### 5.4 Product Search and Display

WHEN customers search for products, THE system SHALL allow them to search by product name.

WHEN displaying search results, THE system SHALL:
- Show products from all sellers
- Paginate results
- Allow filtering by:
  - Category
  - Price range (minimum and maximum)
  - In-stock only
- Allow sorting by:
  - Newest first
  - Price (low to high)
  - Price (high to low)

WHEN displaying product listings, THE system SHALL show for each product:
- Main image (thumbnail)
- Name
- Base price (or price range if variants have different prices)
- Seller shop name
- Average rating (if reviews exist)

WHEN customers view a product detail page, THE system SHALL display:
- All images
- Name and description
- Category
- Seller shop name (with link to seller profile)
- All available variants with prices and stock status
- Average rating and total review count
- All reviews

## 6. Product Variant (SKU) System

### 6.1 Variant Structure

Products MAY have multiple variants representing specific combinations of options (e.g., "Red / Large", "Blue / Small").

Each variant SHALL contain:
- SKU code (unique identifier, required)
- Option values (e.g., color: "Red", size: "Large")
- Price (can override the base price, optional)
- Stock quantity (required, starts at 0)

Products MUST have at least one variant to be purchasable.

Products with no variants SHALL be visible in search but shown as "unavailable".

### 6.2 Variant Operations

WHEN sellers add variants to their products, THE system SHALL associate them with the parent product.

WHEN sellers edit variants, THE system SHALL:
- Update the variant with provided values
- Create a snapshot of the variant before the edit

WHEN sellers delete variants, THE system SHALL:
- Verify that there are no pending order items (paid or shipped status) for that variant
- Verify that there are no pending cancellation or refund requests for that variant
- IF both conditions are met, delete the variant

### 6.3 Inventory Management System

Each variant SHALL have its own stock quantity managed through inventory history records.

Each inventory record SHALL contain:
- Quantity change (positive for restocking, negative for orders/adjustments)
- Reason for the change
- Timestamp

Current stock SHALL be calculated by summing all inventory records.

WHEN sellers manage inventory, THE system SHALL allow them to:
- Add inventory (restock) with a quantity and reason
- Subtract inventory (adjustment/loss) with a quantity and reason

WHEN orders are placed, THE system SHALL automatically create negative inventory records for purchased variants.

WHEN orders are cancelled or refunded, THE system SHALL automatically create positive inventory records to restore stock.

WHEN sellers access variant information, THE system SHALL allow them to view the full inventory history.

WHEN a variant's stock reaches 0, THE system SHALL display it as "out of stock".

WHEN customers attempt to add items to cart, THE system SHALL prevent out-of-stock variants from being added.

## 7. Wishlist System

WHEN customers manage their wishlist, THE system SHALL allow them to:
- Add products to their wishlist
- View their wishlist (paginated)
- Remove products from their wishlist

THE system SHALL show products (not specific variants) in the wishlist.

WHEN a seller deletes a product, THE system SHALL automatically remove it from all customer wishlists.

## 8. Shopping Cart System

### 8.1 Cart Operations

WHEN customers add items to cart, THE system SHALL:
- Require selection of a specific variant (not just a product)
- Allow specification of quantity
- IF the same variant is already in the cart, combine the quantities (not add as a separate line)

WHEN customers view their cart, THE system SHALL display:
- Each item with product name, variant options, price, quantity, and subtotal
- The total price of all items

WHEN customers modify their cart, THE system SHALL allow them to:
- Change the quantity of items
- Remove items

### 8.2 Cart Validation

WHEN customers view their cart, IF a variant's stock is less than the cart quantity, THE system SHALL display a warning.

WHEN customers view their cart, IF a variant is deleted or out of stock, THE system SHALL mark it as unavailable.

## 9. Checkout System

WHEN customers proceed to checkout, THE system SHALL:
- Prevent checkout of unavailable items
- Require selection of a shipping address (or use default)
- Display an order summary including:
  - List of items with prices
  - Shipping address
  - Total price

ONCE an order is placed, THE system SHALL prevent changes to the shipping address.

## 10. Payment Processing System

AFTER customers review their order, THE system SHALL allow them to confirm and place the order.

WHEN processing payments, THE system SHALL integrate with an external payment gateway.

WHEN a payment succeeds, THE system SHALL create the order.

WHEN a payment fails, THE system SHALL:
- Not create the order
- Allow customers to retry payment

## 11. Order Creation System

WHEN an order is placed successfully, THE system SHALL:
- Decrease stock quantities for each purchased variant
- Remove items from the customer's cart
- Create an order record
- Create order items with status "paid" for each purchased variant
- Save snapshots of purchased products and variants with the order items
- Save snapshots of seller profiles with the order items

## 12. Order Structure and Management

### 12.1 Order Composition

Orders SHALL contain one or more order items.

Each order item SHALL represent a purchased product variant with a quantity.

IF a customer buys 3 of the same variant, THE system SHALL create one order item with quantity 3.

Order items MAY be from different sellers.

### 12.2 Order Status System

#### 12.2.1 Item Status

Each order item SHALL have its own status:
- Paid: payment completed, waiting for seller to ship
- Shipped: seller has shipped the item
- Delivered: item has been delivered
- Cancelled: item was cancelled
- Refunded: item was refunded

#### 12.2.2 Order Status

The overall order status SHALL be derived from its items:
- IF all items are paid → order is "paid"
- IF any item is shipped (and none delivered yet) → order is "shipped"
- IF all items are delivered → order is "delivered"
- IF all items are cancelled → order is "cancelled"
- IF all items are refunded → order is "refunded"
- IF items have mixed states (e.g., some delivered, some refunded) → order is "partially completed"

### 12.3 Order History

WHEN customers view their order history, THE system SHALL display:
- A paginated list sorted by newest first
- For each order: order number, date, total price, and overall order status

WHEN customers view order details, THE system SHALL display:
- List of items with product name, variant, quantity, price, and item status
- Shipping address
- List of shipments with tracking information (showing which items are included)

## 13. Shipping and Tracking System

### 13.1 Shipment Concept

Shipments SHALL represent packages sent by sellers.

A shipment MAY contain one or more order items from the same seller.

Different sellers SHALL always ship separately (different shipments).

A seller MAY choose to ship items individually or bundle multiple items into one shipment.

### 13.2 Shipping Process

WHEN sellers view order items that need shipping, THE system SHALL display items with "paid" status.

WHEN sellers create shipments, THE system SHALL:
- Allow selection of one or more of their items to include in a shipment
- Require entry of tracking information (carrier name, tracking number)
- Ensure all items in the same shipment share the same tracking information
- Change all items in the shipment to status "shipped"

### 13.3 Delivery Confirmation

WHEN customers view order details, THE system SHALL display tracking information for each shipment.

WHEN customers confirm delivery, THE system SHALL change all items in that shipment to status "delivered".

IF customers do not confirm delivery, THE system SHALL automatically change items to "delivered" after 14 days from shipping.

## 14. Order Cancellation System

WHEN customers request cancellation, THE system SHALL:
- Allow cancellation per order item (not entire order)
- Only allow cancellation for items with status "paid" (not yet shipped)
- Require a reason (text) for the cancellation request

WHEN sellers respond to cancellation requests, THE system SHALL:
- Allow approval or rejection of the request
- Create a snapshot of the request state

WHEN a cancellation is approved, THE system SHALL:
- Cancel that item
- Process refund for that item only
- Restore stock quantities for that item

WHEN all items in an order are cancelled, THE system SHALL change the overall order status to "cancelled".

## 15. Refund Request System

WHEN customers request a refund, THE system SHALL:
- Allow refund requests per order item (not entire order)
- Only allow refund requests for items with status "delivered"
- Require the request to be made within 7 days of that item being delivered
- Require a reason (text) for the refund request

WHEN sellers respond to refund requests, THE system SHALL:
- Allow approval or rejection of the request
- Create a snapshot of the request state

WHEN a refund is approved, THE system SHALL:
- Refund that item
- Restore stock quantities for that item

WHEN all items in an order are refunded, THE system SHALL change the overall order status to "refunded".

## 16. Reviews and Ratings System

### 16.1 Review Creation

WHEN customers write reviews, THE system SHALL:
- Only allow reviews for products they have purchased
- Only allow reviews after that item's status is "delivered"
- Allow one review per product per order
- Require a rating (1 to 5 stars)
- Allow optional text content

### 16.2 Review Display and Management

WHEN displaying product details, THE system SHALL show reviews sorted by newest first.

WHEN customers manage their reviews, THE system SHALL allow them to:
- Edit their own reviews
- Delete their own reviews

WHEN customers edit reviews, THE system SHALL create a snapshot of the review before the edit.

WHEN customers delete reviews, THE system SHALL:
- Remove the review from public display
- Preserve snapshots of the review

WHEN calculating product ratings, THE system SHALL include all non-deleted reviews.

## 17. Seller Dashboard System

WHEN sellers access their dashboard, THE system SHALL display:
- Total number of products
- Total number of order items (for their products)
- Number of pending cancellation requests
- Number of pending refund requests

WHEN sellers view their order items, THE system SHALL allow filtering by status.

## 18. Administrator System

### 18.1 Administrator Management

WHEN users request administrator privileges, THE system SHALL:
- Allow any user (customer or seller) to submit a request
- Require a reason (text) for the request

WHEN super administrators view requests, THE system SHALL display a list of pending requests.

WHEN super administrators process requests, THE system SHALL allow them to approve or reject requests.

WHEN a request is approved, THE system SHALL grant the user regular administrator privileges.

### 18.2 Administrator Grades

The system SHALL support two administrator grades:
- Regular administrator
- Super administrator

WHEN super administrators manage other administrators, THE system SHALL allow them to:
- Promote regular administrators to super administrator
- Demote other super administrators to regular administrator

Super administrators SHALL NOT be able to demote themselves.

### 18.3 Seller Management

WHEN administrators view seller registrations, THE system SHALL display pending approvals.

WHEN administrators process registrations, THE system SHALL allow them to approve or reject seller registrations.

WHEN rejecting a registration, THE system SHALL require administrators to provide a reason.

WHEN rejected sellers resubmit registrations, THE system SHALL place them in pending approval status.

WHEN administrators suspend sellers, THE system SHALL:
- Hide their products from search and category listings
- Prevent purchase of their products
- Allow processing of existing orders (shipping, cancellation/refund responses)
- Prevent creation of new products or editing of existing products

WHEN administrators unsuspend sellers, THE system SHALL make their products visible again.

### 18.4 Category Management

WHEN administrators manage categories, THE system SHALL allow them to:
- Create categories and subcategories
- Edit category names and descriptions
- Delete categories (products in deleted categories become uncategorized)

### 18.5 Product Oversight

WHEN administrators access product information, THE system SHALL allow them to:
- View all products on the platform
- View snapshots of any product
- Delete any product (for policy violations)

### 18.6 Order Oversight

WHEN administrators access order information, THE system SHALL allow them to:
- View all orders on the platform
- Force-cancel individual items or entire orders (refunds the customer, restores stock)
- Force-refund individual items or entire orders

### 18.7 User Management

WHEN administrators access user information, THE system SHALL allow them to:
- View all customer accounts
- Ban customers (preventing login)
- Unban customers
- View all seller accounts
- Ban sellers (preventing login, existing orders remain)