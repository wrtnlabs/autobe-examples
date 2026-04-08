**ecommerce — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Customer Rules

Customers must register with email and password before accessing any platform features. There is no guest browsing mode available on this platform. Each customer maintains a profile containing a display name and phone number. Customers can change their password at any time through their account settings. When a customer deletes their account, their profile information is permanently removed. However, all order history is preserved for seller records and legal compliance purposes. Customer reviews are also preserved but displayed as coming from a deleted user. The system validates that email addresses are unique during registration. Password changes require the current password to be verified first. Account deletion requires the customer to confirm their identity before processing.

### Customer Registration Requirements

Access to the platform requires customer registration. No guest browsing or anonymous access is available. All features are restricted to registered customers only.

Customers must provide an email address and password to create an account. The email address must be unique across the platform. If the email is already registered, the system rejects the registration request.

Registration creates a customer account with the provided email and password. The account is immediately active and can be used to log in.

### Customer Profile Constraints

Each customer maintains a profile with a display name and phone number. Both fields are required when the profile is first created.

The display name must be non-empty and contain at least one character. The phone number must be in a valid format that can receive communications.

Customers can update their display name and phone number at any time. Updates take effect immediately and are visible to other platform users.

### Password Change Validation

Customers can change their password through their account settings. Password changes require verification of the current password before the new password is accepted.

If the current password is incorrect, the password change request is rejected. The customer must provide the correct current password to proceed.

The new password must meet minimum security requirements as defined by the platform. If the new password does not meet requirements, the change is rejected.

### Account Deletion Process

Customers can request account deletion through their account settings. The system requires identity verification before processing the deletion.

The customer must provide their current password to verify identity. If the password is incorrect, the deletion request is rejected.

When a customer account is deleted:
- The customer's profile information (display name and phone number) is permanently removed
- All order history is preserved and remains accessible for seller records and legal compliance
- All reviews written by the customer are preserved but displayed as coming from a "deleted user" instead of showing the original display name

The deletion is irreversible once processed.

## Seller Rules

Sellers must register with email and password to create a seller account. Every seller account requires administrator approval before they can list products for sale. Sellers can view their approval status which shows pending, approved, or rejected states. If a seller registration is rejected, the rejection reason is displayed to the seller. Rejected sellers are allowed to submit a new registration request with updated information. Sellers can change their password through their account settings. A seller can only delete their account if they have no pending orders in paid or shipped status. The seller must also have no pending cancellation or refund requests to delete their account. When a seller deletes their account, their products are removed from all listings. Order history and snapshots are preserved even after seller account deletion. The seller's shop name in past orders remains visible to customers.

### Seller Registration and Approval Process

THE system SHALL require administrator approval for all seller registrations before the seller can list products.

WHEN a seller submits a registration request, THE system SHALL assign pending approval status to the seller account.

THE system SHALL provide visibility of the approval status to the seller, showing one of three states: pending, approved, or rejected.

WHEN an administrator rejects a seller registration, THE system SHALL display the rejection reason to the seller.

WHEN a seller registration is rejected, THE system SHALL allow the seller to submit a new registration request with updated information.

WHILE a seller account has pending status, THE system SHALL prevent the seller from creating products, managing inventory, or processing orders.

### Seller Account Deletion Rules

WHEN a seller requests account deletion, THE system SHALL verify no pending orders exist for the seller's products.

THE system SHALL consider an order as pending when any order item has paid or shipped status.

WHEN a seller requests account deletion, THE system SHALL verify no pending cancellation or refund requests exist for the seller's products.

WHEN a seller account is deleted, THE system SHALL remove all products from search results and category listings.

WHEN a seller account is deleted, THE system SHALL preserve order history and snapshots for legal and business purposes.

WHEN a seller account is deleted, THE system SHALL preserve the shop name in past orders for customer reference.

### Seller Identity Verification

THE system SHALL require email and password for seller account registration.

THE system SHALL validate email format during seller registration.

THE system SHALL allow sellers to change their password through account settings.

THE system SHALL authenticate sellers using email and password for login.

THE system SHALL verify seller identity through approved registration status before allowing product listing.

## Category Rules

Products are organized into categories that can have one level of subcategory nesting. Administrators have exclusive authority to create, edit, and delete categories. Each category requires a name and description when created. Customers can browse the complete list of all available categories. Customers can view all products that belong to a specific category or subcategory. When a category is deleted, all products within it become uncategorized. Products must always be assigned to a category or subcategory when created. Subcategories can only exist under a parent category and cannot have their own children. Category names must be unique within the same parent level. Administrators can edit category names and descriptions at any time.

### Category Hierarchy Structure

Categories support a maximum of one level of nesting. A top-level category cannot have a parent, while a subcategory must have exactly one parent category. Subcategories cannot have their own children; only top-level categories can contain subcategories. This creates a two-tier hierarchy: top-level categories and their subcategories.

### Category Management Permissions

Only administrators have the authority to create, edit, and delete categories. Regular customers and sellers cannot create or modify categories. Administrators can edit category names and descriptions at any time without restrictions. Administrators can delete categories, which affects all products within them.

### Category Creation and Validation Requirements

Every category must have a name when created. Every category must have a description when created. Category names must be unique within the same parent level; a parent category cannot have two subcategories with the same name. Top-level category names must also be unique across the system. When a product is created, it must be assigned to either a top-level category or a subcategory; products cannot exist without a category assignment.

### Category Browsing and Product Association

Customers can browse and view the complete list of all categories and subcategories without restriction. Customers can view all products that belong to a specific category or subcategory. Product listings filtered by category show all active products from that category and its subcategories. Categories with no products can still be browsed and displayed.

### Category Deletion Effects

When a category is deleted, all products within that category become uncategorized. Deleted categories are removed from browsing and search results. Products in deleted categories remain visible in the system but are no longer associated with any category. Subcategories are deleted along with their parent category. Products must be reassigned to a different category if the administrator wants them to remain categorized after deletion.

## Product Rules

Every product requires a name, description, category, and base price when created. Products belong exclusively to the seller who created them. Sellers can edit their own products but cannot modify products from other sellers. Each product edit creates a snapshot that preserves the previous state. A seller can only delete their product if no variants have pending order items in paid or shipped status. The product must also have no pending cancellation or refund requests across any variant. When a product is deleted, all its variants and inventory records are removed. Deleted products no longer appear in search results or category listings. Product snapshots remain accessible even after the product itself is deleted. Administrators can view snapshots of any product on the platform. Administrators can delete any product for policy violations regardless of order status.

### Product Creation Requirements

THE system SHALL require a product name when a seller creates a product.
THE system SHALL require a product description when a seller creates a product.
THE system SHALL require a category assignment when a seller creates a product.
THE system SHALL require a base price when a seller creates a product.
If the product name is missing, the system SHALL reject the product creation request.
If the product description is missing, the system SHALL reject the product creation request.
If the category is not assigned, the system SHALL reject the product creation request.
If the base price is not provided, the system SHALL reject the product creation request.

### Product Ownership and Editing

THE system SHALL associate each product exclusively with the seller who created it.
THE system SHALL allow only the owning seller to edit their own products.
THE system SHALL reject any attempt by a seller to edit products owned by another seller.
THE system SHALL allow only the owning seller to delete their own products.
THE system SHALL reject any attempt by a seller to delete products owned by another seller.
Administrators MAY delete any product regardless of ownership for policy violations.

### Product Deletion Constraints

THE system SHALL require that no variants of a product have pending order items in paid or shipped status before allowing product deletion.
THE system SHALL require that no variants of a product have pending cancellation requests before allowing product deletion.
THE system SHALL require that no variants of a product have pending refund requests before allowing product deletion.
If any variant has a pending order item in paid or shipped status, the system SHALL reject the product deletion request.
If any variant has a pending cancellation request, the system SHALL reject the product deletion request.
If any variant has a pending refund request, the system SHALL reject the product deletion request.
When a product is deleted, the system SHALL automatically delete all variants associated with that product.
When a product is deleted, the system SHALL automatically delete all inventory records associated with that product.

### Product Snapshot and Administrator Oversight

THE system SHALL hide deleted products from search results immediately after deletion.
THE system SHALL hide deleted products from category listings immediately after deletion.
THE system SHALL preserve all product snapshots even after the product itself is deleted.
THE system SHALL preserve all variant snapshots even after the product and variants are deleted.
THE system SHALL allow sellers to view snapshots of their own products.
THE system SHALL allow administrators to view snapshots of any product on the platform.
THE system SHALL allow administrators to delete any product for policy violations regardless of order status or pending requests.

## ProductVariant Rules

Each product variant requires a unique SKU code that identifies the specific combination. Variants include option values describing attributes like color and size. A variant price can override the product base price if specified. Stock quantity is required for every variant and starts at zero. Sellers can add or edit variants on their products. Every variant edit creates a snapshot preserving the previous state. A variant can only be deleted if it has no pending order items in paid or shipped status. The variant must also have no pending cancellation or refund requests. A product must have at least one variant to be purchasable by customers. Products with no variants appear in search but are shown as unavailable. Out of stock variants cannot be added to shopping carts.

### Variant Identification

Each product variant requires a unique SKU code that identifies the specific combination of options. The SKU code must be provided when creating a variant and cannot be empty. If a duplicate SKU code is submitted for a different product, the request is rejected.

Option values describe the attributes of the variant, such as color, size, or material. Each option value must be provided when creating or editing a variant. If option values are missing, the request is rejected.

### Variant Pricing

A variant price can override the product base price if specified. When a variant price is set, it applies only to that specific variant. If no variant price is provided, the product base price is used.

If a variant price is set to a negative value, the request is rejected. If the variant price exceeds reasonable limits (if defined by business policy), the request may be rejected.

### Stock Quantity Requirements

Stock quantity is required for every variant and must be a non-negative integer. The stock quantity starts at zero when a variant is created.

If a stock quantity is set to a negative value, the request is rejected. Sellers can add inventory through restocking (positive quantity change) or subtract inventory through adjustments (negative quantity change), but the resulting stock quantity must remain non-negative.

When stock quantity reaches zero, the variant is shown as out of stock. Out of stock variants cannot be added to shopping carts. If a customer attempts to add an out of stock variant to the cart, the request is rejected with an appropriate message.

### Variant Edit Validation

Every variant edit creates a snapshot preserving the previous state. When a seller edits a variant (SKU code, option values, or price), a snapshot is automatically recorded with the timestamp, changed fields, before values, and after values.

If the edit request contains invalid data (such as missing required fields or invalid values), the request is rejected and no snapshot is created.

### Variant Deletion Constraints

A variant can only be deleted if it has no pending order items in paid or shipped status. If any order item referencing the variant is in paid or shipped status, the deletion request is rejected.

A variant can only be deleted if it has no pending cancellation or refund requests. If any cancellation request or refund request is pending for order items referencing the variant, the deletion request is rejected.

When a variant is deleted, all its inventory records are preserved for historical reference. The variant no longer appears in product details or can be added to carts.

### Product Variant Requirements

A product must have at least one variant to be purchasable by customers. If a product has no variants, it cannot be added to shopping carts.

Products with no variants appear in search results and category listings but are shown as unavailable. Customers can view these products but cannot purchase them.

If a seller attempts to delete the last variant of a product, the request is rejected. At least one variant must remain on the product at all times.

## ProductImage Rules

Sellers can upload multiple images for each product they create. The first image in the sequence serves as the main thumbnail image. Sellers can reorder images to change which one appears as the thumbnail. Individual images can be deleted from a product. Image changes are included in the product snapshot when the product is edited. There is no limit specified on the number of images per product. All product images must be associated with an existing product. Deleting a product also removes all its associated images. Images are displayed in order on the product detail page. Customers see all images when viewing a product.

### Product Image Association and Deletion

Every product image must be associated with an existing product. An image cannot exist independently without a product reference.

WHEN a product is deleted, THE system SHALL delete all images associated with that product. This deletion is automatic and cannot be prevented.

WHEN a product is deleted, THE system SHALL preserve image snapshots that were created as part of product snapshots for historical records.

### Image Quantity and Display Order

Each product may have multiple images uploaded by the seller. There is no specified limit on the number of images per product.

The first image in the sequence serves as the main thumbnail image displayed in product listings and search results.

Sellers can reorder images to change which image appears as the thumbnail. The new first image becomes the thumbnail immediately.

Images are displayed in their defined order on the product detail page. Customers see all images when viewing a product.

### Image Deletion Rules

Sellers can delete individual images from their products at any time.

WHEN an image is deleted, THE system SHALL remove it from the product's image list.

WHEN an image is deleted, THE system SHALL automatically reorder remaining images to maintain sequence.

WHEN the thumbnail image is deleted, THE system SHALL promote the next image in sequence to become the new thumbnail.

### Image Changes in Snapshots

All image changes are captured in product snapshots. When a product is edited, the snapshot includes the complete state of all images at that moment.

Snapshot records include:
- All image URLs in their current order
- The thumbnail designation (first image)
- Timestamp of the change
- Before and after values for image modifications

Snapshots preserve image history even after images are deleted from the current product.

### Image Validation and Error Conditions

WHEN a product has no images, THE system SHALL display the product without a thumbnail in listings.

WHEN a product has only one image, THE system SHALL use that image as the thumbnail.

WHEN a seller attempts to upload images for a product that does not exist, THE system SHALL reject the request.

WHEN a seller attempts to delete an image that does not exist, THE system SHALL reject the request.

## Address Rules

Customers can maintain multiple shipping addresses in their account. Each address requires recipient name, phone number, street address, city, state or province, postal code, and country. All address fields are mandatory when creating a new address. Customers can edit any of their saved addresses at any time. Customers can delete addresses they no longer need. One address can be designated as the default shipping address for checkout. The default address is automatically selected during order placement. Customers can change which address is set as default. Addresses are used for shipping orders but remain in order history after deletion. Deleted addresses cannot be restored but order history preserves the address snapshot.

### Address Creation Requirements

Customers can maintain multiple shipping addresses in their account. There is no specified limit on the number of addresses a customer may save.

When creating a new address, all of the following fields are mandatory:
- Recipient name
- Phone number
- Street address
- City
- State or province
- Postal code
- Country

The system shall reject address creation requests that are missing any of these required fields.

Customers can edit any of their saved addresses at any time. All edits are validated to ensure required fields remain populated.

### Address Deletion Rules

Customers can delete addresses they no longer need. Address deletion is permitted at any time, regardless of order history.

When an address is deleted:
- The address is removed from the customer's address list
- The address cannot be restored
- Any orders previously shipped to that address retain the address information in order history (address snapshot is preserved)

The system shall not prevent address deletion even if the address has been used for past orders.

### Default Address Selection

Customers can designate one address as the default shipping address. Only one address can be set as default at any time.

When a customer sets a new default address:
- The previous default address (if any) is no longer the default
- The new default address becomes the automatically selected address during checkout

During order checkout, the system shall automatically select the customer's default address as the shipping address. Customers may manually select a different saved address at checkout if desired.

If a customer has no saved addresses, the system shall require them to add an address before completing checkout.

### Address Preservation in Order History

Address information is preserved in order history even after the address is deleted from the customer's address list.

When viewing order details:
- The shipping address used for that order is displayed as it appeared at the time of purchase
- Deleted addresses remain visible in historical order records
- The address displayed in order history cannot be modified

This ensures that order records remain complete and accurate for both customers and sellers, regardless of address management actions taken after the order was placed.

## Cart Rules

Customers can add product variants to their shopping cart. Each cart item requires a specific variant selection, not just a product. When adding to cart, customers must specify the quantity desired. If the same variant already exists in the cart, quantities are combined rather than creating a new line item. The cart displays the total price of all items combined. Customers can modify the quantity of any item in their cart. Customers can remove items from their cart individually. A warning is shown when cart quantity exceeds available stock for a variant. Variants that are deleted or out of stock are marked as unavailable in the cart. Unavailable items cannot be included in checkout. Cart items persist until removed or purchased.

### Cart Variant Selection and Quantity Rules

Customers must select a specific product variant when adding an item to the cart. A product alone cannot be added without choosing a variant.

When adding a variant to the cart, the customer must specify a quantity. The quantity must be a positive number greater than zero.

If the same variant already exists in the cart, the system combines the new quantity with the existing quantity rather than creating a duplicate line item. The cart displays a single line item with the combined total quantity.

### Cart Total Calculation Rules

The cart displays a total price calculated by summing all cart item subtotals.

Each cart item subtotal is calculated by multiplying the unit price of the variant by the quantity in the cart.

The total price updates automatically when items are added, removed, or when quantities are modified.

### Cart Stock Warning Rules

When the quantity of a variant in the cart exceeds the available stock quantity, the system displays a warning message to the customer.

The item remains in the cart even when the quantity exceeds available stock. The warning informs the customer that the requested quantity may not be fulfillable.

Customers can proceed to checkout with items that have stock warnings, but unavailable items will be blocked during checkout validation.

### Unavailable Variant Handling Rules

When a product variant is deleted by the seller, all cart items referencing that variant are marked as unavailable. The item remains visible in the cart display but cannot be included in checkout.

When a variant's stock quantity reaches zero, the variant is marked as out of stock. Out of stock variants are marked as unavailable in the cart.

Unavailable items (deleted or out of stock) are visually distinguished from available items in the cart display.

### Checkout Availability Validation Rules

During checkout, the system validates that all cart items are available for purchase.

Items marked as unavailable (due to variant deletion or out of stock status) cannot be included in the order.

Customers must resolve unavailable items by removing them from the cart before the checkout process can proceed. The system prevents checkout completion when any unavailable items remain in the cart.

## CartItem Rules

Each cart item links to a specific product variant. The quantity for each cart item must be a positive number. The unit price is captured at the time the item is added to cart. Cart items can have their quantity updated before checkout. Cart items can be removed from the cart at any time. The cart item price reflects the variant price at add time, not current price. Cart items are removed from the cart when the order is successfully placed. Cart items with unavailable variants cannot proceed to checkout. Cart items with insufficient stock show a warning but remain in cart. Cart item subtotals are calculated from quantity times unit price.

### Cart Item and Variant Association

Each cart item must be associated with exactly one product variant. Customers cannot add a product to the cart without selecting a specific variant. If a variant is not selected, the add-to-cart request is rejected. When a variant is added to the cart, the cart item maintains a reference to that specific variant. If the variant is deleted by the seller, the cart item becomes unavailable but remains in the cart until removed by the customer or until checkout is attempted.

### Quantity Validation Rules

The quantity for each cart item must be a positive whole number. A quantity of zero or negative values is not permitted. When a customer attempts to add a variant to the cart with an invalid quantity, the request is rejected. When updating the quantity of an existing cart item, the new quantity must also be a positive whole number. If the requested quantity update contains an invalid value, the update is rejected.

### Price Capture and Calculation

The unit price for each cart item is captured at the moment the item is added to the cart. This price reflects the variant's price at that specific time, not the current price of the variant. If the seller later changes the variant price, existing cart items retain their original captured price. The subtotal for each cart item is calculated by multiplying the captured unit price by the item quantity. The cart total is the sum of all cart item subtotals. Price changes to variants do not retroactively affect cart items already in the customer's cart.

### Cart Item Modifications

Customers can update the quantity of any cart item before checkout. The quantity update request must specify a valid positive whole number. If the requested quantity exceeds available stock for the variant, a warning is shown but the update is still accepted. Customers can remove any cart item from the cart at any time before checkout. When a cart item is removed, it is permanently deleted from the cart. Removing a cart item does not affect other items in the cart.

### Cart Item Behavior on Order Placement

When an order is successfully placed, all cart items from that order are automatically removed from the customer's cart. The removal occurs after payment confirmation. If payment fails, cart items remain in the cart and are not removed. Cart items are not reserved or locked during the checkout process until the order is confirmed. Multiple customers can have the same variant in their carts simultaneously until orders are placed.

### Variant Availability and Stock Warnings

Cart items with unavailable variants cannot proceed to checkout. A variant becomes unavailable if it is deleted by the seller or if its stock quantity is zero. When a customer attempts to checkout with unavailable variants in the cart, those items are blocked from the order and the customer must remove them first. Cart items with variants that have insufficient stock (stock quantity less than cart item quantity) show a warning to the customer. The warning does not prevent the item from remaining in the cart, but the customer is notified that the requested quantity exceeds available stock. Customers may proceed to checkout with insufficient stock items only if the seller has sufficient inventory at checkout time.

## Wishlist Rules

Customers can add products to their personal wishlist. The wishlist displays products rather than specific variants. Customers can view their complete wishlist with pagination support. Items can be removed from the wishlist individually. When a seller deletes a product, it is automatically removed from all customer wishlists. The wishlist is associated with a specific customer account. Products in the wishlist remain there until manually removed or deleted by the seller. Wishlist items show product information like name, image, and price. The wishlist helps customers save products for future purchase consideration.

### Customer Wishlist Association

Each customer has one personal wishlist associated with their account. The wishlist is automatically created when the customer registers and exists for the lifetime of the account. Customers cannot create multiple wishlists. The wishlist is private and only visible to the owning customer.

### Adding Products to Wishlist

Customers can add products to their wishlist. When adding a product, the customer selects the product from search results, category listings, or product detail pages. A product can be added to the wishlist only if it exists and is currently visible in the catalog. If the product is already in the wishlist, the system does not create a duplicate entry. The product is added with a timestamp indicating when it was added.

### Wishlist Product Display and Information

The wishlist displays products rather than specific variants. Each wishlist item shows the product name, main product image (thumbnail), base price or price range if variants have different prices, and the seller shop name. The wishlist may also show the product category and average rating if reviews exist. The display information helps customers identify products saved for future consideration.

### Wishlist Pagination

The wishlist list is paginated to support browsing when many products are saved. Customers navigate through pages to view all saved products. The pagination applies to the list of wishlist items, showing a subset of products per page with navigation controls to move between pages.

### Wishlist Item Removal

Customers can remove individual products from their wishlist. When a product is removed, it is deleted from the wishlist immediately. The product itself remains in the catalog and is unaffected by removal from the wishlist. Customers can remove products they no longer wish to track for future purchase.

### Deleted Product Auto Removal

When a seller deletes a product, the product is automatically removed from all customer wishlists. This cleanup happens immediately when the product deletion occurs. Customers do not need to manually remove deleted products from their wishlists. The automatic removal ensures the wishlist only contains valid, purchasable products.

### Wishlist Purpose and Use

The wishlist serves as a tool for customers to save products for future purchase consideration. Products remain in the wishlist until the customer manually removes them or the seller deletes the products. The wishlist does not expire or auto-clear. Customers can use the wishlist to track products they intend to buy later, monitor price changes, or save items for comparison before purchasing.

## WishlistItem Rules

Each wishlist item links to a specific product. The product must exist and be available to be added to a wishlist. When a product is deleted by the seller, the wishlist item is automatically removed. Wishlist items record when they were added to the wishlist. Customers can remove wishlist items individually. A customer cannot add the same product multiple times to their wishlist. Wishlist items are displayed on the customer's wishlist page. Wishlist items show current product information when viewed.

### Wishlist Item Product Link

Each wishlist item links to exactly one product. The product must exist and be available on the platform for the item to be added to the wishlist. If the linked product does not exist or is not available, the wishlist item cannot be created.

### Product Existence Requirement

When a customer attempts to add a product to their wishlist, the system validates that the product exists and is available. If the product does not exist, the request is rejected. If the product has been deleted by the seller, the request is rejected. Products that are unavailable or hidden cannot be added to a wishlist.

### Deleted Product Removal

When a seller deletes a product, all wishlist items referencing that product are automatically removed from customers' wishlists. This removal happens immediately and does not require customer action. The product is removed from the wishlist but the customer's other wishlist items remain unaffected.

### Wishlist Item Timestamp

Each wishlist item records when it was added to the wishlist. This timestamp is set at the time of addition and cannot be modified. Customers can view when each product was added to their wishlist when viewing their wishlist page.

### Wishlist Item Removal

Customers can remove individual items from their wishlist. When a customer removes a wishlist item, only that specific product is removed from their wishlist. Other products in the wishlist remain unaffected. The removal is immediate and cannot be undone.

### Unique Product Per Wishlist

A customer cannot add the same product multiple times to their wishlist. If a customer attempts to add a product that already exists in their wishlist, the system rejects the request. Each product can appear at most once per customer's wishlist.

### Wishlist Item Display

Wishlist items are displayed on the customer's wishlist page with current product information. The display shows the product name, main image, and current price. If a product's information changes after being added to the wishlist, the wishlist displays the updated information. Wishlist items are paginated when the wishlist contains many products.

## Order Rules

An order contains one or more order items from potentially different sellers. Each order is created only after payment processing succeeds. If payment fails, no order record is created and the customer can retry. When an order is placed, stock quantities are decreased for each purchased variant. Items are removed from the customer's cart upon successful order creation. The shipping address is locked and cannot be changed after order placement. Order status is derived from the combined statuses of all order items. If all items are paid, the order status is paid. If any item is shipped and none delivered, the order status is shipped. If all items are delivered, the order status is delivered. Mixed states result in a partially completed order status.

### Order Creation and Payment

An order is created only after payment processing succeeds. If payment fails, no order record is created and the customer can retry the purchase. When an order is successfully placed, stock quantities are decreased for each purchased variant. All items in the customer's cart are removed upon successful order creation. The shipping address is locked immediately after order placement and cannot be changed.

### Order Structure

An order contains one or more order items from potentially different sellers. Each order item represents a purchased product variant with a specific quantity. If a customer purchases three units of the same variant, it becomes one order item with quantity three, not three separate items. Items from different sellers within the same order are processed independently for shipping and fulfillment.

### Order Status Derivation

The overall order status is derived from the combined statuses of all order items. If all items in an order have status paid, the order status is paid. If any item has status shipped and none are delivered, the order status is shipped. If all items have status delivered, the order status is delivered. If all items have status cancelled, the order status is cancelled. If all items have status refunded, the order status is refunded. When items have mixed states (for example, some delivered and some refunded), the order status is partially completed.

## OrderItem Rules

Each order item represents a purchased product variant with a specific quantity. Order items can be from different sellers within the same order. Each order item maintains its own independent status. Item statuses include paid, shipped, delivered, cancelled, and refunded. Order items are grouped into shipments when the seller ships them. Each order item has a snapshot of the product and variant at purchase time. Each order item has a snapshot of the seller profile at purchase time. Individual order items can be cancelled or refunded separately from other items in the order. Cancelled or refunded items restore their stock quantities. The order item price is fixed at the time of purchase.

### Order Item Composition

Each order item is linked to exactly one product variant at the time of purchase. The variant link is immutable and cannot be changed after order creation.

Each order item includes a quantity representing the number of units purchased. The quantity must be a positive integer (at least 1).

An order can contain order items from different sellers. Items from different sellers are processed independently and may be shipped separately.

If a variant is deleted by the seller after an order is placed, the order item preserves the variant information through snapshots.

### Order Item Status

Each order item maintains its own independent status, separate from other items in the same order.

The following item statuses are defined:
- Paid: payment completed, waiting for seller to ship
- Shipped: seller has shipped the item
- Delivered: item has been delivered
- Cancelled: item was cancelled
- Refunded: item was refunded

An order's overall status is derived from its items' statuses:
- If all items are paid, the order is "paid"
- If any item is shipped (and none delivered yet), the order is "shipped"
- If all items are delivered, the order is "delivered"
- If all items are cancelled, the order is "cancelled"
- If all items are refunded, the order is "refunded"
- If items have mixed states (e.g., some delivered, some refunded), the order is "partially completed"

### Order Item Snapshots

When an order item is created, a snapshot of the product is preserved. This snapshot includes the product name, description, category, base price, and images at the time of purchase.

When an order item is created, a snapshot of the product variant is preserved. This snapshot includes the SKU code, option values, and price at the time of purchase.

When an order item is created, a snapshot of the seller's profile is preserved. This snapshot includes the shop name and logo at the time of purchase.

The order item price is fixed at the time of purchase and cannot be changed. This price reflects the variant price (or base price if no variant override) at purchase time.

All snapshots are immutable and cannot be deleted. They are preserved even if the product, variant, or seller account is later deleted.

### Individual Item Cancellation and Refund

Individual order items can be cancelled separately from other items in the same order. Cancellation is only allowed for items with status "paid" (not yet shipped).

A cancellation request must include a reason provided by the customer. The seller of that item must approve or reject the cancellation request.

When a cancellation request is approved, that specific item is cancelled and the order status is updated accordingly. The remaining items in the order continue processing normally.

Individual order items can be refunded separately from other items in the same order. Refund is only allowed for items with status "delivered".

A refund request must include a reason provided by the customer. Refund can only be requested within 7 days of the item being delivered. The seller of that item must approve or reject the refund request.

When a refund request is approved, that specific item is refunded and the order status is updated accordingly. The remaining items in the order are unaffected.

### Stock Restoration on Cancellation and Refund

When an order item is cancelled, the stock quantity for the associated variant is restored. The restoration is recorded as a positive inventory record with the reason "cancellation".

When an order item is refunded, the stock quantity for the associated variant is restored. The restoration is recorded as a positive inventory record with the reason "refund".

Stock restoration only occurs for cancelled or refunded items. Items that are delivered but not refunded do not restore stock.

Administrators can force-cancel or force-refund items. When this occurs, stock is restored in the same manner as customer-initiated cancellations or refunds.

### Order Item and Shipment Grouping

Order items are grouped into shipments when the seller ships them. A shipment is a package sent by a single seller.

A shipment can contain one or more order items, but all items in a shipment must be from the same seller. Items from different sellers are always shipped in separate shipments.

A seller can choose to ship items individually or bundle multiple items into one shipment. The seller selects which items to include in each shipment.

All items in the same shipment share the same tracking information (carrier name and tracking number).

When a shipment is created, all items in that shipment change to status "shipped".

When the customer confirms delivery for a shipment, all items in that shipment change to status "delivered". If the customer does not confirm, items automatically change to "delivered" after 14 days from shipping.

## Shipment Rules

A shipment is a package sent by a single seller to a customer. A shipment can contain one or more order items from the same seller. Different sellers always ship separately with different shipments. A seller can choose to ship items individually or bundle multiple items together. When shipping, sellers enter tracking information including carrier name and tracking number. All items in the same shipment share the same tracking information. When a shipment is created, all items in it change to shipped status. Customers can view tracking information for each shipment. Customers confirm delivery per shipment, not per individual item. When delivery is confirmed, all items in that shipment change to delivered status. Items automatically change to delivered after 14 days from shipping if not confirmed.

### Shipment Composition Rules

Each shipment must be created by a single seller and contain only order items from that seller's products. A shipment can contain one or more order items, allowing sellers to bundle multiple items together or ship them individually.

Different sellers in the same order must always create separate shipments. A customer's order containing items from multiple sellers will result in multiple shipments, one from each seller.

Sellers have the choice to ship items individually or bundle multiple items into a single shipment. This bundling decision is made by the seller when creating the shipment.

If a seller attempts to create a shipment containing order items from different sellers, the request is rejected. If a seller attempts to create a shipment with no order items, the request is rejected.

### Tracking Information Requirements

When creating a shipment, the seller must provide tracking information including carrier name and tracking number. Both fields are required and cannot be empty.

All order items included in the same shipment share the same tracking information. The carrier name and tracking number apply to all items in that shipment collectively.

If the seller attempts to create a shipment without providing carrier name, the request is rejected. If the seller attempts to create a shipment without providing a tracking number, the request is rejected.

Customers can view the tracking information for each shipment associated with their orders. The tracking information displays the carrier name and tracking number.

### Shipment Status Transitions

When a shipment is created and tracking information is provided, all order items included in that shipment automatically change their status to "shipped".

If a seller attempts to create a shipment for order items that are not in "paid" status, the request is rejected. Only order items with "paid" status can be included in a shipment.

If a seller attempts to create a shipment for an order item that is already in "shipped", "delivered", "cancelled", or "refunded" status, the request is rejected.

### Delivery Confirmation Rules

Customers can view tracking information for each shipment in their order details. This includes the carrier name and tracking number provided by the seller.

Customers can confirm delivery for each shipment individually, not for individual order items. When a customer confirms delivery for a shipment, all order items in that shipment change their status to "delivered".

If the customer does not confirm delivery, all order items in the shipment automatically change to "delivered" status after 14 days from the shipping date.

If a customer attempts to confirm delivery for a shipment that is already delivered, the request is rejected. If a customer attempts to confirm delivery for a shipment that was cancelled, the request is rejected.

The 14-day automatic delivery timer starts from when the shipment was created with tracking information. This timer applies per shipment, not per order.

## Review Rules

Customers can write reviews only for products they have purchased and received. A review can only be written after the order item status is delivered. Customers can write one review per product per order. Each review requires a rating from 1 to 5 stars. Text content for the review is optional. Reviews are displayed on the product detail page sorted by newest first. Customers can edit their own reviews after submission. Every review edit creates a snapshot preserving the previous state. Customers can delete their own reviews but snapshots are preserved. The product average rating is calculated from all non-deleted reviews. Deleted reviews are excluded from the average rating calculation.

### Review Eligibility

A customer can write a review for a product only after the corresponding order item has been delivered. Reviews cannot be written for items that are still paid, shipped, cancelled, or refunded.

A customer can write at most one review per product per order. If a customer purchases the same product multiple times in different orders, they can write one review for each order.

If a customer attempts to write a review for a product they have not purchased, the request is rejected.

If a customer attempts to write a review for a product they have already reviewed in the same order, the request is rejected.

### Review Content Requirements

Each review must include a rating value between 1 and 5 stars. The rating is mandatory and cannot be omitted.

The text content of a review is optional. Customers may submit a review with only a rating and no written text.

If the rating is missing or outside the valid range (1-5), the review creation is rejected.

### Review Display on Product Page

Reviews are displayed on the product detail page.

Reviews are sorted by newest first, with the most recently created reviews appearing at the top.

The product detail page shows the average rating calculated from all non-deleted reviews for that product.

The product detail page shows the total count of reviews for that product.

### Review Editing

Customers can edit their own reviews after submission.

When a review is edited, a snapshot is created that records the previous rating and text content before the change.

The edit must still include a valid rating between 1 and 5 stars.

If the edited rating is outside the valid range, the edit is rejected.

### Review Deletion

Customers can delete their own reviews.

When a review is deleted, the review is marked as deleted but the snapshots are preserved for historical records.

Deleted reviews are no longer visible on the product detail page.

Deleted reviews are excluded from the average rating calculation.

### Average Rating Calculation

The average rating for a product is calculated from all non-deleted reviews for that product.

Deleted reviews are excluded from the average rating calculation.

If a product has no non-deleted reviews, no average rating is displayed.

When a review is edited, the average rating is recalculated using the updated rating value.

When a review is deleted, the average rating is recalculated excluding that review.

## InventoryRecord Rules

Current stock quantity is calculated by summing all inventory records for a variant. Each inventory record contains a quantity change value that is positive for restocking or negative for orders and adjustments. Every inventory record requires a reason explaining the quantity change. Each inventory record has a timestamp recording when the change occurred. Sellers can add inventory through restocking with a quantity and reason. Sellers can subtract inventory through adjustments or loss with a quantity and reason. Order placement automatically creates a negative inventory record for each purchased variant. Order cancellation or refund automatically creates a positive inventory record. When stock reaches zero, the variant is shown as out of stock. Out of stock variants cannot be added to shopping carts.

### Stock Quantity Calculation

The current stock quantity for a product variant is calculated by summing all inventory records associated with that variant. Each inventory record contains a quantity change value that contributes to the total. The system maintains a complete history of all stock changes through inventory records rather than storing a single stock value. When calculating current stock, all inventory records from the variant's creation to the present are included in the sum.

### Quantity Change Requirement

Each inventory record must include a quantity change value that indicates how much stock was added or removed. The quantity change value must be a non-zero number. A positive value indicates stock was added to inventory. A negative value indicates stock was removed from inventory. The quantity change value is required and cannot be omitted when creating an inventory record.

### Reason Field Requirement

Each inventory record must include a reason field that explains why the quantity change occurred. The reason is required and must be provided by the seller when manually adding or subtracting inventory. For automatic inventory changes (such as order placement or cancellation), the system generates an appropriate reason based on the triggering event. The reason field cannot be empty or null.

### Timestamp Requirement

Each inventory record must include a timestamp that records when the quantity change occurred. The timestamp is automatically generated by the system at the time the inventory record is created. Sellers cannot manually set or modify the timestamp when creating inventory records. The timestamp is used to maintain the chronological order of inventory changes and for audit purposes.

### Restocking Inventory

Sellers can add inventory to a product variant through restocking. When restocking, the seller must provide a positive quantity value and a reason for the restock. The system creates an inventory record with the positive quantity change value. Restocking increases the variant's current stock quantity. Sellers can restock variants regardless of their current stock level.

### Inventory Adjustment

Sellers can subtract inventory from a product variant through adjustments or loss recording. When adjusting inventory downward, the seller must provide a negative quantity value and a reason for the adjustment. The system creates an inventory record with the negative quantity change value. Adjustments decrease the variant's current stock quantity. Sellers can adjust inventory downward even if it results in zero or negative stock (though negative stock triggers business rule violations).

### Order-Induced Inventory Reduction

When a customer places an order containing a product variant, the system automatically creates an inventory record with a negative quantity change equal to the ordered quantity. This automatic inventory reduction occurs immediately upon successful payment confirmation. The system generates an appropriate reason indicating the order created the inventory change. No manual action is required from the seller for order-related inventory changes.

### Cancellation or Refund-Induced Inventory Restoration

When an order item is cancelled or refunded, the system automatically creates an inventory record with a positive quantity change equal to the refunded quantity. This automatic inventory restoration occurs when the cancellation or refund is approved. The system generates an appropriate reason indicating the cancellation or refund created the inventory change. Stock quantities are restored to reflect the returned availability of the variant.

### Zero Stock Status

When a product variant's calculated stock quantity reaches zero, the variant is marked as out of stock. The system automatically updates the variant's availability status when stock reaches zero. Out of stock variants are displayed to customers with an "out of stock" indicator on product listing and detail pages. The out of stock status is determined dynamically based on the current sum of inventory records, not a stored status field.

### Out of Stock Cart Restriction

Product variants that are out of stock cannot be added to shopping carts by customers. The system prevents customers from selecting or adding out of stock variants to their cart. If a variant becomes out of stock while items are already in a customer's cart, those cart items are marked as unavailable. Customers cannot proceed to checkout with unavailable items in their cart. The cart validation checks stock availability before allowing checkout.

## CancellationRequest Rules

Cancellation requests can only be made for order items with paid status. Items that are already shipped cannot be cancelled through this process. Each cancellation request requires a reason explaining why the customer wants to cancel. The seller of that specific item can approve or reject the cancellation request. When a seller responds to a cancellation request, a snapshot of the request state is created. If the seller approves, the item is cancelled and refund is processed for that item only. Cancelled items restore their stock quantities through inventory records. The remaining items in the order continue processing normally. If all items in an order are cancelled, the entire order status becomes cancelled.

### Cancellation Eligibility

A cancellation request can only be submitted for order items with paid status.

WHEN an order item has status shipped, delivered, cancelled, or refunded, THEN the system SHALL reject any cancellation request for that item.

WHEN an order item has status paid, THEN the system SHALL allow the customer to submit a cancellation request for that item.

### Cancellation Reason Requirement

A cancellation request must include a reason explaining why the customer wants to cancel the item.

WHEN a customer submits a cancellation request without providing a reason, THEN the system SHALL reject the request.

WHEN a customer submits a cancellation request with a reason, THEN the system SHALL accept the request for seller review.

### Seller Approval Process

The seller of the specific order item must approve or reject the cancellation request.

WHEN a cancellation request is submitted, THEN the system SHALL notify the seller of that item.

WHEN a seller receives a cancellation request, THEN the system SHALL allow the seller to approve or reject the request.

WHEN a seller has not yet responded to a cancellation request, THEN the system SHALL keep the request in pending status.

### Cancellation Request Snapshots

When a seller responds to a cancellation request, a snapshot of the request state is created.

WHEN a seller approves or rejects a cancellation request, THEN the system SHALL create a snapshot recording the request state at that moment.

The snapshot includes the timestamp of the response, the decision made, and the values before and after the status change.

This snapshot is immutable and cannot be deleted.

### Approved Cancellation Effects

When a cancellation request is approved, the corresponding item is cancelled and a refund is processed for that item only.

WHEN a seller approves a cancellation request, THEN the system SHALL change the order item status to cancelled.

WHEN an order item is cancelled, THEN the system SHALL process a refund for that item only.

WHEN an order item is cancelled, THEN the system SHALL restore the stock quantity for that variant through an inventory record.

The remaining items in the order continue processing normally without being affected by the cancellation.

WHEN all items in an order are cancelled, THEN the system SHALL update the overall order status to cancelled.

## RefundRequest Rules

Refund requests can only be made for order items with delivered status. Items that are not yet delivered cannot be refunded through this process. Each refund request must be submitted within 7 days of the item being delivered. Each refund request requires a reason explaining why the customer wants a refund. The seller of that specific item can approve or reject the refund request. When a seller responds to a refund request, a snapshot of the request state is created. If the seller approves, that item is refunded and stock is restored. Refunded items restore their stock quantities through inventory records. The remaining items in the order are unaffected by the refund. If all items in an order are refunded, the entire order status becomes refunded.

### Refund Eligibility - Delivered Status Required

Refund requests can only be submitted for order items that have reached the delivered status. Items that are still in paid or shipped status cannot be refunded through the refund request process. If a customer attempts to request a refund for an item that is not delivered, the request is rejected.

### Refund Time Window - 7 Day Limit

A refund request must be submitted within 7 days of the order item being delivered. If the customer attempts to submit a refund request after this 7-day window has passed, the request is rejected and cannot be processed.

### Refund Reason - Required Field

Every refund request must include a reason that explains why the customer is requesting the refund. The reason is a required text field that the customer must provide when submitting the request. If no reason is provided, the refund request is rejected.

### Seller Approval - Response and Snapshot

Only the seller of the specific order item can approve or reject a refund request. Other sellers or customers cannot respond to refund requests. When the seller responds to a refund request, a snapshot of the request state is created, recording the timestamp, changed fields, and values before and after the response.

### Approved Refund - Stock Restoration and Order Impact

When a seller approves a refund request, the stock quantity for that order item's variant is restored through an inventory record. The approved refund is processed for that specific item only. The remaining items in the same order continue processing normally and are unaffected by this refund.

### Order Status - All Items Refunded

If all order items in an order have been refunded, the overall order status becomes refunded. If only some items are refunded while others remain in different statuses, the order status reflects the mixed state (e.g., partially completed). Each refund request operates independently on its specific order item.

## Snapshot Rules

Snapshots are created whenever editable data is modified in the system. Each snapshot records the timestamp when the change was made. Snapshots capture which fields were changed and the values before and after. Snapshots are immutable and cannot be deleted once created. Relevant parties including owners and administrators can view snapshots for dispute resolution. Product snapshots include all product fields and all variant snapshots at that moment. Seller profile snapshots preserve shop name and logo at the time of order. Order item snapshots preserve product, variant, and seller profile at purchase time. Review snapshots preserve rating and text content at the time of edit. Cancellation and refund request snapshots preserve reason and status changes. Snapshots are preserved even after the original data is deleted.

### Snapshot Creation Triggers

WHEN a customer edits their display name or phone number, THE system SHALL create a snapshot of the profile change.

WHEN a seller edits their shop name, shop description, or logo, THE system SHALL create a snapshot of the seller profile change.

WHEN a seller creates or edits a product, THE system SHALL create a snapshot of the product including all fields (name, description, category, base price, and images).

WHEN a seller creates or edits a product variant, THE system SHALL create a snapshot of the variant including SKU code, option values, price, and stock quantity.

WHEN a seller adds or removes product images, THE system SHALL create a snapshot of the product that includes the image changes.

WHEN a customer writes or edits a review, THE system SHALL create a snapshot of the review including rating and text content.

WHEN a customer requests cancellation of an order item, THE system SHALL create a snapshot of the cancellation request including reason and status.

WHEN a customer requests a refund for an order item, THE system SHALL create a snapshot of the refund request including reason and status.

WHEN a seller approves or rejects a cancellation or refund request, THE system SHALL create a snapshot of the request status change.

### Snapshot Data Structure

THE system SHALL record the timestamp when each snapshot is created.

THE system SHALL capture which fields were changed in each snapshot.

THE system SHALL record the values before the change in each snapshot.

THE system SHALL record the values after the change in each snapshot.

WHEN a product is edited, THE system SHALL include snapshots of all variants at that moment in the product snapshot (product snapshot contains product-snapshot-SKU records).

### Snapshot Immutability

THE system SHALL make all snapshots immutable once created.

THE system SHALL NOT allow any user to modify a snapshot after it is created.

THE system SHALL NOT allow any user to delete a snapshot once it is created.

THE system SHALL preserve all snapshots even after the original data is deleted.

### Snapshot Access Rules

THE system SHALL allow product owners to view snapshots of their own products.

THE system SHALL allow administrators to view snapshots of any product on the platform.

THE system SHALL allow relevant parties to view snapshots for dispute resolution purposes.

THE system SHALL allow sellers to view snapshots of their own seller profile changes.

THE system SHALL allow customers to view snapshots of their own reviews.

### Order Item Snapshots

WHEN an order item is created, THE system SHALL save a snapshot of the purchased product including name, description, category, and base price.

WHEN an order item is created, THE system SHALL save a snapshot of the purchased variant including SKU code, option values, and price.

WHEN an order item is created, THE system SHALL save a snapshot of the seller profile including shop name and logo at the time of purchase.

THE system SHALL preserve all order item snapshots even if the original product, variant, or seller profile is later modified or deleted.

### Request Status Snapshots

WHEN a cancellation request is created or its status changes, THE system SHALL create a snapshot recording the reason and status at that moment.

WHEN a refund request is created or its status changes, THE system SHALL create a snapshot recording the reason and status at that moment.

THE system SHALL preserve cancellation and refund request snapshots even after the request is resolved or the order item is deleted.

### Snapshot Preservation After Deletion

WHEN a product is deleted by a seller or administrator, THE system SHALL preserve all snapshots of that product.

WHEN a product variant is deleted, THE system SHALL preserve all snapshots of that variant.

WHEN a seller deletes their account, THE system SHALL preserve snapshots of their seller profile and order items.

WHEN a customer deletes their account, THE system SHALL preserve snapshots of their reviews.

THE system SHALL make deleted product and variant snapshots viewable by administrators for dispute resolution and audit purposes.

## SellerApproval Rules

Seller approval status must be pending, approved, or rejected. Administrator approval is required before a seller can create products or list items. Sellers can view their current approval status at any time. If a seller registration is rejected, the rejection reason is displayed to the seller. Rejected sellers can submit a new registration request after addressing the rejection reason. Pending sellers cannot create new products or edit existing products. Approved sellers can create products and manage their shop. Administrators can approve or reject seller registration requests. Administrators must provide a reason when rejecting a seller registration. Sellers remain in pending status until an administrator takes action.

### Approval Status Values

THE system SHALL assign one of three status values to each seller registration request: pending, approved, or rejected.

WHEN a seller submits a registration request, THE system SHALL set the status to pending.

THE system SHALL NOT assign any status value other than pending, approved, or rejected to a seller registration request.

### Administrator Approval Required

WHILE a seller registration request has pending status, THE system SHALL prevent the seller from creating products, editing products, managing inventory, or processing orders.

WHILE a seller registration request has rejected status, THE system SHALL prevent the seller from creating products, editing products, managing inventory, or processing orders.

ONLY WHEN a seller registration request has approved status, THE system SHALL allow the seller to perform selling activities.

### Approval Status Visibility

THE system SHALL display the current approval status of a seller registration request to the seller at all times.

THE system SHALL make the approval status visible from the seller's account dashboard.

### Rejection Reason Display

WHEN a seller registration request has rejected status, THE system SHALL display the rejection reason provided by the administrator to the seller.

THE system SHALL ensure the rejection reason is clearly visible to help the seller understand the denial and address issues before reapplying.

### Reapplication After Rejection

WHEN a seller registration request has rejected status, THE system SHALL allow the seller to submit a new registration request.

THE system SHALL process the new registration request through the same approval process as the initial request.

THE system SHALL NOT limit the number of times a seller can submit registration requests after rejection.

### Pending Seller Restrictions

WHILE a seller registration request has pending status, THE system SHALL prevent the seller from creating new products.

WHILE a seller registration request has pending status, THE system SHALL prevent the seller from editing existing products.

WHILE a seller registration request has pending status, THE system SHALL prevent the seller from managing inventory, processing orders, or handling cancellation and refund requests.

### Approved Seller Permissions

WHEN a seller registration request has approved status, THE system SHALL allow the seller to create products.

WHEN a seller registration request has approved status, THE system SHALL allow the seller to edit products.

WHEN a seller registration request has approved status, THE system SHALL allow the seller to manage inventory, process orders, and handle cancellation and refund requests.

### Administrator Approval Action

THE system SHALL allow administrators to approve seller registration requests.

THE system SHALL allow administrators to reject seller registration requests.

WHEN an administrator approves a seller registration request, THE system SHALL change the status to approved and grant selling privileges.

WHEN an administrator rejects a seller registration request, THE system SHALL change the status to rejected and require a reason to be provided.

### Rejection Reason Required

WHEN an administrator rejects a seller registration request, THE system SHALL require the administrator to provide a reason for the rejection.

THE system SHALL NOT allow a seller registration request to be rejected without a reason being provided.

THE system SHALL store the rejection reason and display it to the seller.

### Pending Until Action

WHILE a seller registration request has pending status, THE system SHALL maintain the pending status until an administrator takes action.

THE system SHALL NOT automatically change the status of a pending seller registration request without administrator intervention.

THE system SHALL NOT expire or remove a pending seller registration request without administrator action.

## Administrator Rules

There are two administrator grades: regular administrator and super administrator. Any user including customers or sellers can submit a request to become an administrator. The request includes a reason explaining why the user wants administrator access. Super administrators can view and manage pending administrator requests. Super administrators can approve or reject administrator requests. Super administrators can promote regular administrators to super administrator status. Super administrators can demote other super administrators to regular administrator. Super administrators cannot demote themselves from super administrator status. Regular administrators can manage seller approvals, categories, products, and orders. Regular administrators cannot manage other administrators or change administrator grades.

### Administrator Grades

THE system SHALL define two administrator grades: regular administrator and super administrator. EACH administrator SHALL have exactly one grade at any time. THE administrator grade SHALL determine what administrative actions the administrator can perform.

### Administrator Request Submission

ANY user, including customers or sellers, SHALL be able to submit a request to become an administrator. THE request SHALL include a reason explaining why the user wants administrator access. THE reason SHALL be required text. EMPTY or MISSING reasons SHALL be rejected.

### Super Administrator Request Management

SUPER administrators SHALL be able to view all pending administrator requests. SUPER administrators SHALL be able to approve pending administrator requests. WHEN a request is approved, THE system SHALL assign the user regular administrator grade. SUPER administrators SHALL be able to reject pending administrator requests. WHEN a request is rejected, THE user SHALL remain in their current role.

### Administrator Grade Promotion

SUPER administrators SHALL be able to promote regular administrators to super administrator status. THIS action SHALL require explicit approval from a super administrator. WHEN promoted, THE administrator SHALL gain super administrator permissions.

### Administrator Grade Demotion

SUPER administrators SHALL be able to demote other super administrators to regular administrator status. A SUPER administrator SHALL NOT be able to demote themselves from super administrator status. SELF-demotion SHALL be rejected by the system.

### Regular Administrator Permissions and Restrictions

Regular administrators SHALL be able to view the list of pending seller approvals. Regular administrators SHALL be able to approve or reject seller registrations. WHEN rejecting a seller, a reason SHALL be provided. Regular administrators SHALL be able to suspend seller accounts. Regular administrators SHALL be able to unsuspend seller accounts. Regular administrators SHALL be able to create categories and subcategories. Regular administrators SHALL be able to edit category names and descriptions. Regular administrators SHALL be able to delete categories. Regular administrators SHALL be able to view all products on the platform. Regular administrators SHALL be able to view product snapshots. Regular administrators SHALL be able to delete products for policy violations. Regular administrators SHALL be able to view all orders on the platform. Regular administrators SHALL be able to force-cancel individual order items or entire orders. Regular administrators SHALL be able to force-refund individual order items or entire orders. Regular administrators SHALL be able to view all customer accounts. Regular administrators SHALL be able to ban customer accounts. Regular administrators SHALL be able to unban customer accounts. Regular administrators SHALL be able to view all seller accounts. Regular administrators SHALL be able to ban seller accounts. Regular administrators SHALL NOT be able to manage other administrators. Regular administrators SHALL NOT be able to approve or reject administrator requests. Regular administrators SHALL NOT be able to promote or demote administrators. Regular administrators SHALL NOT be able to change administrator grades. Regular administrators SHALL NOT be able to promote themselves to super administrator status.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Product Search Filtering

Customers can filter product search results using the following criteria:

**Category Filter**: Customers can select a category or subcategory to view only products within that category. When a subcategory is selected, products from that subcategory are shown.

**Price Range Filter**: Customers can specify a minimum price and/or maximum price. Products outside the specified range are excluded from results. If only a minimum is specified, products below that price are excluded. If only a maximum is specified, products above that price are excluded.

**In-Stock Filter**: Customers can choose to show only products with available variants (stock quantity greater than zero). When enabled, products where all variants are out of stock are excluded from results.

Multiple filters can be applied simultaneously. The system combines all active filters using AND logic, showing only products that match all selected criteria.

### Product Search Sorting

Customers can sort product search results using the following options:

**Newest First**: Products are ordered by creation date, with the most recently created products appearing first.

**Price Low to High**: Products are ordered by base price from lowest to highest. When variants have different prices, the lowest variant price is used for sorting.

**Price High to Low**: Products are ordered by base price from highest to lowest. When variants have different prices, the lowest variant price is used for sorting.

Sorting applies to the filtered result set. When no sort option is explicitly selected, the default sorting is newest first.

### List Pagination

List views that contain multiple items use pagination to limit the number of items displayed per page:

**Search Results**: Product search results are paginated. Customers navigate through pages using pagination controls. The system returns a consistent set of products per page based on the current filters and sort order.

**Wishlist**: The customer's wishlist is paginated. Products are shown in pages, with pagination controls available for navigation.

**Order History**: The customer's order list is paginated and sorted by newest first by default. Each page shows order summaries including order number, date, total price, and overall order status.

**Seller Order Items**: Sellers can view their order items in paginated lists. Sellers can filter by status before pagination is applied.

Pagination ensures consistent performance when browsing large result sets. The specific number of items per page is determined by the system implementation.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Account Registration and Login Errors

When a customer attempts to register with an email that is already in use, the registration request is rejected. When a customer attempts to log in with incorrect email or password, the login request is rejected. When a customer attempts to change their password with an incorrect current password, the password change request is rejected. When a customer attempts to register with a missing or invalid email format, the registration request is rejected. When a customer attempts to register with a missing or weak password, the registration request is rejected.

### Account and Resource Deletion Restrictions

When a customer attempts to delete their account, the deletion is rejected if they have active orders (items with paid, shipped, or delivered status). When a seller attempts to delete their account, the deletion is rejected if they have pending orders (paid or shipped status). When a seller attempts to delete their account, the deletion is rejected if they have pending cancellation or refund requests. When a seller attempts to delete a product, the deletion is rejected if any variant has pending order items (paid or shipped status). When a seller attempts to delete a product, the deletion is rejected if any variant has pending cancellation or refund requests. When a seller attempts to delete a variant, the deletion is rejected if that variant has pending order items (paid or shipped status). When a seller attempts to delete a variant, the deletion is rejected if that variant has pending cancellation or refund requests. When a seller attempts to delete their account, the deletion is rejected if they are currently suspended by an administrator.

### Product and Variant Validation Errors

When a customer attempts to create a product without a name, the product creation is rejected. When a customer attempts to create a product without a description, the product creation is rejected. When a customer attempts to create a product without assigning a category, the product creation is rejected. When a customer attempts to create a product without a base price, the product creation is rejected. When a seller attempts to create a product variant without a SKU code, the variant creation is rejected. When a seller attempts to create a product variant without a stock quantity, the variant creation is rejected. When a seller attempts to create a product variant with a duplicate SKU code, the variant creation is rejected. When a seller attempts to edit a product variant's SKU code to a duplicate value, the edit is rejected. When a seller attempts to delete a product that has no variants, the deletion is rejected.

### Order and Payment Errors

When a customer attempts to place an order with a variant that is out of stock, the order placement is rejected for that variant. When a customer attempts to place an order with a variant that has insufficient stock for the requested quantity, the order placement is rejected for that variant. When a customer attempts to place an order and payment fails, the order is not created and the customer may retry. When a customer attempts to checkout with unavailable items (deleted or out of stock), those items cannot be included in the checkout. When a customer attempts to modify their shipping address after order placement, the modification is rejected.

### Cancellation and Refund Request Errors

When a customer attempts to request cancellation for an order item with status other than paid, the cancellation request is rejected. When a customer attempts to request cancellation for an order item that has already been shipped, the cancellation request is rejected. When a customer attempts to request refund for an order item with status other than delivered, the refund request is rejected. When a customer attempts to request refund for an order item that was delivered more than 7 days ago, the refund request is rejected. When a seller attempts to approve a cancellation or refund request for an item that no longer exists, the approval is rejected. When a seller attempts to approve a cancellation or refund request for an item that has already been processed, the approval is rejected.

### Cart and Wishlist Errors

When a customer attempts to add a variant to their cart that is out of stock, the add-to-cart action is rejected. When a customer attempts to modify a cart item quantity to exceed available stock, a warning is shown but the modification may proceed. When a customer attempts to checkout with cart items that have become unavailable (deleted or out of stock), those items are marked as unavailable and cannot be included in checkout. When a customer attempts to add a deleted product to their wishlist, the action is rejected. When a product is deleted by the seller, it is automatically removed from all customer wishlists without error.

### Review Submission Errors

When a customer attempts to write a review for a product they have not purchased, the review submission is rejected. When a customer attempts to write a review for an order item with status other than delivered, the review submission is rejected. When a customer attempts to write a review for a product they have already reviewed in the same order, the review submission is rejected. When a customer attempts to submit a review without a rating, the review submission is rejected. When a customer attempts to submit a review with a rating outside the 1 to 5 star range, the review submission is rejected.

### Inventory Management Errors

When a seller attempts to subtract inventory with a quantity that would result in negative stock, the inventory adjustment is rejected. When a system attempts to create an inventory record with a missing quantity change value, the record creation is rejected. When a system attempts to create an inventory record with a missing reason, the record creation is rejected. When a seller attempts to restock a variant with a negative quantity, the restock action is rejected.

### Shipping and Administrative Action Errors

When a seller attempts to include order items from different sellers in the same shipment, the shipment creation is rejected. When a seller attempts to ship order items with status other than paid, the shipment action is rejected. When a customer attempts to confirm delivery for a shipment that has not been shipped, the delivery confirmation is rejected. When an administrator attempts to force-cancel an order item that has already been cancelled, the action is rejected. When an administrator attempts to force-refund an order item that has already been refunded, the action is rejected.

### Seller and Administrator Management Errors

When an administrator attempts to approve a seller registration, the approval is rejected if the seller account no longer exists. When an administrator attempts to reject a seller registration without providing a reason, the rejection is rejected. When an administrator attempts to delete a category that contains products, the products become uncategorized but the deletion proceeds. When an administrator attempts to suspend a seller who has already been suspended, the action is rejected. When an administrator attempts to ban a customer who has already been banned, the action is rejected. When a super administrator attempts to demote themselves, the action is rejected.

### Snapshot Integrity Errors

When a system attempts to create a snapshot for a modification, the snapshot creation cannot be reversed or deleted. When a system attempts to modify a snapshot after creation, the modification is rejected. When a system attempts to delete a snapshot, the deletion is rejected. When a customer attempts to delete their review, the review content is removed but the snapshot is preserved. When a seller deletes their product, all associated product snapshots are preserved and remain accessible to administrators.

### External Service Integration Errors

When the external payment gateway is unavailable, the payment processing fails and the order is not created. When the external payment gateway returns an error, the customer may retry the payment. When an external service integration fails during order processing, the system handles the failure without corrupting order data. When a circuit-breaker is triggered for an external service, subsequent requests are blocked until the service recovers. When a fallback mechanism is activated for an external service, the system uses the fallback to complete the operation or fails gracefully.

# Integration Error Handling

Error handling and retry policies for external integrations.

## Integration Failure Policies

Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

### Payment Failure Handling

When payment processing fails, the order is not created and the customer is notified of the payment failure.

The customer may retry the payment process after a payment failure.

Cart items are preserved when payment fails, allowing the customer to retry checkout with the same items.

No order record is created when payment fails, so failed payment attempts do not appear in the customer's order history.

### Payment Retry

Customers may retry payment after a payment failure without restriction on the number of retry attempts.

Each payment retry processes the full payment amount for all items in the order.

The customer's cart is not cleared between retry attempts, allowing multiple payment attempts with the same items.

### Payment Gateway Integration Errors

When the payment gateway integration encounters an error, the system prevents order creation and notifies the customer.

Integration errors with the payment gateway do not affect the customer's account or cart contents.

The customer may attempt payment again when the payment gateway becomes available.

### Order Creation on Payment Success

When payment succeeds, the order is created with all cart items.

Order creation triggers automatic stock reduction for each purchased variant.

Cart items are removed from the customer's cart after successful order creation.

A snapshot of each purchased product, variant, and seller profile is saved with the order item.