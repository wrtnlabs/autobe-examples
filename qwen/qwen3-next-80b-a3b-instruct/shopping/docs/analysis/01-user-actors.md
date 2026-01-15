# Requirements Analysis Report

## 1. Service Overview

The e-commerce shopping mall platform is a multi-vendor marketplace enabling customers to browse, purchase, and review products from multiple independent sellers. The platform provides sellers with tools to manage their inventory, fulfill orders, and analyze sales performance, while offering customers a seamless shopping experience with comprehensive product discovery, secure payment processing, and transparent order tracking.

## 2. Key Features

- User registration and login with address management
- Product catalog with categories and search
- Product variants (SKU) with different colors, sizes, options
- Shopping cart and wishlist
- Order placement and payment processing
- Order tracking and shipping status updates
- Product reviews and ratings
- Seller accounts to manage their products
- Inventory management per SKU
- Order history and cancellation/refund requests
- Admin dashboard for order and product management

## 3. User Actors

- Customer: Registered users who browse, purchase, and review products
- Seller: Business entities that list and manage their own products
- Admin: Platform administrators with full system control

## 4. Functional Requirements

### 4.1 User Registration and Login

- WHEN a customer registers, THE system SHALL require email address, full name, and password with minimum 8-character complexity requirements
- WHEN a customer submits registration, THE system SHALL validate email format, uniqueness, and password strength
- WHEN validation fails, THE system SHALL provide specific error messages for each invalid field
- WHEN registration is successful, THE system SHALL create account with status "pending_email_verification" and send verification email
- WHEN a customer clicks verification link, THE system SHALL activate account and remove temporary verification token
- WHEN a customer attempts to log in, THE system SHALL authenticate email and password using secure hashing
- WHEN authentication fails, THE system SHALL prevent additional attempts after 5 invalid tries within 15 minutes
- WHEN login is successful, THE system SHALL issue JWT access token with 15-minute expiration and refresh token stored as httpOnly cookie
- WHEN session expires, THE system SHALL require re-authentication
- WHEN a customer requests password reset, THE system SHALL send time-limited reset link to verified email
- WHEN password is reset, THE system SHALL invalidate all previous sessions and require re-login

### 4.2 Product Catalog

- WHEN a product is created, THE system SHALL assign a unique product ID and associate it with exactly one primary category from hierarchical tree
- WHEN a customer searches products, THE system SHALL rank results by weighted relevance: 40% title match, 25% description match, 20% brand match, 15% category match
- WHEN a customer filters products, THE system SHALL dynamically generate filters based on available product variants
- WHEN a customer selects category, THE system SHALL display products in that category and all subcategories
- WHEN a product's inventory is zero, THE system SHALL hide "Add to Cart" button and display "Out of Stock" status
- WHEN a product's status is "draft" or "inactive", THE system SHALL exclude it from all customer-facing listings
- WHEN a seller updates pricing, THE system SHALL update product display only after approval and without affecting existing cart items

### 4.3 Product Variants

- WHEN a product has multiple variants, THE system SHALL generate unique SKU using format {ProductID}-{AttributeCode1}{AttributeCode2}-{SequentialNumber}
- WHEN a customer selects a variable attribute (color, size, etc.), THE system SHALL dynamically update available options based on inventory and compatibility rules
- WHEN a variant's inventory reaches 0, THE system SHALL disable selection of that variant and update cart items accordingly if already present
- WHEN a variant's price is updated, THE system SHALL preserve existing cart pricing until customer revisits cart
- WHEN a seller creates variant, THE system SHALL require unique pricing, inventory level, and image for each variant combination
- WHEN a variant is out of stock but returnable, THE system SHALL allow customer to join a "Notify Me When Available" waitlist
- WHEN seller updates inventory for variant, THE system SHALL update inventory level in real-time with automatic synchronization to all active customer views

### 4.4 Shopping Cart and Wishlist

- WHEN a customer adds item to cart, THE system SHALL verify variant availability and current price before validation
- WHEN a cart item's inventory drops below quantity, THE system SHALL auto-adjust quantity to available stock and notify customer
- WHEN a cart item's price changes after addition, THE system SHALL display "Price updated" notification and require customer confirmation to proceed with new price
- WHEN customer adds item to wishlist, THE system SHALL store with timestamp and track its availability status
- WHEN a wishlist item goes out of stock, THE system SHALL display "Out of stock" indicator
- WHEN a wishlist item's price decreases by more than 10%, THE system SHALL display "Price dropped" notification
- WHEN customer moves item from wishlist to cart, THE system SHALL validate current inventory and price before adding
- WHEN a customer adds a wishlist item to cart, THE system SHALL automatically remove it from wishlist
- WHEN guest user logs in, THE system SHALL merge guest cart with authenticated cart, preserving authenticated cart items in case of conflict
- WHEN cart contains no items for 30 days, THE system SHALL automatically delete cart and associated data

### 4.5 Order Placement

- WHEN a customer initiates checkout, THE system SHALL validate that all cart items have available inventory matching selected quantities
- WHEN a product variant is out of stock, THE system SHALL automatically remove from cart with notification: "[Product Name] is no longer available and has been removed from your order."
- WHEN a cart item's price has changed since addition, THE system SHALL display: "Price for [Product Name] has changed from [old price] to [new price]. Are you sure you want to proceed?" and require explicit confirmation
- WHEN customer selects shipping address, THE system SHALL validate complete address fields: name, street, city, state/province, postal code, country, phone
- WHEN payment method is selected, THE system SHALL validate card is active, not expired, and has sufficient funds
- WHEN seller's shipping restrictions conflict with customer's address, THE system SHALL display: "Some items in your cart cannot be shipped to the selected address. Please remove them or choose another address."
- WHEN order is confirmed, THE system SHALL generate unique order ID in format "ORD-YYYYMMDD-#####" and reserve inventory for 30 minutes
- WHEN payment is authorized, THE system SHALL change order status to "paid", reduce inventory, and clear cart
- WHEN user navigates away without completing checkout, THE system SHALL preserve cart contents for 15 minutes before automatic cancellation
- WHEN payment fails three times for the same order, THE system SHALL automatically cancel order and release inventory

### 4.6 Payment Processing

- WHEN customer selects payment method, THE system SHALL validate the payment method is enabled and supported by platform
- WHEN credit card is used, THE system SHALL conduct 3D Secure authentication where regionally required
- WHEN payment authorization request is sent, THE system SHALL use idempotency key to prevent duplicates
- WHEN payment status is "Processing", THE system SHALL maintain inventory reservation and display "Payment Processing" to customer
- WHEN payment is declined due to insufficient funds, THE system SHALL return error code "INSUFFICIENT_FUNDS" and allow retry with alternative method
- WHEN payment fails due to network timeout, THE system SHALL maintain status as "Processing" and allow retry after minimum 3-second delay
- WHEN payment is successfully captured, THE system SHALL send notification to seller and update order status to "payment_confirmed"
- WHEN a customer requests refund, THE system SHALL validate that request occurs within 30 days of delivery
- WHEN partial refund is initiated, THE system SHALL calculate refund amount based on selected items and original pricing
- WHEN refund is processed, THE system SHALL update inventory levels, notify customer of refund amount and expected timeline, and send notification to seller
- WHEN a payment gateway is down, THE system SHALL fall back to secondary provider after 3 failed attempts with exponential backoff
- WHEN cryptocurrency payment is selected, THE system SHALL lock exchange rate at time of transaction and convert to fiat currency for seller payout

### 4.7 Order Tracking

- WHEN order status changes, THE system SHALL update according to defined lifecycle: PENDING → PAID → PROCESSING → SHIPPED → IN TRANSIT → OUT FOR DELIVERY → DELIVERED → COMPLETED
- WHEN order status is updated to SHIPPED, THE system SHALL generate tracking number and assign it to registered carrier
- WHEN carrier provides tracking update, THE system SHALL automatically transition status: SHIPPED → IN TRANSIT → OUT FOR DELIVERY → DELIVERED
- WHEN delivery estimate is calculated, THE system SHALL use formula: Estimated Delivery Date = Order Processing Time (1-2 business days) + Transit Time (based on carrier and region) + Carrier Buffer (1 day)
- WHEN delivery estimate passes without delivery, THE system SHALL display warning: "Delivery delayed. Expected: [date]"
- WHEN order reaches DELIVERED status and no return initiated within 30 days, THE system SHALL automatically transition to COMPLETED status
- WHEN customer receives status update notification, THE system SHALL include direct tracking link formatted as "https://track.carrier.com/[trackingNumber]"
- WHEN a tracking link is accessed, THE system SHALL display unified view of carrier updates without requiring authentication

### 4.8 Product Reviews and Ratings

- WHEN a customer attempts to leave a review, THE system SHALL verify that the customer has previously purchased and received the exact product variant
- WHEN a review is submitted, THE system SHALL require 50-character minimum text and 1-5 star rating
- WHEN a review is flagged by 3 or more users, THE system SHALL immediately hide the review and queue for moderation
- WHEN moderator reviews flagged content, THE system SHALL either approve and restore visibility or reject with public notification to reviewer
- WHEN a review is approved, THE system SHALL mark it as "Verified Purchase" and display the rating in product's average score
- WHEN customer changes their rating on existing review, THE system SHALL update the product's overall rating calculation
- WHEN seller responds to review, THE system SHALL display "Seller Response" badge with seller's business name, not personal identifier
- WHEN a customer's account is deleted, THE system SHALL anonymize review content but retain rating in product's overall average
- WHEN customer submits duplicate review for same product within 7 days, THE system SHALL reject with message: "You've already submitted a review for this product recently. Please wait 7 days before submitting another."

### 4.9 Seller Management

- WHEN a business applies to become seller, THE system SHALL require submission of business license, tax ID, and bank account information
- WHEN seller application is received, THE system SHALL validate documents against public registries and initiate verification process
- WHEN verification fails, THE system SHALL display specific reason for rejection and allow resubmission after 48 hours
- WHEN seller registration is approved, THE system SHALL grant access to seller dashboard with publishing privileges
- WHEN seller creates new product, THE system SHALL validate mandatory fields: title (max 150 characters), description (min 100 characters), base price ($1 minimum), and 3+ product images
- WHEN seller uploads product images, THE system SHALL support JPG/PNG/WEBP formats with limit of 10 images per product and automatic thumbnail generation
- WHEN seller lists product variant, THE system SHALL automatically generate unique SKU according to platform standard format
- WHEN seller attempts to update inventory via external system, THE system SHALL accept secure API sync request and update inventory level within 10 seconds
- WHEN order is placed for seller's product, THE system SHALL immediately notify seller with order details and require fulfillment within 72 hours
- WHEN seller fulfills order, THE system SHALL require entry of tracking number and designated carrier to update order status
- WHEN seller exceeds 7-day fulfillment deadline, THE system SHALL automatically cancel order and notify customer of delay with partial refund
- WHEN seller accesses analytics, THE system SHALL display daily/weekly/monthly sales revenue, top products, customer demographics, and product performance metrics
- WHEN a seller is flagged for repeated violations, THE system SHALL suspend account and notify customer for review

### 4.10 Order History and Cancellation

- WHEN a customer views order history, THE system SHALL display all past orders with date, total amount, status, and shipping details
- WHEN a customer requests order cancellation, THE system SHALL permit cancellation only before order status changes to SHIPPED
- WHEN cancellation is requested before shipping, THE system SHALL verify that inventory can be restored and initiate full refund
- WHEN cancellation is requested after shipping, THE system SHALL require customer to return product through return processing workflow
- WHEN a refund is processed, THE system SHALL update the order status to REFUNDED and notify customer of refund amount and expected timeline
- WHEN a customer returns an item, THE system SHALL require return reason and initiate refund upon seller acceptance
- WHEN seller rejects return, THE system SHALL maintain order status as COMPLETED and notify customer of decision
- WHEN customer initiates return, THE system SHALL generate return shipping label and notify seller

### 4.11 Admin Dashboard

- WHEN an admin reviews user account, THE system SHALL permit view of all personal data, addresses, orders, reviews, and registration history for that account
- WHEN an admin suspends a user account, THE system SHALL immediately revoke all active sessions, delete cart and wishlist items, and hide reviews from public view
- WHEN an admin blocks a user account, THE system SHALL prohibit future registration from associated IPs and suspend any seller accounts linked to that user
- WHEN an admin approves product listing, THE system SHALL change product status from pending to active and make visible to all customers
- WHEN an admin deactivates product, THE system SHALL hide product from search results, category pages, and prevent new purchases while preserving existing orders and reviews
- WHEN an admin edits product information, THE system SHALL log all changes with timestamp and admin identifier
- WHEN an admin cancels order, THE system SHALL require selection of cancellation reason from predefined options and initiate refund if payment was processed
- WHEN an admin manually ships order, THE system SHALL require selection of carrier and entry of tracking number to update order status and notify customer
- WHEN an admin processes refund, THE system SHALL require specification of amount (full or partial) and reason for refund
- WHEN an admin views inventory dashboard, THE system SHALL display total SKUs, units in stock, value metrics, and identify SKUs with negative stock or inventory mismatches
- WHEN an admin adjusts inventory level, THE system SHALL require reason selection and log adjustment with admin identifier
- WHEN an admin generates audit report, THE system SHALL export complete action logs with timestamp, admin ID, IP address, action type, target object, before/after values, and status
- WHEN an admin exports financial report, THE system SHALL generate comprehensive revenue data including total transactions, commission earned, refunds processed, chargeback rate, revenue by category, and customer lifetime value
- WHEN an admin generates security audit report, THE system SHALL identify anomalies including multiple failed logins from single IP, admin actions during unusual hours, and bulk operations within short timeframes
- WHEN an admin generates compliance report, THE system SHALL confirm data retention policy adherence, GDPR consent records, and export history verification

## 5. Business Model

The platform generates revenue through:
- Transaction fees: 5-8% commission on every successful sale
- Premium seller tiers: Subscription fees for enhanced features (analytics, priority support, featured listings)
- Advertising: Sponsored product placements and banner advertising on marketplace pages

The business model depends on maintaining platform trust through integrity, quality control, and operational efficiency. Seller retention and customer satisfaction directly correlate with platform revenue.

## 6. Success Metrics

- Monthly active sellers: 10,000 within 12 months
- Transaction growth rate: 25% month-over-month
- Seller retention: 70% after 90 days
- Customer acquisition cost: Below $25 per customer
- Average order value: $75+
- Seller satisfaction: 85%+ satisfaction rating

## 7. Constraints

- Authentication must use JWT with refresh token stored as httpOnly cookie with 7-day expiration
- All pricing must be in USD format with exactly 2 decimal places
- Inventory must be tracked at SKU level, not product level
- Review submission requires verified purchase with confirmed delivery
- No API specifications or database schemas in documentation
- All requirements must be expressed in natural language
- All Mermaid diagrams must use double quotes for labels
- All EARS format requirements must follow WHEN/THE/SHALL structure
- All user data must be compliant with GDPR/CCPA regulations

## 8. Related Documents

- [User Actors](01-user-actors.md)
- [Customer Registration](02-customer-registration.md)
- [Product Catalog](03-product-catalog.md)
- [Product Variants](04-product-variants.md)
- [Shopping Cart](05-shopping-cart.md)
- [Order Placement](06-order-placement.md)
- [Payment Processing](07-payment-processing.md)
- [Order Tracking](08-order-tracking.md)
- [Product Reviews](09-product-reviews.md)
- [Seller Management](10-seller-management.md)
- [Admin Dashboard](11-admin-dashboard.md)

> This document defines business requirements only. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.