**eCommerceMall — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Each actor type owns and is responsible for specific data on the platform:

**Customer Data Ownership**
- Customers own their profile information (display name, phone number) and shipping addresses
- Customers own their reviews, wishlist items, and cart contents
- A customer's order history is jointly owned: the order belongs to the customer, but order data must be preserved for seller records and legal purposes even after account deletion

**Seller Data Ownership**
- Sellers own their profile information (shop name, shop description, logo image)
- Sellers own their products, product variants, product images, and inventory records
- Sellers own their shipment records
- Seller-owned order items are jointly owned with the customer — the seller retains access for fulfillment and record-keeping

**Platform Ownership**
- The platform owns category structures, which are managed exclusively by administrators
- Snapshots are owned by the platform and are immutable — they cannot be modified or deleted by any actor
- The platform retains full ownership of all data required for legal and regulatory compliance

**Administrator Oversight Ownership**
- Administrators have oversight access to all platform data but do not own it
- Administrator actions (approvals, suspensions, force-cancellations) are platform records owned by the system

### Data Isolation

Data between unrelated actors must be strictly isolated:

**Customer-to-Customer Isolation**
- Customers can only view their own profile, addresses, orders, reviews, wishlist, and cart
- Customers cannot access or view other customers' personal information, order history, or addresses
- Review content is publicly visible on product detail pages, but the reviewer's identity is shown as a display name only — no other customer profile data is exposed

**Customer-to-Seller Isolation**
- Customers can view seller profiles (shop name, shop description, logo) — this is public information
- Customers can view their own order items that belong to a seller
- Customers cannot view a seller's other orders, product inventory levels, or any seller-specific data beyond public profile information

**Seller-to-Seller Isolation**
- Sellers cannot view other sellers' profiles beyond what is publicly available
- Sellers cannot view other sellers' products (except as a normal customer browsing the platform)
- Sellers cannot view other sellers' orders, order items, shipments, or financial data
- Sellers cannot view other sellers' inventory records or stock levels

**Administrator Access Boundaries**
- Administrators can view all products, all orders, and all seller/customer accounts for oversight purposes
- Administrators cannot view a customer's password (passwords are stored securely and are not readable by any actor, including administrators)
- Administrators cannot view a seller's password

### Access Control

Access to data is governed by actor type and relationship:

**Self-Access**
- Customers can access, edit, and delete their own profile, addresses, reviews, wishlist items, and cart items
- Sellers can access, edit, and delete their own profile, products, variants, and inventory records
- Passwords can be changed by the account holder only — no other actor can change or reset another user's password

**Publicly Accessible Data**
- Seller profiles (shop name, shop description, logo) are publicly viewable
- Product names, descriptions, images, base prices, and variant information are visible to all logged-in users
- Reviews and average ratings on product detail pages are publicly viewable
- Category listings are publicly viewable

**Order-Based Access**
- Customers can view their own orders and all associated order items, shipments, tracking information, and cancellation/refund request statuses
- Sellers can view order items that belong to their products, including customer shipping addresses necessary for fulfillment
- Sellers cannot view the customer's full account profile or other orders the customer placed with other sellers

**Snapshot Access**
- Customers can view snapshots of their own reviews
- Sellers can view snapshots of their own products, variants, and profile edits
- Administrators can view snapshots of any product, variant, or profile
- Snapshots are immutable and cannot be deleted by any actor, including administrators

### Privacy Boundaries

Privacy protections apply to data handling across the platform:

**Account Deletion Privacy**
- When a customer deletes their account, their profile information (display name, phone number) is permanently deleted from the system
- Orders and order history are preserved but disassociated from the customer's identity — the customer's personal details are removed from these records
- Reviews written by a deleted customer are preserved but displayed with "deleted user" as the author — the review content and rating remain for product history
- When a seller deletes their account, their products are removed from listings but order history and shop name in past orders are preserved

**Data Visibility in Public Contexts**
- When a review is displayed on a product detail page, the reviewer's identity is shown only as their display name — no other personal information is revealed
- When a product listing appears in search results or category pages, only the seller's shop name is displayed — no seller personal information
- Customer shipping addresses are only shared with the seller who needs to fulfill an order — they are not visible to other sellers or other customers

**Personal Information Handling**
- Email addresses are used for authentication and are not publicly visible
- Phone numbers in customer profiles are not publicly visible — they are only used for the customer's own shipping addresses
- Recipient phone numbers on shipping addresses are shared with the seller for delivery purposes only

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-Delete Policy

The platform employs a soft-delete approach for certain data categories to preserve business records and legal compliance.

**Customer Account Deletion**

When a customer deletes their account:
- The customer's profile information (display name, phone number, email, password) is permanently deleted.
- The customer's orders and order history are preserved in full — order items, shipment records, and associated snapshots remain intact.
- Customer reviews are preserved on product pages, but the review author is anonymized and displayed as "deleted user". Ratings from such reviews continue to contribute to the product's average rating.
- Cart items and wishlist items associated with the deleted account are removed.

**Seller Account Deletion**

When a seller deletes their account:
- The seller's products are removed from active listings (search results, category pages, wishlists).
- Order history and product snapshots are preserved for legal and seller records.
- The seller's shop name in past order items and snapshots is retained as it appeared at the time of purchase.
- Seller profile snapshots taken at the time of each order remain preserved.

**Product Deletion**

When a seller or administrator deletes a product:
- The product is removed from search results and category listings.
- All variants and inventory records are removed from active data.
- Product snapshots and order history referencing this product are preserved indefinitely.
- The product is automatically removed from all customer wishlists.
- Reviews for the product remain visible on any preserved order records.

**Review Deletion**

When a customer deletes their own review:
- The review is removed from the product's public display.
- Review snapshots (taken at each edit) are preserved and remain viewable by administrators.
- The product's average rating is recalculated excluding the deleted review.

### Data Retention Periods

The platform retains different categories of data for varying periods based on legal requirements and business needs.

**Indefinite Retention**

The following data is retained indefinitely (no automatic deletion):
- Order records and order items — preserved for seller financial records and legal compliance.
- Order item snapshots (product, variant, and seller profile at time of purchase) — preserved for dispute resolution.
- Product snapshots — preserved for audit and verification purposes, even after the product is deleted.
- Seller profile snapshots — preserved in the context of historical orders.
- Cancellation and refund request snapshots — preserved for dispute resolution.
- Inventory records — preserved as a complete audit trail of stock changes.

**Time-Limited Retention**

The following data has defined retention periods based on business rules stated in the requirements:
- Delivery auto-confirmation window: If a customer does not manually confirm delivery, items automatically transition to "delivered" status 14 days from the shipping date.
- Refund request window: Customers may request a refund within 7 days of an item being delivered.
- Seller approval status: A rejected seller registration can be replaced by a new registration request.

**Data Not Otherwise Specified**

For any data not explicitly mentioned above:
- Account credentials and authentication data are retained for the duration of the account's active life.
- Upon account deletion, profile data is removed as described in the Soft-Delete Policy section.
- Banned customer and seller accounts remain in the system but their access is revoked. Their data is not automatically deleted.

### Data Recovery

The platform provides limited data recovery capabilities focused on snapshot-based reconstruction.

**Snapshot-Based Recovery**

Snapshots serve as the primary recovery mechanism. Since all modifications to products, variants, seller profiles, reviews, cancellation requests, and refund requests create immutable snapshots, the following recovery capabilities exist:
- Administrators can view snapshots to reconstruct the state of any product, variant, or seller profile at any point in time.
- Product snapshots include all product fields (name, description, category, base price, images) and complete variant snapshots (SKU code, option values, price), allowing full reconstruction of a product's historical state.
- Order item snapshots preserve the complete product, variant, and seller profile state at the time of purchase, enabling accurate reference for disputes.
- Snapshots are immutable and cannot be deleted, ensuring a permanent audit trail.

**Account Recovery**

- Deleted customer accounts cannot be recovered. A customer whose account was deleted must register anew.
- Deleted seller accounts cannot be recovered. A seller whose account was deleted must submit a new registration request and await administrator approval.
- Banned accounts (customers or sellers) remain in the system and can be reinstated by an administrator unsuspending or unbanning the account.
- Suspended seller accounts can be unsuspended by an administrator, restoring full access and product visibility.

**Product Recovery**

- Deleted products cannot be recovered to active listings. A seller must create a new product.
- Deleted variants cannot be recovered. A seller must create a new variant for the product.
- Product snapshots are available for reference but do not support automatic restoration.

**Legal and Dispute Recovery**

- All order-related snapshots and records are preserved for the purpose of dispute resolution between customers, sellers, and administrators.
- Inventory records provide a complete audit trail of all stock changes, enabling reconstruction of stock history for any variant.

### Permanent Deletion

The platform permanently deletes data under specific conditions defined in the business requirements.

**Customer Profile Deletion**

When a customer deletes their account, the following is permanently removed (cannot be recovered):
- Display name
- Phone number
- Email address
- Password (authentication credentials)
- Saved addresses
- Cart items
- Wishlist items

**Seller Profile Deletion**

When a seller deletes their account (subject to the restriction that no pending orders, cancellations, or refunds exist), the following is permanently removed:
- Shop name and description (from active profiles, but preserved in order snapshots)
- Logo image (from active profiles, but preserved in order snapshots)
- Email address
- Password (authentication credentials)
- All products, variants, and inventory records (from active listings; snapshots preserved)

**Product and Variant Deletion**

When a product or variant is deleted:
- The product is permanently removed from active listings, search, category pages, and wishlists.
- Variants are permanently removed from active inventory.
- Inventory records for deleted variants are preserved in the audit trail.
- Product and variant snapshots are permanently preserved.

**Review Deletion**

When a customer deletes a review:
- The review is permanently removed from the product's public display.
- Review snapshots (from edits) are permanently preserved for administrator viewing.

**Category Deletion**

When an administrator deletes a category:
- The category is permanently removed.
- Products in the deleted category become uncategorized.

**Data That Is Never Permanently Deleted**

The following data is never permanently deleted from the system:
- Order records and order items
- Order item snapshots
- Product snapshots (even after product deletion)
- Seller profile snapshots captured at time of purchase
- Cancellation request snapshots
- Refund request snapshots
- Inventory records
- Review snapshots (from edits)

**Legal Hold Acknowledgement**

The indefinite preservation of order records, snapshots, and inventory history serves the business purpose of seller financial record-keeping, legal compliance, and dispute resolution as specified in the requirements.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Storage Requirements by Data Type

The platform stores multiple categories of data, each with distinct storage characteristics:

| Data Type | Description | Write Frequency | Growth Pattern |
|-----------|-------------|-----------------|----------------|
| Product images | Uploaded images for each product (multiple per product) | Created/edit on product creation/update | Grows with number of products and product edits |
| Seller logo images | Logo image for each seller profile | Created on registration, updated on profile edit | Grows with number of sellers and profile edits |
| Product snapshots | Complete snapshot of product and variant data on every edit | Created on every product or variant edit | Grows with product edit frequency |
| Order item snapshots | Product, variant, and seller profile state at time of purchase | Created on every order placement | Grows with order volume |
| Review snapshots | Review content preserved on every edit | Created on every review edit | Grows with review edit frequency |
| Cancellation and refund request snapshots | Request state preserved on every status change | Created on seller response to requests | Grows with cancellation/refund volume |
| Inventory records | Quantity change history per variant | Created on restock, order, adjustment, cancellation, refund | Grows with transaction volume |

Images (product images and seller logos) are binary file data and require significantly more storage than textual snapshot records. Storage capacity must be provisioned to accommodate both file-based image data and the growing volume of immutable snapshot records.

### Image Storage and Delivery

Product images and seller logo images are the primary drivers of storage capacity requirements on the platform.

**Image Storage Rules**
- Images are uploaded by sellers when creating or editing products and seller profiles
- Images remain stored even after the associated product is deleted (snapshots must preserve image references per the Snapshot Principle)
- Image changes are included in product snapshots, meaning prior images must remain accessible

**Image Delivery**
- The first image of a product serves as the thumbnail in search results, category listings, and the product listing page
- All images are displayed on the product detail page
- Seller logo images are displayed on seller profile pages and referenced in order history

To support consistent image delivery across all product listings, search results, and customer views, image storage should be served through a content delivery mechanism that reduces latency for customers regardless of geographic location. The delivery mechanism must support serving the same image to multiple simultaneous viewers, as product detail pages and search results are accessed concurrently by many customers.

### Capacity Planning Considerations

Capacity planning for the platform must account for the following factors based on the requirements:

**Image Storage Growth**
- Each product can have multiple images, and sellers can add and reorder images over time
- Snapshots preserve prior image states, so deleted or replaced images remain stored for historical access
- Seller logo images are updated via profile edits, and each edit creates a snapshot that preserves the prior logo

**Snapshot Data Growth**
- Snapshots accumulate over time and are immutable (they cannot be deleted)
- Each product edit, variant edit, seller profile edit, review edit, cancellation response, and refund response generates a snapshot
- Order item snapshots are created on every purchase and preserved permanently for seller records and legal purposes
- Snapshot data volume grows proportionally with platform activity (product edits, orders placed, reviews edited, cancellation/refund resolutions)

**Inventory Record Growth**
- Each restock, order placement, adjustment, cancellation, and refund generates an inventory record for the affected variant
- Inventory records accumulate over time and are used to calculate current stock quantities

**Retention Implications**
- Orders and order history are preserved even after customer or seller account deletion (for seller records and legal purposes)
- Snapshots are preserved even after product deletion
- Customer reviews are preserved (shown as "deleted user") after customer account deletion
- Seller products are deleted when the seller deletes their account, but order history snapshots remain

Because the user requirements do not specify target volumes, file size limits, or performance metrics, specific storage capacity numbers, bandwidth thresholds, and CDN configuration details are determined during the technical design phase based on projected platform scale.

# External Dependency SLOs

Service level objectives for external dependency availability.

## External Dependency SLOs

Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.

### External Dependency Availability

The platform depends on an external payment gateway service to process customer payments during checkout. This is the only external dependency of the platform.

**Availability Scope**
- The payment gateway is required for completing the checkout and payment workflow.
- When the payment gateway is available, the platform can process payments normally.
- When the payment gateway is unavailable, customers cannot complete checkout or place orders.
- Unavailability of the payment gateway does not affect any other platform feature — customers can still browse products, manage accounts, view order history, and perform all other non-payment operations.

**Single Dependency**
- The platform uses one external payment gateway for all payment processing.
- No alternative or fallback payment gateway is provided.
- If a specific transaction fails while the gateway is available (e.g., payment declined), the customer can retry without platform intervention.

### Payment Processing Timeout Behavior

When the platform communicates with the external payment gateway for payment processing, a timeout defines how long the platform waits for a response before considering the payment attempt as failed.

**Timeout Handling**
- If the payment gateway does not respond within the configured timeout duration, the payment is treated as failed.
- No order is created when a payment times out.
- The customer is informed that the payment could not be completed and is asked to retry.

**Timeout During Checkout**
- A timed-out payment does not create a partial or duplicate charge.
- The customer's cart contents are preserved after a timeout, allowing the customer to retry checkout.
- The timeout duration is configured to balance reasonable processing time with customer experience expectations.

### Degradation During Reduced Performance

When the external payment gateway is available but operating with reduced performance (slower response times, intermittent failures, or partial availability), the platform handles degradation as follows:

**During Degradation**
- Payment processing may take longer than usual. The platform may indicate to the customer that processing is taking longer than expected.
- If response times exceed the timeout threshold, payments are treated as failed (as defined in Payment Processing Timeout Behavior).
- All other platform features continue to operate normally during payment gateway degradation.

**Extended Degradation**
- The platform continues to attempt payment processing through the degraded gateway.
- Customers are not prevented from attempting checkout during degradation periods.
- No automatic switch to an alternative payment gateway occurs, as none is provided.

### Recovery After External Dependency Outage

When the external payment gateway recovers from an outage or degradation period, the platform returns to normal payment processing without manual intervention.

**Recovery Behavior**
- The platform does not automatically queue or retry payments that failed during the outage. Customers whose payments failed must retry manually.
- Order creation resumes normally for successful payments once the gateway becomes responsive.

**Data Preservation**
- No data loss occurs during payment gateway outages. Customer carts, product listings, account information, and order history remain intact and unaffected.
- Payment gateway availability status does not affect any stored platform data — data retention and integrity are independent of external dependency availability.

**Administrator Awareness**
- Administrators can monitor payment gateway availability and responsiveness to detect outages and degradation periods.