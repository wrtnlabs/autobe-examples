**ecommerceMall — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their roles and what they can do.

## customer Actor

Customers are registered users who can browse and purchase products from the platform. Registration requires email and password, with email verification before account activation. Customers maintain a personal profile with display name and phone number that they can edit at any time. They manage multiple shipping addresses and designate one as the default for checkout. Customers can search products by name, filter by category and price range, and sort results by date or price. They add products to a personal wishlist for future consideration and add specific variants to their shopping cart. During checkout, customers select a shipping address, review their order summary, and complete payment through the integrated gateway. After purchase, customers can view their complete order history with full details of items, prices, and shipping status. They track shipments and confirm delivery upon receipt. Customers can request cancellation for items that have been paid but not yet shipped. For delivered items, customers can request refunds within seven days of delivery. Customers write reviews and ratings for products after delivery, which can be edited or deleted later. When a customer deletes their account, their profile information is removed but order history and reviews are preserved for legal and seller record purposes.

### Customer Registration and Authentication

WHEN a customer registers for the platform, THE system SHALL:
1. Require email and password for registration
2. Require email verification before account activation
3. Ensure email is unique across all customer accounts
4. Hash and securely store the password
5. Set the initial account status to active after verification

WHEN a customer logs in, THE system SHALL:
1. Accept email and password credentials
2. Verify credentials against stored values
3. Reject login attempts for banned accounts
4. Reject login attempts for suspended accounts
5. Create a session upon successful authentication

IF the email is already registered, THE system SHALL reject the registration request.
IF the email verification is not completed, THE system SHALL not activate the account.
IF the password is incorrect, THE system SHALL reject the login request.
IF the account is banned, THE system SHALL reject the login attempt and inform the customer.
IF the account is suspended, THE system SHALL reject the login attempt and inform the customer.

### Profile Management

WHEN a customer manages their profile, THE system SHALL:
1. Allow editing of display name
2. Allow editing of phone number
3. Require a display name for profile completion
4. Preserve the profile data in snapshots when modified

WHEN a customer changes their password, THE system SHALL:
1. Require the current password for verification
2. Require the new password to meet security requirements
3. Hash the new password before storage
4. Invalidate existing sessions after password change

IF the display name is empty, THE system SHALL reject the profile update.
IF the current password is incorrect, THE system SHALL reject the password change request.
IF the new password does not meet security requirements, THE system SHALL reject the password change request.

### Shipping Address Management

WHEN a customer manages shipping addresses, THE system SHALL:
1. Allow adding multiple shipping addresses
2. Require recipient name, phone number, street address, city, postal code for each address
3. Allow editing of existing addresses
4. Allow deletion of addresses
5. Allow setting one address as the default shipping address

WHEN a customer sets a default address, THE system SHALL:
1. Ensure only one address is marked as default at a time
2. Use the default address during checkout if no other address is selected

IF the required address fields are missing, THE system SHALL reject the address creation.
IF the customer tries to delete the only address, THE system SHALL require adding a new address first.
IF the address does not exist, THE system SHALL reject the edit or delete request.

### Product Browsing and Search

WHEN a customer browses products, THE system SHALL:
1. Display products from all sellers in search results
2. Show product main image, name, base price, seller shop name, and average rating
3. Paginate product listing results
4. Allow viewing product details including all images, description, category, variants, and reviews

WHEN a customer searches for products, THE system SHALL:
1. Search products by name
2. Allow filtering by category
3. Allow filtering by price range (minimum and maximum)
4. Allow filtering by in-stock availability
5. Allow sorting by newest first, price low to high, and price high to low

IF the search query is empty, THE system SHALL return all products or show an appropriate message.
IF no products match the search criteria, THE system SHALL display an empty results message.
IF a product is deleted by the seller, THE system SHALL exclude it from search results.

### Wishlist Management

WHEN a customer manages their wishlist, THE system SHALL:
1. Allow adding products to the wishlist
2. Allow viewing the wishlist with pagination
3. Allow removing products from the wishlist
4. Automatically remove products from wishlists when sellers delete them

WHEN a wishlist displays products, THE system SHALL:
1. Show products (not specific variants)
2. Display product name, main image, and current price
3. Indicate if a product is unavailable or out of stock

IF the product is deleted by the seller, THE system SHALL automatically remove it from all customer wishlists.
IF the customer tries to add a product already in their wishlist, THE system SHALL not create a duplicate entry.

### Shopping Cart Operations

WHEN a customer manages their shopping cart, THE system SHALL:
1. Allow adding product variants to the cart (must select specific variant)
2. Require quantity specification when adding to cart
3. Combine quantities if the same variant is already in the cart
4. Allow viewing the cart with item details (product name, variant options, price, quantity, subtotal)
5. Allow changing quantities of items in the cart
6. Allow removing items from the cart
7. Display the total price of all cart items
8. Show a warning if variant stock is less than cart quantity
9. Mark items as unavailable if the variant is deleted or out of stock

IF the variant stock is zero, THE system SHALL prevent adding the item to the cart.
IF the variant is deleted, THE system SHALL mark it as unavailable in the cart.
IF the cart quantity exceeds available stock, THE system SHALL display a warning but allow keeping the item in cart.

### Checkout and Order Placement

WHEN a customer proceeds to checkout, THE system SHALL:
1. Prevent checkout if cart contains unavailable items
2. Require selection of a shipping address (or use default)
3. Display order summary with item list, prices, shipping address, and total
4. Prevent changes to shipping address after order placement

WHEN a customer confirms and places an order, THE system SHALL:
1. Process payment through the external payment gateway
2. Create an order record if payment succeeds
3. Decrease stock quantities for each purchased variant
4. Remove purchased items from the customer's cart
5. Create order items with status "paid" for each purchased variant
6. Save snapshots of each purchased product, variant, and seller profile

IF payment fails, THE system SHALL not create the order and allow the customer to retry.
IF the payment succeeds, THE system SHALL create the order and complete all associated operations.
IF the customer tries to checkout with unavailable items, THE system SHALL prevent the checkout process.

### Order History Viewing

WHEN a customer views order history, THE system SHALL:
1. Display a paginated list of all orders sorted by newest first
2. Show order number, date, total price, and overall status for each order
3. Allow viewing full order details including items, shipping address, and shipments
4. Display item details with product name, variant, quantity, price, and status
5. Display shipment tracking information for each shipment

WHEN an order status is displayed, THE system SHALL:
1. Show "paid" if all items are paid
2. Show "shipped" if any item is shipped (and none delivered)
3. Show "delivered" if all items are delivered
4. Show "cancelled" if all items are cancelled
5. Show "refunded" if all items are refunded
6. Show "partially completed" for mixed states

IF an order does not exist, THE system SHALL reject the detail view request.
IF the customer does not own the order, THE system SHALL reject the detail view request.

### Shipment Tracking and Delivery Confirmation

WHEN a customer tracks shipments, THE system SHALL:
1. Display tracking information (carrier name, tracking number) for each shipment
2. Allow delivery confirmation per shipment
3. Automatically mark items as "delivered" 14 days after shipping if not confirmed

WHEN a customer confirms delivery, THE system SHALL:
1. Change all items in the confirmed shipment to status "delivered"
2. Update the overall order status based on item statuses

IF the shipment does not exist, THE system SHALL reject the tracking view request.
IF the customer does not own the order containing the shipment, THE system SHALL reject the delivery confirmation.

### Order Cancellation Requests

WHEN a customer requests order cancellation, THE system SHALL:
1. Allow cancellation requests only for items with status "paid" (not yet shipped)
2. Require a reason for the cancellation request
3. Create a snapshot of the cancellation request state
4. Allow the seller to approve or reject the request
5. Restore stock quantities when cancellation is approved
6. Update order status to "cancelled" if all items are cancelled

IF the item status is not "paid", THE system SHALL reject the cancellation request.
IF the item has already been shipped, THE system SHALL reject the cancellation request.
IF the cancellation request does not exist, THE system SHALL reject the status update request.

### Order Refund Requests

WHEN a customer requests a refund, THE system SHALL:
1. Allow refund requests only for items with status "delivered"
2. Require a reason for the refund request
3. Only allow refund requests within 7 days of delivery
4. Create a snapshot of the refund request state
5. Allow the seller to approve or reject the request
6. Restore stock quantities when refund is approved
7. Update order status to "refunded" if all items are refunded

IF the item status is not "delivered", THE system SHALL reject the refund request.
IF more than 7 days have passed since delivery, THE system SHALL reject the refund request.
IF the refund request does not exist, THE system SHALL reject the status update request.

### Review Management

WHEN a customer writes a review, THE system SHALL:
1. Allow reviews only for products where the item status is "delivered"
2. Allow one review per product per order
3. Require a rating (1 to 5 stars)
4. Allow optional text content
5. Display reviews on the product detail page sorted by newest first
6. Calculate product average rating from non-deleted reviews

WHEN a customer edits a review, THE system SHALL:
1. Allow editing of their own reviews
2. Create a snapshot of the review before modification
3. Update the average rating after the edit

WHEN a customer deletes a review, THE system SHALL:
1. Allow deletion of their own reviews
2. Preserve the review snapshot
3. Mark the review as deleted (not remove from database)
4. Recalculate the average rating excluding deleted reviews

IF the customer has not purchased the product with delivered status, THE system SHALL reject the review creation.
IF the customer already reviewed this product in this order, THE system SHALL reject the duplicate review.
IF the rating is outside 1-5 range, THE system SHALL reject the review creation or update.

### Account Deletion

WHEN a customer deletes their account, THE system SHALL:
1. Delete the customer's profile information (display name, phone number)
2. Preserve all orders and order history for seller records and legal purposes
3. Preserve all reviews but display them as "deleted user"
4. Remove the customer from all wishlists
5. Remove the customer from all shopping carts

IF the customer has active pending orders, THE system SHALL warn them about order preservation before deletion.
IF the customer tries to delete an account that does not exist, THE system SHALL reject the request.

## seller Actor

Sellers are registered users who list and sell products on the platform after administrator approval. Registration requires email and password, and accounts remain in pending status until an administrator reviews and approves them. Rejected sellers can view the rejection reason and submit a new registration request. Sellers maintain a shop profile with shop name, description, and logo image, with each edit creating an immutable snapshot for audit purposes. Sellers create products with required name, description, category, and base price. They manage product images, uploading multiple photos and reordering them for display. Sellers define product variants with SKU codes, option values, prices, and stock quantities. Inventory is managed through history records that track all stock changes with reasons and timestamps. Sellers can restock inventory or make adjustments for losses. Products must have at least one variant to be purchasable. Sellers edit their products, with each modification creating a complete snapshot including all variant data. Sellers can delete products and variants only when there are no pending orders or cancellation/refund requests. Sellers view order items for their products filtered by status. They process shipments by selecting items to bundle and entering carrier and tracking information. Sellers approve or reject customer cancellation requests for items in paid status. Sellers approve or reject refund requests for delivered items within the seven-day window. Sellers access a dashboard showing product counts, order item totals, and pending request counts. When a seller deletes their account, products are removed from listings but order history and snapshots are preserved.

### Seller Registration and Administrator Approval

WHEN a seller registers on the platform, THE system SHALL:
1. Require email and password for account creation
2. Set the initial approval status to "pending"
3. Prevent access to selling features until approved
4. Allow the seller to view their current approval status

WHEN an administrator reviews a seller registration, THE system SHALL:
1. Allow approval to change status to "approved"
2. Allow rejection to change status to "rejected" with a required reason
3. Notify the seller of the approval decision

WHEN a seller's registration is rejected, THE system SHALL:
1. Display the rejection reason to the seller
2. Allow the seller to submit a new registration request
3. Reset the approval status to "pending" for the new request

IF a seller attempts to access selling features while pending or rejected, THE system SHALL deny access and display the current approval status.

### Approval Status and Rejection Management

WHEN a seller views their approval status, THE system SHALL display one of: "pending", "approved", or "rejected".

WHEN a seller's registration is rejected, THE system SHALL display the administrator-provided rejection reason.

WHEN a seller submits a new registration request after rejection, THE system SHALL:
1. Reset the approval status to "pending"
2. Clear the previous rejection reason
3. Require the administrator to review the new request

IF a seller is approved, THE system SHALL enable access to all selling features including product creation, inventory management, and order processing.

### Shop Profile Management

WHEN a seller manages their shop profile, THE system SHALL:
1. Require a shop name as a mandatory field
2. Allow an optional shop description
3. Allow an optional logo image upload
4. Create an immutable snapshot for each profile edit

WHEN a seller edits their shop name, THE system SHALL:
1. Record the previous shop name in a snapshot
2. Record the timestamp of the change
3. Record which seller made the change

WHEN a seller edits their shop description, THE system SHALL:
1. Record the previous description in a snapshot
2. Record the timestamp of the change
3. Record which seller made the change

WHEN a seller updates their logo image, THE system SHALL:
1. Record the previous logo reference in a snapshot
2. Record the timestamp of the change
3. Record which seller made the change

WHEN a customer views a seller's profile, THE system SHALL display the current shop name, description, and logo (defined in 02-domain-model.md).

### Product Creation and Editing

WHEN a seller creates a product, THE system SHALL:
1. Require a product name
2. Require a product description
3. Require a category selection (product or subcategory)
4. Require a base price
5. Associate the product with the creating seller
6. Set the initial product status to "active"

WHEN a seller edits their product, THE system SHALL:
1. Allow modification of name, description, category, and base price
2. Create a complete product snapshot before applying changes
3. Include all variant data in the snapshot
4. Record the timestamp and the seller who made the change

WHEN a seller uploads product images, THE system SHALL:
1. Allow multiple images per product
2. Allow reordering of images (first image is the main/thumbnail)
3. Allow deletion of individual images
4. Include image changes in product snapshots

IF a seller attempts to edit a product they do not own, THE system SHALL deny the request.

### Variant Creation, Editing, and Deletion

WHEN a seller deletes a product, THE system SHALL:
1. Verify no pending order items exist for any variant (paid or shipped status)
2. Verify no pending cancellation or refund requests exist for any variant
3. Delete all product variants and inventory records
4. Change the product status to "deleted"
5. Remove the product from search and category listings
6. Preserve all product snapshots for audit purposes

WHEN a seller creates a product variant, THE system SHALL:
1. Require a unique SKU code
2. Require option values (e.g., color, size combinations)
3. Require a stock quantity (starts at 0)
4. Allow an optional price override of the base price
5. Create a variant snapshot recording the initial state

WHEN a seller edits a variant, THE system SHALL:
1. Allow modification of SKU code, option values, and price
2. Create a variant snapshot before applying changes
3. Record the timestamp and the seller who made the change

WHEN a seller deletes a variant, THE system SHALL:
1. Verify no pending order items exist for that variant (paid or shipped status)
2. Verify no pending cancellation or refund requests exist for that variant
3. Delete all inventory records for the variant
4. Create a variant snapshot recording the deletion

IF a product has no variants, THE system SHALL display it as "unavailable" in search results but still show it in listings.

### Inventory Management and History

WHEN a seller restocks inventory for a variant, THE system SHALL:
1. Record a positive quantity change
2. Require a reason for the restock
3. Record the timestamp of the change
4. Update the current stock quantity
5. Create an inventory history record (not a snapshot)

WHEN a seller adjusts inventory for a variant (loss/adjustment), THE system SHALL:
1. Record a negative quantity change
2. Require a reason for the adjustment
3. Record the timestamp of the change
4. Update the current stock quantity
5. Create an inventory history record (not a snapshot)

WHEN a seller views inventory history for a variant, THE system SHALL display:
1. All inventory records in chronological order
2. Quantity change (positive or negative)
3. Reason for each change
4. Timestamp of each record
5. Running stock total after each change

IF a variant's stock quantity reaches 0, THE system SHALL display it as "out of stock" and prevent customers from adding it to their cart.

### Order Item Viewing and Shipment Processing

WHEN a seller views order items for their products, THE system SHALL:
1. Display all order items containing their products
2. Allow filtering by item status (paid, shipped, delivered, cancelled, refunded)
3. Display item details including product name, variant, quantity, price, and status
4. Paginate the results for large datasets

WHEN a seller processes a shipment, THE system SHALL:
1. Allow selection of one or more paid items from the same seller
2. Require carrier name and tracking number
3. Create a shipment record linking the selected items
4. Change all items in the shipment to "shipped" status
5. Record the shipping timestamp

WHEN a seller enters tracking information for a shipment, THE system SHALL:
1. Require a carrier name
2. Require a tracking number
3. Display the tracking information to customers for the shipment
4. Associate the tracking information with all items in the shipment

### Cancellation and Refund Request Response

WHEN a seller responds to a cancellation request, THE system SHALL:
1. Display the cancellation request reason
2. Allow the seller to approve or reject the request
3. Create a snapshot of the request state when responding
4. Record the response timestamp
5. If approved: cancel the item, process refund, and restore stock via inventory record
6. If rejected: mark the request as rejected and notify the customer

WHEN a seller responds to a refund request, THE system SHALL:
1. Display the refund request reason
2. Verify the request is within 7 days of delivery for that item
3. Allow the seller to approve or reject the request
4. Create a snapshot of the request state when responding
5. Record the response timestamp
6. If approved: refund the item and restore stock via inventory record
7. If rejected: mark the request as rejected and notify the customer

IF a cancellation or refund request is for an item the seller does not own, THE system SHALL deny access to the request.

### Seller Dashboard and Account Lifecycle

WHEN a seller accesses their dashboard, THE system SHALL display:
1. Total number of products in their shop
2. Total number of order items for their products
3. Number of pending cancellation requests
4. Number of pending refund requests

WHEN a seller is deleted by themselves, THE system SHALL:
1. Verify no pending orders exist (paid or shipped status)
2. Verify no pending cancellation or refund requests exist
3. Delete all products from listings
4. Preserve order history and snapshots
5. Preserve shop name in past order records
6. Mark the seller account as deleted

IF a seller has pending orders or requests, THE system SHALL prevent account deletion and display the blocking items.

WHEN a seller is banned by an administrator, THE system SHALL:
1. Prevent login access
2. Preserve existing orders for fulfillment
3. Hide products from search and category listings

WHEN a seller is suspended by an administrator, THE system SHALL:
1. Hide products from search and category listings
2. Prevent new product creation
3. Prevent product edits
4. Allow processing of existing orders (shipping, cancellation/refund responses)

## admin Actor

Administrators manage platform operations and enforce policies across customer and seller accounts. There are two administrator grades: regular administrators and super administrators. Any user can submit a request to become an administrator with a reason for consideration. Super administrators approve or reject administrator requests and can promote regular administrators to super administrator status. Super administrators can demote other super administrators to regular status but cannot demote themselves. Administrators view and manage pending seller registration approvals, approving or rejecting with reasons. Rejected sellers may submit new registration requests. Administrators can suspend seller accounts, which hides their products from listings and prevents new purchases while allowing existing order processing. Administrators can unsuspend seller accounts to restore visibility. Administrators create, edit, and delete product categories and subcategories. When categories are deleted, products become uncategorized. Administrators view all products on the platform and can access product snapshots for dispute resolution. Administrators can delete products for policy violations. Administrators view all orders and order items across the platform. They can force-cancel individual items or entire orders, processing refunds and restoring stock. Administrators can force-refund individual items or entire orders. Administrators view all customer and seller accounts. They can ban customers, preventing login access, and unban them to restore access. Administrators can ban sellers, preventing login while preserving existing orders. Super administrators have elevated privileges over regular administrators for managing administrator roles.

### Administrator Account Management

WHEN a user submits a request to become an administrator, THE system SHALL:
1. Record the request with the provided reason
2. Set the request status to pending
3. Notify super administrators of the pending request

THE system SHALL maintain two administrator grades: regular administrator and super administrator.

WHEN a super administrator reviews an administrator request, THE system SHALL:
1. Allow approval of the request, granting regular administrator status
2. Allow rejection of the request with a recorded reason
3. Update the requester's account with the administrator role upon approval

WHEN a super administrator promotes a regular administrator, THE system SHALL:
1. Update the administrator's grade to super administrator
2. Record the promotion in the audit trail

WHEN a super administrator demotes another super administrator, THE system SHALL:
1. Update the demoted administrator's grade to regular administrator
2. Record the demotion in the audit trail

THE system SHALL NOT allow a super administrator to demote themselves.

IF an administrator's grade is changed, THE system SHALL update their permissions immediately.

### Seller Account Management

WHEN an administrator views pending seller registrations, THE system SHALL:
1. Display all sellers with pending approval status
2. Allow administrators to approve or reject each seller

WHEN an administrator approves a seller registration, THE system SHALL:
1. Update the seller's approval status to approved
2. Enable the seller to create products and manage their shop

WHEN an administrator rejects a seller registration, THE system SHALL:
1. Update the seller's approval status to rejected
2. Require the administrator to provide a rejection reason
3. Allow the rejected seller to view the rejection reason
4. Allow the rejected seller to submit a new registration request

WHEN an administrator suspends a seller account, THE system SHALL:
1. Hide all products from the suspended seller in search and category listings
2. Prevent the suspended seller's products from being purchased
3. Allow the suspended seller to process existing orders (ship items, respond to cancellation/refund requests)
4. Prevent the suspended seller from creating new products
5. Prevent the suspended seller from editing existing products

WHEN an administrator unsuspends a seller account, THE system SHALL:
1. Restore visibility of the seller's products in search and category listings
2. Allow the seller's products to be purchased
3. Restore the seller's ability to create and edit products

WHEN an administrator bans a seller account, THE system SHALL:
1. Prevent the seller from logging in
2. Preserve all existing orders for the banned seller
3. Maintain order history and snapshots for the banned seller

### Customer Account Management

WHEN an administrator views customer accounts, THE system SHALL:
1. Display a list of all customer accounts on the platform
2. Allow administrators to view customer profile information

WHEN an administrator bans a customer account, THE system SHALL:
1. Prevent the customer from logging in
2. Preserve the customer's order history
3. Preserve the customer's reviews (shown as deleted user)

WHEN an administrator unbans a customer account, THE system SHALL:
1. Restore the customer's ability to log in
2. Restore the customer's access to their order history
3. Restore the customer's access to their profile

### Category Management

WHEN an administrator creates a category, THE system SHALL:
1. Require a category name
2. Allow an optional description
3. Allow selection of a parent category for subcategories
4. Enforce one level of nesting only (categories can have subcategories, but subcategories cannot have further subcategories)

WHEN an administrator edits a category, THE system SHALL:
1. Allow updating the category name
2. Allow updating the category description
3. Record the change in an audit trail

WHEN an administrator deletes a category, THE system SHALL:
1. Remove all products in the deleted category from that category (products become uncategorized)
2. Preserve the products themselves
3. Record the deletion in an audit trail

### Product Oversight

WHEN an administrator views products, THE system SHALL:
1. Display all products on the platform regardless of seller status
2. Allow filtering by seller, category, or status

WHEN an administrator views product snapshots, THE system SHALL:
1. Display all snapshots for any product on the platform
2. Show the previous and current values for each snapshot
3. Show when the change was made and who made it

WHEN an administrator deletes a product for policy violations, THE system SHALL:
1. Remove the product from search and category listings
2. Preserve all product snapshots for audit purposes
3. Preserve order items that reference the deleted product
4. Prevent the product from being purchased

### Order Oversight

WHEN an administrator views orders, THE system SHALL:
1. Display all orders on the platform
2. Allow filtering by customer, seller, status, or date range
3. Allow viewing of order item details

WHEN an administrator force-cancels an order item, THE system SHALL:
1. Update the order item status to cancelled
2. Process a refund for the customer
3. Restore the stock quantity for the variant (via inventory record)
4. Record the force-cancellation in an audit trail

WHEN an administrator force-cancels an entire order, THE system SHALL:
1. Update all order items in the order to cancelled status
2. Process refunds for all items
3. Restore stock quantities for all variants
4. Update the order status to cancelled

WHEN an administrator force-refunds an order item, THE system SHALL:
1. Update the order item status to refunded
2. Process a refund for the customer
3. Restore the stock quantity for the variant (via inventory record)
4. Record the force-refund in an audit trail

WHEN an administrator force-refunds an entire order, THE system SHALL:
1. Update all order items in the order to refunded status
2. Process refunds for all items
3. Restore stock quantities for all variants
4. Update the order status to refunded

# Authentication Flows

Registration, login, session management, and token policies.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Customer Registration

WHEN a customer registers for the platform, THE system SHALL:
1. Require a valid email address
2. Require a password
3. Ensure the email is unique across all customer accounts
4. Hash the password before storage
5. Create the customer account with active status
6. Require the customer to log in before accessing any features (no guest browsing)

WHEN a customer submits registration, THE system SHALL:
1. Validate the email format
2. Validate the password meets security requirements
3. Check if the email already exists in the system

IF the email format is invalid, THE system SHALL reject the registration request.
IF the password does not meet security requirements, THE system SHALL reject the registration request.
IF the email already exists, THE system SHALL reject the registration request and inform the customer.

A registered customer account shall have the following initial state:
- Account status: active
- Display name: optional (can be empty)
- Phone number: optional (can be empty)

### Seller Registration

WHEN a seller registers for the platform, THE system SHALL:
1. Require a valid email address
2. Require a password
3. Require a shop name
4. Ensure the email is unique across all seller accounts
5. Hash the password before storage
6. Create the seller account with pending approval status
7. Create an initial seller profile with the provided shop name

WHEN a seller submits registration, THE system SHALL:
1. Validate the email format
2. Validate the password meets security requirements
3. Validate the shop name is provided
4. Check if the email already exists in the system

IF the email format is invalid, THE system SHALL reject the registration request.
IF the password does not meet security requirements, THE system SHALL reject the registration request.
IF the shop name is missing, THE system SHALL reject the registration request.
IF the email already exists, THE system SHALL reject the registration request and inform the seller.

A registered seller account shall have the following initial state:
- Approval status: pending
- Shop description: optional (can be empty)
- Logo image: optional (can be empty)
- Products: none (cannot create products until approved)

### Administrator Request Registration

WHEN any user (customer or seller) requests to become an administrator, THE system SHALL:
1. Require the user to be logged in
2. Require a reason for the administrator request
3. Create an administrator request record with pending status
4. Allow the user to view the status of their request

WHEN a super administrator reviews an administrator request, THE system SHALL:
1. Allow approval which grants regular administrator privileges
2. Allow rejection with a reason

IF the request is approved, THE system SHALL update the user's role to regular administrator.
IF the request is rejected, THE system SHALL store the rejection reason and allow the user to submit a new request.

A user can have only one pending administrator request at a time.
A user cannot submit a new administrator request while a previous request is pending.

### Login Authentication

WHEN a customer logs in, THE system SHALL:
1. Require a valid email address
2. Require the correct password
3. Verify the account is not banned or suspended
4. Create a session upon successful authentication
5. Allow access to customer features

WHEN a seller logs in, THE system SHALL:
1. Require a valid email address
2. Require the correct password
3. Verify the account is not banned or suspended
4. Create a session upon successful authentication
5. Allow access to seller features based on approval status

WHEN an administrator logs in, THE system SHALL:
1. Require a valid email address
2. Require the correct password
3. Verify the account is not banned or suspended
4. Create a session upon successful authentication
5. Allow access to administrator features based on grade (regular or super)

IF the email does not exist, THE system SHALL reject the login attempt.
IF the password is incorrect, THE system SHALL reject the login attempt.
IF the account is banned, THE system SHALL reject the login attempt and inform the user.
IF the account is suspended, THE system SHALL reject the login attempt and inform the user.

### Seller Approval Status After Login

WHEN a seller with pending approval status logs in, THE system SHALL:
1. Allow login to the seller dashboard
2. Allow viewing of the approval status
3. Prevent creation of products until approved
4. Prevent editing of existing products until approved

WHEN a rejected seller logs in, THE system SHALL:
1. Allow login to the seller dashboard
2. Allow viewing of the rejection reason
3. Allow submission of a new registration request

IF a seller is approved, THE system SHALL allow all seller operations including product creation and management.
IF a seller is rejected, THE system SHALL prevent product operations until a new registration is approved.

### Password Change

WHEN a customer changes their password, THE system SHALL:
1. Require the current password for verification
2. Require a new password that meets security requirements
3. Hash the new password before storage
4. Invalidate all existing sessions for security
5. Require re-login with the new password

WHEN a seller changes their password, THE system SHALL:
1. Require the current password for verification
2. Require a new password that meets security requirements
3. Hash the new password before storage
4. Invalidate all existing sessions for security
5. Require re-login with the new password

IF the current password is incorrect, THE system SHALL reject the password change request.
IF the new password does not meet security requirements, THE system SHALL reject the password change request.

### Account Deletion

WHEN a customer deletes their account, THE system SHALL:
1. Require confirmation of the deletion
2. Delete the customer's profile information (display name, phone number)
3. Preserve all orders and order history for legal and seller record purposes
4. Preserve all reviews but mark them as from "deleted user"
5. Remove the customer from all wishlists
6. Remove the customer from all shopping carts
7. Invalidate all existing sessions

WHEN a seller deletes their account, THE system SHALL:
1. Verify there are no pending orders (paid or shipped status)
2. Verify there are no pending cancellation or refund requests
3. Delete the seller's profile information (shop name, description, logo)
4. Delete all products from listings
5. Preserve order history and snapshots
6. Preserve shop name in past orders for record integrity
7. Invalidate all existing sessions

IF a seller has pending orders, THE system SHALL reject the account deletion request.
IF a seller has pending cancellation or refund requests, THE system SHALL reject the account deletion request.

## Session and Token Policy

Define session duration, token refresh, and expiration policies.

### Session Creation and Management

THE system SHALL allow customers to create a session upon successful authentication.

THE system SHALL allow sellers to create a session upon successful authentication.

THE system SHALL allow administrators to create a session upon successful authentication.

THE system SHALL allow users to maintain multiple concurrent sessions.

THE system SHALL allow users to view their active sessions.

THE system SHALL allow users to terminate individual active sessions.

THE system SHALL allow users to terminate all active sessions except the current one.

THE system SHALL invalidate sessions when a user logs out.

THE system SHALL invalidate all sessions when a user deletes their account.

THE system SHALL invalidate all sessions when a customer account is banned.

THE system SHALL invalidate all sessions when a seller account is banned.

THE system SHALL invalidate all sessions when a seller account is suspended.

### JWT Token Structure and Usage

THE system SHALL issue JWT tokens for authenticated sessions.

THE system SHALL include user identification in JWT tokens.

THE system SHALL include user role information in JWT tokens.

THE system SHALL include session identification in JWT tokens.

THE system SHALL include token issuance timestamp in JWT tokens.

THE system SHALL include token expiration timestamp in JWT tokens.

THE system SHALL sign all JWT tokens with a server-side secret key.

THE system SHALL validate JWT token signatures on protected requests.

THE system SHALL reject requests with invalid or tampered JWT tokens.

THE system SHALL NOT store sensitive user data in JWT tokens.

THE system SHALL include user account status in JWT tokens.

THE system SHALL invalidate existing JWT tokens when user account status changes.

THE system SHALL include a unique token identifier in each JWT token.

### Token Refresh Mechanism

THE system SHALL issue refresh tokens alongside access tokens.

THE system SHALL store refresh tokens server-side.

THE system SHALL associate each refresh token with exactly one session.

THE system SHALL allow users to request token refresh without re-authentication.

THE system SHALL issue new access tokens when refresh tokens are valid.

THE system SHALL issue new refresh tokens when refresh tokens are valid.

THE system SHALL invalidate old refresh tokens after successful refresh.

THE system SHALL reject requests with expired refresh tokens.

THE system SHALL reject requests with invalid or tampered refresh tokens.

THE system SHALL require re-authentication when refresh tokens are rejected.

THE system SHALL detect and reject refresh token reuse attempts.

THE system SHALL invalidate all tokens for a session when refresh token reuse is detected.

### Token Expiration and Handling

THE system SHALL configure access token expiration duration.

THE system SHALL configure refresh token expiration duration.

THE system SHALL allow clients to refresh expired access tokens using refresh tokens.

THE system SHALL require re-authentication when refresh tokens expire.

THE system SHALL reject protected requests with expired access tokens.

THE system SHALL provide expiration indicators for expired tokens.

THE system SHALL allow clients to detect token expiration before making requests.

THE system SHALL not process protected requests with expired tokens.

THE system SHALL allow proactive token refresh before expiration.

THE system SHALL not extend token expiration based on user activity.

# Account Lifecycle

Account state transitions and lifecycle management.

## Account States and Transitions

Define account states (active, suspended, deleted) and valid transitions.

### Account States Definition

THE system SHALL define customer account states as: active, suspended, and banned.

THE system SHALL define seller account states as: active, suspended, and banned.

THE system SHALL define seller approval status as: pending, approved, and rejected (separate from account state).

THE system SHALL define administrator grades as: regular administrator and super administrator.

WHEN a customer account is created, THE system SHALL set the account state to active.

WHEN a seller account is created, THE system SHALL set the account state to active and the approval status to pending.

WHEN an administrator account is created, THE system SHALL set the account state to active and the grade to regular administrator.

THE system SHALL preserve all account states in the system records for audit purposes.

### Account State Transitions

WHEN a customer is suspended by an administrator, THE system SHALL change the account state from active to suspended.

WHEN a customer is banned by an administrator, THE system SHALL change the account state from active or suspended to banned.

WHEN a customer is unbanned by an administrator, THE system SHALL change the account state from banned to active.

WHEN a customer is unsuspended by an administrator, THE system SHALL change the account state from suspended to active.

WHEN a seller is suspended by an administrator, THE system SHALL change the account state from active to suspended.

WHEN a seller is banned by an administrator, THE system SHALL change the account state from active or suspended to banned.

WHEN a seller is unbanned by an administrator, THE system SHALL change the account state from banned to active.

WHEN a seller is unsuspended by an administrator, THE system SHALL change the account state from suspended to active.

WHEN a seller's approval is rejected by an administrator, THE system SHALL change the approval status from pending to rejected.

WHEN a seller submits a new registration request after rejection, THE system SHALL change the approval status from rejected to pending.

WHEN a seller's approval is granted by an administrator, THE system SHALL change the approval status from pending to approved.

A seller account SHALL NOT transition from approved to pending without account deletion and re-registration.

WHEN a super administrator promotes a regular administrator, THE system SHALL change the grade from regular administrator to super administrator.

WHEN a super administrator demotes a super administrator (not themselves), THE system SHALL change the grade from super administrator to regular administrator.

### Account Suspension and Bans

WHEN an administrator suspends a seller, THE system SHALL hide all their products from search and category listings.

WHEN a seller is suspended, THE system SHALL prevent their products from being purchased.

WHILE a seller is suspended, THE system SHALL allow them to process existing orders (ship items, respond to cancellation and refund requests).

WHILE a seller is suspended, THE system SHALL prevent them from creating new products.

WHILE a seller is suspended, THE system SHALL prevent them from editing existing products.

WHEN a seller is banned, THE system SHALL prevent them from logging in.

WHEN a customer is banned, THE system SHALL prevent them from logging in.

WHEN a customer is banned, THE system SHALL preserve their order history and account data for administrative records.

WHEN a seller is banned, THE system SHALL preserve their existing orders and order history.

WHILE a seller is banned, THE system SHALL prevent them from logging in.

WHILE a seller is banned, THE system SHALL preserve their existing orders for fulfillment purposes.

### Account Deletion Rules

WHEN a customer requests account deletion, THE system SHALL delete their profile information (display name and phone number).

WHEN a customer requests account deletion, THE system SHALL preserve their orders and order history for seller records and legal purposes.

WHEN a customer requests account deletion, THE system SHALL preserve their reviews but display them as from a "deleted user".

WHEN a customer requests account deletion, THE system SHALL remove them from all wishlists (products remain in wishlists of other customers).

WHEN a customer requests account deletion, THE system SHALL remove all their shopping cart items.

WHEN a seller requests account deletion, THE system SHALL verify they have no pending orders (paid or shipped status).

WHEN a seller requests account deletion, THE system SHALL verify they have no pending cancellation or refund requests.

IF a seller has pending orders or pending cancellation/refund requests, THE system SHALL reject the deletion request and inform the seller.

WHEN a seller's account deletion is approved, THE system SHALL delete their products from listings.

WHEN a seller's account deletion is approved, THE system SHALL preserve their order history and snapshots.

WHEN a seller's account deletion is approved, THE system SHALL preserve their shop name in past orders.

WHEN a seller's account deletion is approved, THE system SHALL remove all their products and variants.

WHEN a seller's account deletion is approved, THE system SHALL delete all inventory records for their product variants.

A seller SHALL NOT delete their account if they have products with pending order items in paid or shipped status.

A seller SHALL NOT delete their account if they have pending cancellation or refund requests for any of their products.

### Account and Entity Deactivation

WHEN a customer deactivates their account through deletion, THE system SHALL mark the account as deleted and prevent future logins.

WHEN a seller deactivates their account through deletion, THE system SHALL mark the account as deleted and prevent future logins.

WHEN a product is deleted by its seller, THE system SHALL automatically remove it from all customer wishlists.

WHEN a product is deleted by its seller, THE system SHALL preserve all product snapshots for historical records.

WHEN a product is deleted by an administrator, THE system SHALL remove it from search and category listings.

WHEN a product is deleted by an administrator, THE system SHALL preserve all product snapshots for audit purposes.

WHEN a product variant is deleted by its seller, THE system SHALL mark it as unavailable in all shopping carts.

WHEN a product variant is deleted by its seller, THE system SHALL prevent it from being added to shopping carts.

WHEN a category is deleted by an administrator, THE system SHALL mark products in that category as uncategorized.

WHEN a category is deleted by an administrator, THE system SHALL preserve the category record for historical reference.

DELETED entities SHALL remain in the system for audit and legal compliance purposes, even when removed from user-facing views.