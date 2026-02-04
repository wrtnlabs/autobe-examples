## E-Commerce Shopping Mall Platform Requirements Specification

### 1. Introduction and Overview

#### 1.1 Purpose
This document provides a comprehensive specification for an e-commerce shopping mall platform that enables customers to browse, purchase, and review products from multiple sellers while ensuring proper account management, inventory control, secure payment processing, and complete order fulfillment.

#### 1.2 Scope
The platform will support:
- Customer account registration and management
- Seller account registration and approval workflows
- Product listing and categorization
- Shopping cart and wishlist functionality
- Secure payment processing
- Order management and tracking
- Cancellation and refund processes
- Review and rating system
- Administrative oversight of the entire platform

#### 1.3 Key Features
- Full user registration and authentication system
- Comprehensive product search and filtering capabilities
- Detailed product information with variant management
- Secure shopping cart with inventory validation
- Complete order lifecycle management
- Tracking and delivery confirmation
- Dispute resolution through data snapshots
- Multi-seller marketplace functionality

### 2. User Actors and Authentication

#### 2.1 Customer Actor
Customers are registered users who can browse products, make purchases, and interact with the platform's features.

##### Authentication Requirements:
- Email and password registration
- Login with email and password
- Password change capability
- Account deletion with specific data retention rules
- Session management with secure tokens

##### Functional Permissions:
- Browse all product categories
- Search and filter products
- Add products to wishlist
- Manage shopping cart
- Place and track orders
- Request cancellations and refunds
- Submit product reviews
- Manage shipping addresses
- Edit profile information

#### 2.2 Seller Actor
Sellers are registered users who can list products, manage inventory, process orders, and manage their shop profile.

##### Authentication Requirements:
- Email and password registration
- Login with email and password
- Password change capability
- Account deletion with specific conditions
- Session management with secure tokens
- Administrative approval requirement before selling

##### Functional Permissions:
- Create and edit products
- Manage product variants and inventory
- View and respond to order requests
- Process shipments
- Handle cancellation and refund requests
- View dashboard analytics
- Edit shop profile with snapshot creation
- View order history and snapshots

#### 2.3 Administrator Actor
Administrators oversee the platform, manage users, approve sellers, and ensure policy compliance.

##### Authentication Requirements:
- Email and password login
- Administrative role assignment
- Session management with secure tokens

##### Functional Permissions:
- Approve/reject seller registrations
- Manage user accounts (ban/unban)
- Create and manage product categories
- View all products and order data
- Oversee cancellation and refund processes
- Manage other administrators
- Platform-wide analytics access

### 3. Account Management

#### 3.1 Customer Account Lifecycle

##### Registration
WHEN a customer accesses the platform, THE system SHALL require registration with email and password before allowing access to any features.
WHEN a customer submits registration information, THE system SHALL validate the email format and password strength requirements.
WHEN a customer attempts to register with an email that already exists, THE system SHALL display an appropriate error message.

##### Authentication
WHEN a customer attempts to log in, THE system SHALL verify the email and password combination.
WHEN a customer provides invalid credentials, THE system SHALL display an appropriate error message without revealing which field was incorrect.
WHEN a customer successfully logs in, THE system SHALL generate a secure session token.

##### Password Management
WHEN a customer requests to change their password, THE system SHALL verify their current password before allowing the change.
WHEN a customer submits a new password, THE system SHALL validate password strength requirements.
WHEN a customer successfully changes their password, THE system SHALL invalidate all existing sessions except the current one.

##### Account Deletion
WHEN a customer requests to delete their account, THE system SHALL require password confirmation.
WHEN a customer confirms account deletion, THE system SHALL remove their profile information immediately.
WHEN a customer's account is deleted, THE system SHALL preserve their order history for legal and seller record purposes.
WHEN a customer's account is deleted, THE system SHALL preserve their reviews but display them as "deleted user".

#### 3.2 Seller Account Lifecycle

##### Registration
WHEN a seller accesses the registration page, THE system SHALL require email and password for account creation.
WHEN a seller submits registration information, THE system SHALL validate the email format and password strength requirements.
WHEN a seller attempts to register with an email that already exists, THE system SHALL display an appropriate error message.

##### Authentication
WHEN a seller attempts to log in, THE system SHALL verify the email and password combination.
WHEN a seller provides invalid credentials, THE system SHALL display an appropriate error message.
WHEN a seller successfully logs in, THE system SHALL generate a secure session token.

##### Approval Workflow
WHEN a seller registers, THE system SHALL set their account status to "pending approval".
WHEN a seller logs in with pending approval status, THE system SHALL display their current approval status.
WHEN an administrator approves a seller, THE system SHALL update the seller's status to "approved" and allow product creation.
WHEN an administrator rejects a seller, THE system SHALL update the seller's status to "rejected" and provide a reason.
WHEN a seller's account is rejected, THE system SHALL allow them to submit a new registration request.

##### Password Management
WHEN a seller requests to change their password, THE system SHALL verify their current password before allowing the change.
WHEN a seller submits a new password, THE system SHALL validate password strength requirements.
WHEN a seller successfully changes their password, THE system SHALL invalidate all existing sessions except the current one.

##### Account Deletion
WHEN a seller requests to delete their account, THE system SHALL verify that they have no pending orders (paid or shipped status).
WHEN a seller requests to delete their account, THE system SHALL verify that they have no pending cancellation or refund requests.
WHEN a seller meets deletion requirements, THE system SHALL allow account deletion after password confirmation.
WHEN a seller's account is deleted, THE system SHALL remove their products from listings.
WHEN a seller's account is deleted, THE system SHALL preserve order history and snapshots.
WHEN a seller's account is deleted, THE system SHALL preserve their shop name in past orders.

#### 3.3 Profile Management

##### Customer Profile
WHEN a customer accesses their profile, THE system SHALL display their display name and phone number.
WHEN a customer edits their profile, THE system SHALL allow modification of display name and phone number.
WHEN a customer successfully updates their profile, THE system SHALL persist the changes.

##### Seller Profile
WHEN a seller accesses their profile, THE system SHALL display their shop name, description, and logo.
WHEN a seller edits their profile, THE system SHALL allow modification of shop name, description, and logo.
WHEN a seller successfully updates their profile, THE system SHALL create a snapshot of the previous state.
WHEN a customer views a seller's profile, THE system SHALL display the current shop information.

### 4. Address Management

#### 4.1 Address Operations

WHEN a customer accesses their address management page, THE system SHALL display all saved shipping addresses.
WHEN a customer adds a new address, THE system SHALL require recipient name, phone number, street address, city, state/province, postal code, and country.
WHEN a customer successfully adds an address, THE system SHALL save it to their profile.
WHEN a customer edits an existing address, THE system SHALL allow modification of all address fields.
WHEN a customer deletes an address, THE system SHALL remove it from their profile.
WHEN a customer sets an address as default, THE system SHALL mark it as the default shipping address.
WHEN a customer has a default address set, THE system SHALL pre-select it during checkout.

#### 4.2 Address Validation

WHEN a customer submits an address, THE system SHALL validate all required fields are present.
WHEN a customer submits an address, THE system SHALL verify the postal code format matches the selected country.
WHEN a customer submits an address with invalid data, THE system SHALL display specific error messages for each field.

### 5. Product and Category Management

#### 5.1 Category System

##### Category Structure
WHEN a customer browses the platform, THE system SHALL organize products into categories and subcategories (one level only).
WHEN administrators create categories, THE system SHALL require a name and description.
WHEN customers view the category list, THE system SHALL display all top-level categories.
WHEN customers select a category, THE system SHALL display products within that category and its subcategories.

##### Administrative Category Management
WHEN an administrator creates a new category, THE system SHALL require a unique name and description.
WHEN an administrator edits a category, THE system SHALL allow modification of name and description.
WHEN an administrator deletes a category, THE system SHALL remove it and make products in that category uncategorized.

#### 5.2 Product Management

##### Product Creation
WHEN a seller creates a product, THE system SHALL require name, description, category, and base price.
WHEN a seller selects a category, THE system SHALL ensure it's a valid category or subcategory.
WHEN a seller successfully creates a product, THE system SHALL assign ownership to that seller.

##### Product Editing
WHEN a seller edits their product, THE system SHALL allow modification of all product fields.
WHEN a seller successfully updates their product, THE system SHALL create a snapshot of the previous state.

##### Product Deletion
WHEN a seller requests to delete a product, THE system SHALL verify that no variants have pending orders (paid or shipped).
WHEN a seller requests to delete a product, THE system SHALL verify that no variants have pending cancellation or refund requests.
WHEN a seller's product meets deletion requirements, THE system SHALL allow deletion.
WHEN a seller deletes a product, THE system SHALL remove all variants and inventory records.
WHEN a seller deletes a product, THE system SHALL remove it from search and category listings.

##### Product Visibility
WHEN a customer searches for products, THE system SHALL show products from all sellers.
WHEN a customer views a category, THE system SHALL show products within that category.
WHEN a seller's account is suspended, THE system SHALL hide their products from search and listings.

#### 5.3 Product Images

WHEN a seller uploads images for a product, THE system SHALL allow multiple image uploads.
WHEN a seller reorders product images, THE system SHALL update the display order with the first image as the thumbnail.
WHEN a seller deletes images from a product, THE system SHALL remove them from the product.
WHEN image changes occur, THE system SHALL include these changes in product snapshots.

### 6. Product Variants and Inventory System

#### 6.1 Variant Management

WHEN a seller adds variants to a product, THE system SHALL require a unique SKU code, option values, and stock quantity.
WHEN a seller adds a price to a variant, THE system SHALL allow overriding the base price.
WHEN a seller successfully creates a variant, THE system SHALL add it to the product.
WHEN a seller edits a variant, THE system SHALL allow modification of all variant fields.
WHEN a seller successfully updates a variant, THE system SHALL create a snapshot of the previous state.

##### Variant Deletion
WHEN a seller requests to delete a variant, THE system SHALL verify that it has no pending orders (paid or shipped).
WHEN a seller requests to delete a variant, THE system SHALL verify that it has no pending cancellation or refund requests.
WHEN a variant meets deletion requirements, THE system SHALL allow deletion.

##### Product Availability
WHEN a product has no variants, THE system SHALL display it as "unavailable" in search results.
WHEN a product has variants, THE system SHALL make it purchasable.
WHEN a variant's stock reaches 0, THE system SHALL mark it as "out of stock".
WHEN a variant is out of stock, THE system SHALL prevent customers from adding it to the cart.

#### 6.2 Inventory Management

##### Stock Tracking
WHEN inventory records are created, THE system SHALL track quantity change, reason, and timestamp.
WHEN a customer places an order, THE system SHALL automatically create negative inventory records.
WHEN an order is cancelled or refunded, THE system SHALL automatically create positive inventory records.
WHEN a seller restocks a variant, THE system SHALL create a positive inventory record with quantity and reason.
WHEN a seller adjusts inventory due to loss, THE system SHALL create a negative inventory record with quantity and reason.
WHEN customers view product details, THE system SHALL display current stock status.

##### Inventory History
WHEN a seller views inventory history, THE system SHALL show all records for that variant.
WHEN a seller views inventory history, THE system SHALL display changes chronologically with reasons.

### 7. Product Search and Display

#### 7.1 Search Functionality

WHEN a customer searches for products, THE system SHALL match by product name.
WHEN search results are displayed, THE system SHALL paginate the results.
WHEN a customer applies filters, THE system SHALL refine the search results accordingly.

##### Search Filters
WHEN a customer applies category filters, THE system SHALL show only products in those categories.
WHEN a customer applies price range filters, THE system SHALL show only products within that price range.
WHEN a customer selects in-stock only filter, THE system SHALL exclude out-of-stock products.

##### Search Sorting
WHEN a customer selects sort by newest, THE system SHALL order results with newest products first.
WHEN a customer selects sort by price low-to-high, THE system SHALL order results by price ascending.
WHEN a customer selects sort by price high-to-low, THE system SHALL order results by price descending.

#### 7.2 Product Display

##### Product Listings
WHEN displaying product listings, THE system SHALL show the main image, name, base price (or price range), seller shop name, and average rating (if available).
WHEN a product has multiple variants with different prices, THE system SHALL display a price range.

##### Product Details Page
WHEN a customer views a product detail page, THE system SHALL display all images, name, description, category, seller shop name, and all available variants.
WHEN displaying variants, THE system SHALL show option values, prices, and stock status.
WHEN a product has reviews, THE system SHALL display the average rating and total review count.
WHEN a product has reviews, THE system SHALL display all reviews sorted by newest first.

### 8. Wishlist Management

#### 8.1 Wishlist Operations

WHEN a customer adds a product to their wishlist, THE system SHALL save that product to their wishlist.
WHEN a customer views their wishlist, THE system SHALL display products in a paginated view.
WHEN a customer removes a product from their wishlist, THE system SHALL delete that entry.

#### 8.2 Wishlist Synchronization

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customer wishlists.
WHEN a product is removed from a wishlist due to seller deletion, THE system SHALL not notify the customer immediately but shall hide it on next view.

### 9. Shopping Cart and Checkout

#### 9.1 Cart Management

WHEN a customer adds a variant to their cart, THE system SHALL require a specific variant selection and quantity.
WHEN a customer adds a variant that is already in their cart, THE system SHALL combine the quantities rather than creating a separate line.
WHEN a customer views their cart, THE system SHALL display product name, variant options, price, quantity, and subtotal for each item.
WHEN a customer modifies an item quantity, THE system SHALL update the quantity and recalculate the subtotal.
WHEN a customer removes an item from their cart, THE system SHALL delete that entry.
WHEN a customer views their cart, THE system SHALL display the total price of all items.

#### 9.2 Cart Validation

WHEN a customer views their cart, THE system SHALL indicate if any item's quantity exceeds available stock.
WHEN a customer attempts to checkout with items exceeding available stock, THE system SHALL prevent checkout and display an error.
WHEN a seller deletes a variant, THE system SHALL mark that variant as unavailable in all carts.
WHEN a customer attempts to checkout with unavailable items, THE system SHALL prevent checkout and display an error.

#### 9.3 Checkout Process

WHEN a customer proceeds to checkout, THE system SHALL verify that no items are unavailable or exceed stock limits.
WHEN a customer begins checkout, THE system SHALL display a summary including items, shipping address selection, and total price.
WHEN a customer selects a shipping address, THE system SHALL allow selection from saved addresses or adding a new address.
WHEN a customer confirms their order, THE system SHALL lock the shipping address and proceed to payment.

#### 9.4 Payment Processing

WHEN a customer confirms their order, THE system SHALL interface with an external payment gateway.
WHEN payment processing begins, THE system SHALL lock the cart contents to prevent modifications.
WHEN payment succeeds, THE system SHALL create the order and proceed with fulfillment.
WHEN payment fails, THE system SHALL display an error and allow retry without creating an order.

### 10. Order Management

#### 10.1 Order Creation

WHEN payment succeeds, THE system SHALL decrease stock quantities for purchased variants.
WHEN payment succeeds, THE system SHALL remove purchased items from the customer's cart.
WHEN payment succeeds, THE system SHALL create an order record with one or more order items.
WHEN payment succeeds, THE system SHALL set all order items to status "paid".
WHEN an order is created, THE system SHALL save snapshots of each purchased product, variant, and seller profile.

#### 10.2 Order Structure

WHEN an order contains multiple quantities of the same variant, THE system SHALL create one order item with the total quantity.
WHEN an order contains items from different sellers, THE system SHALL include all in the same order record.
WHEN order items are displayed, THE system SHALL show product name, variant options, quantity, price, and status.

#### 10.3 Order Status Management

##### Item Statuses
WHEN an order item is paid, THE system SHALL set status to "paid".
WHEN a seller ships an item, THE system SHALL set status to "shipped".
WHEN a customer confirms delivery, THE system SHALL set status to "delivered".
WHEN a cancellation is approved, THE system SHALL set item status to "cancelled".
WHEN a refund is processed, THE system SHALL set item status to "refunded".

##### Order Status Derivation
WHEN all items in an order are paid, THE system SHALL set order status to "paid".
WHEN any item is shipped in an order, THE system SHALL set order status to "shipped".
WHEN all items are delivered, THE system SHALL set order status to "delivered".
WHEN all items are cancelled, THE system SHALL set order status to "cancelled".
WHEN all items are refunded, THE system SHALL set order status to "refunded".
WHEN an order contains mixed statuses, THE system SHALL set order status to "partially completed".

#### 10.4 Order History

WHEN a customer views their order history, THE system SHALL display orders sorted by newest first.
WHEN a customer views their order history, THE system SHALL paginate the results.
WHEN a customer views an order detail, THE system SHALL display all items, shipping address, and shipments.

### 11. Shipping and Tracking

#### 11.1 Shipment Management

WHEN a seller processes orders, THE system SHALL allow grouping of items into shipments.
WHEN a seller creates a shipment, THE system SHALL require carrier name and tracking number.
WHEN a seller creates a shipment, THE system SHALL update all included items to status "shipped".
WHEN items from different sellers are ordered, THE system SHALL create separate shipments automatically.

#### 11.2 Delivery Confirmation

WHEN a customer views shipment details, THE system SHALL display tracking information.
WHEN a customer confirms delivery, THE system SHALL update all items in that shipment to "delivered".
WHEN a shipment is not confirmed within 14 days, THE system SHALL automatically mark items as "delivered".

### 12. Cancellation and Refund System

#### 12.1 Cancellation Process

WHEN a customer requests cancellation, THE system SHALL require selecting items with status "paid".
WHEN a customer submits a cancellation request, THE system SHALL include a reason text.
WHEN a seller receives a cancellation request, THE system SHALL allow approval or rejection.
WHEN a seller responds to a cancellation, THE system SHALL create a snapshot of the request state.
WHEN a seller approves a cancellation, THE system SHALL cancel the item and restore stock quantities.
WHEN all items in an order are cancelled, THE system SHALL update the order status to "cancelled".

#### 12.2 Refund Process

WHEN a customer requests a refund, THE system SHALL require selecting items with status "delivered".
WHEN a customer requests a refund, THE system SHALL verify it's within 7 days of delivery.
WHEN a customer submits a refund request, THE system SHALL include a reason text.
WHEN a seller receives a refund request, THE system SHALL allow approval or rejection.
WHEN a seller responds to a refund request, THE system SHALL create a snapshot of the request state.
WHEN a seller approves a refund, THE system SHALL refund the item and restore stock quantities.
WHEN all items in an order are refunded, THE system SHALL update the order status to "refunded".

### 13. Reviews and Ratings System

#### 13.1 Review Submission

WHEN a customer attempts to write a review, THE system SHALL verify the item status is "delivered".
WHEN a customer submits a review, THE system SHALL require a rating (1-5 stars) and optional text.
WHEN a customer successfully submits a review, THE system SHALL display it on the product page.
WHEN a customer attempts to review the same product multiple times for the same order, THE system SHALL prevent duplicate submissions.

#### 13.2 Review Management

WHEN a customer edits their review, THE system SHALL allow modification of rating and text content.
WHEN a customer edits their review, THE system SHALL create a snapshot of the previous state.
WHEN a customer deletes their review, THE system SHALL mark it as deleted but preserve snapshots.
WHEN product reviews are displayed, THE system SHALL sort by newest first.
WHEN product reviews are displayed, THE system SHALL calculate average rating from all non-deleted reviews.

### 14. Seller Dashboard

#### 14.1 Dashboard Metrics

WHEN a seller accesses their dashboard, THE system SHALL display total products count.
WHEN a seller accesses their dashboard, THE system SHALL display total order items for their products.
WHEN a seller accesses their dashboard, THE system SHALL display count of pending cancellation requests.
WHEN a seller accesses their dashboard, THE system SHALL display count of pending refund requests.

#### 14.2 Order Item Management

WHEN a seller views their order items, THE system SHALL display all items for their products.
WHEN a seller filters order items, THE system SHALL allow filtering by status.

### 15. Administrative System

#### 15.1 Administrator Management

WHEN a user requests administrator rights, THE system SHALL allow submission of a request with reason.
WHEN super administrators view requests, THE system SHALL display pending requests.
WHEN a super administrator approves a request, THE system SHALL grant administrator privileges.
WHEN a super administrator rejects a request, THE system SHALL notify the user.

##### Administrator Grades
WHEN there are multiple administrators, THE system SHALL distinguish between regular and super administrators.
WHEN a super administrator promotes another admin, THE system SHALL change their grade to super administrator.
WHEN a super administrator demotes another super admin, THE system SHALL change their grade to regular administrator.
WHEN a super administrator attempts self-demotion, THE system SHALL prevent the action.

#### 15.2 Seller Management

WHEN administrators view seller registrations, THE system SHALL display pending approvals.
WHEN an administrator approves a seller, THE system SHALL allow them to begin selling.
WHEN an administrator rejects a seller, THE system SHALL require a reason and notify the seller.
WHEN an administrator suspends a seller, THE system SHALL hide their products from listings.
WHEN an administrator suspends a seller, THE system SHALL prevent new product creation.
WHEN an administrator unsuspends a seller, THE system SHALL make products visible again.

#### 15.3 Category Management

WHEN administrators manage categories, THE system SHALL allow creation of categories and subcategories.
WHEN administrators edit categories, THE system SHALL allow modification of names and descriptions.
WHEN administrators delete categories, THE system SHALL make contained products uncategorized.

#### 15.4 Product and Order Oversight

WHEN administrators view the platform, THE system SHALL allow viewing of all products.
WHEN administrators view products, THE system SHALL allow viewing of any product snapshot.
WHEN administrators find policy violations, THE system SHALL permit product deletion.
WHEN administrators need to intervene, THE system SHALL allow force-cancelling items or orders.
WHEN administrators need to intervene, THE system SHALL allow force-refunding items or orders.

#### 15.5 User Management

WHEN administrators manage users, THE system SHALL allow viewing of all customer accounts.
WHEN administrators need to restrict access, THE system SHALL allow banning customers.
WHEN administrators reverse restrictions, THE system SHALL allow unbanning customers.
WHEN administrators manage sellers, THE system SHALL allow viewing all seller accounts.
WHEN administrators ban sellers, THE system SHALL prevent login but maintain existing orders.

### 16. Data Snapshots and Audit Trail

#### 16.1 Snapshot Principles

WHEN editable data is modified, THE system SHALL create a snapshot preserving the previous state.
WHEN snapshots are created, THE system SHALL record timestamp, changed fields, and before/after values.
WHEN snapshots are stored, THE system SHALL ensure they are immutable and cannot be deleted.
WHEN authorized parties access data, THE system SHALL allow viewing of relevant snapshots.

#### 16.2 Snapshot Coverage

WHEN products are edited, THE system SHALL create snapshots of all product fields and images.
WHEN variants are edited, THE system SHALL create snapshots of SKU, options, and price.
WHEN seller profiles are edited, THE system SHALL create snapshots of shop name, description, and logo.
WHEN order items are created, THE system SHALL save snapshots of product, variant, and seller profile.
WHEN reviews are edited, THE system SHALL create snapshots of rating and content.
WHEN cancellation requests are processed, THE system SHALL snapshot reason and status changes.
WHEN refund requests are processed, THE system SHALL snapshot reason and status changes.

#### 16.3 Snapshot Access

WHEN sellers view their data, THE system SHALL allow access to their own product snapshots.
WHEN administrators review data, THE system SHALL allow access to any product snapshot.
WHEN disputes arise, THE system SHALL preserve snapshots for resolution purposes.
WHEN product variants are edited, THE system SHALL include variant snapshots in product-snapshot → product-snapshot-SKU relationships.