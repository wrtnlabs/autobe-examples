**ecommerceMall — Data isolation, business rules, filtering/sorting/pagination, error catalog**

Data isolation, business rules, filtering/sorting/pagination, error catalog

# Data Isolation and Ownership

Data ownership rules and tenant/user-level isolation policies.

## Ownership and Isolation Rules

Define data ownership semantics and isolation boundaries for multi-user access.

### Data Ownership Rules

### Customer Data Ownership

THE system SHALL associate all customer-specific data with the authenticated customer account.

WHEN a customer creates an address, THE system SHALL mark that address as owned by that customer.

WHEN a customer adds items to their cart, THE system SHALL associate those cart items with that customer.

WHEN a customer adds products to their wishlist, THE system SHALL associate those wishlist entries with that customer.

WHEN a customer places an order, THE system SHALL mark that order as owned by that customer.

WHEN a customer writes a review, THE system SHALL associate that review with that customer.

IF a customer deletes their account, THE system SHALL remove their profile information but preserve their order history for legal and seller record purposes.

IF a customer deletes their account, THE system SHALL preserve their reviews but display them as authored by a "deleted user".

### Seller Data Ownership

THE system SHALL associate all seller-specific data with the seller account that created it.

WHEN a seller creates a product, THE system SHALL mark that product as owned by that seller.

WHEN a seller creates product variants, THE system SHALL mark those variants as owned by that seller.

WHEN a seller manages inventory for a variant, THE system SHALL associate inventory records with that seller's product.

WHEN a seller edits their shop profile, THE system SHALL create snapshots and associate them with that seller.

IF a seller deletes their account, THE system SHALL delete their products from listings but preserve order history and snapshots.

IF a seller deletes their account, THE system SHALL preserve their shop name in past orders for historical accuracy.

### Administrator Data Ownership

THE system SHALL grant administrators ownership over platform-wide configurations.

WHEN an administrator creates a category, THE system SHALL mark that category as managed by administrators.

WHEN an administrator approves a seller, THE system SHALL record the administrator who performed the approval.

WHEN an administrator suspends a seller account, THE system SHALL record the administrator who performed the suspension.

WHEN an administrator deletes a product for policy violations, THE system SHALL record the administrator who performed the deletion.

### Shared Data Ownership

THE system SHALL treat orders containing items from multiple sellers as shared ownership scenarios.

WHEN an order contains items from multiple sellers, THE system SHALL allow each seller to manage only their own order items.

WHEN an order contains items from multiple sellers, THE system SHALL allow the customer to view the complete order.

WHEN an order is placed, THE system SHALL associate the order with the customer but grant each relevant seller access to their order items.

### Multi-User Data Isolation

### Customer Data Isolation

WHEN a customer accesses their data, THE system SHALL restrict access to only that customer's own records.

WHEN a customer views their addresses, THE system SHALL display only addresses belonging to that customer.

WHEN a customer views their cart, THE system SHALL display only cart items belonging to that customer.

WHEN a customer views their wishlist, THE system SHALL display only wishlist entries belonging to that customer.

WHEN a customer views their order history, THE system SHALL display only orders placed by that customer.

WHEN a customer views their reviews, THE system SHALL display only reviews written by that customer.

IF a customer attempts to access another customer's data, THE system SHALL deny the request.

### Seller Data Isolation

WHEN a seller accesses their data, THE system SHALL restrict access to only that seller's own records.

WHEN a seller views their products, THE system SHALL display only products created by that seller.

WHEN a seller views order items for their products, THE system SHALL display only items related to their products.

WHEN a seller views their shop profile, THE system SHALL display only that seller's profile information.

WHEN a seller views inventory for a variant, THE system SHALL display only inventory records for their variants.

IF a seller attempts to access another seller's products, THE system SHALL deny the request.

IF a seller attempts to modify another seller's product, THE system SHALL deny the request.

### Cross-Seller Order Isolation

WHEN an order contains items from multiple sellers, THE system SHALL isolate each seller's order items from other sellers.

WHEN a seller views order items, THE system SHALL prevent access to order items belonging to other sellers.

WHEN a seller processes a shipment, THE system SHALL restrict shipment creation to only their own order items.

WHEN a seller responds to a cancellation request, THE system SHALL restrict responses to only their own order items.

WHEN a seller responds to a refund request, THE system SHALL restrict responses to only their own order items.

### Administrator Data Access Isolation

WHEN an administrator accesses platform data, THE system SHALL grant access to all customer and seller data for oversight purposes.

WHEN a super administrator manages other administrators, THE system SHALL prevent self-demotion.

IF a regular administrator attempts to promote or demote administrators, THE system SHALL deny the request.

### Data Access Control

### Customer Data Access Permissions

WHEN a customer views a product, THE system SHALL allow access to product details created by any seller.

WHEN a customer views a seller profile, THE system SHALL allow access to any seller's public profile information.

WHEN a customer views category listings, THE system SHALL allow access to all products in the selected category.

WHEN a customer searches products, THE system SHALL return results from all sellers matching the search criteria.

WHEN a customer views reviews on a product, THE system SHALL allow access to all reviews for that product.

IF a customer attempts to modify another customer's data, THE system SHALL deny the request.

IF a customer attempts to cancel another customer's order item, THE system SHALL deny the request.

### Seller Data Access Permissions

WHEN a seller views product listings, THE system SHALL allow access to view other sellers' products for market research.

WHEN a seller views category listings, THE system SHALL allow access to products in categories they do not own.

WHEN a seller views order items, THE system SHALL restrict access to only order items containing their products.

WHEN a seller views product snapshots, THE system SHALL restrict access to only snapshots of their own products.

IF a seller attempts to modify another seller's product, THE system SHALL deny the request.

IF a seller attempts to view another seller's inventory records, THE system SHALL deny the request.

### Administrator Data Access Permissions

WHEN an administrator views products, THE system SHALL allow access to all products on the platform.

WHEN an administrator views product snapshots, THE system SHALL allow access to snapshots of any product.

WHEN an administrator views orders, THE system SHALL allow access to all orders on the platform.

WHEN an administrator views customers, THE system SHALL allow access to all customer accounts.

WHEN an administrator views sellers, THE system SHALL allow access to all seller accounts.

WHEN an administrator views seller approval requests, THE system SHALL allow access to all pending requests.

### Public Data Access

WHEN a customer browses categories, THE system SHALL allow access to all category names and descriptions.

WHEN a customer browses categories, THE system SHALL allow access to products within each category.

WHEN a customer views a product detail page, THE system SHALL allow access to all public product information.

WHEN a customer views a seller profile, THE system SHALL allow access to shop name, description, and logo.

WHEN a customer views product reviews, THE system SHALL allow access to all non-deleted reviews for that product.

### Tenant-Level Isolation

### Platform-Wide Data Separation

THE system SHALL maintain clear separation between customer, seller, and administrator data domains.

WHEN data is created, THE system SHALL record the owner or creator of that data.

WHEN data is accessed, THE system SHALL verify the requesting party has permission to access that data.

WHEN data ownership changes (e.g., product deletion), THE system SHALL preserve historical records for legal compliance.

### Order Item Separation by Seller

WHEN an order is created with items from multiple sellers, THE system SHALL treat each seller's items as separate entities.

WHEN an order item is cancelled, THE system SHALL process the cancellation independently for that seller's item.

WHEN an order item is refunded, THE system SHALL process the refund independently for that seller's item.

WHEN items are shipped, THE system SHALL group items by seller into separate shipments.

### Product Visibility Separation

WHEN a seller account is suspended, THE system SHALL hide their products from search and category listings.

WHEN a seller account is unsuspended, THE system SHALL restore their products to search and category listings.

WHEN a product is deleted by its seller, THE system SHALL remove it from search and category listings.

WHEN a product is deleted by an administrator, THE system SHALL remove it from search and category listings.

### Snapshot Preservation Across Ownership Changes

WHEN a product is deleted, THE system SHALL preserve all product snapshots for administrator oversight.

WHEN a seller deletes their account, THE system SHALL preserve order item snapshots containing their products.

WHEN a customer deletes their account, THE system SHALL preserve review snapshots for dispute resolution.

WHEN any snapshot is created, THE system SHALL mark it as immutable and non-deletable.

### Inventory Record Separation

WHEN inventory is managed for a variant, THE system SHALL record changes only for that specific variant.

WHEN inventory records are viewed, THE system SHALL restrict access to records for the seller's own variants.

WHEN stock is adjusted, THE system SHALL update only the inventory records for the affected variant.

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Customer Rules

Customers must register with a valid email and password before accessing any platform features. Guest browsing is not permitted on this platform. Each customer account requires a unique email address among active accounts. Passwords must meet security requirements before account creation. Customers can log in using their registered email and password combination. Account holders can update their password at any time through the profile settings. Customers may modify their display name and phone number in their profile. When a customer requests account deletion, their profile information is permanently removed from the system. Order history and purchase records remain preserved for seller and legal compliance purposes. Reviews submitted by deleted customers remain visible but display as from a deleted user. Email verification is required before customers can access full platform features. Registration attempts are rate-limited to prevent automated abuse.

### Customer Registration Flow

WHEN a customer registers for the platform, THE system SHALL require a valid email address and password.

WHEN a customer submits registration, THE system SHALL validate the email format is correct.

WHEN a customer submits registration, THE system SHALL check that the email is not already registered.

WHEN the email is already registered, THE system SHALL reject the registration request.

WHEN a customer registers, THE system SHALL require the password to meet security requirements.

WHEN the password does not meet security requirements, THE system SHALL reject the registration request.

WHEN registration is successful, THE system SHALL create the customer account with pending verification status.

WHEN a customer account is created, THE system SHALL send a verification email to the registered email address.

WHEN a customer submits registration, THE system SHALL rate-limit registration attempts to prevent automated abuse.

Registration attempts from the same email address within 5 minutes are limited to 3 attempts.
Registration attempts from the same IP address within 1 hour are limited to 10 attempts.

WHEN the rate limit is exceeded, THE system SHALL reject the registration request and display an error message.

### Login Authentication

WHEN a customer attempts to log in, THE system SHALL validate the email and password combination.

WHEN the email does not exist, THE system SHALL reject the login request.

WHEN the password is incorrect, THE system SHALL reject the login request.

WHEN the customer account is banned, THE system SHALL reject the login request.

WHEN the customer account is suspended, THE system SHALL reject the login request.

WHEN the customer account is not verified, THE system SHALL reject the login request.

WHEN login is successful, THE system SHALL create an authenticated session for the customer.

WHEN a customer submits login credentials, THE system SHALL rate-limit login attempts to prevent brute force attacks.

Login attempts from the same account within 15 minutes are limited to 5 attempts.
Login attempts from the same IP address within 1 hour are limited to 20 attempts.

WHEN the rate limit is exceeded, THE system SHALL reject the login request and display an error message.

WHEN a customer changes their password, THE system SHALL invalidate all existing sessions for that customer.

WHEN a customer logs out, THE system SHALL invalidate the current session.

### Profile Information Editing

WHEN a customer updates their display name, THE system SHALL validate the display name is not empty.

WHEN a customer updates their phone number, THE system SHALL validate the phone number format is correct.

WHEN a customer updates their profile, THE system SHALL save the changes immediately.

WHEN a customer changes their password, THE system SHALL require the current password for verification.

WHEN the current password is incorrect, THE system SHALL reject the password change request.

WHEN a customer changes their password, THE system SHALL require the new password to meet security requirements.

WHEN the new password does not meet security requirements, THE system SHALL reject the password change request.

WHEN a customer changes their password, THE system SHALL require the new password to be different from the current password.

WHEN the new password matches the current password, THE system SHALL reject the password change request.

### Account Deletion Policy

WHEN a customer requests account deletion, THE system SHALL permanently remove their profile information.

WHEN a customer requests account deletion, THE system SHALL preserve their order history and purchase records.

WHEN a customer requests account deletion, THE system SHALL preserve their reviews but display them as from a deleted user.

WHEN a customer requests account deletion, THE system SHALL remove the customer from all wishlists.

WHEN a customer requests account deletion, THE system SHALL remove the customer from all shopping carts.

WHEN a customer requests account deletion, THE system SHALL invalidate all active sessions for that customer.

WHEN a customer requests account deletion, THE system SHALL require the customer to confirm the deletion action.

WHEN a customer requests account deletion, THE system SHALL require the customer to enter their password for verification.

WHEN the password is incorrect, THE system SHALL reject the account deletion request.

Order history and purchase records are preserved for seller records and legal compliance purposes.

Reviews from deleted customers remain visible on product pages but display "deleted user" as the author name.

### Order History Preservation

WHEN a customer account is deleted, THE system SHALL preserve all associated orders.

WHEN a customer account is deleted, THE system SHALL preserve all order items associated with the customer.

WHEN a customer account is deleted, THE system SHALL preserve all order snapshots.

WHEN a customer account is deleted, THE system SHALL preserve all shipping addresses used in past orders.

WHEN a customer account is deleted, THE system SHALL update the customer reference in orders to indicate deletion.

Order history is preserved even after customer account deletion for seller records and legal compliance.

Preserved orders remain visible to sellers for their order management and reporting.

Preserved orders remain visible to administrators for platform oversight and dispute resolution.

### Deleted User Review Display

WHEN a customer account is deleted, THE system SHALL preserve all reviews created by the customer.

WHEN a customer account is deleted, THE system SHALL display the review author as "deleted user".

WHEN a customer account is deleted, THE system SHALL preserve the review content and rating.

WHEN a customer account is deleted, THE system SHALL preserve the review timestamp.

WHEN calculating product average rating, THE system SHALL include reviews from deleted users.

WHEN displaying reviews on product pages, THE system SHALL show "deleted user" instead of the original customer name.

Review snapshots are preserved even after customer account deletion.

Deleted user reviews continue to contribute to product rating calculations.

### Email Verification Requirement

WHEN a customer registers, THE system SHALL require email verification before full platform access.

WHEN a customer registers, THE system SHALL send a verification email with a unique verification link.

WHEN a customer clicks the verification link, THE system SHALL mark the account as verified.

WHEN a customer account is not verified, THE system SHALL restrict access to platform features.

WHEN a customer account is not verified, THE system SHALL allow login but display a verification reminder.

WHEN a customer requests a new verification email, THE system SHALL send a fresh verification link.

WHEN a customer requests a new verification email, THE system SHALL invalidate any previous verification links.

WHEN a customer requests a new verification email, THE system SHALL rate-limit verification email requests.

Verification email requests from the same account within 1 hour are limited to 3 attempts.

WHEN the verification link expires, THE system SHALL require the customer to request a new verification email.

## Seller Rules

Sellers must register with email and password to create a seller account. All seller accounts require administrator approval before they can list products for sale. Sellers can view their current approval status as pending, approved, or rejected. When a seller registration is rejected, the rejection reason is displayed to the seller. Rejected sellers may submit a new registration request after addressing the rejection reason. Sellers can change their password through account settings. Sellers can edit their shop name, description, and logo image in their profile. Every profile edit creates an immutable snapshot for audit purposes. Customers can view seller profiles including shop information and history. Sellers can delete their account only if they have no pending orders in paid or shipped status. Sellers cannot delete accounts with pending cancellation or refund requests. When a seller deletes their account, their products are removed from all listings. Order history and snapshots are preserved even after seller account deletion. Past order records retain the original shop name for historical accuracy.

### Seller Registration and Approval Workflow

WHEN a seller registers for an account, THE system SHALL:
1. Require email and password as mandatory fields
2. Validate email format and uniqueness across all user accounts
3. Hash the password before storage
4. Set initial approval status to "pending"
5. Create a seller profile with required shop name

WHEN a seller registration is submitted, THE system SHALL:
1. Create a seller account with pending approval status
2. Make the account visible to administrators for review
3. Allow the seller to view their current approval status
4. Enable the seller to log in but restrict selling capabilities

WHEN an administrator reviews a pending seller registration, THE system SHALL:
1. Display the seller's registration information including shop name and email
2. Allow the administrator to approve or reject the registration
3. Require a reason when rejecting a registration
4. Update the seller's approval status to "approved" or "rejected"
5. Notify the seller of the decision

WHEN a seller registration is rejected, THE system SHALL:
1. Store the rejection reason provided by the administrator
2. Display the rejection reason to the seller upon login
3. Allow the seller to submit a new registration request
4. Reset the approval status to "pending" for the new request

IF a seller attempts to create products while approval status is "pending", THE system SHALL reject the request.
IF a seller attempts to edit products while approval status is "rejected", THE system SHALL reject the request.
IF a seller attempts to view their approval status, THE system SHALL display the current status (pending, approved, or rejected).

### Seller Account Deletion and Data Preservation

WHEN a seller requests to delete their account, THE system SHALL:
1. Verify the seller has no pending orders in "paid" or "shipped" status
2. Verify the seller has no pending cancellation requests
3. Verify the seller has no pending refund requests
4. If all conditions are met, proceed with account deletion
5. If any condition fails, reject the deletion request with appropriate error message

WHEN a seller account is deleted, THE system SHALL:
1. Remove all products from search and category listings
2. Preserve order history and order snapshots
3. Preserve all snapshots created during the seller's tenure
4. Retain the original shop name in past order records
5. Mark the seller account as deleted but maintain it for historical reference

WHEN a product is associated with a deleted seller account, THE system SHALL:
1. Remove the product from all visible listings
2. Preserve the product snapshot for historical order records
3. Maintain the product reference in order items for order history integrity

IF a seller has pending orders in "paid" status, THE system SHALL reject account deletion and display an error.
IF a seller has pending orders in "shipped" status, THE system SHALL reject account deletion and display an error.
IF a seller has pending cancellation requests, THE system SHALL reject account deletion and display an error.
IF a seller has pending refund requests, THE system SHALL reject account deletion and display an error.

### Seller Profile Snapshot Creation

WHEN a seller edits their shop profile, THE system SHALL:
1. Capture the current values of shop name, description, and logo before the change
2. Create an immutable snapshot record with before and after values
3. Record the timestamp of the change
4. Record the seller as the actor who made the change
5. Update the profile with the new values

WHEN a snapshot is created for seller profile changes, THE system SHALL:
1. Mark the snapshot as immutable (cannot be modified or deleted)
2. Include all changed fields with their previous and current values
3. Associate the snapshot with the seller account
4. Make the snapshot viewable by the seller and administrators
5. Store the snapshot type as "seller"

WHEN a customer views a seller profile, THE system SHALL:
1. Display the current shop name, description, and logo
2. Show the profile as it currently exists (not historical versions)
3. Allow navigation to view seller's products

IF a seller attempts to modify a snapshot, THE system SHALL reject the request.
IF a seller attempts to delete a snapshot, THE system SHALL reject the request.
IF an administrator views seller snapshots, THE system SHALL display all historical profile changes.

### Shop Information Editing

WHEN a seller edits their shop information, THE system SHALL:
1. Allow editing of shop name, shop description, and logo image
2. Validate shop name for uniqueness across all seller accounts
3. Create a snapshot before applying any changes
4. Apply changes only after successful validation
5. Update the visible profile immediately after save

WHEN a seller updates their shop logo, THE system SHALL:
1. Accept image file uploads
2. Validate image format and size according to platform policies
3. Store the new logo and update the profile
4. Include the logo change in the profile snapshot
5. Make the new logo visible to customers immediately

WHEN a customer views a seller profile, THE system SHALL:
1. Display the current shop name
2. Display the current shop description
3. Display the current shop logo image
4. Link to the seller's product listings

IF a seller submits a duplicate shop name, THE system SHALL reject the request with an error message.
IF a seller submits an invalid logo format, THE system SHALL reject the request with an error message.
IF a seller submits a logo exceeding size limits, THE system SHALL reject the request with an error message.

### Product Listing Removal and Preservation

WHEN a seller deletes a product, THE system SHALL:
1. Verify no order items for any variant are in "paid" or "shipped" status
2. Verify no pending cancellation requests exist for any variant
3. Verify no pending refund requests exist for any variant
4. If all conditions are met, remove the product from listings
5. Delete all associated variants and inventory records
6. Preserve product snapshots for historical order records

WHEN a product is deleted, THE system SHALL:
1. Remove the product from search results
2. Remove the product from category listings
3. Mark the product status as "deleted"
4. Preserve all product snapshots including variant snapshots
5. Maintain product references in existing order items

WHEN a seller suspends their account (administrative action), THE system SHALL:
1. Hide all products from search and category listings
2. Prevent customers from adding products to cart
3. Allow the seller to process existing orders
4. Prevent creation of new products
5. Prevent editing of existing products

IF a product has order items in "paid" status, THE system SHALL reject product deletion and display an error.
IF a product has order items in "shipped" status, THE system SHALL reject product deletion and display an error.
IF a product variant has pending cancellation requests, THE system SHALL reject product deletion and display an error.
IF a product variant has pending refund requests, THE system SHALL reject product deletion and display an error.

## Product Rules

Sellers can create products with a required name, description, category, and base price. Every product must belong to the seller who created it. Sellers can edit their own products but cannot modify products created by other sellers. Each product edit creates an immutable snapshot preserving the previous state. Product snapshots include all fields including images, name, description, category, and base price. Sellers can view snapshots of their own products for audit purposes. Administrators can view snapshots of any product on the platform. Sellers can delete their own products only if no pending order items exist for any variant. Products cannot be deleted if there are pending cancellation or refund requests for their variants. Deleted products are immediately removed from search results and category listings. Deleted products and their snapshots are preserved in the system for historical records. Product images can be uploaded, reordered, and deleted by the product owner. The first image serves as the main thumbnail image for product listings.

### Product Creation Requirements

WHEN a seller creates a product, THE system SHALL:
1. Require a product name
2. Require a product description
3. Require a category selection (product or subcategory)
4. Require a base price value
5. Associate the product with the creating seller
6. Set the product status to active
7. Require at least one product variant for the product to be purchasable

IF the product name is missing, THE system SHALL reject the creation request.
IF the product description is missing, THE system SHALL reject the creation request.
IF the category is not selected, THE system SHALL reject the creation request.
IF the base price is missing or invalid, THE system SHALL reject the creation request.
IF the seller does not have approved status, THE system SHALL reject the product creation request.

### Seller Ownership Validation

THE system SHALL ensure each product is owned by exactly one seller.
THE system SHALL prevent sellers from viewing or modifying products owned by other sellers.
THE system SHALL allow sellers to view only their own product list.
THE system SHALL allow sellers to edit only their own products.
THE system SHALL allow sellers to delete only their own products.

WHEN a seller attempts to access a product, THE system SHALL validate seller ownership before allowing any operation.
WHEN a product is created, THE system SHALL permanently associate it with the creating seller.

IF a seller is not the owner of a product, THE system SHALL deny access to that product.
IF a seller attempts to modify another seller's product, THE system SHALL reject the modification request.

### Product Edit Snapshots

WHEN a seller edits a product, THE system SHALL create a product snapshot before applying changes.
THE system SHALL record the timestamp of the product edit in the snapshot.
THE system SHALL capture all product field values before the change in the snapshot.
THE system SHALL capture all product field values after the change in the snapshot.
THE system SHALL include all product images in the snapshot.
THE system SHALL include the seller's identity who made the change in the snapshot.

WHEN a seller edits product images, THE system SHALL include the image changes in the product snapshot.
WHEN a seller edits product images, THE system SHALL preserve the image order in the snapshot.

IF a product is edited, THE system SHALL ensure at least one snapshot exists documenting the change.
IF multiple edits occur, THE system SHALL create a separate snapshot for each edit.

### Snapshot Immutability Rules

THE system SHALL ensure all product snapshots are immutable once created.
THE system SHALL prevent deletion of any product snapshot.
THE system SHALL prevent modification of any product snapshot after creation.
THE system SHALL preserve all snapshots even after the product is deleted.
THE system SHALL preserve all snapshots even after the seller account is deleted.

WHEN a snapshot is created, THE system SHALL mark it as immutable.
WHEN a user attempts to modify a snapshot, THE system SHALL reject the modification request.
WHEN a user attempts to delete a snapshot, THE system SHALL reject the deletion request.

IF a product is deleted, THE system SHALL preserve all associated snapshots.
IF a seller is deleted, THE system SHALL preserve all snapshots they created.

### Product Deletion Conditions

WHEN a seller requests to delete a product, THE system SHALL verify no pending order items exist for any variant of the product.
WHEN a seller requests to delete a product, THE system SHALL verify no pending cancellation requests exist for any variant of the product.
WHEN a seller requests to delete a product, THE system SHALL verify no pending refund requests exist for any variant of the product.

IF any variant of the product has a pending order item with paid or shipped status, THE system SHALL reject the deletion request.
IF any variant of the product has a pending cancellation request, THE system SHALL reject the deletion request.
IF any variant of the product has a pending refund request, THE system SHALL reject the deletion request.

WHEN a product is deleted, THE system SHALL remove all product variants.
WHEN a product is deleted, THE system SHALL remove all inventory records associated with the variants.
WHEN a product is deleted, THE system SHALL mark the product status as deleted.

IF the deletion conditions are not met, THE system SHALL provide a clear reason for the rejection.

### Search Listing Removal and Historical Preservation

WHEN a product is deleted, THE system SHALL immediately remove it from search results.
WHEN a product is deleted, THE system SHALL immediately remove it from category listings.
WHEN a product is deleted, THE system SHALL prevent the product from appearing in any public listing.

WHEN a product is deleted, THE system SHALL preserve the product snapshots for historical records.
WHEN a product is deleted, THE system SHALL preserve order items that reference the deleted product.
WHEN a product is deleted, THE system SHALL preserve the product data in order item snapshots.

IF a product is deleted, THE system SHALL ensure it cannot be purchased or added to cart.
IF a product is deleted, THE system SHALL ensure existing orders referencing the product remain valid.

### Image Management Permissions

Sellers SHALL be able to upload multiple images for each product.
Sellers SHALL be able to reorder product images (first image is the main thumbnail).
Sellers SHALL be able to delete images from their products.
Sellers SHALL be able to view all images for their products.

THE system SHALL allow sellers to set the first image as the main thumbnail image.
THE system SHALL ensure image changes are included in product snapshots.

IF a seller is not the product owner, THE system SHALL deny image management permissions.
IF a product is deleted, THE system SHALL preserve all images in the product snapshots.

### Administrator Snapshot Access

Administrators SHALL be able to view all products on the platform regardless of seller ownership.
Administrators SHALL be able to view snapshots of any product on the platform.
Administrators SHALL be able to view product images in snapshots.
Administrators SHALL be able to view the complete edit history of any product.

THE system SHALL provide administrators with access to product snapshots for audit and dispute resolution.
THE system SHALL allow administrators to view who made each product change and when.

IF an administrator requests to view a product snapshot, THE system SHALL provide full access.
IF a product is deleted, THE system SHALL still allow administrators to view its snapshots.

### Historical Record Preservation

THE system SHALL preserve all product data even after product deletion.
THE system SHALL preserve all product snapshots for historical records and audit purposes.
THE system SHALL preserve product snapshots in order items for purchase history integrity.
THE system SHALL preserve product snapshots in seller profiles for transaction verification.

WHEN a seller account is deleted, THE system SHALL preserve all product snapshots they created.
WHEN a product is deleted, THE system SHALL ensure snapshots remain accessible to administrators.
WHEN an order is placed, THE system SHALL save a snapshot of the product and variant at purchase time.

IF a dispute arises, THE system SHALL provide snapshots to show the product state at any point in time.
IF legal records are required, THE system SHALL provide complete product history through snapshots.

THE system SHALL ensure snapshots are never lost, deleted, or modified for compliance and audit requirements.

## ProductVariant Rules

Each product can have multiple variants representing different option combinations. Every variant requires a unique SKU code that identifies it across the platform. Variants include option values such as color, size, or other product attributes. Each variant has a price that can override the product base price. Stock quantity is required for each variant and starts at zero when created. Sellers can add new variants to their products at any time. Sellers can edit variant SKU codes, option values, and prices. Every variant edit creates an immutable snapshot for audit purposes. Variants can only be deleted if no pending order items exist for that variant. Variants with pending cancellation or refund requests cannot be deleted. A product must have at least one variant to be purchasable by customers. Products with no variants appear in search but are shown as unavailable. Out of stock variants cannot be added to customer shopping carts.

### Variant Creation and Identification

WHEN a seller creates a product variant, THE system SHALL:
1. Require a unique SKU code that identifies the variant across the entire platform
2. Require option values that define the specific combination (e.g., color, size)
3. Ensure the SKU code does not duplicate any existing variant SKU on the platform
4. Validate that option values are provided as a structured set of attribute-value pairs

WHEN a seller edits a variant's option values, THE system SHALL:
1. Allow modification of option values to represent different attribute combinations
2. Ensure the new option combination is valid for the product type
3. Create an immutable snapshot recording the before and after option values

IF a duplicate SKU code is detected during creation, THE system SHALL reject the request and inform the seller that the SKU already exists.

IF option values are missing or improperly formatted, THE system SHALL reject the variant creation request.

### Variant Pricing and Stock Management

WHEN a variant is created, THE system SHALL:
1. Require a stock quantity value that starts at zero
2. Allow an optional price that can override the product's base price
3. If no variant price is provided, THE system SHALL use the product's base price

WHEN a seller updates a variant's price, THE system SHALL:
1. Allow the price to be set higher or lower than the base price
2. Create an immutable snapshot recording the price change with before and after values
3. Apply the new price immediately to all future cart additions and orders

WHEN a seller manages variant stock, THE system SHALL:
1. Require a stock quantity as a non-negative integer
2. Record each stock change as an inventory record with quantity change, reason, and timestamp
3. Calculate current stock by summing all inventory records for the variant
4. Mark the variant as "out of stock" when stock quantity reaches zero

IF the stock quantity is set below zero, THE system SHALL reject the update request.

IF the price is provided as a negative value, THE system SHALL reject the variant creation or update request.

### Variant Modification and Snapshot Requirements

WHEN a seller edits any variant field (SKU code, option values, or price), THE system SHALL:
1. Create an immutable snapshot before applying the changes
2. Record the timestamp of when the change was made
3. Capture all previous values before the modification
4. Capture all new values after the modification
5. Record which seller made the change

WHILE a variant snapshot exists, THE system SHALL:
1. Prevent any deletion or modification of the snapshot
2. Allow the seller who owns the variant to view all snapshots
3. Allow administrators to view all snapshots for any variant

IF a variant is edited multiple times, THE system SHALL create a separate snapshot for each edit, maintaining a complete audit trail.

Snapshots serve as the authoritative record for dispute resolution regarding variant pricing or specifications at the time of purchase.

### Variant Deletion and Product Availability

WHEN a seller requests to delete a variant, THE system SHALL:
1. Check if any order items exist for that variant with "paid" or "shipped" status
2. Check if any pending cancellation requests exist for that variant
3. Check if any pending refund requests exist for that variant
4. Only proceed with deletion if all checks pass

IF a variant has pending order items (paid or shipped status), THE system SHALL reject the deletion request and inform the seller.

IF a variant has pending cancellation or refund requests, THE system SHALL reject the deletion request until requests are resolved.

WHEN a variant is successfully deleted, THE system SHALL:
1. Remove the variant from the product's variant list
2. Delete all inventory records associated with the variant
3. Preserve all snapshots of the variant for audit purposes
4. Update the product's availability status if it becomes the last variant

WHEN a product has no variants, THE system SHALL:
1. Keep the product visible in search results and category listings
2. Display the product as "unavailable" to customers
3. Prevent customers from adding the product to their cart

WHEN a customer attempts to add an out-of-stock variant to their cart, THE system SHALL:
1. Reject the add-to-cart request
2. Display a message indicating the variant is currently unavailable

IF a product's last variant is deleted, THE system SHALL automatically mark the product as unavailable in all customer-facing listings.

## Category Rules

Products are organized into categories for browsing and discovery. Categories can have subcategories with one level of nesting only. Each category requires a name and may include an optional description. Categories and subcategories are created and managed exclusively by administrators. Customers can browse the complete list of all available categories. Customers can view all products within a selected category or subcategory. Products can belong to subcategories and are visible in both the subcategory and parent category listings. When a category is deleted, products within it become uncategorized. Category names and descriptions can be edited by administrators. Category hierarchy changes do not affect existing product associations. Category management does not require snapshot creation for historical tracking.

### Category Hierarchy Structure

WHEN the system organizes categories, THE system SHALL:
1. Support a hierarchical structure with parent categories and subcategories
2. Enforce a one-level nesting limit (categories cannot have sub-subcategories)
3. Require each category to have a unique name within its level
4. Allow each category to have an optional description
5. Require each category to be associated with exactly one parent category or be a root category

WHEN a category is created, THE system SHALL:
1. Validate that if a parent category is specified, it exists
2. Validate that the parent category is not a subcategory (to enforce one-level nesting)
3. Validate that the category name is not a duplicate of any existing category at the same level
4. Record the creation timestamp

IF a user attempts to create a category with a parent that is already a subcategory, THE system SHALL reject the request with an error indicating one-level nesting limit violation.

IF a user attempts to create a category with a duplicate name at the same level, THE system SHALL reject the request with an error indicating name uniqueness violation.

### Category Management Permissions

WHEN an administrator creates a category, THE system SHALL:
1. Require the administrator to have valid administrator privileges
2. Require a category name to be provided
3. Allow an optional description to be provided
4. Allow selection of a parent category (for subcategories) or creation as root category
5. Validate parent category existence if specified
6. Validate one-level nesting constraint
7. Validate name uniqueness at the same level

WHEN an administrator edits a category, THE system SHALL:
1. Require the administrator to have valid administrator privileges
2. Allow editing of the category name
3. Allow editing of the category description
4. Allow changing the parent category (within one-level nesting constraint)
5. Validate new parent category existence if changed
6. Validate one-level nesting constraint after parent change
7. Validate name uniqueness at the new level if name changed

IF a non-administrator attempts to create or edit a category, THE system SHALL reject the request with an error indicating insufficient privileges.

IF an administrator attempts to set a subcategory as the parent of a new category, THE system SHALL reject the request with an error indicating one-level nesting violation.

IF an administrator attempts to change a category's parent to create a cycle or exceed one level, THE system SHALL reject the request with an error indicating invalid hierarchy change.

### Customer Category Browsing

WHEN a customer browses categories, THE system SHALL:
1. Display all root-level categories in a list
2. For each root category, display its subcategories if any exist
3. Show the category name for each category
4. Optionally display the category description when requested
5. Paginate the category list if the total exceeds the page limit

WHEN a customer views products in a category, THE system SHALL:
1. Display all products directly assigned to the selected category
2. Display all products assigned to subcategories of the selected category
3. Show product information including name, main image, base price, seller shop name, and average rating
4. Paginate the product list if the total exceeds the page limit
5. Allow sorting by newest, price low-to-high, or price high-to-low

WHEN a customer views a subcategory, THE system SHALL:
1. Display all products directly assigned to the subcategory
2. Display the subcategory name and its parent category name
3. Allow navigation to the parent category view
4. Show product information consistent with category page display

IF a category has no products (direct or via subcategories), THE system SHALL display an appropriate message indicating no products are available.

IF a category or subcategory does not exist, THE system SHALL reject the request with an error indicating the category was not found.

### Category Deletion and Product Handling

WHEN a category is deleted, THE system SHALL:
1. Remove the category from the category hierarchy
2. Associate all products in the deleted category with no category (uncategorized)
3. Preserve all products that were assigned to the deleted category
4. Ensure products remain accessible in search results
5. Preserve all subcategories of the deleted category and reassign them as root categories

WHEN products become uncategorized due to category deletion, THE system SHALL:
1. Maintain product visibility in search results
2. Remove products from category-based listings
3. Allow products to be reassigned to a new category by the seller (if product edit permissions allow)
4. Preserve all product data including variants, images, and snapshots

WHEN a category hierarchy is changed (parent reassigned), THE system SHALL:
1. Update the category's parent association immediately
2. Not affect existing product-category associations
3. Update product visibility in category listings based on new hierarchy
4. Maintain one-level nesting constraint after the change

IF a category has pending operations (e.g., being used in active product listings), THE system SHALL allow deletion but products will become uncategorized.

IF an administrator attempts to delete a category that does not exist, THE system SHALL reject the request with an error indicating the category was not found.

IF a product is in a deleted category and the customer attempts to view it via the old category path, THE system SHALL redirect to search results or display an appropriate error.

## Order Rules

Orders are created only after payment processing succeeds. Payment failures prevent order creation and allow customers to retry. Each order contains one or more order items from potentially different sellers. Stock quantities are automatically decreased when orders are successfully placed. Items are removed from the customer cart after order completion. Each order item becomes a snapshot preserving product details at purchase time. Each order item also captures a snapshot of the seller profile at purchase time. Shipping addresses cannot be changed after an order is placed. Order numbers are unique and generated at order creation time. Order dates are recorded at the time of successful payment confirmation. Order total price is calculated from all items including any price overrides. Orders remain visible in customer order history regardless of status changes.

### Order Creation Process

WHEN a customer proceeds to checkout with items in their cart, THE system SHALL verify that all cart items are available for purchase.

WHEN a customer confirms an order, THE system SHALL verify that payment processing succeeds before creating the order record.

IF payment processing fails, THE system SHALL NOT create an order and SHALL allow the customer to retry payment.

IF payment processing succeeds, THE system SHALL create the order record with all purchased items.

WHEN an order is created, THE system SHALL record the order date as the timestamp of successful payment confirmation.

WHEN an order is created, THE system SHALL remove all purchased items from the customer's shopping cart.

IF the customer has no items in their cart, THE system SHALL prevent checkout initiation.

IF any cart item is unavailable (deleted or out of stock), THE system SHALL prevent that item from being included in the order.

### Order Number Uniqueness

WHEN an order is created, THE system SHALL generate a unique order number for that order.

THE system SHALL ensure that no two orders share the same order number across the entire platform.

THE system SHALL generate the order number at the time of order creation, immediately after payment confirmation.

THE system SHALL use a format that allows orders to be uniquely identified and referenced in all communications.

WHEN a customer views their order history, THE system SHALL display the unique order number for each order.

WHEN a seller views order items, THE system SHALL display the associated order number for reference.

IF an order number collision is detected during generation, THE system SHALL regenerate until uniqueness is achieved.

### Multi-Seller Order Support

WHEN a customer places an order with items from multiple sellers, THE system SHALL create a single order record containing all items.

THE system SHALL group order items by their respective sellers within the same order.

WHEN items from different sellers are purchased, THE system SHALL allow each seller to process their items independently.

THE system SHALL track the status of each order item separately, regardless of seller.

WHEN viewing order details, THE system SHALL display which seller each item belongs to.

WHEN calculating the order total, THE system SHALL sum all items from all sellers into one total price.

IF items from different sellers have different shipping requirements, THE system SHALL create separate shipments per seller (see Shipping and Tracking).

### Automatic Stock Reduction

WHEN an order is successfully created, THE system SHALL automatically decrease the stock quantity for each purchased variant.

THE system SHALL create an inventory record for each variant with a negative quantity change indicating the order.

WHEN an order item is cancelled, THE system SHALL automatically restore the stock quantity for that variant.

WHEN an order item is refunded, THE system SHALL automatically restore the stock quantity for that variant.

THE system SHALL create an inventory record for each stock restoration with a positive quantity change.

IF stock reduction would result in negative inventory, THE system SHALL prevent the order from being created.

WHEN a customer views a variant, THE system SHALL display the current stock quantity calculated from all inventory records.

IF the stock quantity reaches zero, THE system SHALL mark the variant as out of stock and prevent cart addition.

### Product and Seller Profile Snapshots

WHEN an order item is created, THE system SHALL capture a snapshot of the purchased product at that moment.

THE product snapshot SHALL include all product fields: name, description, category, base price, and images.

THE product snapshot SHALL also include snapshots of all variants at that moment (product-snapshot → product-snapshot-SKU).

WHEN an order item is created, THE system SHALL capture a snapshot of the seller's profile at that moment.

THE seller snapshot SHALL include the shop name and logo image as they appeared at purchase time.

THE system SHALL preserve all order item snapshots even if the original product or seller profile is later modified.

THE system SHALL allow customers to view the product and seller snapshots associated with their order items.

THE system SHALL allow administrators to view all order item snapshots for dispute resolution purposes.

THE snapshots SHALL be immutable and cannot be deleted once created.

### Shipping Address Locking

WHEN a customer places an order, THE system SHALL record the selected shipping address at that time.

THE system SHALL prevent any changes to the shipping address after the order is successfully created.

WHEN viewing order details, THE system SHALL display the locked shipping address that was used at order creation.

IF a customer requests to change the shipping address after order placement, THE system SHALL reject the request.

THE system SHALL allow customers to update their saved addresses for future orders, but not for existing orders.

WHEN an order is cancelled or refunded, THE system SHALL preserve the original shipping address in the order record.

### Order Total Calculation

WHEN calculating the order total, THE system SHALL sum the unit price multiplied by quantity for each order item.

THE system SHALL use the variant price if it overrides the base price, otherwise use the base price.

THE system SHALL include all items from all sellers in the total price calculation.

THE system SHALL record the calculated total price at the time of order creation.

THE system SHALL prevent modification of the total price after order creation.

WHEN viewing order details, THE system SHALL display the itemized breakdown showing each item's price and subtotal.

IF a variant price override exists, THE system SHALL use the override price for that item's calculation.

THE system SHALL display the order total in the currency specified by the platform configuration.

## OrderItem Rules

Each order item represents a purchased product variant with a specific quantity. Multiple units of the same variant become one order item with combined quantity. Order items can have different statuses independently within the same order. Valid order item statuses are paid, shipped, delivered, cancelled, and refunded. Each order item has its own status that can change independently. Order items from different sellers are processed and shipped separately. Individual order items can be cancelled or refunded without affecting other items. Cancelled items restore their stock quantities through inventory records. Refunded items also restore their stock quantities through inventory records. Order item status determines the overall order status calculation. When all items are paid, the order status is paid. When all items are delivered, the order status is delivered. Mixed status items result in a partially completed order status.

### Order Item Independence and Multi-Seller Separation

### Order Item Independence

WHEN an order contains multiple order items, THE system SHALL:
1. Treat each order item as an independent entity with its own status
2. Allow each order item to have a different status from other items in the same order
3. Process status transitions for each order item independently
4. Preserve the independence of order items even when they belong to the same product variant

### Multi-Seller Item Separation

WHEN an order contains items from multiple sellers, THE system SHALL:
1. Group order items by seller for shipping purposes
2. Create separate shipments for items from different sellers
3. Allow each seller to process their items independently
4. Track each seller's items with separate tracking information
5. Ensure cancellation or refund of one seller's items does not affect another seller's items

### Item Independence in Operations

WHEN a customer performs operations on order items, THE system SHALL:
1. Allow cancellation requests on individual items without affecting other items
2. Allow refund requests on individual items without affecting other items
3. Process each item's status transition independently
4. Maintain separate inventory records for each item's stock changes

### Variant Quantity Combination

### Variant Quantity Combination

WHEN a customer adds a product variant to their cart, THE system SHALL:
1. Check if the same variant already exists in the cart
2. If the variant exists, combine the quantities instead of creating a new cart item
3. Update the combined quantity in the existing cart item
4. Preserve the variant reference when combining quantities

WHEN an order is created from cart items, THE system SHALL:
1. Create one order item for each unique variant in the cart
2. Set the order item quantity to the combined quantity from the cart
3. Preserve the unit price at the time of order creation
4. Ensure multiple units of the same variant become a single order item with combined quantity

IF a customer adds the same variant multiple times to cart, THE system SHALL:
1. Aggregate all quantities into one cart item
2. Display the total combined quantity to the customer
3. Calculate subtotal using combined quantity multiplied by unit price

### Order Item Status Transition Rules

### Order Item Status Transition Rules

WHEN an order item is created, THE system SHALL:
1. Set the initial status to "paid" after successful payment
2. Record the creation timestamp for the order item
3. Associate the order item with the purchased product variant
4. Create a snapshot of the product and variant at purchase time

WHEN a seller ships order items, THE system SHALL:
1. Allow status transition from "paid" to "shipped"
2. Require a shipment record with tracking information
3. Update all items in the same shipment to "shipped" status simultaneously
4. Record the shipment timestamp

WHEN a customer confirms delivery, THE system SHALL:
1. Allow status transition from "shipped" to "delivered"
2. Update all items in the confirmed shipment to "delivered" status
3. Record the delivery confirmation timestamp

WHEN 14 days pass after shipping without customer confirmation, THE system SHALL:
1. Automatically transition items from "shipped" to "delivered"
2. Record the automatic delivery confirmation
3. Notify the customer of the automatic delivery confirmation

WHEN an order item is cancelled, THE system SHALL:
1. Allow status transition to "cancelled" only from "paid" status
2. Block cancellation if the item is already "shipped", "delivered", "cancelled", or "refunded"
3. Record the cancellation timestamp
4. Create a snapshot of the cancellation request state

WHEN an order item is refunded, THE system SHALL:
1. Allow status transition to "refunded" only from "delivered" status
2. Block refund if the item is not "delivered" or already "cancelled" or "refunded"
3. Record the refund timestamp
4. Create a snapshot of the refund request state

### Terminal Status Rules

WHILE an order item has status "cancelled" or "refunded", THE system SHALL:
1. Prevent any further status transitions
2. Mark the item as in a terminal state
3. Exclude the item from active order processing
4. Preserve the item record for historical and reporting purposes

### Order Item Cancellation Rules

### Cancellation Eligibility

WHEN a customer requests cancellation of an order item, THE system SHALL:
1. Verify the item status is "paid" (not yet shipped)
2. Reject cancellation requests for items with status "shipped", "delivered", "cancelled", or "refunded"
3. Require the customer to provide a cancellation reason
4. Create a cancellation request record with status "pending"
5. Create a snapshot of the cancellation request

### Cancellation Approval Workflow

WHEN a seller responds to a cancellation request, THE system SHALL:
1. Allow the seller to approve or reject the request
2. Update the cancellation request status to "approved" or "rejected"
3. Record the response timestamp
4. Create a snapshot of the updated cancellation request state
5. Notify the customer of the seller's decision

### Cancellation Processing

WHEN a cancellation request is approved, THE system SHALL:
1. Transition the order item status from "paid" to "cancelled"
2. Process the refund for the cancelled item only
3. Restore the stock quantity for the cancelled variant
4. Create an inventory record with positive quantity change and reason "cancellation"
5. Update the order status based on remaining items

### Cancellation Impact on Order

WHEN an order item is cancelled, THE system SHALL:
1. Affect only the cancelled item, not other items in the order
2. Continue processing remaining items normally
3. Update the overall order status based on new item statuses
4. If all items become cancelled, update order status to "cancelled"
5. Preserve the cancelled item record for order history

### Order Item Refund Rules

### Refund Eligibility

WHEN a customer requests a refund for an order item, THE system SHALL:
1. Verify the item status is "delivered"
2. Reject refund requests for items with status "paid", "shipped", "cancelled", or "refunded"
3. Verify the request is within 7 days of the item's delivery date
4. Reject refund requests made after the 7-day window expires
5. Require the customer to provide a refund reason
6. Create a refund request record with status "pending"
7. Record the number of days since delivery
8. Create a snapshot of the refund request

### Refund Approval Workflow

WHEN a seller responds to a refund request, THE system SHALL:
1. Allow the seller to approve or reject the request
2. Update the refund request status to "approved" or "rejected"
3. Record the response timestamp
4. Create a snapshot of the updated refund request state
5. Notify the customer of the seller's decision

### Refund Processing

WHEN a refund request is approved, THE system SHALL:
1. Transition the order item status from "delivered" to "refunded"
2. Process the refund for the refunded item only
3. Restore the stock quantity for the refunded variant
4. Create an inventory record with positive quantity change and reason "refund"
5. Update the order status based on remaining items

### Refund Impact on Order

WHEN an order item is refunded, THE system SHALL:
1. Affect only the refunded item, not other items in the order
2. Continue processing remaining items normally
3. Update the overall order status based on new item statuses
4. If all items become refunded, update order status to "refunded"
5. Preserve the refunded item record for order history

### Order Status Derivation and Partial Completion

### Order Status Derivation

WHEN calculating the overall order status, THE system SHALL:
1. Evaluate all order item statuses within the order
2. Apply the following rules in order of priority:
   - If all items are "paid", order status is "paid"
   - If any item is "shipped" (and none are "delivered"), order status is "shipped"
   - If all items are "delivered", order status is "delivered"
   - If all items are "cancelled", order status is "cancelled"
   - If all items are "refunded", order status is "refunded"
   - If items have mixed statuses, order status is "partiallyCompleted"

### Partial Completion Handling

WHEN an order has items with different statuses, THE system SHALL:
1. Set the order status to "partiallyCompleted"
2. Display the order status as "partiallyCompleted" in order history
3. Allow individual items to continue their status transitions independently
4. Track which items are in which status for reporting purposes

### Status Transition Examples

WHEN an order transitions from "paid" to "shipped", THE system SHALL:
1. Change order status to "shipped" when the first item is shipped
2. Keep order status as "shipped" while remaining items are "paid"
3. Transition to "delivered" only when all items become "delivered"
4. Transition to "partiallyCompleted" if some items are cancelled or refunded

WHEN an order has mixed final statuses, THE system SHALL:
1. Maintain "partiallyCompleted" status until all items reach terminal states
2. If remaining items are all "cancelled", update to "cancelled"
3. If remaining items are all "refunded", update to "refunded"
4. If remaining items are all "delivered", update to "delivered"

### Order Status Display

WHEN displaying order status to customers, THE system SHALL:
1. Show the derived order status in order history list
2. Show individual item statuses in order details
3. Explain partial completion when order status is "partiallyCompleted"
4. Provide visibility into which items are in which status

## Address Rules

Customers can add multiple shipping addresses to their account profile. Each address requires recipient name, phone number, and complete street address. City, state or province, postal code, and country are required for each address. Customers can edit any field in their saved shipping addresses. Customers can delete shipping addresses that are not currently used in active orders. Customers can designate one address as their default shipping address. The default address is automatically selected during checkout unless changed. When an order is placed, the selected shipping address is locked and cannot be modified. Deleted addresses remain associated with historical orders for record keeping. New addresses must be validated before they can be used for checkout. Address validation ensures all required fields are present and properly formatted.

### Address Storage and Required Fields

WHEN a customer adds a shipping address, THE system SHALL:
1. Require recipient name as a mandatory field
2. Require phone number as a mandatory field
3. Require complete street address as a mandatory field
4. Require city as a mandatory field
5. Require state or province as a mandatory field
6. Require postal code as a mandatory field
7. Require country as a mandatory field
8. Allow customers to store multiple shipping addresses in their account
9. Validate that all required fields are present before saving

IF a required field is missing, THE system SHALL reject the address creation request.

WHEN a customer views their saved addresses, THE system SHALL:
1. Display all stored shipping addresses
2. Indicate which address is set as the default
3. Show the total count of saved addresses

THE system SHALL support storing unlimited shipping addresses per customer account.

### Address Edit and Deletion Permissions

WHEN a customer edits their shipping address, THE system SHALL:
1. Allow modification of any address field (recipient name, phone number, street address, city, state/province, postal code, country)
2. Require all fields to remain present after editing
3. Validate the edited address before saving changes

IF the edited address contains invalid data, THE system SHALL reject the update request.

WHEN a customer attempts to delete a shipping address, THE system SHALL:
1. Check if the address is associated with any active orders (paid or shipped status)
2. Check if the address is associated with any pending cancellation requests
3. Check if the address is associated with any pending refund requests
4. Block deletion if the address is used in any active or pending order
5. Allow deletion only if the address is not referenced by any order

IF the address is used in an active order, THE system SHALL reject the deletion request and inform the customer.

WHEN a customer deletes an unused address, THE system SHALL:
1. Remove the address from the customer's saved address list
2. Preserve the address record in historical order data
3. Complete the deletion immediately

THE system SHALL prevent deletion of addresses that are currently referenced by order records.

### Default Address Selection and Checkout Locking

WHEN a customer designates a default shipping address, THE system SHALL:
1. Allow selection of one address as the default from their saved addresses
2. Automatically select the default address during checkout if no other address is chosen
3. Update the default address designation immediately upon customer request
4. Allow customers to change the default address at any time

WHEN a customer proceeds to checkout, THE system SHALL:
1. Pre-select the default shipping address if one exists
2. Allow customers to choose a different saved address for the current order
3. Allow customers to use a new address for the current order
4. Lock the selected shipping address once the order is placed

WHEN an order is successfully placed, THE system SHALL:
1. Lock the shipping address associated with the order
2. Prevent any modifications to the shipping address after order placement
3. Preserve the locked address in the order record permanently
4. Display the locked shipping address in order history

WHEN a customer views their order history, THE system SHALL:
1. Display the shipping address used for each order
2. Show the address exactly as it was at the time of order placement
3. Maintain association between deleted addresses and historical orders
4. Preserve address data even if the customer later deletes it from their saved addresses

### Address Validation and Format Requirements

WHEN a customer enters a shipping address, THE system SHALL:
1. Validate that recipient name contains only alphabetic characters and spaces
2. Validate that phone number follows a valid format for the selected country
3. Validate that street address is not empty and contains sufficient detail
4. Validate that city field is not empty
5. Validate that state or province field matches the selected country's requirements
6. Validate that postal code matches the format required by the selected country
7. Validate that country is selected from the supported country list

IF any field fails validation, THE system SHALL:
1. Reject the address creation or update request
2. Display a specific error message indicating which field failed validation
3. Highlight the invalid field for correction

WHEN a customer selects a country, THE system SHALL:
1. Show only countries supported by the platform
2. Adjust required fields based on country-specific address formats
3. Apply country-specific postal code validation rules

WHEN an address is submitted for checkout, THE system SHALL:
1. Perform all validation rules before allowing order placement
2. Block order submission if any address field is invalid
3. Require correction of all validation errors before proceeding

THE system SHALL enforce address format requirements consistently across all address operations.

## Review Rules

Customers can write reviews only for products they have purchased and received. A review can only be written after the order item status becomes delivered. Each customer can write one review per product per order. Reviews require a rating between one and five stars. Review text content is optional and can be left blank. Reviews are displayed on the product detail page sorted by newest first. Customers can edit their own reviews after submission. Every review edit creates an immutable snapshot preserving the previous state. Customers can delete their own reviews but snapshots remain preserved. Product average ratings are calculated from all non-deleted reviews only. Deleted reviews are excluded from average rating calculations. Review snapshots are visible to administrators for dispute resolution.

### Review Eligibility Requirements

WHEN a customer attempts to write a review, THE system SHALL verify that the customer has purchased the product.

WHEN a customer attempts to write a review, THE system SHALL verify that the order item status is "delivered" for that product.

IF the order item status is not "delivered", THE system SHALL reject the review submission.

IF the customer has not purchased the product, THE system SHALL reject the review submission.

WHEN a customer attempts to write a review for a product, THE system SHALL verify that no existing review exists for that product in the same order.

IF a review already exists for the product in the same order, THE system SHALL reject the new review submission.

WHEN a customer purchases the same product in multiple orders, THE system SHALL allow one review per order.

WHEN a customer attempts to write a review, THE system SHALL verify that the customer account is active and not banned.

IF the customer account is banned, THE system SHALL reject the review submission.

WHEN a customer attempts to write a review, THE system SHALL verify that the product is not deleted.

IF the product is deleted, THE system SHALL reject the review submission.

### Review Submission Rules

WHEN a customer submits a review, THE system SHALL require a rating value.

WHEN a customer submits a review, THE system SHALL validate that the rating is between 1 and 5 stars.

IF the rating is less than 1, THE system SHALL reject the review submission.

IF the rating is greater than 5, THE system SHALL reject the review submission.

WHEN a customer submits a review, THE system SHALL allow optional text content.

IF the review text content is empty, THE system SHALL accept the review with only the rating.

WHEN a customer submits a review, THE system SHALL record the submission timestamp.

WHEN a customer submits a review, THE system SHALL associate the review with the customer account.

WHEN a customer submits a review, THE system SHALL associate the review with the specific product.

WHEN a customer submits a review, THE system SHALL associate the review with the specific order.

WHEN a review is submitted, THE system SHALL mark the review as non-deleted.

WHEN a review is submitted, THE system SHALL make the review visible on the product detail page.

### Review Modification and Deletion

WHEN a customer edits their review, THE system SHALL create an immutable snapshot of the previous review state.

WHEN a review snapshot is created, THE system SHALL record the timestamp of the change.

WHEN a review snapshot is created, THE system SHALL capture the rating value before the edit.

WHEN a review snapshot is created, THE system SHALL capture the text content before the edit.

WHEN a customer deletes their review, THE system SHALL mark the review as deleted.

WHEN a customer deletes their review, THE system SHALL preserve all review snapshots.

WHEN a customer deletes their review, THE system SHALL prevent deletion of snapshots.

WHEN a customer attempts to edit a review, THE system SHALL verify that the review belongs to the customer.

IF the review does not belong to the customer, THE system SHALL reject the edit request.

WHEN a customer attempts to delete a review, THE system SHALL verify that the review belongs to the customer.

IF the review does not belong to the customer, THE system SHALL reject the deletion request.

WHEN a review is deleted, THE system SHALL preserve the review metadata for audit purposes.

### Average Rating Calculation Rules

WHEN calculating the average rating for a product, THE system SHALL include only non-deleted reviews.

WHEN calculating the average rating for a product, THE system SHALL exclude all deleted reviews from the calculation.

WHEN a review is deleted, THE system SHALL recalculate the product average rating.

WHEN a new review is submitted, THE system SHALL recalculate the product average rating.

WHEN a review is edited, THE system SHALL recalculate the product average rating using the updated rating value.

WHEN calculating the average rating, THE system SHALL round the result to two decimal places.

IF no non-deleted reviews exist for a product, THE system SHALL display no average rating.

WHEN displaying the average rating, THE system SHALL show the total count of non-deleted reviews.

### Administrator Review Audit Access

WHEN an administrator requests to view review snapshots, THE system SHALL provide access to all snapshots for reviews on the platform.

WHEN an administrator views a review snapshot, THE system SHALL display the previous rating value.

WHEN an administrator views a review snapshot, THE system SHALL display the previous text content.

WHEN an administrator views a review snapshot, THE system SHALL display the timestamp of the change.

WHEN an administrator views a review snapshot, THE system SHALL display the customer who made the change.

WHEN a dispute is filed regarding a review, THE system SHALL make all review snapshots available for investigation.

WHEN an administrator views deleted reviews, THE system SHALL show the deletion status.

WHEN an administrator views deleted reviews, THE system SHALL show all associated snapshots.

## Wishlist Rules

Customers can add products to their personal wishlist for later purchase. The wishlist displays products rather than specific variants. Customers can view their complete wishlist with pagination support. Customers can remove individual products from their wishlist at any time. If a seller deletes a product, it is automatically removed from all wishlists. Products remain in the wishlist even if they become out of stock. Wishlist items do not reserve inventory or guarantee availability. The wishlist is private and visible only to the account owner. Wishlist creation timestamp is recorded for each saved product. Wishlist items can be added to the cart directly from the wishlist view.

### Wishlist Product Selection

WHEN a customer adds a product to their wishlist, THE system SHALL:
1. Record the product identifier
2. Record the creation timestamp
3. Associate the wishlist entry with the customer account
4. Ensure the product exists and is active
5. Prevent duplicate entries for the same product

IF the product is deleted by the seller, THE system SHALL automatically remove it from all customer wishlists.
IF the product is suspended by an administrator, THE system SHALL automatically remove it from all customer wishlists.
IF the customer attempts to add a product that already exists in their wishlist, THE system SHALL reject the request.
IF the product does not exist, THE system SHALL reject the request.
IF the customer is not authenticated, THE system SHALL reject the request.

### Wishlist Pagination

WHEN a customer views their wishlist, THE system SHALL:
1. Display products in paginated format
2. Show the creation timestamp for each entry
3. Display product main image, name, and base price
4. Indicate stock availability status
5. Allow sorting by date added

WHEN pagination is applied, THE system SHALL:
1. Return a consistent page size
2. Include total count of wishlist items
3. Provide navigation to next and previous pages
4. Maintain stable ordering across requests

IF the customer has no wishlist items, THE system SHALL display an empty state.
IF pagination parameters are invalid, THE system SHALL return an error.

### Product Removal Flexibility

WHEN a customer removes a product from their wishlist, THE system SHALL:
1. Delete the wishlist entry immediately
2. Not affect the product's availability in the catalog
3. Not affect any other customer's wishlist entries
4. Not restore inventory reservations (none exist)

IF the product is deleted by the seller, THE system SHALL automatically remove it from all wishlists without customer action.
IF the customer attempts to remove a product not in their wishlist, THE system SHALL reject the request.
IF the customer does not own the wishlist entry, THE system SHALL reject the request.

### Out of Stock Wishlist Items

WHEN a product in the wishlist becomes out of stock, THE system SHALL:
1. Keep the product in the wishlist
2. Display an out of stock indicator
3. Allow the customer to view the product details
4. Prevent adding to cart until stock is available

WHEN a product variant has zero stock quantity, THE system SHALL mark it as unavailable in the wishlist view.
WHEN stock is restored to a previously out of stock product, THE system SHALL update the availability status.

IF a customer attempts to add an out of stock variant to cart from wishlist, THE system SHALL reject the request with an availability warning.

### Inventory Reservation Rules

WHEN a product is added to wishlist, THE system SHALL NOT:
1. Reserve inventory for the customer
2. Block other customers from purchasing
3. Guarantee availability for future purchase
4. Create any inventory records

WHEN a customer adds a variant to cart from wishlist, THE system SHALL:
1. Check current stock availability
2. Create a cart item with the selected variant
3. Not modify the wishlist entry
4. Allow the customer to remove from wishlist independently

IF stock is insufficient for the requested cart quantity, THE system SHALL warn the customer.
IF the product is deleted after being added to wishlist, THE system SHALL remove it from the wishlist before cart addition is attempted.

### Wishlist Privacy Settings

WHEN a customer accesses their wishlist, THE system SHALL:
1. Verify the customer owns the wishlist entries
2. Prevent other customers from viewing the wishlist
3. Prevent unauthenticated users from accessing the wishlist
4. Allow the customer to view their complete wishlist

WHEN a wishlist entry is created, THE system SHALL:
1. Record the exact timestamp of creation
2. Associate the entry with the authenticated customer
3. Store the product reference at that point in time
4. Preserve the timestamp even if the product is later deleted

IF another customer attempts to access the wishlist, THE system SHALL reject the request.
IF an unauthenticated user attempts to access the wishlist, THE system SHALL redirect to login.
IF the customer account is banned, THE system SHALL deny wishlist access.

### Creation Timestamp Tracking

WHEN a customer adds a product to their wishlist, THE system SHALL:
1. Record the creation timestamp in UTC
2. Display the timestamp in the customer's local timezone
3. Include the timestamp in wishlist list views
4. Use the timestamp for sorting operations

WHEN a wishlist entry is viewed, THE system SHALL:
1. Show when the product was added
2. Display relative time (e.g., "2 days ago") where appropriate
3. Preserve the original timestamp even if the product is deleted

IF the customer requests sorting by date, THE system SHALL use the creation timestamp as the sort key.
IF multiple entries have the same timestamp, THE system SHALL use product ID as a secondary sort key.

### Cart Addition from Wishlist

WHEN a customer adds a variant to cart from wishlist, THE system SHALL:
1. Require the customer to select a specific variant
2. Validate the variant exists and is active
3. Check stock availability before adding to cart
4. Create a cart item with the selected quantity
5. Not automatically remove the product from wishlist

WHEN the variant is already in the cart, THE system SHALL:
1. Combine quantities rather than creating duplicate entries
2. Update the cart item timestamp
3. Recalculate the cart total

IF the variant is out of stock, THE system SHALL warn the customer and prevent cart addition.
IF the variant is deleted, THE system SHALL mark the wishlist item as unavailable.
IF the customer does not select a variant, THE system SHALL prompt for variant selection.

## CartItem Rules

Customers can add product variants to their shopping cart with specified quantities. Customers must select a specific variant rather than just a product. When adding a variant already in the cart, quantities are combined into one line item. The cart displays product name, variant options, price, quantity, and subtotal for each item. Customers can modify the quantity of items already in their cart. Customers can remove individual items from their cart at any time. The cart shows the total price of all items combined. If a variant stock is less than the cart quantity, a warning is displayed. Variants that are out of stock are marked as unavailable in the cart. Deleted variants are also marked as unavailable in the cart. Unavailable items cannot be included in order checkout. Cart items are removed from the cart when the order is successfully placed.

### Variant Selection Requirement

WHEN a customer adds a product to their cart, THE system SHALL require selection of a specific product variant.

WHEN a customer adds a product to their cart, THE system SHALL NOT allow adding just a product without variant selection.

WHEN a customer views the product detail page, THE system SHALL present all available variants for selection.

IF a product has no variants, THE system SHALL display the product as unavailable for cart addition.

WHEN a customer selects a variant, THE system SHALL validate that the variant exists and is associated with the selected product.

IF the selected variant does not exist, THE system SHALL reject the add-to-cart request.

IF the selected variant belongs to a different product than specified, THE system SHALL reject the add-to-cart request.

### Quantity Combination Logic

WHEN a customer adds a variant to their cart that already exists in the cart, THE system SHALL combine the quantities into a single cart item.

WHEN quantities are combined, THE system SHALL NOT create a duplicate cart item entry for the same variant.

WHEN a customer adds quantity 3 of a variant that already has quantity 2 in the cart, THE system SHALL update the cart item to quantity 5.

WHEN quantities are combined, THE system SHALL retain the original added timestamp of the first cart item entry.

WHEN quantities are combined, THE system SHALL update the updatedAt timestamp to the current time.

IF the combined quantity exceeds available stock, THE system SHALL display a stock warning but still add the item to the cart.

### Cart Display Information

WHEN a customer views their cart, THE system SHALL display the product name for each cart item.

WHEN a customer views their cart, THE system SHALL display the variant option values for each cart item.

WHEN a customer views their cart, THE system SHALL display the unit price for each cart item.

WHEN a customer views their cart, THE system SHALL display the quantity for each cart item.

WHEN a customer views their cart, THE system SHALL display the subtotal (unit price multiplied by quantity) for each cart item.

WHEN a customer views their cart, THE system SHALL display the total price of all items combined.

WHEN variant prices differ from the product base price, THE system SHALL display the variant-specific price in the cart.

### Quantity Modification Rules

WHEN a customer modifies the quantity of a cart item, THE system SHALL update the cart item with the new quantity.

WHEN a customer increases the quantity of a cart item, THE system SHALL validate that the new quantity does not exceed available stock.

WHEN a customer decreases the quantity of a cart item, THE system SHALL accept the change if the new quantity is at least 1.

IF a customer sets the quantity to 0, THE system SHALL treat this as item removal instead of quantity update.

IF a customer sets a negative quantity, THE system SHALL reject the modification request.

WHEN a customer modifies quantity, THE system SHALL recalculate the item subtotal and cart total.

WHEN stock changes after an item is in the cart, THE system SHALL display a warning if the cart quantity exceeds available stock.

### Item Removal Flexibility

WHEN a customer removes an item from their cart, THE system SHALL permanently delete the cart item entry.

WHEN a customer removes an item from their cart, THE system SHALL recalculate the cart total after removal.

WHEN a customer removes an item from their cart, THE system SHALL allow removal at any time before checkout.

WHEN a customer removes an item from their cart, THE system SHALL NOT require a reason for removal.

WHEN a customer removes an item from their cart, THE system SHALL NOT prevent removal due to order status or other constraints.

### Cart Total Calculation

WHEN calculating the cart total, THE system SHALL sum all item subtotals (unit price multiplied by quantity).

WHEN calculating the cart total, THE system SHALL include all items in the cart regardless of availability status.

WHEN a customer modifies any cart item, THE system SHALL recalculate the cart total immediately.

WHEN an item is added to the cart, THE system SHALL recalculate the cart total to include the new item.

WHEN an item is removed from the cart, THE system SHALL recalculate the cart total excluding the removed item.

WHEN a variant price changes while the item is in the cart, THE system SHALL display the current price but preserve the price at time of checkout.

### Stock Quantity Warnings

WHEN a cart item quantity exceeds the variant's available stock, THE system SHALL display a warning to the customer.

WHEN a stock warning is displayed, THE system SHALL indicate the available stock quantity to the customer.

WHEN a stock warning is displayed, THE system SHALL NOT prevent adding the item to the cart.

WHEN a stock warning is displayed, THE system SHALL prevent checkout of items exceeding available stock.

WHEN stock is updated while items are in the cart, THE system SHALL re-evaluate stock warnings for affected items.

IF a variant's stock reaches 0, THE system SHALL mark the variant as out of stock in the cart.

### Out of Stock Marking

WHEN a variant's stock quantity reaches 0, THE system SHALL mark the variant as out of stock in the cart.

WHEN a variant is marked as out of stock, THE system SHALL display this status clearly to the customer.

WHEN a variant is marked as out of stock, THE system SHALL prevent adding new items of that variant to the cart.

WHEN a variant is marked as out of stock, THE system SHALL allow existing cart items of that variant to remain in the cart.

WHEN a variant is marked as out of stock, THE system SHALL prevent checkout of cart items for that variant.

WHEN stock is restocked for an out of stock variant, THE system SHALL update the availability status in the cart.

### Deleted Variant Handling

WHEN a product variant is deleted by the seller, THE system SHALL mark the variant as unavailable in all customer carts.

WHEN a variant is marked as unavailable due to deletion, THE system SHALL display this status to the customer.

WHEN a variant is deleted, THE system SHALL prevent adding new items of that variant to any cart.

WHEN a variant is deleted, THE system SHALL allow existing cart items of that variant to remain visible but marked as unavailable.

WHEN a variant is deleted, THE system SHALL prevent checkout of cart items for the deleted variant.

WHEN a product is deleted (not just a variant), THE system SHALL mark all variants as unavailable in all customer carts.

### Checkout Availability Validation

WHEN a customer proceeds to checkout, THE system SHALL validate that all cart items are available for purchase.

WHEN validating checkout availability, THE system SHALL reject checkout if any cart item is out of stock.

WHEN validating checkout availability, THE system SHALL reject checkout if any cart item is marked as unavailable.

WHEN validating checkout availability, THE system SHALL reject checkout if any cart item is for a deleted variant.

WHEN checkout is rejected due to unavailable items, THE system SHALL display which items cannot be checked out.

WHEN checkout is rejected due to unavailable items, THE system SHALL allow the customer to remove unavailable items and retry.

WHEN all cart items are available, THE system SHALL allow the customer to proceed with checkout.

WHEN a customer proceeds to checkout, THE system SHALL lock the current cart state to prevent modifications during payment processing.

## Shipment Rules

A shipment represents a physical package sent by a seller to a customer. Each shipment can contain one or more order items from the same seller. Different sellers always ship separately with their own shipments. Sellers can choose to ship items individually or bundle multiple items together. Sellers enter tracking information including carrier name and tracking number. All items within the same shipment share identical tracking information. When a shipment is created, all items in it change to shipped status. Customers can view tracking information for each shipment in their order details. Customers confirm delivery per shipment rather than per individual item. When delivery is confirmed, all items in that shipment change to delivered status. Items automatically change to delivered status after fourteen days from shipping if not confirmed. Shipment creation timestamps are recorded for delivery tracking purposes.

### Shipment Package Definition

WHEN a seller creates a shipment, THE system SHALL:
1. Define the shipment as a physical package sent to a customer
2. Allow the shipment to contain one or more order items from the same seller
3. Require all items in the shipment to belong to the same seller
4. Prevent items from different sellers from being grouped in the same shipment
5. Allow sellers to bundle multiple items into one shipment or ship items individually
6. Record the shipment creation timestamp for delivery tracking purposes

WHEN an order contains items from multiple sellers, THE system SHALL:
1. Create separate shipments for each seller
2. Ensure each shipment only contains items from one seller
3. Allow each seller to independently manage their shipments

IF a seller attempts to add items from different sellers to one shipment, THE system SHALL reject the request.

IF a seller attempts to create a shipment with no items, THE system SHALL reject the request.

### Tracking Information Management

WHEN a seller creates a shipment, THE system SHALL:
1. Require the seller to enter a tracking number
2. Require the seller to enter a carrier name
3. Associate the tracking information with all items in the shipment
4. Ensure all items in the same shipment share identical tracking information

WHEN a seller updates shipment tracking information, THE system SHALL:
1. Allow the seller to update the tracking number
2. Allow the seller to update the carrier name
3. Update the tracking information for all items in the shipment simultaneously

IF the tracking number is missing, THE system SHALL reject the shipment creation request.

IF the carrier name is missing, THE system SHALL reject the shipment creation request.

WHEN a customer views an order with shipments, THE system SHALL display:
1. The tracking number for each shipment
2. The carrier name for each shipment
3. The shipping date for each shipment
4. The delivery status for each shipment

### Shipment Status Transitions

WHEN a seller creates a shipment, THE system SHALL:
1. Change the status of all items in the shipment to "shipped"
2. Record the shipped timestamp
3. Notify the customer that items have been shipped

WHILE an item has status "shipped", THE system SHALL:
1. Allow the customer to view tracking information
2. Allow the customer to confirm delivery
3. Prevent the item from being cancelled
4. Prevent the item from being refunded

WHEN a customer confirms delivery for a shipment, THE system SHALL:
1. Change the status of all items in the shipment to "delivered"
2. Record the delivered timestamp
3. Enable the customer to write reviews for delivered items

IF a customer does not confirm delivery, THE system SHALL automatically change the item status to "delivered" after fourteen days from the shipping date.

WHEN all items in an order reach "delivered" status, THE system SHALL update the overall order status to "delivered".

WHEN some items in an order are delivered and others have different statuses, THE system SHALL update the overall order status to "partially completed".

### Shipment Timestamp Recording

WHEN a shipment is created, THE system SHALL:
1. Record the shippedAt timestamp when the shipment is created
2. Store the shipped timestamp immutably for delivery tracking
3. Use the shipped timestamp to calculate the fourteen-day auto-delivery period

WHEN delivery is confirmed by the customer, THE system SHALL:
1. Record the deliveredAt timestamp
2. Store the delivered timestamp immutably

WHEN delivery is automatic after fourteen days, THE system SHALL:
1. Calculate the delivery date as fourteen days from shippedAt
2. Record the deliveredAt timestamp at the time of automatic delivery
3. Distinguish between customer-confirmed and automatic delivery in audit logs

WHILE tracking delivery timelines, THE system SHALL:
1. Use shippedAt as the reference point for the fourteen-day auto-delivery rule
2. Ensure the fourteen-day period is calculated in calendar days
3. Apply the fourteen-day rule uniformly across all shipments

IF the shippedAt timestamp is missing, THE system SHALL reject the shipment creation request.

## Snapshot Rules

Snapshots are created whenever editable data is modified in the system. Each snapshot records when the change was made and what was changed. Snapshots capture both the previous values and the new values after modification. All snapshots are immutable and cannot be deleted once created. Snapshots are preserved even when the original data is deleted. Relevant parties including owners and administrators can view snapshots for dispute resolution. Product snapshots include all product fields and their variant snapshots. Order item snapshots preserve product, variant, and seller profile information at purchase time. Review snapshots capture rating and text content changes. Cancellation and refund request snapshots record status changes and reasons. Seller profile snapshots preserve shop name, description, and logo changes. Snapshot access is controlled based on entity ownership and administrator privileges.

### Snapshot Creation Triggers

WHEN a customer edits their display name or phone number, THE system SHALL create a snapshot recording the previous and new values.

WHEN a seller edits their shop name, shop description, or logo, THE system SHALL create a snapshot recording the previous and new values.

WHEN a seller creates a product, THE system SHALL create an initial snapshot recording all product fields.

WHEN a seller edits any product field (name, description, category, base price, or images), THE system SHALL create a snapshot recording all product fields and their variant snapshots.

WHEN a seller adds, edits, or deletes a product variant, THE system SHALL create a snapshot recording the variant's SKU code, option values, price, and stock quantity.

WHEN a customer writes a review, THE system SHALL create an initial snapshot recording the rating and text content.

WHEN a customer edits their review, THE system SHALL create a snapshot recording the previous and new rating and text content.

WHEN a customer requests cancellation of an order item, THE system SHALL create a snapshot recording the request reason and initial pending status.

WHEN a seller approves or rejects a cancellation request, THE system SHALL create a snapshot recording the status change and response.

WHEN a customer requests a refund for an order item, THE system SHALL create a snapshot recording the request reason and initial pending status.

WHEN a seller approves or rejects a refund request, THE system SHALL create a snapshot recording the status change and response.

WHEN an order is placed with payment success, THE system SHALL create order item snapshots preserving the product name, description, variant options, price, and seller shop name and logo at the time of purchase.

### Snapshot Data Integrity Rules

THE system SHALL record the exact timestamp when each snapshot is created.

THE system SHALL capture both the previous values and the new values for all changed fields in each snapshot.

THE system SHALL ensure snapshots are immutable once created.

THE system SHALL NOT allow any modification to existing snapshots.

THE system SHALL NOT allow deletion of any snapshot.

THE system SHALL preserve snapshots even when the original entity is deleted.

THE system SHALL preserve product snapshots even when the product is deleted by the seller or administrator.

THE system SHALL preserve seller profile snapshots even when the seller account is deleted.

THE system SHALL preserve review snapshots even when the review is deleted by the customer.

THE system SHALL preserve cancellation and refund request snapshots even after the request reaches a terminal status.

THE system SHALL preserve order item snapshots even when the order is cancelled or refunded.

THE system SHALL ensure product snapshots include all product fields and complete variant snapshots at the time of the change.

### Snapshot Access Control

THE owner of an entity SHALL be able to view all snapshots of their own entities.

Customers SHALL be able to view snapshots of their own products.

Customers SHALL be able to view snapshots of their own seller profiles.

Customers SHALL be able to view snapshots of their own reviews.

Customers SHALL be able to view snapshots of their own cancellation and refund requests.

Administrators SHALL be able to view snapshots of any product on the platform.

Administrators SHALL be able to view snapshots of any seller profile.

Administrators SHALL be able to view snapshots of any review.

Administrators SHALL be able to view snapshots of any cancellation or refund request.

Administrators SHALL be able to view snapshots of any order item.

THE system SHALL restrict snapshot access based on entity ownership and administrator privileges.

### Snapshot Dispute Resolution Usage

Snapshots SHALL be used as the authoritative record for dispute resolution between customers and sellers.

THE system SHALL provide snapshot history to administrators for investigating transaction disputes.

THE system SHALL preserve the complete state of products and variants at the time of purchase in order item snapshots.

THE system SHALL preserve the seller profile information at the time of purchase to support seller accountability.

THE system SHALL enable customers to view product snapshots to verify product changes before purchase.

THE system SHALL enable sellers to view product snapshots to track their own product modification history.

THE system SHALL enable administrators to view all snapshots for compliance and audit purposes.

THE system SHALL ensure snapshot data supports resolution of pricing disputes by preserving historical prices.

THE system SHALL ensure snapshot data supports resolution of product description disputes by preserving historical descriptions.

THE system SHALL ensure snapshot data supports resolution of seller identity disputes by preserving historical shop names and logos.

## InventoryRecord Rules

Stock quantities are managed through inventory history records rather than direct updates. Each inventory record contains a quantity change value with positive or negative amounts. Positive quantities represent restocking while negative quantities represent orders or adjustments. Each record includes a reason describing why the inventory change occurred. Recording timestamps are captured for each inventory transaction. Current stock is calculated by summing all inventory records for a variant. Sellers can add inventory through restocking with a quantity and reason. Sellers can subtract inventory for adjustments or loss with a reason. Order placement automatically creates a negative inventory record. Order cancellation automatically creates a positive inventory record to restore stock. Order refund automatically creates a positive inventory record to restore stock. Sellers can view the complete inventory history for each product variant.

### Inventory History Management

WHEN inventory changes occur, THE system SHALL create an inventory history record for each transaction.

WHEN a seller restocks inventory, THE system SHALL:
1. Create an inventory record with a positive quantity change value
2. Record the restocking reason provided by the seller
3. Capture the timestamp of the restocking operation
4. Update the current stock calculation to reflect the new total

WHEN a seller adjusts inventory for loss or correction, THE system SHALL:
1. Create an inventory record with a negative quantity change value
2. Record the adjustment reason provided by the seller
3. Capture the timestamp of the adjustment operation
4. Update the current stock calculation to reflect the new total

WHEN an order is placed, THE system SHALL automatically create an inventory record with a negative quantity change for each purchased variant.

WHEN an order item is cancelled, THE system SHALL automatically create an inventory record with a positive quantity change to restore stock.

WHEN an order item is refunded, THE system SHALL automatically create an inventory record with a positive quantity change to restore stock.

THE system SHALL maintain all inventory records in chronological order for each product variant.

THE system SHALL ensure inventory records are immutable once created and cannot be deleted.

WHEN a seller views inventory history, THE system SHALL display all inventory records for the selected variant including quantity changes, reasons, and timestamps.

### Current Stock Calculation

WHEN calculating current stock quantity for a variant, THE system SHALL sum all inventory records for that variant.

WHEN inventory records are summed, THE system SHALL include both positive values (restocking) and negative values (orders, adjustments).

WHEN the calculated stock quantity equals zero, THE system SHALL mark the variant as "out of stock" in all customer-facing displays.

WHEN a variant is marked as out of stock, THE system SHALL prevent customers from adding that variant to their cart.

WHEN a variant's stock quantity is greater than zero, THE system SHALL display the available quantity to customers.

WHEN a customer adds a variant to their cart, THE system SHALL validate that the requested quantity does not exceed available stock.

WHEN stock quantity is less than the cart quantity, THE system SHALL display a warning to the customer.

THE system SHALL ensure current stock calculations are consistent across all customer-facing operations including search, category browsing, and cart operations.

### Seller Inventory Permissions

WHEN a seller wants to add inventory, THE system SHALL allow the seller to specify a positive quantity and reason for restocking.

WHEN a seller wants to adjust inventory downward, THE system SHALL allow the seller to specify a negative quantity and reason for the adjustment.

WHEN a seller submits an inventory change, THE system SHALL validate that the reason field is provided and contains meaningful documentation.

WHEN inventory changes are automatically triggered by order operations, THE system SHALL record the operation type as the reason (e.g., "order placed", "order cancelled", "order refunded").

WHEN a seller views their product variants, THE system SHALL display the current stock quantity calculated from all inventory records.

WHEN a seller views inventory history for a variant, THE system SHALL display the complete list of inventory records with quantity changes, reasons, and timestamps.

WHEN stock reaches zero after an order or adjustment, THE system SHALL update the variant status to "out of stock" immediately.

WHEN stock is restored through cancellation or refund, THE system SHALL update the variant status from "out of stock" to available immediately.

## CancellationRequest Rules

Customers can request cancellation for individual order items with paid status. Items with shipped or delivered status cannot be cancelled. Cancellation requests must include a reason explaining the cancellation. Each cancellation request has a status of pending, approved, or rejected. The seller of the item can approve or reject the cancellation request. When a seller responds, a snapshot of the request state is created. Approved cancellations result in the item being cancelled and refund processed. Cancelled items restore their stock quantities through inventory records. The remaining items in the order continue processing normally. If all items in an order are cancelled, the entire order status becomes cancelled. Cancellation requests are visible to both the customer and the seller.

### Cancellation Eligibility

WHEN a customer requests cancellation for an order item, THE system SHALL verify the item has paid status.

WHEN an order item has shipped status, THE system SHALL reject the cancellation request.

WHEN an order item has delivered status, THE system SHALL reject the cancellation request.

WHEN an order item has cancelled status, THE system SHALL reject the cancellation request.

WHEN an order item has refunded status, THE system SHALL reject the cancellation request.

THE system SHALL allow cancellation requests only for items with paid status.

THE system SHALL prevent cancellation requests for items that have already been shipped to the customer.

THE system SHALL prevent cancellation requests for items that have been delivered to the customer.

THE system SHALL prevent duplicate cancellation requests for items that are already cancelled.

THE system SHALL prevent duplicate cancellation requests for items that have been refunded.

### Cancellation Request Creation

WHEN a customer creates a cancellation request, THE system SHALL require a reason field with text content.

WHEN a customer creates a cancellation request, THE system SHALL set the initial status to pending.

WHEN a customer creates a cancellation request, THE system SHALL record the timestamp when the request was created.

WHEN a customer creates a cancellation request, THE system SHALL associate the request with the specific order item.

WHEN a customer creates a cancellation request, THE system SHALL associate the request with the requesting customer.

THE system SHALL require customers to provide a reason explaining why they want to cancel the order item.

THE system SHALL set all new cancellation requests to pending status until the seller responds.

THE system SHALL record the exact timestamp when each cancellation request is created.

IF the reason field is empty or missing, THE system SHALL reject the cancellation request creation.

IF the order item does not exist, THE system SHALL reject the cancellation request creation.

### Seller Approval Process

WHEN a seller responds to a cancellation request, THE system SHALL create a snapshot of the request state.

WHEN a seller responds to a cancellation request, THE system SHALL allow the seller to approve or reject the request.

WHEN a seller approves a cancellation request, THE system SHALL update the request status to approved.

WHEN a seller rejects a cancellation request, THE system SHALL update the request status to rejected.

WHEN a seller responds to a cancellation request, THE system SHALL record the timestamp when the seller responded.

THE system SHALL allow only the seller of the order item to approve or reject cancellation requests.

THE system SHALL create an immutable snapshot whenever the seller responds to a cancellation request.

THE system SHALL preserve the request state before and after the seller's response in the snapshot.

THE system SHALL prevent customers from modifying or responding to their own cancellation requests.

THE system SHALL prevent other sellers from responding to cancellation requests for items they do not sell.

### Cancellation Effects

WHEN a cancellation request is approved, THE system SHALL update the order item status to cancelled.

WHEN a cancellation request is approved, THE system SHALL restore the stock quantities for the cancelled item.

WHEN a cancellation request is approved, THE system SHALL create an inventory record for the stock restoration.

WHEN a cancellation request is approved, THE system SHALL process the refund for the cancelled item only.

WHEN all items in an order are cancelled, THE system SHALL update the order status to cancelled.

WHEN only some items in an order are cancelled, THE system SHALL preserve the status of remaining items.

THE system SHALL restore stock quantities through inventory records when cancellations are approved.

THE system SHALL process refunds only for the specific cancelled order item, not the entire order.

THE system SHALL update the overall order status based on the remaining items when partial cancellation occurs.

THE system SHALL ensure cancelled items cannot be shipped or delivered after approval.

THE system SHALL prevent further status transitions for cancelled order items.

IF all order items become cancelled, THE system SHALL mark the entire order as cancelled.

### Request Visibility and Access

THE system SHALL make cancellation requests visible to the customer who created them.

THE system SHALL make cancellation requests visible to the seller of the order item.

THE system SHALL make cancellation requests visible to administrators for oversight.

THE system SHALL restrict cancellation request access to authorized parties only.

THE system SHALL prevent other customers from viewing cancellation requests they do not own.

THE system SHALL prevent unauthorized sellers from viewing cancellation requests for items they do not sell.

THE system SHALL display the current status of cancellation requests to both customer and seller.

THE system SHALL display the response timestamp and outcome to both customer and seller when the seller responds.

THE system SHALL allow customers to view the history of their cancellation requests in order details.

THE system SHALL allow sellers to view all pending cancellation requests for their products in the seller dashboard.

## RefundRequest Rules

Customers can request refunds for individual order items with delivered status. Refund requests can only be made within seven days of item delivery. Each refund request must include a reason explaining the refund request. Refund request status can be pending, approved, or rejected. The seller of the item can approve or reject the refund request. When a seller responds, a snapshot of the request state is created. Approved refunds result in the item being refunded to the customer. Refunded items restore their stock quantities through inventory records. Remaining items in the order are unaffected by individual item refunds. If all items in an order are refunded, the entire order status becomes refunded. Refund requests are visible to both the customer and the seller for tracking purposes.

### Refund Eligibility Requirements

WHEN a customer requests a refund for an order item, THE system SHALL verify the item has "delivered" status.

WHEN a customer requests a refund for an order item, THE system SHALL verify the request is made within seven days of the item being delivered.

IF the order item status is not "delivered", THE system SHALL reject the refund request.

IF more than seven days have passed since delivery, THE system SHALL reject the refund request.

IF the order item has already been cancelled or refunded, THE system SHALL reject the refund request.

THE system SHALL allow customers to request refunds for individual order items only.

THE system SHALL NOT allow customers to request refunds for entire orders at once.

THE system SHALL allow customers to view the delivery date when determining refund eligibility.

THE system SHALL calculate the seven day window from the delivery confirmation timestamp or automatic delivery confirmation after 14 days from shipping.

### Refund Request Documentation

WHEN a customer submits a refund request, THE system SHALL require a reason text field to be provided.

THE system SHALL validate that the refund reason is not empty.

THE system SHALL allow customers to provide detailed explanations for their refund requests.

THE system SHALL store the refund reason with the request for seller review.

THE system SHALL allow customers to view their submitted refund reason when tracking request status.

THE system SHALL NOT modify the refund reason after submission.

### Refund Request Status Workflow

WHEN a refund request is created, THE system SHALL set its initial status to "pending".

WHEN a seller approves a refund request, THE system SHALL update the request status to "approved".

WHEN a seller rejects a refund request, THE system SHALL update the request status to "rejected".

WHEN a refund request status changes, THE system SHALL record the timestamp of the status change.

THE system SHALL allow customers to view the current status of their refund requests.

THE system SHALL allow sellers to view the current status of refund requests for their products.

THE system SHALL NOT allow status changes from "approved" or "rejected" back to "pending".

THE system SHALL allow administrators to view all refund request statuses for oversight purposes.

### Seller Review Process

WHEN a refund request enters "pending" status, THE system SHALL notify the seller of the item.

WHEN a seller reviews a refund request, THE system SHALL display the refund reason to the seller.

WHEN a seller approves a refund request, THE system SHALL process the refund for that item only.

WHEN a seller rejects a refund request, THE system SHALL require the seller to provide a rejection reason.

THE system SHALL allow sellers to view all pending refund requests for their products.

THE system SHALL allow sellers to view the order context when reviewing refund requests.

THE system SHALL NOT allow sellers to approve refund requests for items they do not sell.

THE system SHALL allow administrators to intervene and approve or reject refund requests when necessary.

### Response Snapshot Creation

WHEN a seller responds to a refund request (approve or reject), THE system SHALL create a snapshot of the request state.

THE system SHALL record the timestamp when the snapshot was created.

THE system SHALL capture the request status before the response in the snapshot.

THE system SHALL capture the request status after the response in the snapshot.

THE system SHALL capture the seller's decision and any rejection reason in the snapshot.

THE system SHALL mark the snapshot as immutable after creation.

THE system SHALL allow customers to view snapshots of their refund requests.

THE system SHALL allow sellers to view snapshots of refund requests for their products.

THE system SHALL allow administrators to view all refund request snapshots for dispute resolution.

### Stock Restoration on Refund

WHEN a refund request is approved, THE system SHALL restore the stock quantity of the refunded variant.

THE system SHALL create an inventory record with a positive quantity change for the refunded item.

THE system SHALL record "refund" as the reason for the inventory restoration in the inventory record.

THE system SHALL record the timestamp of the inventory restoration.

THE system SHALL calculate the new stock quantity by adding the refunded quantity to the current stock.

THE system SHALL allow sellers to view the inventory restoration record for refunded items.

THE system SHALL NOT restore stock for items that were already cancelled.

### Partial Refund Handling

WHEN a refund request is approved for an order item, THE system SHALL update only that item's status to "refunded".

THE system SHALL allow other items in the same order to continue processing normally.

THE system SHALL allow customers to request refunds for different items in the same order separately.

THE system SHALL allow customers to view which items in their order have been refunded.

THE system SHALL allow customers to view which items in their order are still processing.

THE system SHALL NOT require all items in an order to be refunded together.

### Order Status Finalization

WHEN all items in an order reach "refunded" status, THE system SHALL update the order status to "refunded".

WHEN some items in an order are refunded and others are delivered, THE system SHALL update the order status to "partiallyCompleted".

WHEN some items in an order are refunded and others are cancelled, THE system SHALL update the order status to "partiallyCompleted".

THE system SHALL calculate the order status based on all order item statuses.

THE system SHALL allow customers to view the overall order status in their order history.

THE system SHALL allow administrators to view the overall order status for oversight purposes.

THE system SHALL update the order status immediately when any item status changes to refunded.

# Detailed Validation Rules

Detailed validation rules with boundary values and format requirements.

## Customer Validation Rules

Customer accounts require valid email addresses in standard format with no duplicate emails allowed among active accounts. Passwords must meet minimum security requirements including length and complexity. Display names are optional but when provided must not exceed reasonable length limits. Phone numbers follow standard format requirements for the customer's region. Account deletion requests are processed immediately but preserve order history and reviews for legal compliance. Deleted customer accounts cannot be reactivated with the same email address. Email verification links expire after a defined time period to prevent stale account creation. Login attempts are rate-limited to prevent brute force attacks. Password change requests require current password verification before allowing updates. Account suspension by administrators prevents login but preserves all data for potential reinstatement.

### Email Format and Uniqueness Validation

WHEN a customer registers with an email address, THE system SHALL:
1. Validate the email follows standard email format (local-part@domain with valid TLD)
2. Check that no active account exists with the same email address
3. Reject registration if email format is invalid
4. Reject registration if email is already associated with an active account

WHEN a customer attempts to change their email address, THE system SHALL:
1. Validate the new email follows standard email format
2. Check that no other active account uses the new email address
3. Reject the change if the new email format is invalid
4. Reject the change if the new email is already in use by another active account

IF a customer submits an email with invalid format, THE system SHALL reject the request and indicate the format requirement.
IF a customer submits an email that is already registered, THE system SHALL reject the request and indicate the email is in use.

Email addresses are case-insensitive for uniqueness checks. The system SHALL treat "Customer@Example.com" and "customer@example.com" as the same email.

### Password Security Requirements

WHEN a customer creates an account, THE system SHALL:
1. Require a password with minimum 8 characters
2. Require at least one uppercase letter
3. Require at least one lowercase letter
4. Require at least one digit
5. Store the password as a securely hashed value

WHEN a customer changes their password, THE system SHALL:
1. Require verification of the current password before allowing the change
2. Validate the new password meets all complexity requirements
3. Reject the change if current password verification fails
4. Reject the change if the new password does not meet complexity requirements

WHEN a customer logs in with incorrect credentials, THE system SHALL:
1. Record the failed login attempt
2. Apply rate limiting after 5 consecutive failed attempts within 15 minutes
3. Temporarily lock the account for 30 minutes after rate limit is triggered
4. Clear the failed attempt counter after successful login

IF a customer enters an incorrect password during registration, THE system SHALL reject the registration and indicate password requirements.
IF a customer enters an incorrect current password during password change, THE system SHALL reject the change request and indicate verification failed.

### Profile Information Validation

WHEN a customer provides a display name, THE system SHALL:
1. Accept display names with 1 to 50 characters
2. Accept empty or null display names (display name is optional)
3. Reject display names exceeding 50 characters
4. Allow customers to update their display name at any time

WHEN a customer provides a phone number, THE system SHALL:
1. Validate phone numbers follow standard international format (+[country code][number])
2. Accept phone numbers with 10 to 20 digits (excluding country code prefix)
3. Accept empty or null phone numbers (phone number is optional)
4. Reject phone numbers that do not match the required format

WHEN a customer updates their profile, THE system SHALL:
1. Allow partial updates (display name only, phone number only, or both)
2. Validate only the fields being updated
3. Preserve existing values for fields not included in the update

IF a customer submits a display name exceeding 50 characters, THE system SHALL reject the update and indicate the length limit.
IF a customer submits a phone number in invalid format, THE system SHALL reject the update and indicate the format requirement.

### Account Lifecycle and Deletion Rules

WHEN a customer requests account deletion, THE system SHALL:
1. Process the deletion request immediately
2. Remove all customer profile information (display name, phone number)
3. Preserve all order records and order history for legal and seller record purposes
4. Preserve all reviews but mark them as "deleted user"
5. Remove the customer from all wishlists (products remain in wishlists of other customers)
6. Prevent reactivation of deleted accounts with the same email address

WHEN a customer account is suspended by an administrator, THE system SHALL:
1. Prevent the customer from logging in
2. Preserve all customer data including orders, reviews, and wishlists
3. Allow the administrator to unsuspend the account at any time
4. Restore full account access upon unsuspension

WHEN a customer account is banned by an administrator, THE system SHALL:
1. Prevent the customer from logging in permanently
2. Preserve all customer data for administrative review
3. Allow the administrator to unban the account if circumstances change

IF a customer attempts to log in with a suspended account, THE system SHALL reject the login and indicate the account status.
IF a customer attempts to log in with a banned account, THE system SHALL reject the login and indicate the account status.

Email verification links expire after 24 hours. THE system SHALL reject verification attempts after the expiration period.

### Login Security and Rate Limiting

WHEN a customer attempts to log in, THE system SHALL:
1. Accept valid email and password combinations
2. Reject invalid email and password combinations
3. Track consecutive failed login attempts per email address
4. Apply rate limiting after 5 consecutive failed attempts within a 15-minute window

WHEN rate limiting is triggered for an account, THE system SHALL:
1. Block all login attempts for that account for 30 minutes
2. Display a message indicating the account is temporarily locked
3. Clear the failed attempt counter after the lockout period expires
4. Allow login attempts to resume after the lockout period

WHEN a customer successfully logs in, THE system SHALL:
1. Reset the failed attempt counter for that account
2. Create a session token with appropriate expiration
3. Record the login timestamp and IP address for security auditing

IF a customer exceeds the rate limit threshold, THE system SHALL block login attempts and indicate the temporary lockout.
IF a customer successfully logs in after a lockout period, THE system SHALL reset the failed attempt counter and allow normal access.

## Seller Validation Rules

Seller accounts require valid email addresses with uniqueness enforced across all user types. Shop names are mandatory and must be unique across the platform to prevent confusion. Password requirements match customer account security standards. Approval status transitions from pending to approved or rejected based on administrator review. Rejected sellers can resubmit registration after addressing rejection reasons. Shop descriptions have length limits to maintain consistent presentation. Logo images must meet size and format requirements before upload. Seller account deletion is blocked when pending orders exist to preserve transaction integrity. Suspended sellers cannot create or edit products but can fulfill existing orders. Administrator approval is required before any seller can list products for purchase.

### Email and Password Validation

WHEN a seller registers with an email address, THE system SHALL verify that the email is unique across all user types (customers and sellers).

WHEN a seller attempts to register with an existing email, THE system SHALL reject the registration and display an error indicating the email is already in use.

WHEN a seller updates their email address, THE system SHALL verify the new email is not already registered by another customer or seller.

THE system SHALL enforce standard email format validation for all seller email addresses.

THE system SHALL hash all seller passwords using industry-standard cryptographic hashing before storage.

### Shop Name Uniqueness and Format

WHEN a seller creates or updates their shop name, THE system SHALL verify the shop name is unique across all active seller accounts.

WHEN a seller attempts to use an existing shop name, THE system SHALL reject the request and prompt for a different shop name.

THE system SHALL enforce a minimum shop name length of 3 characters.

THE system SHALL enforce a maximum shop name length of 50 characters.

THE system SHALL allow shop names to contain alphanumeric characters, spaces, and basic punctuation marks.

### Shop Description Length and Content

WHEN a seller submits a shop description, THE system SHALL enforce a maximum length of 1000 characters.

THE system SHALL allow empty shop descriptions (optional field).

WHEN a seller submits a shop description, THE system SHALL preserve line breaks and basic formatting.

THE system SHALL sanitize shop description content to prevent script injection.

### Logo Image Requirements

WHEN a seller uploads a shop logo image, THE system SHALL accept only JPEG, PNG, and WebP formats.

WHEN a seller uploads a shop logo image, THE system SHALL enforce a maximum file size of 5MB.

WHEN a seller uploads a shop logo image, THE system SHALL enforce a minimum resolution of 200x200 pixels.

WHEN a seller uploads a shop logo image, THE system SHALL enforce a maximum resolution of 2000x2000 pixels.

WHEN a seller uploads a shop logo image, THE system SHALL automatically generate a thumbnail version at 100x100 pixels.

THE system SHALL validate image content to ensure it does not contain prohibited material.

### Approval Status Transitions

WHEN a seller account is created, THE system SHALL set the approval status to "pending".

WHEN an administrator approves a seller registration, THE system SHALL update the approval status from "pending" to "approved".

WHEN an administrator rejects a seller registration, THE system SHALL update the approval status from "pending" to "rejected" and record the rejection reason.

WHEN a seller account status is "approved", THE system SHALL allow the seller to create and manage products.

WHEN a seller account status is "rejected", THE system SHALL prevent the seller from creating products until reapproval.

WHEN a rejected seller submits a new registration request, THE system SHALL reset the approval status to "pending".

### Rejection Reason Documentation

WHEN an administrator rejects a seller registration, THE system SHALL require a rejection reason to be documented.

THE system SHALL enforce a minimum rejection reason length of 10 characters.

THE system SHALL enforce a maximum rejection reason length of 500 characters.

WHEN a seller views their account status, THE system SHALL display the rejection reason if the status is "rejected".

THE system SHALL preserve rejection reasons in the seller account history for audit purposes.

### Account Deletion Blocking Conditions

WHEN a seller attempts to delete their account, THE system SHALL verify there are no pending orders with paid or shipped status for their products.

WHEN a seller attempts to delete their account, THE system SHALL verify there are no pending cancellation requests for their products.

WHEN a seller attempts to delete their account, THE system SHALL verify there are no pending refund requests for their products.

IF any blocking condition exists, THE system SHALL reject the account deletion and display which conditions prevent deletion.

WHEN all blocking conditions are resolved, THE system SHALL allow the seller to proceed with account deletion.

### Suspension Restrictions

WHEN a seller account is suspended by an administrator, THE system SHALL hide all their products from search results.

WHEN a seller account is suspended by an administrator, THE system SHALL hide all their products from category listings.

WHEN a seller account is suspended by an administrator, THE system SHALL prevent customers from adding their products to cart.

WHEN a seller account is suspended by an administrator, THE system SHALL prevent the seller from creating new products.

WHEN a seller account is suspended by an administrator, THE system SHALL prevent the seller from editing existing products.

WHEN a seller account is suspended by an administrator, THE system SHALL allow the seller to continue processing existing orders (shipping, responding to cancellation and refund requests).

WHEN a seller account is unsuspended by an administrator, THE system SHALL restore product visibility in search and category listings.

### Administrator Approval Requirement

WHEN a seller attempts to create a product, THE system SHALL verify the seller's approval status is "approved".

WHEN a seller's approval status is "pending", THE system SHALL prevent product creation and display a message indicating pending administrator approval.

WHEN a seller's approval status is "rejected", THE system SHALL prevent product creation and display the rejection reason.

THE system SHALL enforce administrator approval before any seller can list products for purchase on the platform.

## Product Validation Rules

Product names are required fields with minimum and maximum character limits for display consistency. Descriptions must be provided and support rich text formatting within size constraints. Category selection is mandatory and must reference valid existing categories. Base prices require positive decimal values with currency precision. Product images must meet resolution and file size requirements before acceptance. Sellers can only edit their own products and each edit creates an immutable snapshot. Product deletion is blocked when order items exist in paid or shipped status. Deleted products are removed from all search and category listings immediately. Product name changes create snapshots preserving the original name for order history. Base price updates affect only new purchases and do not modify existing order items.

### Product Field Validation Rules

WHEN a seller creates a product, THE system SHALL require a product name.
WHEN a seller creates a product, THE system SHALL require a product description.
WHEN a seller creates a product, THE system SHALL require a category selection.
WHEN a seller creates a product, THE system SHALL require a base price.

### Product Name Validation

THE system SHALL enforce a minimum product name length of 3 characters.
THE system SHALL enforce a maximum product name length of 200 characters.
THE system SHALL trim leading and trailing whitespace from product names before validation.

### Product Description Validation

THE system SHALL enforce a minimum product description length of 10 characters.
THE system SHALL enforce a maximum product description length of 5000 characters.
THE system SHALL accept rich text formatting in product descriptions.
THE system SHALL strip any HTML script tags from product descriptions for security.

### Category Reference Validation

WHEN a seller selects a category, THE system SHALL validate that the category exists.
WHEN a seller selects a subcategory, THE system SHALL validate that the parent category exists.
WHEN a seller selects a category, THE system SHALL prevent selection of deleted categories.

### Base Price Format Validation

THE system SHALL require base price to be a positive decimal value greater than zero.
THE system SHALL enforce exactly 2 decimal places for base price values.
THE system SHALL reject base prices that exceed 999999.99.
THE system SHALL display base prices with the appropriate currency symbol based on platform settings.

### Product Image Validation Rules

### Product Image Requirements

WHEN a seller uploads product images, THE system SHALL require images to be in JPEG, PNG, or WebP format.
WHEN a seller uploads product images, THE system SHALL enforce a maximum file size of 10MB per image.
WHEN a seller uploads product images, THE system SHALL require minimum image resolution of 800x800 pixels.
WHEN a seller uploads product images, THE system SHALL accept maximum image resolution of 4000x4000 pixels.
WHEN a seller uploads product images, THE system SHALL require at least one image for product creation.
THE system SHALL allow a maximum of 10 images per product.
THE system SHALL designate the first uploaded image as the main thumbnail image.
WHEN a seller reorders images, THE system SHALL update the thumbnail designation accordingly.

### Image Processing Rules

WHEN an image is uploaded, THE system SHALL create a thumbnail version at 200x200 pixels.
WHEN an image is uploaded, THE system SHALL validate that the image does not contain malicious content.
WHEN an image is uploaded, THE system SHALL store the original upload timestamp.
THE system SHALL preserve all uploaded images even when the product is deleted.

### Product Ownership and Access Rules

### Seller Ownership Validation

WHEN a seller creates a product, THE system SHALL associate the product with the seller's account.
WHEN a seller edits a product, THE system SHALL verify that the seller owns the product.
WHEN a seller deletes a product, THE system SHALL verify that the seller owns the product.
WHEN a seller views product snapshots, THE system SHALL only show snapshots for products they own.

### Seller Status Validation

WHEN a seller creates a product, THE system SHALL verify that the seller has approved status.
WHEN a seller edits a product, THE system SHALL verify that the seller has approved status.
WHEN a seller is suspended, THE system SHALL prevent them from creating new products.
WHEN a seller is suspended, THE system SHALL prevent them from editing existing products.
WHEN a seller is banned, THE system SHALL prevent them from accessing product management.

### Administrator Override

WHEN an administrator views a product, THE system SHALL allow access to all products on the platform.
WHEN an administrator views product snapshots, THE system SHALL allow access to snapshots of any product.
WHEN an administrator deletes a product, THE system SHALL allow deletion regardless of order status.

### Product Deletion Validation Rules

### Product Deletion Blocking Conditions

WHEN a seller requests product deletion, THE system SHALL check for pending order items.
THE system SHALL block product deletion if any variant has order items with paid status.
THE system SHALL block product deletion if any variant has order items with shipped status.
THE system SHALL block product deletion if any variant has pending cancellation requests.
THE system SHALL block product deletion if any variant has pending refund requests.

### Variant-Level Deletion Validation

WHEN a seller requests variant deletion, THE system SHALL check for pending order items on that variant.
THE system SHALL block variant deletion if the variant has order items with paid status.
THE system SHALL block variant deletion if the variant has order items with shipped status.
THE system SHALL block variant deletion if the variant has pending cancellation requests.
THE system SHALL block variant deletion if the variant has pending refund requests.

### Deletion Consequences

WHEN a product is deleted, THE system SHALL delete all associated variants.
WHEN a product is deleted, THE system SHALL delete all inventory records for its variants.
WHEN a product is deleted, THE system SHALL preserve all snapshots of the product and variants.
WHEN a product is deleted, THE system SHALL preserve order items that reference the product.

### Product Visibility and Listing Rules

### Search and Listing Removal

WHEN a product is deleted, THE system SHALL immediately remove it from search results.
WHEN a product is deleted, THE system SHALL immediately remove it from category listings.
WHEN a product is deleted, THE system SHALL mark it as unavailable in customer wishlists.
WHEN a product is deleted, THE system SHALL automatically remove it from all customer wishlists.
WHEN a product is deleted, THE system SHALL mark it as unavailable in all shopping carts.

### Seller Suspension Effects

WHEN a seller is suspended, THE system SHALL hide their products from search results.
WHEN a seller is suspended, THE system SHALL hide their products from category listings.
WHEN a seller is suspended, THE system SHALL prevent customers from adding their products to cart.
WHEN a seller is unsuspended, THE system SHALL restore their products to search and category listings.

### Product Status Visibility

WHEN a product has status deleted, THE system SHALL not display it to customers.
WHEN a product has status suspended, THE system SHALL not display it to customers.
WHEN a product has status active, THE system SHALL display it in search and category listings.

### Product Snapshot Rules

### Product Edit Snapshots

WHEN a product is created, THE system SHALL create an initial snapshot.
WHEN a product is edited, THE system SHALL create a new snapshot before applying changes.
WHEN a product name is changed, THE system SHALL record the previous name in the snapshot.
WHEN a product description is changed, THE system SHALL record the previous description in the snapshot.
WHEN a product category is changed, THE system SHALL record the previous category in the snapshot.
WHEN a product base price is changed, THE system SHALL record the previous price in the snapshot.
WHEN product images are modified, THE system SHALL record the previous image set in the snapshot.

### Snapshot Content Requirements

THE system SHALL record the timestamp of each product snapshot.
THE system SHALL record which seller made each change in the snapshot.
THE system SHALL preserve all product fields in each snapshot.
THE system SHALL preserve all variant snapshots when a product is edited.

### Snapshot Immutability

THE system SHALL prevent modification of any product snapshot after creation.
THE system SHALL prevent deletion of any product snapshot.
THE system SHALL preserve product snapshots even after the product is deleted.
THE system SHALL preserve product snapshots even after the seller account is deleted.

### Product Price Update Rules

### Base Price Update Scope

WHEN a product base price is updated, THE system SHALL apply the new price only to new purchases.
WHEN a product base price is updated, THE system SHALL NOT modify existing order items.
WHEN a product base price is updated, THE system SHALL NOT modify existing cart items.

### Variant Price Override Rules

WHEN a variant has a custom price, THE system SHALL use the variant price instead of base price.
WHEN a variant price is updated, THE system SHALL apply the new price only to new purchases.
WHEN a variant price is updated, THE system SHALL NOT modify existing order items.

### Price Display Rules

WHEN a product has multiple variants with different prices, THE system SHALL display a price range.
WHEN a product has only one variant, THE system SHALL display the variant price or base price.
WHEN a product has no variants, THE system SHALL display the base price.

### Price Change History

WHEN a product price is changed, THE system SHALL create a snapshot recording the change.
WHEN a variant price is changed, THE system SHALL create a snapshot recording the change.
THE system SHALL preserve all price change snapshots for dispute resolution.

## ProductVariant Validation Rules

SKU codes are required unique identifiers within each seller's product catalog. Option values must be provided as structured data representing variant characteristics. Variant prices can override the base price but must be positive decimal values. Stock quantities require non-negative integer values starting at zero. Variant deletion is blocked when order items exist in paid or shipped status. Each variant edit creates a snapshot preserving the previous state for dispute resolution. Stock quantity updates must reference valid inventory history records. Out of stock variants cannot be added to shopping carts by customers. Variant price changes do not affect existing order items already purchased. Multiple variants per product must have distinct SKU codes to prevent conflicts.

### SKU Code Uniqueness Rules

### SKU Code Uniqueness

THE system SHALL require every product variant to have a SKU code.

THE system SHALL enforce SKU code uniqueness within each seller's product catalog.

THE system SHALL reject variant creation when the SKU code already exists for another variant under the same seller.

THE system SHALL reject variant SKU code changes when the new SKU code conflicts with an existing variant under the same seller.

THE system SHALL allow the same SKU code to be used across different sellers without conflict.

THE system SHALL allow the same SKU code to be reused after a variant is permanently deleted and all related order items are in terminal states.

### Distinct SKU Requirement

WHEN a product has multiple variants, THE system SHALL ensure each variant has a distinct SKU code.

IF a seller attempts to create a variant with a duplicate SKU code within the same product, THE system SHALL reject the request.

IF a seller attempts to modify a variant's SKU code to match another variant in the same product, THE system SHALL reject the request.

THE system SHALL display a clear error message indicating which existing variant conflicts with the attempted SKU code.

### Option Values Structure Rules

### Option Values Structure

WHEN a seller creates a product variant, THE system SHALL require option values to be provided.

THE system SHALL store option values as structured data representing variant characteristics (e.g., color, size, material).

THE system SHALL allow option values to contain multiple key-value pairs for complex variant combinations.

THE system SHALL validate that option values are not empty when a variant is created or updated.

WHEN displaying variants to customers, THE system SHALL present option values in a human-readable format.

IF option values are malformed or missing required keys, THE system SHALL reject the variant creation or update request.

THE system SHALL preserve option values in snapshots when variants are edited for dispute resolution purposes.

### Variant Price Rules

### Variant Price Override Rules

WHEN a variant is created, THE system SHALL allow the variant price to be optional.

IF a variant price is provided, THE system SHALL use it instead of the product's base price for that variant.

IF a variant price is not provided, THE system SHALL use the product's base price as the variant price.

THE system SHALL require variant prices to be positive decimal values when specified.

THE system SHALL reject variant creation or updates when the variant price is zero or negative.

THE system SHALL display the variant price (or base price if no override) on product detail pages and shopping cart.

### Price Change Scope

WHEN a variant price is changed, THE system SHALL apply the new price only to future purchases.

THE system SHALL preserve the original unit price in existing order items even after variant price changes.

THE system SHALL create a snapshot when variant prices are modified to record the before and after values.

IF a customer adds a variant to their cart before a price change, THE system SHALL update the cart item price to reflect the current variant price.

THE system SHALL NOT retroactively adjust prices of orders that have already been placed.

### Stock Quantity and Inventory Rules

### Stock Quantity Format

THE system SHALL require stock quantity to be a non-negative integer value.

THE system SHALL initialize new variant stock quantities to zero.

THE system SHALL reject variant creation or updates when stock quantity is negative.

THE system SHALL reject stock quantity updates with non-integer values.

THE system SHALL calculate current stock by summing all inventory history records for the variant.

THE system SHALL display stock quantity to sellers in the seller dashboard.

THE system SHALL display stock status (in stock, out of stock) to customers based on current stock quantity.

### Inventory History Reference

WHEN stock quantity changes, THE system SHALL create an inventory history record.

THE system SHALL record the quantity change value (positive for restocking, negative for orders or adjustments).

THE system SHALL require a reason field for each inventory history record.

THE system SHALL record the timestamp for each inventory change.

THE system SHALL allow sellers to view the complete inventory history for each variant.

THE system SHALL NOT allow direct modification of stock quantity without creating corresponding inventory records.

### Out of Stock Cart Blocking

WHEN a variant's stock quantity reaches zero, THE system SHALL mark the variant as out of stock.

IF a variant is out of stock, THE system SHALL prevent customers from adding it to their shopping cart.

IF a variant becomes out of stock while in a customer's cart, THE system SHALL mark the cart item as unavailable.

THE system SHALL display a warning to customers when their cart quantity exceeds available stock.

THE system SHALL block checkout when any cart item is marked as unavailable.

### Variant Lifecycle Rules

### Variant Deletion Blocking Conditions

THE system SHALL allow sellers to delete variants only when no blocking conditions exist.

IF any order item for the variant has status "paid" or "shipped", THE system SHALL block variant deletion.

IF any cancellation request exists for the variant with status "pending", THE system SHALL block variant deletion.

IF any refund request exists for the variant with status "pending", THE system SHALL block variant deletion.

THE system SHALL display a clear message to sellers explaining why variant deletion is blocked.

THE system SHALL allow variant deletion when all related order items are in terminal states (delivered, cancelled, or refunded).

### Variant Edit Snapshots

WHEN a variant is edited, THE system SHALL create a snapshot of the previous state.

THE system SHALL capture all variant fields in the snapshot (SKU code, option values, price, stock quantity).

THE system SHALL record the timestamp when the variant was edited.

THE system SHALL record which seller made the variant edit.

THE system SHALL preserve snapshots even after the variant is deleted.

THE system SHALL allow sellers to view snapshots of their own product variants.

THE system SHALL allow administrators to view snapshots of any product variant.

THE system SHALL make snapshots immutable and prevent deletion.

## Category Validation Rules

Category names are required and must be unique within their parent category level. Descriptions are optional but when provided must not exceed maximum length limits. Parent categories must exist before subcategories can reference them. Only one level of nesting is allowed so subcategories cannot have their own children. Category deletion is permitted but products in deleted categories become uncategorized. Administrators exclusively create and manage all categories on the platform. Category name changes update all product listings referencing that category. Subcategory reassignment requires valid target category selection. Category browsing by customers shows only active non-deleted categories. Category sorting displays parent categories before their subcategories.

### Category Name Uniqueness

### Category Name Uniqueness

THE system SHALL require a category name for every category creation.

WHEN a category is created, THE system SHALL ensure the name is unique within its parent category level.

WHEN creating a top-level category (no parent), THE system SHALL ensure the name is unique among all top-level categories.

WHEN creating a subcategory, THE system SHALL ensure the name is unique among all siblings sharing the same parent category.

IF a category name already exists at the same level, THE system SHALL reject the creation request.

IF the category name contains only whitespace, THE system SHALL reject the creation request.

WHEN a category name is updated, THE system SHALL validate uniqueness against the same level as the current parent.

IF the updated name conflicts with another category at the same level, THE system SHALL reject the update request.

Category names are case-sensitive for uniqueness validation.

THE system SHALL allow category names with special characters and spaces.

THE system SHALL enforce a minimum category name length of 1 character.

THE system SHALL enforce a maximum category name length of 100 characters.

### Category Description Validation

### Category Description Validation

THE system SHALL allow category descriptions to be optional during creation.

WHEN a category description is provided, THE system SHALL validate it does not exceed 500 characters.

WHEN a category description is updated, THE system SHALL validate the new description does not exceed 500 characters.

IF the description exceeds 500 characters, THE system SHALL reject the request.

THE system SHALL allow empty descriptions (zero length).

THE system SHALL allow descriptions with special characters and formatting.

WHEN displaying category descriptions, THE system SHALL preserve the original formatting.

THE system SHALL validate description length before saving any category changes.

### Parent Category Existence

### Parent Category Existence

WHEN creating a subcategory, THE system SHALL require a valid parent category ID.

IF the referenced parent category does not exist, THE system SHALL reject the subcategory creation request.

IF the referenced parent category is deleted, THE system SHALL reject the subcategory creation request.

WHEN updating a subcategory's parent, THE system SHALL validate the new parent exists and is not deleted.

IF the new parent category does not exist, THE system SHALL reject the parent change request.

THE system SHALL prevent assigning a category as its own parent.

THE system SHALL prevent creating circular parent-child relationships.

WHEN a parent category is deleted, THE system SHALL allow subcategories to remain with their parent reference intact (products become uncategorized).

### Single Level Nesting Structure

### Single Level Nesting Structure

THE system SHALL enforce a maximum of one level of category nesting.

WHEN creating a subcategory, THE system SHALL prevent assigning a parent that is already a subcategory.

IF the selected parent category has its own parent, THE system SHALL reject the creation request.

WHEN updating a category's parent, THE system SHALL validate the new parent is a top-level category.

IF the new parent is a subcategory, THE system SHALL reject the update request.

THE system SHALL display categories in a two-level hierarchy only (parent and subcategory).

THE system SHALL prevent subcategories from having their own children.

Category depth shall never exceed 2 levels (parent category → subcategory).

### Category Deletion Cascade Handling

### Category Deletion Cascade Handling

WHEN an administrator deletes a category, THE system SHALL preserve all products in that category.

WHEN a category is deleted, THE system SHALL set products in that category to uncategorized status.

THE system SHALL NOT delete products when their category is deleted.

THE system SHALL NOT delete subcategories when their parent category is deleted.

WHEN a category is deleted, THE system SHALL preserve the category record for historical reference.

Deleted categories shall remain visible in product snapshots for order history integrity.

THE system SHALL prevent deletion of categories that are referenced in active product listings without first reassigning products.

WHEN a category is deleted, THE system SHALL remove it from customer browsing views.

THE system SHALL preserve category deletion records in the audit log.

### Administrator-Only Category Management

### Administrator-Only Category Management

THE system SHALL restrict category creation to administrators only.

THE system SHALL restrict category updates to administrators only.

THE system SHALL restrict category deletion to administrators only.

WHEN a non-administrator attempts to create a category, THE system SHALL reject the request with an authorization error.

WHEN a non-administrator attempts to update a category, THE system SHALL reject the request with an authorization error.

WHEN a non-administrator attempts to delete a category, THE system SHALL reject the request with an authorization error.

Customers SHALL be able to view all categories but SHALL NOT modify them.

Sellers SHALL be able to view all categories but SHALL NOT modify them.

THE system SHALL validate administrator permissions before executing any category management operation.

### Category Name Change Propagation

### Category Name Change Propagation

WHEN a category name is updated, THE system SHALL immediately reflect the change in all product listings.

WHEN a category name is updated, THE system SHALL update the category reference in all associated products.

WHEN a category name is updated, THE system SHALL create a snapshot of the category before the change.

THE system SHALL preserve the old category name in product snapshots for order history.

WHEN a customer views past orders, THE system SHALL display the category name as it appeared at the time of purchase.

Category name changes SHALL NOT affect product categorization or search functionality.

THE system SHALL log all category name changes with timestamp and administrator identity.

### Subcategory Reassignment Rules

### Subcategory Reassignment Rules

WHEN reassigning a subcategory to a different parent, THE system SHALL validate the new parent is a top-level category.

IF the new parent category does not exist, THE system SHALL reject the reassignment request.

IF the new parent category is deleted, THE system SHALL reject the reassignment request.

WHEN reassigning a subcategory, THE system SHALL preserve all products under that subcategory.

THE system SHALL allow reassignment of subcategories between different top-level parents.

THE system SHALL prevent reassigning a subcategory to become a top-level category.

THE system SHALL prevent reassigning a category to become a subcategory of itself.

WHEN a subcategory is reassigned, THE system SHALL create a snapshot of the category before the change.

### Active Category Filtering

### Active Category Filtering

WHEN customers browse categories, THE system SHALL display only active (non-deleted) categories.

WHEN customers view products by category, THE system SHALL filter to show only active categories.

THE system SHALL exclude deleted categories from all customer-facing category listings.

THE system SHALL exclude deleted categories from search results and navigation menus.

Administrators SHALL be able to view all categories including deleted ones.

THE system SHALL provide a filter option for administrators to show/hide deleted categories.

WHEN a category is deleted, THE system SHALL immediately remove it from customer browsing views.

THE system SHALL preserve deleted categories in administrator views for audit purposes.

### Hierarchical Display Ordering

### Hierarchical Display Ordering

WHEN displaying categories, THE system SHALL show parent categories before their subcategories.

WHEN displaying categories, THE system SHALL group subcategories under their respective parent categories.

THE system SHALL sort parent categories alphabetically by name.

THE system SHALL sort subcategories alphabetically by name within each parent group.

WHEN displaying a category list, THE system SHALL visually indent subcategories to indicate hierarchy.

THE system SHALL maintain consistent ordering across all category views (search, navigation, product listings).

Administrators SHALL be able to override default alphabetical ordering when creating categories.

THE system SHALL preserve the display order in category management interfaces.

## Order Validation Rules

Order numbers are auto-generated unique identifiers following a defined format pattern. Order dates record the timestamp when payment was successfully processed. Total prices are calculated from order items and must match payment gateway confirmation. Shipping addresses are mandatory and cannot be modified after order placement. Customer accounts must be active and verified before order creation. Payment gateway responses determine order creation success or failure. Failed payments do not create order records and allow customer retry. Order status transitions follow defined workflows based on item statuses. Multiple order items from different sellers are grouped into a single order. Order creation triggers inventory deduction for all purchased variants.

### Order Number Generation

WHEN an order is successfully created, THE system SHALL generate a unique order number following the format "ORD-YYYYMMDD-NNNNN" where:
- ORD is a fixed prefix
- YYYYMMDD is the order date in year-month-day format
- NNNNN is a sequential 5-digit number starting from 00001 for each day

THE system SHALL ensure order numbers are globally unique across all orders.

THE system SHALL increment the sequential number for each new order created on the same day.

IF the sequential number reaches 99999, THE system SHALL continue with 00000 for the next order on that day.

### Order Date Recording

WHEN payment is successfully processed, THE system SHALL record the order date timestamp at the moment of payment confirmation.

THE system SHALL store the order date in UTC timezone format.

THE system SHALL use the payment gateway confirmation timestamp as the authoritative order creation time.

IF payment fails, THE system SHALL NOT create an order record and SHALL NOT record an order date.

WHEN viewing order history, THE system SHALL display the order date in the customer's local timezone.

### Total Price Calculation

WHEN calculating order total price, THE system SHALL sum the unit price multiplied by quantity for all order items.

THE system SHALL include shipping costs if applicable in the total price calculation.

THE system SHALL exclude taxes from the total price unless explicitly configured.

THE system SHALL round the total price to 2 decimal places using standard rounding rules.

IF the calculated total does not match the payment gateway amount, THE system SHALL reject the order creation.

THE system SHALL store the total price as an immutable value that cannot be modified after order creation.

### Shipping Address Immutability

WHEN an order is placed, THE system SHALL capture and lock the shipping address at that moment.

THE system SHALL NOT allow customers to modify the shipping address after order placement.

THE system SHALL NOT allow sellers to modify the shipping address after order placement.

IF a customer needs to change the shipping address, THE system SHALL require them to cancel the order and place a new one.

THE system SHALL preserve the original shipping address in the order record even if the customer updates their address book later.

### Account Verification Requirements

WHEN a customer attempts to place an order, THE system SHALL verify the customer account status is active.

THE system SHALL reject order creation if the customer account is suspended or banned.

THE system SHALL verify the customer has completed email verification before allowing order placement.

IF the customer account verification is incomplete, THE system SHALL block order creation and prompt the customer to complete verification.

THE system SHALL verify the customer is logged in before allowing order creation.

### Payment Gateway Validation

WHEN a customer confirms an order, THE system SHALL validate the payment gateway response before creating the order record.

THE system SHALL only create an order record after receiving a successful payment confirmation from the gateway.

IF the payment gateway returns a failure response, THE system SHALL NOT create an order record.

IF the payment gateway times out, THE system SHALL retry the payment validation up to 3 times with 5-second intervals.

THE system SHALL log all payment gateway responses for audit purposes.

THE system SHALL display a clear error message to the customer if payment validation fails.

### Failed Payment Handling

WHEN payment fails during order placement, THE system SHALL NOT create an order record.

THE system SHALL allow the customer to retry payment without requiring them to re-enter cart items.

THE system SHALL preserve the cart contents while the customer retries payment.

IF payment fails multiple times, THE system SHALL suggest the customer contact their bank or use a different payment method.

THE system SHALL clear the cart items only after successful payment confirmation.

THE system SHALL display the specific payment failure reason to the customer when available from the payment gateway.

### Order Status Transition Workflow

WHEN an order item status changes, THE system SHALL follow the defined status transition workflow.

Order item status transitions SHALL follow this sequence: paid → shipped → delivered

Order item status transitions SHALL allow: paid → cancelled, paid → refunded (via request workflow)

Order item status SHALL NOT transition from delivered back to shipped or paid.

Order item status SHALL NOT transition from cancelled or refunded to any other status.

WHEN all items in an order are cancelled, THE system SHALL update the order status to "cancelled".

WHEN all items in an order are refunded, THE system SHALL update the order status to "refunded".

WHEN items have mixed statuses (e.g., some delivered, some refunded), THE system SHALL update the order status to "partiallyCompleted".

THE system SHALL prevent any status transition that violates the defined workflow.

### Multi-Seller Order Grouping

WHEN a customer places an order with items from multiple sellers, THE system SHALL group all items into a single order record.

THE system SHALL assign each order item to its respective seller while maintaining the single order structure.

THE system SHALL calculate the total order price across all sellers.

THE system SHALL allow each seller to independently ship their items through separate shipments.

THE system SHALL track each order item's status independently based on its seller's actions.

THE system SHALL display the seller information for each order item in the order details.

WHEN viewing order history, THE system SHALL show the order as a single entity with items grouped by seller.

### Inventory Deduction Trigger

WHEN an order is successfully created with payment confirmation, THE system SHALL automatically deduct inventory for all purchased variants.

THE system SHALL create inventory records with negative quantity changes for each purchased variant.

THE system SHALL record the reason as "order_placed" in the inventory history.

THE system SHALL update the current stock quantity immediately after deduction.

IF inventory deduction would result in negative stock, THE system SHALL reject the order creation.

WHEN an order item is cancelled, THE system SHALL restore the inventory by creating a positive quantity change record.

WHEN an order item is refunded, THE system SHALL restore the inventory by creating a positive quantity change record.

THE system SHALL ensure inventory deduction is atomic with order creation to prevent race conditions.

## OrderItem Validation Rules

Order item quantities must be positive integers representing purchased units. Unit prices capture the variant price at purchase time and cannot be modified. Status transitions follow strict workflows from paid to shipped to delivered. Cancelled and refunded statuses are terminal states for order items. Each order item references a valid product variant that existed at purchase time. Snapshots preserve product and seller profile data at the moment of purchase. Item status changes trigger corresponding shipment or refund workflows. Partial cancellations allow some items to be cancelled while others continue. Refund requests are only valid for delivered items within the seven-day window. Order item totals are calculated from quantity multiplied by unit price.

### Quantity Validation Rules

WHEN a customer adds items to an order, THE system SHALL:
1. Require quantity to be a positive integer (minimum value of 1)
2. Validate that quantity does not exceed available stock for the variant
3. Reject the order if any item has zero or negative quantity
4. Combine quantities when the same variant is added multiple times
5. Calculate item total as quantity multiplied by unit price

IF the quantity is zero or negative, THE system SHALL reject the order item.
IF the quantity exceeds available stock, THE system SHALL warn the customer and prevent checkout.
IF the same variant appears multiple times in the cart, THE system SHALL combine quantities into a single line item.

WHEN an order is created, THE system SHALL:
1. Lock the quantity value at the time of purchase
2. Prevent any future modifications to the quantity after order creation
3. Record the quantity in the order item for historical accuracy

### Unit Price Immutability Rules

WHEN an order item is created, THE system SHALL:
1. Capture the unit price from the variant at the moment of purchase
2. Store the unit price as a fixed value that cannot be modified
3. Preserve the unit price even if the variant price changes later

IF the variant price is updated after purchase, THE system SHALL NOT affect existing order items.
IF an administrator attempts to modify the unit price, THE system SHALL reject the modification.

WHEN calculating order totals, THE system SHALL:
1. Use the captured unit price for all calculations
2. Apply the unit price consistently across all order item operations
3. Display the unit price in order history and receipts

THE system SHALL maintain unit price immutability for:
- Order fulfillment processes
- Refund calculations
- Financial reporting
- Dispute resolution

### Status Transition Workflow

WHEN an order item is created, THE system SHALL set the initial status to "paid".
WHILE the order item status is "paid", THE system SHALL allow cancellation requests.
WHEN a seller ships an order item, THE system SHALL transition the status to "shipped".
WHILE the order item status is "shipped", THE system SHALL prevent cancellation requests.
WHEN a customer confirms delivery, THE system SHALL transition the status to "delivered".
WHEN automatic delivery confirmation occurs after 14 days, THE system SHALL transition the status to "delivered".

IF a customer requests cancellation for a "paid" item, THE system SHALL allow the request.
IF a customer requests cancellation for a "shipped" item, THE system SHALL reject the request.
IF a customer requests refund for a "delivered" item, THE system SHALL allow the request within 7 days.
IF a customer requests refund for a non-delivered item, THE system SHALL reject the request.

THE system SHALL enforce the following status transitions:
- "paid" → "shipped" (seller action)
- "shipped" → "delivered" (customer confirmation or auto-confirmation)
- "paid" → "cancelled" (cancellation approval)
- "delivered" → "refunded" (refund approval)
- Any status → terminal states via administrator action

### Variant Reference Validation

WHEN an order item is created, THE system SHALL validate that the referenced variant exists.
WHEN an order item is created, THE system SHALL validate that the variant belongs to an active product.
WHEN an order item is created, THE system SHALL validate that the product belongs to an approved seller.

IF the referenced variant is deleted before order creation, THE system SHALL reject the order item.
IF the referenced product is deleted before order creation, THE system SHALL reject the order item.
IF the seller account is banned before order creation, THE system SHALL reject the order item.

WHILE the order item exists, THE system SHALL preserve the variant reference even if the variant is later deleted.
WHILE the order item exists, THE system SHALL preserve the product reference even if the product is later deleted.

THE system SHALL prevent order items from referencing:
- Variants that do not exist
- Deleted products
- Products from suspended sellers
- Products from banned sellers

### Purchase Snapshot Creation

WHEN an order item is created, THE system SHALL create a product snapshot containing:
1. Product name at time of purchase
2. Product description at time of purchase
3. Category information at time of purchase
4. Base price at time of purchase
5. All product images at time of purchase

WHEN an order item is created, THE system SHALL create a product variant snapshot containing:
1. SKU code at time of purchase
2. Option values at time of purchase
3. Variant price at time of purchase
4. Stock quantity at time of purchase

WHEN an order item is created, THE system SHALL create a seller profile snapshot containing:
1. Shop name at time of purchase
2. Shop description at time of purchase
3. Shop logo at time of purchase

THE system SHALL ensure all snapshots are immutable and cannot be deleted.
THE system SHALL preserve all snapshots even if the product, variant, or seller account is deleted.
THE system SHALL make snapshots available to relevant parties for dispute resolution.

### Status Change Triggers

WHEN an order item status changes to "shipped", THE system SHALL:
1. Update the parent order status if applicable
2. Create a shipment record with tracking information
3. Notify the customer of the shipment

WHEN an order item status changes to "delivered", THE system SHALL:
1. Update the parent order status if applicable
2. Enable review creation for the product
3. Start the 7-day refund eligibility window

WHEN an order item status changes to "cancelled", THE system SHALL:
1. Restore the variant stock quantity via inventory record
2. Process refund for the item amount
3. Update the parent order status if applicable

WHEN an order item status changes to "refunded", THE system SHALL:
1. Restore the variant stock quantity via inventory record
2. Process payment reversal for the item amount
3. Update the parent order status if applicable

IF an administrator forces a status change, THE system SHALL execute all associated triggers.
IF a status change affects multiple order items, THE system SHALL process each item independently.

### Partial Cancellation Support

WHEN a customer requests cancellation for an order item, THE system SHALL:
1. Validate that the item status is "paid"
2. Require a cancellation reason to be provided
3. Create a cancellation request record
4. Notify the seller of the pending request

WHILE a cancellation request is "pending", THE system SHALL:
1. Prevent the seller from shipping the item
2. Allow the seller to approve or reject the request
3. Track the request creation timestamp

IF the seller approves the cancellation request, THE system SHALL:
1. Change the order item status to "cancelled"
2. Restore the variant stock quantity
3. Process refund for the item amount

IF the seller rejects the cancellation request, THE system SHALL:
1. Change the cancellation request status to "rejected"
2. Allow the item to proceed to shipping
3. Record the rejection reason

THE system SHALL support partial cancellation where:
- Some items in an order can be cancelled while others continue processing
- The parent order status reflects mixed states as "partially completed"
- Each cancelled item restores its own stock independently

### Refund Time Window Rules

WHEN a customer requests a refund for an order item, THE system SHALL:
1. Validate that the item status is "delivered"
2. Calculate days elapsed since delivery confirmation
3. Validate that refund is requested within 7 days of delivery
4. Require a refund reason to be provided
5. Create a refund request record
6. Notify the seller of the pending request

IF the refund request exceeds 7 days from delivery, THE system SHALL reject the request.
IF the refund request is for a non-delivered item, THE system SHALL reject the request.

WHILE a refund request is "pending", THE system SHALL:
1. Allow the seller to approve or reject the request
2. Track the request creation timestamp
3. Record the days elapsed since delivery

IF the seller approves the refund request, THE system SHALL:
1. Change the order item status to "refunded"
2. Restore the variant stock quantity
3. Process payment reversal for the item amount

IF the seller rejects the refund request, THE system SHALL:
1. Change the refund request status to "rejected"
2. Record the rejection reason
3. Maintain the item as "delivered" status

THE system SHALL create snapshots for all refund request status changes.

### Item Total Calculation Rules

WHEN calculating an order item total, THE system SHALL:
1. Multiply the quantity by the unit price
2. Use the exact unit price captured at purchase time
3. Round the result to 2 decimal places

WHEN calculating order totals, THE system SHALL:
1. Sum all order item totals within the order
2. Include all items regardless of their status
3. Display the total in the order summary

IF the unit price has decimals, THE system SHALL preserve full precision during calculation.
IF the quantity is large, THE system SHALL ensure calculation accuracy without overflow.

THE system SHALL display item totals as:
- Unit price per item
- Quantity purchased
- Total amount (unit price × quantity)

THE system SHALL use item totals for:
- Order summary display
- Refund calculations
- Financial reporting
- Dispute resolution

## Address Validation Rules

Recipient names are required fields with reasonable length limits for shipping labels. Phone numbers must follow valid format patterns for the shipping destination country. Street addresses require complete information including building numbers and street names. City fields must match the postal code region for accurate delivery. State or province fields are required for countries that use regional divisions. Postal codes must match the format requirements of the destination country. Country fields must reference valid country codes from an approved list. Address validation prevents incomplete or malformed shipping information. Default addresses are marked for quick selection during checkout. Address deletion is permitted but cannot remove the last remaining address.

### Address Field Validation Rules

### Recipient Name Validation

THE system SHALL require a recipient name for every shipping address.

WHEN a customer creates or edits an address, THE system SHALL validate the recipient name field is not empty.

THE system SHALL enforce a maximum length of 100 characters for recipient names to accommodate international name formats.

### Phone Number Format Validation

WHEN a customer creates or edits an address, THE system SHALL require a phone number field.

THE system SHALL validate phone numbers follow a valid format pattern for the shipping destination country.

THE system SHALL enforce a maximum length of 20 characters for phone numbers to accommodate international formats with country codes.

THE system SHALL reject phone numbers containing invalid characters (only digits, spaces, hyphens, parentheses, and plus signs allowed).

### Street Address Completeness

THE system SHALL require a complete street address for every shipping address.

WHEN a customer creates or edits an address, THE system SHALL validate the street address field is not empty.

THE system SHALL enforce a minimum length of 5 characters for street addresses to prevent incomplete entries.

THE system SHALL enforce a maximum length of 200 characters for street addresses to accommodate complex addresses.

THE system SHALL require street addresses to include building numbers and street names for accurate delivery.

### Address Line Validation

THE system SHALL allow an optional second address line for apartment numbers, suite numbers, or additional address details.

WHEN provided, THE system SHALL enforce a maximum length of 100 characters for the second address line.

### Address Location Validation Rules

### City and Region Requirements

THE system SHALL require a city field for every shipping address.

WHEN a customer creates or edits an address, THE system SHALL validate the city field is not empty.

THE system SHALL enforce a maximum length of 100 characters for city names.

THE system SHALL require state or province fields for countries that use regional divisions.

WHEN the selected country requires regional divisions, THE system SHALL validate the state/province field is not empty.

THE system SHALL enforce a maximum length of 100 characters for state or province names.

### Postal Code Format Rules

THE system SHALL require a postal code field for every shipping address.

WHEN a customer creates or edits an address, THE system SHALL validate the postal code field is not empty.

THE system SHALL validate postal codes match the format requirements of the destination country.

THE system SHALL support both numeric and alphanumeric postal code formats depending on the country.

THE system SHALL enforce a maximum length of 20 characters for postal codes to accommodate international formats.

### City and Postal Code Matching

WHEN a customer provides a city and postal code, THE system SHALL validate they match the same geographic region.

THE system SHALL reject addresses where the city does not correspond to the provided postal code.

THE system SHALL provide error feedback when city and postal code mismatch is detected.

### Country Code Validation

THE system SHALL require a country field for every shipping address.

WHEN a customer creates or edits an address, THE system SHALL validate the country references a valid country code from an approved list.

THE system SHALL enforce ISO 3166-1 alpha-2 country codes for all address entries.

THE system SHALL reject addresses with invalid or unsupported country codes.

### Address Management Rules

### Address Completeness Verification

WHEN a customer submits an address for creation or editing, THE system SHALL verify all required fields are present and valid.

THE system SHALL prevent address submission when any required field fails validation.

THE system SHALL provide clear error messages indicating which fields failed validation and why.

THE system SHALL require the following fields for all addresses: recipient name, phone number, street address, city, postal code, and country.

### Default Address Management

THE system SHALL allow customers to mark one address as their default shipping address.

WHEN a customer sets a default address, THE system SHALL automatically remove the default designation from any previously marked default address.

THE system SHALL use the default address for checkout when the customer has not selected a specific address.

THE system SHALL display the default address with a visual indicator in the address list.

### Last Address Protection

WHEN a customer attempts to delete an address, THE system SHALL check if it is their only remaining address.

IF the address to be deleted is the customer's last address, THE system SHALL reject the deletion request.

THE system SHALL require customers to maintain at least one valid shipping address in their account.

THE system SHALL provide error feedback when deletion is blocked due to the last address protection rule.

### Address Deletion Conditions

WHEN a customer deletes an address that is not their last address, THE system SHALL allow the deletion.

IF the deleted address was marked as default, THE system SHALL automatically remove the default designation.

THE system SHALL preserve order history that references deleted addresses for record-keeping purposes.

THE system SHALL not prevent address deletion due to past order references (unlike seller account deletion rules).

## Review Validation Rules

Ratings must be integers between one and five stars inclusive. Text content is optional but when provided must not exceed maximum character limits. Reviews can only be written after the corresponding order item reaches delivered status. One review per product per order is enforced to prevent duplicate submissions. Review edits create snapshots preserving the original content for audit purposes. Deleted reviews are removed from display but snapshots remain in the system. Average ratings are calculated from non-deleted reviews only. Review sorting displays newest reviews first by default. Review text supports basic formatting within defined constraints. Rating changes update the product's average rating immediately.

### Review Content Validation

### Rating Range Validation

THE system SHALL require rating values to be integers between 1 and 5 inclusive.

WHEN a customer submits a review with a rating, THE system SHALL validate the rating is within the 1-5 range.

IF a rating value is less than 1, THE system SHALL reject the review submission.

IF a rating value is greater than 5, THE system SHALL reject the review submission.

IF a rating value is not an integer, THE system SHALL reject the review submission.

THE system SHALL display an error message when rating validation fails.

THE system SHALL not allow partial or decimal rating values (e.g., 3.5 stars).

### Review Eligibility Rules

### Delivery Status Requirement

WHEN a customer attempts to write a review, THE system SHALL verify the corresponding order item has reached "delivered" status.

IF the order item status is not "delivered", THE system SHALL prevent the customer from submitting a review.

IF the order item status is "paid", THE system SHALL inform the customer they must wait for delivery.

IF the order item status is "shipped", THE system SHALL inform the customer they must wait for delivery.

IF the order item status is "cancelled", THE system SHALL prevent the customer from submitting a review.

IF the order item status is "refunded", THE system SHALL prevent the customer from submitting a review.

THE system SHALL display the current order item status when review submission is blocked.

### Duplicate Review Prevention

### Duplicate Review Prevention

WHEN a customer attempts to submit a review, THE system SHALL verify no existing review exists for that product and order combination.

IF a review already exists for the same product and order, THE system SHALL prevent duplicate submission.

THE system SHALL display an error message indicating a review has already been submitted.

THE system SHALL allow customers to edit their existing review instead of creating a new one.

THE system SHALL enforce one review per product per order across all customers.

### Review Modification and Deletion

### Review Edit Snapshots

WHEN a customer edits a review, THE system SHALL create a snapshot of the review before the edit.

THE system SHALL record the timestamp when the review edit occurred.

THE system SHALL capture the previous rating and text content values in the snapshot.

THE system SHALL capture the new rating and text content values in the snapshot.

THE system SHALL record which customer made the edit.

THE system SHALL make review snapshots immutable and cannot be deleted.

THE system SHALL allow customers and administrators to view review snapshots for audit purposes.

THE system SHALL preserve all review snapshots even after the review is deleted.

### Deleted Review Handling

### Deleted Review Handling

WHEN a customer deletes their review, THE system SHALL remove the review from public display.

THE system SHALL mark the deleted review with an "isDeleted" flag.

THE system SHALL preserve the review snapshot for audit and dispute resolution.

THE system SHALL display "deleted user" or "deleted review" placeholder on the product detail page.

THE system SHALL exclude deleted reviews from average rating calculations.

THE system SHALL allow administrators to view deleted reviews and their snapshots.

THE system SHALL not allow undeletion of reviews once deleted.

### Rating Aggregation and Display

### Average Rating Calculation

THE system SHALL calculate the average rating for each product from all non-deleted reviews.

THE system SHALL exclude deleted reviews from average rating calculations.

THE system SHALL round the average rating to one decimal place for display.

THE system SHALL display zero or no rating when a product has no reviews.

THE system SHALL recalculate the average rating whenever a new review is submitted.

THE system SHALL recalculate the average rating whenever an existing review is edited.

THE system SHALL recalculate the average rating whenever a review is deleted.

### Rating Update Propagation

### Rating Update Propagation

WHEN a review is submitted, THE system SHALL immediately update the product's average rating.

WHEN a review is edited, THE system SHALL immediately update the product's average rating.

WHEN a review is deleted, THE system SHALL immediately update the product's average rating.

THE system SHALL display the updated average rating on the product detail page.

THE system SHALL display the updated average rating in product listing views.

THE system SHALL display the total review count alongside the average rating.

THE system SHALL update the review count when reviews are added, edited, or deleted.

### Review Sort Order

### Review Sort Order

WHEN displaying reviews on the product detail page, THE system SHALL sort reviews by newest first.

THE system SHALL use the review creation timestamp for sorting.

THE system SHALL display the most recent review at the top of the review list.

THE system SHALL maintain consistent sort order across all product detail page views.

THE system SHALL allow pagination of reviews when the review count exceeds the page limit.

THE system SHALL preserve the sort order when customers navigate between pages of reviews.

### Text Formatting Rules

### Text Formatting Rules

WHEN review text is provided, THE system SHALL accept basic text formatting.

THE system SHALL sanitize review text to prevent injection of malicious code.

THE system SHALL preserve line breaks and paragraph spacing in review text.

THE system SHALL not allow HTML tags or embedded scripts in review text.

THE system SHALL encode special characters to prevent display issues.

### Review Text Length Limits

### Review Text Length Limits

WHEN a customer provides review text content, THE system SHALL validate the text does not exceed the maximum character limit.

IF review text exceeds the maximum character limit, THE system SHALL reject the review submission.

THE system SHALL allow empty review text (text is optional).

THE system SHALL display an error message when text length validation fails.

## Wishlist Validation Rules

Wishlist entries reference valid product IDs that exist in the catalog. Products deleted by sellers are automatically removed from all customer wishlists. Wishlist items are paginated to support large collections efficiently. Each wishlist entry records the timestamp when the product was added. Customers can remove items from their wishlist at any time. Duplicate product entries are prevented within the same customer's wishlist. Wishlist visibility is private to the owning customer only. Wishlist items do not reserve inventory or affect product availability. Product price changes are reflected in wishlist display but do not trigger notifications. Wishlist entries persist across customer sessions and devices.

### Product Reference Validation

WHEN a customer adds a product to their wishlist, THE system SHALL validate that the product ID references an existing product in the catalog.

WHEN a product ID is invalid or does not exist, THE system SHALL reject the wishlist addition request.

WHEN a customer views their wishlist, THE system SHALL verify that all referenced products are accessible to the customer.

IF a product has been deleted by its seller, THE system SHALL automatically remove it from all customer wishlists without requiring customer action.

IF a product's status changes to suspended or hidden, THE system SHALL automatically remove it from all customer wishlists.

THE system SHALL maintain referential integrity between wishlist entries and products at all times.

### Deleted Product Auto-Removal

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customer wishlists within the same transaction.

WHEN a product is deleted, THE system SHALL preserve the deletion event for audit purposes but remove the visible wishlist entry.

IF a customer attempts to view a wishlist item that has been deleted, THE system SHALL not display the item in the wishlist listing.

THE system SHALL handle product deletion cascades to wishlists atomically to prevent orphaned references.

WHEN a product is restored after deletion, THE system SHALL NOT automatically re-add it to previous customer wishlists.

Deleted product removal from wishlists SHALL NOT trigger notifications to customers.

### Wishlist Pagination

WHEN a customer views their wishlist, THE system SHALL paginate the results to support efficient loading of large collections.

THE system SHALL support configurable page sizes for wishlist pagination.

WHEN paginating wishlist results, THE system SHALL maintain consistent ordering across page requests.

IF a customer requests a page number beyond available data, THE system SHALL return an empty result set or appropriate boundary indication.

THE system SHALL provide navigation metadata including total count, current page, and available pages in wishlist responses.

Pagination SHALL apply to both active and historical wishlist views.

### Entry Management Rules

WHEN a product is added to a customer's wishlist, THE system SHALL record the timestamp of when the addition occurred.

THE system SHALL maintain the entry timestamp immutably once recorded.

WHEN a customer removes an item from their wishlist, THE system SHALL verify that the customer owns the wishlist entry.

IF a customer attempts to remove an item from another customer's wishlist, THE system SHALL reject the removal request.

WHEN a customer adds a product that already exists in their wishlist, THE system SHALL prevent duplicate entries for the same product.

THE system SHALL check for existing product entries before allowing new additions to the wishlist.

Duplicate prevention SHALL be enforced at the customer-product level, allowing the same product in different customers' wishlists.

### Wishlist Privacy Rules

WHEN a customer views their wishlist, THE system SHALL restrict visibility to only that customer's own wishlist entries.

IF another customer attempts to view someone else's wishlist, THE system SHALL deny access and not reveal the existence of the wishlist.

THE system SHALL NOT expose wishlist contents through public product pages or search results.

WHEN a customer is logged out, THE system SHALL NOT display any wishlist information.

Wishlist privacy SHALL be enforced at the API level for all wishlist operations.

Administrators MAY view customer wishlists for support and dispute resolution purposes only.

### Inventory and Pricing Behavior

WHEN a product is added to a wishlist, THE system SHALL NOT reserve or decrement inventory for that product variant.

THE system SHALL treat wishlist items as non-binding expressions of interest only.

WHEN displaying wishlist items, THE system SHALL show current product prices, not prices at the time of wishlist addition.

IF a product's price changes after being added to a wishlist, THE system SHALL reflect the updated price in the wishlist display.

Price changes to wishlist items SHALL NOT trigger automatic notifications to customers.

THE system SHALL NOT block product purchases based on wishlist additions by other customers.

Inventory availability checks for wishlist display SHALL use real-time stock data.

### Session and Persistence Rules

WHEN a customer adds a product to their wishlist, THE system SHALL persist the entry across all customer sessions and devices.

THE system SHALL maintain wishlist entries independently of session lifecycle.

WHEN a customer logs in from a new device, THE system SHALL display their complete wishlist from previous sessions.

IF a customer's session expires, THE system SHALL preserve all wishlist data for subsequent login.

THE system SHALL sync wishlist changes across multiple concurrent sessions in real-time.

Wishlist persistence SHALL survive customer account inactivity periods.

THE system SHALL provide consistent wishlist state regardless of access method (web, mobile, API).

## CartItem Validation Rules

Cart items reference specific product variants rather than products alone. Quantities must be positive integers with upper limits to prevent abuse. When adding duplicate variants, quantities are combined rather than creating new entries. Stock availability is validated before allowing cart additions. Out of stock variants are marked unavailable but not automatically removed. Cart item prices reflect current variant prices at the time of viewing. Cart totals are calculated from all item subtotals including taxes. Cart items persist across customer sessions until checkout or removal. Variant deletion by sellers marks the cart item as unavailable. Cart validation during checkout ensures all items are purchasable.

### Variant Reference Requirements

WHEN a customer adds an item to their cart, THE system SHALL require selection of a specific product variant identified by its SKU code.

WHEN a customer views their cart, THE system SHALL display the product name, variant option values, price, quantity, and subtotal for each cart item.

THE system SHALL NOT allow cart items to reference products without a specific variant selection.

THE system SHALL validate that the referenced variant exists and is active before adding to cart.

IF the variant does not exist, THE system SHALL reject the cart addition request.

IF the variant has been deleted by the seller, THE system SHALL mark the cart item as unavailable rather than removing it.

IF the variant is suspended due to seller suspension, THE system SHALL mark the cart item as unavailable.

WHEN a variant becomes unavailable after being added to cart, THE system SHALL preserve the cart item but prevent checkout with that item.

### Quantity Validation Rules

WHEN a customer adds a variant to their cart, THE system SHALL require the quantity to be a positive integer greater than zero.

WHEN a customer adds a variant to their cart, THE system SHALL reject quantities of zero or negative values.

WHEN a customer adds a variant to their cart, THE system SHALL enforce a maximum quantity limit to prevent abuse.

WHEN a customer adds a variant that already exists in their cart, THE system SHALL combine the new quantity with the existing quantity.

WHEN quantities are combined, THE system SHALL NOT create a duplicate cart item entry.

WHEN the combined quantity exceeds the maximum limit, THE system SHALL reject the addition and display an error.

WHEN a customer modifies the quantity of an existing cart item, THE system SHALL validate the new quantity is a positive integer.

WHEN a customer modifies the quantity of an existing cart item, THE system SHALL validate the new quantity does not exceed the maximum limit.

WHEN a customer modifies the quantity of an existing cart item, THE system SHALL validate the new quantity does not exceed available stock.

IF the requested quantity exceeds available stock, THE system SHALL show a warning but allow the cart item to remain with the requested quantity marked as exceeding stock.

### Stock Availability Validation

WHEN a customer attempts to add a variant to their cart, THE system SHALL validate that the variant has available stock greater than zero.

WHEN a variant's stock quantity reaches zero, THE system SHALL mark the variant as out of stock.

WHEN a variant is out of stock, THE system SHALL prevent customers from adding it to their cart.

WHEN a customer views their cart, THE system SHALL display a warning for items where the cart quantity exceeds available stock.

WHEN a variant becomes out of stock after being added to cart, THE system SHALL mark the cart item as unavailable.

WHEN a variant becomes unavailable due to stock, THE system SHALL NOT automatically remove the item from the cart.

WHEN a customer views the product detail page, THE system SHALL display the current stock status for each variant.

IF a variant is out of stock, THE system SHALL show it as unavailable on the product detail page.

### Price and Total Calculation

WHEN a customer views their cart, THE system SHALL display the current price of each variant at the time of viewing.

WHEN variant prices change after being added to cart, THE system SHALL reflect the updated price in the cart display.

WHEN a cart item references a variant with an overridden price, THE system SHALL display the variant price rather than the base product price.

WHEN a cart item references a variant without an overridden price, THE system SHALL display the product base price.

WHEN a customer views their cart, THE system SHALL calculate the subtotal for each item as quantity multiplied by current unit price.

WHEN a customer views their cart, THE system SHALL calculate the cart total as the sum of all item subtotals.

WHEN calculating the cart total, THE system SHALL include applicable taxes if configured.

WHEN calculating the cart total, THE system SHALL display the total price before checkout confirmation.

IF a cart item becomes unavailable, THE system SHALL exclude it from the cart total calculation.

### Session Persistence and Deletion Handling

WHEN a customer adds items to their cart, THE system SHALL persist the cart items across customer sessions.

WHEN a customer logs out and logs back in, THE system SHALL restore their cart items from persistent storage.

WHEN a customer deletes a variant from their cart, THE system SHALL remove the cart item immediately.

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customer wishlists and mark related cart items as unavailable.

WHEN a seller deletes a variant, THE system SHALL mark the corresponding cart item as unavailable.

WHEN a seller suspends their account, THE system SHALL mark all cart items from their products as unavailable.

WHEN a cart item is marked as unavailable due to seller actions, THE system SHALL preserve it in the cart but prevent checkout.

WHEN a customer has unavailable items in their cart, THE system SHALL display a message explaining why the items cannot be purchased.

### Checkout Validation

WHEN a customer proceeds to checkout, THE system SHALL validate that all cart items are available for purchase.

WHEN a cart item is unavailable, THE system SHALL prevent checkout and display which items cannot be purchased.

WHEN a cart item exceeds available stock, THE system SHALL show a warning but allow checkout if the customer confirms.

WHEN a cart item references a deleted variant, THE system SHALL prevent checkout with that item.

WHEN a cart item references a suspended seller's product, THE system SHALL prevent checkout with that item.

WHEN checkout validation passes, THE system SHALL proceed to shipping address selection.

WHEN checkout validation passes, THE system SHALL capture the current prices of all variants for the order.

WHEN an order is successfully created, THE system SHALL remove all purchased items from the customer's cart.

IF payment fails during checkout, THE system SHALL preserve the cart items for future checkout attempts.

## Shipment Validation Rules

Tracking numbers must be provided in valid format for the selected carrier. Carrier names must reference approved shipping carriers in the system. Shipped dates record when the package was handed to the carrier. Shipments can contain multiple order items from the same seller only. Items in the same shipment share identical tracking information. Shipment creation updates all included items to shipped status. Tracking information is visible to customers for delivery monitoring. Shipment dates cannot be in the future relative to order creation. Carrier name changes update all associated tracking records. Delivery confirmation applies to all items within a single shipment.

### Tracking Number and Carrier Validation

### Tracking Number Format

WHEN a seller creates a shipment, THE system SHALL:
1. Require a tracking number for the shipment
2. Validate the tracking number follows the format expected by the selected carrier
3. Ensure the tracking number is not empty or whitespace-only
4. Reject tracking numbers that do not match the carrier's expected pattern

IF the tracking number is missing, THE system SHALL reject the shipment creation request.
IF the tracking number format is invalid for the selected carrier, THE system SHALL reject the shipment creation request.

### Carrier Name Validation

WHEN a seller creates a shipment, THE system SHALL:
1. Require a carrier name for the shipment
2. Validate the carrier name references an approved shipping carrier in the system
3. Only allow carrier names from the system's approved carrier list
4. Reject shipments with carrier names not in the approved list

IF the carrier name is missing, THE system SHALL reject the shipment creation request.
IF the carrier name is not in the approved carrier list, THE system SHALL reject the shipment creation request.

### Shipped Date Recording

WHEN a seller creates a shipment, THE system SHALL:
1. Record the shipped date when the package is handed to the carrier
2. Require the shipped date to be a valid datetime value
3. Store the shipped date immutably once recorded
4. Use the shipped date for delivery timeline calculations

WHILE the shipment exists, THE system SHALL preserve the shipped date without modification.

### Shipment Creation and Item Grouping

### Same-Seller Item Grouping

WHEN a seller creates a shipment, THE system SHALL:
1. Only allow order items from the same seller to be included in a single shipment
2. Prevent order items from different sellers from being grouped into one shipment
3. Validate all selected items belong to the requesting seller
4. Reject shipment creation if any item belongs to a different seller

IF an order item belongs to a different seller, THE system SHALL reject the shipment creation request.

### Shared Tracking Information

WHEN a shipment is created, THE system SHALL:
1. Assign the same tracking number to all items in the shipment
2. Assign the same carrier name to all items in the shipment
3. Ensure all items in the shipment share identical tracking information
4. Display the same tracking information for all items when viewed by customers

WHEN a shipment's tracking information is updated, THE system SHALL update all items in that shipment with the new tracking information.

### Shipment Status Update

WHEN a seller creates a shipment, THE system SHALL:
1. Change the status of all included order items to "shipped"
2. Update item statuses immediately upon shipment creation
3. Prevent items with non-paid status from being included in shipments
4. Record the shipment creation timestamp for all included items

IF an order item has status other than "paid", THE system SHALL reject including it in the shipment.

### Shipment Status and Date Validation

### Date Validity Checks

WHEN a seller creates a shipment, THE system SHALL:
1. Validate the shipped date is not in the future relative to the current time
2. Validate the shipped date is not before the order creation date
3. Reject shipped dates that violate temporal constraints
4. Use the system timezone (Asia/Seoul) for date validation

IF the shipped date is in the future, THE system SHALL reject the shipment creation request.
IF the shipped date is before the order creation date, THE system SHALL reject the shipment creation request.

### Carrier Name Updates

WHEN a seller updates a shipment's carrier name, THE system SHALL:
1. Validate the new carrier name is in the approved carrier list
2. Update all associated tracking records with the new carrier name
3. Create a snapshot of the carrier name change for audit purposes
4. Notify customers of tracking information changes

IF the new carrier name is not in the approved list, THE system SHALL reject the update request.

### Shipment Status Transition

WHILE a shipment exists, THE system SHALL:
1. Allow status transitions only from "created" to "shipped" to "delivered"
2. Prevent status changes from delivered back to shipped or created
3. Record the timestamp of each status transition
4. Create snapshots for all status changes

WHEN a shipment status changes, THE system SHALL update all included order items to reflect the new status.

### Customer Tracking and Delivery

### Customer Tracking Visibility

WHEN a shipment is created, THE system SHALL:
1. Make tracking information visible to customers who purchased items in the shipment
2. Display the carrier name and tracking number on the order details page
3. Allow customers to view tracking information for each shipment in their order
4. Update tracking visibility immediately when shipment is created

WHEN a customer views their order, THE system SHALL display all shipments with their tracking information.

### Delivery Confirmation Scope

WHEN a customer confirms delivery, THE system SHALL:
1. Change the status of all items in the shipment to "delivered"
2. Apply delivery confirmation to the entire shipment, not individual items
3. Record the delivery confirmation timestamp for the shipment
4. Update all order items in the shipment simultaneously

WHEN the customer does not confirm delivery, THE system SHALL automatically change all items in the shipment to "delivered" after 14 days from the shipped date.

### Automatic Delivery Confirmation

WHILE 14 days have passed since the shipped date without customer confirmation, THE system SHALL:
1. Automatically change all items in the shipment to "delivered" status
2. Record the automatic delivery confirmation timestamp
3. Notify the customer of the automatic delivery confirmation
4. Allow customers to dispute the automatic confirmation within a reasonable period

IF a customer disputes automatic delivery confirmation, THE system SHALL require administrator review before changing the status.

### Shipment Modification and Lifecycle

### Shipment Modification Rules

WHEN a shipment is created, THE system SHALL:
1. Prevent removal of items from the shipment after creation
2. Prevent addition of new items to an existing shipment
3. Require creation of a new shipment for additional items
4. Preserve the original shipment record even if items are cancelled

IF a seller attempts to modify an existing shipment's items, THE system SHALL reject the modification request.

### Multi-Item Shipment Validation

WHEN a seller creates a shipment with multiple items, THE system SHALL:
1. Validate all items are from the same seller (defined in Same-Seller Item Grouping)
2. Validate all items have status "paid" before inclusion
3. Validate no items are already in another active shipment
4. Reject shipment creation if any validation fails

IF any item is already in another shipment, THE system SHALL reject the shipment creation request.

### Shipment Deletion and Cancellation

WHEN an order item in a shipment is cancelled, THE system SHALL:
1. Preserve the shipment record for audit purposes
2. Mark the cancelled item as "cancelled" within the shipment
3. Update the shipment to reflect the cancelled item status
4. Maintain tracking information for delivered items in the same shipment

WHEN all items in a shipment are cancelled, THE system SHALL mark the shipment as cancelled while preserving the record.

## Snapshot Validation Rules

Snapshot types must match one of the predefined entity categories. Creation timestamps record when each snapshot was generated. Previous values capture the complete state before the modification occurred. Snapshots are immutable and cannot be edited or deleted after creation. Snapshot types include product, variant, seller, order item, review, cancellation, and refund. Each snapshot references the entity type it preserves for audit purposes. Snapshot data supports dispute resolution by showing historical states. Snapshot queries are filtered by entity type and creation date ranges. Snapshot visibility is restricted to owners and administrators only. Snapshot preservation continues even after the original entity is deleted.

### Snapshot Type Enumeration

WHEN a snapshot is created, THE system SHALL assign a snapshot type from the following enumeration:
1. product - for product modifications
2. variant - for product variant modifications
3. seller - for seller profile modifications
4. orderItem - for order item snapshots at purchase time
5. review - for review modifications
6. cancellation - for cancellation request state changes
7. refund - for refund request state changes

THE system SHALL validate that the snapshot type matches one of the seven predefined categories.
THE system SHALL reject snapshot creation requests with invalid or unknown snapshot types.

WHEN a product snapshot is created, THE system SHALL include all product fields (name, description, category, base price, images).
WHEN a variant snapshot is created, THE system SHALL include all variant fields (SKU code, option values, price).
WHEN a seller snapshot is created, THE system SHALL include all seller profile fields (shop name, description, logo).
WHEN an order item snapshot is created, THE system SHALL include product name, description, variant options, price, and seller profile snapshot.
WHEN a review snapshot is created, THE system SHALL include rating and text content.
WHEN a cancellation snapshot is created, THE system SHALL include reason and status.
WHEN a refund snapshot is created, THE system SHALL include reason and status.

### Creation Timestamp and Value Completeness

WHEN a snapshot is created, THE system SHALL record the creation timestamp with millisecond precision.
THE system SHALL use the server timestamp for all snapshot creation records.
THE system SHALL ensure the creation timestamp is immutable and cannot be modified after snapshot creation.

WHEN a snapshot is created, THE system SHALL capture the complete state of the entity before modification.
THE system SHALL record all entity fields in the previous values, not only the changed fields.
THE system SHALL ensure previous values represent the exact state at the moment before modification.

WHEN a snapshot is created, THE system SHALL capture the complete state of the entity after modification.
THE system SHALL record all entity fields in the current values, not only the changed fields.
THE system SHALL ensure current values represent the exact state at the moment after modification.

THE system SHALL validate that both previous values and current values are complete and non-null.
THE system SHALL reject snapshot creation if previous values or current values are missing or incomplete.

### Snapshot Immutability

THE system SHALL ensure all snapshots are immutable after creation.
THE system SHALL prevent any modification to snapshot fields after the snapshot is created.
THE system SHALL prevent any deletion of snapshots after creation.

WHEN an attempt is made to modify a snapshot, THE system SHALL reject the modification request.
WHEN an attempt is made to delete a snapshot, THE system SHALL reject the deletion request.

THE system SHALL store snapshots in an immutable storage mechanism.
THE system SHALL validate snapshot integrity on read operations to detect any unauthorized modifications.

WHILE a snapshot exists, THE system SHALL maintain its original values unchanged.
THE system SHALL log all access attempts to snapshots for audit purposes.

### Entity Reference Validation

WHEN a snapshot is created for an entity, THE system SHALL validate that the entity reference exists.
WHEN a product snapshot is created, THE system SHALL validate the product ID references an existing product.
WHEN a variant snapshot is created, THE system SHALL validate the variant ID references an existing variant.
WHEN a seller snapshot is created, THE system SHALL validate the seller ID references an existing seller.
WHEN an order item snapshot is created, THE system SHALL validate the order item ID references an existing order item.
WHEN a review snapshot is created, THE system SHALL validate the review ID references an existing review.
WHEN a cancellation snapshot is created, THE system SHALL validate the cancellation request ID references an existing request.
WHEN a refund snapshot is created, THE system SHALL validate the refund request ID references an existing request.

IF the entity reference does not exist, THE system SHALL reject the snapshot creation request.
IF the entity reference is invalid or malformed, THE system SHALL reject the snapshot creation request.

THE system SHALL validate that the snapshot type matches the entity type being snapshotted.
THE system SHALL reject product snapshots for non-product entities and vice versa.

### Query Filtering and Visibility Restrictions

WHEN querying snapshots, THE system SHALL support filtering by snapshot type.
WHEN querying snapshots, THE system SHALL support filtering by creation date range.
WHEN querying snapshots, THE system SHALL support filtering by entity ID.
WHEN querying snapshots, THE system SHALL support filtering by the user who made the change.

THE system SHALL require at least one filter criterion for snapshot queries to prevent full table scans.
THE system SHALL paginate snapshot query results with a maximum page size of 100 records.

WHEN viewing snapshots, THE system SHALL restrict visibility to:
1. Entity owners (for products, variants, sellers, reviews)
2. Administrators (for all snapshots)
3. Relevant parties in dispute resolution (for order items, cancellations, refunds)

WHEN a customer is not the owner and not an administrator, THE system SHALL deny access to entity snapshots.
WHEN a seller is not the owner of a product, THE system SHALL deny access to that product's snapshots.

THE system SHALL log all snapshot access attempts for audit and security monitoring.

### Deletion Preservation and Dispute Resolution

THE system SHALL preserve all snapshots even after the original entity is deleted.
WHEN a product is deleted, THE system SHALL retain all product snapshots for audit and dispute resolution.
WHEN a variant is deleted, THE system SHALL retain all variant snapshots for audit and dispute resolution.
WHEN a review is deleted, THE system SHALL retain all review snapshots for audit and dispute resolution.
WHEN a seller account is deleted, THE system SHALL retain all seller snapshots for audit and dispute resolution.

THE system SHALL make preserved snapshots accessible to administrators for dispute resolution purposes.
THE system SHALL make preserved snapshots accessible to relevant parties during active disputes.

WHEN a dispute is filed, THE system SHALL provide access to all relevant snapshots for the disputed entity.
THE system SHALL display snapshot history showing all changes made to an entity over time.

THE system SHALL ensure snapshots support legal compliance requirements for transaction records.
THE system SHALL retain snapshots for the duration required by applicable laws and regulations.

THE system SHALL provide snapshot comparison functionality to show differences between any two snapshots.
THE system SHALL display the user who made each change captured in a snapshot.

## InventoryRecord Validation Rules

Inventory records capture quantity changes as positive or negative integers. Positive values represent restocking while negative values represent orders or adjustments. Reasons must be provided to document why each inventory change occurred. Recorded timestamps track when each inventory modification was made. Current stock is calculated by summing all inventory records for a variant. Inventory adjustments require valid reasons explaining the quantity change. Order placement creates automatic negative inventory records. Order cancellation creates automatic positive inventory records to restore stock. Inventory history is visible to sellers for their product variants. Stock quantity displays zero when all records sum to zero.

### Inventory Change Sign Rules

WHEN an inventory record is created, THE system SHALL require a quantity change value.

WHEN restocking inventory, THE system SHALL record a positive quantity change value.

WHEN adjusting inventory downward (loss, damage, correction), THE system SHALL record a negative quantity change value.

WHEN an order is placed, THE system SHALL automatically create a negative inventory record for each purchased variant.

WHEN an order is cancelled, THE system SHALL automatically create a positive inventory record to restore the stock quantity.

WHEN an order is refunded, THE system SHALL automatically create a positive inventory record to restore the stock quantity.

IF the quantity change value is zero, THE system SHALL reject the inventory record creation.

IF the quantity change sign does not match the operation type (positive for restock, negative for adjustment), THE system SHALL reject the record.

THE system SHALL store the quantity change as an integer value.

THE system SHALL preserve the sign of the quantity change for audit purposes.

### Inventory Documentation Requirements

WHEN an inventory record is created, THE system SHALL require a reason field documenting the change.

WHEN restocking inventory, THE system SHALL require a reason describing the restock source or method.

WHEN adjusting inventory downward, THE system SHALL require a reason explaining the adjustment cause (loss, damage, correction, etc.).

WHEN an order placement creates an automatic inventory record, THE system SHALL record "order placement" as the reason.

WHEN an order cancellation creates an automatic inventory record, THE system SHALL record "order cancellation" as the reason.

WHEN an order refund creates an automatic inventory record, THE system SHALL record "order refund" as the reason.

IF the reason field is empty or contains only whitespace, THE system SHALL reject the inventory record creation.

THE system SHALL record the timestamp when each inventory change is made.

THE system SHALL use the server timezone for all inventory record timestamps.

Inventory record timestamps SHALL be immutable once created.

### Current Stock Calculation

WHEN calculating current stock for a variant, THE system SHALL sum all inventory records for that variant.

WHEN the sum of all inventory records equals zero, THE system SHALL display the variant stock as zero.

WHEN inventory records are added, THE system SHALL recalculate the current stock immediately.

WHEN inventory records are modified (not permitted), THE system SHALL prevent the modification.

THE current stock value SHALL be derived solely from inventory record summation, not stored separately.

WHEN a seller views a variant's stock, THE system SHALL calculate and display the current sum of all inventory records.

IF inventory records contain errors, THE system SHALL provide adjustment records to correct the total rather than modifying existing records.

### Adjustment Reason Validation

WHEN a seller submits an inventory adjustment, THE system SHALL validate the reason field contains meaningful content.

WHEN a seller submits a negative inventory adjustment, THE system SHALL require a reason that explains the reduction cause.

WHEN a seller submits a restocking record, THE system SHALL require a reason that identifies the restock source.

IF the adjustment reason does not match the quantity change direction (e.g., positive reason for negative change), THE system SHALL reject the record.

THE system SHALL prevent deletion of inventory records.

THE system SHALL prevent modification of existing inventory record values.

WHEN a seller views inventory history, THE system SHALL display all records in chronological order.

### Automated Inventory Operations

WHEN a customer places an order, THE system SHALL automatically create inventory records for each purchased variant.

WHEN an order item status changes to "paid", THE system SHALL create a negative inventory record with the purchased quantity.

WHEN a customer cancels an order item with "paid" status, THE system SHALL automatically create a positive inventory record.

WHEN a customer requests a refund for a delivered item, THE system SHALL automatically create a positive inventory record upon approval.

THE automated inventory records SHALL include the reason field populated with the triggering event description.

THE automated inventory records SHALL be created within the same transaction as the order status change.

IF the automated inventory record creation fails, THE system SHALL rollback the order status change.

### Seller Inventory Visibility

WHEN a seller views their product variants, THE system SHALL display the inventory history for each variant.

WHEN a seller views inventory history, THE system SHALL show all inventory records including automated ones.

WHEN a seller views inventory history, THE system SHALL display the quantity change, reason, and timestamp for each record.

THE system SHALL restrict inventory history visibility to sellers who own the product variant.

Administrators SHALL be able to view inventory history for all product variants on the platform.

Customers SHALL NOT have access to inventory history records.

WHEN displaying inventory history, THE system SHALL show the calculated current stock at the time of viewing.

## CancellationRequest Validation Rules

Cancellation request reasons are required text fields explaining the customer's decision. Requests can only be submitted for order items with paid status. Items already shipped cannot be cancelled through the standard workflow. Request status transitions from pending to approved or rejected by sellers. Approved cancellations trigger refund processing and stock restoration. Rejected cancellations remain in the order with items continuing to ship. Cancellation snapshots preserve the request state at each status change. Time limits exist for cancellation requests before items ship. Seller responses to cancellation requests are recorded with timestamps. Partial order cancellations allow remaining items to proceed normally.

### Cancellation Reason Requirement

WHEN a customer requests cancellation of an order item, THE system SHALL:
1. Require a cancellation reason as mandatory text input
2. Validate the reason contains meaningful explanation (minimum 10 characters)
3. Accept cancellation reasons up to 500 characters in length
4. Store the reason with the cancellation request record

IF the cancellation reason is missing or empty, THE system SHALL reject the cancellation request.
IF the cancellation reason is shorter than 10 characters, THE system SHALL reject the cancellation request.
IF the cancellation reason exceeds 500 characters, THE system SHALL reject the cancellation request.

### Paid Status Restriction

WHEN a customer submits a cancellation request, THE system SHALL:
1. Verify the order item status is "paid" (payment completed, not yet shipped)
2. Block cancellation requests for items with "shipped" status
3. Block cancellation requests for items with "delivered" status
4. Block cancellation requests for items with "cancelled" status
5. Block cancellation requests for items with "refunded" status

IF the order item status is "shipped", THE system SHALL reject the cancellation request and inform the customer to contact the seller.
IF the order item status is "delivered", THE system SHALL reject the cancellation request and suggest a refund request instead.
IF the order item status is "cancelled" or "refunded", THE system SHALL reject the cancellation request as the item has already been processed.

### Shipped Item Blocking

WHEN a shipment is created for an order item, THE system SHALL:
1. Change all items in the shipment to "shipped" status
2. Block any pending cancellation requests for those items
3. Mark the items as ineligible for standard cancellation workflow
4. Notify the customer that the item is now in transit

WHILE an item has "shipped" status, THE system SHALL prevent cancellation request submission.
IF a cancellation request was submitted before shipment but not yet responded to, THE system SHALL notify the seller that the item has been shipped and the cancellation cannot be approved.

### Status Transition Workflow

WHEN a cancellation request is created, THE system SHALL set its status to "pending".
WHEN a seller approves a cancellation request, THE system SHALL:
1. Change the request status to "approved"
2. Change the order item status to "cancelled"
3. Process refund for the cancelled item
4. Restore stock quantity via inventory record
5. Update the parent order status based on remaining items

WHEN a seller rejects a cancellation request, THE system SHALL:
1. Change the request status to "rejected"
2. Keep the order item status as "paid"
3. Continue normal order processing for the item
4. Notify the customer of the rejection

IF all items in an order are cancelled, THE system SHALL update the parent order status to "cancelled".
IF some items are cancelled and others remain in "paid" or "shipped" status, THE system SHALL update the parent order status to "partiallyCompleted".

### Approval Refund Trigger

WHEN a cancellation request status changes to "approved", THE system SHALL:
1. Trigger automatic refund processing for the item amount
2. Create an inventory record to restore stock quantity
3. Mark the order item as "cancelled"
4. Record the refund transaction reference
5. Notify the customer of successful cancellation and refund

IF the refund processing fails, THE system SHALL:
1. Keep the cancellation request status as "approved"
2. Flag the order item for manual refund review
3. Notify the administrator of the refund failure
4. Allow the administrator to manually process the refund

### Rejection Continuation

WHEN a seller rejects a cancellation request, THE system SHALL:
1. Keep the order item status as "paid"
2. Allow the item to continue through normal shipping workflow
3. Record the rejection reason provided by the seller
4. Notify the customer of the rejection with the seller's reason
5. Allow the customer to contact the seller for further discussion

IF the item was already in the shipping process when rejected, THE system SHALL proceed with shipment creation as normal.
WHILE the item status is "paid" after rejection, THE system SHALL allow the seller to ship the item normally.

### Request State Snapshots

WHEN a cancellation request status changes, THE system SHALL:
1. Create a snapshot record with the previous state
2. Record the timestamp of the status change
3. Capture the user who made the change
4. Store both previous and current request values
5. Make the snapshot immutable and non-deletable

WHEN a cancellation request is approved or rejected, THE system SHALL:
1. Create a snapshot with the reason for approval/rejection
2. Record the response timestamp
3. Include seller notes if provided
4. Preserve the snapshot even if the request is later deleted

Snapshots SHALL be viewable by:
- The customer who requested the cancellation
- The seller who processed the request
- Administrators for dispute resolution

### Time Limit Enforcement

WHEN an order item reaches "shipped" status, THE system SHALL:
1. Calculate the time elapsed since the item was paid
2. Block cancellation requests after 24 hours from payment
3. Allow cancellation requests only within the 24-hour window if item not shipped
4. Notify customers of the cancellation time limit during checkout

IF a customer attempts to submit a cancellation request after the time limit, THE system SHALL:
1. Reject the request with an appropriate error message
2. Inform the customer to contact the seller directly
3. Suggest alternative options (refund after delivery, return process)

WHILE an item is in "paid" status, THE system SHALL track the time elapsed since payment for cancellation eligibility.

### Seller Response Recording

WHEN a seller responds to a cancellation request, THE system SHALL:
1. Record the response timestamp
2. Capture the approval or rejection decision
3. Store any seller notes or reasons provided
4. Update the request status accordingly
5. Create a snapshot of the request state

IF the seller approves the cancellation, THE system SHALL:
1. Record the approval timestamp
2. Store the approval confirmation
3. Trigger refund processing workflow
4. Notify the customer of approval

IF the seller rejects the cancellation, THE system SHALL:
1. Record the rejection timestamp
2. Store the rejection reason
3. Notify the customer of rejection
4. Allow the item to continue shipping

### Partial Cancellation Support

WHEN a customer submits a cancellation request for one item in a multi-item order, THE system SHALL:
1. Process the cancellation independently from other items
2. Keep other items in the order in their current status
3. Allow remaining items to continue through normal workflow
4. Update the parent order status to "partiallyCompleted" if mixed states exist

IF all items in an order are cancelled, THE system SHALL:
1. Update the parent order status to "cancelled"
2. Process refunds for all cancelled items
3. Restore stock for all cancelled items

IF some items are cancelled and others are delivered, THE system SHALL:
1. Mark the order as "partiallyCompleted"
2. Maintain separate status tracking for each item
3. Allow independent refund requests for delivered items

WHEN an order item is cancelled, THE system SHALL:
1. Remove the item from the shipment if not yet shipped
2. Adjust the order total accordingly
3. Notify the customer of the partial cancellation

## RefundRequest Validation Rules

Refund request reasons are required text fields explaining the return justification. Requests can only be submitted for order items with delivered status. The seven-day window from delivery date limits refund eligibility. Request status transitions from pending to approved or rejected by sellers. Approved refunds trigger payment reversal and stock restoration. Rejected refunds remain in the order with items considered final. Refund snapshots preserve the request state at each status change. Time validation ensures requests fall within the seven-day eligibility window. Seller responses to refund requests include timestamps and decision records. Partial order refunds allow remaining items to stay in delivered status.

### Refund Request Eligibility

WHEN a customer requests a refund for an order item, THE system SHALL:
1. Verify the order item has "delivered" status
2. Calculate the number of days elapsed since the item was delivered
3. Allow the request only if 7 or fewer days have passed since delivery
4. Require a refund reason explaining the return justification
5. Create a refund request record with "pending" status

IF the order item status is not "delivered", THE system SHALL reject the refund request.
IF more than 7 days have passed since delivery, THE system SHALL reject the refund request.
IF the refund reason is missing or empty, THE system SHALL reject the refund request.
IF the order item has already been cancelled or refunded, THE system SHALL reject the refund request.
IF the customer has already submitted a pending refund request for this order item, THE system SHALL reject the duplicate request.

WHEN calculating eligibility, THE system SHALL:
1. Use the shipment delivery confirmation timestamp or the automatic 14-day delivery confirmation
2. Count calendar days from the delivery date to the current date
3. Include the delivery date as day 0 in the calculation

A customer may submit refund requests for multiple items within the same order independently, as each order item has its own delivery date and eligibility window.

### Refund Request Submission

WHEN a customer submits a refund request, THE system SHALL:
1. Record the refund reason as required text content
2. Capture the current timestamp as the request submission time
3. Store the number of days elapsed since delivery for audit purposes
4. Associate the request with the specific order item
5. Set the initial request status to "pending"

WHEN the refund reason is validated, THE system SHALL:
1. Accept text content of any reasonable length
2. Require at least one non-whitespace character
3. Allow the customer to review the reason before submission

WHEN the time window is validated, THE system SHALL:
1. Compare the delivery date against the current system time
2. Reject requests where the 7-day window has expired
3. Display the remaining eligible days to the customer before submission
4. Block submission when zero or negative days remain

IF the order item belongs to a different seller, THE system SHALL route the request to that seller for review.
IF the order item is part of a multi-seller order, THE system SHALL process the refund request independently from other items in the order.

### Refund Request Processing Workflow

WHEN a refund request is in "pending" status, THE system SHALL:
1. Notify the seller of the product about the pending refund request
2. Display the refund reason to the seller for review
3. Allow the seller to approve or reject the request
4. Track the time elapsed since the request was submitted

WHEN a seller responds to a refund request, THE system SHALL:
1. Record the response timestamp
2. Capture the seller's decision (approved or rejected)
3. Update the request status accordingly
4. Create a snapshot of the request state at the time of response
5. Notify the customer of the seller's decision

WHEN the status transitions to "approved", THE system SHALL:
1. Change the order item status to "refunded"
2. Trigger payment reversal for the refunded amount
3. Restore the stock quantity via an inventory record
4. Update the overall order status based on remaining items

WHEN the status transitions to "rejected", THE system SHALL:
1. Change the order item status to "delivered" (maintaining current status)
2. Mark the refund request as final with no further action
3. Record the rejection reason if provided by the seller
4. Notify the customer that the refund was denied

IF the seller does not respond within a reasonable timeframe, THE system SHALL allow the customer to escalate to an administrator.

A refund request status follows this transition workflow:
- "pending" → "approved" (seller approves)
- "pending" → "rejected" (seller rejects)
- No transitions allowed from "approved" or "rejected" states

### Refund Request Outcomes

WHEN a refund request is approved, THE system SHALL:
1. Process payment reversal through the payment gateway
2. Credit the refund amount to the customer's original payment method
3. Create an inventory record to restore the variant stock quantity
4. Update the order item status to "refunded"
5. Recalculate the overall order status based on all item statuses

WHEN a refund request is rejected, THE system SHALL:
1. Maintain the order item in "delivered" status
2. Mark the refund request as final and unchangeable
3. Record the rejection in the order history
4. Consider the transaction as complete for that item

WHEN partial refunds occur within an order, THE system SHALL:
1. Process each refunded item independently
2. Maintain other items in their current status (delivered, shipped, or paid)
3. Update the overall order status to "partiallyCompleted" when some items are refunded
4. Allow remaining items to continue normal processing (shipping, delivery, etc.)

IF all items in an order are refunded, THE system SHALL update the overall order status to "refunded".
IF some items are refunded while others are delivered, THE system SHALL update the overall order status to "partiallyCompleted".

WHEN payment reversal is processed, THE system SHALL:
1. Use the original payment transaction reference
2. Refund the exact amount paid for that order item (unit price × quantity)
3. Handle payment gateway failures by marking the refund as pending retry
4. Log all payment reversal attempts for audit purposes

### Refund Request Snapshots

WHEN a refund request is created, THE system SHALL:
1. Create an initial snapshot recording the request details
2. Capture the refund reason, delivery days elapsed, and initial "pending" status
3. Record the customer who submitted the request
4. Store the snapshot with immutable timestamps

WHEN a refund request status changes, THE system SHALL:
1. Create a new snapshot capturing the state before the change
2. Record the new status value and response timestamp
3. Capture the seller's decision and any rejection reason
4. Store the snapshot with the changedBy reference

WHEN snapshots are viewed, THE system SHALL:
1. Display all snapshots in chronological order
2. Show the before and after values for each state change
3. Include timestamps and the user who made each change
4. Allow administrators to view all snapshots for dispute resolution

Snapshots are immutable and cannot be deleted, even if:
- The refund request is approved or rejected
- The order item status changes
- The customer account is deleted
- The seller account is deleted

WHEN a dispute arises, THE system SHALL:
1. Provide access to all refund request snapshots to administrators
2. Preserve the complete history of the request lifecycle
3. Maintain snapshots for legal and audit compliance purposes
4. Allow administrators to override refund decisions using snapshots as reference

## File Validation Rules

File uploads for product images must meet resolution and file size requirements. Accepted image formats are limited to standard web-compatible types. Image dimensions must fall within minimum and maximum pixel ranges. File sizes cannot exceed the platform's upload limits. Image reordering is permitted with the first image as the thumbnail. Image deletion removes the file from storage and updates product displays. Logo images for seller profiles have separate size requirements. All file uploads are scanned for malicious content before acceptance. File metadata records upload timestamp and original filename. Deleted images are removed from snapshots but file references remain for audit.

### Product Image Upload Validation

WHEN a customer uploads a product image, THE system SHALL:
1. Accept only JPEG, PNG, and WebP image formats
2. Require minimum image resolution of 800x600 pixels
3. Enforce maximum image resolution of 4000x4000 pixels
4. Limit individual file size to 5MB
5. Validate image dimensions fall within the acceptable range before upload

IF the image format is not supported, THE system SHALL reject the upload with an appropriate error message.
IF the image resolution is below the minimum threshold, THE system SHALL reject the upload.
IF the image resolution exceeds the maximum threshold, THE system SHALL reject the upload.
IF the file size exceeds 5MB, THE system SHALL reject the upload.

WHEN a seller uploads product images, THE system SHALL:
1. Allow up to 10 images per product
2. Accept the same formats as customer uploads (JPEG, PNG, WebP)
3. Apply the same resolution and size constraints
4. Record the upload order for display sequence

### Thumbnail Designation Rules

WHEN multiple images are uploaded for a product, THE system SHALL:
1. Designate the first uploaded image as the main thumbnail by default
2. Allow sellers to reorder images to change the thumbnail designation
3. Update the thumbnail immediately when reordering occurs
4. Display the thumbnail in search results and category listings

WHEN a product has no images, THE system SHALL:
1. Display a placeholder image in place of the thumbnail
2. Allow the product to remain visible in listings

IF a seller deletes the current thumbnail image, THE system SHALL:
1. Automatically promote the next available image to thumbnail status
2. If no images remain, display the placeholder image

### Seller Logo Upload Validation

WHEN a seller uploads a shop logo image, THE system SHALL:
1. Accept only JPEG, PNG, and WebP formats
2. Require minimum resolution of 200x200 pixels
3. Enforce maximum resolution of 1000x1000 pixels
4. Limit file size to 2MB
5. Accept square aspect ratios preferentially

IF the logo resolution is below 200x200 pixels, THE system SHALL reject the upload.
IF the logo resolution exceeds 1000x1000 pixels, THE system SHALL reject the upload.
IF the logo file size exceeds 2MB, THE system SHALL reject the upload.

WHEN a logo is uploaded, THE system SHALL:
1. Create a snapshot of the previous logo (if one exists)
2. Update the seller profile with the new logo
3. Propagate the logo change to all customer-facing displays

### Image Deletion Handling

WHEN a seller deletes a product image, THE system SHALL:
1. Remove the image file from storage
2. Update the product display to reflect the deletion
3. Preserve the image reference in existing product snapshots
4. If the deleted image was the thumbnail, promote the next image

WHEN a product is deleted, THE system SHALL:
1. Remove all associated image files from storage
2. Preserve image references in order item snapshots
3. Maintain audit trail of deleted images for administrative review

IF an image is referenced in an order snapshot, THE system SHALL:
1. Preserve the image reference in the snapshot record
2. Note that the original file may no longer exist in storage
3. Allow administrators to view snapshot metadata including deleted image references

### Malware Scanning Requirements

WHEN any file is uploaded to the platform, THE system SHALL:
1. Scan the file for malware and viruses before acceptance
2. Reject files that contain malicious content
3. Log all scan results for security audit purposes
4. Quarantine suspicious files for administrator review

IF a file fails the malware scan, THE system SHALL:
1. Reject the upload immediately
2. Notify the uploader of the rejection
3. Record the scan failure in security logs
4. Prevent the file from being stored on the platform

WHEN a file passes the malware scan, THE system SHALL:
1. Accept the file for storage
2. Record the scan timestamp and result
3. Allow the file to be associated with its intended entity

### Upload Metadata Recording

WHEN a file is uploaded, THE system SHALL record the following metadata:
1. Upload timestamp (date and time of upload)
2. Original filename provided by the uploader
3. File size in bytes
4. Content type (MIME type) of the file
5. Uploaded by (user ID of the uploader)
6. Associated entity (product ID, seller ID, etc.)

WHEN a file is modified or reordered, THE system SHALL:
1. Record the modification timestamp
2. Record which user made the change
3. Update the snapshot with the new metadata

IF a file is deleted, THE system SHALL:
1. Preserve the metadata record for audit purposes
2. Mark the file status as deleted
3. Retain metadata for at least 90 days after deletion

### Snapshot Reference Preservation

WHEN a product snapshot is created, THE system SHALL:
1. Include references to all product images at the time of the snapshot
2. Store image metadata (filename, size, upload timestamp) in the snapshot
3. Preserve image order sequence in the snapshot

WHEN a product is deleted, THE system SHALL:
1. Preserve all product snapshots including image references
2. Maintain image references even if original files are deleted
3. Allow administrators to view snapshot image references for dispute resolution

WHEN an order item snapshot is created, THE system SHALL:
1. Include the product image references at the time of purchase
2. Store the image metadata for customer reference
3. Preserve images in snapshots even after product deletion

IF a customer disputes a product, THE system SHALL:
1. Provide access to the relevant product snapshot
2. Display the images as they appeared at the time of purchase
3. Show the complete image history from all snapshots

## Integration Error Handling

External payment gateway integration requires valid transaction identifiers. Payment success or failure responses determine order creation outcomes. Failed payments allow customer retry without creating duplicate orders. Payment gateway timeouts trigger automatic retry logic with exponential backoff. Transaction identifiers are logged for audit and dispute resolution. Payment currency must match the platform's supported currency list. Refund processing through the gateway requires original transaction reference. Payment gateway errors are categorized for appropriate customer messaging. Integration health is monitored with alert thresholds for failures. Payment data is encrypted and never stored in plain text.

### Transaction Identifier Validation

WHEN a payment transaction is processed, THE system SHALL validate the transaction identifier format before submission to the payment gateway.

WHEN the transaction identifier is invalid, THE system SHALL reject the payment request and log the validation failure.

WHEN a payment response is received, THE system SHALL validate the transaction identifier matches the original request.

IF the transaction identifier does not match, THE system SHALL reject the response and trigger an alert for investigation.

THE system SHALL log all transaction identifiers with timestamp, gateway reference, and validation result for audit purposes.

THE system SHALL maintain transaction identifier logs for a minimum of 7 years for legal and dispute resolution purposes.

WHEN a transaction identifier is generated, THE system SHALL ensure uniqueness across all payment transactions.

IF the payment gateway returns an unknown transaction identifier, THE system SHALL flag the transaction for manual review.

### Payment Response Handling

WHEN a payment gateway responds with success, THE system SHALL create the order record and proceed with stock reduction.

WHEN a payment gateway responds with failure, THE system SHALL NOT create the order and allow the customer to retry payment.

WHEN a payment response is received, THE system SHALL categorize the response as success, failure, or timeout.

IF the payment fails due to insufficient funds, THE system SHALL display a specific error message to the customer.

IF the payment fails due to card validation error, THE system SHALL prompt the customer to verify card details.

WHEN a customer retries a failed payment, THE system SHALL generate a new transaction identifier and do NOT reuse the failed one.

THE system SHALL limit payment retries to 5 attempts within 24 hours to prevent abuse.

IF all payment retries are exhausted, THE system SHALL require the customer to contact support for assistance.

WHEN a payment timeout occurs, THE system SHALL initiate automatic retry logic with exponential backoff starting at 30 seconds, doubling up to a maximum of 10 minutes.

IF the payment gateway is unreachable after 3 consecutive timeout retries, THE system SHALL mark the payment as pending and notify the customer to retry later.

THE system SHALL log all payment response handling events including response codes, timestamps, and gateway identifiers.

### Failed Payment Retry Logic

WHEN a payment timeout occurs during checkout, THE system SHALL implement retry logic with exponential backoff.

THE retry intervals SHALL start at 30 seconds and double with each attempt (30s, 60s, 120s, 240s, 480s, 600s).

THE system SHALL perform a maximum of 6 retry attempts for timeout scenarios.

IF all timeout retries fail, THE system SHALL mark the order as pending and notify the customer to complete payment manually.

THE system SHALL log each retry attempt with timestamp, attempt number, and response status.

WHEN a timeout occurs, THE system SHALL NOT create duplicate orders for the same cart contents.

IF the customer abandons the checkout during timeout retries, THE system SHALL cancel the pending order and restore inventory after 24 hours.

### Currency and Refund Transaction Rules

WHEN currency conversion is required, THE system SHALL validate that the payment currency matches the platform's supported currency list.

IF the payment currency does not match, THE system SHALL reject the transaction and display an error message listing supported currencies.

THE system SHALL support USD, EUR, GBP, and KRW as the primary currencies for all transactions.

WHEN processing a refund, THE system SHALL require the original transaction reference to be provided to the payment gateway.

IF the original transaction reference is missing or invalid, THE system SHALL reject the refund request and display an error to the seller.

THE system SHALL validate that the refund amount does not exceed the original transaction amount.

IF a partial refund is requested, THE system SHALL track cumulative refund amounts against the original transaction.

THE system SHALL prevent duplicate refunds for the same transaction reference.

### Error Categorization

WHEN a payment gateway error occurs, THE system SHALL categorize the error into one of the following categories: authentication, validation, timeout, network, or gateway-internal.

IF the error is categorized as authentication, THE system SHALL alert the system administrator immediately.

IF the error is categorized as validation, THE system SHALL display a customer-friendly error message without exposing technical details.

IF the error is categorized as timeout or network, THE system SHALL trigger the automatic retry logic.

IF the error is categorized as gateway-internal, THE system SHALL log the error and notify the customer to retry later.

THE system SHALL maintain an error catalog mapping gateway error codes to internal categories and customer messages.

WHEN a new error code is encountered, THE system SHALL flag it for manual review and catalog expansion.

### Integration Health Monitoring

THE system SHALL monitor payment gateway integration health with a failure rate threshold of 5% over a 5-minute window.

IF the failure rate exceeds the threshold, THE system SHALL trigger a circuit breaker and route new transactions to a backup gateway if available.

THE system SHALL generate alerts when circuit breaker is activated, including failure rate, affected transactions, and duration.

THE system SHALL automatically attempt to resume normal operation after 10 minutes of successful transactions following a circuit breaker activation.

THE system SHALL log all health monitoring events including failure rates, circuit breaker states, and recovery attempts.

IF no backup gateway is available and the circuit breaker is active, THE system SHALL display a maintenance message to customers and suspend new checkout attempts.

### Payment Data Encryption

THE system SHALL encrypt all payment data at rest using AES-256 encryption.

THE system SHALL encrypt all payment data in transit using TLS 1.3 or higher.

THE system SHALL NEVER store credit card numbers, CVV codes, or full track data in any database or log.

WHEN payment data is transmitted to the gateway, THE system SHALL use tokenization to avoid handling raw card data.

THE system SHALL rotate encryption keys every 90 days and maintain a key rotation audit log.

IF encryption key rotation fails, THE system SHALL alert the security team and prevent new payment processing until resolved.

THE system SHALL ensure all transaction logs exclude sensitive payment information and only store masked or tokenized references.

THE system SHALL conduct quarterly security audits to verify encryption compliance and data handling practices.

# Filtering, Sorting, and Pagination

List query specifications for filtering, sorting, and pagination.

## List Query Specifications

Define filtering, sorting, and pagination rules for list operations.

### Product Search Filtering

WHEN a customer searches for products, THE system SHALL support the following filters:

1. Category Filter
   - Customers can filter products by selecting a specific category
   - When a category is selected, products from that category and its subcategory (if any) are included
   - THE system SHALL display products from all sellers when filtering by category

2. Price Range Filter
   - Customers can specify a minimum price for filtering
   - Customers can specify a maximum price for filtering
   - WHEN a minimum price is specified, THE system SHALL exclude products with base price below the minimum
   - WHEN a maximum price is specified, THE system SHALL exclude products with all variants priced above the maximum
   - WHEN both minimum and maximum are specified, THE system SHALL include products within the range

3. Stock Status Filter
   - Customers can filter to show only in-stock products
   - WHEN "in-stock only" filter is applied, THE system SHALL exclude products where all variants have zero stock
   - WHEN "in-stock only" filter is applied, THE system SHALL include products with at least one variant having stock greater than zero

4. Search Keyword Filter
   - Customers can search products by name using text keywords
   - THE system SHALL perform case-insensitive matching on product names
   - THE system SHALL include products where the name contains the search keyword

5. Filter Combination
   - Customers can combine multiple filters in a single query
   - THE system SHALL apply all specified filters using AND logic
   - WHEN no filters are specified, THE system SHALL return all active products

### Product Search Sorting

WHEN a customer views product search results or category listings, THE system SHALL support the following sorting options:

1. Newest First
   - Customers can sort products by creation date, newest first
   - THE system SHALL order products by creation timestamp in descending order
   - WHEN two products have the same creation date, THE system SHALL use product ID as secondary sort key

2. Price Low to High
   - Customers can sort products by price, ascending order
   - THE system SHALL use the lowest variant price for products with multiple variants
   - THE system SHALL use the base price for products without variants
   - WHEN two products have the same price, THE system SHALL use creation date as secondary sort key

3. Price High to Low
   - Customers can sort products by price, descending order
   - THE system SHALL use the lowest variant price for products with multiple variants
   - THE system SHALL use the base price for products without variants
   - WHEN two products have the same price, THE system SHALL use creation date as secondary sort key

4. Default Sorting
   - WHEN no sort option is specified, THE system SHALL default to "newest first"
   - THE system SHALL preserve the selected sort option across pagination

5. Sorting with Filters
   - THE system SHALL apply sorting after filtering is complete
   - WHEN filters reduce the result set, THE system SHALL sort the filtered results

### Product Search Pagination

WHEN a customer views product search results or category listings, THE system SHALL implement pagination as follows:

1. Page Size
   - THE system SHALL support configurable page sizes for product listings
   - THE system SHALL use a default page size of 20 products per page
   - THE system SHALL enforce a maximum page size of 100 products per page

2. Page Number Navigation
   - Customers can navigate to specific pages using page numbers
   - THE system SHALL validate page numbers are positive integers
   - WHEN an invalid page number is requested, THE system SHALL return the first page
   - THE system SHALL return an empty result set when requesting a page beyond available results

3. Cursor-Based Pagination
   - THE system SHALL support cursor-based pagination for improved performance
   - THE system SHALL generate a cursor token representing the current position in results
   - Customers can use the cursor to fetch the next page of results
   - WHEN a cursor is expired or invalid, THE system SHALL return an error with instructions to restart pagination

4. Result Metadata
   - THE system SHALL return total result count in pagination metadata
   - THE system SHALL return current page number in pagination metadata
   - THE system SHALL return total page count in pagination metadata
   - THE system SHALL indicate whether more results are available

5. Pagination State
   - THE system SHALL preserve filter and sort parameters across pagination requests
   - WHEN filters or sort options change, THE system SHALL reset to page 1

### Order History Pagination

WHEN a customer views their order history, THE system SHALL implement pagination as follows:

1. Default Sorting
   - THE system SHALL sort orders by creation date, newest first
   - THE system SHALL not allow customers to change the sort order

2. Page Size
   - THE system SHALL use a default page size of 20 orders per page
   - THE system SHALL enforce a maximum page size of 50 orders per page

3. Pagination Navigation
   - Customers can navigate between pages using page numbers
   - THE system SHALL validate page numbers are positive integers
   - THE system SHALL return an empty result set when requesting a page beyond available results

4. Result Metadata
   - THE system SHALL return total order count in pagination metadata
   - THE system SHALL return current page number in pagination metadata
   - THE system SHALL return total page count in pagination metadata

5. Order List Display
   - THE system SHALL display order number, date, total price, and overall status for each order in the list
   - THE system SHALL provide a link to view full order details

### Wishlist Pagination

WHEN a customer views their wishlist, THE system SHALL implement pagination as follows:

1. Default Sorting
   - THE system SHALL sort wishlist items by addition date, newest first
   - THE system SHALL not allow customers to change the sort order

2. Page Size
   - THE system SHALL use a default page size of 20 products per page
   - THE system SHALL enforce a maximum page size of 50 products per page

3. Pagination Navigation
   - Customers can navigate between pages using page numbers
   - THE system SHALL validate page numbers are positive integers
   - THE system SHALL return an empty result set when requesting a page beyond available results

4. Result Metadata
   - THE system SHALL return total wishlist item count in pagination metadata
   - THE system SHALL return current page number in pagination metadata
   - THE system SHALL return total page count in pagination metadata

5. Deleted Product Handling
   - WHEN a product in the wishlist is deleted by the seller, THE system SHALL automatically remove it from the wishlist
   - THE system SHALL NOT display deleted products in wishlist results
   - THE system SHALL recalculate pagination when deleted products are removed

### Seller Order Items Query

WHEN a seller views order items for their products, THE system SHALL support the following query capabilities:

1. Status Filtering
   - Sellers can filter order items by status (paid, shipped, delivered, cancelled, refunded)
   - THE system SHALL support filtering by multiple statuses simultaneously
   - WHEN no status filter is specified, THE system SHALL return order items with all statuses

2. Default Sorting
   - THE system SHALL sort order items by creation date, newest first
   - THE system SHALL not allow sellers to change the sort order

3. Pagination
   - THE system SHALL use a default page size of 50 order items per page
   - THE system SHALL enforce a maximum page size of 100 order items per page
   - THE system SHALL preserve filter parameters across pagination requests

4. Result Metadata
   - THE system SHALL return total order item count in pagination metadata
   - THE system SHALL return current page number in pagination metadata
   - THE system SHALL return total page count in pagination metadata

5. Data Isolation
   - THE system SHALL return only order items for products owned by the seller
   - THE system SHALL NOT return order items for products owned by other sellers

### Inventory History Query

WHEN a seller views the inventory history for a product variant, THE system SHALL implement the following query rules:

1. Default Sorting
   - THE system SHALL sort inventory records by timestamp, newest first
   - THE system SHALL not allow sellers to change the sort order

2. Pagination
   - THE system SHALL use a default page size of 50 inventory records per page
   - THE system SHALL enforce a maximum page size of 200 inventory records per page
   - THE system SHALL preserve the variant context across pagination requests

3. Result Metadata
   - THE system SHALL return total inventory record count in pagination metadata
   - THE system SHALL return current page number in pagination metadata
   - THE system SHALL return the current calculated stock quantity

4. Data Isolation
   - THE system SHALL return only inventory records for variants owned by the seller
   - THE system SHALL NOT return inventory records for variants owned by other sellers

5. Record Display
   - THE system SHALL display quantity change, reason, recorded timestamp, and resulting stock for each record
   - THE system SHALL indicate whether the change was positive (restocking) or negative (order/adjustment)

### Snapshot Query

WHEN a user queries snapshots for an entity, THE system SHALL implement the following query rules:

1. Entity-Based Filtering
   - Customers can view snapshots for products they have purchased (order items)
   - Customers can view snapshots for their own reviews
   - Sellers can view snapshots for their own products and variants
   - Sellers can view snapshots for their own profile edits
   - Administrators can view snapshots for any product, variant, or order item
   - THE system SHALL enforce data isolation based on user role and ownership

2. Default Sorting
   - THE system SHALL sort snapshots by creation timestamp, newest first
   - THE system SHALL not allow users to change the sort order

3. Pagination
   - THE system SHALL use a default page size of 20 snapshots per page
   - THE system SHALL enforce a maximum page size of 100 snapshots per page
   - THE system SHALL preserve the entity context across pagination requests

4. Result Metadata
   - THE system SHALL return total snapshot count in pagination metadata
   - THE system SHALL return current page number in pagination metadata
   - THE system SHALL return total page count in pagination metadata

5. Snapshot Content
   - THE system SHALL display creation timestamp, changed-by user, previous values, and current values for each snapshot
   - THE system SHALL NOT allow modification or deletion of snapshots through any query operation
   - THE system SHALL preserve snapshots even when the associated entity is deleted

6. Cancellation and Refund Request Snapshots
   - Customers can view snapshots for their own cancellation and refund requests
   - Sellers can view snapshots for cancellation and refund requests on their order items
   - Administrators can view snapshots for any cancellation or refund request

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Account Registration and Access Errors

WHEN a customer attempts to register with an email that already exists, THE system SHALL reject the registration request.
WHEN a seller attempts to register with an email that already exists, THE system SHALL reject the registration request.
WHEN a customer attempts to log in with incorrect credentials, THE system SHALL reject the login attempt.
WHEN a seller attempts to log in with incorrect credentials, THE system SHALL reject the login attempt.
WHEN a banned customer attempts to log in, THE system SHALL deny access.
WHEN a banned seller attempts to log in, THE system SHALL deny access.

### Account Deletion Errors

WHEN a customer attempts to delete their account, THE system SHALL preserve their order history and reviews.
WHEN a seller attempts to delete their account with pending orders (paid or shipped status), THE system SHALL reject the deletion request.
WHEN a seller attempts to delete their account with pending cancellation or refund requests, THE system SHALL reject the deletion request.

### Seller Approval Errors

WHEN a seller registration is rejected by an administrator, THE system SHALL record and display the rejection reason.
WHEN a rejected seller submits a new registration request, THE system SHALL allow the submission.
WHEN an administrator rejects a seller without providing a reason, THE system SHALL require the reason field before submission.

### Product and Category Management Errors

WHEN a customer attempts to create a product, THE system SHALL require a product name, description, category, and base price.
WHEN a customer attempts to create a product without a category, THE system SHALL reject the request.
WHEN a customer attempts to create a product with a deleted category, THE system SHALL reject the request.

### Product Variant Errors

WHEN a seller attempts to create a product variant without a SKU code, THE system SHALL reject the request.
WHEN a seller attempts to create a product variant with a duplicate SKU code, THE system SHALL reject the request.
WHEN a seller attempts to create a product variant without stock quantity, THE system SHALL reject the request.
WHEN a seller attempts to edit a variant's SKU code to a duplicate value, THE system SHALL reject the request.
WHEN a seller attempts to delete a variant with pending order items (paid or shipped status), THE system SHALL reject the deletion.
WHEN a seller attempts to delete a variant with pending cancellation or refund requests, THE system SHALL reject the deletion.

### Product Deletion Errors

WHEN a seller attempts to delete a product with pending order items for any variant, THE system SHALL reject the deletion.
WHEN a seller attempts to delete a product with pending cancellation or refund requests for any variant, THE system SHALL reject the deletion.
WHEN a seller attempts to delete a product that does not belong to them, THE system SHALL reject the request.

### Category Errors

WHEN a customer attempts to create a category, THE system SHALL reject the request (only administrators can create categories).
WHEN a customer attempts to edit a category, THE system SHALL reject the request (only administrators can edit categories).
WHEN an administrator attempts to delete a category, THE system SHALL move products to uncategorized status.
WHEN an administrator attempts to create a subcategory under a non-existent parent, THE system SHALL reject the request.
WHEN an administrator attempts to create a category with more than one level of nesting, THE system SHALL reject the request.

### Order and Payment Processing Errors

WHEN a customer attempts to add a variant to their cart that is out of stock, THE system SHALL reject the addition.
WHEN a customer attempts to add a variant that has been deleted by the seller, THE system SHALL reject the addition.
WHEN a customer attempts to checkout with unavailable items in their cart, THE system SHALL prevent checkout.
WHEN a customer attempts to checkout without selecting a shipping address, THE system SHALL require address selection.

### Payment Errors

WHEN a payment gateway returns a failure response, THE system SHALL not create the order.
WHEN a payment fails, THE system SHALL allow the customer to retry payment.
WHEN a payment times out, THE system SHALL allow the customer to retry payment.
WHEN a payment succeeds but order creation fails, THE system SHALL rollback the payment transaction.

### Order Creation Errors

WHEN a customer attempts to place an order with a deleted product, THE system SHALL reject the order.
WHEN a customer attempts to place an order with a suspended seller's product, THE system SHALL reject the order.
WHEN a customer attempts to place an order with insufficient stock for any variant, THE system SHALL reject the order.
WHEN order creation succeeds but stock reduction fails, THE system SHALL rollback the order creation.

### Shipping Errors

WHEN a seller attempts to ship items from different sellers in one shipment, THE system SHALL reject the shipment.
WHEN a seller attempts to create a shipment without tracking information, THE system SHALL reject the request.
WHEN a seller attempts to ship items that are not in "paid" status, THE system SHALL reject the shipment.
WHEN a customer attempts to confirm delivery for a shipment that has not been shipped, THE system SHALL reject the confirmation.

### Request and Review Errors

WHEN a customer attempts to request cancellation for an item with status other than "paid", THE system SHALL reject the request.
WHEN a customer attempts to request cancellation for an item that has been shipped, THE system SHALL reject the request.
WHEN a customer attempts to request cancellation without providing a reason, THE system SHALL reject the request.
WHEN a seller attempts to respond to a cancellation request that does not exist, THE system SHALL reject the response.
WHEN a seller attempts to approve a cancellation request for an item with status other than "paid", THE system SHALL reject the approval.

### Refund Request Errors

WHEN a customer attempts to request a refund for an item with status other than "delivered", THE system SHALL reject the request.
WHEN a customer attempts to request a refund more than 7 days after delivery, THE system SHALL reject the request.
WHEN a customer attempts to request a refund without providing a reason, THE system SHALL reject the request.
WHEN a seller attempts to respond to a refund request that does not exist, THE system SHALL reject the response.
WHEN a seller attempts to approve a refund request for an item with status other than "delivered", THE system SHALL reject the approval.

### Review Errors

WHEN a customer attempts to write a review for a product they have not purchased, THE system SHALL reject the review.
WHEN a customer attempts to write a review for an order item that is not in "delivered" status, THE system SHALL reject the review.
WHEN a customer attempts to write multiple reviews for the same product in the same order, THE system SHALL reject the duplicate review.
WHEN a customer attempts to write a review with a rating outside the 1-5 range, THE system SHALL reject the review.
WHEN a customer attempts to edit a review that does not belong to them, THE system SHALL reject the edit.
WHEN a customer attempts to delete a review that does not belong to them, THE system SHALL reject the deletion.

### Access Control and Ownership Errors

WHEN a customer attempts to view an order that does not belong to them, THE system SHALL deny access.
WHEN a customer attempts to modify an order that does not belong to them, THE system SHALL deny access.
WHEN a seller attempts to view order items for products they do not sell, THE system SHALL deny access.
WHEN a seller attempts to ship order items for products they do not sell, THE system SHALL deny access.
WHEN a seller attempts to respond to cancellation/refund requests for products they do not sell, THE system SHALL deny access.

### Account Ownership Errors

WHEN a customer attempts to edit another customer's profile, THE system SHALL deny access.
WHEN a customer attempts to delete another customer's address, THE system SHALL deny access.
WHEN a seller attempts to edit another seller's product, THE system SHALL deny access.
WHEN a seller attempts to delete another seller's product, THE system SHALL deny access.
WHEN a seller attempts to edit another seller's variant, THE system SHALL deny access.

### Administrator Access Errors

WHEN a regular administrator attempts to demote themselves, THE system SHALL deny the action.
WHEN a regular administrator attempts to approve another administrator's promotion, THE system SHALL deny the action.
WHEN a non-administrator attempts to approve seller registrations, THE system SHALL deny the action.
WHEN a non-administrator attempts to manage categories, THE system SHALL deny the action.
WHEN a non-administrator attempts to view all platform orders, THE system SHALL deny the action.

### System and Integration Errors

WHEN a snapshot creation fails during product edit, THE system SHALL rollback the product edit.
WHEN a snapshot creation fails during order creation, THE system SHALL rollback the order creation.
WHEN an inventory record update fails during order placement, THE system SHALL rollback the order.
WHEN a transaction fails due to database constraint violation, THE system SHALL return a validation error to the user.
WHEN a transaction fails due to deadlock, THE system SHALL retry the transaction up to 3 times.
WHEN a transaction fails after maximum retries, THE system SHALL return a service unavailable error.

### External Service Errors

WHEN the payment gateway is unavailable, THE system SHALL display a service temporarily unavailable message.
WHEN the payment gateway times out, THE system SHALL allow the customer to retry.
WHEN the shipping carrier API is unavailable during shipment creation, THE system SHALL queue the tracking information for later processing.
WHEN an external service returns invalid data, THE system SHALL log the error and notify administrators.

### Data Integrity Errors

WHEN a product snapshot is requested but does not exist, THE system SHALL return an error.
WHEN an inventory record calculation results in negative stock, THE system SHALL flag the discrepancy for administrator review.
WHEN a deleted product is referenced in a wishlist, THE system SHALL automatically remove it from the wishlist.
WHEN a deleted variant is referenced in a cart, THE system SHALL mark it as unavailable in the cart.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Upload Validation

### Allowed File Types

THE system SHALL only accept image files for product uploads.

THE system SHALL accept the following image formats:
- JPEG
- PNG
- WebP

WHEN a customer uploads a file with an unsupported format, THE system SHALL reject the upload and display an error message indicating the allowed formats.

### File Size Limits

WHEN a customer uploads a product image, THE system SHALL validate that the file size does not exceed 10MB.

IF the file size exceeds 10MB, THE system SHALL reject the upload and inform the customer of the size limit.

### Image Resolution Requirements

WHEN a customer uploads a product image, THE system SHALL validate that the image dimensions are at least 200 pixels in both width and height.

WHEN a customer uploads a product image, THE system SHALL validate that the image dimensions do not exceed 4000 pixels in either width or height.

IF the image dimensions are below the minimum or above the maximum, THE system SHALL reject the upload and display an error message with the valid dimension range.

### Thumbnail Designation

WHEN a seller uploads multiple images for a product, THE system SHALL designate the first uploaded image as the main thumbnail image.

WHEN a seller reorders product images, THE system SHALL update the thumbnail designation to reflect the new first image.

### Content-Type Validation

WHEN a file is uploaded, THE system SHALL validate that the MIME type matches the file extension.

IF the MIME type does not match the file extension, THE system SHALL reject the upload and display a security error message.

### Virus Scanning Requirements

### Automatic Virus Scanning

WHEN a file is uploaded to the platform, THE system SHALL automatically scan the file for malware and viruses before storing it.

WHEN a file is uploaded, THE system SHALL quarantine the file until the virus scan completes.

### Scan Results Handling

WHEN a virus scan detects malware in an uploaded file, THE system SHALL reject the file and prevent it from being stored.

WHEN a virus scan detects malware, THE system SHALL log the incident with the file metadata and upload timestamp.

WHEN a virus scan detects malware, THE system SHALL display a generic error message to the customer without revealing security details.

### Scan Failure Handling

WHEN the virus scanning service is unavailable, THE system SHALL queue the file for scanning and temporarily hold it in a pending state.

IF the virus scan fails due to service error after three retry attempts, THE system SHALL reject the file and notify the administrator.

### Post-Upload Monitoring

THE system SHALL periodically re-scan stored product images for newly discovered malware signatures.

WHEN a stored file is identified as malicious during re-scanning, THE system SHALL remove it from public access and notify the product owner.

### File Retention Policies

### Product Image Retention

WHEN a product is deleted by the seller, THE system SHALL retain all product images for 90 days before permanent deletion.

WHEN a product is deleted by an administrator for policy violations, THE system SHALL retain all product images for 180 days for audit purposes.

### Snapshot Image Retention

WHEN a product snapshot is created, THE system SHALL retain all images referenced in the snapshot indefinitely.

THE system SHALL NOT delete images referenced in any snapshot, even if the original product is deleted.

### Order Item Snapshot Retention

WHEN an order is completed, THE system SHALL retain all product images referenced in order item snapshots indefinitely for dispute resolution.

### Seller Profile Image Retention

WHEN a seller deletes their account, THE system SHALL retain their shop logo for 180 days in order snapshots.

WHEN a seller profile is updated, THE system SHALL retain previous logo images in snapshots for 180 days.

### Retention Period Summary

| Scenario | Retention Period | Purpose |
|----------|-----------------|----------|
| Deleted product (seller) | 90 days | Recovery window |
| Deleted product (admin) | 180 days | Audit trail |
| Snapshot images | Indefinite | Dispute resolution |
| Order item images | Indefinite | Legal compliance |
| Seller logo in orders | 180 days | Order history |

### Data Purging Process

THE system SHALL automatically purge files that have exceeded their retention period.

THE system SHALL log all purged files with timestamp and reason before deletion.

THE system SHALL notify administrators of bulk purging operations on a monthly basis.

### File Upload Error Conditions

### Upload Rejection Scenarios

THE system SHALL reject file uploads when the file format is not in the allowed list.

THE system SHALL reject file uploads when the file size exceeds the 10MB limit.

THE system SHALL reject file uploads when the image dimensions are outside the 200-4000 pixel range.

THE system SHALL reject file uploads when the MIME type does not match the file extension.

THE system SHALL reject file uploads when the virus scan detects malware.

### Storage Capacity Errors

WHEN the storage quota for a seller is exceeded, THE system SHALL reject new file uploads and display a storage limit error.

WHEN the platform storage capacity reaches 90% utilization, THE system SHALL notify administrators to expand capacity.

### Network and Timeout Errors

WHEN a file upload times out, THE system SHALL allow the customer to retry the upload.

WHEN the upload service is temporarily unavailable, THE system SHALL display a maintenance message and queue the upload for later processing.

### Permission Errors

THE system SHALL reject file upload requests from sellers whose accounts are suspended or banned.

THE system SHALL reject file modification requests for products the seller does not own.

### File Access and Display Rules

### Product Image Visibility

WHEN a product is active, THE system SHALL display all uploaded images on the product detail page.

WHEN a product is deleted, THE system SHALL hide all images from public views.

WHEN a product is suspended by an administrator, THE system SHALL hide all images from search and category listings.

### Thumbnail Display Rules

WHEN displaying product listings, THE system SHALL show only the thumbnail image for each product.

WHEN displaying product details, THE system SHALL show all images with the thumbnail as the default view.

### Image Loading Performance

THE system SHALL serve optimized thumbnail images for product listings to improve page load times.

THE system SHALL serve full-resolution images only when requested on the product detail page.

### Broken Image Handling

WHEN an image fails to load, THE system SHALL display a placeholder image instead of breaking the layout.

WHEN multiple images fail to load, THE system SHALL log the errors for administrator review.

# Integration Error Handling

Error handling and retry policies for external integrations.

## Integration Failure Policies

Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

### Retry Policies

WHEN an external payment gateway integration fails, THE system SHALL:
1. Log the failure with the transaction identifier
2. Retry the payment request up to 3 times with exponential backoff
3. Wait 5 seconds before the first retry, 15 seconds before the second retry, and 30 seconds before the third retry
4. Record each retry attempt with timestamp and response status

WHEN the retry limit is reached and all attempts fail, THE system SHALL:
1. Mark the payment as failed
2. Not create the order
3. Notify the customer that payment processing failed
4. Allow the customer to retry payment with a new transaction

WHEN an integration timeout occurs, THE system SHALL:
1. Treat it as a retryable failure
2. Apply the same retry policy as other integration failures
3. Log the timeout with the operation that timed out

### Circuit-Breaker Pattern

WHEN an external service experiences consecutive failures, THE system SHALL:
1. Open the circuit-breaker after 5 consecutive failures within a 1-minute window
2. When the circuit is open, THE system SHALL immediately fail all integration requests without attempting the external call
3. The circuit shall remain open for 60 seconds before transitioning to half-open state
4. In half-open state, THE system SHALL allow one test request to the external service

WHEN the test request in half-open state succeeds, THE system SHALL:
1. Close the circuit and resume normal operation
2. Reset the consecutive failure counter

WHEN the test request in half-open state fails, THE system SHALL:
1. Reopen the circuit
2. Reset the 60-second timer
3. Continue rejecting all integration requests

WHILE the circuit is open, THE system SHALL:
1. Return a fallback response to the user
2. Log each blocked request with the circuit-breaker state

### Fallback Behavior

WHEN an external integration fails and the circuit is open, THE system SHALL provide the following fallback behaviors:

For payment processing:
1. Inform the customer that payment processing is temporarily unavailable
2. Allow the customer to save their cart and retry later
3. Preserve cart items for 24 hours
4. Do not proceed with order creation until payment succeeds

For inventory updates:
1. Queue the inventory change request locally
2. Process queued requests when the external service becomes available
3. Notify the seller if inventory updates fail after 3 attempts

For shipping carrier integration:
1. Allow sellers to enter tracking information manually
2. Mark shipments as "pending carrier confirmation"
3. Sync tracking status when carrier integration is restored

WHEN fallback mode is active, THE system SHALL:
1. Display appropriate user-facing messages about temporary unavailability
2. Log all fallback activations for monitoring
3. Notify administrators when fallback persists for more than 10 minutes

### Integration Error Handling

WHEN an integration error occurs, THE system SHALL:
1. Log the error with the following information:
   - External service name
   - Operation attempted
   - Error code from external service
   - Timestamp
   - Transaction identifier (if applicable)
   - Request and response payloads (excluding sensitive data)

WHEN a payment integration error occurs, THE system SHALL:
1. Validate the transaction identifier format before processing
2. Reject requests with invalid transaction identifiers
3. Log all payment response codes received from the gateway
4. Map external error codes to internal error categories

WHEN an integration error affects customer-facing operations, THE system SHALL:
1. Display a user-friendly error message
2. Do not expose internal error details or stack traces
3. Provide guidance on retry options or alternative actions

WHEN an integration error affects seller operations, THE system SHALL:
1. Notify the seller of the failure
2. Provide the error category and recommended action
3. Allow sellers to retry the operation after a cooldown period

THE system SHALL maintain an error catalog that documents:
1. All known integration error codes
2. Their meaning and severity
3. Recommended handling procedures
4. Whether they are retryable or require manual intervention

# Job Failure Policies

Failure handling and dead-letter queue policies for background jobs.

## Job Failure and Recovery

Define failure handling, recovery procedures, and notification requirements for background jobs.

### Job Failure Recording

WHEN a background job fails to complete, THE system SHALL:
1. Record the failure with timestamp and error details
2. Preserve the job state for recovery analysis
3. Increment the retry counter
4. Determine the next action based on failure type

IF a job exceeds the maximum retry limit, THE system SHALL:
1. Mark the job as permanently failed
2. Move the job to the dead-letter queue
3. Notify administrators of the critical failure
4. Preserve all job data for manual investigation

WHILE a job is in retry state, THE system SHALL:
1. Prevent duplicate job execution
2. Maintain the original job parameters
3. Track cumulative retry attempts
4. Log each retry attempt with timing information

### Retry Mechanism

WHEN a job fails temporarily, THE system SHALL:
1. Schedule a retry after the configured delay period
2. Use exponential backoff for consecutive failures
3. Preserve original job parameters for retry execution
4. Log the retry attempt with previous failure context

IF the retry succeeds, THE system SHALL:
1. Mark the job as completed successfully
2. Clear the failure state
3. Reset the retry counter to zero
4. Execute any completion callbacks

IF the retry fails, THE system SHALL:
1. Increment the retry counter
2. Calculate the next retry delay using backoff formula
3. Re-schedule the job for the next attempt
4. Continue until maximum retries are reached

WHEN the maximum retry limit is reached, THE system SHALL:
1. Stop automatic retry attempts
2. Mark the job as requiring manual intervention
3. Transfer the job to the dead-letter queue
4. Generate an alert for administrative review

### Dead-Letter Queue Recovery

WHEN a job enters the dead-letter queue, THE system SHALL:
1. Preserve all job data including parameters and failure history
2. Make the job visible to administrators for manual review
3. Prevent automatic reprocessing without administrative action
4. Maintain audit trail of all failure events

WHEN an administrator reviews a dead-letter job, THE system SHALL:
1. Display complete failure history and error details
2. Show the original job parameters and execution context
3. Provide options to retry, modify, or discard the job
4. Log the administrative action taken

IF an administrator retries a dead-letter job, THE system SHALL:
1. Reset the retry counter
2. Execute the job with original or modified parameters
3. Track the retry as an administrative action
4. Return to normal retry logic if the job fails again

IF an administrator discards a dead-letter job, THE system SHALL:
1. Archive the job data for compliance purposes
2. Remove the job from the dead-letter queue
3. Record the discard action with administrator identity
4. Update any dependent processes accordingly

### Failure Notification

WHEN a job fails and requires notification, THE system SHALL:
1. Determine the appropriate recipient based on job type
2. Include job identifier and failure details in the notification
3. Send notification through the configured channel
4. Record the notification delivery status

IF a critical job fails (payment processing, order creation), THE system SHALL:
1. Immediately notify the operations team
2. Escalate to senior administrators if unacknowledged
3. Provide direct access to job recovery tools
4. Continue retry attempts while notifications are sent

IF a non-critical job fails (report generation, analytics), THE system SHALL:
1. Notify the responsible team during business hours
2. Aggregate multiple failures into a single notification
3. Provide summary of affected jobs and impact assessment
4. Allow batch recovery actions from the notification

WHEN a job successfully recovers after failure, THE system SHALL:
1. Notify relevant stakeholders of the recovery
2. Include the number of retry attempts made
3. Provide link to job execution details
4. Clear any pending alerts related to the job

IF a notification fails to deliver, THE system SHALL:
1. Queue the notification for retry
2. Use alternative notification channels if configured
3. Escalate to administrators if all channels fail
4. Log the notification failure for investigation

### Business Process Recovery

WHEN a payment processing job fails, THE system SHALL:
1. Preserve the transaction state for reconciliation
2. Notify the customer of the payment issue
3. Allow the customer to retry payment without re-ordering
4. Log the failure for financial audit purposes

IF a payment job exceeds maximum retries, THE system SHALL:
1. Mark the order as payment failed
2. Notify the customer to update payment method
3. Hold the order for a configurable period
4. Cancel the order automatically if payment is not received

WHEN an inventory update job fails, THE system SHALL:
1. Preserve the inventory change request
2. Block further inventory modifications for the affected variant
3. Notify the seller of the inventory discrepancy
4. Trigger manual inventory reconciliation process

IF a shipment notification job fails, THE system SHALL:
1. Retry delivery of tracking information
2. Mark the shipment as pending notification
3. Allow the customer to view tracking from the order page
4. Log the notification failure for carrier integration review

WHEN a review processing job fails, THE system SHALL:
1. Preserve the review content and rating
2. Queue the review for manual publication
3. Notify the customer that their review is pending
4. Display the review status in the customer account

### Cross-Job Recovery Coordination

WHEN a background job fails during order processing, THE system SHALL:
1. Maintain order consistency across all related entities
2. Prevent partial order state updates
3. Provide recovery options that preserve transaction integrity
4. Log all recovery actions for audit compliance

IF a job failure affects multiple customers, THE system SHALL:
1. Identify all affected customers and orders
2. Prioritize recovery based on business impact
3. Notify affected customers of the issue and resolution
4. Provide compensation options for significant delays

WHEN recovery requires manual intervention, THE system SHALL:
1. Create a ticket with complete failure context
2. Assign the ticket to the appropriate team
3. Track resolution time and success rate
4. Update the job configuration to prevent recurrence

IF a job failure indicates a systemic issue, THE system SHALL:
1. Analyze failure patterns across multiple jobs
2. Generate a report for technical review
3. Recommend configuration changes or code fixes
4. Track the implementation of preventive measures