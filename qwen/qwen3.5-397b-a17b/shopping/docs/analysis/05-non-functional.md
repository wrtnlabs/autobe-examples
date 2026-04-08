**shoppingMall — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Customers own their personal profile information, including display name and phone number.
Customers own their shipping addresses and can manage them independently.
Customers own their order history and can view all their past orders.
Customers own their wishlist and can add or remove products freely.
Customers own their reviews and can edit or delete them.

Sellers own their shop profile, including shop name, description, and logo.
Sellers own the products they create and can manage them.
Sellers own their order items and can process shipping, cancellation, and refund requests for their products.

Administrators own the platform oversight capabilities and can view all data for management purposes.
Administrators own category management and can create, edit, or delete categories.

### Data Isolation

Customers cannot access other customers' personal information, addresses, orders, or wishlists.
Customers cannot access other customers' reviews during creation, but can view all published reviews on product pages.

Sellers cannot access other sellers' products, shop profiles, or order items.
Sellers can only view and manage order items for products they own.
Sellers can view customer shipping addresses only for orders containing their products.

Administrators can access all data across the platform for oversight and management purposes.
Super administrators can access all administrator management functions in addition to regular administrator capabilities.

### Privacy Boundaries

Customer personal information (display name, phone number, email) is private and not visible to other customers or sellers.
Customer shipping addresses are private and only visible to sellers for orders containing their products.
Customer order history is private and only visible to the customer and relevant sellers.

Seller shop name, shop description, and logo are public and visible to all customers.
Product information (name, description, images, price, category) is public and visible to all customers.
Reviews are public and visible on product detail pages to all customers.

When a customer deletes their account, their profile information is deleted but their reviews are preserved and shown as "deleted user".
When a seller deletes their account, their shop name in past orders is preserved for customer records.

Seller approval status (pending, approved, rejected) is private to the seller and administrators.
Rejection reasons for seller registrations are private to the seller and administrators.

Inventory quantities are not displayed as exact numbers to customers, only stock status (in stock or out of stock).

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-Delete

When a customer deletes their account, their profile information is removed from active view but their order history remains preserved. Reviews from deleted customer accounts remain visible on product pages with the label "deleted user" instead of the customer's display name.

When a seller deletes their account, their products are removed from listings but order history is preserved. The shop name associated with past orders remains visible to customers who purchased from that seller.

When a product is deleted by a seller, the product no longer appears in search results or category listings. The product data remains accessible through historical snapshots preserved with order items.

When a review is deleted by a customer, the review content is removed from the product detail page but review snapshots remain preserved. The product's average rating is recalculated excluding the deleted review.

When a variant is deleted, it is removed from the product's available options and cannot be added to cart or purchased. Variant snapshots created before deletion remain accessible through order item records.

Deleted products are automatically removed from all customer wishlists.

### Retention

Snapshots are immutable records that cannot be deleted. All snapshots created for products, product variants, seller profiles, order items, reviews, cancellation requests, and refund requests are retained indefinitely.

Order records are retained even after the associated customer or seller account is deleted. This ensures order history remains available for legal and business record purposes.

Order item snapshots preserve the product name, description, variant options, price, and seller shop name at the time of purchase. These snapshots remain accessible even if the original product or seller account is later deleted.

Inventory history records are retained for each variant to maintain a complete record of stock changes. Inventory records are preserved even after a variant or product is deleted.

Cancellation request and refund request snapshots are retained to preserve the history of request status changes and reasons provided.

Refund requests can be submitted within 7 days of an item being delivered. This 7-day window is calculated from the delivery date of each individual order item.

Items automatically change to delivered status 14 days after shipping if the customer does not confirm delivery. This 14-day period is calculated from the shipment date.

### Recovery

Deleted customer accounts cannot be recovered. Once a customer deletes their account, the profile information including display name and phone number is permanently removed. Customers must register a new account to use the platform again.

Deleted seller accounts cannot be recovered. Once a seller deletes their account, they must create a new seller registration to sell on the platform again.

Deleted products cannot be recovered by sellers. Once a product is deleted, sellers must create a new product to list the item again.

Deleted variants cannot be recovered. Sellers must create a new variant if they need to offer the option combination again.

Deleted reviews cannot be recovered by customers. Once a review is deleted, customers must write a new review if they wish to provide feedback again.

Deleted addresses cannot be recovered. Customers must add a new address if they need the shipping information again.

Snapshot data cannot be modified or deleted, ensuring historical records remain available for dispute resolution and reference. Relevant parties (owners and administrators) can view snapshots to verify past states.

### Permanent-Deletion

Customer profile information including display name and phone number is permanently deleted when a customer deletes their account. Associated addresses and wishlist items are also permanently deleted.

Seller profile information including shop name, shop description, and logo image is permanently deleted when a seller deletes their account and meets the deletion conditions.

Product data including name, description, images, and base price is permanently deleted from active listings when a seller deletes a product. The product data remains accessible only through historical snapshots.

Product variant data including SKU code, option values, price, and stock quantity is permanently deleted when a variant is deleted or when its parent product is deleted.

Cart items are removed when a product or variant is deleted. If a product in a customer's wishlist is deleted by the seller, the wishlist item is automatically removed.

Inventory records remain preserved even after variant deletion to maintain historical stock change records.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Image Storage

The platform stores product images uploaded by sellers for product listings.

Sellers can upload multiple images for each product. The first image serves as the main thumbnail image displayed in product listings.

The platform stores seller logo images as part of seller profiles.

All images are preserved according to the snapshot principle. When product images are modified or deleted, previous versions remain preserved in product snapshots for dispute resolution and historical records.

When a product is deleted, its images are removed from active product listings but remain preserved in product snapshots.

When a seller account is deleted, the seller logo is removed from active shop profiles but remains preserved in order item snapshots and seller profile snapshots for historical order records.