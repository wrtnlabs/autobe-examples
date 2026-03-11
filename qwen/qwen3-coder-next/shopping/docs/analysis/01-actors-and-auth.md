**ecommerceMall — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their roles and what they can do.

## customer Actor

Customers are registered users who browse, search, and purchase products. They create and manage their profiles, including display name and phone number. Customers can add, edit, and delete multiple shipping addresses, and set a default address for orders. They build wishlists of desired products and maintain a shopping cart with specific variants. Customers place orders, process payments, track shipments, and confirm deliveries. They can request cancellations for paid but not yet shipped items, and request refunds for delivered items within 7 days. Customers write and manage reviews after delivery, and view order history with item-level status details.

### customer registration

WHEN a person signs up to become a customer, THE system SHALL:
1. Require a unique email address and password
2. Assign the role 'customer' to the new user
3. Create a corresponding CustomerProfile with empty display name and phone number
4. Immediately make the account active for login

WHEN a customer deletes their account, THE system SHALL:
1. Deactivate the user account (prevent login)
2. Preserve all order history for legal and seller records
3. Preserve all review content but replace the author name with 'deleted user'
4. Delete the CustomerProfile, all Address records, WishlistItem records, and CartItem records
5. Maintain auditability of deleted account with timestamp and reason if provided

WHEN a customer signs up, THE system SHALL:
1. Require email and password as credentials
2. Not allow duplicate email addresses
3. Create an associated CustomerProfile automatically
4. Begin with zero addresses, wishlist items, and cart items

## seller Actor

Sellers are registered users who create and manage product listings to sell goods. After registration, seller accounts require administrator approval before they can list or sell products. Sellers define shop profiles with name, description, and logo, and maintain snapshots of profile changes. They create products with categories, descriptions, base prices, and multiple variants (SKUs) with unique stock and pricing. Sellers manage inventory through restocking and adjustments, set variant stock levels, and track inventory history. They edit products and variants (creating snapshots on each edit), upload and reorder images, and delete products only when no pending orders exist. Sellers fulfill orders by shipping items with tracking, respond to cancellation and refund requests, and view performance dashboards.

### seller registration approval

WHEN a seller submits a registration request, THE system SHALL set the approval status to "pending".

WHEN an administrator reviews a pending seller request, THE system SHALL allow approval, rejection, or deferral.

IF an administrator approves a seller request, THE system SHALL update the approval status to "approved" and allow the seller to create products.

IF an administrator rejects a seller request, THE system SHALL record the rejection reason, set the status to "rejected", and notify the seller.

WHEN a rejected seller submits a new registration request, THE system SHALL create a new pending request with updated profile information.

WHEN a seller views their approval status, THE system SHALL display the current status and, if rejected, the reason for rejection.

THE system SHALL allow sellers to re-register only after their prior request is rejected or deleted.

WHEN a seller’s account is suspended, THE system SHALL maintain their approval status but restrict all selling capabilities.

THE system SHALL preserve all approval history including timestamps, approvers, and notes for audit purposes.

### shop profile management

WHEN a seller updates their shop profile, THE system SHALL create a snapshot of the previous state.

THE system SHALL store the following profile attributes: shop name, shop description, and logo URL.

WHEN a seller changes their shop name, THE system SHALL ensure the new name is unique across the platform.

WHEN a seller uploads a new logo, THE system SHALL validate the file format (JPEG or PNG) and size (max 5MB).

WHEN a seller views their shop profile, THE system SHALL display current values and the timestamp of the last update.

WHEN a seller deletes their logo, THE system SHALL clear the logo URL but preserve the profile record.

WHEN a seller edits their shop description, THE system SHALL apply the change and record the snapshot.

THE system SHALL allow sellers to preview their shop profile as customers would see it before saving changes.

IF a seller attempts to edit their profile while suspended, THE system SHALL block the edit and notify the seller.

### product creation

WHEN a seller creates a product, THE system SHALL require name, description, category, and base price.

THE system SHALL associate the new product with the creating seller and store it under the selected category.

WHEN a product is created, THE system SHALL generate a product ID and allow the seller to begin adding variants.

WHEN a seller selects a category, THE system SHALL allow selection of either a top-level category or its subcategory.

WHEN a product is created without any variants, THE system SHALL mark it as "unavailable" but visible in search.

THE system SHALL store the main image as the first uploaded product image by default.

WHEN a seller uploads images during product creation, THE system SHALL allow up to 10 images and set the first as main.

WHEN a product creation fails due to invalid category or missing required fields, THE system SHALL return a descriptive error message.

### variant management (SKU)

WHEN a seller adds a variant to a product, THE system SHALL require a unique SKU code and option values (e.g., color, size).

THE system SHALL allow optional price override per variant, falling back to the product’s base price if not specified.

WHEN a seller sets stock quantity for a new variant, THE system SHALL initialize it to zero.

WHEN a seller edits an existing variant’s options or price, THE system SHALL create a product-snapshot-variant record.

WHEN a seller deletes a variant, THE system SHALL verify no pending order items exist for that variant before deletion.

IF a seller attempts to delete a variant with pending orders, THE system SHALL reject the deletion and explain why.

WHEN a seller removes all option combinations from a product, THE system SHALL prevent the product from being purchased.

THE system SHALL ensure SKU codes remain unique across all products in the platform.

### inventory restocking

WHEN a seller restocks a variant, THE system SHALL create an inventory record with a positive quantity change and reason "restock".

THE system SHALL allow sellers to specify a free-text reason for restocking (e.g., "supplier restock", "manufacturer return").

WHEN a restock record is created, THE system SHALL update the current stock quantity for the variant.

WHEN a seller views inventory, THE system SHALL display the current stock quantity and a timeline of restock adjustments.

IF a seller attempts a restock with a non-positive quantity, THE system SHALL reject the request.

WHEN inventory is restocked for a previously out-of-stock variant, THE system SHALL update the variant’s availability status to "in stock".

### inventory adjustment

WHEN a seller adjusts inventory (e.g., due to damage, loss, or correction), THE system SHALL create an inventory record with a negative quantity change and reason "adjustment".

THE system SHALL require sellers to specify a reason for inventory adjustment (e.g., "damaged in transit", "inventory discrepancy").

WHEN an adjustment reduces stock, THE system SHALL update the variant’s current stock quantity.

THE system SHALL allow inventory adjustments to bring stock below zero only in exceptional cases (with supervisor override).

IF a seller attempts to adjust stock without sufficient history context, THE system SHALL prompt for additional documentation.

WHEN inventory is adjusted upward, THE system SHALL treat it as a restock, not an adjustment.

### product image management

WHEN a seller uploads images for a product, THE system SHALL assign an order number and set the first image as the main thumbnail.

WHEN a seller reorders images, THE system SHALL update the sortOrder field and update the main thumbnail flag.

WHEN a seller deletes an image, THE system SHALL remove it from the product, but preserve the deletion in product snapshots.

THE system SHALL prevent deletion of the last remaining image for a product.

WHEN a seller selects a new main image, THE system SHALL update isMain flag for all images and create a product snapshot.

WHEN a seller edits product details after image changes, THE system SHALL include the full image set in the product snapshot.

### order fulfillment

WHEN a seller ships items from an order, THE system SHALL allow bundling multiple order items into a single shipment (same seller).

THE system SHALL require the seller to input carrier name and tracking number before marking shipment as "shipped".

WHEN a shipment is created, THE system SHALL update the status of all associated order items to "shipped".

THE system SHALL allow sellers to view pending items needing shipment for their products.

WHEN a seller ships items individually instead of bundled, THE system SHALL create separate shipments per group.

IF a seller attempts to ship items not in "paid" status, THE system SHALL block the shipment and show why.

WHEN an order includes items from multiple sellers, THE system SHALL ensure each seller ships only their own items.

### shipment processing

WHEN a shipment is created, THE system SHALL associate it with the seller, order, and selected order items.

THE system SHALL allow sellers to view all shipments for their products and update tracking information.

WHEN a customer confirms delivery of a shipment, THE system SHALL update all items in that shipment to "delivered".

IF the customer does not confirm delivery within 14 days, THE system SHALL automatically mark all items as "delivered".

WHEN a shipment is returned, THE system SHALL update affected items’ statuses based on return policy (e.g., to "refunded" if return approved).

THE system SHALL preserve all tracking history in shipment snapshots for dispute resolution.

WHEN multiple items are in one shipment, THE system SHALL ensure tracking applies uniformly to all.

### cancellation approval

WHEN a seller receives a cancellation request for a "paid" item, THE system SHALL set the request status to "pending".

WHEN a seller approves a cancellation request, THE system SHALL change the item’s status to "cancelled", restore its stock via inventory record, and issue refund if payment was collected.

WHEN a seller rejects a cancellation request, THE system SHALL update the request status to "rejected" and preserve the reason.

WHEN a cancellation request is approved, THE system SHALL create a snapshot of the request state with the seller’s response.

IF a cancellation request is made for an item already shipped, THE system SHALL reject it and prompt the seller to recommend a return instead.

WHEN all items in an order are cancelled, THE system SHALL update the overall order status to "cancelled".

WHEN some items are cancelled, THE system SHALL leave the remaining items in their current flow.

### refund approval

WHEN a seller receives a refund request for a "delivered" item, THE system SHALL set the request status to "pending".

WHEN a seller approves a refund request within 7 days of delivery, THE system SHALL change the item status to "refunded", restore stock, and record the refund.

WHEN a seller rejects a refund request, THE system SHALL update the request status to "rejected" and preserve the reason.

WHEN a refund request is approved, THE system SHALL create a snapshot of the request state with the seller’s response.

IF the 7-day deadline has passed, THE system SHALL reject the request and notify the customer.

WHEN all items in an order are refunded, THE system SHALL update the overall order status to "refunded".

WHEN a refund includes partial items, THE system SHALL reflect the mixed state in the order’s status as "partially completed".

### product deletion policy

WHEN a seller attempts to delete a product, THE system SHALL verify no pending order items (paid or shipped) exist for any variant.

WHEN a seller attempts to delete a product with pending cancellation or refund requests, THE system SHALL reject the deletion and list the blocking items.

IF a product passes the deletion checks, THE system SHALL remove all variants, inventory records, and images associated with it.

WHEN a product is deleted, THE system SHALL no longer display it in search or category listings, but preserve all product snapshots.

WHEN a deleted product appears in an order or review, THE system SHALL display placeholder data from the most recent snapshot.

THE system SHALL preserve product snapshots indefinitely, regardless of deletion, for compliance and dispute resolution.

### seller dashboard metrics

WHEN a seller opens their dashboard, THE system SHALL display the total number of active products.

THE system SHALL show the count of pending cancellation requests and pending refund requests.

WHEN viewing order items for their shop, THE system SHALL allow filtering by status (paid, shipped, delivered, cancelled, refunded).

THE system SHALL display the total number of order items sold (for their products) across all time.

WHEN a seller views product performance, THE system SHALL show total sales volume (units) and revenue (gross) per product or product group.

## admin Actor

Administrators are authorized users who uphold platform integrity and manage Seller and Customer accounts. Regular administrators can approve or reject seller registrations with feedback, suspend or unsuspend seller accounts, manage product catalogs including deletion for policy violations, and oversee orders including force-cancel or force-refund capabilities. Super administrators have all regular administrator powers plus can promote or demote other administrators. Administrators manage category hierarchies, view snapshots of any product or review for dispute resolution, ban or unban users, and monitor pending registration requests and seller approvals. They operate with elevated access to all order, product, and user data for moderation and compliance.

### admin Role Hierarchy

THE system SHALL recognize two administrative grades: regular administrator and super administrator.

WHEN a super administrator promotes another user, THE system SHALL grant them the super administrator grade.

WHEN a super administrator demotes another user, THE system SHALL downgrade them to the regular administrator grade.

A regular administrator SHALL NOT promote or demote other administrators.

A super administrator SHALL NOT demote themselves to regular administrator.

### Seller Registration Approval

WHEN a seller submits a registration request, THE system SHALL set the approval status to pending.

WHEN an administrator reviews a seller registration, THE system SHALL allow them to approve or reject the request.

IF an administrator rejects a seller registration, THE system SHALL require them to provide a rejection reason.

WHEN a seller registration is approved, THE system SHALL set the approval status to approved.

WHEN a seller registration is rejected, THE system SHALL allow the seller to submit a new registration request.

### Seller Suspension Management

WHEN an administrator suspends a seller account, THE system SHALL set the seller's approval status to suspended.

WHILE a seller is suspended, THE system SHALL hide their products from search and category listings.

WHILE a seller is suspended, THE system SHALL prevent new product creation and existing product editing.

WHILE a seller is suspended, THE system SHALL allow them to continue processing existing orders (shipping, responding to cancellation/refund requests).

WHEN an administrator unsuspends a seller account, THE system SHALL restore their ability to create and edit products.

### Product Deletion Authority

WHEN an administrator deletes a product, THE system SHALL remove it from search and category listings.

THE system SHALL allow administrators to delete any product for policy violations.

WHEN an administrator deletes a product, THE system SHALL NOT delete product snapshots.

WHEN an administrator deletes a product, THE system SHALL preserve order snapshots associated with the product.

### Order Override Actions

WHEN an administrator force-cancels an order item, THE system SHALL change its status to cancelled and restore its stock quantity.

WHEN an administrator force-refunds an order item, THE system SHALL change its status to refunded and restore its stock quantity.

WHEN an administrator force-cancels an entire order, THE system SHALL cancel all items within it and restore all associated stock quantities.

WHEN an administrator force-refunds an entire order, THE system SHALL refund all items within it and restore all associated stock quantities.

### User Banning Controls

WHEN an administrator bans a customer, THE system SHALL prevent them from logging in.

WHEN an administrator bans a seller, THE system SHALL prevent them from logging in.

WHEN an administrator bans a customer, THE system SHALL NOT affect their existing orders.

WHEN an administrator bans a seller, THE system SHALL allow them to continue processing existing orders.

WHEN an administrator unbans a user, THE system SHALL restore their account access.

### Category Management

WHEN an administrator creates a category, THE system SHALL require a name and allow an optional description.

WHEN an administrator edits a category, THE system SHALL preserve its existing products.

WHEN an administrator deletes a category, THE system SHALL mark its products as uncategorized.

WHEN an administrator creates a subcategory, THE system SHALL require exactly one parent category.

### Snapshot Audit Access

WHEN an administrator views a product snapshot, THE system SHALL display all snapshot fields including name, description, category, and base price.

WHEN an administrator views a product snapshot variant, THE system SHALL display its SKU code, option values, and price override.

WHEN an administrator views a review snapshot, THE system SHALL display its rating, text content, and snapshot type.

WHEN an administrator views an order item snapshot, THE system SHALL display the product name, variant options, and seller profile snapshot.

### super admin Privileges

WHEN a super administrator logs in, THE system SHALL grant them all permissions of regular administrators.

WHEN a super administrator logs in, THE system SHALL allow them to promote regular administrators to super administrators.

WHEN a super administrator logs in, THE system SHALL allow them to demote other super administrators to regular administrators.

### regular admin Permissions

WHEN a regular administrator logs in, THE system SHALL allow them to approve or reject seller registrations.

WHEN a regular administrator logs in, THE system SHALL allow them to suspend or unsuspend seller accounts.

WHEN a regular administrator logs in, THE system SHALL allow them to view all products, orders, and user accounts.

WHEN a regular administrator logs in, THE system SHALL allow them to manage category hierarchies.

### Dispute Resolution Support

WHEN an administrator views a seller profile snapshot, THE system SHALL display the shop name, description, and logo at the time of the snapshot.

WHEN an administrator views a product variant snapshot, THE system SHALL display its option values, price override, and stock quantity at the time of the snapshot.

WHEN an administrator views an order item snapshot, THE system SHALL display the product name, variant options, and seller profile snapshot as they existed at purchase time.

WHEN an administrator reviews a cancellation request snapshot, THE system SHALL display its original reason and status before modification.

# Authentication Flows

Registration, login, session management, and token policies.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Customer Registration

WHEN a new user registers as a customer, THE system SHALL:
1. Require a unique email address
2. Require a password meeting minimum security requirements
3. Automatically create a CustomerProfile with the new account
4. Assign role 'customer' to the user
5. Set account status to 'active'

WHEN email address duplication is detected, THE system SHALL reject registration with an appropriate error.
IF the password does not meet security requirements, THE system SHALL reject registration with an appropriate error.

Customer registration completes immediately without administrative approval.

### Seller Registration

WHEN a new user registers as a seller, THE system SHALL:
1. Require a unique email address
2. Require a password meeting minimum security requirements
3. Automatically create a SellerProfile with the new account
4. Assign role 'seller' to the user
5. Set approvalStatus to 'pending'

WHEN email address duplication is detected, THE system SHALL reject registration with an appropriate error.
IF the password does not meet security requirements, THE system SHALL reject registration with an appropriate error.

Seller registration requires administrative approval before the seller can list products.
WHEN registration is rejected by an administrator, THE system SHALL store the rejection reason and allow the user to resubmit.

### Admin Registration

WHEN a user requests admin access, THE system SHALL:
1. Accept a request from any existing user (customer or seller)
2. Create an AdminRequest with the user's ID and provided reason
3. Set AdminRequest status to 'pending'
4. Prevent immediate admin role assignment

WHEN an admin request is approved, THE system SHALL:
1. Create an AdminRole record for the user with grade 'regular'
2. Update the user's role to 'admin'
3. Set the AdminRequest status to 'approved'

WHEN an admin request is rejected, THE system SHALL:
1. Set the AdminRequest status to 'rejected'
2. Store the rejection reason if provided by the super administrator
3. Allow the user to resubmit a new request

### Login and Authentication

WHEN a user submits login credentials, THE system SHALL:
1. Validate email and password match an existing active account
2. Check account status (not banned or suspended)
3. Generate a session token upon successful authentication
4. Return appropriate error for invalid credentials or account status

WHEN login fails due to invalid credentials, THE system SHALL reject the request with a generic error message.
WHEN login fails due to account being banned or suspended, THE system SHALL reject the request with a specific account status error.

THE system SHALL terminate any existing sessions for a user when their password is changed.
THE system SHALL allow only one active session per user at a time.

### Account Role and Permission Initialization

WHEN a customer account is created, THE system SHALL automatically initialize:
1. CustomerProfile with empty display name and phone number fields
2. Empty address book ready for first address addition
3. Empty cart and wishlist associations
4. Default permissions for customer role

WHEN a seller account is created, THE system SHALL automatically initialize:
1. SellerProfile with approvalStatus set to 'pending'
2. Empty product catalog and inventory management context
3. Default permissions for seller role (except selling capability until approved)

WHEN admin access is granted, THE system SHALL immediately update:
1. AdminRole with grade 'regular'
2. User role to 'admin'
3. Permission scope to include administrative actions

## Session and Token Policy

Define session duration, token refresh, and expiration policies.

### Session Creation and JWT Token Structure

WHEN a user successfully authenticates, THE system SHALL:
1. Generate a new session
2. Issue a JSON Web Token (JWT) containing the user ID, role, and session creation timestamp
3. Set the JWT expiration time to 2 hours from creation
4. Return the JWT in a secure HTTP-only cookie
5. Log the session creation event with IP address and user agent

THE system SHALL NOT issue multiple active sessions for the same user credentials at the same time.

WHEN a user logs out, THE system SHALL:
1. Invalidate the current session immediately
2. Clear the session cookie
3. Record the logout timestamp in the session log

### JWT Token Expiration and Rotation

WHEN a JWT expires, THE system SHALL:
1. Reject any request using the expired token
2. Return a 401 Unauthorized status
3. Clear any existing session cookies

WHEN a JWT has less than 30 minutes remaining before expiration, THE system SHALL:
1. Automatically trigger a token refresh attempt on the client side
2. Provide the new token in the response header when refresh succeeds

WHILE a JWT is valid, THE system SHALL:
1. Accept requests with the JWT in the Authorization header or secure cookie
2. Validate the JWT signature and expiration on each request
3. Reject requests with tampered or malformed JWTs

### Token Refresh Policy

WHEN a client requests a token refresh, THE system SHALL:
1. Verify the current JWT is not expired
2. Issue a new JWT with extended expiration time (2 hours from refresh)
3. Invalidate the previous JWT immediately
4. Update the session log with refresh event timestamp

IF a client requests refresh after JWT expiration, THE system SHALL:
1. Reject the refresh request
2. Return a 401 Unauthorized status
3. Require re-authentication

WHERE a user has multiple active sessions, THE system SHALL:
1. Allow independent token refresh per session
2. Maintain separate expiration times per session
3. Not propagate refresh across sessions

### Session Invalidation and Termination

WHEN an administrator suspends a user account, THE system SHALL:
1. Immediately invalidate all active sessions for that user
2. Return 401 Unauthorized for subsequent requests using those sessions
3. Record the suspension event with timestamp and administrator ID

WHEN a user deletes their account, THE system SHALL:
1. Immediately invalidate all active sessions
2. Permanently delete all session records
3. Block future authentication attempts for that account

WHILE an account is suspended, THE system SHALL:
1. Reject authentication attempts
2. Invalidate any existing sessions immediately
3. Prevent creation of new sessions

WHEN a user changes their password, THE system SHALL:
1. Invalidate all active sessions for that user
2. Require re-authentication after password change
3. Record the password change event in the session log

# Account Lifecycle

Account state transitions and lifecycle management.

## Account States and Transitions

Define account states (active, suspended, deleted) and valid transitions.

### Account State Definitions and Valid Transitions

WHEN a user account is created, THE system SHALL set its state to "active".

WHEN a user's account is suspended by an administrator, THE system SHALL set its state to "suspended".

WHEN a user's account is unsuspended by an administrator, THE system SHALL set its state back to "active".

WHEN a user requests account deletion, THE system SHALL transition the account state to "deleting".

WHILE an account is in "deleting" state, THE system SHALL allow only the deletion workflow to proceed and reject all other operations.

WHEN account deletion completes, THE system SHALL set its state to "deleted".

WHEN a seller account becomes "suspended", THE system SHALL:
1. Hide all their products from search and category listings
2. Block purchase of any new items from their shop
3. Allow processing of existing orders (shipping, cancellation, refund responses)
4. Prevent creation or editing of products

WHEN a seller account is "unsuspended", THE system SHALL:
1. Restore visibility of their products in search and category listings
2. Allow new purchases from their shop
3. Restore product creation and editing capabilities

WHEN a customer account is "suspended", THE system SHALL:
1. Block login and all active sessions
2. Prevent new cart additions and checkout attempts
3. Allow viewing of existing order history and tracking

WHEN a seller account is "deleted", THE system SHALL:
1. Delete all products and associated images from listings
2. Preserve order history and order item snapshots for legal/compliance purposes
3. Preserve the seller's shop name in all past order items
4. Not delete product snapshots or inventory history

WHEN a customer account is "deleted", THE system SHALL:
1. Remove all profile information (display name, phone, addresses)
2. Preserve all order history, order items, reviews, and review snapshots
3. Replace customer reviews with "deleted user" author
4. Preserve wishlist items but mark products as unavailable if deleted by seller

IF a seller attempts to delete their account while having pending orders (paid or shipped status), THE system SHALL reject the deletion request.

IF a seller attempts to delete their account while having pending cancellation or refund requests, THE system SHALL reject the deletion request.


### Account State Transition Logging and Audit Requirements

WHEN an administrator suspends a seller account, THE system SHALL record the suspension event with timestamp and operator ID.

WHEN an administrator unsuspends a seller account, THE system SHALL record the unsuspension event with timestamp and operator ID.

WHEN a user account transitions to "deleted" state, THE system SHALL create a system-level snapshot of the account's final state before deletion.

WHEN a seller's account state changes to "suspended", THE system SHALL generate an internal audit log entry including:
1. Timestamp of suspension
2. Administrator who approved it
3. Reason for suspension (if provided)

WHEN a seller's account state changes to "unsuspended", THE system SHALL generate an internal audit log entry including:
1. Timestamp of unsuspension
2. Administrator who approved it
3. Reason for unsuspension (if provided)

WHEN a user account is marked as "deleted", THE system SHALL:
1. Preserve all system snapshots (product, order, review, cancellation, refund)
2. Preserve all inventory history records
3. Clear personally identifiable fields (name, phone, addresses) but retain user ID

WHILE an account is in "deleting" state, THE system SHALL:
1. Block all new order placements
2. Block profile updates and deletions of personal data
3. Prevent session creation for new logins
4. Allow ongoing order fulfillment to complete for existing orders


### Account State Transition Diagram

 flowchart LR
    A["active"] -->|Admin suspend| B["suspended"]
    B -->|Admin unsuspend| A
    A -->|User request| C["deleting"]
    C -->|Deletion complete| D["deleted"]
    D -->|Reactivation request| A

    style A fill:#d4edda,stroke:#155724
    style B fill:#fff3cd,stroke:#856404
    style C fill:#cce5ff,stroke:#004085
    style D fill:#f8d7da,stroke:#721c24

### Operational Behavior During Account States

WHEN a user attempts to log in while their account is "suspended", THE system SHALL reject the login attempt and return a clear message that the account is suspended.

WHEN a user attempts to log in while their account is in "deleting" state, THE system SHALL reject the login attempt.

WHEN a user attempts to log in while their account is "deleted", THE system SHALL reject the login attempt.

WHEN a seller with "suspended" account tries to ship an order item, THE system SHALL allow the shipment process to proceed.

WHEN a seller with "suspended" account tries to create a new product, THE system SHALL reject the request with a clear message.

WHEN a seller with "suspended" account tries to edit existing products, THE system SHALL reject the request with a clear message.