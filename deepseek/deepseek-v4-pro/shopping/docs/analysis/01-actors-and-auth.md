**shoppingMall — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is any person visiting the platform who has not yet logged in or created an account. The platform requires registration and authentication to use any features — there is no guest browsing. A guest can view the registration page to sign up as a customer or seller, and they can view the login page to authenticate with existing credentials. A guest cannot browse products, view categories, search, or access any content behind authentication. All attempts to access protected pages or features result in redirection to the login page. The guest actor serves solely as an entry point for account creation and login before transitioning into a registered role.

### Guest Identity and Purpose

A guest is any person visiting the e-commerce platform who has not yet logged in or registered for an account. The guest actor represents the unauthenticated state and serves solely as an entry point for authentication. A guest has no access to the platform's shopping features — all product browsing, searching, category viewing, and any content behind authentication is unavailable to guests. The platform does not support guest browsing in any form. The guest actor exists only to allow visitors to create an account or log in, after which they transition into a registered role (customer, seller, or administrator) with appropriate permissions.

### Accessible Pages for Guests

The only pages available to a guest are the registration page and the login page. A guest can access the customer registration form to sign up with an email and password; a display name is not required at signup and may be set after registration. A guest can also access the seller registration form to sign up with an email and password, though seller accounts require subsequent administrator approval before selling privileges are granted. The login page is accessible to guests, where they enter their email and password to authenticate and gain access to the platform. Access to any other page, feature, or content on the platform is denied while unauthenticated.

### Access Restrictions for Guests

Guests cannot browse products, view product detail pages, or see product listings. Guests cannot browse categories or subcategories. Guests cannot use the search functionality to find products by name, filter by category or price range, or sort results. Guests cannot view seller profiles, including shop names, descriptions, and logos. Guests cannot view reviews or ratings. Guests cannot access or use the wishlist, shopping cart, or checkout features. Guests cannot view orders or any order-related information. Any attempt by a guest to access protected pages or features directly via URL results in denial of access.

### Redirection to Authentication

When a guest attempts to access any page or feature that requires authentication — including product listings, category pages, search results, seller profiles, the wishlist, the shopping cart, checkout, order history, the seller dashboard, or any administrative functions — the system redirects them to the login page. After successful authentication, the user may be directed to the page they originally requested. If a guest attempts to perform an action requiring authentication without navigating through a protected page, that action is rejected and the guest is prompted to log in. The redirection ensures that unauthenticated visitors cannot circumvent the authentication requirement to access protected content.

## customer Actor

A customer is a registered user who has signed up with an email and password. Customers are the primary buyers on the platform. They can browse and search products across all sellers, view product details including images, descriptions, variants, and reviews, and organize products into a personal wishlist. Customers can manage their own profile — including display name and phone number — and maintain multiple shipping addresses with one designated as the default. They can add product variants to a shopping cart, proceed through checkout, select a shipping address, and place orders. After purchase, customers can view their full order history, track shipments, confirm delivery, and write reviews with ratings for delivered items. Customers can request cancellation for paid-but-unshipped items and request refunds for delivered items within 7 days. Additionally, customers can change their password, delete their own account, and submit a request to become an administrator. They cannot access seller-specific features, administrative tools, or other customers' private data.

### Customer Identity

A customer is a registered buyer on the platform. A person becomes a customer by signing up with an email, password, and display name. The customer authenticates by logging in with their email and password.

Registration is mandatory — there is no guest browsing. An unregistered visitor can only access the registration and login pages.

### Customer Permissions

Customers have access to the following areas of the platform:

**Product Discovery:** Browse all categories and subcategories. Search products by name with filtering by category, price range, and stock availability. Sort results by recency or price. View product detail pages including all images, descriptions, variants with prices and stock status, seller information, ratings, and reviews.

**Wishlist:** Add products to a personal wishlist. View the wishlist with pagination. Remove products from the wishlist.

**Profile Management:** Edit their display name and phone number.

**Address Management:** Add, edit, and delete multiple shipping addresses. Designate one address as the default shipping address.

**Shopping:** Add product variants to a shopping cart with specified quantities. View, modify, and remove cart items. Proceed to checkout with a selected shipping address. Place orders after payment.

**Order Management:** View complete order history as a paginated list sorted newest first. View full order details including items, shipping address, and shipments.

**Shipment Tracking:** View carrier name and tracking number for each shipment. Confirm delivery for received shipments.

**Reviews and Ratings:** Write reviews with a rating from 1 to 5 stars and optional text for delivered items — one review per product per order. Edit or delete their own reviews.

**Cancellation and Refunds:** Request cancellation for individual paid items that have not yet shipped. Request refunds for individual delivered items within 7 days of delivery.

**Administrator Request:** Submit a request to become an administrator, including a reason for review by super administrators.

### Customer Access Boundaries

A customer cannot access the following:

**Seller-Specific Features:** Product creation and editing, inventory management, seller dashboard, order fulfillment and shipping, cancellation and refund request review.

**Administrative Features:** Category management, seller approval and suspension, user management including banning and unbanning, administrator promotion and demotion, order oversight including force-cancellation and force-refund of any order, product deletion for policy violations.

**Other Users' Private Data:** Other customers' profiles, order histories, wishlists, cart contents, and addresses. Seller accounts, approval statuses, and dashboards beyond the public seller profile.

A customer can only manage their own profile, addresses, cart, orders, wishlist, and reviews.

### Account Lifecycle

A customer account begins with registration using email and password and continues until the customer deletes their account.

When a customer deletes their account:
- Their profile information (display name, phone number) is removed.
- Their orders and order history are preserved for seller records and legal purposes.
- Reviews they have written are preserved but displayed as authored by a "deleted user."

A customer can also submit a request to become an administrator. This request includes a reason and is reviewed by super administrators, who may approve or reject it. The customer can view the status of their request.

## seller Actor

A seller is a registered user who has signed up with an email and password and operates a shop on the platform. Before they can sell, a seller must be approved by an administrator — new seller registrations enter a pending state until an administrator reviews and approves or rejects them. A rejected seller can view the rejection reason and submit a new registration request. Once approved, sellers can create and manage their own products, including uploading images, defining variants with SKU codes, setting prices, and managing inventory through restocking and adjustments. Sellers can edit their shop profile — shop name, description, and logo — with every edit captured in a snapshot. They can view and process order items for their products, create shipments with tracking information, and respond to cancellation and refund requests from customers. Sellers have access to a dashboard summarizing their shop activity. They can change their password, submit a request to become an administrator, and delete their account only when they have no pending orders or outstanding cancellation and refund requests. When a seller deletes their account, their products are removed from listings but order history and snapshots are preserved. Sellers cannot view or modify other sellers' products, access customer private data beyond what is needed for order fulfillment, or perform administrative actions.

### Seller Identity

A seller is a registered user who operates a shop on the platform. Every seller must sign up with an email and password (see Registration and Login).

Once registered, a seller may also submit a request to become an administrator. A seller retains their seller identity and shop regardless of whether they also hold an administrator role.

A seller's identity is tied to their shop. The shop is represented by a shop profile consisting of a shop name, a shop description, and a logo image.

### Approval Workflow and Access Gating

A new seller registration is not immediately active for selling. The registration enters an approval workflow managed by administrators.

A seller registration exists in one of three states:

- **Pending**: The seller has submitted their registration and awaits administrator review. During this state, the seller can log in but has no access to product creation, shop management, order processing, or the seller dashboard.
- **Approved**: An administrator has approved the registration. The seller gains full access to all seller-specific capabilities: creating and managing products, processing orders, responding to cancellation and refund requests, and viewing the seller dashboard.
- **Rejected**: An administrator has rejected the registration. The seller can view the rejection reason provided by the administrator. A rejected seller cannot sell. The rejected seller may submit a new registration request, which restarts the approval workflow from the pending state.

Sellers can view their current approval status at any time. If rejected, the specific rejection reason is displayed so the seller can understand what to address before resubmitting.

### Product and Inventory Management Scope

An approved seller can create and manage their own products. Each product belongs exclusively to the seller who created it. No other seller can view, modify, or delete another seller's products.

Within their product scope, a seller can:

- Create products with a name, description, category, and base price
- Upload, reorder, and delete product images
- Create, edit, and delete variants (SKUs) for each product, each with a unique SKU code, option values, and an optional price override
- Manage inventory at the variant level by recording restocks (additions) and adjustments or losses (subtractions), each with a quantity and reason

A product must have at least one variant to be purchasable. Products with no variants remain visible but are shown as unavailable.

Deletion of a product or variant is blocked when there are pending order items (paid or shipped status), pending cancellation requests, or pending refund requests associated with it. When a product is deleted, all its variants and inventory records are also removed from active listings, though historical snapshots are preserved.

### Shop Profile Scope

Each seller has a shop profile consisting of a shop name, a shop description, and a logo image. The seller can edit any of these fields at any time.

Every edit to the shop profile creates a snapshot that preserves the previous values. Snapshots are immutable and cannot be deleted by the seller. Both the seller and administrators can view these snapshots.

Customers can view the seller's shop profile, including the shop name and logo, when browsing products and viewing product detail pages.

### Order and Shipment Processing Scope

Sellers can view order items that belong to their own products, limited to items requiring shipment (items with paid status that have not yet been shipped).

When ready to ship, the seller selects one or more of their order items and creates a shipment. The seller provides carrier information — a carrier name and a tracking number — for the shipment. All items included in the same shipment share the same tracking information. When the shipment is created, all included items change to shipped status.

Sellers can create multiple shipments for the same order if they choose to ship items separately. Different sellers always ship separately — a seller cannot include another seller's order items in their shipment.

A seller has no access to order items belonging to other sellers. A seller's view is scoped exclusively to their own products.

### Customer Request Response Scope

Sellers receive and respond to two types of customer requests, limited to requests for their own products:

- **Cancellation Requests**: A customer may request cancellation of a paid item that has not yet shipped. The seller reviews the request and its reason, and can either approve or reject it. When the seller responds, a snapshot of the request state is created.
- **Refund Requests**: A customer may request a refund for a delivered item within 7 days of delivery. The seller reviews the request and its reason, and can either approve or reject it. When the seller responds, a snapshot of the request state is created.

Sellers can only view and act on requests directed at their own products. They have no access to requests for other sellers' products.

### Seller Dashboard Access

Approved sellers have access to a dashboard that summarizes their shop activity. The dashboard displays:

- The total number of products in their shop
- The total number of order items for their products
- The number of pending cancellation requests
- The number of pending refund requests

The dashboard allows sellers to view their order items filtered by status. From the dashboard, sellers can navigate to detailed views of their products, order items, and pending requests.

The dashboard is visible only to approved sellers and only displays data for the seller's own shop.

### Account Deletion Constraints

A seller may delete their account only when all of the following conditions are met:

- There are no pending order items (items with paid or shipped status) for any of their products
- There are no pending cancellation requests for any of their products
- There are no pending refund requests for any of their products

If any condition is not satisfied, the deletion request is rejected and the seller is informed of the outstanding items preventing deletion.

When a seller's account is deleted:

- Their products are removed from active listings and no longer appear in search results or category browsing
- Their shop profile information is deleted
- Order history and snapshots for their products are preserved for seller records and legal purposes
- The seller's shop name as it appeared at the time of purchase is preserved in past orders

## admin Actor

An administrator is a user who has been approved through the administrator request process. There are two grades of administrators: regular administrators and super administrators. Regular administrators can manage categories — creating, editing, and deleting them including one level of subcategory nesting. They can view and process pending seller approvals, approving or rejecting registrations with required rejection reasons. They can suspend and unsuspend seller accounts, which hides or restores the seller's products from listings. Administrators have oversight over all products on the platform and can delete any product for policy violations. They can view all orders, force-cancel individual items or entire orders, and force-refund items or entire orders. They can also view all customer and seller accounts, and ban or unban users — banned users cannot log in. Super administrators have all regular administrator permissions plus the ability to view pending administrator requests, approve or reject them, promote regular administrators to super administrator, and demote other super administrators to regular administrator. A super administrator cannot demote themselves. Administrators cannot act as sellers for their own products, modify customer profiles or addresses directly, or perform actions outside their oversight scope.

### Administrator Definition and Grades

An administrator is a user who has been approved through the administrator request process. Administrators are authenticated users with elevated privileges for platform oversight and management.

There are two grades of administrators:

- **Regular Administrator**: A user who has been approved as an administrator. Regular administrators have broad oversight over the platform including seller management, category management, product oversight, order oversight, and user management.
- **Super Administrator**: A regular administrator who has been promoted. Super administrators have all regular administrator permissions plus the ability to manage administrator requests and manage the grades of other administrators.

Both grades are distinct from customers and sellers. An administrator retains their original account type (customer or seller) for their personal activities on the platform, but exercises administrative powers through their administrator role.

### Becoming an Administrator

Any authenticated user — whether currently a customer or a seller — may submit a request to become an administrator. The request must include a reason explaining why the user wishes to become an administrator.

Super administrators can view the list of all pending administrator requests. For each request, a super administrator may approve or reject it. When a request is approved, the requesting user becomes a regular administrator immediately. When a request is rejected, the requesting user remains in their current role and may submit a new request.

### Administrator Permissions and Boundaries

Both regular and super administrators share the platform-wide oversight and management permissions described below. Permissions unique to super administrators are described in the next section.

### Category Management
Administrators can create categories and subcategories, with subcategory nesting limited to one level. They can edit category names and descriptions. Administrators can also delete categories; when a category is deleted, products that belonged to it become uncategorized.

### Seller Approval Processing
Administrators can view the list of pending seller registration approvals. For each pending registration, an administrator may approve it — enabling the seller to begin selling — or reject it. When rejecting, the administrator must provide a reason. The seller can view the rejection reason and may submit a new registration request.

### Seller Suspension and Unsuspension
Administrators can suspend a seller account. When a seller is suspended, their products are hidden from search results and category listings, and cannot be purchased. The suspended seller can still process existing orders — shipping items and responding to cancellation and refund requests — but cannot create new products or edit existing products. Administrators can also unsuspend a seller, which restores the seller's products to visibility.

### Product Oversight
Administrators can view all products on the platform, regardless of which seller owns them. They can view snapshots of any product for oversight and dispute resolution purposes. Administrators can delete any product if it violates platform policies; deletion removes the product from listings and search.

### Order Oversight
Administrators can view all orders on the platform. They can force-cancel individual order items or entire orders — this processes a refund to the customer and restores stock quantities. They can also force-refund individual order items or entire orders, similarly restoring stock.

### User Account Management
Administrators can view all customer accounts and all seller accounts on the platform. They can ban any customer or seller. A banned user cannot log in to the platform. Administrators can also unban users, restoring their ability to log in.

### Access Boundaries
Administrators cannot act as sellers for their own products through their administrative role. They cannot directly modify customer profiles or shipping addresses. Their role is limited to oversight, enforcement, and platform management — not direct account manipulation of individual users beyond banning and unbanning.

### Super Administrator Exclusive Privileges

In addition to all regular administrator permissions, super administrators have exclusive privileges for managing the administrator hierarchy.

### Administrator Promotion and Demotion
A super administrator can promote a regular administrator to super administrator. A super administrator can also demote another super administrator to regular administrator.

### Self-Demotion Prohibited
A super administrator cannot demote themselves. This ensures that at least one super administrator always exists on the platform.

### Administrator Request Management
Super administrators manage the administrator request pipeline: viewing all pending requests from users who wish to become administrators, approving requests to grant regular administrator status, and rejecting requests.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Customer Registration

### Customer Registration

A visitor can register as a customer by providing an email address and a password.
The system creates a customer account bound to the provided email.

Registration requires:
- An email address that is not already associated with any existing account (customer or seller)
- A password

Registration does NOT require a display name or phone number. A customer profile is created automatically with empty display name and phone number, which the customer can fill in later.

If the email is already in use, the registration is rejected.
If the email or password is missing, the registration is rejected.

Upon successful registration, the customer is authenticated and can immediately access all customer-facing features of the platform.


### Seller Registration

### Seller Registration

A visitor can register as a seller by providing an email address and a password.
The system creates a seller account bound to the provided email.

Registration requires:
- An email address that is not already associated with any existing account (customer or seller)
- A password

Registration does NOT require a shop name, shop description, or logo image. A seller profile is created automatically with empty shop name, shop description, and logo image, which the seller can fill in later.

If the email is already in use, the registration is rejected.
If the email or password is missing, the registration is rejected.

Upon successful registration, the seller account is created but placed in a pending approval state. The seller cannot list products, create variants, or sell until an administrator approves the account.

**Seller Approval Flow**

The seller can view their own approval status at any time. The status can be:
- **Pending**: The registration has not yet been reviewed by an administrator
- **Approved**: An administrator has approved the account; the seller can now sell products
- **Rejected**: An administrator has rejected the registration

If rejected, the seller can view the rejection reason provided by the administrator. A rejected seller may submit a new registration request to re-enter the approval process.


### Login

### Login

Registered customers and sellers log in using their email address and password.

Upon successful authentication, the system establishes a session and the user gains access to features based on their role.

If the email does not match any registered account, the login is rejected.
If the password is incorrect, the login is rejected.

**Login Restrictions**

- A banned customer cannot log in. The login request is rejected for banned customers.
- A banned seller cannot log in. The login request is rejected for banned sellers.
- A seller with a deleted account cannot log in.
- A customer with a deleted account cannot log in.

**Platform Access**

This platform does not support guest browsing. Visitors who are not authenticated can only access the registration page and the login page. All other features require authentication.


## Session and Logout

Define session behavior and logout from a user perspective.

### Session Establishment

When a user successfully logs in with valid email and password, a session is established. The session identifies the user and their actor type — customer, seller, or administrator — for the duration of their interaction with the platform.

A session begins immediately after successful authentication and persists until the user explicitly logs out or the session is terminated by the system. While a session is active, the user is treated as authenticated and can access features permitted to their actor type.

If a user is banned, any new login attempt is rejected and their existing active session is terminated immediately. The banned user can no longer interact with the platform until the ban is lifted.

### Session Behavior

During an active session, the system recognizes the authenticated user and applies the permissions defined for their actor type. The session carries the user's identity and actor type across all interactions without requiring re-authentication for each request.

If a user's actor type changes during an active session — for example, a customer becomes an administrator via an approved admin request — the session reflects the updated actor type and associated permissions immediately.

If a seller is suspended while logged in, they are not forcibly logged out but their permissions are restricted during the active session: they cannot create or edit products, and their products are hidden from listings. They retain the ability to process existing orders and respond to cancellation and refund requests. Upon their next login attempt, the suspended state is enforced from the start of the session.

### Logout

A user can explicitly end their session by logging out. Upon logout, the session is immediately terminated. The user returns to the unauthenticated state and can only access features available to guests — specifically, the registration page and the login page.

After logout, any attempt to access authenticated features requires a new login with valid credentials. The previous session cannot be resumed.

### Account Security

When a user changes their password, all existing sessions for that account — including the session from which the password change was made — are terminated. The user must log in again with the new password to continue using the platform.

When a user deletes their account, any active session for that account is terminated immediately. The deleted account can no longer log in.

Banned users cannot establish new sessions. Any attempt to log in with a banned account is rejected regardless of whether the credentials are valid.

When a seller is rejected during the approval process, they retain their account and can log in to view the rejection reason and submit a new registration request. Their session is not terminated upon rejection.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Customer Account Creation

Any visitor may create a customer account by providing an email address and a password. Both fields are required. The email address must not already be registered on the platform. Providing a display name during registration is optional; the customer may set or update it later through profile settings.

Upon successful registration, the customer is authenticated and may immediately access all customer-facing features including product browsing, search, wishlist management, cart, and checkout. There is no approval step for customer accounts.

The platform does not allow guest browsing. All features require a registered account to access.

### Seller Account Creation

Any visitor may register a seller account by providing an email address and a password. Both fields are required. The email address must not already be registered on the platform. Providing a shop name during registration is optional; the seller may set or update it later through profile settings after approval.

After registration, the seller account enters a pending approval state. Until approved by an administrator, the seller cannot create products, manage inventory, or process orders. The seller may log in and view their approval status (pending, approved, or rejected).

If rejected, the seller can view the rejection reason provided by the administrator and may submit a new registration request for reconsideration.

Once approved, the seller gains full access to seller features including product management, inventory management, order processing, and dashboard access.

### Customer Account Deletion

A customer may delete their own account at any time. Account deletion is permanent.

When a customer deletes their account:
- Their profile information (display name, phone number) is deleted.
- All their shipping addresses are deleted.
- Their order history and all associated order records remain preserved for seller records and legal compliance.
- Their reviews remain visible on product pages but are shown as authored by a "deleted user" rather than displaying the customer's display name.

Deleted accounts cannot be restored or logged into. Any re-registration with the same email address creates a new, separate account with no connection to the previous one.

### Seller Account Deletion

A seller may request deletion of their own account, but deletion is only allowed when certain conditions are met.

The seller account cannot be deleted if:
- Any order item belonging to the seller is in "paid" or "shipped" status (meaning orders are still being processed or in transit).
- Any cancellation request for the seller's items is still pending a response.
- Any refund request for the seller's items is still pending a response.

When the above conditions are all clear and deletion proceeds:
- The seller's products are removed from listings and are no longer searchable or purchasable.
- Product variants and inventory records are deleted.
- The seller's profile (shop name, description, logo) is deleted.
- Order history and all associated snapshots are preserved for buyer records and legal compliance.
- The seller's shop name as recorded in past order items (via snapshots) remains visible.

Once deleted, the seller account cannot be restored. A new seller registration with the same email address creates a separate account with no connection to the previous one.

### Password Change

Both customers and sellers may change their password from within their account settings.

To change a password, the user must provide their current password for verification and then enter the new password. The new password must be provided and accepted before the change takes effect. The current password is required to prevent unauthorized password changes.

Password changes apply immediately and take effect for all subsequent logins.