## Shopping Cart Management

### Overview

The shopping cart is the central component of the e-commerce conversion funnel. It enables users to collect products for purchase, manage quantities, validate inventory, and proceed to checkout with accurate pricing. This document defines the complete functionality, business rules, and validation logic for the shopping cart system.

### Core User Flows

#### Adding Items to Cart

- WHEN a guest or customer selects a product variant (SKU), THE system SHALL allow addition to the cart.
- WHEN a product variant is added, THE system SHALL validate that the SKU exists, is active, and has positive stock.
- WHEN adding an item to cart, THE system SHALL store the following properties per cart item: SKU ID, product name, unit price at time of addition, quantity, variant attributes (color, size, etc.), and timestamp.
- WHILE a user browses product details, THE system SHALL display real-time inventory status for each variant (e.g., "In stock: 3", "Low stock: 1", "Out of stock").
- IF a product variant has no remaining inventory, THEN THE system SHALL display an error message: "This item is currently out of stock. Please check back later or contact support." and prevent addition to cart.
- WHERE a user attempts to add more than 100 units of a single variant to cart, THEN THE system SHALL cap the quantity at 100 and display notification: "Maximum quantity per item is 100. Quantity has been adjusted."
- REPEATEDLY, WHEN the same SKU is added to cart by the same user, THE system SHALL increase the existing quantity rather than creating a duplicate line item.

#### Removing Items

- WHEN a user selects "Remove" on a cart item, THE system SHALL delete that specific SKU entry from the cart.
- WHEN a user clicks "Clear Cart" button, THE system SHALL remove all items from the cart at once.
- IF a user attempts to remove an item from cart after the order has been submitted, THEN THE system SHALL display: "This item has already been ordered and cannot be removed from cart."
- WHERE a cart item was added by a guest, THEN THE system SHALL persist deletion only for the current session (no record retained after expiration).

#### Quantity Adjustment

- WHEN a user modifies the quantity field of a cart item, THE system SHALL update the cart record immediately with the new value.
- IF the new quantity exceeds available inventory for that SKU, THEN THE system SHALL automatically reduce the quantity to the maximum available stock and display: "Quantity adjusted to available stock: [new quantity]."
- IF the new quantity is set to zero or negative, THEN THE system SHALL remove the item from cart entirely.
- WHILE the user changes quantity, THE system SHALL recalculate subtotal, tax, and total in real-time with no user-triggered refresh required.

#### Cart Summary

- WHILE a cart contains one or more items, THE system SHALL display a summary section showing:
  - Item count
  - Subtotal (sum of quantity × unit price)
  - Applied discounts or coupon codes (if applicable)
  - Estimated tax amount (based on shipping address)
  - Final total amount
- THE cart summary SHALL update within 500ms of any quantity or item change.
- WHERE no items are in cart, THE system SHALL display: "Your cart is empty. Start shopping to see your items here."
- WHEN a user has items in cart but has not logged in, THE system SHALL display: "Sign in to save your cart and continue shopping on any device."

#### Price Calculation (Including Taxes)

- WHEN a cart item is added, THE system SHALL lock in the current SKU unit price at time of addition, regardless of future price changes.
- THE unit price displayed in cart SHALL NOT be affected by subsequent promotions, sales, or relisting by seller.
- WHEN a coupon code is applied, THE system SHALL validate it against rules (active period, minimum cart value, eligible products, usage limit) and apply discount to subtotal before tax.
- IF a coupon code is invalid, expired, or exceeds usage limit, THEN THE system SHALL display: "This coupon code is not valid. Please check for errors or try another code."
- WHERE a district or state tax rate applies, THE system SHALL calculate tax based on the shipping address provided.
- THE tax calculation SHALL be performed according to the latest regulatory rates in effect at time of checkout, not time of cart creation.
- IF no shipping address has been provided, THEN THE system SHALL show: "Enter shipping address to calculate tax."
- THE final cart total SHALL equal: (subtotal - discounts) + tax.

#### Stock Validation

- WHEN any cart item is accessed, THE system SHALL verify that the associated SKU’s remaining inventory has not dropped to zero since the item was added.
- IF the inventory of any cart item is now zero, THEN THE system SHALL display a warning banner: "One or more items in your cart are no longer available. These items may be removed before checkout."
- IF inventory drops below the cart quantity (e.g., someone else purchases last units), THEN THE system SHALL automatically adjust cart quantity to available stock and notify user: "Quantity of [SKU name] has been reduced from [old quantity] to [new quantity] due to low stock."
- WHILE inventory is below 5 units, THE system SHALL display: "Only [X] left in stock!" next to the affected item.
- THE system SHALL NOT allow checkout if any cart item has reached zero inventory.

#### Session Persistence

- FOR authenticated customers, THE system SHALL persist cart content in server-side storage linked to user account.
- WHERE authentication status is active, THE system SHALL restore cart content automatically when user logs in from any device (web, mobile, tablet).
- FOR guest users (non-logged-in), THE system SHALL persist cart in browser localStorage for up to 7 days of inactivity.
- WHERE a guest cart exists in localStorage and the user has not returned for 7 consecutive days, THEN THE system SHALL automatically purge the cart content.
- WHERE an authenticated user’s cart has been inactive for 30 consecutive days, THEN THE system SHALL mark cart as expired and trigger a background cleanup job.
- WHEN user logs out, THE system SHALL preserve cart content for future login (for authenticated users only).
- IF a user attempts to access a cart that has been purged due to inactivity, THEN THE system SHALL clear all cart data and display: "Your cart has expired due to inactivity. Begin shopping again."

#### Cart Cleanup

- THE cart cleanup process SHALL run daily as a background job.
- WHEN customer cart has been inactive for 30 days, THEN THE system SHALL mark it as "archived" and remove from active cart views.
- WHEN guest cart has been inactive for 7 days, THEN THE system SHALL delete all associated session data from localStorage and server cache.
- WHERE a cart has been abandoned for more than 60 days, THEN THE system SHALL permanently delete record from database.
- THE cleanup process SHALL not affect pending orders or order history—only active carts.
- WHERE server-side cart data is purged due to expiry, THEN THE system SHALL send an email notification to the user if they are logged in or registered: "Your cart was automatically cleared due to inactivity. We saved your cart for 30 days as a courtesy."

### Integration Context

- This document is referenced by:
  - [User Actors Document](./01-user-actors.md): Defines permissions for cart access (guest vs customer)
  - [Product Catalog and Search](./08-product-catalog-and-search.md): Provides SKU and inventory data
  - [Account and Address Management](./03-account-and-address-management.md): Supplies shipping address for tax calculation
  - [Order Placement and Payment](./06-order-placement-and-payment.md): Defines cart state transition to order
  - [Exception Handling and Error Recovery](./12-exception-handling-and-error-recovery.md): Defines behavior during inventory conflicts and session timeouts

- The cart state is the final precursor to order creation. No checkout may occur unless cart validation passes.

### Business Impact

- The shopping cart directly influences conversion rate and average order value.
- Real-time inventory validation prevents overselling and customer dissatisfaction.
- Persistent cart for registered users improves retention and reduces abandonment.
- Clear pricing transparency (locked prices, accurate tax) builds trust and reduces returns.
- Automatic cleanup of expired carts reduces server load and data clutter.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*