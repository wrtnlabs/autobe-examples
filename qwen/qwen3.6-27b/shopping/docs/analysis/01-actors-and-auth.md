**ecommercePlatform — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## Guest Actor

Guests are unregistered visitors who access the platform without credentials. The platform requires mandatory account registration for all features, so guests cannot browse product listings, view seller profiles, use search, or access the shopping cart. Every guest interaction leads to a registration requirement. Guests cannot proceed to checkout or make any purchases. The guest actor exists solely as an external visitor with zero platform permissions. Guests must register for an account to transition into the customer role and access platform features.

### Unregistered Visitor Identity

The guest actor represents an unregistered visitor accessing the platform without any account credentials. Guests can only access the platform's login and registration entry points. Guests cannot browse the product catalog, search for items, or view seller profiles.

### Zero Platform Permissions and Feature Access Wall

The platform implements a feature access wall that blocks all guest interactions beyond the registration entry page. Guests have zero platform permissions, meaning they are completely restricted from accessing data, products, or seller information. Any attempt by a guest to navigate to a protected area automatically redirects them to the sign-up screen.

### Guest Role Limitations and Purchasing Restrictions

Guest role limitations restrict guests from using any system functionalities, including cart operations, wishlist curation, and browsing order history. A purchasing restriction ensures guests cannot add any product variants to a shopping cart, modify cart quantities, or initiate a checkout process. Without a valid account, guests cannot process payments or complete any transactional workflows.

### Registration Requirement and Purchaser Transition

A registration requirement exists for all users, meaning guests must provide an email address and password to create a customer account. Once the registration is complete and the guest authenticates, a purchaser transition occurs. This transition removes the feature access wall, lifts the purchasing restriction, and grants the user full customer permissions to browse products, manage a shopping cart, and place orders.

## Customer Actor

Customers are registered users who purchase products from sellers across the platform. They manage their personal profile, including their display name and phone number. Customers maintain a list of shipping addresses, with the ability to designate one as the default. They can save products to a personal wishlist. Customers place orders, track shipments, and manage cancellations or refunds on individual order items. They write ratings and reviews for products they have received. Customers can optionally submit requests to become platform administrators. Customers cannot manage product listings or edit other users' accounts.

### Customer Identity and Role

Customers are registered platform members whose primary role is purchasing products from approved sellers. Each customer establishes their identity through email-based account registration and authenticates using their email and password.

Customers are the core purchasers on the platform. They browse products, manage their shopping cart, place orders, and track deliveries. They interact with sellers indirectly through the order, cancellation, and refund workflows.

Each customer has a personal profile containing their display name and phone number. They can edit these details at any time. Customers can also submit a request to become a platform administrator, providing a reason for their request.

### Profile and Address Management

WHEN updating profile information, THE customer SHALL be allowed to change their own display name and phone number.

WHERE the customer has an existing address or needs to add a new one, THE customer SHALL be allowed to add, edit, or delete shipping addresses. Each address contains recipient name, phone number, street address, city, state/province, postal code, and country.

THE customer SHALL be allowed to set one of their shipping addresses as the default shipping address for use during checkout.

### Wishlist Curation

THE customer SHALL be allowed to add products to a personal wishlist.

THE customer SHALL be allowed to view their wishlist in a paginated list.

THE customer SHALL be allowed to remove products from their wishlist.

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customer wishlists.

### Order Lifecycle Access

THE customer SHALL be allowed to view all of their own orders in a list sorted by newest first with pagination.

THE customer SHALL be allowed to view detailed information for each order including order items, shipping address, and shipments with tracking information.

THE customer SHALL be allowed to request cancellation for individual order items with status paid, providing a reason for the cancellation.

THE customer SHALL be allowed to request refunds for individual order items with status delivered within seven days of delivery, providing a reason for the refund.

THE customer SHALL be allowed to view tracking information for each shipment and confirm delivery per shipment.

WHEN the customer does not confirm delivery for a shipment, THE system SHALL automatically mark all items in that shipment as delivered after fourteen days from shipping.

### Review and Rating Submission

WHEN a customer has received a product (item status delivered), THE customer SHALL be allowed to write one review per product per order.

THE customer SHALL be allowed to edit their own reviews. Each edit preserves a snapshot of the previous state.

THE customer SHALL be allowed to delete their own reviews; preserved snapshots remain accessible.

### Administrator Promotion Request

THE customer SHALL be allowed to submit a request to become a platform administrator, including a reason for the request.

### Customer Role Boundaries

THE customer SHALL NOT be allowed to create, edit, or delete product listings on the platform.

THE customer SHALL NOT be allowed to manage product inventory or variant pricing.

THE customer SHALL NOT be allowed to perform seller functions such as shipping orders, processing cancellation requests, or processing refund requests.

THE customer SHALL NOT be allowed to perform administrative functions such as approving seller registrations, managing categories, or suspending accounts.

THE customer SHALL be allowed to view only their own orders and order details; they SHALL NOT be allowed to view orders belonging to other customers.

THE customer SHALL be allowed to view only their own cancellation and refund requests; other customers' requests remain inaccessible.

## Seller Actor

Sellers are registered users who list and sell products from their own shop. They require explicit administrator approval before they can actively sell or edit product inventories. Once approved, sellers manage their shop profile, including the shop name, description, and logo image. They create and edit products, variants, and inventory records. Sellers fulfill customer orders by initiating shipments and providing tracking information. They respond to customer cancellation and refund requests. Sellers can view order dashboards but cannot access or modify customer profile data. Sellers maintain independence over their own shop operations.

### Seller Approval Requirement

Users registering as sellers enter the platform with a pending approval status.

The system requires explicit administrator review before a seller can actively sell or edit product inventories.

Administrators can approve or reject seller registration requests.

When rejecting a request, administrators must provide a rejection reason.

The system displays the current approval status to sellers: pending, approved, or rejected.

The system displays the rejection reason to sellers whose registration was rejected.

If a seller registration is rejected, the seller can submit a new registration request.

The system restricts pending or rejected sellers from creating, editing, or deleting products and variants.

The system restricts pending or rejected sellers from managing inventory records.

The system restricts pending or rejected sellers from accessing the seller dashboard.

### Approved Shop Operator

Approved sellers operate independently to manage their own shop, including the shop profile, product catalog, inventory, and customer order fulfillment.

Approved sellers can maintain their shop profile, including the shop name, shop description, and logo image.

Approved sellers can create, edit, and delete products and product variants.

Approved sellers can manage inventory for their product variants, including adding stock and adjusting quantities.

Approved sellers can view and fulfill customer order items for their products.

Approved sellers can respond to customer cancellation and refund requests for their products.

Approved sellers have access to a seller dashboard summarizing their shop performance, including the total number of products, total order items for their products, and counts of pending cancellation and refund requests.

The system allows approved sellers to filter order items by status on the seller dashboard.

### Shop Profile Maintenance

Approved sellers define their brand identity through a shop profile containing a shop name, a shop description, and a logo image.

Sellers can edit their shop name, shop description, and logo image at any time.

Every edit to a shop profile creates an immutable snapshot preserving the previous state for dispute resolution.

Customers viewing product listings or order details can see the seller's current shop profile information.

The system links the shop profile from product detail pages and order listings.

Customers can navigate to the full seller profile to view detailed shop information.

### Product Catalog Creation

Approved sellers can create products with a name, description, category selection, base price, and multiple images.

Sellers can create variants for each product, assigning a unique SKU code, option values, optional price overrides, and initial stock quantities.

Sellers can edit the name, description, category, base price, and images of their own products.

Sellers can edit the SKU code, option values, and price of their own product variants.

Every edit to a product or variant creates a snapshot preserving the complete previous state.

Sellers can delete their own products and variants only if there are no pending order items in paid or shipped status, and no pending cancellation or refund requests for those items.

Deleted products and variants are removed from search results and category listings.

Sellers can upload multiple images for each product and reorder them to set a main image.

Sellers can delete images from their products.

A product must have at least one variant to be purchasable; products with no variants appear in search results as unavailable.

### Inventory Management

Approved sellers can manage stock levels for each product variant through inventory records.

Sellers can add positive quantity changes to restock variants, specifying a reason for the addition.

Sellers can add negative quantity changes to adjust for stock loss or corrections, specifying a reason for the subtraction.

The system automatically creates negative inventory records when customers place orders for the seller's variants.

The system automatically creates positive inventory records when order cancellations or refunds for the seller's variants are approved.

Sellers can view the complete inventory history for each variant to track stock changes over time.

The system calculates current stock by summing all inventory records for each variant.

When stock reaches zero, the system marks the variant as out of stock and prevents it from being added to customer carts.

### Order Fulfillment

Approved sellers view their order items on the seller dashboard to initiate order fulfillment.

Sellers can initiate fulfillment actions for order items that are in paid status.

Sellers can bundle multiple order items from the same customer order into a single shipment by providing a carrier name and a tracking number.

When a seller creates a shipment, the system transitions all bundled order items to shipped status.

Customers can view tracking information for each shipment and manually confirm delivery to transition items to delivered status.

The system automatically transitions unconfirmed items to delivered status 14 days after the shipment date.

Sellers can only ship order items for their own products; they cannot ship items belonging to other sellers.

### Cancellation Refund Response

Approved sellers review and respond to customer post-purchase disputes by processing cancellation and refund requests.

Sellers can view pending cancellation requests for items in paid status and pending refund requests for items in delivered status within seven days of delivery.

Sellers can approve or reject customer cancellation and refund requests.

When a seller approves or rejects a request, the system records a snapshot of the request state for historical review.

If a seller approves a cancellation, the system transitions that item to cancelled status, processes a refund, and restores the item's stock quantity.

If a seller approves a refund, the system transitions that item to refunded status and restores the item's stock quantity.

The remaining items in the original customer order continue processing unaffected by the cancellation or refund of individual items.

### Seller Independence

Approved sellers maintain full access to their own seller dashboard, shop profile, products, variants, inventory history, order items for their products, and shipment information.

The system restricts sellers from accessing or viewing any customer profile data.

The system restricts sellers from accessing any other sellers' shop profiles, products, variants, or inventory records.

Sellers can delete their account only if they have no pending orders in paid or shipped status, and no pending cancellation or refund requests.

When a seller deletes their account, the system removes their profile information but preserves their order history and snapshots for legal records.

The system preserves the seller's shop name in past orders after account deletion.

If an administrator suspends a seller, the system hides their products from search and category listings and prevents new purchases.

Suspended sellers can still process existing orders, ship items, and respond to pending cancellation and refund requests.

The system restricts suspended sellers from creating new products or editing existing products.

## Admin Actor

Administrators manage the overall operations and policy enforcement of the platform. Two distinct grades exist: regular administrators and super administrators. Regular administrators handle daily duties such as approving new sellers, managing product categories, suspending policy-violating accounts, and forcefully resolving order disputes through cancellation or refunds. Super administrators manage personnel transitions by promoting regular administrators to super administrators or demoting super administrators back to regular administrators. Super administrators cannot demote themselves. Administrators do not act as regular customers or sellers, and they serve solely as platform overseers.

### Platform Oversight

Administrators serve as platform overseers with authority to manage all areas of the marketplace.

Administrators can:
- Manage seller account approvals and suspensions
- Maintain the product category structure
- View all products and their snapshots
- View all orders and intervene in disputes
- Manage all customer and seller accounts

Administrators access these capabilities through the administrative interface. Their role is strictly separated from marketplace participation as customers or sellers.

| Platform Area | Oversight Capabilities |
|---|---|
| Seller Accounts | Approve registrations, suspend or ban sellers |
| Product Catalog | View products and snapshots, delete products |
| Order Processing | View orders, force-cancel items, force-refund items |
| Categories | Create, edit, and delete categories |
| User Accounts | View all accounts, ban or unban users |

### Tiered Administration

Administrators operate at one of two distinct grades: regular administrator and super administrator. Each grade has a defined scope of authority.

**Regular Administrator**
- Approve or reject seller registration requests
- Create, edit, and delete product categories
- View all products and product snapshots
- Suspend or unsuspend seller accounts
- View all orders and intervene with force-cancellation or force-refund
- View all customer and seller accounts
- Ban or unban customer accounts
- Ban or unban seller accounts

**Super Administrator**
- Has all capabilities of regular administrator
- Plus exclusive personnel management capabilities (defined in Personnel Promotion)

Only super administrators can perform personnel transitions. All other administrative duties are available at both grades.

### Seller Approval

Administrators manage new seller registrations to control who can operate shops on the platform.

**Approval Workflow**
- Sellers submit registration requests that require administrator review
- Administrators can view the list of pending seller approval requests
- Administrators can approve a seller registration, allowing the seller to begin operating their shop
- Administrators can reject a seller registration; when rejecting, a reason must be provided
- Rejected sellers can view the rejection reason and may submit a new registration request

Seller accounts remain in a pending state until an administrator takes action. Approved sellers gain full access to seller capabilities. Rejected sellers remain in a rejected state until they submit a new request.

### Category Management

Administrators manage the product category structure that organizes all products on the platform. Customers and sellers cannot create, edit, or delete categories.

**Category Operations**
- Administrators can create new categories
- Administrators can create subcategories (one level of nesting under a parent category)
- Administrators can edit category names and descriptions
- Administrators can delete categories; when a category is deleted, products previously in that category become uncategorized

The category hierarchy determines how products are browsed and filtered by customers.

### Account Suspension

Administrators can restrict or remove platform access for violating accounts.

**Seller Suspension**
Administrators can suspend sellers who violate platform policies. When a seller is suspended:
- Their products are hidden from search results and category listings
- Their products cannot be purchased by customers
- They can still process existing orders (ship items, respond to cancellation and refund requests)
- They can still log in to their account
- They cannot create new products or edit existing products
- Unsuspending the seller restores full selling capabilities and product visibility

**User Banning**
Administrators can ban both customer and seller accounts. When a user is banned:
- They cannot log in to the platform
- Existing orders and order history remain preserved
- They can only regain access if an administrator unbans their account

| Action | Seller Login | Seller Products Visible | Seller Can Process Orders | Customer Login |
|---|---|---|---|---|
| Seller Suspended | Allowed | Hidden | Allowed | N/A |
| Seller Banned | Blocked | Hidden | Blocked | N/A |
| Customer Banned | N/A | N/A | N/A | Blocked |

### Order Dispute Resolution

Administrators can intervene in order processing when standard cancellation or refund processes are insufficient or when sellers fail to respond.

**Force Cancellation**
- Administrators can force-cancel individual order items or entire orders
- Force-cancelling restores stock quantities for the affected variants and refunds the customer
- This resolution applies regardless of the item's current status

**Force Refund**
- Administrators can force-refund individual order items or entire orders
- Force-refunding restores stock quantities for the affected variants and returns the payment to the customer
- This resolution applies when an item has been delivered but the customer is not satisfied

Administrators have full visibility into all orders on the platform, enabling them to identify and resolve disputes across any transaction.

### Personnel Promotion

Personnel transitions within the administration team are managed exclusively by super administrators.

**Administrator Requests**
- Any user (customer or seller) can submit a request to become an administrator, including a reason
- Super administrators can view the list of pending administrator requests
- Super administrators can approve or reject these requests
- When approved, the user becomes a regular administrator
- When rejected, the user does not gain administrator access

**Administrator Grade Transitions**
- Super administrators can promote regular administrators to super administrator
- Super administrators can demote other super administrators to regular administrator
- Super administrators cannot demote themselves
- A user can only become a super administrator through promotion by an existing super administrator
- There is no direct path to super administrator grade upon initial approval

Personnel transitions ensure that administrator access and grade elevation are controlled by the most trusted members of the administration team.

### Super Administrator Grade

The super administrator grade represents the highest level of platform authority. Super administrators have all capabilities of regular administrators plus exclusive personnel management authority.

**Exclusive Super Administrator Capabilities**
- Promote regular administrators to super administrator
- Demote other super administrators to regular administrator
- Review pending administrator requests submitted by customers and sellers
- Approve or reject administrator requests

**Grade Boundaries**
- Self-demotion is not allowed
- Only super administrators can change administrator grades or grant new administrator access
- Regular administrators cannot view or manage administrator requests

Personnel transition mechanics are defined in Personnel Promotion.

### Administrator Boundaries

Administrators serve solely as platform overseers. Their role is strictly separated from regular marketplace participation.

**Administrators Do Not**
- Purchase products as customers
- List products or maintain a shop as sellers
- Maintain a shop profile, product catalog, or inventory
- Receive revenue from sales
- Write or receive product reviews

**Role Independence**
- Administrators maintain their own user account for authentication
- A user can hold multiple roles (e.g., a customer who is also an administrator)
- Administrative actions are always performed from an administrative context, independent of any customer or seller role

This separation ensures clear boundaries between platform governance and marketplace operations.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### #### Customer Registration

Users can register as a customer by providing an email address and password. Upon successful registration, the customer account is created and the user can immediately log in.

WHEN a user attempts to register as a customer without providing an email address or password, then the system SHALL reject the registration.

WHEN a user attempts to register as a customer with an email address already associated with any existing account (customer, seller, or administrator), then the system SHALL reject the registration.

### #### Seller Registration

Users can register as a seller by providing an email address and password. Upon successful registration, the seller account is created with a pending approval status.

WHEN a user attempts to register as a seller without providing an email address or password, then the system SHALL reject the registration.

WHEN a user attempts to register as a seller with an email address already associated with any existing account (customer, seller, or administrator), then the system SHALL reject the registration.

### #### Login Process

Customers can log in by providing their email address and password. Upon successful authentication, the customer gains access to their account.

Sellers can log in by providing their email address and password. Upon successful authentication, sellers gain access to their account.

WHEN a seller with pending approval status logs in, then the system SHALL grant access but restrict seller-specific operations until administrator approval is received.

WHEN a seller with rejected approval status logs in, then the system SHALL restrict seller-specific operations until a new registration request is submitted and approved.

WHEN a user attempts to log in with an email address not associated with any account, then the system SHALL reject the login.

WHEN a user attempts to log in with an incorrect password, then the system SHALL reject the login.

### #### Authentication Model

The system uses email and password as the authentication mechanism for all user types, including customers, sellers, and administrators.

This platform requires registration to access any features. There is no guest browsing or guest access—unregistered users cannot perform any platform actions.

## Session and Logout

Define session behavior and logout from a user perspective.

### Authenticated Session

Upon successful login with their email and password, an authenticated session is established for customers and sellers.

During an authenticated session, users can access all platform features permitted by their role (see respective actor definitions for permissions).

Banned customers do not establish an authenticated session and are denied platform access until unbanned by an administrator.

Banned sellers do not establish an authenticated session and are denied platform access until unbanned by an administrator.

Guest browsing is not permitted on this platform (defined in Guest Actor).

### Logout

Customers and sellers can end their authenticated session by logging out.

When a user logs out, their session terminates and they lose access to all authenticated platform features.

After logging out, the user must log in again with their email and password to re-establish an authenticated session.

### Account Security

All platform operations require an authenticated customer or seller session; no guest access is allowed to any feature.

Authentication is performed using the registered email address and password.

Banned customer accounts are prevented from logging in (ban/unban managed by administrators, defined in Admin Actor).

Banned seller accounts are prevented from logging in (ban/unban managed by administrators, defined in Admin Actor).

Customers can change their password to maintain account security (see Account Management).

Sellers can change their password to maintain account security (see Account Management).

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Types and Creation

This platform requires all users to create an account before accessing any features. There is no guest access to the platform.

Customer accounts are created by providing an email address and password. Upon successful registration, customer accounts become active immediately and can be used for browsing products, adding items to cart, placing orders, writing reviews, and managing the customer profile.

Seller accounts are created by providing an email address and password. Seller accounts require administrator approval before the seller can begin selling. Seller accounts track approval status as pending, approved, or rejected. Rejected sellers can view the rejection reason provided by the administrator and submit a new registration request.

Any existing user may request to become an administrator by providing a reason. Requests are reviewed by super administrators. When approved, the user becomes a regular administrator.

| Account Type | Registration Requirements | Approval Needed | Active Immediately |
|---|---|---|---|
| Customer | Email, Password | No | Yes |
| Seller | Email, Password | Yes | No |
| Administrator | Existing account + reason | Yes | No |

### Account Deletion

Customers can delete their own account. When a customer deletes their account, profile information (display name, phone number) is deleted. Orders and order history are preserved for seller records and legal purposes. Reviews are preserved but displayed as written by a deleted user.

Sellers can delete their own account subject to the following conditions:
- No pending order items with paid or shipped status
- No pending cancellation requests
- No pending refund requests

If any of these conditions are not met, the deletion request is rejected.

When a seller successfully deletes their account:
- All products are removed from listings
- Order history and order snapshots are preserved
- The seller's shop name in past orders is preserved

### Password Change

Customers and sellers can change their password.