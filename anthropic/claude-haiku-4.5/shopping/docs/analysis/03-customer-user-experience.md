# Customer User Experience

## Overview

This document defines the customer-specific features and user journeys for the shopping mall e-commerce platform. It encompasses the complete customer experience from account creation through order placement, including profile management, address management, product discovery, cart management, and checkout workflows. This specification ensures customers have an intuitive, seamless experience while maintaining data integrity and business rule compliance throughout their interactions.

The customer experience is built upon three core user types: registered customers with full account functionality, guest customers with limited capabilities, and customers undergoing authentication. All customer workflows integrate with the authentication system defined in [User Actors and Authentication](./02-user-actors-and-authentication.md) and work in conjunction with the [Product Catalog and Inventory](./04-product-catalog-and-inventory.md) system.

---

## Customer Registration and Onboarding

### Registration Requirements

WHEN a non-authenticated user initiates account creation, THE system SHALL collect and validate the following information:
- Full name (required, 2-100 characters)
- Email address (required, valid email format, must be unique in the system)
- Password (required, minimum 8 characters, must contain uppercase, lowercase, number, and special character)
- Phone number (optional, valid phone format if provided)
- Acceptance of terms and conditions (required checkbox)

THE system SHALL validate that the email address is not already registered in the system and display an error if duplication is detected within 1 second of user input blur.

### Email Verification Process

WHEN a customer completes registration, THE system SHALL send a verification email to the provided email address containing a unique verification link.

THE system SHALL require the customer to verify their email address before they can place orders, though they SHALL be able to browse products and manage their profile.

THE system SHALL expire verification links after 24 hours of email delivery.

WHEN a customer clicks the verification link, THE system SHALL mark the email as verified and enable full order placement capabilities within 30 seconds.

IF a customer does not verify their email within 24 hours, THEN THE system SHALL allow them to request a new verification email through their account settings or via email link.

THE system SHALL impose a maximum of 5 verification email resend requests per day per email address to prevent abuse.

### Profile Initialization

WHEN a customer successfully completes registration and email verification, THE system SHALL create a customer profile with:
- A unique customer ID (prefixed with "CUST-" followed by random alphanumeric)
- Registration timestamp (ISO 8601 format with timezone)
- Account status (active)
- Customer tier (default: standard)
- Empty address list
- Empty wishlist
- Empty order history
- Order notification preferences (default: email enabled, SMS disabled, push disabled)
- Language preference (default: English)
- Timezone (auto-detected from IP, customer can override)

THE system SHALL mark the profile as ready for shopping once email verification is complete.

THE system SHALL display a green checkmark on "Account Verified" in the customer's dashboard within 1 second of email verification.

### First-Time Onboarding Experience

WHEN a newly registered customer logs in for the first time after email verification, THE system SHALL display a guided onboarding experience that:
- Welcomes the customer by first name
- Explains the account management features available (addresses, wishlists, order history)
- Prompts the customer to add a delivery address for future orders
- Introduces browsing and search capabilities
- Offers a site tour or quick start guide
- Displays special offers or promotions for new customers

THE system SHALL make this onboarding optional and allow customers to skip directly to shopping via a "Skip Tour" button.

THE onboarding flow SHALL take no more than 3 minutes if the customer completes all steps.

---

## Profile and Address Management

### Customer Profile Information

THE customer profile SHALL store the following information:
- Full name (editable by customer, 2-100 characters)
- Email address (read-only primary display, email change requires verification process)
- Phone number (editable by customer, must be valid format)
- Profile image/avatar (optional, editable by customer, max 2MB, JPEG/PNG format)
- Language preference (editable by customer, default: English)
- Notification preferences (email, SMS, push - customer configurable per notification type)
- Account creation date (read-only, ISO 8601 format)
- Last login timestamp (read-only, ISO 8601 format)
- Account status (read-only, active/suspended/deactivated)

WHEN a customer updates their profile information, THE system SHALL validate all new data and store only valid changes within 2 seconds of submission.

THE system SHALL display confirmation message "Profile updated successfully" upon successful update.

IF a customer changes their email address, THEN THE system SHALL require verification of the new address before the change is finalized. THE old email remains active until new email is verified. IF new email verification fails or is not completed within 7 days, THE change is cancelled and customer is notified.

### Multiple Address Management

THE system SHALL allow each customer to save up to 10 addresses in their account for future order placement.

Each saved address SHALL include:
- Address label (e.g., "Home", "Work", "Apartment") - editable text field (max 50 characters)
- Full name (for delivery recipient, 2-100 characters)
- Street address (line 1 and optional line 2, max 200 characters each)
- City (2-100 characters)
- State/Province (2-50 characters for valid state codes)
- Postal code (format varies by country, max 20 characters)
- Country (from predefined country list)
- Phone number (for delivery contact, valid international or local format)
- Address type (Shipping / Billing)
- Default address flag (only one default per type allowed)
- Verification status (verified, unverified)

WHEN a customer adds a new address, THE system SHALL validate the address format and format using postal code validation service. THE system SHALL notify the customer of validation results within 3 seconds.

THE system SHALL require at least one verified address before a customer can proceed to checkout.

### Address Validation and Updates

THE system SHALL validate addresses according to these criteria:
- All required fields must be populated (no null or empty values)
- Street address must be at least 5 characters and use only alphanumeric characters, spaces, hyphens, and periods
- City must be 2-50 characters containing only letters and spaces
- Postal code format must match the selected country format (verified via validation API)
- Phone number must match valid formatting rules (verified via international phone number library)
- Country code must be valid ISO 3166-1 alpha-2 code

IF address validation fails, THEN THE system SHALL display specific error messages indicating which fields require correction within 1 second. Examples:
- "Street address must be at least 5 characters"
- "Postal code format is invalid for [Country]"
- "Phone number is not in valid format for [Country]"

WHEN a customer updates an existing address, THE system SHALL apply the same validation rules and show success/error messages.

THE system SHALL prevent address modification if the address is currently being used in an active (not yet delivered) order. THE customer sees message: "This address is in use for order [ORDER_ID]. Address updates available after delivery."

### Default Address Selection

EACH customer SHALL designate one address as their default shipping address and optionally one as their default billing address.

WHEN a customer begins checkout, THE system SHALL pre-populate the checkout form with their default shipping address, reducing friction.

THE customer SHALL be able to change the selected address during checkout before confirming the order (no additional fees for address changes during checkout).

WHEN a customer marks an address as default, THE system SHALL update the flag within 1 second and confirm the change.

IF a customer has not yet set a default address, THE system SHALL prompt them to select one from their saved addresses or add a new address before checkout can proceed.

### Address Deletion and Management

WHEN a customer requests to delete an address, THE system SHALL:
- Check if the address is currently set as the default address
- If the address is the default, ask the customer to designate a new default before deletion
- Permanently remove the address from the customer's account
- Update any orders previously associated with this address to retain the historical record (address data archived)

THE system SHALL NOT allow deletion of an address that is actively being used in an in-progress order (status: pending, processing, or shipped). The customer sees: "This address is in use for an active order and cannot be deleted."

THE system SHALL allow address re-addition if a customer deletes and then wants to restore an address (manual re-entry required, no undo function).

THE system SHALL display deletion confirmation dialog: "Are you sure you want to delete this address? This action cannot be undone."

---

## Product Browsing and Discovery

### Product Catalog Navigation

THE system SHALL organize products into hierarchical categories and subcategories enabling intuitive browsing:
- Main categories (e.g., "Electronics", "Fashion", "Home & Garden")
- Subcategories (e.g., under "Electronics": "Smartphones", "Laptops", "Accessories")
- Product listings with pagination showing up to 24 products per page

WHEN a customer navigates to a category, THE system SHALL display all products in that category with:
- Product thumbnail image (displayed at 200×200 pixels)
- Product name (truncated to 60 characters with ellipsis if longer)
- Average rating with star visualization (if 3+ reviews exist)
- Number of reviews in parentheses (e.g., "4.3★ (247 reviews)")
- Current lowest variant price with "Starting from" prefix if multiple prices exist
- Stock availability indicator: "In Stock" / "Limited Stock" (for <10 units) / "Out of Stock"
- Seller name with linked seller profile
- Expected delivery date estimate (e.g., "Arrives in 3-5 days")

THE system SHALL load and display product listings within 2 seconds of category navigation.

### Product Filtering and Sorting

WHEN a customer is viewing a product category, THE system SHALL provide filtering options including:
- Price range with dual slider inputs (minimum value 1, maximum value 999,999)
- Seller name (multi-select checkbox list showing top 10 sellers by product count)
- Rating filter with threshold selection (3★, 4★, 4.5★, 5★ - show only products meeting threshold)
- Availability filter (In Stock, All Products including out-of-stock)
- Category-specific filters that vary by product type (e.g., Brand filter for electronics, Size filter for fashion)

WHEN a customer applies filters, THE system SHALL update the product list to show only matching products and display the count of results prominently. THE system SHALL update results within 1.5 seconds of filter application.

WHEN no products match the applied filters, THE system SHALL display message "No products match your filters" and suggest relaxing specific filters.

WHEN a customer is viewing a product list, THE system SHALL provide sorting options with default of "Relevance":
- Relevance (default for search results, based on keyword matching and product popularity)
- Newest (recently added products first, typically last 30 days)
- Price: Low to High (ascending order)
- Price: High to Low (descending order)
- Highest Rated (5.0 stars descending)
- Most Reviewed (by review count descending)
- Best Selling (by units sold in last 30 days descending)

THE system SHALL apply sorting within 1 second and update product order without full page reload.

### Product Search Functionality

WHEN a customer enters a search query in the search field, THE system SHALL:
- Accept search queries up to 200 characters
- Search across product names, descriptions, seller names, and category names using full-text search
- Display search results with pagination (24 products per page)
- Highlight search query matches in product information using bold or colored text
- Display "Did you mean?" suggestions if no exact results match (using phonetic matching algorithm)
- Show the number of products matching the search at the top of results

THE system SHALL return search results sorted by relevance, showing the most relevant products first based on:
1. Exact title match (highest priority)
2. Partial title match
3. Description match
4. Seller name match
5. Category match

THE search results SHALL be returned and displayed within 1.5 seconds of query submission.

WHEN a customer conducts a search, THE system SHALL also display:
- Suggested categories that match the search keywords (top 5 categories)
- Available filters for narrowing results (same as category filters)
- Option to refine search via "Search Suggestions" dropdown

THE system SHALL autocomplete search queries as customer types, showing top 10 matching product names and categories.

### Product Detail View

WHEN a customer clicks on a product, THE system SHALL display a detailed product page containing:
- Product name (full name, not truncated)
- Seller name with seller rating link (clickable to view seller profile)
- Primary product image (large view, minimum 400×400 pixels, centered)
- Additional product images in thumbnail carousel (scrollable, up to 10 images total)
- Product description (full details, up to 5000 characters, formatted with paragraph breaks)
- Average rating with star visualization and review count (clickable to jump to reviews section)
- Current price displayed prominently (with original price struck-through if on promotion)
- Available variants with their options in easy-to-use selector (colors, sizes, etc. with visual swatches if applicable)
- Stock status per variant: "In Stock" / "Limited Stock: [X] remaining" / "Out of Stock"
- Shipping information (estimated delivery range e.g., "3-5 business days", shipping cost if applicable)
- Return policy summary (clickable link to full policy)
- Related products section (suggestions for similar items, min 5 products shown)
- Customer reviews section (top 5 reviews with option "See all [X] reviews" button)
- "Add to Cart" button and "Add to Wishlist" button

THE product detail page SHALL load completely within 2 seconds.

THE system SHALL display product detail pages with SEO-optimized URLs containing product slug (e.g., /products/iphone-13-pro-256gb-silver).

### Inventory Availability Checking

WHEN a customer views a product, THE system SHALL display real-time inventory availability for each variant:
- In Stock: Available for immediate order
- Limited Stock: Show quantity remaining (if available < 10 units displayed as "Only [X] left in stock")
- Out of Stock: Product currently unavailable
- Pre-order Available: Product coming soon with estimated availability date

WHEN a product variant transitions from "In Stock" to "Out of Stock", THE system SHALL:
- Update the product page status display within 30 seconds
- Notify any customers who added this variant to their wishlist via email
- Prevent new additions to cart from this variant (button becomes disabled)
- Allow customers with this item in their cart to proceed but warn them during checkout

THE system SHALL update inventory status in real-time (within 30 seconds of inventory change) to prevent overselling situations.

---

## Shopping Cart Management

### Cart Creation and Maintenance

WHEN a customer first adds an item to their cart, THE system SHALL create a shopping cart associated with their customer account.

THE shopping cart SHALL persist across browser sessions and device logins. WHEN a customer logs in from any device, THE system SHALL display their current cart contents (from the server-side persistent cart, not local storage).

EACH shopping cart SHALL maintain the following information:
- Cart ID (unique identifier, prefixed with "CART-" plus timestamp)
- Customer ID (owner of the cart)
- List of cart items with variant details and quantities
- Cart creation timestamp
- Last updated timestamp (updated on every modification)
- Cart status (active, abandoned, converted_to_order)

THE system SHALL preserve cart contents indefinitely while the customer account is active. IF a customer account is deleted, associated cart is also deleted after 30-day grace period.

### Adding Items to Cart

WHEN a customer views a product and selects a specific variant (color, size, etc.) and quantity, THE system SHALL present an "Add to Cart" button.

WHEN a customer clicks "Add to Cart", THE system SHALL:
- Validate that the selected quantity is available for the chosen variant (within 500ms)
- Add the item to the customer's cart (or increase quantity if item already exists)
- Display a confirmation message: "Added [Product Name] to your cart"
- Show the updated cart item count in the navigation header (e.g., "Cart (3)")
- Offer a "View Cart" button for immediate navigation or "Continue Shopping" button

THE system SHALL complete the add-to-cart operation within 1 second of button click.

IF the requested quantity exceeds available inventory, THEN THE system SHALL display an error message indicating maximum available quantity and suggest adding the maximum available amount instead. Example: "Only 5 units available. Would you like to add 5 instead of 10?"

IF a customer attempts to add a product that is currently out of stock, THEN THE system SHALL:
- Prevent the addition to cart
- Display message: "This item is currently out of stock"
- Offer option to add to wishlist for restock notifications: "Notify me when back in stock"

### Cart Item Management - Quantity Modification

WHEN a customer views their shopping cart, THE system SHALL display each item with:
- Product image (thumbnail, 100×100 pixels)
- Product name and variant details (color, size, etc.)
- Unit price (displayed prominently)
- Quantity selector with input field and +/- buttons (increment/decrement buttons on each side)
- Line subtotal (unit price × quantity, updated in real-time)
- "Remove" button

WHEN a customer changes the quantity of a cart item using the quantity selector, THE system SHALL:
- Validate the new quantity against current inventory (within 500ms)
- Update the cart total in real-time on the page
- Display the updated line subtotal
- Show any quantity-based discounts if applicable (e.g., "Buy 5+ and save 10%")
- Save the change to the server within 2 seconds

THE system SHALL allow customers to increase quantity to a maximum of 100 units per item (to prevent abuse).

IF a customer attempts to set quantity to zero, THEN THE system SHALL automatically remove the item from the cart instead of setting quantity to 0.

IF a customer attempts to increase quantity beyond available inventory, THEN THE system SHALL display an error and revert to the previous valid quantity. Example: "Only 5 units available. Quantity reverted to previous amount."

THE system SHALL display real-time error message with options to reduce quantity or remove the item.

### Removing Items from Cart

WHEN a customer clicks the remove button next to a cart item, THE system SHALL:
- Display a confirmation message: "Are you sure you want to remove [Product Name]?"
- Upon confirmation, remove the item from the cart
- Update the cart total within 1 second
- Display success message: "[Product Name] removed from your cart"

THE system SHALL update the updated cart item count in the navigation header immediately after removal.

THE system SHALL allow customers to undo removal within 30 seconds by clicking "Undo" button that appears briefly after removal.

### Cart Persistence and Session Management

THE system SHALL save cart changes immediately when a customer:
- Adds an item
- Removes an item
- Modifies quantity
- Clears the cart

THE system SHALL maintain the shopping cart even if:
- The customer closes their browser
- The customer navigates away from the shopping cart page
- The customer logs out and logs back in
- The customer accesses the platform from a different device

WHEN a customer logs in from a new device with a pre-existing cart on another device, THE system SHALL merge carts intelligently:
- Items in both carts are preserved
- If same product with same variant exists in both, THE system uses the quantity from the device with most recent access
- Customer receives notification: "Your cart from another device has been merged"

THE system SHALL NOT lose cart items under any circumstances (critical data preservation requirement).

### Cart Item Updates and Synchronization

WHEN a customer has items in their cart and a seller updates the price of an item, THE system SHALL:
- Display the updated price in the cart
- Recalculate the order total with the new price
- Display a notification banner: "Price updated for [Product Name]: was $X, now $Y"
- Allow the customer to accept the new price or remove the item

THE system SHALL accept price changes without requiring customer action (prices always reflect current market prices when customer proceeds to checkout).

WHEN a customer has items in their cart and a seller reduces the available inventory below the customer's current cart quantity, THE system SHALL:
- Display a warning during cart review: "[Product Name] only 2 units available, your cart has 5"
- Automatically reduce the quantity to the available amount
- Allow the customer to reduce quantity further if desired
- Update the cart total accordingly
- Prevent checkout until quantities are adjusted to available amounts

THE cart warning messages SHALL be displayed prominently in yellow/warning color.

### Cart Validation Before Checkout

BEFORE allowing a customer to proceed to checkout, THE system SHALL validate within 2 seconds:
- Cart contains at least one item
- All items in cart are still available at their selected quantities
- All items in cart are from sellers with active status (not suspended or deactivated sellers)
- All prices are current (comparing against database)
- All totals are correctly calculated

IF any validation fails, THEN THE system SHALL:
- Display specific error messages explaining the issue
- Prevent progression to checkout
- Offer solutions: "Remove unavailable items", "Reduce quantities", or "Continue shopping"

### Cart Clearing

WHEN a customer requests to clear their cart (via "Clear Cart" button), THE system SHALL:
- Display a confirmation dialog: "This will remove all items from your cart. Continue?"
- Upon confirmation, remove all items from the cart within 1 second
- Display success message: "Your cart has been cleared"
- Return the customer to the product catalog or homepage

THE system SHALL allow customers to undo cart clearing within 60 seconds by clicking "Undo" button.

---

## Wishlist Feature

### Wishlist Creation and Access

WHEN a customer creates an account, THE system SHALL automatically create an empty wishlist associated with their account.

EACH customer SHALL have exactly one wishlist that persists across sessions and devices.

WHEN a customer navigates to their account, THE system SHALL provide a "Wishlist" link to view their wishlist at any time.

THE wishlist SHALL be private to the customer (other customers cannot view a customer's wishlist unless explicitly shared by customer).

### Adding Products to Wishlist

WHEN a customer views a product detail page, THE system SHALL display an "Add to Wishlist" button (or heart icon) on the page.

WHEN a customer clicks "Add to Wishlist", THE system SHALL:
- Add the product to their wishlist with the currently selected variant (color, size, etc.)
- Display confirmation message: "Added to your wishlist"
- Change the button appearance to indicate the item is already in wishlist (e.g., filled heart icon)
- Allow the customer to continue shopping or navigate to their wishlist

THE add-to-wishlist operation SHALL complete within 1 second.

IF a customer attempts to add a product variant that is already in their wishlist, THEN THE system SHALL:
- Display message: "This item is already in your wishlist"
- Highlight the item in their wishlist view

WHEN a customer is browsing their cart or product listing, THE system SHALL display a heart icon or wishlist indicator for products already in their wishlist (visual indication of wishlist membership).

### Removing Products from Wishlist

WHEN a customer is viewing their wishlist, THE system SHALL display each item with:
- Product image (thumbnail, 150×150 pixels)
- Product name and selected variant details
- Current price (with "Price changed" indicator if price differs from when added)
- Stock status (In Stock, Limited Stock, Out of Stock)
- "Add to Cart" button
- "Remove from Wishlist" button (or X icon)

WHEN a customer clicks "Remove from Wishlist", THE system SHALL:
- Display confirmation: "Remove this item from your wishlist?"
- Upon confirmation, remove the item from the wishlist within 1 second
- Display success message
- Update the wishlist display to reflect removal

WHEN a customer is viewing a product that is in their wishlist and clicks the wishlist button, THE system SHALL:
- Remove the product from their wishlist within 1 second
- Update the button appearance to show it's no longer in wishlist

### Wishlist Persistence and Management

THE system SHALL persist the wishlist across:
- Browser sessions and page refreshes
- Device logins
- Logout and login cycles
- Extended inactivity periods

THE system SHALL maintain a wishlist history and display:
- Date item was added (e.g., "Added 3 months ago")
- Quantity of this item customer has previously purchased (if applicable)
- Current price vs. price when added (show savings if price decreased)
- Price history trend (optional, show if price has fluctuated)

WHEN a product in a customer's wishlist goes out of stock, THE system SHALL:
- Display the item as "Out of Stock" in the wishlist with grayed-out appearance
- Show last known price from when product was in stock
- Send notification to customer if enabled: "[Product Name] is now out of stock"
- Maintain the item in the wishlist until customer removes it manually

WHEN a product in a customer's wishlist has a price reduction of 10% or more, THE system SHALL:
- Highlight the item in the wishlist view with a "Price Dropped" badge
- Send a price drop notification to the customer if notifications are enabled: "Price reduced from $X to $Y"
- Display the price reduction percentage and savings amount

### Wishlist Operations

THE system SHALL allow customers to perform the following wishlist operations:
- View all items in their wishlist with sorting options (Recently Added, Price Low-High, Price High-Low, Highest Rated)
- Filter wishlist by category
- Move items from wishlist to cart with one click (pre-populate cart with selected quantity)
- Share wishlist with others (via generated shareable link)
- View wishlist statistics (total items, total value if all purchased, average price)
- Set price drop alerts (notify if product price drops below threshold)
- Sort and organize wishlist items

WHEN a customer shares their wishlist, THE system SHALL generate a unique read-only link that:
- Shows all items in the wishlist (public view, but no purchase allowed from shared link)
- Displays prices and product information
- Allows viewers to navigate to product details or add items to their own carts
- Does not expose any personal customer information (only product data)
- Expires after 1 year or when customer deletes the link

THE shared wishlist link SHALL be in format: https://platform.com/wishlist/share/[UNIQUE_TOKEN]

---

## Checkout Process

### Checkout Initiation

WHEN a customer with items in their cart clicks "Proceed to Checkout" or similar button, THE system SHALL:
- Validate the cart contains valid items (within 2 seconds)
- Verify the customer has at least one saved address
- Verify the customer's email is verified
- Direct the customer to the checkout page
- Display a clear checkout flow with labeled steps: Address → Shipping → Payment → Confirm

THE checkout page SHALL display in a single-page application (SPA) format without full page reloads between steps.

IF a customer does not have a saved address, THEN THE system SHALL:
- Redirect to address management
- Allow customer to add a new address with inline form
- Validate address before allowing progression
- Return to checkout after address is saved and selected

IF a customer's email is not verified, THEN THE system SHALL:
- Display message: "Please verify your email address before continuing"
- Provide option to resend verification email
- Require customer to verify email before proceeding to payment step

THE checkout progress bar SHALL clearly show which step customer is on (e.g., "Step 1 of 4: Shipping Address").

### Step 1: Shipping Address Selection

WHEN a customer is on the shipping address step, THE system SHALL:
- Display their saved addresses as selectable options (radio buttons)
- Pre-select the default shipping address (if exists)
- Show address details for each saved option (address lines, city, postal code)
- Provide "Use Different Address" or "Add New Address" link/button

WHEN a customer selects a shipping address, THE system SHALL:
- Display the selected address for confirmation
- Calculate shipping costs based on the selected address
- Display estimated delivery date range (e.g., "Estimated delivery: 3-5 business days")
- Update the order total with shipping costs within 2 seconds
- Allow customer to proceed to shipping method selection or revise address

IF a customer chooses to add a new address during checkout, THE system SHALL:
- Display an address entry form with the same validation rules as address management
- Validate the address before allowing it to be saved and selected
- Provide options to save this address for future use and mark it as new default
- Allow the customer to mark this as their new default address (optional checkbox)
- Return to shipping address step with the new address pre-selected

THE address entry form during checkout SHALL include real-time validation for postal codes (format validation) and city names (spelling suggestions).

### Step 2: Shipping Method Selection

WHEN a customer proceeds to the shipping method step, THE system SHALL display available shipping options including:
- Shipping method name (e.g., "Standard Shipping", "Express Shipping", "Overnight Delivery")
- Estimated delivery timeline for each method (e.g., "3-5 business days", "1-2 business days")
- Shipping cost for each method (displayed prominently, e.g., "$5.99", "FREE")
- Estimated total cost with selected method (showing updated order total)
- Carrier information if available (e.g., "via FedEx")

WHEN a customer selects a shipping method, THE system SHALL:
- Update the estimated delivery date prominently
- Recalculate order total with the selected shipping cost within 1 second
- Display the updated total prominently
- Display a checkbox/confirmation of selected method
- Enable progression to payment step

THE system SHALL provide shipping method options based on:
- Destination address (different methods available for different regions)
- Products in the order (some items may not support certain shipping methods)
- Order weight or dimensions (if applicable)
- Carrier availability in the region

THE system SHALL calculate shipping costs using a shipping rate table or API integration with carrier services. IF real-time shipping rates cannot be obtained, THE system SHALL use estimated rates from rate tables and display disclaimer: "Final shipping cost will be confirmed after payment."

### Step 3: Payment Method Selection

WHEN a customer proceeds to the payment step, THE system SHALL display:
- Complete order summary with all items, quantities, and prices
- Shipping address (with option to change)
- Shipping method and cost (with option to change)
- Estimated delivery date
- Order subtotal
- Shipping cost
- Tax amount (if applicable)
- Order total (prominently displayed, larger font, different color)

WHEN a customer selects a payment method, THE system SHALL display available options:
- Credit/Debit Card (new or saved cards)
- Digital Payment (e.g., Apple Pay, Google Pay, if configured and browser supports)
- Bank Transfer (for eligible customers)
- Other available methods as configured by admin

FOR credit/debit card payments, THE system SHALL:
- Allow customers to save card for future use (with checkbox "Save card for future purchases")
- Display previously saved cards with masked numbers (e.g., "Visa ending in 4242")
- Allow selection of a saved card or entry of a new card
- Require CVV entry for every payment (security best practice) or skip CVV for tokenized cards
- Display card entry form with real-time validation for card number format

THE card entry form SHALL show:
- Card number field (accepts numbers and spaces, auto-formats)
- Card holder name
- Expiration date (MM/YY format with calendar picker)
- CVV (3 digits, masked input)

THE system SHALL encrypt and securely handle all payment information according to PCI DSS standards. THE payment information SHALL NEVER be stored in system database; only tokenized references are retained.

### Step 4: Order Review and Confirmation

BEFORE final order submission, THE system SHALL display a comprehensive order review containing:
- Order summary: all items with quantities, unit prices, and line totals
- Applied discounts or promotional codes (if any) with discount amounts shown
- Shipping address (with option to change)
- Shipping method and cost (with option to change)
- Estimated delivery date
- Billing address
- Payment method (masked card details or payment method type, NOT full details)
- Order subtotal
- Taxes and breakdown by category
- Shipping cost
- Total amount to be charged (prominently displayed in large font, bold)
- Return policy summary (link to full policy)
- Terms and conditions acknowledgment checkbox (required, pre-filled with instructions)
- Order confirmation button ("Place Order" or "Complete Purchase")

WHEN a customer reviews this information, THE system SHALL allow:
- Editing quantities (returns to cart with quantities pre-filled)
- Changing shipping address
- Changing shipping method (recalculates cost)
- Changing payment method
- Entering or applying promotional code (if not already applied)
- Applying promo code to recalculate total (within 1 second)

THE system SHALL require the customer to acknowledge terms and conditions before allowing order submission by checking the checkbox.

THE customer SHALL see warning message if changes are made after review step: "Order total has changed to $[NEW_TOTAL]. Please review before confirming."

### Order Placement and Submission

WHEN a customer clicks "Place Order" or "Complete Purchase", THE system SHALL:
- Validate all required information is complete (addresses, payment method, etc.)
- Verify inventory one final time for all items (within 1 second)
- Reserve inventory temporarily to prevent double-selling
- Process the payment with the payment processor (within 10 seconds)

IF payment is successful, THEN THE system SHALL:
- Create the order record with status "Confirmed"
- Release reserved inventory as "allocated to order"
- Send order confirmation email to customer within 5 minutes
- Redirect customer to order confirmation page
- Generate order number and display it prominently
- Notify seller(s) of new orders to fulfill

IF payment processing fails, THEN THE system SHALL:
- Display specific error message about payment failure
- Release any reserved inventory within 1 second
- Allow customer to try a different payment method
- Allow customer to return to cart without losing items
- Preserve cart state for 6 hours

THE system SHALL display error message: "[PAYMENT_ERROR_REASON]. Your payment was not processed. Please try again or use a different payment method."

### Order Confirmation and Receipt

AFTER an order is successfully placed, THE system SHALL:
- Display an order confirmation page showing:
  - Order number (unique identifier, e.g., "ORD-20250115-ABC123")
  - Order date and time
  - Complete order details (items, quantities, prices)
  - Shipping address
  - Shipping method and estimated delivery date
  - Total amount charged
  - Payment method used (masked)
  - Options to view order details, continue shopping, or access order tracking
  - Receipt download link (PDF format)

- Send order confirmation email containing:
  - Order number
  - Order date and time
  - Complete item list with prices
  - Shipping address
  - Estimated delivery date
  - Total amount charged and payment method used
  - Link to track order status
  - Customer service contact information
  - Return policy summary

- Create an order tracking record accessible via:
  - Order history in customer account
  - Direct order tracking link in confirmation email
  - Account dashboard showing recent orders

THE system SHALL store the complete order record for historical reference and customer support purposes indefinitely.

THE order confirmation email SHALL be sent within 5 minutes of order placement.

---

## Customer Cart and Checkout Business Rules

### Pricing and Tax Calculations

THE system SHALL calculate order totals as follows:
- Item Subtotal = Sum of (unit_price × quantity) for all items in cart
- Subtotal (after discounts) = Item Subtotal - Applicable Discounts
- Taxes = (Subtotal × applicable_tax_rate)
- Shipping Cost = Based on selected shipping method and destination
- Total = Subtotal + Taxes + Shipping - Gift Card Applied

THE order total calculation SHALL follow this formula in this exact sequence:
```
Order Total = ((Item Subtotal - Discounts) + Taxes) + Shipping
```

WHEN tax rates change for a customer's destination, THE system SHALL recalculate tax on the current order during checkout (up to the point of payment confirmation).

ONCE payment is confirmed, THE tax amount applied SHALL NOT change for that order, even if tax rates change system-wide.

### Inventory and Stock Validation

WHEN a customer adds items to cart, THE system SHALL check inventory against the cart item quantity and verify availability (no hold/reserve at this stage).

IF a customer's cart total exceeds available inventory for any item, THEN THE system SHALL:
- Display warning message during cart review
- Reduce the quantity in their cart to the maximum available
- Display message: "[Product Name] has been limited to [X] units available (requested [Y])"
- Require customer confirmation before proceeding to checkout

DURING checkout, THE system SHALL perform a final inventory check immediately before payment processing.

IF inventory is no longer available for any item, THEN THE system SHALL:
- Prevent order placement
- Display error message identifying which items are unavailable
- Offer options to remove unavailable items and resubmit order, or modify quantities

### Order Data Validation

BEFORE accepting an order submission, THE system SHALL validate within 2 seconds:
- All required fields are completed (no null/empty values)
- Shipping address contains valid data (street, city, postal code, country)
- Payment information is properly formatted and valid
- Order contains at least one item with positive quantity
- Item quantities are positive integers
- All prices and totals are calculated correctly
- Inventory is available for all items
- Seller accounts are active (not suspended or deactivated)
- Customer email is verified

IF any validation fails, THEN THE system SHALL display specific error messages and prevent order submission.

### Concurrent Order Processing

IF multiple customers attempt to order the same product simultaneously and inventory is limited, THE system SHALL:
- Reserve inventory on a first-come, first-served basis (processed at database commit time)
- Process orders in the sequence they reach payment confirmation
- Deny orders from subsequent customers with message: "Insufficient inventory available. Only [X] units in stock."
- Allow denied customers to modify quantity or remove item and resubmit

### Session and Cart Timeout

THE system SHALL maintain active cart sessions for 30 days of inactivity (based on last cart modification or view time).

IF a customer has not accessed their cart for 30 days, THE system MAY:
- Clear the shopping cart automatically
- Send notification before clearing (at day 25) with option to restore cart
- Allow customer to restore cart from email notification within 7 days of clearing

THE system SHALL NOT expire carts during active browsing sessions (sessions renewed on every page view).

IF a session expires, THE system SHALL preserve cart contents server-side and restore upon customer login.

---

## Customer Support and Error Handling

### Error Messages and User Guidance

WHEN customers encounter errors during shopping or checkout, THE system SHALL display:
- Clear, friendly error messages in plain language (not technical jargon)
- Specific information about what went wrong
- Suggested actions to resolve the issue
- Contact support link if error cannot be resolved by customer
- Error code reference (for support team to look up)

Examples of customer-facing error messages:
- "Payment declined by your bank. Please verify your card details or try a different payment method."
- "This item is no longer available. We've removed it from your cart. Check out similar items instead?"
- "Your session has expired for security. Please log in again to continue."
- "Address validation failed. Please check the postal code format for [Country]."

THE system SHALL NEVER display technical error details (stack traces, SQL errors, etc.) to customers.

### Customer Communication

WHEN significant events occur in the customer's shopping journey, THE system SHALL send notifications via customer-preferred channels (email, SMS, push):
- Order confirmation (email - sent within 5 minutes)
- Payment receipt (email - sent within 5 minutes)
- Order shipped with tracking (email + SMS if opted-in)
- Out for delivery today (SMS + push notification if opted-in)
- Delivery completed (email + SMS if opted-in)
- Delivery failed or exception (email + SMS)
- Review reminder after delivery (email - sent 1 day after delivery, optional)
- Wishlist item back in stock (email if opted-in)
- Price drop for wishlist items (email if opted-in)

THE system SHALL allow customers to manage notification preferences by:
- Notification type (granular control per notification type)
- Communication channel (email, SMS, push notification)
- Frequency (daily digest, real-time, weekly summary)

THE customer SHALL be able to opt-out of all non-transactional notifications while maintaining transactional emails (order confirmation, payment receipt, shipping updates).

---

## Integration with Other System Components

### Integration with Product Catalog System

This customer experience document works in conjunction with [Product Catalog and Inventory](./04-product-catalog-and-inventory.md):
- Product availability in cart and checkout is determined by real-time inventory data from the catalog system
- Pricing displayed in cart reflects current product pricing from catalog
- Product filtering and search rely on catalog categorization and metadata
- Variant selection during cart addition uses product variant definitions from catalog
- Stock status indicators update in real-time as inventory changes in catalog system

### Integration with Authentication System

This document relies on authentication flows defined in [User Actors and Authentication](./02-user-actors-and-authentication.md):
- Customer session management and JWT token validation for cart access
- Permission checking for cart and order access (verified customer check)
- Secure payment information handling per authentication and PCI standards
- Email verification requirements before order placement

### Integration with Order Processing

Customer checkout process directly feeds into [Payment and Order Processing](./06-payment-and-order-processing.md):
- Order data created during checkout is used for order creation in payment module
- Payment processing step integrates with payment processor
- Order confirmation initiates order fulfillment workflows
- Tax and discount calculations follow business rules from payment module

---

## Performance and Non-Functional Requirements

### Response Time Expectations

WHEN a customer performs the following actions, THE system SHALL respond within specified timeframes:
- Adding item to cart: Within 1 second
- Viewing shopping cart page: Within 2 seconds
- Updating cart quantities: Within 2 seconds
- Displaying checkout page: Within 2.5 seconds
- Processing payment and confirming order: Within 10 seconds (may vary by payment processor)
- Displaying order confirmation page: Immediately after successful payment (within 5 seconds)

THE system SHALL display loading indicators to customers when operations take longer than 1 second.

### Data Persistence and Reliability

THE system SHALL:
- Persist cart data reliably across sessions
- Preserve order data permanently for historical records
- Maintain data consistency between cart and inventory systems
- Prevent data loss during payment processing
- Maintain ACID compliance for all financial transactions
- Implement automatic backup and disaster recovery procedures

### Scalability Requirements

THE system SHALL handle:
- Thousands of concurrent customers browsing products
- Hundreds of simultaneous cart updates without data loss
- Hundreds of concurrent order placements without duplicate orders or inventory issues
- Inventory updates across all products without customer-facing delays
- Peak traffic periods (e.g., holiday shopping seasons) with response times remaining within SLAs

---

## Summary

The customer user experience defines a complete, seamless shopping journey from account creation through order confirmation. By implementing these requirements, the platform will provide customers with:

- Easy account and address management for personalized shopping
- Powerful product discovery through browsing, filtering, and search
- Convenient cart and wishlist management with persistent state
- Secure, intuitive checkout process with multiple address and payment options
- Clear order confirmation and visibility into their purchase status
- Exceptional support and communication throughout their shopping journey

These customer-facing features work together to support the business model of the shopping mall platform by enabling customers to easily find products, make purchasing decisions, and complete transactions with confidence and convenience.

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*