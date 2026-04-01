**shoppingMall — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## Customer Operations

Customers must register with email and password before accessing any platform features, as guest browsing is not supported. Once registered, customers can log in using their email and password credentials. Customers can change their password at any time through their account settings. Customers have the ability to delete their own account permanently. When a customer deletes their account, their profile information is removed but their order history and reviews are preserved for seller records and legal compliance. Deleted customer reviews are displayed with a deleted user indicator. Customers can edit their profile information including display name and phone number. All customers must be registered to perform any action on the platform including browsing products and making purchases.

### Customer Registration

Users must register with an email address and password before accessing any platform features. Guest browsing is not supported; all users must have a registered account to view products, search, or perform any action on the platform. The registration process requires providing a valid email address and creating a password. Once registered, the user becomes a customer and can access all customer features. Registration is the only way to create a customer account; there is no guest or anonymous access to the platform.

### Customer Login

Registered customers can log in to the platform using their email address and password. Upon successful login, customers gain access to their account features including profile management, wishlist, shopping cart, order history, and checkout. Login authentication verifies the customer's credentials before granting access to protected features. Customers must be logged in to perform actions such as adding items to cart, placing orders, writing reviews, or managing their wishlist.

### Password Management

Customers can change their password at any time through their account settings. The password change operation requires the customer to be authenticated. When changing a password, the customer provides their new password to replace the existing one. The password change applies immediately to the customer's account. Customers use their updated password for all subsequent login attempts.

### Profile Management

Customers can edit their display name at any time through their profile settings. Customers can edit their phone number at any time through their profile settings. Profile edits are applied immediately and reflected across the platform. The display name and phone number are part of the customer's profile information and can be updated independently. Customers can view their current profile information including display name and phone number.

### Account Deletion

Customers can delete their own account permanently. When a customer deletes their account, their profile information including display name and phone number is deleted from the platform. Order history is preserved after account deletion for seller records and legal purposes; past orders remain accessible to sellers and administrators. Reviews written by the customer are preserved after account deletion but are displayed with a deleted user indicator instead of the customer's display name. The account deletion is irreversible; once deleted, the customer cannot recover their account or profile information. Customers can only delete their own account; customers cannot delete other customer accounts.

## Seller Operations

Sellers must register with email and password to create a seller account on the platform. Seller accounts require administrator approval before sellers can list products or make sales. Sellers can view their approval status which shows pending, approved, or rejected states. If a seller registration is rejected, the seller can view the rejection reason provided by the administrator. Rejected sellers have the ability to submit a new registration request for reconsideration. Sellers can change their password at any time through their account settings. Sellers can delete their account only if they have no pending orders in paid or shipped status and no pending cancellation or refund requests. When a seller deletes their account, their products are removed from listings but order history and snapshots are preserved. The shop name associated with past orders remains visible to customers after seller account deletion.

### Seller Registration and Account Management

Sellers can register for a seller account by providing an email address and creating a password. The email address and password are required for registration. Sellers can log in to their seller account using their registered email address and password. Sellers can change their password at any time through their account settings. Sellers can submit a request to delete their seller account. A seller can delete their account only if they have no pending orders in paid status or shipped status. A seller can delete their account only if they have no pending cancellation requests for their order items. A seller can delete their account only if they have no pending refund requests for their order items. When a seller deletes their account, all products owned by that seller are removed from product listings and are no longer visible in search results or category pages. When a seller deletes their account, all order history containing items from that seller is preserved in the system. When a seller deletes their account, the shop name associated with past orders remains visible to customers who purchased from that seller. When a seller deletes their account, all snapshots of products, variants, and seller profile are preserved for historical records.

### Seller Approval Process

When a seller registers, a seller approval request is automatically created and submitted for administrator review. Sellers cannot list products or make sales until their seller account is approved by an administrator. Sellers can view their current approval status at any time. The approval status shows one of three states: pending, approved, or rejected. When a seller registration is pending, the seller can view that their request is awaiting administrator review. When a seller registration is approved, the seller can begin listing products and accepting orders. When a seller registration is rejected, the seller can view the rejection reason provided by the administrator. The rejection reason explains why the seller registration was not approved. Sellers whose registration was rejected can submit a new registration request for reconsideration. When a rejected seller submits a new registration request, a new approval request is created and enters the pending status. Sellers can view the status of their new registration request after resubmission. Administrators review seller approval requests and decide to approve or reject each request.

### Seller Profile Management

Each seller has a profile that includes a shop name, shop description, and logo image. Sellers can edit their shop name at any time. Sellers can edit their shop description at any time. Sellers can upload or change their shop logo image. Every edit to the seller profile creates a snapshot that preserves the previous state. The snapshot records when the change was made, what fields were changed, and the values before and after the change. Seller profile snapshots are immutable and cannot be deleted. Sellers can view the snapshot history of their own profile. Administrators can view the snapshot history of any seller profile. Customers can view seller profiles to see the current shop name, description, and logo. Customers can view seller profiles to see the shop's product listings and average ratings.

## Address Operations

Customers can add multiple shipping addresses to their account for order delivery. Each address must include recipient name, phone number, street address, city, state or province, postal code, and country information. Customers can edit any of their saved addresses to update information as needed. Customers can delete addresses they no longer need from their address book. Customers can designate one address as their default shipping address for convenient checkout. The default address is automatically selected during the checkout process unless the customer chooses a different address. All address information is preserved with orders even if the address is later modified or deleted. Customers must have at least one address to complete checkout and place orders.

### Address Creation

Customers can add multiple shipping addresses to their account for order delivery. Each address must include recipient name, phone number, street address, city, state or province, postal code, and country. All address fields are required when creating a new address. If any field is missing, the address creation is rejected. Customers can save as many addresses as needed for different delivery locations. Each address is associated with the customer who created it and is not visible to other customers.

### Address Management

Customers can edit any of their saved addresses to update information as needed. When editing an address, all fields including recipient name, phone number, street address, city, state or province, postal code, and country can be modified. Customers can delete addresses they no longer need from their address book. If the address being deleted is set as the default address, the customer must designate a different address as default before deletion is allowed.

### Default Address

Customers can designate one address as their default shipping address for convenient checkout. Only one address can be set as the default at any time. When a customer sets an address as default, any previously default address loses its default status. The default address is automatically selected during the checkout process unless the customer chooses a different address. If the customer has no default address set, they must select an address manually during checkout.

### Address in Orders

When an order is placed, the shipping address used is preserved with the order record. If the address is later modified or deleted from the customer's address book, the order retains the original address information as it was at the time of purchase. Customers must have at least one address in their address book to complete checkout and place orders. If a customer has no addresses saved, they cannot proceed to order placement until at least one address is added.

## Category Operations

Categories organize products into a browsable hierarchy for customer navigation. Categories support one level of nesting allowing parent categories and subcategories. Each category has a name and description to help customers understand the product grouping. Only administrators can create new categories and subcategories on the platform. Administrators can edit category names and descriptions to keep them accurate and relevant. Administrators can delete categories when they are no longer needed. When a category is deleted, products previously in that category become uncategorized but remain on the platform. Customers can browse the complete list of all categories to navigate the product catalog. Customers can view all products within a specific category or subcategory. Category management is restricted to administrators to maintain consistent product organization.

### Category Structure and Organization

Categories organize products into a browsable hierarchy for customer navigation. Each category has a name and description that help customers understand the product grouping. The platform supports one level of category nesting, allowing parent categories and subcategories. Subcategories can only be created under parent categories, not under other subcategories. Each category exists independently with its own name and description. Categories serve as the primary navigation structure for customers to browse products.

### Administrator Category Management

Only administrators can create new categories and subcategories on the platform. Administrators can edit category names and descriptions to keep them accurate and relevant. Administrators can delete categories when they are no longer needed. Category management is restricted to administrators to maintain consistent product organization across the platform. Regular customers and sellers cannot create, edit, or delete categories. Administrators can view all categories including parent categories and subcategories when managing the category structure.

### Category Deletion Impact

When an administrator deletes a category, products previously assigned to that category become uncategorized. Uncategorized products remain on the platform and are still accessible through search and direct links. The deletion of a category does not delete the products within it. Products retain all their information including name, description, price, and variants when their category is deleted. Sellers can reassign uncategorized products to other categories through product editing.

### Customer Category Browsing

Customers can browse the complete list of all categories to navigate the product catalog. Customers can view parent categories and their associated subcategories in a hierarchical list. Customers can select a category or subcategory to view all products within it. When viewing a category, customers see all products assigned to that category including products in subcategories. Category browsing is available to all registered customers as part of product discovery. Customers can navigate between parent categories and subcategories to refine their product search.

## Product Operations

Sellers can create products to list for sale on the platform. Every product requires a name, description, category selection, and base price to be created. Products belong to the seller who created them and only that seller can edit or delete the product. Sellers can edit their own products and every edit automatically creates a snapshot preserving the previous state. Sellers can delete their own products only if there are no pending order items in paid or shipped status for any variant. Sellers can also not delete products with pending cancellation or refund requests for any variant. Deleting a product removes all its variants and inventory records from the platform. Deleted products no longer appear in search results or category listings. Sellers can view snapshots of their own products to track changes over time. Administrators can view snapshots of any product for oversight purposes. Product snapshots are preserved even after the product itself is deleted.

### Product Creation

Sellers can create products to list for sale on the platform. When creating a product, the seller must provide a name, description, category selection, and base price. All four fields are required and the product cannot be created without them. The category can be either a main category or a subcategory. The product is automatically associated with the seller who created it and becomes their property. The system shall create the product record with the provided information and make it visible in search results and category listings immediately upon creation.

### Product Editing

Sellers can edit their own products to update information. Only the seller who created the product can edit it. When a seller edits a product, the system shall automatically create a snapshot preserving the previous state of all product fields including name, description, category, base price, and all associated images. The snapshot captures the complete state before the edit is applied. Sellers can modify any product field including the name, description, category assignment, base price, and product images. Image changes such as adding, removing, or reordering images are included in the product snapshot. The system shall apply the edit and preserve the snapshot for future reference and dispute resolution.

### Product Deletion

Sellers can delete their own products subject to specific conditions. The system shall allow product deletion only when there are no pending order items in paid or shipped status for any variant of the product. The system shall also block deletion if there are any pending cancellation or refund requests for any variant of the product. When a product is deleted, the system shall automatically delete all variants associated with the product and all inventory records for those variants. The deleted product shall no longer appear in search results or category listings. Customers cannot purchase or view deleted products. The product deletion is permanent from the customer-facing interface but snapshots remain accessible to the seller and administrators.

### Product Snapshot Viewing

Sellers can view snapshots of their own products to track changes over time. The system shall display all snapshots for a product showing when each change was made and what values were modified. Administrators can view snapshots of any product on the platform for oversight purposes. Product snapshots are preserved even after the product itself is deleted, allowing historical review of the product's state at any point in time. Each snapshot contains the complete product state at the moment it was captured including all product fields and all variant information at that time. The system shall maintain snapshots as immutable records that cannot be modified or deleted.

## ProductVariant Operations

A product can have multiple variants representing different combinations of options like color and size. Each variant requires a unique SKU code to identify it. Each variant includes option values describing the specific combination such as Red and Large. Variants can have a price that overrides the product base price though this is optional. Every variant requires a stock quantity that starts at zero. Sellers can add new variants to their existing products. Sellers can edit variant details including SKU code, option values, and price. Every variant edit creates a snapshot preserving the previous state. Sellers can delete variants only if there are no pending order items in paid or shipped status for that variant. Variants with pending cancellation or refund requests cannot be deleted. A product must have at least one variant to be purchasable by customers. Products with no variants are visible in search but displayed as unavailable to customers.

### Product Multiple Variants Support

A product can have multiple variants representing different combinations of options such as color and size. Each variant represents a specific combination of option values. Customers can select from available variants when viewing a product. Variants allow sellers to offer the same product with different attributes while maintaining a single product listing. All variants belong to the parent product that created them.

### Variant Identification and Options

Each variant requires a unique SKU code that identifies it across the platform. The SKU code cannot be duplicated by any other variant. Each variant includes option values describing the specific combination such as Red for color and Large for size. Option values define what makes each variant distinct from other variants of the same product. The system validates that SKU codes are unique before allowing variant creation or updates.

### Variant Pricing and Stock

Each variant can have a price that overrides the product base price. The variant price is optional. When not specified, the product base price applies to the variant. Every variant requires a stock quantity that tracks available inventory. Stock quantity starts at zero when the variant is created. Sellers manage stock quantities through inventory records. When stock reaches zero, the variant is shown as out of stock to customers.

### Variant Management by Sellers

Sellers can add new variants to their existing products. Sellers can edit variant details including SKU code, option values, and price. Every variant edit creates a snapshot preserving the previous state of the variant. The snapshot includes all variant fields at the time of the change. Sellers can view snapshots of their own product variants. Administrators can view snapshots of any product variant on the platform.

### Variant Deletion Rules

Sellers can delete variants only if there are no pending order items in paid or shipped status for that variant. Variants with pending cancellation requests cannot be deleted. Variants with pending refund requests cannot be deleted. When a variant is deleted, all inventory records for that variant are also deleted. Deleted variants no longer appear in product listings or search results. The system validates deletion conditions before allowing variant removal.

### Product Purchase Requirements

A product must have at least one variant to be purchasable by customers. Products with no variants are visible in search results but displayed as unavailable to customers. Customers cannot add products without variants to their cart. When all variants of a product are deleted, the product becomes unavailable for purchase. The system checks variant availability before allowing customers to proceed with purchase.

## ProductImage Operations

Sellers can upload multiple images for each product to showcase their items. The first image in the sequence serves as the main thumbnail image displayed in search results and listings. Sellers can reorder images to change which image appears first as the thumbnail. Sellers can delete images from their products when they are no longer needed. All image changes including uploads, reordering, and deletions are included in product snapshots. This ensures the complete visual state of a product is preserved at any point in time. Customers viewing product listings see the main thumbnail image for each product. Customers viewing product detail pages see all images associated with the product. Image management is controlled by the product owner seller. Product snapshots preserve all image states for dispute resolution and historical reference.

### Product Image Upload and Management

THE shoppingMall SHALL allow sellers to upload multiple images for each product.
THE shoppingMall SHALL allow sellers to reorder the images associated with their products.
THE shoppingMall SHALL allow sellers to delete images from their products.
THE shoppingMall SHALL restrict image management operations to the product owner seller.

### Main Thumbnail Image

THE shoppingMall SHALL designate the first image in the sequence as the main thumbnail image.
THE shoppingMall SHALL display the main thumbnail image in search results.
THE shoppingMall SHALL display the main thumbnail image in product listings.

### Product Image Display and Snapshots

THE shoppingMall SHALL display all images associated with the product on product detail pages.
WHEN a seller uploads, reorders, or deletes product images, THE shoppingMall SHALL include these changes in product snapshots.
THE shoppingMall SHALL preserve all image states in product snapshots for dispute resolution.
THE shoppingMall SHALL preserve the complete visual state of a product at any point in time through image snapshots.

## Wishlist Operations

Customers can add products to their personal wishlist for future reference. Customers can view their wishlist to see all saved products. The wishlist displays products rather than specific variants. Wishlist viewing supports pagination for customers with many saved items. Customers can remove products from their wishlist when they are no longer interested. If a seller deletes a product, that product is automatically removed from all customer wishlists. This prevents customers from seeing unavailable products in their saved items. The wishlist helps customers track products they are interested in purchasing later. Wishlist management is available to all registered customers. Automatic removal of deleted products keeps wishlists current and accurate.

### Adding Products to Wishlist

Customers can add products to their personal wishlist for future purchase tracking. When adding a product to the wishlist, the customer selects the product from search results, category listings, or the product detail page. The wishlist stores the product reference, not specific variants. A customer can add the same product to their wishlist only once. If the customer attempts to add a product already in their wishlist, the request is rejected. The wishlist is available to all registered customers. Guests cannot access wishlist features. When a product is added to the wishlist, the addition is recorded with a timestamp. Customers can view when each product was added to their wishlist.

### Viewing Wishlist

Customers can view their wishlist to see all saved products. The wishlist displays products rather than specific variants. Each product in the wishlist shows the main image, product name, base price or price range, and seller shop name. The wishlist supports pagination for customers with many saved items. The default page size is 20 products per page. Customers can navigate between pages to view all their saved products. The wishlist is sorted by newest first, showing recently added products at the top. If a product in the wishlist has been deleted by the seller, it does not appear in the wishlist view. The wishlist view helps customers track products they are interested in purchasing later.

### Removing Products from Wishlist

Customers can remove products from their wishlist when they are no longer interested. Removal can be performed from the wishlist view page. When a customer removes a product, the product is immediately removed from their wishlist. The removal action cannot be undone. Customers can remove multiple products from their wishlist one at a time. If a customer removes a product and later wants to save it again, they can add it back to their wishlist. The removal of a product from the wishlist does not affect the product itself or other customers' wishlists. Only the customer who owns the wishlist can remove products from it.

### Automatic Wishlist Cleanup

If a seller deletes a product, that product is automatically removed from all customer wishlists. This automatic removal keeps wishlists current and accurate by preventing customers from seeing unavailable products in their saved items. The automatic removal occurs at the time the product is deleted by the seller. Customers are not notified when products are automatically removed from their wishlists. The automatic removal applies to all wishlists containing the deleted product. This wishlist accuracy maintenance ensures that customers only see products that are still available on the platform. If a product is hidden due to seller suspension, it is also removed from wishlists until the seller is unsuspended.

## Cart Operations

Customers have a shopping cart to collect items they intend to purchase. The cart displays each item with product name, variant options, price, quantity, and subtotal. The cart shows the total price of all items combined. If a variant has less stock than the quantity in the cart, a warning is shown to the customer. If a variant is deleted by the seller or becomes out of stock, it is marked as unavailable in the cart. Unavailable items cannot be included in checkout. Customers can view their cart at any time to review selected items before purchasing. The cart persists for the customer across sessions. Cart contents are cleared when an order is successfully placed. Cart management helps customers organize their intended purchases before checkout.

### Customer Shopping Cart

Each customer has a shopping cart to collect items they intend to purchase. The cart belongs to the customer and persists across sessions. The cart displays all items the customer has added, showing each item with product name, variant options, price, quantity, and subtotal. The cart shows the total price of all items combined. Customers can view their cart at any time to review selected items before purchasing. The cart helps customers organize their intended purchases before checkout.

### Cart Item Display and Pricing

Each item in the cart displays the product name and the specific variant options selected (such as color, size, or other option values). Each item shows the unit price and the quantity selected. Each item shows a subtotal calculated as unit price multiplied by quantity. The cart displays a total price calculated as the sum of all item subtotals. The cart shows all items together regardless of which seller they belong to.

### Stock Availability Warnings

When a variant in the cart has less stock available than the quantity in the cart, a warning is shown to the customer. When a variant is deleted by the seller, the item is marked as unavailable in the cart. When a variant becomes out of stock (stock quantity reaches zero), the item is marked as unavailable in the cart. Unavailable items remain visible in the cart but are clearly distinguished from available items.

### Checkout Restrictions for Unavailable Items

Items marked as unavailable cannot be included in checkout. When the customer proceeds to checkout, the system checks all items in the cart. If any item is marked as unavailable, that item cannot be checked out. The customer must remove unavailable items or resolve the availability issue before completing the purchase. Only available items can be included in the order.

### Cart Access and Persistence

Customers can view their cart at any time after logging in. The cart persists for the customer across sessions, so items remain in the cart between visits. The cart is tied to the customer account and is not shared with other customers. Customers can access their cart from any device when logged into their account.

### Cart Clearance on Order Completion

When an order is successfully placed, all items that were included in that order are removed from the customer's cart. Items that were not included in the order (such as unavailable items that could not be checked out) remain in the cart. The cart is cleared only for items that were successfully purchased. If payment fails and no order is created, the cart contents remain unchanged.

## CartItem Operations

Customers add specific variants to their cart, not just products. When adding to cart, customers must specify the quantity they want to purchase. If the same variant is already in the cart, the quantities are combined rather than creating a separate line item. Customers can change the quantity of items already in their cart. Customers can remove individual items from their cart. Each cart item represents one specific variant with a specific quantity. The cart combines duplicate variants to simplify the shopping experience. Quantity changes update the cart total immediately. Removing an item removes it completely from the cart. Cart item management allows customers to adjust their order before checkout.

### Adding Variants to Cart

Customers add specific product variants to their shopping cart, not products alone. When adding a variant to cart, the customer must specify the quantity they wish to purchase. Each cart item represents exactly one specific variant with one specific quantity. If the same variant is already in the cart, the new quantity is combined with the existing quantity rather than creating a separate cart item line. The cart automatically combines quantities for duplicate variants to ensure no duplicate variant lines appear in the cart. This combining happens immediately when the variant is added.

### Cart Item Quantity Management

Customers can change the quantity of any item already in their cart. When a customer changes an item quantity, the cart total price updates immediately to reflect the change. Customers can adjust cart item quantities at any time before proceeding to checkout. The quantity change operation allows customers to modify their order composition before finalizing their purchase.

### Cart Item Removal

Customers can remove individual items from their shopping cart. When a customer removes an item, that item is completely removed from the cart. The cart total is recalculated after removal. Customers can remove any item from their cart regardless of quantity or variant type.

## Order Operations

Orders are created when payment is successfully processed during checkout. An order contains one or more order items representing purchased product variants. Orders are assigned a unique order number for customer reference. Customers can view a list of all their orders sorted by newest first with pagination support. Each order in the list shows order number, date, total price, and overall order status. Customers can view full details of any order including all items, shipping address, and shipment tracking. The overall order status is derived from the statuses of its individual items. Orders cannot be deleted by customers once created. Order history is preserved even if a customer deletes their account. Administrators can view all orders on the platform for oversight purposes.

### Order Creation

An order is created when a customer successfully completes payment during checkout. The order is assigned a unique order number that serves as a reference for the customer. An order contains one or more order items, each representing a purchased product variant with a specified quantity. When an order is created, stock quantities are decreased for each purchased variant, and the purchased items are removed from the customer's cart. A snapshot of each purchased product and variant is saved with the order item, preserving the product name, description, variant options, and price at the time of purchase. A snapshot of each seller's profile is also saved with the order item, preserving the shop name and logo at the time of purchase. The shipping address selected during checkout is recorded with the order and cannot be changed after the order is placed.

### Order History Viewing

Customers can view a list of all their orders. The order history list is paginated and sorted by newest orders first. Each order in the list displays the order number, order date, total price, and overall order status. Customers can navigate through pages of their order history to view older orders. The order history list provides a summary view that allows customers to quickly identify their recent purchases and track their order statuses.

### Order Detail Viewing

Customers can view the full details of any order they have placed. The order detail page displays a list of all items in the order, showing for each item the product name, variant options, quantity, price, and current item status. The order detail page shows the shipping address associated with the order. The order detail page displays a list of all shipments for the order, with each shipment showing which items are included and the tracking information (carrier name and tracking number). Customers can access order details from their order history list by selecting an order.

### Order Status Management

The overall order status is derived from the statuses of its individual order items. When all items in an order have status "paid", the order status is "paid". When any item in an order has status "shipped" and no items are yet "delivered", the order status is "shipped". When all items in an order have status "delivered", the order status is "delivered". When all items in an order have status "cancelled", the order status is "cancelled". When all items in an order have status "refunded", the order status is "refunded". When an order has items in mixed states (for example, some delivered and some refunded), the order status is "partially completed". The order status updates automatically as item statuses change.

### Order Lifecycle Rules

Customers cannot delete orders once they are created. Order history is preserved even if a customer deletes their account, ensuring that order records remain available for seller records and legal purposes. When a customer deletes their account, their profile information is deleted but their orders and order history are retained in the system. Orders remain accessible through the order history for reference and dispute resolution purposes.

### Administrator Order Oversight

Administrators can view all orders on the platform for oversight purposes. Administrators can access any order's details regardless of which customer placed it. Administrators can view the complete order history across all customers to monitor platform activity and resolve disputes. This oversight capability allows administrators to enforce platform policies and assist with customer or seller issues related to orders.

## OrderItem Operations

Each order item represents a purchased product variant with a specific quantity. Order items can be from different sellers within the same order. Each order item has its own independent status that tracks its fulfillment progress. Item statuses include paid, shipped, delivered, cancelled, and refunded. Each order item can be individually cancelled or refunded without affecting other items. When an order item is created, a snapshot of the product and variant is saved preserving name, description, options, and price. A snapshot of the seller profile is also saved preserving shop name and logo at time of purchase. If a customer buys multiple units of the same variant, it becomes one order item with the total quantity. Order item status changes reflect the fulfillment lifecycle of that specific item. Individual item handling allows partial order fulfillment and resolution.

### Order Item Creation and Structure

When an order is placed, each purchased product variant becomes an order item. An order item represents a specific product variant with a quantity purchased by the customer. If a customer purchases multiple units of the same variant, they are combined into a single order item with the total quantity, not separate order items.

An order can contain order items from different sellers. Each order item belongs to the seller of that product variant. Sellers only see and manage order items for their own products.

When an order item is created, the system preserves the state of the purchased items through snapshots:
- A snapshot of the product is saved, including the product name, description, category, and base price at the time of purchase
- A snapshot of the product variant is saved, including the SKU code, option values, and price at the time of purchase
- A snapshot of the seller profile is saved, including the shop name and logo at the time of purchase

These snapshots ensure that the order item displays accurate historical information even if the product, variant, or seller profile is later modified or deleted. The snapshots are immutable and cannot be changed after creation.

### Order Item Status Management

Each order item has its own independent status that tracks the fulfillment progress of that specific item. The status of one order item does not affect the status of other order items in the same order.

The system supports the following order item statuses:
- Paid: The payment for this item has been completed, and the item is waiting for the seller to ship
- Shipped: The seller has shipped this item and provided tracking information
- Delivered: The item has been delivered to the customer
- Cancelled: The item has been cancelled before shipment
- Refunded: The item has been refunded after delivery

The order item status changes as the item progresses through the fulfillment lifecycle. When a seller creates a shipment containing an order item, the item status changes to shipped. When a customer confirms delivery of a shipment, all order items in that shipment change to delivered. If a customer does not confirm delivery, order items automatically change to delivered 14 days after the shipment date.

Customers and sellers can view the current status of each order item. The status is displayed in the order details view and in the order history list.

### Individual Item Cancellation

Customers can request cancellation for individual order items without affecting other items in the same order. Cancellation is only supported for order items with status paid. Order items with status shipped, delivered, cancelled, or refunded cannot be cancelled.

When requesting cancellation, the customer must provide a reason for the cancellation request. The cancellation request is submitted to the seller of that order item for review.

The seller can approve or reject the cancellation request. When the seller responds to the cancellation request, a snapshot of the request state is created to preserve the status at the time of response.

If the seller approves the cancellation:
- The order item status changes to cancelled
- The stock quantity for that variant is restored through an inventory record
- A refund is processed for that item only
- The remaining order items continue processing normally

If the seller rejects the cancellation, the order item remains in paid status and continues through the normal fulfillment process.

If all order items in an order are cancelled, the overall order status becomes cancelled.

### Individual Item Refund

Customers can request a refund for individual order items without affecting other items in the same order. Refund requests are only supported for order items with status delivered. Order items with status paid, shipped, cancelled, or refunded cannot have a refund request submitted.

A refund request must be submitted within 7 days of the order item being delivered. Refund requests submitted after this period are rejected.

When requesting a refund, the customer must provide a reason for the refund request. The refund request is submitted to the seller of that order item for review.

The seller can approve or reject the refund request. When the seller responds to the refund request, a snapshot of the request state is created to preserve the status at the time of response.

If the seller approves the refund:
- The order item status changes to refunded
- The stock quantity for that variant is restored through an inventory record
- The refund is processed for that item only
- The remaining order items in the order are unaffected

If the seller rejects the refund request, the order item remains in delivered status.

If all order items in an order are refunded, the overall order status becomes refunded.

### Partial Order Fulfillment

The system supports partial order fulfillment, allowing different order items within the same order to be at different stages of fulfillment simultaneously. This enables flexible handling of multi-seller orders and items with different availability.

Each order item progresses through the fulfillment lifecycle independently. For example, one order item in an order may be delivered while another is still in paid status, or one item may be cancelled while others continue to shipped or delivered status.

The overall order status is derived from the statuses of all order items in the order:
- If all items are paid, the order status is paid
- If any item is shipped and none are delivered yet, the order status is shipped
- If all items are delivered, the order status is delivered
- If all items are cancelled, the order status is cancelled
- If all items are refunded, the order status is refunded
- If items are in mixed states (for example, some delivered and some refunded), the order status is partially completed

This partial fulfillment support allows customers to receive available items while other items are still being processed, and allows individual item issues (cancellation or refund) to be resolved without affecting the entire order.

## Shipment Operations

A shipment is a package sent by a seller containing one or more order items. Different sellers always ship separately creating different shipments. A seller can choose to ship items individually or bundle multiple items into one shipment. When shipping, sellers select which of their order items to include in a shipment. Sellers enter tracking information including carrier name and tracking number for each shipment. All items in the same shipment share the same tracking information. When a shipment is created, all items in it change to shipped status. Customers can view tracking information for each shipment in their order. Customers confirm delivery per shipment rather than per individual item. When the customer confirms delivery, all items in that shipment change to delivered status. If the customer does not confirm, items automatically change to delivered status after 14 days from shipping.

### Shipment Creation by Seller

Sellers can create shipments for their order items that have paid status. A shipment is a package sent by a seller containing one or more order items. Different sellers always ship separately, meaning each seller creates their own shipments for their items. A seller can choose to ship items individually or bundle multiple items into one shipment. When creating a shipment, the seller selects which of their order items to include. The seller must enter tracking information for each shipment, including the carrier name and tracking number. All items in the same shipment share the same tracking information. When a shipment is created, all order items included in that shipment automatically change to shipped status. A shipment can only contain order items from the same seller. Order items from different sellers cannot be combined into a single shipment. If an order item is already shipped or delivered, it cannot be added to a new shipment. If an order item is cancelled or refunded, it cannot be added to a shipment.

### Shipment Tracking Visibility

Customers can view tracking information for each shipment in their orders. The tracking information includes the carrier name and tracking number entered by the seller. Tracking information is visible for all shipments associated with the customer's orders. Customers can access tracking information from their order detail page. Each shipment's tracking information is displayed alongside the list of order items included in that shipment. If a shipment has not yet been created by the seller, no tracking information is shown for those items. Tracking information becomes visible immediately after the seller creates the shipment.

### Delivery Confirmation

Customers can confirm delivery per shipment rather than per individual item. When a customer confirms delivery for a shipment, all order items in that shipment automatically change to delivered status. Delivery confirmation is available for shipments that have been shipped but not yet delivered. If the customer does not manually confirm delivery, order items automatically change to delivered status after 14 days from the shipping date. The automatic delivery confirmation applies to all items in the shipment simultaneously. Once delivery is confirmed (manually or automatically), the delivery date is recorded for the shipment. After delivery confirmation, customers can write reviews for the delivered items.

## Review Operations

Customers can write a review for products they have purchased and received. A review can only be written after the order item status is delivered. Customers can write one review per product per order preventing duplicate reviews for the same purchase. Each review requires a rating from 1 to 5 stars. Review text content is optional and customers can choose to write only a rating. Reviews are displayed on the product detail page for other customers to see. Reviews are sorted by newest first to show recent feedback. Customers can edit their own reviews to update their feedback. Every review edit creates a snapshot preserving the previous rating and content. Customers can delete their own reviews but the snapshots are preserved. The product average rating is calculated from all non-deleted reviews.

### Review Creation

Customers can write a review for products they have purchased and received. A review can only be written after the order item status is delivered. Customers can write one review per product per order, preventing duplicate reviews for the same purchase. Each review requires a rating from 1 to 5 stars. Review text content is optional, allowing customers to submit a rating-only review. The review is automatically associated with the customer who wrote it, the product being reviewed, and the order from which the purchase was made.

### Review Display

Reviews are displayed on the product detail page for all customers to view. Reviews are sorted by newest first, showing the most recent feedback at the top. The product detail page shows the average rating calculated from all non-deleted reviews for that product. The product detail page also shows the total count of reviews for the product.

### Review Editing

Customers can edit their own reviews to update their rating or text content. Every review edit creates a snapshot that preserves the previous rating and text content. The snapshot records when the change was made, what was changed, and the values before and after the edit. Customers can view the edit history of their own reviews through the snapshots.

### Review Deletion

Customers can delete their own reviews. When a review is deleted, the review content is removed from the product detail page but all snapshots of the review are preserved. The product average rating is recalculated from all non-deleted reviews, excluding any deleted reviews from the calculation. Deleted reviews do not appear in the review list on the product detail page.

## InventoryRecord Operations

Inventory records track all stock quantity changes for each product variant. Each inventory record contains the quantity change amount, reason for the change, and timestamp. Positive quantity changes represent restocking or returns while negative changes represent orders or adjustments. The current stock level is calculated by summing all inventory records for a variant. Sellers can add inventory by restocking with a quantity and reason. Sellers can subtract inventory for adjustments or losses with a quantity and reason. Order placement automatically creates a negative inventory record decreasing stock. Order cancellation or refund automatically creates a positive inventory record restoring stock. Sellers can view the full inventory history of each variant to track stock movements. When stock reaches zero, the variant is shown as out of stock and cannot be added to cart.

### Inventory Record Structure and Stock Tracking

Each product variant maintains inventory records that track all stock quantity changes. Every inventory record contains the quantity change amount, the reason for the change, and the timestamp when the change was recorded. Positive quantity changes represent restocking or stock returns while negative quantity changes represent orders or stock adjustments. The current stock level for a variant is calculated by summing all inventory records associated with that variant. Inventory records are immutable once created and cannot be modified or deleted. Each inventory record is associated with exactly one product variant.

### Manual Inventory Adjustments

Sellers can add inventory to their product variants by specifying a quantity and a reason for the restocking. When inventory is added, a new inventory record is created with a positive quantity change. Sellers can subtract inventory from their product variants for adjustments or losses by specifying a quantity and a reason. When inventory is subtracted, a new inventory record is created with a negative quantity change. The reason for each manual inventory adjustment must be provided by the seller. Manual inventory adjustments are recorded immediately and affect the current stock calculation.

### Automatic Inventory Updates

When an order is placed successfully, a negative inventory record is automatically created for each purchased variant. The quantity change in the automatic record equals the quantity purchased in the order item. When an order item is cancelled, a positive inventory record is automatically created to restore the stock quantity. When an order item is refunded, a positive inventory record is automatically created to restore the stock quantity. The automatic inventory records include the order or cancellation or refund as the reason. Sellers cannot manually modify or delete automatic inventory records created by order transactions.

### Inventory History Viewing

Sellers can view the complete inventory history for each of their product variants. The inventory history displays all inventory records in chronological order with the quantity change, reason, and timestamp for each record. The inventory history shows both manual adjustments made by the seller and automatic updates from orders, cancellations, and refunds. Sellers can review the inventory history to track stock movements and understand how the current stock level was calculated. The inventory history is read-only and cannot be modified.

### Stock Status and Cart Integration

When the calculated stock quantity for a variant reaches zero, the variant is displayed as out of stock to customers. Out of stock variants are clearly marked in product listings and product detail pages. Variants that are out of stock cannot be added to the shopping cart. If a variant in a customer's cart becomes out of stock, the variant is marked as unavailable in the cart. The stock status is updated in real-time based on the current inventory records. Customers attempting to add an out of stock variant to cart receive a notification that the item is unavailable.

## CancellationRequest Operations

Cancellation is handled per order item rather than per entire order. Customers can request cancellation for individual items that have paid status and have not yet been shipped. Cancellation requests must include a reason explaining why the customer wants to cancel. The seller of that item can approve or reject the cancellation request. When a seller responds to a cancellation request, a snapshot of the request state is created. If approved, that specific item is cancelled and a refund is processed for that item only. Cancelled items have their stock quantities restored through an inventory record. The remaining items in the order continue processing normally without interruption. If all items in an order are cancelled, the entire order status becomes cancelled. Cancellation requests allow flexible order management without cancelling entire orders.

### Item-Level Cancellation Request

Customers can request cancellation for individual order items rather than entire orders. This allows flexible partial order cancellation without affecting other items in the same order.

Customers can only request cancellation for order items with paid status. Items that have already been shipped or delivered cannot be cancelled through this process.

When requesting cancellation, customers must provide a reason explaining why they want to cancel the item. The reason is recorded as text content.

Each cancellation request is associated with a specific order item and does not affect other items in the order. The remaining items continue processing normally without interruption.

### Seller Response to Cancellation Request

The seller of the order item can approve or reject the cancellation request. Only the seller associated with that specific item can respond to the request.

When the seller responds to a cancellation request (either approving or rejecting), a snapshot of the request state is created. This snapshot preserves the state of the cancellation request at the time of response for dispute resolution and record-keeping.

Sellers can view all pending cancellation requests for their order items. Sellers can filter cancellation requests by status to manage their responses efficiently.

### Cancellation Approval Effects

When a cancellation request is approved, the specific order item is cancelled and a refund is processed for that item only. The refund amount corresponds to the price of the cancelled item.

When an item is cancelled, the stock quantity for that variant is restored through an inventory record. This ensures inventory accuracy after cancellation.

If all items in an order are cancelled, the entire order status becomes cancelled. This reflects the complete cancellation of the order through individual item cancellations.

The cancellation of one item does not block or delay the processing of other items in the same order. Sellers can continue shipping remaining items, and customers can still request cancellation or refund for other items according to their respective status and time windows.

## RefundRequest Operations

Refund is handled per order item rather than per entire order. Customers can request a refund for individual items that have delivered status. Refund requests can only be made within 7 days of the item being delivered. Refund requests must include a reason explaining why the customer wants a refund. The seller of that item can approve or reject the refund request. When a seller responds to a refund request, a snapshot of the request state is created. If approved, that specific item is refunded to the customer. Refunded items have their stock quantities restored through an inventory record. The remaining items in the order are unaffected by the refund. If all items in an order are refunded, the entire order status becomes refunded. The 7-day window ensures timely refund requests while protecting seller interests.

### Refund Request Creation

Customers can request a refund for individual order items that have delivered status. A refund request applies to one order item at a time, not to the entire order. Customers can only request a refund within 7 days of the item being delivered. After the 7-day window expires, refund requests cannot be submitted for that item. Each refund request must include a reason explaining why the customer wants a refund. The reason is provided as text content. The system validates that the order item has delivered status before accepting the refund request. The system validates that the refund request is submitted within 7 days of the delivery date. If the item is not in delivered status, the refund request is rejected. If the 7-day window has passed, the refund request is rejected.

### Seller Refund Response

The seller of the order item can approve or reject the refund request. When the seller responds to a refund request, a snapshot of the request state is created. The snapshot records when the change was made, what was changed, and the values before and after. Snapshots are immutable and cannot be deleted. Sellers can view snapshots of refund requests for their order items. Administrators can view snapshots of any refund request. The snapshot preserves the request state for dispute resolution purposes. When a seller approves a refund request, the item status changes to refunded. When a seller rejects a refund request, the item status remains unchanged and the customer is notified of the rejection.

### Refund Processing

When a refund request is approved, that specific order item is refunded to the customer. The refunded item has its stock quantity restored through an inventory record. The inventory record contains the quantity change, reason, and timestamp. The remaining items in the order are unaffected by the refund of one item. Other order items continue with their current status and processing. If all order items in an order are refunded, the entire order status becomes refunded. The refund process only affects the specific item that was approved for refund. Each refunded item creates a separate inventory record to restore its stock quantity.

## SellerApprovalRequest Operations

Seller accounts require administrator approval before sellers can list products and make sales on the platform. When a seller registers, a seller approval request is created automatically. Administrators can view the list of pending seller approval requests. Administrators can approve seller registrations allowing them to start selling. Administrators can reject seller registrations when they do not meet requirements. When rejecting a seller registration, administrators must provide a reason for the rejection. Rejected sellers can view the rejection reason to understand why they were not approved. Rejected sellers can submit a new registration request for reconsideration. Sellers can view their approval status showing pending, approved, or rejected states. The approval process ensures only qualified sellers can operate on the platform.

### Seller Registration and Approval Request Creation

When a seller registers on the platform, a seller approval request is automatically created.

Seller registration requires administrator approval before the seller can list products or make sales on the platform.

The seller approval request is created immediately upon seller registration submission.

The seller approval request enters a pending status upon creation.

Sellers cannot list products or process sales while their approval request is in pending status.

### Administrator Approval Request Management

Administrators can view the list of pending seller approval requests.

Administrators can approve seller registration requests, allowing sellers to start listing products and making sales.

Administrators can reject seller registration requests when sellers do not meet platform requirements.

When rejecting a seller registration request, administrators must provide a reason for the rejection.

The rejection reason is recorded and visible to the rejected seller.

Administrators review seller approval requests to verify that only qualified sellers can operate on the platform.

### Seller Approval Status Viewing

Sellers can view their approval status at any time.

The approval status shows one of three states: pending, approved, or rejected.

Sellers with rejected status can view the rejection reason provided by the administrator.

Rejected sellers can submit a new registration request for reconsideration after viewing the rejection reason.

When a rejected seller submits a new registration request, a new seller approval request is created.

The new approval request enters pending status and goes through the administrator review process again.

### Seller Verification Process

The seller approval process ensures only qualified sellers can operate on the platform.

Administrators review each seller approval request to verify seller qualifications.

The verification process evaluates whether sellers meet platform requirements before approval.

Sellers must pass the verification process before they can list products or accept orders.

The approval workflow protects customers by ensuring all sellers are vetted before selling on the platform.

## AdminPromotionRequest Operations

Any user including customers or sellers can submit a request to become an administrator. The admin promotion request includes a reason explaining why the user wants to become an administrator. Super administrators can view the list of pending admin promotion requests. Super administrators can approve requests making the user a regular administrator. Super administrators can reject requests that do not meet requirements. Super administrators can promote regular administrators to super administrator grade. Super administrators can demote other super administrators to regular administrator grade. Super administrators cannot demote themselves to prevent losing all super admin access. There are two administrator grades: regular administrator and super administrator. The promotion system allows controlled expansion of the administrator team while maintaining oversight.

### Admin Promotion Request Submission

Any user including customers or sellers can submit a request to become an administrator. The request must include a reason explaining why the user wants to become an administrator. The system records when the request was submitted. Once submitted, the request enters a pending state awaiting review by super administrators. The user can view their submitted request and its current status.

### Admin Promotion Request Review

Super administrators can view the list of pending admin promotion requests. Super administrators can approve a pending request, which makes the user a regular administrator. Super administrators can reject a request that does not meet requirements. When a request is approved or rejected, the system records the response time and the request is no longer pending. The requesting user is notified of the decision.

### Administrator Grade Management

There are two administrator grades: regular administrator and super administrator. Super administrators can promote regular administrators to super administrator grade. Super administrators can demote other super administrators to regular administrator grade. Super administrators cannot demote themselves to prevent losing all super administrator access. This grade system allows controlled administrator team expansion while maintaining oversight through multiple super administrators.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## Customer Error Scenarios

Customers cannot register with an email address that is already in use by another account. Login attempts fail when the email or password does not match any existing customer account. Customers cannot change their password without providing the correct current password. Account deletion is blocked if the customer has any pending orders with paid or shipped status. Account deletion is also blocked if there are any pending cancellation or refund requests associated with the customer's orders. When a customer deletes their account, their profile information is removed but their order history remains preserved for seller records and legal purposes. Reviews written by deleted customers are preserved but displayed as authored by a deleted user. Customers cannot access any platform features without completing registration first, as guest browsing is not supported. Password changes require the new password to meet platform security standards. Failed login attempts do not lock the account but customers must retry with correct credentials.

### Registration and Authentication Errors

Customers cannot register with an email address that is already associated with an existing customer or seller account. Registration attempts with an existing email address are rejected with an error message indicating the email is already in use. Customer registration requires all required fields to be provided; registration requests missing required information are rejected. Login attempts fail when the provided email address does not match any existing customer account. Login attempts fail when the provided password does not match the password associated with the email address. Failed login attempts do not lock the customer account; customers can retry login with correct credentials immediately. Customers cannot change their password without providing the correct current password for authentication. Password change requests with an incorrect current password are rejected. New passwords must meet platform security requirements; passwords that do not meet these requirements are rejected during password change or registration. Customers cannot access any platform features without completing registration and logging in first. Guest browsing is not supported; unauthenticated users attempting to access customer features are redirected to registration or login. Search, product viewing, and category browsing require customer authentication. Wishlist, cart, and checkout operations require an authenticated customer account.

### Account Deletion Restrictions

Customers cannot delete their account if they have any pending orders with paid status. Customers cannot delete their account if they have any pending orders with shipped status. Account deletion requests are rejected when the customer has order items awaiting shipment or delivery. Customers cannot delete their account if they have any pending cancellation requests that have not been responded to by the seller. Customers cannot delete their account if they have any pending refund requests that have not been responded to by the seller. Account deletion eligibility is checked before processing the deletion request; if any blocking conditions exist, the request is rejected with an explanation of what must be resolved first. Customers must wait for all pending orders to reach delivered, cancelled, or refunded status before deleting their account. Customers must wait for all pending cancellation and refund requests to be responded to before deleting their account. The system validates account deletion eligibility at the time of the deletion request; customers who become eligible after resolving pending items can resubmit the deletion request.

### Data Preservation on Account Deletion

When a customer deletes their account, their profile information including display name and phone number is permanently removed from the system. When a customer deletes their account, their shipping addresses are deleted along with their profile. When a customer deletes their account, their order history is preserved and remains accessible to the customer for viewing past orders. Order history preservation ensures sellers can access order records for their products and legal compliance requirements are met. When a customer deletes their account, reviews written by the customer are preserved in the system. Reviews from deleted customers are displayed with an indication that the author is a deleted user rather than showing the customer's display name. The review content, rating, and date remain visible even after the customer account is deleted. Product snapshots and order item snapshots created during the customer's account lifetime are preserved after account deletion. Wishlist entries are deleted when the customer account is deleted. Cart contents are deleted when the customer account is deleted. Inventory records, cancellation requests, and refund requests associated with the customer's orders are preserved after account deletion for seller and administrative records.

## Seller Error Scenarios

Seller accounts cannot sell products until they receive administrator approval. Sellers can view their approval status which may be pending, approved, or rejected. When rejected, sellers can view the rejection reason provided by the administrator. Rejected sellers can submit a new registration request after addressing the rejection reason. Seller account deletion is blocked if they have any pending orders with paid or shipped status. Seller account deletion is also blocked if there are any pending cancellation or refund requests for their products. When a seller deletes their account, their products are removed from listings but order history and snapshots remain preserved. The shop name in past orders is preserved even after seller account deletion. Sellers cannot create or edit products if their account has been suspended by an administrator. Suspended sellers can still process existing orders including shipping items and responding to cancellation or refund requests.

### Seller Approval Status and Rejection

Sellers can view their approval status at any time. The approval status may be pending, approved, or rejected. When the status is pending, the seller cannot sell products or create product listings. When the status is rejected, the seller can view the rejection reason provided by the administrator. Rejected sellers can submit a new registration request after addressing the rejection reason. The new registration request goes through the approval process again. Sellers with approved status can create and manage products. Sellers cannot change their approval status themselves; only administrators can approve or reject seller registrations.

### Seller Account Deletion Constraints

Seller account deletion is blocked if the seller has any pending orders with paid or shipped status. Seller account deletion is also blocked if there are any pending cancellation requests for order items from the seller's products. Seller account deletion is further blocked if there are any pending refund requests for order items from the seller's products. The system checks for these conditions before allowing account deletion. If any of these conditions exist, the deletion request is rejected and the seller is informed of the blocking condition. The seller must wait until all pending orders are completed (delivered, cancelled, or refunded) and all pending cancellation and refund requests are resolved before deleting their account.

### Seller Account Deletion Consequences

When a seller deletes their account, all products owned by the seller are removed from listings and no longer appear in search results or category pages. When a seller deletes their account, order history records are preserved for legal and dispute resolution purposes. When a seller deletes their account, snapshots of products and order items remain preserved. When a seller deletes their account, the shop name in past orders is preserved and remains visible to customers who purchased from that seller. Customers can still view their order history including orders from deleted sellers. The preserved shop name appears as it was at the time of purchase, sourced from the order item snapshot.

### Suspended Seller Restrictions

When a seller account is suspended by an administrator, the seller cannot create new products. When a seller account is suspended, the seller cannot edit existing products. When a seller account is suspended, all products from that seller are hidden from search results and category listings. When a seller account is suspended, products from that seller cannot be purchased by customers. However, suspended sellers can still process existing orders. Suspended sellers can ship items for orders that have been paid. Suspended sellers can respond to cancellation requests for their order items. Suspended sellers can respond to refund requests for their order items. When a seller account is unsuspended by an administrator, products become visible again and the seller can create and edit products.

## Address Error Scenarios

Customers cannot add an address without providing all required fields including recipient name, phone number, street address, city, state or province, postal code, and country. Address edits require all fields to be valid and complete. Customers can set only one address as their default shipping address at any time. Setting a new default address automatically removes the default status from the previously selected address. Address deletion is blocked if the address is currently set as the default address. Customers must select a different default address before deleting the current default. Addresses used in past orders remain preserved even if the customer deletes them from their address book. Checkout requires a valid shipping address selection before order placement. Once an order is placed, the shipping address associated with that order cannot be changed. Customers can have multiple addresses but must manage which one is set as default for checkout convenience.

### Address Field Validation

When adding a new shipping address, the system requires all fields to be provided: recipient name, phone number, street address, city, state or province, postal code, and country. If any required field is missing or empty, the address creation is rejected.

When editing an existing address, all fields must remain valid and complete. If any field becomes empty or invalid during editing, the save operation is rejected and the address retains its previous values.

The system validates that phone numbers are in a valid format for the specified country. Invalid phone number formats are rejected during both address creation and editing.

### Default Address Management

Each customer can have multiple shipping addresses in their address book, but only one address can be designated as the default at any time.

When a customer sets a new address as the default, the system automatically removes the default status from the previously selected default address. This transfer happens automatically and requires no additional confirmation from the customer.

The default address is used as the pre-selected shipping address during checkout for customer convenience. Customers can still choose a different address from their address book during checkout if they prefer.

If a customer has only one address in their address book, that address is automatically set as the default.

### Address Deletion Constraints

Customers cannot delete an address that is currently set as their default shipping address. The system blocks the deletion and requires the customer to select a different address as the default before proceeding with deletion.

If a customer attempts to delete their only address, the system blocks the deletion because it is the default address. The customer must add a new address and set it as default before deleting the existing one.

Addresses that have been used in past orders are preserved in the order records even if the customer deletes them from their address book. This ensures order history remains complete and accurate for both customer and seller records.

When viewing past orders, customers see the shipping address that was used at the time of order placement, regardless of whether that address still exists in their current address book.

### Checkout and Order Address Rules

During checkout, customers must select a valid shipping address from their address book before they can place an order. If no address is selected, the checkout process cannot proceed.

If a customer's default address has been deleted or is no longer valid, the system requires the customer to explicitly select a different address from their address book before proceeding with checkout.

Once an order is placed, the shipping address associated with that order is locked and cannot be changed. This ensures the seller ships to the address the customer intended at the time of purchase.

If a customer needs to ship to a different address after placing an order, they must cancel the order (if eligible) and place a new order with the correct address, or contact customer support for assistance.

The shipping address captured at order placement is preserved as part of the order record and remains visible in the customer's order history indefinitely.

## Category Error Scenarios

Only administrators can create categories and subcategories. Regular customers and sellers cannot create or modify categories. Categories support only one level of nesting, meaning subcategories cannot have their own subcategories. Attempting to create a subcategory under another subcategory is not allowed. Category deletion causes products in that category to become uncategorized. Deleting a parent category affects all its subcategories and their associated products. Category edits require both name and description fields to be provided. Administrators cannot delete categories that would orphan products without proper handling. Products assigned to deleted categories remain in the system but lose their category classification. Category browsing by customers shows all available categories including subcategories in a hierarchical view.

### Category Creation Restrictions

Only administrators can create categories and subcategories. Customers cannot create categories. Sellers cannot create or modify categories. When creating a category, both name and description are required. If the name is missing, the request is rejected. If the description is missing, the request is rejected. Non-administrator users attempting to create categories receive an access denied response.

### Category Structure Validation

Categories support only one level of nesting. A subcategory cannot have its own subcategories. When attempting to create a subcategory under another subcategory, the request is rejected. The system validates the parent category type before allowing subcategory creation. Top-level categories can have subcategories. Subcategories cannot be parents of other categories.

### Category Deletion Impact

When a category is deleted, products assigned to that category become uncategorized. When a parent category is deleted, all its subcategories are also deleted. Products in deleted subcategories become uncategorized. The system preserves products when their category is removed. Uncategorized products remain in the system but lose their category classification. Products without a category are not shown in category browsing but remain accessible through search.

### Category Edit Requirements

When editing a category, both name and description fields must be provided. Partial updates are not supported. If either field is missing during edit, the request is rejected. The system validates that both fields contain values before applying the edit. Category edits create a record of the change for administrative tracking.

### Hierarchical Category Browsing

Customers can browse categories in a hierarchical view showing parent categories and their subcategories. The browsing interface displays the two-level category structure. Subcategories are shown under their parent category. Customers can navigate to a parent category to view all products in that category and its subcategories. Customers can navigate directly to a subcategory to view products in that subcategory only.

## Product Error Scenarios

Sellers cannot create products without providing a name, description, category selection, and base price. Products must be assigned to a valid category or subcategory. Sellers can only edit their own products, not products created by other sellers. Product deletion is blocked if any variant has pending order items with paid or shipped status. Product deletion is also blocked if there are any pending cancellation or refund requests for any variant of the product. Deleting a product removes all its variants and inventory records from the system. Deleted products no longer appear in search results or category listings. Product snapshots are preserved even after the product itself is deleted. Sellers can view snapshots of their own products but not other sellers' products. Administrators can view snapshots of any product on the platform. Suspended sellers cannot create new products or edit existing products. Products created before suspension remain visible unless the seller account is suspended.

### Product Creation Validation Errors

Sellers cannot create a product without providing all required information. The product name is required and cannot be empty. The product description is required and cannot be empty. The base price is required and must be provided. The category selection is required and the product must be assigned to a valid category or subcategory. If any required field is missing during product creation, the request is rejected. If the selected category does not exist or is invalid, the request is rejected.

### Product Ownership and Access Errors

Sellers can only edit products they own, not products created by other sellers. If a seller attempts to edit another seller's product, the request is rejected. Sellers can view snapshots of their own products only. If a seller attempts to view snapshots of another seller's product, the request is rejected. Administrators can view snapshots of any product on the platform. Suspended sellers cannot create new products. If a suspended seller attempts to create a product, the request is rejected. Suspended sellers cannot edit their existing products. If a suspended seller attempts to edit a product, the request is rejected.

### Product Deletion Blocking Conditions

Sellers cannot delete a product if any variant of that product has pending order items with paid status. Sellers cannot delete a product if any variant of that product has pending order items with shipped status. Sellers cannot delete a product if there are any pending cancellation requests for any variant of the product. Sellers cannot delete a product if there are any pending refund requests for any variant of the product. If any of these conditions exist, the product deletion request is rejected and the product remains in the system.

### Product Deletion Consequences

When a product is deleted, all variants belonging to that product are automatically deleted. When a product is deleted, all inventory records for all variants of that product are deleted. Deleted products no longer appear in search results. Deleted products no longer appear in category listings. Product snapshots are preserved even after the product itself is deleted. The preserved snapshots remain accessible to the seller and administrators for dispute resolution purposes.

## ProductVariant Error Scenarios

Each variant must have a unique SKU code that identifies it across the platform. Sellers cannot create variants with duplicate SKU codes. Variants can be added to products after the initial product creation. Variant edits include changes to SKU code, option values, and price. Every variant edit creates a snapshot preserving the previous state. Variant deletion is blocked if there are pending order items with paid or shipped status for that variant. Variant deletion is also blocked if there are pending cancellation or refund requests for that variant. A product must have at least one variant to be purchasable by customers. Products with no variants are visible in search but shown as unavailable to customers. When stock reaches zero, the variant is displayed as out of stock. Out of stock variants cannot be added to customer shopping carts. Variant price can override the product base price when specified.

### Unique SKU Code Validation

Each variant must have a unique SKU code that identifies it across the platform. When a seller attempts to create a variant with a SKU code that already exists, the request is rejected. The system prevents duplicate SKU codes from being created for any variant on the platform. Sellers are notified that the SKU code is already in use and must choose a different code. This validation applies to both new variant creation and when editing an existing variant's SKU code. If a seller attempts to change a variant's SKU code to one that is already in use by another variant, the edit is rejected.

### Variant Addition and Edit Operations

Variants can be added to products after the initial product creation. When a variant is added, all required fields including SKU code, option values, and stock quantity must be provided. If any required field is missing, the variant creation is rejected. Variant edits include changes to SKU code, option values, and price. Every variant edit creates a snapshot preserving the previous state before the change is applied. If the snapshot creation fails, the edit is not applied and the variant remains unchanged. Sellers can modify option values to reflect different combinations such as color and size. When option values are edited, the snapshot captures the previous option values along with all other variant fields.

### Variant Deletion Restrictions

Variant deletion is blocked if there are pending order items with paid or shipped status for that variant. When a seller attempts to delete a variant with pending orders, the request is rejected and the seller is notified that the variant cannot be deleted due to active orders. Variant deletion is also blocked if there are pending cancellation or refund requests for that variant. The seller must wait until all pending requests are resolved before the variant can be deleted. These restrictions ensure that order history and customer requests remain valid and traceable to existing variants.

### Minimum Variant Requirement

A product must have at least one variant to be purchasable by customers. When a seller attempts to delete the last remaining variant of a product, the deletion is blocked. The seller is notified that at least one variant must remain for the product to be available for purchase. Products with no variants are visible in search but shown as unavailable to customers. If all variants are deleted except one, and that last variant is then deleted, the product becomes unavailable. The product listing displays an unavailable status indicator when no variants exist.

### Stock Status and Cart Operations

When stock reaches zero, the variant is displayed as out of stock on the product detail page and in search results. Out of stock variants cannot be added to customer shopping carts. When a customer attempts to add an out of stock variant to their cart, the request is rejected and the customer is notified that the item is unavailable. If a variant's stock becomes zero while it is already in a customer's cart, the item is marked as unavailable in the cart. Customers cannot proceed to checkout with unavailable items in their cart. The out of stock status is calculated based on the current stock quantity from inventory records.

### Variant Price Configuration

Variant price can override the product base price when specified. If a variant price is not specified, the product base price is used for that variant. When editing a variant's price, the new price must be a valid positive number. If an invalid price is provided, the edit is rejected. The price override applies only to the specific variant and does not affect other variants of the same product. When a variant price is edited, the snapshot captures the previous price along with all other variant fields. Price changes are reflected immediately in product listings and search results.

## ProductImage Error Scenarios

Sellers can upload multiple images for each product to showcase different angles or details. Images can be reordered by the seller to control which image appears first. The first image in the order serves as the main or thumbnail image displayed in search results. Sellers can delete images from their products but must maintain at least one image. Deleting the main image automatically promotes the next image in order to become the new main image. Image changes are included in product snapshots to preserve the complete product state. Image reordering creates a new product snapshot with the updated image sequence. Sellers cannot reorder images for products they do not own. Product detail pages display all images associated with the product. Image upload failures do not prevent product creation if other required fields are complete. Removed images are no longer accessible to customers viewing the product.

### Product Image Upload and Management

Sellers can upload multiple images for each product to showcase different angles or details. There is no maximum limit on the number of images per product. However, each product must have at least one image at all times. If a seller attempts to delete the last remaining image, the request is rejected. Image upload failures do not prevent product creation if other required fields are complete. Failed image uploads can be retried without affecting the product's other data. Partially uploaded images are not stored and do not appear on the product.

### Image Ordering and Main Image Display

Sellers can reorder images for their products to control which image appears first. The first image in the order serves as the main or thumbnail image. This main image is displayed in search results and product listings. When the main image is deleted, the next image in the order automatically becomes the new main image. If only one image exists and it is deleted, the deletion is blocked per the minimum one image requirement. Search result pages display the main image for each product. Product listing pages show the main image alongside the product name and price.

### Image Change Snapshots

All image changes are included in product snapshots to preserve the complete product state. When images are uploaded, deleted, or reordered, a new product snapshot is created. The snapshot captures the complete image sequence at that moment, including the URLs and sort order of all images. Image reorder operations create a snapshot with the updated image sequence. These snapshots are immutable and cannot be modified after creation. Sellers can view snapshots of their own products to see historical image states. Administrators can view snapshots of any product for oversight purposes.

### Image Access and Ownership Restrictions

Sellers can only manage images for products they own. Sellers cannot upload, delete, or reorder images for products owned by other sellers. Product detail pages display all images associated with the product in the current order. When an image is removed from a product, it is no longer accessible to customers viewing the product. Removed images cannot be accessed via direct URL or any other means. Deleted product images are not preserved in snapshots; only the image URLs and order at the time of snapshot are preserved. Customers viewing a product see only the current set of images, not historical images from snapshots.

## Wishlist Error Scenarios

Customers can add products to their wishlist for future reference. The wishlist displays products rather than specific variants. Wishlist viewing is paginated to handle large numbers of saved items. Customers can remove products from their wishlist at any time. If a product is deleted by the seller, it is automatically removed from all customer wishlists. Customers cannot add the same product to their wishlist multiple times. Attempting to add an already wishlisted product does not create a duplicate entry. Wishlist shows product availability status to inform customers if items are still purchasable. Deleted products disappear from wishlists without requiring customer action. Customers can view their full wishlist to manage saved products. Wishlist items link to product detail pages when products are still available.

### Wishlist Addition and Duplicate Prevention

Customers can add products to their wishlist for future reference. When a customer attempts to add a product to their wishlist, the system checks if the product is already in their wishlist. If the product already exists in the customer's wishlist, the request is rejected and no duplicate entry is created. The system performs a duplicate check before adding any product to prevent multiple entries for the same product.

If the product does not exist or has been deleted by the seller, the request to add it to the wishlist is rejected. Customers cannot add products that are no longer available on the platform. When a customer attempts to add a product that they do not have permission to view, the request is rejected.

The wishlist addition operation requires the customer to be authenticated. If the customer is not logged in, the request to add a product to the wishlist is rejected. Each successful wishlist addition creates a single wishlist entry linking the customer to the product.

### Product Removal and Automatic Cleanup

Customers can remove products from their wishlist at any time. When a customer removes a product from their wishlist, the wishlist entry is deleted. If the customer attempts to remove a product that is not in their wishlist, the request is rejected.

When a seller deletes a product, all wishlist entries for that product are automatically removed from all customer wishlists. This automatic cleanup occurs without requiring any action from customers. The deleted product disappears from all wishlists immediately upon product deletion.

If a customer attempts to remove a product that has already been deleted by the seller, the request is rejected since the wishlist entry no longer exists. The automatic wishlist cleanup on product deletion ensures that customers do not see entries for products that are no longer available on the platform.

When a seller's account is suspended, their products remain in customer wishlists but are marked as unavailable. The wishlist entries are not automatically removed on seller suspension, only on product deletion.

### Wishlist Availability Status and Edge Cases

The wishlist displays product availability status to inform customers if items are still purchasable. When a product in the wishlist is deleted by the seller, the wishlist entry is automatically removed and no longer displays to the customer. When a variant in the wishlist product is out of stock, the wishlist shows the product with an out of stock indicator.

If all variants of a wishlisted product are out of stock, the product is shown as unavailable in the wishlist. The wishlist availability status display helps customers understand which saved products can still be purchased. When a product's availability changes (from available to unavailable or vice versa), the wishlist reflects this change on the next view.

Wishlist items link to product detail pages when products are still available. If a customer clicks on a wishlist item that has been deleted, the link is no longer functional since the entry was automatically removed. The wishlist to product detail linking only works for products that currently exist on the platform.

When viewing the full wishlist, customers see all their saved products with current availability status. If a product was wishlisted but the seller has since been suspended, the product shows as unavailable but remains in the wishlist until the product itself is deleted.

## Cart Error Scenarios

Customers can view their shopping cart to review items before checkout. The cart displays each item with product name, variant options, price, quantity, and subtotal. The cart shows the total price of all items combined. If a variant's stock is less than the cart quantity, a warning is shown to the customer. If a variant is deleted by the seller, it is marked as unavailable in the cart. If a variant goes out of stock, it is marked as unavailable in the cart. Unavailable items cannot be proceeded to checkout. Customers must remove or adjust unavailable items before completing checkout. Cart warnings inform customers of stock issues before they attempt to checkout. The cart automatically reflects changes to variant availability and pricing. Customers can continue shopping while unavailable items remain in their cart for reference.

### Cart Display and Pricing

The cart displays each item with the product name, variant options, price per unit, quantity, and item subtotal. The cart shows the total price calculated by summing all item subtotals. When a variant's price changes, the cart automatically updates the affected item's price and recalculates the subtotal and total. When a variant is deleted or becomes unavailable, the cart automatically marks the item as unavailable. The cart reflects real-time changes to variant availability and pricing without requiring manual refresh. Item subtotals are calculated by multiplying the unit price by the quantity. The total price includes all item subtotals combined. Cart pricing updates occur immediately when underlying product or variant data changes.

### Stock Quantity Warnings

When a variant's stock quantity is less than the quantity in the cart, a warning is displayed to the customer. The stock warning is shown before the customer attempts to checkout. The warning indicates that the requested quantity exceeds available stock. Customers can view the warning while continuing to shop. The warning is displayed for each cart item where stock is insufficient. Stock warnings inform customers of potential checkout issues before they proceed. The system checks stock availability against cart quantities in real-time. Customers are alerted to stock issues before payment processing begins.

### Unavailable Item Handling

If a variant is deleted by the seller, the corresponding cart item is marked as unavailable. If a variant's stock reaches zero, the cart item is marked as unavailable. Unavailable items cannot be proceeded to checkout. Customers must remove unavailable items from the cart before completing checkout. Alternatively, customers can adjust the quantity of unavailable items to zero, which removes them from the cart. Unavailable items remain in the cart for customer reference until explicitly removed. Customers can continue shopping while unavailable items remain in their cart. The cart retains unavailable items to inform customers of products they were interested in. Checkout is blocked until all unavailable items are removed or their quantities are set to zero. The system prevents order creation when any cart item is marked as unavailable.

## CartItem Error Scenarios

Customers must select a specific variant when adding items to their cart, not just a product. When adding to cart, customers must specify the quantity they wish to purchase. If the same variant is already in the cart, the quantities are combined rather than creating a separate line item. Customers can change the quantity of items already in their cart. Quantity changes are validated against current stock availability. Customers can remove individual items from their cart without affecting other items. Removing an item does not affect the product's presence in the customer's wishlist. Cart items are automatically removed when customers complete checkout. Failed payment does not remove items from the cart, allowing customers to retry. Cart items reflect real-time stock and pricing information.

### Variant Selection and Quantity Requirements

Customers must select a specific product variant when adding items to their cart. Adding a product without selecting a variant is not permitted. When adding an item to the cart, customers must specify the quantity they wish to purchase. Attempting to add an item without specifying a quantity is rejected. If a customer attempts to add a variant that does not exist or has been deleted, the request is rejected. If a customer attempts to add a variant that is out of stock, the variant is marked as unavailable and cannot be added to the cart.

### Cart Item Quantity Management

When a customer adds a variant that already exists in their cart, the quantities are combined into a single cart item line rather than creating a duplicate entry. Customers can modify the quantity of any item in their cart. When a customer increases an item's quantity beyond the available stock, a warning is displayed indicating insufficient stock. If a customer attempts to set a quantity of zero or less, the request is rejected. If the variant's stock changes while the item is in the cart, the cart reflects the current stock availability. If a variant's price changes while the item is in the cart, the cart displays the updated price.

### Cart Item Removal Scenarios

Customers can remove individual items from their cart without affecting other cart items. Removing an item from the cart does not remove the corresponding product from the customer's wishlist. When a customer proceeds to checkout, all cart items are removed from the cart upon successful order creation. If payment fails during checkout, the cart items are retained, allowing the customer to retry the payment. If a product is deleted by the seller while in a customer's cart, the cart item is marked as unavailable. If a variant becomes out of stock while in a customer's cart, the cart item is marked as unavailable.

### Cart Item Availability and Merging

Cart items are automatically merged when the same variant is added multiple times. The merged cart item displays the combined quantity. Unavailable items (deleted variants or out of stock variants) cannot be included in checkout. The cart displays warnings for items where the requested quantity exceeds available stock. Real-time stock updates are reflected in the cart, showing current availability status. Real-time price updates are reflected in the cart, showing the current variant price. Cart items maintain their association with the specific variant at the time of addition, but display current pricing and stock information.

## Order Error Scenarios

Customers can proceed to checkout only from their cart with available items. Payment processing can succeed or fail based on external payment gateway response. If payment fails, the order is not created and customers can retry the checkout process. If payment succeeds, the order is created with a unique order number. Once an order is placed, the shipping address cannot be changed by the customer. Stock quantities are decreased for each purchased variant when the order is created. Items are removed from the customer's cart after successful order creation. Order records include the order number, date, customer information, and total price. Payment failures do not reserve stock, allowing other customers to purchase the items. Customers can view their order history sorted by newest first with pagination. Order status is derived from the status of individual order items within the order.

### Checkout Validation

Customers can proceed to checkout only when all items in their cart are available. Items marked as unavailable cannot be included in checkout. Unavailable items include variants that have been deleted by the seller or variants that are out of stock. The system validates item availability before allowing checkout to proceed. If any item in the cart becomes unavailable, the customer must remove it or update the quantity before proceeding to checkout.

### Payment Processing

Payment is processed through an external payment gateway after the customer confirms the order. Payment can succeed or fail based on the payment gateway response. If payment fails, no order is created and the customer can retry the checkout process. Payment failures do not reserve stock, allowing other customers to purchase the items. If payment succeeds, the order is created with all associated records. Customers can attempt payment multiple times after failures without restriction.

### Order Creation

When payment succeeds, an order is created with a unique order number. The order number is generated automatically and cannot be changed. Stock quantities are decreased for each purchased variant at the time of order creation. All items are removed from the customer's cart after successful order creation. The shipping address selected at checkout is locked and cannot be changed by the customer after the order is placed. The order record includes the order number, order date, customer information, shipping address, and total price.

### Order History Display

Customers can view a list of all their orders in their order history. The order history list is paginated to handle large numbers of orders. Orders in the history list are sorted by newest first, with the most recent orders appearing at the top. Each order in the list displays the order number, order date, total price, and overall order status. Customers can select any order from the list to view full details including items, shipping address, and shipment information.

### Order Status Calculation

The overall order status is derived from the status of individual order items within the order. If all items in an order have status paid, the order status is paid. If any item has status shipped and no items are delivered, the order status is shipped. If all items have status delivered, the order status is delivered. If all items have status cancelled, the order status is cancelled. If all items have status refunded, the order status is refunded. If items have mixed states such as some delivered and some refunded, the order status is partially completed.

## OrderItem Error Scenarios

Each order item represents a purchased product variant with a specific quantity. Each order item has its own status independent of other items in the same order. Order item statuses include paid, shipped, delivered, cancelled, and refunded. If a customer buys multiple units of the same variant, it becomes one order item with quantity. Order items can be from different sellers within the same order. Each order item can be individually cancelled or refunded without affecting other items. A snapshot of the product and variant is saved with each order item at time of purchase. A snapshot of the seller's profile is saved with each order item preserving shop name and logo. Mixed status items in an order result in a partially completed order status. Order item status transitions follow specific business rules based on the current status.

### Order Item Structure and Representation

Each order item represents a specific product variant purchased with a defined quantity. When a customer purchases multiple units of the same variant, the system creates a single order item with the combined quantity rather than multiple separate items. Each order item displays the product name, variant option values (such as color and size), quantity, and price at time of purchase.

Order items within the same order can belong to different sellers. When a customer purchases products from multiple sellers in a single order, the system creates separate order items for each seller's products. Each order item is linked to the seller who owns the product.

The system preserves the product state at time of purchase by creating a snapshot of the product details including name, description, and category. The system also creates a snapshot of the variant details including SKU code, option values, and price. Additionally, the system creates a snapshot of the seller's profile including shop name and logo. These snapshots ensure that the order item displays accurate historical information even if the original product, variant, or seller profile is later modified or deleted.

### Order Item Status Management

Each order item maintains its own status independent of other items in the same order. The system supports five order item statuses: paid, shipped, delivered, cancelled, and refunded. When payment is completed, the order item status is set to paid. When the seller ships the item, the status changes to shipped. When the customer confirms delivery or the automatic delivery period expires, the status changes to delivered.

The overall order status is derived from the statuses of all order items within that order. When all items have the same status, the order status matches that item status. When items have mixed statuses (for example, some items are delivered while others are refunded), the order status is set to partially completed.

Order item status transitions follow specific business rules. An item with paid status can transition to shipped (when seller ships), cancelled (when cancellation is approved), or remain in paid status waiting for shipment. An item with shipped status can transition to delivered (when customer confirms or automatic period expires). An item with delivered status can transition to refunded (when refund is approved). Once an item reaches cancelled or refunded status, no further status transitions are permitted.

### Individual Item Cancellation

Customers can request cancellation for individual order items without affecting other items in the same order. Cancellation requests are only permitted for order items with paid status. Items with shipped, delivered, cancelled, or refunded status cannot be cancelled.

When a customer requests cancellation, the system requires a reason text to be provided. The seller responsible for that order item can approve or reject the cancellation request. When the seller responds to the request, the system creates a snapshot of the cancellation request state including the reason and status change.

If the cancellation is approved, the order item status changes to cancelled and the stock quantity for that variant is restored through an inventory record. The refund is processed for that specific item only. Other items in the same order continue their normal processing without interruption. If all items in an order are cancelled, the overall order status becomes cancelled.

### Individual Item Refund

Customers can request a refund for individual order items without affecting other items in the same order. Refund requests are only permitted for order items with delivered status. Items with paid, shipped, cancelled, or refunded status cannot have refund requests submitted.

Refund requests must be submitted within 7 days of the item being delivered. The system requires a reason text to be provided with the refund request. The seller responsible for that order item can approve or reject the refund request. When the seller responds to the request, the system creates a snapshot of the refund request state including the reason and status change.

If the refund is approved, the order item status changes to refunded and the stock quantity for that variant is restored through an inventory record. The refund is processed for that specific item only. Other items in the same order remain unaffected. If all items in an order are refunded, the overall order status becomes refunded.

### Order Item Snapshot Preservation

The system creates comprehensive snapshots for each order item at the time of purchase to preserve the exact state of all related data. Three types of snapshots are created for every order item: product snapshot, variant snapshot, and seller profile snapshot.

The product snapshot captures all product fields including name, description, category, base price, and images at the moment of purchase. The variant snapshot captures the specific variant details including SKU code, option values (such as color and size), and the actual price paid (which may differ from the current base price if the variant had a price override).

The seller profile snapshot captures the shop name and logo image at the time of purchase. This ensures that even if the seller later changes their shop name, logo, or deletes their account, the order item continues to display the correct historical seller information.

All snapshots are immutable and cannot be modified or deleted. Order items retain their snapshots even if the original product is deleted by the seller or the seller account is deleted. Customers and sellers can view these snapshots through the order details page for dispute resolution and record-keeping purposes. Administrators can view snapshots of any order item on the platform.

## Shipment Error Scenarios

A shipment can contain one or more order items but only from the same seller. Different sellers always ship separately resulting in different shipments. A seller can choose to ship items individually or bundle multiple items into one shipment. Sellers must enter tracking information including carrier name and tracking number when creating a shipment. All items in the same shipment share the same tracking information. When a shipment is created, all items in it change to shipped status. Customers can view tracking information for each shipment in their order. Customers confirm delivery per shipment rather than per individual item. When the customer confirms delivery, all items in that shipment change to delivered status. If the customer does not confirm, items automatically change to delivered status after 14 days from shipping. Shipments cannot include items from multiple sellers in the same package.

### Shipment Creation Constraints

A shipment can contain one or more order items but only from the same seller. If a seller attempts to add order items from different sellers to the same shipment, the request is rejected. Different sellers always ship separately resulting in different shipments. A seller cannot combine items from another seller's products into their shipment. When an order contains items from multiple sellers, each seller's items must be placed in separate shipments. A seller can choose to ship items individually or bundle multiple items into one shipment. Each order item can only belong to one shipment. If an order item is already assigned to a shipment, it cannot be added to another shipment. Sellers must select order items that have paid status before creating a shipment. If any selected item has a status other than paid, the shipment creation is rejected.

### Shipment Tracking Requirements

Sellers must enter tracking information when creating a shipment. The tracking information includes carrier name and tracking number. If tracking information is missing or incomplete, the shipment creation is rejected. All items in the same shipment share the same tracking information. When a seller updates tracking information for a shipment, all items in that shipment reflect the updated tracking details. Tracking information cannot be removed once set, but can be corrected by the seller. Customers can view tracking information for each shipment in their order. If a shipment has no tracking information, the tracking section is shown as not yet available to the customer.

### Shipment Delivery and Status

When a shipment is created, all order items in it change to shipped status. If any item in the shipment cannot be updated to shipped status due to conflicting state, the shipment creation is rejected. Customers confirm delivery per shipment rather than per individual item. When the customer confirms delivery, all items in that shipment change to delivered status. If a customer attempts to confirm delivery for a shipment that is not yet in shipped status, the request is rejected. If the customer does not confirm, items automatically change to delivered status after 14 days from shipping. The automatic delivery calculation is based on the shipment creation date. Each shipment maintains its own delivery confirmation status independent of other shipments in the same order.

## Review Error Scenarios

Customers can write a review only for products they have purchased. A review can only be written after the order item status is delivered. Customers can write one review per product per order. Each review requires a rating from 1 to 5 stars. Review text content is optional and can be left blank. Reviews are displayed on the product detail page sorted by newest first. Customers can edit their own reviews after submission. Every review edit creates a snapshot preserving the previous rating and text. Customers can delete their own reviews but the snapshots remain preserved. Product average rating is calculated from all non-deleted reviews. Deleted reviews do not contribute to the product's average rating. Review deletion does not affect the customer's ability to write a new review for a different order of the same product.

### Purchase Verification for Review

Customers can only write reviews for products they have purchased. The system verifies that the customer has an order containing the product before allowing a review submission. If the customer attempts to write a review for a product they have not purchased, the request is rejected. This verification applies to each order-product combination separately.

### Delivered Status Review Requirement

Customers can only write a review after the order item status is delivered. If the customer attempts to write a review for an order item that has not reached delivered status, the request is rejected. Orders with status paid, shipped, cancelled, or refunded cannot be reviewed. Only items with confirmed delivery status are eligible for review submission.

### One Review Per Product Per Order

Customers can write only one review per product per order. If a customer attempts to submit a second review for the same product within the same order, the request is rejected. Customers can write separate reviews for the same product if purchased in different orders. Each order-product combination allows exactly one review.

### Rating Validation

Each review requires a rating from one to five stars. If the rating is outside this range (less than one or greater than five), the request is rejected. Ratings must be whole numbers within the valid range. Fractional or decimal ratings are not accepted. If no rating is provided, the request is rejected.

### Review Text Content

Review text content is optional and can be left blank. Customers can submit reviews with only a rating and no text. Empty text content is valid and does not cause rejection. Customers can add or modify text content when editing existing reviews.

### Review Sorting Display

Reviews are displayed on the product detail page sorted by newest first. The most recently submitted or edited reviews appear at the top of the list. This sorting applies to all non-deleted reviews. The sorting order cannot be changed by users.

### Customer Review Editing

Customers can edit their own reviews after submission. Customers cannot edit reviews written by other customers. If a customer attempts to edit a review they did not write, the request is rejected. Both rating and text content can be modified during editing. Each edit creates a snapshot preserving the previous state.

### Review Edit Snapshot Creation

Every review edit creates a snapshot that preserves the previous rating and text content. Snapshots record when the change was made and the values before and after the edit. Snapshots are immutable and cannot be deleted or modified. The snapshot includes the timestamp of the edit and the complete previous review state.

### Customer Review Deletion

Customers can delete their own reviews. Customers cannot delete reviews written by other customers. If a customer attempts to delete a review they did not write, the request is rejected. Deleted reviews are removed from the product detail page display. The customer's ability to write a new review for a different order of the same product is not affected by deletion.

### Review Snapshot Preservation

When a review is deleted, the snapshots created from previous edits remain preserved. Snapshots are not deleted when the review is deleted. Snapshots can be viewed by the review owner and administrators for dispute resolution. Preserved snapshots maintain the complete edit history even after review deletion.

### Non-Deleted Review Rating Calculation

Product average rating is calculated from all non-deleted reviews. Only reviews that have not been deleted contribute to the average rating calculation. The calculation includes all ratings from valid, non-deleted reviews for the product. Deleted reviews are excluded from the average rating computation.

### Deleted Review Rating Exclusion

Deleted reviews do not contribute to the product's average rating. When a review is deleted, its rating is immediately excluded from the average calculation. The product's displayed average rating is recalculated to reflect only non-deleted reviews. This ensures the average rating represents only active, visible reviews.

## InventoryRecord Error Scenarios

Each variant has its own stock quantity managed through inventory history records. Each inventory record contains a quantity change, reason, and timestamp. Positive quantity changes represent restocking or returns. Negative quantity changes represent orders or adjustments. Current stock is calculated by summing all inventory records for a variant. Sellers can add inventory with a quantity and reason for restocking. Sellers can subtract inventory with a quantity and reason for adjustments or losses. Order placement automatically creates a negative inventory record. Order cancellation or refund automatically creates a positive inventory record. Sellers can view the full inventory history of each variant. When stock reaches zero, the variant is shown as out of stock. Inventory records are immutable and cannot be deleted once created.

### Inventory Addition Error Scenarios

Sellers can add inventory to increase stock quantity for a variant. The quantity change must be a positive number. If the quantity is zero or negative, the request is rejected. A reason for the inventory addition is required. If the reason is not provided, the request is rejected. The reason must be text describing why inventory is being added, such as restocking or returned items. When inventory is added successfully, an inventory record is created with the quantity change, reason, and timestamp. The timestamp records when the inventory change was made. If the variant does not exist or does not belong to the seller, the request is rejected.

### Inventory Subtraction Error Scenarios

Sellers can subtract inventory to decrease stock quantity for adjustments or losses. The quantity change must be a positive number representing the amount to subtract. If the quantity is zero or negative, the request is rejected. A reason for the inventory subtraction is required. If the reason is not provided, the request is rejected. The reason must be text describing why inventory is being subtracted, such as damage, loss, or correction. If the subtraction would result in negative stock, the request is rejected. The system validates that sufficient stock exists before allowing subtraction. When inventory is subtracted successfully, an inventory record is created with the negative quantity change, reason, and timestamp. If the variant does not exist or does not belong to the seller, the request is rejected.

### Automatic Inventory Change Scenarios

When an order is placed successfully, the system automatically creates inventory records with negative quantity changes for each purchased variant. This inventory decrease happens as part of order creation and cannot be prevented by the seller. If order placement fails or payment fails, no inventory records are created. When an order item is cancelled, the system automatically creates an inventory record with a positive quantity change to restore the stock. When an order item is refunded, the system automatically creates an inventory record with a positive quantity change to restore the stock. These automatic inventory changes include a system-generated reason indicating the source operation. Sellers cannot manually modify or delete these automatic inventory records.

### Stock Status Error Scenarios

When a variant's stock quantity reaches zero, the variant is shown as out of stock to customers. Out of stock variants cannot be added to the shopping cart. If a customer attempts to add an out of stock variant to the cart, the request is rejected. The current stock quantity is calculated by summing all inventory records for the variant. If there are no inventory records, the stock is zero. When viewing product details, out of stock variants are marked as unavailable. If a variant in the cart becomes out of stock before checkout, the variant is marked as unavailable in the cart. Unavailable variants cannot be included in checkout. The system continuously recalculates stock as inventory records are added or subtracted.

### Inventory Record Integrity Scenarios

Inventory records are immutable once created. Sellers cannot edit inventory records after creation. Sellers cannot delete inventory records. If a seller attempts to modify an inventory record, the request is rejected. If a seller attempts to delete an inventory record, the request is rejected. Each inventory record preserves the quantity change, reason, and timestamp at the time of creation. The timestamp cannot be modified. Sellers can view the full inventory history for each variant they own. The inventory history shows all inventory records in chronological order. If a seller attempts to view inventory history for a variant they do not own, the request is rejected. If the variant does not exist, the request is rejected. Inventory records are preserved even if the product or variant is deleted.

## CancellationRequest Error Scenarios

Cancellation is handled per order item rather than per entire order. Customers can request cancellation only for individual items with paid status. Items with shipped or delivered status cannot be cancelled. Cancellation requests must include a reason explaining why the customer wants to cancel. The seller of that item can approve or reject the cancellation request. When a seller responds, a snapshot of the request state is created. If approved, that item is cancelled and a refund is processed for that item only. Cancelled items restore their stock quantities through an inventory record. The remaining items in the order continue processing normally. If all items in an order are cancelled, the entire order status becomes cancelled. Customers cannot cancel items that have already been shipped by the seller.

### Item-Level Cancellation Handling

Cancellation is processed at the individual order item level, not at the entire order level. Each order item within an order can be cancelled independently of other items. When a customer requests cancellation, they must specify which order item they want to cancel. The cancellation of one order item does not automatically cancel other items in the same order. Each order item maintains its own cancellation request and status. If an order contains items from multiple sellers, each item's cancellation is handled by its respective seller. The system tracks cancellation requests separately for each order item.

### Cancellation Eligibility by Item Status

WHEN an order item has paid status, THEN the customer CAN request cancellation for that item. WHEN an order item has shipped status, THEN the customer CANNOT request cancellation for that item. WHEN an order item has delivered status, THEN the customer CANNOT request cancellation for that item. The system validates the item status before accepting a cancellation request. If the item status is not paid, the cancellation request is rejected. Customers can only cancel items that have not yet been shipped by the seller. Once the seller marks an item as shipped, the cancellation option is no longer available for that item.

### Cancellation Request Submission Requirements

WHEN a customer submits a cancellation request, THE system SHALL require a reason for the cancellation. The cancellation reason must be provided as text input by the customer. The system SHALL reject cancellation requests that do not include a reason. The reason field cannot be left empty or blank. The customer must explicitly provide justification for why they want to cancel the order item. The cancellation reason is recorded and visible to the seller when reviewing the request. The system SHALL record the timestamp when the cancellation request is submitted.

### Seller Response to Cancellation Request

WHEN a seller receives a cancellation request, THE seller CAN approve or reject the request. WHEN the seller approves the cancellation, THE system SHALL create a snapshot of the cancellation request state. WHEN the seller rejects the cancellation, THE system SHALL create a snapshot of the cancellation request state. The snapshot records the request state before and after the seller's response. The snapshot includes the seller's decision and the timestamp of the response. The snapshot is immutable and cannot be deleted. Both the customer and seller can view the snapshot for dispute resolution. The system SHALL notify the customer when the seller responds to the cancellation request.

### Approved Cancellation Consequences

WHEN a cancellation request is approved, THE system SHALL process a refund for that specific order item only. The refund is processed for the approved item without affecting other items in the order. WHEN an item is cancelled, THE system SHALL restore the stock quantity for that item's variant. The stock restoration is recorded as a positive inventory record with the reason indicating cancellation. The cancelled order item changes its status to cancelled. The refund amount corresponds to the price paid for that specific item. The remaining items in the order continue with their normal processing flow. The order's overall status is updated based on the status of all its items.

### Partial and Complete Order Cancellation

WHEN some but not all items in an order are cancelled, THE remaining order items continue processing normally. The order status reflects the mixed state of its items as partially completed. WHEN all items in an order are cancelled, THE entire order status becomes cancelled. The system evaluates the status of each order item to determine the overall order status. If any item remains in paid, shipped, or delivered status, the order is not marked as fully cancelled. The customer can request cancellation for multiple items in the same order separately. Each cancellation request is evaluated and responded to independently by the respective seller. The order status is recalculated after each item cancellation is processed.

## RefundRequest Error Scenarios

Refund is handled per order item rather than per entire order. Customers can request a refund only for individual items with delivered status. Refund can be requested within 7 days of that item being delivered. Refund requests must include a reason explaining why the customer wants a refund. The seller of that item can approve or reject the refund request. When a seller responds, a snapshot of the request state is created. If approved, that item is refunded to the customer. Refunded items restore their stock quantities through an inventory record. The remaining items in the order are unaffected by the refund. If all items in an order are refunded, the entire order status becomes refunded. Refund requests submitted after the 7-day window are not accepted.

### Item-Level Refund Handling

Refund requests are handled per order item rather than per entire order. Customers can request a refund for individual items within an order without affecting other items. Each order item can have its own refund request independent of other items in the same order. If a customer wants to refund multiple items from the same order, separate refund requests must be submitted for each item. The system processes each refund request independently based on the status and eligibility of that specific item.

### Delivered Status Requirement

Refund requests can only be submitted for order items with delivered status. If a customer attempts to request a refund for an item with paid status, the request is rejected. If a customer attempts to request a refund for an item with shipped status, the request is rejected. If a customer attempts to request a refund for an item with cancelled status, the request is rejected. If a customer attempts to request a refund for an item with refunded status, the request is rejected. The system validates the item status before accepting any refund request.

### Seven-Day Refund Window

Refund requests must be submitted within 7 days of the item being delivered. The 7-day window starts from the date the item status changed to delivered. If a customer attempts to submit a refund request after the 7-day window has expired, the request is rejected. The system calculates the elapsed time from delivery date to request submission time. Refund requests submitted on the 7th day are accepted. Refund requests submitted on the 8th day or later are rejected as expired.

### Refund Reason Requirement

Every refund request must include a reason explaining why the customer wants a refund. The reason is provided as text content by the customer. If a customer submits a refund request without providing a reason, the request is rejected. The reason field cannot be empty or contain only whitespace. The customer must explicitly provide a meaningful reason for the refund request before submission.

### Seller Approval and Rejection

Sellers can approve or reject refund requests for their order items. When a refund request is submitted, the seller of that item receives notification and can respond. If the seller approves the refund request, the item status changes to refunded. If the seller rejects the refund request, the item status remains delivered and the refund is not processed. Sellers cannot approve or reject refund requests for items they did not sell. Each refund request can only be responded to once by the seller.

### Refund Response Snapshot

When a seller responds to a refund request, a snapshot of the request state is created. The snapshot records the state of the refund request at the moment of seller response. The snapshot includes the request status before and after the seller response. The snapshot captures the seller's decision and the timestamp of the response. Snapshots are immutable and cannot be modified or deleted. Both the customer and seller can view the snapshot history of refund requests for dispute resolution.

### Approved Refund Processing

When a seller approves a refund request, the refund is processed for that specific item. The item status changes from delivered to refunded. The customer receives confirmation of the approved refund. The refund amount corresponds to the price paid for that specific item. If multiple items were purchased in the same order, only the refunded item's amount is returned. The remaining items in the order continue with their current status unaffected by the refund.

### Stock Restoration on Refund

When an item is refunded, the stock quantity for that variant is restored. An inventory record is created with a positive quantity change equal to the refunded item quantity. The inventory record includes the reason indicating the stock restoration is due to a refund. The current stock quantity is recalculated by summing all inventory records including the new restoration record. The variant becomes available for purchase again if stock was previously depleted. Stock restoration occurs automatically upon refund approval.

### Partial Order Refund Impact

When only some items in an order are refunded, the remaining items are unaffected. The remaining items continue with their current status and processing flow. If some items are delivered and one item is refunded, the delivered items remain in delivered status. If some items are shipped and one item is refunded, the shipped items continue toward delivery. The order status reflects the mixed state of its items. Customers can still receive and confirm delivery for non-refunded items in the same order.

### Full Order Refund Status

When all items in an order are refunded, the entire order status becomes refunded. The system checks if every order item in the order has refunded status. Once all items reach refunded status, the order status automatically updates to refunded. If an order has three items and all three are refunded, the order status is refunded. If an order has three items and only two are refunded, the order status reflects the mixed state. The order status change to refunded occurs only after the final item refund is approved.

### Expired Refund Window Rejection

Refund requests submitted after the 7-day window are automatically rejected by the system. The system validates the submission timestamp against the delivery timestamp plus 7 days. Customers receive notification that their refund request was rejected due to expiration. Expired refund requests cannot be resubmitted for the same item. Sellers cannot override or extend the 7-day refund window. The rejection is recorded in the refund request history with the reason indicating window expiration.

## SellerApprovalRequest Error Scenarios

Seller accounts require administrator approval before they can sell products on the platform. Sellers submit a registration request that enters a pending approval state. Administrators can view the list of pending seller approval requests. Administrators can approve seller registrations allowing them to start selling. Administrators can reject seller registrations with a required reason. Rejected sellers can view the rejection reason provided by the administrator. Rejected sellers can submit a new registration request after addressing the rejection reason. Sellers can view their approval status at any time as pending, approved, or rejected. Pending sellers cannot create products or make sales until approved. Approved sellers gain full selling capabilities on the platform.

### Seller Registration Approval Process

Seller accounts require administrator approval before they can sell products on the platform. When a seller submits a registration request, the request enters a pending approval state. Administrators can view the list of all pending seller approval requests. Administrators can approve seller registrations, granting them permission to sell on the platform. Administrators can reject seller registrations when the request does not meet platform requirements. When rejecting a seller registration, the administrator must provide a rejection reason explaining why the request was denied. The rejection reason is recorded and associated with the rejected request.

### Rejection Handling and Resubmission

Rejected sellers can view the rejection reason provided by the administrator. The rejection reason is visible to the seller at any time after rejection. Rejected sellers can submit a new registration request after addressing the issues mentioned in the rejection reason. Each resubmission creates a new seller approval request that enters the pending state. Sellers can view their approval status at any time, which shows as pending, approved, or rejected. The approval status reflects the current state of the seller's most recent registration request.

### Pending Seller Restrictions

Pending sellers cannot create products on the platform until their registration is approved. Pending sellers cannot make sales or list items for purchase until approved. When a seller's registration is approved, they gain full selling capabilities on the platform including product creation, product management, and order fulfillment. Approved sellers can create products, manage variants, upload images, and process orders. The system blocks all product creation attempts from sellers with pending approval status. The system blocks all sales-related operations from sellers with pending approval status.

## AdminPromotionRequest Error Scenarios

Any user including customers or sellers can submit a request to become an administrator. The request includes a reason explaining why the user wants to become an administrator. Super administrators can view the list of pending admin promotion requests. Super administrators can approve requests making the user a regular administrator. Super administrators can reject requests without promoting the user. Regular administrators cannot approve or reject admin promotion requests. Super administrators can promote regular administrators to super administrator grade. Super administrators can demote other super administrators to regular administrator grade. Super administrators cannot demote themselves to regular administrator. There are two administrator grades: regular administrator and super administrator with different capabilities.

### Admin Promotion Request Submission

Any user including customers or sellers can submit a request to become an administrator. The admin promotion request must include a reason text explaining why the user wants to become an administrator. If the reason is missing or empty, the request submission is rejected. A user cannot submit multiple pending admin promotion requests simultaneously. If a user already has a pending request, any new submission is rejected until the pending request is resolved. Users can view the status of their own admin promotion requests (pending, approved, rejected).

### Super Administrator Request Management

Super administrators can view the list of all pending admin promotion requests from users. Super administrators can approve pending admin promotion requests, which makes the requesting user a regular administrator. Super administrators can reject pending admin promotion requests without promoting the user. When a super administrator responds to a request, the request status is updated and the user is notified of the decision. If a super administrator attempts to approve a request that is no longer pending (already approved or rejected), the action is rejected.

### Regular Administrator Permission Restrictions

Regular administrators cannot approve admin promotion requests. If a regular administrator attempts to approve a pending request, the action is rejected. Regular administrators cannot reject admin promotion requests. If a regular administrator attempts to reject a pending request, the action is rejected. Regular administrators cannot view the list of pending admin promotion requests. Only super administrators have the capability to manage admin promotion requests. This restriction ensures that only the highest administrator grade can control administrator membership.

### Administrator Grade Types and Capabilities

There are two administrator grades: regular administrator and super administrator. Regular administrators have standard administrative capabilities including seller management, category management, product oversight, order oversight, and user management. Super administrators have all regular administrator capabilities plus the ability to manage administrator grades. Super administrators can approve or reject admin promotion requests. Super administrators can promote regular administrators to super administrator grade. Super administrators can demote other super administrators to regular administrator grade. Super administrators cannot demote themselves to regular administrator grade.

### Administrator Grade Transitions

Super administrators can promote regular administrators to super administrator grade. When promoted, the user gains all super administrator capabilities immediately. Super administrators can demote other super administrators to regular administrator grade. When demoted, the user loses super administrator capabilities and retains only regular administrator capabilities. A super administrator cannot demote themselves to regular administrator. If a super administrator attempts to demote their own account, the action is rejected. At least one super administrator must remain in the system at all times. Grade transitions are recorded and cannot be undone automatically.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### Customer Shopping Journey

### Browse and Search

Customers can browse products by category or search by product name. Search results display product thumbnail, name, price, seller shop name, and average rating. Customers can filter results by category, price range, and in-stock availability. Customers can sort results by newest first, price low to high, or price high to low.

### Add to Wishlist

Customers can add products to their wishlist while browsing. The wishlist displays products only, not specific variants. Customers can view their wishlist with pagination support. Customers can remove products from their wishlist at any time. If a seller deletes a product, it is automatically removed from all customer wishlists.

### Add to Cart

Customers select a specific variant to add to cart, choosing from available options such as color and size. Customers specify the quantity when adding to cart. If the same variant already exists in the cart, the quantities are combined rather than creating a duplicate line item. Customers can view their cart showing each item with product name, variant options, price, quantity, and subtotal. The cart displays the total price of all items.

### Cart Management

Customers can change the quantity of items in their cart. Customers can remove items from their cart. If a variant's stock is less than the cart quantity, a warning is shown to the customer. If a variant is deleted by the seller or becomes out of stock, it is marked as unavailable in the cart and cannot be checked out.

### Checkout Process

Customers proceed to checkout from their cart. Only available items can be checked out. Customers select a shipping address from their saved addresses or use their default address. Customers review the order summary showing the list of items with prices, the shipping address, and the total price. Once the order is placed, the shipping address cannot be changed.

### Payment and Order Creation

Customers confirm and place the order. Payment is processed through an external payment gateway. If payment fails, the order is not created and customers can retry. If payment succeeds, the order is created with the following actions: stock quantities are decreased for each purchased variant, items are removed from the customer's cart, an order record is created with a unique order number, each purchased variant becomes an order item with status "paid", a snapshot of each purchased product and variant is saved with the order item, and a snapshot of each seller's profile is saved with the order item.

### Order History Viewing

Customers can view a list of all their orders. The order list is paginated and sorted by newest first. Each order in the list shows the order number, date, total price, and overall order status. Customers can view full details of an order including the list of items with product name, variant, quantity, price, and item status, the shipping address, and the list of shipments with tracking information showing which items are included in each shipment.

### Seller Order Fulfillment Journey

### View Pending Orders

Sellers can view order items for their products that need shipping. Sellers can filter order items by status to identify items with "paid" status awaiting shipment. The seller dashboard shows a summary including total number of products, total number of order items for their products, number of pending cancellation requests, and number of pending refund requests.

### Create Shipment

Sellers can select one or more of their order items to include in a shipment. A shipment can contain multiple order items from the same seller. Different sellers always ship separately in different shipments. Sellers enter tracking information for the shipment including carrier name and tracking number. All items in the same shipment share the same tracking information. When a shipment is created, all items in it change to status "shipped".

### Handle Cancellation Requests

Sellers can view cancellation requests for their order items. Cancellation requests can only be made for items with "paid" status. Each cancellation request includes a reason provided by the customer. Sellers can approve or reject each cancellation request. When a seller responds, a snapshot of the request state is created. If approved, that item is cancelled and a refund is processed for that item only. Cancelled items restore their stock quantities via an inventory record. The remaining items in the order continue processing normally.

### Handle Refund Requests

Sellers can view refund requests for their order items. Refund requests can only be made for items with "delivered" status within 7 days of delivery. Each refund request includes a reason provided by the customer. Sellers can approve or reject each refund request. When a seller responds, a snapshot of the request state is created. If approved, that item is refunded. Refunded items restore their stock quantities via an inventory record. The remaining items in the order are unaffected.

### Process Inventory Changes

Sellers can add inventory by restocking with a quantity and reason. Sellers can subtract inventory for adjustments or losses with a quantity and reason. Order placement automatically creates a negative inventory record. Order cancellation or refund automatically creates a positive inventory record. Sellers can view the full inventory history of each variant showing all quantity changes with reasons and timestamps.

### Delivery Confirmation and Review Journey

### View Tracking Information

Customers can view tracking information for each shipment in their orders. Tracking information includes carrier name and tracking number. Customers can see which order items are included in each shipment.

### Confirm Delivery

Customers can confirm delivery per shipment, not per individual item. When the customer confirms delivery, all items in that shipment change to status "delivered". If the customer does not confirm, items automatically change to "delivered" after 14 days from the shipping date.

### Write Review

Customers can write a review for products they have purchased. A review can only be written after that item's status is "delivered". Customers can write one review per product per order. Each review includes a rating from 1 to 5 stars which is required, and optional text content. Reviews are displayed on the product detail page sorted by newest first. The product's average rating is calculated from all non-deleted reviews.

### Edit or Delete Review

Customers can edit their own reviews. Every review edit creates a snapshot preserving the previous state. Customers can delete their own reviews. Snapshots of deleted reviews are preserved for dispute resolution. The product's average rating is recalculated excluding deleted reviews.

### Seller Registration and Approval Journey

### Submit Seller Registration

Users can submit a seller registration request with email and password. The registration creates a seller approval request with the seller's information. The seller account requires administrator approval before they can sell products.

### View Approval Status

Sellers can view their approval status which shows pending, approved, or rejected. If the status is rejected, sellers can view the rejection reason provided by the administrator. Sellers cannot create products or sell until their registration is approved.

### Resubmit After Rejection

Rejected sellers can submit a new registration request. The new request goes through the approval process again. Sellers can view the status of their new request.

### Administrator Review

Administrators can view the list of pending seller approval requests. Administrators can approve seller registrations, allowing the seller to create and sell products. Administrators can reject seller registrations and must provide a rejection reason. The rejection reason is visible to the seller.

### Administrator Promotion Journey

### Submit Promotion Request

Any user, whether customer or seller, can submit a request to become an administrator. The request includes a reason explaining why the user wants to become an administrator. The request is submitted for super administrator review.

### Super Administrator Review

Super administrators can view the list of pending administrator promotion requests. Super administrators can approve promotion requests. When approved, the user becomes a regular administrator. Super administrators can reject promotion requests. The user can view the status of their request.

### Administrator Grade Management

Super administrators can promote regular administrators to super administrator. Super administrators can demote other super administrators to regular administrator. Super administrators cannot demote themselves. Administrator grades determine the level of administrative access and capabilities.

### Multi-Seller Order Processing

### Order with Multiple Sellers

When a customer places an order containing items from different sellers, each seller's items are processed independently. Each order item belongs to the seller of that product variant. Order items from different sellers are grouped into separate shipments.

### Independent Item Status

Each order item has its own status independent of other items in the same order. Item statuses include paid, shipped, delivered, cancelled, and refunded. The overall order status is derived from its items: if all items are paid the order is paid, if any item is shipped and none delivered yet the order is shipped, if all items are delivered the order is delivered, if all items are cancelled the order is cancelled, if all items are refunded the order is refunded, and mixed states result in partially completed status.

### Partial Cancellation and Refund

Customers can request cancellation for individual items with paid status. If approved, only that item is cancelled while remaining items continue processing. Customers can request refund for individual items with delivered status. If approved, only that item is refunded while remaining items are unaffected. If all items in an order are cancelled, the entire order status becomes cancelled. If all items in an order are refunded, the entire order status becomes refunded.

### Product Lifecycle with Snapshots

### Product Creation and Editing

Sellers can create products with name, description, category, and base price. Products belong to the seller who created them. Sellers can edit their own products. Every product edit creates a snapshot preserving all product fields including name, description, category, base price, and images at that moment. The product snapshot also includes snapshots of all variants at that moment, preserving the complete state of the product and its variants.

### Variant Management

Sellers can add variants to their products. Each variant has a unique SKU code, option values such as color and size, an optional price that can override the base price, and a required stock quantity starting at zero. Sellers can edit variants including SKU code, option values, and price. Every variant edit creates a snapshot. A product must have at least one variant to be purchasable. Products with no variants are visible in search but shown as unavailable.

### Product and Variant Deletion

Sellers can delete their own products only if there are no pending order items with paid or shipped status for any variant of the product, and there are no pending cancellation or refund requests for any variant. Deleting a product also deletes all its variants and inventory records. Deleted products no longer appear in search or category listings. Sellers can delete variants only if there are no pending order items for that variant and no pending cancellation or refund requests for that variant. Snapshots are preserved even after product or variant deletion.

### Snapshot Access

Sellers can view snapshots of their own products. Administrators can view snapshots of any product on the platform. Snapshots are immutable and cannot be deleted. Snapshots record when the change was made, what was changed, and the values before and after. Snapshots are available for dispute resolution and audit purposes.

# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### Product Image Upload

Sellers can upload multiple images for each product.
Images are used to display the product in listings and detail pages.
The first uploaded image serves as the main thumbnail image shown in product listings.
Sellers can upload additional images to show different angles or details of the product.
All product images are included in product snapshots when the product is edited.
Product images are preserved in snapshots even if the original images are later deleted or modified.

### Seller Logo Upload

Sellers can upload a logo image for their shop profile.
The logo is displayed on the seller's profile page and in product listings.
Sellers can replace their logo image by uploading a new one.
Logo image changes are included in seller profile snapshots.
Logo images from past snapshots are preserved to maintain historical accuracy of order records.

### Image Management

Sellers can reorder images for their products.
Sellers can delete individual images from their products.
When the main thumbnail image is deleted, the next image in order becomes the new thumbnail.
If all images are deleted, the product displays without an image.
Deleted images are removed from the current product view but remain preserved in existing snapshots.
Image management operations (reorder, delete) create product snapshots to record the change.

### Image Storage and Preservation

All uploaded images are stored and associated with their respective products or seller profiles.
Images are preserved in snapshots at the time of each edit.
Snapshots retain the images that existed at the time of the snapshot, even if those images are later deleted.
This ensures that order items, which reference product snapshots, can display the product images as they appeared at the time of purchase.
Images in snapshots cannot be modified or deleted, maintaining historical accuracy for dispute resolution.

# External Integrations

Third-party API contracts, webhook handlers, and integration specifications.

## Integration Contracts

Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.

### Payment Gateway Integration

Customers proceed to payment after reviewing their order summary. The system connects to an external payment gateway to process the payment transaction. If payment succeeds, the order is created with all items, stock quantities are decreased, and items are removed from the cart. If payment fails, no order is created and customers can retry the payment with the same cart items. The external payment gateway handles the actual payment processing including card validation and transaction authorization. Payment success or failure is communicated back to the platform to determine whether to create the order.