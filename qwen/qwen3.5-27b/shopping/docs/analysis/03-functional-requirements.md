**shoppingMall — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## Customer Operations

Customers must register with an email and password to access any platform features, as guest browsing is not allowed. Registered customers can log in using their email and password credentials. Customers can change their password at any time to maintain account security. Each customer has a profile containing a display name and phone number that they can edit. Customers can delete their account, which removes their profile information while preserving their order history and reviews for legal and seller record purposes. When a customer deletes their account, their reviews remain visible but display as being from a deleted user. Customers can view their complete order history with all past purchases. Customers can search and browse products from all sellers on the platform.

### Customer Registration

Customers must register with an email address and password to access any platform features, as guest browsing is not allowed. When registering, the customer provides an email address and creates a password. The system validates that the email address is not already registered to another account. Upon successful registration, the customer account is created and the customer can immediately log in.

### Customer Login

Registered customers can log in to the platform using their email address and password. The system validates the credentials and grants access to the customer account. If the credentials are incorrect, the login is rejected and the customer can retry. Customers remain logged in until they explicitly log out or their session expires.

### Password Change

Customers can change their password at any time while logged in. When changing the password, the customer provides their current password and a new password. The system validates that the current password is correct before accepting the change. Upon successful password change, the customer must use the new password for subsequent logins.

### Customer Profile Management

Each customer has a profile containing a display name and phone number. Customers can view their current profile information at any time. Customers can edit their display name to update how they are shown on the platform. Customers can edit their phone number to update their contact information. Profile changes are immediately reflected in the system.

### Account Deletion

Customers can delete their account at any time. When a customer deletes their account, their profile information including display name and phone number is permanently removed from the system. The customer's order history is preserved in the system for seller records and legal purposes, even after account deletion. The customer's reviews are preserved but displayed as being from a deleted user. After account deletion, the customer cannot log in with the same credentials.

### Order History Viewing

Customers can view a list of all their past orders. The order history list displays each order with the order number, order date, total price, and overall order status. The order history is sorted with the most recent orders appearing first. Customers can view the full details of any order in their history, including all order items, shipping address, and shipment tracking information. Order history remains accessible even after the customer deletes their account, with orders preserved for record-keeping purposes.

### Product Browsing

Customers can browse products from all sellers on the platform. Customers can view a list of all product categories and subcategories available on the platform. When viewing a category, customers can see all products that belong to that category. Products in category listings display the main image, product name, base price or price range, seller shop name, and average rating if reviews exist.

### Product Search

Customers can search for products by entering product names in the search field. Search results display products from all sellers that match the search query. Search results are paginated to display a manageable number of products per page. Customers can filter search results by category to narrow down results to specific product types. Customers can filter search results by price range, specifying minimum and maximum prices. Customers can filter search results to show only products that are currently in stock. Customers can sort search results by newest first to see the most recently added products. Customers can sort search results by price from low to high. Customers can sort search results by price from high to low.

### Product Detail Viewing

Customers can view the full details of any product on the platform. The product detail page displays all images uploaded by the seller for that product. The product detail page shows the product name and full description. The product detail page displays the category the product belongs to. The product detail page shows the seller's shop name, which links to the seller's profile page. The product detail page lists all available variants with their option values, prices, and stock status. The product detail page displays the product's average rating and total number of reviews. The product detail page shows all reviews written for the product, sorted by newest first.

## Seller Operations

Sellers sign up with an email and password to create their seller account. Seller accounts require administrator approval before they can begin selling products. Sellers can log in with their email and password credentials after approval. Sellers can change their password at any time. Sellers can view their approval status, which shows pending, approved, or rejected states. If a seller registration is rejected, they can view the rejection reason provided by the administrator. Rejected sellers can submit a new registration request to become approved. Sellers can edit their shop profile including shop name, shop description, and logo image. Every profile edit creates a snapshot to preserve the previous state. Sellers can delete their account only if they have no pending orders and no pending cancellation or refund requests. When a seller deletes their account, their products are removed from listings but order history and shop name in past orders are preserved. Sellers can view a dashboard summary showing total products, order items, and pending requests.

### Seller Registration and Approval

THE shopping mall platform SHALL allow individuals to register as sellers using an email address and password.

WHEN a seller submits a registration request, THE shopping mall platform SHALL set the seller account to pending approval status.

THE shopping mall platform SHALL require administrator approval before a seller can begin selling products.

THE shopping mall platform SHALL allow sellers to view their current approval status, which shows whether their account is pending, approved, or rejected.

WHEN a seller registration is rejected by an administrator, THE shopping mall platform SHALL allow the seller to view the rejection reason provided by the administrator.

WHEN a seller's registration is rejected, THE shopping mall platform SHALL allow the seller to submit a new registration request to become approved.

### Seller Login and Password Management

THE shopping mall platform SHALL allow sellers to log in using their registered email address and password.

THE shopping mall platform SHALL prevent sellers from logging in while their account is in pending approval status.

THE shopping mall platform SHALL allow approved sellers to log in and access seller features.

THE shopping mall platform SHALL allow sellers to change their password at any time after logging in.

THE shopping mall platform SHALL require sellers to verify their current password before allowing a password change.

THE shopping mall platform SHALL allow sellers to use their new password immediately after a successful password change.

### Seller Profile Management

THE shopping mall platform SHALL allow sellers to create and edit their shop profile with a shop name, shop description, and logo image.

THE shopping mall platform SHALL allow sellers to update their shop name at any time.

THE shopping mall platform SHALL allow sellers to update their shop description at any time.

THE shopping mall platform SHALL allow sellers to upload and change their logo image at any time.

WHEN a seller edits their shop profile, THE shopping mall platform SHALL create a snapshot to preserve the previous state of the profile.

THE shopping mall platform SHALL allow customers to view seller profiles including shop name, description, and logo.

THE shopping mall platform SHALL preserve all profile snapshots even if the seller later deletes their account.

### Seller Account Deletion

THE shopping mall platform SHALL allow sellers to request deletion of their seller account.

THE shopping mall platform SHALL prevent sellers from deleting their account if they have any pending orders with paid or shipped status.

THE shopping mall platform SHALL prevent sellers from deleting their account if they have any pending cancellation requests.

THE shopping mall platform SHALL prevent sellers from deleting their account if they have any pending refund requests.

WHEN a seller successfully deletes their account, THE shopping mall platform SHALL remove all their products from search and category listings.

WHEN a seller deletes their account, THE shopping mall platform SHALL preserve order history and order snapshots for all past orders.

WHEN a seller deletes their account, THE shopping mall platform SHALL preserve the seller's shop name in all past order records.

THE shopping mall platform SHALL allow deleted sellers to view their order history after account deletion for record-keeping purposes.

### Seller Dashboard Viewing

THE shopping mall platform SHALL provide sellers with a dashboard showing a summary of their shop activities.

THE shopping mall platform SHALL display the total number of products the seller has created on the dashboard.

THE shopping mall platform SHALL display the total number of order items for the seller's products on the dashboard.

THE shopping mall platform SHALL display the number of pending cancellation requests on the dashboard.

THE shopping mall platform SHALL display the number of pending refund requests on the dashboard.

THE shopping mall platform SHALL allow sellers to view a list of all order items for their products.

THE shopping mall platform SHALL allow sellers to filter the order items list by item status.

## Administrator Operations

Any user can submit a request to become an administrator by providing a reason for the request. Super administrators can view the list of pending administrator promotion requests. Super administrators can approve or reject administrator promotion requests. When approved, the user becomes a regular administrator. Super administrators can promote regular administrators to super administrator grade. Super administrators can demote other super administrators to regular administrator grade, but cannot demote themselves. Administrators can view pending seller approval requests and approve or reject them. When rejecting a seller, administrators must provide a rejection reason. Administrators can suspend seller accounts, which hides their products from search and prevents new purchases while allowing existing order processing. Administrators can unsuspend seller accounts to restore product visibility. Administrators can create, edit, and delete categories and subcategories. Administrators can view all products and their snapshots on the platform. Administrators can delete any product for policy violations. Administrators can view all orders and force-cancel or force-refund items or entire orders. Administrators can view and ban customer or seller accounts, preventing login access.

### Administrator Promotion Request Submission

Any user on the platform can submit a request to become an administrator by providing a reason for the request. The request includes text explaining why the user wants administrator privileges. Super administrators can view the list of pending administrator promotion requests. Super administrators can approve administrator promotion requests. When a promotion request is approved, the user becomes a regular administrator. Super administrators can reject administrator promotion requests. Rejected promotion requests remain in the system for record-keeping purposes.

### Administrator Grade Management

Super administrators can promote regular administrators to super administrator grade. When a regular administrator is promoted, they gain super administrator privileges. Super administrators can demote other super administrators to regular administrator grade. When a super administrator is demoted, they lose super administrator privileges and become a regular administrator. Super administrators cannot demote themselves. Demoted super administrators retain their regular administrator status and can continue performing regular administrator operations.

### Seller Approval Request Management

Administrators can view the list of pending seller approval requests. Administrators can approve seller registration requests. When a seller request is approved, the seller account becomes active and the seller can begin selling products. Administrators can reject seller registration requests. When rejecting a seller request, administrators must provide a rejection reason. Rejected sellers can view the rejection reason in their account. Rejected sellers can submit a new registration request after being rejected.

### Seller Account Suspension

Administrators can suspend seller accounts. When a seller is suspended, their products are hidden from search results. When a seller is suspended, their products are hidden from category listings. When a seller is suspended, their products cannot be purchased by customers. When a seller is suspended, they can still process existing orders. When a seller is suspended, they can still ship items for existing orders. When a seller is suspended, they can still respond to cancellation requests. When a seller is suspended, they can still respond to refund requests. When a seller is suspended, they cannot create new products. When a seller is suspended, they cannot edit existing products. Administrators can unsuspend seller accounts. When a seller is unsuspended, their products become visible in search results again. When a seller is unsuspended, their products become visible in category listings again. When a seller is unsuspended, their products can be purchased by customers again. When a seller is unsuspended, they can create new products again. When a seller is unsuspended, they can edit existing products again.

### Category Creation and Management

Administrators can create new categories. Administrators can create subcategories under existing categories. Administrators can edit category names. Administrators can edit category descriptions. Administrators can delete categories. When a category is deleted, products in that category become uncategorized. When a category is deleted, the products remain on the platform. When a category is deleted, the products are not removed from the system.

### Product and Order Oversight

Administrators can view all products on the platform. Administrators can view product snapshots for any product. Administrators can delete any product on the platform. When an administrator deletes a product, it is removed from search results. When an administrator deletes a product, it is removed from category listings. When an administrator deletes a product, the deletion is for policy violations. Administrators can view all orders on the platform. Administrators can force-cancel individual order items. When an administrator force-cancels an item, the customer receives a refund. When an administrator force-cancels an item, stock quantities are restored. Administrators can force-cancel entire orders. When an administrator force-cancels an order, all items in the order are cancelled. When an administrator force-cancels an order, the customer receives a refund for all items. When an administrator force-cancels an order, stock quantities are restored for all items. Administrators can force-refund individual order items. Administrators can force-refund entire orders.

### User Account Banning

Administrators can view all customer accounts. Administrators can ban customer accounts. When a customer is banned, they cannot log in to the platform. Administrators can unban customer accounts. When a customer is unbanned, they can log in to the platform again. Administrators can view all seller accounts. Administrators can ban seller accounts. When a seller is banned, they cannot log in to the platform. When a seller is banned, their existing orders remain in the system. Administrators can unban seller accounts. When a seller is unbanned, they can log in to the platform again.

## Address Operations

Customers can add multiple shipping addresses to their account for flexible shipping options. Each shipping address includes recipient name, phone number, street address, city, state or province, postal code, and country. Customers can edit any of their existing shipping addresses to update information. Customers can delete shipping addresses they no longer need. Customers can set one address as their default shipping address for quick checkout. The default address is used automatically during checkout unless the customer selects a different address. Customers can view all their saved addresses in their account settings. Multiple addresses allow customers to ship to different locations such as home, work, or gift recipients.

### Address Creation

WHEN a customer wants to add a shipping address, THE system SHALL allow them to create a new shipping address with complete details.

THE system SHALL require the following information for address creation:
- Recipient name
- Phone number
- Street address
- City
- State or province
- Postal code
- Country

WHEN a customer provides all required address information, THE system SHALL save the address to their account.

THE system SHALL associate each address with the customer who created it.

THE system SHALL allow customers to add addresses for different shipping destinations such as home, work, or gift recipients.

### Address Editing

WHEN a customer wants to update their shipping address information, THE system SHALL allow them to edit any of their existing addresses.

THE system SHALL permit customers to modify recipient name, phone number, street address, city, state or province, postal code, and country.

WHEN a customer saves changes to an address, THE system SHALL update the stored address information.

THE system SHALL preserve the address in the customer's address list after editing.

### Address Deletion

WHEN a customer no longer needs a shipping address, THE system SHALL allow them to delete that address from their account.

THE system SHALL remove the deleted address from the customer's address list.

THE system SHALL permanently remove deleted addresses from the customer's available shipping options.

### Default Address Management

WHEN a customer wants to designate a preferred shipping address, THE system SHALL allow them to set one address as the default shipping address.

THE system SHALL maintain only one default address per customer at any time.

WHEN a customer sets a new default address, THE system SHALL remove the default designation from the previous default address.

THE system SHALL mark the default address clearly in the customer's address list.

### Default Address Auto-Selection

WHEN a customer proceeds to checkout, THE system SHALL automatically select the default shipping address if one exists.

THE system SHALL pre-populate the shipping address field with the default address during checkout.

THE system SHALL allow customers to change the shipping address during checkout before finalizing the order.

WHEN a customer selects a non-default address during checkout, THE system SHALL use that selected address for the order.

### Address List Viewing

WHEN a customer wants to see their saved shipping addresses, THE system SHALL display a list of all their addresses.

THE system SHALL show each address with: recipient name, phone number, street address, city, state or province, postal code, and country.

THE system SHALL indicate which address is set as the default shipping address.

THE system SHALL display addresses in the customer's account settings area.

WHEN a customer views their address list, THE system SHALL provide options to edit or delete each address.

THE system SHALL show all addresses regardless of how many the customer has saved.

### Flexible Shipping Destination Options

WHEN a customer needs to ship to different locations, THE system SHALL support multiple address storage for flexible shipping options.

THE system SHALL allow customers to maintain addresses for home delivery, work delivery, and gift recipient addresses.

WHEN a customer places an order, THE system SHALL allow them to select any saved address as the shipping destination.

THE system SHALL support different recipient names across addresses (enabling gift shipping to different people).

THE system SHALL support different phone numbers across addresses (enabling contact with different recipients).

WHEN a customer shops for multiple recipients, THE system SHALL allow them to quickly select the appropriate address for each order.

## Category Operations

Categories organize products into logical groups for easier customer browsing. Categories can have one level of subcategories for more granular organization. Each category has a name and description that administrators define. Only administrators can create new categories and subcategories. Administrators can edit category names and descriptions to keep them current. Administrators can delete categories, and products in deleted categories become uncategorized. Customers can browse the complete list of all categories available on the platform. Customers can view all products within a specific category or subcategory. Categories help customers discover products by type, style, or function.

### Category Creation by Administrators

Administrators can create new categories to organize products on the platform. Each category must have a name and description. Administrators can create subcategories that nest one level deep under parent categories. When creating a subcategory, administrators must select an existing parent category. Categories help organize products into logical groups for easier customer browsing and discovery. The system prevents administrators from creating subcategories under existing subcategories to maintain the one-level nesting structure. Category names and descriptions are defined by administrators to reflect the type, style, or function of products within that category.

### Category Editing by Administrators

Administrators can edit the name and description of existing categories to keep them current and accurate. When a category name is edited, the change is immediately reflected across all product listings and category browsing pages. When a category description is edited, the updated description is shown to customers browsing that category. Administrators can edit both parent categories and subcategories. Category edits do not affect products assigned to the category—products remain in the same category after edits. The system preserves the category structure when edits are made, maintaining all parent-child relationships between categories and subcategories.

### Category Deletion by Administrators

Administrators can delete categories that are no longer needed on the platform. When a category is deleted, all products that were assigned to that category become uncategorized. Products in deleted categories are not removed from the system—they remain accessible through search and other browsing methods. Deleted categories cannot be restored through the system. When a subcategory is deleted, products in that subcategory become uncategorized while the parent category remains intact. Category deletion does not affect order history or past purchases—products that were sold while in a category retain their order records regardless of category deletion.

### Category Browsing by Customers

Customers can browse the complete list of all categories available on the platform. The category list displays both parent categories and subcategories in a hierarchical structure. Customers can view category names and descriptions to understand what types of products each category contains. Subcategories are shown nested under their parent categories to help customers navigate the product organization. Customers can access the category list from the main navigation of the platform. The category list is available to all customers regardless of their account status or activity level.

### Product Discovery by Category

Customers can view all products within a specific category or subcategory. When customers select a category, the system displays all products assigned to that category. When customers select a subcategory, the system displays only products assigned to that subcategory, not products from the parent category. Products that are uncategorized do not appear in any category browsing view but remain searchable. Category browsing helps customers discover products by type, style, or function. The product listing within a category shows the main image, name, base price, seller shop name, and average rating for each product.

## Product Operations

Sellers can create products with a required name, description, category selection, and base price. Products belong to the seller who created them and are associated with their shop. Sellers can edit their own products to update information. Every product edit creates a snapshot to preserve the previous state for dispute resolution. Sellers can delete their own products only if there are no pending order items and no pending cancellation or refund requests for any variant. Deleting a product also removes all its variants and inventory records from the system. Deleted products no longer appear in search results or category listings. Product snapshots are preserved even after product deletion for historical records. Sellers can view snapshots of their own products to track changes over time. Administrators can view snapshots of any product on the platform for oversight purposes. Customers can view product details including all images, description, variants, and reviews.

### Product Creation

WHEN a seller creates a product, THE shopping mall platform SHALL require the seller to provide a product name, description, category selection, and base price.

THE shopping mall platform SHALL associate the newly created product with the seller who created it.

THE shopping mall platform SHALL make the product visible in search results and category listings after creation.

THE shopping mall platform SHALL allow the product to be purchasable only if it has at least one variant with available stock.

THE shopping mall platform SHALL display products without variants as "unavailable" in search results and category listings.

### Product Editing

WHEN a seller edits their own product, THE shopping mall platform SHALL allow updates to the product name, description, category, and base price.

WHEN a seller modifies any product field, THE shopping mall platform SHALL create a product snapshot to preserve the previous state.

THE shopping mall platform SHALL record in the snapshot when the change was made, what fields were changed, and the values before and after the change.

THE shopping mall platform SHALL include all product images and variant information in the product snapshot.

THE shopping mall platform SHALL preserve the snapshot even if the product is later deleted.

### Product Deletion

WHEN a seller attempts to delete their product, THE shopping mall platform SHALL check if any variants have pending order items with paid or shipped status.

IF a variant has pending order items, THEN THE shopping mall platform SHALL prevent the product deletion.

WHEN a seller attempts to delete their product, THE shopping mall platform SHALL check if any variants have pending cancellation requests.

IF a variant has pending cancellation requests, THEN THE shopping mall platform SHALL prevent the product deletion.

WHEN a seller attempts to delete their product, THE shopping mall platform SHALL check if any variants have pending refund requests.

IF a variant has pending refund requests, THEN THE shopping mall platform SHALL prevent the product deletion.

WHEN a product is successfully deleted, THE shopping mall platform SHALL also delete all variants associated with the product.

WHEN a product is successfully deleted, THE shopping mall platform SHALL delete all inventory records for the product's variants.

WHEN a product is deleted, THE shopping mall platform SHALL remove the product from search results and category listings.

WHEN a product is deleted, THE shopping mall platform SHALL preserve all product snapshots for historical records.

### Snapshot Viewing

WHEN a seller views their own product, THE shopping mall platform SHALL provide access to view all snapshots of that product.

WHEN an administrator views any product, THE shopping mall platform SHALL provide access to view all snapshots of that product.

THE shopping mall platform SHALL display snapshot information including when the change was made, what was changed, and the values before and after.

THE shopping mall platform SHALL preserve snapshots even after the product has been deleted.

THE shopping mall platform SHALL make snapshots immutable and prevent deletion of any snapshot.

### Product Detail Viewing

WHEN a customer views a product detail page, THE shopping mall platform SHALL display all product images.

THE shopping mall platform SHALL display the product name and description on the product detail page.

THE shopping mall platform SHALL display the product category on the product detail page.

THE shopping mall platform SHALL display the seller shop name with a link to the seller profile.

THE shopping mall platform SHALL display all available variants with their prices and stock status.

THE shopping mall platform SHALL display the average rating and total review count for the product.

THE shopping mall platform SHALL display all customer reviews for the product.

## ProductImage Operations

Sellers can upload multiple images for each product to showcase different angles and details. The first image in the list serves as the main or thumbnail image displayed in search results and listings. Sellers can reorder images to change which one appears as the main thumbnail. Sellers can delete images from their products when they are no longer needed or relevant. Image changes are included in product snapshots to preserve the complete product state at any point in time. Customers view all product images on the product detail page. Multiple images help customers make informed purchasing decisions by seeing the product from different perspectives.

### Multiple Product Image Upload

THE system SHALL allow sellers to upload multiple images for each product.

WHEN a seller creates a product, THE system SHALL allow them to upload one or more images.

WHEN a seller edits a product, THE system SHALL allow them to add additional images to the existing set.

### Main Thumbnail Image Designation

THE system SHALL designate the first image in the product's image list as the main thumbnail image.

THE system SHALL display the main thumbnail image in search results and product listings.

THE system SHALL allow sellers to change which image serves as the main thumbnail by reordering the image list.

### Image Reordering Capability

THE system SHALL allow sellers to reorder images for their products.

WHEN a seller reorders images, THE system SHALL update the display order immediately.

WHEN the image order is changed, THE system SHALL create a product snapshot to record the change.

### Image Deletion from Product

THE system SHALL allow sellers to delete images from their products.

WHEN a seller deletes an image, THE system SHALL remove it from the product's image list.

THE system SHALL require at least one image to remain on the product after deletion.

WHEN an image is deleted, THE system SHALL create a product snapshot to record the change.

### Image Changes in Snapshots

THE system SHALL include image changes in product snapshots.

WHEN images are added, deleted, or reordered, THE system SHALL record the previous and new image states in the snapshot.

THE system SHALL preserve the complete image configuration at the time of each snapshot.

### Complete Product State Preservation

THE system SHALL preserve the complete product state including all images in each snapshot.

THE system SHALL maintain image snapshots even after the product is deleted.

Administrators can view image snapshots for any product on the platform.

### Customer Image Viewing

THE system SHALL display all product images on the product detail page.

Customers can view all images associated with a product when viewing the product details.

THE system SHALL show images in the order specified by the seller.

### Informed Purchasing Decisions

THE system SHALL provide multiple product images to help customers make informed purchasing decisions.

Customers can view products from different angles and perspectives through the uploaded images.

THE system SHALL ensure all uploaded images are visible to customers browsing the product.

## ProductVariant Operations

Products can have multiple variants representing different option combinations like color and size. Each variant has a unique SKU code, option values, optional price override, and stock quantity. Sellers can add variants to their products to offer different options. Sellers can edit variant details including SKU code, option values, and price. Every variant edit creates a snapshot to preserve the previous state. Sellers can delete variants only if there are no pending order items and no pending cancellation or refund requests for that variant. A product must have at least one variant to be purchasable by customers. Products with no variants are visible in search but shown as unavailable for purchase. Customers can view all available variants with their prices and stock status on the product detail page. Out of stock variants cannot be added to the shopping cart.

### Variant Creation

Sellers can add multiple variants to their products to offer different option combinations such as color, size, or other product attributes.

When creating a variant, sellers must provide:
- A unique SKU code that identifies the specific variant
- Option values that define the variant characteristics (e.g., color: "Red", size: "Large")
- Stock quantity starting at zero or a positive number

Sellers may optionally specify a price for the variant that overrides the product's base price. If no variant price is specified, the base price applies.

The SKU code must be unique across all variants of the product. If a duplicate SKU code is attempted, the variant creation is rejected.

Each variant creation is immediately available for customer viewing on the product detail page.

### Variant Editing

Sellers can edit the details of their own product variants at any time.

Sellers may modify:
- The SKU code of the variant
- The option values (e.g., changing "Red" to "Burgundy")
- The variant price

Every time a seller edits a variant, the system automatically creates a snapshot that preserves the previous state of the variant, including all fields before the change.

The snapshot records when the change was made, what fields were changed, and the values before and after the modification.

Snapshots of variant edits are immutable and cannot be deleted. Sellers can view snapshots of their own variants. Administrators can view snapshots of any variant on the platform.

Variant edits take effect immediately for customers viewing the product.

### Variant Deletion

Sellers can delete their own product variants, but only under specific conditions.

A variant can be deleted only if:
- There are no pending order items with "paid" or "shipped" status for that variant
- There are no pending cancellation requests for that variant
- There are no pending refund requests for that variant

If any of these conditions are not met, the variant deletion is rejected.

When a variant is deleted:
- The variant is removed from the product
- All inventory records for that variant are deleted
- The variant no longer appears in search results or product listings
- Historical snapshots of the variant are preserved and remain viewable

Deleted variants cannot be restored, but their history remains accessible through snapshots.

### Product Variant Availability

A product must have at least one variant to be purchasable by customers.

Products with no variants are still visible in search results and category listings, but are displayed as "unavailable" for purchase.

When a product's last remaining variant is deleted, the product automatically becomes unavailable.

When a seller adds the first variant to a product, the product becomes purchasable and is no longer shown as unavailable.

Products with variants that are all out of stock are shown as "out of stock" rather than "unavailable".

### Customer Variant Viewing

Customers can view all available variants of a product on the product detail page.

For each variant, customers can see:
- The option values (e.g., color, size)
- The variant price (or base price if no override)
- The current stock status (in stock or out of stock)

Out of stock variants are clearly marked and cannot be selected for addition to the shopping cart.

When stock reaches zero for a variant, it is immediately shown as "out of stock" on the product detail page.

Customers can only add variants with available stock to their cart. Attempting to add an out of stock variant is prevented.

## InventoryRecord Operations

Each variant maintains its own stock quantity tracked through inventory history records. Inventory records capture quantity changes with positive values for restocking and negative values for orders or adjustments. Each record includes the reason for the change and a timestamp. Current stock is calculated by summing all inventory records for a variant. Sellers can add inventory by restocking with a quantity and reason. Sellers can subtract inventory through adjustments or loss reporting with a quantity and reason. Order placement automatically creates a negative inventory record for each purchased variant. Order cancellation or refund automatically creates a positive inventory record to restore stock. Sellers can view the complete inventory history for each variant to track all changes. When stock reaches zero, the variant displays as out of stock and cannot be added to cart.

### Stock Quantity Tracking

THE system SHALL track stock quantity for each product variant independently.

THE system SHALL calculate current stock by summing all inventory history records for a variant.

THE system SHALL maintain a running total of stock quantity based on positive and negative changes recorded in inventory history.

Each inventory record captures a single quantity change event with a timestamp.

Inventory records are immutable and cannot be modified after creation.

### Inventory Record Creation

THE system SHALL create an inventory record whenever stock quantity changes for a variant.

Each inventory record SHALL include the quantity change amount (positive or negative).

Each inventory record SHALL include a reason for the quantity change.

Each inventory record SHALL include a timestamp indicating when the change occurred.

Inventory records SHALL be created for restocking, order placement, cancellations, refunds, and manual adjustments.

### Manual Restocking Operations

Sellers SHALL be able to add inventory to a variant through manual restocking.

When restocking, sellers SHALL specify the quantity to add and provide a reason.

THE system SHALL create a positive inventory record when restocking is performed.

THE system SHALL update the current stock quantity by adding the restocked amount.

Restocking SHALL be available for any variant regardless of current stock level.

### Manual Inventory Adjustments

Sellers SHALL be able to subtract inventory from a variant through manual adjustment.

When adjusting inventory, sellers SHALL specify the quantity to remove and provide a reason.

THE system SHALL create a negative inventory record when adjustment is performed.

THE system SHALL update the current stock quantity by subtracting the adjusted amount.

Adjustments SHALL be used for loss reporting, damaged goods, or inventory corrections.

### Automatic Order Inventory Deduction

THE system SHALL automatically create a negative inventory record when an order is placed successfully.

THE system SHALL deduct stock quantity for each variant purchased in the order.

THE deduction SHALL equal the quantity of each variant ordered.

THE system SHALL record the order placement as the reason for the inventory deduction.

Inventory deduction SHALL occur only after successful payment processing.

### Automatic Stock Restoration

THE system SHALL automatically create a positive inventory record when an order item is cancelled.

THE system SHALL restore stock quantity for cancelled variants.

THE restoration SHALL equal the quantity of the cancelled item.

THE system SHALL record the cancellation as the reason for the stock restoration.

THE system SHALL automatically create a positive inventory record when an order item is refunded.

THE system SHALL restore stock quantity for refunded variants.

THE restoration SHALL equal the quantity of the refunded item.

THE system SHALL record the refund as the reason for the stock restoration.

### Inventory History Viewing

Sellers SHALL be able to view the complete inventory history for each variant they own.

THE system SHALL display all inventory records for a variant in chronological order.

Each displayed record SHALL show the quantity change, reason, and timestamp.

Sellers SHALL be able to review all historical stock changes for a variant.

Inventory history SHALL include both manual changes and automatic changes from orders.

### Stock Status and Cart Prevention

THE system SHALL display variants with zero stock as out of stock.

THE system SHALL display variants with positive stock as in stock.

THE system SHALL prevent customers from adding out of stock variants to their cart.

THE system SHALL show stock status on product detail pages.

THE system SHALL prevent checkout if cart contains out of stock variants.

## Wishlist Operations

Customers can add products to their wishlist to save items for future consideration. The wishlist stores products, not specific variants, allowing flexibility when purchasing later. Customers can view their complete wishlist with all saved products. The wishlist display is paginated to handle large numbers of saved items efficiently. Customers can remove products from their wishlist when they no longer want to save them. If a seller deletes a product, it is automatically removed from all customer wishlists. Customers can add products back to their wishlist if the seller recreates them. The wishlist helps customers track products they are interested in purchasing later.

### Product Addition to Wishlist

Customers can add products to their wishlist to save items for future consideration.

When adding a product to the wishlist, customers select the product they wish to save.

The wishlist stores products at the product level, not specific variants, allowing customers flexibility when purchasing later.

Customers can add the same product to their wishlist only once; duplicate additions are prevented.

Products added to the wishlist are immediately visible in the customer's wishlist view.

### Product-Level Storage

The wishlist stores products, not specific variants, enabling customers to choose any available variant at purchase time.

When a product is added to the wishlist, the system records the product identity without variant selection.

This product-level storage allows customers to purchase any variant of the saved product when they are ready to complete the purchase.

The wishlist maintains a record of when each product was added.

### Wishlist Viewing

Customers can view their complete wishlist containing all saved products.

The wishlist display shows product information including the main image, product name, base price, and seller shop name.

The wishlist display is paginated to efficiently handle large numbers of saved items.

Customers can navigate through multiple pages of their wishlist to view all saved products.

Products in the wishlist are displayed in a consistent order across pagination.

### Product Removal from Wishlist

Customers can remove products from their wishlist when they no longer want to save them.

When a customer removes a product from their wishlist, it is immediately removed from all wishlist pages.

Removed products no longer appear in the customer's wishlist view.

Customers can add removed products back to their wishlist at any time if the product still exists.

### Automatic Removal on Product Deletion

If a seller deletes a product, it is automatically removed from all customer wishlists that contain that product.

The automatic removal happens immediately when the product is deleted by the seller.

Customers are not notified when products are automatically removed from their wishlist due to deletion.

Deleted products no longer appear in any customer's wishlist after removal.

### Re-Addition Capability

Customers can add products back to their wishlist if the seller recreates them after deletion.

When a product is re-added to the wishlist after being removed, it appears in the customer's wishlist with the current product information.

The re-addition creates a new record of when the product was added to the wishlist.

Customers can manage re-added products the same way as any other wishlist item.

### Future Purchase Tracking

The wishlist helps customers track products they are interested in purchasing later.

Customers can reference their wishlist when ready to make a purchase decision.

Products in the wishlist remain available for purchase as long as they exist and are in stock.

The wishlist serves as a personal collection of products the customer wants to consider for future purchase.

## Cart Operations

Customers can add specific product variants to their shopping cart, not just products. When adding to cart, customers must select the quantity they want to purchase. If the same variant is already in the cart, quantities are combined into a single line item. Customers can view their cart to see all items they plan to purchase. The cart displays each item with product name, variant options, price, quantity, and subtotal. Customers can change the quantity of items in their cart before checkout. Customers can remove items from their cart if they decide not to purchase them. The cart shows the total price of all items combined. If a variant stock is less than the cart quantity, a warning is displayed to the customer. If a variant is deleted or goes out of stock, it is marked as unavailable in the cart. Unavailable items cannot be included in checkout.

### Cart Item Addition

WHEN a customer adds an item to their cart, THE shopping mall SHALL require selection of a specific product variant, not just the product.

WHEN a customer adds an item to their cart, THE shopping mall SHALL require the customer to specify the quantity they want to purchase.

WHEN a customer adds a variant to their cart that already exists in the cart, THE shopping mall SHALL combine the quantities into a single cart item instead of creating a duplicate entry.

WHEN a customer adds an item to their cart, THE shopping mall SHALL capture and store the price of the variant at the time of addition.

WHEN a customer attempts to add an out of stock variant to their cart, THE shopping mall SHALL prevent the addition and display an unavailable message.

### Cart Viewing and Display

Customers can view their shopping cart at any time to see all items they plan to purchase.

WHEN a customer views their cart, THE shopping mall SHALL display each cart item with the following information:
- Product name
- Variant options (e.g., color, size)
- Price per item
- Quantity
- Subtotal (price multiplied by quantity)

WHEN a customer views their cart, THE shopping mall SHALL show the total price calculated from all cart items combined.

### Cart Item Modification

WHEN a customer changes the quantity of an item in their cart, THE shopping mall SHALL update the quantity and recalculate the subtotal for that item.

WHEN a customer reduces the quantity of an item to zero, THE shopping mall SHALL remove the item from the cart.

WHEN a customer removes an item from their cart, THE shopping mall SHALL delete that cart item and recalculate the cart total.

WHEN a customer modifies cart quantities, THE shopping mall SHALL not affect the actual inventory stock levels until an order is placed.

### Cart Pricing and Availability

WHEN a customer views their cart, THE shopping mall SHALL calculate and display the total price by summing all item subtotals.

WHEN the stock quantity of a variant in the cart is less than the cart quantity, THE shopping mall SHALL display a warning message to the customer indicating insufficient stock.

WHEN a variant in the cart goes out of stock (stock reaches zero), THE shopping mall SHALL mark that cart item as unavailable.

WHEN a variant in the cart is deleted by the seller, THE shopping mall SHALL mark that cart item as unavailable.

WHEN a customer attempts to checkout with unavailable items in their cart, THE shopping mall SHALL prevent checkout and require removal of unavailable items before proceeding.

WHEN a customer views their cart, THE shopping mall SHALL clearly distinguish between available items and unavailable items using visual indicators or labels.

## CartItem Operations

Each cart item represents a specific product variant with a selected quantity. Cart items are created when customers add variants to their shopping cart. The cart item stores the variant details and price at the time of addition. Customers can update the quantity of existing cart items. If the updated quantity exceeds available stock, a warning is shown. Customers can delete cart items to remove them from their purchase plan. Cart items from the same variant are combined rather than creating duplicate entries. The cart item price reflects the variant price at the time of addition. Cart items are cleared from the cart when the order is successfully placed. Cart items are preserved if checkout is abandoned for later completion.

### Cart Item Variant Representation

Cart items represent specific product variants selected by customers for purchase. Each cart item stores the complete variant information including the variant's option values (such as color and size) at the time of addition to the cart. The cart item maintains a reference to the specific variant that was selected, ensuring customers can see exactly which product configuration they intend to purchase. When viewing the cart, customers can see the variant options associated with each cart item.

### Quantity Storage in Cart Item

Each cart item stores the quantity of the selected variant that the customer wishes to purchase. When a customer adds a variant to the cart, they specify the desired quantity. The cart item preserves this quantity value and displays it when the customer views their cart. Customers can see the quantity for each cart item in their shopping cart.

### Price Capture at Addition Time

When a variant is added to the cart, the cart item captures and stores the variant's price at that moment. This captured price is preserved in the cart item regardless of any subsequent price changes to the variant. The cart item displays the price that was in effect when the item was added to the cart. This ensures customers pay the price they saw when adding the item, not a potentially different price at checkout time.

### Quantity Update Capability

Customers can update the quantity of existing cart items in their shopping cart. When updating a quantity, customers can increase or decrease the amount of the variant they wish to purchase. The cart item reflects the updated quantity immediately after the change is made. Customers can modify quantities multiple times before proceeding to checkout.

### Stock Exceedance Warning

When a customer updates a cart item quantity to exceed the available stock for that variant, the system displays a warning to the customer. The warning indicates that the requested quantity is greater than the current stock level. The cart item remains in the cart despite the warning, but customers are informed of the stock limitation. Customers can reduce the quantity to match available stock or proceed with awareness of the potential issue.

### Cart Item Deletion

Customers can delete cart items to remove them from their shopping cart. When a cart item is deleted, it is completely removed from the cart and will not be included in the order. The deletion is immediate and the cart item no longer appears in the cart view. Customers can delete individual cart items without affecting other items in the cart.

### Same Variant Combination

When a customer adds a variant to the cart that is already present, the system combines the quantities instead of creating a separate cart item. The existing cart item's quantity is increased by the newly added quantity. This prevents duplicate cart items for the same variant and maintains a single line item per variant in the cart. The combined quantity is displayed as a single cart item.

### Price Preservation

The price captured when a cart item is created is preserved throughout the cart's lifetime. Even if the variant's price changes after the item is added to the cart, the cart item continues to display the original captured price. This preserved price is used for calculating the cart total and the final order total. The price remains unchanged until the cart item is removed or the order is placed.

### Order Placement Cart Clearing

When an order is successfully placed, all cart items are automatically removed from the customer's shopping cart. The cart is cleared completely after successful payment and order creation. This prevents the same items from being ordered again accidentally. The customer starts with an empty cart after completing a purchase.

### Abandoned Checkout Preservation

If a customer abandons the checkout process without completing the order, their cart items are preserved in the shopping cart. The cart remains intact with all items, quantities, and captured prices. Customers can return later to resume checkout with their cart items still present. Cart items persist across sessions until the customer completes checkout or manually removes items.

## Order Operations

Orders are created when customers successfully complete checkout with payment. Each order contains one or more order items that may be from different sellers. Orders are assigned a unique order number and order date. The order stores the shipping address selected by the customer at checkout. Once an order is placed, the shipping address cannot be changed. The overall order status is derived from the statuses of its individual items. Customers can view their complete order history sorted by newest first. The order list is paginated to display orders efficiently. Each order in the list shows order number, date, total price, and overall status. Customers can view full order details including all items, shipping address, and shipment tracking information. Order items are grouped into shipments when sellers ship them.

### Order Creation

WHEN payment succeeds, THE system SHALL create an order record.

THE system SHALL assign a unique order number to each order.

THE system SHALL record the order date when the order is created.

THE system SHALL store the shipping address selected by the customer at checkout.

THE system SHALL not allow shipping address changes after an order is placed.

AN order SHALL contain one or more order items.

Order items within an order MAY be from different sellers.

WHEN an order is created, THE system SHALL create a snapshot of each purchased product and variant.

WHEN an order is created, THE system SHALL create a snapshot of each seller's profile associated with the order items.

WHEN an order is created, THE system SHALL remove the purchased items from the customer's cart.

WHEN an order is created, THE system SHALL decrease stock quantities for each purchased variant.

### Order Status Derivation

THE system SHALL derive the overall order status from the statuses of its individual items.

WHEN all items in an order have status "paid", THE order status SHALL be "paid".

WHEN any item in an order has status "shipped" and no items have status "delivered", THE order status SHALL be "shipped".

WHEN all items in an order have status "delivered", THE order status SHALL be "delivered".

WHEN all items in an order have status "cancelled", THE order status SHALL be "cancelled".

WHEN all items in an order have status "refunded", THE order status SHALL be "refunded".

WHEN items in an order have mixed statuses (e.g., some delivered, some refunded), THE order status SHALL be "partially completed".

### Order History Viewing

Customers can view a list of all their orders.

THE order list SHALL be paginated.

THE order list SHALL be sorted by newest first.

Each order in the list SHALL display the order number.

Each order in the list SHALL display the order date.

Each order in the list SHALL display the total price.

Each order in the list SHALL display the overall order status.

### Order Detail Viewing

Customers can view the full details of any order they have placed.

Order details SHALL display a list of all order items.

Each order item SHALL show the product name.

Each order item SHALL show the variant options.

Each order item SHALL show the quantity purchased.

Each order item SHALL show the price at time of purchase.

Each order item SHALL show the current item status.

Order details SHALL display the shipping address used for the order.

Order details SHALL display a list of all shipments for the order.

Each shipment SHALL display tracking information including carrier name and tracking number.

Each shipment SHALL display which order items are included in that shipment.

## OrderItem Operations

Each order item represents a purchased product variant with a specific quantity. If a customer buys multiple units of the same variant, it becomes one order item with that quantity. Order items can be from different sellers within the same order. Each order item has its own independent status that can change separately. Order item statuses include paid, shipped, delivered, cancelled, and refunded. When an order is placed, all items start with paid status. A snapshot of the product, variant, and seller profile is saved with each order item at purchase time. This preserves the exact product details and price at the time of purchase. Order items can be individually cancelled or refunded without affecting other items. The order item status changes affect the overall order status calculation.

### Order Item Creation and Structure

WHEN a customer places an order, THE system SHALL create an order item for each unique product variant purchased.

WHEN a customer purchases multiple quantities of the same variant, THE system SHALL consolidate them into a single order item with the total quantity.

THE system SHALL allow order items from different sellers to exist within the same order.

WHEN an order is created, THE system SHALL generate a snapshot of each purchased product including name, description, category, and base price.

WHEN an order is created, THE system SHALL generate a snapshot of each purchased variant including SKU code, option values, and price.

WHEN an order is created, THE system SHALL generate a snapshot of each seller's profile including shop name and logo image.

THE system SHALL preserve all product and variant details exactly as they existed at the time of purchase.

THE system SHALL preserve the seller's shop name and logo exactly as they existed at the time of purchase.

WHEN viewing an order item, THE system SHALL display the product name from the purchase-time snapshot, not the current product name.

WHEN viewing an order item, THE system SHALL display the variant options from the purchase-time snapshot, not the current variant options.

### Order Item Status Transitions

WHEN an order is successfully created, THE system SHALL set all order items to paid status.

WHEN a seller creates a shipment containing order items, THE system SHALL change the status of all items in that shipment to shipped.

WHEN a customer confirms delivery for a shipment, THE system SHALL change the status of all items in that shipment to delivered.

WHEN fourteen days have passed since a shipment was created without customer confirmation, THE system SHALL automatically change the status of all items in that shipment to delivered.

WHEN a cancellation request for an order item is approved by the seller, THE system SHALL change the status of that order item to cancelled.

WHEN a refund request for an order item is approved by the seller, THE system SHALL change the status of that order item to refunded.

THE system SHALL allow each order item to have an independent status separate from other items in the same order.

THE system SHALL allow order items to be in different statuses simultaneously within the same order.

WHEN an order item is in paid status, THE system SHALL allow the customer to request cancellation.

WHEN an order item is in delivered status, THE system SHALL allow the customer to request a refund within seven days.

### Order Item Modification and Order Status Impact

WHEN a customer requests cancellation for an order item, THE system SHALL process only that specific item without affecting other items in the order.

WHEN a customer requests a refund for an order item, THE system SHALL process only that specific item without affecting other items in the order.

WHEN a seller approves a cancellation for an order item, THE system SHALL restore the stock quantity for that variant.

WHEN a seller approves a refund for an order item, THE system SHALL restore the stock quantity for that variant.

WHEN all order items in an order are cancelled, THE system SHALL set the overall order status to cancelled.

WHEN all order items in an order are refunded, THE system SHALL set the overall order status to refunded.

WHEN order items have mixed statuses (some delivered, some cancelled, some refunded), THE system SHALL set the overall order status to partially completed.

WHEN an order item status changes, THE system SHALL recalculate the overall order status based on all item statuses.

WHEN an order item is cancelled or refunded, THE system SHALL leave remaining items in the order unaffected and continue their normal processing.

THE system SHALL allow sellers to ship items individually or bundle multiple items from the same seller into a single shipment.

## Shipment Operations

A shipment is a package sent by a seller containing one or more order items. All items in a shipment must be from the same seller. Different sellers always create separate shipments for their items. Sellers can choose to ship items individually or bundle multiple items into one shipment. When creating a shipment, sellers enter tracking information including carrier name and tracking number. All items in the same shipment share the same tracking information. When a shipment is created, all included items change to shipped status. Customers can view tracking information for each shipment in their order details. Customers confirm delivery per shipment rather than per individual item. When a customer confirms delivery, all items in that shipment change to delivered status. If the customer does not confirm delivery, items automatically change to delivered status after 14 days from shipping.

### Shipment Package Creation

Sellers can create shipments to send order items to customers. A shipment can contain one or more order items from the same seller. Different sellers must create separate shipments for their respective items in an order. Sellers can choose to ship order items individually as separate shipments or bundle multiple items into a single shipment. When creating a shipment, sellers select which of their order items to include from orders with paid status items. Multiple order items from the same order can be combined into one shipment if they belong to the same seller. Order items from different sellers cannot be included in the same shipment.

### Tracking Information Entry

When creating a shipment, sellers must enter tracking information for the package. Sellers provide the carrier name that will deliver the shipment. Sellers provide a tracking number for the shipment. All order items included in the same shipment share the identical tracking information. The carrier name and tracking number apply to every item in the shipment. Sellers cannot assign different tracking information to individual items within the same shipment. The tracking information is immediately available to customers once the shipment is created.

### Shipped Status Transition

When a seller creates a shipment, all order items included in that shipment change to shipped status. The status change occurs immediately upon shipment creation. Order items that are not included in the shipment retain their current status. Customers can see which items in their order have been shipped by viewing the item status. The shipped status indicates that the seller has sent the item to the customer. Sellers can view which of their order items have been shipped and which are still awaiting shipment.

### Customer Tracking Viewing

Customers can view tracking information for each shipment in their order details. The order detail page displays all shipments associated with that order. Each shipment shows the carrier name and tracking number. Customers can see which order items are included in each shipment. Customers can view tracking information for shipments that have been created by sellers. The tracking information is visible immediately after the seller creates the shipment. Customers can access tracking information for all their orders through their order history.

### Delivery Confirmation

Customers confirm delivery per shipment rather than per individual order item. When a customer confirms delivery for a shipment, all order items in that shipment change to delivered status. The delivered status change occurs immediately upon customer confirmation. If a customer does not manually confirm delivery, items automatically change to delivered status after 14 days from the shipping date. The automatic delivery confirmation applies to all items in the shipment. Customers can manually confirm delivery before the 14-day period expires. Once items reach delivered status, customers can request refunds within 7 days. Customers can view when each shipment was marked as delivered, whether manually or automatically.

## Review Operations

Customers can write reviews for products they have purchased on the platform. A review can only be written after the order item status is delivered. Customers can write one review per product per order, allowing multiple reviews for the same product from different orders. Each review includes a required rating from 1 to 5 stars and optional text content. Reviews are displayed on the product detail page for other customers to see. Reviews are sorted by newest first to show recent feedback. Customers can edit their own reviews to update ratings or text content. Every review edit creates a snapshot to preserve the previous version. Customers can delete their own reviews, but the snapshots are preserved for record keeping. The product average rating is calculated from all non-deleted reviews. Reviews help other customers make informed purchasing decisions.

### Review Creation

WHEN a customer has an order item with delivered status, THE system SHALL allow the customer to write a review for that product.

WHEN a customer writes a review, THE system SHALL require a rating from 1 to 5 stars.

WHERE a customer purchases the same product in multiple orders, THE system SHALL allow one review per product per order.

WHERE a customer writes a review, THE system SHALL allow optional text content.

WHEN a review is submitted, THE system SHALL make it immediately visible on the product detail page.

### Review Display and Sorting

THE system SHALL display all reviews for a product on the product detail page.

THE system SHALL sort reviews by newest first, showing the most recent reviews at the top.

THE system SHALL display the average rating on the product detail page.

THE system SHALL display the total number of reviews on the product detail page.

WHERE reviews exist, THE system SHALL use them to help customers make informed purchasing decisions.

### Review Editing

WHEN a customer edits their own review, THE system SHALL allow updating the rating or text content.

WHEN a review is edited, THE system SHALL create a snapshot to preserve the previous version.

WHEN a review is edited, THE system SHALL replace the original review with the edited version on the product detail page.

THE system SHALL preserve all review snapshots for record-keeping purposes.

WHERE a customer edits a review multiple times, THE system SHALL create a new snapshot for each edit.

### Review Deletion

WHEN a customer deletes their own review, THE system SHALL remove it from the product detail page.

WHEN a review is deleted, THE system SHALL preserve all snapshots of that review.

WHEN a review is deleted, THE system SHALL exclude it from the average rating calculation.

THE system SHALL allow customers to delete only their own reviews.

### Average Rating Calculation

THE system SHALL calculate the average rating from all non-deleted reviews for a product.

THE system SHALL exclude deleted reviews from the average rating calculation.

WHEN a product has no reviews, THE system SHALL not display an average rating.

WHEN a new review is added, THE system SHALL recalculate the average rating.

WHEN a review is edited or deleted, THE system SHALL recalculate the average rating.

## CancellationRequest Operations

Customers can request cancellation for individual order items with paid status that have not yet shipped. Cancellation requests include a reason provided as text explaining why the customer wants to cancel. The seller of that item can approve or reject the cancellation request. When a seller responds to the request, a snapshot of the request state is created. If the seller approves the cancellation, that specific item is cancelled and a refund is processed for that item only. Cancelled items restore their stock quantities through inventory records. The remaining items in the order continue processing normally without interruption. If all items in an order are cancelled, the entire order status becomes cancelled. Cancellation is handled per order item, not for the entire order at once.

### Creating Cancellation Requests

Customers can request cancellation for individual order items that have paid status and have not yet been shipped. When creating a cancellation request, customers must provide a reason as text explaining why they want to cancel the item. The cancellation request is created for a specific order item, not for the entire order. Each cancellation request is associated with the order item it targets and records the customer's reason text. The system validates that the target order item has paid status before allowing the cancellation request to be created.

### Seller Response to Cancellation Requests

Sellers can view cancellation requests for order items containing their products. Sellers can approve cancellation requests, which cancels the targeted item and processes a refund for that item only. Sellers can reject cancellation requests, which keeps the order item in its current status and allows normal processing to continue. When a seller responds to a cancellation request (either approving or rejecting), the system automatically creates a snapshot of the request state. The snapshot records when the response was made, what action was taken, and the values before and after the response. This snapshot is immutable and preserved for dispute resolution purposes.

### Cancellation Effects on Items and Inventory

When a seller approves a cancellation request, the targeted order item status changes to cancelled. A refund is processed for the cancelled item only, not for other items in the order. The stock quantity for the variant of the cancelled item is restored through an inventory record. The inventory record contains a positive quantity change equal to the cancelled item quantity, with a reason indicating it was restored due to cancellation. The snapshot of the cancellation request preserves the reason provided by the customer and the approval action by the seller. Other order items in the same order are unaffected by the cancellation and continue their normal processing workflow.

### Order-Level Cancellation Status

Cancellation is handled per order item, not for the entire order at once. Each order item can be cancelled independently of other items in the same order. The remaining items in an order continue processing normally without interruption when one item is cancelled. If all items in an order are cancelled, the entire order status becomes cancelled. The order status is derived from the statuses of its individual items. Partial cancellations result in the order maintaining a partially completed status based on the remaining active items. Customers can view the cancellation status of each item individually within their order details.

## RefundRequest Operations

Customers can request a refund for individual order items with delivered status. Refund requests can only be made within 7 days of the item being delivered. Refund requests include a reason provided as text explaining why the customer wants a refund. The seller of that item can approve or reject the refund request. When a seller responds to the request, a snapshot of the request state is created. If the seller approves the refund, that specific item is marked as refunded. Refunded items restore their stock quantities through inventory records. The remaining items in the order are unaffected and maintain their current status. If all items in an order are refunded, the entire order status becomes refunded. Refund is handled per order item, not for the entire order at once.

### Refund Request Creation

WHEN a customer has an order item with delivered status, THE shopping mall platform SHALL allow the customer to request a refund for that individual item.

WHEN a customer submits a refund request, THE shopping mall platform SHALL verify that the request is within 7 days of the item's delivery date.

IF the 7-day refund window has expired, THE shopping mall platform SHALL reject the refund request.

WHEN a customer creates a refund request, THE shopping mall platform SHALL require the customer to provide a reason as text explaining why they want a refund.

WHEN a refund request is created, THE shopping mall platform SHALL associate the request with the specific order item being refunded.

WHEN a refund request is created, THE shopping mall platform SHALL record the date and time of the request submission.

### Seller Response to Refund Requests

WHEN a seller receives a refund request for their order item, THE shopping mall platform SHALL allow the seller to approve the request.

WHEN a seller receives a refund request for their order item, THE shopping mall platform SHALL allow the seller to reject the request.

WHEN a seller responds to a refund request (either approve or reject), THE shopping mall platform SHALL create a snapshot of the request state.

WHEN a seller approves a refund request, THE shopping mall platform SHALL mark the specific order item as refunded.

WHEN a seller rejects a refund request, THE shopping mall platform SHALL maintain the current status of the order item.

WHEN a seller responds to a refund request, THE shopping mall platform SHALL record the date and time of the seller's response.

### Refund Processing and Order Status

WHEN a seller approves a refund request, THE shopping mall platform SHALL restore the stock quantity for that item through inventory records.

WHEN an order item is refunded, THE shopping mall platform SHALL mark only that specific item as refunded, not the entire order.

WHEN an order item is refunded, THE shopping mall platform SHALL preserve the status of all remaining items in the same order.

WHEN all order items in an order are refunded, THE shopping mall platform SHALL update the overall order status to refunded.

WHEN some order items are refunded and others maintain different statuses, THE shopping mall platform SHALL set the overall order status to partially completed.

WHEN a refund is processed, THE shopping mall platform SHALL handle refunds on a per-item basis, allowing individual items to be refunded independently of other items in the same order.

## Snapshot Operations

Snapshots are automatically created whenever editable data is modified to preserve the previous state. Snapshots record when the change was made, what was changed, and the values before and after. Snapshots are immutable and cannot be deleted to maintain an accurate historical record. Product snapshots include all product fields and snapshots of all variants at that moment. This preserves the complete state of a product and its variants at any point in time. Snapshots are created for products, product variants, seller profiles, order items, reviews, cancellation requests, and refund requests. Owners of the data can view their own snapshots for reference and dispute resolution. Administrators can view snapshots of any data on the platform for oversight purposes. Snapshots provide a complete audit trail for all modifications made on the platform.

### Automatic Snapshot Creation

WHEN editable data is modified, THE system SHALL automatically create a snapshot to preserve the previous state.

WHEN a snapshot is created, THE system SHALL record when the change was made.

WHEN a snapshot is created, THE system SHALL record what fields were changed.

WHEN a snapshot is created, THE system SHALL record the values before and after the change.

WHEN a snapshot is created, THE system SHALL preserve it as immutable data that cannot be deleted or modified.

WHEN a snapshot is created, THE system SHALL associate it with the entity that was modified.

WHEN a snapshot is created, THE system SHALL associate it with the user who made the change.

### Product and Variant Snapshots

WHEN a product is edited, THE system SHALL create a product snapshot that includes all product fields.

WHEN a product snapshot is created, THE system SHALL include the product name, description, category, and base price.

WHEN a product snapshot is created, THE system SHALL include snapshots of all product variants at that moment.

WHEN a variant is edited, THE system SHALL create a variant snapshot that includes all variant fields.

WHEN a variant snapshot is created, THE system SHALL include the SKU code, option values, and price.

WHEN product images are modified, THE system SHALL include image changes in the product snapshot.

WHEN a product is deleted, THE system SHALL preserve all existing product and variant snapshots.

### Seller Profile Snapshots

WHEN a seller edits their profile, THE system SHALL create a seller profile snapshot.

WHEN a seller profile snapshot is created, THE system SHALL include the shop name, shop description, and logo image.

WHEN a seller profile snapshot is created, THE system SHALL record every edit as a separate snapshot.

WHEN a seller deletes their account, THE system SHALL preserve all existing seller profile snapshots.

### Order Item Snapshots

WHEN an order is placed, THE system SHALL create snapshots of each purchased product and variant.

WHEN an order item snapshot is created, THE system SHALL preserve the product name, description, and variant options.

WHEN an order item snapshot is created, THE system SHALL preserve the price at the time of purchase.

WHEN an order is placed, THE system SHALL create a snapshot of each seller's profile.

WHEN a seller profile snapshot is created for an order, THE system SHALL preserve the shop name and logo at the time of purchase.

WHEN an order is viewed, THE system SHALL display the product and seller information from the snapshot, not the current data.

### Review Snapshots

WHEN a customer edits a review, THE system SHALL create a review snapshot.

WHEN a review snapshot is created, THE system SHALL include the rating and text content.

WHEN a review is deleted, THE system SHALL preserve all existing review snapshots.

WHEN a review is edited, THE system SHALL record the previous rating and text content in the snapshot.

### Request Snapshots

WHEN a seller responds to a cancellation request, THE system SHALL create a cancellation request snapshot.

WHEN a cancellation request snapshot is created, THE system SHALL include the reason and status changes.

WHEN a seller responds to a refund request, THE system SHALL create a refund request snapshot.

WHEN a refund request snapshot is created, THE system SHALL include the reason and status changes.

WHEN a request snapshot is created, THE system SHALL record the response timestamp and the seller who responded.

### Owner Snapshot Viewing

WHEN a seller views their products, THE system SHALL allow them to view snapshots of their own products.

WHEN a seller views their variants, THE system SHALL allow them to view snapshots of their own variants.

WHEN a customer views their reviews, THE system SHALL allow them to view snapshots of their own reviews.

WHEN a seller views order items for their products, THE system SHALL allow them to view snapshots of cancellation and refund requests they responded to.

WHEN an owner views snapshots, THE system SHALL display the change timing, changed fields, and before and after values.

WHEN an owner views snapshots, THE system SHALL allow them to use snapshots for dispute resolution.

### Administrator Snapshot Viewing

WHEN an administrator views products, THE system SHALL allow them to view snapshots of any product on the platform.

WHEN an administrator views variants, THE system SHALL allow them to view snapshots of any variant on the platform.

WHEN an administrator views seller profiles, THE system SHALL allow them to view snapshots of any seller profile on the platform.

WHEN an administrator views reviews, THE system SHALL allow them to view snapshots of any review on the platform.

WHEN an administrator views requests, THE system SHALL allow them to view snapshots of any cancellation or refund request on the platform.

WHEN an administrator views snapshots, THE system SHALL display the change timing, changed fields, and before and after values.

WHEN an administrator views snapshots, THE system SHALL allow them to use snapshots for oversight and dispute resolution.

### Modification Audit Trail

WHEN data is modified on the platform, THE system SHALL maintain a complete audit trail through snapshots.

WHEN a user or administrator views the audit trail, THE system SHALL show all modifications in chronological order.

WHEN the audit trail is viewed, THE system SHALL display who made each change.

WHEN the audit trail is viewed, THE system SHALL display when each change was made.

WHEN the audit trail is viewed, THE system SHALL display what was changed and the before and after values.

WHEN snapshots are preserved, THE system SHALL maintain them for dispute resolution and platform oversight.

WHEN data is deleted, THE system SHALL preserve all associated snapshots to maintain the audit trail.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## Customer Error Scenarios

Customers must register with a valid email and password to access any platform features. The system rejects registration attempts with duplicate email addresses already in use. Password changes require the customer's current password for verification. When customers attempt to delete their account, the system preserves their order history and reviews while removing personal profile information. Reviews from deleted accounts display as 'deleted user' to maintain platform integrity. Customers cannot delete their account if they have any pending orders or active cancellation requests. The system prevents customers from logging in with incorrect email or password combinations. Account deletion is permanent and cannot be undone once completed.

### Duplicate Email Registration

WHEN a registration attempt is made with an email address already in use, THE system SHALL reject the registration and inform the customer that the email is already registered.

WHEN a customer attempts to register, THE system SHALL validate that the email address is not already associated with an existing account.

IF the email address exists in the system, THEN THE system SHALL prevent duplicate account creation and display an appropriate error message.

### Password Verification Failure

WHEN a customer attempts to change their password, THE system SHALL require the current password for verification.

IF the current password provided is incorrect, THEN THE system SHALL reject the password change request.

WHEN password verification fails, THE system SHALL inform the customer that the current password is incorrect without revealing whether the account exists.

### Account Deletion Restrictions

WHEN a customer attempts to delete their account, THE system SHALL check for any pending orders with paid or shipped status.

IF the customer has pending orders, THEN THE system SHALL block account deletion and inform the customer of the restriction.

WHEN a customer attempts to delete their account, THE system SHALL check for any active cancellation requests.

IF active cancellation requests exist, THEN THE system SHALL prevent account deletion until those requests are resolved.

WHEN a customer attempts to delete their account, THE system SHALL check for any pending refund requests.

IF pending refund requests exist, THEN THE system SHALL block account deletion and require resolution of those requests first.

### Pending Order Blocking

WHEN a customer has orders with paid status, THE system SHALL prevent account deletion until those orders are completed, cancelled, or refunded.

WHEN a customer has orders with shipped status, THE system SHALL block account deletion until delivery is confirmed or the items are cancelled/refunded.

IF all order items in an order are still in paid or shipped status, THEN THE system SHALL display a message explaining that pending orders must be resolved before account deletion.

### Deleted User Review Display

WHEN a customer deletes their account, THE system SHALL preserve all reviews written by that customer.

WHEN a review is associated with a deleted customer account, THE system SHALL display the reviewer as 'deleted user' on product detail pages.

WHEN customers view product reviews, THE system SHALL show the rating and text content of reviews from deleted users without revealing any personal information.

IF a customer deletes their account, THEN THE system SHALL maintain the review's contribution to the product's average rating calculation.

### Invalid Login Credentials

WHEN a customer attempts to log in with an incorrect password, THE system SHALL reject the login attempt.

WHEN a customer attempts to log in with an email address not registered in the system, THE system SHALL reject the login attempt.

IF login credentials are invalid, THEN THE system SHALL inform the customer of the failed login without specifying whether the email or password was incorrect.

WHEN multiple failed login attempts occur, THE system SHALL continue to require valid credentials for successful authentication.

### Permanent Account Removal

WHEN a customer confirms account deletion, THE system SHALL permanently remove their profile information including display name and phone number.

WHEN account deletion is completed, THE system SHALL prevent the customer from logging in with their previous email and password.

IF a customer attempts to use an email address from a deleted account for new registration, THE system SHALL allow the registration as a new account.

WHEN account deletion is finalized, THE system SHALL not provide any mechanism to recover or restore the deleted account.

### Profile Data Preservation

WHEN a customer deletes their account, THE system SHALL preserve all order history and order details for legal and business purposes.

WHEN account deletion occurs, THE system SHALL maintain snapshots of products and variants at the time of each purchase.

IF a customer's account is deleted, THEN THE system SHALL retain their shipping addresses as they appeared on completed orders.

WHEN a customer deletes their account, THE system SHALL preserve their reviews and ratings on products.

IF an order was placed by a customer who later deletes their account, THEN THE system SHALL maintain the order record with all item details and transaction history.

## Seller Error Scenarios

Sellers cannot begin selling until their account receives administrator approval. Rejected sellers can view the rejection reason and submit a new registration request. Sellers cannot delete their account while they have pending orders with paid or shipped status. Account deletion is blocked when pending cancellation or refund requests exist. When sellers delete their account, their products are removed from listings but order history remains preserved. Shop name and logo from past orders are retained even after account deletion. Sellers cannot edit their products if their account is suspended by an administrator. Suspended sellers can still process existing orders but cannot create new products or edit existing ones.

### Pending Approval Blocking

Sellers cannot begin selling products until their account receives administrator approval. Sellers with pending approval status cannot create new products. Sellers with pending approval status cannot edit existing products. Sellers with pending approval status cannot add inventory to their variants. Sellers with pending approval status cannot process orders for their products.

### Rejection Reason Viewing

Sellers whose registration is rejected can view the rejection reason provided by the administrator. The rejection reason is stored as text submitted by the administrator. Sellers can view the rejection reason after their account is rejected.

### Account Deletion with Pending Orders

Sellers cannot delete their account while they have pending orders with paid status. Sellers cannot delete their account while they have pending orders with shipped status. Sellers can delete their account only after all their order items reach delivered, cancelled, or refunded status. Sellers must complete or cancel all pending orders before deleting their account.

### Pending Request Blocking

Sellers cannot delete their account while they have pending cancellation requests. Sellers cannot delete their account while they have pending refund requests. Sellers can delete their account only after all cancellation requests are approved or rejected. Sellers can delete their account only after all refund requests are approved or rejected. Sellers must respond to all pending requests before deleting their account.

### Product Removal on Deletion

When a seller deletes their account, all their products are removed from search results. When a seller deletes their account, all their products are removed from category listings. When a seller deletes their account, all their products are no longer purchasable. When a seller deletes their account, all their product variants are deleted. When a seller deletes their account, all their product images are deleted. When a seller deletes their account, all their inventory records are deleted. When a seller deletes their account, product snapshots are preserved. When a seller deletes their account, variant snapshots are preserved. When a seller deletes their account, order history containing their products is preserved. When a seller deletes their account, order items containing their products are preserved.

### Shop Name Preservation

When a seller deletes their account, their shop name is preserved in all past orders. When a seller deletes their account, their shop logo is preserved in all past orders. When a seller deletes their account, the shop name snapshot is stored with each order item. When a seller deletes their account, the shop logo snapshot is stored with each order item. Customers can view the seller's shop name in their order history even after seller account deletion. Customers can view the seller's shop logo in their order history even after seller account deletion. Order items display the seller's shop information regardless of current seller account status.

### Suspended Account Restrictions

When a seller is suspended by an administrator, their products are hidden from search results. When a seller is suspended by an administrator, their products are hidden from category listings. When a seller is suspended by an administrator, their products cannot be purchased by customers. When a seller is suspended by an administrator, they cannot create new products. When a seller is suspended by an administrator, they cannot edit existing products. When a seller is suspended by an administrator, they cannot add inventory to their variants. When a seller is suspended by an administrator, they can still process existing orders. When a seller is suspended by an administrator, they can still ship order items. When a seller is suspended by an administrator, they can still respond to cancellation requests. When a seller is suspended by an administrator, they can still respond to refund requests. When a seller is unsuspended by an administrator, their products become visible again. When a seller is unsuspended by an administrator, their products can be purchased again.

### Seller Registration Resubmission

Rejected sellers can submit a new registration request after being rejected. Sellers can submit a new registration request at any time after rejection. The new registration request is placed in the pending approval queue. Administrators can view all registration requests from the same seller. The new registration request is evaluated independently of previous requests.

## Administrator Error Scenarios

Super administrators cannot demote themselves from their grade level. Regular administrators cannot promote or demote other administrators without super administrator privileges. Administrators cannot approve seller registrations without providing a reason when rejecting. When administrators delete categories, all products in those categories become uncategorized. Administrators cannot ban customers who have active orders in the system. Banned customers cannot log in to the platform but their order history remains accessible. Administrators can force-cancel order items even when sellers have not responded to cancellation requests. Force-refund operations restore stock quantities automatically for the affected items.

### Self Demotion Prevention

WHEN a super administrator attempts to demote themselves to regular administrator grade, THE shopping mall platform SHALL prevent the demotion and maintain their super administrator status.

A super administrator cannot remove their own elevated privileges through the demotion function.

The system shall display an error message when a super administrator attempts self-demotion.

Super administrator status can only be removed by another super administrator, not by self-action.

### Administrator Privilege Restrictions

WHEN a regular administrator attempts to promote another administrator to super administrator, THE shopping mall platform SHALL reject the request due to insufficient privileges.

WHEN a regular administrator attempts to demote another administrator, THE shopping mall platform SHALL reject the request due to insufficient privileges.

Regular administrators can only perform basic administrative tasks such as seller approval, category management, and product oversight.

Super administrator privileges are required for administrator grade changes (promotion and demotion).

The system shall display an error message indicating insufficient privileges when regular administrators attempt grade management operations.

### Rejection Reason Requirement

WHEN an administrator rejects a seller registration request, THE shopping mall platform SHALL require the administrator to provide a rejection reason.

The rejection reason must be entered as text before the rejection can be submitted.

WHEN an administrator attempts to reject a seller registration without providing a reason, THE shopping mall platform SHALL prevent the rejection and prompt for a reason.

The rejection reason is stored and can be viewed by the rejected seller.

Rejection reasons must be meaningful text that explains why the seller registration was denied.

### Category Deletion Impact

WHEN an administrator deletes a category, THE shopping mall platform SHALL automatically remove the category assignment from all products in that category.

Products in deleted categories become uncategorized but remain visible and purchasable.

WHEN an administrator deletes a parent category, THE shopping mall platform SHALL also remove all subcategories under that parent.

Products in deleted subcategories also become uncategorized.

Category deletion does not delete products; it only removes the category association.

Administrators can view uncategorized products separately to reassign them if needed.

### Banned Account Login Blocking

WHEN a banned customer attempts to log in, THE shopping mall platform SHALL reject the login attempt and display a ban notification.

WHEN a banned seller attempts to log in, THE shopping mall platform SHALL reject the login attempt and display a ban notification.

Banned accounts retain their order history and can view past orders without logging in (if applicable).

Banned customers cannot access any platform features including browsing, searching, or purchasing.

Banned sellers cannot access seller dashboard, product management, or order processing.

The ban remains in effect until an administrator explicitly unbans the account.

Unbanned accounts can log in immediately after the ban is removed.

### Force Cancel Override

WHEN an administrator force-cancels an order item, THE shopping mall platform SHALL process the cancellation regardless of seller response status.

Administrators can force-cancel items even when sellers have not responded to customer cancellation requests.

WHEN an administrator force-cancels an order item, THE shopping mall platform SHALL automatically refund the customer for that item.

Force-cancelled items change status to cancelled immediately without seller approval.

Administrators can force-cancel individual items or entire orders.

WHEN an administrator force-cancels an entire order, THE shopping mall platform SHALL cancel all items in that order.

Force-cancel operations are logged and can be viewed in administrator audit records.

### Force Refund Stock Restoration

WHEN an administrator force-refunds an order item, THE shopping mall platform SHALL automatically restore the stock quantity for that variant.

Force-refund operations create an inventory record with a positive quantity change.

WHEN an administrator force-refunds an entire order, THE shopping mall platform SHALL restore stock for all items in that order.

Stock restoration occurs immediately upon force-refund approval.

The inventory history reflects the force-refund as the reason for stock increase.

Force-refunded items change status to refunded without requiring seller approval.

Administrators can force-refund items even when the 7-day refund window has expired.

Force-refund operations are logged and can be viewed in administrator audit records.

## Address Error Scenarios

Customers cannot delete their default shipping address if it is the only address in their account. The system requires customers to set a new default address before removing the current default. Address editing preserves the address for any completed orders that used it. Customers can add multiple addresses but must select one as default for checkout. When customers proceed to checkout, they must select a shipping address from their saved addresses. The system prevents address changes after an order is placed. Default address selection is required for streamlined checkout experience. Address deletion removes it from future shipping options but maintains historical order records.

### Default Address Deletion Constraints

WHEN a customer attempts to delete their default shipping address, THE system SHALL prevent deletion if it is the only address in their account.

WHEN a customer attempts to delete their default shipping address, THE system SHALL require them to set a different address as default first.

WHEN a customer has only one address that is set as default, THE system SHALL block the deletion operation and display a message requiring a new default address to be set.

IF a customer has multiple addresses and attempts to delete the default one, THEN THE system SHALL allow the deletion only after another address is designated as default.

THE system SHALL not permit customers to have an account without a default shipping address.

### Address Preservation in Orders

WHEN an order is placed, THE system SHALL preserve the shipping address information as part of the order record.

WHEN a customer edits or deletes a shipping address from their profile, THE system SHALL maintain the address information in all completed orders that used it.

WHEN a customer views order history, THE system SHALL display the shipping address that was used at the time of purchase, even if that address has been deleted from their profile.

THE system SHALL retain historical address information indefinitely for order records.

WHEN a customer deletes their account, THE system SHALL preserve order records with their associated shipping addresses for seller records and legal purposes.

### Checkout and Order Address Rules

WHEN a customer proceeds to checkout, THE system SHALL require them to select a shipping address from their saved addresses.

WHEN a customer has a default address set, THE system SHALL pre-select it as the shipping address during checkout.

WHEN a customer places an order, THE system SHALL lock the shipping address and prevent any modifications after order creation.

IF a customer attempts to change the shipping address after placing an order, THEN THE system SHALL reject the request.

WHEN a customer has no addresses saved, THE system SHALL require them to add at least one address before proceeding to checkout.

THE system SHALL validate that the selected shipping address contains all required information before allowing order placement.

## Category Error Scenarios

Categories can only have one level of nesting with subcategories. Administrators cannot create subcategories of subcategories beyond the single nesting level. When administrators delete a category, products in that category become uncategorized. Category deletion does not remove the products themselves from the platform. Customers can still view uncategorized products in search results. Administrators can edit category names and descriptions without affecting product assignments. Subcategory deletion moves products to the parent category or uncategorized status. Category browsing allows customers to view all products within a selected category.

### Single Nesting Level Restriction

WHEN an administrator attempts to create a subcategory of an existing subcategory, THE system SHALL reject the request.

WHILE a category has a parent category, THE system SHALL prevent the creation of subcategories within it.

IF a user attempts to nest categories beyond one level, THEN THE system SHALL display an error indicating the single nesting level restriction.

Categories can only have one level of nesting with subcategories. Administrators cannot create subcategories of subcategories beyond the single nesting level.

### Category Deletion Product Handling

WHEN an administrator deletes a category, THE system SHALL move all products in that category to uncategorized status.

WHEN an administrator deletes a subcategory, THE system SHALL move all products in that subcategory to the parent category or uncategorized status.

IF a category contains products, THEN THE system SHALL preserve those products when the category is deleted.

Category deletion does not remove the products themselves from the platform. Products in deleted categories become uncategorized.

### Uncategorized Product Visibility

WHEN a product becomes uncategorized due to category deletion, THE system SHALL continue to display the product in search results.

IF a customer searches for products, THEN THE system SHALL include uncategorized products in the search results.

WHILE a product is uncategorized, THE system SHALL allow customers to view the product details.

Customers can still view uncategorized products in search results. Uncategorized products remain visible and purchasable.

### Category Edit Preservation

WHEN an administrator edits a category name, THE system SHALL preserve all product assignments to that category.

WHEN an administrator edits a category description, THE system SHALL preserve all product assignments to that category.

IF an administrator modifies category metadata, THEN THE system SHALL not affect existing product-category relationships.

Administrators can edit category names and descriptions without affecting product assignments.

### Category Product Listing

WHEN a customer browses a category, THE system SHALL display all products assigned to that category.

WHEN a customer views a subcategory, THE system SHALL display only products directly assigned to that subcategory.

IF a category contains no products, THEN THE system SHALL display an empty category listing.

Category browsing allows customers to view all products within a selected category. Products are organized by their assigned category or subcategory.

## Product Error Scenarios

Sellers cannot delete products that have pending order items with paid or shipped status. Products with pending cancellation or refund requests cannot be deleted by sellers. When products are deleted, all variants and inventory records are also removed. Deleted products no longer appear in search results or category listings. Product deletion does not affect completed orders that included the product. Sellers cannot create products without selecting a valid category. Products with no variants are visible in search but marked as unavailable for purchase. Every product edit creates a snapshot preserving the previous state.

### Product Deletion with Pending Orders

Sellers cannot delete products that have order items with paid or shipped status. When a seller attempts to delete such a product, the system rejects the deletion request. The system displays a message indicating that pending orders prevent deletion. Sellers must wait until all order items for the product are delivered, cancelled, or refunded before they can delete the product.

### Product Deletion with Pending Requests

Sellers cannot delete products that have pending cancellation or refund requests. When a seller attempts to delete such a product, the system rejects the deletion request. The system displays a message indicating that pending requests prevent deletion. Sellers must resolve all pending cancellation and refund requests before they can delete the product.

### Product and Variant Deletion

When a seller deletes a product, all variants associated with that product are also deleted. When a seller deletes a product, all inventory records for all variants are also deleted. The deletion of a product removes all its variants and inventory records in a single operation. Sellers cannot delete individual variants independently of the product.

### Deleted Product Visibility

When a product is deleted, it no longer appears in search results. When a product is deleted, it no longer appears in category listings. Deleted products are completely hidden from customer browsing. Deleted products cannot be found through any search or browsing functionality.

### Product Deletion and Order History

When a product is deleted, completed orders containing that product remain unchanged. Order items referencing deleted products preserve the product information at the time of purchase through snapshots. Customers can still view their order history even if the purchased product has been deleted. The deletion of a product does not affect the visibility or accessibility of past orders.

### Product Creation Requirements

Sellers must select a valid category when creating a product. The system rejects product creation requests that do not include a category selection. Sellers cannot create products without assigning them to a category or subcategory. The category selection is required for all product creation operations.

### Products Without Variants

Products with no variants are visible in search results. Products with no variants are visible in category listings. Products with no variants are marked as unavailable for purchase. Customers can view product details but cannot add products without variants to their cart. Sellers must create at least one variant to make a product purchasable.

### Product Edit History

Every time a seller edits a product, the system creates a snapshot of the previous state. Product snapshots preserve all product fields including name, description, category, base price, and images. Product snapshots also include snapshots of all variants at the time of the edit. Sellers can view the complete edit history of their products through snapshots. Administrators can view snapshots of any product on the platform. Snapshots are preserved even after the product is deleted.

## ProductImage Error Scenarios

Sellers can upload multiple images for each product but must maintain at least one image. The first image in the display order becomes the main thumbnail shown in listings. Sellers can reorder images to change which one appears as the thumbnail. Image deletion is allowed as long as at least one image remains for the product. Image changes are automatically included in product snapshots when products are edited. Products without images cannot be properly displayed in search results. Sellers can delete individual images but cannot remove all images from a product. Image reordering affects the main thumbnail shown across the platform.

### Minimum Image Requirement

THE system SHALL require at least one image for each product to be displayed properly. IF a seller attempts to delete the last remaining image, THEN THE system SHALL reject the deletion request. IF a product is created without any images, THEN THE system SHALL allow creation but mark the product as having incomplete presentation. Products without images cannot be properly displayed in search results and category listings.

### Thumbnail Display Order

THE system SHALL designate the first image in the display order as the main thumbnail. THE system SHALL use the thumbnail image in all product listings including search results and category pages. IF the first image is deleted, THEN THE system SHALL automatically promote the second image to become the new thumbnail. IF the first image is moved to a different position, THEN THE system SHALL immediately update the thumbnail to reflect the new first image.

### Image Reordering Capability

THE system SHALL allow sellers to reorder images by changing their display order position. WHEN a seller reorders images, THE system SHALL preserve all images and only change their sequence. WHEN image reordering occurs, THE system SHALL create a product snapshot that includes the previous image order. THE system SHALL immediately reflect reordered images across all platform displays.

### Single Image Retention

IF a product has only one image, THEN THE system SHALL prevent deletion of that image. IF a seller attempts to delete the last image, THEN THE system SHALL display an error message requiring at least one image to remain. THE system SHALL not allow a product to exist without any images in the system. Sellers must add a new image before deleting the last remaining image.

### Snapshot Image Inclusion

WHEN a product is edited, THE system SHALL include all image changes in the product snapshot. THE system SHALL record the image references and their display order at the time of the snapshot. IF images are added, removed, or reordered, THE system SHALL capture the complete before and after state in the snapshot. Product snapshots preserve the exact image configuration that was visible to customers at the time of purchase.

### No Image Display Issues

IF a product has no images, THEN THE system SHALL display the product with a placeholder or default image in listings. Products without images remain visible in search results but show as having incomplete presentation. THE system SHALL not hide products from search results solely due to missing images. Customers can still view product details and purchase products without images.

### Individual Image Deletion

THE system SHALL allow sellers to delete individual images from their products. WHEN an image is deleted, THE system SHALL maintain the display order of remaining images. IF a deleted image was the thumbnail, THEN THE system SHALL automatically select a new thumbnail from remaining images. Image deletion is permanent and cannot be undone, but the deleted image state is preserved in product snapshots.

### Thumbnail Platform Impact

WHEN the thumbnail image changes, THE system SHALL update the product display across all platform locations. THE system SHALL reflect thumbnail changes in search results, category pages, cart items, and order history. IF a product's main image is changed after purchase, THEN THE system SHALL preserve the original thumbnail in the order snapshot. Customers see the thumbnail that was current at the time of their purchase in their order history.

## ProductVariant Error Scenarios

Sellers cannot delete variants that have pending order items with paid or shipped status. Variants with pending cancellation or refund requests cannot be removed. A product must have at least one variant to be purchasable by customers. Products with no variants are shown as unavailable in search results. Each variant requires a unique SKU code that cannot be duplicated within a product. Variant price can override the base price but is optional to specify. Stock quantity must be specified for each variant and starts at zero. Variant edits create snapshots preserving previous option values and pricing.

### Variant Deletion Restrictions

WHEN a seller attempts to delete a variant, THE system SHALL prevent deletion if the variant has any order items with paid or shipped status.

WHEN a seller attempts to delete a variant, THE system SHALL prevent deletion if the variant has any pending cancellation requests.

WHEN a seller attempts to delete a variant, THE system SHALL prevent deletion if the variant has any pending refund requests.

IF a variant meets all deletion criteria, THEN THE system SHALL allow the seller to delete the variant and remove it from the product.

### Product Purchasability Requirements

WHEN a product has no variants, THE system SHALL mark the product as unpurchasable.

WHEN customers browse search results, THE system SHALL display products with no variants as unavailable.

WHEN a product has at least one variant, THE system SHALL allow customers to purchase the product.

IF a seller deletes the last variant of a product, THEN THE system SHALL mark the product as unavailable in search results.

### Variant Creation and Editing Constraints

WHEN a seller creates a variant, THE system SHALL require a unique SKU code that does not duplicate any existing SKU code within the same product.

WHEN a seller creates a variant, THE system SHALL require a stock quantity value.

WHEN a seller creates a variant, THE system SHALL allow the seller to optionally specify a price that overrides the product's base price.

WHEN a seller edits a variant, THE system SHALL create a snapshot preserving the previous option values and pricing.

IF a seller attempts to use a duplicate SKU code within a product, THEN THE system SHALL reject the variant creation or edit.

### Variant Stock Management

WHEN a seller creates a variant, THE system SHALL initialize the stock quantity at zero.

WHEN a seller edits a variant's stock quantity, THE system SHALL create an inventory record with the quantity change and reason.

WHEN a variant's stock quantity reaches zero, THE system SHALL mark the variant as out of stock.

WHEN a variant is out of stock, THE system SHALL prevent customers from adding the variant to their cart.

## InventoryRecord Error Scenarios

Stock quantity cannot go below zero when processing orders or adjustments. Order placement automatically creates negative inventory records for purchased variants. Order cancellation automatically creates positive inventory records to restore stock. Sellers cannot add negative quantities when restocking inventory. Inventory adjustments require a reason to be documented for audit purposes. Current stock is calculated by summing all inventory history records. When stock reaches zero, variants are marked as out of stock. Out of stock variants cannot be added to customer shopping carts.

### Negative Stock Prevention

WHEN stock quantity would go below zero due to an order placement, THE system SHALL reject the order and prevent purchase.

IF a customer attempts to purchase a quantity that exceeds available stock, THE system SHALL reject the order placement and display an error message.

WHEN a seller attempts to subtract inventory through adjustment that would result in negative stock, THE system SHALL reject the adjustment and display an error message.

WHEN processing multiple concurrent orders for the same variant, THE system SHALL prevent stock from being allocated beyond available quantity.

IF an order is placed but payment fails, THE system SHALL NOT create inventory records and stock quantities remain unchanged.

### Automatic Order Inventory Deduction

WHEN an order is successfully placed with payment confirmation, THE system SHALL automatically create a negative inventory record for each purchased variant.

WHEN an order item is created, THE system SHALL calculate the negative quantity based on the order item quantity.

WHEN an order is created, THE system SHALL record the reason as "order placement" in the inventory record.

IF order placement fails after payment processing, THE system SHALL NOT create inventory records and stock quantities remain unchanged.

WHEN an order is created, THE system SHALL immediately recalculate and update the current stock quantity.

### Automatic Cancellation Restoration

WHEN an order item is cancelled after seller approval, THE system SHALL automatically create a positive inventory record to restore stock.

WHEN a cancellation request is approved, THE system SHALL calculate the positive quantity based on the cancelled order item quantity.

WHEN stock is restored due to cancellation, THE system SHALL record the reason as "order cancellation" in the inventory record.

WHEN a refund is approved for a delivered item, THE system SHALL automatically create a positive inventory record to restore stock.

WHEN stock is restored due to refund, THE system SHALL record the reason as "order refund" in the inventory record.

### Negative Restock Blocking

WHEN a seller attempts to add inventory with a negative quantity, THE system SHALL reject the restock operation and display an error message.

IF a seller enters a negative value when restocking, THE system SHALL prevent the operation and display an error message.

WHEN a seller attempts to subtract inventory through restock functionality, THE system SHALL require the operation to be performed as an adjustment with a documented reason.

IF a seller tries to restock with zero quantity, THE system SHALL reject the operation as it does not change inventory.

WHEN a seller performs a restock operation, THE system SHALL require a positive quantity greater than zero.

### Adjustment Reason Requirement

WHEN a seller performs an inventory adjustment, THE system SHALL require a reason to be provided.

IF a seller attempts to adjust inventory without providing a reason, THE system SHALL reject the adjustment and display an error message.

WHEN an inventory record is created for an adjustment, THE system SHALL store the reason provided by the seller.

WHEN viewing inventory history, THE system SHALL display the reason for each adjustment record.

IF the adjustment reason is empty or contains only whitespace, THE system SHALL reject the adjustment and display an error message.

### Inventory History Calculation

WHEN current stock quantity is requested, THE system SHALL calculate it by summing all inventory records for that variant.

WHEN displaying stock quantity, THE system SHALL show the calculated current stock based on the complete inventory history.

WHEN an inventory record is added, THE system SHALL immediately recalculate and update the current stock quantity.

IF inventory records are corrupted or missing, THE system SHALL flag the variant for administrator review.

WHEN viewing inventory history, THE system SHALL show all historical records with their quantity changes and cumulative totals.

### Zero Stock Out of Stock

WHEN a variant's stock quantity reaches zero, THE system SHALL mark the variant as "out of stock".

WHEN a variant is marked as out of stock, THE system SHALL display this status on the product detail page.

WHEN a variant's stock quantity increases from zero, THE system SHALL automatically remove the "out of stock" status.

WHEN displaying product listings, THE system SHALL show out of stock variants with appropriate visual indicators.

IF a variant has zero stock but is still visible in search results, THE system SHALL display it as unavailable for purchase.

### Cart Addition Blocking

WHEN a customer attempts to add an out of stock variant to their cart, THE system SHALL reject the addition and display an error message.

IF a variant's stock becomes zero while it is in a customer's cart, THE system SHALL mark the cart item as unavailable.

WHEN a customer views their cart, THE system SHALL show warnings for items where stock is less than the cart quantity.

IF all items in a cart are unavailable, THE system SHALL prevent checkout and display a message to the customer.

WHEN attempting to checkout with unavailable items, THE system SHALL reject the checkout and require item removal or quantity reduction.

## Wishlist Error Scenarios

Customers can add products to their wishlist but not specific variants. When sellers delete products, those items are automatically removed from all customer wishlists. The wishlist is paginated to handle large numbers of saved products. Customers can remove products from their wishlist at any time. Duplicate products cannot be added to the same wishlist multiple times. Wishlist products that go out of stock remain in the wishlist. Deleted products are removed from wishlists without customer action. Customers can view their complete wishlist with product details.

### Duplicate Prevention

WHEN a customer attempts to add a product to their wishlist, THE system SHALL check if that product already exists in their wishlist.

IF a product already exists in a customer's wishlist, THE system SHALL prevent duplicate addition.

WHEN a duplicate addition is attempted, THE system SHALL inform the customer that the product is already in their wishlist.

WHEN a duplicate addition is attempted, THE system SHALL not create a second entry for the same product.

### Automatic Deletion Removal

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customer wishlists.

WHEN a product is deleted, THE system SHALL silently remove it from wishlists without requiring customer action.

WHEN a customer views their wishlist after a product deletion, THE system SHALL not display the deleted product.

WHEN a deleted product is removed from a wishlist, THE system SHALL not notify the customer of the removal.

### Out of Stock Retention

WHEN a product variant goes out of stock, THE system SHALL keep the product in customer wishlists.

WHEN all variants of a product are out of stock, THE system SHALL retain the product in wishlists.

WHEN a customer views an out-of-stock product in their wishlist, THE system SHALL display the product with an out-of-stock indicator.

WHEN a customer attempts to purchase an out-of-stock product from their wishlist, THE system SHALL prevent the purchase and inform the customer that no variants are available.

### Product-Only Storage

WHEN a customer adds an item to their wishlist, THE system SHALL store only the product, not a specific variant.

WHEN a customer views their wishlist, THE system SHALL display products with their base information (main image, name, base price or price range).

WHEN a customer attempts to purchase a wishlist product, THE system SHALL require the customer to select a specific variant before adding to cart.

### Wishlist Pagination Handling

WHEN a customer's wishlist exceeds the page size, THE system SHALL provide navigation to view additional pages.

WHEN a customer navigates through wishlist pages, THE system SHALL maintain consistent pagination across views.

WHEN products are removed from a wishlist (by deletion or customer action), THE system SHALL adjust pagination accordingly.

## Cart Error Scenarios

Customers must select a specific variant when adding items to their cart. If the same variant is already in the cart, quantities are combined rather than creating separate line items. When variant stock is less than cart quantity, a warning is displayed to the customer. Variants that become out of stock are marked as unavailable in the cart. Deleted variants are marked as unavailable and cannot be checked out. Unavailable items cannot proceed to checkout. Cart shows total price of all available items. Customers can change quantities or remove items before checkout.

### Variant Selection Requirement

Customers must select a specific product variant when adding items to their cart. Products without variants cannot be added to the cart. Products with variants require customers to choose one variant before adding to cart. If a customer attempts to add a product without selecting a variant, the request is rejected.

### Quantity Combination

When the same variant is already in the cart, the quantities are combined into a single line item. Adding the same variant multiple times increases the quantity of the existing cart item. Separate line items are not created for the same variant. The price displayed is the price at the time of the first addition to cart.

### Stock Warning Display

When a variant's available stock is less than the quantity in the cart, a warning is displayed to the customer. The warning indicates the available stock quantity.

### Out of Stock Marking

When a variant's stock reaches zero, the cart item is marked as unavailable. Out of stock variants cannot be added to the cart. Cart items that become out of stock are visually distinguished from available items. The unavailable status is displayed with the reason (out of stock).

### Deleted Variant Blocking

When a variant is deleted by the seller, the cart item is marked as unavailable. Deleted variants cannot be added to the cart. Deleted variants cannot be checked out. The unavailable status indicates the variant is no longer available. Customers can remove deleted variants from their cart.

### Unavailable Checkout Prevention

Customers cannot proceed to checkout if any cart item is unavailable. Unavailable items must be removed or replaced before checkout. The checkout process validates all cart items are available. Error messages indicate which items are unavailable and why.

### Cart Total Calculation

The cart displays the total price of all available items. Unavailable items are excluded from the total price calculation. The total price is calculated by summing each item's quantity multiplied by its price. Price changes after adding to cart do not affect the cart total (price is captured at addition time).

### Quantity Modification Capability

Customers can change the quantity of items in their cart before checkout. Quantity increases are limited by available stock. Quantity decreases are allowed down to zero (which removes the item). Quantity changes update the cart total immediately. Customers can remove items from their cart at any time before checkout.

## CartItem Error Scenarios

CartItem quantities cannot exceed available stock for the selected variant. When stock decreases below cart quantity, the item shows a stock warning. Cart items with zero stock become unavailable for checkout. Customers can reduce cart item quantities but cannot set them to zero or negative. Removing items from cart does not affect product inventory. Cart items preserve the price at the time of adding to cart. Price changes on products do not affect existing cart items. Cart items from deleted products are marked as unavailable.

### Stock Quantity Limit Validation

WHEN a customer adds a variant to their cart with a quantity, THE shopping mall SHALL validate that the requested quantity does not exceed the available stock for that variant.

IF the requested quantity exceeds available stock, THEN THE shopping mall SHALL reject the cart addition and display an error message indicating the maximum available quantity.

WHILE a customer attempts to update a cart item quantity, THE shopping mall SHALL validate that the new quantity does not exceed the current available stock for that variant.

IF the updated quantity exceeds available stock, THEN THE shopping mall SHALL reject the quantity update and display the maximum available quantity.

### Decreased Stock Warning Display

WHEN the available stock for a variant decreases below the quantity stored in a customer's cart, THE shopping mall SHALL display a stock warning on that cart item.

THE shopping mall SHALL continue to allow the cart item to remain in the cart even when stock is below the cart quantity.

THE shopping mall SHALL visually indicate to the customer that the cart item quantity exceeds available stock.

WHILE a cart item shows a stock warning, THE shopping mall SHALL prevent checkout until the customer reduces the quantity or removes the item.

### Zero Stock Unavailability for Checkout

WHEN a variant's stock quantity reaches zero, THE shopping mall SHALL mark all cart items for that variant as unavailable.

IF a cart contains items marked as unavailable due to zero stock, THE shopping mall SHALL prevent the customer from proceeding to checkout with those items.

THE shopping mall SHALL display a clear indication that unavailable items cannot be purchased.

WHILE a cart item is marked as unavailable due to zero stock, THE shopping mall SHALL allow the customer to remove the item from their cart.

### Quantity Reduction Constraints

WHEN a customer attempts to reduce a cart item quantity, THE shopping mall SHALL allow the quantity to be reduced to any positive integer value.

IF a customer attempts to set a cart item quantity to zero, THEN THE shopping mall SHALL reject the update and require the customer to remove the item instead.

IF a customer attempts to set a cart item quantity to a negative value, THEN THE shopping mall SHALL reject the update and display an error message.

WHEN a customer removes an item from their cart, THE shopping mall SHALL delete the cart item without requiring quantity input.

### No Inventory Impact on Cart Operations

WHEN a customer adds an item to their cart, THE shopping mall SHALL NOT modify the variant's stock quantity or create an inventory record.

WHEN a customer updates a cart item quantity, THE shopping mall SHALL NOT modify the variant's stock quantity or create an inventory record.

WHEN a customer removes an item from their cart, THE shopping mall SHALL NOT modify the variant's stock quantity or create an inventory record.

THE shopping mall SHALL only create inventory records when an order is successfully placed or cancelled/refunded.

### Price Preservation on Product Changes

WHEN a customer adds a variant to their cart, THE shopping mall SHALL capture and store the price at the time of addition.

WHEN a product's base price or a variant's price is changed by the seller, THE shopping mall SHALL NOT update the price of existing cart items for that variant.

THE shopping mall SHALL display the preserved price to the customer in their cart, regardless of current product pricing.

WHEN a customer proceeds to checkout, THE shopping mall SHALL use the preserved cart item prices for order total calculation, not the current product prices.

### Deleted Product Cart Item Marking

WHEN a seller deletes a product, THE shopping mall SHALL automatically mark all cart items containing variants of that product as unavailable.

WHEN a seller deletes a variant, THE shopping mall SHALL automatically mark all cart items for that variant as unavailable.

THE shopping mall SHALL display a clear indication to the customer that the cart item is no longer available for purchase.

WHEN a cart contains items from deleted products or variants, THE shopping mall SHALL prevent checkout until those items are removed.

THE shopping mall SHALL allow customers to remove unavailable cart items from deleted products or variants.

## Order Error Scenarios

Orders cannot be created if payment processing fails. Failed payment attempts do not create order records or deduct inventory. Customers can retry payment after a failed transaction. Once an order is placed, the shipping address cannot be modified. Order status is derived from the status of all its items. Mixed item statuses result in partially completed order status. Orders containing items from different sellers are processed independently. All items in an order must pass availability checks before order creation.

### Payment Failure Blocking

WHEN payment processing fails, THE shoppingMall SHALL block order creation. THE shoppingMall SHALL not create an order record when payment fails. THE shoppingMall SHALL not deduct inventory when payment fails. Customers can retry payment after a failed transaction. The shoppingMall SHALL allow customers to proceed with checkout again after a payment failure.

### No Order Record on Payment Failure

IF payment processing returns a failure status, THEN THE shoppingMall SHALL not create an order. THE shoppingMall SHALL not generate an order number when payment fails. THE shoppingMall SHALL not create order items when payment fails. THE shoppingMall SHALL not create inventory deduction records when payment fails. THE shoppingMall SHALL return the customer to the checkout page after payment failure.

### Payment Retry Capability

WHEN payment fails, THE shoppingMall SHALL allow the customer to retry payment. THE shoppingMall SHALL preserve the cart contents after a payment failure. THE shoppingMall SHALL allow the customer to proceed to checkout again with the same items. THE shoppingMall SHALL allow the customer to modify the cart before retrying payment. THE shoppingMall SHALL allow the customer to change the shipping address before retrying payment.

### Address Modification Locking

ONCE an order is placed, THE shoppingMall SHALL prevent shipping address modification. THE shoppingMall SHALL not allow customers to change the shipping address after order creation. THE shoppingMall SHALL not allow sellers to change the shipping address after order creation. THE shoppingMall SHALL not allow administrators to change the shipping address after order creation. THE shoppingMall SHALL preserve the original shipping address in the order record permanently.

### Order Status Derivation

THE shoppingMall SHALL derive the overall order status from the status of all its items. IF all order items have paid status, THEN THE shoppingMall SHALL set the order status to paid. IF any order item has shipped status and no item has delivered status, THEN THE shoppingMall SHALL set the order status to shipped. IF all order items have delivered status, THEN THE shoppingMall SHALL set the order status to delivered. IF all order items have cancelled status, THEN THE shoppingMall SHALL set the order status to cancelled. IF all order items have refunded status, THEN THE shoppingMall SHALL set the order status to refunded.

### Mixed Status Handling

WHEN order items have different statuses, THE shoppingMall SHALL set the order status to partially completed. IF some items are delivered and some are refunded, THEN THE shoppingMall SHALL display the order status as partially completed. IF some items are shipped and some are cancelled, THEN THE shoppingMall SHALL display the order status as partially completed. THE shoppingMall SHALL allow customers to view individual item statuses within a partially completed order. THE shoppingMall SHALL allow customers to perform actions on individual items regardless of the overall order status.

### Multi-Seller Order Processing

WHEN an order contains items from different sellers, THE shoppingMall SHALL process each seller's items independently. THE shoppingMall SHALL allow each seller to ship their items separately. THE shoppingMall SHALL allow each seller to create separate shipments for their items. THE shoppingMall SHALL track delivery confirmation per shipment, not per order. THE shoppingMall SHALL allow customers to confirm delivery for each shipment independently.

### Availability Verification

BEFORE order creation, THE shoppingMall SHALL verify the availability of all items in the cart. IF any item is out of stock, THEN THE shoppingMall SHALL block order creation. IF any item is deleted, THEN THE shoppingMall SHALL block order creation. IF any item's stock is less than the requested quantity, THEN THE shoppingMall SHALL block order creation. THE shoppingMall SHALL display an error message indicating which items are unavailable. THE shoppingMall SHALL prevent checkout until all availability issues are resolved.

## OrderItem Error Scenarios

Order items can only be cancelled when their status is paid and not yet shipped. Cancellation requests require a reason to be provided by the customer. Sellers can approve or reject cancellation requests for their items. Approved cancellations restore stock quantities automatically. Order items can only be refunded within 7 days of delivery status. Refund requests also require a reason from the customer. Refunded items restore their stock quantities through inventory records. Individual item status changes do not affect other items in the same order.

### Stock Restoration on Cancellation Approval

WHEN a seller approves a cancellation request for an order item, THE system SHALL automatically restore stock quantities for the cancelled variant.

THE system SHALL create an inventory record with a positive quantity change equal to the cancelled item quantity.

THE inventory record SHALL include a reason indicating automatic restoration from cancellation approval.

IF stock restoration fails, THEN THE system SHALL prevent the cancellation from completing.

THE system SHALL update the order item status to cancelled only after successful stock restoration.

Cancelled items SHALL restore their stock quantities through inventory records, not through snapshots.

THE inventory record SHALL be timestamped at the time of cancellation approval.

### Stock Restoration on Refund Approval

WHEN a seller approves a refund request for an order item, THE system SHALL automatically restore stock quantities for the refunded variant.

THE system SHALL create an inventory record with a positive quantity change equal to the refunded item quantity.

THE inventory record SHALL include a reason indicating automatic restoration from refund approval.

IF stock restoration fails, THEN THE system SHALL prevent the refund from completing.

THE system SHALL update the order item status to refunded only after successful stock restoration.

Refunded items SHALL restore their stock quantities through inventory records, not through snapshots.

THE inventory record SHALL be timestamped at the time of refund approval.

### Independent Item Status Processing

WHEN an order item status changes, THE system SHALL process only that specific item.

IF one item in an order is cancelled, THEN THE system SHALL not affect the status of other items in the same order.

IF one item in an order is refunded, THEN THE system SHALL not affect the status of other items in the same order.

IF one item in an order is shipped, THEN THE system SHALL not affect the status of other items in the same order.

THE overall order status SHALL be derived from the collective status of all items.

Mixed item statuses SHALL result in an order status of partially completed.

Customers SHALL be able to cancel or refund individual items without affecting other items in the same order.

Sellers SHALL be able to ship individual items or bundle items into shipments independently.

## Shipment Error Scenarios

Sellers can only create shipments for order items with paid status. Different sellers always create separate shipments for their items. A single shipment can contain multiple order items from the same seller. All items in the same shipment share identical tracking information. Customers confirm delivery per shipment rather than per individual item. Items automatically change to delivered status after 14 days without customer confirmation. Shipment creation changes all included items to shipped status. Tracking information must include carrier name and tracking number.

### Shipment Creation Status Requirements

WHEN a seller attempts to create a shipment, THE system SHALL verify that all selected order items have paid status.

IF an order item has a status other than paid, THEN THE system SHALL reject the shipment creation request.

IF an order item has already been shipped, THEN THE system SHALL prevent it from being included in a new shipment.

IF an order item has been cancelled, THEN THE system SHALL exclude it from available items for shipment.

IF an order item has been refunded, THEN THE system SHALL exclude it from available items for shipment.

### Seller Separation Requirements

WHEN a seller creates a shipment, THE system SHALL include only order items from that seller.

IF a seller attempts to include order items from another seller in their shipment, THEN THE system SHALL reject the request.

WHEN an order contains items from multiple sellers, THE system SHALL require separate shipments for each seller's items.

IF a single shipment contains items from different sellers, THEN THE system SHALL reject the shipment creation.

### Multi-Item Shipment Bundling

WHEN a seller creates a shipment, THE system SHALL allow bundling of multiple order items from the same seller into one shipment.

WHEN a seller creates a shipment, THE system SHALL allow shipping a single order item as an individual shipment.

IF a seller selects multiple order items for one shipment, THEN THE system SHALL group them together with shared tracking information.

WHEN items are bundled in a shipment, THE system SHALL apply the same status change to all items in that shipment.

### Tracking Information Requirements

WHEN a seller creates a shipment, THE system SHALL require entry of a carrier name.

WHEN a seller creates a shipment, THE system SHALL require entry of a tracking number.

IF the carrier name is missing, THEN THE system SHALL reject the shipment creation.

IF the tracking number is missing, THEN THE system SHALL reject the shipment creation.

WHEN multiple items are included in a single shipment, THE system SHALL assign the same tracking information to all items in that shipment.

IF different tracking information is provided for items in the same shipment, THEN THE system SHALL reject the request.

### Delivery Confirmation Requirements

WHEN a customer views order details, THE system SHALL display tracking information for each shipment.

WHEN a customer confirms delivery, THE system SHALL require confirmation per shipment rather than per individual item.

WHEN a customer confirms delivery for a shipment, THE system SHALL change the status of all items in that shipment to delivered.

IF a customer attempts to confirm delivery for an individual item, THEN THE system SHALL require shipment-level confirmation instead.

IF a shipment has already been confirmed as delivered, THEN THE system SHALL prevent duplicate delivery confirmation.

### Auto-Delivery Timing

WHEN a shipment is created, THE system SHALL start a 14-day countdown from the shipping date.

WHEN 14 days have passed since shipment creation without customer confirmation, THE system SHALL automatically change all items in that shipment to delivered status.

IF a customer confirms delivery before the 14-day period expires, THEN THE system SHALL stop the auto-delivery countdown for that shipment.

IF a shipment has already been auto-delivered, THEN THE system SHALL prevent manual delivery confirmation.

WHEN auto-delivery occurs, THE system SHALL record the automatic delivery timestamp.

### Status Transition Requirements

WHEN a seller creates a shipment, THE system SHALL change the status of all included order items from paid to shipped.

IF an order item is already in shipped status, THEN THE system SHALL prevent it from being included in another shipment.

IF an order item is in delivered status, THEN THE system SHALL prevent it from being included in a new shipment.

WHEN delivery is confirmed for a shipment, THE system SHALL change the status of all items from shipped to delivered.

WHEN auto-delivery occurs after 14 days, THE system SHALL change the status of all items from shipped to delivered.

## Review Error Scenarios

Customers can only write reviews for products they have purchased. Reviews can only be submitted after the order item status is delivered. Customers can write one review per product per order. Reviews require a rating from 1 to 5 stars. Text content in reviews is optional but rating is required. Customers can edit their own reviews but each edit creates a snapshot. Deleted reviews are removed from display but snapshots are preserved. Average rating is calculated only from non-deleted reviews.

### Purchase Verification Error

WHEN a customer attempts to write a review for a product, THE system SHALL verify that the customer has purchased that product. IF the customer has not purchased the product, THEN THE system SHALL reject the review request.

WHEN a customer attempts to write a review, THE system SHALL check the customer's order history for the product. IF no order containing the product exists, THEN THE system SHALL reject the review request.

### Delivery Status Error

WHEN a customer attempts to write a review for an order item, THE system SHALL verify that the item status is delivered. IF the item status is not delivered, THEN THE system SHALL reject the review request.

WHEN a customer attempts to write a review for an item with status paid, shipped, cancelled, or refunded, THEN THE system SHALL reject the review request.

WHEN an item is still awaiting delivery confirmation, THE system SHALL prevent the customer from writing a review for that item.

### Duplicate Review Prevention

WHEN a customer attempts to write a review for a product, THE system SHALL check if the customer has already written a review for that product in the same order. IF a review already exists for that product in that order, THEN THE system SHALL reject the new review request.

WHEN a customer has purchased the same product in multiple orders, THE system SHALL allow one review per product per order.

WHEN a customer attempts to write a second review for the same product in the same order, THEN THE system SHALL reject the request and inform the customer that they have already reviewed this product in this order.

### Rating Validation Error

WHEN a customer submits a review, THE system SHALL require a star rating. IF the rating is not provided, THEN THE system SHALL reject the review submission.

WHEN a customer provides a rating, THE system SHALL validate that the rating is between 1 and 5 stars. IF the rating is less than 1 or greater than 5, THEN THE system SHALL reject the review submission.

WHEN a customer attempts to submit a review with a decimal rating (e.g., 3.5 stars), THEN THE system SHALL reject the submission and require a whole number rating.

### Text Content Validation

WHEN a customer submits a review, THE system SHALL allow the text content to be empty or omitted. IF no text content is provided, THE system SHALL still accept the review as long as the rating is provided.

WHEN a customer provides text content, THE system SHALL accept the review with both rating and text.

WHEN a customer submits a review with only a rating and no text, THE system SHALL create the review successfully.

### Edit Snapshot Creation

WHEN a customer edits their own review, THE system SHALL create a snapshot of the review before the edit. THE snapshot SHALL record the timestamp of the change, the fields that were changed, and the values before and after the edit.

WHEN a customer changes the rating of their review, THE system SHALL create a snapshot capturing the previous rating and the new rating.

WHEN a customer changes the text content of their review, THE system SHALL create a snapshot capturing the previous text and the new text.

WHEN a customer edits their review, THE system SHALL preserve all previous snapshots, making them immutable and viewable for dispute resolution.

### Deleted Review Handling

WHEN a customer deletes their own review, THE system SHALL remove the review from display on the product detail page. THE review SHALL no longer be visible to other customers or sellers.

WHEN a customer deletes their review, THE system SHALL preserve all snapshots of that review, including the original submission and any edits.

WHEN a deleted review exists, THE system SHALL not include it in the average rating calculation for the product.

WHEN a customer deletes their review, THE system SHALL allow the snapshots to be viewed by relevant parties for dispute resolution purposes.

### Average Rating Calculation

WHEN calculating the average rating for a product, THE system SHALL include only non-deleted reviews. Deleted reviews SHALL be excluded from the calculation.

WHEN a product has no reviews or all reviews are deleted, THE system SHALL display no average rating for that product.

WHEN a customer deletes their review, THE system SHALL recalculate the average rating based on the remaining non-deleted reviews.

WHEN a new review is added, THE system SHALL recalculate the average rating to include the new review.

WHEN a review is edited, THE system SHALL recalculate the average rating based on the updated rating value.

## CancellationRequest Error Scenarios

Cancellation requests can only be created for order items with paid status. Items with shipped status cannot have cancellation requests. Cancellation requests require a text reason from the customer. Sellers can approve or reject cancellation requests for their items. When sellers respond, a snapshot of the request state is created. Approved cancellations process refunds for that item only. Rejected cancellation requests leave the item in paid status. Cancelled items restore their stock quantities automatically.

### Paid Status Requirement

When a customer attempts to create a cancellation request for an order item, the system verifies that the item has paid status. If an order item does not have paid status, the system rejects the cancellation request creation. If a customer attempts to cancel an item with shipped status, the system displays an error indicating that only unshipped items can be cancelled. If a customer attempts to cancel an item with delivered status, the system displays an error indicating that delivered items must use the refund process instead. If a customer attempts to cancel an item with cancelled status, the system displays an error indicating that the item is already cancelled. If a customer attempts to cancel an item with refunded status, the system displays an error indicating that the item has already been refunded.

### Shipped Status Blocking

When an order item transitions to shipped status, the system prevents any new cancellation requests for that item. If a cancellation request is pending when an item is shipped, the system automatically rejects the cancellation request. If a seller ships an item while a cancellation request is pending, the system notifies the customer that their cancellation request was rejected due to shipment. If a customer views order items with cancellation options, the system only displays the cancellation option for items with paid status. If a customer attempts to cancel multiple items in an order and some have shipped status, the system allows cancellation only for the unshipped items and rejects the shipped items.

### Text Reason Requirement

When a customer creates a cancellation request, the system requires a text reason to be provided. If a customer submits a cancellation request without a reason, the system rejects the request and prompts the customer to provide a reason. If a customer submits an empty or whitespace-only reason, the system rejects the request and prompts the customer to provide a valid reason. If a customer provides a reason that exceeds the maximum allowed length, the system truncates the reason or displays an error indicating the length limit. When a cancellation request is created with a reason, the system stores the reason as part of the request record.

### Seller Response Capability

When a seller views pending cancellation requests, the system displays all requests for their order items. If a seller attempts to approve a cancellation request for an item they do not own, the system rejects the action. If a seller attempts to reject a cancellation request for an item they do not own, the system rejects the action. If a seller responds to a cancellation request that has already been responded to, the system rejects the duplicate response. If a seller approves a cancellation request for an item that has already been shipped, the system rejects the approval and displays an error. If a seller rejects a cancellation request, the system notifies the customer of the rejection.

### Request State Snapshot

When a seller responds to a cancellation request (approve or reject), the system creates a snapshot of the request state. If the system fails to create a snapshot when a seller responds, the system rejects the response and prevents the status change. If a snapshot is created for a cancellation request, the system records the request reason, the seller's response, and the timestamp of the response. If a customer or seller views a cancelled item's history, the system displays the cancellation request snapshot showing the original reason and response. If an administrator views order dispute information, the system displays all cancellation request snapshots for that order.

### Item Only Refund

When a seller approves a cancellation request, the system processes the refund for only that specific order item. If an order contains multiple items and one is cancelled, the system continues processing the remaining items normally. If all items in an order are cancelled, the system updates the overall order status to cancelled. If a customer has a mixed order with some items cancelled and others shipped, the system shows the order as partially completed. If a seller attempts to approve a cancellation for multiple items at once, the system processes each item individually and tracks each approval separately.

### Rejection Status Retention

When a seller rejects a cancellation request, the system retains the rejection status and reason. If a customer views their order items, the system displays any rejected cancellation requests with the rejection information. If a rejected cancellation request exists, the system prevents the customer from submitting another cancellation request for the same item. If an administrator views order history, the system displays all cancellation requests including rejected ones. If a seller rejects a cancellation request, the system preserves the rejection reason in the request snapshot for future reference.

### Automatic Stock Restoration

When a cancellation request is approved, the system automatically restores the stock quantity for that item's variant. If the system fails to restore stock after approval, the system flags the order item for manual review. If a variant's stock is restored, the system creates an inventory record showing the positive quantity change with reason "cancellation". If a customer cancels an item and the stock is restored, the system makes that variant available for purchase again immediately. If a seller views inventory history, the system displays the stock restoration record with the cancellation reference.

## RefundRequest Error Scenarios

Refund requests can only be created for order items with delivered status. Refund requests must be submitted within 7 days of delivery. Requests submitted after the 7-day window are rejected. Refund requests require a text reason from the customer. Sellers can approve or reject refund requests for their items. When sellers respond, a snapshot of the request state is created. Approved refunds process payment returns for that item only. Refunded items restore their stock quantities through inventory records.

### Delivered Status Requirement

WHEN a customer attempts to create a refund request, THE system SHALL verify that the order item has delivered status.

IF the order item status is not delivered, THEN THE system SHALL reject the refund request creation.

IF the order item status is paid, THEN THE system SHALL reject the refund request and inform the customer that the item must be delivered first.

IF the order item status is shipped, THEN THE system SHALL reject the refund request and inform the customer that the item must be delivered first.

IF the order item status is cancelled, THEN THE system SHALL reject the refund request and inform the customer that cancelled items cannot be refunded.

IF the order item status is already refunded, THEN THE system SHALL reject the refund request and inform the customer that the item has already been refunded.

### Seven Day Window

WHEN a customer attempts to create a refund request, THE system SHALL verify that the request is within 7 days of the item's delivery date.

IF the item was delivered more than 7 days ago, THEN THE system SHALL reject the refund request creation.

IF the item was delivered exactly 7 days ago, THEN THE system SHALL accept the refund request.

IF the item was delivered less than 7 days ago, THEN THE system SHALL accept the refund request.

THE system SHALL calculate the 7-day window from the delivery confirmation date for each order item.

### Expired Request Rejection

IF a refund request is submitted after the 7-day window expires, THEN THE system SHALL reject the request immediately.

IF a refund request is submitted after the 7-day window expires, THEN THE system SHALL inform the customer that the refund period has expired.

IF a refund request is submitted after the 7-day window expires, THEN THE system SHALL not create a refund request record.

THE system SHALL display the remaining time in the refund window to customers when they attempt to create a refund request.

### Text Reason Requirement

WHEN a customer creates a refund request, THE system SHALL require a text reason for the refund.

IF the customer submits a refund request without a text reason, THEN THE system SHALL reject the request.

IF the customer submits a refund request with an empty text reason, THEN THE system SHALL reject the request.

IF the customer submits a refund request with only whitespace in the reason field, THEN THE system SHALL reject the request.

THE system SHALL store the customer's text reason with the refund request.

### Seller Response Capability

WHEN a refund request is created, THE system SHALL allow only the seller of that order item to respond to the request.

IF a seller attempts to respond to a refund request for an item they do not sell, THEN THE system SHALL reject the response.

IF a seller attempts to approve a refund request, THEN THE system SHALL process the refund for that item only.

IF a seller attempts to reject a refund request, THEN THE system SHALL mark the request as rejected and no refund is processed.

IF a seller attempts to respond to an already responded refund request, THEN THE system SHALL reject the response.

### Request State Snapshot

WHEN a seller responds to a refund request, THE system SHALL create a snapshot of the request state.

THE snapshot SHALL record the timestamp of the seller's response.

THE snapshot SHALL record the seller's decision (approved or rejected).

THE snapshot SHALL record the previous state of the refund request before the response.

THE snapshot SHALL be immutable and cannot be modified after creation.

IF the system fails to create a snapshot when a seller responds, THEN THE system SHALL reject the seller's response.

### Item Only Refund

WHEN a seller approves a refund request, THE system SHALL process the refund for that specific order item only.

IF a seller approves a refund request for one item in an order, THEN THE system SHALL not affect other items in the same order.

IF a seller approves a refund request for one item in an order, THEN THE system SHALL not change the status of other items in the same order.

IF all items in an order are refunded, THEN THE system SHALL update the overall order status to refunded.

IF some items in an order are refunded and others are not, THEN THE system SHALL update the overall order status to partially completed.

### Inventory Stock Restoration

WHEN a refund request is approved, THE system SHALL restore the stock quantity for the refunded variant through an inventory record.

THE inventory record SHALL contain a positive quantity change equal to the quantity of the refunded item.

THE inventory record SHALL contain a reason indicating that the change is due to a refund.

THE inventory record SHALL contain a timestamp of when the refund was processed.

IF the system fails to create an inventory record when processing a refund, THEN THE system SHALL reject the refund approval.

THE current stock quantity SHALL be recalculated by summing all inventory records for the variant.

## Snapshot Error Scenarios

Snapshots are created whenever editable data is modified on the platform. Snapshots record when changes were made and what values changed. Previous and new values are both preserved in snapshots. Snapshots are immutable and cannot be deleted or modified. Product snapshots include all product fields and variant snapshots. Order items include snapshots of products, variants, and seller profiles at purchase time. Snapshots can be viewed by relevant parties for dispute resolution. Deleted products still have their snapshots preserved for historical reference.

### Modification Snapshot Creation Failure

WHEN a data modification is attempted, THE system SHALL create a snapshot before applying the change. IF snapshot creation fails for any reason, THEN THE system SHALL reject the modification and preserve the original data. THE system SHALL notify the user that the modification could not be completed due to a snapshot error. Users can retry the modification after the error is resolved.

### Change Timestamp Recording Errors

WHEN a snapshot is created, THE system SHALL record the exact timestamp of the change. IF timestamp recording fails or produces an invalid value, THEN THE system SHALL reject the snapshot creation. THE system SHALL ensure all timestamps use a consistent time format. Snapshots with missing or invalid timestamps are not stored and the modification is not applied.

### Before After Value Preservation Failure

WHEN a snapshot is created, THE system SHALL preserve both the previous values and the new values. IF the system cannot capture the previous values, THEN THE snapshot creation is rejected. IF the system cannot capture the new values, THEN THE snapshot creation is rejected. Partial snapshots containing only before or after values are not stored. Users are notified when value preservation fails.

### Immutable Snapshot Modification Attempts

IF a user attempts to modify an existing snapshot, THEN THE system SHALL reject the request. Snapshots are immutable and cannot be edited under any circumstances. IF a user attempts to delete a snapshot, THEN THE system SHALL reject the request. All snapshots remain permanently preserved in the system. Only authorized parties can view snapshots; modification and deletion are not permitted for any user role.

### Product Variant Inclusion Errors

WHEN a product snapshot is created, THE system SHALL include snapshots of all variants at that moment. IF any variant data cannot be captured, THEN THE product snapshot creation is rejected. Product snapshots without complete variant information are not stored. The product modification is not applied if variant snapshot creation fails. Sellers are notified when product editing fails due to variant snapshot errors.

### Purchase Time Snapshot Preservation

WHEN an order is placed, THE system SHALL create snapshots of products, variants, and seller profiles at purchase time. IF any purchase-time snapshot cannot be created, THEN THE order creation is rejected. Order items without complete product, variant, and seller profile snapshots are not created. Customers cannot complete checkout if purchase snapshots fail. THE system SHALL preserve these snapshots permanently even if products or sellers are later deleted.

### Unauthorized Snapshot Access

IF a user attempts to view snapshots they are not authorized to access, THEN THE system SHALL reject the request. Customers can only view snapshots of products they purchased in their order items. Sellers can only view snapshots of their own products and their own profile. Administrators can view all snapshots on the platform. Unauthorized access attempts are logged and denied.

### Deletion Snapshot Retention

WHEN a product is deleted, THE system SHALL preserve all product snapshots permanently. WHEN a variant is deleted, THE system SHALL preserve all variant snapshots permanently. WHEN a seller deletes their account, THE system SHALL preserve all product and profile snapshots. WHEN a customer deletes their account, THE system SHALL preserve all order item snapshots. Snapshots are never deleted even when the associated entity is deleted. Deleted entities still have their complete snapshot history available to authorized parties.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### Customer Shopping Journey

THE shopping mall platform SHALL support a complete customer shopping journey from product discovery to post-purchase review.

WHEN a customer searches for products, THE shopping mall platform SHALL display search results with product name, main image, price, seller shop name, and average rating.

WHEN a customer views a product detail page, THE shopping mall platform SHALL display all product images, name, description, category, seller information, available variants with prices and stock status, average rating, and all reviews.

WHEN a customer wants to save a product for later, THE shopping mall platform SHALL allow the customer to add the product to their wishlist.

WHEN a customer wants to purchase a product, THE shopping mall platform SHALL require the customer to select a specific variant and specify quantity before adding to cart.

WHEN a customer adds the same variant to cart multiple times, THE shopping mall platform SHALL combine quantities into a single cart item.

WHEN a customer proceeds to checkout, THE shopping mall platform SHALL require the customer to select a shipping address and review order summary including items, prices, shipping address, and total price.

WHEN a customer confirms payment successfully, THE shopping mall platform SHALL create an order, decrease stock quantities, remove items from cart, and set all order items to paid status.

WHEN a customer confirms delivery of a shipment, THE shopping mall platform SHALL change all items in that shipment to delivered status.

WHEN an order item reaches delivered status, THE shopping mall platform SHALL allow the customer to write a review with a rating from 1 to 5 stars and optional text content.

WHEN a customer writes a review, THE shopping mall platform SHALL display the review on the product detail page and include it in the average rating calculation.

WHEN a customer edits their review, THE shopping mall platform SHALL create a snapshot preserving the previous review state.

### Seller Order Fulfillment Journey

THE shopping mall platform SHALL support a complete seller order fulfillment journey from order receipt to delivery confirmation.

WHEN a seller receives a new order for their product, THE shopping mall platform SHALL display the order item with customer information, product details, variant information, quantity, price, and shipping address.

WHEN a seller prepares to ship items, THE shopping mall platform SHALL allow the seller to select one or more order items from the same seller to include in a single shipment.

WHEN a seller creates a shipment, THE shopping mall platform SHALL require the seller to enter carrier name and tracking number.

WHEN a seller creates a shipment, THE shopping mall platform SHALL change all included order items to shipped status.

WHEN a seller receives a cancellation request for a paid order item, THE shopping mall platform SHALL allow the seller to approve or reject the request with a snapshot created for the response.

WHEN a seller approves a cancellation request, THE shopping mall platform SHALL change the order item to cancelled status and restore the stock quantity.

WHEN a seller receives a refund request for a delivered order item, THE shopping mall platform SHALL allow the seller to approve or reject the request with a snapshot created for the response.

WHEN a seller approves a refund request, THE shopping mall platform SHALL change the order item to refunded status and restore the stock quantity.

WHEN a seller views their dashboard, THE shopping mall platform SHALL display total products, total order items, pending cancellation requests, and pending refund requests.

WHEN a seller edits their product, THE shopping mall platform SHALL create a snapshot preserving all product fields and variant information at the time of the change.

WHEN a seller edits their shop profile, THE shopping mall platform SHALL create a snapshot preserving the previous shop name, description, and logo.

### Administrator Oversight Journey

THE shopping mall platform SHALL support a complete administrator oversight journey from seller approval to dispute resolution.

WHEN a seller submits a registration request, THE shopping mall platform SHALL make the request visible to administrators with pending approval status.

WHEN an administrator reviews a seller registration, THE shopping mall platform SHALL allow the administrator to approve or reject the request.

WHEN an administrator rejects a seller registration, THE shopping mall platform SHALL require the administrator to provide a rejection reason.

WHEN a seller is approved, THE shopping mall platform SHALL allow the seller to create products and manage their shop.

WHEN an administrator views products, THE shopping mall platform SHALL display products from all sellers with the ability to filter and search.

WHEN an administrator views a product snapshot, THE shopping mall platform SHALL display the complete product state at the time of the snapshot including all variants.

WHEN an administrator force-cancels an order item, THE shopping mall platform SHALL change the item to cancelled status, process a refund, and restore the stock quantity.

WHEN an administrator force-refunds an order item, THE shopping mall platform SHALL change the item to refunded status and restore the stock quantity.

WHEN an administrator suspends a seller, THE shopping mall platform SHALL hide the seller's products from search and category listings while allowing existing order processing.

WHEN an administrator unsuspends a seller, THE shopping mall platform SHALL make the seller's products visible again in search and category listings.

WHEN an administrator views order snapshots, THE shopping mall platform SHALL display product information, variant details, and seller profile as they existed at the time of purchase.

### Customer Order Management Journey

THE shopping mall platform SHALL support a complete customer order management journey from order placement to cancellation or refund.

WHEN a customer views their order history, THE shopping mall platform SHALL display all orders sorted by newest first with order number, date, total price, and overall status.

WHEN a customer views an order detail, THE shopping mall platform SHALL display all order items with product name, variant, quantity, price, and individual item status.

WHEN a customer views an order detail, THE shopping mall platform SHALL display the shipping address used for the order.

WHEN a customer views an order detail, THE shopping mall platform SHALL display all shipments with tracking information and which items are included in each shipment.

WHEN a customer wants to cancel an order item with paid status, THE shopping mall platform SHALL allow the customer to submit a cancellation request with a reason.

WHEN a customer submits a cancellation request, THE shopping mall platform SHALL notify the seller and wait for approval or rejection.

WHEN a customer wants to request a refund for a delivered order item, THE shopping mall platform SHALL allow the customer to submit a refund request with a reason within 7 days of delivery.

WHEN a customer submits a refund request, THE shopping mall platform SHALL notify the seller and wait for approval or rejection.

WHEN a customer confirms delivery of a shipment, THE shopping mall platform SHALL change all items in that shipment to delivered status.

WHEN 14 days pass from shipment without customer confirmation, THE shopping mall platform SHALL automatically change all items in the shipment to delivered status.

WHEN a customer views a product they purchased, THE shopping mall platform SHALL allow the customer to view the product snapshot as it existed at the time of purchase.

# External Integrations

Third-party API contracts, webhook handlers, and integration specifications.

## Integration Contracts

Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.

### Payment Gateway Integration

THE shopping mall platform SHALL integrate with an external payment gateway to process customer payments.

WHEN a customer confirms checkout, THE platform SHALL transmit payment information to the external payment gateway.

THE platform SHALL receive payment status from the external payment gateway.

IF payment succeeds, THE platform SHALL create the order and proceed with order fulfillment.

IF payment fails, THE platform SHALL NOT create the order and SHALL allow the customer to retry payment.

THE platform SHALL NOT store payment card details directly; all payment processing SHALL occur through the external payment gateway.

Customers SHALL be able to retry payment if the initial payment attempt fails.

WHEN payment succeeds, THE platform SHALL receive confirmation from the external payment gateway before creating the order.

# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### Seller Logo File Upload

Sellers can upload a logo image file for their shop profile.

Sellers can replace their existing logo image with a new file upload.

When a seller uploads or replaces their logo, a snapshot of the seller profile is created to preserve the previous logo.

Sellers can view their current logo image on their profile.

Customers can view seller logos on seller profile pages and product listings.

The logo image is displayed alongside the shop name and description.

### Product Image File Upload

Sellers can upload multiple image files for each product they create.

Sellers can add image files to existing products at any time.

Sellers can upload image files in various supported formats for product display.

When image files are added to a product, a product snapshot is created to preserve the previous state.

Sellers can view all uploaded image files for their products.

Customers can view all product images on the product detail page.

The first image in the upload order is displayed as the main thumbnail image in product listings.

### Media File Management

Sellers can reorder the image files for their products to change display sequence.

Sellers can set which image appears as the main thumbnail by reordering.

Sellers can delete image files from their products.

When image files are deleted from a product, a product snapshot is created to preserve the previous state.

Sellers can view the current order of image files for their products.

Product images are included in product snapshots to preserve historical display.

Deleted images are removed from product listings but preserved in snapshots.

### File Storage and Access

The system stores uploaded image files for seller profiles and products.

Stored image files are accessible to relevant users based on their permissions.

Seller logo image files are stored and associated with the seller profile.

Product image files are stored and associated with the product.

Image files are preserved in snapshots when products or profiles are modified.

Deleted products remove their images from active listings but preserve them in snapshots.

Deleted seller accounts remove their logo from active display but preserve it in order snapshots.