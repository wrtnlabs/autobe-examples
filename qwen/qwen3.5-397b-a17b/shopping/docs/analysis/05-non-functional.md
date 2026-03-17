**shoppingMall — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Customers own their personal profile information including display name and phone number. Customers own their shipping addresses, wishlist, shopping cart contents, and order history. Customers own the reviews they write for products they have purchased.

Sellers own their shop profile including shop name, shop description, and logo image. Sellers own the products they create, including all product variants and inventory records for those variants. Sellers own the order items associated with their products that they must fulfill.

The platform owns category definitions and the administrator system data. All snapshots created under the snapshot principle are owned by the platform for dispute resolution and audit purposes, though relevant parties (data owners and administrators) can view snapshots of their own data.

When a customer deletes their account, their profile information is deleted but their orders and order history are preserved for seller records and legal purposes. Their reviews are preserved but shown as "deleted user".

When a seller deletes their account, their products are deleted from listings but order history and snapshots are preserved. Their shop name in past orders is preserved for customer records.

### Data Isolation

Customer data is isolated so that each customer can only view and modify their own profile, addresses, wishlist, shopping cart, and order history. Customers cannot access other customers' personal information or order data.

Seller data is isolated so that each seller can only view and modify their own shop profile, products, variants, and inventory records. Sellers can only view order items for products they sell, not order items from other sellers.

Order items are visible to both the customer who placed the order and the seller who must fulfill them. The customer sees all items in their order. Each seller sees only the items for their own products within that order.

Administrators can view all data across the platform for oversight purposes, including all customer accounts, seller accounts, products, and orders. Super administrators have the same data visibility as regular administrators.

Product listings and reviews are publicly visible to all authenticated users. Search results and category pages show products from all sellers without revealing seller private data beyond the shop name.

### Access Control

Customers can access their own profile data, addresses, wishlist, cart, and orders. Customers can access public product listings, product details, seller shop profiles, and reviews written by other customers.

Sellers can access their own shop profile, products, variants, and inventory records. Sellers can access order items for their products to fulfill shipments and respond to cancellation or refund requests. Sellers can view customer shipping information (recipient name, phone number, address) only for orders containing their products.

Administrators can access all user data, product data, order data, and snapshot data for platform management. Administrators can view seller approval requests and respond to them. Administrators can view administrator promotion requests if they are super administrators.

Customers cannot access seller inventory records, other customers' personal data, or platform administrator functions. Sellers cannot access other sellers' products, inventory, or order items. Regular administrators cannot access super administrator functions such as promoting or demoting administrators.

Banned customers and banned sellers cannot log in to access any platform features. Suspended sellers cannot create or edit products but can still access order items for fulfillment.

### Privacy Boundaries

Customer personal information including phone numbers and shipping addresses is only shared with sellers when an order containing that seller's products is placed. This information is used solely for order fulfillment and shipping purposes.

Seller contact information is not exposed to customers beyond the shop name and shop description displayed in the shop profile. Direct contact details are not shared through the platform.

Payment information is processed through an external payment gateway and is not stored by the platform. The platform only retains order records showing payment success or failure.

When a customer deletes their account, their profile information is removed but order records are preserved with the customer's name shown as "deleted user" in reviews. This preserves seller records while protecting customer privacy.

When a seller deletes their account, their shop profile is removed but past order records preserve the shop name at the time of purchase through snapshots. This ensures customers can reference their purchase history.

Snapshots preserve historical data states for dispute resolution but are only accessible to data owners and administrators. Snapshots are immutable and cannot be deleted by any party.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-Delete Behavior

When a customer deletes their account, their profile information is removed from the system. However, their orders and order history are preserved to maintain seller records and legal compliance. Their reviews remain visible but are displayed as authored by a "deleted user" instead of their display name.

When a seller deletes their account, their products are removed from all listings and search results. However, order history and product snapshots associated with past orders are preserved. The shop name appearing in historical orders remains unchanged.

When a product is deleted by a seller, it no longer appears in search results or category listings. The product is automatically removed from all customer wishlists. However, all product snapshots created during the product's lifetime are preserved.

When a review is deleted by its author, the review content is no longer displayed on the product page. However, the review snapshots created during editing are preserved for dispute resolution purposes.

Soft-deleted data remains in the system but is marked as inactive and hidden from normal user interfaces. Only administrators can access soft-deleted records through administrative interfaces.

### Data Retention Policy

All snapshots are immutable and cannot be deleted once created. This includes product snapshots, product variant snapshots, seller profile snapshots, review snapshots, cancellation request snapshots, and refund request snapshots.

Order records and order items are retained indefinitely, even after the customer or seller who created them deletes their account. This ensures transaction history remains available for legal, tax, and dispute resolution purposes.

Inventory history records are retained for the lifetime of the product variant. When a variant is deleted, its inventory history is preserved as part of the historical record.

Snapshot records include the timestamp of when the change was made, what fields were changed, and the values before and after the modification. This information is used for audit trails and dispute resolution.

Administrators can view snapshots of any product and any seller profile. Sellers can view snapshots of their own products. Customers can view snapshots of their own reviews and cancellation or refund requests they have submitted.

### Permanent Deletion

Customer profile information, including display name and phone number, is permanently deleted when a customer requests account deletion. This deletion occurs after all active orders are completed or cancelled.

Seller profile information, including shop name, shop description, and logo image, is permanently deleted when a seller requests account deletion and meets the deletion criteria (no pending orders, no pending cancellation or refund requests).

Product images are permanently deleted when the product is deleted or when a seller removes an image from a product. The image files are removed from storage.

Shopping cart contents are permanently deleted when a customer removes items from their cart or when the customer deletes their account.

Wishlist entries are permanently deleted when a customer removes products from their wishlist, when the product is deleted by the seller, or when the customer deletes their account.

Address records are permanently deleted when a customer removes an address from their profile or when the customer deletes their account.

Administrator ban actions result in permanent loss of login access. Banned customers and sellers cannot log in to the platform, though their historical data remains preserved according to the retention policy.

### Data Recovery Limitations

The platform does not provide user-initiated data recovery for deleted content. Once a customer or seller permanently deletes data (such as reviews, products, or account information), it cannot be recovered through the user interface.

Snapshots serve as the primary mechanism for viewing historical states of data. Users can view snapshots to see what data looked like at previous points in time, but cannot restore data to a previous snapshot state.

Administrators have oversight capabilities to view all platform data including soft-deleted records, but do not have the ability to restore permanently deleted user content such as reviews or account profiles.

Order-related data cannot be deleted or recovered by users once created. Order records, order items, and associated snapshots remain in the system indefinitely and cannot be modified or removed by customers or sellers.

Inventory history records cannot be deleted or modified once created. All stock changes are permanently recorded with their reason and timestamp.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Image Storage

Sellers can upload multiple images for each product. The first image serves as the main thumbnail displayed in product listings. Product images are stored as part of the product record and are included in product snapshots when changes are made.

Sellers can upload a logo image for their shop profile. The logo image is stored as part of the seller profile and is included in seller profile snapshots when changes are made.

Images can be reordered by the seller. When images are reordered, a new product snapshot is created to preserve the previous image order.

Sellers can delete images from their products. When an image is deleted, a product snapshot is created to preserve the previous state including the deleted image.

All uploaded images are preserved in snapshots even after the original image is modified or deleted, ensuring complete historical records for dispute resolution.

### Storage Ownership

Product images are owned by the seller who uploaded them. When a seller deletes their account, their product images are deleted from active listings.

Seller logo images are owned by the seller. When a seller deletes their account, their logo image is removed from active display but preserved in order history snapshots where it appeared at the time of purchase.

Image snapshots are immutable and cannot be deleted by any party, including the seller who uploaded them or administrators. This ensures complete audit trails for all image changes throughout the product lifecycle.

# External Dependency SLOs

Service level objectives for external dependency availability.

## External Dependency SLOs

Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.

### Payment Gateway Dependency

The platform integrates with an external payment gateway service to process customer payments during checkout.

The payment gateway is an external third-party service that the platform depends on for order completion.

Payment processing requires the payment gateway to be available and responsive.

If the payment gateway is unavailable, payment processing cannot proceed.

### Payment Timeout Handling

Payment requests to the external gateway have a timeout threshold.

If a payment request exceeds the timeout threshold, the request is treated as failed.

When a payment request times out, the order is not created.

Customers are notified of the payment failure and can retry the payment.

### Payment Failure and Retry

If payment processing fails for any reason, the order is not created.

Customers can retry the payment after a failure.

Retry attempts use the same cart and order details.

Customers can retry payment multiple times until payment succeeds or they abandon the checkout.

### External Service Availability

The platform depends on the external payment gateway being available for order placement.

When the payment gateway is unavailable, customers cannot complete checkout.

The platform does not create orders without successful payment confirmation from the gateway.

Platform functionality other than checkout remains available when the payment gateway is unavailable.