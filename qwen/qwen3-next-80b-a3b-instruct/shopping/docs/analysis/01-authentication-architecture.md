## Authentication Overview

This shopping mall platform implements a role-based authentication system with three distinct user actor types: customer, seller, and admin. Each actor has unique permissions and system access levels designed to enforce proper separation of duties and security boundaries. The system uses JSON Web Tokens (JWT) for stateless authentication, ensuring scalability and secure session management across distributed services.

The authentication architecture is designed around the principle of least privilege - users are granted only the permissions necessary to perform their intended functions. Critical business functions such as order management, product listing, and system administration are strictly segregated by actor role to prevent unauthorized access or actions.

## User Actor Definition

The system defines exactly three distinct actor types with specific business responsibilities:

### Customer Actor

A customer is an authenticated user who engages with the platform as a buyer of products. Customers cannot manage products, view other users' data, or access administrative functions.

**Customer Capabilities**:
- Register and log in using email and password
- Manage personal shipping addresses (add, edit, remove)
- Browse product catalog with filtering and search
- Add products to shopping cart and wishlist
- Place orders and select payment methods
- Track order status and receive shipment notifications
- Leave product reviews and ratings
- Request order cancellations and refunds within policy limits
- View order history and download purchase receipts
- Change password and manage account security settings

**Customer Restrictions**:
- CANNOT list or manage products
- CANNOT view seller-specific analytics or inventory
- CANNOT access admin dashboard or system settings
- CANNOT modify other users' data or orders
- CANNOT override order status or payment status

### Seller Actor

A seller is a business entity that lists and sells products through the platform. Sellers have access to product management, inventory control, and sales analytics, but are restricted from administrative system functions and customer data beyond their own transactions.

**Seller Capabilities**:
- Register and verify business credentials (business name, tax ID, contact info)
- Create and manage product listings with variants (SKUs)
- Update inventory levels per SKU in real time
- View sales analytics (sales volume, revenue, popular products)
- Process and fulfill customer orders
- Update order shipping status with tracking information
- Respond to customer reviews and ratings
- Manage multiple product listings and categories
- View order history specific to their products
- Request payouts for completed sales

**Seller Restrictions**:
- CANNOT access or manage other sellers' products or data
- CANNOT view customer personal information beyond shipping and contact details for order fulfillment
- CANNOT directly modify customer accounts or passwords
- CANNOT access general system settings or admin dashboard
- CANNOT bypass order processing workflows or override payment decisions
- CANNOT view financial reports beyond their own sales data

### Admin Actor

An admin is a system administrator with full authority over all users, products, orders, and system settings. Admins can override all other actors' data and actions to maintain system integrity, resolve disputes, and enforce policies.

**Admin Capabilities**:
- Manage all customer, seller, and admin accounts (suspend, activate, delete)
- Approve or reject seller registrations and business verifications
- View and modify any product listing in the catalog
- Oversee all orders across all sellers and customers
- Assign, modify, or revoke permissions for any actor
- Access comprehensive system analytics and financial reporting
- Manage platform-wide settings (payment providers, shipping rules, tax configurations)
- Investigate and resolve fraud, abuse, or policy violations
- Override order status, payment status, and refund decisions
- Generate and export audit logs for compliance
- Manage system-level configurations (email templates, notification rules)

**Admin Restrictions**:
- CANNOT bypass audit trails - all admin actions are logged
- CANNOT view raw database records or modify infrastructure directly
- CANNOT alter token generation algorithms or secret keys
- CANNOT disable security protocols or authentication requirements
- CANNOT bypass transactional locks that prevent overselling

## Session Management Requirements

User sessions are managed through secure, time-limited authentication tokens with automatic expiration and refresh mechanisms.

### Session Duration Requirements

- **Access Token Lifetime**: 15 minutes minimum, 30 minutes maximum
- **Refresh Token Lifetime**: 7 days minimum, 30 days maximum
- **Inactivity Timeout**: Session expires after 30 days of user inactivity regardless of token status
- **Device Session Limit**: A user may have up to 5 active sessions across different devices simultaneously

### Session Behavior Rules

- When a user logs in, a new access token and refresh token pair is issued
- Access tokens are included in all authenticated API requests via Authorization header
- Refresh tokens are stored securely in httpOnly, Secure, SameSite=Strict cookies
- When an access token expires, the client must use the refresh token to obtain a new pair
- If a refresh token expires or is invalid, the user must log in again
- Each successful token refresh invalidates the previous refresh token
- A new access token is issued on every 5-minute interval of active usage (refresh anticipation)
- Session termination (logout) must revoke the current refresh token immediately
- Session state is maintained server-side only through token validity and revocation lists

### Session Revocation

- Admins can forcibly revoke all active sessions for any user
- Users can manually revoke all sessions on all devices through account settings
- Systems must auto-revoke tokens if suspicious activity is detected (multiple failed logins, IP changes, unusual access patterns)
- Upon password change, all existing sessions are automatically terminated
- Upon email verification confirmation, all unverified sessions are invalidated

## Token Handling

All authentication tokens must be JWT (JSON Web Tokens) compliant with the following specifications:

### JWT Payload Structure (Mandatory Fields)

The JWT payload MUST include the following fields:

```json
{
  "userId": "string (UUID format)",
  "role": "string (one of: \"customer\", \"seller\", \"admin\")",
  "permissions": ["string"],
  "iat": "number (UNIX timestamp)",
  "exp": "number (UNIX timestamp)"
}
```

#### Field Definitions:

- **userId**: Unique identifier (UUID) of the authenticated user
- **role**: The principal actor type (customer, seller, or admin)
- **permissions**: Array of string permissions granted to this user (e.g., ["read_profile", "update_cart", "list_products"])
- **iat**: Issued-at timestamp (UNIX timestamp in seconds)
- **exp**: Expiration timestamp (UNIX timestamp in seconds)

### JWT Signing and Security

- **Signing Algorithm**: HS256 (HMAC with SHA-256)
- **Secret Key**: Stored as environment variable; never hardcoded or version-controlled
- **Key Rotation**: Secret key must be rotated every 90 days with graceful transition mechanism
- **Token Validation**: All tokens must be validated for:
  - Correct signature
  - Valid time window (iat and exp)
  - Non-expired status
  - Non-revoked status

### Token Storage and Transmission

- **Access Tokens**: Transmitted in Authorization header as "Bearer <token>"
- **Refresh Tokens**: Stored in httpOnly, Secure, SameSite=Strict cookies
- **Frontend Storage**: Frontend applications must NEVER store refresh tokens in localStorage or sessionStorage
- **Token Expiry Handling**: Client must handle 401 Unauthorized responses by attempting refresh before redirecting to login
- **Cross-Site Request Forgery (CSRF) Protection**: Refresh token cookie must be paired with CSRF token in all state-changing requests

## Password Recovery Flow

Users can recover access to their accounts using a secure, validated email-based recovery process.

### Recovery Steps

1. **Initiate Recovery**:
   - User clicks "Forgot Password" on login page
   - Enters registered email address
   - System validates that an account exists for that email

2. **Generate Recovery Token**:
   - System generates a cryptographically random 256-bit recovery token
   - Token is stored in database with expiration (1 hour)
   - System sends recovery email with unique URL containing the token

3. **Token Verification**:
   - User clicks link in email
   - System validates:
     - Token exists and is unexpired
     - Token has not been used
     - URL is accessed from same device/browser

4. **Password Reset**:
   - System prompts user to enter new password (min. 12 characters)
   - New password must pass complexity requirements:
     - At least one uppercase letter
     - At least one lowercase letter
     - At least one number
     - At least one special character
     - No common patterns ("password123", "12345678", etc.)

5. **Confirmation and Cleanup**:
   - Password is hashed using bcrypt (cost factor 12)
   - Recovery token is invalidated immediately
   - All active sessions for the user are revoked
   - System sends confirmation email to user
   - Recovery record is archived for audit purposes

### Security Requirements

- Recovery link must have single-use capability
- Recovery token must expire after 1 hour
- Email sending must use secure SMTP with TLS encryption
- Recovery email must include opt-out link for future recovery notices
- System must monitor for abuse (rate limiting: max 3 recovery requests per email per 24 hours)
- Systems must log all recovery attempts for security auditing

## Account Deactivation

The system allows for user account deactivation under various conditions and by different actors.

### Deactivation Triggers

#### User-Initiated Deactivation

- User can permanently delete their own account through account settings
- Deletion triggers:
  - Immediate revocation of all active sessions
  - Masking of personal data (name, email, phone)
  - Archival of order history and reviews (not deletion)
  - Release of any associated wishlist items (made anonymous)
  - Removal from marketing lists

#### Admin-Initiated Deactivation

- Admins can suspend or delete accounts for:
  - Fraudulent behavior (fake reviews, payment abuse)
  - Policy violations (selling prohibited items)
  - Security concerns (phishing, account compromise)
  - Repeated violations of community guidelines

- Suspension vs Deletion:
  - **Suspension**: Temporarily disables access; all data retained
  - **Deletion**: Permanently removes account with data anonymization

- Admins must provide a reason for deactivation which is appended to audit log
- Suspended accounts can be reinstated by admin with justification

#### Automatic Deactivation

- Accounts with no login activity for 2 years are automatically archived
- Seller accounts with no product sales for 18 months are marked as inactive
- Inactive accounts are retained for audit purposes but cannot sign in

### Data Handling on Deactivation

- Personal identifying information (name, email, phone) is anonymized: ""[DELETED]"
- Order history, reviews, and purchase data are retained for legal and financial compliance
- Wishlist items are disassociated from user and remain as anonymous public items for 30 days
- Seller product listings are archived and hidden from public catalog
- Generated tokens are immediately revoked

## Permission Matrix

The following table defines explicit permissions for each actor type across key system functions:

| Action | Customer | Seller | Admin |
|--------|----------|--------|-------|
| Register account | ✅ | ✅ | ✅ |
| Log in | ✅ | ✅ | ✅ |
| Log out | ✅ | ✅ | ✅ |
| View public product catalog | ✅ | ✅ | ✅ |
| Search products | ✅ | ✅ | ✅ |
| Filter by category | ✅ | ✅ | ✅ |
| View product details | ✅ | ✅ | ✅ |
| Add item to shopping cart | ✅ | ✅ | ✅ |
| Add item to wishlist | ✅ | ✅ | ✅ |
| Move item from wishlist to cart | ✅ | ✅ | ✅ |
| Create order | ✅ | ❌ | ✅ |
| View own order history | ✅ | ✅ | ✅ |
| View orders from own products | ❌ | ✅ | ✅ |
| View all orders | ❌ | ❌ | ✅ |
| Change order status | ❌ | ✅ (only own) | ✅ |
| Cancel own order (pre-shipment) | ✅ | ❌ | ✅ |
| Process order (fulfill) | ❌ | ✅ | ✅ |
| Update shipping status | ❌ | ✅ | ✅ |
| Issue refund | ❌ | ✅ (partial/internal) | ✅ |
| View customer personal info | ❌ | ✅ (for own orders) | ✅ |
| Edit product listing | ❌ | ✅ | ✅ |
| List new product | ❌ | ✅ | ✅ |
| Delete own product | ❌ | ✅ | ✅ |
| Manage inventory per SKU | ❌ | ✅ | ✅ |
| View sales analytics | ❌ | ✅ | ✅ |
| View system-wide analytics | ❌ | ❌ | ✅ |
| Manage user accounts | ❌ | ❌ | ✅ |
| Approve seller registration | ❌ | ❌ | ✅ |
| Suspend user account | ❌ | ❌ | ✅ |
| Delete user account | ❌ | ❌ | ✅ |
| Change system settings | ❌ | ❌ | ✅ |
| Access admin dashboard | ❌ | ❌ | ✅ |
| Manage payment providers | ❌ | ❌ | ✅ |
| Manage tax configurations | ❌ | ❌ | ✅ |
| Issue administrative refunds | ❌ | ❌ | ✅ |
| Override order restrictions | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ✅ |
| Manage password reset flow | ✅ (initiate) | ✅ (initiate) | ✅ |
| Change password | ✅ | ✅ | ✅ |
| Manage security settings (2FA) | ✅ | ✅ | ✅ |
| Access financial reports | ❌ | ✅ (own sales) | ✅ |
| Approve product categories | ❌ | ❌ | ✅ |
| Ban product keywords | ❌ | ❌ | ✅ |
| View IP addresses | ❌ | ❌ | ✅ |
| Send promotional emails | ✅ (opt-in) | ✅ (opt-in) | ✅ |
| Edit reviews | ❌ | ✅ (respond only) | ✅ |
| Delete reviews | ❌ | ❌ | ✅ |
| Verfiy customer purchase | ❌ | ✅ | ✅ |

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*