## Cart Initiation

WHEN a user visits the shopping mall platform, THE system SHALL initialize an anonymous cart session for unauthenticated users and a persisted cart for authenticated users.

WHEN a user navigates to the product catalog or product detail page, THE system SHALL display a persistent cart icon with a count of items currently in the cart.

WHEN a user first accesses the cart page, THE system SHALL load all items from the active cart session.

## Add Item to Cart

WHEN a user selects "Add to Cart" on a product detail page, THE system SHALL add the selected product variant (SKU) to the cart with the specified quantity (default: 1).

WHEN a user attempts to add a product variant that is out of stock, THE system SHALL display a visible error message: "This item is currently out of stock. Please select another option."

WHEN a user selects a quantity greater than the available stock for a variant, THE system SHALL automatically cap the quantity at the maximum available stock and display a notification: "Quantity adjusted to available stock: X units."

WHEN a user adds a product variant to the cart that is already present, THE system SHALL increment the existing quantity rather than creating a duplicate entry.

WHEN a user adds a product variant to the cart, THE system SHALL validate that the product is active, not discontinued, and not prohibited for sale.

WHEN a user adds an item from a seller who has been suspended, THE system SHALL block the addition and display: "This seller's products are currently unavailable."

## Modify Cart Items

WHEN a user changes the quantity of an item in the cart, THE system SHALL update the total cart value and item subtotal in real-time (within 500ms).

WHEN a user modifies the quantity of an item to 0, THE system SHALL immediately remove that item from the cart.

WHEN a user modifies the quantity of an item for a variant that has changed its available stock since it was added, THE system SHALL cap the quantity at the updated maximum available stock and show a notification: "Stock levels updated. Quantity adjusted to X units."

WHILE a user is modifying cart items, THE system SHALL preserve all selected options, including size, color, and other variant attributes.

## Remove from Cart

WHEN a user clicks the "Remove" button next to any item in the cart, THE system SHALL immediately delete that variant entry from the cart.

WHEN an item is removed from the cart, THE system SHALL recalculate the total cart value, tax, and shipping estimates immediately.

WHEN a user removes an item from the cart, THE system SHALL preserve the cart state for future sessions if the user is authenticated.

## Wishlist Creation

WHEN a user clicks "Add to Wishlist" on a product detail page, THE system SHALL add the selected product variant to the user’s wishlist.

WHEN a user adds an item to the wishlist that is already in their wishlist, THE system SHALL do nothing and display: "This item is already in your wishlist."

WHEN a user creates a wishlist for the first time, THE system SHALL automatically create a default wishlist titled "My Wishlist".

WHEN a user adds an item to the wishlist that is out of stock, THE system SHALL still add it and display: "Added to wishlist (currently out of stock). We'll notify you when it's back in stock."

## Move Between Cart and Wishlist

WHEN a user selects "Move to Cart" from an item in the wishlist, THE system SHALL remove the item from the wishlist and add it to the cart with the same quantity.

WHEN a user selects "Move to Wishlist" from an item in the cart, THE system SHALL remove the item from the cart and add it to the wishlist.

WHEN a user moves an item from wishlist to cart, THE system SHALL recalculate availability: if the item is no longer in stock, THE system SHALL display: "This item is no longer available. You can still keep it in your wishlist to be notified when it's back." and SHALL NOT add the item to the cart.

WHEN a user moves an item with variant options from cart to wishlist, THE system SHALL preserve the exact variant attributes (color, size, etc.) in the wishlist.

## Cart Persistence

WHEN a guest user adds items to their cart, THE system SHALL store the cart data in browser localStorage with a UUID session identifier.

WHEN an authenticated user logs in and has a guest cart, THE system SHALL merge the guest cart items with their account cart, preserving quantities and variant selections.

WHEN an authenticated user makes changes to their cart, THE system SHALL persist all changes to their user profile in the database.

WHEN a user returns to the site after 24 hours, THE system SHALL refresh their cart from the latest server state, overwriting any browser-stored data.

## Session Expiry Behavior

WHEN a guest cart has been inactive for 60 days, THE system SHALL automatically purge all cart items and respond with: "Your guest cart has been cleared due to inactivity. Please add items again."

WHEN an authenticated user has not accessed their account for 12 months, THE system SHALL archive their cart data but SHALL NOT delete it, allowing restoration on re-login.

WHILE a user is actively browsing or modifying their cart, THE system SHALL extend the session expiry timeout to another 60 days for guest users and 12 months for authenticated users.

## Guest Cart Conversion

WHEN a guest user attempts to proceed to checkout, THE system SHALL prompt: "Create an account to save your cart and checkout faster." with options to "Continue as guest" or "Sign Up / Login."

WHEN a guest user chooses to "Sign Up / Login", THE system SHALL create a new user account and immediately migrate the guest cart to the new account.

WHEN a guest user logs into an existing account, THE system SHALL merge their guest cart with their existing account cart.

IF guest cart items and account cart items have identical product variants, THEN THE system SHALL combine the quantities and remove duplicates.

IF guest cart items and account cart items have conflicting quantities for the same variant, THEN THE system SHALL retain the higher quantity.

IF guest cart items conflict with account cart items where one is out of stock and the other is available, THEN THE system SHALL retain the variant with available stock and remove the out-of-stock version.

WHEN a guest cart is successfully converted to an authenticated cart, THE system SHALL send a confirmation message: "Your cart has been saved to your account. You can now access it from any device."

WHEN a user logs out, THE system SHALL preserve their cart data in local storage (for guests) or server (for authenticated users), and MUST NOT clear cart items.

WHERE a user creates a cart during a promotional period, THE system SHALL apply the promotional prices to cart items until the promotion expires or the cart is checked out.

WHILE a guest user navigates between pages, THE system SHALL maintain cart state without requiring re-login, even if browser is closed and reopened within 60 days.

IF a user attempts to add a product variant that has been removed from inventory by the seller, THEN THE system SHALL remove the item from the cart automatically, notify the user: "This item is no longer available and has been removed from your cart.", and adjust totals accordingly.

IF a user attempts to move an item from wishlist to cart that has been deleted by the seller, THEN THE system SHALL display: "This product is no longer available. It has been removed from your wishlist." and remove it from the wishlist.

WHEN a cart contains items from two different sellers with different shipping policies, THE system SHALL display separate shipping cost estimates for each seller's items.

WHEN a cart contains items with different tax rates (e.g., digital vs physical products), THE system SHALL calculate and apply the correct tax rate to each item individually.

WHEN a user adds an item with custom options (e.g., engraving, personalized message), THE system SHALL store these customizations as metadata attached to the cart item.

WHERE a cart item has a custom option, THE system SHALL display the customization details on the cart and checkout pages.

WHEN a cart item is updated with a new price due to a seller’s adjustment, THE system SHALL notify the user: "The price for [Product Name] has changed from $X to $Y. Continue with the new price?" with options to "Keep" or "Remove".

WHEN a cart item price changes and the user chooses "Keep", THE system SHALL update the cart with the new price and apply the change to the order total.

WHEN a cart item price changes and the user chooses "Remove", THE system SHALL delete the item from the cart.

WHEN a user checks out with items priced below the minimum threshold for free shipping, THE system SHALL display the remaining amount needed for free shipping: "Add $X more to qualify for free delivery."

WHEN a user has items from sellers located in different countries, THE system SHALL apply country-specific tax regulations and display country-specific shipping costs.