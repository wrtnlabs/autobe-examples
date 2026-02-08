# E-Commerce Shopping Mall Platform Requirements Specification

## 1. Customer Account Management

- WHEN a user attempts to register, THE system SHALL require a valid email and a strong password that satisfies defined complexity rules.
- WHEN a customer registers, THE system SHALL send a confirmation email and require email verification before access to other features.
- WHEN a customer attempts to log in, THE system SHALL validate the email and password and establish a secure session upon success.
- WHEN login attempts exceed 5 consecutive failures, THE system SHALL temporarily lock the account for 15 minutes to prevent brute-force attacks.
- WHEN a customer wishes to change their password, THE system SHALL verify the current password and require a strong new password.
- WHEN a customer deletes their account, THE system SHALL delete all personally identifiable profile data but preserve order history and reviews with anonymized identifiers labeled as "deleted user".
- IF a customer attempts to use any platform feature without registration, THE system SHALL deny access and request login.
- Customer accounts SHALL never support guest browsing or guest checkout.

## 2. Customer Profile

- EACH customer SHALL have a profile containing a display name and a phone number.
- Customers SHALL be able to update their display name and phone number at any time.
- The system SHALL validate phone numbers conforming to international formats.
- Customer profile edits SHALL create audit log entries for change tracking.

## 3. Address Management

- Customers SHALL be able to add multiple shipping addresses.
- Each address SHALL include recipient name, phone number, street address, city, state or province, postal code, and country.
- Customers SHALL be able to edit and delete any of their saved addresses.
- Customers SHALL be able to designate exactly one default shipping address.
- The system SHALL validate all address inputs for completeness and format.

## 4. Seller Account Management

- Sellers SHALL register using a valid email and password, undergoing administrator approval before activation.
- Sellers SHALL be able to log in using their credentials; the system SHALL enforce password complexity and account lockout policies as for customers.
- Sellers SHALL have an approval status indicator with values: pending, approved, rejected.
- WHEN a seller is rejected, THE system SHALL record the rejection reason and notify the seller.
- Rejected sellers SHALL be able to submit a new registration request.
- Sellers SHALL be prevented from deleting accounts if they have any pending orders (paid or shipped status) or pending cancellation or refund requests.
- WHEN a seller deletes their account, THE system SHALL delete all product listings associated with the seller but preserve order histories and snapshots, retaining the seller's shop name in historical orders.

## 5. Seller Profile

- EACH seller SHALL have a profile comprising shop name, shop description, and logo image.
- Sellers SHALL be able to update their shop name, description, and logo, with each update creating an immutable snapshot recording previous states.
- Customers SHALL be able to view seller profiles through linked product details or search.

## 6. Categories

- Products SHALL be organized into categories with one-level subcategories.
- Administrators SHALL create, edit, and delete categories and subcategories.
- WHEN deleting a category, THE system SHALL reassign products in that category to an uncategorized state.
- Customers SHALL browse all categories and view products within them.

## 7. Snapshot Principle

- All editable data modifications SHALL trigger the creation of immutable snapshots preserving the previous state.
- Snapshots SHALL include timestamp of change, the changed fields, and values before and after modification.
- Snapshots SHALL be viewable by owners and administrators for dispute resolution.
- Snapshot data includes:
  - Product details and variants
  - Seller profile information
  - Order items with product and seller snapshots
  - Reviews with versions
  - Cancellation and refund requests with status changes

## 8. Products

- Sellers SHALL create products with required fields: name, description, category (including subcategory), and base price.
- Products SHALL belong exclusively to the creating seller.
- Sellers SHALL be able to edit their products; each edit SHALL create snapshots.
- Sellers SHALL delete products only if no pending paid or shipped order items for any variant exist and no pending cancellation or refund requests are active.
- WHEN a product is deleted, all its variants and inventory records SHALL be deleted.
- Deleted products SHALL be hidden from search results and category listings.
- Sellers and administrators SHALL be able to view snapshots of products.

## 9. Product Images

- Sellers SHALL upload multiple images per product and reorder them.
- The first image SHALL be designated as the main or thumbnail image.
- Sellers SHALL be able to delete images, with changes included in the subsequent product snapshots.

## 10. Product Variants (SKU)

- Sellers SHALL add multiple variants to a product, each representing a combination of option values.
- Each variant SHALL have a unique SKU code, optional override price, and required stock quantity starting at zero.
- Sellers SHALL be able to edit variant details, triggering snapshots on each change.
- Sellers may delete variants only if no pending paid or shipped orders or cancellation/refund requests are present for the variant.
- Products WITHOUT variants SHALL be visible in search but marked as "unavailable" for purchase.

## 11. Inventory Management

- Inventory SHALL be managed through history records tracking quantity changes with positive (restock) or negative (sales/adjustments) values, reasons, and timestamps.
- Current stock SHALL be calculated as the sum of inventory history quantities.
- Sellers SHALL be able to add or subtract stock via inventory adjustments.
- Orders and cancellations/refunds SHALL automatically adjust inventory accordingly.
- WHEN stock reaches zero, the variant SHALL be shown as "out of stock" and unavailable for cart addition.

## 12. Product Search

- Customers SHALL search products by name with pagination.
- Filtering options SHALL include category, price range, and stock availability.
- Sorting choices SHALL include newest first and price ascending or descending.

## 13. Product Listing

- Listings SHALL display main images, product names, base prices or price ranges, seller shop names, and average ratings when available.

## 14. Product Detail Page

- Detail pages SHALL show all product images, full name and description, category, seller profile link, available variants with prices and stock statuses, average rating, total review count, and full reviews.

## 15. Wishlist

- Customers SHALL be able to add or remove products (not variants) to/from wishlists.
- Wishlists SHALL be paginated and automatically remove deleted products.

## 16. Shopping Cart

- Customers SHALL add specific product variants to carts with quantities.
- Duplicate variants SHALL combine quantities in cart rather than creating separate lines.
- The cart SHALL display product details, variant options, prices, quantities, subtotals, and total price.
- Quantity edits and removals SHALL be supported.
- Cart SHALL warn when requested quantities exceed stock.
- Unavailable or deleted variants SHALL be marked as such.

## 17. Checkout

- At checkout, customers SHALL select a shipping address (default or alternative).
- Unavailable cart items SHALL block checkout.
- Customers SHALL review order summaries including items, prices, shipping address, and total before confirming.
- Shipping address selection SHALL be locked after order placement.

## 18. Payment

- Payment processing SHALL interface with external gateways.
- Payment success SHALL create orders; failure SHALL allow retries without order creation.

## 19. Order Creation

- Successful orders SHALL decrement inventory accordingly and clear relevant cart items.
- Orders SHALL comprise multiple order items each with quantity and associated snapshots of product, variant, and seller profile preserving purchase time details.

## 20. Order Structure

- Orders MAY contain items from multiple sellers.
- Each order item SHALL have individual statuses (paid, shipped, delivered, cancelled, refunded).
- Items from the same seller WHEN shipped SHALL be grouped into shipments.

## 21. Order History

- Customers SHALL view paginated lists of orders sorted newest first.
- Order details SHALL include cart items with product and variant info, shipping addresses, and shipments with tracking data.

## 22. Order Status

- Item statuses shall follow business rules:
  - Paid: payment complete, awaiting shipment
  - Shipped: item shipped
  - Delivered: customer confirmed or auto-delivered after 14 days
  - Cancelled: cancellation approved
  - Refunded: refund approved
- Overall order status shall be derived from item statuses (paid, shipped, delivered, cancelled, refunded, or partial).

## 23. Shipping and Tracking

- Sellers SHALL create shipments for one or more order items, recording carrier and tracking number.
- Shipping changes item statuses to shipped.
- Customers may confirm delivery per shipment; auto-confirm after 14 days.

## 24. Order Cancellation

- Customers MAY request cancellation per order item with status paid.
- Cancellation requests SHALL include reasons.
- Sellers review and approve or reject cancellations; responses SHALL be snapshotted.
- Approved cancellations SHALL update statuses and restore inventory.

## 25. Refund Requests

- Refunds MAY be requested per delivered order item within 7 days.
- Sellers SHALL approve or reject refund requests with reasons and snapshots.
- Approved refunds SHALL update statuses and restore inventory.

## 26. Reviews and Ratings

- Customers MAY submit one review per product per order after delivery.
- Reviews include rating (1 to 5 stars) and optional text.
- Review edits create snapshots; deletions preserve snapshot history.
- Product average ratings SHALL be calculated from non-deleted reviews only.

## 27. Seller Dashboard

- Sellers SHALL view summaries: total products, order items, pending cancellations, pending refunds.
- Sellers SHALL access order item lists with status filters.

## 28. Administrator System

- Users MAY request administrator roles submitting reasons.
- Super administrators SHALL manage role promotions and demotions (excluding self-demotion).
- Administrators SHALL approve/reject seller registrations, suspending or unsuspending seller accounts.
- Suspended sellers SHALL have products hidden and prevent new product creation but may process existing orders.
- Administrators SHALL manage categories, products, orders (including force cancellations and refunds), and user banning/unbanning.

## 29. Security and Compliance

- Authentication SHALL enforce MFA for administrators.
- Session management SHALL timeout after 30 minutes inactivity.
- Password reset SHALL use secure expiring tokens.
- Password changes SHALL invalidate sessions.
- Data SHALL be stored securely with encryption and salted hashing where applicable.
- User bans SHALL prevent login.
- Audit logs SHALL record critical system events.

## 30. Performance and Error Handling

- The platform SHALL respond to requests within 2 seconds under normal load.
- Errors SHALL return clear, user-friendly messages.
- The system SHALL maintain 99.9% uptime.
- Critical failures SHALL trigger alerts and recovery procedures.