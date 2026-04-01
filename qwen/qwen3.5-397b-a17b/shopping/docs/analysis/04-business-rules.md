**shoppingMall — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Customer Rules

Customers must register with email and password to use any platform features, as guest browsing is not allowed. Each customer account requires a unique email address for identification and login purposes. Customers can change their password at any time after account creation. When a customer deletes their account, their profile information is permanently removed from the system. However, order history and order records are preserved even after account deletion to maintain seller records and comply with legal requirements. Customer reviews remain visible after account deletion but are displayed as authored by a deleted user. Each customer profile includes a display name and phone number that can be edited by the customer. The display name is shown to other users and sellers throughout the platform. Customers cannot delete their account if there are active orders or pending requests that require their participation.

### Customer Registration and Authentication

Customers must register with an email address and password to access any platform features. Guest browsing is not permitted; all users must have a registered account to view products, search, or use any functionality.

Each customer account must use a unique email address. If a registration request is submitted with an email address that is already associated with an existing account, the request is rejected.

Customers log in using their registered email address and password. If the email address does not exist or the password is incorrect, the login request is rejected.

Customers can change their password at any time after account creation. The password change requires the customer to provide their current password for verification. If the current password is incorrect, the password change request is rejected.

### Profile Information Management

Each customer profile includes a display name and a phone number. The display name is shown to sellers and other users throughout the platform, including on reviews and order confirmations.

Customers can edit their display name at any time. There are no restrictions on how frequently the display name can be changed.

Customers can edit their phone number at any time. The phone number is used for order-related communications and shipping purposes.

Profile information edits do not create snapshots; only the current profile values are maintained.

### Account Deletion Process

Customers can request to delete their account at any time. When a customer deletes their account, their profile information including display name and phone number is permanently removed from the system.

A customer cannot delete their account if there are active orders with items in paid or shipped status. If a deletion request is submitted while active orders exist, the request is rejected.

A customer cannot delete their account if there are pending cancellation requests or pending refund requests that require their participation. If a deletion request is submitted while pending requests exist, the request is rejected.

### Data Preservation After Account Deletion

When a customer deletes their account, order history and order records are preserved in the system. This preservation maintains seller records and complies with legal requirements for transaction documentation.

Customer reviews are preserved after account deletion. Reviews that were authored by the deleted customer remain visible on product detail pages but are displayed as authored by a deleted user instead of showing the customer's display name.

Wishlist entries are deleted when the customer account is deleted.

Cart contents are deleted when the customer account is deleted.

Shipping addresses associated with the customer are deleted when the customer account is deleted. However, shipping addresses used in past orders are preserved as part of the order records.

## Seller Rules

Sellers must register with email and password to create a seller account on the platform. Seller accounts require administrator approval before they can list products or make sales. Sellers can view their approval status which shows pending, approved, or rejected states. If a seller registration is rejected, they can view the rejection reason provided by the administrator. Rejected sellers have the ability to submit a new registration request after addressing the rejection issues. Sellers can delete their account only when they have no pending orders in paid or shipped status. Additionally, sellers cannot delete their account if there are pending cancellation or refund requests awaiting their response. When a seller deletes their account, all their product listings are removed from the platform. Order history and order snapshots are preserved to maintain transaction records. The shop name associated with past orders remains visible to customers even after seller account deletion.

### Seller Registration and Authentication

Sellers must register with a valid email address and password to create a seller account on the platform. The email address must be unique and not already associated with an existing customer or seller account. Sellers authenticate by providing their registered email and password. Sellers can change their password after logging in to their account. Sellers cannot list products, make sales, or access seller features until their account has been approved by an administrator. If a seller attempts to access seller features before approval, the request is rejected with a notification that the account is pending approval.

### Seller Approval Process

All seller registration requests require administrator approval before the seller can activate their shop. Sellers can view their current approval status at any time, which displays one of three states: pending, approved, or rejected. When a seller registration is rejected, the seller can view the rejection reason provided by the administrator. Rejected sellers can submit a new registration request after addressing the issues cited in the rejection reason. Each new registration request after rejection goes through the approval process again. While the approval status is pending, sellers cannot create products, edit shop profiles, or receive orders. If the approval status is rejected, sellers cannot create products, edit shop profiles, or receive orders until a new registration is approved.

### Seller Account Deletion

Sellers can request to delete their seller account, but deletion is subject to restrictions. A seller cannot delete their account if they have any order items in paid or shipped status. A seller cannot delete their account if they have any pending cancellation requests awaiting their response. A seller cannot delete their account if they have any pending refund requests awaiting their response. If any of these conditions exist, the deletion request is rejected with a message indicating the blocking condition. When a seller account is deleted, all product listings belonging to that seller are immediately removed from search results and category pages. Deleted products cannot be purchased or added to cart. Order history and order item snapshots are preserved to maintain transaction records for legal and dispute resolution purposes. The shop name associated with past orders remains visible to customers in their order history even after the seller account is deleted. Product snapshots and variant snapshots created before deletion are preserved and remain accessible to administrators for oversight purposes.

## Address Rules

Customers can add multiple shipping addresses to their account for order delivery. Each address must include recipient name, phone number, street address, city, state or province, postal code, and country. All address fields are required when creating or editing an address entry. Customers can edit any of their saved addresses at any time to update information. Customers can delete addresses from their account when they are no longer needed. Each customer can designate one address as their default shipping address. The default address is automatically selected during checkout unless the customer chooses a different address. Multiple addresses can exist simultaneously but only one can be marked as default at a time. Address information is preserved with orders even if the original address is later deleted from the customer's account.

### Address Creation and Required Fields

Customers can add multiple shipping addresses to their account for order delivery. Each customer can maintain several addresses simultaneously for different delivery locations. When creating a new address, all fields must be provided. The recipient name is required for every address entry. The phone number is required for every address entry. The street address is required for every address entry. The city is required for every address entry. The state or province is required for every address entry. The postal code is required for every address entry. The country is required for every address entry. If any required field is missing during address creation, the request is rejected. Each address entry must contain complete information for all seven fields before it can be saved to the customer's account.

### Address Management

Customers can edit any of their saved addresses at any time to update information. When editing an address, all fields remain required and must be provided. Customers can update the recipient name, phone number, street address, city, state or province, postal code, or country of any existing address. Customers can delete addresses from their account when they are no longer needed. If a customer attempts to delete an address that does not exist, the request is rejected. If a customer attempts to delete an address that belongs to another customer, the request is rejected. Address information is preserved with orders even if the original address is later deleted from the customer's account. When an order is placed, the shipping address used for that order is stored as a snapshot and remains unchanged regardless of subsequent modifications or deletions to the customer's saved addresses.

### Default Address Management

Each customer can designate one address as their default shipping address. Only one address can be marked as the default at any time. When a customer sets an address as default, any previously designated default address is automatically changed to non-default status. The default address is automatically selected during checkout unless the customer chooses a different address. If a customer has multiple addresses but none is marked as default, the customer must explicitly select an address during checkout. If a customer deletes their default address, another address must be selected as the new default, or no default will exist until the customer designates one. When viewing their address list, customers can identify which address is currently marked as their default.

### Checkout Address Selection

During checkout, customers must select a shipping address for their order. If the customer has a default address designated, that address is automatically pre-selected. Customers can choose to use their default address or select a different saved address from their address list. Customers can also add a new address during checkout if needed. Once an order is placed with a selected address, the shipping address cannot be changed for that order. The address used for each order is preserved as part of the order record. If a customer has no saved addresses, they must add at least one address before completing checkout. Unavailable items in the cart cannot be checked out regardless of address selection.

## Category Rules

Products are organized into categories to help customers browse and find items. Categories support one level of subcategory nesting, meaning a category can have subcategories but subcategories cannot have their own subcategories. Each category must have a name and description to identify its purpose. Only administrators can create, edit, or delete categories on the platform. Customers can browse the complete list of all available categories. Customers can view products that belong to a specific category or subcategory. When administrators delete a category, products that were in that category become uncategorized rather than being deleted. Category names and descriptions can be edited by administrators at any time. The category structure helps organize the product catalog for better customer navigation.

### Category Structure and Hierarchy

Categories organize products in the shopping mall platform. Each category must have a name and a description. Categories support one level of subcategory nesting only, meaning a category can have subcategories but subcategories cannot have their own subcategories. A subcategory belongs to exactly one parent category. The category structure helps organize the product catalog for customer navigation. Products are assigned to exactly one category, which can be either a top-level category or a subcategory.

### Category Creation and Editing

Only administrators can create new categories. Only administrators can edit existing category names and descriptions. When creating a category, administrators must provide both a name and a description. When editing a category, administrators can modify the name and description at any time. Administrators can designate a category as a subcategory by assigning it to a parent category. A category cannot be changed from a subcategory to a top-level category or vice versa after creation.

### Category Validation Rules

A category name is required and cannot be empty. A category description is required and cannot be empty. Each category name must be unique among sibling categories (categories with the same parent). If a category name duplicates an existing sibling category name, the request is rejected. If a category name or description is missing, the request is rejected. If an attempt is made to create a subcategory under a subcategory (violating the one-level nesting rule), the request is rejected.

### Category Browsing and Product Assignment

Customers can browse the complete list of all available categories. Customers can view products that belong to a specific category or subcategory. When viewing a category, customers see all products assigned to that category and all products assigned to its subcategories. Products must be assigned to a category during creation. Sellers can select any available category or subcategory when creating or editing their products. If a category is deleted, products assigned to that category become uncategorized.

### Category Deletion Rules

Only administrators can delete categories. When a category is deleted, products that were assigned to that category become uncategorized rather than being deleted. Uncategorized products remain visible on the platform but are not accessible through category browsing. When a parent category is deleted, all its subcategories are also deleted. Products in deleted subcategories become uncategorized. If a category has no products and no subcategories, it can be deleted without impact. If a category contains products or subcategories, administrators can still delete it, understanding that products will become uncategorized.

## Product Rules

Sellers can create products to list for sale on the platform. Every product must have a name, description, category selection, and base price as required fields. Products belong to the seller who created them and cannot be transferred to other sellers. Sellers can edit their own products to update information or correct errors. Every product edit creates a snapshot that preserves the previous state of the product. Sellers can delete their own products only if there are no pending order items in paid or shipped status for any variant. Additionally, products cannot be deleted if there are pending cancellation or refund requests for any variant. When a product is deleted, all its variants and inventory records are also deleted. Deleted products no longer appear in search results or category listings. Product snapshots are preserved even after the product itself is deleted for record-keeping purposes.

### Product Creation Requirements

Sellers can create products to list for sale on the platform.

Every product must have the following required fields:
- Name
- Description
- Category selection (can be a category or subcategory)
- Base price

If the product name is missing, the request is rejected.
If the product description is missing, the request is rejected.
If the category selection is missing, the request is rejected.
If the base price is missing, the request is rejected.

### Product Ownership

Products belong to the seller who created them.

Products cannot be transferred to other sellers after creation.

### Product Editing and Snapshots

Sellers can edit their own products to update information or correct errors.

Every product edit creates a snapshot that preserves the previous state of the product, including all product fields (name, description, category, base price, and images).

Sellers can view snapshots of their own products.

Administrators can view snapshots of any product.

### Product Deletion Rules

Sellers can delete their own products only if all of the following conditions are met:
- There are no pending order items in paid or shipped status for any variant of the product
- There are no pending cancellation requests for any variant of the product
- There are no pending refund requests for any variant of the product

If any variant has pending order items in paid or shipped status, the deletion request is rejected.
If any variant has pending cancellation or refund requests, the deletion request is rejected.

When a product is deleted:
- All variants of the product are deleted
- All inventory records for the product's variants are deleted
- The product no longer appears in search results
- The product no longer appears in category listings

Product snapshots are preserved even after the product itself is deleted for record-keeping purposes.

### Administrator Product Oversight

Administrators can view all products on the platform, regardless of which seller created them.

Administrators can view snapshots of any product.

Administrators can delete any product for policy violations.

When an administrator deletes a product, the same deletion rules apply as seller-initiated deletion (preserving snapshots and order history).

## ProductVariant Rules

A product can have multiple variants representing different combinations of options like color or size. Each variant must have a unique SKU code that identifies it across the platform. Variants include option values that describe the specific combination, such as Red and Large. Each variant can have a price that overrides the product's base price, though this is optional. Stock quantity is required for each variant and starts at zero by default. Sellers can add new variants to their existing products. Sellers can edit variant information including SKU code, option values, and price. Every variant edit creates a snapshot preserving the previous variant state. Sellers can delete variants only if there are no pending order items in paid or shipped status for that variant. Variants also cannot be deleted if there are pending cancellation or refund requests. A product must have at least one variant to be purchasable by customers. Products with no variants are visible in search but displayed as unavailable.

### Variant Identification and Structure

A product can have multiple variants, each representing a different combination of options such as color, size, or material. Each variant must have a unique SKU code that identifies it across the entire platform. The SKU code cannot be duplicated by any other variant on the platform, regardless of which product or seller it belongs to.

Each variant includes option values that describe the specific combination, such as "Red" for color and "Large" for size. These option values distinguish one variant from another within the same product. When a product has multiple variants, each variant represents a unique combination of all available options.

If a variant is created with a SKU code that already exists, the request is rejected. If a variant is created without option values when the product supports options, the request is rejected.

### Variant Pricing and Stock

Each variant can have a price that overrides the product's base price. This price override is optional. If no variant price is set, the product's base price applies to that variant. If a variant price is set, that price is used instead of the base price for all transactions involving that variant.

Stock quantity is required for each variant and must be tracked independently. Each variant maintains its own stock quantity separate from other variants of the same product. The stock quantity starts at zero when a variant is first created. Sellers must explicitly add inventory to make a variant available for purchase.

When a variant is created, if no initial stock quantity is provided, the stock is set to zero. If a negative stock quantity is provided during creation or inventory adjustment, the request is rejected.

### Variant Modification and Snapshots

Sellers can add new variants to their existing products at any time. When adding a variant, the seller must provide all required information including SKU code, option values, and initial stock quantity.

Sellers can edit variant information including SKU code, option values, and price. Every variant edit creates a snapshot that preserves the previous variant state before the change. The snapshot records what fields were changed, the values before the change, and the values after the change. Snapshots are immutable and cannot be modified or deleted.

If a seller attempts to edit a variant that does not belong to them, the request is rejected. If a variant edit would result in a duplicate SKU code, the request is rejected.

### Variant Deletion and Purchase Eligibility

Sellers can delete variants only if there are no pending order items in paid or shipped status for that variant. Variants also cannot be deleted if there are pending cancellation or refund requests associated with that variant. These restrictions ensure that active orders and dispute resolutions are not affected by variant removal.

A product must have at least one variant to be purchasable by customers. If a product has no variants, it is visible in search results and category listings but displayed as unavailable. Customers cannot add products with no variants to their cart.

If a seller attempts to delete a variant with pending order items, the request is rejected. If a seller attempts to delete a variant with pending cancellation or refund requests, the request is rejected. If deleting a variant would leave a product with zero variants, the request is rejected unless the product itself is being deleted.

## ProductImage Rules

Sellers can upload multiple images for each product to showcase their items. Images can be reordered by the seller to control their display sequence. The first image in the sequence serves as the main or thumbnail image shown in listings. Sellers can delete images from their products when they are no longer needed or appropriate. All image changes including additions, deletions, and reordering are included in product snapshots. This ensures the complete visual state of the product is preserved at each edit point. Images are associated with the specific product they belong to and cannot be shared across products. The image order determines how customers view the product gallery on the detail page. Product snapshots capture all images along with their sort order at the time of the snapshot.

### Product Image Management

Sellers can upload multiple images for each product to showcase their items from different angles or highlight various features. There is no limit on the number of images a seller can add to a product. Each image is associated with exactly one product and cannot be shared or reused across different products. Sellers can delete images from their products when images are no longer needed, accurate, or appropriate. When an image is deleted, it is permanently removed from the product. If a product is deleted by the seller or administrator, all images associated with that product are also deleted. Sellers have full management control over the images for their own products only.

### Image Ordering and Display

Sellers can reorder the images for their products to control the display sequence in the product gallery. The system maintains a sort order for all images associated with a product. The first image in the sort order is designated as the main image and serves as the thumbnail. This thumbnail image is displayed in product listings, search results, and category pages. On the product detail page, all images are displayed in the gallery according to their sort order. Customers view the product images in the sequence defined by the seller. When the seller changes the image order, the new sort order is immediately reflected in all customer-facing displays.

### Image Snapshot Preservation

All image changes are included in product snapshots to preserve the complete visual state of the product at each edit point. When a product snapshot is created, it captures all images associated with the product along with their sort order at that moment. This includes additions of new images, deletions of existing images, and reordering of images. The product snapshot preserves the visual state of the product for dispute resolution and historical reference. Snapshots containing image data are immutable and cannot be deleted. Sellers can view snapshots of their own products to see previous image configurations. Administrators can view snapshots of any product on the platform. Image snapshots remain preserved even after the product itself is deleted.

## Wishlist Rules

Customers can add products to their personal wishlist for future reference. The wishlist displays products rather than specific variants, showing the product as a whole. Customer wishlists are paginated to handle large numbers of saved items. Customers can view their complete wishlist at any time from their account. Customers can remove products from their wishlist when they no longer wish to track them. If a seller deletes a product, that product is automatically removed from all customer wishlists. This prevents customers from seeing unavailable or deleted products in their saved items. The wishlist serves as a bookmarking feature for products customers are interested in purchasing later. Wishlist entries are tied to the customer account and persist across sessions.

### Wishlist Management

Customers can add products to their personal wishlist for future reference. The wishlist is associated with the customer account and persists across sessions. When a customer adds a product to the wishlist, the product is saved at the product level, not at the variant level. This means customers save the product as a whole rather than specific variants with particular options. The wishlist serves as a bookmarking feature for products customers are interested in purchasing later. Customers can view their complete wishlist at any time from their account. Each wishlist entry displays the product information including the main image, name, base price, and seller shop name. If a product has multiple variants with different prices, the price range is displayed instead of a single price.

### Wishlist Viewing and Pagination

The customer wishlist is paginated to handle large numbers of saved items. When viewing the wishlist, products are displayed in a list format with pagination controls. Customers can navigate through multiple pages of their wishlist items. The wishlist shows products from all sellers that the customer has saved. Each product in the wishlist list displays the main image (thumbnail), product name, base price or price range, seller shop name, and average rating if reviews exist. Customers can click on any product in the wishlist to view the full product detail page. The wishlist is sorted by newest first, showing the most recently added products at the top.

### Product Removal and Cleanup

Customers can remove products from their wishlist when they no longer wish to track them. When a customer removes a product, it is immediately deleted from their wishlist. If a seller deletes a product, that product is automatically removed from all customer wishlists. This prevents customers from seeing unavailable or deleted products in their saved items. When a product is deleted by the seller, the system identifies all wishlists containing that product and removes the entries. This automatic cleanup ensures wishlist integrity and prevents customers from attempting to purchase products that no longer exist. If a product becomes unavailable for any reason other than deletion (such as seller suspension), the product remains in the wishlist but is marked as unavailable when viewed.

## Cart Rules

Customers can add product variants to their shopping cart for purchase. When adding to cart, customers must specify the quantity of each variant they want. If the same variant is already in the cart, the quantities are combined rather than creating a separate line item. The cart displays each item with product name, variant options, price, quantity, and subtotal. Customers can change the quantity of items already in their cart. Customers can remove items from their cart entirely. The cart calculates and shows the total price of all items combined. If a variant's available stock is less than the cart quantity, a warning is shown to the customer. If a variant is deleted by the seller or becomes out of stock, it is marked as unavailable in the cart. Unavailable items cannot proceed to checkout.

### Cart Item Addition Rules

Customers can add product variants to their shopping cart. When adding a variant to the cart, the customer must specify the quantity they wish to purchase. The quantity must be at least 1. If the same variant is already in the cart, the new quantity is added to the existing quantity rather than creating a separate line item. For example, if the cart already contains 2 units of a variant and the customer adds 3 more units of the same variant, the cart will show 5 units of that variant. If the variant is deleted by the seller before the customer adds it to the cart, the request is rejected. If the variant is out of stock, the request is rejected.

### Cart Display Rules

The shopping cart displays each item with the following information: product name, variant options (such as color and size), price per unit, quantity, and subtotal for that item. The cart displays the total price of all items combined. Variant options are shown in a readable format (for example, "Color: Red, Size: Large"). The total price is calculated by summing the subtotals of all cart items. If the cart is empty, no items are displayed and the total price is shown as zero.

### Cart Modification Rules

Customers can change the quantity of any item in their cart. The quantity can be increased or decreased, but must remain at least 1. If the customer sets the quantity to 0, the item is removed from the cart. Customers can remove items from their cart entirely without setting a quantity. When an item is removed, it is permanently deleted from the cart. If the customer removes all items, the cart becomes empty. If a variant is deleted by the seller while it is in the customer's cart, the item is marked as unavailable and cannot be modified.

### Cart Validation and Checkout Restrictions

If a variant's available stock is less than the quantity in the cart, a warning is shown to the customer indicating insufficient stock. If a variant is deleted by the seller, the item is marked as unavailable in the cart. If a variant becomes out of stock (stock quantity reaches 0), the item is marked as unavailable in the cart. Unavailable items cannot proceed to checkout. When the customer attempts to checkout, all unavailable items are identified and the checkout is blocked until those items are removed from the cart. The customer must remove unavailable items or reduce quantities to match available stock before proceeding to checkout.

## CartItem Rules

Each cart item represents a specific product variant that the customer intends to purchase. Cart items must specify a particular variant, not just a general product. The quantity for each cart item must be specified when adding or modifying the item. When the same variant is added multiple times, the existing cart item quantity is increased rather than creating a new cart item. Cart items show the product name, variant option values, unit price, quantity, and line subtotal. Cart items for unavailable variants are marked to indicate they cannot be purchased. Customers cannot proceed to checkout with cart items that are marked as unavailable. The cart item structure ensures accurate pricing and inventory tracking for each specific variant. Cart items are removed from the cart when the customer completes checkout and places an order.

### Variant Specificity

Each cart item must reference a specific product variant, not a general product. Customers cannot add a product to the cart without selecting a particular variant. The variant option values such as color and size must be displayed alongside the product name in the cart. If a variant is deleted by the seller, the associated cart item is marked as unavailable. If a variant has no stock, the associated cart item is marked as unavailable.

### Quantity Rules

Customers must specify the quantity when adding a variant to the cart or modifying an existing cart item. When the same variant is added to the cart multiple times, the quantities are combined into a single cart item rather than creating separate entries. The quantity for each cart item must be at least one. If the requested quantity exceeds available stock, the cart item is still added but marked with a warning.

### Cart Item Display

Each cart item displays the product name, variant option values, unit price, quantity, and line subtotal. The unit price reflects the variant's price at the time the item was added to the cart. The line subtotal is calculated by multiplying the unit price by the quantity. The cart shows the total price by summing all line subtotals. If the variant price changes after being added to the cart, the unit price in the cart item is updated to reflect the current price.

### Availability Validation

When a variant becomes unavailable due to deletion or zero stock, the associated cart item is marked to indicate it cannot be purchased. Customers cannot proceed to checkout if any cart item is marked as unavailable. The system validates that all cart items are available before allowing checkout. The unit price must match the current variant price at checkout time. If the price has changed, the customer is shown the updated price before confirming the order.

### Cart Item Lifecycle

Customers can modify the quantity of existing cart items. Customers can remove individual cart items from the cart at any time before checkout. When checkout completes successfully and the order is placed, all cart items are removed from the cart. Each cart item is associated with inventory tracking to ensure accurate stock management. When an order is created, a negative inventory record is automatically generated for each purchased variant based on the cart item quantities.

## Order Rules

Orders are created when customers successfully complete payment during checkout. Each order contains one or more order items representing the purchased products. Orders are assigned a unique order number for identification and tracking purposes. The order date is recorded at the time of successful payment completion. Customers must select a shipping address during checkout, which can be their default or a different saved address. Once an order is placed, the shipping address cannot be changed by the customer. The overall order status is derived from the statuses of its individual order items. Order items are removed from the customer's cart when the order is successfully created. Orders remain in the system even if the customer later deletes their account. Order records include the complete list of items, shipping address, and associated shipments.

### Order Creation and Payment

Orders are created only when payment is successfully completed. If payment fails, no order is created and the customer can retry the payment process. Each order is assigned a unique order number that identifies the order throughout its lifecycle. The order date is recorded at the time of successful payment completion. The order date cannot be modified after the order is created. Orders cannot be created without successful payment processing.

### Order Items and Structure

Each order must contain at least one order item. An order can contain multiple order items representing different purchased products or variants. If a customer purchases multiple quantities of the same variant, it becomes one order item with the combined quantity. Each order item includes a snapshot of the product details, variant options, and seller profile at the time of purchase. These snapshots preserve the exact state of products and seller information as they were when the order was placed. Order records include the complete list of items, shipping address, and total price.

### Shipping Address Rules

Customers must select a shipping address during checkout. The shipping address can be the customer's default address or any other saved address. Once an order is placed, the shipping address cannot be changed by the customer. The shipping address is preserved with the order record even if the customer later deletes or modifies their saved addresses. Orders cannot be placed without a valid shipping address selection.

### Order Status Derivation

The overall order status is derived from the statuses of its individual order items. If all items in an order have status paid, the order status is paid. If any item in an order has status shipped and no items are delivered yet, the order status is shipped. If all items in an order have status delivered, the order status is delivered. If all items in an order have status cancelled, the order status is cancelled. If all items in an order have status refunded, the order status is refunded. If items have mixed statuses (for example, some delivered and some refunded), the order status is partially completed.

### Cart Integration

When an order is successfully created, all items that were in the customer's cart are removed. If order creation fails, the cart items remain in the cart. Cart items are only removed upon successful order creation, not upon payment initiation. If a customer has multiple orders in progress, each successful order creation removes only the items that were part of that specific order.

### Order Persistence

Orders remain in the system permanently even if the customer later deletes their account. When a customer deletes their account, their order history and order records are preserved for seller records and legal purposes. Orders cannot be deleted by customers. Order records are immutable after creation except for status changes through the defined order lifecycle. The system preserves complete order information including items, shipping address, and associated shipments regardless of account status changes.

### Shipment Association

Orders can have one or more shipments associated with them. Each shipment contains one or more order items from the same seller. Different sellers always ship separately, resulting in different shipments for the same order if items are from different sellers. A seller can choose to ship items individually or bundle multiple items into one shipment. All items in the same shipment share the same tracking information. Shipments are created by sellers when they ship order items. Each shipment includes tracking information with carrier name and tracking number.

## OrderItem Rules

Each order item represents a purchased product variant with a specific quantity. Order items have individual statuses that track their progress through the fulfillment process. Item statuses include paid, shipped, delivered, cancelled, and refunded states. Each order item can be individually cancelled or refunded independent of other items in the order. A snapshot of the product is saved with the order item, preserving name, description, and details at purchase time. A snapshot of the variant is also saved, preserving option values and price at purchase time. A snapshot of the seller's profile is saved, preserving shop name and logo at purchase time. Order items can be grouped into shipments when the seller ships them. Multiple items from the same seller can be included in a single shipment. Items from different sellers are always shipped in separate shipments.

### Order Item Status States

Each order item maintains its own individual status independent of other items in the same order. The system tracks five distinct status states for each order item: paid, shipped, delivered, cancelled, and refunded.

When payment succeeds, the order item status is set to paid, indicating the item is awaiting shipment by the seller. When the seller creates a shipment containing the item, the status changes to shipped. When the customer confirms delivery or 14 days pass from the shipping date, the status changes to delivered. When a cancellation request is approved, the status changes to cancelled. When a refund request is approved, the status changes to refunded.

The overall order status is derived from the statuses of all items within the order, but each item's status progresses independently through the fulfillment tracking process.

### Individual Cancellation and Refund

Each order item can be cancelled independently of other items in the same order. Customers can request cancellation for individual items that have paid status and have not yet been shipped. The seller of that specific item can approve or reject the cancellation request. When approved, only that item is cancelled while remaining items in the order continue processing normally.

Each order item can be refunded independently of other items in the same order. Customers can request a refund for individual items that have delivered status. The refund request must be submitted within 7 days of the item being delivered. The seller of that specific item can approve or reject the refund request. When approved, only that item is refunded while remaining items in the order are unaffected.

This individual cancellation capability and individual refund capability ensure that order item independence is maintained throughout the order lifecycle. If all items in an order are cancelled, the entire order status becomes cancelled. If all items in an order are refunded, the entire order status becomes refunded.

### Purchase Time Snapshot Preservation

When an order is placed, the system captures and preserves the complete state of all relevant data at purchase time through snapshot preservation. This ensures accurate records for dispute resolution and historical reference.

Product snapshot preservation occurs for each order item, capturing the product name, description, category, base price, and images as they existed at the moment of purchase. This snapshot remains immutable and is viewable by the customer and administrators.

Variant snapshot preservation occurs for each order item, capturing the SKU code, option values, price, and any variant-specific details as they existed at the moment of purchase. This ensures the exact variant configuration purchased is preserved even if the seller later modifies or deletes the variant.

Seller profile snapshot preservation occurs for each order item, capturing the shop name, shop description, and logo as they existed at the moment of purchase. This ensures the seller's storefront identity at purchase time is preserved even if the seller later changes their profile or deletes their account.

This purchase time state capture applies to all order items and creates immutable records that cannot be modified or deleted. The snapshots are preserved even if the original product, variant, or seller profile is later modified or deleted.

### Shipment Grouping Rules

Order items are grouped into shipments when the seller ships them. A shipment is a physical package that can contain one or more order items. Shipment grouping follows specific rules based on seller ownership.

Same seller bundling allows a seller to include multiple order items from their products into a single shipment. When a seller ships items, they can select one or more of their order items to include in the same shipment. All items in the same shipment share the same tracking information, including carrier name and tracking number. When the shipment is created, all items included in it change to shipped status simultaneously.

Different seller separation ensures that order items from different sellers are always shipped in separate shipments. Items belonging to different sellers cannot be combined into the same shipment, as each seller manages their own shipping process independently.

When the customer confirms delivery for a shipment, all order items within that shipment change to delivered status. If the customer does not confirm delivery, all items in the shipment automatically change to delivered status after 14 days from the shipping date. This fulfillment tracking mechanism ensures accurate status updates based on shipment delivery.

## Shipment Rules

A shipment represents a package sent by a seller to a customer. Each shipment can contain one or more order items from the same seller. Different sellers always ship separately, creating different shipments for their respective items. Sellers can choose to ship items individually or bundle multiple items into one shipment. When creating a shipment, sellers must enter tracking information including carrier name and tracking number. All items included in the same shipment share the same tracking information. When a shipment is created, all items in it change to shipped status. Customers can view tracking information for each shipment associated with their orders. Customers confirm delivery per shipment rather than per individual item. When delivery is confirmed, all items in that shipment change to delivered status. If the customer does not confirm delivery, items automatically change to delivered status after 14 days from the shipping date.

### Shipment Composition Rules

A shipment represents a single package sent by a seller to a customer. Each shipment can contain one or more order items, but all items in a shipment must belong to the same seller. Order items from different sellers cannot be combined into the same shipment and must always be shipped separately. When an order contains items from multiple sellers, each seller creates their own shipment(s) for their respective items. A seller can choose to ship their items individually as separate shipments or bundle multiple items together into a single shipment. Once a shipment is created, the items included in it cannot be moved to a different shipment.

### Tracking Information Requirements

When creating a shipment, the seller must enter tracking information consisting of a carrier name and a tracking number. Both the carrier name and tracking number are required fields and cannot be left empty. All order items included in the same shipment share the same tracking information. The tracking information cannot be changed after the shipment is created. If a seller needs to correct tracking information, they must contact customer support. Customers can view the tracking information for each shipment associated with their orders, including the carrier name and tracking number.

### Shipment Status Transitions

When a shipment is created by a seller, all order items included in that shipment automatically change to shipped status. An order item can only be included in a shipment if its current status is paid. If an order item has already been cancelled or refunded, it cannot be added to a shipment. Once an item's status changes to shipped via shipment creation, it cannot revert to paid status. Each order item can only belong to one shipment throughout its lifecycle.

### Delivery Confirmation Rules

Customers confirm delivery at the shipment level rather than for individual order items. When a customer confirms delivery for a shipment, all order items in that shipment automatically change to delivered status. If the customer does not manually confirm delivery, the system automatically changes all items in the shipment to delivered status after 14 days from the shipping date. The 14-day period is calculated from the date the shipment was created. Once an item reaches delivered status through either manual confirmation or automatic timeout, it becomes eligible for refund requests.

## Review Rules

Customers can write reviews only for products they have purchased through the platform. A review can only be written after the order item status is delivered for that product. Customers can write one review per product per order, preventing duplicate reviews for the same purchase. Each review must include a rating from 1 to 5 stars as a required field. Review text content is optional and can be left blank by the customer. Reviews are displayed on the product detail page for other customers to see. Reviews are sorted by newest first to show recent feedback prominently. Customers can edit their own reviews to update rating or text content. Every review edit creates a snapshot preserving the previous review state. Customers can delete their own reviews, but the snapshots remain preserved. The product's average rating is calculated from all non-deleted reviews.

### Review Creation Eligibility

A customer can write a review only for products they have purchased through the platform. A review can be written only after the order item status for that product has changed to delivered. A customer can write exactly one review per product per order, preventing duplicate reviews for the same purchase transaction. If the customer attempts to write a second review for the same product in the same order, the request is rejected. If the customer attempts to write a review for a product they have not purchased, the request is rejected. If the customer attempts to write a review before the order item status is delivered, the request is rejected.

### Review Content Validation

Each review must include a rating from 1 to 5 stars as a required field. The rating value must be a whole number between 1 and 5 inclusive. If the rating is missing, the request is rejected. If the rating is outside the 1 to 5 range, the request is rejected. Review text content is optional and can be left blank by the customer. An empty text field is accepted when creating or editing a review.

### Review Display and Sorting

Reviews are displayed on the product detail page for all customers to view. Reviews are sorted by newest first, showing the most recently created or edited reviews at the top of the list. When a review is edited, the edit timestamp is used for sorting purposes, moving the edited review to the top of the list.

### Review Editing and Snapshots

Customers can edit their own reviews to update the rating or text content. Every review edit creates a snapshot that preserves the previous review state including the rating and text content before the change. The snapshot records when the change was made and the values before and after the edit. Snapshots are immutable and cannot be deleted or modified. Customers can view their own review snapshots. Administrators can view snapshots of any review for dispute resolution purposes.

### Review Deletion

Customers can delete their own reviews at any time. When a review is deleted, the review content is no longer visible on the product detail page. The review snapshots created during edits remain preserved even after the review is deleted. Deleted reviews are excluded from the product's average rating calculation. If a customer attempts to delete a review they did not write, the request is rejected.

### Average Rating Calculation

The product's average rating is calculated from all non-deleted reviews for that product. Only reviews that have not been deleted by their authors are included in the calculation. The average is computed by summing all rating values from non-deleted reviews and dividing by the count of non-deleted reviews. If a product has no non-deleted reviews, no average rating is displayed. When a review is deleted, the average rating is recalculated excluding that review. When a review is edited, the average rating is recalculated using the new rating value.

## InventoryRecord Rules

Each product variant has its own stock quantity managed through inventory history records. Inventory records track quantity changes rather than storing the current stock directly. Each inventory record contains a quantity change value, which is positive for restocking and negative for orders or adjustments. Each record includes a reason explaining why the quantity changed. Each record includes a timestamp showing when the change occurred. The current stock quantity is calculated by summing all inventory records for a variant. Sellers can add inventory by creating restock records with positive quantity changes. Sellers can subtract inventory by creating adjustment records with negative quantity changes. Order placement automatically creates a negative inventory record for each purchased variant. Order cancellation or refund automatically creates a positive inventory record to restore stock. When stock reaches zero, the variant is shown as out of stock. Out of stock variants cannot be added to customer shopping carts.

### Stock Quantity Calculation

The current stock quantity for each product variant is calculated by summing all inventory records associated with that variant. Each inventory record contains a quantity change value that contributes to the total stock. The system maintains a complete history of all quantity changes rather than storing only the current stock value. Each inventory record includes a timestamp indicating when the quantity change occurred. The calculated stock quantity is updated immediately whenever a new inventory record is created.

### Inventory Record Creation

Every inventory record must include a reason explaining why the quantity changed. The reason is required and cannot be empty. Inventory records are immutable once created and cannot be modified or deleted. Each inventory record captures the quantity change value, which can be positive or negative depending on the type of adjustment. Positive quantity changes increase the variant's stock. Negative quantity changes decrease the variant's stock. Each inventory record is automatically timestamped at the moment of creation.

### Seller Inventory Management

Sellers can add inventory to their product variants by creating restock records with positive quantity changes. Sellers can subtract inventory from their product variants by creating adjustment records with negative quantity changes. Each restock or adjustment action requires the seller to provide a reason for the quantity change. Sellers can view the complete inventory history for each of their product variants. The inventory history shows all quantity changes with their reasons and timestamps. Sellers manage stock quantities only for variants belonging to their own products.

### Automatic Stock Adjustments

When a customer places an order, the system automatically creates negative inventory records for each purchased variant. The quantity change equals the purchased quantity for each variant. When an order item is cancelled, the system automatically creates a positive inventory record to restore the stock quantity. When an order item is refunded, the system automatically creates a positive inventory record to restore the stock quantity. The stock restoration occurs only after the cancellation or refund is approved. Automatic inventory records include system-generated reasons indicating the source of the adjustment.

### Out of Stock Behavior

When a variant's calculated stock quantity reaches zero, the variant is displayed as out of stock to customers. Out of stock variants remain visible in product listings and search results. Out of stock variants cannot be added to customer shopping carts. If a variant in a customer's cart becomes out of stock, the variant is marked as unavailable in the cart. Customers cannot proceed to checkout with unavailable variants in their cart. When a variant's stock quantity increases from zero to a positive value, the out of stock indicator is removed and the variant becomes purchasable again.

## CancellationRequest Rules

Cancellation is handled per order item rather than per entire order. Customers can request cancellation only for individual items with paid status that have not yet been shipped. Each cancellation request must include a reason provided as text explaining why the customer wants to cancel. The seller of the order item can approve or reject the cancellation request. When a seller responds to a cancellation request, a snapshot of the request state is created. If the cancellation is approved, that specific item is cancelled and a refund is processed for that item only. Cancelled items have their stock quantities restored through an inventory record. The remaining items in the order continue processing normally without interruption. If all items in an order are cancelled, the entire order status becomes cancelled. Cancellation requests cannot be made for items that have already been shipped.

### Per-Item Cancellation

Cancellation is handled per order item rather than per entire order. Each order item can be cancelled individually without affecting other items in the same order. Customers request cancellation for specific items they no longer wish to purchase. The cancellation of one item does not prevent other items from continuing through the normal order processing flow.

### Cancellation Request Eligibility

Customers can request cancellation only for order items with paid status. Items that have already been shipped cannot be cancelled. If an item has shipped status, delivered status, cancelled status, or refunded status, the cancellation request is rejected. The system validates that the item has not yet been shipped before accepting a cancellation request.

### Cancellation Request Content

Each cancellation request must include a reason provided as text. The reason explains why the customer wants to cancel the item. The reason text is required and cannot be empty. The reason is stored with the cancellation request and is visible to the seller when reviewing the request.

### Seller Response Process

The seller of the order item can approve or reject the cancellation request. When a seller responds to a cancellation request, a snapshot of the request state is created to preserve the state at the time of response. The snapshot records the status before and after the seller's decision. Sellers cannot respond to cancellation requests for items they did not sell.

### Approved Cancellation Effects

When a cancellation request is approved, that specific order item is cancelled. A refund is processed for that item only. The cancelled item has its stock quantity restored through an inventory record with a positive quantity change. The inventory record includes the reason referencing the cancellation. Other items in the same order are unaffected by the cancellation.

### Order Status After Cancellation

The remaining items in the order continue processing normally without interruption. If all items in an order are cancelled, the entire order status becomes cancelled. If some items are cancelled while others remain in paid, shipped, or delivered status, the order status reflects the state of the remaining items according to the order status derivation rules.

## RefundRequest Rules

Refund is handled per order item rather than per entire order. Customers can request a refund only for individual items with delivered status. Refund requests can only be made within 7 days of the item being delivered. Each refund request must include a reason provided as text explaining why the customer wants a refund. The seller of the order item can approve or reject the refund request. When a seller responds to a refund request, a snapshot of the request state is created. If the refund is approved, that specific item is marked as refunded. Refunded items have their stock quantities restored through an inventory record. The remaining items in the order are unaffected by the refund. If all items in an order are refunded, the entire order status becomes refunded. Refund requests cannot be made for items that have not been delivered or are past the 7-day window.

### Refund Request Eligibility

Refund requests are handled per order item rather than per entire order. A customer can request a refund only for an order item that has delivered status. The refund request must be made within 7 days of the item being delivered. Refund requests cannot be submitted for items that have not been delivered. Refund requests cannot be submitted for items where more than 7 days have passed since delivery. Each order item can have a refund request regardless of the status of other items in the same order.

### Refund Request Submission

Each refund request must include a reason provided as text explaining why the customer wants a refund. The reason text is required when submitting a refund request. The customer submits the refund request for a specific order item.

### Seller Response Process

The seller of the order item can approve or reject the refund request. When a seller responds to a refund request by approving or rejecting it, a snapshot of the request state is created. The snapshot preserves the state of the refund request at the time of the seller's response for dispute resolution purposes.

### Refund Processing Outcomes

If the refund request is approved, that specific order item is marked as refunded. When an item is refunded, its stock quantity is restored through an inventory record. The remaining items in the order are unaffected by the refund of one item and continue with their current status. If all items in an order are refunded, the entire order status becomes refunded.

## SellerApprovalRequest Rules

Seller accounts require administrator approval before they can sell products on the platform. Sellers can view their approval status which shows pending, approved, or rejected states. When a seller registration is pending, they cannot list products or make sales. Administrators can approve seller registrations, allowing the seller to begin selling. Administrators can reject seller registrations when they do not meet platform requirements. When rejecting a seller registration, administrators must provide a reason explaining the rejection. Rejected sellers can view the rejection reason provided by the administrator. Rejected sellers have the ability to submit a new registration request after addressing the issues. The approval process ensures only qualified sellers can operate on the platform.

### Administrator Approval Requirement

Seller accounts require administrator approval before they can sell products on the platform. When a seller submits a registration request, the request enters a pending state until an administrator reviews it. The seller qualification enforcement ensures only qualified sellers can operate on the platform. Registration request submission is available to any user who wants to become a seller. Platform requirement compliance is verified during the administrator review process. Sellers cannot list products or make sales while their approval request is pending.

### Approval Status and States

Sellers can view their approval status at any time. The approval status shows one of three states: pending, approved, or rejected. When the status is pending, the seller registration request is awaiting administrator review. When the status is approved, the seller can begin listing and selling products. When the status is rejected, the seller cannot sell products but can view the rejection reason and submit a new request.

### Selling Restrictions During Pending

While a seller approval request is in pending state, the seller cannot list any products on the platform. While a seller approval request is in pending state, the seller cannot make any sales. If a seller attempts to create a product while pending, the request is rejected. If a seller attempts to manage inventory while pending, the request is rejected. These restrictions remain in place until the approval status changes to approved.

### Administrator Review Actions

Administrators can approve seller registration requests that meet platform requirements. When an administrator approves a request, the seller status changes to approved and the seller can begin selling. Administrators can reject seller registration requests that do not meet platform requirements. When an administrator rejects a request, the seller status changes to rejected. When rejecting a seller registration, administrators must provide a reason explaining the rejection. The rejection reason is recorded and cannot be modified after submission.

### Rejection Reason Management

Rejected sellers can view the rejection reason provided by the administrator. The rejection reason is displayed to help the seller understand why their request was denied. The rejection reason remains accessible to the seller for reference when preparing a new registration request. Only the seller whose request was rejected can view their specific rejection reason. Administrators can view all rejection reasons they have submitted.

### Re-registration After Rejection

Rejected sellers have the ability to submit a new registration request after addressing the issues identified in the rejection reason. When a new registration request is submitted, the previous rejection reason is preserved for administrator reference. The new request goes through the same approval process as the initial request. There is no limit on the number of times a seller can submit a registration request after rejection. Each new submission resets the approval status to pending.

## AdminPromotionRequest Rules

Any user with a customer or seller account can submit a request to become an administrator. The promotion request must include a reason explaining why the user wants to become an administrator. Super administrators can view the list of all pending administrator promotion requests. Super administrators can approve promotion requests, making the user a regular administrator. Super administrators can reject promotion requests if the user does not qualify. When approved, the user becomes a regular administrator with standard administrative privileges. Super administrators can promote regular administrators to super administrator status. Super administrators can demote other super administrators to regular administrator status. Super administrators cannot demote themselves to prevent losing all super administrator access. The administrator grade system maintains proper access control and oversight.

### Administrator Promotion Request Submission

Any user with a customer account or seller account can submit a request to become an administrator. The promotion request must include a reason text explaining why the user wants to become an administrator. The reason text is required and cannot be empty. When a promotion request is submitted, it enters a pending status. The user can view their own promotion request status. If the request is rejected, the user can view the rejection reason. Rejected users can submit a new promotion request. Each user can have only one pending promotion request at a time. If a user submits a new request while one is pending, the previous pending request is cancelled.

### Promotion Request Review Process

Super administrators can view the list of all pending administrator promotion requests. The pending request list shows the user information, submission date, and reason text for each request. Super administrators can approve promotion requests. When a super administrator approves a request, the user becomes a regular administrator with standard administrative privileges. Super administrators can reject promotion requests if the user does not qualify for administrator role. When rejecting a request, the super administrator must provide a rejection reason. The rejection reason is recorded and visible to the requesting user. When a super administrator responds to a request (approve or reject), the request status changes from pending to approved or rejected. The response timestamp is recorded.

### Administrator Grade Management

The platform has two administrator grades: regular administrator and super administrator. Super administrators can promote regular administrators to super administrator status. When a regular administrator is promoted, they gain all super administrator privileges. Super administrators can demote other super administrators to regular administrator status. When a super administrator is demoted, they lose super administrator privileges and retain only regular administrator privileges. A super administrator cannot demote themselves to regular administrator status. This self-demotion prohibition prevents the system from losing all super administrator access. The administrator grade system ensures proper access control and oversight hierarchy is maintained at all times.

### Administrator Access Control

The administrator grade system maintains proper separation of privileges between regular administrators and super administrators. Regular administrators can perform standard administrative tasks including seller management, category management, product oversight, order oversight, and user management. Super administrators have all regular administrator privileges plus the ability to manage administrator grades. Super administrators can approve administrator promotion requests, promote regular administrators to super administrator, and demote other super administrators to regular administrator. The oversight hierarchy ensures that super administrator actions are distributed among multiple super administrators to prevent single points of control. If only one super administrator exists, that super administrator cannot demote themselves, ensuring the system always has at least one super administrator.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Product Search Filtering

Customers can filter product search results by category. When a category is selected, only products in that category or its subcategories are shown.

Customers can filter product search results by price range. When a minimum price is set, products with base price below the minimum are excluded. When a maximum price is set, products with base price above the maximum are excluded. Both minimum and maximum can be set simultaneously.

Customers can filter product search results to show only in-stock products. When this filter is applied, products where all variants have zero stock are excluded from results.

Multiple filters can be applied simultaneously. Products must match all active filters to appear in results.

If no products match the applied filters, an empty result set is shown with no error.

### Product Search Sorting

Customers can sort product search results by newest first. When selected, products are ordered by creation date with the most recently created products appearing first.

Customers can sort product search results by price from low to high. When selected, products are ordered by base price with the lowest priced products appearing first. If variants have different prices, the lowest variant price is used for sorting.

Customers can sort product search results by price from high to low. When selected, products are ordered by base price with the highest priced products appearing first. If variants have different prices, the highest variant price is used for sorting.

Only one sort option can be active at a time. When a new sort option is selected, it replaces the previous sort order.

If no sort option is selected, results default to newest first.

### List Pagination

Product search results are displayed in pages. Each page shows a fixed number of products. Customers can navigate to the next page or previous page.

Wishlist items are displayed in pages. Each page shows a fixed number of products. Customers can navigate to the next page or previous page.

Order history is displayed in pages. Each page shows a fixed number of orders. Customers can navigate to the next page or previous page.

When a list is paginated, the total number of pages or total item count is shown to the customer.

If a list contains fewer items than the page size, only one page is shown.

If a list is empty, a single empty page is shown with an appropriate message.

Page navigation controls are disabled when there is no previous page or no next page.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication and Account Errors

If a customer or seller enters an incorrect email or password during login, the request is rejected.

If a customer attempts to log in after their account has been banned by an administrator, the request is rejected.

If a seller attempts to log in after their account has been banned by an administrator, the request is rejected.

If a customer attempts to access any feature without registering an account, the request is rejected.

If a user attempts to log in to a deleted account, the request is rejected.

If a seller attempts to perform selling activities before their account is approved by an administrator, the request is rejected.

### Registration and Approval Rejections

If a customer attempts to register with an email that is already in use, the request is rejected.

If a seller attempts to register with an email that is already in use, the request is rejected.

If a seller submits an administrator approval request and the request is rejected, the seller cannot sell products until a new registration request is approved.

If a user submits an administrator promotion request and the request is rejected by a super administrator, the user remains at their current grade.

If a rejected seller submits a new registration request, the previous rejection reason is cleared and the new request enters pending status.

### Product and Variant Operation Failures

If a seller attempts to delete a product that has pending order items with paid or shipped status, the request is rejected.

If a seller attempts to delete a product that has pending cancellation or refund requests, the request is rejected.

If a seller attempts to delete a variant that has pending order items with paid or shipped status, the request is rejected.

If a seller attempts to delete a variant that has pending cancellation or refund requests, the request is rejected.

If a customer attempts to add a variant to cart when the variant is out of stock, the request is rejected.

If a customer attempts to add a variant to cart when the variant has been deleted by the seller, the request is rejected.

If a seller attempts to create a product without a name, description, category, or base price, the request is rejected.

If a seller attempts to create a variant without a SKU code or stock quantity, the request is rejected.

### Order and Payment Failures

If payment fails during checkout, the order is not created and the customer can retry the payment.

If a customer attempts to checkout with unavailable items in the cart, the request is rejected.

If a customer attempts to checkout without selecting a shipping address, the request is rejected.

If a variant's stock quantity is less than the quantity in the customer's cart at checkout time, the request is rejected.

If a product has been deleted by the seller and is in a customer's wishlist, the product is automatically removed from the wishlist.

If a customer attempts to place an order when a variant in the cart has insufficient stock, the request is rejected.

### Cancellation and Refund Request Failures

If a customer requests cancellation for an order item with shipped, delivered, cancelled, or refunded status, the request is rejected.

If a customer requests a refund for an order item that is not in delivered status, the request is rejected.

If a customer requests a refund for an order item more than 7 days after the item was delivered, the request is rejected.

If a seller attempts to approve or reject a cancellation request that has already been responded to, the request is rejected.

If a seller attempts to approve or reject a refund request that has already been responded to, the request is rejected.

If a customer attempts to write a review for an order item that is not in delivered status, the request is rejected.

### Access and Permission Violations

If a customer attempts to edit another customer's profile information, the request is rejected.

If a seller attempts to edit another seller's products, the request is rejected.

If a seller attempts to view snapshots of products they do not own, the request is rejected.

If a regular administrator attempts to promote themselves to super administrator, the request is rejected.

If a super administrator attempts to demote themselves to regular administrator, the request is rejected.

If a suspended seller attempts to create new products, the request is rejected.

If a suspended seller attempts to edit existing products, the request is rejected.

If a suspended seller attempts to make their products visible in search or category listings, the request is rejected.

If a customer attempts to confirm delivery for a shipment they did not receive, the request is rejected.

### Data Validation Failures

If a customer attempts to set a display name or phone number with invalid format, the request is rejected.

If a customer attempts to add an address without recipient name, phone number, street address, city, state/province, postal code, or country, the request is rejected.

If a seller attempts to set a product price to a negative value, the request is rejected.

If a seller attempts to set a variant stock quantity to a negative value, the request is rejected.

If a customer attempts to write a review with a rating below 1 star or above 5 stars, the request is rejected.

If a customer attempts to submit a cancellation or refund request without providing a reason, the request is rejected.

If a seller attempts to create a category or subcategory without a name, the request is rejected.

If a seller attempts to set a variant price that conflicts with the product's base price structure, the request is rejected.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Validation Rules

All uploaded files must pass validation before being accepted by the system.

Files are validated for:
- File integrity (the file is not corrupted)
- File size within acceptable limits
- File format matches the declared content type

If validation fails, the upload is rejected and the user is notified of the failure.

Product images and seller logo images are subject to file validation.

If a file fails validation, the upload request is rejected and the previous file state (if any) is preserved.

### Virus Scanning Requirements

All uploaded files are scanned for malware and viruses before being stored.

The virus scan occurs automatically upon upload, before the file is made available in the system.

If a file is detected as malicious:
- The upload is rejected
- The file is not stored
- The user is notified that the file cannot be uploaded

Files that pass the virus scan are marked as safe and can be used in the system.

If the virus scanning service is unavailable, file uploads are temporarily disabled until the service is restored.

### Content Type Restrictions

Only image files are accepted for upload on this platform.

Product images must be image files.
Seller logo images must be image files.

The system validates that the uploaded file's actual content type matches the declared file type.

If a non-image file is uploaded, the request is rejected.

If the file content does not match the declared content type (e.g., a renamed executable file), the upload is rejected.

Supported image formats are limited to common web image formats.

### File Retention Policies

Uploaded files are retained according to the retention rules of the entities they belong to.

Product images are retained as long as the product exists. When a product is deleted, its images are removed from active listings but preserved in product snapshots.

Seller logo images are retained as long as the seller account exists. When a seller account is deleted, the logo is removed from active display but preserved in order item snapshots where it appeared.

Files preserved in snapshots are immutable and cannot be deleted, as snapshots are permanent records for dispute resolution.

If a file becomes corrupted or unreadable while in storage, it is replaced with a placeholder indicator showing that the image is unavailable.

# Integration Error Handling

Error handling and retry policies for external integrations.

## Integration Failure Policies

Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

### Payment Integration Error Handling

When the payment gateway returns an error, the order is not created.
The customer is notified that the payment failed.
The customer can retry the payment with the same cart contents.
The cart items are preserved when payment fails.
If the payment gateway is unavailable, the checkout process cannot be completed.
The customer can return to the cart and attempt checkout again later.

### Payment Retry Capability

Customers can retry payment after a failed payment attempt.
Each retry creates a new payment request to the payment gateway.
There is no limit on the number of retry attempts.
The customer can modify the cart between retry attempts.
The customer can change the shipping address between retry attempts.
Each retry requires the customer to confirm the order again.

### Integration Failure Response

When the payment gateway cannot be reached, the system displays an error message to the customer.
The error message indicates that the payment service is temporarily unavailable.
The customer's cart is not affected by payment gateway failures.
The customer can continue browsing and add items to the cart during payment gateway outages.
No order records are created when payment integration fails.
No inventory is reserved when payment integration fails.