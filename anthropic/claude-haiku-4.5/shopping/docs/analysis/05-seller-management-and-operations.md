# Seller Management and Operations

## 1. Seller Onboarding and Registration

### 1.1 Seller Registration Process

WHEN a prospective seller submits a registration request with email, password, and basic business information, THE system SHALL validate the input data and create a pending seller account in an unverified state.

WHEN a seller completes the registration form, THE system SHALL collect the following required information:
- Business legal name
- Business registration number or tax identification number
- Business type (individual, small business, corporation, etc.)
- Primary contact person name and phone number
- Business address and correspondence address
- Bank account information for payment settlement (account holder name, bank name, account number, IFSC/routing code)
- Business description (50-500 characters)
- Store name for display on the platform (2-50 characters)

THE seller account SHALL remain in "pending_verification" status until verification is completed.

### 1.2 Seller Email Verification

WHEN a seller creates an account, THE system SHALL send a verification email to the provided email address.

THE verification email SHALL contain a unique verification link that expires after 24 hours.

WHEN a seller clicks the verification link, THE system SHALL mark the email as verified and update the seller account status accordingly.

IF a seller does not verify their email within 7 days, THE system SHALL send a reminder notification with a link to resend the verification email.

### 1.3 Seller Verification and Approval

WHEN a seller's email is verified, THE system SHALL transition the account to "pending_approval" status and notify admins for manual review.

THE admin SHALL review the seller's business information, registration documents, and bank account details during the verification process.

WHEN an admin approves the seller account, THE system SHALL:
- Update the seller status to "active"
- Send a welcome email to the seller
- Grant permission to create and upload products
- Enable access to the seller dashboard

WHEN an admin rejects the seller account, THE system SHALL:
- Update the seller status to "rejected"
- Send a rejection email with detailed reasons
- Allow the seller to reapply after addressing issues

### 1.4 Store Setup and Customization

WHEN an approved seller first accesses the dashboard, THE system SHALL prompt them to complete initial store setup.

THE seller SHALL be able to customize the following store settings:
- Store name and display name
- Store description (up to 500 characters)
- Store logo image (JPEG, PNG, max 2MB)
- Store banner image (JPEG, PNG, max 5MB)
- Store policies (return policy, shipping policy, up to 2000 characters each)
- Contact information (email, phone, support hours)
- Business hours (if applicable for customer support)

THE store customization SHALL be immediately reflected on the seller's public storefront.

---

## 2. Seller Product Management

### 2.1 Product Listing Creation

WHEN a seller clicks "Create New Product" on the dashboard, THE system SHALL display a comprehensive product creation form.

THE seller SHALL provide the following mandatory product information:
- Product name (3-200 characters)
- Product description (10-5000 characters)
- Primary category and subcategory selection
- Product images (minimum 1, maximum 10 images, JPEG/PNG format, max 5MB each)
- Manufacturer/Brand name
- Product SKU or identifier
- Price (in platform currency, minimum ₹1)
- Product weight and dimensions
- Warranty or guarantee information (if applicable)

THE seller MAY optionally provide:
- Video URL (YouTube, Vimeo format)
- Product specifications in key-value format
- Handling instructions or care guide
- Country of origin
- Certifications or compliance information

### 2.2 Product Variants Creation

WHEN creating a product with variants, THE seller SHALL define variant attributes such as color, size, or other options.

WHEN the seller defines variant attributes, THE system SHALL automatically generate all possible variant combinations (SKU level).

FOR each variant combination, THE seller SHALL specify:
- Variant SKU (unique identifier)
- Variant price (can differ from base price)
- Variant cost price (for seller's cost tracking)
- Initial stock quantity
- Weight and dimensions (if different from base product)
- Variant-specific images (optional)
- Availability status (active, inactive, discontinued)

THE system SHALL prevent duplicate SKU values within the same product.

### 2.3 Bulk Product Upload

WHEN a seller selects "Bulk Upload" from the product management menu, THE system SHALL provide a CSV template file for download.

THE seller SHALL populate the CSV file with product information following the template format and upload it back to the platform.

WHEN the seller uploads a CSV file, THE system SHALL:
- Validate the CSV structure and data types
- Check for duplicate SKUs and product conflicts
- Identify rows with errors and display a detailed error report
- Allow the seller to correct and reupload

IF the CSV file is valid, THE system SHALL create all products and variants in bulk with "draft" status, allowing the seller to review before publishing.

### 2.4 Product Status Management

THE seller SHALL be able to manage the following product statuses:
- **Draft**: Product created but not yet published; only visible to seller
- **Active**: Product published and visible to customers on the platform
- **Inactive**: Product temporarily hidden from customer view; keeps inventory and data intact
- **Discontinued**: Product marked as no longer available; cannot be reactivated from this state

WHEN a seller changes a product status from Active to Inactive, THE system SHALL:
- Remove the product from search results and category listings
- Display "Currently Unavailable" message to customers viewing the product
- Prevent customers from adding it to cart
- Preserve all product data and inventory

WHEN a seller marks a product as Discontinued, THE system SHALL:
- Archive the product data
- Permanently remove it from customer view
- Allow the seller to access archived product data in history
- Prevent reactivation without creating a new product listing

### 2.5 Product Information Updates

WHEN a seller edits an active product's information, THE system SHALL:
- Allow updates to description, specifications, images, and pricing
- Update information immediately for all future customer views
- Maintain change history for audit purposes
- Notify affected customers if significant price reductions occur (price decreased by 20% or more)

IF a seller changes the price of an active product with existing orders in pending state, THE system SHALL:
- Apply the new price only to new orders, not existing pending orders
- Display a warning to the seller about existing pending orders
- Show how many orders will be affected

---

## 3. Seller Dashboard Overview

### 3.1 Dashboard Home

THE seller dashboard SHALL display a personalized home page showing key metrics and quick actions upon login.

THE dashboard home page SHALL prominently display:
- Total sales (current month and all-time)
- Active product count
- Current inventory status (items in stock, items low in stock, out of stock items)
- Pending orders (orders waiting for seller action)
- Recent customer reviews and ratings
- Account balance and last payout amount
- Notifications and alerts (in priority order)

### 3.2 Quick Action Panel

THE dashboard SHALL provide a quick action panel with frequently used functions:
- Create New Product
- Bulk Upload Products
- View Orders (with filter: new, processing, shipped, delivered)
- Manage Inventory
- View Reviews and Feedback
- Access Seller Profile Settings
- View Financial Summary

### 3.3 Real-time Notifications and Alerts

THE system SHALL send real-time notifications to sellers for:
- New order received
- Order cancellation request from customer
- Return/refund request initiated
- Customer review posted
- Customer inquiry or message
- Inventory alert: product stock below 10 units
- Account issues or required actions (payment failed, verification expired, etc.)

THE seller SHALL be able to:
- View notification center with history of last 30 days
- Mark notifications as read
- Set notification preferences (email, in-app, SMS)
- Mute notifications for specific categories temporarily

---

## 4. Product Variants and SKU Management

### 4.1 Variant Configuration

WHEN creating product variants, THE seller SHALL define variant attributes from predefined options:
- Size (XS, S, M, L, XL, XXL, numeric sizes, custom)
- Color (predefined color palette or custom values)
- Material (predefined list or custom text)
- Style (predefined options or custom)
- Brand variant (for multi-variant products)
- Other custom attributes (up to 5 additional attributes per product)

FOR each attribute, THE seller SHALL define the attribute values that apply to this product.

THE system SHALL automatically generate all possible SKU combinations from the defined attributes.

### 4.2 SKU-level Management

WHEN the seller creates SKU combinations, THE system SHALL assign a unique SKU identifier to each combination.

THE seller MAY edit the auto-generated SKU to create custom SKU codes following their internal naming conventions (alphanumeric, max 50 characters).

FOR each SKU, THE seller SHALL manage:
- SKU-specific price (can override product base price)
- SKU-specific cost price (for profitability tracking)
- Initial and current inventory quantity
- Weight and dimensions (if different from base product)
- SKU-specific images or visual variants
- Active/inactive status for this specific SKU

### 4.3 Variant Pricing Strategy

THE seller MAY apply variant-specific pricing:
- Base price applies to all variants unless overridden
- Each SKU can have a unique price (useful for premium colors, larger sizes, etc.)
- The system SHALL display the price range if SKUs have different prices (e.g., "₹199 - ₹499")
- When showing specific SKU, the SKU-specific price SHALL be displayed

WHEN a seller updates variant pricing, THE system SHALL:
- Update prices immediately for products not yet purchased
- NOT apply new prices to existing pending orders
- Show the price change in the product history

### 4.4 Variant Image Management

THE seller MAY assign specific images to each variant for better product visualization:
- Upload variant-specific images (e.g., blue shirt in blue, red shirt in red)
- Use base product images for variants without specific images
- Drag-and-drop to reorder variant images
- Mark which image is the primary thumbnail for each variant

---

## 5. Seller Inventory Management

### 5.1 Inventory Overview

THE seller SHALL access an inventory management page showing all SKUs for all products with current stock levels.

THE inventory view SHALL display:
- Product name and image
- Variant details (color, size, etc.)
- Current stock quantity in units
- Reorder point (threshold for low stock warning)
- Last stock update timestamp
- Status (in stock, low stock, out of stock)

THE inventory list SHALL be filterable by:
- Product category
- Stock status (in stock, low, out of stock)
- SKU search
- Product name search

### 5.2 Stock Level Management

WHEN a seller needs to adjust inventory, THE system SHALL provide options to:
- Update stock manually (add or subtract units)
- Set precise stock quantity for a SKU
- Upload bulk inventory updates via CSV

WHEN a seller makes an inventory adjustment, THE system SHALL:
- Immediately update the SKU stock quantity
- Create an inventory transaction record with timestamp, reason, and quantity change
- Display the updated inventory in customer-facing product page within 5 minutes

THE seller SHALL be able to view the reason for each inventory adjustment (received stock, correction, damaged items, theft/loss, manual adjustment, etc.).

### 5.3 Low Stock Alerts

THE seller SHALL set a reorder point for each SKU (minimum: 1 unit, default: 10 units).

WHEN a SKU stock falls to or below the reorder point, THE system SHALL:
- Display a warning badge on the SKU in the inventory dashboard
- Send an alert notification to the seller
- Highlight the SKU in red in the inventory list

THE seller SHALL receive automated low stock alerts via email and in-app notification.

### 5.4 Out of Stock Management

WHEN a SKU stock reaches zero, THE system SHALL:
- Automatically set the SKU status to "out of stock"
- Remove the SKU from customer search results and product pages temporarily
- Display "Out of Stock" message on the product page if it's the only variant
- Allow customers to add to wishlist or set up restock notification

WHEN the seller replenishes the out-of-stock SKU, THE system SHALL:
- Automatically update the SKU status to "in stock"
- Notify customers who added it to wishlist
- Re-include it in search results within 5 minutes

### 5.5 Inventory History and Audit Trail

THE seller SHALL access an inventory history report showing:
- All inventory transactions for the past 12 months
- Transaction details: timestamp, SKU, quantity change, reason, user who made the change
- Opening and closing stock balances for each period
- Comparison with previous periods

THE seller MAY export inventory history as CSV for external analysis.

---

## 6. Order Fulfillment and Management

### 6.1 Order Receipt and Confirmation

WHEN a customer places an order containing items from the seller's store, THE system SHALL:
- Create an order record associated with the seller
- Send the seller a notification of the new order
- Display the order in the seller's "New Orders" queue

THE seller SHALL review the order details within 24 hours of order creation.

THE seller SHALL view for each order:
- Order ID and order date
- Customer name, delivery address, and contact details
- List of ordered SKUs with quantities, prices, and totals
- Order total (subtotal, taxes, delivery charges, discounts)
- Payment method and payment status
- Any customer special instructions or notes

### 6.2 Order Acceptance and Processing

THE seller SHALL choose to either accept or reject each new order within 48 hours of order placement.

WHEN the seller clicks "Accept Order", THE system SHALL:
- Update the order status to "confirmed"
- Reserve the inventory quantity from available stock
- Update customer-facing order status to "processing"
- Send the customer a confirmation notification
- Prevent the seller from making conflicting inventory adjustments for these reserved items

IF the seller does not accept or reject within 48 hours, THE system SHALL:
- Automatically display a notification to the seller and admin
- Allow either party to cancel the order if not yet paid

### 6.3 Fulfillment Process

WHEN the seller is ready to ship, THE system SHALL allow the seller to:
- Review the order items and quantities
- Enter the number of parcels/packages for this order
- Select carrier and shipping method (multiple options available)
- Generate shipping labels with customer address

THE seller SHALL be able to view generated shipping labels with:
- Customer delivery address (formatted for carrier requirements)
- Seller return address (pre-filled from seller's registered address)
- Barcode for package tracking
- Weight and dimensions information
- Fragile/special handling indicators if applicable

### 6.4 Shipment and Tracking

WHEN the seller marks an order as "shipped", THE system SHALL:
- Update the order status to "shipped" in customer portal
- Send the customer an SMS/email with tracking number and carrier information
- Provide the seller with tracking status
- Allow the customer to track shipment in real-time

THE seller SHALL update tracking information by:
- Entering carrier tracking number(s)
- Uploading tracking label image
- Confirming shipment date and time

### 6.5 Order Status Communication

THE seller SHALL view all order statuses for their orders:
- **Pending**: Order placed, awaiting seller confirmation
- **Confirmed**: Seller accepted the order
- **Processing**: Seller is preparing items for shipment
- **Shipped**: Order has left seller's location
- **Delivered**: Order received by customer (confirmed by carrier or customer)
- **Cancelled**: Order cancelled by customer or seller
- **Returned**: Order returned by customer, refund initiated

FOR each order status, THE seller SHALL:
- View the timestamp when status changed
- See reason for status change
- Access customer communication related to that status
- Receive notifications of status changes

---

## 7. Seller Performance Metrics and Analytics

### 7.1 Sales Dashboard and Analytics

THE seller SHALL access comprehensive sales analytics showing:
- **Total Sales**: Cumulative sales revenue (current month, current quarter, year-to-date, all-time)
- **Order Count**: Number of orders received (with same period breakdown)
- **Average Order Value**: Mean revenue per order
- **Product Performance**: Top 10 best-selling products by quantity and revenue
- **Category Performance**: Sales breakdown by product category

THE seller SHALL view charts and graphs showing:
- Daily/weekly/monthly sales trends (line chart showing revenue over time)
- Sales by product category (pie chart showing revenue distribution)
- Order count trends (bar chart comparing periods)

THE seller MAY filter analytics by:
- Date range (custom date selection or preset: this week, this month, last 30 days, quarter, year)
- Product category
- Payment method
- Shipping method

### 7.2 Customer Feedback and Ratings

THE seller SHALL access a review management section showing:
- Average seller rating (1-5 stars)
- Number of reviews received (current month, all-time)
- Rating distribution (count of 1-star, 2-star, 3-star, 4-star, 5-star reviews)
- List of recent customer reviews with:
  - Customer name (partially anonymized for privacy)
  - Rating given (1-5 stars)
  - Review text (full review)
  - Product reviewed
  - Review date
  - Customer purchase verification

THE seller SHALL be able to:
- Filter reviews by rating (show only 5-star, only negative reviews, etc.)
- Sort reviews by date (newest first, oldest first)
- Search reviews by product or keyword
- Respond to customer reviews with a seller reply (max 500 characters)

### 7.3 Seller Rating and Reputation

THE seller SHALL view their overall seller rating calculated from:
- **Product Quality Rating**: Average rating from customer reviews for product quality
- **Delivery Speed Rating**: How quickly orders are shipped compared to committed timeframes
- **Customer Service Rating**: Rating based on customer complaints and resolutions
- **Return/Refund Rating**: How fairly returns and refunds are handled

THE system SHALL calculate the **Overall Seller Rating** as a weighted average:
- Product Quality: 40%
- Delivery Speed: 30%
- Customer Service: 20%
- Return/Refund Handling: 10%

THE seller's rating SHALL be displayed on their public storefront and used for:
- Seller ranking in search results (higher-rated sellers ranked higher)
- Customer trust signals
- Platform-level seller badges (e.g., "Trusted Seller", "Top Rated")

### 7.4 Performance Badges and Incentives

THE system SHALL award sellers with performance badges based on metrics:
- **Top Seller**: Seller rating ≥ 4.5 stars AND ≥ 100 orders in current month
- **Trusted Seller**: Seller rating ≥ 4.0 stars AND ≥ 50 orders in current month
- **Fast Shipper**: 90% of orders shipped within 24 hours
- **Quality Seller**: <1% return/refund rate AND rating ≥ 4.3 stars

THESE badges SHALL be displayed on the seller's profile and in search results to boost visibility.

---

## 8. Seller Account Management

### 8.1 Profile and Business Information

THE seller SHALL be able to access and edit their account profile with:
- Business legal name and registration details
- Tax ID / PAN / GST number
- Primary contact person and email
- Business address and correspondence address
- Business description
- Contact phone number
- Business website (optional)
- Social media profiles (optional)

WHEN the seller updates critical business information (legal name, registration, tax ID, address), THE system SHALL:
- Require admin approval before changes take effect
- Notify the admin for review
- Keep the new information in "pending_approval" status during review

### 8.2 Store Customization and Branding

THE seller SHALL access store customization settings to update:
- Store name and display name
- Store logo (image: JPEG/PNG, max 2MB)
- Store banner image (image: JPEG/PNG, max 5MB)
- Store description (up to 500 characters)
- Store policies:
  - Return and refund policy (up to 2000 characters)
  - Shipping policy (up to 2000 characters)
  - Cancellation policy (up to 2000 characters)
- Contact information (email, phone)
- Business hours for customer support
- Store URL slug (e.g., store.platform.com/seller-name)

CHANGES to store customization SHALL be reflected immediately on the seller's public storefront.

### 8.3 Account Security and Access Control

THE seller SHALL manage account security through:
- **Password Management**: Change password, enforce password reset on insecure passwords
- **Two-Factor Authentication (2FA)**: Optional 2FA setup using email OTP or authenticator app
- **Login Activity**: View recent login history with timestamp, device type, IP address, location
- **Active Sessions**: View and terminate active sessions from other devices
- **API Keys**: Generate and manage API keys for third-party integrations (if applicable)

THE seller SHALL receive alerts for:
- Login from new device or unusual location
- Multiple failed login attempts
- Password changes
- Account suspension or restrictions

### 8.4 Seller Preferences and Settings

THE seller SHALL configure:
- **Notification Preferences**: Choose which notifications to receive via email, SMS, or in-app
  - New order notifications
  - Customer review notifications
  - Inventory alerts
  - Payment and payout notifications
  - Account notifications
- **Order Automation** (if applicable):
  - Auto-accept orders based on criteria
  - Auto-reject orders based on criteria
  - Bulk order processing preferences
- **Language Preference**: Interface language selection
- **Timezone**: For accurate order and transaction timestamps

---

## 9. Payment and Financial Management

### 9.1 Payment Settlement Model

THE seller SHALL receive payments through the following settlement model:
- **Transaction**: Customer pays for order
- **Platform Commission**: Platform deducts a commission (percentage varies by category, typically 5-20%)
- **Seller Earnings**: Amount = Order Total - Commission - Applicable Taxes
- **Payout**: Settled amount transferred to seller's bank account

WHEN a seller completes an order (customer receives delivery and confirms receipt), THE system SHALL:
- Calculate commission based on product category
- Deduct platform commission from the order value
- Calculate seller earnings net of commission
- Credit the amount to seller's wallet/account balance

### 9.2 Commission Structure

THE system SHALL apply commission rates based on product category:
- **Electronics**: 15% commission
- **Fashion & Apparel**: 12% commission
- **Home & Kitchen**: 10% commission
- **Sports & Outdoors**: 12% commission
- **Books & Media**: 8% commission
- **Beauty & Personal Care**: 18% commission
- **Toys & Games**: 12% commission
- **Other Categories**: 12% commission (default)

THE seller SHALL be able to view:
- Commission percentage for each product category
- Historical commission rates (if changed)
- How commission is calculated per order

### 9.3 Seller Wallet and Balance

THE seller SHALL view their account balance showing:
- **Current Balance**: Available funds ready for payout
- **Pending Balance**: Funds from orders not yet delivered/confirmed
- **Settled Balance**: Total amount settled/paid out to date
- **Reserved Balance**: Funds held for pending returns or disputes

THE seller SHALL view a detailed transaction ledger showing:
- Each transaction (order payment, commission deduction, refund, payout, adjustments)
- Transaction date and reference ID
- Transaction type (credit, debit, hold, release)
- Amount and balance after transaction
- Status (completed, pending, reversed)

### 9.4 Payout Processing

THE seller SHALL initiate payout requests through the platform:
- Set minimum payout threshold (default: ₹1000, minimum: ₹100, maximum: ₹100,000 per payout)
- Request payout manually (request immediate payout if balance is sufficient)
- View automatic payout schedule (if enabled by admin)

WHEN a seller requests payout, THE system SHALL:
- Verify sufficient balance is available
- Initiate transfer to seller's registered bank account
- Create a payout transaction record with status "initiated"
- Send confirmation to seller with estimated processing time (typically 2-3 business days)

ONCE the payout is processed:
- Update payout status to "completed"
- Notify seller with payout confirmation and receipt
- Display the amount transferred and date received (if available from bank)

### 9.5 Tax and Compliance

THE seller SHALL view tax information:
- Applicable GST (Goods and Services Tax) rate for each product
- TDS (Tax Deducted at Source) if applicable
- Tax-related transaction summaries for accounting

THE system SHALL allow sellers to:
- Download tax-related reports for filing returns
- Generate invoices with tax details
- Access quarterly/annual tax summary

---

## 10. Business Rules and Constraints

### 10.1 Data Validation Rules

WHEN a seller provides product information, THE system SHALL validate:
- **Product Name**: Required, 3-200 characters, alphanumeric and basic punctuation allowed
- **Product Description**: Required, minimum 10 characters, maximum 5000 characters
- **Price**: Required, numeric, minimum ₹1, maximum ₹999,999, no negative values
- **Category Selection**: Required, must be a valid category from the catalog
- **Images**: Minimum 1 image, maximum 10 images, JPEG/PNG format, maximum 5MB per image
- **Dimensions and Weight**: Numeric values, no negative numbers, realistic ranges for product type
- **SKU**: Alphanumeric, maximum 50 characters, unique within seller's product catalog

WHEN a seller provides business information during registration, THE system SHALL validate:
- **Business Name**: Required, 2-200 characters
- **Tax ID**: Format validation based on country (e.g., 10-digit PAN for India, 15-digit GSTIN)
- **Bank Account**: Format validation based on bank (e.g., 9-18 digits for Indian accounts)
- **Email**: Valid email format
- **Phone**: Valid phone format with country code

### 10.2 Business Logic Constraints

THE seller SHALL NOT be able to:
- Delete products that have active orders or pending returns
- Change product category after receiving orders (only allow with admin approval)
- List counterfeit or unauthorized products (subject to admin verification)
- Create duplicate products (system checks for similar products with warning)
- Misuse platform for services or intangible goods (allowed items: physical products only)

WHEN a seller's account is suspended, THE system SHALL:
- Prevent them from creating or editing products
- Prevent them from accepting new orders
- Allow them to view existing orders and handle current fulfillment
- Allow them to view their historical data and analytics

### 10.3 Order and Inventory Constraints

THE seller SHALL NOT be able to:
- Accept orders where inventory is insufficient (system prevents this)
- Set negative inventory quantities
- Reduce inventory below reserved quantities for pending orders

WHEN a seller has confirmed an order, THE system SHALL:
- Lock the inventory quantity reserved for that order
- Prevent selling that inventory to other customers
- Allow cancellation with automatic inventory release if seller cancels

### 10.4 Review and Rating Policies

THE system SHALL enforce:
- Customers can only review products they have purchased
- Reviews can only be submitted after delivery confirmation
- One review per customer per product
- Reviews cannot be edited after submission (seller can respond but cannot alter customer review)
- Ratings must be 1-5 stars (whole numbers only)
- Review text is limited to 1000 characters

THE system SHALL prevent:
- Fake reviews (system detects suspicious patterns like multiple reviews from same IP)
- Manipulative reviews (negative reviews from competitors, positive reviews from friends)
- Profane or abusive language in reviews (flagged for moderation)

### 10.5 Error Handling and Edge Cases

IF a seller uploads a product image that is corrupted or invalid, THE system SHALL:
- Reject the image with a clear error message
- Allow the seller to re-upload the image
- Not block the product creation process if other images are valid

IF a seller receives a return request after already shipping, THE system SHALL:
- Allow the seller to process the return if within the return window
- Track the return shipment and refund status
- Update inventory when the return is received and verified

IF there is a discrepancy between seller's inventory records and actual physical inventory, THE system SHALL:
- Allow manual adjustment with audit trail
- Flag large discrepancies (>50% variance) for admin review
- Notify seller of significant variances for investigation

IF a seller's payout fails (bank account invalid, bank rejects transfer), THE system SHALL:
- Notify the seller immediately
- Return the funds to seller's wallet/balance
- Request updated bank account information
- Retry the payout after bank details are corrected

### 10.6 Concurrent Operation Safety

THE system SHALL handle concurrent seller actions safely:
- If two sellers try to use the same SKU simultaneously, THE system SHALL prevent duplicates
- If seller tries to adjust inventory while order is being confirmed, THE system SHALL use database locking to ensure consistency
- If seller tries to cancel order while customer is viewing same order, THE system SHALL resolve conflict with last-update-wins strategy

---

## 11. Seller Communication and Support

### 11.1 Customer Communication

THE seller SHALL be able to:
- View messages from customers (inquiries about products, orders, specifications)
- Send replies to customer inquiries
- Set up canned responses for frequently asked questions
- View message history for each customer

WHEN a customer sends a message to the seller, THE system SHALL:
- Notify the seller in real-time
- Display message in seller's dashboard
- Require seller response within 24-48 hours (configurable by admin)
- Track response time metrics for seller rating

### 11.2 Admin Communication

THE seller SHALL receive direct notifications from admins regarding:
- Policy violations or quality issues with products
- Account suspension or warnings
- Promotional opportunities
- System maintenance or updates

THE seller SHALL be able to:
- View messages from platform admins
- Submit appeals or requests to admin for issues
- Provide feedback or suggestions to the platform team

---

## 12. Success Criteria and Performance Expectations

THE seller management system SHALL be considered successful when:

1. **Seller Onboarding**: New sellers can complete registration and verification within 2-3 business days
2. **Product Management**: Sellers can create and list a product with all variants within 10 minutes
3. **Order Processing**: Sellers receive and process new orders within 2 hours
4. **Inventory Accuracy**: Real-time inventory updates reflect immediately in customer-facing product pages
5. **Payment**: Seller payouts are processed accurately and delivered within stated timeframes (2-3 business days)
6. **Satisfaction**: Seller rating system accurately reflects customer satisfaction and operational performance
7. **Analytics**: Performance metrics are updated in real-time to provide actionable insights
8. **Communication**: Seller notifications are delivered within 5 minutes of triggering event

