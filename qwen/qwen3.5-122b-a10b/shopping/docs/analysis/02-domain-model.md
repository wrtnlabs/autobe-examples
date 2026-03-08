**ecommerceMall — Business concepts, relationships, and states from user perspective**

Business concepts, relationships, and states from user perspective

# Domain Concepts

Describe what each concept means to users and why it exists.

## Customer Concept

A Customer is a registered user who can browse products, add items to their cart, place orders, and write reviews. Customers must create an account with email and password before accessing any platform features. Guest browsing is not supported on this platform. Customers can maintain a personal profile with a display name and phone number. They can manage multiple shipping addresses and set a default for checkout. Customers can add products to their wishlist for future purchases. When a customer deletes their account, their profile information is removed but order history and reviews are preserved for legal and business records. Deleted customer reviews are shown as from a deleted user to maintain review integrity. Customers can change their password for security purposes.

### Customer Registration and Account Creation

WHEN a new user wants to use the platform, THE system SHALL require them to create a customer account before accessing any features.

WHEN a customer creates an account, THE system SHALL require:
1. A valid email address as the primary identifier
2. A password that meets security requirements
3. Agreement to the platform terms of service

WHEN a customer completes registration, THE system SHALL:
1. Create a customer account with active status
2. Allow the customer to log in immediately with their credentials
3. Enable access to all customer features including browsing products and placing orders

THE system SHALL NOT allow guest browsing or purchasing without a registered account.

IF the email address is already registered, THE system SHALL reject the registration and inform the user.

IF the password does not meet security requirements, THE system SHALL reject the registration and specify the requirements.

### Customer Authentication and Password Management

WHEN a customer logs into the platform, THE system SHALL authenticate them using their email and password.

WHEN a customer successfully logs in, THE system SHALL:
1. Establish a secure session for the customer
2. Allow access to all customer features based on their permissions
3. Display their profile information including display name

WHEN a customer wants to change their password, THE system SHALL:
1. Require the current password for verification
2. Require a new password that meets security requirements
3. Update the password and invalidate existing sessions for security

IF the current password is incorrect, THE system SHALL reject the password change request.

IF the new password does not meet security requirements, THE system SHALL reject the request and specify the requirements.

WHEN a customer's account is banned by an administrator, THE system SHALL prevent them from logging in.

### Customer Profile Management

WHEN a customer creates their profile, THE system SHALL allow them to provide optional personal information.

WHEN a customer manages their profile, THE system SHALL allow them to:
1. Set or update their display name for public identification
2. Provide a phone number for order communications
3. View their current profile information at any time

THE system SHALL store the display name and phone number as part of the customer profile.

IF the customer leaves the display name blank, THE system SHALL use their email prefix or a default identifier.

IF the customer leaves the phone number blank, THE system SHALL allow order placement but may request it during checkout.

WHEN a customer updates their profile information, THE system SHALL immediately reflect the changes in their account.

### Shipping Address Management

WHEN a customer manages shipping addresses, THE system SHALL allow them to add multiple addresses for delivery.

WHEN a customer adds a shipping address, THE system SHALL require:
1. Recipient name
2. Recipient phone number
3. Complete street address
4. City
5. State or province
6. Postal code
7. Country

WHEN a customer manages their addresses, THE system SHALL allow them to:
1. Edit any saved address details
2. Delete addresses they no longer need
3. Set one address as the default for checkout
4. View all saved addresses at any time

THE system SHALL use the default address automatically during checkout if the customer does not select a different one.

IF a customer tries to delete their only address, THE system SHALL prevent deletion or require them to add a new address first.

WHEN a customer places an order, THE system SHALL use the selected shipping address and preserve it with the order record.

### Wishlist Functionality

WHEN a customer browses products, THE system SHALL allow them to add products to their wishlist for future purchase.

WHEN a customer manages their wishlist, THE system SHALL allow them to:
1. Add products to their wishlist
2. View all products in their wishlist with pagination
3. Remove products from their wishlist
4. See product availability and pricing in the wishlist

THE system SHALL store wishlists per customer and persist them across sessions.

IF a product is deleted by the seller, THE system SHALL automatically remove it from all customer wishlists.

IF a product becomes unavailable (out of stock), THE system SHALL indicate this status in the wishlist but allow the customer to keep it saved.

WHEN a customer views their wishlist, THE system SHALL show the product name, main image, current price, and stock status.

### Order History Access

WHEN a customer places an order, THE system SHALL create an order record with all purchased items.

WHEN a customer views their order history, THE system SHALL allow them to:
1. View a list of all their orders sorted by newest first
2. See order number, date, total price, and overall status for each order
3. Access full order details including items, shipping address, and shipments
4. View tracking information for each shipment

THE system SHALL paginate the order list to manage large numbers of orders.

WHEN a customer views order details, THE system SHALL show:
1. Each order item with product name, variant options, quantity, price, and status
2. The shipping address used for the order
3. All shipments with tracking information and delivery status

IF an order contains items from multiple sellers, THE system SHALL show each seller's items grouped by shipment.

### Review Writing and Management

WHEN a customer receives a delivered product, THE system SHALL allow them to write a review for that product.

WHEN a customer writes a review, THE system SHALL require:
1. The order item must have status "delivered"
2. A rating between 1 and 5 stars
3. Optional text content for the review

WHEN a customer manages their reviews, THE system SHALL allow them to:
1. Edit their own reviews after submission
2. Delete their own reviews
3. View all reviews they have written

THE system SHALL create a snapshot whenever a review is edited or deleted to preserve the original content.

IF a customer has already reviewed a specific product in an order, THE system SHALL prevent them from writing another review for the same product in that order.

IF the 7-day refund window has passed, THE system SHALL still allow review writing as long as the item is delivered.

### Account Deletion and Data Preservation

WHEN a customer requests account deletion, THE system SHALL process the deletion while preserving certain records for legal and business purposes.

WHEN a customer account is deleted, THE system SHALL:
1. Remove all customer profile information including display name and phone number
2. Delete all shipping addresses associated with the account
3. Remove all wishlist items
4. Preserve all order history and order records
5. Preserve all reviews but display them as from a "deleted user"

THE system SHALL NOT delete order records even after customer account deletion to maintain business records and legal compliance.

THE system SHALL mark the customer account as deleted and prevent future logins.

WHEN customers view reviews from deleted users, THE system SHALL display "deleted user" instead of the original customer information while preserving the review content and rating.

IF the customer has pending orders, THE system SHALL allow account deletion but preserve order history for the customer to access as a deleted user record.

## Seller Concept

A Seller is a registered user who can list products, manage inventory, and fulfill customer orders. Sellers must create an account with email and password, but require administrator approval before they can start selling. Sellers can view their approval status and receive rejection reasons if their application is denied. Rejected sellers can submit a new registration request after addressing the rejection reason. Sellers maintain a shop profile with a shop name, description, and logo image. Every edit to the shop profile creates a snapshot for audit purposes. Sellers can create and manage their own products and variants. Sellers can view their shop dashboard with order summaries and pending requests. When a seller deletes their account, their products are removed from listings but order history is preserved. Sellers can only delete their account if they have no pending orders or refund requests.

### Seller Registration

WHEN a customer or user wants to sell products on the platform, THE system SHALL allow them to submit a seller registration request with their email and password.

WHEN a seller registration request is submitted, THE system SHALL create a seller account with approval status set to "pending".

THE system SHALL require email to be unique across all customer and seller accounts.

THE system SHALL require password to be provided and stored in hashed format.

WHEN a seller registration request is submitted, THE system SHALL send a confirmation to the provided email address.

IF the email is already registered to another account, THE system SHALL reject the registration request.

IF the password does not meet security requirements, THE system SHALL reject the registration request.

### Seller Approval Workflow

WHEN a seller registration request is submitted, THE system SHALL require administrator approval before the seller can list products.

WHEN a seller's approval status is "pending", THE system SHALL prevent them from creating products or accessing seller-specific features.

WHEN an administrator reviews a pending seller application, THE system SHALL allow them to approve or reject the application.

WHEN an administrator rejects a seller application, THE system SHALL require them to provide a rejection reason.

WHEN a seller's application is rejected, THE system SHALL make the rejection reason visible to the seller.

WHEN a seller's application is rejected, THE system SHALL allow them to submit a new registration request after addressing the rejection reason.

WHEN a seller's application is approved, THE system SHALL change their approval status to "approved" and grant them seller privileges.

WHEN a seller views their profile, THE system SHALL display their current approval status (pending, approved, or rejected).

WHEN a seller has approval status "approved", THE system SHALL allow them to create products and manage their shop.

IF a seller's account is suspended by an administrator, THE system SHALL hide their products from search and category listings.

IF a seller's account is suspended, THE system SHALL prevent them from creating new products or editing existing products.

IF a seller's account is suspended, THE system SHALL allow them to continue processing existing orders (shipping items, responding to cancellation and refund requests).

WHEN a suspended seller's account is unsuspended, THE system SHALL make their products visible again in search and category listings.

### Shop Profile Management

WHEN a seller creates their shop, THE system SHALL require them to provide a shop name.

WHEN a seller edits their shop profile, THE system SHALL allow them to update their shop name, shop description, and shop logo.

WHEN a seller updates their shop profile information, THE system SHALL create a snapshot of the previous state before applying changes.

THE system SHALL make each shop profile snapshot immutable and non-deletable.

WHEN a customer views a product, THE system SHALL display the seller's shop name and allow navigation to the seller's profile.

WHEN a customer views a seller profile, THE system SHALL display the shop name, shop description, and shop logo.

WHEN a seller changes their shop name, THE system SHALL preserve the previous shop name in snapshots associated with past orders.

WHEN a seller changes their shop logo, THE system SHALL preserve the previous logo in snapshots associated with past orders.

IF a seller deletes their account, THE system SHALL preserve their shop name in past order records.

IF a seller deletes their account, THE system SHALL preserve their shop logo in snapshots associated with past order items.

### Product Management

WHEN a seller has approval status "approved", THE system SHALL allow them to create products.

WHEN a seller creates a product, THE system SHALL require them to provide a product name, description, category, and base price.

WHEN a seller edits their product, THE system SHALL create a snapshot of the product state before applying changes.

WHEN a seller edits their product, THE system SHALL create snapshots of all product variants at that moment.

WHEN a seller uploads product images, THE system SHALL allow them to reorder images (first image is the main/thumbnail image).

WHEN a seller deletes an image from their product, THE system SHALL include the image change in the product snapshot.

WHEN a seller creates product variants, THE system SHALL require each variant to have a unique SKU code, option values, and stock quantity.

WHEN a seller edits a product variant, THE system SHALL create a snapshot of the variant before applying changes.

WHEN a seller deletes a product variant, THE system SHALL verify there are no pending order items (paid or shipped status) for that variant.

WHEN a seller deletes a product variant, THE system SHALL verify there are no pending cancellation or refund requests for that variant.

WHEN a seller deletes a product, THE system SHALL delete all its variants and inventory records.

WHEN a seller deletes a product, THE system SHALL verify there are no pending order items (paid or shipped status) for any variant of the product.

WHEN a seller deletes a product, THE system SHALL verify there are no pending cancellation or refund requests for any variant of the product.

WHEN a seller deletes a product, THE system SHALL ensure the product no longer appears in search or category listings.

WHEN a seller deletes a product, THE system SHALL preserve all product snapshots even after product deletion.

WHEN a seller views their products, THE system SHALL allow them to view snapshots of their own products.

WHEN an administrator views products, THE system SHALL allow them to view snapshots of any product.

### Seller Dashboard

WHEN a seller accesses their dashboard, THE system SHALL display a summary of their shop including total number of products and total number of order items for their products.

WHEN a seller accesses their dashboard, THE system SHALL display the number of pending cancellation requests for their products.

WHEN a seller accesses their dashboard, THE system SHALL display the number of pending refund requests for their products.

WHEN a seller views their order items, THE system SHALL display all order items for their products.

WHEN a seller views their order items, THE system SHALL allow them to filter order items by status (paid, shipped, delivered, cancelled, refunded).

WHEN a seller views order items needing shipping, THE system SHALL display items with status "paid" that are waiting for shipment.

WHEN a seller creates a shipment, THE system SHALL allow them to select one or more order items from the same seller to include in the shipment.

WHEN a seller creates a shipment, THE system SHALL require them to enter tracking information (carrier name and tracking number).

WHEN a seller creates a shipment, THE system SHALL change all items in the shipment to status "shipped".

WHEN a seller responds to a cancellation request, THE system SHALL create a snapshot of the request state.

WHEN a seller responds to a refund request, THE system SHALL create a snapshot of the request state.

WHEN a seller's account is suspended, THE system SHALL prevent them from viewing order items that require shipping actions.

### Account Deletion Restrictions

WHEN a seller requests to delete their account, THE system SHALL verify they have no pending orders (paid or shipped status).

WHEN a seller requests to delete their account, THE system SHALL verify they have no pending cancellation requests.

WHEN a seller requests to delete their account, THE system SHALL verify they have no pending refund requests.

IF a seller has pending orders (paid or shipped status), THE system SHALL reject the account deletion request.

IF a seller has pending cancellation requests, THE system SHALL reject the account deletion request.

IF a seller has pending refund requests, THE system SHALL reject the account deletion request.

WHEN a seller successfully deletes their account, THE system SHALL delete their products from listings.

WHEN a seller successfully deletes their account, THE system SHALL preserve their order history and snapshots.

WHEN a seller successfully deletes their account, THE system SHALL preserve their shop name in past orders.

WHEN a customer deletes their account, THE system SHALL preserve their orders and order history for seller records and legal purposes.

WHEN a customer deletes their account, THE system SHALL preserve their reviews but display them as "deleted user".

WHEN a customer deletes their account, THE system SHALL delete their profile information.

IF a customer has pending orders, THE system SHALL preserve their order history even after account deletion.

## Product Concept

A Product is an item offered for sale by a seller, containing a name, description, category, and base price. Every product must have at least one variant to be purchasable by customers. Products belong to the seller who created them and can only be edited or deleted by that seller. Sellers can upload multiple images for each product, with the first image serving as the main thumbnail. Every product edit creates a snapshot that preserves the previous state including all images. Customers can search for products by name and filter results by category and price range. Products are displayed in category listings and search results with the seller's shop name. When a product is deleted, it no longer appears in search or category listings. Deleted products are automatically removed from all customer wishlists. Products can be hidden from listings if the seller account is suspended.

### Product Creation and Ownership

WHEN a seller creates a product, THE system SHALL:
1. Require a product name
2. Require a product description
3. Require a base price
4. Require a category selection (can be a subcategory)
5. Associate the product with the creating seller
6. Create an initial product snapshot recording the creation

THE system SHALL associate all products with the seller who created them.

IF the product name is missing, THE system SHALL reject the creation request.
IF the product description is missing, THE system SHALL reject the creation request.
IF the base price is missing, THE system SHALL reject the creation request.
IF the category is missing, THE system SHALL reject the creation request.

### Product Editing and Snapshots

WHEN a seller edits a product, THE system SHALL:
1. Allow editing of the product name
2. Allow editing of the product description
3. Allow editing of the base price
4. Allow editing of the category
5. Create a snapshot recording the previous state and new values
6. Only allow the product owner to perform edits

IF the user is not the product owner, THE system SHALL reject the edit request.

A product snapshot SHALL record:
- When the change was made
- What fields were changed
- The values before the change
- The values after the change

Product snapshots SHALL be immutable and cannot be deleted.

Sellers SHALL be able to view snapshots of their own products.
Administrators SHALL be able to view snapshots of any product.

### Product Deletion and Visibility

WHEN a seller deletes a product, THE system SHALL:
1. Verify there are no pending order items (paid or shipped status) for any variant
2. Verify there are no pending cancellation or refund requests for any variant
3. Delete all product variants and inventory records
4. Remove the product from search results and category listings
5. Automatically remove the product from all customer wishlists
6. Preserve the product snapshots for audit purposes

IF there are pending order items for any variant, THE system SHALL reject the deletion request.
IF there are pending cancellation or refund requests for any variant, THE system SHALL reject the deletion request.

Deleted products SHALL no longer appear in search results or category listings.
Deleted products SHALL be automatically removed from all customer wishlists.
Product snapshots SHALL be preserved even after product deletion.

### Product Search and Category Listings

WHEN a customer searches for products, THE system SHALL:
1. Search by product name
2. Return results from all sellers
3. Support pagination of results
4. Allow filtering by category
5. Allow filtering by price range (minimum and maximum)
6. Allow filtering for in-stock products only
7. Support sorting by newest first
8. Support sorting by price (low to high)
9. Support sorting by price (high to low)

WHEN viewing category listings, THE system SHALL:
1. Display all products within the selected category
2. Show the main thumbnail image for each product
3. Show the product name
4. Show the base price or price range if variants differ
5. Show the seller shop name
6. Show the average rating if reviews exist

Product search results SHALL be paginated.
Category listings SHALL be paginated.

### Product Images and Thumbnail

WHEN a seller uploads product images, THE system SHALL:
1. Allow multiple images per product
2. Allow reordering of images
3. Treat the first image as the main/thumbnail image
4. Allow deletion of individual images
5. Include image changes in product snapshots

WHEN a product is displayed in search results or category listings, THE system SHALL show the first image as the thumbnail.

Image changes SHALL be recorded in product snapshots.

Sellers SHALL be able to reorder product images.
Sellers SHALL be able to delete images from their products.

### Suspended Seller Products

WHEN a seller account is suspended, THE system SHALL:
1. Hide the seller's products from search results
2. Hide the seller's products from category listings
3. Prevent customers from purchasing the seller's products
4. Allow the seller to process existing orders (ship items, respond to requests)
5. Prevent the seller from creating new products
6. Prevent the seller from editing existing products

WHEN a seller account is unsuspended, THE system SHALL:
1. Make the seller's products visible in search results again
2. Make the seller's products visible in category listings again
3. Allow the seller to create new products
4. Allow the seller to edit existing products

Suspended seller products SHALL NOT be purchasable by customers.
Suspended seller products SHALL remain associated with the seller for order history purposes.

### Wishlist and Product Lifecycle

WHEN a product is deleted by a seller, THE system SHALL:
1. Remove the product from all customer wishlists automatically
2. Preserve the product snapshots for audit purposes
3. Maintain order history with product snapshots

WHEN a customer views their wishlist, THE system SHALL:
1. Show only active products
2. Automatically exclude deleted products
3. Paginate the wishlist results

Deleted products SHALL be automatically removed from all customer wishlists.
Product snapshots SHALL be preserved for dispute resolution and audit purposes.

## ProductVariant Concept

A ProductVariant represents a specific combination of options for a product, such as color and size combinations. Each variant has a unique SKU code that identifies it across the platform. Variants can have their own price that overrides the product's base price. Stock quantity is tracked per variant, not per product. Customers must select a specific variant when adding items to their cart. Variants with zero stock are shown as out of stock and cannot be purchased. Sellers can add, edit, or delete variants for their products. Every variant edit creates a snapshot preserving the previous option values and price. Variants can only be deleted if there are no pending orders or refund requests for that variant. When a product is deleted, all its variants are also removed. Out of stock variants appear in search results but are marked as unavailable.

### Variant Structure and Options

WHEN a seller creates a product variant, THE system SHALL:
1. Require a unique SKU code that identifies the variant across the platform
2. Require option values that define the specific combination (e.g., color: "Red", size: "Large")
3. Allow an optional variant price that can override the product's base price
4. Require a stock quantity that starts at 0

THE system SHALL enforce SKU code uniqueness across all variants on the platform.

THE system SHALL store option values as a structured combination of option names and their selected values.

IF a seller attempts to create a variant with a duplicate SKU code, THE system SHALL reject the request.

IF a variant has no option values defined, THE system SHALL reject the variant creation.

WHEN viewing variant details, THE system SHALL display the SKU code and all option values to customers and sellers.

### Variant Pricing and Inventory

WHEN a seller sets a variant price, THE system SHALL:
1. Allow the price to be higher, lower, or equal to the product's base price
2. Use the variant price when displayed on product listings if it differs from base price
3. Use the variant price for cart calculations and order totals

WHEN a variant's stock quantity reaches 0, THE system SHALL:
1. Mark the variant as "out of stock"
2. Prevent customers from adding the variant to their cart
3. Display "out of stock" status on the product detail page

THE system SHALL track inventory through inventory history records rather than direct stock quantity updates.

WHEN a seller restocks a variant, THE system SHALL create an inventory record with a positive quantity change.

WHEN a variant is purchased, THE system SHALL create an inventory record with a negative quantity change.

WHEN an order is cancelled or refunded, THE system SHALL create an inventory record with a positive quantity change to restore stock.

IF a seller attempts to set a negative stock quantity, THE system SHALL reject the request.

### Variant Selection and Availability

WHEN a customer adds items to their cart, THE system SHALL:
1. Require selection of a specific variant (not just a product)
2. Require specification of quantity for the selected variant
3. Combine quantities if the same variant already exists in the cart

WHEN a variant is out of stock, THE system SHALL:
1. Show the variant as unavailable on the product detail page
2. Prevent the variant from being added to cart
3. Display the variant in search results but mark it as unavailable

WHEN a variant is deleted by the seller, THE system SHALL:
1. Mark the variant as unavailable in all customer carts
2. Prevent checkout if unavailable variants remain in the cart
3. Show a warning to customers about unavailable items

IF a customer's cart contains a variant with stock less than the cart quantity, THE system SHALL display a warning.

WHEN viewing product listings, THE system SHALL show price ranges when variants have different prices.

### Variant Lifecycle Management

WHEN a seller edits a variant, THE system SHALL:
1. Create a snapshot preserving the previous SKU code, option values, and price
2. Record the timestamp of the change and the seller who made it
3. Store both previous and current values in the snapshot

WHEN a seller attempts to delete a variant, THE system SHALL verify:
1. No pending order items exist for that variant with paid or shipped status
2. No pending cancellation requests exist for that variant
3. No pending refund requests exist for that variant

IF any pending orders or requests exist for the variant, THE system SHALL reject the deletion request.

WHEN a variant is successfully deleted, THE system SHALL:
1. Remove the variant from the product's variant list
2. Preserve all snapshots of the variant for audit purposes
3. Remove the variant from customer wishlists if referenced

THE system SHALL prevent deletion of the last variant if it would leave the product without any variants.

### Product-Variant Relationship

THE system SHALL maintain a one-to-many relationship where one product has many variants.

WHEN a seller creates a product, THE system SHALL allow adding at least one variant to make it purchasable.

WHEN a product has no variants, THE system SHALL:
1. Display the product in search and category listings
2. Mark the product as "unavailable" since no variants exist
3. Prevent customers from adding items to cart

WHEN a seller deletes a product, THE system SHALL:
1. Delete all variants associated with that product
2. Delete all inventory records for those variants
3. Preserve snapshots of all variants for audit purposes
4. Remove the product and all variants from search and category listings

WHEN a seller suspends a product, THE system SHALL:
1. Hide all variants from search and category listings
2. Prevent customers from purchasing any variant
3. Preserve existing order items for those variants

THE system SHALL ensure each variant belongs to exactly one product.

## Category Concept

A Category organizes products into logical groups to help customers browse and discover items. Categories can have subcategories with one level of nesting for better organization. Each category has a name and optional description that appears in the browsing interface. Only administrators can create, edit, or delete categories. Customers can browse the complete list of all categories on the platform. Customers can view all products within a specific category or subcategory. Categories are used as a filter option in product search results. When a category is deleted, products in that category become uncategorized but remain visible in search. Categories help structure the product catalog for easier navigation. Subcategories inherit the parent category's context for browsing purposes.

### Category Organization and Structure

Categories organize products into logical groups to enable efficient browsing and discovery on the platform.

THE system SHALL organize products using a hierarchical category structure.
THE system SHALL support one level of nesting for categories (parent categories and subcategories only).
THE system SHALL allow subcategories to inherit the browsing context of their parent category.
THE system SHALL prevent categories from having more than one level of nesting.

WHEN a category is created, THE system SHALL assign it either as a parent category or a subcategory.
WHEN a subcategory is created, THE system SHALL require a parent category to be specified.
WHEN viewing the category structure, THE system SHALL display parent categories with their subcategories in a hierarchical view.

Categories provide the foundation for product organization and navigation throughout the platform.

### Category Properties

Each category contains identifying information that helps customers understand its purpose and contents.

WHEN a category is created or edited, THE system SHALL require a category name.
THE system SHALL allow a category description to be optional.
THE system SHALL display the category name prominently in category listings and navigation.
THE system SHALL display the category description when viewing category details.

A category name uniquely identifies the category within its parent scope.
A category description provides additional context about the types of products included in the category.

WHEN displaying categories in listings, THE system SHALL show the category name and description.
WHEN displaying categories in navigation, THE system SHALL show the category name.

Category names and descriptions are visible to all customers browsing the platform.

### Subcategory Hierarchy

Subcategories enable finer product organization under parent categories with a single level of nesting.

WHEN a customer views a parent category, THE system SHALL display all subcategories under that parent.
WHEN a customer views a subcategory, THE system SHALL display products in that subcategory only.
THE system SHALL allow customers to navigate from a subcategory back to its parent category.
THE system SHALL prevent categories from having grandchildren (no nesting beyond one level).

Subcategories inherit the parent category's context for browsing purposes.
Customers can browse products either by parent category (including all subcategories) or by specific subcategory.

WHEN filtering products by category, THE system SHALL allow selection of either a parent category or a subcategory.
WHEN a parent category is selected as a filter, THE system SHALL include products from all subcategories.
WHEN a subcategory is selected as a filter, THE system SHALL include products from that subcategory only.

The one-level nesting structure keeps the category hierarchy simple and easy to navigate.

### Category Browsing and Navigation

Customers can browse and navigate through the platform's category structure to discover products.

WHEN a customer accesses the category listing, THE system SHALL display all parent categories.
WHEN a customer views a parent category, THE system SHALL display its subcategories if any exist.
THE system SHALL paginate the category listing when the number of categories exceeds the page limit.

WHEN a customer clicks on a category, THE system SHALL navigate to the category detail page.
WHEN a customer views a category detail page, THE system SHALL show products in that category.
THE system SHALL display breadcrumb navigation showing the current category path.

THE system SHALL allow customers to view the complete list of all categories on the platform.
THE system SHALL allow customers to view all products within a specific category or subcategory.

Category browsing supports product discovery without requiring search.

### Product Categorization and Filtering

Categories are used to filter and organize products in search results and product listings.

WHEN a customer searches for products, THE system SHALL allow filtering by category.
WHEN a customer filters by category, THE system SHALL show products in that category and its subcategories.
THE system SHALL display category-based filters in the product search interface.

WHEN viewing products in a category, THE system SHALL show the category name and subcategories.
WHEN viewing products in a subcategory, THE system SHALL show the parent category in the navigation.

Products are associated with exactly one category or subcategory at creation time.
Products can be moved to a different category by the seller or administrator.

WHEN products are listed by category, THE system SHALL display the main image, name, price, seller name, and average rating for each product.

Category filtering works in combination with other search filters such as price range and stock availability.

### Administrator Category Management

Only administrators have the authority to create, edit, and delete categories on the platform.

WHEN an administrator creates a category, THE system SHALL require a category name.
WHEN an administrator creates a subcategory, THE system SHALL require a parent category selection.
WHEN an administrator edits a category, THE system SHALL allow updating the name and description.

Administrators can create parent categories and subcategories.
Administrators can edit category names and descriptions.
Administrators can delete categories when necessary.

Regular customers cannot create, edit, or delete categories.
Customers can only browse and view categories created by administrators.

Administrators use category management to maintain the product catalog structure and ensure proper organization.

### Category Deletion and Uncategorized Products

When a category is deleted, products previously in that category become uncategorized but remain visible on the platform.

WHEN an administrator deletes a category, THE system SHALL remove all products from that category.
WHEN products are removed from a deleted category, THE system SHALL mark them as uncategorized.
THE system SHALL preserve all products even after their category is deleted.

Uncategorized products remain visible in search results.
Uncategorized products can be assigned to a new category by an administrator.

WHEN a category is deleted, THE system SHALL preserve all subcategories under that category and move them to uncategorized status.

Deleted categories cannot be restored. New categories must be created if needed.

The deletion of a category does not affect products' availability for purchase or their existing order history.

## Order Concept

An Order is a record of a customer's purchase transaction containing one or more order items. Orders are created when a customer successfully completes checkout and payment. Each order has a unique order number and timestamp for identification. The order status is derived from the statuses of its individual order items. Orders can contain items from multiple different sellers, each with their own shipping process. Customers can view their complete order history with paginated results. Each order displays the total price, shipping address, and list of items purchased. Once an order is placed, the shipping address cannot be changed. Payment processing happens before order creation, and failed payments do not create orders. Orders are preserved even if a customer or seller deletes their account.

### Order Creation and Payment

WHEN a customer completes checkout with available items, THE system SHALL create an order record.

WHEN a customer confirms payment during checkout, THE system SHALL process the payment through the payment gateway.

WHEN payment succeeds, THE system SHALL create the order with all purchased items.

WHEN payment fails, THE system SHALL NOT create an order.

WHEN payment fails, THE system SHALL allow the customer to retry payment.

WHEN an order is successfully created, THE system SHALL decrease stock quantities for all purchased variants.

WHEN an order is successfully created, THE system SHALL remove purchased items from the customer's cart.

WHEN an order is placed, THE system SHALL create order items for each purchased product variant.

WHEN an order is placed, THE system SHALL save a snapshot of each purchased product and variant at the time of purchase.

WHEN an order is placed, THE system SHALL save a snapshot of each seller's profile at the time of purchase.

IF a customer attempts to checkout with unavailable items, THE system SHALL prevent order placement.

IF a variant's stock is insufficient at checkout, THE system SHALL prevent that item from being ordered.

### Order Identification and Structure

THE system SHALL assign a unique order number to each order for identification.

THE system SHALL record the order date and time when the order is created.

THE system SHALL calculate the order total based on all order items and their quantities.

THE system SHALL display the order total including all item subtotals.

THE system SHALL create one order item for each unique product variant purchased.

THE system SHALL combine quantities when multiple units of the same variant are purchased.

THE system SHALL allow an order to contain items from multiple different sellers.

THE system SHALL treat each order item as independent for status tracking and fulfillment.

THE system SHALL display the product name, variant options, quantity, and unit price for each order item.

THE system SHALL allow items from different sellers to be grouped in a single order for customer convenience.

THE system SHALL maintain the relationship between order items and their original product variants.

THE system SHALL preserve the snapshot of product and seller information with each order item.

### Order Status and Lifecycle

THE system SHALL derive the overall order status from the statuses of its individual order items.

WHEN all order items have status "paid", THE system SHALL set the order status to "paid".

WHEN any order item has status "shipped" and none are "delivered", THE system SHALL set the order status to "shipped".

WHEN all order items have status "delivered", THE system SHALL set the order status to "delivered".

WHEN all order items have status "cancelled", THE system SHALL set the order status to "cancelled".

WHEN all order items have status "refunded", THE system SHALL set the order status to "refunded".

WHEN order items have mixed statuses (e.g., some delivered, some refunded), THE system SHALL set the order status to "partially completed".

THE system SHALL preserve order records even when a customer deletes their account.

THE system SHALL preserve order records even when a seller deletes their account.

THE system SHALL preserve order history for legal and business record purposes.

THE system SHALL maintain the shipping address associated with the order even after account deletion.

IF an order item is cancelled, THE system SHALL restore the stock quantity for that variant.

IF an order item is refunded, THE system SHALL restore the stock quantity for that variant.

### Order History and Viewing

THE system SHALL allow customers to view a list of all their orders.

THE system SHALL display order history sorted by newest first.

THE system SHALL paginate the order history list for efficient viewing.

THE system SHALL display the order number, date, total price, and overall status for each order in the history.

THE system SHALL allow customers to view full details of any order.

THE system SHALL display all order items with product name, variant options, quantity, price, and item status in order details.

THE system SHALL display the shipping address used for the order in order details.

THE system SHALL display all shipments with tracking information for the order.

THE system SHALL show which items are included in each shipment.

THE system SHALL preserve the shipping address information once an order is placed.

WHEN an order is placed, THE system SHALL NOT allow the shipping address to be changed.

THE system SHALL allow customers to view their complete purchase history across all orders.

THE system SHALL display the average rating for products in the order details when reviews exist.

## OrderItem Concept

An OrderItem represents a single product variant purchased within an order with its own quantity and status. Each order item tracks the product name, variant options, unit price, and quantity at the time of purchase. Order items can have different statuses independently, such as paid, shipped, delivered, cancelled, or refunded. The overall order status is calculated based on the statuses of all its order items. Customers can request cancellation or refund for individual order items, not entire orders. Each order item includes a snapshot of the product, variant, and seller profile at purchase time. This snapshot preserves the exact state for dispute resolution and record keeping. Order items from different sellers are shipped separately. When an order item is cancelled or refunded, stock quantities are restored via inventory records. Order items remain in the system even after account deletions.

### Order Item Status Definitions

WHEN an order item is created after successful payment, THE system SHALL assign it the "paid" status.

WHEN a seller ships order items, THE system SHALL update their status to "shipped".

WHEN a customer confirms delivery for a shipment, THE system SHALL update all items in that shipment to "delivered" status.

WHEN a customer requests cancellation for an item with "paid" status, THE system SHALL allow the request.

WHEN a seller approves a cancellation request, THE system SHALL update the item status to "cancelled".

WHEN a customer requests a refund for an item with "delivered" status, THE system SHALL allow the request within 7 days of delivery.

WHEN a seller approves a refund request, THE system SHALL update the item status to "refunded".

IF an order item is cancelled or refunded, THE system SHALL restore the stock quantity via an inventory record.

IF all items in an order are "paid", THE system SHALL set the order status to "paid".

IF any item in an order is "shipped" (and none delivered), THE system SHALL set the order status to "shipped".

IF all items in an order are "delivered", THE system SHALL set the order status to "delivered".

IF all items in an order are "cancelled", THE system SHALL set the order status to "cancelled".

IF all items in an order are "refunded", THE system SHALL set the order status to "refunded".

IF items in an order have mixed statuses (e.g., some delivered, some refunded), THE system SHALL set the order status to "partially completed".

WHILE an item has "paid" status, THE system SHALL allow cancellation requests from customers.

WHILE an item has "delivered" status, THE system SHALL allow refund requests from customers within 7 days.

WHILE an item has "shipped" or "delivered" status, THE system SHALL reject cancellation requests.

THE system SHALL prevent status changes that violate the defined transition rules.

### Order Item Composition and Pricing

WHEN a customer adds a product variant to their order, THE system SHALL create an order item with the selected quantity.

THE system SHALL record the unit price at the time of purchase in each order item.

IF the same variant is purchased multiple times in one order, THE system SHALL combine them into a single order item with combined quantity.

THE system SHALL calculate the order total by summing all order item subtotals (quantity × unit price).

WHEN an order contains items from multiple sellers, THE system SHALL create separate order items for each seller's products.

THE system SHALL allow order items from different sellers to have independent statuses.

IF a customer purchases 3 units of the same variant, THE system SHALL create one order item with quantity 3.

THE system SHALL display each order item with its product name, variant options, quantity, and unit price in the order details.

THE system SHALL preserve the unit price in the order item even if the product price changes after purchase.

### Order Item Snapshots for Record Keeping

WHEN an order item is created, THE system SHALL capture a snapshot of the product at that moment.

WHEN an order item is created, THE system SHALL capture a snapshot of the product variant at that moment.

WHEN an order item is created, THE system SHALL capture a snapshot of the seller's profile at that moment.

THE product snapshot SHALL include all product fields (name, description, category, base price, images) at the time of purchase.

THE variant snapshot SHALL include the SKU code, option values, and price at the time of purchase.

THE seller snapshot SHALL include the shop name and logo at the time of purchase.

THE order item snapshot SHALL preserve the exact state for dispute resolution and record keeping.

THE system SHALL make snapshots immutable and prevent deletion.

THE system SHALL allow customers to view the product, variant, and seller snapshots associated with their order items.

THE system SHALL allow administrators to view snapshots of any order item for investigation purposes.

THE snapshots SHALL be preserved even if the original product, variant, or seller profile is later modified or deleted.

### Item Cancellation and Refund Process

WHEN a customer requests cancellation for an order item, THE system SHALL require the item to have "paid" status.

WHEN a customer requests cancellation, THE system SHALL require them to provide a reason.

WHEN a cancellation request is submitted, THE system SHALL create a snapshot of the request state.

WHEN a seller receives a cancellation request, THE system SHALL allow them to approve or reject it.

IF a cancellation request is approved, THE system SHALL update the item status to "cancelled" and process the refund.

IF a cancellation request is rejected, THE system SHALL update the item status and notify the customer.

WHEN an item is cancelled, THE system SHALL restore its stock quantity via an inventory record with the appropriate reason.

WHEN a customer requests a refund for an order item, THE system SHALL require the item to have "delivered" status.

WHEN a customer requests a refund, THE system SHALL verify the request is within 7 days of delivery.

WHEN a refund request is submitted, THE system SHALL create a snapshot of the request state.

WHEN a seller receives a refund request, THE system SHALL allow them to approve or reject it.

IF a refund request is approved, THE system SHALL update the item status to "refunded" and process the refund.

WHEN an item is refunded, THE system SHALL restore its stock quantity via an inventory record with the appropriate reason.

THE system SHALL allow each order item to be cancelled or refunded independently of other items in the same order.

IF all items in an order are cancelled, THE system SHALL update the overall order status to "cancelled".

IF all items in an order are refunded, THE system SHALL update the overall order status to "refunded".

THE remaining items in an order SHALL continue processing normally when one item is cancelled or refunded.

## Address Concept

An Address is a shipping destination that customers can save and manage for future orders. Each address contains recipient name, phone number, street address, city, state or province, postal code, and country. Customers can add multiple addresses to their account for different delivery locations. Customers can edit or delete any of their saved addresses at any time. Customers can designate one address as the default for automatic selection during checkout. When placing an order, customers must select a shipping address from their saved addresses or use the default. Once an order is placed, the shipping address cannot be changed for that order. Addresses are preserved when a customer deletes their account for order history purposes. Each order records the shipping address used at the time of purchase.

### Address Structure and Fields

THE address SHALL contain the following required fields:
1. Recipient name
2. Phone number
3. Street address
4. City
5. State or province
6. Postal code
7. Country

WHEN a customer creates or edits an address, THE system SHALL require all seven fields to be completed.

THE recipient name SHALL identify the person receiving the delivery at the shipping address.

THE phone number SHALL provide contact information for the delivery carrier to reach the recipient.

THE street address SHALL specify the building number, street name, and any additional delivery information such as apartment or suite number.

THE city SHALL specify the municipality or urban area for the delivery location.

THE state or province SHALL specify the administrative region within the country.

THE postal code SHALL provide the postal or ZIP code for mail routing.

THE country SHALL specify the nation where the delivery location is situated.

### Multiple Address Management

WHEN a customer manages their account, THE system SHALL allow the customer to save multiple shipping addresses.

THE system SHALL allow each customer to maintain an unlimited number of saved addresses for different delivery locations.

WHEN a customer adds a new address, THE system SHALL create the address record and associate it with the customer's account.

WHEN a customer edits an existing address, THE system SHALL update all address fields while preserving the address identifier.

WHEN a customer deletes an address, THE system SHALL remove the address from the customer's saved addresses list.

IF the deleted address is set as the default address, THE system SHALL clear the default designation before deletion.

IF the deleted address is referenced by any order, THE system SHALL preserve the address data as part of the order record (defined in Address Preservation section).

### Default Address Selection

WHEN a customer manages their addresses, THE system SHALL allow the customer to designate one address as the default shipping address.

THE system SHALL allow only one default address per customer at any time.

WHEN a customer sets a new default address, THE system SHALL remove the default designation from any previously selected default address.

WHEN a customer has no addresses saved, THE system SHALL not have a default address.

WHEN a customer has multiple addresses but no default, THE system SHALL require address selection during checkout.

WHEN a customer has a default address, THE system SHALL use it as the pre-selected option during checkout.

### Address Selection During Checkout

WHEN a customer proceeds to checkout, THE system SHALL require the customer to select a shipping address.

THE system SHALL present all saved addresses from the customer's account for selection.

IF the customer has a default address, THE system SHALL pre-select it in the address selection interface.

WHEN a customer selects an address during checkout, THE system SHALL use that address for the order being placed.

WHEN an order is placed, THE system SHALL record the selected shipping address as part of the order record.

ONCE an order is placed, THE system SHALL not allow the shipping address to be changed for that order.

IF the customer does not have any saved addresses, THE system SHALL require the customer to add a new address before proceeding with checkout.

### Address Preservation and Order History

WHEN a customer places an order, THE system SHALL create a snapshot of the shipping address used at the time of purchase.

THE order address snapshot SHALL preserve the complete address state including recipient name, phone number, street address, city, state or province, postal code, and country.

WHEN a customer deletes their account, THE system SHALL preserve all order records including their associated shipping addresses.

THE preserved addresses SHALL remain accessible in order history for legal and business record purposes.

WHEN a customer views their order history, THE system SHALL display the shipping address that was used for each order at the time of purchase.

IF a saved address is edited or deleted after an order is placed, THE system SHALL NOT modify the address recorded in the order record.

THE address preservation SHALL ensure that order history remains accurate and complete for dispute resolution and legal compliance.

## Review Concept

A Review is customer feedback about a purchased product including a star rating and optional text content. Customers can only write a review after the order item status is delivered. Each customer can write one review per product per order. Reviews display on the product detail page sorted by newest first. The product's average rating is calculated from all non-deleted reviews. Customers can edit their own reviews after submission. Every review edit creates a snapshot preserving the previous rating and content. Customers can delete their own reviews, but snapshots remain in the system. Deleted customer reviews are preserved but no longer affect the average rating calculation. When a customer deletes their account, their reviews remain visible as from a deleted user. Reviews help other customers make informed purchasing decisions.

### Review Creation and Eligibility

WHEN a customer purchases a product variant, THE system SHALL allow the customer to write a review for that product.

WHEN a customer attempts to write a review, THE system SHALL verify that:
1. The customer has purchased the product
2. The order item status for that product is "delivered"
3. The customer has not already written a review for this product in this order

IF the order item status is not "delivered", THE system SHALL reject the review request.
IF the customer has already reviewed this product in this order, THE system SHALL reject the review request.
IF the customer has not purchased the product, THE system SHALL reject the review request.

A customer can write one review per product per order. Multiple purchases of the same product in different orders allow separate reviews for each order.

Review eligibility is verified at the time of review submission. The system SHALL check the current status of the order item before allowing review creation.

### Review Content and Rating

THE system SHALL require a star rating between 1 and 5 stars for every review.

THE system SHALL allow customers to optionally provide text content with their review.

WHEN a customer submits a review, THE system SHALL:
1. Record the star rating (1-5)
2. Record the optional text content
3. Record the timestamp of submission
4. Associate the review with the customer and the product

IF the rating is outside the 1-5 range, THE system SHALL reject the review request.
IF the rating is missing, THE system SHALL reject the review request.

THE star rating represents customer satisfaction with the purchased product. Higher ratings indicate better satisfaction.

Review content provides additional context about the customer's experience with the product. Text content is optional and may include detailed feedback about product quality, shipping experience, or product suitability.

### Review Editing and Deletion

WHEN a customer edits their review, THE system SHALL:
1. Create a snapshot of the review before the edit
2. Update the rating and/or content with new values
3. Record the timestamp of the edit
4. Preserve all previous snapshots

THE system SHALL allow customers to edit only their own reviews.

THE system SHALL allow customers to delete their own reviews.

WHEN a customer deletes their review, THE system SHALL:
1. Mark the review as deleted (soft delete)
2. Preserve all review snapshots
3. Remove the review from product display
4. Exclude the review from average rating calculation

IF a customer attempts to edit another customer's review, THE system SHALL reject the request.
IF a customer attempts to delete another customer's review, THE system SHALL reject the request.

Review snapshots are immutable records that preserve the history of all changes to a review. Snapshots include the previous rating, previous content, new rating, new content, and the timestamp of change.

### Review Display and Aggregation

THE system SHALL calculate the average rating for each product based on all non-deleted reviews.

WHEN calculating average rating, THE system SHALL:
1. Include only reviews with isDeleted = false
2. Sum all ratings from non-deleted reviews
3. Divide by the count of non-deleted reviews
4. Round to one decimal place

IF a review is deleted, THE system SHALL exclude it from average rating calculation.
IF a customer deletes their account, THE system SHALL preserve their reviews but mark them as from a "deleted user".

Reviews are visible on the product detail page. All customers can view reviews for any product.

Reviews are sorted by newest first when displayed on the product detail page.

Deleted user reviews remain visible on the product detail page but are displayed with "deleted user" instead of the customer's name. Deleted user reviews are still included in average rating calculation if they were not individually deleted by the customer.

Review visibility is controlled by the review deletion status, not by customer account status.

### Review Constraints

THE system SHALL enforce a one-review-per-product-per-order constraint.

WHEN a customer submits a review, THE system SHALL verify that no existing review exists for the combination of:
1. The customer
2. The product
3. The order

IF a review already exists for this customer-product-order combination, THE system SHALL reject the new review request.

A customer can write multiple reviews for the same product if purchased in different orders. Each order allows one review per product.

A customer can write reviews for multiple different products within the same order.

Purchase verification occurs at review submission time. THE system SHALL confirm the customer has a delivered order item for the product before allowing review creation.

## Wishlist Concept

A Wishlist is a saved collection of products that customers want to purchase in the future. Customers can add products to their wishlist for later consideration. The wishlist displays products with their current information including price and availability. Customers can view their complete wishlist with paginated results. Customers can remove products from their wishlist at any time. Wishlist entries reference products, not specific variants. If a product is deleted by the seller, it is automatically removed from all wishlists. If a product becomes unavailable, it remains in the wishlist but may be marked accordingly. The wishlist helps customers track products they are interested in buying. Wishlist items can be added to the cart when the customer is ready to purchase.

### Wishlist Creation and Product Saving

WHEN a customer creates a wishlist, THE system SHALL:
1. Create an empty wishlist associated with the customer account
2. Allow the customer to add products to the wishlist
3. Preserve the wishlist across customer sessions

WHEN a customer adds a product to their wishlist, THE system SHALL:
1. Reference the product by its product ID, not by specific variant
2. Record the date and time when the product was added
3. Prevent duplicate entries for the same product in the wishlist
4. Store the product reference even if the product becomes unavailable

THE system SHALL maintain the wishlist as a persistent collection that survives customer logout and re-login.

THE system SHALL track interest in products through the wishlist, allowing customers to save products for future purchase consideration.

### Wishlist Viewing and Pagination

WHEN a customer views their wishlist, THE system SHALL:
1. Display all products currently in the customer's wishlist
2. Show paginated results when the wishlist contains many items
3. Display current product information including name, main image, and base price
4. Indicate product availability status (in stock, out of stock, unavailable)
5. Show the date when each product was added to the wishlist

WHEN the wishlist contains more products than can be displayed on one page, THE system SHALL:
1. Divide the wishlist into paginated pages
2. Allow the customer to navigate between pages
3. Display the current page number and total page count
4. Maintain the product order (typically by date added, newest first)

THE system SHALL preserve the wishlist content across multiple viewing sessions.

THE system SHALL display the total count of products in the wishlist.

### Wishlist Product Management

WHEN a customer removes a product from their wishlist, THE system SHALL:
1. Remove the product reference from the customer's wishlist
2. Allow removal of any product at any time
3. Not affect the product's availability for other customers

WHEN a seller deletes a product from the platform, THE system SHALL:
1. Automatically remove that product from all customer wishlists
2. Preserve the product deletion record for audit purposes
3. Not notify customers of the automatic removal

WHEN a product becomes unavailable (out of stock or seller suspended), THE system SHALL:
1. Keep the product in customer wishlists
2. Mark the product as unavailable in the wishlist display
3. Allow customers to remove unavailable products manually

THE system SHALL maintain product references in the wishlist independently of variant availability.

THE system SHALL ensure that wishlist products remain visible even if their variants are out of stock.

### Wishlist to Cart Conversion

WHEN a customer wants to purchase a product from their wishlist, THE system SHALL:
1. Allow the customer to select a specific variant for the product
2. Enable adding the selected variant to the shopping cart
3. Preserve the wishlist entry after adding to cart (unless customer removes it)

WHEN a customer adds a wishlist product to their cart, THE system SHALL:
1. Require selection of a specific variant (color, size, etc.)
2. Create a cart item with the selected variant and specified quantity
3. Maintain variant independence between wishlist and cart

THE system SHALL track customer interest through the wishlist as a separate concept from the shopping cart.

THE system SHALL allow customers to convert wishlist products to cart items when ready to purchase.

### Wishlist Persistence and Management

THE system SHALL maintain wishlist persistence across customer sessions without requiring manual saving.

THE system SHALL ensure that each wishlist entry references exactly one product, not multiple variants of the same product.

THE system SHALL allow customers to manage their wishlist through add, remove, and view operations.

THE system SHALL track the relationship between customers and their wishlisted products for future purchase intent.

THE system SHALL preserve wishlist data even when products undergo changes (price updates, variant modifications).

THE system SHALL display product availability status in the wishlist to inform purchase decisions.

## CartItem Concept

A CartItem represents a product variant that a customer has added to their shopping cart for purchase. Each cart item tracks the specific variant selected, quantity, and current price. When the same variant is added multiple times, quantities are combined into a single cart item. Customers can view their cart showing all items with product names, variant options, prices, and quantities. Customers can change the quantity of any item in their cart. Customers can remove items from their cart before checkout. The cart displays the total price of all items combined. If a variant's stock is less than the cart quantity, a warning is shown to the customer. If a variant is deleted or goes out of stock, it is marked as unavailable in the cart. Unavailable items cannot be included in checkout. Cart items are removed from the cart when the order is successfully placed.

### Cart Item Overview

A cart item represents a product variant selected by a customer for potential purchase. Each cart item tracks the specific variant chosen, the quantity desired, and the current price at the time of addition.

### Cart Item Definition

THE system SHALL represent a cart item as a combination of a customer and a product variant.

WHEN a customer adds a product variant to their cart, THE system SHALL create a cart item record.

THE system SHALL associate each cart item with exactly one customer.

THE system SHALL associate each cart item with exactly one product variant.

THE system SHALL record the quantity of each cart item.

THE system SHALL record the timestamp when each cart item was added.

THE system SHALL record the timestamp when each cart item was last updated.

### Variant Selection Requirement

WHEN a customer adds a product to their cart, THE system SHALL require the selection of a specific variant.

THE system SHALL NOT allow a customer to add a product without selecting a variant.

THE system SHALL display all available variants when a customer views a product detail page.

### Cart Item Attributes

THE system SHALL store the product name associated with each cart item.

THE system SHALL store the variant options associated with each cart item.

THE system SHALL store the unit price at the time the cart item was added.

THE system SHALL calculate and store the subtotal for each cart item based on quantity and unit price.

### Cart Quantity Management

Customers can manage quantities of items in their shopping cart through various operations.

### Adding Items to Cart

WHEN a customer adds a variant to their cart, THE system SHALL create a new cart item with quantity 1.

WHEN a customer adds a variant to their cart that already exists in their cart, THE system SHALL combine the quantities into a single cart item.

THE system SHALL NOT create duplicate cart items for the same variant.

WHEN adding to an existing cart item, THE system SHALL update the timestamp to reflect the modification.

### Changing Quantities

WHEN a customer changes the quantity of a cart item, THE system SHALL update the quantity value.

THE system SHALL accept quantity values of 1 or greater.

IF a customer sets a quantity of 0 or less, THE system SHALL reject the request.

WHEN a customer updates a cart item quantity, THE system SHALL recalculate the item subtotal.

### Quantity Limits

WHILE a variant has available stock, THE system SHALL allow customers to add quantities up to the available stock.

IF a customer attempts to set a cart quantity exceeding available stock, THE system SHALL allow the update but display a warning.

THE system SHALL NOT prevent customers from setting quantities higher than available stock, but shall warn them before checkout.

### Cart Display and Totals

Customers can view their cart contents and see calculated totals for all items.

### Viewing Cart Contents

WHEN a customer views their cart, THE system SHALL display all cart items associated with that customer.

THE system SHALL display each cart item with the product name.

THE system SHALL display each cart item with the variant options.

THE system SHALL display each cart item with the unit price.

THE system SHALL display each cart item with the quantity.

THE system SHALL display each cart item with the item subtotal.

THE system SHALL display the timestamp indicating when each item was added or last updated.

### Calculating Item Subtotals

THE system SHALL calculate each item subtotal as quantity multiplied by unit price.

THE system SHALL display the item subtotal for each cart item.

### Calculating Cart Total

THE system SHALL calculate the cart total as the sum of all item subtotals.

THE system SHALL display the cart total on the cart view page.

THE system SHALL recalculate the cart total whenever any cart item is added, modified, or removed.

### Cart Item Status Indicators

THE system SHALL display availability status for each cart item.

THE system SHALL indicate when a cart item is unavailable due to stock or deletion.

### Item Removal and Cart Editing

Customers can remove items from their cart or modify existing cart items before checkout.

### Removing Items from Cart

WHEN a customer requests to remove a cart item, THE system SHALL delete that cart item.

THE system SHALL remove the cart item immediately upon customer request.

THE system SHALL NOT require confirmation for item removal.

IF a customer removes all items from their cart, THE system SHALL display an empty cart state.

### Editing Cart Items

WHEN a customer edits a cart item quantity, THE system SHALL update the quantity and recalculate subtotals.

THE system SHALL allow customers to edit any cart item in their cart.

THE system SHALL NOT allow customers to edit the variant selection of an existing cart item.

IF a customer needs to change the variant, THE system SHALL require removal of the current item and addition of a new item with the desired variant.

### Cart State After Editing

WHEN a cart item is edited, THE system SHALL update the updated timestamp.

WHEN a cart item is removed, THE system SHALL NOT preserve the cart item record.

THE system SHALL preserve order history separately from cart items (defined in Order Item Concept).

### Stock Warnings and Availability

The system provides warnings when cart quantities exceed available stock or when variants become unavailable.

### Stock Quantity Warnings

WHEN a cart item quantity exceeds the variant's available stock, THE system SHALL display a warning to the customer.

THE system SHALL display the warning on the cart view page.

THE system SHALL indicate which cart items have insufficient stock.

THE system SHALL show the available stock quantity in the warning message.

### Out of Stock Variants

WHEN a variant's stock quantity reaches 0, THE system SHALL mark the variant as out of stock.

WHEN a variant is out of stock, THE system SHALL prevent customers from adding it to their cart.

IF a variant becomes out of stock while in a customer's cart, THE system SHALL mark the cart item as unavailable.

THE system SHALL display the cart item as unavailable but allow the customer to view it.

### Deleted Variant Handling

WHEN a seller deletes a product variant, THE system SHALL mark all cart items containing that variant as unavailable.

THE system SHALL display unavailable cart items with a deletion indicator.

THE system SHALL NOT automatically remove deleted variants from the customer's cart.

THE system SHALL prevent unavailable items from being included in checkout.

### Checkout Eligibility

Only available cart items can be included in the checkout process.

### Checkout Eligibility Rules

WHEN a customer proceeds to checkout, THE system SHALL validate all cart items for eligibility.

THE system SHALL include only available cart items in the checkout process.

THE system SHALL exclude unavailable cart items from checkout.

IF a cart item is marked as unavailable, THE system SHALL prevent the customer from checking out without addressing the issue.

### Handling Unavailable Items at Checkout

WHEN unavailable items exist in the cart, THE system SHALL display a message indicating which items cannot be checked out.

THE system SHALL offer the customer the option to remove unavailable items before proceeding.

THE system SHALL allow checkout to proceed with only the available items.

### Cart Items and Order Creation

WHEN an order is successfully placed, THE system SHALL remove all cart items included in that order.

THE system SHALL NOT remove cart items that were not included in the order.

THE system SHALL preserve cart items for variants not purchased.

### Cart Persistence

THE system SHALL maintain cart items across customer sessions.

THE system SHALL preserve cart items until they are removed by the customer or used in an order.

THE system SHALL NOT expire cart items based on time.

THE system SHALL associate cart items with the customer account, not with browser sessions.

## Shipment Concept

A Shipment is a physical package sent by a seller containing one or more order items. Each shipment has tracking information including carrier name and tracking number. Sellers can choose to ship items individually or bundle multiple items from the same seller into one shipment. Different sellers always ship separately, creating separate shipments for each seller's items. When a shipment is created, all items in it change to shipped status. Customers can view tracking information for each shipment associated with their order. Customers confirm delivery per shipment, not per individual item. When delivery is confirmed, all items in that shipment change to delivered status. If customers do not confirm delivery, items automatically become delivered after 14 days from shipping. Shipments enable tracking and delivery confirmation for multi-item orders.

### Shipment Creation Process

WHEN a seller ships order items, THE system SHALL:
1. Allow the seller to select one or more order items from the same seller to include in a shipment
2. Require the seller to enter tracking information (carrier name and tracking number)
3. Create a shipment record with the provided tracking information
4. Change the status of all items in the shipment to "shipped"
5. Associate the shipment with the seller who created it

IF a seller attempts to ship items from different sellers in one shipment, THE system SHALL reject the request.

IF a seller attempts to ship an item that is not in "paid" status, THE system SHALL reject the request.

IF a seller attempts to ship an item that is already in a shipment, THE system SHALL reject the request.

WHEN a shipment is created, THE system SHALL:
1. Record the shipped date and time
2. Associate all selected order items with the shipment
3. Preserve the shipment record even if products or variants are later deleted

A seller can create multiple shipments for their order items, bundling items as they choose.

### Tracking Information

THE system SHALL require each shipment to have tracking information consisting of:
1. Carrier name (required)
2. Tracking number (required)

WHEN a seller creates a shipment, THE system SHALL:
1. Require the carrier name to be provided
2. Require the tracking number to be provided
3. Store the tracking information with the shipment record

WHEN a customer views their order, THE system SHALL:
1. Display tracking information for each shipment associated with the order
2. Show which order items are included in each shipment
3. Allow customers to view tracking details per shipment

THE system SHALL preserve tracking information in the shipment record for dispute resolution and order history purposes.

### Item Bundling and Per-Seller Shipments

WHEN an order contains items from multiple sellers, THE system SHALL:
1. Create separate shipments for each seller's items
2. Never combine items from different sellers into one shipment
3. Allow each seller to ship their items independently

WHEN a seller ships their items, THE system SHALL:
1. Allow the seller to bundle multiple items into one shipment
2. Allow the seller to ship items individually in separate shipments
3. Ensure all items in the same shipment share the same tracking information

A shipment can contain:
1. One or more order items from the same seller
2. Items that belong to the same order (if from the same seller)
3. Items with the same tracking information

IF a customer purchases items from three different sellers, THE system SHALL create three separate shipments, one per seller.

THE system SHALL ensure that item bundling decisions are made solely by the seller shipping the items.

### Delivery Confirmation Process

WHEN a shipment is created, THE system SHALL:
1. Mark all items in the shipment as "shipped"
2. Record the shipped date and time
3. Make tracking information available to the customer

WHEN a customer confirms delivery of a shipment, THE system SHALL:
1. Change the status of all items in that shipment to "delivered"
2. Record the delivery confirmation date and time
3. Allow confirmation only for shipments that are in "shipped" status

IF a customer attempts to confirm delivery for a shipment that is not in "shipped" status, THE system SHALL reject the request.

THE system SHALL allow customers to view the delivery status of each shipment in their order.

Delivery confirmation is performed per shipment, not per individual order item.

### Automatic Delivery Rules

WHEN a shipment is marked as "shipped", THE system SHALL:
1. Start a 14-day countdown from the shipped date
2. Automatically change all items in the shipment to "delivered" status if the customer does not confirm within 14 days
3. Record the automatic delivery date and time

IF 14 days pass from the shipped date without customer confirmation, THE system SHALL:
1. Automatically change all items in the shipment to "delivered" status
2. Record that the delivery was automatic (not customer-confirmed)
3. Notify the customer of the automatic delivery

THE system SHALL allow customers to confirm delivery at any time before the 14-day automatic delivery occurs.

WHEN automatic delivery occurs, THE system SHALL:
1. Preserve the original shipped date for order history
2. Record the automatic delivery timestamp
3. Enable review writing for all items in the shipment (as per review eligibility rules)

The 14-day rule ensures orders progress to delivered status even if customers do not manually confirm.

## Snapshot Concept

A Snapshot is an immutable record that preserves the state of data at a specific point in time. Snapshots are created whenever editable data is modified to maintain an audit trail. Each snapshot records when the change was made, what was changed, and the values before and after. Snapshots apply to products, variants, seller profiles, order items, reviews, and cancellation or refund requests. Snapshots are immutable and cannot be deleted once created. Relevant parties such as owners and administrators can view snapshots for dispute resolution. Product snapshots include all product fields plus snapshots of all variants at that moment. Order item snapshots preserve the product, variant, and seller profile state at purchase time. Review snapshots preserve the previous rating and content when edits occur. Snapshots ensure data integrity and provide historical context for business transactions.

### Snapshot Fundamentals

WHEN any editable data is modified in the system, THE system SHALL create a snapshot of the data before the modification.

Snapshots SHALL be immutable records that cannot be altered or deleted once created.

Snapshots SHALL serve as a complete audit trail for all data modifications in the system.

Snapshots SHALL preserve the exact state of data at the point in time when the change occurred.

Snapshots SHALL enable comprehensive change tracking across all business entities.

THE system SHALL automatically create snapshots for all supported entity types without requiring explicit user action.

THE system SHALL ensure that snapshot creation is atomic with the data modification to prevent inconsistent states.

THE system SHALL prevent any modification or deletion of existing snapshots after creation.

### Snapshot Structure and Content

Snapshots SHALL record the exact timestamp when the change was made.

Snapshots SHALL record what specific data fields were changed.

Snapshots SHALL record the values before the change occurred.

Snapshots SHALL record the values after the change occurred.

Snapshots SHALL identify the user or system component that initiated the change.

Snapshots SHALL maintain the relationship between the snapshot and the entity it represents.

THE system SHALL ensure that before and after values are complete and accurate for the changed fields.

THE system SHALL ensure that timestamp recording uses the system's standard time format.

THE system SHALL ensure that change tracking information is searchable and filterable for review purposes.

### Snapshot Types and Coverage

WHEN a product is edited, THE system SHALL create a product snapshot that includes all product fields.

Product snapshots SHALL include snapshots of all product variants at that moment in time.

Product snapshots SHALL preserve product name, description, category, base price, and images.

WHEN a product variant is edited, THE system SHALL create a variant snapshot.

Variant snapshots SHALL include SKU code, option values, price, and stock quantity.

WHEN a seller profile is edited, THE system SHALL create a seller snapshot.

Seller snapshots SHALL include shop name, shop description, and logo image.

WHEN an order is placed, THE system SHALL create an order item snapshot for each purchased variant.

Order item snapshots SHALL preserve the product state, variant state, and seller profile at the time of purchase.

WHEN a review is edited, THE system SHALL create a review snapshot.

Review snapshots SHALL preserve the previous rating and text content.

WHEN a cancellation request status changes, THE system SHALL create a cancellation snapshot.

WHEN a refund request status changes, THE system SHALL create a refund snapshot.

THE system SHALL preserve all snapshots even after the associated entity is deleted.

### Snapshot Access and Business Value

Relevant parties SHALL be able to view snapshots for dispute resolution purposes.

THE system SHALL provide access to snapshots for entity owners and administrators.

Snapshots SHALL ensure data integrity by maintaining an unalterable record of all changes.

Snapshots SHALL provide historical context for business transactions and decisions.

THE system SHALL allow administrators to view snapshots of any product for oversight purposes.

THE system SHALL allow sellers to view snapshots of their own products and variants.

THE system SHALL allow customers to view order item snapshots associated with their purchases.

THE system SHALL ensure that snapshots are available for the entire retention period defined by business policy.

THE system SHALL support querying snapshots by entity type, entity ID, timestamp range, and changed user.

THE system SHALL ensure that snapshot access does not expose sensitive information beyond the snapshot's purpose.

## InventoryRecord Concept

An InventoryRecord is a history entry that tracks stock quantity changes for each product variant. Current stock is calculated by summing all inventory records for a variant, not stored as a single value. Each record contains the quantity change amount, reason for the change, and timestamp. Positive changes represent restocking, while negative changes represent orders or adjustments. Sellers can add inventory through restocking with a specified quantity and reason. Sellers can subtract inventory through adjustments or loss recording with a reason. Order placement automatically creates a negative inventory record for purchased variants. Order cancellation or refund automatically creates a positive inventory record to restore stock. Sellers can view the complete inventory history for each variant. Inventory records provide transparency and accountability for stock movements.

### Inventory History Management

### Inventory History Management

WHEN a seller views the inventory history for a variant, THE system SHALL display all inventory records associated with that variant.

THE system SHALL display the following information for each inventory record:
- Quantity change amount (positive or negative)
- Reason for the change
- Timestamp when the change was recorded

Inventory records are immutable and cannot be modified or deleted once created.

THE system SHALL preserve all inventory records indefinitely for audit and transparency purposes.

Sellers can view the complete inventory history for any variant they own.

### Inventory Transparency

THE system SHALL provide full visibility into all stock movements for each variant.

Inventory history supports dispute resolution by preserving the complete trail of stock changes.

Administrators can view inventory history for any variant on the platform.

### Inventory Viewing

WHEN a seller requests to view inventory history, THE system SHALL return all records sorted by timestamp (newest first).

THE system SHALL paginate inventory history results for variants with many records.

Inventory viewing does not modify any stock data or create new records.

### Stock Quantity Tracking

### Stock Quantity Tracking

THE system SHALL track stock quantity for each product variant individually.

Current stock quantity is calculated by summing all inventory records for a variant, not stored as a single value.

WHEN stock quantity reaches zero, THE system SHALL mark the variant as out of stock.

Out of stock variants shall be displayed as unavailable to customers.

Out of stock variants cannot be added to the shopping cart.

### Variant Inventory

Each product variant maintains its own independent inventory records.

THE system SHALL associate all inventory records with their respective variant via the SKU code.

Product-level operations do not directly modify inventory; only variant-level operations affect stock.

### Stock Calculation

THE system SHALL calculate current stock by summing all quantity changes in the inventory history.

Stock calculation shall be performed in real-time when inventory records are created or viewed.

THE system SHALL ensure stock calculation accuracy by validating that all records are properly attributed to their variants.

### Stock Tracking

THE system SHALL maintain a complete chronological record of all stock movements.

Stock tracking enables sellers to monitor inventory trends and identify patterns in stock changes.

### Inventory Operations

### Restocking Operations

WHEN a seller adds inventory through restocking, THE system SHALL create an inventory record with a positive quantity change.

THE system SHALL require the seller to specify the quantity being added.

THE system SHALL require the seller to provide a reason for the restocking operation.

Restocking operations increase the available stock for the variant.

### Stock Adjustment Operations

WHEN a seller performs a stock adjustment (for loss, damage, or correction), THE system SHALL create an inventory record with a negative quantity change.

THE system SHALL require the seller to specify the quantity being subtracted.

THE system SHALL require the seller to provide a reason for the adjustment.

Stock adjustments decrease the available stock for the variant.

### Quantity Change Rules

Positive quantity changes represent stock additions (restocking).

Negative quantity changes represent stock reductions (orders, adjustments, or losses).

Quantity changes must be non-zero values.

THE system SHALL validate that quantity changes do not result in negative stock levels.

### Inventory Reason Requirements

THE system SHALL require a descriptive reason for every inventory record created.

Inventory reasons provide context for stock movements and support audit requirements.

Reasons shall be visible in the inventory history for transparency.

### Automatic Stock Changes

### Order Inventory Deduction

WHEN a customer places an order, THE system SHALL automatically create negative inventory records for each purchased variant.

The quantity deducted shall equal the quantity purchased in the order item.

Inventory deduction occurs at the time of successful payment confirmation.

Order inventory deduction reduces the available stock before the item is shipped.

### Cancellation Stock Restoration

WHEN a cancellation request is approved for an order item, THE system SHALL automatically create a positive inventory record for the cancelled variant.

The quantity restored shall equal the quantity that was originally purchased.

Stock restoration occurs when the seller approves the cancellation request.

Cancelled items restore their stock quantities through the inventory system.

### Refund Stock Restoration

WHEN a refund request is approved for an order item, THE system SHALL automatically create a positive inventory record for the refunded variant.

The quantity restored shall equal the quantity that was originally purchased.

Stock restoration occurs when the seller approves the refund request.

Refunded items restore their stock quantities through the inventory system.

### Negative Inventory Records

Negative inventory records represent stock reductions from orders, adjustments, or losses.

Negative records are automatically created when orders are placed or when sellers perform stock adjustments.

Negative records must always have an associated reason describing the reduction.

### Positive Inventory Records

Positive inventory records represent stock additions from restocking or restoration.

Positive records are automatically created when cancellations or refunds are approved.

Positive records from restocking require seller input for quantity and reason.

Positive records from restoration automatically reference the original order context.

### Stock Calculation and Validation

### Stock Calculation Rules

Current stock quantity equals the sum of all quantity changes in the inventory history for a variant.

THE system SHALL ensure stock calculation includes all records regardless of their source (manual, order, cancellation, refund).

Stock calculation shall be accurate and reflect the true available quantity for purchase.

### Stock Availability Validation

WHEN a customer attempts to add a variant to cart, THE system SHALL validate that sufficient stock is available.

THE system SHALL prevent adding variants to cart when stock quantity is zero.

WHEN a customer attempts to checkout, THE system SHALL validate that all cart items have sufficient stock.

Cart items exceeding available stock shall display a warning to the customer.

### Inventory Record Integrity

THE system SHALL ensure all inventory records are properly attributed to their variants.

THE system SHALL prevent deletion or modification of existing inventory records.

THE system SHALL maintain chronological ordering of inventory records by timestamp.

Inventory records serve as the authoritative source for stock quantity calculations.

## CancellationRequest Concept

A CancellationRequest is a formal request by a customer to cancel an order item that has been paid but not yet shipped. Cancellation requests can only be made for order items with paid status. Each request includes a reason explaining why the customer wants to cancel. The seller of that item can approve or reject the cancellation request. When a seller responds, a snapshot of the request state is created for audit purposes. If approved, the order item is cancelled and the customer receives a refund for that item only. Cancelled items restore their stock quantities through inventory records. The remaining items in the order continue processing normally. If all items in an order are cancelled, the entire order status becomes cancelled. Cancellation requests enable customers to change their minds before items ship.

### Cancellation Request Initiation

WHEN a customer wants to cancel an order item, THE system SHALL allow them to submit a cancellation request.

WHEN a customer submits a cancellation request, THE system SHALL:
1. Verify the order item has paid status
2. Require a cancellation reason explaining why the customer wants to cancel
3. Record the request with the current timestamp
4. Associate the request with the specific order item
5. Set the initial request status to pending

WHEN a customer attempts to submit a cancellation request for an order item that is not in paid status, THE system SHALL reject the request.

WHEN a customer attempts to submit a cancellation request for an order item that is already cancelled or refunded, THE system SHALL reject the request.

WHEN a customer attempts to submit a cancellation request for an order item that has been shipped, THE system SHALL reject the request.

WHEN a customer submits a cancellation request without providing a reason, THE system SHALL reject the request.

A cancellation request can only be submitted for order items with paid status (pre-shipment cancellation).

A cancellation request can only be submitted once per order item.

### Seller Response Workflow

WHEN a cancellation request is submitted, THE system SHALL notify the seller of that order item.

WHEN a seller reviews a cancellation request, THE system SHALL allow them to approve or reject the request.

WHEN a seller approves a cancellation request, THE system SHALL:
1. Update the request status to approved
2. Record the response timestamp
3. Create a snapshot of the request state for audit purposes
4. Proceed with cancelling the order item

WHEN a seller rejects a cancellation request, THE system SHALL:
1. Update the request status to rejected
2. Record the response timestamp
3. Create a snapshot of the request state for audit purposes
4. Notify the customer of the rejection

WHEN a seller responds to a cancellation request, THE system SHALL create a snapshot recording the state before and after the response.

A seller can only respond to cancellation requests for their own products.

A seller cannot modify a cancellation request after submitting their response.

WHEN a cancellation request remains pending for an extended period, THE system SHALL allow the seller to respond at any time before the item ships.

The request workflow follows this sequence: pending → approved/rejected.

A cancellation request transitions to approved or rejected status only once.

### Cancellation Execution

WHEN a cancellation request is approved, THE system SHALL cancel the associated order item.

WHEN an order item is cancelled, THE system SHALL:
1. Update the order item status to cancelled
2. Restore the stock quantity for the cancelled variant
3. Create an inventory record documenting the stock restoration
4. Record the reason for stock restoration as "cancellation"

WHEN an order item is cancelled, THE system SHALL process a refund for that item only.

WHEN only some items in an order are cancelled, THE system SHALL maintain the remaining items in their current status.

WHEN remaining items in an order continue processing after a partial cancellation, THE system SHALL:
1. Keep paid items in paid status awaiting shipment
2. Allow the seller to ship the remaining items normally
3. Update the overall order status based on the remaining item statuses

A cancelled order item cannot be reactivated or un-cancelled.

Stock restoration occurs automatically when an item is cancelled.

The refund amount equals the unit price multiplied by the quantity of the cancelled item.

### Order Status Impact

WHEN all items in an order are cancelled, THE system SHALL update the overall order status to cancelled.

WHEN some items in an order are cancelled and others remain in paid status, THE system SHALL update the order status to reflect the mixed state.

WHEN an order contains items in different statuses (e.g., some cancelled, some paid), THE system SHALL calculate the order status based on the remaining active items.

WHEN a customer submits a cancellation request, THE system SHALL prevent the seller from shipping that specific item.

WHEN an order item enters the cancellation workflow, THE system SHALL block any shipment actions for that item until the request is resolved.

Pre-shipment cancellation is the only window for customers to cancel items before they ship.

Once an item is shipped, cancellation requests are no longer accepted (customers must use refund requests instead).

The order status reflects the aggregate state of all items within that order.

### Audit and Snapshots

WHEN a seller responds to a cancellation request, THE system SHALL create an immutable snapshot of the request state.

WHEN a cancellation snapshot is created, THE system SHALL record:
1. The timestamp of when the change was made
2. The request status before the response
3. The request status after the response
4. The identity of the seller who responded

Cancellation snapshots are immutable and cannot be deleted.

Snapshots are preserved even if the order or order item is later modified.

Administrators can view cancellation snapshots for dispute resolution.

Sellers can view snapshots of their own cancellation request responses.

WHEN a refund is processed for a cancelled item, THE system SHALL record the refund transaction.

WHEN a refund is processed, THE system SHALL:
1. Calculate the refund amount based on the item price and quantity
2. Process the refund through the payment gateway
3. Update the order item status to cancelled (not refunded, as this is pre-shipment cancellation)
4. Notify the customer of the refund confirmation

Refund processing for cancelled items occurs automatically upon approval.

Refund amounts are returned to the original payment method used by the customer.

## RefundRequest Concept

A RefundRequest is a formal request by a customer to receive a refund for a delivered order item. Refund requests can only be made for order items with delivered status. Customers must submit refund requests within 7 days of the item being delivered. Each request includes a reason explaining why the customer wants a refund. The seller of that item can approve or reject the refund request. When a seller responds, a snapshot of the request state is created for audit purposes. If approved, the order item is refunded and the customer receives their money back. Refunded items restore their stock quantities through inventory records. The remaining items in the order are unaffected by the refund. If all items in an order are refunded, the entire order status becomes refunded. Refund requests provide a formal process for post-delivery returns.

### Refund Request Creation

WHEN a customer requests a refund for a delivered order item, THE system SHALL:
1. Require the order item to have "delivered" status
2. Accept a refund reason as text content
3. Enforce a 7-day window from the delivery date
4. Record the request with timestamp and customer identity
5. Set the initial request status to "pending"

IF the order item status is not "delivered", THE system SHALL reject the refund request.
IF more than 7 days have passed since delivery, THE system SHALL reject the refund request.
IF the refund reason is missing or empty, THE system SHALL reject the refund request.

A refund request represents a post-delivery return process where customers can formally request money back for items they have received but are unsatisfied with.

### Refund Request Workflow

WHEN a refund request is submitted, THE system SHALL:
1. Notify the seller of the product that owns the order item
2. Set the request status to "pending" awaiting seller response
3. Allow the seller to view the refund reason and item details
4. Enable the seller to approve or reject the request

WHEN a seller approves a refund request, THE system SHALL:
1. Change the request status to "approved"
2. Process the refund for that specific order item only
3. Record the approval timestamp and seller identity
4. Create a refund snapshot capturing the request state

WHEN a seller rejects a refund request, THE system SHALL:
1. Change the request status to "rejected"
2. Record the rejection timestamp and seller identity
3. Create a refund snapshot capturing the request state
4. Notify the customer of the rejection

IF a seller does not respond to a refund request, THE system SHALL maintain the "pending" status until action is taken.

### Refund Processing and Stock Restoration

WHEN a refund request is approved, THE system SHALL:
1. Change the order item status to "refunded"
2. Restore the stock quantity through an inventory record
3. Process the monetary refund to the customer
4. Record the stock restoration reason in inventory history

IF multiple items exist in the same order, THE system SHALL:
1. Refund only the specific item associated with the request
2. Leave remaining items in their current status
3. Allow other items to continue processing normally
4. Update the overall order status based on all item statuses

WHEN all items in an order are refunded, THE system SHALL:
1. Change the overall order status to "refunded"

WHEN only some items in an order are refunded, THE system SHALL:
1. Set the overall order status to "partiallyCompleted"
2. Maintain individual item statuses independently

A partial order refund allows customers to return specific items while keeping other items in the same order.

### Refund Snapshots and Audit Trail

WHEN a refund request status changes, THE system SHALL:
1. Create a refund snapshot recording the state transition
2. Capture the previous status value
3. Capture the new status value
4. Record the timestamp of the change
5. Record the actor who made the change (seller or system)

THE system SHALL ensure refund snapshots:
1. Are immutable and cannot be deleted
2. Preserve the complete state at each transition point
3. Are accessible to relevant parties (customer, seller, administrators)
4. Support dispute resolution and audit purposes

WHEN viewing refund request history, THE system SHALL:
1. Display all snapshots in chronological order
2. Show the status before and after each change
3. Display who made each change and when

Refund snapshots provide an immutable audit trail for all refund request state changes, ensuring transparency and accountability in the refund process.

## Administrator Concept

An Administrator is a user with elevated privileges to manage the platform and its users. Any customer or seller can submit a request to become an administrator with a reason. Super administrators can approve or reject administrator requests. There are two administrator grades: regular administrator and super administrator. Super administrators can promote regular administrators to super administrator grade. Super administrators can demote other super administrators to regular administrator grade. Super administrators cannot demote themselves from their position. Regular administrators can manage seller approvals, categories, products, orders, and users. Super administrators have additional privileges including managing other administrators. Administrators can view snapshots of any product for oversight purposes. Administrators can force-cancel or force-refund orders for policy enforcement.

### Administrator Request and Approval

WHEN a customer or seller wants to become an administrator, THE system SHALL allow them to submit an administrator request with a reason.

WHEN an administrator request is submitted, THE system SHALL record the request with the submitter's identity and the provided reason.

THE system SHALL store administrator requests in a pending state until a super administrator reviews them.

THE system SHALL NOT allow a user to submit multiple pending administrator requests simultaneously.

IF a user has a pending administrator request, THE system SHALL prevent them from submitting another request until the pending one is resolved.

WHEN a super administrator reviews administrator requests, THE system SHALL display the list of all pending requests with submitter details and reasons.

IF a super administrator approves an administrator request, THE system SHALL grant the user regular administrator privileges.

IF a super administrator rejects an administrator request, THE system SHALL record the rejection and notify the requester.

THE system SHALL preserve all administrator request records for audit purposes, including approved, rejected, and pending requests.

### Administrator Grades and Privileges

THE system SHALL define two administrator grades: regular administrator and super administrator.

THE system SHALL assign regular administrator privileges to users whose administrator requests are approved by super administrators.

Regular administrators SHALL have the ability to manage seller approvals, view pending seller registration requests, and approve or reject seller registrations.

Regular administrators SHALL have the ability to manage categories, including creating, editing, and deleting categories and subcategories.

Regular administrators SHALL have the ability to view all products on the platform and view product snapshots for oversight purposes.

Regular administrators SHALL have the ability to view all orders on the platform for oversight purposes.

Regular administrators SHALL have the ability to view all customer and seller accounts on the platform.

Regular administrators SHALL have the ability to ban and unban customer accounts.

Regular administrators SHALL have the ability to ban seller accounts, with existing orders remaining active.

Super administrators SHALL have all regular administrator privileges plus additional grade management capabilities.

Super administrators SHALL have the ability to promote regular administrators to super administrator grade.

Super administrators SHALL have the ability to demote other super administrators to regular administrator grade.

THE system SHALL enforce that super administrators cannot demote themselves from their position.

THE system SHALL preserve the grade hierarchy where super administrators have authority over regular administrators.

### Administrator Grade Management

WHEN a super administrator wants to promote a regular administrator, THE system SHALL allow them to change the user's grade to super administrator.

WHEN a super administrator promotes another user to super administrator grade, THE system SHALL create a snapshot of the grade change for audit purposes.

WHEN a super administrator wants to demote another super administrator, THE system SHALL allow them to change the user's grade to regular administrator.

WHEN a super administrator demotes another super administrator, THE system SHALL create a snapshot of the grade change for audit purposes.

IF a super administrator attempts to demote themselves, THE system SHALL reject the demotion request and prevent the action.

THE system SHALL enforce the self demotion restriction to prevent super administrators from removing their own elevated privileges.

THE system SHALL maintain an audit trail of all promotion and demotion actions, including who performed the action and when it occurred.

IF a user's administrator grade changes, THE system SHALL immediately update their available privileges according to their new grade.

THE system SHALL prevent grade changes from regular administrators to super administrators unless performed by a super administrator.

### Seller Management

Regular administrators SHALL have the ability to view the list of pending seller approval requests.

Regular administrators SHALL have the ability to approve seller registration requests, granting the seller ability to create and manage products.

Regular administrators SHALL have the ability to reject seller registration requests when providing a rejection reason.

WHEN a seller registration is rejected, THE system SHALL store the rejection reason and make it visible to the rejected seller.

Rejected sellers SHALL be able to view the rejection reason and submit a new registration request.

Regular administrators SHALL have the ability to suspend seller accounts for policy violations or other reasons.

WHEN a seller account is suspended, THE system SHALL hide their products from search and category listings.

WHEN a seller account is suspended, THE system SHALL prevent their products from being purchased.

WHEN a seller account is suspended, THE system SHALL allow them to continue processing existing orders (shipping items, responding to cancellation and refund requests).

WHEN a seller account is suspended, THE system SHALL prevent them from creating new products or editing existing products.

Regular administrators SHALL have the ability to unsuspend seller accounts, restoring product visibility and selling capabilities.

Regular administrators SHALL have the ability to ban seller accounts, preventing them from logging in while preserving existing orders.

Regular administrators SHALL have the ability to unban seller accounts, restoring their login capabilities.

### Category Management

Regular administrators SHALL have the ability to create new categories and subcategories for product organization.

Regular administrators SHALL have the ability to edit category names and descriptions.

Regular administrators SHALL have the ability to delete categories from the platform.

WHEN a category is deleted, THE system SHALL move all products in that category to uncategorized status.

THE system SHALL prevent deletion of categories that would break the one-level nesting structure.

Regular administrators SHALL have the ability to view all categories and their hierarchical relationships.

THE system SHALL preserve category change history through snapshots when categories are modified.

Categories SHALL remain accessible for historical reference even after products are moved due to category deletion.

### Product Oversight

Regular administrators SHALL have the ability to view all products on the platform, including those from all sellers.

Regular administrators SHALL have the ability to view product snapshots for any product on the platform for oversight purposes.

Regular administrators SHALL have the ability to delete any product from the platform for policy violations.

WHEN an administrator deletes a product, THE system SHALL preserve all product snapshots for audit and dispute resolution purposes.

WHEN a product is deleted by an administrator, THE system SHALL remove it from search and category listings.

WHEN a product is deleted by an administrator, THE system SHALL delete all variants and inventory records associated with the product.

THE system SHALL preserve order history and snapshots even when products are deleted by administrators.

Administrators SHALL NOT be able to modify product content directly, only view snapshots or delete products.

### Order Oversight

Regular administrators SHALL have the ability to view all orders on the platform for oversight purposes.

Regular administrators SHALL have the ability to view all order items across all orders.

Regular administrators SHALL have the ability to force-cancel individual order items for policy enforcement.

WHEN an administrator force-cancels an order item, THE system SHALL process a refund to the customer.

WHEN an administrator force-cancels an order item, THE system SHALL restore the stock quantity via an inventory record.

Regular administrators SHALL have the ability to force-cancel entire orders for policy enforcement.

WHEN an administrator force-cancels an entire order, THE system SHALL process refunds for all order items.

WHEN an administrator force-cancels an entire order, THE system SHALL restore stock quantities for all variants in the order.

Regular administrators SHALL have the ability to force-refund individual order items for policy enforcement.

WHEN an administrator force-refunds an order item, THE system SHALL process the refund to the customer.

WHEN an administrator force-refunds an order item, THE system SHALL restore the stock quantity via an inventory record.

Regular administrators SHALL have the ability to force-refund entire orders for policy enforcement.

WHEN an administrator force-refunds an entire order, THE system SHALL process refunds for all order items.

WHEN an administrator force-refunds an entire order, THE system SHALL restore stock quantities for all variants in the order.

THE system SHALL create snapshots of all force cancellation and force refund actions for audit purposes.

### User Management

Regular administrators SHALL have the ability to view all customer accounts on the platform.

Regular administrators SHALL have the ability to ban customer accounts for policy violations or other reasons.

WHEN a customer account is banned, THE system SHALL prevent them from logging in to the platform.

WHEN a customer account is banned, THE system SHALL preserve their order history and data for record-keeping.

Regular administrators SHALL have the ability to unban customer accounts, restoring their login capabilities.

Regular administrators SHALL have the ability to view all seller accounts on the platform.

Regular administrators SHALL have the ability to ban seller accounts for policy violations.

WHEN a seller account is banned, THE system SHALL prevent them from logging in to the platform.

WHEN a seller account is banned, THE system SHALL preserve their existing orders and order history.

Regular administrators SHALL have the ability to unban seller accounts, restoring their login capabilities.

THE system SHALL maintain audit logs of all user management actions including bans, unbans, and account views.

Administrators SHALL NOT be able to delete customer or seller accounts directly, only ban them to preserve historical records.

### Policy Enforcement

THE system SHALL support policy enforcement through administrator actions including force cancellations and force refunds.

WHEN an administrator performs policy enforcement actions, THE system SHALL create immutable snapshots of the action for audit purposes.

WHEN an administrator force-cancels or force-refunds an order item, THE system SHALL notify the affected customer.

WHEN an administrator force-cancels or force-refunds an order item, THE system SHALL notify the affected seller.

THE system SHALL preserve all policy enforcement actions in the audit trail for compliance and dispute resolution.

Administrators SHALL have the ability to view snapshots of any entity (products, orders, reviews, cancellation requests, refund requests) for policy enforcement purposes.

THE system SHALL ensure that policy enforcement actions do not violate the snapshot principle - all changes must be recorded immutably.

WHEN policy enforcement actions affect inventory, THE system SHALL create corresponding inventory records to maintain stock accuracy.

THE system SHALL prevent administrators from bypassing the snapshot principle when performing any platform management actions.

# Domain Relationships

Describe how concepts relate to each other from a business perspective.

## Conceptual Relationships

Describe how concepts relate to each other in business terms.

### Customer-Order Relationships

### Customer-Order Ownership

WHEN a customer places an order, THE system SHALL:
1. Associate the order with the customer who placed it
2. Record the customer as the owner of the order
3. Store the shipping address as part of the order record
4. Create order items for each purchased variant

THE system SHALL ensure that:
- Only the customer who placed an order can view its full details
- Customers can view all orders associated with their account
- Order history is preserved even if the customer deletes their account

### Order-Item Association

WHEN an order is created, THE system SHALL:
1. Create one or more order items within the order
2. Associate each order item with a specific product variant
3. Record the quantity and unit price for each order item
4. Group order items from the same seller into potential shipments

THE system SHALL maintain that:
- Each order item belongs to exactly one order
- Each order item belongs to exactly one product variant
- Order items can be from different sellers within the same order
- Each order item maintains its own independent status

### Address-Order Relationship

WHEN a customer places an order, THE system SHALL:
1. Associate the selected shipping address with the order
2. Create a snapshot of the address at the time of order placement
3. Preserve the address snapshot even if the customer updates their address later

THE system SHALL ensure that:
- The shipping address cannot be changed after order placement
- Address snapshots are preserved for order history and dispute resolution
- Deleted customer accounts preserve their order address snapshots

### Seller-Product Relationships

### Seller-Product Ownership

WHEN a seller creates a product, THE system SHALL:
1. Associate the product with the seller who created it
2. Record the seller as the owner of the product
3. Allow the seller to edit their own products
4. Prevent other sellers from editing the product

THE system SHALL ensure that:
- Only the product owner can edit or delete their products
- Administrators can view and delete any product for policy violations
- Product ownership is preserved in snapshots even after product deletion

### Product-Variant Composition

WHEN a seller creates a product, THE system SHALL:
1. Allow the seller to create multiple variants for the product
2. Associate each variant with exactly one product
3. Require at least one variant for the product to be purchasable

THE system SHALL maintain that:
- Each variant belongs to exactly one product
- Variants cannot exist without a parent product
- Deleting a product also deletes all its variants
- Product snapshots include snapshots of all variants at that moment

### Category-Product Classification

WHEN a seller creates a product, THE system SHALL:
1. Require the seller to assign the product to a category
2. Allow selection of either a main category or subcategory
3. Associate the product with the selected category

THE system SHALL ensure that:
- Products can be browsed by category
- When a category is deleted, its products become uncategorized
- Category assignments are preserved in product snapshots
- Customers can filter products by category

### Order-Item and Shipment Relationships

### Order-Item-Product Snapshot Chain

WHEN an order item is created, THE system SHALL:
1. Create a product snapshot capturing the product state at purchase
2. Create a seller snapshot capturing the shop profile at purchase
3. Associate both snapshots with the order item

THE system SHALL ensure that:
- Product snapshots include all product fields and variant information
- Seller snapshots include shop name and logo at the time of purchase
- Snapshots remain immutable and cannot be deleted
- Snapshots are preserved even if the product or seller is later deleted

### Shipment-Item Bundling

WHEN a seller ships order items, THE system SHALL:
1. Allow the seller to select one or more order items for a shipment
2. Require all items in a shipment to belong to the same seller
3. Associate the selected order items with the created shipment
4. Share tracking information across all items in the shipment

THE system SHALL maintain that:
- Each shipment belongs to exactly one seller
- Each order item can belong to at most one shipment
- Different sellers always create separate shipments
- Items in the same shipment share the same delivery status

### Review, Wishlist, and Cart Relationships

### Review-Product-Customer Association

WHEN a customer writes a review, THE system SHALL:
1. Associate the review with the purchased product
2. Associate the review with the customer who wrote it
3. Verify the customer purchased and received the product

THE system SHALL ensure that:
- Each customer can write only one review per product per order
- Reviews are displayed on the product detail page
- Product average rating is calculated from all non-deleted reviews
- Review snapshots are created when reviews are edited

### Wishlist-Product Reference

WHEN a customer adds a product to their wishlist, THE system SHALL:
1. Create a wishlist item associating the customer with the product
2. Store the product reference (not a specific variant)
3. Allow the customer to view all their wishlist items

THE system SHALL ensure that:
- When a product is deleted, it is automatically removed from all wishlists
- Wishlist items are paginated for viewing
- Customers can remove products from their wishlist
- Wishlist does not track variant-level preferences

### CartItem-Variant Selection

WHEN a customer adds an item to their cart, THE system SHALL:
1. Require selection of a specific product variant
2. Associate the cart item with both the customer and the variant
3. Combine quantities if the same variant is already in the cart

THE system SHALL maintain that:
- Each cart item belongs to exactly one customer
- Each cart item references exactly one product variant
- Cart items are removed when the order is placed
- Cart items are validated against current stock availability

### Request and Snapshot Relationships

### Request-OrderItem Dependency

WHEN a customer requests cancellation or refund, THE system SHALL:
1. Associate the request with the specific order item
2. Require the order item to be in the appropriate status (paid for cancellation, delivered for refund)
3. Create snapshots when the request status changes

THE system SHALL ensure that:
- Each cancellation request belongs to exactly one order item
- Each refund request belongs to exactly one order item
- Sellers of the order item can approve or reject the request
- Request snapshots preserve the state at each transition

### Inventory-Variant Tracking

WHEN inventory is managed, THE system SHALL:
1. Associate each inventory record with a specific product variant
2. Record quantity changes with reasons and timestamps
3. Calculate current stock by summing all inventory records

THE system SHALL maintain that:
- Each inventory record belongs to exactly one product variant
- Inventory records are immutable and cannot be deleted
- Stock quantity is derived from inventory history, not stored directly
- Negative inventory records are created on order placement
- Positive inventory records are created on cancellation or refund

### Snapshot-Entity Immutability

WHEN any tracked entity is modified, THE system SHALL:
1. Create a snapshot recording the change
2. Associate the snapshot with the modified entity
3. Record who made the change and when

THE system SHALL ensure that:
- Snapshots are immutable and cannot be deleted
- Snapshots record previous and current values
- Relevant parties can view snapshots for dispute resolution
- Snapshot types include: product, variant, seller, orderItem, review, cancellation, refund

## Lifecycle and Retention

Describe business rules for concept lifecycle and data retention from a user perspective.

### Account Lifecycle and Deletion Policy

WHEN a customer deletes their account, THE system SHALL:
1. Mark the account as deleted and prevent future login
2. Delete all personal profile information (display name, phone number)
3. Preserve all order records and order history for legal and seller record purposes
4. Preserve all reviews but display them as "deleted user" instead of the original customer name
5. Remove the customer from all active shopping carts
6. Remove the customer from all wishlists (products remain available)
7. Remove the customer from any pending cancellation or refund requests (requests remain but are associated with deleted user)

WHEN a seller deletes their account, THE system SHALL:
1. Verify the seller has no pending orders (paid or shipped status)
2. Verify the seller has no pending cancellation or refund requests
3. If verification passes, delete the seller account and prevent future login
4. Delete all products from active listings immediately
5. Preserve all order history and product snapshots for legal purposes
6. Preserve the shop name in past orders for historical reference
7. Remove all products from search and category listings

WHEN a seller account is suspended by an administrator, THE system SHALL:
1. Hide all products from search and category listings immediately
2. Prevent customers from adding the seller's products to cart
3. Allow the seller to process existing orders (ship items, respond to requests)
4. Prevent the seller from creating new products or editing existing products
5. Preserve all data for potential unsuspension

IF a seller attempts to delete their account with pending orders, THE system SHALL reject the deletion request and display an error message.
IF a seller attempts to delete their account with pending cancellation or refund requests, THE system SHALL reject the deletion request and display an error message.

### Product Lifecycle and Deletion Policy

WHEN a product is created by a seller, THE system SHALL:
1. Set the initial status to "active"
2. Make the product visible in search and category listings
3. Allow customers to add the product to cart (if variants exist and are in stock)
4. Create an initial product snapshot recording the creation state

WHEN a product is edited by a seller, THE system SHALL:
1. Create a new product snapshot before applying changes
2. Preserve the previous state in the snapshot for audit purposes
3. Update the product with the new values
4. Propagate changes to all product images and variants as applicable

WHEN a product is deleted by a seller, THE system SHALL:
1. Verify no pending order items exist for any variant (paid or shipped status)
2. Verify no pending cancellation or refund requests exist for any variant
3. If verification passes, mark the product status as "deleted"
4. Remove the product from all search and category listings
5. Delete all product variants and their inventory records
6. Preserve all product snapshots for audit and dispute resolution
7. Remove the product from all customer wishlists automatically

IF a product is deleted by an administrator (for policy violation), THE system SHALL:
1. Mark the product status as "deleted" regardless of order status
2. Preserve all order items associated with the product for historical records
3. Preserve all snapshots for audit purposes

WHEN a product is in "deleted" status, THE system SHALL:
1. Prevent it from appearing in any product listings
2. Prevent customers from adding it to cart
3. Allow administrators to view all associated snapshots
4. Allow the seller to view all associated snapshots

### Order Lifecycle and Status Progression

WHEN an order is created, THE system SHALL:
1. Assign a unique order number
2. Record the order date and time
3. Calculate and store the total price
4. Set the initial order status based on item statuses
5. Create snapshots of all purchased products and variants
6. Create snapshots of all seller profiles involved in the order
7. Decrease stock quantities for all purchased variants
8. Remove purchased items from the customer's cart

WHEN an order item status changes to "paid", THE system SHALL:
1. Record the payment confirmation timestamp
2. Make the item available for seller to ship
3. Include the item in order status calculations

WHEN an order item status changes to "shipped", THE system SHALL:
1. Record the shipment timestamp and tracking information
2. Make the item available for customer delivery confirmation
3. Start the 14-day auto-delivery timer for the item

WHEN an order item status changes to "delivered", THE system SHALL:
1. Record the delivery confirmation timestamp
2. Make the item eligible for review writing
3. Make the item eligible for refund requests (within 7 days)

WHEN an order item is cancelled, THE system SHALL:
1. Restore the stock quantity for the cancelled variant
2. Process the refund for the cancelled item only
3. Update the overall order status based on remaining items

WHEN an order item is refunded, THE system SHALL:
1. Restore the stock quantity for the refunded variant
2. Process the refund to the customer
3. Update the overall order status based on remaining items

IF all items in an order are cancelled, THE system SHALL set the order status to "cancelled".
IF all items in an order are refunded, THE system SHALL set the order status to "refunded".
IF all items in an order are delivered, THE system SHALL set the order status to "delivered".
IF items in an order have mixed statuses, THE system SHALL set the order status to "partially completed".

### Snapshot Archival and Audit Trail

WHEN any editable data is modified in the system, THE system SHALL:
1. Create a snapshot record before applying the changes
2. Record the timestamp of the change
3. Record what fields were changed
4. Record the values before the change
5. Record the values after the change
6. Record which user initiated the change
7. Mark the snapshot as immutable (cannot be modified or deleted)

THE system SHALL create snapshots for the following entities:
1. Products (all fields including images)
2. Product variants (SKU code, option values, price)
3. Seller profiles (shop name, description, logo)
4. Order items (product, variant, and seller profile at time of purchase)
5. Reviews (rating, text content)
6. Cancellation requests (reason, status changes)
7. Refund requests (reason, status changes)

WHEN a product is deleted, THE system SHALL:
1. Preserve all product snapshots permanently
2. Make snapshots accessible to the original seller
3. Make snapshots accessible to administrators
4. Use snapshots for dispute resolution and audit purposes

WHEN a review is deleted by the customer, THE system SHALL:
1. Mark the review as deleted but preserve the content
2. Preserve all review snapshots
3. Exclude the review from average rating calculations
4. Make snapshots accessible to administrators

THE system SHALL ensure snapshots are never deleted, even when the source entity is deleted.
THE system SHALL ensure snapshots cannot be modified after creation.

### Inventory History and Stock Retention

WHEN inventory is added to a variant (restocking), THE system SHALL:
1. Create an inventory record with positive quantity change
2. Record the reason for restocking
3. Record the timestamp of the change
4. Update the current stock calculation
5. Update the variant's out-of-stock status if applicable

WHEN inventory is subtracted from a variant (order placement), THE system SHALL:
1. Create an inventory record with negative quantity change
2. Record the reason as "order"
3. Record the timestamp of the change
4. Update the current stock calculation
5. Mark the variant as out of stock if quantity reaches 0

WHEN inventory is adjusted (loss or correction), THE system SHALL:
1. Create an inventory record with the adjustment quantity
2. Record the reason for adjustment
3. Record the timestamp of the change
4. Update the current stock calculation

WHEN an order item is cancelled, THE system SHALL:
1. Create an inventory record with positive quantity change
2. Record the reason as "cancellation"
3. Restore the stock to the variant

WHEN an order item is refunded, THE system SHALL:
1. Create an inventory record with positive quantity change
2. Record the reason as "refund"
3. Restore the stock to the variant

THE system SHALL maintain complete inventory history for all variants.
THE system SHALL calculate current stock by summing all inventory records.
THE system SHALL never delete inventory records.

WHEN a variant is deleted by a seller, THE system SHALL:
1. Preserve all inventory records for audit purposes
2. Delete the variant from active listings
3. Prevent the variant from being added to cart
4. Make inventory history accessible to the seller and administrators

### Cancellation and Refund Request Lifecycle

WHEN a customer requests cancellation of an order item, THE system SHALL:
1. Verify the item has status "paid" (not yet shipped)
2. Create a cancellation request record with the provided reason
3. Set the request status to "pending"
4. Create a snapshot of the request state
5. Notify the seller of the pending request

WHEN a seller responds to a cancellation request, THE system SHALL:
1. Create a snapshot of the request state before applying changes
2. Update the request status to "approved" or "rejected"
3. Record the response timestamp
4. If approved, cancel the order item and restore stock
5. If rejected, keep the order item in its current state

WHEN a customer requests a refund for an order item, THE system SHALL:
1. Verify the item has status "delivered"
2. Verify the request is within 7 days of delivery
3. Create a refund request record with the provided reason
4. Set the request status to "pending"
5. Create a snapshot of the request state
6. Notify the seller of the pending request

WHEN a seller responds to a refund request, THE system SHALL:
1. Create a snapshot of the request state before applying changes
2. Update the request status to "approved" or "rejected"
3. Record the response timestamp
4. If approved, refund the order item and restore stock
5. If rejected, keep the order item in its current state

IF a cancellation or refund request is pending, THE system SHALL prevent the associated order item from being modified by other processes.

THE system SHALL preserve all cancellation and refund request snapshots permanently.
THE system SHALL make all request snapshots accessible to administrators for dispute resolution.

# Enums and State Machines

Enum type definitions and state transitions.

## Enum Definitions

Define all enum types with their allowed values and descriptions.

### Customer Account Status

THE system SHALL define the following account status types for customer accounts:

- **active**: Customer account is in normal use and can access all features
- **suspended**: Customer account is temporarily restricted by administrator
- **banned**: Customer account is permanently blocked from login

THE system SHALL enforce that each customer account has exactly one account status at all times.

THE system SHALL allow administrators to change customer account status between active, suspended, and banned states.

WHEN a customer account status changes to banned, THE system SHALL prevent the customer from logging in.

WHEN a customer account status changes to suspended, THE system SHALL restrict access to platform features based on administrator configuration.

### Seller Approval Status

THE system SHALL define the following approval status types for seller accounts:

- **pending**: Seller registration submitted, awaiting administrator review
- **approved**: Seller account approved and can create products and process orders
- **rejected**: Seller registration denied by administrator with reason provided

THE system SHALL enforce that each seller account has exactly one approval status at all times.

WHEN a seller registers, THE system SHALL set their approval status to pending.

WHEN an administrator approves a seller, THE system SHALL change their approval status to approved.

WHEN an administrator rejects a seller, THE system SHALL change their approval status to rejected and store the rejection reason.

WHEN a seller's approval status is rejected, THE system SHALL allow them to submit a new registration request.

### Product Status

THE system SHALL define the following product status types:

- **active**: Product is visible in search and category listings and can be purchased
- **deleted**: Product has been removed by seller or administrator and is hidden from listings
- **suspended**: Product is temporarily hidden due to seller suspension

THE system SHALL enforce that each product has exactly one status at all times.

WHEN a seller creates a product, THE system SHALL set its status to active.

WHEN a seller or administrator deletes a product, THE system SHALL change its status to deleted and remove it from search and category listings.

WHEN a seller is suspended, THE system SHALL change all their active products to suspended status.

WHEN a seller is unsuspended, THE system SHALL change their suspended products back to active status.

### Order Status

THE system SHALL define the following order status types:

- **paid**: All order items have been paid, waiting for shipment
- **shipped**: At least one order item has been shipped but none delivered
- **delivered**: All order items have been delivered
- **cancelled**: All order items have been cancelled
- **refunded**: All order items have been refunded
- **partiallyCompleted**: Order has mixed item states (e.g., some delivered, some refunded)

THE system SHALL derive the overall order status from its order item statuses according to the following rules:

- If all items are paid → order status is paid
- If any item is shipped (and none delivered) → order status is shipped
- If all items are delivered → order status is delivered
- If all items are cancelled → order status is cancelled
- If all items are refunded → order status is refunded
- If items have mixed states → order status is partiallyCompleted

### Order Item Status

THE system SHALL define the following order item status types:

- **paid**: Payment completed for this item, waiting for seller to ship
- **shipped**: Seller has shipped this item with tracking information
- **delivered**: Customer has confirmed delivery or auto-delivered after 14 days
- **cancelled**: Item was cancelled before shipment
- **refunded**: Item was refunded after delivery

THE system SHALL enforce that each order item has exactly one status at all times.

WHEN an order item is created, THE system SHALL set its status to paid.

WHEN a seller ships an item, THE system SHALL change its status to shipped.

WHEN a customer confirms delivery or 14 days pass, THE system SHALL change the item status to delivered.

WHEN a seller approves a cancellation request, THE system SHALL change the item status to cancelled.

WHEN a seller approves a refund request, THE system SHALL change the item status to refunded.

### Snapshot Type

THE system SHALL define the following snapshot type values:

- **product**: Snapshot of a product and its variants at a point in time
- **variant**: Snapshot of a product variant's options and price
- **seller**: Snapshot of a seller's profile (shop name, description, logo)
- **orderItem**: Snapshot of an order item at purchase time
- **review**: Snapshot of a review's rating and content
- **cancellation**: Snapshot of a cancellation request state change
- **refund**: Snapshot of a refund request state change

THE system SHALL create a snapshot with the appropriate type whenever editable data is modified.

THE system SHALL record the snapshot type to identify which entity type was captured in the snapshot.

### Cancellation Request Status

THE system SHALL define the following cancellation request status types:

- **pending**: Cancellation request submitted, awaiting seller response
- **approved**: Seller approved the cancellation, refund processed
- **rejected**: Seller rejected the cancellation request

THE system SHALL enforce that each cancellation request has exactly one status at all times.

WHEN a customer submits a cancellation request, THE system SHALL set its status to pending.

WHEN a seller approves a cancellation request, THE system SHALL change its status to approved.

WHEN a seller rejects a cancellation request, THE system SHALL change its status to rejected.

### Refund Request Status

THE system SHALL define the following refund request status types:

- **pending**: Refund request submitted, awaiting seller response
- **approved**: Seller approved the refund, payment returned
- **rejected**: Seller rejected the refund request

THE system SHALL enforce that each refund request has exactly one status at all times.

WHEN a customer submits a refund request, THE system SHALL set its status to pending.

WHEN a seller approves a refund request, THE system SHALL change its status to approved.

WHEN a seller rejects a refund request, THE system SHALL change its status to rejected.

## State Transitions

Define valid state transition paths for stateful concepts.

### Order Item Status Transitions

WHEN an order item is created after successful payment, THE system SHALL set its status to "paid".

WHEN a seller creates a shipment for an order item with "paid" status, THE system SHALL change the item status to "shipped".

WHEN a customer confirms delivery for a shipment, THE system SHALL change all items in that shipment to "delivered" status.

WHEN 14 days pass after shipping without customer confirmation, THE system SHALL automatically change all items in that shipment to "delivered" status.

IF a customer requests cancellation for an order item with "paid" status and the seller approves, THE system SHALL change the item status to "cancelled".

IF a customer requests cancellation for an order item with "shipped" or "delivered" status, THE system SHALL reject the request.

IF a customer requests a refund for an order item with "delivered" status and the seller approves, THE system SHALL change the item status to "refunded".

IF a customer requests a refund for an order item with "paid" or "shipped" status, THE system SHALL reject the request.

IF a customer requests a refund for an order item more than 7 days after delivery, THE system SHALL reject the request.

WHEN an administrator force-cancels an order item, THE system SHALL change its status to "cancelled" regardless of current status.

WHEN an administrator force-refunds an order item, THE system SHALL change its status to "refunded" regardless of current status.

### Order Status Transitions

WHEN all order items in an order have "paid" status, THE system SHALL set the order status to "paid".

WHEN any order item in an order has "shipped" status and no items have "delivered" status, THE system SHALL set the order status to "shipped".

WHEN all order items in an order have "delivered" status, THE system SHALL set the order status to "delivered".

WHEN all order items in an order have "cancelled" status, THE system SHALL set the order status to "cancelled".

WHEN all order items in an order have "refunded" status, THE system SHALL set the order status to "refunded".

WHEN order items have mixed statuses (e.g., some delivered, some refunded, some cancelled), THE system SHALL set the order status to "partiallyCompleted".

WHEN an order item status changes, THE system SHALL recalculate and update the parent order status based on all item statuses.

### Seller Account Status Transitions

WHEN a seller registers on the platform, THE system SHALL set their approval status to "pending".

WHEN an administrator approves a seller registration request, THE system SHALL change the seller's approval status to "approved".

WHEN an administrator rejects a seller registration request, THE system SHALL change the seller's approval status to "rejected" and record the rejection reason.

WHEN a seller with "rejected" status submits a new registration request, THE system SHALL reset their approval status to "pending".

WHEN an administrator suspends a seller account, THE system SHALL change the seller's account status to "suspended".

WHEN an administrator unsuspends a seller account, THE system SHALL change the seller's account status back to "active".

WHEN an administrator bans a seller account, THE system SHALL change the seller's account status to "banned".

WHEN an administrator unbans a seller account, THE system SHALL change the seller's account status back to "active".

### Product Status Transitions

WHEN a seller creates a product, THE system SHALL set its status to "active".

WHEN a seller deletes a product, THE system SHALL change its status to "deleted".

WHEN an administrator deletes a product (for policy violations), THE system SHALL change its status to "deleted".

WHEN an administrator suspends a seller account, THE system SHALL hide all their products from search and category listings (products remain in "active" status but are not visible).

WHEN an administrator unsuspends a seller account, THE system SHALL make their products visible again in search and category listings.

### Cancellation Request Status Transitions

WHEN a customer requests cancellation for an order item, THE system SHALL create a cancellation request with status "pending".

WHEN a seller approves a cancellation request, THE system SHALL change the request status to "approved" and the order item status to "cancelled".

WHEN a seller rejects a cancellation request, THE system SHALL change the request status to "rejected".

WHEN an administrator force-cancels an order item, THE system SHALL create a cancellation request with status "approved" and change the order item status to "cancelled".

### Refund Request Status Transitions

WHEN a customer requests a refund for an order item, THE system SHALL create a refund request with status "pending".

WHEN a seller approves a refund request, THE system SHALL change the request status to "approved" and the order item status to "refunded".

WHEN a seller rejects a refund request, THE system SHALL change the request status to "rejected".

WHEN an administrator force-refunds an order item, THE system SHALL create a refund request with status "approved" and change the order item status to "refunded".

### Shipment Status Transitions

WHEN a seller creates a shipment with tracking information, THE system SHALL set the shipment status to "shipped" and record the shipped date.

WHEN a customer confirms delivery for a shipment, THE system SHALL set the shipment status to "delivered" and record the delivered date.

WHEN 14 days pass after shipping without customer confirmation, THE system SHALL automatically set the shipment status to "delivered" and record the delivered date.

### Customer Account Status Transitions

WHEN a customer registers on the platform, THE system SHALL set their account status to "active".

WHEN an administrator bans a customer account, THE system SHALL change the customer's account status to "banned".

WHEN an administrator unbans a customer account, THE system SHALL change the customer's account status back to "active".

WHEN a customer deletes their account, THE system SHALL preserve their order history and reviews while removing their profile information.