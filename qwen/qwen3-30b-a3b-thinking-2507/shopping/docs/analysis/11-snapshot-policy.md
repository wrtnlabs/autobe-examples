# E-Commerce Shopping Mall Platform

## Customer Account

**Business Requirements**

WHEN a customer attempts to access any platform feature, THE system SHALL require registration before access. THE system SHALL provide explicit sign-up and login flows using email and password. WHEN a customer changes their password, THE system SHALL verify the current password prior to accepting the new password. WHEN a customer deletes their account, THE system SHALL permanently erase all profile information while preserving order history, reviews with 'deleted user' display, and legal records. THE system SHALL explicitly state the account deletion implications to the customer before proceeding.

**Authentication Flow**

```
graph LR
  A[Customer Visit] --> B{Logged In?}
  B -->|No| C[Registration/Authentication Prompt]
  B -->|Yes| D[Feature Access]
  C --> E[Email/Password Registration]
  E --> F[Account Creation]
  F --> D
  E --> G[Login with Password]
  G --> D
```

## Customer Profile

**Profile Management Requirements**

WHEN a customer requests to edit their display name or phone number, THE system SHALL capture the previous values before update and maintain a snapshot. THE system SHALL validate phone number format against business regulations. THE system SHALL allow customers to view their profile in a dedicated section visible without navigation from the home screen.

## Address Management

**Shipping Address Workflows**

WHEN a customer adds a new shipping address, THE system SHALL require all fields and validate address structure against country-specific requirements. WHEN a customer sets a default address, THE system SHALL automatically disable the previous default address for that user. WHEN a customer deletes an address, THE system SHALL provide a confirmation dialog with impact explanation.

## Seller Account

**Seller Registration and Approval**

WHEN a seller submits registration, THE system SHALL record the request and initiate an approval process. WHEN a seller is rejected, THE system SHALL provide the rejection reason and allow resubmission. WHEN a seller deletes their account, THE system SHALL check for pending orders and cancellation requests before proceeding, with explicit confirmation of data preservation.

**Seller Approval State Logic**

```
graph LR
  A[Seller Registration] --> B{Admin Approval?}
  B -->|Pending| C[Pending State]
  B -->|Approved| D[Active Seller]
  B -->|Rejected| E[Rejection Reason]
  E --> F[Resubmission Allowed]
```

## Seller Profile

**Profile Management and Snapshot**

WHEN a seller updates their shop name, description, or logo, THE system SHALL capture a full snapshot of all fields at that time. THE system SHALL display the current shop name only, with historical versions accessible only to the seller and administrators. THE system SHALL prevent shop name changes that conflict with existing business names.

## Categories

**Hierarchical Category Structure**

WHEN an administrator creates a category, THE system SHALL allow a single level of subcategories. THE system SHALL make categories browseable by customers, with the ability to filter products by the selected category hierarchy. EVERY category name SHALL be unique across all categories and subcategories.

## Snapshot Principle

**Comprehensive Snapshot Policy**

THE e-commerce platform SHALL implement an immutable snapshot system for all modification events involving financial transactions. EVERY data modification to products, variants, seller profiles, order items, reviews, and cancellations SHALL trigger a snapshot creation. THE system SHALL capture timestamp, user ID, and all previous values. ALL snapshots SHALL be preserved indefinitely for legal compliance and dispute resolution.

**Snapshot Access Rules**

| Data Type | Customer | Seller | Admin |
|-----------|----------|--------|-------|
| Product Snapshots | ❌ | ✅ | ✅ |
| Product Variant Snapshots | ❌ | ✅ | ✅ |
| Seller Profile Snapshots | ❌ | ❌ | ✅ |
| Order Item Snapshots | ✅ | ✅ | ✅ |
| Review Snapshots | ✅ | ❌ | ✅ |

**Snapshot Creation Trigger Logic**

WHEN a product price is modified, THE system SHALL create a snapshot of the product and all related variants. WHEN a review is edited or deleted, THE system SHALL preserve the original content with a deletion timestamp. WHEN an order item's status changes, THE system SHALL capture the product, variant, and seller profile snapshots at that moment.

## Products

**Product Creation and Management**

WHEN a seller creates a product, THE system SHALL require all mandatory fields (name, description, category, base price). THE system SHALL automatically assign a unique product ID. WHEN a product is deleted, THE system SHALL verify no active orders or pending cancellation requests exist. THE system SHALL preserve all product and variant snapshots regardless of deletion status.

## Product Variants

**Variant Management Rules**

WHEN a seller adds a product variant, THE system SHALL validate SKU code uniqueness. THE system SHALL allow each variant to have an override price. WHEN a product variant stock is adjusted, THE system SHALL record previous stock values and reason. THE system SHALL automatically update the product's availability status based on variant stock quantities.

## Inventory Management

**Inventory Tracking Requirements**

WHEN a sale occurs, THE system SHALL decrease variant stock via a negative inventory record. WHEN restocking occurs, THE system SHALL increase stock via a positive inventory record. THE system SHALL track inventory changes including reason and timestamp. WHEN stock reaches zero, THE system SHALL automatically mark variants as "out of stock" and prevent them from being added to the cart.

## Product Search

**Search and Filtering Logic**

WHEN a customer searches products, THE system SHALL display all products from all sellers. THE system SHALL allow filtering by category, price range, and 'in-stock only' criteria. THE system SHALL sort results by 'newest first', 'price low to high', or 'price high to low'. FOR each search result, THE system SHALL display main image, name, price, and seller name.

## Product Detail Page

**Product Display Specifications**

WHEN a customer views a product detail page, THE system SHALL display all product images and main image as thumbnail. THE system SHALL show the current product price (or price range for variants). THE system SHALL display product description, category, seller shop name, average rating, total review count, and all review content. WHEN a product has no variants, THE system SHALL display 'unavailable' with appropriate messaging.

## Wishlist

**Wishlist Functionality**

WHEN a customer adds a product to their wishlist, THE system SHALL record the product ID without variant specificity. WHEN a seller deletes a product, THE system SHALL automatically remove it from all customer wishlists. THE system SHALL display a paginated wishlist with product thumbnails, names, and current prices.

## Shopping Cart

**Cart Management Requirements**

WHEN a customer adds a variant to their cart, THE system SHALL check inventory quantity. IF variant stock is insufficient for the requested quantity, THE system SHALL display a warning message. WHEN an item is in cart with insufficient stock, THE system SHALL prevent checkout until quantity adjustment. THE system SHALL combine identical variants into single cart entries with total quantities.

## Checkout

**Checkout Process Flow**

WHEN a customer proceeds to checkout, THE system SHALL require a shipping address. THE system SHALL display order summary including items, price, shipping address, and total. THE system SHALL prevent changes to shipping address after order confirmation. FOR products with insufficient stock, THE system SHALL show warning and exclude those items from checkout.

## Payment

**Payment Integration**

WHEN payment is requested, THE system SHALL integrate with external payment gateway. IF payment fails, THE system SHALL retain cart item quantities and allow retry. IF payment succeeds, THE system SHALL decrease inventory quantities and create order records with snapshots of all relevant data.

## Order Creation

**Order Processing Requirements**

WHEN a successful payment occurs, THE system SHALL create an order record. THE system SHALL associate each product variant with its snapshot at time of purchase. THE system SHALL automatically create a new order item for each variant with purchased quantity. THE system SHALL maintain inventory changes via positive/negative records.

## Order Structure

**Order Item Management**

WHEN an order is created, THE system SHALL group items by seller. THE system SHALL allow individual item cancellation or refund requests. THE system SHALL update overall order status based on item statuses. FOR all order items, THE system SHALL display product name, variant, quantity, price, and item status.

## Order Status

**Status Calculation Logic**

THE order status SHALL be:
- "Paid": If all items are paid
- "Shipped": If any item is shipped and none delivered yet
- "Delivered": If all items are delivered
- "Cancelled": If all items are cancelled
- "Refunded": If all items are refunded
- "Partially Completed": If mixed statuses exist

## Shipping and Tracking

**Shipment Management**

WHEN a seller ships items, THE system SHALL create a shipment with carrier and tracking number. THE system SHALL group items by seller into shipment packages. WHEN a shipment is created, THE system SHALL change item statuses to "shipped". THE system SHALL confirm delivery after 14 days without customer confirmation.

## Order Cancellation

**Cancellation Workflow**

WHEN a customer requests item cancellation, THE system SHALL verify item status is "paid". THE system SHALL require a reason for cancellation. WHEN seller approves cancellation, THE system SHALL update item status to "cancelled" and restore stock via inventory record. THE system SHALL automatically update overall order status when all items are cancelled.

## Refund Requests

**Refund Process Requirements**

WHEN a customer requests refund within 7 days of delivery, THE system SHALL verify item status is "delivered". THE system SHALL require a reason for refund. WHEN seller approves refund, THE system SHALL update item status to "refunded" and restore stock. THE system SHALL automatically update overall order status when all items are refunded.

## Reviews and Ratings

**Review Management**

WHEN a customer writes a review, THE system SHALL require item delivery status. THE system SHALL allow only one review per product per order. WHEN a review is edited or deleted, THE system SHALL preserve the original content. THE system SHALL ensure average rating calculation includes all non-deleted reviews only.

## Seller Dashboard

**Seller Analytics**

WHEN a seller views their dashboard, THE system SHALL display total products, order items, pending cancellation requests, and pending refund requests. THE system SHALL allow sellers to filter order items by status. THE system SHALL display a summary view of current order status distribution.

## Administrator System

**Admin Management Functions**

WHEN an administrator views user management, THE system SHALL display all customers, sellers, and administrators. THE system SHALL allow administrators to ban users, view account details, and manage administrator roles. THE system SHALL provide a comprehensive audit trail for all user management actions.