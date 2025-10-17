The ecommerce platform must enable customers to maintain a persistent shopping cart and a separate wishlist as intermediate states before purchase. These features must operate independently but with clear interaction pathways between them.

### Shopping Cart Functionality

- THE shopping cart SHALL allow customers to add products to it from the product catalog.
- THE shopping cart SHALL allow customers to modify the quantity of items already in it.
- THE shopping cart SHALL allow customers to remove items entirely.
- WHEN a customer adds a product to the cart, THE system SHALL verify that the product is available for purchase (not discontinued or deactivated).
- WHEN a customer attempts to add a product to the cart with zero available inventory, THE system SHALL block the addition and display a message indicating the product is out of stock.
- WHILE a cart contains items, THE system SHALL retain those items for 30 days after the last interaction.
- WHEN a customer logs out or closes the browser, THE system SHALL preserve the cart contents.
- WHEN a customer logs back in with the same account, THE system SHALL restore the previous cart contents.
- WHEN a product in the cart is no longer available (e.g., inventory updated to zero or product discontinued by seller), THE system SHALL retain the item in the cart but mark it as unavailable and prevent checkout.
- WHEN an item in the cart becomes unavailable, THE system SHALL display a warning notification to the customer at the top of the cart page.
- THE system SHALL prohibit adding the same product variant (SKU) to the cart more than once; instead, THE system SHALL increment the quantity of the existing item.
- WHERE a customer has items in their cart, THE system SHALL display a persistent cart icon in the header with the total number of items and an aggregated subtotal.

### Wishlist Functionality

- THE wishlist SHALL allow customers to save products they are interested in for future consideration.
- THE wishlist SHALL be accessible only to authenticated customers.
- WHEN a customer adds a product to their wishlist, THE system SHALL store the product ID and SKU ID, not the product's current price or description.
- THE system SHALL allow a customer to add the same product variant (SKU) multiple times to their wishlist if desired.
- WHEN a customer opens their wishlist, THE system SHALL display the current price and availability status of each item.
- WHEN a product in the wishlist is no longer available, THE system SHALL mark it as "Out of Stock" but retain the item in the list.
- THE system SHALL allow customers to remove individual items from their wishlist.
- THE system SHALL allow customers to clear their entire wishlist with one action.
- WHERE a customer has items in their wishlist, THE system SHALL display a badge on the wishlist icon showing the total number of saved items.

### Cart Persistence Across Devices

- WHEN a customer adds items to their cart on one device (e.g., mobile phone), THE system SHALL synchronize those items to their account.
- WHEN the same customer accesses the platform from another device (e.g., desktop computer) and logs in, THE system SHALL automatically load the cart contents from the server.
- THE system SHALL maintain a single source of truth for cart contents, synchronized across all devices for a logged-in user.
- WHILE a customer is not logged in, THE system SHALL store cart contents locally in browser storage (localStorage or sessionStorage).
- WHEN a customer who has a locally stored cart logs in, THE system SHALL merge the local cart with the server-stored cart.
- WHERE there are conflicting items (same SKU with different quantities) during merge, THE system SHALL keep the higher quantity.
- WHEN a customer logs out, THE system SHALL preserve the cart on the device for 24 hours before clearing it.

### Item Quantity and Removal Rules

- THE system SHALL allow a customer to increase the quantity of any cart item up to the available inventory for that SKU.
- WHERE the available inventory for an item is less than the current quantity in the cart, THE system SHALL automatically reduce the cart quantity to the available inventory.
- WHEN a customer removes an item from the cart, THE system SHALL immediately remove it and recalculate the subtotal.
- WHEN a cart item's quantity is reduced to zero, THE system SHALL remove it from the cart automatically.
- THE system SHALL prevent a customer from adding negative quantities to the cart.
- THE system SHALL validate that all cart quantities are whole numbers (no decimals).
- IF a seller updates the inventory for a product in the cart, and the new inventory is less than the cart quantity, THEN THE system SHALL reduce the cart quantity to match the new inventory.

### Sync Between Wishlist and Cart

- WHEN a customer selects an item from their wishlist and clicks "Add to Cart", THE system SHALL transfer the exact product variant (SKU) to the cart.
- WHEN an item is moved from wishlist to cart, THE system SHALL NOT remove it from the wishlist unless the customer explicitly chooses to delete it.
- WHERE an item exists in both the wishlist and the cart, THE system SHALL allow independent modification of quantity in each.
- WHEN a customer adds an item from wishlist to cart and the item is out of stock, THE system SHALL prevent addition to cart and display a message: "This item is currently out of stock. We will notify you when it's available."
- THE system SHALL display a visual indicator on wishlist items showing whether the item is already in the customer's cart (e.g., a "In Cart" badge).

### Error Handling and Edge Cases

- IF a cart is accessed by a user who is not logged in and attempts to check out, THEN THE system SHALL prompt the user to log in or register before proceeding.
- IF a product in the cart is deleted by its seller, THEN THE system SHALL retain the item in the cart with status "Removed by Seller" and disable checkout for that item.
- IF a customer attempts to add a product to cart that has been disabled by admin, THEN THE system SHALL block the action and show: "This product is no longer available."
- WHERE a customer’s cart contains items with expired or invalid pricing (e.g., price changed after adding), THE system SHALL retain the original price added to cart but highlight the new price with a *note: "Price updated from $X to $Y".
- WHILE a cart is being synchronized between devices, THE system SHALL display a loading indicator and prevent modifications until synchronization completes.
- IF a cart conflicts occur during synchronization due to concurrent edits from two devices, THEN THE system SHALL prioritize the most recent change and notify the user with: "Your cart was updated based on the latest changes from another device."

### Performance and Experience Requirements

- WHEN a customer views their cart, THE system SHALL render all cart items within 1.5 seconds after login or page load.
- WHEN a customer adds or removes an item from their cart, THE system SHALL update the cart count and subtotal immediately without full page refresh.
- WHEN a customer opens the wishlist, THE system SHALL load all saved items and their current pricing within 1.5 seconds.
- THE system SHALL update cart and wishlist badges in real-time during interactions.
- THE system SHALL treat cart and wishlist operations as high-priority requests to ensure responsiveness.
- WHERE a customer navigates away from the cart or wishlist page, THE system SHALL not lose unsynced changes until synchronization completes.

### Definitions

- **Product Variant (SKU)**: A specific combination of attributes (e.g., Size: Large, Color: Red) of a product. Each SKU is treated as a distinct entity for inventory and cart purposes.
- **Persistent Cart**: The mechanism by which cart items are stored and recovered, either locally (non-logged-in) or server-side (logged-in).
- **Synchronization**: The process of aligning cart and wishlist data across devices after login.
- **Available Inventory**: The number of units of a specific SKU that the seller has confirmed as in stock and ready for sale.


Mermaid diagram: The Cart and Wishlist Interaction Workflow

```mermaid
graph LR
    A[Customer Visits Product Page] --> B{Add to Cart?}
    B -->|Yes| C[Add SKU to Shopping Cart]
    B -->|No| D{Add to Wishlist?}
    D -->|Yes| E[Add SKU to Wishlist]
    D -->|No| F[Leave Product Page]
    C --> G[Update Cart Badge Display]
    E --> H[Update Wishlist Badge Display]
    I[Customer Views Cart] --> J[Display all cart items with current pricing/inventory]
    K[Customer Views Wishlist] --> L[Display all saved items with current pricing/inventory]
    M[Customer Clicks "Add to Cart" from Wishlist] --> N[Copy SKU to Shopping Cart]
    N --> G
    O[Customer Modifies Cart Quantity] --> P[Validate against available inventory]
    P --> Q{Quantity <= Available?}
    Q -->|Yes| R[Update cart quantity]
    Q -->|No| S[Auto-reduce quantity to available stock]
    T[Product Inventory Drops Below Cart Quantity] --> U[Mark product as "Unavailable" in cart]
    U --> V[Show warning banner]
    W[Customer Logs Out] --> X[Save cart to localStorage]
    Y[Customer Logs Back In] --> Z[Sync localStorage cart with server cart]
    Z --> AA[Auto-merge quantities, keep higher value]
    AB[Admin Disables Product] --> AC[Mark product in all carts as "Removed by Seller"]
    AD[Seller Removes Product] --> AE[Mark product in all carts as "Removed by Seller"]
    AF[Product Becomes Out of Stock] --> AG[Show "Out of Stock" in cart and wishlist]
    AH[Product Price Changes] --> AI[Retain original cart price, show new price with note]
    AJ[Concurrent Device Edit] --> AK[Resolve conflict: latest change wins]
    AK --> AL[Notify user: "Cart updated from another device"]
```
