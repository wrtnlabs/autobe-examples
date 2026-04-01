**shoppingMall — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Customers own their personal profile information, including display name and phone number.
Customers own their shipping addresses and can manage them independently.
Customers own their wishlist and shopping cart contents.
Customers own their order history and can view all orders they have placed.
Customers own the reviews they write and can edit or delete them.

Sellers own their shop profile information, including shop name, description, and logo.
Sellers own the products they create and can manage them independently.
Sellers own the inventory records for their product variants.
Sellers own the order items for products they sell and can manage shipping and responses to cancellation or refund requests.

The platform owns all snapshot records, which are preserved for legal and dispute resolution purposes.
Snapshots cannot be deleted or modified by any user, including the original data owner.

Account deletion behavior is defined in the Soft-Delete Behavior section.

### Data Isolation

Each customer can only view and manage their own profile information.
Each customer can only view and manage their own shipping addresses.
Each customer can only view and manage their own wishlist.
Each customer can only view and manage their own shopping cart.
Each customer can only view their own order history and order details.

Each seller can only view and manage their own shop profile.
Each seller can only view and manage products they have created.
Each seller can only view inventory records for their own product variants.
Each seller can only view order items for products they sell.
Each seller cannot view order items from other sellers.
Each seller cannot view customer personal information beyond what is required for shipping (recipient name, phone number, shipping address).

Administrators can view all data on the platform for oversight purposes.
Administrators can view all customer accounts, seller accounts, products, and orders.

Super administrators have the same data access as regular administrators.
Super administrators can additionally view administrator promotion requests.

Customers cannot view other customers' profiles, orders, wishlists, or carts.
Customers cannot view seller account information beyond the public shop profile.
Sellers cannot view other sellers' products, inventory, or order items.

### Access Control

Customers can access their own profile, addresses, wishlist, cart, and order history at any time while their account is active.
Customers can access product listings, product details, and seller shop profiles without restriction.
Customers can write reviews only for products they have purchased and where the order item status is delivered.

Sellers can access their shop profile, products, inventory records, and order items for their products at any time while their account is active and approved.
Sellers cannot access their shop management features if their account is pending approval or suspended.
Sellers can view cancellation and refund requests only for order items of products they sell.

Administrators can access all platform data for management and oversight purposes.
Administrators can approve or reject seller registrations, administrator promotion requests, and manage user accounts.
Administrators can view snapshots of any product or review for dispute resolution.

Super administrators can access all administrator functions and additionally manage administrator grades.

If a customer account is banned, the customer cannot log in or access any account features.
If a seller account is banned, the seller cannot log in or access any seller features.
If a seller account is suspended, the seller can still process existing orders but cannot create or edit products.

When a customer deletes their account, they lose access to all account features immediately.
When a seller deletes their account, they lose access to all seller features immediately.

Snapshots can be viewed by the data owner, administrators, and super administrators for dispute resolution.
Inventory history can be viewed by the seller who owns the product variant.

### Privacy Boundaries

Customer personal information (email, phone number, display name) is visible only to the customer and administrators.
Customer shipping addresses are visible only to the customer, administrators, and sellers who need the information to fulfill orders.
When an order is placed, the seller receives the shipping address (recipient name, phone number, street address, city, state, postal code, country) for that order only.

Seller shop profiles (shop name, description, logo) are publicly visible to all customers and other users.
Seller personal account information (email, password) is private and visible only to the seller and administrators.

Product information (name, description, images, category, price, variants) is publicly visible to all customers.
Product inventory quantities are not displayed to customers; only stock status (in stock or out of stock) is shown.

Order details are visible to the customer who placed the order and to the sellers of the order items.
Customers cannot view order details from other customers' orders.
Sellers cannot view order items from other sellers' products.

Reviews are publicly visible on product detail pages, showing the reviewer's display name (or deleted user if the account was deleted).
Review ratings contribute to the product's average rating, which is publicly visible.

Wishlist contents are private and visible only to the customer who owns the wishlist.
Shopping cart contents are private and visible only to the customer who owns the cart.

Cancellation and refund request reasons are visible to the customer who submitted the request, the seller who must respond, and administrators.
Cancellation and refund request status is visible to the customer and seller involved.

Administrator actions (approvals, rejections, suspensions, bans) are logged and visible to other administrators but not to customers or sellers.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-Delete Behavior

When users delete data, the platform uses a soft-delete approach to preserve records for legal and business purposes. Soft-deleted data is hidden from regular users but retained in the system for dispute resolution, legal compliance, and business record-keeping.

**Customer Account Deletion**
When a customer deletes their account:
- Profile information (display name, phone number) is removed from view
- Order history is preserved and remains accessible to sellers and administrators
- Reviews are preserved but displayed as "deleted user" instead of the customer's display name
- Shipping addresses are permanently removed
- Wishlist contents are permanently cleared
- Shopping cart contents are permanently cleared
- Login credentials (email and password association) are permanently removed

**Seller Account Deletion**
When a seller deletes their account (only allowed if no pending orders or refund/cancellation requests exist):
- Products are removed from search results and category listings
- Products cannot be purchased after deletion
- Order history and order item snapshots are preserved for customer and administrator access
- Shop name in past orders remains visible as it appeared at the time of purchase
- All product images are permanently removed
- All inventory records for variants are permanently removed
- Shop name, description, and logo are permanently removed
- Login credentials (email and password association) are permanently removed
- Seller approval request history is preserved for administrator records

**Product Deletion**
When a product is deleted by a seller or administrator:
- The product no longer appears in search results or category listings
- The product cannot be added to cart or purchased
- All variants and inventory records associated with the product are deleted
- Product snapshots are preserved and remain accessible to administrators
- The product is automatically removed from all customer wishlists
- Product images are permanently removed

**Review Deletion**
When a review is deleted by a customer:
- The review no longer appears on the product detail page
- The review is excluded from average rating calculations
- Review snapshots are preserved and remain accessible to administrators

**Administrator-Initiated Deletion**
Administrators can permanently delete:
- Any product on the platform (for policy violations)
- Any category (products become uncategorized)
- Customer accounts (via ban, preventing login)
- Seller accounts (via ban, preventing login)

**Snapshot Preservation**
All soft-deleted data maintains snapshot records that preserve the state of data at various points in time. Snapshots are immutable and form a complete audit trail of all data modifications on the platform. See Section 2 for detailed retention policies.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Image Storage

Product images and seller logo images are stored as part of the platform's data.

Each product can have multiple images uploaded by the seller. The first image serves as the main thumbnail displayed in product listings.

Each seller profile includes one logo image.

All images are preserved in product snapshots when products are edited, ensuring the complete visual state is retained at each modification point.

When a product is deleted, its images are removed from active listings but remain preserved in historical snapshots for order records and dispute resolution.

When a seller account is deleted, their product images are removed from listings but preserved in order item snapshots for historical order records.

Images are owned by the seller who uploaded them and cannot be accessed or modified by other sellers.

Administrators can view all images on the platform for oversight purposes.

### Storage Retention

Image storage follows the snapshot principle for all editable visual content.

Product images are retained indefinitely in snapshots even after product deletion, ensuring order records preserve the complete product state at time of purchase.

Seller logo images are retained in order item snapshots to preserve the shop identity associated with historical purchases.

Review-related images, if any, are preserved in review snapshots when reviews are edited or deleted.

All image storage is tied to data ownership rules: customers own their review content, sellers own their product and profile images, and the platform retains historical snapshots for legal and dispute resolution purposes.

Images associated with deleted accounts are preserved only within historical snapshots and are not accessible through active listings or profiles.

# External Dependency SLOs

Service level objectives for external dependency availability.

## External Dependency SLOs

Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.

### Payment Gateway Dependency

The platform integrates with an external payment gateway to process customer payments during checkout.

Payment processing depends on the external payment gateway being available. If the payment gateway is unavailable, payment processing fails and the order is not created.

When payment fails, the customer can retry the payment. The cart items remain in the customer's cart and can be used for a new checkout attempt.

When payment succeeds, the order is created, stock quantities are decreased, and cart items are removed.

The platform does not control the payment gateway's availability or performance. Payment success or failure is determined by the external payment gateway.

No specific service level objectives, timeout thresholds, or availability guarantees are defined for the payment gateway dependency, as these were not specified in the requirements.