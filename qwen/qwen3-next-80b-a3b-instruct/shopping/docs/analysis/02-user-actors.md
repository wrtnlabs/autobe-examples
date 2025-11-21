# Shopping Mall Platform

## User Authentication System

THE shopping mall platform SHALL authenticate users exclusively through email and password credentials. All authentication requests SHALL be processed through secure API endpoints. Client-side session storage (localStorage, sessionStorage) SHALL NOT be used. Tokens SHALL be stateless and signed using JWT algorithm with HS256 encoding.

WHEN a user attempts to register, THE system SHALL validate that the email address is in valid format (local@domain.tld) and password is at least 8 characters in length. THE system SHALL NOT accept registration for emails already associated with any existing account. THE system SHALL create a new user record with account state set to "unverified".

WHEN a user submits their email and password for login, THE system SHALL verify the password hash against the stored value. THE system SHALL return HTTP 401 with error code "INVALID_CREDENTIALS" if credentials are invalid. THE system SHALL return HTTP 403 with error code "ACCOUNT_SUSPENDED" if the account has been suspended by an admin.

WHEN a user successfully logs in, THE system SHALL generate a short-lived access token with expiration of 15 minutes and a long-lived refresh token with expiration of 30 days. THE access token SHALL be returned in the Authorization header as Bearer token. THE refresh token SHALL be stored as HTTP-only, Secure, SameSite=Strict cookie.

WHEN a user requests a password reset, THE system SHALL generate a time-limited reset token (expire in 1 hour) and send it via verified email. THE system SHALL return HTTP 404 with error code "EMAIL_NOT_FOUND" if the requested email does not exist in the system.

WHEN a user clicks a valid password reset link, THE system SHALL validate the token signature and expiration. THE system SHALL allow the user to set a new password. THE system SHALL invalidate all previous access and refresh tokens for that user. THE system SHALL return HTTP 401 with error code "INVALID_RESET_TOKEN" for expired or tampered tokens.

WHEN a user requests email verification, THE system SHALL generate a verification token with 24-hour expiration and send it via the registered email. THE system SHALL return HTTP 400 with error code "ACCOUNT_NOT_PENDING_VERIFICATION" if account state is not unverified.

WHEN a user submits a valid email verification token, THE system SHALL change the account state from "unverified" to "verified". THE system SHALL enable all transactional capabilities (cart, checkout, reviews) for that user. THE system SHALL return HTTP 401 with error code "INVALID_EMAIL_VERIFICATION_TOKEN" for invalid, expired, or already-used tokens.

WHEN a token is presented to an endpoint and is expired, THE system SHALL return HTTP 401 with error code "TOKEN_EXPIRED". WHEN a token is presented and does not match any known signature, THE system SHALL return HTTP 401 with error code "INVALID_TOKEN_SIGNATURE".

WHEN a user logs out, THE system SHALL not delete the token from client storage but SHALL add the access token's jti to a server-side Redis revocation list with TTL equal to its original expiration period. THE system SHALL return HTTP 204 No Content on successful logout.

WHEN a refresh token is presented, THE system SHALL validate its signature and expiration. IF the refresh token is valid and has been used in the last 7 days, THE system SHALL issue a new refresh token (30 days) and a new access token (15 minutes). IF the refresh token has not been used in the last 7 days, THE system SHALL issue a new access token (15 minutes) but SHALL NOT issue a new refresh token. THE system SHALL return HTTP 401 with error code "REFRESH_TOKEN_EXPIRED" if the refresh token has exceeded 30-day lifespan.

WHEN a user presents an access token that exists in the revocation list, THE system SHALL return HTTP 401 with error code "TOKEN_REVOKED".

THE JWT payload SHALL contain the following fields:

{
  "sub": "<user_id>",
  "role": "<actor_type>",
  "permissions": ["<list_of_permissions>"],
  "iat": <issued_at_timestamp>,
  "exp": <expiration_timestamp>,
  "jti": "<unique_token_id>"
}

THE "sub" field SHALL contain the unique numeric identifier of the user in the database.
THE "role" field SHALL contain exactly one of: "customer", "seller", or "admin".
THE "permissions" field SHALL be an array of strings defining granular access rights (e.g., "read_orders", "update_profile", "approve_seller").
THE "iat" and "exp" fields SHALL be Unix timestamps in seconds.
THE "jti" field SHALL be a UUID4 string.

## Functional Requirements

### Customer Actor Capabilities

WHEN a customer registers, THE system SHALL create an account in unverified state.
WHEN a customer verifies their email, THE system SHALL enable order placement, cart management, and review submission.
WHEN a customer logs in with valid credentials, THE system SHALL issue access and refresh tokens as defined.
WHILE a customer account is verified, THE system SHALL allow browsing of all public product listings.
WHILE a customer account is verified, THE system SHALL allow adding products to cart.
WHILE a customer account is verified, THE system SHALL allow initiating checkout process.
WHILE an order is pending payment, THE system SHALL allow the customer to cancel the order.
WHILE a customer account is active, THE system SHALL allow viewing own order history.
WHILE a customer account is active, THE system SHALL allow updating profile name and shipping address.
WHILE a customer account is active, THE system SHALL allow submitting product reviews and ratings.
WHILE a customer account is active, THE system SHALL allow deleting own reviews.
WHEN a customer resets password, THE system SHALL invalidate all active sessions.
WHEN a customer submits incorrect password three times consecutively, THE system SHALL lock account for 15 minutes and notify user via email.
WHEN a customer attempts to access seller endpoints, THE system SHALL return HTTP 403 with error code "PERMISSION_DENIED".
WHEN a customer attempts to access admin endpoints, THE system SHALL return HTTP 403 with error code "PERMISSION_DENIED".
WHEN a customer attempts to modify another user's data, THE system SHALL return HTTP 403 with error code "PERMISSION_DENIED".
WHEN a customer attempts to register with existing email, THE system SHALL return HTTP 409 with error code "EMAIL_IN_USE".
WHEN a customer attempts to verify with invalid token, THE system SHALL return HTTP 401 with error code "INVALID_EMAIL_VERIFICATION_TOKEN".
WHEN a customer attempts to reset password with invalid token, THE system SHALL return HTTP 401 with error code "INVALID_RESET_TOKEN".

### Seller Actor Capabilities

WHEN a user registers as seller, THE system SHALL create account in pending approval state.
WHEN a seller uploads business license and ID verification documents, THE system SHALL store for admin review.
WHILE account is pending approval, THE system SHALL allow seller to draft product listings but NOT publish them.
WHEN an admin approves seller registration, THE system SHALL change account state to active and enable publishing.
WHEN a seller logs in with valid credentials, THE system SHALL issue access and refresh tokens as defined.
WHILE account is active, THE system SHALL allow creating, editing, and publishing product listings.
WHILE account is active, THE system SHALL allow managing inventory levels per product.
WHILE account is active, THE system SHALL allow viewing orders assigned to their store.
WHILE account is active, THE system SHALL allow updating order status to "shipped".
WHILE account is active, THE system SHALL allow responding to customer reviews.
WHILE account is active, THE system SHALL allow accessing sales analytics dashboard.
WHEN a seller resets password, THE system SHALL invalidate all active sessions.
WHEN a seller attempts to register duplicate business, THE system SHALL return HTTP 409 with error code "BUSINESS_DUPLICATE".
WHEN a seller attempts to access admin endpoints, THE system SHALL return HTTP 403 with error code "PERMISSION_DENIED".
WHEN a seller attempts to access another seller's products, THE system SHALL return HTTP 403 with error code "PERMISSION_DENIED".
WHEN a seller attempts to verify with invalid documentation, THE system SHALL return HTTP 401 with error code "INVALID_SELLER_DOCUMENTATION".
WHEN a seller attempts to publish product while pending approval, THE system SHALL return HTTP 403 with error code "SELLER_UNAPPROVED".

### Admin Actor Capabilities

WHEN an admin logs in with valid credentials, THE system SHALL issue access and refresh tokens as defined.
WHILE authenticated, THE system SHALL allow viewing all customer and seller accounts.
WHILE authenticated, THE system SHALL allow approving or rejecting seller registration applications.
WHILE authenticated, THE system SHALL allow suspending or reactivating any customer or seller account.
WHILE authenticated, THE system SHALL allow resetting password for any user.
WHILE authenticated, THE system SHALL allow viewing system-wide sales reports.
WHILE authenticated, THE system SHALL allow managing site-wide banners and promotions.
WHILE authenticated, THE system SHALL allow editing product categories and tags.
WHILE authenticated, THE system SHALL allow reviewing and removing inappropriate user-generated content.
WHILE authenticated, THE system SHALL allow exporting user data for regulatory compliance.
WHILE authenticated, THE system SHALL allow triggering manual system audits.
WHILE authenticated, THE system SHALL allow updating global site configuration settings.
WHEN an admin changes another user’s role, THE system SHALL update permissions immediately and refresh all active sessions.
WHEN an admin logs out, THE system SHALL invalidate all admin access tokens.
WHEN an admin attempts to delete their own account, THE system SHALL deny the request and return HTTP 403 with error code "CANNOT_DELETE_ADMIN".
WHEN an admin attempts to modify another admin’s permissions, THE system SHALL return HTTP 403 with error code "PERMISSION_DENIED".
WHEN an admin attempts to access backend configuration files, THE system SHALL return HTTP 403 with error code "PERMISSION_DENIED".
WHEN an admin attempts to access customer or seller authentication endpoints, THE system SHALL return HTTP 403 with error code "PERMISSION_DENIED".

## Permission Matrix

| Action | Customer | Seller | Admin |
|--------|----------|--------|-------|
| Register account | ✅ | ✅ | ✅ |
| Verify email | ✅ | ✅ | ✅ |
| Login | ✅ | ✅ | ✅ |
| Logout | ✅ | ✅ | ✅ |
| Browse products | ✅ | ✅ | ✅ |
| Add to cart | ✅ | ❌ | ❌ |
| Place order | ✅ | ❌ | ❌ |
| View own order history | ✅ | ✅ | ✅ |
| View all orders | ❌ | ❌ | ✅ |
| Create product listing | ❌ | ✅ | ✅ |
| Edit own product listing | ❌ | ✅ | ✅ |
| Publish product listing | ❌ | ✅ | ✅ |
| Manage inventory | ❌ | ✅ | ✅ |
| Respond to reviews | ❌ | ✅ | ✅ |
| View sales analytics | ❌ | ✅ | ✅ |
| Approve seller registration | ❌ | ❌ | ✅ |
| Suspend account | ❌ | ❌ | ✅ |
| Reset any user password | ❌ | ❌ | ✅ |
| Edit global site settings | ❌ | ❌ | ✅ |
| Delete account (self) | ✅ | ✅ | ❌ |
| Export user data | ❌ | ❌ | ✅ |
| Access system logs | ❌ | ❌ | ✅ |
| Access backend config | ❌ | ❌ | ❌ |

## Business Processes

### Registration and Verification Workflow

WHEN a customer/seller registers, THE system SHALL:
1. Accept email and password
2. Validate format and strength
3. Check for email duplication
4. Create account with state "unverified"
5. Generate email verification token (24h expiry)
6. Send token via email
7. Return HTTP 201 Created

WHEN a user clicks verification link, THE system SHALL:
1. Extract token from URL
2. Validate signature and expiration
3. If invalid: return HTTP 401 with "INVALID_EMAIL_VERIFICATION_TOKEN"
4. If valid: update account state to "verified"
5. Enable transactional features
6. Return HTTP 200 OK

WHEN a user attempts to perform transactional operation while unverified, THE system SHALL:
1. Intercept request
2. Return HTTP 403 with "ACCOUNT_NOT_VERIFIED"

### Login and Token Refresh Workflow

WHEN a user logs in, THE system SHALL:
1. Receive email and password
2. Validate credentials against database
3. If invalid: return HTTP 401 with "INVALID_CREDENTIALS"
4. If suspended: return HTTP 403 with "ACCOUNT_SUSPENDED"
5. Generate access token (15m TTL)
6. Generate refresh token (30d TTL)
7. Store refresh token as HTTP-only cookie
8. Return access token in Authorization header

WHEN a refresh token is presented, THE system SHALL:
1. Validate cookie signature and expiration
2. If invalid: return HTTP 401 with "REFRESH_TOKEN_EXPIRED"
3. If valid and used within 7 days: issue NEW access token + NEW refresh token
4. If valid but not used within 7 days: issue NEW access token only
5. Return updated token in appropriate context

WHEN a token expires, THE system SHALL:
1. Intercept request
2. Return HTTP 401 with "TOKEN_EXPIRED"

### Order Placement Workflow

WHEN a customer adds product to cart, THE system SHALL:
1. Verify user role is "customer" and account is "verified"
2. Validate product exists and is published
3. Add product ID and quantity to cart
4. Return HTTP 200 with updated cart

WHEN a customer initiates checkout, THE system SHALL:
1. Verify cart is not empty
2. Verify user address is complete
3. Validate payment method is selected
4. Calculate total
5. Create order draft
6. Reserve inventory
7. Return HTTP 201 Created with order ID

WHEN a customer confirms payment, THE system SHALL:
1. Verify order is in "pending_payment" state
2. Validate payment token
3. Process payment via payment gateway
4. If payment fails: return HTTP 402 with "PAYMENT_FAILED"
5. If payment succeeds: update order state to "confirmed"
6. Send confirmation email
7. Return HTTP 200 OK

WHEN a customer cancels pending order, THE system SHALL:
1. Verify user owns the order
2. Verify order is "pending_payment"
3. Release reserved inventory
4. Update order state to "cancelled"
5. Return HTTP 200 OK

### Seller Approval Workflow

WHEN a user registers as seller, THE system SHALL:
1. Accept email, password, and business details
2. Create account with state "pending_approval"
3. Return HTTP 201 Created

WHEN a seller uploads documents, THE system SHALL:
1. Accept PDF, JPG, PNG files up to 10MB
2. Store files with UUID-named path
3. Associate documents with seller account
4. Return HTTP 201 Created

WHEN an admin reviews seller application, THE system SHALL:
1. View seller details and documents
2. Check for valid business license
3. Verify ID matches business registration
4. Determine approval status
5. If approved: set account state to "active"
6. If rejected: set account state to "rejected" and notify seller
7. Return HTTP 200 OK

WHEN a seller is rejected, THE system SHALL:
1. Notify seller via email with rejection reason
2. Prevent re-registration with same business details for 30 days

### Password Reset Workflow

WHEN a user requests reset, THE system SHALL:
1. Validate email exists
2. Generate reset token (1h expiry)
3. Store token with user ID
4. Send email with link containing token
5. Return HTTP 200 OK

WHEN a user submits new password, THE system SHALL:
1. Validate reset token
2. Validate new password strength (8+ chars)
3. Hash and store new password
4. Invalidate all existing tokens (access + refresh)
5. Record password change timestamp
6. Return HTTP 200 OK

### Account Suspension Workflow

WHEN an admin suspends an account, THE system SHALL:
1. Verify admin role
2. Accept suspension reason
3. Set account status to "suspended"
4. Record suspension timestamp and admin ID
5. Add user ID to revocation list
6. Immediately expire all active tokens
7. Send suspension notice to user
8. Return HTTP 200 OK

WHEN a suspended account attempts to authenticate, THE system SHALL:
1. Return HTTP 403 with "ACCOUNT_SUSPENDED" or "SELLER_SUSPENDED" depending on role

## Error Handling and Edge Cases

WHEN a user attempts to register with a duplicate email, THE system SHALL:
- Return HTTP 409 with error code "EMAIL_IN_USE"
- Log attempt with timestamp and IP address
- Do not reveal whether email exists or not in response to prevent enumeration

WHEN a user attempts to verify email with expired token, THE system SHALL:
- Return HTTP 401 with error code "INVALID_EMAIL_VERIFICATION_TOKEN"
- Log attempt
- Allow re-request of verification email

WHEN a user attempts to reset password using invalid token, THE system SHALL:
- Return HTTP 401 with error code "INVALID_RESET_TOKEN"
- Log attempt
- Prevent brute force by limiting retries to 3 per 15 minutes

WHEN a user attempts to access unauthorized endpoint, THE system SHALL:
- Return HTTP 403 with appropriate error code (PERMISSION_DENIED, SELLER_UNAPPROVED, etc.)
- Log attempted endpoint and actor
- Do not reveal endpoint existence to prevent enumeration

WHEN an admin suspends a user, THE system SHALL:
- Immediately revoke all active sessions
- Prevent further authentication
- Allow admin to specify suspension reason
- Notify user via email with suspension duration (if fixed) and appeal option

WHEN a user submits invalid JWT, THE system SHALL:
- Return HTTP 401 with error code "INVALID_TOKEN_SIGNATURE" if malformed
- Return HTTP 401 with error code "TOKEN_EXPIRED" if past expiration
- Return HTTP 401 with error code "TOKEN_REVOKED" if in revocation list

WHEN a seller attempts to publish product with missing required fields (title, price, description, category), THE system SHALL:
- Return HTTP 400 with error code "PRODUCT_MISSING_REQUIRED_FIELDS"
- List each missing field in response

WHEN a seller attempts to update inventory below zero, THE system SHALL:
- Return HTTP 400 with error code "NEGATIVE_INVENTORY_NOT_ALLOWED"

WHEN a customer attempts to review product they did not purchase, THE system SHALL:
- Return HTTP 403 with error code "REVIEW_NOT_ELIGIBLE"

WHEN a seller attempts to respond to review from unverified customer, THE system SHALL:
- Return HTTP 400 with error code "REVIEW_FROM_UNVERIFIED_CUSTOMER"

WHEN a user's refresh token is used after 30 days, THE system SHALL:
- Return HTTP 401 with error code "REFRESH_TOKEN_EXPIRED"
- Require full re-authentication with email/password

WHEN a user's access token is revoked due to logout or suspension, THE system SHALL:
- Return HTTP 401 with error code "TOKEN_REVOKED"
- Do not allow token refresh

WHEN a duplicate seller registration occurs with same business license or tax ID, THE system SHALL:
- Return HTTP 409 with error code "BUSINESS_DUPLICATE"
- Block registration for 30 days

WHEN a user’s browser does not support HTTP-only cookies, THE system SHALL:
- Return HTTP 400 with error code "COOKIE_SUPPORT_REQUIRED"
- Provide instructional message

WHEN a user submits a password reset request for a non-existent email, THE system SHALL:
- Return HTTP 404 with error code "EMAIL_NOT_FOUND"
- Do not indicate whether email was valid or not

WHEN the system detects multiple failed login attempts from same IP in 5 minutes, THE system SHALL:
- Temporarily block IP for 15 minutes
- Log event as potential brute force
- Send warning email to user

WHEN the system detects access from new device, THE system SHALL:
- Log event with device fingerprint
- Require re-authentication
- Send email notification to user

WHEN a seller uploads documents larger than 10MB, THE system SHALL:
- Return HTTP 413 with error code "DOCUMENT_TOO_LARGE"
- Specify maximum 10MB limit

WHEN a seller uploads unsupported file format (e.g., .exe), THE system SHALL:
- Return HTTP 400 with error code "UNSUPPORTED_DOCUMENT_FORMAT"
- List allowed formats: pdf, jpg, jpeg, png

WHEN an admin attempts to suspend another admin, THE system SHALL:
- Return HTTP 403 with error code "CANNOT_SUSPEND_ADMIN"

WHEN an admin attempts to delete their own account, THE system SHALL:
- Return HTTP 403 with error code "CANNOT_DELETE_ADMIN"

WHEN an admin attempts to modify permissions of another admin, THE system SHALL:
- Return HTTP 403 with error code "PERMISSION_DENIED"

WHEN a user attempts to view another user's order, THE system SHALL:
- Return HTTP 403 with error code "PERMISSION_DENIED"

WHEN a user attempts to edit another user’s profile, THE system SHALL:
- Return HTTP 403 with error code "PERMISSION_DENIED"

WHEN a user attempts to submit review with no content, THE system SHALL:
- Return HTTP 400 with error code "REVIEW_EMPTY_CONTENT"

WHEN a user attempts to submit review with rating outside 1-5 range, THE system SHALL:
- Return HTTP 400 with error code "INVALID_RATING_RANGE"

WHEN a user attempts to reset password with password too short (<8 chars), THE system SHALL:
- Return HTTP 400 with error code "PASSWORD_TOO_SHORT"

WHEN a user attempts to reset password with password containing less than 2 character types (upper, lower, digit, symbol), THE system SHALL:
- Return HTTP 400 with error code "PASSWORD_WEAK"

WHEN a user attempts to use email not confirmed for authentication, THE system SHALL:
- Return HTTP 403 with error code "EMAIL_NOT_VERIFIED"

WHEN a seller attempts to update product price below $0.99, THE system SHALL:
- Return HTTP 400 with error code "PRICE_TOO_LOW"

WHEN a seller attempts to list product with title longer than 200 characters, THE system SHALL:
- Return HTTP 400 with error code "TITLE_TOO_LONG"

WHEN a seller attempts to list product with description longer than 5000 characters, THE system SHALL:
- Return HTTP 400 with error code "DESCRIPTION_TOO_LONG"

WHEN a seller attempts to list product with category not in approved list, THE system SHALL:
- Return HTTP 400 with error code "INVALID_CATEGORY"

WHEN a buyer attempts to place order with cart item no longer available, THE system SHALL:
- Return HTTP 409 with error code "ITEM_OUT_OF_STOCK"
- Remove unavailable item from cart
- Notify buyer

WHEN a payment gateway returns timeout, THE system SHALL:
- Return HTTP 504 with error code "PAYMENT_TIMEOUT"
- Keep order in pending state
- Allow retry

WHEN a payment gateway returns fraud flag, THE system SHALL:
- Return HTTP 402 with error code "PAYMENT_FRAUD_BLOCKED"
- Flag account for review
- Notify admin

WHEN a system error occurs during order processing, THE system SHALL:
- Return HTTP 500 with error code "INTERNAL_SERVER_ERROR"
- Log full error context
- Do not expose stack trace to client

WHEN inventory deduction fails due to concurrent access, THE system SHALL:
- Rollback order creation
- Return HTTP 409 with error code "OUT_OF_STOCK_CONCURRENT"
- Notify user and recommend retry

WHEN a seller attempts to update their storefront while pending approval, THE system SHALL:
- Return HTTP 403 with error code "SELLER_UNAPPROVED"