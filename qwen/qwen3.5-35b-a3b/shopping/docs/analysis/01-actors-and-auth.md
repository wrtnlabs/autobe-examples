**ecommerceMall — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

The platform does not allow browsing or any feature access without registration. Users must first register as a member before they can view products or interact with the platform. Guests are blocked from searching products, viewing product details, or accessing any platform features. Their access is essentially limited to the registration and login pages only. This restriction ensures that all platform interactions are tied to identifiable accounts for transaction tracking and accountability.

### Unregistered User Access

Unregistered users cannot access any platform features or content.

The platform requires registration before any interaction is permitted. Users who have not created an account are considered unregistered users and are restricted from viewing products, searching, or browsing the platform.

Unregistered users can only access the registration page and the login page. All other platform functionality is blocked until the user registers or logs in with an existing account.

If an unregistered user attempts to access any protected page or feature, the system blocks the request and directs them to either the registration page (if they don't have an account) or the login page (if they may have an existing account).

### Platform Access Restriction

The platform enforces strict access restrictions on all unregistered users.

No browsing or feature access is permitted without a registered account. This restriction applies to all platform functionality including product discovery, shopping, and seller interactions.

Unregistered users cannot:
- Search for products
- View product details or images
- Browse product categories
- View seller profiles or shops
- View reviews or ratings
- Add items to a cart or wishlist
- Place orders
- Access order history or tracking
- Contact sellers or support

The only exceptions are the registration and login pages, which are accessible to anyone without authentication. This restriction ensures all platform interactions are tied to identifiable accounts for transaction tracking, dispute resolution, and accountability.

### Registration and Login Page Access

The registration and login pages are the only pages accessible to unregistered users.

Registration Page Access:
- Unregistered users can access the registration page to create a new account
- Registration requires providing an email address and creating a password
- After successful registration, the user is automatically logged in and gains full platform access
- Registration is the first step before any platform interaction

Login Page Access:
- Unregistered users can access the login page to sign in with an existing account
- Login requires providing an email address and password
- After successful login, the user gains full platform access
- Users who may have forgotten their registration can use the login page

If an unregistered user attempts to access any page other than registration or login, they are redirected to one of these two pages based on their intent.

### No Guest Browsing

The platform does not allow guest browsing in any form.

Guest users cannot view products, search items, or explore the platform without first registering an account. This restriction is enforced at the page level, preventing any accidental access to product or seller information.

Products and their details are not visible to guests:
- Product names and descriptions are hidden
- Product images are not displayed
- Product prices are not shown
- Product categories are not browsable
- Product search results are not accessible
- Seller shop names and profiles are not visible

Reviews, ratings, and any other user-generated content are also hidden from guest users. The platform's design requires all interactions to be associated with a registered account.

If a guest user tries to access a product page directly (for example, through a bookmarked URL or shared link), they are blocked and redirected to the registration or login page.

### Feature Access Blocked

All platform features are blocked for unregistered users except registration and login.

Shopping Features (Blocked for Guests):
- Shopping cart: Cannot add or view items
- Wishlist: Cannot add or view wishlisted products
- Checkout: Cannot proceed to purchase
- Order placement: Cannot create orders
- Order history: Cannot view past orders or shipments

Discovery Features (Blocked for Guests):
- Product search: Cannot search by name or filters
- Category browsing: Cannot browse categories or subcategories
- Product listings: Cannot view product lists or details
- Product images: Cannot view product image galleries

Account Features (Blocked for Guests):
- Profile viewing: Cannot view customer or seller profiles
- Address management: Cannot add or view shipping addresses
- Payment: Cannot access payment processing
- Notifications: Cannot receive platform notifications

Reviews and Seller Interactions (Blocked for Guests):
- Review writing: Cannot write or view reviews
- Seller contact: Cannot contact sellers
- Reviews viewing: Cannot view seller shops or reviews

The only features available to unregistered users are account creation and authentication (registration and login).

## member Actor

Customers who register with email and password become members and gain full access to shopping features. Members can search and browse products across all sellers, view detailed product information, and add items to their shopping cart. They manage their own profile including display name and phone number, and can maintain multiple shipping addresses with one set as default. Members create orders, view comprehensive order history, and track shipments through delivery confirmation. They can also build wishlists, write reviews for delivered products, and manage cancellation or refund requests for their purchases.

### Member Identity and Registration

Registered customers who have signed up with email and password become members of the platform. Members can access all shopping features, while unregistered users (guests) cannot browse or use any platform functionality until they complete registration. A member account is required for all platform interactions including product browsing, cart management, order placement, and review writing.

### Shopping Platform Access

Members can search and browse products across all sellers, view detailed product information, and add variants to their shopping cart. Members can view all categories and products within categories. Members can access product detail pages showing images, descriptions, variants, prices, seller information, and reviews. Members can view products in search results with thumbnail images, names, base prices, seller shop names, and average ratings.

### Profile Overview

Each member has a profile that includes a display name and phone number. These are the only editable profile fields for members. The display name is the name shown to other users on the platform, including in reviews and order information.

### Display Name Updates

Members can update their display name at any time. The new display name is applied immediately and reflected across the platform in reviews, order information, and seller communications. Previous display names are not preserved.

### Phone Number Management

Members can update their phone number at any time. The updated phone number is used for shipping address verification and customer support contact. The new phone number replaces the previous one entirely.

### Address Management

Members can add multiple shipping addresses to their account. Each address includes a recipient name, phone number, street address, city, state/province, postal code, and country. Members can edit any address to update any field. Members can delete addresses they no longer need.

### Address Selection for Orders

When placing an order, members must select one of their saved shipping addresses. The selected address becomes the delivery destination for the order. Once an order is placed, the shipping address cannot be changed.

### Default Address Management

Members can designate one address as their default shipping address. When checkout requires address selection, the default address is pre-selected. Members can change which address is default at any time.

### Order Creation Process

Members can create orders by adding variants to their cart, specifying quantities, and proceeding through checkout. During checkout, members review the order summary showing items, prices, shipping address, and total price. Members confirm the order and payment is processed. Orders cannot be placed without successful payment processing.

### Order History Viewing

Members can view a paginated list of all their orders, sorted by newest first. Each order in the list displays the order number, date, total price, and overall order status. Members can view full order details including items with product names, variants, quantities, prices, and individual item statuses. Members can view shipping address, shipments with tracking information, and which items are included in each shipment.

### Shipment Tracking

Members can view tracking information for each shipment in their orders. Tracking information includes carrier name and tracking number. Members can see which items are included in each shipment.

### Delivery Confirmation Process

Members can confirm delivery for each shipment. When delivery is confirmed, all items in that shipment change to delivered status. If members do not confirm delivery, items automatically change to delivered status 14 days after the shipment date.

### Wishlist Management

Members can add products to their wishlist. The wishlist is paginated and shows products (not specific variants). Members can view their entire wishlist. Members can remove products from their wishlist at any time. If a product is deleted by the seller, it is automatically removed from all member wishlists.

### Product Review Process

Members can write a review for a product after the corresponding order item status is delivered. Members can write one review per product per order. Reviews include a rating from 1 to 5 stars (required) and optional text content. Reviews are displayed on the product detail page sorted by newest first. Members can edit their own reviews at any time. Each edit creates a snapshot preserving the previous state. Members can delete their own reviews, but snapshots are preserved. Product average rating is calculated from all non-deleted reviews.

### Cancellation Request Management

Members can request cancellation for individual order items with status paid (not yet shipped). Cancellation requests must include a reason in text format. The seller of that item can approve or reject the cancellation request. When a seller responds, a snapshot of the request state is created. If approved, the item is cancelled, refund is processed for that item only, and stock quantities are restored. The remaining items in the order continue processing normally. If all items in an order are cancelled, the entire order status becomes cancelled.

### Refund Request Management

Members can request a refund for individual order items with status delivered. Refund requests must include a reason in text format. Refund can only be requested within 7 days of that item being delivered. The seller of that item can approve or reject the refund request. When a seller responds, a snapshot of the request state is created. If approved, the item is refunded, and stock quantities are restored. The remaining items in the order are unaffected. If all items in an order are refunded, the entire order status becomes refunded.

## seller Actor

Sellers register with email and password but must wait for administrator approval before they can begin selling. They view their approval status as pending, approved, or rejected, and see rejection reasons if their application was denied. Once approved, sellers create and manage their products with variants, upload product images, and manage inventory levels. They process customer orders by creating shipments with tracking information and respond to cancellation and refund requests from customers. If suspended by an administrator, their products become hidden from search but they can still process existing orders.

### Seller Registration and Approval Process

Sellers can register for an account using email and password.

After registration, the seller account enters a pending approval status. In this state, the account exists but cannot be used to create products, manage inventory, or process orders.

Administrators review seller registration requests and either approve or reject them.

Sellers can view their current approval status, which shows one of three possible states: pending, approved, or rejected.

### Rejection Handling and Re-registration

When a seller registration is rejected, the account remains in rejected status.

Sellers can view the specific reason provided by the administrator for their rejection.

Sellers with rejected accounts can submit a new registration request to become sellers again.

When a new registration is submitted, the process restarts with a pending approval status awaiting administrator review.

### Product and Variant Management Permissions

Sellers with approved status can create new products for their shop.

Each product requires a name, description, category assignment, and base price to be created.

Sellers can add multiple variants to each product. Each variant represents a specific option combination with its own SKU code, option values, price, and stock quantity.

Sellers can edit their existing products and variants. Every edit preserves the previous state by creating a snapshot.

A product must have at least one variant to be purchasable by customers.

### Inventory Management Responsibilities

Each product variant has its own stock quantity that tracks available inventory.

Sellers can add stock to a variant by restocking, specifying the quantity and reason for the addition.

Sellers can subtract stock from a variant due to adjustments, loss, or other business reasons, specifying the quantity and reason.

When an order is placed, stock is automatically decreased for the purchased variants.

When a cancellation or refund is approved, stock is automatically restored for those variants.

Sellers can view the complete inventory history for each variant, showing all stock changes with their reasons and timestamps.

### Order Fulfillment and Shipment Creation

Sellers can view order items for their products that require shipping.

When shipping items, sellers select one or more order items from their products to include in a single shipment.

Sellers enter tracking information for each shipment, including the carrier name and tracking number.

All items included in the same shipment share identical tracking information and status.

When a shipment is created, all order items in that shipment change their status to shipped.

Sellers can choose to ship items individually or bundle multiple items from the same order into one shipment.

### Cancellation and Refund Request Response

Sellers can view cancellation requests submitted by customers for their order items.

When a customer requests cancellation, the seller can approve or reject the request.

When the seller responds to a cancellation request, a snapshot of the request state is created.

If approved, the item is cancelled, stock is restored, and the customer receives a refund for that item only.

Sellers can view refund requests submitted by customers for delivered order items.

Refund requests can only be made within 7 days of the item's delivery date.

When a customer requests a refund, the seller can approve or reject the request.

When the seller responds to a refund request, a snapshot of the request state is created.

If approved, the item is marked as refunded, stock is restored, and the customer receives a refund.

### Suspended Seller Status Restrictions

Administrators can suspend seller accounts for policy violations or other reasons.

When a seller is suspended, their products are hidden from customer search results and category listings.

Suspended sellers cannot create new products or edit existing products.

Suspended sellers cannot add variants or modify existing variants.

However, suspended sellers can still process existing orders, including creating shipments with tracking information.

Suspended sellers can still respond to customer cancellation and refund requests for their products.

Administrators can unsuspend seller accounts, which makes their products visible in search and category listings again.

### Product and Seller Account Deletion

Sellers can request to delete their account from the platform.

Account deletion is only allowed if the seller has no pending orders with paid or shipped status.

Account deletion is only allowed if the seller has no pending cancellation or refund requests.

If a seller has no orders or requests in progress, the account deletion request can be submitted.

When a seller account is deleted, their products are removed from public listings.

Order history and order snapshots are preserved for legal and record-keeping purposes.

The seller's shop name in past orders is preserved, even after account deletion.

Sellers can also delete their own products only if there are no pending order items with paid or shipped status and no pending cancellation or refund requests. Deleting a product also removes all its variants and inventory records.

## administrator Actor

Administrators manage seller registrations by reviewing and approving or rejecting seller applications with detailed reasons. They can suspend seller accounts to hide products from search while allowing existing order fulfillment to continue. Administrators create and manage categories and subcategories for product organization. They have platform-wide oversight to view all products, orders, and user accounts. They can delete products for policy violations, view snapshots of any product, and take forceful actions on orders including cancellation and refunds.

### Seller Approval Management

Administrators can view a list of all pending seller registration requests.
Each pending request shows the seller's email address and submission date.
When reviewing a request, the administrator can approve or reject it.
If the request is approved, the seller account becomes active and the seller can begin listing products.
If the request is rejected, the administrator must provide a detailed rejection reason explaining why the application was denied.
The rejection reason is communicated to the seller and displayed in the seller's account.
Rejected sellers can submit a new registration request after viewing the rejection reason.
Once a seller registration is approved or rejected, it cannot be modified; a new request must be submitted for changes.

### Seller Suspension Management

Administrators can suspend seller accounts when policy violations or other serious issues occur.
When a seller account is suspended:
- All their products are hidden from search results and category listings
- Their products cannot be purchased by customers
- They can still log in to their seller account
- They can continue processing existing orders (shipping items, responding to cancellation and refund requests)
- They cannot create new products or edit existing products
- Their existing orders remain visible to customers
When the issue is resolved, administrators can unsuspend the seller account.
Upon unsuspension, all the seller's products become visible in search and category listings again.
The seller can immediately resume creating and editing products.
Suspension and unsuspension actions are logged for audit purposes.

### Product Oversight

Administrators have platform-wide authority to view all products created by any seller.
They can view product details including name, description, category, base price, images, and variants.
Administrators can access and view snapshots of any product at any point in time.
Snapshot viewing allows administrators to see all changes made to a product over time.
This includes viewing product variants, option values, and prices at specific moments in history.
This oversight capability supports dispute resolution and policy enforcement.
Product oversight does not modify product data; it provides read-only access to all platform products.

### Product Deletion Authority

Administrators have the authority to delete products from the platform.
This authority is exercised when products violate platform policies or other serious violations occur.
When an administrator deletes a product:
- The product no longer appears in search results or category listings
- The product cannot be purchased
- The product remains in the seller's product list but is marked as deleted
- All product variants are also deleted
- All inventory records for the deleted variants are preserved for historical reference
- Snapshots of the product are preserved and remain viewable by administrators
- Any existing order items that reference the product are unaffected
- Orders containing the deleted product remain valid and fulfillable.
Deleted products can be reviewed by administrators through snapshot viewing.

### Category Management

Administrators have exclusive authority to create, edit, and delete categories and subcategories.
When creating a category, the administrator specifies a name and description.
When creating a subcategory, the administrator selects a parent category; subcategories can only be one level deep.
When editing a category, the administrator can update its name and description.
When deleting a category, any products that were in that category become uncategorized.
Deleted categories are preserved and cannot be recovered.
Products that become uncategorized after category deletion remain visible in search results.
Administrators can view the list of all categories and subcategories on the platform.

### Order Oversight

Administrators have platform-wide authority to view all orders placed by any customer.
They can access order details including all order items, shipping addresses, shipments, and tracking information.
Administrators can view orders across all sellers without restriction.
This oversight capability supports dispute resolution, policy enforcement, and platform monitoring.
Administrators can filter and search orders to find specific transactions.
Order viewing includes access to all order snapshots that preserve transaction state at the time of purchase.

### Order Cancellation Authority

Administrators have the authority to force-cancel individual order items or entire orders.
This authority is exercised for policy violations, fraudulent transactions, or other serious issues.
When an order item is force-cancelled:
- The order item status changes to cancelled
- The customer is refunded for that item
- Stock quantities are restored through inventory records
- The cancellation is recorded with the administrator's action
When an entire order is force-cancelled, all items in the order are cancelled.
The customer receives a full refund for all items.
Remaining items in an order continue processing normally when individual items are cancelled.
Force-cancellation actions are logged for audit purposes.

### Order Refund Authority

Administrators have the authority to force-refund individual order items or entire orders.
This authority is exercised for policy violations, customer disputes, or other issues requiring intervention.
When an order item is force-refunded:
- The order item status changes to refunded
- The customer receives a refund for that item
- Stock quantities are restored through inventory records
- The refund is recorded with the administrator's action
When an entire order is force-refunded, all items in the order are refunded.
Remaining items in an order continue processing normally when individual items are refunded.
Force-refund actions are logged for audit purposes.

### User Account Viewing

Administrators can view all customer accounts on the platform.
Customer account viewing includes access to customer profile information, order history, and wishlist.
Administrators can view all seller accounts on the platform.
Seller account viewing includes access to seller profile information, approval status, and product listings.
This viewing capability provides platform-wide visibility for monitoring and enforcement.
User account viewing is read-only and does not modify user data.
Administrators can search and filter user accounts to find specific users.

### Customer Ban Management

Administrators have the authority to ban customer accounts.
When a customer account is banned:
- The customer cannot log in to their account
- They retain access to their order history (read-only)
- They cannot place new orders or add items to their cart
- Their existing orders and transactions remain valid
- Their reviews and wishlist remain visible but cannot be modified
When the issue is resolved, administrators can unban the customer account.
Upon unbanning, the customer can immediately log in and resume normal platform activity.
Ban and unban actions are logged for audit purposes.

### Seller Ban Management

Administrators have the authority to ban seller accounts.
When a seller account is banned:
- The seller cannot log in to their account
- Their existing orders remain valid and customers can continue purchasing
- They cannot create new products or edit existing products
- Their products remain hidden from search and category listings
- Their seller profile is hidden from customers
When the issue is resolved, administrators can unban the seller account.
Upon unbanning, the seller can immediately log in and resume normal platform activity.
All previously created products become visible again.
Ban and unban actions are logged for audit purposes.

### Snapshot Viewing

Administrators have the authority to view snapshots of any product on the platform.
Snapshot viewing provides historical records of all product changes over time.
Each snapshot captures the complete state of a product at a specific moment in time.
Snapshots include product name, description, category, base price, images, and all variants.
Administrators can view snapshots of seller profiles showing shop name, description, and logo changes.
Administrators can view snapshots of order items showing product and seller state at purchase time.
Administrators can view snapshots of reviews showing rating and content at creation or edit time.
Administrators can view snapshots of cancellation requests showing reason and status changes.
Administrators can view snapshots of refund requests showing reason and status changes.
All snapshots are immutable and cannot be deleted or modified.

## superAdministrator Actor

Super administrators have elevated privileges above regular administrators including the ability to manage administrator roles and privileges. They approve or reject administrator access requests from both customers and sellers who wish to become administrators. Super administrators can promote regular administrators to super administrator status and demote other super administrators to regular administrator level. They maintain ultimate platform oversight and cannot demote themselves to prevent power concentration. All other administrator functions are available to them with additional authority over the administrator system.

### Administrator Grade Management

Super administrators can promote regular administrators to super administrator status, granting elevated privileges for managing other administrators. Super administrators can demote super administrators back to regular administrator level, reducing their authority. Super administrators cannot demote themselves to prevent a single point of power failure. Grade changes take effect immediately upon approval. The administrative hierarchy consists of regular administrator and super administrator grades only.

### Administrator Request Review

Super administrators can view a complete list of all pending administrator access requests submitted by customers and sellers. Super administrators can approve administrator access requests, converting the requester to regular administrator status. Super administrators can reject administrator access requests and must provide a written reason for the rejection. When a request is rejected, the requester can submit a new administrator access request at any time.

### Self-Demotion Restriction

Super administrators are prohibited from initiating their own demotion to regular administrator status. This restriction applies at all times and cannot be overridden. The system validates this restriction before processing any self-demotion attempt. If a self-demotion is attempted, the system rejects the action and notifies the super administrator of this restriction.

### Platform Oversight Authority

Super administrators have platform-wide authority over all seller management operations including approval, rejection, suspension, and unsuspension of seller accounts. Super administrators have platform-wide authority over category creation, editing, and deletion. Super administrators have platform-wide authority to view and delete any product on the platform. Super administrators have platform-wide authority to view all orders and force-cancel or force-refund individual items and entire orders. Super administrators have platform-wide authority to view all user accounts and ban or unban customers and sellers. All regular administrator functions are available to super administrators with these additional privileges.

### Administrator Access Management

Super administrators have exclusive control over administrator access permissions that regular administrators do not possess. Regular administrators cannot view or approve administrator access requests. Regular administrators cannot promote or demote other administrators. Regular administrators have standard administrative functions limited to their assigned authority scope. Super administrators have full visibility into all administrative actions and decisions. Super administrators maintain control over the administrative hierarchy structure.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Customer Registration

Any user may create a customer account by providing an email address and password.

The email address must be in valid email format and will be used as the account identifier for login.

The password must be provided during registration.

After registration, the user becomes a customer member with access to shopping features.

### Customer Login

Customer members may log in using their registered email address and password.

The system validates the email and password combination.

Upon successful authentication, the user is granted access to all customer features.

### Seller Registration

Any user may create a seller account by providing an email address and password.

The email address must be in valid email format and will be used as the account identifier for login.

The password must be provided during registration.

After registration, the seller account is placed in "pending" status and requires administrator approval before the seller can list products or fulfill orders.

The seller may view their approval status at any time.

### Seller Approval Status

Sellers can view their account approval status, which can be one of: pending, approved, or rejected.

While the status is "pending", the seller cannot list products or fulfill orders.

While the status is "approved", the seller may list products and fulfill orders.

While the status is "rejected", the seller cannot list products or fulfill orders, but may view the rejection reason provided by the administrator.

### Rejected Seller Resubmission

If a seller's registration request is rejected, the seller may submit a new registration request.

The seller must provide new registration credentials (email and password) when resubmitting.

The new request will be processed as a pending approval request by an administrator.

### Seller Login

Seller members may log in using their registered email address and password.

The system validates the email and password combination.

If the seller account status is "approved", the seller is granted access to all seller features.

If the seller account status is "pending" or "rejected", the login attempt is rejected with an appropriate message.

### Customer Account Deletion

Customer members may delete their account.

When a customer deletes their account:
- Their profile information is deleted
- Their orders and order history are preserved for seller records and legal purposes
- Their reviews are preserved but shown as "deleted user"

After account deletion, the customer cannot log in.

### Seller Account Deletion

Seller members may delete their account only if they have no pending orders (orders with paid or shipped status) and no pending cancellation or refund requests.

If there are pending orders or requests, the deletion is rejected.

When a seller deletes their account:
- Their products are deleted from listings
- Order history and snapshots are preserved
- Their shop name in past orders is preserved

After account deletion, the seller cannot log in.

### Password Change

Customer members may change their password.

Seller members may change their password.

The user must provide their current password and the new password.

The system validates that the new password is accepted and updates the account credentials.

### Administrator Role Request

Any user (customer or seller) may submit a request to become an administrator.

The request includes a reason (text) for the request.

Super administrators can view the list of pending administrator requests.

Super administrators can approve or reject requests.

When approved, the user becomes a regular administrator.

### Administrator Role Promotion

Super administrators may promote regular administrators to super administrator.

Super administrators may demote super administrators to regular administrator.

Super administrators cannot demote themselves.

### Session Management

Upon successful login, the user is granted an active session.

The session remains active until the user logs out or the session expires.

The user may log out to terminate the session and invalidate the authentication credentials.

### Guest Access Restriction

Guests (unregistered users) cannot browse the platform or use any features.

Registration is required before any platform features can be accessed.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

A session represents an authenticated user's active access to the platform.

A session is created when a customer or seller successfully logs in with their email and password.

The session remains active while the user is logged in and using the platform.

Users with an active session can access features assigned to their actor role.

Guests (unregistered users) cannot create sessions and cannot access platform features.

Only registered customers and sellers can create sessions through authentication.

If authentication fails (incorrect email or password), no session is created.

### Logout

Customers and sellers can log out of their account at any time.

When a user logs out, their session is terminated.

After logout, the user must log in again to access any platform features.

Logged-out users are treated as guests and cannot access restricted features.

The system provides a logout option visible to all logged-in users.

### Account Security

Customers and sellers can change their account password.

To change a password, the user must provide their current password.

After successfully changing the password, the user remains logged in with the new password.

Customer accounts can be deleted at any time by the customer.

When a customer deletes their account, their profile information (display name and phone number) is removed, but their orders and order history are preserved for seller records and legal purposes.

Seller accounts can be deleted only if there are no pending orders with paid or shipped status and no pending cancellation or refund requests.

When a seller deletes their account, their products are removed from listings, but order history and snapshots are preserved.

Administrator accounts cannot be deleted by the account holder.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Customer Registration

**Account Creation**

A person can create a customer account by providing an email address and password. The email address must be unique across all users. Upon successful registration, the person becomes a registered customer with shopping privileges.

**Registration Validation**

When a registration request is submitted:
- If the email address is already in use, the request is rejected
- If the email address and password are provided, a new customer account is created
- The customer can immediately log in after successful registration

### Seller Registration

**Account Creation with Approval Requirement**

A person can create a seller account by providing an email address and password. The email address must be unique across all users. Upon registration, the person becomes a seller account with pending approval status.

**Registration Validation**

When a seller registration request is submitted:
- If the email address is already in use, the request is rejected
- If the email address and password are provided, a new seller account is created with pending approval status

**Approval Status Display**

A seller can view their approval status at any time:
- Pending: the registration request is under administrator review
- Approved: the seller can list products and receive orders
- Rejected: the seller cannot sell; the rejection reason is displayed

**Rejection Handling**

If a seller registration is rejected:
- The seller can view the rejection reason provided by the administrator
- The seller can submit a new registration request
- Multiple registration attempts are allowed until approval is granted

### Customer Login

**Authentication**

A registered customer can log in to the platform using their email address and password. Upon successful authentication, the customer gains access to all member shopping features.

**Login Validation**

When login credentials are submitted:
- If the email address does not exist in the system, the request is rejected
- If the password is incorrect for the provided email address, the request is rejected
- If the customer account has been banned by an administrator, the login attempt is rejected
- If the email address and password are both correct, the customer is logged in

### Seller Login

**Authentication**

A registered seller can log in using their email address and password. Upon successful authentication, the seller gains access to the seller dashboard.

**Login Validation by Status**

When seller login credentials are submitted:
- If the email address does not exist in the system, the request is rejected
- If the password is incorrect for the provided email address, the request is rejected
- If the seller account is in pending approval status, the seller can view approval status but cannot list products or fulfill orders
- If the seller account is approved, full seller privileges are granted
- If the seller account is rejected, the seller can log in but cannot sell products
- If the seller account is suspended by an administrator, the seller can log in but cannot create new products or edit existing products; however, existing orders can still be processed
- If the seller account is banned by an administrator, the login attempt is rejected

### Administrator Login

**Authentication**

A registered administrator can log in using their email address and password. Upon successful authentication, the administrator gains access to administrative functions.

**Login Validation**

When administrator login credentials are submitted:
- If the email address does not exist in the system, the request is rejected
- If the password is incorrect for the provided email address, the request is rejected
- If the administrator account has been banned, the login attempt is rejected
- If the email address and password are both correct, the administrator is logged in

**Role-Based Access**

The access granted depends on the administrator grade:
- Regular administrator: can manage sellers, categories, products, orders, and users
- Super administrator: has all regular administrator privileges plus administrator role management

### Password Change

**Password Modification**

Any logged-in user (customer, seller, or administrator) can change their password.

**Change Validation**

When a password change request is submitted:
- The user must provide their current password for verification
- If the current password is incorrect, the request is rejected
- If the new password is provided, the password is updated
- If the new password matches the current password, the request is rejected

**Session Impact**

Upon successful password change:
- The user remains logged in with their existing session
- All other active sessions for the same account are invalidated and require re-authentication

### Customer Account Deletion

**Account Termination**

A registered customer can delete their customer account.

**Deletion Validation**

When a customer account deletion request is submitted:
- The customer must confirm their password for verification
- If the password is incorrect, the request is rejected
- If the customer account has been banned, the deletion request is rejected
- If the password verification succeeds, the customer account is deleted

**Effects of Deletion**

When a customer account is deleted:
- The customer profile information (display name, phone number) is deleted and cannot be recovered
- All order records and order history are preserved for business and legal purposes
- All reviews written by the deleted customer remain visible on products but are displayed as "deleted user" instead of the customer's name
- The customer cannot log in with the deleted account after deletion
- The deleted email address cannot be used to create a new account
- The customer's shipping addresses are deleted

### Seller Account Deletion

**Account Termination with Prerequisites**

A registered seller can delete their seller account only if all deletion prerequisites are met.

**Deletion Prerequisites**

The seller must have no pending conditions:
- No orders with paid or shipped status in the seller's order items
- No pending cancellation requests for the seller's order items
- No pending refund requests for the seller's order items

**Deletion Validation**

When a seller account deletion request is submitted:
- The system verifies all deletion prerequisites are met
- If any prerequisite is not met, the request is rejected with a list of blocking conditions
- The seller must confirm their password for verification
- If the password is incorrect, the request is rejected
- If the password verification succeeds and all prerequisites are met, the seller account is deleted

**Effects of Deletion**

When a seller account is deleted:
- All products owned by the seller are deleted from platform listings
- All product variants and inventory records for the seller are deleted
- Order history and order records are preserved for business purposes
- The seller's shop name in past orders is preserved as it appeared at the time of purchase
- The seller cannot log in with the deleted account after deletion
- The deleted email address cannot be used to create a new seller account
- All seller approval requests are removed

### Administrator Request

**Request to Become Administrator**

Any registered user (customer or seller) can submit a request to become an administrator.

**Request Submission**

When an administrator request is submitted:
- The user must provide a reason for the request
- The request is submitted with status pending
- Super administrators can view the list of pending requests
- Super administrators can approve or reject requests
- When approved, the user becomes a regular administrator
- When rejected, the user can view the rejection and may submit a new request

### Session Management

**Session Lifecycle**

When a user logs in, an active session is created that persists across multiple actions and requests.

**Session Behaviors**

- Sessions are created upon successful authentication
- Sessions can be explicitly terminated by logging out
- Sessions are invalidated when the user changes their password
- Sessions are invalidated when the user account is deleted
- Sessions are invalidated when the user account is banned
- Multiple active sessions can exist for the same user across different devices or browsers

**Inactive Session Handling**

When a period of inactivity exceeds the timeout threshold:
- The session is automatically terminated
- The user is redirected to the login page
- Re-authentication is required to continue using the platform

### Logout

**Session Termination**

Any logged-in user can explicitly log out to terminate their session.

**Logout Behavior**

When a logout request is submitted:
- The active session is terminated immediately
- The user is redirected to a non-authenticated state
- The user cannot resume the previous session; re-authentication is required
- If multiple sessions exist, logout terminates the current session only