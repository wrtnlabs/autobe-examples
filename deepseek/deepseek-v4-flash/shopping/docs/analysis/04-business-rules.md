**eCommerceMall — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Customer Rules

Customers must register with an email and password to use any platform features — guest browsing is not allowed. The email address serves as the unique identifier for each customer account. Customers can change their password at any time by providing their current password and a new one. When a customer requests account deletion, their profile information (display name and phone number) is permanently removed, but their order history and reviews are preserved. Reviews from deleted accounts appear as posted by "deleted user" so product ratings remain intact. Administrators have the authority to ban customers, which prevents the banned customer from logging into the platform. Administrators can also unban customers, restoring their access. A customer's display name and phone number can be edited freely through their profile settings.

### Customer Registration Email Validation

THE system SHALL require a unique email address for every customer registration.

IF a registration attempt is submitted with an email address already associated with an existing customer account, THEN THE system SHALL reject the registration and notify the attempting party that the email is already in use.

THE system SHALL require a password to accompany the email address during registration.

### Customer Password Change Validation

WHEN a customer requests a password change, THE system SHALL require the customer to provide their current password for identity verification.

IF the provided current password does not match the stored password for the customer account, THEN THE system SHALL reject the password change request.

THE system SHALL require a new password to be provided to complete the password change.

### Customer Account Deletion Rules

WHEN a customer requests account deletion, THE system SHALL permanently remove the customer's profile information (display name and phone number) from the platform.

WHEN a customer requests account deletion, THE system SHALL preserve all records of orders and order history associated with that customer for seller record-keeping and legal compliance purposes.

WHEN a customer requests account deletion, THE system SHALL preserve all reviews written by that customer on the platform.

### Deleted Customer Review Attribution

WHERE a review was authored by a customer account that has been deleted, THE system SHALL display the author field of that review as "deleted user".

THE system SHALL preserve the original rating score and text content of reviews written by deleted customer accounts.

THE system SHALL include reviews from deleted accounts when calculating the average rating of a product.

### Customer Ban and Unban Rules

WHEN an administrator bans a customer account, THE system SHALL prevent that customer from logging into the platform.

IF a banned customer attempts to log in, THEN THE system SHALL reject the login attempt and notify the customer that their account has been banned.

WHEN an administrator unbans a customer account, THE system SHALL restore that customer's ability to log into the platform using their email and password.

IF an unbanned customer attempts to log in, THEN THE system SHALL permit the login provided the email and password are correct.

### Customer Profile Editing Validation

WHERE a customer edits their display name, THE system SHALL accept and store the updated display name.

WHERE a customer edits their phone number, THE system SHALL accept and store the updated phone number.

THE system SHALL allow a customer to edit their display name and phone number independently of each other — modifying one field does not require updating the other.

## Seller Rules

Sellers register with an email and password, but their account requires administrator approval before they can begin selling products. Each seller has an approval status that can be pending, approved, or rejected. If a seller registration is rejected, the administrator must provide a rejection reason, and the seller can view this reason. Rejected sellers are permitted to submit a new registration request for reconsideration. A seller can delete their account only under specific conditions: they must have no pending orders in paid or shipped status, and no pending cancellation or refund requests for any of their products. When a seller deletes their account, their product listings are removed from the platform, but order history and product snapshots from past orders are preserved for legal and record-keeping purposes. Administrators can suspend a seller account, which hides the seller's products from search and category listings and prevents new purchases — however, the seller can still process existing orders, ship items, and respond to cancellation and refund requests. Suspended sellers cannot create new products or edit existing ones. Administrators can unsuspend a seller, restoring product visibility. Administrators can also ban sellers entirely, preventing login while preserving existing orders.

### Seller Registration and Approval Rules

**Approval Requirement**

A seller's registration MUST receive administrator approval before the seller account becomes active for selling. Until approval is granted, the seller cannot create products or engage in selling activities.

**Approval Statuses**

A seller registration SHALL have one of three approval statuses: "pending", "approved", or "rejected".

- When a seller submits a registration request, the status SHALL be set to "pending".
- When an administrator approves the request, the status SHALL change to "approved".
- When an administrator rejects the request, the status SHALL change to "rejected".

**Rejection Reason**

WHEN an administrator rejects a seller registration, the administrator MUST provide a rejection reason. The rejected seller SHALL be able to view this rejection reason.

**Rejected Seller Resubmission**

WHEN a seller's registration has been rejected, the seller SHALL be permitted to submit a new registration request. The new request SHALL reset the approval status to "pending" for administrator review.

### Seller Account Deletion Conditions

**Eligibility Requirements**

A seller MAY delete their account ONLY when the following conditions are ALL satisfied:

- The seller has no pending order items in "paid" or "shipped" status for any of their products.
- The seller has no pending cancellation requests for any of their order items.
- The seller has no pending refund requests for any of their order items.

IF any of these conditions are not met, the deletion request SHALL be rejected.

**Validation on Deletion**

WHEN a seller requests account deletion, the system SHALL validate each condition before permitting the deletion. The seller SHALL be informed of the reason if deletion is not allowed.

### Seller Account Deletion Consequences

**Product Removal**

WHEN a seller deletes their account:

- All products belonging to that seller SHALL be removed from listings.
- Deleted products SHALL no longer appear in search results or category listings.

**Order History Preservation**

WHEN a seller deletes their account:

- The seller's order history SHALL be preserved for seller records and legal purposes.
- The seller's shop name SHALL be preserved in past order records.
- Product snapshots captured at the time of purchase SHALL be preserved.

**Snapshot Preservation**

Snapshots of the seller's products and profiles SHALL be preserved even after account deletion.

### Seller Suspension Rules

**Suspension by Administrator**

Administrators SHALL have the authority to suspend a seller account.

**Effects of Suspension**

WHEN a seller account is suspended:

- The seller's products SHALL be hidden from search results and category listings.
- The seller's products SHALL not be purchasable by customers.
- The seller SHALL NOT be able to create new products.
- The seller SHALL NOT be able to edit existing products.
- The seller SHALL still be able to process existing orders, including shipping items.
- The seller SHALL still be able to respond to pending cancellation and refund requests for existing order items.

**Unsuspension**

Administrators SHALL have the authority to unsuspend a seller account. WHILE a seller is unsuspended:

- The seller's products SHALL become visible in search results and category listings again.
- The seller SHALL regain the ability to create new products and edit existing products.

### Seller Ban Rules

**Ban by Administrator**

Administrators SHALL have the authority to ban a seller account.

**Effects of Ban**

WHEN a seller account is banned:

- The banned seller SHALL NOT be able to log into their account.
- Existing orders for the banned seller's products SHALL be preserved.

**Unbanning**

Administrators SHALL have the authority to unban a seller account, restoring the seller's ability to log in.

## Category Rules

Categories are used to organize products and can have subcategories, but nesting is limited to exactly one level — subcategories cannot themselves have children. Each category has a name and a description that administrators define. Only administrators can create, edit, and delete categories. Customers are allowed to browse the full list of categories and view products assigned to a specific category. When an administrator deletes a category, all products that were assigned to it become uncategorized rather than being deleted themselves. Administrators can edit the name and description of any existing category at any time.

### Category Nesting Constraint

THE category hierarchy SHALL support a maximum nesting depth of two levels: a top-level category (depth 0) SHALL have subcategories (depth 1), and those subcategories SHALL have sub-subcategories (depth 2).

A top-level category SHALL be capable of having multiple direct child subcategories.

A subcategory at depth 1 SHALL be capable of having its own direct child subcategories at depth 2.

WHEN an administrator attempts to create a category at depth 3 or deeper, THEN the system SHALL reject the operation.

Each category SHALL have a parent category attribute that is either null for a top-level category or a reference to another category for a subcategory.

### Category Name and Description Validation

THE category name SHALL be a required field with a non-empty value.

THE category description SHALL be a required field with a non-empty value.

WHEN an administrator attempts to create or edit a category with an empty name or an empty description, THEN the system SHALL reject the operation.

### Category Management Authorization

ONLY administrators SHALL be permitted to create, edit, and delete categories.

WHEN a customer attempts to create, edit, or delete a category, THEN the system SHALL reject the operation.

WHEN a seller attempts to create, edit, or delete a category, THEN the system SHALL reject the operation.

Administrators SHALL be able to create a new category by providing a name and description, and optionally selecting a parent category to create a subcategory.

Administrators SHALL be able to edit the name and description of any existing category at any time.

Administrators SHALL be able to delete any category.

### Customer Category Access

Customers SHALL be able to browse the complete list of all categories, including both top-level categories and subcategories.

Customers SHALL be able to view all products assigned to a specific category.

WHEN a customer views products within a category, THE products displayed SHALL include only those directly assigned to that category.

### Category Deletion Effects on Products

WHEN an administrator deletes a category, THEN all products assigned to that category SHALL become uncategorized.

WHEN an administrator deletes a category, THE products themselves SHALL NOT be deleted.

## Product Rules

Every product requires a name, description, category assignment, and base price. A product belongs exclusively to the seller who created it. Sellers can edit their own products, and every edit automatically generates a product snapshot that preserves all product fields along with current variant states. A seller can delete their own product only if there are no pending order items in paid or shipped status for any variant of that product, and no pending cancellation or refund requests exist for any of its variants. Deleting a product removes all its variants and inventory records from listings, but snapshots are preserved. A product must have at least one variant to be purchasable; products with no variants remain visible in search results but are labeled as "unavailable." Administrators can view all products on the platform and can delete any product for policy violations.

### Product Creation Validation

THE system SHALL require a product to have a name, description, category assignment, and base price before it can be created.

Categories SHALL be nested at most two levels deep: a root category MAY have child subcategories, but a subcategory SHALL NOT have any children of its own (root → subcategory).

IF the name is missing, THEN THE system SHALL reject the product creation.

IF the description is missing, THEN THE system SHALL reject the product creation.

IF no category is assigned, THEN THE system SHALL reject the product creation.

IF the base price is missing or is a negative value, THEN THE system SHALL reject the product creation.

THE base price SHALL be a positive monetary value.

### Product Ownership and Editing Rules

A product belongs exclusively to the seller who created it. Only the owning seller may edit the product.

WHEN a seller edits their own product, THE system SHALL create a product snapshot that preserves all current product fields (name, description, category, base price, images) along with the current state of all variants at that moment.

IF a seller who does not own the product attempts to edit it, THE system SHALL reject the edit request.

### Product Deletion Conditions

A seller may delete their own product only when ALL of the following conditions are met:
- No order items exist in paid or shipped status for any variant of the product.
- No pending cancellation requests exist for any variant of the product.
- No pending refund requests exist for any variant of the product.

IF any variant of the product has order items in paid or shipped status, THEN THE system SHALL reject the product deletion.

IF any variant of the product has a pending cancellation request, THEN THE system SHALL reject the product deletion.

IF any variant of the product has a pending refund request, THEN THE system SHALL reject the product deletion.

WHEN a product is deleted, THE system SHALL delete all its variants and inventory records, and the product SHALL no longer appear in search results or category listings.

THE product snapshots SHALL be preserved even after the product is deleted.

### Variant Requirement for Purchasability

A product must have at least one variant to be purchasable.

IF a product has no variants, THEN THE system SHALL display the product in search results and category listings but SHALL label it as "unavailable."

Customers SHALL NOT be able to add an unavailable product to their cart or proceed to checkout with it.

### Administrator Product Oversight

Administrators SHALL have the authority to view all products on the platform, including products that have been deleted by their sellers.

Administrators SHALL have the authority to delete any product, regardless of seller ownership, for policy violations.

WHEN an administrator deletes a product, the same consequences apply as when a seller deletes their own product: all variants and inventory records are removed from listings, but product snapshots are preserved.

## ProductVariant Rules

Each variant within a product requires a unique SKU code that serves as its identifier, along with option values describing its specific combination (such as color and size). A variant can optionally override the product's base price with its own price. Stock quantity is required for each variant and starts at zero by default. Sellers can add variants to their products, edit existing variants (SKU code, option values, and price), and every edit creates a snapshot preserving the variant's state. A seller can delete a variant only if there are no pending order items in paid or shipped status for that variant and no pending cancellation or refund requests reference it. A product becomes purchasable only when it has at least one variant; if all variants are deleted, the product is shown as unavailable.

### Variant SKU Code Requirements

WHEN a seller creates a variant, THE system SHALL require a SKU code that is unique across all variants of all products.

IF a seller attempts to create or edit a variant with a SKU code that already exists for another variant on the platform, THEN the system SHALL reject the request.

THE SKU code SHALL be a required field for every variant.

### Variant Option Values Specification

WHEN a seller creates or edits a variant, THE system SHALL require option values to describe the variant's specific combination (e.g., color: "Red", size: "Large").

THE system SHALL record option values as key-value pairs representing the differentiating attributes of the variant.

### Variant Price Override Rules

A variant MAY optionally specify its own price that overrides the product's base price.

WHEN a variant has no price specified, THE system SHALL use the product's base price as the variant's effective price.

IF a variant's override price is specified, THE system SHALL use that price for all pricing calculations (cart, checkout, order) instead of the product's base price.

### Variant Stock Quantity Rules

THE system SHALL require a stock quantity for every variant at creation.

WHEN a variant is first created, THE system SHALL set its stock quantity to zero by default.

Current stock SHALL be calculated by summing all inventory records associated with the variant (defined in [InventoryRecord Rules]).

WHEN a variant's current stock reaches zero, THE system SHALL display the variant as "out of stock" and SHALL prevent it from being added to cart.

### Seller Variant Addition and Editing

A seller MAY add new variants to their own products.

A seller MAY edit existing variants of their own products, including the SKU code, option values, and price.

IF a seller attempts to add or edit a variant for a product they do not own, THEN the system SHALL reject the request.

### Variant Snapshot Requirements

WHEN a seller edits a variant, THE system SHALL create a snapshot preserving the variant's complete state before the change.

The variant snapshot SHALL include the SKU code, option values, price, and stock quantity at the moment of editing.

Snapshots SHALL be preserved even after the variant is deleted and SHALL be viewable by the product's seller and administrators.

### Variant Deletion Conditions

A seller MAY delete a variant from their own product only if ALL of the following conditions are met:
- There are no pending order items with status "paid" or "shipped" that reference the variant
- There are no pending cancellation requests associated with the variant
- There are no pending refund requests associated with the variant

IF any of the above conditions are not satisfied, THEN the system SHALL reject the variant deletion request.

Deleting a variant SHALL also delete all its associated inventory records.

### Product Purchasability Variant Requirement

A product SHALL be purchasable only when it has at least one variant.

IF a product has no variants, THEN the system SHALL display it in search and category listings as "unavailable" and SHALL prevent customers from adding it to their cart.

IF a product's last variant is deleted, THEN the product SHALL become unavailable immediately.

## ProductImage Rules

Sellers can upload multiple images for each product to showcase it from different angles. Images can be reordered, and the first image in the order serves as the main thumbnail that appears in search results and category listings. Sellers can delete individual images from their products at any time. Any image changes — additions, deletions, or reordering — are captured as part of the product snapshot when a product edit occurs, preserving the complete visual state of the product at that point in time.

### Product Multiple Image Upload

THE system SHALL allow sellers to upload multiple images for each product to showcase it from different angles.
IF a seller uploads an image file that is not a valid image format (e.g., corrupted file, disallowed extension), THEN THE system SHALL reject the upload and notify the seller of the invalid format.
WHERE a product already has images, THE system SHALL append the newly uploaded image to the end of the existing sort order.
THE system SHALL associate each uploaded image with the specific product it was uploaded for.

### Product Image Reordering and Thumbnail Assignment

THE system SHALL maintain a sort order position for each image belonging to a product.
WHEN a seller reorders the images of a product, THE system SHALL update the sort order positions of all affected images according to the seller's specified arrangement.
THE system SHALL designate the image with the lowest sort order position (first position) as the main thumbnail image for the product.
THE system SHALL display the main thumbnail image as the product's representative image in search results and category listings.
WHERE a product detail page is displayed, THE system SHALL show all product images in the order specified by their sort order positions.

### Seller Product Image Deletion

THE seller who owns a product SHALL be able to delete any individual image belonging to that product.
WHEN a seller deletes the current first-position (thumbnail) image, THE system SHALL reassign the next image in the sort order as the new thumbnail.
IF a seller deletes all images from a product, THEN THE product SHALL have no thumbnail image, and search results and category listings SHALL display the product without a thumbnail placeholder.

### Product Image Snapshot Capture

WHEN a seller adds an image to a product and subsequently edits that product, THE system SHALL capture the addition in the product snapshot, recording the new image's URL and its position in the sort order at that time.
WHEN a seller deletes an image from a product and subsequently edits that product, THE system SHALL capture the deletion in the product snapshot, recording that the image was removed and its previous sort order position.
WHEN a seller reorders the images of a product and subsequently edits that product, THE system SHALL capture the reordering in the product snapshot, recording the before and after sort order positions of each affected image.
THE system SHALL include all current image data (URLs and sort order positions) in every product snapshot created when a product edit occurs, thereby preserving the complete visual state of the product at that point in time.

## Address Rules

Customers can add multiple shipping addresses to their account for flexibility when placing orders. Each address requires a recipient name, phone number, street address, city, state or province, postal code, and country. Customers can edit any of these fields on their existing addresses and can also delete addresses they no longer need. One address can be designated as the default shipping address, which is pre-selected during checkout. Customers can change which address is the default at any time. Once an order is placed, the shipping address used for that order cannot be changed — it is frozen at the time of checkout.

### Address Addition and Required Field Validation

THE system SHALL allow customers to add multiple shipping addresses to their account.

THE system SHALL require each shipping address to include all of the following fields:
- Recipient name
- Phone number
- Street address
- City
- State or province
- Postal code
- Country

IF any required field is missing from an address, THEN THE system SHALL reject the addition and notify the customer which field is required.

THE system SHALL allow a maximum of one address entry per unique combination of recipient name, street address, and postal code for the same customer.

### Address Editing Rules

THE system SHALL allow customers to edit any field of their existing shipping addresses, including the recipient name, phone number, street address, city, state or province, postal code, and country.

WHEN a customer edits an address, THE system SHALL validate that all required fields are present and non-empty before accepting the update.

IF the edited address was the customer's default shipping address, THE system SHALL preserve the default designation on the updated address.

### Address Deletion Rules

THE system SHALL allow customers to delete any of their saved shipping addresses.

WHEN a customer deletes an address, THE system SHALL remove it permanently from the customer's account.

IF the deleted address was the customer's default shipping address, THEN THE system SHALL clear the default designation. The customer SHALL be required to set a new default address before placing their next order.

Addresses that are frozen (immutable) due to being associated with a completed order SHALL remain available for reference in that order's details but MAY be deleted from the customer's active address list.

### Default Shipping Address Designation

THE system SHALL allow each customer to designate exactly one of their saved addresses as the default shipping address.

WHEN a customer sets an address as default, THE system SHALL remove the default designation from any previously designated address.

WHERE a default shipping address is designated, THE system SHALL pre-select it during the checkout address selection step.

THE system SHALL allow customers to change their default shipping address at any time by selecting a different saved address.

IF no default address is set, THE system SHALL require the customer to select or add an address during checkout before proceeding.

### Checkout Address Selection and Shipping Address Immutability

WHEN a customer proceeds to checkout, THE system SHALL present the customer's saved shipping addresses for selection.

WHERE a default shipping address exists, THE system SHALL pre-select it as the shipping address for the order.

THE system SHALL allow the customer to select a different saved address or add a new address during checkout.

WHEN an order is placed successfully, THE system SHALL freeze the shipping address used for that order. THE frozen address SHALL be immutable and SHALL NOT be editable or replaceable after order placement.

The frozen shipping address SHALL be recorded as part of the order record and SHALL be preserved in snapshots for order history and legal purposes.

## CartItem Rules

Customers add items to their cart by selecting a specific product variant and specifying the desired quantity. If the same variant is already in the cart, the quantities are merged into a single cart line rather than creating a duplicate entry. Customers can view all items in their cart, with each line showing the product name, variant options, unit price, quantity, and subtotal. The cart displays the combined total price of all items. Customers can change the quantity of any item or remove items entirely. If a variant's current stock is less than the cart quantity, a warning is displayed to the customer. If a variant is deleted or becomes out of stock, it is marked as unavailable in the cart, and unavailable items cannot be checked out.

### Cart Variant Selection Requirement

THE system SHALL require a customer to select a specific product variant (not just a product) when adding an item to the cart.

WHEN a customer attempts to add a product without selecting a variant, THEN the system SHALL reject the request.

WHEN a customer selects a variant that does not belong to the specified product, THEN the system SHALL reject the request.

### Cart Quantity Specification

WHEN a customer adds an item to the cart, THE system SHALL require the customer to specify a quantity for the selected variant.

THE quantity SHALL be a positive whole number.

WHEN the specified quantity is zero or negative, THEN the system SHALL reject the request.

WHEN the specified quantity exceeds the current stock of the variant, THEN the system SHALL accept the item but display a stock insufficiency warning (defined in [Cart Stock Insufficiency Warning]).

### Cart Duplicate Variant Merging

WHEN a customer adds a variant to the cart, IF that same variant already exists in the customer's cart, THEN THE system SHALL combine the new quantity with the existing quantity rather than creating a separate cart line.

WHEN the combined quantity from merging exceeds the current stock of the variant, THEN THE system SHALL still accept the merge but display a stock insufficiency warning (defined in [Cart Stock Insufficiency Warning]).

### Cart Item Details and Total Price Display

WHEN a customer views their cart, THE system SHALL display each cart line with the following details: product name, selected variant option values, unit price of the variant, the current quantity, and the subtotal (unit price multiplied by quantity).

THE system SHALL calculate and display the total price as the sum of all subtotals across all cart lines.

THE system SHALL sort cart lines by the order in which items were added, with the most recently added item appearing last.

IF no items are in the cart, THEN THE system SHALL display an empty cart state with no total price.

### Cart Quantity Change

WHEN a customer changes the quantity of an existing cart item, THE system SHALL update the quantity to the new specified value (not merge or add to the existing quantity).

THE new quantity SHALL be a positive whole number.

WHEN the customer sets the quantity to zero or a negative number, THEN THE system SHALL remove the item from the cart (as if the customer had removed it).

WHEN the new quantity exceeds the current stock of the variant, THEN THE system SHALL accept the quantity change but display a stock insufficiency warning (defined in [Cart Stock Insufficiency Warning]).

WHEN the variant is deleted or out of stock, THEN THE system SHALL reject any quantity change and mark the item as unavailable (defined in [Cart Unavailable Item Handling]).

### Cart Item Removal

WHEN a customer removes an item from their cart, THE system SHALL delete the corresponding cart line entirely.

WHEN an item is removed, THE system SHALL recalculate the total price accordingly.

THE system SHALL allow removal of any cart item regardless of its availability status or the variant's stock condition.

### Cart Stock Insufficiency Warning

WHEN a variant in the cart has a current stock quantity that is less than the cart quantity, THEN THE system SHALL display a warning to the customer indicating that the requested quantity exceeds available stock.

THE warning SHALL be displayed until the cart quantity is adjusted to be equal to or less than the available stock, or the item is removed.

THE warning SHALL not prevent the customer from viewing or modifying other items in the cart.

WHEN the variant's stock is replenished to meet or exceed the cart quantity, THEN THE system SHALL remove the warning automatically.

### Cart Unavailable Item Handling

WHEN a variant in the cart is deleted by the seller (defined in [ProductVariant Rules]), THEN THE system SHALL mark the corresponding cart line as unavailable.

WHEN a variant in the cart has its stock quantity reach zero (defined in [InventoryRecord Rules]), THEN THE system SHALL mark the corresponding cart line as unavailable.

WHEN a cart line is marked as unavailable, THE system SHALL:
- Display the item with an "unavailable" or "out of stock" indicator
- Prevent the item from being included in checkout
- Allow the customer to remove the item from the cart
- Allow the customer to change the quantity (if the variant still exists but is out of stock)

WHEN a customer proceeds to checkout (defined in [Order Rules]), IF any cart line is marked as unavailable, THEN THE system SHALL reject the checkout and inform the customer which items are unavailable.

WHEN a customer deletes the unavailable variant from their cart, THE system SHALL remove the cart line without further restrictions.

WHEN a customer's cart contains both available and unavailable items, THE system SHALL clearly distinguish between them so the customer can identify which items can be checked out.

## WishlistItem Rules

Customers can add products to their wishlist for future consideration, but the wishlist operates at the product level rather than the variant level. The wishlist is paginated to support browsing when customers have many saved products. Customers can remove any product from their wishlist at any time. If a seller deletes a product, that product is automatically removed from all customers' wishlists to prevent references to unavailable items.

### Wishlist Product Addition

THE system SHALL allow customers to add products to their wishlist only if the product exists in the system and has not been deleted.

WHEN a customer attempts to add a product that does not exist or has been deleted, THE system SHALL reject the request.

WHEN a customer attempts to add a product that is already in their wishlist, THE system SHALL treat the request as successful (idempotent behavior) and SHALL NOT create a duplicate entry.

THE wishlist SHALL operate at the product level. Customers add entire products, not specific variants.

### Wishlist Product Removal

THE system SHALL allow customers to remove any product from their own wishlist at any time.

WHEN a customer requests removal of a product that is not in their wishlist, THE system SHALL treat the request as successful (idempotent behavior).

Removing a product from a wishlist SHALL NOT affect the product listing, its variants, inventory records, or any other customer's wishlist.

### Deleted Product Automatic Cleanup

WHEN a seller deletes their product, THE system SHALL immediately and automatically remove that product from all customers' wishlists.

WHEN an administrator deletes a product (for policy violations), THE system SHALL immediately and automatically remove that product from all customers' wishlists.

THE system SHALL NOT notify customers whose wishlists are affected by the automatic cleanup.

THE system SHALL ensure that deleted products no longer appear in any customer's wishlist upon viewing.

### Unavailable Product Handling in Wishlist

WHILE a product's seller is suspended, THE system SHALL mark the product as unavailable when displayed in a customer's wishlist, but SHALL NOT remove it from the wishlist.

WHEN a suspended seller is unsuspended, THE previously unavailable products in wishlists SHALL become available again without requiring customers to re-add them.

WHEN a product has no purchasable variants (all variants have zero stock or are deleted), THE system SHALL mark the product as unavailable in the wishlist but SHALL NOT remove it.

### Wishlist Viewing and Pagination

WHEN a customer views their wishlist, THE system SHALL display a paginated list of products.

THE system SHALL order wishlist products by the date they were added, with newest additions appearing first.

THE pagination for wishlist viewing SHALL follow the platform's standard pagination rules (defined in [List Browsing Expectations]).

THE system SHALL exclude products that have been automatically removed (due to deletion) from the wishlist view.

## Order Rules

An order is created only after payment processing succeeds. Each order contains one or more order items, and items within the same order can belong to different sellers. The overall order status is derived from the statuses of its individual items: if all items are paid, the order is paid; if any item is shipped and none delivered, the order is shipped; if all items are delivered, the order is delivered; if all items are cancelled, the order is cancelled; if all items are refunded, the order is refunded; and mixed states result in a partially completed status. Customers can view their complete order history in a paginated list sorted with the newest orders first, with each entry showing the order number, date, total price, and overall status. Administrators have the authority to force-cancel individual items or entire orders, which refunds the customer and restores stock. Administrators can also force-refund individual items or entire orders.

### Order Creation on Successful Payment

WHEN payment processing succeeds for a checkout request, THE system SHALL create an order with all items initially set to status "paid".

WHEN payment processing fails for a checkout request, THE system SHALL NOT create an order AND THE customer SHALL be able to attempt payment again.

IF payment processing fails, THEN THE items in the customer's cart SHALL remain unchanged so the customer can retry checkout.

THE system SHALL NOT allow an order to be created without successful payment processing.

### Order Multi-Item and Multi-Seller Structure

An order SHALL contain one or more order items.

Each order item SHALL represent a specific product variant with a quantity and the price at the time of purchase.

WHEN a customer purchases multiple units of the same product variant, THE system SHALL consolidate them into a single order item with the combined quantity (defined in [OrderItem Rules]).

Order items within the same order MAY belong to different sellers.

WHEN an order contains items from different sellers, THE system SHALL manage each order item independently, including separate status tracking and separate shipment grouping per seller (defined in [Shipment Rules]).

### Overall Order Status Derivation

THE system SHALL derive the overall order status from the statuses of its individual items.

WHEN all items in the order have status "paid", THEN THE overall order status SHALL be "paid".

WHEN any item in the order has status "shipped" AND no item has status "delivered", THEN THE overall order status SHALL be "shipped".

WHEN all items in the order have status "delivered", THEN THE overall order status SHALL be "delivered".

WHEN all items in the order have status "cancelled", THEN THE overall order status SHALL be "cancelled".

WHEN all items in the order have status "refunded", THEN THE overall order status SHALL be "refunded".

WHEN items have a mixture of statuses that does not match any single-status rule above (e.g., some delivered and some refunded, or some delivered and some paid), THEN THE overall order status SHALL be "partially completed".

IF an order contains no items, THEN THE request SHALL be rejected as invalid.

### Customer Order History Viewing

WHEN a customer views their order history, THE system SHALL display a paginated list of their orders.

WHEN displaying the order history list, THE system SHALL sort orders with the most recently created order first.

Each entry in the order history list SHALL include:
- The order number
- The order date
- The total price
- The overall order status

WHEN a customer views the full details of an order, THE system SHALL display:
- The list of items, each with product name, variant options, quantity, price, and item status
- The shipping address used for the order
- The list of shipments, each with tracking information and which items are included

IF the requested order does not belong to the requesting customer, THEN THE request SHALL be rejected.

IF the requested order does not exist, THEN THE request SHALL be rejected.

### Administrator Force-Cancel Authority

WHEN an administrator force-cancels an individual order item, THE system SHALL change that item's status to "cancelled", refund the customer for that item, AND restore the stock quantity of the corresponding product variant.

WHEN an administrator force-cancels an entire order, THE system SHALL change all items in the order to status "cancelled", refund the customer for all items, AND restore stock quantities for all product variants in the order.

WHEN an administrator force-cancels an order item or an entire order, THE system SHALL create an inventory record for each restored stock quantity with reason "force-cancelled" (defined in [InventoryRecord Rules]).

IF the requested order item does not exist, THEN THE force-cancel request SHALL be rejected.

IF the requested order does not exist, THEN THE force-cancel request SHALL be rejected.

### Administrator Force-Refund Authority

WHEN an administrator force-refunds an individual order item, THE system SHALL change that item's status to "refunded", refund the customer for that item, AND restore the stock quantity of the corresponding product variant.

WHEN an administrator force-refunds an entire order, THE system SHALL change all items in the order to status "refunded", refund the customer for all items, AND restore stock quantities for all product variants in the order.

WHEN an administrator force-refunds an order item or an entire order, THE system SHALL create an inventory record for each restored stock quantity with reason "force-refunded" (defined in [InventoryRecord Rules]).

IF the requested order item does not exist, THEN THE force-refund request SHALL be rejected.

IF the requested order does not exist, THEN THE force-refund request SHALL be rejected.

## OrderItem Rules

Each order item represents a specific product variant purchased in a given quantity. If a customer buys three of the same variant, that is captured as a single order item with quantity three rather than three separate entries. Each order item has its own independent status — paid, shipped, delivered, cancelled, or refunded — that can differ from other items in the same order. Customers can request cancellation or refund on individual order items without affecting other items in the order. When an order is placed, a snapshot of the purchased product and variant is saved with each order item, preserving the product name, description, variant options, and price at the time of purchase. A snapshot of each seller's profile (shop name and logo) is also saved with each order item.

### Order Item Variant and Quantity Representation

THE system SHALL associate each order item with exactly one product variant and a quantity indicating how many units of that variant were purchased.

WHEN a customer purchases multiple units of the same variant from the same seller in a single order, THE system SHALL consolidate those units into a single order item with the combined quantity rather than creating separate order items for each unit.

THE system SHALL record the variant price at the time of purchase as the unit price for the order item.

THE system SHALL calculate the order item subtotal as the unit price multiplied by the quantity.

### Order Item Status Independence and Transitions

THE system SHALL assign each order item an independent status that can differ from other order items within the same order.

THE status of an order item SHALL be one of the following: paid, shipped, delivered, cancelled, or refunded.

WHEN an order is created after successful payment, THE system SHALL set the status of each order item to "paid".

WHEN a seller creates a shipment containing an order item, THE system SHALL change that order item's status to "shipped".

WHEN a customer confirms delivery of a shipment, THE system SHALL change the status of all order items within that shipment to "delivered".

IF a customer does not confirm delivery of a shipment within 14 days from the shipping date, THEN THE system SHALL automatically change the status of all order items within that shipment to "delivered".

WHEN a cancellation request is approved for an order item, THE system SHALL change that order item's status to "cancelled".

WHEN a refund request is approved for an order item, THE system SHALL change that order item's status to "refunded".

### Order Item Individual Cancellation and Refund Scope

WHEN a cancellation request is approved for an order item, THE system SHALL change only that specific order item's status to "cancelled" without affecting the status of other order items in the same order.

WHEN a refund request is approved for an order item, THE system SHALL change only that specific order item's status to "refunded" without affecting the status of other order items in the same order.

IF an order item is cancelled or refunded, THEN THE system SHALL restore the stock quantity of the associated product variant by the quantity of the cancelled or refunded order item.

The remaining order items in the same order SHALL continue processing normally regardless of cancellation or refund of a different order item within the same order.

### Order Item Product Snapshot on Purchase

WHEN an order is placed, THE system SHALL create a snapshot of the purchased product and its variant for each order item.

THE product snapshot for an order item SHALL preserve the product name and product description as they existed at the time of purchase.

THE variant snapshot for an order item SHALL preserve the variant option values and unit price as they existed at the time of purchase.

THE product snapshot SHALL be immutable and remain permanently associated with the order item, even if the seller later edits or deletes the original product or variant.

### Order Item Seller Profile Snapshot on Purchase

WHEN an order is placed, THE system SHALL create a snapshot of the seller's profile for each order item.

THE seller profile snapshot for an order item SHALL preserve the seller's shop name and logo image as they existed at the time of purchase.

THE seller profile snapshot SHALL be immutable and remain permanently associated with the order item, even if the seller later edits their shop name or logo image.

## Shipment Rules

A shipment is a package sent by a seller that can contain one or more order items from that same seller. Different sellers always ship their items in separate shipments even if they belong to the same order. A seller has the flexibility to either bundle multiple items into a single shipment or ship each item individually. When creating a shipment, the seller enters tracking information consisting of the carrier name and tracking number. All items included in the same shipment share the same tracking information. When a shipment is created, all items within it change to the shipped status automatically. Customers can view the tracking information for each shipment and confirm delivery on a per-shipment basis. When a customer confirms delivery, all items in that shipment change to delivered status. If the customer does not confirm delivery, items automatically change to delivered status after 14 days from the shipping date.

### Shipment Seller and Item Grouping

WHEN a seller creates a shipment, THE system SHALL only allow order items belonging to that same seller to be included in the shipment.

WHEN a seller creates a shipment, THE system SHALL reject the shipment if any selected order item belongs to a different seller.

When an order contains items from multiple sellers, THE system SHALL require each seller to ship their items in separate shipments.

THE seller SHALL have the flexibility to either bundle multiple order items into a single shipment or ship each order item individually in separate shipments.

IF a seller selects no order items for a shipment, THEN THE system SHALL reject the shipment creation.

### Shipment Tracking Information

WHEN a seller creates a shipment, THE system SHALL require the carrier name to be provided.

WHEN a seller creates a shipment, THE system SHALL require the tracking number to be provided.

IF the carrier name is missing, THEN THE system SHALL reject the shipment creation.

IF the tracking number is missing, THEN THE system SHALL reject the shipment creation.

All order items within the same shipment SHALL share the same carrier name and tracking number.

### Shipment Creation and Item Status Change

WHEN a shipment is successfully created, THE system SHALL automatically change the status of all included order items to "shipped".

The status change on shipment creation SHALL occur regardless of whether the seller bundled multiple items or shipped individually.

IF a seller attempts to add an order item to a shipment that has a status other than "paid" (as defined in OrderItem Rules), THEN THE system SHALL reject the operation.

IF a seller attempts to create a shipment with an order item that is already in another shipment, THEN THE system SHALL reject the operation.

### Customer Tracking and Delivery Confirmation

THE customer SHALL be able to view the tracking information (carrier name and tracking number) for each shipment associated with their orders.

WHEN a customer confirms delivery for a shipment, THE system SHALL change the status of all order items within that shipment to "delivered".

Delivery confirmation SHALL be performed on a per-shipment basis, not on a per-item basis.

IF a shipment contains items that have already been individually cancelled or refunded, THEN those items SHALL NOT be affected when the customer confirms delivery for the remaining items in that shipment.

### Automatic Delivery After 14 Days

IF a customer does not confirm delivery within 14 days from the shipping date, THEN THE system SHALL automatically change the status of all order items in the shipment to "delivered".

The 14-day period SHALL begin from the date the shipment was created (the shipping date).

The automatic delivery SHALL apply to all order items in the shipment, even if the shipment contains multiple items.

IF an order item in the shipment has already been individually cancelled or refunded before the automatic delivery date, THEN that item SHALL remain in its current status and SHALL NOT be affected by the automatic delivery.

## CancellationRequest Rules

Cancellation requests are handled at the individual order item level, not for the entire order. A customer can request cancellation only for order items that have a paid status, meaning the item has not yet been shipped. Each cancellation request must include a reason provided as text. The seller who owns the item reviews the request and can either approve or reject it. When the seller responds, a snapshot of the cancellation request state is created to record the outcome. If the seller approves the cancellation, the item is cancelled, a refund is processed for that item only, and the stock quantity is restored through an inventory record. The remaining items in the order continue processing normally. If all items in an order are cancelled, the entire order status becomes cancelled.

### Cancellation Scope and Eligibility

Cancellation requests are handled at the individual order item level, not for entire orders. A customer may request cancellation only for order items that have a "paid" status — meaning the item has not yet been shipped by the seller. Order items with "shipped" or "delivered" status are not eligible for cancellation; those items must use the refund process instead. If an order item is not found or does not belong to the requesting customer, the cancellation request is rejected.

### Cancellation Request Content

Each cancellation request must include a reason provided as text. The reason field is required; if the reason is empty or missing, the cancellation request is rejected. The request is automatically associated with the customer who submitted it and the specific order item being cancelled.

### Seller Response and Snapshot

The seller who owns the order item reviews the cancellation request and can either approve or reject it. When rejecting, the seller may optionally provide a reason for the rejection. Upon the seller's response, a snapshot of the cancellation request state is created. This snapshot records the timestamp of the response, whether the request was approved or rejected, and any reason provided. This snapshot is immutable and preserved for dispute resolution purposes.

### Effects of Approved Cancellation

When a seller approves a cancellation request, the following occurs:

- The order item's status changes to "cancelled".
- A refund is processed for that specific item only. The refund covers the item's purchase price as recorded in the order item.
- The stock quantity for the associated product variant is restored by creating a positive inventory record (quantity increase) with the reason set to "cancellation".
- The remaining order items in the same order continue processing normally and are unaffected by the cancellation of this item.
- If all order items in an order are cancelled, the overall order status becomes "cancelled".

The cancellation request itself is final once the seller responds — no further edits or reversals are permitted.

## RefundRequest Rules

Refund requests are handled at the individual order item level rather than the entire order. A customer can request a refund only for order items that have a delivered status. The refund request must be made within 7 days of the item being delivered — requests outside this window are not permitted. Each refund request must include a reason provided as text. The seller who owns the item reviews the request and can either approve or reject it. When the seller responds, a snapshot of the refund request state is created. If the seller approves the refund, the item is refunded and the stock quantity is restored through an inventory record. The remaining items in the order are unaffected. If all items in an order are refunded, the entire order status becomes refunded.

### Refund Request Per Order Item

Refund requests are handled at the individual order item level, not at the entire order level. A customer may request a refund for a specific order item within an order without affecting other items in the same order.

### Refund Eligibility Conditions

A refund request is eligible only when the following conditions are all met:

- The order item has a status of "delivered". Items with any other status (paid, shipped, cancelled, refunded) are not eligible for refund.
- The refund request is made within 7 calendar days of the item being delivered. The 7-day period begins on the date the item's status changed to "delivered".
- The customer has not already submitted a refund request for that specific order item.

IF a refund request is submitted for an ineligible item, THEN the request is rejected with an explanation of why the item is not eligible.

### Refund Request Reason Requirement

WHEN a customer submits a refund request, THE system SHALL require the customer to provide a reason in text form. The reason must not be empty. THE system SHALL reject any refund request submitted without a reason.

### Seller Refund Response

WHEN a refund request is submitted, THE seller who owns the order item SHALL review the request and respond by either approving or rejecting it.

- IF the seller approves the refund, THE system SHALL process the refund for that item and restore the stock quantity.
- IF the seller rejects the refund, THE system SHALL record the rejection and notify the customer.
- WHEN the seller responds (either approve or reject), THE system SHALL create a snapshot of the refund request state, recording the decision, the timestamp, and the state before and after the response.

### Approved Refund: Stock Restoration

WHEN a seller approves a refund request, THE following actions occur:

- THE order item's status changes to "refunded".
- THE stock quantity for the associated product variant is increased by the refunded quantity. This is recorded through an inventory record with reason "refund" and the quantity change set to the positive refunded amount.
- THE refund amount is processed (assume external payment gateway integration for the refund transaction).

### Remaining Order Items Unaffected by Refund

WHEN a refund is processed for a specific order item, THE other order items within the same order SHALL continue processing normally with their existing statuses unchanged. A refund for one item does not trigger refunds for any other items in the order.

### Full Order Refunded Status Determination

WHEN all items within an order have a status of "refunded", THE overall order status SHALL become "refunded". IF only some items are refunded while others have different statuses, THE overall order status SHALL be "partially completed" rather than "refunded".

### Refund Request Time Window Enforcement

IF a customer attempts to submit a refund request after the 7-day window has passed, THEN THE system SHALL reject the request. THE system SHALL compare the refund request submission timestamp against the item's delivery timestamp. Any request beyond 7 calendar days from delivery is automatically ineligible and will not be forwarded to the seller for review.

## Review Rules

Customers can write reviews only for products they have purchased and only after the relevant order item has reached delivered status. Each customer can write at most one review per product per order. A review requires a rating of 1 to 5 stars, and an optional text description can be included. Reviews are displayed on the product detail page sorted with the newest first. Customers can edit their own reviews, and every edit creates a snapshot that records the previous and new content. Customers can also delete their own reviews, but the snapshots are preserved for record-keeping. The product's average rating displayed to customers is calculated from all non-deleted reviews. If a customer deletes their account, their reviews remain visible but are attributed to "deleted user."

### Review Eligibility Rules

**Ubiquitous Requirements**

- THE system SHALL allow customers to write reviews only for products they have purchased.
- THE system SHALL allow customers to write reviews only for order items whose status is delivered.
- THE system SHALL limit each customer to at most one review per product per order.

**Validation Rules**

- WHEN a customer attempts to write a review for a product they have not purchased, THEN THE system SHALL reject the request.
- WHEN a customer attempts to write a review for an item whose status is not delivered, THEN THE system SHALL reject the request.
- WHEN a customer who has already submitted a review for a given product in a given order attempts to submit another review for the same product in the same order, THEN THE system SHALL reject the request.

**Error Scenarios**

- IF the customer has not purchased the product, THEN THE system SHALL return an error indicating that the customer is not eligible to review this product.
- IF the order item has not reached delivered status, THEN THE system SHALL return an error indicating that the item must be delivered before it can be reviewed.
- IF a review already exists for this product in this order, THEN THE system SHALL return an error indicating that a review has already been submitted.

### Review Content Rules

**Ubiquitous Requirements**

- THE system SHALL require a numeric rating between 1 and 5 stars for every review.
- THE system SHALL accept an optional text description for every review.

**Validation Rules**

- WHEN a customer submits a review without a rating, THEN THE system SHALL reject the request.
- WHEN a customer submits a review with a rating less than 1, THEN THE system SHALL reject the request.
- WHEN a customer submits a review with a rating greater than 5, THEN THE system SHALL reject the request.
- WHEN a customer submits a review with a non-integer rating, THEN THE system SHALL reject the request.

**Error Scenarios**

- IF the rating is missing, THEN THE system SHALL return an error indicating that a rating is required.
- IF the rating is outside the 1-to-5 range, THEN THE system SHALL return an error indicating that the rating must be between 1 and 5.

### Review Display Rules

**Ubiquitous Requirements**

- THE system SHALL display reviews on the product detail page sorted by newest first.
- THE system SHALL calculate the product average rating using only non-deleted reviews.
- THE system SHALL display the average rating and the total count of non-deleted reviews on the product detail page.

**Validation Rules**

- WHEN a product has no non-deleted reviews, THEN THE system SHALL display an average rating of zero and a review count of zero.
- WHEN a product has non-deleted reviews, THEN THE system SHALL display the average of all non-deleted review ratings, rounded to one decimal place.

### Review Modification Rules

**Ubiquitous Requirements**

- THE system SHALL allow customers to edit their own reviews.
- WHEN a customer edits a review, THEN THE system SHALL create a snapshot recording the previous and new content (rating and text).
- THE system SHALL allow customers to delete their own reviews.
- WHEN a customer deletes a review, THEN THE system SHALL preserve all snapshots of that review.

**Validation Rules**

- WHEN a customer attempts to edit a review that does not belong to them, THEN THE system SHALL reject the request.
- WHEN a customer attempts to delete a review that does not belong to them, THEN THE system SHALL reject the request.
- WHEN a customer edits a review, THEN THE system SHALL update the rating and text to the new values provided by the customer.
- WHEN a customer deletes a review, THEN THE system SHALL mark the review as deleted rather than permanently removing it.

**Error Scenarios**

- IF the customer attempts to edit a review owned by another customer, THEN THE system SHALL return an error indicating that only the review author can edit the review.
- IF the customer attempts to delete a review owned by another customer, THEN THE system SHALL return an error indicating that only the review author can delete the review.

### Deleted Account Review Attribution

**Ubiquitous Requirements**

- WHEN a customer deletes their account, THEN THE system SHALL preserve all reviews written by that customer.
- WHEN a customer deletes their account, THEN THE system SHALL change the display name on their preserved reviews to deleted user.
- THE system SHALL still include reviews attributed to deleted user in product average rating calculations (defined in Review Display Rules).

**Validation Rules**

- WHEN a customer deletes their account, THEN THE system SHALL NOT delete their reviews.
- WHEN a customer deletes their account, THEN THE system SHALL NOT remove their reviews from the total review count for average rating purposes.

## InventoryRecord Rules

Each product variant has its own stock quantity, which is managed exclusively through inventory records rather than being stored as a single mutable value. The current stock level is calculated by summing all inventory records for that variant. Each inventory record captures a quantity change, a reason for the change, and a timestamp. Positive quantity changes represent restocking by the seller, while negative changes represent adjustments, losses, or orders. When an order is placed, the system automatically creates a negative inventory record for each purchased variant. When an order is cancelled or refunded, the system automatically creates a positive inventory record to restore the stock. Sellers can manually add inventory (restock) with a quantity and reason, and can also manually subtract inventory (adjustment or loss) with a quantity and reason. When a variant's stock reaches zero, it is shown as out of stock and cannot be added to the cart.

### Inventory Record Based Stock Management

THE system SHALL manage stock quantities exclusively through inventory records rather than storing a single mutable stock value.

THE system SHALL NOT allow direct modification of a variant's stock level outside of inventory records.

Each product variant SHALL have its own stock quantity tracked independently from other variants.

### Inventory Record Structure

Each inventory record SHALL contain the following required fields:
- A quantity change (positive or negative integer value, cannot be zero)
- A reason describing why the change occurred (text, required)
- A timestamp automatically recorded by the system when the record is created

IF a quantity change value is zero, THEN THE system SHALL reject the inventory record.

IF a reason is missing or empty, THEN THE system SHALL reject the inventory record.

### Stock Calculation by Sum

THE system SHALL calculate the current stock level of a variant by summing the quantity changes of all inventory records associated with that variant.

THE system SHALL display the calculated stock level whenever stock quantity is shown to users.

IF no inventory records exist for a variant, THEN THE system SHALL display the stock level as zero.

### Positive Quantity Changes (Restocking)

Sellers SHALL be able to manually add inventory for their variants by creating an inventory record with a positive quantity change and a reason.

WHEN a seller creates a positive inventory record, THE reason SHALL describe the source or cause of the restocking (e.g., "Supplier delivery", "Returned from customer").

THE system SHALL record a timestamp automatically when the seller adds inventory.

### Negative Quantity Changes (Manual Adjustments)

Sellers SHALL be able to manually subtract inventory for their variants by creating an inventory record with a negative quantity change and a reason.

WHEN a seller creates a negative inventory record, THE reason SHALL describe the cause of the reduction (e.g., "Damaged goods", "Inventory loss").

IF the absolute value of a manual negative quantity change exceeds the current calculated stock level, THEN THE system SHALL reject the adjustment (stock cannot go below zero through manual adjustment).

### Automatic Inventory Deduction on Order Placement

WHEN an order is placed successfully, THE system SHALL automatically create a negative inventory record for each purchased variant.

The automatically created inventory record SHALL have:
- A quantity change equal to the negative value of the purchased quantity
- A reason that identifies the order (e.g., "Order #[order number] placed")
- A timestamp automatically recorded by the system

IF the purchased quantity exceeds the current calculated stock for any variant, THEN THE system SHALL NOT allow the order to be placed.

### Automatic Stock Restoration on Cancellation and Refund

WHEN an order item is cancelled and the cancellation is approved, THE system SHALL automatically create a positive inventory record to restore the stock for that variant.

WHEN an order item is refunded and the refund is approved, THE system SHALL automatically create a positive inventory record to restore the stock for that variant.

WHEN an administrator force-cancels an order item, THE system SHALL automatically create a positive inventory record to restore the stock for that variant.

WHEN an administrator force-refunds an order item, THE system SHALL automatically create a positive inventory record to restore the stock for that variant.

Each automatically created restoration record SHALL have:
- A quantity change equal to the positive value of the original purchased quantity
- A reason that identifies the cancellation or refund (e.g., "Cancellation of Order #[order number] item", "Refund of Order #[order number] item")
- A timestamp automatically recorded by the system

### Out of Stock Variant Handling

WHEN a variant's calculated stock level is zero, THE system SHALL display the variant as "out of stock" wherever variant information is shown.

WHILE a variant is out of stock, THE system SHALL prevent customers from adding that variant to their shopping cart.

IF a variant's stock level changes from zero to a positive value (through restocking or automatic restoration), THEN THE system SHALL update the display to show the variant as available and allow cart addition.

### Inventory History Visibility

Sellers SHALL be able to view the full inventory history of each of their variants, including all inventory records with their quantity changes, reasons, and timestamps.

Administrators SHALL be able to view the full inventory history of any variant on the platform.

Customers SHALL NOT be able to view inventory records or inventory history.

## Snapshot Rules

Since this platform handles financial transactions, all data modifications must be recorded through snapshots. Each snapshot records when the change was made, what was changed, and the values before and after the modification. Snapshots are immutable — once created, they cannot be modified or deleted. Snapshots can be viewed by relevant parties including the data owner and administrators, primarily for dispute resolution. Snapshots apply to products (all fields including images), product variants (SKU code, option values, price), seller profiles (shop name, description, logo), order items (product, variant, and seller profile at time of purchase), reviews (rating and text content), cancellation requests (reason and status changes), and refund requests (reason and status changes). When a product is edited, the snapshot includes all product fields and simultaneous snapshots of all current variants. Snapshots are preserved even after the associated product or variant is deleted.

### Snapshot Creation Requirements

THE system SHALL create a snapshot for every modification to a tracked entity, including products, product variants, seller profiles, order items, reviews, cancellation requests, and refund requests.

WHEN a snapshot is created, THE system SHALL record the timestamp of the modification.

WHEN a snapshot is created, THE system SHALL record which specific fields were changed.

WHEN a snapshot is created, THE system SHALL record both the values before the modification and the values after the modification.

### Snapshot Immutability and Retention

THE system SHALL treat all snapshots as immutable — once created, a snapshot cannot be modified.

THE system SHALL prohibit the deletion of any snapshot, regardless of the actor's role or permissions.

IF the associated entity (e.g., product, variant) is deleted, THEN THE system SHALL preserve all related snapshots. Snapshots survive the deletion of the data they reference.

### Snapshot Access Rules

THE owner of the data that was snapshotted SHALL be able to view the related snapshots.

Administrators SHALL be able to view any snapshot in the system.

WHEN a dispute arises, THE system SHALL provide access to relevant snapshots for dispute resolution. Snapshots are the authoritative record for resolving conflicts about what values existed at what time.

### Product Snapshot Rules

WHEN a product is edited, THE system SHALL create a snapshot that includes all product fields: name, description, category, base price, and all product images.

WHEN a product snapshot is created, THE system SHALL also include a snapshot of every product variant that exists at that moment. The product snapshot preserves the complete state of the product and all its variants at the time of the modification.

IF a product variant is edited independently, THE system SHALL create a snapshot for that variant only, recording the SKU code, option values, and price fields that changed.

### Seller Profile Snapshot Rules

WHEN a seller edits their profile, THE system SHALL create a snapshot preserving the previous shop name, shop description, and logo image. Each profile edit generates a distinct snapshot.

### Order Item Snapshot Rules

WHEN an order is placed successfully, THE system SHALL create a snapshot of each purchased product with the order item, preserving the product name and description at the time of purchase.

WHEN an order is placed successfully, THE system SHALL create a snapshot of each purchased variant with the order item, preserving the variant options and price at the time of purchase.

WHEN an order is placed successfully, THE system SHALL create a snapshot of the seller's profile with the order item, preserving the seller's shop name and logo at the time of purchase.

These order item snapshots SHALL be immutable and preserved for the lifetime of the platform.

### Review Snapshot Rules

WHEN a review is edited, THE system SHALL create a snapshot preserving the previous rating (1–5 stars) and text content.

IF a customer deletes their review, THE system SHALL preserve all previously created review snapshots. Deletion of the review does not delete its snapshots.

### Cancellation and Refund Request Snapshot Rules

WHEN a seller responds to a cancellation request (either approving or rejecting), THE system SHALL create a snapshot of the request state, recording the reason, the seller's response, and the status change.

WHEN a seller responds to a refund request (either approving or rejecting), THE system SHALL create a snapshot of the request state, recording the reason, the seller's response, and the status change.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Pagination

All list views that may contain many items SHALL support pagination.

WHEN a customer searches products by name, THE system SHALL return paginated results.

WHEN a customer views their wishlist, THE system SHALL display it with pagination.

WHEN a customer views their order history, THE system SHALL display the list with pagination, sorted by newest first.

WHEN a customer views reviews on a product detail page, THE system SHALL display them sorted by newest first.

WHEN a customer browses products within a category, THE system SHALL display paginated results.

Each page SHALL display a reasonable number of items per page, appropriate to the content type.

### Filtering

WHEN a customer searches products by name, THE system SHALL allow filtering of results by:
— Category: results limited to products in the selected category or its direct child categories (two levels total)
— Price range: results limited to products whose base price or variant prices fall within the specified minimum and maximum values
— In-stock only: results limited to products that have at least one variant with stock quantity greater than zero

WHEN a customer browses products within a category, THE system SHALL allow filtering by price range and in-stock only within that category.

WHEN a seller views order items for their products, THE system SHALL allow filtering by order item status (paid, shipped, delivered, cancelled, refunded).

IF a filter reduces results to zero items, THE system SHALL display an empty state message indicating no products matched the current filters.

### Sorting

WHEN a customer searches or browses products, THE system SHALL support sorting of results by:
— Newest first: products sorted by creation date, most recent first
— Price (low to high): products sorted by lowest base price or lowest variant price first
— Price (high to low): products sorted by highest base price or highest variant price first

WHEN a customer views their order history, THE system SHALL sort the list by newest order first.

WHEN a customer views reviews on a product detail page, THE system SHALL sort reviews by newest first.

IF no sort option is selected by the customer, THE system SHALL default to sorting by newest first.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Customer Registration and Authentication Errors

**Registration Rejection**
- IF a customer attempts to register with an email address that is already in use, THEN THE system SHALL reject the registration request.
- IF a customer attempts to register without providing an email address or password, THEN THE system SHALL reject the registration request.

**Login Failure**
- IF a customer attempts to log in with an incorrect email address or password combination, THEN THE system SHALL reject the login attempt.
- IF a banned customer attempts to log in, THEN THE system SHALL reject the login attempt.

**Password Change Failure**
- IF a customer attempts to change their password without providing the correct current password, THEN THE system SHALL reject the password change request.

### Account Management Errors

**Account Deletion Constraint Violation**
- IF a seller attempts to delete their account while they have any order items with paid or shipped status pending, THEN THE system SHALL reject the account deletion request.
- IF a seller attempts to delete their account while they have any pending cancellation or refund requests, THEN THE system SHALL reject the account deletion request.

**Seller Registration Rejection**
- WHEN an administrator rejects a seller's registration request, THEN THE system SHALL record the rejection reason provided by the administrator.
- WHEN a seller's registration is rejected, THEN THE system SHALL make the rejection reason visible to that seller.
- WHEN a seller's registration is rejected, THEN THE system SHALL allow that seller to submit a new registration request.

### Seller Account Suspension Constraints

**Suspension State Effects**
- WHILE a seller's account is suspended, THE system SHALL hide their products from search results and category listings.
- WHILE a seller's account is suspended, THE system SHALL prevent customers from purchasing the seller's products.
- WHILE a seller's account is suspended, THE system SHALL allow the seller to process existing orders, create shipments, and respond to cancellation or refund requests.
- WHILE a seller's account is suspended, THE system SHALL prevent the seller from creating new products.
- WHILE a seller's account is suspended, THE system SHALL prevent the seller from editing existing products.

### Product and Variant Validation Errors

**Product Creation Rejection**
- IF a seller attempts to create a product without providing a name, THEN THE system SHALL reject the creation request.
- IF a seller attempts to create a product without providing a description, THEN THE system SHALL reject the creation request.
- IF a seller attempts to create a product without assigning a category, THEN THE system SHALL reject the creation request.
- IF a seller attempts to create a product without providing a base price, THEN THE system SHALL reject the creation request.

**Product Deletion Rejection**
- IF a seller attempts to delete a product that has any variant with pending order items (paid or shipped status), THEN THE system SHALL reject the deletion request.
- IF a seller attempts to delete a product that has any variant with pending cancellation or refund requests, THEN THE system SHALL reject the deletion request.

**Product Unavailability Condition**
- IF a product has no variants, THEN THE system SHALL display it in search results as unavailable.
- IF a product has no variants, THEN THE system SHALL prevent customers from adding it to the cart.

**Variant Creation Rejection**
- IF a seller attempts to create a variant with a SKU code that already exists for another variant of the same product, THEN THE system SHALL reject the creation request.
- IF a seller attempts to create a variant without providing a SKU code, THEN THE system SHALL reject the creation request.
- IF a seller attempts to create a variant without providing a stock quantity, THEN THE system SHALL reject the creation request.

**Variant Deletion Rejection**
- IF a seller attempts to delete a variant that has pending order items (paid or shipped status), THEN THE system SHALL reject the deletion request.
- IF a seller attempts to delete a variant that has pending cancellation or refund requests, THEN THE system SHALL reject the deletion request.

**Out of Stock Constraint**
- WHEN a variant's stock quantity reaches zero, THEN THE system SHALL display the variant as out of stock.
- IF a customer attempts to add an out-of-stock variant to the cart, THEN THE system SHALL reject the request.

### Cart and Checkout Errors

**Cart Quantity Warning Condition**
- WHEN a variant's stock quantity is less than the quantity of that variant currently in a customer's cart, THEN THE system SHALL display a warning to the customer indicating the stock shortage.

**Unavailable Cart Items**
- WHEN a variant in a customer's cart is deleted by the seller, THEN THE system SHALL mark that cart item as unavailable.
- WHEN a variant in a customer's cart becomes out of stock, THEN THE system SHALL mark that cart item as unavailable.

**Checkout Rejection**
- IF a customer attempts to proceed to checkout with items marked as unavailable in the cart, THEN THE system SHALL reject the checkout request.
- IF a customer attempts to place an order without selecting a shipping address, THEN THE system SHALL reject the checkout request.
- IF a customer proceeds to checkout but has no shipping addresses saved, THEN THE system SHALL require them to add a shipping address before completing the order.

### Order Flow Errors

**Payment Failure**
- IF payment processing fails during checkout, THEN THE system SHALL not create the order.
- IF payment processing fails during checkout, THEN THE system SHALL allow the customer to retry payment.

**Cancellation Request Rejection**
- IF a customer attempts to request cancellation of an order item that does not have paid status, THEN THE system SHALL reject the cancellation request.
- IF a customer attempts to request cancellation of an order item that has already been shipped, THEN THE system SHALL reject the cancellation request.

**Refund Request Rejection**
- IF a customer attempts to request a refund for an order item that does not have delivered status, THEN THE system SHALL reject the refund request.
- IF a customer attempts to request a refund for an order item more than 7 days after that item's delivery date, THEN THE system SHALL reject the refund request.

**Shipping Address Immutability**
- AFTER an order is placed, THE system SHALL prevent any changes to the shipping address for that order.

### Review Errors

**Review Eligibility Rejection**
- IF a customer attempts to write a review for a product they have not purchased, THEN THE system SHALL reject the review request.
- IF a customer attempts to write a review for a product where the corresponding order item does not have delivered status, THEN THE system SHALL reject the review request.
- IF a customer attempts to write a second review for the same product within the same order, THEN THE system SHALL reject the review request.

**Review Rating Validation**
- IF a customer attempts to submit a review with a rating below 1 star, THEN THE system SHALL reject the review request.
- IF a customer attempts to submit a review with a rating above 5 stars, THEN THE system SHALL reject the review request.

### Administrator Action Errors

**Self-Demotion Constraint**
- IF a super administrator attempts to demote themselves to regular administrator, THEN THE system SHALL reject the request.

**Seller Suspension Constraints**
- WHEN an administrator suspends a seller, THE system SHALL hide that seller's products from search and category listings.
- WHEN an administrator suspends a seller, THE system SHALL prevent that seller from creating new products.
- WHEN an administrator suspends a seller, THE system SHALL prevent that seller from editing existing products.
- WHEN an administrator suspends a seller, THE system SHALL still permit that seller to process existing orders, ship items, and respond to cancellation or refund requests.

**Ban Constraints**
- WHEN a customer is banned, THE system SHALL prevent them from logging in.
- WHEN a seller is banned, THE system SHALL prevent them from logging in while preserving their existing orders for processing.

### General Access and Resource Errors

**Resource Not Found**
- IF any actor attempts to access a product, order, or other resource that does not exist, THEN THE system SHALL reject the request.
- IF any actor attempts to access a resource they do not have permission to view, THEN THE system SHALL reject the request.

**Unauthorized Access**
- IF an unregistered user attempts to access any feature requiring authentication, THEN THE system SHALL reject the request.
- IF a customer attempts to perform an action restricted to sellers, THEN THE system SHALL reject the request.
- IF a seller attempts to perform an action restricted to administrators, THEN THE system SHALL reject the request.

**Category Deletion Side Effects**
- WHEN an administrator deletes a category, THEN THE system SHALL set the category of products in that category to uncategorized. Products themselves are not deleted.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Upload Validation

THE system SHALL validate that all uploaded files are valid image files before acceptance.

THE system SHALL reject any uploaded file that is not a valid image.

WHEN a file upload fails validation, THE system SHALL provide a clear error message indicating the reason for rejection.

THE system SHALL only accept image uploads for the following features:
- Product images (multiple per product)
- Seller logo image

### Accepted Content Types

THE system SHALL accept the following image content types:
- JPEG
- PNG
- GIF

WHEN a file with an unsupported content type is uploaded, THE system SHALL reject the upload and inform the user that the content type is not supported.

THE system SHALL verify content type based on the actual file content, not solely on the file extension.

### Virus and Malware Scanning

THE system SHALL scan all uploaded image files for viruses and malware before acceptance.

WHEN a file is scanned and found to contain malicious content, THE system SHALL reject the upload.

WHEN a file is rejected due to malicious content, THE system SHALL record the incident for administrator review.

THE system SHALL retain rejected files for a limited period for security analysis before permanent deletion.

### File Retention Policies

Product images SHALL be retained as long as the associated product exists in the system.

WHEN a seller deletes their account and their products are deleted from listings, the associated product images SHALL be deleted from active storage.

Images captured in product snapshots SHALL be preserved indefinitely as part of the snapshot record, even after the original product or seller is deleted.

Seller logo images SHALL be retained as part of seller profile snapshots indefinitely, even after account deletion.

WHEN a product image is deleted, the deletion SHALL be included in the product snapshot at the time of deletion.

IF a seller is suspended, their product images SHALL remain in storage but SHALL be hidden from search and category listings.

# Integration Error Handling

Error handling and retry policies for external integrations.

## Integration Failure Policies

Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

### Payment Gateway Integration Error Handling

WHEN the external payment gateway returns an error response, times out, or is unreachable during checkout, THE system SHALL treat the payment attempt as failed.

WHEN a payment attempt fails due to an integration error, THE system SHALL reject the order creation — no order record is created, no stock quantities are reduced, and no payment charge is made.

IF the payment gateway returns a technical error (timeout, connection failure, or gateway error), THE system SHALL interpret this as an integration error and SHALL NOT create the order.

WHEN an integration error occurs during checkout, THE system SHALL display a clear message to the customer indicating that the payment could not be processed at this time.

### Retry After Payment Failure

WHEN a payment attempt fails due to any reason (declined, error, timeout), THE customer SHALL be returned to the order review page with all cart contents preserved — item quantities, selected variants, and the selected shipping address SHALL remain unchanged.

THE customer SHALL be able to change the shipping address or modify cart contents before retrying payment.

WHEN a customer retries payment, THE system SHALL submit a new payment request to the external payment gateway — the system does not automatically retry on behalf of the customer.

IF a customer abandons the checkout after a failed payment attempt, THE system SHALL preserve the cart contents as they were before the checkout attempt.

### Circuit Breaker — No Automatic Retry

WHEN a payment attempt fails, THE system SHALL NOT automatically retry the payment — only the customer can initiate a retry.

WHILE the payment gateway is experiencing persistent failures, THE system SHALL continue to allow customers to attempt checkout — each customer-initiated payment attempt is submitted to the gateway as a new request.

THE system SHALL NOT queue or buffer failed payment requests for later retry — each checkout session is independent.

WHEN a customer successfully completes payment, THE system proceeds with order creation regardless of previous failures in that session.

### Fallback — Order Atomicity on Failure

IF a payment attempt fails (for any reason including integration errors), THEN THE system SHALL roll back to the pre-checkout state — no order is created, no stock is deducted, and no payment is captured.

THE system SHALL treat payment success as an all-or-nothing condition — an order is only created if payment is confirmed successful by the payment gateway.

WHEN payment fails, THE system SHALL not charge the customer — the external payment gateway does not settle failed transactions.