# E-Commerce Shopping Mall Platform Requirements

## 1. Customer Account Management

### 1.1 Registration and Login
- WHEN a user attempts to use the platform, THE system SHALL require user registration; no guest browsing is allowed.
- WHEN a customer chooses to register, THE system SHALL allow signup with an email and password.
- WHEN a customer logs in, THE system SHALL authenticate the user with email and password, returning a session or token on success within 2 seconds.
- WHEN a customer wants to change their password, THE system SHALL allow password updates after authentication.
- WHEN a customer chooses to delete their account, THE system SHALL delete their profile information but preserve their order and order history for legal purposes.
- WHEN a customer deletes their account, THE system SHALL preserve their reviews but mark them as "deleted user" in all displays.

### 1.2 Account Deletion Effects
- WHEN a customer deletes their account, THEN their personal profile data SHALL be permanently deleted.
- WHEN a customer deletes their account, THEN their orders and order history SHALL be preserved in the system for seller records and legal compliance.
- WHEN a customer deletes their account, THEN their reviews SHALL remain visible but the author SHALL be anonymized as "deleted user".

## 2. Customer Profile

- WHEN a customer views or edits their profile, THE system SHALL allow them to view and modify their display name and phone number.

## 3. Address Management

- WHEN a customer wants to add a shipping address, THE system SHALL allow entry of recipient name, phone number, street address, city, state/province, postal code, and country.
- WHEN a customer edits or deletes an address, THE system SHALL update or remove the address accordingly.
- WHEN a customer sets an address as default, THE system SHALL flag it as the default shipping address.
- EACH customer MAY have multiple shipping addresses.

## 4. Seller Account Management

### 4.1 Registration and Approval
- WHEN a seller registers, THE system SHALL accept email and password.
- WHEN a seller requests to activate their selling privileges, THE system SHALL require administrator approval before enabling selling.
- WHEN sellers inquire about their approval status, THE system SHALL provide status values: pending, approved, or rejected.
- WHEN a seller is rejected, THE system SHALL provide the rejection reason.
- WHEN a seller is rejected, THEY MAY submit a new registration request.

### 4.2 Seller Login and Password Change
- WHEN a seller logs in, THE system SHALL authenticate them via email and password within 2 seconds.
- WHEN a seller wants to change their password, THEY SHALL be able to do so after authentication.

### 4.3 Seller Account Deletion
- WHEN a seller attempts to delete their account, THE system SHALL prevent deletion if they have any pending orders in paid or shipped status.
- WHEN a seller attempts to delete their account, THE system SHALL prevent deletion if they have any pending cancellation or refund requests.
- WHEN a seller successfully deletes their account, THE system SHALL remove their product listings but preserve order history and snapshot data.
- WHEN a seller account is deleted, THE system SHALL preserve the seller's shop name in past orders.

## 5. Seller Profile

- WHEN a seller edits their profile (shop name, description, logo), THE system SHALL create a snapshot recording the previous state.
- Customers SHALL be able to view seller profiles.

## 6. Categories Management

- Categories SHALL be organized with one level of subcategories.
- Administrators SHALL manage category creation, editing, and deletion.
- WHEN a category is deleted, THE system SHALL mark products previously in that category as uncategorized.
- Customers SHALL be able to browse all categories and view products within.

## 7. Snapshot Principle

- WHEN editable data changes, THE system SHALL create an immutable snapshot recording the timestamp, changed fields, and before/after values.
- Snapshots SHALL apply to products, product variants, seller profiles, order items, reviews, cancellation requests, and refund requests.
- Snapshots SHALL preserve historical data for dispute resolution and legal compliance.

## 8. Products

### 8.1 Product Creation
- WHEN a seller creates a product, THE system SHALL require name, description, category (or subcategory), and base price.
- Products SHALL belong to the creating seller.

### 8.2 Product Editing and Deletion
- WHEN a seller edits a product, THE system SHALL create a product snapshot.
- WHEN a seller deletes a product, THE system SHALL prevent deletion if any variant has pending order items or pending cancellation/refund requests.
- WHEN a product is deleted, THE system SHALL remove the product and all its variants and inventory records, and it SHALL no longer appear in listings or search.

### 8.3 Product Images
- Sellers SHALL be able to upload multiple images per product.
- Images may be reordered; the first image SHALL be the main thumbnail.
- Image changes SHALL be recorded in product snapshots.

### 8.4 Product Variants
- EACH product SHALL have one or more variants with unique SKU codes.
- Variants SHALL include option values, price overrides (optional), and stock quantity (starting at 0).
- Sellers SHALL create, edit, and delete variants under rules preventing deletion when linked to pending orders or requests.
- Products without variants SHALL be visible but marked as "unavailable" in search.

## 9. Inventory Management

- EACH variant's stock quantity SHALL be managed via inventory history records containing quantity changes, reasons, and timestamps.
- Stock SHALL be the sum of all quantity changes.
- Sellers SHALL be able to add or subtract stock with reasons recorded.
- Orders SHALL create negative inventory entries; cancellations/refunds SHALL restore stock.
- Variants with zero stock SHALL be marked "out of stock" and cannot be added to carts.

## 10. Product Search and Listing

- Customers SHALL search products by name.
- Search results SHALL be paginated and filterable by category, price range, and stock status.
- Sorting options include newest first and price-based orders.
- Product listings SHALL show the main image, name, base or range price, seller's shop name, and average rating.

## 11. Product Detail Page

- Full product details SHALL be displayed, including images, category, seller profile link, variants, pricing, stock status, reviews, and average ratings.

## 12. Wishlist

- Customers SHALL add and remove products from their wishlists.
- Wishlists SHALL be paginated and show products (not variants).
- Deleted products SHALL be automatically removed from all wishlists.

## 13. Shopping Cart

- Customers SHALL add specific variants to carts with specified quantities.
- Cart SHALL merge quantities for identical variants instead of separate lines.
- Customers SHALL edit quantities or remove items.
- Cart SHALL warn if quantities exceed variant stock or if items are out of stock or deleted.
- Cart SHALL display item details and order total.

## 14. Checkout Process

- Customers SHALL select shipping addresses at checkout; unavailable items shall not proceed.
- Order summaries SHALL display itemized prices, shipping info, and total cost.
- Shipping addresses SHALL be fixed upon order placement.

## 15. Payment and Order Creation

- Payments SHALL be processed via an external gateway.
- Payment failures SHALL prevent order creation and allow retry.
- Successful payments SHALL trigger order creation, stock reduction, cart item removal, and snapshot saving for products, variants, and seller profiles.

## 16. Order Structure and Status

- Orders SHALL consist of multiple order items, each item tracking quantities and statuses.
- Item statuses include paid, shipped, delivered, cancelled, and refunded.
- Overall order status SHALL be derived from item states with specific rules for mixed statuses.

## 17. Shipping and Tracking

- Shipments SHALL be created per seller, including tracking info.
- Sellers SHALL manage shipping items and assign tracking details.
- Customers SHALL view tracking and confirm delivery within 14 days or auto-confirm occurs.

## 18. Order Cancellation

- Customers SHALL request cancellations per order item, including reasons.
- Sellers SHALL approve or reject cancellations, with snapshots recorded.
- Approved cancellations SHALL update item status and restore stock.
- Overall order status SHALL update if all items are cancelled.

## 19. Refund Requests

- Refunds SHALL be requested per delivered item within 7 days.
- Sellers SHALL approve or reject refunds, with snapshots recorded.
- Approved refunds SHALL update status and restore stock.
- Overall order status SHALL update if all items are refunded.

## 20. Reviews and Ratings

- Customers SHALL write reviews after delivery, one per product per order.
- Reviews SHALL include rating and optional text.
- Reviews SHALL be editable and deletable by authors, with snapshots preserved.
- Products' average ratings SHALL exclude deleted reviews.

## 21. Seller Dashboard

- Sellers SHALL view summaries of products, order items, and pending requests.
- Sellers SHALL filter order items by status.

## 22. Administrator System

### 22.1 Becoming an Administrator
- Users MAY request administrator status with reasons.
- Super administrators SHALL approve or reject requests.
- Approved users SHALL become regular administrators.

### 22.2 Administrator Grades
- Two grades exist: regular and super administrators.
- Super administrators SHALL promote/demote others except themselves.

### 22.3 Seller Management
- Administrators SHALL approve, reject, suspend, and unsuspend sellers.
- Suspended sellers' products SHALL be hidden and disabled for purchases but allowed for existing order processing.

### 22.4 Category Management
- Administrators SHALL manage categories including creation, editing, and deletion.

### 22.5 Product Oversight
- Administrators SHALL view and delete any product and view product snapshots.

### 22.6 Order Oversight
- Administrators SHALL view all orders and force cancel or refund as needed.

### 22.7 User Management
- Administrators SHALL ban/unban customers and sellers; banned users cannot log in.
- Existing orders for banned sellers remain.

## 23. Performance and Error Handling

### 23.1 Performance Expectations
- WHEN users submit login or data requests, THE system SHALL respond within specified timeframes (2-5 seconds).
- THE system SHALL handle at least 500 concurrent users and 100 concurrent orders without degradation.
- THE system SHALL degrade gracefully under excess load with throttling and burst handling.

### 23.2 Error Handling
- THE system SHALL return clear error messages for authentication failures without revealing sensitive info.
- Validation errors SHALL be detailed for missing/invalid inputs.
- Payment failures SHALL allow retry without creating orders.
- Snapshots SHALL record cancellation/refund approvals or rejections.
- System errors SHALL provide generic responses and log details for admin review.

### 23.3 System Availability
- THE system SHALL maintain 99.9% uptime and minimize downtime during peak hours.
- Maintenance shall be scheduled in off-peak hours with advance user notifications.
- Failover mechanisms SHALL ensure service continuity and data consistency.

---

```mermaid
graph LR
  A["User Request"] --> B{"Input Valid?"}
  B --|"No"| C["Return Validation Error"]
  B --|"Yes"| D["Process Request"]
  D --> E{"Success?"}
  E --|"No"| F["Return Error Message"]
  E --|"Yes"| G["Return Success"]

  subgraph "Error Handling"
    C
    F
  end

  subgraph "Logging and Recovery"
    F --> H["Log Error"]
    H --> I["Notify Admin"]
    I --> G
  end

  style A fill:#f9f,stroke:#333,stroke-width:4px
  style B fill:#ccf,stroke:#333,stroke-width:2px
  style C fill:#fcc,stroke:#900,stroke-width:2px
  style D fill:#cfc,stroke:#090,stroke-width:2px
  style E fill:#ccf,stroke:#339,stroke-width:2px
  style F fill:#fcc,stroke:#900,stroke-width:2px
  style G fill:#cfc,stroke:#090,stroke-width:2px
  style H fill:#fcf,stroke:#939,stroke-width:1px
  style I fill:#cff,stroke:#399,stroke-width:1px
```