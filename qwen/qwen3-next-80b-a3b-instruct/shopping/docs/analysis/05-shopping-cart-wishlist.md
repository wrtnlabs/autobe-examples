## Shopping Cart and Wishlist Functionality

### Cart: Adding Products

WHEN a customer selects a product from the catalog, THE system SHALL allow the customer to add one or more units of that product to their cart.

WHEN a customer clicks the "Add to Cart" button, THE system SHALL validate that the product is available (inventory > 0) before adding to cart.

WHEN a customer attempts to add a product that is out of stock, THE system SHALL display an error message "This product is currently out of stock" and prevent addition to the cart.

WHEN a customer adds a product variant (SKU) to cart, THE system SHALL store the specific SKU ID along with the selected attributes (color, size, etc.) to preserve exact item configuration.

THE system SHALL permit customers to add the same product variant multiple times to the cart, increasing the quantity count rather than creating duplicate entries.

WHEN a customer adds a new SKU to cart that is already in the cart, THE system SHALL combine the quantities and update the total item count.

### Cart: Managing Items

WHILE a customer has items in their cart, THE system SHALL display a clear, persistent view showing all items, quantities, prices, and subtotal.

WHEN a customer removes a specific item from the cart, THE system SHALL delete that exact SKU entry and recalculate the cart total.

WHEN a customer deletes all items from the cart, THE system SHALL clear the cart entirely and display "Your cart is empty" state.

WHEN a customer modifies the quantity of an item in the cart, THE system SHALL validate that the new quantity does not exceed available inventory and update the cart.

IF the quantity of an item in cart exceeds available inventory, THEN THE system SHALL automatically reduce the quantity to match available stock and display a warning: "Quantity adjusted to available stock (X units remaining)."

WHEN a customer navigates away from the cart page, THE system SHALL preserve all cart items in the current session.

### Cart: Quantity and Pricing

WHEN a product is added to cart, THE system SHALL lock in the product price at the exact moment of addition.

THE system SHALL NOT update cart item prices if the seller later changes the product price.

WHEN an item's price is changed after being added to cart, THE system SHALL display the original price (locked at cart addition) with a strikethrough and show "Original price: $X".

WHEN a cart item's price is discounted after being added to cart, THE system SHALL maintain the locked-in price without applying the new discount.

WHEN a cart item's price is increased after being added to cart, THE system SHALL retain the original price and display "Price locked at $X".

THE system SHALL calculate cart subtotal as the sum of (price × quantity) for each SKU in cart.

THE system SHALL apply tax calculations based on shipping address at checkout, not at cart addition.

### Cart: Saving for Later

WHEN a customer selects "Save for Later" on an item in the cart, THE system SHALL move that item from cart to wishlist while preserving all attributes (SKU, quantity, selected options).

WHEN an item is moved to wishlist, THE system SHALL remove it from the cart and reduce cart total accordingly.

WHEN an item is moved from cart to wishlist, THE system SHALL retain the original price that was locked when added to cart.

### Wishlist: Creating and Sharing

WHEN a customer views a product detail page, THE system SHALL allow the customer to add that product to their wishlist.

WHEN a customer adds an item to wishlist, THE system SHALL store the product ID and selected SKU with associated attributes (color, size).

WHEN a customer adds an item to wishlist, THE system SHALL preserve the "original price" from when the item was last in cart (if applicable).

WHEN the customer has items in wishlist, THE system SHALL display a dedicated wishlist page showing all saved items.

WHERE a customer has items in wishlist, THE system SHALL generate a unique public URL that can be shared with others: https://shoppingMall.com/wishlist/[customer-id]/[unique-token]

WHEN a wishlist URL is shared, THE system SHALL enable public view-only access to the wishlist without requiring login.

WHEN a public wishlist link is accessed, THE system SHALL display all items in the wishlist with product names, prices, seller names, and images.

WHEN a public wishlist is accessed, THE system SHALL prevent editing, removing, or sharing features for non-authenticated users.

### Wishlist: Notifications

WHEN a product in a customer's wishlist has its price decreased, THE system SHALL send a notification to the customer via email and in-app alert.

WHEN a product in a customer's wishlist becomes available (inventory increases from 0 to >0), THE system SHALL send a notification to the customer via email and in-app alert.

WHEN a product in a customer's wishlist is discontinued or removed by the seller, THE system SHALL update the wishlist item to display "Discontinued" and disable "Add to Cart".

WHEN a product in a customer's wishlist has a new color or size variant added, THE system SHALL display "New variants available" next to the item.

THE system SHALL allow customers to disable or enable product-specific notifications for each wishlist item.

### Cart-to-Wishlist Transfer

WHEN an item is moved from cart to wishlist, THE system SHALL preserve all original attributes: SKU ID, quantity, selected options, and locked price.

WHEN an item is moved from wishlist to cart, THE system SHALL validate current inventory and apply maximum available quantity as default.

WHEN an item is moved from wishlist to cart, THE system SHALL use the original locked price if previously stored, otherwise use current product price.

WHEN an item is moved from wishlist to cart, THE system SHALL display a confirmation: "X units of [product] have been added to your cart."

IF the item is no longer available (seller removed or product discontinued), THEN THE system SHALL prevent moving to cart and display "This item is no longer available for purchase."

### Guest Cart Persistence

WHEN a guest (non-logged-in user) adds items to cart, THE system SHALL store the cart in browser localStorage.

WHEN a guest (non-logged-in user) closes the browser and returns later, THE system SHALL restore the cart if less than 30 days have passed.

WHEN 30 days have passed since a guest cart was last updated, THE system SHALL permanently delete the guest cart data.

WHEN a guest logs in to an existing account, THE system SHALL merge their guest cart items with their existing cart, preserving quantities and prices.

WHEN a guest logs in and both guest and registered carts contain the same SKU, THE system SHALL combine the quantities with preference given to the item with higher quantity.

WHEN a guest cart is merged with a registered cart, THE system SHALL clear the guest session and set the combined cart as the active cart.

WHEN a guest attempts to checkout, THE system SHALL require account login before proceeding with order submission.

### Usage Limits

THE system SHALL limit cart items to a maximum of 30 unique SKUs per customer.

THE system SHALL limit wishlist items to a maximum of 100 unique SKUs per customer.

IF cart exceeds 30 SKUs, THEN THE system SHALL prevent adding new items and display "Cart is full (maximum 30 items). Remove an item to add more."

IF wishlist exceeds 100 SKUs, THEN THE system SHALL prevent adding new items and display "Wishlist is full (maximum 100 items). Remove an item to add more."

### Data Consistency

THE system SHALL ensure cart and wishlist data remains consistent across all devices and browsers for known users.

WHEN a customer adds an item to cart on one device, THE system SHALL reflect the change instantly on all other devices where the customer is logged in.

WHEN a customer removes an item from wishlist on a mobile browser, THE system SHALL sync the change to the web application in real-time.

WHEN a seller updates inventory, THE system SHALL update cart and wishlist items in real-time (without refreshing) if an item becomes out of stock.

### Error Handling

IF the cart data fails to load from storage, THEN THE system SHALL initialize an empty cart and display a warning: "Your cart could not be loaded. A new cart has been created."

IF wishlist data fails to load from storage, THEN THE system SHALL initialize an empty wishlist and display a warning: "Your wishlist could not be loaded. A new wishlist has been created."

IF a user attempts to access a wishlist URL with invalid token, THEN THE system SHALL display "This wishlist does not exist or is no longer available."

IF a user is logged out during cart modification, THEN THE system SHALL attempt to save cart locally and restore when login is resumed.

### Integration Dependencies

This document must be consistent with the product catalog structure defined in [Product Catalog Document](./04-product-catalog.md), as all cart and wishlist items reference product SKUs.

This document must be consistent with the checkout flow defined in [Checkout Process Document](./06-checkout-process.md), as cart contents are submitted to the checkout process.

This document must be consistent with the user authentication flow defined in [Authentication Flow Document](./03-authentication-flow.md), as cart persistence relies on session and token management.

This document must be consistent with the user actor permissions defined in [User Actors Document](./02-user-actors.md), as cart and wishlist functionality is only available to authenticated customers.

### Business Context

The shopping cart is the critical gateway between product discovery and purchase. The system must make cart manipulation intuitive and reliable, with strong data persistence. The wishlist serves as a discovery and price-tracking tool, enhancing customer retention and conversion through automated notifications. Both features must work seamlessly across devices and sessions to prevent cart abandonment and improve customer experience.

### User Flow Summary

1. Customer browses products
2. Customer adds items to cart or wishlist
3. Customer modifies cart contents (add, remove, update quantity)
4. Customer moves items between cart and wishlist
5. Customer logs in (if guest) to save cart indefinitely
6. Customer receives automated notifications for wishlist items
7. Customer proceeds to checkout from cart
8. System enforces cart/wishlist limits and price locking
9. System persists cart data across sessions for up to 30 days for guests

### Non-functional Requirements

THE system SHALL display cart updates with no visible delay after any edit.

THE system SHALL sync cart and wishlist data between devices within 2 seconds.

THE system SHALL load cart data from storage within 1 second on modern devices.

THE system SHALL prevent cart or wishlist corruption under network loss or sudden browser closure.

THE system SHALL remain functional if wishlist sharing server is temporarily unavailable.

### Cart and Wishlist Schema (Backend Developer Note)

This document describes business behavior, not technical implementation.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*