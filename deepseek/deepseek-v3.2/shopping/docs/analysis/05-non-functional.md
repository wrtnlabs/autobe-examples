**ecommerceMall — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership Boundaries

### Data Ownership Boundaries

**Customer Data Ownership**
1. Customers own their personal profile information including display name and phone number.
2. Customers own their shipping addresses and can manage them freely.
3. Customers own their wishlists and shopping cart contents.
4. Customers own their order history and purchase records.
5. Customers own their reviews and ratings they have written.

**Seller Data Ownership**
1. Sellers own their shop profiles including shop name, description, and logo.
2. Sellers own their product listings including product names, descriptions, images, and variants.
3. Sellers own their inventory records and stock management data.
4. Sellers own their order fulfillment data including shipments and tracking information.
5. Sellers own their cancellation and refund request decisions and responses.

**Platform Data Ownership**
1. The platform owns the category structure and organization.
2. The platform owns aggregated review data and product ratings.
3. The platform owns system-generated snapshots for audit and dispute resolution purposes.
4. The platform owns administrator approval and management decisions.
5. The platform owns the user account status and authentication credentials.

**Shared Ownership Scenarios**
1. Order records are co-owned between customers (purchase history) and sellers (sales records).
2. Product reviews are co-owned between customers (content) and sellers (impact on product reputation).
3. Cancellation and refund requests are co-owned between customers (initiation) and sellers (resolution).
4. Shipment tracking information is co-owned between sellers (shipping) and customers (delivery).

**Ownership Transfer Rules**
1. When a customer deletes their account, ownership of their profile information transfers to the platform for deletion.
2. When a seller deletes their account, ownership of their products transfers to the platform for deletion.
3. Snapshot data becomes platform-owned once created and cannot be modified by the original data owner.
4. Historical order data remains co-owned even after account deletion for legal and business record purposes.

### Data Access Control

### Data Access Control

**Customer Data Access**
1. Customers can access their own profile information, shipping addresses, wishlists, and shopping carts.
2. Customers can access their order history and purchase details.
3. Customers can access reviews they have written and edit or delete them.
4. Customers cannot access other customers' personal information, orders, or reviews.
5. Customers can access seller profiles and product listings for browsing and purchasing.

**Seller Data Access**
1. Sellers can access their own shop profile and product listings.
2. Sellers can access order items for their products and manage shipments.
3. Sellers can access inventory records for their product variants.
4. Sellers can access cancellation and refund requests for their products.
5. Sellers cannot access other sellers' products, orders, or business data.
6. Sellers can view customer reviews of their products.

**Administrator Data Access**
1. Administrators can access all customer and seller accounts for management purposes.
2. Administrators can access all product listings and snapshots for oversight.
3. Administrators can access all orders, shipments, and financial records.
4. Administrators can access all cancellation and refund requests.
5. Administrators can access system logs and audit trails.

**Cross-Actor Access Rules**
1. Customers can view seller profiles when browsing products or viewing order details.
2. Sellers can view customer shipping addresses only for orders they are fulfilling.
3. Sellers cannot view customer payment information beyond order totals.
4. Customers can view product reviews from other customers.
5. Sellers can view aggregated review data for their products.

**Access Control Enforcement**
1. Access controls are enforced at login based on user role and account status.
2. Banned users cannot access any platform features.
3. Suspended sellers cannot access product creation or editing features.
4. Pending sellers cannot access selling features until approved.
5. Administrators can restrict access through account suspension or banning.

**Data Visibility Rules**
1. Deleted user accounts are shown as "deleted user" in reviews and historical records.
2. Deleted products are removed from public listings but preserved in order snapshots.
3. Suspended sellers' products are hidden from public view but preserved in the system.
4. Private business data like inventory adjustments and sales analytics are only visible to the owning seller.
5. Order details show product snapshots as they existed at purchase time, not current product data.

### Privacy Protection

### Privacy Protection

**Personal Information Privacy**
1. Customer email addresses are private and not visible to other users.
2. Customer phone numbers are private and only used for order fulfillment communications.
3. Customer shipping addresses are private and only shared with sellers fulfilling orders.
4. Customer passwords are encrypted and never stored in plain text.
5. Customer account activity is private and not visible to other users.

**Transaction Privacy**
1. Order details are private between the customer and involved sellers.
2. Payment information is processed externally and not stored on the platform.
3. Order quantities and purchase patterns are private to the customer.
4. Wishlist contents are private to the customer.
5. Shopping cart contents are private to the customer.

**Business Information Privacy**
1. Seller sales volumes and revenue are private to the seller.
2. Seller inventory levels and restocking patterns are private to the seller.
3. Seller profit margins and pricing strategies are private to the seller.
4. Seller business analytics are private to the seller.
5. Seller approval or rejection reasons are private between the seller and administrators.

**Review and Rating Privacy**
1. Customers can choose to write anonymous reviews (without displaying their display name).
2. Review editing history is private to the reviewing customer.
3. Rating distributions are aggregated and do not reveal individual customer identities.
4. Review reports and disputes are handled privately between involved parties.
5. Deleted reviews are preserved as snapshots but marked as private historical records.

**Communication Privacy**
1. Order-related communications (cancellation requests, refund requests) are private between the customer and seller.
2. Administrative communications (approval decisions, suspension notices) are private between the user and administrators.
3. System notifications about order status changes are private to the order owner.
4. Customer service interactions are private between the user and support staff.
5. Dispute resolution discussions are private to the involved parties.

**Data Sharing Boundaries**
1. Customer data is not shared with third parties without explicit consent.
2. Seller data is not shared with competitors or other sellers.
3. Aggregated platform statistics may be shared without identifying individual users.
4. Legal compliance may require sharing data with authorities under proper legal process.
5. Platform maintenance may require technical staff access to data, bound by confidentiality agreements.

### Data Isolation

### Data Isolation

**Account-Level Isolation**
1. Each customer account's data is isolated from other customer accounts.
2. Each seller account's business data is isolated from other seller accounts.
3. User authentication ensures each user only accesses their own account data.
4. Cross-account data visibility is controlled through explicit sharing mechanisms (reviews, product listings).
5. Account deletion removes personal data but preserves transactional records with appropriate anonymization.

**Business Entity Isolation**
1. Seller shops operate as independent business entities within the platform.
2. Each seller's product catalog is isolated from other sellers' catalogs.
3. Seller inventory management is isolated to prevent cross-seller stock visibility.
4. Seller order fulfillment processes are isolated to protect business operations.
5. Seller financial data and sales analytics are isolated for competitive protection.

**Transaction Isolation**
1. Each order is isolated to involve only the purchasing customer and relevant sellers.
2. Order items from different sellers are processed independently within the same order.
3. Payment processing is isolated per transaction with external payment gateways.
4. Shipment tracking is isolated per seller within multi-seller orders.
5. Cancellation and refund requests are isolated to specific order items.

**Data Compartmentalization**
1. Customer browsing activity is isolated from purchase history.
2. Wishlist data is isolated from shopping cart data.
3. Product search data is isolated from personal account data.
4. Review data is compartmentalized between public product reviews and private review history.
5. Administrative oversight data is compartmentalized from regular user data.

**Isolation Enforcement Mechanisms**
1. Role-based access control enforces data isolation between customer, seller, and administrator roles.
2. Database partitioning isolates user data at the application level.
3. Session management ensures users only access their authenticated session data.
4. API endpoints enforce ownership checks before returning data.
5. Audit logs track cross-boundary data access attempts.

**Cross-Isolation Communication Points**
1. Product listings serve as controlled sharing points between sellers and customers.
2. Order processing creates temporary data bridges between customers and sellers.
3. Reviews create permanent public connections between customers and products.
4. Category browsing creates filtered views across seller boundaries.
5. Search functionality aggregates data across isolation boundaries with appropriate access controls.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete vs Hard Delete Policies

The platform implements different deletion strategies depending on the data type and business context:

- **Customer account deletion**: When a customer deletes their account, their profile information (display name, phone number) is deleted, but their orders and order history are preserved for seller records and legal purposes. Their reviews are preserved but shown as 'deleted user'. This is a soft delete pattern where the customer identity is removed but transactional records remain.

- **Seller account deletion**: When a seller deletes their account, their products are deleted from listings, but order history and snapshots are preserved. Their shop name in past orders is preserved. This is a mixed approach where current listings are hard deleted while historical records remain.

- **Review deletion**: When customers delete their reviews, the reviews are removed from public display but snapshots of the reviews are preserved. This ensures review history is maintained even when reviews are deleted.

- **Address deletion**: When customers delete shipping addresses, the addresses are permanently removed from the system as they contain personal information that should not be retained after deletion.

- **Product deletion**: When sellers delete products, the products and their variants are deleted from search and category listings. However, product snapshots and order items referencing those products remain preserved.

- **Snapshot preservation**: All snapshots are immutable and cannot be deleted, ensuring a complete audit trail of all changes to critical data.

The soft delete approach is applied to data with ongoing business or legal implications (orders, reviews), while hard delete is used for personal data that should be completely removed (addresses, some profile information).

### Data Retention Periods

The platform maintains different retention periods for various types of data based on business needs:

- **Snapshots**: All snapshots are retained indefinitely and cannot be deleted. This includes product snapshots, variant snapshots, seller profile snapshots, order item snapshots, review snapshots, cancellation request snapshots, and refund request snapshots.

- **Order history**: Customer order history is preserved indefinitely even when accounts are deleted. This includes all order details, items purchased, prices, and shipping information.

- **Inventory records**: Inventory history records showing stock quantity changes are retained indefinitely to maintain a complete audit trail of stock movements.

- **Customer profiles**: When a customer deletes their account, their profile information (display name, phone number) is immediately deleted and not retained.

- **Shipping addresses**: When customers delete shipping addresses, the addresses are immediately and permanently removed from the system.

- **Product listings**: When sellers delete products, the product listings are immediately removed from search and category pages. However, product snapshots remain preserved indefinitely.

- **Wishlist items**: When products are deleted by sellers, they are automatically removed from all customer wishlists without retention.

- **Cart items**: When variants are deleted or go out of stock, they are marked as unavailable in customer carts but the cart record itself may be retained until the customer removes it.

- **Administrator requests**: Requests to become administrators and their approval/rejection records are retained indefinitely for audit purposes.

- **Seller approval records**: Records of seller approval requests, including rejection reasons, are retained indefinitely.

The retention strategy prioritizes preserving transactional and audit data while allowing personal data to be deleted upon request.

### Account and Data Recovery

The platform provides limited recovery capabilities for deleted accounts and data:

- **Customer account recovery**: Once a customer deletes their account, their profile information cannot be recovered. However, if they create a new account with the same email address, they will not regain access to their previous order history, reviews, or other account-associated data.

- **Seller account recovery**: Once a seller deletes their account, it cannot be recovered. The seller would need to submit a new registration request and go through the approval process again. Their previous products, reviews, and shop reputation are not transferable to the new account.

- **Product recovery**: When a seller deletes a product, it cannot be recovered through normal user interfaces. However, administrators can view historical snapshots of deleted products for dispute resolution or auditing purposes.

- **Review recovery**: When a customer deletes a review, it cannot be recovered through normal user interfaces. Historical snapshots of the review remain available to administrators for auditing.

- **Address recovery**: When a customer deletes a shipping address, it cannot be recovered.

- **Wishlist recovery**: When products are automatically removed from wishlists due to seller deletion, customers cannot recover those wishlist entries.

- **Cart recovery**: Cart contents are session-based and may be lost if the customer logs out or their session expires. There is no automatic recovery of cart contents.

- **Snapshot-based auditing**: While users cannot recover deleted data through self-service, administrators can view all historical snapshots to reconstruct the state of any entity at any point in time for dispute resolution or legal purposes.

- **No automated restore**: The platform does not provide automated data restoration features for users. Recovery of accidentally deleted data requires administrative intervention and is limited to viewing historical records, not restoring them to active status.

The recovery approach emphasizes data integrity and auditability over user convenience, reflecting the financial nature of the platform where data accuracy is critical.

### Permanent Deletion Conditions

Certain data types undergo permanent deletion under specific conditions:

- **Customer profile information**: When a customer deletes their account, their display name and phone number are permanently deleted immediately.

- **Shipping addresses**: When a customer deletes a shipping address, all address components (recipient name, phone number, street address, city, state/province, postal code, country) are permanently deleted immediately.

- **Seller products**: When a seller deletes a product, the product and all its variants are permanently deleted from active listings. However, snapshots of the product remain preserved.

- **Product variants**: When a seller deletes a variant, the variant is permanently removed from the product. Variants can only be deleted if there are no pending order items (paid or shipped status) and no pending cancellation or refund requests for that variant.

- **Product images**: When sellers delete images from their products, the images are permanently removed from the system. Image changes are captured in product snapshots before deletion.

- **Wishlist entries**: When products are deleted by sellers, they are permanently removed from all customer wishlists.

- **Cart items**: When customers remove items from their cart or when unavailable items are automatically removed, those cart entries are permanently deleted.

- **Seller account eligibility**: A seller can only delete their account if they have no pending orders (paid or shipped status) and no pending cancellation or refund requests. This ensures business continuity before permanent account deletion.

- **Product deletion eligibility**: A seller can only delete a product if there are no pending order items (paid or shipped status) for any variant of the product and no pending cancellation or refund requests for any variant of the product.

- **Snapshot immutability**: Snapshots are the only data type that can never be permanently deleted under any circumstances, ensuring a complete audit trail.

Permanent deletion occurs immediately when the conditions are met, with no recovery period or recycle bin functionality. This reflects the business requirement for definitive data removal in certain contexts while maintaining necessary historical records through the snapshot system.

# External Dependency SLOs

Service level objectives for external dependency availability.

## External Dependency SLOs

Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.

### Payment Gateway Dependency SLO

The payment gateway is the only explicitly referenced external dependency in the platform.

- The payment gateway must maintain an availability of at least 99.5% during business hours
- Payment transaction success rate must be at least 99.0%
- The platform must monitor payment gateway response times with alerts for sustained latency above 5 seconds
- In case of payment gateway unavailability, customers must be informed of temporary payment service interruption
- Historical payment gateway performance data must be retained for 90 days for analysis and dispute resolution

### Payment Processing Timeout Policies

Payment processing must respect defined timeout boundaries to prevent customer experience degradation.

- Payment transaction requests must timeout after 30 seconds of no response from the payment gateway
- Payment initiation must complete within 10 seconds for 95% of transactions
- Payment verification must complete within 5 seconds for 99% of transactions
- Order creation must be delayed if payment verification times out, with a clear message to the customer
- Failed payment attempts due to timeout must be logged with timestamps for audit purposes

### Service Degradation Policies

When external dependencies experience reduced performance, the platform must implement graceful degradation.

- If payment gateway response time exceeds 10 seconds, display a warning about potential delays to customers
- If payment gateway availability drops below 95%, limit payment attempts to essential transactions only
- During payment gateway degradation, preserve shopping cart contents for at least 7 days to allow retry
- If payment gateway is completely unavailable for more than 15 minutes, disable checkout functionality with appropriate messaging
- Degradation status must be clearly communicated to sellers in their dashboard

### External Availability Monitoring

The platform must continuously monitor external dependency availability and performance.

- Payment gateway health must be checked at least once per minute
- Availability metrics must be retained for 30 days for trend analysis
- Payment failure patterns must be analyzed daily to detect emerging issues
- Customer support must be notified when payment gateway availability drops below 98% for more than 5 minutes
- Alternative payment routing options must be evaluated if primary gateway availability consistently falls below service level objectives