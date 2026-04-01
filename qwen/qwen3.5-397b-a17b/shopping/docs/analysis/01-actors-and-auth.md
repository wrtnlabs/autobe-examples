**shoppingMall — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## customer Actor

Customers are registered users who browse and purchase products on the platform. Every customer must create an account with email and password before accessing any features. Customers can manage their personal profile including display name and phone number. They can add, edit, and delete multiple shipping addresses with one set as default. Customers can search and browse products across all sellers and filter by category, price, and stock availability. They can maintain a wishlist of favorite products and manage a shopping cart with specific variants. Customers can place orders, view order history, and track shipments. They can request cancellations for items not yet shipped and request refunds for delivered items within the allowed period. Customers can write, edit, and delete reviews for products they have purchased and received. They can confirm delivery of shipments or rely on automatic delivery confirmation after the specified period.

### Customer Identity and Role

The customer is a registered member actor in the shoppingMall platform. Customers are end-users who browse products, make purchases, and interact with the platform's commerce features.

Customer accounts require registration with email and password. Guest access is not supported; all platform features require authenticated customer accounts.

Each customer account is uniquely identified by their email address. Customers maintain a personal profile with display name and phone number.

Customers can delete their accounts. Upon account deletion, profile information is removed while order history and reviews are preserved for seller records and legal compliance.

---

**Customer Authentication:**
- Customers authenticate using email and password
- Authentication grants access to customer-level features
- Customers can change their password after authentication

### Customer Permission Matrix

The following table defines the high-level permissions and capabilities available to the customer actor:

| Capability Area | Permission |
|-----------------|------------|
| Profile Management | Manage own profile information |
| Address Management | Manage own shipping addresses |
| Product Access | Browse and search products |
| Wishlist Management | Manage own wishlist |
| Shopping Cart Management | Manage own shopping cart |
| Order Management | Place and view own orders |
| Cancellation Requests | Request cancellation for own order items |
| Refund Requests | Request refund for own order items |
| Review Management | Manage own product reviews |
| Delivery Confirmation | Confirm delivery for own shipments |

**Permission Boundaries:**
- Customers can only access and modify their own data (profiles, addresses, orders, reviews)
- Customers cannot access seller management features
- Customers cannot access administrator or superAdministrator features
- Customers cannot modify other customers' data or reviews

## seller Actor

Sellers are registered users who list and sell products on the platform. Seller accounts require administrator approval before any selling activities can begin. Sellers can view their approval status and receive rejection reasons if not approved. Rejected sellers can submit new registration requests for reconsideration. Approved sellers can create and manage their shop profile with name, description, and logo. They can create, edit, and delete their own products subject to order and request restrictions. Sellers can manage product images and organize multiple variants with different options and prices. They can manage inventory levels through restocking and adjustments for each variant. Sellers can view and process order items for their products including shipping with tracking information. They can approve or reject customer cancellation and refund requests for their items. Sellers can view a dashboard summary of their shop performance and pending requests. Account deletion is restricted when pending orders or requests exist.

### Seller Identity

A seller is a registered member who operates a shop on the platform. Sellers have the same base account attributes as customers (email, password) plus shop-specific attributes (shop name, shop description, logo). Sellers are distinct from customers in their system role and permissions. A seller account requires administrator approval before the seller can engage in any selling activities. The seller identity persists throughout the account lifecycle unless the account is deleted by the seller or suspended by an administrator.

### Seller Permission Matrix

| Capability Area | Pre-Approval | Post-Approval | Suspended |
|-----------------|--------------|---------------|-----------|
| View approval status | Yes | Yes | Yes |
| Shop profile management | No | Yes | No |
| Product and variant management | No | Yes | No |
| Inventory management | No | Yes | No |
| Order fulfillment | No | Yes | Yes |
| Cancellation and refund response | No | Yes | Yes |
| Account deletion | No | Conditional | No |

Note: Conditional account deletion requires no pending orders or requests. Suspended sellers retain limited order fulfillment and request response capabilities but cannot manage products or shop profile.

## administrator Actor

Administrators are users granted elevated permissions to manage platform operations and oversee user activities. Administrators can be promoted from existing customer or seller accounts through a request and approval process. They can view and manage pending seller approval requests with approve or reject decisions. Administrators can suspend or unsuspend seller accounts affecting product visibility and purchasing ability. They can create, edit, and delete categories and subcategories for product organization. Administrators can view all products on the platform including snapshots of any product. They can delete any product for policy violations regardless of ownership. Administrators can view all orders on the platform and monitor order statuses. They can force-cancel or force-refund individual items or entire orders when necessary. Administrators can view all customer and seller accounts on the platform. They can ban or unban customer and seller accounts restricting login access. Regular administrators cannot promote or demote other administrators.

### Administrator Identity and Role

The administrator is a platform management actor responsible for overseeing marketplace operations and enforcing platform policies. Administrators are internal platform operators who manage day-to-day marketplace governance.

Administrators are promoted from existing customer or seller accounts through a formal approval process managed by super administrators. Once promoted, administrators operate within boundaries set by super administrators.

Administrators cannot modify administrator grade assignments, platform-wide configurations, or review administrator promotion requests. These capabilities are reserved for super administrators only.

### Administrator Permission Matrix

Administrators have high-level access to the following capability areas on the shoppingMall platform:

| Permission Area | Administrator Access |
|-----------------|----------------------|
| Seller Account Management | Review seller registration requests, manage seller account status |
| Category Management | Manage product categories |
| Product Oversight | View and manage products across the platform |
| Order Management | View and manage orders across the platform |
| User Account Management | View and manage customer and seller accounts |
| Promotion Requests | Cannot review administrator promotion requests |
| Grade Management | Cannot manage administrator grades |

Administrators do not have access to super administrator functions including platform configuration and administrator grade management.

## superAdministrator Actor

Super administrators hold the highest level of permissions on the platform with all administrator capabilities plus additional authority. They can view and respond to administrator promotion requests from users. Super administrators can approve or reject requests for users to become administrators. They can promote regular administrators to super administrator grade. Super administrators can demote other super administrators to regular administrator grade. They cannot demote themselves from super administrator status. Super administrators have full access to all platform management features including seller approvals and suspensions. They can manage categories, view and delete any product, and oversee all orders. Super administrators can force-cancel or force-refund any items or orders on the platform. They have complete visibility into all user accounts and can ban or unban any user. All administrator permissions are inherited by super administrators with added grade management capabilities.

### Super Administrator Identity

The superAdministrator is the highest-level administrative actor in the shoppingMall platform. Super administrators have ultimate authority over all platform operations and system management. Super administrators occupy the top tier of the administrative hierarchy, with oversight capabilities extending across all platform functions and all other actor types.

### Permission Scope

Super administrators possess comprehensive access across all platform capability areas.

| Capability Area | Access Level |
|----------------|--------------|
| User Account Management | Full |
| Seller Management | Full |
| Product Catalog Management | Full |
| Order Management | Full |
| Content Management | Full |
| Administrative Oversight | Full |

Super administrators have unrestricted access to all administrative functions within the shoppingMall platform. This permission scope encompasses all entities and operations available to regular administrators, with additional platform-wide oversight capabilities.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Customer Registration

Customers can register for an account by providing an email address and password.

The email address must be unique across all customer and seller accounts on the platform.

Upon successful registration, the customer account is immediately active and can access all customer features.

The customer is automatically logged in after successful registration.

If the email address is already registered, the registration request is rejected.

If the email format is invalid, the registration request is rejected.

If the password does not meet security requirements, the registration request is rejected.

### Seller Registration

Sellers can register for a seller account by providing an email address and password.

The email address must be unique across all customer and seller accounts on the platform.

Upon registration, the seller account is created but cannot sell until approved by an administrator.

The seller can view their approval status at any time (pending, approved, or rejected).

If the registration is rejected, the seller can view the rejection reason provided by the administrator.

Rejected sellers can submit a new registration request after addressing the rejection reason.

If the email address is already registered, the registration request is rejected.

If the email format is invalid, the registration request is rejected.

If the password does not meet security requirements, the registration request is rejected.

### User Login

Customers can log in using their registered email address and password.

Sellers can log in using their registered email address and password.

Administrators can log in using their registered email address and password.

Upon successful login, the user is granted access to features based on their actor type and permissions.

If the email address is not registered, the login request is rejected.

If the password does not match the registered password, the login request is rejected.

If the account is banned by an administrator, the login request is rejected.

If the seller account is suspended by an administrator, the seller can log in but cannot create or edit products.

### Authentication Requirements

All users must authenticate before accessing any platform features (no guest browsing is allowed).

Authentication is performed using email and password credentials.

Each user session requires valid authentication credentials.

When authentication fails, the user is notified of the failure without revealing specific security details.

WHEN a user attempts to access a protected resource without authentication, THEN the system SHALL redirect to the login page.

WHILE a user is not authenticated, the system SHALL restrict access to all platform features except the registration and login pages.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

Users must be logged in to access any platform features. There is no guest browsing.

When a user logs in successfully, a session is created that persists while the user browses the platform. The session allows the user to access their account-specific features such as viewing their profile, managing their cart, placing orders, and accessing their order history.

If a user attempts to access a feature that requires authentication while not logged in, the request is rejected and the user is prompted to log in.

Each user can only have one active session at a time. When a user logs in from a new device or browser, any existing session is terminated.

### Logout

Users can log out from their account at any time. Logging out ends the current session immediately.

After logout, the user cannot access any account-specific features until they log in again. The user is returned to the login page.

All pending actions that require authentication are cancelled upon logout. The user's cart contents are preserved and will be available when they log in again.

### Account Security

Users can change their password at any time from their account settings. The user must provide their current password and a new password to complete the change.

If the current password provided is incorrect, the password change request is rejected.

Users are responsible for keeping their password confidential. If a user suspects their account has been compromised, they should change their password immediately.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Customer Account Creation and Deletion

Customers can create an account by providing an email address and password. The email address must be unique across all customer and seller accounts.

Customers can delete their account at any time. When a customer account is deleted:
- The customer's profile information (display name and phone number) is deleted
- All shipping addresses associated with the customer are deleted
- The customer's order history is preserved for seller records and legal purposes
- The customer's reviews are preserved but displayed as authored by "deleted user"
- The customer's wishlist is deleted
- The customer's shopping cart is deleted

WHEN a customer requests account deletion, THE system SHALL delete all personal profile data while preserving order and review records.

### Seller Account Creation and Deletion

Sellers can create an account by providing an email address and password. The email address must be unique across all customer and seller accounts.

Seller accounts require administrator approval before the seller can list products or make sales. Sellers can view their approval status, which can be pending, approved, or rejected. If rejected, sellers can view the rejection reason and submit a new registration request.

Sellers can delete their account only if all of the following conditions are met:
- The seller has no order items with status "paid" or "shipped"
- The seller has no pending cancellation requests
- The seller has no pending refund requests

WHEN a seller requests account deletion and has pending orders or requests, THE system SHALL reject the deletion request.

When a seller account is deleted:
- All products owned by the seller are deleted from listings and no longer appear in search or category browsing
- All product variants and inventory records are deleted
- Order history and snapshots are preserved for legal and dispute resolution purposes
- The seller's shop name in past orders is preserved and displayed to customers
- The seller's shop logo and description in past orders are preserved via snapshots

IF a seller attempts to delete their account while having pending order items, THEN THE system SHALL prevent the deletion.

### Password Change

Customers and sellers can change their password at any time while logged in.

When changing a password, the user must provide their current password and a new password. The new password must meet the platform's password requirements.

WHEN a user requests a password change, THE system SHALL validate the current password before accepting the new password.

IF the current password provided is incorrect, THEN THE system SHALL reject the password change request.