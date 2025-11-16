# Shopping Cart and Wishlist Requirements

## 1. Introduction and Overview

### 1.1 Purpose

This document defines the complete business requirements for the shopping cart and wishlist functionality in the e-commerce shopping mall platform. The shopping cart serves as the primary mechanism for buyers to collect products before purchase, while the wishlist allows buyers to save products for future consideration.

These features are critical to the buyer experience, enabling buyers to:
- Accumulate multiple products before checkout
- Save desired products for later purchase
- Compare and manage product selections
- Maintain shopping context across sessions and devices

### 1.2 Role in the Buyer Journey

The shopping cart and wishlist function as central hubs in the buyer journey:

**Shopping Cart** acts as the active purchasing workspace where buyers finalize product selections, review quantities, verify pricing, and proceed to checkout. It represents immediate purchase intent.

**Wishlist** serves as a passive collection space where buyers bookmark products of interest for future consideration, comparison, or purchase when timing or budget permits. It represents deferred purchase intent.

Both features must maintain data consistency with the product catalog, reflect real-time inventory status, and provide seamless experiences across multiple sessions and devices.

### 1.3 Relationship to Other System Components

**Product Catalog Integration**: Cart and wishlist items reference specific product SKUs with selected variants (color, size, options). Changes to product availability, pricing, or variant status must be reflected in cart and wishlist.

**Inventory System Integration**: Real-time inventory levels determine whether cart items can proceed to checkout and whether wishlist items can be added to cart.

**Order Management Integration**: The cart serves as the source of truth for order placement, transferring all cart items and quantities to the order system during checkout.

**User Authentication Integration**: Cart and wishlist persistence differs based on authentication status, with authenticated users receiving permanent storage and synchronization across devices.

## 2. Shopping Cart Requirements

### 2.1 Core Cart Functionality

THE system SHALL provide each buyer with a personal shopping cart to collect products before purchase.

WHEN a buyer is authenticated, THE system SHALL persist the cart across all sessions and devices associated with that buyer account.

THE system SHALL support cart items with specific product variants including selected color, size, and other configurable options.

THE system SHALL display the total number of items in the cart prominently throughout the buyer's browsing experience.

THE system SHALL calculate and display the cart subtotal as the sum of all item prices multiplied by their quantities, updated instantly when cart contents change.

### 2.2 Cart Item Structure

Each cart item must include the following information:

**Product Identification:**
- Product SKU identifier
- Selected variant specifications (color, size, options)
- Product title and description snapshot
- Product image reference for the selected variant

**Pricing Information:**
- Unit price at the time of adding to cart
- Current unit price (to detect price changes)
- Line total (quantity × unit price)

**Quantity Details:**
- Requested quantity
- Minimum order quantity constraints
- Maximum order quantity limitations

**Seller Information:**
- Seller identifier
- Seller name
- Seller account status

**Timestamps:**
- Date and time added to cart
- Last modification timestamp

### 2.3 Cart Persistence Rules

WHEN a buyer with an authenticated account adds items to the cart, THE system SHALL store cart data permanently in the buyer's account until explicitly removed or checked out.

WHEN an authenticated buyer logs out and logs back in, THE system SHALL restore the complete cart with all items, quantities, and selections intact.

WHEN an authenticated buyer accesses the platform from a different device, THE system SHALL synchronize the cart to show identical contents across all devices.

WHEN a guest buyer adds items to the cart, THE system SHALL maintain cart contents for the current browser session using session storage mechanisms.

WHEN a guest buyer closes the browser without completing checkout, THE system SHALL retain the cart for 7 days using browser local storage to enable return purchases.

WHEN a guest buyer logs in with cart items present, THE system SHALL merge the guest cart with the authenticated user's existing cart, combining duplicate items by summing quantities.

### 2.4 Cart Capacity and Limitations

THE system SHALL allow a maximum of 100 distinct items (unique SKU and variant combinations) in a single cart.

WHEN a buyer attempts to add a 101st distinct item, THE system SHALL prevent the addition and display a message indicating the cart is full and items must be removed before adding more.

THE system SHALL enforce per-item quantity limits based on available inventory and seller-defined maximum order quantities.

THE system SHALL limit individual item quantities to a maximum of 999 units unless seller-specific limits are lower.

## 3. Cart Item Management

### 3.1 Adding Items to Cart

WHEN a buyer selects a product with all required variant options and clicks add to cart, THE system SHALL add the item to the buyer's shopping cart with quantity 1 by default.

WHEN a buyer specifies a quantity greater than 1 before adding to cart, THE system SHALL add the item with the specified quantity.

WHEN a buyer adds an item that already exists in the cart with identical variant selections, THE system SHALL increment the existing item's quantity by the newly requested amount rather than creating a duplicate entry.

WHEN a buyer adds an item to the cart, THE system SHALL validate inventory availability and prevent adding quantities that exceed available stock.

IF a buyer attempts to add a quantity exceeding available inventory, THEN THE system SHALL add only the available quantity and display a message indicating the maximum available quantity and the quantity actually added.

WHEN a buyer adds an item to the cart, THE system SHALL validate that the seller account is active and not suspended.

IF a buyer attempts to add a product from a suspended seller, THEN THE system SHALL prevent the addition and display a message indicating the product is currently unavailable.

WHEN a buyer successfully adds an item to the cart, THE system SHALL display a confirmation notification showing the product name, selected variant, quantity, and updated cart total count.

WHEN a buyer adds an item to the cart, THE system SHALL complete the operation within 1 second to provide instant feedback.

### 3.2 Updating Quantities

WHEN a buyer changes the quantity of a cart item, THE system SHALL update the quantity immediately and recalculate the cart subtotal.

WHEN a buyer increases a cart item quantity, THE system SHALL validate that the new total quantity does not exceed available inventory before applying the change.

IF a buyer attempts to set a quantity exceeding available inventory, THEN THE system SHALL set the quantity to the maximum available and display a message indicating the adjustment.

WHEN a buyer decreases a cart item quantity to zero, THE system SHALL remove the item from the cart entirely.

WHEN a buyer updates a quantity, THE system SHALL apply the change within 1 second to maintain a responsive experience.

THE system SHALL prevent quantity updates during active checkout to avoid race conditions between cart modifications and order placement.

### 3.3 Removing Items

WHEN a buyer clicks remove on a cart item, THE system SHALL delete the item immediately from the cart without confirmation.

WHEN a buyer removes an item, THE system SHALL recalculate the cart subtotal and update the cart item count instantly.

WHEN a buyer removes an item, THE system SHALL display a confirmation message with an undo option available for 10 seconds.

WHEN a buyer clicks undo within 10 seconds of removal, THE system SHALL restore the item to the cart with its original quantity and position.

WHEN a buyer clicks clear cart, THE system SHALL prompt for confirmation before removing all items.

WHEN a buyer confirms clear cart, THE system SHALL remove all items and display an empty cart state.

### 3.4 Selecting Product Variants

WHEN a cart item has multiple variant options available, THE system SHALL allow the buyer to change variant selections directly from the cart without returning to the product page.

WHEN a buyer changes a variant selection in the cart, THE system SHALL treat it as removing the old item and adding a new item with the new variant specifications.

WHEN a buyer changes a variant that affects price, THE system SHALL update the item price to reflect the new variant's pricing.

WHEN a buyer changes a variant that is out of stock, THE system SHALL prevent the change and display a message indicating the variant is currently unavailable.

### 3.5 Cart Item Validation Rules

THE system SHALL validate cart contents in real-time whenever the buyer views the cart.

WHEN a buyer views the cart, THE system SHALL check each item's current availability and flag items that are no longer in stock.

WHEN a buyer views the cart, THE system SHALL check each item's current price and flag items where the price has changed since adding to cart.

WHEN an item in the cart is out of stock, THE system SHALL display the item with a currently unavailable label and prevent checkout until the item is removed.

WHEN an item's price has increased, THE system SHALL display both the old and new prices with a notification indicating the price increase amount.

WHEN an item's price has decreased, THE system SHALL display both the old and new prices with a notification indicating the price reduction and savings amount.

WHEN a product has been deleted by the seller, THE system SHALL flag the cart item as unavailable and display a message indicating the product is no longer available.

WHEN a seller account becomes suspended, THE system SHALL flag all cart items from that seller and prevent checkout until those items are removed.

## 4. Cart Persistence and Synchronization

### 4.1 Authenticated User Cart Persistence

WHEN an authenticated buyer adds, updates, or removes cart items, THE system SHALL save changes to permanent storage within 2 seconds to prevent data loss.

WHEN an authenticated buyer's session expires, THE system SHALL preserve all cart data without any loss.

WHEN an authenticated buyer logs in from a new device, THE system SHALL load the complete cart state including all items, quantities, and timestamps.

THE system SHALL maintain cart data for authenticated users indefinitely until items are checked out, manually removed, or become unavailable.

### 4.2 Guest Cart Handling

WHEN a guest buyer adds items to the cart, THE system SHALL store cart data in browser session storage for immediate session persistence.

WHEN a guest buyer adds items to the cart, THE system SHALL also store cart data in browser local storage for persistence across browser sessions.

THE system SHALL retain guest cart data in local storage for 7 days from the last modification.

WHEN a guest cart item exceeds 7 days without modification, THE system SHALL automatically remove the item from the stored cart.

WHEN a guest buyer returns within 7 days, THE system SHALL restore the cart from local storage automatically.

WHEN browser storage is unavailable, THE system SHALL maintain guest cart only for the current session and display a notification indicating the cart will be saved for the session only.

### 4.3 Cart Migration on Login

WHEN a guest buyer with cart items logs into an existing account, THE system SHALL merge the guest cart with the account cart using specific merging rules.

IF an item exists in both guest cart and account cart with identical SKU and variants, THEN THE system SHALL combine quantities by adding guest quantity to account quantity.

IF the combined quantity exceeds available inventory, THEN THE system SHALL set quantity to maximum available and notify the buyer.

IF an item exists only in the guest cart, THEN THE system SHALL add it to the account cart with the guest cart quantity.

IF an item exists only in the account cart, THEN THE system SHALL retain it without changes.

WHEN cart migration completes, THE system SHALL clear the guest cart storage to prevent future duplicate merges.

WHEN cart migration completes, THE system SHALL display a summary notification showing the number of items merged and any quantity adjustments made.

### 4.4 Session Management

THE system SHALL maintain cart synchronization across multiple concurrent sessions for the same authenticated buyer.

WHEN a buyer modifies the cart in one browser tab, THE system SHALL reflect changes in all other open tabs within 3 seconds.

WHEN a buyer completes checkout in one session, THE system SHALL clear the cart in all concurrent sessions immediately.

THE system SHALL prevent race conditions when the same buyer modifies the cart simultaneously from multiple devices by using last-write-wins conflict resolution.

### 4.5 Cross-Device Synchronization

WHEN an authenticated buyer adds an item on a mobile device, THE system SHALL synchronize the cart to desktop within 5 seconds.

WHEN an authenticated buyer modifies cart quantities on one device, THE system SHALL update all other devices automatically.

THE system SHALL display a synchronization indicator when pulling cart updates from other devices.

WHEN network connectivity is lost, THE system SHALL queue cart modifications locally and synchronize when connectivity resumes.

IF synchronization conflicts occur, THEN THE system SHALL prioritize the most recent modification timestamp and apply changes accordingly.

## 5. Cart Validation Requirements

### 5.1 Real-Time Inventory Validation

WHEN a buyer views the cart, THE system SHALL validate current inventory levels for all cart items against live inventory data.

WHEN a buyer proceeds to checkout, THE system SHALL re-validate all item quantities against current inventory to prevent overselling.

IF inventory has decreased below cart quantity since the item was added, THEN THE system SHALL adjust the cart quantity to match available inventory and notify the buyer.

THE system SHALL perform inventory validation within 2 seconds to maintain responsive user experience.

WHEN inventory reaches zero for a cart item, THE system SHALL mark the item as out of stock and prevent checkout until the item is removed.

### 5.2 Price Change Detection

WHEN a buyer views the cart, THE system SHALL compare current product prices with the prices stored when items were added to cart.

WHEN a price increase is detected, THE system SHALL update the cart item price and display a clear notification showing the old and new prices.

WHEN a price decrease is detected, THE system SHALL update the cart item price and display a positive notification highlighting the savings.

THE system SHALL update all price-dependent calculations (line totals, subtotals) automatically when prices change.

WHEN multiple price changes occur, THE system SHALL display a consolidated summary at the top of the cart showing total price impact.

### 5.3 Product Availability Checks

WHEN a buyer views the cart, THE system SHALL verify that each product is still published and available for purchase.

WHEN a product has been unpublished by the seller, THE system SHALL mark the item as no longer available and prevent checkout.

WHEN a product has been deleted, THE system SHALL flag the item with a clear unavailability message and suggest removing it from the cart.

THE system SHALL allow buyers to continue browsing with unavailable items in cart but block checkout until unavailable items are removed.

### 5.4 Variant Availability Verification

WHEN a buyer views the cart, THE system SHALL verify that the specific variant (color, size, options) selected for each item is still available.

WHEN a variant is discontinued but the product still exists, THE system SHALL mark the cart item as variant unavailable and suggest alternative variants if available.

WHEN suggesting alternative variants, THE system SHALL prioritize variants with similar attributes (same color different size, or same size different color).

IF no alternative variants are available, THEN THE system SHALL mark the item as unavailable and prevent checkout.

### 5.5 Seller Status Validation

WHEN a buyer views the cart, THE system SHALL verify that each seller account is active and in good standing.

WHEN a seller account becomes suspended, THE system SHALL mark all items from that seller as unavailable and display a message indicating the seller is temporarily unavailable.

WHEN a seller account is permanently banned, THE system SHALL automatically remove all items from that seller from all buyer carts and display a notification.

THE system SHALL group cart items by seller to clearly show which products come from which sellers.

## 6. Wishlist Functionality

### 6.1 Wishlist Purpose and Use Cases

The wishlist enables buyers to:
- Save products for future consideration without committing to immediate purchase
- Create gift idea collections for sharing with others
- Track price changes on desired products
- Bookmark items that are currently out of stock for later purchase
- Build comparison lists for research and decision-making

THE system SHALL provide each authenticated buyer with a personal wishlist to save products of interest.

THE system SHALL NOT provide wishlist functionality to guest buyers as wishlists require account persistence.

WHEN a guest buyer attempts to add an item to wishlist, THE system SHALL prompt them to log in or register with a message explaining authentication is required for wishlists.

### 6.2 Adding Items to Wishlist

WHEN an authenticated buyer clicks add to wishlist on a product, THE system SHALL add the product to the buyer's wishlist immediately.

WHEN a buyer adds a product with multiple variants to the wishlist, THE system SHALL save the specific variant selected (color, size, options).

WHEN a buyer adds a product that already exists in the wishlist with identical variants, THE system SHALL not create a duplicate and display a message indicating the item is already in the wishlist.

WHEN a buyer successfully adds an item to the wishlist, THE system SHALL display a confirmation notification with a link to view the complete wishlist.

THE system SHALL allow adding items to wishlist from multiple locations including product detail pages, search results, and category browsing.

WHEN a buyer adds an item to the wishlist, THE system SHALL complete the operation within 1 second to provide instant feedback.

### 6.3 Managing Wishlist Items

WHEN a buyer views their wishlist, THE system SHALL display all saved products with product images, titles, selected variants, current prices, and availability status.

THE system SHALL allow buyers to remove items from the wishlist by clicking a remove button on each item.

WHEN a buyer removes an item from the wishlist, THE system SHALL delete it immediately without confirmation, with an undo option available for 10 seconds.

THE system SHALL allow buyers to move items directly from wishlist to cart with a single click.

THE system SHALL allow buyers to select multiple wishlist items and perform batch operations including move to cart and remove.

THE system SHALL display wishlist items in reverse chronological order by default, with most recently added items appearing first.

THE system SHALL provide sorting options for wishlist items including date added, price low to high, price high to low, and product name alphabetically.

### 6.4 Wishlist Persistence

THE system SHALL persist wishlist data permanently for authenticated buyers across all sessions and devices.

WHEN a buyer logs in from any device, THE system SHALL load the complete wishlist with all items and their details.

THE system SHALL synchronize wishlist changes across all active sessions within 5 seconds.

THE system SHALL maintain wishlist items indefinitely until explicitly removed by the buyer or the product becomes permanently unavailable.

### 6.5 Wishlist Limitations

THE system SHALL allow a maximum of 200 items in a single buyer's wishlist to ensure performance and usability.

WHEN a buyer attempts to add a 201st item, THE system SHALL prevent the addition and display a message indicating the wishlist is full at 200 items maximum and items must be removed before adding more.

THE system SHALL include the wishlist item count prominently in the user interface.

### 6.6 Wishlist Notifications and Updates

WHEN a wishlist item's price decreases by 10 percent or more, THE system SHALL notify the buyer via email with the product details and new price.

WHEN a wishlist item that was out of stock becomes available, THE system SHALL notify the buyer via email with a direct link to add the item to cart.

WHEN a wishlist item is about to be discontinued, THE system SHALL notify the buyer at least 7 days before removal, if the seller provides such notice.

THE system SHALL allow buyers to configure wishlist notification preferences including price drop alerts and stock availability alerts.

## 7. Wishlist to Cart Conversion

### 7.1 Moving Items from Wishlist to Cart

WHEN a buyer clicks move to cart on a wishlist item, THE system SHALL add the item to the cart with quantity 1 and remove it from the wishlist.

WHEN a buyer moves a wishlist item that already exists in the cart with identical variants, THE system SHALL increment the cart quantity by 1 and remove the wishlist entry.

WHEN moving an item to cart, THE system SHALL validate current inventory availability before completing the operation.

IF a wishlist item is out of stock when moving to cart, THEN THE system SHALL prevent the move and display a message indicating the item is currently out of stock and cannot be added to cart.

WHEN a buyer successfully moves an item from wishlist to cart, THE system SHALL display a confirmation notification with options to view cart or continue shopping.

### 7.2 Batch Operations

THE system SHALL allow buyers to select multiple wishlist items using checkboxes for batch operations.

WHEN a buyer selects multiple items and clicks move all to cart, THE system SHALL add all selected items to the cart with quantity 1 each.

WHEN performing batch wishlist-to-cart operations, THE system SHALL validate inventory for each item and skip items that are out of stock.

WHEN some items in a batch operation fail validation, THE system SHALL move available items to cart and display a summary showing which items were moved and which were skipped with reasons.

THE system SHALL provide a move all to cart option that selects and moves all wishlist items in a single operation.

### 7.3 Availability Validation During Conversion

WHEN a buyer attempts to move a wishlist item to cart, THE system SHALL verify the product is still published and available for purchase.

WHEN a wishlist item's specific variant is no longer available, THE system SHALL prevent moving to cart and display a message indicating the variant is no longer available and suggesting selecting a different option.

WHEN a wishlist item's seller account is suspended, THE system SHALL prevent moving to cart and display a message indicating the seller is currently unavailable.

THE system SHALL suggest alternative variants when the originally saved variant is unavailable and allow the buyer to update the wishlist item with a new variant selection.

## 8. Cart and Wishlist Interaction

### 8.1 Moving Items Between Cart and Wishlist

THE system SHALL allow buyers to move items from cart to wishlist by clicking a move to wishlist button on cart items.

WHEN a buyer moves a cart item to wishlist, THE system SHALL remove the item from the cart and add it to the wishlist with the selected variant preserved.

WHEN moving a cart item to wishlist, THE system SHALL discard the quantity since wishlist items do not store quantities.

WHEN a buyer moves a cart item that already exists in wishlist with identical variants, THE system SHALL simply remove the cart item without creating a wishlist duplicate.

THE system SHALL allow quick toggle between cart and wishlist from product detail pages, showing current status and allowing one-click switching.

### 8.2 Duplicate Prevention

THE system SHALL prevent duplicate items in the cart by checking SKU and variant combinations before adding.

THE system SHALL prevent duplicate items in the wishlist by checking SKU and variant combinations before adding.

WHEN a buyer attempts to add a wishlist item that exists in their cart, THE system SHALL prevent the wishlist addition and display a message indicating the item is already in the cart.

WHEN a buyer attempts to add a cart item that exists in their wishlist, THE system SHALL offer to move the wishlist item to cart or add it as a new cart entry with quantity 1.

### 8.3 Synchronization Rules

THE system SHALL maintain real-time synchronization between cart and wishlist states to prevent inconsistencies.

WHEN a buyer adds a product to cart from the product page, THE system SHALL not automatically remove it from wishlist to allow buyers to track items they're interested in.

WHEN a buyer explicitly moves an item from wishlist to cart, THE system SHALL remove it from wishlist as this indicates intentional migration.

THE system SHALL update cart and wishlist indicators (item counts, status badges) across all pages instantly when changes occur.

## 9. Checkout Preparation

### 9.1 Cart Validation Before Checkout

WHEN a buyer clicks proceed to checkout, THE system SHALL perform comprehensive cart validation before allowing checkout to begin.

THE system SHALL validate the following conditions before checkout:
- All cart items are in stock with requested quantities available
- All cart items are from active, non-suspended sellers
- All product variants are still available
- No items are marked as unavailable or discontinued
- Cart contains at least one valid item

IF any validation fails, THEN THE system SHALL prevent checkout and display specific error messages for each issue.

WHEN validation passes, THE system SHALL proceed to checkout within 2 seconds.

### 9.2 Cart Locking During Checkout

WHEN a buyer enters the checkout process, THE system SHALL create a temporary reservation for all cart items to prevent inventory conflicts.

THE system SHALL hold inventory reservations for 15 minutes during active checkout sessions.

WHEN a reservation expires, THE system SHALL release the held inventory and re-validate the cart if the buyer is still in checkout.

WHEN inventory becomes insufficient during checkout, THE system SHALL notify the buyer and offer options to adjust quantities or remove items.

THE system SHALL prevent cart modifications while the buyer is actively in the checkout process to avoid order inconsistencies.

### 9.3 Cart Updates During Checkout Process

WHEN a buyer is in checkout and a cart item becomes unavailable, THE system SHALL notify the buyer immediately and require them to return to cart review.

WHEN prices change during checkout, THE system SHALL update the order total and require buyer acknowledgment before proceeding with payment.

WHEN a buyer abandons checkout and returns to the cart, THE system SHALL release inventory reservations and allow normal cart editing.

IF a buyer completes payment, THEN THE system SHALL convert the cart to an order and clear the cart immediately.

WHEN order placement succeeds, THE system SHALL clear the cart completely and display order confirmation.

IF order placement fails, THEN THE system SHALL restore the cart with all items and allow the buyer to retry or modify their order.

## 10. Performance and User Experience Requirements

### 10.1 Response Time Expectations

WHEN a buyer adds an item to cart, THE system SHALL complete the operation within 1 second to provide instant feedback.

WHEN a buyer updates cart quantities, THE system SHALL apply changes within 1 second and update all totals immediately.

WHEN a buyer views the cart page, THE system SHALL load and display all items within 2 seconds for carts with up to 100 items.

WHEN a buyer adds an item to wishlist, THE system SHALL complete the operation within 1 second to ensure responsive interaction.

WHEN validating cart contents, THE system SHALL complete all checks within 2 seconds to avoid delays during checkout.

### 10.2 Real-Time Updates

THE system SHALL update cart item counts and subtotals in real-time as buyers add, remove, or modify items.

THE system SHALL reflect inventory changes within 5 seconds when products go out of stock or return to stock.

THE system SHALL display price changes immediately when detected during cart viewing or validation.

THE system SHALL synchronize cart changes across devices within 5 seconds for authenticated buyers.

### 10.3 Error Handling and User Feedback

WHEN any cart or wishlist operation fails, THE system SHALL display clear, actionable error messages explaining what went wrong and how to resolve it.

THE system SHALL provide visual feedback for all user actions including loading indicators, success confirmations, and error states.

WHEN network errors occur, THE system SHALL retry failed operations automatically up to 3 times before displaying an error message.

WHEN operations succeed, THE system SHALL display brief confirmation notifications that auto-dismiss after 5 seconds.

THE system SHALL provide undo functionality for destructive actions (removing items) with a 10-second window.

WHEN cart validation identifies multiple issues, THE system SHALL present all errors in a prioritized list rather than showing errors one at a time.

### 10.4 Visual Design and Usability Expectations

THE system SHALL display cart and wishlist item counts as badge indicators on navigation elements, visible from any page.

THE system SHALL show product thumbnail images for all cart and wishlist items to aid visual recognition.

THE system SHALL highlight unavailable items, price changes, and validation errors with distinct visual styling to draw attention.

THE system SHALL group cart items by seller with clear visual separation to help buyers understand their multi-vendor purchases.

THE system SHALL display estimated subtotals prominently throughout the cart experience.

THE system SHALL provide empty state messaging for empty carts and wishlists with suggestions to continue shopping.

## 11. Business Rules and Constraints

### 11.1 Maximum Cart Size

THE system SHALL enforce a maximum of 100 distinct items (unique SKU and variant combinations) per cart.

THE system SHALL enforce a maximum quantity of 999 units per individual item unless seller-specific limits are lower.

WHEN cart limits are reached, THE system SHALL prevent additions and clearly communicate the limitation to the buyer.

### 11.2 Item Expiration Rules

THE system SHALL retain guest cart items for 7 days from last modification in browser local storage.

WHEN guest cart items exceed 7 days old, THE system SHALL automatically remove them to prevent stale inventory reservations.

THE system SHALL retain authenticated user cart items indefinitely until checked out, manually removed, or products become unavailable.

WHEN cart items are from discontinued products, THE system SHALL retain them for 30 days before automatic removal, giving buyers time to notice and take action.

### 11.3 Concurrent Modification Handling

WHEN the same buyer modifies the cart from multiple devices simultaneously, THE system SHALL use last-write-wins strategy to resolve conflicts.

THE system SHALL timestamp every cart modification to determine operation order during conflict resolution.

WHEN conflicting modifications occur within 1 second, THE system SHALL apply both changes if possible (for example, quantity updates to different items).

IF conflicts cannot be automatically resolved, THEN THE system SHALL display a notification prompting the buyer to review and confirm cart contents.

### 11.4 Cart Abandonment Handling

THE system SHALL track cart abandonment metrics including time since last cart modification and checkout abandonment rates.

WHEN an authenticated buyer has items in cart for more than 24 hours without checkout, THE system SHALL send a reminder email with cart contents and a direct checkout link.

THE system SHALL send a maximum of 2 cart abandonment reminder emails spaced at least 3 days apart to avoid spam.

THE system SHALL allow buyers to unsubscribe from cart abandonment reminders through email preference settings.

WHEN cart items remain for more than 30 days, THE system SHALL send a final reminder before considering the cart abandoned for analytics purposes.

### 11.5 Inventory Reservation Rules

THE system SHALL NOT reserve inventory for items in the cart until the buyer enters the checkout process.

WHEN a buyer begins checkout, THE system SHALL create temporary 15-minute inventory reservations for all cart items.

IF inventory becomes insufficient after reservation, THEN THE system SHALL adjust cart quantities to available levels and notify the buyer.

WHEN checkout is abandoned, THE system SHALL release all inventory reservations immediately to make products available for other buyers.

THE system SHALL prevent overselling by validating inventory at multiple checkpoints including cart addition, cart viewing, checkout entry, and payment processing.

### 11.6 Multi-Seller Cart Rules

THE system SHALL allow cart items from multiple sellers in a single cart.

THE system SHALL group cart items by seller for clear presentation and order processing.

WHEN checkout occurs with multi-seller carts, THE system SHALL process items as separate orders per seller while maintaining a unified checkout experience.

THE system SHALL calculate shipping separately for each seller's items when shipping costs are seller-specific.

THE system SHALL allow buyers to proceed with partial checkout if some sellers' items are unavailable, creating orders only for available items.

### 11.7 Price Integrity Rules

THE system SHALL store the original price at time of adding to cart for price change detection.

THE system SHALL use current prices for all checkout calculations to ensure buyers pay accurate, up-to-date prices.

WHEN prices increase before checkout, THE system SHALL require buyer acknowledgment of the new total before payment.

WHEN prices decrease before checkout, THE system SHALL automatically apply the lower price and highlight the savings to the buyer.

THE system SHALL display both original and current prices when changes are detected, showing clear before-and-after comparison.

## 12. Additional Cart Management Features

### 12.1 Save for Later Functionality

THE system SHALL provide a save for later feature allowing buyers to temporarily remove items from the active cart without deleting them.

WHEN a buyer saves an item for later, THE system SHALL move the item to a separate saved items list within the cart interface.

WHEN a buyer views saved items, THE system SHALL display them separately from active cart items with options to move back to cart or delete permanently.

THE system SHALL NOT include saved items in cart total calculations or checkout processing.

THE system SHALL persist saved items using the same persistence rules as cart items (permanent for authenticated users, 7 days for guests).

### 12.2 Quantity Increment Controls

THE system SHALL provide increment and decrement buttons for adjusting cart item quantities.

WHEN a buyer clicks increment, THE system SHALL increase quantity by 1 up to the maximum available inventory.

WHEN a buyer clicks decrement, THE system SHALL decrease quantity by 1 down to a minimum of 1.

IF a buyer decrements quantity to zero, THEN THE system SHALL remove the item from the cart entirely.

THE system SHALL also allow direct numerical input for buyers to type exact quantities.

WHEN a buyer enters a quantity manually, THE system SHALL validate the input is a positive integer not exceeding available inventory.

### 12.3 Cart Summary Display

THE system SHALL display a persistent cart summary accessible from all pages showing:
- Total item count
- Cart subtotal
- Quick view of cart items (mini cart dropdown)
- Link to full cart page
- Link to checkout

WHEN a buyer hovers over or clicks the cart icon, THE system SHALL display a mini cart preview with up to 5 most recently added items.

THE mini cart SHALL provide quick access to remove items or proceed to checkout without navigating to the full cart page.

### 12.4 Empty Cart State

WHEN a buyer views an empty cart, THE system SHALL display an informative empty state message encouraging the buyer to continue shopping.

THE empty cart state SHALL include:
- Friendly message such as "Your cart is empty"
- Suggestions for featured or recommended products
- Link to popular categories or best sellers
- Recently viewed products (if available)

### 12.5 Cart Sharing and Save

THE system SHALL allow authenticated buyers to save their cart for later by creating a named saved cart.

WHEN a buyer saves their current cart, THE system SHALL preserve all items, quantities, and variants with a user-defined name.

THE system SHALL allow buyers to maintain up to 5 saved carts simultaneously.

WHEN a buyer loads a saved cart, THE system SHALL replace the current cart contents with the saved cart items after confirming with the buyer.

THE system SHALL validate inventory and pricing when loading saved carts and notify the buyer of any changes.

### 12.6 Gift Registry and Wishlist Sharing

THE system SHALL allow buyers to generate a shareable link for their wishlist to facilitate gift registries and sharing with friends and family.

WHEN a buyer generates a shareable wishlist link, THE system SHALL create a unique, non-guessable URL that provides read-only access to the wishlist.

THE system SHALL allow wishlist viewers (via shared link) to add wishlist items to their own carts for purchasing as gifts.

WHEN an item is purchased from a shared wishlist, THE system SHALL optionally mark it as purchased to prevent duplicate gifts if the buyer enables this setting.

THE system SHALL protect buyer privacy by not revealing purchaser information to the wishlist owner for gift surprise purposes.

## 13. Advanced Cart Features

### 13.1 Cart Recommendations

WHEN a buyer views their cart, THE system SHALL display product recommendations based on cart contents including:
- Frequently bought together items
- Complementary products
- Accessories for cart items
- Alternative products if cart items are unavailable

THE system SHALL allow buyers to add recommended products directly to cart from the cart page.

### 13.2 Stock Notifications

WHEN a buyer has out-of-stock items in their cart or wishlist, THE system SHALL allow buyers to sign up for back-in-stock notifications.

WHEN an out-of-stock product becomes available again, THE system SHALL send email notifications to all buyers who requested stock alerts within 1 hour of inventory update.

THE stock notification email SHALL include:
- Product name and variant details
- Current price
- Direct link to add to cart
- Link to product page

### 13.3 Price Drop Alerts

WHEN a buyer has items in their wishlist, THE system SHALL monitor price changes for those items.

WHEN a wishlist item's price decreases by 10 percent or more, THE system SHALL send an email alert to the buyer.

THE price drop alert SHALL include:
- Product name and image
- Original price and new price
- Percentage savings
- Direct link to add to cart
- Link to product page

THE system SHALL send price drop alerts immediately within 2 hours of price change detection.

THE system SHALL limit price drop emails to one per product per buyer per week to prevent notification fatigue.

### 13.4 Wishlist Expiration for Discontinued Items

WHEN a product is permanently removed from the catalog, THE system SHALL notify wishlist buyers that the item is no longer available.

THE system SHALL retain the discontinued item in wishlists for 30 days to allow buyers to review and remove it.

WHEN 30 days pass after product discontinuation, THE system SHALL automatically remove the item from all wishlists and send a notification to affected buyers.

### 13.5 Cart Analytics for Buyers

THE system SHALL provide authenticated buyers with cart analytics showing:
- Total amount saved in cart
- Number of items in cart
- Average time items remain in cart before purchase or removal
- Potential savings if items go on sale

THE system SHALL display cart value trends over time helping buyers make informed purchase decisions.

## 14. Error Scenarios and Edge Cases

### 14.1 Network Connectivity Issues

WHEN network connectivity is lost while a buyer is adding items to cart, THE system SHALL queue the operation locally and retry when connectivity resumes.

THE system SHALL display a notification indicating offline status and that changes will sync when connection is restored.

WHEN connectivity is restored, THE system SHALL synchronize all queued operations within 10 seconds.

IF synchronization conflicts occur after reconnection, THEN THE system SHALL resolve using most recent timestamp and notify the buyer of any adjustments.

### 14.2 Concurrent Cart Modifications

WHEN a buyer modifies the cart on multiple devices within the same second, THE system SHALL detect the conflict and apply the most recent change based on server timestamp.

THE system SHALL notify the buyer if concurrent modifications resulted in unexpected cart state.

WHEN a buyer's cart is modified by automatic system processes (price updates, availability changes) while the buyer is viewing the cart, THE system SHALL update the display in real-time with visual indicators of what changed.

### 14.3 Session Expiration During Cart Operations

WHEN a buyer's authentication session expires while adding items to cart or updating quantities, THE system SHALL preserve the operation and prompt the buyer to log in again.

WHEN the buyer re-authenticates, THE system SHALL complete the pending operation and synchronize the cart.

THE system SHALL NOT lose any cart data during session expiration and re-authentication.

### 14.4 Payment Failure Impact on Cart

WHEN payment fails during checkout, THE system SHALL restore the cart to its pre-checkout state with all items and quantities preserved.

THE system SHALL release temporary inventory reservations when payment fails.

THE system SHALL allow the buyer to modify the cart, update payment method, and retry checkout.

THE system SHALL maintain cart contents through multiple payment retry attempts.

### 14.5 Deleted or Modified Products

WHEN a seller modifies a product's variants while the product is in buyer carts, THE system SHALL:
- Retain the cart item with the originally selected variant if it still exists
- Mark the cart item as unavailable if the specific variant was removed
- Suggest alternative available variants to the buyer

WHEN a seller changes a product's price while it is in buyer carts, THE system SHALL update the cart item price and display the price change notification on next cart view.

WHEN a seller deletes a product entirely, THE system SHALL mark all cart items for that product as unavailable across all buyer carts.

THE system SHALL retain unavailable cart items for 30 days to give buyers time to review and remove them.

WHEN 30 days pass with unavailable items in cart, THE system SHALL automatically remove them and notify the buyer.

### 14.6 Bulk Operation Failures

WHEN a buyer attempts to move all wishlist items to cart and some items fail validation, THE system SHALL provide a detailed summary showing:
- Number of items successfully moved
- List of items that couldn't be moved with specific reasons (out of stock, unavailable variant, suspended seller)
- Total items remaining in wishlist

THE system SHALL allow the buyer to review the failure summary and take appropriate actions on failed items.

### 14.7 Storage Quota Exceeded

WHEN browser local storage quota is exceeded for guest carts, THE system SHALL:
- Alert the buyer that cart storage is full
- Suggest logging in for unlimited cart storage
- Allow the buyer to remove items to free up space
- Prioritize keeping most recently added items if automatic cleanup is needed

---

## 15. Integration Points Summary

### 15.1 Product Catalog Integration

THE system SHALL integrate with the product catalog to:
- Retrieve current product information, pricing, and images for cart display
- Validate product and variant availability in real-time
- Detect product changes (price, availability, variant modifications)
- Display accurate product details in cart and wishlist

### 15.2 Inventory System Integration

THE system SHALL integrate with inventory management to:
- Validate available stock quantities before cart additions
- Reserve inventory during checkout
- Release inventory on checkout abandonment or order cancellation
- Monitor inventory changes for cart validation

### 15.3 User Authentication Integration

THE system SHALL integrate with authentication system to:
- Distinguish between authenticated and guest buyer carts
- Persist cart data permanently for authenticated users
- Merge guest carts with authenticated user carts on login
- Synchronize carts across authenticated sessions

### 15.4 Order Management Integration

THE system SHALL integrate with order management to:
- Transfer cart contents to order creation process
- Clear cart upon successful order placement
- Restore cart if order placement fails
- Provide cart data for order confirmation and receipts

### 15.5 Notification System Integration

THE system SHALL integrate with notification system to:
- Send cart abandonment reminders
- Send wishlist price drop alerts
- Send back-in-stock notifications for wishlist items
- Send cart sync confirmations across devices

---

This document provides comprehensive business requirements for the shopping cart and wishlist functionality, ensuring backend developers have complete clarity on expected behaviors, validation rules, error scenarios, and integration points for implementation.