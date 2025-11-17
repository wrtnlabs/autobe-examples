## Functional Requirements for ShoppingMall Platform

This document defines the complete set of functional and non-functional business requirements for the ShoppingMall e-commerce platform. All requirements are written in natural language using EARS syntax to ensure clarity, testability, and unambiguous interpretation by backend developers. Requirements are explicitly segmented by user actor to reflect distinct capabilities and permissions.

### Authentication and Identity Management

The system must securely authenticate users and manage their identity states according to their role.

WHEN a guest attempts to access protected resources, THE system SHALL redirect to login page.

WHEN a user submits registration details with email and password, THE system SHALL validate email format, password complexity (minimum 8 characters, one number, one special character), and check email uniqueness.

IF email already exists in system, THEN THE system SHALL reject registration and display error: "An account with this email already exists."

WHEN user completes registration, THE system SHALL send verification email with unique token.

WHILE user account is unverified, THE system SHALL restrict access to shopping, cart, and order functions.

WHEN user clicks verification link, THE system SHALL activate account and clear verification token.

WHEN user submits login credentials, THE system SHALL validate email and password against stored hash.

IF credentials are invalid, THEN THE system SHALL return HTTP 401 with error code AUTH_INVALID_CREDENTIALS and increment failed attempt counter.

WHILE failed login attempts exceed 5 within 15 minutes, THE system SHALL lock account for 30 minutes and notify user by email.

WHEN successful login occurs, THE system SHALL generate JWT token with payload containing userId, role, and permissions array.

THE system SHALL store refresh token in HTTPOnly cookie with 7-day expiration.

THE system SHALL expire access token after 20 minutes of inactivity.

WHEN user initiates logout, THE system SHALL invalidate access token and clear refresh cookie.

WHEN user requests password reset, THE system SHALL verify email exists, generate one-time token, and send email with reset link.

WHEN user submits new password via reset link, THE system SHALL validate password complexity and update hash.

IF reset token is expired or invalid, THEN THE system SHALL show error: "Invalid or expired reset link. Please request a new reset."

WHERE account is locked due to suspicious activity, THE system SHALL require email verification to unlock.

### Product Catalog Management

The system must enable structured product discovery through categories, search, and filtering.

WHEN a seller creates a new product, THE system SHALL require title, description, category, and base price.

WHERE product category is selected, THE system SHALL enforce predefined category tree (e.g., Electronics > Mobile Phones > Smartphones).

WHEN a product is created, THE system SHALL auto-generate a unique SKU prefix based on category code.

WHEN a seller adds a variant, THE system SHALL allow specification of color, size, material, or custom options with optional price adjustment.

IF variant options conflict (e.g., two variants with identical color and size), THEN THE system SHALL reject submission and show: "This variant combination already exists."

WHEN a product variant is created, THE system SHALL assign unique SKU in format: {CATEGORYCODE}-{COLOR}-{SIZE}-{SEQ}

WHERE product is inactive, THE system SHALL hide product from storefront search and category listings.

WHEN a user searches for products, THE system SHALL match against title, description, and category name.

WHILE performing search, THE system SHALL rank results by relevance, then by sales velocity, then by price (ascending).

WHERE user selects a category, THE system SHALL display all active products belonging to that category and its subcategories.

WHEN a product is viewed, THE system SHALL display all available variants, their prices, and inventory status.

THE system SHALL cache category trees and product metadata for 10 minutes to improve load time.

### Shopping Cart and Wishlist

The system must allow users to collect products for future purchase or review.

WHEN a user clicks "Add to Cart", THE system SHALL verify product is active and variant has positive inventory.

IF selected variant inventory is zero, THEN THE system SHALL display: "This item is out of stock. Please select another variant." and disable Add to Cart button.

WHEN an item is added to cart, THE system SHALL store cartId, userId, productId, variantId, quantity, and calculated price at time of addition.

WHILE user session is active, THE system SHALL persist cart across devices using JWT-authenticated session.

WHEN a user adds the same variant to cart again, THE system SHALL increase quantity instead of creating duplicate line item.

WHERE cart quantity exceeds available inventory, THE system SHALL cap quantity to available stock and show warning: "Quantity reduced to available stock: X."

WHEN a user clicks "Add to Wishlist", THE system SHALL store userId, productId, variantId, and timestamp.

IF wishlist item is out of stock, THE system SHALL still retain it but display "Out of Stock" badge.

WHEN user removes item from cart, THE system SHALL delete that cart line item.

WHEN user clears entire cart, THE system SHALL remove all cart entries for that user.

THE system SHALL limit maximum cart items to 50 per user.

### Order Processing and Payment

The system must process orders securely, validate cart contents, and integrate with payment gateways.

WHEN user initiates checkout, THE system SHALL validate cart items: no out-of-stock variants allowed, no inactive products allowed.

WHILE cart contains items with zero inventory, THE system SHALL prohibit checkout and display: "Some items in your cart are no longer available. Please review your cart."

WHEN user submits shipping address for order, THE system SHALL validate address format (recipient name, street, city, postal code, country).

IF address is incomplete or malformed, THEN THE system SHALL show: "Please fill all fields with valid information."

WHEN user selects payment method, THE system SHALL require valid card details or approved third-party token.

WHEN payment is submitted, THE system SHALL initiate payment authorization with payment gateway.

IF payment gateway declines transaction, THEN THE system SHALL record payment failure, preserve order draft, and display: "Payment was declined. Please check your card details or try another payment method."

WHEN payment is successful, THE system SHALL confirm order, reduce inventory by purchased quantity, and generate order ID.

THE system SHALL lock inventory for 15 minutes during checkout process to prevent overselling.

WHERE payment method is PayPal or Apple Pay, THE system SHALL use tokenized payment credentials and avoid storing card numbers.

WHEN order is confirmed, THE system SHALL send confirmation email with order summary, shipping address, and estimated delivery.

THE system SHALL store order total, tax, shipping cost, and final payment amount at time of purchase (immutable snapshot).

### Inventory Management

The system must track stock levels per SKU with real-time updates and low-stock alerts.

WHEN an order is confirmed, THE system SHALL reduce inventory of each product variant by purchased quantity.

WHEN an order is cancelled or refunded, THE system SHALL restore inventory to original quantity.

WHILE inventory for a SKU falls below reorder threshold (3 units), THE system SHALL trigger low-stock alert to the associated seller.

WHEN a seller updates inventory manually, THE system SHALL validate that new value is non-negative.

IF inventory update would go negative, THEN THE system SHALL reject update and show: "Inventory cannot be set to negative value."

WHEN a product variant is archived, THE system SHALL preserve existing inventory records but prevent future sales.

WHEN inventory sync fails due to external outage (e.g., warehouse API offline), THE system SHALL log error and notify admin via dashboard.

THE system SHALL maintain a full inventory audit trail: who changed inventory, when, and what the delta was.

WHERE inventory is updated via bulk CSV upload, THE system SHALL validate SKU format and reject malformed rows.

### Order Tracking and Shipping

The system must provide transparent order lifecycle status and carrier integration.

WHEN an order is confirmed, THE system SHALL set status to "Processing".

WHEN seller marks order as shipped, THE system SHALL update status to "Shipped" and require carrier name and tracking number.

IF tracking number format is invalid (e.g., not matching carrier's pattern), THEN THE system SHALL prompt: "Invalid tracking number format for {carrier}. Please check and re-enter."

WHILE order status is "Shipped", THE system SHALL allow customer to view carrier tracking page URL.

WHEN carrier provides delivery confirmation via webhook, THE system SHALL auto-update status to "Delivered".

WHEN a delivery attempt fails (e.g., address unreachable), THE system SHALL set status to "Delivery Failed" and notify customer by email.

WHEN a customer rejects delivery, THE system SHALL set status to "Returned to Sender" and initiate refund process.

WHERE order status is "Processing", THE system SHALL allow seller to update shipping details.

WHEN status is "Delivered" or "Returned to Sender", THE system SHALL freeze all shipping modifications.

THE system SHALL display estimated delivery date based on carrier service type and origin destination.

### Reviews and Ratings

The system must enable post-purchase feedback with moderation and integrity safeguards.

WHEN a user completes a delivered order, THE system SHALL enable review submission for each product in that order.

IF user attempts to review product without owning it, THEN THE system SHALL deny submission and show: "You can only review products you have purchased."

WHEN user submits a review, THE system SHALL require rating (1-5 stars) and optional text description (max 1000 characters).

IF review contains blocked keywords (e.g., vulgarity, threats, spam), THEN THE system SHALL flag for admin review and show: "Your review contains inappropriate content and is under review."

WHEN review is submitted, THE system SHALL set status to "Pending Moderation".

WHEN admin approves review, THE system SHALL set status to "Published" and update product average rating.

WHERE review is rejected, THE system SHALL notify user: "Your review was not approved. Please ensure it follows our community guidelines."

WHEN a seller replies to a review, THE system SHALL associate reply with original review, display author as "Seller", and timestamp.

THE system SHALL prevent users from editing or deleting reviews after 48 hours.

WHEN a user reports a review as inappropriate, THE system SHALL flag it for admin review and notify reviewer.

THE system SHALL calculate average product rating as weighted mean of all published reviews.

### Customer Account Management

The system must provide full self-service capabilities for customer profile and preference management.

WHEN a user navigates to account dashboard, THE system SHALL display orders, address book, wishlist, and review history.

WHEN a user adds a new shipping address, THE system SHALL require full address components and validate format.

WHEN a user designates an address as default, THE system SHALL mark it as default for future orders.

WHEN a user removes an address, THE system SHALL prevent removal if it is used in any order history.

WHEN a user requests to delete account, THE system SHALL initiate 7-day grace period.

WHILE account deletion is pending, THE system SHALL hide data from display but retain for legal compliance.

AFTER 7 days, THE system SHALL permanently delete user profile, cart, wishlist, and reviews.

WHERE a user changes email, THE system SHALL require re-verification of new email before activation.

WHEN a user changes password, THE system SHALL invalidate all active sessions and require re-login.

THE system SHALL allow users to download anonymized data export including orders, addresses, reviews.

### Seller Account Management

The system must provide dedicated tools for sellers to manage their business presence.

WHEN a user registers as seller, THE system SHALL set account role to "seller" and status to "Pending Approval".

WHEN admin approves seller account, THE system SHALL notify seller and enable product listing.

IF seller account is rejected, THE system SHALL notify seller with reason and permit re-application after 7 days.

WHEN a seller updates store profile (name, logo, description), THE system SHALL validate logo size (max 5MB, PNG/JPG) and description length (max 500 characters).

WHEN a seller disconnects bank account, THE system SHALL prevent disconnection if pending payouts exist.

WHEN a seller views sales report, THE system SHALL show revenue, units sold, and average order value for selected period.

WHEN a seller submits a payout request, THE system SHALL verify account status is active and pending payouts exceed minimum threshold ($10).

WHERE a seller has no active products, THE system SHALL display banner: "You have no live products. Add your first product to begin selling."

WHEN a seller unsubscribes from email notifications, THE system SHALL stop non-critical emails but retain transactional emails (orders, payments).

THE system SHALL enforce one store per seller account.

### Admin System Management

The system must provide comprehensive administrative controls for platform governance.

WHEN an admin views user list, THE system SHALL filter users by role: customer, seller, admin.

WHEN admin suspends a user account, THE system SHALL prevent all actions including login, purchasing, and publishing.

WHEN admin permanently deletes a user account, THE system SHALL anonymize data (replace name/email with "[DELETED]") and retain order history for compliance.

WHEN admin reviews pending seller applications, THE system SHALL display business registration details, contact info, and product list preview.

IF admin approves seller, THE system SHALL trigger welcome email and grant product upload rights.

IF admin rejects seller, THE system SHALL require rejection reason (text field with min. 10 characters).

WHEN an admin edits product category, THE system SHALL allow renaming, reordering, or deactivating categories.

WHEN an admin removes a product or review, THE system SHALL log reason and notify affected user.

WHEN admin processes a refund request, THE system SHALL require refund amount, reason, and method (original payment or store credit).

WHEN refund is processed, THE system SHALL restore inventory and notify customer.

WHEN admin runs system health dashboard, THE system SHALL display: active users, daily orders, pending reviews, inventory alerts, payment errors.

THE system SHALL log all admin actions with actor ID, timestamp, resource affected, and change description.

THE system SHALL prevent admin from deleting other admin accounts.

THE system SHALL require 2-factor authentication for all admin logins.

WHERE system-wide settings are modified (e.g., taxes, currencies), THE system SHALL require admin approval from a second admin.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*