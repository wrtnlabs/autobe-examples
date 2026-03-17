**ecommerceMall — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

Guests are unauthenticated visitors to the platform who have not yet created an account. The platform requires registration for using any features, meaning guests cannot browse products, view categories, search items, or access any shopping functionality. Guests cannot view product details, access seller profiles, or explore the platform's offerings without an account. The guest role represents a complete access boundary where no platform features are available. Guests must register and log in before they can view any content beyond the registration and login pages. This restriction ensures all platform interactions are traceable to a registered account. The guest actor serves as the entry point that directs all visitors toward creating a customer or seller account.

### Guest Access Boundary

Guests are unauthenticated visitors who have not created an account on the platform.

Guests cannot access any shopping features, including product browsing, category navigation, or search functionality.

Guests cannot view product details, including product images, descriptions, prices, variants, or stock information.

Guests cannot view seller profiles, shop names, or seller ratings.

Guests cannot view categories or browse the product catalog.

Guests cannot access wishlists, shopping carts, or order history.

Guests cannot place orders or proceed to checkout.

Guests cannot view any order information, including order numbers, dates, or statuses.

The platform access boundary restricts all platform features to registered and authenticated users only.

### Platform Access Restrictions

Guest visitors must register before accessing any platform content beyond registration and login pages.

No product visibility is allowed for guest users in any form, including search results, category listings, or product detail pages.

Guests cannot access seller profiles or view any seller shop information.

Guests cannot view reviews, ratings, or customer feedback of any kind.

Guests cannot view platform announcements, promotional content, or featured products.

Guests cannot access any administrative or seller dashboard functionality.

Guests cannot view inventory levels or stock information.

Guests cannot access shipping or tracking information.

Guests cannot view cancellation requests, refund requests, or dispute resolution information.

All platform content and features require authentication through a registered customer or seller account.

### Registration Entry Point

The guest visitor role serves as the entry point for all new platform users.

Guests can access only the registration and login pages to create an account.

Guests must choose between customer registration or seller registration when creating their first account.

Guests cannot access any platform features until they complete the registration process.

The registration process requires guests to provide email and password credentials.

After successful registration, guests transition to the customer actor role.

After successful seller registration, guests transition to the seller actor role pending administrator approval.

Guests are directed to the registration page if they attempt to access any restricted content.

The platform does not support guest browsing or limited access modes.

All platform interactions must be traceable to a registered account for legal and business record purposes.

### Access Enforcement

The platform enforces an access boundary that blocks all unauthenticated requests to protected resources.

Guests attempting to access product pages receive a message requiring registration.

Guests attempting to access category pages receive a message requiring registration.

Guests attempting to access seller profiles receive a message requiring registration.

Guests attempting to search products receive a message requiring registration.

Guests attempting to view wishlists, carts, or orders receive a message requiring registration.

The platform does not display partial product information to guests.

Guests cannot bypass access restrictions through direct URL access or other means.

All access enforcement redirects guests to the registration page.

The registration requirement applies to all platform features without exception.

## customer Actor

Customers are registered users who can browse, search, and purchase products from the platform. Customers authenticate using email and password credentials to access their personal account area. After registration, customers gain access to product browsing, category navigation, and search functionality across all sellers. Customers manage their personal profile information including display name and phone number, as well as multiple shipping addresses. Customers can add products to their wishlist and use the shopping cart to prepare purchases. Customers place orders, make payments, and track their order history across the platform. Customers can write reviews for products they have purchased after delivery. Customers can request cancellations for unpaid items and refund requests for delivered items. Customers can delete their accounts while preserving order history and reviews for legal purposes.

### Customer Actor Definition

Customers are registered users who access the platform using email and password authentication. Only authenticated customers can browse products, navigate categories, and search for items. The platform does not allow guest browsing—access to all features requires a registered customer account.

A customer account is created when a user completes the registration process with an email and password. After registration, the customer gains access to the full platform functionality.

Customers can access the following platform features after authentication:
- Browse products from all sellers
- Navigate through product categories and subcategories
- Search for products by name and filter by category, price, and stock status
- View seller profiles and shop information
- Add products to a personal wishlist
- Use the shopping cart to prepare purchases
- Place orders and complete payments
- View their order history and tracking information
- Write product reviews for delivered items
- Submit cancellation and refund requests for their orders
- Manage their personal profile and shipping addresses
- Delete their account while preserving order history and reviews

Customers cannot:
- View admin or seller dashboards
- Manage categories or products
- Approve or reject cancellation and refund requests
- Access other customers' or sellers' private information

### Email Password Authentication

Customers authenticate using email and password credentials. The email address serves as the unique identifier for the customer account.

Registration requires a valid email address and password. The email must be unique across all customer accounts. When a customer attempts to register with an email that is already in use, the registration is rejected.

Customers log in by providing their email and password. If the email or password is incorrect, the login attempt is rejected. The system provides appropriate feedback for invalid credentials.

Customers can change their password at any time. Changing the password requires authentication with the current password. After a password change, the customer must log in again using the new password.

Customers can delete their account at any time. Account deletion permanently removes the customer profile information. However, order history and reviews are preserved for legal and business purposes. Reviews from deleted customers are shown as 'deleted user' to maintain transparency.

Customer accounts can be deleted by the account owner or by an administrator. Administrators can also ban customer accounts, preventing the customer from logging in. Banned customers cannot access any platform features until the ban is lifted.

Customers retain access to their historical data even after account deletion:
- Orders remain accessible in the order history
- Reviews remain visible on products but are attributed to 'deleted user'
- Shipping addresses are preserved in historical order records

### Product Browsing and Category Navigation

Authenticated customers can browse products from all sellers on the platform. Product browsing is available without any additional permissions beyond being a registered customer.

Products are organized into categories, which can have one level of subcategories. Customers can navigate through the category hierarchy to browse products within specific categories or subcategories.

Customers can view the list of all categories at any time. Categories are managed only by administrators, and customers cannot create or edit categories.

When browsing products in a category, customers see:
- The main product image (thumbnail)
- Product name
- Base price or price range (if variants have different prices)
- Seller shop name
- Average rating (if reviews exist)

Customers can filter products within a category by:
- Price range (minimum and maximum)
- Stock availability (in-stock only)

Product variants that are out of stock are marked as 'out of stock' and cannot be added to the shopping cart. Out of stock products remain visible in category listings.

When a product is deleted by the seller, it no longer appears in category listings or search results. Deleted products are removed from the platform's active product inventory.

Customers can view the full details of a single product, including:
- All product images
- Product name and description
- Category information
- Seller shop name (linked to seller profile)
- All available variants with prices and stock status
- Average rating and total review count
- All customer reviews for the product

Product snapshots are preserved even after deletion, allowing administrators to review the product's historical state.

### Product Search Functionality

Customers can search for products across all sellers on the platform. Search is available to all authenticated customers without additional permissions.

Customers can search products by name. The search function looks for the search term in product names and returns matching results.

Search results are paginated to manage result sets. Customers can navigate through multiple pages of search results.

Customers can filter search results by:
- Category: Show only products within a specific category or subcategory
- Price range: Set minimum and maximum price boundaries
- Stock availability: Show only in-stock products

Customers can sort search results by:
- Newest first: Products sorted by creation date in descending order
- Price (low to high): Products sorted by base price in ascending order
- Price (high to low): Products sorted by base price in descending order

Search results display each product with:
- Main image (thumbnail)
- Product name
- Base price or price range (if variants have different prices)
- Seller shop name
- Average rating (if reviews exist)

Out of stock variants are marked as 'out of stock' in search results. Customers can view the product details page but cannot add out of stock variants to the shopping cart.

When a product is deleted, it is immediately removed from search results and is no longer searchable by customers.

### Personal Profile Management

Each customer has a personal profile that includes a display name and phone number. Customers can view and edit their profile information.

Customers can set or change their display name. The display name is shown on product reviews and in order history. Display names can be updated at any time by the customer.

Customers can set or change their phone number. The phone number is used for shipping address contact information. Phone numbers can be updated at any time by the customer.

Customers can view their current profile information at any time. Profile information is accessible through the customer account area.

Customers must be authenticated to access and modify their profile information. Unauthenticated visitors cannot view or edit customer profiles.

Profile edits are saved immediately. The updated display name and phone number are reflected across the platform:
- Reviews authored by the customer show the updated display name
- Shipping addresses associated with the customer use the updated phone number
- Order records preserve the profile information at the time of the order

Customers cannot view or edit other customers' profile information. Profile information is private to each account owner.

### Shipping Address Management

Customers can add multiple shipping addresses to their account. Each address is associated with the customer account and can be used for order placement.

Each shipping address includes:
- Recipient name
- Phone number
- Street address
- City
- State or province
- Postal code
- Country

Customers can add a new shipping address at any time. Adding a new address is available to all authenticated customers.

Customers can edit existing shipping addresses. Edits include updating any field of the address information. Edits are saved immediately.

Customers can delete shipping addresses. Deleted addresses cannot be used for future orders but remain in historical order records.

Customers can set one shipping address as the default. The default address is automatically selected during checkout unless the customer chooses a different address.

Customers can view all their saved shipping addresses. Addresses are displayed with all fields visible to the customer.

Customers must be authenticated to add, edit, or delete shipping addresses. Unauthenticated visitors cannot access address management.

Shipping addresses are used for:
- Order placement: Customers select an address or use the default
- Delivery: Addresses are preserved in order records even after address deletion
- Customer service: Address information is available for order support

### Wishlist and Shopping Cart

Customers can add products to their personal wishlist. The wishlist stores products (not specific variants) for later purchase consideration.

Customers can view their wishlist. The wishlist is paginated to manage product lists.

Customers can remove products from their wishlist. Removing a product deletes it from the wishlist but does not affect the product listing.

If a product is deleted by the seller, it is automatically removed from all customer wishlists. Deleted products cannot appear in wishlists.

Customers can add product variants to their shopping cart. Adding a variant requires selecting a specific option combination (e.g., Red/Large) and specifying the quantity.

When the same variant is already in the cart, adding more of that variant combines the quantities (not added as a separate line item).

Customers can view their shopping cart. The cart displays each item with:
- Product name
- Variant options
- Price
- Quantity
- Subtotal (price × quantity)

Customers can change the quantity of items in their cart. Quantity changes are saved immediately.

Customers can remove items from their cart. Removed items are no longer in the cart but remain available for future purchase.

The cart shows the total price of all items. The total is calculated from the sum of all line item subtotals.

If a variant's stock is less than the cart quantity, a warning is shown to the customer. The customer can proceed with the order but is notified of the stock limitation.

If a variant is deleted or goes out of stock, it is marked as unavailable in the cart. Unavailable items cannot be checked out.

### Order Placement and Payment

Customers can proceed to checkout from their shopping cart. Checkout is available to authenticated customers.

Before checkout, customers must resolve any unavailable items (removed or out of stock). Unavailable items cannot be checked out.

During checkout, customers must select a shipping address. Customers can use their default address or choose from their saved addresses.

Customers can review the order summary before placing the order. The order summary includes:
- List of items with prices
- Selected shipping address
- Total price

Once an order is placed, the shipping address cannot be changed. The address at order placement time is locked and preserved.

After reviewing the order summary, customers confirm and place the order. The order is created only after successful confirmation.

Payment is processed through an external payment gateway. Payment can succeed or fail.

If payment fails, the order is not created. Customers can retry the payment process.

If payment succeeds, the order is created successfully. The order is assigned a unique order number and is associated with the customer.

When an order is placed successfully:
- Stock quantities are decreased for each purchased variant
- Purchased items are removed from the customer's cart
- Order records are created with item details
- Product and variant snapshots are saved with each order item
- Seller profile snapshots are saved with each order item

### Order History and Tracking

Customers can view a list of all their orders. Order history is accessible only to the account owner.

The order list is paginated and sorted by newest first. Customers can navigate through multiple pages of order history.

Each order in the list shows:
- Order number
- Order date
- Total price
- Overall order status

Customers can view the full details of an individual order. Order details include:
- List of items with: product name, variant, quantity, price, and item status
- Shipping address used for the order
- List of shipments with tracking information
- Each shipment shows which items are included

Order items can have the following statuses:
- Paid: Payment completed, waiting for seller to ship
- Shipped: Seller has shipped the item
- Delivered: Item has been delivered
- Cancelled: Item was cancelled
- Refunded: Item was refunded

The overall order status is derived from its items:
- Paid: If all items are paid
- Shipped: If any item is shipped (and none delivered yet)
- Delivered: If all items are delivered
- Cancelled: If all items are cancelled
- Refunded: If all items are refunded
- Partially completed: Mixed states (e.g., some delivered, some refunded)

Customers can view tracking information for each shipment. Tracking includes carrier name and tracking number.

Customers can confirm delivery per shipment. When confirmed, all items in that shipment change to 'delivered' status.

If the customer does not confirm delivery, items automatically change to 'delivered' after 14 days from shipping.

### Product Reviews

Customers can write reviews for products they have purchased. Reviews are only allowed after the order item status is 'delivered'.

Customers can write one review per product per order. Additional reviews for the same product in different orders are allowed.

Each review includes:
- Rating: 1 to 5 stars (required)
- Text content: Optional written review

Reviews are displayed on the product detail page. Reviews are sorted by newest first.

Customers can edit their own reviews. Editing a review creates a snapshot of the review state.

Customers can delete their own reviews. Deletion preserves a snapshot of the review for dispute resolution purposes.

Product average ratings are calculated from all non-deleted reviews. Deleted reviews are excluded from the average calculation.

Customers can view all reviews written for a product. Reviews show the rating and text content (if written).

Customers must be authenticated to write, edit, or delete reviews. Unauthenticated visitors cannot access review functionality.

Customers can only review products they have purchased. Attempting to review an unpurchased product is not allowed.

### Cancellation and Refund Requests

Customers can request cancellation for individual order items. Cancellation requests are only allowed for items with status 'paid' (not yet shipped).

Cancellation requests include a reason (text description). The reason is provided by the customer when submitting the request.

Cancellation requests are submitted to the seller of that specific item. The seller can approve or reject the request.

When the seller responds, a snapshot of the request state is created. The snapshot preserves the request details at the time of the response.

If a cancellation request is approved, the item is cancelled. The refund is processed for that item only.

Cancelled items restore their stock quantities through an inventory record adjustment.

The remaining items in the order continue processing normally. Cancellation affects only the requested item, not the entire order.

If all items in an order are cancelled, the entire order status becomes 'cancelled'.

Customers can request refunds for individual order items. Refund requests are only allowed for items with status 'delivered'.

Refund requests must be submitted within 7 days of that item being delivered. Requests outside this window are not allowed.

Refund requests include a reason (text description). The reason is provided by the customer when submitting the request.

Refund requests are submitted to the seller of that specific item. The seller can approve or reject the request.

When the seller responds, a snapshot of the request state is created. The snapshot preserves the request details at the time of the response.

If a refund request is approved, the item is refunded. The refund amount is processed for that item only.

Refunded items restore their stock quantities through an inventory record adjustment.

The remaining items in the order are unaffected by a refund. Refunds affect only the requested item, not the entire order.

If all items in an order are refunded, the entire order status becomes 'refunded'.

### Account Deletion

Customers can delete their account at any time. Account deletion is a permanent action that removes the customer from the platform.

When a customer deletes their account:
- Profile information is deleted (display name, phone number)
- Shipping addresses are removed from the address book
- Wishlist items are removed from the wishlist
- Access to the account area is permanently revoked

However, the following data is preserved:
- Order history and order records are kept intact
- Product reviews are preserved but shown as 'deleted user'
- Order history snapshots are maintained for business and legal purposes

Preserved data remains accessible to:
- Administrators (full access)
- Sellers (for their own orders only)
- The platform (for business operations)

Deleted customer information is not recoverable. Once an account is deleted, it cannot be restored.

Customers must be authenticated to initiate account deletion. The deletion process requires confirmation.

Administrators can also delete customer accounts. Administrator-initiated deletions follow the same preservation rules.

Customers with active pending orders or active cancellation/refund requests can still delete their account. The pending transactions are preserved with the order records.

## seller Actor

Sellers are registered users who can create and manage products on the platform. Sellers authenticate using email and password credentials similar to customers. Seller accounts require administrator approval before they can begin selling products. Sellers manage their shop profile including shop name, description, and logo image. Sellers create products with variants and manage inventory levels for their items. Sellers view and manage their order items from customers who have made purchases. Sellers handle shipping logistics by creating shipments and entering tracking information. Sellers respond to cancellation and refund requests from customers. Sellers can view approval status and rejection reasons for their account registration. Sellers can delete their accounts under specific conditions regarding pending orders. Sellers' products are visible to all customers on the platform marketplace.

### Seller Registration

Individuals can register as sellers by providing an email address and password. The registration process creates a seller account in pending approval status. Sellers cannot access any selling features until their account receives administrator approval.

### Seller Authentication

Registered sellers can log in to the platform using their email address and password. The authentication process is identical to customer authentication. Sellers maintain separate credentials from customer accounts, though they can use the same email address.

### Administrative Approval

All seller accounts require administrator approval before they can sell products on the platform. Sellers can view their current approval status at any time. When approved, sellers gain access to the seller dashboard and can begin creating products. If rejected, sellers receive a rejection reason and can submit a new registration request with the same email address.

### Shop Profile

Each seller maintains a shop profile containing a shop name, shop description, and logo image. Sellers can edit their shop name, description, and logo at any time. Every edit to the shop profile creates a snapshot that preserves the previous state. Customers can view all seller profiles on the platform.

### Product Management

Sellers can create products for their shop. Each product requires a name, description, category, and base price. Products belong to the seller who created them and appear in the seller's product management interface. Sellers can edit their own products at any time, and every edit creates a snapshot. Sellers can delete their products only if there are no pending order items, cancellation requests, or refund requests for any variant of the product.

### Variant Management

Sellers can add variants to their products. Each variant requires a unique SKU code, option values, stock quantity, and may optionally override the base price. Sellers can edit variant details including SKU code, option values, and price. Every variant edit creates a snapshot. Sellers can delete variants only if there are no pending order items, cancellation requests, or refund requests for that specific variant. A product must have at least one variant to be purchasable.

### Inventory Management

Each product variant maintains its own stock quantity. Sellers can add inventory (restock) by specifying a quantity and reason. Sellers can subtract inventory (adjustment or loss) by specifying a quantity and reason. The system automatically creates inventory records when orders are placed (negative change) and when orders are cancelled or refunded (positive change). Sellers can view the complete inventory history for each variant. When stock reaches zero, the variant is marked as out of stock and cannot be added to customer carts.

### Order Management

Sellers can view order items for products they have sold. Order items can be filtered by status. Sellers see order items grouped by order but maintain separate item statuses. Sellers can view full order details including customer information and shipping address. Order items from the same order may belong to different sellers, and each seller manages only their portion of the order.

### Shipping Operations

Sellers can create shipments for their order items. A shipment can contain one or more order items from the same seller. Sellers enter tracking information for each shipment including the carrier name and tracking number. All items in the same shipment share identical tracking information. When a shipment is created, all order items in that shipment change status to shipped. Sellers can ship items individually or bundle multiple items into a single shipment.

### Cancellation Requests

Sellers can view cancellation requests submitted by customers for their order items. Customers can request cancellation for order items with status paid that have not yet been shipped. Cancellation requests include a customer-provided reason. Sellers can approve or reject each cancellation request. When sellers respond to a request, a snapshot of the request state is created. If approved, the item is cancelled and its stock quantity is restored. If rejected, the item continues processing normally.

### Refund Requests

Sellers can view refund requests submitted by customers for their order items. Customers can request refunds for order items with status delivered, within seven days of delivery. Refund requests include a customer-provided reason. Sellers can approve or reject each refund request. When sellers respond to a request, a snapshot of the request state is created. If approved, the item is refunded and its stock quantity is restored. If rejected, the item remains in delivered status.

### Account Approval Status

Sellers can view their account approval status at any time through the seller dashboard. Possible statuses are pending, approved, or rejected. Pending sellers cannot create products or access seller features. Approved sellers have full selling privileges. Rejected sellers can submit a new registration request using the same email address.

### Account Deletion

Sellers can delete their seller account under specific conditions. Account deletion is only permitted when the seller has no pending orders with paid or shipped status. Account deletion is only permitted when the seller has no pending cancellation or refund requests. When a seller account is deleted, their products are removed from the marketplace but order history and snapshots are preserved. The seller's shop name is preserved in past orders.

### Product Marketplace Access

Approved sellers' products are visible to all customers browsing the platform marketplace. Products appear in search results and category listings once approved. Products from suspended sellers are hidden from search and category listings but remain accessible for existing order processing. Suspended sellers cannot create new products or edit existing products but can continue fulfilling existing orders.

## admin Actor

Administrators are users granted elevated privileges to manage platform operations. Regular administrators handle seller management, category management, product oversight, and order oversight. Administrators can approve or reject seller registration requests with provided reasons. Administrators can view all pending seller approval requests on the platform. Administrators can suspend seller accounts when necessary for policy enforcement. Administrators can create and manage product categories and subcategories. Administrators can view all products on the platform and access product snapshots. Administrators can view all customer accounts and order information. Administrators can ban or unban customer and seller accounts. Administrators can force-cancel or force-refund orders when needed for dispute resolution.

### Administrator Privileges

Administrators are users granted elevated privileges to manage platform operations. These privileges allow oversight of sellers, categories, products, orders, and user accounts across the entire platform. Administrators can access all order information and customer account data. Administrator access is distinct from customer and seller roles, providing management capabilities that extend beyond individual account boundaries.

### Seller Management

Administrators can view the list of all seller accounts on the platform. Administrators can suspend seller accounts when necessary for policy enforcement. When a seller is suspended: their products are hidden from search and category listings, their products cannot be purchased, they can still process existing orders by shipping items and responding to cancellation or refund requests, and they cannot create new products or edit existing products. Administrators can unsuspend seller accounts, which makes their products visible again in search and category listings.

### Category Management

Administrators can create categories and subcategories on the platform. Administrators can edit category names and descriptions. Administrators can delete categories, and when a category is deleted, products within that category become uncategorized. Administrators are the only users who can create, edit, or delete categories. Customers can browse the list of all categories and view products within categories.

### Product Oversight

Administrators can view all products on the platform regardless of which seller created them. Administrators can view snapshots of any product to see its complete history of changes. Administrators can delete products from the platform for policy violations. When an administrator deletes a product, all its variants and inventory records are deleted. Deleted products no longer appear in search or category listings. Product snapshots are preserved even after product deletion for dispute resolution purposes.

### Order Oversight

Administrators can view all orders on the platform regardless of which customer or seller created them. Administrators can access full order details including items, shipping information, and tracking data. Administrators can force-cancel individual items or entire orders when necessary. When an order or item is force-cancelled, the customer is refunded and stock quantities are restored. Administrators can force-refund individual items or entire orders for dispute resolution purposes.

### Seller Approval Management

Administrators can view the list of all pending seller approval requests. Administrators can approve or reject seller registration requests. When rejecting a seller registration, administrators must provide a reason that is visible to the seller. Rejected sellers can submit new registration requests. Administrators are the only users who can approve or reject seller registrations. The approval status determines whether a seller can begin selling on the platform.

### Customer Account Management

Administrators can view all customer accounts on the platform. Administrators can ban customers, which prevents them from logging into the system. Banned customers cannot access any platform features. Administrators can unban customers, restoring their access to the platform. When a customer is banned, their existing orders, reviews, and wishlists remain in the system.

### User Banning

Administrators can ban both customer and seller accounts. Banned customers cannot log in to the platform. Banned sellers cannot log in, but their existing orders remain in the system. The ban status is part of the account lifecycle and can be reversed by administrators. When a user is banned, their data is preserved for historical and legal purposes.

### Dispute Resolution Access

Administrators can access snapshots of products, seller profiles, reviews, cancellation requests, and refund requests for dispute resolution. Snapshots record when changes were made, what was changed, and the values before and after the change. Snapshots are immutable and cannot be deleted. Both administrators and regular users can view snapshots relevant to their account (product owners can view product snapshots, customers can view their review snapshots, etc.).

## superAdmin Actor

Super administrators are users with the highest level of administrative privileges on the platform. Super administrators can view and manage all administrator accounts including promotion and demotion capabilities. Super administrators can promote regular administrators to super administrator level. Super administrators can demote other super administrators but cannot demote themselves. Super administrators have access to all administrator functions including seller management, category management, product oversight, and order oversight. Super administrators can view all administrator grade change requests on the platform. Super administrators have full oversight of all platform activities and user management. Super administrators represent the highest tier of administrative authority within the system. Super administrators manage the administrator hierarchy and ensure proper governance of the platform.

### Administrator Privileges

Super administrators hold the highest level of privileges on the platform.
Super administrators have full authority over all platform operations and user accounts.
Super administrators can perform all actions available to regular administrators.
Super administrators have access to all administrative functions without restriction.
Super administrators oversee all platform governance and enforcement activities.

### Administrator Hierarchy Management

Super administrators manage the administrator hierarchy on the platform.
The hierarchy consists of two grades: regular administrator and super administrator.
Super administrators define and maintain the administrative authority structure.
Super administrators control the tiered administrative access system.
Super administrators are responsible for the proper distribution of administrative responsibilities.

### Promotion and Demotion

Super administrators can promote regular administrators to super administrator level.
Super administrators can demote other super administrators to regular administrator level.
Super administrators cannot demote themselves under any circumstances.
Promotion and demotion require explicit approval by a super administrator.
Grade changes take effect immediately upon approval by a super administrator.

### Full Platform Oversight

Super administrators have complete visibility into all platform activities.
Super administrators can view all seller accounts and their approval status.
Super administrators can view all customer accounts and ban status.
Super administrators can view all orders, cancellations, and refunds across the platform.
Super administrators can view all product listings and their snapshots.

### Administrator Functions Access

Super administrators have access to all administrator management functions.
Super administrators can approve or reject seller registration requests.
Super administrators can suspend or unsuspend seller accounts.
Super administrators can create, edit, and delete categories.
Super administrators can view and delete any product on the platform.
Super administrators can force-cancel or force-refund any order or order item.
Super administrators can ban or unban customer and seller accounts.

### Grade Change Governance

Super administrators manage all administrator grade change requests on the platform.
Super administrators review and approve all promotion and demotion decisions.
Super administrators maintain records of all grade changes for audit purposes.
Super administrators ensure that grade changes follow platform governance policies.
Super administrators are responsible for preventing unauthorized grade modifications.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Customer Registration

To access any features on the platform, users must register for a customer account. Guest users cannot browse products or access any functionality.

Customers sign up by providing an email address and a password. The email address must be unique and valid. After registration, the customer account is immediately active and can be used for logging in.

If the email address is already registered, the registration is rejected. If the email format is invalid, the registration is rejected. If the password does not meet security requirements, the registration is rejected.

### Seller Registration

Sellers sign up by providing an email address and a password. The email address must be unique and valid.

After registration, the seller account enters a pending approval status. Sellers cannot create products or sell items until an administrator approves their registration.

Sellers can view their approval status, which can be one of: pending, approved, or rejected.

If the registration is rejected, sellers can view the rejection reason provided by the administrator. Rejected sellers can submit a new registration request using the same email address.

If the email address is already registered, the registration is rejected. If the email format is invalid, the registration is rejected.

### Login

Customers and sellers log in by providing their registered email address and password.

After successful authentication, the user is granted access to the platform and their account features.

Guest users (users who have not logged in) cannot browse products, view categories, or access any platform features. Registration is required before any functionality can be used.

If the email address is not found, the login is rejected. If the password is incorrect, the login is rejected. If the account has been banned by an administrator, the login is rejected.

### Seller Approval Status

After seller registration, the account status is pending. The seller must wait for administrator approval before they can use seller features.

Sellers can view their approval status at any time from their dashboard.

Once an administrator approves the registration, the seller account status changes to approved and the seller can begin creating products and selling.

If an administrator rejects the registration, the seller account status changes to rejected and the seller cannot access seller features. The rejection reason is shown to the seller.

### Password Management

Registered customers and sellers can change their passwords from their account settings.

To change a password, the user must provide their current password and the new password. The new password must meet security requirements.

After a successful password change, the user must log in again with the new password.

If the current password is incorrect, the password change is rejected. If the new password does not meet security requirements, the change is rejected.

### Customer Account Deletion

Customers can delete their accounts from their account settings.

When a customer deletes their account:
- Their profile information is deleted (display name and phone number)
- Their order history and order records are preserved for legal and seller record purposes
- Their reviews are preserved but displayed as "deleted user" to maintain product feedback integrity

The customer account is immediately deactivated and the customer cannot log in after deletion.

There are no restrictions on customer account deletion.

### Seller Account Deletion

Sellers can delete their accounts from their account settings, but only if specific conditions are met.

A seller can delete their account only if:
- They have no orders with paid or shipped status
- They have no pending cancellation requests
- They have no pending refund requests

If any of these conditions are not met, the deletion is rejected and the seller must resolve the pending items first.

When a seller deletes their account:
- Their products are deleted from product listings (no longer visible to customers)
- Their order history and order snapshots are preserved
- Their shop name in past orders is preserved

After deletion, the seller cannot log in or reactivate the account.

### Account Ban Management

Administrators can ban customer accounts. When a customer account is banned, the customer cannot log in.

Administrators can unban customer accounts to restore access.

Administrators can ban seller accounts. When a seller account is banned, the seller cannot log in. Existing orders from the banned seller remain active and can be fulfilled.

Administrators can unban seller accounts to restore login access.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

Authenticated users establish a session by providing valid email and password credentials through the platform authentication interface.

A session maintains the user's authentication state for the duration of their active login period. While a session is active, the user can perform operations within their assigned permission scope.

Sessions automatically terminate when users explicitly log out or when the session reaches its configured expiration time. After termination, users must re-authenticate to restore their session.

Guest users maintain a separate session state that provides read-only access to public content without requiring authentication credentials.

Each user type (guest, customer, seller, admin, superadmin) operates within a distinct session that governs their access to platform features and functionality.

### Logout

Any authenticated user can end their session by logging out from the platform.

After logging out, the user's session is terminated and they must log in again to access the platform.

Logging out invalidates all previous session tokens associated with that user.

A user with an active session on one device can log out, which terminates the session on that device only.

If a user logs out, they will be redirected to the public homepage after logout completes.

Logged out users cannot access their account-specific features including profile management, order history, and wishlist.

### Account Security

Customers and sellers maintain account security through password-based authentication.

Users can update their password to protect their account from unauthorized access.

Password changes require verification of the user's identity before updating credentials.

After a password change, the system may require re-authentication on active sessions to ensure security.

Registered users must maintain valid credentials to access their account and associated features.

Administrators cannot view or reset user passwords to maintain account ownership boundaries.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Customer Account Registration

Customers can create an account by providing an email address and password. The email address must be unique across all customer accounts on the platform. Each customer account must have a valid email and a password set at registration.

During registration, the customer provides their email address and chooses a password. The system validates that the email address is not already registered by another customer. If the email is already in use, the registration request is rejected with an appropriate message.

Upon successful registration, the customer account is created and the customer can immediately log in and begin using the platform.

### Seller Account Registration

Sellers can create an account by providing an email address and password. The email address must be unique across all seller accounts on the platform.

During registration, the seller provides their email address and chooses a password. The system validates that the email address is not already registered by another seller. If the email is already in use, the registration request is rejected with an appropriate message.

After registration, the seller account is created with a pending approval status. The seller cannot list products or perform any selling activities until their account is approved by an administrator. The seller can view their approval status, which shows as pending, approved, or rejected.

If the seller's registration is rejected, the system displays the rejection reason provided by the administrator. The seller can submit a new registration request after addressing the issues noted in the rejection reason.

### Account Deletion - Customer

Customers can delete their own account through the account settings page.

When a customer deletes their account:
- Their profile information (display name and phone number) is permanently deleted from the platform
- Their orders and order history are preserved for legal and seller record purposes
- Their reviews are preserved but displayed as "deleted user" to maintain historical context on products
- The customer can no longer log in to the platform

The account deletion is permanent and cannot be undone. All personal data that identifies the customer is removed, except for data required for legal compliance and transaction history.

### Account Deletion - Seller

Sellers can request to delete their seller account, but certain conditions must be met before deletion is allowed.

A seller account can only be deleted if:
- The seller has no orders with pending statuses (including paid or shipped items)
- The seller has no pending cancellation requests for any of their products
- The seller has no pending refund requests for any of their products

If any of these conditions are not met, the deletion request is rejected with an explanation of which items are preventing deletion.

When a seller account is successfully deleted:
- The seller's shop name is preserved in all historical order records
- All products are removed from active listings and search results
- Order history and product snapshots are preserved for transaction records
- The seller can no longer log in to the platform

The seller's deletion request is permanent and cannot be undone.

### Password Change

Both customers and sellers can change their account password through the account settings page.

To change a password, the user must provide:
- Their current password for verification
- A new password that meets the platform's password requirements

The system validates that the current password is correct before allowing the change. If the current password is incorrect, the password change request is rejected.

After a successful password change, the user is logged out from all active sessions for security purposes. The user must log in again with the new password to access their account.