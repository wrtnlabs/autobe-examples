**shoppingMall — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

The shopping mall platform assigns clear ownership of data to the entities that create or control them. This ownership determines who can manage, view, and delete data.

**Customer-Owned Data**

Customers own their account information, including email, password, display name, and phone number. Customers also own their shipping addresses, wishlist contents, shopping cart contents, order history, and product reviews they have written.

**Seller-Owned Data**

Sellers own their account information, including email, password, shop name, shop description, and logo image. Sellers own all products they create, including product details, images, variants, and inventory records. Sellers also own shipments they create for order items.

**Platform-Owned Data**

The platform (managed by administrators) owns category data, including category names, descriptions, and parent-child relationships. Categories are not owned by any individual user.

**Shared Ownership**

Order items have shared ownership between the customer who purchased them and the seller who sold them. Both parties can view order item details, but only the customer can request cancellations or refunds, and only the seller can process shipments and respond to requests.

Snapshots are owned by the entity whose data was captured. Product snapshots belong to the product owner (seller), review snapshots belong to the review author (customer), and seller profile snapshots belong to the seller.

Cancellation requests and refund requests are owned by the customer who created them, but the relevant seller can view and respond to these requests.

### Data Isolation

The shopping mall platform maintains strict data isolation boundaries to protect user privacy and prevent unauthorized access to sensitive information.

**Customer Data Isolation**

Customer account information is isolated so that only the account owner and platform administrators can access it. Customer shipping addresses are visible only to the customer and administrators. Customer wishlists are completely private and visible only to the account owner. Customer shopping carts are completely private and visible only to the account owner. Customer order history is visible only to the account owner and administrators.

**Seller Data Isolation**

Seller account information is isolated so that only the account owner and platform administrators can access it. Seller inventory records are visible only to the seller and administrators. Seller dashboard data, including order summaries and request counts, is visible only to the seller and administrators.

**Product Data Isolation**

Product listings are publicly visible to all users for browsing and purchasing. However, product inventory levels are isolated so that only the seller and administrators can view exact stock quantities. Customers can only see whether a product is in stock or out of stock.

**Order Data Isolation**

Order data is isolated so that only the purchasing customer, the relevant seller (for items they sold), and administrators can access it. Other customers cannot view order information. Other sellers cannot view orders for products they did not sell.

**Request Data Isolation**

Cancellation requests and refund requests are isolated so that only the requesting customer, the relevant seller, and administrators can access them. Other users cannot view these requests.

**Snapshot Data Isolation**

Snapshots are isolated based on the entity they capture. Product snapshots are visible to the product owner and administrators. Review snapshots are visible to the review author and administrators. Seller profile snapshots are visible to the seller and administrators. Order item snapshots are visible to the purchasing customer, the relevant seller, and administrators.

### Access Control

The shopping mall platform implements access control policies that determine what actions different user roles can perform on various types of data.

**Customer Access**

Customers can read and modify their own account information, including display name and phone number. Customers can create, read, update, and delete their own shipping addresses. Customers can add products to and remove products from their own wishlist. Customers can add variants to and remove variants from their own shopping cart. Customers can view their own order history and order details. Customers can view all public product listings and product details. Customers can view all public seller profiles. Customers can view all public categories. Customers can view all public reviews. Customers can create, edit, and delete their own reviews for products they have purchased.

**Seller Access**

Sellers can read and modify their own account information, including shop name, description, and logo. Sellers can create, read, update, and delete their own products. Sellers can create, read, update, and delete their own product variants. Sellers can view and modify their own inventory records. Sellers can view order items for products they have sold. Sellers can view and respond to cancellation requests for their products. Sellers can view and respond to refund requests for their products. Sellers can view snapshots of their own products and seller profiles.

**Administrator Access**

Administrators can view all customer account information. Administrators can view all seller account information. Administrators can create, read, update, and delete all categories. Administrators can view all product listings and product details. Administrators can view all product snapshots. Administrators can view all order information. Administrators can approve or reject seller registration requests. Administrators can suspend or unsuspend seller accounts. Administrators can ban or unban customer accounts. Administrators can ban or unban seller accounts. Administrators can delete any product for policy violations. Administrators can force-cancel or force-refund order items.

**Super Administrator Access**

Super administrators can view and modify all administrator account information. Super administrators can promote regular administrators to super administrator status. Super administrators can demote super administrators to regular administrator status.

### Privacy Boundaries

The shopping mall platform establishes privacy boundaries that govern data visibility, preservation, and user control over personal information.

**Account Deletion Privacy**

When a customer deletes their account, their profile information is permanently deleted. However, their order history is preserved for seller records and legal purposes. Their reviews are preserved but displayed with the reviewer shown as "deleted user" instead of their name.

When a seller deletes their account, their products are removed from listings. However, their order history and product snapshots are preserved. Their shop name in past orders is preserved to maintain order record integrity.

**Suspension Privacy**

When a seller is suspended by an administrator, their products are hidden from search results and category listings. Their products cannot be purchased while suspended. However, the seller can continue processing existing orders, including shipping items and responding to cancellation or refund requests.

**Ban Privacy**

When a customer is banned by an administrator, they cannot log into their account. However, their existing orders are preserved and remain accessible to sellers and administrators.

When a seller is banned by an administrator, they cannot log into their account. However, their existing orders remain intact and can be viewed by customers and administrators.

**Public Visibility**

Product reviews are publicly visible on product detail pages. Product listings are publicly visible to all users. Seller profiles are publicly visible to all users. Categories are publicly visible to all users.

**Private Data**

Customer wishlists are private and visible only to the account owner. Customer shopping carts are private and visible only to the account owner. Customer shipping addresses are private and visible only to the account owner and administrators. Customer order history is private and visible only to the account owner and administrators. Seller inventory records are private and visible only to the seller and administrators. Seller dashboard data is private and visible only to the seller and administrators.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete Behavior

When a customer deletes their account, their profile information is removed from the system, but their order history and reviews are retained for seller records and legal purposes. Deleted customer reviews continue to appear in product reviews but are attributed to "deleted user" instead of the customer's name.

When a seller deletes their account, their products are removed from search results and category listings, but order history and product snapshots are preserved. The seller's shop name and logo at the time of purchase remain visible in past orders.

When a seller deletes a product, the product and all its variants are removed from search and category listings, but all snapshots of the product and its variants are preserved. Products with pending order items (paid or shipped status) cannot be deleted.

When a customer deletes a review, the review is removed from the product's visible reviews, but the review snapshot is preserved for dispute resolution.

When a seller's account is suspended by an administrator, their products are hidden from search and category listings and cannot be purchased, but existing orders continue processing normally.

All soft-deleted data maintains its relationships to other entities. Order items reference deleted products through snapshots, and deleted seller profiles are preserved in historical order records.

### Data Retention Policies

Order history and order item snapshots are retained indefinitely for legal compliance and seller record-keeping purposes. This includes product details, variant information, pricing, and seller profile information at the time of purchase.

Product snapshots are retained indefinitely, even after the product is deleted. This preserves the complete history of product changes for dispute resolution and audit purposes.

Seller profile snapshots are retained indefinitely, even after the seller deletes their account. This ensures that shop names and logos at the time of purchase remain accessible in historical orders.

Review snapshots are retained indefinitely, even after a customer deletes their review. This preserves the history of review changes for dispute resolution.

Cancellation and refund request snapshots are retained indefinitely to document the complete history of request states and seller responses.

Inventory records are retained indefinitely to maintain a complete audit trail of stock changes, including restocking, order fulfillment, cancellations, and refunds.

### Data Recovery Options

Administrators can restore suspended seller accounts, making their products visible again in search and category listings and allowing them to create and edit products.

Administrators can restore banned customer accounts, allowing them to log in and use the platform again.

Administrators can restore banned seller accounts, allowing them to log in and use the platform again, subject to any pending approval requirements.

Customers cannot recover deleted reviews. Once a review is deleted, it cannot be restored, though the review snapshot remains available for dispute resolution.

Customers cannot recover deleted account information. Once an account is deleted, the profile information cannot be restored, and the customer must create a new account to use the platform.

Sellers cannot recover deleted account information. Once an account is deleted, the profile information cannot be restored, and the seller must submit a new registration request to use the platform.

Sellers cannot restore deleted products. Once a product is deleted, it cannot be restored.

Sellers cannot restore deleted product variants. Once a variant is deleted, it cannot be restored.

### Permanent Deletion

Customer profile information (display name and phone number) is permanently deleted when a customer deletes their account. This information cannot be recovered.

Seller profile information (shop name, shop description, and logo) is permanently deleted when a seller deletes their account. This information cannot be recovered.

Deleted products are permanently removed from the product catalog and cannot be recovered by customers or other sellers. Only the product owner (seller) or administrators can restore them under the conditions specified in the recovery policy.

Deleted product variants are permanently removed from the product catalog and cannot be recovered by customers or other sellers. Only the product owner (seller) or administrators can restore them under the conditions specified in the recovery policy.

Snapshots are never permanently deleted. All snapshots of products, variants, seller profiles, reviews, cancellation requests, and refund requests are retained indefinitely for dispute resolution and audit purposes.

Order history is never permanently deleted. All order records, order items, and associated snapshots are retained indefinitely for legal compliance and seller record-keeping.

Inventory records are never permanently deleted. All inventory change records are retained indefinitely to maintain a complete audit trail of stock movements.

When a seller is suspended, their products remain in the system but are hidden from customers. The products are not permanently deleted and can be made visible again when the suspension is lifted.

# External Dependency SLOs

Service level objectives for external dependency availability.

## External Dependency SLOs

Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.

### Payment Gateway Dependency

THE shopping mall platform SHALL integrate with an external payment gateway for processing customer payments.

WHEN a customer places an order, THE shopping mall platform SHALL send payment information to the external payment gateway.

WHEN the payment gateway returns a success response, THE shopping mall platform SHALL create the order and decrease stock quantities.

WHEN the payment gateway returns a failure response, THE shopping mall platform SHALL NOT create the order and SHALL allow the customer to retry payment.

THE shopping mall platform SHALL handle payment gateway communication failures gracefully and allow customers to retry their order.

THE shopping mall platform SHALL NOT proceed with order creation until payment is confirmed by the external payment gateway.

### External Service Availability Handling

THE shopping mall platform SHALL detect when the external payment gateway is unavailable.

WHEN the payment gateway is unavailable, THE shopping mall platform SHALL inform the customer that payment cannot be processed at this time.

WHEN the payment gateway is unavailable, THE shopping mall platform SHALL allow the customer to retry the payment later.

THE shopping mall platform SHALL NOT create orders when the payment gateway is unavailable.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Image Storage Requirements

THE platform SHALL store product images uploaded by sellers for each product listing.

THE platform SHALL store seller profile logo images.

THE platform SHALL support multiple images per product, with sellers able to add, reorder, and delete images.

Image changes (uploads, deletions, reordering) are recorded in product snapshots to preserve the state of images at any point in time.

Product images and seller logos are served to customers when browsing products and viewing seller profiles.

Image storage capacity is determined by the volume of products and images uploaded by sellers on the platform.

Storage requirements scale based on the number of products, variants, and associated images in the system.