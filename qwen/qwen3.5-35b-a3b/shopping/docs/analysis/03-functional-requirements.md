**ecommerceMall — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## Customer Operations

Customers must register with email and password to access any platform features. After registration, customers can log in using their email and password credentials. Customers can update their profile information including display name and phone number at any time. Password changes are supported through a dedicated process that requires verification. Customers can delete their accounts, which removes their profile information but preserves order history and reviews for legal and seller record purposes. When an account is deleted, customer reviews display as written by a deleted user. Customers can view their complete order history showing all past purchases. The system maintains customer data integrity throughout the account lifecycle.

### Customer Registration

The system requires all users to register an account before accessing any platform features. No guest browsing is permitted.

Customers can register by providing an email address and creating a password. The email address must be unique across the platform; if an email is already registered, the registration request is rejected with an appropriate message.

After successful registration, the customer account is created with a member status, granting access to all customer features including shopping, order management, and wishlist functionality.

### Email and Password Login

Customers can log in to their accounts using their registered email address and password credentials.

The system validates the email and password combination. If the credentials match a registered account, the customer is granted access to the platform.

If the email address does not exist or the password is incorrect, the login attempt is rejected with an appropriate error message.

### Display Name Management

Each customer has a display name that appears in the platform as their visible identity.

Customers can edit their display name through their profile settings. The display name update takes effect immediately upon submission.

Every change to the display name creates a snapshot that records when the change was made and the values before and after the update.

### Phone Number Management

Each customer has a phone number stored in their profile for contact purposes.

Customers can add or update their phone number through their profile settings.

Every change to the phone number creates a snapshot that records when the change was made and the values before and after the update.

### Password Change Operation

Customers can change their password at any time through the account settings interface.

To change a password, the customer must verify their current password. Upon successful verification, the customer can enter and confirm a new password.

Every password change creates a snapshot that records when the change was made. The new password immediately takes effect for future login attempts.

### Account Deletion Process

Customers can request to delete their account at any time.

When an account is deleted:
- The customer's profile information including display name and phone number is permanently removed
- Order history and order records are preserved for seller records and legal purposes
- Reviews written by the customer are preserved but displayed as written by a deleted user

The account deletion process is permanent and cannot be reversed. All future access to the platform using the deleted account credentials is blocked.

### Order History Preservation

Even after a customer deletes their account, their order history is preserved in the system.

Order records maintain the original customer identification at the time of purchase. Order details including items purchased, prices paid, and shipping addresses remain accessible.

Order history is preserved for seller records, legal compliance, and dispute resolution purposes.

### Deleted User Review Display

Reviews written by customers who have deleted their accounts remain in the system.

Deleted user reviews are displayed on the product detail page with an indication that the review was written by a deleted user.

The review content including rating and text remains visible to maintain transparency in product feedback. Deleted user reviews are included in average rating calculations.

### Access Restriction to Registered Users

All platform features require a registered and logged-in customer account.

Guest users (users who have not registered) cannot access any features of the platform, including product browsing, search, and category viewing.

Only registered customers with valid active accounts can add products to cart, place orders, manage wishlists, and interact with the platform.

### Customer Data Management

Customers can view and manage their profile information through the account settings interface.

Customers can view their profile data including display name and phone number at any time. Updates to profile information are subject to validation and create audit snapshots.

The system maintains data integrity throughout the customer account lifecycle, ensuring all changes are properly recorded.

### Profile Information Visibility

Customer profile information is private and accessible only to the account owner.

Display name and phone number are visible to the customer in their profile settings but are not displayed publicly on the platform.

Seller information and product details remain visible to all customers regardless of account status.

## Seller Operations

Sellers register with email and password and must await administrator approval before selling begins. Sellers can view their approval status as pending, approved, or rejected. Rejected sellers can see the rejection reason and submit a new registration request. Approved sellers manage their shop profile including shop name, description, and logo image. Each profile edit creates a snapshot preserving the previous state. Sellers can delete their account only if no pending orders exist and no pending cancellation or refund requests are active. When a seller account is deleted, their products are removed from listings while order history and snapshots remain intact. The system tracks seller activity and approval workflow throughout their lifecycle.

### Seller Registration

Sellers begin their journey by signing up with an email address and password. The registration form requires both email and password fields to be completed. After submission, the seller account is created but remains in pending approval status. The seller cannot list products, receive orders, or access the seller dashboard until their account is approved by an administrator. The system sends a confirmation to the seller when registration is complete and their account is awaiting approval.

### Administrator Approval Requirement

Every seller account requires administrator approval before the seller can begin selling. Administrators review pending seller registration requests and decide whether to approve or reject them. No seller account is active for business purposes until an administrator grants approval. The approval requirement ensures platform quality and prevents fraudulent or non-compliant sellers from operating on the marketplace.

### Approval Status Viewing

Sellers can view their current approval status at any time. The system displays one of three statuses: pending, approved, or rejected. When the status is pending, the seller knows they are awaiting administrator review. When approved, the seller gains full access to seller features and can begin listing products. The seller can check this status from their profile or dashboard area without needing to contact support.

### Pending Approval State

When a seller account is under review by administrators, it remains in pending approval state. During this state, the seller cannot list products, process orders, or perform any selling-related activities. The seller can still log in and view their status but the account features are restricted. Administrators review the pending requests and take action to approve or reject within a reasonable timeframe.

### Rejection Reason Visibility

If an administrator rejects a seller registration request, the seller can view the specific rejection reason provided by the administrator. The rejection reason explains what was wrong with the application or what requirements were not met. This transparency helps sellers understand what improvements are needed before resubmitting their registration. The seller can access the rejection reason from their profile area.

### Resubmission After Rejection

Sellers whose registration requests were rejected can submit a new registration request after addressing the issues identified in the rejection reason. The resubmission process allows the seller to provide corrected or additional information. The new request goes through the same approval workflow as the original application. There is no limit to the number of resubmissions, but each resubmission requires administrator review.

### Shop Profile Management

Approved sellers can manage their shop profile to maintain accurate and current information. The shop profile includes the shop name, shop description, and logo image. Sellers can update any of these fields at any time to reflect changes in their business. All profile changes are subject to the snapshot principle, ensuring historical accuracy for dispute resolution and customer transparency.

### Shop Name Editing

Sellers can edit their shop name to reflect business changes, rebranding, or other modifications. When a seller updates their shop name, the change takes effect immediately for all future displays. However, all past orders and transactions preserve the shop name as it was at the time of purchase. The editable shop name allows sellers flexibility in managing their business identity while maintaining historical accuracy in records.

### Shop Description Editing

Sellers can edit their shop description to update their business information, add new product categories, or modify their value proposition. The shop description is displayed to customers viewing the seller's profile. When the description is updated, the previous version is preserved in a snapshot. Customers viewing the profile see the current description, while historical snapshots allow tracing of how the shop's messaging has evolved.

### Logo Image Management

Sellers can upload and manage their shop logo image. The logo serves as the visual identity of the seller's shop. Sellers can upload a new logo or replace an existing one. When a logo is changed, the previous logo is preserved in snapshots. The current logo appears on the seller profile page and in order confirmations. Sellers have full control over their logo management and can update it as needed.

### Profile Snapshot Creation

Every time a seller edits their shop profile (shop name, description, or logo), the system automatically creates a snapshot of the previous state. The snapshot records when the change was made, what was changed, and the values before and after the modification. These snapshots are immutable and cannot be deleted. Relevant parties, including the seller and administrators, can view these snapshots for dispute resolution, transparency, and historical tracking. This snapshot mechanism ensures complete auditability of all profile changes.

### Seller Account Deletion Conditions

Sellers can delete their account, but only under specific conditions. The seller must have no pending orders with paid or shipped status and no pending cancellation or refund requests. These conditions protect customers who have already paid for products or have active dispute processes. The system performs checks of all order statuses and request statuses before allowing account deletion.

### No Pending Orders Requirement

Before a seller account can be deleted, the system verifies there are no pending orders with paid or shipped status and no pending cancellation or refund requests. If any such orders or requests exist, the deletion request is rejected and the seller is notified. This requirement ensures customer purchases are not jeopardized by seller account termination. The seller must wait until all orders are completed, cancelled, or refunded before the account deletion becomes possible.

### Order History Preservation

When a seller account is deleted, their order history and all associated order snapshots are preserved. This preservation is necessary for legal compliance, tax reporting, and dispute resolution. Customers can continue to view their order history, and order records remain intact even after the seller account is gone. The historical data remains accessible and searchable for all relevant parties.

### Seller Listing Removal

When a seller account is deleted, all their product listings are removed from the marketplace. Products no longer appear in search results or category listings. However, products in completed orders are preserved in order history with snapshots of their state at the time of purchase. This ensures customers can still reference their past purchases while preventing deleted seller products from being discovered or purchased.

## Product Operations

Sellers create products with a required name, description, category selection, and base price. Products belong to the creating seller and can only be edited by that seller. Every product edit automatically creates a snapshot recording the previous state and changes. Sellers can delete their products only when no pending order items exist for any variant and no pending cancellation or refund requests are active. Deleting a product removes all its variants and inventory records from the platform. Deleted products no longer appear in search results or category listings. Sellers can view snapshots of their own products to track modifications over time. Administrators can view snapshots of any product on the platform for oversight purposes.

### Product Creation Process

Sellers can create products for their shop by providing the following required information:

- Product name (required)
- Product description (required)
- Product category (required; sellers may select a subcategory)
- Base price (required)

Once created, the product is immediately associated with the creating seller and becomes visible in search results and category listings. Each product belongs exclusively to the seller who created it.

### Seller-Owned Products

Products are owned by the seller who created them. Only the owning seller can edit or delete their own products. Products remain associated with the creating seller for the lifetime of the product unless the seller account is suspended or deleted.

Sellers can view all their products through their seller dashboard. Each product shows its current status, including whether it is available for purchase (has in-stock variants) or unavailable (no variants or all variants are out of stock).

### Product Name Requirement

Every product must have a product name. When creating a product, the seller must provide a non-empty product name. If no product name is provided, the product creation request is rejected and the seller receives an error message.

Product names are used in search results, product listings, and on product detail pages where customers browse and select products.

### Product Description Requirement

Every product must have a product description. When creating a product, the seller must provide a non-empty product description. If no product description is provided, the product creation request is rejected and the seller receives an error message.

Product descriptions provide customers with details about the product features, materials, and usage. Descriptions are displayed on the product detail page.

### Category Selection

Every product must belong to a category. When creating or editing a product, the seller must select a category. Categories may have subcategories (one level of nesting), and sellers may select either a parent category or a subcategory.

Categories are created and managed by administrators only. Products without a category selection cannot be created or updated. The selected category determines where the product appears in category browsing.

### Base Price Requirement

Every product must have a base price. When creating a product, the seller must provide a numeric base price. The base price represents the starting price for the product, though individual variants may have different prices.

If no base price is provided, the product creation request is rejected. Base prices are displayed in search results and product listings, often as a price range when variants have different prices.

### Product Editing Process

Sellers can edit their own products at any time. When editing a product, the seller can modify:

- Product name
- Product description
- Product category
- Base price
- Product images (add, remove, or reorder)

All edits are recorded through the snapshot mechanism to preserve the previous state of the product for dispute resolution and audit purposes.

### Product Snapshot Creation

Every time a product is edited, a product snapshot is automatically created. The snapshot records:

- When the change was made (timestamp)
- What fields were changed
- The values before the change
- The values after the change

The snapshot includes all product fields: name, description, category, base price, and images. The snapshot also captures all product variants at that moment, including their option values, prices, and stock quantities.

### Product Deletion Restrictions

Sellers can delete their products only when all of the following conditions are met:

- There are no pending order items with paid or shipped status for any variant of the product
- There are no pending cancellation requests for any variant of the product
- There are no pending refund requests for any variant of the product

If any of these conditions are not met, the product deletion request is rejected. The seller must wait until all pending transactions are completed before deleting the product.

### Pending Order Items Check

Before allowing product deletion, the system checks for pending order items. A pending order item is one with status "paid" or "shipped". If any variant of the product has such order items, the deletion request is rejected.

This check ensures that customers who have already paid for or received products are not affected by seller product deletions. The check applies to all variants of the product.

### Cancellation Request Check

Before allowing product deletion, the system checks for pending cancellation requests. If any variant of the product has a cancellation request that has not been approved or rejected, the deletion request is rejected.

This ensures that cancellation requests can be fully processed before the product is removed. The seller must wait until all cancellation requests are resolved before deleting the product.

### Product Deletion Process

When a product deletion is approved, the following occurs:

1. The product is removed from all search results and category listings
2. All product variants are deleted
3. All inventory records for the variants are removed
4. The product no longer appears in the seller's product list

However, the following data is preserved:
- Snapshots of the product and its variants (for historical records)
- Order items that reference the product (order history remains intact)
- Reviews written for the product (showing the product in historical context)

### Variant Deletion on Product Deletion

When a product is deleted, all of its variants are automatically deleted as well. This includes:

- All option values associated with the product
- All variant prices and stock quantities

This ensures that no orphaned variants remain in the system after product deletion. The deletion of variants is part of the product deletion process and cannot be undone.

### Inventory Records Removal

When a product is deleted, all inventory records for its variants are also deleted. Inventory records track stock changes over time, but when the product no longer exists, the inventory history is no longer needed.

This cleanup applies to all inventory records regardless of their reason (restock, adjustment, or order deduction). The removal is automatic and occurs as part of the product deletion process.

### Search Listing Removal

Deleted products are immediately removed from all search results and category listings. Customers browsing categories or searching the platform will no longer see deleted products. This applies to:

- All category pages where the product appeared
- All search results matching the product name or description
- All seller product listings

The product does not appear as unavailable or with any placeholder; it simply no longer exists in the platform's active product catalog.

### Seller Product View

Sellers can view their products through the seller dashboard. The product list displays:

- Product name
- Product category
- Current base price
- Number of variants
- Current stock status (available or unavailable)
- Average rating (if reviews exist)

Sellers can filter and sort their product list. Each product entry provides access to detailed views for editing, variant management, and snapshot review.

### Administrator Product Oversight

Administrators can view all products on the platform regardless of ownership. This oversight capability includes:

- Viewing product details for any product
- Reviewing snapshots of any product
- Deleting products for policy violations

Administrators have full visibility into all product data across all sellers, enabling platform-wide quality control and policy enforcement.

### Product Modification Tracking

The platform tracks all product modifications through the snapshot system. Every edit to a product creates a new snapshot that records:

- The timestamp of the modification
- The seller who made the change
- The fields that were modified
- The previous values before the change
- The new values after the change

These snapshots provide a complete audit trail of product changes over time, supporting dispute resolution, fraud detection, and platform governance.

### Product Snapshot Review

Sellers can review snapshots of their products to track modifications over time. The snapshot review shows:

- A chronological list of all snapshots
- For each snapshot: timestamp, what was changed, and before/after values
- The ability to view detailed variant information at each snapshot point

This enables sellers to monitor product history, resolve disputes with customers, and understand changes to their product catalog.

Administrators can also review snapshots of any product on the platform for oversight and dispute resolution purposes.

## ProductVariant Operations

Sellers add variants to products representing specific option combinations like color and size. Each variant requires a unique SKU code, option values, and stock quantity. Stock quantity starts at zero when a variant is created. Variants can optionally override the product's base price with their own price. Sellers can edit variant SKU codes, option values, and prices, with each edit creating a snapshot. Variants can only be deleted when no pending order items exist for that specific variant and no pending cancellation or refund requests are active. Products must have at least one variant to be purchasable. Products with no variants appear in search but display as unavailable. When stock reaches zero, variants show as out of stock and cannot be added to cart.

### Variant Creation

Sellers can create variants for their products. Each variant represents a specific combination of options such as color and size. When creating a variant, sellers must provide a unique identifier code and option values that describe the specific combination. The variant must have a stock quantity starting at zero. Variants can optionally have a price that overrides the product's base price. Each variant belongs to the product created by the seller. Sellers can add multiple variants to a single product to represent different option combinations.

### Unique Identifier Requirement

Each variant must have a unique identifier code that distinguishes it from all other variants in the system. This code must be unique across all variants on the platform. If a seller attempts to create a variant with an identifier code that already exists, the creation is rejected. The identifier code is required and cannot be left blank. This requirement ensures that each variant can be uniquely identified for inventory tracking, order processing, and customer selection.

### Option Value Management

Each variant represents a specific combination of product options. Sellers define option values when creating a variant, such as color, size, or other distinguishing characteristics. These option values describe the specific characteristics of the variant. Variants with different option combinations can exist within the same product. For example, a single product might have variants for "Red / Large", "Red / Small", "Blue / Large", and "Blue / Small". Customers select specific option combinations when adding variants to their cart.

### Variant Price Override

Variants can have their own price that differs from the product's base price. This price is optional - if not specified, the variant uses the product's base price. When a variant has a specific price, that price overrides the base price for all transactions involving that variant. The variant price is shown to customers on product pages, in search results, and during checkout. If multiple variants in a product have different prices, the product listing shows the price range from lowest to highest.

### Stock Quantity Requirement

Each variant must have a stock quantity recorded. When a variant is created, its stock quantity starts at zero. Sellers must add inventory through inventory history records to increase the stock quantity. Stock quantity changes are tracked through inventory records that document each restock, order deduction, or adjustment. The current stock level is calculated by summing all inventory records for that variant. Stock quantity is required for all variants and cannot be zero or negative.

### Variant Editing Process

Sellers can edit their own variants to update the identifier code, option values, and price. When any field of a variant is modified, a snapshot is created to preserve the previous state. Snapshots record when the change was made, what fields were changed, and the values before and after the edit. Edited variants continue to exist with the new values. However, variants cannot be edited if there are pending order items, cancellation requests, or refund requests for that specific variant.

### Variant Snapshot Creation

Every edit to a variant creates a snapshot that captures the complete state of the variant at that moment. The variant snapshot includes the identifier code, option values, price, and all variant attributes. When a product is edited, a product snapshot is created that includes snapshots of all its variants at that time, preserving the complete variant state. Snapshots are immutable and cannot be deleted. Sellers can view snapshots of their own variants, and administrators can view snapshots of any variant.

### Variant Deletion Conditions

Sellers can delete variants from their products only under specific conditions. A variant cannot be deleted if there are any pending order items with paid or shipped status for that variant. A variant cannot be deleted if there are any pending cancellation requests or refund requests for that variant. When a variant is deleted, all inventory records for that variant are removed. Deleted variants no longer appear in product detail pages, search results, or category listings. Snapshots of deleted variants are preserved for dispute resolution.

### Minimum Variant Requirement

A product must have at least one variant to be purchasable. Products without any variants are visible in search and category listings but are shown as "unavailable" to customers. The unavailable status indicates that no options can be selected for that product. Customers cannot add products with no variants to their cart. Sellers must add at least one variant to a product before it can be purchased by customers.

### Unavailable Product Display

Products with no variants or all variants out of stock are displayed as unavailable in search results, category listings, and product pages. The unavailable status is shown with a clear indication that the product cannot be purchased. Unavailable products do not appear as purchasable options - the add to cart button is disabled or not shown. Customers can still view product details for unavailable products, including the description and seller information, but cannot complete a purchase.

### Out of Stock Display

When a variant's stock quantity reaches zero, the variant is shown as "out of stock" on product pages and in search results. Out of stock variants cannot be added to the customer's cart. The out of stock status is shown clearly to customers to indicate the variant cannot be purchased at that time. When inventory is added through inventory records, the out of stock status is removed and the variant becomes purchasable again. Out of stock variants remain visible on the product page for customer information.

### Cart Addition Restrictions

Customers must select a specific variant when adding items to their cart - they cannot add a product without selecting a variant option. When adding to cart, the system validates that the selected variant has available stock. If the variant's stock is less than the requested quantity, a warning is shown to the customer. Out of stock variants cannot be added to the cart at all. If a variant becomes out of stock while in the cart, the item is marked as unavailable. Customers cannot check out with unavailable items in their cart.

### Variant Selection in Cart

When customers add items to their cart, they must specify which variant they are adding and the quantity. The cart displays each item with the product name, variant option values, price per unit, quantity, and subtotal. If the same variant is already in the cart, additional quantities are combined with the existing quantity rather than creating a separate line item. The cart shows the total price of all items and the current stock status for each variant.

### Stock-Based Availability Display

The system displays the available stock quantity for each variant on the product detail page. This information helps customers understand how much inventory is available before making a purchase decision. The stock display updates in real time as inventory changes occur through orders, restocks, or adjustments. Products show the price and stock status for each variant option, allowing customers to compare availability and pricing before selection.

## Category Operations

Categories organize products with the ability to have one level of subcategories. Each category requires a name and description. Only administrators can create, edit, and delete categories through their administrative panel. Customers browse the complete list of available categories. Customers can navigate into categories to view all products within them. Subcategories allow hierarchical product organization for better discovery. When administrators delete a category, products within it become uncategorized. Customers cannot modify category structure or content directly. Categories provide the primary navigation structure for product browsing.

### Category Creation by Administrator

Administrators can create new categories for organizing products on the platform.

Each category requires a name and description that must be provided during creation. The name and description cannot be empty or missing.

The administrator enters the category name and description when creating a new category.
The system rejects the creation if the name is missing.
The system rejects the creation if the description is missing.

### Subcategory Creation with Parent Assignment

Administrators can create subcategories that belong to an existing parent category.

Subcategories provide one level of nesting under their parent category. A subcategory is displayed as nested under its parent in category listings.

When creating a subcategory, the administrator selects a parent category from the list of existing categories.
A category can have multiple subcategories, but each subcategory has only one parent.

### Category Editing and Change Tracking

Administrators can edit existing categories to update their name or description.

When an administrator edits a category, the system records a snapshot of the previous state. The snapshot captures when the change was made, what was changed, and the values before and after.

The administrator selects a category to edit from the category list.
The administrator updates the category name and/or description.
A snapshot of the previous category name and description is created.
Other administrators and customers see the updated category information.

### Category Deletion and Uncategorized Handling

Administrators can delete existing categories from the platform.

When a category is deleted, all products that were in that category become uncategorized. Uncategorized products remain visible in the system but are no longer grouped under a category. Products can later be assigned to a different category by sellers.

The administrator selects a category to delete from the category list.
All products in the deleted category become uncategorized.
Uncategorized products are visible in product listings but not displayed in any category navigation.

### Category Name and Description Requirements

Every category must have a name and description.

The category name is required and must be provided during category creation. The name cannot be empty or missing.
The category description is required and must be provided during category creation. The description cannot be empty or missing.

During category creation, the system requires a name and description to be entered.
The system rejects category creation if no name is provided.
The system rejects category creation if no description is provided.
Category names and descriptions are displayed in all customer-facing category listings and navigation.

### Administrator-Only Category Management

Only administrators can create, edit, or delete categories.

Customers cannot create, edit, or delete categories. Customers can only browse and view categories and products within them.

The system grants category management permissions only to administrators.
Customers attempting to create, edit, or delete categories are denied access.
Category management is performed through the administrator panel only.

### Category Browsing and Hierarchical Navigation

Customers can view a list of all categories on the platform.

Categories provide the primary navigation structure for product browsing. Customers access categories through the platform navigation to discover products. The category list shows all category names available on the platform.

Customers access the category list from the platform navigation.
Customers can select any category to view its products.
Customers can navigate from the main category list to parent categories.
The navigation reflects the one-level nesting structure.

### Product Display in Category and Subcategory

Customers can view all products that belong to a selected category or subcategory.

When a customer selects a category or subcategory, the system displays all products in that category. Products are shown with their main image, name, price, seller shop name, and average rating.

The customer selects a category or subcategory from the category list.
The system displays all products belonging to that category.
When viewing a subcategory, customers see only products assigned to that subcategory.
Products in subcategories are not displayed in the parent category listing.
The hierarchy shows which category each product belongs to on the product detail page.

### One Level Nesting Restriction

Categories support one level of nesting only.

A category can have subcategories, but subcategories cannot have their own subcategories. This creates a flat hierarchy with categories at the top level and subcategories nested one level deep.

Customers can navigate to a category and see its subcategories listed.
Subcategories are displayed under their parent category.
A subcategory cannot contain further subcategories.
The system prevents creating subcategories under subcategories.

### Product Organization Through Categories

Products are organized into categories to facilitate customer browsing.

When sellers create a product, they select a category (which may be a subcategory). Products are associated with the selected category.

Customers browse products by navigating to categories.
Products are displayed within their assigned category.
Products must belong to a category (or become uncategorized if the category is deleted).

### Uncategorized Products Display

Products without a category are marked as uncategorized.

When a category is deleted, products that were in that category become uncategorized. Uncategorized products remain in the system and can be reassigned to a different category.

Uncategorized products are visible in product listings and search results.
Uncategorized products do not appear in any category navigation or browse.
Sellers can update uncategorized products by assigning them to a different category.

### Category Visibility to All Customers

Categories are visible to all customers for browsing purposes.

All customers can view the category list and products within categories. Categories cannot be hidden from specific customer groups.

Customers accessing the platform see all available categories.
Categories are not restricted based on customer permissions.
All customers can browse the complete category structure.

## Order Operations

Customers create orders by confirming checkout after selecting shipping address and reviewing order summary. Orders contain one or more order items that can come from different sellers. Order placement creates the order record, decreases stock quantities, and removes items from cart. Each order item snapshot captures product, variant, and seller profile state at purchase time. Order status derives from item statuses: paid when all items are paid, shipped when any item is shipped, delivered when all items are delivered, cancelled when all items are cancelled, refunded when all items are refunded, or partially completed for mixed states. Customers view paginated order history sorted by newest first. Each order shows order number, date, total price, and overall status in the list view. Order status updates automatically as items progress through their lifecycle.

### Order Creation Process

Customers proceed to checkout from their shopping cart. Before checkout, customers must select a shipping address from their saved addresses or set a default address. All items in the cart must be available (not deleted, not out of stock) to proceed. If any item is unavailable, the customer cannot complete checkout.

Customers review the order summary before placing the order. The summary displays: list of all items with product names, variant options, quantities, and prices; the selected shipping address; and the total price for all items. The order summary is the final confirmation step before order creation.

Once the customer confirms and places the order, an order record is created in the system. The order contains one or more order items, each representing a purchased product variant with its quantity. Items from different sellers may be grouped into the same order.

When the order is created, stock quantities are decreased for each purchased variant. The purchased variants are removed from the customer's shopping cart. Each order item is created with status "paid" indicating payment has been completed.

For each order item, a product snapshot is created and saved. This snapshot captures: the product name, description, category, and all variant options with prices at the time of purchase. This snapshot is immutable and preserved even if the product is later modified or deleted.

For each order item, a seller profile snapshot is created and saved. This snapshot captures: the seller's shop name and logo at the time of purchase. This snapshot is immutable and preserved even if the seller profile is later modified.

If payment processing fails, the order is not created and the customer can retry the checkout process. The shopping cart remains unchanged if payment fails.

### Order Status Derivation

The overall order status is derived from the statuses of its individual order items. The system calculates the order status automatically based on the current states of all items in the order.

If all order items in an order have status "paid", the order status is "paid". This indicates all items have been paid for but not yet shipped.

If any order item in an order has status "shipped" and no item has status "delivered" yet, the order status is "shipped". This indicates at least one item is in transit while others may still be paid or shipped.

If all order items in an order have status "delivered", the order status is "delivered". This indicates the entire order has been received by the customer.

If all order items in an order have status "cancelled", the order status is "cancelled". This indicates all items have been cancelled.

If all order items in an order have status "refunded", the order status is "refunded". This indicates all items have been refunded.

If order items have mixed statuses (for example, some items are delivered while others are refunded, or some items are shipped while others are delivered), the order status is "partially completed". This reflects that the order is neither fully completed nor fully cancelled.

The order status updates automatically when any order item's status changes. There is no manual status update for the order itself—the system calculates it based on item statuses.

### Order History

Customers can view a list of all their orders. The order list is paginated to display orders in manageable pages.

Orders in the list are sorted by newest first, with the most recently placed orders appearing at the top.

Each order in the list displays: order number, order date, total price, and overall order status. This summary view allows customers to quickly identify orders without viewing full details.

Customers can view the full details of any order by selecting it from the list. The order details page shows: list of all items with product names, variant options, quantities, prices, and individual item statuses; the shipping address used for the order; and list of shipments with tracking information.

Each shipment in the order details shows which order items are included in that shipment and the shared tracking information (carrier name and tracking number).

The order details page allows customers to view tracking information for each shipment and confirm delivery per shipment. Delivery confirmation applies to all items in that shipment.

## OrderItem Operations

Each order item represents a specific product variant purchase with its own status and lifecycle. Item statuses include paid, shipped, delivered, cancelled, and refunded. Each item can be individually cancelled or refunded without affecting other items in the same order. Items from the same seller are grouped into shipments when the seller ships them. Customers can view item details including product name, variant options, quantity, price, and current status. Order items maintain snapshots of the purchased product and variant state. Cancellation requests apply to individual paid items before they are shipped. Refund requests apply to individual delivered items within 7 days of delivery. Stock quantities are restored when items are cancelled or refunded through inventory records.

### Order Item Creation

When a customer places an order successfully, the system creates one order item for each unique product variant purchased. Each order item represents the purchase of a specific variant with its quantity.

The system captures and stores a snapshot of the product at the time of purchase, including the product name, description, category, and images.

The system captures and stores a snapshot of the product variant at the time of purchase, including the SKU code, option values, and variant price.

The system captures and stores a snapshot of the seller's profile at the time of purchase, including the shop name and logo.

The order item is created with status "paid" to indicate that payment has been completed and the item is awaiting shipment.

### Individual Item Status Lifecycle

Each order item has its own independent status that progresses through the following states: paid, shipped, delivered, cancelled, and refunded.

The status "paid" indicates that payment has been completed and the item is waiting for the seller to ship it.

The status "shipped" indicates that the seller has shipped the item and tracking information has been provided.

The status "delivered" indicates that the customer has confirmed delivery or the system has automatically confirmed delivery after 14 days from shipping.

The status "cancelled" indicates that the item cancellation request has been approved by the seller or forced by an administrator.

The status "refunded" indicates that the item refund request has been approved by the seller or forced by an administrator.

### Item Status Paid

The status "paid" is assigned to an order item immediately when the order is placed successfully.

Items with status "paid" are visible to both the customer and the seller.

Customers with items in "paid" status can request cancellation of those items.

Sellers with items in "paid" status can add those items to shipments for delivery.

Items remain in "paid" status until the seller ships them or the customer cancels the request.

### Item Status Shipped

The status "shipped" is assigned to an order item when a seller creates a shipment that includes that item.

The seller selects one or more items with status "paid" and groups them into a shipment.

All items included in the same shipment receive the same tracking information.

When an item's status changes to "shipped", the customer can view the tracking information for that item's shipment.

Items with status "shipped" cannot be cancelled by the customer.

### Item Status Delivered

The status "delivered" is assigned to an order item when the customer confirms delivery of the shipment containing that item.

If the customer does not confirm delivery, the system automatically assigns the "delivered" status 14 days after the item's status becomes "shipped".

Delivery confirmation is per shipment, not per individual item. When the customer confirms delivery of a shipment, all items in that shipment change to "delivered" status.

Items with status "delivered" are eligible for refund requests.

Items with status "delivered" are eligible for review creation by the customer.

### Item Status Cancelled

The status "cancelled" is assigned to an order item when a cancellation request is approved by the seller or forced by an administrator.

Items with status "cancelled" are removed from the shipment they were assigned to.

The stock quantity for the cancelled item variant is restored to reflect the cancellation.

Items with status "cancelled" cannot be shipped or refunded.

The cancellation status is permanent and cannot be reversed.

### Item Status Refunded

The status "refunded" is assigned to an order item when a refund request is approved by the seller or forced by an administrator.

Items with status "refunded" have their stock quantity restored to reflect the refund.

Items with status "refunded" cannot be cancelled again.

The refund status is permanent and cannot be reversed.

The customer may still view the refunded item in their order history for record-keeping purposes.

### Same Seller Shipment Grouping

Order items from the same seller are grouped together when the seller creates a shipment.

Different sellers always ship their items separately, meaning items from different sellers will never appear in the same shipment.

For each order containing items from multiple sellers, the seller of each item can create their own shipment containing any or all of their items.

A seller can choose to ship items individually (one item per shipment) or bundle multiple items from their product line into a single shipment.

When items are grouped into a shipment, they share the same tracking information including carrier name and tracking number.

### Item Detail Viewing

Customers can view detailed information about each order item in their order history.

The item detail displays the product name, variant option values, quantity purchased, and price at the time of purchase.

The item detail displays the current status of the item (paid, shipped, delivered, cancelled, or refunded).

The item detail shows the seller's shop name that is visible to the customer.

If the item has been shipped, the customer can view the tracking information for the shipment containing the item.

The item detail is part of the order details page and can be accessed from the order history list.

### Individual Cancellation Process

Customers can request cancellation of individual order items that have status "paid".

Cancellation requests cannot be made for items that have already been shipped or have any status other than "paid".

When creating a cancellation request, the customer must provide a reason as text.

The cancellation request is sent to the seller of the item for review and decision.

The seller can approve or reject the cancellation request.

When the seller responds to a cancellation request, a snapshot of the request state is created and preserved.

If the cancellation request is approved, the item status changes to "cancelled" and the stock quantity is restored.

If the cancellation request is rejected, the item remains in its current status and the rejection is recorded.

Cancellation is processed per item, not per entire order. Other items in the same order continue processing normally.

### Individual Refund Process

Customers can request a refund of individual order items that have status "delivered".

Refund requests cannot be made for items that have not been delivered or have any status other than "delivered".

Refund requests are subject to a seven-day refund window that begins from the date the item status becomes "delivered".

When creating a refund request, the customer must provide a reason as text.

The refund request is sent to the seller of the item for review and decision.

The seller can approve or reject the refund request.

When the seller responds to a refund request, a snapshot of the request state is created and preserved.

If the refund request is approved, the item status changes to "refunded" and the stock quantity is restored.

If the refund request is rejected, the item remains in its current status and the rejection is recorded.

Refund is processed per item, not per entire order. Other items in the same order remain unaffected.

### Seven Day Refund Window

The seven-day refund window restricts when refund requests can be submitted for delivered items.

The refund window begins on the date when the order item status changes to "delivered".

Refund requests submitted after the seven-day window expires are not permitted by the system.

The refund window is calculated from the delivered date of each individual item, not from the order placement date.

Items delivered on different dates have individual refund windows that are tracked separately.

The seven-day window applies to all customers uniformly without exceptions.

Items with status cancelled or refunded do not have a refund window as they are no longer eligible for refunds.

### Stock Restoration on Cancellation

When an order item is cancelled, the stock quantity for that item's variant is restored.

The stock restoration creates an inventory record that records the quantity change and the reason for the adjustment.

The inventory record captures the exact quantity that was cancelled and the timestamp of the cancellation.

The reason for the stock restoration is documented as "cancellation" in the inventory record.

The restored stock becomes available for other customers to purchase immediately.

The stock restoration is automatic and cannot be undone.

Multiple cancelled items from the same variant have their quantities summed and restored together.

### Stock Restoration on Refund

When an order item is refunded, the stock quantity for that item's variant is restored.

The stock restoration creates an inventory record that records the quantity change and the reason for the adjustment.

The inventory record captures the exact quantity that was refunded and the timestamp of the refund.

The reason for the stock restoration is documented as "refund" in the inventory record.

The restored stock becomes available for other customers to purchase immediately.

The stock restoration is automatic and cannot be undone.

Multiple refunded items from the same variant have their quantities summed and restored together.

### Item Snapshots

A snapshot of each order item is created when the order is placed.

The order item snapshot preserves the product name, description, category, and images at the time of purchase.

The order item snapshot preserves the variant SKU code, option values, and price at the time of purchase.

The order item snapshot preserves the seller's shop name and logo at the time of purchase.

The order item snapshot is immutable and cannot be modified or deleted.

The order item snapshot can be viewed by the customer who purchased the item.

The order item snapshot can be viewed by the seller who fulfilled the item.

The order item snapshot can be viewed by administrators for oversight purposes.

Order item snapshots are preserved even if the product is later deleted from the platform.

Order item snapshots provide the complete product state at the time of purchase for dispute resolution.

## Shipment Operations

Sellers create shipments by selecting one or more of their order items to include in a package. Different sellers always create separate shipments for their items. Sellers can ship items individually or bundle multiple items into one shipment. When creating a shipment, sellers enter tracking information including carrier name and tracking number. All items within the same shipment share identical tracking information. Creating a shipment changes all included items to shipped status. Customers view tracking information for each shipment associated with their orders. Customers confirm delivery per shipment, not per individual item. Upon delivery confirmation, all items in that shipment change to delivered status. Items automatically change to delivered status 14 days after shipping if not manually confirmed.

### Shipment Creation

Sellers can create a shipment for their order items that have paid status.
When creating a shipment, sellers select one or more of their order items to include in the package.
Different sellers always create separate shipments for their items; items from different sellers cannot be in the same shipment.
Sellers can ship items individually by creating a shipment with a single item.
Sellers can bundle multiple items into one shipment by selecting several of their items together.
When a shipment is created, all items included in that shipment change to shipped status.
A shipment can be created only for order items that belong to the seller creating the shipment.
Sellers can view a list of order items that are eligible for shipment (items with paid status).
Sellers can only create shipments for items from orders that they own as the seller.

### Order Item Selection

Sellers select order items to include in a shipment from their pending shipment queue.
Only order items with paid status can be selected for shipment.
Sellers cannot select order items with shipped, delivered, cancelled, or refunded status.
Multiple order items from the same seller can be grouped into one shipment.
Sellers can leave an order with some items shipped and others still waiting.
When an order contains items from multiple sellers, each seller creates their own separate shipment for their items.
The selection of items for a shipment is final once the shipment is created.

### Separate Seller Shipments

Each seller manages their own shipments independently.
Items from different sellers in the same customer order are always shipped separately.
A shipment can only contain order items that share the same seller.
The system automatically groups order items by seller for shipment creation.
When viewing an order, the customer can see multiple shipments if items come from different sellers.
Each shipment tracks a single seller's items separately.

### Shipment Options

Sellers can choose to ship items individually by creating one shipment per item.
Sellers can choose to bundle multiple items into one shipment by selecting them together.
When bundling, all selected items in the shipment share the same tracking information.
The seller's choice of individual or bundled shipping does not affect the customer's ability to track or confirm delivery.
A shipment can contain any number of order items from the same seller (minimum one, no maximum specified).
Once items are included in a shipment, they cannot be moved to a different shipment.

### Tracking Information Entry

When creating a shipment, sellers must enter tracking information.
Tracking information includes carrier name and tracking number.
Sellers can specify the carrier name as text (e.g., "FedEx", "DHL", "USPS").
Sellers can enter the tracking number as text (the unique tracking code provided by the carrier).
Both carrier name and tracking number are required when creating a shipment.
Tracking information is entered at the shipment level, not per individual item.
Sellers can update tracking information after the shipment is created.

### Shared Tracking Within Shipment

All order items within the same shipment share identical tracking information.
Customers view one tracking number and carrier for all items in a shipment.
The tracking information applies equally to every item included in the shipment.
Items in the same shipment cannot have different tracking numbers.
When a customer tracks a shipment, they see the tracking details for the entire shipment.

### Shipment Item Status Change

When a shipment is created, all items in that shipment change to shipped status.
Shipped items are visible to customers as "shipped" in their order details.
Once items are shipped, they cannot be cancelled.
Shipped items can be delivered through confirmation or automatic process.
Item status changes are recorded when the shipment is created.

### Shipment Tracking Viewing

Customers can view tracking information for each shipment in their orders.
Tracking information includes the carrier name and tracking number.
Customers can see which order items are included in each shipment.
Customers can view tracking for shipments from multiple sellers in the same order.
Tracking information is displayed in the order details page.
Customers can view tracking information even after delivery is confirmed.

### Delivery Confirmation Per Shipment

Customers can confirm delivery for each shipment individually.
Delivery confirmation is done per shipment, not per individual item.
When a customer confirms delivery, all items in that shipment change to delivered status.
A customer can confirm delivery before the 14-day automatic period expires.
Customers can view which shipments have been delivered and which are still pending.
Each shipment can be confirmed separately even if they belong to the same order.

### Automatic Delivery After 14 Days

If a customer does not manually confirm delivery, items automatically change to delivered status 14 days after the shipment was created.
The 14-day period starts from the date the shipment was created (not from the date the item was shipped to the customer physically).
Automatic delivery does not require any customer action.
Once automatic delivery occurs, the item status is set to delivered and cannot be changed.
The automatic delivery rule applies to all shipments regardless of whether tracking is visible.

### Shipment Item Grouping

Order items are grouped into shipments based on seller ownership and shipping choice.
Each shipment represents one seller's package sent to the customer.
Items from different sellers are never grouped into the same shipment.
Items from the same seller can be split across multiple shipments if the seller chooses.
A single order can contain multiple shipments from different sellers.

### Seller Shipment Management

Sellers can view a list of shipments they have created for their order items.
Sellers can view details of each shipment including tracking information and included items.
Sellers can manage shipments for items that are paid but not yet shipped.
Sellers cannot modify a shipment after it has been created (no adding or removing items).
Sellers can update tracking information for existing shipments.
Sellers can view the status of each shipment (pending, shipped, delivered).

## Address Operations

Customers can add multiple shipping addresses for future orders and deliveries. Each address includes recipient name, phone number, street address, city, state or province, postal code, and country. Customers can update address information at any time to keep shipping details current. Customers can delete addresses they no longer need. One address can be designated as the default shipping address for checkout convenience. During checkout, customers can select any saved address or use their default. Once an order is placed, the shipping address becomes fixed and cannot be modified. The system manages address collections per customer account.

### Address Creation Process

Customers can add shipping addresses to their account for future orders and deliveries.

When creating an address, the customer specifies:
- Recipient name (the person who will receive packages)
- Phone number (for delivery coordination)
- Street address (complete building location)
- City (city or municipality)
- State or province (administrative region)
- Postal code (valid code for the selected country)
- Country (from supported countries list)

All fields are required and must contain valid information. If any required field is missing or invalid, the address creation is rejected.

### Multiple Address Support

Customers can add and maintain multiple shipping addresses in their account.

Each address is stored separately and associated only with the creating customer. There is no limit on the number of addresses a customer can save.

Customers can view their complete list of saved addresses at any time. The list displays all addresses with key information for easy identification.

### Address Editing Process

Customers can update any field of their saved addresses to keep shipping information current.

When editing an address, the customer can modify the recipient name, phone number, street address, city, state or province, postal code, or country. All edited fields must contain valid information after the change.

If an address is currently referenced by a pending order (paid or shipped status), the address information cannot be modified. The system preserves the original shipping address for the order.

If any field validation fails, the address update is rejected.

### Address Deletion Process

Customers can delete addresses they no longer need from their account.

Customers can delete an address only if it is not referenced by any pending order (orders with paid or shipped status). If the address is in use by a pending order, the deletion is rejected.

When an address is deleted, it is permanently removed from the customer's address collection and cannot be recovered.

### Default Address Setting

Customers can designate one of their saved addresses as the default shipping address.

The default address is used as the pre-selected option during checkout to streamline the ordering process. Customers can view which address is currently set as default.

Customers can change the default address at any time by selecting a different saved address as the new default.

If the current default address is deleted, the customer must set a new default address before completing checkout.

### Default Address Usage

During checkout, the default shipping address is automatically selected if one exists.

Customers can keep the default address for their order or change to a different saved address before completing the purchase.

Once an order is placed, the shipping address becomes fixed and cannot be modified, regardless of any subsequent changes to the saved address.

### Checkout Address Selection

During the checkout process, customers must select a shipping address for their order.

Customers can view all their saved addresses with full details including recipient name, phone number, street address, city, state or province, postal code, and country.

If a default address is set, it is pre-selected but customers can choose a different saved address.

The selected shipping address is displayed in the order summary before order confirmation.

### Address Modification After Order

Once an order is placed, the shipping address becomes fixed and cannot be modified.

The shipping address selected during checkout is preserved with the order record and remains the final destination for all shipments.

Customers cannot change the shipping address after order confirmation, even if they edit their saved addresses. This ensures order integrity and proper delivery.

### Shipping Address Management

The system provides comprehensive address management functionality for customers.

Customers can view their complete address collection, add new addresses, edit existing addresses, set default addresses, and delete addresses they no longer need.

All address changes are managed through the customer's account settings, and the address collection is private to that customer.

### Address Collection Per Customer

Each customer maintains their own private collection of shipping addresses.

Address collections are not shared between customers. Each customer's addresses are only accessible to that customer and are used for their personal orders.

The system manages address collections independently for each customer account, ensuring data isolation and privacy.

## Review Operations

Customers can write reviews only for products they have purchased after the item status becomes delivered. Each customer can write one review per product per order. Reviews require a rating from 1 to 5 stars, with text content being optional. Reviews display on product detail pages sorted by newest first. Customers can edit their own reviews, and each edit creates a snapshot of the previous state. Customers can delete their own reviews while snapshots are preserved for audit purposes. Product average ratings are calculated from all non-deleted reviews. Reviews cannot be written for undelivered items or items from orders not yet received.

### Review Creation Eligibility

Customers can write a review for a product only after the corresponding order item status becomes delivered. An order item achieves delivered status when the customer confirms delivery for that shipment or after 14 days from the shipment date. A customer can write only one review per product per order, regardless of how many variants of that product were purchased in that order. If a customer has already written a review for a product in a previous order, they may write another review for the same product in a new order. The system prevents customers from writing reviews for products they have not purchased or for order items that have not reached delivered status.

### Review Writing Requirements

When writing a review, customers must provide a rating from 1 to 5 stars, where 1 is the lowest and 5 is the highest. The rating field is required and cannot be left blank or missing. Customers may optionally provide text content for their review. The review text can be any length and may include personal experience with the product. If no text is provided, only the rating will be displayed on the product detail page. The review must be associated with the product that was purchased in the order.

### Review Display on Products

Reviews are displayed on the product detail page. The display shows the customer's display name, star rating, text content (if provided), and the date the review was written. If a customer has deleted their account, their review is shown with the name "deleted user" instead of their display name. Reviews are sorted by newest first, showing the most recent reviews at the top. Customers can see all non-deleted reviews for the product, regardless of which order they came from. The product detail page also shows the total review count and average rating calculated from all non-deleted reviews.

### Review Editing Process

Customers can edit their own reviews at any time after writing them. When editing a review, customers can change the rating and/or text content. The review display updates immediately with the new values. Each edit creates a snapshot that records the previous rating, previous text content, and the timestamp of the change. Snapshots of the review edit are preserved and cannot be deleted. Review owners can view their own edit history through snapshot records.

### Review Deletion and Snapshot Preservation

Customers can delete their own reviews. When a review is deleted, it is no longer visible on the product detail page to any user. However, snapshots of the deleted review are preserved and cannot be deleted. These snapshots contain the original rating, text content, creation timestamp, deletion timestamp, and the reviewer's identity. Preserved snapshots are accessible only to the review owner and administrators for dispute resolution purposes. Deleted reviews are excluded from average rating calculations.

### Average Rating Calculation

The product average rating is calculated from all non-deleted reviews for that product. Deleted reviews are excluded from the calculation. The average is computed as the sum of all star ratings from non-deleted reviews divided by the count of non-deleted reviews. If a product has no non-deleted reviews, no average rating is displayed. The average rating updates automatically when reviews are written, edited, or deleted. Variations in rating values (e.g., 4.7 or 3.2) are determined by standard rounding rules.

## Wishlist Operations

Customers add products to their wishlist for later consideration and purchase. Wishlists display products rather than specific variants. The wishlist view is paginated to handle large collections. Customers can remove individual products from their wishlist at any time. If a seller deletes a product from the platform, it is automatically removed from all customer wishlists. Wishlist items persist until explicitly removed or the product is deleted. Customers can browse their saved products without adding them to cart. Wishlists serve as a bookmarking mechanism for interested products.

### Wishlist Product Addition

Customers can add products to their wishlist for later consideration and purchase. A customer selects a product from search results, category browsing, or the product detail page and adds it to their personal wishlist. Each wishlist entry represents a product, not a specific variant, allowing the customer to track interest without committing to particular options. Products can be added multiple times to a wishlist by different customers. Only registered customers can maintain wishlists; guests cannot save products for later.

### Wishlist Viewing

Customers can view their complete wishlist to review saved products at any time. The wishlist displays each product with its main thumbnail image, name, base price or price range, and seller shop name. For each product, the current availability status is shown (available, out of stock, or unavailable). Customers can quickly identify which products they want to purchase later or which ones should be removed. The wishlist view supports efficient browsing of saved items for future purchase decisions.

### Paginated Wishlist Display

Wishlist items are displayed in a paginated format to handle large collections of saved products. Each page shows a fixed number of products, with navigation controls to browse between pages. Customers can move forward and backward through their wishlist pages. Pagination ensures responsive display performance even when customers have hundreds of saved products. Customers cannot view more products than the page limit on a single screen.

### Wishlist Product Removal

Customers can remove individual products from their wishlist at any time. When removing a product, the customer selects the specific item and confirms the removal. Once removed, the product is no longer accessible in the customer's wishlist but remains available in the marketplace for other customers to discover. Removed products do not affect the product's availability for purchase by other customers. Customers can remove products regardless of the product's current stock status or whether it has been added to cart previously.

### Automatic Removal on Product Deletion

When a seller deletes a product from the platform, it is automatically removed from all customer wishlists. This automatic removal ensures wishlists contain only currently available products. The deletion occurs immediately when the product is removed from the marketplace, and affected customers will see the product disappear from their wishlist view on their next wishlist access. Customers cannot manually re-add a deleted product to their wishlist; the product must be recreated by the seller first.

### Product Level Wishlist Entries

Wishlist entries store products at the product level rather than variant level. A customer adds a product to their wishlist, not a specific combination of options like color or size. When viewing the product in their wishlist, customers can navigate to the product detail page to see all available variants and make a selection if they choose to purchase. This design simplifies wishlist management and allows customers to track interest in products before committing to specific configurations.

### Wishlist Persistence

Wishlist items persist until the customer explicitly removes them or the product is deleted. Saved products remain in the wishlist indefinitely, allowing customers to save items and return to them at a later date. There is no automatic expiration or time limit for wishlist entries. Customers maintain full control over their wishlist contents and can keep items for weeks, months, or years as needed. Wishlist data is owned by the customer and persists across login sessions.

### Saved Product Browsing

Customers can browse their saved products without adding them to cart. The wishlist serves as a separate list from the shopping cart, allowing customers to review potential purchases without committing quantities. Customers can review product details, compare options, and return to the marketplace product pages from the wishlist at their convenience. The wishlist functions as a bookmarking mechanism for products of interest without triggering any purchase intent.

## Snapshot Operations

Snapshots are created whenever editable data is modified to preserve previous states. Snapshots record when the change occurred, what was modified, and the values before and after the change. All snapshots are immutable and cannot be deleted under any circumstances. Snapshots apply to products, product variants, seller profiles, order items, reviews, cancellation requests, and refund requests. Product snapshots include all product fields and all variant snapshots at that moment. Order item snapshots capture product, variant, and seller profile state at purchase time. Owners and administrators can view snapshots for dispute resolution and audit purposes. Snapshots remain accessible even after the original data is deleted.

### Snapshot Creation Triggers and Recording Details

A snapshot is created whenever any editable data is modified. This applies to all modifiable business entities in the platform.

The following changes automatically create snapshots:

- A product is edited (name, description, category, base price, or images)
- A product variant is edited (SKU code, option values, or price)
- A seller profile is edited (shop name, description, or logo)
- A review is edited (rating or text content)
- A review is deleted
- A cancellation request status changes (approved or rejected)
- A refund request status changes (approved or rejected)

Every snapshot records the exact date and time the change occurred, the complete state of the data before the change, and the complete state of the data after the change.

### Product and Variant Snapshot Creation

When a seller edits a product, a product snapshot is created that includes all product fields and all variant snapshots at that moment.

A product snapshot captures:
- Product name
- Product description
- Product category (including subcategory)
- Base price
- All product images

Each product snapshot also includes snapshots of all associated variants, capturing for each variant:
- SKU code
- Option values (such as color and size combinations)
- Price at that moment

Product snapshots are created for every edit, regardless of how minor the change. A product with one edit will have one snapshot; with ten edits, it will have ten snapshots.

### Seller Profile Snapshot Creation

Every edit to a seller's shop profile creates a seller profile snapshot.

Seller profile edits include changes to:
- Shop name
- Shop description
- Shop logo image

When a seller updates their shop name, a snapshot is created that preserves the old name with the timestamp of when it changed. This allows anyone to see what the shop name was at any point in history.

These snapshots are critical for dispute resolution, as they preserve what customers saw when they purchased from the seller.

### Order Item Snapshot Creation

When an order is placed, a snapshot is created for each order item that captures the complete state at purchase time.

Each order item snapshot includes:
- The purchased product (name, description, category at purchase time)
- The purchased variant (SKU code, option values, price at purchase time)
- The seller profile (shop name and logo at purchase time)

This snapshot is created regardless of whether the order is later cancelled, refunded, or delivered. The snapshot preserves exactly what the customer purchased, what they paid, and which seller they bought from.

Order item snapshots are essential for dispute resolution, as they provide the authoritative record of what was agreed upon at the time of purchase.

### Review Snapshot Creation

When a customer edits a review, a snapshot is created.

A review snapshot captures:
- The previous star rating
- The previous text content
- The new star rating
- The new text content
- The timestamp of when the change was made

When a customer deletes a review, a snapshot is created that records the review's final state before deletion (including the rating and text content).

These snapshots allow the system to track how reviews have evolved and preserve the complete history of review changes.

### Cancellation and Refund Request Snapshots

When a seller responds to a cancellation or refund request, a snapshot is created.

A cancellation request snapshot captures:
- The customer's cancellation reason
- The previous status (pending)
- The new status (approved or rejected)
- The timestamp of when the seller responded

A refund request snapshot captures:
- The customer's refund reason
- The previous status (pending)
- The new status (approved or rejected)
- The timestamp of when the seller responded
- The date the item was delivered (to verify the 7-day window)

If a request is rejected, the snapshot preserves the reason for rejection. If approved, the snapshot records that approval. These snapshots are essential for dispute resolution.

### Snapshot Immutability

All snapshots are immutable and cannot be deleted under any circumstances.

Once a snapshot is created:
- It cannot be modified
- It cannot be deleted
- It cannot be hidden from authorized viewers

This immutability applies to all snapshot types: product, variant, seller, order item, review, cancellation request, and refund request. The only action that can be taken on a snapshot is viewing it.

### Product Deletion Persistence

Product snapshots remain accessible even after the product is deleted from the platform.

When a seller deletes a product, the product itself is removed from:
- Search results
- Category listings
- The seller's product management dashboard

However, all snapshots of the deleted product remain accessible to:
- The seller who created it
- Administrators
- Anyone who needs to reference the snapshot for dispute resolution

This ensures that historical purchase records, order disputes, and warranty claims can still reference the product state at the time of purchase.

### Owner Snapshot Viewing

Owners can view snapshots of their own data.

Product owners (sellers) can view:
- All snapshots of products they created
- All snapshots of variants of their products
- All snapshots of their seller profile

Customer profile owners can view snapshots of:
- Their own reviews
- Their own cancellation requests
- Their own refund requests

Order item owners can view:
- Snapshots of the products and variants they purchased
- Snapshots of the sellers they bought from

This access allows owners to track the history of their own data and use snapshots as evidence in disputes.

### Administrator Snapshot Viewing

Administrators can view snapshots of any data in the system.

Regular administrators can view:
- Snapshots of any product
- Snapshots of any product variant
- Snapshots of any seller profile
- Snapshots of any order item
- Snapshots of any review
- Snapshots of any cancellation request
- Snapshots of any refund request

Super administrators have the same viewing access plus:
- Oversight of administrator actions through audit snapshots
- Ability to view all snapshots for dispute resolution involving policy violations

This universal viewing access enables administrators to investigate disputes, review seller behavior, and make informed decisions about suspensions or other enforcement actions.

### Dispute Resolution Snapshots

Snapshots are a primary resource for dispute resolution between buyers and sellers.

Common dispute scenarios include:
- Customer claims the product description was different when they purchased it
- Seller claims the customer's review was altered to damage the shop's reputation
- Customer claims the refund request was unjustly rejected
- Seller claims the cancellation request had an invalid reason

In each case, snapshots provide the exact state of data before the dispute, the exact state after any changes, and the timestamp of when changes occurred. For example, if a customer claims the product price was lower when they ordered, the order item snapshot shows the exact price they paid.

### Snapshot Version History

Snapshots create a complete version history for all editable data, with no gaps. Every change is recorded in its own snapshot, preserving the full evolution of the data.

This allows:
- Tracing a product's price changes over time
- Seeing how a shop description evolved
- Understanding when a review was edited and what changed
- Knowing when a cancellation or refund request was responded to
- Reconstructing the complete purchase experience as it was presented to the customer

The version history is chronological and complete, ensuring full auditability and traceability.

## InventoryRecord Operations

Each product variant maintains its own stock quantity tracked through inventory records. Inventory records are created when stock is added for restocking or subtracted for orders and adjustments. Each record specifies a quantity change, the reason for the change, and the timestamp. Current stock is calculated by summing all inventory records for a variant. Sellers can manually add inventory with a quantity and reason documentation. Sellers can adjust inventory downward for losses or errors with documented reasons. Placing an order automatically creates a negative inventory record. Cancelling or refunding an order creates a positive inventory record restoring stock. Sellers view the complete inventory history for each variant. Stock reaching zero displays the variant as out of stock.

### Stock Quantity Tracking

Each product variant maintains its own stock quantity that is tracked independently from other variants.
The stock quantity represents the number of units available for sale.
The system calculates current stock by summing all inventory records for that variant.
When a customer adds a variant to their cart, the stock quantity is not immediately deducted.
Stock is only deducted when payment succeeds and the order is created.
When a variant's stock reaches zero, the system marks it as out of stock.
Out of stock variants are shown to customers but cannot be added to their cart.

### Inventory Record Creation

Every change to a product variant's stock quantity creates an inventory record.
Inventory records are immutable and cannot be modified or deleted.
Each inventory record contains a quantity change value (positive for additions, negative for deductions), the reason for the change, and a timestamp.
Inventory records are created automatically when orders are placed, when orders are cancelled, or when refunds are processed.
Inventory records are also created manually when sellers add stock or adjust for losses.
The reason field is required and must describe why the inventory changed.

### Manual Stock Addition

Sellers can manually add inventory to a variant through the inventory management interface.
When adding stock, sellers must specify the quantity being added and provide a reason for the restock.
Common restock reasons include: purchasing new inventory, returned items, or stock corrections.
The addition creates a positive inventory record that increases the variant's available stock.
The system records the timestamp of when the restock occurred.
Sellers cannot restock variants that belong to products they do not own.

### Manual Stock Adjustment

Sellers can manually subtract inventory from a variant for adjustments or losses.
When adjusting inventory downward, sellers must specify the quantity to subtract and provide a documented reason.
Common adjustment reasons include: damaged goods, lost inventory, theft, or data correction errors.
The subtraction creates a negative inventory record that decreases the variant's available stock.
The adjustment requires justification and is recorded with a timestamp for audit purposes.
Sellers cannot adjust inventory for variants they do not own.

### Order-Driven Inventory Deduction

When an order is placed successfully and payment succeeds, the system automatically deducts stock for each purchased variant.
A negative inventory record is created for each variant in the order with the quantity ordered.
The reason for this deduction is recorded as: order fulfillment.
The inventory deduction happens at the moment the order record is created.
If the variant has insufficient stock, the order placement is prevented with an error message.
The system prevents orders from being placed for out of stock variants.

### Cancellation Inventory Restoration

When a seller approves a cancellation request for an order item, the system restores the variant's stock.
A positive inventory record is created with the cancelled quantity and reason: order cancellation.
The reason must document whether the cancelled item is restockable or not restockable due to condition.
Stock is restored at the time of cancellation approval, making the item available for other customers.
The cancellation creates an inventory record that is part of the permanent history.
Sellers can view which cancellations have been approved and their impact on current stock.

### Refund Inventory Restoration

When a seller approves a refund request for a delivered order item, the system restores the variant's stock.
A positive inventory record is created with the refunded quantity and reason: refund approval.
The refund must be within the seven-day window from the item's delivered date to be eligible.
The stock restoration happens at the time of refund approval.
The refund creates an inventory record that preserves the complete transaction history.
Returned items may be restocked or not restocked depending on their condition, documented in the reason.

### Inventory History Viewing

Sellers can view the complete inventory history for each product variant they own.
The history shows all inventory records in chronological order with timestamps.
Each record displays the quantity change, the reason, and when it occurred.
The interface shows the running total of stock at each point in time.
Sellers can filter the history by date range, reason type, or quantity change direction.
Administrators can view inventory history for any product on the platform.
Inventory records cannot be deleted from the history.

### Current Stock Calculation

The system calculates current stock for each variant by summing all inventory records.
The calculation includes all records regardless of their reason or timestamp.
Stock is always non-negative when calculated correctly.
The current stock is displayed to sellers on their inventory management dashboard.
The current stock is shown to customers on product detail pages.
The system updates current stock automatically after every inventory record is created.

### Out of Stock Management

When a variant's stock quantity reaches zero, the system marks it as out of stock.
Out of stock variants are shown in search results and category listings but marked as unavailable.
Customers cannot add out of stock variants to their shopping cart.
When a customer views an out of stock variant, they see a stock unavailable message.
If a customer has an out of stock variant in their cart and refreshes, the item is marked unavailable.
Out of stock variants can still appear in order history and wishlist.
Receiving restock changes the status back to in stock immediately.

### Inventory Record Immutability

All inventory records are immutable and cannot be modified after creation.
Records cannot be deleted by any user including administrators.
The complete history of stock changes is preserved permanently.
Records cannot be changed even when errors are discovered.
If an inventory record was created incorrectly, a correction record must be added rather than modifying the original.
Corrective actions are documented with appropriate reasons in new records.
The immutability ensures audit trails for dispute resolution.

### Timestamp Recording

Every inventory record includes a timestamp of when the change occurred.
The timestamp is recorded at the exact moment the inventory record is created.
The timestamp is visible to sellers when viewing inventory history.
The timestamp is used to calculate current stock at any point in time.
The timestamp is used to determine refund eligibility windows.
Administrators can use timestamps to investigate inventory discrepancies.

## CancellationRequest Operations

Customers can request cancellation for individual order items with status paid that have not yet been shipped. Cancellation requests require the customer to provide a text reason for the request. The seller of the specific item receives the cancellation request and can approve or reject it. When the seller responds, a snapshot of the request state is created. Approved cancellations cancel that specific item and process a refund for that item only. Cancelled items have their stock quantities restored through inventory records. The remaining items in the order continue processing normally. If all items in an order are cancelled, the entire order status becomes cancelled.

### Cancellation Request Creation

Customers can request cancellation for individual order items that have status "paid". The cancellation request is created through the order detail page by selecting the specific item to cancel. A text reason for the cancellation is required and must be provided before submission.

### Paid Item Requirement

Cancellation requests can only be submitted for order items with status "paid". Items with other statuses (shipped, delivered, cancelled, or refunded) cannot be cancelled through the cancellation request system.

### Not Shipped Requirement

Cancellation requests are only accepted for items that have not been shipped. Once an item status changes to "shipped" or higher (delivered), cancellation requests are no longer possible. Customers cannot request cancellation for shipped or delivered items.

### Cancellation Reason Text

Every cancellation request must include a text reason explaining why the customer wants to cancel the item. The reason field is required and cannot be empty.

### Item Level Cancellation

Cancellations are handled at the order item level, not at the order level. Customers can cancel individual items within an order while keeping other items active. Each cancellation request applies to only one order item.

### Seller Approval Process

When a cancellation request is submitted, the seller of that specific item receives a notification. The seller can review the request and the reason provided, then approve or reject it. Approved requests proceed to item cancellation and refund processing.

### Seller Rejection Process

Sellers can reject cancellation requests when appropriate. When a request is rejected, the customer is notified of the rejection. The item remains in the order with its original status. Rejected requests cannot be resubmitted by the customer.

### Cancellation Request Snapshot

When the seller responds to a cancellation request (approval or rejection), a snapshot of the request state is created. The snapshot records when the response was made, the seller's decision, and any additional comments from the seller. Snapshots are immutable and preserved for dispute resolution.

### Individual Item Refund

When a cancellation request is approved, only the specific cancelled item is refunded. The refund amount equals the price paid for that item. Other items in the same order continue processing normally without any refund or cancellation.

### Cancelled Item Stock Restoration

When an item is cancelled, its stock quantity is automatically restored. A positive inventory record is created for the variant to add back the cancelled quantity. This makes the stock available for other customers to purchase.

### Order Item Cancellation Workflow

The cancellation workflow follows this sequence: customer submits request with reason, seller reviews and responds with approval or rejection, approval triggers item cancellation and refund, item status changes to cancelled, stock is restored, and the order is updated accordingly.

### Seller Response Tracking

Customers can view the status of their cancellation requests and see when the seller responded. The response date and the seller's decision (approved or rejected) are displayed in the request history. Customers can also view any comments from the seller.

### Remaining Order Processing

When one or more items in an order are cancelled, the remaining items continue processing normally. The order remains active with its active items. Shipments for the remaining items can proceed as scheduled. The order status is recalculated based on the remaining item statuses.

### Complete Order Cancellation

When all items in an order are cancelled (either through individual cancellation requests or other means), the entire order status becomes "cancelled". The order no longer has any active items and is considered fully cancelled.

### Cancellation Request Viewing

Customers can view all their cancellation requests in a dedicated view. The view shows the request status (pending, approved, rejected), the order item being cancelled, the reason provided, the seller's response, and the response date. Requests are sorted by most recent first.

## RefundRequest Operations

Customers can request a refund for individual order items with status delivered. Refund requests must be made within 7 days of that item being delivered. The request requires the customer to provide a text reason for the refund. The seller of the specific item can approve or reject the refund request. When the seller responds, a snapshot of the request state is created. Approved refunds process the refund for that item only. Refunded items have their stock quantities restored through inventory records. Other items in the order remain unaffected by the refund. If all items in an order are refunded, the order status becomes refunded.

### Refund Request Creation

Customers can request a refund for individual order items that have status delivered. The customer must provide a text reason explaining why the refund is requested. A refund request can only be created within seven days from the date the item was delivered. Items with any other status (paid, shipped, cancelled) are not eligible for refund requests.

### Refund Request Viewing

Customers can view the list of refund requests they have submitted. Each refund request displays the order item it applies to, the reason text provided, the current status (pending, approved, rejected), and the date of submission. Customers can view the full details of any refund request they created.

### Seller Approval Process

Sellers can view pending refund requests for order items that belong to their products. The seller can approve a refund request by confirming acceptance. When the seller approves the request, the refund is processed for that specific order item only. The approval action creates a snapshot of the request state at the time of approval, recording when the change was made and what the state was before.

### Seller Rejection Process

Sellers can reject a refund request by declining the customer's request. The rejection action creates a snapshot of the request state, capturing the rejection reason and timestamp. Rejected refund requests remain in the system with their rejection status visible to the customer. The customer cannot submit a new refund request for the same item after rejection.

### Refund Request Snapshot

Every refund request maintains immutable snapshots at each state change. Snapshots record when the request was created, when the seller responded, the action taken (approved or rejected), and the values before and after each change. These snapshots cannot be deleted and can be viewed by the customer, the seller, and administrators for dispute resolution.

### Individual Item Refund Processing

When a refund is approved, only the specific order item is refunded. Other items in the same order are unaffected and continue processing normally. The refund is processed at the item level, not the order level. The customer receives the refund amount corresponding only to the refunded item's price.

### Refunded Item Stock Restoration

When an item is refunded, its stock quantity is automatically restored. The system creates an inventory record with a positive quantity change and reason code for the refund. This ensures inventory accuracy for future orders. The variant's stock count is updated immediately upon refund approval.

### Order Unaffected Items

Refunding one order item does not impact other items in the same order. Items with status paid, shipped, or delivered continue in their normal workflow. The order status is recalculated based on the remaining items' statuses. Other items can still be cancelled or refunded independently if they meet their eligibility requirements.

### Complete Order Refund

If all order items are refunded (each item individually refunded by the seller), the entire order status becomes refunded. The order is considered fully resolved when every item has status refunded. Until all items are refunded, the order maintains its mixed or partial status based on the individual item statuses.

### Seller Response Tracking

The system tracks when sellers respond to refund requests. Customers can see the timestamp when the seller approved or rejected their request. The seller response is recorded as part of the refund request history. Administrators can view all seller response timestamps for oversight and dispute resolution.

### Order Item Refund Workflow

The refund workflow begins when a customer submits a refund request for a delivered item. The request enters pending status and notifies the seller. The seller reviews the request and responds with approval or rejection. Upon approval, the refund processes and stock is restored. The request status updates to approved or rejected based on the seller's action. The workflow completes when the seller responds.

## Administrator Operations

Administrators manage categories by creating, editing, and deleting categories and subcategories. Administrators oversee all products on the platform and can view snapshots of any product. Administrators can delete any product for policy violations. Administrators view all orders and can force-cancel or force-refund individual items or entire orders. Administrators manage customers by viewing accounts and banning or unbanning users. Administrators manage sellers by viewing accounts, banning users, suspending and unsuspended seller accounts. When sellers are suspended, their products are hidden from search but they can still process existing orders. Administrators review pending seller approval requests and can approve or reject registrations with reasons.

### Category Management

Administrators can create new categories with a name and description.
Administrators can create subcategories under existing categories, with one level of nesting only (categories cannot have subcategories of subcategories).
Administrators can edit the name and description of any category or subcategory.
Administrators can delete categories. When a category is deleted, products previously in that category become uncategorized and remain visible in the system.
Subcategories cannot be deleted if they contain products.

### Product Oversight

Administrators can view a complete list of all products on the platform, regardless of seller status or product visibility.
Administrators can view the full details of any product, including name, description, category, base price, variants, and images.
Administrators can view snapshots of any product at any point in time, including snapshots of all variants.
Administrators can view snapshots of products even after those products have been deleted.

### Administrator Product Deletion

Administrators can delete any product from the platform for policy violations.
When a product is deleted by an administrator, all its variants and inventory records are also deleted.
Deleted products no longer appear in search results, category listings, or product detail pages.
Product snapshots are preserved even after the product is deleted.

### Order Oversight

Administrators can view a complete list of all orders on the platform.
Administrators can view the full details of any order, including customer information, order items, shipping address, shipments, and tracking information.
Administrators can view order items from any order, regardless of which seller fulfilled them.

### Force Cancel Order Items

Administrators can force-cancel individual order items from any order.
When an order item is force-cancelled, the customer is refunded for that item.
Force-cancelled items restore their stock quantities to inventory.
The remaining items in the order continue processing normally.
If all items in an order are force-cancelled, the entire order status becomes cancelled.

### Force Cancel Order

Administrators can force-cancel entire orders, cancelling all items in the order.
When an entire order is force-cancelled, the customer is refunded for all items.
Force-cancelled items restore their stock quantities to inventory.
The entire order status becomes cancelled.

### Force Refund Order Items

Administrators can force-refund individual order items from any order.
When an order item is force-refunded, the customer receives a refund for that item.
Force-refunded items restore their stock quantities to inventory.
The remaining items in the order continue processing normally.
If all items in an order are force-refunded, the entire order status becomes refunded.

### Force Refund Order

Administrators can force-refund entire orders, refunding all items in the order.
When an entire order is force-refunded, the customer receives refunds for all items.
Force-refunded items restore their stock quantities to inventory.
The entire order status becomes refunded.

### Customer Account Viewing

Administrators can view a list of all customer accounts on the platform.
Administrators can view the full details of any customer account, including profile information, orders, and reviews.

### Customer Ban Management

Administrators can ban customer accounts. When a customer is banned, they cannot log in to the system.
Administrators can unban banned customer accounts, restoring their ability to log in.
Banning a customer does not delete their account data, orders, or reviews.

### Seller Account Viewing

Administrators can view a list of all seller accounts on the platform.
Administrators can view the full details of any seller account, including shop profile, products, and order history.

### Seller Ban Management

Administrators can ban seller accounts. When a seller is banned, they cannot log in to the system.
Administrators can unban banned seller accounts, restoring their ability to log in.
Banning a seller does not affect existing orders or order history.

### Seller Suspension Process

Administrators can suspend seller accounts. When a seller is suspended:
- Their products are hidden from search results and category listings
- Their products cannot be purchased by customers
- They can still process existing orders (ship items, respond to cancellation and refund requests)
- They cannot create new products or edit existing products
- Their products remain in the system but are not visible to customers

### Seller Unsuspension Process

Administrators can unsuspend seller accounts. When a seller is unsuspended:
- Their products become visible in search results and category listings again
- Their products become purchasable by customers
- They regain the ability to create new products and edit existing products

### Pending Order Processing by Suspended Sellers

Suspended sellers can still process pending orders for items already sold.
Suspended sellers can ship existing order items and update tracking information.
Suspended sellers can respond to cancellation and refund requests for existing orders.
Product suspension does not affect the ability to fulfill orders that were completed before suspension.

### Seller Approval Request Viewing

Administrators can view a list of all pending seller approval requests.
Administrators can view the details of any seller approval request, including the seller's account information.

### Seller Approval Decision

Administrators can approve seller registration requests. When approved, the seller can begin selling on the platform.
Administrators can reject seller registration requests.
When rejecting a registration, administrators must provide a reason.

### Seller Rejection with Reason

When a seller registration request is rejected, the rejection reason is visible to the seller.
Rejected sellers can view the reason for rejection.
Rejected sellers can submit a new registration request after addressing the rejection reason.

## SuperAdministrator Operations

Super administrators have all regular administrator capabilities plus additional privileges. Super administrators manage administrator grades by promoting regular administrators to super administrator. Super administrators can demote other super administrators to regular administrator level. Super administrators cannot demote themselves. Super administrators view pending administrator requests from users wanting to become administrators. Super administrators approve or reject administrator promotion requests with review of the reason provided. Grade changes take effect immediately after approval. Super administrators have ultimate oversight over the platform governance.

### Administrator Grade System

The platform maintains two administrative grade levels: regular administrator and super administrator. Every administrator account has exactly one grade assigned. Regular administrators can oversee categories, products, orders, users, and seller approvals. Super administrators possess all regular administrator capabilities plus the exclusive ability to manage administrator grades. Grade assignments are displayed in the administrator management interface. Only super administrators can assign or modify administrator grades. The grade determines which administrative functions the account can access.

### Administrator Application Process

Any registered user on the platform can apply to become an administrator by submitting a request through the system. The application must include a written reason explaining why the user wants administrative privileges. The system records the submission date and the applicant's current account grade. Pending applications appear in a management interface visible only to super administrators. Applicants can view their own application status: pending, approved, or rejected. Approved applications are removed from pending lists. Rejected applications show the rejection reason and the applicant may submit a new request.

### Administrator Application Review

Super administrators access a complete list of all pending administrator applications with associated reasons. The interface displays the applicant's username, email, current account grade, and the reason provided. Super administrators can filter or search pending applications to locate specific requests. Upon reviewing an application, the super administrator can approve it to grant administrator privileges. When approved, the applicant's grade is immediately changed to regular administrator. The approval removes the application from the pending list. The system records who approved the request and when the approval occurred. Approval takes effect immediately with no waiting period.

### Administrator Application Rejection

Super administrators can reject pending administrator applications when privileges are not granted. The rejection requires documenting a written reason explaining why the request was denied. The system stores the rejection reason permanently for transparency and audit purposes. The rejected application is removed from the pending list and the user remains in their original account grade. Rejected users retain the ability to submit new administrator applications at a later time. The rejection does not prevent future applications.

### Grade Promotion and Demotion Process

Super administrators promote regular administrators to super administrator grade through the administrator management interface. The promotion action changes the administrator's grade from regular to super administrator, granting full administrative privileges including the ability to promote other administrators. Super administrators can also demote other super administrators back to regular administrator grade, transferring the account from full privileges to standard administrative privileges. When demoted, the administrator loses the ability to manage other administrator grades but retains all other administrative functions. Promotion and demotion actions take effect instantly with no batch processing. The system records each grade change with timestamp and the identity of the super administrator who performed the action.

### Self-Demotion Prevention

The system prevents super administrators from demoting their own account. A super administrator cannot initiate the demotion action on their own administrator grade. Only other super administrators can perform demotion on a super administrator account. This restriction ensures there is always at least one super administrator available to manage the administrative hierarchy.

### Platform Governance Oversight

Super administrators maintain ultimate oversight authority over the platform's administrative structure and all administrator actions. They can view the complete administrative hierarchy and track all grade changes that have occurred. The system provides audit visibility into all promotion and demotion actions for compliance and governance purposes. Super administrators have exclusive control over administrator grade assignments—regular administrators cannot modify any administrator grades. The administrative hierarchy ensures clear separation of responsibilities with super administrators serving as the final authority on all administrator-related decisions. All grade changes are permanently recorded for audit and governance purposes.

## SellerApprovalRequest Operations

Sellers submit registration requests that require administrator approval before selling begins. Each registration request has a status of pending, approved, or rejected. Sellers can view their current approval status at any time. If rejected, sellers can see the administrator provided rejection reason. Rejected sellers can submit a new registration request after addressing concerns. Administrators view the list of all pending seller approval requests. Administrators approve or reject requests, with rejection requiring a reason. Approved sellers can begin creating products and selling on the platform. The system tracks the entire approval workflow from submission to final decision.

### Seller Registration Submission

Sellers can submit a registration request to join the platform as a seller.
A seller registration request must include the seller's email and password for account creation.
When a seller submits a registration request, the request status is set to pending.
The seller cannot sell products until the registration request is approved.
The registration request records the submission timestamp.

### Pending Approval Status

When a seller registration request is submitted, the approval status is pending.
Sellers can view their pending approval status at any time.
Pending status indicates the request is waiting for administrator review.
Sellers cannot create products while in pending status.
Pending status remains until an administrator approves or rejects the request.

### Approval Granted Status

When an administrator approves a registration request, the status becomes approved.
Approved sellers can immediately begin creating products.
Approved sellers gain full access to the seller dashboard.
Approval status is visible to the seller.
The approval grants the seller permission to list products for sale.

### Rejection Status with Reason

When an administrator rejects a registration request, the status becomes rejected.
Rejection requires a reason to be provided by the administrator.
The rejection status is visible to the seller.
Sellers can view the rejection reason provided by the administrator.
The rejection reason must be meaningful and cannot be empty.

### Rejection Reason Visibility

Rejected sellers can view the rejection reason in their approval status.
The rejection reason is stored as part of the registration request record.
Sellers can access the rejection reason at any time after rejection.
The rejection reason provides guidance for resubmission.

### Registration Resubmission After Rejection

Sellers with a rejected registration request can submit a new registration request.
The new registration request creates a new approval workflow with pending status.
The previous rejection reason remains visible to the seller for reference.
Sellers can address concerns before resubmitting their registration.

### Pending Request List

Administrators can view a list of all pending seller approval requests.
The list includes the seller's email and submission date for each request.
The list can be paginated to handle multiple requests.
Administrators can filter the list by approval status.
Administrators can view the details of a specific registration request.

### Approval Decision

Administrators can approve a pending seller approval request.
When approved, the seller account is activated for selling.
The approval decision records the approval timestamp.
The approval creates a snapshot for audit purposes.

### Rejection Decision

Administrators can reject a pending seller approval request.
Rejection requires a reason to be provided by the administrator.
Rejection without a reason is not permitted.
The rejection decision records the rejection timestamp and reason.
The rejection decision creates a snapshot for audit purposes.

### Rejection Reason Documentation

Rejection reasons are documented as part of the approval request record.
The documentation includes the reason text and administrator who provided it.
The documentation is immutable and cannot be deleted.
The documentation is accessible to the rejected seller and administrators.

### Approved Seller Activation

When a seller approval request is approved, the seller account becomes active.
Active sellers can create products and list them for sale.
Active sellers can manage their shop profile.
Active sellers can view their order history.
The activation is immediate upon approval decision.

### Approval Workflow Tracking

The system tracks the entire approval workflow from submission to decision.
The tracking records submission date, decision date, and decision maker.
The approval workflow is documented for audit purposes.
Administrators can view the workflow history for each request.
The workflow tracking is immutable once recorded.
Workflows are preserved even after account deletion.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## Customer Error Scenarios

Customers must register with valid email and password before accessing any platform features. Password changes are allowed, but the old password must be verified during the process. Account deletion is permitted only when no orders or account conflicts exist. When a customer deletes their account, all profile information is permanently removed while order history and reviews are preserved with the 'deleted user' designation. Registration fails if the email is already registered. Login fails with incorrect email or password credentials. Users cannot access guest features without authentication.

### Customer Registration Requirements

All customers must register with a valid email address and password before accessing any platform features. Guests cannot browse products or view any content without logging in. Registration is mandatory for all platform usage. The system validates that the email address follows standard email format requirements. The password must meet minimum security requirements. If email validation fails, the registration request is rejected with a clear error message. If password validation fails, the registration request is rejected with guidance on requirements.

### Email Already Registered Scenario

When a customer attempts to register with an email address that is already associated with an existing account, the registration request is rejected. The system checks for duplicate email addresses during the registration process. If a duplicate is detected, the customer is informed that the email is already registered and offered the option to log in instead. The duplicate email check occurs at account creation time, before any account data is stored. This prevents multiple accounts from sharing the same email address.

### Incorrect Login Credentials

Login attempts require both a valid email address and the correct password. If the email address does not match any registered account, the login request is rejected with a generic message. If the password is incorrect for the provided email, the login request is rejected with a generic message. The system does not distinguish between invalid email and incorrect password to prevent account enumeration. Failed login attempts are logged for security monitoring. Customers may retry after a failed login attempt.

### Password Change Verification

Customers can change their password after logging in with their current credentials. The change process requires entering the current password for verification. The system validates that the current password is correct before allowing the new password to be set. If the current password is incorrect, the password change request is rejected. The new password must meet the same minimum security requirements as during registration. Upon successful password change, all existing active sessions are terminated and the customer must log in again with the new password.

### Account Deletion Conditions

Customers can delete their account if they have no pending orders and no account conflicts. The deletion process requires confirmation of the account owner's identity. Before deletion is processed, the system checks for any orders that are not fully completed. If pending orders exist (paid or shipped status), the deletion request is rejected. The system also checks for any pending cancellation or refund requests that could be affected by deletion. Customers must resolve all pending order issues before account deletion can proceed.

### Deleted User Designation for Reviews

When a customer deletes their account, their existing reviews are preserved but marked as 'deleted user'. The review content, rating, and timestamp remain visible on product pages. The customer name associated with the review is replaced with 'deleted user' text. This preserves the integrity of product ratings while respecting the customer's deletion request. Administrators can still view the original review author for dispute resolution purposes. Deleted user designation applies to all reviews written by the account owner.

### Order History Preservation on Deletion

When a customer deletes their account, their order history and order records are preserved. This preservation includes order details, transaction records, and order status history. The preserved order data remains accessible to sellers for their order fulfillment records. The preserved order data is also retained for legal and tax compliance purposes. Customers cannot request complete deletion of order history due to these business requirements. The order history remains linked to the original customer account, which is marked as deleted.

### No Guest Browsing Restriction

The platform does not allow any browsing or access without active customer authentication. Guests cannot view product listings, categories, or search results. The system redirects unauthenticated users to the login or registration page. This restriction applies to all platform features including product views, cart access, and order history. Even public seller profiles and shop pages require authentication to access. The system validates authentication status for every page request.

### Authentication Requirement for All Features

All platform features require authenticated customer access after the initial registration/login process. Cart operations, wishlist access, and order management require active authentication. Each feature request validates that the user is logged in before processing. Unauthenticated users attempting to access protected features are redirected to the authentication page. Session timeout terminates active sessions after a period of inactivity. Customers must re-authenticate to continue after session expiration. The authentication requirement applies to all customer-facing functionality.

## Seller Error Scenarios

Seller accounts require administrator approval before any selling activities can begin. Sellers can view their approval status at all times: pending, approved, or rejected. When registration is rejected, sellers receive a specific reason and may submit a new registration request. Account deletion is only permitted when the seller has no pending orders and no pending cancellation or refund requests. If pending transactions exist, account deletion is blocked with a clear explanation. Approved sellers can edit their shop profile, creating snapshots of each modification. Sellers cannot sell or create products while their account is under review or rejected.

### Seller Approval Status Viewing

Sellers can view their approval status at all times from their dashboard. The status displays as one of three values: pending, approved, or rejected. The status updates automatically when administrators take action on the registration request. While the status shows as pending, the seller cannot create products or view their seller dashboard summary. Once approved, the seller gains full selling privileges immediately. When the status shows as rejected, the seller receives the rejection reason and can submit a new registration request.

### Registration Rejection Reasons

When administrators reject a seller registration, they must provide a specific rejection reason. The rejection reason is visible to the seller in their dashboard under the approval status section. Common rejection reasons include incomplete business information, policy violations, or verification issues. The rejection reason is stored as part of the registration request record and cannot be modified after the decision is made. Rejected sellers can view the reason at any time while their account remains in rejected status.

### Pending Order Prevention of Account Deletion

Sellers can delete their account only when they have no pending orders. An order is considered pending if it contains items with paid or shipped status. The system checks for pending orders before allowing account deletion. If any pending orders exist, the deletion request is rejected with a message explaining which orders must be completed first. Once all orders reach delivered, cancelled, or refunded status, the account deletion becomes available. The seller must confirm the deletion after the system verifies there are no pending transactions.

### No Pending Cancellation Refund Check

Before allowing a seller to delete their account, the system must verify there are no pending cancellation requests or refund requests. A request is considered pending until the seller responds to it. The system scans all cancellation requests and refund requests associated with the seller's order items. If any pending requests exist, the deletion is blocked with an explanation of what must be resolved first. Once all requests are approved or rejected, the deletion option becomes available. This check runs independently from the pending orders check to ensure complete cleanup before account removal.

### Seller Profile Edit Snapshot Creation

Whenever a seller edits their shop profile (shop name, description, or logo), the system creates a snapshot of the previous state. The snapshot records the timestamp of the change, which fields were modified, and the values before and after the change. The seller can view the list of all snapshots for their shop profile. The snapshots are immutable and cannot be deleted or modified. Administrators can also view these snapshots for dispute resolution or platform oversight purposes. Each profile edit creates exactly one snapshot, regardless of how many fields are modified.

### Rejected Seller Resubmission Process

When a seller's registration is rejected, they can submit a new registration request. The new request creates a fresh approval process with a new pending status. The seller can modify the information from their original submission before resubmitting. The previous rejected request remains in the system as a record but does not block the new submission. The administrator reviews the new request independently, and the previous rejection reason does not prevent approval of the new request. The seller receives a new approval status update when the new request is processed.

### Suspended Seller Product Visibility

When a seller is suspended by an administrator, all their products are immediately hidden from search results and category listings. The products are no longer visible to customers and cannot be added to cart or purchased. However, the seller retains access to their dashboard and can continue processing existing orders. The seller can ship items, respond to cancellation requests, and respond to refund requests while suspended. The seller cannot create new products or edit existing products until the suspension is lifted. When the administrator unsuspends the account, products become visible in search and listings again.

### Seller Shop Name Preservation in History

When a seller deletes their account, their shop name is preserved in all historical order records. Customer order history shows the shop name as it was at the time of purchase, even after the seller account is deleted. The shop name remains linked to the order items and shipments in the system. This preservation ensures that order documentation and legal records remain complete and accurate. The shop name snapshot is included in each order item snapshot, making the historical record immutable. Customers can still view the shop name in their order history after the seller account is deleted.

## Product Error Scenarios

Products can only be deleted by their owner when no order items have paid or shipped status and no cancellation or refund requests are pending. Deletion removes the product from all search and category listings immediately. When stock reaches zero, the product variant displays as 'unavailable' but remains searchable. Products with no variants appear in search results but are marked as unavailable for purchase. Any product edit creates a snapshot preserving the previous state. Product deletion also removes all associated variants and inventory records automatically. Products deleted by sellers are automatically removed from all customer wishlists.

### Product Deletion Conditions

Sellers can delete their own products only when there are no pending order items with paid or shipped status for any variant of the product.

Sellers can delete their own products only when there are no pending cancellation requests for any variant of the product.

Sellers can delete their own products only when there are no pending refund requests for any variant of the product.

If any condition above is not met, the product deletion request is rejected.

When a product is successfully deleted, all its variants and inventory records are also deleted.

Deleted products no longer appear in search results or category listings.

Products deleted by sellers are automatically removed from all customer wishlists.

### No Pending Order Items Check

Before allowing product deletion, the system checks all variants of the product for any order items with paid status.

Before allowing product deletion, the system checks all variants of the product for any order items with shipped status.

If any order item with paid or shipped status is found for any product variant, the deletion request is rejected.

The check includes order items from all orders associated with the product variants.

### Cancellation and Refund Pending Prevention

Before allowing product deletion, the system checks for any pending cancellation requests for any variant of the product.

Before allowing product deletion, the system checks for any pending refund requests for any variant of the product.

If any pending cancellation request exists for any product variant, the deletion request is rejected.

If any pending refund request exists for any product variant, the deletion request is rejected.

Pending cancellation or refund requests must be resolved before product deletion can proceed.

### Product Unavailability at Zero Stock

When a product variant's stock quantity reaches zero, the variant is displayed as 'out of stock' or 'unavailable'.

Product variants with zero stock can still appear in search results and category listings.

Customers cannot add out-of-stock variants to their shopping cart.

The product page shows the out-of-stock status for variants with zero quantity.

When stock is replenished, the variant becomes available for purchase again.

### Unavailable Variant Search Behavior

Products with no variants are visible in search results.

Products with no variants are shown as 'unavailable' for purchase.

Products with no variants cannot be added to cart or checkout.

Unavailable variants remain searchable even when out of stock.

Search results include availability status for each product and variant.

### Product Edit Snapshot Requirement

Every time a seller edits a product, a product snapshot is created automatically.

The product snapshot records when the change was made.

The product snapshot records all fields that were changed during the edit.

The product snapshot preserves the values of all product fields before the change.

The product snapshot preserves the values of all fields after the change.

Product snapshots include snapshots of all variants at the time of the edit.

Product snapshots are immutable and cannot be deleted.

Sellers can view snapshots of their own products.

Administrators can view snapshots of any product.

Snapshots are preserved even after product deletion.

### Variant Deletion Consequences

Sellers can delete variants only when there are no pending order items with paid or shipped status for that specific variant.

Sellers can delete variants only when there are no pending cancellation requests for that specific variant.

Sellers can delete variants only when there are no pending refund requests for that specific variant.

If any of the above conditions is not met, the variant deletion request is rejected.

Deleting a variant removes it from the product entirely.

Deleted variants no longer appear in product detail pages or search results.

Each variant edit creates a snapshot preserving the previous state.

### Wishlist Automatic Removal on Deletion

When a seller deletes a product, the product is automatically removed from all customer wishlists.

Customers are notified when products in their wishlist are deleted by sellers.

Deleted products no longer appear in wishlist views after removal.

Wishlist pagination continues to function normally after automatic removals.

The automatic removal preserves the integrity of wishlists by preventing references to non-existent products.

### Product Removal from Category Listings

Deleted products are immediately removed from all category listings where they appeared.

Products deleted by sellers are immediately removed from search results.

Product removal from listings is instantaneous upon deletion confirmation.

Category browsing continues to function normally after product removals.

Empty categories remain visible in the category list.

## ProductVariant Error Scenarios

Each variant requires a unique SKU code; duplicate codes are rejected. Variants can only be deleted when no paid or shipped order items exist for that variant and no cancellation or refund requests are pending. Products must have at least one variant to be purchasable. When stock reaches zero, the variant cannot be added to the shopping cart. If a customer attempts to add more quantity than available stock, a warning is displayed. Variants with no stock are shown as unavailable on product detail pages but remain in search results. Every variant edit creates a snapshot of the previous state including option values, price, and SKU code.

### Duplicate SKU Code Validation

When a seller creates a new product variant, they must provide a SKU code that uniquely identifies that variant. The system checks if a SKU code already exists for any variant across all products. If the requested SKU code is already in use, the variant creation request is rejected with an error message indicating the duplicate SKU.

Sellers cannot modify a SKU code on an existing variant if that new value would conflict with another variant's SKU. If a seller attempts to change a variant's SKU to an already existing code, the change is rejected.

SKU codes are compared case-insensitively, meaning "RED-LARGE" and "red-large" are considered duplicates and only one can exist on the platform.

The system prevents SKU code reuse even for variants that have been deleted; deleted variant SKU codes cannot be reassigned to new variants.

### Variant Deletion Conditions

Sellers can delete product variants only when specific conditions are met. A variant cannot be deleted if there are any order items in "paid" or "shipped" status that reference that variant.

If a variant has a pending cancellation request associated with any order item, the variant cannot be deleted until the cancellation request is resolved.

If a variant has a pending refund request associated with any order item, the variant cannot be deleted until the refund request is resolved.

When a seller attempts to delete a variant that has pending orders or requests, the deletion is rejected with a clear message explaining which orders or requests are blocking the deletion.

Deleting a variant permanently removes it from the product's available options, and customers cannot purchase that variant again. The variant is not visible in search results or product detail pages after deletion.

### Minimum Variant Requirement

Every product must have at least one variant before it can be marked as available for purchase. Products with zero variants are considered incomplete and cannot be purchased.

When a seller attempts to create a product without adding at least one variant, the product creation is rejected. Sellers must add a variant before completing the product creation process.

If a product is deleted from all its variants, the product becomes "unavailable" and is shown in search results and category listings with a status indicating it has no purchasable options.

Products with variants but all variants out of stock are also shown as unavailable, but the product structure itself remains in the system for future restocking.

Customers can view products with no variants in search results, but attempting to add such a product to the cart is prevented with a message that the product has no available variants.

### Zero Stock Cart Prevention

When stock quantity for a variant reaches zero, the variant is automatically marked as "out of stock" on the product detail page and in search results.

Customers cannot add out of stock variants to their shopping cart. If a customer attempts to add a variant with zero stock, the request is rejected with a message indicating the variant is currently unavailable.

If a customer has an out of stock variant in their cart and the stock remains at zero while they continue shopping, a warning is displayed when they view the cart.

Out of stock variants remain visible on the product detail page so customers can see they are available for future restocking, but the "Add to Cart" button is disabled for that variant.

Once stock is replenished through an inventory record with a positive quantity, the variant automatically becomes available for cart addition without requiring manual intervention.

### Stock Quantity Warning Display

When a customer adds a variant to their cart, the system compares the requested quantity against the current stock level.

If the stock quantity is less than the cart quantity for any item in the cart, a warning message is displayed to the customer indicating the available stock level.

For example, if a variant has 3 units in stock and a customer attempts to add 5 units to the cart, a warning is shown: "Only 3 units available for this variant."

The warning does not prevent the customer from proceeding to checkout with the reduced quantity; instead, it alerts them to potentially modify their order quantity before checkout.

When stock levels change while a variant remains in the cart, the cart page updates to show the current available stock and any warnings if the cart quantity exceeds available stock.

### Unavailable Variant Visibility

Variants that are out of stock remain visible in product search results and category listings, but they are visually distinguished from in-stock variants.

On the product detail page, out of stock variants are shown with their option values and price, but the variant selection radio button or dropdown option is disabled or marked as unavailable.

In product listing views (search results, category pages), the main variant's availability status is shown, and if all variants are out of stock, the product is marked as unavailable.

Search filters include an "In-stock only" option that customers can use to exclude out of stock variants from their search results.

Out of stock variants cannot be selected or added to the wishlist as a purchasable item; they can only be viewed but not interacted with.

### Variant Edit Snapshot Creation

Every time a seller edits a product variant, the system creates a snapshot of the variant's previous state before applying the changes.

The snapshot records the SKU code, option values (such as color, size, material), price, and any other variant attributes at the moment before the edit.

The snapshot also records when the edit was made and which seller account made the change.

Customers and administrators with appropriate access can view variant edit history to see how prices, option values, or SKU codes have changed over time.

Snapshots of variant edits are immutable and cannot be deleted, even if the variant itself is later deleted from the product.

### Variant Price Override

When creating a variant, sellers can choose to set a price that overrides the product's base price. If no price is specified for a variant, the variant inherits the base price.

When editing a variant, sellers can update the variant's price to be higher or lower than the base price. Each price change creates a snapshot of the variant with the old and new price values.

The variant's price is what customers see and pay when purchasing that specific variant, regardless of the product's base price.

If a seller removes a variant's custom price (clears the price override), the variant automatically reverts to using the product's current base price.

Price changes on variants apply immediately and are reflected on the product detail page for all customers viewing the product.

### Option Values Modification Tracking

When sellers modify option values on a variant (such as changing "Red" to "Blue" for a color option), the system tracks these changes through snapshots.

Every change to option values is recorded with the old value, new value, and timestamp of the modification.

Customers viewing the variant's edit history can see how the option values have changed over time.

Option value changes do not affect existing order items that were already purchased with the previous option values; the snapshot of the product and variant at the time of purchase preserves the original option values.

Sellers can modify option values on variants that have no pending orders or requests without restrictions, allowing them to update product descriptions as needed.

## Category Error Scenarios

Categories and subcategories can only be created, edited, or deleted by administrators. Category deletion moves all associated products to an uncategorized status. Customers cannot modify category structures or content. Products without categories can still be displayed but require admin assignment. Subcategories support only one level of nesting; deeper nesting is not allowed. Category name or description changes are tracked with snapshots. Empty categories with no products remain visible in the category list for browsing purposes.

### Administrator-Only Category Management

Only administrators can create, edit, or delete categories and subcategories. Customers and sellers cannot create or modify category structures. When a customer or seller attempts to modify a category, the request is rejected with an error message indicating insufficient permissions.

### Category Deletion and Uncategorized Handling

When an administrator deletes a category, all products within that category are automatically moved to an uncategorized status. Products remain accessible in search and browsing but are not associated with any category until an administrator reassigns them to a valid category. Products cannot be deleted solely because their category was deleted.

### Subcategory Nesting Limit

Categories support only one level of subcategory nesting. A subcategory cannot have its own children. When attempting to create a subcategory under a subcategory, the system rejects the request and indicates that only categories (not subcategories) can have child categories.

### Empty Category Visibility

Categories with no products remain visible in the category list for browsing purposes. Customers can see all categories regardless of whether they contain products. Empty categories display a zero count but are not hidden or removed from the category navigation.

### Category Content Modification Tracking

Every change to a category name or description creates a snapshot that records when the change was made, the previous values, and the new values. Administrators can view the modification history for any category. These snapshots are immutable and cannot be deleted.

### Product Unassignment on Category Deletion

When a category is deleted, all products are automatically unassigned from that category but remain in the system with their other attributes intact. The products appear in search results and can be reassigned by an administrator to a new category. No product data is lost during category deletion.

### Customer Browsing Permission

All customers, including those who are not logged in, can browse the complete list of categories. Customers can view products within any category without requiring special permissions. Browsing categories does not require authentication.

### Category Structure Validation

The system validates that a parent category exists before creating a subcategory. When the parent category has been deleted or does not exist, the subcategory creation request is rejected. Category names must be unique within their parent level, and category descriptions can be empty.

## Order Error Scenarios

Orders are created only after successful payment processing. If payment fails, no order is created and the customer can retry. Shipping address cannot be modified after order placement. Orders contain items from potentially multiple sellers, each processed independently. When all items are cancelled or refunded, the entire order transitions to that status. Mixed item statuses result in 'partially completed' order status. Unavailable items prevent checkout from proceeding. Payment gateway failures do not create orphaned orders.

### Payment Failure Order Prevention

An order is created only after payment processing succeeds.

When a customer attempts to place an order, the system processes the payment through the payment gateway.

If payment processing fails for any reason, the system does not create an order record.

The customer is notified that payment failed and may retry the checkout process.

No inventory is deducted when payment fails.

No items are removed from the cart when payment fails.

The customer may modify their cart and attempt payment again.

Failed payment attempts do not create any partial or orphaned order records.

### Checkout Unavailable Items Block

Before checkout proceeds, the system validates that all cart items are available.

An item is unavailable if the variant has been deleted by the seller.

An item is unavailable if the variant stock quantity is zero.

If any cart item is unavailable, the customer cannot proceed to checkout.

The system displays a warning message listing which items are unavailable.

The customer must remove unavailable items from the cart before proceeding.

The system shows out of stock variants as unavailable in the cart view.

The system shows a warning when cart quantity exceeds available stock.

Checkout confirmation requires all items to be available and purchasable.

### Shipping Address Immutability After Placement

The customer selects a shipping address during the checkout process.

The selected address is included in the order record at the time of placement.

After an order is successfully created, the shipping address cannot be modified.

The customer cannot update the shipping address on an existing order.

The shipping address remains fixed throughout the order lifecycle.

This rule applies to all orders regardless of their current status.

If the customer needs a different shipping address, they must place a new order.

The original shipping address is preserved in the order history for reference.

Seller shipment creation uses the original shipping address from order creation.

### Multiple Seller Item Processing

A single order may contain items from different sellers.

Each seller's items are processed independently from other sellers' items.

A seller can only fulfill items from products they own.

When shipping, each seller creates shipments for their own items only.

Different sellers cannot ship items from other sellers in the same shipment.

Item cancellation is handled per item, regardless of which seller owns it.

Item refund is handled per item, regardless of which seller owns it.

Each seller receives notification only for items they own in the order.

Order tracking shows separate shipments for each seller in the order.

The overall order status reflects the combined status of all item statuses.

### Order Status Derived From Items

The overall order status is calculated from the statuses of all order items.

When all items have status paid, the order status is paid.

When any item has status shipped and no item has status delivered, the order status is shipped.

When all items have status delivered, the order status is delivered.

When all items have status cancelled, the order status is cancelled.

When all items have status refunded, the order status is refunded.

The order status updates automatically when any item status changes.

Customers view the overall order status when browsing order history.

The item-level status provides more detailed information for each product purchased.

### Partially Completed Mixed Status

When an order contains items with different statuses, the order status is partially completed.

Partially completed applies when some items are delivered and others are not.

Partially completed applies when some items are delivered and others are cancelled.

Partially completed applies when some items are delivered and others are refunded.

Partially completed applies when some items are shipped and others are delivered.

Partially completed applies to any mixed combination of statuses.

The order history shows which items have which status individually.

Shipment delivery confirmation updates only the items in that shipment.

Cancellation or refund of individual items does not affect other items.

The order remains active while items have mixed statuses.

### Cancellation All Items Full Order Cancel

When every item in an order has been cancelled, the entire order status becomes cancelled.

Item cancellation is requested by the customer for paid items not yet shipped.

The seller approves or rejects each individual cancellation request.

When all items in the order have approved cancellation, the order status updates to cancelled.

Each cancelled item restores its stock quantity through an inventory record.

Refunds are processed for each cancelled item individually.

The order record preserves the cancellation history of all items.

Once all items are cancelled, no further actions can be taken on the order.

The order status cancellation is final and cannot be reversed.

### Refund All Items Full Order Refund

When every item in an order has been refunded, the entire order status becomes refunded.

Item refund is requested by the customer for delivered items.

Refund requests must be made within seven days of item delivery.

The seller approves or rejects each individual refund request.

When all items in the order have approved refund, the order status updates to refunded.

Each refunded item restores its stock quantity through an inventory record.

Refunds are processed for each refunded item individually.

The order record preserves the refund history of all items.

Once all items are refunded, the order status is refunded and closed.

### Order Creation Success Conditions

An order is created successfully when all payment requirements are met.

The customer must have a valid shipping address selected.

All cart items must be available and in stock at checkout time.

Payment processing must complete without errors.

The customer confirms the order details before final submission.

After successful payment, each purchased variant stock quantity is decreased.

Order items are created with initial status paid.

Product and variant snapshots are saved with each order item.

Seller profile snapshots are saved with each order item.

Cart items are removed after successful order creation.

## OrderItem Error Scenarios

Cancellation requests can only be made for items with 'paid' status, not yet shipped. Customers can request cancellation with a reason text. Sellers approve or reject cancellation requests, and each response creates a snapshot. Approved cancellations restore stock quantities through inventory records. Refund requests can only be made for items with 'delivered' status within 7 days of delivery. Sellers respond to refund requests with snapshots of the decision. Individual item cancellation or refund does not affect other items in the same order. Items in shipped or delivered status cannot be cancelled by customers.

### Cancellation Eligibility

Customers can request cancellation for individual order items only when the item status is 'paid'. Cancellation requests cannot be made for items with any other status, including shipped, delivered, cancelled, or refunded status. The system validates the item status before accepting a cancellation request. If the item is not in paid status, the cancellation request is rejected. Once an item transitions from paid to shipped status, cancellation is no longer available to the customer.

### Shipped Item Cancellation Prevention

Items that have been shipped cannot be cancelled by customers. When an order item status changes to 'shipped', the system prevents any further cancellation requests for that item. The shipment creation process locks the item from customer-initiated cancellations. Customers who wish to return shipped items must use the refund request process instead, which is available after delivery confirmation.

### Cancellation Reason Requirement

When creating a cancellation request, customers must provide a reason as text. The cancellation reason is required and cannot be omitted or left blank. The system validates that a reason text is provided before accepting the cancellation request. The reason is recorded for seller review and dispute resolution purposes.

### Seller Cancellation Response Snapshot

When a seller responds to a cancellation request with either approval or rejection, the system creates a snapshot of the request state. This snapshot captures the decision made, when it was made, and the seller who made the decision. The snapshot is immutable and cannot be deleted. Approved cancellation requests trigger stock restoration for the cancelled item, while rejected requests leave the item in its current paid status.

### Refund Eligibility - Delivered Status

Customers can request refunds for individual order items only when the item status is 'delivered'. Refund requests cannot be made for items with any other status, including paid, shipped, cancelled, or refunded status. The system validates the item status before accepting a refund request. If the item has not been delivered, the refund request is rejected.

### 7-Day Refund Request Window

Refund requests can only be made within 7 days from the date the item was delivered. The system tracks the delivery date for each item and calculates the refund window from that date. Once 7 days have passed since delivery, the system prevents new refund requests for that item. The 7-day window is measured in calendar days from the delivery confirmation date.

### Delivery Date Refund Window Restriction

The system enforces a delivery date restriction for refund requests. Each refund request is validated against the item's delivery date to ensure it falls within the allowed 7-day period. Requests submitted after the 7-day window expires are rejected, regardless of the reason provided. This restriction applies to all items in all orders and cannot be overridden.

### Refunded Item Stock Restoration

When a refund request is approved, the system creates an inventory record that restores the stock quantity for the refunded item variant. The inventory record reflects a positive quantity change with the reason documented as 'refund'. The restored stock becomes available for future sales. If the item variant was out of stock, the restoration makes it available again. This stock restoration occurs automatically upon approval.

### Individual Item Partial Processing

Cancellation and refund requests are processed at the individual order item level, not at the order level. Each item in an order can have its own independent cancellation or refund status. When one item is cancelled or refunded, other items in the same order continue processing normally without interruption. The order status is derived from the aggregate status of all its items, allowing mixed states within a single order.

## Shipment Error Scenarios

Shipment creation requires selecting at least one order item from the same seller. A shipment can contain multiple items, or items can be shipped individually. All items in a shipment share the same tracking information including carrier name and tracking number. Customer delivery confirmation applies to all items in the shipment collectively. If no customer confirmation occurs, items automatically change to 'delivered' after 14 days from shipment date. Sellers cannot create shipments for items not belonging to their products. Different sellers always create separate shipments even for the same customer order.

### Same Seller Item Shipment Grouping

A shipment can contain one or more order items from the same seller. Order items from different sellers are never included in the same shipment, even if they belong to the same customer order. When a customer order contains items from multiple sellers, each seller creates their own separate shipment for their items. Sellers can only select order items that belong to their products for inclusion in their shipment. If a seller attempts to include order items from another seller in a shipment, those items are automatically excluded and the shipment creation fails with an error. The system validates that all items in a shipment belong to the same seller before finalizing the shipment. This ensures that tracking information and delivery confirmation remain consistent across all items in a shipment.

### Individual and Bundled Shipment Options

Sellers can choose to ship order items individually or bundle multiple items into a single shipment. When shipping individually, each order item receives its own shipment with unique tracking information. When bundling items, multiple order items from the same seller are combined into one shipment with shared tracking information. Sellers can bundle any combination of their paid order items from the same customer order into a single shipment. The choice of individual or bundled shipment is made at the time of shipment creation and cannot be changed afterward. A shipment can contain a mix of single-item shipments and bundled shipments for different items from the same seller. This flexibility allows sellers to optimize their shipping processes based on their operational needs.

### Tracking Information Requirement

When creating a shipment, sellers must provide carrier name and tracking number. These tracking details are required fields and cannot be left blank. The tracking information is stored with the shipment and displayed to the customer. All items in the same shipment display the identical tracking number and carrier name. If a shipment is created without complete tracking information, the shipment remains in draft status and cannot be used for delivery confirmation. Customers can view tracking information for each shipment on their order details page. The tracking number is used to monitor the delivery progress of all items in that shipment. If a seller updates tracking information for a shipment, the new information is immediately available to the customer. Incomplete tracking information prevents the shipment from being marked as shipped.

### Delivery Confirmation Per Shipment

Customers can confirm delivery for each shipment they receive. Delivery confirmation applies to all order items in the shipment collectively, not to individual items within the shipment. When a customer confirms delivery for a shipment, all order items in that shipment change to delivered status. Customers confirm delivery through their order details page by viewing the shipment tracking information and confirming receipt. A shipment can only be confirmed as delivered once by the customer. If a customer attempts to confirm delivery for an already-delivered shipment, the request is rejected. Customers cannot confirm delivery for shipments that have not yet been shipped. Once a shipment is confirmed as delivered, the status cannot be reverted by the customer. Delivery confirmation for one shipment does not affect the status of other shipments in the same order.

### 14-Day Automatic Delivery Confirmation

If a customer does not manually confirm delivery, all order items in a shipment automatically change to delivered status 14 days after the shipment is created and marked as shipped. The 14-day countdown begins from the date the shipment was created and items changed to shipped status. Once the 14-day period expires, all items in the shipment automatically change to delivered status without requiring any customer action. The system calculates automatic delivery based on the shipment creation timestamp. This automatic confirmation applies regardless of whether the customer actually received the items. If a customer manually confirms delivery before the 14-day period ends, the manual confirmation takes precedence and items are marked delivered immediately. Items that change to delivered status automatically cannot be manually reverted by the customer. The automatic confirmation ensures that orders progress to completion even without customer action.

### Seller Product Ownership Validation

Sellers can only create shipments for order items that belong to their products. The system validates seller ownership before allowing shipment creation. If a seller attempts to create a shipment for order items from another seller's products, the shipment creation request is rejected. The validation occurs at the time of shipment creation and prevents cross-seller shipment mixing. Sellers can view a list of order items for their products that are available for shipment. Only order items with status paid or shipped are available for shipment creation. Order items from cancelled orders or refunded orders are not available for shipment. The ownership validation ensures that only the correct seller can manage shipments for their products.

### Shipment Error Conditions

If a seller attempts to create a shipment with no selected order items, the request is rejected. If a seller attempts to create a shipment for an order item that has already been shipped, the request is rejected. If a seller attempts to create a shipment for an order item with status other than paid or shipped, the request is rejected. If a shipment is created but tracking information is incomplete, the shipment remains in draft status and cannot be used for delivery confirmation. If a customer attempts to confirm delivery for an order item that has already been delivered, the request is rejected. If the system detects a shipment with items from different sellers, the shipment creation fails. If order items in a shipment are cancelled before the shipment date passes, automatic delivery confirmation does not occur. If a shipment is created after an order item has been cancelled or refunded, the shipment creation is rejected. If all items in a shipment have different shipping dates, each item receives its own shipment with separate tracking.

### Shipment Visibility and Access

Customers can view all shipments for their orders on the order details page. Each shipment displays its tracking information, carrier name, and tracking number. Customers can see which order items are included in each shipment. Sellers can view shipments they have created for their order items. Sellers can monitor the status of their shipments including tracking updates and delivery confirmations. Administrators can view all shipments on the platform for oversight purposes. Super administrators can view detailed shipment information including timestamps and status change history. Shipment information is displayed in chronological order with the most recent shipments listed first. Only the owner of an order item can view its shipment information, ensuring data privacy.

## Address Error Scenarios

Customers can add multiple shipping addresses with all required fields: recipient name, phone number, street address, city, state/province, postal code, and country. Default address must be set when adding new addresses or can be changed from the existing list. Address deletion is permitted at any time unless referenced by a pending order. Editable address fields preserve the original data through snapshots. One address must be designated as default for checkout selection. Invalid or incomplete address data is rejected during address creation. Customers cannot set an address as default if no address exists.

### Multiple Address Addition

Customers can add multiple shipping addresses to their account. Each address is independently created and managed. There is no limit on the number of addresses a customer can store. When adding a new address, the customer provides all required information including recipient name, phone number, street address, city, state/province, postal code, and country.

### Default Address Assignment

When adding a new address, customers must designate one address as their default shipping address. If an address already exists as default, the new address becomes the default and the previous default is demoted to non-default status. If no default address exists in the system, the first address created automatically becomes the default.

### Default Address Change

Customers can change their default shipping address at any time from their saved addresses list. Changing the default does not affect the availability or status of non-default addresses. Only one address can be designated as default at any given time. The change takes effect immediately for all subsequent checkout operations.

### Address Field Validation

All address fields are required and must be complete during creation. Recipient name, phone number, street address, city, state/province, postal code, and country cannot be left blank or contain only whitespace. If any required field is missing, empty, or contains only whitespace, the address creation is rejected and the customer is prompted to provide complete information. The system validates all fields before processing the request.

### Pending Order Address Reference

Addresses cannot be deleted if they are referenced by a pending order (orders with paid, shipped, or cancelled status). Customers attempting to delete an address associated with a pending order receive an error message indicating the address is in use. The address remains visible and usable for order processing until the order reaches a completed or refunded state.

### Address Edit Snapshots

Every modification to an address creates a snapshot recording the change. Snapshots capture: when the edit was made, what fields were changed, and the values before and after the modification. Snapshots are immutable and cannot be deleted. Only the address owner and administrators can view address edit snapshots for dispute resolution purposes.

### Checkout Address Selection

During checkout, customers must select one shipping address from their saved addresses or use their default address. If a customer has no saved addresses, they cannot proceed with checkout until at least one address is added. The selected address is included in the order and cannot be modified after the order is placed.

## Review Error Scenarios

Reviews can only be written for products with items marked as 'delivered' status. Customers may write one review per product per order. Rating must be between 1 and 5 stars and is required. Text content is optional but if provided must not be empty when submitted. Customers can edit their own reviews, with each edit creating a snapshot. Review deletion preserves snapshots but the review is no longer visible on the product page. Average rating calculation excludes deleted reviews. Products with no reviews display no average rating.

### Review Creation Eligibility

Customers can write a review for a product only after they have purchased that product and the order item status is marked as 'delivered'.

A customer may submit a review for any delivered order item associated with their account. The system checks the order item status before accepting the review submission.

If the order item status is not 'delivered', the review request is rejected and the customer is informed that the item must be delivered before they can write a review.

Order item statuses that do not allow review creation:
- Paid: payment completed but item has not shipped
- Shipped: item has been shipped but not yet delivered
- Cancelled: item was cancelled and never delivered
- Refunded: item was refunded and never delivered

### One Review Per Product Per Order

A customer may write only one review per product per order.

If a customer purchases multiple quantities of the same product in a single order, they may submit only one review for that product from that order, not one review per quantity.

If a customer has purchased the same product in multiple separate orders, they may write a review for each order, resulting in multiple reviews for the same product.

The system prevents duplicate reviews by checking the combination of customer, product, and order before accepting a new review submission.

If a review already exists for the product from that order, the new review request is rejected and the customer is informed that they have already submitted a review for this product in this order.

### Rating Requirements

Each review must include a rating between 1 and 5 stars.

The rating is a required field. A review cannot be submitted without providing a rating value.

Valid rating values are integers from 1 to 5, where:
- 1 star represents the lowest rating
- 5 stars represents the highest rating

Ratings outside this range (0, negative numbers, or numbers greater than 5) are rejected.

Fractions or decimal ratings (e.g., 3.5 stars) are not supported. Only whole number ratings from 1 to 5 are accepted.

### Review Text Content

Customers may include optional text content with their review.

The text content is not required for review submission. A review can be submitted with only a rating and no text.

However, if a customer provides text content, it must contain at least one character. Empty or whitespace-only text submissions are rejected.

The system validates that if the text field is submitted, it cannot be empty or contain only spaces.

Maximum length limits are not specified for text content. Customers may write reviews of any length within reasonable bounds.

### Review Editing

Customers can edit their own reviews after submission.

A customer may only edit reviews they have written. The system verifies review ownership before allowing any edits.

Every edit to a review creates a snapshot that records:
- When the edit was made (timestamp)
- What was changed (rating and/or text content)
- The values before the edit
- The values after the edit

The original review content remains accessible through snapshots for dispute resolution.

Customers cannot edit reviews for products they did not purchase.

Customers cannot edit reviews created by other customers.

Review edits are saved immediately and become visible to other users after saving.

### Review Deletion

Customers can delete their own reviews.

A customer may only delete reviews they have written. The system verifies review ownership before allowing deletion.

When a review is deleted, snapshots are preserved and cannot be deleted. The snapshots remain accessible to the review owner and administrators for dispute resolution.

The deleted review is no longer visible on the product detail page.

Deleted reviews are excluded from average rating calculations.

After deletion, the customer cannot restore the review through the normal review interface. The deleted review exists only in snapshots.

### Average Rating Calculation

The product's average rating is calculated from all non-deleted reviews.

Deleted reviews are excluded from the average calculation. Only reviews that are currently visible on the product page contribute to the average.

If a product has no reviews, no average rating is displayed.

If all reviews for a product are deleted, no average rating is displayed (the same as having no reviews).

The average rating is calculated as the sum of all review ratings divided by the number of non-deleted reviews.

The displayed average rating is rounded to one decimal place for display purposes (e.g., 4.3 stars).

Review counts shown on the product page include only non-deleted reviews.

### Products Without Reviews

Products with no reviews display no average rating on the product detail page.

When a product has been purchased but no reviews have been written, the product page shows that no reviews exist.

The product remains visible in search and category listings.

The absence of reviews does not affect the product's availability or ability to be purchased.

New reviews submitted for a product with no existing reviews become the first reviews for that product and will then contribute to the average rating calculation.

### Review Submission Flow

Review operations flow through the system as follows:

```mermaid
sequenceDiagram
    participant C as Customer
    participant S as System
    participant DB as Database
    
    C->>S: Request to write review
    S->>DB: Check order item status
    alt Status is delivered
        DB-->>S: Confirmed delivered
        S->>DB: Check existing review for product/order
        alt No existing review
            DB-->>S: No review found
            S->>C: Show review form
            C->>S: Submit rating and text
            S->>S: Validate rating 1-5
            S->>S: Validate text if provided
            S->>DB: Create review
            S-->>C: Review submitted
        else Existing review found
            DB-->>S: Review exists
            S->>C: Show edit mode
        else Status not delivered
            DB-->>S: Not delivered
            S-->>C: Reject - item must be delivered
    else Invalid rating
        S-->>C: Reject - rating must be 1-5
    else Empty text provided
        S-->>C: Reject - text cannot be empty
    end

## Wishlist Error Scenarios

Customers can add products to their wishlist for later consideration. Wishlist displays are paginated to manage large lists. Products added to wishlist must exist and be active in the system. When a seller deletes a product, it is automatically removed from all customer wishlists. Customers can remove products from their wishlist at any time. Wishlist operates at the product level, not variant level. Products unavailable due to zero stock can remain in wishlist but show availability status. Deleted products trigger automatic wishlist removal across all users.

### Automatic Removal on Product Deletion

When a seller deletes a product from the platform, that product is automatically removed from all customers' wishlists.

Customers cannot add products that have been deleted by their sellers to their wishlists.

The system checks product existence before adding any product to a wishlist.

If a product is deleted while a customer has it in their wishlist, the product disappears from that customer's wishlist view immediately.

Deleted products are no longer accessible to any customers through the wishlist feature.

The system processes all wishlist entries for deleted products in bulk when deletion occurs.

### Wishlist Pagination Display

When customers view their wishlist, the list of products is displayed with pagination.

The wishlist displays products in pages, with a fixed number of products per page.

Customers can navigate between pages to view additional wishlist items.

The pagination allows customers to browse large wishlists without loading all items at once.

Each page shows the same product display format with main image, name, price, and availability status.

Pages are numbered to help customers track their position in the list.

### Product Level Wishlist Display

The wishlist displays products at the product level, not at the variant level.

When a product is added to the wishlist, all of its variants are considered included.

Customers see one product entry in their wishlist, regardless of how many variants exist.

The wishlist does not differentiate between different variants of the same product.

Product information displayed includes the main image, product name, and base price.

### Availability Status in Wishlist

Each product in the wishlist shows its current availability status to customers.

Products show as available or unavailable based on stock levels of their variants.

Out of stock products can remain in customers' wishlists with an availability indicator.

Unavailable products are visually distinguished from available products in the wishlist display.

The availability status updates when product stock levels change.

### Customer Wishlist Removal

Customers can remove any product from their wishlist at any time.

The removal is immediate and the product no longer appears in the customer's wishlist.

Removing a product from the wishlist does not affect the product's availability or stock.

Customers can remove products individually, one at a time.

There is no limit to how many times a product can be added and removed from a wishlist.

### Active Product Requirement for Addition

Customers can only add active products to their wishlists.

Products that are deleted or no longer exist cannot be added to wishlists.

The system validates product existence before allowing wishlist addition.

Inactive or removed products will fail to be added to the wishlist with an error.

Products must be currently available on the platform to be wishlistable.

### Zero Stock Wishlist Visibility

Products with zero stock can remain in customers' wishlists.

Zero stock variants are shown as unavailable in the wishlist display.

Customers can keep out of stock products in their wishlists for future reference.

The wishlist does not automatically remove zero stock products.

Zero stock products continue to show their availability status as unavailable.

### Wishlist Pagination Limits

The wishlist pagination follows a fixed items-per-page limit.

Each page displays a predetermined maximum number of wishlist products.

Navigation controls allow customers to move between pages.

The pagination limit ensures consistent display performance for large wishlists.

## Snapshot Error Scenarios

Every edit to mutable data creates an immutable snapshot that cannot be deleted. Snapshots record when changes occurred, what changed, and before/after values. Relevant parties can view snapshots: owners, administrators, and customers for their own orders. Snapshots preserve complete state including product, variants, seller profiles, and order items. Product snapshots include nested snapshots of all variants at the time of edit. Snapshot data includes all fields modified during the edit operation. Snapshot records cannot be modified or deleted under any circumstances. Snapshots remain accessible even after the original data is deleted.

### Snapshot Immutability and Creation

When any editable data is modified, the system automatically creates an immutable snapshot of the previous state.
This snapshot cannot be deleted or modified under any circumstances.
Snapshots are created for: products, product variants, seller profiles, order items, reviews, cancellation requests, and refund requests.
The snapshot captures the complete state of the data at the moment of modification.
Once created, the snapshot remains in the system permanently regardless of what happens to the original data.
This immutability guarantee applies to all users including administrators and super administrators.

### Snapshot Creation on Edit

Every modification to mutable data triggers automatic snapshot creation.
Product edits create a product snapshot containing all product fields.
Product variant edits create a variant snapshot with SKU code, option values, and price.
Seller profile edits create a snapshot of the shop name, description, and logo.
Review edits create a snapshot of the rating and text content.
Cancellation request updates create a snapshot of the reason and status changes.
Refund request updates create a snapshot of the reason and status changes.
Order item snapshots are created during order placement, capturing the product, variant, and seller state at purchase time.

### Before and After Value Recording

Snapshots record both the values before and after the modification.
For product edits, the snapshot includes previous name, description, category, base price, and images alongside the new values.
For variant edits, the snapshot includes previous SKU code, option values, and price alongside updated values.
For seller profile edits, the snapshot includes previous shop name, description, and logo alongside the new values.
All field changes are explicitly documented with their before and after values.
The snapshot preserves the complete set of values that existed before the edit.
After values reflect the state immediately following the modification.

### Modification Timestamp Recording

Every snapshot records the exact timestamp when the change was made.
The timestamp is captured in the system's standard time format.
The timestamp is immutable and cannot be altered.
The timestamp allows chronological tracking of all modifications.
Modification time is preserved even after the original data is deleted.
Timestamps enable audit trails for dispute resolution.

### Owner and Administrator Access Permissions

Owners can view snapshots of their own data.
Product owners (sellers) can view snapshots of their products.
Seller accounts can view snapshots of their shop profile.
Customers can view snapshots of order items they purchased.
Administrators can view snapshots of any product on the platform.
Super administrators can view snapshots of all data across the platform.
Customers cannot view snapshots owned by other customers.
Access is restricted to relevant parties only.

### Nested Product Variant Snapshots

Product snapshots include nested snapshots of all variants at the time of edit.
When a product is edited, each variant snapshot captures the variant state at that moment.
The snapshot structure is: product snapshot → product snapshot SKU.
This preserves the complete product configuration including all variants.
Variant snapshots within a product snapshot cannot be accessed independently.
The nested structure ensures complete state preservation for the entire product.

### Snapshot Preservation After Data Deletion

Snapshots remain accessible even after the original data is deleted.
When a seller deletes a product, all product snapshots are preserved.
When a seller deletes their account, all seller profile snapshots are preserved.
When a product is deleted, variant snapshots within product snapshots are preserved.
Order item snapshots are preserved regardless of product deletion.
Review snapshots are preserved even when the review is marked as deleted.
Snapshot data cannot be deleted even by super administrators.
Deletion of original data does not affect snapshot availability.

### Complete State Preservation

Snapshots preserve the complete state of data at the moment of modification.
Product snapshots include all fields: name, description, category, base price, and images.
Variant snapshots include all fields: SKU code, option values, price, and stock status.
Seller profile snapshots include all fields: shop name, description, and logo.
Order snapshots include product name, description, variant options, and price at time of purchase.
Seller profile snapshots in orders preserve shop name and logo at time of purchase.
All modified fields are captured with their exact values at that moment.
The snapshot provides a complete picture of the data state.

### Immutable Status Guarantee

Snapshots have an immutable status that cannot be changed.
Once a snapshot is created, it cannot be modified in any way.
No user role can alter snapshot content including administrators.
Snapshot records cannot be deleted by any user including super administrators.
The immutable guarantee applies to all snapshot data without exception.
Snapshots cannot be merged, split, or otherwise altered.
Immutability ensures data integrity for dispute resolution.
Immutable snapshots provide reliable historical records.

## InventoryRecord Error Scenarios

Each inventory record requires a quantity change and reason for the adjustment. Positive values indicate restocking, negative values indicate orders or adjustments. Stock quantity is calculated by summing all inventory records for that variant. Order placement automatically creates negative inventory records reducing stock. Order cancellation and refunds automatically create positive inventory records restoring stock. Sellers can manually add or subtract inventory with reason specification. Out of stock variants are shown to customers and cannot be added to cart. Inventory history is viewable by sellers for all their variants.

### Inventory Record Creation

Sellers can create inventory records for their product variants to track stock changes.

Each inventory record requires a quantity change and a reason for the adjustment. The quantity change can be positive or negative. Positive values indicate restocking or stock addition. Negative values indicate order fulfillment or stock adjustments.

The system calculates current stock by summing all inventory records for that variant. The current stock value is not stored directly but is computed from the inventory history.

Sellers can only create inventory records for variants of products they own. Attempting to create inventory records for other sellers' products is rejected.

### Manual Inventory Adjustment

Sellers can manually add inventory to restock their products.

When restocking, sellers must specify the quantity to add and provide a reason for the adjustment. Examples of valid reasons include "restock", "return", "damage adjustment", or "audit correction".

Sellers can manually subtract inventory for adjustments such as loss, damage, or inventory corrections.

When manually adjusting inventory, sellers must always provide a reason. Requests without a reason are rejected.

Each manual adjustment creates a separate inventory record with its own timestamp and reason. The inventory history shows all manual adjustments in chronological order.

### Automatic Inventory Deduction on Order

When a customer places an order, the system automatically creates inventory records for each variant in the order.

The system creates negative inventory records for the quantities ordered, reducing the available stock.

If the variant's current stock is insufficient for the order quantity, the order is rejected.

The automatic inventory deduction occurs at the time of order confirmation. Once the inventory record is created, the change is permanent and cannot be deleted.

### Automatic Inventory Restoration on Cancellation

When a seller approves a cancellation request for a paid item, the system automatically creates a positive inventory record to restore the stock.

The quantity restored equals the quantity that was cancelled from the order.

The system marks the cancellation with the reason for stock restoration.

The restored stock becomes available for future orders immediately after the cancellation is approved.

### Automatic Inventory Restoration on Refund

When a seller approves a refund request for a delivered item, the system automatically creates a positive inventory record to restore the stock.

The quantity restored equals the quantity that was refunded.

The system records the refund reason as part of the inventory record.

The restored stock becomes available for future orders immediately after the refund is approved.

### Stock Calculation and Zero Stock Prevention

The current stock quantity for each variant is calculated by summing all inventory records associated with that variant.

This calculation includes all positive and negative records, providing the net available stock.

When stock reaches zero, the variant is shown as "out of stock" to customers.

Customers cannot add out-of-stock variants to their shopping cart. Attempting to add an out-of-stock variant to the cart is rejected with an appropriate message.

### Seller Inventory History Viewing

Sellers can view the complete inventory history for each variant of their products.

The inventory history shows all inventory records in chronological order, including the timestamp, quantity change, reason, and cumulative stock after each record.

Sellers can see both manual adjustments and automatic deductions/restorations.

The inventory history is immutable and cannot be modified or deleted by any user.

### Cart Stock Validation

When customers view their shopping cart, the system checks the current stock for each variant against the cart quantity.

If the variant's stock is less than the cart quantity, a warning is displayed to the customer.

The warning indicates that some items may become unavailable if the stock is purchased by other customers before checkout.

Customers can proceed with checkout even when a warning is shown, but unavailable items will be blocked from checkout.

### Inventory Record Immutability

All inventory records are immutable and cannot be deleted or modified after creation.

This includes both manual adjustments and automatic records created during order placement, cancellations, or refunds.

If an inventory record was created in error, sellers can create a new adjustment record to correct the stock, but the original record remains in the history.

The immutability of inventory records ensures accurate audit trails for stock management.

## CancellationRequest Error Scenarios

Cancellation requests can only be made by customers for items with 'paid' status. Requests require a reason text describing the cancellation motivation. Sellers can approve or reject the cancellation request. Seller response creates a snapshot of the request state. Approved cancellations process refunds and restore inventory stock. Rejected cancellations leave the item in 'paid' status with no change. Once an item is shipped, customers cannot request cancellation. Partial order cancellation allows remaining items to continue normal processing.

### Cancellation Request Eligibility

Customers may request cancellation for individual order items with status paid. Cancellation requests are rejected for items that have already shipped. Items with status shipped, delivered, cancelled, or refunded cannot have new cancellation requests created. Only the customer who placed the original order may request cancellation for their order items. The cancellation must be requested at the item level, not for an entire order.

### Cancellation Reason Requirement

Every cancellation request must include a reason text field. The reason text describes the customer's motivation for the cancellation. Cancellation requests are rejected if the reason text is empty or contains only whitespace. The reason text is stored permanently and cannot be edited after submission. Customers can view the cancellation request including the reason text in their order history.

### Seller Approval and Rejection Process

When a customer submits a cancellation request, the request is assigned to the seller of the affected product variant. The seller may approve or reject the cancellation request. Seller approval must be confirmed by the seller explicitly. Seller rejection requires no additional justification but the request records the seller's decision. Once the seller responds, no other seller can modify the cancellation request. The customer can view the seller's decision but cannot change the request after seller response.

### Stock Restoration on Cancelled Items

When a cancellation request is approved, stock quantities for the variant are restored automatically. The restoration creates an inventory record with positive quantity change and reason cancellation. Stock restoration occurs immediately upon approval, before the customer receives a refund. Items with restored stock become available for purchase immediately. If the variant previously had zero stock, it becomes available after restoration.

### Rejection Status and State Preservation

When a seller rejects a cancellation request, the request is marked as rejected. The rejected cancellation request remains in the order history for audit purposes. A rejected request prevents the customer from submitting a new cancellation request for the same item. The item remains in paid status after rejection. The rejection decision is recorded permanently and cannot be reversed by any actor.

### Post-Shipment Cancellation Block

Customers cannot request cancellation for items with status shipped. If an item has entered the shipment process, the cancellation window is closed. Orders in transit must be handled through refund requests after delivery, not cancellation. Shipping creates a system state that locks the cancellation feature for that item. Customers who attempt to request cancellation for shipped items receive a rejection with explanation of shipping status.

### Partial Order Processing Continuation

Cancellation of one order item does not affect other items in the same order. When an item is cancelled, remaining items continue processing normally. The order status is recalculated based on remaining items. If all items in an order are cancelled, the entire order status becomes cancelled. If some items remain, the order status reflects the mixed state of the items. Shipment and delivery processes continue independently for non-cancelled items.

### Snapshot Creation on Seller Response

When a seller approves or rejects a cancellation request, a snapshot is created automatically. The snapshot records the request state at the moment of seller response. The snapshot captures when the response was made, who made it, and the response decision. The snapshot includes all request details and the state before and after the response. Snapshots are immutable and preserved for dispute resolution. Only the customer, seller, and administrators can view snapshots of cancellation requests.

### Refund Processing on Approved Cancellation

When a cancellation request is approved, the refund process initiates immediately. The refund amount equals the price paid for that specific item. The refund is processed to the original payment method used for the order. The refund amount includes any price overrides from the variant but excludes shipping costs. The customer receives confirmation when the refund is complete. The item status changes to cancelled after successful refund processing.

## RefundRequest Error Scenarios

Refund requests can only be submitted for items with 'delivered' status. Requests must be made within 7 days of the item's delivery date. Refund requests require a reason text explaining the refund motivation. Sellers approve or reject refund requests with snapshots of their decision. Approved refunds restore stock quantities through inventory records. Rejected requests leave the item in 'delivered' status unchanged. After 7 days from delivery, refund requests cannot be submitted. Refunded items are removed from the customer's active order list.

### Delivered Status Refund Eligibility

Customers can submit refund requests only for order items with delivered status.
Items with paid status cannot be refunded.
Items with shipped status cannot be refunded.
Items with cancelled status cannot be refunded.
Items with refunded status cannot have another refund request submitted.
Refund requests can only be submitted for items from orders placed by the requesting customer.

### 7-Day Delivery Window Restriction

Refund requests must be submitted within 7 days of the item's delivery date.
The 7-day window begins on the day the item status changes to delivered.
Requests submitted after 7 days from delivery are automatically rejected.
The delivery date is recorded when the customer confirms delivery or when the system auto-confirms delivery after 14 days from shipping.
Customers can view the 7-day window deadline on the refund request form for each item.

### Refund Reason Text Requirement

Every refund request must include a reason text explaining the refund motivation.
The reason text field is required and cannot be submitted empty.
Customers can provide up to 500 characters for the refund reason.
Reasons can include: product damaged, wrong item received, item not as described, change of mind, or other issues.
The reason text is visible to both the customer and the seller for dispute resolution.

### Approved Refund Stock Restoration

When a seller approves a refund request, the item status changes to refunded.
Approved refunds automatically create a positive inventory record to restore stock quantities.
The stock quantity is restored to what it was before the purchase.
Inventory records for refunded items are timestamped and linked to the refund request.
The inventory restoration is visible in the seller's inventory management page.

### Rejected Refund Status Preservation

When a seller rejects a refund request, the item status remains delivered.
Rejected requests leave all other item attributes unchanged.
The rejection is recorded with a reason for transparency.
The customer can view the rejection reason and resubmit a new refund request if applicable.
Rejected refund requests do not affect inventory or order totals.

### Post-Window Refund Block

After 7 days from delivery, the system blocks all new refund requests for that item.
The refund request button becomes unavailable on the item details page.
No refund request can be submitted for items past the 7-day window.
Past-window blocks persist even if the customer attempts manual submission.
Customers must contact seller directly for items beyond the 7-day window.

### Seller Response Snapshot Creation

Every seller response (approval or rejection) creates a snapshot of the refund request state.
The snapshot records the response timestamp, the seller's decision, and the reason provided.
Snapshots are immutable and cannot be deleted by any user.
Both customer and seller can view the response snapshot for dispute resolution.
Snapshots are preserved even after the refund request is completed.

### Delivered Item Refund Process

The delivered item refund process begins when the customer submits a refund request.
The request includes the item, the reason, and submission timestamp.
The seller receives notification and can approve or reject the request.
If approved, the refund is processed and stock is restored.
If rejected, the item remains in delivered status and no changes are made.
The entire process is visible in the order history.

### Refunded Item Order Removal

Refunded items are automatically removed from the customer's active order list.
The item remains visible in order history but marked as refunded.
Refunded items do not appear in the customer's active shipments.
The refund does not affect other items in the same order.
If all items in an order are refunded, the order status becomes refunded.

## Administrator Error Scenarios

Administrators can view all platform products, orders, customers, and sellers. Regular administrators cannot approve administrator requests; only super administrators can. Administrators can force-cancel or force-refund any order item with immediate effect. Administrators can suspend seller accounts, hiding products from search while allowing existing order processing. Unsuspended sellers have products immediately visible again. Administrators can ban customers preventing login access. Administrators can view snapshots of any product regardless of ownership. Product deletion by administrators removes products from all listings permanently.

### Administrator Grade Distinction

There are two administrator grades: regular administrator and super administrator.

Regular administrators cannot approve administrator requests. Only super administrators can approve requests from users who want to become administrators.

Regular administrators can view the list of pending administrator requests but cannot approve or reject them.

Super administrators have all the permissions of regular administrators plus the ability to manage administrator grades.

Super administrators can promote regular administrators to super administrator.

Super administrators can demote other super administrators to regular administrator.

Super administrators cannot demote themselves.

### Force-Cancel Order Item Authority

Administrators can force-cancel individual order items or entire orders.

When an order item is force-cancelled, the customer is immediately refunded.

Stock quantities are immediately restored for the cancelled order item.

The force-cancellation takes effect immediately without seller approval.

The order item status changes to cancelled immediately upon force-cancellation.

If all items in an order are force-cancelled, the entire order status becomes cancelled.

### Force-Refund Order Item Authority

Administrators can force-refund individual order items or entire orders.

When an order item is force-refunded, the customer receives a refund immediately.

Stock quantities are immediately restored for the refunded order item.

The force-refund takes effect immediately without waiting for seller response.

The order item status changes to refunded immediately upon force-refund.

If all items in an order are force-refunded, the entire order status becomes refunded.

### Seller Suspension Product Hiding

Administrators can suspend seller accounts.

When a seller is suspended, their products are hidden from search results.

When a seller is suspended, their products are hidden from category listings.

When a seller is suspended, their products cannot be purchased.

When a seller is suspended, they can still process existing orders.

When a seller is suspended, they can still ship items to customers.

When a seller is suspended, they can still respond to cancellation requests.

When a seller is suspended, they can still respond to refund requests.

When a seller is suspended, they cannot create new products.

When a seller is suspended, they cannot edit existing products.

### Seller Unsuspension Visibility Restore

Administrators can unsuspend suspended seller accounts.

When a seller is unsuspended, their products immediately become visible in search results.

When a seller is unsuspended, their products immediately become visible in category listings.

When a seller is unsuspended, their products immediately become purchasable.

Unsuspending takes effect immediately upon the administrator action.

### Customer Ban Login Prevention

Administrators can ban customer accounts.

When a customer is banned, they cannot log in to the platform.

Banned customers receive an authentication error when attempting to log in.

When a customer is banned, their existing orders remain accessible in their order history.

When a customer is banned, their existing reviews remain visible on products.

Administrators can unban previously banned customers.

When a customer is unbanned, they immediately regain the ability to log in.

### Product Snapshot Viewing Permission

Administrators can view snapshots of any product on the platform.

Product snapshot viewing is not limited to products owned by the administrator.

Administrators can view snapshots of products owned by other sellers.

Administrators can view snapshots of products owned by suspended sellers.

Administrators can view snapshots of products owned by deleted sellers.

Product snapshots include changes to product name, description, category, base price, images, and variants.

### Administrator Product Deletion Authority

Administrators can delete any product on the platform.

Product deletion is used for policy violations or other administrative reasons.

When a product is deleted by an administrator, it is removed from all listings.

When a product is deleted by an administrator, it no longer appears in search results.

When a product is deleted by an administrator, it no longer appears in category listings.

Product deletion is permanent.

Product snapshots are preserved even after product deletion by administrators.

## SuperAdministrator Error Scenarios

Super administrators can approve or reject administrator requests from any user. They can promote regular administrators to super administrator status. Super administrators can demote other super administrators but not themselves. They can view all pending seller approval requests and make approval decisions. Super administrators have full oversight access to all platform data and operations. They can ban sellers, preventing login while preserving existing order integrity. Demotion self-prevention protects administrative chain integrity. All promotion and demotion actions are logged with snapshots.

### Administrator Request Approval Power

Super administrators have exclusive authority to approve or reject requests from any user who wishes to become an administrator.

When a user submits a request to become an administrator, the request includes a reason describing why they should be granted administrative privileges.

Super administrators can view a list of all pending administrator requests on the platform.

The super administrator makes the final approval or rejection decision on each request.

When a request is approved, the user becomes a regular administrator.

When a request is rejected, the user retains their previous role (customer or seller).

Rejection reasons must be provided by the super administrator to explain the decision.

Approved administrator requests cannot be revoked through the same request mechanism.

Regular administrators cannot view or approve administrator requests from other users.

All administrator request decisions are recorded with timestamps.

Super administrators can view the historical list of all administrator requests.

A user who submits a new administrator request after rejection must provide a new reason.

The administrator request approval process is logged with complete audit trail.

Pending administrator requests remain in the system until a super administrator responds.

### Super Administrator Promotion Authority

Super administrators have the exclusive authority to promote regular administrators to super administrator status.

Only super administrators can perform promotions to super administrator grade.

Regular administrators cannot promote other administrators to any grade.

Promotion decisions are based on business requirements and administrative needs.

A promotion creates a permanent change to the administrator's grade level.

The promoted administrator gains all super administrator privileges upon approval.

The promotion process includes recording the promotion decision with timestamp.

Super administrators can view which administrators have been promoted.

Promoted administrators cannot demote themselves or other administrators without proper authorization.

The promotion authority is part of the core administrative chain management.

All promotions are recorded as part of the administrative history.

A regular administrator cannot promote another regular administrator.

Promotion decisions are final and require super administrator authorization.

### Super Administrator Demotion Authority

Super administrators have the exclusive authority to demote other super administrators to regular administrator status.

A demotion changes a super administrator's privileges back to regular administrator level.

Super administrators cannot demote themselves under any circumstances.

Self-demotion prevention is enforced by the system at the point of action initiation.

The self-demotion prevention rule protects against accidental privilege loss.

The self-demotion prevention rule maintains administrative chain integrity.

When attempting self-demotion, the system displays an error message explaining the restriction.

Only super administrators can perform demotions of other super administrators.

A demoted administrator loses all super administrator privileges immediately.

The demoted administrator retains regular administrator privileges.

Demotion decisions require deliberate action and super administrator authorization.

All demotion actions are recorded with complete audit trail.

The system prevents any automatic or system-initiated self-demotion.

Demotion authority is exclusively held by super administrators acting on other super administrators.

### Self-Demotion Prevention Rule

Super administrators cannot demote themselves under any circumstances.

The system enforces a hard restriction preventing self-demotion actions.

When a super administrator attempts to select themselves as the demotion target, the option is not available.

The system displays a clear error message explaining that self-demotion is not permitted.

This rule protects the administrative chain from integrity breaches.

The self-demotion prevention rule ensures there is always at least one super administrator available.

The rule prevents potential malicious or accidental loss of super administrator privileges.

This restriction applies to all self-demotion attempts regardless of method.

The system validates the target administrator against the initiating super administrator before processing.

If the target matches the initiator, the action is rejected.

The administrative chain integrity protection rule requires at least one super administrator always exists.

This prevention is enforced at the user interface level and the backend validation layer.

The rule cannot be bypassed through any technical workaround.

Self-demotion prevention is a fundamental security requirement for administrative operations.

### Seller Approval Oversight Access

Super administrators have full visibility access to view all pending seller approval requests.

Super administrators can see the complete list of sellers awaiting administrator review.

Each pending seller request displays the seller's registration information.

Super administrators can view the submission date and status of each request.

Pending seller approval requests are accessible from the administrative dashboard.

Super administrators can filter the view to show only specific seller approval statuses.

The seller approval oversight access applies to all sellers regardless of their registration source.

Super administrators can review the details of any pending seller request.

This visibility extends to requests from all regions and categories.

Super administrators can take action on any pending request without restriction.

The seller approval oversight access is exclusive to super administrators.

Regular administrators cannot view seller approval requests directly.

All seller approval request statuses are visible to super administrators.

Super administrators can export the list of pending seller requests for review.

The seller oversight feature provides complete transparency of the seller onboarding process.

### Full Platform Data Visibility

Super administrators have full platform data visibility across all entities and operations.

Super administrators can view all orders regardless of owner or status.

Super administrators can view all customer accounts and their activity.

Super administrators can view all seller accounts and their product listings.

Super administrators can view all products on the platform including deleted products.

Super administrators can view all snapshots regardless of ownership.

Super administrators can view all administrative actions performed on the platform.

Super administrators can view inventory records for all product variants.

Super administrators can view all cancellation and refund requests across all orders.

Super administrators can view all shipment information for all orders.

Super administrators can view all reviews and their associated data.

Super administrators can view all category structures and modifications.

Super administrators can view all wishlists across all customers.

This full platform data visibility is comprehensive and unrestricted.

Super administrators can access any data point without owner permission.

The full platform data visibility enables complete administrative oversight.

### Seller Ban Authority

Super administrators have the authority to ban sellers from the platform.

When a seller is banned, they immediately cannot log in to their seller account.

Banned sellers cannot create new products while banned.

Banned sellers cannot edit existing products while banned.

Banned sellers retain access to process existing orders.

Banned sellers can still ship items from pending orders.

Banned sellers can still respond to cancellation requests for existing orders.

Banned sellers can still respond to refund requests for existing orders.

The ban action is visible to the seller with a reason provided.

Banned sellers can view their order history and associated data.

The ban authority applies to all sellers regardless of their approval status.

Super administrators can unban sellers to restore full seller privileges.

When unbanned, the seller can immediately resume normal operations.

The seller ban authority is part of seller management oversight.

Banned seller actions are logged with complete audit trail.

The ban status persists until the super administrator explicitly unbans the seller.

Banned sellers cannot access any seller features during the ban period.

### Promotion Demotion Snapshot Logging

All promotion actions create a snapshot recording the promotion decision.

Promotion snapshots include the promoting super administrator identifier.

Promotion snapshots include the timestamp of the promotion action.

Promotion snapshots include the previous and new administrator grade levels.

Promotion snapshots are immutable once created.

Promotion snapshots cannot be deleted or modified.

All demotion actions create a snapshot recording the demotion decision.

Demotion snapshots include the demoting super administrator identifier.

Demotion snapshots include the timestamp of the demotion action.

Demotion snapshots include the previous and new administrator grade levels.

Demotion snapshots are immutable once created.

Demotion snapshots cannot be deleted or modified.

All administrator request approvals create a snapshot recording the decision.

Administrator request snapshots include the super administrator who approved.

Administrator request snapshots include the timestamp of the decision.

Administrator request snapshots include the approval or rejection status.

All administrative actions are logged with complete promotion demotion snapshot logging.

The promotion demotion snapshot logging provides a complete audit trail.

All grade changes are permanently recorded in the system.

### Administrative Chain Integrity Protection

The self-demotion prevention rule is designed to protect the administrative chain from integrity breaches.

This rule ensures there is always at least one super administrator available to manage the system.

Without this protection, a super administrator could accidentally demote themselves leaving no one with full privileges.

The administrative chain integrity protection rule is a core security requirement.

The rule prevents scenarios where all super administrators are demoted simultaneously.

The rule protects against potential malicious attempts to disrupt administrative oversight.

The rule ensures continuity of critical platform management functions.

Without administrative chain integrity protection, platform operations could become unmanageable.

The rule is enforced automatically by the system without manual intervention.

Administrative chain integrity protection is critical for platform governance.

The rule applies to all administrator grade changes involving super administrators.

This protection maintains trust in the administrative system structure.

The administrative chain integrity protection rule cannot be overridden by any user.

The rule is a fundamental safeguard for platform stability.

## SellerApprovalRequest Error Scenarios

Any user can submit a request to become a seller with email and password credentials. Sellers can view their approval status at all times: pending, approved, or rejected. Rejected requests include a specific reason text explaining the rejection. Rejected sellers may submit a new registration request at any time. Administrators approve or reject seller registration requests with required reasons. Approved sellers can immediately begin selling and managing products. Pending sellers cannot sell or create products until approval is granted. Each status change creates a snapshot for audit purposes.

### Seller Registration Submission Process

Any user can submit a request to become a seller on the platform.

The registration submission includes email address and password credentials.
A seller cannot create products or view the seller dashboard before approval is granted.
The system records the submission timestamp for the approval request.
Once submitted, the seller's account enters a pending approval state.
Pending sellers cannot perform any selling-related operations.
The seller can view their approval status at any time while waiting.
If the approval request is rejected, the seller receives a reason text explaining why.
The seller can submit a new registration request after rejection.
Each submission creates a new approval request record that is separate from previous attempts.

### Approval Status Viewing Permission

Sellers can view their approval status at any time after registration.

The available status values are: pending, approved, and rejected.
The status is displayed on the seller account dashboard.
Approval status does not expire.
The status remains pending until an administrator makes a decision.
Pending sellers can check their status as frequently as needed.
Approved sellers can immediately access seller features.
Rejected sellers can view the reason for rejection alongside their status.
Administrators can view all pending approval requests in their management dashboard.
The approval status is part of the seller profile and cannot be changed by the seller.

### Rejection Reason Requirement

When rejecting a seller's registration, administrators must provide a specific reason.

The rejection reason is a required text field with no minimum length.
The reason is stored permanently in the approval request record.
The rejection reason is visible to the seller immediately after rejection.
The reason can reference policy violations, incomplete information, or other legitimate grounds.
Administrators cannot reject a registration without providing a reason.
The rejection reason is stored as part of the request snapshot.
Rejected sellers can view the exact reason text submitted by the administrator.
The reason cannot be modified after the rejection decision is made.

### Rejection Reason Specification

Administrators can view rejection history for each seller account.
Rejection reasons are documented for audit and dispute resolution.
The system preserves all rejection reasons even if the seller resubmits.
Rejection reasons are shown in the seller's approval history view.
Administrators must write a reason text for each rejection decision.

### Rejected Seller Resubmission Right

Sellers whose registration was rejected may submit a new registration request.

The resubmission creates a new approval request record.
The new request is independent of the previous rejected request.
Rejected sellers can modify their profile before resubmitting.
The resubmission process is identical to the initial registration.
No waiting period exists between rejection and resubmission.
Previous rejection reasons remain visible in the approval history.
The new request receives a new approval timeline for administrator review.

### New Registration After Rejection

Sellers can resubmit multiple times if necessary.
Each resubmission is treated as a fresh approval request.
The seller's account remains active between resubmissions.
Previous approval request records are preserved for audit purposes.
The seller can view all past approval requests and their outcomes in their dashboard.

### Admin Approval Decision Requirement

Administrators approve or reject seller registration requests.

Approval decisions must be made by administrators with seller management permissions.
The approval action requires a decision state: approve or reject.
Upon approval, the seller's status changes from pending to approved.
Upon rejection, the seller's status changes to rejected.
Administrators cannot approve or reject their own registration requests.
The decision is immediate and takes effect right away.
Approved sellers can immediately access the seller dashboard.
Rejected sellers remain in pending state until they resubmit.

### Administrator Approval Decision

Administrators can view the full approval request details before making a decision.
The decision is logged with the administrator's identity.
The approval decision creates a snapshot of the request state.
Administrators can view the approval history for each seller.
The approval decision cannot be undone without creating a new request.

### Pending Seller Sales Restriction

Sellers with pending approval status cannot engage in any selling activities.

Pending sellers cannot create products.
Pending sellers cannot view the seller dashboard.
Pending sellers cannot access order management features.
Pending sellers cannot respond to cancellation or refund requests.
Pending sellers cannot ship any order items.
Pending sellers cannot manage their shop profile.
Pending sellers cannot upload product images.
Pending sellers cannot add product variants.
Pending sellers cannot adjust inventory levels.

### Pending Seller Sales Restriction

The restriction remains in place until approval is granted.
Pending sellers can view their profile but cannot modify it for public display.
Pending sellers can update their email and password credentials.
The system enforces these restrictions automatically at the account level.
Pending sellers receive no selling capabilities regardless of login attempts.

### Status Change Snapshot Creation

Every change to a seller approval request status creates a snapshot.

Snapshots record the approval status before and after the change.
The snapshot includes the timestamp of the status change.
The snapshot includes the administrator's identity who made the decision.
The snapshot captures the rejection reason if the status changed to rejected.
The snapshot is immutable and cannot be modified.
Snapshots are preserved even if the seller resubmits.
Administrators can view snapshots of approval requests.

### Status Change Snapshot Creation

Each approval request maintains its own snapshot history.
Snapshots provide audit trail for dispute resolution.
The snapshot includes the full state of the approval request at the time of change.
Snapshots are accessible to relevant parties for verification.
The snapshot preservation supports legal and compliance requirements.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### Complete Shopping Journey

A customer discovers products through search or category browsing. The customer views a product detail page showing all available variants with prices and stock status. The customer selects a specific variant and adds it to their cart, specifying the desired quantity.

### Cart Management Journey

A customer can view their cart showing each item with product name, variant options, price, quantity, and subtotal. The cart displays the total price of all items.

The customer can change the quantity of items in their cart. If the same variant already exists in the cart, the quantity is updated rather than creating a duplicate line item. If the variant's stock is less than the cart quantity, a warning is shown to the customer.

The customer can remove items from their cart at any time before checkout. If a variant is deleted by the seller or becomes out of stock, it is marked as unavailable in the cart. Unavailable items cannot be checked out and must be removed before proceeding to checkout.

### Checkout and Payment Journey

When ready to checkout, the customer proceeds from the cart to checkout. The customer must select a shipping address from their saved addresses or create a new address for this order. The customer reviews the order summary showing all items with prices, the selected shipping address, and the total price.

The customer confirms and places the order. Payment is processed through an external payment gateway. If payment fails, the order is not created and the customer can retry the payment. If payment succeeds, the order is created successfully.

When the order is created, stock quantities are decreased for each purchased variant, and the purchased items are removed from the customer's cart. A snapshot of each purchased product, variant, and seller profile is saved with the order item. The customer receives an order confirmation and can view the order in their order history.

### Seller Order Fulfillment Journey

The seller receives the order and views the order items for their products that need shipping. The seller selects one or more items to include in a shipment and enters tracking information including carrier name and tracking number. All items in the same shipment share the same tracking information.

The shipment is created and all items in it change to shipped status. The customer can view the tracking information for each shipment. The customer confirms delivery for the shipment, or delivery is automatically confirmed after 14 days from shipping. When delivery is confirmed, all items in that shipment change to delivered status. Once an item status is delivered, the customer can write a review for the product.

### Order Cancellation Journey

A customer can request cancellation for individual order items with status "paid" (not yet shipped). The customer selects the item they want to cancel and provides a reason text for the cancellation request.

The seller of that item receives the cancellation request and can approve or reject it. When the seller responds, a snapshot of the request state is created and preserved.

If the seller approves the cancellation, the item is cancelled and a refund is processed for that item only. The cancelled item restores its stock quantity through an inventory record. The remaining items in the order continue processing normally.

If the seller rejects the cancellation, the cancellation request status is updated and the item continues with normal order processing.

If all items in an order are cancelled, the entire order status becomes "cancelled".

### Refund Request Journey

A customer can request a refund for individual items with status "delivered". The refund request can only be made within 7 days of that item being delivered. The customer provides a reason text for the refund request.

The seller of that item can approve or reject the refund request. When the seller responds, a snapshot of the request state is created and preserved.

If the seller approves the refund, the item is refunded and the stock quantity is restored through an inventory record. The remaining items in the order are unaffected.

If the seller rejects the refund, the refund request status is updated and the item remains in delivered status.

If all items in an order are refunded, the entire order status becomes "refunded".

### Product Review Journey

After an order item status becomes "delivered", the customer can write a review for the product.

A customer can write one review per product per order. The customer provides a rating from 1 to 5 stars (required) and optional text content.

The review is displayed on the product detail page along with other reviews. Reviews are sorted by newest first.

The customer can edit their own review. Every edit creates a snapshot of the review state.

The customer can delete their own review, but snapshots are preserved for dispute resolution.

The product's average rating is calculated from all non-deleted reviews.

### Account Management Journey

A customer can update their profile information including display name and phone number. Each edit creates a snapshot of the previous state.

A customer can manage multiple shipping addresses. For each address, the customer enters recipient name, phone number, street address, city, state/province, postal code, and country. The customer can edit or delete their addresses.

The customer can set one address as the default shipping address for checkout.

A customer can change their password by providing their current password and a new password.

A customer can delete their account. When a customer deletes their account, their profile information is deleted but their orders and order history are preserved for seller records and legal purposes. Their reviews are preserved but shown as "deleted user".

A seller can update their shop profile including shop name, shop description, and logo image. Each edit creates a snapshot of the previous state.

A seller can change their password by providing their current password and a new password.

A seller can delete their account only if they have no pending orders (paid or shipped status) and no pending cancellation or refund requests. When a seller deletes their account, their products are deleted from listings but order history and snapshots are preserved. Their shop name in past orders is preserved.

# External Integrations

Third-party API contracts, webhook handlers, and integration specifications.

## Integration Contracts

Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.

### Payment Gateway Integration

The system integrates with an external payment gateway to process customer payments during checkout.

When a customer confirms and places an order, the system sends the order total amount and order details to the payment gateway for processing.

The payment gateway responds with a success or failure status.

If payment succeeds, the order is created, inventory is deducted, and the customer receives order confirmation.

If payment fails, no order is created and the customer may retry with the same or different payment method.

The system does not store payment card details; all sensitive payment data is handled by the external payment gateway.

# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### Product Image Upload

Sellers can upload multiple images for each product they create.

When creating a product, sellers must provide at least one product image.
Additional images can be added after the initial upload.

Each uploaded image is stored as a media file with a unique identifier.
The first image uploaded becomes the main product image, which is displayed as the thumbnail in search results and category listings.

### Product Image Management

Sellers can reorder their product images by dragging to change the display order.
Reordering updates which image is shown as the main/thumbnail image.

Sellers can delete any image from their product except when it is the only image remaining.
At least one image must remain associated with each product.

Image changes are recorded in product snapshots.
When a product is edited, all images at that moment are captured in the snapshot.

### Seller Profile Image Upload

Sellers can upload a logo image for their shop profile.
The logo image is displayed on the seller profile page and on product listings.

Sellers can update their logo image at any time by uploading a new image.
The previous logo is replaced by the new image.

Image changes are recorded in seller profile snapshots.
When a seller profile is edited, the current logo at that moment is captured in the snapshot.

### Image Snapshots

All product images are included in product snapshots when the product is edited.
The snapshot preserves the complete set of images as they existed at the time of modification.

Snapshots are immutable and cannot be deleted.
Snapshots can be viewed by the product owner and administrators for dispute resolution.

Product snapshots capture the main image and all additional images with their display order.
When a product is deleted, its snapshots remain accessible to administrators.

### Media Storage

All uploaded images are stored in secure media storage with access control.
Only authorized users can access media files based on their role and ownership.

Sellers can access images for products they own.
Customers can view public images on product detail pages and seller profiles.
Administrators can access all media files for oversight purposes.

Media files are preserved in snapshots even after the original image is deleted.
Deleted images may be removed from public access but snapshots retain references for historical record.