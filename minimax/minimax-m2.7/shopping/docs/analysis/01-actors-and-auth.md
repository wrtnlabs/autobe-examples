**ecommerceMall — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

The guest actor represents an unauthenticated visitor to the platform. This platform requires registration to access any features, meaning guests cannot browse products, view categories, or access any content without first creating an account. The guest role exists purely as a pre-authentication state and carries no permissions beyond viewing a registration or login page. Guests cannot perform any business operations such as viewing product details, adding items to cart, or accessing their own data. The system enforces this by requiring successful authentication before granting access to any protected resources. The guest actor has no access to administrative functions, seller features, or customer-specific features. Any attempt to access protected routes without authentication redirects the user to the login or registration page. This strict requirement ensures all platform activities are tied to verified user accounts.

### Guest Identity Definition

The guest actor represents an unauthenticated visitor to the platform. Guests have not provided valid credentials and exist in a pre-authentication state. They can only access public-facing pages that do not require user identity, such as the login page, registration page, and password reset request page. Any attempt to access protected resources redirects guests to the authentication flow.

### Pre-Authentication State

The guest actor exists in a pre-authentication state, meaning the system has not verified their identity. In this state, guests have no associated account data, no personal information stored, and no session established. The system treats all guest requests as originating from the same unauthenticated entity. This pre-authentication state persists until the guest successfully completes the registration or login process.

### Registration Required to Browse

This platform requires registration before accessing any functional features. Guests cannot browse products, view categories, search for items, or view product details without first creating an account and logging in. This registration requirement applies universally to all content areas including the homepage, category listings, and search results. No guest browsing capability exists on this platform.

### Guest Access Restrictions

Guests cannot perform any business operations on the platform. The following actions are restricted to authenticated users only and are not available to guests: viewing product listings, reading product descriptions, adding items to a wishlist, adding items to a shopping cart, placing orders, viewing order history, writing reviews, managing shipping addresses, managing a wishlist, or accessing seller profiles. Guests also cannot access any seller functionality, administrator features, or customer-specific features.

### Authentication Gate Enforcement

The system enforces authentication gates before allowing access to any protected resources. When a guest attempts to access a protected route, the system intercepts the request and determines the user is unauthenticated. The guest is then redirected to the login page or registration page. After successful authentication, guests are redirected back to their originally intended destination. Authentication gate enforcement applies to all routes except the public authentication-related pages.

### Redirect Behavior for Unauthenticated Users

Guests who attempt to access protected pages without authentication are automatically redirected. The redirect destination is typically the login page with a return URL parameter that preserves the intended destination. After successfully logging in or registering, the guest is returned to the page they originally requested. If a guest accesses a page that requires a specific role they do not have, they may see an access denied message or be redirected to an appropriate page.

### Guest Permissions Summary

The guest role carries no permissions beyond accessing public authentication pages. The following table summarizes guest access:

| Resource Type | Guest Access |
|---------------|--------------|
| Login page | Allowed |
| Registration page | Allowed |
| Password reset request page | Allowed |
| Product listings | Denied |
| Category browsing | Denied |
| Product search | Denied |
| Product details | Denied |
| Shopping cart | Denied |
| Wishlist | Denied |
| Checkout | Denied |
| Order history | Denied |
| Customer profile | Denied |
| Seller dashboard | Denied |
| Administrator pages | Denied |

## customer Actor

The customer actor represents a registered user who purchases products on the platform. Customers must register with a valid email address and password before accessing any platform features. Once authenticated, customers can manage their own profile information including display name and phone number. Customers can add, edit, delete, and set default shipping addresses for their orders. The customer role enables browsing product categories, searching for products, and viewing product details including images, descriptions, variants, and seller information. Customers can maintain a wishlist of products they are interested in and manage a shopping cart with specific product variants. At checkout, customers select a shipping address, review their order, and confirm payment to create an order. Customers can view their complete order history, track shipments, and confirm deliveries. After receiving items, customers can request cancellation for paid items or request refunds for delivered items within the allowed timeframe. Customers can also write, edit, or delete reviews for products they have purchased. When a customer deletes their account, their profile is removed but orders and reviews are preserved under a "deleted user" designation.

### Customer Registration

Customers must register with a valid email address and password before accessing any platform features. Registration requires the customer to provide an email address that will serve as their unique identifier and a password for authentication. Upon successful registration, the customer receives an authenticated session enabling access to all customer features. The platform does not allow guest browsing; all product viewing, purchasing, and account management requires a registered account.

### Customer Profile Management

Authenticated customers can view and update their own profile information. The profile consists of a display name and phone number. Customers can change their display name and phone number at any time. The customer's email address cannot be changed after registration as it serves as the unique identifier for the account.

### Shipping Address Management

Customers can maintain multiple shipping addresses for use during checkout. Each address includes a recipient name, phone number, street address, city, state or province, postal code, and country. Customers can add new addresses, edit existing addresses, and delete addresses they no longer need. Customers can designate one address as their default shipping address, which is automatically selected during checkout unless they choose a different address.

### Product Browsing and Search

Authenticated customers can browse the platform's category hierarchy and search for products. Customers can view the list of all top-level categories and their subcategories. When viewing a category, customers can see all products assigned to that category and its subcategories. Customers can also search for products by entering keywords in the search field. Search results display products from all sellers on the platform. Customers can view the full details of any product including all images, description, variants with prices and availability, seller information, and existing reviews.

### Wishlist Operations

Customers can add products they are interested in to their wishlist for future reference. Customers can view their complete wishlist showing all saved products. Each product appears once in the wishlist regardless of how many times it was added. Customers can remove products from their wishlist when they no longer wish to save them. When a seller deletes a product, that product is automatically removed from all customer wishlists.

### Shopping Cart Management

Customers can add specific product variants to their shopping cart. When adding an item, the customer must select a particular variant and specify the desired quantity. If the same variant is already in the cart, the quantities are combined rather than creating a separate cart entry. Customers can view their complete cart showing each item with its product name, variant options, price, quantity, and line subtotal, along with the cart total. Customers can change the quantity of items in their cart or remove items entirely. The cart displays a warning if the quantity in the cart exceeds the available stock for a variant.

### Order Placement and Checkout

Customers can proceed to checkout from their shopping cart. At checkout, customers must select a shipping address from their saved addresses or use their default address. The customer reviews the complete order summary including all items, their individual prices, the shipping address, and the total amount. Customers confirm and place the order by providing payment information. Payment is processed through an external payment gateway. If payment fails, the order is not created and the customer can retry. If payment succeeds, the order is created with all items removed from the cart and stock quantities decreased accordingly.

### Order History and Tracking

Customers can view their complete order history showing all past orders. The order list displays the order number, date, total price, and overall status for each order. Customers can view the full details of any order including all items with their product names, variant options, quantities, prices, and individual item statuses. The order detail also shows the shipping address used and all shipments with their tracking information. Customers can confirm delivery for shipments once they have received the items.

### Cancellation and Refund Requests

Customers can request cancellation for individual order items that have not yet been shipped. Cancellation requests must include a reason explaining why the cancellation is requested. Customers can request refunds for individual order items that have been delivered. Refund requests must include a reason and can only be submitted within seven days of the item being marked as delivered. Customers can view the status of their cancellation and refund requests. If a request is approved, the customer receives a refund for that item. If rejected, the request is marked as rejected with no refund processed.

### Product Reviews and Ratings

Customers can write reviews for products they have purchased. A review can only be written after the item has been delivered. Customers can write one review per product per order. Each review consists of a rating from one to five stars and optional text content. Customers can edit their own reviews to update the rating or text. Customers can delete their own reviews. Deleted reviews are removed from public display but any snapshots taken during review edits are preserved. Reviews appear on the product detail page sorted by most recent first.

### Customer Account Deletion

Customers can delete their own account from the platform. When a customer deletes their account, their profile information including display name and phone number is permanently removed. The customer's orders and order history are preserved to support seller records and legal compliance. The customer's reviews are preserved but displayed with "deleted user" as the author name rather than the original display name. After account deletion, the customer cannot log in and all associated sessions are terminated.

## seller Actor

The seller actor represents a business owner who sells products on the platform. Sellers must register with email and password, but their accounts require administrator approval before they can list products or conduct sales. A seller can check their approval status which can be pending, approved, or rejected with a reason provided for rejections. Rejected sellers may submit a new registration request. Sellers manage their own shop profile including shop name, description, and logo image, with all edits creating immutable snapshots. The seller role enables creating products with name, description, category, and base price, as well as uploading and reordering product images. Sellers can create and manage product variants with unique SKU codes, option values, prices, and stock quantities. Inventory management allows sellers to restock, adjust, or view the complete history of inventory changes for each variant. Sellers can view orders containing their products, ship items with tracking information, and respond to cancellation or refund requests from customers. The seller dashboard provides summaries including product count, order statistics, and pending request counts. Sellers can only delete their account if they have no pending orders or pending requests. When deleted, their products are removed but order history and shop name in past orders are preserved.

### Seller Registration and Approval

Sellers register on the platform by providing their email address and a password. Unlike customer accounts, seller accounts require administrator approval before they can perform any selling activities. Upon registration, the seller's account is set to a pending approval status. A seller cannot create products, upload images, or process orders until their registration has been approved by an administrator. The registration process captures the seller's email and password credentials for authentication.

### Approval Status and Rejection Handling

Sellers can check their current approval status at any time. The approval status indicates whether the seller is pending review, approved, or rejected. When an administrator rejects a seller registration, a reason for the rejection is provided to the seller. Rejected sellers can view the rejection reason and may submit a new registration request for administrator review. This allows sellers to address any issues and reapply for selling privileges.

### Shop Profile Management

Each seller has a shop profile containing their shop name, shop description, and logo image. Sellers can update their shop name, description, and logo at any time. Every time a seller edits their shop profile, an immutable snapshot is created that preserves the previous state of the profile. These snapshots record when the change was made, what was changed, and the values before and after the edit. Sellers can view the history of their profile changes through these snapshots. All customers can view seller shop profiles when browsing products.

### Product Creation and Editing

Approved sellers can create products on the platform. Each product requires a name, description, category assignment, and base price. Products are automatically associated with the seller who created them. Sellers can edit the details of their own products including name, description, category, and base price. Every time a seller edits a product, an immutable snapshot is created that preserves the complete state of the product at that moment. Sellers can view the history of changes made to their products through these snapshots. Sellers cannot edit products belonging to other sellers.

### Product Image Management

Sellers can upload multiple images for each of their products. Images can be reordered to change which image appears as the main or thumbnail image. Sellers can delete images from their products. Image changes are included when product snapshots are created, ensuring the complete visual history of a product is preserved.

### Product Variant Management

A product can have multiple variants, where each variant represents a specific combination of selectable options such as color and size. Each variant requires a unique SKU code identifier, option values specifying what combination it represents, and a stock quantity. Variants may optionally override the product's base price with their own pricing. Sellers can add new variants to their products, edit existing variant details, or remove variants. Every time a seller edits a variant, an immutable snapshot is created preserving that variant's state. A product must have at least one variant to be purchasable by customers.

### Inventory Management

Each product variant maintains its own stock quantity tracked through inventory history records. Sellers can add inventory to variants by restocking with a specified quantity and a reason for the restock. Sellers can subtract inventory from variants by making adjustments with a specified quantity and a reason for the adjustment. When customers place orders, inventory is automatically decreased. When orders are cancelled or refunded, inventory is automatically restored. Sellers can view the complete inventory history of each variant showing all changes, the reasons for those changes, and when they occurred. The current stock quantity is calculated by summing all inventory records.

### Order Fulfillment and Shipping

Sellers can view all order items that contain their products. When preparing to ship, sellers select one or more of their order items to include in a shipment. For each shipment, sellers enter the carrier name and tracking number. Multiple items from the same seller can be bundled into a single shipment. When a shipment is created, all items within that shipment change to a shipped status. Customers can view the tracking information for their shipments and confirm delivery.

### Cancellation and Refund Request Response

Sellers can view cancellation requests from customers for items with a paid status. Sellers can approve or reject these requests. When a seller responds to a cancellation request, a snapshot is created preserving the state of the request. Upon approval, the item is cancelled and a refund is processed for that specific item only. Sellers can also view refund requests from customers for delivered items. Sellers can approve or reject refund requests within the allowed timeframe. When a seller responds to a refund request, a snapshot is created. Upon approval, the item is refunded.

### Seller Dashboard

Sellers have access to a dashboard that displays a summary of their shop performance. The dashboard shows the total number of products the seller has listed. The dashboard shows the total number of order items across all orders containing the seller's products. The dashboard shows the number of pending cancellation requests awaiting the seller's response. The dashboard shows the number of pending refund requests awaiting the seller's response. Sellers can view a detailed list of all order items for their products and can filter this list by item status.

### Seller Account Deletion

A seller can only delete their account when specific conditions are met. The seller must have no pending orders with a paid or shipped status for any of their products. The seller must have no pending cancellation requests or pending refund requests for any of their products. When a seller deletes their account, their products are removed from all listings and search results. However, all order history is preserved including snapshots of products and seller profiles at the time of purchase. The seller's shop name is preserved in past order records. Sellers cannot delete their account while these conditions are not satisfied.

## admin Actor

The administrator actor represents a trusted user who moderates and manages the platform. Any registered user can submit a request to become an administrator, which includes providing a reason for the request. Regular administrators are approved by super administrators and have broad oversight capabilities across the platform. Administrators can manage the seller approval workflow, approving or rejecting seller registration applications with reasons for rejections. Administrators have the authority to suspend and unsuspend seller accounts, which hides their products from search and prevents new purchases while allowing existing orders to be processed. For content management, administrators can create, edit, and delete categories and subcategories, and they can delete any product on the platform for policy violations. Administrators can view all orders on the platform and force-cancel or force-refund individual items or entire orders, which automatically processes refunds and restores stock. For user management, administrators can view all customer accounts and ban or unban customers, preventing them from logging in. Administrators can also view and ban seller accounts while preserving existing order data. Administrators cannot approve themselves as sellers or other administrators, and they do not have the ability to promote other users to administrative roles.

### Administrator Request Submission

Any user on the platform can submit a request to become an administrator. The request must include a reason explaining why the user wants to become an administrator and what they intend to do with the role. Users who are already administrators cannot submit additional requests. Users who are banned cannot submit administrator requests. The request is reviewed by super administrators, who can approve or reject it. When a request is rejected, the user may submit a new request at a later time.

### Seller Approval Workflow

Administrators can view the list of all seller registration applications that are pending approval. For each pending application, administrators can see the seller's email address and the reason they provided during registration. Administrators can approve a pending seller application, which changes the seller's status to approved and allows the seller to begin selling on the platform. Administrators can reject a seller application with a required reason. Rejected sellers can view the rejection reason and may submit a new registration request. Administrators cannot approve their own seller account or any account they own.

### Seller Account Suspension

Administrators can suspend seller accounts that violate platform policies. When a seller is suspended, their products are hidden from search results and category listings. Suspended sellers cannot create new products or edit existing products. Customers cannot purchase from suspended sellers. Suspended sellers can still process existing orders, including shipping items and responding to cancellation or refund requests. Administrators can unsuspend a seller account, which immediately restores their products to search results and category listings and allows purchases again.

### Category and Subcategory Management

Administrators can create new categories on the platform. When creating a category, administrators must provide a name and may provide a description. Administrators can create subcategories by specifying a parent category. Subcategories can only be one level deep. Administrators can edit existing category names and descriptions. Administrators can delete categories. When a category is deleted, any products assigned to that category become uncategorized rather than being deleted.

### Product Deletion for Policy Violations

Administrators can view all products listed on the platform, including products from any seller. Administrators can view the complete details of any product. Administrators can access product snapshots to see the history of changes made to any product. When a product violates platform policies, administrators can delete it. Deleted products are removed from search results and category listings. Product snapshots are preserved even after deletion for dispute resolution.

### Order Oversight and Force Actions

Administrators can view all orders placed on the platform, including order details and status. For individual order items, administrators can force-cancel them, which immediately processes a refund and restores the stock quantity for that item. Administrators can force-refund individual order items, which processes the refund and restores stock. Administrators can force-cancel all items in an entire order, which processes refunds for all items and restores stock quantities. Administrators can force-refund all items in an entire order, which processes refunds for all items and restores stock.

### Customer Account Viewing and Banning

Administrators can view all customer accounts on the platform. The view includes the customer's email address, registration date, and account status. Administrators can ban a customer account. Banned customers cannot log in to the platform. When a customer is banned, their profile information and personal data are preserved. Administrators can unban a customer account, which restores the customer's ability to log in.

### Seller Account Viewing and Banning

Administrators can view all seller accounts on the platform. The view includes the seller's email address, shop name, approval status, and suspension status. Administrators can ban a seller account. Banned sellers cannot log in to the platform. When a seller is banned, all existing orders involving that seller are preserved with their historical data. Banned sellers cannot process new orders. Administrators can unban a seller account, which restores the seller's ability to log in and resume operations.

### Administrator Limitations and Boundaries

Administrators cannot approve their own account as a seller. Administrators cannot approve their own request to become an administrator. Administrators cannot promote other users to any administrative role. Only super administrators have the authority to promote users to administrator roles. Administrators cannot demote other administrators or super administrators. Administrators cannot access or modify another administrator's personal account settings. Administrators cannot reverse suspension actions performed by other administrators.

## superAdmin Actor

The super administrator actor represents the highest authority level in the platform's administrative hierarchy. Super administrators possess all permissions granted to regular administrators plus exclusive privileges for managing the administrative team itself. A super administrator can view and act on pending administrator requests, approving or rejecting applications to become an administrator. The super administrator role includes the exclusive ability to promote regular administrators to super administrator status, elevating their privileges to the highest level. Similarly, super administrators can demote other super administrators down to regular administrator status, but they cannot demote themselves. This self-protection prevents the platform from being left without a super administrator. The super administrator can perform all oversight functions including managing sellers, viewing orders, handling user accounts, and managing categories and products. All administrative actions taken by super administrators are logged and subject to the same snapshot principles as other editable data on the platform. The super administrator serves as the ultimate arbiter for platform governance decisions.

### Highest Authority Level

The super administrator occupies the highest authority level within the platform's administrative hierarchy. This role encompasses all permissions granted to regular administrators and additional exclusive privileges related to administrative team governance. The super administrator serves as the ultimate authority for platform governance decisions and cannot be superseded by any other role.

The super administrator is the only actor permitted to view pending administrator requests submitted by customers or sellers who wish to become administrators. Upon reviewing such requests, the super administrator may approve or reject them based on platform governance criteria.

### Exclusive Privileges

The super administrator possesses exclusive privileges that no other role can exercise:

- Approving or rejecting requests to become an administrator
- Promoting regular administrators to super administrator status
- Demoting other super administrators to regular administrator status

These privileges constitute the administrative team management functions and are not available to any other actor, including regular administrators.

### Administrator Request Approval

When a user submits an administrator request, it enters a pending state until a super administrator acts upon it. The super administrator can review the reason provided in the request and make an approval determination.

If approved, the requesting user becomes a regular administrator with standard administrative privileges.

If rejected, the request is denied and the user may not resubmit without super administrator discretion.

### Promotion to Super Administrator

The super administrator can promote any regular administrator to super administrator status. Upon promotion, the elevated administrator gains all super administrator privileges including the ability to manage the administrative team themselves.

Promotion creates a record of the role change for audit and governance purposes.

### Demotion from Super Administrator

The super administrator can demote any other super administrator to regular administrator status. This action removes the target's super administrator privileges and restricts them to standard administrative functions only.

A super administrator cannot demote themselves. This self-demotion prevention ensures the platform always retains at least one super administrator with full authority.

### Platform Oversight Capabilities

The super administrator maintains oversight capabilities across the entire platform:

- Can manage sellers including approval, rejection, suspension, and unsuspension
- Can view and manage all orders and can force-cancel or force-refund order items
- Can manage categories and products including deletion for policy violations
- Can view all customer accounts and can ban or unban customers
- Can view all seller accounts and can ban or unban sellers
- Can access any product snapshot for dispute resolution

These oversight capabilities ensure the super administrator can govern all platform operations.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Customer Registration

Customers must register with an email address and password before they can access any platform features. The email address serves as the unique identifier for the account and cannot be changed after registration. The password must be provided during registration and is stored securely.

Guests are not allowed to browse products or view any content without first registering and logging in. Registration creates a new customer account and automatically creates an empty wishlist and empty shopping cart for the new customer.

### Seller Registration

Sellers must register with an email address and password to create a seller account. The email address serves as the unique identifier for the account. Upon registration, the seller account is created with a status of "pending" and cannot perform any selling activities until approved by an administrator.

Sellers can view their current approval status at any time. If the registration is rejected, the seller can view the rejection reason provided by the administrator. Rejected sellers may submit a new registration request to try again.

### Customer Login

Registered customers can log in to the platform using their email address and password. The system validates the provided credentials against the stored account information. Upon successful validation, the customer gains access to their account and associated features including their wishlist, shopping cart, and order history.

If the provided email address does not match any existing account, the login attempt is rejected with an error message indicating the credentials are incorrect. If the provided password does not match the stored password for that email, the login attempt is rejected.

### Seller Login

Registered sellers can log in to the platform using their email address and password. The system validates the provided credentials and checks the seller's approval status. Sellers with "pending" status can log in but cannot access selling features. Sellers with "approved" status can access all selling features. Sellers with "rejected" status can log in to view their status and resubmit a registration request.

Banned sellers cannot log in to the platform. Suspended sellers can log in but their products are hidden from customers and they cannot create or edit products.

### Authentication Validation

All login attempts must validate that the provided email address matches an existing account and that the provided password matches the stored password for that account. Both conditions must be satisfied for a successful login.

The system must handle multiple failed login attempts gracefully without locking the account. The system must not reveal whether an email address exists in the system when login fails, for security purposes.

Passwords are not case-sensitive during comparison but email addresses are case-sensitive.

### Single Authentication Mechanism

Both customers and sellers use the same login mechanism based on email and password. The system distinguishes between account types based on the registered email address and associated account role. The same email cannot be registered as both a customer and a seller.

Administrators log in using the same email and password mechanism as customers and sellers. Super administrators have additional privileges that regular administrators do not have.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Lifecycle

A session begins when a user successfully logs into the platform. The session remains active as long as the user continues to interact with the platform. Each user type (customer, seller, administrator, super administrator) maintains their own session with appropriate access levels based on their role.

Sessions are tied to the authenticated user and cannot be shared or transferred between accounts. When a customer logs in, they have access to customer features. When a seller logs in, they have access to seller features. Sellers with pending or rejected approval status have limited access until approved.

The session retains the user's identity and role throughout its duration, allowing the user to perform authorized actions without re-authenticating for each operation.

### Logout Behavior

When a user chooses to log out, their current session is terminated immediately. The user is redirected to the public login page and must authenticate again to access protected features.

Logging out clears the user's session from the browser or device. Any unsaved changes in progress during logout may be lost, as the session data is discarded upon logout.

Users can log out from any page where the logout option is accessible in their account menu. The logout action is immediate and does not require confirmation.

### Password Change

Users can change their account password at any time while logged in. To change the password, the user must provide their current password for verification, then enter and confirm the new password.

Password changes are processed immediately. After a successful password change, the user's current session remains active and they do not need to log in again.

Sellers can change their password through their account settings. The same verification requirements apply as for customers.

### Session Security on Password Change

When a user changes their password, all existing sessions on other devices are automatically terminated for security purposes. Only the current session where the password was changed remains active. This ensures that if someone else had gained access to another session, they are logged out when the legitimate owner changes the password.

This automatic session termination applies to all user types including customers, sellers, and administrators. Users who are unexpectedly logged out after a password change should contact support if they did not initiate the change.

### Account Suspension and Session Access

Sellers whose accounts have been suspended by an administrator cannot establish a new session. When a suspended seller attempts to log in, the login is rejected and they receive a message that their account has been suspended. Suspended sellers cannot access any seller features including product management, order processing, or dashboard views.

Administrators can unsuspend a seller account. Once unsuspended, the seller can log in normally and regain access to all seller features.

### Account Banning and Session Denial

Administrators and super administrators can ban customer accounts. Banned customers cannot log in to the platform. When a banned customer attempts to log in, authentication is denied and they receive notification that their account has been banned.

Banned sellers similarly cannot log in. Their existing orders remain intact and are processed by the platform, but the banned seller cannot access their seller account.

Banned users can be unbanned by administrators, after which they regain the ability to log in.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

## Customer Registration

Customers must register before they can use any features of the platform. Registration requires providing an email address and a password. The email address must be unique across the platform. Upon successful registration, the customer account is immediately active and the customer can log in.

## Seller Registration

Sellers must register before they can list products for sale. Registration requires providing an email address and a password. The email address must be unique across the platform. Upon registration, the seller account is created but the seller cannot start selling until an administrator approves the account. Newly registered sellers have a status of "pending" until approval.

### Account Deletion

## Customer Account Deletion

Customers can delete their own account at any time. When a customer deletes their account, the following actions occur:

- The customer's profile information is permanently removed
- All orders and order history are preserved for seller records and legal purposes
- All reviews written by the customer are preserved but displayed as "deleted user"

After deletion, the customer cannot log in and their email address becomes available for new registration.

## Seller Account Deletion

Sellers can delete their own account, but only when specific conditions are met. A seller cannot delete their account if there are any pending orders (in paid or shipped status) for their products. A seller also cannot delete their account if there are pending cancellation requests or pending refund requests for their products.

When a seller successfully deletes their account, the following actions occur:

- All products listed by the seller are removed from the marketplace
- Order history is preserved with snapshots of what was purchased
- The seller's shop name is preserved in past order records so customers can see what seller fulfilled their orders

After deletion, the seller cannot log in and their email address becomes available for new registration.

### Password Change

## Password Change

Authenticated customers can change their password at any time. To change the password, the customer must provide their current password for verification. The customer then provides a new password. Upon successful change, the customer remains logged in with the new password.

Authenticated sellers can change their password at any time. To change the password, the seller must provide their current password for verification. The seller then provides a new password. Upon successful change, the seller remains logged in with the new password.