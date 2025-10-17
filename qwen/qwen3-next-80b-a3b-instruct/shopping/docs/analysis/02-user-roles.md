# User Role Definition

## Customer Role Definition

Customers are the primary end-users of the e-commerce platform. They interact with the system to discover, select, purchase, and review products.

### Customer Capabilities 

- THE system SHALL allow unauthenticated visitors to browse the entire product catalog, including product details, images, descriptions, and reviews.
- WHEN a user clicks "Register", THE system SHALL enable creation of a customer account using email and password.
- WHEN a user submits login credentials, THE system SHALL authenticate and establish a secure session.
- THE system SHALL allow authenticated customers to manage multiple shipping addresses and designate one as default.
- WHEN a customer selects a product, THE system SHALL display all available variants (SKUs) with distinct combinations of color, size, and other options.
- THE system SHALL allow customers to add any product variant (SKU) to their shopping cart.
- THE system SHALL allow customers to add any product to their wishlist, independent of cart items.
- WHEN a customer proceeds to checkout, THE system SHALL require selection of one active shipping address.
- WHEN a customer submits payment information, THE system SHALL initiate secure transaction processing.
- THE system SHALL generate an order confirmation with unique order ID upon successful payment.
- WHILE an order is in "Processing" status, THE system SHALL allow the customer to request a cancellation.
- WHEN a customer requests a refund for an order that has been delivered, THE system SHALL initiate a refund workflow requiring seller and admin approval.
- THE system SHALL allow customers to submit reviews and ratings for products they have received.
- THE system SHALL require verified purchase confirmation before allowing a review submission.
- THE system SHALL display a "Verified Purchase" badge on reviews submitted by customers who completed the purchase on this platform.
- WHEN a customer navigates to "Order History", THE system SHALL display all past orders with status, date, and total amount.
- THE system SHALL allow customers to view real-time tracking updates for shipped orders.

### Customer Restrictions

- IF a customer attempts to edit another customer's order, THEN THE system SHALL deny access and display "Access Denied."
- IF a customer attempts to access a seller dashboard, THEN THE system SHALL redirect to homepage with error message.
- IF a customer attempts to list a product, THEN THE system SHALL deny access and display "You must be a registered seller to list products."
- IF a customer attempts to modify inventory levels, THEN THE system SHALL deny access and display "Only sellers and administrators can update inventory."
- WHERE a customer has no orders, THE system SHALL hide the "Order History" section from their dashboard.

---

## Seller Role Definition

Sellers are business users who list, manage, and fulfill products on the platform. They must complete an approval process before gaining full publishing rights.

### Seller Capabilities

- WHEN a user selects "Become a Seller", THE system SHALL enable application for seller status using business email and company details.
- WHILE a seller application is pending, THE system SHALL restrict the user from listing products or viewing sales analytics.
- WHEN an admin approves a seller application, THE system SHALL activate the seller account and grant access to seller dashboard.
- THE system SHALL allow approved sellers to create new product listings with name, description, category, and main image.
- THE system SHALL allow sellers to define multiple product variants (SKUs) per product, each with unique attributes (e.g., color, size, material) and individual pricing.
- THE system SHALL require sellers to set initial inventory count for each SKU.
- WHILE an order status is "Pending Fulfillment", THE system SHALL allow sellers to update tracking information and mark order as shipped.
- THE system SHALL allow sellers to view their product sales, revenue, and order count per day/week/month.
- THE system SHALL allow sellers to respond publicly to customer reviews on their products.
- WHEN a customer requests a return or refund for a seller's product, THE system SHALL notify the seller and allow them to approve, reject, or counter-offer.
- THE system SHALL allow sellers to pause product listings without deleting them.
- THE system SHALL provide sellers with monthly earnings summary and payout eligibility status.
- THE system SHALL require sellers to select a payout method and bank account during onboarding.

### Seller Restrictions

- IF a seller attempts to approve another seller's application, THEN THE system SHALL deny access and display "Only administrators can approve seller accounts."
- IF a seller attempts to view or edit another seller's products or inventory, THEN THE system SHALL deny access and display "You can only manage your own products."
- IF a seller attempts to edit product pricing after an order has been placed, THEN THE system SHALL block the change and display "Cannot modify pricing for active orders."
- IF a seller attempts to delete a product that has existing orders, THEN THE system SHALL prevent deletion and display "Products with order history cannot be deleted. Please archive instead."
- IF a seller attempts to modify product reviews, THEN THE system SHALL deny access and display "Sellers cannot delete or alter customer reviews."
- IF a seller's account is suspended, THEN THE system SHALL restrict all dashboard functions and hide products from public view.

---

## Admin Role Definition

Administrators have full oversight responsibility for platform integrity, user compliance, and operational governance.

### Admin Capabilities

- THE system SHALL allow administrator access to a centralized dashboard with user, product, and order management.
- THE system SHALL enable admins to view, approve, or reject any seller application.
- THE system SHALL allow admins to manually suspend or ban any customer or seller account.
- THE system SHALL allow admins to edit product details (name, category, description, images) regardless of ownership.
- THE system SHALL allow admins to override inventory adjustments made by sellers.
- THE system SHALL allow admins to approve or reject customer refund requests regardless of seller decision.
- THE system SHALL allow admins to cancel or modify orders regardless of status or ownership.
- THE system SHALL allow admins to mark any customer review as inappropriate and hide it from public view.
- THE system SHALL allow admins to export reports of user registration, sales volume, payment processing, and refund rates.
- THE system SHALL allow admins to impose platform-wide announcements or maintenance notices.
- THE system SHALL trigger automated notifications to admins when order volume exceeds thresholds or when refund rates spike.
- THE system SHALL maintain a full audit log of all admin actions including timestamp, user ID, action performed, and affected entity.

### Admin Restrictions

- IF an admin attempts to delete a user’s account while active orders exist, THEN THE system SHALL warn "This user has active order history. Consider suspension instead."
- IF an admin attempts to change the core authentication mechanism or role definitions via dashboard, THEN THE system SHALL prevent modification and display "Role and authentication structure is system-protected and must be modified via configuration files."
- WHERE seller approval status is "Rejected", THE system SHALL prohibit reinstatement without new application.
- THE system SHALL not allow admins to bypass payment processing or fraud detection systems.

---

## Role Hierarchy and Access Boundaries

The system enforces strict role boundaries to protect data integrity and business logic.

### Access Hierarchy

- **Customer** (member)
  - Can view catalog, cart, wishlist, own orders, submit reviews
  - Cannot list products, edit inventory, manage other users

- **Seller** (member)
  - Can do everything a customer can do
  - Can list products, manage SKUs and inventory, fulfill orders, respond to reviews
  - Cannot approve other sellers, view other sellers' data, override orders

- **Admin** (admin)
  - Can do everything a customer and seller can do
  - Can approve/reject sellers, override any order, view all user data, audit all actions
  - Cannot modify system architecture or programming logic

### Role Transition Rules

- WHEN a customer submits a seller application, THEN THE system SHALL retain their customer permissions until the application is approved.
- WHEN a seller application is rejected, THEN THE system SHALL downgrade their role to "customer" and revoke all seller access.
- WHEN a seller account is suspended or banned by admin, THEN THE system SHALL automatically downgrade their role to "customer" and disable all seller functionality.
- WHEN an admin removes a user from a group or deactivates an account, THEN THE system SHALL preserve data but deny any further access.
- THE system SHALL allow admin to manually elevate a customer to seller status without application, for special cases.

---

## Authentication and Session Requirements

User roles control access to system features, and authentication must enforce role-based permissions.

### Core Authentication Functions

- THE system SHALL allow users to register with email and password.
- THE system SHALL allow users to login using email and password.
- THE system SHALL allow users to logout and terminate their active session.
- THE system SHALL send an email verification link upon registration.
- THE system SHALL require email verification before permitting order placement or review submission.
- THE system SHALL allow password reset via verified email.
- THE system SHALL allow users to change their password at any time.
- THE system SHALL allow users to revoke sessions from all other devices.

### Session and Token Management

- THE system SHALL use JWT (JSON Web Tokens) for session authentication.
- THE access token SHALL expire after 30 minutes of inactivity.
- THE refresh token SHALL be valid for 30 days and stored in an httpOnly cookie.
- THE JWT payload SHALL include: userId (string), role (string), and permissions (array of strings).
- THE system SHALL include permissions array to ensure fine-grained authorization (e.g., ["view_products", "add_to_cart", "submit_review", "edit_seller_products"]).
- THE system SHALL validate token signature on every protected request.
- WHEN a token expires, THE system SHALL return HTTP 401 with error code "AUTH_TOKEN_EXPIRED".
- WHEN a user logs out, THE system SHALL invalidate the refresh token immediately.

### Role-Based Access Control (RBAC)

- For each endpoint, THE system SHALL validate the user’s role against required permissions.
- WHERE a request is made to a seller-only endpoint, THE system SHALL validate that role equals "seller" and seller account is approved.
- WHERE a request is made to an admin-only endpoint, THE system SHALL validate that role equals "admin".
- IF a user’s role is modified by admin while they are active, THEN THE system SHALL require re-authentication to refresh JWT.
- THE system SHALL not permit role escalation through token tampering or frontend manipulation.


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*