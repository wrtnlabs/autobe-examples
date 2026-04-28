**ecommercePlatform — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must provide a valid email address and password to register for either a customer or seller account. Login requires the same email and password credentials used during registration. The system checks for duplicate email addresses to prevent multiple accounts with the same email. Users can update their password at any time by providing their current password and a new one. Account deletion removes active access credentials while preserving historical order data for legal purposes. Deleted customer accounts display as deleted user for preserved reviews. Both customers and sellers can request account deletion.

### Registration Email and Password Validation

WHEN a person registers for a customer or seller account, THE system SHALL require a valid email address and password.

WHEN a registration request contains an email address that does not follow a valid email format, THE system SHALL reject the registration.

WHEN a registration request contains an email address already associated with an existing customer or seller account, THE system SHALL reject the registration.

### Login Credentials Validation

WHEN a user attempts to log in, THE system SHALL require the email address and password used during registration and SHALL reject the login if credentials do not match any registered account.

WHEN a banned user attempts to log in, THE system SHALL reject the login.

### Password Change Constraints

WHEN a user changes their password, THE system SHALL require both the current password and a new password.

WHEN a password change request provides an incorrect current password, THE system SHALL reject the request.

WHEN a password change request does not include a new password, THE system SHALL reject the request.

The new password must differ from the current password. Submitting the same password as the new password shall be rejected.

### Customer Account Deletion and History Preservation

WHEN a customer deletes their account, THE system SHALL remove the customer's profile information and active access credentials.

Order records and order history are preserved for customers who delete their accounts, for seller records and legal purposes.

Reviews written by customers who delete their accounts are preserved and displayed as deleted user.

### Seller Account Deletion Constraints

WHEN a seller requests account deletion, THE system SHALL check whether the seller has any pending order items with paid or shipped status.

IF a seller has pending order items with paid or shipped status, THEN THE system SHALL reject the account deletion request.

WHEN a seller requests account deletion, THE system SHALL check whether the seller has any pending cancellation or refund requests.

IF a seller has pending cancellation or refund requests, THEN THE system SHALL reject the account deletion request.

WHEN a seller's account deletion is approved, THE system SHALL remove all of the seller's products from listings.

Order history, order item snapshots, and the shop name in past orders are preserved when a seller deletes their account.

Account deletion is permanent. Once processed, the deletion cannot be undone and the account cannot be recovered.

## CustomerProfile Rules

Customer profiles require a display name for identification on the platform. Phone number is optional and can be provided with the display name. Display names cannot be empty when creating or editing the profile. Editing customer profile information updates the current display name and phone number immediately. The system preserves the original profile structure when updating fields. Customers can modify their profile information anytime after registration. Deleted customers retain their profile data for historical reference.

### Display Name Requirement Validation

WHEN a customer creates a profile, THE system SHALL require a display name that is not empty.

WHEN a customer edits their profile, THE system SHALL require the display name to remain non-empty.

IF a customer submits a profile update with an empty display name, THEN THE system SHALL reject the update.

THE customer display name SHALL serve as the mandatory identification attribute for all customer profiles.

### Phone Number Optional Constraints

WHERE a customer profile is created or updated, THE system SHALL treat the phone number as optional.

IF a customer does not provide a phone number, THE system SHALL NOT reject the profile creation or update.

WHEN a customer profile is validated, THE system SHALL accept missing phone numbers without requiring completion.

### Profile Editing and Update Behavior

WHEN a customer modifies profile information after registration, THE system SHALL apply valid updates immediately.

WHEN a customer edits the display name or phone number, THE system SHALL preserve the existing profile structure.

WHERE a customer profile update is applied, THE system SHALL update the current display name and phone number without removing the profile association.

Customers SHALL be able to edit their display name and phone number throughout their registration lifecycle.

## ShippingAddress Rules

Customers can maintain multiple shipping addresses for convenient checkout. Each address requires recipient name, phone number, street address, city, state or province, postal code, and country. Customers can edit the fields of their existing addresses with new information. Customers can delete their addresses from their address book. Only one address can be designated as the default shipping address for the customer. Setting a new default automatically removes the default status from the previously selected address. The default address information is used during checkout process.

### Shipping Address Field Validation

WHEN a customer creates a shipping address, THE system SHALL require recipient name.
WHEN a customer creates a shipping address, THE system SHALL require phone number.
WHEN a customer creates a shipping address, THE system SHALL require street address.
WHEN a customer creates a shipping address, THE system SHALL require city.
WHEN a customer creates a shipping address, THE system SHALL require state or province.
WHEN a customer creates a shipping address, THE system SHALL require postal code.
WHEN a customer creates a shipping address, THE system SHALL require country.
IF any required field is missing during address creation, THEN THE system SHALL reject the address.

### Multiple Shipping Addresses

THE system SHALL allow customers to maintain multiple shipping addresses.
THE system SHALL associate each shipping address with the customer who created it.

### Default Address Constraint

THE system SHALL allow customers to designate one shipping address as the default shipping address.
WHEN a customer sets a new default address, THE system SHALL remove the default status from the previously designated default address.

### Address Editing Validation

WHEN a customer edits their address, THE system SHALL require all fields (recipient name, phone number, street address, city, state or province, postal code, and country) to remain populated.
IF any required field is left empty during address editing, THEN THE system SHALL reject the edit.

### Address Deletion

THE system SHALL allow customers to delete their shipping addresses.
THE system SHALL allow customers to delete their default shipping address even when it is designated as the default.
WHEN a shipping address is deleted, THE system SHALL permanently remove it from the customer's address book.

## SellerProfile Rules

Seller profiles contain a shop name, shop description, and logo image for display. Shop name is required when creating a seller profile. Editing any profile field including shop name, description, or logo immediately updates the displayed information. Every modification to the seller profile creates a snapshot preserving the previous state. Customers can access seller profiles to view shop information. Profile updates occur simultaneously across all platform areas displaying seller information. Snapshots are created for every edit to track profile changes.

### Shop Name Requirement

WHEN a seller creates or updates their profile, THE system SHALL require the shop name to be provided. IF a seller submits a profile update with no shop name, THEN THE system SHALL reject the update and display an error indicating the shop name is required. THE shop name SHALL not be empty or contain only whitespace characters.

### Editable Profile Fields

THE system SHALL allow sellers to edit the following profile fields: shop name, shop description, and logo image. THE system SHALL restrict sellers from editing fields outside this set. THE shop description and logo image SHALL be optional fields, with no minimum content requirement for the description and no mandatory upload for the logo.

### Snapshot Creation on Profile Edit

WHEN a seller edits any field in their profile, THE system SHALL automatically create a snapshot of the previous state. THE snapshot SHALL record the timestamp of the change, the entity type and identifier, the values before the change, and the values after the change. THE system SHALL create snapshots for edits to shop name, shop description, and logo image individually or in combination. Snapshots of seller profiles SHALL be immutable and cannot be deleted by sellers or administrators.

### Profile Visibility Rules

THE system SHALL allow customers to view the seller profile including shop name, shop description, and logo image. THE system SHALL display the current versions of all profile fields to customers. IF a seller is suspended by an administrator, THE system SHALL still allow customers to view the seller profile. THE system SHALL not display seller-specific internal status fields (such as approval status or rejection reason) to customers.

### Profile Update Propagation

WHEN a seller profile is updated, THE system SHALL reflect the new profile information across all platform areas where the seller profile is displayed. THE updated shop name SHALL appear in search results, category listings, product detail pages, and order history where the seller is referenced. THE updated logo image SHALL display immediately in all locations showing the shop logo. Profile updates SHALL propagate simultaneously without requiring a separate refresh or sync action by administrators or system operators.

## Category Rules

Categories organize products through a hierarchical structure with one level of nesting. Each category requires a name for identification and description for context. Categories can have subcategories but no deeper nesting beyond one level is allowed. Administrators control category creation, modification, and deletion. Customers can browse the list of all available categories. Deleting a category leaves products within it as uncategorized. Products remain accessible through search even when uncategorized.

### Category Name and Description Validation

Categories must have unique names and non-empty descriptions to maintain platform organization.

WHEN administrators create a category, THE system SHALL require both a name and a description to be provided.

IF a category name is blank or contains only whitespace, THE system SHALL reject the creation request.

IF a category description is blank or contains only whitespace, THE system SHALL reject the creation request.

IF a proposed category name already exists within the same parent category, THE system SHALL reject the creation request to prevent duplicate categories.

WHEN administrators edit an existing category name, THE system SHALL check that the new name does not conflict with other categories under the same parent.

WHEN administrators edit an existing category description, THE system SHALL require the new description to be non-empty.

Category names must be unique siblings — two categories can share the same name only if they belong to different parent categories.

### One-Level Nesting Constraint

The category hierarchy is limited to two levels: top-level categories and their immediate subcategories. DEEPER NESTING IS PROHIBITED.

THE system SHALL enforce the domain logic that categories exist at only two depth levels: parent categories and subcategories.

WHEN administrators create a parent category, THE system SHALL treat it as a top-level category without a parent.

WHEN administrators create a subcategory, THE system SHALL allow linking it to a top-level parent category only.

IF administrators attempt to create a category nested under an existing subcategory, THE system SHALL reject the request and return an error indicating the nesting limit has been reached.

THE system SHALL prevent any category from having a subcategory as its parent. Only top-level categories can serve as parent categories.

### administrator Managed Business Rules

Only administrators may manage categories on the platform to ensure consistent product organization.

THE system SHALL apply the business rule that category creation, modification, and deletion are restricted to administrator accounts.

IF customers or sellers attempt to create categories, THE system SHALL reject the request.

IF customers or sellers attempt to edit category names or descriptions, THE system SHALL reject the request.

IF customers or sellers attempt to delete categories, THE system SHALL reject the request.

THE system SHALL prevent non-administrator accounts from accessing any category management operations.

### Product Categorization Domain Logic

Products must be assigned to valid categories to enable browsing and categorization.

WHEN sellers create a product, THE system SHALL require the product to be associated with an existing category or subcategory.

IF a seller attempts to assign a product to a deleted category, THE system SHALL reject the product creation or update.

Products assigned to subcategories are also considered part of their parent category for browsing purposes.

THE system SHALL allow products to be assigned to either top-level categories or subcategories.

A product can belong to only one category at a time, whether that category is a parent or subcategory.

### Uncategorized Product Handling

When categories are deleted, affected products retain their data but lose their category association.

WHEN an administrator deletes a category, THE system SHALL reassign all products previously in that category to an uncategorized state.

THE system SHALL preserve all product data even when their associated category is deleted.

Uncategorized products remain visible in search results and do not disappear from the platform.

WHEN customers browse products, THE system SHALL display uncategorized products alongside normally categorized products.

Products assigned to subcategories also become uncategorized when their parent category is deleted.

THE system SHALL prevent administrators from deleting a category that contains subcategories without first handling the subcategory hierarchy.

### Category Browsing Validation

Customers browsing categories see only available, active categories.

WHEN customers browse the category list, THE system SHALL display only active categories that have not been deleted.

IF a category is deleted, THE system SHALL exclude it from all browsing lists.

THE system SHALL allow customers to view products within any accessible category.

When browsing subcategories, THE system SHALL include all subcategories belonging to the selected parent category.

IF a subcategory is deleted, THE system SHALL remove it from the parent category's subcategory listing.

Deleted categories MUST NOT appear in dropdown category selectors or filter options during product search.

## Product Rules

Products require a name, description, category selection, and base price for creation. Name and description are required fields that cannot be empty. Category selection is required and can include a subcategory. Base price establishes the default price for the product. Products belong to the seller who created them and cannot be transferred. Sellers can edit their own products with updated information. Product deletion requires no pending order items and no pending cancellation or refund requests for any variant. Deleted products remove from search results and category listings. Deleting a product also deletes all its variants and inventory records. Every product edit creates a snapshot preserving the previous state.

### Required Product Creation Fields

WHEN a seller creates a product, THE platform SHALL require the product name. IF the product name is empty, THEN THE platform SHALL reject the product creation.

WHEN a seller creates a product, THE platform SHALL require the product description. IF the product description is empty, THEN THE platform SHALL reject the product creation.

WHEN a seller creates a product, THE platform SHALL require a category selection. IF no category is selected, THEN THE platform SHALL reject the product creation.

WHEN a seller selects a category, THE platform SHALL allow the selection of a top-level category or a subcategory.

WHEN a seller creates a product, THE platform SHALL require the base price. IF the base price is missing, THEN THE platform SHALL reject the product creation.

### Seller Ownership and Transfer Constraints

WHEN a product is created, THE platform SHALL exclusively associate the product with the creating seller.

WHEN a seller attempts to transfer a product to another seller, THEN THE platform SHALL reject the transfer request.

WHEN a seller edits a product, THE platform SHALL verify the seller is the product owner.

WHEN a seller deletes a product, THE platform SHALL verify the seller is the product owner.

### Snapshot on Every Edit

WHEN a seller edits any field of an existing product, THE platform SHALL create a snapshot of the previous state before applying the changes.

WHEN a product snapshot is created, THE platform SHALL include the complete product state and all variant states at the time of edit.

WHEN a product snapshot is created, THE platform SHALL make the snapshot immutable.

WHEN a user attempts to delete a product snapshot, THEN THE platform SHALL reject the deletion request.

### Product Deletion Domain Rules

WHEN a seller requests product deletion, THE platform SHALL verify no order items with paid or shipped status exist for any variant. IF paid or shipped order items exist, THEN THE platform SHALL reject the deletion request.

WHEN a seller requests product deletion, THE platform SHALL verify no pending cancellation requests exist for any variant. IF pending cancellation requests exist, THEN THE platform SHALL reject the deletion request.

WHEN a seller requests product deletion, THE platform SHALL verify no pending refund requests exist for any variant. IF pending refund requests exist, THEN THE platform SHALL reject the deletion request.

WHEN a product is successfully deleted, THE platform SHALL delete all variants associated with the product.

WHEN a product is successfully deleted, THE platform SHALL delete all inventory records associated with the product variants.

WHEN a product is successfully deleted, THE platform SHALL remove the product from search results and category listings.

## ProductVariant Rules

Product variants represent specific option combinations like color and size for each product. SKU code is a required unique identifier that distinguishes each variant. Option values define the specific characteristics of the variant such as color red and size large. Stock quantity is required and starts at zero when created. Sellers can add variants to their products with option values and pricing. Variant deletion requires no pending order items and no pending cancellation or refund requests for that variant. Every variant edit creates a snapshot preserving the previous state. Products with no variants show as unavailable for purchase.

### SKU Code and Option Value Constraints

WHEN a seller creates a new product variant, THE system SHALL assign a unique SKU code to distinguish it from other variants.

WHEN a seller edits a variant, THE system SHALL validate that the SKU code is unique among all other variants of the same product.

IF a seller attempts to save a variant with a SKU code that matches an existing variant under the same product, THEN THE system SHALL reject the request.

THE system SHALL treat each variant as a distinct combination of option values such as color and size.

WHEN a variant's option values are edited, THE system SHALL create a snapshot preserving the previous state.

WHEN the option values of a variant are changed, THE system SHALL verify the new combination does not duplicate an existing variant's option values under the same product.

### Stock Quantity Rules

WHEN a new product variant is created, THE system SHALL initialize the stock quantity to zero.

THE system SHALL require a stock quantity for every variant at all times.

WHEN a variant's stock quantity reaches zero, THE system SHALL mark the variant as out of stock.

IF a variant is marked as out of stock, THEN THE system SHALL prevent customers from adding the variant to their cart.

IF customers add a variant to their cart and the stock quantity subsequently falls below the cart quantity, THEN THE system SHALL display a warning to the customer.

### Variant Snapshot Rules

WHEN a seller edits a variant, THE system SHALL create a snapshot recording the previous state.

THE system SHALL include all variant fields such as SKU code, option values, and price in the snapshot.

Snapshots of variants SHALL be preserved even after the variant is deleted.

Sellers SHALL be able to view snapshots of their own variants.

Administrators SHALL be able to view snapshots of any variant.

### Variant Deletion Constraints

IF a seller attempts to delete a variant that has order items with paid or shipped status, THEN THE system SHALL reject the deletion request.

IF a seller attempts to delete a variant that has pending cancellation requests, THEN THE system SHALL reject the deletion request.

IF a seller attempts to delete a variant that has pending refund requests, THEN THE system SHALL reject the deletion request.

THE system SHALL allow variant deletion only when no pending order items, cancellation requests, or refund requests exist for that variant.

WHEN a variant is successfully deleted, THE system SHALL continue to preserve all associated snapshots.

### Product Availability and Variant Requirement

IF a product has no variants, THEN THE system SHALL display the product as unavailable for purchase.

THE system SHALL continue to show products without variants in search results and category listings, but mark them as unavailable.

Products with at least one variant are required to be purchasable.

## ProductImage Rules

Products support multiple images for comprehensive visual representation. First image serves as the main thumbnail displayed in listings and search results. Images can be reordered to control the sequence displayed on product detail pages. Reordering changes which image appears first as the thumbnail. Image deletion removes the image from the product's image collection. Image changes including reordering and deletion are included in product snapshots. Sellers can delete images from their products after uploading.

### ### Product Image Display Rules

THE system SHALL support multiple product images for each product to provide comprehensive visual representation.

THE system SHALL require each product image to have a sort order value to determine display sequence.

THE system SHALL designate the image with the lowest sort order as the main thumbnail image for the product.

WHERE multiple product images exist, THE system SHALL display the main thumbnail image in search results, category listings, and product lists.

### ### Product Image Reordering Rules

THE system SHALL allow product images to be reordered by updating their sort order values.

WHEN product images are reordered, THE system SHALL update the main thumbnail designation to the image with the new lowest sort order.

THE system SHALL display product images on the product detail page in the order determined by sort order values.

### ### Product Image Deletion Rules

WHEN a product image is deleted, THE system SHALL remove the image from the product's image collection.

IF the deleted image was the main thumbnail, THEN THE system SHALL reassign main thumbnail designation to the image with the new lowest sort order.

IF no images remain after deletion, THEN THE system SHALL mark the product as having no images available.

### ### Product Image in Product Snapshots

WHEN product images are added, reordered, or deleted, THE system SHALL capture the change in a product snapshot.

THE product snapshot SHALL preserve the complete image collection state including all image URLs, sort orders, and the main thumbnail designation at the time of change.

THE system SHALL include image changes alongside other product field modifications within the same snapshot when edits occur simultaneously.

## InventoryRecord Rules

Inventory records track stock changes for each product variant. Quantity change values are positive for restocking or negative for orders and adjustments. Reason field documents why the change occurred for audit purposes. Current stock is calculated by summing all inventory records for each variant. Sellers can add inventory through restocking with documented reasons. Sellers can subtract inventory for adjustment or loss with documented reasons. Order placement creates negative inventory records automatically. Order cancellation or refund creates positive inventory records automatically. Sellers can view the full inventory history of each variant.

### Quantity Change Rules

WHEN an inventory record is created, THE system SHALL ensure the quantity change value is non-zero.

WHEN a seller manually adds inventory (restocking), THE system SHALL record a positive quantity change.

WHEN a seller manually subtracts inventory (adjustment or loss), THE system SHALL record a negative quantity change.

WHEN an order is placed successfully, THE system SHALL automatically create an inventory record with a negative quantity change equal to the quantity purchased.

WHEN an order item is cancelled, THE system SHALL automatically create an inventory record with a positive quantity change restoring the cancelled quantity.

WHEN an order item is refunded, THE system SHALL automatically create an inventory record with a positive quantity change restoring the refunded quantity.

IF a restocking entry has a zero quantity change, THEN THE system SHALL reject the entry.

IF an adjustment entry has a zero quantity change, THEN THE system SHALL reject the entry.

### Reason and Documentation Requirements

WHEN an inventory record is created, THE system SHALL require a reason to be provided.

WHEN a seller manually adds inventory, THE system SHALL require the seller to specify a reason for the restocking.

WHEN a seller manually subtracts inventory, THE system SHALL require the seller to specify a reason for the adjustment or loss.

WHEN an order placement creates an inventory record automatically, THE system SHALL populate the reason with the corresponding order information.

WHEN a cancellation or refund creates an inventory record automatically, THE system SHALL populate the reason with the corresponding cancellation or refund reference.

### Current Stock Calculation

THE system SHALL calculate the current stock of a product variant by summing all quantity change values from its inventory records.

THE system SHALL recalculate current stock whenever a new inventory record is added.

THE system SHALL not rely on a stored stock total; it SHALL use the sum of inventory records as the authoritative value.

IF the calculated current stock is zero or negative, THEN THE system SHALL treat the variant as out of stock.

IF the calculated current stock is positive, THEN THE system SHALL treat the variant as in stock with the calculated quantity available.

### Out of Stock and Availability Constraints

WHEN a product variant's current stock is zero or below, THE system SHALL mark the variant as out of stock.

WHEN a variant is marked as out of stock, THE system SHALL prevent customers from adding that variant to their cart.

WHEN a variant is out of stock, THE system SHALL display the variant as out of stock in product detail pages and search results.

IF a variant has no inventory records and no stock, THEN THE system SHALL treat it as having zero stock.

WHEN stock is restored through restocking or cancellation/refund, THE system SHALL update the variant's availability status immediately.

### Inventory History Integrity

THE system SHALL preserve all inventory records permanently; no inventory record SHALL be deleted.

THE system SHALL record a timestamp for every inventory record indicating when the stock change occurred.

THE system SHALL associate each inventory record with the corresponding product variant.

WHEN a seller views inventory history, THE system SHALL display all inventory records for that variant in chronological order.

IF a product variant is deleted, THE system SHALL preserve the inventory records for historical and audit purposes.

## Wishlist Rules

Wishlists store products customers wish to purchase in the future. Customers can add products to their wishlist for later consideration. Products appear in paginated view for easy browsing of saved items. Customers can remove products from their wishlist when no longer interested. If a product is deleted by the seller, it is automatically removed from all customer wishlists. The system validates product existence before adding to wishlist. Products can appear multiple times across different customer wishlists.

### Product Existence Validation for Wishlist Addition

WHEN a customer attempts to add a product to their wishlist, THE system SHALL verify the product currently exists on the platform.

IF the requested product does not exist, THEN THE system SHALL reject the addition.

IF the requested product has been deleted by the seller, THEN THE system SHALL reject the addition.

THE wishlist stores products rather than specific variants, so customers need not select a variant when adding a product to their wishlist.

### Wishlist Paginated Browsing Rules

WHEN a customer views their wishlist, THE system SHALL present results in a paginated format.

THE wishlist SHALL display only products that currently exist and have not been deleted.

IF a product in the wishlist has been deleted by its seller, THEN THE system SHALL automatically exclude that product from the wishlist browsing results.

### Wishlist Removal Rules

WHEN a customer removes a product from their wishlist, THE system SHALL remove that product from the customer's wishlist only.

Removing a product from one customer's wishlist has no effect on that product's presence in other customers' wishlists.

### Automatic Removal of Deleted Products

WHEN a seller deletes a product, THE system SHALL automatically remove that product from every customer wishlist on the platform.

This automatic removal applies to all wishlists containing the deleted product, ensuring no customer can browse deleted products through their wishlist.

## ShoppingCart Rules

Shopping carts contain product variants customers intend to purchase. Customers specify quantity when adding variants to their cart. Adding the same variant combines quantities rather than creating separate entries. Stock less than cart quantity triggers a warning display. Variants marked unavailable when deleted or out of stock. Unavailable items cannot proceed to checkout. Cart calculates total price for all items combined. Customers can change the quantity of items in their cart. Customers can remove items from their cart.

### Variant Addition Constraints

WHEN a customer adds a product variant to their shopping cart, THE system SHALL require the customer to specify a valid positive quantity.

WHEN a customer adds a product variant to their shopping cart, THE system SHALL validate that the variant is not currently marked as unavailable.

IF a variant is marked as unavailable, THEN THE system SHALL reject the request to add it to the shopping cart.

WHEN a product variant is added to a shopping cart that already contains the same variant, THE system SHALL combine the new quantity with the existing quantity in a single cart entry rather than creating a separate line item.

WHEN a product variant is successfully added to a shopping cart, THEN THE system SHALL associate the variant entry with the customer who performed the addition.

### Quantity Combination Logic

THE system SHALL maintain only one entry per unique product variant within a customer's shopping cart.

WHEN a customer adds a variant that is already present in the cart, THEN THE system SHALL sum the existing quantity and the newly specified quantity to update the single cart entry.

WHEN a variant is combined in the cart, THEN THE system SHALL preserve the unit price associated with that variant at the time of the initial addition.

WHEN a variant is combined with an existing cart entry, THEN THE system SHALL update the item subtotal immediately based on the new combined quantity.

THE system SHALL not create duplicate line items for the same product variant within a single customer's shopping cart regardless of multiple addition attempts.

### Stock Warning Display

WHEN the quantity of a product variant in a shopping cart exceeds the variant's current available stock, THEN THE system SHALL display a stock warning for that item.

WHILE a stock warning is active for a cart item, THEN THE system SHALL continue to display the warning until the item is removed or its quantity is adjusted to match or fall below the available stock.

WHEN a customer adjusts the quantity of an item such that it no longer exceeds the available stock, THEN THE system SHALL remove the stock warning displayed for that item.

WHEN a stock warning is triggered, THEN THE system SHALL visually indicate the warning directly on the cart item display without removing the item from the cart.

IF the available stock for a cart item drops to zero while the item remains in the cart, THEN THE system SHALL mark the item as unavailable and transition the display from a stock warning to an unavailability state.

### Unavailable Checkout Prevention

IF a shopping cart contains any items marked as unavailable, THEN THE system SHALL prevent the customer from proceeding to the checkout process.

WHEN a customer attempts to proceed to checkout with a cart containing unavailable items, THEN THE system SHALL reject the checkout action and display an error identifying which items are unavailable.

WHEN a customer removes all unavailable items from their cart, THEN THE system SHALL immediately re-enable the ability to proceed to checkout for the remaining valid items.

WHEN a customer reduces the quantity of an unavailable item such that it no longer exceeds the available stock, THEN THE system SHALL re-evaluate the item's status and re-enable checkout eligibility if all items become valid.

THE system SHALL only allow checkout progression when all items in the shopping cart are marked as available and possess valid positive quantities.

### Cart Quantity Change Rules

WHEN a customer changes the quantity of an item in their shopping cart, THEN THE system SHALL validate that the new quantity is a valid positive integer.

WHEN a customer increases the quantity of an item such that it exceeds the available stock, THEN THE system SHALL update the item's subtotal and display a stock warning.

WHEN a customer decreases the quantity of an item such that it equals or falls below the available stock, THEN THE system SHALL update the item's subtotal and remove any active stock warning.

WHEN a customer updates the quantity of an item in their shopping cart, THEN THE system SHALL preserve the item's position and association with the specific product variant.

IF a customer attempts to set the quantity of an item to zero or a negative number, THEN THE system SHALL reject the quantity change request.

### Cart Item Removal

WHEN a customer removes an item from their shopping cart, THEN THE system SHALL delete that specific product variant entry from the customer's shopping cart.

WHEN an item is removed from a shopping cart, THEN THE system SHALL recalculate the total price based on the quantities and unit prices of all remaining items.

IF a shopping cart becomes empty after an item is removed, THEN THE system SHALL update the cart state to reflect that no items are present.

WHEN an item is removed, THEN THE system SHALL immediately clear any active stock warnings or unavailability states associated with the removed item.

THE system SHALL not affect other items in the shopping cart when a single item is removed, preserving their quantities, prices, and associated warnings.

### Total Price Calculation

THE system SHALL calculate the total price of the shopping cart by summing the calculated subtotals of all items currently in the cart.

WHEN calculating the subtotal for a single item, THEN THE system SHALL determine the value by multiplying the current unit price of the product variant by the quantity specified in the shopping cart.

WHEN items are added, removed, or their quantities are changed, THEN THE system SHALL recalculate the entire cart total price immediately to ensure accuracy.

THE system SHALL display both individual item subtotals and the overall shopping cart total price to the customer.

IF the shopping cart contains no items, THEN THE system SHALL display a total price of zero.

## Order Rules

Orders represent completed purchase transactions containing one or more order items. Each order receives a unique order number and creation date. Orders calculate total price from all contained order items. Orders are paginated by newest first for viewing complete purchase history. Order status derives from its contained items through aggregation logic. Order details preserve purchase information through snapshots for all items. Customers can review historical orders for reference and tracking purposes. Once an order is placed, the shipping address cannot be changed.

### Order Number Uniqueness

#### Order Number Uniqueness

The following business rules apply to order number generation:

- THE ecommerce platform SHALL assign a unique order number to each order upon creation
- IF two orders exist on the platform, THEN they SHALL have different order numbers
- AN ORDER SHALL never share its order number with any other order, including deleted or cancelled orders
- THE order number SHALL be assigned at the time the order is created and SHALL not change after assignment

**Error Conditions**
- IF a duplicate order number is detected during order creation, THEN the order creation SHALL be rejected

### Order Total Price Calculation

#### Order Total Price Calculation

The following business rules govern order total price computation:

- THE total price of an order SHALL equal the sum of all order item subtotals contained within the order
- THE subtotal of each order item SHALL be calculated as the unit price multiplied by the quantity of that item
- THE unit price recorded for each order item SHALL be the price at the time of purchase, captured in the purchase snapshot
- WHEN calculating the order total, THE system SHALL use the snapshot prices, not current product or variant prices
- IF an order contains no items, THEN the order total SHALL be zero

**Error Conditions**
- IF the calculated total price is negative, THEN the order SHALL not be created
- IF the total price calculation cannot be completed due to missing item data, THEN the order SHALL not be created

### Order Status Aggregation Rules

#### Order Status Aggregation Rules

The overall order status is derived from the statuses of its contained order items according to the following business rules:

- IF all order items in an order have status 'paid', THEN the order status SHALL be 'paid'
- IF any order item has status 'shipped' and no item has status 'delivered', THEN the order status SHALL be 'shipped'
- IF all order items have status 'delivered', THEN the order status SHALL be 'delivered'
- IF all order items have status 'cancelled', THEN the order status SHALL be 'cancelled'
- IF all order items have status 'refunded', THEN the order status SHALL be 'refunded'
- IF order items have mixed statuses that do not fall into the above categories, THEN the order status SHALL be 'partially completed'

**Constraint**
- THE overall order status SHALL be recalculated automatically whenever any order item's status changes

**Example Scenarios**
- Two items: one delivered, one refunded → partially completed
- Three items: two paid, one shipped → shipped
- One item: cancelled → cancelled

### Purchase Snapshot Preservation

#### Purchase Snapshot Preservation

The following rules ensure purchase details are preserved regardless of later changes to products or seller profiles:

- WHEN an order is created, THE system SHALL capture a snapshot of each purchased product, including its name, description, category, base price, and images
- WHEN an order is created, THE system SHALL capture a snapshot of each purchased variant, including its SKU code, option values, and price
- WHEN an order is created, THE system SHALL capture a snapshot of each seller's profile, including the shop name and logo image
- THE purchase snapshots associated with an order SHALL remain immutable and SHALL not be modified by subsequent changes to the original product, variant, or seller profile
- IF a product is deleted after being purchased, THE purchase snapshot for that product in the order SHALL be preserved
- IF a seller's profile is updated after an order is placed, THE snapshot of the seller profile in the order SHALL remain unchanged

**Domain Logic**
- Purchase snapshots ensure that customers and platforms can always view exactly what was purchased and at what price, even if the original product or seller information is later modified or deleted

### Preserved Order Details

#### Preserved Order Details

The following validation rules ensure that order details remain complete and accurate after placement:

- EACH order SHALL preserve the order number, creation date, total price, and overall status
- EACH order SHALL preserve the list of order items, including product name, variant details, quantity, unit price, and item status for each item
- EACH order SHALL preserve the shipping address that was selected at checkout
- EACH order SHALL preserve all associated shipment information, including carrier name, tracking number, and which items are included in each shipment
- THE preserved order details SHALL be available for viewing by the customer who placed the order regardless of whether the product, variant, or seller still exists on the platform

**Constraint**
- AN order's core details (order number, date, items, prices) SHALL not be modified after the order is created

### Fixed Shipping Address Constraint

#### Fixed Shipping Address Constraint

The following rules govern the shipping address after an order is placed:

- WHEN an order is created, THE shipping address selected at checkout SHALL be bound to that order
- AFTER an order is placed, THE shipping address SHALL not be changeable by the customer, the seller, or any other party
- IF a customer attempts to modify the shipping address of a placed order, THEN the request SHALL be rejected
- THE shipping address bound to the order SHALL be the address used for all shipments associated with that order

**Error Conditions**
- IF a shipping address modification is attempted on a completed order, THEN the system SHALL reject the request

### Order List Pagination Rules

#### Order List Pagination Rules

The following rules apply when browsing order history:

- WHEN viewing the order history, orders SHALL be sorted by creation date in descending order (newest first)
- THE order list SHALL be paginated, allowing customers to view orders in manageable groups
- THE first page SHALL show the most recently created orders
- THE pagination SHALL apply to all order list views, including the customer's order history page

## OrderItem Rules

Order items represent individual quantity of a purchased product variant within an order. Each item maintains independent status progression through paid, shipped, delivered, cancelled, or refunded. Order items preserve product name, variant options, and price at time of purchase. Status changes reflect shipping confirmation, delivery acknowledgment, or cancellation or refund. Items cannot revert status once progression occurs. Status changes for items affect overall order status. Multiple sellers result in separate status tracking. Each order item can be individually cancelled or refunded.

### #### OrderItem Quantity and Price Rules

The quantity of an order item represents the number of a specific product variant purchased in a single line item. If a customer purchases multiple units of the same variant, they are consolidated into one order item with a combined quantity.

**Validation Rules:**
- WHEN an order item is created, THE system SHALL ensure the quantity is a positive whole number greater than zero.
- WHEN an order item is created, THE system SHALL validate that the requested quantity does not exceed the available stock of the variant at the moment of purchase.
- IF the requested quantity exceeds the available stock, THEN THE system SHALL reject the order and display an error indicating insufficient stock.
- WHEN an order item is created, THE system SHALL record the unit price that was applied at the time of purchase.
- WHEN an order item is created, THE system SHALL calculate and store the subtotal as the quantity multiplied by the unit price.

**Constraints:**
- THE system SHALL NOT allow modification of the quantity on an existing order item.
- THE system SHALL NOT allow modification of the unit price on an existing order item.
- THE system SHALL NOT allow splitting or merging order items after creation.

### #### Independent Status Progression

Each order item progresses through a defined lifecycle of statuses independently from other order items within the same order.

**Status Values:**
- **Paid**: Payment completed, waiting for seller to ship
- **Shipped**: Seller has shipped the item
- **Delivered**: Item has been delivered and confirmed
- **Cancelled**: Item was cancelled before or after shipping
- **Refunded**: Item was refunded after delivery

**Progression Rules:**
- WHEN an order item is created through successful payment, THE system SHALL set the initial status to "paid".
- WHEN a seller creates a shipment containing the order item, THE system SHALL change the item status from "paid" to "shipped".
- WHEN a customer confirms delivery of the shipment containing the item, THE system SHALL change the item status from "shipped" to "delivered".
- WHILE a shipment containing the item remains unconfirmed after 14 days from shipping, THE system SHALL automatically change the item status from "shipped" to "delivered".
- WHEN an order item with status "paid" is cancelled (by customer request approved by seller, or by administrator force-cancel), THE system SHALL change the status to "cancelled".
- WHEN an order item with status "delivered" is refunded (by customer request approved by seller, or by administrator force-refund), THE system SHALL change the status to "refunded".

### #### Status Irreversibility

Order item statuses are final and cannot revert to a previous state once a transition occurs.

**Irreversibility Rules:**
- IF an order item status has changed from "paid" to "shipped", THEN THE system SHALL NOT allow the status to revert to "paid".
- IF an order item status has changed from "shipped" to "delivered", THEN THE system SHALL NOT allow the status to revert to "shipped" or "paid".
- IF an order item status has changed to "cancelled", THEN THE system SHALL NOT allow the status to change to any other status.
- IF an order item status has changed to "refunded", THEN THE system SHALL NOT allow the status to change to any other status.
- WHILE an order item has status "cancelled" or "refunded", THE system SHALL treat the item as completed and SHALL NOT allow further status modifications.

**Error Conditions:**
- IF a user attempts to modify the status of an order item in a way that violates irreversibility, THEN THE system SHALL reject the request and display an error indicating that the item status cannot be changed.

### #### Purchase Snapshot Preservation

When an order is placed, a snapshot of the product, variant, and seller profile is preserved with each order item to ensure the purchase details remain accurate regardless of future changes.

**Preservation Rules:**
- WHEN an order item is created, THE system SHALL capture a snapshot of the product details including the product name, description, category, base price, and images as they existed at the time of purchase.
- WHEN an order item is created, THE system SHALL capture a snapshot of the variant details including the SKU code, option values, and price as they existed at the time of purchase.
- WHEN an order item is created, THE system SHALL capture a snapshot of the seller profile including the shop name and logo as they existed at the time of purchase.
- THE system SHALL preserve these snapshots immutably and SHALL NOT allow modification after the order item is created.
- THE system SHALL display the preserved product and variant information (not the current product information) when viewing order item details.
- THE system SHALL preserve the seller shop name from the snapshot in order history, even if the seller's shop name is later changed or the seller account is deleted.

**Constraints:**
- THE system SHALL use the snapshot data for order display and not the current product or variant data.
- THE system SHALL retain all purchase snapshots even after the original product is deleted or the variant is removed.

### #### Individual Cancellation and Refund Eligibility

Order items can be cancelled or refunded individually without affecting the status of other items in the same order.

**Individual Cancellation Eligibility:**
- WHEN a customer requests cancellation of an order item, THE system SHALL check that the item status is "paid" (not yet shipped).
- IF the item status is "shipped" or "delivered", THEN THE system SHALL reject the cancellation request and display an error indicating that cancellation is only available for items that have not been shipped.
- WHEN a cancellation request is approved by the seller, THE system SHALL change only that item's status to "cancelled".
- WHEN an item is cancelled, THE system SHALL restore the stock quantity of the variant by creating a positive inventory record.
- THE remaining items in the same order SHALL continue processing normally regardless of the cancelled item.

**Individual Refund Eligibility:**
- WHEN a customer requests a refund for an order item, THE system SHALL check that the item status is "delivered".
- IF the item status is not "delivered", THEN THE system SHALL reject the refund request and display an error indicating that refunds are only available for delivered items.
- THE system SHALL allow a refund request only within 7 days of the item being delivered.
- IF the refund request is submitted after 7 days from delivery, THEN THE system SHALL reject the request and display an error indicating the refund period has expired.
- WHEN a refund request is approved by the seller, THE system SHALL change only that item's status to "refunded".
- WHEN an item is refunded, THE system SHALL restore the stock quantity of the variant by creating a positive inventory record.
- THE remaining items in the same order SHALL remain unaffected regardless of the refunded item.

**Cross-Item Independence:**
- Cancellation or refund of one order item SHALL NOT cause automatic cancellation or refund of other items in the same order.
- Cancellation or refund of an order item from one seller SHALL NOT affect order items from other sellers within the same order.

## Shipment Rules

Shipments group order items from the same seller for organized shipping. Shipments require carrier name and tracking number for delivery tracking. All items within a shipment share identical tracking information. Sellers create shipments by selecting order items and entering tracking details. Different sellers always ship separately with different shipments. A seller can choose to ship items individually or bundle multiple items into one shipment. Shipment creation changes all included items to shipped status. Customers view tracking information per shipment not per item. Customers confirm delivery per shipment not per item. If the customer does not confirm, items automatically change to delivered after fourteen days from shipping. When a customer confirms delivery, all items in that shipment change to delivered status.

### Same Seller Grouping Rule

WHEN a seller creates a shipment, THE shipment SHALL include only order items belonging to that seller.

IF a shipment creation request includes order items from multiple different sellers, THEN THE system SHALL reject the request.

The system SHALL not allow order items belonging to different sellers to be grouped into a single shipment. Each seller's shipments are independent and separate from other sellers.

A seller SHALL be able to choose to ship their order items individually as separate shipments or bundle multiple their order items together into one shipment. This bundling decision is at the seller's discretion.

### Carrier Name and Tracking Number Validation

WHEN a seller creates a shipment, THE system SHALL require a carrier name as a mandatory field.

IF a shipment creation request is submitted without a carrier name, THEN THE system SHALL reject the request.

The carrier name is the label of the shipping company or courier service used for the shipment.

WHEN a seller creates a shipment, THE system SHALL require a tracking number as a mandatory field.

IF a shipment creation request is submitted without a tracking number, THEN THE system SHALL reject the request.

The tracking number is used by customers to track the delivery status of the shipment.

### Shared Tracking Information Constraint

ALL order items within the same shipment SHALL share identical tracking information, including the carrier name and tracking number.

The system SHALL not allow individual items within a shipment to have different carrier names or tracking numbers. Tracking information is defined at the shipment level, not the item level.

WHEN a shipment is created, THE carrier name and tracking number SHALL be applied uniformly to every order item included in that shipment.

### Shipment Status Synchronization

WHEN a shipment is created, THE system SHALL change the status of all included order items to shipped simultaneously.

The system SHALL ensure that all order items in a shipment share the same status transition to shipped at the moment of shipment creation.

WHEN a customer confirms delivery for a shipment, THE system SHALL change the status of all order items within that shipment to delivered simultaneously.

Delivery confirmation is performed per shipment, not per individual order item. A single customer action to confirm delivery applies to all items in the shipment.

### Automatic Delivery Confirmation Rule

IF a customer does not confirm delivery within fourteen days after a shipment is created, THEN THE system SHALL automatically change the status of all order items in that shipment to delivered.

The fourteen-day automatic delivery confirmation period begins from the date the shipment is created and the tracking information is entered.

IF a customer confirms delivery before the fourteen-day period expires, THEN THE system SHALL change the status of all order items in that shipment to delivered immediately, and the automatic confirmation timer SHALL be voided.

The system SHALL not extend or reset the fourteen-day timer after each day passes. The timer is fixed from the original shipment creation date.

### Customer View Tracking Information

THE system SHALL present tracking information to customers at the shipment level rather than at the individual order item level.

WHEN a customer views their order details, THE system SHALL display tracking information grouped by shipment, with each shipment showing which order items are included.

The system SHALL not display duplicate tracking information for each individual order item. Instead, items belonging to the same shipment share one set of tracking details.

## Review Rules

Reviews require a customer to write after receiving delivery of an item. Customers can write one review per product per order to prevent multiple ratings. Reviews include ratings between one and five stars which is required. Reviews can include optional text content for detailed feedback about the product. Reviews only write after item status is delivered. Customers can edit their own reviews after posting them. Every review edit creates a snapshot preserving the previous state. Customers can delete their own reviews but snapshots are preserved. Reviews are displayed on the product detail page for other customers sorted by newest first. Product average rating calculates from all non-deleted reviews.

### Review Eligibility Constraints

WHEN an order item status is not delivered, THE system SHALL reject any attempt to write a review for that item.

WHEN a customer has already submitted a review for a product within a specific order, THE system SHALL prevent another review for the same product in that same order.

The delivery requirement means reviews can only be written after the corresponding order item status reaches "delivered" — either through customer confirmation or automatic delivery after fourteen days.

WHEN a customer attempts to write a review for a product they have not purchased, THE system SHALL reject the review submission.

### Review Content Validation

WHEN a review is submitted, THE system SHALL validate that the rating is provided and falls within the range of one to five stars.

IF the rating is missing, THE system SHALL reject the review submission.

IF the rating is below one or above five, THE system SHALL reject the review submission.

Text content is optional for reviews. IF text content is provided alongside a valid rating, THE system SHALL accept the review.

IF only a valid rating is provided without text content, THE system SHALL accept the review.

### Review Modification and Snapshot Rules

WHEN a customer edits their own review, THE system SHALL create a snapshot preserving the previous rating and text content before applying the changes.

IF a customer attempts to edit a review they did not create, THE system SHALL reject the edit request.

WHEN a customer deletes their own review, THE system SHALL preserve the snapshot of the review and mark the review as deleted.

Snapshots of reviews are immutable and cannot be deleted. Administrators and relevant parties can view review snapshots for dispute resolution.

Deleted reviews are excluded from active display on the product detail page but their snapshots remain preserved for record-keeping.

### Review Display and Rating Aggregation

Reviews on the product detail page SHALL be displayed sorted by newest first, ordered by submission date with the most recently submitted review appearing at the top.

WHEN calculating a product's average rating, THE system SHALL include only non-deleted reviews in the calculation.

Products with no non-deleted reviews SHALL display no average rating.

WHEN a review is deleted, THE system SHALL recalculate the product's average rating excluding the deleted review.

The total review count displayed on the product detail page reflects only non-deleted reviews.

## Snapshot Rules

Snapshots preserve data states when changes occur for audit purposes. Snapshots cannot be deleted from the system once created. Snapshots record timestamp, changes made, and before and after values for the change. Snapshots are immutable and support dispute resolution between parties. When a product is edited, a product snapshot is created including all product fields and snapshots of all variants at that moment. This preserves the complete state of a product and its variants at any point in time. Snapshots apply to products, variants, seller profiles, order items, reviews, and requests. Only relevant parties including owners and administrators can view snapshots. Snapshots are preserved even after the entity is deleted.

### Snapshot Creation and Immutability Rules

- WHEN editable entity data is modified, THE system SHALL automatically create a snapshot to preserve the previous state.
- THE system SHALL enforce immutable snapshots that cannot be edited or deleted after creation.
- IF a user attempts to modify or delete an existing snapshot, THEN THE system SHALL reject the action.

### Snapshot Data Content and Audit Trail

- WHEN an entity change occurs, THE system SHALL record the timestamp, the specific data element changed, and the before and after values.
- THE system SHALL organize all snapshots chronologically to maintain a comprehensive audit trail for modified entities.
- WHERE complete state comparison is required, THE system SHALL capture full contextual data to ensure traceability.

### Product and Variant Snapshot Structure

- WHEN a product is edited, THE system SHALL capture all product fields including name, description, category, base price, and images.
- WHEN a product snapshot is created, THE system SHALL ensure variant snapshots included in the record capture the state of all associated variants at that moment.
- THE system SHALL maintain the product snapshot structure by linking the main product state to its corresponding variant states.
- WHEN a variant is modified, THE system SHALL record the SKU code, option values, and price details.

### Snapshot Visibility Constraints

- THE system SHALL make snapshot data owner viewable, allowing the creator of the associated entity to access their own snapshots.
- THE system SHALL make snapshot data administrator viewable, allowing platform administrators to access snapshots of any entity.
- IF a user who is neither the owner nor an administrator attempts to access snapshot data, THEN THE system SHALL reject the access request.

### Preservation and Dispute Resolution Rules

- WHEN an original entity is deleted from the system, THE system SHALL ensure that all associated snapshots are preserved after deletion.
- THE system SHALL provide snapshot history as an authoritative record for dispute resolution between transaction parties.
- WHERE entity modifications are contested, THE system SHALL utilize immutable snapshot records to validate original states.

## CancellationRequest Rules

Cancellation requests allow customers to cancel individual items before shipping occurs. Cancellation requests require reason text documenting why cancellation was requested. Cancellation requests cannot apply to already shipped, delivered, cancelled, or refunded items. Only paid items not yet shipped can be cancelled. The seller of that item receives the cancellation request for approval or rejection. When a seller responds, a snapshot of the request state is created. Approved cancellations trigger refund processing for that specific item. Cancelled items restore their stock quantities through inventory record. Remaining items continue processing normally when some items cancel. If all items in an order are cancelled, the entire order status becomes cancelled.

### Cancellation Request Eligibility

WHEN a cancellation is requested, THE system SHALL verify that the target order item has status "paid" only; items with status "shipped", "delivered", "cancelled", or "refunded" are ineligible for cancellation.

WHEN a cancellation is requested, THE system SHALL reject the request if the item has already been shipped, confirmed by the existence of an active shipment containing that item.

WHEN a cancellation is requested, THE system SHALL reject the request if the item already has a pending cancellation request that has not been approved or rejected.

IF a customer requests cancellation for an item they do not own, THEN THE system SHALL reject the request.

### Cancellation Reason Requirement

WHEN a customer submits a cancellation request, THE system SHALL require a reason to be provided as text content; requests without a reason SHALL be rejected.

THE cancellation reason SHALL be preserved as part of the cancellation request record.

### Seller Approval Decision

THE seller of the order item SHALL be the only party who can approve or reject the cancellation request.

WHEN a seller approves the cancellation request, THE system SHALL change the order item status to "cancelled".

WHEN a seller rejects the cancellation request, THE system SHALL leave the order item status unchanged at "paid".

IF a requested cancellation has already been approved or rejected, THEN THE seller SHALL not be able to modify the decision.

### Cancellation Request Snapshot

WHEN a seller responds to a cancellation request (approval or rejection), THE system SHALL create a snapshot of the request state recording the reason text and the status values before and after the seller's response.

THE cancellation request snapshot SHALL include the timestamp of the seller's response, the reason text, and the status values before and after the response.

### Refund Processing on Approval

WHEN a cancellation request is approved, THE system SHALL process a refund for that specific order item only.

THE refund SHALL be applied to the customer for the unit price recorded in that order item.

WHEN a cancellation is approved for some items, THE remaining order items that were not cancelled SHALL continue processing normally and SHALL not be affected.

### Stock Restoration on Cancellation

WHEN a cancellation request is approved, THE system SHALL create a positive inventory record to restore the stock quantity for the cancelled variant.

THE restored stock quantity SHALL match the quantity specified in the cancelled order item.

WHEN stock is restored through cancellation, THE inventory record SHALL include the reason indicating cancellation restoration and a timestamp.

### Partial Order Cancellation Impact

THE system SHALL support partial cancellation where only some items in an order are cancelled while others continue processing.

WHEN a subset of order items in an order are cancelled, THE overall order status SHALL reflect a "partially completed" state.

WHEN all items in an order are cancelled, THE overall order status SHALL change to "cancelled".

IF items from different sellers are in the same order, THEN cancelling items from one seller SHALL not affect items from other sellers in that order.

## RefundRequest Rules

Refund requests allow customers to request refunds for individual items that have delivered status. Refund requests can be submitted within seven days after item delivery confirmation. Refund requests require reason text documenting why refund was requested and cannot apply to already cancelled or refunded items. Sellers receive refund requests for approval or rejection. When a seller responds, a snapshot of the request state is created. Approved refunds process that specific item while remaining items continue normally. Refunded items restore their stock quantities through inventory record. The system tracks refund request status for dispute resolution. If all items in an order are refunded, the entire order status becomes refunded.

### Refund Eligibility Validation

WHEN a customer attempts to submit a refund request, THE system SHALL verify that the target order item has delivered status.

IF the order item status is anything other than delivered, THEN THE system SHALL reject the refund request.

IF the order item has already been refunded, THEN THE system SHALL reject the refund request.

IF the order item has already been cancelled, THEN THE system SHALL reject the refund request.

IF an order item already has a refund request that is still pending or has been approved, THEN THE system SHALL prevent the customer from submitting another refund request for that same item.

### Seven-Day Refund Window

WHEN a customer attempts to submit a refund request, THE system SHALL calculate whether the item was delivered within the last seven days from the time of refund request submission.

IF the item was delivered more than seven days ago, THEN THE system SHALL reject the refund request as outside the allowable timeframe.

The seven-day period starts from the date the item reached delivered status.

The seven-day calculation does not start from the date the order was placed or the item was shipped.

If the item was auto-delivered (customer did not confirm delivery within 14 days from shipping), the seven-day window starts from the auto-delivery date.

### Refund Request Reason Requirement

WHEN a customer submits a refund request, THE system SHALL require a reason to be provided.

IF the reason field is empty or contains only whitespace, THEN THE system SHALL reject the refund request submission.

The reason is a free-text field that documents why the customer is requesting a refund.

The reason text cannot be edited after the refund request is submitted.

### Seller Approval Constraints

WHEN a refund request is submitted, THE system SHALL route the request to the seller who owns the product for that order item.

ONLY the seller who owns the product may approve or reject the refund request.

ONLY one seller can respond to a given refund request — once approved or rejected, the request status becomes final and cannot be changed.

IF a seller approves a refund request, THEN THE system SHALL process the refund for that specific order item.

IF a seller rejects a refund request, THEN THE system SHALL notify the customer of the rejection and no refund is processed.

Sellers and administrators can view the reason text provided by the customer when reviewing the refund request.

### Refund Request Snapshot Rules

WHEN a seller approves or rejects a refund request, THE system SHALL create a snapshot recording the state change.

The snapshot SHALL record the timestamp, the previous request status, and the new request status.

Snapshots of refund request changes are immutable and cannot be deleted.

Snapshots are viewable by relevant parties for dispute resolution.

This snapshot records refund request state changes specifically, separate from snapshots of product or review changes.

### Stock Restoration on Refund

WHEN a refund request is approved and processed, THE system SHALL restore the stock quantity of the refunded item's variant.

Stock restoration is performed through an inventory record with a positive quantity change, matching the quantity of the refunded order item.

The inventory record for stock restoration SHALL include a reason indicating it was due to an approved refund.

Stock restoration occurs automatically upon refund approval and does not require manual seller intervention.

This stock restoration is tracked via inventory records rather than snapshots.

### Partial Refund Processing Rules

WHEN a refund is approved for one item in a multi-item order, THE system SHALL process the refund for only that item and leave remaining items unaffected.

The refunded item's status changes to refunded while other items in the order continue with their current status.

IF all items in an order reach refunded status, THEN THE system SHALL update the overall order status to refunded.

IF some items are refunded and others remain in paid, shipped, or delivered status, THEN THE overall order status becomes partially completed.

Refund processing for one item does not trigger cancellation, refund, or status changes for any other items in the same order.

## SellerApprovalRequest Rules

Seller approval requests require administrator review before selling privileges are granted. Requests display pending, approved, or rejected status. Rejected requests preserve rejection reason for seller reference. Rejected sellers cannot sell until approved and must submit a new registration request. Sellers can view their approval status. Administrators review pending requests and make decisions. Sellers must provide a reason when submitting the request. Rejection reasons help sellers understand what needs improvement. Approved sellers gain access to their dashboard and selling features.

### Status Constraints

WHEN a seller submits a seller approval request, THE system SHALL create the request with status "pending".

WHEN an administrator approves a pending seller approval request, THE system SHALL change the status to "approved".

WHEN an administrator rejects a pending seller approval request, THE system SHALL change the status to "rejected".

A seller approval request with status "pending" SHALL be reviewable by administrators.

A seller approval request SHALL only have one of the following valid statuses: pending, approved, or rejected.

### Reason Requirements

WHEN a seller submits a seller approval request, THE seller SHALL be required to provide a reason.

IF a seller submits a seller approval request without a reason, THEN THE system SHALL reject the submission.

WHEN an administrator rejects a seller approval request, THE administrator SHALL be required to provide a rejection reason.

IF an administrator attempts to reject a seller approval request without providing a rejection reason, THEN THE system SHALL prevent the rejection.

### Rejection Reason Preservation

WHEN a seller approval request is rejected with a rejection reason, THE system SHALL preserve the rejection reason.

WHEN a seller views their rejected approval request, THE system SHALL display the rejection reason provided by the administrator.

IF a seller approval request was not rejected, THEN THE system SHALL not display a rejection reason.

### New Registration after Rejection

WHEN a seller's approval request has status "rejected", THE seller SHALL be allowed to submit a new registration request.

WHEN a rejected seller submits a new registration request, THE system SHALL create a separate new seller approval request with status "pending".

A new registration request submitted by a rejected seller SHALL NOT restore selling privileges until the new request is approved by an administrator.

## AdministratorRequest Rules

Administrator requests allow any user to request administrator privileges. Super administrators review requests for approval or rejection. Requests include reason text explaining the need for administrator access. The system tracks request status as pending, approved, or rejected. Approved users gain regular administrator role initially. Super administrators can promote regular administrators to super administrator. Super administrators cannot promote themselves. Regular administrators cannot promote themselves. Administrator requests preserve reason text for review decisions. Rejected requests do not prevent new requests in the future.

### #### Reason Text Constraint

WHEN a user submits an administrator request, THE system SHALL require reason text.

IF reason text is missing or empty, THEN THE system SHALL reject the administrator request submission.

WHEN reason text validation fails, THE system SHALL provide feedback to the user that the reason text is required.

### #### Pending Status Behavior

WHEN an administrator request is submitted successfully, THE system SHALL assign the request an initial status of pending.

WHILE a request has pending status, THE system SHALL make it available for super administrator review.

The pending status SHALL persist until a super administrator takes action to approve or reject the request.

### #### Approved Status Behavior

WHEN a super administrator approves an administrator request, THE system SHALL change the request status to approved.

WHEN a request status changes to approved, THE system SHALL grant regular administrator privileges to the requesting user.

The requesting user SHALL immediately become a regular administrator upon approval.

### #### Rejected Status Behavior

WHEN a super administrator rejects an administrator request, THE system SHALL change the request status to rejected.

Rejected requests SHALL remain in the system with their status preserved for tracking purposes.

A user with a rejected request SHALL be permitted to submit a new administrator request in the future.

Prior rejection history SHALL not block submission of new administrator requests.

### #### Administrator Privilege Promotion and Demotion

WHEN a super administrator promotes a regular administrator, THE system SHALL elevate the target user to super administrator.

Super administrators CANNOT promote themselves to super administrator.

Regular administrators CANNOT promote themselves to super administrator.

WHEN a super administrator demotes another super administrator, THE system SHALL reduce the target user to regular administrator.

Super administrators CANNOT demote themselves.

Self-demotion requests from super administrators SHALL be rejected by the system.

### #### Super Admin Review Access

WHEN an administrator request is submitted, THE system SHALL require the submitting user to be authenticated.

Guest users CANNOT submit administrator requests.

When reviewing administrator requests, THE system SHALL enforce that only super administrators can approve or reject requests.

Regular administrators CANNOT approve or reject administrator privilege requests.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Category Browsing Rules

Customers can browse all available categories and subcategories on the platform.

When viewing products within a category, only products assigned to that category or its subcategories are displayed.

Products belonging to suspended sellers are excluded from category browsing and are not shown in the results.

Deleted products do not appear in category listings.

### Product Search Filtering and Sorting

Search results are presented in a paginated format to allow browsing through large sets of products.

Customers can filter search results by category, including subcategories. Only products matching the selected category or its subcategories appear in the filtered results.

Customers can filter search results by a price range with a minimum and maximum value. A product is included if its base price falls within the specified range.

Customers can filter search results to show only in-stock products. Products are considered in-stock when at least one variant has a stock quantity greater than zero.

Customers can sort search results by newest first, displaying recently added products before older ones.

Customers can sort search results by price from low to high, using the base price for ordering.

Customers can sort search results by price from high to low, using the base price for ordering.

Products belonging to suspended sellers are hidden from search results.

Deleted products do not appear in search results.

Products with no variants are visible in search results but are marked as unavailable.

When viewing products in search results or category pages, each listing displays the main image, product name, base price (or price range when variants have different prices), seller shop name, and average rating if reviews exist.

### Wishlist Pagination

The customer wishlist is presented in a paginated format.

Deleted products are automatically removed from the customer's wishlist and do not appear in the paginated list.

The wishlist displays products at the product level, not specific variants.

### Order History Sorting and Display

The customer order history list is paginated and sorted by newest first.

Each entry in the list displays the order number, order date, total price, and overall order status.

### Review Sorting and Display

Reviews on the product detail page are sorted by newest first.

Deleted reviews are excluded from the product's review listing.

### Seller Order Item Filtering

Sellers can view a paginated list of all order items for their products.

Sellers can filter order items by status to narrow down visible items to a specific status.

### Administrator List Browsing

Administrators can view pending seller approval requests in a list format. Approved and rejected requests may be viewed in separate filtered views.

Administrators can view administrator requests in a list format. Rejected and approved requests may be viewed separately.

Administrators can view all products on the platform in a paginated list. Deleted products are included in administrator views for oversight purposes.

Administrators can view all orders on the platform in a paginated list.

Administrators can view all customer accounts in a list format. Banned customers are distinguishable as banned in the list.

Administrators can view all seller accounts in a list format. Suspended and banned sellers are distinguishable with their current status in the list.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Rejection Cases

Rejection occurs when business rules explicitly deny user actions.

- If a seller's registration request is rejected by an administrator, the seller can view the rejection reason provided by the administrator.
- Rejected sellers can submit a new registration request to attempt approval again.
- If a seller attempts to delete their account while having pending orders (items with paid or shipped status), the deletion request is rejected.
- If a seller attempts to delete their account while having pending cancellation or refund requests, the deletion request is rejected.
- When a seller is suspended, their products cannot be purchased.
- When a seller is suspended, their products are hidden from search and category listings.
- While suspended, sellers cannot create new products or edit existing products.
- Banned customers cannot log in to the platform.
- Banned sellers cannot log in to the platform.

### Failure Cases

Failure occurs when an external or operational system prevents a business transaction from completing.

- If payment processing through the external payment gateway fails, the order is not created.
- If payment fails, the customer can retry the payment and order placement.
- If a variant's stock quantity is less than the cart quantity for that item, a stock warning is displayed in the shopping cart.
- If a variant is deleted by the seller, that item is marked as unavailable in the customer's cart.
- If a variant is out of stock (zero stock quantity), that item is marked as unavailable in the customer's cart.
- Items marked as unavailable in the cart cannot be included in checkout.
- Out of stock variants cannot be added to the shopping cart.

### Exception Cases

Exception occurs when administrative overrides or time-triggered events deviate from normal user-driven flows.

- Administrators can force-cancel individual order items or entire orders regardless of the current item status.
- When an administrator force-cancels an item, the item is refunded to the customer and stock is restored.
- Administrators can force-refund individual order items or entire orders regardless of the current item status.
- When an administrator force-refunds an item, the item status changes to refunded and stock is restored.
- If a customer does not confirm delivery, all items in the shipment automatically transition to delivered status 14 days after shipping.
- Products with no variants are shown as unavailable in search and category listings, though the product remains visible.
- When a product is deleted by the seller, it is automatically removed from all customer wishlists.
- When an administrator deletes a category, products that were in that category become uncategorized.

### Error Scenarios

Error scenarios describe invalid operation attempts and state-dependent constraint violations.

- If a customer requests cancellation for an item that has already been shipped, the cancellation request is denied.
- If a customer requests cancellation for an item that has already been delivered, the cancellation request is denied.
- Cancellation requests can only be submitted for items with paid status.
- If a customer requests refund for an item that is not yet delivered, the refund request is denied.
- Refund requests can only be submitted for items with delivered status.
- If a refund request is submitted more than 7 days after an item was delivered, the refund request is denied.
- If a customer attempts to write a review for a product where their order item has not reached delivered status, the review cannot be created.
- A customer can write only one review per product per order.
- If a customer attempts to write a second review for the same product within the same order, the second review cannot be created.
- The overall order status is derived from the statuses of its constituent items according to defined rules.
- When a customer deletes their account, their profile information is deleted but their orders are preserved.
- When a customer deletes their account, their reviews are preserved but shown as deleted user.
- When a seller deletes their account, their products are deleted from listings but order history is preserved.

# Integration Error Handling

Error handling and retry policies for external integrations.

## Integration Failure Policies

Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

### Integration Error Handling

WHEN an integration error occurs during payment gateway communication, THE system SHALL report the error to the customer and not proceed with order creation.

IF an integration error occurs after payment initiation but before confirmation, THEN THE system SHALL treat the outcome as a failure and preserve cart items intact.

WHEN the payment gateway returns an unclear or ambiguous response, THE system SHALL treat it as an integration error and allow the customer to retry payment.

IF an integration error occurs during payment processing, THEN THE system SHALL NOT deduct stock quantities for the cart items.

IF an integration error occurs, THEN THE system SHALL NOT create an order or generate any order items.

### Payment Retry Behavior

WHEN a payment attempt fails, THE system SHALL allow the customer to retry payment using the same cart items and shipping address.

IF a customer retries payment after a failure, THEN THE system SHALL submit a new payment request to the payment gateway.

WHEN a payment retry fails again, THE system SHALL again allow the customer to retry without requiring them to rebuild their cart.

IF a customer retries payment multiple times and each attempt fails, THE system SHALL preserve the cart items and order details across retries.

WHEN a customer chooses to retry payment, THE system SHALL present the same order summary and shipping address from the previous attempt.

### Payment Failure Fallback

WHEN payment cannot be processed due to integration errors or gateway issues, THE system SHALL allow the customer to either retry payment or abandon the checkout.

IF a customer abandons checkout after a payment failure, THEN THE customer's cart items SHALL remain available for a future checkout attempt.

WHEN a payment failure occurs, THE system SHALL allow the customer to modify their cart items or shipping address before retrying.

IF the payment gateway becomes available again after a period of unavailability, THE system SHALL resume normal payment processing without requiring the customer to rebuild their cart.

WHEN a customer cannot complete payment due to persistent integration issues, THE system SHALL allow them to return to their shopping cart with all items preserved.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Format Validation

WHEN a seller attempts to upload a product image or seller profile logo, THE system SHALL accept only image files.
IF an uploaded file is not an image type, THEN THE system SHALL reject the upload.
The seller is notified that the upload was rejected due to unsupported file type.
File format validation applies to all seller image uploads.

### Content Type Verification

WHEN a seller uploads an image file, THE system SHALL verify the file content matches the declared file type.
IF the actual file content does not match the declared type, THEN THE system SHALL reject the upload.
The seller is notified of the rejection.

### Malicious Content Scanning

WHEN a file is uploaded, THE system SHALL scan the file for malicious content.
IF a file contains malicious content, THEN THE system SHALL reject the upload and immediately remove the file.
Files that fail the scan are not stored or retained on the platform.
The seller is notified that the upload was rejected due to a security concern.

### Uploaded File Retention via Snapshots

Product images and seller logo images are retained as long as their associated entity (product or seller profile) exists.
When a seller deletes a product image, the removed image is preserved within the product snapshot.
Deleted images remain preserved in archival snapshots for dispute resolution purposes.
Seller profile logo changes create a snapshot preserving the previous logo image.
Snapshot-based preservation ensures image history is available for relevant parties (owners, administrators).