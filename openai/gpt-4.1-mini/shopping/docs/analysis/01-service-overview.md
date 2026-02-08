# E-Commerce Shopping Mall Platform Requirement Specification

## 1. Customer Account Management

### 1.1 Registration and Authentication
- WHEN a user submits a registration request with a valid email and password, THE system SHALL create a customer or seller account accordingly after verification.
- Customer accounts require email and password for signup.
- Sellers sign up similarly but require administrator approval before activation.
- WHEN a user attempts to log in with email and password, THE system SHALL authenticate credentials and establish a session.
- WHEN a password change request is made by an authenticated user, THE system SHALL update the password securely.
- WHEN a customer or seller requests account deletion,
  THE system SHALL process as follows:
  - For customers: Delete profile information; preserve orders and reviews with "deleted user" label.
  - For sellers: Delete product listings after conditions: no pending orders or cancellation/refund requests.
  - Preserve order histories and snapshots for legal and operational use.
- WHEN a customer or seller is banned by an administrator, THE system SHALL prevent login attempts.

### 1.2 Session Management and Access Control
- WHEN a user successfully logs in, THE system SHALL create a session token granting appropriate permissions.
- THE system SHALL implement token expiration and refresh mechanisms.
- Access to features SHALL be restricted based on actor type: customer, seller, regular administrator, super administrator.
- THE system SHALL enforce permission checks at every endpoint.

## 2. Customer Profile and Address Management

### 2.1 Profile Management
- WHEN a customer updates their display name or phone number,
  THE system SHALL validate and save the new profile information.

### 2.2 Address Management
- WHEN a customer adds a new shipping address, THE system SHALL store the address with recipient name, phone number, street, city, state/province, postal code, and country.
- WHEN a customer edits an existing address, THE system SHALL update the address details.
- WHEN a customer deletes an address, THE system SHALL remove the address record.
- WHEN a customer sets a default shipping address, THE system SHALL mark that address as default and unset any previous default.

## 3. Seller Account and Profile Management

### 3.1 Seller Registration and Approval
- WHEN a seller registers, THE system SHALL create a pending approval account.
- THE seller SHALL be able to view their approval status: pending, approved, or rejected.
- WHEN approval is rejected, THE system SHALL provide the rejection reason.
- Rejected sellers can submit new registration requests.
- Seller accounts cannot be used for selling until approved by an administrator.

### 3.2 Seller Profile
- Sellers have a profile including shop name, description, and logo.
- WHEN a seller edits profile information, THE system SHALL create an immutable snapshot recording the previous state.
- Customers can view seller profiles including basic info and snapshot history.

### 3.3 Seller Account Deletion
- Sellers may delete accounts only if no pending orders or cancellation/refund requests exist.
- Upon deletion, the system SHALL remove products, but preserve order history and snapshots.

## 4. Product Catalog and Categories

### 4.1 Category Management
- Administrator users SHALL create and manage categories and one level of subcategories.
- Each category includes a name and description.
- WHEN categories are deleted, products become uncategorized.
- Customers SHALL be able to browse and view products filtered by category.

## 5. Product Management and Inventory

### 5.1 Product Creation and Editing
- Sellers can create products with name, description, category, and base price.
- Every product edit SHALL create an immutable snapshot capturing current product and variant states.
- Sellers can delete products only if no pending orders or refund/cancellation requests exist.
- Deleting a product SHALL also delete all its variants and inventory records.
- Deleted products SHALL not appear in search or category listings.

### 5.2 Product Variants (SKUs)
- Sellers can add multiple variants per product with SKU, option values, price override (optional), and stock quantity.
- EVERY variant edit SHALL produce an immutable snapshot.
- Variants cannot be deleted if pending orders or refund/cancellation requests exist.
- Products must have at least one variant to be purchasable.

### 5.3 Inventory Management
- Stock quantities are managed through inventory history records, capturing quantity changes, reasons, and timestamps.
- Stocks are updated automatically when orders are placed, cancelled, or refunded.
- WHEN stock hits zero, variants are shown as out-of-stock and cannot be ordered.

### 5.4 Product Images
- Sellers can upload multiple product images, reorder them, and delete images.
- Image changes are captured in product snapshots.

## 6. Product Search and Wishlist

### 6.1 Product Search
- Customers SHALL be able to search by product name.
- Search results are paginated and filterable by category, price range, and stock availability.
- Customers can sort results by newest, price ascending or descending.

### 6.2 Wishlist Features
- Customers can add or remove products from their wishlist.
- Wishlists are paginated and update automatically to remove deleted products.

## 7. Shopping Cart and Checkout Flow

### 7.1 Shopping Cart Behavior
- Customers MUST add specific variants (SKUs) along with quantity.
- Quantities update by combining duplicates rather than separate lines.
- Cart displays product details, variant info, price, quantity, subtotal, and warnings for stock shortages or unavailability.

### 7.2 Checkout Process
- Only available and in-stock items can be checked out.
- Customers select shipping addresses (default or new).
- Upon order submission, shipping address selection locks.
- Order summary reviews pricing, items, and shipping address.

## 8. Payment Processing and Order Creation

### 8.1 Payment
- Payment is processed through an external gateway.
- Payment failures allow retry; success triggers order creation.

### 8.2 Order Creation
- On order success, stock quantities are decremented.
- Cart items for purchased variants are removed.
- An order record is generated with order items reflecting purchased variants.
- Snapshots of products, variants, and seller profiles at purchase time are saved with order items.

## 9. Order Lifecycle and Shipment Tracking

### 9.1 Order and Order Item Status
- Order items have individual statuses: paid, shipped, delivered, cancelled, refunded.
- Overall order status is derived from the collection of order items.

### 9.2 Shipping Process
- Sellers can create shipments grouping order items per seller.
- Shipments include tracking info and trigger item status changes to shipped.
- Customers view tracking info and confirm delivery.
- Delivery confirmation updates item status or auto-completes after 14 days.

## 10. Cancellation and Refund Handling

### 10.1 Cancellation Requests
- Customers may request cancellation on unshipped paid items with reasons.
- Sellers approve or reject cancellations; each response creates a snapshot.
- Approved cancellations revert stock and update item and order statuses.

### 10.2 Refund Requests
- Refund requests are available for delivered items within 7 days.
- Sellers approve or reject refunds; responses create snapshots.
- Approved refunds restore stock and update item and order statuses.

## 11. Reviews and Ratings System

- Customers can submit one review per product per order after delivery.
- Reviews include required star rating and optional text.
- Review edits create snapshots; deletions preserve snapshots but remove visibility.
- Product ratings aggregate only non-deleted reviews.

## 12. Seller Dashboard Features

- Sellers view summaries of product counts, orders, pending cancellation and refund requests.
- Sellers can filter and manage order items.

## 13. Administrator System and Permissions

### 13.1 Administrator Roles
- Users can request administrator access with reasons.
- Super administrators approve or reject requests.
- Super administrators manage promotion/demotion of admin roles.
- Super administrators cannot demote themselves.

### 13.2 Seller Management
- Admins approve/reject seller registrations with reasons.
- Admins can suspend/unsuspend seller accounts with related product visibility updates.

### 13.3 Category and Product Oversight
- Admins manage categories and moderate products including deletions for policy violations.

### 13.4 Order Oversight
- Admins can view all orders and force cancel or refund items or entire orders.

### 13.5 User Management
- Admins can ban/unban customers and sellers affecting login capabilities.

## 14. Security, Compliance, and Performance

- Security policies cover access control, data privacy, and compliance standards.
- Performance goals include response times, system availability, and error management.

## 15. Snapshot Principle and Data Integrity

- All critical data updates generate immutable snapshots storing previous states, timestamps, and changes.
- Snapshots preserve data for products, variants, seller profiles, order items, reviews, cancellation/refund requests.
- Snapshots serve legal, operational, and dispute resolution requirements.

---

# End of E-Commerce Shopping Mall Platform Requirement Specification