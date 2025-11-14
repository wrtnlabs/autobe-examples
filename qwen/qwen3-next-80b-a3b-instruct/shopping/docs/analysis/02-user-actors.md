## Introduction to User Actors

The shopping mall platform defines three distinct user actor roles: customer, seller, and admin. Each role represents a unique business function with specific permissions, responsibilities, and access controls. These actors are not merely user types but represent fundamentally different behavioral models within the system. Customers are end consumers seeking to purchase products. Sellers are third-party merchants who list, manage, and fulfill products for sale. Admins are platform operators with overarching authority to maintain system integrity, security, and compliance.

The architecture deliberately separates customer and seller accounts, even though both are classified as 'member' kind. This separation ensures data isolation, prevents permission conflicts, and allows specialized data models tailored to each actor's unique workflow. A customer's profile contains shipping addresses, order history, and review records. A seller's profile contains business information, product catalogs, inventory data, and sales analytics. An admin's profile contains system-level access to all data across customer and seller domains.

This actor separation enforces the **principle of least privilege**, ensuring that each actor has only the permissions necessary to perform their business function. No actor can perform actions intended for another role. For example, a seller cannot manage other sellers' products, and a customer cannot view administrative reports. This separation is critical for trust, security, and scalability in a multi-vendor e-commerce platform.

## Customer Actor

A customer is a registered end-user who interacts with the shopping mall platform to discover, select, purchase, and review products. Customers have no administrative or merchandising capabilities and are confined to the consumer side of the platform.

### Core Capabilities

- THE customer SHALL be able to register an account using email and password.
- THE customer SHALL be able to log in to their account using email and password.
- THE customer SHALL be able to log out to terminate their active session.
- THE customer SHALL be able to reset their password if forgotten through a verified email reset link.
- THE customer SHALL be able to verify their email address by clicking a confirmation link sent to their registered email.
- THE customer SHALL be able to manage multiple shipping and billing addresses within their account.
- THE customer SHALL be able to browse the entire product catalog by category, search term, or filter.
- THE customer SHALL be able to view detailed product information including descriptions, images, pricing, and customer reviews.
- THE customer SHALL be able to add products to their shopping cart.
- THE customer SHALL be able to view, modify, and remove items from their shopping cart.
- THE customer SHALL be able to save products to a wishlist for future consideration.
- THE customer SHALL be able to move products between their shopping cart and wishlist.
- THE customer SHALL be able to initiate the checkout process to purchase items in their cart.
- THE customer SHALL be able to select a preferred shipping address during checkout.
- THE customer SHALL be able to select a payment method from saved options or add a new payment method.
- THE customer SHALL be able to submit an order after reviewing all items, total cost, taxes, and shipping fees.
- THE customer SHALL be able to view the status of all past and current orders.
- THE customer SHALL be able to track real-time shipping status for each order using tracking numbers provided by carriers.
- THE customer SHALL be able to request cancellation of an order while it is in 'pending' or 'processing' status.
- THE customer SHALL be able to request a refund for delivered items that are damaged, defective, or incorrect.
- THE customer SHALL be able to request a return for eligible items, which generates a prepaid return shipping label.
- THE customer SHALL be able to write and publish product reviews after completing purchase of that product.
- THE customer SHALL be able to rate products using a 1–5 star rating system.
- THE customer SHALL be able to view reviews written by other customers and filter by rating, verified purchase status, or date.
- THE customer SHALL be able to report inappropriate or fraudulent reviews for administrative review.
- THE customer SHALL be able to receive automated email or SMS notifications for order status changes, payment confirmations, shipping updates, and refund processing.

### Restrictions

- IF a customer attempts to create a product listing, THEN THE system SHALL deny the action with an error message.
- IF a customer attempts to access seller dashboard or analytics, THEN THE system SHALL deny access and redirect to customer homepage.
- IF a customer attempts to view or edit another customer's order history, THEN THE system SHALL deny access and return an error.
- IF a customer attempts to modify product pricing or inventory, THEN THE system SHALL deny the request.
- IF a customer attempts to approve or reject other users' accounts, THEN THE system SHALL deny the request.
- WHERE a product is out of stock, THEN THE system SHALL prevent the customer from adding that product to cart.
- WHERE a customer's payment method fails, THEN THE system SHALL preserve their cart state and allow retry without losing items.

## Seller Actor

A seller is a registered merchant who partners with the shopping mall platform to list, sell, and fulfill products. Sellers access a dedicated merchant portal to manage their inventory, processing orders, and analyzing sales performance.

### Core Capabilities

- THE seller SHALL be able to register an account using email and password.
- THE seller SHALL be able to log in to their seller dashboard using email and password.
- THE seller SHALL be able to log out to terminate their active session.
- THE seller SHALL be able to reset their password if forgotten through a verified email reset link.
- THE seller SHALL be able to verify their email address by clicking a confirmation link sent to their registered email.
- THE seller SHALL be able to complete a business verification process to unlock full selling privileges.
- THE seller SHALL be able to create and publish new products to the marketplace.
- THE seller SHALL be able to edit existing product information including name, description, category, images, and pricing.
- THE seller SHALL be able to archive or unpublish products without deleting them permanently.
- THE seller SHALL be able to define multiple product variants through SKU-level attributes (e.g., color, size, material).
- THE seller SHALL be able to set and manage inventory quantities for each individual SKU.
- THE seller SHALL be able to set low-stock alerts (triggered at 3 units or fewer remaining).
- THE seller SHALL be able to view real-time inventory levels across all their products and SKUs.
- THE seller SHALL be able to view and process all orders for their products.
- THE seller SHALL be able to mark orders as 'shipped' and enter valid tracking numbers.
- THE seller SHALL be able to view summary sales data including total sales volume, revenue, order count, and best-selling products.
- THE seller SHALL be able to export reports of sales, orders, and inventory status in CSV or PDF format.
- THE seller SHALL be able to respond publicly to customer reviews on their products.
- THE seller SHALL be able to view reports on product visibility and conversion rates.
- THE seller SHALL be able to receive automated email or SMS notifications for new orders, order cancellations, refund requests, low inventory alerts, and review responses.

### Restrictions

- IF a seller attempts to manage products not belonging to their account, THEN THE system SHALL deny access.
- IF a seller attempts to return items from another seller's order, THEN THE system SHALL deny the request.
- IF a seller attempts to edit customers' addresses or payment methods, THEN THE system SHALL deny the action.
- IF a seller attempts to refund a customer directly without going through system-approved process, THEN THE system SHALL deny the request.
- IF a seller attempts to access admin dashboard or analytics, THEN THE system SHALL deny access.
- IF a seller attempts to modify platform-wide configurations (e.g., payment gateways, tax rules), THEN THE system SHALL deny the request.
- IF a seller attempts to view other sellers' sales performance or customer data, THEN THE system SHALL deny access.
- WHERE a product has active orders with remaining inventory, THEN THE system SHALL prevent the seller from deleting that product.
- WHERE a seller attempts to set inventory below zero, THEN THE system SHALL reject the update and display error.

## Admin Actor

An admin is a platform operator with full system control and oversight responsibilities. This actor has unrestricted access to all data and functions across customer and seller domains and is responsible for maintaining platform integrity, security, and compliance.

### Core Capabilities

- THE admin SHALL be able to log in to the admin dashboard using secure credentials.
- THE admin SHALL be able to log out to terminate their active session.
- THE admin SHALL be able to manage all customer accounts (view, suspend, deactivate, or delete).
- THE admin SHALL be able to manage all seller accounts (view, suspend, deactivate, delete, or approve verification status).
- THE admin SHALL be able to view, edit, and delete any product regardless of seller affiliation.
- THE admin SHALL be able to override product pricing, descriptions, or categories on behalf of sellers.
- THE admin SHALL be able to freeze or remove any product from the marketplace without seller approval.
- THE admin SHALL be able to view all orders placed on the platform regardless of seller or customer.
- THE admin SHALL be able to cancel, refund, or modify any order without seller involvement.
- THE admin SHALL be able to override shipping statuses or manually update order states.
- THE admin SHALL be able to access and review all customer reviews and seller responses.
- THE admin SHALL be able to delete, hide, or flag inappropriate reviews.
- THE admin SHALL be able to manage payment gateway configurations (e.g., enable/disable Stripe, PayPal, bank transfer).
- THE admin SHALL be able to view aggregated sales reports including total platform revenue, user growth, cancellation rates, and top-performing categories.
- THE admin SHALL be able to generate exportable reports for tax, audit, or compliance purposes.
- THE admin SHALL be able to access and review system audit logs for all user actions, including who made changes and when.
- THE admin SHALL be able to send broadcast messages or notifications to all customers or sellers.
- THE admin SHALL be able to enforce platform-wide policies (e.g., banned keywords, prohibited product categories).
- THE admin SHALL be able to resolve disputes between customers and sellers regarding returns, refunds, or product quality.
- THE admin SHALL be able to view and manipulate inventory levels across all sellers.
- THE admin SHALL be able to suspend any seller account for policy violations.
- THE admin SHALL be able to generate automated analytics on customer behavior, seller performance, and product trends.

### Restrictions

- IF a transaction is already refunded, THEN THE admin SHALL not be able to initiate a second refund for the same order.
- IF a product is completely removed from the system, THEN THE system SHALL preserve order history and reviews for audit purposes.
- WHERE a user has been banned, THEN THE system SHALL prevent login attempts and auto-delete pending cart or wishlist items.
- WHERE an admin action modifies business-critical data (e.g., price change, order refund), THEN THE system SHALL log the change with timestamp, admin ID, and original value.
- WHERE a product is in the process of being shipped, THEN THE system SHALL prevent admin deletion without explicit override confirmation.

## Authentication Requirements

### Core Functions

- WHEN a guest visits the platform, THE system SHALL allow them to browse products and read reviews without login.
- WHEN a guest clicks 'Register', THE system SHALL present registration form requiring name, email, and password.
- WHEN a guest submits registration, THE system SHALL validate email format and password strength (minimum 8 characters, including letter and number).
- WHEN registration is successful, THE system SHALL send a verification email with unique token link.
- WHEN the user clicks email verification link, THE system SHALL validate token and activate account.
- WHEN a verified user attempts to log in, THE system SHALL authenticate credentials and issue JWT access token.
- WHEN authentication fails due to incorrect credentials, THE system SHALL return HTTP 401 with error code AUTH_INVALID_CREDENTIALS.
- WHEN a user forgets password, THE system SHALL allow password reset via email with 24-hour token validity.
- WHEN a user logs in from new device or browser, THE system SHALL require explicit confirmation or secondary verification if enabled.
- WHEN a user logs out, THE system SHALL invalidate the current access token and clear any cached session.
- WHEN a session expires after inactivity for 30 minutes, THE system SHALL redirect user to login page.
- WHEN a refresh token is used to renew session, THE system SHALL issue new access token with 15-minute expiration and extend refresh token lifetime if within grace period.

### Token Management

- THE system SHALL use JWT (JSON Web Tokens) for all authenticated sessions.
- THE access token SHALL expire after 15 minutes of issuance.
- THE refresh token SHALL expire after 30 days.
- THE access token SHALL include: userId, role, and permissions array.
- THE refresh token SHALL include: userId, role, and device fingerprint.
- THE system SHALL store refresh tokens encrypted in secure server-side storage (not in browser).
- THE system SHALL revoke all tokens if a user initiates 'Logout from all devices'.
- THE system SHALL notify user via email if a new device logs in.

## Authorization Matrix

| Action                                              | Customer | Seller | Admin |
|-----------------------------------------------------|----------|--------|-------|
| Browse product catalog                              | ✅        | ✅      | ✅     |
| View product reviews                                | ✅        | ✅      | ✅     |
| Add product to cart                                 | ✅        | ❌      | ❌     |
| Save product to wishlist                            | ✅        | ❌      | ❌     |
| Initiate checkout process                           | ✅        | ❌      | ❌     |
| Select shipping address                             | ✅        | ❌      | ❌     |
| Add payment method                                  | ✅        | ❌      | ❌     |
| Confirm/purchase order                              | ✅        | ❌      | ❌     |
| View order history                                  | ✅        | ❌      | ❌     |
| Track shipment status                               | ✅        | ❌      | ❌     |
| Request order cancellation                          | ✅        | ❌      | ❌     |
| Request refund                                      | ✅        | ❌      | ❌     |
| Return product with label                           | ✅        | ❌      | ❌     |
| Write product review                                | ✅        | ❌      | ❌     |
| Rate product                                        | ✅        | ❌      | ❌     |
| Respond to review                                   | ❌        | ✅      | ✅     |
| Report review                                       | ✅        | ✅      | ✅     |
| Create new product listing                          | ❌        | ✅      | ✅     |
| Edit own product details                            | ❌        | ✅      | ✅     |
| Delete own product                                  | ❌        | ✅      | ✅     |
| Archive product                                     | ❌        | ✅      | ✅     |
| Define SKU variants                                 | ❌        | ✅      | ✅     |
| Manage inventory per SKU                            | ❌        | ✅      | ✅     |
| Set low-stock alert                                 | ❌        | ✅      | ✅     |
| View own sales report                               | ❌        | ✅      | ✅     |
| Mark order as shipped                               | ❌        | ✅      | ✅     |
| Enter tracking number                               | ❌        | ✅      | ✅     |
| View order details for owned products               | ❌        | ✅      | ✅     |
| View all platform orders                            | ❌        | ❌      | ✅     |
| Cancel any order                                    | ❌        | ❌      | ✅     |
| Refund any order                                    | ❌        | ❌      | ✅     |
| Override pricing or inventory                       | ❌        | ❌      | ✅     |
| Suspend customer account                            | ❌        | ❌      | ✅     |
| Suspend seller account                              | ❌        | ❌      | ✅     |
| Enable/disable payment gateway                      | ❌        | ❌      | ✅     |
| Delete any product                                  | ❌        | ❌      | ✅     |
| Edit any review or hide product                     | ❌        | ❌      | ✅     |
| Access admin dashboard                              | ❌        | ❌      | ✅     |
| View system audit logs                              | ❌        | ❌      | ✅     |
| Export platform-wide reports                        | ❌        | ❌      | ✅     |
| Send broadcast message                              | ❌        | ❌      | ✅     |
| Manage platform-wide policies                       | ❌        | ❌      | ✅     |
| Access seller registration portal                   | ❌        | certaintly not this but custome (explicitly blocked) | ✅     |
| Access customer dashboard                           | ❌        | ❌      | ✅     |