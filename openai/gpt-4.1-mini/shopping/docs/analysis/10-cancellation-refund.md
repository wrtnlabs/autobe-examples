# E-Commerce Shopping Mall Platform Requirements Specification

## 1. Customer Account

### 1.1 Registration and Authentication
- WHEN a user wants to use any platform feature, THE system SHALL require full registration; guest usage is not allowed.
- THE system SHALL allow customers to register using an email address and password.
- WHEN a customer attempts to sign up, THE system SHALL validate that the email is unique and properly formatted.
- THE system SHALL support customer login using email and password.
- WHEN a customer attempts to log in, THE system SHALL verify credentials and create an authenticated session.
- THE system SHALL allow customers to change their password after providing the current password.
- THE system SHALL allow customers to delete their own account at any time.
- WHEN a customer deletes their account, THE system SHALL delete their profile information.
- EVEN AFTER account deletion, all orders and order histories associated with the customer SHALL be preserved for seller records and legal compliance.
- Reviews written by deleted customers SHALL remain visible but be labeled as "deleted user" to maintain review integrity.

### 1.2 Profile Management
- EACH customer SHALL have a profile containing a display name and phone number.
- WHEN updating their profile, THE customer SHALL be able to edit their display name and phone number.

### 1.3 Address Management
- THE system SHALL allow customers to add multiple shipping addresses.
- EACH address SHALL contain recipient name, phone number, street address, city, state/province, postal code, and country.
- Customers SHALL be able to edit and delete their addresses.
- ONE address SHALL be designated by the customer as the default shipping address.

## 2. Seller Account

### 2.1 Registration and Approval
- Sellers SHALL register using email and password.
- Seller accounts SHALL require administrator approval to activate selling capabilities.
- Sellers SHALL be able to view their approval status: pending, approved, or rejected.
- IF rejected, THE system SHALL display the rejection reason.
- Rejected sellers SHALL be permitted to resubmit registration requests.
- Sellers SHALL be able to change passwords.
- Sellers SHALL be able to delete their account only if no pending orders or cancellation/refund requests exist.
- WHEN a seller deletes their account, THE system SHALL delete their products from listings, preserve order history, and maintain shop names in past orders.

### 2.2 Seller Profile Management
- Sellers SHALL have profiles containing shop name, description, and a logo image.
- Sellers SHALL be able to update shop name, description, and logo.
- EACH update SHALL create an immutable snapshot preserving the previous state.
- Customers SHALL be able to view seller profiles.

## 3. Categories

- Products SHALL be organized into categories with optional single-level subcategories.
- EACH category SHALL have a name and description.
- Only administrators SHALL create, edit, or delete categories.
- Customers SHALL browse categories and view products within categories.
- WHEN a category is deleted, THE system SHALL mark products as uncategorized.

## 4. Snapshot Principle

- ALL data modifications of editable entities SHALL create immutable snapshots.
- Snapshots SHALL record timestamp, changes made, previous and new values.
- Snapshots SHALL be immutable and preserved for dispute resolution.
- Snapshot applies to products, variants, seller profiles, order items, reviews, cancellation and refund requests.
- Product snapshots SHALL include product details and all variant snapshots.

## 5. Products

- Sellers SHALL be able to create products with required name, description, category, and base price.
- EACH product SHALL belong to the creating seller.
- Sellers SHALL edit products, triggering snapshots each time.
- Products CAN be deleted ONLY if no pending order items or cancellation/refund requests exist for any variant.
- Deleting a product SHALL delete its variants and inventory records and hide it from search and category listings.
- Sellers and administrators SHALL be able to view product snapshots.

## 6. Product Images

- Sellers SHALL upload multiple images per product.
- THE system SHALL support image reordering, with the first image used as thumbnail.
- Sellers SHALL be able to delete product images.
- Image changes SHALL be included in product snapshots.

## 7. Product Variants (SKU)

- A product SHALL have one or more variants.
- EACH variant SHALL have a unique SKU, option values, optional price override, and stock quantity.
- Sellers SHALL add, edit, and delete variants under conditions of no pending orders or requests.
- Products with no variants SHALL appear as "unavailable" in search.

## 8. Inventory Management

- Stock is managed by inventory history records recording quantity changes with reasons and timestamps.
- Stock quantities SHALL be calculated by summing inventory records.
- Sellers SHALL add or subtract stock with documented reasons.
- Stock adjustments SHALL be created automatically on order placement and refunds.
- Variants out of stock SHALL be unavailable for purchase.

## 9. Product Search

- Customers SHALL search products by name with pagination.
- Filters shall include category, price range, and in-stock status.
- Sorting options SHALL include newest first, price ascending, and price descending.

## 10. Product Listing

- Product listings SHALL show thumbnail, name, base price or price range, seller shop name, and average rating if available.

## 11. Product Detail Page

- Detailed product page SHALL display all images, name, description, category, seller profile link, variants with prices and stock status, average rating, review counts, and reviews sorted newest first.

## 12. Wishlist

- Customers SHALL add and remove products from wishlist.
- Wishlist SHALL be paginated and show products only.
- Deleted products SHALL be automatically removed from wishlists.

## 13. Shopping Cart

- Customers SHALL add specific variants to cart with quantity.
- Same variant added multiple times SHALL combine quantities.
- Cart SHALL display each item's product name, variant options, price, quantity, subtotal, and total.
- Customers SHALL modify quantities and remove items.
- Variants with insufficient stock SHALL show warnings.
- Deleted or out-of-stock variants SHALL be marked unavailable in cart.

## 14. Checkout

- Customers SHALL proceed to checkout only with available items.
- Customers SHALL select or use default shipping address.
- Order summary SHALL detail items, address, and total price.
- Shipping address SHALL be locked after order placement.

## 15. Payment

- Payment process SHALL handle success or failure.
- Failed payments SHALL allow retry without order creation.
- Successful payment SHALL create order.

## 16. Order Creation

- Stock quantities reduced per purchased variant.
- Purchased items removed from cart.
- Order and order items created with status "paid".
- Snapshots of products, variants, and seller profiles saved per order item to preserve purchase-time data.

## 17. Order Structure and Status

- Order contains multiple order items, each with quantity and status.
- Item statuses: paid, shipped, delivered, cancelled, refunded.
- Overall order status derived from items: paid, shipped, delivered, cancelled, refunded, or partially completed.

## 18. Shipping and Tracking

- Shipments group order items shipped by seller, sharing tracking info.
- Sellers create shipments with selected items and provide tracking details.
- Items in shipment status change to "shipped".
- Customers view tracking and confirm delivery per shipment.
- Items auto-marked "delivered" after 14 days if no confirmation.

## 19. Order Cancellation

- Cancellation requests submitted by customers per order item with status "paid".
- Requests include reasons.
- Sellers approve or reject requests.
- Seller responses trigger immutable snapshot creation.
- Approved cancellations update item status to "cancelled" and process refund.
- Stock quantities updated positively.
- Full order cancellation status if all items cancelled.

## 20. Refund Requests

- Refunds requested per delivered order item within 7 days of delivery, with reasons.
- Sellers approve or reject refunds.
- Seller responses trigger immutable snapshots.
- Approved refunds update item status to "refunded" and restock appropriately.
- Partial refunds allowed; overall order status updated accordingly.

## 21. Reviews and Ratings

- Customers write reviews post delivery for purchased products, one review per product per order.
- Ratings required (1-5 stars), text optional.
- Reviews sorted newest first and editable by customer.
- Edits create snapshots.
- Deleted reviews remain in snapshots and show "deleted user" author.
- Average product rating calculated from non-deleted reviews.

## 22. Seller Dashboard

- Sellers view summary: total products, order items, pending cancellation/refund counts.
- Sellers view and filter order items by status.

## 23. Administrator System

### 23.1 Administrator Roles
- Users may request admin roles with reasons.
- Super admins approve/reject requests.
- Grades: regular and super admins.
- Super admins promote and demote other admins but cannot demote themselves.

### 23.2 Seller Management
- Admins approve or reject sellers with reasons.
- Suspended sellers' products hidden; no new product creation/editing allowed.
- Sellers process existing orders despite suspension.
- Admins unsuspend sellers.

### 23.3 Category Management
- Admins create, edit, and delete categories and subcategories.
- Deleted category products become uncategorized.

### 23.4 Product Oversight
- Admins view all products and their snapshots.
- Admins can delete products for policy violations.

### 23.5 Order Oversight
- Admins view all orders.
- Admins force-cancel or force-refund items or entire orders with stock adjustments.

### 23.6 User Management
- Admins view all customers and sellers.
- Admins ban/unban customers and sellers, restricting login but preserving order processing.

## 24. Authentication and Authorization

- All interactions require authentication based on defined user actors.
- Permissions enforced per actor type and operation.
- Sessions managed securely with password policies.
- Role-based access controls implemented according to business rules.

## 25. Error Handling

- Clear error messages for invalid operations including login failures, unauthorized access, invalid order states.
- Validation errors returned with detailed description.
- Graceful handling of concurrent modifications to prevent race conditions.

## 26. Performance Requirements

- System response times under 2 seconds for core operations.
- Consistent state updates with atomic transactions.

## 27. Glossary
- Definitions of terms such as "order item", "variant", "snapshot", "shipment" for clarity

---

This requirements specification provides a comprehensive, detailed foundation for implementation teams to build a production-ready e-commerce shopping mall platform backend consistent with stakeholder expectations and business rules.