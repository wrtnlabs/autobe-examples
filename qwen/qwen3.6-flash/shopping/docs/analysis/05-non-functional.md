**ecommerceMall — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership Responsibilities

### Customer Data Ownership and Isolation
Customers own and exclusively maintain their `Customer` accounts, `ShippingAddress` entries, `Review` records, and `WishlistItem` records. Data isolation is strictly enforced within the `ecommerceMall` platform so that no `Customer` can view, interact with, or alter the `Order` records, `ShippingAddress` entries, or `Review` records belonging to other `Customers`.

### Seller Data Ownership and Isolation
Sellers own and exclusively maintain their `Seller` accounts, `SellerProfile` records, `Product` entities, and associated `ProductVariant` and `InventoryRecord` entities. Sellers also own the `Shipment` records they manage, and the `CancellationRequest` and `RefundRequest` records they process. Data isolation guarantees that `Sellers` cannot access, modify, or view the business records, `Product` data, or `SellerApproval` statuses of other `Sellers`.

### Platform Oversight
`Admin` accounts own and manage platform-wide data integrity. `Admins` control `Category` structures and `AdminRequest` records. `Admins` operate with broad platform access rights to view `Customer` accounts, `Seller` accounts, `Product` data, `OrderItem` records, and `SellerApproval` states to handle moderation, disputes, and general platform management.

### Access Control and Privacy Boundaries

### Access Control and Profile Management
Access control defines the operational boundaries for interacting with business records across the platform. `Customers` are granted exclusive control to view and modify their own `Customer` accounts, `ShippingAddress` records, and `WishlistItem` entries. `Sellers` are granted exclusive control to view, update, and manage their own `SellerProfiles`, `Products`, `ProductVariants`, `Shipments`, `CancellationRequests`, and `RefundRequests`. `Customers` may view public `SellerProfile` records and `Categories` to browse the marketplace.

### Privacy Boundaries
Information privacy is maintained by strictly governing data visibility. Platform browsing data, including `SellerProfile` records and `Categories`, is publicly accessible to all platform users. Customer information privacy is strictly protected. A `Customer`'s `Customer.email address`, `Customer.display name`, and `ShippingAddress` entries are shielded from public view. Shipping addresses are exclusively accessible to the owning `Customer`, the relevant `Seller` during an active `Shipment` fulfillment, and `Admin` personnel. `Review` records are displayed on `Product` pages, but privacy settings ensure the reviewing `Customer`'s `Customer.email address` is never exposed on the public page.

### Administrative Privileges
Administrators utilize their elevated access control to oversee platform health. `Admin` privileges grant administrators visibility into all `Customer` and `Seller` accounts, `OrderItem` records, `Product` data, `Snapshot` entities, and `SellerApproval` statuses. These access controls support administrative actions, including approving or rejecting `SellerApproval` requests, managing `Category` hierarchies, and reviewing `Snapshot` records established for dispute resolution and moderation.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-Delete and Retention Mechanisms

- When a customer submits an account deletion request, the system performs a soft-delete on the customer profile, removing their Customer.display name from active interfaces while retaining their order history and details for legal and seller record-keeping.
- When a seller account is deleted, the system soft-deletes the seller's profile and associated shop name; their past orders and products remain visible in historical records and are preserved indefinitely.
- Deleting a product constitutes a soft-delete operation, where the product is removed from search, category views, and storefronts, but its underlying data and associated snapshots are preserved within the ecommerceMall system.
- When a review is deleted by its author, the system soft-deletes the review from the public product page, replacing the user's name with "deleted user" while keeping the review data in the system for moderation and historical accuracy.
- Regardless of soft-delete operations on products, reviews, or user accounts, the system maintains all corresponding snapshots to allow administrators to track historical changes for dispute resolution and compliance.

### Data Recovery and Permanent Deletion

- Once a customer or seller account deletion is confirmed, the action is treated as a permanent-deletion; the account and its associated session data cannot be recovered or restored by any actor within the platform.
- Permanent deletion of a customer account permanently severs the association between the Customer.email address and the user profile; the Customer.email address cannot be used to recover the deleted account or re-registered as a distinct entity by the same user.
- When a seller permanently deletes a product, the product and its variants are permanently removed from the product catalog and cannot be brought back into active use; sellers cannot recover permanently deleted products.
- Administrators possess the authority to execute a permanent-deletion on specific user or data records for security purposes or policy violations, bypassing all standard recovery mechanisms.
- Snapshot records are fundamentally protected from permanent-deletion; while they exist alongside other data, they remain immutable and persist forever, providing a permanent historical record even after the original data entities have been permanently-deleted.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Coverage: Storage Capacity

The system shall allocate scalable storage capacity required to host all Product images and SellerProfile logo images uploaded by users. Because sellers are permitted to upload multiple Product images, reorder them, and maintain a persistent logo image for their SellerProfile, the system capacity must grow proportionally as the total number of active Products and seller accounts increases over time. The platform shall guarantee adequate storage capacity to safely retain all media assets without requiring manual over-provisioning. Additionally, Product images, SellerProfile logo images, and Product thumbnails shall be distributed through a Content Delivery Network (CDN) to ensure rapid and reliable image accessibility for customers visiting the ecommerceMall from any location. By leveraging the CDN to cache and deliver Product thumbnails, full-resolution Product images, and SellerProfile logo images via localized edge nodes, the system guarantees consistently fast image loads and high availability even during heavy browsing periods.

# External Dependency SLOs

Service level objectives for external dependency availability.

## External Dependency SLOs

Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.

### Payment Gateway Dependency Slo and Timeout Configuration

The ecommerceMall platform relies exclusively on an external payment gateway to process all customer financial transactions. The specific service level objectives (SLOs) required to maintain a healthy dependency relationship are contingent upon the vendor's service agreement and internal risk tolerances, to be established during vendor integration.

Timeout Management:
- When the platform initiates a transaction request to the external payment gateway, the platform waits for a confirmed response.
- If the external payment gateway exceeds the configured timeout threshold without returning a result, the platform must immediately halt the order creation process.
- The platform must strictly prevent the creation of partial order records, incomplete transaction logs, or inventory record adjustments when a timeout occurs.
- A system error message is displayed to the customer, effectively stopping their current checkout flow.

### Payment Gateway Degradation and External Availability Policies

External Availability:
- The platform's capacity to finalize new orders is entirely dependent on the external availability of the payment gateway.
- While independent platform features—such as product browsing, customer account management, and catalog operations—remain functional, order completion is blocked if the payment gateway is completely offline or unreachable.

Degradation Policies:
- If the external payment gateway experiences intermittent failures or elevated latency rather than a complete outage, the platform must implement graceful degradation. Checkout attempts must be paused, and a temporary service delay notice is provided to the customer.
- If the external payment gateway experiences a sustained outage, the platform must display a service unavailability message during the checkout process.
- No alternative payment processing methods, manual order entry workarounds, or offline transaction logging systems are implemented. Customers are instructed to resume their transaction attempts once the external service is fully restored.