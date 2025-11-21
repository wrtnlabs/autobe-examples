# Functional Requirements for ShoppingMall Platform

## Product Management Requirements

### Product Creation
- WHEN a seller submits a new product for listing, THE system SHALL capture the product title, description, category, price, images, and inventory count.
- WHEN the product contains prohibited content (e.g., counterfeit goods, illegal substances), THE system SHALL reject the submission and notify the seller with specific reasons.
- WHILE a product is in draft state, THE system SHALL restrict all visibility to customers and only allow the submitting seller to view or modify it.
- WHEN an admin approves a product, THE system SHALL transition it to live state and make it available for purchase.
- WHEN a product is rejected, THE system SHALL retain the submission history and notify the seller with detailed reasons for rejection.

### Product Updates
- WHEN a seller updates a product’s price, description, or inventory, THE system SHALL validate all changes before publishing.
- WHERE a product’s price is changed, THE system SHALL log the historical price changes for audit purposes.
- WHERE a product’s inventory is reduced to zero, THE system SHALL automatically set availability status to "Out of Stock".
- IF a seller attempts to update a product after it has received 10 or more customer reviews, THE system SHALL require admin approval before publishing the update.

### Product Deactivation
- IF a seller’s account is suspended, THEN THE system SHALL immediately remove all associated products from public view.
- WHERE a product has been inactive for 180 days with zero sales, THE system SHALL send a notification to the seller suggesting removal.
- WHEN a seller permanently removes a product, THE system SHALL archive the product record and mark it as unavailable.
- THE system SHALL retain archived product records for 5 years to support warranty claims and legal investigations.

### Product Visibility
- WHEN a product is live, THE system SHALL make it discoverable via search, category navigation, and home page recommendations.
- WHERE a product is flagged for review due to potential policy violations, THE system SHALL hide it from public view until admin approval.
- THE system SHALL not display any product with incomplete metadata (e.g., missing title, price, or category).

## Shopping Cart and Order Processing

### Cart Creation and Management
- WHEN a customer adds a product to their cart, THE system SHALL validate that the product is in stock and active.
- WHERE a product in cart becomes out of stock after addition, THE system SHALL flag the item and notify the customer during checkout.
- WHERE a cart contains items from more than one seller, THE system SHALL group items by seller at checkout.
- WHEN a customer removes an item from cart, THE system SHALL immediately update the cart state without requiring confirmation.
- THE system SHALL retain a customer’s cart for 30 days of inactivity, after which it shall be automatically discarded.

### Checkout Initiation
- WHEN a customer initiates checkout, THE system SHALL calculate and display:
  - Subtotal by seller
  - Shipping cost per seller
  - Estimated delivery date
  - Total amount due
- WHEN a customer has coupons or loyalty points, THE system SHALL apply eligible discounts automatically.
- WHEN checkout is initiated, THE system SHALL verify that the customer has a valid shipping address on file.
- WHERE the customer’s account is unverified, THE system SHALL prevent checkout and require email verification before proceeding.

### Shipping Information Entry
- WHEN a customer selects shipping address, THE system SHALL validate the address format and completeness.
- WHEN a customer adds a new shipping address, THE system SHALL require:
  - Full name
  - Street address
  - City, state, and postal code
  - Valid phone number
- IF a customer enters an invalid or incomplete address, THE system SHALL highlight errors and prevent submission until corrected.

### Payment Method Selection
- WHEN a customer chooses payment option, THE system SHALL allow:
  - Credit/debit card (via integrated payment gateway)
  - Digital wallet (Apple Pay, Google Pay)
  - Bank transfer (for corporate accounts)
- WHEN a payment method is selected, THE system SHALL validate the format and existence of card number, expiry date, and CVV.
- IF a saved payment method is expired or invalid, THE system SHALL notify the customer and require replacement before proceeding.

### Order Validation
- BEFORE finalizing order, THE system SHALL validate:
  - All products in cart are still available
  - All prices have not changed since cart addition
  - Customer account is verified and in good standing
  - Shipping address is complete and valid
  - Payment method is active and authorized
- WHEN validation fails, THE system SHALL display specific error messages for each failed check and pause checkout.

### Payment Processing
- WHEN payment is submitted, THE system SHALL immediately initiate transaction with the payment gateway.
- IF payment is successful, THE system SHALL:
  - Create a confirmed order record
  - Reserve inventory for products in order
  - Generate an order confirmation number
  - Send order confirmation email
- IF payment fails, THE system SHALL:
  - Retain cart for 48 hours
  - Notify customer of payment failure
  - Provide retry option with alternative payment method

### Order Confirmation
- WHEN order is confirmed, THE system SHALL display:
  - Order ID
  - Summary of items, prices, quantities
  - Shipping address
  - Payment method used
  - Estimated delivery window
- THE system SHALL send a confirmation email with full order details within 5 minutes of successful payment.
- THE customer SHALL be able to view, download, or print the order confirmation at any time after purchase.

### Inventory Deduction
- WHEN an order is paid and confirmed, THE system SHALL:
  - Immediately deduct inventory for each product
  - Lock inventory until order is canceled, returned, or fulfilled
  - Prevent other customers from purchasing the same quantity
- WHERE inventory becomes insufficient during checkout process, THE system SHALL:
  - Cancel the transaction
  - Refund any captured payment
  - Notify customer that items are no longer available

### Notification Triggers
- WHEN order status changes, THE system SHALL trigger notifications to:
  - Customer: for order confirmation, shipment, delivery, return
  - Seller: for order received, shipment confirmation, return received
- WHEN a customer cancels an unshipped order, THE system SHALL notify the seller immediately.
- WHEN a seller fulfills an order, THE system SHALL notify the customer to expect delivery within 3 business days.

### Order Status Updates
- THE system SHALL maintain the following order states:
  - "Draft" — Items in cart, but checkout not initiated
  - "Pending Payment" — Checkout initiated, payment not completed
  - "Processing" — Payment confirmed, inventory reserved, processing begins
  - "Shipped" — Items dispatched from seller warehouse
  - "Delivered" — Package confirmed delivered to customer
  - "Cancelled" — Order canceled by customer or admin before shipment
  - "Returned" — Item returned and received by seller
  - "Completed" — Order closed with no open issues
- THE customer SHALL be able to view the complete history of all status transitions.
- WHEN an order transitions to a new state, THE system SHALL send a notification to both customer and seller.

## User Authentication and Account Management

### Registration and Verification
- WHEN a new customer registers with an email address, THE system SHALL create a pending user profile with minimal identifying data (email, registration timestamp).
- WHILE a customer account is unverified, THE system SHALL restrict:
  - Order placement
  - Personal data modification
  - Review submission
- WHEN a customer clicks the email verification link, THE system SHALL activate the account and grant full access to customer features.
- WHEN a customer attempts to register with an email already in use, THE system SHALL block registration and notify them to recover their existing account.

### Account Deactivation and Deletion
- IF a customer initiates account deletion, THE system SHALL:
  - Immediately disable all authentication credentials and session tokens
  - Prevent any login attempts
  - Preserve user ID as an anonymized reference for transaction history and legal compliance
- WHERE a customer account has been inactive for 180 days, THE system SHALL flag it for potential deletion.
- WHERE a customer requests data erasure under GDPR or CCPA, THEN THE system SHALL:
  - Remove all personally identifiable information (name, phone, full address) from active systems
  - Retain only an anonymous identifier and timestamp for audit purposes
  - Complete deletion within 30 calendar days of receipt

### Session and Token Management
- WHEN a user logs in successfully, THE system SHALL issue a JWT token with:
  - Expiration of 24 hours
  - Refreshable access token with expiration of 7 days
  - Attached user ID and role (customer, seller, admin)
- WHEN a token expires, THE system SHALL:
  - Block API access for the expired token
  - Allow refresh only if refresh token is valid and unrevoked
  - Require re-authentication if refresh token is invalid or expired
- WHEN a user logs out, THE system SHALL immediately revoke the current session token.
- WHEN a user logs in from a new device, THE system SHALL send a security notification to the email address on file.

### Password Management
- WHEN a user requests password reset, THE system SHALL:
  - Send a unique, time-limited (15-minute) reset link to the registered email
  - Invalidate all active sessions
  - Require re-authentication upon successful reset
- WHEN a password is changed, THE system SHALL:
  - Invalidate all existing sessions
  - Log the reset event in audit trail
  - Notify the user via email of the change

### Account Recovery
- WHEN a user cannot access their account, THE system SHALL allow recovery via:
  - Email verification link
  - Security questions (if previously configured)
- IF repeated login failures occur (5 attempts within 10 minutes), THE system SHALL temporarily lock the account for 1 hour and notify the user.

## Search and Product Discovery

### Product Indexing
- WHEN a product is approved and published, THE system SHALL index it with:
  - Title
  - Description
  - Category
  - Brand
  - Tags
  - Price
- WHEN a product is updated, THE system SHALL refresh its index within 2 minutes.
- WHEN a product is deactivated, THE system SHALL immediately remove it from search results.

### Search Algorithm Requirements
- WHEN a customer enters a search query, THE system SHALL:
  - Match keywords in product title, description, and tags
  - Prioritize exact phrase matches over partial matches
  - Rank by relevance, then by sales volume, then by rating
- WHERE search results return more than 100 products, THE system SHALL paginate results in groups of 20.
- IF a search returns no results, THE system SHALL suggest alternate spellings or related categories.

### Filtering and Faceting Requirements
- WHEN displaying search results, THE system SHALL provide filters for:
  - Category
  - Price range
  - Rating (minimum 1-5 stars)
  - Seller type (individual, business)
  - Availability (in stock, out of stock)
- WHERE filters are applied, THE system SHALL update results in real time without page refresh.
- THE system SHALL display active filters with clear “remove” options.

### Sorting Options and Default Behavior
- WHEN displaying products, THE system SHALL allow sorting by:
  - Relevance (default)
  - Price: low to high
  - Price: high to low
  - Newest first
  - Rating (highest to lowest)
  - Sales volume (highest to lowest)
- THE system SHALL persist the last used sort preference for the current session.

### Related Products and Recommendation Logic
- WHEN a customer views a product, THE system SHALL display up to 5 related products based on:
  - Shared category
  - Shared brand
  - Purchase patterns of similar users
  - High rating and popularity
- WHERE a product has no direct matches, THE system SHALL recommend alternative categories with similar demand.
- THE system SHALL avoid recommending products with ratings below 4.0 stars.

## Review and Rating System

### Review Submission
- WHEN a customer completes a purchase, THE system SHALL enable review submission for that product after 7 days.
- WHEN a customer submits a review, THE system SHALL require:
  - A numeric rating from 1 to 5 stars
  - A written comment of at least 20 characters
  - Option to upload up to 3 photos
- WHEN a review is submitted, THE system SHALL store the review as pending moderation.
- IF a review contains profanity, personal information, or false claims, THE system SHALL flag it for admin review and notify the customer。

### Review Moderation
- WHEN a review is pending moderation, THE system SHALL hide it from public view.
- WHEN an admin approves a review, THE system SHALL publish it publicly and attribute it to the anonymous customer identifier.
- WHEN a review is rejected, THE system SHALL notify the customer with the reason and offer opportunity to edit and resubmit.

### Review Modification and Removal
- WHERE a customer wishes to edit a review they submitted, THEN THE system SHALL:
  - Allow editing within 7 days of submission
  - Record the edit history with timestamp
  - Display the review as "edited" publicly
- WHERE a review is determined to be fraudulent or abusive after publication, THEN THE system SHALL:
  - Remove the review from public view
  - Preserve the review record for audit purposes for 2 years
  - Notify the customer of removal with reason
- THE system SHALL retain all reviews—published, rejected, or removed—for 5 years for compliance with e-commerce transparency regulations.

### Rating Calculation
- THE system SHALL calculate average rating based on:
  - Only published reviews
  - Ratings from verified purchasers only
- WHERE a product receives 10 or more ratings, THE system SHALL display the average rating on category and search result pages.
- THE system SHALL show the distribution histogram of ratings (1-star to 5-star counts) on product detail pages.

## Notification System

### Notification Generation
- WHEN an event occurs that affects a customer or seller (e.g., order placed, payment received, product approved, account verification needed), THE system SHALL queue a notification for dispatch.
- WHILE a notification is queued, THE system SHALL retain its metadata, target recipient, type, and trigger reason.
- THE system SHALL deliver notifications via email only. In-app messages are not permitted.

### Notification Delivery and Expiry
- WHEN a notification is delivered successfully, THE system SHALL mark it as "delivered" and store it for 90 days.
- WHEN a notification remains undelivered after 7 days, THE system SHALL flag it as failed and archive it.
- WHERE a notification contains time-sensitive information (e.g., order confirmation, payment receipt), THE system SHALL retain its content in an immutable read-only archive for 1 year.
- WHERE a user unsubscribes from marketing notifications, THEN THE system SHALL:
  - Immediately cease sending marketing notifications
  - Retain transactional notifications (e.g., order updates, password resets)
  - Suppress any future marketing data from being processed for the user

### Notification Types and Triggers
| Notification Type | Trigger Condition | Recipient | Delivery Method |
|-------------------|-------------------|-----------|-----------------|
| Account Verification | New registration confirmed | Customer | Email |
| Order Confirmation | Successful payment | Customer | Email |
| Order Shipped | Seller marks as shipped | Customer | Email |
| Order Delivered | Delivery confirmation | Customer | Email |
| Order Cancelled | Cancellation confirmed | Customer | Email |
| Return Initiated | Return request approved | Customer | Email |
| Return Received | Return item received | Customer | Email |
| Return Refunded | Refund processed | Customer | Email |
| Product Approved | Admin approves product | Seller | Email |
| Product Rejected | Admin rejects product | Seller | Email |
| Account Suspension | Suspended by admin | Seller | Email |
| Security Alert | New device login | Customer | Email |
| Password Changed | User changes password | Customer | Email |

## Payment Processing Requirements

### Supported Payment Methods
- WHEN a customer initiates payment, THE system SHALL accept:
  - Credit/debit cards (Visa, Mastercard, American Express, Discover)
  - Digital wallets (Apple Pay, Google Pay)
  - Bank transfer (SEPA, ACH — for registered corporate accounts)
- WHERE no payment method is available, THE system SHALL prevent checkout initiation.

### Payment Gateway Integration
- WHEN a payment is processed, THE system SHALL integrate with:
  - Stripe (primary)
  - PayPal (fallback)
- THE system SHALL support secure tokenization of payment methods to avoid storing raw card data.

### Payment Authorization
- WHEN payment is initiated, THE system SHALL send authorization request with:
  - Cardholder name
  - Card PAN (tokenized)
  - Expiry date
  - CVV (tokenized)
  - Amount
  - Currency
- IF authorization is declined, THE system SHALL:
  - Return the specific error code from the gateway
  - Advise the customer to try another method or contact issuer
- IF payment gateway is unavailable, THE system SHALL:
  - Attempt failover to secondary gateway (PayPal)
  - Display maintenance message if both fail

### Transaction Logging
- WHEN payment is completed, THE system SHALL log:
  - Transaction ID
  - Timestamp
  - Amount
  - Currency
  - Payment method
  - Gateway response code
  - Customer ID
  - Order ID
- THE system SHALL retain all transaction logs for 10 years for accounting and tax compliance.

### Refund Process
- WHEN a return is approved and item received, THE system SHALL initiate refund.
- WHEN refund is processed, THE system SHALL:
  - Return funds via original payment method
  - Record refund ID and timestamp
  - Notify customer
  - Update order status to "Refunded"
- WHERE refund fails, THE system SHALL escalate to finance team for manual resolution and notify customer.

## Report Generation Requirements

### Customer Reports
- WHEN admin generates customer report, THE system SHALL provide:
  - Number of registered users
  - Number of verified users
  - Number of active users (active in last 30 days)
  - Number of deactivated users
  - Distribution by country
- THE report SHALL be exportable as CSV and PDF.

### Seller Reports
- WHEN admin generates seller report, THE system SHALL provide:
  - Total number of registered sellers
  - Number of approved sellers
  - Number of suspended sellers
  - Average product count per seller
  - Sales volume by seller tier
- THE system SHALL allow filtering by registration date range.

### Sales Reports
- WHEN admin generates sales report, THE system SHALL provide:
  - Daily / weekly / monthly sales totals
  - Top 10 selling products
  - Top 10 product categories
  - Average order value
  - Return rate by product category
- THE report SHALL enable date range filtering and visual chart export (PNG, SVG).

### Audit Report
- WHEN an admin requires audit trail, THE system SHALL provide:
  - List of all sensitive actions (logins, password changes, deletions, approvals)
  - Actor ID and type
  - IP address and device
  - Timestamp
  - Action performed
  - Affected object
- THE report SHALL be generated in chronological order and signed with timestamp integrity.

### Compliance Report
- WHEN requested for GDPR or CCPA compliance, THE system SHALL provide:
  - All personal data held for a specific user
  - Data processing activities
  - Third-party data sharing records
  - Data retention and deletion dates
- THE system SHALL deliver the report within 30 days of request.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.