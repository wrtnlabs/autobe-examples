# E-Commerce Shopping Mall Platform Functional Requirements

## 1. Customer Account

- WHEN a new customer registers with a valid email and password, THE system SHALL create a customer account.
- Customers SHALL log in using their registered email and password.
- Customers SHALL be able to change their password securely after authentication.
- Customers SHALL be able to delete their account, which triggers the deletion of their profile information.
- WHEN a customer deletes their account, THE system SHALL preserve their orders and order history for seller records and legal purposes.
- Reviews written by deleted customers SHALL be preserved and displayed as authored by "deleted user".

## 2. Customer Profile

- Each customer SHALL have a profile including display name and phone number.
- Customers SHALL be able to update their display name and phone number.

## 3. Address Management

- Customers SHALL be able to add multiple shipping addresses with recipient name, phone number, street address, city, state/province, postal code, and country.
- Customers SHALL be able to edit or delete shipping addresses.
- One address can be marked as default shipping address.

## 4. Seller Account

### 4.1 Registration and Authentication

- WHEN a user submits a valid email and password to register as a seller, THE system SHALL create a seller account in "pending" approval status.
- Sellers SHALL log in using their email and password.
- Sellers SHALL be able to change their password securely after authentication.

### 4.2 Approval Workflow

- WHEN an administrator reviews a seller application, THE system SHALL allow approving or rejecting the application.
- WHEN approved, THE seller status SHALL become "approved" allowing product and order management.
- WHEN rejected, THE seller status SHALL be "rejected" and the rejection reason SHALL be visible to the seller.
- Rejected sellers SHALL be able to submit a new registration request which resets the status to "pending".
- Sellers SHALL be able to view their current approval status and rejection reasons if applicable.

### 4.3 Account Deletion Constraints

- Sellers SHALL only be allowed to delete their account if:
  - They have no pending orders in "paid" or "shipped" statuses for any product variants.
  - They have no pending cancellation or refund requests.
- WHEN a seller deletes their account:
  - Their products SHALL be deleted from listings.
  - Order history and snapshots SHALL be preserved.
  - Shop name in past orders SHALL be preserved.

## 5. Seller Profile

- Seller profiles SHALL include shop name, shop description, and logo image.
- Sellers SHALL be able to edit shop name, description, and logo.
- Every profile edit SHALL create an immutable snapshot recording date/time, changed fields, previous and new values.
- Customers SHALL be able to view seller profiles.

## 6. Categories

- Products SHALL be organized into categories and one-level subcategories.
- Each category SHALL have name and description.
- Only administrators SHALL create, edit, and delete categories.
- Customers SHALL be able to browse categories and view products within each.

## 7. Snapshot Principle

- ALL editable data modifications SHALL create immutable snapshots to preserve previous state.
- Snapshots SHALL record timestamp, changed fields, previous and new values.
- Snapshots SHALL be viewable by owners and administrators for dispute resolution.
- Snapshots SHALL include products, product variants, seller profiles, order items, reviews, cancellation and refund requests.
- Product snapshots SHALL include full product data and all variant snapshots at the time of change.

## 8. Products

- Sellers with approved status SHALL create products with required name, description, category/subcategory, and base price.
- Products SHALL belong to the creating seller.
- Sellers SHALL be able to edit and delete their products.
- Every product edit SHALL create a snapshot.
- Products can only be deleted if all variants have no pending paid/shipped orders or cancellation/refund requests.
- Deleting a product SHALL delete associated variants and inventory records.
- Deleted products SHALL not appear in search or category listings.
- Sellers and administrators SHALL be able to view product snapshots.

## 9. Product Images

- Sellers SHALL be able to upload multiple images per product.
- Images can be reordered; first image is main thumbnail.
- Sellers can delete images.
- Image changes SHALL be included in product snapshots.

## 10. Product Variants (SKU)

- Products can have multiple variants representing option combinations.
- Each variant SHALL have SKU code (unique), option values, price override, and stock quantity.
- Sellers SHALL add, edit, and delete variants.
- Variants can only be deleted if they have no pending order or cancellation/refund requests.
- Products must have at least one variant to be purchasable; without variants, products are shown as "unavailable".

## 11. Inventory Management

- Variant stock quantity SHALL be managed by inventory history records containing quantity change, reason, and timestamp.
- Current stock quantity SHALL be calculated summing all inventory records.
- Sellers SHALL add stock for restocking or subtract stock for adjustments with reasons.
- Order placements create negative inventory records.
- Cancellations and refunds create positive inventory records.
- When stock reaches zero, variant is marked "out of stock" and cannot be added to cart.
- Sellers SHALL be able to view full inventory history per variant.

## 12. Product Search

- Customers SHALL search products by name.
- Results SHALL aggregate products from all sellers, paginated.
- Filters include category, price range, and in-stock only.
- Sorting options include newest first, price low to high, price high to low.

## 13. Product Listing

- Listings SHALL show main image thumbnail, product name, base price or price range, seller shop name, and average rating.

## 14. Product Detail Page

- Displays all product images, name, description, category, seller shop name (link to profile), variants with prices and stock status, average rating, total reviews, and all customer reviews.

## 15. Wishlist

- Customers SHALL add and remove products to/from a paginated wishlist.
- Wishlist shows products; deleted products are automatically removed.

## 16. Shopping Cart

- Customers SHALL add variants with quantity to their cart.
- Adding duplicate variants combines quantities.
- Cart shows product name, variant options, price, quantity, subtotal, and total price.
- Customers can update quantities, remove items.
- Cart warns if variant stock is less than cart quantity or variant is unavailable.

## 17. Checkout

- Customers SHALL proceed to checkout from their cart.
- Unavailable variants SHALL prevent checkout.
- Customers MUST select a shipping address.
- Order summary includes item list, shipping address, and total price.
- Shipping address cannot be changed post-order.

## 18. Payment

- Customers confirm orders and payment is processed by an external gateway.
- Payment failures prevent order creation, allow retries.
- Payment success triggers order creation.

## 19. Order Creation

- Upon successful payment, stock quantities are decreased.
- Purchased items are removed from cart.
- An order record is created with order items each having status "paid".
- Snapshots of purchased products, variants, and seller profiles are saved per order item.

## 20. Order Structure and Status

- Orders contain multiple order items from possibly multiple sellers.
- Each item has its own status: paid, shipped, delivered, cancelled, refunded.
- Overall order status is derived from item statuses, with defined rules for "paid", "shipped", "delivered", "cancelled", "refunded", and "partially completed".

## 21. Shipping and Tracking

- Shipments represent packages from sellers containing order items.
- Sellers create shipments including selected items, enter carrier and tracking number.
- Items in shipments change to "shipped".
- Customers view tracking info and confirm delivery per shipment.
- Automatic delivery confirmation after 14 days if customer doesn't confirm.

## 22. Order Cancellation

- Customers request cancellation per order item only if status is "paid".
- Requests include a reason.
- Sellers approve or reject requests; snapshots are created for state changes.
- Approved cancellations result in item status "cancelled" and stock restoration.
- Partial cancellations maintain order processing for remaining items.
- If all items cancelled, order status becomes "cancelled".

## 23. Refund Requests

- Refunds requested per order item only if status is "delivered" and within 7 days of delivery.
- Requests include reason.
- Sellers respond with approval or rejection; snapshots created.
- Approved refunds change item status to "refunded" and restore stock.
- Partial refunds keep other items unaffected.
- Full refund of all items sets order status to "refunded".

## 24. Reviews and Ratings

- Customers write one review per product per order after delivery.
- Reviews have rating (1 to 5 stars) and optional text.
- Reviews are sorted newest first on product detail pages.
- Customers can edit their reviews, triggering snapshots.
- Customers can delete reviews; snapshots preserved.
- Average product rating calculated from non-deleted reviews.

## 25. Seller Dashboard

- Sellers view summary: total products, total order items, pending cancellations, pending refunds.
- Sellers can view and filter their order items by status.

## 26. Administrator System

### 26.1 Becoming an Administrator

- Users submit requests with reason.
- Super administrators review, approve, or reject.
- Approved users become regular administrators.

### 26.2 Administrator Grades

- Grades: regular and super administrators.
- Super administrators promote/demote others (except self-demotion).

### 26.3 Seller Management

- Administrators view and act on pending seller approvals.
- Approve or reject with reasons.
- Suspend or unsuspend sellers, affecting product visibility and permissions.

### 26.4 Category Management

- Create, edit, and delete categories.
- Deleted category products become uncategorized.

### 26.5 Product Oversight

- View all products and snapshots.
- Delete products for policy violations.

### 26.6 Order Oversight

- View all orders.
- Force-cancel or force-refund items or entire orders.

### 26.7 User Management

- View and ban/unban customers and sellers.
- Banned users cannot log in; existing orders persist.

## 27. Security and Compliance

- All sensitive operations require authentication and proper authorization.
- Passwords stored securely using best practices.
- User data protected per privacy policies.

## 28. Performance and Error Handling

- The system shall respond to all user actions within 2 seconds under normal load.
- Errors SHALL return meaningful messages explaining the issue.


---