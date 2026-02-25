# Business Rules and Constraints

This document consolidates all business rules, validation requirements, and conditional constraints that apply across multiple features and actors in the e-commerce shopping mall platform. These rules ensure consistency, maintain data integrity, and govern the behavior of the system across all user interactions.

## 1. Registration and Authentication Rules

### 1.1 Platform Access Requirements

THE system SHALL require user registration for any platform feature access.

The platform operates as a closed ecosystem where all functionality requires authentication. There is no guest browsing capability—users must create an account before accessing any features.

### 1.2 Customer Registration Rules

THE system SHALL accept customer registration with email and password credentials.

**Validation Requirements**:
- Email address must be unique across all customer accounts
- Email address must be in valid email format
- Password must meet minimum security requirements

WHEN a customer attempts to register with an existing email, THE system SHALL reject the registration and display an appropriate error message.

### 1.3 Seller Registration and Approval Process

THE system SHALL require administrator approval before a seller can sell products.

**Registration Workflow**:
1. Seller submits registration with email and password
2. System creates account with "pending" approval status
3. Administrator reviews and approves or rejects
4. If rejected, seller can view rejection reason
5. Rejected sellers may submit new registration request

WHEN a seller account is in pending status, THE system SHALL prevent the seller from creating products.

WHEN a seller account is approved, THE system SHALL grant full seller capabilities.

WHEN a seller account is rejected, THE system SHALL allow the seller to submit a new registration request.

### 1.4 Administrator Hierarchy Rules

THE system SHALL maintain two administrator grades: regular administrator and super administrator.

**Grade-Based Permissions**:
- Super administrators can promote regular administrators to super administrator status
- Super administrators can demote other super administrators to regular administrator
- Super administrators SHALL NOT demote themselves
- Regular administrators cannot manage administrator grades

WHEN a user requests to become an administrator, THE system SHALL require a reason text and submit the request for super administrator review.

### 1.5 Account Deletion Rules

**Customer Account Deletion**:
THE system SHALL allow customers to delete their accounts unconditionally.

**Seller Account Deletion Conditions**:
THE system SHALL allow seller account deletion ONLY IF all of the following conditions are met:
- No pending order items (paid or shipped status) exist for any of the seller's products
- No pending cancellation requests exist for any of the seller's products
- No pending refund requests exist for any of the seller's products

WHEN a seller attempts to delete their account while pending orders or requests exist, THE system SHALL reject the deletion and display the reason.

## 2. Product and Inventory Rules

### 2.1 Product Creation Requirements

THE system SHALL require the following fields for product creation:
- Product name (required)
- Description (required)
- Category (required, subcategory optional)
- Base price (required)

THE system SHALL associate each product with the seller who created it.

### 2.2 Product Variant (SKU) Rules

THE system SHALL allow products to have zero or more variants.

**Variant Requirements**:
- SKU code (required, unique identifier)
- Option values (e.g., color: "Red", size: "Large")
- Price override (optional—uses base price if not specified)
- Stock quantity (required, starts at 0)

**Purchasability Rules**:
- A product with at least one variant is purchasable
- A product with zero variants is visible in search results but shown as "unavailable"
- A product must have at least one variant to be added to cart

WHEN a product has no variants, THE system SHALL display the product as "unavailable" and prevent purchase.

### 2.3 Inventory Management Rules

THE system SHALL manage stock quantity exclusively through inventory history records.

**Inventory Record Structure**:
- Quantity change (positive for restocking, negative for orders/adjustments)
- Reason (text description)
- Timestamp

**Current Stock Calculation**:
THE system SHALL calculate current stock as the sum of all inventory records for a variant.

**Stock Status Rules**:
- WHEN stock quantity reaches 0, THE system SHALL mark the variant as "out of stock"
- WHEN a variant is out of stock, THE system SHALL prevent adding it to cart

**Automatic Inventory Updates**:
- WHEN an order is placed successfully, THE system SHALL create a negative inventory record for each purchased variant
- WHEN an order item is cancelled, THE system SHALL create a positive inventory record to restore stock
- WHEN a refund is approved, THE system SHALL create a positive inventory record to restore stock

### 2.4 Product Deletion Rules

THE system SHALL allow product deletion ONLY IF all of the following conditions are met:
- No pending order items (paid or shipped status) exist for any variant of the product
- No pending cancellation requests exist for any variant of the product
- No pending refund requests exist for any variant of the product

**Deletion Cascade**:
WHEN a product is deleted, THE system SHALL also delete:
- All variants associated with the product
- All inventory records for those variants

**Post-Deletion Visibility**:
- Deleted products SHALL NOT appear in search results
- Deleted products SHALL NOT appear in category listings
- Product snapshots SHALL be preserved after deletion

### 2.5 Variant Deletion Rules

THE system SHALL allow variant deletion ONLY IF all of the following conditions are met:
- No pending order items (paid or shipped status) exist for that variant
- No pending cancellation requests exist for that variant
- No pending refund requests exist for that variant

WHEN the last variant of a product is deleted, THE system SHALL mark the product as "unavailable" for purchase.

## 3. Order and Payment Rules

### 3.1 Checkout Requirements

THE system SHALL require customers to select a shipping address before placing an order.

**Order Summary Review**:
- List of items with prices
- Shipping address
- Total price

WHEN a customer confirms an order, THE system SHALL NOT allow changes to the shipping address.

### 3.2 Cart Validation Rules

**Unavailable Item Handling**:
- WHEN a variant's stock is less than cart quantity, THE system SHALL display a warning
- WHEN a variant is deleted or out of stock, THE system SHALL mark it as unavailable in the cart
- WHEN an unavailable item exists in cart, THE system SHALL prevent checkout for that item

**Quantity Combination**:
WHEN the same variant is added to cart multiple times, THE system SHALL combine the quantities into a single cart item.

### 3.3 Payment Processing Rules

**Payment Outcomes**:
- Payment can succeed or fail
- IF payment fails, THE system SHALL NOT create the order and allow retry
- IF payment succeeds, THE system SHALL create the order with all items in "paid" status

### 3.4 Order Creation Rules

WHEN an order is created successfully, THE system SHALL perform the following actions atomically:
1. Decrease stock quantities for each purchased variant (via inventory records)
2. Remove purchased items from customer's cart
3. Create order record with unique order number
4. Create order items with "paid" status
5. Save snapshots of each purchased product and variant
6. Save snapshots of each seller's profile

**Snapshot Preservation**:
Each order item SHALL include:
- Product snapshot (name, description, images at time of purchase)
- Variant snapshot (SKU code, option values, price at time of purchase)
- Seller profile snapshot (shop name, logo at time of purchase)

### 3.5 Order Structure Rules

**Order Item Definition**:
- An order contains one or more order items
- Each order item represents a purchased variant with a quantity
- Multiple quantities of the same variant become one order item with quantity > 1

**Multi-Seller Orders**:
- Order items can be from different sellers
- Each order item has its own independent status
- Each order item can be individually cancelled or refunded

### 3.6 Order Status Derivation Rules

THE system SHALL derive overall order status from item statuses as follows:

| Item Status Condition | Order Status |
|----------------------|---------------|
| All items are "paid" | "paid" |
| Any item is "shipped" (and none delivered) | "shipped" |
| All items are "delivered" | "delivered" |
| All items are "cancelled" | "cancelled" |
| All items are "refunded" | "refunded" |
| Mixed states (e.g., some delivered, some refunded) | "partially completed" |

## 4. Shipping and Delivery Rules

### 4.1 Shipment Structure Rules

THE system SHALL group order items into shipments based on the following rules:
- Different sellers always ship separately (different shipments)
- A seller can bundle multiple items into one shipment
- All items in a shipment share the same tracking information

### 4.2 Shipping Process Rules

WHEN a seller ships items, THE system SHALL:
1. Allow seller to select one or more of their items to include in shipment
2. Require carrier name and tracking number
3. Change all items in shipment to "shipped" status

### 4.3 Delivery Confirmation Rules

**Customer Confirmation**:
- Customers confirm delivery per shipment (not per item)
- WHEN a customer confirms delivery, THE system SHALL change all items in that shipment to "delivered" status

**Automatic Delivery**:
- WHEN 14 days have passed since shipping without customer confirmation, THE system SHALL automatically change items to "delivered" status

## 5. Cancellation and Refund Rules

### 5.1 Item-Level Operation Principle

THE system SHALL handle cancellation and refund at the order item level, NOT at the order level.

**Implications**:
- Customers request cancellation for individual items
- Customers request refund for individual items
- Sellers approve/reject requests for individual items
- The remaining items in an order continue processing normally

### 5.2 Cancellation Request Rules

**Eligibility**:
- Customers can request cancellation ONLY for items with "paid" status
- Customers cannot request cancellation for shipped or delivered items

**Request Requirements**:
- Cancellation request must include a reason (text)
- Seller of that item reviews and responds

**Seller Response**:
- WHEN a seller approves, THE system SHALL cancel the item and process refund
- WHEN a seller rejects, THE system SHALL notify the customer
- WHEN a seller responds, THE system SHALL create a snapshot of the request state

**Stock Restoration**:
WHEN a cancellation is approved, THE system SHALL create a positive inventory record to restore stock.

### 5.3 Refund Request Rules

**Eligibility**:
- Customers can request refund ONLY for items with "delivered" status
- Refund must be requested within 7 days of delivery

WHEN a customer attempts to request refund after 7 days, THE system SHALL reject the request.

**Request Requirements**:
- Refund request must include a reason (text)
- Seller of that item reviews and responds

**Seller Response**:
- WHEN a seller approves, THE system SHALL mark the item as "refunded"
- WHEN a seller rejects, THE system SHALL notify the customer
- WHEN a seller responds, THE system SHALL create a snapshot of the request state

**Stock Restoration**:
WHEN a refund is approved, THE system SHALL create a positive inventory record to restore stock.

### 5.4 Order Status After Item Operations

- IF all items in an order are cancelled, THE system SHALL set order status to "cancelled"
- IF all items in an order are refunded, THE system SHALL set order status to "refunded"
- IF some items are cancelled/refunded and others continue, THE system SHALL set order status to "partially completed"

## 6. Review and Rating Rules

### 6.1 Review Eligibility Rules

THE system SHALL allow reviews ONLY for items with "delivered" status.

**One Review Per Product Per Order**:
- A customer can write one review per product per order
- If a customer buys the same product multiple times (different orders), they can write a review for each purchase

### 6.2 Review Content Requirements

**Required Fields**:
- Rating: 1 to 5 stars (required)

**Optional Fields**:
- Text content (optional)

### 6.3 Review Display Rules

THE system SHALL display reviews sorted by newest first.

**Average Rating Calculation**:
THE system SHALL calculate average rating from all non-deleted reviews.

**Deleted Reviews**:
- WHEN a customer deletes their review, THE system SHALL remove it from display
- WHEN a review is deleted, THE system SHALL preserve all snapshots
- Deleted reviews SHALL NOT be included in average rating calculation

### 6.4 Review Editing and Snapshot Rules

WHEN a customer edits their review, THE system SHALL create a snapshot preserving:
- Previous rating value
- Previous text content
- Timestamp of change

## 7. Deletion and Data Preservation Rules

### 7.1 Customer Account Deletion Rules

WHEN a customer deletes their account, THE system SHALL:
- Delete profile information (display name, phone number)
- Delete shipping addresses
- Delete wishlist
- Delete shopping cart
- Preserve all orders and order history
- Preserve all reviews but display as "deleted user"

**Justification**: Orders and reviews are preserved for seller records, legal compliance, and dispute resolution.

### 7.2 Seller Account Deletion Rules

**Pre-Deletion Conditions** (see Section 1.5):
Seller deletion is conditional on having no pending orders or requests.

WHEN a seller deletes their account, THE system SHALL:
- Delete all products and their variants
- Delete inventory records
- Delete shop profile
- Preserve order history and snapshots
- Preserve shop name in past order records

**Product Removal Effect**:
- Deleted products removed from search and category listings
- Product variants removed
- All snapshots preserved

### 7.3 Snapshot Immutability Principle

THE system SHALL make all snapshots immutable.

**Snapshot Persistence**:
- Snapshots cannot be modified after creation
- Snapshots cannot be deleted
- Snapshots are preserved even after parent entity deletion

**Snapshot Access**:
- Users can view their own entity snapshots
- Administrators can view any entity snapshots
- Snapshots are used for dispute resolution

## 8. Seller Suspension Rules

### 8.1 Suspension Effects

WHEN a seller account is suspended by an administrator, THE system SHALL:
- Hide all products from search and category listings
- Prevent new purchases of seller's products
- Allow seller to process existing orders (ship items, respond to requests)
- Prevent creation of new products
- Prevent editing of existing products

### 8.2 Unsuspension

WHEN a seller account is unsuspended, THE system SHALL restore product visibility in search and category listings.

## 9. Search and Filtering Rules

### 9.1 Product Search Rules

THE system SHALL provide search functionality across all products from all sellers.

**Search Scope**:
- Search by product name
- Results are paginated

### 9.2 Filter Options

THE system SHALL allow filtering by:
- Category (single or multiple)
- Price range (minimum and maximum)
- In-stock only

### 9.3 Sorting Options

THE system SHALL allow sorting by:
- Newest first (default)
- Price low to high
- Price high to low

## 10. Address Management Rules

### 10.1 Address Requirements

THE system SHALL require the following fields for each shipping address:
- Recipient name
- Phone number
- Street address
- City
- State/Province
- Postal code
- Country

### 10.2 Default Address Rules

THE system SHALL allow customers to designate exactly one address as the default shipping address.

**Default Address Behavior**:
- IF no default is set and customer has addresses, THE system SHALL prompt selection during checkout
- IF default address is deleted, THE system SHALL remove default designation without auto-assigning a new default

## 11. Administrator Oversight Rules

### 11.1 Force Operations

**Force Cancel**:
- Administrators can force-cancel individual items or entire orders
- Force-cancel refunds the customer
- Force-cancel restores stock via inventory record

**Force Refund**:
- Administrators can force-refund individual items or entire orders
- Force-refund does not require seller approval
- Force-refund restores stock via inventory record

### 11.2 User Ban Rules

WHEN an administrator bans a customer, THE system SHALL:
- Prevent the customer from logging in
- Preserve all existing data (orders, reviews, etc.)

WHEN an administrator bans a seller, THE system SHALL:
- Prevent the seller from logging in
- Preserve all existing data (products, orders, etc.)
- Existing orders continue processing

## 12. Category Management Rules

### 12.1 Category Structure Rules

THE system SHALL support exactly one level of category nesting (subcategories).

- A category can have zero or more subcategories
- Subcategories cannot have further nested categories
- Products can be assigned to either a category or subcategory

### 12.2 Category Deletion Rules

WHEN an administrator deletes a category, THE system SHALL:
- Uncategorize all products in that category
- Not delete the products
- Subcategories become top-level categories if parent is deleted (or can be deleted with parent)

## 13. Snapshot Creation Triggers Summary

The following events trigger snapshot creation:

| Entity | Trigger Event | Snapshot Contents |
|--------|---------------|-------------------|
| Product | Product edit | All product fields + all variant snapshots |
| Product Variant | Variant edit | SKU code, option values, price |
| Seller Profile | Profile edit | Shop name, description, logo |
| Order Item | Order creation | Product, variant, and seller profile at purchase time |
| Review | Review edit | Previous rating and text content |
| Cancellation Request | Seller response | Request state at time of response |
| Refund Request | Seller response | Request state at time of response |