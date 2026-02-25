# E-Commerce Shopping Mall Platform Requirements Specification

## 1. Introduction
This platform is a comprehensive e-commerce shopping mall enabling registered customers to browse and purchase products from registered sellers. The system enforces strict authentication and authorization controls. It preserves data integrity and history through snapshots to support legal compliance and dispute resolution.

## 2. Actors and Authentication

### 2.1 Actors
- **Customer**: Authenticated users who register with email and password to purchase products, manage profiles, addresses, reviews, wishlist, and shopping cart.
- **Seller**: Authenticated users who register with email and password, require administrator approval to sell, and manage products and orders.
- **Administrator**: Privileged users managing sellers, categories, orders, users, and platform governance with two grades (regular and super administrators).

### 2.2 Authentication Workflows
- WHEN a user registers with email and password, THE system SHALL validate inputs, create the account, and send verification emails.
- WHEN a user logs in with email and password, THE system SHALL validate credentials and issue JWT tokens containing the user role and permissions.
- WHEN a user changes their password, THE system SHALL validate the old password and enforce password complexity.
- WHEN a user requests password reset, THE system SHALL send a reset link to their email.
- WHEN a customer deletes their account, THE system SHALL delete profile data but preserve orders and anonymize reviews as "deleted user".
- WHEN a seller deletes their account (subject to pending order and request constraints), THE system SHALL delete products and deactivate account with preservation of order and shop name data.
- THE system SHALL enforce token expiration and support revocation on logout or password change.

### 2.3 Permission Matrix
| Action | Customer | Seller | Administrator | Super Administrator |
|---|---|---|---|---|
| Register | Yes | Yes | No | No |
| Login | Yes | Yes | Yes | Yes |
| Change Password | Yes | Yes | Yes | Yes |
| Delete Account | Yes | Conditional | No | No |
| Edit Profile | Yes | Yes | No | No |
| Manage Addresses | Yes | No | No | No |
| Create Products | No | Yes | No | No |
| Edit Products | No | Yes | No | No |
| Delete Products | No | Conditional | Yes | Yes |
| Approve Sellers | No | No | Yes | Yes |
| Suspend Sellers | No | No | Yes | Yes |
| Ban Customers | No | No | Yes | Yes |
| View Orders | Own | Own | All | All |
| Process Orders | No | Yes | No | No |
| Manage Categories | No | No | Yes | Yes |
| Promote/Demote Admins | No | No | No | Yes |

## 3. Customer Account Management

### 3.1 Account Lifecycle
- WHEN a customer registers, THE system SHALL require unique email and enforce password rules.
- WHEN a customer logs in, THE system SHALL authenticate and authorize access.
- WHEN a customer changes password, THE system SHALL require old password validation.
- WHEN a customer deletes their account, THE system SHALL delete profile but preserve order history and anonymize reviews.

### 3.2 Profile
- Each customer has a profile with display name and phone number.
- Customers can edit display name and phone number.

### 3.3 Address Management
- Customers can add multiple shipping addresses, each with recipient name, phone, street, city, state/province, postal code, and country.
- Customers can edit, delete, and set default shipping address.

## 4. Seller Account Management

### 4.1 Registration and Approval
- Sellers register with email and password.
- Accounts require administrator approval before selling.
- Sellers can view approval status and rejection reason.
- Rejected sellers can resubmit registration.

### 4.2 Profile
- Seller profiles include shop name, description, and logo image.
- Sellers can edit their profile; each edit creates immutable snapshot.

### 4.3 Product Management
- Sellers create products with name, description, category, and base price.
- Products have variants identified by SKU with option values, price overrides, and stock quantity.
- Sellers edit products and variants; edits create snapshots.
- Deletion allowed only if no pending orders, cancellations, or refunds.
- Product deletion removes variants and inventory; snapshots preserved.

### 4.4 Account Deletion
- Allowed only if no pending paid or shipped orders or cancellation/refund requests.
- Upon deletion, products deleted; order history and shop names preserved.

## 5. Categories

- Products organized in categories with one-level subcategories.
- Categories have name and description.
- Only administrators can create, edit, or delete categories.
- Deleting category makes products uncategorized.
- Customers can browse categories and view products within.

## 6. Snapshot Principle

- All data modifications are recorded as immutable snapshots.
- Snapshots record timestamp, changed fields, and before/after values.
- Entities with snapshots: products, variants, seller profiles, order items, reviews, cancellation and refund requests.
- Product snapshots include full product and variant details.

## 7. Product Images

- Multiple images per product.
- Images can be reordered; first image is thumbnail.
- Changes included in product snapshots.

## 8. Inventory Management

- Stock tracked per variant through inventory history records.
- Each record shows quantity change, reason, and timestamp.
- Stock quantity calculated as sum of history.
- Restock and adjustment records added by sellers.
- Order and refund trigger automatic inventory adjustments.
- Zero stock shows variant as "out of stock"; out of stock variants cannot be added to cart.

## 9. Product Search and Listing

- Search by name, filter by category, price range, and stock status.
- Results paginated and sortable.
- Listings show thumbnail, name, price or price range, seller shop name, and average rating.
- Product details page shows full images, description, category, seller profile link, all variants, stock, and reviews.

## 10. Wishlist and Shopping Cart

- Customers can add products to wishlist and manage it.
- Cart manages variants with quantities.
- Cart merges quantities for the same variant.
- Cart shows item details and total price.
- Warnings shown if cart quantity exceeds stock.
- Unavailable variants marked in cart.

## 11. Checkout and Payment

- Customers must select shipping address.
- Unavailable items prevented from checkout.
- Order summary reviewed before placing order.
- Payment processed via external gateway.
- On payment failure, order not created; customers can retry.
- On payment success, order created with stock reduced and cart items removed.

## 12. Order Structure and Status

- Orders contain one or more items, each with quantity and status.
- Item statuses: paid, shipped, delivered, cancelled, refunded.
- Overall order status derived from item statuses.
- Status rules for mixed and uniform states defined.

## 13. Shipping and Tracking

- Shipments per seller, possibly bundling multiple items.
- Sellers manage shipments with tracking info.
- Shipment creation changes item status to shipped.
- Delivery confirmed by customers or auto-delivered after 14 days.

## 14. Order Cancellation and Refund Requests

- Handled per order item.
- Cancellation allowed for paid (not shipped) items.
- Refund allowed within 7 days of delivery.
- Seller approval required; snapshot created upon response.
- Approved cancellations/refunds restore stock.
- Partial and full order cancellations/refunds update order status.

## 15. Reviews and Ratings

- Reviews allowed after delivery.
- One review per product per order.
- Reviews include rating (1 to 5) and optional text.
- Reviews editable and deletable by customers; snapshots preserved.
- Average rating excludes deleted reviews.

## 16. Seller Dashboard

- Summary of product count, order items, pending cancellations and refunds.
- List and status filter of order items for seller products.

## 17. Administrator System

### 17.1 Administrator Roles
- Regular and super administrators.
- Super administrators manage promotions/demotions.
- Cannot demote themselves.

### 17.2 Seller Management
- Approve, reject, or suspend sellers.
- Suspended sellers cannot create or edit products; existing order processing permitted.
- Unsuspending restores product visibility.

### 17.3 Category Management
- Create, edit, delete categories.

### 17.4 Product Oversight
- View all products.
- View any product snapshots.
- Delete products for policy violations.

### 17.5 Order Oversight
- View all orders.
- Force-cancel or force-refund items or entire orders.

### 17.6 User Management
- View all customers and sellers.
- Ban/unban customers and sellers.
- Banned users cannot log in.

## 18. Security and Compliance

- Secure JWT authentication.
- Role-based access control.
- Data privacy and protection.

## 19. Performance and Error Handling

- System performance targets.
- Graceful error handling with informative messages.
- High availability and fault tolerance.