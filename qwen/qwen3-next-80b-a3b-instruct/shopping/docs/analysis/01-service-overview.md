# E-Commerce Shopping Mall Platform Requirements Specification

## Service Vision

The shoppingMall platform is designed as a comprehensive e-commerce marketplace that empowers individual sellers to establish professional online shops while providing customers with a secure, feature-rich shopping experience grounded in transparency, accountability, and trust. Unlike traditional platforms that prioritize volume over integrity, shoppingMall is built around irreversible data records and immutable snapshots to ensure every financial transaction, product modification, and user interaction leaves a verifiable historical trail. This commitment to forensic-level data preservation creates a marketplace where disputes can be resolved objectively, product authenticity is guaranteed, and business relationships are maintained with mathematical certainty.

The platform's core philosophy is that e-commerce platforms handling monetary exchanges must be fundamentally different from social media or content platforms. In shoppingMall, every edit to a product, every change to a seller's profile, every cancellation request, and every review modification is permanently captured as an immutable snapshot. This isn't merely logging—it's creating a legally defensible audit trail that protects consumers, sellers, and the platform itself from fraud, misrepresentation, and API abuse. The platform doesn't just track changes—it preserves the entire business context of every transaction in its original state, creating a marketplace where facts cannot be altered after the fact.

## Core Value Proposition

shoppingMall delivers unique value to three distinct stakeholders through its snapshot-based architecture:

### For Customers

- **Trust through Transparency**: Every product detail, price, and seller profile at the exact moment of purchase is permanently preserved in a snapshot. This means customers can prove exactly what was promised when they made a purchase, creating an unassailable record for dispute resolution.
- **Marketplace Integrity**: Since sellers can't retroactively alter product descriptions or images after a sale, customers can shop with confidence that the product they receive matches what was advertised at the time of purchase.
- **Fair Dispute Resolution**: If a product doesn't match its description, the customer has access to the exact snapshot of the product as it appeared during the purchase, enabling clear evidence in refund or cancellation claims.

### For Sellers

- **Proof of Performance**: Sellers are protected by snapshots that prove the exact product state, pricing, and descriptions when orders were placed. This prevents dishonest customers from claiming "I was sold something different" after the fact.
- **Reputation Preservation**: Even if a seller's profile changes, historical listings continue to display the exact shop name, description, and logo as they existed at time of sale, maintaining continuity of trust.
- **Business Continuity**: Sellers who meet all compliance requirements are guaranteed fair access to the platform without arbitrary account suspensions.

### For Administrators

- **Audit Trail Compliance**: Every modification, approval, rejection, and administrative override is stored as an immutable snapshot, satisfying financial and consumer protection regulations.
- **Dispute Resolution Tools**: Administrators can reconstruct the exact state of any product, order, or review at any point in time to resolve customer-seller disputes with factual accuracy.
- **Fraud Prevention**: The audit trail allows detection of patterns including fake reviews, manipulated pricing, and coordinated seller fraud.

## User Actors & Responsibility Matrix

### Customer Actor

Customers are registered users who interact with the platform to browse, purchase, and manage their shopping experience.

### Authentication Requirements

WHEN a customer registers, THE system SHALL require email and password.

WHEN a customer logs in, THE system SHALL validate email and password credentials.

WHEN a customer logs in, THE system SHALL issue a JWT access token with a 30-minute expiration and a refresh token with a 30-day expiration.

WHEN a customer changes their password, THE system SHALL require current password confirmation and generate a new JWT.

WHEN a customer deletes their account, THE system SHALL immediately invalidate all active sessions and delete all profile data (name, phone number, addresses).

WHERE a customer's account is deleted, THE system SHALL preserve all order history, review content, and seller profile names for legal and historical purposes, but display as "deleted user".

### Profile Management

WHEN a customer edits their display name, THE system SHALL update the display name in their profile and reflect the change in all future reviews and order histories.

WHEN a customer edits their phone number, THE system SHALL validate format and update the value in the profile.

WHERE a customer modifies their profile, THE system SHALL NOT create a snapshot, as profile data is not part of the immutable snapshot principle.

### Address Management

WHEN a customer adds a new shipping address, THE system SHALL require recipient name, phone number, street address, city, state/province, postal code, and country.

WHEN a customer edits an existing address, THE system SHALL preserve the original data in an address snapshot.

WHEN a customer deletes an address, THE system SHALL mark it as inactive but preserve it in snapshot history.

WHEN a customer sets an address as default, THE system SHALL update the default flag and invalidate the previous default.

WHEN a customer places an order, THE system SHALL use the selected default address unless overridden.

WHERE a customer's default address is deleted, THE system SHALL automatically reset the default to the first active address in their list.

### Wishlist Management

WHEN a customer adds a product to their wishlist, THE system SHALL record the product ID and timestamp.

WHEN a customer removes a product from their wishlist, THE system SHALL delete the relationship.

WHERE a product is deleted by a seller, THE system SHALL automatically remove it from all customers' wishlists.

WHEN a customer views their wishlist, THE system SHALL display all products as available unless they are deleted.

### Shopping Cart Management

WHEN a customer adds a product variant to their cart, THE system SHALL require selection of a specific variant with unique SKU.

WHEN a customer adds a variant already in their cart, THE system SHALL increment the quantity, not add a duplicate.

WHEN a customer changes the quantity of an item in cart, THE system SHALL validate sufficient stock.

WHEN a customer removes an item from cart, THE system SHALL delete the cart entry.

WHEN a customer proceeds to checkout, THE system SHALL validate all items have sufficient stock and are not deleted.

WHERE a product variant's stock drops below cart quantity, THE system SHALL show warning and disable checkout.

### Checkout Process

WHEN a customer proceeds to checkout, THE system SHALL require selection of a shipping address.

WHEN a customer confirms checkout, THE system SHALL lock the selected shipping address and cart state.

WHEN a customer completes checkout, THE system SHALL create an order and remove all items from cart.

WHERE payment fails, THE system SHALL preserve cart state and allow retry.

WHERE payment succeeds, THE system SHALL initiate order creation process.

### Review and Rating Management

WHEN a customer writes a review, THE system SHALL require rating (1-5) and allow optional text.

WHEN a customer writes a review, THE system SHALL validate that the item has status "delivered".

WHEN a customer edits a review, THE system SHALL create a review snapshot preserving the prior version.

WHEN a customer deletes a review, THE system SHALL mark it as deleted but preserve snapshot history.

WHERE a review is deleted, THE system SHALL recalculate the product's average rating without the deleted review.

### Business Rules

IF a product is deleted by a seller, THEN THE system SHALL remove it from all customer wishlists and prevent it from appearing in search results.

WHILE a customer's account is active, THE system SHALL allow all shopping, reviewing, and management actions.

IF a customer attempts to purchase a variant with inventory 0, THEN THE system SHALL prevent add-to-cart and show "out of stock".

### Seller Actor

Sellers are business entities that list products, manage inventory, fulfill orders, and interact with customer inquiries.

### Authentication Requirements

WHEN a seller registers, THE system SHALL require email and password.

WHEN a seller logs in, THE system SHALL validate email and password credentials.

WHEN a seller logs in, THE system SHALL issue a JWT access token with a 30-minute expiration and a refresh token with a 30-day expiration.

WHEN a seller changes their password, THE system SHALL require current password confirmation and generate a new JWT.

WHEN a seller deletes their account, THE system SHALL immediately invalidate all active sessions and delete their shop profile (name, description, logo).

WHERE a seller's account is deleted, THE system SHALL preserve all order history, snapshots, and product snapshots for legal and historical purposes.

WHERE a seller's registration is rejected, THE system SHALL store rejection reason and allow resubmission.

WHERE a seller is suspended, THE system SHALL block product creation and editing but allow fulfillment of existing orders.

### Profile Management

WHEN a seller updates their shop name, THE system SHALL create a seller profile snapshot.

WHEN a seller updates their shop description, THE system SHALL create a seller profile snapshot.

WHEN a seller updates their logo image, THE system SHALL create a seller profile snapshot.

WHEN a customer views a seller profile, THE system SHALL display the current profile and allow viewing of snapshot history.

WHERE a seller edits their profile, THE system SHALL preserve all previous versions in immutable snapshots for dispute resolution.

### Product Management

WHEN a seller creates a product, THE system SHALL require name, description, category, and base price.

WHEN a seller edits a product, THE system SHALL create a product snapshot capturing the state before change.

WHEN a seller deletes a product, THE system SHALL validate that no pending order items exist for any variant.

WHEN a seller deletes a product, THE system SHALL remove it from all category listings and search results.

WHEN a seller deletes a product, THE system SHALL preserve all product snapshots.

WHEN a seller uploads a product image, THE system SHALL allow multiple uploads and reorder.

WHEN a seller deletes a product image, THE system SHALL update the image list and include in product snapshot.

### Variant Management

WHEN a seller adds a variant to a product, THE system SHALL require SKU code, option values, and stock quantity.

WHEN a seller edits a variant, THE system SHALL create a variant snapshot preserving the previous state.

WHEN a seller deletes a variant, THE system SHALL validate that no pending order items exist.

WHERE a product has no variants, THE system SHALL display "unavailable".

WHILE a variant has stock quantity of 0, THE system SHALL show "out of stock".

### Inventory Management

WHEN a seller restocks a variant, THE system SHALL create an inventory record with positive quantity change and reason.

WHEN a seller adjusts inventory downward, THE system SHALL create an inventory record with negative quantity change and reason.

WHEN an order is placed, THE system SHALL create a negative inventory record for each purchased variant.

WHEN a cancellation or refund is approved, THE system SHALL create a positive inventory record for the variant.

WHEN a seller views inventory history, THE system SHALL display all records chronologically.

### Order Fulfillment

WHEN a seller ships one or more order items, THE system SHALL create a shipment record.

WHEN a shipment is created, THE system SHALL update status of all included items to "shipped".

WHEN a seller enters tracking information, THE system SHALL store it with the shipment.

WHEN a seller processes a cancellation request, THE system SHALL create a cancellation request snapshot.

WHEN a seller processes a refund request, THE system SHALL create a refund request snapshot.

### Business Rules

IF a seller attempts to delete a product with active order items, THEN THE system SHALL reject deletion.

IF a seller attempts to delete a variant with active order items, THEN THE system SHALL reject deletion.

IF a seller attempts to delete their account with pending orders or requests, THEN THE system SHALL reject deletion.

IF a seller attempts to edit a product after it has been purchased, THEN THE system SHALL allow edit but create snapshot.

WHILE a seller's account is suspended, THE system SHALL hide their products from search and category views.

### Admin Actor

Admins are authorized personnel with elevated privileges to manage the integrity and compliance of the platform.

### Authentication Requirements

WHEN an admin logs in, THE system SHALL require email and password, with JWT token as for regular actors.

WHEN a user is promoted to admin, THE system SHALL assign elevated permissions and notify the user.

WHERE an admin's account is banned, THE system SHALL disable all access.

### Seller Management

WHEN an admin reviews a seller registration, THE system SHALL allow approval, rejection, or pending.

WHEN an admin rejects a seller registration, THE system SHALL require a reason and store it.

WHEN an admin suspends a seller, THE system SHALL hide all products from public view.

WHEN an admin unsuspends a seller, THE system SHALL make products visible again.

WHEN an admin permanently bans a seller, THE system SHALL prevent login and preserve order history.

WHERE a seller is banned or suspended, THE system SHALL allow fulfillment of existing orders only.

### Category Management

WHEN an admin creates a category, THE system SHALL require name and description, with optional parent category for nesting.

WHEN an admin edits a category, THE system SHALL update name and description.

WHEN an admin deletes a category, THE system SHALL mark all associated products as "uncategorized".

### Product Oversight

WHEN an admin views products, THE system SHALL display all products on the platform, regardless of seller status.

WHEN an admin views a product, THE system SHALL display all snapshots and edit history.

WHEN an admin deletes a product, THE system SHALL delete it from listings, preserve snapshots for audit.

### Order Oversight

WHEN an admin views orders, THE system SHALL display all orders and order items across all users.

WHEN an admin forces cancellation of an order item, THE system SHALL update status to "cancelled", restore stock, issue refund, and create snapshot.

WHEN an admin forces refund of an order item, THE system SHALL update status to "refunded", restore stock, issue refund, and create snapshot.

WHEN an admin forces cancellation of entire order, THE system SHALL cancel all items.

WHEN an admin forces refund of entire order, THE system SHALL refund all items.

### User Management

WHEN an admin views customer accounts, THE system SHALL display all customer details.

WHEN an admin bans a customer, THE system SHALL prevent login, preserve order history.

WHEN an admin unbans a customer, THE system SHALL restore login access.

WHEN an admin views seller accounts, THE system SHALL display all sellers with approval status.

WHEN an admin bans a seller, THE system SHALL prevent login, preserve order history.

### Admin Role Management

WHEN a user requests admin access, THE system SHALL record reason and create pending request.

WHEN a super admin approves an admin request, THE system SHALL assign "regular admin" role.

WHEN a super admin promotes a regular admin, THE system SHALL change role to "super admin".

WHEN a super admin demotes a super admin, THE system SHALL change role to "regular admin".

WHERE a super admin attempts to demote themselves, THE system SHALL reject the action.

### Business Rules

IF an admin attempts to delete a category with active products, THEN THE system SHALL allow deletion and mark products as "uncategorized".

IF an admin overrides a seller's decision on cancellation or refund, THEN THE system SHALL preserve original request snapshot and create override snapshot.

WHILE a seller is suspended, THE system SHALL prevent all edits to product listings.

WHERE any actor attempts to bypass security, THE system SHALL log and alert super admin.

## Authentication Flow

WHEN a user (customer/seller/admin) tries to access a protected resource, THE system SHALL:

1. Require valid JWT access token
2. Validate token signature and expiration
3. Extract user ID and role from payload
4. Verify user account is not banned or suspended
5. If invalid, return HTTP 401 with error code UNAUTHORIZED
6. If valid, allow access according to role permissions

WHEN a JWT access token expires, THE system SHALL:

1. Accept refresh token
2. Validate refresh token signature and expiration (up to 30 days)
3. Issue new access token and reset expiration
4. Return updated tokens to client

WHEN a refresh token expires or is revoked, THE system SHALL:

1. Require re-authentication with email and password
2. Issue new access and refresh tokens

## Permission Hierarchy

| Action | Customer | Seller | Admin | Super Admin |
|--------|----------|--------|-------|-------------|
| Register | ✅ | ✅ | ✅ | ✅ |
| Login | ✅ | ✅ | ✅ | ✅ |
| Logout | ✅ | ✅ | ✅ | ✅ |
| Change password | ✅ | ✅ | ✅ | ✅ |
| Delete account | ✅ | ✅ | ❌ | ❌ |
| Edit profile | ✅ | ✅ | ✅ | ✅ |
| Add address | ✅ | ❌ | ❌ | ❌ |
| Edit address | ✅ | ❌ | ❌ | ❌ |
| Delete address | ✅ | ❌ | ❌ | ❌ |
| Set default address | ✅ | ❌ | ❌ | ❌ |
| Add to wishlist | ✅ | ❌ | ❌ | ❌ |
| Remove from wishlist | ✅ | ❌ | ❌ | ❌ |
| Add to cart | ✅ | ❌ | ❌ | ❌ |
| Edit cart | ✅ | ❌ | ❌ | ❌ |
| Checkout | ✅ | ❌ | ❌ | ❌ |
| Create product | ❌ | ✅ | ❌ | ❌ |
| Edit product | ❌ | ✅ | ✅ | ✅ |
| Delete product | ❌ | ✅ | ✅ | ✅ |
| Upload product image | ❌ | ✅ | ✅ | ✅ |
| Manage variants | ❌ | ✅ | ✅ | ✅ |
| Restock inventory | ❌ | ✅ | ✅ | ✅ |
| Adjust inventory | ❌ | ✅ | ✅ | ✅ |
| Ship order | ❌ | ✅ | ✅ | ✅ |
| View inventory history | ❌ | ✅ | ✅ | ✅ |
| View order items | ✅ | ✅ | ✅ | ✅ |
| View full order history | ✅ | ✅ | ✅ | ✅ |
| View seller profiles | ✅ | ✅ | ✅ | ✅ |
| View product snapshots | ✅ | ✅ | ✅ | ✅ |
| View seller profile snapshots | ✅ | ✅ | ✅ | ✅ |
| View order item snapshots | ✅ | ✅ | ✅ | ✅ |
| View review snapshots | ✅ | ✅ | ✅ | ✅ |
| Submit cancellation request | ✅ | ✅ | ✅ | ✅ |
| Approve/refuse cancellation | ❌ | ✅ | ✅ | ✅ |
| Submit refund request | ✅ | ✅ | ✅ | ✅ |
| Approve/refuse refund | ❌ | ✅ | ✅ | ✅ |
| Write review | ✅ | ❌ | ❌ | ❌ |
| Edit review | ✅ | ❌ | ❌ | ❌ |
| Delete review | ✅ | ❌ | ❌ | ❌ |
| View all products | ✅ | ✅ | ✅ | ✅ |
| View all sellers | ✅ | ✅ | ✅ | ✅ |
| View all users | ✅ | ❌ | ✅ | ✅ |
| Approve/reject seller registration | ❌ | ❌ | ✅ | ✅ |
| Suspend/unban seller | ❌ | ❌ | ✅ | ✅ |
| Ban/unban customer | ❌ | ❌ | ✅ | ✅ |
| Create category | ❌ | ❌ | ✅ | ✅ |
| Edit category | ❌ | ❌ | ✅ | ✅ |
| Delete category | ❌ | ❌ | ✅ | ✅ |
| View transaction logs | ❌ | ❌ | ✅ | ✅ |
| View system audit logs | ❌ | ❌ | ✅ | ✅ |
| Determine admin role | ❌ | ❌ | ❌ | ✅ |
| Promote demote super admin | ❌ | ❌ | ❌ | ✅ |

## Product Management

### Product Creation

WHEN a seller attempts to create a new product, THE system SHALL require the following mandatory fields:
- Product name (minimum 3 characters, maximum 200 characters)
- Product description (minimum 10 characters, maximum 5,000 characters)
- Category (must be an existing category or subcategory)
- Base price (must be a positive number greater than 0, with maximum 2 decimal places)

WHEN a seller submits a product creation request, THE system SHALL:
- Validate all required fields are present and meet length constraints
- Verify the selected category exists and is active
- Confirm the price is a positive number with at most two decimal places
- Check that the seller has no outstanding violations or suspensions

IF the product creation request contains invalid data, THEN THE system SHALL:
- Return an appropriate error message indicating which field(s) failed validation
- Include specific error codes for each validation failure
- Not create any product record
- Preserve the seller's attempt history for audit purposes

WHERE a seller has reached their maximum allowed product count (1,000 products per seller), THEN THE system SHALL deny product creation and display an appropriate message

WHILE a product is being created, THE system SHALL:
- Generate a unique product ID (UUID format)
- Assign the current timestamp as the creation date
- Set the "active" status to true
- Associate the product with the seller's account
- Initialize the "product snapshots" history with the initial product state

### Product Editing & Snapshots

WHEN a seller edits any field of an existing product (name, description, category, or base price), THE system SHALL:
- Create a product snapshot before applying the changes
- Preserve all previous values in the snapshot
- Record the exact timestamp of the edit
- Record the identity of the seller who made the change
- Update the product with the new values

THE product snapshot SHALL include all of the following fields with their values at the time of the edit:
- Product name
- Product description
- Category (with full hierarchy path)
- Base price
- Product status (active/inactive)
- Creation timestamp
- Last modified timestamp
- All product images (with their order and metadata)
- All variants with their current values at the time of edit (SKU code, option values, prices, stock quantities)

WHILE a product is being edited, THE system SHALL:
- Lock the product from being modified by other processes during the editing transaction
- Apply the snapshot creation before any field changes are committed
- Use atomic database operations to ensure data integrity
- Maintain consistent referential integrity between the product and its associated variants

IF a seller attempts to edit a product that has been deleted (logically or completely), THEN THE system SHALL deny the edit request and return appropriate error

WHERE a product has no active variants, THE system SHALL allow edit operations but display a warning that the product cannot be purchased

WHEN a product edit creates a snapshot, THE system SHALL:
- Generate a unique snapshot ID (UUID format)
- Generate a version number (incremented integer based on previous snapshots)
- Store the snapshot data in immutable storage
- Maintain a reference link from the live product to the new snapshot
- Preserve the snapshot for the lifetime of the platform, even if the product is later deleted

### Product Snapshot Structure Requirements

WHEN a product snapshot is created during an edit, THE snapshot SHALL contain:
- **Product Level**: All product fields that were editable by the seller (name, description, category, base price)
- **Image Level**: All product images with their order, metadata, and URLs at the moment of the edit
- **Variant Level**: Every variant associated with the product at the time of the change, including:
  - SKU code
  - Option values (e.g., "color: Red", "size: Large")
  - Price (which may override the base price)
  - Stock quantity
  - Variant creation timestamp
  - Variant last modified timestamp
- **Metadata**: Timestamp of the snapshot creation, seller ID who made the change, version number

THE product-snapshot → product-snapshot-SKV relationship SHALL be preserved as:
- Each product snapshot has exactly one version of the product structure
- Each product snapshot contains zero or more product-snapshot-SKU records
- Each product-snapshot-SKV represents one variant at the exact moment the snapshot was created
- Each product-snapshot-SKV contains its complete state at the time of capture

### Product Deletion

WHEN a seller attempts to delete a product, THE system SHALL:
- Validate that no order items exist for any variant of this product in "paid" or "shipped" status
- Validate that no pending cancellation requests exist for any variant of this product
- Validate that no pending refund requests exist for any variant of this product

IF any order items exist for this product with status "paid" or "shipped" THEN THE system SHALL deny deletion and return: "Cannot delete product because variants have paid or shipped order items"

IF any pending cancellation requests exist for this product's variants THEN THE system SHALL deny deletion and return: "Cannot delete product because variants have pending cancellation requests"

IF any pending refund requests exist for this product's variants THEN THE system SHALL deny deletion and return: "Cannot delete product because variants have pending refund requests"

WHEN a product is successfully deleted, THE system SHALL:
- Perform logical deletion (soft delete) by setting "deleted" flag to true
- Remove the product from search and category listings
- Prevent all new purchases of any variant of this product
- Preserve the product record for reporting and audit purposes
- Preserve all snapshots of the product for the lifetime of the platform
- Preserve the connection between product and all associated order items

WHILE the product is being deleted, THE system SHALL:
- Disable all endpoints that would allow viewing or purchasing the product
- Lock the product from further edits or deletions
- Trigger the deletion process as a single transaction

IF a product is deleted while it has active inventory records, THE system SHALL:
- Preserve the inventory history for financial audit purposes
- Prevent further inventory adjustments to the deleted product's variants
- Maintain the relationship between inventory records and the deleted product
- Allow calculation of historical stock levels for reporting

WHERE a seller deletes a product, THEN THE system SHALL send a notification to all customers who have the product on their wishlist

### Product Images

WHEN a seller uploads an image for a product, THE system SHALL:
- Accept only image file types (JPEG, PNG, WebP)
- Validate file size is not larger than 10MB
- Generate a unique file name using UUID for security
- Store the image in an immutable storage system
- Preserve original file metadata (dimensions, creation date)
- Create a record for the image with the following fields:
  - Image ID (UUID)
  - Product ID
  - Image URL path
  - File size
  - File type
  - Width (pixels)
  - Height (pixels)
  - Creation timestamp
  - Sort order (initially 0)

WHEN a seller changes the order of product images, THE system SHALL:
- Update the sort order of each image according to the new arrangement
- Record this change as part of the product's editing history
- Create a product snapshot with the new image sequence

WHEN a seller deletes an image from a product, THE system SHALL:
- Remove the image's reference from the product's image list
- Create a product snapshot with the updated image list
- Preserve the deleted image file in the storage system (to maintain historical accuracy of snapshots)
- Prevent the image from appearing in any new product views

IF a product has no images, THE system SHALL display a default placeholder image on product listings and detail pages

WHILE a product's images are being edited (added, reordered, or deleted), THE system SHALL:
- Lock the product editing process during the image manipulation transaction
- Apply changes atomically to ensure data consistency
- Immediately update the product's thumbnail (first image) if affected

### Product Variants (SKU)

WHEN a seller creates a new product variant, THE system SHALL:
- Validate that the product has at least one active variant
- Require a unique SKU code (must be alphanumeric, 3-20 characters)
- Require option values (name-value pairs for each attribute)
- Validate that option values are non-empty strings
- Validate that stock quantity is zero or greater
- Accept optional price override (must be zero or greater)
- Require at least one variant per product

WHEN a seller creates a new product variant, THE system SHALL:
- Generate a unique variant ID (UUID format)
- Set the create timestamp to now
- Set the last modified timestamp to now
- Associate the variant with the product
- Initialize inventory history with zero entries
- Apply the variant to the live product list

WHEN a seller edits an existing variant's SKU code, option values, or price, THE system SHALL:
- Create a product-snapshot-SKV record (variant snapshot) with current values
- Apply the edits to the live variant
- Update the variant's last modified timestamp
- Preserve the previous values in the snapshot
- Ensure SKU code uniqueness across all variants of all products

WHEN a seller deletes a variant, THE system SHALL:
- Validate that no order items exist for this variant in "paid" or "shipped" status
- Validate that no pending cancellation requests exist for this variant
- Validate that no pending refund requests exist for this variant
- Create a product-snapshot-SKV snapshot with the variant's values at the time of deletion
- Remove the variant from product offerings
- Preserve the variant data for historical reporting

IF any order items exist for a variant with status "paid" or "shipped" AND a seller attempts to delete the variant, THEN THE system SHALL deny deletion and return: "Cannot delete variant because it has paid or shipped order items"

IF any pending cancellation requests exist for a variant AND a seller attempts to delete it, THEN THE system SHALL deny deletion and return: "Cannot delete variant because it has pending cancellation requests"

IF any pending refund requests exist for a variant AND a seller attempts to delete it, THEN THE system SHALL deny deletion and return: "Cannot delete variant because it has pending refund requests"

WHILE a variant is being edited or deleted, THE system SHALL:
- Lock the variant from concurrent modifications
- Apply changes using atomic database operations
- Maintain consistent state between the variant and its inventory history
- Preserve the variant's association with past order items

WHERE a product has no variants, THE system SHALL display the product as "Unavailable" and prevent purchase

## Search & Listing Requirements

### Product Search Requirements

WHEN a customer performs a product search, THE system SHALL:
- Search product names (including variant option values) for matching text
- Return products from all active sellers
- Sort results by newest first by default
- Apply category filters if provided
- Apply price range filters (minimum and maximum) if provided
- Apply "in-stock only" filter if selected
- Support pagination with up to 20 items per page

THE product search function SHALL be capable of:
- Finding partial matches in product names ("red shirt" matches "Red Cotton Shirt")
- Matching search terms across product names and variant option values
- Returning results within 1.5 seconds for 95% of queries
- Supporting search term stemming ("shoe" finds "shoes")
- Ignoring case in text matching

WHILE a product search is being processed, THE system SHALL:
- Query only active products (not deleted)
- Include variants in the search matching algorithm
- Use optimized search indexes for product names and metadata
- Respect all applied filters simultaneously
- Return exactly one page of results per request

WHEN a customer filters search results by category, THE system SHALL:
- Include products in all subcategories of the selected category
- Exclude products from all other categories
- Include products from multiple selected categories if applicable

WHEN a customer filters search results by price range, THE system SHALL:
- Calculate price using the variant price if available
- If no variant price exists, use the base price
- If multiple variants exist, use the lowest variant price for "min" and highest for "max" in range matching
- Filter out products where the minimum variant price exceeds the maximum search price
- Filter out products where the maximum variant price is below the minimum search price

WHEN a customer applies "In-stock only" filter, THE system SHALL:
- Only return products that have at least one variant with stock quantity > 0
- Exclude products where all variants have stock quantity = 0
- Include products with out-of-stock variants as long as some variants remain in stock

WHEN a customer sorts search results by price (low to high), THE system SHALL:
- Sort primarily by lowest variant price (or base price if no variants)
- Secondary sort by product name
- Tertiary sort by creation timestamp (newest first)

WHEN a customer sorts search results by price (high to low), THE system SHALL:
- Sort primarily by highest variant price (or base price if no variants)
- Secondary sort by product name
- Tertiary sort by creation timestamp (newest first)

WHEN a customer sorts search results by newest first, THE system SHALL:
- Sort by product creation timestamp (most recent first)
- Secondary sort by product name
- Tertiary sort by lowest variant price

### Product Listing Requirements

WHEN a customer views a list of products (search results or category page), THE system SHALL display for each product:

- **Main Image**: The thumbnail image from the first image in the product's image list
- **Product Name**: The product name as stored in the latest version
- **Price**: 
  - If the product has variants: show price range (min: $5.99, max: $15.99)
  - If the product has one variant: show that variant's price
  - If the product has no variants: show "Unavailable"
- **Seller Shop Name**: The name of the seller's shop from the latest version of the seller's profile
- **Average Rating**: The average of all non-deleted reviews for this product, rounded to one decimal place
- **Total Review Count**: The total count of non-deleted reviews for this product
- **Stock Status**: Display "In Stock" if at least one variant has stock > 0, otherwise display "Out of Stock"

WHILE a product listing is being rendered, THE system SHALL:
- Use only the latest version of product name and description
- Use the latest version of seller shop name
- Calculate ratings from non-deleted reviews only
- Include only products that haven't been deleted
- Calculate price ranges efficiently using indexed variant data

WHERE a seller's shop name has changed since a product was listed, THE system SHALL continue displaying the shop name from the list view perspective based on the seller's profile at the time of product creation, but with an exception: customers may see the updated shop name if they click through to the product detail page

WHEN viewing a category page, THE system SHALL:
- Filter products to only those in the selected category or subcategories
- Maintain the same display format as search results
- Include category filters and sorting options in the UI
- Display products across all active sellers

WHERE a product's base price is changed after its image was generated in a listing, THE system SHALL still display the price information based on current variant data, not based on the historical product state

### Product Detail Page Requirements

WHEN a customer views a product detail page, THE system SHALL display:

- **All Images**: All product images in the exact order they were last saved, with the first image as the main display
- **Product Name**: Current product name
- **Product Description**: Current product description
- **Category**: Current category path
- **Seller Shop Name**: Link to seller profile with the current shop name
- **All Available Variants**: Show every variant with:
  - SKU code
  - Option values
  - Price (variant price, or base price if no override)
  - Stock status ("In Stock" or "Out of Stock")
- **Average Rating**: Average of all non-deleted reviews
- **Total Review Count**: Total number of non-deleted reviews
- **All Reviews**: All non-deleted reviews sorted by newest first, showing:
  - Customer display name (or "Deleted User" if account deleted)
  - Rating (stars)
  - Review text
  - Creation timestamp

WHILE viewing the product detail page, THE system SHALL:
- Use the current version of every field (name, description, category, seller name, etc.)
- Show all variants regardless of stock status
- Display "Out of Stock" for variants with zero stock, but still allow viewing
- Maintain all product images as they are currently stored
- Load reviews only from non-deleted user accounts

WHERE a variant's stock quantity has changed since the last time the customer viewed the product, THE system SHALL update the stock status display in real-time

WHEN a customer selects a variant from the detail page, THE system SHALL:
- Use the variant's price, not the base price, for cart addition
- Display appropriate quantity controls
- Prevent adding to cart if stock is 0

## Wishlist Requirements

WHEN a customer adds a product to their wishlist, THE system SHALL:
- Store only the product ID (not variant ID)
- Record the timestamp of addition
- Associate the wishlist entry with the customer
- Prevent duplicate entries (same product added twice)

WHEN a customer views their wishlist, THE system SHALL:
- Show products in descending order by addition timestamp (newest first)
- Include thumbnail image from the product's image list
- Show product name
- Show current price range (min/max variant prices)
- Show seller shop name
- Show rating and review count
- Include "In Stock" or "Out of Stock" status based on current variant data
- Allow removal of products from wishlist

WHERE a product is deleted by the seller, THE system SHALL:
- Automatically remove the product from all customers' wishlists
- Not preserve wishlist entries for deleted products
- Prevent display of deleted products in wishlist views

WHERE a product in a wishlist has no variants, THE system SHALL display "Unavailable" as the price

WHEN a customer removes a product from their wishlist, THE system SHALL:
- Remove the wishlist entry
- Preserve the removal timestamp for audit purposes
- Not affect any other customer's wishlist entries

## Shopping Cart Requirements

WHEN a customer adds a variant to their cart, THE system SHALL:
- Require selection of a specific variant (not just product)
- Require a quantity of 1 or more
- Validate that the variant has sufficient stock
- Validate that the variant has not been deleted

WHEN a customer adds a variant to their cart that is already present, THE system SHALL:
- Combine the quantities (add the new amount to existing)
- Do NOT create a separate line item
- Recalculate the subtotal
- Validate stock availability for the combined quantity

WHEN a customer views their cart, THE system SHALL display each item with:

- Product name
- Variant option values
- Price per item (variant price or base price)
- Quantity
- Subtotal (price per item x quantity)
- Stock status
- Remove option
- Quantity change controls (+/-)

WHEN a customer changes the quantity of an item in the cart, THE system SHALL:
- Allow quantity changes between 1 and the current stock amount
- If quantity exceeds current stock, display warning and prevent saving
- Recalculate subtotal for item
- Recalculate cart total
- Prevent quantities of zero

WHEN a customer removes an item from the cart, THE system SHALL:
- Remove that cart item
- Recalculate cart total
- Preserve the removal timestamp for audit purposes

WHERE a variant's stock drops below the cart quantity after being added, THE system SHALL:
- Display a "Stock warning" message next to the item
- Prevent checkout until the quantity is reduced or the stock increases
- Not automatically reduce the cart quantity

WHERE a variant is deleted by the seller after being added to cart, THE system SHALL:
- Mark the item as "Unavailable"
- Show "Product no longer available" message
- Prevent checkout of this item
- Allow customer to remove the item manually

WHERE a variant's stock becomes 0 after being added to cart, THE system SHALL:
- Mark the item as "Out of Stock"
- Display warning message
- Prevent checkout

WHEN a customer proceeds to checkout from cart, THE system SHALL:
- Only allow checkout if all items are available (stock > 0 and not deleted)
- Hide unavailable items from checkout process
- Prevent checkout if even one item is unavailable
- Allow customer to proceed once all unavailable items are removed

WHILE a customer is managing their cart, THE system SHALL:
- Calculate totals in real-time with no visible delays
- Validate stock levels on quantity changes
- Use current product state (not state at time of addition)
- Maintain cart persistence across sessions using authenticated session

## Checkout Requirements

WHEN a customer proceeds to checkout, THE system SHALL:
- Verify cart contains only available products (stock > 0, not deleted)
- Require selection of a shipping address
- Show cart summary with item listings, quantities, prices, subtotal, shipping (if applicable), and total
- Allow editing of cart before final confirmation
- Provide clear button to "Place Order"

THE checkout process SHALL preserve the following information for order creation:

- Exact list of cart items with quantities
- Exact variant prices at checkout time
- Exact selected shipping address
- Timestamp of checkout confirmation
- Customer account ID
- Cart ID (for audit purposes)

WHEN the customer confirms and places an order, THE system SHALL:

- Start order creation transaction
- Verify cart items are still available (final stock check)
- Reduce inventory for each variant by cart quantity
- Clear the cart
- Create order record
- Create order items for each variant (quantity, variant ID, cart price)
- Create product snapshots (for product name, description, category)
- Create product-snapshot-SKV for each variant (SKU, options, price)
- Create seller profile snapshot (shop name, logo)
- Initiate payment processing

WHERE payment processing fails, THE system SHALL:
- Roll back inventory changes
- Restore cart data to customer's session
- Return failure message with payment error code
- Allow customer to retry payment
- Preserve the failed order attempt record for audit

WHERE payment processing succeeds, THE system SHALL:
- Create permanent order record
- Persist order items
- Archive product and variant snapshots with the order
- Send order confirmation email
- Display order success page with order number and details

THE order shall be immutable once created, with all product, variant, and seller details preserved exactly as they were at the time of purchase.

## Order Management

### Order Creation

WHEN a customer completes successful payment, THE system SHALL create a new order.

WHEN an order is created, THE system SHALL:
- Generate a unique order number in format "ORD-YYYYMMDD-NNNN" where NNNN is a sequential number within the same day
- Set the order creation timestamp to the exact moment of payment confirmation
- Set the primary order status to "paid"
- Set the shipping address to the one selected by the customer at checkout
- Link each item in the customer's cart to a corresponding order item

WHEN creating an order item, THE system SHALL:
- Set the product ID to the variant's parent product identifier
- Set the variant ID to the specific product variant identifier
- Set the quantity to the quantity selected by the customer
- Set the unit price to the exact price of the variant at the time of cart addition
- Set the seller ID to the seller who created the product
- Set order item status to "paid"

WHEN an order item is created, THE system SHALL create and attach a snapshot of:
- The complete product state at time of purchase (name, description, category, base price, images)
- The complete variant state at time of purchase (SKU code, option values, price, stock quantity)
- The seller profile state at time of purchase (shop name, description, logo)

WHILE an order exists, THE system SHALL preserve all order item snapshots in their exact state at time of creation.

WHERE an order item snapshot is created, THE system SHALL:
- Timestamp the snapshot creation at the same moment as order creation
- Preserve all metadata including formatting, image URLs, and option names as they appeared at purchase time
- Store snapshots in immutable storage that cannot be modified or deleted

WHEN an order is successfully created from a cart, THE system SHALL:
- Remove all items from the customer's active cart
- Clear any cart warnings or validation errors
- Ensure no residual cart items remain tied to the now-processed order

### Order Item Structure

THE order item SHALL contain these immutable fields:

- order_id: UUID reference to parent order
- variant_id: UUID reference to product variant at time of purchase
- product_id: UUID reference to parent product at time of purchase
- seller_id: UUID reference to seller profile at time of purchase
- quantity: Integer value ≥1 indicating number of units purchased
- unit_price: Decimal value representing the exact price of variant at purchase time
- item_total: Calculated value (quantity × unit_price)
- status: One of: "paid", "shipped", "delivered", "cancelled", "refunded"
- created_at: ISO 8601 datetime when order item was created
- updated_at: ISO 8601 datetime when status was last changed
- snapshot_hash: SHA-256 cryptographic hash of the complete snapshot data

WHERE an order item exists, THE system SHALL store all product-level snapshot data:

- product_name: Exact product name as it appeared at time of purchase
- product_description: Exact product description as it appeared at time of purchase
- category_id: The category identifier at time of purchase
- category_name: The category name at time of purchase
- base_price: The base price as it appeared at time of purchase
- thumbnail_image: The URL of the first image as it appeared at time of purchase
- all_product_images: Array of all image URLs as they existed at time of purchase

WHERE an order item exists, THE system SHALL store all variant-level snapshot data:

- variant_sku: The exact SKU code as it existed at time of purchase
- option_values: JSON object containing all option-name:option-value pairs as they existed at time of purchase
- variant_price: The price override value that was active at time of purchase
- stock_at_time_of_purchase: The stock quantity as it existed at time of purchase

WHERE an order item exists, THE system SHALL store all seller profile snapshot data:

- shop_name: The exact shop name as it existed at time of purchase
- shop_description: The exact shop description as it existed at time of purchase
- logo_url: The exact logo URL as it existed at time of purchase

WHEN an order contains items from multiple sellers, THE system SHALL create a separate order item for each seller's product.

WHERE an order contains items from multiple sellers, THE system SHALL:
- Preserve each seller's profile snapshot independently
- Calculate order totals as the sum of all individual order items
- Maintain independent status tracking per order item

### Order Status Logic

THE overall order status SHALL be derived from its constituent order items as follows:

WHEN all order items in an order have status "paid", THEN THE order SHALL have status "paid".

WHEN any order item in an order has status "shipped" AND no items have status "delivered", THEN THE order SHALL have status "shipped".

WHEN all order items in an order have status "delivered", THEN THE order SHALL have status "delivered".

WHEN all order items in an order have status "cancelled", THEN THE order SHALL have status "cancelled".

WHEN all order items in an order have status "refunded", THEN THE order SHALL have status "refunded".

IF an order has at least one item with status "paid" AND at least one item with status "refunded", THEN THE order SHALL have status "partially completed".

IF an order has at least one item with status "shipped" AND at least one item with status "cancelled", THEN THE order SHALL have status "partially completed".

IF an order has at least one item with status "delivered" AND at least one item with status "refunded", THEN THE order SHALL have status "partially completed".

WHILE an order has status "partially completed", THE system SHALL:
- Clearly indicate in the UI that the order contains mixed statuses
- Allow customers to view individual item statuses
- Enable separate cancellation or refund actions on remaining items

### Order History Views

WHEN a customer views their order history, THE system SHALL:
- Display orders sorted by creation date in descending order (newest first)
- Show a paginated list with 10 orders per page
- Display for each order: order number, date created, total price, and overall status
- Link each entry to a full order detail view

WHEN a customer views full order details, THE system SHALL display:
- Order number and creation timestamp
- Shipping address as it existed at time of purchase
- List of all order items with:
  - Product name (as it was at purchase time)
  - Variant option values (as they were at purchase time)
  - Unit price (as it was at purchase time)
  - Quantity
  - Item subtotal
  - Individual item status
- Total order price
- All shipments with:
  - Shipment identifier
  - Carrier name
  - Tracking number
  - List of order items included
  - Shipment creation timestamp
  - Status (shipped, delivered)
  - Customer delivery confirmation timestamp

WHEN a seller views their order items, THE system SHALL:
- Allow viewing of all order items for their products
- Display only their relevant order items (not items from other sellers)
- Enable filtering by:
  - Order item status (paid, shipped, delivered, cancelled, refunded)
  - Date range (creation date)
  - Product name
  - Customer identifier
- Show for each order item:
  - Order number
  - Customer name (or "deleted user" if account deleted)
  - Quantity
  - Unit price
  - Item status
  - Order creation timestamp
- Allow access to product and variant snapshots associated with the order item

WHEN an administrator views any order on the platform, THE system SHALL:
- Have access to view ALL orders regardless of seller or customer
- Be able to search orders by:
  - Order number
  - Customer email or ID
  - Seller shop name
  - Date range
  - Order status
- Be able to force-cancel an order item (changing status to "cancelled" and restoring inventory)
- Be able to force-refund an order item (changing status to "refunded" and restoring inventory)
- Be able to override shipping/delivery status if necessary
- Always be able to view complete order item snapshots with full historical data
- Have access to immutable audit logs of all status changes

WHERE a customer has deleted their account, THE system SHALL:
- Maintain all order history created by that user
- Display "deleted user" instead of the original customer name in all order views
- Preserve all order items, snapshots, and transaction data associated with the user's orders
- Not delete any order-related records that would compromise legal or financial records

## Shipping and Tracking

### Shipment Creation

WHEN a seller selects one or more order items with status "paid" for shipment, THE system SHALL create a new shipment record.

THE system SHALL allow sellers to bundle multiple order items from the same order into a single shipment, provided all items belong to the same seller.

THE system SHALL NOT allow sellers to create shipments containing items from different sellers.

WHILE an order item has status "paid", THE system SHALL permit it to be included in a shipment.

WHEN a shipment is created, THE system SHALL automatically change the status of all included order items to "shipped".

THE system SHALL associate each shipment with exactly one shipping seller and the customer's shipping address.

WHEN a shipment is created, THE system SHALL require the seller to provide:
- Carrier name (text, required)
- Tracking number (text, required)
- Estimated delivery date (ISO 8601 date, optional)

THE system SHALL store the exact state of the seller's profile (shop name, logo, description) at the time of shipment creation as a snapshot.

THE system SHALL store the exact state of each product and variant in the shipment as a snapshot, matching the snapshot principle requirements.

### Tracking Information

WHEN a shipment is created, THE system SHALL store and expose the following tracking information:
- Carrier name (text, required)
- Tracking number (text, required)
- Shipment creation timestamp (ISO 8601 datetime, required)
- Estimated delivery date (ISO 8601 date, optional)
- Items included in shipment (list of order item IDs, required)

WHEN a customer views an order, THE system SHALL display tracking information for each shipment associated with that order.

THE system SHALL allow customers to view tracking details per shipment, not per individual item.

WHEN a seller updates the tracking information for a shipment, THE system SHALL NOT modify existing tracking data but SHALL create a new tracking record with the updated values.

### Delivery Confirmation

WHEN a customer confirms delivery of a shipment, THE system SHALL change the status of all order items in that shipment to "delivered".

WHEN a customer confirms delivery of a shipment, THE system SHALL record:
- Confirmation timestamp (ISO 8601 datetime)
- Customer device signature (if available)
- Customer IP address (if available)
- Confirmation method (app, web, mobile)

THE system SHALL allow only the customer who placed the order to confirm delivery of shipments.

THE system SHALL NOT allow customers to confirm delivery for shipments that are not associated with their account.

### Automatic Delivery

WHILE a shipment has status "shipped" and has not been confirmed as delivered by the customer, THE system SHALL automatically change the status of all order items in the shipment to "delivered" after 14 days from the shipment creation date.

THE system SHALL calculate the 14-day period from the shipment creation timestamp, not from the estimated delivery date.

WHEN automatic delivery occurs, THE system SHALL record:
- Automatic delivery timestamp (ISO 8601 datetime)
- Reason: "System auto-confirmed delivery after 14-day period"
- Order item status change: "shipped" → "delivered"

THE system SHALL NOT allow sellers to override the automatic delivery timeline.

THE system SHALL NOT permit customers to reverse automatic delivery confirmation.

WHEN automatic delivery occurs, THE system SHALL send notification to the customer indicating their order has been automatically marked as delivered.

WHEN automatic delivery occurs, THE system SHALL send notification to the seller indicating items in shipment were automatically marked as delivered.

THE system SHALL preserve a snapshot of the shipment status change event for audit purposes, as described in the snapshot principle document.

## Cancellation and Refund

### Cancellation Requests

Cancellations are processed per order item, not per entire order. Customers may submit cancellation requests only for order items with status "paid" (i.e., payment has completed but shipment has not yet been initiated). Cancellation is not permitted once any item in the order has been marked as "shipped".

A customer must provide a text reason for cancellation, with a minimum of 10 characters and a maximum of 500 characters. The system must validate that the reason is not empty and does not exceed the character limit. The cancellation request is initially created in a "pending" state and remains in that state until the seller responds.

When a customer submits a cancellation request for an order item:
- THE system SHALL capture the exact state of the order item at time of request: product name, variant options, price, quantity, and seller ID.
- THE system SHALL create a snapshot of the cancellation request with timestamp, reason, requester ID, item ID, and status="pending".
- THE system SHALL prevent the seller from shipping the item while the cancellation is pending.
- THE system SHALL temporarily reserve the stock quantity associated with the item to prevent overselling.

Only the customer who placed the order may submit a cancellation request for their own order items. No duplicate cancellation requests are permitted for the same order item.

### Refund Requests

Refunds are processed per order item, not per entire order. Customers may submit refund requests only for order items with status "delivered" and only within 7 days (168 hours) after the delivery confirmation timestamp. After 7 days, the refund request window closes permanently.

A customer must provide a text reason for refund, with a minimum of 10 characters and a maximum of 500 characters. The system must validate that the reason is not empty and does not exceed the character limit. The refund request is initially created in a "pending" state and remains in that state until the seller responds.

When a customer submits a refund request for an order item:
- THE system SHALL capture the exact state of the order item at time of request: product name, variant options, price, quantity, seller ID, delivery timestamp, and item status.
- THE system SHALL create a snapshot of the refund request with timestamp, reason, requester ID, item ID, and status="pending".
- THE system SHALL prevent the seller from editing or deleting the product associated with this item, to preserve transaction integrity.
- THE system SHALL prevent the creation of another refund request for the same item.

Only the customer who received the item may submit a refund request for their own order item. If the item was part of a multi-item order, the refund request applies only to that specific item.

### Seller Response

Sellers may respond to pending cancellation or refund requests for their own products. Sellers are notified via platform messages when a request is submitted for their order items.

When a seller responds to a request:
-- THE system SHALL allow the seller to select either "approve" or "reject" as valid response actions.
-- THE system SHALL require the seller to provide a text reason for rejection if they choose "reject", with a minimum of 10 characters and maximum of 500 characters.
-- THE system SHALL require the seller to provide a text reason for approval, even if optional, to maintain transparency.
-- THE system SHALL prevent sellers from changing their decision after submission.
-- THE system SHALL create a snapshot of the response containing: response timestamp, decision, reason, responder ID, and the original request ID.

If a seller does not respond to a cancellation request within 48 hours, THE system SHALL automatically approve the cancellation.

If a seller does not respond to a refund request within 72 hours, THE system SHALL automatically approve the refund.

The seller's response is final. Customers cannot override or re-request after the seller’s response has been recorded. If a seller responds with "reject", the order item status remains unchanged, and the customer may not request another cancellation or refund for that item.

### Inventory Restoration

When a cancellation or refund is approved:
- THE system SHALL increase the stock quantity of the associated product variant by the exact quantity that was ordered.
- THE system SHALL create an inventory history record with:
  - change: positive amount equal to the quantity being restored
  - reason: "CANCELLATION_APPROVED" or "REFUND_APPROVED"
  - actorId: the requester's user ID (customer)
  - referenceId: the order item ID
  - timestamp: the time of the approval
  - beforeQuantity: the stock level immediately before correction
  - afterQuantity: the stock level immediately after correction

The inventory update is atomic and transactional. If the inventory update fails, the entire cancellation/refund approval transaction fails and is rolled back. No partial inventory restoration is permitted.

The vendor must not be permitted to restock or subtract inventory from the same variant while a cancellation/refund request is pending, to ensure consistency.

The reproduction of stock quantities is distributed only to the variant associated with the specific order item. No other variants are affected.

The system must calculate current stock by summing all inventory history records for the variant. The inventory history is immutable and cannot be altered.

### Request Snapshots

An immutable snapshot is created for every cancellation request, refund request, seller response, and related state transition.

#### Snapshot Content

These snapshots preserve the complete business state at the moment of change and must include:

**Cancellation Request Snapshot**:
- Request ID (unique UUID)
- Order item ID
- Customer ID (requester)
- Timestamp (request creation)
- Cancellation reason (text)
- Status (pending, approved, rejected)
- Snapshot version (sequential)
- Source request version (link to prior version if any)
- Associated price (variant price at time of request)
- Associated product name and variant options
- Associated seller ID

**Refund Request Snapshot**:
- Request ID (unique UUID)
- Order item ID
- Customer ID (requester)
- Timestamp (request creation)
- Refund reason (text)
- Status (pending, approved, rejected)
- Snapshot version (sequential)
- Source request version (link to prior version if any)
- Associated price (variant price at time of request)
- Associated product name and variant options
- Associated seller ID
- Delivery confirmation timestamp (for eligibility validation)

**Seller Response Snapshot**:
- Response ID (unique UUID)
- Request ID (linked to the cancellation/refund request)
- Seller ID (responder)
- Timestamp (response creation)
- Decision (approve/reject)
- Reason (text, optional for approve, required for reject)
- Snapshot version (sequential)
- Source record reference (to original request)
- Platform version at time of response

**Inventory History Record** (non-snapshot but equally immutable):
- Record ID
- Variant ID
- Change amount
- Reason code (CANCELLATION_APPROVED, REFUND_APPROVED, ORDER_PLACED, ADJUSTMENT_LOSS, etc.)
- Actor ID (customer or admin)
- Reference ID (order item ID)
- Timestamp
- Before quantity
- After quantity
- Platform version

All snapshots are stored in a write-once, read-many storage system and are never deleted or altered, even if the order or user account is later deleted.

Snapshots are accessible to:
- The requester (customer)
- The seller whose product was involved
- Administrators
- System support staff

These snapshots serve as the authoritative record for dispute resolution in cases where there is disagreement over cancellation/refund outcomes, pricing, stock adjustment, or state transitions.

## Reviews and Ratings

### Review Eligibility

THE system SHALL allow customers to write reviews only for products they have purchased.

WHEN a customer has received a product (order item status is "delivered"), THE system SHALL enable review creation for that product.

WHERE a customer has already written a review for a specific product in a previous order, THE system SHALL prevent creation of a second review for the same product.

WHILE an order item status is "paid" or "shipped" or "cancelled" or "refunded", THE system SHALL prevent review creation for the associated product.

IF a product has been deleted by the seller, THEN THE system SHALL prevent review creation for that product.

IF a customer attempts to write a review for a product they did not purchase, THEN THE system SHALL return HTTP 403 with error code REVIEW_INVALID_PURCHASE.

### Review Creation

WHEN a customer submits a review for an eligible product, THE system SHALL create a review record with the following fields:
- rating (required, integer from 1 to 5)
- text (optional, up to 1,000 characters)
- createdAt (timestamp of submission)
- customerId (reference to the customer who wrote it)
- productId (reference to the product being reviewed)
- orderId (reference to the order containing the purchased item)

WHEN a review is created, THE system SHALL immediately update the product's average rating and total review count.

WHEN a customer submits a review without a rating, THEN THE system SHALL return HTTP 400 with error code REVIEW_MISSING_RATING.

WHEN a customer submits a rating that is not an integer between 1 and 5, THEN THE system SHALL return HTTP 400 with error code REVIEW_INVALID_RATING.

WHEN a customer submits a review text exceeding 1,000 characters, THEN THE system SHALL truncate the text to 1,000 characters and proceed with review creation.

WHEN a customer successfully creates a review, THE system SHALL display a success message and redirect to the product detail page.

### Review Editing

WHEN a customer submits an edit to their own review, THE system SHALL create a snapshot of the original review.

WHEN a review is edited, THE system SHALL preserve the original review's snapshot with timestamp, original rating, and original text.

WHEN a review is edited, THE system SHALL update the active review with new content and update the product's average rating.

THE system SHALL allow review editing for up to 7 days after review creation.

WHILE a review is older than 7 days, THE system SHALL prevent editing of the review.

IF a customer attempts to edit a review belonging to another customer, THEN THE system SHALL return HTTP 403 with error code REVIEW_UNAUTHORIZED_EDIT.

IF a customer attempts to edit a review after 7 days, THEN THE system SHALL return HTTP 403 with error code REVIEW_EDIT_WINDOW_EXPIRED.

WHEN a review is edited, THE system SHALL preserve the original timestamp and add an editedAt timestamp.

### Review Deletion

WHEN a customer requests to delete their own review, THE system SHALL create a snapshot of the review prior to deletion.

WHEN a review is deleted, THE system SHALL: 
- Hide the active review from public product detail pages
- Preserve the snapshot of the review for audit and dispute resolution
- Recalculate the product's average rating based on remaining reviews
- Retain the review's contribution to historical rating calculations

THE system SHALL NOT allow deletion of a review if it was created as part of a dispute resolution process.

IF a customer attempts to delete a review belonging to another customer, THEN THE system SHALL return HTTP 403 with error code REVIEW_UNAUTHORIZED_DELETE.

IF a product is deleted, THE system SHALL preserve all snapshots of reviews for that product.

### Rating Calculation

WHEN any review is created, edited, or deleted (but snapshot preserved), THE system SHALL recalculate the product's average rating.

THE system SHALL calculate average rating as the mean of all non-deleted, non-hidden review ratings.

WHILE a product has no reviews, THE system SHALL display "No ratings yet".

THE system SHALL display average rating with one decimal place (e.g., 4.2 stars).

THE system SHALL display total review count as the number of non-deleted, non-hidden reviews.

IF a review's rating is changed from 5 to 3 during editing, THEN THE system SHALL adjust the product's average rating by subtracting 2/totalReviews from the previous average.

WHEN a review is deleted, THE system SHALL recalculate the average rating as the new mean of the remaining reviews.

THE system SHALL store the product's average rating and review count as cached values for performance optimization.

WHEN the cache is updated, THE system SHALL timestamp the cache update and log it for debugging purposes.

WHEN the system calculates a new average rating, it SHALL round to one decimal place using standard mathematical rounding rules.

THE system SHALL NOT include any deleted reviews (even snapshots) in active average ratings.

WHERE a product has 0 reviews, THE system SHALL display "No ratings yet" instead of 0.0 stars.

## Administrator System

### Administrator Role

THE system SHALL recognize two administrative roles: regular administrator and super administrator.

WHEN a user submits an administrator request, THE system SHALL store the request with its reason and timestamp.

WHILE a user has pending administrator approval, THE system SHALL hide their administrative privileges.

IF a user is promoted to super administrator, THE system SHALL grant them all capabilities of a regular administrator plus additional permissions.

THE system SHALL prevent super administrators from demoting themselves to regular administrator.

IF a super administrator attempts to demote themselves, THE system SHALL reject the operation and display error message "Super administrators cannot demote themselves."

### Seller Management

WHEN an administrator views the seller approval list, THE system SHALL display all unapproved sellers with their registration date, email, and reason for registration.

WHEN an administrator approves a seller, THE system SHALL set the seller's status to "approved" and notify the seller.

WHEN an administrator rejects a seller, THE system SHALL set the seller's status to "rejected" and record the rejection reason.

THE system SHALL allow rejected sellers to submit a new registration request.

WHEN a seller account is suspended, THE system SHALL hide all their products from search and category listings.

WHEN a seller account is suspended, THE system SHALL prevent creation or editing of new products.

WHILE a seller account is suspended, THE system SHALL allow processing of existing orders, cancellation requests, and refund requests.

WHEN a suspended seller account is unsuspended, THE system SHALL restore visibility of all products to search and category listings.

IF a seller is suspended, THE system SHALL record the suspension timestamp and reason.

### Category Management

WHEN an administrator creates a category, THE system SHALL assign a unique identifier and store the name and description.

WHEN an administrator creates a subcategory, THE system SHALL associate it with exactly one parent category.

WHEN an administrator edits a category name or description, THE system SHALL update the category with the new values.

WHEN an administrator deletes a category, THE system SHALL set all products in that category to "uncategorized" status.

THE system SHALL prevent deletion of categories that contain subcategories.

### Product Oversight

WHEN an administrator views all products on the platform, THE system SHALL display product name, seller, status, creation date, and current stock.

THE system SHALL allow administrators to view any product's entire snapshot history.

WHEN an administrator deletes a product, THE system SHALL remove it from all search results and category listings.

WHEN an administrator deletes a product, THE system SHALL preserve all order items, snapshots, and historical records associated with the product.

WHEN an administrator deletes a product, THE system SHALL remove all variants and inventory records associated with the product.

### Order Oversight

WHEN an administrator views all orders on the platform, THE system SHALL display order number, customer, total amount, date, and overall status.

WHEN an administrator forces cancellation of an order item, THE system SHALL change the item status to "cancelled" and restore its stock quantity via inventory record.

WHEN an administrator forces refund of an order item, THE system SHALL change the item status to "refunded" and restore its stock quantity via inventory record.

WHEN an administrator forces cancellation of an entire order, THE system SHALL cancel all items in the order individually and restore all associated stock quantities.

WHEN an administrator forces refund of an entire order, THE system SHALL refund all items in the order individually and restore all associated stock quantities.

### User Management

WHEN an administrator views all customer accounts, THE system SHALL display customer email, registration date, profile status, and last login date.

WHEN an administrator bans a customer, THE system SHALL prevent the customer from logging in.

WHEN a customer is banned, THE system SHALL preserve all past order history, reviews, and wishlists.

WHEN an administrator unbans a customer, THE system SHALL restore the customer's ability to log in.

WHEN an administrator views all seller accounts, THE system SHALL display seller shop name, registration status, suspension status, and last activity date.

WHEN an administrator bans a seller, THE system SHALL prevent the seller from logging in.

WHEN a seller is banned, THE system SHALL preserve all order history, product snapshots, and shop profiles.

WHEN an administrator unbans a seller, THE system SHALL restore the seller's ability to log in.

### Snapshot Principle Integration

WHEN an administrator performs any action that modifies seller status, product status, or order status, THE system SHALL create a snapshot of the relevant data.

THE system SHALL preserve all administrator action snapshots with: timestamp, action type, user ID performing action, and before/after state values.

THE system SHALL allow administrators to view any snapshot related to their oversight actions.

WHEN an administrator approves or rejects a seller, THE system SHALL create a snapshot of the seller's profile at the time of action.

WHEN an administrator suspends or unsuspends a seller, THE system SHALL create a snapshot of the seller's product status at that moment.

WHEN an administrator deletes a product, THE system SHALL create a snapshot of the product and all its variants before deletion.

WHEN an administrator forces cancellation or refund, THE system SHALL create a snapshot of the order item's state before the action is taken.

WHEN an administrator bans a user, THE system SHALL create a snapshot of the user's account information at the time of ban.

WHEN an administrator unbans a user, THE system SHALL create a snapshot of the user's account restoration state.

WHEN any snapshot is created as a result of administrator action, THE system SHALL make it immutable and non-deletable.

WHEN a snapshot is created as a result of administrator action, THE system SHALL associate it with the administrator's ID and action type.

WHEN a snapshot is created as a result of administrator action, THE system SHALL allow retrieval via the action ID and timestamp.

WHEN a snapshot is created as a result of administrator action, THE system SHALL preserve the entire hierarchy: parent entity, children, and related entities at the precise moment of change.

## Snapshot Principle

THE shoppingMall platform SHALL preserve immutable historical snapshots of all mutable business-critical data to ensure auditability, dispute resolution, and legal compliance. THE system SHALL create a snapshot whenever any regulated entity is modified, and shall never delete, alter, or overwrite any snapshot data. THE system SHALL preserve snapshots indefinitely, even after the original entity is deleted.

WHEN any change occurs to a tracked entity, THE system SHALL record:
- The exact timestamp of the change
- The user actor who performed the change
- The complete state of all relevant fields before the change
- The complete state of all relevant fields after the change
- The unique identifier of the original entity
- The unique identifier of the new snapshot

WHILE the primary entity exists, THE system SHALL maintain direct linkage between the entity and its complete version history. THE system SHALL ensure snapshots are accessible only to authorized parties: the entity owner, administrators, or parties directly involved in the transaction.

### Product Snapshots

WHEN a seller creates a new product, THE system SHALL create an initial product snapshot containing:
- Product name
- Product description
- Category ID
- Base price
- List of uploaded image URLs in order
- Creation timestamp
- Seller ID
- Product ID

WHEN a seller edits any field of a product (name, description, category, base price, image order, or image deletion/addition), THE system SHALL create a new product snapshot with:
- The updated values
- The previous snapshot's identifier as parent
- The modification timestamp
- The actor ID who made the change
- The complete image list at time of change

IF a product is deleted by a seller, THE system SHALL create a final snapshot indicating the deletion and preserve all prior snapshots. THE product SHALL disappear from public search and category listings, but all snapshots SHALL remain accessible to administrators and parties involved in past transactions.

WHEN a product's category is changed, THE system SHALL preserve both the old and new category IDs in the snapshot. THE system SHALL NOT change the category in past snapshots, even if the category is later renamed or deleted by an administrator.

### Variant Snapshots

WHEN a seller adds a new variant to a product, THE system SHALL create a product-snapshot-SKU record linked to the current product snapshot ID. THE variant snapshot SHALL include:
- SKU code
- Option values (e.g., color, size)
- Price override (null if no override)
- Stock quantity (0 on creation)
- The product snapshot ID it belongs to
- Creation timestamp
- Seller ID

WHEN a seller modifies any field of an existing variant (SKU code, option values, price, or stock quantity), THE system SHALL create a new product-snapshot-SKU record linked to the current product snapshot ID. THE system SHALL preserve all prior variant snapshots.

IF a variant is deleted, THE system SHALL create a final variant snapshot indicating deletion and preserve all historical variant snapshots. THE system SHALL preserve variant snapshots even if the parent product or variant is deleted.

THE system SHALL ensure that every product snapshot contains a complete, immutable list of all its variants at the time of that snapshot.

### Seller Profile Snapshots

WHEN a seller registers, THE system SHALL create a seller profile snapshot containing:
- Shop name
- Shop description
- Logo image URL
- Registration timestamp
- Approval status (pending)
- Seller ID

WHEN a seller edits their shop name, description, or logo, THE system SHALL create a new seller profile snapshot with:
- Updated field values
- The previous snapshot's ID as parent
- Modification timestamp
- Actor ID

WHEN an administrator approves or rejects a seller registration, THE system SHALL create a seller profile snapshot reflecting the status change (approved/rejected) with:
- Updated approval status
- Rejection reason (if applicable)
- Administrator ID who acted
- Timestamp of action

WHEN a seller account is suspended or unsuspended by an administrator, THE system SHALL create a seller profile snapshot recording:
- New suspension status
- Administrator ID who acted
- Timestamp of action
- Reason for suspension (if provided)

WHEN a seller deletes their account, THE system SHALL create a final seller profile snapshot indicating account deletion and preserve all prior snapshots. THE system SHALL preserve all seller profile snapshots, even if the original account is deleted.

### Order Item Snapshots

WHEN an order is placed, THE system SHALL create an order item snapshot for each purchased variant. THE snapshot SHALL be created at moment of payment confirmation and SHALL include:
- Product name (from product snapshot)
- Product description (from product snapshot)
- Category name (from product snapshot)
- Base price (from product snapshot)
- Variant option values (from variant snapshot)
- Variant price override (from variant snapshot)
- SKU code (from variant snapshot)
- Quantity purchased
- Total price (calculated from variant price * quantity)
- Seller shop name (from seller profile snapshot at time of purchase)
- Seller logo URL (from seller profile snapshot at time of purchase)
- Timestamp of order creation
- Order ID
- Item ID

WHEN an order item's status changes (paid → shipped → delivered → cancelled → refunded), THE system SHALL NOT create a new snapshot. Status changes are tracked in the order item's active record, not via snapshots.

WHEN an order is canceled or refunded after purchase (via cancellation/refund request), THE system SHALL preserve the original order item snapshot and create a separate cancellation/refund snapshot in the respective request log (see Cancellation/Refund Snapshots section).

### Review Snapshots

WHEN a customer writes a review for a product, THE system SHALL create a review snapshot containing:
- Rating value (1-5 stars)
- Text content (null if empty)
- Reviewer ID
- Product ID
- Order ID
- Creation timestamp

WHEN a customer edits their review, THE system SHALL create a new review snapshot with updated text or rating, preserving:
- Original review snapshot ID
- Updated values
- Editor ID
- Edit timestamp

WHEN a review is deleted by the reviewer, THE system SHALL create a final review snapshot indicating deletion and preserve all prior versions. THE product's average rating SHALL be recalculated using only non-deleted reviews. THE system SHALL NOT delete the snapshot.

IF a product is deleted, THE system SHALL preserve all review snapshots associated with that product. THE system SHALL display reviews from deleted products with author name "deleted user".

### Cancellation/Refund Snapshots

WHEN a customer submits a cancellation request for an order item with status "paid", THE system SHALL create a cancellation snapshot recording:
- Order item ID
- Request timestamp
- Requesting customer ID
- Cancellation reason
- Request status (pending)

WHEN the seller responds to a cancellation request by approving or rejecting, THE system SHALL create an updated cancellation snapshot containing:
- Updated status (approved/rejected)
- Seller response timestamp
- Seller ID
- Response reason (if rejecting)
- Original snapshot ID

WHEN a cancellation request is approved, THE system SHALL restore inventory via an inventory history record, but SHALL NOT create a new snapshot for the inventory change (see Inventory & Stock Handling). THE system SHALL preserve the cancellation request snapshot.

WHEN a customer submits a refund request for a delivered item, THE system SHALL create a refund snapshot recording:
- Order item ID
- Request timestamp
- Requesting customer ID
- Refund reason
- Request status (pending)

WHEN the seller responds to a refund request by approving or rejecting, THE system SHALL create an updated refund snapshot containing:
- Updated status (approved/rejected)
- Seller response timestamp
- Seller ID
- Response reason (if rejecting)
- Original snapshot ID

WHEN a refund request is approved, THE system SHALL restore inventory via an inventory history record, but SHALL NOT create a new snapshot for the inventory change. THE system SHALL preserve the refund request snapshot.

THE system SHALL ensure that all cancellation and refund snapshots are immutable and permanently retained regardless of order status changes.

### Snapshot Retrieval

THE system SHALL allow the owner of an entity to retrieve complete snapshot histories for:
- Their own products
- Their own seller profile
- Their own reviews
- Their own cancellation/refund requests

THE system SHALL allow administrators to retrieve complete snapshot histories for all entities on the platform.

THE system SHALL allow customers to view the product, variant, and seller profile snapshots used in their past orders.

WHEN viewing a snapshot in the UI, THE system SHALL display:
- The timestamp of the snapshot
- The actor who made the change
- A side-by-side comparison of before/after values for all changed fields
- The parent-child relationship between snapshots (version tree)

THE system SHALL prevent any action that deletes, edits, or alters snapshots. Snapshots SHALL be stored as read-only, append-only objects.

WHEN a product is associated with a user's cart, wishlist, or order, THE system SHALL reference the product snapshot ID at the time of association, not the current product entity. THE system SHALL never dynamically update old cart/wishlist/order records to reflect changes in the current product state.

THE system SHALL ensure that all snapshots are recoverable even if the primary entity is permanently deleted. THE system SHALL store snapshots in a separate, versioned archive with no direct relation to live entity tables.

## Business Logic and Validation Summary

All requirements in this document are subject to the following core principles:

- **Immutable Data**: All snapshots are immutable and never deleted
- **Consistency**: All system changes maintain referential integrity
- **Auditability**: Every change is tracked with timestamp and user identity
- **Real-time Accuracy**: Live data always reflects current state; snapshots preserve historical state
- **User Privacy**: Deleted account information is anonymized appropriately
- **Legal Compliance**: All financial records and transaction history are preserved
- **User Experience**: System responds within 2 seconds for all user actions
- **Error Handling**: Users receive clear, actionable error messages
- **Security**: All data modifications require user authentication
- **Scalability**: System designed to handle 10,000 concurrent users

### Performance Requirements

- Product search results appear within 1.5 seconds for 95% of queries
- Product detail pages load within 2 seconds
- Cart updates complete within 500 milliseconds
- Checkout process completes within 3 seconds
- Inventory updates occur within 1 second of order placement
- All API responses return within 2 seconds
- Snapshot creation completes within 500 milliseconds

### Error Handling Standards

- All validation failures return HTTP 400 with structured error JSON
- All authentication failures return HTTP 401
- All authorization failures return HTTP 403
- All server errors return HTTP 500
- All errors include specific error codes and human-readable messages
- No detailed system information is exposed in error responses
- Error messages are localized to the user's preferred language

### Compliance Requirements

- The system complies with all applicable data privacy regulations (GDPR, CCPA)
- User data is stored securely with encryption at rest and in transit
- All financial data is handled using PCI-DSS compliant payment gateways
- All product snapshots and order histories are retained for 7 years
- All administrative actions are audited and logged
- User accounts can be fully deleted upon request (excludes order history)

### Non-Functional Requirements

- 99.9% system uptime guarantee
- System must support 10,000 concurrent users
- API response time < 2 seconds on 95th percentile
- Maximum queue time for order processing < 5 seconds
- Snapshot creation latency < 1 second
- Search index must be updated within 100ms of data change
- Mobile web experience must be fully functional

All requirements above are mandatory for implementation. The system must behave exactly as specified for every scenario described. No assumptions or interpretations beyond this document are permitted.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*
