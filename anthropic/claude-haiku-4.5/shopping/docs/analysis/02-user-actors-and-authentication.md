# User Actors and Authentication

## Executive Summary

The e-commerce shopping mall platform supports three distinct user actor types: **Customers**, **Sellers**, and **Admins**. Each actor has clearly defined authentication requirements, permission boundaries, and access control mechanisms. The system implements JWT-based authentication with secure token management, email verification requirements, and role-based access control to ensure platform security and appropriate data isolation.

Authentication is the foundation of user identity verification and access control. All users must authenticate through email and password credentials, with email verification requirements for customers and sellers. The system maintains secure sessions using JWT tokens with automatic expiration and refresh capabilities.

---

## Authentication Overview

### Authentication Framework

THE platform SHALL use JSON Web Tokens (JWT) as the primary authentication mechanism for all user interactions.

THE authentication system SHALL support the following core operations:
- User registration with email and password
- Email address verification
- User login with credential validation
- Session token generation and refresh
- Secure password reset and account recovery
- Session termination and logout

### Security Principles

THE system SHALL enforce the following security principles:
- All passwords SHALL be securely hashed before storage using bcrypt with minimum 10 salt rounds
- Sensitive operations SHALL require re-authentication
- Account lockout SHALL occur after 5 failed login attempts with 15-minute lockout duration
- Email addresses SHALL be verified before account activation
- Sessions SHALL automatically expire after inactivity (30 days for customers/sellers, 8 hours for admins)
- Token refresh tokens SHALL be issued for extended sessions
- All tokens SHALL be transmitted exclusively over HTTPS encryption

### Authentication Scope

THE system SHALL differentiate authentication and authorization:
- **Authentication**: Verifying user identity through credentials (email + password)
- **Authorization**: Determining what authenticated users can do based on their role and permissions

```mermaid
graph LR
    A["User Provides Email & Password"] --> B{\"Credentials Valid?\"}
    B -->|\"No\"| C["Authentication Failed"]
    B -->|\"Yes\"| D["Generate JWT Token"]
    D --> E["Create User Session"]
    E --> F["User Authenticated"]
    F --> G{\"Has Permission?\"}
    G -->|\"Yes\"| H["Allow Operation"]
    G -->|\"No\"| I["Access Denied"]
```

---

## User Actor Definitions

### Customer Actor

**Description**: End-user customers who browse products, manage shopping carts, place orders, make payments, track shipments, and leave product reviews. Customers can manage their profiles, addresses, and order history.

**Primary Capabilities**:
- Browse and search the product catalog
- Create and manage personal profile information
- Manage multiple delivery addresses (maximum 10 addresses per customer)
- Create and manage shopping carts
- Add products to wishlists
- Place orders and make payments
- Track order status and shipping updates in real-time
- Leave product reviews and ratings
- Cancel orders within eligible timeframes
- Request returns and refunds
- View order history and past purchases
- Manage account preferences and notifications

**Authentication Requirements**:
- Must register with valid email address in RFC 5322 format
- Must verify email address before full account activation
- Must create secure password during registration (minimum 8 characters, containing uppercase, lowercase, number, special character)
- Can reset password via email verification with 2-hour token expiration
- Can log in from multiple devices simultaneously (maximum 5 concurrent sessions)
- Sessions expire after 30 days of inactivity

**Data Access**:
- Can only view and modify their own profile data
- Can only view and modify their own addresses
- Can only view and manage their own orders
- Can only view and manage their own shopping cart
- Can only view reviews they have authored
- Cannot access other customer data under any circumstances

---

### Seller Actor

**Description**: Business owners who register as sellers to list and manage their own products, monitor inventory, view orders from their store, process shipments, and manage product variants and pricing.

**Primary Capabilities**:
- Create and maintain seller profile and business information
- Register and verify seller account through admin approval
- Upload and manage product listings
- Create and manage product variants (colors, sizes, options)
- Set and update product pricing at the variant (SKU) level
- Manage inventory levels per SKU with real-time updates
- View orders containing their products
- Manage order fulfillment and shipping
- Update order and shipment status with tracking information
- Respond to customer inquiries about products
- View seller analytics and sales metrics
- Manage seller account settings and store customization
- Configure product categories and attributes

**Authentication Requirements**:
- Must register with business email address in valid format
- Must verify email address before account activation
- Must complete seller verification process (documentation/approval by admin)
- Account remains inactive until verified by admin through documentation review
- Must create secure password during registration (minimum 8 characters)
- Can reset password via email verification with 2-hour token expiration
- Can log in from multiple devices simultaneously (maximum 5 concurrent sessions)
- Sessions expire after 30 days of inactivity

**Data Access**:
- Can view only their own seller profile
- Can view and manage only products they have listed
- Can view only orders containing their products
- Can view only shipments for their orders
- Can view analytics for only their products and sales
- Cannot access other seller data or modify products from other sellers
- Cannot view order details not related to their products

---

### Admin Actor

**Description**: Platform administrators with full system access to manage all users, products, orders, sellers, payments, inventory, disputes, refunds, and overall platform settings and policies.

**Primary Capabilities**:
- Manage all user accounts (customers, sellers, admins)
- Approve or reject seller verification requests
- Suspend or deactivate seller accounts with audit logging
- Moderate and manage product listings
- Remove inappropriate products from catalog
- Manage all orders across the platform
- Process refunds and handle disputes
- View all payment transactions with complete details
- Monitor system analytics and metrics
- Manage platform-wide settings and configurations
- Create and manage promotional campaigns
- View and analyze customer behavior patterns
- Handle escalated customer complaints
- Manage system users and admin accounts
- Access audit logs and system activity records

**Authentication Requirements**:
- Admin accounts created by system or existing admins only
- Must use strong password meeting security standards during account creation
- Can reset password via secure admin portal with 2-hour token expiration
- Multi-factor authentication (MFA) required for security (email OTP or authenticator app)
- Sessions expire after 8 hours of inactivity (shorter than customer/seller for security)
- Can be restricted to specific admin permissions as needed for role-based access
- All admin actions logged with timestamp and reason for audit purposes

**Data Access**:
- Full access to all user data (customers and sellers)
- Full access to all product and inventory data
- Full access to all orders and transactions
- Full access to all payments and financial data
- Full access to all system logs and audit trails
- Can view and modify any order, seller, or customer record
- Can access real-time analytics and reporting

---

## Permission Hierarchy and Matrix

### Permission Categories

The system defines permissions across the following functional categories:

1. **Profile Management**: View and update user profile information
2. **Product Management**: Create, update, and manage product listings
3. **Inventory Management**: View and manage stock levels
4. **Order Management**: View and manage orders
5. **Payment Management**: View and process payments
6. **Review Management**: Create and view reviews
7. **Seller Management**: Verify and manage seller accounts
8. **Admin Operations**: System-wide administrative functions

### Complete Permission Matrix

| Permission | Customer | Seller | Admin |
|---|:---:|:---:|:---:|
| **Profile & Account** | | | |
| View own profile | ✅ | ✅ | ✅ |
| Update own profile | ✅ | ✅ | ✅ |
| Change own password | ✅ | ✅ | ✅ |
| View other profiles | ❌ | ❌ | ✅ |
| Modify other profiles | ❌ | ❌ | ✅ |
| Create user accounts | ❌ | ❌ | ✅ |
| Suspend/deactivate accounts | ❌ | ❌ | ✅ |
| **Address Management** | | | |
| Create delivery addresses | ✅ | ✅ | ❌ |
| View own addresses | ✅ | ✅ | ❌ |
| Update own addresses | ✅ | ✅ | ❌ |
| Delete own addresses | ✅ | ✅ | ❌ |
| View customer addresses | ❌ | ❌ | ✅ |
| **Product Management** | | | |
| Browse public products | ✅ | ✅ | ✅ |
| Create product listings | ❌ | ✅ | ❌ |
| Update own products | ❌ | ✅ | ❌ |
| Delete own products | ❌ | ✅ | ❌ |
| Manage product variants (SKU) | ❌ | ✅ | ❌ |
| Set product pricing | ❌ | ✅ | ❌ |
| View all products | ❌ | ❌ | ✅ |
| Moderate product content | ❌ | ❌ | ✅ |
| Remove inappropriate products | ❌ | ❌ | ✅ |
| **Inventory Management** | | | |
| View own inventory | ❌ | ✅ | ❌ |
| Update inventory levels | ❌ | ✅ | ❌ |
| View all inventory | ❌ | ❌ | ✅ |
| Adjust inventory manually | ❌ | ❌ | ✅ |
| **Shopping & Orders** | | | |
| Create shopping cart | ✅ | ❌ | ❌ |
| Manage shopping cart | ✅ | ❌ | ❌ |
| Create wishlist | ✅ | ❌ | ❌ |
| Manage wishlist | ✅ | ❌ | ❌ |
| Place orders | ✅ | ❌ | ❌ |
| View own orders | ✅ | ✅ (own products only) | ✅ |
| Cancel own orders | ✅ | ❌ | ✅ |
| View all orders | ❌ | ✅ (own store only) | ✅ |
| Update order status | ❌ | ✅ (own orders) | ✅ |
| **Payments** | | | |
| Process payment | ✅ | ❌ | ❌ |
| View own transactions | ✅ | ✅ | ✅ |
| View all transactions | ❌ | ❌ | ✅ |
| Process refunds | ❌ | ❌ | ✅ |
| **Reviews & Ratings** | | | |
| Create reviews | ✅ | ❌ | ❌ |
| View reviews | ✅ | ✅ | ✅ |
| Delete own reviews | ✅ | ❌ | ✅ |
| Moderate reviews | ❌ | ❌ | ✅ |
| **Seller Management** | | | |
| Apply for seller account | ✅ | ❌ | ❌ |
| Access seller dashboard | ❌ | ✅ | ❌ |
| Verify seller account | ❌ | ❌ | ✅ |
| Suspend seller account | ❌ | ❌ | ✅ |
| View seller metrics | ❌ | ✅ (own only) | ✅ |
| **Admin Operations** | | | |
| Access admin dashboard | ❌ | ❌ | ✅ |
| View system analytics | ❌ | ❌ | ✅ |
| Manage disputes | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ✅ |
| Configure system settings | ❌ | ❌ | ✅ |

---

## Customer Authentication and Access Control

### Customer Registration

WHEN a customer submits a registration request with email, password, and optional name information, THE system SHALL:
1. Validate email format (RFC 5322 standard) and ensure it is not already registered
2. Validate password meets security requirements (minimum 8 characters, contains uppercase, lowercase, number, special character)
3. Hash the password using bcrypt algorithm with minimum 10 salt rounds
4. Create a customer account with \"email-unverified\" status
5. Send a verification email with a unique verification link
6. Return success confirmation to the customer

THE customer account SHALL remain in \"email-unverified\" status until email verification is complete. THE customer SHALL NOT be able to place orders while in unverified status.

### Email Verification

WHEN a customer clicks the email verification link, THE system SHALL:
1. Validate the verification link has not expired (valid for 24 hours)
2. Validate the verification link matches the associated email address
3. Update customer account status to \"active\"
4. Confirm email verification success to the customer
5. Allow customer to proceed with login and shopping

IF the verification link has expired, THE system SHALL provide a mechanism to request a new verification email.

THE verification token SHALL be cryptographically secure and unique for each verification attempt.

### Customer Login

WHEN a customer submits login credentials (email and password), THE system SHALL:
1. Check if an account exists with the provided email address
2. IF account does not exist, THEN return \"invalid credentials\" error without indicating whether email exists
3. IF account status is not \"active\", THEN return \"account not activated\" error
4. Verify the provided password matches the stored password hash
5. IF password does not match, THEN increment failed login counter
6. IF failed login attempts exceed 5 within 30 minutes, THEN lock account for 15 minutes
7. Upon successful authentication, generate JWT access token and refresh token
8. Create user session in system
9. Return tokens to customer with expiration times

### JWT Token Structure for Customers

THE access token for customers SHALL contain the following payload:
```json
{
  "userId": "<unique-customer-id>",
  "email": "<customer-email>",
  "role": "customer",
  "permissions": ["browse-products", "manage-cart", "place-orders", "manage-profile"],
  "iat": <issued-at-unix-timestamp>,
  "exp": <expiration-unix-timestamp>,
  "iss": "shopping-mall-platform"
}
```

THE access token expiration SHALL be 15 minutes.

THE refresh token expiration SHALL be 30 days.

THE refresh token SHALL NOT contain sensitive user data, only a secure reference identifier.

### Password Reset

WHEN a customer requests a password reset, THE system SHALL:
1. Accept the customer's email address
2. Verify email exists in the system
3. Generate a secure password reset token (valid for 2 hours)
4. Send password reset email with reset link
5. Return confirmation message without revealing whether email exists in system

WHEN a customer submits a new password via the reset link, THE system SHALL:
1. Validate the reset link has not expired (2-hour expiration)
2. Validate the new password meets security requirements
3. Hash and store the new password using bcrypt with minimum 10 salt rounds
4. Invalidate the reset token (single-use only)
5. Return success confirmation
6. Optionally send confirmation email

THE password reset token SHALL be cryptographically secure and unique for each reset request.

### Customer Profile Management

WHEN a customer requests to view their profile, THE system SHALL return:
- Email address
- Full name
- Phone number
- Profile creation date
- Last login date
- Account status
- Notification preferences

WHEN a customer updates their profile information, THE system SHALL:
1. Validate all input data
2. Update only the fields the customer specified
3. Return updated profile information
4. Log the profile update action with timestamp and changes made

THE customer SHALL NOT be able to change their email address through profile update (must use account recovery process).

### Customer Address Management

WHEN a customer adds a new delivery address, THE system SHALL:
1. Validate all address fields (street, city, postal code, country)
2. Allow up to 10 saved addresses per customer
3. Store address with optional label (home, work, etc.)
4. Return the saved address with unique address ID
5. Allow customer to mark one address as default

WHEN a customer updates an existing address, THE system SHALL only allow modification if no active orders are using that address.

WHEN a customer deletes an address, THE system SHALL:
1. Check if address is currently in use by any active orders
2. IF address is in use, THEN prevent deletion and show error message
3. IF address is not in use, THEN delete the address
4. IF deleted address was default, THEN set another address as default

THE customer SHALL be able to view all their saved addresses at any time.

### Session Management for Customers

THE customer session SHALL expire after 30 days of inactivity.

WHEN a customer's session expires, THE system SHALL:
1. Invalidate the access token
2. Require the customer to refresh the token or re-login
3. Return 401 Unauthorized error with clear message

THE customer SHALL be able to maintain active sessions on maximum 5 devices simultaneously.

---

## Seller Authentication and Access Control

### Seller Registration

WHEN a user applies to become a seller, THE system SHALL:
1. Accept seller profile information: business name, business email, business type, business registration number
2. Validate email format and ensure it is not already registered
3. Validate password meets security requirements (minimum 8 characters)
4. Create a seller account with \"pending-verification\" status
5. Send verification email to the provided business email
6. Return confirmation message that seller application is under review

THE seller account SHALL remain in \"pending-verification\" status until admin approval completes.

### Seller Email Verification

WHEN a seller clicks the email verification link, THE system SHALL:
1. Validate the verification link has not expired (24-hour expiration)
2. Validate the verification link matches the associated seller email
3. Update seller verification email status to \"verified\"
4. Send notification to seller that email is verified and awaiting admin approval
5. Notify admin that a new seller has completed email verification

### Seller Verification and Approval

WHEN an admin reviews a seller application, THE admin can:
1. Approve the seller - change status to \"active\", notify seller via email within 2 hours
2. Request additional documents - change status to \"pending-documents\", notify seller with specific requests
3. Reject the seller - change status to \"rejected\", notify seller with detailed reasons

WHEN seller account status is changed to \"active\", THE system SHALL:
1. Send welcome email to seller with onboarding information
2. Enable all seller dashboard features immediately
3. Allow seller to begin uploading products
4. Generate seller dashboard access credentials

### Seller Login

WHEN a seller submits login credentials, THE system SHALL:
1. Check if an account exists with the provided email address
2. Verify the provided password matches the stored password hash
3. IF account status is not \"active\", THEN return error message explaining account status
4. IF account is \"pending-verification\", THEN return message that email verification is pending
5. IF account is \"pending-documents\", THEN return message that seller verification is pending
6. Upon successful authentication, generate JWT access token and refresh token
7. Create seller session with seller-specific dashboard access
8. Return tokens to seller

### JWT Token Structure for Sellers

THE access token for sellers SHALL contain the following payload:
```json
{
  "userId": "<unique-seller-id>",
  "email": "<seller-email>",
  "role": "seller",
  "sellerId": "<seller-store-id>",
  "storeName": "<business-name>",
  "permissions": ["manage-products", "manage-inventory", "view-orders", "manage-fulfillment"],
  "iat": <issued-at-unix-timestamp>,
  "exp": <expiration-unix-timestamp>,
  "iss": "shopping-mall-platform"
}
```

THE access token expiration for sellers SHALL be 15 minutes.

THE refresh token expiration for sellers SHALL be 30 days.

### Seller Profile Management

WHEN a seller views their profile, THE system SHALL display:
- Business name and business email
- Business registration information
- Account creation date
- Verification status
- Business category
- Store metrics (product count, average rating, customer count)

WHEN a seller updates their profile, THE system SHALL allow updates to:
- Business name
- Business contact information
- Store description
- Store logo and banner images
- Business hours and policies

THE seller SHALL NOT be able to change their business registration number (admin must handle corrections).

### Seller Account Status Changes

IF a seller account is suspended by admin, THE system SHALL:
1. Immediately revoke all active seller sessions
2. Prevent seller from logging in
3. Disable all seller operations (product uploads, order management)
4. Send notification email to seller explaining suspension reason
5. Provide appeal process information

THE seller SHALL be able to request account reinstatement by submitting an appeal and supporting documentation.

### Session Management for Sellers

THE seller session SHALL expire after 30 days of inactivity.

WHEN a seller's session is about to expire, THE system MAY send a warning notification after 29 days.

THE seller SHALL be able to manually log out from all active sessions from the seller dashboard.

---

## Admin Authentication and Access Control

### Admin Account Creation

ONLY existing system admins or automated system processes can create new admin accounts.

WHEN creating an admin account, THE system SHALL:
1. Accept admin email, temporary password, and permission level
2. Create admin account with \"active\" status
3. Send admin notification email with temporary credentials
4. Require admin to change password on first login
5. Optionally enable multi-factor authentication (MFA) requirement

### Admin Login and Multi-Factor Authentication

WHEN an admin submits login credentials, THE system SHALL:
1. Verify email and password match stored credentials
2. IF MFA is enabled for admin, THEN send MFA code to registered device/email
3. Require admin to provide valid MFA code (6-digit OTP or authenticator app code)
4. Upon successful authentication, generate JWT access token with extended scopes
5. Create admin session with full administrative capabilities
6. Log admin login attempt with timestamp and IP address

### JWT Token Structure for Admins

THE access token for admins SHALL contain the following payload:
```json
{
  "userId": "<unique-admin-id>",
  "email": "<admin-email>",
  "role": "admin",
  "adminLevel": "full" or "restricted",
  "permissions": ["manage-users", "manage-sellers", "manage-products", "manage-orders", "view-analytics", "manage-disputes", "system-config"],
  "restrictedTo": "<optional-department-or-feature>",
  "iat": <issued-at-unix-timestamp>,
  "exp": <expiration-unix-timestamp>,
  "iss": "shopping-mall-platform"
}
```

THE access token expiration for admins SHALL be 8 hours (shorter than customer/seller for security).

THE refresh token expiration for admins SHALL be 7 days (shorter than customer/seller for security).

### Admin Permissions Hierarchy

ADMINS can have different permission levels:

**Full Admin**: Complete access to all system functions and data.

**Restricted Admin**: Access limited to specific functions:
- Content Moderation Admin: Can moderate products and reviews only
- Dispute Resolution Admin: Can manage disputes and refunds only
- Seller Management Admin: Can manage seller accounts and verification only
- Analytics Admin: Can view analytics and reports only (read-only access)

### Admin Actions and Audit Logging

EVERY admin action SHALL be logged with:
- Admin user ID who performed the action
- Action type and detailed description
- Timestamp of the action (with timezone)
- Affected user/entity ID
- Previous and new values (for modifications)
- Admin IP address and device information
- Reason or notes provided by admin

THE system SHALL retain admin audit logs for a minimum of 2 years for compliance purposes.

ADMINS SHALL be able to view audit logs for actions they have permission to access (based on their admin level).

### Admin Session Management

THE admin session SHALL expire after 8 hours of inactivity (shorter than customer/seller).

WHEN an admin's session is about to expire, THE system SHALL send a warning notification after 7 hours of inactivity.

THE admin SHALL be able to manually extend their session from the admin dashboard for an additional 8 hours.

WHEN an admin logs out, THE system SHALL:
1. Invalidate all active tokens for that admin
2. End the admin session
3. Log the logout action with timestamp

---

## Authentication Workflows and Flows

### Complete Customer Registration Flow

```mermaid
graph LR
    A["Customer Accesses Registration"] --> B["Enters Email, Password, Name"]
    B --> C{\"Email Format Valid?\"}
    C -->|\"No\"| D["Show Email Error"]
    D --> B
    C -->|\"Yes\"| E{\"Email Already Registered?\"}
    E -->|\"Yes\"| F["Show Email Exists Error"]
    F --> B
    E -->|\"No\"| G{\"Password Meets Requirements?\"}
    G -->|\"No\"| H["Show Password Error"]
    H --> B
    G -->|\"Yes\"| I["Hash Password"]
    I --> J["Create Account - Unverified Status"]
    J --> K["Send Verification Email"]
    K --> L["Show Success Message"]
    L --> M["Customer Clicks Email Link"]
    M --> N{\"Link Valid & Not Expired?\"}
    N -->|\"No\"| O["Show Expired Link Error"]
    O --> P["Offer Resend Email"]
    N -->|\"Yes\"| Q["Update Account to Active"]
    Q --> R["Show Verification Success"]
    R --> S["Customer Can Now Login"]
```

### Complete Customer Login Flow

```mermaid
graph LR
    A["Customer Submits Email & Password"] --> B{\"Account Exists?\"}
    B -->|\"No\"| C["Return Invalid Credentials"]
    B -->|\"Yes\"| D{\"Account Status Active?\"}
    D -->|\"No\"| E["Return Account Not Active Error"]
    D -->|\"Yes\"| F["Check Failed Login Attempts"]
    F --> G{\"Account Locked?\"}
    G -->|\"Yes\"| H["Return Account Locked Error"]
    G -->|\"No\"| I{\"Password Matches?\"}
    I -->|\"No\"| J["Increment Failed Attempts"]
    J --> K["Return Invalid Credentials"]
    I -->|\"Yes\"| L["Reset Failed Attempts"]
    L --> M["Generate Access Token"]
    M --> N["Generate Refresh Token"]
    N --> O["Create Session"]
    O --> P["Return Tokens to Customer"]
    P --> Q["Customer Logged In Successfully"]
```

### Seller Verification Process

```mermaid
graph LR
    A["Seller Submits Registration"] --> B["Create Account - Pending Verification"]
    B --> C["Send Email Verification Link"]
    C --> D["Seller Verifies Email"]
    D --> E["Account Ready for Admin Review"]
    E --> F["Admin Reviews Application"]
    F --> G{\"Approve?\"}
    G -->|\"Approve\"| H["Set Status to Active"]
    G -->|\"Request Docs\"| I["Set Status to Pending Documents"]
    G -->|\"Reject\"| J["Set Status to Rejected"]
    H --> K["Send Approval Email"]
    I --> L["Send Request Email"]
    J --> M["Send Rejection Email"]
```

### Token Refresh Flow

```mermaid
graph LR
    A["Access Token Approaching Expiration"] --> B["Client Submits Refresh Token"]
    B --> C{\"Refresh Token Valid?\"}
    C -->|\"No\"| D["Return Invalid Token Error"]
    D --> E["Require Re-login"]
    C -->|\"Yes\"| F{\"Refresh Token Expired?\"}
    F -->|\"Yes\"| G["Return Token Expired Error"]
    G --> E
    F -->|\"No\"| H["Generate New Access Token"]
    H --> I["Optionally Generate New Refresh Token"]
    I --> J["Return New Tokens"]
```

### Password Reset Flow

```mermaid
graph LR
    A["User Requests Password Reset"] --> B["Enter Email Address"]
    B --> C{\"Email Exists?\"}
    C -->|\"No\"| D["Return Email Not Found"]
    C -->|\"Yes\"| E["Generate Reset Token"]
    E --> F["Send Reset Email with Link"]
    F --> G["Show Confirmation Message"]
    G --> H["User Clicks Reset Link"]
    H --> I{\"Link Valid & Not Expired?\"}
    I -->|\"No\"| J["Show Link Expired Error"]
    I -->|\"Yes\"| K["Show New Password Form"]
    K --> L["User Enters New Password"]
    L --> M{\"Password Valid?\"}
    M -->|\"No\"| N["Show Password Error"]
    M -->|\"Yes\"| O["Hash New Password"]
    O --> P["Update Account Password"]
    P --> Q["Invalidate Reset Token"]
    Q --> R["Show Success Message"]
```

---

## Token Management (JWT)

### JWT Overview and Structure

JSON Web Tokens (JWT) are the authentication mechanism for all API requests after initial login.

A JWT consists of three parts separated by dots:
```
header.payload.signature
```

**Header**: Contains token type and hashing algorithm
**Payload**: Contains claims and user information (encrypted but not secure)
**Signature**: Ensures token has not been tampered with

### Access Token Specifications

THE access token SHALL be issued upon successful login and SHALL:
- Contain the user's ID, email, role, and applicable permissions
- Have an expiration time of 15 minutes for customers and sellers, 8 hours for admins
- Be signed with the server's secret key using HS256 algorithm
- Be included in the Authorization header of all API requests (format: \"Bearer <token>\")
- Be invalidated upon logout
- NOT contain sensitive data like password or payment information

THE access token payload structure for all users SHALL include:
```json
{
  "userId": "<unique-user-id>",
  "email": "<user-email>",
  "role": "<customer|seller|admin>",
  "iat": <issued-at-unix-timestamp>,
  "exp": <expiration-unix-timestamp>,
  "iss": "shopping-mall-platform"
}
```

### Refresh Token Specifications

THE refresh token SHALL be issued along with the access token and SHALL:
- Have an expiration time of 30 days for customers and sellers, 7 days for admins
- Be used exclusively to obtain a new access token
- NOT contain sensitive user data beyond necessary identifier
- Be stored securely (httpOnly cookie recommended, never in localStorage)
- Never be included in API request body or standard headers (kept server-side)
- Be single-use or revoke-on-use (issue new refresh token with each refresh)

WHEN a client requests a new access token using the refresh token, THE system SHALL:
1. Validate the refresh token signature
2. Check if the refresh token has expired
3. Check if the refresh token has been revoked
4. IF validation passes, THEN generate a new access token
5. Optionally generate a new refresh token (sliding expiration recommended)
6. Return new tokens to client

### Token Storage Strategy

THE recommended token storage for client applications:
- **Access Token**: Store in memory or secure session storage (not localStorage for production)
- **Refresh Token**: MUST be stored in httpOnly secure cookie with Secure and SameSite flags

ALTERNATIVELY, for enhanced security:
- **Access Token**: Store in memory only (cleared on page refresh, requires re-login)
- **Refresh Token**: Store in httpOnly cookie with Secure=true and SameSite=Strict flags

### Token Validation on API Requests

WHEN an API request is received, THE system SHALL:
1. Extract the access token from the Authorization header (format: \"Bearer <token>\")
2. Validate the token signature using the secret key
3. Check if the token has expired
4. Extract the user ID and role from the token payload
5. Verify the user still has the required permissions for the requested operation
6. IF token is invalid or expired, THEN return 401 Unauthorized error
7. IF user lacks permissions, THEN return 403 Forbidden error

### Token Revocation and Blacklisting

THE system SHALL maintain a token revocation list (blacklist) for:
- Tokens associated with logged-out users
- Tokens associated with suspended/deactivated accounts
- Tokens associated with expired sessions
- Tokens issued to admin accounts that were later suspended

WHEN a user logs out, THE system SHALL:
1. Add the user's current refresh token to the revocation list
2. Optionally add the access token to the revocation list
3. Invalidate the user's session
4. Return success confirmation to user

WHEN validating a token, THE system SHALL check if the token appears in the revocation list.

THE revocation list entries SHALL expire automatically after the token's natural expiration time to prevent unbounded growth.

### Token Security Best Practices

THE system SHALL enforce the following security practices:
- Tokens SHALL never be logged or stored in plain text anywhere
- Tokens SHALL use strong cryptographic signing (RS256 or HS256 minimum)
- Secret keys SHALL be stored in secure environment variables or key management service
- Secret keys SHALL be rotated annually and upon security incident
- Tokens SHALL be transmitted exclusively over HTTPS connections (never HTTP)
- Cookies storing tokens SHALL have secure, httpOnly, and SameSite flags set
- Token payload SHALL NOT contain passwords, credit card numbers, or other sensitive data
- Tokens SHALL include \"iss\" (issuer) and \"aud\" (audience) claims for validation

---

## Session Management

### Session Lifecycle

A session represents an authenticated user's interaction with the platform.

WHEN a user successfully authenticates, THE system SHALL:
1. Create a session record with unique session ID (UUID format)
2. Store session information: user ID, login timestamp, IP address, user agent, device fingerprint
3. Issue JWT tokens for API authentication
4. Return session information to client (tokens and session ID)

WHEN a user makes API requests, THE system SHALL:
1. Validate the JWT token
2. Verify the session is still active
3. Allow the operation if both token and session are valid
4. Update session last-activity timestamp

WHEN a user logs out OR session expires, THE system SHALL:
1. Invalidate the session
2. Revoke the associated tokens
3. Clear any server-side session data
4. Close all related connections

### Session Timeout and Auto-logout

THE following session timeout rules SHALL apply:

**Customer Sessions**: Automatically expire after 30 days of inactivity
**Seller Sessions**: Automatically expire after 30 days of inactivity
**Admin Sessions**: Automatically expire after 8 hours of inactivity

WHEN a session is about to timeout, THE client application MAY send a keep-alive ping to extend the session.

WHEN a session times out, THE system SHALL:
1. Invalidate the session
2. Return 401 Unauthorized on the next API request
3. Require user to re-login

### Concurrent Session Handling

THE platform SHALL support multiple concurrent sessions per user.

WHEN a customer logs in from a new device, THE system SHALL:
1. Create a new session for the new device
2. Allow the customer to maintain their previous sessions
3. Display all active sessions in the account security settings

WHEN a customer explicitly logs out from one device, THE system SHALL:
1. Invalidate only that specific session
2. Maintain other active sessions on different devices

THE maximum number of concurrent sessions per user:
- **Customers**: Maximum 5 concurrent sessions
- **Sellers**: Maximum 5 concurrent sessions
- **Admins**: Maximum 3 concurrent sessions (stricter for security)

IF a user attempts to create more sessions than allowed, THE system SHALL log them out from their oldest session and create the new one.

### Admin Session Termination

WHEN an admin account is suspended, THE system SHALL:
1. Invalidate all active sessions for that admin
2. Revoke all outstanding tokens
3. Prevent the admin from logging in
4. Log all session terminations with reason

WHEN an admin's permissions are changed, THE system SHALL:
1. Revoke current access token
2. Allow existing refresh token to continue working with new permissions
3. Issue new access token with updated permissions on next refresh
4. Log permission change with timestamp and admin who made the change

---

## Access Control Enforcement

### Permission Validation Framework

EVERY API request SHALL be validated against the following framework:
1. **Authentication**: Verify the user is authenticated via valid JWT token
2. **Authorization**: Verify the user's role has permission for the requested operation
3. **Data Access**: Verify the user has access to the requested data
4. **Business Logic**: Verify the operation is allowed by business rules

### Role-Based Access Control (RBAC)

THE system SHALL enforce access control based on user role (customer, seller, admin).

WHEN a user attempts an operation, THE system SHALL:
1. Check the operation's required role(s)
2. Verify the user's role matches one of the required roles
3. IF role doesn't match, THEN return 403 Forbidden error
4. Verify the user's account status allows the operation (not suspended)

### Data-Level Access Restrictions

CUSTOMERS SHALL only access:
- Their own profile data
- Their own addresses
- Their own orders and order history
- Public product information
- Reviews they have written

WHEN a customer requests data, THE system SHALL:
1. Verify the requested data belongs to that customer
2. IF data doesn't belong to customer, THEN return 404 Not Found (do not indicate access denied for security)
3. Return the data only if the customer is authorized

SELLERS SHALL only access:
- Their own seller profile
- Products they have listed
- Orders containing their products
- Inventory for their products
- Analytics for their sales

WHEN a seller requests data, THE system SHALL:
1. Verify the requested data is associated with that seller's store
2. IF data is not associated with seller, THEN return 404 Not Found
3. Return the data only if the seller is authorized

### Feature-Level Access Control

THE system SHALL use permission flags to control feature access.

WHEN a user attempts to access a feature, THE system SHALL:
1. Check if the feature is enabled for the user's role
2. Check if the user's specific account has access to the feature
3. IF feature is not enabled, THEN return appropriate error message
4. Allow access only if both checks pass

### Error Handling for Access Violations

WHEN a user attempts an unauthorized operation, THE system SHALL return appropriate error responses:

**401 Unauthorized**: User's token is invalid, expired, or missing
**403 Forbidden**: User is authenticated but lacks permission for the operation
**404 Not Found**: Requested resource not found (used when user lacks access to verify resource existence)

THE error messages SHALL NOT reveal whether a resource exists if the user lacks access to it.

### Admin Override and Audit Logging

WHEN an admin performs an operation on behalf of another user, THE system SHALL:
1. Verify the admin has explicit permission for the operation
2. Log the operation with the admin's user ID
3. Record the original user ID being affected
4. Indicate in the audit log that this was an admin override
5. Store the reason or notes provided by the admin

ALL admin operations SHALL be logged and auditable.

---

## Security Requirements

### Password Security Standards

THE system SHALL enforce the following password requirements:
- Minimum length: 8 characters
- Must contain at least one uppercase letter (A-Z)
- Must contain at least one lowercase letter (a-z)
- Must contain at least one number (0-9)
- Must contain at least one special character (!@#$%^&*)
- Maximum length: 128 characters (reasonable upper bound)

PASSWORDS SHALL be hashed using bcrypt algorithm with minimum 10 salt rounds before storage.

THE system SHALL NOT store passwords in plain text under any circumstances.

THE system SHALL never display passwords to admins, users, or logs.

### Account Lockout Policy

AFTER 5 failed login attempts within 30 minutes, THE system SHALL:
1. Temporarily lock the account for 15 minutes
2. Send notification email to the account owner
3. Require the account owner to reset their password or wait for the lockout period to expire

ADMINS SHALL be able to manually unlock accounts immediately in case of legitimate lockout.

THE system SHALL track failed login attempts per account and per IP address to prevent distributed attacks.

### Sensitive Operation Authentication

FOR sensitive operations such as:
- Changing email address
- Changing password
- Modifying payment information
- Initiating large refunds (> 500 currency units)
- Suspending seller accounts
- Deleting products

THE system SHALL require re-authentication:
1. Prompt user to enter their password again
2. Verify the password matches the stored hash
3. Allow the operation only after successful re-authentication
4. Log the sensitive operation with timestamp and reason

### API Authentication Requirements

ALL API endpoints except the following SHALL require a valid JWT access token:
- User registration endpoint
- User login endpoint
- Password reset request endpoint
- Password reset confirmation endpoint
- Email verification endpoint
- Public product browse endpoints (may be restricted by business rules)
- Public review view endpoints
- System health check endpoint

THE JWT token SHALL be included in the Authorization header of all other API requests:
```
Authorization: Bearer <access-token>
```

IF the token is missing or invalid, THE system SHALL return 401 Unauthorized with descriptive error message.

### HTTPS and Secure Communication

THE system SHALL enforce HTTPS for all authentication and session-related endpoints.

ALL tokens, passwords, and sensitive data SHALL be transmitted exclusively over encrypted HTTPS connections (minimum TLS 1.2).

THE platform SHALL NOT accept HTTP requests for authentication endpoints or any sensitive operations.

### Email Verification Security

THE system SHALL use cryptographically secure random tokens for email verification links.

VERIFICATION tokens SHALL:
- Have a 24-hour expiration time (86,400 seconds)
- Be valid for only a single use
- Be invalidated after use
- NOT be reusable if resent

WHEN a verification email is resent, THE system SHALL:
1. Generate a new verification token
2. Invalidate the previous token
3. Send the new link to the email address
4. Prevent brute-force attacks by limiting resend attempts to 3 per hour

---

## Summary of Key Authentication Flows

The platform implements a comprehensive authentication and authorization system with three distinct user actors:

1. **Customers**: Register with email verification, manage profiles and multiple addresses, access shopping and order functionality

2. **Sellers**: Register and undergo admin verification before account activation, manage products and inventory, fulfill orders

3. **Admins**: Created by existing admins, possess full system access with restricted variants possible, all actions audited and logged

JWT tokens provide stateless, secure authentication with automatic expiration and manual refresh capabilities. Sessions are managed per user with appropriate timeout periods based on actor type. Role-based and data-level access control ensures users can only access their own data and perform authorized operations.

The system prioritizes security through password hashing, account lockout policies, email verification, token revocation, and comprehensive audit logging of all sensitive operations and access attempts.

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*