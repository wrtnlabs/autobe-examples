# E-Commerce Shopping Mall Platform

## 1. Overview

### 1.1 Service Vision

The E-Commerce Shopping Mall Platform is a comprehensive marketplace system that connects customers, sellers, and administrators in a seamless online shopping experience. The platform enables multiple sellers to list products, customers to browse and purchase items, and administrators to ensure smooth operation and policy compliance.

### 1.2 Target Users

- **Customers**: Individual shoppers seeking products from various sellers
- **Sellers**: Businesses and individuals managing their own product listings and inventory
- **Administrators**: System operators ensuring platform integrity, seller approval, and policy enforcement
- **Super Administrators**: High-level system managers with complete oversight capabilities

### 1.3 Core Features

- Customer account registration and profile management
- Seller registration with approval workflow
- Product creation, management, and categorization
- Complex inventory tracking with stock history
- Multi-item order processing with flexible shipping
- Multi-stage payment and refund handling
- Review and rating system for products
- Customer wishlist functionality
- Advanced search and filtering capabilities
- Comprehensive administrator tools for oversight

### 1.4 Business Model

The platform operates on a commission-based model where:

- **Sellers** pay listing fees and/or transaction commissions
- **Customers** pay for products and shipping (fees vary by seller)
- **Administrators** ensure platform security and compliance
- **No guest browsing** – all users must register to access features

### 1.5 Success Metrics

- Number of active sellers and products
- Monthly transaction volume and revenue
- Customer retention rate and repeat purchase frequency
- Average order value and cart abandonment rate
- Seller satisfaction and growth rate
- Platform security incidents and resolution time

## 2. Functional Requirements

### 2.1 Customer Account Management

#### 2.1.1 Registration

**WHEN** a customer visits the platform for the first time,
**THEN** they are required to register an account before accessing any features.

**WHEN** a customer registers,
**THEY** must provide their email address and create a password.

**THE** registration process creates a customer account with the following initial profile information:
- Display name (optional, defaults to email prefix)
- Phone number (optional)
- Default address set (initially empty)

**WHEN** registration is successful,
**THEN** the customer is automatically logged in and can access customer features.

**WHEN** registration fails (e.g., email already exists),
**THEN** the customer receives a clear error message explaining the issue.

#### 2.1.2 Login

**WHEN** an existing customer returns to the platform,
**THEN** they must log in using their email and password.

**WHEN** login credentials are valid,
**THEN** the customer is authenticated and granted access to their account.

**WHEN** login credentials are invalid,
**THEN** the customer receives an appropriate error message (credentials incorrect).

**WHEN** a customer account has been deleted,
**THEN** login attempts with those credentials are rejected.

#### 2.1.3 Account Deletion

**WHEN** a customer requests account deletion,
**THEY** must confirm the deletion action (two-step process to prevent accidental deletion).

**WHEN** account deletion is processed,
**THEN** the following data is permanently removed:
- Customer profile information (display name, phone number, etc.)
- All shipping addresses associated with the account
- Wishlist entries
- Active cart items

**WHEN** account deletion is processed,
**THEN** the following data is preserved (not deleted):
- All order history and order snapshots (for seller records and legal compliance)
- All reviews (but displayed as "deleted user" instead of the customer's name)
- Any pending cancellation or refund requests (for audit trail)

**WHEN** account deletion is complete,
**THEN** the customer is logged out and cannot log in again with those credentials.

**WHEN** a customer attempts to delete an account that has pending orders (paid or shipped status),
**THEN** the deletion is blocked and the customer receives a message explaining why.

#### 2.1.4 Password Management

**WHEN** a customer wants to change their password,
**THEN** they must provide their current password for verification.

**WHEN** the current password is verified,
**THEN** the customer can set a new password meeting security requirements.

**WHEN** password change is successful,
**THEN** the customer receives confirmation and the change is logged.

**WHEN** a customer forgets their password,
**THEN** they can request a password reset via email verification.

**WHEN** password reset is requested,
**THEN** a secure reset link is sent to the customer's registered email address.

**WHEN** the reset link is used,
**THEN** the customer can set a new password without providing the current one.

#### 2.1.5 Profile Management

**WHEN** a customer views their profile,
**THEN** they can see their current display name and phone number.

**WHEN** a customer edits their profile,
**THEY** can update their display name and phone number.

**WHEN** profile information is updated,
**THEN** the changes are saved and immediately reflected across the platform.

**WHEN** a customer updates their profile information,
**THEN** a snapshot is created preserving the previous state.

### 2.2 Address Management

#### 2.2.1 Address Creation

**WHEN** a customer adds a new shipping address,
**THEY** must provide the following information:
- Recipient name
- Phone number
- Street address
- City
- State/Province
- Postal code
- Country

**WHEN** an address is successfully added,
**THEN** it appears in the customer's address list.

**WHEN** a customer adds their first address,
**THEN** it automatically becomes the default shipping address.

#### 2.2.2 Address Listing and Selection

**WHEN** a customer views their addresses,
**THEN** they can see a list of all their saved addresses.

**WHEN** viewing the address list,
**THEN** the default shipping address is clearly marked.

**WHEN** a customer selects an address for checkout,
**THEN** they can choose from their saved addresses or use the default.

**WHEN** a customer selects a non-default address,
**THEN** it becomes the temporary shipping address for that order.

#### 2.2.3 Address Editing

**WHEN** a customer edits an existing address,
**THEN** they can modify any of the address fields.

**WHEN** address editing is successful,
**THEN** the changes are saved and a snapshot is created.

**WHEN** a customer edits their default shipping address,
**THEN** the default status is preserved unless explicitly changed.

#### 2.2.4 Address Deletion

**WHEN** a customer deletes an address,
**THEN** the address is removed from their address list.

**WHEN** a customer deletes their default shipping address,
**THEN** another address is automatically promoted to default status.

**WHEN** a customer attempts to delete an address that is set as the shipping address for a pending order,
**THEN** the deletion is blocked and the customer receives a message explaining why.

### 2.3 Seller Account Management

#### 2.3.1 Registration

**WHEN** an individual or business wants to sell on the platform,
**THEN** they can register as a seller with their email and password.

**WHEN** seller registration is completed,
**THEN** the seller account is created with "pending" approval status.

**WHEN** a seller registers,
**THEY** can provide initial shop information (shop name, description, logo).

**WHEN** a seller registers,
**THEN** they can view their account approval status.

#### 2.3.2 Approval Process

**WHEN** a seller's approval status is "pending",
**THEN** they can view their pending status but cannot sell products yet.

**WHEN** a seller is approved by an administrator,
**THEN** they gain full seller privileges to list products and manage their shop.

**WHEN** a seller is rejected by an administrator,
**THEN** they receive the rejection reason provided by the administrator.

**WHEN** a seller is rejected,
**THEN** they can submit a new registration request with updated information.

**WHEN** a seller's approval status is changed,
**THEN** they receive a notification about the status change.

#### 2.3.3 Account Management

**WHEN** a seller wants to change their password,
**THEN** they can follow the same password management flow as customers.

**WHEN** a seller views their profile,
**THEN** they can see their current shop name, description, and logo.

**WHEN** a seller wants to delete their account,
**THEN** they can only proceed if:
- They have no pending orders (orders with "paid" or "shipped" status)
- They have no pending cancellation or refund requests

**WHEN** a seller's account deletion meets all requirements,
**THEN** the following data is permanently removed:
- Seller profile information (shop name, description, logo)
- All products and variants owned by the seller
- All inventory records for the seller's products

**WHEN** a seller's account deletion is processed,
**THEN** the following data is preserved:
- Order history and order snapshots (for customer records and legal compliance)
- Shop name and logo in past orders (preserved as historical reference)
- All product snapshots created during the seller's account lifetime

**WHEN** a seller attempts to delete an account that doesn't meet requirements,
**THEN** the deletion is blocked and the seller receives a message explaining why.

#### 2.3.4 Profile Management

**WHEN** a seller views their shop profile,
**THEN** they can see their shop name, description, and logo.

**WHEN** a seller edits their shop profile,
**THEY** can update their shop name, description, and logo.

**WHEN** shop profile information is updated,
**THEN** a snapshot is created preserving the previous state.

**WHEN** shop profile information is updated,
**THEN** the changes are immediately visible to customers.

### 2.4 Category Management

#### 2.4.1 Category Structure

**CATEGORIES** are organized in a two-level hierarchy:
- **Level 1**: Top-level categories (e.g., "Electronics", "Clothing", "Home")
- **Level 2**: Subcategories nested under top-level categories (e.g., "Smartphones" under "Electronics")

**CATEGORIES** can have at most one level of nesting (no deeper hierarchy).

**CATEGORIES** are created and managed exclusively by administrators.

#### 2.4.2 Category Information

**EACH** category has the following information:
- Name (required, unique within its level)
- Description (optional but recommended)

**EACH** category can have multiple subcategories.

**EACH** subcategory belongs to exactly one parent category.

#### 2.4.3 Category Operations

**WHEN** a customer views the list of all categories,
**THEN** they can see the complete category hierarchy.

**WHEN** a customer views a category,
**THEN** they can see:
- The category name and description
- All subcategories
- Products in that category (including products in subcategories)

**WHEN** a customer views a subcategory,
**THEN** they can navigate to its parent category.

**WHEN** an administrator creates a category,
**THEN** they can specify the parent category (or leave blank for top-level).

**WHEN** an administrator edits a category,
**THEN** they can update the name and description.

**WHEN** an administrator deletes a category,
**THEN** products in that category become uncategorized unless they have other categories assigned.

### 2.5 Product Management

#### 2.5.1 Product Creation

**WHEN** a seller creates a product,
**THEY** must provide the following required information:
- Name (required, minimum 1 character, maximum 200 characters)
- Description (required, minimum 10 characters, maximum 5,000 characters)
- Category (required, must be a valid category ID)
- Base price (required, must be positive, maximum 2 decimal places)

**WHEN** a seller creates a product,
**THEY** can optionally provide:
- Product images (at least one image recommended)
- Product variants (at least one variant required for purchasable products)

**WHEN** a product is created,
**THEN** it is associated with the seller who created it.

**WHEN** a product is created,
**THEN** it appears in the seller's product list but is not visible to customers.

**WHEN** a product is created with at least one variant,
**THEN** the product can be purchased by customers.

**WHEN** a product is created without any variants,
**THEN** the product is visible in search but shown as "unavailable".

#### 2.5.2 Product Listing

**WHEN** a customer views the product list (search results, category page),
**THEN** each product displays:
- Main image (thumbnail from the first uploaded image)
- Product name
- Base price (or price range if variants have different prices)
- Seller shop name (linked to seller profile)
- Average rating (if reviews exist)

**WHEN** a product has variants with different prices,
**THEN** the price range is displayed (e.g., "$10 - $25").

**WHEN** a product has no available variants (all out of stock or deleted),
**THEN** it is shown as "out of stock" or "unavailable".

**WHEN** a product is deleted by its seller,
**THEN** it is removed from search results and category listings.

#### 2.5.3 Product Editing

**WHEN** a seller edits their product,
**THEY** can modify any of the editable fields:
- Name
- Description
- Category
- Base price
- Product images (add, remove, reorder)

**WHEN** a seller edits a product,
**THEN** the changes are saved and a product snapshot is created.

**WHEN** a product snapshot is created,
**THEN** it includes all product fields at the time of editing.

**WHEN** a product has variants and is edited,
**THEN** existing variants are also snapshotted if their information changes.

#### 2.5.4 Product Deletion

**WHEN** a seller deletes their product,
**THEN** the following data is permanently removed:
- Product information
- All variants associated with the product
- All inventory records for the product variants

**WHEN** a seller attempts to delete a product,
**THEN** the deletion is blocked if:
- Any variant has pending order items (status "paid" or "shipped")
- Any variant has pending cancellation requests
- Any variant has pending refund requests

**WHEN** product deletion is blocked,
**THEN** the seller receives a message explaining which items prevent deletion.

**WHEN** a product is deleted,
**THEN** it is removed from all customer wishlists.

**WHEN** a product is deleted,
**THEN** past orders and snapshots are preserved for historical reference.

#### 2.5.5 Product Snapshots

**WHEN** a product is edited,
**THEN** a product snapshot is automatically created.

**EACH** product snapshot includes:
- Product name, description, category
- Base price at the time of editing
- All product images (with order preserved)
- All variant information at that moment

**WHEN** a variant is edited,
**THEN** a variant snapshot is created as part of the product snapshot.

**EACH** variant snapshot includes:
- SKU code
- Option values (color, size, etc.)
- Price (variant price or null if using base price)
- Stock quantity at that moment

**WHEN** a product is deleted,
**THEN** all associated product snapshots are preserved.

**WHEN** an administrator or seller views product snapshots,
**THEN** they can see the complete history of changes.

### 2.6 Product Images

#### 2.6.1 Image Management

**WHEN** a seller uploads images for a product,
**THEY** can upload multiple images (recommended maximum 10).

**WHEN** images are uploaded,
**THEN** they are associated with the product.

**WHEN** a seller sets the first uploaded image,
**THEN** it becomes the main thumbnail for product listings.

#### 2.6.2 Image Reordering

**WHEN** a seller reorders product images,
**THEN** the first image in the reordered list becomes the main thumbnail.

**WHEN** image order is changed,
**THEN** a product snapshot is created if other product edits are made.

#### 2.6.3 Image Deletion

**WHEN** a seller deletes a product image,
**THEN** the image is removed from the product.

**WHEN** the main thumbnail is deleted,
**THEN** the next image in the list automatically becomes the main thumbnail.

**WHEN** image deletion is successful,
**THEN** a product snapshot is created.

### 2.7 Product Variants (SKU)

#### 2.7.1 Variant Creation

**WHEN** a seller adds variants to a product,
**THEY** must create at least one variant for the product to be purchasable.

**EACH** variant must have:
- SKU code (required, unique identifier, maximum 50 characters)
- Option values (e.g., "Red", "Large" for color/size combinations)
- Stock quantity (required, must be non-negative integer)

**WHEN** option values are specified,
**THEY** must represent a valid combination of the product's defined options.

**WHEN** a variant is created,
**THEN** it is associated with the parent product.

#### 2.7.2 Variant Pricing

**EACH** variant has a price field that can either:
- Use the product's base price (default behavior)
- Override the base price with a specific variant price

**WHEN** a variant uses the base price,
**THEN** the price is automatically updated when the base price changes.

**WHEN** a variant overrides the base price,
**THEN** the variant price remains fixed regardless of base price changes.

**WHEN** a product has variants with different prices,
**THEN** the price range is displayed in product listings.

#### 2.7.3 Variant Editing

**WHEN** a seller edits a variant,
**THEY** can modify:
- SKU code
- Option values
- Variant price (add, remove, or change price)

**WHEN** a variant is edited,
**THEN** a variant snapshot is created as part of the product snapshot.

**WHEN** a variant's stock quantity is changed via inventory operations,
**THEN** a stock inventory record is created (not a variant snapshot).

#### 2.7.4 Variant Deletion

**WHEN** a seller deletes a variant,
**THEN** the variant is removed from the product.

**WHEN** a seller attempts to delete a variant,
**THEN** the deletion is blocked if:
- Any order item has this variant with status "paid" or "shipped"
- Any cancellation request exists for this variant
- Any refund request exists for this variant

**WHEN** variant deletion is blocked,
**THEN** the seller receives a message explaining which orders prevent deletion.

**WHEN** a product's last variant is deleted,
**THEN** the product becomes "unavailable" for purchase.

### 2.8 Inventory Management

#### 2.8.1 Stock Tracking

**EACH** product variant has a stock quantity that tracks available units.

**CURRENT** stock is calculated by summing all inventory records for the variant.

**WHEN** stock quantity reaches 0,
**THEN** the variant is shown as "out of stock".

**WHEN** a variant is out of stock,
**THEN** it cannot be added to the customer's cart.

#### 2.8.2 Inventory Records

**EACH** inventory record contains:
- Quantity change (positive for restocking, negative for orders/adjustments)
- Reason for the change (e.g., "order", "restock", "adjustment")
- Timestamp of the change
- Associated order ID (if applicable)

**WHEN** inventory records are created,
**THEN** they are preserved permanently for audit purposes.

**WHEN** a seller views inventory history for a variant,
**THEN** they can see all inventory records with full details.

#### 2.8.3 Stock Addition (Restocking)

**WHEN** a seller adds stock to a variant,
**THEY** must specify:
- Quantity to add (positive integer)
- Reason for restocking (e.g., "supplier shipment", "return from customer")

**WHEN** stock is successfully added,
**THEN** a positive inventory record is created and stock quantity increases.

#### 2.8.4 Stock Subtraction (Adjustment/Loss)

**WHEN** a seller subtracts stock from a variant,
**THEY** must specify:
- Quantity to subtract (positive integer)
- Reason for subtraction (e.g., "damage", "loss", "breakage")

**WHEN** stock is successfully subtracted,
**THEN** a negative inventory record is created and stock quantity decreases.

**WHEN** stock subtraction causes stock to go negative,
**THEN** the operation is blocked and the seller receives an error message.

#### 2.8.5 Stock Deduction (Order Placement)

**WHEN** an order is placed successfully,
**THEN** stock quantities are automatically decreased for each purchased variant.

**WHEN** stock deduction is processed,
**THEN** a negative inventory record is created with reason "order".

#### 2.8.6 Stock Restoration (Order Cancellation/Refund)

**WHEN** an order item is cancelled,
**THEN** the stock quantity is restored for the purchased variant.

**WHEN** stock is restored due to cancellation,
**THEN** a positive inventory record is created with reason "order cancellation".

**WHEN** an order item is refunded,
**THEN** the stock quantity is restored for the purchased variant.

**WHEN** stock is restored due to refund,
**THEN** a positive inventory record is created with reason "refund".

### 2.9 Product Search

#### 2.9.1 Search Functionality

**WHEN** a customer searches for products,
**THEY** can search by product name (partial matches allowed).

**WHEN** search results are displayed,
**THEN** they show products from all sellers (cross-seller search).

**WHEN** search results are displayed,
**THEN** they are paginated (20 products per page by default).

**WHEN** a customer views search results,
**THEN** they can see basic product information as described in product listing requirements.

#### 2.9.2 Search Filters

**WHEN** a customer searches products,
**THEY** can apply the following filters:
- **Category filter**: Show only products in specific category (including subcategories)
- **Price range filter**: Set minimum and maximum price limits
- **In-stock filter**: Show only products with available stock

**WHEN** multiple filters are applied,
**THEN** results are combined (logical AND operation).

**WHEN** filters are applied,
**THEN** the filter state is preserved when navigating pages.

#### 2.9.3 Search Sorting

**WHEN** search results are displayed,
**THEY** can be sorted by the following options:
- **Newest first**: Sort by product creation date, newest first
- **Price (low to high)**: Sort by price ascending
- **Price (high to low)**: Sort by price descending

**WHEN** no sort order is specified,
**THEN** results are sorted by relevance (search term matching and recency).

### 2.10 Product Detail Page

#### 2.10.1 Product Information Display

**WHEN** a customer views a product detail page,
**THEN** the page displays:
- All product images (gallery or carousel format)
- Product name and description
- Category information (linked to category page)
- Seller shop name (linked to seller profile page)
- Price information (base price or price range for variants)

#### 2.10.2 Variant Selection

**WHEN** a customer views a product detail page,
**THEN** they can see all available variants with:
- Variant option values (e.g., "Red / Large")
- Price for that variant
- Stock quantity and status ("In Stock", "Limited Stock", "Out of Stock")

**WHEN** a customer selects a variant,
**THEN** the price updates to show that variant's specific price.

**WHEN** a customer selects an out-of-stock variant,
**THEN** they cannot add it to the cart.

#### 2.10.3 Rating and Reviews

**WHEN** a customer views a product detail page,
**THEN** they can see:
- Average rating (calculated from all non-deleted reviews)
- Total review count
- Option to view all reviews

**WHEN** reviews are displayed,
**THEN** they are sorted by newest first.

**WHEN** a customer views a review,
**THEN** they can see:
- Reviewer name (or "Deleted User" for deleted accounts)
- Rating (1-5 stars)
- Review text (if provided)
- Review date

### 2.11 Wishlist Management

#### 2.11.1 Wishlist Creation and Viewing

**WHEN** a customer adds a product to their wishlist,
**THEN** the product is added to their wishlist.

**WHEN** a customer views their wishlist,
**THEN** they can see all products they've added.

**WHEN** a wishlist is displayed,
**THEN** it is paginated (20 products per page by default).

**WHEN** a wishlist product is displayed,
**THEN** it shows:
- Product name
- Main image
- Base price (or price range)
- Seller shop name
- Option to remove from wishlist

#### 2.11.2 Wishlist Operations

**WHEN** a customer removes a product from their wishlist,
**THEN** the product is removed from their wishlist.

**WHEN** a product is deleted by its seller,
**THEN** it is automatically removed from all customers' wishlists.

**WHEN** a customer views their wishlist,
**THEN** products that are out of stock or deleted are marked as unavailable.

### 2.12 Shopping Cart

#### 2.12.1 Cart Creation and Viewing

**WHEN** a customer adds a variant to their cart,
**THEY** must specify:
- Product variant (specific SKU, not just product)
- Quantity (positive integer)

**WHEN** a customer views their cart,
**THEN** they can see all items with:
- Product name
- Variant options (e.g., "Red / Large")
- Price per item
- Quantity
- Subtotal (price × quantity)

**WHEN** a customer views their cart,
**THEN** they can see the total price of all items.

**WHEN** a customer views their cart,
**THEN** the cart is paginated (20 items per page by default).

#### 2.12.2 Cart Operations

**WHEN** a customer adds the same variant to their cart,
**THEN** the quantities are combined (not added as separate line items).

**WHEN** a customer changes the quantity of an item in their cart,
**THEN** the quantity updates and subtotal recalculates.

**WHEN** a customer removes an item from their cart,
**THEN** the item is removed from the cart.

#### 2.12.3 Cart Validation

**WHEN** a variant's stock is less than the cart quantity,
**THEN** a warning is displayed ("Only X items available, reduce quantity").

**WHEN** a variant is out of stock,
**THEN** it is marked as unavailable in the cart.

**WHEN** a variant is deleted by the seller,
**THEN** it is marked as unavailable in the cart.

**WHEN** a customer attempts to proceed to checkout with unavailable items,
**THEN** they are prevented from checking out those items.

### 2.13 Checkout and Order Placement

#### 2.13.1 Checkout Process

**WHEN** a customer proceeds to checkout from their cart,
**THEN** they review the order summary including:
- List of items with prices and quantities
- Selected shipping address
- Total price

**WHEN** a customer selects a shipping address,
**THEN** they can choose from their saved addresses or use the default.

**WHEN** a customer views the order summary,
**THEN** they can confirm or cancel the checkout process.

#### 2.13.2 Order Placement

**WHEN** a customer confirms and places the order,
**THEN** payment is initiated through the external payment gateway.

**WHEN** payment processing fails,
**THEN** the order is not created and the customer can retry.

**WHEN** payment processing succeeds,
**THEN** the order is created with the following actions:
- Stock quantities are decreased for each purchased variant
- Cart items are removed for the purchased variants
- An order record is created
- Order items are created for each purchased variant

#### 2.13.3 Order Snapshots

**WHEN** an order is placed successfully,
**THEN** a snapshot of each purchased product is saved with the order item.

**WHEN** a product snapshot is saved,
**THEN** it preserves:
- Product name, description, category at time of purchase
- Base price at time of purchase
- All product images (in order) at time of purchase

**WHEN** an order is placed successfully,
**THEN** a snapshot of each purchased variant is saved with the order item.

**WHEN** a variant snapshot is saved,
**THEN** it preserves:
- SKU code at time of purchase
- Option values at time of purchase
- Price at time of purchase (variant price or base price)

**WHEN** an order is placed successfully,
**THEN** a snapshot of each seller's profile is saved with order items for that seller.

**WHEN** a seller profile snapshot is saved,
**THEN** it preserves:
- Shop name at time of purchase
- Shop logo at time of purchase

**WHEN** an order item is snapshotted,
**THEN** the snapshot is immutable and cannot be modified.

### 2.14 Order Structure and Management

#### 2.14.1 Order Creation

**WHEN** an order is placed successfully,
**THEN** it contains one or more order items.

**EACH** order item represents a purchased product variant with a quantity.

**WHEN** a customer buys multiple quantities of the same variant,
**THEN** it becomes one order item (not multiple items).

**WHEN** a customer buys products from multiple sellers,
**THEN** each seller's items become separate order items.

**WHEN** an order is created,
**THEN** each order item has its own status (initially "paid").

#### 2.14.2 Order History

**WHEN** a customer views their order history,
**THEN** they can see a list of all their orders.

**WHEN** orders are displayed,
**THEN** they are sorted by newest first.

**WHEN** an order is displayed in the list,
**THEN** it shows:
- Order number
- Order date
- Total price
- Overall order status

**WHEN** a customer views an order's full details,
**THEN** they can see:
- List of items with product name, variant, quantity, price, and status
- Shipping address used for the order
- List of shipments with tracking information

#### 2.14.3 Order Status

**EACH** order item has its own status:
- **Paid**: Payment completed, waiting for seller to ship
- **Shipped**: Seller has shipped the item
- **Delivered**: Item has been delivered
- **Cancelled**: Item was cancelled
- **Refunded**: Item was refunded

**THE** overall order status is derived from its items:
- If all items are paid → order is "paid"
- If any item is shipped (and none delivered yet) → order is "shipped"
- If all items are delivered → order is "delivered"
- If all items are cancelled → order is "cancelled"
- If all items are refunded → order is "refunded"
- If mixed states exist → order is "partially completed"

#### 2.14.4 Order Item Cancellation

**WHEN** a customer requests cancellation for an order item with status "paid",
**THEY** must provide a cancellation reason.

**WHEN** a cancellation request is submitted,
**THEN** the seller of that item receives a notification.

**WHEN** a seller responds to a cancellation request,
**THEN** a snapshot of the request state is created.

**WHEN** a cancellation request is approved,
**THEN** that item is cancelled and refund is processed.

**WHEN** stock is restored due to cancellation,
**THEN** a positive inventory record is created with reason "order cancellation".

**WHEN** some items in an order are cancelled but others continue,
**THEN** the remaining items process normally.

**WHEN** all items in an order are cancelled,
**THEN** the entire order status becomes "cancelled".

**WHEN** an order item has status "shipped", "delivered", "cancelled", or "refunded",
**THEN** cancellation is not possible.

#### 2.14.5 Order Item Refunds

**WHEN** a customer requests a refund for a delivered order item,
**THEY** must provide a refund reason.

**WHEN** a refund request is submitted,
**THEN** the seller of that item receives a notification.

**WHEN** a seller responds to a refund request,
**THEN** a snapshot of the request state is created.

**WHEN** a refund request is approved,
**THEN** that item is refunded and stock is restored.

**WHEN** stock is restored due to refund,
**THEN** a positive inventory record is created with reason "refund".

**WHEN** a refund request is within 7 days of delivery,
**THEN** it can be submitted.

**WHEN** a refund request is after 7 days of delivery,
**THEN** it is rejected (time limit enforcement).

**WHEN** some items in an order are refunded but others are delivered,
**THEN** the remaining items are unaffected.

**WHEN** all items in an order are refunded,
**THEN** the entire order status becomes "refunded".

### 2.15 Shipping and Tracking

#### 2.15.1 Shipment Concept

**A** shipment is a package sent by a seller.

**A** shipment can contain one or more order items from the same seller.

**Different** sellers always ship separately (different shipments).

**A** seller can choose to ship items individually or bundle multiple items into one shipment.

#### 2.15.2 Shipping Process

**WHEN** a seller needs to ship order items,
**THEN** they can select which of their items to include in a shipment.

**WHEN** a seller creates a shipment,
**THEY** must enter:
- Carrier name
- Tracking number

**WHEN** a shipment is created,
**THEN** all items in the shipment change to status "shipped".

**WHEN** a seller views their shipping queue,
**THEN** they can see order items that need shipping.

#### 2.15.3 Delivery Confirmation

**WHEN** a customer views a shipment,
**THEN** they can see tracking information (carrier name, tracking number).

**WHEN** a customer confirms delivery of a shipment,
**THEN** all items in that shipment change to status "delivered".

**WHEN** a customer does not confirm delivery,
**THEN** items automatically change to "delivered" after 14 days from shipping.

**WHEN** items are marked as delivered,
**THEN** the customer can write reviews for those products.

### 2.16 Review System

#### 2.16.1 Review Creation

**WHEN** a customer has delivered order items for a product,
**THEN** they can write a review for that product.

**WHEN** a customer writes a review,
**THEY** must provide:
- Rating (1 to 5 stars, required)
- Text content (optional)

**WHEN** a customer writes a review,
**THEN** only one review per product per order is allowed.

**WHEN** a review is submitted,
**THEN** it appears on the product detail page.

#### 2.16.2 Review Display and Calculation

**WHEN** a product's average rating is calculated,
**THEN** it is computed from all non-deleted reviews.

**WHEN** reviews are displayed on a product page,
**THEN** they are sorted by newest first.

**WHEN** a review is displayed,
**THEN** it shows:
- Reviewer name (or "Deleted User" for deleted accounts)
- Rating (1-5 stars)
- Review text (if provided)
- Review date

#### 2.16.3 Review Editing and Deletion

**WHEN** a customer edits their own review,
**THEN** a snapshot of the previous review state is created.

**WHEN** a customer deletes their own review,
**THEN** the review is marked as deleted but snapshots are preserved.

**WHEN** a review is deleted,
**THEN** it is no longer included in the average rating calculation.

**WHEN** a customer views their reviews,
**THEN** they can see all their submitted reviews with edit and delete options.

### 2.17 Seller Dashboard

#### 2.17.1 Shop Summary

**WHEN** a seller views their dashboard,
**THEN** they can see a summary of their shop including:
- Total number of products
- Total number of order items (for their products)
- Number of pending cancellation requests
- Number of pending refund requests

#### 2.17.2 Order Management

**WHEN** a seller views order items for their products,
**THEN** they can see all order items with status, quantity, and customer information.

**WHEN** a seller filters order items,
**THEN** they can filter by status (paid, shipped, delivered, cancelled, refunded).

**WHEN** a seller views order item details,
**THEN** they can process cancellations and refunds.

### 2.18 Administrator System

#### 2.18.1 Administrator Roles

**ADMINISTRATORS** have two grades:
- **Regular administrator**: Standard administrative capabilities
- **Super administrator**: Complete system oversight and user management

**WHEN** a user (customer or seller) submits an administrator request,
**THEY** must provide a reason for the request.

**WHEN** a super administrator reviews an administrator request,
**THEN** they can approve or reject the request.

**WHEN** an administrator request is approved,
**THEN** the user becomes a regular administrator.

**WHEN** a super administrator promotes a regular administrator,
**THEN** they become a super administrator.

**WHEN** a super administrator demotes another super administrator,
**THEN** they become a regular administrator.

**WHEN** a super administrator attempts to demote themselves,
**THEN** the demotion is blocked.

#### 2.18.2 Seller Management

**WHEN** an administrator views pending seller approvals,
**THEN** they can see all registration requests awaiting review.

**WHEN** an administrator reviews a seller registration,
**THEN** they can approve or reject the request.

**WHEN** a seller registration is rejected,
**THEN** the administrator must provide a rejection reason.

**WHEN** a seller is rejected,
**THEN** they can submit a new registration request.

**WHEN** an administrator suspends a seller account,
**THEN** the following restrictions apply:
- Seller's products are hidden from search and category listings
- Seller's products cannot be purchased
- Seller can still process existing orders (ship items, respond to cancellation/refund requests)
- Seller cannot create new products or edit existing products

**WHEN** an administrator unsuspends a seller account,
**THEN** the seller's products become visible again and normal operations resume.

#### 2.18.3 Category Management

**WHEN** an administrator creates a category,
**THEN** they can specify the parent category (top-level or subcategory).

**WHEN** an administrator edits a category,
**THEN** they can update the name and description.

**WHEN** an administrator deletes a category,
**THEN** products in that category become uncategorized (unless they have other categories).

#### 2.18.4 Product Oversight

**WHEN** an administrator views all products,
**THEN** they can see products from all sellers.

**WHEN** an administrator views a product,
**THEN** they can see all product snapshots.

**WHEN** an administrator deletes a product,
**THEN** it is removed from all listings and customer views.

**WHEN** an administrator deletes a product,
**THEN** all associated inventory records and snapshots are preserved.

#### 2.18.5 Order Oversight

**WHEN** an administrator views all orders,
**THEN** they can see orders from all customers and sellers.

**WHEN** an administrator force-cancels an order item,
**THEN** the item is cancelled and stock is restored.

**WHEN** an administrator force-cancels an entire order,
**THEN** all items are cancelled and stock is restored.

**WHEN** an administrator force-refunds an order item,
**THEN** the item is refunded and stock is restored.

**WHEN** an administrator force-refunds an entire order,
**THEN** all items are refunded and stock is restored.

#### 2.18.6 User Management

**WHEN** an administrator views customer accounts,
**THEN** they can see all customer information.

**WHEN** an administrator bans a customer,
**THEN** the customer cannot log in to their account.

**WHEN** a customer is banned,
**THEN** their existing orders remain active and can be processed.

**WHEN** an administrator unbans a customer,
**THEN** the customer can log in again.

**WHEN** an administrator views seller accounts,
**THEN** they can see all seller information and approval status.

**WHEN** an administrator bans a seller,
**THEN** the seller cannot log in but existing orders remain active.

---

> *Developer Note: This document defines business requirements only. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*