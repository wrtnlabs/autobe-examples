# Seller Dashboard Requirements

## Executive Summary

The Seller Dashboard is a comprehensive business management interface that empowers sellers to efficiently manage their e-commerce operations within the shopping mall platform. This dashboard provides real-time visibility into sales performance, inventory status, orders, and business metrics, enabling sellers to make data-driven decisions and optimize their business operations.

The dashboard serves as the central hub for seller-specific operations, including product management, order fulfillment, inventory monitoring, revenue tracking, and customer communication. All dashboard features are strictly scoped to display only the seller's own data, ensuring data isolation and security across the multi-seller platform.

---

## 1. Seller Dashboard Overview

### 1.1 Purpose and Access

THE Seller Dashboard is accessible to authenticated sellers who have completed the onboarding and verification process. The dashboard provides a dedicated business management interface that aggregates all seller-specific operational data and management tools in one accessible location.

WHEN a seller logs into their account, THE system SHALL display the Seller Dashboard with all seller-specific modules and real-time data relevant to their business operations.

THE Seller Dashboard SHALL only display data (products, orders, inventory, metrics) that belongs to the authenticated seller - no visibility into other sellers' information.

WHEN a seller attempts to access another seller's data or modules, THE system SHALL deny access and log the unauthorized access attempt.

### 1.2 Dashboard Layout and Navigation

The Seller Dashboard provides organized navigation to the following primary sections:

1. **Sales Overview** - Quick view of today's sales, recent orders, and key metrics
2. **Products** - Product management and inventory control
3. **Orders** - Order fulfillment and tracking
4. **Inventory** - SKU-level inventory management and alerts
5. **Revenue** - Earnings, commissions, and payment status
6. **Messages** - Customer communication and inquiries
7. **Analytics** - Performance metrics and business insights
8. **Settings** - Seller profile and account configuration

THE system SHALL provide dashboard navigation that is intuitive, role-specific, and organized by major business functions.

WHILE a seller accesses the dashboard, THE system SHALL maintain real-time data updates for all displayed metrics without requiring manual page refresh.

---

## 2. Sales Analytics and Metrics

### 2.1 Real-Time Sales Overview

The Sales Overview section presents sellers with immediate visibility into their current business performance with key metrics updated in real-time.

WHEN the seller views the Sales Overview section, THE system SHALL display the following metrics with data current to within the last 5 minutes:

- Total sales today (count of completed orders)
- Revenue today (sum of completed order totals in seller's currency)
- Number of orders today (all order statuses)
- Number of active product listings
- Current month sales and revenue
- Previous month sales and revenue (for comparison)
- Average order value
- Number of new customers this month

WHERE a metric changes (new order completed, payment processed), THE system SHALL refresh the display within 5 minutes to reflect the change.

### 2.2 Sales Performance Metrics

Sellers need to understand their sales performance across multiple dimensions to identify trends and optimization opportunities.

THE system SHALL calculate and display the following sales metrics for seller-selected time periods (daily, weekly, monthly, custom range):

- Total orders placed (count of all orders containing seller's products)
- Total revenue generated (sum of order totals for seller's items)
- Number of units sold (aggregate across all products and variants)
- Average order value (total revenue divided by total orders)
- Number of completed orders (orders with "delivered" status)
- Number of pending orders (orders not yet shipped)
- Number of cancelled orders (orders with "cancelled" status)
- Refund amounts (total amount refunded and count of refund transactions)

WHEN a seller selects a custom date range, THE system SHALL validate that the end date is not before the start date and that the range does not exceed 2 years.

WHEN a seller applies date filters, THE system SHALL recalculate all metrics based on selected date range within 3 seconds.

### 2.3 Product Performance Analytics

Sellers must understand which products are performing best to optimize their inventory and marketing efforts.

WHEN a seller views the Products Analytics section, THE system SHALL display for each product:

- Product name and SKU identifier
- Total units sold in the selected time period
- Revenue generated from this product
- Number of times the product was viewed (impressions from search/browse)
- Conversion rate (units sold / product views × 100, displayed as percentage)
- Average rating from customer reviews (1-5 stars)
- Number of customer reviews received
- Current inventory quantity (sum of all variants)
- Reorder status (normal stock / low stock warning / out of stock)
- Commission deducted from product sales

THE system SHALL sort product performance metrics by revenue by default, with options to sort by units sold, conversion rate, average rating, or number of views.

WHEN a seller selects a product from the performance list, THE system SHALL display detailed analytics for that specific product including:

- Daily sales trend chart (units sold and revenue per day over selected period)
- Variant-level performance (breakdown of sales by color, size, or other options)
- Price and discount impact (comparison of sales volume before/after price changes)
- Review sentiment (breakdown of ratings distribution)
- Customer feedback themes (AI-generated summary of common keywords/issues in reviews)

### 2.4 Sales Trends and Visualization

Sellers need to identify patterns and trends in their sales data to forecast and plan inventory.

THE system SHALL provide visual representations of sales trends including:

- Daily sales chart (units sold and revenue per day with trend line)
- Weekly sales comparison (current week vs. previous weeks in bar chart)
- Monthly sales trends (revenue and order count trends in line chart)
- Hourly sales breakdown (for selected day showing peak sales times)
- Top performing products (by revenue and units - top 10 list)
- Sales by category (pie chart showing revenue distribution across categories)
- Revenue trend line (showing overall direction and growth trajectory)

WHEN the seller views trend visualizations, THE system SHALL calculate month-over-month growth rate and display it as a percentage change (e.g., "+15% vs last month").

WHEN seller hovers over chart data points, THE system SHALL display tooltip with specific values (exact revenue, exact units sold, exact timestamp).

### 2.5 Performance Indicators and Health Score

WHEN a seller accesses the dashboard, THE system SHALL calculate and display a "Seller Health Score" (0-100) based on:

- On-time fulfillment rate (orders shipped within 48 hours) - 30% weight
- Customer satisfaction rating (average review rating) - 30% weight
- Order completion rate (orders delivered successfully) - 20% weight
- Response time to customer inquiries (average hours) - 10% weight
- Refund/complaint rate (percentage of orders) - 10% weight

WHEN Health Score exceeds 90, THE system SHALL display "Excellent" status with green indicator.

WHEN Health Score is 80-89, THE system SHALL display "Good" status with blue indicator.

WHEN Health Score is 70-79, THE system SHALL display "Fair" status with yellow indicator.

WHEN Health Score falls below 70, THE system SHALL display "Needs Improvement" status with red indicator and alert message suggesting improvements.

---

## 3. Product Management Interface

### 3.1 Product Management Overview

Sellers must be able to add, update, and manage their product listings including variants, pricing, and visibility settings.

THE Seller Dashboard SHALL provide a dedicated Products section where sellers can:

- View all their product listings with status indicators
- Add new products with complete product information
- Edit existing product details (name, description, images, category)
- Manage product variants (SKU, colors, sizes, options)
- Update product pricing (base price and variant pricing)
- Adjust product visibility (active/inactive/archived)
- View product performance metrics (sales, revenue, ratings)
- Delete products (only if no active inventory and no orders containing product)
- Duplicate existing products (copy as template for similar products)
- Bulk edit products (modify multiple products simultaneously)

### 3.2 Product Listing View

WHEN a seller accesses the Products section, THE system SHALL display a list of all seller's products with the following information per product:

- Product name and thumbnail image (first uploaded image)
- Product SKU and unique product identifier
- Category assignment (primary category)
- Current status (active, inactive, pending approval, archived)
- Price range (if variants have different prices, display "From $9.99 to $29.99")
- Current inventory quantity (sum of all variant inventory levels)
- Number of active variants (e.g., "3 variants: Blue, Red, Green")
- Average customer rating (displayed as stars 0-5)
- Number of customer reviews
- Date created (YYYY-MM-DD format)
- Date last updated (YYYY-MM-DD HH:MM format)
- Number of orders containing this product (lifetime)
- Total revenue from product (lifetime)

THE system SHALL provide filtering and sorting options for the product list including:

- Sort by: name (A-Z or Z-A), price (low to high or high to low), inventory quantity, average rating, date created (newest or oldest), date updated, revenue, number of reviews, number of orders
- Filter by: status (active/inactive/pending/archived - multi-select), category (single or multiple), price range (min/max inputs), inventory level (in stock/low stock/out of stock), rating (minimum stars 1-5), date range (created or updated)
- Search by: product name (partial match), SKU (exact or partial), product ID, category name

WHEN a seller searches for products, THE system SHALL return results matching the search term in product name, SKU, category, or product description within 2 seconds.

WHEN a seller applies filters, THE system SHALL display count of matching products (e.g., "Showing 12 of 47 products") and allow clearing all filters with single button.

### 3.3 Product Editing and Updates

WHEN a seller edits a product, THE system SHALL allow modification of:

- Product name (required, 3-255 characters)
- Product description (required, 10-5000 characters)
- Product images (thumbnail + gallery, up to 10 images)
- Category assignment (primary category required, up to 5 secondary)
- Tags and keywords for search visibility (up to 10 tags)
- Product status (active/inactive/archived - dropdown)
- Base product information (brand, weight, dimensions)
- Product specifications (JSON object with flexible key-value pairs)

WHEN a seller attempts to update product information, THE system SHALL validate that:

- Product name is not empty and is between 3 and 255 characters
- Product description is not empty and does not exceed 5000 characters
- At least one product image is provided
- Category is selected from available categories
- All required fields are completed before saving

IF a seller tries to update product information with invalid data, THEN THE system SHALL reject the update, display specific validation errors, and preserve the original data.

WHEN a seller updates product information, THE system SHALL immediately save the changes and display a confirmation message with the update timestamp (e.g., "Product updated on March 15, 2024 at 2:45 PM").

WHERE a seller updates product information, THE system SHALL maintain version history allowing rollback to previous versions.

### 3.4 Product Variant Management

Sellers manage product variants (SKUs) with different colors, sizes, and options from within the product edit interface.

THE system SHALL allow sellers to:

- View all variants for a product with their unique SKU identifiers in table format
- Add new variants with color, size, and other custom options
- Edit variant details (color, size, options, images, pricing)
- Set individual pricing for each variant (different from base price)
- Manage inventory quantity for each variant separately
- Activate/deactivate specific variants (hide from sale but preserve data)
- Delete variants (only if no inventory and no associated orders)

WHEN a seller creates a new variant, THE system SHALL:

- Auto-generate a unique SKU combining product ID and variant identifier
- Validate that variant combination doesn't already exist
- Initialize inventory quantity to zero
- Set default pricing equal to base product price (can be overridden)
- Allow seller to upload variant-specific images
- Display confirmation: "New variant created with SKU: [SKU-123]"

WHEN a seller updates variant pricing, THE system SHALL validate that:

- Price is greater than zero (minimum 0.01)
- Price has maximum 2 decimal places
- Price is not negative or unreasonably high (reasonable = less than 1,000,000)
- Changes take effect immediately for future orders

WHEN a seller sets different prices for variants, THE system SHALL display the price range on the product detail page (e.g., "Price: $9.99 - $29.99").

### 3.5 Product Image Management

WHEN a seller uploads product images, THE system SHALL:

- Accept image formats: JPG, PNG, WebP only
- Validate image file size (minimum 500x500 pixels, maximum 10MB)
- Store primary thumbnail image separately from gallery images
- Allow up to 10 images per product
- Allow deletion of images (keeping at least one mandatory)
- Allow reordering of images (drag-and-drop interface)
- Display upload progress (percentage complete)
- Display success/failure status for each uploaded image

THE system SHALL automatically optimize images for web display by creating thumbnails (200x200px) and compressed versions (1200x1200px).

WHEN a seller uploads image with wrong format or size, THE system SHALL display specific error (e.g., "Image must be minimum 500x500 pixels. Your image is 300x300 pixels").

---

## 4. Order Management View

### 4.1 Order Listing and Visibility

Sellers must view and manage all orders containing their products from a centralized orders interface.

WHEN a seller accesses the Orders section, THE system SHALL display all orders that contain the seller's products with the following information per order in table format:

- Order ID (unique identifier, linkable to detail view)
- Customer name (first name + last initial for privacy)
- Order date and time (YYYY-MM-DD HH:MM format)
- Order status (pending, confirmed, paid, processing, shipped, delivered, cancelled, refund requested, refunded)
- Number of items in order (total items in seller's portion)
- Order total amount (seller's portion only - excluding items from other sellers)
- Payment status (pending, completed, failed, refunded)
- Shipping status (pending shipment, shipped, in transit, delivered)
- Last update timestamp (how recently status changed)
- Action buttons (View Details, Track Shipment, Message Customer, etc.)

THE system SHALL provide filtering and sorting for the orders list:

- Sort by: order date (newest or oldest), order ID (ascending/descending), customer name (A-Z or Z-A), order status, payment status, order amount (low to high or high to low)
- Filter by: order status (multiple selections), payment status, shipping status, date range (created or updated), customer name (partial match)
- Search by: order ID (exact), customer name (partial), customer email (partial), product name

WHEN a seller searches for an order, THE system SHALL search across order ID, customer name, customer email, and product names within 2 seconds.

WHEN a seller applies filters, THE system SHALL display count of matching orders and allow clearing filters.

### 4.2 Order Detail View

WHEN a seller clicks on an order to view details, THE system SHALL display:

**Order Information Section:**
- Complete order information including order ID, order date, order total
- Customer information (name, email, phone number)
- All items in the order (product name, variant details, quantity, price per unit, line total)
- Only items that belong to the seller (if multi-seller order)
- Subtotal, taxes, shipping cost breakdown
- Order total amount

**Customer Information Section:**
- Customer name, email, phone number
- Delivery address (complete address provided during checkout)
- Billing address (if different from delivery address)
- Customer account status (active, suspended, etc.)

**Payment Information Section:**
- Payment method (credit card last 4 digits, digital wallet type, etc.)
- Payment status (pending/completed/failed/refunded)
- Payment date and time
- Amount charged
- Transaction reference ID

**Shipping Information Section:**
- Shipping address (address where items will be delivered)
- Shipping method (Standard/Express/Overnight/etc.)
- Estimated delivery date (range e.g., "March 20-22, 2024")
- Tracking number (if shipment initiated)
- Carrier name and link to track with carrier
- Current shipping status
- Tracking history (list of status updates from carrier)

**Timeline Section:**
- Order placed (timestamp)
- Payment confirmed (timestamp)
- Processing started (timestamp)
- Shipped (timestamp + tracking number)
- Delivery status updates (timestamp + location if available)
- Any delays or exceptions noted

**Seller Actions Section:**
- Buttons to update order status (mark as processing, shipped, etc.)
- Fields to input tracking information
- Option to message customer
- Option to request cancellation or handle refund
- Notes field for internal seller comments

THE system SHALL clearly display which items in the order are from the seller and which are from other sellers (in multi-seller orders).

THE system SHALL show the seller only their portion of the order total and commission deductions.

### 4.3 Order Status Management

Sellers must be able to update order status as they fulfill orders and prepare shipments.

WHEN a seller views an order with status "confirmed" or "paid", THE system SHALL provide the option to:

- Mark order as "processing" (seller beginning fulfillment)
- Add shipment tracking information (after marking shipped)
- Mark order as "shipped" with tracking number
- Add processing notes visible to customer (e.g., "Order is being prepared")

WHEN a seller marks an order as "processing", THE system SHALL:

- Record the timestamp of this status change immediately
- Validate that payment has been completed before allowing processing
- Prevent inventory changes (order items are reserved)
- Allow seller to add fulfillment notes (up to 500 characters)
- Send notification to customer: "Your order is now being prepared"

WHEN a seller marks an order as "shipped", THE system SHALL:

- Require entry of shipping method (dropdown: FedEx, UPS, DHL, etc.)
- Require entry of tracking number (alphanumeric validation)
- Require entry of estimated delivery date (date picker)
- Validate that shipping address is complete
- Record the shipment timestamp immediately
- Automatically notify customer with tracking information email
- Display confirmation: "Order marked as shipped. Tracking number [12345] has been sent to customer"

IF a seller attempts to mark an order as shipped without tracking information, THEN THE system SHALL prevent this action and display validation message: "Tracking number is required to mark order as shipped".

WHEN a seller updates order status, THE system SHALL immediately reflect change in order list and detail view.

### 4.4 Refund and Cancellation Management

WHEN a customer requests refund or order cancellation, THE system SHALL display this request in the seller's order management interface with:

- Refund request status (pending approval, approved, rejected, completed)
- Refund reason provided by customer (defective, not as described, changed mind, etc.)
- Refund amount requested
- Date refund was requested
- Option for seller to approve or reject refund request with single click
- Field for seller to add rejection reason (if applicable, up to 200 characters)
- Timeline for refund processing (showing expected dates)
- Alert or notification indicator showing pending refund request

WHEN a seller approves a refund request, THE system SHALL:

- Record the approval timestamp and seller confirmation immediately
- Update order status to "refund approved"
- Initiate refund processing through payment system
- Notify customer of refund approval with expected timeline
- Restore inventory quantity for refunded items within 1 minute
- Display confirmation: "Refund approved for [Amount]. Refund will be processed to customer within 3-7 business days"

IF a seller rejects a refund request, THEN THE system SHALL:

- Record rejection timestamp and seller reason
- Notify customer of rejection with seller's reason provided
- Keep order status unchanged
- NOT modify inventory quantities
- Display confirmation: "Refund request rejected. Reason sent to customer"

WHEN a refund is successfully processed, THE system SHALL:

- Update order status to "refunded"
- Display refund completion date to both seller and customer
- Notify seller of successful refund processing
- Lock order from further modifications (read-only status)

### 4.5 Order Communication and Notes

WHEN a seller adds a note to an order, THE system SHALL:

- Allow notes up to 1000 characters maximum
- Record note timestamp and seller name/ID
- Display notes in order detail view
- Allow seller to designate note as "internal" (seller-only) or "customer-facing" (visible to customer)
- Maintain history of all notes added to the order (display in chronological order)
- If customer-facing note, notify customer of new seller message

THE system SHALL distinguish between:

- Internal notes (visible only to seller and admin, used for operational notes)
- Customer-facing notes/updates (visible to customer and seller, used for customer communication)

WHEN seller sends customer-facing message, THE system SHALL also create entry in Messages section for customer to see and respond to.

---

## 5. Inventory Monitoring

### 5.1 Real-Time Inventory Dashboard

Sellers need constant visibility into inventory levels to prevent stockouts and manage reordering.

WHEN a seller accesses the Inventory section, THE system SHALL display:

- Summary of total products managed (e.g., "47 products with 156 variants")
- Summary of total inventory units across all SKUs (e.g., "2,847 units total")
- Number of in-stock items (inventory > 0)
- Number of low stock items (inventory below warning threshold)
- Number of out-of-stock items (inventory = 0)
- Number of discontinued items (marked inactive)
- Total inventory value (quantity × price across all SKUs)
- Reorder alerts count (number of SKUs below reorder threshold)

WHERE inventory level changes (due to order fulfillment or manual adjustment), THE system SHALL update dashboard within 1 minute.

### 5.2 SKU-Level Inventory View

THE system SHALL provide a detailed inventory list showing for each SKU variant:

- Product name (linked to product detail)
- Variant details (color, size, other options - e.g., "Red, Size M")
- Unique SKU identifier
- Current inventory quantity (number of units available)
- Reserved quantity (items in pending/processing orders)
- Available quantity (current inventory - reserved)
- Low stock warning threshold (set by seller or default 10 units)
- Reorder status indicator with color coding:
  - **In Stock** (green): inventory > threshold
  - **Low Stock** (yellow): inventory ≤ threshold and > 0
  - **Out of Stock** (red): inventory = 0
  - **Discontinued** (gray): variant marked inactive
- Last inventory update timestamp (shows when last changed)
- Last sold date (when this SKU was last ordered)
- Average daily sales (units per day in last 30 days calculated automatically)
- Estimated days until stockout (current inventory / average daily sales)
- Cost per unit (seller's cost, for financial tracking)
- Current price per unit (what customer pays)
- Profit per unit (price - cost)
- Total profit from SKU (quantity × profit per unit)

THE system SHALL provide filtering and sorting for inventory items:

- Sort by: inventory quantity (high to low or low to high), reorder status, product name (A-Z or Z-A), SKU (alphanumeric), days until stockout, last sold date, average daily sales, profit per unit
- Filter by: reorder status (in stock/low stock/out of stock - multi-select), product category, last updated date range, price range (min/max), profit range (min/max), SKU contains (search)

WHEN a seller searches for inventory items, THE system SHALL search by product name, SKU, or product category within 2 seconds.

WHEN seller applies inventory filters, THE system SHALL recalculate "days until stockout" based on filtered time period.

### 5.3 Inventory Quantity Adjustments

Sellers may need to adjust inventory for damages, discrepancies, or manual corrections.

WHEN a seller adjusts inventory quantity for a SKU, THE system SHALL:

- Display current quantity prominently
- Allow entry of new quantity (positive integer only)
- Require reason for adjustment (dropdown: damaged, discrepancy, manual correction, return received, restock, etc.)
- Allow optional detailed notes (up to 500 characters)
- Validate that new quantity is not negative
- Record adjustment timestamp, reason, previous quantity, and new quantity
- Display confirmation immediately: "Inventory adjusted from 45 to 40 units for [Product Name] - [Reason]"

IF a seller attempts to set inventory to a negative value, THEN THE system SHALL reject the change and display validation error: "Inventory cannot be negative. Current inventory is 45 units".

WHEN an inventory adjustment is made, THE system SHALL:

- Immediately update the available inventory
- Log the adjustment for audit purposes (maintained for 2 years)
- NOT affect reserved quantities in pending orders
- Update "days until stockout" calculation within 1 minute
- Notify seller if adjustment brings inventory below reorder threshold

### 5.4 Low Stock Alerts

WHEN a seller sets up low stock warnings for a SKU, THE system SHALL:

- Allow seller to configure warning threshold quantity for each SKU individually
- Default threshold is 10 units (can be customized to any value)
- Display alert indicator (yellow warning) when inventory falls below threshold
- Enable/disable alerts per SKU (toggle switch)

WHEN a SKU inventory level falls below the configured threshold, THE system SHALL:

- Display visual alert (yellow indicator) in inventory list
- Include SKU in "Low Stock Items" count at top of dashboard
- Optionally send notification to seller (if seller enabled notifications in settings)
- Display estimated reorder date (when to reorder based on sales velocity)

THE system SHALL NOT prevent sales when inventory is at or below low stock threshold - low stock is informational, not restrictive.

WHEN SKU inventory reaches zero, THE system SHALL:

- Display red indicator
- Automatically hide product from customer search results
- Disable add-to-cart button on product page
- Display "Out of Stock" message to customers
- Alert seller within 1 minute

### 5.5 Inventory History and Reporting

THE system SHALL maintain a complete inventory adjustment history including:

- Previous quantity before adjustment
- New quantity after adjustment
- Adjustment reason (from dropdown)
- Detailed notes if provided
- Timestamp of adjustment (date and time)
- User who made adjustment (seller name or admin name if assisted)
- Quantity reserved in orders at time of adjustment

WHEN a seller views inventory history for a specific SKU, THE system SHALL display all adjustments made in reverse chronological order (newest first) with ability to filter by date range.

WHEN seller generates inventory report, THE system SHALL export in CSV format containing:
- Product name and SKU
- Current inventory level
- Inventory value
- Average daily sales
- Days until stockout
- Low stock threshold
- Last adjustment date and reason

---

## 6. Revenue and Commission Tracking

### 6.1 Earnings Overview

Sellers need clear visibility into their earnings and how they are calculated including commissions, fees, and deductions.

WHEN a seller accesses the Revenue section, THE system SHALL display:

- Total earnings lifetime (sum of all completed orders minus commissions)
- Total earnings current month (YTD - Year To Date calculation shown separately)
- Total earnings previous month (for comparison)
- Total pending payments (earnings awaiting payout)
- Total paid out (historical cumulative payments received)
- Platform commission rate (percentage deducted from sales, displayed as "10%" or "7%" if premium seller)
- Current account balance available for withdrawal
- Next scheduled payout date and estimated amount

WHEN revenue metrics are displayed, THE system SHALL show each value with:
- Amount in seller's currency (USD, EUR, etc.)
- Trend indicator (up arrow if increased, down arrow if decreased, dash if no change) with percentage change from previous period
- Timestamp of last update (e.g., "Updated 2 minutes ago")

### 6.2 Revenue Calculation and Breakdown

WHEN a seller views revenue for a specific time period, THE system SHALL display:

- Gross sales amount (sum of all completed order totals for seller's items)
- Platform commission deducted (calculated as percentage: amount and %)
- Payment processing fees (if applicable, shown separately)
- Net earnings (gross sales - commissions - fees)
- Number of completed transactions
- Average transaction value (net earnings / number of transactions)

THE system SHALL clearly show the commission formula displayed to seller:

```
Net Earnings = Gross Sales Amount - (Gross Sales Amount × Commission Rate %)
```

Example on dashboard: "Gross Sales: $1,000.00 - Commission (10%): $100.00 = Net Earnings: $900.00"

THE system SHALL allow seller to view earnings breakdown by:

- Time period (daily, weekly, monthly, custom range with date pickers)
- Product (earnings per individual product with top 10 list)
- Category (earnings per category with pie chart)
- Payment status (pending earnings vs. already paid earnings)

### 6.3 Commission Structure

THE system SHALL display the applicable commission rules for the seller:

- Base commission rate percentage (e.g., "10% of all sales")
- Any category-specific commission variations (e.g., "Electronics: 12%, Books: 8%")
- Date commission structure took effect (e.g., "Effective January 1, 2024")
- Promotional commission rates if applicable (e.g., "New Seller Promotion: 5% for 30 days" with countdown)
- Reference to platform terms for complete commission details (with link)
- Seller tier status (Standard, Premium if applicable)

WHEN a seller qualifies for premium status (100+ completed orders in 30 days with 4.5+ average rating), THE system SHALL:
- Display notification: "Congratulations! You've qualified for Premium Seller status with reduced 7% commission"
- Show effective date of commission change
- Display potential monthly savings calculation

### 6.4 Payment Status and History

THE system SHALL display payment status for earnings:

- **Pending**: Earnings from completed orders awaiting payout (typically held for 3-7 days) - shown with countdown timer
- **Scheduled**: Payment has been scheduled and will be processed on specified date (calendar date displayed)
- **Processing**: Payment is being processed by payment system (may take 1-2 business days)
- **Completed**: Payment successfully transferred to seller's account (with date and amount)
- **Failed**: Payment attempt failed (requires seller attention - contact support link provided)

WHEN a seller views payment history, THE system SHALL display in table format:

- Payment ID (unique identifier)
- Payment date (date money appears in seller's account)
- Payment amount (total amount transferred)
- Payment method (bank transfer, digital wallet, etc.)
- Payment status (one of statuses above)
- Number of transactions included in payment
- Date range of transactions included (e.g., "Transactions from March 1-7, 2024")
- Payout schedule reference (link to payout policy)

THE system SHALL display when the next scheduled payout will occur and what amounts are included (e.g., "Next payment scheduled for March 15, 2024: $847.53").

### 6.5 Withdrawal and Payout Management

WHEN a seller requests a withdrawal of pending earnings, THE system SHALL:

- Display current pending balance available for withdrawal
- Allow seller to select withdrawal amount (up to available balance)
- Validate withdrawal amount is greater than minimum threshold (e.g., $5 minimum)
- Require seller to confirm withdrawal destination (saved bank account or payment method from dropdown)
- Provide estimated time for funds to appear (e.g., "Funds will appear in your account within 3-7 business days")
- Process withdrawal request and display confirmation with transaction reference
- Send confirmation email to seller with withdrawal details

IF a seller attempts to withdraw more than available pending balance, THEN THE system SHALL reject request and display available balance: "Maximum withdrawal available: $847.53".

IF a seller tries to withdraw less than minimum amount, THEN THE system SHALL reject and display: "Minimum withdrawal amount is $5.00".

WHEN a withdrawal is processed, THE system SHALL:

- Record withdrawal transaction with timestamp
- Update pending balance (subtract withdrawn amount)
- Notify seller of withdrawal status via email
- Provide transaction reference number for seller tracking
- Display confirmation in revenue dashboard with withdrawal details
- Show withdrawal in payment history

---

## 7. Customer Messages and Support

### 7.1 Messaging Interface

Sellers need to communicate with customers about products, orders, and inquiries within the platform.

WHEN a seller accesses the Messages section, THE system SHALL display:

- List of all message conversations with customers (paginated, 20 per page)
- Unread message count (badge on Messages tab)
- Latest message preview from each conversation (first 50 characters of last message)
- Timestamp of last message (e.g., "2 hours ago", "Yesterday", "March 10")
- Customer name and avatar/profile picture
- Subject/topic of conversation (order ID if related to specific order, or product name)
- Read/unread status indicator (bold/italics for unread)

THE system SHALL provide filtering and sorting for messages:

- Sort by: most recent (default), oldest, unread first
- Filter by: unread/read status, related to order (with order ID search), product inquiry, general inquiry
- Search by: customer name (partial match), order ID (exact), message content (full text search)

WHEN a seller opens message list, THE system SHALL show unread message count prominently with notification badge.

### 7.2 Message Composition and Thread View

WHEN a seller opens a message conversation, THE system SHALL display:

- Complete message thread in chronological order (oldest first, newest last)
- Sender information (seller or customer name)
- Message timestamp (date and time, e.g., "March 15, 2024 at 2:30 PM")
- Read status indicator (checkmark = read, X = unread)
- Message content (text)
- Ability to reply to customer with text input field
- Character count while typing (show remaining characters out of limit)

WHEN a seller composes a reply, THE system SHALL:

- Allow message text up to 5000 characters maximum
- Allow attachment of up to 3 images or documents (max 5MB each)
- Require message content to not be empty (reject blank messages)
- Display character count while typing (countdown: "4,850 characters remaining")
- Validate message before sending (check length, attachments)
- Provide "Send" button (disabled until message has content)

WHEN a seller sends a message, THE system SHALL:

- Immediately display message in thread with "sent" status (checkmark icon)
- Notify customer of new message via email or in-app notification
- Record message timestamp immediately
- Store message for audit and reference (retained for 3 years)
- Mark conversation as "replied" in conversation list
- Clear message input field and ready for next message

### 7.3 Automatic Message Triggers

WHEN a seller marks an order as shipped, THE system SHALL automatically send a message to the customer including:

- Shipping notification with message "Your order has been shipped"
- Tracking number (clickable link to carrier tracking)
- Estimated delivery date (e.g., "Expected delivery: March 20-22, 2024")
- Seller contact information for shipping inquiries
- Link to order details

WHEN a seller approves a refund request, THE system SHALL automatically send a message notifying the customer of:

- Refund approval with message "Your refund has been approved"
- Refund amount (exact amount being refunded)
- Expected refund timeline (e.g., "Refund will appear in your account within 3-7 business days")
- Refund processing reference number
- Return shipping label link (if applicable)

---

## 8. Performance Insights and Recommendations

### 8.1 Business Health Scorecard

Sellers benefit from insights into their business performance and actionable recommendations for improvement.

THE system SHALL calculate and display a Performance Scorecard including:

- Overall health score (0-100) based on multiple factors:
  - Sales trend indicator (trending up/stable/down with percentage change)
  - Customer satisfaction rating (average of product reviews, 1-5 stars)
  - On-time fulfillment rate (percentage of orders shipped on time within 48 hours)
  - Refund rate (number of refunds / total completed orders, displayed as percentage)
  - Inventory management score (based on low stock and stockout incidents, 0-100 scale)
  - Response rate to customer messages (percentage of messages responded to)
  - Average response time to customer messages (display in hours, e.g., "2.5 hours average")

WHEN Overall Health Score is calculated, THE system SHALL display:
- Score with color indicator (Green 80-100, Yellow 60-79, Red below 60)
- Breakdown of contributing factors (show which areas need improvement)
- Trend indicator (up/down/stable compared to last month)

### 8.2 Growth Analytics

THE system SHALL provide growth analytics including:

- Month-over-month sales growth (percentage change calculated automatically)
- New products added this month (count and link to new products)
- New customer acquisitions (count of first-time buyers)
- Repeat customer rate (percentage of customers who purchased more than once)
- Average customer lifetime value (estimated based on purchase history)
- Prediction of next month's sales (based on trends, displayed as range e.g., "$5,000 - $7,500")

WHEN seller views growth analytics, THE system SHALL display charts showing:
- Sales growth trend over last 12 months (line chart)
- Customer growth trend (new customers per month)
- Repeat customer growth (percentage of repeat purchases increasing)

### 8.3 Recommendations and Insights

THE system SHALL provide actionable insights to sellers:

- **Inventory Recommendations**: "Consider restocking SKU-001 (Blue T-Shirt) - sold 50 units this month, currently 8 in stock. Estimated stockout in 3 days."
- **Pricing Recommendations**: "Similar products in category are priced 10% higher - consider price adjustment to $29.99 (currently $27.99)"
- **Product Recommendations**: "Category Electronics has 15% higher margin than your average - consider expanding in this category. Currently 2 products, competitors average 8."
- **Performance Alerts**: "Refund rate increased to 3.2% - above your 2% average. Review recent orders for issues. Top reason: 'Product not as described' (4 cases)"
- **Response Time Alert**: "Average customer response time is 8 hours - improving to <4 hours could increase sales by 5% based on platform data"
- **Low Stock Alerts**: "5 products with critical low stock: [list products with days until stockout]"

THE system SHALL display these insights in a prioritized order based on potential impact on seller business (highest impact first).

WHEN seller dismisses insight, THE system SHALL remember dismissal for 30 days (don't show again).

---

## 9. Seller Account Settings and Management

### 9.1 Profile Management

WHEN a seller accesses Account Settings, THE system SHALL allow modification of:

- Store name (seller's business name, 3-100 characters)
- Store description (about the seller/business, 10-500 characters)
- Store logo image (upload image up to 2MB, recommended 200x200px)
- Store banner image (upload image up to 5MB, recommended 1200x400px)
- Contact email address (verified email, unique)
- Phone number (international format validation)
- Business address (street, city, state, postal code, country)
- Return address (address where customers ship returns)
- Default shipping methods and carriers (checkbox selection from available options)
- Low stock warning threshold default (number of units, applies to new products)
- Commission rate confirmation (display only, no edit capability)

WHEN a seller updates profile information, THE system SHALL validate that:

- Store name is not empty and is 3-100 characters
- Contact email is valid email format and unique across platform
- Phone number is valid format for selected country
- All required fields are completed
- Changes are successfully saved and confirmed with message: "Store information updated successfully"

WHEN seller updates store name, THE system SHALL:
- Verify new name is unique (not already used by another seller)
- Display name in customer view of store within 1 minute
- Update seller profile globally

### 9.2 Notification Preferences

THE system SHALL allow sellers to configure notification settings including:

- Email notifications for new orders (toggle: enabled/disabled)
- Email notifications for low stock alerts (toggle: enabled/disabled)
- Email notifications for customer messages (toggle: enabled/disabled)
- Email notifications for refund requests (toggle: enabled/disabled)
- Email notifications for daily/weekly summary reports (dropdown: off/daily digest/weekly digest)
- In-app notifications for order updates (toggle: enabled/disabled)
- Notification frequency preferences (dropdown: real-time/daily digest/weekly digest)
- Quiet hours for notifications (time range picker: don't send notifications between X and Y)

### 9.3 Security Settings

THE system SHALL provide security settings including:

- Change password (current password required, new password with confirmation)
- Two-factor authentication setup and management (enable/disable, choose method: SMS or authenticator app)
- Active session management (view all active sessions, logout remote sessions)
- Login history (display last 10 logins with date, time, IP address, device info)
- Suspicious activity alerts (display any detected suspicious login attempts)

WHEN seller enables two-factor authentication:
- THE system SHALL require verification method selection (SMS or authenticator app)
- THE system SHALL send verification code to selected method
- THE system SHALL require entry of verification code before 2FA is enabled
- THE system SHALL generate backup codes for account recovery
- THE system SHALL require 2FA on next login

---

## 10. Data Isolation and Security

### 10.1 Access Control Principles

THE system SHALL enforce strict data isolation to ensure sellers cannot access other sellers' data:

WHEN a seller performs any operation on the dashboard, THE system SHALL verify that:

- The requested data belongs to the authenticated seller (verified against seller ID in JWT token)
- The seller has permission to perform the operation
- If data does not belong to seller, access SHALL be denied immediately and attempt logged

IF a seller attempts to access another seller's data through API or URL manipulation, THEN THE system SHALL:
- Return HTTP 403 Forbidden error
- Log unauthorized access attempt with seller ID, timestamp, attempted resource
- Alert admin if pattern of attempts detected

THE system SHALL maintain data isolation at all levels:

- **Product Data**: Sellers view only their products (filtered by seller_id in database queries)
- **Order Data**: Sellers view only orders containing their products (filtered by seller_id in order_items)
- **Customer Data**: Sellers see only name/contact for customers of their products (no email or personal info beyond what's needed)
- **Inventory Data**: Sellers manage only their SKU inventory (filtered by seller_id)
- **Revenue Data**: Sellers view only their earnings and commissions (no other seller data visible)
- **Message Data**: Sellers communicate only with their customers (filtered by seller_id)
- **Analytics Data**: Analytics calculated only from seller's own data (all aggregations filtered)

### 10.2 Audit Logging

THE system SHALL maintain audit logs for all seller dashboard activities including:

- Product additions (timestamp, seller ID, product ID, product details)
- Product updates (timestamp, seller ID, product ID, what changed)
- Product deletions (timestamp, seller ID, product ID)
- Inventory adjustments (timestamp, seller ID, SKU, old quantity, new quantity, reason)
- Order status changes (timestamp, seller ID, order ID, old status, new status)
- Refund approvals and rejections (timestamp, seller ID, order ID, decision, reason)
- Price changes (timestamp, seller ID, product/SKU ID, old price, new price)
- Account settings modifications (timestamp, seller ID, what changed)
- Message sending (timestamp, seller ID, customer ID, message content)
- Withdrawal requests (timestamp, seller ID, amount, destination)

WHEN an admin needs to investigate seller activities, THE admin SHALL be able to view audit logs for any seller through the admin dashboard (see Admin Dashboard document).

---

## 11. Business Rules and Validation

### 11.1 Product Management Rules

THE system SHALL enforce these business rules for seller product management:

1. **Sellers can only create products in approved categories** - Sellers cannot create or select categories; only admin-defined categories are available for selection
2. **SKU uniqueness** - Each SKU must be globally unique across platform; system auto-generates SKUs using seller ID + product ID + variant identifier
3. **Price validation** - Product and variant prices must be greater than zero, maximum 2 decimal places, and not exceed 1,000,000
4. **Inventory minimum** - Inventory quantity cannot be negative; system prevents creation of negative stock through validation
5. **Image requirements** - Each product must have at least one image; all images must be valid image format and meet size requirements
6. **Description completeness** - Product name and description are required and must meet length requirements (3-255 for name, 10-5000 for description)

### 11.2 Order Management Rules

THE system SHALL enforce these business rules for seller order management:

1. **Status progression restrictions** - Orders can only transition through defined status paths; sellers cannot arbitrarily change status (Confirmed → Processing → Shipped → Delivered)
2. **Payment validation** - Sellers cannot mark orders as shipped until payment has been received and confirmed (payment_status = "completed")
3. **Cancellation windows** - Sellers can cancel orders only within defined window (e.g., 1 hour after order placed) if not yet confirmed by customer
4. **Refund eligibility** - Sellers can only process refunds for eligible orders (not already refunded, within return window of 30 days from delivery)
5. **Shipment tracking required** - Sellers must provide tracking number and method before marking as shipped (prevent incomplete shipments)

### 11.3 Inventory Rules

THE system SHALL enforce these business rules for inventory management:

1. **Order reservation** - When order is confirmed, inventory is immediately reserved and cannot be sold until order completes or cancels
2. **Overselling prevention** - System prevents inventory from going below currently reserved quantities (available_qty = current_qty - reserved_qty, always >= 0)
3. **Refund restocking** - When refund is approved, inventory is automatically restored (add quantity back to current_qty)
4. **Adjustment audit** - All manual inventory adjustments must have reason recorded for audit trail (reason stored in inventory_adjustments table)

### 11.4 Revenue and Commission Rules

THE system SHALL enforce these business rules for seller revenue:

1. **Commission calculation** - Commissions are calculated per order at time of completion using rate applicable at that time (stored with each order for historical accuracy)
2. **Payout hold period** - Earnings remain "pending" for 3-7 days after order completion before available for withdrawal (prevents chargeback issues)
3. **Minimum withdrawal** - Sellers can only withdraw when pending balance exceeds minimum threshold (e.g., $5 minimum to prevent excessive payment processing)
4. **Instant refunds** - When refund is approved, commission is reversed and refunded to customer immediately

---

## 12. Performance and Operational Requirements

### 12.1 Real-Time Data Requirements

THE system SHALL update dashboard metrics in real-time with acceptable delays:

- **Sales metrics**: Update within 5 minutes of order completion (could be cached for performance)
- **Inventory quantities**: Update within 1 minute of inventory change (use websockets or polling for real-time)
- **Order status**: Update immediately when order status changes (refresh order list within 30 seconds)
- **Message notifications**: Delivered within 1 minute of customer message (real-time notification)
- **Earnings**: Calculate and display within 30 minutes of order completion (batch processing acceptable)

### 12.2 Scalability and Performance

THE system SHALL perform efficiently even with large data volumes:

- Dashboard should load and display within 3 seconds (include all key metrics)
- Product list should display first 50 items within 2 seconds (with pagination)
- Filtering and sorting operations should complete within 2 seconds (on 10,000 products)
- Order search should return results within 3 seconds (query optimization required)
- Analytics charts should render within 5 seconds (may use pre-calculated data)
- Inventory adjustments should process within 1 second (avoid blocking)

### 12.3 Data Consistency

THE system SHALL maintain data consistency across all dashboard views:

- Inventory quantities must be consistent across product view, inventory view, and order management
- Revenue calculations must be consistent across all views and historical records
- Order information must be consistent between seller and customer views
- Message timestamps must be accurate and consistent across all views
- Status information must reflect current state immediately after change

---

## 13. Workflow Diagrams

### 13.1 Seller Order Fulfillment Workflow

```mermaid\ngraph LR\n    A[\"Customer Places Order\"] --> B[\"Order Confirmed<br/>Seller Receives Notification\"]\n    B --> C[\"Seller Reviews<br/>Order Details\"]\n    C --> D{\"Ready to<br/>Process?\"}\n    D -->|\"No\"| E[\"Seller Rejects<br/>Order\"]\n    E --> F[\"Customer Notified<br/>Refund Processed\"]\n    D -->|\"Yes\"| G[\"Seller Marks as<br/>Processing\"]\n    G --> H[\"Seller Prepares<br/>Shipment\"]\n    H --> I{\"Items<br/>Available?\"}\n    I -->|\"No\"| J[\"Seller Requests<br/>Cancellation\"]\n    J --> F\n    I -->|\"Yes\"| K[\"Seller Enters<br/>Tracking Info\"]\n    K --> L[\"Seller Marks<br/>as Shipped\"]\n    L --> M[\"Customer Notified<br/>with Tracking\"]\n    M --> N[\"Order Shipped<br/>In Transit\"]\n    N --> O[\"Delivery Confirmed\"]\n    O --> P[\"Order Complete<br/>Seller Earnings Posted\"]\n```\n\n### 13.2 Seller Inventory Management Workflow\n\n```mermaid\ngraph LR\n    A[\"Seller Views<br/>Inventory Dashboard\"] --> B{\"Stock Level<br/>OK?\"}\n    B -->|\"Below Threshold\"| C[\"Low Stock Alert\"]\n    C --> D[\"Seller Adjusts<br/>Reorder Point\"]\n    B -->|\"Normal\"| E[\"Monitor Sales\"]\n    E --> F{\"Stock Updated<br/>by Orders?\"}\n    F -->|\"Yes\"| G[\"Inventory<br/>Decremented\"]\n    G --> H{\"Refund<br/>Requested?\"}\n    H -->|\"Yes\"| I[\"Inventory<br/>Restored\"]\n    H -->|\"No\"| J[\"Inventory<br/>Remains\"]\n    D --> K[\"Set Reorder<br/>Reminder\"]\n    F -->|\"No\"| E\n    I --> E\n    J --> E\n```\n\n### 13.3 Seller Dashboard Navigation Flow\n\n```mermaid\ngraph LR\n    A[\"Seller Login\"] --> B[\"Dashboard Home\"]\n    B --> C{\"Select<br/>Module\"}\n    C -->|\"Sales Analytics\"| D[\"View Sales Metrics<br/>and Trends\"]\n    C -->|\"Products\"| E[\"Manage Products<br/>and Variants\"]\n    C -->|\"Orders\"| F[\"View and Fulfill<br/>Orders\"]\n    C -->|\"Inventory\"| G[\"Monitor SKU<br/>Inventory\"]\n    C -->|\"Revenue\"| H[\"View Earnings<br/>and Payouts\"]\n    C -->|\"Messages\"| I[\"Communicate with<br/>Customers\"]\n    C -->|\"Analytics\"| J[\"View Performance<br/>Insights\"]\n    D --> K[\"Back to<br/>Dashboard\"]\n    E --> K\n    F --> K\n    G --> K\n    H --> K\n    I --> K\n    J --> K\n```\n\n---\n\n## 14. Summary\n\nThe Seller Dashboard provides sellers with comprehensive business management capabilities while maintaining strict data isolation and security. The dashboard enables sellers to:\n\n- Monitor real-time sales performance and trends with accurate metrics\n- Manage product inventory with SKU-level tracking and low stock alerts\n- Fulfill orders and manage shipping with tracking integration\n- Track earnings and manage payouts with transparent commission calculation\n- Communicate with customers through integrated messaging system\n- Access performance insights and recommendations for business optimization\n- Configure account and notification preferences for operational efficiency\n\nAll dashboard operations are scoped to each seller's own data, ensuring multi-seller platform security and preventing unauthorized data access. The dashboard integrates seamlessly with all core platform functions (product catalog, inventory, orders, payments, shipping) to provide a complete seller business management experience.\n\n> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, authentication mechanisms, caching strategies, etc.) are at the discretion of the development team.*