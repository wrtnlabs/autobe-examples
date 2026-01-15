# Shopping Cart and Wishlist Requirements

## Cart Creation and Management

THE shopping cart SHALL be created automatically when a customer adds their first product item.

WHEN a customer visits the shopping cart page without an existing cart, THE system SHALL create a new empty cart.

WHILE a customer has items in their cart, THE system SHALL maintain cart state for the duration of their session.

WHEN a customer logs out, THE system SHALL persist the cart if the customer is authenticated, otherwise treat it as a guest cart.

WHEN a customer logs in, THE system SHALL restore their authenticated cart if it exists, replacing any guest cart.

## Item Addition and Removal

WHEN a customer selects a product variant to add to cart, THE system SHALL verify the variant's availability (inventory > 0) and current price before allowing addition.

IF a product variant is out of stock, THEN THE system SHALL display "Out of stock" message and prevent addition to cart.

IF a product variant's price has changed since it was added to cart, THEN THE system SHALL display "Price updated from $[old_price] to $[new_price]" notification and maintain original cart price unless customer confirms the updated price.

WHEN a customer adds an item that already exists in cart, THE system SHALL increase the quantity instead of creating a duplicate.

WHEN a customer removes an item from cart, THE system SHALL reduce the quantity by one.

WHEN a customer removes all instances of an item from cart, THE system SHALL completely remove the item from cart.

WHILE a cart contains items, THE system SHALL update the cart summary in real-time showing total items and total amount.

## Cart Persistence Behavior

WHEN an authenticated customer adds items to cart, THE system SHALL persist cart data to database with customer identifier.

WHEN an unauthenticated guest adds items to cart, THE system SHALL persist cart data in browser localStorage with temporary session identifier.

WHILE a guest user has an active cart in localStorage, THE system SHALL maintain cart state across page refreshes.

WHEN a guest user logs in, THE system SHALL merge their guest cart with their authenticated cart, preferring authenticated cart items in case of conflicts.

WHEN a cart exceeds 30-day inactivity period, THE system SHALL delete the cart for both authenticated and guest users.

WHEN a user clears their browser storage, THE system SHALL remove the guest cart and clear all cart-related data.

## Quantity Adjustment Rules

WHEN a customer changes the quantity of an item in cart, THE system SHALL validate that the new quantity does not exceed available inventory for that variant.

IF a customer requests a quantity greater than available inventory, THEN THE system SHALL cap the quantity at maximum available stock and display notification: "Quantity reduced from [original_quantity] to [available_quantity] due to limited inventory."

WHILE a cart contains items, THE system SHALL auto-calculate the total amount based on current variant prices and quantities.

THE cart SHALL allow quantity adjustments from 1 to 999 for any individual item.

WHEN a cart quantity is adjusted to 0, THE system SHALL remove the item completely rather than keeping zero-quantity entries.

## Wishlist Functionality

THE system SHALL provide a separate wishlist that is independent from the shopping cart.

WHEN a customer adds a product variant to wishlist, THE system SHALL store it with timestamp and display "Added to wishlist" confirmation.

WHEN a customer removes a product variant from wishlist, THE system SHALL remove it completely and display "Removed from wishlist" confirmation.

WHILE a product variant is in wishlist, THE system SHALL track its availability status.

WHEN a product variant in wishlist goes out of stock, THE system SHALL display "Out of stock" indicator next to the item.

WHEN a product variant in wishlist receives a price reduction, THE system SHALL display "Price dropped from $[old_price] to $[new_price]" notification next to the item.

WHEN a customer clicks "Move to cart" from wishlist, THE system SHALL add the item to cart with current price and availability check.

WHEN a customer tries to add an already-wished item, THE system SHALL display "Already in wishlist" message and do nothing.

WHEN a customer adds a product variant to cart that exists in wishlist, THE system SHALL remove it from wishlist automatically.

## Cart to Order Conversion

WHEN a customer initiates checkout from cart, THE system SHALL verify that all cart items are still available (inventory > 0) and priced correctly.

WHEN a cart item is no longer available, THE system SHALL remove it from cart with "Item unavailable: [Product Name] is no longer in stock" notification and update the cart total.

WHEN a cart item has been priced changed, THE system SHALL display "Price updated from $[old_price] to $[new_price]" message and require customer confirmation to proceed with new price.

WHEN a customer proceeds to checkout, THE system SHALL validate cart has at least one item.

IF cart is empty, THEN THE system SHALL prevent checkout and display "Your cart is empty. Add items before proceeding to checkout." message.

WHEN a cart item's inventory drops to zero during checkout process, THE system SHALL remove it from cart and update total before final confirmation with notification: "[Product Name] is no longer available and has been removed from your order."

WHEN a customer completes order placement, THE system SHALL transfer cart contents to order record and clear the cart.

WHEN an order placement fails, THE system SHALL restore all cart items to their previous state and preserve cart contents.

## Guest Cart Handling

WHEN an unauthenticated guest adds items to cart, THE system SHALL create a temporary cart identifier stored in localStorage.

WHEN a guest customer logs in, THE system SHALL merge their guest cart into their new authenticated cart, preserving all items.

WHEN a guest cart has items and customer creates an account, THE system SHALL auto-associate the guest cart with the new account.

WHEN a guest customer's cart expires after 30 days of inactivity, THE system SHALL clear the cart and delete its identifier.

WHEN a guest customer returns to site without logging in but has existing cart in localStorage, THE system SHALL restore the cart state.

WHEN a guest customer clears their browser data, THE system SHALL delete the guest cart and its identifier.

WHEN a guest cart conflicts with an authenticated cart during login, THE system SHALL preserve authenticated cart items and merge guest cart items that are not present.

WHEN a guest cart is empty, THE system SHALL avoid creating a cart identifier.

## Cart and Wishlist Relationship Management

WHEN a product is removed from the catalog or marked as inactive, THE system SHALL automatically remove it from all active carts and wishlists with notification: "[Product Name] is no longer available and has been removed from your cart/wishlist."

WHEN a seller changes pricing on a product variant, THE system SHALL:
- Update pricing for future additions from cart/wishlist
- Maintain original cart prices for existing items unless customer confirms update
- Notify customer of price changes on cart items with "Price change notification" badge

WHEN an item is added from wishlist to cart, THE system SHALL:
- Import current price and availability status
- Remove item from wishlist automatically
- Add notification: "Moved [Product Name] from wishlist to cart"

WHEN a customer creates a new account, THE system SHALL auto-merge any existing guest cart and wishlist with their new account.

WHEN a customer changes their shipping address, THE system SHALL:
- Update saved addresses for cart and wishlist items
- Preserve product selections and quantities
- Notify customer: "Shipping address updated for your cart and wishlist items"

WHEN an order is placed, THE system SHALL:
- Transfer cart contents to order record
- Clear cart
- Move wishlist items to cart based on customer preference
- Preserve wishlist for future use

WHEN a customer fully removes their account, THE system SHALL:
- Delete all cart items
- Delete all wishlist items
- Archive order history for compliance
- Anonymize user data from cart and wishlist records
- Log deletion with timestamp and user ID

## Cart Technical Specifications (Business Context Only)

WHEN a customer adds an item to cart, THE system SHALL:
- Store product ID
- Store variant ID (SKU)
- Store product title
- Store variant attributes
- Store price at time of addition
- Store quantity
- Store timestamp
- Store customer ID (if authenticated)
- Store anonymous cart ID (if guest)

WHEN a customer views cart, THE system SHALL:
- Calculate total items
- Calculate total amount based on current prices
- Display each item with: image, title, variant, quantity, unit price, line total
- Display cart summary with subtotal, tax, shipping, and grand total
- Show checkout button
- Show clear cart button
- Show continue shopping button

WHEN cart is displayed, THE system SHALL:
- Load cart data from database (authenticated) or localStorage (guest)
- Validate cart items are active and eligible for purchase
- Display suggested items related to cart contents
- Show in-stock indicators for each variant

## Cart Performance Requirements

THE system SHALL load cart data in under 500 milliseconds.

WHEN a customer adds an item to cart, THE system SHALL update cart summary in under 200 milliseconds.

WHEN a customer changes quantity in cart, THE system SHALL recalculate total in under 150 milliseconds.

WHEN a cart is loaded on mobile device, THE system SHALL optimize display for touch interactions.

WHEN a user switches from guest to authenticated mode, THE system SHALL merge carts without data loss.

WHEN a customer returns after 30 days, THE system SHALL clear cart with notification: "Your cart has expired due to inactivity. Items have been cleared."

## Business Purpose and Customer Value

The shopping cart and wishlist system enables customers to:

1. Discover products and evaluate purchases without commitment
2. Save items for future consideration without loss of selections
3. Compare prices across multiple items before checkout
4. Build comprehensive shopping lists spanning multiple sessions
5. Maintain continuity of shopping preferences across devices
6. Receive timely price alerts on items they are considering
7. Make informed purchasing decisions based on availability

This system directly enhances customer satisfaction by reducing friction in the purchasing journey and building trust through consistent experience.

## Related Documents

- Refer to [Product Variants](./04-product-variants.md) for detailed SKU, attribute, and inventory tracking requirements
- Refer to [User Actors](./01-user-actors.md) for authentication and session management
- Refer to [Order Placement](./06-order-placement.md) for cart to order conversion validation rules
- Refer to [Product Catalog](./03-product-catalog.md) for product discovery and selection workflows
- Refer to [Order Tracking](./08-order-tracking.md) for cart fulfillment pathways

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*