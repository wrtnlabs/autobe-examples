**ecommercePlatform — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership Definitions

Customer profile information, including display name and phone number, is owned by the customer.
Shipping addresses are owned by the customer who created them.
Wishlist entries are owned by the customer who added them.
Shopping cart contents are owned by the customer.
Seller shop information, including shop name, description, and logo, is owned by the seller who registered.
Products are owned by the seller who created them.
Product variants and their associated images are owned by the seller who created them.
Inventory records are owned by the seller whose product variants they track.
Orders are jointly owned: customers own their purchase order history and details, while individual sellers own the fulfillment and tracking records for the specific items they provide.
Reviews are owned by the customer who wrote them.
Shipment records are owned by the seller who created the shipment.
Snapshots are immutable platform records, accessible to the relevant data owners and administrators for dispute resolution.

### Access Control Boundaries

Customers can view their own profile information.
Customers can edit their own display name and phone number.
Customers can view, add, edit, and delete their own shipping addresses.
Customers can set their own shipping addresses as default.
Customers can view and manage their own wishlist, including adding and removing products.
Customers can view and manage their own shopping cart, including adding specific variants, modifying quantities, and removing items.
Customers can view their own order history and full order details.
Customers can view tracking information for shipments associated with their own orders.
Sellers can view and edit their own shop profile, including shop name, description, and logo.
Sellers can create, edit, and manage their own products, variants, and associated images.
Sellers can view and manage inventory for their own product variants, including restocking and adjustment logs.
Sellers can view order items for products they own and process their fulfillment.
Sellers can create shipments and update tracking information for their own order items.
Sellers can view their own seller approval status and any rejection reasons.
Administrators can view all customer account information, profiles, and order histories.
Administrators can view all seller account information, profiles, products, inventory, and active orders.
Super administrators can view and manage other administrator accounts.
Regular administrators cannot view private details of other regular administrators beyond standard platform oversight.

### Cross-User Privacy Rules

Customers can view all categories and products listed by any seller for purchase purposes.
Customers can view public seller shop information, including shop name, description, and logo.
Customers can view reviews written by other customers on product detail pages.
Customers cannot view other customers' profile information, phone numbers, or display names.
Customers cannot view other customers' shipping addresses.
Customers cannot view other customers' wishlists, shopping carts, or private order details.
Sellers cannot view other sellers' shop information, internal product catalogs, or inventory records.
Sellers cannot view order details for products they did not sell.
Sellers can only view the shipping details for the specific items they are fulfilling, not the private profiles of the buying customers.
Order shipping addresses are visible only to the ordering customer and the specific relevant seller who ships the item.
Review text content and ratings are publicly visible to all users on product detail pages.
If a customer account is deleted, their identity in public reviews is shown as an anonymized 'deleted user' reference.

### Structural Data Isolation

Each seller's product catalog is strictly isolated and not accessible through the internal management interface of other sellers.
Each seller's inventory records and stock adjustments are completely isolated from other sellers' inventory systems.
Each customer's shopping cart is isolated and exclusively accessible only to the customer.
Each customer's wishlist is isolated and exclusively accessible only to the customer.
Each customer's order history and private purchase details are strictly isolated from other customers' records.
Even when multiple items from different sellers are purchased in a single consolidated order, each seller's fulfillment tracking, shipment creation, and processing statuses remain isolated within that order.
Deleted products and deleted seller accounts preserve their historical data in snapshots, but are isolated from active public search and category listings.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-Delete Behavior

When a customer deletes their account, their profile information is removed from the system while their order history and reviews remain. Preserved reviews appear on product pages attributed to "deleted user".

When a seller deletes their account, their products are removed from search results and category listings. Order history and associated snapshots remain intact. The seller's shop name is preserved in past order records.

When a product is deleted by a seller or administrator, it is removed from search results and category listings. The deleted product is automatically removed from all customer wishlists. Historical snapshots of the product remain accessible.

When a customer deletes their review, it is removed from the product detail page and excluded from average rating calculations. Historical snapshots of the review remain in the system.

WHEN a customer deletes their account, THE system SHALL remove their profile information while preserving their order history and reviews as authored by "deleted user".

WHEN a seller deletes their account, THE system SHALL remove their products from search results and category listings while preserving order history, snapshots, and shop name references in past orders.

WHEN a product is deleted, THE system SHALL remove it from search results, category listings, and customer wishlists while preserving all historical product and variant snapshots.

WHEN a review is deleted, THE system SHALL remove it from the product detail page and exclude it from average rating calculations while preserving the review snapshot.

### Data Retention Policy

Order records including order items, shipments, and associated snapshots are retained indefinitely for seller records and legal purposes. This retention applies regardless of order status or the deletion status of the customer or seller account.

Snapshots are retained indefinitely and cannot be deleted by any user, including customers, sellers, or administrators. Snapshots track changes to products, product variants, seller profiles, order items, reviews, cancellation requests, and refund requests.

Inventory history records are retained as part of the permanent transaction record. Inventory records created through order placement, cancellation, or refund remain in the system indefinitely.

WHEN orders are created, THE system SHALL retain the complete order record, order items, shipments, and associated snapshots indefinitely.

WHEN snapshots are created for any entity, THE system SHALL retain those snapshots permanently and prevent deletion by all user roles.

WHEN inventory changes occur through orders, cancellations, or refunds, THE system SHALL retain the inventory history records indefinitely.

### Data Recovery Policy

There is no self-service mechanism for customers or sellers to restore their accounts after deletion. Account deletion is final.

There is no self-service mechanism for sellers to restore deleted products. Product deletion is final.

There is no self-service mechanism for customers to restore deleted reviews. Review deletion is final.

Sellers whose registration was rejected may submit a new seller registration request in place of the rejected request.

Administrators can unban customers, restoring their ability to log in and use the platform.

Administrators can unban sellers, restoring their ability to log in.

Administrators can unsuspend sellers, restoring their products to search results and category listings and re-enabling product creation and editing.

Administrators and relevant original parties can access historical data for deleted or modified entities through the immutable snapshot records.

WHEN account deletion is completed for a customer or seller, THE system SHALL prevent any self-service restoration.

WHEN a seller is rejected, THE system SHALL allow them to submit a new registration request.

WHEN a customer or seller is banned, THE system SHALL allow administrators to unban them and restore login access.

WHEN a seller is suspended, THE system SHALL allow administrators to unsuspend them and restore product visibility.

### Permanent Deletion Scope

When a customer deletes their account, their customer profile information including display name and phone number is permanently deleted. Authentication credentials are permanently deleted.

When a seller deletes their account, their authentication credentials are permanently deleted. Unpublished product data (products with no associated orders) is permanently deleted.

When a product is deleted, the product record and all its variant records including associated inventory records are permanently deleted.

Customer order records and associated data are not permanently deleted when a customer account is deleted. These records are retained indefinitely per the retention policy.

Seller order records and shop name references within past orders are not permanently deleted when a seller account is deleted. These records are retained indefinitely per the retention policy.

Snapshots are never permanently deleted regardless of the state of their associated entities.

WHEN a customer account is deleted, THE system SHALL permanently delete only the customer profile information and authentication credentials.

WHEN a seller account is deleted, THE system SHALL permanently delete authentication credentials and unpublished product data while preserving all order-related records.

WHEN a product is deleted, THE system SHALL permanently delete the product record, all variant records, and associated inventory records.

THE system SHALL NEVER permanently delete snapshots associated with any entity.

# External Dependency SLOs

Service level objectives for external dependency availability.

## External Dependency SLOs

Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.

### External Availability

THE ecommerce platform SHALL rely on an external payment gateway as the authoritative source for all payment transaction confirmations.

The system SHALL NOT process any order creation, inventory deduction, or cart clearing without a confirmed successful response from the external payment gateway.

THE ecommerce platform SHALL accept payment success or failure status from the external payment gateway as the definitive outcome for all financial transactions.

The external payment gateway is the sole dependency required for order placement operations.

### Timeout Handling

WHEN the external payment gateway does not respond to a payment request, THE system SHALL treat the transaction as failed.

IF a payment request does not receive a response from the external payment gateway, THE system SHALL NOT create an order record, SHALL NOT decrease product stock quantities, and SHALL allow the customer to retry the payment process.

The system SHALL treat any non-responsive or unresponsive external payment gateway interaction as a payment failure.

### Service Degradation

WHILE the external payment gateway is unavailable or unable to process transactions, THE system SHALL present a failure state to customers attempting checkout.

IF the external payment gateway is experiencing service degradation or partial unavailability, THE system SHALL halt the checkout process and SHALL not generate new orders until successful confirmation is received from the external service.

The system SHALL allow customers to retry checkout operations during periods of external payment gateway unavailability.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Image and Media Capacity

The system maintains sufficient storage capacity to accommodate all product images and seller profile logos. Capacity planning ensures that the platform can handle the continuous upload of new visual assets by sellers without interruption. As the product catalog grows with more listings and profile updates, the underlying storage capacity scales to meet the increasing volume of media content stored on the platform.

### Snapshot Record Capacity

The system provides adequate storage capacity for immutable data snapshots created whenever products, variants, seller profiles, orders, and reviews are modified or deleted. Capacity requirements account for the permanent preservation of these historical records, which are essential for dispute resolution and maintaining complete audit trails. The storage capacity expands to retain all snapshot history indefinitely as overall platform activity increases.

### Content Delivery Network

The system employs a content delivery network (CDN) to efficiently distribute all visual content, including product thumbnails on search and category pages, full product images on detail pages, and seller profile logos. The CDN ensures reliable availability and global image distribution, even for historical snapshots of deleted products and sellers. The CDN infrastructure scales to support the growing volume of media traffic as the customer and seller bases expand.