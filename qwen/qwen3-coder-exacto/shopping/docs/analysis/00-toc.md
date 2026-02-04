# E-Commerce Shopping Mall Platform Requirements Specification

## 1. Introduction and Platform Overview

### 1.1 Purpose
The purpose of this document is to establish a comprehensive requirements specification for an e-commerce shopping mall platform. This platform will serve as a digital marketplace connecting customers with sellers, implementing robust security measures, complete data governance, and a comprehensive audit trail system.

### 1.2 Scope
This platform will facilitate the complete lifecycle of online commerce, from product discovery to post-purchase support. It requires user registration for all participants and maintains immutable records of all critical data modifications for legal and dispute resolution purposes.

### 1.3 Business Context
The platform operates as a multi-vendor marketplace designed to:
- Enable individual consumers to discover, purchase, and review products
- Provide businesses with tools to manage their product catalogs and sales operations
- Maintain regulatory compliance through comprehensive data snapshots
- Facilitate secure financial transactions through integrated payment processing

## 2. User Actors and Authentication System

### 2.1 Customer Actor Requirements

#### 2.1.1 Account Management
THE customer SHALL be able to register with a unique email address and password.

WHEN a customer attempts to register with an already registered email address, THE system SHALL notify the customer that an account with that email already exists.

THE customer SHALL be able to authenticate with their email and password.

THE customer SHALL be able to change their password after authentication.

THE customer SHALL be able to delete their account with explicit confirmation.

WHEN a customer deletes their account, THE system SHALL:
- Remove the customer's profile information
- Preserve order history and reviews for legal and business purposes
- Display any reviews as authored by a "deleted user"

#### 2.1.2 Profile Management
THE customer SHALL be able to create and modify their profile containing:
- Display name
- Phone number

#### 2.1.3 Address Management
THE customer SHALL be able to:
- Add multiple shipping addresses
- Edit existing shipping addresses
- Delete shipping addresses
- Designate one shipping address as default

Each shipping address SHALL contain:
- Recipient name
- Phone number
- Street address
- City
- State/province
- Postal code
- Country

### 2.2 Seller Actor Requirements

#### 2.2.1 Account Management
THE seller SHALL be able to register with a unique email address and password.

THE seller SHALL be required to obtain administrative approval before becoming active.

THE seller SHALL be able to authenticate with their email and password.

THE seller SHALL be able to change their password after authentication.

THE seller SHALL be able to view their current approval status (pending, approved, rejected).

WHEN a seller's registration is rejected, THE system SHALL provide the reason for rejection.

THE seller SHALL be able to submit a new registration request after rejection.

THE seller SHALL be able to delete their account IF:
- No order items have paid or shipped status
- No cancellation or refund requests are pending

WHEN a seller deletes their account, THE system SHALL:
- Remove the seller's products from active listings
- Preserve order history and snapshots
- Maintain the seller's shop name in historical orders

#### 2.2.2 Profile Management
THE seller SHALL be able to create and modify their profile containing:
- Shop name
- Shop description
- Logo image

WHEN a seller modifies their profile, THE system SHALL create a snapshot of the previous state.

### 2.3 Administrator Actor Requirements

#### 2.3.1 System Management
THE administrator SHALL be able to:
- Review and respond to seller registration requests
- Approve or reject seller registrations with reasons
- Suspend and unsuspend seller accounts
- Manage platform categories
- Review and remove products for policy violations
- Monitor all orders and transactions
- Force cancellation or refund for any order item
- Manage customer accounts (ban/unban)
- Manage seller accounts (ban/unban)

#### 2.3.2 Role Management
THE user SHALL be able to request administrative privileges with a justification.

THE super administrator SHALL be able to:
- Approve or deny administrative privilege requests
- Promote regular administrators to super administrator status
- Demote super administrators to regular administrator status
- NOT demote themselves

### 2.4 Authentication and Session Management

ALL users SHALL be required to authenticate before accessing any platform functionality.

THE system SHALL implement secure session management with appropriate timeout mechanisms.

THE system SHALL maintain user roles and permissions in authenticated sessions.

### 2.5 Permission Matrix

| Actor | Browse Products | Manage Account | Create Products | Process Orders | Admin Functions |
|-------|----------------|----------------|-----------------|----------------|-----------------|
| Customer | Yes | Yes | No | No | No |
| Seller | Yes | Yes | Yes (when approved) | Yes (own products) | No |
| Administrator | Yes | Yes | No | Yes (all) | Yes |

## 3. Product and Category Management System

### 3.1 Category System Requirements

THE platform SHALL organize products into a two-level category hierarchy (categories and subcategories).

THE administrator SHALL be the only role authorized to create, edit, or delete categories.

WHEN a customer browses categories, THE system SHALL display all available categories and their subcategories.

WHEN a customer views a category, THE system SHALL display all products within that category.

WHEN an administrator deletes a category, THE system SHALL move all products in that category to an "uncategorized" status.

### 3.2 Product Structure Requirements

Each product SHALL contain the following required attributes:
- Name (required)
- Description (required)
- Category (required, can be a subcategory)
- Base price (required)
- Images (multiple with reordering capability)
- Variants (SKU codes with option values and prices)

THE system SHALL require all mandatory product fields during creation.

THE seller SHALL own all products they create.

### 3.3 Product Variant Requirements

Each product variant SHALL include:
- SKU code (unique identifier, required)
- Option values (e.g., color: "Red", size: "Large")
- Price (optional override of base price)
- Stock quantity (required, starts at 0)

THE seller SHALL be able to:
- Add variants to products
- Edit variant details
- Delete variants subject to order constraints

WHEN a seller modifies a variant, THE system SHALL create a snapshot of the previous state.

WHERE a product has no variants, THE system SHALL display it as "unavailable" and non-purchasable.

A product SHALL require at least one variant to be purchasable.

### 3.4 Product Management Rules

THE seller SHALL be able to edit their own products.

WHEN a seller modifies a product, THE system SHALL create a snapshot of the previous state.

THE seller SHALL be able to delete products IF:
- No variant of the product has paid or shipped status orders
- No cancellation or refund requests exist for any variant

WHEN a seller deletes a product, THE system SHALL:
- Remove the product from listings
- Delete all variants and inventory records
- Remove the product from search results and category listings

THE seller SHALL be able to view snapshots of their own products.

THE administrator SHALL be able to view snapshots of any product.

Snapshots SHALL be preserved even after product deletion.

### 3.5 Product Image Management

THE seller SHALL be able to upload multiple images for products.

THE seller SHALL be able to reorder images, with the first image designated as the main thumbnail.

THE seller SHALL be able to delete images from products.

Image changes SHALL be included in product snapshots.

### 3.6 Product Search and Filtering

THE customer SHALL be able to search products by name across all sellers.

Search results SHALL be paginated.

THE customer SHALL be able to filter search results by:
- Category
- Price range (minimum and maximum)
- In-stock status only

THE customer SHALL be able to sort search results by:
- Newest first
- Price (low to high)
- Price (high to low)

### 3.7 Product Display Requirements

WHEN displaying product lists (search results, category pages), EACH product SHALL show:
- Main image (thumbnail)
- Name
- Base price (or price range for variable-priced products)
- Seller shop name
- Average rating (if reviews exist)

WHEN displaying a product detail page, THE system SHALL show:
- All images in gallery format
- Name and full description
- Category
- Seller shop name with link to profile
- All available variants with prices and stock status
- Average rating and total review count
- All reviews

## 4. Shopping Cart and Ordering System

### 4.1 Wishlist Management

THE customer SHALL be able to:
- Add products to their wishlist
- View their wishlist with pagination
- Remove products from their wishlist

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customer wishlists.

### 4.2 Shopping Cart Operations

THE customer SHALL be able to:
- Add specific product variants to their cart with quantity specification
- View their cart contents
- Modify item quantities
- Remove items from their cart

WHEN a customer adds a variant that already exists in their cart, THE system SHALL combine the quantities into a single line item.

THE cart SHALL display for each item:
- Product name
- Variant options
- Price
- Quantity
- Subtotal

THE cart SHALL display the total price of all items.

IF a variant's stock is less than the cart quantity, THE system SHALL display a warning to the customer.

IF a variant is deleted or becomes out of stock, THE system SHALL mark that item as unavailable in the cart.

### 4.3 Checkout Process

THE customer SHALL be able to proceed to checkout from their cart.

Unavailabile items SHALL NOT be processed during checkout.

THE customer SHALL be required to select a shipping address or use the default address.

THE customer SHALL be able to review the order summary before placing the order, including:
- List of items with prices
- Shipping address
- Total price

THE customer SHALL confirm the order to initiate payment processing.

ONCE an order is placed, THE shipping address SHALL NOT be changeable.

### 4.4 Payment Processing Integration

THE system SHALL integrate with an external payment gateway.

WHEN the customer confirms the order, THE system SHALL process payment.

IF payment processing fails, THE system SHALL:
- Notify the customer of the failure
- Preserve the customer's cart contents
- Allow the customer to retry payment

IF payment processing succeeds, THE system SHALL create the order.

## 5. Order Management and Fulfillment System

### 5.1 Order Creation Process

WHEN payment succeeds, THE system SHALL:
- Create an order record
- Generate order items with "paid" status
- Create snapshots of purchased products, variants, and seller profiles
- Decrease stock quantities for purchased variants
- Remove purchased items from the customer's cart

### 5.2 Order Structure

Each order SHALL consist of one or more order items.

Each order item SHALL represent a purchased product variant with a quantity.

IF a customer purchases 3 of the same variant, THE system SHALL create one order item with quantity 3.

Order items from different sellers SHALL be possible within a single order.

Each order item SHALL have its own independent status.

Each order item SHALL be individually cancellable or refundable.

Order items SHALL be grouped into shipments when shipped.

### 5.3 Order Status Management

#### Order Item Statuses
Each order item SHALL have one of the following statuses:
- Paid: Payment completed, awaiting shipment
- Shipped: Item has been shipped by seller
- Delivered: Customer has confirmed delivery
- Cancelled: Item was cancelled before shipping
- Refunded: Item was refunded after delivery

#### Order Aggregate Status
The overall order status SHALL be determined from its items:
- IF all items are paid → Order status is "paid"
- IF any item is shipped (and none delivered) → Order status is "shipped"
- IF all items are delivered → Order status is "delivered"
- IF all items are cancelled → Order status is "cancelled"
- IF all items are refunded → Order status is "refunded"
- IF items have mixed statuses → Order status is "partially completed"

### 5.4 Order History

THE customer SHALL be able to view their order history with:
- Pagination
- Newest orders listed first

Each order in the list SHALL display:
- Order number
- Date
- Total price
- Overall status

THE customer SHALL be able to view full order details including:
- List of items with product name, variant, quantity, price, and status
- Shipping address
- List of shipments with tracking information

## 6. Shipping and Tracking System

### 6.1 Shipment Concept

A shipment SHALL represent a package sent by a seller containing one or more order items from that seller.

Different sellers SHALL ship items in separate shipments.

A seller SHALL be able to ship items individually or group multiple items into one shipment.

### 6.2 Shipping Process

THE seller SHALL be able to view order items that require shipping.

WHEN creating a shipment, THE seller SHALL:
- Select one or more items from the same seller
- Enter tracking information (carrier name and tracking number)

All items in the same shipment SHALL share the same tracking information.

WHEN a shipment is created, THE system SHALL:
- Update all included items to "shipped" status
- Provide tracking information to the customer

### 6.3 Delivery Confirmation

THE customer SHALL be able to view tracking information for each shipment.

THE customer SHALL be able to confirm delivery for entire shipments (not individual items).

WHEN a customer confirms delivery for a shipment, THE system SHALL update all items in that shipment to "delivered" status.

IF a customer does not confirm delivery within 14 days of shipping, THE system SHALL automatically update all items in that shipment to "delivered" status.

## 7. Inventory Management and Tracking

### 7.1 Inventory History Tracking

Each variant SHALL track stock quantity through inventory records.

Each inventory record SHALL contain:
- Quantity change (positive for restocking, negative for sales/adjustments)
- Reason for change
- Timestamp

Current stock levels SHALL be calculated by summing all inventory records.

### 7.2 Seller Inventory Operations

THE seller SHALL be able to increase inventory (restock):
- With a positive quantity
- With a reason for the restocking

THE seller SHALL be able to decrease inventory (adjustments/losses):
- With a negative quantity
- With a reason for the adjustment

### 7.3 Inventory Automation

WHEN an order is placed successfully, THE system SHALL automatically create negative inventory records for purchased variants.

WHEN an order is cancelled, THE system SHALL automatically create positive inventory records to restore stock.

WHEN a refund is processed, THE system SHALL automatically create positive inventory records to restore stock.

### 7.4 Stock Status Management

THE seller SHALL be able to view the full inventory history for each variant.

WHEN stock quantity reaches 0, THE system SHALL display the variant as "out of stock".

Out of stock variants SHALL NOT be available for adding to cart.

## 8. Cancellation and Refund System

### 8.1 Cancellation Request Process

THE customer SHALL be able to request cancellation for order items with "paid" status.

Cancellation requests SHALL require a text reason from the customer.

THE system SHALL notify the relevant seller of cancellation requests.

When a seller responds to a cancellation request, THE system SHALL create a snapshot of the request state.

IF a seller approves a cancellation request, THE system SHALL:
- Update the item status to "cancelled"
- Process refund for that item
- Restore stock quantities through inventory records
- Allow the remaining items in the order to continue processing

IF all items in an order are cancelled, THE system SHALL update the overall order status to "cancelled".

### 8.2 Refund Request Process

THE customer SHALL be able to request refunds for order items with "delivered" status.

Refund requests SHALL require a text reason from the customer.

Refund requests SHALL be time-limited to 7 days after delivery confirmation.

THE system SHALL notify the relevant seller of refund requests.

When a seller responds to a refund request, THE system SHALL create a snapshot of the request state.

IF a seller approves a refund request, THE system SHALL:
- Update the item status to "refunded"
- Process refund for that item
- Restore stock quantities through inventory records
- Leave other items in the order unaffected

IF all items in an order are refunded, THE system SHALL update the overall order status to "refunded".

## 9. Reviews and Ratings System

### 9.1 Review Creation

THE customer SHALL be able to write a review for products they have purchased.

Review creation SHALL be limited to items with "delivered" status.

THE customer SHALL be able to submit one review per product per order.

Each review SHALL include:
- Rating (integer from 1 to 5 stars, required)
- Text content (optional)

### 9.2 Review Management

THE customer SHALL be able to edit their own reviews.

WHEN a customer edits a review, THE system SHALL create a snapshot of the previous version.

THE customer SHALL be able to delete their own reviews.

WHEN a customer deletes a review, THE snapshot history SHALL be preserved.

THE customer SHALL be able to delete their entire account.

WHEN a customer deletes their account, THEIR reviews SHALL be preserved but shown as authored by a "deleted user".

### 9.3 Review Display

Reviews SHALL be displayed on product detail pages.

Reviews SHALL be sorted by newest first.

Product average ratings SHALL be calculated from all non-deleted reviews.

## 10. Seller Dashboard and Performance Tracking

### 10.1 Dashboard Overview

THE seller dashboard SHALL display key shop metrics including:
- Total number of active products
- Total number of order items (for seller's products)
- Number of pending cancellation requests
- Number of pending refund requests

### 10.2 Order Item Management

THE seller SHALL be able to view a list of all order items for their products.

THE seller SHALL be able to filter order items by status.

## 11. Administrative Oversight System

### 11.1 User Management

THE administrator SHALL be able to view all customer accounts.

THE administrator SHALL be able to ban customers (preventing login).

THE administrator SHALL be able to unban customers.

THE administrator SHALL be able to view all seller accounts.

THE administrator SHALL be able to ban sellers (preventing login, preserving existing orders).

### 11.2 Seller Registration Oversight

THE administrator SHALL be able to view pending seller approval requests.

THE administrator SHALL be able to approve or reject seller registrations.

WHEN rejecting a seller registration, THE administrator SHALL provide a reason.

THE administrator SHALL be able to suspend seller accounts.

WHEN a seller is suspended, THE system SHALL:
- Hide their products from search and category listings
- Prevent new product creation or editing
- Allow processing of existing orders

### 11.3 Product Oversight

THE administrator SHALL be able to view all products on the platform.

THE administrator SHALL be able to view snapshots of any product.

THE administrator SHALL be able to delete any product for policy violations.

### 11.4 Category Management

THE administrator SHALL be able to create new categories and subcategories.

THE administrator SHALL be able to edit existing category names and descriptions.

THE administrator SHALL be able to delete categories.

### 11.5 Order Oversight

THE administrator SHALL be able to view all orders on the platform.

THE administrator SHALL be able to force-cancel entire orders or individual items.

THE administrator SHALL be able to force-refund entire orders or individual items.

## 12. Data Snapshot and Audit System

### 12.1 Snapshot Principles

THE platform SHALL create snapshots for all modifications to critical business data.

Snapshots SHALL record:
- Timestamp of the change
- What was changed
- Values before and after the change

Snapshots SHALL be immutable and undeletable.

Snapshots SHALL be accessible to relevant parties for dispute resolution.

### 12.2 Data Covered by Snapshots

THE system SHALL create snapshots for modifications to:
- Products (all fields including images)
- Product variants (SKU code, option values, price)
- Seller profiles (shop name, description, logo)
- Order items (product, variant, and seller profile at time of purchase)
- Reviews (rating, text content)
- Cancellation requests (reason, status changes)
- Refund requests (reason, status changes)

### 12.3 Snapshot Implementation

WHEN any editable data is modified, THE system SHALL automatically create a snapshot of the previous state.

Snapshots SHALL be viewable by:
- Data owners
- Administrators
- Authorized parties for dispute resolution

Snapshots SHALL be preserved indefinitely, even after data deletion.

> *Note: This requirements specification defines the business capabilities and constraints of the e-commerce platform. All technical implementation decisions (architecture, database design, API specifications, etc.) will be determined in subsequent development phases.*