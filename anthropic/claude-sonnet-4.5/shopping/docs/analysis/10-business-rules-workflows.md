
# Business Rules and Workflows

## Overview and Purpose

This document provides the complete specification of business rules, validation requirements, workflow processes, and performance expectations that govern the e-commerce shopping mall platform's operation. All requirements are written in natural language focusing on business logic and user needs, without prescribing technical implementation details.

This serves as the authoritative reference for backend developers to understand what the system should do, the business constraints it must satisfy, and how users expect the system to behave.

## Product Management Business Rules

### Product Creation and Validation Rules

#### Product Information Requirements

**THE system SHALL require the following mandatory information when creating a product:**
- Product name (minimum 3 characters, maximum 200 characters)
- Product description (minimum 20 characters, maximum 5000 characters)
- At least one product category assignment
- At least one product image
- Base price (must be a positive number greater than zero)
- At least one product variant (SKU)

**WHEN a seller attempts to create a product with incomplete mandatory information, THE system SHALL reject the creation and display specific error messages indicating which fields are missing.**

**THE system SHALL validate product names to prevent:**
- Duplicate product names within the same seller's catalog
- Use of prohibited words or offensive language
- Special characters that could cause display issues (only alphanumeric, spaces, hyphens, and basic punctuation allowed)

**THE system SHALL validate product descriptions to:**
- Ensure minimum content quality (at least 20 characters of meaningful text)
- Prevent spam patterns (excessive repetition, all caps, excessive punctuation)
- Block contact information in descriptions (phone numbers, email addresses, external URLs)

**THE system SHALL validate product images to ensure:**
- Accepted formats only (JPEG, PNG, WebP)
- Maximum file size of 5MB per image
- Minimum resolution of 800x800 pixels
- Maximum of 10 images per product

#### Product Pricing Rules

**THE system SHALL enforce the following pricing rules:**
- All prices must be positive numbers greater than zero
- Prices must be specified with maximum two decimal places
- Minimum product price: $0.01
- Maximum product price: $999,999.99

**WHEN a seller updates a product price, THE system SHALL:**
- Apply the new price to all future orders immediately
- Preserve original prices for existing orders and carts
- Update shopping carts with the new price and notify customers of price changes when they view their cart

**IF a product has active promotional pricing, THEN THE system SHALL:**
- Display both original price and promotional price to customers
- Automatically apply promotional price at checkout
- Revert to original price when promotion period expires
- Validate that promotional price is lower than original price

### Product Variant (SKU) Rules

#### SKU Creation and Management

**THE system SHALL require each product to have at least one SKU variant.**

**WHEN creating product variants, THE system SHALL support the following variant types:**
- Color variations
- Size variations
- Material variations
- Custom option variations (seller-defined attributes)

**THE system SHALL enforce unique SKU identifiers by:**
- Automatically generating SKU codes combining product ID and variant attributes
- Preventing duplicate SKU codes within the entire platform
- Validating SKU code format (alphanumeric, hyphens, underscores only)

**WHEN a seller creates a product variant, THE system SHALL require:**
- Variant name or combination of attributes (e.g., "Red - Large")
- Individual SKU price (can differ from base product price)
- Initial inventory quantity (must be zero or positive integer)
- Optional variant-specific images

**THE system SHALL allow sellers to:**
- Add new variants to existing products at any time
- Disable variants without deleting them (preserve order history)
- Update variant prices independently
- Set different inventory levels for each variant

#### Variant Pricing Rules

**WHEN a product has multiple variants with different prices, THE system SHALL:**
- Display the price range on product listing pages (e.g., "$29.99 - $49.99")
- Display the specific variant price when a customer selects a variant
- Use the selected variant's price in cart calculations

**THE system SHALL validate that:**
- Variant prices are positive numbers greater than zero
- Variant price differences are reasonable (no variant exceeds 10x the base price)
- At least one variant is available for purchase (not all variants disabled)

### Product Status Lifecycle Rules

#### Product Status States

**THE system SHALL support the following product status states:**
- **Draft**: Product is being created, not visible to customers
- **Active**: Product is published and visible to customers
- **Inactive**: Product is temporarily hidden from customers but not deleted
- **Out of Stock**: All variants have zero inventory
- **Discontinued**: Product is permanently removed from active catalog but preserved for order history

#### Status Transition Rules

**WHEN a seller first creates a product, THE system SHALL set the status to "Draft".**

**THE system SHALL allow status transitions as follows:**
- Draft → Active (when seller publishes the product)
- Active → Inactive (when seller temporarily hides product)
- Active → Out of Stock (automatically when all variants reach zero inventory)
- Inactive → Active (when seller re-publishes product)
- Out of Stock → Active (automatically when inventory is replenished)
- Any status → Discontinued (when seller permanently removes product)

**THE system SHALL NOT allow:**
- Deletion of products that have order history
- Reactivation of discontinued products (create new product instead)
- Publishing products with zero available inventory across all variants

**WHEN a product status changes to "Out of Stock", THE system SHALL:**
- Notify the seller immediately
- Display "Out of Stock" badge on product pages
- Prevent customers from adding the product to cart
- Retain the product in customer wishlists with out-of-stock indication

**WHEN inventory is replenished for an out-of-stock product, THE system SHALL:**
- Automatically change status from "Out of Stock" to "Active"
- Notify customers who have the product in their wishlist
- Allow purchases to resume immediately

### Category Assignment Rules

**THE system SHALL require every product to be assigned to at least one category.**

**THE system SHALL support hierarchical category structures with:**
- Top-level categories (e.g., "Electronics", "Clothing", "Home & Garden")
- Subcategories up to 3 levels deep
- Multiple category assignments per product (maximum 5 categories)

**WHEN a seller assigns products to categories, THE system SHALL:**
- Validate that selected categories are active and exist
- Prevent assignment to placeholder or system-reserved categories
- Allow assignment to leaf categories (final level) only, not parent categories

**THE system SHALL automatically categorize products as:**
- "New Arrivals" for products published within the last 30 days
- "Best Sellers" for products with high sales volume in the last 90 days
- "Top Rated" for products with average rating ≥ 4.5 stars and minimum 10 reviews

## Inventory Management Business Rules

### Stock Level Rules

#### Inventory Tracking Requirements

**THE system SHALL track inventory at the SKU level, not at the product level.**

**WHEN inventory is tracked for a SKU, THE system SHALL maintain:**
- Current available quantity (integer, cannot be negative)
- Reserved quantity (items in active carts and pending orders)
- Total quantity (available + reserved)
- Sold quantity (lifetime cumulative sales)

**THE system SHALL calculate available inventory as:**
- Available Inventory = Total Inventory - Reserved Inventory - Sold Inventory

**WHEN a customer adds a SKU to their cart, THE system SHALL:**
- Reserve the quantity immediately
- Reduce available inventory by the reserved quantity
- Release the reservation if cart is abandoned for more than 2 hours
- Release the reservation if item is removed from cart

#### Inventory Update Rules

**WHEN a seller updates inventory for a SKU, THE system SHALL:**
- Accept only non-negative integer values
- Validate that the new quantity can accommodate existing reservations
- Prevent reducing inventory below the current reserved quantity
- Log all inventory changes with timestamp and reason

**IF a seller attempts to reduce inventory below reserved quantity, THEN THE system SHALL:**
- Reject the update
- Display error message: "Cannot reduce inventory below reserved quantity. Current reservations: [X] units."
- Suggest waiting for reservations to expire or be converted to orders

**WHEN inventory reaches zero, THE system SHALL:**
- Mark the SKU as "Out of Stock"
- Prevent new cart additions
- Display "Out of Stock" on product pages
- Offer "Notify Me" option to customers

### Inventory Reservation Rules

#### Cart Reservation Rules

**WHEN a customer adds an item to their shopping cart, THE system SHALL:**
- Reserve the requested quantity immediately
- Validate that sufficient inventory is available
- Set reservation expiration time to 2 hours from addition
- Update reservation timer when customer modifies cart quantity

**THE system SHALL release cart reservations when:**
- Customer removes item from cart
- Reservation expires after 2 hours of cart inactivity
- Customer completes checkout (reservation converts to order allocation)
- Customer's session expires

**WHEN a reservation expires, THE system SHALL:**
- Return the reserved quantity to available inventory
- Remove the expired items from the customer's cart
- Notify the customer about removed items on next cart view

#### Order Reservation Rules

**WHEN a customer places an order, THE system SHALL:**
- Convert cart reservations to order allocations
- Permanently reduce inventory by the ordered quantity
- Validate inventory availability one final time before order confirmation
- Reject orders if inventory becomes unavailable during checkout

**IF inventory becomes unavailable during checkout, THEN THE system SHALL:**
- Cancel the order placement
- Display specific error: "Sorry, [Product Name - Variant] is no longer available. Please update your cart."
- Offer alternative: "View similar products" or "Save to wishlist"

**WHEN an order is cancelled or refunded, THE system SHALL:**
- Return the ordered quantity to available inventory
- Make the inventory available for new purchases immediately
- Log the inventory restoration with order reference

### Low Stock Alerts

**THE system SHALL generate low stock alerts based on:**
- Warning threshold: When SKU inventory falls below 20 units
- Critical threshold: When SKU inventory falls below 5 units
- Out of stock: When SKU inventory reaches zero

**WHEN a SKU reaches warning threshold, THE system SHALL:**
- Send notification to the seller
- Display "Low Stock" badge on seller's inventory dashboard
- Continue allowing purchases without customer notification

**WHEN a SKU reaches critical threshold, THE system SHALL:**
- Send urgent notification to the seller
- Display "Only [X] left in stock" message to customers
- Continue allowing purchases with scarcity indicator

**WHEN a SKU reaches zero inventory, THE system SHALL:**
- Send immediate notification to the seller
- Mark SKU as "Out of Stock"
- Prevent new purchases
- Offer "Notify Me When Available" option to customers

### Multi-Seller Inventory Rules

**THE system SHALL maintain separate inventory for each seller, even for identical products.**

**WHEN displaying products from multiple sellers, THE system SHALL:**
- Show each seller's available inventory separately
- Allow customers to compare sellers by price and availability
- Indicate which seller has the item in stock
- Separate orders by seller even if from same cart

**THE system SHALL NOT:**
- Combine inventory from multiple sellers
- Transfer inventory between sellers
- Allow sellers to view competitors' inventory levels

## Shopping Cart and Wishlist Business Rules

### Cart Item Validation Rules

#### Adding Items to Cart

**WHEN a customer attempts to add a product to cart, THE system SHALL validate:**
- Customer is authenticated (logged in)
- Product exists and is active
- Specific SKU variant is selected
- Requested quantity is a positive integer
- Requested quantity does not exceed available inventory
- Seller account is active and in good standing

**IF validation fails, THEN THE system SHALL:**
- Reject the add-to-cart action
- Display specific error message based on failure reason
- Offer remediation action (login, select variant, reduce quantity, etc.)

**THE system SHALL enforce the following cart quantity limits:**
- Minimum quantity per item: 1
- Maximum quantity per item: 99
- Maximum total items in cart: 100 different SKUs
- Maximum total quantity across all items: 999 units

**WHEN a customer adds an item already in their cart, THE system SHALL:**
- Increase the quantity of the existing cart item
- Validate that the new total quantity does not exceed inventory
- Validate that the new total quantity does not exceed maximum per-item limit (99)
- Update the reservation accordingly

**IF the requested quantity exceeds available inventory, THEN THE system SHALL:**
- Reject the addition
- Display message: "Only [X] units available. Please reduce quantity."
- Offer to add maximum available quantity instead
- Provide "Notify Me" option for future availability

#### Cart Item Modifications

**WHEN a customer modifies cart item quantity, THE system SHALL:**
- Validate the new quantity is within allowed limits (1-99)
- Check real-time inventory availability
- Update inventory reservation to match new quantity
- Recalculate cart totals immediately

**WHEN a customer removes an item from cart, THE system SHALL:**
- Release the inventory reservation immediately
- Return reserved quantity to available inventory
- Recalculate cart totals
- Optionally offer "Move to Wishlist" before removal

**THE system SHALL automatically remove cart items when:**
- Product is discontinued by seller
- Product is deleted by admin (policy violation)
- SKU variant is removed by seller
- Seller account is suspended or closed
- Inventory reservation expires (2 hours of inactivity)

**WHEN cart items are automatically removed, THE system SHALL:**
- Notify the customer with specific reason
- Offer to move items to wishlist (if product still exists but unavailable)
- Provide "View Similar Products" recommendations

### Cart Persistence Rules

#### Session and Cross-Device Cart Management

**THE system SHALL persist shopping cart data:**
- Across user sessions (cart survives logout/login)
- Across different devices (cart syncs when user logs in on another device)
- For up to 90 days of inactivity
- With real-time synchronization when user is active on multiple devices

**WHEN a customer logs in from a different device, THE system SHALL:**
- Merge any guest cart items from the new device with the user's saved cart
- Preserve quantities from both carts (sum quantities for duplicate items)
- Validate inventory availability for merged items
- Resolve conflicts by keeping the most recent cart state if merge exceeds limits

**WHEN a customer's cart contains items for more than 90 days, THE system SHALL:**
- Remove items older than 90 days automatically
- Notify customer about removed items on next login
- Suggest moving long-term items to wishlist

**THE system SHALL validate cart items on every cart view:**
- Verify products are still active and available
- Check current prices and update if changed
- Validate inventory is still sufficient
- Remove invalid items with notification

### Wishlist Management Rules

#### Adding Items to Wishlist

**WHEN a customer adds a product to wishlist, THE system SHALL:**
- Allow adding without selecting specific variant (save product-level)
- Optionally allow saving specific variant preferences
- Support multiple wishlists per customer (e.g., "Favorites", "Gift Ideas")
- Allow unlimited wishlist items (no quantity limits)

**THE system SHALL allow wishlist items for:**
- Products currently in stock
- Products currently out of stock (for future notification)
- Products in any price range
- Products from any active seller

**WHEN a customer adds an item already in wishlist, THE system SHALL:**
- Notify that the item is already saved
- Update variant preference if different variant selected
- Keep existing wishlist item without creating duplicate

#### Wishlist Item Management

**THE system SHALL allow customers to:**
- Move wishlist items to cart (if in stock)
- Remove items from wishlist at any time
- Share wishlist with others (public link)
- Organize items into multiple named wishlists
- Add notes to wishlist items

**WHEN a customer moves a wishlist item to cart, THE system SHALL:**
- Validate current inventory availability
- Apply current price (may differ from when added to wishlist)
- Remove from wishlist or keep based on customer preference
- Prompt for variant selection if not previously specified

**THE system SHALL automatically remove wishlist items when:**
- Product is permanently discontinued
- Seller account is permanently closed
- Product is deleted by admin for policy violations

**WHEN wishlist items are automatically removed, THE system SHALL:**
- Notify the customer with explanation
- Suggest similar alternative products
- Retain wishlist item for 30 days in "Archived" state for reference

#### Wishlist Notifications

**WHEN a wishlist item comes back in stock, THE system SHALL:**
- Send notification to the customer within 1 hour
- Include direct link to add item to cart
- Show current price in the notification
- Limit notifications to once per 24 hours per item

**WHEN a wishlist item's price decreases by 10% or more, THE system SHALL:**
- Send price drop notification to the customer
- Display old price and new price
- Include percentage savings
- Provide quick "Add to Cart" action

**THE system SHALL send wishlist reminder notifications:**
- Weekly summary of wishlist items with availability status
- Special occasion reminders (if customer tagged items for events)
- Promotional notifications when wishlist items are on sale

### Stock Availability Rules

#### Real-Time Availability Checking

**THE system SHALL check inventory availability:**
- When customer views cart
- When customer proceeds to checkout
- When customer updates cart quantities
- Continuously during active cart sessions (every 5 minutes)

**WHEN inventory becomes unavailable while in cart, THE system SHALL:**
- Display prominent notification: "[Product Name] is no longer available"
- Prevent checkout until unavailable items are removed
- Offer alternatives: "View Similar Products" or "Move to Wishlist"
- Highlight unavailable items in cart with distinctive styling

**WHEN inventory becomes partially unavailable (quantity reduced), THE system SHALL:**
- Display message: "Only [X] units available, reduced from [Y]"
- Automatically adjust cart quantity to maximum available
- Give customer option to accept reduced quantity or remove item
- Update cart totals to reflect reduced quantity

**THE system SHALL prevent checkout when:**
- Any cart item is out of stock
- Any cart item exceeds available inventory
- Total cart value is below minimum order value
- Selected shipping address is invalid or incomplete

#### Multi-Seller Availability Coordination

**WHEN a cart contains items from multiple sellers, THE system SHALL:**
- Validate inventory separately for each seller's items
- Display clear grouping of items by seller
- Calculate shipping separately for each seller
- Allow partial checkout if some sellers' items are unavailable

**THE system SHALL split orders by seller:**
- Create separate orders for each seller's items
- Process payment for all orders together
- Track each seller's order independently
- Provide separate tracking information per seller

## Order Processing Business Rules

### Order Placement Validation

#### Pre-Order Validation

**WHEN a customer initiates checkout, THE system SHALL validate:**
- Customer is authenticated and account is active
- Shopping cart contains at least one item
- All cart items are currently available
- Selected delivery address is complete and valid
- Selected payment method is valid and active
- Cart total meets minimum order value ($5.00)

**THE system SHALL require the following information before order placement:**
- Delivery address (from customer's saved addresses or new address)
- Contact phone number for delivery
- Payment method selection
- Billing address (can be same as delivery address)
- Optional order notes (maximum 500 characters)

**WHEN customer proceeds to checkout, THE system SHALL display:**
- Complete itemized list with current prices
- Subtotal for each seller's items (if multi-seller cart)
- Shipping cost for each seller
- Tax calculations
- Order total
- Estimated delivery date range

#### Payment Validation

**BEFORE processing payment, THE system SHALL validate:**
- Payment method is supported and active
- Payment amount matches calculated order total
- Customer's payment information is complete
- No duplicate order submission (prevent double-clicks)

**THE system SHALL support the following payment methods:**
- Credit cards (Visa, MasterCard, American Express, Discover)
- Debit cards
- Digital wallets (PayPal, Apple Pay, Google Pay)
- Bank transfers (with verification delay)

**WHEN payment processing begins, THE system SHALL:**
- Display processing indicator to customer
- Lock the order to prevent modifications
- Set timeout of 60 seconds for payment authorization
- Maintain inventory reservations until payment completes or fails

**IF payment authorization succeeds, THEN THE system SHALL:**
- Create confirmed order record
- Generate unique order number
- Convert inventory reservations to permanent allocations
- Send order confirmation email within 5 minutes
- Display order confirmation page with order details
- Clear the shopping cart items that were ordered

**IF payment authorization fails, THEN THE system SHALL:**
- Retain inventory reservations in cart
- Display specific error message from payment gateway
- Allow customer to retry with same or different payment method
- Preserve cart contents and checkout information
- Log failed payment attempt for fraud prevention

#### Order Confirmation Requirements

**WHEN an order is successfully placed, THE system SHALL:**
- Generate unique order ID in format: ORD-YYYYMMDD-XXXXXXX
- Record order timestamp
- Capture complete order snapshot (items, prices, addresses, payment details)
- Initialize order status to "Pending Payment" or "Payment Confirmed"
- Send confirmation email to customer email address
- Send notification to seller(s) about new order

**THE order confirmation email SHALL include:**
- Order number and date
- Complete itemized list with quantities and prices
- Delivery address
- Estimated delivery date
- Payment method (last 4 digits for cards)
- Order total breakdown
- Link to track order status
- Customer service contact information

### Order State Transition Rules

#### Order Status Lifecycle

**THE system SHALL support the following order status states:**
- **Pending Payment**: Order created, awaiting payment confirmation
- **Payment Confirmed**: Payment successfully processed
- **Processing**: Seller is preparing the order for shipment
- **Shipped**: Order has been handed to shipping carrier
- **In Transit**: Order is en route to customer
- **Out for Delivery**: Order is with local delivery agent
- **Delivered**: Order successfully delivered to customer
- **Cancelled**: Order cancelled by customer or seller
- **Refund Requested**: Customer has requested a refund
- **Refund Approved**: Refund approved, processing payment reversal
- **Refunded**: Refund completed
- **Failed**: Order failed due to payment or other issues

#### Valid Status Transitions

**THE system SHALL allow the following status transitions:**

From **Pending Payment**:
- → Payment Confirmed (when payment succeeds)
- → Failed (when payment fails after retries)
- → Cancelled (when customer abandons checkout)

From **Payment Confirmed**:
- → Processing (when seller acknowledges order)
- → Cancelled (within 1 hour if customer requests, or if seller cannot fulfill)

From **Processing**:
- → Shipped (when seller marks as shipped with tracking)
- → Cancelled (only if customer requests and seller approves)

From **Shipped**:
- → In Transit (automatically via shipping carrier updates)
- → Delivered (when marked as delivered)

From **In Transit**:
- → Out for Delivery (when out for final delivery)
- → Delivered (when marked as delivered)

From **Out for Delivery**:
- → Delivered (when delivery confirmed)

From **Delivered**:
- → Refund Requested (if customer requests refund within return window)

From **Refund Requested**:
- → Refund Approved (when seller/admin approves)
- → Delivered (when refund request is denied)

From **Refund Approved**:
- → Refunded (when refund payment completes)

**THE system SHALL NOT allow:**
- Reverting to previous states (e.g., Shipped → Processing)
- Skipping states (e.g., Payment Confirmed → Shipped without Processing)
- Modifying completed orders (Delivered, Refunded, Cancelled)

#### Automatic Status Updates

**THE system SHALL automatically update order status when:**
- Payment gateway confirms payment (Pending Payment → Payment Confirmed)
- Shipping carrier provides tracking updates (Shipped → In Transit → Out for Delivery → Delivered)
- Refund payment is processed successfully (Refund Approved → Refunded)

**WHEN order status changes, THE system SHALL:**
- Update order record timestamp
- Log status change with reason and user/system actor
- Send notification to customer (email and in-app)
- Send notification to seller (for customer-initiated changes)
- Update order tracking information
- Recalculate seller performance metrics

### Multi-Seller Order Splitting Rules

#### Order Separation by Seller

**WHEN a customer's cart contains items from multiple sellers, THE system SHALL:**
- Create separate order records for each seller's items
- Generate unique order IDs for each seller's order
- Process all orders in a single payment transaction
- Display orders grouped by seller in order confirmation

**THE system SHALL split the following by seller:**
- Order items and quantities
- Subtotal calculations
- Shipping costs
- Delivery timelines
- Order tracking information
- Review and rating opportunities

**THE system SHALL NOT split by seller:**
- Payment transaction (single payment for all orders)
- Tax calculations (calculated per jurisdiction, not per seller)
- Customer service contact (platform handles all inquiries)

#### Multi-Seller Payment Distribution

**WHEN payment is received for multi-seller orders, THE system SHALL:**
- Charge customer once for total amount
- Distribute payment to sellers based on their order subtotals
- Deduct platform commission from each seller's portion
- Hold funds until order delivery confirmation
- Process separate payouts to each seller

**THE system SHALL calculate seller payment as:**
- Seller Payment = (Item Subtotal + Shipping Fee) - Platform Commission - Processing Fees

**THE system SHALL withhold seller payment:**
- Until order is marked as "Delivered"
- For an additional 7 days after delivery (return/refund window)
- Until any disputes are resolved
- If seller account is under investigation

### Order Modification Rules

#### Customer-Initiated Modifications

**THE system SHALL allow customers to modify orders when:**
- Order status is "Pending Payment" (can modify anything)
- Order status is "Payment Confirmed" (can cancel within 1 hour)

**THE system SHALL NOT allow customers to modify orders when:**
- Order status is "Processing" or beyond
- Order has been partially shipped
- Modification window (1 hour after payment) has expired

**WHEN a customer requests order cancellation within allowed timeframe, THE system SHALL:**
- Immediately update order status to "Cancelled"
- Release inventory back to available stock
- Process full refund within 24 hours
- Notify seller of cancellation
- Remove order from seller's fulfillment queue

**IF a customer requests cancellation after allowed timeframe, THEN THE system SHALL:**
- Display message: "Order is being processed and cannot be cancelled online"
- Provide contact information for customer service
- Allow customer to submit cancellation request for seller review
- Notify seller of cancellation request

#### Seller-Initiated Modifications

**THE system SHALL allow sellers to modify orders when:**
- Order status is "Payment Confirmed" or "Processing"
- Modification is due to inventory unavailability
- Customer approves the modification

**WHEN a seller cannot fulfill an order, THE system SHALL:**
- Require seller to provide reason (out of stock, damaged, other)
- Notify customer immediately
- Offer alternatives: full refund, partial fulfillment, substitute product
- Automatically cancel if seller doesn't respond within 24 hours
- Process refund if customer doesn't accept alternatives within 48 hours

**THE system SHALL allow sellers to:**
- Add tracking information to orders
- Update shipping status
- Communicate with customer about order
- Mark orders as shipped or delivered
- Respond to cancellation and refund requests

**THE system SHALL NOT allow sellers to:**
- Modify order prices after payment
- Change items or quantities in confirmed orders
- Cancel orders without valid reason
- Delay shipment beyond promised delivery window without customer notification

## Payment and Pricing Business Rules

### Price Calculation Rules

#### Product Pricing Components

**THE system SHALL calculate product prices using the following components:**
- Base SKU price (seller-defined)
- Promotional discount (if active promotion applies)
- Volume discount (if applicable)
- Platform fees (hidden from customer, deducted from seller revenue)

**WHEN calculating item subtotal, THE system SHALL:**
- Use the selected SKU variant price
- Apply active promotional discount if eligible
- Multiply by quantity
- Round to 2 decimal places

#### Cart Total Calculation

**THE system SHALL calculate cart total in the following sequence:**

1. **Items Subtotal**: Sum of all item subtotals
2. **Shipping Cost**: Based on shipping method and seller location
3. **Tax**: Based on delivery address jurisdiction
4. **Order Total**: Subtotal + Shipping + Tax - Discounts

**THE system SHALL display price breakdown showing:**
- Subtotal by seller (if multi-seller cart)
- Individual item prices and quantities
- Shipping cost per seller
- Tax amount
- Any applied discounts or promotions
- Final total

**THE system SHALL recalculate cart totals:**
- When items are added or removed
- When quantities change
- When shipping method changes
- When delivery address changes (affects tax)
- When customer views cart or checkout page

#### Tax Calculation Rules

**THE system SHALL calculate tax based on:**
- Delivery address (destination-based taxation)
- Product category (some categories may be tax-exempt)
- Applicable tax rates for the jurisdiction

**WHEN calculating tax, THE system SHALL:**
- Apply correct state/province tax rate
- Apply correct local tax rate if applicable
- Calculate tax on subtotal + shipping cost
- Round tax to 2 decimal places
- Display tax amount separately in order summary

**THE system SHALL handle tax-exempt scenarios:**
- Tax-exempt organizations (with valid tax-exempt certificate)
- Tax-exempt product categories (groceries, certain clothing in some jurisdictions)
- International orders (based on destination country rules)

#### Shipping Cost Calculation

**THE system SHALL calculate shipping costs based on:**
- Delivery destination (zip/postal code)
- Package weight (calculated from items)
- Shipping method selected (standard, express, overnight)
- Seller location
- Seller-defined shipping rates or carrier integration

**THE system SHALL support the following shipping methods:**
- Standard Shipping (5-7 business days)
- Express Shipping (2-3 business days)
- Overnight Shipping (1 business day)
- Free Shipping (when order meets minimum threshold)

**WHEN calculating shipping for multi-seller orders, THE system SHALL:**
- Calculate shipping separately for each seller's items
- Display each seller's shipping cost separately
- Sum all shipping costs in the order total
- Allow each seller to offer free shipping independently

**THE system SHALL offer free shipping when:**
- Order subtotal from a single seller exceeds seller's free shipping threshold (typically $50)
- Promotional campaign offers free shipping
- Seller configures free shipping for specific products

### Payment Validation Rules

#### Payment Method Validation

**WHEN a customer selects a payment method, THE system SHALL validate:**
- Payment method is active and supported
- Payment information is complete (card number, expiration, CVV)
- Billing address is provided
- Card is not expired
- Payment method belongs to the customer (verified through billing address)

**THE system SHALL validate credit/debit card information:**
- Card number is valid (Luhn algorithm check)
- Card number matches supported card type (Visa, MC, AMEX, etc.)
- Expiration date is in the future
- CVV is correct length for card type (3 or 4 digits)
- Billing zip/postal code matches card on file

**IF payment validation fails, THEN THE system SHALL:**
- Display specific error message (without exposing security details)
- Allow customer to correct information
- Suggest alternative payment methods
- Preserve checkout information for retry

#### Payment Authorization Rules

**WHEN processing payment, THE system SHALL:**
- Submit authorization request to payment gateway
- Wait up to 60 seconds for authorization response
- Display processing indicator to customer
- Prevent duplicate submissions during processing

**IF payment authorization is approved, THEN THE system SHALL:**
- Capture the authorized amount immediately
- Create order with "Payment Confirmed" status
- Send confirmation to customer
- Release cart inventory reservations (convert to order allocation)

**IF payment authorization is declined, THEN THE system SHALL:**
- Display reason for decline (insufficient funds, card declined, etc.)
- Retain cart reservations for 30 minutes
- Allow customer to retry with same or different payment method
- Log decline reason for fraud detection
- Suggest contacting card issuer if multiple declines occur

**THE system SHALL prevent fraudulent payments by:**
- Limiting payment retry attempts to 5 per order
- Requiring CAPTCHA verification after 3 failed attempts
- Flagging orders with unusual patterns for manual review
- Validating billing address matches card issuer records
- Checking customer's order history for suspicious behavior

#### Payment Security Rules

**THE system SHALL protect payment information by:**
- Not storing full credit card numbers (use tokenization)
- Storing only last 4 digits for customer reference
- Encrypting all payment data in transit
- Complying with PCI DSS requirements
- Using payment gateway for card processing (not processing directly)

**THE system SHALL require additional verification for:**
- Orders exceeding $1,000 in value
- First-time customers with high-value orders
- Shipping address different from billing address
- International orders from high-risk regions

### Refund Processing Rules

#### Refund Eligibility Rules

**THE system SHALL allow refund requests when:**
- Order has been delivered within the last 30 days
- Customer provides valid reason for refund
- Items are in original condition (for return-required refunds)
- Seller policy allows refunds for the product category

**THE system SHALL NOT allow refund requests when:**
- More than 30 days have passed since delivery
- Product is marked as non-refundable (clearance, personalized items)
- Item is damaged due to customer misuse
- Item has been used or worn (for clothing, electronics)

**WHEN a customer requests a refund, THE system SHALL:**
- Update order status to "Refund Requested"
- Notify seller of refund request within 1 hour
- Provide customer with refund request ID
- Set seller response deadline (3 business days)
- Display refund request status to customer

#### Refund Approval Process

**THE system SHALL route refund requests as follows:**
- Seller has 3 business days to approve or deny
- If seller doesn't respond, request automatically approved
- Admin can override seller decisions
- Customer can escalate denied requests to admin

**WHEN a seller reviews refund request, THE system SHALL allow:**
- Approval with full refund
- Approval with partial refund (with justification)
- Denial with reason
- Request for additional information or photos from customer

**IF seller approves refund, THEN THE system SHALL:**
- Update order status to "Refund Approved"
- Initiate refund payment processing
- Provide customer with return shipping label (if return required)
- Set return deadline (14 days for customer to return item)
- Update inventory when returned item is received

**IF seller denies refund, THEN THE system SHALL:**
- Notify customer with denial reason
- Offer option to escalate to admin review
- Maintain order status as "Delivered"
- Provide customer service contact information

#### Refund Payment Processing

**WHEN refund is approved, THE system SHALL process refund payment:**
- Within 24 hours for non-return refunds
- Within 3 business days after returned item is received and inspected
- To original payment method
- For full order amount including shipping (if seller at fault) or order amount only (if customer preference)

**THE system SHALL calculate refund amount as:**
- Full refund: Original item price + shipping + tax
- Partial refund: Agreed percentage of item price + proportional tax
- Return shipping: Deducted from refund if customer at fault

**WHEN refund payment is processed, THE system SHALL:**
- Update order status to "Refunded"
- Send confirmation email to customer with refund amount
- Notify seller of completed refund
- Restore inventory if item was returned
- Update seller performance metrics
- Deduct refund amount from seller's next payout

**THE system SHALL complete refund payment:**
- Within 5-10 business days to credit/debit cards
- Within 24 hours to digital wallets
- Within 3-5 business days to bank accounts

### Commission and Payout Rules

#### Platform Commission Structure

**THE system SHALL deduct platform commission from seller revenue:**
- Standard commission: 10% of item subtotal
- Promotional rate for new sellers: 5% for first 90 days
- Volume discounts: Reduced commission for high-volume sellers
- Category-specific rates: Higher commission for certain product categories

**THE system SHALL calculate commission as:**
- Commission Amount = (Item Subtotal) × Commission Rate
- Commission is deducted before seller payout
- Tax and shipping fees are NOT included in commission calculation

**THE system SHALL display commission information:**
- To sellers at time of product listing
- On seller dashboard for each order
- In monthly seller statements
- In payout summaries

#### Seller Payout Processing

**THE system SHALL process seller payouts:**
- On a weekly basis (every Monday)
- For orders delivered at least 7 days prior
- After deducting platform commission and fees
- Via seller's selected payout method (bank transfer, PayPal)

**THE system SHALL calculate seller payout as:**
- Payout = (Item Subtotal + Shipping Fee) - Platform Commission - Payment Processing Fee - Refunds

**THE system SHALL withhold seller payouts when:**
- Order is within 7-day post-delivery window (refund risk period)
- Seller has pending refund requests under review
- Seller account has unresolved disputes
- Seller has violated platform policies
- Minimum payout threshold not met ($25 minimum)

**WHEN seller payout is processed, THE system SHALL:**
- Generate payout statement with itemized earnings
- Send payout to seller's bank account or PayPal
- Send confirmation email with payout details
- Update seller's account balance
- Archive payout records for tax reporting

## Shipping and Fulfillment Business Rules

### Shipping Method Selection Rules

#### Available Shipping Methods

**THE system SHALL offer the following shipping methods:**
- **Standard Shipping**: 5-7 business days, lowest cost
- **Express Shipping**: 2-3 business days, moderate cost
- **Overnight Shipping**: 1 business day, highest cost
- **Free Shipping**: When order meets seller's minimum threshold

**WHEN a customer selects a shipping method, THE system SHALL:**
- Display estimated delivery date range
- Show shipping cost for each seller's items
- Validate shipping method is available for delivery address
- Update order total with shipping costs

**THE system SHALL calculate estimated delivery date based on:**
- Seller's processing time (1-3 business days typically)
- Selected shipping method transit time
- Current date and time
- Exclusion of weekends and holidays
- Delivery destination

**THE system SHALL validate shipping method availability:**
- Standard shipping available for all domestic addresses
- Express and overnight may not be available for remote areas
- International shipping has different method options
- Some sellers may only offer specific shipping methods

#### Shipping Cost Determination

**THE system SHALL determine shipping costs using:**
- Seller-configured flat rates by method
- Weight-based calculations using carrier integration
- Distance-based pricing (origin to destination)
- Dimensional weight for large, lightweight items

**WHEN multiple items from same seller are in cart, THE system SHALL:**
- Combine items into single shipment when possible
- Calculate shipping once per seller, not per item
- Apply package consolidation discounts
- Offer cheaper combined shipping rate

**THE system SHALL offer free shipping when:**
- Order subtotal from single seller exceeds free shipping threshold
- Active promotion provides free shipping
- Seller configures permanent free shipping
- Premium membership benefits include free shipping

### Delivery Address Validation

#### Address Requirements

**THE system SHALL require the following address components:**
- Recipient name (full name)
- Street address line 1 (required)
- Street address line 2 (optional, for apartments/suites)
- City
- State/Province
- ZIP/Postal code
- Country
- Phone number (for delivery contact)

**WHEN a customer enters a delivery address, THE system SHALL validate:**
- All required fields are completed
- ZIP/postal code matches city and state/province
- Address format is valid for the country
- Phone number format is valid
- Street address is not a PO Box (for certain shipping methods)

**THE system SHALL validate addresses using:**
- Address verification service integration
- Postal code database lookup
- Format validation for international addresses
- Suggestion of corrected addresses when errors detected

**IF address validation fails, THEN THE system SHALL:**
- Display specific error messages
- Suggest corrected address if available
- Allow customer to confirm original address if they believe it's correct
- Prevent checkout with invalid address

#### Saved Address Management

**THE system SHALL allow customers to:**
- Save multiple delivery addresses
- Set one address as default
- Edit saved addresses
- Delete addresses not used in recent orders
- Label addresses (Home, Work, etc.)

**WHEN customer selects a saved address, THE system SHALL:**
- Validate address is still complete and valid
- Offer to update address if validation fails
- Apply address to current order
- Calculate shipping and tax based on address

**THE system SHALL limit customers to:**
- Maximum 10 saved addresses
- One default address
- Address labels must be unique

### Order Fulfillment Rules

#### Seller Fulfillment Requirements

**WHEN a seller receives a new order, THE system SHALL:**
- Send immediate notification (email and in-app)
- Display order in seller's fulfillment dashboard
- Set expected ship date based on processing time
- Provide packing slip for printing

**THE system SHALL require sellers to:**
- Acknowledge order within 24 hours
- Ship order within promised processing time (typically 1-3 business days)
- Provide tracking information when shipped
- Update order status to "Shipped" with tracking number

**WHEN seller marks order as shipped, THE system SHALL:**
- Validate tracking number format
- Update order status to "Shipped"
- Send shipment notification to customer with tracking link
- Calculate expected delivery date based on shipping method
- Begin tracking shipment updates from carrier

**IF seller fails to ship within promised time, THEN THE system SHALL:**
- Send reminder notification to seller
- Display late shipment warning on seller dashboard
- Automatically notify customer of delay
- Allow customer to cancel order with full refund
- Negatively impact seller performance rating

#### Packaging Requirements

**THE system SHALL require sellers to:**
- Package items securely to prevent damage
- Include packing slip with order details
- Use appropriate packaging materials
- Label packages correctly with shipping labels
- Include return label (if return policy applies)

**THE system SHALL provide sellers with:**
- Printable packing slips with order details
- Shipping labels (if platform-integrated shipping)
- Return labels for return-eligible products
- Packaging guidelines and best practices

### Shipping Status Update Rules

#### Tracking Integration

**THE system SHALL integrate with shipping carriers to:**
- Receive real-time tracking updates
- Update order status automatically
- Provide tracking information to customers
- Detect delivery exceptions and delays

**THE system SHALL track the following shipment events:**
- Label created
- Package picked up by carrier
- In transit updates
- Out for delivery
- Delivered
- Delivery exceptions (failed delivery, weather delays, etc.)

**WHEN tracking update is received, THE system SHALL:**
- Update order status in real-time
- Send notification to customer (for major milestones)
- Update estimated delivery date if changed
- Log tracking event with timestamp

#### Customer Shipment Tracking

**THE system SHALL provide customers with:**
- Real-time tracking information
- Estimated delivery date
- Current shipment location
- Delivery status updates
- Direct link to carrier tracking page

**WHEN customer views order tracking, THE system SHALL display:**
- Current order status
- Tracking number with carrier link
- Visual tracking timeline
- Estimated delivery date
- Recent tracking events
- Expected next update

**THE system SHALL send tracking notifications when:**
- Order is shipped (with tracking number)
- Package is out for delivery
- Package is delivered
- Delivery exception occurs
- Estimated delivery date changes

#### Delivery Confirmation

**WHEN order is marked as delivered, THE system SHALL:**
- Update order status to "Delivered"
- Record delivery timestamp
- Send delivery confirmation to customer
- Prompt customer to confirm receipt (within 48 hours)
- Request product review after 3 days

**IF customer reports non-delivery of delivered order, THEN THE system SHALL:**
- Request customer to confirm address was correct
- Contact shipping carrier to investigate
- Review delivery photo/proof if available
- Offer replacement or refund based on investigation
- File carrier claim if package confirmed lost

**THE system SHALL automatically confirm delivery when:**
- Tracking shows delivered status
- 7 days pass without customer dispute
- Customer confirms receipt
- Customer submits product review

## Product Reviews and Ratings Business Rules

### Review Submission Eligibility Rules

#### Verified Purchase Requirements

**THE system SHALL allow product reviews only from:**
- Customers who have purchased the specific product
- Orders with status "Delivered"
- Within 90 days of delivery date
- One review per customer per product

**WHEN a customer attempts to submit a review, THE system SHALL validate:**
- Customer has verified purchase of the product
- Order was delivered (not cancelled or refunded)
- Customer has not already reviewed this product
- Review is submitted within 90-day window

**IF customer attempts to review without purchase, THEN THE system SHALL:**
- Display message: "Only verified purchasers can review this product"
- Offer alternative: "Ask a question about this product"
- Suggest purchasing the product to review later

**THE system SHALL badge reviews as "Verified Purchase" when:**
- Review is from customer who purchased the product
- Purchase was through the platform (not external)
- Order was successfully delivered

### Rating Validation Rules

#### Star Rating Requirements

**THE system SHALL require customers to provide:**
- Star rating on 1-5 scale (required)
- Written review text (optional but encouraged)
- Optional photos or videos of product

**THE system SHALL enforce the following rating rules:**
- Rating must be integer from 1 to 5 stars
- 5 stars = Excellent
- 4 stars = Good
- 3 stars = Average
- 2 stars = Poor
- 1 star = Terrible

**WHEN customer submits a rating without written review, THE system SHALL:**
- Accept the rating
- Encourage adding written feedback with prompt
- Display rating-only review with "No written review" indicator
- Count rating in overall product score

#### Written Review Validation

**THE system SHALL validate written reviews to ensure:**
- Minimum length of 10 characters
- Maximum length of 2,000 characters
- No personal contact information (email, phone, URLs)
- No profanity or offensive language
- No spam patterns (excessive repetition, all caps)

**THE system SHALL reject reviews containing:**
- Profanity or hate speech
- Personal attacks on sellers
- Contact information or external links
- Requests for direct contact outside platform
- Competitor product promotions

**IF review validation fails, THEN THE system SHALL:**
- Display specific error message
- Highlight problematic content
- Allow customer to edit and resubmit
- Preserve star rating while rejecting text

#### Review Photos and Media

**THE system SHALL allow customers to upload:**
- Up to 5 photos per review
- Photos must be JPEG, PNG, or WebP format
- Maximum 5MB per photo
- Minimum resolution 400x400 pixels

**THE system SHALL validate review photos to:**
- Ensure appropriate content (no offensive images)
- Verify file format and size
- Check for spam or irrelevant images
- Detect and reject duplicates

**WHEN customer uploads review photos, THE system SHALL:**
- Resize images for optimal display
- Generate thumbnails for review list
- Display full-size images when clicked
- Include photos in review helpfulness score

### Review Moderation Rules

#### Automatic Moderation

**THE system SHALL automatically flag reviews for moderation when:**
- Review contains potentially offensive language
- Star rating is 1 or 2 (very negative)
- Review mentions competitor brands
- Review contains contact information patterns
- Multiple reviews from same customer in short time
- Review reports exceed threshold (3 reports)

**WHEN review is flagged, THE system SHALL:**
- Hold review for admin moderation (not published immediately)
- Notify moderator of flagged review
- Display pending status to customer
- Provide reason for moderation hold

**THE system SHALL auto-approve reviews when:**
- No moderation triggers detected
- Customer has good review history
- Content validation passes all checks
- Verified purchase confirmed

#### Manual Moderation Process

**WHEN admin moderates a review, THE system SHALL allow:**
- Approve and publish review
- Reject review with reason
- Request customer to edit review
- Remove specific portions while keeping rest

**IF admin rejects review, THEN THE system SHALL:**
- Notify customer of rejection with reason
- Allow customer to edit and resubmit
- Preserve star rating if only text was problematic
- Log rejection reason for pattern analysis

**THE system SHALL prioritize moderation of:**
- Reviews with customer reports
- 1-star reviews (highest impact)
- Reviews from new customers
- Reviews with photos or media

#### Review Reporting

**THE system SHALL allow users to report reviews for:**
- Offensive or inappropriate content
- Spam or fake review
- Not about the product
- Contains personal information
- Competitor promotion

**WHEN a review is reported, THE system SHALL:**
- Record report with reason
- Flag review for moderation after 3 reports
- Notify moderator team
- Temporarily hide review if reports exceed 10
- Investigate reporter for abuse of report feature

### Review Display and Sorting

#### Review Aggregation

**THE system SHALL calculate and display:**
- Overall average rating (1-5 stars, rounded to nearest 0.1)
- Total number of reviews
- Distribution of ratings (percentage of 5-star, 4-star, 3-star, 2-star, 1-star)
- Percentage of reviewers who recommend product

**WHEN calculating average rating, THE system SHALL:**
- Include only approved, published reviews
- Weight all reviews equally (no special weighting)
- Update in real-time when new reviews are published
- Display with visual star representation

**THE system SHALL display rating distribution as:**
- Bar chart showing percentage for each star level
- Clickable bars to filter reviews by star rating
- Count of reviews for each rating level

#### Review Sorting Options

**THE system SHALL allow customers to sort reviews by:**
- **Most Recent**: Newest reviews first (default)
- **Most Helpful**: Reviews with most helpful votes first
- **Highest Rating**: 5-star reviews first
- **Lowest Rating**: 1-star reviews first
- **Verified Purchases Only**: Show only verified purchase reviews

**WHEN displaying reviews, THE system SHALL:**
- Show 10 reviews per page
- Provide pagination for additional reviews
- Display verified purchase badge
- Show reviewer name (or anonymous if chosen)
- Display review date
- Show star rating prominently
- Include helpful vote count
- Display seller responses if any

#### Review Helpfulness Voting

**THE system SHALL allow users to vote on review helpfulness:**
- "Helpful" or "Not Helpful" buttons
- One vote per user per review
- No requirement to purchase to vote on helpfulness
- Vote count displayed to all users

**WHEN user votes on review helpfulness, THE system SHALL:**
- Record vote immediately
- Update helpful count in real-time
- Prevent duplicate votes from same user
- Prevent review author from voting on own review

**THE system SHALL calculate helpfulness score as:**
- Helpfulness Score = (Helpful Votes) - (Not Helpful Votes)
- Reviews with higher scores rank higher in "Most Helpful" sort
- Negative scores do not hide reviews but rank them lower

### Verified Purchase Rules

#### Verified Purchase Badge

**THE system SHALL display "Verified Purchase" badge when:**
- Reviewer purchased the specific product through the platform
- Order was completed and delivered
- Review is linked to actual order
- Order was not refunded or cancelled

**THE system SHALL NOT display verified badge when:**
- Review is from customer who did not purchase
- Product was received as gift or sample
- Purchase was made outside the platform
- Order was refunded or cancelled

**WHEN displaying reviews, THE system SHALL:**
- Prominently display verified purchase badge
- Place verified reviews higher in default sorting
- Allow filtering to show only verified purchase reviews
- Calculate separate average rating for verified purchases

### Review Response by Sellers

#### Seller Response Capabilities

**THE system SHALL allow sellers to:**
- Respond to reviews on their products
- Post one response per review
- Edit their responses within 24 hours of posting
- Delete their responses at any time

**WHEN seller responds to review, THE system SHALL:**
- Validate response length (maximum 1,000 characters)
- Check for appropriate content (no offensive language)
- Publish response immediately below review
- Notify customer who wrote the review
- Display seller name with response

**THE system SHALL encourage sellers to:**
- Respond to negative reviews professionally
- Address customer concerns
- Offer solutions or explanations
- Thank customers for positive reviews

**THE system SHALL NOT allow sellers to:**
- Delete or hide customer reviews
- Edit customer reviews
- Submit reviews on their own products
- Vote on reviews of their products

**WHEN seller responds to negative review, THE system SHALL:**
- Display response prominently with review
- Allow customer to update review after seller response
- Track whether response improved customer sentiment
- Include response quality in seller performance metrics

## User and Seller Business Rules

### User Registration Rules

#### Registration Requirements

**THE system SHALL require the following information for user registration:**
- Email address (unique, valid format)
- Password (minimum 8 characters)
- First name and last name
- Country of residence
- Agreement to terms of service and privacy policy

**WHEN a user attempts to register, THE system SHALL validate:**
- Email address is unique (not already registered)
- Email format is valid
- Password meets complexity requirements
- All required fields are completed
- User is at least 18 years old (age verification)

**THE system SHALL enforce password requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!, @, #, $, etc.)
- Not a commonly used password (check against common password list)

**IF registration validation fails, THEN THE system SHALL:**
- Display specific error messages
- Highlight invalid fields
- Preserve valid field values
- Prevent account creation until all validations pass

#### Email Verification

**WHEN a user completes registration, THE system SHALL:**
- Create user account with "Unverified" status
- Send verification email within 5 minutes
- Generate unique verification token (expires in 24 hours)
- Allow login but restrict certain actions until verified

**THE system SHALL restrict unverified accounts from:**
- Making purchases
- Writing reviews
- Saving addresses
- Adding items to wishlist (can browse only)

**WHEN user clicks verification link, THE system SHALL:**
- Validate token is not expired
- Validate token matches user account
- Update account status to "Verified"
- Redirect to welcome page or requested page
- Send welcome email with getting started guide

**IF verification email is not received, THEN THE system SHALL:**
- Allow user to request new verification email
- Limit resend requests to 3 per hour
- Extend expiration for new token by 24 hours from request

### Seller Onboarding Rules

#### Seller Registration Requirements

**THE system SHALL require sellers to provide:**
- All standard user registration information
- Business name and type (individual, LLC, corporation, etc.)
- Business address (physical location)
- Tax identification number (EIN or SSN)
- Bank account information for payouts
- Business license or permits (if applicable)
- Product category focus
- Estimated monthly sales volume

**WHEN a seller applies to register, THE system SHALL:**
- Create seller application record
- Validate all required information is complete
- Verify tax ID format is valid
- Check business name is not already registered
- Set application status to "Pending Review"

**THE system SHALL verify seller information:**
- Business name matches official records
- Tax ID is valid and matches business name
- Bank account information is valid
- Business address is legitimate
- No prior suspended or banned seller accounts from same business

#### Seller Application Review

**WHEN seller application is submitted, THE system SHALL:**
- Send confirmation email to applicant
- Notify admin team of new application
- Set review deadline of 3 business days
- Display application status to applicant

**WHEN admin reviews seller application, THE system SHALL allow:**
- Approve application and activate seller account
- Reject application with reason
- Request additional information or documentation
- Flag for further investigation if suspicious

**IF seller application is approved, THEN THE system SHALL:**
- Activate seller account
- Grant seller permissions and dashboard access
- Send approval email with onboarding guide
- Provide access to seller training materials
- Allow seller to begin listing products

**IF seller application is rejected, THEN THE system SHALL:**
- Send rejection email with specific reasons
- Prevent seller from listing products
- Allow seller to appeal decision
- Suggest corrections needed for reapplication

#### Seller Account Status

**THE system SHALL support the following seller account statuses:**
- **Pending Review**: Application submitted, awaiting approval
- **Active**: Approved seller, can list and sell products
- **Suspended**: Temporarily restricted due to policy violations
- **Banned**: Permanently removed from platform
- **On Hold**: Account frozen pending investigation

**THE system SHALL suspend seller accounts when:**
- Customer complaint rate exceeds 10%
- Late shipment rate exceeds 15%
- Order cancellation rate exceeds 5%
- Multiple policy violations detected
- Payment issues or chargebacks

**WHEN seller account is suspended, THE system SHALL:**
- Notify seller immediately with reason
- Prevent new product listings
- Allow existing orders to be fulfilled
- Hold payouts until suspension is resolved
- Provide path to reinstatement

### Permission and Access Rules

#### Customer Permissions

**THE system SHALL allow customers to:**
- Browse all active products without login
- Search and filter products without login
- View product details and reviews without login
- Add items to cart (requires login)
- Save items to wishlist (requires login)
- Place orders (requires login and verified email)
- Track orders (requires login)
- Write reviews (requires verified purchase)
- Manage account settings and saved addresses

**THE system SHALL NOT allow customers to:**
- Access seller dashboard or seller features
- View other customers' personal information
- Modify product listings or inventory
- Access admin functions
- View other customers' order history

#### Seller Permissions

**THE system SHALL allow sellers to:**
- All customer permissions (can also shop as customers)
- Create and manage their own product listings
- Update inventory for their products
- View and fulfill orders for their products
- Respond to reviews on their products
- Access sales analytics for their products
- Manage payout settings
- Communicate with their customers about orders

**THE system SHALL NOT allow sellers to:**
- View or modify other sellers' products
- Access other sellers' sales data
- View customer payment information
- Modify platform settings
- Access admin moderation tools
- View platform-wide analytics

#### Admin Permissions

**THE system SHALL allow admins to:**
- All customer and seller permissions
- View and manage all products across platform
- View and manage all orders across platform
- Approve or reject seller applications
- Suspend or ban user and seller accounts
- Moderate product reviews
- Resolve refund disputes
- Access platform-wide analytics
- Configure platform settings
- Manage categories and taxonomies

**THE system SHALL require admin approval for:**
- New seller applications
- Disputed refund requests
- Account suspensions or bans
- Policy violations
- Platform configuration changes

### Account Status Rules

#### Account Deactivation

**THE system SHALL allow customers to deactivate their accounts:**
- Voluntary self-service deactivation
- Account remains deactivated but data preserved
- Reactivation possible within 90 days
- Permanent deletion after 90 days if not reactivated

**WHEN customer deactivates account, THE system SHALL:**
- Cancel any pending orders
- Clear shopping cart
- Preserve order history for legal/tax purposes
- Stop all marketing communications
- Anonymize public reviews (keep but remove name)

**THE system SHALL allow account reactivation when:**
- Within 90-day grace period
- User logs in with correct credentials
- Email verification is re-confirmed
- All account data is restored

#### Account Deletion

**WHEN customer requests permanent account deletion, THE system SHALL:**
- Confirm deletion request via email
- Wait 14 days before permanent deletion (cooling-off period)
- Delete personal information (name, email, addresses)
- Anonymize order history (preserve for legal compliance)
- Anonymize reviews (keep content, remove identity)
- Delete saved payment methods
- Remove wishlist and cart data

**THE system SHALL NOT delete:**
- Order transaction records (required for tax/legal compliance)
- Financial transaction history
- Refund and dispute records
- Communications related to legal issues

## Performance Requirements

### Response Time Requirements

#### Page Load Performance

**THE system SHALL ensure the following page load times for customers:**
- Homepage: Load completely within 2 seconds
- Product listing pages: Display results within 2 seconds
- Product detail pages: Load within 1.5 seconds
- Shopping cart page: Load within 1 second
- Checkout pages: Load within 2 seconds
- Order confirmation: Display immediately after payment (within 1 second)

**WHEN customer experiences slow page loads, THE system SHALL:**
- Display loading indicators to show progress
- Load critical content first (progressive loading)
- Cache frequently accessed data
- Optimize images for fast delivery

**THE system SHALL maintain performance under load:**
- Support 10,000 concurrent users without degradation
- Handle 1,000 orders per hour during peak times
- Process search queries within 500 milliseconds
- Update cart totals within 300 milliseconds

### Search Performance Requirements

#### Search Response Time

**WHEN customer performs product search, THE system SHALL:**
- Return search results within 500 milliseconds
- Display first page of results (20 products) immediately
- Load additional results on scroll (infinite scroll or pagination)
- Update filter results within 300 milliseconds

**THE system SHALL optimize search performance by:**
- Indexing product data for fast retrieval
- Caching common search queries
- Pre-loading popular product categories
- Using autocomplete to suggest relevant searches

**WHEN customer applies search filters, THE system SHALL:**
- Update results within 300 milliseconds
- Maintain search query while applying filters
- Display result count for each filter option
- Allow multiple filter combinations

### Payment Processing Performance

#### Payment Authorization Speed

**WHEN customer submits payment, THE system SHALL:**
- Display processing indicator immediately
- Submit to payment gateway within 2 seconds
- Receive authorization response within 10 seconds
- Display confirmation or error within 1 second of response

**THE system SHALL handle payment processing delays:**
- Timeout after 60 seconds without response
- Display timeout message to customer
- Preserve cart and checkout information
- Allow customer to retry payment

**THE system SHALL ensure payment reliability:**
- 99.9% payment processing uptime
- Automatic retry for transient gateway failures
- Fallback payment processor if primary is down
- No duplicate charges from retries

### Order Processing Performance

#### Order Confirmation Speed

**WHEN customer completes checkout, THE system SHALL:**
- Create order record within 2 seconds
- Send order confirmation email within 5 minutes
- Notify seller within 5 minutes
- Update inventory allocation within 1 second

**THE system SHALL process order status updates:**
- Reflect shipment updates within 15 minutes of carrier notification
- Update delivery status in real-time when tracking event occurs
- Notify customer of status changes within 5 minutes
- Sync order status across all user devices immediately

### Page Load Performance

#### Mobile Performance

**THE system SHALL optimize for mobile devices:**
- Homepage loads within 3 seconds on 4G connection
- Product pages load within 2.5 seconds on 4G connection
- Cart and checkout pages load within 2 seconds on 4G connection
- Search results display within 1 second on 4G connection

**THE system SHALL provide mobile-friendly experience:**
- Responsive design for all screen sizes
- Touch-optimized buttons and navigation
- Fast image loading with lazy loading
- Minimal data usage for metered connections

### Database and API Performance

**THE system SHALL maintain backend performance:**
- Database queries complete within 100 milliseconds average
- API endpoints respond within 200 milliseconds average
- Shopping cart updates process within 150 milliseconds
- Inventory checks complete within 50 milliseconds

**THE system SHALL handle peak load scenarios:**
- Black Friday / Cyber Monday traffic spikes
- Flash sales and promotional events
- Holiday shopping season increases
- New product launches with high demand

## Data Validation Rules

### Input Validation Standards

#### Text Input Validation

**THE system SHALL validate text inputs to ensure:**
- Minimum and maximum length requirements met
- Allowed characters only (alphanumeric, specific punctuation)
- No leading or trailing whitespace
- No excessive repeated characters
- No script injection attempts (XSS prevention)

**WHEN validating user text input, THE system SHALL:**
- Trim leading and trailing whitespace automatically
- Reject input containing HTML tags or scripts
- Limit special characters to safe punctuation
- Enforce UTF-8 encoding for international characters

#### Email Address Validation

**THE system SHALL validate email addresses by:**
- Checking format matches standard email pattern
- Verifying domain has valid MX records
- Preventing disposable email domains (for seller registration)
- Checking for typos in common domains (gmail.com vs gmial.com)

**WHEN email validation fails, THE system SHALL:**
- Display error: "Please enter a valid email address"
- Suggest corrections for common typos
- Prevent account creation or order placement
- Highlight the email field for correction

#### Phone Number Validation

**THE system SHALL validate phone numbers by:**
- Accepting multiple formats (with or without country code)
- Validating length appropriate for country
- Removing formatting characters for storage
- Verifying number is not blacklisted (spam numbers)

**THE system SHALL accept phone number formats:**
- (123) 456-7890
- 123-456-7890
- 1234567890
- +1 123 456 7890
- International formats based on country code

### Numeric Data Validation

#### Price and Currency Validation

**THE system SHALL validate price inputs to ensure:**
- Positive numbers only (greater than zero)
- Maximum two decimal places
- Reasonable range (minimum $0.01, maximum $999,999.99)
- No special characters except decimal point

**WHEN customer enters quantity, THE system SHALL validate:**
- Integer values only (no decimals)
- Positive numbers (minimum 1)
- Maximum quantity per item (99)
- Does not exceed available inventory

#### Date and Time Validation

**THE system SHALL validate date inputs by:**
- Accepting only valid calendar dates
- Ensuring dates are within reasonable range
- Validating format matches expected pattern (YYYY-MM-DD)
- Preventing dates in the past (for delivery dates, promotions)

**WHEN validating credit card expiration dates, THE system SHALL:**
- Ensure month is between 1-12
- Ensure year is current year or future
- Combine month/year to validate not expired
- Display error if card has expired

### Address Data Validation

#### Address Format Validation

**THE system SHALL validate delivery addresses by:**
- Ensuring all required fields are present
- Validating ZIP/postal code format for country
- Verifying city and state match ZIP code
- Checking address against postal service database

**THE system SHALL standardize address formatting:**
- Capitalize street names properly
- Expand abbreviations (St → Street, Ave → Avenue)
- Correct common misspellings
- Suggest verified address if different from entered

**WHEN address validation finds errors, THE system SHALL:**
- Display suggested corrected address
- Allow customer to confirm original or accept suggestion
- Highlight specific fields that need correction
- Prevent order placement with unverified address

### File Upload Validation

#### Image Upload Validation

**THE system SHALL validate uploaded images by:**
- Checking file format (JPEG, PNG, WebP only)
- Validating file size (maximum 5MB)
- Checking image dimensions (minimum 800x800 pixels)
- Scanning for inappropriate content
- Verifying file is actually an image (not renamed executable)

**WHEN image upload fails validation, THE system SHALL:**
- Display specific error message (format, size, dimension)
- Show current file size and required size
- Suggest image optimization tools
- Allow customer to upload different image

## Error Handling Scenarios

### Product and Inventory Errors

#### Out of Stock Errors

**WHEN customer attempts to add out-of-stock item to cart, THE system SHALL:**
- Display message: "Sorry, [Product Name] is currently out of stock"
- Offer "Notify Me When Available" option
- Suggest similar available products
- Allow adding to wishlist for future purchase

**WHEN item goes out of stock while in customer's cart, THE system SHALL:**
- Display message on cart page: "[Product Name] is no longer available"
- Prevent checkout until item is removed
- Highlight unavailable item in cart
- Offer alternative products or "Notify Me" option

**WHEN customer attempts checkout with unavailable items, THE system SHALL:**
- Block order placement
- Display error: "Your cart contains unavailable items. Please remove them to continue."
- Highlight each unavailable item
- Provide "Remove All Unavailable" quick action

#### Price Change Errors

**WHEN product price increases while in customer's cart, THE system SHALL:**
- Display notification: "[Product Name] price has changed from $X to $Y"
- Update cart total with new price
- Allow customer to proceed or remove item
- Highlight price change in cart display

**WHEN product price decreases while in customer's cart, THE system SHALL:**
- Automatically apply lower price
- Display message: "Great news! [Product Name] price decreased to $X"
- Update cart total immediately
- No action required from customer

#### Product Unavailable Errors

**WHEN product is discontinued while in cart, THE system SHALL:**
- Display error: "[Product Name] has been discontinued"
- Automatically remove from cart
- Suggest similar alternative products
- Offer to move to wishlist (will notify if product returns)

**WHEN seller deactivates product with active carts, THE system SHALL:**
- Notify customers within 1 hour
- Display: "[Product Name] is temporarily unavailable"
- Keep in cart for 24 hours in case seller reactivates
- Remove after 24 hours if still unavailable

### Order Processing Errors

#### Payment Declined Errors

**WHEN payment is declined by payment gateway, THE system SHALL:**
- Display user-friendly error message (not raw gateway error)
- Preserve cart and checkout information
- Allow customer to retry with same or different payment method
- Suggest contacting card issuer if multiple declines

**THE system SHALL display specific payment error messages:**
- Insufficient funds: "Your payment was declined due to insufficient funds. Please use a different payment method."
- Card expired: "Your card has expired. Please use a different payment method or update your card information."
- Invalid CVV: "The security code you entered is incorrect. Please check and try again."
- Fraud detection: "We're unable to process this payment. Please contact your card issuer or try a different payment method."

**WHEN payment processing times out, THE system SHALL:**
- Display message: "Payment processing is taking longer than expected. Please wait..."
- Continue attempting authorization for up to 60 seconds
- If timeout occurs, display: "Payment processing timed out. Please try again."
- Preserve cart and allow immediate retry

#### Address Validation Errors

**WHEN delivery address fails validation, THE system SHALL:**
- Display error: "We couldn't verify your delivery address"
- Show suggested corrected address if available
- Allow customer to confirm original address
- Prevent order placement until address is verified or confirmed

**WHEN address is incomplete, THE system SHALL:**
- Highlight missing required fields
- Display: "Please complete all required address fields"
- Prevent advancing to payment step
- Preserve other checkout information

**WHEN shipping is unavailable to address, THE system SHALL:**
- Display: "We're sorry, we don't currently ship to [location]"
- Suggest alternative shipping addresses
- Allow customer to enter different address
- Provide customer service contact for special requests

#### Order Total Mismatch Errors

**WHEN calculated order total differs from displayed total, THE system SHALL:**
- Recalculate order total
- Display updated amount to customer
- Require customer to confirm new total before proceeding
- Log discrepancy for investigation

**WHEN tax calculation fails, THE system SHALL:**
- Display error: "Unable to calculate tax for your location"
- Prevent order placement
- Suggest customer service contact
- Allow customer to try different address

### Authentication and Authorization Errors

#### Login Errors

**WHEN customer login fails, THE system SHALL:**
- Display error: "Email or password is incorrect"
- Not specify which field is incorrect (security)
- Offer "Forgot Password" link
- Limit login attempts to 5 per 15 minutes
- Implement CAPTCHA after 3 failed attempts

**WHEN account is locked due to failed attempts, THE system SHALL:**
- Display: "Your account has been temporarily locked for security. Try again in 15 minutes."
- Send security notification email to account owner
- Provide account recovery option
- Automatically unlock after 15 minutes

**WHEN customer attempts to access order without login, THE system SHALL:**
- Display: "Please log in to view your orders"
- Redirect to login page
- Return to requested page after successful login
- Offer guest order lookup as alternative (by order number and email)

#### Permission Errors

**WHEN customer attempts seller-only actions, THE system SHALL:**
- Display error: "This action requires a seller account"
- Provide link to seller registration
- Explain seller benefits
- Maintain customer's current context

**WHEN seller attempts to modify another seller's products, THE system SHALL:**
- Display error: "You don't have permission to modify this product"
- Redirect to seller's own product list
- Log unauthorized access attempt
- Flag account if repeated violations occur

**WHEN unverified account attempts restricted actions, THE system SHALL:**
- Display: "Please verify your email address to continue"
- Provide "Resend Verification Email" button
- Explain verification benefits
- Block action until verification completes

### Search and Navigation Errors

#### Search No Results Errors

**WHEN search returns zero results, THE system SHALL:**
- Display: "No products found for '[search query]'"
- Suggest checking spelling
- Offer broader search suggestions
- Display popular or trending products as alternatives

**WHEN search query is too short (less than 2 characters), THE system SHALL:**
- Display: "Please enter at least 2 characters to search"
- Not execute search
- Show search suggestions as customer types
- Enable search button only when minimum length met

#### Filter Combination Errors

**WHEN applied filters result in zero products, THE system SHALL:**
- Display: "No products match your selected filters"
- Show which filters are currently applied
- Suggest removing some filters
- Display count of products if each filter is removed

**WHEN category no longer exists, THE system SHALL:**
- Redirect to parent category or homepage
- Display: "The category you're looking for has been reorganized"
- Suggest browsing related categories
- Log broken link for correction

### System and Network Errors

#### Server Error Handling

**WHEN system encounters internal server error, THE system SHALL:**
- Display user-friendly message: "Something went wrong on our end. Please try again."
- Log detailed error for developer investigation
- Preserve customer's cart and session data
- Offer retry option
- Provide customer service contact if error persists

**WHEN database connection fails, THE system SHALL:**
- Display: "We're experiencing technical difficulties. Please try again in a few moments."
- Attempt automatic reconnection
- Queue requests for retry when connection restored
- Escalate to operations team if outage persists

#### Network Timeout Errors

**WHEN network request times out, THE system SHALL:**
- Display: "Request timed out. Please check your connection and try again."
- Preserve form data so customer doesn't lose input
- Offer retry button
- Suggest checking internet connection

**WHEN customer connection is slow, THE system SHALL:**
- Display loading indicators
- Load critical content first
- Show partial results as they become available
- Provide offline mode for browsing (cached content)

### Data Integrity Errors

#### Duplicate Order Prevention

**WHEN customer attempts to submit order multiple times, THE system SHALL:**
- Detect duplicate submission (same cart, same time)
- Process only the first submission
- Display confirmation for first order
- Ignore subsequent duplicate submissions
- Display: "Order already placed" if customer tries again

#### Invalid Coupon Code Errors

**WHEN customer enters invalid coupon code, THE system SHALL:**
- Display: "Coupon code '[code]' is not valid"
- Explain possible reasons (expired, minimum not met, already used)
- Allow customer to try different code
- Suggest removing invalid code to proceed

**WHEN coupon code has expired, THE system SHALL:**
- Display: "This coupon code expired on [date]"
- Remove code from cart
- Recalculate totals without discount
- Suggest browsing current promotions

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*
