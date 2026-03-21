**ecommerceMall — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership Principles

All data created within the platform is owned by the account that created it. Customers own their personal profiles, shipping addresses, wishlists, shopping carts, order history, and reviews. Sellers own their shop profiles, products, product variants, and inventory records. The platform itself does not claim ownership over user-generated content.

When an account is deleted, ownership transfers to the platform for the purpose of legal record-keeping. Deleted customer orders and order history remain available to the platform for seller records and legal compliance. Reviews written by deleted customers are preserved but displayed with an anonymous "deleted user" label instead of the original account information.

Deleted seller order history and order item snapshots are preserved with the seller's shop name as it appeared at the time of purchase.

### Data Isolation Between Accounts

The platform enforces strict data isolation between accounts. Customers cannot access another customer's personal information, addresses, orders, wishlists, or cart contents. Sellers cannot access another seller's products, inventory data, or order information. This isolation applies to all read and write operations.

Customers can view seller profiles (shop name, description, and logo) as part of the shopping experience. However, sellers cannot view customer personal information beyond what is necessary to fulfill orders, such as shipping addresses for their own order items.

Administrators have elevated access to view all data on the platform for oversight purposes, including all customer accounts, seller accounts, products, and orders.

### Access Control by Role

Access to data follows a role-based model. Customers have full access to their own profiles, addresses, orders, wishlists, and cart. Sellers have full access to their own shop profile, products, variants, inventory records, and order items for their products. Both customers and sellers can access snapshots of data they own.

Customers can view the shop profiles of sellers from whom they have purchased items, as this information is preserved in their order records. Sellers can view the profiles of their own shop but cannot view other sellers' shop profiles.

Administrators can access all data on the platform, including viewing snapshots of any product or reviewing any order. Super administrators have additional capabilities to manage other administrators and overall platform oversight.

### Privacy Boundaries

Customer personal information is visible only to the customer who owns it and to platform administrators. Shipping addresses are only shared with sellers when those sellers fulfill orders for the customer.

When a customer deletes their account, their profile information (display name and phone number) is permanently removed. However, their orders remain linked to the platform for historical and legal purposes, and their reviews remain visible with an anonymous identifier.

Seller profiles are publicly visible to all customers browsing the platform. This is intentional to support the shopping experience. Sellers cannot hide their shop information from customers.

### Order Data Visibility

When customers place orders, the order items preserve snapshots of the product details, variant information, and seller shop profile as they existed at the time of purchase. These snapshots allow both customers and sellers to reference what was actually sold, even if the product or shop profile changes later.

Order items remain accessible to the customer who placed the order and to the seller whose product was purchased. Sellers can see which of their products were purchased and the shipping address needed to fulfill the order. Customers can see what they purchased and the seller information.

Administrators can view all order records and associated snapshots to resolve disputes or investigate issues.

### Review and Rating Privacy

Product reviews are visible to all platform visitors on the product detail page. When a customer deletes their account, their reviews are retained but the author display changes to "deleted user." This preserves the review content and rating while removing the link to personal account information.

Review snapshots are created when reviews are edited, capturing the previous rating and text content. These snapshots help resolve disputes about what was originally written.

Only the customer who wrote a review can edit or delete it. Administrators can view all reviews but cannot modify customer reviews.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete Policy

When customers delete their account, their personal profile information is permanently removed while their transactional records remain for legal and business purposes.

When sellers delete their account, their products are removed from all listings and search results, but their transactional history and order data are preserved to maintain complete records for customers and business operations.

When products are deleted by sellers, they no longer appear in search results or category listings, but all associated snapshots remain accessible for historical reference and dispute resolution.

When product variants are removed, they are marked as unavailable in any customer carts rather than being physically removed, informing customers that the item can no longer be purchased.

### Data Retention Principles

Order history is preserved indefinitely to support ongoing customer service, dispute resolution, and legal compliance. This includes all order items, shipping information, and payment records.

Product snapshots are retained indefinitely as part of the platform's commitment to transaction integrity, allowing parties to reference the exact state of products and seller information at the time of purchase.

Seller profile snapshots attached to order items are preserved to maintain accurate historical records of shop names and logos as they appeared when orders were placed.

Review snapshots are kept to preserve the history of rating changes and content edits, supporting transparency in the review system.

Customer accounts that are deleted have their personal information removed immediately, while their order history, reviews (displayed as from a deleted user), and related snapshots remain accessible to administrators and relevant parties.

Cancellation and refund request snapshots are retained to document the complete history of status changes and decisions for each request.

### Data Recovery Limitations

Deleted accounts cannot be recovered. Once a customer or seller initiates account deletion, the personal information is permanently removed and cannot be restored.

Products that are deleted by sellers cannot be restored by the seller. If a seller wishes to make the product available again, they must create a new product listing from scratch.

Individual reviews that are deleted by customers cannot be recovered. Customers who wish to provide feedback again must submit a new review for their qualifying purchases.

Cancelled or refunded order items cannot be reversed. If a customer or seller believes an error was made, they must contact administrator support for manual review and resolution.

Administrators have the ability to view all historical snapshots and deleted records for dispute resolution purposes, though they cannot restore deleted accounts or products on behalf of users.

### Permanent Deletion Rules

Personal profile information including display names, phone numbers, and account credentials are permanently deleted when a customer account is deleted. This data is not recoverable.

Shipping addresses associated with deleted customer accounts are permanently removed and cannot be recovered.

Seller profile information including shop names, descriptions, and logos are permanently deleted when a seller account is deleted. The shop name appearing on historical order records is preserved through snapshots and cannot be restored as an active shop.

Product inventory records are deleted along with their parent products when a seller deletes a product. These records are not recoverable through the system.

Cart items and wishlist entries are permanently removed when a customer account is deleted. These items cannot be recovered.

All snapshot records are immutable and cannot be permanently deleted. They are preserved for the lifetime of the platform to support transaction integrity and dispute resolution.

# External Dependency SLOs

Service level objectives for external dependency availability.

## External Dependency SLOs

Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.

### External Service Dependencies

The platform integrates with external services for critical operations.

### Payment Gateway Integration

The platform communicates with an external payment gateway to process customer payments. This external dependency is required for order creation.

### Dependency Monitoring

The system shall monitor the availability of external service dependencies. When an external service becomes unavailable or unresponsive, the platform shall detect this condition and respond according to defined policies.

### Dependency Inventory

External services that the platform depends on include:
- Payment gateway (for processing payments during checkout)

Other external service integrations may be added as the platform evolves.

### Timeout Thresholds

All communications with external services shall be subject to defined timeout thresholds to prevent indefinite waiting.

### Timeout Behavior

When a request to an external service exceeds the defined timeout threshold:
- The request shall be terminated
- The operation shall be marked as failed
- The customer shall be notified that the operation could not be completed
- The platform shall not create any pending state that requires manual cleanup

### Timeout Handling for Payments

When a payment request times out:
- The order shall not be created
- The customer shall be notified of the timeout
- The customer shall be given the option to retry the payment
- Stock quantities shall not be reserved for timed-out requests

### Degradation Policies

When external services are unavailable or experiencing degraded performance, the platform shall follow defined degradation policies to maintain data consistency and user experience.

### Degraded Service Mode

When the payment gateway is unavailable:
- Customers shall be able to browse products, manage their wishlist, and view their cart
- Customers shall be able to add items to their cart and adjust quantities
- Customers shall not be able to place orders while the payment service is unavailable
- Clear messaging shall inform customers that checkout is temporarily unavailable

### Recovery Behavior

When an external service becomes available again after being unavailable:
- The platform shall resume normal operations automatically
- Customers shall be notified when checkout becomes available again
- No manual intervention shall be required to restore functionality

### Order Integrity During Outages

The platform shall ensure order integrity when external dependencies are unavailable. Specifically:
- No partial orders shall be created
- No stock shall be reserved for incomplete transactions
- No customer data shall be locked or made inaccessible

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Image Storage Architecture

Product images uploaded by sellers and seller profile logos are stored in a file storage system separate from the primary database. Each image is assigned a unique identifier and stored with its associated metadata including upload timestamp and display order. The storage system maintains data ownership records linking each stored file to its originating seller account. Storage retention policies govern how long product images and logos remain accessible based on the lifecycle of their associated products and seller accounts.

### Content Delivery Network Distribution

Uploaded images are distributed through a content delivery network to ensure consistent access across different geographic regions. Product images and seller logos served through the content delivery network maintain their original quality while remaining available to customers throughout the defined retention period. The distribution system supports the data recovery procedures by maintaining accessible copies of stored images.

### Capacity Planning Guidelines

Storage capacity planning accounts for the total number of sellers, average products per seller, and average images per product. As the platform grows and sellers upload additional content, the storage system must support horizontal scaling to accommodate increased demand without service degradation.

### Storage Redundancy

Storage systems maintain redundancy to protect against data loss. Image files are replicated across multiple storage nodes to ensure availability even if individual storage components fail. This redundancy ensures that product images and seller logos remain accessible throughout normal platform operations.

### Storage Lifecycle Management

When products are deleted from the platform, associated images remain in storage for a retention period before permanent removal. This approach allows for dispute resolution and audit purposes while eventually freeing up storage capacity. Seller profile logos are retained as part of historical order snapshots even after seller account deletion.