# Requirements Analysis Report for E-commerce Shopping Mall Platform

## 1. Service Overview

An e-commerce shopping mall platform that connects customers with multiple sellers offering products across diverse categories. The platform enables customers to browse, search, add to cart, and purchase products from multiple vendors through a unified interface. Sellers can onboard, manage their inventory, fulfill orders, and track sales performance. Admins oversee the entire marketplace, manage users, moderate content, and monitor system health.

The system supports concurrent operations across thousands of users, with real-time inventory locking, payment processing integration, and automated order fulfillment workflows. All user interactions are designed for maximum conversion with clear guidance, error prevention, and recovery mechanisms.


## 2. User Actors and Roles

Three distinct user actors interact with the system:

### Customer

- **Description**: Registered users who browse products, add items to cart, place orders, manage shipping addresses, leave reviews, and track orders.
- **Authentication**: Must log in to perform most actions. Guest checkout limited to cart-based operations with email collection.
- **Capabilities**:
  - Register and manage account information
  - Add and manage shipping addresses
  - Browse and search product catalog
  - View product variants and select options
  - Add items to shopping cart and wishlist
  - Place orders with payment processing
  - Track order status and delivery
  - Leave product reviews and ratings
  - Request order cancellations or refunds
  - View purchase history

### Seller

- **Description**: Businesses or individuals who list and sell products on the platform.
- **Authentication**: Must register as a seller, undergo verification, and log in to access seller dashboard.
- **Capabilities**:
  - Register and verify seller account
  - Create and manage product catalog
  - Define product variants (SKU) with pricing and inventory
  - Set inventory levels and update stock
  - View and fulfill customer orders
  - Manage shipping and delivery settings
  - Access sales analytics dashboard
  - Communicate with customers about orders

### Admin

- **Description**: Platform operators with system-wide access for governance, moderation, and support.
- **Authentication**: Must be registered with admin privileges and authenticate with elevated permissions.
- **Capabilities**:
  - Approve or reject seller applications
  - Manage all customer accounts (suspend, delete, reset)
  - Monitor and moderate product listings
  - View and override all orders
  - Manage inventory across sellers
  - Configure system-wide settings
  - Run reports and analytics
  - Access audit logs
  - Handle customer support escalation


## 3. Functional Requirements

### 3.1. User Registration and Authentication

WHEN a new user visits the platform, THE system SHALL provide a registration form requiring email, password, and full name.

WHEN a user submits registration, THE system SHALL validate the email format and check for existing accounts.

IF the email is already registered, THEN THE system SHALL display: "An account with this email already exists. Please log in or use a different email."

WHEN a user successfully registers, THE system SHALL send a verification email with a time-limited token.

WHEN a user clicks the verification link, THE system SHALL activate their account and redirect to login.

WHEN a user attempts to log in, THE system SHALL validate email and password against stored credentials.

IF the password is incorrect, THEN THE system SHALL display: "Invalid email or password. Please try again."

WHEN a user logs in successfully, THE system SHALL create a secure session with JWT token and redirect to dashboard.

WHEN a user requests password reset, THE system SHALL send a reset link valid for 1 hour.

WHEN a user submits a new password via reset link, THE system SHALL invalidate the token and update credentials.

WHEN a user has an inactive account, THE system SHALL block login and display: "Your account is not active. Please check your email for verification instructions."

WHEN a user has been suspended by admin, THE system SHALL display: "Your account has been suspended. Contact support for details."


### 3.2. Product Catalog Management

WHEN a seller adds a new product, THE system SHALL require category selection from a hierarchical taxonomy.

WHEN a customer views a category, THE system SHALL display subcategories if available, followed by product listings.

WHEN a customer searches for products, THE system SHALL match against product name, description, and seller name.

WHEN a customer applies filters (price range, brand, rating), THE system SHALL update results in real-time with visual feedback.

WHEN a customer sorts products, THE system SHALL re-order results by selected criteria (price low-high, rating, newest).

WHEN a product is marked as discontinued, THE system SHALL remove it from search results and category listings.

WHEN a product is hidden by admin, THE system SHALL display a placeholder: "This product is currently unavailable."

WHEN a product's inventory falls to zero, THE system SHALL display: "Out of stock." but keep the product visible.

WHEN a customer views product details, THE system SHALL show all available variants, pricing, and inventory levels.

WHEN a seller edits a product, THE system SHALL prevent changes while live orders exist for the product.

WHEN a product is updated, THE system SHALL notify all customers with the product in their wishlist.


### 3.3. Product Variants and Inventory

WHEN a seller creates a product with variants, THE system SHALL allow assignment of attributes: color, size, material, etc.

WHEN a variant is created, THE system SHALL generate a unique SKU in format: "SKU-<productID>-<attributeHash>".

WHEN a customer selects a variant, THE system SHALL display the corresponding price, image, and inventory count.

WHEN an inventory level for a specific variant is updated, THE system SHALL reflect the change instantly across all customer views.

WHEN a customer adds a variant to cart, THE system SHALL lock that variant’s inventory for 15 minutes.

WHEN inventory for a specific variant is depleted, THE system SHALL disable the variant selection and display: "This option is no longer available."

WHEN a seller updates a variant’s price, THE system SHALL update existing cart items only if the cart has not moved to order placement.

WHEN an order is placed with a variant, THE system SHALL record the exact price and inventory quantity at time of purchase.

IF a variant is deleted after being purchased, THE system SHALL retain the historical record but prevent future purchases.


### 3.4. Shopping Cart and Wishlist

WHEN a customer adds an item to cart, THE system SHALL increment the cart item count and store item details including variant selection and quantity.

WHEN a customer modifies cart quantity, THE system SHALL validate that the requested quantity does not exceed available inventory.

IF requested quantity exceeds inventory, THEN THE system SHALL auto-adjust to available stock and display: "Quantity adjusted to available stock: [new quantity]."

WHEN a customer removes an item, THE system SHALL immediately release the locked inventory.

WHEN a customer adds an item to wishlist, THE system SHALL store the product reference without locking inventory.

WHEN a customer moves an item from wishlist to cart, THE system SHALL validate inventory before adding.

WHEN a customer leaves the site with items in cart, THE system SHALL persist the cart data for logged-in users across sessions.

WHEN a guest user (not logged in) adds items to cart, THE system SHALL store cart in browser localStorage for 7 days.

WHEN a guest logs in, THE system SHALL merge browser cart with account cart, prioritizing existing items.

WHEN a product in cart is removed by seller or discontinued, THE system SHALL display: "[Product Name] has been removed from the catalog and has been deleted from your cart."


### 3.5. Order Placement and Validation

WHEN a customer proceeds to checkout, THE system SHALL validate that the cart contains at least one item with active inventory.

WHEN a customer selects a shipping address, THE system SHALL validate that the address contains a valid name, street address, city, state/province, postal code, and country.

WHEN a customer selects an address with incomplete or invalid data, THE system SHALL display a clear error message listing the exact missing or invalid fields and prevent order progression.

WHEN a customer selects a shipping address outside the seller's service area, THE system SHALL display a warning and suggest an alternative address but allow the customer to proceed with a confirmation checkbox.

WHEN a customer changes payment method, THE system SHALL validate that the payment method is active and not expired.

WHEN a customer attempts to pay with a credit card, THE system SHALL verify that the card is not expired and the CVV matches the stored token.

WHEN an item in the cart has been discontinued or removed by the seller, THE system SHALL remove it from the order with a notification: "[Product Name] is no longer available and has been removed from your order."

WHEN an item's price has changed since it was added to the cart, THE system SHALL notify the customer: "Price for [Product Name] has changed from [old price] to [new price]. Are you sure you want to proceed?" and require explicit confirmation.

IF a customer's cart contains items from sellers who do not ship to the selected address, THEN THE system SHALL display an error: "Some items in your cart cannot be shipped to the selected address. Please remove them or choose another address."

WHEN a customer tries to place an order with zero total value (e.g., only discounted items with coupon), THE system SHALL allow the order but require email newsletter subscription acceptance.

WHERE a customer has exceeded their monthly purchase limit for high-risk items, THE system SHALL block the order and display: "Your monthly limit for this item has been reached. You may order again after [date]."

WHEN a customer attempts to purchase an item with conflicting attributes (e.g., multiple colors selected when single choice required), THE system SHALL display: "Invalid selection. You may only choose one color option."

WHEN a customer tries to use an invalid coupon code, THE system SHALL display: "This coupon code is not valid or has expired. Please check the code and try again." and retain cart prices.

WHEN a customer uses a gift card, THE system SHALL validate remaining balance and apply it to the order.


### 3.6. Payment Processing

WHEN a customer submits payment, THE system SHALL initiate authorization with selected payment provider.

WHEN a payment method requires redirection (e.g., PayPal), THE system SHALL redirect to the provider’s site and wait for callback.

WHEN payment is successfully authorized, THE system SHALL change the order status to "payment_confirmed".

WHEN payment fails, THE system SHALL record the failure reason and display a specific message: "Payment declined: [reason]. Please try another method."

WHEN payment fails three times for the same order, THE system SHALL automatically cancel the order, release all reserved inventory, and notify the customer: "Your order has been cancelled due to repeated payment failures. Please try again later or contact support."

WHEN a customer uses a saved payment method, THE system SHALL use the tokenized details without re-entering billing information.

WHEN a customer chooses to save a new payment method, THE system SHALL send the details securely to the payment gateway and store only the tokenized ID.

WHEN a chargeback occurs, THE system SHALL change order status to "chargeback" and notify seller and admin.

WHEN a refund is processed, THE system SHALL reduce the seller's payable balance and restore inventory if applicable.


### 3.7. Order Tracking and Fulfillment

WHEN an order is created, THE system SHALL generate a unique order ID with format "ORD-YYYYMMDD-#####".

WHEN an order is created, THE system SHALL reserve inventory for all items in the order for 30 minutes.

WHEN an order is created, THE system SHALL lock all cart items to prevent modification until order completion or expiration.

WHEN an order is created, THE system SHALL record the exact timestamp of order creation, selected shipping address, selected payment method, and all cart item details at the moment of purchase.

WHEN an order is created, THE system SHALL immediately create an order record in the system with status "pending_payment".

WHEN an order is created, THE system SHALL associate it with the customer's account and seller IDs for each product.

WHEN payment is successfully authorized, THE system SHALL change the order status to "payment_confirmed".

WHEN payment is successfully confirmed, THE system SHALL update the inventory by reducing the reserved quantities and remove the cart items from the customer's cart.

WHEN payment is successfully confirmed, THE system SHALL send a confirmation email to the customer with subject: "Order Confirmed: #ORD-XXXX" containing the order summary, shipping address, payment method, and estimated delivery date.

WHEN payment is successfully confirmed, THE system SHALL send a notification to each seller with products in the order with subject: "New Order Received: #ORD-XXXX for your products".

WHEN payment is successfully confirmed, THE system SHALL trigger a system event: "order_confirmed" used for analytics, fulfillment, and notification services.

WHEN a seller marks an order as "shipped", THE system SHALL update the order status to "shipped" and record tracking number and carrier.

WHEN a tracking number is provided, THE system SHALL generate a link to carrier’s tracking page.

WHEN an order is delivered, THE system SHALL automatically update status to "delivered" after 7 days of "shipped" status if not manually updated.

IF the delivery status cannot be verified for 30 days, THE system SHALL automatically update to "delivered" and notify the customer.

WHEN a customer requests tracking update, THE system SHALL retrieve and display current carrier status.


### 3.8. Product Reviews and Ratings

WHEN a customer receives a delivered order, THE system SHALL enable them to leave a review for each product after 24 hours.

WHEN a customer submits a review, THE system SHALL require a rating (1-5 stars) and allow optional text comment.

WHEN a review is submitted, THE system SHALL validate that the customer has purchased the product.

WHEN a review contains profanity or violations, THE system SHALL flag it for moderator review and display: "Your review is under moderation and will be published soon."

WHEN a review is approved, THE system SHALL calculate the product’s average rating from all reviews and update display.

WHEN a seller responds to a review, THE system SHALL link the response to the original review and display both.

WHEN a review is flagged as fraudulent, THE system SHALL hide it and notify the admin.

WHEN a product has no reviews, THE system SHALL display: "Be the first to review this product."

WHEN a customer tries to review a product they didn’t purchase, THE system SHALL display: "You can only leave a review for products you’ve purchased."


### 3.9. Seller Management

WHEN a business applies to become a seller, THE system SHALL require business name, contact info, tax ID, and banking details.

WHEN a seller application is submitted, THE system SHALL set status to "pending_review" and notify admin.

WHEN an admin approves a seller, THE system SHALL activate their account and grant access to seller dashboard.

WHEN an admin rejects a seller, THE system SHALL notify them with reason and allow reapplication after 30 days.

WHEN a seller uploads a product, THE system SHALL require product name, category, description, images, base price, and variant definitions.

WHEN a seller updates inventory, THE system SHALL enforce that new quantity is not negative.

WHEN a seller sets a price that is below the platform minimum, THE system SHALL display: "Minimum price allowed is $X. Please adjust your listing."

WHEN a seller receives an order, THE system SHALL show fulfillment deadline (e.g., "Ship within 48 hours").

WHEN a seller fails to fulfill an order within deadline, THE system SHALL automatically cancel the order and initiate refund.

WHEN a seller issues a refund, THE system SHALL record reason and update customer balance.

WHEN a seller disables a product, THE system SHALL archive it and remove from search results.

WHEN a seller requests account deletion, THE system SHALL deactivate account and retain historical data for 1 year.


### 3.10. Admin Dashboard

WHEN an admin accesses the dashboard, THE system SHALL display summary metrics: total active sellers, pending applications, recent orders, revenue, and support tickets.

WHEN an admin navigates to user management, THE system SHALL see searchable list of customers and sellers with filter by status.

WHEN an admin suspends a user, THE system SHALL notify the user with reason and prevent login.

WHEN an admin deletes a user, THE system SHALL remove all personally identifiable data but retain order history for legal compliance.

WHEN an admin navigates to product moderation, THE system SHALL see all listings with flags for violations (fraud, inappropriate images, etc.).

WHEN an admin bans a product, THE system SHALL hide it from public view and notify seller.

WHEN an admin navigates to order supervision, THE system SHALL view all orders with ability to override status, refund manually, or contact customer.

WHEN an admin navigates to inventory management, THE system SHALL view aggregate inventory across sellers and override quantities if needed for emergencies.

WHEN an admin resets a user’s password, THE system SHALL generate temporary password and send via secure channel.

WHEN an admin configures system settings, THE system SHALL validate thresholds (e.g., minimum payout amount, payment timeout, review eligibility period).


### 3.11. System-wide Business Rules

1. All orders must originate from authenticated users or authenticated guest sessions.
2. Product prices must be validated against current inventory pricing at order time.
3. Shipping address must match country of at least one seller in cart.
4. Payment method must be active, not expired, and not flagged for fraud.
5. Inventory must be reserved for 30 minutes after order creation.
6. Cart items must be locked during order placement to prevent concurrent modifications.
7. Orders cannot be created with items that have zero or negative stock.
8. Cancelled orders must retain record for audit purposes.
9. Refunded amounts cannot exceed original order value.
10. Duplicate orders (same items, same address, same payment) within 5 minutes are blocked with warning.
11. All API actions must be logged for audit trail.
12. All sensitive data must be encrypted at rest and in transit.
13. Sessions must expire after 12 hours of inactivity.
14. Passwords must be hashed withbcrypt and never stored in plaintext.
15. Customer reviews must be anonymized and protected from manipulation.
16. Seller payouts must be settled weekly, minimum $50.


## 4. Authentication and Authorization

All system interactions require a valid JWT token passed in the Authorization header.

### Token Structure

The JWT token contains:
- Sub: user ID
- Role: 'customer', 'seller', or 'admin'
- Exp: expiration timestamp
- Iat: issued timestamp
- Permissions: object with feature-specific flags (e.g., canManageOrders, canApproveSellers)

### Permission Matrix

| Feature | Customer | Seller | Admin |
|--------|----------|--------|-------|
| View Public Catalog | ✅ | ✅ | ✅ |
| Add to Cart | ✅ | ❌ | ❌ |
| Place Order | ✅ | ❌ | ❌ |
| Manage Shipping Address | ✅ | ❌ | ❌ |
| View Order History | ✅ | ❌ | ✅ |
| Register as Seller | ✅ | ❌ | ❌ |
| Upload Product | ❌ | ✅ | ❌ |
| Manage Inventory | ❌ | ✅ | ✅ |
| Fulfill Order | ❌ | ✅ | ✅ |
| View Seller Analytics | ❌ | ✅ | ✅ |
| Approve Seller | ❌ | ❌ | ✅ |
| Suspend User | ❌ | ❌ | ✅ |
| Ban Product | ❌ | ❌ | ✅ |
| Manual Refund | ❌ | ❌ | ✅ |
| Override Inventory | ❌ | ❌ | ✅ |
| Access Audit Logs | ❌ | ❌ | ✅ |

Authentication endpoints:
- POST /auth/register
- POST /auth/login
- POST /auth/forgot-password
- POST /auth/reset-password
- POST /auth/verify-email
- POST /auth/logout

Authorization middleware enforces role-based access control on all protected routes.


## 5. Performance and Reliability Requirements

THE system SHALL validate order requirements and redirect to payment gateway within 2 seconds.

WHEN a customer selects a shipping address, THE system SHALL update the order summary with new shipping costs within 500 milliseconds.

THROUGHOUT the order placement flow, THE system SHALL provide visual feedback to the user (loading indicators, progress bars) if any step takes longer than 1 second.

WHEN a customer retries payment, THE system SHALL allow attempts with less than 150 millisecond response time.

THE system SHALL handle 5000 concurrent order placement attempts without degradation.

THE system SHALL maintain 99.9% uptime during business hours (6 AM - 12 AM Seoul time).

All notifications (email, SMS, push) SHALL be delivered within 5 minutes of trigger event.


## 6. Error Handling and Recovery

IF the customer's payment authorization fails, THEN THE system SHALL change the order status to "payment_failed" and display a clear error message with the failure reason.

WHEN payment fails, THE system SHALL retain reservations for 30 minutes and allow the customer to retry payment with a different method or resolve the issue.

WHEN a customer navigates away from the order placement page without completing payment, THE system SHALL keep the order as "pending_payment" for 15 minutes before automatically canceling and releasing inventory.

WHEN inventory reservation expires due to timeout, THE system SHALL automatically cancel the order and notify the customer: "Your order timed out due to inactivity. Items have been released back to inventory. Please place your order again."

IF an error occurs during order creation (database failure, service outage), THEN THE system SHALL display: "We're sorry. There was a technical issue creating your order. Your cart has been preserved. Please try again in a few minutes." and maintain cart state.

WHEN an error occurs during payment processing, THE system SHALL maintain authentication status and allow retry without forcing login.

WHERE a customer provides an invalid email address during address creation, THE system SHALL display error: "Please enter a valid email address for order confirmation." and highlight the field.

WHEN a customer attempts to place an order with an invalid coupon code, THE system SHALL display: "This coupon code is not valid or has expired. Please check the code and try again." and retain cart prices.

WHEN a seller API integration fails during fulfillment, THE system SHALL retry up to 3 times with exponential backoff.

WHEN an email service fails to deliver, THE system SHALL enqueue retry and notify admin if > 5 failures.


## 7. Cross-Cutting Concerns

### Data Privacy

All personal data (email, address, payment tokens) shall be encrypted at rest using AES-256 and transmitted via TLS 1.3.

GDPR and CCPA compliance requirements are implemented with data export and deletion endpoints.

Customers can request data export or deletion via account settings.

### Internationalization

The system supports multi-currency (USD, KRW, EUR) and language (en, ko, ja) selection.

Product descriptions and reviews are stored in original language with machine translation fallback.

### Scalability

Database schema is designed for sharding by seller region.

Caching layer (Redis) used for product catalog, cart, and inventory.

Message queues (RabbitMQ) handle order notifications and fulfillment triggers.

### Logging and Monitoring

All user actions are logged with timestamp, actor, IP, and payload.

System metrics monitored via Prometheus and alerts configured for latency, error rate, and resource usage.

Audit logs retained for 7 years for compliance.





















































































































































































































































































































































































































































































































