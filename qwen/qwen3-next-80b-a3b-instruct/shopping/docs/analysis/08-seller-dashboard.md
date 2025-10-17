# Seller Dashboard Workflow

### Seller Onboarding and Approval

WHEN a new user selects the "Become a Seller" option during registration, THE system SHALL mark the user account as "seller-prospect".

WHEN a seller-prospect submits their business details (legal business name, tax identification number, bank account information), THE system SHALL notify an admin via the Admin Dashboard.

WHEN an admin reviews and approves a seller application, THE system SHALL change the user role from "seller-prospect" to "seller" and unlock the ability to create product listings.

WHEN an admin rejects a seller application, THE system SHALL send an email notification to the user with a reason for rejection and allow re-submission after 7 days.

WHILE a seller is in "seller-prospect" status, THE system SHALL prohibit access to the Seller Dashboard and all product management features.

IF a seller-prospect does not complete business documentation within 30 days, THE system SHALL automatically deactivate the prospect status and request re-application.

### Product Creation Flow

WHEN a seller accesses the Seller Dashboard, THE system SHALL display a "Add New Product" button.

WHEN a seller clicks "Add New Product", THE system SHALL open a multi-step form requiring:

- Product name (up to 200 characters, non-empty)
- Product description (minimum 50 characters)
- Category selection from system taxonomy (root category and one subcategory)
- Base price (minimum $0.01, maximum $10,000, exactly two decimal places)
- Product images (at least one, maximum 10 images, each under 5MB, JPG or PNG)
- Return policy (selection from: "No Returns", "30-Day Returns", "90-Day Returns")

WHEN a seller submits the product creation form, THE system SHALL create a master product record with status "pending-sku-setup".

WHERE product has variants (e.g., color, size), THE system SHALL require the seller to define at least one SKU combination before approval.

WHEN a seller adds an initial SKU variant (e.g., "Red, Large"), THE system SHALL enable inventory setting for that specific combination.

WHEN a seller saves any SKU variation, THE system SHALL not make the product publicly visible until at least one SKU is defined and inventory is set above zero.

WHEN a seller duplicates an existing product, THE system SHALL create a new master product with all fields copied but with "Draft" status and zero inventory for all SKUs.

### SKU Inventory Management

WHEN a seller defines a product variant, THE system SHALL treat it as a unique SKU with separate inventory tracking.

WHEN a seller sets inventory for a specific SKU (e.g., "Blue, Small"), THE system SHALL store the quantity as an integer ≥ 0.

WHEN a seller reduces inventory to zero for all SKUs of a product, THE system SHALL automatically change the product's public status to "out-of-stock" but keep the listing visible.

WHILE a product is "out-of-stock", THE system SHALL prevent customers from purchasing any of its SKUs but allow wishlist addition.

WHEN a seller increases inventory for a previously out-of-stock SKU, THE system SHALL automatically change the product's public status to "in-stock".

WHERE the seller has multiple warehouses, THE system SHALL allow inventory to be split across locations, but aggregate visibility to customers must show total available quantity.

WHEN a seller updates SKU inventory, THE system SHALL log the change with timestamp, who made it, and old vs new quantity.

IF a seller attempts to set negative inventory for a SKU, THE system SHALL reject the update with error message: "Inventory cannot be negative."

IF a seller attempts to delete a SKU that has associated order items, THE system SHALL prevent deletion and display: "This SKU cannot be deleted because it has been ordered. Reduce inventory to zero instead."

### Order Fulfillment Process

WHEN a new order is placed containing items from a seller's products, THE system SHALL create a separate fulfillment task for that seller in their Dashboard.

WHEN a seller views their order list, THE system SHALL display:

- Order number
- Buyer name and contact info (email and shipping address)
- List of SKUs purchased with quantities
- Order total and payment status
- Date/time of purchase
- Order status ("pending-fulfillment", "shipping-in-progress", "completed", "cancelled" by customer)

WHEN a seller selects "Ship Order", THE system SHALL require them to:

- Select shipping method from list: "Standard", "Expedited", "Overnight"
- Enter valid tracking number (alphanumeric, 10-30 characters)
- Confirm the items have been packed and handed to carrier

WHEN a seller submits shipping details, THE system SHALL:

- Change order status to "shipping-in-progress"
- Send buyer notification with tracking information
- Display tracking number on order details page visible to buyer

WHILE an order status is "pending-fulfillment", THE system SHALL allow seller to cancel the order only if the buyer has not paid.

IF a buyer requests cancellation of their order, THE system SHALL notify the seller immediately through dashboard alert.

WHEN a seller cancels an order due to stock shortage, THE system SHALL:

- Change order status to "canceled-by-seller"
- Initiate refund process for the buyer
- Notify the buyer: "We're sorry, this item is out of stock. Your payment will be refunded."

IF a seller fails to fulfill an order within 48 hours of purchase, THE system SHALL automatically escalate the order to admin for intervention.

### Sales and Analytics Dashboard

WHEN a seller logs into their dashboard, THE system SHALL display a summary panel with:

- Total products listed
- Total active SKUs
- Total sales in last 30 days
- Total revenue in last 30 days
- Pending orders to fulfill

WHERE seller has ten or more products, THE system SHALL display a graph showing sales trends over the last 7, 30, and 90 days.

WHEN a seller clicks "View Product Performance", THE system SHALL display a table with:

- Product name
- SKU variants
- Units sold
- Revenue generated per SKU
- Average rating
- Number of reviews
- Inventory level per SKU
- Change in sales from previous period

WHEN a seller selects "Export Reports", THE system SHALL allow export of sales data as CSV with columns: date, product name, SKU variant, units sold, revenue, order id.

### Earnings and Payout Schedule

WHILE a seller has accrued earnings, THE system SHALL accrue payments on a weekly cycle.

THE system SHALL calculate seller earnings as: 

- 100% of product sale price minus payment processing fees (3.5% per transaction)
- Payment processing fees = payment_gateway_fee * transaction_amount

WHEN a payment cycle ends (each Monday at 00:00 Korea time), THE system SHALL:

- Consolidate all earnings from the previous week
- Subtract any platform fee (15% of net revenue)
- Calculate net payout amount
- Generate payout record

WHEN a payout is processed, THE system SHALL:

- Transfer funds to the seller's linked bank account
- Send email notification: "Your weekly payout of $X.XX has been processed."
- Update ledger in Seller Dashboard with date, amount, and payout ID

WHERE seller's net earnings for a week are less than $20, THE system SHALL roll over the balance to the next week until cumulative total reaches $20.

WHEN a seller changes their bank account information, THE system SHALL require confirmation via email and suspend all payouts for 24 hours as a security measure.

IF a seller has an open dispute or pending refund, THE system SHALL freezing payout equivalent to the disputed amount until resolved.

WHERE a seller has been suspended or banned, THE system SHALL forfeit all pending earnings and notify the seller: "Your account has been suspended. All pending payouts have been forfeited."


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.