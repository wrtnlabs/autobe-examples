**shoppingMall — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

Guests are unauthenticated users with no access to platform features. The platform requires registration to use any functionality, meaning guests cannot browse products, view categories, or access any content. All features are blocked until users create an account as either a customer or seller. Guests encounter access denied messages when attempting to view any platform content. No permissions are granted without completing the registration flow. Guests must register before any interaction with the platform is possible. This mandatory registration policy ensures all users are identifiable and accountable for their actions on the platform.

### Guest Access Restrictions

Guests are unauthenticated users with no access to any platform features. The platform enforces a mandatory registration policy where all users must create an account before accessing any functionality.

No anonymous browsing is permitted - guests cannot view products, browse categories, search for items, or access any content on the platform. Account creation is a prerequisite for all interactions, meaning users must register as either a customer or seller before any feature becomes available.

The platform implements an authentication gate requirement that blocks all unauthenticated requests. When guests attempt to access any platform content, they receive access denied messages directing them to register. No guest permissions exist in the system - every action requires authenticated identity.

Unauthenticated user limitations apply universally across the platform. All feature access is blocked until users complete the registration flow and log in. Platform access denial is enforced at every entry point. No exceptions exist to the feature access blocked policy - all platform capabilities remain unavailable until authentication is completed.

## member Actor

Members are registered customers with email and password credentials who can access all customer-facing features. Members can manage their profile including display name and phone number, and maintain multiple shipping addresses with one default. They can browse categories, search products across all sellers, and manage wishlists by adding or removing products. Members can add specific variants to their cart, modify quantities, and proceed through checkout with payment. They can view order history with full details and tracking information, and confirm delivery for shipments. Members can request cancellation for paid items and refunds for delivered items within 7 days. They can write, edit, and delete reviews for products they have purchased and received. Members can request to become administrators, change their password, and delete their account while preserving order history and reviews.

### Customer Account Management

Members can manage their customer account throughout its lifecycle. Members can change their password at any time. Members can delete their account, which removes their profile information including display name and phone number. When a member deletes their account, their orders and order history are preserved for seller records and legal purposes. Their reviews are preserved but shown as "deleted user". Account deletion does not affect order processing or seller access to historical order data.

### Profile and Address Management

Members can edit their profile information including display name and phone number. Members can add multiple shipping addresses to their account. Each address includes recipient name, phone number, street address, city, state/province, postal code, and country. Members can edit their existing addresses. Members can delete their addresses. Members can set one address as their default shipping address, which is automatically selected during checkout.

### Product Browsing and Discovery

Members can browse the list of all categories and subcategories. Members can view products within any category. Members can search products by name across all sellers. Members can filter search results by category, price range, and in-stock availability. Members can sort search results by newest first, price low to high, or price high to low. Members can view product detail pages showing all images, descriptions, variants, prices, stock status, and reviews.

### Wishlist Management

Members can add products to their wishlist. Members can view their wishlist, which is paginated. The wishlist shows products, not specific variants. Members can remove products from their wishlist. If a product is deleted by the seller, it is automatically removed from all member wishlists.

### Shopping Cart Operations

Members can add specific variants to their shopping cart by selecting a variant and specifying quantity. If the same variant is already in the cart, the quantities are combined. Members can view their cart showing each item with product name, variant options, price, quantity, and subtotal. Members can change the quantity of items in their cart. Members can remove items from their cart. The cart displays the total price of all items. If a variant's stock is less than the cart quantity, a warning is shown. If a variant is deleted or out of stock, it is marked as unavailable in the cart.

### Checkout and Payment

Members can proceed to checkout from their cart. Unavailable items cannot be checked out. Members must select a shipping address or use their default address. Members can review the order summary before placing the order, including list of items with prices, shipping address, and total price. Once an order is placed, the shipping address cannot be changed. Members confirm and place the order, which processes payment through an external payment gateway. If payment fails, the order is not created and members can retry. If payment succeeds, the order is created.

### Order History and Tracking

Members can view a list of all their orders, which is paginated and sorted by newest first. Each order in the list shows order number, date, total price, and overall order status. Members can view the full details of an order including list of items with product name, variant, quantity, price, and item status. Members can view the shipping address for each order. Members can view the list of shipments with tracking information for each order, showing which items are included in each shipment.

### Delivery Confirmation

Members can confirm delivery for each shipment. When a member confirms delivery, all items in that shipment change to status "delivered". If the member does not confirm delivery, items automatically change to "delivered" status after 14 days from the shipping date. Delivery confirmation is performed per shipment, not per individual item.

### Cancellation and Refund Requests

Members can request cancellation for individual order items with status "paid" (not yet shipped). Cancellation requests include a reason as text. Members can request a refund for individual order items with status "delivered". Refund requests include a reason as text. Refund requests can only be submitted within 7 days of the item being delivered. The seller of each item can approve or reject cancellation and refund requests.

### Review Writing Permissions

Members can write a review for products they have purchased. A review can only be written after the order item status is "delivered". Members can write one review per product per order. Each review includes a rating from 1 to 5 stars (required) and optional text content. Members can edit their own reviews. Members can delete their own reviews. Reviews are displayed on the product detail page and sorted by newest first. The product's average rating is calculated from all non-deleted reviews.

### Administrator Promotion Request

Members can submit a request to become an administrator. The request includes a reason as text. Super administrators can view the list of pending requests. Super administrators can approve or reject the request. When approved, the member becomes a regular administrator.

## seller Actor

Sellers are registered users with shop profiles who require administrator approval before selling. Sellers can view their approval status as pending, approved, or rejected, and see rejection reasons to resubmit requests. Approved sellers can edit their shop profile including name, description, and logo with snapshots created for each change. They can create and manage products with images, variants, and inventory records. Sellers can view their dashboard summary showing product counts and pending requests. They can view and filter order items for their products, create shipments with tracking information, and approve or reject cancellation and refund requests. Sellers can delete products and variants only when there are no pending orders or requests. Account deletion is restricted to sellers with no pending orders, cancellations, or refunds, and removes products while preserving order history. Sellers can be suspended by administrators which hides products but allows existing order processing.

### Seller Approval and Account Status

Sellers are registered users who require administrator approval before they can sell on the platform. Upon registration, a seller's approval status is pending. Sellers can view their current approval status at any time, which displays as pending, approved, or rejected. If rejected, sellers can view the rejection reason provided by the administrator. Rejected sellers may submit a new registration request to reapply. Only approved sellers have access to seller features including product management, inventory tracking, and order fulfillment. Pending and rejected sellers cannot create products, manage variants, or process orders until their approval status changes to approved.

### Shop Profile Permissions

Approved sellers have a shop profile consisting of a shop name, shop description, and logo image. Sellers have permission to edit their shop name, description, and logo at any time. Every edit to the shop profile creates an immutable snapshot that preserves the previous state for dispute resolution. Customers have permission to view seller profiles including the current shop name, description, and logo. When an order is placed, a snapshot of the seller's profile at that moment is saved with the order item to preserve the shop name and logo as they appeared at the time of purchase.

### Product and Variant Management Permissions

Approved sellers have permission to create products with a name, description, category, and base price. Each product belongs to the seller who created it. Sellers have permission to upload multiple images for each product, reorder images, and delete images from their products. Every product edit creates a snapshot preserving all product fields. Sellers have permission to add variants to their products, where each variant represents a specific combination of options with a unique SKU code, option values, optional price override, and stock quantity. Sellers have permission to edit variant details including SKU code, option values, and price. Every variant edit creates a snapshot. A product must have at least one variant to be purchasable. Products without variants are visible in search but marked as unavailable. Sellers have permission to view snapshots of their own products to see historical states.

### Inventory and Dashboard Access Permissions

Each product variant has its own stock quantity managed through inventory history records. Sellers have permission to add or subtract inventory with a quantity and reason. Order placement and cancellation or refund automatically create inventory records. Sellers have permission to view the complete inventory history for each variant showing all quantity changes with reasons and timestamps. Sellers have access to a dashboard showing a summary of their shop including total number of products, total number of order items for their products, number of pending cancellation requests, and number of pending refund requests. Sellers have permission to view a list of all order items for their products and filter these order items by status.

### Order Fulfillment and Response Authority

Sellers have permission to view order items for their products that require shipping. Sellers have authority to create shipments by selecting one or more of their order items and entering tracking information including carrier name and tracking number. All items in the same shipment share the same tracking information. When a shipment is created, all items in it change to shipped status. Sellers have authority to approve or reject cancellation requests for order items with paid status. Sellers have authority to approve or reject refund requests for order items with delivered status, provided the request is made within 7 days of delivery. When a seller responds to a cancellation or refund request, a snapshot of the request state is created. Approved cancellations and refunds restore the stock quantities for the affected variants via inventory records.

### Seller Account and Product Deletion

Sellers have permission to delete their own products only if there are no pending order items with paid or shipped status for any variant of the product, and there are no pending cancellation or refund requests for any variant of the product. Deleting a product also deletes all its variants and inventory records, and the product no longer appears in search or category listings. Product snapshots are preserved even after product deletion. Sellers have permission to delete variants only if there are no pending order items with paid or shipped status for that variant and no pending cancellation or refund requests for that variant. Sellers have permission to delete their account only if they have no pending orders with paid or shipped status and no pending cancellation or refund requests. When a seller deletes their account, their products are deleted from listings, but order history and snapshots are preserved, and their shop name in past orders remains visible. Administrators have authority to suspend seller accounts, which hides their products from search and category listings, prevents product purchases, and blocks creation or editing of products. Suspended sellers can still process existing orders by shipping items and responding to cancellation and refund requests. Administrators have authority to unsuspend seller accounts, making their products visible again.

## admin Actor

Regular administrators manage platform operations and user oversight with broad permissions. They can view and approve or reject pending seller registration requests with rejection reasons. Administrators can suspend and unsuspend seller accounts, which affects product visibility on the platform. They can create, edit, and delete categories and subcategories for product organization. Administrators can view all products across the platform including snapshots and delete any product for policy violations. They can view all orders and force-cancel or force-refund items or entire orders with automatic refunds and stock restoration. Administrators can view all customer and seller accounts, ban or unban customers, and ban sellers. Regular administrators cannot promote or demote other administrators as this requires super administrator privileges. They also cannot demote themselves from their administrator role.

### Seller Approval and Suspension

Administrators can view all pending seller registration requests. Administrators can approve seller registration requests, which grants the seller permission to create products and sell on the platform. Administrators can reject seller registration requests and must provide a rejection reason that the seller can view. Rejected sellers can submit a new registration request. Administrators can suspend seller accounts at any time. When suspended, the seller's products are hidden from search results and category listings and cannot be purchased. Suspended sellers retain access to their seller dashboard to process existing orders including shipping items and responding to cancellation and refund requests. Suspended sellers cannot create new products or edit existing products. Administrators can unsuspend seller accounts, which restores product visibility and allows the seller to create and edit products again.

### Category Management

Administrators can create new categories with a name and description. Administrators can create subcategories under existing categories with one level of nesting only. Administrators can edit category names and descriptions at any time. Administrators can delete categories. When a category is deleted, products previously in that category become uncategorized but remain visible on the platform. Customers can browse the list of all categories and view products within a category.

### Product Oversight

Administrators can view all products on the platform regardless of which seller created them. Administrators can view snapshots of any product to see historical changes. Administrators can delete any product for policy violations. When an administrator deletes a product, the product is removed from all listings and search results. Product snapshots are preserved even after administrator deletion for record-keeping purposes.

### Order Management

Administrators can view all orders on the platform regardless of customer or seller. Administrators can force-cancel individual order items or entire orders. When an administrator force-cancels an item, the refund is automatically processed for the customer and stock quantities are restored. Administrators can force-refund individual order items or entire orders. When an administrator force-refunds an item, the refund is automatically processed for the customer and stock quantities are restored. Force cancellation and force refund actions bypass the normal seller approval workflow.

### Customer Account Management

Administrators can view all customer accounts on the platform. Administrators can ban customer accounts. When a customer is banned, they cannot log in to the platform. Banned customers retain their order history and can still view past orders. Administrators can unban customer accounts, which restores login access. Banning a customer does not affect their existing orders or reviews.

### Seller Account Oversight

Administrators can view all seller accounts on the platform. Administrators can ban seller accounts. When a seller is banned, they cannot log in to the platform. Banned sellers retain their existing orders and must continue processing them including shipping items and responding to cancellation and refund requests. Banned sellers cannot create new products, edit existing products, or access seller dashboard features. Administrator ban authority over sellers is separate from suspension authority. Suspension affects product visibility while ban affects login access.

### Administrator Grade Limitations

Regular administrators cannot promote other administrators to super administrator grade. Regular administrators cannot demote other administrators from super administrator to regular administrator grade. Only super administrators can promote regular administrators to super administrator. Only super administrators can demote other super administrators to regular administrator. Super administrators cannot demote themselves from super administrator to regular administrator. This self demotion restriction ensures at least one super administrator maintains platform oversight capabilities.

## superAdmin Actor

Super administrators hold the highest privilege level on the platform with all regular admin permissions plus grade management capabilities. They can view pending administrator promotion requests and approve or reject them. Super administrators can promote regular administrators to super administrator grade and demote other super administrators to regular administrator grade. They cannot demote themselves to prevent privilege escalation gaps and ensure continuous super administrator presence. Super administrators perform all seller management operations including approvals and suspensions. They manage all categories, oversee all products with deletion authority, and oversee all orders with force cancellation and refund powers. They can view and manage all user accounts including banning customers and sellers. Super administrators have full platform oversight with the ability to manage administrator grades and promotion workflows.

### Super Administrator Privileges and Oversight

Super administrators hold the highest privilege level on the platform with comprehensive access to all administrative functions. They have full platform oversight including the ability to view and manage all seller accounts, customer accounts, products, categories, and orders. Super administrators can perform all operations available to regular administrators including seller approval management, seller suspension, category creation and editing, product oversight, and order oversight. They can force-cancel individual order items or entire orders and force-refund individual order items or entire orders. Super administrators can view all products on the platform and delete any product for policy violations. They can ban and unban both customer and seller accounts. Super administrators have access to view snapshots of any product for audit and dispute resolution purposes.

### Administrator Grade Management

Super administrators have exclusive authority to manage administrator grades on the platform. They can promote regular administrators to super administrator grade. They can demote other super administrators to regular administrator grade. Super administrators cannot demote themselves to regular administrator grade. This self-demotion prohibition ensures continuous super administrator presence on the platform and prevents privilege escalation gaps. Grade management operations are restricted to super administrators only. Regular administrators cannot promote or demote other administrators. The administrator grade management capability is a distinguishing feature that separates super administrators from regular administrators.

### Admin Promotion Request Workflow

Any user with a customer or seller account can submit a request to become an administrator. The promotion request includes a reason explaining why the user should become an administrator. Super administrators can view the list of pending administrator promotion requests. Super administrators can approve or reject each promotion request. When a promotion request is approved, the user becomes a regular administrator. When a promotion request is rejected, the request status is updated to reflect the rejection. The promotion request workflow is managed exclusively by super administrators. Regular administrators cannot view or process administrator promotion requests. All promotion requests are tracked with their status from submission through final decision.

### Self-Demotion Restriction

Super administrators are prohibited from demoting themselves to regular administrator grade. This restriction prevents scenarios where the platform could be left without any super administrators. The self-demotion prohibition is a privilege escalation prevention measure that ensures platform governance continuity. A super administrator who wishes to change their grade must be demoted by another super administrator. This restriction applies only to self-demotion. Super administrators can demote any other super administrator to regular administrator grade. The restriction cannot be bypassed through any alternative process. This ensures that at least one super administrator always retains the highest privilege level on the platform.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Customer Registration

Customers register for an account by providing an email address and creating a password.

The email address must be unique across all accounts on the platform (customers, sellers, and administrators).

Upon successful registration, the customer account is immediately active.

Registration is required to access any platform features — no guest browsing is permitted.

### Seller Registration

Sellers register for a seller account by providing an email address, creating a password, and submitting their shop name.

The email address must be unique across all accounts on the platform.

Upon submission, the seller registration enters a pending approval state.

Sellers cannot create products or sell until a regular administrator or super administrator approves their registration.

Sellers can view their approval status at any time.

If the registration is rejected, sellers can view the rejection reason and submit a new registration request with updated information.

### Login and Authentication

All users (customers, sellers, regular administrators, and super administrators) log in using their registered email address and password.

Upon successful authentication, users gain access to features based on their account type and permissions.

Session management and logout flows are defined in the Session and Logout unit.

Password change flows are defined in the Account Management unit.

Account deletion flows are defined in the Account Management unit.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session

After successful login, users are granted a session that allows access to authenticated features.

The session maintains the user's authenticated state while using the platform.

Users must have an active session to access features that require authentication.

If a session is no longer valid, users must log in again to access authenticated features.

### Logout

Users can log out to end their current session.

After logout, the user's session is terminated.

Logged out users cannot access features that require authentication.

After logout, users must log in again to access authenticated features.

Logout is available from any page where the user is authenticated.

### Account Security

Administrators can ban customers, which prevents the customer from logging in.

Administrators can unban customers, which restores login access.

Administrators can ban sellers, which prevents the seller from logging in.

Banned sellers cannot log in, but their existing orders remain active.

Administrators can unban sellers, which restores login access.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Customers can create accounts using email and password. Registration is required to access any platform features; guest browsing is not supported.

Sellers can create accounts using email and password. Seller accounts require administrator approval before the seller can list products or make sales. Upon submission, the seller account status is set to pending until an administrator reviews and approves or rejects the request.

Both customer and seller accounts use the same registration process with email and password credentials.

### Account Deletion

Customers can delete their accounts at any time. When a customer account is deleted:
- The customer's profile information (display name, phone number, addresses) is deleted
- Order history and order records are preserved for seller records and legal purposes
- Reviews written by the customer are preserved but displayed as authored by "deleted user"
- Wishlist items are deleted
- Cart contents are deleted

Sellers can delete their accounts only if all of the following conditions are met:
- No order items have pending status (paid or shipped) for any of the seller's products
- No cancellation requests are pending for any of the seller's order items
- No refund requests are pending for any of the seller's order items

When a seller account is deleted:
- All products listed by the seller are deleted from search and category listings
- Order history and order item snapshots are preserved
- The seller's shop name in past orders is preserved
- Product snapshots and seller profile snapshots remain accessible for dispute resolution

### Password Change

Customers can change their account password at any time. The customer must provide their current password to authorize the change.

Sellers can change their account password at any time. The seller must provide their current password to authorize the change.

After a successful password change, all active sessions are terminated and the user must log in again with the new password.