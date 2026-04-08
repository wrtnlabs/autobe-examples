**shoppingMall — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

Guest actors have no access to any platform features. The platform requires registration to use any functionality, meaning guests cannot browse products, view categories, or access any other features. Guests must register as customers or sellers to gain access to the platform. Guest actors have no identity on the platform and cannot perform any actions. All platform interactions require authenticated user accounts. Guests represent unauthenticated users who have not yet created an account.

### Guest Actor Definition

A guest is an unauthenticated user who has not yet created an account on the platform. Guests have no persistent identity and cannot perform authenticated actions. Guests can browse public content including products, categories, and seller information without registration. All transactions, account management, and personalized features require authenticated user accounts.

### Guest Access Permissions

Guests can browse and view products without authentication. Guests can view category listings and product details. Guests can view seller shop information and product catalogs. Guests can read product reviews and ratings. Guests cannot add items to cart, place orders, or access any transactional features. Guests cannot create reviews, manage wishlists, or access any personalized content. Guests cannot modify or delete any platform data. Guests must register as customers to perform purchasing activities or as sellers to manage shops.

## customer Actor

Customer actors are registered users who can purchase products from sellers on the platform. Customers have access to browse products, categories, and seller profiles. They can manage their own profile information, shipping addresses, wishlist, and shopping cart. Customers can place orders, request cancellations for paid items, and request refunds for delivered items. They can write and manage reviews for products they have purchased. Customers can view their order history and shipment tracking information. Customers have the ability to request administrator privileges. Customer accounts are created through email and password registration. Customers cannot access seller or administrator features.

### Customer Identity

Customers are registered users who purchase products from sellers on the platform. Customer accounts are created through email and password registration. Each customer has a unique account identified by their email address. Each customer has a profile containing a display name and phone number. Customers can update their display name and phone number at any time.

### Customer Permissions

Customers can browse all products and categories available on the platform. Customers can view seller profiles including shop name, description, and logo. Customers can manage their own shipping addresses, including adding, editing, and deleting addresses. Customers can set one address as their default shipping address. Customers can add products to their wishlist and view their wishlist. Customers can add product variants to their shopping cart and manage cart contents. Customers can place orders by completing checkout with a selected shipping address. Customers can view their complete order history with order details and shipment tracking information. Customers can request cancellation for individual order items with paid status. Customers can request refund for individual order items with delivered status within 7 days of delivery. Customers can write reviews for products they have purchased after the item status is delivered. Customers can edit their own reviews. Customers can delete their own reviews.

### Customer Restrictions

Customers cannot access seller features such as creating products, managing inventory, or processing shipments. Customers cannot access administrator features such as approving seller registrations, managing categories, or banning users. Customers cannot view or modify other customers' profiles, addresses, wishlists, carts, or orders. Customers cannot view seller approval status or seller management functions. Customers cannot modify order items after an order is placed. Customers cannot change the shipping address after an order is placed. Customers cannot cancel order items that have already been shipped. Customers cannot request refunds for order items beyond 7 days after delivery. Customers cannot write reviews for products they have not purchased. Customers cannot write reviews for order items that have not reached delivered status.

## seller Actor

Seller actors are registered users who can list and sell products on the platform. Sellers require administrator approval before they can actively sell products. They can manage their shop profile including shop name, description, and logo. Sellers can create, edit, and delete their own products and product variants. They can manage inventory levels and view inventory history for their variants. Sellers can process orders by shipping items and providing tracking information. They can respond to cancellation and refund requests from customers. Sellers can view their dashboard with shop statistics and order items. Sellers can request administrator privileges. Seller accounts can be suspended or banned by administrators. Sellers cannot access customer-specific features or administrator management capabilities.

### Seller Registration and Approval

THE system SHALL require sellers to register with email and password before accessing seller features.

WHEN a seller registers, THE system SHALL create their account with pending approval status.

WHEN a seller account is created, THE system SHALL require administrator approval before the seller can list products for sale.

WHEN a seller logs in, THE system SHALL display their current approval status (pending, approved, or rejected).

WHEN a seller's registration is rejected, THE system SHALL display the rejection reason provided by the administrator.

WHEN a seller's registration is rejected, THE system SHALL allow the seller to submit a new registration request.

WHILE a seller's account is in pending approval status, THE system SHALL prevent the seller from creating or editing products.

WHILE a seller's account is approved, THE system SHALL allow the seller to create, edit, and delete their own products.

### Seller Profile Management

THE system SHALL allow sellers to create a shop profile with shop name, shop description, and logo image.

THE system SHALL allow sellers to edit their shop name, shop description, and logo image.

WHEN a seller edits their profile, THE system SHALL create a snapshot of the previous profile state.

THE system SHALL allow customers to view seller profiles including shop name, description, and logo.

THE system SHALL preserve seller profile snapshots even after the seller deletes their account.

### Product Management Permissions

THE system SHALL allow sellers to create products with name, description, category, and base price.

THE system SHALL allow sellers to edit their own products.

WHEN a seller edits a product, THE system SHALL create a snapshot of the previous product state.

THE system SHALL allow sellers to delete their own products only when there are no pending order items for any variant of the product.

THE system SHALL allow sellers to delete their own products only when there are no pending cancellation or refund requests for any variant of the product.

THE system SHALL allow sellers to add product images to their products.

THE system SHALL allow sellers to reorder product images.

THE system SHALL allow sellers to delete images from their products.

THE system SHALL allow sellers to create product variants with SKU code, option values, price, and stock quantity.

THE system SHALL allow sellers to edit their product variants.

WHEN a seller edits a product variant, THE system SHALL create a snapshot of the previous variant state.

THE system SHALL allow sellers to delete product variants only when there are no pending order items for that variant.

THE system SHALL allow sellers to delete product variants only when there are no pending cancellation or refund requests for that variant.

THE system SHALL allow sellers to view snapshots of their own products.

### Inventory Management Permissions

THE system SHALL allow sellers to add inventory to their product variants with a quantity and reason.

THE system SHALL allow sellers to subtract inventory from their product variants with a quantity and reason.

THE system SHALL allow sellers to view the full inventory history for each of their product variants.

WHEN a seller adds inventory, THE system SHALL create an inventory record with the quantity change and reason.

WHEN a seller subtracts inventory, THE system SHALL create an inventory record with the quantity change and reason.

### Order Fulfillment Permissions

THE system SHALL allow sellers to view order items for their products that require shipping.

THE system SHALL allow sellers to create shipments containing one or more of their order items.

THE system SHALL require sellers to provide carrier name and tracking number when creating a shipment.

WHEN a seller creates a shipment, THE system SHALL change the status of all items in that shipment to shipped.

THE system SHALL allow sellers to view tracking information for shipments they have created.

### Customer Request Response Permissions

THE system SHALL allow sellers to view cancellation requests for their order items.

THE system SHALL allow sellers to approve or reject cancellation requests for their order items.

WHEN a seller responds to a cancellation request, THE system SHALL create a snapshot of the request state.

WHEN a seller approves a cancellation request, THE system SHALL cancel that order item and process a refund.

THE system SHALL allow sellers to view refund requests for their order items.

THE system SHALL allow sellers to approve or reject refund requests for their order items.

WHEN a seller responds to a refund request, THE system SHALL create a snapshot of the request state.

WHEN a seller approves a refund request, THE system SHALL refund that order item.

### Dashboard Access

THE system SHALL allow sellers to view their seller dashboard.

THE system SHALL display the total number of products on the seller dashboard.

THE system SHALL display the total number of order items for the seller's products on the seller dashboard.

THE system SHALL display the number of pending cancellation requests on the seller dashboard.

THE system SHALL display the number of pending refund requests on the seller dashboard.

THE system SHALL allow sellers to view a list of all order items for their products.

THE system SHALL allow sellers to filter order items by status.

### Account Status and Restrictions

THE system SHALL allow administrators to suspend seller accounts.

WHILE a seller account is suspended, THE system SHALL hide the seller's products from search and category listings.

WHILE a seller account is suspended, THE system SHALL prevent customers from purchasing the seller's products.

WHILE a seller account is suspended, THE system SHALL allow the seller to process existing orders.

WHILE a seller account is suspended, THE system SHALL allow the seller to ship items and respond to cancellation and refund requests.

WHILE a seller account is suspended, THE system SHALL prevent the seller from creating new products.

WHILE a seller account is suspended, THE system SHALL prevent the seller from editing existing products.

THE system SHALL allow administrators to unsuspend seller accounts.

WHEN a seller account is unsuspended, THE system SHALL make the seller's products visible again.

THE system SHALL allow administrators to ban seller accounts.

WHILE a seller account is banned, THE system SHALL prevent the seller from logging in.

WHILE a seller account is banned, THE system SHALL preserve existing orders for the seller.

### Access Restrictions

THE system SHALL prevent sellers from accessing customer-specific features such as placing orders, managing shopping carts, and managing wishlists.

THE system SHALL prevent sellers from accessing other sellers' products, order items, or profiles.

THE system SHALL prevent sellers from accessing administrator management capabilities such as approving seller registrations, managing categories, suspending or banning accounts, and force-cancelling or force-refunding orders.

THE system SHALL prevent sellers from viewing other customers' order history or personal information.

## administrator Actor

Administrator actors are privileged users who manage platform operations and enforce policies. There are two administrator grades: regular administrator and super administrator. Super administrators have additional privileges to manage other administrators, including promotion and demotion. Administrators can approve or reject seller registration requests. They can suspend or ban seller and customer accounts. Administrators can manage product categories including creation, editing, and deletion. They can view all products and order records on the platform. Administrators can force-cancel or force-refund order items for policy violations. They can view snapshots of any product for oversight purposes. Regular administrators can request promotion to super administrator. Administrators cannot perform customer or seller operational tasks.

### Administrator Actor Definition

Administrators are privileged platform managers who oversee platform operations and enforce policies. Unlike customers and sellers who use the platform for buying and selling, administrators have oversight and management capabilities. There are two administrator grades: regular administrator and super administrator. Regular administrators can perform standard administrative tasks including seller management, category management, product oversight, order oversight, and user management. Super administrators have all regular administrator capabilities plus the ability to manage other administrators, including promoting regular administrators to super administrator and demoting super administrators to regular administrator. Super administrators cannot demote themselves. Any user (customer or seller) can submit a request to become an administrator by providing a reason. Super administrators review these requests and can approve or reject them. When approved, the user becomes a regular administrator.

### Administrator Grades and Promotion

The platform has two administrator grades: regular administrator and super administrator. Super administrators have elevated privileges to manage the administrator hierarchy. Super administrators can promote regular administrators to super administrator status. Super administrators can demote other super administrators to regular administrator status. Super administrators cannot demote themselves from super administrator status. Regular administrators can request promotion to super administrator by submitting a request with a reason. Super administrators review pending promotion requests and can approve or reject them. When a promotion request is approved, the regular administrator becomes a super administrator. When a promotion request is rejected, the user remains a regular administrator. Administrator grade changes are recorded and can be viewed by super administrators.

### Seller Management Permissions

Administrators can manage seller accounts and registrations. Administrators can view the list of pending seller registration requests. Administrators can approve seller registration requests, allowing the seller to begin selling on the platform. Administrators can reject seller registration requests and must provide a rejection reason. Rejected sellers can submit a new registration request after rejection. Administrators can suspend seller accounts. When a seller is suspended, their products are hidden from search and category listings, and their products cannot be purchased. Suspended sellers can still process existing orders including shipping items and responding to cancellation or refund requests. Suspended sellers cannot create new products or edit existing products. Administrators can unsuspend seller accounts, making their products visible and purchasable again. Administrators can ban seller accounts. Banned sellers cannot log in to the platform. Existing orders from banned sellers remain in the system and can be processed.

### Category Management Permissions

Administrators can manage product categories on the platform. Administrators can create new categories with a name and description. Administrators can create subcategories under existing categories. Categories support 1 level of nesting only (a category can have subcategories, but subcategories cannot have their own subcategories). Administrators can edit category names and descriptions. Administrators can delete categories. When a category is deleted, products in that category become uncategorized and are no longer associated with any category. Only administrators can create, edit, or delete categories. Customers and sellers cannot manage categories.

### Product Oversight Permissions

Administrators can view all products on the platform regardless of which seller owns them. Administrators can view snapshots of any product to see historical changes. Snapshots include all product fields and variant information at the time of each change. Administrators can delete any product on the platform for policy violations. When an administrator deletes a product, all variants and inventory records for that product are also deleted. Deleted products no longer appear in search or category listings. Product snapshots are preserved even after product deletion. Administrators can view product snapshots for oversight and dispute resolution purposes.

### Order Oversight Permissions

Administrators can view all orders on the platform regardless of which customer placed them. Administrators can view order details including items, shipping addresses, and shipment information. Administrators can force-cancel individual order items or entire orders. When an administrator force-cancels an order item, the item status changes to cancelled and a refund is processed for the customer. Force-cancelled items restore their stock quantities through inventory records. Administrators can force-refund individual order items or entire orders. When an administrator force-refunds an order item, the item status changes to refunded and a refund is processed for the customer. Force-refunded items restore their stock quantities through inventory records. Force-cancellation and force-refund actions can be used for policy violations or dispute resolution.

### User Management Permissions

Administrators can view all customer accounts on the platform. Administrators can ban customer accounts. Banned customers cannot log in to the platform. Banned customers retain their order history but cannot place new orders or access platform features. Administrators can unban customer accounts, restoring their ability to log in and use the platform. Administrators can view all seller accounts on the platform. Administrators can ban seller accounts. Banned sellers cannot log in to the platform. Existing orders from banned sellers remain in the system and can be processed by the seller before the ban or by administrators. Administrators can unban seller accounts, restoring their ability to log in and use the platform.

### Administrator Restrictions

Administrators cannot perform customer operational tasks. Administrators cannot browse products as customers, add items to a cart, place orders, or write reviews. Administrators cannot perform seller operational tasks. Administrators cannot create products, manage inventory, ship orders, or respond to cancellation and refund requests as a seller. Administrators have oversight and management capabilities only. Administrator actions are logged and can be reviewed by super administrators. Regular administrators cannot promote or demote other administrators. Only super administrators can manage administrator promotions and demotions.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Customer Registration

Customers can register for an account using an email address, password, display name, and phone number.

The email address must be unique across all registered accounts on the platform.

The password must meet minimum security requirements to ensure account protection.

Upon successful registration, the customer account is immediately active and the customer can log in.

If the email address is already registered, the registration request is rejected with an error message.

If the password does not meet security requirements, the registration request is rejected with an error message.

Registration creates a new customer account with the provided email, password, display name, and phone number.

Customers can only have one account per email address.

### Customer Login

Customers can log in using their registered email address and password.

The system validates the email address and password against registered customer accounts.

If the email address and password match a registered account, the customer is authenticated and granted access to the platform.

If the email address does not exist, the login attempt fails with an error message.

If the password is incorrect, the login attempt fails with an error message.

Successful login creates an active session for the customer.

Customers must be logged in to access any platform features, as guest browsing is not permitted.

Customers can view their account information and perform customer-specific actions after logging in.

### Seller Registration

Sellers can register for an account using an email address, password, shop name, shop description, and logo image.

The email address must be unique across all registered accounts on the platform.

The password must meet minimum security requirements to ensure account protection.

Upon registration, seller accounts are created with a pending approval status.

Seller accounts require administrator approval before the seller can begin selling products.

If the email address is already registered, the registration request is rejected with an error message.

If the password does not meet security requirements, the registration request is rejected with an error message.

Registration creates a new seller account with pending approval status, including the provided shop name, shop description, and logo image.

Sellers can only have one account per email address.

### Seller Approval Process

Sellers can view their approval status, which can be pending, approved, or rejected.

Sellers with pending approval status can log in but cannot create or manage products until approved.

Administrators review seller registration requests and can approve or reject them.

When a seller registration is approved, the seller account becomes active and the seller can begin selling.

When a seller registration is rejected, the seller can view the rejection reason provided by the administrator.

Rejected sellers can submit a new registration request to be reviewed again.

Sellers with rejected status must submit a new registration request before their account can be approved.

Sellers with approved status can access all seller features including product management and order fulfillment.

### Seller Login

Sellers can log in using their registered email address and password.

The system validates the email address and password against registered seller accounts.

If the email address and password match a registered account, the seller is authenticated and granted access to the platform.

If the email address does not exist, the login attempt fails with an error message.

If the password is incorrect, the login attempt fails with an error message.

Successful login creates an active session for the seller.

Sellers must be logged in to access any platform features.

Sellers with pending or rejected approval status can log in but have limited access to seller features.

Sellers with approved status can access all seller-specific features after logging in.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

After successful login, users maintain an active session that grants access to platform features.

THE shoppingMall SHALL maintain user session state after authentication completes.

THE shoppingMall SHALL allow users to access platform features while their session is active.

THE shoppingMall SHALL require users to log in again if their session is terminated.

WHEN a user logs in, THE shoppingMall SHALL create a new session for that user.

WHEN a user logs out, THE shoppingMall SHALL terminate the user's current session.

### Logout Behavior

Users can end their session by logging out.

THE shoppingMall SHALL provide a logout function for authenticated users.

WHEN a user logs out, THE shoppingMall SHALL immediately terminate their session.

WHEN a session is terminated, THE shoppingMall SHALL require the user to authenticate again to access any platform features.

THE shoppingMall SHALL ensure that all user-specific data is no longer accessible after logout.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Customers can create an account by providing an email address and password during registration.

Sellers can create an account by providing an email address and password during registration.

When a seller registers, their account is created with a pending approval status.

Seller accounts require administrator approval before the seller can list products or sell on the platform.

Sellers can view their approval status, which may be pending, approved, or rejected.

If a seller registration is rejected, the seller can view the rejection reason provided by the administrator.

Rejected sellers can submit a new registration request to become an approved seller.

When a customer account is created, the customer can immediately use all platform features.

When a seller account is created, the seller can only view their profile and approval status until approved.

### Account Deletion

Customers can request to delete their account at any time.

When a customer deletes their account, their profile information is permanently deleted from the platform.

When a customer deletes their account, their order history is preserved for seller records and legal purposes.

When a customer deletes their account, their reviews are preserved but displayed as written by a deleted user.

Sellers can request to delete their account only if they have no pending orders with paid or shipped status.

Sellers can request to delete their account only if they have no pending cancellation or refund requests.

When a seller deletes their account, all their products are removed from search and category listings.

When a seller deletes their account, their order history and order snapshots are preserved for legal purposes.

When a seller deletes their account, their shop name is preserved in past order records.

When a seller deletes their account, their products are no longer purchasable.

### Password Change

Customers can change their password at any time while logged into their account.

Sellers can change their password at any time while logged into their account.

When changing a password, users must provide their current password and a new password.

After successfully changing their password, users are required to log in again with the new password.