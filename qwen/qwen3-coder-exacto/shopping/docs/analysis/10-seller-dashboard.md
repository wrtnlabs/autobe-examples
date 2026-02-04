# E-Commerce Shopping Mall Platform Requirements Specification

## Service Overview

The e-commerce shopping mall platform is a comprehensive online marketplace that enables customers to browse, purchase, and review products from multiple sellers. The platform implements a robust account system requiring registration for all users, sophisticated product management with variant support, comprehensive order processing with shipping and tracking, and advanced dispute resolution through immutable data snapshots.

The platform is designed around core business principles: security through account-based access control, transparency through comprehensive data snapshots, and reliability through well-defined business processes. All data modifications create immutable snapshots for legal compliance and dispute resolution.

### Core Value Proposition

1. **Multi-Vendor Marketplace**: Enables multiple sellers to list products while providing customers with a unified shopping experience
2. **Comprehensive Data Integrity**: Immutable snapshots of all modifications ensure transparency and legal compliance
3. **Rich Product Management**: Supports complex products with variants, images, and detailed categorization
4. **Advanced Order Management**: Full lifecycle order processing with shipping, tracking, cancellations, and refunds
5. **Robust Review System**: Customer review functionality with rating aggregation and moderation capabilities

### Platform Components

1. **User Management**: Customer and seller account systems with profile management and authentication
2. **Product Catalog**: Category organization, product listings, search, and filtering capabilities
3. **Shopping Experience**: Wishlist, shopping cart, and checkout processes
4. **Order Processing**: Payment integration, order creation, and status management
5. **Fulfillment System**: Shipping management, tracking, and delivery confirmation
6. **Dispute Resolution**: Cancellation and refund processing with seller-customer workflows
7. **Review Management**: Product rating and review system with moderation
8. **Seller Analytics**: Dashboard with performance metrics and order management
9. **Administrative System**: Platform oversight with category, seller, and content management
10. **Audit Trail**: Comprehensive snapshot system for all data modifications

## User Actors and Authentication

### Customer Actor

THE customer SHALL be able to register for an account using email and password.

WHEN a customer provides valid registration information, THE system SHALL create a new customer account with pending status until email verification.

THE customer SHALL be able to log in to the platform using their email and password credentials.

WHEN a customer provides valid login credentials, THE system SHALL authenticate the user and establish an active session.

THE customer SHALL be able to change their password after logging in.

WHEN a customer requests a password change, THE system SHALL verify their current password and update to the new password upon confirmation.

THE customer SHALL be able to delete their account after logging in.

WHEN a customer initiates account deletion, THE system SHALL:
- Delete their profile information
- Preserve their orders and order history for legal and seller record purposes
- Preserve their reviews but display them as "deleted user"

### Customer Profile Management

THE customer SHALL have a profile containing display name and phone number.

WHEN a customer accesses their profile, THE system SHALL display their current display name and phone number.

THE customer SHALL be able to edit their display name and phone number.

WHEN a customer updates their profile information, THE system SHALL:
- Save the updated information
- Create a snapshot of the previous profile state
- Notify the customer of successful update

### Address Management

THE customer SHALL be able to add multiple shipping addresses to their account.

WHEN a customer adds a new address, THE system SHALL store:
- Recipient name
- Phone number
- Street address
- City
- State/province
- Postal code
- Country

THE customer SHALL be able to edit their existing addresses.

THE customer SHALL be able to delete their existing addresses.

THE customer SHALL be able to designate one address as their default shipping address.

WHEN a customer sets an address as default, THE system SHALL update the default address designation and remove the previous default designation.

### Seller Actor

THE seller SHALL be able to register for an account using email and password.

WHEN a seller provides valid registration information, THE system SHALL create a new seller account with pending approval status.

THE seller SHALL be able to log in to the platform using their email and password credentials.

WHEN a seller provides valid login credentials, THE system SHALL authenticate the user and establish an active session IF their account is approved.

THE seller SHALL be able to change their password after logging in.

THE seller's account SHALL require administrator approval before they can list products for sale.

THE seller SHALL be able to view their account approval status (pending, approved, rejected).

IF a seller's registration is rejected, THEN THE system SHALL display the rejection reason to the seller.

WHERE a seller's registration is rejected, THE system SHALL allow the seller to submit a new registration request with updated information.

THE seller SHALL be able to delete their account ONLY IF:
- They have no pending orders (paid or shipped status)
- They have no pending cancellation or refund requests

WHEN a seller initiates account deletion under valid conditions, THE system SHALL:
- Delete their products from listings
- Preserve order history and snapshots
- Preserve their shop name in past orders

### Seller Profile Management

THE seller SHALL have a profile containing shop name, shop description, and logo image.

WHEN a seller accesses their profile, THE system SHALL display their current shop name, description, and logo.

THE seller SHALL be able to edit their shop name, description, and logo.

WHEN a seller updates their profile information, THE system SHALL:
- Save the updated information
- Create a snapshot of the previous profile state
- Update the seller's approval status to "pending" if the profile was previously rejected
- Notify administrators of profile updates requiring review

### Administrator Actor

THE administrator SHALL be able to log in to the administrative interface using approved credentials.

THE administrator SHALL be able to view and manage seller registrations.

THE administrator SHALL be able to create and manage product categories.

THE administrator SHALL be able to oversee all products and orders on the platform.

THE administrator SHALL be able to manage customer and seller accounts.

THE administrator SHALL be able to review audit snapshots for compliance purposes.

### Authentication and Session Management

WHEN any user attempts to access a protected resource, THE system SHALL verify their authentication status through session validation.

THE system SHALL maintain user sessions using secure, server-side session management.

WHEN a user logs in successfully, THE system SHALL create a new session with appropriate permissions based on user role.

THE system SHALL invalidate sessions after 24 hours of inactivity or upon user logout.

WHEN a user's account is deleted or banned, THE system SHALL immediately invalidate all active sessions for that user.

### Permission Matrix

| Feature | Customer | Seller | Administrator |
|---------|----------|--------|---------------|
| Register Account | ✓ | ✓ | - |
| Login | ✓ | ✓ | ✓ |
| Change Password | ✓ | ✓ | ✓ |
| Delete Account | ✓ | Conditional | - |
| View/Edit Profile | ✓ | ✓ | - |
| Manage Addresses | ✓ | - | - |
| Create Products | - | Approved Only | - |
| Edit Products | - | Own Products Only | All Products |
| Delete Products | - | Own Products Only | All Products |
| View Orders | Own Orders | Related Orders | All Orders |
| Process Shipments | - | Own Items | Oversight |
| Handle Cancellations | Request Only | Process Own | Force All |
| Handle Refunds | Request Only | Process Own | Force All |
| Write Reviews | Own Purchases | - | - |
| View Dashboard | - | ✓ | - |
| Manage Categories | - | - | ✓ |
| Approve Sellers | - | - | ✓ |
| Ban Users | - | - | ✓ |
| View Snapshots | Own Data | Own Data | All Data |

## Product and Category Management

### Category System

THE platform SHALL organize products into a hierarchical category system.

WHEN customers browse the platform, THE system SHALL display a list of all top-level categories.

THE category structure SHALL support one level of subcategories beneath each top-level category.

WHEN a customer selects a category, THE system SHALL display products within that category and its subcategories if applicable.

THE system SHALL restrict category creation and modification to administrator users only.

WHEN an administrator creates a new category, THE system SHALL require:
- Category name (required)
- Category description (required)
- Parent category designation (optional, for subcategories)

### Product Structure

THE seller SHALL be able to create products under their account.

WHEN a seller creates a new product, THE system SHALL require:
- Product name (required)
- Product description (required)
- Category assignment (required, can select a subcategory)
- Base price (required)

THE product SHALL be associated with the seller who created it.

THE seller SHALL be able to edit their own products.

WHEN a seller updates a product, THE system SHALL:
- Save the updated information
- Create a snapshot of the complete previous product state
- Include snapshots of all variants at the time of the change

THE seller SHALL be able to delete their own products ONLY IF:
- There are no pending order items (paid or shipped status) for any variant of the product
- There are no pending cancellation or refund requests for any variant of the product

WHEN a seller deletes a product under valid conditions, THE system SHALL:
- Remove the product from search and category listings
- Delete all variants and inventory records associated with the product
- Preserve all order history and snapshots referencing the product

### Product Images

THE seller SHALL be able to upload multiple images for each product.

THE system SHALL maintain the order of product images, with the first image designated as the main/thumbnail image.

THE seller SHALL be able to reorder product images.

THE seller SHALL be able to delete images from their products.

WHEN a seller modifies product images, THE system SHALL include these changes in the product snapshot.

### Product Variants (SKU)

THE seller SHALL be able to create multiple variants for a single product.

WHEN a seller creates a product variant, THE system SHALL require:
- SKU code (unique identifier, required)
- Option values (e.g., color: "Red", size: "Large", required)
- Price (can override the base price, optional)
- Stock quantity (required, starts at 0)

THE seller SHALL be able to edit existing product variants.

WHEN a seller updates a variant, THE system SHALL:
- Save the updated information
- Create a snapshot of the previous variant state

THE seller SHALL be able to delete product variants ONLY IF:
- There are no pending order items (paid or shipped status) for that variant
- There are no pending cancellation or refund requests for that variant

THE product SHALL require at least one variant to be purchasable.

WHEN a product has no variants, THE system SHALL display it as "unavailable" in listings.

### Product Search and Browsing

THE customer SHALL be able to search products by name.

WHEN a customer performs a product search, THE system SHALL return results from all sellers.

THE search results SHALL be paginated with configurable page size.

THE customer SHALL be able to filter search results by:
- Category
- Price range (minimum and maximum)
- In-stock status only

THE customer SHALL be able to sort search results by:
- Newest first
- Price (low to high)
- Price (high to low)

WHEN a customer browses products in a category, THE system SHALL display products within that category and its subcategories.

### Product Display

WHEN displaying a product in a list (search results, category page), THE system SHALL show:
- Main image (thumbnail)
- Product name
- Base price (or price range if variants have different prices)
- Seller shop name
- Average rating (if reviews exist)

WHEN a customer views a single product's detail page, THE system SHALL display:
- All product images
- Product name and description
- Category information
- Seller shop name (with link to seller profile)
- All available variants with prices and stock status
- Average rating and total review count
- All reviews for the product

## Shopping and Order Management

### Wishlist Management

THE customer SHALL be able to add products to their wishlist.

THE customer SHALL be able to view their wishlist with pagination support.

THE wishlist SHALL display products (not specific variants).

THE customer SHALL be able to remove products from their wishlist.

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customer wishlists.

### Shopping Cart Operations

THE customer SHALL be able to add specific product variants to their cart.

WHEN a customer adds a variant to cart, THE system SHALL require quantity specification.

IF the same variant is already in the cart, THEN THE system SHALL combine the quantities into a single line item.

THE customer SHALL be able to view their cart contents.

WHEN displaying cart items, THE system SHALL show:
- Product name
- Variant options
- Price
- Quantity
- Subtotal for the item

THE customer SHALL be able to modify the quantity of items in their cart.

THE customer SHALL be able to remove items from their cart.

THE cart SHALL display the total price of all items.

### Cart Validation

WHEN a customer views their cart, THE system SHALL validate each item against current stock levels.

IF a variant's stock is less than the cart quantity, THEN THE system SHALL display a warning to the customer.

IF a variant is deleted or out of stock, THEN THE system SHALL mark that item as unavailable in the cart.

WHEN a customer attempts to checkout, THE system SHALL prevent unavailable items from being purchased.

### Checkout Process

THE customer SHALL be able to proceed to checkout from their cart.

WHEN starting checkout, THE system SHALL require the customer to select a shipping address.

THE customer SHALL be able to use their default shipping address or select an alternative.

THE customer SHALL be able to review a complete order summary before placing the order.

WHEN displaying the order summary, THE system SHALL show:
- List of items with prices
- Selected shipping address
- Total price

THE customer SHALL confirm the order to place it.

WHEN a customer places an order, THE system SHALL prevent any changes to the shipping address.

## Payment and Order Processing

### Payment Integration

AFTER the customer reviews their order, THE system SHALL process payment through an external payment gateway.

THE payment processing SHALL support standard payment methods including credit cards and digital wallets.

WHEN payment processing begins, THE system SHALL create a temporary payment record.

IF payment fails, THEN THE system SHALL:
- Display an error message to the customer
- Allow the customer to retry payment
- Not create an order record

IF payment succeeds, THEN THE system SHALL proceed to order creation.

### Order Creation Workflow

WHEN payment succeeds, THE system SHALL create a new order record.

THE system SHALL decrease stock quantities for each purchased variant.

THE system SHALL remove purchased items from the customer's cart.

WHEN creating the order, THE system SHALL generate individual order items for each variant purchased with appropriate quantities.

IF a customer buys 3 of the same variant, THEN THE system SHALL create one order item with quantity 3.

THE system SHALL create order items with status "paid" upon successful payment.

THE system SHALL preserve the state of products, variants, and seller profiles at the time of purchase by creating snapshots.

WHEN creating snapshots for order items, THE system SHALL:
- Save a complete product snapshot with all fields and images
- Save a variant snapshot with SKU code, option values, and price
- Save a seller profile snapshot with shop name and logo

### Order Structure

THE order SHALL contain one or more order items.

THE order items MAY be from different sellers within the same order.

Each order item SHALL represent a purchased product variant with its specific quantity.

THE order SHALL maintain an overall status derived from its items.

### Order Item Status Management

THE order item SHALL support the following statuses:
- Paid: payment completed, waiting for seller to ship
- Shipped: seller has shipped the item
- Delivered: item has been delivered
- Cancelled: item was cancelled
- Refunded: item was refunded

THE order status SHALL be calculated from its items as follows:
- IF all items are paid → order status is "paid"
- IF any item is shipped (and none delivered yet) → order status is "shipped"
- IF all items are delivered → order status is "delivered"
- IF all items are cancelled → order status is "cancelled"
- IF all items are refunded → order status is "refunded"
- IF items have mixed states → order status is "partially completed"

### Order History

THE customer SHALL be able to view a list of all their orders.

WHEN displaying the order list, THE system SHALL:
- Paginate the results
- Sort by newest first
- Show each order with:
  - Order number
  - Date
  - Total price
  - Overall order status

THE customer SHALL be able to view complete details of an individual order.

WHEN displaying order details, THE system SHALL show:
- List of items with product name, variant, quantity, price, and item status
- Shipping address
- List of shipments with tracking information showing which items are included

## Inventory and Variant Management

### Inventory Tracking

THE system SHALL maintain stock quantity for each product variant.

THE stock quantity SHALL be calculated by summing all inventory records.

THE system SHALL create inventory history records for all stock changes.

Each inventory record SHALL contain:
- Quantity change (positive for restocking, negative for orders/adjustments)
- Reason for change
- Timestamp of the change

### Inventory Operations

THE seller SHALL be able to add inventory (restock) for their variants.

WHEN a seller restocks inventory, THE system SHALL require:
- Quantity to add
- Reason for restocking

THE seller SHALL be able to subtract inventory (adjustment/loss) for their variants.

WHEN a seller reduces inventory, THE system SHALL require:
- Quantity to subtract
- Reason for adjustment

WHEN an order is placed successfully, THE system SHALL automatically create negative inventory records for purchased items.

WHEN an order item is cancelled or refunded, THE system SHALL automatically create positive inventory records to restore stock.

### Stock Level Management

THE seller SHALL be able to view the complete inventory history for each of their variants.

WHEN stock quantity reaches 0 for a variant, THE system SHALL display it as "out of stock".

WHEN a variant is out of stock, THE system SHALL prevent customers from adding it to their cart.

## Shipping and Tracking Management

### Shipment Concept

THE platform SHALL organize package delivery through the shipment system.

A shipment SHALL represent a package sent by a single seller.

A shipment SHALL contain one or more order items from the same seller.

THE system SHALL require different sellers to ship items in separate shipments.

A seller SHALL be able to choose to ship items individually or bundle multiple items into one shipment.

### Shipping Process

THE seller SHALL be able to view order items requiring shipping for their products.

WHEN shipping items, THE seller SHALL select one or more of their items to include in a shipment.

THE seller SHALL enter tracking information for each shipment including:
- Carrier name
- Tracking number

THE system SHALL require all items in the same shipment to share the same tracking information.

WHEN a seller creates a shipment, THE system SHALL:
- Update all included items to status "shipped"
- Associate the tracking information with the shipment
- Notify the customer of shipment creation and tracking details

### Delivery Confirmation

THE customer SHALL be able to view tracking information for each shipment.

THE customer SHALL be able to confirm delivery for each shipment (not per item).

WHEN a customer confirms delivery of a shipment, THE system SHALL update all items in that shipment to status "delivered".

IF a customer does not confirm delivery, THEN THE system SHALL automatically update items to "delivered" status 14 days after shipping.

## Cancellation and Refund System

### Cancellation Request Process

THE customer SHALL be able to request cancellation for individual order items.

THE system SHALL only allow cancellation requests for items with status "paid" (not yet shipped).

WHEN a customer submits a cancellation request, THE system SHALL require a reason (text).

THE seller SHALL be notified of cancellation requests for their items.

THE seller of the item SHALL be able to approve or reject the cancellation request.

WHEN a seller responds to a cancellation request, THE system SHALL create a snapshot of the request state.

IF a seller approves a cancellation request, THEN THE system SHALL:
- Update the item status to "cancelled"
- Process a refund for that item only
- Restore stock quantities through inventory records
- Notify the customer of approval

IF a seller rejects a cancellation request, THEN THE system SHALL:
- Maintain the item's "paid" status
- Notify the customer of rejection with reason

THE remaining items in an order SHALL continue normal processing when some items are cancelled.

IF all items in an order are cancelled, THEN THE system SHALL update the overall order status to "cancelled".

### Refund Request Workflow

THE customer SHALL be able to request a refund for individual order items.

THE system SHALL only allow refund requests for items with status "delivered".

THE customer SHALL be able to request a refund within 7 days of item delivery.

WHEN a customer submits a refund request, THE system SHALL require a reason (text).

THE seller SHALL be notified of refund requests for their items.

THE seller of the item SHALL be able to approve or reject the refund request.

WHEN a seller responds to a refund request, THE system SHALL create a snapshot of the request state.

IF a seller approves a refund request, THEN THE system SHALL:
- Update the item status to "refunded"
- Process a refund for that item
- Restore stock quantities through inventory records
- Notify the customer of approval

IF a seller rejects a refund request, THEN THE system SHALL:
- Maintain the item's "delivered" status
- Notify the customer of rejection with reason

THE remaining items in an order SHALL be unaffected when some items are refunded.

IF all items in an order are refunded, THEN THE system SHALL update the overall order status to "refunded".

## Reviews and Ratings System

### Review Creation

THE customer SHALL be able to write a review for products they have purchased.

THE system SHALL only allow reviews for items with status "delivered".

THE customer SHALL be able to write one review per product per order.

WHEN a customer submits a review, THE system SHALL require:
- Rating (1 to 5 stars, required)
- Text content (optional)

### Review Display

THE system SHALL display reviews on the product detail page.

WHEN displaying reviews, THE system SHALL sort them by newest first.

THE product's average rating SHALL be calculated from all non-deleted reviews.

### Review Management

THE customer SHALL be able to edit their own reviews.

WHEN a customer edits a review, THE system SHALL:
- Save the updated review
- Create a snapshot of the previous review state

THE customer SHALL be able to delete their own reviews.

WHEN a customer deletes a review, THE system SHALL:
- Mark the review as deleted
- Display it as "deleted user" in public views
- Preserve the snapshot history for audit purposes

## Seller Dashboard and Analytics

### Dashboard Metrics

WHEN a seller logs into the platform, THE system SHALL present a dashboard summary including:
- Total number of products listed by the seller
- Total number of order items associated with the seller's products
- Number of pending cancellation requests requiring seller response
- Number of pending refund requests requiring seller response

THE seller dashboard SHALL update these metrics in real-time as new orders, cancellations, and refunds occur.

### Order Item Management

THE seller dashboard SHALL provide access to a comprehensive list of all order items for the seller's products.

WHEN a seller accesses their order items list, THE system SHALL display:
- Product name and variant information for each item
- Order date and order number
- Customer shipping address (anonymized for privacy)
- Quantity ordered and item price
- Current status of the order item (paid, shipped, delivered, cancelled, refunded)
- Associated shipment information (when applicable)

THE seller SHALL be able to filter the order items list by status using the following options:
- All items
- Paid (awaiting shipment)
- Shipped (in transit)
- Delivered (completed)
- Cancelled (cancelled by customer)
- Refunded (refunded to customer)

### Cancellation and Refund Processing

WHEN a customer submits a cancellation request for an item from the seller, THE system SHALL notify the seller through the dashboard.

THE seller dashboard SHALL display a dedicated section for pending cancellation requests.

WHEN a seller views a cancellation request, THE system SHALL present:
- Reason provided by the customer for cancellation
- Order item details (product, variant, quantity, price)
- Date the request was submitted
- Current status of the request (pending seller response)

THE seller SHALL be able to approve or reject a cancellation request.

WHEN a customer submits a refund request for a delivered item, THE system SHALL notify the seller through the dashboard.

THE seller dashboard SHALL display a dedicated section for pending refund requests.

WHEN a seller views a refund request, THE system SHALL present:
- Reason provided by the customer for the refund
- Order item details (product, variant, quantity, price)
- Date the item was delivered
- Date the request was submitted
- Current status of the request (pending seller response)

### Product Performance Analytics

THE seller dashboard SHALL provide basic analytics on product performance.

WHEN a seller accesses the analytics section, THE system SHALL display:
- Best-selling products based on order volume and revenue
- Products with the highest review ratings
- Products with the most wishlist additions
- Inventory level warnings for low-stock items
- Cancellation and refund rates per product

## Administrative System

### Administrator Management

THE platform SHALL support two grades of administrators: regular and super administrators.

ANY user (customer or seller) SHALL be able to submit a request to become an administrator.

WHEN a user submits an administrator request, THE system SHALL require a reason (text).

Super administrators SHALL be able to view the list of pending administrator requests.

Super administrators SHALL be able to approve or reject administrator requests.

WHEN a super administrator approves a request, THE user SHALL become a regular administrator.

Super administrators SHALL be able to promote regular administrators to super administrator.

Super administrators SHALL be able to demote other super administrators to regular administrator.

Super administrators SHALL NOT be able to demote themselves.

### Seller Registration Management

THE administrator SHALL be able to view the list of pending seller registrations.

THE administrator SHALL be able to approve or reject seller registrations.

WHEN rejecting a seller registration, THE administrator SHALL provide a reason.

Rejected sellers SHALL be able to submit a new registration request.

THE administrator SHALL be able to suspend seller accounts.

WHEN a seller is suspended, THE system SHALL:
- Hide their products from search and category listings
- Prevent their products from being purchased
- Allow them to process existing orders
- Prevent them from creating new products or editing existing products

THE administrator SHALL be able to unsuspend seller accounts.

WHEN a seller account is unsuspended, THE system SHALL make their products visible again.

### Category Administration

THE administrator SHALL be able to create categories and subcategories.

THE administrator SHALL be able to edit category names and descriptions.

THE administrator SHALL be able to delete categories.

WHEN an administrator deletes a category, THE system SHALL make products in that category uncategorized.

### Product Oversight

THE administrator SHALL be able to view all products on the platform.

THE administrator SHALL be able to view snapshots of any product.

THE administrator SHALL be able to delete any product for policy violations.

### Order and User Management

THE administrator SHALL be able to view all orders on the platform.

THE administrator SHALL be able to force-cancel individual items or entire orders.

THE administrator SHALL be able to force-refund individual items or entire orders.

THE administrator SHALL be able to view all customer accounts.

THE administrator SHALL be able to ban customers.

WHEN a customer is banned, THE system SHALL prevent them from logging in.

THE administrator SHALL be able to unban customers.

THE administrator SHALL be able to view all seller accounts.

THE administrator SHALL be able to ban sellers.

WHEN a seller is banned, THE system SHALL prevent them from logging in while preserving existing orders.

## Data Snapshots and Audit Trail

### Snapshot Principles

THE platform SHALL create immutable snapshots of all data modifications for legal compliance and dispute resolution.

WHEN any editable data is modified, THE system SHALL create a snapshot to preserve the previous state.

THE snapshot SHALL record:
- Timestamp of the change
- What was changed
- Values before and after the change

THE system SHALL prevent deletion of snapshots.

THE system SHALL allow relevant parties to view snapshots for dispute resolution.

### Product and Variant Snapshots

WHEN a product is edited, THE system SHALL create a product snapshot including:
- All product fields (name, description, category, base price, images)
- Snapshots of all variants at that moment

WHEN a variant is edited, THE system SHALL create a variant snapshot including:
- SKU code
- Option values
- Price

### Profile and Order Snapshots

WHEN a seller updates their profile, THE system SHALL create a seller profile snapshot including:
- Shop name
- Description
- Logo image

WHEN an order is created, THE system SHALL create snapshots of:
- Each purchased product and variant at time of purchase
- Each seller's profile at time of purchase

### Request Snapshots

WHEN a cancellation or refund request is processed, THE system SHALL create snapshots of:
- Request state at each processing step
- Approvals or rejections with reasons

### Snapshot Access Control

THE owner of data SHALL be able to view snapshots of their own data.

THE administrator SHALL be able to view snapshots of any data.

THE system SHALL preserve all snapshots even after data deletion.

