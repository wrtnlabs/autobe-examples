**ecommerce — Business concepts, relationships, and states from user perspective**

Business concepts, relationships, and states from user perspective

# Domain Concepts

Describe what each concept means in the business domain and its key attributes.

## Customer Concept

A Customer is a registered user who can browse products, make purchases, and write reviews on the platform. Registration is required before accessing any features, with no guest browsing allowed. Each customer has a profile containing a display name and phone number for identification and communication. Customers can manage multiple shipping addresses for order delivery. When a customer deletes their account, their profile information is removed but order history and reviews are preserved for legal and seller record purposes. Reviews from deleted users are shown as "deleted user" to maintain review integrity while protecting privacy.

### Customer Account Registration

Registration is mandatory for all users before accessing any platform features. Guest browsing is not permitted. Customers must provide an email address and password to create an account. The email address serves as the unique identifier for customer identity and is used for login authentication. Once registered, customers gain access to product browsing, purchasing, wishlist management, and review writing capabilities.

### Customer Profile Information

Each customer maintains a profile containing a display name and phone number. The display name is used for public identification on the platform, such as in reviews and order history. The phone number is used for shipping and delivery communication purposes. Customers can update their display name and phone number at any time through their profile settings. Profile information is visible to administrators for account management purposes.

### Shipping Address Management

Customers can manage multiple shipping addresses for order delivery. Each address includes recipient name, phone number, street address, city, state or province, postal code, and country. Customers can add new addresses, edit existing addresses, and delete addresses they no longer need. Customers can designate one address as the default shipping address, which is automatically selected during checkout unless a different address is chosen. Address management is independent of order history, and deleted addresses do not affect past orders.

### Account Deletion and Data Retention

Customers can delete their accounts at any time. When an account is deleted, the customer's profile information including display name and phone number is removed from the system. However, order history and order records are preserved for seller records and legal compliance purposes. Reviews written by the customer are also preserved but the customer name is replaced with "deleted user" to maintain review integrity while protecting privacy. Preserved data remains accessible to administrators and sellers for dispute resolution and legal requirements.

## Seller Concept

A Seller is a vendor who can list products, manage inventory, and fulfill customer orders on the platform. Seller accounts require administrator approval before they can start selling. Each seller has a profile with a shop name, shop description, and logo image that customers can view. Sellers can create and edit their own products, manage variants, and handle order fulfillment. When a seller deletes their account, their products are removed from listings but order history and snapshots are preserved. Seller deletion is restricted when there are pending orders or cancellation/refund requests to protect customer interests.

### Seller Account and Approval Status

A seller is a vendor who operates a shop on the platform. Sellers must register with email and password, and their accounts require administrator approval before they can list products or process orders.

Each seller has an approval status that reflects their account standing: pending (awaiting review), approved (authorized to sell), or rejected (denied with a reason provided). Rejected sellers may submit a new registration request.

Sellers can view their current approval status at all times. If rejected, they can view the reason for rejection to understand what needs to be addressed before reapplying.

### Shop Profile Information

Each seller maintains a public shop profile that customers can view. The profile includes a shop name, a shop description, and a logo image.

The shop name identifies the seller's store and appears on product listings and order items. The shop description provides additional information about the seller's business. The logo image serves as visual branding for the shop.

Sellers can edit their shop name, description, and logo image. Every edit creates a snapshot that preserves the previous state for dispute resolution. Customers viewing product detail pages can access the seller profile to learn more about the seller.

### Product Listing Rights

Sellers have the right to list products on the platform once their account is approved. Products created by sellers belong to them and appear in search results and category listings.

When a seller deletes their account, their products are removed from all listings and are no longer visible to customers. Products in deleted categories become uncategorized but remain associated with their original seller in historical records.

Administrators can suspend seller accounts. When suspended, a seller's products are hidden from search and category listings and cannot be purchased. Suspended sellers cannot create new products or edit existing products, but they can still process existing orders.

### Order Fulfillment Responsibility

Sellers are responsible for fulfilling orders containing their products. Each order item from a seller's product must be shipped, and sellers can bundle multiple items into a single shipment.

Sellers enter tracking information for shipments, including carrier name and tracking number. All items in the same shipment share the same tracking information. Customers can view tracking details and confirm delivery for each shipment.

If customers do not confirm delivery, items automatically change to delivered status after 14 days from shipping. Sellers can view all order items for their products and filter by status to manage fulfillment.

### Account Deletion Restrictions

Sellers may delete their accounts only under specific conditions that protect customer interests. Account deletion is blocked when there are pending orders with paid or shipped status, or when there are pending cancellation or refund requests for their products.

When a seller successfully deletes their account, their products are removed from listings, but order history and product snapshots are preserved. The seller's shop name in past orders is retained to maintain order record integrity.

If a seller is banned by an administrator, they cannot log in, but existing orders remain intact and can still be fulfilled. Banned sellers retain their order fulfillment responsibilities until all orders are completed.

## Category Concept

A Category is an organizational structure used to classify products on the platform. Categories can have subcategories with one level of nesting only, creating a hierarchical browsing structure. Each category has a name and description that helps customers understand the product grouping. Categories are created and managed exclusively by administrators to maintain consistency. Customers can browse the complete list of categories and view all products within a specific category. Products can be organized into categories and subcategories for easier discovery and navigation.

### Category Definition and Purpose

Categories provide the organizational structure for classifying products on the platform. Each category serves as a container that groups related products together, enabling customers to browse and discover products by type or type family.

A category consists of a name that identifies the category and a description that explains what types of products belong within it. These attributes help customers understand the product grouping and make informed browsing decisions.

Products must be assigned to a category when created. This classification enables customers to find products through category-based navigation rather than search alone.

### Category Hierarchy Structure

Categories support a hierarchical structure with subcategories, but the hierarchy is limited to one level of nesting only. A category can have subcategories, but those subcategories cannot have their own subcategories.

This one-level hierarchy creates a simple two-tier browsing structure:
- Top-level categories (e.g., "Electronics", "Clothing", "Home & Garden")
- Subcategories under each top-level category (e.g., "Electronics > Smartphones", "Clothing > Men's Shirts")

Products can be assigned to either a top-level category or a subcategory. When browsing, customers can navigate from top-level categories down to subcategories to narrow their product discovery.

### Category Management and Administration

Categories are created, edited, and deleted exclusively by administrators. This restriction ensures consistency in the product classification structure across the platform.

Administrators have the following capabilities:
- Create new top-level categories and subcategories
- Edit category names and descriptions
- Delete categories

When a category is deleted, products that were assigned to it become uncategorized. These products remain visible on the platform but are no longer accessible through category-based browsing until reassigned to a valid category.

Customers cannot create, edit, or delete categories. They can only view the category structure and browse products within categories.

### Category Browsing and Product Discovery

Customers can browse the complete list of all categories on the platform. This browsing capability supports product discovery without requiring search.

The category browsing experience includes:
- Viewing all top-level categories
- Viewing subcategories within each top-level category
- Viewing all products assigned to a specific category or subcategory

Customers can navigate through the category hierarchy to find products of interest. When viewing a category, customers see all products that have been assigned to that category, regardless of which seller created them.

Category browsing works alongside product search as an alternative discovery method. Customers may browse categories when they know the general product type they are looking for, or use search when they have specific product names or keywords in mind.

## Product Concept

A Product is an item for sale on the platform with a name, description, category, and base price. Every product belongs to the seller who created it and must have at least one variant to be purchasable. Products can have multiple images with reordering capability, where the first image serves as the main thumbnail. Products are visible in search results and category listings unless deleted or the seller is suspended. When a product is edited, a snapshot is created to preserve the previous state including all product fields. Products without variants are shown as unavailable but remain visible in search.

### Product Definition and Attributes

A product represents an item for sale on the platform. Each product has a name and description that identify and explain the item to customers. The name is required and serves as the primary identifier for the product in listings and search results. The description provides additional details about the product's features, specifications, or usage.

Every product has a base price that represents the standard selling price. This base price serves as the default price for the product, though individual variants may override this price with their own pricing.

Products must be assigned to a category, which can be either a main category or a subcategory. The category assignment determines where the product appears in category browsing and helps organize products for customer discovery. Only administrators can create and manage categories; sellers select from the available category structure when creating products.

Products belong to the seller who created them. The seller is the owner of the product and has exclusive rights to edit or delete their own products. The seller's shop name is associated with the product and is visible to customers browsing the product.

### Seller Ownership and Product Visibility

Products are owned by the seller who created them. The seller maintains exclusive ownership and control over their products throughout the product lifecycle. This ownership relationship is established at product creation and cannot be transferred to another seller.

A product is visible to customers in search results and category listings when it is active. Products become hidden from listings when they are deleted by the seller or when the seller's account is suspended by an administrator. Deleted products no longer appear in any customer-facing listings or search results.

When a product has no variants defined, it remains visible in search and category listings but is displayed with an "unavailable" status. Customers can view the product details but cannot add it to their cart or purchase it until at least one variant is created.

The seller's profile information, including shop name and logo, is associated with the product. This association is preserved in order snapshots even if the seller later modifies their profile information.

### Product Snapshots

When a product is edited, the system creates an immutable snapshot that preserves the previous state of the product. The snapshot captures all product fields including name, description, category, base price, and images at the moment before the change.

Product snapshots record when the change was made, what fields were changed, and the values before and after the modification. This includes changes to product images and their ordering.

Snapshots are preserved indefinitely and cannot be deleted, even if the product itself is later deleted by the seller. This ensures a complete historical record of all product changes for dispute resolution and audit purposes.

Sellers can view snapshots of their own products to track changes over time. Administrators can view snapshots of any product on the platform, including products owned by other sellers. This oversight capability supports platform governance and policy enforcement.

### Product Images and Thumbnail Selection

Products can have multiple images uploaded by the seller. These images provide visual representation of the product for customers browsing the product detail page.

The first image in the product's image list serves as the main thumbnail image. This thumbnail is displayed in search results, category listings, and product listing pages. Sellers can reorder images, which changes which image appears as the thumbnail.

Image changes are included in product snapshots. When a seller adds, removes, or reorders images, a snapshot is created that captures the image state before and after the modification.

The main thumbnail image is automatically selected based on the current first image in the list. If the first image is deleted, the system updates the thumbnail to the new first image in the remaining image list.

## ProductVariant Concept

A ProductVariant represents a specific combination of options for a product, such as different colors or sizes. Each variant has a unique SKU code, option values, optional price override, and required stock quantity. Variants are managed through inventory history records that track all stock changes with reasons and timestamps. Current stock is calculated by summing all inventory records for that variant. When stock reaches zero, the variant is shown as out of stock and cannot be added to cart. Variants can be edited or deleted subject to order status restrictions to protect customer purchases.

### Product Variant Definition

A product variant represents a specific combination of options for a product, such as different colors, sizes, or other attributes. Each variant is identified by a unique SKU code that distinguishes it from other variants of the same product.

Each variant has option values that describe its specific characteristics (for example, color: "Red", size: "Large"). The combination of option values defines what makes this variant unique.

A variant has a price that can either match the product's base price or override it with a different value. This allows sellers to charge different prices for different variants.

Each variant has a stock quantity that represents available inventory. The stock quantity is tracked through inventory history records rather than stored as a single value.

### Stock Quantity and Inventory Tracking

Stock quantity for each variant is managed through inventory history records. Each inventory record contains a quantity change value (positive for restocking, negative for orders or adjustments), a reason for the change, and a timestamp.

The current stock quantity is calculated by summing all inventory history records for that variant. This approach preserves a complete audit trail of all stock movements.

When the stock quantity reaches zero, the variant is shown as "out of stock" to customers. Out of stock variants cannot be added to the shopping cart.

### Variant Edit Restrictions

Sellers can edit variant information including the SKU code, option values, and price. However, variant edits are restricted when the variant is involved in active orders.

A variant cannot be edited if there are any order items with paid or shipped status for that variant. This restriction protects the integrity of customer purchases that have already been made.

A variant cannot be edited if there are any pending cancellation or refund requests for that variant. This ensures that dispute resolution processes are not disrupted by data changes.

### Variant Deletion Restrictions

Sellers can delete variants when they are no longer needed. However, variant deletion is restricted to protect customer purchases and ongoing transactions.

A variant cannot be deleted if there are any order items with paid or shipped status for that variant. This ensures that order history remains consistent with the products customers actually purchased.

A variant cannot be deleted if there are any pending cancellation or refund requests for that variant. This preserves the ability to process these requests properly.

When a variant is deleted, all associated inventory history records are preserved for audit purposes, but the variant no longer appears in product listings or search results.

## ProductImage Concept

A ProductImage is a visual representation of a product that customers can view. Sellers can upload multiple images for each product and reorder them to determine display priority. The first image serves as the main thumbnail shown in product listings and search results. Image changes are included in product snapshots to preserve the visual state at any point in time. Images can be deleted from products when no longer needed. The image collection for a product provides customers with a complete visual understanding of the item before purchase.

### Product Image Definition

A Product Image is a visual representation of a product that customers can view during browsing and shopping. Sellers can upload multiple images for each product to provide customers with a complete visual understanding of the item before purchase.

Each product can have multiple images associated with it. The images are stored in a collection that represents the complete visual presentation of the product. This collection is visible to all customers viewing the product detail page.

The first image in the collection serves as the main thumbnail image. This thumbnail is displayed in product listings, search results, and category pages as the primary visual identifier for the product.

### Image Display and Organization

Images within a product can be reordered by the seller. The order determines which image appears first as the main thumbnail and the sequence in which images are displayed on the product detail page.

The first image in the reordered collection becomes the main thumbnail. This thumbnail is shown in:
- Product search results
- Category browsing pages
- Product listing views

Reordering allows sellers to prioritize the most important or attractive visual representation of their product.

### Image Lifecycle and Snapshots

When a product image is deleted from a product, it is removed from the current visual collection and no longer appears on the product detail page or as the thumbnail in listings.

Image changes, including additions, deletions, and reordering, are included in product snapshots. Each snapshot preserves the complete state of the product's visual collection at the time of the change. This includes:
- The set of images present at that moment
- The order of images in the collection
- Which image was designated as the main thumbnail

Snapshots of product images are immutable and cannot be deleted. They are preserved for dispute resolution and historical reference, even after images are deleted from the current product.

## Address Concept

An Address is shipping information that customers can save for order delivery. Each address contains recipient name, phone number, street address, city, state or province, postal code, and country. Customers can add multiple addresses to their account and designate one as the default shipping address. Addresses can be edited or deleted as needed. During checkout, customers must select a shipping address or use their default. Once an order is placed, the shipping address cannot be changed to maintain order integrity.

### Address Structure and Components

An address is shipping information that customers save for order delivery. Each address contains the following components:

**Recipient Information**
- Recipient name: the name of the person receiving the delivery
- Recipient phone number: a contact number for delivery communication

**Location Details**
- Street address: the primary delivery location
- City: the city or municipality
- State or province: the state, province, or regional division
- Postal code: the postal or ZIP code for the area
- Country: the country of delivery

All fields are required to ensure successful delivery. The address is associated with a specific customer account and is used during checkout to specify where orders should be shipped.

### Multiple Address Storage and Default Selection

Customers can store multiple shipping addresses in their account. This allows them to save different delivery locations for various purposes, such as home, work, or gift addresses.

**Default Address**
Customers can designate one address as their default shipping address. The default address is automatically selected during checkout unless the customer chooses a different saved address. Customers can change which address is set as default at any time.

**Address Identification**
Each stored address is associated with the customer who created it. Addresses are private to the customer and are not visible to other users on the platform.

### Address Modification and Removal

Addresses can be modified after creation. Customers can update any field of a saved address to reflect changes in recipient information or location details.

**Address Removal**
Customers can delete addresses they no longer need. Deleted addresses are removed from the customer's saved address list and cannot be used for new orders.

**Order Integrity**
Once an order is placed with a specific shipping address, that address becomes part of the order record and cannot be changed. This preserves the accuracy of delivery information for order fulfillment and tracking purposes.

### Address Selection in Checkout

During checkout, customers must provide a shipping address for their order. Customers can select from their saved addresses or use their default address.

**Address Selection**
Customers review the order summary before placing the order, which includes the selected shipping address. The shipping address is locked once the order is created and cannot be modified after payment is confirmed.

**Address in Order Records**
The shipping address selected at checkout becomes part of the permanent order record. This address is preserved even if the customer later updates or deletes the address from their saved address list, ensuring order history remains accurate.

## Cart Concept

A Cart is a temporary holding area where customers store product variants they intend to purchase. The cart tracks when it was created and last updated, along with the total item count. Customers can add variants to the cart with specific quantities, and duplicate variants are combined rather than added separately. The cart displays each item with product name, variant options, price, quantity, and subtotal. Cart items can be modified or removed before checkout. The cart shows warnings when variant stock is insufficient for the cart quantity.

### Cart Overview

A Cart is a temporary holding area where customers store product variants they intend to purchase. The cart exists from the moment a customer adds their first item until checkout is completed or items are removed.

The cart tracks when it was created and when it was last updated. The system maintains an item count that reflects the total number of distinct variants in the cart.

Customers must be logged in to create or access a cart. Each customer has one active cart at a time. Cart items persist across sessions until checkout or manual removal.

The cart is automatically removed after checkout is completed, with items transferred to the order record.

### Cart Item Management

Customers can add product variants to their cart by selecting a specific variant and specifying the desired quantity. Each variant can only be added once; if the same variant already exists in the cart, the quantities are combined rather than creating a duplicate entry.

When viewing the cart, each item displays the product name, variant options (such as color and size), unit price, quantity, and subtotal for that item.

Customers can modify the quantity of any item in the cart. If the quantity is changed to zero or removed, the item is deleted from the cart.

Customers can remove individual items from the cart at any time before checkout.

### Cart Calculations and Warnings

The cart displays the total price of all items combined. This total is calculated by summing the subtotals of each cart item.

When a variant in the cart has insufficient stock (stock quantity is less than the cart quantity), the system displays a warning to the customer.

Variants that are out of stock or have been deleted by the seller are marked as unavailable in the cart. Unavailable items cannot be included in checkout.

The cart shows the current price of each variant at the time of viewing. Price changes to products after items are added to the cart are reflected in the cart display.

## CartItem Concept

A CartItem represents an individual product variant with quantity in a customer's shopping cart. Each cart item tracks the quantity of the variant, when it was added, and the unit price at that time. Cart items link to specific product variants, not just products, requiring customers to select exact options. When the same variant is added multiple times, quantities are combined into a single cart item. Cart items can have their quantities changed or be removed entirely from the cart. Cart items are removed from the cart when the order is successfully placed.

### Shopping Cart Entry

Each cart item represents an individual product variant selected for potential purchase. A cart item is created when a customer adds a specific variant to their shopping cart. Unlike wishlists which store products, cart items require customers to select a specific variant with exact option values (such as color, size, or other combinations). The system does not allow adding a product to the cart without first selecting a specific variant. Each cart item tracks the quantity of that variant the customer wishes to purchase. When the same variant is added to the cart multiple times, the system combines the quantities into a single cart item rather than creating duplicate entries.

### Cart Item Updates

Each cart item records when it was added to the cart and captures the unit price of the variant at that moment in time. The added timestamp allows customers and the system to track how long items have been in the cart. The unit price is frozen at the time of addition, meaning that if the product's price changes later, the cart item retains the original price that was in effect when it was added. Cart items can be modified after creation: customers can change the quantity of any item in their cart, increasing or decreasing as needed. If the quantity is changed, the item's added timestamp remains unchanged. Customers can also remove individual cart items entirely from their shopping cart at any time before checkout.

### Cart to Order Conversion

When a customer successfully completes checkout and payment, all cart items in the order are converted into order items. This transition removes the items from the shopping cart and creates permanent order records. Each cart item becomes an order item with the same variant, quantity, and price that was captured when the item was added to the cart. The order item then follows its own lifecycle with status tracking (paid, shipped, delivered, cancelled, or refunded). After successful order creation, the cart is cleared of the purchased items. If payment fails, the cart items remain in the cart and the customer can retry checkout or modify their cart before attempting again.

## Wishlist Concept

A Wishlist is a saved collection of products that customers want to purchase in the future. The wishlist tracks when it was created and last updated, along with the total item count. Customers can add products to their wishlist and view their complete wishlist with pagination. The wishlist shows products, not specific variants, allowing customers to save items for later consideration. Products can be removed from the wishlist when no longer desired. If a seller deletes a product, it is automatically removed from all wishlists to maintain data consistency.

### Wishlist Overview

A Wishlist is a saved collection of products that customers want to purchase in the future. It allows customers to organize products they are interested in for future consideration without committing to an immediate purchase.

The wishlist is automatically created when a customer adds their first product. The system tracks when the wishlist was created and when it was last updated. An item count is maintained to show the total number of products in the wishlist.

Wishlists are paginated when displayed, allowing customers to browse through their saved products in manageable pages. The wishlist shows products as a whole, not specific variants, allowing customers to save items for later consideration regardless of which variant they may eventually purchase.

Customers can access their wishlist at any time to review products they have saved, helping them track items they are interested in for future purchases.

### Wishlist Item Management

Customers can save products to their wishlist for future purchase consideration. When adding a product to the wishlist, the system records when the product was added. Each wishlist entry references a product, not a specific variant, allowing customers to save the product for later review.

Customers can remove products from their wishlist when they are no longer interested. This removal is immediate and the product is no longer tracked in the wishlist.

If a seller deletes a product that exists in any customer's wishlist, the system automatically removes that product from all wishlists to maintain data consistency. This ensures customers do not see products that no longer exist on the platform.

## WishlistItem Concept

A WishlistItem represents an individual product saved in a customer's wishlist. Each wishlist item tracks when the product was added to the wishlist. Wishlist items link to products rather than specific variants, allowing customers to save items without selecting options. The wishlist item maintains a reference to the product for display purposes. Customers can remove wishlist items when they no longer want to track the product. Wishlist items are automatically removed when the associated product is deleted by the seller.

### Wishlist Item Definition

A wishlist item represents an individual product saved by a customer in their wishlist. Each wishlist item is a distinct entry that tracks one product the customer wishes to monitor or purchase later.

Each wishlist item maintains a reference to a specific product, not to a particular variant. This allows customers to save products without committing to specific options like size or color. When viewing the wishlist, customers see the product details and can later select a variant when adding to cart.

The system records when each product was added to the wishlist. This timestamp helps customers identify recently saved items and organize their wishlist by addition date.

Wishlist items are automatically synchronized with product availability. When a seller deletes a product, all wishlist items referencing that product are automatically removed. This ensures the wishlist only contains products that still exist in the marketplace.

### Product Reference and Tracking

Each wishlist item tracks a single product through a product reference. This reference maintains the connection between the wishlist entry and the product's current information including name, images, and base price.

The product reference in a wishlist item points to the product entity itself, not to any specific variant. Customers can save a product to their wishlist without selecting variant options such as color or size. When the customer decides to purchase, they navigate to the product detail page and choose their preferred variant.

Wishlist items do not store product details directly. Instead, they maintain a reference that allows the system to display current product information. If the product is updated by the seller, the wishlist displays the latest information.

The product reference remains valid as long as the product exists. When a product is deleted by its seller, the system automatically removes all wishlist items that reference that product. Customers do not need to manually clean up their wishlist when products are removed from the platform.

### Item Lifecycle and Removal

Customers can remove individual items from their wishlist when they no longer wish to track a product. This removal is immediate and does not affect the product's availability for other customers.

The system also handles automatic removal of wishlist items when the referenced product is deleted by its seller. This synchronization ensures customers never see products that no longer exist in the marketplace.

Wishlist items persist until explicitly removed by the customer or automatically removed due to product deletion. There is no automatic expiration or time-based removal of wishlist items.

When a product is deleted and subsequently recreated by the seller, it appears as a new product in the system. Customers must add it to their wishlist again as a new entry, as the original wishlist item was removed during the deletion.

## Order Concept

An Order is a completed purchase transaction created when payment succeeds. Each order has a unique order number, total price, and order date. An order contains one or more order items that may come from different sellers. The overall order status is derived from the statuses of its individual items. Orders can have mixed states where some items are delivered while others are refunded. The shipping address is locked once the order is placed and cannot be changed. Order history is preserved even when customers delete their accounts.

### Order Definition

An order represents a completed purchase transaction created when a customer confirms checkout and payment succeeds. Each order is assigned a unique order number that serves as its identifier throughout its lifecycle. The order records the total price of all items purchased, calculated from the variant prices and quantities at the time of purchase. The order date is automatically recorded when the order is created, marking when the payment was successfully processed. Once an order is placed, the shipping address is locked and cannot be changed, ensuring the delivery destination remains fixed. Order history is preserved even when customers delete their accounts, maintaining a complete record of all purchases.

### Order Structure and Multi-Seller Items

An order can contain multiple order items that may come from different sellers. Each order item represents a specific product variant with a quantity purchased. If a customer buys three units of the same variant, it becomes one order item with quantity three. When items from multiple sellers are purchased together, they are grouped into a single order but remain as separate order items. This allows each seller to fulfill their portion of the order independently. The total price of the order is the sum of all order item subtotals, where each subtotal is the variant price multiplied by the quantity.

### Order Status Derivation

Each order item has its own independent status that tracks its fulfillment state. The overall order status is derived from the statuses of all its items. If all items are paid, the order status is "paid". If any item is shipped and none delivered, the order status is "shipped". If all items are delivered, the order status is "delivered". If all items are cancelled, the order status is "cancelled". If all items are refunded, the order status is "refunded". When items have mixed states—for example, some delivered while others are refunded—the order status becomes "partially completed". This derivation ensures the order status accurately reflects the overall fulfillment progress.

### Mixed Order States

Orders can exist in mixed states where different items have different statuses simultaneously. For example, one item may be delivered while another item in the same order is being refunded. Another item might be cancelled while the rest are shipped. These mixed states are valid and tracked through the "partially completed" order status. Each order item maintains its own lifecycle independently, allowing cancellation or refund of individual items without affecting other items in the order. The order status updates automatically as item statuses change, providing a summary view of the order's overall state.

### Shipping Address Lock

When a customer completes checkout and payment succeeds, the shipping address recorded at that moment becomes permanently associated with the order. This shipping address cannot be modified after the order is placed, even if the customer updates their default address or adds new addresses. The locked shipping address ensures delivery accuracy and prevents post-purchase address manipulation. Order history displays the shipping address that was used at the time of purchase, providing an accurate record for both customers and administrators.

## OrderItem Concept

An OrderItem represents an individual product variant purchased within an order with its own quantity and status. Each order item tracks the product name, variant options, quantity, price, and current status. Order items can be from different sellers within the same order. Each order item has independent status progression and can be individually cancelled or refunded. Order items are grouped into shipments when shipped by the seller. Snapshots of the product, variant, and seller profile are saved with each order item to preserve the state at purchase time.

### Order Item Definition

An order item represents an individual purchase entry within an order. Each order item corresponds to a specific product variant selected by the customer at the time of purchase. The customer must select a specific variant (not just a product) when adding items to the cart, and this variant selection becomes the basis for the order item.

Each order item includes the following information captured at purchase time:
- Product name and description
- Variant option values (e.g., color, size combinations)
- Quantity purchased
- Unit price at the time of purchase
- Reference to the selling merchant

The order item is the fundamental unit of purchase tracking. If a customer purchases 3 units of the same variant, this becomes a single order item with quantity 3, not three separate order items.

### Independent Item Status and Multi-Seller Support

Each order item maintains its own independent status, separate from other items in the same order. This allows items from different sellers to progress through their fulfillment lifecycle independently.

Order item status values:
- Paid: Payment completed, waiting for seller to ship
- Shipped: Seller has shipped the item
- Delivered: Item has been delivered to the customer
- Cancelled: Item was cancelled before shipment
- Refunded: Item was refunded after delivery

The overall order status is derived from the statuses of its items. For example, if all items are paid, the order is marked as paid. If some items are delivered and others are refunded, the order shows a mixed state.

Multiple sellers can contribute items to the same order. Each seller's items are tracked independently, and items from different sellers are always shipped separately. The customer sees a unified order but the fulfillment happens per seller.

### Snapshot at Purchase

At the time of purchase, snapshots are created and saved with each order item. These snapshots preserve the complete state of the purchased item as it existed at the moment of transaction.

The order item snapshot includes:
- Product state: name, description, images as they appeared at purchase
- Variant state: option values and price at purchase time
- Seller profile state: shop name and logo as they appeared at purchase

These snapshots remain accessible even after product deletion, variant modification, or seller account changes. This ensures that order history accurately reflects what the customer purchased, regardless of subsequent changes to products or seller profiles.

Order items support individual cancellation and refund operations. The cancellation workflow applies to items with "paid" status, and the refund workflow applies to items with "delivered" status. Each order item can be processed independently through these workflows without affecting other items in the same order.

### Shipment Grouping

Order items are grouped into shipments when fulfilled by the seller. A shipment represents a physical package sent by a single seller and can contain one or more order items from that seller.

A seller can choose to ship items individually or bundle multiple items into one shipment. All items in the same shipment share the same tracking information (carrier name and tracking number).

When a shipment is created, all items included in that shipment change to status "shipped". The customer can view tracking information for each shipment. Delivery confirmation is handled per shipment: when the customer confirms delivery, all items in that shipment change to status "delivered". If the customer does not confirm, items automatically change to "delivered" after 14 days from the shipping date.

Order items cannot be moved between shipments after a shipment is created. Each order item belongs to exactly one shipment once shipped.

## Shipment Concept

A Shipment is a physical package sent by a seller containing one or more order items from the same seller. Different sellers always ship separately with different shipments. A seller can choose to ship items individually or bundle multiple items into one shipment. Each shipment has tracking information including carrier name and tracking number. All items in the same shipment share the same tracking information. When a shipment is created, all items in it change to shipped status. Customers confirm delivery per shipment, not per individual item.

### Physical Package Concept

A Shipment represents a physical package sent by a seller to a customer. It contains one or more order items that are grouped together for delivery. Each shipment corresponds to a single delivery event from one seller to one customer.

The shipment concept exists because orders may contain items from multiple sellers, and each seller ships their items separately. A shipment is the unit of delivery tracking and customer confirmation, not the individual order item.

### Seller-Based Shipment Organization

All order items within a single shipment must belong to the same seller. Items from different sellers are always shipped in separate shipments, regardless of whether they appear in the same order.

When an order contains items from multiple sellers, the system creates one shipment per seller. Each shipment contains only the order items that belong to that particular seller's products.

### Item Bundling and Selection

A seller has the flexibility to bundle multiple order items into a single shipment or ship them individually. The seller decides which items to include in each shipment.

For example, if a customer orders five items from the same seller, the seller may choose to:
- Ship all five items together in one shipment
- Ship them in two separate shipments (e.g., three items in one, two in another)
- Ship each item individually in separate shipments

The bundling decision is made by the seller at the time of shipping.

### Shipment Tracking Information

Each shipment includes tracking information that allows the customer to monitor delivery progress. The tracking information consists of a carrier name and a tracking number.

All order items included in the same shipment share the identical tracking information. Customers view tracking details at the shipment level, not at the individual item level.

### Shipment Status and Delivery Confirmation

When a seller creates a shipment by selecting order items and entering tracking information, all items included in that shipment automatically change their status to "shipped".

Customers confirm delivery at the shipment level, not for individual items. When a customer confirms delivery for a shipment, all order items within that shipment change their status to "delivered".

If a customer does not manually confirm delivery, items in the shipment automatically change to "delivered" status after 14 days from the shipping date.

## Review Concept

A Review is customer feedback for a product they have purchased and received. Each review has a required rating from 1 to 5 stars and optional text content. Reviews can only be written after the order item status is delivered. Customers can write one review per product per order. Reviews are displayed on the product detail page sorted by newest first. Customers can edit their own reviews, and every edit creates a snapshot. Customers can delete their own reviews but snapshots are preserved. The product's average rating is calculated from all non-deleted reviews.

### Review Definition

A Review represents customer feedback for a product they have purchased and received. Each review consists of a required rating from 1 to 5 stars and optional text content. The rating expresses the customer's satisfaction level with the product, while the text content allows customers to provide additional comments about their experience. Reviews are associated with both the customer who wrote them and the product being reviewed.

### Review Eligibility

Customers can only write a review for a product after the corresponding order item status has changed to delivered. This ensures that reviews are based on actual product receipt and usage. Each customer can write only one review per product per order, preventing multiple reviews for the same purchase. If a customer purchases the same product in different orders, they can write a separate review for each order.

### Review Management and Snapshots

Customers can edit their own reviews after submission. Every edit to a review creates a snapshot that preserves the previous state, including the rating and text content before and after the change. Customers can also delete their own reviews. When a review is deleted, the review content is removed from public display but the snapshots are preserved for record-keeping purposes. Deleted reviews are not included in the product's average rating calculation.

### Review Display and Rating Calculation

Reviews are displayed on the product detail page, sorted by newest first. The product's average rating is calculated from all non-deleted reviews for that product. When a customer account is deleted, their reviews are preserved but shown as "deleted user" to maintain the integrity of product ratings and feedback history. This ensures that product ratings remain meaningful even after customer accounts are removed from the platform.

## InventoryRecord Concept

An InventoryRecord tracks all stock quantity changes for a product variant with a quantity change value, reason, and timestamp. Positive changes indicate restocking while negative changes indicate orders or adjustments. Current stock is calculated by summing all inventory records for that variant. Each inventory record includes the reason for the stock change for transparency and audit purposes. Order placement automatically creates a negative inventory record while cancellations and refunds create positive records. Inventory history provides a complete audit trail of stock movements.

### Inventory Record Purpose and Structure

Each product variant maintains its own stock quantity through inventory records. The stock quantity represents the current available inventory for that specific variant and is tracked through a complete history of all quantity changes. Sellers can view the full inventory history for any variant they own.

Inventory records capture every stock movement with a quantity change value that indicates how much the stock increased or decreased. Positive values represent stock additions such as restocking, while negative values represent stock reductions such as orders or inventory adjustments. Each inventory record includes a reason field that explains why the stock change occurred, providing transparency for all inventory movements.

### Stock Quantity Calculation and Automatic Updates

The current stock quantity for a product variant is calculated by summing all inventory records associated with that variant. This running total represents the available inventory at any given time. When the calculated stock reaches zero, the variant is displayed as out of stock to customers. Out of stock variants cannot be added to shopping carts by customers.

Inventory records are automatically created for specific business events. When a customer places an order containing a variant, a negative inventory record is automatically generated to reduce the stock. When an order item is cancelled or refunded, a positive inventory record is automatically generated to restore the stock quantity. Sellers can also manually add inventory through restocking operations or subtract inventory through adjustment operations, each requiring a reason for the change.

### Inventory Audit Trail and Timestamp Tracking

The inventory system maintains a complete audit trail of all stock movements for every product variant. Each inventory record includes a timestamp that indicates when the stock change occurred. This timestamp tracking allows sellers to review the history of inventory changes over time and understand when specific stock movements happened.

The combination of quantity change values, change reasons, and timestamps creates a comprehensive inventory audit trail. Sellers can review this history to understand stock patterns, investigate discrepancies, and maintain accountability for inventory changes. The audit trail supports dispute resolution and provides transparency for inventory management decisions.

## CancellationRequest Concept

A CancellationRequest is a formal request from a customer to cancel an order item that has been paid but not yet shipped. The request includes a text reason explaining why the customer wants to cancel. The seller of that item can approve or reject the cancellation request. When the seller responds, a snapshot of the request state is created for dispute resolution. If approved, the item is cancelled and stock quantities are restored via inventory records. Cancellation requests are handled per order item, not per entire order, allowing partial order modifications.

### Cancellation Request Definition

A cancellation request is a formal mechanism that allows customers to request cancellation of individual order items that have been paid but not yet shipped. Cancellation requests are handled at the item level, not at the entire order level, enabling partial order modifications where some items can be cancelled while others continue processing normally.

Customers can only request cancellation for order items with "paid" status. Once an item has been shipped, it can no longer be cancelled through this mechanism and must instead go through the refund process after delivery.

Each cancellation request is associated with a single order item and cannot be used to cancel multiple items at once. If a customer wishes to cancel multiple items from the same order, separate cancellation requests must be submitted for each item.

### Cancellation Request Attributes

Each cancellation request contains the following attributes:

- Cancellation reason: A text field where the customer explains why they want to cancel the item. This reason is required and is visible to the seller when reviewing the request.
- Request status: Tracks the current state of the cancellation request through its lifecycle (pending, approved, or rejected).
- Creation timestamp: Records when the cancellation request was submitted by the customer.
- Response timestamp: Records when the seller responded to the request with approval or rejection.

The cancellation reason text must be provided by the customer at the time of request submission. This information is preserved in snapshots when the seller responds to the request, ensuring a complete record for dispute resolution.

### Cancellation Request Status and Approval Process

When a customer submits a cancellation request, the request enters a "pending" status awaiting seller response. The seller of the affected item can then approve or reject the cancellation request.

When the seller responds to a cancellation request, a snapshot of the request state is created. This snapshot preserves the reason provided by the customer, the seller's decision, and the timestamp of the response. Snapshots are immutable and cannot be deleted, ensuring a complete audit trail for any disputes.

If the seller approves the cancellation request:
- The order item status changes to "cancelled"
- Stock quantities for the variant are restored through an inventory record
- The refund is processed for that item only

If the seller rejects the cancellation request:
- The order item remains in "paid" status
- The item continues through the normal fulfillment process
- The rejection is recorded in the snapshot for future reference

### Partial Order Cancellation and Stock Restoration

Cancellation requests enable partial order cancellation, meaning only specific items within an order can be cancelled while other items continue processing normally. This allows customers to modify their orders without affecting items they still want to receive.

When all items in an order are successfully cancelled through individual cancellation requests, the overall order status becomes "cancelled". If only some items are cancelled, the order status reflects the mixed state of its remaining items.

When a cancellation request is approved and the item is cancelled:
- The stock quantity for that variant is automatically restored via an inventory record
- The inventory record includes the reason for the stock change (cancellation)
- The item is removed from the customer's order fulfillment process
- Other items in the same order continue through their normal status transitions

Stock restoration occurs automatically upon cancellation approval and is tracked through the inventory history system, separate from the snapshot mechanism used for dispute resolution.

## RefundRequest Concept

A RefundRequest is a formal request from a customer for a refund on an order item that has been delivered. The request includes a text reason explaining why the customer wants a refund. Refund requests can only be made within 7 days of the item being delivered. The seller of that item can approve or reject the refund request. When the seller responds, a snapshot of the request state is created for dispute resolution. If approved, the item is refunded and stock quantities are restored via inventory records. Refund requests are handled per order item, not per entire order.

### Refund Request Eligibility and Scope

A refund request is a formal request from a customer for a refund on an order item that has been delivered. Customers can only request a refund for items with "delivered" status. Refund requests are handled at the individual order item level, not for entire orders. This means a customer can request a refund for one item while other items in the same order continue processing normally.

Refund requests are time-limited. A customer can only submit a refund request within 7 days of the item being delivered. After this window expires, no refund request can be submitted for that item.

When a refund is approved, the item status changes to "refunded" and stock quantities are restored through inventory records. If all items in an order are refunded, the entire order status becomes "refunded". If only some items are refunded, the order status reflects the mixed state as "partially completed".

### Refund Request Attributes and Status

Each refund request includes a text reason field where the customer explains why they want a refund. This reason is required and helps the seller understand the basis for the refund request.

Refund requests have a status that tracks their lifecycle. The status indicates whether the request is pending seller review, approved by the seller, or rejected by the seller. The status is updated when the seller responds to the request.

When the seller approves or rejects a refund request, a snapshot of the request state is created. This snapshot preserves the reason, the status change, and the timestamp of the response. Snapshots are immutable and cannot be deleted, providing a permanent record for dispute resolution. Both customers and administrators can view these snapshots.

### Seller Approval and Dispute Resolution

Refund requests require seller approval. The seller of the specific order item receives the refund request and can either approve or reject it. The seller reviews the customer's reason and makes a decision.

When the seller responds to a refund request, a snapshot is created that records the decision and the state at that moment. This snapshot becomes part of the permanent audit trail.

If the seller approves the refund, the item status changes to "refunded" and the stock quantity is restored via an inventory record. If the seller rejects the refund, the item remains in "delivered" status and the refund request is closed.

Administrators have oversight authority and can force-refund individual items or entire orders, bypassing the seller approval process when necessary for policy enforcement.

## Snapshot Concept

A Snapshot is an immutable record created whenever editable data is modified to preserve the previous state for dispute resolution. Snapshots record when the change was made, what fields were changed, and the values before and after. Snapshots cannot be deleted and are preserved even when the original data is deleted. Relevant parties including owners and administrators can view snapshots for dispute resolution. Snapshots apply to products, variants, seller profiles, order items, reviews, cancellation requests, and refund requests. This creates a complete audit trail for all data modifications on the platform.

### Snapshot and Audit Trail

The platform maintains an immutable audit trail for all data modifications through snapshots. Whenever editable data is changed, a snapshot is automatically created to preserve the previous state.

**Snapshot Contents**

Each snapshot records:
- The timestamp when the change was made
- Which fields were modified
- The values before the change
- The values after the change

Snapshots apply to products, product variants, seller profiles, order items, reviews, cancellation requests, and refund requests.

**Immutability and Preservation**

Snapshots are immutable and cannot be deleted. They are preserved even when the original data is deleted. For example, when a product is deleted, all its snapshots remain accessible for historical reference.

**Access for Dispute Resolution**

Relevant parties can view snapshots for dispute resolution:
- Owners can view snapshots of their own data (products, variants, reviews, requests)
- Administrators can view snapshots of any data on the platform

**Complete Audit Trail**

This snapshot system creates a complete audit trail for all data modifications on the platform. Every change is permanently recorded with full context, enabling verification of historical states and supporting resolution of disputes regarding product information, order details, or transaction history.

## SellerApproval Concept

A SellerApproval represents the administrative review status of a seller registration request. The approval has a status indicating pending, approved, or rejected state. When rejected, a reason is provided explaining why the seller was not approved. The submission timestamp tracks when the seller registration request was made. Rejected sellers can submit a new registration request after reviewing the rejection reason. Sellers can view their approval status at any time. This process ensures only qualified sellers can list products on the platform.

### Seller Registration Review Process

The platform requires administrative review before a seller can list products. When a seller registers, their account enters a pending approval state. Administrators review the registration request and make an approval decision. Only after approval can the seller create products, manage inventory, and process orders. This ensures all sellers meet platform standards before participating in commerce.

### Approval Status States

A seller's approval status has three possible states: pending, approved, or rejected. Pending indicates the registration is under administrative review. Approved means the seller can begin selling activities. Rejected means the seller was not approved and cannot sell. Sellers can view their current approval status at any time through their account dashboard. The status is visible to the seller but not displayed publicly to customers.

### Rejection Reason and Resubmission

When a seller registration is rejected, the administrator must provide a reason explaining the rejection. The seller can view this rejection reason to understand why approval was denied. After reviewing the reason, the seller may submit a new registration request. The new request goes through the same review process as the original. There is no limit on the number of resubmission attempts.

### Submission Timestamp Tracking

The system records when a seller registration request was submitted. This timestamp is stored for administrative tracking and audit purposes. Sellers can view when they submitted their registration request. Administrators can view submission timestamps when reviewing pending seller approvals. The submission timestamp helps administrators prioritize review queue and track processing times.

## Administrator Concept

An Administrator is a platform manager with oversight capabilities for the shopping mall. There are two grades: regular administrator and super administrator. Regular administrators can approve or reject sellers, manage categories, view products and orders, and manage users. Super administrators have additional powers including promoting or demoting administrators. Super administrators cannot demote themselves to prevent abuse. Administrators can view all products, orders, and user accounts across the platform. This role provides governance and enforcement of platform policies.

### Administrator Role Definition

An administrator is a platform governance role responsible for overseeing the shopping mall platform and enforcing platform policies. Administrators have oversight powers across all platform areas including seller management, category management, product oversight, order oversight, and user management. This role exists to maintain platform integrity, resolve disputes, and ensure compliance with platform rules. Administrators can view all products, orders, and user accounts across the platform. They can take actions to enforce policies when violations occur. The administrator role is separate from customers and sellers, providing neutral platform governance.

### Administrator Grades and Authority

There are two administrator grades with different authority levels. Regular administrators can approve or reject seller registrations, manage product categories, view all products and orders, and manage customer and seller accounts including suspensions and bans. Super administrators have all regular administrator powers plus the ability to promote regular administrators to super administrator status and demote other super administrators to regular administrator status. Super administrators cannot demote themselves to prevent abuse of power and ensure accountability in the promotion/demotion process.

### Administrator Account Management

Administrator accounts can be promoted or demoted between grades. A user (customer or seller) can submit a request to become an administrator by providing a reason. Super administrators review these requests and can approve or reject them. When approved, the user becomes a regular administrator. Super administrators can promote regular administrators to super administrator status. Super administrators can also demote other super administrators to regular administrator status, but cannot demote themselves. These grade changes affect the administrator's authority level and what actions they can perform on the platform.

### Platform Oversight and Policy Enforcement

Administrators exercise platform oversight powers to maintain platform integrity. They can view all products across the platform and delete any product for policy violations. They can view all orders and force-cancel or force-refund individual items or entire orders. They can suspend seller accounts, which hides their products from listings and prevents new product creation while allowing existing order processing. They can ban customer and seller accounts, preventing login access. Administrators can also unsuspend seller accounts to restore their selling privileges. These oversight powers enable policy enforcement and dispute resolution across the platform.

# Domain Relationships

Describe how concepts relate to each other from a business perspective.

## Conceptual Relationships

Describe how concepts relate to each other in business terms.

### Entity Ownership and Associations

Every entity in this platform follows clear ownership and association rules that define how business concepts relate to each other.

**Customer Ownership**
- A customer owns their profile information (display name, phone number)
- A customer owns their shipping addresses (multiple addresses can be stored)
- A customer owns their shopping cart (one active cart at a time)
- A customer owns their wishlist (one wishlist that stores saved products)
- A customer owns their orders (each order is placed by one customer)
- A customer owns their reviews (each review is written by one customer)

**Seller Ownership**
- A seller owns their shop profile (shop name, description, logo)
- A seller owns their products (each product is created by one seller)
- A seller owns their product variants (each variant belongs to one product owned by one seller)
- A seller owns their inventory records (each variant's stock history is managed by the product's seller)
- A seller is associated with order items (each order item references the seller of the purchased variant)

**Product Ownership and Association**
- A product belongs to one seller (the seller who created it)
- A product belongs to one category (can be a category or subcategory)
- A product has many images (multiple images can be uploaded)
- A product has many variants (each variant represents a specific option combination)
- A product has many reviews (customers can review the product after delivery)
- A product has many snapshots (each edit creates a snapshot)

**Category Association**
- A category can have at most one parent category (one level of subcategory nesting)
- A category can have many subcategories (zero or more child categories)
- A category contains many products (products are organized into categories)

**Order and Item Association**
- An order belongs to one customer (the customer who placed it)
- An order has many order items (each item represents a purchased variant)
- An order item belongs to one order
- An order item references one product variant (the specific variant purchased)
- An order item references one seller (the seller of the purchased variant)
- An order has many shipments (items from different sellers ship separately)
- A shipment contains many order items (items from the same seller can be bundled)
- A shipment belongs to one seller (only items from one seller per shipment)

**Review Association**
- A review belongs to one customer (the customer who wrote it)
- A review is associated with one product (the product being reviewed)
- A review is associated with one order (reviews can only be written for purchased items)

**Inventory Association**
- A product variant has many inventory records (all stock changes are recorded)
- An inventory record belongs to one product variant

**Request Association**
- A cancellation request belongs to one order item
- A refund request belongs to one order item
- A cancellation request is associated with one seller (the seller of the order item)
- A refund request is associated with one seller (the seller of the order item)

**Snapshot Association**
- A snapshot is associated with one entity (product, variant, order item, review, cancellation request, refund request, or seller profile)
- A product has many snapshots (all edits are recorded)
- A product variant has many snapshots (all edits are recorded)
- An order item has many snapshots (cancellation and refund request states are recorded)
- A review has many snapshots (all edits are recorded)
- A seller has many snapshots (all profile edits are recorded)

### Belongs-To Relationships

The platform enforces strict belongs-to relationships that define data ownership and access boundaries.

**Customer Belongs-To Relationships**
- A shipping address belongs to one customer (only the owning customer can edit or delete it)
- A cart belongs to one customer (only the owning customer can view or modify it)
- A wishlist belongs to one customer (only the owning customer can view or modify it)
- An order belongs to one customer (only the owning customer can view order details)
- A review belongs to one customer (only the owning customer can edit or delete it)

**Seller Belongs-To Relationships**
- A product belongs to one seller (only the owning seller can edit or delete it)
- A product variant belongs to one product (and therefore to one seller)
- An inventory record belongs to one product variant (managed by the product's seller)
- A product image belongs to one product (managed by the product's seller)
- A snapshot for a product belongs to the product's seller (the seller can view their product snapshots)
- A snapshot for a seller profile belongs to the seller (the seller can view their profile change history)

**Order Item Belongs-To Relationships**
- An order item belongs to one order (cannot exist independently)
- An order item belongs to one product variant (references the purchased variant)
- An order item is associated with one seller (the seller who owns the variant)
- A shipment belongs to one seller (items from only one seller per shipment)

**Request Belongs-To Relationships**
- A cancellation request belongs to one order item (cannot exist independently)
- A refund request belongs to one order item (cannot exist independently)
- A cancellation request is associated with one seller (the seller of the order item must approve or reject)
- A refund request is associated with one seller (the seller of the order item must approve or reject)

**Category Belongs-To Relationships**
- A subcategory belongs to one parent category (one level of nesting only)
- A product belongs to one category (cannot belong to multiple categories simultaneously)

### Has-Many Relationships

The platform supports has-many relationships that allow entities to contain or be associated with multiple related entities.

**Customer Has-Many Relationships**
- A customer has many shipping addresses (multiple addresses can be stored for different delivery locations)
- A customer has many orders (all past purchases are recorded)
- A customer has many reviews (can review multiple products across different orders)
- A customer has many wishlist items (can save multiple products to their wishlist)
- A customer has many cart items (can add multiple variants to their cart)

**Seller Has-Many Relationships**
- A seller has many products (can create and manage multiple product listings)
- A seller has many product variants (each product can have multiple option combinations)
- A seller has many order items (all sales of their products are recorded)
- A seller has many inventory records (all stock changes for their variants are tracked)
- A seller has many snapshots (all profile and product edits are recorded)

**Product Has-Many Relationships**
- A product has many images (multiple images can showcase the product from different angles)
- A product has many variants (different option combinations like size, color, etc.)
- A product has many reviews (all customer feedback is displayed)
- A product has many snapshots (all edits to product information are preserved)
- A product has many wishlist items (can be saved by multiple customers)

**Product Variant Has-Many Relationships**
- A product variant has many inventory records (all stock changes are recorded over time)
- A product variant has many order items (can be purchased multiple times across different orders)
- A product variant has many snapshots (all edits to variant information are preserved)

**Order Has-Many Relationships**
- An order has many order items (can contain products from multiple sellers)
- An order has many shipments (items from different sellers ship separately)

**Category Has-Many Relationships**
- A category has many products (all products in that category are listed)
- A category has many subcategories (can organize products into child categories)

**Shipment Has-Many Relationships**
- A shipment has many order items (multiple items from the same seller can be bundled)

### Ownership Boundaries

The platform defines clear ownership boundaries that determine who can create, modify, and delete each entity.

**Customer-Owned Entities**
- Customer profile: owned by the customer (can edit display name and phone number)
- Shipping addresses: owned by the customer (can add, edit, delete, and set default)
- Shopping cart: owned by the customer (can add, update, and remove items)
- Wishlist: owned by the customer (can add and remove products)
- Orders: owned by the customer (can view order history and details)
- Reviews: owned by the customer (can write, edit, and delete reviews)

**Seller-Owned Entities**
- Seller profile: owned by the seller (can edit shop name, description, and logo)
- Products: owned by the seller (can create, edit, and delete products)
- Product variants: owned by the seller (can add, edit, and delete variants)
- Product images: owned by the seller (can upload, reorder, and delete images)
- Inventory records: owned by the seller (can add stock and record adjustments)
- Product snapshots: owned by the seller (can view their product change history)

**System-Managed Entities**
- Categories: owned by administrators (customers and sellers can only view)
- Order items: owned by the system (created during checkout, status managed by sellers and customers)
- Shipments: owned by the system (created by sellers when shipping, tracked by customers)
- Cancellation requests: owned by the system (initiated by customers, approved by sellers)
- Refund requests: owned by the system (initiated by customers, approved by sellers)
- Snapshots: owned by the system (automatically created, immutable, viewable by relevant parties)
- Seller approvals: owned by administrators (reviewed and decided by administrators)

**Shared Access Entities**
- Products: owned by sellers but viewable by all customers
- Product variants: owned by sellers but viewable by all customers
- Reviews: owned by customers but viewable by all customers
- Order items: owned by the system but accessible to the purchasing customer and the relevant seller
- Shipments: owned by the system but visible to the purchasing customer and the relevant seller

## Lifecycle and Retention

Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.

### Customer Account Lifecycle

Customer accounts progress through registration, active, and deleted states. Customers register with email and password to create an account. Once registered, customers can log in, manage their profile, and use all platform features. Customers may delete their account at any time. When a customer deletes their account, their profile information including display name and phone number is permanently removed. Order history and order records are preserved for seller records and legal purposes. Reviews written by the customer are preserved but displayed as "deleted user" instead of showing the customer's identity. The customer can no longer log in after account deletion.

### Seller Account Lifecycle and Approval

Seller accounts progress through pending, approved, rejected, and deleted states. Sellers register with email and password and their account starts in pending status. An administrator must approve the seller before they can list products or process orders. Sellers can view their approval status at any time. If a seller's registration is rejected, they can view the rejection reason and submit a new registration request. Approved sellers may delete their account only if they have no pending orders in paid or shipped status and no pending cancellation or refund requests. When a seller deletes their account, their products are removed from all listings and cannot be purchased. Order history and order snapshots are preserved. The seller's shop name in past orders is preserved for order records.

### Product Lifecycle and Deletion

Products progress through active and deleted states. Sellers create products that are immediately active and visible in search and category listings. Sellers may edit their products at any time, with each edit creating a snapshot of the previous state. Sellers may delete their products only if there are no pending order items in paid or shipped status for any variant of the product and no pending cancellation or refund requests for any variant. When a product is deleted, all its variants and inventory records are also deleted. Deleted products no longer appear in search results or category listings. Product snapshots are preserved even after the product is deleted, allowing administrators to view the complete history of changes.

### Order and Order Item Lifecycle

Order items have independent status transitions that determine the overall order status. An order item begins in paid status after successful payment. The seller can ship the item, changing its status to shipped. The customer can confirm delivery, changing the status to delivered. If the customer does not confirm delivery, items automatically transition to delivered status fourteen days after shipping. Customers may request cancellation for items in paid status before they are shipped. If the seller approves the cancellation, the item status becomes cancelled. Customers may request refund for items in delivered status within seven days of delivery. If the seller approves the refund, the item status becomes refunded. The overall order status is derived from its items: all items paid means the order is paid, any item shipped means the order is shipped, all items delivered means the order is delivered, all items cancelled means the order is cancelled, all items refunded means the order is refunded, and mixed states result in a partially completed order status.

### Shipment and Delivery Lifecycle

Shipments represent physical packages sent by sellers and have their own delivery lifecycle. A shipment is created when a seller selects one or more order items from the same seller to include in a package. The seller enters tracking information including carrier name and tracking number. All items in the same shipment share the same tracking information and transition to shipped status when the shipment is created. Customers can view tracking information for each shipment. Customers confirm delivery per shipment, which changes all items in that shipment to delivered status. If the customer does not confirm delivery, items automatically change to delivered status fourteen days from the shipping date.

### Review Lifecycle

Reviews progress through active, edited, and deleted states. Customers can write a review for a product only after the purchased item reaches delivered status. Each customer can write one review per product per order. Reviews consist of a rating from one to five stars and optional text content. Reviews are displayed on the product detail page sorted by newest first. Customers may edit their own reviews, with each edit creating a snapshot of the previous review state. Customers may delete their own reviews. When a review is deleted, the snapshot is preserved but the review is no longer included in the product's average rating calculation.

### Snapshot Preservation and Retention

Snapshots are immutable records created whenever editable data is modified. Snapshots apply to products, product variants, seller profiles, order items, reviews, cancellation requests, and refund requests. Each snapshot records when the change was made, what fields were changed, and the values before and after the change. Snapshots cannot be deleted or modified once created. Product snapshots include all product fields and all variant snapshots at that moment. Order item snapshots include the product, variant, and seller profile information at the time of purchase. Snapshot preservation extends beyond entity deletion: product snapshots are preserved even after product deletion, review snapshots are preserved after review deletion, and seller profile snapshots are preserved in order items even after seller account deletion. Relevant parties including owners and administrators can view snapshots for dispute resolution.

### Cancellation and Refund Request Lifecycle

Cancellation and refund requests have their own lifecycle with approval states. Cancellation requests can be submitted for order items in paid status. The request includes a reason and transitions to a pending state. The seller of that item can approve or reject the cancellation request, creating a snapshot of the request state. If approved, the item is cancelled and stock quantities are restored. Refund requests can be submitted for order items in delivered status within seven days of delivery. The request includes a reason and transitions to a pending state. The seller can approve or reject the refund request, creating a snapshot of the request state. If approved, the item is refunded and stock quantities are restored. Both request types preserve their snapshots even after resolution.

# Business Categories and State Flows

Business category classifications and state flow definitions.

## Business Category Definitions

Define all business category classifications with their allowed values and descriptions.

### Order and Item Status Classifications

The platform uses several status classifications to track the lifecycle of business entities.

**Order Item Status**
- Paid: Payment completed, item waiting for seller to ship
- Shipped: Seller has shipped the item
- Delivered: Item has been delivered to the customer
- Cancelled: Item was cancelled before shipment
- Refunded: Item was refunded after delivery

**Order Status** (derived from item statuses)
- Paid: All items in the order are paid
- Shipped: At least one item is shipped (and none delivered yet)
- Delivered: All items in the order are delivered
- Cancelled: All items in the order are cancelled
- Refunded: All items in the order are refunded
- Partially Completed: Items have mixed statuses (e.g., some delivered, some refunded)

**Seller Approval Status**
- Pending: Seller registration submitted, awaiting administrator review
- Approved: Seller account approved, can list products and process orders
- Rejected: Seller registration rejected, can submit new registration request

**Cancellation and Refund Request Status**
- Pending: Request submitted, awaiting seller response
- Approved: Request approved by seller, refund or cancellation processed
- Rejected: Request rejected by seller, item continues normal processing

### Business Category Classifications

The platform defines business categories for different entity types.

**Inventory Change Types**
- Restock: Positive quantity change from seller adding inventory
- Order: Negative quantity change from order placement
- Adjustment: Negative quantity change from inventory correction or loss
- Cancellation: Positive quantity change from cancelled order item
- Refund: Positive quantity change from refunded order item

**Administrator Grades**
- Regular Administrator: Can approve sellers, manage categories, oversee products and orders, manage user accounts
- Super Administrator: Can perform all regular administrator functions, plus promote or demote other administrators

**Product Availability States**
- Available: Product has at least one variant with stock greater than zero
- Unavailable: Product has no variants
- Out of Stock: All variants have zero stock quantity

**Account Status Types**
- Active: Account can log in and use platform features
- Suspended: Account temporarily restricted (seller products hidden, cannot create or edit products)
- Banned: Account permanently blocked from logging in

### Status Type Rules

All status types in the platform follow these rules:

- Status values are predefined and cannot be created or modified by users
- Status transitions follow specific workflows defined in business rules
- Status changes are recorded in snapshots for audit and dispute resolution
- Status values are displayed to users in natural language (e.g., "Paid" not "paid")
- Status queries support filtering by single or multiple allowed values
- Status values are case-insensitive when queried but displayed with proper capitalization

## State Transitions

Define valid state transition paths for stateful concepts.

### Order and Order Item Status Flow

Order items progress through a series of statuses as they move from payment to delivery. Each order item has its own independent status that tracks its fulfillment state.

**Initial State**
When an order item is created after successful payment, it starts in the "paid" status. This indicates payment has been completed and the item is waiting for the seller to ship.

**Shipping Transition**
When the seller ships the item by creating a shipment with tracking information, the item status changes from "paid" to "shipped". All items included in the same shipment share this transition.

**Delivery Transition**
Items in "shipped" status can transition to "delivered" in two ways:
- The customer manually confirms delivery for the shipment containing the item
- The system automatically marks the item as delivered 14 days after the shipment date if no confirmation is received

**Cancellation Transition**
Items in "paid" status (before shipping) can be cancelled. Customers can request cancellation with a reason, and the seller can approve or reject the request. If approved, the item status changes to "cancelled" and stock is restored.

**Refund Transition**
Items in "delivered" status can be refunded. Customers can request a refund within 7 days of delivery with a reason. The seller can approve or reject the request. If approved, the item status changes to "refunded" and stock is restored.

**Order Status Derivation**
The overall order status is determined by the statuses of all its order items:
- All items "paid" → order is "paid"
- Any item "shipped" (and none delivered) → order is "shipped"
- All items "delivered" → order is "delivered"
- All items "cancelled" → order is "cancelled"
- All items "refunded" → order is "refunded"
- Mixed states (e.g., some delivered, some refunded) → order is "partially completed"

### Shipment and Delivery Workflow

Shipments represent physical packages sent by sellers and have their own delivery tracking lifecycle.

**Shipment Creation**
When a seller ships one or more order items, they create a shipment with tracking information (carrier name and tracking number). All items included in the shipment transition to "shipped" status simultaneously.

**Delivery Confirmation**
Customers can confirm delivery for each shipment. When delivery is confirmed, all items in that shipment transition to "delivered" status.

**Automatic Delivery**
If the customer does not confirm delivery, the system automatically marks all items in the shipment as "delivered" after 14 days from the shipping date.

**Tracking Visibility**
Customers can view tracking information for each shipment throughout the shipping process. The tracking information remains accessible in the order history even after delivery.

### Seller Account Status Transitions

Seller accounts have multiple status states that control their ability to operate on the platform.

**Registration States**
When a seller registers, their account starts in "pending" status while awaiting administrator approval. Administrators can approve or reject the registration. If approved, the status becomes "approved" and the seller can create products and process orders. If rejected, the status becomes "rejected" and the rejection reason is recorded. Rejected sellers can submit a new registration request.

**Active States**
Approved sellers are in "active" status and can perform all seller operations including creating products, editing products, managing inventory, and processing orders.

**Suspension State**
Administrators can suspend seller accounts. When suspended:
- Products are hidden from search and category listings
- Products cannot be purchased
- The seller can still process existing orders (ship items, respond to cancellation and refund requests)
- The seller cannot create new products or edit existing products
Administrators can unsuspend accounts, restoring product visibility and seller capabilities.

**Ban State**
Administrators can ban seller accounts. Banned sellers cannot log in to the platform. Existing orders remain accessible for fulfillment purposes.

**Account Deletion**
Sellers can delete their accounts only if they have no pending orders (paid or shipped status) and no pending cancellation or refund requests. When deleted, products are removed from listings but order history is preserved.

### Cancellation and Refund Request Workflows

Cancellation and refund requests follow approval workflows with defined state transitions.

**Cancellation Request Flow**
- Customers can request cancellation for order items with "paid" status (not yet shipped)
- The request includes a reason and starts in "pending" status
- The seller of that item can approve or reject the request
- When the seller responds, a snapshot of the request state is created
- If approved, the order item status changes to "cancelled" and stock is restored
- If rejected, the request remains in a completed state and the order item continues processing

**Refund Request Flow**
- Customers can request refunds for order items with "delivered" status
- Requests must be made within 7 days of the item being delivered
- The request includes a reason and starts in "pending" status
- The seller of that item can approve or reject the request
- When the seller responds, a snapshot of the request state is created
- If approved, the order item status changes to "refunded" and stock is restored
- If rejected, the request remains in a completed state

**Partial Order Processing**
Cancellation and refund requests are handled per order item, not per entire order. When an item is cancelled or refunded, the remaining items in the order continue processing normally. The overall order status updates based on the combined states of all items.

### Product and Variant Availability Status

Product availability status is determined by inventory levels and product lifecycle state.

**Stock-Based Availability**
- When stock quantity is greater than zero, variants are shown as "in stock" and can be added to cart
- When stock quantity reaches zero, variants are shown as "out of stock" and cannot be added to cart
- Stock quantity is calculated from inventory history records (sum of all quantity changes)
- Restocking creates a positive inventory record and makes variants available again
- Order placement creates a negative inventory record and may make variants out of stock

**Product Deletion State**
- When a seller deletes a product, it no longer appears in search or category listings
- Products can only be deleted if there are no pending order items (paid or shipped status) for any variant
- Products can only be deleted if there are no pending cancellation or refund requests for any variant
- Deleted products are automatically removed from all customer wishlists
- Product snapshots are preserved even after product deletion for dispute resolution

**Variant Deletion State**
- Variants can only be deleted if there are no pending order items for that variant
- Variants can only be deleted if there are no pending cancellation or refund requests for that variant
- When deleted, inventory records for that variant are also removed

**Product Without Variants**
- Products must have at least one variant to be purchasable
- Products with no variants are visible in search but shown as "unavailable"

### Customer Account Lifecycle States

Customer accounts have lifecycle states that control platform access and data retention.

**Registration and Login**
- Customers register with email and password, starting in "active" status
- Active customers can log in and access all platform features
- Banned customers cannot log in to the platform

**Ban State**
- Administrators can ban customer accounts
- Banned customers cannot log in but their historical data (orders, reviews) is preserved
- Administrators can unban customers, restoring access

**Deletion State**
- Customers can delete their own accounts at any time
- When deleted:
  - Profile information is deleted
  - Orders and order history are preserved for seller records and legal purposes
  - Reviews are preserved but shown as "deleted user"
  - The account cannot be recovered

**Review Status**
- Reviews start in "active" status when created
- Customers can edit their own reviews (creates a snapshot)
- Customers can delete their own reviews (but snapshots are preserved)
- Deleted reviews are not included in average rating calculations

### Administrator Grade Transitions

Administrator accounts have grade-based status that determines their authority level.

**Administrator Request Flow**
- Any user (customer or seller) can submit a request to become an administrator
- The request includes a reason and is reviewed by super administrators
- Super administrators can approve or reject the request
- When approved, the user becomes a regular administrator

**Administrator Grades**
- Regular administrators can approve/reject seller registrations, manage categories, view products/orders, and manage users
- Super administrators have all regular administrator capabilities plus:
  - Can promote regular administrators to super administrator
  - Can demote other super administrators to regular administrator
  - Cannot demote themselves

**Grade Transition**
- Regular administrators can be promoted to super administrator by existing super administrators
- Super administrators can be demoted to regular administrator by other super administrators
- Grade changes take effect immediately