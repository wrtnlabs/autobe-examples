# E-Commerce Shopping Mall Platform Requirements Specification

## 1. Introduction and Service Overview

### 1.1 Purpose
This document specifies the comprehensive requirements for an e-commerce shopping mall platform that facilitates secure and efficient online transactions between customers and sellers.

### 1.2 Scope
The platform requires user registration for all features, implements a complete product management system, provides robust order processing capabilities, and maintains detailed audit trails through snapshot technology. The system supports customers, sellers, and administrators with distinct roles and permissions.

### 1.3 Key Features
- User account management for customers and sellers
- Product and category organization with comprehensive search capabilities
- Shopping cart and wishlist functionality
- Variant-based inventory management with detailed tracking
- Secure checkout and payment processing
- Order management with individual item tracking
- Shipping and delivery coordination
- Cancellation and refund handling
- Review and rating system
- Seller dashboard for business analytics
- Administrative oversight and management
- Immutable snapshot system for audit purposes

## 2. User Actors and Authentication

### 2.1 Customer Actor
Customers are registered users who browse, purchase, and review products on the platform.

#### 2.1.1 Account Management
WHEN a customer registers for an account, THE system SHALL require email and password for authentication.

WHEN a customer logs in, THE system SHALL authenticate the user using email and password credentials.

WHEN a customer requests a password change, THE system SHALL verify the current password and update to the new password after validation.

WHEN a customer requests account deletion, THE system SHALL:
- Delete the customer's profile information including display name and phone number
- Preserve order history for seller records and legal purposes
- Preserve reviews but display them as "deleted user"

#### 2.1.2 Profile Management
WHEN a customer accesses their profile, THE system SHALL display their display name and phone number.

WHEN a customer edits their profile, THE system SHALL allow modification of display name and phone number.

#### 2.1.3 Address Management
WHEN a customer manages shipping addresses, THE system SHALL allow adding multiple addresses with the following information:
- Recipient name
- Phone number
- Street address
- City
- State/province
- Postal code
- Country

WHEN a customer edits an address, THE system SHALL allow modification of all address fields.

WHEN a customer deletes an address, THE system SHALL remove the address from their account.

WHEN a customer manages default shipping address, THE system SHALL allow setting one address as the default shipping address.

### 2.2 Seller Actor
Sellers are registered users who create and sell products on the platform. All sellers require administrator approval before becoming active.

#### 2.2.1 Account Management
WHEN a seller registers for an account, THE system SHALL require email, password, shop name, and shop description.

WHEN a seller logs in, THE system SHALL authenticate the user using email and password credentials.

WHEN a seller requests a password change, THE system SHALL verify the current password and update to the new password after validation.

WHEN a seller views approval status, THE system SHALL display their current approval status (pending, approved, rejected).

WHEN a seller views rejection details, THE system SHALL display the rejection reason if their registration was rejected.

WHEN a rejected seller submits a new registration request, THE system SHALL process it as a fresh registration with pending status.

WHEN a seller requests account deletion, THE system SHALL:
- Verify that the seller has no pending orders (paid or shipped status)
- Verify that the seller has no pending cancellation or refund requests
- Delete their products from listings
- Preserve order history and snapshots
- Preserve their shop name in past orders

#### 2.2.2 Profile Management
WHEN a seller accesses their profile, THE system SHALL display their shop name, shop description, and logo image.

WHEN a seller edits their profile, THE system SHALL allow modification of shop name, description, and logo.

WHEN a seller modifies their profile, THE system SHALL create a snapshot of the previous state for audit purposes.

WHEN a customer views a seller's profile, THE system SHALL display the current shop name, description, and logo.

### 2.3 Administrator Actor
Administrators manage the platform, approve sellers, oversee products, and handle user accounts. There are two grades of administrators: regular and super administrators.

#### 2.3.1 Administrator Management
WHEN a user requests to become an administrator, THE system SHALL store the request with a reason provided by the user (refer to admin-system.md).

WHEN a super administrator reviews administrator requests, THE system SHALL display a list of pending requests with user information and request reasons (refer to admin-system.md).

WHEN a super administrator approves a user's administrator request, THE system SHALL grant the user administrator privileges with regular administrator grade (refer to admin-system.md).

WHEN a super administrator changes an administrator's grade, THE system SHALL allow promotion of regular administrators to super administrator grade (refer to admin-system.md).

WHEN a super administrator attempts to demote themselves, THE system SHALL prevent the action and display an error message (refer to admin-system.md).

#### 2.3.2 Seller Management
WHEN an administrator accesses seller approvals, THE system SHALL display a list of pending seller registrations with shop information (refer to admin-system.md).

WHEN an administrator approves a seller registration, THE system SHALL update the seller's approval status to "approved" and enable selling capabilities (refer to admin-system.md).

WHEN an administrator rejects a seller registration, THE system SHALL update the seller's approval status to "rejected" and require a rejection reason (refer to admin-system.md).

WHEN an administrator suspends a seller account, THE system SHALL:
- Hide the seller's products from search and category listings
- Prevent the seller from creating new products or editing existing products
- Allow the seller to continue processing existing orders (refer to admin-system.md).

WHEN an administrator unsuspends a seller account, THE system SHALL make the seller's products visible again in search and category listings (refer to admin-system.md).

#### 2.3.3 Other Administrative Functions
WHEN an administrator manages categories, THE system SHALL allow creating, editing, and deleting categories and subcategories (refer to admin-system.md).

WHEN an administrator oversees products, THE system SHALL allow viewing all products and deleting any product for policy violations (refer to admin-system.md).

WHEN an administrator oversees orders, THE system SHALL allow viewing all orders and force-cancelling or force-refunding items or entire orders (refer to admin-system.md).

WHEN an administrator manages users, THE system SHALL allow viewing all customer and seller accounts, banning, and unbanning users (refer to admin-system.md).

## 3. Product and Category Management

### 3.1 Category System
Products are organized into a hierarchical category system with one level of nesting.

#### 3.1.1 Category Structure
WHEN an administrator creates a category, THE system SHALL require a name and description.

WHEN an administrator creates a category, THE system SHALL allow specifying a parent category to create a subcategory relationship.

THE system SHALL limit category nesting to one level only, preventing subcategories of subcategories.

WHEN an administrator edits a category, THE system SHALL allow modification of the category name and description.

WHEN an administrator deletes a category, THE system SHALL reclassify all products in that category as "uncategorized".

WHEN customers browse categories, THE system SHALL display the complete category hierarchy with parent and subcategory relationships.

#### 3.1.2 Category Access
WHEN customers browse the platform, THE system SHALL display a list of all categories.

WHEN customers view a category, THE system SHALL display all products within that category.

### 3.2 Product Structure
Products represent sellable items with multiple variants that customers can purchase.

#### 3.2.1 Product Creation
WHEN a seller creates a product, THE system SHALL require the following information:
- Name (required)
- Description (required)
- Category (required, can be a subcategory)
- Base price (required)

WHEN a seller creates a product, THE system SHALL associate the product with the creating seller.

#### 3.2.2 Product Modification
WHEN a seller edits their product, THE system SHALL allow modification of all product fields.

WHEN a seller modifies their product, THE system SHALL create a snapshot of the previous state for audit purposes.

#### 3.2.3 Product Deletion
WHEN a seller requests to delete a product, THE system SHALL:
- Verify that there are no pending order items (paid or shipped status) for any variant of the product
- Verify that there are no pending cancellation or refund requests for any variant of the product
- Delete all variants and inventory records for that product
- Remove the product from search and category listings
- Preserve snapshots even after deletion

WHEN a seller views product snapshots, THE system SHALL display all previous versions of their products.

WHEN an administrator views any product's snapshots, THE system SHALL display all previous versions of that product.

### 3.3 Product Images
Sellers can enhance their products with multiple images that can be organized in a preferred order.

WHEN a seller adds images to a product, THE system SHALL allow uploading multiple images.

WHEN a seller reorders product images, THE system SHALL set the first image as the main/thumbnail image.

WHEN a seller deletes images from a product, THE system SHALL remove the selected images.

WHEN a seller modifies product images, THE system SHALL include these changes in the product snapshot.

### 3.4 Product Search and Filtering
Customers can discover products through search functionality with various filtering options.

WHEN a customer searches for products, THE system SHALL allow searching by product name.

WHEN the system displays search results, THE system SHALL show products from all sellers.

WHEN the system displays search results, THE system SHALL paginate the results.

WHEN a customer filters search results, THE system SHALL allow filtering by:
- Category
- Price range (minimum and maximum)
- In-stock only

WHEN a customer sorts search results, THE system SHALL allow sorting by:
- Newest first
- Price (low to high)
- Price (high to low)

### 3.5 Product Display
Products are displayed differently based on context to provide appropriate information.

WHEN the system displays a product list, THE system SHALL show for each product:
- Main image (thumbnail)
- Name
- Base price (or price range if variants have different prices)
- Seller shop name
- Average rating (if reviews exist)

WHEN a customer views a product detail page, THE system SHALL display:
- All images
- Name and description
- Category
- Seller shop name (with link to seller profile)
- All available variants with prices and stock status
- Average rating and total review count
- All reviews

## 4. Shopping and Order Management

### 4.1 Wishlist Management
Customers can save products for future consideration through a wishlist feature.

WHEN a customer adds a product to their wishlist, THE system SHALL add that product to their wishlist.

WHEN a customer views their wishlist, THE system SHALL display all products in their wishlist with pagination.

WHEN a customer removes a product from their wishlist, THE system SHALL remove that product from their wishlist.

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customer wishlists.

### 4.2 Shopping Cart Operations
Customers can collect items for purchase in a shopping cart before checkout.

WHEN a customer adds a variant to their cart, THE system SHALL require selecting a specific variant and specifying quantity.

WHEN a customer adds a variant that is already in their cart, THE system SHALL combine the quantities rather than creating a separate line item.

WHEN a customer views their cart, THE system SHALL display each item with:
- Product name
- Variant options
- Price
- Quantity
- Subtotal

WHEN a customer modifies cart item quantities, THE system SHALL update the quantities accordingly.

WHEN a customer removes items from their cart, THE system SHALL remove those items.

WHEN the system displays the cart, THE system SHALL show the total price of all items.

### 4.3 Cart Validation
The system validates cart contents to ensure successful checkout.

WHEN the system displays the cart, THE system SHALL show a warning if a variant's stock is less than the cart quantity.

WHEN a variant is deleted or goes out of stock, THE system SHALL mark that variant as unavailable in the cart.

WHEN a customer proceeds to checkout, THE system SHALL prevent checkout of unavailable items.

### 4.4 Checkout Process
Customers can complete their purchases through a secure checkout process.

WHEN a customer initiates checkout, THE system SHALL require selection of a shipping address or use of the default address.

WHEN a customer reviews their order before placing, THE system SHALL display:
- List of items with prices
- Shipping address
- Total price

WHEN a customer places an order, THE system SHALL prevent changes to the shipping address after order placement.

### 4.5 Payment Integration
Payment processing occurs through an external payment gateway.

WHEN a customer confirms their order, THE system SHALL process payment through an external payment gateway.

WHEN payment processing fails, THE system SHALL:
- Not create the order
- Allow the customer to retry payment

WHEN payment processing succeeds, THE system SHALL create the order.

### 4.6 Order Creation
Successful payment triggers order creation and related processes.

WHEN the system creates an order after successful payment, THE system SHALL:
- Decrease stock quantities for each purchased variant
- Remove items from the customer's cart
- Create an order record
- Create order items with status "paid"
- Save snapshots of purchased products, variants, and seller profiles with the order items

## 5. Inventory and Variant Management

### 5.1 Product Variants (SKU)
Products can have multiple variants to represent different options like size or color.

#### 5.1.1 Variant Creation
WHEN a seller adds variants to a product, THE system SHALL require:
- SKU code (unique identifier, required)
- Option values (e.g., color: "Red", size: "Large")
- Price (can override the base price, optional)
- Stock quantity (required, starts at 0)

WHEN a product has no variants, THE system SHALL display it as "unavailable" for purchase.

WHEN a product has at least one variant, THE system SHALL make it purchasable.

#### 5.1.2 Variant Modification
WHEN a seller edits a variant, THE system SHALL allow modification of SKU code, option values, and price.

WHEN a seller modifies a variant, THE system SHALL create a snapshot of the previous state for audit purposes.

#### 5.1.3 Variant Deletion
WHEN a seller requests to delete a variant, THE system SHALL:
- Verify that there are no pending order items (paid or shipped status) for that variant
- Verify that there are no pending cancellation or refund requests for that variant
- Remove the variant from the product

### 5.2 Inventory Management
Each variant's stock is managed through detailed inventory history records.

#### 5.2.1 Inventory Records
WHEN the system manages inventory, THE system SHALL track stock through inventory history records with:
- Quantity change (positive for restocking, negative for orders/adjustments)
- Reason
- Timestamp

WHEN the system calculates current stock, THE system SHALL sum all inventory records for that variant.

#### 5.2.2 Inventory Operations
WHEN a seller restocks inventory, THE system SHALL record a positive inventory record with quantity and reason.

WHEN a seller adjusts inventory for loss, THE system SHALL record a negative inventory record with quantity and reason.

WHEN an order is placed, THE system SHALL automatically create a negative inventory record.

WHEN an order is cancelled or refunded, THE system SHALL automatically create a positive inventory record.

WHEN a seller views inventory history, THE system SHALL display the full history of inventory records for a variant.

#### 5.2.3 Stock Status
WHEN a variant's stock reaches 0, THE system SHALL display it as "out of stock".

WHEN a customer attempts to add an out of stock variant to their cart, THE system SHALL prevent the action.

## 6. Order Management

### 6.1 Order Structure
Orders contain one or more order items representing purchased product variants.

WHEN a customer buys multiple units of the same variant, THE system SHALL create one order item with the specified quantity.

WHEN an order contains items from different sellers, THE system SHALL group these items within the same order.

WHEN the system manages order items, THE system SHALL maintain separate status for each item.

WHEN a customer cancels or refunds items, THE system SHALL process these actions per order item rather than for the entire order.

### 6.2 Order Status Management
Orders and order items have distinct status values that reflect their current state.

#### 6.2.1 Order Item Status
WHEN the system tracks order item status, THE system SHALL support the following statuses:
- Paid: payment completed, waiting for seller to ship
- Shipped: seller has shipped the item
- Delivered: item has been delivered
- Cancelled: item was cancelled
- Refunded: item was refunded

#### 6.2.2 Order Status Derivation
WHEN the system determines overall order status, THE system SHALL derive it from its items:
- If all items are paid → order is "paid"
- If any item is shipped (and none delivered yet) → order is "shipped"
- If all items are delivered → order is "delivered"
- If all items are cancelled → order is "cancelled"
- If all items are refunded → order is "refunded"
- Mixed states → order is "partially completed"

### 6.3 Order History
Customers can view their order history through a comprehensive interface.

WHEN a customer views their order history, THE system SHALL display a paginated list sorted by newest first.

WHEN the system displays order list items, THE system SHALL show:
- Order number
- Date
- Total price
- Overall order status

WHEN a customer views order details, THE system SHALL display:
- List of items with product name, variant, quantity, price, and item status
- Shipping address
- List of shipments with tracking information

## 7. Shipping and Tracking

### 7.1 Shipment Concept
Products are shipped in packages that can contain multiple items from the same seller.

WHEN a seller prepares shipments, THE system SHALL allow grouping one or more order items into a shipment.

WHEN items are from different sellers, THE system SHALL require separate shipments for each seller.

WHEN a seller creates a shipment, THE system SHALL allow including multiple items in that shipment.

### 7.2 Shipping Process
Sellers can process shipments through a straightforward interface.

WHEN a seller views items needing shipping, THE system SHALL display order items for their products with "paid" status.

WHEN a seller processes a shipment, THE system SHALL require entering:
- Carrier name
- Tracking number

WHEN a seller creates a shipment, THE system SHALL set all included items to status "shipped".

### 7.3 Delivery Confirmation
Delivery is confirmed either by customer action or automatically after a time period.

WHEN a customer views shipment tracking, THE system SHALL display tracking information for each shipment.

WHEN a customer confirms delivery, THE system SHALL set all items in that shipment to status "delivered".

WHEN a customer does not confirm delivery within 14 days of shipping, THE system SHALL automatically set all items in that shipment to status "delivered".

## 8. Cancellation and Refund System

### 8.1 Order Cancellation
Customers can cancel individual order items before shipping.

WHEN a customer requests cancellation, THE system SHALL allow cancellation of individual items with status "paid".

WHEN a customer submits a cancellation request, THE system SHALL require a reason for the cancellation.

WHEN a seller receives a cancellation request, THE system SHALL allow the seller to approve or reject the request.

WHEN a seller responds to a cancellation request, THE system SHALL create a snapshot of the request state.

WHEN a seller approves a cancellation request, THE system SHALL:
- Set that item status to "cancelled"
- Process refund for that item only
- Restore stock quantities for that item

WHEN all items in an order are cancelled, THE system SHALL set the entire order status to "cancelled".

### 8.2 Refund Requests
Customers can request refunds for delivered items within a specific time period.

WHEN a customer requests a refund, THE system SHALL allow requesting refunds for individual items with status "delivered".

WHEN a customer submits a refund request, THE system SHALL require a reason for the refund.

WHEN a customer requests a refund, THE system SHALL verify the request is within 7 days of item delivery.

WHEN a seller receives a refund request, THE system SHALL allow the seller to approve or reject the request.

WHEN a seller responds to a refund request, THE system SHALL create a snapshot of the request state.

WHEN a seller approves a refund request, THE system SHALL:
- Set that item status to "refunded"
- Process refund for that item
- Restore stock quantities for that item

WHEN all items in an order are refunded, THE system SHALL set the entire order status to "refunded".

## 9. Reviews and Ratings System

### 9.1 Review Creation
Customers can provide feedback on products they've purchased.

WHEN a customer writes a review, THE system SHALL allow writing reviews only for products they have purchased.

WHEN a customer writes a review, THE system SHALL require that the item's status is "delivered".

WHEN a customer writes a review, THE system SHALL limit reviews to one per product per order.

WHEN a customer submits a review, THE system SHALL require:
- Rating (1 to 5 stars, required)
- Text content (optional)

### 9.2 Review Display and Management
Reviews are displayed on product pages and can be managed by customers.

WHEN the system displays product reviews, THE system SHALL sort them by newest first.

WHEN a customer edits their review, THE system SHALL allow modification of rating and text content.

WHEN a customer edits their review, THE system SHALL create a snapshot of the previous state for audit purposes.

WHEN a customer deletes their review, THE system SHALL remove the review from public display but preserve snapshots for audit purposes.

WHEN the system calculates product ratings, THE system SHALL include all non-deleted reviews in the average rating calculation.

## 10. Seller Dashboard and Analytics

### 10.1 Dashboard Overview
Sellers can monitor their business performance through a comprehensive dashboard.

WHEN a seller accesses their dashboard, THE system SHALL display:
- Total number of products
- Total number of order items for their products
- Number of pending cancellation requests
- Number of pending refund requests

### 10.2 Order Item Management
Sellers can manage order items through a detailed interface.

WHEN a seller views order items, THE system SHALL display a list of all order items for their products.

WHEN a seller filters order items, THE system SHALL allow filtering by status.

## 11. Data Snapshots and Audit Trail

### 11.1 Snapshot Principles
All data modifications are recorded through an immutable snapshot system.

THE system SHALL create snapshots whenever editable data is modified.

THE system SHALL preserve previous states in snapshots, recording:
- When the change was made
- What was changed
- Values before and after the change

THE system SHALL ensure snapshots are immutable and cannot be deleted.

THE system SHALL allow relevant parties (owners, administrators) to view snapshots for dispute resolution.

### 11.2 Snapshot Application
Snapshots apply to all critical data modifications throughout the platform.

#### 11.2.1 Product Snapshots
WHEN a product is edited, THE system SHALL create a product snapshot including:
- All product fields (name, description, category, base price, images)
- Snapshots of all variants at that moment

#### 11.2.2 Other Snapshots
WHEN the system creates snapshots, THE system SHALL apply snapshotting to:
- Product variants (SKU code, option values, price)
- Seller profiles (shop name, description, logo)
- Order items (product, variant, and seller profile at time of purchase)
- Reviews (rating, text content)
- Cancellation requests (reason, status changes)
- Refund requests (reason, status changes)

WHEN a seller modifies their profile, THE system SHALL create a snapshot of the previous state.

WHEN a customer modifies their review, THE system SHALL create a snapshot of the previous state.

WHEN a seller responds to a cancellation or refund request, THE system SHALL create a snapshot of the request state.