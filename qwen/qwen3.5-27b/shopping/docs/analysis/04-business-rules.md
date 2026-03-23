**shoppingMall — Data isolation, business rules, data browsing expectations, error scenarios**

Data isolation, business rules, data browsing expectations, error scenarios

# Data Isolation and Ownership

Data ownership rules and tenant/user-level isolation policies.

## Ownership and Isolation Rules

Define data ownership semantics and isolation boundaries for multi-user access.

### Customer Data Ownership

THE system SHALL assign ownership of customer profiles to the registered customer account.

THE system SHALL assign ownership of customer addresses to the customer account that created them.

THE system SHALL assign ownership of wishlists to the customer account that created them.

THE system SHALL assign ownership of shopping carts to the customer account that created them.

THE system SHALL assign ownership of orders to the customer account that placed them.

THE system SHALL assign ownership of reviews to the customer account that wrote them.

THE system SHALL assign ownership of cancellation requests to the customer account that submitted them.

THE system SHALL assign ownership of refund requests to the customer account that submitted them.

WHEN a customer deletes their account, THE system SHALL preserve their order history for seller and legal records.

WHEN a customer deletes their account, THE system SHALL preserve their reviews but display them as "deleted user".

WHEN a customer deletes their account, THE system SHALL delete their profile information, addresses, wishlist, and cart.

### Seller Data Ownership

THE system SHALL assign ownership of seller profiles to the registered seller account.

THE system SHALL assign ownership of products to the seller account that created them.

THE system SHALL assign ownership of product variants to the seller account that owns the parent product.

THE system SHALL assign ownership of product images to the seller account that owns the product.

THE system SHALL assign ownership of inventory records to the seller account that owns the variant.

THE system SHALL assign ownership of order items to the seller account that owns the product variant.

THE system SHALL assign ownership of shipments to the seller account that created them.

THE system SHALL assign ownership of seller profile snapshots to the seller account that owns the profile.

THE system SHALL assign ownership of product snapshots to the seller account that owns the product.

THE system SHALL assign ownership of variant snapshots to the seller account that owns the variant.

WHEN a seller deletes their account, THE system SHALL preserve order history and snapshots for records.

WHEN a seller deletes their account, THE system SHALL preserve their shop name in past orders.

WHEN a seller deletes their account, THE system SHALL delete their products from listings.

WHEN a seller is suspended, THE system SHALL hide their products from search and category listings.

WHEN a seller is suspended, THE system SHALL prevent customers from purchasing their products.

### Administrator Data Access

THE system SHALL assign ownership of categories to the platform (administrator-managed).

THE system SHALL assign ownership of seller approval requests to the seller account that submitted them.

THE system SHALL assign ownership of administrator promotion requests to the user account that submitted them.

THE system SHALL assign ownership of all snapshots to the platform for dispute resolution.

THE system SHALL grant super administrators access to all data on the platform.

THE system SHALL grant regular administrators access to all data except super administrator management.

WHEN an administrator views products, THE system SHALL show all products from all sellers.

WHEN an administrator views orders, THE system SHALL show all orders from all customers.

WHEN an administrator views snapshots, THE system SHALL show all snapshots regardless of owner.

WHEN an administrator bans a customer, THE system SHALL prevent the customer from logging in.

WHEN an administrator bans a seller, THE system SHALL prevent the seller from logging in.

WHEN an administrator suspends a seller, THE system SHALL allow the seller to process existing orders.

### Cross-User Data Isolation

THE system SHALL prevent customers from accessing other customers' profiles.

THE system SHALL prevent customers from accessing other customers' addresses.

THE system SHALL prevent customers from accessing other customers' wishlists.

THE system SHALL prevent customers from accessing other customers' shopping carts.

THE system SHALL prevent customers from accessing other customers' orders.

THE system SHALL prevent sellers from accessing other sellers' profiles.

THE system SHALL prevent sellers from accessing other sellers' products.

THE system SHALL prevent sellers from accessing other sellers' inventory records.

THE system SHALL prevent sellers from accessing other sellers' order items.

THE system SHALL prevent sellers from accessing other sellers' shipments.

THE system SHALL prevent sellers from accessing customer profiles except for shipping addresses in their orders.

THE system SHALL prevent customers from accessing seller profiles except for public shop information.

THE system SHALL prevent unauthorized users from accessing snapshots.

WHEN a user attempts to access data they do not own, THE system SHALL reject the request.

### Multi-Seller Order Isolation

THE system SHALL allow customers to view products from all sellers.

THE system SHALL allow customers to view reviews from all customers on products.

THE system SHALL allow customers to view seller profiles and shop information.

THE system SHALL allow sellers to view order items for their own products only.

THE system SHALL allow sellers to view customer shipping addresses for their order items only.

THE system SHALL allow sellers to respond to cancellation requests for their order items only.

THE system SHALL allow sellers to respond to refund requests for their order items only.

THE system SHALL allow sellers to create shipments for their order items only.

WHEN an order contains items from multiple sellers, THE system SHALL isolate each seller's order items.

WHEN an order contains items from multiple sellers, THE system SHALL allow each seller to ship their items independently.

WHEN an order contains items from multiple sellers, THE system SHALL allow customers to cancel individual items from different sellers.

WHEN an order contains items from multiple sellers, THE system SHALL allow customers to request refunds for individual items from different sellers.

WHEN a shipment contains multiple order items, THE system SHALL ensure all items belong to the same seller.

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must register with a unique email and password to access any platform features. Email addresses must be unique among all active accounts. Users can log in using their email and password credentials. Users can change their password at any time after logging in. Users can delete their account, which removes their profile information but preserves their order history. Account deletion does not remove past orders or reviews, which remain visible for legal and seller record purposes. Reviews from deleted accounts are displayed as belonging to a deleted user. Password changes require the user to be authenticated. Registration and login attempts are subject to rate limiting to prevent abuse.

### User Registration Rules

WHEN a user attempts to register, THE system SHALL require an email address and password.

IF the email address is already registered to an active account, THEN THE system SHALL reject the registration request.

IF the email address format is invalid, THEN THE system SHALL reject the registration request.

IF the password is empty or missing, THEN THE system SHALL reject the registration request.

WHEN a user successfully registers, THE system SHALL create a User record with the provided email and password hash.

WHEN a user successfully registers, THE system SHALL create an associated CustomerProfile record.

IF the user already has a pending seller approval request, THEN THE system SHALL reject the new registration request.

IF the user account is currently banned, THEN THE system SHALL reject the registration request.

IF the user account is currently deleted, THEN THE system SHALL reject the registration request.

### Email Uniqueness Rules

IF an email address is already associated with an active User account, THEN THE system SHALL prevent registration with that same email address.

IF an email address is associated with a deleted User account, THEN THE system SHALL allow registration with that email address.

IF an email address is associated with a banned User account, THEN THE system SHALL prevent registration with that same email address.

THE system SHALL treat email addresses as case-insensitive for uniqueness validation.

WHEN checking email uniqueness, THE system SHALL only consider active (non-deleted) accounts.

IF a user attempts to change their email to an address already in use, THEN THE system SHALL reject the email change request.

### Password Authentication Rules

WHEN a user attempts to log in, THE system SHALL require both email and password credentials.

IF the provided email is not associated with any User account, THEN THE system SHALL reject the login attempt.

IF the provided password does not match the stored password hash, THEN THE system SHALL reject the login attempt.

IF the User account is deleted, THEN THE system SHALL reject the login attempt.

IF the User account is banned, THEN THE system SHALL reject the login attempt.

IF the User account is suspended (for sellers), THEN THE system SHALL reject the login attempt.

WHEN a user successfully logs in, THE system SHALL create an authenticated session.

IF the user provides incorrect credentials multiple times within a short period, THEN THE system SHALL temporarily block further login attempts.

IF the user's password has been changed since the last successful login, THE system SHALL invalidate existing sessions.

### Password Change Rules

WHEN an authenticated user requests to change their password, THE system SHALL require the current password for verification.

IF the current password provided is incorrect, THEN THE system SHALL reject the password change request.

IF the new password is empty or missing, THEN THE system SHALL reject the password change request.

IF the new password is identical to the current password, THEN THE system SHALL reject the password change request.

WHEN a user successfully changes their password, THE system SHALL update the password hash in the User record.

WHEN a user successfully changes their password, THE system SHALL invalidate all existing sessions for that user.

IF a user attempts to change their password while their account is banned, THEN THE system SHALL reject the password change request.

IF a user attempts to change their password while their account is deleted, THEN THE system SHALL reject the password change request.

### Account Deletion Rules

WHEN a user requests to delete their account, THE system SHALL verify the user is authenticated.

IF the user has pending orders with items in paid or shipped status, THEN THE system SHALL reject the account deletion request.

IF the user has pending cancellation requests, THEN THE system SHALL reject the account deletion request.

IF the user has pending refund requests, THEN THE system SHALL reject the account deletion request.

WHEN a user successfully deletes their account, THE system SHALL set the deletedAt timestamp on the User record.

WHEN a user successfully deletes their account, THE system SHALL remove the CustomerProfile information.

WHEN a user successfully deletes their account, THE system SHALL preserve all Order records associated with the user.

WHEN a user successfully deletes their account, THE system SHALL preserve all OrderItem records associated with the user.

IF the user is a seller with pending orders, THEN THE system SHALL reject the account deletion request.

IF the user is a seller with pending cancellation or refund requests, THEN THE system SHALL reject the account deletion request.

### Order History Preservation Rules

WHEN a user deletes their account, THE system SHALL preserve all Order records created by that user.

WHEN a user deletes their account, THE system SHALL preserve all OrderItem records within those orders.

WHEN a user deletes their account, THE system SHALL preserve the shipping address snapshot stored in each order.

WHEN a user deletes their account, THE system SHALL preserve product snapshots associated with order items.

WHEN a user deletes their account, THE system SHALL preserve seller profile snapshots associated with order items.

WHEN viewing order history, THE system SHALL display orders from deleted accounts with the same information as active accounts.

WHEN a seller views order items for their products, THE system SHALL display orders from deleted customer accounts.

WHEN an administrator views order records, THE system SHALL display orders from deleted user accounts.

THE system SHALL retain order history indefinitely after account deletion for legal and seller record purposes.

### Review Preservation Rules

WHEN a user deletes their account, THE system SHALL preserve all Review records created by that user.

WHEN a user deletes their account, THE system SHALL mark all their reviews as belonging to a deleted user.

WHEN displaying reviews on a product detail page, THE system SHALL show reviews from deleted users with a "deleted user" indicator.

WHEN displaying reviews on a product detail page, THE system SHALL include reviews from deleted users in the average rating calculation.

WHEN a user deletes their account, THE system SHALL preserve all ReviewSnapshot records associated with their reviews.

WHEN an administrator views review records, THE system SHALL display reviews from deleted user accounts.

WHEN a seller views reviews for their products, THE system SHALL display reviews from deleted customer accounts.

THE system SHALL retain review content and ratings from deleted accounts indefinitely for dispute resolution purposes.

### Rate Limiting Rules

WHEN a user makes multiple registration attempts within a short time period, THE system SHALL limit the number of allowed attempts.

WHEN a user makes multiple failed login attempts within a short time period, THE system SHALL temporarily block further login attempts.

IF a user exceeds the maximum number of login attempts within the rate limit window, THEN THE system SHALL reject subsequent login attempts.

WHEN the rate limit window expires, THE system SHALL allow the user to attempt login again.

IF a user makes multiple password change requests within a short time period, THE system SHALL limit the number of allowed attempts.

IF a user makes multiple account deletion requests within a short time period, THE system SHALL limit the number of allowed attempts.

THE system SHALL apply rate limiting per IP address to prevent abuse from multiple accounts.

THE system SHALL apply rate limiting per user account to prevent automated attacks.

IF rate limiting is triggered, THE system SHALL inform the user of the temporary restriction without revealing specific security details.

## CustomerProfile Rules

Each customer has a profile containing a display name and phone number. Customers can update their display name at any time. Customers can update their phone number at any time. Display names are visible to sellers and other platform users. Phone numbers are used for shipping address management and order notifications. Customers must have a profile to place orders. Profile information is separate from authentication credentials. Display names can be changed without affecting the underlying user account. Phone numbers in the profile can differ from phone numbers in shipping addresses.

### Display Name Rules

THE system SHALL allow customers to set a display name in their profile.

THE system SHALL allow customers to update their display name at any time.

THE system SHALL make customer display names visible to sellers and other platform users.

THE system SHALL display customer display names on product reviews.

THE system SHALL display customer display names in seller order management views.

IF a customer does not set a display name, THE system SHALL use a default identifier.

THE system SHALL preserve display name history through profile snapshots.

WHEN a customer updates their display name, THE system SHALL record the change timestamp.

THE system SHALL allow display names to differ from authentication email addresses.

THE system SHALL not require display name uniqueness across customers.

### Phone Number Rules

THE system SHALL allow customers to set a phone number in their profile.

THE system SHALL allow customers to update their phone number at any time.

THE system SHALL use profile phone numbers for shipping address management.

THE system SHALL use profile phone numbers for order notification purposes.

THE system SHALL allow profile phone numbers to differ from shipping address phone numbers.

THE system SHALL preserve phone number change history through profile snapshots.

WHEN a customer updates their phone number, THE system SHALL record the change timestamp.

THE system SHALL not require phone number uniqueness across customers.

IF a customer deletes their account, THE system SHALL preserve phone number in order history snapshots.

THE system SHALL allow customers to have a profile phone number without requiring it for account creation.

### Profile Editing Rules

THE system SHALL allow customers to edit their display name at any time.

THE system SHALL allow customers to edit their phone number at any time.

THE system SHALL create a profile snapshot whenever editable fields are modified.

THE system SHALL preserve previous profile values in snapshots.

THE system SHALL record the timestamp of each profile edit.

THE system SHALL allow customers to view their profile edit history through snapshots.

THE system SHALL allow customers to update display name and phone number independently.

WHEN a customer edits their profile, THE system SHALL update the profile immediately.

THE system SHALL not require administrator approval for profile edits.

THE system SHALL preserve profile data even after customer account deletion.

### Profile Visibility Rules

THE system SHALL make customer display names visible to sellers.

THE system SHALL make customer display names visible to other platform users.

THE system SHALL hide customer profile phone numbers from other users.

THE system SHALL make customer profile information visible only to the owner and administrators.

THE system SHALL display customer display names on public-facing reviews.

THE system SHALL display customer display names in order details visible to sellers.

IF a customer deletes their account, THE system SHALL show "deleted user" instead of display name.

THE system SHALL not expose customer profile information in search results.

THE system SHALL not expose customer profile information in product listings.

THE system SHALL protect customer profile data from unauthorized access.

### Profile Requirements

THE system SHALL require customers to have a profile to place orders.

THE system SHALL automatically create a customer profile upon user registration.

THE system SHALL associate exactly one customer profile with each user account.

THE system SHALL not allow customers to place orders without a profile.

THE system SHALL maintain profile information separately from authentication credentials.

THE system SHALL preserve customer profiles for order history even after account deletion.

THE system SHALL link all customer orders to their profile.

THE system SHALL link all customer wishlists to their profile.

THE system SHALL link all customer shopping carts to their profile.

THE system SHALL link all customer reviews to their profile.

### Shipping Notification Rules

THE system SHALL use customer profile phone numbers for order notifications.

THE system SHALL send shipping notifications to the customer's profile phone number.

THE system SHALL send delivery confirmation requests to the customer's profile phone number.

THE system SHALL send cancellation status notifications to the customer's profile phone number.

THE system SHALL send refund status notifications to the customer's profile phone number.

WHEN a customer updates their profile phone number, THE system SHALL use the new number for future notifications.

THE system SHALL allow customers to opt out of phone number notifications.

THE system SHALL not expose customer phone numbers to other platform users through notifications.

IF a customer does not have a profile phone number, THE system SHALL use email for notifications.

THE system SHALL preserve notification history for dispute resolution.

## SellerProfile Rules

Each seller has a profile with a shop name, shop description, and logo image. Sellers can edit their shop name, description, and logo at any time. Every profile edit creates a snapshot preserving the previous state. Seller profiles are visible to customers browsing products. Shop names appear on product listings and order details. Logo images are displayed on product pages and seller profile pages. Sellers must be approved by administrators before their profiles become active. Profile snapshots are immutable and cannot be deleted. Profile information at the time of purchase is preserved in order item snapshots.

### Seller Shop Name Business Rules

THE system SHALL require each seller to have a shop name when creating their seller profile.

THE system SHALL display the seller's shop name on product listing pages.

THE system SHALL display the seller's shop name on product detail pages.

THE system SHALL display the seller's shop name on order detail pages.

THE system SHALL preserve the shop name at the time of purchase in order item snapshots.

WHEN a seller edits their shop name, THE system SHALL create a profile snapshot preserving the previous shop name.

THE system SHALL allow sellers to view their own shop name at any time.

THE system SHALL allow customers to view seller shop names for all approved sellers.

IF a seller's approval status is pending, THE system SHALL still display their shop name on their profile page.

IF a seller's approval status is rejected, THE system SHALL not display their shop name in product listings.

IF a seller's approval status is suspended, THE system SHALL hide their shop name from product listings.

THE system SHALL preserve shop names in historical orders even after a seller deletes their account.

### Seller Description Business Rules

THE system SHALL allow sellers to provide a shop description for their seller profile.

THE system SHALL display the shop description on the seller profile page.

THE system SHALL display the shop description on product detail pages.

WHEN a seller edits their shop description, THE system SHALL create a profile snapshot preserving the previous description.

THE system SHALL preserve the shop description at the time of purchase in order item snapshots.

IF a seller does not provide a shop description, THE system SHALL display an empty description field.

THE system SHALL allow sellers to update their shop description at any time while their account is active.

WHEN a seller's account is suspended, THE system SHALL continue to display their shop description on existing order details.

THE system SHALL preserve shop descriptions in historical orders even after a seller deletes their account.

IF a seller's approval status is rejected, THE system SHALL not display their shop description in product listings.

THE system SHALL allow customers to view shop descriptions for all approved sellers.

WHEN a seller edits their description multiple times, THE system SHALL create a separate snapshot for each edit.

### Seller Logo Business Rules

THE system SHALL allow sellers to upload a logo image for their seller profile.

THE system SHALL display the seller's logo on the seller profile page.

THE system SHALL display the seller's logo on product detail pages.

THE system SHALL display the seller's logo on order detail pages.

WHEN a seller uploads or changes their logo, THE system SHALL create a profile snapshot preserving the previous logo.

THE system SHALL preserve the logo at the time of purchase in order item snapshots.

IF a seller does not upload a logo, THE system SHALL display a default placeholder image.

THE system SHALL allow sellers to replace their logo at any time while their account is active.

WHEN a seller's account is suspended, THE system SHALL continue to display their logo on existing order details.

THE system SHALL preserve logos in historical orders even after a seller deletes their account.

IF a seller's approval status is rejected, THE system SHALL not display their logo in product listings.

IF a seller's approval status is pending, THE system SHALL not display their logo in product listings.

THE system SHALL allow customers to view seller logos for all approved sellers.

### Profile Editing and Snapshot Rules

WHEN a seller edits their profile (shop name, description, or logo), THE system SHALL create a profile snapshot.

THE system SHALL record the timestamp when each profile snapshot is created.

THE system SHALL preserve all previous profile states in snapshots.

THE system SHALL make profile snapshots immutable after creation.

THE system SHALL prevent sellers from deleting their profile snapshots.

THE system SHALL allow sellers to view their own profile snapshots.

THE system SHALL allow administrators to view any seller's profile snapshots.

WHEN a seller's profile is edited, THE system SHALL preserve the complete previous state including shop name, description, and logo.

THE system SHALL create a snapshot before applying any profile changes.

IF a profile edit fails, THE system SHALL not create a snapshot.

THE system SHALL maintain an audit trail of all profile changes through snapshots.

WHEN a seller deletes their account, THE system SHALL preserve all existing profile snapshots.

THE system SHALL preserve profile snapshots indefinitely for dispute resolution purposes.

### Seller Approval Status Rules

THE system SHALL require administrator approval before a seller can list products for sale.

WHEN a seller registers, THE system SHALL set their approval status to pending.

WHEN an administrator approves a seller, THE system SHALL change their approval status to approved.

WHEN an administrator rejects a seller, THE system SHALL change their approval status to rejected.

WHEN an administrator suspends a seller, THE system SHALL change their approval status to suspended.

IF a seller's approval status is pending, THE system SHALL prevent them from creating new products.

IF a seller's approval status is pending, THE system SHALL prevent customers from purchasing their products.

IF a seller's approval status is approved, THE system SHALL allow them to create and manage products.

IF a seller's approval status is approved, THE system SHALL make their products visible to customers.

IF a seller's approval status is rejected, THE system SHALL prevent them from creating new products.

IF a seller's approval status is rejected, THE system SHALL hide their products from search and category listings.

IF a seller's approval status is suspended, THE system SHALL prevent them from creating new products.

IF a seller's approval status is suspended, THE system SHALL prevent them from editing existing products.

IF a seller's approval status is suspended, THE system SHALL hide their products from search and category listings.

IF a seller's approval status is suspended, THE system SHALL still allow them to process existing orders.

THE system SHALL allow sellers to view their current approval status.

IF a seller's approval status is rejected, THE system SHALL display the rejection reason to the seller.

THE system SHALL allow rejected sellers to submit a new registration request.

### Profile Visibility and Access Rules

THE system SHALL allow customers to view seller profiles for all approved sellers.

THE system SHALL allow customers to view seller profiles through product detail pages.

THE system SHALL allow customers to view seller profiles through direct profile links.

IF a seller's approval status is pending, THE system SHALL not display their profile in search results.

IF a seller's approval status is rejected, THE system SHALL not display their profile in search results.

IF a seller's approval status is suspended, THE system SHALL not display their profile in search results.

THE system SHALL allow sellers to view their own profile at any time.

THE system SHALL allow administrators to view any seller's profile regardless of approval status.

WHEN a customer views a seller profile, THE system SHALL display the shop name, description, and logo.

THE system SHALL allow customers to access seller profiles from order detail pages.

IF a seller deletes their account, THE system SHALL preserve their profile information in historical orders.

IF a seller deletes their account, THE system SHALL not display their profile page to customers.

THE system SHALL allow customers to view seller profiles even if the seller has no active products.

THE system SHALL display seller profile information on product listing cards.

### Purchase Time Profile Preservation Rules

WHEN a customer places an order, THE system SHALL create a snapshot of each seller's profile involved in the order.

THE system SHALL preserve the seller's shop name at the time of purchase in the order item snapshot.

THE system SHALL preserve the seller's shop description at the time of purchase in the order item snapshot.

THE system SHALL preserve the seller's logo at the time of purchase in the order item snapshot.

THE system SHALL store the profile snapshot with the order item record.

WHEN a customer views an order detail, THE system SHALL display the seller profile information from the purchase time snapshot.

IF a seller changes their profile after a purchase, THE system SHALL not update historical order snapshots.

IF a seller deletes their account, THE system SHALL preserve the profile snapshots in all historical orders.

IF a seller's approval status changes after a purchase, THE system SHALL not affect the profile snapshot in historical orders.

THE system SHALL preserve profile snapshots in orders indefinitely.

WHEN a dispute occurs, THE system SHALL allow administrators to view the seller profile as it appeared at purchase time.

THE system SHALL allow customers to view the seller profile information from the time of their purchase.

IF a seller edits their profile multiple times, THE system SHALL preserve only the version that existed at each purchase time.

## AdministratorProfile Rules

Administrators have two grades: regular administrator and super administrator. Any user can submit a request to become an administrator with a reason. Super administrators can approve or reject administrator promotion requests. Super administrators can promote regular administrators to super administrator status. Super administrators can demote other super administrators to regular administrator status. Super administrators cannot demote themselves. Administrator grade changes are recorded and auditable. Regular administrators can manage sellers, categories, products, and orders. Super administrators have all regular administrator capabilities plus grade management.

### Administrator Grade Structure

THE system SHALL maintain two administrator grades: regular administrator and super administrator.

THE system SHALL assign the regular administrator grade when a promotion request is approved by a super administrator.

THE system SHALL assign the super administrator grade only when a super administrator promotes a regular administrator to super administrator status.

A super administrator SHALL have all capabilities of a regular administrator plus grade management authority.

A regular administrator SHALL NOT have authority to manage administrator grades.

THE system SHALL record the grade assignment timestamp when an administrator grade is assigned.

THE system SHALL preserve the previous grade value in an audit record when a grade change occurs.

### Administrator Promotion Process

WHEN a user submits an administrator promotion request, THE system SHALL require a reason text field.

WHEN a super administrator approves a promotion request, THE system SHALL assign the regular administrator grade to the requesting user.

WHEN a super administrator rejects a promotion request, THE system SHALL record the rejection reason.

THE system SHALL only allow super administrators to approve or reject administrator promotion requests.

IF a promotion request has already been responded to, THE system SHALL prevent duplicate responses.

IF a user already has an administrator grade, THE system SHALL reject new promotion requests from that user.

WHEN a promotion request is approved, THE system SHALL create an audit record of the approval action.

WHEN a promotion request is rejected, THE system SHALL allow the user to submit a new promotion request.

THE system SHALL display the current status of each promotion request to the requesting user.

THE system SHALL display all pending promotion requests to super administrators.

### Grade Demotion Rules

WHEN a super administrator demotes another super administrator, THE system SHALL change their grade to regular administrator.

THE system SHALL prevent a super administrator from demoting themselves.

IF a user attempts to demote themselves, THE system SHALL reject the request.

THE system SHALL record all grade demotion actions in an audit trail with timestamp and actor information.

WHEN a grade demotion occurs, THE system SHALL preserve the previous grade value in the audit record.

THE system SHALL maintain at least one super administrator at all times.

IF only one super administrator exists, THE system SHALL prevent any demotion action that would eliminate all super administrators.

WHEN a super administrator demotes another super administrator, THE system SHALL verify the target user is not the acting super administrator.

### Administrator Capabilities

A regular administrator SHALL be able to manage seller approval requests.

A regular administrator SHALL be able to manage categories including creation, editing, and deletion.

A regular administrator SHALL be able to view all products on the platform.

A regular administrator SHALL be able to delete products for policy violations.

A regular administrator SHALL be able to view all orders on the platform.

A regular administrator SHALL be able to force-cancel order items or entire orders.

A regular administrator SHALL be able to force-refund order items or entire orders.

A regular administrator SHALL be able to view all customer accounts.

A regular administrator SHALL be able to ban and unban customer accounts.

A regular administrator SHALL be able to view all seller accounts.

A regular administrator SHALL be able to ban and unban seller accounts.

A regular administrator SHALL be able to suspend and unsuspend seller accounts.

A super administrator SHALL have all capabilities of a regular administrator.

A super administrator SHALL be able to approve and reject administrator promotion requests.

A super administrator SHALL be able to promote regular administrators to super administrator status.

A super administrator SHALL be able to demote other super administrators to regular administrator status.

A regular administrator SHALL NOT be able to manage administrator grades.

A regular administrator SHALL NOT be able to approve or reject administrator promotion requests.

A super administrator SHALL be able to view all audit records of grade changes.

## Address Rules

Customers can add multiple shipping addresses to their account. Each address contains recipient name, phone number, street address, city, state or province, postal code, and country. Customers can edit any of their saved addresses at any time. Customers can delete addresses they no longer need. Customers must set one address as their default shipping address. The default address is automatically selected during checkout. Customers can change their default address at any time. Addresses are used for order shipping and cannot be changed after order placement. Address information is preserved in order snapshots at the time of purchase.

### Multiple Shipping Addresses Management

THE system SHALL allow a customer to create multiple shipping addresses in their account.

THE system SHALL store all shipping addresses associated with a customer's account.

THE system SHALL allow a customer to view all their saved shipping addresses.

WHEN a customer adds a new address, THE system SHALL associate it with their customer profile.

WHEN a customer views their address list, THE system SHALL display all saved addresses.

THE system SHALL allow customers to have at least one shipping address in their account.

IF a customer attempts to delete their last remaining address, THE system SHALL require them to set another address as default first or prevent the deletion.

### Address Component Requirements

THE system SHALL require each address to include a recipient name.

THE system SHALL require each address to include a phone number.

THE system SHALL require each address to include a street address.

THE system SHALL require each address to include a city.

THE system SHALL require each address to include a state or province.

THE system SHALL require each address to include a postal code.

THE system SHALL require each address to include a country.

WHEN a customer creates an address, THE system SHALL validate that all required components are provided.

IF any required address component is missing, THE system SHALL reject the address creation.

THE system SHALL store all address components together as a single address record.

### Address Editing Rules

WHEN a customer edits an address, THE system SHALL allow them to modify any address component.

THE system SHALL update the address with the new component values when a customer saves changes.

WHEN a customer edits an address, THE system SHALL preserve the address association with their account.

IF an address component is changed to an invalid value, THE system SHALL reject the edit.

THE system SHALL update the address timestamp when any component is modified.

WHEN a customer edits their default address, THE system SHALL maintain its default status after the edit.

THE system SHALL allow customers to edit addresses at any time before they are used in an order.

### Address Deletion Rules

WHEN a customer deletes an address, THE system SHALL remove it from their address list.

IF a customer attempts to delete their default address, THE system SHALL require them to set a different default address first.

THE system SHALL allow customers to delete any address that is not currently set as default.

WHEN an address is deleted, THE system SHALL permanently remove it from the customer's available addresses.

IF a deleted address was used in a past order, THE system SHALL preserve the address snapshot in that order record.

THE system SHALL not allow restoration of deleted addresses.

### Default Address Rules

THE system SHALL require each customer to have exactly one default shipping address.

WHEN a customer sets an address as default, THE system SHALL remove the default status from any previously default address.

WHEN a customer creates their first address, THE system SHALL automatically set it as the default.

WHEN a customer views their addresses, THE system SHALL clearly indicate which address is the default.

IF a customer attempts to delete their default address, THE system SHALL prevent deletion until another address is set as default.

THE system SHALL allow customers to change their default address at any time.

WHEN a customer changes their default address, THE system SHALL update the default designation immediately.

### Checkout Address Selection

WHEN a customer proceeds to checkout, THE system SHALL display their saved addresses for selection.

THE system SHALL automatically pre-select the customer's default address during checkout.

WHEN a customer selects an address at checkout, THE system SHALL use it as the shipping address for the order.

IF a customer has no saved addresses, THE system SHALL require them to create one before checkout.

THE system SHALL allow customers to create a new address during the checkout process.

WHEN a customer creates an address during checkout, THE system SHALL save it to their address list for future use.

THE system SHALL allow customers to change their address selection before placing the order.

### Address Preservation in Orders

WHEN an order is placed, THE system SHALL create a snapshot of the shipping address used.

THE system SHALL preserve the complete address information in the order record at the time of purchase.

WHEN a customer views their order history, THE system SHALL display the shipping address that was used for each order.

IF a customer deletes an address from their account, THE system SHALL preserve it in all past orders where it was used.

IF a customer edits an address, THE system SHALL not modify the address snapshots in existing orders.

THE system SHALL maintain address snapshots indefinitely for order records.

WHEN an order is viewed, THE system SHALL show the exact address as it existed at order placement time.

### Shipping Address Immutability

WHEN an order is placed, THE system SHALL lock the shipping address for that order.

THE system SHALL not allow customers to change the shipping address after an order is placed.

IF a customer requests to change the shipping address after order placement, THE system SHALL reject the request.

THE system SHALL not allow sellers to modify the shipping address of an order.

THE system SHALL not allow administrators to modify the shipping address of an order.

IF a shipping address error is discovered after order placement, THE system SHALL require order cancellation and reordering.

WHEN an order status changes, THE system SHALL maintain the original shipping address unchanged.

## Category Rules

Products are organized into categories for browsing and search. Categories can have subcategories with one level of nesting only. Each category has a name and description. Categories are created and managed exclusively by administrators. Customers can browse the complete list of categories and subcategories. Customers can view all products within a selected category. Administrators can edit category names and descriptions. Administrators can delete categories, which makes products in that category uncategorized. Category structure affects product search and filtering capabilities.

### Category Hierarchy Structure

THE system SHALL organize categories in a hierarchical structure with parent and child relationships.

THE system SHALL allow categories to have subcategories with exactly one level of nesting.

THE system SHALL NOT allow subcategories to have their own subcategories (no more than two levels total).

THE system SHALL permit categories without parents to exist as top-level categories.

THE system SHALL permit categories with parents to exist as subcategories.

WHEN a parent category is viewed, THE system SHALL display all its direct subcategories.

WHEN a subcategory is viewed, THE system SHALL display its parent category relationship.

IF a category has no subcategories, THE system SHALL display it as a leaf category.

IF a category has subcategories, THE system SHALL display it as a parent category.

THE system SHALL maintain the hierarchy structure even when categories are edited or deleted.

### Category Naming and Description Rules

THE system SHALL require each category to have a unique name within its parent level.

THE system SHALL require each category to have a description.

THE system SHALL allow category names to be alphanumeric with special characters.

THE system SHALL allow category descriptions to contain text content.

WHEN a category name is displayed, THE system SHALL show the name as provided by the administrator.

WHEN a category description is displayed, THE system SHALL show the description as provided by the administrator.

IF a category name is empty or missing, THE system SHALL reject the category creation or update.

IF a category description is empty or missing, THE system SHALL reject the category creation or update.

THE system SHALL preserve the original category name and description in snapshots when edited.

### Administrator Category Management

THE system SHALL restrict category creation to administrators only.

THE system SHALL restrict category editing to administrators only.

THE system SHALL restrict category deletion to administrators only.

THE system SHALL restrict subcategory assignment to administrators only.

WHEN an administrator creates a category, THE system SHALL associate it with the administrator who created it.

WHEN an administrator edits a category, THE system SHALL record the change with a timestamp.

WHEN an administrator deletes a category, THE system SHALL preserve the deletion record.

IF a user is not an administrator, THE system SHALL prevent them from creating categories.

IF a user is not an administrator, THE system SHALL prevent them from editing categories.

IF a user is not an administrator, THE system SHALL prevent them from deleting categories.

### Category Browsing and Filtering

THE system SHALL allow customers to browse all top-level categories.

THE system SHALL allow customers to browse all subcategories within a selected parent category.

THE system SHALL display categories in a navigable list format.

THE system SHALL display the category name and description for each category.

THE system SHALL allow customers to view products within a selected category.

THE system SHALL allow customers to view products within a selected subcategory.

WHEN a customer browses categories, THE system SHALL show all active categories.

WHEN a customer selects a category, THE system SHALL display all products in that category.

WHEN a customer selects a subcategory, THE system SHALL display all products in that subcategory.

IF a category has no products, THE system SHALL display an empty state message.

### Category Editing Business Rules

THE system SHALL allow administrators to edit category names.

THE system SHALL allow administrators to edit category descriptions.

THE system SHALL allow administrators to change a category's parent relationship.

WHEN an administrator edits a category name, THE system SHALL update the name for all users.

WHEN an administrator edits a category description, THE system SHALL update the description for all users.

WHEN an administrator changes a category's parent, THE system SHALL update the hierarchy.

IF a category name already exists at the same parent level, THE system SHALL reject the edit.

IF the new parent category would create more than one level of nesting, THE system SHALL reject the edit.

WHEN a category is edited, THE system SHALL create a snapshot of the previous state.

### Category Deletion and Product Impact

THE system SHALL allow administrators to delete categories.

WHEN a category is deleted, THE system SHALL make all products in that category uncategorized.

WHEN a category is deleted, THE system SHALL preserve the products themselves.

WHEN a category is deleted, THE system SHALL remove it from all category listings.

WHEN a category is deleted, THE system SHALL remove it from search filters.

IF a category has subcategories, THE system SHALL require those subcategories to be reassigned or deleted first.

IF a category has products, THE system SHALL allow deletion but uncategorize those products.

WHEN a category is deleted, THE system SHALL preserve the deletion in administrative records.

THE system SHALL NOT allow deleted categories to be restored.

### Product Categorization Rules

THE system SHALL require every product to be associated with a category.

THE system SHALL allow products to be assigned to either parent categories or subcategories.

THE system SHALL allow products to be reassigned to different categories.

WHEN a product is created, THE system SHALL require a category assignment.

WHEN a product is edited, THE system SHALL allow the category to be changed.

WHEN a product's category is changed, THE system SHALL update the product's category relationship.

IF a product's category is deleted, THE system SHALL mark the product as uncategorized.

IF a product is uncategorized, THE system SHALL still allow it to be viewed by administrators.

WHEN products are browsed by category, THE system SHALL only show products assigned to that category or its subcategories.

## Product Rules

Sellers can create products with a name, description, category, and base price. All product fields are required for product creation. Products belong to the seller who created them. Sellers can edit their own products at any time. Every product edit creates a snapshot preserving the previous state. Sellers can delete products only if no pending order items exist for any variant. Product deletion also removes all variants and inventory records. Deleted products no longer appear in search or category listings. Product snapshots are preserved even after product deletion. Administrators can view and delete any product on the platform.

### Product Creation Requirements

WHEN a seller creates a product, THE system SHALL require all mandatory fields to be provided.

IF the product name is missing, THE system SHALL reject the product creation.

IF the product description is missing, THE system SHALL reject the product creation.

IF no category is selected, THE system SHALL reject the product creation.

IF the base price is missing or zero, THE system SHALL reject the product creation.

IF the base price is negative, THE system SHALL reject the product creation.

IF the seller account is suspended, THE system SHALL reject the product creation.

IF the seller account is banned, THE system SHALL reject the product creation.

### Product Field Requirements

THE system SHALL validate that the product name contains at least one character.

THE system SHALL validate that the product description contains at least one character.

THE system SHALL validate that the selected category exists and is not deleted.

THE system SHALL validate that the base price is a positive number.

IF a seller attempts to create a product with an invalid category, THE system SHALL reject the creation.

IF a seller attempts to create a product with a non-numeric base price, THE system SHALL reject the creation.

### Product Ownership Rules

THE system SHALL associate each product with the seller who created it.

THE system SHALL prevent sellers from editing products owned by other sellers.

THE system SHALL prevent sellers from deleting products owned by other sellers.

THE system SHALL prevent sellers from viewing products owned by other sellers in the seller dashboard.

THE system SHALL allow the owning seller to view all products they created.

THE system SHALL allow the owning seller to edit their own products.

THE system SHALL allow the owning seller to delete their own products if constraints are met.

### Product Editing Rules

WHEN a seller edits a product, THE system SHALL create a snapshot of the previous state.

THE system SHALL allow sellers to modify the product name.

THE system SHALL allow sellers to modify the product description.

THE system SHALL allow sellers to change the product category.

THE system SHALL allow sellers to update the base price.

IF the edited product name is empty, THE system SHALL reject the edit.

IF the edited product description is empty, THE system SHALL reject the edit.

IF the edited category does not exist, THE system SHALL reject the edit.

IF the edited base price is negative, THE system SHALL reject the edit.

IF the edited base price is zero, THE system SHALL reject the edit.

THE system SHALL preserve all previous product states in snapshots after each edit.

### Product Snapshot Rules

WHEN a product is edited, THE system SHALL automatically create a product snapshot.

THE system SHALL include all product fields in the snapshot.

THE system SHALL include snapshots of all variants in the product snapshot.

THE system SHALL record the timestamp of when the snapshot was created.

THE system SHALL preserve snapshots even after the product is deleted.

THE system SHALL allow the owning seller to view their product snapshots.

THE system SHALL allow administrators to view all product snapshots.

THE system SHALL prevent users from modifying snapshot data.

THE system SHALL prevent users from deleting snapshots.

### Product Deletion Constraints

IF a product has any order items with status paid, THE system SHALL prevent product deletion.

IF a product has any order items with status shipped, THE system SHALL prevent product deletion.

IF a product has any pending cancellation requests for its variants, THE system SHALL prevent product deletion.

IF a product has any pending refund requests for its variants, THE system SHALL prevent product deletion.

WHEN a product is deleted, THE system SHALL also delete all its variants.

WHEN a product is deleted, THE system SHALL also delete all inventory records for its variants.

WHEN a product is deleted, THE system SHALL preserve all product snapshots.

WHEN a product is deleted, THE system SHALL preserve all variant snapshots.

IF a seller attempts to delete a product with pending orders, THE system SHALL reject the deletion.

### Variant Deletion Constraints

IF a variant has any order items with status paid, THE system SHALL prevent variant deletion.

IF a variant has any order items with status shipped, THE system SHALL prevent variant deletion.

IF a variant has any pending cancellation requests, THE system SHALL prevent variant deletion.

IF a variant has any pending refund requests, THE system SHALL prevent variant deletion.

WHEN a variant is deleted, THE system SHALL preserve all variant snapshots.

IF a seller attempts to delete a variant with pending orders, THE system SHALL reject the deletion.

THE system SHALL allow deletion of variants with no pending orders or requests.

### Search Visibility Rules

THE system SHALL include active products in search results.

THE system SHALL include products in category listings.

IF a product is deleted, THE system SHALL remove it from search results.

IF a product is deleted, THE system SHALL remove it from category listings.

IF a seller is suspended, THE system SHALL hide their products from search results.

IF a seller is suspended, THE system SHALL hide their products from category listings.

IF all variants of a product are out of stock, THE system SHALL mark the product as unavailable.

IF a product has no variants, THE system SHALL mark the product as unavailable in search results.

### Administrator Product Oversight Rules

THE system SHALL allow administrators to view all products on the platform.

THE system SHALL allow administrators to view snapshots of any product.

THE system SHALL allow administrators to delete any product for policy violations.

WHEN an administrator deletes a product, THE system SHALL preserve all snapshots.

THE system SHALL allow administrators to view products regardless of seller status.

THE system SHALL allow administrators to view products from suspended sellers.

THE system SHALL allow administrators to view deleted products through snapshots.

IF an administrator deletes a product, THE system SHALL also delete all its variants.

IF an administrator deletes a product, THE system SHALL also delete all inventory records.

## ProductImage Rules

Sellers can upload multiple images for each product. Images can be reordered by the seller. The first image in the order serves as the main thumbnail image. The main image is displayed on product listings and search results. Sellers can delete images from their products at any time. Image changes are included in product snapshots. Products must have at least one image to be fully visible. Image display order affects customer product perception. Deleted images cannot be recovered but are preserved in snapshots.

### Multiple Product Images

WHEN a seller creates a product, THE system SHALL allow the seller to upload multiple images.

THE system SHALL permit a seller to add multiple images to a single product.

IF a seller adds an image to a product, THE system SHALL associate that image with the product.

THE system SHALL maintain all uploaded images for a product until explicitly deleted.

WHEN a seller views their product, THE system SHALL display all images associated with that product.

IF a product has no images, THE system SHALL allow the product to exist but mark it as having incomplete presentation.

THE system SHALL allow a seller to add images at any time after product creation.

### Image Ordering Rules

WHEN a seller manages product images, THE system SHALL allow the seller to reorder images.

THE system SHALL maintain a display order for all images associated with a product.

WHEN a seller changes the order of images, THE system SHALL update the display sequence immediately.

THE system SHALL preserve the relative order of images that are not moved during reordering.

WHEN a seller adds a new image, THE system SHALL place it at the end of the current display order.

IF a seller reorders images, THE system SHALL create a product snapshot to record the change.

THE system SHALL allow the seller to move any image to any position in the display order.

### Main Thumbnail Designation

WHEN a product has multiple images, THE system SHALL designate the first image in display order as the main thumbnail image.

THE system SHALL use the main thumbnail image for product listing displays.

THE system SHALL use the main thumbnail image for search result displays.

WHEN the main thumbnail image is deleted, THE system SHALL automatically promote the next image in order to become the new main thumbnail.

IF a product has only one image, THE system SHALL use that image as the main thumbnail.

THE system SHALL display the main thumbnail image prominently in product summary views.

WHEN a seller changes the image order, THE system SHALL immediately update which image serves as the main thumbnail.

### Image Deletion Rules

WHEN a seller deletes an image from a product, THE system SHALL remove that image from the product's active image list.

IF a seller deletes the main thumbnail image, THE system SHALL automatically promote the next image to become the main thumbnail.

WHEN a seller deletes all images from a product, THE system SHALL allow the deletion but mark the product as having no images.

THE system SHALL prevent recovery of deleted images from the active product image list.

IF a seller attempts to delete an image that does not exist, THE system SHALL reject the deletion request.

WHEN an image is deleted, THE system SHALL renumber the display order of remaining images to maintain sequential ordering.

THE system SHALL preserve deleted image data in product snapshots for historical reference.

### Image Snapshot Preservation

WHEN a seller adds a new image to a product, THE system SHALL create a product snapshot to record the addition.

WHEN a seller reorders images, THE system SHALL create a product snapshot to record the order change.

WHEN a seller deletes an image from a product, THE system SHALL create a product snapshot to record the deletion.

THE system SHALL include all image URLs and display order information in product snapshots.

THE system SHALL preserve image data in snapshots even after the image is deleted from the active product.

WHEN a seller views product snapshots, THE system SHALL display the image state at the time of each snapshot.

THE system SHALL maintain image snapshots indefinitely as part of the immutable product snapshot history.

### Listing Display Requirements

WHEN customers browse product listings, THE system SHALL display the main thumbnail image for each product.

WHEN customers view search results, THE system SHALL display the main thumbnail image for each product.

THE system SHALL display the main thumbnail image in a consistent size and format across all listing views.

IF a product has no images, THE system SHALL display a placeholder image in listings.

WHEN customers view a product detail page, THE system SHALL display all images in their display order.

THE system SHALL allow customers to view each image in full size on the product detail page.

WHEN the main thumbnail image is deleted, THE system SHALL immediately update listing displays to show the new main thumbnail.

### Image Visibility Rules

IF a product has no images, THE system SHALL show the product in search results but with reduced visibility.

IF a product has no images, THE system SHALL show the product in category listings but with a placeholder.

WHEN a product has at least one image, THE system SHALL display the product with full visibility in listings.

THE system SHALL allow products without images to be purchased if they have available variants.

IF a seller deletes all images from a product, THE system SHALL continue to show the product in listings until the seller adds new images.

THE system SHALL not prevent customers from adding products without images to their cart.

WHEN a seller adds the first image to a product, THE system SHALL immediately update the product's visibility status in listings.

## ProductVariant Rules

Products can have multiple variants representing different option combinations. Each variant has a unique SKU code, option values, price, and stock quantity. SKU codes must be unique across all variants in the platform. Variant prices can override the product base price. Variants must have stock quantity starting at zero. Sellers can add variants to their products. Sellers can edit variant SKU codes, option values, and prices. Every variant edit creates a snapshot. Sellers can delete variants only if no pending order items exist for that variant. Products with no variants are shown as unavailable for purchase.

### SKU Code Uniqueness Rules

THE system SHALL ensure that each SKU code is unique across all product variants in the platform.

IF a seller attempts to create a variant with a SKU code that already exists, THEN THE system SHALL reject the variant creation.

IF a seller attempts to edit a variant's SKU code to match an existing SKU code, THEN THE system SHALL reject the edit.

THE system SHALL prevent duplicate SKU codes regardless of which seller owns the variants.

IF a variant with a duplicate SKU code is detected during system operations, THEN THE system SHALL flag the variant as invalid.

### Variant Option Value Rules

THE system SHALL require that each variant has option values that describe the variant combination.

IF a variant is created without option values, THEN THE system SHALL reject the variant creation.

THE system SHALL allow sellers to specify option values as text descriptions (e.g., "Red / Large", "Blue / Small").

IF a seller edits a variant's option values, THEN THE system SHALL preserve the previous option values in a snapshot.

THE system SHALL display variant option values to customers when browsing products.

### Variant Pricing Rules

THE system SHALL allow variants to have a price that overrides the product's base price.

IF a variant price override is not specified, THEN THE system SHALL use the product's base price for that variant.

IF a seller specifies a variant price override, THEN THE system SHALL validate that the price is a positive number.

IF a seller edits a variant's price override, THEN THE system SHALL preserve the previous price in a snapshot.

THE system SHALL display the variant-specific price to customers when the variant has a price override.

THE system SHALL display the product base price to customers when the variant has no price override.

### Variant Stock Quantity Rules

THE system SHALL require that each variant has a stock quantity value.

IF a variant is created without a stock quantity, THEN THE system SHALL set the stock quantity to zero.

THE system SHALL allow stock quantities to be zero or positive numbers.

IF a variant's stock quantity reaches zero, THEN THE system SHALL mark the variant as out of stock.

IF a variant is out of stock, THEN THE system SHALL prevent customers from adding that variant to their cart.

THE system SHALL display stock status to customers when browsing product variants.

### Variant Creation Rules

THE system SHALL allow sellers to create variants for their own products.

IF a seller attempts to create a variant for a product they do not own, THEN THE system SHALL reject the variant creation.

IF a variant is created without a SKU code, THEN THE system SHALL reject the variant creation.

IF a variant is created with a SKU code that already exists, THEN THE system SHALL reject the variant creation.

IF a variant is created without option values, THEN THE system SHALL reject the variant creation.

THE system SHALL associate each variant with its parent product upon creation.

THE system SHALL initialize the variant's stock quantity to zero upon creation.

### Variant Editing Rules

THE system SHALL allow sellers to edit variants they own.

IF a seller attempts to edit a variant they do not own, THEN THE system SHALL reject the edit.

IF a seller edits a variant's SKU code, THEN THE system SHALL validate that the new SKU code is unique.

IF a seller edits a variant's option values, THEN THE system SHALL create a snapshot of the previous state.

IF a seller edits a variant's price override, THEN THE system SHALL create a snapshot of the previous state.

THE system SHALL preserve all previous variant states in snapshots when edits occur.

### Variant Deletion Constraints

THE system SHALL allow sellers to delete variants they own only if specific conditions are met.

IF a variant has pending order items with status paid or shipped, THEN THE system SHALL prevent the variant deletion.

IF a variant has pending cancellation requests, THEN THE system SHALL prevent the variant deletion.

IF a variant has pending refund requests, THEN THE system SHALL prevent the variant deletion.

IF all deletion conditions are satisfied, THEN THE system SHALL allow the seller to delete the variant.

THE system SHALL preserve variant snapshots even after the variant is deleted.

THE system SHALL remove the deleted variant from search results and product listings.

### Variant Snapshot Creation Rules

THE system SHALL automatically create a variant snapshot whenever a variant is edited.

THE system SHALL include the variant's SKU code in the snapshot.

THE system SHALL include the variant's option values in the snapshot.

THE system SHALL include the variant's price override in the snapshot.

THE system SHALL include the timestamp of the change in the snapshot.

THE system SHALL preserve variant snapshots even if the variant is later deleted.

THE system SHALL allow sellers to view snapshots of their own variants.

THE system SHALL allow administrators to view snapshots of any variant.

### Unavailable Product Display Rules

THE system SHALL mark a product as unavailable for purchase if it has no variants.

IF a product has no variants, THEN THE system SHALL display the product in search results with an unavailable status.

IF a product has no variants, THEN THE system SHALL prevent customers from adding the product to their cart.

IF all variants of a product are deleted, THEN THE system SHALL mark the product as unavailable.

IF a seller adds at least one variant to a product, THEN THE system SHALL make the product available for purchase.

THE system SHALL display available variants to customers when the product has at least one variant.

## InventoryRecord Rules

Each variant has its own stock quantity tracked through inventory records. Inventory records capture quantity changes, reasons, and timestamps. Current stock is calculated by summing all inventory records for a variant. Sellers can add inventory through restocking with a quantity and reason. Sellers can subtract inventory through adjustments with a quantity and reason. Order placement automatically creates negative inventory records. Order cancellation or refund automatically creates positive inventory records. Sellers can view complete inventory history for each variant. Variants with zero stock are shown as out of stock. Out of stock variants cannot be added to the shopping cart.

### Inventory Tracking and Records

THE system SHALL maintain inventory records for each product variant to track stock quantity changes.

THE system SHALL record the quantity change (positive or negative) for each inventory operation.

THE system SHALL record the reason for each inventory change.

THE system SHALL record the timestamp for each inventory operation.

WHEN a seller adds inventory to a variant, THE system SHALL create an inventory record with a positive quantity change.

WHEN a seller adjusts inventory for a variant, THE system SHALL create an inventory record with a negative quantity change.

WHEN an order is placed successfully, THE system SHALL automatically create inventory records with negative quantity changes for each purchased variant.

WHEN an order item is cancelled or refunded, THE system SHALL automatically create inventory records with positive quantity changes for the affected variant.

IF an inventory record is created, THEN THE system SHALL preserve it permanently and not allow deletion.

IF an inventory record is created, THEN THE system SHALL not allow modification of the record after creation.

### Stock Calculation Rules

THE system SHALL calculate current stock quantity by summing all inventory records for a variant.

THE system SHALL include both positive and negative quantity changes in the stock calculation.

THE system SHALL use the most recent inventory records to determine current stock levels.

WHEN a variant has no inventory records, THE system SHALL treat the stock quantity as zero.

WHEN calculating stock for display purposes, THE system SHALL use the sum of all quantity changes from inventory records.

IF the calculated stock quantity is zero or negative, THEN THE system SHALL treat the variant as out of stock.

### Restocking Operations

WHEN a seller restocks a variant, THE system SHALL require a quantity to add.

WHEN a seller restocks a variant, THE system SHALL require a reason for the restocking.

WHEN a seller restocks a variant, THE system SHALL create an inventory record with the specified positive quantity.

IF the restocking quantity is zero or negative, THEN THE system SHALL reject the restocking request.

IF the restocking reason is empty, THEN THE system SHALL reject the restocking request.

WHEN restocking is completed successfully, THE system SHALL update the variant's stock quantity immediately.

### Inventory Adjustments

WHEN a seller adjusts inventory for a variant, THE system SHALL require a quantity to subtract.

WHEN a seller adjusts inventory for a variant, THE system SHALL require a reason for the adjustment.

WHEN a seller adjusts inventory for a variant, THE system SHALL create an inventory record with the specified negative quantity.

IF the adjustment quantity is zero or negative, THEN THE system SHALL reject the adjustment request.

IF the adjustment reason is empty, THEN THE system SHALL reject the adjustment request.

IF the adjustment would result in negative stock, THEN THE system SHALL reject the adjustment request.

WHEN an inventory adjustment is completed successfully, THE system SHALL update the variant's stock quantity immediately.

### Order Inventory Impact

WHEN an order is placed successfully, THE system SHALL automatically decrease stock quantities for each purchased variant.

WHEN an order is placed successfully, THE system SHALL create inventory records reflecting the stock reduction for each variant.

WHEN an order item is cancelled with approval, THE system SHALL automatically restore the stock quantity for the variant.

WHEN an order item is cancelled with approval, THE system SHALL create inventory records reflecting the stock restoration.

WHEN an order item is refunded with approval, THE system SHALL automatically restore the stock quantity for the variant.

WHEN an order item is refunded with approval, THE system SHALL create inventory records reflecting the stock restoration.

IF a variant does not have sufficient stock for an order, THEN THE system SHALL reject the order placement.

### Inventory History Viewing

WHEN a seller views a variant, THE system SHALL display the complete inventory history for that variant.

THE system SHALL display each inventory record with the quantity change, reason, and timestamp.

THE system SHALL display inventory history in chronological order with the most recent records first.

WHEN a seller views inventory history, THE system SHALL show both restocking and adjustment records.

WHEN a seller views inventory history, THE system SHALL show order-related inventory changes.

THE system SHALL allow sellers to view the full history of all inventory operations for their variants.

### Out of Stock Status

WHEN a variant's stock quantity reaches zero, THE system SHALL mark the variant as out of stock.

WHEN a variant is marked as out of stock, THE system SHALL display "out of stock" status to customers.

WHEN a variant is out of stock, THE system SHALL prevent the variant from being added to the shopping cart.

WHEN a variant's stock quantity becomes positive after being zero, THE system SHALL update the variant to in-stock status.

THE system SHALL update the out of stock status immediately when inventory changes occur.

IF a variant is out of stock, THEN THE system SHALL not allow order placement for that variant.

### Cart Restrictions

WHEN a customer attempts to add a variant to the cart, THE system SHALL verify that the variant is in stock.

IF a variant is out of stock, THEN THE system SHALL prevent adding it to the shopping cart.

WHEN a variant's stock is less than the cart quantity, THE system SHALL display a warning to the customer.

IF a variant becomes out of stock while in the cart, THEN THE system SHALL mark it as unavailable in the cart.

IF a variant is deleted while in the cart, THEN THE system SHALL mark it as unavailable in the cart.

WHEN a customer proceeds to checkout, THE system SHALL verify that all cart items are available and in stock.

IF any cart item is unavailable or out of stock, THEN THE system SHALL prevent checkout until the issue is resolved.

## WishlistItem Rules

Customers can add products to their personal wishlist. Wishlist items represent products, not specific variants. Customers can view their wishlist with pagination. Customers can remove products from their wishlist at any time. If a seller deletes a product, it is automatically removed from all customer wishlists. Wishlist items do not affect product inventory. Wishlist items do not reserve stock. Customers can add the same product to their wishlist only once. Wishlist is visible only to the owning customer.

### Wishlist Creation Rules

WHEN a customer adds a product to their wishlist, THE system SHALL create a wishlist item for that product.

THE system SHALL allow customers to add products to their wishlist only if the product exists and is not deleted.

THE system SHALL create a wishlist item at the product level, not at the variant level.

IF a customer attempts to add a product that is already in their wishlist, THE system SHALL reject the request without creating a duplicate.

THE system SHALL ensure each customer can have only one wishlist item per product.

WHEN a customer adds a product to their wishlist, THE system SHALL record the creation timestamp.

THE system SHALL associate the wishlist item with the customer's account.

IF the product is out of stock or unavailable, THE system SHALL still allow the customer to add it to their wishlist.

THE system SHALL not affect product inventory when a product is added to a wishlist.

THE system SHALL not reserve stock for products in a customer's wishlist.

### Wishlist Viewing Rules

WHEN a customer views their wishlist, THE system SHALL display all products in their wishlist.

THE system SHALL show the main image (thumbnail) for each product in the wishlist.

THE system SHALL display the product name for each item in the wishlist.

THE system SHALL show the base price or price range for each product in the wishlist.

THE system SHALL indicate the stock status for each product in the wishlist.

THE system SHALL display the seller shop name for each product in the wishlist.

IF a product in the wishlist has been deleted by the seller, THE system SHALL not display it in the wishlist view.

THE system SHALL sort wishlist items by newest first (most recently added).

### Wishlist Pagination Rules

WHEN a customer views their wishlist, THE system SHALL present the results in paginated format.

THE system SHALL allow customers to navigate through multiple pages of their wishlist.

THE system SHALL display a consistent number of items per page in the wishlist.

WHEN a customer reaches the end of their wishlist, THE system SHALL indicate that no more items exist.

THE system SHALL maintain the sort order (newest first) across all pages of the wishlist.

IF a customer's wishlist contains fewer items than the page size, THE system SHALL display all items on a single page.

### Wishlist Removal Rules

WHEN a customer removes a product from their wishlist, THE system SHALL delete the wishlist item for that product.

THE system SHALL allow customers to remove products from their wishlist at any time.

IF a customer attempts to remove a product that is not in their wishlist, THE system SHALL reject the request.

WHEN a product is removed from a wishlist, THE system SHALL not affect the product itself or its inventory.

THE system SHALL immediately reflect the removal in subsequent wishlist views.

THE system SHALL not create a snapshot when a wishlist item is removed.

### Automatic Wishlist Cleanup Rules

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customer wishlists.

IF a product is deleted, THE system SHALL delete all wishlist items referencing that product.

THE system SHALL not notify customers when products are automatically removed from their wishlists.

WHEN a product is restored (if applicable), THE system SHALL not automatically re-add it to customer wishlists.

THE system SHALL ensure automatic cleanup occurs immediately upon product deletion.

THE system SHALL not create snapshots for automatically removed wishlist items.

### Wishlist Visibility Rules

THE system SHALL ensure wishlist items are visible only to the owning customer.

IF a customer attempts to view another customer's wishlist, THE system SHALL reject the request.

THE system SHALL not display wishlist items to sellers.

THE system SHALL not display wishlist items to administrators.

THE system SHALL not expose wishlist data through product detail pages or seller dashboards.

WHEN a customer is not logged in, THE system SHALL not display any wishlist content.

## CartItem Rules

Customers add specific variants to their cart, not just products. Cart items include the selected variant and quantity. Adding the same variant again combines quantities into one cart item. Customers can view their cart with item details and subtotals. Customers can change quantities of items in their cart. Customers can remove items from their cart. Cart shows total price of all items. If variant stock is less than cart quantity, a warning is displayed. If a variant is deleted or out of stock, it is marked unavailable in the cart. Unavailable cart items cannot proceed to checkout.

### Variant-Specific Cart Items

THE system SHALL require customers to select a specific product variant when adding items to cart.

THE system SHALL NOT allow customers to add products to cart without selecting a variant.

WHEN a customer adds a variant to cart, THE system SHALL create a cart item referencing the selected variant.

EACH cart item SHALL be associated with exactly one product variant.

THE system SHALL NOT create cart items for products that have no variants.

WHEN a customer attempts to add a product without variants to cart, THE system SHALL reject the request.

### Cart Quantity Management

WHEN a customer adds a variant to cart, THE system SHALL require a quantity value.

THE system SHALL require all cart item quantities to be positive integers.

WHEN the same variant is added to cart multiple times, THE system SHALL combine quantities into a single cart item.

THE system SHALL NOT create duplicate cart items for the same variant.

WHEN a customer changes a cart item quantity, THE system SHALL update the quantity value.

THE system SHALL allow customers to increase cart item quantities.

THE system SHALL allow customers to decrease cart item quantities.

WHEN a customer sets a cart item quantity to zero, THE system SHALL remove the item from cart.

### Cart Viewing and Display

THE system SHALL display all cart items when a customer views their cart.

EACH cart item display SHALL show the product name.

EACH cart item display SHALL show the variant option values.

EACH cart item display SHALL show the variant price.

EACH cart item display SHALL show the item quantity.

EACH cart item display SHALL show the item subtotal.

THE system SHALL display the total price of all cart items.

THE system SHALL calculate item subtotal as variant price multiplied by quantity.

### Cart Editing Operations

WHEN a customer updates a cart item quantity, THE system SHALL recalculate the item subtotal.

WHEN a customer updates a cart item quantity, THE system SHALL recalculate the cart total.

WHEN a customer removes a cart item, THE system SHALL delete the cart item.

WHEN a customer removes a cart item, THE system SHALL recalculate the cart total.

THE system SHALL allow customers to modify quantities of cart items.

THE system SHALL allow customers to remove items from their cart.

THE system SHALL persist cart changes until the customer completes checkout or removes items.

### Cart Total Calculation

THE system SHALL calculate cart total by summing all item subtotals.

EACH item subtotal SHALL be calculated as variant price multiplied by quantity.

WHEN a cart item quantity changes, THE system SHALL recalculate the cart total.

WHEN a cart item is added, THE system SHALL recalculate the cart total.

WHEN a cart item is removed, THE system SHALL recalculate the cart total.

THE system SHALL display the updated cart total after any cart modification.

THE system SHALL use the variant's price override if specified, otherwise use the product's base price.

### Stock Availability Warnings

WHEN a variant's stock is less than the cart quantity, THE system SHALL display a stock warning.

THE system SHALL indicate when cart quantity exceeds available stock.

THE system SHALL update stock warnings when inventory changes.

THE system SHALL display stock warnings prominently in the cart view.

WHEN stock increases to meet cart quantity, THE system SHALL remove the stock warning.

THE system SHALL allow customers to proceed with checkout despite stock warnings.

### Unavailable Cart Items

WHEN a variant is deleted, THE system SHALL mark the cart item as unavailable.

WHEN a variant is out of stock (zero quantity), THE system SHALL mark the cart item as unavailable.

THE system SHALL indicate unavailable items clearly in the cart display.

THE system SHALL preserve unavailable cart items in the cart.

THE system SHALL show the reason for unavailability (deleted or out of stock).

WHEN a variant becomes available again, THE system SHALL update the cart item status to available.

### Checkout Restrictions

THE system SHALL prevent checkout when cart contains unavailable items.

WHEN a customer attempts checkout with unavailable items, THE system SHALL reject the checkout.

THE system SHALL require all cart items to be available before checkout.

WHEN a customer attempts checkout, THE system SHALL validate all cart items are available.

THE system SHALL display an error message when checkout is rejected due to unavailable items.

THE system SHALL instruct customers to remove unavailable items before checkout.

## Order Rules

Orders are created when customers successfully complete checkout and payment. Each order contains one or more order items. Orders include shipping address snapshots at the time of purchase. Orders have a total price calculated from all items. Order status is derived from the status of all its items. Orders can be in paid, shipped, delivered, cancelled, refunded, or partially completed states. Shipping addresses cannot be changed after order placement. Orders are visible to the customer who placed them. Orders are visible to sellers of the purchased products. Orders are visible to administrators for oversight.

### Order Creation Rules

WHEN a customer completes checkout with payment success, THE system SHALL create an order record.

WHEN an order is created, THE system SHALL associate it with the customer who placed it.

WHEN an order is created, THE system SHALL include all cart items as order items.

WHEN an order is created, THE system SHALL capture the shipping address as a snapshot.

WHEN an order is created, THE system SHALL calculate the total price from all order items.

WHEN an order is created, THE system SHALL set the initial order status based on item statuses.

WHEN an order is created, THE system SHALL remove all items from the customer's cart.

WHEN an order is created, THE system SHALL decrease stock quantities for purchased variants.

IF payment fails during checkout, THE system SHALL NOT create an order.

IF any cart item is unavailable at checkout, THE system SHALL prevent order creation.

### Order Item Composition Rules

WHEN an order is created, THE system SHALL create one order item per unique product variant.

WHEN an order is created, THE system SHALL combine quantities for the same variant into one order item.

WHEN an order contains items from multiple sellers, THE system SHALL create separate order items for each seller's products.

WHEN an order item is created, THE system SHALL capture a snapshot of the product and variant at purchase time.

WHEN an order item is created, THE system SHALL capture a snapshot of the seller's profile at purchase time.

WHEN an order item is created, THE system SHALL initialize its status as "paid".

WHEN an order item is created, THE system SHALL associate it with the seller of the product.

WHEN an order item is created, THE system SHALL record the quantity purchased.

### Shipping Address Snapshot Rules

WHEN an order is created, THE system SHALL capture the complete shipping address as a snapshot.

WHEN an order is created, THE system SHALL preserve the shipping address exactly as selected by the customer.

WHEN an order is created, THE system SHALL store the shipping address snapshot independently from the customer's current addresses.

WHEN a customer updates their address, THE system SHALL NOT affect existing order shipping address snapshots.

WHEN a customer deletes their address, THE system SHALL NOT affect existing order shipping address snapshots.

WHEN an order is viewed, THE system SHALL display the shipping address snapshot from order creation time.

WHEN an order is archived, THE system SHALL preserve the shipping address snapshot permanently.

### Order Total Calculation Rules

WHEN an order is created, THE system SHALL calculate the total price by summing all order item prices.

WHEN an order item price is calculated, THE system SHALL multiply the variant price by the quantity.

WHEN a variant has a price override, THE system SHALL use the variant price instead of the base price.

WHEN an order is created, THE system SHALL preserve the total price at creation time.

WHEN product prices change after order creation, THE system SHALL NOT affect the order total.

WHEN an order item is cancelled, THE system SHALL NOT recalculate the original order total.

WHEN an order item is refunded, THE system SHALL NOT recalculate the original order total.

WHEN an order is displayed, THE system SHALL show the total price from order creation time.

### Order Status Derivation Rules

WHEN all order items have status "paid", THE system SHALL set the order status to "paid".

WHEN any order item has status "shipped" and no item has status "delivered", THE system SHALL set the order status to "shipped".

WHEN all order items have status "delivered", THE system SHALL set the order status to "delivered".

WHEN all order items have status "cancelled", THE system SHALL set the order status to "cancelled".

WHEN all order items have status "refunded", THE system SHALL set the order status to "refunded".

WHEN order items have mixed statuses, THE system SHALL set the order status to "partially completed".

WHEN an order item status changes, THE system SHALL recalculate the order status.

WHEN an order status changes, THE system SHALL update the status without modifying item statuses.

### Order State Transition Rules

WHEN an order is in "paid" status, THE system SHALL allow sellers to ship items.

WHEN an order is in "shipped" status, THE system SHALL allow customers to confirm delivery.

WHEN an order is in "delivered" status, THE system SHALL allow customers to request refunds within seven days.

WHEN an order is in "cancelled" status, THE system SHALL prevent any further modifications.

WHEN an order is in "refunded" status, THE system SHALL prevent any further modifications.

WHEN an order is in "partially completed" status, THE system SHALL allow processing of remaining items.

WHEN an order item transitions from "paid" to "shipped", THE system SHALL update the order status accordingly.

WHEN an order item transitions from "shipped" to "delivered", THE system SHALL update the order status accordingly.

WHEN an order item transitions to "cancelled", THE system SHALL update the order status accordingly.

WHEN an order item transitions to "refunded", THE system SHALL update the order status accordingly.

### Address Immutability Rules

WHEN an order is created, THE system SHALL prevent any changes to the shipping address.

WHEN a customer requests to modify an order, THE system SHALL reject shipping address changes.

WHEN a seller processes an order, THE system SHALL use the original shipping address snapshot.

WHEN an order is cancelled, THE system SHALL preserve the original shipping address snapshot.

WHEN an order is refunded, THE system SHALL preserve the original shipping address snapshot.

WHEN an order is archived, THE system SHALL preserve the original shipping address snapshot permanently.

WHEN an administrator views an order, THE system SHALL display the original shipping address snapshot.

WHEN a dispute occurs, THE system SHALL use the original shipping address snapshot for reference.

### Order Visibility Rules

WHEN a customer views their orders, THE system SHALL display only their own orders.

WHEN a seller views orders, THE system SHALL display only order items containing their products.

WHEN an administrator views orders, THE system SHALL display all orders on the platform.

WHEN a customer views an order, THE system SHALL display all order items regardless of seller.

WHEN a seller views an order item, THE system SHALL display only items for their products.

WHEN an order contains items from multiple sellers, THE system SHALL ensure each seller sees only their items.

WHEN a customer's account is deleted, THE system SHALL preserve their order history for seller and legal records.

WHEN a seller's account is deleted, THE system SHALL preserve order history with shop name snapshots.

WHEN a customer is banned, THE system SHALL prevent them from viewing orders.

WHEN a seller is banned, THE system SHALL prevent them from viewing order items.

## OrderItem Rules

Each order item represents a purchased product variant with quantity. Multiple purchases of the same variant become one order item with combined quantity. Order items can be from different sellers within the same order. Each order item has its own independent status. Order item statuses include paid, shipped, delivered, cancelled, and refunded. Order items are individually cancellable before shipping. Order items are individually refundable after delivery. Order items include product, variant, and seller profile snapshots. Order item status changes affect overall order status. Order items are grouped into shipments for tracking.

### Order Item Structure and Composition

THE system SHALL represent each order item as a purchased product variant with an associated quantity.

THE system SHALL combine multiple purchases of the same variant into a single order item with aggregated quantity.

THE system SHALL associate each order item with its parent order.

THE system SHALL associate each order item with the seller of the purchased product.

THE system SHALL preserve a snapshot of the product at the time of purchase with each order item.

THE system SHALL preserve a snapshot of the variant at the time of purchase with each order item.

THE system SHALL preserve a snapshot of the seller profile at the time of purchase with each order item.

WHEN an order is created, THE system SHALL create order items for each distinct variant in the customer's cart.

IF a variant is deleted by the seller after purchase, THE system SHALL preserve the order item with its snapshot data.

IF a product is deleted by the seller after purchase, THE system SHALL preserve the order item with its snapshot data.

### Item Quantity and Combination Rules

THE system SHALL allow positive integer quantities for each order item.

WHEN the same variant is added to cart multiple times, THE system SHALL combine quantities before order creation.

WHEN an order is placed, THE system SHALL create one order item per distinct variant with the total quantity.

THE system SHALL display the quantity purchased for each order item in order details.

THE system SHALL calculate the subtotal for each order item by multiplying unit price by quantity.

IF a customer modifies cart quantity before checkout, THE system SHALL update the order item quantity accordingly.

WHEN stock is insufficient for the requested quantity, THE system SHALL prevent order placement.

WHEN a cancellation is approved, THE system SHALL restore the cancelled quantity to inventory.

WHEN a refund is approved, THE system SHALL restore the refunded quantity to inventory.

### Multi-Seller Order Rules

THE system SHALL allow order items from different sellers within the same order.

THE system SHALL track the seller association for each order item independently.

THE system SHALL enable each seller to view only their own order items.

THE system SHALL enable each seller to manage only their own order items.

WHEN an order contains items from multiple sellers, THE system SHALL create separate shipments per seller.

THE system SHALL allow independent status transitions for order items from different sellers.

THE system SHALL allow independent cancellation for order items from different sellers.

THE system SHALL allow independent refund processing for order items from different sellers.

IF one seller's item is cancelled, THE system SHALL continue processing other sellers' items normally.

IF one seller's item is refunded, THE system SHALL not affect other sellers' items.

### Item Status Transitions

THE system SHALL initialize order item status as "paid" upon successful order creation.

THE system SHALL allow status transition from "paid" to "shipped" when seller creates a shipment.

THE system SHALL allow status transition from "shipped" to "delivered" upon customer confirmation or automatic timeout.

THE system SHALL allow status transition from "paid" to "cancelled" upon approved cancellation request.

THE system SHALL allow status transition from "delivered" to "refunded" upon approved refund request.

WHEN an order item is in "paid" status, THE system SHALL prevent customer from modifying the item.

WHEN an order item is in "shipped" status, THE system SHALL prevent customer from cancelling the item.

WHEN an order item is in "delivered" status, THE system SHALL allow customer to request a refund within seven days.

WHEN an order item is in "cancelled" status, THE system SHALL prevent any further status changes.

WHEN an order item is in "refunded" status, THE system SHALL prevent any further status changes.

### Item Cancellation Rules

THE system SHALL allow customers to request cancellation for order items with "paid" status.

THE system SHALL require a reason text for each cancellation request.

THE system SHALL notify the seller of the cancellation request.

THE system SHALL allow the seller to approve or reject the cancellation request.

WHEN a seller approves a cancellation request, THE system SHALL change the item status to "cancelled".

WHEN a seller rejects a cancellation request, THE system SHALL keep the item in "paid" status.

THE system SHALL create a snapshot of the cancellation request when the seller responds.

WHEN a cancellation is approved, THE system SHALL restore the item quantity to inventory.

WHEN a cancellation is approved, THE system SHALL process a refund for the cancelled item.

IF an order item has "shipped" status, THE system SHALL reject cancellation requests.

### Item Refund Rules

THE system SHALL allow customers to request refunds for order items with "delivered" status.

THE system SHALL require a reason text for each refund request.

THE system SHALL enforce a seven-day time window from delivery for refund requests.

THE system SHALL notify the seller of the refund request.

THE system SHALL allow the seller to approve or reject the refund request.

WHEN a seller approves a refund request, THE system SHALL change the item status to "refunded".

WHEN a seller rejects a refund request, THE system SHALL keep the item in "delivered" status.

THE system SHALL create a snapshot of the refund request when the seller responds.

WHEN a refund is approved, THE system SHALL restore the item quantity to inventory.

IF the seven-day window has expired, THE system SHALL reject refund requests.

### Item Snapshot Preservation

THE system SHALL create a product snapshot when an order item is created.

THE system SHALL create a variant snapshot when an order item is created.

THE system SHALL create a seller profile snapshot when an order item is created.

THE system SHALL preserve all product fields in the snapshot including name, description, category, and base price.

THE system SHALL preserve all variant fields in the snapshot including SKU code, option values, and price.

THE system SHALL preserve seller profile fields in the snapshot including shop name, description, and logo.

THE system SHALL make order item snapshots immutable after creation.

THE system SHALL display snapshot data in order details instead of current product data.

WHEN a product is edited after purchase, THE system SHALL not update the order item snapshot.

WHEN a seller profile is edited after purchase, THE system SHALL not update the order item snapshot.

### Status Impact on Order

THE system SHALL derive the overall order status from the statuses of all its order items.

WHEN all order items are "paid", THE system SHALL set order status to "paid".

WHEN any order item is "shipped" and none are "delivered", THE system SHALL set order status to "shipped".

WHEN all order items are "delivered", THE system SHALL set order status to "delivered".

WHEN all order items are "cancelled", THE system SHALL set order status to "cancelled".

WHEN all order items are "refunded", THE system SHALL set order status to "refunded".

WHEN order items have mixed statuses, THE system SHALL set order status to "partially completed".

WHEN an order item status changes, THE system SHALL recalculate the overall order status.

THE system SHALL display the overall order status prominently in order history.

THE system SHALL display individual item statuses in order details.

### Shipment Grouping Rules

THE system SHALL group order items into shipments by seller.

THE system SHALL allow a seller to include one or more of their order items in a single shipment.

THE system SHALL allow a seller to create separate shipments for individual order items.

THE system SHALL require tracking information for each shipment including carrier name and tracking number.

WHEN a shipment is created, THE system SHALL change all included order items to "shipped" status.

THE system SHALL associate the same tracking information with all items in a shipment.

THE system SHALL allow customers to view tracking information per shipment.

WHEN a customer confirms delivery for a shipment, THE system SHALL change all included items to "delivered" status.

WHEN fourteen days pass since shipment creation without delivery confirmation, THE system SHALL automatically change all included items to "delivered" status.

IF order items are from different sellers, THE system SHALL create separate shipments for each seller.

## Shipment Rules

Shipment represents a package sent by a seller containing one or more order items. Different sellers always create separate shipments for their items. Sellers can ship items individually or bundle multiple items into one shipment. All items in the same shipment share identical tracking information. Sellers enter carrier name and tracking number when creating shipments. Creating a shipment changes all included items to shipped status. Customers can view tracking information for each shipment. Customers confirm delivery per shipment, not per individual item. Delivery confirmation changes all items in the shipment to delivered status. Unconfirmed shipments automatically mark items as delivered after 14 days.

### Shipment Creation

WHEN a seller creates a shipment, THE system SHALL require at least one order item to be included.

WHEN a seller creates a shipment, THE system SHALL require the seller to enter a carrier name.

WHEN a seller creates a shipment, THE system SHALL require the seller to enter a tracking number.

WHEN a seller creates a shipment, THE system SHALL record the timestamp of shipment creation.

WHEN a seller creates a shipment, THE system SHALL change the status of all included order items to "shipped".

IF an order item is not in "paid" status, THEN THE system SHALL prevent the item from being included in a new shipment.

IF an order item is already included in an existing shipment, THEN THE system SHALL prevent the item from being included in another shipment.

IF the carrier name is missing, THEN THE system SHALL reject the shipment creation.

IF the tracking number is missing, THEN THE system SHALL reject the shipment creation.

IF the seller does not own any of the selected order items, THEN THE system SHALL reject the shipment creation.

### Multi-Item Shipments

WHEN a seller creates a shipment, THE system SHALL allow the seller to select multiple order items from the same seller.

WHEN a seller bundles multiple order items into one shipment, THE system SHALL assign the same tracking information to all items in the shipment.

WHEN a seller bundles multiple order items into one shipment, THE system SHALL change all included items to "shipped" status simultaneously.

IF order items belong to different sellers, THEN THE system SHALL require separate shipments for each seller's items.

IF order items are from the same order but different sellers, THEN THE system SHALL create separate shipments per seller.

WHEN a seller ships only one order item, THE system SHALL create a single-item shipment with tracking information.

WHEN a seller bundles items from different orders into one shipment, THE system SHALL allow the bundling if all items belong to the same seller.

WHEN a shipment contains multiple items, THE system SHALL display all included items in the shipment details.

WHEN a shipment contains multiple items, THE system SHALL calculate the total weight based on included items.

IF a seller attempts to include items from different sellers in one shipment, THEN THE system SHALL reject the shipment creation.

### Seller-Specific Shipments

WHEN order items belong to different sellers, THE system SHALL require each seller to create separate shipments.

WHEN a seller creates a shipment, THE system SHALL verify that all selected order items belong to that seller.

WHEN a seller views pending shipments, THE system SHALL display only order items for that seller's products.

IF a seller attempts to ship an item that belongs to another seller, THEN THE system SHALL reject the shipment creation.

WHEN an order contains items from multiple sellers, THE system SHALL create multiple shipments with separate tracking information.

WHEN a customer views order details, THE system SHALL display shipments grouped by seller.

WHEN a seller's account is suspended, THE system SHALL prevent the seller from creating new shipments.

WHEN a seller's account is suspended, THE system SHALL allow the seller to create shipments for existing orders.

WHEN a seller deletes their account, THE system SHALL prevent the seller from creating new shipments.

IF a seller has no order items in "paid" status, THEN THE system SHALL show no available items for shipment.

### Tracking Information

WHEN a seller creates a shipment, THE system SHALL require a carrier name to be entered.

WHEN a seller creates a shipment, THE system SHALL require a tracking number to be entered.

WHEN a seller creates a shipment, THE system SHALL store the carrier name and tracking number for the shipment.

WHEN tracking information is entered, THE system SHALL associate it with all order items in the shipment.

WHEN tracking information is updated, THE system SHALL preserve the previous tracking information in a snapshot.

IF the tracking number format is invalid, THEN THE system SHALL warn the seller but allow shipment creation.

IF the carrier name exceeds the maximum length, THEN THE system SHALL truncate the carrier name.

WHEN a shipment is created, THE system SHALL record the shipped timestamp.

WHEN tracking information is provided, THE system SHALL enable tracking visibility for the customer.

IF tracking information is missing, THEN THE system SHALL prevent shipment creation.

### Shipment Status

WHEN a shipment is created, THE system SHALL set the initial shipment status to "shipped".

WHEN a customer confirms delivery for a shipment, THE system SHALL update the shipment status to "delivered".

WHEN a shipment reaches 14 days from the shipped date, THE system SHALL automatically update the shipment status to "delivered".

WHEN a shipment status changes to "delivered", THE system SHALL update all order items in the shipment to "delivered" status.

WHEN a shipment is in "shipped" status, THE system SHALL allow the customer to confirm delivery.

WHEN a shipment is in "delivered" status, THE system SHALL prevent further delivery confirmation.

IF a shipment is automatically marked as delivered, THE system SHALL record the automatic delivery timestamp.

IF a customer manually confirms delivery before 14 days, THE system SHALL prevent automatic delivery from triggering.

WHEN a shipment status changes, THE system SHALL record the status change timestamp.

WHEN a seller views shipments, THE system SHALL display the current status of each shipment.

### Delivery Confirmation

WHEN a customer confirms delivery for a shipment, THE system SHALL change all order items in that shipment to "delivered" status.

WHEN a customer confirms delivery, THE system SHALL record the delivery confirmation timestamp.

WHEN a customer confirms delivery, THE system SHALL enable the customer to request a refund for items in the shipment.

IF a shipment has already been confirmed as delivered, THEN THE system SHALL prevent duplicate delivery confirmation.

IF a shipment has been automatically marked as delivered, THEN THE system SHALL prevent manual delivery confirmation.

WHEN a customer confirms delivery, THE system SHALL notify the seller of the delivery confirmation.

WHEN a customer confirms delivery, THE system SHALL start the 7-day refund window for all items in the shipment.

IF an order item is cancelled or refunded, THEN THE system SHALL not require delivery confirmation for that item.

WHEN a customer views order details, THE system SHALL show delivery confirmation status for each shipment.

WHEN a shipment contains multiple items, THE system SHALL require delivery confirmation for the entire shipment, not individual items.

### Automatic Delivery

WHEN a shipment reaches 14 days from the shipped date, THE system SHALL automatically change the shipment status to "delivered".

WHEN a shipment is automatically marked as delivered, THE system SHALL change all order items in the shipment to "delivered" status.

WHEN a shipment is automatically marked as delivered, THE system SHALL record the automatic delivery timestamp.

IF a customer manually confirms delivery before 14 days, THEN THE system SHALL not trigger automatic delivery.

IF a shipment is already marked as delivered, THEN THE system SHALL not trigger automatic delivery.

WHEN automatic delivery is triggered, THE system SHALL enable the 7-day refund window for all items in the shipment.

WHEN automatic delivery is triggered, THE system SHALL notify the customer of the automatic delivery confirmation.

WHEN automatic delivery is triggered, THE system SHALL notify the seller of the automatic delivery confirmation.

IF the 14-day period expires while a refund request is pending, THEN THE system SHALL complete automatic delivery processing.

WHEN a shipment is automatically delivered, THE system SHALL allow the customer to view the automatic delivery confirmation in order details.

### Tracking Visibility

WHEN a customer views order details, THE system SHALL display tracking information for each shipment.

WHEN a customer views order details, THE system SHALL show the carrier name and tracking number for each shipment.

WHEN a customer views a shipment, THE system SHALL display the shipped date and current status.

WHEN a customer views a shipment, THE system SHALL display the list of order items included in the shipment.

IF a shipment has tracking information, THEN THE system SHALL display it to the customer.

IF a shipment does not have tracking information, THEN THE system SHALL display a notice that tracking is unavailable.

WHEN a customer views order details, THE system SHALL allow the customer to view tracking information for all shipments in the order.

WHEN a seller views order items, THE system SHALL display tracking information for shipments created by that seller.

WHEN an administrator views order details, THE system SHALL display tracking information for all shipments.

WHEN tracking information is updated, THE system SHALL reflect the updated information in customer view immediately.

## Review Rules

Customers can write reviews for products they have purchased. Reviews can only be written after the order item status is delivered. Customers can write one review per product per order. Each review includes a rating from one to five stars and optional text content. Reviews are displayed on product detail pages sorted by newest first. Customers can edit their own reviews at any time. Every review edit creates a snapshot preserving the previous content. Customers can delete their own reviews but snapshots remain preserved. Product average rating is calculated from all non-deleted reviews. Reviews from deleted user accounts show as deleted user.

### Review Creation and Timing

WHEN a customer purchases a product, THE system SHALL allow the customer to write a review only after the order item status is "delivered".

IF an order item status is not "delivered", THEN THE system SHALL prevent review creation for that item.

THE system SHALL allow one review per product per order.

IF a customer has already written a review for a product in a specific order, THEN THE system SHALL prevent creating another review for that product in the same order.

IF a customer attempts to write a review for a product they have not purchased, THEN THE system SHALL reject the request.

WHEN a customer creates a review, THE system SHALL record the creation timestamp.

IF the order item associated with the review is cancelled or refunded, THEN THE system SHALL still allow the review to remain visible.

### Review Content and Rating

THE system SHALL require a rating from 1 to 5 stars when creating a review.

IF the rating is outside the 1-5 range, THEN THE system SHALL reject the review creation.

THE system SHALL allow optional text content in reviews.

WHEN a review is created without text content, THE system SHALL still accept the review with only the rating.

THE system SHALL allow customers to include text content up to the system's maximum character limit.

WHEN a customer submits a review, THE system SHALL validate that the rating is a whole number.

IF the rating is a decimal or non-numeric value, THEN THE system SHALL reject the review creation.

### Review Display and Sorting

THE system SHALL display reviews on the product detail page.

THE system SHALL sort reviews by newest first (most recent creation timestamp).

THE system SHALL show the rating and text content (if provided) for each review.

THE system SHALL display the total number of reviews for a product.

THE system SHALL show the average rating for products that have at least one review.

IF a product has no reviews, THEN THE system SHALL not display an average rating or review count.

THE system SHALL display reviews from all customers who purchased the product, regardless of their current account status.

### Review Editing and Snapshots

WHEN a customer edits their own review, THE system SHALL create a snapshot of the previous review state before applying the changes.

THE system SHALL preserve the original review content in the snapshot, including rating and text content.

THE system SHALL allow customers to edit their own reviews at any time after creation.

IF a customer attempts to edit another customer's review, THEN THE system SHALL reject the request.

WHEN a review is edited, THE system SHALL record the edit timestamp in the snapshot.

THE system SHALL preserve all snapshots of a review even after the review is deleted.

Snapshots of reviews are immutable and cannot be deleted or modified.

WHEN a review is edited, THE system SHALL update the product's average rating calculation to reflect the new rating.

### Review Deletion and User Status

WHEN a customer deletes their review, THE system SHALL remove the review from public display.

WHEN a customer deletes their review, THE system SHALL preserve all snapshots of that review.

IF a customer account is deleted, THEN THE system SHALL show all reviews from that customer as "deleted user".

Reviews from deleted user accounts remain visible on product detail pages but display "deleted user" instead of the customer's name.

WHEN a review is deleted, THE system SHALL recalculate the product's average rating excluding the deleted review.

IF all reviews for a product are deleted, THEN THE system SHALL not display an average rating for that product.

Customers can delete their own reviews at any time.

IF a customer attempts to delete another customer's review, THEN THE system SHALL reject the request.

### Average Rating Calculation

THE system SHALL calculate the average rating from all non-deleted reviews for a product.

THE system SHALL exclude deleted reviews from the average rating calculation.

WHEN a new review is created, THE system SHALL recalculate the average rating for that product.

WHEN a review is edited with a different rating, THE system SHALL recalculate the average rating for that product.

WHEN a review is deleted, THE system SHALL recalculate the average rating for that product.

IF a product has no non-deleted reviews, THEN THE system SHALL not display an average rating.

THE system SHALL round the average rating to one decimal place when displaying it to customers.

THE system SHALL display the total count of non-deleted reviews alongside the average rating.

## CancellationRequest Rules

Customers can request cancellation for individual order items with paid status. Cancellation requests include a text reason from the customer. Only items not yet shipped can be cancelled. Sellers of the item can approve or reject cancellation requests. When sellers respond, a snapshot of the request state is created. Approved cancellations change the item status to cancelled. Cancelled items restore their stock quantities through inventory records. Remaining items in the order continue processing normally. If all items in an order are cancelled, the order status becomes cancelled. Rejected cancellation requests leave the item in paid status.

### Cancellation Request Eligibility

WHEN a customer requests cancellation, THE system SHALL verify the order item status is "paid".

IF the order item status is not "paid", THEN THE system SHALL reject the cancellation request.

IF the order item has already been shipped, THEN THE system SHALL reject the cancellation request.

THE system SHALL allow cancellation requests only for items that have not yet been shipped.

WHEN a cancellation request is submitted, THE system SHALL record the request timestamp.

THE system SHALL associate the cancellation request with the requesting customer and the order item.

IF the order item does not exist, THEN THE system SHALL reject the cancellation request.

IF the customer is not the owner of the order, THEN THE system SHALL reject the cancellation request.

### Cancellation Reason Requirements

WHEN a customer submits a cancellation request, THE system SHALL require a reason text.

IF the cancellation reason is empty or missing, THEN THE system SHALL reject the cancellation request.

THE system SHALL store the cancellation reason provided by the customer.

THE system SHALL preserve the original cancellation reason in the request record.

THE system SHALL display the cancellation reason to the seller when reviewing the request.

### Seller Approval Process

WHEN a seller reviews a cancellation request, THE system SHALL allow the seller to approve or reject the request.

IF the seller approves the cancellation request, THEN THE system SHALL change the order item status to "cancelled".

IF the seller rejects the cancellation request, THEN THE system SHALL keep the order item status as "paid".

THE system SHALL only allow the seller of the order item to respond to the cancellation request.

IF the seller is not the owner of the product in the order item, THEN THE system SHALL prevent the seller from responding.

WHEN a seller responds to a cancellation request, THE system SHALL record the response timestamp.

THE system SHALL update the cancellation request status to "approved" or "rejected" based on the seller's decision.

IF the cancellation request has already been responded to, THEN THE system SHALL prevent additional responses.

### Cancellation Snapshot Creation

WHEN a seller responds to a cancellation request, THE system SHALL create a cancellation snapshot.

THE system SHALL preserve the request state in the snapshot including the reason and status.

THE system SHALL record the timestamp when the cancellation snapshot is created.

THE system SHALL make cancellation snapshots immutable and non-deletable.

THE system SHALL allow the customer to view snapshots of their cancellation requests.

THE system SHALL allow the seller to view snapshots of cancellation requests for their products.

THE system SHALL preserve cancellation snapshots even if the order item is later modified.

WHEN a cancellation request status changes, THE system SHALL include the previous and new status in the snapshot.

### Stock Restoration Rules

WHEN a cancellation request is approved, THE system SHALL create an inventory record to restore stock.

THE system SHALL add the cancelled item quantity back to the variant's stock.

THE system SHALL record the stock restoration reason in the inventory record.

THE system SHALL timestamp the inventory record for stock restoration.

IF the variant no longer exists, THEN THE system SHALL still record the inventory adjustment.

WHEN stock is restored through cancellation, THE system SHALL update the current stock quantity by summing all inventory records.

THE system SHALL make restored stock available for new orders immediately after cancellation approval.

### Partial Order Cancellation

WHEN a customer cancels individual items in an order, THE system SHALL process each cancellation independently.

THE system SHALL allow some items in an order to be cancelled while others continue processing.

IF multiple items in an order are cancelled, THEN THE system SHALL maintain separate cancellation requests for each item.

THE system SHALL not automatically cancel other items in the same order when one item is cancelled.

WHEN items from different sellers are in the same order, THE system SHALL allow each seller to respond to their respective cancellation requests independently.

THE system SHALL allow customers to cancel some items and keep others in the same order.

### Order Status Impact

WHEN all items in an order are cancelled, THEN THE system SHALL update the overall order status to "cancelled".

IF some items are cancelled and others remain in "paid" status, THEN THE system SHALL update the order status to "partially completed".

IF some items are cancelled and others are "shipped", THEN THE system SHALL update the order status to "partially completed".

IF some items are cancelled and others are "delivered", THEN THE system SHALL update the order status to "partially completed".

THE system SHALL derive the order status from the status of all its items.

WHEN an item status changes to "cancelled", THE system SHALL recalculate the overall order status.

IF an order has mixed item statuses including cancelled items, THEN THE system SHALL display "partially completed" as the order status.

THE system SHALL update the order status immediately when the last item in an order is cancelled.

## RefundRequest Rules

Customers can request refunds for individual order items with delivered status. Refund requests must be submitted within seven days of item delivery. Refund requests include a text reason from the customer. Sellers of the item can approve or reject refund requests. When sellers respond, a snapshot of the request state is created. Approved refunds change the item status to refunded. Refunded items restore their stock quantities through inventory records. Remaining items in the order are unaffected by the refund. If all items in an order are refunded, the order status becomes refunded. Rejected refund requests leave the item in delivered status.

### Refund Request Eligibility

WHEN a customer requests a refund for an order item, THE system SHALL verify the item status is "delivered".

IF the order item status is not "delivered", THEN THE system SHALL reject the refund request.

IF the order item has already been refunded, THEN THE system SHALL reject the refund request.

IF the order item has already been cancelled, THEN THE system SHALL reject the refund request.

IF the order item is associated with a pending refund request, THEN THE system SHALL reject the refund request.

### Seven-Day Refund Window

WHEN a customer requests a refund for an order item, THE system SHALL calculate the elapsed time since the item's delivery confirmation.

IF the elapsed time exceeds seven days from delivery, THEN THE system SHALL reject the refund request.

IF the elapsed time is exactly seven days from delivery, THEN THE system SHALL accept the refund request.

IF the elapsed time is less than seven days from delivery, THEN THE system SHALL accept the refund request.

THE system SHALL use the delivery confirmation timestamp (either customer-confirmed or automatic 14-day timestamp) as the starting point for the seven-day window.

### Refund Reason Requirement

WHEN a customer submits a refund request, THE system SHALL require the customer to provide a reason text.

IF the reason text is empty or missing, THEN THE system SHALL reject the refund request.

THE system SHALL store the reason text with the refund request for seller review.

THE system SHALL preserve the reason text in refund snapshots when the seller responds.

### Seller Response Authority

WHEN a seller receives a refund request for their order item, THE system SHALL allow the seller to approve or reject the request.

WHEN a seller approves a refund request, THE system SHALL change the order item status to "refunded".

WHEN a seller rejects a refund request, THE system SHALL leave the order item status as "delivered".

IF the seller is not the owner of the order item, THEN THE system SHALL prevent the seller from responding to the refund request.

IF the seller account is suspended, THEN THE system SHALL still allow the seller to respond to pending refund requests.

### Refund Snapshot Creation

WHEN a seller responds to a refund request (approval or rejection), THE system SHALL create a refund snapshot.

THE refund snapshot SHALL capture the request state including the reason text and the new status.

THE refund snapshot SHALL be immutable and cannot be deleted or modified.

THE system SHALL preserve refund snapshots even after the order item is refunded or the order is completed.

Administrators SHALL be able to view refund snapshots for dispute resolution.

### Stock Restoration on Approved Refund

WHEN a refund request is approved, THE system SHALL create an inventory record with a positive quantity change.

THE inventory record SHALL restore the stock quantity that was originally purchased in the order item.

THE inventory record SHALL include a reason indicating "refund approved".

THE inventory record SHALL be timestamped at the time of refund approval.

THE restored stock quantity SHALL be immediately available for new orders.

### Partial Order Refund Behavior

WHEN an order item is refunded, THE system SHALL leave all other order items in the same order unaffected.

IF an order contains multiple items from different sellers, THE system SHALL allow independent refund processing for each seller's items.

IF an order contains multiple items from the same seller, THE system SHALL allow the customer to request refunds for individual items.

THE system SHALL not automatically refund other items when one item is refunded.

THE system SHALL not prevent refund requests for other items when one item has been refunded.

### Order Status Impact from Refunds

WHEN all order items in an order have status "refunded", THE system SHALL update the overall order status to "refunded".

WHEN some order items are refunded and others have different statuses, THE system SHALL update the overall order status to "partially completed".

IF an order contains items with mixed statuses (delivered, refunded, cancelled), THE system SHALL derive the order status as "partially completed".

THE system SHALL recalculate the order status whenever an item status changes to "refunded".

THE system SHALL preserve the original order status history for audit purposes.

### Refund Timing Validation

WHEN a customer attempts to submit a refund request, THE system SHALL validate the request timing against the delivery confirmation date.

IF the delivery confirmation date is in the future, THEN THE system SHALL reject the refund request.

IF the customer attempts to request a refund before the item is marked as delivered, THEN THE system SHALL reject the refund request.

THE system SHALL display the remaining time in the seven-day window to the customer before submission.

THE system SHALL prevent refund requests after the seven-day window expires.

## SellerApprovalRequest Rules

Sellers must be approved by administrators before they can sell products. Sellers submit registration requests to become active sellers. Administrators can view all pending seller approval requests. Administrators can approve seller requests, making them active sellers. Administrators can reject seller requests with a required reason. Rejected sellers can view the rejection reason. Rejected sellers can submit new registration requests. Sellers can view their approval status as pending, approved, or rejected. Sellers cannot list products until approved. Approved sellers can create and manage products immediately.

### Seller Approval Request Submission

WHEN a user submits a seller registration request, THE system SHALL create a SellerApprovalRequest with status pending.

WHEN a user submits a seller registration request, THE system SHALL record the submission timestamp.

IF a user already has a pending SellerApprovalRequest, THEN THE system SHALL reject the new request.

IF a user already has an approved SellerApprovalRequest, THEN THE system SHALL reject the new request.

WHEN a seller submits a registration request, THE system SHALL require a reason text field.

IF the reason text field is empty or missing, THEN THE system SHALL reject the submission.

WHEN a seller submits a registration request, THE system SHALL associate the request with the seller's user account.

WHEN a seller submits a registration request, THE system SHALL set the approval status to pending.

WHEN a seller submits a registration request, THE system SHALL prevent product listing until approval is granted.

### Approval Request Status Viewing

WHEN a seller views their approval status, THE system SHALL display pending, approved, or rejected.

WHEN a seller views their approval status, THE system SHALL show the current status of their SellerApprovalRequest.

IF a seller's request status is pending, THEN THE system SHALL indicate the request is awaiting administrator review.

IF a seller's request status is approved, THEN THE system SHALL indicate the seller is active and can list products.

IF a seller's request status is rejected, THEN THE system SHALL display the rejection reason provided by the administrator.

WHEN a seller views their approval status, THE system SHALL show the submission date of the request.

WHEN a seller views their approval status, THE system SHALL show the response date if the request has been processed.

WHEN a seller with rejected status views their profile, THE system SHALL allow them to submit a new registration request.

WHEN a seller with approved status views their profile, THE system SHALL prevent them from submitting another registration request.

### Administrator Approval Actions

WHEN an administrator views pending seller approval requests, THE system SHALL display all requests with status pending.

WHEN an administrator views pending seller approval requests, THE system SHALL show the seller's shop name and submission date.

WHEN an administrator approves a seller request, THE system SHALL change the request status to approved.

WHEN an administrator approves a seller request, THE system SHALL record the response timestamp.

WHEN an administrator approves a seller request, THE system SHALL activate the seller's ability to list products.

WHEN an administrator approves a seller request, THE system SHALL update the seller's approval status to approved.

WHEN an administrator rejects a seller request, THE system SHALL change the request status to rejected.

WHEN an administrator rejects a seller request, THE system SHALL record the response timestamp.

WHEN an administrator rejects a seller request, THE system SHALL require a rejection reason to be provided.

IF the rejection reason is empty or missing, THEN THE system SHALL prevent the rejection action.

WHEN an administrator rejects a seller request, THE system SHALL preserve the rejection reason for the seller to view.

WHEN an administrator rejects a seller request, THE system SHALL update the seller's approval status to rejected.

### Approval Rejection and Reasons

WHEN an administrator rejects a seller request, THE system SHALL store the rejection reason with the request.

WHEN a seller views a rejected request, THE system SHALL display the rejection reason provided by the administrator.

IF a seller's request is rejected, THEN THE system SHALL allow the seller to submit a new registration request.

WHEN a seller submits a new request after rejection, THE system SHALL create a new SellerApprovalRequest with status pending.

WHEN a seller submits a new request after rejection, THE system SHALL preserve the history of previous rejection reasons.

IF a seller has multiple rejected requests, THEN THE system SHALL display all rejection reasons in chronological order.

WHEN an administrator views a seller's request history, THE system SHALL show all previous requests and their statuses.

WHEN an administrator views a seller's request history, THE system SHALL display all rejection reasons for rejected requests.

### Seller Resubmission Rules

WHEN a seller's request is rejected, THE system SHALL allow the seller to submit a new registration request.

WHEN a seller submits a new request after rejection, THE system SHALL create a new SellerApprovalRequest record.

WHEN a seller submits a new request after rejection, THE system SHALL require a new reason text field.

IF a seller already has a pending request, THEN THE system SHALL prevent submission of another request.

WHEN a seller submits a new request after rejection, THE system SHALL record the new submission timestamp.

WHEN a seller submits a new request after rejection, THE system SHALL maintain the previous rejected request in the history.

WHEN a seller submits multiple requests, THE system SHALL preserve all request records for administrator review.

WHEN an administrator reviews a resubmitted request, THE system SHALL show the seller's complete request history.

### Seller Activation and Restrictions

WHEN a seller's request is approved, THE system SHALL activate the seller account for product listing.

WHEN a seller's request is approved, THE system SHALL allow the seller to create products immediately.

WHEN a seller's request is approved, THE system SHALL allow the seller to manage existing products.

IF a seller's request is pending, THEN THE system SHALL prevent the seller from creating new products.

IF a seller's request is pending, THEN THE system SHALL prevent the seller from editing existing products.

IF a seller's request is rejected, THEN THE system SHALL prevent the seller from creating new products.

IF a seller's request is rejected, THEN THE system SHALL prevent the seller from editing existing products.

WHEN a seller is activated, THE system SHALL allow the seller to view their products in search results.

WHEN a seller is activated, THE system SHALL allow customers to purchase the seller's products.

## AdminPromotionRequest Rules

Any user can request to become an administrator with a reason. Super administrators can view all pending promotion requests. Super administrators can approve requests, granting regular administrator status. Super administrators can reject requests with a reason. Approved users become regular administrators immediately. Super administrators can promote regular administrators to super administrator status. Super administrators can demote other super administrators to regular status. Super administrators cannot demote themselves. Administrator grade changes are auditable and recorded.

### Admin Promotion Request Submission Rules

WHEN a user submits an admin promotion request, THE system SHALL require a text reason for the request.

IF the user already has an administrator profile, THEN THE system SHALL reject the promotion request.

IF the user's account is banned or deleted, THEN THE system SHALL reject the promotion request.

WHEN a promotion request is submitted, THE system SHALL set the request status to "pending".

IF the reason field is empty or contains only whitespace, THEN THE system SHALL reject the promotion request.

WHEN a promotion request is created, THE system SHALL record the submission timestamp.

THE system SHALL allow only one pending promotion request per user at any time.

IF a user has a pending promotion request, THEN THE system SHALL prevent them from submitting another request.

### Promotion Approval Rules

WHEN a super administrator approves a promotion request, THE system SHALL change the request status to "approved".

WHEN a promotion request is approved, THE system SHALL create an administrator profile for the user with grade "regular".

WHEN a promotion request is approved, THE system SHALL record the approval timestamp.

IF the approver is not a super administrator, THEN THE system SHALL reject the approval action.

WHEN a promotion request is approved, THE system SHALL immediately grant the user regular administrator privileges.

IF the user's account is banned at the time of approval, THEN THE system SHALL reject the approval action.

### Promotion Rejection Rules

WHEN a super administrator rejects a promotion request, THE system SHALL change the request status to "rejected".

WHEN a promotion request is rejected, THE system SHALL require the super administrator to provide a rejection reason.

IF the rejection reason is empty or contains only whitespace, THEN THE system SHALL reject the rejection action.

WHEN a promotion request is rejected, THE system SHALL record the rejection timestamp.

IF the rejector is not a super administrator, THEN THE system SHALL reject the rejection action.

WHEN a promotion request is rejected, THE system SHALL allow the user to submit a new promotion request.

IF a user has a rejected promotion request, THE system SHALL not prevent them from submitting a new request.

### Grade Promotion Rules

WHEN a super administrator promotes a regular administrator to super administrator, THE system SHALL change the administrator grade from "regular" to "super".

IF the target administrator does not exist, THEN THE system SHALL reject the grade promotion action.

IF the target administrator's grade is already "super", THEN THE system SHALL reject the grade promotion action.

IF the promoting administrator is not a super administrator, THEN THE system SHALL reject the grade promotion action.

WHEN a grade promotion occurs, THE system SHALL record the promotion timestamp.

WHEN a regular administrator is promoted to super administrator, THE system SHALL grant them all super administrator privileges immediately.

### Grade Demotion Rules

WHEN a super administrator demotes another super administrator to regular administrator, THE system SHALL change the administrator grade from "super" to "regular".

IF the target administrator does not exist, THEN THE system SHALL reject the grade demotion action.

IF the target administrator's grade is already "regular", THEN THE system SHALL reject the grade demotion action.

IF the demoting administrator is not a super administrator, THEN THE system SHALL reject the grade demotion action.

WHEN a grade demotion occurs, THE system SHALL record the demotion timestamp.

WHEN a super administrator is demoted to regular administrator, THE system SHALL revoke their super administrator privileges immediately.

### Self-Demotion Prevention Rules

IF a super administrator attempts to demote themselves, THEN THE system SHALL reject the self-demotion action.

WHEN a self-demotion attempt occurs, THE system SHALL log the attempt as an error.

IF the target of demotion is the same user as the initiator, THEN THE system SHALL prevent the grade change.

THE system SHALL ensure that at least one super administrator always exists on the platform.

IF demoting a super administrator would result in zero super administrators, THEN THE system SHALL reject the demotion action.

### Admin Promotion Request Error Scenarios

IF a promotion request references a non-existent user, THEN THE system SHALL reject the request creation.

IF a promotion request status transition is invalid (e.g., from approved to pending), THEN THE system SHALL reject the status change.

IF a super administrator attempts to approve or reject a non-existent promotion request, THEN THE system SHALL reject the action.

IF a promotion request is already approved or rejected, THEN THE system SHALL prevent further status changes.

IF an administrator grade change targets a user without an administrator profile, THEN THE system SHALL reject the grade change.

IF multiple super administrators attempt to modify the same promotion request simultaneously, THEN THE system SHALL process only the first valid request and reject subsequent conflicts.

## ProductSnapshot Rules

Product snapshots are created whenever a product is edited. Snapshots preserve all product fields including name, description, category, and base price. Snapshots also include snapshots of all variants at that moment. Snapshots record when the change was made and values before and after. Product snapshots are immutable and cannot be deleted. Sellers can view snapshots of their own products. Administrators can view snapshots of any product on the platform. Snapshots are preserved even after product deletion. Product snapshots enable dispute resolution and audit trails.

### Product Snapshot Creation

WHEN a seller edits their product, THE system SHALL automatically create a product snapshot.

WHEN a product is edited, THE snapshot SHALL include the product's name, description, category, and base price at the time of editing.

WHEN a product is edited, THE snapshot SHALL include snapshots of all product variants at that moment.

WHEN a product snapshot is created, THE system SHALL record the timestamp of when the change was made.

WHEN a product snapshot is created, THE system SHALL record both the before and after values of changed fields.

### Snapshot Data Preservation

WHEN a product is edited, THE snapshot SHALL capture all product fields including name, description, category, and base price.

WHEN a product is deleted, THE system SHALL preserve all existing product snapshots.

WHEN a product is deleted, THE system SHALL preserve all associated variant snapshots.

WHEN a product is deleted, THE system SHALL preserve all associated product images and their display order.

WHEN a product is deleted, THE system SHALL preserve all inventory records for product variants.

### Variant Snapshot Inclusion

WHEN a product is edited, THE system SHALL automatically create variant snapshots for all existing variants.

WHEN a variant snapshot is created, THE system SHALL preserve the SKU code, option values, and price at the time of the product edit.

WHEN a variant is edited independently, THE system SHALL create a new variant snapshot.

WHEN a variant is deleted, THE system SHALL preserve all existing variant snapshots.

WHEN a variant is deleted, THE system SHALL preserve the relationship between the product snapshot and its variant snapshots.

### Snapshot Immutability

WHEN a product snapshot is created, THE system SHALL make it immutable.

WHEN a variant snapshot is created, THE system SHALL make it immutable.

WHEN a snapshot is created, NO user SHALL be able to modify its content.

WHEN a product is deleted, THE system SHALL NOT delete existing product snapshots.

WHEN a product is deleted, THE system SHALL NOT delete existing variant snapshots.

### Snapshot Viewing

WHEN a seller views their product, THE system SHALL display available snapshots.

WHEN an administrator views any product, THE system SHALL display all available snapshots.

WHEN a user requests to view a product snapshot, THE system SHALL show the complete state of the product at that point in time.

WHEN a user requests to view a variant snapshot, THE system SHALL show the complete state of the variant at that point in time.

WHEN a user requests to view a product snapshot, THE system SHALL show all associated variant snapshots.

### Snapshot Retention

WHEN a product is deleted, THE system SHALL retain all historical product snapshots.

WHEN a product is deleted, THE system SHALL retain all historical variant snapshots.

WHEN a product is reactivated (if applicable), THE system SHALL maintain all historical snapshots.

WHEN a seller account is deleted, THE system SHALL retain all product and variant snapshots for audit purposes.

WHEN a dispute arises, THE system SHALL preserve all relevant snapshots for the duration required by legal and compliance requirements.

### Dispute Resolution

WHEN a dispute arises regarding a product change, THE system SHALL provide access to all relevant snapshots.

WHEN a seller disputes a product modification, THE system SHALL allow viewing the before and after states.

WHEN an administrator investigates a product issue, THE system SHALL provide access to the complete snapshot history.

WHEN a customer disputes a purchase, THE system SHALL allow administrators to view the product state at the time of purchase.

WHEN a legal or compliance review is initiated, THE system SHALL preserve all relevant snapshots for the required retention period.

### Audit Trail

WHEN a product is created, THE system SHALL record the initial state as a baseline.

WHEN a product is edited, THE system SHALL create a new snapshot entry in the audit trail.

WHEN a variant is edited, THE system SHALL create a new variant snapshot entry in the audit trail.

WHEN an administrator reviews product history, THE system SHALL display a chronological list of all snapshots.

WHEN a product is deleted, THE system SHALL preserve the complete audit trail for compliance purposes.

## VariantSnapshot Rules

Variant snapshots are created whenever a product variant is edited. Snapshots preserve SKU code, option values, and price at the time of change. Variant snapshots are included in product snapshots. Variant snapshots record when changes were made and previous values. Variant snapshots are immutable and cannot be deleted. Variant snapshots preserve the complete state of variants at any point in time. Sellers can view variant snapshots through product snapshots. Administrators can view all variant snapshots. Variant snapshots are preserved even after variant or product deletion.

### Variant Snapshot Creation

WHEN a seller edits a product variant, THE system SHALL automatically create a variant snapshot.

WHEN a product variant's SKU code is changed, THE system SHALL create a variant snapshot before the change is applied.

WHEN a product variant's option values are modified, THE system SHALL create a variant snapshot before the change is applied.

WHEN a product variant's price is updated, THE system SHALL create a variant snapshot before the change is applied.

WHEN a product variant is deleted, THE system SHALL preserve all existing variant snapshots.

IF a variant edit operation fails, THE system SHALL NOT create a variant snapshot.

WHEN a product snapshot is created, THE system SHALL include all current variant snapshots within the product snapshot.

### Variant Data Preservation

WHEN a variant snapshot is created, THE system SHALL preserve the SKU code value at the time of the change.

WHEN a variant snapshot is created, THE system SHALL preserve all option values (e.g., color, size) at the time of the change.

WHEN a variant snapshot is created, THE system SHALL preserve the price value at the time of the change.

WHEN a variant snapshot is created, THE system SHALL preserve the stock quantity value at the time of the change.

WHEN a variant snapshot is created, THE system SHALL record the timestamp of when the change occurred.

WHEN a variant snapshot is created, THE system SHALL record the previous values of all changed fields.

WHEN a variant snapshot is created, THE system SHALL record the new values of all changed fields.

IF a variant has no price override, THE system SHALL preserve the base price reference in the variant snapshot.

### Snapshot Immutability and Retention

THE system SHALL NOT allow modification of any variant snapshot after creation.

THE system SHALL NOT allow deletion of any variant snapshot.

THE system SHALL preserve variant snapshots even after the associated variant is deleted.

THE system SHALL preserve variant snapshots even after the associated product is deleted.

THE system SHALL maintain variant snapshots indefinitely for dispute resolution purposes.

WHEN a variant snapshot is accessed, THE system SHALL return the exact data captured at the time of creation.

IF a variant snapshot is referenced in an order item, THE system SHALL ensure the snapshot remains accessible.

### Snapshot Viewing and Access

WHEN a seller views a product snapshot, THE system SHALL display all associated variant snapshots.

WHEN an administrator views a product snapshot, THE system SHALL display all associated variant snapshots.

WHEN a seller requests variant snapshot history, THE system SHALL show all snapshots sorted by creation date.

WHEN an administrator requests variant snapshot history, THE system SHALL show all snapshots sorted by creation date.

IF a user is not the product owner and not an administrator, THE system SHALL NOT display variant snapshots.

WHEN a variant snapshot is displayed, THE system SHALL show the timestamp of when the snapshot was created.

WHEN a variant snapshot is displayed, THE system SHALL show which fields were changed and their before/after values.

## SellerProfileSnapshot Rules

Seller profile snapshots are created whenever a seller profile is edited. Snapshots preserve shop name, description, and logo at the time of change. Snapshots record when changes were made and previous values. Seller profile snapshots are immutable and cannot be deleted. Seller profile snapshots are saved with order items at purchase time. Order items preserve the seller profile as it existed when purchased. Sellers can view their own profile snapshots. Administrators can view all seller profile snapshots. Profile snapshots enable historical accuracy in order records.

### Profile Snapshot Creation

WHEN a seller edits their profile, THE system SHALL automatically create a seller profile snapshot.

WHEN a seller changes their shop name, THE system SHALL create a snapshot before applying the change.

WHEN a seller changes their shop description, THE system SHALL create a snapshot before applying the change.

WHEN a seller changes their logo image, THE system SHALL create a snapshot before applying the change.

WHEN a seller profile is edited, THE system SHALL record the timestamp of the snapshot creation.

WHEN a seller profile is edited, THE system SHALL record the previous values before the change.

WHEN a seller profile is edited, THE system SHALL record the new values after the change.

IF a seller profile edit fails, THE system SHALL NOT create a snapshot.

IF a seller profile edit is successful, THE system SHALL create exactly one snapshot.

WHEN a seller creates their initial profile, THE system SHALL NOT create a snapshot.

### Snapshot Data Preservation

WHEN a seller profile snapshot is created, THE system SHALL preserve the shop name value at the time of change.

WHEN a seller profile snapshot is created, THE system SHALL preserve the shop description value at the time of change.

WHEN a seller profile snapshot is created, THE system SHALL preserve the logo image reference at the time of change.

WHEN a seller profile snapshot is created, THE system SHALL preserve the approval status at the time of change.

WHEN a seller profile snapshot is created, THE system SHALL preserve all profile fields that existed at the time of change.

IF a seller profile field is added in a future update, THE system SHALL preserve the new field in subsequent snapshots.

IF a seller profile field is removed in a future update, THE system SHALL preserve the field in historical snapshots.

WHEN a seller profile is edited multiple times, THE system SHALL create a separate snapshot for each edit.

WHEN a seller profile snapshot is created, THE system SHALL associate it with the seller profile that was edited.

### Snapshot Immutability Rules

WHEN a seller profile snapshot is created, THE system SHALL make it immutable.

IF a user attempts to modify a seller profile snapshot, THE system SHALL reject the modification.

IF a user attempts to delete a seller profile snapshot, THE system SHALL reject the deletion.

WHEN a seller profile is deleted, THE system SHALL preserve all associated snapshots.

WHEN a seller account is deleted, THE system SHALL preserve all associated profile snapshots.

WHEN a seller profile snapshot is created, THE system SHALL ensure it cannot be altered by any user.

WHEN a seller profile snapshot is created, THE system SHALL ensure it cannot be altered by any administrator.

WHEN a seller profile snapshot is created, THE system SHALL ensure it cannot be altered by any super administrator.

### Purchase Time Preservation

WHEN a customer places an order, THE system SHALL create a seller profile snapshot for each seller in the order.

WHEN a customer places an order, THE system SHALL preserve the seller profile as it existed at the time of purchase.

WHEN a customer places an order, THE system SHALL store the seller profile snapshot with each order item.

WHEN a customer views an order detail, THE system SHALL display the seller shop name from the purchase time snapshot.

WHEN a customer views an order detail, THE system SHALL display the seller logo from the purchase time snapshot.

WHEN a seller edits their profile after an order is placed, THE system SHALL NOT update historical order records.

WHEN a seller deletes their account, THE system SHALL preserve seller profile snapshots in historical order records.

WHEN a seller is suspended, THE system SHALL preserve seller profile snapshots in historical order records.

WHEN an order item is cancelled, THE system SHALL preserve the seller profile snapshot from purchase time.

WHEN an order item is refunded, THE system SHALL preserve the seller profile snapshot from purchase time.

### Snapshot Viewing Permissions

WHEN a seller views their profile, THE system SHALL allow them to view their own profile snapshots.

WHEN a seller views their profile snapshots, THE system SHALL display the timestamp of each snapshot.

WHEN a seller views their profile snapshots, THE system SHALL display the previous and current values for each change.

WHEN an administrator views any seller profile, THE system SHALL allow them to view all profile snapshots.

WHEN an administrator views seller profile snapshots, THE system SHALL display all historical changes.

WHEN a customer views an order, THE system SHALL NOT display seller profile snapshots directly.

WHEN a customer views an order, THE system SHALL display seller information from the purchase time snapshot.

WHEN a seller views their profile snapshots, THE system SHALL show snapshots sorted by creation time (newest first).

IF a seller does not have any profile snapshots, THE system SHALL display an empty snapshot list.

### Order Record Accuracy

WHEN a customer views an order, THE system SHALL ensure the seller shop name matches the purchase time snapshot.

WHEN a customer views an order, THE system SHALL ensure the seller logo matches the purchase time snapshot.

WHEN a seller changes their shop name, THE system SHALL NOT update existing order records.

WHEN a seller changes their logo, THE system SHALL NOT update existing order records.

WHEN a seller is suspended, THE system SHALL preserve the seller profile snapshot in order records.

WHEN a seller is banned, THE system SHALL preserve the seller profile snapshot in order records.

WHEN a seller deletes their account, THE system SHALL preserve the seller profile snapshot in order records.

WHEN an order is cancelled, THE system SHALL preserve the seller profile snapshot from purchase time.

WHEN an order is refunded, THE system SHALL preserve the seller profile snapshot from purchase time.

WHEN a dispute occurs, THE system SHALL provide access to the seller profile snapshot for verification.

## ReviewSnapshot Rules

Review snapshots are created whenever a review is edited. Snapshots preserve rating and text content at the time of change. Snapshots record when changes were made and previous values. Review snapshots are immutable and cannot be deleted. Review snapshots are preserved even after review deletion. Customers can view their own review snapshots. Administrators can view all review snapshots. Review snapshots enable audit trails for review modifications. Review snapshots support dispute resolution for rating changes.

### Review Snapshot Creation

WHEN a customer edits a review, THE system SHALL automatically create a review snapshot.

WHEN a review is edited, THE system SHALL create a snapshot before the edit is applied.

WHEN a review is edited, THE system SHALL record the timestamp of when the snapshot was created.

WHEN a review is edited, THE system SHALL associate the snapshot with the original review.

IF a review is edited multiple times, THE system SHALL create a separate snapshot for each edit.

THE system SHALL create review snapshots without requiring explicit user action.

THE system SHALL preserve the previous state of the review in the snapshot.

### Snapshot Data Preservation

WHEN a review snapshot is created, THE system SHALL preserve the rating value at the time of the change.

WHEN a review snapshot is created, THE system SHALL preserve the text content at the time of the change.

WHEN a review snapshot is created, THE system SHALL record the previous rating value before the edit.

WHEN a review snapshot is created, THE system SHALL record the previous text content before the edit.

WHEN a review snapshot is created, THE system SHALL record the new rating value after the edit.

WHEN a review snapshot is created, THE system SHALL record the new text content after the edit.

THE system SHALL preserve both rating and text content in every review snapshot.

THE system SHALL record what fields were changed in the snapshot.

### Snapshot Immutability and Retention

THE system SHALL prevent deletion of review snapshots after creation.

THE system SHALL prevent modification of review snapshots after creation.

WHEN a review is deleted, THE system SHALL retain all associated review snapshots.

WHEN a review is deleted, THE system SHALL preserve the review snapshots for future reference.

THE system SHALL maintain review snapshots indefinitely.

THE system SHALL ensure review snapshots remain accessible after review deletion.

THE system SHALL protect review snapshots from unauthorized access.

THE system SHALL ensure review snapshot data integrity over time.

### Snapshot Viewing and Access

WHEN a customer views their review history, THE system SHALL allow viewing of their own review snapshots.

WHEN an administrator views review data, THE system SHALL allow viewing of all review snapshots.

WHEN a customer requests to view a review snapshot, THE system SHALL display the previous and current values.

WHEN an administrator requests to view a review snapshot, THE system SHALL display the complete snapshot data.

THE system SHALL display the timestamp when each review snapshot was created.

THE system SHALL show which fields were changed in each review snapshot.

THE system SHALL organize review snapshots chronologically for viewing.

IF a user does not have permission to view a review snapshot, THE system SHALL deny access.

### Audit Trail and Dispute Resolution

THE system SHALL maintain a complete audit trail of all review modifications through snapshots.

WHEN a dispute arises about a review change, THE system SHALL provide snapshot data for resolution.

WHEN a seller disputes a rating change, THE system SHALL provide the review snapshot as evidence.

WHEN an administrator investigates review tampering, THE system SHALL provide the complete audit trail.

THE system SHALL enable chronological review of all review changes through snapshots.

THE system SHALL support dispute resolution by preserving original review values.

THE system SHALL allow comparison of review states across different timestamps.

THE system SHALL provide snapshot data when requested for dispute resolution purposes.

## CancellationSnapshot Rules

Cancellation request snapshots are created when sellers respond to requests. Snapshots preserve the request state including reason and status. Snapshots record when the response was made. Cancellation snapshots are immutable and cannot be deleted. Cancellation snapshots preserve the complete history of cancellation requests. Customers can view snapshots of their own cancellation requests. Sellers can view snapshots of requests for their items. Administrators can view all cancellation snapshots. Cancellation snapshots support dispute resolution and audit requirements.

### Cancellation Snapshot Creation

WHEN a seller responds to a cancellation request, THE system SHALL automatically create a cancellation snapshot.

WHEN a cancellation request status changes from pending to approved, THE system SHALL create a snapshot capturing the request state.

WHEN a cancellation request status changes from pending to rejected, THE system SHALL create a snapshot capturing the request state.

THE system SHALL create a snapshot at the exact moment the seller provides their response.

THE system SHALL include the response timestamp in the snapshot record.

IF a seller fails to respond to a cancellation request, THE system SHALL NOT create a cancellation snapshot.

IF a cancellation request is deleted without a response, THE system SHALL NOT create a cancellation snapshot.

### Snapshot Data and Immutability

THE system SHALL preserve the cancellation request reason in the snapshot.

THE system SHALL preserve the cancellation request status in the snapshot.

THE system SHALL preserve the order item reference in the snapshot.

THE system SHALL preserve the customer identifier in the snapshot.

THE system SHALL preserve the request submission timestamp in the snapshot.

THE system SHALL preserve the seller response timestamp in the snapshot.

THE system SHALL capture all request fields as they existed at the time of response.

WHEN a snapshot is created, THE system SHALL mark it as immutable.

THE system SHALL NOT allow modifications to any field in an existing cancellation snapshot.

THE system SHALL NOT allow deletion of any cancellation snapshot.

IF an attempt is made to modify a cancellation snapshot, THE system SHALL reject the request.

IF an attempt is made to delete a cancellation snapshot, THE system SHALL reject the request.

### Snapshot Access and Viewing

WHEN a customer views their cancellation requests, THE system SHALL display associated snapshots.

WHEN a seller views cancellation requests for their items, THE system SHALL display associated snapshots.

WHEN an administrator views cancellation requests, THE system SHALL display all associated snapshots.

THE system SHALL allow customers to view snapshots of their own cancellation requests.

THE system SHALL allow sellers to view snapshots of requests for their order items.

THE system SHALL allow administrators to view snapshots of all cancellation requests on the platform.

THE system SHALL NOT allow customers to view snapshots of other customers' cancellation requests.

THE system SHALL NOT allow sellers to view snapshots of requests for items they do not own.

THE system SHALL display the complete request history including all snapshots for each cancellation request.

THE system SHALL show snapshots in chronological order from earliest to latest.

### Dispute Resolution and Audit Trail

THE system SHALL preserve cancellation snapshots to support dispute resolution between customers and sellers.

THE system SHALL maintain snapshots as evidence for order item cancellation disputes.

THE system SHALL allow administrators to access snapshots when investigating cancellation-related disputes.

THE system SHALL preserve the complete audit trail of all cancellation request responses.

THE system SHALL record who responded to each cancellation request.

THE system SHALL record when each response was made.

THE system SHALL preserve the reason provided by the customer in the original request.

THE system SHALL preserve the approval or rejection decision made by the seller.

THE system SHALL maintain snapshots indefinitely for legal and compliance purposes.

WHEN a dispute occurs, THE system SHALL provide access to all relevant cancellation snapshots.

## RefundSnapshot Rules

Refund request snapshots are created when sellers respond to requests. Snapshots preserve the request state including reason and status. Snapshots record when the response was made. Refund snapshots are immutable and cannot be deleted. Refund snapshots preserve the complete history of refund requests. Customers can view snapshots of their own refund requests. Sellers can view snapshots of requests for their items. Administrators can view all refund snapshots. Refund snapshots support dispute resolution and audit requirements.

### Refund Snapshot Creation

WHEN a seller responds to a refund request, THE system SHALL automatically create a refund snapshot.

THE system SHALL create a refund snapshot at the moment the seller approves or rejects the refund request.

THE system SHALL record the timestamp when the refund snapshot is created.

IF a seller fails to respond to a refund request, THE system SHALL NOT create a refund snapshot.

THE system SHALL create exactly one refund snapshot per seller response to a refund request.

### Request State Preservation

WHEN a refund snapshot is created, THE system SHALL preserve the complete request state.

THE system SHALL capture the refund reason text in the snapshot.

THE system SHALL capture the refund request status in the snapshot.

THE system SHALL preserve the customer identifier associated with the refund request.

THE system SHALL preserve the order item identifier associated with the refund request.

THE system SHALL preserve the seller identifier who responded to the request.

THE system SHALL capture the requestedAt timestamp from the original refund request.

### Status Preservation

WHEN a refund snapshot is created, THE system SHALL preserve the status at the time of response.

THE system SHALL record whether the refund was approved or rejected in the snapshot.

IF the seller approves the refund, THE system SHALL record the status as approved in the snapshot.

IF the seller rejects the refund, THE system SHALL record the status as rejected in the snapshot.

THE system SHALL NOT modify the status recorded in an existing refund snapshot.

### Snapshot Immutability

WHEN a refund snapshot is created, THE system SHALL make the snapshot immutable.

THE system SHALL NOT allow any actor to modify an existing refund snapshot.

THE system SHALL NOT allow any actor to delete an existing refund snapshot.

IF an attempt is made to modify a refund snapshot, THE system SHALL reject the request.

IF an attempt is made to delete a refund snapshot, THE system SHALL reject the request.

THE system SHALL preserve refund snapshots indefinitely, even after the refund request is resolved.

### Snapshot Viewing

WHILE viewing refund snapshots, THE system SHALL allow customers to view snapshots of their own refund requests.

WHILE viewing refund snapshots, THE system SHALL allow sellers to view snapshots of refund requests for their order items.

WHILE viewing refund snapshots, THE system SHALL allow administrators to view all refund snapshots on the platform.

IF a customer attempts to view another customer's refund snapshots, THE system SHALL reject the request.

IF a seller attempts to view refund snapshots for another seller's items, THE system SHALL reject the request.

THE system SHALL display the response timestamp with each refund snapshot.

THE system SHALL display the seller's response (approved or rejected) with each refund snapshot.

### Request History

THE system SHALL preserve the complete history of all refund snapshots for each refund request.

THE system SHALL maintain a chronological record of all refund snapshots.

WHEN viewing refund request history, THE system SHALL display all associated refund snapshots in chronological order.

THE system SHALL preserve refund snapshots even if the associated order item is cancelled or refunded.

THE system SHALL preserve refund snapshots even if the associated order is cancelled or refunded.

THE system SHALL preserve refund snapshots even if the customer deletes their account.

### Dispute Resolution

THE system SHALL use refund snapshots to support dispute resolution between customers and sellers.

WHEN a dispute is raised regarding a refund request, THE system SHALL provide access to the relevant refund snapshots.

THE system SHALL allow administrators to review refund snapshots during dispute resolution.

THE system SHALL preserve the original refund reason text in snapshots for dispute evidence.

THE system SHALL preserve the seller's response decision in snapshots for dispute evidence.

THE system SHALL preserve the response timestamp in snapshots for dispute evidence.

### Audit Trail

THE system SHALL maintain refund snapshots as part of the audit trail for refund requests.

THE system SHALL record the complete audit trail of refund request responses through snapshots.

WHEN an audit is performed, THE system SHALL provide access to all refund snapshots.

THE system SHALL preserve refund snapshots for legal and compliance purposes.

THE system SHALL ensure refund snapshots contain sufficient information for audit verification.

THE system SHALL maintain refund snapshots with their creation timestamps for audit trail integrity.

# Business Validation Criteria

Business-level validation expectations and data quality criteria.

## User Validation Criteria

User accounts must have unique email addresses across all active accounts on the platform. Email format must be valid and properly structured for communication purposes. Passwords must meet security requirements to protect account access. Users cannot register with emails already associated with existing accounts. Email addresses serve as the primary identifier for login authentication. Account status must be clearly defined as active, banned, or deleted. Users must provide consent for data processing during registration. Duplicate registration attempts with the same email are prevented. Email verification is required before full account activation. Banned users cannot create new accounts with the same email address.

### Email Uniqueness and Format Validation

WHEN a user registers, THE system SHALL require a unique email address that does not match any existing active account.

IF an email address is already associated with an existing account, THE system SHALL reject the registration request.

IF a user attempts to register with an email that matches a deleted account's email, THE system SHALL reject the request.

THE system SHALL prevent multiple accounts from sharing the same email address.

THE system SHALL validate that email addresses follow standard email format (local-part@domain.tld).

IF the email format is invalid, THE system SHALL reject the registration with an appropriate error.

THE system SHALL verify that the email address has not been used in any previous account (even if deleted).

IF a user changes their email address, THE system SHALL ensure the new email is not already in use.

THE system SHALL treat email addresses as case-insensitive for uniqueness checks.

WHEN validating email uniqueness, THE system SHALL check against both active and inactive accounts.

### Password Security and Authentication

WHEN a user creates an account, THE system SHALL require a password that meets minimum security requirements.

IF the password is too short, THE system SHALL reject it.

IF the password lacks required character variety, THE system SHALL reject it.

THE system SHALL require passwords to contain a minimum length of 8 characters.

THE system SHALL require at least one uppercase letter in the password.

THE system SHALL require at least one lowercase letter in the password.

THE system SHALL require at least one numeric digit in the password.

THE system SHALL require at least one special character in the password.

WHEN a user attempts to log in, THE system SHALL verify both email and password match stored credentials.

IF the email or password is incorrect, THE system SHALL reject the login attempt.

IF too many failed login attempts occur, THE system SHALL implement account lockout.

WHEN a user changes their password, THE system SHALL require the old password for verification.

THE system SHALL hash all passwords before storage.

THE system SHALL not store or transmit passwords in plain text.

WHEN a user forgets their password, THE system SHALL require email verification before allowing a password reset.

THE system SHALL require confirmation of the new password during password changes.

### Account Status and Activation Rules

WHEN a user account is created, THE system SHALL set the initial status to pending activation.

IF email verification is required, THE system SHALL prevent full account activation until verification is complete.

THE system SHALL require email verification before allowing access to all platform features.

IF an account is banned, THE system SHALL prevent the user from logging in.

THE system SHALL maintain distinct states for account status: active, banned, and deleted.

IF an account is in banned status, THE system SHALL block all login attempts.

WHEN a banned user attempts to create a new account with the same email, THE system SHALL reject it.

THE system SHALL prevent banned users from accessing any platform features.

IF an account is deleted, THE system SHALL prevent any further login attempts with that account.

THE system SHALL preserve order history and snapshots even after account deletion.

WHEN a user deletes their account, THE system SHALL set the account status to deleted.

THE system SHALL prevent reactivation of accounts that have been deleted.

IF an account is in deleted status, THE system SHALL hide it from active user queries.

THE system SHALL require explicit user consent during initial registration.

IF a user has not completed email verification within the allowed time, THE system SHALL send a reminder.

THE system SHALL allow only one active session per user account at a time.

## CustomerProfile Validation Criteria

Customer profiles must be associated with valid user accounts. Display names must be provided and contain appropriate characters. Phone numbers must follow valid formatting for the customer's country. Each customer can have only one active profile at a time. Profile information must be editable by the customer at any time. Display names should be meaningful for order and review identification. Phone numbers are used for shipping notifications and customer support. Empty or null display names are not acceptable for active customers. Phone number format must be validated against regional standards. Profile updates create audit records for tracking changes.

### Display Name Validation Requirements

THE system SHALL require a display name for all active customer profiles.

IF a customer attempts to create or update a profile without providing a display name, THE system SHALL reject the request.

THE system SHALL validate that display names contain only appropriate alphanumeric characters and standard punctuation.

IF a display name contains only whitespace characters, THE system SHALL reject the profile update.

THE system SHALL ensure display names are meaningful and suitable for order and review identification.

IF a display name contains inappropriate or offensive characters, THE system SHALL reject the profile update.

THE system SHALL enforce a minimum length requirement for display names to ensure identifiability.

IF a display name exceeds maximum reasonable length, THE system SHALL truncate or reject the update.

THE system SHALL validate display names against a defined character set before accepting updates.

WHEN a display name is successfully updated, THE system SHALL immediately reflect the change in all customer-facing contexts.

### Phone Number Format Validation

THE system SHALL validate phone numbers against regional formatting standards.

IF a phone number format is invalid for the customer's region, THE system SHALL reject the profile update.

THE system SHALL ensure phone numbers are in a valid format suitable for shipping notifications.

IF a phone number contains invalid characters or formatting, THE system SHALL reject the update.

THE system SHALL validate phone numbers for use as notification contact information.

WHEN a customer provides a phone number, THE system SHALL verify it meets regional format requirements.

IF a phone number is missing required components for the region, THE system SHALL reject the update.

THE system SHALL accept phone numbers in multiple valid regional formats.

IF a phone number format cannot be validated, THE system SHALL request customer confirmation.

THE system SHALL store phone numbers in a standardized format for consistent processing.

WHEN phone number validation fails, THE system SHALL provide clear error feedback to the customer.

### Profile Association and Uniqueness Rules

THE system SHALL associate each customer profile with exactly one user account.

IF a user account already has an associated customer profile, THE system SHALL prevent creation of a duplicate profile.

THE system SHALL ensure only one active customer profile exists per user account at any time.

WHEN a user account is created, THE system SHALL allow creation of an associated customer profile.

IF an attempt is made to associate a customer profile with a non-existent user account, THE system SHALL reject the request.

THE system SHALL maintain the integrity of the customer profile to user account relationship.

WHEN a user account is deleted, THE system SHALL handle the associated customer profile according to account deletion rules.

IF a customer profile references an invalid user account, THE system SHALL flag the profile for review.

THE system SHALL prevent orphan customer profiles without valid user account associations.

WHEN validating customer profile association, THE system SHALL verify the user account exists and is active.

### Profile Editability and Audit Tracking

THE system SHALL allow customers to edit their display name and phone number at any time.

WHEN a customer updates their profile information, THE system SHALL create an audit record of the change.

THE system SHALL track all profile changes including timestamp, previous values, and new values.

IF a customer attempts to update profile information, THE system SHALL verify they are the profile owner.

THE system SHALL preserve audit records for all profile modifications for dispute resolution.

WHEN profile information is updated, THE system SHALL record the change in an immutable audit trail.

THE system SHALL allow customers to view their profile change history.

IF profile audit tracking is required for compliance, THE system SHALL maintain records for the required retention period.

THE system SHALL ensure audit records cannot be modified or deleted after creation.

WHEN generating audit reports, THE system SHALL include all profile modification events.

THE system SHALL validate profile completeness before allowing account operations that require profile information.

## SellerProfile Validation Criteria

Seller profiles must have unique shop names within the platform. Shop descriptions must be provided and contain meaningful content. Logo images must meet quality and format requirements. Each seller can have only one active profile at a time. Profile information requires administrator approval before going live. Shop names cannot duplicate existing approved seller names. Descriptions must be appropriate and comply with platform policies. Logo images must be uploaded in supported formats. Profile changes create snapshots for historical tracking. Sellers cannot modify profiles while under suspension.

### Shop Name Uniqueness Validation

THE system SHALL ensure that each seller shop name is unique across all approved seller profiles.

IF a seller attempts to register with a shop name that already exists in an approved seller profile, THE system SHALL reject the registration request.

IF a seller attempts to update their shop name to match an existing approved seller's shop name, THE system SHALL reject the update request.

THE system SHALL perform shop name uniqueness checks in a case-insensitive manner.

THE system SHALL allow a rejected seller to reuse their original shop name if their previous registration was rejected or if their account was deleted.

IF a seller's profile is suspended, THE system SHALL still reserve their shop name to prevent other sellers from using it.

THE system SHALL display an error message to the seller indicating that the shop name is already in use when uniqueness validation fails.

### Description Content Validation

THE system SHALL require that every seller profile includes a shop description field.

IF a seller submits a shop description that is empty or contains only whitespace, THE system SHALL reject the profile submission.

THE system SHALL ensure that shop descriptions contain meaningful content relevant to the seller's business.

IF a shop description contains prohibited content such as offensive language, spam, or misleading information, THE system SHALL flag it for administrator review.

THE system SHALL allow sellers to edit their shop descriptions at any time while their profile is approved and not suspended.

WHEN a seller updates their shop description, THE system SHALL create a snapshot of the previous description value.

THE system SHALL display the shop description to customers on the seller profile page.

IF a shop description is flagged for policy violations, THE system SHALL allow administrators to reject the profile or require revision.

### Logo Image Format Validation

THE system SHALL require that seller logo images meet specific format requirements.

IF a seller uploads a logo image in an unsupported file format, THE system SHALL reject the upload request.

THE system SHALL accept logo images in common formats including JPEG, PNG, and GIF.

IF a seller uploads a logo image file that exceeds the maximum allowed file size, THE system SHALL reject the upload request.

THE system SHALL validate that logo images are not corrupted or damaged before accepting them.

WHEN a seller updates their logo image, THE system SHALL create a snapshot of the previous logo image URL.

THE system SHALL ensure that logo images are properly stored and accessible for display on seller profiles.

IF a logo image fails validation, THE system SHALL display an error message to the seller indicating the specific validation failure.

### Administrator Approval Requirement

THE system SHALL require administrator approval before a seller profile becomes active and can sell products.

IF a seller registers without administrator approval, THE system SHALL set their approval status to pending.

WHEN a seller's approval status is pending, THE system SHALL prevent them from creating or editing products.

THE system SHALL notify sellers when their approval status changes from pending to approved.

THE system SHALL notify sellers when their approval status changes from pending to rejected, including the rejection reason.

IF a seller's profile is rejected, THE system SHALL allow them to submit a new registration request.

THE system SHALL prevent sellers with pending or rejected status from processing orders.

WHEN an administrator approves a seller profile, THE system SHALL change the approval status to approved.

### Profile Snapshot Creation

THE system SHALL automatically create a snapshot whenever a seller profile is modified.

WHEN a seller updates their shop name, THE system SHALL create a snapshot containing the previous shop name value.

WHEN a seller updates their shop description, THE system SHALL create a snapshot containing the previous description value.

WHEN a seller updates their logo image, THE system SHALL create a snapshot containing the previous logo image URL.

THE system SHALL record the timestamp of when each profile snapshot was created.

THE system SHALL ensure that all profile snapshots are immutable and cannot be deleted or modified.

THE system SHALL allow sellers to view snapshots of their own profile changes.

THE system SHALL allow administrators to view snapshots of any seller profile for dispute resolution.

THE system SHALL preserve profile snapshots even if the seller deletes their account.

### Suspension Modification Restrictions

THE system SHALL prevent sellers from modifying their profile while their account is suspended.

IF a seller with suspended status attempts to update their shop name, THE system SHALL reject the request.

IF a seller with suspended status attempts to update their shop description, THE system SHALL reject the request.

IF a seller with suspended status attempts to update their logo image, THE system SHALL reject the request.

THE system SHALL allow administrators to modify seller profiles regardless of suspension status.

WHEN a seller's suspension is lifted, THE system SHALL restore their ability to modify their profile.

THE system SHALL display an error message to suspended sellers indicating that profile modifications are not allowed while suspended.

THE system SHALL allow suspended sellers to view their profile information and snapshots.

### Platform Policy Compliance

THE system SHALL require that all seller profiles comply with platform policies.

IF a seller profile contains information that violates platform policies, THE system SHALL flag it for administrator review.

THE system SHALL allow administrators to reject seller profiles that do not comply with platform policies.

WHEN a seller profile is rejected for policy violations, THE system SHALL provide the rejection reason to the seller.

THE system SHALL allow sellers to revise their profile and submit a new registration request after rejection.

THE system SHALL allow administrators to suspend seller profiles that violate platform policies after approval.

IF a seller repeatedly violates platform policies, THE system SHALL allow administrators to permanently ban the seller account.

THE system SHALL preserve all policy violation records and associated snapshots for audit purposes.

### Seller Identity Validation

THE system SHALL validate that each seller profile is associated with a valid user account.

IF a seller registration request is submitted without a valid user account, THE system SHALL reject the request.

THE system SHALL ensure that each user account can have only one seller profile.

IF a user attempts to create multiple seller profiles, THE system SHALL reject the additional profile creation requests.

THE system SHALL verify that the seller's email address is unique across all user accounts.

THE system SHALL validate that seller account credentials are properly authenticated before allowing profile access.

IF a seller's associated user account is deleted, THE system SHALL preserve the seller profile information for order history purposes.

THE system SHALL prevent sellers from modifying their associated user account email address without proper verification.

### Profile Approval Workflow

THE system SHALL support a multi-step seller profile approval workflow.

WHEN a seller submits a registration request, THE system SHALL set the initial approval status to pending.

THE system SHALL allow administrators to view all pending seller approval requests.

WHEN an administrator reviews a pending seller profile, THE system SHALL allow them to approve or reject the request.

IF an administrator approves a seller profile, THE system SHALL change the status to approved and enable selling capabilities.

IF an administrator rejects a seller profile, THE system SHALL change the status to rejected and require a rejection reason.

THE system SHALL allow rejected sellers to submit a new registration request after receiving rejection feedback.

WHEN a seller submits a new registration request after rejection, THE system SHALL reset the approval status to pending.

THE system SHALL track all approval workflow transitions in profile snapshots for audit purposes.

### Image Upload and Storage Validation

THE system SHALL validate all logo image uploads before storing them.

IF a logo image file is corrupted or unreadable, THE system SHALL reject the upload request.

THE system SHALL ensure that uploaded logo images are stored securely and are not accessible to unauthorized users.

WHEN a logo image is uploaded, THE system SHALL generate a unique URL for accessing the image.

THE system SHALL ensure that logo image URLs remain stable and do not change over time.

IF a logo image URL becomes inaccessible, THE system SHALL flag the seller profile for administrator review.

THE system SHALL allow sellers to replace their logo image at any time while their profile is approved and not suspended.

WHEN a logo image is replaced, THE system SHALL preserve the previous image URL in the profile snapshot.

THE system SHALL ensure that logo images meet minimum quality standards for display on the platform.

## AdministratorProfile Validation Criteria

Administrator profiles must be linked to existing user accounts. Grade levels must be either regular or super administrator. Super administrators cannot demote themselves from super status. Administrator profiles are created only after approval of promotion requests. Each user can have only one administrator profile at a time. Grade changes require super administrator authorization. Administrator status is independent of customer or seller roles. Promotion requests must include valid reasoning text. Administrator profiles track creation timestamps for audit purposes. Regular administrators cannot promote other administrators.

### Grade Level Validation

THE system SHALL only accept "regular" or "super" as valid administrator grade values.

IF an administrator profile is created with an invalid grade value, THE system SHALL reject the creation.

THE system SHALL validate grade levels during any grade change operation.

IF a grade change request specifies an invalid grade, THE system SHALL reject the request.

THE system SHALL enforce grade level constraints on all administrator profile operations.

### Promotion Request Processing

WHEN a user submits a promotion request, THE system SHALL require a reason text field.

IF the promotion request reason is empty or missing, THE system SHALL reject the request.

WHEN a promotion request is approved, THE system SHALL create an administrator profile with "regular" grade.

IF a promotion request is rejected, THE system SHALL preserve the rejection reason.

WHEN a user submits a new promotion request after rejection, THE system SHALL allow the submission.

THE system SHALL allow only super administrators to approve promotion requests.

THE system SHALL allow only super administrators to reject promotion requests.

### Self-Demotion Protection

IF a super administrator attempts to demote themselves, THE system SHALL reject the operation.

THE system SHALL prevent self-demotion regardless of authorization level.

WHEN a super administrator demotes another super administrator, THE system SHALL allow the operation.

THE system SHALL validate the identity of the administrator performing the demotion.

IF the administrator performing demotion is the same as the target, THE system SHALL reject the operation.

### Administrator Role Assignment

WHEN an administrator profile is created, THE system SHALL link it to an existing user account.

IF the user account does not exist, THE system SHALL reject the profile creation.

THE system SHALL ensure each user has only one administrator profile at a time.

IF a user already has an administrator profile, THE system SHALL reject duplicate creation.

WHEN a promotion request is approved, THE system SHALL create the administrator profile automatically.

THE system SHALL not allow administrator profile creation without promotion request approval.

### Super Administrator Privileges

THE system SHALL allow super administrators to approve promotion requests.

THE system SHALL allow super administrators to promote regular administrators to super administrators.

THE system SHALL allow super administrators to demote other super administrators to regular administrators.

THE system SHALL prevent regular administrators from approving promotion requests.

THE system SHALL prevent regular administrators from changing administrator grades.

THE system SHALL prevent regular administrators from creating new administrator profiles.

THE system SHALL validate authorization levels before allowing grade change operations.

### Role Independence

THE system SHALL allow administrator profiles to exist independently of customer profiles.

THE system SHALL allow administrator profiles to exist independently of seller profiles.

WHEN a user has both customer and administrator roles, THE system SHALL maintain both profiles separately.

WHEN a user has both seller and administrator roles, THE system SHALL maintain both profiles separately.

THE system SHALL not require customer or seller profiles for administrator profile creation.

THE system SHALL allow a user to have administrator, customer, and seller roles simultaneously.

THE system SHALL treat administrator status as independent from other user roles.

### Audit Trail Requirements

WHEN an administrator profile is created, THE system SHALL record the creation timestamp.

WHEN an administrator grade is changed, THE system SHALL record the change timestamp.

THE system SHALL preserve all timestamp records for audit purposes.

WHEN a promotion request is submitted, THE system SHALL record the submission timestamp.

WHEN a promotion request is responded to, THE system SHALL record the response timestamp.

THE system SHALL not allow modification of recorded timestamps.

THE system SHALL make timestamps available for audit trail verification.

## Address Validation Criteria

Shipping addresses must include all required components for delivery. Recipient names must be provided and properly formatted. Phone numbers must be valid for contact during shipping. Street addresses must be complete and deliverable. City, state/province, and postal code must all be specified. Country must be selected from supported shipping destinations. Each customer can maintain multiple shipping addresses. One address must be designated as the default for checkout. Address components cannot be left empty or null. Addresses must be validated for completeness before use in orders.

### Complete Address Components

**WHEN** a customer adds or edits an address, THE system SHALL require all of the following components to be provided:

1. Recipient name (required)
2. Phone number (required)
3. Street address (required)
4. City (required)
5. State or province (required)
6. Postal code (required)
7. Country (required)

**IF** any required component is missing during address submission, THE system SHALL reject the address creation or update.

**WHEN** validating an address, THE system SHALL verify that no required field is empty or null.

**IF** a customer attempts to save an address with incomplete components, THE system SHALL display validation errors for each missing component.

**WHEN** an address is used for checkout, THE system SHALL verify all components are present and valid before order placement.

**IF** a required component becomes invalid after initial entry, THE system SHALL prevent order completion until fixed.

**WHEN** a customer views their saved addresses, THE system SHALL display all components for each address.

**IF** an address is missing any required component, THE system SHALL prevent its use for shipping.

**WHEN** a customer attempts to use an address with invalid components, THE system SHALL show which specific components failed validation.

**IF** a customer tries to set an incomplete address as default, THE system SHALL reject the request.

**WHEN** an address is retrieved for display, THE system SHALL show all stored components to the customer.

**IF** a component value changes (e.g., customer updates phone number), THE system SHALL preserve all other unchanged components.

**WHEN** an address is used for an order, THE system SHALL create a snapshot of all address components at the time of purchase.

**IF** a customer attempts to delete an address that is currently set as default, THE system SHALL require designating a different default address first.

**WHEN** an address component is being edited, THE system SHALL preserve all other components that are not being modified.

**IF** a customer tries to submit an order with an address missing required components, THE system SHALL block order placement and indicate which components are missing.

### Recipient Name Validation

**WHEN** a customer enters a recipient name for an address, THE system SHALL require at least one character (excluding whitespace).

**IF** the recipient name field is empty or contains only whitespace, THE system SHALL reject the address submission.

**WHEN** a customer edits a recipient name, THE system SHALL validate the new name before saving.

**IF** a recipient name contains only special characters or numbers, THE system SHALL reject the entry.

**WHEN** a recipient name is submitted, THE system SHALL trim leading and trailing whitespace.

**IF** a customer attempts to use an address without a valid recipient name, THE system SHALL prevent order placement.

**WHEN** an order is placed, THE system SHALL snapshot the recipient name as it appeared at order creation time.

**IF** a customer tries to save an address with a recipient name exceeding reasonable length limits, THE system SHALL truncate or reject based on business rules.

**WHEN** displaying saved addresses, THE system SHALL show the recipient name prominently for customer identification.

**IF** a customer attempts to use a recipient name with only whitespace characters, THE system SHALL require a valid alphabetic name.

**WHEN** an address is used for shipping label generation, THE system SHALL use the recipient name exactly as saved.

**IF** a customer tries to set an address as default without a valid recipient name, THE system SHALL prevent the operation.

**WHEN** a customer views their address book, THE system SHALL display the recipient name for each saved address.

**IF** a customer attempts to place an order with an address containing an invalid recipient name, THE system SHALL block checkout.

**WHEN** an order item requires shipping, THE system SHALL verify the recipient name is present and valid.

**IF** a customer tries to copy an address from another customer's profile, THE system SHALL prevent cross-account address sharing.

### Shipping Phone Number Requirements

**WHEN** a customer enters a phone number for an address, THE system SHALL require a valid phone number format.

**IF** the phone number field is empty, THE system SHALL reject the address submission.

**WHEN** validating a phone number, THE system SHALL verify it contains only valid numeric characters and standard telephone delimiters.

**IF** a customer attempts to save an address without a phone number, THE system SHALL require one for shipping contact purposes.

**WHEN** an order is placed, THE system SHALL snapshot the phone number associated with the shipping address.

**IF** a customer tries to use an address with an invalid phone number format, THE system SHALL prevent order placement.

**WHEN** a customer edits an address phone number, THE system SHALL validate the new number before saving.

**IF** a customer attempts to set an address as default without a valid phone number, THE system SHALL block the operation.

**WHEN** a shipping label is generated, THE system SHALL use the phone number from the shipping address.

**IF** a customer tries to place an order with an address missing a phone number, THE system SHALL require phone number entry.

**WHEN** displaying saved addresses, THE system SHALL show the phone number for customer verification.

**IF** a customer attempts to use an address with an incomplete phone number for checkout, THE system SHALL prevent order completion.

**WHEN** a customer updates their phone number, THE system SHALL preserve the old number in the address snapshot for completed orders.

**IF** a customer tries to delete an address that is referenced by an active order, THE system SHALL prevent deletion.

**WHEN** an order is viewed, THE system SHALL display the phone number that was active at the time of order placement.

### Street Address Completeness

**WHEN** a customer enters a street address, THE system SHALL require a complete street address including number and street name.

**IF** the street address field is empty or contains only whitespace, THE system SHALL reject the address submission.

**WHEN** validating a street address, THE system SHALL verify it is not blank.

**IF** a customer attempts to save an address without a street address, THE system SHALL prevent saving.

**WHEN** an order is placed, THE system SHALL snapshot the complete street address.

**IF** a customer tries to use an address with an incomplete street address for checkout, THE system SHALL block order placement.

**WHEN** a customer edits a street address, THE system SHALL validate completeness before saving.

**IF** a customer attempts to set an address as default with an incomplete street address, THE system SHALL require completion first.

**WHEN** displaying saved addresses, THE system SHALL show the street address for identification.

**IF** a customer tries to place an order with an address missing street address, THE system SHALL require the field to be filled.

**WHEN** a shipping label is prepared, THE system SHALL use the street address exactly as saved.

**IF** a customer attempts to use an address where the street address field is blank, THE system SHALL prevent order completion.

**WHEN** an address is used for delivery, THE system SHALL ensure the street address is complete and unambiguous.

**IF** a customer tries to copy or duplicate an address, THE system SHALL preserve all street address details.

**WHEN** an order is viewed, THE system SHALL display the street address that was active at order placement time.

### Postal Code Format Validation

**WHEN** a customer enters a postal code, THE system SHALL validate the format matches the selected country's postal code standard.

**IF** the postal code field is empty, THE system SHALL reject the address submission.

**WHEN** validating a postal code, THE system SHALL verify it contains only valid characters for the selected country.

**IF** a customer attempts to save an address with an invalid postal code format, THE system SHALL prevent saving.

**WHEN** a customer changes the country, THE system SHALL revalidate the postal code against the new country's format.

**IF** a customer tries to use an address with an invalid postal code for checkout, THE system SHALL block order placement.

**WHEN** an order is placed, THE system SHALL snapshot the postal code as it appeared at order creation time.

**IF** a customer attempts to set an address as default with an invalid postal code, THE system SHALL require a valid postal code first.

**WHEN** displaying saved addresses, THE system SHALL show the postal code for verification.

**IF** a customer tries to place an order with an address missing a postal code, THE system SHALL require the field to be filled.

**WHEN** a shipping label is generated, THE system SHALL use the postal code from the shipping address.

**IF** a customer attempts to use an address where the postal code does not match the country format, THE system SHALL flag the mismatch.

**WHEN** an address is used for delivery, THE system SHALL ensure the postal code is valid for the destination.

**IF** a customer tries to edit a postal code to an invalid format, THE system SHALL reject the change.

**WHEN** an order is viewed, THE system SHALL display the postal code that was active at order placement time.

### Country Selection Rules

**WHEN** a customer selects a country for an address, THE system SHALL require a valid supported shipping destination.

**IF** the country field is not selected, THE system SHALL reject the address submission.

**WHEN** validating country selection, THE system SHALL verify the country is in the list of supported shipping destinations.

**IF** a customer attempts to save an address without a country, THE system SHALL prevent saving.

**WHEN** an order is placed, THE system SHALL snapshot the country as it appeared at order creation time.

**IF** a customer tries to use an address with a country that is not supported for shipping, THE system SHALL block order placement.

**WHEN** a customer changes the country, THE system SHALL validate that the rest of the address components are still valid for the new country.

**IF** a customer attempts to set an address as default without a valid country, THE system SHALL require country selection first.

**WHEN** displaying saved addresses, THE system SHALL show the country for identification.

**IF** a customer tries to place an order with an address missing a country, THE system SHALL require country selection.

**WHEN** a shipping label is generated, THE system SHALL use the country from the shipping address.

**IF** a customer attempts to use an address where the country is set to a non-shippable destination, THE system SHALL prevent order completion.

**WHEN** an order is viewed, THE system SHALL display the country that was active at order placement time.

**IF** a customer tries to select a country that is not in the supported destinations list, THE system SHALL show an error message.

**WHEN** an address is used for delivery, THE system SHALL verify the country supports shipping operations.

### Default Address Designation

**WHEN** a customer designates an address as default, THE system SHALL ensure only one address can have default status at a time.

**IF** a customer tries to set multiple addresses as default, THE system SHALL require deselecting the current default first.

**WHEN** a customer sets an address as default, THE system SHALL automatically pre-fill this address during checkout.

**IF** a customer attempts to delete their only saved address, THE system SHALL require creating a replacement default first.

**WHEN** a customer with no default address proceeds to checkout, THE system SHALL require them to select or create a default address.

**IF** a customer tries to use an address as default that is missing required components, THE system SHALL require completing the address first.

**WHEN** displaying saved addresses, THE system SHALL clearly mark which address is set as default.

**IF** a customer attempts to set an incomplete address as default, THE system SHALL block the operation.

**WHEN** an order is placed without an explicit address selection, THE system SHALL use the default address automatically.

**IF** a customer tries to place an order without a default address set, THE system SHALL require default address configuration.

**WHEN** a customer edits the default address, THE system SHALL preserve its default status unless explicitly changed.

**IF** a customer deletes their default address, THE system SHALL require designating a new default from remaining addresses.

**WHEN** an address is set as default, THE system SHALL use it for all future orders unless the customer explicitly chooses otherwise.

**IF** a customer has multiple addresses, THE system SHALL allow only one to be marked as default at any given time.

### Multiple Address Support

**WHEN** a customer adds a new address, THE system SHALL allow multiple addresses to be stored in their profile.

**IF** a customer attempts to add more addresses than the system limit, THE system SHALL enforce the maximum address limit.

**WHEN** displaying saved addresses, THE system SHALL show all addresses with clear labels for identification.

**IF** a customer tries to use a deleted address for checkout, THE system SHALL prevent the operation.

**WHEN** a customer has multiple addresses, THE system SHALL allow selecting any saved address for checkout.

**IF** a customer attempts to edit an address, THE system SHALL preserve all other saved addresses.

**WHEN** a customer deletes an address, THE system SHALL remove it only from future use (past orders retain snapshots).

**IF** a customer tries to copy an address, THE system SHALL create a new independent address entry.

**WHEN** an order is placed, THE system SHALL allow the customer to choose from any saved address.

**IF** a customer has no saved addresses, THE system SHALL require address entry before checkout.

**WHEN** displaying the address book, THE system SHALL show all saved addresses with their full details.

**IF** a customer attempts to use the same address twice, THE system SHALL allow duplicates unless business rules prohibit it.

**WHEN** a customer updates their address book, THE system SHALL maintain history of changes through snapshots.

**IF** a customer tries to access another customer's addresses, THE system SHALL enforce data isolation.

**WHEN** an address is used for an order, THE system SHALL snapshot it at the time of purchase regardless of future modifications.

### Address Completeness Check

**WHEN** a customer submits an address, THE system SHALL validate all required components are present before saving.

**IF** any required field is missing, THE system SHALL prevent address creation or update.

**WHEN** validating an address for order placement, THE system SHALL perform a completeness check on all components.

**IF** an address is found to be incomplete during checkout, THE system SHALL block order placement.

**WHEN** a customer views their saved addresses, THE system SHALL indicate which addresses are complete and valid.

**IF** a customer tries to use an incomplete address as default, THE system SHALL require completion first.

**WHEN** an order is placed, THE system SHALL verify the shipping address is complete before payment processing.

**IF** a customer attempts to place an order with an incomplete address, THE system SHALL display which fields are missing.

**WHEN** an address is used for shipping, THE system SHALL ensure all components are present and valid.

**IF** a customer tries to save an address with any null or empty required field, THE system SHALL reject the save operation.

**WHEN** validating an existing address, THE system SHALL check all components meet minimum requirements.

**IF** a customer attempts to set an incomplete address as default, THE system SHALL prevent the designation.

**WHEN** an address is selected for checkout, THE system SHALL perform a final completeness validation.

**IF** any component fails validation, THE system SHALL indicate the specific failing component.

**WHEN** an order is viewed, THE system SHALL confirm the address was complete at time of purchase.

**IF** a customer tries to use an address that was valid when saved but is now incomplete due to a system error, THE system SHALL still allow order placement using the stored complete version.

### Delivery Validation Criteria

**WHEN** an order is being prepared for shipment, THE system SHALL verify the shipping address meets all delivery requirements.

**IF** an address component is missing that is critical for delivery, THE system SHALL prevent order confirmation.

**WHEN** a carrier is assigned to a shipment, THE system SHALL validate the address is deliverable.

**IF** an address cannot be validated as deliverable, THE system SHALL flag it for manual review.

**WHEN** a customer places an order, THE system SHALL capture a snapshot of the complete address for the order record.

**IF** a customer attempts to modify a shipping address after order placement, THE system SHALL prevent the change.

**WHEN** a shipping label is generated, THE system SHALL use the address snapshot from order placement.

**IF** an address is marked as undeliverable by the carrier, THE system SHALL allow the seller to contact the customer.

**WHEN** an order is in transit, THE system SHALL prevent any modification to the shipping address.

**IF** a customer tries to use an address that is known to be undeliverable, THE system SHALL show a warning.

**WHEN** a delivery is attempted, THE system SHALL use the address components exactly as saved at order time.

**IF** an address is found to be incomplete during delivery, THE system SHALL log the delivery exception.

**WHEN** a customer views their order history, THE system SHALL display the shipping address that was active at order time.

**IF** a customer attempts to ship to an address that is outside supported regions, THE system SHALL prevent order placement.

**WHEN** a return label is needed, THE system SHALL use the original shipping address from the order.

## Category Validation Criteria

Categories must have unique names at each hierarchy level. Category names cannot be empty or contain only whitespace. Descriptions must be provided for customer understanding. Categories can have at most one level of subcategories. Parent categories must exist before creating subcategories. Categories are created and managed by administrators only. Category names should be descriptive and customer-friendly. Subcategories cannot have their own subcategories. Categories must be assigned valid parent references when applicable. Deleted categories cause products to become uncategorized.

### Category Name Uniqueness and Naming Standards

WHEN an administrator creates a new category, THE system SHALL require a unique name at the same hierarchy level.

WHEN validating category names, THE system SHALL ensure no two categories at the same level share the same name.

WHEN a category with the same name already exists at the same level, THE system SHALL reject the creation request.

WHEN a user attempts to rename a category to match an existing category name at the same level, THE system SHALL reject the rename request.

IF a duplicate name is detected, THE system SHALL return a validation error indicating the name is not unique.

WHEN checking name uniqueness, THE system SHALL perform case-insensitive comparison.

IF a category name is empty or contains only whitespace, THE system SHALL reject the request.

WHEN validating category names, THE system SHALL allow standard alphanumeric characters, spaces, and common punctuation.

WHEN a user attempts to create a category with an empty name, THE system SHALL reject the request.

WHEN a user attempts to create a category with a name exceeding reasonable length limits, THE system SHALL truncate or reject based on system policy.

### Hierarchy Level Restrictions and Subcategory Depth Limits

WHEN creating a category, THE system SHALL allow only one level of nesting (parent category and direct subcategories).

IF a subcategory already has subcategories, THE system SHALL prevent creating subcategories of subcategories.

WHEN an administrator attempts to create a subcategory of an existing subcategory, THE system SHALL reject the request.

WHEN validating category hierarchy, THE system SHALL ensure the maximum depth is one level below the root.

WHEN a user attempts to set a parent for a category, THE system SHALL verify the parent category exists.

IF the specified parent category does not exist, THE system SHALL reject the request.

WHEN validating parent-child relationships, THE system SHALL prevent circular references (a category cannot be its own ancestor).

WHEN a category is set as a subcategory, THE system SHALL ensure it does not already have subcategories of its own.

IF a category already has subcategories, THE system SHALL prevent reassigning it to a different parent that would violate the one-level nesting rule.

### Administrator Management Requirements

WHEN an administrator attempts to create or modify a category, THE system SHALL verify the user has administrator privileges.

IF a non-administrator attempts to create a category, THE system SHALL reject the request.

WHEN a non-administrator attempts to edit a category, THE system SHALL reject the request.

WHEN a non-administrator attempts to delete a category, THE system SHALL reject the request.

WHEN an administrator attempts to manage categories, THE system SHALL verify their current authorization status.

IF an administrator's privileges are revoked, THE system SHALL prevent further category management operations.

### Description Content Requirements

WHEN creating or editing a category, THE system SHALL require a description field.

IF the description is empty or only whitespace, THE system SHALL reject the request.

WHEN validating category descriptions, THE system SHALL ensure the description is provided for customer understanding.

WHEN a category description is missing during creation, THE system SHALL reject the request.

WHEN a category description is removed during editing, THE system SHALL reject the request.

### Parent Reference Validation

WHEN a user attempts to set a parent category reference, THE system SHALL verify the parent exists in the system.

IF the parent category has been deleted, THE system SHALL reject the request to set it as parent.

WHEN validating parent references, THE system SHALL ensure no circular dependencies are created.

IF setting a parent would create a circular reference, THE system SHALL reject the request.

WHEN a category's parent is modified, THE system SHALL verify the new parent does not violate hierarchy rules.

### Category Deletion and Impact Handling

WHEN a category is deleted, THE system SHALL automatically uncategorize all products in that category.

WHEN a category is deleted, THE system SHALL remove the category from all listings.

IF a category has existing products, THE system SHALL allow deletion but set their category to uncategorized.

WHEN a deleted category is referenced, THE system SHALL handle the missing reference gracefully.

IF a product's category is deleted, THE system SHALL set the product's category reference to null or uncategorized state.

## Product Validation Criteria

Products must have names that are descriptive and unique per seller. Descriptions must be provided and contain meaningful product information. Categories must be assigned from available category lists. Base prices must be positive numeric values. Products must be owned by valid seller accounts. Products cannot be created by non-approved sellers. Product names cannot be empty or contain only whitespace. Categories must exist and be active when assigned. Products require at least one variant to be purchasable. Product edits create snapshots for historical tracking.

### Product Name Uniqueness Per Seller

WHEN a seller creates or edits a product, THE system SHALL ensure the product name is unique among all products owned by that specific seller.

IF a seller attempts to create a product with a name that already exists under their account, THE system SHALL reject the request and display a uniqueness error.

WHEN a seller attempts to rename an existing product to match another product they own, THE system SHALL reject the request.

Products with identical names are allowed only if they belong to different sellers.

### Product Description Content Requirements

WHEN a seller creates a product, THE system SHALL require a description containing meaningful product information.

IF the product description is empty or contains only whitespace, THE system SHALL reject the request.

WHEN a seller edits a product, THE system SHALL preserve the description content in a snapshot before allowing the change.

The product description must be human-readable text that describes the product features, materials, or usage.

### Category Assignment Validation

WHEN a seller creates or edits a product, THE system SHALL require assignment to an active category.

IF the assigned category has been deleted or is inactive, THE system SHALL reject the product creation or edit request.

WHEN a product is created, THE system SHALL verify that the selected category currently exists in the system.

Products must always belong to exactly one active category at all times.

### Base Price Validation

WHEN a seller creates or edits a product, THE system SHALL require a base price that is a positive number.

IF the base price is zero or negative, THE system SHALL reject the request.

The base price represents the starting reference price for the product, which individual variants may override.

WHEN a product price is modified, THE system SHALL record the previous price in a product snapshot.

### Seller Ownership and Approval Verification

WHEN a product is created, THE system SHALL associate it with the selling account that created it.

ONLY sellers with 'approved' status can create new products.

IF a seller account is 'pending', 'rejected', or 'suspended', THE system SHALL prevent new product creation.

The system SHALL track which seller owns each product and restrict product management operations to the owning seller or administrators.

WHEN a seller account is suspended, their existing products become hidden and unpurchasable.

### Product Naming Standards

WHEN a seller creates or edits a product, THE system SHALL require a non-empty product name.

IF the product name is empty or contains only whitespace, THE system SHALL reject the request.

Product names must be descriptive and distinguishable from other products by the same seller.

The system SHALL allow special characters only if they are standard alphanumeric and common punctuation marks.

### Category Existence and Hierarchy Check

WHEN a seller selects a category for a product, THE system SHALL verify the category currently exists and is active.

IF the selected category has been deleted by an administrator, THE system SHALL prevent product creation with that category.

Subcategories are allowed up to one level of nesting from the root categories.

WHEN a category is deleted by an administrator, all products in that category become uncategorized and remain viewable but may be marked as uncategorized.

### Variant Requirement for Purchase

WHEN a customer browses products, THE system SHALL show products with zero variants as 'unavailable' for purchase.

A product MUST have at least one variant to be purchasable.

IF a product has no variants, it remains visible in search results but cannot be added to cart.

WHEN the last variant of a product is deleted, THE system SHALL mark the product as unavailable for new purchases.

### Edit Snapshot Creation

WHEN a seller edits any product field (name, description, category, base price, images), THE system SHALL automatically create a product snapshot before applying changes.

Each snapshot SHALL capture the complete previous state of the product including all variant information.

Snapshots are immutable and cannot be deleted.

Administrators can view all product snapshots, while regular sellers can view only their own product snapshots.

### Product Deletion Restrictions

IF a product has any order items with 'paid' or 'shipped' status, THE system SHALL prevent product deletion.

IF there are pending cancellation or refund requests for any variant of the product, THE system SHALL prevent product deletion.

WHEN a product is successfully deleted, all its variants and inventory records are also deleted.

Deleted products no longer appear in search results or category listings.

Product snapshots are preserved even after the product is deleted.

## ProductImage Validation Criteria

Products can have multiple images for customer viewing. At least one image must be designated as the main thumbnail. Images must be uploaded in supported file formats. Display order determines which image appears first in listings. Images must be properly sized for platform display requirements. Image URLs must be valid and accessible. Sellers can reorder images to change the main thumbnail. Image changes are included in product snapshots. Products without images can still be listed but appear less attractive. Deleted images are removed from the product listing.

### Multiple Image Support and Main Image Designation

WHEN a seller uploads product images, THE system SHALL allow multiple images to be associated with a single product.

THE system SHALL require at least one image to be designated as the main thumbnail image for each product.

IF a product has only one image, THEN THE system SHALL automatically designate it as the main thumbnail.

THE system SHALL allow sellers to designate any uploaded image as the main thumbnail.

IF the main thumbnail image is deleted, THEN THE system SHALL automatically designate the next image in display order as the new main thumbnail.

IF no other images remain after deleting the main thumbnail, THEN THE system SHALL allow the product to exist without a main thumbnail.

THE system SHALL display the main thumbnail image in product listings and search results.

Products without any images SHALL be visible in search and category listings but marked as having no images.

Products with images SHALL display the main thumbnail in all listing views.

### File Format and Size Validation

WHEN a seller uploads product images, THE system SHALL validate that the image file format is supported.

THE system SHALL accept images in common web formats including JPEG, PNG, and WebP.

IF an uploaded image file is in an unsupported format, THEN THE system SHALL reject the upload.

THE system SHALL validate that image URLs are valid and accessible before accepting them.

IF an image URL is invalid or inaccessible, THEN THE system SHALL reject the image addition.

THE system SHALL ensure images meet minimum sizing requirements for platform display.

THE system SHALL ensure images do not exceed maximum file size limits for platform performance.

IF an image does not meet sizing requirements, THEN THE system SHALL reject the upload.

THE system SHALL resize or optimize images as needed to meet platform display standards.

All product images SHALL remain accessible throughout the product's lifecycle.

### Display Order and Reordering

WHEN a seller uploads multiple product images, THE system SHALL assign a display order to each image.

THE system SHALL use display order to determine the sequence in which images appear on the product detail page.

THE image with the lowest display order value SHALL be designated as the main thumbnail.

IF a seller reorders images, THEN THE system SHALL update the display order values accordingly.

THE system SHALL allow sellers to reorder images at any time.

WHEN images are reordered, THE system SHALL maintain the new order for all customer views.

IF display order values are not unique, THEN THE system SHALL automatically assign unique sequential values.

THE system SHALL display images in ascending order of their display order values.

Display order changes SHALL be reflected immediately in product listings and detail pages.

### Snapshot and Deletion Rules

WHEN a seller adds, removes, or reorders product images, THE system SHALL create a product snapshot.

Product snapshots SHALL include all image URLs and their display order at the time of the change.

IF an image is deleted from a product, THEN THE system SHALL preserve the image information in the snapshot.

Image changes SHALL be recorded in snapshots along with other product field changes.

THE system SHALL preserve image snapshots even after the product is deleted.

WHEN a product is purchased, THE system SHALL capture the current images in the order item snapshot.

Image snapshots SHALL be immutable and cannot be modified after creation.

Sellers SHALL be able to view historical image snapshots of their products.

Administrators SHALL be able to view image snapshots of any product for oversight purposes.

Deleted images SHALL be removed from the active product listing but preserved in snapshots.

## ProductVariant Validation Criteria

Variants must have unique SKU codes within a product. Option values must clearly describe variant characteristics. Variant prices can override or inherit from base product price. Stock quantities must be non-negative integers. Variants must be associated with valid parent products. SKU codes cannot be empty or duplicated within the same product. Option values should be descriptive for customer selection. Variants without stock are marked as out of stock. Variant edits create snapshots for tracking changes. Products need at least one variant to be purchasable.

### SKU Code Uniqueness and Format Validation

WHEN a seller creates a product variant, THE system SHALL require a SKU code.

WHEN a seller creates a product variant, THE system SHALL ensure the SKU code is unique within the parent product.

IF a SKU code already exists for another variant of the same product, THE system SHALL reject the variant creation request.

IF the SKU code is empty or contains only whitespace, THE system SHALL reject the variant creation request.

IF the SKU code contains special characters that are not alphanumeric, hyphens, or underscores, THE system SHALL reject the variant creation request.

WHEN a seller edits a variant's SKU code, THE system SHALL verify the new SKU code is not already used by another variant of the same product.

IF the SKU code change would create a duplicate within the product, THE system SHALL reject the edit request.

WHEN a customer searches for variants, THE system SHALL use SKU codes as unique identifiers for variant selection.

IF a variant's SKU code is modified, THE system SHALL create a variant snapshot preserving the previous SKU code.

WHEN a seller attempts to delete a variant, THE system SHALL verify no pending order items reference that SKU code.

### Option Value Description Requirements

WHEN a seller creates a product variant, THE system SHALL require option values that describe the variant characteristics.

WHEN a seller creates a product variant, THE system SHALL ensure option values are descriptive enough for customer selection.

IF option values are empty or contain only whitespace, THE system SHALL reject the variant creation request.

WHEN a seller creates a product variant with multiple option types, THE system SHALL require values for each option type (e.g., color, size).

IF option values are unclear or ambiguous, THE system SHALL allow the creation but flag for administrator review.

WHEN a customer views product variants, THE system SHALL display option values in a clear, readable format.

WHEN a seller edits variant option values, THE system SHALL create a variant snapshot preserving the previous option values.

IF option values are modified, THE system SHALL update the variant display in search results and product listings.

WHEN a seller deletes a variant, THE system SHALL ensure the variant's option values are preserved in any associated order item snapshots.

IF a variant's option values become invalid after a category change, THE system SHALL mark the variant as unavailable.

### Price Override Validation

WHEN a seller creates a product variant, THE system SHALL allow an optional price override.

IF a price override is specified, THE system SHALL ensure the price is a positive number.

IF the price override is zero or negative, THE system SHALL reject the variant creation request.

WHEN a seller creates a product variant without a price override, THE system SHALL inherit the base price from the parent product.

IF the parent product's base price is modified, THE system SHALL NOT automatically update variants with price overrides.

WHEN a seller edits a variant's price override, THE system SHALL create a variant snapshot preserving the previous price.

IF a variant's price is set significantly higher than the base price (more than 500%), THE system SHALL flag for seller confirmation.

WHEN a customer views a product with multiple variants, THE system SHALL display the price range if variants have different prices.

IF a variant has no price override, THE system SHALL display the base price for that variant.

WHEN calculating order totals, THE system SHALL use the variant's price (override or inherited) at the time of purchase.

### Stock Quantity and Availability Validation

WHEN a seller creates a product variant, THE system SHALL require a stock quantity.

IF the stock quantity is negative, THE system SHALL reject the variant creation request.

WHEN a seller sets stock quantity to zero, THE system SHALL mark the variant as out of stock.

WHEN a seller edits a variant's stock quantity, THE system SHALL ensure the new quantity is non-negative.

IF a stock adjustment would result in a negative quantity, THE system SHALL reject the adjustment request.

WHEN stock quantity reaches zero, THE system SHALL prevent the variant from being added to shopping carts.

WHEN a customer attempts to add an out-of-stock variant to their cart, THE system SHALL display an unavailable message.

WHEN inventory records are created, THE system SHALL calculate current stock by summing all quantity changes.

IF a variant's stock is insufficient for a cart quantity, THE system SHALL display a warning to the customer.

WHEN a variant is deleted, THE system SHALL ensure no pending order items reference that variant.

### Parent Product Association Validation

WHEN a seller creates a product variant, THE system SHALL require association with a valid parent product.

IF the parent product does not exist, THE system SHALL reject the variant creation request.

IF the parent product belongs to a different seller, THE system SHALL reject the variant creation request.

WHEN a seller attempts to delete a product, THE system SHALL verify no variants have pending order items.

IF a parent product is deleted, THE system SHALL also delete all associated variants and inventory records.

WHEN a product's category is changed, THE system SHALL maintain all variant associations.

IF a product is moved to a different category, THE system SHALL preserve all variant data and snapshots.

WHEN a customer views a product, THE system SHALL display all variants associated with that product.

IF a variant's parent product is suspended, THE system SHALL mark all variants as unavailable.

WHEN a seller transfers product ownership, THE system SHALL ensure all variants are transferred together.

### Purchasable Variant Requirement

WHEN a seller creates a product, THE system SHALL require at least one variant to make the product purchasable.

IF a product has no variants, THE system SHALL mark the product as unavailable in search results.

WHEN a customer attempts to purchase a product with no variants, THE system SHALL display an unavailable message.

IF the last variant of a product is deleted, THE system SHALL mark the product as unavailable.

WHEN a seller creates the first variant of a product, THE system SHALL make the product purchasable.

IF all variants of a product are out of stock, THE system SHALL mark the product as temporarily unavailable.

WHEN a customer views a product with no purchasable variants, THE system SHALL display a message indicating unavailability.

IF a product has variants but all are deleted, THE system SHALL preserve product snapshots for order history.

WHEN a seller restores a variant to a product, THE system SHALL re-evaluate product purchasability.

IF a product becomes purchasable again, THE system SHALL restore it to search results.

### Variant Snapshot Creation Rules

WHEN a seller creates a product variant, THE system SHALL create a variant snapshot upon first creation.

WHEN a seller edits any variant field, THE system SHALL create a new variant snapshot before applying changes.

IF a variant's SKU code is modified, THE system SHALL include the change in the variant snapshot.

IF a variant's option values are modified, THE system SHALL include the change in the variant snapshot.

IF a variant's price override is modified, THE system SHALL include the change in the variant snapshot.

WHEN a variant is deleted, THE system SHALL preserve all existing variant snapshots.

IF a variant snapshot is created, THE system SHALL record the timestamp of the change.

WHEN a seller views variant history, THE system SHALL display all variant snapshots in chronological order.

IF an order item references a variant, THE system SHALL preserve the variant snapshot at time of purchase.

WHEN an administrator investigates a dispute, THE system SHALL provide access to all relevant variant snapshots.

## InventoryRecord Validation Criteria

Inventory records track all stock quantity changes for variants. Quantity changes can be positive for restocking or negative for orders. Each record must include a reason for the quantity change. Records must be timestamped for audit purposes. Current stock is calculated by summing all inventory records. Records cannot be deleted or modified after creation. Negative stock levels are not permitted for variants. Order placements automatically create negative inventory records. Cancellations and refunds create positive inventory records. Sellers can view complete inventory history for their variants.

### Quantity Change Tracking Rules

THE system SHALL record every stock quantity change as a separate inventory record for each product variant.

THE system SHALL capture positive quantity changes when sellers restock variants.

THE system SHALL capture negative quantity changes when orders are placed for variants.

THE system SHALL capture negative quantity changes when inventory adjustments or losses are recorded.

THE system SHALL capture positive quantity changes when orders are cancelled.

THE system SHALL capture positive quantity changes when refunds are approved.

WHEN a variant's stock quantity changes, THE system SHALL create a new inventory record with the exact quantity change amount.

THE system SHALL associate each inventory record with the specific product variant it affects.

IF a quantity change attempt would result in negative stock, THE system SHALL reject the change.

THE system SHALL maintain a complete chronological record of all quantity changes for each variant.

WHEN multiple inventory records exist for a variant, THE system SHALL preserve all records without deletion.

### Reason Field Requirements

THE system SHALL require a reason field for every inventory record created.

THE system SHALL capture the reason as text when sellers add inventory (restocking).

THE system SHALL capture the reason as text when sellers subtract inventory (adjustments or losses).

THE system SHALL automatically record "order placement" as the reason when orders are placed.

THE system SHALL automatically record "order cancellation" as the reason when orders are cancelled.

THE system SHALL automatically record "refund approval" as the reason when refunds are approved.

WHEN an inventory record is created, THE system SHALL require the reason field to be populated.

IF the reason field is empty or missing, THE system SHALL reject the inventory record creation.

THE system SHALL preserve the exact reason text in the inventory record permanently.

WHEN sellers manually adjust inventory, THE system SHALL require them to specify a descriptive reason.

THE system SHALL allow sellers to view the reason field for all inventory records of their variants.

### Timestamp Audit Trail Requirements

THE system SHALL automatically assign a timestamp to every inventory record at creation time.

THE system SHALL capture the timestamp in the system's standard date-time format.

THE system SHALL record the exact moment when each quantity change occurs.

WHEN an inventory record is created, THE system SHALL ensure the timestamp cannot be modified.

THE system SHALL use timestamps to establish the chronological order of inventory changes.

WHEN calculating current stock, THE system SHALL process inventory records in timestamp order.

THE system SHALL preserve timestamps for audit and dispute resolution purposes.

WHEN sellers view inventory history, THE system SHALL display timestamps for each record.

THE system SHALL use timestamps to determine the sequence of stock calculations.

IF a timestamp cannot be generated, THE system SHALL reject the inventory record creation.

THE system SHALL ensure timestamps are accurate to the second or better precision.

### Stock Calculation Method

THE system SHALL calculate current stock by summing all inventory records for a variant.

THE system SHALL process inventory records in chronological timestamp order when calculating stock.

THE system SHALL add positive quantity changes to the running total.

THE system SHALL subtract negative quantity changes from the running total.

WHEN a variant has no inventory records, THE system SHALL display stock as zero.

THE system SHALL recalculate current stock whenever a new inventory record is added.

THE system SHALL use the calculated stock value for purchase availability checks.

WHEN displaying stock to customers, THE system SHALL show the current calculated total.

THE system SHALL maintain the calculated stock value in real-time as records are added.

IF the sum of inventory records results in zero, THE system SHALL mark the variant as out of stock.

THE system SHALL not allow manual override of the calculated stock value.

### Record Immutability Rules

THE system SHALL prevent deletion of any inventory record after creation.

THE system SHALL prevent modification of any inventory record after creation.

WHEN an inventory record is created, THE system SHALL make it immutable immediately.

IF a deletion request is made for an inventory record, THE system SHALL reject it.

IF a modification request is made for an inventory record, THE system SHALL reject it.

THE system SHALL preserve all inventory records permanently for audit purposes.

WHEN sellers view inventory history, THE system SHALL display all records without option to delete.

THE system SHALL ensure inventory records remain unchanged even if the variant is deleted.

WHEN disputes occur, THE system SHALL provide access to all historical inventory records.

THE system SHALL not allow administrators to modify or delete inventory records.

THE system SHALL maintain inventory record integrity across all system operations.

### Non-Negative Stock Enforcement

THE system SHALL enforce non-negative stock levels for all variants at all times.

WHEN a quantity change would result in negative stock, THE system SHALL reject the change.

THE system SHALL validate stock levels before processing any order placement.

IF an order quantity exceeds available stock, THE system SHALL reject the order.

WHEN sellers attempt to subtract inventory, THE system SHALL verify sufficient stock exists first.

THE system SHALL prevent restocking operations that would exceed system-defined maximum limits.

WHEN stock reaches zero, THE system SHALL mark the variant as out of stock.

THE system SHALL prevent customers from adding out-of-stock variants to their cart.

IF stock becomes zero due to an order, THE system SHALL immediately update the variant status.

THE system SHALL not allow inventory adjustments that would create negative stock.

WHEN displaying variants to customers, THE system SHALL hide or mark out-of-stock variants appropriately.

### Automatic Order Recording

WHEN an order is successfully placed, THE system SHALL automatically create negative inventory records.

THE system SHALL create one inventory record per variant in the order.

THE system SHALL set the quantity change to negative the order item quantity.

THE system SHALL automatically record "order placement" as the reason for the inventory record.

WHEN payment succeeds, THE system SHALL immediately deduct stock via inventory records.

IF payment fails, THE system SHALL not create inventory records for the order.

THE system SHALL create inventory records before confirming order creation to the customer.

WHEN multiple order items reference the same variant, THE system SHALL create separate inventory records for each.

THE system SHALL ensure inventory deduction occurs atomically with order creation.

IF inventory deduction fails, THE system SHALL not create the order.

### Cancellation and Refund Recording

WHEN an order item is cancelled, THE system SHALL automatically create a positive inventory record.

THE system SHALL restore the cancelled item quantity to stock via inventory record.

THE system SHALL automatically record "order cancellation" as the reason for the inventory record.

WHEN a refund is approved, THE system SHALL automatically create a positive inventory record.

THE system SHALL restore the refunded item quantity to stock via inventory record.

THE system SHALL automatically record "refund approval" as the reason for the inventory record.

WHEN cancellation is approved, THE system SHALL immediately restore stock via inventory record.

WHEN refund is approved, THE system SHALL immediately restore stock via inventory record.

THE system SHALL create inventory records for cancellations and refunds before updating order item status.

IF stock restoration fails, THE system SHALL not complete the cancellation or refund process.

### Inventory History Visibility

THE system SHALL allow sellers to view complete inventory history for their own product variants.

WHEN sellers view inventory history, THE system SHALL display all inventory records for the variant.

THE system SHALL display inventory records in chronological order (newest first or oldest first).

WHEN sellers view inventory history, THE system SHALL show quantity change, reason, and timestamp for each record.

THE system SHALL allow sellers to filter inventory history by date range.

THE system SHALL paginate inventory history when the number of records exceeds display limits.

WHEN sellers view inventory history, THE system SHALL show the current calculated stock at the top.

THE system SHALL not allow sellers to view inventory history for variants they do not own.

WHEN administrators view inventory history, THE system SHALL allow access to any variant's records.

THE system SHALL provide inventory history for dispute resolution and audit purposes.

## WishlistItem Validation Criteria

Wishlist items must reference valid products that exist on the platform. Each customer can add the same product only once to their wishlist. Wishlist items are associated with specific customer accounts. Products deleted by sellers are automatically removed from all wishlists. Wishlist items track creation timestamps for sorting. Customers can remove products from their wishlist at any time. Wishlist items reference products, not specific variants. Duplicate wishlist entries for the same product are prevented. Wishlist items are paginated for large collections. Products must be active to remain in wishlists.

### Product Existence Validation

WHEN a customer attempts to add a product to their wishlist, THE system SHALL verify that the product exists on the platform.

IF the product does not exist, THEN THE system SHALL reject the wishlist addition request.

IF the product has been deleted by the seller, THEN THE system SHALL reject the wishlist addition request.

THE system SHALL validate product existence before creating any wishlist item record.

IF the product identifier is invalid or malformed, THEN THE system SHALL reject the wishlist addition request.

### Unique Product Per Wishlist

WHEN a customer attempts to add a product to their wishlist, THE system SHALL check if that product is already in the customer's wishlist.

IF the product is already in the customer's wishlist, THEN THE system SHALL reject the duplicate addition.

THE system SHALL ensure each customer has at most one wishlist item per product.

IF a duplicate is detected, THEN THE system SHALL inform the customer that the product is already in their wishlist.

THE system SHALL maintain a unique constraint on customer-product combinations in the wishlist.

### Customer Account Association

WHEN a wishlist item is created, THE system SHALL associate it with the customer account that initiated the action.

THE system SHALL ensure that each wishlist item belongs to exactly one customer account.

WHEN a customer views their wishlist, THE system SHALL display only items associated with that customer's account.

IF a customer attempts to access another customer's wishlist, THEN THE system SHALL deny the access request.

THE system SHALL prevent wishlist items from being transferred between customer accounts.

### Automatic Deletion Handling

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customer wishlists.

IF a product is removed from the platform, THEN THE system SHALL clean up all associated wishlist items.

THE system SHALL perform automatic cleanup without requiring customer action.

WHEN wishlist cleanup occurs, THE system SHALL permanently remove the deleted product references.

IF a customer's wishlist contains only deleted products, THEN THE system SHALL display an empty wishlist.

### Creation Timestamp Tracking

WHEN a wishlist item is created, THE system SHALL record the exact creation timestamp.

THE system SHALL use creation timestamps to sort wishlist items by default.

WHEN a customer views their wishlist, THE system SHALL display items sorted by creation timestamp (newest first).

THE system SHALL preserve creation timestamps even if the product details are updated.

IF a wishlist item is modified, THE system SHALL retain the original creation timestamp.

### Product Removal Capability

WHEN a customer requests to remove a product from their wishlist, THE system SHALL delete the wishlist item.

THE system SHALL allow customers to remove products from their wishlist at any time.

IF a customer removes a product, THEN THE system SHALL permanently delete the wishlist item record.

WHEN a wishlist item is removed, THE system SHALL update the customer's wishlist immediately.

THE system SHALL not prevent customers from removing products that are still available for purchase.

### Product Level Referencing

WHEN a customer adds a product to their wishlist, THE system SHALL reference the product level, not a specific variant.

THE system SHALL store the product identifier in the wishlist item, not the variant identifier.

IF a product has multiple variants, THEN THE system SHALL allow adding the product once regardless of variant count.

THE system SHALL not require customers to select a specific variant when adding to wishlist.

WHEN displaying wishlist items, THE system SHALL show product-level information including all available variants.

### Duplicate Prevention

WHEN a customer attempts to add a product to their wishlist, THE system SHALL check for existing entries with the same product.

IF a duplicate entry is detected, THEN THE system SHALL reject the addition without creating a new record.

THE system SHALL enforce uniqueness at the customer-product level.

IF a customer tries to add the same product multiple times in quick succession, THEN THE system SHALL prevent all but the first addition.

THE system SHALL maintain data integrity by preventing duplicate wishlist items.

### Wishlist Pagination

WHEN a customer views their wishlist, THE system SHALL display items in paginated format.

THE system SHALL show a configurable number of items per page.

IF the wishlist contains more items than fit on one page, THEN THE system SHALL provide navigation to additional pages.

THE system SHALL display the current page number and total page count.

WHEN a customer navigates between pages, THE system SHALL maintain consistent sorting order.

### Active Product Requirement

WHEN a customer views their wishlist, THE system SHALL only display products that are currently active on the platform.

IF a product becomes inactive or unavailable, THEN THE system SHALL hide it from the wishlist view.

THE system SHALL automatically remove inactive products from wishlist displays.

IF a product is suspended or hidden by the seller, THEN THE system SHALL exclude it from the customer's wishlist.

WHEN a product becomes active again, THE system SHALL restore it to the customer's wishlist if it was previously added.

## CartItem Validation Criteria

Cart items must reference valid product variants. Quantities must be positive integers for each cart item. The same variant cannot appear multiple times in a cart. Quantities are combined when adding the same variant again. Cart items are associated with specific customer accounts. Variants must be in stock to be added to cart. Cart items show warnings when stock is insufficient. Deleted variants are marked as unavailable in cart. Out of stock variants cannot be checked out. Cart totals are calculated from all item subtotals.

### Variant Existence and Cart Association

WHEN a customer adds an item to cart, THE system SHALL verify the referenced product variant exists.

IF the product variant does not exist, THE system SHALL reject the cart item addition request.

THE system SHALL associate each cart item with a specific customer account.

Customers can only view their own cart items.

Customers cannot view cart items belonging to other customers.

WHEN a customer logs in, THE system SHALL display their associated cart items.

IF a customer is not logged in, THE system SHALL require authentication before cart access.

THE system SHALL maintain cart items across customer sessions.

WHEN a customer's account is deleted, THE system SHALL remove all their cart items.

### Quantity Validation Rules

WHEN a customer adds a variant to cart, THE system SHALL require a positive integer quantity.

IF the quantity is zero or negative, THE system SHALL reject the cart item addition.

IF the quantity is not a whole number, THE system SHALL reject the cart item addition.

THE system SHALL prevent the same variant from appearing as multiple line items in a cart.

WHEN a customer adds a variant that already exists in their cart, THE system SHALL combine the quantities into a single line item.

WHEN combining quantities, THE system SHALL add the new quantity to the existing quantity.

THE system SHALL display the combined quantity for variants added multiple times.

WHEN a customer updates a cart item quantity, THE system SHALL validate the new quantity is positive.

IF a customer sets quantity to zero, THE system SHALL remove the item from the cart.

### Stock Availability and Warnings

WHEN a customer adds a variant to cart, THE system SHALL check current stock availability.

IF the variant stock quantity is zero, THE system SHALL prevent adding the variant to cart.

IF the variant stock quantity is greater than zero, THE system SHALL allow adding to cart.

WHEN displaying cart items, THE system SHALL compare cart quantity against available stock.

IF the cart quantity exceeds available stock, THE system SHALL display an insufficient stock warning.

THE system SHALL allow customers to keep items in cart even with insufficient stock warnings.

WHEN stock levels change, THE system SHALL update warning status for affected cart items.

THE system SHALL show the available stock quantity alongside the warning message.

### Variant State Handling

WHEN a seller deletes a product variant, THE system SHALL mark all cart items referencing that variant as unavailable.

IF a cart item references a deleted variant, THE system SHALL prevent that item from checkout.

THE system SHALL display deleted variants as unavailable in the cart view.

WHEN a variant stock reaches zero, THE system SHALL mark cart items for that variant as unavailable.

IF a cart item is marked unavailable, THE system SHALL prevent checkout for that specific item.

Customers can proceed with checkout for available items even if some items are unavailable.

THE system SHALL allow customers to remove unavailable items from their cart.

WHEN a deleted variant is referenced in cart, THE system SHALL show the variant as no longer available.

### Cart Total Calculation

THE system SHALL calculate cart total by summing all item subtotals.

THE system SHALL calculate each item subtotal as unit price multiplied by quantity.

IF a variant has a price override, THE system SHALL use the variant price instead of base price.

IF a variant has no price override, THE system SHALL use the product base price.

THE system SHALL display individual item subtotals in the cart view.

THE system SHALL update the cart total immediately when any item quantity changes.

THE system SHALL update the cart total when items are removed from the cart.

THE system SHALL update the cart total when new items are added to the cart.

IF the cart contains no items, THE system SHALL display a zero total.

THE system SHALL recalculate cart totals if product prices change after items are added.

## Order Validation Criteria

Orders must be created by valid customer accounts. Shipping addresses must be captured at order creation time. Total prices must be calculated from all order items. Orders cannot be created with zero or negative totals. Payment must succeed before order creation is complete. Orders contain one or more order items. Order numbers must be unique across the platform. Orders track creation timestamps for history. Shipping addresses cannot be changed after order placement. Order status is derived from item statuses.

### Customer Account Validation

WHEN a customer attempts to create an order, THE system SHALL verify the customer account exists and is active.

IF the customer account does not exist, THEN THE system SHALL reject the order creation.

IF the customer account is deleted, THEN THE system SHALL reject the order creation.

IF the customer account is banned, THEN THE system SHALL reject the order creation.

THE system SHALL associate every created order with the authenticated customer account.

### Shipping Address Capture

WHEN a customer proceeds to checkout, THE system SHALL capture the complete shipping address.

THE system SHALL require all address components: recipient name, phone number, street address, city, state/province, postal code, and country.

IF any required address component is missing, THEN THE system SHALL prevent order placement.

THE system SHALL create an immutable snapshot of the shipping address at order creation time.

THE system SHALL preserve the shipping address snapshot even if the customer later modifies their address book.

### Total Price Calculation

WHEN an order is being created, THE system SHALL calculate the total price from all order items.

THE system SHALL sum the product of quantity and price for each order item.

THE system SHALL use the price captured in the product snapshot at the time of purchase.

THE system SHALL calculate the total before payment processing.

THE system SHALL display the calculated total to the customer before order confirmation.

### Positive Total Requirement

THE system SHALL require the order total to be a positive value.

IF the calculated order total is zero, THEN THE system SHALL reject the order creation.

IF the calculated order total is negative, THEN THE system SHALL reject the order creation.

THE system SHALL prevent order placement when no items are in the cart.

### Payment Success Requirement

WHEN a customer confirms order placement, THE system SHALL process payment through the external payment gateway.

IF the payment fails, THEN THE system SHALL NOT create the order.

IF the payment fails, THEN THE system SHALL allow the customer to retry payment.

IF the payment succeeds, THEN THE system SHALL create the order record.

THE system SHALL only create order items when payment is confirmed successful.

### Multiple Item Support

THE system SHALL support orders containing one or more order items.

THE system SHALL allow order items from different sellers within the same order.

THE system SHALL combine multiple quantities of the same variant into a single order item.

THE system SHALL treat each order item independently for status tracking.

THE system SHALL allow different order items to have different statuses within the same order.

### Unique Order Numbers

THE system SHALL generate a unique order number for each created order.

IF an order number already exists, THEN THE system SHALL generate a different order number.

THE system SHALL ensure order numbers are unique across the entire platform.

THE system SHALL display the order number to the customer after successful order creation.

### Creation Timestamp Tracking

THE system SHALL record the creation timestamp for every order.

THE system SHALL use the creation timestamp to sort order history.

THE system SHALL preserve the creation timestamp immutably after order creation.

THE system SHALL display the creation timestamp in order history listings.

### Address Immutability

WHEN an order is successfully created, THE system SHALL lock the shipping address.

THE system SHALL prevent any modifications to the shipping address after order placement.

IF a customer attempts to change the shipping address, THEN THE system SHALL reject the request.

THE system SHALL display the original shipping address snapshot in order details.

THE system SHALL use the captured shipping address for all shipping operations.

### Status Derivation Rules

THE system SHALL derive the overall order status from its constituent order item statuses.

IF all order items are in paid status, THEN THE system SHALL set the order status to paid.

IF any order item is in shipped status and none are delivered, THEN THE system SHALL set the order status to shipped.

IF all order items are in delivered status, THEN THE system SHALL set the order status to delivered.

IF all order items are in cancelled status, THEN THE system SHALL set the order status to cancelled.

IF all order items are in refunded status, THEN THE system SHALL set the order status to refunded.

IF order items have mixed statuses, THEN THE system SHALL set the order status to partially completed.

THE system SHALL automatically update the order status when any order item status changes.

## OrderItem Validation Criteria

Order items must reference valid products and variants. Quantities must be positive integers at order creation. Each item has its own independent status. Items can be from different sellers in the same order. Item statuses follow defined transition rules. Items must have valid status values at all times. Order items preserve product snapshots at purchase time. Items cannot be modified after order creation. Cancellation and refund apply to individual items. Item quantities determine inventory deductions.

### Product Variant Validation

WHEN an order item is created, THE system SHALL verify that the referenced product exists and is not deleted.

WHEN an order item is created, THE system SHALL verify that the referenced product variant exists and is not deleted.

WHEN an order item is created, THE system SHALL verify that the variant belongs to the referenced product.

WHEN an order item is created, THE system SHALL verify that the variant has sufficient stock quantity for the requested order quantity.

WHEN an order item is created, THE system SHALL verify that the variant is not out of stock (stock quantity greater than zero).

IF the referenced product is deleted, THEN THE system SHALL reject the order item creation.

IF the referenced variant is deleted, THEN THE system SHALL reject the order item creation.

IF the variant does not belong to the referenced product, THEN THE system SHALL reject the order item creation.

IF the variant stock is insufficient for the requested quantity, THEN THE system SHALL reject the order item creation.

IF the variant is out of stock, THEN THE system SHALL reject the order item creation.

### Positive Quantity Requirements

WHEN an order item is created, THE system SHALL require a positive integer quantity value.

WHEN an order item is created, THE system SHALL reject zero or negative quantity values.

WHEN an order item is created, THE system SHALL reject non-integer quantity values.

IF the quantity is zero, THEN THE system SHALL reject the order item creation.

IF the quantity is negative, THEN THE system SHALL reject the order item creation.

IF the quantity is a decimal or fraction, THEN THE system SHALL reject the order item creation.

WHEN a customer attempts to place an order, THE system SHALL validate that all order items have positive integer quantities.

IF any order item has an invalid quantity, THEN THE system SHALL reject the entire order creation.

### Independent Item Status

WHEN an order is created with multiple items, THE system SHALL maintain independent status for each order item.

WHEN an order item status changes, THE system SHALL not affect the status of other items in the same order.

WHEN an order item is cancelled, THE system SHALL not automatically cancel other items in the same order.

WHEN an order item is refunded, THE system SHALL not automatically refund other items in the same order.

WHEN an order item is shipped, THE system SHALL not automatically ship other items in the same order.

WHEN an order item is delivered, THE system SHALL not automatically mark other items as delivered.

WHEN calculating the overall order status, THE system SHALL derive it from the individual item statuses.

WHEN items in an order have mixed statuses, THE system SHALL reflect this in the order status as partially completed.

### Multi-Seller Order Support

WHEN an order is created, THE system SHALL allow order items from different sellers.

WHEN an order contains items from multiple sellers, THE system SHALL track each seller's items separately.

WHEN an order contains items from multiple sellers, THE system SHALL allow each seller to ship their items independently.

WHEN an order contains items from multiple sellers, THE system SHALL allow each seller to process cancellations for their own items only.

WHEN an order contains items from multiple sellers, THE system SHALL allow each seller to process refunds for their own items only.

WHEN an order contains items from multiple sellers, THE system SHALL create separate shipments for each seller's items.

WHEN an order contains items from multiple sellers, THE system SHALL not prevent order creation based on seller count.

WHEN an order contains items from multiple sellers, THE system SHALL calculate the total price as the sum of all item prices regardless of seller.

### Status Transition Rules

WHEN an order item is created, THE system SHALL set its initial status to paid.

WHEN a seller ships an order item, THE system SHALL change its status from paid to shipped.

WHEN a customer confirms delivery of a shipment, THE system SHALL change all items in that shipment from shipped to delivered.

WHEN fourteen days elapse from the shipping date without customer confirmation, THE system SHALL automatically change items from shipped to delivered.

WHEN a seller approves a cancellation request, THE system SHALL change the item status from paid to cancelled.

WHEN a seller approves a refund request, THE system SHALL change the item status from delivered to refunded.

WHEN an order item is cancelled, THE system SHALL not allow status changes other than the cancelled state.

WHEN an order item is refunded, THE system SHALL not allow status changes other than the refunded state.

WHEN an order item status changes, THE system SHALL record the timestamp of the status change.

WHEN an order item status changes, THE system SHALL preserve the previous status in the item history.

### Valid Status Enforcement

WHEN an order item is created, THE system SHALL ensure its status is one of the valid values: paid, shipped, delivered, cancelled, or refunded.

WHEN an order item status changes, THE system SHALL validate that the new status is a valid status value.

WHEN an order item status changes, THE system SHALL validate that the transition follows allowed transition rules.

IF an invalid status value is provided, THEN THE system SHALL reject the status change.

IF a status transition violates the defined rules, THEN THE system SHALL reject the status change.

WHEN an order item is in the paid status, THE system SHALL allow transitions to shipped or cancelled only.

WHEN an order item is in the shipped status, THE system SHALL allow transitions to delivered only.

WHEN an order item is in the delivered status, THE system SHALL allow transitions to refunded only.

WHEN an order item is in the cancelled status, THE system SHALL not allow any further status transitions.

WHEN an order item is in the refunded status, THE system SHALL not allow any further status transitions.

### Purchase Snapshot Preservation

WHEN an order item is created, THE system SHALL create a snapshot of the product at the time of purchase.

WHEN an order item is created, THE system SHALL create a snapshot of the variant at the time of purchase.

WHEN an order item is created, THE system SHALL create a snapshot of the seller profile at the time of purchase.

WHEN a product is modified after purchase, THE system SHALL preserve the original product snapshot with the order item.

WHEN a variant is modified after purchase, THE system SHALL preserve the original variant snapshot with the order item.

WHEN a seller profile is modified after purchase, THE system SHALL preserve the original seller profile snapshot with the order item.

WHEN an order item is viewed, THE system SHALL display product information from the purchase snapshot, not the current product data.

WHEN an order item is viewed, THE system SHALL display variant information from the purchase snapshot, not the current variant data.

WHEN an order item is viewed, THE system SHALL display seller information from the purchase snapshot, not the current seller profile.

WHEN a product is deleted by the seller, THE system SHALL preserve the product snapshot for existing order items.

### Item Immutability

WHEN an order item is created, THE system SHALL make the item immutable after creation.

WHEN an order item is created, THE system SHALL not allow modification of the product reference.

WHEN an order item is created, THE system SHALL not allow modification of the variant reference.

WHEN an order item is created, THE system SHALL not allow modification of the quantity.

WHEN an order item is created, THE system SHALL not allow modification of the price.

WHEN an order item is created, THE system SHALL not allow modification of the seller reference.

WHEN an order item is created, THE system SHALL not allow modification of the purchase snapshot data.

IF a user attempts to modify an order item field, THEN THE system SHALL reject the modification.

WHEN an order item needs correction, THE system SHALL require cancellation and reordering instead of modification.

### Individual Cancellation and Refund

WHEN a customer requests cancellation, THE system SHALL allow cancellation of individual order items only.

WHEN a customer requests cancellation, THE system SHALL not allow cancellation of entire orders directly.

WHEN a customer requests cancellation for an item, THE system SHALL require the item to be in paid status.

WHEN a customer requests cancellation for an item, THE system SHALL require a reason text.

WHEN a seller responds to a cancellation request, THE system SHALL create a snapshot of the request state.

WHEN a seller approves a cancellation request, THE system SHALL cancel only the requested item.

WHEN a seller rejects a cancellation request, THE system SHALL leave the item in its current status.

WHEN an item is cancelled, THE system SHALL not affect other items in the same order.

WHEN all items in an order are cancelled, THE system SHALL update the order status to cancelled.

WHEN an item is cancelled, THE system SHALL restore the stock quantity via an inventory record.

### Individual Refund Rules

WHEN a customer requests a refund, THE system SHALL allow refund of individual order items only.

WHEN a customer requests a refund, THE system SHALL not allow refund of entire orders directly.

WHEN a customer requests a refund for an item, THE system SHALL require the item to be in delivered status.

WHEN a customer requests a refund for an item, THE system SHALL verify the request is within seven days of delivery.

WHEN a customer requests a refund for an item, THE system SHALL require a reason text.

WHEN a seller responds to a refund request, THE system SHALL create a snapshot of the request state.

WHEN a seller approves a refund request, THE system SHALL refund only the requested item.

WHEN a seller rejects a refund request, THE system SHALL leave the item in its current status.

WHEN an item is refunded, THE system SHALL not affect other items in the same order.

WHEN all items in an order are refunded, THE system SHALL update the order status to refunded.

WHEN an item is refunded, THE system SHALL restore the stock quantity via an inventory record.

IF a refund request is submitted after seven days from delivery, THEN THE system SHALL reject the request.

### Inventory Deduction Basis

WHEN an order is placed, THE system SHALL deduct inventory for each order item based on its quantity.

WHEN an order item is created, THE system SHALL create a negative inventory record for the variant.

WHEN an order item is created, THE system SHALL use the item quantity as the basis for inventory deduction.

WHEN an order item is cancelled, THE system SHALL create a positive inventory record to restore stock.

WHEN an order item is refunded, THE system SHALL create a positive inventory record to restore stock.

WHEN calculating current stock, THE system SHALL sum all inventory records for the variant.

WHEN an order item quantity is one, THE system SHALL deduct one unit from inventory.

WHEN an order item quantity is greater than one, THE system SHALL deduct the exact quantity from inventory.

WHEN inventory is deducted, THE system SHALL record the reason as order placement.

WHEN inventory is restored, THE system SHALL record the reason as cancellation or refund.

## Shipment Validation Criteria

Shipments must be created by valid seller accounts. Tracking information must include carrier name and tracking number. Shipments can contain one or more order items from the same seller. Different sellers always create separate shipments. Items must have paid status before being shipped. All items in a shipment share the same tracking information. Delivery confirmation applies to the entire shipment. Automatic delivery occurs after fourteen days. Shipments cannot be created for already shipped items. Tracking information must be valid and traceable.

### Seller Account and Item Eligibility Validation

WHEN a seller creates a shipment, THE system SHALL verify that the seller account is in approved status.

IF the seller account is suspended, THEN THE system SHALL prevent shipment creation.

IF the seller account is pending approval, THEN THE system SHALL prevent shipment creation.

IF the seller account is rejected, THEN THE system SHALL prevent shipment creation.

WHEN a seller attempts to create a shipment, THE system SHALL verify that the seller owns all order items included in the shipment.

IF an order item belongs to a different seller, THEN THE system SHALL reject the shipment creation.

WHEN a seller creates a shipment, THE system SHALL verify that all included order items have paid status.

IF any order item has shipped status, THEN THE system SHALL prevent adding it to a new shipment.

IF any order item has delivered status, THEN THE system SHALL prevent adding it to a new shipment.

IF any order item has cancelled status, THEN THE system SHALL prevent adding it to a new shipment.

IF any order item has refunded status, THEN THE system SHALL prevent adding it to a new shipment.

### Tracking Information Requirements

WHEN a seller creates a shipment, THE system SHALL require a carrier name to be provided.

IF the carrier name is empty or missing, THEN THE system SHALL reject the shipment creation.

WHEN a seller creates a shipment, THE system SHALL require a tracking number to be provided.

IF the tracking number is empty or missing, THEN THE system SHALL reject the shipment creation.

WHEN a seller creates a shipment, THE system SHALL validate that the tracking number is in a valid format.

IF the tracking number contains invalid characters, THEN THE system SHALL reject the shipment creation.

WHEN a seller creates a shipment, THE system SHALL record the carrier name and tracking number as immutable tracking information.

WHEN tracking information is created, THE system SHALL preserve it for the lifetime of the shipment.

IF a seller attempts to modify tracking information after shipment creation, THEN THE system SHALL reject the modification.

### Item Grouping and Seller Separation Rules

WHEN a seller creates a shipment, THE system SHALL allow one or more order items to be included.

WHEN a seller creates a shipment, THE system SHALL ensure all included order items belong to the same seller.

IF order items from multiple sellers are included, THEN THE system SHALL reject the shipment creation.

WHEN a seller creates a shipment, THE system SHALL require that each seller creates separate shipments for their order items.

IF order items from different sellers are in the same order, THEN THE system SHALL require separate shipments for each seller.

WHEN a seller creates multiple shipments for the same order, THE system SHALL allow each shipment to contain a subset of their order items.

WHEN a seller bundles multiple order items into one shipment, THE system SHALL ensure all items are from the same order or different orders but from the same seller.

### Delivery Confirmation and Status Management

WHEN a shipment is created, THE system SHALL assign the same tracking information to all order items in that shipment.

WHEN tracking information is assigned to a shipment, THE system SHALL ensure all items in the shipment share identical carrier name and tracking number.

WHEN a customer views tracking information, THE system SHALL display the shipment-level tracking information for all items in that shipment.

WHEN a customer confirms delivery, THE system SHALL apply the delivery confirmation to all order items in the shipment.

IF a customer confirms delivery for a shipment, THEN THE system SHALL change the status of all items in that shipment to delivered.

WHEN a shipment is created, THE system SHALL start a fourteen-day automatic delivery timer.

IF the customer does not confirm delivery within fourteen days, THEN THE system SHALL automatically change all items in the shipment to delivered status.

WHEN the fourteen-day period expires, THE system SHALL set the delivered timestamp to the expiration date.

WHEN a shipment is created, THE system SHALL set the shipped status for all included order items.

IF an order item is in a shipment, THEN THE system SHALL prevent the item from being added to another shipment.

WHEN a shipment's delivery is confirmed, THE system SHALL prevent the shipment from being modified or cancelled.

## Review Validation Criteria

Reviews must be written by customers who purchased the product. Reviews can only be created after item delivery status. Each customer can write one review per product per order. Ratings must be between one and five stars. Text content is optional but ratings are required. Reviews are associated with specific order items. Customers can edit their own reviews with snapshots. Deleted reviews are removed from public display. Average ratings are calculated from non-deleted reviews. Reviews are sorted by newest first on product pages.

### Purchase and Delivery Verification

WHEN a customer attempts to create a review, THE system SHALL verify that the customer has purchased the product through a valid order.

WHEN a customer attempts to create a review, THE system SHALL verify that the associated order item has a status of "delivered".

IF the order item status is not "delivered", THEN THE system SHALL reject the review creation request.

IF the customer has no order containing the product, THEN THE system SHALL reject the review creation request.

IF the order item was cancelled or refunded, THEN THE system SHALL reject the review creation request.

WHEN verifying purchase eligibility, THE system SHALL check the order item's product ID against the review target product ID.

IF the order item's product ID does not match the review target product ID, THEN THE system SHALL reject the review creation request.

### Review Uniqueness and Order Item Association

WHEN a customer attempts to create a review for a product, THE system SHALL verify that the customer has not already written a review for that product within the same order.

IF the customer has already written a review for the product in the same order, THEN THE system SHALL reject the new review creation request.

WHEN a customer purchases the same product in multiple orders, THE system SHALL allow one review per order per product.

WHEN creating a review, THE system SHALL associate the review with a specific order item.

IF no valid order item is provided for the review, THEN THE system SHALL reject the review creation request.

WHEN a review is created, THE system SHALL record the order item ID as a required reference.

IF the referenced order item does not exist, THEN THE system SHALL reject the review creation request.

IF the referenced order item belongs to a different customer, THEN THE system SHALL reject the review creation request.

### Rating Range and Content Validation

WHEN a customer creates or edits a review, THE system SHALL validate that the rating value is between 1 and 5 stars (inclusive).

IF the rating value is less than 1, THEN THE system SHALL reject the review creation or edit request.

IF the rating value is greater than 5, THEN THE system SHALL reject the review creation or edit request.

IF the rating value is not a whole number, THEN THE system SHALL reject the review creation or edit request.

IF the rating field is empty or missing, THEN THE system SHALL reject the review creation or edit request.

WHEN a customer creates or edits a review, THE system SHALL allow the text content field to be empty.

IF the text content is provided, THE system SHALL accept any non-empty text value.

WHEN validating review content, THE system SHALL require at least the rating field to be present.

### Review Modification and Display Rules

WHEN a customer edits their own review, THE system SHALL create a snapshot of the previous review state before applying changes.

WHEN a customer edits their own review, THE system SHALL allow changes to both the rating and text content.

IF a customer attempts to edit another customer's review, THEN THE system SHALL reject the edit request.

WHEN a customer deletes their review, THE system SHALL remove the review from public display.

WHEN a customer deletes their review, THE system SHALL preserve the review snapshot for audit purposes.

WHEN displaying reviews on a product page, THE system SHALL exclude deleted reviews from the visible list.

WHEN displaying deleted reviews, THE system SHALL show the reviewer as "deleted user" instead of the customer's display name.

WHEN calculating a product's average rating, THE system SHALL include only non-deleted reviews in the calculation.

IF a product has no non-deleted reviews, THEN THE system SHALL display no average rating.

WHEN displaying reviews on a product detail page, THE system SHALL sort reviews by creation date in descending order (newest first).

## CancellationRequest Validation Criteria

Cancellation requests must reference valid order items. Items must have paid status to be eligible for cancellation. Requests must include a reason text from the customer. Only the seller of the item can respond to requests. Requests create snapshots when seller responds. Approved cancellations refund the specific item only. Cancelled items restore their stock quantities. Rejected requests keep items in paid status. Multiple cancellation requests for the same item are prevented. Cancellation applies to individual items, not entire orders.

### Valid Order Item Reference and Status Eligibility

WHEN a customer submits a cancellation request, THE system SHALL validate that the referenced order item exists in the system.

IF the order item does not exist, THE system SHALL reject the cancellation request.

WHEN a cancellation request references an order item, THE system SHALL verify that the item belongs to the requesting customer's order.

IF the order item does not belong to the requesting customer, THE system SHALL reject the cancellation request.

WHEN a customer attempts to cancel an order item, THE system SHALL verify that the item status is "paid".

IF the order item status is not "paid", THE system SHALL reject the cancellation request.

IF the order item status is "shipped", THE system SHALL reject the cancellation request and inform the customer that the item has already been shipped.

IF the order item status is "delivered", THE system SHALL reject the cancellation request and inform the customer that they must use the refund process instead.

### Reason Text and Seller Response Authority

WHEN a customer submits a cancellation request, THE system SHALL require a reason text from the customer.

IF the reason text is empty or missing, THE system SHALL reject the cancellation request.

THE system SHALL store the reason text provided by the customer with the cancellation request.

WHEN a seller responds to a cancellation request, THE system SHALL record the seller's decision (approved or rejected).

THE system SHALL allow only the seller who owns the order item to respond to the cancellation request.

IF a user who is not the seller attempts to respond to the cancellation request, THE system SHALL reject the response.

WHEN a seller responds to a cancellation request, THE system SHALL create a snapshot of the request state at that moment.

THE snapshot SHALL include the request reason, the seller's decision, and the timestamp of the response.

THE system SHALL preserve all cancellation snapshots immutably for dispute resolution.

### Item Level Refund and Stock Restoration

WHEN a seller approves a cancellation request, THE system SHALL change the order item status to "cancelled".

WHEN an order item is cancelled, THE system SHALL process a refund for that specific item only.

WHEN an order item is cancelled, THE system SHALL restore the stock quantity for the associated product variant.

THE system SHALL create an inventory record with a positive quantity change to reflect the stock restoration.

WHEN a seller rejects a cancellation request, THE system SHALL keep the order item status as "paid".

WHEN a seller rejects a cancellation request, THE system SHALL NOT process any refund for the item.

WHEN a seller rejects a cancellation request, THE system SHALL NOT restore any stock quantity for the item.

IF all items in an order are cancelled, THE system SHALL update the overall order status to "cancelled".

IF some items in an order are cancelled and others remain in other statuses, THE system SHALL update the overall order status to "partially completed".

### Duplicate Request Prevention and Individual Item Cancellation

WHEN a customer submits a cancellation request for an order item, THE system SHALL check if a pending cancellation request already exists for that item.

IF a pending cancellation request already exists for the order item, THE system SHALL reject the new cancellation request.

THE system SHALL allow only one pending cancellation request per order item at any time.

WHEN a seller responds to a cancellation request, THE system SHALL allow the customer to submit a new cancellation request for the same item if the item status returns to "paid".

WHEN a customer requests cancellation, THE system SHALL process the cancellation for the individual order item only.

THE system SHALL NOT cancel the entire order when a single item cancellation is requested.

THE system SHALL allow remaining items in the order to continue processing normally after an item cancellation.

WHEN a cancellation request is approved, THE system SHALL remove the item from any pending shipments.

IF an item is already included in a shipment, THE system SHALL reject the cancellation request.

## RefundRequest Validation Criteria

Refund requests must reference valid delivered order items. Items must have delivered status to be eligible for refund. Refunds can only be requested within seven days of delivery. Requests must include a reason text from the customer. Only the seller of the item can approve or reject requests. Approved refunds process for the specific item only. Refunded items restore their stock quantities. Requests create snapshots when seller responds. Multiple refund requests for the same item are prevented. Refund applies to individual items, not entire orders.

### Refund Eligibility Requirements

WHEN a customer requests a refund, THE system SHALL verify the order item has delivered status.

IF the order item status is not delivered, THEN THE system SHALL reject the refund request.

WHEN a customer requests a refund, THE system SHALL verify the request is within seven days of the item's delivery date.

IF the refund request is submitted more than seven days after delivery, THEN THE system SHALL reject the refund request.

WHEN validating the seven-day window, THE system SHALL calculate the time difference between delivery confirmation and request submission.

IF the current date exceeds the delivery date by more than seven days, THEN THE system SHALL display a time limit exceeded error.

WHEN a refund request is submitted, THE system SHALL validate that the delivery date is recorded in the order item.

IF the order item lacks a delivery date, THEN THE system SHALL reject the refund request.

### Refund Request Submission Rules

WHEN a customer submits a refund request, THE system SHALL require a reason text field.

IF the reason text is empty or missing, THEN THE system SHALL reject the refund request.

WHEN a customer submits a refund request, THE system SHALL verify no other pending refund request exists for the same order item.

IF a pending refund request already exists for the order item, THEN THE system SHALL reject the duplicate request.

WHEN a refund request is created, THE system SHALL associate it with the requesting customer's account.

IF the requesting customer is not the owner of the order, THEN THE system SHALL reject the refund request.

WHEN a refund request is submitted, THE system SHALL record the request timestamp for time window validation.

IF the request timestamp cannot be recorded, THEN THE system SHALL reject the refund request.

### Seller Response and Approval Rules

WHEN a refund request is pending, THE system SHALL allow only the seller of the order item to approve or reject it.

IF a user other than the item's seller attempts to respond, THEN THE system SHALL reject the response.

WHEN a seller responds to a refund request, THE system SHALL create a snapshot of the request state.

IF the snapshot creation fails, THEN THE system SHALL reject the seller's response.

WHEN a seller approves a refund request, THE system SHALL update the request status to approved.

WHEN a seller rejects a refund request, THE system SHALL update the request status to rejected.

WHEN a seller responds to a refund request, THE system SHALL record the response timestamp.

IF the seller is suspended, THEN THE system SHALL prevent them from responding to refund requests.

WHEN a refund request is approved or rejected, THE system SHALL notify the requesting customer.

### Refund Processing and Stock Rules

WHEN a refund request is approved, THE system SHALL process the refund for the specific order item only.

IF other items exist in the same order, THEN THE system SHALL leave them unaffected by the refund.

WHEN a refund is approved, THE system SHALL change the order item status to refunded.

WHEN a refund is approved, THE system SHALL create a positive inventory record to restore stock quantity.

IF the inventory record creation fails, THEN THE system SHALL reject the refund approval.

WHEN a refund is approved, THE system SHALL calculate the refund amount based on the item's purchase price.

IF the order item was previously cancelled, THEN THE system SHALL reject the refund request.

WHEN a refund request is rejected, THE system SHALL leave the order item status unchanged.

IF all items in an order are refunded, THEN THE system SHALL update the overall order status to refunded.

WHEN a refund is processed, THE system SHALL preserve the refund request snapshot for dispute resolution.

## SellerApprovalRequest Validation Criteria

Seller approval requests must be submitted by valid user accounts. Requests must include a reason text explaining seller intent. Status must be pending, approved, or rejected. Rejected requests include administrator-provided reasons. Rejected sellers can submit new registration requests. Only administrators can approve or reject requests. Approved sellers can create seller profiles. Pending requests are visible to administrators. Request status changes are tracked for audit purposes. Multiple pending requests from the same user are prevented.

### Account and Request Submission Rules

THE system SHALL require that only users with valid, non-banned accounts can submit seller approval requests.

IF a user account is banned, THE system SHALL reject the seller approval request submission.

IF a user account is deleted, THE system SHALL reject the seller approval request submission.

THE system SHALL require that all seller approval requests include a reason text field.

IF the reason text field is empty or contains only whitespace, THE system SHALL reject the seller approval request.

THE system SHALL prevent users from submitting multiple pending seller approval requests simultaneously.

IF a user already has a pending seller approval request, THE system SHALL reject any new seller approval request submission.

WHEN a user submits a seller approval request, THE system SHALL set the initial status to "pending".

WHEN a seller approval request is submitted, THE system SHALL record the submission timestamp.

### Status and Workflow Rules

THE system SHALL restrict seller approval request status values to only "pending", "approved", or "rejected".

IF an invalid status value is assigned to a seller approval request, THE system SHALL reject the status change.

THE system SHALL require that rejected seller approval requests include an administrator-provided rejection reason.

IF a seller approval request is rejected without a reason, THE system SHALL prevent the rejection action.

WHEN a seller approval request is rejected, THE system SHALL preserve the rejection reason in the request record.

THE system SHALL allow sellers with rejected approval requests to submit new registration requests.

WHEN a seller submits a new approval request after rejection, THE system SHALL create a separate request record with a new submission timestamp.

THE system SHALL maintain a complete audit trail of all status changes for each seller approval request.

WHEN a seller approval request status changes, THE system SHALL record the change timestamp and the administrator who made the change.

THE system SHALL preserve all historical status changes and cannot delete them.

### Administrator Authority and Processing Rules

THE system SHALL restrict seller approval request approval authority to administrators only.

IF a non-administrator attempts to approve or reject a seller approval request, THE system SHALL reject the action.

THE system SHALL allow approved sellers to create seller profiles immediately after approval.

WHEN a seller approval request is approved, THE system SHALL enable the user to access seller profile creation functionality.

THE system SHALL make all pending seller approval requests visible to administrators.

THE system SHALL allow administrators to filter and view pending seller approval requests.

THE system SHALL display the submission reason and timestamp for each pending seller approval request to administrators.

IF a seller approval request is approved, THE system SHALL update the user's access permissions to include seller capabilities.

THE system SHALL prevent users with pending seller approval requests from accessing seller-specific features.

## AdminPromotionRequest Validation Criteria

Promotion requests must be submitted by valid user accounts. Requests must include a reason text for promotion. Status must be pending, approved, or rejected. Only super administrators can approve or reject requests. Approved users become regular administrators. Super administrators can promote regular to super administrator. Demotion of super administrators requires super approval. Self-demotion by super administrators is not allowed. Request status changes are tracked for audit purposes. Multiple pending requests from the same user are prevented.

### Admin Promotion Request Validation

**Valid User Account Requirement**

WHEN a user submits an administrator promotion request, THE system SHALL verify the user account exists and is in good standing.

IF the user account does not exist, THE system SHALL reject the promotion request.

IF the user account is banned or suspended, THE system SHALL reject the promotion request.

**Promotion Reason Requirement**

WHEN submitting an administrator promotion request, THE system SHALL require a text reason for the promotion.

IF the reason text is empty or missing, THE system SHALL reject the promotion request.

**Status Value Validation**

WHEN a promotion request is created, THE system SHALL set the initial status to "pending".

IF the status is not one of "pending", "approved", or "rejected", THE system SHALL reject the request.

**Super Administrator Authority**

WHEN a promotion request is pending, THE system SHALL allow only super administrators to approve or reject it.

IF a regular administrator attempts to approve or reject a promotion request, THE system SHALL deny the action.

**Regular Administrator Creation**

WHEN a super administrator approves a promotion request, THE system SHALL create or update an AdministratorProfile with grade "regular" for the user.

IF the user already has an AdministratorProfile with grade "regular", THE system SHALL update the status to active.

**Grade Promotion Rules**

WHEN a super administrator promotes a regular administrator to super administrator, THE system SHALL update the AdministratorProfile grade to "super".

IF the administrator to be promoted is already a super administrator, THE system SHALL allow the operation (no-op).

**Demotion Approval Requirements**

WHEN a super administrator demotes another super administrator to regular administrator, THE system SHALL require explicit super administrator approval.

IF the demotion is approved, THE system SHALL update the AdministratorProfile grade from "super" to "regular".

**Self-Demotion Restriction**

IF a super administrator attempts to demote themselves, THE system SHALL reject the self-demotion request.

**Status Change Audit**

WHEN a promotion request status changes (from pending to approved or rejected), THE system SHALL create a timestamped audit record.

WHEN an AdministratorProfile grade changes, THE system SHALL preserve the previous grade in an immutable audit log.

**Duplicate Pending Prevention**

WHEN a user already has a promotion request with status "pending", THE system SHALL prevent submission of a new promotion request.

IF a new promotion request is submitted while one is pending, THE system SHALL reject the duplicate request.

**Status Transition Rules**

WHEN a promotion request moves from "pending" to "approved", THE system SHALL automatically assign the user AdministratorProfile with grade "regular".

WHEN a promotion request moves from "pending" to "rejected", THE system SHALL preserve the rejection reason in an immutable audit log.

**Rejection Handling**

WHEN a promotion request is rejected, THE system SHALL require and preserve the rejection reason.

IF a promotion request is rejected, THE user SHALL be allowed to submit a new promotion request.

**Multiple Request Prevention**

WHEN a user already has an active promotion request (pending, approved, or rejected within retention period), THE system SHALL prevent submission of a duplicate request.

**Approval Authority Verification**

WHEN a super administrator approves a promotion request, THE system SHALL verify the super administrator does not have conflicts of interest (e.g., promoting self).

**Request Lifecycle**

WHEN a promotion request is rejected, THE system SHALL allow the same user to submit a new request with an updated reason.

IF a user's promotion request is approved, THE system SHALL mark the request as completed and prevent further modifications.

### Additional Validation Rules

**Data Isolation and Access Control**

WHEN a user submits a promotion request, THE system SHALL isolate the request to that specific user account.

IF a regular administrator attempts to view another user's promotion request, THE system SHALL restrict access.

**Audit Trail Requirements**

WHEN a promotion request status changes, THE system SHALL create an immutable audit entry with timestamp and previous/next state.

**Error Handling**

IF a promotion request cannot be processed due to system error, THE system SHALL preserve the request in its current state and log the error.

**Data Retention**

WHEN a promotion request is rejected and a new one is submitted, THE system SHALL retain the history of all previous requests for audit purposes.

## ProductSnapshot Validation Criteria

Product snapshots must be created on every product edit. Snapshots capture all product fields including name and description. Snapshots include all variants at the time of change. Snapshots are immutable and cannot be modified after creation. Each snapshot records the creation timestamp. Snapshots preserve the complete product state at a point in time. Snapshots are linked to their parent products. Deleted products retain their snapshots for history. Administrators can view snapshots of any product. Sellers can view snapshots of their own products.

### Automatic Snapshot Creation

WHEN a seller edits a product, THE system SHALL automatically create a product snapshot without requiring manual action.

WHEN a seller adds or removes product images, THE system SHALL automatically create a product snapshot.

WHEN a seller edits a product variant, THE system SHALL automatically create a product snapshot that includes variant snapshots.

WHEN a seller deletes a product variant, THE system SHALL automatically create a product snapshot before deletion.

IF a product edit operation fails after snapshot creation, THE system SHALL preserve the snapshot for audit purposes.

IF multiple edits occur in rapid succession, THE system SHALL create a separate snapshot for each edit operation.

THE system SHALL create snapshots synchronously as part of the edit transaction, not asynchronously.

THE system SHALL prevent product edits from completing if snapshot creation fails.

### Complete Field Capture

THE system SHALL capture the product name in every product snapshot.

THE system SHALL capture the product description in every product snapshot.

THE system SHALL capture the category assignment in every product snapshot.

THE system SHALL capture the base price in every product snapshot.

THE system SHALL capture all product images and their display order in every product snapshot.

THE system SHALL capture the seller identification in every product snapshot.

THE system SHALL capture the product creation timestamp in every product snapshot.

THE system SHALL capture all editable product fields, not only changed fields.

IF a product field is empty or null, THE system SHALL record the null value in the snapshot.

THE system SHALL capture field values exactly as they appear at the moment of snapshot creation, not after any transformation.

### Variant Snapshot Inclusion

WHEN a product snapshot is created, THE system SHALL create variant snapshots for all existing variants of that product.

THE system SHALL capture the SKU code in every variant snapshot.

THE system SHALL capture the option values in every variant snapshot.

THE system SHALL capture the price override (if any) in every variant snapshot.

THE system SHALL capture the stock quantity in every variant snapshot.

IF a variant is added to a product during an edit, THE system SHALL include that variant in the snapshot.

IF a variant is deleted from a product during an edit, THE system SHALL include that variant in the snapshot before deletion.

THE system SHALL maintain the relationship between product snapshots and their variant snapshots.

THE system SHALL preserve variant snapshots even if the variant is later deleted from the product.

IF a product has no variants at the time of edit, THE system SHALL create an empty variant snapshot list in the product snapshot.

### Snapshot Immutability

THE system SHALL prevent any modification to a snapshot after creation.

THE system SHALL prevent deletion of any snapshot by any actor.

IF an actor attempts to modify a snapshot, THE system SHALL reject the request.

IF an actor attempts to delete a snapshot, THE system SHALL reject the request.

THE system SHALL preserve the original snapshot data exactly as created, including all field values.

THE system SHALL not allow updates to snapshot metadata (timestamps, relationships).

THE system SHALL treat all snapshot fields as read-only after creation.

IF a data integrity issue is discovered in a snapshot, THE system SHALL create a new corrective record rather than modifying the existing snapshot.

THE system SHALL maintain snapshot integrity across system upgrades and migrations.

### Timestamp Recording

THE system SHALL record the exact timestamp when each snapshot is created.

THE system SHALL record timestamps in UTC timezone.

THE system SHALL include date and time with precision to at least the second.

THE system SHALL prevent modification of the creation timestamp after snapshot creation.

THE system SHALL ensure timestamp accuracy within the system's clock precision.

IF system time changes, THE system SHALL use the time at the moment of snapshot creation, not the current time.

THE system SHALL record timestamps consistently across all snapshot types (product, variant, seller profile, review, cancellation, refund).

THE system SHALL make timestamps available for sorting and filtering in snapshot views.

### Complete State Preservation

THE system SHALL preserve the complete product state at the moment of each edit.

THE system SHALL capture both changed and unchanged fields in snapshots.

THE system SHALL preserve the state of all related entities (variants, images) at the time of snapshot.

THE system SHALL maintain data relationships in snapshots (product to variants, variants to product).

IF a product reference is updated (e.g., category change), THE system SHALL capture the new reference value in the snapshot.

THE system SHALL preserve the logical state of the product, not just individual field values.

THE system SHALL ensure snapshots can be used to reconstruct the exact product state at any point in time.

THE system SHALL preserve snapshot data even if referenced entities (categories, sellers) are later modified or deleted.

### Product Linkage

THE system SHALL link each product snapshot to its parent product.

THE system SHALL maintain the product-snapshot relationship even after product deletion.

THE system SHALL allow retrieval of all snapshots for a given product.

THE system SHALL preserve the linkage between product snapshots and their variant snapshots.

THE system SHALL enable navigation from a product to its complete snapshot history.

IF a product is deleted, THE system SHALL maintain snapshot linkage for historical access.

THE system SHALL prevent orphaned snapshots (snapshots without parent product references).

THE system SHALL ensure snapshot linkage is maintained across system operations and migrations.

### Deletion Retention Rules

THE system SHALL retain product snapshots even after the parent product is deleted.

THE system SHALL retain variant snapshots even after the variant is deleted.

THE system SHALL retain snapshots indefinitely without automatic expiration.

IF a seller deletes their account, THE system SHALL preserve all product snapshots for their products.

IF a product is deleted due to policy violation, THE system SHALL preserve all snapshots for that product.

THE system SHALL not automatically delete snapshots based on age or storage constraints.

THE system SHALL ensure deleted products remain accessible through their snapshot history.

THE system SHALL maintain snapshot data integrity regardless of parent entity lifecycle status.

### Administrator Visibility

THE system SHALL allow administrators to view snapshots of any product on the platform.

THE system SHALL allow administrators to view snapshots regardless of product ownership.

THE system SHALL allow administrators to view snapshots of deleted products.

THE system SHALL allow administrators to compare multiple snapshots of the same product.

THE system SHALL allow administrators to view the complete snapshot history of any product.

THE system SHALL allow administrators to view variant snapshots within product snapshots.

THE system SHALL provide administrators with access to all snapshot metadata (timestamps, relationships).

IF an administrator requests snapshot access, THE system SHALL grant access without requiring additional approval.

THE system SHALL allow administrators to export snapshot data for audit purposes.

### Seller Visibility Scope

THE system SHALL allow sellers to view snapshots of their own products only.

THE system SHALL prevent sellers from viewing snapshots of products owned by other sellers.

THE system SHALL allow sellers to view snapshots of their deleted products.

THE system SHALL allow sellers to compare multiple snapshots of their own products.

THE system SHALL allow sellers to view the complete snapshot history of their products.

IF a seller requests access to another seller's product snapshots, THE system SHALL deny the request.

THE system SHALL restrict seller snapshot access based on product ownership.

THE system SHALL allow sellers to view variant snapshots within their own product snapshots.

IF a seller's account is suspended, THE system SHALL maintain their ability to view their product snapshots.

## VariantSnapshot Validation Criteria

Variant snapshots must be created when parent products are edited. Snapshots capture SKU code and option values. Snapshots include variant pricing information. Snapshots are immutable after creation. Each variant snapshot links to its product snapshot. Snapshots preserve variant state at the time of change. Deleted variants retain their snapshots for history. Variant snapshots are part of the product snapshot structure. Administrators can view all variant snapshots. Sellers can view snapshots of their own variants.

### Automatic Snapshot Creation Rules

WHEN a product variant is edited, THE system SHALL automatically create a variant snapshot.

WHEN a product is edited, THE system SHALL automatically create variant snapshots for all variants of that product.

THE system SHALL create variant snapshots before applying any variant changes.

THE system SHALL NOT create variant snapshots for inventory adjustments.

THE system SHALL NOT create variant snapshots for stock quantity changes.

IF a variant edit fails, THE system SHALL NOT create a variant snapshot.

IF a product edit fails, THE system SHALL NOT create variant snapshots for that product.

### Data Capture Requirements

THE system SHALL capture SKU code in every variant snapshot.

THE system SHALL capture option values in every variant snapshot.

THE system SHALL capture price override information when present in variant snapshots.

THE system SHALL capture stock quantity in every variant snapshot.

THE system SHALL capture the timestamp when the snapshot was created.

THE system SHALL preserve the exact SKU code value from the variant at the time of snapshot.

THE system SHALL preserve the exact option values from the variant at the time of snapshot.

THE system SHALL preserve the exact price override value from the variant at the time of snapshot.

### Snapshot Immutability Rules

THE system SHALL NOT allow modification of any data in a variant snapshot after creation.

THE system SHALL NOT allow deletion of variant snapshots.

THE system SHALL preserve variant snapshots indefinitely.

WHEN a variant is deleted, THE system SHALL preserve all variant snapshots for that variant.

WHEN a product is deleted, THE system SHALL preserve all variant snapshots for variants of that product.

THE system SHALL maintain snapshot data integrity across system updates.

THE system SHALL ensure snapshot timestamps cannot be altered.

### Product Snapshot Structure Rules

THE system SHALL link each variant snapshot to its parent product snapshot.

THE system SHALL maintain the relationship between variant snapshots and their product snapshot.

THE system SHALL include variant snapshots as part of the product snapshot structure.

WHEN viewing a product snapshot, THE system SHALL display all associated variant snapshots.

THE system SHALL preserve the hierarchical relationship between product and variant snapshots.

THE system SHALL ensure variant snapshots cannot exist without a parent product snapshot.

### Visibility and Access Rules

THE system SHALL allow sellers to view variant snapshots of their own products.

THE system SHALL allow administrators to view all variant snapshots.

THE system SHALL NOT allow customers to view variant snapshots.

THE system SHALL NOT allow sellers to view variant snapshots of other sellers' products.

WHEN a seller views variant snapshots, THE system SHALL display the complete snapshot history.

WHEN an administrator views variant snapshots, THE system SHALL display all snapshots regardless of seller ownership.

THE system SHALL preserve variant snapshots for dispute resolution purposes.

## SellerProfileSnapshot Validation Criteria

Seller profile snapshots must be created on every profile edit. Snapshots capture shop name and description changes. Snapshots include logo image information. Snapshots are immutable after creation. Each snapshot records the creation timestamp. Snapshots preserve profile state at time of change. Order items reference seller profile snapshots at purchase time. Deleted sellers retain their profile snapshots. Administrators can view all seller profile snapshots. Snapshots enable dispute resolution and history tracking.

### Automatic Snapshot Creation Rules

WHEN a seller edits their profile, THE system SHALL automatically create a seller profile snapshot before the changes are applied.

THE system SHALL create a snapshot when the shop name is modified.

THE system SHALL create a snapshot when the shop description is modified.

THE system SHALL create a snapshot when the logo image is changed.

THE system SHALL create a snapshot for each individual profile edit operation.

IF a profile edit fails validation, THE system SHALL NOT create a snapshot.

THE system SHALL create snapshots without requiring explicit user action or confirmation.

WHEN multiple profile fields are edited in a single operation, THE system SHALL create a single snapshot capturing all changes.

### Profile Data Capture Requirements

THE system SHALL capture the previous shop name value in the snapshot.

THE system SHALL capture the new shop name value in the snapshot.

THE system SHALL capture the previous shop description value in the snapshot.

THE system SHALL capture the new shop description value in the snapshot.

THE system SHALL capture the previous logo image reference in the snapshot.

THE system SHALL capture the new logo image reference in the snapshot.

THE system SHALL record which profile fields were modified in the snapshot.

THE system SHALL preserve the complete profile state at the time of the snapshot.

### Snapshot Integrity Rules

THE system SHALL prevent modification of seller profile snapshots after creation.

THE system SHALL prevent deletion of seller profile snapshots by any user.

THE system SHALL prevent deletion of seller profile snapshots by administrators.

THE system SHALL record the exact timestamp when each snapshot is created.

THE system SHALL preserve the snapshot creation timestamp without modification.

THE system SHALL maintain snapshot data integrity over time.

THE system SHALL ensure snapshots remain accessible for the lifetime of the platform.

WHEN a snapshot is accessed, THE system SHALL return the data exactly as it was captured.

### Purchase Time Association Rules

WHEN a customer purchases a product, THE system SHALL create a seller profile snapshot at the time of purchase.

THE system SHALL associate the seller profile snapshot with each order item.

THE system SHALL preserve the seller's shop name as it appeared at purchase time.

THE system SHALL preserve the seller's logo image as it appeared at purchase time.

THE system SHALL preserve the seller's shop description as it appeared at purchase time.

THE system SHALL link the purchase-time snapshot to the order item permanently.

WHEN an order item is viewed, THE system SHALL display the seller profile information from the purchase-time snapshot.

IF the seller later modifies their profile, THE system SHALL NOT update historical order item snapshots.

### Deletion and Retention Rules

WHEN a seller deletes their account, THE system SHALL preserve all existing seller profile snapshots.

THE system SHALL retain seller profile snapshots even after the seller account is deleted.

THE system SHALL maintain snapshots for all historical order items referencing the deleted seller.

THE system SHALL preserve the shop name in snapshots for deleted sellers.

THE system SHALL preserve the logo image references in snapshots for deleted sellers.

THE system SHALL ensure deleted seller snapshots remain accessible for order history viewing.

WHEN viewing an order from a deleted seller, THE system SHALL display the preserved shop name from the snapshot.

THE system SHALL retain snapshots indefinitely regardless of seller account status.

### Dispute Resolution Support Rules

THE system SHALL make seller profile snapshots available for dispute resolution.

THE system SHALL allow sellers to view their own profile snapshots.

THE system SHALL allow administrators to view all seller profile snapshots.

THE system SHALL enable comparison of profile state before and after changes.

WHEN a dispute involves seller profile information, THE system SHALL provide relevant snapshots as evidence.

THE system SHALL preserve the chronological history of all profile changes through snapshots.

THE system SHALL enable tracking of when specific profile information was modified.

WHEN investigating seller conduct, THE system SHALL provide access to historical profile states.

## ReviewSnapshot Validation Criteria

Review snapshots must be created on every review edit. Snapshots capture rating and text content changes. Snapshots are immutable after creation. Each snapshot records the creation timestamp. Snapshots preserve review state at time of change. Deleted reviews retain their snapshots for history. Snapshots enable tracking of review modifications. Administrators can view all review snapshots. Customers can view snapshots of their own reviews. Snapshots support dispute resolution for review disputes.

### Automatic Snapshot Creation

WHEN a customer edits a review, THE system SHALL automatically create a ReviewSnapshot.

THE system SHALL create a snapshot before applying the review edit.

THE system SHALL create a snapshot for every review modification, including rating changes and text content changes.

IF a review is edited multiple times, THE system SHALL create a separate snapshot for each edit.

THE system SHALL create snapshots without requiring explicit user action.

THE system SHALL not create a snapshot if the review content remains unchanged after edit.

### Rating and Content Preservation

THE system SHALL preserve the review rating value in each ReviewSnapshot.

THE system SHALL preserve the review text content in each ReviewSnapshot.

THE system SHALL capture the complete review state at the time of change.

THE system SHALL preserve both the previous state and new state of the review.

IF a review has no text content, THE system SHALL preserve the null or empty state in the snapshot.

THE system SHALL not modify the preserved rating or text content in any snapshot.

### Snapshot Immutability

THE system SHALL prevent any modification to ReviewSnapshot data after creation.

THE system SHALL prevent deletion of ReviewSnapshot records.

THE system SHALL prevent updates to snapshot data fields.

THE system SHALL maintain snapshot integrity over time.

WHEN viewing a snapshot, THE system SHALL display the original captured data without alterations.

IF a review is deleted, THE system SHALL retain all associated snapshots unchanged.

### Timestamp Recording

THE system SHALL record the creation timestamp for each ReviewSnapshot.

THE system SHALL capture the exact date and time when the snapshot was created.

THE system SHALL use consistent timestamp format across all snapshots.

THE system SHALL not modify the creation timestamp after snapshot creation.

WHEN displaying snapshots, THE system SHALL show the creation timestamp to users.

### State Preservation

THE system SHALL preserve the complete review state at the moment of change.

THE system SHALL capture all review attributes in each snapshot.

THE system SHALL maintain the relationship between snapshots and their original reviews.

THE system SHALL preserve the order of snapshots chronologically.

WHEN a review is modified, THE system SHALL capture the state before the modification.

THE system SHALL enable reconstruction of review history from snapshots.

### Deletion and History Retention

WHEN a customer deletes a review, THE system SHALL retain all associated ReviewSnapshots.

THE system SHALL not delete snapshots when the original review is deleted.

THE system SHALL maintain snapshot history even after review deletion.

THE system SHALL preserve snapshots for audit and compliance purposes.

IF a review is deleted and later the customer requests review history, THE system SHALL provide access to retained snapshots.

### Modification Tracking

THE system SHALL enable tracking of all review modifications through snapshots.

THE system SHALL maintain a chronological record of review changes.

THE system SHALL allow comparison between different snapshot versions.

THE system SHALL record what changed between snapshots (rating, text content, or both).

WHEN viewing review history, THE system SHALL display the sequence of modifications.

THE system SHALL enable identification of who made each modification.

### Administrator Visibility

WHEN an administrator views review snapshots, THE system SHALL display all ReviewSnapshots on the platform.

THE system SHALL allow administrators to view snapshots of any review.

THE system SHALL provide filtering capabilities for administrators to search snapshots.

THE system SHALL display snapshot details including rating, text content, and timestamps.

IF a review is deleted, THE system SHALL still allow administrators to view its snapshots.

THE system SHALL not restrict administrator access to any review snapshot.

### Customer Snapshot Access

WHEN a customer views review snapshots, THE system SHALL display only snapshots of their own reviews.

THE system SHALL prevent customers from viewing snapshots of other customers' reviews.

THE system SHALL allow customers to review their own review modification history.

WHEN displaying snapshots to customers, THE system SHALL show the creation timestamp and changes made.

IF a customer requests their review history, THE system SHALL provide access to all their review snapshots.

THE system SHALL isolate customer snapshot access by customer account.

### Dispute Resolution Support

THE system SHALL support dispute resolution using ReviewSnapshots.

WHEN a dispute arises about review content, THE system SHALL provide access to relevant snapshots.

THE system SHALL enable verification of review modifications through snapshots.

THE system SHALL maintain snapshots as evidence for dispute investigation.

IF a customer disputes a review change, THE system SHALL provide the snapshot showing the original content.

THE system SHALL allow administrators to use snapshots for resolving review-related disputes.

THE system SHALL preserve snapshots long enough to support dispute resolution processes.

## CancellationSnapshot Validation Criteria

Cancellation snapshots must be created when sellers respond to requests. Snapshots capture the request state at response time. Snapshots include reason and status information. Snapshots are immutable after creation. Each snapshot records the creation timestamp. Snapshots preserve the cancellation request state. Snapshots enable tracking of cancellation decisions. Administrators can view all cancellation snapshots. Snapshots support dispute resolution for cancellations. Both approved and rejected requests create snapshots.

### Snapshot Creation Timing Validation

WHEN a seller responds to a cancellation request, THE system SHALL create a CancellationSnapshot immediately.

IF a seller approves a cancellation request, THE system SHALL create a CancellationSnapshot.

IF a seller rejects a cancellation request, THE system SHALL create a CancellationSnapshot.

THE system SHALL create a CancellationSnapshot before updating the cancellation request status.

IF the cancellation request status changes from pending to approved, THE system SHALL create a CancellationSnapshot.

IF the cancellation request status changes from pending to rejected, THE system SHALL create a CancellationSnapshot.

THE system SHALL not create a CancellationSnapshot when the cancellation request is first submitted by the customer.

THE system SHALL create exactly one CancellationSnapshot per seller response.

### Request State Data Validation

WHEN a CancellationSnapshot is created, THE system SHALL capture the complete cancellation request state.

THE system SHALL capture the order item reference in the CancellationSnapshot.

THE system SHALL capture the customer identifier in the CancellationSnapshot.

THE system SHALL capture the cancellation request reason in the CancellationSnapshot.

THE system SHALL capture the cancellation request status in the CancellationSnapshot.

THE system SHALL capture the requested timestamp in the CancellationSnapshot.

THE system SHALL capture the seller identifier who responded in the CancellationSnapshot.

IF any required field is missing from the cancellation request, THE system SHALL not create a valid CancellationSnapshot.

### Reason and Status Field Validation

THE system SHALL preserve the cancellation reason text in the CancellationSnapshot.

THE system SHALL preserve the cancellation request status in the CancellationSnapshot.

THE system SHALL preserve the original reason text without modification in the CancellationSnapshot.

THE system SHALL preserve the final status (approved or rejected) in the CancellationSnapshot.

IF the cancellation reason is empty, THE system SHALL preserve an empty value in the CancellationSnapshot.

THE system SHALL not modify the reason text after snapshot creation.

THE system SHALL not modify the status value after snapshot creation.

THE system SHALL ensure the status value is either approved or rejected in the CancellationSnapshot.

### Snapshot Immutability Validation

WHEN a CancellationSnapshot is created, THE system SHALL mark it as immutable.

THE system SHALL not allow any modifications to a CancellationSnapshot after creation.

THE system SHALL not allow deletion of a CancellationSnapshot.

IF an attempt is made to modify a CancellationSnapshot, THE system SHALL reject the modification.

IF an attempt is made to delete a CancellationSnapshot, THE system SHALL reject the deletion.

THE system SHALL preserve all CancellationSnapshots indefinitely.

THE system SHALL not merge or consolidate multiple CancellationSnapshots.

THE system SHALL maintain the original CancellationSnapshot data without any alterations.

### Timestamp Accuracy Validation

WHEN a CancellationSnapshot is created, THE system SHALL record the creation timestamp.

THE system SHALL record the exact time when the snapshot was created.

THE system SHALL use the system clock time for the CancellationSnapshot timestamp.

THE system SHALL record the timestamp in a consistent format.

IF the system clock is unavailable, THE system SHALL not create a CancellationSnapshot.

THE system SHALL not allow modification of the CancellationSnapshot timestamp after creation.

THE system SHALL ensure the timestamp is accurate to at least the second.

THE system SHALL record the timestamp before marking the snapshot as immutable.

### Decision State Validation

THE system SHALL preserve the seller's decision (approved or rejected) in the CancellationSnapshot.

THE system SHALL record which seller made the decision in the CancellationSnapshot.

THE system SHALL preserve the decision timestamp in the CancellationSnapshot.

IF a seller approves the cancellation, THE system SHALL record approved status in the CancellationSnapshot.

IF a seller rejects the cancellation, THE system SHALL record rejected status in the CancellationSnapshot.

THE system SHALL not allow the decision status to change after snapshot creation.

THE system SHALL ensure the decision is made by the product's seller.

THE system SHALL preserve the decision context including the order item reference.

### Cancellation Tracking Validation

THE system SHALL enable tracking of all cancellation decisions through CancellationSnapshots.

THE system SHALL maintain a complete history of all cancellation responses.

THE system SHALL link each CancellationSnapshot to its corresponding cancellation request.

THE system SHALL enable chronological ordering of CancellationSnapshots.

THE system SHALL preserve the sequence of cancellation decisions.

THE system SHALL enable retrieval of all CancellationSnapshots for a specific order item.

THE system SHALL enable retrieval of all CancellationSnapshots for a specific seller.

THE system SHALL maintain CancellationSnapshot references even if the cancellation request is deleted.

### Administrator Access Validation

WHEN an administrator requests to view CancellationSnapshots, THE system SHALL provide access to all snapshots.

THE system SHALL allow administrators to view CancellationSnapshots for any order item.

THE system SHALL allow administrators to view CancellationSnapshots for any seller.

THE system SHALL not restrict administrator access to CancellationSnapshots based on seller approval status.

THE system SHALL display the complete CancellationSnapshot data to administrators.

THE system SHALL allow administrators to filter CancellationSnapshots by status.

THE system SHALL allow administrators to filter CancellationSnapshots by date range.

THE system SHALL allow administrators to view CancellationSnapshots for suspended sellers.

### Dispute Resolution Data Validation

THE system SHALL preserve CancellationSnapshot data to support dispute resolution.

THE system SHALL enable comparison of cancellation request state before and after seller response.

THE system SHALL preserve the original customer reason for dispute reference.

THE system SHALL preserve the seller's decision for dispute reference.

THE system SHALL enable verification of the decision timestamp for dispute resolution.

THE system SHALL maintain CancellationSnapshots even after order completion.

THE system SHALL maintain CancellationSnapshots even after account deletion.

THE system SHALL ensure CancellationSnapshot data is available for legal or compliance purposes.

### Response Type Coverage Validation

THE system SHALL create a CancellationSnapshot when the seller approves the cancellation request.

THE system SHALL create a CancellationSnapshot when the seller rejects the cancellation request.

THE system SHALL not create a CancellationSnapshot for pending status.

IF the seller response is approved, THE system SHALL record approved in the CancellationSnapshot.

IF the seller response is rejected, THE system SHALL record rejected in the CancellationSnapshot.

THE system SHALL treat approved and rejected responses equally for snapshot creation.

THE system SHALL not differentiate snapshot creation based on the response type.

THE system SHALL ensure both response types generate identical snapshot structure.

## RefundSnapshot Validation Criteria

Refund snapshots must be created when sellers respond to requests. Snapshots capture the request state at response time. Snapshots include reason and status information. Snapshots are immutable after creation. Each snapshot records the creation timestamp. Snapshots preserve the refund request state. Snapshots enable tracking of refund decisions. Administrators can view all refund snapshots. Snapshots support dispute resolution for refunds. Both approved and rejected requests create snapshots.

### Snapshot Creation Timing

WHEN a seller responds to a refund request, THE system SHALL create a refund snapshot.

WHEN a seller approves a refund request, THE system SHALL create a refund snapshot.

WHEN a seller rejects a refund request, THE system SHALL create a refund snapshot.

THE system SHALL create the refund snapshot immediately upon seller response.

THE system SHALL create a refund snapshot for every refund request response.

IF a seller response fails after being submitted, THE system SHALL NOT create a refund snapshot.

IF a refund request is modified before seller response, THE system SHALL create a new snapshot upon response.

### Request State Capture

WHEN a refund snapshot is created, THE system SHALL capture the refund request state.

WHEN a refund snapshot is created, THE system SHALL capture the refund reason.

WHEN a refund snapshot is created, THE system SHALL capture the request status.

WHEN a refund snapshot is created, THE system SHALL capture the customer identifier.

WHEN a refund snapshot is created, THE system SHALL capture the order item identifier.

WHEN a refund snapshot is created, THE system SHALL capture the seller identifier.

WHEN a refund snapshot is created, THE system SHALL capture the requested-at timestamp.

THE system SHALL preserve the complete refund request state at response time.

THE system SHALL preserve the refund reason text in the snapshot.

THE system SHALL preserve the status value in the snapshot.

### Reason and Status Preservation

WHEN a refund snapshot is created, THE system SHALL preserve the refund reason text.

WHEN a refund snapshot is created, THE system SHALL preserve the status value.

THE system SHALL preserve the reason text exactly as provided by the customer.

THE system SHALL preserve the status as approved or rejected.

THE system SHALL preserve both approved and rejected status values.

IF the refund reason is modified before response, THE system SHALL preserve the original reason in the snapshot.

THE system SHALL preserve the decision state (approved or rejected) in the snapshot.

THE system SHALL preserve the seller's decision in the snapshot.

### Snapshot Immutability

WHEN a refund snapshot is created, THE system SHALL make it immutable.

THE system SHALL NOT allow modification of refund snapshots.

THE system SHALL NOT allow deletion of refund snapshots.

THE system SHALL NOT allow overwriting of refund snapshots.

IF an attempt is made to modify a refund snapshot, THE system SHALL reject the request.

IF an attempt is made to delete a refund snapshot, THE system SHALL reject the request.

THE system SHALL preserve refund snapshots permanently.

THE system SHALL maintain snapshot integrity after creation.

### Timestamp Recording

WHEN a refund snapshot is created, THE system SHALL record the creation timestamp.

THE system SHALL record the exact time when the snapshot was created.

THE system SHALL record the timestamp in UTC timezone.

THE system SHALL include the timestamp in the snapshot data.

THE system SHALL use the response time as the snapshot creation time.

THE system SHALL NOT allow modification of the snapshot timestamp.

THE system SHALL preserve the timestamp for audit purposes.

### Decision State Preservation

WHEN a refund snapshot is created, THE system SHALL preserve the decision state.

THE system SHALL preserve whether the refund was approved or rejected.

THE system SHALL preserve the seller's decision in the snapshot.

THE system SHALL preserve the approval decision for approved refunds.

THE system SHALL preserve the rejection decision for rejected refunds.

THE system SHALL preserve both approved and rejected decisions.

THE system SHALL enable tracking of all refund decisions through snapshots.

### Refund Decision Tracking

THE system SHALL enable tracking of refund decisions through snapshots.

THE system SHALL enable sellers to view their refund decision history.

THE system SHALL enable customers to view refund request outcomes.

THE system SHALL maintain a complete audit trail of refund decisions.

THE system SHALL link refund snapshots to their corresponding requests.

THE system SHALL enable chronological tracking of refund responses.

THE system SHALL preserve the sequence of refund decisions.

### Administrator Visibility

WHEN an administrator views refund snapshots, THE system SHALL display all refund snapshots.

THE system SHALL allow administrators to view refund snapshots for any order item.

THE system SHALL allow administrators to view refund snapshots for any seller.

THE system SHALL allow administrators to view refund snapshots for any customer.

THE system SHALL provide administrator access to all refund snapshot data.

THE system SHALL NOT restrict administrator visibility of refund snapshots.

THE system SHALL enable administrators to search refund snapshots by order item.

### Dispute Resolution Support

THE system SHALL support dispute resolution through refund snapshots.

THE system SHALL enable review of refund decisions through snapshots.

THE system SHALL preserve evidence of refund request handling.

THE system SHALL enable verification of refund reasons through snapshots.

THE system SHALL enable verification of refund status through snapshots.

THE system SHALL support audit of refund processes through snapshots.

THE system SHALL preserve the complete refund request lifecycle in snapshots.

### All Response Types

WHEN a seller approves a refund request, THE system SHALL create a refund snapshot.

WHEN a seller rejects a refund request, THE system SHALL create a refund snapshot.

THE system SHALL create snapshots for all response types.

THE system SHALL create snapshots regardless of approval or rejection.

THE system SHALL create snapshots for approved refund requests.

THE system SHALL create snapshots for rejected refund requests.

THE system SHALL NOT differentiate snapshot creation based on response type.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Product Search Filtering

WHEN a customer searches for products, THE system SHALL allow filtering by category.
WHEN a customer searches for products, THE system SHALL allow filtering by price range (minimum and maximum).
WHEN a customer searches for products, THE system SHALL allow filtering to show only in-stock items.
IF a customer applies multiple filters, THE system SHALL combine all filter criteria using AND logic.
IF a filter criteria matches no products, THE system SHALL display an empty result set with a message indicating no products match the filters.
IF a customer clears all filters, THE system SHALL display all searchable products.
WHEN a customer filters by category, THE system SHALL include products from both the selected category and its subcategories.
IF a product is deleted or hidden due to seller suspension, THE system SHALL exclude it from all filtered search results.

### Product Search Sorting

WHEN a customer views search results, THE system SHALL allow sorting by newest first.
WHEN a customer views search results, THE system SHALL allow sorting by price from low to high.
WHEN a customer views search results, THE system SHALL allow sorting by price from high to low.
WHEN a customer changes the sort order, THE system SHALL maintain any active filters.
IF multiple products have the same sort value, THE system SHALL display them in a consistent order.
WHEN a customer sorts by price, THE system SHALL use the base price for products without variants or the lowest variant price for products with variants.

### List Pagination Behavior

WHEN a customer views a paginated list (search results, category products, wishlist, order history), THE system SHALL display a consistent number of items per page.
WHEN a customer navigates to the next page, THE system SHALL maintain all active filters and sort order.
IF a page contains fewer items than the page size, THE system SHALL indicate that it is the last page.
IF a customer filters or sorts and the total page count changes, THE system SHALL adjust the pagination controls accordingly.
WHEN a customer views their wishlist, THE system SHALL paginate the results.
WHEN a customer views their order history, THE system SHALL paginate the results and sort by newest first by default.
IF a product in a paginated list is deleted by a seller, THE system SHALL remove it from all pages without breaking pagination.

### Category Browsing Expectations

WHEN a customer browses a category, THE system SHALL display all products assigned to that category.
WHEN a customer browses a category with subcategories, THE system SHALL include products from the subcategories in the results.
WHEN a customer views a category page, THE system SHALL allow the same filtering and sorting options as the product search.
IF a category has no products, THE system SHALL display an empty state indicating no products are available in that category.
IF a product's category is deleted, THE system SHALL no longer display the product in any category listing.

### Product Listing Display Rules

WHEN displaying a product in a list (search results, category page, wishlist), THE system SHALL show the main image as a thumbnail.
WHEN displaying a product in a list, THE system SHALL show the product name.
WHEN displaying a product in a list, THE system SHALL show the base price or a price range if variants have different prices.
WHEN displaying a product in a list, THE system SHALL show the seller's shop name.
WHEN a product has reviews, THE system SHALL display the average rating in the list.
IF a product has no reviews, THE system SHALL not display a rating in the list.
IF a product is out of stock (all variants have zero stock), THE system SHALL mark it as unavailable in the list.

### Search and Browse Error Scenarios

IF a customer searches with an empty query, THE system SHALL display all products or a message prompting for search terms.
IF a customer applies invalid filter values (e.g., minimum price greater than maximum price), THE system SHALL reject the filter and display an error message.
IF a customer requests a page number that exceeds the available pages, THE system SHALL redirect to the last available page or display an error.
IF a product becomes unavailable while a customer is viewing a paginated list, THE system SHALL handle the missing product gracefully without breaking the list display.
IF a seller is suspended, THE system SHALL hide all their products from search and category listings immediately.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Account and Authentication Error Scenarios

IF a registration request is submitted with an email address that already exists in the system, THE system SHALL reject the registration and display an error message.

IF a registration request is submitted with an invalid email format, THE system SHALL reject the registration and display an error message.

IF a registration request is submitted with a password that does not meet security requirements, THE system SHALL reject the registration and display an error message.

IF a user attempts to log in with an incorrect password, THE system SHALL reject the login attempt and display an error message.

IF a user attempts to log in with a banned account, THE system SHALL reject the login attempt and display an error message.

IF a user attempts to log in with a suspended seller account, THE system SHALL reject the login attempt and display an error message.

IF a seller attempts to perform selling operations before administrator approval, THE system SHALL reject the operation and display an error message.

IF a seller account is suspended, THE system SHALL prevent the seller from creating new products and display an error message.

IF a seller account is suspended, THE system SHALL prevent the seller from editing existing products and display an error message.

IF a customer account is deleted, THE system SHALL prevent the customer from logging in and display an error message.

### Product and Inventory Error Scenarios

IF a seller attempts to delete a product that has pending order items with paid or shipped status, THE system SHALL reject the deletion and display an error message.

IF a seller attempts to delete a product variant that has pending order items with paid or shipped status, THE system SHALL reject the deletion and display an error message.

IF a seller attempts to delete a product that has pending cancellation requests, THE system SHALL reject the deletion and display an error message.

IF a seller attempts to delete a product variant that has pending refund requests, THE system SHALL reject the deletion and display an error message.

IF a seller attempts to set a product variant's stock quantity to a negative value, THE system SHALL reject the operation and display an error message.

IF a seller attempts to add inventory with an invalid quantity value, THE system SHALL reject the operation and display an error message.

IF a customer attempts to add an out-of-stock variant to their cart, THE system SHALL reject the addition and display an error message.

IF a customer attempts to add a deleted variant to their cart, THE system SHALL reject the addition and display an error message.

IF a customer attempts to checkout with a variant that has insufficient stock for the requested quantity, THE system SHALL reject the checkout and display an error message.

IF a customer attempts to checkout with a deleted variant in their cart, THE system SHALL reject the checkout and display an error message.

### Order Transaction Error Scenarios

IF a customer attempts to request cancellation for an order item with shipped status, THE system SHALL reject the cancellation request and display an error message.

IF a customer attempts to request cancellation for an order item with delivered status, THE system SHALL reject the cancellation request and display an error message.

IF a customer attempts to request cancellation for an order item that is already cancelled, THE system SHALL reject the cancellation request and display an error message.

IF a customer attempts to request a refund for an order item with paid status, THE system SHALL reject the refund request and display an error message.

IF a customer attempts to request a refund for an order item with shipped status, THE system SHALL reject the refund request and display an error message.

IF a customer attempts to request a refund for an order item outside the seven-day window after delivery, THE system SHALL reject the refund request and display an error message.

IF a customer attempts to request a refund for an order item that is already refunded, THE system SHALL reject the refund request and display an error message.

IF a customer attempts to request cancellation or refund for an order item that does not exist, THE system SHALL reject the request and display an error message.

IF a customer attempts to request cancellation or refund for an order item that does not belong to them, THE system SHALL reject the request and display an error message.

IF a seller attempts to approve or reject a cancellation request that does not belong to their product, THE system SHALL reject the operation and display an error message.

IF a seller attempts to approve or reject a refund request that does not belong to their product, THE system SHALL reject the operation and display an error message.

### Review Error Scenarios

IF a customer attempts to write a review for a product they have not purchased, THE system SHALL reject the review and display an error message.

IF a customer attempts to write a review for an order item with paid status, THE system SHALL reject the review and display an error message.

IF a customer attempts to write a review for an order item with shipped status, THE system SHALL reject the review and display an error message.

IF a customer attempts to write a review for an order item that is already reviewed in the same order, THE system SHALL reject the review and display an error message.

IF a customer attempts to submit a review with a rating outside the 1-5 star range, THE system SHALL reject the review and display an error message.

IF a customer attempts to edit a review that does not belong to them, THE system SHALL reject the edit and display an error message.

IF a customer attempts to delete a review that does not belong to them, THE system SHALL reject the deletion and display an error message.

IF a customer attempts to write a review for a product that has been deleted, THE system SHALL reject the review and display an error message.

### Data Access Error Scenarios

IF a customer attempts to add a product to their wishlist that does not exist, THE system SHALL reject the addition and display an error message.

IF a customer attempts to view a wishlist item for a product that has been deleted by the seller, THE system SHALL automatically remove it from the wishlist without user action.

IF a customer attempts to add a product to their cart that does not exist, THE system SHALL reject the addition and display an error message.

IF a customer attempts to checkout without selecting a shipping address, THE system SHALL reject the checkout and display an error message.

IF a customer attempts to checkout with an empty cart, THE system SHALL reject the checkout and display an error message.

IF a customer attempts to change the shipping address after an order is placed, THE system SHALL reject the change and display an error message.

IF a customer attempts to view order details for an order that does not exist, THE system SHALL reject the request and display an error message.

IF a customer attempts to view order details for an order that does not belong to them, THE system SHALL reject the request and display an error message.

IF a seller attempts to view order items for products that do not belong to them, THE system SHALL reject the request and display an error message.

IF a seller attempts to create a shipment for order items that do not belong to them, THE system SHALL reject the operation and display an error message.

### Transaction and Integration Error Scenarios

IF a payment transaction fails during checkout, THE system SHALL not create an order and allow the customer to retry payment.

IF a payment transaction fails after partial processing, THE system SHALL rollback any inventory changes and allow the customer to retry payment.

IF an external payment gateway returns an error response, THE system SHALL display a payment error message and allow the customer to retry.

IF the system cannot process a payment due to temporary service unavailability, THE system SHALL display a service error message and allow the customer to retry.

IF a customer's cart contains items that become unavailable during checkout, THE system SHALL display an error message and prevent checkout until items are removed.

IF a seller attempts to ship order items that are not in paid status, THE system SHALL reject the shipment creation and display an error message.

IF a seller attempts to create a shipment with missing tracking information, THE system SHALL reject the shipment creation and display an error message.

IF a customer attempts to confirm delivery for a shipment that does not exist, THE system SHALL reject the confirmation and display an error message.

IF a customer attempts to confirm delivery for a shipment that does not belong to their order, THE system SHALL reject the confirmation and display an error message.

### Administrative Operation Error Scenarios

IF a super administrator attempts to demote themselves to regular administrator, THE system SHALL reject the demotion and display an error message.

IF a regular administrator attempts to approve or reject seller approval requests, THE system SHALL allow the operation as permitted.

IF a regular administrator attempts to promote another administrator to super administrator, THE system SHALL reject the operation and display an error message.

IF a regular administrator attempts to demote a super administrator, THE system SHALL reject the operation and display an error message.

IF a user attempts to submit an admin promotion request without providing a reason, THE system SHALL reject the request and display an error message.

IF a seller attempts to submit a new registration request while their previous request is still pending, THE system SHALL reject the new request and display an error message.

IF an administrator attempts to reject a seller registration without providing a rejection reason, THE system SHALL reject the operation and display an error message.

IF an administrator attempts to approve a seller registration that is already approved, THE system SHALL reject the operation and display an error message.

IF an administrator attempts to suspend a seller account that is already suspended, THE system SHALL reject the operation and display an error message.

IF an administrator attempts to unsuspend a seller account that is not suspended, THE system SHALL reject the operation and display an error message.

### Validation and Constraint Error Scenarios

IF a customer attempts to create an address with missing required components, THE system SHALL reject the address creation and display an error message.

IF a customer attempts to set a default address that does not belong to them, THE system SHALL reject the operation and display an error message.

IF a customer attempts to delete their last remaining address, THE system SHALL reject the deletion and display an error message.

IF a seller attempts to create a product without assigning a category, THE system SHALL reject the product creation and display an error message.

IF a seller attempts to create a product with a category that does not exist, THE system SHALL reject the product creation and display an error message.

IF a seller attempts to create a product variant with a duplicate SKU code, THE system SHALL reject the variant creation and display an error message.

IF a seller attempts to create a product with a negative or zero base price, THE system SHALL reject the product creation and display an error message.

IF an administrator attempts to delete a category that has products assigned to it, THE system SHALL move those products to uncategorized status rather than rejecting the operation.

IF an administrator attempts to create a subcategory under a subcategory, THE system SHALL reject the creation and display an error message.

IF a user attempts to access a feature that requires registration without being logged in, THE system SHALL redirect to the login page and display an error message.

# Integration Error Handling

Error handling and retry policies for external integrations.

## Integration Failure Policies

Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

### Payment Gateway Retry Policy

WHEN the payment gateway fails to process a payment, THE system SHALL retry the payment request up to 3 times with exponential backoff.

WHEN a retry attempt succeeds, THE system SHALL proceed with order creation using the successful payment response.

WHEN all retry attempts fail, THE system SHALL mark the payment as failed and notify the customer.

IF the payment gateway returns a temporary error (e.g., service unavailable), THE system SHALL include it in the retry strategy.

IF the payment gateway returns a permanent error (e.g., card declined), THE system SHALL NOT retry and immediately inform the customer.

WHEN retrying a payment, THE system SHALL preserve the original order details and cart contents.

IF a customer abandons the checkout during retries, THE system SHALL cancel the pending retry attempts.

WHEN a retry succeeds after initial failure, THE system SHALL NOT charge the customer multiple times.

### Payment Gateway Circuit Breaker Policy

WHEN the payment gateway experiences repeated failures, THE system SHALL activate a circuit breaker to prevent cascading failures.

WHEN the circuit breaker is open, THE system SHALL reject new payment attempts and display a maintenance message to customers.

WHEN the circuit breaker is half-open, THE system SHALL allow a limited number of test payment requests.

WHEN test requests succeed in the half-open state, THE system SHALL close the circuit breaker and resume normal operations.

WHEN test requests fail in the half-open state, THE system SHALL reopen the circuit breaker.

WHEN the circuit breaker activates, THE system SHALL notify administrators of the payment gateway issue.

IF the circuit breaker remains open for more than 30 minutes, THE system SHALL escalate the alert to senior administrators.

WHEN the circuit breaker closes, THE system SHALL log the recovery event for audit purposes.

### Payment Gateway Fallback Behavior

WHEN the primary payment gateway is unavailable, THE system SHALL automatically switch to a backup payment gateway if configured.

WHEN switching to a backup payment gateway, THE system SHALL preserve the customer's cart and order details.

IF no backup payment gateway is configured, THE system SHALL display an alternative payment method message to the customer.

WHEN the backup payment gateway succeeds, THE system SHALL proceed with order creation without customer intervention.

WHEN both primary and backup payment gateways fail, THE system SHALL allow the customer to try again later.

IF the customer's cart contains items that become unavailable during the fallback period, THE system SHALL mark those items as unavailable in the cart.

WHEN a fallback occurs, THE system SHALL log the event for administrative review.

IF a customer successfully pays via the backup gateway, THE system SHALL process the order identically to primary gateway transactions.

### Integration Error Handling and Escalation

WHEN an external integration fails (payment gateway, shipping carrier API, etc.), THE system SHALL record the error in an integration error log.

WHEN an integration error occurs, THE system SHALL capture the error type, timestamp, and affected operation.

IF the integration error affects an active customer transaction, THE system SHALL display a user-friendly error message.

IF the integration error occurs during background processing, THE system SHALL queue the operation for later retry.

WHEN an integration error is logged, THE system SHALL include sufficient context for administrators to diagnose the issue.

IF the same integration error occurs more than 5 times within 10 minutes, THE system SHALL trigger an administrator alert.

WHEN an integration error prevents order completion, THE system SHALL preserve the customer's cart state.

IF an integration error occurs during order processing after payment, THE system SHALL initiate an automatic refund process.

WHEN administrators view integration errors, THE system SHALL display errors sorted by most recent first.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Type and Content Validation Rules

WHEN a seller uploads a logo image, THE system SHALL accept only image file types including JPEG, PNG, and GIF.

WHEN a seller uploads a logo image, THE system SHALL validate that the file content matches the declared content type.

IF the uploaded file content does not match the declared content type, THE system SHALL reject the upload.

IF the uploaded file is corrupted or cannot be read, THE system SHALL reject the upload.

WHEN a seller attempts to upload a logo image, THE system SHALL enforce a maximum file size limit.

IF the uploaded file exceeds the maximum size limit, THE system SHALL reject the upload.

WHEN a product image is uploaded, THE system SHALL validate that the file is a supported image format.

IF an uploaded image file has an unsupported format, THE system SHALL reject the upload.

WHEN a file is uploaded, THE system SHALL verify that the file is not empty.

IF an uploaded file has zero bytes, THE system SHALL reject the upload.

WHEN a seller uploads multiple product images, THE system SHALL validate each image independently.

IF any image in a batch upload fails validation, THE system SHALL reject only that image and allow other valid images.

### Virus Scanning and Security Requirements

WHEN a file is uploaded, THE system SHALL scan the file for viruses and malware.

IF a virus or malware is detected in an uploaded file, THE system SHALL reject the upload.

IF a virus or malware is detected in an uploaded file, THE system SHALL quarantine the file for security review.

WHEN a virus scan fails or times out, THE system SHALL reject the upload.

WHEN a seller uploads a logo image, THE system SHALL complete virus scanning before making the image visible.

WHEN a seller uploads product images, THE system SHALL complete virus scanning before making the images visible.

IF an uploaded file is identified as a security threat, THE system SHALL notify security administrators.

WHEN a previously uploaded file is re-scanned and found to contain malware, THE system SHALL remove the file from the platform.

IF a file is removed due to malware detection, THE system SHALL notify the uploading user.

### File Size and Dimension Requirements

WHEN a seller uploads a logo image, THE system SHALL enforce maximum dimensions for the image.

IF an uploaded logo image exceeds maximum dimensions, THE system SHALL automatically resize the image.

WHEN a seller uploads product images, THE system SHALL enforce maximum dimensions for each image.

IF an uploaded product image exceeds maximum dimensions, THE system SHALL automatically resize the image.

WHEN a seller uploads a logo image, THE system SHALL enforce a minimum file size to ensure quality.

IF an uploaded logo image is below the minimum size threshold, THE system SHALL reject the upload.

WHEN a seller uploads product images, THE system SHALL enforce a minimum file size to ensure quality.

IF an uploaded product image is below the minimum size threshold, THE system SHALL reject the upload.

WHEN a seller uploads multiple product images, THE system SHALL validate that at least one image is designated as the main thumbnail.

IF no image is designated as the main thumbnail, THE system SHALL automatically set the first uploaded image as the main thumbnail.

### File Retention and Storage Policies

WHEN a seller uploads a logo image, THE system SHALL retain the file for the lifetime of the seller account.

WHEN a seller deletes their account, THE system SHALL retain logo images that appear in historical order snapshots.

WHEN a seller deletes their account, THE system SHALL remove logo images that are not referenced by any historical snapshot.

WHEN a product is deleted, THE system SHALL retain product images that appear in historical order snapshots.

WHEN a product is deleted, THE system SHALL remove product images that are not referenced by any historical snapshot.

WHEN a review is deleted, THE system SHALL retain any images associated with the review in the review snapshot.

WHEN a seller's account is suspended, THE system SHALL retain all uploaded files for the seller.

WHEN a seller's account is unsuspended, THE system SHALL restore visibility of all previously uploaded files.

WHEN an administrator deletes a product for policy violations, THE system SHALL retain all product images in snapshots.

WHEN a file is referenced by a snapshot, THE system SHALL never delete the file regardless of account status.