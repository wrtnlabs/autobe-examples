**ecommerceMall — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Each user owns the data they create on the platform.

Customers own their personal information, including profile data, addresses, wishlist items, orders placed, and reviews written. When a customer deletes their account, their personal profile information is deleted, but their order history and reviews are preserved for legal and dispute resolution purposes.

Sellers own their shop profile, product listings, and product variant data. When a seller deletes their account, their products are removed from public listings, but order history and snapshots are preserved.

Administrators and super administrators have management access to platform data but do not own it. They can view and modify data only for the purpose of platform operation, dispute resolution, and policy enforcement.

### Customer Data Access Control

Customers can only access and modify their own data.

A customer can view and edit their profile information, addresses, wishlist, and orders placed under their account.

A customer cannot view another customer's orders, addresses, wishlist, or profile information unless explicitly shared (e.g., shipping address visible to the seller for order fulfillment).

Customers can view public seller profiles and product information from all sellers on the platform.

Order details, including the list of items purchased, are only visible to the customer who placed the order and the seller(s) who fulfilled the order items.

### Seller Data Access Control

Sellers can only access data related to their own shop and products.

A seller can view and manage their own products, variants, and inventory records.

A seller can view order items for products they have created, including customer shipping information needed for fulfillment.

A seller cannot view order details for products they did not create, nor can they access customer data unrelated to their order items.

Sellers cannot view other sellers' shop profiles, products, or order data.

When a seller's account is suspended by an administrator, they retain access to existing order items for processing and fulfillment but lose the ability to create new products or edit existing products.

### Administrator Access

Administrators and super administrators have oversight access to platform data for management and enforcement purposes.

Regular administrators can view all customer accounts, seller accounts, products, orders, and categories on the platform.

Administrators can view seller approval requests and make approval or rejection decisions.

Administrators can suspend or unsuspend seller accounts, which affects product visibility but allows existing order processing.

Administrators can view snapshots of any product, order item, review, or request for dispute resolution.

Administrators can view all reviews and product ratings to identify policy violations.

Super administrators have all regular administrator permissions plus the ability to manage administrator accounts, including promoting and demoting between administrator grades.

### Privacy Boundaries

Personal information is private and shared only on a need-to-know basis.

Customer shipping addresses are shared with the seller(s) who need to fulfill the order but are not visible to other customers.

Customer order totals, item details, and purchase history are private and visible only to the customer and the relevant seller(s).

Seller shop profiles, including shop name, description, and logo, are public and visible to all customers browsing the platform.

Customer reviews, once published, appear on the product detail page with the reviewer's display name (or "deleted user" if the review was written by a deleted account) but do not reveal personal contact information.

Seller approval status and rejection reasons are visible only to the seller and administrators.

### Data Isolation

Platform data is logically isolated between different user types to prevent unauthorized access.

Customer accounts are isolated from each other. Data accessed through one customer account is not visible through another customer account.

Seller accounts are isolated from each other. One seller cannot access another seller's products, orders, or inventory data.

Administrators operate in an elevated access context but customer and seller data remain isolated from administrator operations.

Snapshots are immutable records that preserve historical data states. Once created, snapshots cannot be modified or deleted. Only the snapshot owner (user who created the original data) and administrators can view snapshots relevant to their context.

When a user account is deleted, banned, or suspended, their access to platform features is restricted or revoked, but their historical data and snapshots remain accessible to relevant parties for dispute resolution and compliance purposes.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Deletion and Account Closure

### Customer Account Deletion

When a customer requests account deletion, their profile information is removed from the system. However, their order history and order records are preserved for legal and business record-keeping purposes. Their reviews are preserved but displayed with the label "deleted user" to indicate the original author is no longer an active account holder.

### Seller Account Deletion

A seller may request account deletion only if they have no pending orders in paid or shipped status. They may also not have any pending cancellation or refund requests. If these conditions are met, their account can be deleted. When deleted, their active products are removed from listings, but order history and order snapshots are preserved. The seller's shop name in past orders is preserved as it appeared at the time of purchase.

### Product Deletion

Sellers may request deletion of their products only when there are no pending order items in paid or shipped status for any variant of the product. There must also be no pending cancellation or refund requests for any variant. When a product is deleted, all associated variants and inventory records are removed. However, all snapshots of the product and its variants are preserved. Deleted products no longer appear in customer-facing search or category listings.

### Review Deletion

Customers may delete their own reviews at any time. When a review is deleted, it is removed from the product detail page but a snapshot of the review content and rating is preserved for dispute resolution purposes. Deleted reviews are excluded from average rating calculations.

### Seller Suspension

Administrators may suspend a seller's account. When suspended, the seller's products are hidden from all customer-facing search and category listings. Suspended sellers cannot create new products or edit existing products. However, they may still fulfill existing orders by shipping items and responding to cancellation and refund requests.

### Data Retention Policy

### Customer Data Retention

Customer profile data is retained while the account remains active. When a customer deletes their account, the profile data is removed but order data is retained indefinitely for legal and business purposes. Order data includes order items, order history, and associated snapshots.

### Seller Data Retention

Seller profile data is retained while the account remains active. When a seller deletes their account or is suspended, the profile data is removed or hidden respectively. However, all order data associated with the seller's products is retained indefinitely. This includes order items, shipments, and all snapshots of products and seller profiles as they existed at the time of purchase.

### Product Data Retention

Product data is retained indefinitely through the snapshot system. Even after a product is deleted by the seller, all snapshots are preserved. These snapshots contain the complete state of the product including name, description, category, base price, images, variants, and option values at the time each modification was made.

### Order and Transaction Data Retention

All order data including order items, shipments, tracking information, cancellation requests, and refund requests is retained indefinitely. This data includes snapshots of all product and seller information as it existed at the time of purchase to preserve the complete transaction record for dispute resolution and legal compliance.

### Review Data Retention

Review data including ratings and text content is retained indefinitely through the snapshot system. When a customer deletes a review, the content is removed from public view but the snapshot is preserved. Deleted reviews are excluded from average rating calculations but remain accessible to administrators and the original author for dispute resolution.

### Inventory History Retention

Inventory history records for each product variant are retained indefinitely. These records track all quantity changes including restocking, orders, cancellations, refunds, and adjustments. The complete history allows reconstruction of stock levels at any point in time.

### Snapshot Recovery and Historical Access

### Snapshot Creation

Snapshots are automatically created whenever editable data is modified. This includes product edits, variant edits, seller profile edits, review edits, cancellation request responses, and refund request responses. Each snapshot records when the change was made, what was changed, and the values before and after the change.

### Snapshot Structure for Products

When a product is edited, a product snapshot is created that includes all product fields including name, description, category, base price, and images. The snapshot also includes snapshots of all variants at that moment, preserving the complete state of the product and its variants.

### Snapshot Structure for Order Items

When an order is placed, snapshots are created for each order item. These snapshots preserve the product name, description, variant options, and price at the time of purchase. A snapshot of the seller's profile is also saved with the order item, preserving the shop name and logo as they existed at the time of purchase.

### Snapshot Access Permissions

Users can view snapshots of their own data: customers can view snapshots of their reviews, sellers can view snapshots of their own products, and administrators can view all snapshots on the platform. Snapshots are immutable and cannot be modified or deleted.

### Snapshot Purpose

Snapshots serve as the authoritative historical record for dispute resolution. They provide evidence of the state of data at any point in time, supporting investigations into product changes, order disputes, review modifications, and transaction discrepancies.

### Retention of Snapshots

All snapshots are retained indefinitely regardless of whether the original data has been deleted. Snapshots of deleted products, deleted reviews, and deleted seller accounts remain accessible to appropriate parties (data owners and administrators) for historical reference and dispute resolution.

### Permanent Deletion Conditions

### Customer Account Permanent Deletion

A customer's account can be permanently deleted only after removing all profile data. This includes display name, phone number, and all addresses. However, orders and order history are never permanently deleted as they contain legally required transaction records. Reviews are preserved with the "deleted user" label.

### Seller Account Permanent Deletion

A seller's account can be permanently deleted only when all of the following conditions are met:
- The seller has no orders in paid or shipped status
- The seller has no pending cancellation requests
- The seller has no pending refund requests

When these conditions are met, the seller's active products are removed from listings, but order data and snapshots are retained indefinitely.

### Product Permanent Deletion

A product can be permanently deleted only when all of the following conditions are met:
- There are no order items in paid or shipped status for any variant of the product
- There are no pending cancellation requests for any variant of the product
- There are no pending refund requests for any variant of the product

When these conditions are met, the product and all variants are removed from the system but all snapshots are retained indefinitely.

### Variant Permanent Deletion

A product variant can be permanently deleted only when all of the following conditions are met:
- There are no order items in paid or shipped status for that variant
- There are no pending cancellation requests for that variant
- There are no pending refund requests for that variant

When these conditions are met, the variant is removed from the product but all snapshots are retained indefinitely.

### Review Permanent Deletion

Customers may permanently delete their own reviews at any time. When deleted, the review content is removed from public view but the snapshot is retained indefinitely for dispute resolution purposes.

### Data Recovery Procedures

### Customer Data Recovery

Customers cannot recover deleted accounts. If a customer deletes their account, they must create a new account. Order history from the deleted account is not accessible to the customer but is retained by the platform for legal purposes. The customer cannot view or access orders from a deleted account.

### Product Data Recovery

Deleted products cannot be recovered by sellers. If a seller deletes a product, they must create a new product listing. However, the deleted product's snapshots remain accessible to the seller for viewing historical data, and administrators can view all product snapshots for oversight purposes.

### Review Data Recovery

Deleted reviews cannot be recovered by customers. If a customer deletes a review, it is permanently removed from public view. However, the snapshot of the deleted review remains accessible to the original author for viewing historical data.

### Order Data Recovery

Order data cannot be deleted or modified after creation. Orders, order items, shipments, and all associated snapshots are retained indefinitely. Customers can always view their order history. Administrators can view all orders on the platform.

### Snapshot Recovery for Disputes

In case of disputes regarding product changes, order discrepancies, or review modifications, the relevant snapshots serve as the authoritative record. Disputes can be reviewed by examining the snapshot history to determine what data existed at any point in time. Both parties to a dispute (customer and seller) or administrators may view relevant snapshots for investigation.

# External Dependency SLOs

Service level objectives for external dependency availability.

## External Dependency SLOs

Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.

### Payment Gateway Integration

The system integrates with an external payment gateway to process payments for orders.

The payment gateway may succeed or fail to process a payment. If payment fails, the order is not created and the customer is informed of the failure.

If payment fails, the customer may retry the payment for the same order. The customer may make multiple payment attempts.

When payment succeeds, the order is created and stock quantities are decreased for the purchased variants. The inventory records are updated at this time.

The system does not specify timeout thresholds for payment gateway responses. The system accepts any reasonable response time from the external payment gateway.

### Delivery Auto-Confirmation Timeout

Customers must confirm delivery for shipments they receive.

If a customer does not confirm delivery for a shipment, the items in that shipment automatically change to status "delivered" after 14 days from the shipping date.

This automatic confirmation applies to all shipments on the platform. The 14-day period begins when the seller marks the items as shipped.

The system does not provide customers the ability to extend or shorten this automatic confirmation period.

### External Service Availability

The system depends on external services for payment processing and delivery confirmation.

The external payment gateway is required for order creation. Orders cannot be created without successful payment processing.

External service availability is not controlled by the ecommerceMall platform. The system does not specify service level objectives or availability targets for external services.

When external services experience unavailability, orders cannot be completed until the services become available again.

### Service Degradation Handling

The system does not define automatic fallback behaviors when external services experience degraded performance.

When external services are unavailable, operations that depend on those services will fail. For example, payment processing will fail if the payment gateway is unavailable.

Customers and administrators may retry failed operations when external services become available again.

The system does not implement caching or offline modes for external service operations.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Product Image Storage

The system shall store product images uploaded by sellers.
Each product can have multiple images.
Images are stored for the duration of the product's existence on the platform.
When a product is deleted, its images are no longer accessible through normal operations but may be retained for legal compliance purposes.
Image storage capacity shall be sufficient to accommodate all products' images across the platform.


### Snapshot Storage

The system shall maintain immutable snapshots of modified business data.
Snapshots are preserved even after the original data is deleted.
Snapshots include product and variant data, seller profiles, order items, reviews, cancellation requests, and refund requests.
Snapshots are retained indefinitely for dispute resolution and legal compliance.
Snapshots cannot be deleted by any user or administrator.
Administrators can view snapshots for audit and dispute purposes.


### Order Data Retention

The system shall preserve order history indefinitely.
Customer account deletion shall not remove order records.
Seller account deletion shall preserve order history and product snapshots.
Order data is retained for legal and business record purposes.
Orders remain accessible to relevant parties (buyers, sellers, administrators) for the lifetime of the platform.


### General Storage Capacity

The system shall provision storage capacity to accommodate all platform data.
Storage shall include customer profiles, addresses, product data, order records, snapshots, and images.
Capacity planning shall consider the expected growth of user base and product listings.
Storage capacity shall be sufficient to maintain platform performance during normal operations.
The system shall not define specific storage limits or file size restrictions in business requirements.