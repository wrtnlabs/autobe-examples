# User Actors and Authentication System

## User Actor Overview and System Architecture

The e-commerce shopping mall platform implements a role-based access control system with four distinct user actor types. Each actor has specific capabilities, permission levels, and authentication requirements that govern their interaction with the platform's APIs and features. This document defines the complete authentication architecture, permission structure, and security protocols that backend developers must implement.

### Actor Hierarchy and Authentication Model

The platform supports a hierarchical permission model where different actors have different levels of access:

- **Guest (Unauthenticated)**: Public access to read-only catalog features
- **Customer**: Authenticated user with shopping and order management capabilities
- **Seller**: Authenticated merchant with product and order fulfillment capabilities
- **Admin**: System administrator with full platform management and oversight

Each actor requires unique authentication credentials and receives a JWT token with role-specific claims that control API access.

### System Security Principles

THE system SHALL implement comprehensive authentication and authorization controls that verify user identity before allowing access to protected resources and enforce permission restrictions based on user role at every API endpoint.

WHEN any unauthenticated request is received for a protected endpoint, THE system SHALL return HTTP 401 (Unauthorized) with appropriate error messaging.

WHEN an authenticated request contains insufficient permissions for the requested action, THE system SHALL return HTTP 403 (Forbidden) with clear indication of required permissions.

---

## Guest User (Unauthenticated)

### Guest User Definition

Guest users are unauthenticated visitors who can access the platform's public-facing catalog and search features without creating an account. They represent the widest possible audience for product discovery and browsing.

### Guest User Capabilities

WHEN a guest user accesses the platform, THE system SHALL allow browsing of the complete product catalog without authentication.

THE guest user SHALL be able to view product details including descriptions, images, pricing, and specifications without logging in.

THE guest user SHALL be able to search for products by keyword and filter products by category, price range, and ratings.

THE guest user SHALL be able to view product reviews and ratings left by other customers without authentication.

THE guest user SHALL be able to view seller profiles and merchant information in read-only mode.

### Guest User Limitations

THE guest user SHALL NOT be able to create shopping carts or wishlists without registration and authentication.

THE guest user SHALL NOT be able to place orders or access any payment processing functionality.

THE guest user SHALL NOT be able to view order history or track existing orders.

THE guest user SHALL NOT be able to leave product reviews or ratings.

THE guest user SHALL NOT be able to save personal information such as addresses or payment methods.

THE guest user SHALL NOT be able to access seller dashboard or admin features under any circumstance.

### Guest to Customer Conversion

WHEN a guest user attempts to create a cart or proceed to checkout, THE system SHALL redirect them to the registration page with a clear message that account creation is required.

WHEN a guest completes registration on the platform, THE system SHALL automatically convert their session from guest to authenticated customer and assign appropriate customer permissions.

---

## Customer Actor

### Customer Definition

Customers are authenticated individual users who register on the platform with valid email addresses and passwords. They can manage personal accounts, browse products, create and manage shopping carts, place orders, make payments, track shipments, and interact with products through reviews and wishlists. Customers represent the core user base for e-commerce transactions.

### Customer Authentication Requirements

#### Registration Process

WHEN a prospective customer submits a registration form with email, password, and basic profile information, THE system SHALL validate the input data according to specified rules.

THE system SHALL require a unique email address that is not already associated with another customer or seller account.

THE system SHALL require a password with minimum 8 characters including at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*).

THE system SHALL require customers to provide a first name and last name for their profile.

THE system SHALL require an email verification step where customers must click a verification link sent to their registered email address before their account becomes fully active.

WHEN email verification is completed successfully, THE system SHALL send a welcome email confirming account activation.

IF a customer does not verify their email within 24 hours of registration, THE system SHALL send a reminder email with a new verification link.

#### Login Process

WHEN a customer submits login credentials (email and password), THE system SHALL validate credentials against stored encrypted password hashes using bcrypt or equivalent.

IF credentials are invalid, THE system SHALL return HTTP 401 with error code "AUTH_INVALID_CREDENTIALS" and NOT reveal whether the email exists in the system (prevent email enumeration).

IF the customer's account is suspended or deactivated by an admin, THE system SHALL return HTTP 403 with error code "AUTH_ACCOUNT_SUSPENDED" and include contact information for account recovery.

IF the customer account does not have a verified email, THE system SHALL return HTTP 403 with error code "AUTH_EMAIL_NOT_VERIFIED" and offer option to resend verification email.

WHEN credentials are valid and account is active, THE system SHALL generate a JWT access token and refresh token.

#### Password Management

THE customer SHALL be able to change their password at any time from their account settings.

WHEN a customer requests a password change, THE system SHALL require them to authenticate with their current password to prevent unauthorized account access.

THE system SHALL require new passwords to meet the same complexity requirements as during registration.

WHEN a customer submits a forgotten password request, THE system SHALL send a password reset link to their registered email address.

THE password reset link SHALL expire after 1 hour to prevent unauthorized access to the account.

WHEN a customer clicks the reset link and provides a new password, THE system SHALL invalidate all existing access tokens and refresh tokens for that customer, forcing them to log in again.

### Customer Account Management Permissions

THE customer SHALL be able to view and update their profile information including first name, last name, phone number, and profile picture.

THE customer SHALL be able to add, edit, and delete multiple delivery addresses associated with their account.

THE customer SHALL be able to mark one address as their default shipping address.

THE customer SHALL be able to view their registered email address and change it (subject to verification of new email).

THE customer SHALL be able to manage payment methods by adding credit cards, debit cards, or digital wallets and selecting a default payment method.

THE customer SHALL be able to view their complete account history including login activity and password change events.

### Customer Shopping Permissions

THE customer SHALL be able to create and manage shopping carts by adding products and variants.

THE customer SHALL be able to view cart contents, update quantities, and remove items from cart at any time before checkout.

THE customer SHALL be able to create a wishlist and add products to their wishlist for future purchase.

THE customer SHALL be able to share their wishlist with other users via link or email.

THE customer SHALL be able to move items from wishlist directly to shopping cart.

THE customer SHALL be able to proceed to checkout only if they have a verified email address and at least one saved delivery address.

### Customer Order Permissions

THE customer SHALL be able to place orders for items in their shopping cart with available inventory.

THE customer SHALL be able to proceed through a multi-step checkout process: review cart, select shipping address, select shipping method, review order total, and confirm payment.

THE customer SHALL be able to view all their orders in order history with details including order number, order date, items, total amount, and current status.

THE customer SHALL be able to track real-time shipping status and estimated delivery date for active orders.

THE customer SHALL be able to receive push notifications and email updates when order status changes.

THE customer SHALL be able to request order cancellation if the order has not yet been dispatched by the seller.

WHEN a customer requests order cancellation for an order in "pending confirmation" or "order confirmed" status, THE system SHALL process the cancellation immediately and restore inventory.

WHEN a customer requests order cancellation for an order already in "preparing shipment" or later status, THE system SHALL deny the request and provide explanation that order has already been prepared for shipment.

### Customer Review Permissions

THE customer SHALL be able to leave product reviews and ratings for products they have purchased and received.

THE customer SHALL be able to edit or delete their own reviews at any time before an admin removes the review.

THE customer SHALL be able to mark reviews as helpful or unhelpful to aid other customers.

THE customer SHALL NOT be able to leave reviews for products they have not purchased.

### Customer Refund and Complaint Permissions

THE customer SHALL be able to submit refund or return requests for orders within a specified return window (typically 30 days from delivery).

THE customer SHALL be able to provide reason and supporting information (photos, description) when submitting return requests.

THE customer SHALL be able to track the status of return requests and refunds through their order history.

THE customer SHALL be able to view refund amount and refund timeline for approved returns.

### Customer Data Access

THE customer SHALL only be able to access their own account data, orders, and personal information. They SHALL NOT access other customers' data.

THE customer's JWT token SHALL include their unique customer ID as the "sub" claim to enforce this restriction.

---

## Seller Actor

### Seller Definition

Sellers are authenticated merchants who register seller accounts to manage product catalogs, set inventory levels, process orders from their products, manage shipping, and track sales performance. Sellers represent the supply side of the marketplace. A single individual may operate as both a customer and a seller with separate authentication sessions if needed.

### Seller Authentication Requirements

#### Seller Registration Process

WHEN a prospective seller applies to register a store account, THE system SHALL require the submission of business information including business name, business registration number, and business email.

THE system SHALL require contact information including name, phone number, and business address.

THE system SHALL require banking information for commission payments including account holder name, bank details, and tax identification.

WHEN a seller submits registration, THE system SHALL verify the provided business registration information (if available in jurisdiction).

THE system SHALL send a verification email to the business email address with a confirmation link.

THE system SHALL require admin approval before a new seller account becomes active and can list products.

IF the seller application is rejected, THE system SHALL send a notification explaining the reason for rejection and options for reapplication.

WHEN a seller's registration is approved by an admin, THE system SHALL activate the seller account and send a welcome notification with store dashboard access credentials.

#### Seller Login Process

WHEN a seller submits login credentials using their business email and password, THE system SHALL validate the credentials against stored password hashes.

IF credentials are invalid, THE system SHALL return HTTP 401 with error code "AUTH_INVALID_CREDENTIALS".

IF the seller account has not been approved by an admin, THE system SHALL return HTTP 403 with error code "AUTH_SELLER_NOT_APPROVED" and provide status of the application.

IF the seller account has been suspended by an admin for policy violations, THE system SHALL return HTTP 403 with error code "AUTH_SELLER_SUSPENDED" and include reason for suspension.

WHEN credentials are valid and account is approved, THE system SHALL generate a JWT access token and refresh token specific to the seller.

### Seller Account Management Permissions

THE seller SHALL be able to view and update store profile information including store name, description, logo, and banner image.

THE seller SHALL be able to update contact information including phone, email, and business address.

THE seller SHALL be able to update banking and tax information for commission payments.

THE seller SHALL be able to view their seller ratings and performance metrics.

THE seller SHALL be able to access their seller dashboard showing key metrics, recent orders, and sales performance.

THE seller SHALL be able to generate and download sales reports for accounting and business analysis.

### Seller Product Management Permissions

THE seller SHALL be able to create new products in their store with complete product information including name, description, images, category, and pricing.

THE seller SHALL be able to edit product information at any time including product details, images, and basic pricing.

THE seller SHALL be able to delete products that have no orders in the system.

THE seller SHALL NOT be able to delete products that have existing orders.

THE seller SHALL be able to manage product variants (SKUs) including different colors, sizes, and options.

THE seller SHALL be able to set pricing for each product variant independently.

THE seller SHALL be able to upload product images with a minimum of 3 images per product and maximum of 20 images per product.

THE seller SHALL be able to assign products to categories and subcategories.

THE seller SHALL be able to manage product visibility by publishing or unpublishing products without deleting them.

THE seller SHALL be able to view product performance metrics including views, clicks, and conversion rates.

### Seller Inventory Management Permissions

THE seller SHALL be able to set initial inventory levels for each product variant (SKU) when creating or editing products.

THE seller SHALL be able to update inventory quantities in real-time based on sales and adjustments.

WHEN a customer places an order containing a seller's product, THE system SHALL automatically deduct the quantity from the seller's inventory.

WHEN a customer cancels an order, THE system SHALL automatically restore the inventory quantity.

THE seller SHALL be able to view current inventory levels for all products and variants.

THE seller SHALL be able to set low inventory thresholds and receive alerts when stock falls below specified levels.

THE seller SHALL be able to adjust inventory levels manually (e.g., to account for damage, loss, or correction of initial counts).

THE seller SHALL NOT be able to create inventory for products owned by other sellers.

### Seller Order Management Permissions

THE seller SHALL be able to view all orders that contain their products with complete order details including customer information, items, and total amount.

THE seller SHALL be able to see order status and transition orders through the fulfillment workflow.

WHEN an order containing seller's products is placed, THE system SHALL notify the seller immediately.

THE seller SHALL be able to confirm order receipt and approve the order for fulfillment.

THE seller SHALL be able to prepare items for shipment and update order status to "preparing shipment".

THE seller SHALL be able to generate and download shipping labels for orders.

THE seller SHALL be able to update tracking information and shipping status for orders.

THE seller SHALL be able to mark orders as shipped with carrier information and tracking number.

THE seller SHALL be able to view delivery confirmation when orders are delivered.

THE seller SHALL be able to view refund requests for their orders and approve or reject refund requests.

THE seller SHALL be able to process partial refunds or full refunds for approved returns.

### Seller Communication Permissions

THE seller SHALL be able to send messages to customers regarding their orders.

THE seller SHALL be able to respond to customer inquiries and support requests.

THE seller SHALL NOT be able to send unsolicited promotional messages to customers without their opt-in consent.

### Seller Data Access

THE seller SHALL only be able to access their own store data, products, and orders containing their products. They SHALL NOT access other sellers' data or products.

THE seller's JWT token SHALL include their unique seller ID as the "sub" claim to enforce this restriction.

THE seller SHALL NOT be able to view other sellers' inventory, pricing, or sales metrics.

---

## Admin Actor

### Admin Definition

System administrators have elevated permissions to manage the entire platform. Admins can manage users (customers and sellers), monitor orders, manage product catalog across all sellers, configure system settings, view analytics and reports, handle disputes and refunds, and manage account suspensions. Admin accounts are created internally and not through public registration.

### Admin Authentication Requirements

#### Admin Account Creation

Admin accounts SHALL be created directly by the system owner or existing admins through a secure internal process, NOT through public registration.

WHEN an admin account is created, THE system SHALL assign a strong temporary password (minimum 16 characters with mixed case, numbers, and special characters) to the admin.

THE system SHALL require the new admin to change their temporary password on first login.

THE system SHALL log all admin account creation events with details of who created the account and timestamp.

#### Admin Login Process

WHEN an admin submits login credentials, THE system SHALL validate credentials against stored password hashes.

WHEN an admin account has not been used in 90 days, THE system SHALL require password reset on the next login attempt for security purposes.

IF login credentials are invalid, THE system SHALL return HTTP 401 with error code "AUTH_INVALID_CREDENTIALS" and log the failed attempt.

IF an admin account is deactivated, THE system SHALL return HTTP 403 with error code "AUTH_ADMIN_DEACTIVATED".

IF an admin logs in from an unusual geographic location, THE system SHALL log the unusual access for review.

WHEN credentials are valid, THE system SHALL generate a JWT access token with admin-specific claims.

### Admin User Management Permissions

THE admin SHALL be able to view a list of all customers with filtering and search capabilities.

THE admin SHALL be able to view detailed customer profile information including email, phone, addresses, and account status.

THE admin SHALL be able to view customer account creation date, last login date, and account activity history.

THE admin SHALL be able to temporarily suspend a customer account if the customer violates platform policies or terms of service.

THE admin SHALL be able to permanently deactivate a customer account with full audit logging of the reason.

THE admin SHALL be able to reset a customer's password if requested by the customer for account recovery.

THE admin SHALL be able to view a list of all sellers with filtering and search capabilities.

THE admin SHALL be able to view detailed seller profile information including business name, registration, contact information, and seller ratings.

THE admin SHALL be able to review pending seller applications and approve or reject applications.

THE admin SHALL be able to suspend a seller account if the seller violates platform policies or quality standards.

THE admin SHALL be able to view seller performance metrics including sales volume, ratings, return rates, and complaint history.

### Admin Product Management Permissions

THE admin SHALL be able to view the complete product catalog across all sellers.

THE admin SHALL be able to search and filter products by seller, category, status, and other criteria.

THE admin SHALL be able to view detailed product information and variants for any product on the platform.

THE admin SHALL be able to flag products for review if they appear to violate policies (e.g., counterfeit, inappropriate content).

THE admin SHALL be able to temporarily hide (soft delete) a product from the catalog if it violates policies.

THE admin SHALL be able to permanently delete a product if it is prohibited content (e.g., illegal goods).

THE admin SHALL be able to manage product categories and taxonomy.

THE admin SHALL be able to view product performance metrics including total sales, rating trends, and review patterns.

### Admin Order Management Permissions

THE admin SHALL be able to view all orders in the system with filtering and search capabilities.

THE admin SHALL be able to view complete order details for any order including items, prices, customer info, and fulfillment status.

THE admin SHALL be able to view order timeline and history of status changes.

THE admin SHALL be able to access customer messages and communication history for orders.

THE admin SHALL be able to review and approve refund requests submitted by customers.

THE admin SHALL be able to process refunds directly if needed for dispute resolution.

THE admin SHALL be able to view payment transaction details and settlement information.

### Admin Dispute and Complaint Management

THE admin SHALL be able to view complaints filed by customers about orders, products, or sellers.

THE admin SHALL be able to view seller responses to customer complaints.

THE admin SHALL be able to investigate disputes by reviewing order details, messages, and evidence provided by both parties.

THE admin SHALL be able to make binding decisions on disputes including ordering refunds, directing product returns, or suspending sellers.

THE admin SHALL be able to add notes and attach evidence to dispute records.

### Admin Analytics and Reporting

THE admin SHALL be able to generate reports on platform-wide metrics including total orders, total revenue, and daily active users.

THE admin SHALL be able to generate reports on seller performance including sales metrics, rating trends, and complaint rates.

THE admin SHALL be able to generate reports on customer acquisition, retention, and lifetime value.

THE admin SHALL be able to generate reports on product performance by category, seller, and rating.

THE admin SHALL be able to view trends and patterns in platform data for business intelligence.

THE admin SHALL be able to export reports in standard formats (CSV, PDF) for further analysis.

### Admin System Configuration

THE admin SHALL be able to configure platform settings including commission rates, return windows, and shipping policies.

THE admin SHALL be able to manage promotional campaigns and discounts at the platform level.

THE admin SHALL be able to configure category structures and product taxonomy.

THE admin SHALL be able to view and configure payment processors and payment methods accepted by the platform.

THE admin SHALL be able to view and manage email templates for notifications.

THE admin SHALL be able to configure system features and feature flags for gradual rollouts.

### Admin Data Access

THE admin SHALL have access to all data in the system including customer accounts, seller accounts, products, orders, and transactions.

THE admin's JWT token SHALL include admin-specific claim "role: admin" and a list of assigned permissions.

ALL admin actions SHALL be logged with admin ID, action type, target resource, and timestamp for audit purposes.

THE admin SHALL NOT be able to modify their own role or permission level.

---

## Authentication System Architecture

### Complete Authentication Flow

The authentication system implements a standard OAuth 2.0 and JWT-based approach with the following flow:

```mermaid
graph LR
    A["User Submits Credentials"] --> B{\"Valid?\"}
    B -->|"No"| C["Return HTTP 401"]
    B -->|"Yes"| D{\"Account Active?\"}
    D -->|"No"| E["Return HTTP 403"]
    D -->|"Yes"| F["Verify Email Status"]
    F -->|"Not Verified"| G["Return Email Verification Required"]
    F -->|"Verified"| H["Generate JWT Tokens"]
    H --> I["Access Token"]
    H --> J["Refresh Token"]
    I --> K["Return Success + Tokens"]
    J --> K
    K --> L["Client Stores Tokens"]
```

### Registration Authentication Flow

```mermaid
graph LR
    A["User Enters Registration Data"] --> B["Validate Input Data"]
    B --> C{\"Valid?\"}
    C -->|"No"| D["Return Validation Errors"]
    C -->|"Yes"| E["Check Email Uniqueness"]
    E --> F{\"Email Exists?\"}
    F -->|"Yes"| G["Return Email Already Registered"]
    F -->|"No"| H["Hash Password"]
    H --> I["Create Account"]
    I --> J["Send Verification Email"]
    J --> K["Return Success + Verification Required"]
    K --> L["User Clicks Verification Link"]
    L --> M["Verify Email Token"]
    M --> N{\"Valid?\"}
    N -->|"No"| O["Return Invalid/Expired Token"]
    N -->|"Yes"| P["Activate Account"]
    P --> Q["Send Welcome Email"]
    Q --> R["Account Ready for Login"]
```

---

## JWT Token Management and Structure

### Access Token Specification

THE system SHALL generate JWT access tokens using the HS256 (HMAC SHA-256) signing algorithm with a secure secret key of minimum 256 bits.

THE access token SHALL have an expiration time of 15 minutes (900 seconds) from issuance.

THE access token SHALL include the following required claims:

```json
{
  "sub": "customer_id_or_seller_id_or_admin_id",
  "role": "customer|seller|admin",
  "iat": 1699999999,
  "exp": 1700000899,
  "type": "access"
}
```

THE access token's "sub" (subject) claim SHALL contain the unique identifier of the authenticated user.

THE access token's "role" claim SHALL identify the user's role for permission checking at API endpoints.

THE access token SHALL include standard JWT claims "iat" (issued at) and "exp" (expiration time) as Unix timestamps.

FOR customer tokens, THE system MAY include an optional "email_verified" claim with boolean value indicating email verification status.

FOR seller tokens, THE system MAY include an optional "seller_status" claim indicating "approved", "pending", or "suspended".

FOR admin tokens, THE system MAY include an optional "permissions" claim with array of specific admin permissions.

WHEN an access token expires, THE client SHALL use the refresh token to request a new access token WITHOUT requiring the user to log in again.

### Refresh Token Specification

THE system SHALL generate JWT refresh tokens with the same signing algorithm as access tokens.

THE refresh token SHALL have an expiration time of 30 days (2,592,000 seconds) from issuance.

THE refresh token SHALL include the following required claims:

```json
{
  "sub": "user_id",
  "role": "customer|seller|admin",
  "iat": 1699999999,
  "exp": 1702591999,
  "type": "refresh"
}
```

THE refresh token SHALL include a "type" claim with value "refresh" to prevent accidental use of refresh tokens as access tokens.

THE refresh token SHALL be stored securely by the client (typically in an httpOnly cookie or secure storage).

THE refresh token SHALL only be used at the dedicated token refresh endpoint and SHALL NOT be accepted for regular API requests.

WHEN a refresh token is used to obtain a new access token, THE system SHALL issue a new refresh token with a new expiration time.

### Token Refresh Endpoint

WHEN a client submits a valid refresh token to the token refresh endpoint, THE system SHALL validate the token signature and expiration time.

IF the refresh token is valid and not expired, THE system SHALL generate and return new access and refresh tokens.

IF the refresh token is invalid or expired, THE system SHALL return HTTP 401 with error code "AUTH_REFRESH_TOKEN_INVALID" and require the user to log in again.

IF the user's account has been suspended or deleted since the refresh token was issued, THE system SHALL return HTTP 403 with error code "AUTH_ACCOUNT_INVALID" even if the token is technically valid.

### Token Storage and Security

THE client application SHALL store the access token in memory or a temporary location that is cleared when the application closes.

THE client application SHALL store the refresh token in a secure, httpOnly cookie that is not accessible to JavaScript (preferred) OR in secure local storage with encryption.

THE client application SHALL include the access token in the "Authorization" header of all API requests using the format "Bearer <token>".

THE client application SHALL NOT transmit the refresh token in regular API requests, only in the dedicated refresh endpoint.

THE system SHALL implement token rotation where new tokens are issued on each refresh to limit exposure of long-lived credentials.

---

## Complete Permission Matrix

This matrix defines what actions each user actor can perform across the major feature areas of the platform:

| Feature/Action | Guest | Customer | Seller | Admin |
|---|---|---|---|---|
| **Authentication** |||
| Register as customer | ✅ | - | - | - |
| Register as seller | ✅ | ✅ | - | - |
| Login | ❌ | ✅ | ✅ | ✅ |
| Change password | ❌ | ✅ | ✅ | ✅ |
| Reset forgotten password | ✅ | ✅ | ✅ | ✅ |
| View profile | ❌ | ✅ | ✅ | ✅ |
| Edit profile | ❌ | ✅ | ✅ | ✅ |
| **Product Catalog** |||
| Browse products | ✅ | ✅ | ✅ | ✅ |
| View product details | ✅ | ✅ | ✅ | ✅ |
| Search products | ✅ | ✅ | ✅ | ✅ |
| Filter by category | ✅ | ✅ | ✅ | ✅ |
| Create products | ❌ | ❌ | ✅ | ❌ |
| Edit own products | ❌ | ❌ | ✅ | ❌ |
| Edit other sellers' products | ❌ | ❌ | ❌ | ✅ |
| Delete products | ❌ | ❌ | ✅* | ✅ |
| Manage product variants | ❌ | ❌ | ✅ | ❌ |
| View all products as admin | ❌ | ❌ | ❌ | ✅ |
| **Shopping Cart & Wishlist** |||
| Create cart | ❌ | ✅ | ❌ | ❌ |
| Add to cart | ❌ | ✅ | ❌ | ❌ |
| View cart | ❌ | ✅ | ❌ | ❌ |
| Update cart quantities | ❌ | ✅ | ❌ | ❌ |
| Remove from cart | ❌ | ✅ | ❌ | ❌ |
| Create wishlist | ❌ | ✅ | ❌ | ❌ |
| Add to wishlist | ❌ | ✅ | ❌ | ❌ |
| View wishlist | ❌ | ✅ | ❌ | ❌ |
| **Orders** |||
| Place orders | ❌ | ✅ | ❌ | ❌ |
| View own orders | ❌ | ✅ | ❌ | ❌ |
| Track orders | ❌ | ✅ | ❌ | ❌ |
| Cancel orders | ❌ | ✅* | ❌ | ✅ |
| View seller's orders | ❌ | ❌ | ✅ | ❌ |
| View all orders as admin | ❌ | ❌ | ❌ | ✅ |
| Confirm order receipt | ❌ | ❌ | ✅ | ❌ |
| Update fulfillment status | ❌ | ❌ | ✅ | ❌ |
| **Inventory** |||
| Set inventory | ❌ | ❌ | ✅ | ❌ |
| Update inventory | ❌ | ❌ | ✅ | ❌ |
| View own inventory | ❌ | ❌ | ✅ | ❌ |
| View all inventory | ❌ | ❌ | ❌ | ✅ |
| **Reviews & Ratings** |||
| View reviews | ✅ | ✅ | ✅ | ✅ |
| Leave reviews | ❌ | ✅* | ❌ | ❌ |
| Edit own reviews | ❌ | ✅ | ❌ | ❌ |
| Delete own reviews | ❌ | ✅ | ❌ | ❌ |
| Moderate reviews | ❌ | ❌ | ❌ | ✅ |
| **Refunds & Returns** |||
| Submit refund request | ❌ | ✅ | ❌ | ❌ |
| View refund status | ❌ | ✅ | ❌ | ❌ |
| Approve refund requests | ❌ | ❌ | ✅ | ✅ |
| Process refunds | ❌ | ❌ | ❌ | ✅ |
| **User Management** |||
| View own address book | ❌ | ✅ | ✅ | ❌ |
| Manage addresses | ❌ | ✅ | ✅ | ❌ |
| View all customers | ❌ | ❌ | ❌ | ✅ |
| Suspend customers | ❌ | ❌ | ❌ | ✅ |
| View all sellers | ❌ | ❌ | ❌ | ✅ |
| Approve seller applications | ❌ | ❌ | ❌ | ✅ |
| Suspend sellers | ❌ | ❌ | ❌ | ✅ |
| **System Administration** |||
| View analytics | ❌ | ❌ | ❌ | ✅ |
| Generate reports | ❌ | ❌ | ❌ | ✅ |
| Configure settings | ❌ | ❌ | ❌ | ✅ |
| Manage categories | ❌ | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ❌ | ✅ |

**Legend:**
- ✅ = Permitted
- ❌ = Not permitted
- ✅* = Permitted with conditions (see detailed requirements above)
- — = Not applicable

---

## Session Management and Security

### Session Lifecycle

WHEN a user successfully authenticates, THE system SHALL create a new session with a unique session ID (separate from JWT token) for tracking login sessions.

THE system SHALL record the session creation timestamp, user agent, IP address, and geographic location for security monitoring.

THE session SHALL remain active as long as the JWT access token is valid.

WHEN a user logs out, THE system SHALL invalidate the session and any remaining tokens associated with that session.

WHEN a user's access token expires but their refresh token is valid, THE system SHALL maintain the session and issue a new access token without requiring re-authentication.

WHEN a user's refresh token expires, THE system SHALL terminate the session and require full re-authentication.

### Multi-Device Sessions

THE system SHALL allow a customer or seller to maintain multiple concurrent sessions across different devices (phone, tablet, computer).

WHEN a user logs in on a new device, THE system SHALL create a separate session for that device without affecting existing sessions.

THE user SHALL be able to view all active sessions from their account settings.

THE user SHALL be able to remotely log out from any device, which SHALL terminate only that device's session.

WHEN a user resets their password, THE system SHALL terminate ALL sessions except the current one to prevent unauthorized access from compromised devices.

### Session Security Monitoring

THE system SHALL monitor for suspicious session activity such as:
- Multiple failed login attempts in succession
- Login from impossible geographic locations (e.g., two countries within minutes)
- Logins at unusual times
- Multiple logins from different IP addresses

WHEN suspicious session activity is detected, THE system MAY require additional verification or temporarily lock the account.

THE admin SHALL be able to view session logs including IP address, device, login time, and activity for user investigation.

### Token Revocation

THE system SHALL implement a token blacklist mechanism to revoke tokens when accounts are suspended or compromised.

WHEN an account is suspended by an admin, THE system SHALL immediately revoke all existing tokens for that account.

WHEN a user initiates a full logout, THE system SHALL add their current access token to the revocation list to prevent reuse.

WHEN a security incident is detected, THE system MAY immediately revoke all tokens for an account.

---

## Security Requirements and Best Practices

### Password Security

THE system SHALL hash all passwords using bcrypt with a work factor of minimum 12.

THE system SHALL NEVER store passwords in plain text or using reversible encryption.

THE system SHALL enforce password requirements at registration:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

THE system SHALL NOT allow passwords that contain the user's email or username.

THE system SHALL NOT allow passwords from known breach databases (e.g., HaveIBeenPwned).

THE system SHALL NOT allow password reuse - users cannot reset their password to a previous password.

### API Security

WHEN a request arrives without an Authorization header, THE system SHALL return HTTP 401.

WHEN a request arrives with an invalid or malformed JWT token, THE system SHALL return HTTP 401 with error code "AUTH_INVALID_TOKEN".

WHEN a request arrives with an expired JWT token, THE system SHALL return HTTP 401 with error code "AUTH_TOKEN_EXPIRED".

WHEN a request arrives with a valid token but insufficient permissions for the endpoint, THE system SHALL return HTTP 403.

THE system SHALL validate JWT token signature using the same secret key used to sign the token.

THE system SHALL reject any tokens that have been tampered with.

THE system SHALL implement CORS (Cross-Origin Resource Sharing) restrictions to prevent unauthorized cross-site requests.

THE system SHALL use HTTPS/TLS for all API communications to prevent token interception.

### Account Security

THE system SHALL implement rate limiting on authentication endpoints to prevent brute force attacks (e.g., maximum 5 failed login attempts per 15 minutes).

WHEN rate limiting is triggered, THE system SHALL temporarily lock the account and send notification email to the account owner.

THE system SHALL require email verification before account activation to prevent fake account registration.

THE system SHALL log all authentication events including successful logins, failed login attempts, and password changes.

THE system SHALL implement account lockout after a configurable number of failed login attempts (typically 5).

THE system SHALL send notification emails when:
- Account is created
- Password is changed
- Email address is changed
- Unusual login is detected
- Account is suspended

THE system SHALL allow users to view their login history and active sessions.

### Admin Security

Admin accounts SHALL be subject to the same password security requirements as regular accounts.

THE system SHALL require multi-factor authentication (MFA) for all admin accounts using TOTP or similar method.

WHEN an admin logs in, THE system SHALL require both password AND MFA code before access is granted.

THE system SHALL log ALL admin actions including view, create, update, and delete operations with full details.

THE system SHALL implement a timeout for admin sessions (e.g., 30 minutes of inactivity) after which re-authentication is required.

THE system SHALL restrict admin account creation and modification to existing admins or system owners.

### Compliance and Data Protection

THE system SHALL comply with GDPR requirements including:
- Data minimization (collect only necessary data)
- Encryption of sensitive data in transit and at rest
- Right to be forgotten (ability to delete customer accounts)
- Data breach notification within 72 hours

THE system SHALL comply with PCI DSS (Payment Card Industry Data Security Standard):
- NEVER store full credit card numbers
- NEVER log passwords or authentication credentials
- Encrypt payment data in transit
- Use tokenization for stored payment methods

THE system SHALL allow users to export their personal data in machine-readable format.

THE system SHALL allow users to delete their accounts and associated data (with exceptions for order history needed for compliance).

THE system SHALL maintain detailed audit logs of all access to sensitive data.

### Token Refresh Security

WHEN a refresh token is used to obtain a new access token, THE system SHALL:
1. Validate the refresh token signature
2. Verify the token has not expired
3. Verify the associated account is still active
4. Issue new access token with updated expiration
5. Issue new refresh token with updated expiration
6. Optionally revoke the old refresh token to prevent token reuse

THE system SHALL ensure that refresh tokens can only be used once (one-time use) to detect and prevent token replay attacks.

WHEN an old refresh token is reused after a new one has been issued, THE system SHALL treat this as a potential security incident and revoke all tokens for that user.

---

## Authentication Implementation Guidance for Developers

### Protected Endpoint Pattern

Every protected API endpoint MUST implement the following authentication check:

```
1. Extract Authorization header from request
2. Validate header format: "Bearer <token>"
3. Extract JWT token from header
4. Verify JWT signature using system secret key
5. Check token expiration time
6. Check token "type" claim (should be "access", not "refresh")
7. If any validation fails, return HTTP 401
8. Extract user ID from "sub" claim
9. Extract role from "role" claim
10. Proceed with request if validation passes
```

### Permission Check Pattern

For endpoints with role-specific permissions, implement permission checking:

```
1. Verify user is authenticated (JWT validation above)
2. Check user's role from JWT "role" claim
3. Check if role has permission for this action
4. If permission matrix shows ✅ or ✅* (with conditions met), allow request
5. If permission matrix shows ❌ or ✅* (conditions not met), return HTTP 403
6. Include clear error message indicating required permission
```

### Error Response Format

All authentication and authorization error responses MUST follow this format:

```json
{
  "error": "error_code",
  "message": "Human readable error message",
  "timestamp": "ISO8601_timestamp"
}
```

Example error codes:
- `AUTH_INVALID_CREDENTIALS` - Invalid email or password
- `AUTH_EMAIL_NOT_VERIFIED` - Account not verified
- `AUTH_ACCOUNT_SUSPENDED` - Account suspended by admin
- `AUTH_INVALID_TOKEN` - Token format invalid or tampered
- `AUTH_TOKEN_EXPIRED` - Token has expired
- `AUTH_REFRESH_TOKEN_INVALID` - Refresh token invalid or expired
- `AUTH_INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `AUTH_SELLER_NOT_APPROVED` - Seller account not approved
- `AUTH_SELLER_SUSPENDED` - Seller account suspended

---

## Summary of Actor Capabilities

**Guest Users** can view the product catalog and search products, but cannot create accounts, place orders, or access user-specific features without authentication.

**Customers** can register, log in, manage their profile and addresses, create shopping carts and wishlists, place orders, pay for purchases, track shipments, and leave reviews on products they purchased.

**Sellers** can register their store, manage product listings with variants and pricing, manage inventory at the SKU level, view and fulfill orders from their products, update shipping status, and track sales performance.

**Admins** have full platform access to manage users, view all orders, manage the product catalog, handle disputes, generate reports, and configure system settings.

The JWT-based authentication system with short-lived access tokens and long-lived refresh tokens provides secure, scalable authentication across all user types while the permission matrix ensures each actor can only perform their intended actions within the platform.