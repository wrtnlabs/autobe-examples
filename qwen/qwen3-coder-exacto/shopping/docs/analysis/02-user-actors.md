# E-Commerce Shopping Mall Platform Requirements Specification

## 1. Introduction

This document defines the comprehensive requirements for an e-commerce shopping mall platform that facilitates transactions between customers and sellers. The platform implements a multi-actor system with distinct roles and permissions, ensuring secure transactions with complete audit trails through data snapshotting.

## 2. User Actors and Authentication

### 2.1 Customer Requirements

#### 2.1.1 Account Management

WHEN a guest attempts to access any platform feature, THE system SHALL require registration and authentication before granting access.

WHEN a customer registers, THE system SHALL require email address and password for account creation.

WHEN a customer logs in, THE system SHALL authenticate using email and password credentials.

WHEN a customer requests password change, THE system SHALL allow password modification after verifying current credentials.

WHEN a customer requests account deletion, THE system SHALL:
- Delete all profile information including display name and phone number
- Preserve all order history and records for legal and seller purposes
- Preserve all product reviews but display them as authored by "deleted user"
- Remove the customer's ability to authenticate

#### 2.1.2 Profile Management

THE customer profile SHALL include display name and phone number.

WHEN a customer accesses profile management, THE system SHALL allow editing of display name and phone number.

#### 2.1.3 Address Management

THE customer SHALL be able to add multiple shipping addresses.

WHEN a customer manages addresses, EACH address SHALL include recipient name, phone number, street address, city, state/province, postal code, and country.

WHEN a customer edits an address, THE system SHALL allow modification of all address fields.

WHEN a customer deletes an address, THE system SHALL remove that address from their profile.

WHEN a customer sets a default address, THE system SHALL designate one address as the default shipping destination.

### 2.2 Seller Requirements

#### 2.2.1 Account Management

WHEN a seller registers, THE system SHALL require email address and password for account creation.

WHEN a seller logs in, THE system SHALL authenticate using email and password credentials.

WHEN a seller requests password change, THE system SHALL allow password modification after verifying current credentials.

WHEN a seller requests account deletion, THE system SHALL:
- Allow deletion only when no pending orders exist (paid or shipped status)
- Allow deletion only when no pending cancellation or refund requests exist
- Delete all products from active listings
- Preserve order history and snapshots
- Preserve shop name references in past orders
- Remove the seller's ability to authenticate

#### 2.2.2 Account Approval Process

THE seller account SHALL require administrator approval before gaining selling privileges.

WHEN a seller accesses their account, THE system SHALL display their current approval status (pending, approved, rejected).

WHEN a seller's registration is rejected, THE system SHALL provide the rejection reason to the seller.

WHEN a seller's registration is rejected, THE system SHALL allow submission of a new registration request.

#### 2.2.3 Profile Management

THE seller profile SHALL include shop name, shop description, and logo image.

WHEN a seller edits their profile, THE system SHALL:
- Allow modification of shop name, description, and logo
- Create a snapshot of the previous profile state
- Preserve all snapshots for audit and dispute resolution

WHEN a customer views seller information, THE system SHALL display the current seller profile.

### 2.3 Administrator Requirements

#### 2.3.1 Authentication and Administration

WHEN an administrator logs in, THE system SHALL authenticate with appropriate credentials.

THE administrator SHALL have access to all administrative functions based on their grade level.

#### 2.3.2 Administrator Management

WHEN a user requests administrator privileges, THE system SHALL:
- Allow submission of requests including rationale
- Display pending requests to super administrators
- Allow super administrators to approve or reject requests
- Convert approved users to administrator status

WHEN managing administrator grades, THE system SHALL:
- Support two grades: regular administrator and super administrator
- Allow super administrators to promote regular administrators to super administrator
- Allow super administrators to demote other super administrators to regular administrator
- Prevent super administrators from demoting themselves

#### 2.3.3 Seller Management

WHEN managing seller registrations, THE system SHALL:
- Display pending seller approval requests to administrators
- Allow approval or rejection of seller registrations
- Require rejection reasons when rejecting seller registrations
- Allow rejected sellers to submit new registration requests
- Allow suspension of seller accounts
- WHEN suspending a seller, THE system SHALL:
  - Hide seller products from search and category listings
  - Prevent purchase of seller products
  - Allow processing of existing orders
  - Prevent creation or editing of products
- Allow unsuspension of seller accounts

#### 2.3.4 Category Management

THE administrator SHALL be able to create categories and subcategories.

WHEN managing categories, THE system SHALL:
- Allow creation of categories with name and description
- Allow editing of category names and descriptions
- Allow deletion of categories
- WHEN a category is deleted, THE system SHALL make products in that category uncategorized

#### 2.3.5 Oversight Functions

WHEN overseeing products, THE system SHALL:
- Allow viewing of all platform products
- Allow viewing of product snapshots
- Allow deletion of products for policy violations

WHEN overseeing orders, THE system SHALL:
- Allow viewing of all platform orders
- Allow force-cancellation of individual items or entire orders
- Allow force-refund of individual items or entire orders

WHEN managing users, THE system SHALL:
- Allow viewing of all customer accounts
- Allow banning and unbanning of customers
- Allow viewing of all seller accounts
- Allow banning and unbanning of sellers

### 2.4 Authentication System

#### 2.4.1 Authentication Flow

THE authentication system SHALL support email and password based authentication for all user actors.

WHEN a user attempts authentication, THE system SHALL:
- Validate email format
- Verify password against stored secure hash
- Generate secure session tokens upon successful authentication
- Associate appropriate permissions with the session

#### 2.4.2 Session Management

THE system SHALL maintain user sessions using JWT tokens.

WHEN a user authenticates successfully, THE system SHALL:
- Generate access token with 30-minute expiration
- Generate refresh token with 30-day expiration
- Include user ID, actor type, and permissions in JWT payload
- Store tokens in httpOnly cookies for security

WHEN a session expires, THE system SHALL require re-authentication.

#### 2.4.3 Password Security

THE system SHALL enforce strong password requirements for all actors.

WHEN a user changes password, THE system SHALL:
- Validate password strength
- Hash password using industry-standard algorithms
- Invalidate existing sessions

### 2.5 Permission Matrix

| Action | Customer | Seller | Administrator |
|--------|----------|--------|---------------|
| Register account | ✅ | ✅ | ✅ |
| Log in | ✅ | ✅ | ✅ |
| Change password | ✅ | ✅ | ✅ |
| Delete account | ✅ | WHERE no pending obligations | WHERE authorized grade |
| View products | ✅ | ✅ | ✅ |
| Create/edit profile | ✅ | ✅ | |
| Manage addresses | ✅ | | |
| Create products | | ✅ (approved) | |
| Edit products | | ✅ (approved/own) | ✅ (any) |
| Delete products | | ✅ (approved/own/criteria) | ✅ (any) |
| View seller dashboard | | ✅ | |
| Process orders | | ✅ (own) | ✅ (any) |
| Manage inventory | | ✅ (own) | |
| Approve sellers | | | ✅ |
| Manage categories | | | ✅ |
| Ban users | | | ✅ |
| View all orders | | | ✅ |
| Force cancel/refund | | | ✅ |

### 2.6 Account Lifecycle Management

#### 2.6.1 Registration Process

WHEN a user registers, THE system SHALL:
- Validate email uniqueness
- Enforce password strength requirements
- Create account in pending state where applicable
- Send verification email
- Activate account upon email verification

#### 2.6.2 Account States

THE system SHALL support the following account states:
- Pending (awaiting email verification or approval)
- Active (fully operational)
- Suspended (limited functionality)
- Banned (no access)
- Deleted (permanently removed with data retention)

#### 2.6.3 Data Retention

WHEN an account is deleted, THE system SHALL:
- Immediately revoke authentication capabilities
- Preserve audit-relevant data as required by law
- Mark user-generated content as from deleted user where appropriate
- Schedule complete data purge according to retention policy

## 3. Product and Category Management

### 3.1 Product Structure

#### 3.1.1 Core Product Attributes

WHEN a seller creates a product, THE system SHALL require the following fields:
- Name (required, text)
- Description (required, text)
- Category (required, selectable from administrator-defined categories)
- Base price (required, monetary value)

THE system SHALL associate each product with the seller who created it.

#### 3.1.2 Product Images

WHEN a seller manages product images, THE system SHALL:
- Allow uploading of multiple images
- Allow reordering of images (first image is primary thumbnail)
- Allow deletion of images
- Include image changes in product snapshots

#### 3.1.3 Product Modification

WHEN a seller modifies a product, THE system SHALL:
- Create a complete snapshot of the product's current state
- Include all product fields and images in the snapshot
- Preserve snapshots even after product deletion

#### 3.1.4 Product Deletion

WHEN a seller requests product deletion, THE system SHALL:
- Allow deletion only when no pending order items exist for any variant
- Allow deletion only when no pending cancellation/refund requests exist for any variant
- Remove all variants and inventory records
- Remove product from search and category listings
- Preserve order history and snapshots

### 3.2 Category System

#### 3.2.1 Category Hierarchy

THE system SHALL organize products into categories with one level of subcategories.

WHEN managing categories, THE system SHALL require:
- Name (required, text)
- Description (required, text)

WHEN displaying categories to customers, THE system SHALL:
- Show all categories in a browsable list
- Allow viewing products within each category

### 3.3 Search and Discovery

#### 3.3.1 Product Search

WHEN a customer searches for products, THE system SHALL support filtering by:
- Search term matching product names
- Category (including subcategories)
- Price range (minimum and maximum)
- Stock status (in-stock items only)

WHEN displaying search results, THE system SHALL:
- Paginate results
- Allow sorting by newest first, price low-to-high, and price high-to-low
- Show product thumbnail, name, base price, seller name, and average rating

#### 3.3.2 Product Listings

WHEN displaying product lists (search results, category pages), THE system SHALL show:
- Main image (thumbnail)
- Name
- Base price (or price range if variants differ)
- Seller shop name
- Average rating and review count (if available)

#### 3.3.3 Product Detail Page

WHEN a customer views a product detail page, THE system SHALL display:
- All product images
- Name and description
- Category
- Seller shop name with link to profile
- All available variants with prices and stock status
- Average rating and total review count
- All reviews

## 4. Shopping and Order Management

### 4.1 Wishlist Functionality

WHEN a customer manages their wishlist, THE system SHALL:
- Allow adding products to wishlist
- Display paginated wishlist
- Show products (not specific variants)
- Allow removing products from wishlist
- Automatically remove deleted products from all wishlists

### 4.2 Shopping Cart Operations

#### 4.2.1 Cart Management

WHEN a customer adds items to their cart, THE system SHALL:
- Require selection of specific variants (not just products)
- Allow specifying quantity
- Combine quantities for identical variants already in cart

WHEN displaying the cart, THE system SHALL show:
- Product name
- Variant options
- Price
- Quantity
- Subtotal per item
- Total price for all items

WHEN a customer modifies their cart, THE system SHALL:
- Allow changing item quantities
- Allow removing items

#### 4.2.2 Cart Validation

WHEN displaying the cart, THE system SHALL indicate:
- If a variant's stock is less than the cart quantity
- If a variant is deleted or out of stock (marked as unavailable)

WHEN proceeding to checkout, THE system SHALL prevent checkout of unavailable items.

### 4.3 Checkout Process

#### 4.3.1 Checkout Workflow

WHEN a customer proceeds to checkout, THE system SHALL:
- Require selection of shipping address (or use default)
- Display order summary including:
  - List of items with prices
  - Shipping address
  - Total price
- Prevent modification of shipping address after order placement

### 4.4 Payment Integration

#### 4.4.1 Payment Processing

WHEN a customer confirms an order, THE system SHALL:
- Process payment through an external gateway
- Handle both payment success and failure scenarios

IF payment succeeds, THEN THE system SHALL:
- Create the order
- Decrease stock quantities for purchased variants
- Remove items from customer's cart
- Save product and variant snapshots for each order item

IF payment fails, THEN THE system SHALL:
- Not create an order
- Allow customer to retry payment

### 4.5 Order Creation

#### 4.5.1 Order Generation

WHEN an order is successfully placed, THE system SHALL:
- Create an order record
- Generate order items for each purchased variant
- Set all order items to "paid" status
- Save snapshots of purchased products, variants, and seller profiles
- Create negative inventory records for each purchased variant

#### 4.5.2 Order Structure

THE system SHALL organize orders as follows:
- An order contains one or more order items
- Each order item represents a specific variant with a quantity
- Order items can come from different sellers
- Each order item has its own status
- Order items can be individually cancelled or refunded
- Order items are grouped into shipments when shipped

### 4.6 Order History

#### 4.6.1 Order List

WHEN a customer views their order history, THE system SHALL:
- Display a paginated list sorted by newest first
- Show order number, date, total price, and overall order status

#### 4.6.2 Order Details

WHEN a customer views order details, THE system SHALL display:
- List of items with product name, variant, quantity, price, and item status
- Shipping address
- List of shipments with tracking information

### 4.7 Order Status Management

#### 4.7.1 Item Status

THE system SHALL support the following order item statuses:
- Paid: Payment completed, awaiting seller shipment
- Shipped: Seller has shipped the item
- Delivered: Item has been delivered
- Cancelled: Item was cancelled
- Refunded: Item was refunded

#### 4.7.2 Order Status Derivation

THE system SHALL derive overall order status based on item statuses:
- All items paid → Order is "paid"
- Any item shipped (none delivered) → Order is "shipped"
- All items delivered → Order is "delivered"
- All items cancelled → Order is "cancelled"
- All items refunded → Order is "refunded"
- Mixed states → Order is "partially completed"

## 5. Inventory and Variant Management

### 5.1 Product Variants (SKU)

#### 5.1.1 Variant Structure

WHEN a seller creates product variants, EACH variant SHALL include:
- SKU code (unique identifier, required)
- Option values (e.g., color: "Red", size: "Large")
- Price (can override base price, optional)
- Stock quantity (required, starts at 0)

#### 5.1.2 Variant Management

WHEN a seller modifies variants, THE system SHALL:
- Create a snapshot of the variant's state
- Allow adding, editing, or deleting variants
- Require at least one variant for product to be purchasable

WHEN a seller deletes a variant, THE system SHALL:
- Allow deletion only when no pending order items exist for that variant
- Allow deletion only when no pending cancellation/refund requests exist for that variant

#### 5.1.3 Product Availability

WHEN determining product availability, THE system SHALL:
- Mark products with no variants as "unavailable" for purchase
- Mark variants with zero stock as "out of stock"
- Prevent adding out-of-stock variants to cart

### 5.2 Inventory Management

#### 5.2.1 Inventory Records

THE system SHALL track inventory through history records with:
- Quantity change (positive for restocking, negative for orders/adjustments)
- Reason for change
- Timestamp

WHEN calculating current stock, THE system SHALL sum all inventory records.

#### 5.2.2 Inventory Operations

WHEN a seller manages inventory, THE system SHALL:
- Allow adding stock (restocking) with quantity and reason
- Allow subtracting stock (adjustment/loss) with quantity and reason
- Automatically create negative records for order placements
- Automatically create positive records for cancellations/refunds

WHEN stock reaches zero, THE system SHALL:
- Mark the variant as "out of stock"
- Prevent addition to cart

## 6. Shipping and Tracking System

### 6.1 Shipment Concept

THE system SHALL implement shipping as follows:
- A shipment is a package sent by a seller
- A shipment can contain multiple order items from the same seller
- Different sellers always ship separately
- Sellers can choose to ship items individually or bundle into one shipment

### 6.2 Shipping Process

WHEN a seller processes shipping, THE system SHALL:
- Display order items requiring shipment
- Allow selection of items for a shipment
- Require entry of tracking information (carrier name, tracking number)
- Set all items in the shipment to "shipped" status

### 6.3 Delivery Confirmation

WHEN managing delivery confirmation, THE system SHALL:
- Display tracking information per shipment
- Allow customers to confirm delivery per shipment
- Set all items in a confirmed shipment to "delivered" status
- Automatically mark shipments as "delivered" after 14 days from shipping if unconfirmed

## 7. Cancellation and Refund System

### 7.1 Cancellation Process

#### 7.1.1 Customer Cancellation Request

WHEN a customer requests item cancellation, THE system SHALL:
- Allow cancellation only for items with "paid" status
- Require a reason for cancellation
- Create a cancellation request for seller review

#### 7.1.2 Seller Response

WHEN a seller responds to a cancellation request, THE system SHALL:
- Allow approval or rejection of the request
- Create a snapshot of the request state

IF a seller approves a cancellation request, THEN THE system SHALL:
- Set the item status to "cancelled"
- Process refund for that item
- Create positive inventory record to restore stock
- Allow remaining items to continue processing

IF all items in an order are cancelled, THEN THE system SHALL set order status to "cancelled".

### 7.2 Refund Process

#### 7.2.1 Customer Refund Request

WHEN a customer requests a refund, THE system SHALL:
- Allow refund requests only for items with "delivered" status
- Require a reason for the refund
- Limit requests to within 7 days of delivery
- Create a refund request for seller review

#### 7.2.2 Seller Response

WHEN a seller responds to a refund request, THE system SHALL:
- Allow approval or rejection of the request
- Create a snapshot of the request state

IF a seller approves a refund request, THEN THE system SHALL:
- Set the item status to "refunded"
- Process refund for that item
- Create positive inventory record to restore stock
- Allow remaining items to continue processing

IF all items in an order are refunded, THEN THE system SHALL set order status to "refunded".

## 8. Reviews and Ratings System

### 8.1 Review Creation

WHEN a customer creates a review, THE system SHALL:
- Allow reviews only for products they have purchased
- Allow reviews only after item status is "delivered"
- Limit to one review per product per order
- Require rating (1-5 stars)
- Allow optional text content

### 8.2 Review Display and Management

WHEN displaying product reviews, THE system SHALL:
- Sort reviews by newest first
- Display on the product detail page

WHEN a customer manages their reviews, THE system SHALL:
- Allow editing reviews
- Create snapshots of review edits
- Allow deleting reviews (with snapshot preservation)
- Display "deleted user" for reviews from deleted accounts

### 8.3 Rating Calculation

THE system SHALL calculate product ratings by:
- Averaging all non-deleted review ratings
- Displaying the average with appropriate precision
- Showing total review count

## 9. Seller Dashboard and Analytics

### 9.1 Dashboard Overview

WHEN a seller accesses their dashboard, THE system SHALL display:
- Total number of products
- Total number of order items
- Number of pending cancellation requests
- Number of pending refund requests

### 9.2 Order Management

WHEN a seller manages orders, THE system SHALL:
- Display a list of all order items for their products
- Allow filtering by status

## 10. Data Snapshots and Audit Trail

### 10.1 Snapshot Principles

THE system SHALL implement comprehensive snapshotting for all editable data:
- Create snapshots whenever data is modified
- Preserve previous states for audit and dispute resolution
- Record modification timestamp, changes made, and before/after values
- Maintain snapshots even after data deletion

### 10.2 Snapshot Coverage

WHEN creating snapshots, THE system SHALL capture:
- Products (all fields including images)
- Product variants (SKU code, option values, price)
- Seller profiles (shop name, description, logo)
- Order items (product, variant, seller profile at purchase time)
- Reviews (rating, text content)
- Cancellation requests (reason, status changes)
- Refund requests (reason, status changes)

### 10.3 Product Snapshot Structure

WHEN a product is edited, THE system SHALL create a product snapshot that:
- Includes all product fields (name, description, category, base price, images)
- Includes snapshots of all variants at that moment
- Preserves complete state for audit purposes

### 10.4 Snapshot Access

WHEN accessing snapshots, THE system SHALL:
- Allow sellers to view snapshots of their own products
- Allow administrators to view snapshots of any product
- Allow owners to view relevant snapshots for dispute resolution
