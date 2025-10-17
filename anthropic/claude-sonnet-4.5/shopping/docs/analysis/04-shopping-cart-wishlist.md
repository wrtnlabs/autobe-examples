
# Shopping Cart & Wishlist Requirements

## 1. Introduction and Overview

### 1.1 Purpose

This document defines the complete business requirements for the shopping cart and wishlist functionality of the e-commerce shopping mall platform. These features are critical pre-purchase tools that enable customers to collect, organize, and manage products they intend to buy or save for future consideration.

### 1.2 Business Objectives

The shopping cart and wishlist features serve the following business objectives:

- **Conversion Optimization**: Provide a seamless path from product browsing to purchase
- **Customer Engagement**: Enable customers to save and organize products of interest
- **Revenue Growth**: Facilitate impulse purchases and planned shopping through wishlist management
- **User Retention**: Persist user preferences and shopping intent across sessions
- **Multi-Vendor Support**: Handle products from multiple sellers within a single shopping experience

### 1.3 User Experience Goals

- Customers can quickly add products to their cart during browsing
- Customers can save products to their wishlist for future consideration
- Customers receive real-time feedback on pricing, availability, and inventory status
- Customers can seamlessly move items between cart and wishlist
- Customers experience consistent cart and wishlist state across devices and sessions

## 2. Shopping Cart Functionality

### 2.1 Cart Creation and Initialization

#### 2.1.1 Guest User Cart Creation

**WHEN** a guest user first adds a product to their cart, **THE system SHALL** create a temporary cart session identified by a unique session token.

**WHEN** a guest user returns to the platform within 30 days, **THE system SHALL** restore their cart using the session token stored in browser storage.

**THE system SHALL** expire guest user carts after 30 days of inactivity.

#### 2.1.2 Authenticated User Cart Creation

**WHEN** an authenticated user first adds a product to their cart, **THE system SHALL** create a persistent cart associated with their user account.

**THE system SHALL** maintain authenticated user carts indefinitely until explicitly cleared by the user or checkout completion.

### 2.2 Adding Products to Cart

#### 2.2.1 Standard Product Addition

**WHEN** a customer selects "Add to Cart" for a product with a specific SKU (color, size, option combination), **THE system SHALL** add the selected SKU to the customer's cart with quantity 1.

**WHEN** a customer adds a product SKU that already exists in their cart, **THE system SHALL** increase the quantity of that cart item by 1.

**WHEN** a customer adds a product to cart, **THE system SHALL** validate that the selected SKU is currently available and in stock.

**IF** the selected SKU is out of stock, **THEN THE system SHALL** prevent the addition and display an error message "This product variant is currently out of stock."

**IF** the selected SKU has insufficient stock for the requested quantity, **THEN THE system SHALL** prevent the addition and display the message "Only [available_quantity] items available."

#### 2.2.2 Quantity Specification

**WHEN** a customer adds a product to cart with a specified quantity, **THE system SHALL** add the exact quantity requested.

**THE system SHALL** enforce a maximum quantity limit of 99 items per cart item.

**IF** a customer attempts to add a quantity that exceeds available stock, **THEN THE system SHALL** add only the available quantity and notify the customer "Only [available_quantity] items added to cart due to stock limitations."

#### 2.2.3 Cart Item Information

**THE system SHALL** store the following information for each cart item:
- Product ID
- SKU ID (specific variant)
- Product name
- SKU attributes (color, size, options)
- Seller ID
- Quantity
- Unit price at time of addition
- Product image URL
- Cart item creation timestamp

### 2.3 Removing Products from Cart

**WHEN** a customer selects "Remove" for a cart item, **THE system SHALL** immediately delete that item from the cart.

**WHEN** a cart item is removed, **THE system SHALL** update the cart totals and item count in real-time.

**WHEN** the last item is removed from a cart, **THE system SHALL** display an empty cart message "Your cart is empty. Start shopping to add items!"

### 2.4 Updating Quantities

#### 2.4.1 Quantity Increase

**WHEN** a customer increases the quantity of a cart item, **THE system SHALL** validate that sufficient stock exists for the new quantity.

**IF** sufficient stock exists, **THEN THE system SHALL** update the cart item quantity and recalculate totals.

**IF** insufficient stock exists, **THEN THE system SHALL** prevent the update and display "Only [available_quantity] items available in stock."

#### 2.4.2 Quantity Decrease

**WHEN** a customer decreases the quantity of a cart item to a value greater than 0, **THE system SHALL** update the quantity and recalculate totals.

**WHEN** a customer decreases the quantity of a cart item to 0, **THE system SHALL** remove the item from the cart.

#### 2.4.3 Direct Quantity Entry

**WHEN** a customer manually enters a quantity value, **THE system SHALL** validate the input is a positive integer between 1 and 99.

**IF** the entered quantity exceeds available stock, **THEN THE system SHALL** adjust to the maximum available quantity and notify the customer.

### 2.5 Cart Item Display Requirements

**THE system SHALL** display the following information for each cart item:
- Product image
- Product name
- SKU attributes (color, size, options)
- Seller name
- Unit price
- Quantity selector
- Line total (unit price × quantity)
- Stock status indicator
- Remove button

**THE system SHALL** group cart items by seller to facilitate multi-seller order processing.

**THE system SHALL** display cart items in reverse chronological order (most recently added first).

### 2.6 Multi-Seller Cart Handling

**WHEN** a customer's cart contains items from multiple sellers, **THE system SHALL** visually group items by seller.

**THE system SHALL** display each seller's subtotal separately.

**THE system SHALL** calculate a grand total that includes all sellers' items.

**THE system SHALL** indicate to the customer that their order will be split into multiple shipments (one per seller).

## 3. Cart Persistence and Synchronization

### 3.1 Guest User Cart Persistence

**THE system SHALL** store guest user cart data in browser local storage.

**THE system SHALL** generate a unique session token for each guest cart.

**WHEN** a guest user closes their browser and returns within 30 days, **THE system SHALL** restore their cart contents.

**THE system SHALL** automatically delete guest cart data after 30 days of no activity.

### 3.2 Authenticated User Cart Persistence

**THE system SHALL** store authenticated user cart data in the database associated with their user account.

**THE system SHALL** persist authenticated user carts across all devices and browsers.

**THE system SHALL** maintain cart data until the user explicitly clears their cart or completes checkout.

### 3.3 Cart Merge on Login

**WHEN** a guest user with cart items logs in or registers, **THE system SHALL** merge their guest cart with their authenticated user cart.

**IF** the same SKU exists in both carts, **THEN THE system SHALL** combine the quantities up to the maximum stock availability.

**IF** combined quantities exceed stock availability, **THEN THE system SHALL** set the quantity to the maximum available and notify the user.

**WHEN** cart merge is complete, **THE system SHALL** delete the guest cart session.

### 3.4 Cross-Device Synchronization

**WHEN** an authenticated user adds items to cart on one device, **THE system SHALL** immediately reflect those changes when the user accesses their cart on another device.

**THE system SHALL** synchronize cart updates across all active user sessions within 2 seconds.

### 3.5 Cart Expiration Policies

**THE system SHALL** expire guest user carts after 30 days of inactivity.

**THE system SHALL** NOT expire authenticated user carts based on time.

**WHEN** a product in a cart is permanently deleted by the seller or admin, **THE system SHALL** automatically remove that item from all carts containing it.

**WHEN** a cart item is removed due to product deletion, **THE system SHALL** notify the user "An item in your cart is no longer available and has been removed."

## 4. Wishlist Functionality

### 4.1 Wishlist Overview

**THE system SHALL** provide wishlist functionality exclusively to authenticated users.

**WHEN** a guest user attempts to add an item to wishlist, **THE system SHALL** prompt them to log in or register.

### 4.2 Adding Products to Wishlist

**WHEN** an authenticated customer selects "Add to Wishlist" for a product with a specific SKU, **THE system SHALL** add that SKU to their wishlist.

**WHEN** a customer adds a product SKU that already exists in their wishlist, **THE system SHALL** display the message "This item is already in your wishlist."

**IF** a product is out of stock, **THE system SHALL** still allow customers to add it to their wishlist.

**THE system SHALL** allow customers to add products to wishlist from product detail pages, search results, and category pages.

### 4.3 Wishlist Item Information

**THE system SHALL** store the following information for each wishlist item:
- Product ID
- SKU ID (specific variant)
- Product name
- SKU attributes (color, size, options)
- Seller ID
- Current price
- Product image URL
- Date added to wishlist
- Stock availability status

### 4.4 Removing Products from Wishlist

**WHEN** a customer selects "Remove" for a wishlist item, **THE system SHALL** immediately delete that item from the wishlist.

**WHEN** a wishlist item is removed, **THE system SHALL** update the wishlist item count.

### 4.5 Wishlist Organization

**THE system SHALL** display wishlist items in reverse chronological order (most recently added first).

**THE system SHALL** allow customers to view all wishlist items on a dedicated wishlist page.

**THE system SHALL** display the current price and stock status for each wishlist item.

### 4.6 Wishlist Privacy Settings

**THE system SHALL** keep customer wishlists private by default.

**THE system SHALL** NOT allow other users to view a customer's wishlist.

### 4.7 Wishlist Persistence

**THE system SHALL** persist wishlist data indefinitely for authenticated users.

**WHEN** a product in a wishlist is permanently deleted, **THE system SHALL** automatically remove that item from all wishlists containing it.

## 5. Cart and Wishlist Interaction

### 5.1 Moving Items from Wishlist to Cart

**WHEN** a customer selects "Add to Cart" for a wishlist item, **THE system SHALL** add that item to the cart with quantity 1.

**WHEN** an item is successfully added to cart from wishlist, **THE system SHALL** keep the item in the wishlist (not remove it).

**IF** the wishlist item is out of stock, **THEN THE system SHALL** prevent adding to cart and display "This item is currently out of stock."

### 5.2 Moving Items from Cart to Wishlist

**WHEN** a customer selects "Move to Wishlist" for a cart item, **THE system SHALL** add that SKU to the wishlist and remove it from the cart.

**IF** the SKU already exists in the wishlist, **THEN THE system SHALL** remove the item from cart without creating a duplicate in the wishlist.

### 5.3 Simultaneous Presence

**THE system SHALL** allow the same product SKU to exist in both cart and wishlist simultaneously.

**WHEN** a customer adds a wishlist item to cart, **THE system SHALL** NOT automatically remove it from the wishlist.

### 5.4 Bulk Operations

**WHEN** a customer selects "Add All to Cart" from their wishlist, **THE system SHALL** add all available (in-stock) wishlist items to the cart.

**IF** any wishlist items are out of stock, **THEN THE system SHALL** add only the available items and display "Some items could not be added due to stock unavailability."

## 6. Price Calculations and Updates

### 6.1 Real-Time Price Updates

**WHEN** a cart item's price changes due to seller updates, **THE system SHALL** update the cart item price to reflect the current product price.

**WHEN** a price change affects cart items, **THE system SHALL** display a notification "Prices for some items in your cart have changed."

**THE system SHALL** recalculate cart totals in real-time whenever item prices change.

### 6.2 Promotional Pricing Application

**IF** a promotional discount applies to a product in cart, **THEN THE system SHALL** display both the original price and discounted price.

**THE system SHALL** calculate line totals using the discounted price when applicable.

**WHEN** a promotional discount expires while a product is in cart, **THE system SHALL** update to the regular price and notify the customer.

### 6.3 Cart Total Calculations

**THE system SHALL** calculate the following totals for the shopping cart:

- **Subtotal**: Sum of all line totals (unit price × quantity) before taxes and shipping
- **Seller Subtotals**: Subtotal for each seller's items separately
- **Estimated Tax**: Tax calculation based on customer's delivery address (if available)
- **Estimated Shipping**: Shipping cost estimation per seller (if delivery address available)
- **Grand Total**: Subtotal + Tax + Shipping

**WHEN** no delivery address is available, **THE system SHALL** display "Tax and shipping will be calculated at checkout."

### 6.4 Price Display Format

**THE system SHALL** display all prices in the customer's selected currency.

**THE system SHALL** format prices with two decimal places (e.g., $99.99).

**THE system SHALL** clearly distinguish between regular prices, sale prices, and promotional prices.

### 6.5 Currency Handling

**THE system SHALL** support multiple currencies based on customer locale.

**THE system SHALL** display currency symbols appropriate to the selected currency (e.g., $, €, £, ¥).

**WHEN** a customer changes their currency preference, **THE system SHALL** convert all cart prices to the newly selected currency.

### 6.6 Multi-Seller Total Calculations

**WHEN** cart items are from multiple sellers, **THE system SHALL** calculate subtotals for each seller separately.

**THE system SHALL** estimate shipping costs per seller as shipping will be handled by each seller independently.

**THE system SHALL** display a breakdown showing each seller's subtotal, their shipping cost, and the combined grand total.

## 7. Stock Availability Checks

### 7.1 Real-Time Inventory Validation

**WHEN** a customer views their cart, **THE system SHALL** validate the current stock availability for all cart items.

**THE system SHALL** check inventory status against the specific SKU for each cart item.

**THE system SHALL** update stock status indicators in real-time without requiring page refresh.

### 7.2 Out-of-Stock Handling

**WHEN** a cart item becomes out of stock, **THE system SHALL** display a clear "Out of Stock" indicator on that item.

**WHEN** a cart contains out-of-stock items, **THE system SHALL** prevent the customer from proceeding to checkout.

**THE system SHALL** display a message "Some items in your cart are out of stock. Please remove them to continue."

**THE system SHALL** provide a "Remove Out-of-Stock Items" button to quickly clear unavailable items.

### 7.3 Low Stock Warnings

**WHEN** a cart item has fewer than 10 units remaining in stock, **THE system SHALL** display a low stock warning "Only [quantity] left in stock."

**WHEN** a cart item quantity exceeds available stock, **THE system SHALL** display an error "Only [available_quantity] available" and prevent checkout.

### 7.4 Stock Reservation During Checkout

**WHEN** a customer proceeds to checkout, **THE system SHALL** temporarily reserve the cart item quantities in inventory for 15 minutes.

**WHEN** the reservation period expires without order completion, **THE system SHALL** release the reserved inventory back to available stock.

**WHEN** an order is successfully placed, **THE system SHALL** permanently deduct the quantities from available inventory.

### 7.5 Multi-SKU Availability Checks

**WHEN** a product has multiple SKUs in the cart (different sizes/colors), **THE system SHALL** check inventory availability for each SKU independently.

**THE system SHALL** allow some SKUs to be available while others are out of stock within the same product.

### 7.6 Availability Notifications

**WHEN** an out-of-stock cart item becomes available again, **THE system SHALL** send a notification to the customer "An item in your cart is now back in stock!"

**WHEN** a wishlist item comes back in stock, **THE system SHALL** send a notification "Good news! [Product Name] is back in stock."

## 8. Business Rules and Validation

### 8.1 Quantity Limits

**THE system SHALL** enforce a minimum quantity of 1 for all cart items.

**THE system SHALL** enforce a maximum quantity of 99 per cart item.

**THE system SHALL** limit the total number of distinct items (unique SKUs) in a cart to 100.

**IF** a customer attempts to add more than 100 distinct items, **THEN THE system SHALL** prevent the addition and display "Cart limit reached. Maximum 100 different items allowed."

### 8.2 Product Availability Rules

**WHEN** a product is marked as discontinued by the seller, **THE system SHALL** allow it to remain in carts but prevent new additions.

**WHEN** a product is completely deleted from the system, **THE system SHALL** automatically remove it from all carts and wishlists.

**THE system SHALL** allow customers to add out-of-stock products to wishlists but NOT to carts.

### 8.3 Cart Item Validation

**WHEN** a customer proceeds to checkout, **THE system SHALL** validate all cart items:
- All products are active and available
- All SKUs exist and are not deleted
- Requested quantities are available in stock
- Sellers are active and not suspended
- Prices are current and valid

**IF** any validation fails, **THEN THE system SHALL** prevent checkout and display specific error messages for each failed item.

### 8.4 Wishlist Constraints

**THE system SHALL** limit wishlists to 500 items per customer.

**IF** a customer attempts to add more than 500 items to wishlist, **THEN THE system SHALL** prevent the addition and display "Wishlist limit reached. Remove items to add new ones."

**THE system SHALL** allow duplicate products in wishlist only if they represent different SKUs (variants).

### 8.5 Price Validation Rules

**WHEN** a cart item price changes by more than 20% from the original added price, **THE system SHALL** display a prominent price change alert.

**THE system SHALL** prevent checkout if any cart item price has increased by more than 50% until the customer acknowledges the price change.

### 8.6 Seller Account Status Rules

**WHEN** a seller account is suspended, **THE system SHALL** mark all their products in carts as unavailable.

**WHEN** a seller account is reactivated, **THE system SHALL** restore availability for their products in carts (subject to inventory availability).

**THE system SHALL** display a message "This item is temporarily unavailable" for products from suspended sellers.

## 9. User Notifications and Feedback

### 9.1 Immediate Feedback Messages

**WHEN** a customer adds an item to cart, **THE system SHALL** display a success message "Added to cart" with a thumbnail image of the product.

**WHEN** a customer adds an item to wishlist, **THE system SHALL** display a success message "Added to wishlist."

**WHEN** a customer removes an item, **THE system SHALL** display a confirmation message "Item removed."

### 9.2 Price Change Notifications

**WHEN** a cart item price decreases, **THE system SHALL** display a positive notification "Good news! [Product Name] price has dropped to [new_price]."

**WHEN** a cart item price increases, **THE system SHALL** display a warning notification "Price updated: [Product Name] is now [new_price]."

### 9.3 Stock Availability Alerts

**WHEN** a cart item's stock level drops below the customer's requested quantity, **THE system SHALL** alert the customer immediately with "Stock update: Only [available_quantity] of [Product Name] remaining."

**WHEN** a cart item becomes out of stock, **THE system SHALL** send an email notification to the customer within 1 hour.

### 9.4 Wishlist Item Back-in-Stock Notifications

**WHEN** a wishlist item comes back in stock, **THE system SHALL** send a notification to the customer within 15 minutes.

**THE system SHALL** send back-in-stock notifications via email and in-app notification.

**THE system SHALL** include a direct link to add the item to cart in the notification.

### 9.5 Cart Abandonment Reminders

**WHEN** an authenticated customer has items in their cart for more than 24 hours without checkout, **THE system SHALL** send a cart reminder email.

**THE system SHALL** send a maximum of 2 cart abandonment reminders (at 24 hours and 72 hours).

**THE system SHALL** include cart contents and direct checkout link in reminder emails.

### 9.6 Promotional Expiration Warnings

**WHEN** a promotional discount on a cart item will expire within 24 hours, **THE system SHALL** display an urgency message "Sale ends soon! [Discount] expires in [time_remaining]."

## 10. Performance Requirements

### 10.1 Response Time Expectations

**THE system SHALL** complete cart item additions within 1 second under normal load conditions.

**THE system SHALL** update cart quantities and recalculate totals within 500 milliseconds.

**THE system SHALL** load cart contents and display to customer within 2 seconds.

**THE system SHALL** synchronize cart data across devices within 2 seconds of any change.

### 10.2 Real-Time Update Requirements

**THE system SHALL** check stock availability in real-time during cart operations (add, update, view).

**THE system SHALL** update prices in real-time when customer views their cart.

**THE system SHALL** reflect inventory changes immediately when stock levels change.

### 10.3 Scalability Considerations

**THE system SHALL** handle concurrent cart operations from the same user across multiple devices without data loss.

**THE system SHALL** support at least 10,000 concurrent users adding items to cart simultaneously.

**THE system SHALL** maintain response time performance during peak shopping periods (sales events, holidays).

### 10.4 Data Consistency Requirements

**THE system SHALL** ensure cart data consistency across all user sessions within 2 seconds.

**THE system SHALL** prevent race conditions when the same user modifies cart from multiple devices simultaneously.

**WHEN** conflicting cart operations occur, **THE system SHALL** apply the most recent operation based on timestamp.

## 11. Error Scenarios and Handling

### 11.1 Product Unavailability Errors

**IF** a customer attempts to add a deleted product to cart, **THEN THE system SHALL** display "This product is no longer available."

**IF** a customer attempts to add a product with invalid SKU, **THEN THE system SHALL** display "Product variant not found. Please select valid options."

### 11.2 Stock Insufficient Errors

**IF** requested quantity exceeds available stock during add to cart, **THEN THE system SHALL** add maximum available quantity and notify "Only [available_quantity] items added."

**IF** stock becomes insufficient after item is already in cart, **THEN THE system SHALL** reduce cart quantity to available stock and notify customer.

### 11.3 Session and Authentication Errors

**IF** a guest user's session expires, **THE system SHALL** restore cart from browser storage when session is reestablished.

**IF** an authenticated user's session expires during cart operations, **THE system SHALL** prompt re-authentication and preserve cart state.

### 11.4 Price Validation Errors

**IF** a cart item price cannot be retrieved, **THEN THE system SHALL** display "Price unavailable" and prevent checkout until resolved.

**IF** price data is corrupted, **THEN THE system SHALL** refresh price from current product data.

### 11.5 Network and Connectivity Errors

**IF** network connection is lost during cart update, **THE system SHALL** queue the operation and retry when connection is restored.

**IF** cart synchronization fails, **THE system SHALL** display "Cart sync failed. Please refresh to see latest updates."

### 11.6 Seller Account Errors

**IF** a seller account is suspended while their products are in customer carts, **THEN THE system SHALL** mark those items as unavailable and notify affected customers.

**IF** a seller is permanently banned, **THEN THE system SHALL** remove their products from all carts and send notifications to affected customers.

## 12. Integration Points

### 12.1 Product Catalog Integration

**THE system SHALL** retrieve real-time product information (name, price, images, SKU details) from the product catalog system.

**THE system SHALL** validate product and SKU existence against the product catalog before adding to cart.

### 12.2 Inventory Management Integration

**THE system SHALL** check real-time inventory levels from the inventory management system for all cart operations.

**THE system SHALL** reserve inventory in the inventory management system when customers proceed to checkout.

### 12.3 User Authentication Integration

**THE system SHALL** retrieve user identity and session information from the authentication system.

**THE system SHALL** associate carts with authenticated user accounts.

### 12.4 Pricing and Promotion Integration

**THE system SHALL** retrieve current pricing and active promotions from the pricing system.

**THE system SHALL** apply applicable discounts based on promotion rules.

### 12.5 Notification Service Integration

**THE system SHALL** send cart-related notifications (stock alerts, price changes, abandonment reminders) through the notification service.

**THE system SHALL** trigger email and in-app notifications based on cart events.

## 13. Accessibility and User Experience

### 13.1 Cart Visibility

**THE system SHALL** display the current cart item count in the header navigation on all pages.

**THE system SHALL** provide a mini-cart preview accessible from any page showing the most recent cart items.

**WHEN** a customer hovers over or clicks the cart icon, **THE system SHALL** display a quick cart preview with item count, subtotal, and checkout button.

### 13.2 Visual Feedback

**THE system SHALL** provide immediate visual confirmation when items are added to cart or wishlist.

**THE system SHALL** use color-coded indicators for stock status (green=in stock, yellow=low stock, red=out of stock).

**THE system SHALL** highlight price changes with clear visual indicators (green for decreases, red for increases).

### 13.3 Mobile Responsiveness

**THE system SHALL** provide fully functional cart and wishlist features on mobile devices.

**THE system SHALL** optimize cart and wishlist interfaces for touch interactions.

**THE system SHALL** maintain cart synchronization between mobile and desktop experiences.

### 13.4 Accessibility Features

**THE system SHALL** provide clear text labels for all cart and wishlist actions.

**THE system SHALL** ensure cart and wishlist features are keyboard navigable.

**THE system SHALL** provide appropriate ARIA labels for screen reader compatibility.

## 14. Business Analytics and Tracking

### 14.1 Cart Analytics

**THE system SHALL** track the following cart metrics for business analysis:
- Cart creation rate
- Cart abandonment rate
- Average cart value
- Average items per cart
- Cart-to-checkout conversion rate
- Time spent in cart before checkout

### 14.2 Wishlist Analytics

**THE system SHALL** track the following wishlist metrics:
- Wishlist creation rate
- Wishlist-to-cart conversion rate
- Most wishlisted products
- Wishlist item dwell time
- Back-in-stock notification effectiveness

### 14.3 Product Performance Tracking

**THE system SHALL** track how often each product is added to cart.

**THE system SHALL** track how often each product is added to wishlist.

**THE system SHALL** identify products frequently removed from cart before checkout.

---

## Document Relationships

This document defines business requirements for shopping cart and wishlist functionality. For complete system understanding, refer to:

- **[User Roles & Authentication](./02-user-roles-authentication.md)**: User role definitions and authentication requirements that govern cart and wishlist access
- **[Product Catalog Management](./03-product-catalog-management.md)**: Product and SKU structure that cart and wishlist items reference
- **[Order Placement & Checkout](./05-order-placement-checkout.md)**: Checkout process that consumes shopping cart data
- **[Business Rules & Workflows](./10-business-rules-workflows.md)**: Comprehensive business rules including cart and wishlist validations
