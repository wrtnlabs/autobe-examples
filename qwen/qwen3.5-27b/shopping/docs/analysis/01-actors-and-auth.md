**shoppingMall — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their roles and what they can do.

## guest Actor

Guest users have extremely limited access to the platform. Guests cannot browse products, view categories, or access any platform features without first creating an account. All platform activities require mandatory registration before any feature access is granted. This includes viewing product details, searching, or adding items to a wishlist. Guests must complete the registration process to become authenticated customers. Once registered, they transition from guest status to customer status with full platform access. The system does not support guest browsing or guest checkout flows. All user interactions are logged to track platform engagement metrics.

### Guest Access Restrictions

THE system SHALL require user registration before granting access to any platform features.

THE system SHALL not allow guest users to browse products on the platform.

THE system SHALL not allow guest users to view product categories.

THE system SHALL not allow guest users to search for products.

THE system SHALL not allow guest users to view product detail pages.

THE system SHALL redirect unauthenticated users attempting to access product listings to the registration page.

THE system SHALL redirect unauthenticated users attempting to access category pages to the registration page.

THE system SHALL redirect unauthenticated users attempting to access search functionality to the registration page.

WHEN a guest attempts to view any product-related content, THE system SHALL require authentication first.

THE system SHALL not display any product information to unauthenticated users.

THE system SHALL not display category hierarchies to unauthenticated users.

### Guest Transaction Restrictions

THE system SHALL not allow guest users to access the shopping cart.

THE system SHALL not allow guest users to proceed to checkout.

THE system SHALL not allow guest users to process payments.

THE system SHALL not allow guest users to view order history.

THE system SHALL not allow guest users to view order details.

THE system SHALL not allow guest users to track shipments.

THE system SHALL not allow guest users to access shipping address management.

WHEN a guest attempts to access checkout functionality, THE system SHALL require authentication first.

WHEN a guest attempts to view order information, THE system SHALL require authentication first.

THE system SHALL not create or maintain cart data for unauthenticated users.

THE system SHALL not allow payment processing without authenticated user identity.

### Guest Account Feature Restrictions

THE system SHALL not allow guest users to access user profile features.

THE system SHALL not allow guest users to create or view wishlists.

THE system SHALL not allow guest users to write or view product reviews.

THE system SHALL not allow guest users to access notification settings or history.

THE system SHALL not allow guest users to create support tickets.

THE system SHALL not allow guest users to participate in referral programs.

THE system SHALL not allow guest users to access any account management features.

WHEN a guest attempts to access profile-related features, THE system SHALL require authentication first.

WHEN a guest attempts to access wishlist functionality, THE system SHALL require authentication first.

WHEN a guest attempts to access review functionality, THE system SHALL require authentication first.

THE system SHALL not maintain any user-specific data for unauthenticated guests.

## customer Actor

Customers are registered users who can browse products, manage their profiles, and complete purchases. They can create and manage multiple shipping addresses with one set as default. Customers maintain a wishlist of products and an active shopping cart. They can place orders, track shipments, and confirm deliveries. Customers can request cancellations for unpaid items and refunds for delivered items. They can write and edit product reviews after delivery confirmation. Customers can view their complete order history with full transaction details. They can request administrator access if they meet the platform requirements. Account deletion is possible but preserves order history for legal compliance.

### Profile Management

WHEN a customer views their profile, THE system SHALL display their display name and phone number.

WHEN a customer edits their display name, THE system SHALL update and save the new display name.

WHEN a customer edits their phone number, THE system SHALL update and save the new phone number.

WHEN a customer changes their password, THE system SHALL require the current password and a new password.

WHEN a customer deletes their account, THE system SHALL delete their profile information.

WHEN a customer deletes their account, THE system SHALL preserve their order history for legal compliance.

WHEN a customer deletes their account, THE system SHALL preserve their reviews but display them as "deleted user".

IF a customer attempts to log in with deleted account credentials, THE system SHALL reject the login request.

### Address Management

WHEN a customer adds a shipping address, THE system SHALL require recipient name, phone number, street address, city, state/province, postal code, and country.

WHEN a customer views their addresses, THE system SHALL display all saved shipping addresses.

WHEN a customer edits an address, THE system SHALL update and save the modified address information.

WHEN a customer deletes an address, THE system SHALL remove the address from their saved addresses.

WHEN a customer sets a default shipping address, THE system SHALL mark one address as the default for checkout.

WHEN a customer views the checkout page, THE system SHALL display the default shipping address as the preselected option.

WHEN a customer has no default address set, THE system SHALL require them to select or add an address before checkout.

IF a customer attempts to delete their only address, THE system SHALL prevent deletion and display an error message.

IF a customer attempts to delete an address used in pending orders, THE system SHALL prevent deletion and display an error message.

### Account Deletion

WHEN a customer deletes their account, THE system SHALL delete their profile information.

WHEN a customer deletes their account, THE system SHALL preserve their order history for seller records and legal purposes.

WHEN a customer deletes their account, THE system SHALL preserve their reviews but display them as "deleted user".

WHEN a customer deletes their account, THE system SHALL remove their account from the active user list.

IF a customer attempts to log in with deleted account credentials, THE system SHALL reject the login request.

IF a customer has pending orders, THE system SHALL allow account deletion but preserve order data.

IF a customer has pending cancellation or refund requests, THE system SHALL allow account deletion but preserve request data.

WHEN a customer deletes their account, THE system SHALL remove their wishlist items.

WHEN a customer deletes their account, THE system SHALL remove their cart items.

WHEN a customer deletes their account, THE system SHALL remove their saved addresses.

## seller Actor

Sellers are registered users who can list and manage products for sale on the platform. They must receive administrator approval before they can actively sell items. Once approved, sellers can create, edit, and delete their own products and variants. They manage inventory levels and track stock quantities for each variant. Sellers process shipments for orders containing their products and provide tracking information. They can approve or reject customer cancellation and refund requests. Sellers maintain a public profile with shop name, description, and logo. They can view their shop dashboard with sales metrics and pending requests. Account deletion requires no pending orders or active requests. Rejected sellers can submit new registration requests after addressing feedback.

### Seller Registration and Approval

WHEN a seller registers on the platform, THE system SHALL create a seller account with pending approval status.

WHEN a seller submits registration, THE system SHALL require email and password credentials.

WHEN a seller logs in, THE system SHALL authenticate using email and password.

WHEN a seller is in pending approval status, THE system SHALL restrict seller capabilities until approval is granted.

WHEN a seller is approved by an administrator, THE system SHALL enable full seller capabilities.

WHEN a seller is rejected, THE system SHALL display the rejection reason to the seller.

WHEN a seller's account is rejected, THE system SHALL allow them to submit a new registration request.

THE system SHALL allow sellers to view their current approval status (pending, approved, rejected, or suspended).

### Shop Profile Management

WHEN a seller creates their profile, THE system SHALL require a shop name.

WHEN a seller creates their profile, THE system SHALL allow an optional shop description.

WHEN a seller creates their profile, THE system SHALL allow an optional logo image upload.

WHEN a seller edits their shop name, THE system SHALL create a snapshot of the previous profile state.

WHEN a seller edits their shop description, THE system SHALL create a snapshot of the previous profile state.

WHEN a seller edits their logo image, THE system SHALL create a snapshot of the previous profile state.

WHEN a seller's profile is edited, THE system SHALL preserve all snapshots for dispute resolution.

WHEN a customer views a seller profile, THE system SHALL display the current shop name, description, and logo.

WHEN an order is created, THE system SHALL save a snapshot of the seller's profile at that moment.

THE system SHALL preserve the seller's shop name in past order history even after account deletion.

### Account Suspension

WHEN a seller is suspended by an administrator, THE system SHALL hide their products from search and category listings.

WHEN a seller is suspended, THE system SHALL prevent them from performing seller actions.

WHEN a seller is suspended, THE system SHALL allow them to view their account and process existing orders.

WHEN an administrator unsuspends a seller, THE system SHALL restore their full seller capabilities.

IF a seller attempts to perform seller actions while suspended, THE system SHALL deny the action.

THE system SHALL allow administrators to suspend a seller account for policy violations or other reasons.

THE system SHALL allow administrators to unsuspend a seller account when the issue is resolved.

## admin Actor

Administrators oversee platform integrity and manage user activities across the system. They review and approve or reject seller registration requests with justification. Administrators can promote regular administrators to super administrator status. They can suspend or ban user accounts for policy violations. Administrators manage product categories and can force-cancel or force-refund orders. They maintain oversight of all products, orders, and user accounts. Super administrators have elevated privileges to manage other administrators. Regular administrators handle day-to-day moderation tasks. All administrative actions are logged for audit purposes. Administrators can view sensitive data across all user types.

### Seller Approval Workflow

WHEN a seller submits a registration request, THE system SHALL set the seller's approval status to pending.

WHEN an administrator views pending seller registrations, THE system SHALL display the seller's submitted information and reason.

WHEN an administrator approves a seller registration, THE system SHALL change the seller's approval status to approved.

WHEN an administrator rejects a seller registration, THE system SHALL require the administrator to provide a rejection reason.

WHEN an administrator rejects a seller registration, THE system SHALL change the seller's approval status to rejected.

WHEN a seller views their profile, THE system SHALL display their current approval status.

IF a seller's registration is rejected, THE system SHALL display the rejection reason to the seller.

WHEN a rejected seller submits a new registration request, THE system SHALL reset their approval status to pending.

WHEN a seller's approval status is pending, THE system SHALL prevent the seller from creating new products.

WHEN a seller's approval status is approved, THE system SHALL allow the seller to create and manage products.

### Account Suspension

WHEN an administrator suspends a seller account, THE system SHALL change the seller's approval status to suspended.

WHEN a seller is suspended, THE system SHALL hide the seller's products from search results.

WHEN a seller is suspended, THE system SHALL hide the seller's products from category listings.

WHEN a seller is suspended, THE system SHALL prevent the seller from creating new products.

WHEN a seller is suspended, THE system SHALL prevent the seller from editing existing products.

WHEN a seller is suspended, THE system SHALL allow the seller to process existing orders.

WHEN a seller is suspended, THE system SHALL allow the seller to ship order items.

WHEN a seller is suspended, THE system SHALL allow the seller to respond to cancellation requests.

WHEN a seller is suspended, THE system SHALL allow the seller to respond to refund requests.

WHEN an administrator unsuspends a seller account, THE system SHALL change the seller's approval status to approved.

WHEN a seller is unsuspended, THE system SHALL make the seller's products visible in search and category listings again.

### User Banning

WHEN an administrator bans a customer account, THE system SHALL prevent the customer from logging in.

WHEN a banned customer attempts to log in, THE system SHALL reject the authentication request.

WHEN an administrator bans a seller account, THE system SHALL prevent the seller from logging in.

WHEN a banned seller attempts to log in, THE system SHALL reject the authentication request.

WHEN an administrator unbans a customer account, THE system SHALL allow the customer to log in again.

WHEN an administrator unbans a seller account, THE system SHALL allow the seller to log in again.

WHEN a seller is banned, THE system SHALL preserve the seller's existing orders and order history.

WHEN a customer is banned, THE system SHALL preserve the customer's order history.

WHEN an administrator views all customer accounts, THE system SHALL display the ban status of each customer.

WHEN an administrator views all seller accounts, THE system SHALL display the ban status of each seller.

# Authentication Flows

Registration, login, session management, and token policies.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Customer Registration

WHEN a customer registers for the platform, THE system SHALL require an email address.

WHEN a customer registers for the platform, THE system SHALL require a password.

WHEN a customer successfully registers, THE system SHALL create a new User account.

WHEN a customer successfully registers, THE system SHALL create a CustomerProfile associated with the User account.

IF the email address is already registered to another account, THE system SHALL reject the registration request.

IF the password is empty or missing, THE system SHALL reject the registration request.

IF the email format is invalid, THE system SHALL reject the registration request.

WHEN a customer registers, THE system SHALL NOT require additional profile information (display name, phone number) at registration time.

WHEN a customer registers, THE system SHALL allow the customer to immediately access all customer features upon successful registration.

### Customer Login

WHEN a customer logs in, THE system SHALL require an email address.

WHEN a customer logs in, THE system SHALL require a password.

IF the email and password combination is valid, THE system SHALL authenticate the customer.

IF the email is not registered, THE system SHALL reject the login request.

IF the password is incorrect, THE system SHALL reject the login request.

IF the customer account is banned by an administrator, THE system SHALL reject the login request.

IF the customer account has been deleted, THE system SHALL reject the login request.

WHEN a customer successfully logs in, THE system SHALL establish an authenticated session for the customer.

WHEN a customer logs in, THE system SHALL NOT require any additional verification beyond email and password.

### Seller Registration

WHEN a seller registers for the platform, THE system SHALL require an email address.

WHEN a seller registers for the platform, THE system SHALL require a password.

WHEN a seller successfully registers, THE system SHALL create a new User account.

WHEN a seller successfully registers, THE system SHALL create a SellerProfile associated with the User account.

WHEN a seller successfully registers, THE system SHALL set the SellerProfile approval status to "pending".

WHEN a seller successfully registers, THE system SHALL create a SellerApprovalRequest with status "pending".

IF the email address is already registered to another account, THE system SHALL reject the registration request.

IF the password is empty or missing, THE system SHALL reject the registration request.

IF the email format is invalid, THE system SHALL reject the registration request.

WHEN a seller registers, THE system SHALL NOT require shop details (shop name, description, logo) at registration time.

WHEN a seller registers, THE system SHALL allow the seller to log in immediately, but SHALL NOT allow the seller to create products until approved by an administrator.

### Seller Login

WHEN a seller logs in, THE system SHALL require an email address.

WHEN a seller logs in, THE system SHALL require a password.

IF the email and password combination is valid, THE system SHALL authenticate the seller.

IF the email is not registered, THE system SHALL reject the login request.

IF the password is incorrect, THE system SHALL reject the login request.

IF the seller account is banned by an administrator, THE system SHALL reject the login request.

IF the seller account has been deleted, THE system SHALL reject the login request.

IF the seller account is suspended by an administrator, THE system SHALL reject the login request.

WHEN a seller successfully logs in, THE system SHALL establish an authenticated session for the seller.

WHEN a seller with pending approval status logs in, THE system SHALL allow the seller to view their approval status but SHALL NOT allow product management operations.

### Authentication Requirements

THE system SHALL require authentication for all platform features and operations.

THE system SHALL NOT allow guest browsing of products or categories.

THE system SHALL NOT allow guest access to any platform functionality.

THE system SHALL validate all authentication credentials against securely stored password hashes.

THE system SHALL distinguish between customer and seller account types during authentication.

THE system SHALL prevent a single email address from being registered for multiple accounts.

THE system SHALL allow a user to register as either a customer or a seller, but NOT both simultaneously with the same email.

WHEN an unauthenticated user attempts to access any platform feature, THE system SHALL redirect them to the login or registration page.

THE system SHALL require re-authentication for sensitive operations such as password changes and account deletion.

### Registration and Login Error Conditions

IF a registration or login request contains an invalid email format, THE system SHALL display an error message indicating the email format is incorrect.

IF a registration or login request contains a missing email address, THE system SHALL display an error message indicating the email is required.

IF a registration or login request contains a missing password, THE system SHALL display an error message indicating the password is required.

IF a registration request uses an email that is already registered, THE system SHALL display an error message indicating the email is already in use.

IF a login request uses credentials that do not match any account, THE system SHALL display a generic error message without revealing whether the email exists.

IF a login request is made for a banned account, THE system SHALL display an error message indicating the account is banned.

IF a login request is made for a suspended seller account, THE system SHALL display an error message indicating the account is suspended.

IF a login request is made for a deleted account, THE system SHALL display an error message indicating the account does not exist.

IF a seller with pending approval attempts to create a product, THE system SHALL display an error message indicating the account requires administrator approval.

## Session and Token Policy

Define session duration, token refresh, and expiration policies.

### Session Lifecycle Management

WHEN a customer logs in successfully, THE system SHALL create a new session for that user.

WHEN a seller logs in successfully, THE system SHALL create a new session for that user.

WHEN an administrator logs in successfully, THE system SHALL create a new session for that user.

WHILE a session is active, THE system SHALL maintain the user's authenticated state across requests.

WHEN a user logs out, THE system SHALL invalidate their current session.

IF a session has been inactive for 30 minutes, THE system SHALL automatically expire the session.

IF a user changes their password, THE system SHALL invalidate all existing sessions for that user.

IF a user's account is banned by an administrator, THE system SHALL immediately invalidate all sessions for that user.

IF a user's account is suspended by an administrator, THE system SHALL immediately invalidate all sessions for that user.

WHEN a session expires, THE system SHALL require the user to log in again to access protected features.

IF a user attempts to access a protected resource without a valid session, THE system SHALL redirect them to the login page.

THE system SHALL allow only one active session per user at a time; a new login invalidates any existing session.

### Authentication Token Policy

WHEN a user logs in successfully, THE system SHALL issue a JSON Web Token (JWT) for authentication.

WHEN the system issues a JWT, THE system SHALL include the user's unique identifier in the token payload.

WHEN the system issues a JWT, THE system SHALL include the user's role (customer, seller, or administrator) in the token payload.

WHEN the system issues a JWT, THE system SHALL include the token expiration timestamp in the token payload.

WHILE a JWT is valid, THE system SHALL accept it for authenticating user requests.

IF a JWT has expired, THE system SHALL reject the request and require re-authentication.

IF a JWT is malformed or invalid, THE system SHALL reject the request.

IF a JWT signature cannot be verified, THE system SHALL reject the request.

THE system SHALL validate the JWT on every protected API request.

THE system SHALL not expose JWT tokens in URLs or browser history.

IF a user logs out, THE system SHALL add the JWT to a revocation list to prevent its reuse.

THE system SHALL issue JWTs with a maximum validity period of 1 hour.

### Token Refresh Mechanism

WHEN a user logs in successfully, THE system SHALL issue a refresh token alongside the JWT.

WHEN a JWT is about to expire, THE system SHALL allow the user to request a new JWT using the refresh token.

WHEN a refresh token is used, THE system SHALL validate that it has not expired.

WHEN a refresh token is used, THE system SHALL validate that it has not been revoked.

IF a refresh token is valid, THE system SHALL issue a new JWT and a new refresh token.

IF a refresh token has expired, THE system SHALL require the user to log in again.

IF a refresh token has been revoked, THE system SHALL require the user to log in again.

THE system SHALL issue refresh tokens with a maximum validity period of 7 days.

WHEN a user logs out, THE system SHALL revoke their refresh token.

IF a user changes their password, THE system SHALL revoke all their refresh tokens.

IF a user's account is banned or suspended, THE system SHALL revoke all their refresh tokens.

THE system SHALL rotate refresh tokens on each use, invalidating the previous refresh token.

### Session and Token Expiration

THE system SHALL set session timeout to 30 minutes of inactivity.

THE system SHALL set JWT expiration to 1 hour from issuance.

THE system SHALL set refresh token expiration to 7 days from issuance.

WHEN a refresh token expires, THE system SHALL require the user to log in again with their credentials.

WHEN a session expires due to inactivity, THE system SHALL preserve the user's cart contents for 30 days.

WHEN a session expires due to inactivity, THE system SHALL preserve the user's wishlist.

IF a user's session expires while they are on a checkout page, THE system SHALL preserve their cart and redirect to login.

THE system SHALL notify users when their session is about to expire with 5 minutes remaining.

WHEN a user's session expires, THE system SHALL clear all authentication tokens from the client.

IF a seller's session expires while processing an order, THE system SHALL preserve the order state and require re-authentication to continue.

THE system SHALL allow users to extend their session by performing any authenticated action before expiration.

### Multi-Device Session Policy

WHEN a user logs in from a new device or browser, THE system SHALL invalidate any existing session from that user.

IF a user attempts to access the system from multiple devices simultaneously, THE system SHALL only allow the most recent session to remain active.

WHEN a user's session is invalidated due to a new login, THE system SHALL notify the user that their session has been terminated.

THE system SHALL track the device and browser information for each session.

WHEN a user views their account security settings, THE system SHALL display their current active session information.

IF an administrator detects suspicious activity on a user's account, THE system SHALL allow the administrator to force logout all user sessions.

THE system SHALL log all session creation and termination events for audit purposes.

WHEN a seller's session is terminated, THE system SHALL ensure no pending order operations are left in an incomplete state.

# Account Lifecycle

Account state transitions and lifecycle management.

## Account States and Transitions

Define account states (active, suspended, deleted) and valid transitions.

### Account State Definitions

**Account States**

THE system SHALL maintain account states: active, suspended, deleted, and banned.

THE system SHALL set all newly registered customer accounts to "active" state.

THE system SHALL set all newly registered seller accounts to "pending" state until administrator approval.

THE system SHALL set approved seller accounts to "active" state.

THE system SHALL set rejected seller accounts to "rejected" state.

THE system SHALL set administrator accounts to "active" state upon approval.

**State Visibility**

Customers SHALL see their own account state.

Sellers SHALL see their own account state and approval status.

Administrators SHALL see all account states on the platform.

**State-Based Access Control**

WHILE an account is in "active" state, THE system SHALL allow the user to perform all permitted actions.

WHILE an account is in "suspended" state, THE system SHALL restrict the user from creating new products or editing existing products (for sellers).

WHILE an account is in "suspended" state, THE system SHALL allow the user to process existing orders (ship items, respond to cancellation/refund requests).

WHILE an account is in "banned" state, THE system SHALL prevent the user from logging in.

WHILE an account is in "deleted" state, THE system SHALL prevent the user from logging in.

WHILE a seller account is in "pending" state, THE system SHALL prevent the seller from creating products or listing their shop.

WHILE a seller account is in "rejected" state, THE system SHALL prevent the seller from creating products or listing their shop.

**State Transition Logging**

WHEN an account state changes, THE system SHALL create a snapshot recording the previous state, new state, timestamp, and reason for the change.

### Account Lifecycle Transitions

**Customer Account Lifecycle**

WHEN a customer registers, THE system SHALL create a new customer account in "active" state.

WHEN a customer deletes their account, THE system SHALL transition the account to "deleted" state.

WHEN a customer account is deleted, THE system SHALL delete the customer's profile information.

WHEN a customer account is deleted, THE system SHALL preserve all order history and order records.

WHEN a customer account is deleted, THE system SHALL preserve all reviews but display them as "deleted user".

WHEN a customer account is banned by an administrator, THE system SHALL transition the account to "banned" state.

WHEN a customer account is unbanned by an administrator, THE system SHALL transition the account to "active" state.

**Seller Account Lifecycle**

WHEN a seller registers, THE system SHALL create a new seller account in "pending" state.

WHEN an administrator approves a seller registration, THE system SHALL transition the seller account to "active" state.

WHEN an administrator rejects a seller registration, THE system SHALL transition the seller account to "rejected" state.

WHEN a rejected seller submits a new registration request, THE system SHALL transition the seller account to "pending" state.

WHEN an administrator suspends a seller account, THE system SHALL transition the seller account to "suspended" state.

WHEN an administrator unsuspends a seller account, THE system SHALL transition the seller account to "active" state.

WHEN a seller deletes their account, THE system SHALL transition the seller account to "deleted" state.

WHEN a seller account is banned by an administrator, THE system SHALL transition the seller account to "banned" state.

WHEN a seller account is unbanned by an administrator, THE system SHALL transition the seller account to "active" state.

**Administrator Account Lifecycle**

WHEN a user requests to become an administrator, THE system SHALL create a promotion request in "pending" state.

WHEN a super administrator approves a promotion request, THE system SHALL transition the user to "active" administrator state.

WHEN a super administrator rejects a promotion request, THE system SHALL reject the request and maintain the user's current role.

WHEN a super administrator promotes a regular administrator to super administrator, THE system SHALL update the administrator grade to "super".

WHEN a super administrator demotes a super administrator to regular administrator, THE system SHALL update the administrator grade to "regular".

### Account Suspension

**Seller Suspension Rules**

WHEN an administrator suspends a seller account, THE system SHALL hide all of the seller's products from search results.

WHEN an administrator suspends a seller account, THE system SHALL hide all of the seller's products from category listings.

WHEN an administrator suspends a seller account, THE system SHALL prevent the seller's products from being purchased.

WHEN an administrator suspends a seller account, THE system SHALL prevent the seller from creating new products.

WHEN an administrator suspends a seller account, THE system SHALL prevent the seller from editing existing products.

WHILE a seller account is suspended, THE system SHALL allow the seller to view order items for their products.

WHILE a seller account is suspended, THE system SHALL allow the seller to ship order items.

WHILE a seller account is suspended, THE system SHALL allow the seller to respond to cancellation requests.

WHILE a seller account is suspended, THE system SHALL allow the seller to respond to refund requests.

WHEN an administrator unsuspends a seller account, THE system SHALL make all of the seller's products visible again in search and category listings.

WHEN an administrator unsuspends a seller account, THE system SHALL allow the seller to create new products.

WHEN an administrator unsuspends a seller account, THE system SHALL allow the seller to edit existing products.

**Suspension Recording**

WHEN a seller account is suspended, THE system SHALL record the suspension timestamp, administrator who performed the action, and reason for suspension.

WHEN a seller account is unsuspended, THE system SHALL record the unsuspension timestamp and administrator who performed the action.

### Account Deletion

**Customer Account Deletion**

WHEN a customer requests account deletion, THE system SHALL delete the customer's profile information (display name, phone number).

WHEN a customer requests account deletion, THE system SHALL preserve all order records and order history.

WHEN a customer requests account deletion, THE system SHALL preserve all reviews but display the reviewer as "deleted user".

WHEN a customer requests account deletion, THE system SHALL delete all wishlist items.

WHEN a customer requests account deletion, THE system SHALL delete all cart items.

WHEN a customer requests account deletion, THE system SHALL delete all address records.

WHEN a customer account is deleted, THE system SHALL prevent the customer from logging in with the same credentials.

**Seller Account Deletion Conditions**

WHEN a seller requests account deletion, THE system SHALL verify that there are no order items with "paid" or "shipped" status for their products.

WHEN a seller requests account deletion, THE system SHALL verify that there are no pending cancellation requests for their products.

WHEN a seller requests account deletion, THE system SHALL verify that there are no pending refund requests for their products.

IF a seller has pending orders, THE system SHALL reject the account deletion request.

IF a seller has pending cancellation requests, THE system SHALL reject the account deletion request.

IF a seller has pending refund requests, THE system SHALL reject the account deletion request.

**Seller Account Deletion Effects**

WHEN a seller deletes their account, THE system SHALL delete all products from the seller's shop.

WHEN a seller deletes their account, THE system SHALL delete all product variants and inventory records.

WHEN a seller deletes their account, THE system SHALL preserve all order history and order snapshots.

WHEN a seller deletes their account, THE system SHALL preserve the seller's shop name in past order records.

WHEN a seller deletes their account, THE system SHALL preserve all product snapshots.

WHEN a seller account is deleted, THE system SHALL prevent the seller from logging in with the same credentials.

**Deletion Irreversibility**

WHEN an account is deleted, THE system SHALL not allow the account to be restored.

WHEN an account is deleted, THE system SHALL allow the user to register again with the same email as a new account.

### Account Deactivation (Ban)

**Account Banning (Deactivation)**

WHEN an administrator bans a customer account, THE system SHALL transition the account to "banned" state.

WHEN an administrator bans a customer account, THE system SHALL prevent the customer from logging in.

WHEN an administrator bans a seller account, THE system SHALL transition the account to "banned" state.

WHEN an administrator bans a seller account, THE system SHALL prevent the seller from logging in.

WHEN a seller account is banned, THE system SHALL preserve all existing orders and order history.

WHEN a customer account is banned, THE system SHALL preserve all existing orders and order history.

**Unbanning Accounts**

WHEN an administrator unbans a customer account, THE system SHALL transition the account to "active" state.

WHEN an administrator unbans a seller account, THE system SHALL transition the account to "active" state.

WHEN an account is unbanned, THE system SHALL allow the user to log in again.

**Ban Recording**

WHEN an account is banned, THE system SHALL record the ban timestamp, administrator who performed the action, and reason for the ban.

WHEN an account is unbanned, THE system SHALL record the unban timestamp and administrator who performed the action.

**Ban vs Suspension**

WHILE an account is banned, THE system SHALL prevent all login attempts.

WHILE an account is suspended (seller only), THE system SHALL allow login but restrict product management operations.

WHILE an account is suspended (seller only), THE system SHALL allow order processing operations.