# Functional Requirements

This document defines the complete set of functional business requirements for the shoppingMall platform. All requirements are written in natural language using EARS format where applicable, ensuring unambiguous, testable specifications for backend development. Technical implementation details, schemas, and API designs are intentionally excluded—this document specifies WHAT the system must do, not HOW to build it.

---

## Product Management Requirements

### Product Creation and Modification

- WHEN a seller attempts to create a new product, THE system SHALL require the following mandatory fields: product name (min 3 characters, max 100 characters), description (min 10 characters, max 2000 characters), price (minimum $0.01, maximum $5000.00), and category (selected from predefined list).
- WHEN a seller submits a product for publishing, THE system SHALL validate that the product name and description do not contain profanity, offensive language, or URLs.
- WHEN a seller updates an existing product, THE system SHALL allow editing of all fields except the product ID and creation date.
- WHERE a product has been published and has existing customer reviews, THE system SHALL prohibit deletion of the product and instead mark it as "archived".
- WHERE a seller has been suspended, THE system SHALL prevent any product changes or updates until reinstatement.
- WHEN a product price is changed, THE system SHALL retain the original price in audit history.

### Product Approval and Moderation

- WHEN a seller submits a product for the first time, THE system SHALL place it in "pending approval" status.
- WHILE a product is in "pending approval" status, THE system SHALL not display it in search results or category listings to customers.
- WHEN an admin approves a product, THE system SHALL change its status to "published" and notify the seller via email and in-app notification.
- WHEN an admin rejects a product, THE system SHALL change its status to "rejected" and send a notification to the seller with the reason for rejection.
- IF a product description contains prohibited content identified by automated filters, THEN THE system SHALL automatically reject the product and notify the seller with a specific violation code.
- IF a product image contains nudity, weapons, or dangerous goods detected by AI moderation, THEN THE system SHALL reject the product and flag the seller account for review.
- IF a seller submits 3 rejected products within 7 days, THEN THE system SHALL suspend the seller account and notify an admin for manual review.

### Product Visibility and Availability

- WHEN a product’s inventory reaches zero, THE system SHALL automatically change its status to "out of stock".
- WHILE a product is "out of stock", THE system SHALL still display it in search results but disable the "Add to Cart" button and show a "Restock Notification" option.
- WHERE a product is scheduled for seasonality (e.g., holiday items), THE system SHALL hide it from all listings and searches during off-season periods.
- WHERE a seller has opted for "instant publish" mode, THE system SHALL skip the approval workflow and immediately publish the product as "published".

---

## Shopping Cart and Order Processing

### Cart Management

- WHEN a customer adds a product to their cart, THE system SHALL verify that the product status is "published" and inventory is greater than zero.
- WHEN a customer adds an item to the cart, THE system SHALL increase the cart item quantity by one if the same product is already present.
- WHEN a customer removes an item from a cart, THE system SHALL decrement the quantity by one; if quantity reaches zero, THE system SHALL remove the item entirely.
- WHEN a customer’s cart exceeds 50 unique items, THE system SHALL display a warning message: "Your cart contains many items. Consider splitting into multiple orders."
- WHEN a customer tries to add a product that is not available to their country (restricted by seller settings), THE system SHALL display "This item is not available in your region" and prevent addition to cart.

### Cart Persistence and Expiry

- WHILE a customer is logged in, THE system SHALL persist cart contents across sessions until the cart is emptied or expired.
- WHERE a customer is not logged in, THE system SHALL store the cart in browser localStorage for up to 14 days.
- IF a cart has not been accessed for 30 days, THEN THE system SHALL clear all items and notify the customer via email that their cart has been expired.
- WHEN a product in the cart is subsequently archived or deleted, THE system SHALL mark that cart line item as "unavailable" and preserve the original price for checkout purposes.

### Checkout Initiation

- WHEN a customer initiates checkout, THE system SHALL validate that the cart contains at least one available product.
- WHEN a customer initiates checkout and has not verified their email, THEN THE system SHALL block checkout and show: "Please verify your email to complete this purchase."
- WHEN a customer initiates checkout, THE system SHALL calculate and display: subtotal, tax (if applicable), shipping cost, and total.
- WHEN a customer has an active promotional code applied, THE system SHALL validate its validity and display the discount amount.
- IF the cart contains a product restricted to seller-specific regions and the shipping address does not match, THEN THE system SHALL display: "This item cannot be shipped to your selected region."

### Order Validation

- WHEN an order is submitted, THE system SHALL validate that:
  - The shipping address is non-empty and contains at least a name, street, city, and postal code.
  - The billing address is either equal to the shipping address or follows the same format requirements.
  - The selected payment method is enabled for the customer’s country.
  - All cart items are still available (not sold out or archived).
  - The cart total matches the calculated amount.
- IF any validation fails during checkout submission, THEN THE system SHALL return detailed error messages per failed field and prevent order creation.
- IF a cart item’s price has changed since being added to cart, THEN THE system SHALL notify the customer: "The price of [Product Name] has changed. You can continue at the new price or adjust your cart."

### Order Creation and Confirmation

- WHEN all validation passes, THE system SHALL create an order in "pending_payment" status and generate a unique order ID.
- WHEN an order is created, THE system SHALL lock the inventory for the purchased items for 15 minutes.
- WHEN an order is created, THE system SHALL send a confirmation email to the customer with order summary and estimated delivery.
- WHEN an order is created, THE system SHALL send an in-app notification to the associated seller.
- WHEN an order is successfully created, THE system SHALL clear the customer’s cart.

---

## User Authentication and Account Management

### Registration and Verification

- WHEN a new user registers with email and password, THE system SHALL create an account with status "unverified".
- WHEN a user completes registration, THE system SHALL send a verification email with a unique one-time link valid for 24 hours.
- WHEN a user clicks the verification link, THE system SHALL change account status to "verified" and allow purchase actions.
- IF a user attempts to re-register with the same email, THEN THE system SHALL return error: "This email is already registered. Please use the login page."
- IF a user’s verification link expires, THEN THE system SHALL allow them to request a new one through the "Resend Verification Email" option.
- WHERE a user signs up as a seller, THE system SHALL mark their account type as "seller" but keep it in "pending_approval" status until admin review.

### Login and Session Management

- WHEN a user provides valid credentials, THE system SHALL issue a JWT access token (expires in 20 minutes) and a refresh token (expires in 30 days).
- WHEN a user logs in from a new device, THE system SHALL send a security notification: "New login detected. Review device details."
- WHEN a user logs in, THE system SHALL restore their cart from storage if authenticated and not expired.
- WHILE a user’s token is valid, THE system SHALL allow access to protected routes.
- IF a user’s access token expires, THEN THE system SHALL return HTTP 401 and prompt automatic refresh using the refresh token.
- IF a refresh token expires or is invalid, THEN THE system SHALL force logout and require re-authentication.

### Password Management

- WHEN a user requests a password reset, THE system SHALL send a reset link valid for 30 minutes.
- WHEN a user resets their password, THE system SHALL invalidate all existing sessions and require re-login.
- WHEN a user changes their password, THE system SHALL require the previous password for verification.
- WHERE a user has two-factor authentication enabled, THE system SHALL require a code after password reset.
- WHERE a user has changed their password within the last 24 hours, THE system SHALL require a 24-hour cooldown before next password change.

### Account Deactivation and Deletion

- WHEN a user requests account deletion, THE system SHALL initiate a 14-day cooling period.
- WHILE a deletion request is pending, THE system SHALL block all new actions (purchases, listings, messages) but allow viewing of order history.
- WHEN the 14-day period expires, THE system SHALL permanently delete the account and all associated personal data except for tax and legal records.
- WHEN an admin manually deactivates a user account, THE system SHALL immediately prevent login and notify the user of the reason.
- WHEN a user is deactivated, THE system SHALL revoke all active JWT tokens.

---

## Search and Product Discovery

### Search Behavior

- WHEN a customer types into the search bar, THE system SHALL return real-time suggestions from product names and categories after 300 milliseconds of inactivity.
- WHEN a customer submits a search query, THE system SHALL return results sorted by relevance (name match > category match > popularity > price).
- WHEN no products match the search term, THE system SHALL display: "No products found for \"[query]\". Try a different term."
- WHERE a search term is misspelled, THE system SHALL display: "Did you mean: [corrected term]?"
- WHERE a search term matches a discontinued category, THE system SHALL suggest popular subcategories.

### Filtering and Sorting

- WHEN a customer applies a filter, THE system SHALL update results immediately without page reload.
- WHERE filters are applied, THE system SHALL maintain search term context.
- Available filters SHALL include: price range, category, seller rating (≥3 stars), condition (new/used), free shipping, and availability (in stock only).
- Sorting options SHALL include: price (low to high), price (high to low), newest first, best selling, and highest rated.
- THE default sorting order SHALL be "best selling" for category views and "relevance" for search results.
- WHEN a customer selects "price (low to high)", THE system SHALL ignore products with null or zero price.

### Product Recommendations

- WHERE a customer views a product, THE system SHALL display "Customers who bought this also bought" based on purchase history similarity.
- WHERE a customer has made at least 2 purchases, THE system SHALL show "Recommended for you" based on browsing and buying patterns.
- WHERE a customer has never made a purchase, THE system SHALL show trending products from their country.

---

## Review and Rating System

### Review Submission

- WHEN a customer purchases a product, THE system SHALL unlock the ability to submit a review after 3 days.
- WHEN a customer submits a review, THE system SHALL require: a rating (1-5 stars) and a review text (minimum 10 characters, maximum 1000 characters).
- WHEN a review is submitted, THE system SHALL flag the account as a "reviewer" for future incentive tracking.
- IF a user attempts to review a product they haven’t purchased, THEN THE system SHALL block submission and display: "You must own this item to leave a review."
- IF a review contains prohibited keywords (e.g., "scam", "fake", "hacked"), THEN THE system SHALL quarantine the review and notify an admin.

### Review Moderation

- WHEN a review is submitted, THE system SHALL automatically flag reviews containing URLs, email addresses, or phone numbers for manual review.
- WHERE a review has received 5 or more "report" flags from other users, THEN THE system SHALL hide the review and notify an admin.
- WHEN an admin approves a flagged review, THE system SHALL make it publicly visible.
- WHEN an admin rejects a flagged review, THE system SHALL delete it and notify the user: "Your review was removed for violating our community guidelines."
- WHILE a review is pending moderation, THE system SHALL display: "This review is awaiting approval."

### Rating Display

- THE system SHALL display an average rating for each product, rounded to one decimal place.
- WHERE a product has fewer than 3 reviews, THE system SHALL display: "This product has not yet received enough reviews."
- WHEN a user views product reviews, THE system SHALL sort them by "most helpful" (based on upvotes) as default; alternate options include "newest" and "highest rated".
- WHEN a user clicks "Helpful" on a review, THE system SHALL increment a counter and display total helpful votes.

---

## Notification System

### System-Generated Notifications

- WHEN an order status changes, THE system SHALL send an in-app notification and email to the customer.
- WHEN an admin approves or rejects a seller application, THE system SHALL send an email and in-app notification.
- WHEN a seller’s product is approved or rejected, THE system SHALL send an email and in-app notification.
- WHEN a customer receives a reply to an inquiry, THE system SHALL send an email and in-app notification.
- WHEN a security event occurs (e.g., new device login, password change), THE system SHALL send an email notification with audit details.
- WHEN a promotional code is about to expire (in 24 hours), THE system SHALL send a reminder email to users who have the code in their wallet.
- WHEN inventory for a product a customer has saved is replenished, THE system SHALL send a restock alert.

### Notification Delivery

- ALL notifications SHALL be delivered within 60 seconds of the triggering event.
- ALL email notifications SHALL contain a clear unsubscribe link and must be compliant with CAN-SPAM and GDPR.
- IN-APP notifications SHALL persist for 30 days, then be automatically archived.
- PUSH NOTIFICATIONS SHALL be available for customers who opt in via mobile app.
- WHEN an email bounces twice, THE system SHALL mark the address as invalid and suspend email delivery.

---

## Payment Processing Requirements

### Supported Payment Methods

- THE system SHALL support: credit/debit cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, PayPal, and bank transfer (for sellers only).
- WHERE PayPal is selected, THE system SHALL redirect to PayPal’s secure checkout page.
- WHERE bank transfer is selected, THE system SHALL generate a unique reference number and display instructions for manual bank deposit.
- WHEN a customer selects a payment method, THE system SHALL validate it is enabled for their country.

### Payment Validation

- WHEN a card is submitted, THE system SHALL validate the card number (Luhn algorithm), expiration date (future), and CVV (3-4 digits).
- WHEN a PayPal payment is processed, THE system SHALL wait for webhooks from PayPal to confirm success before changing order status.
- WHEN a bank transfer is selected, THE system SHALL mark the order as "awaiting deposit" and require manual confirmation from the seller.
- IF a payment fails, THEN THE system SHALL retry up to 3 times at 10-minute intervals before marking payment as failed.
- IF a payment fails after 3 attempts, THEN THE system SHALL change order status to "payment_failed" and release locked inventory.

### Refund and Dispute Handling

- WHEN a customer requests a refund, THE system SHALL allow refunds only if order status is "delivered" or "partially_delivered".
- WHEN a refund is approved by seller or admin, THE system SHALL process refund via original payment method.
- WHERE a dispute is raised by the customer, THE system SHALL pause payout to the seller while under review.
- WHERE a refund is processed, THE system SHALL send a confirmation email and update the transaction history.
- WHERE chargebacks occur, THE system SHALL notify the seller and deduct transaction fees from account balance.

---

## Report Generation Requirements

### Seller Reports

- WHEN an admin or seller requests "Sales Report" for time period, THE system SHALL generate a PDF/CSV report including: total revenue, number of orders, units sold, top 5 products, refund rate, and customer satisfaction score.
- WHEN a seller requests "Inventory Report", THE system SHALL generate a report showing current stock levels, products nearing low stock (≤5 units), and products out of stock in last 30 days.
- WHEN a seller requests "Review Summary", THE system SHALL generate a report with average rating, review trends over time, and top 3 phrases from reviews.

### Admin Reports

- WHEN an admin requests "Platform Metrics", THE system SHALL generate a report including: daily active users, new sellers registered, average order value, revenue by category, conversion rate, and fraud detection rate.
- WHEN an admin requests "Seller Compliance Report", THE system SHALL generate a list of sellers with pending approvals, rejected products in last 30 days, and suspension history.
- WHEN an admin requests "Payment Disputes Report", THE system SHALL generate CSV with customer, seller, order ID, dispute reason, status, and resolution date.

### Report Performance

- ALL report generations SHALL complete within 10 seconds for datasets up to 100,000 records.
- ALL reports SHALL be downloadable as PDF or CSV.
- ALL reports SHALL be generated on-demand, not cached or precomputed.
- WHERE a report requires aggregation of data across 5+ tables, THE system SHALL use optimized query patterns to prevent degradation.

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.