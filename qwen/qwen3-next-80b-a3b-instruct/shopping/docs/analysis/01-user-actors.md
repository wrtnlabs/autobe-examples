## Authentication Requirements

### Core Authentication Functions
- THE system SHALL require all users to authenticate before accessing any protected functionality
- WHEN a user attempts to access a protected resource, THE system SHALL redirect them to the login page
- WHEN a guest attempts to register, THE system SHALL collect email and password
- WHEN a user registers, THE system SHALL send a verification email with a time-limited link
- WHEN a user clicks the verification link, THE system SHALL mark the email as verified and activate the account
- WHEN login credentials are submitted, THE system SHALL validate the email and password
- WHEN authentication succeeds, THE system SHALL generate a JWT access token and refresh token
- WHEN authentication fails, THE system SHALL return HTTP 401 with error code "AUTH_INVALID_CREDENTIALS"
- WHEN a user logs out, THE system SHALL invalidate the current session token
- WHEN a refresh token is presented, THE system SHALL validate its signature and expiration, then issue a new access token
- WHEN a refresh token is expired or invalid, THE system SHALL require re-authentication
- WHEN a user changes their password, THE system SHALL invalidate all existing sessions
- WHEN a user requests a password reset, THE system SHALL send a time-limited reset link via email
- WHEN a password reset link is used, THE system SHALL allow password update and invalidate all existing sessions
- WHEN a user accesses the system from a new device, THE system SHALL prompt for re-authentication

### Token Management Protocol
- JWT access token SHALL expire after 30 minutes
- JWT refresh token SHALL expire after 30 days
- JWT payload SHALL contain: userId, role, permissions array, and issuedAt timestamp
- JWT secret key SHALL be stored in environment variable, never in code
- Access tokens SHALL be stored in memory-only HTTP-only cookies, never in localStorage
- Refresh tokens SHALL be stored in secure, HttpOnly, SameSite=Strict cookies
- All tokens SHALL be signed using HS256 algorithm
- Token revocation SHALL be implemented via short-lived blacklist for compromised tokens

## User Actor Structure

### Guest
- **kind**: guest
- **description**: Unauthenticated users who can browse products, search the catalog, and view public product information. Limited to read-only access to public resources and can initiate registration/login process.
- **Cannot**: Access personal data, view cart, place orders, access seller dashboard, write reviews
- **Can**: Browse product catalog, search products, view category listings, view public product descriptions, view product images, view ratings and reviews, initiate registration, initiate login, reset password
- **Session persistence**: Guest cart data SHALL be persisted in a cookie for 7 days of inactivity, then cleared. No account association

### Customer
- **kind**: member
- **description**: Authenticated users who have completed registration. Can manage personal profile, add shipping addresses, view order history, create wishlists, add items to cart, place orders, request refunds/cancellations, and write product reviews.
- **Cannot**: Manage other users, approve seller accounts, edit system-wide product categories, override inventory levels, access admin analytics
- **Can**: Create and manage profile information, add multiple shipping addresses, view and manage order history, create and manage wishlist, add products to cart, adjust cart quantities, proceed to checkout, make payments, request order cancellations, request refunds, write product reviews, view their own reviews, receive order notifications by email and SMS, change own password, revoke all devices
- **Permissions**: ["USER:VIEW_PROFILE", "USER:MANAGE_ADDRESSES", "USER:MANAGE_CART", "USER:PLACE_ORDERS", "USER:MANAGE_WISHLIST", "USER:REQUEST_REFUNDS", "USER:WRITE_REVIEWS", "USER:VIEW_HISTORY"]
- **JWT payload example**: {"userId":"usr_12345","role":"customer","permissions":["USER:VIEW_PROFILE","USER:MANAGE_ADDRESSES","USER:MANAGE_CART","USER:PLACE_ORDERS","USER:MANAGE_WISHLIST","USER:REQUEST_REFUNDS","USER:WRITE_REVIEWS","USER:VIEW_HISTORY"],"issuedAt":"2025-11-15T05:09:19.935Z"}
- **Session persistence**: Customer sessions SHALL remain active until logout or 30 days of inactivity, then auto-expire

### Seller
- **kind**: member
- **description**: Authenticated sellers who manage their own storefront. Can upload and edit product listings, define product variants (SKUs) with colors, sizes, and options, manage inventory levels per SKU, view sales reports for their products, and respond to customer reviews.
- **Cannot**: Manage other sellers, access customer personal data, override system-wide pricing policies, access admin analytics, edit other sellers' products
- **Can**: Register as seller and request approval, view approval status, upload product listings, edit product titles and descriptions, define product variants (SKU) with parameters (color, size, material, etc.), set individual prices per SKU, set inventory levels per SKU, view sales analytics for their products, respond to customer reviews on their products, view order notifications for their products, edit product images, set shipping details for their products, manage return policies for their products
- **Permissions**: ["SELLER:VIEW_DASHBOARD", "SELLER:MANAGE_PRODUCTS", "SELLER:MANAGE_SKU", "SELLER:MANAGE_INVENTORY", "SELLER:VIEW_SALES", "SELLER:RESPOND_REVIEWS", "SELLER:MANAGE_SHIPPING", "SELLER:MANAGE_RETURNS"]
- **JWT payload example**: {"userId":"usr_67890","role":"seller","permissions":["SELLER:VIEW_DASHBOARD","SELLER:MANAGE_PRODUCTS","SELLER:MANAGE_SKU","SELLER:MANAGE_INVENTORY","SELLER:VIEW_SALES","SELLER:RESPOND_REVIEWS","SELLER:MANAGE_SHIPPING","SELLER:MANAGE_RETURNS"],"issuedAt":"2025-11-15T05:09:19.935Z"}
- **Session persistence**: Seller sessions SHALL remain active until logout or 30 days of inactivity, then auto-expire
- **Onboarding requirement**: Seller account SHALL be in "pending" state until approved by admin. No functionality allowed until approval. Admin SHALL receive notification for all pending seller requests

### Admin
- **kind**: admin
- **description**: System administrators with full access. Can manage all users (customers and sellers), approve/reject seller accounts, manage product categories, override inventory levels, review flagged content, process refund approvals, view system-wide analytics, and manage platform-wide settings.
- **Cannot**: Access customer financial data directly (e.g., full credit card numbers), delete orders after fulfillment has begun, modify system code or infrastructure
- **Can**: View all user accounts, suspend or delete any user account, approve or reject seller registration requests, manage platform-wide product categories, edit any product listing (override seller changes), override inventory levels for any SKU, process refund requests, review flagged reviews and content, view system-wide analytics (sales volume, revenue, customer acquisition), manage platform configuration settings, rotate encryption keys, view system logs, export all user and order data in standardized format
- **Permissions**: ["ADMIN:MANAGE_USERS", "ADMIN:APPROVE_SELLERS", "ADMIN:MANAGE_CATEGORIES", "ADMIN:EDIT_PRODUCTS", "ADMIN:OVERRIDE_INVENTORY", "ADMIN:APPROVE_REFUNDS", "ADMIN:VIEW_ANALYTICS", "ADMIN:CONFIGURE_SYSTEM", "ADMIN:VIEW_LOGS", "ADMIN:EXPORT_DATA", "ADMIN:MANAGE_SECURITY"]
- **JWT payload example**: {"userId":"usr_admin_001","role":"admin","permissions":["ADMIN:MANAGE_USERS","ADMIN:APPROVE_SELLERS","ADMIN:MANAGE_CATEGORIES","ADMIN:EDIT_PRODUCTS","ADMIN:OVERRIDE_INVENTORY","ADMIN:APPROVE_REFUNDS","ADMIN:VIEW_ANALYTICS","ADMIN:CONFIGURE_SYSTEM","ADMIN:VIEW_LOGS","ADMIN:EXPORT_DATA","ADMIN:MANAGE_SECURITY"],"issuedAt":"2025-11-15T05:09:19.935Z"}
- **Session persistence**: Admin sessions SHALL remain active until logout or 1 hour of inactivity, then auto-expire

## Permission Matrix

| Action | Guest | Customer | Seller | Admin |
|--------|-------|----------|--------|-------|
| Browse product catalog | ✅ | ✅ | ✅ | ✅ |
| Search products | ✅ | ✅ | ✅ | ✅ |
| View product details | ✅ | ✅ | ✅ | ✅ |
| Add product to cart | ❌ | ✅ | ✅ | ✅ |
| View cart | ❌ | ✅ | ✅ | ✅ |
| Adjust cart quantity | ❌ | ✅ | ✅ | ✅ |
| Remove from cart | ❌ | ✅ | ✅ | ✅ |
| View wishlist | ❌ | ✅ | ✅ | ✅ |
| Add to wishlist | ❌ | ✅ | ✅ | ✅ |
| Remove from wishlist | ❌ | ✅ | ✅ | ✅ |
| Register account | ✅ | ❌ | ✅ | ✅ |
| Login | ✅ | ✅ | ✅ | ✅ |
| Logout | ✅ | ✅ | ✅ | ✅ |
| Reset password | ✅ | ✅ | ✅ | ✅ |
| Verify email | ✅ | ✅ | ✅ | ✅ |
| Change password | ❌ | ✅ | ✅ | ✅ |
| Manage profile | ❌ | ✅ | ✅ | ✅ |
| Manage shipping addresses | ❌ | ✅ | ✅ | ✅ |
| Place order | ❌ | ✅ | ✅ | ✅ |
| View order history | ❌ | ✅ | ✅ | ✅ |
| Request refund | ❌ | ✅ | ✅ | ✅ |
| Request cancellation | ❌ | ✅ | ✅ | ✅ |
| Write product review | ❌ | ✅ | ✅ | ✅ |
| Reply to product review | ❌ | ❌ | ✅ | ✅ |
| Update product listing | ❌ | ❌ | ✅ | ✅ |
| Create product variants (SKU) | ❌ | ❌ | ✅ | ✅ |
| Manage inventory per SKU | ❌ | ❌ | ✅ | ✅ |
| View sales analytics (personal) | ❌ | ❌ | ✅ | ✅ |
| View sales analytics (system-wide) | ❌ | ❌ | ❌ | ✅ |
| Approve seller applications | ❌ | ❌ | ❌ | ✅ |
| Suspend user account | ❌ | ❌ | ❌ | ✅ |
| Delete user account | ❌ | ❌ | ❌ | ✅ |
| Edit any product (override) | ❌ | ❌ | ❌ | ✅ |
| Edit product categories | ❌ | ❌ | ❌ | ✅ |
| Override inventory levels | ❌ | ❌ | ❌ | ✅ |
| Process refund approvals | ❌ | ❌ | ❌ | ✅ |
| View system logs | ❌ | ❌ | ❌ | ✅ |
| Export user data | ❌ | ❌ | ❌ | ✅ |
| Manage platform settings | ❌ | ❌ | ❌ | ✅ |
| Manage security settings | ❌ | ❌ | ❌ | ✅ |

## Business Rules for Authorization

- WHEN an unauthorized user attempts to perform a restricted action, THE system SHALL return HTTP 403 Forbidden with error code "ACCESS_DENIED"
- WHEN a seller attempts to edit a product they do not own, THE system SHALL return HTTP 403 Forbidden with error code "PRODUCT_NOT_OWNED"
- WHEN a customer attempts to review a product they haven't purchased, THE system SHALL return HTTP 403 Forbidden with error code "REVIEW_NOT_ELIGIBLE"
- WHEN a seller attempts to delete a product that has active orders, THE system SHALL return HTTP 400 Bad Request with error code "PRODUCT_HAS_ORDERS"
- WHEN a customer attempts to change an address used in a pending order, THE system SHALL prevent modification and notify user that address is locked for active orders
- WHEN a seller attempts to update inventory beyond available stock, THE system SHALL prevent update and notify user of maximum allowable quantity
- WHEN a customer attempts to place an order with zero items in cart, THE system SHALL prevent submission and display error message "Your cart is empty"
- WHEN an admin attempts to delete a seller with active products, THE system SHALL require confirming the deletion or require transfer of product ownership first
- WHEN a user's session expires during checkout, THE system SHALL redirect to login page and preserve cart state for re-authentication
- WHEN a user logs in from a new device and the system detects suspicious activity, THE system SHALL require re-authentication and send a security notification
- WHEN a user requests an admin-level action without proper permissions, THE system SHALL log the event as a security violation

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*