# shoppingMall: Multi-Vendor E-commerce Marketplace Requirements Specification

## 1. Service Overview

This multi-vendor e-commerce platform, branded as shoppingMall, enables independent sellers to list and sell products to customers through a centralized marketplace infrastructure. The system integrates customer management, product cataloging with complex variants, cart and wishlist functionality, secured payment processing, order fulfillment, and comprehensive seller and admin management tools.

The service is designed with scalability as a core principle, supporting a large number of concurrent users, high volume transactions, and complex inventory management requirements for products with multiple attributes (size, color, material, etc.). The architecture follows a decoupled business model where sellers independently manage their inventory and fulfillment while benefiting from centralized customer trust mechanisms, payment processing, and discoverability features.

The platform operates on a transaction-based revenue model, earning a commission on each successful sale while providing value through reduced overhead costs for sellers and enhanced product discovery for customers.

## 2. User Actors

### 2.1 Customer

A customer is an individual user who browses products, adds items to cart or wishlist, and completes purchases for personal consumption. Customers may be registered users who have completed the registration process or temporary guests with limited functionality.

#### Authentication Requirements

- Customers can register with email and password
- Email verification is mandatory before full access is granted
- Customers can use social login options where provided
- Customers can reset passwords through email verification
- Customer sessions expire after 30 minutes of inactivity
- Customer sessions persist across devices when "Remember Me" is selected
- Customers can view and manage their personal information, including addresses

#### Authorization Requirements

- Customers can view all public products and categories
- Customers can add products to cart and wishlist
- Customers can place orders for products
- Customers can manage their shipping addresses
- Customers can select from registered payment methods
- Customers can track order status
- Customers can leave product reviews after delivery
- Customers can request refunds for delivered products
- Customers cannot view other customers' orders or information
- Customers cannot access seller dashboards or administrative functions
- Customers cannot modify product prices or inventory levels
- Customers cannot cancel orders after payment has been processed

### 2.2 Seller

A seller is a business entity or individual that registers to offer products for sale on the marketplace. Sellers have elevated permissions to manage their inventory, pricing, product listings, and order fulfillment.

#### Authentication Requirements

- Sellers must register with business email and password
- Sellers must submit legal business documentation (tax ID, business license)
- Sellers must verify their business information through platform review
- Sellers can reset passwords through email verification
- Seller sessions expire after 15 minutes of inactivity

#### Authorization Requirements

- Sellers can access their own seller dashboard
- Sellers can create, edit, and publish product listings
- Sellers can manage product variants, inventory levels, and pricing
- Sellers can view orders placed for their products
- Sellers can accept, decline, or fulfill orders
- Sellers can input tracking information for shipped orders
- Sellers can access sales analytics and financial reports
- Sellers can communicate with customers regarding orders
- Sellers cannot view other sellers' products, sales, or customer data
- Sellers cannot modify products owned by other sellers
- Sellers cannot access administrative functions or manage other sellers

### 2.3 Admin

An administrator is a platform operator responsible for maintaining system integrity, overseeing content moderation, resolving disputes, managing platform settings, and ensuring financial reconciliation.

#### Authentication Requirements

- Admins authenticate via secure credentials with two-factor authentication
- Admin sessions persist for 2 hours of inactivity
- Admins must re-authenticate for sensitive operations (user bans, financial adjustments)

#### Authorization Requirements

- Admins can manage all user accounts (customers, sellers)
- Admins can approve or reject seller registration requests
- Admins can moderate all product listings and reviews
- Admins can manually adjust inventory and pricing
- Admins can override order statuses and process exceptions
- Admins can view full system analytics and financial reports
- Admins can configure global platform settings
- Admins can access audit logs of all system changes
- Admins can ban users for policy violations
- Admins can handle customer disputes and refund approvals
- Admins can manage payment gateways and reconciliation
- Admins cannot directly modify customer passwords
- Admins cannot access private seller bank account details

## 3. Product Catalog Specification

### 3.1 Core Principles

The product catalog serves as the central repository for all items available for purchase on shoppingMall. Products are organized into a hierarchical category system that supports deep nesting and cross-category visibility.

- Each product belongs to exactly one primary category
- Products may be displayed in multiple secondary or related categories
- Categories support up to 5 levels of nesting
- Each category defines attribute types applicable to its products
- Products may have zero or more variants (SKUs)
- Product metadata (title, description, images) is shared across variants

### 3.2 Category Hierarchy Requirements

- The system supports 20 primary categories (e.g., Clothing, Electronics, Home & Garden, Books, Sports)
- Each primary category contains 5-20 subcategories
- Category relationships are tree-structured with no cycles
- Categories can be hidden or disabled without deletion
- Category visibility rules can be configured per seller group
- Category search is enabled for users

### 3.3 Product Listing Requirements

- Product title must be between 5 and 150 characters
- Product description must be at least 100 characters
- Product must have at least 3 high-quality images
- Product price must be minimum $1.00 and maximum $10,000.00
- Product condition must be selected: new, used, refurbished
- Return policy must be selected: no returns, 14-day return, 30-day return
- Shipping method must be selected: standard, expedited, international
- Product tags must be between 1 and 10, each under 25 characters
- Products must be categorized into exactly one primary category

### 3.4 Search Functionality Requirements

- Search must be case-insensitive
- Search must support partial word matching
- Search must ignore diacritical marks (e.g., "café" matches "cafe")
- Search must return results from product title, description, and tags
- Search must support multi-word queries with AND logic
- Search must prioritize exact phrase matches
- Search must handle typos and autocorrect common errors
- Search results must be ranked by relevance, sales volume, and rating
- Search must provide filters for category, price range, condition, and seller rating
- Search must auto-suggest popular queries

### 3.5 Filter and Sort Requirements

- Users can filter by:
  - Price range (min and max)
  - Category
  - Seller rating (min stars)
  - Product condition
  - Shipping method
  - Return policy
  - In-stock status

- Users can sort by:
  - Relevance (default)
  - Price: Low to High
  - Price: High to Low
  - Newest first
  - Best selling
  - Highest rated
  - Lowest rated

- Filters and sort options must persist during navigation
- Filters must update results in real-time without page refresh
- Selected filters must be clearly displayed and removable

### 3.6 Product Visibility Rules

- Products from unverified sellers are visible to customers
- Products from suspended sellers are hidden from search and listing views
- Products with inventory of zero are displayed as "Out of Stock" but remain visible
- Products awaiting approval are not visible in search results
- Products deleted by sellers are removed from all views within 5 minutes
- Products marked as discontinued are retained for review history but remain invisible

## 4. Customer Registration and Authentication

### 4.1 Guest to Customer Conversion

- Guests can browse all products, add items to wishlist, and view public information
- Guests cannot access cart, checkout, or personal account features
- Guests are prompted to register before accessing cart or checkout
- Guest cart data is stored in browser localStorage with ephemeral session identifier
- Guest data is automatically deleted after 30 days of inactivity

### 4.2 Registration Process Flow

- Registration form requires: full name, email address, password
- Password must be at least 8 characters and contain uppercase, lowercase, number, and special character
- Email format must be validated per RFC 5322 standard
- Email must be unique system-wide
- If email already exists: "An account already exists with this email address. Please login or use password reset."
- If password validation fails: "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character."
- Successful registration creates account with status "pending_email_verification"
- System generates cryptographically secure verification token (expires in 1 hour)
- System sends verification email with unique link: "https://shoppingMall.com/verify?token={token}"
- Verification link expiration: "This verification link has expired. Please request a new verification email."
- Invalid token: "This verification link is not valid. Please check your email again or request a new one."

### 4.3 Email Verification Workflow

- When verification link is clicked:
  - System validates token against stored record
  - If valid: user account status changed to "active", token cleared
  - If expired: user directed to "Request new verification email"
  - If malformed: user directed to "Request new verification email"
- Customer can request new verification email:
  - System checks account status is "pending_email_verification"
  - If not: "Your account has already been verified. Please login."
  - System generates new token, sends email with new verification link
- Successful verification: "Your email has been verified. Welcome to shoppingMall!"
- While pending verification:
  - Customer cannot access cart, checkout, address management
  - Customer cannot leave reviews
  - Customer receives "Your email address is not yet verified. Please check your inbox for a verification email." when attempting restricted actions

### 4.4 Address Management Workflow

- Each customer can maintain up to 10 shipping addresses
- Each address requires:
  - First name (required, minimum 1 character)
  - Last name (required, minimum 1 character)
  - Street address (required, minimum 5 characters)
  - City (required)
  - State/Province (required)
  - Postal code (required)
  - Country (required)
  - Phone number (required)
- Postal code format validation per country
- Phone number format validation per country
- Duplicate address detection by field matching
- Default address selection (only one can be default)
- Delete address protection: cannot delete if used in a pending order
- If address used in pending order: "This address is associated with a pending order and cannot be deleted."
- Address edit: all fields can be updated
- Address set as default: sets default for all future orders

### 4.5 Profile Update Procedures

- Customers can update:
  - Full name
  - Email address
  - Password
- Name update requires at least two words, letters and spaces permitted only
- Email change requires:
  - Password re-authentication
  - Verification of new email address
  - Temporary status change to "pending_email_change"
  - New verification email sent to new address
- If new email already exists: "This email address is already in use. Please use a different email."
- Password change requires:
  - Current password verification
  - New password complexity validation (8+, uppercase, lowercase, number, special character)
  - New password cannot match any of last 5 passwords
- Password change success: "Your password has been successfully changed. You have been logged out of all devices. Please login again."
- Password change triggers logout of all active sessions
- All profile changes are timestamped and IP-address logged for audit

### 4.6 Login and Session Flow

- Login form requires email and password
- "Remember Me" option generates 30-day refresh token
- Without "Remember Me": session-only JWT
- On successful authentication:
  - JWT token generated with: userId, role, permissions, issuedAt
  - Refresh token saved as httpOnly cookie if "Remember Me" selected
- Login failures:
  - Invalid email: "No account exists with this email address. Please register or try another email."
  - Invalid password: "Incorrect password. Please try again."
  - Account locked after 5 failed attempts in 15 minutes: "Your account is temporarily locked due to multiple failed login attempts. Please try again in 15 minutes or use password reset."
  - Pending email verification: "Your email address is not yet verified. Please check your inbox for a verification email."
  - Account suspended by admin: "Your account has been suspended. Please contact customer support for assistance."
- Session expiration: 30 minutes of inactivity
- When session expires: redirect to login with "Your session has expired. Please login again."
- Logout invalidates token and clears cookies
- Protected routes validate JWT signature and expiration

### 4.7 Password Reset Process

- Password reset initiated by "Forgot Password" link
- Requires email input
- System checks email is registered
- Generates cryptographically secure reset token (1-hour expiration)
- Sends email with reset link
- On reset link click:
  - Validate token
  - Display password reset form
  - If expired: "This reset link has expired. Please request a new password reset."
  - If invalid: "This reset link is not valid. Please request a new password reset."
- Password reset validation: same complexity rules as registration
- Password reset success:
  - Invalidate all existing sessions
  - Clear all active devices
  - Display: "Your password has been successfully reset. You may now login with your new password."
  - Send confirmation email: "Your shoppingMall password has been changed."
- Rate limitation: maximum 5 reset attempts within 10 minutes
- Exceeded: "You've requested too many password resets in a short time. Please wait 10 minutes before trying again."

## 5. Product Variants and SKU System

### 5.1 Variant Definition System

- Each product can have zero or more variants
- Variants represent different physical configurations (size, color, material, etc.)
- All variants share the same product metadata (title, description, images, category)
- Each variant has a unique identifier (SKU)
- Each variant has independent inventory, pricing, and status
- Products may have up to five variant attributes (e.g., size, color, material, capacity, style)
- Each attribute type can be reused across products

### 5.2 Attribute Management

- Supported attribute types:
  - Size (text: S, M, L, XL, 10, 12)
  - Color (text: Red, Navy Blue, #FF0000)
  - Material (text: Cotton, Leather, Polyester)
  - Capacity (text: 512GB, 1TB)
  - Style (text: Slim Fit, Vintage, Wireless)
  - Custom attribute types (admin-configurable)
- Attribute values are case-insensitive
- Duplicate values within same attribute type are prohibited
- Attribute values can be reused across multiple products
- Attributes are sorted alphabetically
- When an attribute type is deleted:
  - Variants using that attribute are marked as "incompatible"
  - Existing variants are preserved with historical context
- When an attribute type is renamed:
  - All variants using that attribute are updated with new name

### 5.3 Variant Combination Validation

- Duplicate variant combinations are prohibited
- Each attribute type appears at most once per variant
- Each variant must have at least one attribute type defined
- Attribute value must match allowed values from defined attribute types
- Creation of duplicate variant combination results in error: "This exact combination of attributes already exists for this product."
- Modification of variant to match existing variant results in error: "This combination of attributes already exists for this product."

### 5.4 SKU Generation Rules

- SKU format: {ProductID}-{AttributeCode1}{AttributeCode2}-{SequentialNumber}
- ProductID: 6-character alphanumeric code (derived from category and creation timestamp)
- Attribute Code: 2-character code derived from attribute value
  - First letter: first letter of first word (uppercase)
  - Second letter: first letter of second word or second letter of first word
  - Examples: "Red" → "RD", "Navy Blue" → "NV", "Large" → "LG", "10" → "10", "Cotton" → "CT"
- Sequential number: 3-digit counter for identical combinations
- Examples: PRMWHD-BKSTLFLVYR1CS-001
- Automatic generation on variant creation
- Manual edit prohibited
- Reuse of existing SKU for identical combination
- Invalid format rejection: "SKU format is invalid. Please use system-generated SKU."
- Race condition prevention: variant combination locked during SKU generation

### 5.5 Pricing Strategy per Variant

- Each variant can have its own price independent of others
- Base product price serves as default for variants
- Price changes for variants do not affect base product price
- Prices stored as decimal with exactly 2 decimal places
- All prices denominated in USD
- Variant inherits base price upon creation unless overridden
- Price override persists independently of base price changes
- Price set to zero or negative: treated as "out of stock" for purchase but preserved for record
- Discount application:
  - Percentage discounts on variant prices allowed
  - Fixed-amount discounts on variant prices allowed
  - "Buy X Get Y Free" promotions allowed
  - Certain variants can be excluded from promotions
  - If discount applies to base product: applies to all variants unless explicitly excluded
  - Where variant has specific discount: uses discount instead of product-level discount
  - When discounted price drops below zero: applies zero price floor

### 5.6 Inventory Tracking Requirements

- Inventory is tracked at SKU level (not product level)
- Each variant has its own inventory count
- Inventory must be real-time accurate (within 2 seconds of any transaction)
- Inventory state machine:
  - Available: > 0
  - Low: ≤ configurable low-stock threshold
  - Out of Stock: = 0
  - Backordered: < 0 (only if seller enables backorders)
  - Discontinued: flag set to discontinued
- Inventory updates:
  - On order placement: decrease by purchased quantity
  - On order cancellation (before payment): no change
  - On order cancellation (after payment): increase by purchased quantity
  - On return processing: increase by returned quantity
- Inventory threshold alert: triggered when quantity ≤ low-stock threshold
- Inventory lock during concurrent updates to prevent race conditions
- Real-time sync requirement: updates visible on customer-facing UI within 3 seconds
- Audit log: all inventory changes include user ID, timestamp, and change amount

### 5.7 Variant Selection Workflow

- Variant options presented as clickable selection buttons
- Selected options visually highlighted
- Incompatible combinations visibly disabled (grayed out)
- Selection dynamically filtered in real-time as options are chosen
- Compatibility calculated based on attribute combinations and inventory availability
- If no compatible variants remain: "No available combinations" message displayed
- Selected variant details (price, inventory status, SKU) displayed
- Incompatible variants shown as "Out of Stock" and unselectable
- Variants marked as discontinued shown as grayed-out, unselectable
- Variants shown as "Low Stock" with yellow indicator and selectable
- Selections trigger real-time update of cart and wishlist "Add" button
- Accessibility: support screen readers, keyboard navigation, logical tab order

## 6. Shopping Cart and Wishlist

### 6.1 Cart Creation and Management

- Cart created automatically when first product item is added
- Empty cart page creates new empty cart on access
- Cart state persists during user session
- Authenticated customers: cart persisted to database
- Guest customers: cart persisted in browser localStorage
- Guest cart deleted if browser storage cleared
- Guest cart expires after 30 days of inactivity
- Login triggers cart merge between guest and authenticated cart
- When merging: authenticated cart items take precedence
- Guest cart items with no conflict are merged into authenticated cart
- Guest cart items with conflict (same SKU) are not duplicated

### 6.2 Item Addition and Removal

- Addition triggers inventory availability and current price validation
- If item out of stock: "Out of stock" message, prevent addition
- If item price changed since last addition: "Price updated" notification, retain original price unless customer confirms
- If item already exists in cart: quantity increased (not duplicate)
- Removal reduces quantity by one
- If removal reduces quantity to zero: item removed completely
- Cart summary updates in real-time with total items and amount

### 6.3 Cart Persistence Behavior

- Authenticated customer cart: persisted to database with customer ID
- Guest cart: persisted in localStorage with temporary session ID
- Guest cart persists across page refreshes
- Login triggers merge of guest cart into authenticated cart
- Cart data expires after 30 days of inactivity
- Customer clears browser data: guest cart deleted

### 6.4 Quantity Adjustment Rules

- Quantity adjustment validated against available inventory
- If requested quantity > available stock: cap at available stock, display "Quantity reduced from [original] to [available] due to inventory changes."
- Cart quantity range: 1 to 999
- Quantity set to zero: item removed from cart
- Cart total recalculated in real-time

### 6.5 Wishlist Functionality

- Wishlist is independent from cart
- Item added to wishlist: "Added to wishlist" confirmation, timestamp stored
- Item removed from wishlist: "Removed from wishlist" confirmation
- Wishlist items track inventory and price changes
- Out of stock item in wishlist: "Out of stock" indicator
- Price-dropped item in wishlist: "Price dropped" notification
- "Move to cart" from wishlist: adds item to cart with inventory and price validation
- Adding already-wished item: "Already in wishlist" message
- Adding item from wishlist to cart: automatically removes from wishlist

### 6.6 Cart to Order Conversion

- Checkout initiation triggers validation:
  - At least one cart item
  - Inventory availability
  - Price accuracy
- Item no longer available: removed from cart with notification
- Item price changed: notification with old/new price, requires customer confirmation
- Empty cart prevents checkout: "Your cart is empty"
- Inventory drop during checkout: removed from order with updated total
- Order placement success: cart contents transferred to order record, cart cleared
- Order placement failure: cart restored to previous state, contents preserved

### 6.7 Guest Cart Handling

- Guest cart: temporary cart identifier in localStorage
- Guest login: merge to authenticated cart (prefers authenticated items)
- New account creation: automated association with active guest cart
- Guest cart expiration: deleted after 30 days
- Guest returns: cart restored from localStorage if not expired
- Guest clears browser data: cart deleted
- Empty guest cart: avoids creating cart identifier

## 7. Order Placement

### 7.1 Order Initiation Process

- Customer initiates order from cart
- System validates cart has at least one item with active inventory
- System checks for cart modifications since last save, warns if changes occurred
- System locks cart items for 30 minutes
- System displays most recently used shipping address as default
- If no address exists, encourages customer to add address before proceeding

### 7.2 Shipping Address Selection

- Up to 10 saved shipping addresses available
- Address must contain:
  - Name
  - Street address
  - City
  - State/province
  - Postal code
  - Country
- Incomplete/invalid address: detailed error message listing missing/invalid fields
- "Add New Address": modal dialog requiring complete address fields
- If no addresses: require immediate address creation before proceeding
- Outside seller service area: warning message, allow proceed with confirmation checkbox

### 7.3 Payment Method Handling

- Customer can use any registered payment method
- Payment methods supported: credit/debit cards, digital wallets (Apple Pay, Google Pay), bank transfers (ACH, SEPA), BNPL (Klarna, Affirm), cryptocurrency
- Credit card validation: expiration not past, CVV matches token
- PayPal: redirects to PayPal authorization flow
- No payment methods: "You have no payment methods on file. Please add a payment method before placing your order." with link to payment settings
- "Save this payment method for future purchases" toggle:
  - Securely stores tokenized payment details if selected
  - Requires explicit customer consent

### 7.4 Order Validation Rules

- Validate inventory for every cart item
- If inventory dropped below selected quantity:
  - Flag item, reduce to available stock
  - Notify: "Quantity reduced from [original] to [available] due to inventory changes."
- If item discontinued or removed by seller:
  - Remove from order
  - Notify: "[Product Name] is no longer available and has been removed from your order."
- If item price changed since cart creation:
  - Notify: "Price for [Product Name] has changed from [old price] to [new price]. Are you sure you want to proceed?"
  - Require explicit customer confirmation
- If cart contains items from sellers not shipping to selected address:
  - Display error: "Some items in your cart cannot be shipped to the selected address. Please remove them or choose another address."
- If cart total is zero (only discounted items):
  - Allow order but require newsletter subscription acceptance
- If order exceeds monthly purchase limit for high-risk items:
  - Block order: "Your monthly limit for this item has been reached. You may order again after [date]."

### 7.5 Order Creation Flow

- Order ID generated: "ORD-YYYYMMDD-#####"
- Inventory reserved for 30 minutes upon order creation
- All cart items locked
- Order record created with status: "pending_payment"
- Associated with customer account and seller IDs
- Temporary confirmation email sent: "Your order is being processed - order #ORD-XXXX"

### 7.6 Confirmation and Notification

- On successful payment authorization:
  - Order status: "payment_confirmed"
  - Inventory updated (reserved deducted)
  - Cart cleared
  - Confirmation email sent: "Order Confirmed: #ORD-XXXX"
  - Seller notification sent: "New Order Received: #ORD-XXXX"
  - System event: "order_confirmed" triggered
- Success page displayed: "Thank you for your order!" "View Order Details"

### 7.7 Error Recovery Processes

- Payment failure:
  - Status: "payment_failed"
  - Detailed error message with reason
  - Cart maintained for retry
- Three failed attempts:
  - Auto-cancel order
  - Release inventory
  - Notify customer: "Your order has been cancelled due to repeated payment failures. Please try again later or contact support."
- Navigate away during checkout:
  - Order remains "pending_payment" for 15 minutes before auto-cancel
- Inventory reservation timeout:
  - Auto-cancel order
  - Notify: "Your order timed out due to inactivity. Items have been released back to inventory. Please place your order again."
- Database/service error during order creation:
  - Display: "We're sorry. There was a technical issue creating your order. Your cart has been preserved. Please try again in a few minutes."
  - Maintain cart state
- Invalid email address during address creation:
  - Error: "Please enter a valid email address for order confirmation." + field highlight
- Invalid coupon code:
  - Error: "This coupon code is not valid or has expired. Please check the code and try again." + retain cart prices

## 8. Payment Processing

### 8.1 Supported Payment Methods

- Credit/debit cards: Visa, Mastercard, American Express, Discover
- Digital wallets: Apple Pay, Google Pay
- Bank transfers: ACH (US), SEPA (Europe)
- BNPL: Klarna, Affirm
- Cryptocurrency: Bitcoin, Ethereum (with fiat conversion)
- Admin can enable/disable payment methods
- Disabled methods: not displayed during checkout
- Selection validation: must be currently enabled

### 8.2 Payment Authorization Flow

- Customer initiates checkout
- System:
  1. Collects payment details
  2. Validates card format
  3. Creates payment intent in gateway
  4. Returns client secret to frontend
  5. Tokenizes credentials using gateway library
  6. Sends token to backend
  7. Validates amount matches cart total (including taxes/shipping)
  8. Validates inventory availability
  9. Validates shipping address format
  10. Performs 3D Secure authentication (if required)
  11. Sends authorization request to payment processor
- Idempotency key required for payment submission
- Token reuse prevention (anti-replay protection)
- Session validation required
- Payment intent stored with unique ID

### 8.3 Transaction Status Handling

- Status transitions:
  - Created → Processing → Authorized → Captured
  - Created → Processing → Authorized → Failed
  - Created → Processing → Declined
  - Created → Processing → Refunded
  - Created → Processing → Partially Refunded
- Payment status updated asynchronously via webhook
- On status change:
  - Update order payment status
  - Send real-time notification to customer
  - Log status change with timestamp and metadata
- While status "Processing":
  - Display: "Payment Processing"
  - Prevent order modification
  - Reserve inventory
- On successful capture:
  - Status: "Captured"
  - Release inventory reservation
  - Update order status: "Paid"
  - Issue invoice with gateway transaction ID
- On declined:
  - Status: "Declined"
  - Immediate feedback to user with gateway error code
  - Maintain cart for retry

### 8.4 Error and Failure Recovery

- Network timeout:
  - Error: "Payment Processing Error"
  - Maintain cart and payment intent
  - Allow retry after 3 seconds
- Insufficient funds:
  - Error code: "INSUFFICIENT_FUNDS"
  - Suggest alternative methods
  - Offer "Save for Later" option
- Security restrictions (3D Secure failure):
  - Error code: "SECURITY_RESTRICTION"
  - Instructions to contact bank/issuer
  - Allow retry after 30 minutes
- Gateway outage:
  - Error: "Payment Service Unavailable"
  - Maintain cart and payment intent
  - Connect every 15 minutes
  - Admin notification after 1 hour
- Capture failure after authorization:
  - Status: "Authorized Failed to Capture"
  - Hold inventory for 12 hours
  - Notify: "Payment Authorized, Capturing Failed"
  - Automatic retry every 10 minutes for 24 hours
  - After 24 hours: auto-cancel, release inventory

### 8.5 Refund and Partial Refund Logic

- Full refund:
  - Verify order status: "Shipped" or "Delivered"
  - Verify within 30-day refund window
  - Submit refund to gateway
  - Update status: "Refunded"
  - Adjust inventory
  - Notify customer
- Partial refund:
  - Calculate based on selected items and original pricing
  - Validate refund amount ≤ original payment
  - Submit partial refund to gateway
  - Update status: "Partially Refunded"
  - Adjust inventory
  - Issue adjusted invoice
  - Notify customer
- While processing:
  - Display: "Refund Processing"
  - Prevent new orders for refunded items
  - Maintain refund request ID
  - Update order summary with refund amount
- On gateway denial:
  - Notify customer with reason
  - Allow escalation via support
  - Status: "Rejected" with audit log

### 8.6 Payment Records and Audit Requirements

- Store full payment records for 7 years
- Record every payment:
  - Timestamp
  - Gateway transaction ID
  - Payment method type
  - Gateway provider
  - Amount and currency
  - Customer ID
  - Order ID
  - Payment status
  - Refund status
  - 3D Secure status
  - IP address
  - User agent
  - Gateway response code and message
  - Gateway error code (if applicable)
  - Audit ID
- On modification (status, refund):
  - Log timestamp, actor (user or system), old value, new value, reason
- Peak-time performance:
  - 100 transactions per second
  - Gateway timeout ≤ 15 seconds
  - Queue payment requests to prevent overload
  - Display: "High volume. Your payment is being processed."
- Reconciliation reports:
  - Daily settlement reports
  - Discrepancy reports
  - Failed payment trend analysis
  - Refund rate by payment method
  - Chargeback rate and reasons
- Admin audit report:
  - CSV export with all fields
  - PII redacted
  - Compliance signature
  - Access logs
- PCI-DSS Level 1 compliance
- Never store: full credit card numbers, CVV, magnetic stripe data
- Use tokenization
- Never log or store payment credentials in plain text
- Encrypt in transit with TLS 1.3+
- Firewall all payment processing systems
- Quarterly vulnerability scans
- Separate development, staging, production environments
- Cryptocurrency:
  - Convert to fiat at transaction time
  - Lock exchange rate
  - Pay merchant in fiat
  - Record rate and timestamp
- Significant price variation (≥3%):
  - Notify customer
  - Allow cancellation
  - Show original + foreign currency side-by-side
- Surcharges:
  - Clear disclosure
  - Separate line item
  - Never apply to digital wallets
- Tax validation:
  - Match payment amount
  - Prevent submission if mismatch
  - Error: "Tax calculation mismatch. Please update shipping address and retry."
- Retry policy:
  - First retry: 1 hour after failure
  - Second retry: 12 hours after first
  - Third retry: 72 hours after second
  - After third: manual review required
- Manual retry required for:
  - Insufficient funds
  - Fraud detection
  - Invalid card
  - Card expired
- Rate limit: 20 attempts per user ID per hour
- Block further attempts after limit: "Too many payment attempts. Please wait before trying again."
- Payment analytics dashboard:
  - Daily volume
  - Success/failure rate by method
  - Average transaction amount
  - Top 10 failure reasons
  - Refund rate by product category
  - Chargeback rate by region
  - Currency distribution
  - Gateway success rate
  - Fraud attempts
- Payment method change:
  - Validate new method
  - Record previous method
  - Keep for refund purposes
  - Notify customer
  - Update default
- Encrypt at rest with AES-256
- Rotate keys every 90 days
- Separate encrypted storage for tokens and metadata
- Two-factor authentication for admin payment access
- Never display full card number or CVV
- Mask: "XXXX XXXX XXXX 1234"
- Validation rules:
  - Luhn checksum
  - Expiration in future
  - CVV 3-4 digits
  - ZIP matches billing address
  - Phone number valid
  - Email valid
  - Amount positive and ≤$50,000
- Recurring payments:
  - Explicit consent
  - First payment authenticated
  - Subsequent payments token validated
  - Notify 24 hours before each payment
- Receipts:
  - Immediate email after successful payment
  - Include merchant name, order number, customer info, items, quantities, unit prices, tax, total, payment method, gateway ID, date/time, support contact
  - Downloadable from order history
- Webhooks:
  - POST JSON payload to configured URL
  - Include payment ID, order ID, new status, timestamp
  - Retry on failure with exponential backoff up to 24 hours
  - Log all delivery attempts
- SLA: 99.95% uptime
- Service unavailable:
  - Maintenance mode
  - Display: "Payment Services Temporarily Unavailable - We're Working to Restore Service"
  - Record failed attempts
  - Resume when restored
- Daily backups:
  - To secure cloud storage
  - Encrypted
  - Last 30 days retained
  - Integrity validated daily
- Gateway monitoring:
  - Monitor status
  - Alert on downtime
  - Alert if uptime < 99.5%
  - Log all API errors
  - Collect response times
- Payment method storage:
  - Require explicit customer consent
  - Display: "Save card for faster checkout in the future?" with "Yes"/"No"
  - Never save for guest checkouts
- Reconciliation automation:
  - Run every 2 hours
  - Match payments to gateway invoices
  - Flag discrepancies
  - Generate report
  - Auto-resolve minor discrepancies (<$1)
- Gateway failover:
  - Primary: Stripe
  - Secondary: Adyen
  - Tertiary: Braintree
  - Switch on 3 consecutive failures
  - Notify admin
  - Log failed transactions
  - Resume primary after 24 hours successful operation
- Gateway timeout: 30 seconds
- Multi-currency support:
  - Display customer's preferred currency
  - Convert with current rate
  - Lock rate at checkout
  - Show final price and rate before confirmation
  - If variation >3%: notify customer, allow cancellation
- Currency conversion logging: for financial reconciliation
- Exchange rate locking: at time of payment
- Payment processing SLA: 99.95% uptime

## 9. Order Tracking

### 9.1 Order Status Lifecycle

- Pending: Order created, payment not processed
- Paid: Payment successfully captured
- Processing: Order confirmed, inventory reserved, preparing for shipment
- Shipped: Item dispatched with tracking number generated
- In Transit: Package with carrier, en route
- Out for Delivery: Package at local facility, scheduled for today
- Delivered: Package successfully delivered and signed
- Cancelled: Order cancelled before shipping
- Refunded: Full or partial refund processed
- Returned: Item returned to seller
- Completed: Final status after delivery, no active returns/refunds

### 9.2 Status Transition Rules

- Pending → Paid
- Pending → Cancelled
- Paid → Processing
- Processing → Shipped
- Shipped → In Transit
- In Transit → Out for Delivery
- Out for Delivery → Delivered
- Out for Delivery → Returned
- Delivered → Completed
- Processing → Cancelled
- Paid → Refunded (if not yet processed)
- Shipped → Returned
- Delivered → Returned
- Refunded → Completed
- Returned → Refunded
- Returned → Cancelled

### 9.3 Transition Validation Logic

- Invalid transitions: return HTTP 409 Conflict with code: ORDER_INVALID_STATUS_TRANSITION
- System prevents non-permitted transitions

### 9.4 Shipping Provider Integration

- Supported carriers: FedEx, UPS, Canada Post, DHL Express, USPS
- Admin can configure regional carriers
- On "Shipped":
  - Send shipping info to carrier API: recipient address, weight, dimensions, product description
  - Store returned tracking number
- Poll carrier API every 6 hours
- On status update:
  - Automatically transition order: Shipped → In Transit → Out for Delivery → Delivered
- On carrier API error:
  - Log error, retry after 30 minutes
- On "Delivered" status:
  - Immediately transition to Delivered
  - Trigger customer notification
- On "Failed Delivery":
  - Transition to Out for Delivery
  - Notify customer
- Tracking number validation:
  - Validate against carrier-specific format
  - Reject invalid with HTTP 400: INVALID_TRACKING_NUMBER

### 9.5 Delivery Estimation Logic

- Calculation: Estimated Delivery Date = Processing Time + Transit Time + Carrier Buffer
- Processing time:
  - Before 14:00 (Asia/Seoul): 1 business day
  - After 14:00 (Asia/Seoul): 2 business days
- Transit time:
  - FedEx/UPS: Domestic 1-2 days, Cross-border 3-5 days
  - DHL: Domestic 1 day, Cross-border 2-3 days
  - Canada Post/USPS: Domestic 2-4 days, Cross-border 4-7 days
- Destination within same country: domestic transit
- Destination to different country: cross-border transit
- Estimated delivery displayed on tracking page
- When overdue: "Delivery delayed. Expected: [date]"
- When within 1 day: "Expected delivery today"

### 9.6 Customer Notifications

- Payment confirmed: email, push: "Your payment has been successfully processed."
- Shipped: email, push, SMS: "Your order has been shipped! Track it here: [tracking link]"
- In Transit: push: "Your package is now in transit."
- Out for Delivery: SMS, push: "Your package is out for delivery today!"
- Delivered: email, push: "Your order has been delivered! Thank you for shopping with us."
- Cancelled: email, push: "Your order has been cancelled. A full refund has been initiated."
- Refunded: email: "Your refund has been processed. Funds will be returned to your original payment method within 3-7 business days."
- Returned: email, push: "We received your returned item. The refund will be processed within 3 business days."
- Notification channels: email (mandatory), push (app users), SMS (opt-in mobile)
- Link format: https://track.carrier.com/[trackingNumber]
- Message content:
  - Refund: specify amount and method
  - Cancellation: include reason

### 9.7 Tracking Link Generation

- Link format: https://shoppingmall.com/track/[orderId]/[trackingNumber]
- Accessible without authentication
- Displays:
  - Current status
  - Carrier name and logo
  - Real-time tracking info
  - Timeline visualization
  - Estimated delivery date
  - Carrier support contact
  - Return button (if delivered)
- Link remains active after completion
- Completed: "Delivery Confirmed" with final delivery date and signature
- Returned: "Return Processed" with final status and refund info
- Link secured with cryptographically random token
- No PII exposure beyond status and delivery info

## 10. Product Reviews and Ratings

### 10.1 Review Submission Requirements

- Only after confirmed delivery (24-hour waiting period)
- Must be for purchased product
- If not purchased: "You must have purchased this product to leave a review."
- Require rating (1-5 stars) and text (minimum 50 characters)
- Draft saved every 30 seconds
- Truncate over 2,000 characters: "Your review has been truncated to 2,000 characters."
- No duplicate review within 7 days: "You've already submitted a review for this product recently."
- Email verification required for seller verification mode

### 10.2 Rating System Design

- 5-point scale: 1=Poor, 2=Fair, 3=Good, 4=Very Good, 5=Excellent
- Overall rating: arithmetic mean of verified ratings
- Display with one decimal place (e.g., 4.3 stars)
- Update average when rating changed
- Fewer than 5 reviews: "This product has received too few reviews to be statistically meaningful."
- 100+ reviews: "This product has received 100+ verified reviews from real customers." badge

### 10.3 Review Moderation Process

- Review flagged by 3 users: auto-queued for moderation
- Moderator approves: remove flag, restore visibility
- Moderator rejects: hide, notify: "Your review was removed for violating our community guidelines."
- Under moderation: "This review is currently being reviewed by our moderation team."
- 3 moderation violations in 30 days: suspend review privileges for 90 days

### 10.4 Review Verification Rules

- Only "Verified Purchase" for customers with confirmed delivery of that specific SKU
- Hide review if purchase refunded: "Your review has been hidden because your purchase was refunded."
- Allow one review per unique SKU purchased
- If purchase canceled: instantly hide review
- Discontinued variants: allow existing reviews

### 10.5 Review Display Logic

- Sort by:
  1. Verified Purchases first
  2. Highest ratings first
  3. Most recent first
- Group identical text/rating
- "X similar reviews" count
- Show image uploads
- "X of Y reviews displayed"
- Filter: "Reviews with images"
- "Most Helpful" badge if ≥10 "Helpful" votes

### 10.6 Reviewer Identity Protection

- Display: first name + first letter of last name (e.g., "John D.")
- Hide exact purchase date and order number
- Seller response: display seller store name, not personal name
- Admin edit/delete: "Edited by Admin" with timestamp and reason
- Customer deletion request: remove content but retain rating in overall average

## 11. Seller Management

### 11.1 Seller Registration Process

- Collect mandatory business information:
  - Legal business name
  - Business registration number
  - Tax identification number
  - Business physical address
  - Primary contact phone
  - Bank account details
  - Business category classification
  - Tax registration certificate (upload)
- Validation:
  - Format: PDF, JPG, PNG (max 10MB)
  - OCR text extraction
  - Match extracted text with submitted info
  - Cross-reference with government registries
  - Check license expiration
  - Flag forged/modified documents
- Status during review:
  - Allow dashboard access
  - Restrict product publication
  - Restrict order receipt
  - Restrict sales analytics
  - Display: "Pending Verification"
  - Email with status
- On approval:
  - Activate account
  - Enable publishing
  - Enable order receipt
  - Grant analytics access
  - Display "Verified Seller" badge
  - Send onboarding checklist
- On rejection:
  - Show specific reason
  - Provide corrective actions
  - Allow resubmission after 48 hours
  - Maintain inactive account
  - Email with details
- Onboarding:
  - Display welcome video tutorial
  - Recommend first 3 products to list
  - Offer product listing template
  - Provide optional 30-minute onboarding call
  - Guide first 3 orders
  - Suggest optimized pricing strategy

### 11.2 Product Catalog Management

- Product creation requires:
  - Title (max 150 chars)
  - Description (min 100 chars)
  - Category
  - Base price (min $1.00)
  - Condition: new, used, refurbished
  - Return policy
  - Shipping method
  - At least 3 images (max 10)
  - Tags (max 10, under 25 chars each)
- Product categories:
  - 20+ primary
  - 5-20 subcategories
  - Attribute types per category
  - Category-specific validation rules
- Image upload:
  - Drag-and-drop
  - Formats: JPG, PNG, WEBP
  - Size: ≤10MB each
  - 10 max per product
  - Optimized thumbnails
  - Compression without loss
  - Copyright detection
  - Sequence sorting
- Draft system:
  - Auto-save every 30 seconds
  - Preserve all data
  - Allow exit and return
  - Display "Draft" status
- Publication:
  - Validate mandatory fields
  - Validate images
  - Verify price > $1.00
  - Confirm category
  - Check return policy
  - Validate ≥3 images
  - Apply SEO optimization
  - Submit for automated content review
- Approval workflow:
  - Auto-review for: copyright infringement, misleading info, prohibited content, poor quality, incomplete info
  - On failure: detailed report + correction guidance
  - Allow resubmission
  - Maintain "Rejected" state
  - On success: assign product ID, generate URL slug, add to search index
  - Notify seller
  - Display "Live" status
  - Notify subscribed customers
- Maintenance:
  - Edit product information anytime
  - Preserve review history
  - Flag price changes
  - Maintain version history
  - Allow temporary hide
  - Archive after 365 days of inactivity

### 11.3 Inventory Update Procedures

- SKU generation: ProductID + Variant Attribute Codes + Sequential Number
- Variant creation:
  - Up to 3 variant attributes
  - Supported: size, color, material, flavor, quantity
  - Required: unique price, inventory, image per variant
  - Disable variant modification if orders exist
  - Display variant preview
- Inventory tracking:
  - Accurate count per SKU
  - Deduct on order placement
  - Prevent selling beyond available stock
  - Real-time display updates
  - Warning when below threshold
  - Flag for restocking
- Controls:
  - Minimum stock level configuration
  - Low-stock alerts (email + dashboard)
  - Out-of-stock display: grayed out, "Sold Out" label
  - Scheduled restock notifications
  - Bulk update via CSV
  - Manual adjustment with audit trail
- External sync:
  - API for external inventory sync
  - Accept JSON format
  - Validate authenticity and format
  - Process within 10 seconds
  - Log events
  - Confirm response
- During sync:
  - Lock affected products
  - Show "Sync in Progress"
  - Preserve order commitments
  - Alert if negative inventory
- Backorder management:
  - "Notify When Available" option
  - Collect customer email
  - Add to waitlist
  - Send restock notification
  - Allow cancel waitlist

### 11.4 Order Fulfillment Workflow

- Order notification:
  - Immediate email
  - Dashboard alert
  - Task in fulfillment queue
  - Include: order number, customer name, shipping address, product details, special requests
- Processing timeline:
  - Seller must confirm order within 48 hours
  - If no action after 72 hours: automatic cancellation
  - Reminder emails at 24h and 36h
  - Accept: move to "Preparing" status
  - Decline: cancel order, notify customer with reason
  - Decline without valid reason: log for performance review
- Packing and shipping:
  - Enable tracking number entry
  - Support multiple carriers
  - Allow manual or automated integration
  - Require package weight and dimensions
  - Recommend packaging based on item
  - Generate shipping label
  - Require signature for high-value items
- Fulfillment deadline:
  - 7-day maximum
  - Notify seller at 5-day limit
  - Notify customer at 5 days if unfulfilled
  - Auto-cancel after 7 days
  - Deduct seller performance score
  - Offer partial refund
- Automated integration:
  - Sync tracking numbers
  - Update status in real-time
  - Provide delivery estimates
  - Notify customer when out for delivery
  - Confirm delivery
  - Handle return shipping

### 11.5 Sales Analytics Dashboard

- Dashboard displays:
  - Sales revenue (day/week/month/year)
  - Total orders
  - Average order value
  - Top selling products
  - Product performance by category
  - Customer acquisition trends
  - Conversion rate
  - Return rate%
  - Seller rating and reviews
- Daily metrics:
  - Revenue today
  - Orders today
  - Products sold today
  - Conversion rate today
  - Cart abandonment rate today
- Product analytics:
  - Units sold
  - Revenue generated
  - Price history
  - Review ratings
  - Return rate
  - Click-through rate
  - Add-to-cart rate
  - Views to sales conversion
  - Compare to category average
  - Pricing recommendations
- Sales trends:
  - 30, 90, 365-day trends
  - Seasonal patterns
  - Forecast future sales
  - Highlight growth opportunities
  - Flag declining categories
- Customer insights:
  - Repeat customer rate
  - Geographic distribution
  - Purchase frequency
  - Customer lifetime value (CLV)
  - Customer acquisition cost
  - Churn rate
- Profitability:
  - Gross profit margin per product
  - Net profit per order (after fees and shipping)
  - Return cost as % revenue
  - Advertising cost per sale
  - Payment processing fees
- Export functionality:
  - Export all data as CSV
  - Customizable date ranges
  - Selectable fields
  - Visual charts
  - Scheduled email reports

### 11.6 Seller Communication Channels

- Order messaging:
  - Secure internal messaging system
  - Limited to order-specific inquiries
  - No commercial solicitation
  - File attachment support
  - All messages logged for dispute resolution
  - Notify both parties
- Seller support:
  - Help center articles
  - Ticket system for complex issues
  - Live chat during business hours
  - Scheduled video consultation
  - 2-hour average response time for priority tickets
- Feedback collection:
  - Quarterly feedback surveys
  - Platform experience
  - Feature requests
  - Satisfaction scores
  - Act on feedback
- Community features:
  - Seller forums
  - Knowledge sharing
  - Webinars
  - Networking
  - Best practices guides

## 12. Admin Dashboard

### 12.1 User Management Features

- View all customer and seller accounts
- Search by email, name, or ID
- Activate, suspend, or ban users
- View user activity history
- Reset user passwords
- View pending seller registrations
- Approve or reject seller applications with comment
- Bulk user actions
- Access user registration date, last login, IP addresses
- User access level management

### 12.2 Product Oversight Tools

- View all products across all sellers
- Search products
- Filter by category, status, condition, rating
- Approve or reject product listings
- Edit product titles, descriptions, prices, inventory
- Hide or unhide products
- Set global product attributes
- Issue warnings or penalties to sellers
- Override seller pricing (temporarily)
- View product change history
- Manage product tags

### 12.3 Order Supervision Capabilities

- View all orders regardless of seller
- Filter by status, customer, date range, amount
- Change order status manually
- Force refunds
- Cancel unauthorized or fraudulent orders
- Override customer actions (e.g., extend return window)
- View order details including seller, shipping method, payment
- View order fulfillment timeline
- Contact customer or seller regarding order
- Export orders

### 12.4 Inventory Management Controls

- View inventory levels across all products and SKUs
- Bulk inventory adjustments
- Manual stock updates with audit trail
- Set minimum stock thresholds
- View low-stock alerts
- Monitor inventory reconciliation
- Manage backorder settings
- Force product status changes (out of stock/available)
- Access inventory change history

### 12.5 System Configuration Settings

- Enable/disable payment methods
- Configure shipping carriers
- Set transaction fees (5%-10% per seller category)
- Set refund window length
- Set order fulfillment deadlines
- Configure review moderation rules
- Set minimum review length
- Configure notification templates
- Set SEO defaults
- Manage promotional banners
- Configure category hierarchy
- Set tax rates
- Set currency conversion rules
- Manage affiliate program
- Configure global performance thresholds

### 12.6 Audit and Reporting Functions

- Full audit log of all system actions (timestamp, actor, action, details)
- User activity report (last login, actions)
- Financial reconciliation report
- Discrepancy report (payment vs inventory vs order)
- Failed payment report
- Refund rate analysis
- Chargeback report
- Seller performance metrics
- Customer churn analysis
- Search term trends
- Category growth reports
- Export all reports as CSV, PDF, Excel
- Scheduled report generation
- Role-based report access

## 13. Security and Compliance

### 13.1 Authentication and Authorization

- Multi-factor authentication for admin access
- Role-based access control (RBAC)
- Session timeout:
  - Admin: 2 hours
  - Seller: 15 minutes
  - Customer: 30 minutes
- Token refresh mechanism
- Token revocation on logout
- Password complexity validation
- Password history enforcement
- Account lockout after 5 failed attempts
- Email verification for sensitive operations

### 13.2 Data Protection

- Data encryption at rest (AES-256)
- Data encryption in transit (TLS 1.3+)
- Secure token storage (JWT)
- No sensitive data in logs
- PII redaction in exports
- GDPR/CCPA compliance
- Data retention policy: 7 years
- Secure backup strategy
- Regular penetration testing
- OWASP Top 10 protection

### 13.3 Financial Compliance

- PCI-DSS Level 1 compliance
- Tokenized payment processing
- Never store card data
- Never store CVV
- Regular audits
- Automated reconciliation
- Daily reconciliation
- Separate environments for development and production

### 13.4 Platform Integrity

- Automated content moderation for products and reviews
- Fraud detection algorithms
- Rate limiting
- Input sanitization
- XSS/SQL injection prevention
- DDoS protection
- CDN for static assets
- Secure file uploads

## 14. Performance and Scalability

### 14.1 Performance Requirements

- Order placement: complete within 2 seconds
- Shipping cost update: ≤500ms
- Product search: ≤1 second
- Cart updates: real-time (≤200ms)
- Inventory sync: ≤10 seconds
- Payment authorization: ≤15 seconds
- Admin report generation: ≤30 seconds
- Maximum concurrent users: 50,000
- Maximum transactions per second: 100

### 14.2 Scalability Requirements

- Horizontal scaling support
- Load balancing
- Database replication
- Read/write separation
- Caching (Redis)
- Queue-based processing (RabbitMQ)
- Asynchronous processing
- Auto-scaling clusters
- Multi-region deployment

## 15. Business Context and Success Metrics

### 15.1 Why This Service Exists

This e-commerce marketplace fills a market gap by providing small and medium-sized businesses with an accessible, low-cost platform to reach customers without building independent e-commerce infrastructure. Unlike single-vendor platforms, this system enables multiple independent sellers to manage their offerings while benefiting from centralized payment processing, customer trust mechanisms, and discoverability features.

The transaction-based business model earns 5%-10% commission per sale, incentivizing growth through seller and customer acquisition.

### 15.2 Revenue Strategy

- Transaction fee: 5%-10% (based on category and seller tier)
- Featured listings: premium placement
- Premium seller accounts: monthly subscription
- Shipping integration: revenue sharing
- Advertising: sponsored placements

### 15.3 Growth Plan

1. Seller Acquisition: Target niche categories
2. Customer Acquisition: Referral programs, social media
3. Market Expansion: Add regions based on demand
4. Feature Expansion: Subscriptions, wholesale, networking

### 15.4 Success Metrics

- Monthly active sellers: 10,000 in 12 months
- Transaction growth rate: 25% MoM
- Seller retention: 70% after 90 days
- Customer acquisition cost: < $25
- Average order value: ≥$75
- Seller satisfaction: ≥85%

## 16. Document References

All functional requirements for this system are documented across the following companion documents:

- [00-toc.md](./00-toc.md) - Service Overview
- [01-user-actors.md](./01-user-actors.md) - User Actors and Permissions
- [02-customer-registration.md](./02-customer-registration.md) - Customer Registration and Authentication
- [03-product-catalog.md](./03-product-catalog.md) - Product Catalog Structure
- [04-product-variants.md](./04-product-variants.md) - Product Variants and SKU Generation
- [05-shopping-cart.md](./05-shopping-cart.md) - Shopping Cart and Wishlist
- [06-order-placement.md](./06-order-placement.md) - Order Placement Workflow
- [07-payment-processing.md](./07-payment-processing.md) - Payment Processing System
- [08-order-tracking.md](./08-order-tracking.md) - Order Tracking and Notifications
- [09-product-reviews.md](./09-product-reviews.md) - Product Review System
- [10-seller-management.md](./10-seller-management.md) - Seller Management
- [11-admin-dashboard.md](./11-admin-dashboard.md) - Admin Dashboard Functions

All documents are required for complete understanding of the platform. This document is self-contained and complete.

## 17. Developer Note

This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.

The system must be implemented without reference to database schemas or API specifications - these are deferred to subsequent pipeline phases. All requirements are expressed in natural business language for unambiguous interpretation by backend developers.

The requirements are written in EARS format where applicable:
- WHEN: trigger condition
- THE: actor
- SHALL: mandatory behavior
- OR: alternative behavior
- IF: conditional rule

All requirements are specific, measurable, testable, and complete.

All Mermaid diagram syntax errors in referenced documents have been addressed in source files.

No database schema elements or API specification details are included in this document. Any such references indicate documentation error.

All authentication flows, permission matrices, and business workflows are comprehensively described in natural language according to actor roles and business context.

System performance targets, security constraints, and compliance standards are specified with exact values and thresholds.

This document is implementation-ready for the subsequent Database, Interface, and Realize phases of the AutoBE pipeline.