**ecommerce — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## customer Actor

Customers are registered users who access the platform to browse and purchase products. Each customer has a unique identity tied to their email and password credentials. Customers can manage their personal profile including display name and phone number. They maintain multiple shipping addresses and can designate one as default. Customers have access to their shopping cart, wishlist, and complete order history. They can write reviews for products they have purchased and delivered. Customers interact with the platform to search, filter, and sort products across all sellers. Their access is limited to their own account data and they cannot view other customers' information.

### Customer Identity and Authentication

Customers are registered users who access the platform to browse and purchase products. Each customer has a unique identity tied to their email and password credentials. Registration requires a valid email address and a password. Login requires the same email and password credentials used during registration. The platform does not support guest browsing; all features require customer authentication. Customers can change their password using their current password for verification. Customers can delete their account, which removes their profile information but preserves order history and reviews for legal and seller record purposes.

### Customer Profile Management

Each customer maintains a personal profile containing a display name and phone number. Customers can view and edit their display name and phone number at any time. The display name is visible to sellers when processing orders. The phone number is used for order-related communication and shipping purposes. Profile information is private and visible only to the customer and administrators. Other customers cannot view another customer's profile details.

### Shipping Address Management

Customers can manage multiple shipping addresses for order delivery. Each address includes recipient name, phone number, street address, city, state or province, postal code, and country. Customers can add new addresses, edit existing addresses, and delete addresses they no longer need. Customers can designate one address as the default shipping address, which is automatically selected during checkout. All addresses belong exclusively to the customer and are not visible to other customers.

### Shopping Cart and Wishlist Access

Customers have access to a personal shopping cart for managing items before purchase. The cart contains product variants selected by the customer with specified quantities. Customers can view their cart, update quantities, and remove items. Cart contents persist across sessions until checkout or manual removal. Customers also have access to a personal wishlist for saving products of interest. The wishlist contains products (not specific variants) and can be viewed, updated, and managed by the customer. Both cart and wishlist data are private and accessible only by the owning customer.

### Order History and Review Permissions

Customers can view their complete order history, including all past and current orders. Order history is paginated and sorted by newest first. Customers can view detailed information for each order, including items purchased, prices, shipping address, and order status. Customers can write reviews for products they have purchased, but only after the corresponding order item status is delivered. Each customer can write one review per product per order. Customers can edit or delete their own reviews. Review content and ratings are visible on product detail pages to all customers.

### Product Browsing and Search Access

Customers can browse and search products across all sellers on the platform. Search functionality allows customers to find products by name. Customers can filter search results by category, price range, and stock availability. Customers can sort results by newest first, price low to high, or price high to low. Product listings show main image, name, price, seller shop name, and average rating. Customers can view detailed product information including all images, descriptions, variants, and existing reviews. All customers have equal access to product browsing features regardless of purchase history.

### Data Isolation and Privacy Boundaries

Each customer's data is isolated from other customers. Customers can only access their own profile, addresses, cart, wishlist, orders, and reviews. Customers cannot view, modify, or access another customer's personal information or account data. Customers can view public information about sellers (shop name, description, logo) and products (name, description, images, reviews from all customers). Customers can view their own order items from sellers they purchased from, but cannot view other customers' orders. This data isolation ensures privacy and security for all customer accounts.

## seller Actor

Sellers are approved users who can list and sell products on the platform. Seller accounts require administrator approval before they can create products or process orders. Each seller has a shop profile with a shop name, description, and logo image. Sellers can manage their own products including creating, editing, and deleting product listings. They control inventory levels for each product variant and can restock or adjust quantities. Sellers process order items for their products including shipping and responding to cancellation or refund requests. They can view their shop dashboard with sales summaries and pending requests. Sellers cannot access other sellers' data or products and their account deletion has specific restrictions based on pending orders.

### Seller Identity

A seller is a registered user who has been approved by an administrator to sell products on the platform. Sellers authenticate using email and password. Seller accounts have an approval status that can be pending, approved, or rejected. Only approved sellers can create products, manage inventory, and process orders. Rejected sellers can view the rejection reason and submit a new registration request.

### Administrator Approval Required

Seller accounts require administrator approval before they can sell on the platform. When a seller registers, their account status is set to pending. Administrators review pending seller registrations and can approve or reject them. When rejecting a seller registration, administrators must provide a reason. Rejected sellers can view the rejection reason in their account. Rejected sellers can submit a new registration request after being rejected.

### Shop Profile Management

Sellers have a shop profile that includes a shop name, shop description, and logo image. Sellers can edit their shop name, shop description, and logo image at any time. Each edit to the shop profile creates a snapshot that records the previous state. Customers can view seller profiles including the shop name, description, and logo. The shop profile information at the time of purchase is preserved in order item snapshots.

### Product Creation and Editing Permissions

Sellers can create products for their shop. Product creation requires a name, description, category, and base price. Sellers can edit their own products including the name, description, category, base price, and images. Every edit to a product creates a snapshot that preserves the previous state. Sellers can view snapshots of their own products. Administrators can view snapshots of any product on the platform.

### Product Deletion Permissions

Sellers can delete their own products only when there are no pending order items with paid or shipped status for any variant of the product, and there are no pending cancellation or refund requests for any variant of the product. Deleting a product also deletes all its variants and inventory records. Deleted products no longer appear in search or category listings. Snapshots of deleted products are preserved even after deletion. Administrators can delete any product on the platform.

### Inventory Management Access

Sellers can manage inventory for their product variants. Each variant has its own stock quantity that is tracked through inventory history records. Sellers can add inventory (restock) by specifying a quantity and reason. Sellers can subtract inventory (adjustment or loss) by specifying a quantity and reason. Sellers can view the full inventory history for each variant. When stock reaches zero, the variant is shown as out of stock and cannot be added to cart.

### Order Item Processing and Shipping Management

Sellers can view order items for their products that need shipping. Sellers can select one or more order items to include in a shipment. Sellers enter tracking information for shipments including carrier name and tracking number. When a shipment is created, all items in the shipment change to shipped status. Sellers can respond to cancellation requests for their order items by approving or rejecting them. Sellers can respond to refund requests for their order items by approving or rejecting them.

### Shop Dashboard Access

Sellers can view a summary dashboard for their shop. The dashboard shows the total number of products, total number of order items for their products, number of pending cancellation requests, and number of pending refund requests. Sellers can view a list of all order items for their products. Sellers can filter order items by status.

### Seller Data Boundaries

Sellers can only access data belonging to their own shop. Sellers cannot view or modify other sellers' products, profiles, or order items. Sellers cannot access customer personal information beyond what is needed for order fulfillment. Each seller's data is isolated from other sellers on the platform.

### Account Deletion Restrictions

Sellers can delete their account only when they have no pending orders with paid or shipped status, and they have no pending cancellation or refund requests. When a seller deletes their account, their products are deleted from listings, order history and snapshots are preserved, and their shop name in past orders is preserved. Account deletion is irreversible.

## admin Actor

Administrators are system users with elevated permissions to manage the platform. There are two administrator grades: regular administrator and super administrator. Regular administrators can approve or reject seller registration requests and manage product categories. Super administrators have additional powers including promoting or demoting administrators and managing all platform users. Administrators can view all products, orders, and user accounts across the platform. They can suspend seller accounts, ban customers, and force-cancel or force-refund orders. Administrators can view product snapshots for dispute resolution. Their access boundaries depend on their grade level with super administrators having broader system control.

### Administrator Identity

Administrators are system users with elevated permissions to manage the platform. Any user (customer or seller) can submit a request to become an administrator by providing a reason. Super administrators review pending administrator requests and can approve or reject them. When approved, the user becomes a regular administrator.

Administrators must authenticate with email and password to access the system. Administrators can change their password. Administrators can delete their account following the same rules as regular users.

### Administrator Grades and Access Boundaries

There are two administrator grades: regular administrator and super administrator.

**Regular Administrator Powers**:
- Approve or reject seller registration requests
- Manage product categories (create, edit, delete)
- View all products and their snapshots
- View all orders
- View all customer and seller accounts
- Suspend or unsuspend seller accounts
- Ban or unban customers
- Ban or unban sellers
- Force-cancel individual order items or entire orders
- Force-refund individual order items or entire orders

**Super Administrator Powers**:
- All regular administrator powers, plus:
- Promote regular administrators to super administrator
- Demote other super administrators to regular administrator
- Super administrators cannot demote themselves

**Grade-Based Access Boundaries**:
- Regular administrators cannot modify administrator grades
- Super administrators have full system control over user management and administrator grades
- Both grades have equal access to platform oversight (products, orders, users)

### Seller Management Permissions

Administrators manage seller accounts through the following permissions:

**Seller Registration Approval**:
- Administrators view the list of pending seller registration requests
- Administrators approve seller registrations, enabling the seller to create products and manage their shop
- Administrators reject seller registrations and must provide a rejection reason
- Rejected sellers can submit a new registration request

**Seller Suspension**:
- Administrators can suspend seller accounts
- When suspended, the seller's products are hidden from search and category listings
- Suspended sellers cannot create new products or edit existing products
- Suspended sellers cannot be purchased from
- Suspended sellers can still process existing orders (ship items, respond to cancellation and refund requests)
- Administrators can unsuspend seller accounts, making their products visible again

**Seller Banning**:
- Administrators can ban seller accounts
- Banned sellers cannot log in
- Banned sellers' existing orders remain in the system and can still be fulfilled
- Administrators can unban seller accounts

### Category Management Permissions

Administrators manage product categories with the following permissions:

**Category Creation and Editing**:
- Administrators can create new categories and subcategories
- Administrators can edit category names and descriptions
- Categories support one level of nesting (categories can have subcategories, but subcategories cannot have further subcategories)

**Category Deletion**:
- Administrators can delete categories
- When a category is deleted, products in that category become uncategorized
- Products remain visible in search but are no longer associated with any category

### Product Oversight Permissions

Administrators have oversight access to all products on the platform:

**Product Viewing**:
- Administrators can view all products across all sellers
- Administrators can view product details, variants, and images
- Administrators can view product snapshots for dispute resolution
- Administrators can view snapshots even after products are deleted

**Product Deletion**:
- Administrators can delete any product for policy violations
- When an administrator deletes a product, all its variants and inventory records are deleted
- Deleted products no longer appear in search or category listings
- Product snapshots are preserved even after deletion

### Order Oversight Permissions

Administrators have oversight access to all orders on the platform:

**Order Viewing**:
- Administrators can view all orders across all customers
- Administrators can view order details including items, shipping addresses, and shipments
- Administrators can view tracking information for all shipments

**Force Cancellation**:
- Administrators can force-cancel individual order items or entire orders
- Force-cancellation refunds the customer and restores stock quantities
- Force-cancellation can be applied to items in any status

**Force Refund**:
- Administrators can force-refund individual order items or entire orders
- Force-refund restores stock quantities
- Force-refund can be applied to items in any status

### User Management Permissions

Administrators manage user accounts across the platform:

**Customer Management**:
- Administrators can view all customer accounts
- Administrators can ban customer accounts
- Banned customers cannot log in
- Administrators can unban customer accounts

**Seller Management**:
- Administrators can view all seller accounts
- Administrators can ban seller accounts (defined in Seller Management Permissions section)
- Administrators can suspend seller accounts (defined in Seller Management Permissions section)
- Administrators can unsuspend seller accounts

**Administrator Management**:
- Super administrators can view all administrator accounts
- Super administrators can promote regular administrators to super administrator
- Super administrators can demote super administrators to regular administrator
- Super administrators cannot demote themselves

### Snapshot Viewing Permissions

Administrators can view snapshots for dispute resolution and audit purposes:

**Snapshot Viewing Permissions**:
- Administrators can view product snapshots for any product (defined in Product Oversight Permissions section)
- Administrators can view seller profile snapshots
- Administrators can view order item snapshots
- Administrators can view review snapshots
- Administrators can view cancellation request snapshots
- Administrators can view refund request snapshots

**Snapshot Access Rules**:
- Snapshots are immutable and cannot be deleted
- Snapshots record when the change was made, what was changed, and the values before and after
- Administrators can view snapshots even after the associated entity is deleted
- Snapshot viewing is available to both regular and super administrators

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

All users must register before accessing any platform features. Guest browsing is not available.

**Customer Registration**

Customers can register by providing an email address and password. The email address must be unique across all customer accounts. Upon successful registration, the customer account is immediately active and can be used to log in.

**Seller Registration**

Sellers can register by providing an email address and password. The email address must be unique across all seller accounts. Upon registration, the seller account is created with "pending" approval status. The seller cannot list or sell products until administrator approval is granted.

**Administrator Registration Request**

Any registered user (customer or seller) can submit a request to become an administrator. The request must include a reason explaining why the user should be granted administrator access. The request is reviewed by super administrators, who can approve or reject it. When approved, the user becomes a regular administrator.

**Registration Validation**

- If the email address is already registered, the request is rejected
- If the email address or password is missing or invalid, the request is rejected

### User Login

All registered users can log in using their email address and password.

**Customer Login**

Customers can log in with their registered email address and password. Upon successful authentication, the customer session is created and the customer can access all platform features.

**Seller Login**

Sellers can log in with their registered email address and password. Upon successful authentication, the seller session is created. However, sellers with "pending" or "rejected" approval status cannot create products or access seller-specific features until their account is approved by an administrator.

**Administrator Login**

Administrators can log in with their registered email address and password. Upon successful authentication, the administrator session is created with access to administrator features based on their grade (regular or super).

**Login Validation**

- If the email address is not registered, the login is rejected
- If the password is incorrect, the login is rejected
- If the account is banned, the login is rejected

### Authentication and Session

All users authenticate using email and password credentials.

**Authentication Requirements**

- All users must provide valid email and password credentials to authenticate
- Authentication is required for all platform operations except viewing public product listings (which is not available per the no-guest-browsing rule)
- Failed authentication attempts are recorded for account security purposes

**Session Management**

- Upon successful login, a session is created for the user
- The session maintains the user's identity and role (customer, seller, or administrator)
- For administrators, the session also maintains the administrator grade (regular or super)
- Sessions expire after a period of inactivity or when the user logs out

**Account Status Checks**

- Banned accounts cannot authenticate (login is rejected)
- For sellers, the approval status is checked after authentication to determine feature access
- Suspended sellers can authenticate but cannot create or edit products

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

Users maintain an active session after successful login. The session remains active while the user continues to interact with the platform. The system tracks session activity and maintains the user's authentication state throughout their browsing and shopping activities.

Users can view their current session status to confirm they are logged in. The system displays the user's identity (customer, seller, or administrator) during the session.

### User Logout

Users can log out from the platform at any time. Logging out ends the current session immediately and clears the user's authentication state.

After logout, users are redirected to the login page or home page. Users must log in again to access protected features such as shopping cart, orders, or seller dashboard.

Logging out from one device does not affect sessions on other devices. Users must log out separately from each device where they are logged in.

### Account Security

Customers can change their password at any time while logged in. The password change requires the current password for verification.

Sellers can change their password at any time while logged in. The password change requires the current password for verification.

Administrators can ban customer accounts. When a customer is banned, they cannot log in to the platform. Administrators can unban customer accounts to restore login access.

Administrators can ban seller accounts. When a seller is banned, they cannot log in to the platform. Existing orders remain accessible for fulfillment purposes. Administrators can unban seller accounts to restore login access.

If a user's account is banned, the user receives a notification explaining that their account has been restricted. The user cannot access any platform features until the ban is lifted.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Registration

Customer registration requires email and password. The system validates that the email is not already registered. Upon successful registration, the customer account is created and the customer can immediately log in and use all customer features.

Seller registration requires email and password. Upon successful registration, the seller account is created in a pending approval state. The seller cannot list products or process orders until an administrator approves the account. The seller can view their approval status (pending, approved, or rejected). If rejected, the seller can view the rejection reason and submit a new registration request.

### Password Change

Customers can change their password by providing their current password and a new password. The system validates that the current password is correct before updating to the new password.

Sellers can change their password by providing their current password and a new password. The system validates that the current password is correct before updating to the new password.

### Account Deletion

Customers can delete their account at any time. When a customer deletes their account:
- Their profile information (display name and phone number) is deleted
- Their orders and order history are preserved for seller records and legal purposes
- Their reviews are preserved but displayed as "deleted user"
- Their wishlist is cleared
- Their shopping cart is cleared

Sellers can delete their account only if:
- They have no pending orders (no order items with paid or shipped status)
- They have no pending cancellation or refund requests

When a seller deletes their account:
- Their products are removed from all listings and search results
- Their order history and order snapshots are preserved
- Their shop name in past orders is preserved for order history integrity
- Their pending seller approval request (if any) is cancelled