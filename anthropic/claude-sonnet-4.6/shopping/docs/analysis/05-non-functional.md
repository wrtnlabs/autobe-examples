**shoppingMall — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Each piece of data on the platform belongs to a specific actor, and that ownership determines who may read, modify, or delete it.

Customers own their profile information (display name, phone number), their shipping addresses, their cart contents, their wishlist, and their reviews. Customers may edit or delete their own profile and address data at any time. Reviews written by a customer belong to that customer; they may edit or delete their own reviews, though snapshots of prior versions are preserved and owned by the platform for audit purposes.

Sellers own their shop profile (shop name, description, logo), their product listings, product images, and product variants. Sellers may edit or delete their own products and variants subject to the business constraints defined in the functional requirements. All snapshots created from seller-owned data (product snapshots, seller profile snapshots) are retained by the platform and are no longer modifiable once created.

Orders belong to the customer who placed them. Order history, order item records, and associated snapshots are treated as platform-owned records once created, because they serve legal and financial record-keeping purposes for both the customer and the seller involved. Neither the customer nor the seller may alter or delete order records.

Administrator requests belong to the submitting customer or seller until a decision is made, after which they become platform audit records.

### Data Isolation Between Users

The platform enforces strict isolation between accounts so that one user cannot access another user's private data.

Customer isolation: A customer's profile details, shipping addresses, cart contents, and wishlist are private to that customer. No other customer or seller may view or interact with another customer's cart, wishlist, or addresses.

Seller isolation: A seller's internal shop data (including unapproved registration details, rejection reasons, inventory records, and pending order item lists) is private to that seller. No other seller may view another seller's inventory history, order items, or shop management data.

Cross-role isolation: Customers cannot access seller management views (inventory, order item management, shipment creation). Sellers cannot access customer account details, addresses, or wishlists. Neither customers nor sellers can access administrator-only views such as the seller approval queue or the admin request list.

Shared public data: Product listings, product detail pages, seller shop profiles, and reviews are intentionally public and visible to any authenticated user (registration is required for any access to the platform).

Order data visibility: A customer may view only their own orders. A seller may view only the order items that belong to their own products. Neither party can view the other's full order or financial data beyond what is relevant to their shared transaction.

### Access Control by Role

Access to data is determined by the actor's role and their relationship to the specific data record. The following boundaries apply across the platform.

Guests have no access to any data. The platform requires registration and login before any feature can be used.

Customers may access their own profile, addresses, cart, wishlist, orders, and reviews. They may view public product listings, product detail pages, seller profiles, and the reviews of other customers. They may not access other customers' private data, seller management data, or any administrator functionality.

Sellers may access their own shop profile, their own products and variants, inventory records for their own variants, and the order items associated with their products. Sellers may view snapshots of their own products and seller profile. Sellers may not access customer personal data beyond what is needed to process a shipment (the shipping address on an order they are fulfilling). Sellers may not view other sellers' products in management mode, inventory, or orders.

Administrators may access all product listings and their snapshots, all seller accounts and approval records, all customer accounts, and all orders for oversight purposes. Regular administrators and super administrators share these read permissions. Super administrators additionally manage the administrator roster and handle admin promotion or demotion requests.

Administrators do not have access to customer passwords, seller passwords, or any stored credentials. Access to order and financial records by administrators is limited to oversight and dispute resolution purposes, not for commercial use.

### Privacy of Personal Information

The platform collects personal information from customers and sellers only to the extent necessary to operate the service.

Customer personal information includes email address, display name, and phone number. Shipping addresses additionally include recipient name, phone number, street address, city, state or province, postal code, and country. This information is visible only to the customer themselves and to administrators performing account oversight. It is not shared with sellers except for the shipping address snapshot embedded in an order, which a seller can see only for orders involving their own products.

Seller personal information includes email address, shop name, shop description, and logo image. The shop name and logo are displayed publicly on product listings and in the seller profile page. The email address is private and is not shared with customers or other sellers.

When a customer deletes their account, their profile information (display name, phone number, email) is removed from the active system. However, order records and order history that reference the customer are preserved for seller records and legal purposes. Reviews left by a deleted customer are preserved but displayed under the label "deleted user" so that product rating integrity is maintained without exposing personal identity.

When a seller deletes their account, their personal profile is removed. The seller's shop name as it appeared in past order snapshots is preserved within those snapshots, because order records must accurately reflect the seller's identity at the time of purchase. Product listings created by the deleted seller are removed from active search and category pages.

Snapshots that contain personal information (such as seller profile snapshots embedded in order item records) are retained as part of the immutable order record. These snapshots cannot be deleted and are accessible only to the parties involved in the original transaction and to administrators.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-Delete Behavior

The platform distinguishes between soft-deleted and hard-deleted data, depending on whether the data may be needed for future reference.

The following data is soft-deleted — it is removed from public visibility but retained internally:

- **Products**: When a seller deletes a product, it is removed from all search results and category listings. However, the product record and all associated snapshots are preserved internally, because existing order items reference them.
- **Product Variants**: When a variant is deleted, it is removed from the product's purchasable options. It is no longer shown to customers, but any associated order item snapshots are preserved.
- **Reviews**: When a customer deletes their own review, the review content is no longer shown on the product detail page. All snapshots of that review are preserved. The review is excluded from the product's average rating calculation once deleted.
- **Seller Products on Account Deletion**: When a seller deletes their account, all of their products are soft-deleted and removed from listings. The underlying product records and snapshots remain intact for historical order reference. However, the associated product variants and inventory records for those products are removed at the time of account deletion.
- **Wishlist Items**: When a product is deleted by a seller, it is automatically and permanently removed from all customers' wishlists. This is a hard removal from the wishlist, but the underlying product data is still soft-deleted as described above.

Soft-deleted data remains accessible to administrators and relevant parties for dispute resolution and record-keeping, but is invisible to customers browsing the platform.

### Data Retention Policies

The platform applies different retention rules to different categories of data, reflecting their business and legal significance.

**Permanently Retained Data (never deleted)**
- All snapshots — including product snapshots, product variant snapshots, seller profile snapshots, order item snapshots, review snapshots, cancellation request snapshots, and refund request snapshots — are immutable and are never deleted, even if the originating record is deleted.
- Order records and order items are retained permanently, even after the associated customer or seller account is deleted. This preserves order history for seller records and legal purposes.
- The seller's shop name captured in past order item snapshots is preserved permanently, even if the seller changes or deletes their shop name or account.
- Reviews associated with orders are preserved even after a customer deletes their account. They are shown with an attribution of "deleted user" rather than the customer's display name.

**Data Removed Upon Explicit Deletion**
- Inventory records for a product variant are removed when the owning product is explicitly deleted by a seller. They are not retained after product deletion.
- Product variants are similarly removed when the owning product is deleted, whether through a direct product deletion or a seller account deletion.

**Retained for Defined Business Periods**
- Refund eligibility is available within 7 days of an order item's delivery confirmation. After this window closes, refund requests can no longer be submitted for that item.
- Automatic delivery confirmation occurs 14 days after a shipment is marked as shipped, if the customer has not manually confirmed delivery. After this point, the order item status becomes "delivered" and the refund window begins.

**Retained Until Explicit Action**
- Customer shipping addresses are retained until the customer explicitly deletes them.
- Cart items and wishlist items are retained until the customer removes them or until the associated product or variant is deleted.
- Pending seller approval records and administrator request records are retained until a decision is made by a super administrator or administrator.

### Data Recovery

The platform does not provide a general-purpose undo or restore mechanism. Once data is deleted, recovery is not available through normal user operations. However, the following recovery-related behaviors apply:

**Snapshots as an Audit and Recovery Reference**
- Snapshots of products, variants, seller profiles, reviews, cancellation requests, and refund requests serve as the historical record that relevant parties (owners, administrators) can access for dispute resolution. While snapshots are not used to restore live data, they allow administrators to review the complete state of any record at any past point in time.

**Seller Re-Registration After Rejection**
- A seller whose registration is rejected can submit a new registration request. Each new submission is treated as an independent approval request. Prior rejected submissions remain in the record but do not block re-registration.

**Inventory Correction After Cancellation or Refund**
- When an order item is cancelled or refunded (whether by seller approval or by an administrator force-action), the associated stock quantities are automatically restored via a positive inventory record. This represents a functional recovery of available stock, not a data restoration.

**No Account Recovery After Deletion**
- When a customer deletes their account, their profile information (display name, phone number, email, password, and shipping addresses) is permanently deleted. There is no mechanism to recover a deleted customer account.
- When a seller deletes their account, their profile information is permanently deleted and their product listings are removed from public view. The underlying product records and snapshots are preserved for historical order reference, but the seller account itself cannot be recovered. There is no mechanism to restore a deleted seller account.

### Permanent Deletion

Certain data is permanently and irrecoverably deleted when specific user actions occur. The following rules govern what is permanently deleted:

**Customer Account Deletion**
- The customer's profile information — including display name, phone number, email, and password — is permanently deleted.
- All of the customer's shipping addresses are permanently deleted.
- The customer's cart items and wishlist items are permanently deleted.
- Orders and order history created by the customer are not deleted; they are preserved for seller records and legal purposes.
- Reviews authored by the customer are not deleted; they are preserved and displayed with the attribution "deleted user".

**Seller Account Deletion**
- The seller's profile information — including shop name, description, and logo — is removed from the active seller record.
- All products belonging to the seller are permanently deleted from listings. Their associated product variants and inventory records are also removed.
- Order history, order item snapshots, and seller profile snapshots associated with past transactions are preserved and are not deleted.
- The seller's shop name as captured in past order item snapshots continues to appear in historical order records.

**Product Deletion**
- When a seller deletes a product, all of its variants and all associated inventory records are also deleted.
- Product snapshots and order item snapshots that reference the deleted product are not deleted; they remain as immutable historical records.
- The product is automatically removed from all customer wishlists.

**Snapshot Immutability**
- No snapshot of any kind can ever be permanently deleted. This applies to: product snapshots, product variant snapshots (product-snapshot-SKU), seller profile snapshots, order item snapshots, review snapshots, cancellation request snapshots, and refund request snapshots. These records are immutable by design and are retained indefinitely.

# External Dependency SLOs

Service level objectives for external dependency availability.

## External Dependency SLOs

Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.

### External Payment Gateway Dependency

The platform integrates with an external payment gateway to process customer payments at checkout. This gateway is the sole external dependency involved in the core transaction flow. Because payment processing is a critical step in order creation, the platform's ability to complete purchases is directly tied to the availability and responsiveness of this external service.

The platform treats the payment gateway as a dependency that may experience intermittent unavailability or delayed responses. The platform must account for these conditions without corrupting order state or charging customers incorrectly.

All interactions with the payment gateway occur synchronously during the checkout process. The outcome — success or failure — is communicated to the customer before any order is created or stock is deducted.

### Availability Expectations for External Services

The platform acknowledges that external service availability cannot be fully controlled. The following expectations govern how the platform handles external dependency availability:

- The payment gateway is expected to be reachable under normal operating conditions. If the gateway is unreachable at the time of a payment attempt, the attempt is treated as a failure.
- No order is created and no stock is decremented when the gateway is unavailable or returns an error.
- Customers are informed that payment could not be processed and are given the opportunity to retry.
- The platform does not queue or defer payment requests when the gateway is unavailable; each attempt must complete or fail in real time before the customer proceeds.
- The platform does not assume or guarantee any specific uptime percentage for the external payment gateway, as that is governed by the gateway provider's own service agreement.
- If the gateway becomes unavailable during an active payment attempt, the attempt is considered failed and the customer must retry.

### Timeout and Response Handling

When the platform sends a payment request to the external gateway, it waits for a response within a defined window. If no response is received within that window, the request is treated as a failure rather than a success.

- A payment attempt that does not receive a conclusive response from the gateway (success or failure) within the expected timeframe is treated as unsuccessful.
- No order is created and no inventory is decremented as a result of a timed-out payment attempt.
- The customer is notified that the payment attempt did not complete and is prompted to retry.
- The platform does not make assumptions about whether a timed-out request was actually processed by the gateway; it errs on the side of caution and treats the state as unresolved until the customer initiates a new attempt.
- Retry attempts are always customer-initiated; the platform does not automatically retry timed-out payment requests on the customer's behalf.

### Degradation Policy When External Services Are Unavailable

When the external payment gateway is degraded or fully unavailable, the following degradation behavior applies across the platform:

- Checkout and payment cannot be completed while the gateway is unavailable. Customers who attempt to place an order during this period receive a notification that payment processing is currently unavailable.
- All pre-checkout activities remain fully functional regardless of gateway status: customers can browse products, manage their cart, manage their wishlist, view their order history, and manage their account.
- Seller operations unrelated to payment — such as shipping items, responding to cancellation or refund requests, and managing product listings — remain fully functional.
- Administrator operations — such as approving seller accounts, managing categories, and reviewing orders — remain fully functional.
- No platform functionality that does not depend on the payment gateway is degraded when the gateway is unavailable.
- Once the payment gateway becomes available again, customers can resume placing orders without any administrative intervention.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Image and File Storage

The platform stores uploaded image files for two primary purposes: product images uploaded by sellers, and seller profile logo images. Both types of image assets must remain accessible to customers browsing the platform.

Product images are uploaded per product. Each product supports multiple images, and the display order of images is managed by the seller. The first image in the order serves as the main thumbnail shown in product listings.

Seller profile logos are uploaded as part of the seller's shop profile. When a seller updates their logo, the previous logo image must remain accessible because historical seller profile snapshots reference it. Image assets referenced by snapshots are therefore retained indefinitely and must not be purged, even if the seller later replaces the image.

When a product is deleted, its images are no longer shown in listings or product detail pages. However, if any order items reference a product snapshot that includes those images, the image assets must remain retrievable for historical order records.

When a seller account is deleted, the seller's logo images referenced in order item snapshots must remain accessible so that past order records remain complete and accurate.

### Image Delivery and Accessibility

Product images and seller logo images must be served to customers viewing product listings, product detail pages, and seller profile pages. These assets must be accessible to all users who have permission to view the associated content.

Images embedded in historical snapshots — including product snapshots and seller profile snapshots — must remain retrievable by administrators and the relevant parties (customers who placed orders, sellers who received orders) for the purpose of dispute resolution and record review.

Deleted products and deleted seller accounts must not expose their image assets to general browsing; however, those assets must remain accessible within the context of order history and snapshot review by authorized parties.

The platform integrates with an external payment gateway. The image delivery mechanism is independent of the payment gateway and is not subject to payment processing availability.

### Storage Retention for Snapshots and Audit Records

Because the platform handles financial transactions, all snapshot-related assets — including images captured at the time a product snapshot was created — must be retained for as long as the associated snapshot records exist. Snapshots are immutable and cannot be deleted; therefore, the storage assets they reference must persist in parallel.

The following asset categories are subject to indefinite retention due to their association with immutable snapshot records:

- Product images included in product snapshots at the time of each product edit
- Seller logo images included in seller profile snapshots at the time of each profile edit
- Any image referenced by an order item snapshot created at the time of purchase

Storage capacity planning must account for the accumulation of historical image versions over time, since each product edit or seller profile edit that changes images produces a new snapshot referencing the new set of images, while previous image versions remain retained.

Inventory records, cancellation request snapshots, refund request snapshots, and review snapshots do not include image assets and therefore do not directly contribute to image storage growth.