**shoppingMall — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Each customer's personal data — profile information, addresses, wishlist, shopping cart, orders, and reviews — belongs to that customer. A customer can view and manage only their own data; they cannot access another customer's data under any circumstances.

Each seller's business data — shop profile, products, product variants, inventory records, and order items sold by that seller — belongs to that seller. A seller can view and manage only their own shop's data; they cannot access another seller's products, inventory, or order data.

Categories are platform-level data. They are created and managed exclusively by administrators and do not belong to any individual user.

Order data is shared: an order belongs to the customer who placed it, but each order item also belongs to the seller who fulfilled it. Both the customer and the relevant seller can view the portions of the order that pertain to them. Administrators have oversight access to all orders for dispute resolution and policy enforcement.

Snapshots are immutable records owned by the platform. They are associated with the entity they record (product, variant, seller profile, order item, review, cancellation request, or refund request) and can be viewed by the entity's owner and by administrators.

### Data Isolation

The platform maintains strict separation between different users' data. No customer can view another customer's profile, addresses, wishlist, cart, orders, or reviews beyond what is publicly visible (such as reviews on a product page or a seller's public shop profile).

No seller can view another seller's shop data, including products, inventory history, sales figures, or pending orders. Each seller's dashboard and management tools are scoped exclusively to their own shop.

When a customer views an order, they see only their own order items — including items sold by different sellers — but they do not gain access to those sellers' internal data. When a seller views an order containing their items, they see only the items they sold and the shipping information relevant to fulfilling those items.

Administrators can view data across all users but only for the purposes of platform management, dispute resolution, and policy enforcement as described in the oversight requirements.

### Access Control Policies

All data access is governed by actor roles as defined in the permission matrix (see 01-actors-and-auth). At the business policy level, the following principles apply:

Customers can access only their own account data, profile, addresses, wishlist, cart, orders, and reviews. They can view public seller profiles and product listings, but they cannot access any seller's internal management data.

Sellers can access their own shop profile, products, variants, inventory, and the order items sold by their shop. They can view the customer-facing information needed to fulfill orders (shipping address, recipient name) but cannot access the customer's full account profile or other orders.

Administrators have platform-wide read access for oversight purposes, including all user accounts, all products, all orders, all snapshots, and all approval/request records. Write access for administrators is limited to specific administrative actions: category management, seller approval/rejection, account suspension/banning, force-cancellation and force-refund of orders, and administrator promotion/demotion.

Super administrators have the same access as regular administrators plus the ability to manage administrator requests (approve, reject) and promote or demote other administrators.

### Privacy Boundaries

When a customer deletes their account, their profile information (display name, phone number) and authentication credentials are permanently removed. Their orders and order history are retained for seller records and legal purposes. Their reviews are preserved but are displayed as authored by "deleted user" — the review content, rating, and snapshots remain, but the link to the original customer's identity is severed.

When a seller deletes their account, their products are removed from listings and are no longer visible in search or category browsing. Their shop name as it appeared in past orders is preserved within those orders. Order history and associated snapshots remain intact. The seller's profile information (shop name, description, logo) is deleted, but snapshots of the seller profile taken at the time of each order are preserved as part of the order record.

All snapshots are immutable — they cannot be modified or deleted by any user, including administrators. This immutability guarantees that the historical record of product listings, seller profiles, order items, reviews, cancellation requests, and refund requests remains accurate and tamper-proof for dispute resolution, even after the original data is modified or deleted.

Customers' personal data within orders — specifically the shipping address used at the time of purchase — is preserved with the order. This data is accessible to the customer who placed the order, the seller(s) fulfilling the order items, and administrators. No other party can access this information.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-Delete Policy

The platform uses soft-delete for certain data types where historical records or references must be preserved after the user-facing entity is removed.

**Reviews** — When a customer deletes a review, the review is marked as deleted rather than being permanently removed. The review content and rating remain in the system but are excluded from the product's average rating calculation and from the review list displayed on the product detail page. Review snapshots are always preserved regardless of review deletion.

**Customer Account Deletion** — When a customer deletes their account, their profile information (display name and phone number) is removed. However, their reviews are preserved and displayed with the author shown as "deleted user." Their orders and order history remain in the system for seller records and legal purposes.

**Seller Account Deletion** — When a seller deletes their account, their products are removed from listings and no longer appear in search or category browsing. However, the seller's shop name is preserved in past order records. Order item snapshots that captured the seller's profile at the time of purchase remain intact. All product snapshots are preserved.

**Product Deletion** — When a seller or administrator deletes a product, the product, its variants, images, and inventory records are removed from active listings. The product no longer appears in search, category listings, or wishlists (it is automatically removed from all wishlists). However, product snapshots and product variant snapshots are preserved for order history integrity and dispute resolution.

**Wishlist Cleanup** — When a product is deleted, it is automatically removed from all customer wishlists. No orphaned wishlist references remain.

**Order History** — Order records, order items, and their associated snapshots (product snapshots, variant snapshots, seller profile snapshots) are never soft-deleted. They are retained as permanent historical records.

### Data Retention Periods

Data retention follows the principle that transactional and snapshot data must be preserved for legal compliance and dispute resolution, while user-managed content is removed when deleted by the data owner.

**Permanently Retained Data** — The following data types are retained indefinitely and are never removed:

- Order records and all associated order items
- Product snapshots and product variant snapshots (preserved even after product deletion)
- Seller profile snapshots captured in order items
- Review snapshots
- Cancellation request snapshots
- Refund request snapshots
- Shipment records and tracking information

These records serve as the platform's financial and transactional ledger. They are required for seller records, legal purposes, and dispute resolution between buyers and sellers.

**Data Removed on User Deletion** — The following data is removed when the owning user deletes it:

- Customer profile information (display name, phone number) — removed on account deletion
- Seller profile information (shop name, shop description, logo) — removed on account deletion
- Shipping addresses — removed on account deletion
- Products, variants, product images, and inventory records — removed on product deletion or seller account deletion
- Cart items — removed on account deletion
- Wishlist items — removed on account deletion or when the referenced product is deleted

**Data Marked as Deleted** — Reviews are marked as deleted but the record and its snapshots remain. The review content is excluded from public display and from the product's average rating calculation.

**Inventory Records** — Inventory history records are deleted when their associated product or variant is deleted, since inventory records are tied to the variant lifecycle.

### Data Recovery

The platform does not provide a self-service data recovery mechanism for users. Once data is deleted through the platform's deletion operations, it cannot be recovered by the user.

**Account Deletion** — Account deletion is irreversible. When a customer or seller deletes their account, their profile information, addresses, and other personally managed data are permanently removed and cannot be recovered. The preservation of order history and snapshots (as described in the Soft-Delete Policy and Data Retention Periods sections) is for platform record-keeping purposes only and does not constitute data recovery for the deleted user.

**Product Deletion** — When a seller or administrator deletes a product, the product and all its variants and inventory records are permanently removed from active use and cannot be restored by the seller. Product snapshots remain for audit and order history purposes but cannot be used to restore the product to an active state.

**Review Deletion** — When a customer deletes a review, the review is marked as deleted and cannot be restored by the customer. Review snapshots are preserved for audit purposes only.

**No Grace Period** — There is no undo or grace period after deletion. Deletion actions take effect immediately and are final from the user's perspective.

**Administrator Access to Retained Data** — Administrators can view retained data such as order history and snapshots for oversight and dispute resolution purposes. This access does not enable restoration of deleted entities to their original active state.

### Permanent Deletion Policy

Permanent deletion refers to the complete removal of data from the active system. This differs from soft-delete, where records are marked but preserved.

**When Permanent Deletion Occurs** — Permanent deletion occurs in the following scenarios:

- Customer account deletion: profile information, addresses, cart items, and wishlist items are permanently removed
- Seller account deletion: seller profile, products, variants, product images, and inventory records are permanently removed
- Product deletion: the product, its variants, images, and inventory records are permanently removed
- Review deletion: the review is permanently excluded from public display and rating calculations; the record itself is retained only for audit purposes

**Data Exempt from Permanent Deletion** — The following data is never permanently deleted:

- Order records and order items (the platform's transactional ledger)
- Snapshots of any type (immutable by design, as stated in the Snapshot Principle)
- Shipment records and tracking information

**Cross-Entity Deletion Effects** — When an entity is permanently deleted, related downstream data is also affected:

- Deleting a product permanently removes all its variants, images, inventory records, wishlist references, and cart references
- Deleting a seller account permanently removes all their products (and by extension all product data as described above)
- Deleting a variant permanently removes its inventory records and cart references
- Deleting a customer account permanently removes their wishlist, cart, addresses, and profile information

**Data Not Affected by Deletion** — Order history and snapshots are preserved regardless of account or product deletion. Review records (marked as deleted) and their snapshots are preserved regardless of account or review deletion. The shop name of a deleted seller remains visible in past order records.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Image Storage Scope

The platform stores two categories of image files based on user requirements:

- **Product images**: Sellers upload multiple images per product. Each product can have multiple images, and the display order is controlled by the seller.
- **Seller profile logos**: Each seller profile includes one logo image.

These are the only file types stored by the platform. No other file uploads are specified by the requirements.

Images are displayed to customers on product listings (thumbnails), product detail pages (all images), and seller profile pages (logo).

### Snapshot Impact on Storage

Under the snapshot principle, whenever a product is edited, a snapshot is created that preserves all product fields including images at that point in time. Similarly, seller profile edits create snapshots that preserve the logo image.

As a result, storage usage grows cumulatively:

- Each product edit that changes images creates a new snapshot containing copies of the images at the time of the edit.
- Each seller profile edit that changes the logo creates a new snapshot containing the previous logo.
- Snapshots are immutable and cannot be deleted, so storage grows monotonically with each edit.

Storage planning must account for this accumulative growth pattern over the lifetime of the platform.

### Image Delivery Performance

Product images and seller logos are a core part of the shopping experience. The main product image serves as the thumbnail in listings, and all images are shown on the product detail page. Seller logos appear on profile pages.

Images must be delivered with sufficient speed so that customers can browse product listings and detail pages without excessive waiting. Since the platform serves customers who may be geographically distributed, image delivery must perform consistently regardless of the customer's location.

Image delivery should support concurrent browsing by multiple customers without degradation. As the number of products, sellers, and customers grows, the image serving infrastructure must scale accordingly to maintain consistent delivery performance.

### Storage Growth Factors

Total storage capacity is driven by the following factors, all traceable to user requirements:

- **Number of products**: Each product can have multiple images, directly scaling storage needs.
- **Product edit frequency**: Each edit that changes images creates a snapshot containing copies of those images, multiplying storage per product.
- **Number of sellers**: Each seller has one logo image, plus snapshots from profile edits.
- **Platform growth over time**: As more sellers join and create more products, and as existing products are edited, storage requirements increase.

Capacity planning should monitor these growth drivers to anticipate storage needs. Storage is not reclaimed when products are deleted (snapshots are preserved), so total storage only increases over time. Storage capacity must be provisioned ahead of demand to prevent outages from capacity exhaustion.

# External Dependency SLOs

Service level objectives for external dependency availability.

## External Dependency SLOs

Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.

### Payment Gateway as External Dependency

The platform depends on an external payment gateway to process customer payments during checkout. Payment processing is the only external dependency that directly affects order creation.

When the payment gateway is available, the checkout flow proceeds normally: the customer confirms the order, payment is submitted to the gateway, and the order is created upon successful payment.

The payment gateway is invoked only at the point of order placement, after the customer has reviewed the order summary and confirmed their intent to purchase. No other platform feature depends on the external payment gateway.

### Payment Processing Timeout

Payment processing is subject to a timeout. If the external payment gateway does not respond within an acceptable period, the payment is treated as failed.

When a payment fails — whether due to timeout, declined payment, or gateway error — the order is not created. The customer's cart items remain intact, and the customer may retry the payment. Stock quantities are not affected by a failed payment.

The timeout exists to prevent customers from waiting indefinitely and to ensure that stock is not reserved during an unresolved payment attempt.

### Platform Behavior During Payment Gateway Unavailability

When the external payment gateway is unavailable, the checkout and order placement functions are affected. Customers cannot complete purchases until the gateway becomes available again.

Other platform functions continue to operate normally during payment gateway unavailability, including:

- Browsing products and categories
- Searching and filtering products
- Managing wishlists
- Adding items to cart and modifying cart contents
- Viewing order history and order details
- Managing customer profiles, addresses, and account settings
- All seller and administrator functions unrelated to payment

Customers who attempt to place an order during a gateway outage receive an indication that payment cannot be processed at that time and are advised to retry. Cart contents are preserved and unchanged by the failed attempt.