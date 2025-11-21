# User Actor Requirements for E-Commerce Shopping Mall

## User Actor Definitions

### 1. Customer (Registered User)

THE customer SHALL be a registered user of the platform with the following capabilities:

WHEN a customer accesses the platform, THE system SHALL provide access to browse all public products and categories.

THE customer SHALL be able to search for products using keywords, filters, and sorting options.

THE customer SHALL be able to view detailed product information including descriptions, images, prices, and available variants.

THE customer SHALL be able to add products to their shopping cart and manage cart contents including quantity adjustments and item removal.

THE customer SHALL be able to save products to a personal wishlist for future reference.

THE customer SHALL be able to create and manage multiple shipping addresses associated with their account.

THE customer SHALL be able to place orders using items from their shopping cart.

THE customer SHALL be able to select from their saved addresses during checkout.

THE customer SHALL be able to track order status and shipment progress after purchase.

THE customer SHALL be able to submit product reviews and ratings for items they have purchased.

THE customer SHALL be able to view their complete order history with details.

THE customer SHALL be able to request order cancellations for eligible orders.

THE customer SHALL be able to initiate refund requests for eligible purchases.

THE customer SHALL be able to update their personal profile information including contact details and password.

### 2. Seller (Vendor)

THE seller SHALL be an authorized vendor account with the ability to manage their own product catalog.

THE seller SHALL be able to create new product listings with complete details including categories, descriptions, pricing, and images.

THE seller SHALL be able to define product variants (SKUs) with different attributes such as size, color, and options.

THE seller SHALL be able to manage inventory levels for each product variant.

THE seller SHALL be able to update product information, pricing, and availability as needed.

THE seller SHALL be able to view orders placed for their products with customer shipping information.

THE seller SHALL be able to update order status to reflect fulfillment progress (processing, shipped, delivered).

THE seller SHALL be able to view sales reports and performance analytics for their products.

THE seller SHALL be able to respond to customer reviews for their products.

THE seller SHALL be able to update their business profile information including contact details and store description.

### 3. Admin (System Administrator)

THE admin SHALL have full system access to manage all platform functions.

THE admin SHALL be able to manage all user accounts including customers and sellers.

THE admin SHALL be able to create, modify, and remove product categories and subcategories.

THE admin SHALL be able to review and moderate product listings for policy compliance.

THE admin SHALL be able to oversee all orders across the platform.

THE admin SHALL be able to manage order statuses and resolve disputes between customers and sellers.

THE admin SHALL be able to configure payment methods and shipping options.

THE admin SHALL be able to generate comprehensive platform reports including sales, user activity, and inventory status.

THE admin SHALL be able to manage promotional campaigns and discount codes.

THE admin SHALL be able to configure system settings and platform parameters.

THE admin SHALL be able to moderate user reviews and handle policy violations.

THE admin SHALL be able to monitor system performance and user activity logs.

## Authentication Requirements

### Registration Process

WHEN a guest user initiates account registration, THE system SHALL collect email address, password, and basic profile information.

WHEN a user submits registration information, THE system SHALL validate that the email address is properly formatted.

WHEN a user submits registration information, THE system SHALL verify that the email address is not already registered in the system.

WHEN a user successfully registers, THE system SHALL send a verification email to the provided address.

WHEN a user clicks the verification link in their email, THE system SHALL activate their account and allow full platform access.

IF a user attempts to register with an email that is already in use, THEN THE system SHALL display an appropriate error message.

WHEN a user requests to reset their password, THE system SHALL send a password reset link to their registered email address.

WHEN a user accesses the password reset link within its validity period, THE system SHALL allow them to set a new password.

### Login Process

WHEN a user submits login credentials, THE system SHALL validate the email and password combination.

WHEN valid credentials are provided, THE system SHALL generate authentication tokens and establish a user session.

WHEN invalid credentials are provided, THE system SHALL deny access and display an appropriate error message.

WHEN a user attempts to log in with an unverified email address, THE system SHALL deny access and prompt for email verification.

WHEN a user logs in successfully, THE system SHALL redirect them to their personalized dashboard.

### Session Management

THE system SHALL maintain user sessions using secure JWT tokens for authentication.

THE system SHALL automatically log out users after a period of inactivity as defined by security policies.

THE user SHALL be able to manually log out from their account on any device.

WHEN a user logs out, THE system SHALL invalidate their session tokens across all devices.

THE user SHALL be able to view and manage active sessions from their account settings.

WHEN a user changes their password, THE system SHALL invalidate all existing sessions except the current one.

### Profile Management

THE user SHALL be able to update their personal information including name, contact details, and preferences.

THE user SHALL be able to change their password through the account settings.

THE user SHALL be able to manage notification preferences for emails and alerts.

## Permission Matrix

| Functionality | Customer | Seller | Admin |
|---------------|:--------:|:------:|:-----:|
| Browse products | ✅ | ✅ | ✅ |
| Search products | ✅ | ✅ | ✅ |
| View product details | ✅ | ✅ | ✅ |
| Add to cart | ✅ | ❌ | ❌ |
| Manage cart | ✅ | ❌ | ❌ |
| Create wishlist | ✅ | ❌ | ❌ |
| Manage addresses | ✅ | ❌ | ❌ |
| Place orders | ✅ | ❌ | ❌ |
| Track orders | ✅ | ✅ | ✅ |
| Submit reviews | ✅ | ✅ | ✅ |
| View order history | ✅ | ✅ | ✅ |
| Request cancellations | ✅ | ❌ | ✅ |
| Request refunds | ✅ | ❌ | ✅ |
| Create products | ❌ | ✅ | ✅ |
| Edit products | ❌ | ✅ | ✅ |
| Manage inventory | ❌ | ✅ | ✅ |
| Update order status | ❌ | ✅ | ✅ |
| View sales reports | ❌ | ✅ | ✅ |
| Respond to reviews | ❌ | ✅ | ✅ |
| Manage user accounts | ❌ | ❌ | ✅ |
| Manage categories | ❌ | ❌ | ✅ |
| Moderate content | ❌ | ❌ | ✅ |
| Generate system reports | ❌ | ❌ | ✅ |
| Configure platform | ❌ | ❌ | ✅ |

## JWT Token Management

### Token Structure and Content

THE system SHALL use JSON Web Tokens (JWT) for authentication and authorization.

THE JWT payload SHALL include the following standard claims:
- `sub`: User ID (unique identifier)
- `role`: User role (customer, seller, or admin)
- `permissions`: Array of permitted actions based on user role
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp

THE access token SHALL have a validity period of 30 minutes.

THE refresh token SHALL have a validity period of 30 days.

### Token Storage and Security

THE system SHALL store JWT tokens in httpOnly cookies for enhanced security against XSS attacks.

THE system SHALL use secure flags for cookies when operating over HTTPS connections.

THE system SHALL implement CSRF protection mechanisms to prevent cross-site request forgery.

THE system SHALL validate all tokens on each authenticated request for expiration and integrity.

### Token Refresh Process

WHEN an access token expires during user activity, THE system SHALL automatically attempt to refresh it using the refresh token.

WHEN a refresh token is used successfully, THE system SHALL generate new access and refresh tokens.

IF a refresh token is expired or invalid, THE system SHALL redirect the user to the login page.

THE system SHALL maintain a secure refresh token rotation mechanism to prevent replay attacks.

### Role-Based Access Control

THE system SHALL validate user permissions on each API request based on their JWT claims.

THE system SHALL deny access to restricted resources when a user lacks the necessary permissions.

WHEN a user attempts to access a resource outside their permissions, THE system SHALL return an appropriate HTTP 403 Forbidden response.

THE system SHALL log all authorization failures for security monitoring purposes.

```mermaid
graph LR
  A["User Authentication Flow"] 
  
  subgraph "Authentication Process"
    B["User Login Request"]
    C{"Credentials Valid?"}
    D["Generate JWT Tokens"]
    E["Set Secure Cookies"]
    F["Redirect to Dashboard"]
  end
  
  subgraph "Authorization Process"
    G["Validate JWT on Request"]
    H{"Token Valid and Not Expired?"}
    I["Check User Permissions"]
    J{"Has Required Permissions?"}
    K["Allow Access"]
    L["Return Forbidden Error"]
  end
  
  M["Access Protected Resource"]
  
  A -. "1. Submit Credentials" .- B
  B -. "2. Validate Credentials" .- C
  C -- "Yes" -. "3. Create Tokens" .- D
  D -. "4. Store Tokens" .- E
  E -. "5. Complete Login" .- F
  F -. "6. User Activity" .- M
  M -. "7. Validate Request" .- G
  G -. "8. Token Check" .- H
  H -- "Yes" -. "9. Permissions Check" .- I
  I -. "10. Authorization" .- J
  J -- "Yes" -. "11. Grant Access" .- K
  J -- "No" -. "11. Deny Access" .- L
  H -- "No" -. "Deny Request" .- L
  C -- "No" -. "Show Error" .- L
```

## Session Management Requirements

### Concurrent Sessions

THE system SHALL allow users to maintain multiple active sessions across different devices.

THE user SHALL be able to view all active sessions from their account settings.

THE user SHALL be able to revoke access from specific devices or terminate all sessions except the current one.

WHEN a user's password is changed, THE system SHALL terminate all other active sessions.

### Session Security

THE system SHALL implement rate limiting on authentication attempts to prevent brute force attacks.

THE system SHALL log all authentication events including successful logins, failed attempts, and logout events.

THE system SHALL implement secure session timeout mechanisms to protect against unauthorized access.

THE system SHALL encrypt all sensitive session data both in transit and at rest.

### Account Recovery

WHEN a user requests account recovery, THE system SHALL send recovery instructions to their registered email.

THE account recovery process SHALL have a time-limited validity period.

THE system SHALL log all account recovery attempts for security monitoring.

IF multiple failed recovery attempts are detected, THE system SHALL temporarily lock the account and notify the user.