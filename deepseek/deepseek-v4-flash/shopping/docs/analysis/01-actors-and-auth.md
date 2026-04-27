**eCommerceMall — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is any user who has not logged into the platform. The platform requires registration to use any features, so there is no guest browsing available. Guests cannot view products, search the catalog, browse categories, or access any pages within the shopping mall. A guest is limited to the authentication pages only — the sign-up page and the login page. Guests cannot add items to a cart, view product details, or see seller profiles. Without an account, a guest has no access to customer features such as order history, wishlist, or reviews. A guest also has no access to seller features such as the dashboard, product management, or order management. The only action a guest can perform is to register a new account or log in to an existing one. Once logged in, the user transitions to their appropriate actor role (customer, seller, or administrator). From a permissions standpoint, the guest role has the lowest access boundary — effectively read-only access to the authentication interface only.

### Actor Definition

A guest is any unauthenticated user who has not logged into the platform. The guest role represents the lowest privilege level in the system. No anonymous or unauthenticated access is permitted beyond the authentication interface. All platform features are locked behind a login requirement.

### Authentication Boundary

The guest actor is restricted to the authentication boundary — the only accessible pages are the login page and the sign-up (registration) page. These serve as the platform's entry gate. Any attempt by a guest to access a URL or resource outside the authentication boundary (product pages, search, category listings, seller profiles, cart, orders, reviews, dashboards) is rejected and the guest is redirected to the login page.

### No Guest Browsing (Zero Feature Access)

The platform requires registration to use any features. A guest cannot:
- View product listings, search results, or category pages
- View product detail pages or product images
- View seller profiles or shop information
- Add items to a shopping cart
- Access a wishlist
- Place orders or view order history
- Write, edit, or delete reviews
- Access any seller dashboard or administrative panel
- View any customer account pages

In summary, a guest has zero permissions across all domains — products, categories, orders, reviews, addresses, cart, wishlist, seller profiles, and administration.

### Guest-to-Actor Transition

A guest transitions out of the guest role upon successful authentication. The transition works as follows:

- **Registration**: A guest submits their email and password on the sign-up page. Upon successful registration, the guest becomes a **customer** actor and is logged in automatically.
- **Login**: An existing customer, seller (provided the seller account is not suspended), or administrator logs in with their email and password on the login page. If a seller's account is suspended, the login attempt is rejected and the user remains in the guest role. Upon successful authentication, the guest role is replaced by the authenticated actor's role.

After transitioning, the user has all permissions associated with their new role and can access platform features accordingly. Logging out returns the user to the guest role.

## customer Actor

A customer is a registered user who uses the platform to browse and purchase products. Customers sign up using an email address and password, and they log in with the same credentials. Once authenticated, a customer can view products, search the catalog, browse categories, and access product detail pages. Customers have access to personal features including their profile (display name and phone number), address management (multiple shipping addresses with a default), wishlist, and shopping cart. Customers can place orders, view their order history, track shipments, confirm delivery, request cancellations for paid items, and request refunds for delivered items within the 7-day window. Customers can also write and manage reviews for products they have purchased and delivered. Each customer's data is private to that customer — other customers cannot see another customer's profile, orders, cart, or wishlist. A customer cannot create products, manage inventory, or process shipments — those actions are reserved for sellers. Customers who wish to sell must register separately as a seller. Administrators may ban a customer, which prevents that customer from logging in.

### Customer Definition

The customer is a registered buyer who uses the platform to browse and purchase products. Only registered customers can access the platform's features; there is no guest browsing. Customers authenticate using an email address and password combination (see Registration and Login for authentication details). A customer's identity is established at registration and persists across all sessions until account deletion or a ban is applied.

### Personal Data and Privacy

Each customer has a personal profile containing their display name and phone number. Customers can view and edit their own profile information at any time. Customers can manage multiple shipping addresses, including adding new addresses, editing existing ones, deleting addresses, and setting one address as the default shipping address.

A customer's personal data — including their profile, addresses, orders, wishlist, cart, and reviews — is private to that customer. No other customer can view another customer's data. Sellers and administrators may view order-related data only as needed for order fulfillment and platform management.

### Commerce Capabilities

Customers can place orders, view their full order history sorted by newest first, track shipments, and confirm delivery of received shipments. Customers have the right to request cancellation of individual order items that are in "paid" status (not yet shipped). Customers have the right to request refunds for individual delivered items within 7 days of that item's delivery. Cancellation and refund requests must include a reason submitted by the customer.

Customers own a personal wishlist where they can add and remove products. When a product is deleted by its seller, it is automatically removed from all wishlists. Customers own a personal shopping cart where they can add product variants, specify quantities, and adjust quantities before checkout. Unavailable or out-of-stock items are marked accordingly in the cart.

Customers can write reviews for products they have purchased and received, provided the item's status is "delivered." Each review consists of a rating from 1 to 5 stars and optional text content. Customers can edit and delete their own reviews. Only one review per product per order is permitted.

### Restrictions and Account Boundaries

Customers cannot create products, manage inventory, process shipments, or perform any seller-specific operations. Customers who wish to sell on the platform must register separately as a seller (see seller Actor).

An administrator may ban a customer. A banned customer's account access is revoked until or unless they are unbanned by an administrator. Banned customers retain their data within the system.

## seller Actor

A seller is a registered user who sells products on the platform. Sellers sign up with an email and password, but their account requires administrator approval before they can begin selling. Sellers can view their approval status — pending, approved, or rejected — and if rejected, they can see the reason and submit a new request. Once approved, a seller has access to a dashboard showing total products, total order items, and pending cancellation and refund request counts. Sellers can create, edit, and delete their own products, manage product images, and configure product variants with SKU codes, option values, prices, and stock quantities. Sellers manage inventory by restocking or adjusting stock. Sellers view and process order items for their products — they create shipments with tracking information and respond to cancellation and refund requests from customers. Sellers can edit their own shop profile (shop name, description, logo). Each seller's data is isolated — a seller can only see and manage their own products, orders, and inventory. Sellers cannot view other sellers' dashboards or products beyond what customers can see in search results. A seller may delete their account only if they have no pending orders and no pending cancellation or refund requests. Administrators can suspend a seller, hiding their products from search and preventing new product creation while allowing existing order processing.

### Seller Actor Definition

A seller is a registered user who operates a shop on the e-commerce platform. Sellers can create and sell products, manage inventory, process orders, create shipments, and respond to customer cancellation and refund requests. Each seller account represents one shop with a shop name, shop description, and logo image. A seller must be approved by an administrator before accessing any selling features.

### Seller Registration and Approval

Sellers register using email and password (registration process defined in [Registration and Login]). Upon registration, the seller account is assigned a "pending" approval status. Administrator approval is required before a seller can access any selling features.

The seller can view their current approval status at any time. The possible statuses are:
- **Pending**: Awaiting administrator review
- **Approved**: Registration accepted; seller can use all selling features
- **Rejected**: Registration declined; the rejection reason provided by the administrator is visible to the seller

If rejected, the seller may submit a new registration request for reconsideration.

### Product and Inventory Management

An approved seller has permission to perform the following within their own shop:

**Products**
- Create new products with name, description, category, and base price
- Edit their own products (each edit creates a snapshot)
- Delete their own products, provided there are no pending order items or pending cancellation/refund requests for any variant of the product
- Upload, reorder, and delete product images
- View snapshots of their own products

**Variants (SKUs)**
- Create, edit, and delete product variants with SKU code, option values, and price
- Delete a variant only when there are no pending order items or pending cancellation/refund requests for that variant
- View snapshots of their own variants

**Inventory**
- Restock inventory with a quantity and reason
- Adjust inventory downward with a quantity and reason
- View the full inventory history of each variant

### Order and Shipping Management

An approved seller has permission to perform the following for order items belonging to their products:

**Order Item Processing**
- View a list of all order items for their products
- Filter order items by status (paid, shipped, delivered, cancelled, refunded)
- View customer shipping addresses for orders containing their products

**Shipment Creation**
- Create shipments containing one or more of their order items
- Enter tracking information including carrier name and tracking number
- When a shipment is created, all items in it change to "shipped" status

**Cancellation Requests**
- View pending cancellation requests for their order items
- Approve or reject cancellation requests
- Approved cancellations refund the customer and restore stock

**Refund Requests**
- View pending refund requests for their delivered order items
- Approve or reject refund requests
- Approved refunds refund the customer and restore stock

### Shop Profile and Dashboard

An approved seller has permission to:

**Shop Profile**
- Edit their shop name, shop description, and logo image
- Each edit creates a snapshot of the previous state
- View their own shop snapshots

**Dashboard**
- Access a dashboard showing:
  - Total number of products
  - Total number of order items for their products
  - Number of pending cancellation requests
  - Number of pending refund requests

### Seller Access Boundaries

A seller can only access data related to their own shop. The access boundaries are:

**Accessible by a seller**:
- Their own products, variants, inventory records, and snapshots
- Order items for their own products, including customer shipping addresses
- Their own shop profile and its snapshots
- Their own shipment records

**Not accessible by a seller**:
- Other sellers' products, variants, inventory, or order details
- Other sellers' dashboards
- Customer account information beyond shipping addresses for their order items
- Administrator-only features (user management, category management, product oversight of other sellers)

**Public visibility**: Customers can view a seller's shop name, shop description, and logo when browsing search results or product detail pages. This cross-user visibility is limited to what is necessary for customers to browse and purchase products.

### Account Deletion Restrictions

A seller may delete their account (deletion process defined in [Account Management]) only when both conditions are met:
1. The seller has no pending order items with "paid" or "shipped" status
2. The seller has no pending cancellation or refund requests

When a seller deletes their account:
- Their products are removed from listings and no longer appear in search or category pages
- Order history and snapshots in past orders are preserved for seller records and legal purposes
- The shop name is preserved in past order records

### Seller Suspension

An administrator can suspend a seller account. When suspended:
- The seller's products are hidden from search results and category listings and cannot be purchased
- The seller can still log in and process existing orders (create shipments, respond to cancellation and refund requests)
- The seller cannot create new products or edit existing products
- The seller cannot upload or modify product images

An administrator can unsuspend a seller account at any time. When unsuspended, the seller's products become visible again and full selling functionality is restored.

### Permissions Summary

| Area | Action | Seller |
|------|--------|--------|
| Products | Create | ✅ |
| Products | Edit own | ✅ |
| Products | Delete own (with conditions) | ✅ |
| Products | View own snapshots | ✅ |
| Product Images | Upload, reorder, delete | ✅ |
| Variants | Create, edit, delete own | ✅ |
| Inventory | Restock and adjust | ✅ |
| Inventory | View history | ✅ |
| Orders | View own order items | ✅ |
| Orders | Filter by status | ✅ |
| Shipping | Create shipments | ✅ |
| Shipping | Enter tracking info | ✅ |
| Cancellations | Approve or reject | ✅ |
| Refunds | Approve or reject | ✅ |
| Shop Profile | Edit name, description, logo | ✅ |
| Shop Profile | View snapshots | ✅ |
| Dashboard | View shop summary | ✅ |
| Account | Delete (with conditions) | ✅ |
| Other Sellers | View products, orders, inventory | ❌ |
| Customer Data | View beyond shipping addresses | ❌ |
| Categories | Create or edit | ❌ |
| User Management | Manage other accounts | ❌ |

## administrator Actor

An administrator is a user granted elevated permissions to oversee the platform. Any customer or seller can submit a request to become an administrator with a reason, and super administrators approve or reject these requests. Regular administrators have platform-wide oversight but cannot manage other administrators. Administrators can view the list of pending seller approvals and approve or reject seller registrations, providing a rejection reason when necessary. Administrators can suspend and unsuspend seller accounts — suspension hides products from search while allowing existing order processing. Administrators manage product categories by creating, editing, and deleting categories and subcategories. Administrators have product oversight — they can view all products on the platform and delete any product for policy violations. Administrators have order oversight — they can view all orders, force-cancel individual items or entire orders, and force-refund items. Administrators manage user accounts — they can view all customer and seller accounts, ban customers (preventing login), unban customers, and ban sellers (preventing login while preserving existing orders). Administrators have read-only access to product snapshots across the platform. Administrators cannot promote or demote other administrators — those actions are reserved for super administrators.

### Actor Definition

An administrator is a user who has been granted elevated permissions to oversee and regulate the e-commerce platform. Administrators are not a separate registration type — they are existing customers or sellers who have been approved for administrative privileges by a super administrator. Administrators have platform-wide oversight capabilities including seller management, product oversight, order management, category management, and user account enforcement. Administrators cannot create, promote, demote, or delete other administrator accounts — those actions are reserved exclusively for super administrators.

### Becoming an Administrator

Any registered user — whether a customer or a seller — can submit a request to become an administrator. The request includes a reason explaining why they should be granted administrative privileges. Only super administrators can view the list of pending administrator requests. Super administrators can approve or reject these requests. When approved, the requesting user becomes a regular administrator. There is no self-service path to becoming an administrator; super administrator approval is always required.

### Seller Registration Approval

Administrators can view the list of seller registration requests awaiting approval. Administrators can approve a seller registration, granting the seller permission to create products and sell on the platform. Administrators can reject a seller registration — when rejecting, the administrator must provide a rejection reason. The rejection reason is visible to the rejected seller. Rejected sellers can submit a new registration request for re-evaluation.

### Seller Suspension and Unsuspension

Administrators have the authority to suspend a seller account. When a seller is suspended, their products are hidden from search results and category listings, their products cannot be purchased, they cannot create new products, and they cannot edit existing products. A suspended seller cannot log in to their account. Administrators can also unsuspend a seller account. When unsuspended, the seller regains full access to their account and normal selling operations resume.

### Category Management Permissions

Administrators are the only actors who can create, edit, and delete categories and subcategories. Categories have a name and description, and subcategories support one level of nesting. When a category is deleted, all products assigned to that category become uncategorized. Only administrators can perform these actions — customers and sellers have no category management permissions.

### Product Oversight and Deletion Authority

Administrators can view all products on the platform, including products from any seller. Administrators have the authority to delete any product for policy violations, regardless of the seller who owns it. This product deletion authority is not subject to the same restrictions that govern seller-initiated product deletion (such as pending orders or cancellation requests). Administrators can also view product snapshots in read-only mode — this provides access to the complete history of product and variant changes for any product on the platform.

### Order Oversight with Force Cancellation and Force Refund Powers

Administrators can view all orders across the platform, regardless of which customer placed them or which seller fulfilled them. Administrators have the authority to force-cancel individual order items or entire orders. When an administrator force-cancels an item, the customer is refunded for that item and the item's stock quantities are restored. Administrators also have the authority to force-refund individual items or entire orders. Force refunds follow the same effects as regular refunds — the customer is refunded and stock quantities are restored. These powers allow administrators to intervene when disputes arise or when policy violations occur.

### Customer and Seller Ban Authority

Administrators can view all customer accounts registered on the platform. Administrators can ban a customer — a banned customer cannot log in to their account. Administrators can unban a customer, restoring their ability to log in. Administrators can view all seller accounts on the platform. Administrators can ban a seller — a banned seller cannot log in to their account, and their existing orders and order history remain unaffected. Administrators cannot unban sellers who have been banned by a super administrator — seller unbanning follows the same grade hierarchy as other super administrator-exclusive actions.

### Snapshot Read Access

Administrators have read-only access to product snapshots across the entire platform. This includes snapshots of any product's name, description, category, base price, and images, as well as snapshots of product variants (SKU codes, option values, and prices). This access is read-only — administrators cannot create, modify, or delete snapshots. Snapshot access is intended for policy enforcement, dispute resolution, and audit purposes.

### No Administrator Management Authority

Administrators cannot create, promote, demote, or delete other administrators. An administrator cannot promote another regular administrator to super administrator status. An administrator cannot demote a super administrator. An administrator cannot remove another administrator's privileges. These actions are exclusively reserved for super administrators. An administrator who wishes to become a super administrator must submit a request through the administrator request process, which is then reviewed by existing super administrators.

## superAdministrator Actor

A super administrator is the highest-level actor on the platform with all the permissions of a regular administrator plus additional administrative management capabilities. Super administrators can view pending administrator requests submitted by customers or sellers, and they can approve or reject those requests. Super administrators have the authority to promote regular administrators to super administrator status and to demote other super administrators back to regular administrator status. A super administrator cannot demote themselves — self-demotion is prohibited. Super administrators retain all the powers of a regular administrator, including seller management, category management, product oversight, order oversight, and user management. The primary distinction between a regular administrator and a super administrator is the ability to manage the administrator hierarchy — approving new administrators and changing administrator grades. Super administrators serve as the highest governance layer for the platform, ensuring accountability across all user roles including other administrators.

### Super Administrator Definition

A super administrator is the highest-privilege actor on the platform, serving as the ultimate governance layer. This role encompasses all capabilities of a regular administrator (defined in [administrator Actor]) and adds exclusive authority over the administrator hierarchy itself. Super administrators are responsible for ensuring accountability across all user roles, including other administrators.

### Administrator Request Approval

Any customer or seller on the platform can submit a request to become a regular administrator. These requests include a reason for the request. Super administrators can view the list of all pending administrator requests. Super administrators can approve a request, which grants the requester regular administrator status. Super administrators can reject a request, which denies the requester administrator access. Super administrators are the sole authority for deciding who becomes an administrator on the platform.

### Administrator Promotion and Demotion Authority

Super administrators have the exclusive authority to change the grade of existing administrators. They can promote a regular administrator to super administrator status, granting them all super administrator powers. They can also demote another super administrator back to regular administrator status, removing their super administrator privileges. A super administrator cannot demote themselves — self-demotion is prohibited. This means a super administrator who wishes to step down must request demotion from another super administrator. This rule prevents unilateral abandonment of governance responsibilities and ensures continuity of platform oversight.

### Retained Regular Administrator Powers

Super administrators retain all powers of a regular administrator (defined in [administrator Actor]), including:

- **Seller Management**: Viewing pending seller approvals, approving or rejecting seller registrations, managing seller account status
- **Category Management**: Creating, editing, and deleting categories and subcategories
- **Product Oversight**: Viewing all products, viewing product snapshots, and deleting any product for policy violations
- **Order Oversight**: Viewing all orders, force-cancelling individual items or entire orders, and force-refunding individual items or entire orders
- **User Management**: Viewing all customer and seller accounts, banning and unbanning customers, banning sellers

### Administrator Hierarchy and Platform Governance

Super administrators form the highest governance layer of the platform, managing the entire administrator hierarchy. This includes:

- **Administrator Account Lifecycle**: Deciding who becomes an administrator (via approval), what grade they hold (via promotion/demotion), and auditing administrator actions through snapshot review
- **Separation of Governance**: The no-self-demotion rule ensures that no single super administrator can unilaterally abandon their oversight role, creating a system of mutual accountability among super administrators
- **Final Escalation Point**: Super administrators serve as the ultimate authority for resolving disputes involving administrator conduct, ensuring no administrator operates without accountability

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Customer Registration

Customers register by providing an email address and password. The email address serves as the unique identifier for the customer account. If the email address is already associated with an existing customer account, the registration request is rejected.

Upon successful registration, the customer account is created with the provided email and password. The customer is then able to log in immediately. Registration is required before any features can be used — there is no guest browsing capability on the platform.

### Seller Registration

Sellers register by providing an email address and password. The email address serves as the unique identifier for the seller account. If the email address is already associated with an existing seller account, the registration request is rejected.

Upon successful registration, the seller account is created with a status of "pending approval." The seller cannot sell any products until an administrator approves the account. The seller can view their approval status, which is one of: pending, approved, or rejected.

If the seller's registration is rejected, the rejection reason is displayed to the seller. The seller may submit a new registration request after a rejection.

### Administrator Registration Request

Any user (customer or seller) can submit a request to become an administrator. The request includes a textual reason explaining why the user wishes to become an administrator.

Super administrators can view the list of pending administrator requests and either approve or reject them. When approved, the user becomes a regular administrator.

### Authentication and Login

All users (customers, sellers, and administrators) authenticate using their registered email address and password. The system verifies that the email and password combination matches a registered account.

If the email does not match any registered account, the login request is rejected. If the email matches an account but the password is incorrect, the login request is rejected.

**Customer Login**: After successful authentication, the customer is granted access to their profile, addresses, wishlist, cart, orders, and other customer features.

**Seller Login**: After successful authentication, the seller is granted access to their shop dashboard and seller features. If the seller account is suspended (by an administrator), the seller can still log in but with restricted access appropriate to the suspended status.

**Administrator Login**: After successful authentication, the administrator is granted access to administrative features according to their grade (regular administrator or super administrator). If an administrator is banned, the administrator cannot log in.

**Customer Ban**: If a customer account has been banned by an administrator, the customer cannot log in.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Creation and Persistence

After a user successfully authenticates with their email and password (as described in the Registration and Login section), a session is established for that user. The session persists across pages and actions until one of the following occurs:

- The user explicitly logs out
- The user's account is banned (customer) or deleted (any role)

All authenticated operations — including browsing the catalog, managing a profile, placing orders, processing shipments, and managing the platform — require an active session. A user without an active session can only access the login page to authenticate. There is no guest browsing; registration and login are required to use any features.

### Logout

Any logged-in user — customer, seller, administrator, or super administrator — can log out at any time. Logout ends the current session immediately. After logout, the user must authenticate again with their email and password to access any authenticated features.

### Account Security and Access Revocation

When an administrator bans a customer account, any existing session for that account is invalidated. The banned customer cannot establish a new session and cannot log in.

When an administrator suspends a seller account, the seller can still log in while their account is suspended. The suspension does not invalidate the seller's session or prevent them from authenticating.

When a customer deletes their account (as described in the Account Management section), their existing session is immediately invalidated. The deleted account cannot be used to log in again.

When a seller deletes their account under the conditions defined in the Seller actor definition, their existing session is immediately invalidated. The deleted seller account cannot be used to log in again.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Customer Account Creation

Registration requires an email address and a password. The email address must not already be associated with an existing account.

Once registered, the customer account is immediately active and can be used to log in and access all customer features on the platform.

Each customer account has a profile that includes a display name and phone number (as defined in [Module 1 > Customer Actor]). These profile attributes can be set and edited after registration.

### Seller Account Creation

A registered customer may submit a request to become a seller. This request includes shop details: shop name, shop description, and logo image.

A seller account is not active immediately upon request. An administrator must review and approve the seller registration. While pending approval, the seller account exists but cannot list products or perform selling operations.

The seller can view their approval status: pending, approved, or rejected. If rejected, the rejection reason is provided to the seller. A rejected seller may submit a new registration request with corrected information.

Only approved sellers can create products, manage inventory, and process orders.

### Administrator Account Creation

Any user (customer or seller) may submit a request to become an administrator. The request includes a reason explaining why they should be granted administrator privileges.

A super administrator reviews pending administrator requests. The super administrator may approve or reject the request. If approved, the user is granted regular administrator privileges.

A regular administrator may be promoted to super administrator by another super administrator.

### Customer Account Deletion

A customer may delete their own account at any time.

When a customer deletes their account:
- Their personal profile information (display name, phone number) is deleted.
- Their orders and order history are preserved for seller records and legal purposes.
- Their product reviews are preserved but the reviewer is shown as "deleted user" rather than their name.

### Seller Account Deletion

A seller may delete their seller account only if:
- They have no pending order items in "paid" or "shipped" status for any of their products.
- They have no pending cancellation requests or pending refund requests for any of their order items.

If these conditions are not met, the deletion request is rejected.

When a seller deletes their account:
- All their products are deleted from listings and removed from search and category browsing.
- Deleting the products also removes all their product variants and inventory records.
- Products deleted due to seller account deletion are automatically removed from all customer wishlists.
- Order history and order item snapshots for past orders are preserved.
- Their shop name is preserved in past order records so that historical orders retain the seller identity.

### Password Change

Both customers and sellers may change their account password.

To change a password, the user must provide their current password and a new password. The system verifies the current password before accepting the new password. If the current password is incorrect, the request is rejected.

The new password must meet the same requirements as the original password set during registration.

After a successful password change, the user must use the new password for all subsequent logins. The previous password is no longer valid.