# E-Commerce Shopping Mall Platform Requirements Specification

## 1. Introduction

The e-commerce shopping mall platform is a comprehensive online marketplace that connects customers with sellers in a secure, regulated environment. The platform requires registration for all users and implements a robust snapshot system to maintain data integrity for legal and dispute resolution purposes.

This platform serves both individual consumers seeking to purchase products and businesses looking to sell their merchandise. The system is designed with strong data governance principles, ensuring that all modifications to critical business data are preserved for audit purposes.

Key features include:
- Multi-vendor marketplace with customer and seller accounts
- Comprehensive product management with variants and inventory tracking
- Secure payment processing and order management
- Shipping and tracking integration
- Cancellation and refund request workflows
- Customer review and rating system
- Administrative oversight capabilities
- Complete audit trail through data snapshots

## 2. User Actors and Authentication

### 2.1 Customer Actor

THE customer SHALL be a registered user who can browse products, manage wishlists, add items to cart, place orders, and manage their accounts.

Customer functionalities include:
- Account registration with email and password
- Login with email and password
- Password change capability
- Account deletion with data retention for legal purposes
- Profile management (display name and phone number)
- Multiple shipping address management with default address designation
- Product search and browsing
- Wishlist management
- Shopping cart operations
- Order placement and management
- Cancellation and refund requests
- Review creation and management

WHEN a customer attempts to access any platform feature, THE system SHALL require authentication.

WHEN a customer deletes their account, THE system SHALL preserve their order history and reviews while removing personal profile information.

### 2.2 Seller Actor

THE seller SHALL be a registered merchant who can create products, manage inventory, process orders, and manage their shop profiles.

Seller functionalities include:

Account Management:
- Account registration with email and password
- Login with email and password
- Password change capability
- Account deletion subject to order completion requirements
- Profile management (shop name, description, logo)
- Approval status monitoring

Product Management:
- Product creation with name, description, category, and base price
- Product image management
- Product variant (SKU) creation and management
- Inventory management with history tracking
- Product and variant snapshots for all modifications

Order Management:
- Order item fulfillment
- Shipment creation with tracking information
- Cancellation request approval/rejection
- Refund request approval/rejection

Dashboard and Analytics:
- Shop performance metrics
- Order item monitoring
- Cancellation and refund request tracking

WHEN a seller attempts to delete their account, THE system SHALL verify that no pending orders or requests exist.

WHILE a seller's account is pending approval, THE system SHALL restrict product creation and editing capabilities.

### 2.3 Administrator Actor

THE administrator SHALL be a privileged user with capabilities to manage sellers, categories, products, orders, and user accounts.

Administrator functionalities include:

User Management:
- Seller registration approval/rejection
- User account suspension/banning
- Administrator role management

Category Management:
- Category and subcategory creation
- Category editing and deletion

Product Oversight:
- Product review and removal
- Snapshot access for any product

Order Oversight:
- Order monitoring across the platform
- Force cancellation and refund processing

WHEN an administrator deletes a category, THE system SHALL reclassify all products in that category as uncategorized.

### 2.4 Authentication and Session Management

#### Authentication Flow

THE authentication system SHALL support email and password based authentication for all user actors.

WHEN a user attempts authentication, THE system SHALL:
- Validate email format
- Verify password against stored secure hash
- Generate secure session tokens upon successful authentication
- Associate appropriate permissions with the session

#### Session Management

THE system SHALL maintain user sessions using JWT tokens.

WHEN a user authenticates successfully, THE system SHALL:
- Generate access token with 30-minute expiration
- Generate refresh token with 30-day expiration
- Include user ID, actor type, and permissions in JWT payload
- Store tokens in httpOnly cookies for security

WHEN a session expires, THE system SHALL require re-authentication.

#### Password Security

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

## 3. Product and Category Management

### 3.1 Category System

THE system SHALL organize products into a two-level category hierarchy with categories and subcategories.

Administrators SHALL be the only users authorized to create, edit, or delete categories.

WHEN a customer browses the platform, THE system SHALL display a list of all available categories.

WHEN a customer views a category, THE system SHALL display all products within that category.

### 3.2 Product Structure

Each product SHALL contain:
- Name (required)
- Description (required)
- Category (required)
- Base price (required)
- Images (multiple, with ordering capability)
- Variants (SKU codes with option values and prices)

WHEN a seller creates a product, THE system SHALL require all mandatory fields.

WHEN a seller modifies a product, THE system SHALL create a complete snapshot of the product state before changes.

### 3.3 Product Images

THE system SHALL allow sellers to upload multiple images for each product.

WHEN a seller uploads images to a product, THE system SHALL accept JPG, PNG, and GIF formats with maximum file size of 5MB per image.

WHEN a seller uploads images to a product, THE system SHALL generate thumbnails for efficient display in search results and listing pages.

THE system SHALL allow sellers to reorder the images for their products, with the first image being designated as the main/thumbnail image.

THE system SHALL allow sellers to delete images from their products.

WHEN a seller modifies images for a product, THE system SHALL include all images in the product snapshot created for that modification.

WHEN a seller deletes a product, THE system SHALL preserve all images that were part of snapshots for that product, even if the original files are deleted.

### 3.4 Product Search and Filtering

Customers SHALL be able to search products by name with filtering capabilities including:
- Category selection
- Price range (minimum and maximum)
- In-stock status

Customers SHALL be able to sort search results by:
- Newest first
- Price (low to high)
- Price (high to low)

## 4. Shopping and Order Management

### 4.1 Wishlist Management

WHEN a customer adds a product to their wishlist, THE system SHALL associate the product with that customer's wishlist.

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customer wishlists.

### 4.2 Shopping Cart Operations

Customers SHALL be able to:
- Add specific product variants to their cart with quantity specification
- View their cart contents with product details and subtotals
- Modify item quantities
- Remove items from their cart

WHEN a customer adds a variant that already exists in their cart, THE system SHALL combine the quantities rather than creating a separate line item.

IF a variant's stock quantity is less than the cart quantity, THE system SHALL display a warning to the customer.

IF a variant becomes out of stock or is deleted, THE system SHALL mark that item as unavailable in the cart.

### 4.3 Checkout Process

THE checkout process SHALL include:
- Cart review with item details and total price
- Shipping address selection (with default address option)
- Order summary review
- Payment processing through an external gateway

WHEN a customer confirms their order, THE system SHALL process payment and create the order only upon successful payment.

WHEN an order is successfully created, THE system SHALL remove purchased items from the customer's cart.

## 5. Inventory and Variant Management

### 5.1 Product Variants (SKU)

Each product variant SHALL include:
- SKU code (unique identifier)
- Option values (e.g., color: "Red", size: "Large")
- Price (optional override of base price)
- Stock quantity (required)

Sellers SHALL be able to:
- Add variants to their products
- Edit variant details
- Delete variants subject to order constraints

WHEN a seller modifies a variant, THE system SHALL create a snapshot of the variant state before changes.

WHERE a product has no variants, THE system SHALL display it as "unavailable" for purchase.

### 5.2 Inventory Management

THE inventory system SHALL:
- Track stock quantity through inventory history records
- Calculate current stock as the sum of all inventory records
- Support stock increases (restocking) with reason documentation
- Support stock decreases (adjustments/losses) with reason documentation

WHEN an order is placed successfully, THE system SHALL automatically create negative inventory records for purchased variants.

WHEN an order is cancelled or refunded, THE system SHALL automatically create positive inventory records to restore stock.

IF a variant's stock reaches zero, THE system SHALL display it as "out of stock" and prevent customers from adding it to their cart.

## 6. Payment and Order Processing

### 6.1 Order Creation

WHEN payment processing succeeds, THE system SHALL:
- Create an order record
- Generate order items with "paid" status
- Create snapshots of purchased products, variants, and seller profiles
- Decrease stock quantities for purchased variants
- Remove purchased items from the customer's cart

IF payment processing fails, THE system SHALL preserve the customer's cart and notify the customer of the failure.

### 6.2 Order Structure

An order SHALL contain one or more order items, where each item represents a purchased product variant with a quantity.

Order items SHALL maintain independent statuses including:
- Paid
- Shipped
- Delivered
- Cancelled
- Refunded

### 6.3 Order Status Management

THE system SHALL derive overall order status from item statuses:
- IF all items are paid, THE order status SHALL be "paid"
- IF any item is shipped, THE order status SHALL be "shipped"
- IF all items are delivered, THE order status SHALL be "delivered"
- IF all items are cancelled, THE order status SHALL be "cancelled"
- IF all items are refunded, THE order status SHALL be "refunded"
- IF items have mixed statuses, THE order status SHALL be "partially completed"

## 7. Shipping and Tracking

### 7.1 Shipment Concept

A shipment SHALL represent a package sent by a seller containing one or more order items from the same seller.

WHEN a seller creates a shipment, THE system SHALL:
- Allow selection of multiple items from the same seller
- Accept carrier name and tracking number
- Update all included items to "shipped" status

### 7.2 Delivery Confirmation

Customers SHALL be able to view tracking information for each shipment.

Customers SHALL be able to confirm delivery for entire shipments.

WHEN a customer confirms delivery for a shipment, THE system SHALL update all items in that shipment to "delivered" status.

IF a customer does not confirm delivery within 14 days of shipping, THE system SHALL automatically update all items in that shipment to "delivered" status.

## 8. Cancellation and Refund System

### 8.1 Cancellation Requests

Customers SHALL be able to request cancellation for order items with "paid" status.

WHEN a customer submits a cancellation request, THE system SHALL:
- Require a reason for the cancellation
- Notify the relevant seller
- Create a snapshot of the request

Sellers SHALL be able to approve or reject cancellation requests.

IF a seller approves a cancellation request, THE system SHALL:
- Update the item status to "cancelled"
- Process refund for that item
- Restore stock quantities via inventory records

### 8.2 Refund Requests

Customers SHALL be able to request refunds for order items with "delivered" status within 7 days of delivery.

WHEN a customer submits a refund request, THE system SHALL:
- Require a reason for the refund
- Notify the relevant seller
- Create a snapshot of the request

Sellers SHALL be able to approve or reject refund requests.

IF a seller approves a refund request, THE system SHALL:
- Update the item status to "refunded"
- Process refund for that item
- Restore stock quantities via inventory records

## 9. Reviews and Ratings System

### 9.1 Review Creation

Customers SHALL be able to write reviews for products they have purchased.

WHEN an order item status becomes "delivered", THE system SHALL enable review creation for that product.

Each review SHALL include:
- Rating (1 to 5 stars, required)
- Text content (optional)

### 9.2 Review Management

Customers SHALL be able to edit their reviews with snapshot preservation.

Customers SHALL be able to delete their reviews while preserving snapshots.

WHEN a customer deletes their account, THE system SHALL preserve their reviews but display them as authored by a "deleted user".

## 10. Seller Dashboard and Analytics

### 10.1 Dashboard Overview

THE seller dashboard SHALL display:
- Total number of products
- Total number of order items
- Number of pending cancellation requests
- Number of pending refund requests

### 10.2 Order Management

Sellers SHALL be able to:
- View all order items for their products
- Filter order items by status
- Process shipments
- Respond to cancellation and refund requests

## 11. Administrative System

### 11.1 Administrator Management

Users SHALL be able to request administrator privileges with justification.

Super administrators SHALL be able to:
- Approve or reject administrator requests
- Promote administrators to super administrator status
- Demote super administrators to regular administrator status

### 11.2 Seller Oversight

Administrators SHALL be able to:
- Review pending seller registrations
- Approve or reject seller registrations with reasons
- Suspend or unsuspend seller accounts

WHEN a seller account is suspended, THE system SHALL:
- Hide their products from search and category listings
- Prevent new product creation
- Allow processing of existing orders

### 11.3 Platform Management

Administrators SHALL be able to:
- Create and manage categories
- Review all products on the platform
- Delete products for policy violations
- View all orders
- Force-cancel or force-refund any order or item
- Manage customer and seller accounts

## 12. Data Snapshots and Audit Trail

### 12.1 Snapshot Principles

THE system SHALL create snapshots for all modifications to critical business data including:
- Products and variants
- Seller profiles
- Order items
- Reviews
- Cancellation and refund requests

Snapshots SHALL:
- Record the timestamp of the change
- Preserve previous and current values
- Be immutable and undeletable
- Be accessible to relevant parties for dispute resolution

### 12.2 Snapshot Implementation

WHEN any editable data is modified, THE system SHALL automatically create a snapshot of the previous state.

Snapshots SHALL be viewable by:
- Data owners
- Administrators
- Authorized parties for dispute resolution

### 12.3 Product Snapshot Structure

WHEN a product is edited, THE system SHALL create a product snapshot that includes all product fields including name, description, category, base price, and all associated images.

THE product snapshot SHALL include a complete copy of all product variants that existed at the time of the snapshot, preserving their SKU codes, option values, and prices.

THE system SHALL maintain the relationship between product snapshots and product-variant snapshots to enable reconstruction of a complete product state at any historical point.

WHEN a product is deleted, THE system SHALL preserve all existing snapshots of that product for legal and audit purposes.

### 12.4 Variant Snapshot Requirements

WHEN a product variant is edited, THE system SHALL create a snapshot of the previous variant state including SKU code, option values, price, and stock quantity.

THE variant snapshot SHALL be associated with its parent product snapshot to maintain historical context of the complete product structure.

WHEN a product variant is deleted, THE system SHALL preserve all existing snapshots of that variant for audit trail purposes.

### 12.5 Profile and Order Snapshots

#### Seller Profile Snapshots

WHEN a seller edits their profile information including shop name, description, or logo, THE system SHALL create a snapshot of the previous profile state.

THE seller profile snapshot SHALL include the complete profile information as it existed before the change including shop name, description, and logo image reference.

#### Order Item Snapshots

WHEN an order is successfully placed, THE system SHALL create snapshots of all purchased products and variants as they existed at the time of purchase.

THE order item snapshot SHALL preserve the product name, description, variant options, and exact price at the time of purchase to prevent disputes over pricing changes.

WHEN an order is placed, THE system SHALL also create a snapshot of each seller's profile at the time of purchase to preserve shop name and logo for historical order records.

### 12.6 Request Snapshots

#### Cancellation Request Snapshots

WHEN a customer submits a cancellation request, THE system SHALL create an initial snapshot of the request including reason and status.

WHEN a seller responds to a cancellation request, THE system SHALL create a snapshot of the request state at that moment including the response and updated status.

#### Refund Request Snapshots

WHEN a customer submits a refund request, THE system SHALL create an initial snapshot of the request including reason and status.

WHEN a seller responds to a refund request, THE system SHALL create a snapshot of the request state at that moment including the response and updated status.

### 12.7 Snapshot Preservation and Access

#### Storage and Retention

THE system SHALL store all snapshots in a secure, redundant storage system that prevents unauthorized access or modification.

THE snapshot storage SHALL be separate from active data systems to ensure preservation even if active data is compromised.

THE system SHALL maintain snapshots indefinitely for critical business data to satisfy legal and regulatory requirements.

#### Access Control for Snapshots

WHEN an actor requests access to snapshots, THE system SHALL verify their permissions before granting access.

Customers SHALL be able to view snapshots of their own reviews and orders but not snapshots of other users' data.

Sellers SHALL be able to view snapshots of their own products, variants, and profile information but not snapshots from other sellers.

Administrators SHALL be able to view snapshots of any system data for audit and dispute resolution purposes.

## 13. Business Rules and Validation

### 13.1 Account Management

THE system SHALL validate email uniqueness during registration for all user actors.

WHEN a user changes password, THE system SHALL require current password verification.

THE system SHALL enforce rate limiting on authentication attempts to prevent brute force attacks.

### 13.2 Product Management

THE system SHALL validate that product names are between 1 and 255 characters in length.

THE system SHALL validate that product descriptions are between 1 and 5000 characters in length.

THE system SHALL validate that base prices are positive decimal values with up to 2 decimal places.

THE system SHALL enforce unique SKU codes across the entire platform.

### 13.3 Inventory Management

THE system SHALL validate inventory adjustments to prevent negative stock unless specifically allowed for accounting corrections.

WHEN a variant's stock quantity reaches 0, THE system SHALL automatically update the variant status to "out of stock".

### 13.4 Order Management

THE system SHALL validate that all items in a cart are available for purchase before order creation.

IF inventory quantities change between cart review and order creation, THE system SHALL abort the order process and update the customer with current availability information.

## 14. Performance and Security Requirements

### 14.1 Performance

WHEN a user submits authentication credentials, THE system SHALL validate and respond within 2 seconds under normal load.

WHEN a customer searches for products, THE system SHALL return results within 3 seconds.

WHEN a seller creates a shipment, THE system SHALL process the request and update order item statuses within 2 seconds.

WHEN a customer confirms delivery, THE system SHALL update shipment and item statuses within 1 second.

### 14.2 Security

THE system SHALL ensure all data in transit is encrypted using TLS.

THE system SHALL protect sensitive data at rest using appropriate encryption.

THE system SHALL implement secure password storage using industry-standard hashing algorithms.

THE system SHALL enforce appropriate access controls to prevent unauthorized data access.

THE system SHALL maintain logs of all authentication attempts.

THE system SHALL preserve all account-related actions for audit purposes.

## 15. Compliance Requirements

### 15.1 Data Privacy

THE system SHALL comply with applicable data privacy regulations including but not limited to GDPR and CCPA.

WHEN processing account deletion, THE system SHALL follow data retention requirements for legal and audit purposes.

### 15.2 Audit Requirements

THE system SHALL maintain logs of all authentication attempts.

THE system SHALL preserve all account-related actions for audit purposes.

THE system SHALL provide mechanisms for data subject access requests.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*