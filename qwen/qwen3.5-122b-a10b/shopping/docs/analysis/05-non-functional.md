**ecommerce — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Data ownership is clearly defined for all entities in the platform:

- Customer account data (profile, addresses, wishlist, cart) is owned by the customer
- Seller account data (shop profile, products, inventory) is owned by the seller
- Order data is jointly owned: the customer owns their order record, while each seller owns the order items for their products
- Product data (including variants, images, inventory) is owned by the seller who created it
- Review data is owned by the customer who wrote it
- Snapshot data is owned by the platform and accessible to relevant parties for dispute resolution

Each user has exclusive ownership and control over their personal data. Users can modify or delete their owned data within the constraints of business requirements (e.g., preserving order history for legal purposes).

### Privacy and Account Deletion

Customer account deletion follows these privacy rules:

- When a customer deletes their account, their profile information (display name, phone number, email) is permanently deleted
- The customer's orders and order history are preserved in the system for seller records and legal purposes
- The customer's reviews are preserved but displayed as "deleted user" to maintain review integrity while protecting privacy
- The customer's addresses are deleted
- The customer's wishlist is deleted
- The customer's cart is deleted

Seller account deletion follows these privacy rules:

- When a seller deletes their account, their products are removed from all listings and search results
- Order history and snapshots are preserved to maintain transaction records
- The seller's shop name in past orders is preserved to maintain order history integrity
- The seller's profile information (shop name, description, logo) is no longer editable

All account deletions are subject to business constraints (e.g., sellers cannot delete accounts with pending orders or cancellation/refund requests).

### Access Control and Data Visibility

Access control defines who can view and modify data:

**Customer Access**
- Customers can view and modify their own profile, addresses, wishlist, and cart
- Customers can view all products, categories, and seller profiles on the platform
- Customers can view their own orders and order history
- Customers can view reviews on products they have not purchased

**Seller Access**
- Sellers can view and modify their own shop profile, products, variants, and inventory
- Sellers can view order items for their products (including items from other sellers in the same order)
- Sellers can view snapshots of their own products
- Sellers cannot view other sellers' products, profiles, or order items

**Administrator Access**
- Administrators can view all data on the platform (products, orders, users, snapshots)
- Administrators can view snapshots of any product for oversight purposes
- Administrators can view all customer and seller accounts
- Administrators can view all cancellation and refund requests

**Snapshot Access**
- Owners can view snapshots of their own data (products, reviews, cancellation requests, refund requests)
- Administrators can view snapshots of any data on the platform
- Snapshots are immutable and preserved even after the original data is deleted

### Data Isolation

Data isolation ensures separation between users:

**Customer Isolation**
- Customers cannot view other customers' orders, addresses, wishlist, or cart
- Customer data is completely isolated from other customers

**Seller Isolation**
- Sellers cannot view other sellers' products, profiles, inventory, or order items
- Each seller only sees order items for their own products
- Sellers cannot access other sellers' data even when processing multi-seller orders

**Order Isolation**
- Order items from different sellers are processed independently
- Each seller only sees and manages the order items for their products
- Shipment tracking is visible to customers for all shipments, but sellers only see shipments they created

**Review Isolation**
- Reviews are publicly visible on product detail pages
- Review ownership is tracked but review content is accessible to all users
- Deleted user reviews are preserved but anonymized

**Administrative Oversight**
- Administrators can view all data across all isolation boundaries
- Administrators can intervene in any order, product, or user account
- Administrative actions are logged and visible to super administrators

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Customer Account Deletion

When a customer deletes their account, their profile information (display name, phone number) is immediately removed from the system. Their orders and order history are preserved and cannot be deleted, as these records are required for seller transactions and legal compliance purposes. Reviews written by the customer are preserved but the author name is replaced with "deleted user" to maintain review integrity while protecting the customer's privacy.

### Seller Account Deletion

When a seller deletes their account, their products are immediately removed from all search results and category listings. Order history and product snapshots are preserved to maintain transaction records. The shop name associated with past orders is preserved in those order records to maintain historical accuracy. Sellers can only delete their account if they have no pending orders (paid or shipped status) and no pending cancellation or refund requests.

### Product Deletion

When a product is deleted by a seller, it is immediately removed from search results and category listings and cannot be purchased. All product variants and their inventory records are also deleted. However, product snapshots are preserved permanently and remain accessible to administrators for dispute resolution. Order items that reference the deleted product retain their snapshot data, preserving the product name, description, variant options, and price at the time of purchase.

### Review Deletion

When a customer deletes a review, the review content is marked as deleted and no longer contributes to the product's average rating calculation. However, the review snapshot is preserved permanently and remains accessible to relevant parties (the customer who wrote it and administrators) for dispute resolution purposes. The review entry remains visible on the product detail page but is marked as deleted.

### Snapshot Retention

All snapshots created by the system are immutable and cannot be deleted under any circumstances. This includes product snapshots, product variant snapshots, seller profile snapshots, order item snapshots, review snapshots, cancellation request snapshots, and refund request snapshots. Snapshots preserve the complete state of data at the time of modification and serve as the authoritative record for dispute resolution.

### Address Deletion

When a customer deletes a shipping address, the address is immediately removed from their address list and can no longer be selected for new orders.

### Wishlist Cleanup on Product Deletion

When a product is deleted by its seller, it is automatically removed from all customer wishlists. This ensures that customers cannot attempt to purchase products that no longer exist. The removal from wishlists is immediate and irreversible.

### Category Deletion Impact

When a category is deleted by an administrator, products that were assigned to that category become uncategorized. These products remain visible and purchasable but are no longer associated with any category. Products in subcategories are also affected when their parent category is deleted.

### Account Ban Data Retention

When a seller account is banned by an administrator, the account cannot be used to log in. However, existing orders placed by customers for that seller's products remain intact and can still be processed (shipping, cancellation requests, refund requests). The seller's products remain visible and purchasable until the seller is suspended or the products are deleted.

### Seller Suspension Data Handling

When a seller is suspended by an administrator, their products are hidden from search and category listings and cannot be purchased. However, order history, product snapshots, and inventory records are preserved. When the seller is unsuspended, their products become visible again without requiring restoration of any data.

# External Dependency SLOs

Service level objectives for external dependency availability.

## External Dependency SLOs

Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.

### Payment Gateway Dependency

The platform integrates with an external payment gateway for processing customer payments during checkout.

The payment gateway is the only external dependency explicitly required by the system. All other platform functionality operates independently without external service dependencies.

When the payment gateway is unavailable, customers cannot complete the checkout process. The system will display an appropriate message indicating that payment processing is temporarily unavailable and invite customers to retry later.

### Dependency Availability Expectations

The system does not define specific service level objectives or availability targets for the payment gateway, as these are determined by the payment gateway provider.

The platform assumes the payment gateway will be available during normal business hours. No specific uptime percentage, response time threshold, or availability guarantee is specified in this document.

Any service level agreements with the payment gateway provider are external to this specification and are managed through separate contractual arrangements.

### Payment Request Timeout Handling

The system does not implement specific timeout thresholds for payment gateway requests. Timeout behavior is handled by the payment gateway integration layer.

If a payment request does not receive a response within the integration layer's configured timeout period, the payment is treated as failed and the order is not created.

Customers may retry the payment after a failed request.

### Degradation and Recovery Behavior

When the payment gateway is unavailable or experiencing degraded performance, the platform enters a degraded state for checkout functionality only.

During payment gateway degradation:
- Customers cannot complete new orders
- Customers can still browse products, manage their cart, and view order history
- Customers can still manage their profiles, addresses, and wishlists
- Sellers can still manage their products and view orders
- Administrators can still perform all administrative functions

The platform does not implement automatic fallback mechanisms or alternative payment providers. When the payment gateway recovers, normal checkout functionality resumes automatically.