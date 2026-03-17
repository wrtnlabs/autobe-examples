**shoppingMall — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## customer Actor

Customers are registered users who can browse and purchase products on the platform. They have the ability to search for products, view product details, and add items to their wishlist. Customers can manage their shopping cart by adding variants with specific quantities and removing items as needed. They can proceed through checkout by selecting shipping addresses and confirming orders. After placing orders, customers can view their order history and track shipment status. They can request cancellations for items that have not yet shipped and request refunds for delivered items within the allowed timeframe. Customers can write reviews and ratings for products they have received. They can manage their profile information including display name and phone number. Customers can also submit requests to become administrators. Their access is limited to their own orders, reviews, wishlist, and cart data. Customers must be registered to use any platform features as guest browsing is not supported.

### Customer Identity and Access Scope

Customers are registered users who must complete account registration before accessing any platform features. Guest browsing is not supported; all users must authenticate to view products or use platform functionality.

Customers have access to their own personal data including profile information, addresses, orders, wishlist, cart, and reviews. Customers cannot access other users' personal data or orders.

Customers can view all publicly available products, categories, and seller profiles across the platform. Customer access is restricted to their own data for private operations such as orders, wishlist, cart, and reviews.

### Product Discovery and Wishlist

Customers can search for products by name across all sellers on the platform. Customers can filter search results by category, price range, and in-stock availability. Customers can sort search results by newest first, price low to high, or price high to low.

Customers can browse the list of all categories and view products within a category. Customers can view subcategories under parent categories.

Customers can add products to their personal wishlist. Customers can view their wishlist with pagination. Customers can remove products from their wishlist. If a product is deleted by the seller, it is automatically removed from all customer wishlists.

### Shopping Cart and Checkout

Customers can add product variants to their shopping cart by selecting a specific variant and specifying quantity. If the same variant is already in the cart, the quantities are combined rather than creating a separate line item.

Customers can view their cart showing each item with product name, variant options, price, quantity, and subtotal. Customers can change the quantity of items in their cart. Customers can remove items from their cart. The cart displays the total price of all items.

If a variant's stock is less than the cart quantity, a warning is shown to the customer. If a variant is deleted or out of stock, it is marked as unavailable in the cart.

Customers can proceed to checkout from their cart. Unavailable items cannot be checked out. Customers must select a shipping address or use their default address. Customers can review the order summary including list of items with prices, shipping address, and total price before placing the order. Once an order is placed, the shipping address cannot be changed.

### Order History and Status

Customers can view a list of all their orders with pagination, sorted by newest first. Each order in the list shows order number, date, total price, and overall order status.

Customers can view the full details of an order including list of items with product name, variant, quantity, price, and item status; shipping address; and list of shipments with tracking information showing which items are included in each shipment.

Customers can view the status of each order item. Order item statuses include paid, shipped, delivered, cancelled, and refunded. The overall order status is derived from its items and can be paid, shipped, delivered, cancelled, refunded, or partially completed for mixed states.

### Shipment Tracking

Customers can view tracking information for each shipment in their orders. Tracking information includes carrier name and tracking number.

Customers can confirm delivery per shipment. When the customer confirms delivery, all items in that shipment change to delivered status. If the customer does not confirm, items automatically change to delivered status after 14 days from shipping.

### Cancellation and Refund Rights

Customers can request cancellation for individual order items with paid status that have not yet been shipped. Cancellation requests include a reason as text. The seller of that item can approve or reject the cancellation request. If approved, that item is cancelled and refund is processed for that item only. Cancelled items restore their stock quantities. The remaining items in the order continue processing normally.

Customers can request a refund for individual order items with delivered status. Refund requests include a reason as text. Refund can be requested within 7 days of that item being delivered. The seller of that item can approve or reject the refund request. If approved, that item is refunded. Refunded items restore their stock quantities. The remaining items in the order are unaffected.

### Review and Rating Permissions

Customers can write a review for products they have purchased. A review can only be written after that item's status is delivered. Customers can write one review per product per order.

Each review has a rating from 1 to 5 stars which is required, and optional text content. Reviews are displayed on the product detail page sorted by newest first.

Customers can edit their own reviews. Customers can delete their own reviews. Product average rating is calculated from all non-deleted reviews.

### Profile and Address Management

Customers can edit their profile information including display name and phone number.

Customers can add multiple shipping addresses. Each address has recipient name, phone number, street address, city, state or province, postal code, and country. Customers can edit their addresses. Customers can delete their addresses. Customers can set one address as the default shipping address.

Password change and account deletion operations are defined in Module 3 Account Management.

### Administrator Request Eligibility

Customers can submit a request to become an administrator. The request includes a reason as text. The request status can be viewed by the customer. Super administrators review and approve or reject administrator requests. When approved, the customer becomes a regular administrator.

## seller Actor

Sellers are registered users who can list and sell products on the platform after administrator approval. They can create products with names, descriptions, categories, and base prices. Sellers can manage product images and reorder them as needed. They can create and edit product variants with SKU codes, option values, prices, and stock quantities. Sellers can manage inventory by adding restock records or adjusting for losses. They can view order items for their products and process shipments with tracking information. Sellers can respond to cancellation and refund requests from customers. They can view their shop dashboard with summaries of products, orders, and pending requests. Sellers can edit their shop profile including name, description, and logo. Their access is limited to their own products, orders, and shop data. Sellers can request account deletion if they have no pending orders or requests. Seller accounts require administrator approval before they can begin selling.

### Seller Registration and Approval

Sellers register with email and password. Seller accounts require administrator approval before they can sell on the platform. Sellers can view their approval status which shows pending, approved, or rejected. If rejected, sellers can view the rejection reason provided by the administrator. Rejected sellers can submit a new registration request. Sellers can only begin creating products and managing inventory after their account is approved.

### Product and Variant Management

Sellers can create products with a name, description, category, and base price. Products belong to the seller who created them. Sellers can edit their own products and every edit creates a snapshot. Sellers can upload multiple images for each product and reorder them, with the first image serving as the main thumbnail. Sellers can delete images from their products. Image changes are included in product snapshots. Sellers can create multiple variants for a product, each with a unique SKU code, option values such as color and size, an optional price override, and a stock quantity. Sellers can edit variant details including SKU code, option values, and price. Every variant edit creates a snapshot. A product must have at least one variant to be purchasable. Products with no variants are visible in search but shown as unavailable. Sellers can delete their own products only if there are no pending order items and no pending cancellation or refund requests for any variant. Deleting a product also deletes all its variants and inventory records.

### Inventory Management

Each variant has its own stock quantity managed through inventory history records. Sellers can add inventory by creating restock records with a quantity and reason. Sellers can subtract inventory by creating adjustment records for losses with a quantity and reason. Current stock is calculated by summing all inventory records. When stock reaches zero, the variant is shown as out of stock. Out of stock variants cannot be added to cart. Order placement automatically creates a negative inventory record. Order cancellation and refund automatically create positive inventory records. Sellers can view the full inventory history of each variant showing all quantity changes with reasons and timestamps.

### Order Processing and Shipping

Sellers can view order items for their products that need shipping. Sellers can create shipments by selecting one or more of their order items to include in a package. Different sellers always ship separately in different shipments. A seller can bundle multiple items into one shipment or ship items individually. Sellers enter tracking information for each shipment including carrier name and tracking number. All items in the same shipment share the same tracking information. When a shipment is created, all items in it change to shipped status. Sellers can only process shipments for their own products and cannot access order items from other sellers.

### Cancellation and Refund Handling

Sellers can view cancellation requests submitted by customers for order items with paid status. Sellers can approve or reject each cancellation request. When a seller responds, a snapshot of the request state is created. If approved, the item is cancelled and refund is processed for that item only. Cancelled items restore their stock quantities. Sellers can view refund requests submitted by customers for order items with delivered status. Refund requests can be made within 7 days of delivery. Sellers can approve or reject each refund request. When a seller responds, a snapshot of the request state is created. If approved, the item is refunded and stock quantities are restored. Sellers can monitor pending cancellation and refund requests through their dashboard.

### Shop Profile Management

Each seller has a shop profile with a shop name, shop description, and logo image. Sellers can edit their shop name, description, and logo. Every edit creates a snapshot to preserve the previous state. Customers can view seller profiles. Shop profile snapshots are preserved and can be viewed by the seller and administrators for dispute resolution. The shop name in past orders is preserved even if the seller changes it later.

### Dashboard and Monitoring

Sellers can view a dashboard summary of their shop showing the total number of products, total number of order items for their products, number of pending cancellation requests, and number of pending refund requests. Sellers can view a list of all order items for their products. Sellers can filter order items by status. Sellers can view snapshots of their own products. The dashboard provides sellers with an overview of their shop performance and pending actions requiring their attention.

### Seller Permissions and Access Boundaries

Sellers can only access and manage their own products, variants, inventory records, and order items. Sellers cannot view or modify products, inventory, or order items belonging to other sellers. Sellers can view their own shop profile and edit it. Sellers can view their own product snapshots. Sellers cannot access customer personal information beyond what is needed for order fulfillment such as shipping address and recipient name. Sellers can request account deletion only if they have no pending orders in paid or shipped status and no pending cancellation or refund requests. When a seller deletes their account, their products are deleted from listings but order history and snapshots are preserved. Their shop name in past orders is preserved.

## admin Actor

Administrators are users with elevated permissions to manage the platform. They can view and approve or reject seller registration requests with reasons. Administrators can suspend or unsuspend seller accounts, affecting product visibility. They can create, edit, and delete categories and subcategories. Administrators can view all products on the platform and access product snapshots. They can delete any product for policy violations. Administrators can view all orders and force-cancel or force-refund items or entire orders. They can view customer and seller account lists. Administrators can ban or unban customers and ban sellers. They can view pending administrator requests and approve or reject them. Their access spans all platform data for oversight purposes. Regular administrators can be promoted to super administrator grade by super administrators.

### Admin Role and Platform Access

Administrators have elevated permissions to manage and oversee the platform. They can access all platform data for oversight and policy enforcement purposes. Their access spans customer accounts, seller accounts, products, orders, and categories. Administrators can view any record on the platform regardless of ownership. They enforce platform policies through account actions, content moderation, and order interventions. Regular administrators operate under the oversight of super administrators, who can promote or demote their administrator grade.

### Seller Management

Administrators can view the list of pending seller registration requests. They can approve or reject seller registrations. When rejecting a seller registration, administrators must provide a rejection reason. Administrators can view all seller accounts on the platform. They can suspend seller accounts. When a seller is suspended, their products are hidden from search and category listings and cannot be purchased. Suspended sellers can still process existing orders, including shipping items and responding to cancellation and refund requests. Suspended sellers cannot create new products or edit existing products. Administrators can unsuspend seller accounts, making their products visible again. Administrators can ban seller accounts. Banned sellers cannot log in to the platform. Existing orders from banned sellers remain in the system for processing.

### Category Management

Administrators can create categories and subcategories. Each category has a name and description. Subcategories can be created under existing categories, with one level of nesting allowed. Administrators can edit category names and descriptions. Administrators can delete categories. When a category is deleted, products in that category become uncategorized but remain in the system.

### Product Oversight

Administrators can view all products on the platform, regardless of which seller owns them. They can access product snapshots for any product to review historical changes. Administrators can delete any product for policy violations. When an administrator deletes a product, the product is removed from listings. Product snapshots are preserved even after deletion for record-keeping purposes.

### Order Oversight

Administrators can view all orders on the platform. They can force-cancel individual order items or entire orders. When an order item is force-cancelled, the customer receives a refund and the stock quantity is restored via an inventory record. Administrators can force-refund individual order items or entire orders. When an order item is force-refunded, the stock quantity is restored via an inventory record. These interventions override normal order status workflows.

### Customer and Seller Account Management

Administrators can view all customer accounts on the platform. They can ban customer accounts. Banned customers cannot log in to the platform. Administrators can unban customer accounts, restoring their access. Administrators can view all seller accounts on the platform. They can ban seller accounts. Banned sellers cannot log in to the platform, but their existing orders remain in the system for processing.

### Administrator Request Review

Administrators can view the list of pending administrator requests submitted by users. Super administrators can approve or reject administrator requests. When approved, the requesting user becomes a regular administrator. Regular administrators cannot approve or reject administrator requests; this capability is restricted to super administrators.

## superAdmin Actor

Super administrators hold the highest level of permissions on the platform. They possess all capabilities of regular administrators. Super administrators can promote regular administrators to super administrator grade. They can demote other super administrators to regular administrator grade. Super administrators cannot demote themselves. They can view all pending administrator requests. Super administrators can approve or reject requests to become administrators. Their access includes all platform data and administrator management functions. Super administrators oversee the administrator hierarchy and grade changes. They maintain full system administration capabilities across all platform areas.

### Super Administrator Grade and Identity

Super administrators hold the highest administrator grade on the platform. They possess elevated permissions above regular administrators. Super administrators have the highest access level to all platform data and functions. Their elevated permissions include all capabilities available to regular administrators plus additional administrator management functions. Super administrators are identified by their super administrator grade in the system. This grade distinguishes them from regular administrators and grants them authority over administrator hierarchy management.

### Administrator Grade Management

Super administrators can promote regular administrators to super administrator grade. Super administrators can demote other super administrators to regular administrator grade. Super administrators cannot demote themselves to regular administrator grade. This self-demotion restriction ensures at least one super administrator maintains system oversight. Grade change authority is exclusive to super administrators. Regular administrators cannot promote or demote other administrators. Administrator hierarchy management is controlled solely by super administrators. All grade changes are recorded with the promotion date or demotion date.

### Administrator Request Processing

Super administrators can view the list of all pending administrator requests. Each request includes the reason submitted by the requesting user. Super administrators can approve requests to become administrators, granting the user regular administrator grade. Super administrators can reject requests to become administrators. When rejecting a request, super administrators may provide a rejection reason. Request processing is handled exclusively by super administrators. Regular administrators cannot approve or reject administrator requests. Super administrators can view the list of all administrators on the platform, including their grades and promotion dates.

### Super Administrator Capabilities

Super administrators have full system administration capabilities across all platform areas. They possess all permissions available to regular administrators for seller management, category management, product oversight, order oversight, and user management. Super administrators have platform-wide oversight of all operations and data. Their superadmin role permissions include administrator management functions that regular administrators do not have. Super administrators can view all administrator accounts and manage the administrator hierarchy. All system administration functions are accessible to super administrators. Their elevated permissions enable complete platform governance and administrator oversight.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Customer Registration

Customers can register for an account by providing an email address and password.
Registration is required to use any platform features; guest browsing is not supported.
The email address must be unique across all customer and seller accounts.
The password must meet security requirements defined by the platform.
Upon successful registration, the customer account is immediately active and can be used to log in.
If the email address is already in use, the registration request is rejected.
If the password does not meet requirements, the registration request is rejected.

### Seller Registration

Sellers can register for a seller account by providing an email address and password.
The email address must be unique across all customer and seller accounts.
Seller accounts require administrator approval before the seller can create products or sell items.
Upon registration, the seller account status is set to pending approval.
Sellers can view their approval status at any time.
If the registration is rejected, sellers can view the rejection reason provided by the administrator.
Rejected sellers can submit a new registration request with updated information.
If the email address is already in use, the registration request is rejected.
If the password does not meet requirements, the registration request is rejected.

### User Login

Customers and sellers can log in using their registered email address and password.
Login authentication verifies the provided credentials against stored account information.
Upon successful login, the user gains access to features permitted for their account type.
Customers can access browsing, shopping, and order management features.
Sellers with approved status can access product management and order fulfillment features.
Sellers with pending or rejected status cannot create products or manage inventory.
If the email address is not found, the login request is rejected.
If the password is incorrect, the login request is rejected.
If the account is banned by an administrator, the login request is rejected.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

After successful login, users maintain an authenticated session that allows access to account-specific features.

The session remains active until the user logs out, the account is banned by an administrator, or the account is deleted.

When a new login occurs for an account, any existing session for that account is terminated.

Users cannot access account-specific features without an active session.

### Logout

Users can log out from their account at any time.

Logging out terminates the current session immediately.

After logout, users must re-authenticate with email and password to access account features.

All pending operations are completed before session termination.

Logging out does not affect any orders, cart items, or saved data associated with the account.

### Account Security

When an administrator bans a customer or seller account, the user cannot log in and any existing session is terminated.

Banned customers cannot access any platform features.

Banned sellers cannot log in but their existing orders remain in the system for processing.

When a user deletes their account, all sessions are immediately terminated and login becomes impossible.

If a seller account deletion request is submitted while sessions are active, those sessions remain valid until the deletion is approved and processed.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create either a customer account or a seller account by providing an email address and password.

The platform requires registration to access any features. Guest browsing is not supported.

When creating a customer account, the user provides an email address and password. The account is activated immediately upon successful registration.

When creating a seller account, the user provides an email address and password. The seller account requires administrator approval before the user can sell products. The seller can view their approval status (pending, approved, or rejected). If rejected, the seller can view the rejection reason and submit a new registration request.

Each email address can be used for only one account. If the email address is already registered, the request is rejected.

### Account Deletion

Customers can delete their customer account at any time.

When a customer account is deleted:
- The customer's profile information (display name and phone number) is deleted
- The customer's orders and order history are preserved for seller records and legal purposes
- The customer's reviews are preserved but displayed as "deleted user"

Sellers can delete their seller account only if all of the following conditions are met:
- The seller has no pending orders (orders with items in paid or shipped status)
- The seller has no pending cancellation requests
- The seller has no pending refund requests

If any condition is not met, the deletion request is rejected.

When a seller account is deleted:
- The seller's products are deleted from listings and no longer appear in search or category pages
- Order history and order snapshots are preserved
- The seller's shop name in past orders is preserved
- The seller's profile snapshots are preserved

### Password Change

Customers can change their account password at any time.

Sellers can change their account password at any time.

When changing a password, the user must provide their current password and the new password.

If the current password is incorrect, the request is rejected.

After a successful password change, all existing sessions are terminated and the user must log in again with the new password.