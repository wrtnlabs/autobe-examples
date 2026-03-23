**ecommerceMall — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Customers and sellers register with unique email and password; email must be unique among active accounts. Registration requires email confirmation before accounts become active. Customers and sellers log in with their email and password; session expires after inactivity or explicit logout. Users can change their password at any time by verifying current credentials. Users can delete their account—customers are fully removed, while sellers remain traceable in preserved order records. Pending administrator or super administrator role requests can be cancelled. Users cannot be recovered after deletion, and account deletion is irreversible. Users may be suspended or banned by administrators for policy violations. Banned users lose access but their historical data remains intact for audit and legal purposes. When a user account is deleted, related profile data is removed, but preserved orders and snapshots are retained separately.

### User Registration

WHEN a customer or seller submits a registration request, THE system SHALL:
1. Require a unique email address not previously used by any active account
2. Require a password that meets security standards
3. Assign initial role based on registration type (customer or seller)
4. Store account in pending email confirmation state
5. Generate and send a confirmation link to the provided email address

IF the email address is already associated with an active account, THE system SHALL reject the request.
IF the email format is invalid, THE system SHALL reject the request.
IF the password does not meet security standards, THE system SHALL reject the request.

### Email Confirmation

WHEN an unconfirmed user clicks the email confirmation link, THE system SHALL:
1. Verify the confirmation token is valid and not expired
2. Mark the user account as confirmed
3. Activate the account for login access

IF the confirmation token is invalid or expired, THE system SHALL reject the confirmation request.
IF the account has already been confirmed or deleted, THE system SHALL reject the confirmation request.

### Login Flow

WHEN a user submits login credentials, THE system SHALL:
1. Verify the email and password match a confirmed account
2. Create a new session if credentials are valid
3. Record the login timestamp

IF credentials are invalid, THE system SHALL reject the login attempt.
IF the account is suspended or banned, THE system SHALL reject the login attempt.
IF the account requires email confirmation but is not confirmed, THE system SHALL reject the login attempt.

### Password Change

WHEN a logged-in user requests a password change, THE system SHALL:
1. Require verification of current password before accepting new password
2. Validate the new password meets security standards
3. Update the password and invalidate all existing sessions

IF the current password is incorrect, THE system SHALL reject the request.
IF the new password does not meet security standards, THE system SHALL reject the request.
IF the user is suspended or banned, THE system SHALL reject the request.

### Account Deletion

WHEN a user requests account deletion, THE system SHALL:
1. For customers: remove all user data including profile, addresses, and associated entities
2. For sellers: remove profile and account data but preserve order records, product snapshots, and other historical data
3. Revoke all active sessions
4. Prevent future login with those credentials

IF the seller account has pending orders, pending cancellations, or pending refund requests, THE system SHALL reject the deletion request.
IF the account is suspended or banned, THE system SHALL still allow deletion but preserve historical data.

### Account Suspension

WHEN an administrator suspends a user account, THE system SHALL:
1. Mark the account as suspended
2. Immediately terminate all active sessions
3. Prevent login attempts for that account
4. For sellers: hide products from search and category listings while maintaining order processing capability

Suspension preserves all user data and does not trigger account deletion procedures.
Suspension does not affect historical data integrity.

### User Banning

WHEN a user is banned by an administrator, THE system SHALL:
1. Mark the account as banned
2. Immediately terminate all active sessions
3. Prevent login attempts for that account
4. Preserve all historical data including orders, products, and snapshots for audit purposes

Banning is a permanent restriction but does not delete user data.
Historical data remains accessible to administrators and is preserved for legal compliance.

### Irreversible Deletion

THE system SHALL ensure account deletion is irreversible—deleted accounts cannot be recovered by any means.

Deleted user accounts do not participate in system operations.
Any reference to deleted users in historical records shall display as "deleted user".

Once an account is deleted, all associated data (except preserved historical records) is permanently removed from the system.

### Profile Removal

WHEN an account is deleted, THE system SHALL:
1. Remove the user account record and all related profiles (customer or seller)
2. Preserve order records, product snapshots, and other historical data separately
3. Update references to deleted users in shared records (e.g., reviews show as "deleted user")

Profile removal applies only to active profiles—historical snapshots of profiles remain intact in order and review records.

### Role-Based Access

THE system SHALL enforce role-based access control where:
- Customers can access customer-specific features (orders, wishlist, cart, reviews)
- Sellers can access seller-specific features (products, inventory, order items)
- Administrators can access administrative features based on grade (regular or super administrator)

Role assignment is immutable until explicitly changed through the administrator request process.
Banned or suspended users lose access to role-specific functionality but retain data integrity.

## CustomerProfile Operations

Each customer must have a profile created automatically upon account registration. The profile includes required display name and phone number, both editable at any time. Customers can view their own profile but cannot view other customers’ profiles. Deletion of a customer account also deletes the profile, preserving only anonymized references (e.g., 'deleted user') in reviews. Editing display name or phone number updates the profile directly with no snapshot required. Profile data is used to populate shipping address fields and order confirmation communications. Customers can update their profile even if they have no orders yet. Profile updates must be consistent across all downstream records that reference the user.

### Profile Creation

WHEN a customer registers, THE system SHALL automatically create a CustomerProfile with the provided display name and phone number.

THE system SHALL link the new profile to the customer account via userId.

A profile MUST be created before the account can be considered fully active.

IF registration data is incomplete (missing display name or phone number), THE system SHALL reject registration.

### Display Name Editing

WHEN a customer edits their display name, THE system SHALL update the display name in their profile.

THE system SHALL allow display name changes at any time.

THE system SHALL update the display name used in all downstream records (addresses, orders, reviews) to maintain consistency.

IF the display name is empty after editing, THE system SHALL reject the change.

### Phone Number Update

WHEN a customer updates their phone number, THE system SHALL update the phone number in their profile.

THE system SHALL allow phone number updates at any time.

THE system SHALL update the phone number used in all downstream records (addresses, orders) to maintain consistency.

IF the phone number format is invalid (e.g., does not match E.164 or local standards), THE system SHALL reject the update.

### Profile Deletion

WHEN a customer deletes their account, THE system SHALL delete their CustomerProfile.

THE system SHALL preserve anonymized references (e.g., 'deleted user') in existing reviews after profile deletion.

Profile deletion MUST NOT affect order history or inventory records.

Profile deletion MUST NOT affect snapshots (e.g., review snapshots, order item snapshots) that reference the profile's user ID.

### Customer Visibility

A customer SHALL be able to view only their own profile.

A customer SHALL NOT be able to view other customers' profiles.

Sellers SHALL NOT be able to view customer profiles.

Administrators SHALL NOT be able to view customer profiles directly (unless through audit or legal holds, handled separately).

### Profile Consistency

WHEN a customer's display name or phone number is updated, THE system SHALL ensure the new value is reflected in all associated records (addresses, orders, reviews).

IF a customer has no addresses, their profile phone number SHALL be used to prefill shipping address fields during checkout.

WHEN an order is placed, THE system SHALL copy the profile display name and phone number to the order and address records to preserve the exact values at time of purchase.

Profile data changes after order placement MUST NOT retroactively affect historical order data.

## SellerProfile Operations

Sellers must create a profile after registration and before selling, including required shop name, optional shop description, and optional logo image. Every edit to shop name, description, or logo creates an immutable snapshot for audit and dispute resolution. Sellers can view their own profile at any time, and customers can view published seller profiles. Profile data is preserved in order history even after account deletion or shop name change. Sellers can only delete their profile after deleting all products and meeting account deletion criteria. Profile changes do not affect historical snapshots in orders. Seller profiles are shown on product detail pages and order confirmations.

### Seller Profile Creation

WHEN a seller completes registration, THE system SHALL:
1. Automatically create a seller profile linked to their account
2. Require a unique shop name
3. Accept an optional shop description
4. Accept an optional logo image URL
5. Set initial approval status to 'pending'

THE system SHALL NOT allow a seller to list products until their profile approval status is 'approved'.

WHEN a seller profile is created, THE system SHALL:
1. Store the initial shop name, shop description, and logo URL
2. Record the creation timestamp
3. Link the profile to the seller's user account
4. Begin inventory of profile change snapshots

### Shop Name Setup

WHEN a seller sets or changes their shop name, THE system SHALL:
1. Require a non-empty shop name
2. Ensure the shop name is unique across all approved sellers
3. Reject the change if the shop name is already in use by another approved seller
4. Record a profile snapshot before applying the change

THE system SHALL prevent shop name changes while the seller account is suspended.

WHEN a shop name change is rejected due to duplication, THE system SHALL:
1. Return an error indicating the shop name is already in use
2. Preserve the existing shop name unchanged

### Profile Editing Workflow

WHEN a seller edits their profile (shop name, description, or logo), THE system SHALL:
1. Create a new profile snapshot containing all current profile data before applying changes
2. Record the timestamp, editor ID, and change reason in the snapshot
3. Apply the updated profile data
4. Update the updatedAt timestamp

THE system SHALL require at least one of shop name, shop description, or logo to be provided when editing.

WHILE a seller profile is being edited, THE system SHALL:
1. Preserve the previous profile state in an immutable snapshot
2. Allow continuous editing until submission is confirmed
3. Prevent concurrent edits from overwriting each other

### Logo Upload

WHEN a seller uploads or updates their logo, THE system SHALL:
1. Accept a valid image file in JPEG, PNG, or WebP format
2. Ensure the file size does not exceed 2MB
3. Store the image URL in the seller profile
4. Record a profile snapshot before applying the change

THE system SHALL reject the upload if the file exceeds the size limit.

THE system SHALL set the first uploaded logo as the profile logo automatically.

WHEN a logo is deleted, THE system SHALL:
1. Remove the logo URL from the seller profile
2. Record a profile snapshot documenting the deletion
3. Allow the seller to set a new logo or leave the field empty

### Profile Snapshot Creation

WHEN a seller profile is created, edited, or used in an order transaction, THE system SHALL:
1. Create a profile snapshot with all current field values (shop name, description, logo)
2. Record the exact timestamp of the snapshot
3. Store the snapshot as immutable and non-deletable
4. Include a snapshot type indicator ('create', 'edit', 'order', 'refund', 'cancel')

THE system SHALL preserve profile snapshots indefinitely, even after seller account deletion.

WHEN a profile is referenced in an order, THE system SHALL:
1. Capture a snapshot of the seller profile at the time of order placement
2. Link the snapshot to the order item for historical accuracy
3. Preserve the shop name and logo as they appeared during the transaction

### Profile Visibility

WHEN a customer views a seller profile, THE system SHALL:
1. Display the current shop name, shop description, and logo
2. Show the approval status (pending, approved, or rejected) only to the seller
3. Omit sensitive fields (e.g., user account details) from public view

WHEN a product is displayed, THE system SHALL:
1. Link the product to the seller's shop name at the time of product creation
2. Allow customers to navigate from the product to the seller's profile
3. Show the shop name as it appeared in the product snapshot (not current profile state)

THE system SHALL allow sellers and administrators to view profile edit history and snapshots.

WHEN a seller profile is suspended, THE system SHALL:
1. Continue displaying the public profile information as last approved
2. Prevent new products or profile edits
3. Allow access to order management functionality

### Profile Deletion

WHEN a seller attempts to delete their account, THE system SHALL:
1. Verify the seller has no pending orders (paid or shipped status)
2. Verify there are no pending cancellation or refund requests
3. Delete the seller profile data (shop name, description, logo)
4. Preserve all profile snapshots for audit and dispute resolution

THE system SHALL NOT allow profile deletion if:
1. There are active orders with items awaiting shipment
2. There are pending cancellation or refund requests
3. The account has not been fully suspended first (if previously suspended)

WHEN a seller profile is deleted, THE system SHALL:
1. Archive the seller's products as unsellable (hidden from search/catalog)
2. Preserve all historical product and order snapshots
3. Ensure past orders continue to reference the correct profile snapshot
4. Update the seller's user role to 'customer' if no other seller associations remain

### Seller-Account Linkage

WHEN a seller account is created, THE system SHALL:
1. Link the seller profile to the user account with role 'seller'
2. Ensure only one seller profile exists per user account
3. Require explicit seller registration (separate from customer registration)
4. Initiate the approval workflow

THE system SHALL prevent a user from creating both a customer and seller account with the same email address.

WHEN a seller account is deleted, THE system SHALL:
1. Remove the seller role from the user account
2. Preserve the seller profile snapshots for historical reference
3. Allow the user to maintain a customer account if applicable
4. Update all historical references to use preserved snapshots

### Historical Profile Preservation

WHEN a seller's profile is edited, THE system SHALL:
1. Create an immutable snapshot preserving the previous state
2. Store timestamps, snapshot type, and editor information
3. Maintain a history of all profile changes for audit purposes

THE system SHALL preserve seller profile snapshots for:
1. Dispute resolution between customers and sellers
2. Historical order accuracy (product pages, order confirmations)
3. Legal and regulatory compliance requirements
4. Administrative oversight and investigations

WHEN a seller account is deleted or suspended, THE system SHALL:
1. Retain all profile snapshots permanently
2. Ensure historical order items reference the correct profile snapshot
3. Prevent any changes to historical snapshots
4. Preserve shop names and logos as they appeared during transactions

## Address Operations

Customers can add multiple shipping addresses with required fields: recipient name, phone number, street address, city, state/province, postal code, and country. Each customer may set one address as the default for expedited checkout. Addresses are owned by the customer and can be edited or deleted by that customer only. Address edits do not affect past orders; historical addresses are preserved with each order snapshot. Customers can view all their saved addresses at any time. When an address is deleted, it does not automatically update previously associated orders. Deleted addresses remain visible in order history for reference. Duplicate addresses (same content) are allowed.

### Address Creation

WHEN a customer adds a new address, THE system SHALL:
1. Require recipient name, phone number, street address, city, state/province, postal code, and country
2. Associate the address with the creating customer's account
3. Automatically set the first address as default if no default exists yet
4. Store the address for future use in checkout and order history

IF any required field is missing, THE system SHALL reject the request.
IF the phone number format is invalid, THE system SHALL reject the request.

### Default Address Selection

WHEN a customer sets an address as default, THE system SHALL:
1. Update the address to be the default shipping address
2. Replace the previous default address (if any) with non-default status
3. Reflect the change immediately in the customer's address list
4. Apply to future checkout sessions as the pre-selected option

WHERE a customer has no addresses, THE system SHALL NOT allow default selection.
WHERE the selected address is owned by a different customer, THE system SHALL reject the request.

### Address Editing

WHEN a customer edits an address, THE system SHALL:
1. Allow updates to all address fields (recipient name, phone, street, city, state, postal code, country)
2. Preserve the original address for any existing order associations
3. Update the current address used for future orders and checkout
4. Create a snapshot of the address before modification (for audit trail)

IF the updated phone number format is invalid, THE system SHALL reject the request.
IF the updated street address is empty, THE system SHALL reject the request.

### Address Deletion

WHEN a customer deletes an address, THE system SHALL:
1. Remove the address from the customer's active address list
2. Preserve the address record for historical orders that reference it
3. Update the default address field if the deleted address was the default
4. Automatically assign a new default address from remaining addresses if available

IF the address is the only address and is set as default, THE system SHALL prevent deletion.
IF the address is associated with any pending or shipped orders, THE system SHALL preserve it and prevent deletion.

### Address Listing

WHEN a customer views their address list, THE system SHALL:
1. Display all addresses associated with their account
2. Highlight the default shipping address
3. Show the most recently used address first in sorted lists
4. Allow access to edit and delete actions for each address

WHERE a customer has no addresses, THE system SHALL show an empty state.
WHERE addresses are associated with historical orders, THE system SHALL indicate that they cannot be deleted.

### Customer-Owned Addresses

ONLY the customer who created an address may view, edit, or delete it.

GUEST users and other customers SHALL NOT access addresses owned by another customer.

WHEN an administrator views a customer's address list, THE system SHALL allow viewing all addresses for account management purposes.

WHERE a customer account is deleted, THE system SHALL preserve addresses for existing order history but stop listing them in active profile.

### Historical Address Preservation

WHEN an order is placed, THE system SHALL:
1. Capture a snapshot of the shipping address as it existed at checkout time
2. Store the snapshot with the order record for future reference
3. Prevent changes to the address after order placement
4. Maintain the original address even if the customer edits or deletes it later

WHERE an address is edited after an order is placed, THE system SHALL preserve the order's original snapshot.
WHERE an address is deleted after an order is placed, THE system SHALL retain the snapshot within the order.

### Duplicate Address Support

WHEN a customer attempts to add an address that exactly matches an existing address, THE system SHALL:
1. Allow the duplicate address to be created (same content, separate record)
2. Store each instance as an independent address entry
3. Maintain separate default flags and deletion behaviors for each
4. Allow separate editing and deletion of each duplicate address

WHERE duplicate addresses exist, THE system SHALL NOT automatically merge or delete duplicates.
WHERE duplicate addresses exist, THE system SHALL allow customers to manage each independently.

## Category Operations

Categories are created, edited, and deleted only by administrators; sellers and customers cannot modify them. Each category has a name and description and may have one parent category (one nesting level only). Customers can view all categories and browse products within them, including subcategories. Deleting a category removes its products from category listings but does not delete the products themselves—they become uncategorized. Categories are shown in product detail pages, enabling navigation. Category names and descriptions are immutable after creation until edited by an admin. Categories cannot be nested more than one level deep. Each product must belong to exactly one category or be uncategorized.

### Category Creation

WHEN an administrator creates a category, THE system SHALL:
1. Require a unique name within its parent category scope
2. Require a description
3. Allow an optional parent category identifier
4. Enforce a maximum nesting depth of one level below root

IF the parent category exists but is not at root level, THE system SHALL reject the request.
IF the name is already used by a sibling category under the same parent, THE system SHALL reject the request.
IF nesting depth would exceed one level, THE system SHALL reject the request.

### Category Editing

WHEN an administrator edits a category, THE system SHALL:
1. Allow updating the name and description
2. Prevent changing the parent category
3. Enforce name uniqueness within the original parent scope

IF the updated name duplicates an existing sibling category, THE system SHALL reject the request.
IF editing would cause invalid nesting depth (e.g., moving beneath a non-root parent), THE system SHALL reject the request.

### Category Deletion

WHEN an administrator deletes a category, THE system SHALL:
1. Preserve all product records associated with the category
2. Set each associated product's category field to null (making them uncategorized)
3. Prevent deletion if the category has subcategories
4. Prevent deletion if there are pending orders referencing products in the category

IF the category has one or more subcategories, THE system SHALL reject the request.
IF any product in the category has a pending order item (paid or shipped status), THE system SHALL reject the request.

### Uncategorized Product Handling

WHEN a product has no assigned category, THE system SHALL:
1. Include it in general search results
2. Exclude it from category-specific browse views
3. Display it as 'uncategorized' in administrative lists
4. Allow administrators to reassign it to a valid category

IF a seller attempts to create a product without selecting a category, THE system SHALL reject the request.
IF a product is moved to uncategorized due to parent category deletion, its visibility in product listings remains unchanged.

### Category Browsing

WHEN a customer browses categories, THE system SHALL:
1. Return a flat list of root categories
2. Return nested subcategories when a root category is selected
3. Display category hierarchy depth of at most one level below root

WHILE a customer views a category page, THE system SHALL:
1. Include products assigned to that category
2. Include products assigned to its direct subcategories
3. Exclude products in deeper nesting levels

IF a category has no products directly or via subcategories, THE system SHALL still allow viewing but show no items.

### Category Editing Snapshot

WHEN an administrator edits a category, THE system SHALL:
1. Create a category snapshot with the previous name and description
2. Include timestamp of the edit and administrator who made it
3. Preserve the snapshot immutably and never delete it

WHERE category snapshots exist, THE system SHALL allow administrators to view the full edit history including:
- Name before and after
- Description before and after
- Edit timestamp and editor

### One-Level Nesting Enforcement

WHILE creating or editing a category, THE system SHALL:
1. Verify that the parent category is either null (root) or has a null parent
2. Reject any operation that would create a grandchild category (depth > 1)
3. Prevent reassignment of a category to a child of itself (direct or indirect)

IF a category with subcategories is moved under another category, THE system SHALL reject the operation.
IF a category's parent has a non-null parent, THE system SHALL reject the operation.

### Category-Product Linkage

WHEN a seller creates or edits a product, THE system SHALL:
1. Require a valid category assignment (null is not allowed)
2. Allow assignment to any active category (including root-level and subcategories)
3. Prevent assignment to a deleted or suspended category

WHEN a category is deleted, THE system SHALL:
1. Set all associated products' category reference to null
2. Retain product content (name, description, variants, etc.)
3. Mark those products as uncategorized in listings

IF a product’s assigned category is deleted before the product, THE system SHALL preserve the product record without cascade deletion.

## Product Operations

Sellers create products with required fields: name, description, category, and base price. Products belong to the seller who created them and cannot be transferred. Sellers can edit their own products at any time, with each edit creating a full product snapshot. Deleting a product removes all its variants and inventory records, but only if no pending orders or requests exist for any variant. Deleted products are hidden from search and category listings. Sellers can view all their products, and customers can browse and view active products. Products must have at least one variant to be purchasable; products with no variants appear as unavailable. Product visibility depends on seller account status—suspended sellers' products are hidden.

### Product Creation

### Product Creation

WHEN a seller creates a product, THE system SHALL:
1. Require a name
2. Require a description
3. Require a category (including subcategory)
4. Require a base price
5. Associate the product with the creating seller
6. Set product visibility to active by default

WHEN a product is created, THE system SHALL assign a unique identifier.

WHEN a product has no variants, THE system SHALL mark it as unavailable.

IF the seller account is suspended, THE system SHALL reject product creation.

IF the category does not exist or is invalid, THE system SHALL reject the request.

IF the base price is negative or zero, THE system SHALL reject the request.


### Product Editing

### Product Editing

WHEN a seller edits a product, THE system SHALL:
1. Update the product with the new values
2. Automatically create a full product snapshot
3. Preserve all existing variants while including them in the snapshot
4. Update modification timestamp

WHEN a product image is reordered or replaced during editing, THE system SHALL include the image changes in the product snapshot.

WHEN a product is edited, THE system SHALL create corresponding product-snapshot variants capturing all variant states at that moment.

WHEN a product is edited while owned by a suspended seller, THE system SHALL reject the edit.

WHEN a product is edited, THE system SHALL create a snapshot even if only one field changes.


### Product Deletion

### Product Deletion

WHEN a seller deletes a product, THE system SHALL:
1. Verify there are no pending order items (paid or shipped status) for any variant
2. Verify there are no pending cancellation or refund requests for any variant
3. Delete all variants and associated inventory records
4. Hide the product from search and category listings
5. Preserve all product snapshots for audit purposes

WHEN a product with pending orders is attempted for deletion, THE system SHALL reject the request and preserve the product.

WHEN a product is deleted, THE system SHALL automatically remove it from all customer wishlists.

WHEN a seller attempts to delete a product while suspended, THE system SHALL reject the deletion.


### Product Ownership

### Product Ownership

WHEN a product is created, THE system SHALL associate it exclusively with the creating seller.

WHEN a product is accessed, THE system SHALL ensure only the associated seller can edit or delete it.

WHEN a product’s seller account is deleted, THE system SHALL delete the product unless order history exists.

WHEN a product is accessed, THE system SHALL display the seller’s shop name as the product’s seller.

THE system SHALL NOT allow transfer of product ownership between sellers.


### Product Snapshot

### Product Snapshot

WHEN a product is edited, THE system SHALL create a product snapshot with:
1. Current product name, description, and base price
2. All product images at that moment (including ordering and main image)
3. All variants at that moment
4. Timestamp of the edit
5. Reference to the original product

WHEN a product is purchased, THE system SHALL create a product snapshot as part of the order item preservation.

WHEN a product is deleted, THE system SHALL preserve all existing snapshots.

WHEN a product snapshot is created, THE system SHALL include snapshots of all variants in product-snapshot-variant records.

WHEN a seller or administrator views a product snapshot, THE system SHALL display the complete state as captured at edit or purchase time.


### Product Availability

### Product Availability

WHEN a product has at least one variant with stock quantity greater than zero, THE system SHALL mark it as available.

WHEN all variants of a product have zero stock quantity, THE system SHALL mark the product as out of stock.

WHEN a product has no variants, THE system SHALL mark it as unavailable.

WHEN a product’s seller account is suspended, THE system SHALL hide the product from search and category listings.

WHEN a customer views a product detail page for an out-of-stock or unavailable product, THE system SHALL display appropriate availability status.

WHEN a customer attempts to add an unavailable variant to the cart, THE system SHALL prevent the action.


### Variant Dependency

### Variant Dependency

WHEN a product has no variants, THE system SHALL prevent the product from being purchased.

WHEN the last remaining variant of a product is deleted, THE system SHALL mark the product as unavailable.

WHEN all variants of a product are deleted, THE system SHALL delete the product unless order history exists.

WHEN a product is created, THE system SHALL require at least one variant before marking it as purchasable.

WHEN a seller creates a variant, THE system SHALL enforce SKU uniqueness across all products.


### Seller Product Management

### Seller Product Management

WHEN a seller creates, edits, or deletes a product, THE system SHALL maintain ownership linkage.

WHEN a seller views their products, THE system SHALL show all products they own regardless of status.

WHEN a seller views a product, THE system SHALL show its snapshot history.

WHEN a seller attempts to edit or delete a product owned by another seller, THE system SHALL reject the request.

WHEN a seller views product inventory, THE system SHALL show stock quantities per variant and inventory history.


## ProductImage Operations

Sellers can upload multiple images per product and reorder them to set the main (thumbnail) image first. Images are immutable once uploaded—only deletion or reordering is allowed. Each image has an order index and a direct URL; no two images share the same index per product. Deleting an image updates the remaining order indices automatically. Image changes are included in product snapshots—preserving the full image set and order at time of sale. Customers see product thumbnails based on the main image. Image deletion does not affect past snapshots or order history. Sellers can view all their product images at any time.

### Product Image Upload

WHEN a seller uploads a product image, THE system SHALL:
1. Accept image files via secure upload
2. Assign a unique URL to each uploaded image
3. Validate file type and size limits defined in system policy
4. Record the upload timestamp and associate the image with the product
5. Set the initial sort order to the next available index for that product

IF the image file exceeds the maximum allowed size, THE system SHALL reject the upload.
IF the seller does not own the product, THE system SHALL reject the upload.
IF the maximum number of images per product is reached, THE system SHALL reject the upload.

### Image Reordering

WHEN a seller reorders product images, THE system SHALL:
1. Update the sort index for each affected image
2. Ensure all images for the product maintain a contiguous sequence starting at 1
3. Recalculate indices automatically without requiring manual adjustment of every item
4. Preserve the association of each image with its product

WHILE a seller is reordering images, THE system SHALL:
- Prevent concurrent edits to the image order for that product to avoid race conditions

IF an image is deleted during a reordering operation, THE system SHALL apply the deletion and update remaining indices after the reorder completes.

### Main Image Selection

WHEN a seller designates an image as the main image, THE system SHALL:
1. Mark the selected image with isMain = true
2. Automatically unset isMain = false on all other images for the same product
3. Update the product's main thumbnail reference to point to the selected image URL
4. Ensure exactly one image per product has isMain = true at all times

WHEN no main image exists for a product, THE system SHALL:
- Treat the first image (lowest sort order) as the main image for display purposes

WHEN the main image is deleted, THE system SHALL:
- Promote the image with the next lowest sort order to become the new main image

### Product Image Deletion

WHEN a seller deletes a product image, THE system SHALL:
1. Remove the image from active use in product listings and detail pages
2. Recalculate sort indices for remaining images to maintain a contiguous sequence starting at 1
3. If the deleted image was the main image, promote the next image in sort order to become main
4. Preserve the image record in system storage for potential audit or snapshot reconstruction

WHILE an image is referenced in any existing snapshot or order item, THE system SHALL:
- Keep the image data in storage even after deletion from the product

IF a seller attempts to delete the last remaining image, THE system SHALL:
- Reject the deletion to ensure at least one image remains for product display

### Image Indexing

THE system SHALL:
1. Store each image's sort index as an integer >= 1
2. Enforce uniqueness of sort indices within a single product (no duplicate indices)
3. Maintain images in ascending sort order for display
4. Provide API access to images sorted by index for frontend rendering

WHEN images are reordered, THE system SHALL:
- Automatically reindex remaining images to eliminate gaps or duplicates

WHERE image indexing is used for ordering, THE system SHALL:
- Use the index as the primary sort key, with creation time as secondary tiebreaker

### Image Inclusion in Snapshots

WHEN a product snapshot is created (e.g., at edit time or order placement), THE system SHALL:
1. Capture all images associated with the product at that moment
2. Preserve each image's URL, sort index, and isMain flag in the snapshot
3. Store images as an immutable part of the product snapshot

WHEN a product is edited, THE system SHALL:
- Create a product snapshot that includes the current state of all images before the edit

WHEN a product is deleted, THE system SHALL:
- Retain all product snapshots, including their associated images, for historical accuracy

THE system SHALL NOT delete image files referenced by any existing product snapshot.

### Thumbnail Generation

WHEN a product detail page is loaded, THE system SHALL:
1. Retrieve and display the main image as the primary thumbnail
2. Show all other images in a gallery sorted by their sort index
3. Load thumbnails at optimized sizes appropriate for the display context

WHEN search results or category listings are displayed, THE system SHALL:
- Show only the main (first) image as the thumbnail for each product

WHERE thumbnail generation is performed, THE system SHALL:
- Use image processing to create optimized versions without modifying the original stored image
- Ensure thumbnail aspect ratios preserve visual integrity of the main image

### Seller Image Management Workflow

WHEN a seller accesses their product image management interface, THE system SHALL:
1. Display all images for their product in current sort order
2. Clearly indicate which image is currently marked as main
3. Provide visual cues for drag-and-drop reordering
4. Show upload progress and success/failure status for image operations

WHEN a seller uploads, reorders, or deletes images, THE system SHALL:
- Reflect changes in real-time in the management interface
- Update preview images immediately after changes are saved

WHEN a seller deletes their seller profile, THE system SHALL:
- Preserve all product images in existing snapshots and order history
- Remove active references to images from product listings
- Allow administrative access to images for historical review

## ProductVariant Operations

Sellers add variants to products to represent different option combinations (e.g., color/size), each with unique SKU code, option values, optional price override, and required stock quantity. Every edit to a variant creates a product-snapshot-variant snapshot, preserving state at time of sale. Deleting a variant is allowed only if no pending orders or requests exist for it. A product must have at least one variant to be purchasable; otherwise it shows as unavailable. Customers select variants when adding to cart or viewing product details. Variant prices may differ from base price. Out-of-stock variants cannot be added to cart. Sellers can view and manage all variants of their products.

### Variant Creation

### Variant Creation

WHEN a seller creates a product variant, THE system SHALL:
1. Require a unique SKU code
2. Require option values in JSON format (e.g., `{"color": "Red", "size": "Large"}`)
3. Require a stock quantity of zero or greater
4. Allow an optional price override
5. Associate the variant with its parent product and seller

WHEN a variant is created, THE system SHALL:
1. Initialize inventory history with a zero-balance record
2. Store all variant data including current stock quantity
3. Mark the variant as available unless stock is zero

IF the SKU code is not unique, THE system SHALL reject the creation request.
IF the option values are invalid JSON or malformed, THE system SHALL reject the creation request.
IF the stock quantity is negative, THE system SHALL reject the creation request.
IF the product has no existing variants, THE system SHALL ensure the new variant is marked as available for sale.


### SKU Uniqueness

### SKU Uniqueness

THE system SHALL enforce SKU uniqueness within the entire platform.
WHEN a seller attempts to create or edit a variant, THE system SHALL verify the SKU code is not already in use.
IF the SKU code is already assigned to another variant, THE system SHALL reject the request with an error.
SKU uniqueness applies regardless of product or seller ownership.
SKU codes are immutable and cannot be changed after initial creation.

THE system SHALL maintain a SKU index to support efficient uniqueness validation.


### Option Values

### Option Values

WHEN a seller creates or edits a product variant, THE system SHALL accept option values as a JSON object.
Option values SHALL represent all selectable attributes for that variant (e.g., color, size, material).
Option values MUST be structured consistently across all variants of the same product.
Option values are used to display variant selections to customers.
Option values are preserved in product snapshots to ensure accurate historical representation.

IF option values are malformed or contain unsupported data types, THE system SHALL reject the request.


### Price Override

### Price Override

WHEN a seller creates or edits a product variant, THE system SHALL allow an optional price override.
If no price override is provided, THE system SHALL use the product's base price.
If a price override is provided, THE system SHALL use the override instead of the base price.
Price overrides are displayed to customers during product browsing.
Price overrides are preserved in product snapshots to ensure accurate historical pricing.

IF a price override is provided but is negative, THE system SHALL reject the request.
IF a price override is provided but exceeds maximum price threshold, THE system SHALL reject the request.


### Stock Quantity

### Stock Quantity

WHEN a seller creates a product variant, THE system SHALL initialize stock quantity to zero or greater.
WHEN a seller edits a variant, THE system SHALL allow stock quantity adjustment.
WHEN stock quantity reaches zero, THE system SHALL mark the variant as out of stock.

WHEN an order is placed for a variant, THE system SHALL:
1. Decrease the variant's stock quantity by the purchased amount
2. Create an inventory record with negative quantity change
3. Verify sufficient stock before completing the order

WHEN an order is cancelled or refunded, THE system SHALL:
1. Increase the variant's stock quantity by the returned amount
2. Create an inventory record with positive quantity change

WHEN a seller performs manual inventory adjustment, THE system SHALL:
1. Accept positive (restock) or negative (loss/adjustment) changes
2. Require a reason for the adjustment
3. Record the adjustment as an inventory record

IF stock quantity would become negative during order placement, THE system SHALL reject the order.


### Variant Editing

### Variant Editing

WHEN a seller edits a product variant, THE system SHALL:
1. Permit editing of option values, SKU code, price override, and stock quantity
2. Create a product-snapshot-variant entry preserving the previous state
3. Update the current variant record with new values
4. Maintain the variant's association with its parent product and seller

WHEN editing a variant with SKU changes, THE system SHALL validate the new SKU is unique.
WHEN editing a variant with stock quantity changes, THE system SHALL ensure stock remains non-negative.
WHEN editing a variant with price override changes, THE system SHALL validate the new price is non-negative.

WHEN a variant is part of an order with status "paid" or "shipped", THE system SHALL:
1. Permit stock quantity adjustments
2. Reject other edits that would affect historical order integrity
3. Log the attempted edit for audit purposes

WHEN a customer views a product with variants, THE system SHALL display only the current state of variants.


### Variant Deletion

### Variant Deletion

WHEN a seller attempts to delete a product variant, THE system SHALL:
1. Verify no order items exist for the variant with status "paid" or "shipped"
2. Verify no pending cancellation requests exist for the variant
3. Verify no pending refund requests exist for the variant
4. Delete the variant and all associated inventory records
5. Update the product's availability status if this was the last variant

IF any of these conditions are not met, THE system SHALL reject the deletion request.
IF deletion succeeds, THE system SHALL:
1. Remove the variant from all listings and search results
2. Mark the variant as deleted in internal tracking
3. Preserve variant snapshot history for order reconstruction

WHEN a product has no variants remaining, THE system SHALL:
1. Mark the product as "unavailable"
2. Hide the product from search and category browsing
3. Preserve the product record and its history for archival purposes


### Variant Visibility

### Variant Visibility

WHEN a customer views a product page, THE system SHALL display:
1. All currently active variants of the product
2. Each variant's option values, price, and stock status
3. Which variant is selected by default

WHEN a customer views a product list (search results, category view), THE system SHALL:
1. Display the base price or price range based on active variants
2. Indicate if a product has variants available for purchase
3. Show out-of-stock indicators where applicable

WHEN a product is set to "unavailable" (no active variants), THE system SHALL:
1. Exclude it from search results
2. Exclude it from category browsing
3. Allow direct access if the product URL is known
4. Display clear availability status to visitors

WHEN a seller views their product management dashboard, THE system SHALL:
1. Show all variants including out-of-stock variants
2. Display variant status indicators
3. Allow filtering by availability status


### Out-of-Stock Handling

### Out-of-Stock Handling

WHEN a variant's stock quantity reaches zero, THE system SHALL:
1. Mark the variant as "out of stock"
2. Display an out-of-stock indicator to customers
3. Prevent customers from adding the variant to their cart
4. Block checkout for any cart items containing this variant

WHEN a customer attempts to add an out-of-stock variant to their cart, THE system SHALL:
1. Reject the request with an appropriate error message
2. Display the current stock availability status
3. Suggest alternative variants if available

WHEN stock is restored (through restocking or order cancellation), THE system SHALL:
1. Update the variant's stock quantity and availability status
2. Allow the variant to be added to carts again
3. Update cart warnings for items containing this variant

WHEN an order includes an out-of-stock variant that becomes unavailable during checkout, THE system SHALL:
1. Remove the unavailable variant from the cart
2. Adjust the cart total accordingly
3. Notify the customer of the change


## ProductSnapshot Operations

Product snapshots are created automatically whenever a product is edited, preserving full state including name, description, category, base price, and images. Each snapshot captures the complete variant list and variant details as of the edit time. Sellers can view snapshots of their own products, and administrators can view any product snapshot. Snapshots cannot be deleted or modified—only created. Snapshots are used for dispute resolution, order history, and audit trails. When a product is deleted, its snapshots remain accessible. Customers see historical product details via order-item snapshots, not live edits. Snapshots ensure immutability for financial and legal records.

### Automatic Snapshot Creation on Product Edit

WHEN a seller edits a product, THE system SHALL automatically create a new product snapshot.

WHEN a product snapshot is created during an edit, THE system SHALL:
1. Preserve the product's name, description, category, base price, and image list at the time of edit
2. Include a snapshot of each variant at that moment (product-snapshot → product-snapshot-SKU)
3. Record the exact timestamp of the edit
4. Link the snapshot to the original product and seller profile

WHEN a seller creates a product, THE system SHALL create an initial product snapshot with status "draft"

WHERE a product is published, THE system SHALL create an additional product snapshot reflecting the published state

IF a product edit fails validation, THE system SHALL NOT create a snapshot

WHEN a product is deleted, THE system SHALL preserve all existing snapshots of that product

WHEN a product snapshot is created, THE system SHALL NOT allow subsequent modification to the snapshot data

WHEN a product snapshot is created, THE system SHALL preserve the complete variant snapshot structure (SKU, option values, price override)

WHEN a product snapshot is created, THE system SHALL include the seller's shop name and logo as they existed at the time of snapshot

WHEN a product snapshot is created, THE system SHALL store the category name as it existed at the time of snapshot

WHEN a product snapshot is created, THE system SHALL assign a unique snapshot identifier for future reference

WHEN a product snapshot is created, THE system SHALL record which user initiated the edit

WHEN a product snapshot is created, THE system SHALL store all image URLs and their sort order as of the snapshot time

WHEN a product is edited multiple times, THE system SHALL create a new snapshot for each edit, preserving the full edit history

WHEN a product snapshot is created, THE system SHALL capture the exact stock quantity of each variant as it existed at the time of snapshot

WHEN a product snapshot is created, THE system SHALL store the complete JSON representation of variant option values as they existed at the time of snapshot

WHEN a product is published, THE system SHALL create a snapshot with snapshotType "publish"

WHEN a product is unpublished, THE system SHALL create a snapshot with snapshotType "unpublish"

## ProductSnapshotVariant Operations

ProductSnapshotVariant records capture each variant’s state at the time of a product edit, including SKU code, option values, and price. These are created only as part of a ProductSnapshot and are never standalone. Every variant-level change results in a new snapshot-variant record. They are used to reconstruct the exact product and variant configuration at time of purchase. Sellers and administrators can view snapshot variants alongside the main snapshot. No direct user action modifies these—updates occur only via product edits. Snapshots preserve variant IDs, not live variant IDs, for accurate linking. Snapshot variants do not affect current inventory or availability.

### Variant-Level Snapshot Creation

WHEN a product is edited, THE system SHALL automatically create a ProductSnapshot record that includes one ProductSnapshotVariant record for each variant at that time.

WHEN a product with variants is purchased, THE system SHALL automatically create a ProductSnapshot record with all its variant states captured in ProductSnapshotVariant records.

THE system SHALL NOT allow creation of standalone ProductSnapshotVariant records outside of a ProductSnapshot context.

IF no variants exist on the source product, THE system SHALL create no ProductSnapshotVariant records.

### Immutable Variant State

WHEN a ProductSnapshotVariant record is created, THE system SHALL ensure its data is immutable—no updates or deletions allowed after creation.

THE system SHALL preserve ProductSnapshotVariant data exactly as captured, including all field values at snapshot time.

WHEN the source product or variant is deleted, THE system SHALL NOT delete associated ProductSnapshotVariant records.

WHEN the source product or variant is modified, THE system SHALL create a new ProductSnapshotVariant record rather than update existing ones.

### SKU Capture

WHEN a product edit occurs, THE system SHALL capture the exact SKU code of each variant in the corresponding ProductSnapshotVariant record.

THE system SHALL preserve the SKU code as it existed at snapshot time, regardless of subsequent changes to the live variant.

IF the source variant is deleted, THE system SHALL retain the SKU code in the ProductSnapshotVariant record for audit purposes.

THE system SHALL NOT reuse SKU codes in future ProductSnapshotVariant records that were previously assigned.

### Option Values at Snapshot

WHEN a product edit occurs, THE system SHALL capture the complete option values JSON for each variant in the corresponding ProductSnapshotVariant record.

THE system SHALL preserve option values exactly as defined at snapshot time, including all key-value pairs.

IF a variant’s option values are modified, THE system SHALL create a new ProductSnapshotVariant record rather than updating existing ones.

WHEN reconstructing a product variant at any future time, THE system SHALL use the option values from the ProductSnapshotVariant record.

### Price Preservation

WHEN a product edit occurs, THE system SHALL capture the priceOverride value for each variant in the corresponding ProductSnapshotVariant record, even if null.

THE system SHALL preserve the priceOverride value exactly as it existed at snapshot time.

WHEN reconstructing a variant’s price, THE system SHALL use the priceOverride value from the ProductSnapshotVariant record.

IF a variant’s priceOverride is updated, THE system SHALL create a new ProductSnapshotVariant record rather than updating existing ones.

### Snapshot Linkage

WHEN a ProductSnapshotVariant record is created, THE system SHALL link it to its parent ProductSnapshot using the snapshotId foreign key.

THE system SHALL ensure every ProductSnapshotVariant record references an existing ProductSnapshot record.

IF a ProductSnapshot is deleted, THE system SHALL NOT delete its associated ProductSnapshotVariant records.

THE system SHALL maintain referential integrity between ProductSnapshotVariant records and their parent ProductSnapshot.

### Audit Completeness

WHEN a product is edited, THE system SHALL ensure every variant present at that time has a corresponding ProductSnapshotVariant record in the new ProductSnapshot.

THE system SHALL NOT omit any variant from the snapshot, regardless of stock quantity or status.

WHEN reconstructing a product’s full state at any point in time, THE system SHALL include all ProductSnapshotVariant records linked to the snapshot.

THE system SHALL include creation timestamps for each ProductSnapshotVariant record for audit trail completeness.

### Variant Reconstruction

WHEN a historical product view is requested, THE system SHALL reconstruct the variant configuration using ProductSnapshotVariant records.

WHEN an order item is created from a purchased product, THE system SHALL link it to the ProductSnapshotVariant record that represents that variant at purchase time.

THE system SHALL use ProductSnapshotVariant records to display historical pricing, options, and SKU codes in dispute resolution contexts.

IF a customer views a past order, THE system SHALL show variant details exactly as preserved in the ProductSnapshotVariant record.

## InventoryRecord Operations

Inventory records track stock quantity changes for each variant with positive values for restocking or adjustments, and negative for orders, cancellations, or refunds. Sellers can manually add restock or adjustment records with a reason (e.g., restock, adjustment, loss). Order placement automatically deducts stock; cancellations and refunds restore it. Inventory records are immutable and never deleted—stock is calculated by summing all records. Sellers can view full inventory history per variant, but cannot edit past records. Stock reach zero when the cumulative sum hits zero, marking the variant out of stock. Out-of-stock variants block future cart additions. Records are timestamped for auditability.

### Manual Restock Operations

WHEN a seller restocks inventory, THE system SHALL:
1. Accept the variant ID, quantity, and reason
2. Record a positive inventory record with the specified quantity and reason "restock"
3. Update the current stock by adding the quantity to the running sum
4. Require the quantity to be a positive integer

IF the quantity is zero or negative, THE system SHALL reject the request.
IF the variant does not exist, THE system SHALL reject the request.
IF the seller does not own the variant's product, THE system SHALL reject the request.

### Manual Inventory Adjustment

WHEN a seller performs an inventory adjustment, THE system SHALL:
1. Accept the variant ID, quantity, and reason
2. Record an inventory record with the specified quantity and reason "adjustment" or "loss"
3. Update the current stock by applying the quantity to the running sum
4. Require the quantity to be a non-zero integer

IF the quantity is zero, THE system SHALL reject the request.
IF the reason is not "adjustment" or "loss", THE system SHALL reject the request.
IF the variant does not exist, THE system SHALL reject the request.
IF the seller does not own the variant's product, THE system SHALL reject the request.

WHILE a variant's stock reaches zero, THE system SHALL:
- Mark the variant as "out of stock"
- Prevent customers from adding it to cart
- Display "out of stock" status to customers

### Order Stock Deduction

WHEN an order is successfully placed, THE system SHALL:
1. Create negative inventory records for each purchased variant
2. Deduct the purchased quantity from the variant's stock
3. Use reason "order" and reference the order ID
4. Ensure the stock remains at zero or above

IF any variant has insufficient stock for the order quantity, THE system SHALL reject the order.
IF an inventory record cannot be created, THE system SHALL rollback the order.

THE system SHALL NOT allow stock to go negative through automated deductions.

### Refund Stock Restoration

WHEN an order item is cancelled, THE system SHALL:
1. Create a positive inventory record for the cancelled variant
2. Restore the cancelled quantity to the variant's stock
3. Use reason "cancel" and reference the order ID
4. Update the current stock by adding the quantity

WHEN an order item is refunded, THE system SHALL:
1. Create a positive inventory record for the refunded variant
2. Restore the refunded quantity to the variant's stock
3. Use reason "refund" and reference the order ID
4. Update the current stock by adding the quantity

IF a cancellation or refund creates insufficient stock data, THE system SHALL reject the action.
IF the inventory record cannot be created, THE system SHALL rollback the cancellation/refund.

### Inventory History Display

WHEN a seller views inventory history, THE system SHALL:
1. List all inventory records for the selected variant
2. Sort records by timestamp (newest first)
3. Show quantity change, reason, reference ID, and timestamp for each record
4. Display the current stock (calculated as sum of all records)
5. Show historical stock levels after each record

WHERE a seller requests inventory history, THE system SHALL:
- Require the seller to own the product containing the variant
- Include all restock, order, adjustment, cancel, and refund records
- Preserve record immutability after creation

THE system SHALL NOT allow editing or deletion of inventory records.

### Stock Calculation

WHEN calculating current stock, THE system SHALL:
1. Sum all inventory record quantities for the variant
2. Start from zero as the initial stock
3. Process records chronologically to maintain running total
4. Return the final sum as current stock

WHERE stock reaches zero, THE system SHALL:
- Set the variant's stock quantity to zero
- Mark the variant as "out of stock"
- Block new cart additions for that variant

WHERE stock is below zero, THE system SHALL:
- Log an inventory inconsistency alert
- Require manual intervention to correct records
- Prevent further transactions until resolved

IF an inventory record is added, THE system SHALL immediately recalculate and update current stock.

### Zero-Stock Blocking

WHEN a variant's stock is at zero, THE system SHALL:
1. Display "out of stock" status on product listing pages
2. Display "out of stock" status on product detail pages
3. Block customers from adding the variant to cart
4. Show a warning if the variant is already in cart

WHERE a variant is already in cart when it goes out of stock, THE system SHALL:
- Mark the cart item as unavailable
- Show a warning during checkout validation
- Block checkout of the out-of-stock item

IF a seller restocks an out-of-stock variant, THE system SHALL:
- Remove the "out of stock" status
- Re-enable cart additions
- Remove availability warnings for existing cart items

## CartItem Operations

Customers add specific variants to their cart with a quantity of at least one; same variant in cart merges quantity instead of duplicating lines. Cart items show product name, variant options, unit price, quantity, and subtotal. Customers can view, update quantity, or remove items from cart at any time. Cart warns if stock is less than requested quantity. Items become unavailable if the variant is deleted or out of stock. Unavailable items cannot be checked out. Cart persists until purchase, order placement, or cart clear. Customers can see total cart value in real time. Cart state is private to each customer and never shared.

### variant addition

WHEN a customer adds a specific product variant to their cart, THE system SHALL:
1. Require a valid product variant ID
2. Require a quantity of at least one
3. Check if the same variant already exists in the cart
4. IF the variant exists, THE system SHALL merge quantities (not create a duplicate line)
5. IF the variant does not exist, THE system SHALL create a new cart item
6. Store the product variant's current unit price at addition time
7. Calculate and display the subtotal for the item (price × quantity)
8. Calculate and display the updated cart total in real time

### availability warning

WHEN a customer attempts to add a variant with insufficient stock, THE system SHALL:
1. Show a warning that the requested quantity exceeds available stock
2. Limit the maximum quantity that can be added to the available stock
3. Show the current available stock in the warning message
4. Allow the customer to proceed with the maximum available quantity or reduce their request

### quantity editing

WHEN a customer edits the quantity of an existing cart item, THE system SHALL:
1. Validate the new quantity is at least one
2. Check if the requested quantity exceeds available stock
3. IF stock is insufficient, THE system SHALL show an availability warning
4. Update the item's subtotal based on the new quantity
5. Recalculate and display the updated cart total in real time
6. Allow quantity reduction even when stock becomes insufficient after cart addition

### cart removal

WHEN a customer removes an item from the cart, THE system SHALL:
1. Remove the cart item entirely
2. Recalculate the cart total immediately
3. Show the updated cart total in real time
4. IF the cart becomes empty, THE system SHALL preserve the cart state until next activity or expiration

### cart visibility

WHEN a customer views their cart, THE system SHALL:
1. Show all cart items with product name, variant options, unit price, quantity, and subtotal
2. Display the cart total prominently
3. Show real-time stock status for each item
4. Mark items as unavailable if the variant is deleted or out of stock
5. Show appropriate warnings for items with insufficient stock

### out-of-stock blocking

WHEN a customer attempts to add an out-of-stock variant (stock = 0), THE system SHALL:
1. Reject the addition request
2. Show an out-of-stock error message
3. Indicate that the variant is unavailable for purchase

### cart privacy

THE system SHALL maintain cart privacy by ensuring:
1. Cart items are only visible to the owning customer
2. Cart items are never shared between customer accounts
3. Cart state is isolated per customer session and persisted until purchase or explicit clear
4. Cart items from suspended sellers are hidden from view but preserved in cart for recovery if unsuspension occurs

### checkout validation

WHEN a customer proceeds to checkout, THE system SHALL:
1. Validate that all cart items are available for purchase
2. Reject checkout IF any item is out of stock or the variant is deleted
3. Display unavailable items separately with clear reasons
4. Allow checkout only for available items in the cart

## WishlistItem Operations

Customers add products (not variants) to their wishlist for later purchase; each product appears once per customer. Wishlist is paginated and customers can view it at any time. Customers can remove wishlist items manually or they are auto-removed if the product is deleted by the seller. Wishlist items do not affect inventory or pricing. Editing a product does not affect wishlist entries. Customers can reorder items in their wishlist (not explicitly stated, but logical inclusion). Wishlist items are private and never shared. Wishlist is separate from cart and does not stock-allocate items.

### Product Wishlist Addition

WHEN a customer adds a product to their wishlist, THE system SHALL:
1. Accept only one wishlist item per product per customer (no duplicates)
2. Require a valid product that exists and is not a draft
3. Associate the wishlist item with the currently logged-in customer
4. Record the creation timestamp

IF the product is already in the customer’s wishlist, THE system SHALL reject the request with a duplicate item error.
IF the product has been deleted by the seller, THE system SHALL reject the request with a product not found error.

### Wishlist View and Pagination

WHEN a customer views their wishlist, THE system SHALL:
1. Return wishlist items in reverse chronological order (newest first)
2. Paginate results with a default page size of 12 items
3. Show each product with its main image, name, base price, and seller shop name
4. Indicate out-of-stock status for products whose variants are unavailable

WHERE pagination is requested, THE system SHALL accept page number and page size parameters and return total count and current page information.

### Wishlist Privacy

THE system SHALL ensure that wishlist items are private to the owning customer only.

WHERE a customer requests their wishlist, THE system SHALL return only items belonging to that customer.

WHERE an administrator or seller attempts to access another customer’s wishlist, THE system SHALL deny access and return an authorization error.

### Automatic Removal on Product Deletion

WHEN a seller deletes a product, THE system SHALL:
1. Identify all wishlist items referencing that product across all customers
2. Automatically remove those wishlist items
3. Preserve no snapshot (as this is a data cleanup, not a business transaction)

WHERE automatic removal occurs, THE system SHALL not require user intervention or notification.

### Wishlist Item Removal

WHEN a customer removes a product from their wishlist, THE system SHALL:
1. Delete only the wishlist item, not the product or any order history
2. Return a success confirmation
3. Not affect the product’s availability, inventory, or other customer wishlists

IF the wishlist item does not exist or does not belong to the customer, THE system SHALL reject the request.

### Inventory Independence

THE system SHALL NOT allocate or reserve inventory for wishlist items.

WHEN a customer adds a product to their wishlist, THE system SHALL NOT reduce stock quantities.

WHERE stock for a product variant becomes insufficient, THE system SHALL show an out-of-stock warning when the customer views the wishlist, but THE system SHALL NOT block wishlist access.

### Wishlist-Cart Separation

THE system SHALL treat wishlist items as separate from cart items.

WHERE a customer selects a product from their wishlist to add to cart, THE system SHALL create a new cart item with selected variant and quantity, independent of wishlist.

WHERE a product is removed from wishlist, THE system SHALL NOT affect existing cart items referencing that product.

### Wishlist Visibility Updates

WHEN a product’s status changes (e.g., becomes unavailable due to deletion, seller suspension, or stock exhaustion), THE system SHALL:
1. Preserve the wishlist item record
2. Show the product with appropriate status indicators (e.g., ‘Product no longer available’)
3. Prevent purchase actions for unavailable products from the wishlist

WHERE a seller is suspended, THE system SHALL keep suspended seller products in the wishlist but mark them as unavailable.

## Order Operations

Orders are created when payment succeeds after checkout; they cannot be created manually or edited post-creation. Each order contains one or more items from potentially multiple sellers, with a shipping address selected from saved addresses. Customers can view their own orders (paginated, newest first) and each order’s full details including items and shipments. Shipping address cannot be changed after order placement. Order status is derived from its items and cannot be edited directly—only via item status changes. Administrators can force-cancel or force-refund orders. Orders are immutable once placed and associated with order snapshots. Deleted users remain linked to orders by reference (not full data).

### Order Operations

### Order Creation

WHEN a customer completes checkout and payment succeeds, THE system SHALL create an order.

WHEN payment processing fails, THE system SHALL NOT create an order.

WHEN an order is created, THE system SHALL:
1. Lock the shipping address as it was at checkout time
2. Create one order item per unique product variant in the cart
3. Decrease stock quantities for each purchased variant via inventory records
4. Clear the customer's cart of items included in the order
5. Generate a unique order number
6. Record the timestamp of order creation

WHILE an order is being created, THE system SHALL:
- Prevent concurrent checkout attempts for the same cart items
- Preserve the exact product, variant, and seller state at checkout time

### Checkout Flow

WHEN a customer initiates checkout from their cart, THE system SHALL:
1. Validate that all cart items are available for purchase
2. Present a summary of items, total price, and shipping address options
3. Allow the customer to select or confirm their shipping address

IF a cart item is deleted, out of stock, or suspended from the seller, THE system SHALL mark it as unavailable and prevent checkout.

IF the cart contains items from multiple sellers, THE system SHALL group them for separate shipment creation by seller.

### Payment Confirmation

WHEN a customer confirms checkout and payment is processed, THE system SHALL:
1. Wait for external payment gateway confirmation
2. Only create the order if payment succeeds
3. Roll back all reservation-like state if payment fails

WHEN payment fails, THE system SHALL:
- Preserve cart contents
- Provide clear feedback of failure reason
- Allow customer to retry payment or remove items

### Order Immutability

WHEN an order is created, THE system SHALL:
- Make the order immutable (no edits to items, pricing, or shipping address)
- Preserve snapshots of each product, variant, and seller profile as of purchase time

WHILE an order exists, THE system SHALL:
- Prevent any direct updates to order items, shipping address, or pricing
- Maintain immutable reference to product and seller state at time of purchase

### Order Status Derivation

THE system SHALL derive the overall order status from its order items:

1. If all items are paid → order status is "paid"
2. If any item is shipped (and none delivered yet) → order status is "shipped"
3. If all items are delivered → order status is "delivered"
4. If all items are cancelled → order status is "cancelled"
5. If all items are refunded → order status is "refunded"
6. If items are in mixed statuses → order status is "partiallyCompleted"

WHEN an item status changes, THE system SHALL automatically update the order status.

### Order Editing Restrictions

IF a customer attempts to edit an order after placement, THE system SHALL reject the request.

IF a seller attempts to edit an order item after placement, THE system SHALL reject the request.

WHERE an edit would affect the order, THE system SHALL:
- Allow cancellation requests for paid items
- Allow refund requests for delivered items
- Reject all other edit attempts

### Admin Override

WHEN an administrator force-cancels an order or item, THE system SHALL:
1. Cancel the affected item(s)
2. Restore stock quantities for cancelled items
3. Generate a refund if payment was collected
4. Update the order status accordingly

WHEN an administrator force-refunds an order or item, THE system SHALL:
1. Mark the item(s) as refunded
2. Restore stock quantities for refunded items
3. Update the order status accordingly

### Order History

WHEN a customer views their order history, THE system SHALL:
1. List all orders created by that customer
2. Show paginated results sorted by newest first
3. Display: order number, date, total price, and overall status

WHEN a customer views an order's full details, THE system SHALL:
1. Show all items with product name, variant options, quantity, price, and status
2. Show the shipping address as selected at checkout
3. Show all shipments with tracking information
4. Preserve historical product and seller data via snapshots

## OrderItem Operations

Each order item represents a purchased variant with its own status: paid, shipped, delivered, cancelled, or refunded. Order items are created only at order placement with snapshot data for product, variant, seller profile, and price. Customers and sellers can view their own order items; customers see items in their orders, sellers see items for their products. Each order item can be individually cancelled or refunded—partial fulfillment is supported. Sellers can ship items in shipments (grouped or individual). Status transitions are atomic and tracked. Order items are never edited—only status updated via workflows. Snapshot data ensures accurate history even after product edits.

### Order Item Creation

WHEN an order is successfully placed, THE system SHALL create one or more order items, each representing a purchased variant with its quantity.

THE system SHALL populate each order item with snapshot data at purchase time, including: product name, description, variant options, price, seller shop name, and seller logo.

THE system SHALL assign the initial status 'paid' to all order items upon successful payment.

WHERE an order contains items from multiple sellers, THE system SHALL create separate order items for each seller's items.

WHILE an order item exists, THE system SHALL NOT allow editing of its core data (product, variant, price, quantity) — only status changes are permitted via defined workflows.

### Item Status Transitions

WHEN the system advances an order item status, THE following transitions SHALL apply:

- 'paid' → 'shipped' (on shipment creation by seller)
- 'shipped' → 'delivered' (on customer shipment confirmation or 14-day delivery timeout)
- 'paid' or 'shipped' → 'cancelled' (on approved cancellation request)
- 'delivered' → 'refunded' (on approved refund request)

WHERE an order item is already 'cancelled' or 'refunded', THE system SHALL NOT allow further status changes.

WHEN multiple items in an order have different statuses, THE system SHALL derive the overall order status according to mixed-state rules.

IF an order item has status 'delivered', THE system SHALL prevent status reversion to 'shipped' or 'paid'.

### Item Cancellation

WHEN a customer requests cancellation of an order item with status 'paid', THE system SHALL create a cancellation request with status 'pending'.

THE system SHALL require a reason text for cancellation requests.

WHEN the seller responds (approve/reject), THE system SHALL update the cancellation request status and create a snapshot of the request in its state at that time.

IF approved, THE system SHALL update the order item status to 'cancelled' and restore the variant's stock quantity via an inventory record.

IF all items in an order are cancelled, THE system SHALL update the overall order status to 'cancelled'.

### Item Refund

WHEN a customer requests a refund for an order item with status 'delivered', THE system SHALL create a refund request with status 'pending'.

THE system SHALL require a reason text for refund requests.

THE system SHALL reject refund requests submitted more than 7 days after the item was delivered.

WHEN the seller responds (approve/reject), THE system SHALL update the refund request status and create a snapshot of the request in its state at that time.

IF approved, THE system SHALL update the order item status to 'refunded' and restore the variant's stock quantity via an inventory record.

IF all items in an order are refunded, THE system SHALL update the overall order status to 'refunded'.

### Shipment Linkage and Item Status

WHEN a shipment is created for one or more order items from the same seller, THE system SHALL:

- Link each selected order item to the shipment via shipment items
- Update the status of those items to 'shipped'
- Record carrier name and tracking number for the shipment

WHERE seller groups multiple items into one shipment, THE system SHALL ensure all linked items transition to 'shipped' simultaneously.

WHEN a shipment is confirmed delivered (by customer or timeout), THE system SHALL update all associated items to 'delivered'.

IF an item is part of a shipment, THE system SHALL prevent direct status change bypassing the shipment flow.

### Seller Item View

WHERE a seller views order items, THE system SHALL show only items where that seller is the designated seller.

THE system SHALL allow sellers to filter order items by status (paid, shipped, delivered, cancelled, refunded).

THE system SHALL display the order item status in real-time and update immediately on status changes.

WHEN an order item is part of an active cancellation or refund request, THE system SHALL indicate pending status for that item.

WHERE a seller attempts to edit a product associated with an existing 'paid' or 'shipped' order item, THE system SHALL block the edit to maintain snapshot consistency.

### Snapshot Linkage

THE system SHALL ensure that every order item maintains immutable snapshot linkage to the product, variant, and seller profile as they existed at the time of order placement.

THIS linkage SHALL persist even if the underlying product, variant, or seller profile is later edited or deleted.

WHERE snapshot data is included in an order item, THE system SHALL prevent any future modification to the captured values (name, description, options, price, shop name, etc.).

WHEN reviewing historical orders, THE system SHALL present snapshot-derived data exactly as recorded at purchase time.

### Partial Fulfillment

THE system SHALL support partial fulfillment, where:

- Different items in the same order can have different statuses
- An order with mixed item statuses (e.g., some delivered, some shipped) SHALL derive the overall order status from its items
- Cancellation or refund of individual items SHALL NOT affect unrelated items in the same order
- Shipping of some items SHALL NOT block shipping of others in the same order

IF all items in an order are cancelled or refunded, THE system SHALL set the overall order status accordingly and halt any further shipping actions.

### Item Status Immutability

THE system SHALL prevent direct editing of any order item data (product, variant, quantity, price, status) outside of defined workflows.

Status changes SHALL occur ONLY via explicit events: payment confirmation, shipment creation, customer delivery confirmation, approved cancellation, or approved refund.

Once an order item status is set, THE system SHALL NOT allow retroactive changes to the status value — all changes SHALL be append-only status progression or final-state assignment.

WHEN a snapshot of an order item is created (e.g., for dispute resolution), THE system SHALL treat the snapshot as immutable and append-only — no edits or deletions allowed.

## Shipment Operations

Sellers create shipments after payment, grouping one or more of their own order items per shipment. Each shipment has optional carrier name and tracking number, entered by the seller. All items in a shipment share the same status and tracking. Customers can view shipments linked to their orders and confirm delivery, triggering item status change to delivered. Automatic delivery confirmation occurs after 14 days if not manually confirmed. Shipments cannot span sellers—each shipment belongs to one seller. Shipment creation changes selected item statuses to shipped. Sellers can view all shipments they’ve created. No user can delete shipments—only status updates.

### Shipment Creation

WHEN a seller creates a shipment for an order, THE system SHALL:
1. Require selection of one or more of the seller’s own order items from that order
2. Ensure all selected items are from the same seller
3. Verify that selected items have status "paid" or "shipped"
4. Create a new shipment record linked to the order and seller
5. Associate each selected order item with the new shipment
6. Set the shipment status to "pending"

WHEN a seller attempts to create a shipment containing items from different sellers, THE system SHALL reject the request.

WHEN a seller attempts to create a shipment containing items already included in another shipment, THE system SHALL reject the request.

WHEN a seller attempts to create a shipment containing cancelled or refunded items, THE system SHALL reject the request.

WHEN a seller attempts to create a shipment containing delivered items, THE system SHALL reject the request.

### Tracking Input

WHEN a seller adds tracking information to a shipment, THE system SHALL:
1. Allow optional carrier name entry
2. Allow optional tracking number entry
3. Store the carrier name and tracking number as a pair
4. Validate the tracking number format if provided (e.g., alphanumeric, length constraints)

WHEN a seller updates tracking information for a shipment, THE system SHALL:
1. Allow partial updates (e.g., carrier name only, tracking number only)
2. Preserve existing non-updated fields
3. Accept empty values to clear the fields

WHEN tracking information is provided, THE system SHALL link it to the shipment and make it viewable to the customer.

### Seller Grouping

WHEN order items from multiple sellers exist in the same order, THE system SHALL:
1. Automatically partition items by seller for shipment processing
2. Require each shipment to include only items belonging to one seller
3. Prevent cross-seller shipment creation

WHEN a seller creates a shipment, THE system SHALL:
1. Only allow items from that seller’s order items to be selected
2. Block inclusion of items belonging to other sellers
3. Show only eligible items (paid, shipped, not already shipped) from the seller

WHERE multiple shipments are possible for one seller’s items in an order, THE system SHALL:
1. Allow seller to choose grouping (e.g., bundle all or split into multiple shipments)
2. Track each shipment independently with its own carrier and tracking details

### Carrier Tracking

WHEN a shipment is created, THE system SHALL:
1. Allow seller to optionally provide carrier name and tracking number
2. Store carrier and tracking information as optional shipment attributes
3. Store the information regardless of whether one or both fields are populated

WHEN a customer views an order, THE system SHALL:
1. Display each shipment with its carrier name and tracking number
2. Show empty values if tracking information is not yet provided
3. Indicate when tracking is pending (no carrier or tracking number entered)

WHERE a carrier provides delivery updates, THE system SHALL:
1. Allow seller to manually update tracking status if supported by external integration
2. Enable tracking links using carrier name and tracking number

### Delivery Confirmation

WHEN a customer confirms delivery for a shipment, THE system SHALL:
1. Update the status of all items in that shipment to "delivered"
2. Record the confirmation timestamp
3. Trigger the delivery event for each associated order item

WHEN a customer does not confirm delivery but the shipment status is "shipped" for 14 days, THE system SHALL:
1. Automatically set the shipment status to "delivered"
2. Update all items in the shipment to "delivered" status
3. Record the automatic confirmation timestamp

WHERE a customer partially receives items in a shipment, THE system SHALL:
1. Require confirmation per shipment, not per item
2. Apply the delivery status to all items in the shipment
3. Allow further refunds or disputes for individual items after delivery

WHEN a shipment has no items, THE system SHALL reject the delivery confirmation attempt.

### Automatic Delivery

WHEN a shipment remains in "shipped" status for 14 days without customer confirmation, THE system SHALL:
1. Automatically change the shipment status to "delivered"
2. Automatically change the status of all items in the shipment to "delivered"
3. Record the automatic delivery timestamp as the confirmation time

THE system SHALL allow manual delivery confirmation at any time after shipment creation, even before the 14-day window elapses.

THE system SHALL prevent delivery confirmation for shipments with status "pending" or after status "delivered".

### Multi-Item Shipment

WHEN a seller creates a shipment, THE system SHALL:
1. Allow inclusion of multiple items from the same seller’s order
2. Preserve item-level quantity in the shipment item mapping
3. Enable separate tracking for bundled or split shipments

WHERE a seller chooses to split a large order into multiple shipments, THE system SHALL:
1. Allow multiple shipments per seller per order
2. Track each shipment independently with its own status and tracking info
3. Allow item-level status progression across shipments (e.g., some items shipped, others still paid)

WHEN a customer views a shipment, THE system SHALL:
1. List all items included in that shipment
2. Show item quantities and associated product/variant details
3. Indicate which items are part of the same physical package

### Shipment Immutability

WHEN a shipment is created, THE system SHALL:
1. Lock the shipment’s item list (items cannot be added or removed after creation)
2. Prevent editing of the seller, order, or creation timestamp
3. Preserve shipment data even if related order items are cancelled or refunded

WHEN a shipment status changes (e.g., shipped, delivered), THE system SHALL:
1. Allow only status updates, not structural changes
2. Prevent any modification to the shipment’s original item list
3. Preserve the carrier and tracking information as recorded at time of update

WHERE a shipment contains items that are later refunded or cancelled, THE system SHALL:
1. Keep the shipment record intact
2. Preserve the shipment-to-item mapping at time of shipment
3. Not revert status changes made prior to item cancellation/refund

THE system SHALL not allow deletion of shipments under any circumstance.

## ShipmentItem Operations

ShipmentItem links an order item to a specific shipment, created automatically when a seller includes the item in a shipment. Each shipment item records the association and timestamp. Customers see which items are in each shipment when viewing tracking. ShipmentItem records are immutable and never edited or deleted. They enable precise mapping between shipments and order items. ShipmentItem data supports inventory restoration upon cancellation or refund by tracing back to original items. Sellers can view shipment item lists for their shipments. ShipmentItem links are part of the shipment snapshot and preserved indefinitely.

### Shipment-Item Association

WHEN a seller includes an order item in a shipment, THE system SHALL create a ShipmentItem record to establish the association.

### Temporal Association

WHEN a shipment is created, THE system SHALL set the creation timestamp on each associated ShipmentItem record.

### Immutable Mapping

THE system SHALL NOT allow direct editing of ShipmentItem records after creation.

### Shipment Trace Preservation

THE system SHALL NOT allow deletion of ShipmentItem records, even if the associated shipment or order item is later deleted.

### Tracking Linkage

WHEN a customer views shipment tracking, THE system SHALL display the list of order items included in that shipment via ShipmentItem associations.

### Inventory Traceability

WHEN an item is cancelled or refunded, THE system SHALL use the ShipmentItem record to trace back to the original order item and restore stock accordingly.

### Order-to-Shipment Mapping

IF an order item is associated with multiple shipments (e.g., partial shipping), THE system SHALL preserve separate ShipmentItem records for each shipment.

### Delivery Bundle Tracking

WHEN a shipment is created, THE system SHALL mark all ShipmentItems in that shipment as shipped together and update their status to reflect delivery status as a unit.

## CancellationRequest Operations

Customers can request cancellation for paid (not shipped) order items only, with a text reason. Each request links to the item, customer, and seller. Sellers can approve or reject the request—approval cancels the item and refunds stock; rejection keeps the order normal. Every response creates a snapshot of request state (status, reason, response). Cancellation restores stock via inventory record and changes item status to cancelled. Requesting customer can cancel their own request before seller responds. Multiple requests per item are not allowed; only one active request at a time. Sellers see pending requests in their dashboard. Requests do not affect other items in the same order.

### Cancellation Request Creation

WHEN a customer wants to cancel an order item, THE system SHALL:
1. Only allow cancellation for items with status "paid" (not yet shipped)
2. Require the customer to provide a text reason for cancellation
3. Create a cancellation request linked to the specific order item, customer, and seller
4. Ensure only one active cancellation request exists per order item at a time

IF the order item status is not "paid", THE system SHALL reject the request.
IF a customer already has an active cancellation request for the same item, THE system SHALL reject the new request.
WHERE no reason is provided, THE system SHALL reject the request.

### Request Viewing and Tracking

WHEN a customer views their cancellation requests, THE system SHALL:
1. Show all cancellation requests created by the customer
2. Display request status (pending, approved, rejected), reason, and timestamps
3. Show which order item the request pertains to

WHEN a seller views their pending cancellation requests, THE system SHALL:
1. Show all pending cancellation requests for their products
2. Display customer information, item details, and reason
3. Allow filtering by status (pending/approved/rejected)

WHERE multiple sellers exist in one order, THE system SHALL ensure sellers only see requests for their own items.

### Seller Approval Workflow

WHEN a seller responds to a pending cancellation request, THE system SHALL:
1. Allow approval or rejection of the request
2. Require a response reason (text) for rejection
3. Update the request status to "approved" or "rejected"
4. Create a request snapshot preserving the request state before the response

IF the request is approved, THE system SHALL automatically:
1. Change the order item status to "cancelled"
2. Restore stock for the variant (via inventory record)
3. Remove the item from the customer's cart if it was re-added
4. Recalculate the order status if all items are now cancelled

IF the request is rejected, THE system SHALL preserve the original item status and stock.

### Request Rejection Handling

WHEN a seller rejects a cancellation request, THE system SHALL:
1. Change the request status to "rejected"
2. Preserve the original order item status and stock quantity
3. Ensure the customer can request cancellation again for the same item (new request)
4. Log the rejection reason for audit purposes

WHERE the seller provides no rejection reason, THE system SHALL reject the action.

### Stock Restoration on Approval

WHEN a cancellation request is approved, THE system SHALL:
1. Create a negative inventory record with reason "cancel"
2. Restore the stock quantity for the variant by the cancelled item's quantity
3. Ensure the inventory history is traceable to the specific cancellation request

WHERE stock restoration fails due to system error, THE system SHALL rollback the approval and notify administrators.

### Item Cancellation Status Change

WHEN a cancellation request is approved, THE system SHALL:
1. Change the order item status to "cancelled"
2. Preserve the original item data in the order (product snapshot, variant snapshot, seller profile snapshot)
3. Update the order's overall status if all items are now cancelled

WHERE an item is already in "shipped" or "delivered" status, THE system SHALL prevent cancellation request creation.

### Pending Request Tracking

WHEN a seller accesses their dashboard, THE system SHALL:
1. Display the count of pending cancellation requests for their shop
2. Allow navigation to the full list of pending requests
3. Update the count in real-time as requests are approved or rejected

WHERE a seller suspends and then reactivates their account, THE system SHALL preserve pending cancellation request tracking.

### Request Isolation and Scope

WHEN a cancellation request is processed, THE system SHALL:
1. Only affect the specific order item, not other items in the same order
2. Preserve the status and fulfillment of all other order items
3. Ensure cancellation of all items in an order automatically updates the order status to "cancelled"

WHERE an order has multiple sellers, THE system SHALL ensure each seller processes their own cancellation requests independently.

## RefundRequest Operations

Customers can request refunds for delivered items within 7 days, including a text reason. Each request links to the item, customer, and seller. Sellers can approve or reject the request—approval refunds the item and restores stock via inventory record; rejection retains status. Every response creates a snapshot of request state (status, reason, response). Refunded items return to stock and change status to refunded. Only one active refund request per item is allowed. Customers see pending requests in their order history. Sellers see pending requests in their dashboard. Refunds apply only to the specific item—other items continue unaffected.

### Refund Request Creation

WHEN a customer requests a refund for a delivered order item, THE system SHALL:
1. Require the customer to select the specific order item
2. Require the customer to provide a text reason for the refund request
3. Verify that the item status is "delivered"
4. Verify that the item was delivered no more than 7 days ago

IF the item status is not "delivered", THE system SHALL reject the request.
IF the item was delivered more than 7 days ago, THE system SHALL reject the request.
IF a refund request for the same item is already pending, approved, or rejected, THE system SHALL reject the request.

### Refund Request Submission and Notification

WHEN a refund request is successfully submitted, THE system SHALL:
1. Create a refund request record with status "pending"
2. Assign the request to the seller of the item
3. Update the request status in the seller’s dashboard pending list
4. Update the request status in the customer’s order history view
5. Create a snapshot of the request state (status, reason, timestamps, IDs)

### Seller Refund Request Response

WHEN a seller responds to a pending refund request, THE system SHALL:
1. Allow the seller to approve or reject the request
2. Require the seller to provide a text response note (optional)
3. Update the request status to "approved" or "rejected"
4. Create a snapshot of the request state after the response

IF the request is approved, THE system SHALL:
1. Process an item refund for the specific order item
2. Restore the item’s stock quantity via a negative inventory adjustment record
3. Update the order item status to "refunded"

IF the request is rejected, THE system SHALL:
1. Leave the order item status unchanged
2. Record the seller’s rejection reason in the request snapshot

### Refund Request Status Tracking

THE system SHALL:
1. Display pending refund requests in the customer’s order item details view
2. Display pending refund requests in the seller’s dashboard summary
3. Update the overall order status when all items are refunded:
   - IF all items are refunded, THEN the order status becomes "refunded"
   - IF only some items are refunded, THEN the order status remains "partially completed"

WHILE a refund request is pending, THE system SHALL:
- Block status transitions for the associated order item beyond its current state

### Stock Restoration on Refund

WHEN a refund request is approved, THE system SHALL:
1. Create an inventory record with:
   - variantId of the refunded item
   - quantityChange = positive (restoration)
   - reason = "refund"
   - referenceId = the refund request ID
2. Recalculate the variant’s current stock quantity by summing all inventory records
3. Update the variant’s stock status (e.g., out-of-stock → in-stock)

WHERE a variant’s stock was increased via refund, THE system SHALL allow the variant to be purchased again

### Item Refund Processing

THE system SHALL:
1. Process item-level refunds only (not full order refunds)
2. Preserve the original item price and variant options at the time of refund via snapshot linkage
3. Ensure that other items in the same order continue their normal fulfillment process unaffected
4. Allow the customer to request additional refunds for other items in the same order

### Single Refund Request Limit

THE system SHALL:
1. Prevent creation of more than one refund request per order item
2. Allow only one active refund request per item (pending, approved, or rejected states)
3. Enforce this rule by checking existing refund requests for the same order item before processing a new request
4. Reject new refund requests with a clear business message when the limit is exceeded

### Refund Request Snapshot Creation

WHEN a refund request is created, edited, or approved/rejected, THE system SHALL:
1. Capture a full snapshot of the request at that moment
2. Include: request ID, order item ID, customer ID, seller ID, reason text, status (pending/approved/rejected), response note, timestamps
3. Ensure snapshots are immutable and permanently preserved
4. Allow the customer and seller to view the full request history via snapshot linkage
5. Allow administrators to view all request snapshots for dispute resolution

## Review Operations

Customers can write one review per product per order after the item status is delivered. Reviews include optional rating (1–5 stars) and optional text content. Reviews are visible on the product detail page, sorted newest first, and contribute to average rating. Customers can edit or delete their own reviews at any time—deletion preserves snapshot. Editing creates a review snapshot for audit. Reviews are linked to the product and order item. Reviews cannot be modified by others—only written by the customer. Deleted reviews are hidden but their snapshots remain accessible to administrators. Average rating excludes deleted reviews.

### Review Operations

### Post-Delivery Review Creation

WHEN a customer purchases a product variant and it reaches "delivered" status, THE system SHALL allow them to submit one review for that product in that order.

WHEN a customer attempts to submit a review before the item status is "delivered", THE system SHALL reject the request.

IF a review already exists for the same product and order, THE system SHALL reject the request with an error indicating the review was already submitted.

### One-Review-Per-Order Enforcement

WHERE a review exists for a specific product in an order, THE system SHALL prevent the same customer from submitting additional reviews for that product in that order.

WHILE a review exists for a product-order pair, THE system SHALL NOT allow new reviews from the same customer for that combination.

### Rating Entry

WHEN a customer submits a review, THE system SHALL require a rating value between 1 and 5 (inclusive).

IF the rating is less than 1 or greater than 5, THE system SHALL reject the request.

### Text Content

WHEN a customer submits a review, THE system SHALL accept optional text content.

WHERE text content is provided, THE system SHALL store it as part of the review.

WHERE no text content is provided, THE system SHALL still accept and store the review with only the rating.

### Review Editing

WHEN a customer edits their review, THE system SHALL update the text content and/or rating.

WHEN a review is edited, THE system SHALL create a review snapshot preserving the previous state.

WHILE a review has been deleted, THE system SHALL NOT allow re-editing or restoration.

### Review Deletion

WHEN a customer deletes their review, THE system SHALL hide the review from public display.

WHERE a review is deleted, THE system SHALL preserve all associated review snapshots indefinitely.

WHEN a review is deleted, THE system SHALL exclude it from average rating calculations.

### Average Rating Calculation

WHERE reviews exist for a product, THE system SHALL calculate average rating from all non-deleted reviews.

WHERE no reviews exist or all reviews are deleted, THE system SHALL report no rating.

IF a review is edited or deleted, THE system SHALL recalculate and update the average rating immediately.

### Review Deletion Protection

WHERE a review has been deleted, THE system SHALL NOT allow deletion again or re-creation of that same review.

WHERE a customer attempts to delete a review twice, THE system SHALL treat the second attempt as a no-op.

WHERE a review was previously deleted, THE system SHALL preserve its snapshot history for audit purposes.

WHERE a seller or administrator views review history, THE system SHALL include both active and deleted reviews with deletion indicator.

## ReviewSnapshot Operations

Review snapshots are created automatically whenever a review is edited, capturing rating and text content at that moment. Snapshots are immutable and stored separately from the live review. Sellers and administrators can view all review snapshots for dispute resolution or auditing. Customers can view only their own review snapshots. Snapshots are preserved even after review deletion. Snapshots support accurate history of rating and content changes. Live review and snapshots are linked via review ID. Review snapshots cannot be modified—only created.

### Review Edit Snapshot Creation

WHEN a customer edits a review, THE system SHALL:
1. Preserve the original rating and text content in a new review snapshot
2. Store the timestamp of the edit
3. Link the snapshot to the original review
4. Update the live review with new rating and/or text content

IF the rating is missing or invalid (not 1-5), THE system SHALL reject the request and retain the original review.

### Rating Preservation in Snapshots

THE system SHALL store the exact numeric rating value (1–5) at the time of each review edit in the review snapshot.

THE system SHALL NOT adjust, normalize, or recalculate rating values in snapshots.

THE system SHALL preserve fractional average ratings calculated from snapshots separately from the live average.

### Content History Retrieval

WHEN a seller or administrator views a review detail page, THE system SHALL:
1. Display the current live rating and text content
2. Provide a history view of all review snapshots
3. Show snapshot creation timestamp for each edit
4. Present the snapshot rating and text content alongside timestamps

WHERE snapshot content is identical across edits, THE system SHALL still display both to preserve edit history.

### Snapshot Immutability Guarantee

WHEN a review snapshot is created, THE system SHALL:
1. Mark the snapshot record as immutable
2. Prohibit any modification to the snapshot rating, text content, or timestamp
3. Prevent deletion of the snapshot

THE system SHALL reject all requests to update or delete review snapshots.

### Audit Access for Snapshots

WHEN an administrator views a product detail page, THE system SHALL:
1. Display all review snapshots for that product
2. Include seller and administrator access paths
3. Allow administrators to view every snapshot created for the product's reviews

GUESTS and regular customers SHALL NOT view review snapshots created by other customers.

### Dispute Resolution with Snapshots

WHEN a dispute arises about a review content, THE system SHALL:
1. Provide the exact snapshot contents at the time of user claim
2. Include timestamps of review creation and all edits
3. Preserve snapshot integrity for evidence purposes

WHERE a seller disputes a review rating change, THE system SHALL:
1. Show the original snapshot rating and the live rating
2. Display snapshot timestamps to establish chronological context

### Live-Snapshot Synchronization

WHEN a review is created, THE system SHALL:
1. Create an initial review snapshot to capture initial rating and content
2. Mark this snapshot as type "create"
3. Link it to the live review

WHEN a review is edited, THE system SHALL:
1. Create a new snapshot with type "edit"
2. Preserve the snapshot state before the edit
3. Update the live review with new values

### Review Deletion Handling

WHEN a customer deletes a review, THE system SHALL:
1. Preserve all review snapshots for that review
2. Mark the live review as deleted
3. Prevent further edits or snapshot creation
4. Allow sellers and administrators to view historical snapshot data

WHERE a review is referenced in an order, THE system SHALL:
1. Retain snapshot data for audit purposes
2. Prevent order-level snapshot detachment from review history

## AdminRequest Operations

Any user (customer or seller) can request to become an administrator by submitting a reason text. Requests start as pending and can only be processed by super administrators. Super administrators can approve or reject requests—rejection may include a reason. Approved users become regular administrators. Administrators can request promotion to super administrator, subject to existing super administrators. Rejected or demoted users can submit a new request later. Requests cannot be edited after submission but can be cancelled if pending. Super administrators can view all pending and past requests. Requests are preserved for audit and cannot be deleted.

### Admin Request Submission

WHEN any user (customer or seller) submits an administrator request, THE system SHALL:
1. Require a reason text
2. Store the request with status "pending"
3. Associate the request with the submitting user
4. Reject the request if the user already has an active request
5. Reject the request if the user already holds any administrator role

IF the reason text is missing or empty, THE system SHALL reject the request.
IF the user already has a pending request, THE system SHALL reject the new request.

### Pending Review

THE system SHALL allow super administrators to view all pending and past administrator requests.

THE system SHALL prevent regular administrators from viewing administrator requests.

WHEN a super administrator opens a pending request for review, THE system SHALL:
1. Display the requesting user's account status (active, banned, etc.)
2. Show the original request reason text
3. Display any previous rejection reason if applicable

### Super Admin Approval

WHEN a super administrator approves an admin request, THE system SHALL:
1. Set the request status to "approved"
2. Create an admin role entry with grade "regular" for the user
3. Record the approval timestamp and approver ID
4. Preserve the original request reason and approval notes as a snapshot

WHILE the request remains pending, THE system SHALL:
1. Prevent the user from having multiple active requests
2. Allow the user to view their own request status
3. Prevent the user from gaining administrator permissions

### Promotion Request

WHEN a regular administrator submits a promotion request to super administrator, THE system SHALL:
1. Treat it as a new admin request with status "pending"
2. Require a reason text
3. Apply the same approval process as initial administrator requests

WHEN a super administrator promotes a regular administrator, THE system SHALL:
1. Update the admin role entry to grade "super"
2. Record the promotion timestamp and approver ID
3. Preserve the previous grade as part of the immutable admin role history

THE system SHALL prevent a super administrator from promoting themselves.

### Request Rejection

WHEN a super administrator rejects an admin request, THE system SHALL:
1. Set the request status to "rejected"
2. Require a rejection reason text
3. Preserve the original request and rejection reason as a snapshot
4. Store the rejection timestamp and rejecting admin ID

WHEN a seller's request is rejected:
- The rejection reason SHALL be visible to the seller
- The seller MAY submit a new request with updated information

WHEN a customer's request is rejected:
- The rejection reason SHALL be visible to the customer
- The customer MAY submit a new request after a reasonable period

### Request Cancellation

WHEN a user with a pending request cancels their request, THE system SHALL:
1. Change the request status to "cancelled"
2. Preserve the request record and history for audit
3. Allow the user to submit a new request later

IF the request status is NOT "pending", THE system SHALL reject the cancellation request.

THE system SHALL prevent cancellation of a request after it has been approved or rejected.

### Audit Trail

THE system SHALL record the following events for every admin request:
1. Creation timestamp and submitting user ID
2. All status changes (pending, approved, rejected, cancelled)
3. Each approval or rejection with timestamp and approver ID
4. All reason text inputs and updates

WHEN an admin role is updated due to request approval or promotion, THE system SHALL:
1. Preserve the previous role state in the admin role snapshot
2. Record the exact time of change and authorizing admin
3. Link the role change to the source admin request ID

THE system SHALL preserve all admin request actions in an immutable audit log.

### Request Preservation

THE system SHALL preserve all admin requests indefinitely regardless of status.

THE system SHALL prevent deletion of admin requests, even when associated users are deleted.

WHEN a user account is deleted, THE system SHALL:
1. Preserve all admin requests submitted by that user
2. Maintain the user ID in the request record
3. Flag deleted user requests with a visibility indicator

THE system SHALL allow administrators to view all preserved admin requests for compliance and dispute resolution.

## AdminRole Operations

Admin roles are granted only after approval of an admin request, with grade set to regular or super based on request type. Super administrators can promote regular administrators to super or demote super administrators to regular—except themselves. Role changes create new AdminRole entries; old roles are preserved for audit. Admins can view their own role and grade at any time. Role determines permission level—super admins have full oversight, regular admins have limited powers (e.g., can’t promote). Role changes are timestamped and immutable. Role assignments cannot be revoked directly—only via demotion request. Suspended or banned users retain role records for audit. Role history supports security and accountability.

### AdminRole Assignment

WHEN a user's administrative request is approved by a super administrator, THE system SHALL create a new AdminRole entry with the user's ID, assigned grade (regular or super), and timestamp of assignment.

THE system SHALL require a formal AdminRequest record with status "approved" before creating an AdminRole.

IF a user already has an active AdminRole with the same grade, THE system SHALL reject the assignment to prevent duplicate entries.

WHERE a user's role is upgraded from regular to super administrator, THE system SHALL create a new AdminRole entry while preserving the previous role record for audit.

### Role Grade Specification

THE system SHALL assign one of two grades to each AdminRole: "regular" or "super".

Super administrators SHALL have full oversight capabilities including promoting other administrators to super grade.

Regular administrators SHALL have limited powers and SHALL NOT be able to promote others to any grade.

WHEN an administrator views their own role, THE system SHALL display both the grade and creation timestamp.

### Super Admin Promotion Workflow

WHEN a super administrator promotes a regular administrator to super grade, THE system SHALL create a new AdminRole entry with grade "super" and current timestamp.

THE system SHALL require explicit super administrator authentication for promotion requests.

IF the target user is not a regular administrator, THE system SHALL reject the promotion request.

Promoted administrators SHALL retain access to existing regular administrator capabilities.

### Role Demotion Process

WHEN a super administrator demotes a super administrator to regular grade, THE system SHALL create a new AdminRole entry with grade "regular" and current timestamp.

THE system SHALL prevent a super administrator from demoting themselves.

IF a regular administrator attempts to initiate demotion, THE system SHALL reject the request due to insufficient privilege.

Demoted administrators SHALL retain access to regular administrator capabilities only.

### Immutable Role History

WHEN an administrator's role changes, THE system SHALL preserve the previous AdminRole record without modification.

THE system SHALL not allow deletion, modification, or archival of any AdminRole record.

Each role change SHALL create a new entry with a unique timestamp while maintaining historical records.

WHEN an administrator's account is suspended or banned, THE system SHALL preserve all AdminRole records for audit purposes.

### Audit Access Control

WHEN an administrator requests their role history, THE system SHALL provide all past and current AdminRole entries for that user.

Super administrators SHALL have access to view the complete AdminRole history of any user.

Regular administrators SHALL have access only to their own role history.

THE system SHALL timestamp each AdminRole entry to support chronological audit trails.

### Permission Level Definition

THE system SHALL grant full platform oversight capabilities to administrators with grade "super".

Regular administrators SHALL have limited powers and SHALL NOT be able to modify administrator grades.

Super administrators SHALL have exclusive authority to promote or demote other administrators.

All permission-level actions SHALL be logged with the operator's AdminRole grade at time of action.

### Role Preservation Requirements

WHEN a seller account is deleted, THE system SHALL preserve their AdminRole record if it exists.

WHEN a customer account is deleted, THE system SHALL preserve their AdminRole record if it exists.

THE system SHALL retain AdminRole records indefinitely for compliance and security audits.

Role preservation SHALL be independent of account status (active, suspended, banned).

### Self-Demotion Prevention

THE system SHALL reject any demotion request where the super administrator attempts to demote themselves to regular grade.

WHEN a super administrator selects themselves as the demotion target, THE system SHALL display an error message.

This restriction SHALL apply only to demotion operations, not promotion or grade confirmation requests.

# Business Actions and Workflows

Business actions and workflows beyond basic CRUD.

## User Actions

Users register with email and password, verifying ownership through email confirmation. Authentication requires valid credentials; failed attempts are limited to prevent abuse. Users can change passwords after confirming their current one. Account deletion removes profile data but preserves order history and reviews. Users can request administrator status, requiring approval by super administrators. Suspended or banned users cannot log in, though their historical activities remain. Password recovery is initiated via email link with expiration. Registration requires unique, active email addresses. Users may update their role indirectly by upgrading from customer to seller or admin.

### registration workflow

WHEN a new user registers, THE system SHALL require a unique email address and a password.

IF the email is already in use, THE system SHALL reject the registration and indicate the email is taken.

WHEN registration succeeds, THE system SHALL create a user account with role 'customer' and set the initial account status to 'pending email verification'.

WHEN email verification is completed, THE system SHALL activate the user account for full platform access.

### email verification flow

WHEN a user initiates account creation, THE system SHALL send a verification email containing a time-limited token.

THE system SHALL invalidate the token after 24 hours or after first use.

WHEN a user clicks a valid verification link, THE system SHALL update the account status to 'active'.

IF the token is invalid or expired, THE system SHALL reject the verification request and prompt the user to request a new verification email.

### login authentication

WHEN a user submits login credentials, THE system SHALL validate the email and password against stored credentials.

WHEN authentication succeeds, THE system SHALL issue an authenticated session token.

WHEN authentication fails, THE system SHALL reject the attempt and increment the failure counter.

IF the failure count exceeds 5 attempts within 15 minutes, THE system SHALL temporarily lock the account for 30 minutes.

### password change process

WHEN an authenticated user requests a password change, THE system SHALL require the current password for verification.

THE system SHALL accept the new password only if it differs from the current one and meets complexity requirements.

WHEN the password is successfully changed, THE system SHALL invalidate all existing session tokens for that user.

IF the current password is incorrect, THE system SHALL reject the request.

### account deletion procedure

WHEN a user requests account deletion, THE system SHALL verify that no active orders or pending shipments exist under that user's account.

IF active orders exist, THE system SHALL reject the deletion and indicate the reason.

WHEN deletion proceeds, THE system SHALL remove the user profile and authentication data.

WHEN deletion completes, THE system SHALL preserve all order records, review history, and associated snapshots under the account for audit purposes.

A deleted customer account shall appear as 'deleted user' in reviews and order histories.

### admin request submission

WHEN an authenticated user submits an administrator request, THE system SHALL store the request with status 'pending'.

THE system SHALL require a non-empty reason text for the request.

SUPER administrators SHALL be able to view the pending requests list.

WHEN a SUPER administrator approves the request, THE system SHALL assign the user the 'admin' role with grade 'regular'.

IF the request is rejected, THE system SHALL store the rejection reason and allow the user to resubmit a new request.

### account suspension impact

WHEN an account is suspended, THE system SHALL block all login attempts for that account.

SUSPENDED sellers SHALL remain able to view existing orders and process shipment completion.

SUSPENDED sellers SHALL NOT be able to create, edit, or delete products.

WHEN an account is unsuspended, THE system SHALL restore normal access permissions.

All historical activities and snapshots for the suspended account SHALL remain intact and accessible to administrators.

### password recovery process

WHEN a user initiates password recovery, THE system SHALL send a time-limited recovery link to the registered email address.

THE recovery link SHALL expire after 1 hour.

WHEN the user clicks a valid link, THE system SHALL prompt for a new password.

WHEN the new password is submitted, THE system SHALL update the stored credentials and invalidate all active sessions.

IF the recovery link is expired or invalid, THE system SHALL prompt the user to request a new recovery link.

## CustomerProfile Actions

Customers view and edit their display name and phone number at any time. Editing these fields is immediate and does not affect orders already placed. The profile must always contain both fields, though phone number format is flexible per country. Profile changes do not create snapshots since they are non-transactional. Customers cannot share profile details across accounts. Profile edits are persisted per user and visible only to the owner unless shared in order contexts. Customers may not delete their profile without deleting their entire account.

### Profile Editing Workflow

WHEN a customer edits their display name, THE system SHALL update the CustomerProfile record and preserve the previous value for historical reference in order contexts.

WHEN a customer edits their phone number, THE system SHALL validate the format per international standard and update the CustomerProfile record.

WHEN both display name and phone number are present, THE system SHALL allow the profile update to proceed.

IF the display name is empty or consists only of whitespace, THE system SHALL reject the update with an error.

IF the phone number is missing, THE system SHALL reject the update with an error.

WHERE a customer has multiple orders, THE system SHALL ensure profile edits do not affect previously placed orders (historical order records retain the profile snapshot at time of purchase).

### Display Name Update

WHEN a customer updates their display name, THE system SHALL apply the change immediately to their active profile.

THE system SHALL enforce display name uniqueness only within the context of order history snapshots, not as a global constraint.

IF the customer attempts to set an empty display name, THE system SHALL reject the request and retain the existing value.

A customer may change their display name multiple times without restriction.

Display name updates do not require seller or administrator approval.

### Phone Number Modification

WHEN a customer updates their phone number, THE system SHALL validate the input against international format standards.

THE system SHALL accept flexible phone number formats (e.g., with or without country code, spaces, hyphens) as long as it is not empty.

IF the phone number fails format validation, THE system SHALL reject the request and retain the existing value.

Phone number updates do not affect previously placed orders where the profile was captured.

A customer may change their phone number multiple times without restriction.

### Profile Visibility Scope

THE system SHALL ensure profile visibility is limited to the profile owner unless the profile data is included in an order snapshot.

The display name and phone number in historical order contexts SHALL remain immutable and reflect the values at the time of purchase.

Profile edits do not propagate to existing orders, wishlists, reviews, or other shared contexts.

Profile data is never shared across different user accounts.

THE system SHALL NOT display profile information to other customers unless explicitly included in an order or review context.

### Account-Profile Linkage

WHEN a customer account is created, THE system SHALL automatically create a linked CustomerProfile record.

THE system SHALL ensure CustomerProfile and User entities share the same userId and remain in sync.

WHEN a customer deletes their account, THE system SHALL delete the CustomerProfile along with all associated Addresses.

Profile data cannot be modified or deleted independently of the user account.

THE system SHALL NOT allow profile duplication across multiple accounts.

## SellerProfile Actions

Sellers update their shop name, description, and logo through profile editing. Every edit creates a snapshot preserving the prior state for dispute resolution. Sellers can view their current and all historical shop profile snapshots. Shop name is required and must be unique. Logo uploads are validated for format and size before applying. Profile edits are immediate for viewing, but snapshots ensure auditability. Sellers cannot change shop name after first approval if it violates platform policy. During suspension, profile edits remain permitted but product visibility remains hidden.

### Shop Profile Editing Workflow

WHEN a seller edits their profile, THE system SHALL:
1. Accept changes to shop name, shop description, and logo URL
2. Immediately update the currently visible profile values
3. Trigger the creation of a profile snapshot preserving the previous values
4. Validate that the shop name is not empty and does not exceed 100 characters
5. Validate that the shop description does not exceed 2,000 characters

IF the shop name is empty after trimming whitespace, THE system SHALL reject the request.
IF the shop name exceeds 100 characters, THE system SHALL reject the request.
IF the shop description exceeds 2,000 characters, THE system SHALL reject the request.

### Shop Profile Snapshot Creation

WHEN a seller profile edit is submitted successfully, THE system SHALL:
1. Preserve the complete profile state before modification (shop name, description, logo URL)
2. Record the timestamp of the edit, the user who performed it, and the modification type ('edit')
3. Store the snapshot in an immutable archive accessible to the seller and administrators
4. Ensure the snapshot cannot be deleted or modified after creation

WHILE a profile is suspended, THE system SHALL:
1. Allow profile edits to proceed and create snapshots normally
2. Not override the suspension status during the snapshot creation process

THE system SHALL NOT create duplicate snapshots for identical consecutive edits.

### Logo Update Process

WHEN a seller uploads a new logo, THE system SHALL:
1. Validate that the file format is one of: JPEG, PNG, GIF
2. Validate that the file size does not exceed 5MB
3. Generate and store a resized thumbnail version (200x200 pixels max)
4. Replace the logo URL in the profile with the new uploaded version
5. Trigger a profile snapshot capturing both the previous and new logo URLs

IF the uploaded file format is not supported, THE system SHALL reject the request.
IF the uploaded file size exceeds 5MB, THE system SHALL reject the request.
IF the logo upload fails due to storage service error, THE system SHALL roll back the profile update and notify the seller.

### Shop Name Uniqueness Constraint

WHEN a seller submits a profile edit with a new shop name, THE system SHALL:
1. Check that the new shop name is unique across all sellers (case-insensitive)
2. Reject the request if another seller already uses the same shop name
3. Allow the shop name to be identical to the seller's own previous name (for edits without change)
4. Permit shop name reuse after another seller deletes their account or changes their shop name

IF a seller's shop name is suspended due to policy violation, THE system SHALL:
1. Flag the shop name as unavailable for new sellers
2. Still enforce uniqueness against all active shop names

THE system SHALL store a normalized version (lowercase, trimmed) of the shop name for uniqueness comparison.

### Profile View History

WHEN a seller views their profile history, THE system SHALL:
1. Display all profile snapshots in reverse chronological order (newest first)
2. Show for each snapshot: timestamp, shop name at that time, description at that time, logo URL at that time, and edit type
3. Allow filtering snapshots by edit type ('edit' or 'order snapshot' if applicable)
4. Enable the seller to compare two snapshots to see specific field changes

WHEN an administrator views any seller's profile history, THE system SHALL:
1. Provide the same view as for the seller
2. Indicate which snapshots were created for dispute resolution (e.g., order snapshots)

THE system SHALL NOT expose profile snapshots created for other sellers or unrelated users.

## Address Actions

Customers add multiple shipping addresses with full address details. Each address includes recipient name, phone, street, city, state, postal code, and country. Customers can edit or delete their addresses at any time. One address may be marked as default for streamlined checkout. Deleting an address removes it from all future checkouts but leaves past order addresses intact. A customer must have at least one address before proceeding to checkout. Address changes do not affect previously placed orders or snapshots.

### Address Management Workflow

WHEN a customer adds a new shipping address, THE system SHALL:
1. Require all address fields: recipient name, phone number, street address, city, state/province, postal code, and country
2. Validate the phone number format
3. Validate the postal code format if provided
4. Associate the address with the customer's profile
5. Set no address as default if no previous default exists

WHEN a customer views their addresses, THE system SHALL:
1. Return the complete list of addresses owned by the customer
2. Mark one address as the default shipping address
3. Show addresses in creation order, newest first

WHEN a customer removes an address, THE system SHALL:
1. Delete the address record only if it is not the only address and not the default address of any active order
2. Preserve all historical address data for past orders
3. Return an error if attempting to delete the only remaining address


### Default Address Selection

WHEN a customer sets a default shipping address, THE system SHALL:
1. Allow selection from the customer's own addresses
2. Remove the default flag from the previously selected address
3. Mark the chosen address as default

WHEN a customer places an order, THE system SHALL:
1. Use the customer's default shipping address unless they explicitly choose another address during checkout
2. Lock the selected shipping address at order placement
3. Prevent changing the shipping address after order placement

WHEN a customer has no default address set, THE system SHALL:
1. Require address selection during checkout
2. Treat the first address in the list as default only when explicitly saved
3. Allow setting a new default during the address creation or edit process


### Address Editing Process

WHEN a customer edits an address, THE system SHALL:
1. Allow updating all address fields: recipient name, phone number, street address, city, state/province, postal code, and country
2. Validate updated phone and postal code formats
3. Preserve historical address data for past orders (no snapshot required)
4. Apply changes immediately to future use

WHEN an address is used in an active order (status paid, shipped, or delivered), THE system SHALL:
1. Permit editing the address by the customer
2. Preserve the original address value at order creation for historical reference
3. Allow future orders to use the updated address


### Address Deletion Impact

WHEN a customer deletes an address, THE system SHALL:
1. Prevent deletion if the address is the only remaining address
2. Prevent deletion if the address is the default address and no other address can be set as default
3. Block deletion if the address was used in any past or active order
4. Preserve all order-related address records for legal and historical purposes
5. Update the default address flag only if the deleted address was the default and there are remaining addresses

WHEN a deleted address is referenced in a past order, THE system SHALL:
1. Preserve the address snapshot as recorded at the time of order placement
2. Display the preserved address in order history
3. Show the deleted status only if the address was removed after order creation (not applicable—addresses used in orders are never deleted)


### Checkout Address Validation

WHEN a customer proceeds to checkout, THE system SHALL:
1. Verify that at least one address exists in the customer's address list
2. Show an error if no addresses are available and prevent checkout
3. Pre-select the default shipping address in the checkout form
4. Allow switching to any other address before order confirmation

WHEN a customer selects or switches a shipping address during checkout, THE system SHALL:
1. Validate that the selected address belongs to the customer
2. Lock the selected address once the order is placed
3. Prevent address changes after order confirmation
4. Display the selected address in the order summary for confirmation

WHEN a customer attempts to place an order with an invalid address, THE system SHALL:
1. Reject the request if any required field is missing or malformed
2. Highlight the problematic field in the UI with a clear error message
3. Block order creation until validation passes


## Category Actions

Administrators create, edit, or delete categories and subcategories. Subcategories are limited to one level of nesting under a parent. Categories have names and descriptions but no inventory or pricing. Deleting a category reassigns affected products as uncategorized. Customers can browse all categories but not modify them. Categories are used to organize product listings and filter search results. Administrators may not delete a category if products remain assigned—unless they explicitly reassign or mark as uncategorized.

### Category Creation Workflow

WHEN an administrator creates a new category, THE system SHALL:
1. Require a name and description
2. Allow an optional parent category
3. Ensure the parent category exists and is not a subcategory itself (i.e., only one level of nesting)
4. Ensure the category name is unique within its parent scope

IF the parent category is provided but is a subcategory (has a parent), THE system SHALL reject the request.
IF a category with the same name already exists under the same parent, THE system SHALL reject the request.

WHEN an administrator submits a category creation request with an invalid parent reference, THE system SHALL reject the request with a validation error.

WHERE the category has no parent, THE system SHALL create it as a top-level category.



### Subcategory Nesting Rule

A subcategory can only be created under a top-level category.

NO category can be a parent of another subcategory—nesting depth is limited to exactly two levels: [Top-Level Category] → [Subcategory].

WHEN an administrator attempts to create a subcategory under an existing subcategory, THE system SHALL reject the request and specify the nesting depth limit.

THE system SHALL enforce the nesting depth at both creation and edit time.



### Category Deletion Process

WHEN an administrator deletes a category, THE system SHALL:
1. Check if any products are assigned to the category
2. If products exist, prompt for reassignment (to another category or untagged status)
3. Delete the category only after all products have been reassigned

IF products remain assigned and no reassignment is provided, THE system SHALL reject the deletion.

IF a category has subcategories, THE system SHALL reject the deletion unless those subcategories are also deleted or reassigned.

WHEN deletion is approved, THE system SHALL mark all affected products as having no category.



### Product Reassignment Flow

WHEN a category is being deleted, THE system SHALL:
1. List all products currently assigned to that category
2. Provide an interface for the administrator to select a new category for each product or choose 'uncategorized'
3. Apply the reassignment in a single atomic operation

WHEN reassignment is completed, THE system SHALL update each product’s categoryId to the new value or null.

IF the administrator cancels the reassignment during deletion, THE system SHALL abort the category deletion.

WHERE products cannot be reassigned due to business rules (e.g., archived orders reference them), THE system SHALL block the deletion and provide guidance.



### Category Browsing Experience

WHEN a customer browses categories, THE system SHALL:
1. Display the top-level category list
2. Allow expanding each top-level category to view its subcategories (if any)
3. Ensure no infinite recursion—subcategories shall not show further nesting

THE system SHALL render categories in alphabetical order by name within each nesting level.

WHERE a customer views a category detail page, THE system SHALL show:
- Category name and description
- Number of products in the category
- A link to browse products in that category

WHEN a category is deleted, THE system SHALL remove it from all browsing experiences immediately.

WHERE a category has no products, THE system SHALL still show the category but indicate zero items.


## Product Actions

Sellers create products with name, description, category, and base price. Products are permanently linked to the seller who created them. Sellers can edit product details, which automatically creates a snapshot of the product’s prior state. Deleting a product is only allowed if no pending order items, cancellations, or refunds exist. Deleted products are hidden from search and category listings but remain in historical snapshots and order records. Sellers may view product snapshots but not edit archived ones. Products with no variants remain visible but marked as unavailable for purchase.

### Product Creation Workflow

WHEN a seller creates a product, THE system SHALL:
1. Require the product to have a name, description, category, and base price
2. Associate the product with the creating seller
3. Allow multiple product images to be uploaded during or after creation
4. Allow variant creation during or after product creation

IF the seller attempts to create a product without a category, THE system SHALL reject the request.
IF the seller attempts to create a product with duplicate name within the same shop, THE system SHALL reject the request.

### Product Editing Snapshot

WHEN a seller edits a product, THE system SHALL:
1. Capture the complete state of the product (name, description, category, base price, main image, all images, and variant configurations) in a product snapshot
2. Preserve the snapshot with timestamp, editor identity, and edit type ('edit')
3. Allow sellers to view all historical product snapshots for their own products

WHILE a product is being edited, THE system SHALL:
1. Block seller access to other edit sessions for the same product
2. Ensure the new product state does not affect existing orders or snapshots

THE system SHALL preserve product snapshots even if the product is later deleted.

### Product Deletion Condition

WHEN a seller deletes a product, THE system SHALL:
1. Verify the product has no pending order items (with status 'paid' or 'shipped')
2. Verify there are no pending cancellation or refund requests for any variant of the product
3. Delete all associated product images and variants
4. Delete all associated inventory records
5. Remove the product from search and category listings

IF the product has pending order items or pending requests, THE system SHALL reject the deletion request.
IF deletion fails due to pending items, THE system SHALL provide a clear reason identifying which items prevent deletion.

### Product Unavailability Status

WHEN a product has no variants, THE system SHALL:
1. Keep the product visible in search and category listings
2. Mark the product as 'unavailable' in product listings and detail pages
3. Prevent the product from being added to cart

WHEN all variants of a product are out of stock, THE system SHALL:
1. Keep the product visible in search and category listings
2. Mark each variant as 'out of stock'
3. Prevent 'out of stock' variants from being added to cart

THE system SHALL NOT display unavailable products as purchaseable.

### Product Ownership Linkage

WHEN a product is created, THE system SHALL:
1. Permanently link the product to the seller who created it
2. Store the seller ID as immutable metadata on the product record
3. Assign all order items derived from this product to the original seller

WHEN a product is sold, THE system SHALL:
1. Create order items referencing the original product and seller
2. Capture seller profile snapshot at time of purchase to preserve shop name and logo

THE system SHALL ensure product ownership cannot be transferred or reassigned after creation.

## ProductImage Actions

Sellers upload multiple images per product and reorder them to set the main thumbnail. The first image becomes the primary display image. Sellers can delete images at any time, and deletions are reflected in the next product snapshot. Image changes do not trigger inventory updates but affect product detail pages and listings. Image URLs are stored as references, and duplicate uploads are not prevented. Sellers must upload at least one image before publishing a product variant. Removing all images results in placeholder display for the product.

### Image Upload Workflow

WHEN a seller uploads an image to a product, THE system SHALL:
1. Accept one or more image files per upload action
2. Assign a unique identifier and store the image URL
3. Set the first uploaded image as the main (thumbnail) image if no existing images exist
4. Increment the sortOrder for subsequent images in the upload sequence
5. Link the image to the product and seller

THE system SHALL store each uploaded image with its metadata (URL, sortOrder, isMain, creation timestamp).

WHEN a seller uploads a duplicate image (same URL or hash), THE system SHALL accept it as a new record but not prevent duplication by design.

WHERE an image fails to store due to system errors, THE system SHALL reject the upload and preserve existing images unchanged.

### Thumbnail Selection

WHEN a seller sets an uploaded image as the main image, THE system SHALL:
1. Update the isMain flag to true for the selected image
2. Update the isMain flag to false for all other images of the same product
3. Reflect this change in all product listings and detail pages immediately

WHERE a product has no image marked as main, THE system SHALL treat the first image by sortOrder as the main image for display purposes.

WHEN all images are deleted, THE system SHALL display a placeholder thumbnail until at least one image is added.

### Image Reordering Process

WHEN a seller reorders images for a product, THE system SHALL:
1. Accept a new sortOrder sequence for all product images
2. Update each image's sortOrder field to reflect the new order
3. Ensure uniqueness and continuity of sortOrder values (no gaps or duplicates)
4. Automatically reassign the main image status to the image at the new first position if it was not already main

WHILE a product has at least one image, THE system SHALL ensure that the image with sortOrder=1 is always treated as the thumbnail.

IF a reorder operation includes an invalid image ID or sortOrder conflict, THE system SHALL reject the request and preserve existing order.

### Image Deletion Impact

WHEN a seller deletes an image from a product, THE system SHALL:
1. Remove the image record from active listings
2. Update sortOrder for remaining images to fill the gap
3. Reassign isMain to true for the new first image (sortOrder=1) if the deleted image was the main image
4. Preserve the deleted image record in product snapshots that occurred before deletion

IF deleting an image would leave a product without any images, THE system SHALL mark the product as having no images but allow product to remain active.

WHEN a product is deleted, THE system SHALL automatically delete all associated images, but preserve them in the product snapshot if it was created for an order, cancellation, or refund.

### Product Image Requirement

A product MUST have at least one image to be considered publishable.

WHEN a seller attempts to activate a variant without any associated product images, THE system SHALL display a warning and block variant activation until at least one image is uploaded.

IF a product has no images, THE system SHALL display a placeholder in search results and category listings, and the product detail page SHALL show a placeholder image.

WHILE a product has zero images, THE system SHALL allow editing of other product fields but block checkout eligibility for all variants of the product.

## ProductVariant Actions

Sellers create product variants with unique SKU codes, option values, optional price override, and initial stock. Variants can be added or edited at any time, and edits always generate snapshots. Deleting a variant is only permitted if no pending order items or refund/cancellation requests exist. A product must retain at least one variant to remain purchasable. Out-of-stock variants cannot be selected during cart addition or checkout. Variant pricing overrides the base product price; if unset, the base price is used. Customers see only currently available variants in product detail views.

### Variant creation workflow

WHEN a seller creates a product variant, THE system SHALL:
1. Require a unique SKU code across all variants of the same product
2. Require at least one option value (e.g., color, size)
3. Allow an optional price override that may differ from the product's base price
4. Initialize stock quantity to 0
5. Associate the variant with the creating seller's product

IF the SKU code is not unique within the same product, THE system SHALL reject the request.
IF no option values are provided, THE system SHALL reject the request.
IF the product already has an active variant with identical option values, THE system SHALL reject the request.

### SKU uniqueness enforcement

WHEN a seller adds a new variant to a product, THE system SHALL:
1. Verify that the combination of option values is unique for that product
2. Enforce that no other variant shares the same product ID and option value set
3. Store the variant with its assigned SKU code and stock quantity
4. Ensure the variant is immediately visible for purchase unless stock is 0

IF a variant with the same product ID and identical option values already exists, THE system SHALL reject the request.
IF the SKU code is already used by another variant in the same product, THE system SHALL reject the request.

### variant editing snapshot

WHEN a seller edits a product variant, THE system SHALL:
1. Preserve the existing variant record unchanged
2. Create a new product-variant snapshot capturing the state before the edit
3. Update the current variant with the new SKU code, option values, and/or price
4. Allow the seller to modify the stock quantity via inventory adjustment, not direct editing

THE system SHALL store the following in the product-variant snapshot: SKU code, option values, price override, and creation timestamp.
THE snapshot SHALL be immutable and preserved even after subsequent edits or variant deletion.

### variant deletion condition

WHEN a seller attempts to delete a product variant, THE system SHALL:
1. Verify that no order items exist for the variant with status "paid" or "shipped"
2. Verify that no pending cancellation or refund requests exist for the variant
3. Check that the parent product will retain at least one variant after deletion
4. Delete the variant and remove it from available selections

IF any order items for the variant are in "paid" or "shipped" status, THE system SHALL reject the deletion.
IF any cancellation or refund requests are pending for the variant, THE system SHALL reject the deletion.
IF the deletion would leave the product without any variants, THE system SHALL reject the deletion.

### stock-aware variant selection

WHEN a customer attempts to add a variant to their cart, THE system SHALL:
1. Check if the variant's stock quantity is sufficient for the requested quantity
2. Reject the request if the variant is out of stock (stock quantity = 0)
3. Display a warning if the requested quantity exceeds available stock
4. Ensure the variant belongs to an active product

IF the variant is deleted or the seller is suspended, THE system SHALL block addition to the cart.
IF the variant is out of stock, THE system SHALL show "out of stock" and disallow selection during checkout.

## ProductSnapshot Actions

Every product edit automatically creates a product snapshot preserving all current fields and variant structure. Snapshots include the product name, description, category, base price, and at that moment, all associated variant snapshots. Snapshots are immutable and cannot be deleted or modified by sellers or administrators. Sellers can view snapshots of their own products. Administrators can view all product snapshots for oversight or dispute resolution. Snapshots persist even after product deletion. Snapshot versioning is implicit via timestamp ordering.

### Automatic Snapshot Creation on Product Edit

WHEN a seller edits a product, THE system SHALL automatically create a product snapshot.

WHEN a product is edited, THE system SHALL capture all of the following at the moment of edit:
1. Product name, description, category reference, and base price
2. All images in their current order and main image designation
3. All product variants in their current state (SKU code, option values, price override, stock quantity)

THE system SHALL NOT allow manual snapshot creation or deletion by sellers or administrators.

THE system SHALL timestamp each snapshot with the exact time of creation and include it in version ordering.

### Immutable Snapshot Storage

WHEN a product snapshot is created, THE system SHALL store it in immutable storage.

THE system SHALL prevent all modification operations on existing product snapshots, including update, deletion, or archival.

WHILE a product snapshot exists, THE system SHALL:
- Reject all attempts to overwrite, patch, or delete it
- Prevent structural changes (schema, field types, relationships)
- Lock associated product snapshot variants from editing or deletion

THE system SHALL preserve product snapshots indefinitely, even after:
- Product deletion
- Seller account deletion
- Associated variant deletion

### Variant Snapshot Inclusion

WHEN a product snapshot is created, THE system SHALL include a complete set of variant snapshots.

Each product snapshot variant SHALL capture the following at the time of product edit:
1. SKU code
2. Option values (as JSON structure preserving all variant dimensions)
3. Price override value (null if none)
4. Creation timestamp of the variant snapshot

THE system SHALL ensure that product snapshot variants:
- Are stored as part of the parent product snapshot
- Cannot be modified, deleted, or reordered independently
- Represent the exact variant structure and values at the moment of product edit

WHEN a product with no variants is edited, THE system SHALL store an empty variant snapshot collection.

### Seller Snapshot Access

WHEN a seller views their own product, THE system SHALL allow them to view all associated product snapshots.

WHEN a seller requests a snapshot list, THE system SHALL present:
- Snapshot creation timestamp
- Product name and price at time of snapshot
- Count of variants included in the snapshot
- Type of action that triggered the snapshot (e.g., 'edit')

THE system SHALL allow sellers to view full details of any of their own product snapshots, including:
- All images in their original order
- Full variant snapshot data (SKU, options, price)
- Timestamp of the snapshot

IF the product has been deleted, THE system SHALL still allow sellers to view their historical snapshots for that product.

### Administrator Snapshot Oversight

WHEN an administrator requests any product snapshot, THE system SHALL provide it regardless of seller ownership.

THE system SHALL enable administrators to view all snapshots for any product on the platform for oversight or dispute resolution.

WHEN investigating a product-related dispute, THE system SHALL allow administrators to compare snapshots in chronological order, including:
- Name and description changes
- Price changes
- Variant structure changes (SKU additions, deletions, option modifications)
- Image reordering or deletion

THE system SHALL NOT require administrator approval to view snapshots—access is automatic for all administrators.

WHEN a product is deleted, THE system SHALL still serve snapshot data to administrators for audit and compliance purposes.

## ProductSnapshotVariant Actions

Each product snapshot includes embedded variant snapshots that preserve SKU code, option values, and price as of that moment. These variant snapshots are read-only and cannot be edited or deleted. They support full historical review of product configurations and ensure accurate order reconstruction. When a product is restored from a snapshot (e.g., for dispute resolution), all variant snapshots are displayed alongside it. This structure prevents misrepresentation of product details at time of purchase. Variant snapshots reference the parent snapshot ID, maintaining traceability.

### Variant Snapshot Embedding

WHEN a product is edited, THE system SHALL create a product snapshot that includes a snapshot of each variant at that moment.

THE product snapshot variant record MUST include:
1. The variant's SKU code at the time of snapshot
2. The variant's option values (e.g., color, size) at the time of snapshot
3. The variant's price override at the time of snapshot
4. The timestamp of the snapshot creation

WHEN a product snapshot is viewed, THE system SHALL display all associated product snapshot variants with their full historical state.

### Snapshot Variant Immutability

THE product snapshot variant records SHALL be immutable once created.

IF a request attempts to update, delete, or modify a product snapshot variant, THE system SHALL reject the request.

Product snapshot variants CANNOT be edited even by administrators, owners, or system processes.

WHEN a product is restored from a snapshot (e.g., for dispute resolution), THE system SHALL present the product snapshot variants as read-only historical records.

### Historical Variant Recreation

WHEN reconstructing a product as it existed at a past time, THE system SHALL use the product snapshot and its embedded variant snapshots to recreate the exact state.

WHEN displaying a product snapshot for dispute resolution, THE system SHALL show:
1. The product name and description as of that moment
2. All product images as of that moment
3. All product variant snapshots with SKU, option values, and price as of that moment

THE system SHALL ensure that variant snapshot data is never replaced or removed, even if the original variant is later edited or deleted.

### Dispute-Resolution Traceability

WHEN a dispute arises about product specifications at the time of purchase, THE system SHALL allow authorized parties (customer, seller, administrators) to view the complete product snapshot including all variant snapshots.

WHEN viewing a product snapshot for dispute resolution, THE system SHALL include:
1. The order item's linked product snapshot ID
2. All product snapshot variants with their full state at the time of order
3. The timestamp of the snapshot creation

THE system SHALL provide export capability to preserve snapshot state for legal review.

WHEN a product snapshot variant is accessed during dispute resolution, THE system SHALL NOT modify the snapshot data or its relationships.

## InventoryRecord Actions

Sellers manually restock or adjust inventory by adding positive or negative quantity records with reasons. Every order placement creates a negative inventory record for each purchased variant. Cancellation or refund triggers a corresponding positive record. Sellers can view full inventory history per variant with timestamps and reason codes. Stock levels are calculated in real time as the sum of all records. Inventory records do not create snapshots but support reconciliation and stock auditing. Records cannot be deleted or backdated. Suspended sellers may still view inventory but cannot add or adjust records.

### Restock Workflow

WHEN a seller adds inventory to a variant, THE system SHALL:
1. Require a positive quantity and a valid reason (e.g., 'restock')
2. Create a new inventory record with the specified quantity change (positive), reason, and timestamp
3. Update the variant’s current stock by adding the recorded quantity
4. Associate the record with the variant and seller

IF the quantity is zero or negative, THE system SHALL reject the request.
IF the variant belongs to a different seller, THE system SHALL reject the request.
WHEN a seller attempts to restock a variant belonging to a suspended seller, THE system SHALL reject the request.

### Inventory Adjustment Process

WHEN a seller adjusts inventory (e.g., for loss, damage, or discrepancy), THE system SHALL:
1. Accept a positive (addition) or negative (deduction) quantity with a valid reason (e.g., 'adjustment', 'loss')
2. Create an inventory record containing the quantity change, reason, and timestamp
3. Update the variant’s current stock accordingly
4. Require the reason field and reject empty or invalid values

IF the reason is missing or not in the approved list (restock|order|adjustment|cancel|refund), THE system SHALL reject the request.
IF the adjustment would result in negative stock, THE system SHALL reject the request.
IF the variant belongs to a suspended seller, THE system SHALL reject the request.

### Order-Based Deduction

WHEN a customer completes payment for an order containing a variant, THE system SHALL:
1. Create a negative inventory record for each ordered variant
2. Set the quantity change to the negative of the purchased quantity
3. Set the reason to 'order' and link to the order ID
4. Decrease the variant’s current stock by that amount
5. Preserve the record for audit and reconciliation

IF the variant is deleted before order payment, THE system SHALL abort the deduction and rollback the order.
IF insufficient stock is available for the ordered quantity, THE system SHALL fail the order at checkout.
IF multiple items from the same variant are purchased in one order, THE system SHALL create a single negative record for the total quantity.

### Refund-Based Restoration

WHEN a refund is approved for an order item, THE system SHALL:
1. Create a positive inventory record for the refunded variant
2. Set the quantity change to the positive of the refunded quantity
3. Set the reason to 'refund' and reference the refund request ID
4. Increase the variant’s current stock by that amount
5. Create a snapshot of the refund request before applying the change

IF the refund is rejected, THE system SHALL NOT create any inventory record.
IF the variant has been deleted after refund approval, THE system SHALL still create the inventory record for audit.
IF the order item is already refunded or cancelled, THE system SHALL reject duplicate refund requests.

### Inventory History Viewing

WHEN a seller views the inventory history for a variant they own, THE system SHALL:
1. Return a list of all inventory records for that variant, sorted by timestamp descending
2. Include quantity change, reason, timestamp, and optional reference ID (e.g., order ID)
3. Show the running stock total after each record
4. Display reason labels in business terms (e.g., 'Restock', 'Order', 'Adjustment')

WHEN an administrator views inventory history for any variant, THE system SHALL:
1. Provide full access to inventory records regardless of seller ownership
2. Include all fields and maintain the same sorting and running total

IF the variant no longer exists, THE system SHALL still return historical records for audit purposes.

## CartItem Actions

Customers add variants to their cart with a chosen quantity, combining duplicates into a single line item. Cart items reflect real-time variant availability, showing warnings if quantity exceeds stock. Out-of-stock or deleted variants become unavailable and cannot be checked out. Customers can edit quantities or remove items at any time. Cart state is not preserved beyond session, though it may be restored during login. Unavailable items trigger UI warnings during checkout initiation. Cart totals update dynamically with price and quantity changes.

### CartItem Addition

WHEN a customer adds a product variant to their cart, THE system SHALL:
1. Require the variant ID and quantity
2. Ensure the variant is from an active (not deleted or suspended) seller
3. Set the initial cart item quantity to the requested amount if no existing item for that variant exists
4. Associate the cart item with the current customer
5. Include the current variant price at time of addition

IF the variant has been deleted, THE system SHALL reject the addition request.
IF the seller of the variant is suspended, THE system SHALL reject the addition request.
IF the quantity is less than 1, THE system SHALL reject the addition request.

### Quantity Combination Logic

WHEN a customer adds a variant that already exists in their cart, THE system SHALL:
1. Locate the existing cart item for that variant
2. Add the requested quantity to the existing quantity
3. Update the cart item subtotal with the new quantity and current variant price
4. Preserve any existing notes or attributes from prior addition

IF the variant does not exist in the cart, THE system SHALL create a new cart item as if it were the first addition.
WHEN combining quantities, THE system SHALL NOT create duplicate cart items for the same variant.

### Stock-aware Cart Warning

WHEN a customer adds or modifies a cart item quantity, THE system SHALL:
1. Compare the requested quantity against the variant’s current stock
2. Display a warning if the requested quantity exceeds available stock
3. Display a warning if the variant is out of stock (stock = 0)
4. Continue to allow cart storage even if out of stock, but mark the item as unavailable for checkout

IF the variant’s stock is insufficient for the requested quantity, THE system SHALL NOT reject the addition but SHALL display a clear warning.
IF the variant is deleted or the seller is suspended, THE system SHALL mark the cart item as unavailable rather than add it.

### CartItem Removal

WHEN a customer removes a cart item, THE system SHALL:
1. Permanently delete the cart item for the current session
2. Exclude the removed item from cart total calculations
3. Update the available quantity warning context for remaining items
4. Ensure the item is not counted during checkout initiation

IF the cart item does not exist (e.g., already removed or expired), THE system SHALL silently ignore the removal request.
WHEN the cart becomes empty after removal, THE system SHALL clear the cart total to zero.

### Checkout Availability Check

WHEN a customer initiates checkout, THE system SHALL:
1. Verify all cart items are still available (variant exists, seller not suspended, in stock or allowed out-of-stock pending payment)
2. Mark unavailable items with status flags (deleted, suspended seller, or permanently out of stock)
3. Block checkout completion if any available items are missing required shipping information
4. Prevent selection of unavailable items as checkout items

IF any cart item is unavailable, THE system SHALL NOT allow proceeding to payment until unavailable items are removed.
IF stock of an in-cart variant has dropped below the cart quantity since last edit, THE system SHALL display a real-time warning and allow the customer to adjust quantity or remove the item.

## WishlistItem Actions

Customers add products to their wishlist, not specific variants. Wishlist is private and paginated. Customers can remove products from the wishlist at any time. When a wishlist product is deleted by the seller, it automatically disappears from all wishlists. Wishlist items have no stock or price data and are not converted to cart items automatically. Wishlist display shows product thumbnails, name, seller, and current price if available. Customers may revisit the wishlist to review past interest or reorder later.

### Wishlist Product Addition

### Wishlist Product Addition

WHEN a customer adds a product to their wishlist, THE system SHALL:
1. Accept only the product ID (no variant selection)
2. Ensure the product exists and is not deleted
3. Create one wishlist item per product-customer pair
4. Ignore duplicate addition attempts for the same product
5. Preserve the addition timestamp as the wishlist item's createdAt

IF the product is already in the customer's wishlist, THE system SHALL NOT create a duplicate item.
IF the product has been deleted by the seller, THE system SHALL silently ignore the request.


### Automatic Removal on Deletion

### Automatic Removal on Deletion

WHEN a seller deletes a product, THE system SHALL:
1. Remove all wishlist items referencing that product
2. Not require explicit customer action for removal
3. Ensure the deletion is applied across all customers' wishlists

WHEN a product is deleted, THE system SHALL:
1. Automatically purge all wishlist items for that product
2. Update the product reference in wishlist items to null or mark as unavailable
3. Maintain wishlist integrity without orphaned references


### Wishlist Privacy Scope

### Wishlist Privacy Scope

THE system SHALL ensure that:
1. Customers can only view their own wishlist
2. Customers cannot view other customers' wishlists
3. Sellers and admins cannot view customer wishlists unless explicitly permitted by platform policy
4. Wishlist items are never exposed in public APIs or shared contexts

WHEN a customer attempts to access another customer's wishlist, THE system SHALL reject the request.


### Wishlist Viewing Flow

### Wishlist Viewing Flow

WHEN a customer views their wishlist, THE system SHALL:
1. Display wishlist items in reverse chronological order (newest first)
2. Show product thumbnail, name, seller shop name, and current price
3. Indicate stock status for each product's variants (if available)
4. Paginate results with a default page size of 20 items
5. Allow navigating to the product detail page from wishlist items

WHEN the wishlist is empty, THE system SHALL display a placeholder message.


### Wishlist Refresh Behavior

### Wishlist Refresh Behavior

WHEN a wishlist product is edited by the seller, THE system SHALL:
1. Not automatically refresh displayed product data in the wishlist
2. Allow customers to view updated product information when navigating to the product detail page

WHEN a wishlist product is restocked after being out of stock, THE system SHALL:
1. Update the availability status shown in the wishlist view
2. Remove the 'out of stock' indicator if new inventory is available

WHEN a customer revisits the wishlist page, THE system SHALL:
1. Refresh the current prices and stock status from the live catalog
2. Preserve the wishlist item order and timestamps


### Wishlist Item Removal

### Wishlist Item Removal

WHEN a customer removes a product from their wishlist, THE system SHALL:
1. Permanently delete the wishlist item
2. Not preserve the item in any archive or trash state
3. Allow immediate re-addition of the same product

WHEN a product is removed from the wishlist, THE system SHALL:
1. Update the wishlist item count for the customer
2. Trigger a refresh if the customer is currently viewing the wishlist


## Order Actions

Customers initiate checkout from cart, selecting a shipping address and reviewing items. Payment is processed only after review; failure cancels the order. Successful payment creates an order record, locks shipping address, and reduces stock. Each order item becomes a separate line with its own status. Snapshot copies of products, variants, and seller profiles are saved with each order item. Orders can include items from multiple sellers, each shipped separately. Customers view order history sorted by newest first. Deleted cart items no longer appear in cart after successful order placement.

### Checkout Initiation

WHEN a customer selects 'Proceed to Checkout' from their cart, THE system SHALL:
1. Verify all cart items are available (product exists and variant not deleted)
2. Prevent checkout if any cart item is unavailable
3. Load the customer’s saved addresses
4. Pre-select the default shipping address if available
5. Display order summary including all cart items with prices, quantities, and subtotals

IF the cart is empty, THE system SHALL prevent checkout and redirect the customer to the cart page.
IF all cart items are unavailable, THE system SHALL block checkout and display a summary of unavailable items.

### Payment Processing Workflow

WHEN a customer confirms payment after reviewing the order summary, THE system SHALL:
1. Initiate payment processing through the external payment gateway
2. Lock the shipping address and freeze order item prices and inventory
3. Wait for payment gateway response

IF payment processing fails, THE system SHALL:
1. Discard the temporary order reservation
2. Release the locked inventory
3. Return the customer to the cart page with error details
4. Allow retry of payment

WHERE payment processing is synchronous, THE system SHALL wait for immediate result before proceeding.

### Order Creation Trigger

WHEN payment processing succeeds, THE system SHALL:
1. Create a new order record with the customer ID and shipping address ID
2. For each cart item, create an order item with status 'paid'
3. Decrease stock quantity for each variant via inventory record (negative quantity)
4. Remove cart items from the customer's cart
5. Generate a snapshot of each product and variant at the time of purchase
6. Store the snapshot reference in the order item

WHERE an order contains items from multiple sellers, THE system SHALL create one shipment per seller.

### Snapshot Capture at Purchase

WHEN an order is placed, THE system SHALL capture immutable snapshots for each order item:
1. Product snapshot includes: product name, description, category, base price, and all images (in current order)
2. Product snapshot variant includes: SKU code, option values, price override, stock quantity at time of order
3. Seller profile snapshot includes: shop name, shop description, and logo URL at time of order
4. All snapshots are timestamped and linked to the order item

THE system SHALL preserve snapshots even if the original product, variant, or seller profile is later edited or deleted.

### Order History Viewing

WHEN a customer views their order history, THE system SHALL:
1. Display a list of all orders placed by the customer, sorted by newest first
2. Show each order with: order number, creation date, total price, and derived order status
3. Paginate results (e.g., 10 orders per page)
4. Allow drill-down to full order details

WHERE a customer views full order details, THE system SHALL show:
1. List of order items with: product name, variant options, quantity, price, and item status
2. Shipping address used at checkout
3. List of shipments with carrier name, tracking number, and status
4. Snapshot references for each order item

## OrderItem Actions

Each order item is created upon successful order placement and can be individually managed through its lifecycle. Order item statuses evolve from paid to shipped to delivered, or cancelled/refunded. Customers can request cancellation for paid items or refund for delivered items (within 7 days). Sellers approve or reject these requests, creating snapshots of request state. Cancelled items restore stock; refunded items restore stock and initiate refund payment. Mixed item statuses produce partial order states. Items from the same shipment share delivery confirmation.

### Order Item Status Lifecycle

WHEN an order item is created, THE system SHALL set its status to "paid". 

WHEN a seller marks an order item as shipped, THE system SHALL change its status to "shipped". 

WHEN a customer confirms delivery of a shipment containing the item, THE system SHALL change the status of all items in that shipment to "delivered". 

WHEN an item's cancellation request is approved, THE system SHALL change its status to "cancelled". 

WHEN an item's refund request is approved, THE system SHALL change its status to "refunded". 

WHILE an order item has status "paid", THE system SHALL allow the customer to request cancellation. 

WHILE an order item has status "delivered", THE system SHALL allow the customer to request refund within 7 days of delivery. 

IF an order item has status "shipped" or "delivered", THE system SHALL NOT allow cancellation request submission. 

IF an order item has status "cancelled", "refunded", or "paid" (for more than 7 days), THE system SHALL NOT allow refund request submission.

### Cancellation Request Workflow

WHEN a customer submits a cancellation request for a "paid" order item, THE system SHALL create a pending cancellation request with the customer-provided reason. 

WHEN a cancellation request is created, THE system SHALL create a snapshot of the request state at that moment. 

WHEN the seller of the order item responds to a pending cancellation request, THE system SHALL update the request status to "approved" or "rejected" and create a new snapshot of the request state. 

IF a cancellation request is approved, THE system SHALL change the order item's status to "cancelled" and restore its stock quantity. 

IF a cancellation request is rejected, THE system SHALL leave the order item status unchanged. 

IF the cancellation request is for an item from a multi-item order, THE system SHALL allow remaining items to continue processing independently. 

IF all order items in an order are cancelled, THE system SHALL set the order status to "cancelled".

### Refund Request Workflow

WHEN a customer submits a refund request for a "delivered" order item, THE system SHALL create a pending refund request with the customer-provided reason. 

WHEN a refund request is created, THE system SHALL verify that the delivery date is within the 7-day refund window, and reject the request if outside this window. 

WHEN a refund request is created, THE system SHALL create a snapshot of the request state at that moment. 

WHEN the seller of the order item responds to a pending refund request, THE system SHALL update the request status to "approved" or "rejected" and create a new snapshot of the request state. 

IF a refund request is approved, THE system SHALL change the order item's status to "refunded", restore its stock quantity, and initiate refund payment. 

IF a refund request is rejected, THE system SHALL leave the order item status unchanged. 

IF the refund request is for an item from a multi-item order, THE system SHALL allow remaining items to continue in their current status. 

IF all order items in an order are refunded, THE system SHALL set the order status to "refunded".

### Stock Restoration Process

WHEN an order item's cancellation request is approved, THE system SHALL create an inventory record with a positive quantity change and reason "cancel". 

WHEN an order item's refund request is approved, THE system SHALL create an inventory record with a positive quantity change and reason "refund". 

WHEN an order item is part of an order that is cancelled or refunded, THE system SHALL restore stock only for that specific item, not the entire order. 

WHILE a stock quantity is sufficient to cover a restock operation, THE system SHALL record the restock with a positive inventory change. 

THE system SHALL NOT allow negative stock quantities at any time. 

WHEN a restock or refund operation fails due to insufficient stock, THE system SHALL reject the operation. 

Sellers SHALL be able to view the full inventory history for each variant, including all restock, order, adjustment, cancel, and refund records.

### Mixed Status Handling

WHEN an order contains items with mixed statuses (e.g., some delivered, some cancelled), THE system SHALL set the order status to "partially completed". 

IF an order contains only "paid" items, THE system SHALL set the order status to "paid". 

IF an order contains any "shipped" item and no "delivered" items, THE system SHALL set the order status to "shipped". 

IF all items in an order are "delivered", THE system SHALL set the order status to "delivered". 

IF all items in an order are "cancelled", THE system SHALL set the order status to "cancelled". 

IF all items in an order are "refunded", THE system SHALL set the order status to "refunded". 

ITEM-level statuses (paid/shipped/delivered/cancelled/refunded) SHALL be managed independently across items in the same order. 

IF a shipment includes only some items from an order, THE system SHALL allow remaining items to be shipped in separate shipments.

## Shipment Actions

Sellers bundle one or more of their order items into a shipment and enter tracking details. Each shipment is tied to a single seller, ensuring order items from different sellers ship separately. Creating a shipment automatically updates all included order items to 'shipped' status. Sellers may choose to ship items individually or in combined packages. Tracking information is shared across all items in the shipment and visible to customers. Delivery confirmation by the customer advances all items in the shipment to 'delivered'.

### Shipment Bundling Logic

WHEN a seller creates a shipment, THE system SHALL:
1. Group only order items belonging to that seller and belonging to the same order
2. Prevent inclusion of items with status other than 'paid' or 'shipped'
3. Prevent inclusion of items already associated with another pending shipment
4. Require at least one order item in the shipment
5. Ensure all items in a shipment share the same shipping address

A shipment can only be created for order items whose seller matches the active seller.

WHILE an item is part of a pending shipment, THE system SHALL prevent its inclusion in another shipment.

THE system SHALL reject the shipment creation request if the seller attempts to bundle items from different orders.

THE system SHALL reject the shipment creation request if any selected item has already been delivered.

### Tracking Entry Workflow

WHEN a seller enters tracking information for a shipment, THE system SHALL:
1. Accept carrier name as free text
2. Accept tracking number as free text
3. Allow optional entry of both fields
4. Store the tracking details as immutable once the shipment status changes to 'shipped'
5. Display tracking information to the customer on the order detail page

IF a shipment is created without tracking information, THE system SHALL mark it as 'pending' until tracking details are provided.

WHEN the seller provides tracking details, THE system SHALL automatically transition the shipment status to 'shipped'.

THE system SHALL NOT allow editing of tracking details after the customer has confirmed delivery or after 14 days from shipping.

### Status Change on Shipment

WHEN a shipment is created with tracking information, THE system SHALL:
1. Set the shipment status to 'shipped'
2. Change all associated order items' status to 'shipped'

WHEN a shipment is created without tracking information, THE system SHALL:
1. Set the shipment status to 'pending'
2. Keep associated order items' status as 'paid'
3. Trigger an automatic status transition to 'shipped' when tracking details are provided

WHEN a seller cancels a shipment before it is shipped, THE system SHALL:
1. Change the shipment status to 'cancelled'
2. Revert associated order items' status back to 'paid'

THE system SHALL NOT allow status change to 'shipped' for items that are already cancelled, refunded, or delivered.

WHILE a shipment's status is 'pending', THE system SHALL prevent it from appearing in the customer's tracking view.

### Seller-Scoped Shipping

WHEN an order contains items from multiple sellers, THE system SHALL:
1. Create a separate shipment for each seller group
2. Ensure shipments never mix order items from different sellers
3. Assign each shipment to the correct seller profile

WHEN a seller creates a shipment, THE system SHALL:
1. Verify that the active seller owns all included order items
2. Prevent inclusion of items from other sellers in the same shipment
3. Associate the shipment with the seller's profile at the time of shipment creation

THE system SHALL NOT allow one seller to view or manage shipments created by another seller.

WHEN a seller views their shipment history, THE system SHALL show only shipments where they are the designated seller.

WHEN a shipment is created, THE system SHALL generate and store a snapshot of the seller's profile (shop name, logo) for historical integrity.

### Delivery Confirmation Trigger

WHEN a customer confirms delivery of a shipment, THE system SHALL:
1. Set the shipment status to 'delivered'
2. Change all order items in that shipment to status 'delivered'
3. Record the confirmation timestamp

WHEN a customer does not confirm delivery, THE system SHALL:
1. Automatically set the shipment status to 'delivered' after 14 days from the shipping date
2. Automatically set all associated order items to status 'delivered'

WHEN delivery confirmation occurs (either manually or automatically), THE system SHALL:
1. Lock all shipment and item details for editing
2. Prevent further cancellation or refund requests for those items
3. Unlock eligibility for the customer to write a review for each item

THE system SHALL reject delivery confirmation attempts for shipments with status 'cancelled' or 'refunded'.

IF a shipment contains items from multiple orders but all from the same seller, THE system SHALL still apply the 14-day delivery confirmation rule per shipment.

## ShipmentItem Actions

A shipment item links a shipment to an order item, establishing which items are included in a physical package. These associations are created when the shipment is made and cannot be altered afterward. Shipment items are read-only and used only for audit and status tracking. They enable customers to see which specific items arrived together. Shipment items do not affect inventory or payment logic. Each shipment item references the shipment ID and order item ID, forming a many-to-many bridge table. No user action creates or modifies shipment items directly.

### Shipment Item Association Logic

WHEN a shipment is created, THE system SHALL create a shipment item for each order item included in that shipment.

WHEN a shipment is created, THE system SHALL lock the selected order items so they cannot be included in another shipment.

WHEN a shipment item is created, THE system SHALL record the association timestamp and preserve it permanently.

WHILE a shipment item exists, THE system SHALL NOT allow any modification to its linkage (shipment or order item).

IF a customer views a shipment, THE system SHALL display the list of order items included in that shipment.

THE system SHALL NOT allow shipment items to be added, removed, or modified after shipment creation.

IF a seller attempts to ship an order item that is already part of a pending or shipped shipment, THE system SHALL reject the shipment creation request.

IF a seller attempts to include an order item with status "cancelled" in a shipment, THE system SHALL reject the shipment creation request.

IF a seller attempts to include an order item with status "refunded" in a shipment, THE system SHALL reject the shipment creation request.

### Immutable Linkage Record

WHEN a shipment item is created, THE system SHALL treat it as an immutable linkage record.

WHEN a shipment item is created, THE system SHALL store the shipment ID, order item ID, and creation timestamp.

WHEN a shipment item is created, THE system SHALL prevent any update, deletion, or reassignment of the linkage.

THE system SHALL preserve shipment items permanently even after associated shipments, orders, or order items are no longer active.

WHEN a seller or administrator views a shipment, THE system SHALL display the immutable shipment item linkage history.

IF a dispute occurs, THE system SHALL provide the shipment item linkage as evidence of which items were shipped together.

THE system SHALL NOT allow cancellation or refund of a shipment item linkage.

IF an order item is deleted, THE system SHALL preserve its associated shipment items as historical record.

THE system SHALL NOT allow a shipment item to exist without a valid shipment and order item reference.

### Delivery Bundle Tracking

WHEN a shipment is created, THE system SHALL bundle the selected order items for delivery tracking.

WHEN a shipment is marked as "shipped", THE system SHALL mark all associated shipment items as shipped.

WHEN a shipment is confirmed as "delivered" by the customer or after 14 days, THE system SHALL mark all associated shipment items as delivered.

WHEN a customer views a shipment, THE system SHALL show which specific order items arrived together.

THE system SHALL allow customers to see the delivery status of each item via the shipment item linkage.

IF a seller creates multiple shipments from the same order, THE system SHALL preserve each shipment item's bundle context separately.

WHEN a shipment item is delivered, THE system SHALL update the corresponding order item status to "delivered".

THE system SHALL NOT allow delivery confirmation per order item—only per shipment (via shipment items).

IF a shipment is split due to logistical reasons, THE system SHALL create separate shipment items for the new shipment groupings.

### Shipment-to-Order Mapping

WHEN a shipment is created, THE system SHALL associate the shipment with the original order and the seller who owns the items.

WHEN a shipment item is created, THE system SHALL preserve the connection between the order item and its parent order.

WHEN an order contains items from multiple sellers, THE system SHALL create separate shipments and shipment item groups per seller.

THE system SHALL allow tracking of which order items belong to which shipment through the shipment item mapping.

WHEN a seller ships an order, THE system SHALL create shipment items for all of their items in that order.

THE system SHALL NOT allow shipment items to be created across different orders.

WHEN an order item is cancelled or refunded, THE system SHALL preserve its shipment item linkage for audit purposes.

IF a shipment is created but never shipped, THE system SHALL retain the shipment-to-order mapping until status changes.

THE system SHALL ensure that every shipment item correctly traces back to its original order and order item.

## CancellationRequest Actions

Customers request cancellation for paid order items only, providing a reason. Cancellation requests cannot be made for shipped, delivered, cancelled, or refunded items. Sellers receive the request and approve or reject it. Each seller response creates a snapshot of the request state and reason at that time. Approved cancellations cancel the item and restore stock. Remaining items in the order continue processing. Partial cancellations preserve the rest of the order and do not affect unrelated items. Sellers may reject without reason, but platform encourages justification.

### Cancellation Request Submission

WHEN a customer requests cancellation for an order item with status 'paid', THE system SHALL:
1. Require a reason (text, required)
2. Record the request with status 'pending'
3. Link the request to the order item, customer, and seller
4. Allow only one pending request per order item at a time

IF the order item status is not 'paid', THEN THE system SHALL reject the request.
IF an active pending cancellation request already exists for the same order item, THEN THE system SHALL reject the new request.

### Seller Approval Workflow

WHEN a seller reviews a pending cancellation request for their product, THE system SHALL:
1. Allow the seller to approve or reject the request
2. Require explicit approval or rejection (no timeout auto-approval)
3. Record the seller's decision and response timestamp
4. Notify the customer of the decision

IF the seller rejects the request, THEN THE system SHALL retain the item's current status.
IF the seller approves the request, THEN THE system SHALL proceed to cancellation processing.

### Snapshot Creation on Response

WHEN a seller responds to a cancellation request, THE system SHALL:
1. Create a snapshot capturing:
   - Request status at time of response ('pending', 'approved', or 'rejected')
   - Request reason text
   - Seller's decision and response timestamp
   - Seller ID who made the decision
2. Preserve the snapshot as immutable
3. Store the snapshot for audit and dispute resolution

THE snapshot SHALL NOT be deletable or modifiable by any user or system process.

### Stock Restoration on Approval

WHEN a cancellation request is approved, THE system SHALL:
1. Change the order item status to 'cancelled'
2. Create an inventory record with positive quantity change equal to the cancelled item's quantity
3. Set the inventory record reason to 'cancel'
4. Restore the variant stock quantity accordingly
5. Remove the cancelled item from active order fulfillment queues

THE stock restoration SHALL be recorded as a permanent inventory history entry.

### Partial Order Continuation

WHEN a cancellation request is processed for one order item, THE system SHALL:
1. Preserve all other order items in their current status
2. Allow unaffected items to proceed to shipping and delivery
3. Recalculate the order's overall status based on remaining items
4. Maintain separate cancellation status for each item in the order

IF all items in an order become cancelled, THEN THE system SHALL set the order status to 'cancelled'.
IF remaining items are delivered or refunded, THEN THE system SHALL compute a mixed status (e.g., 'partially completed').

## RefundRequest Actions

Customers request a refund for delivered order items within 7 days of delivery, including a reason. Refund requests are only accepted for delivered status items. Sellers approve or reject the request, creating a snapshot of the request state. Approved refunds restore stock and trigger refund payment. Refunded items do not restart shipping or affect other order items. Partial refunds allow remaining items to proceed normally. Customers cannot request a refund after 7 days from delivery, even if they have not received the item.

### Refund Request Submission

WHEN a customer requests a refund for an order item with status "delivered", THE system SHALL:
1. Require the customer to provide a reason for the refund
2. Record the customer who initiated the request
3. Link the request to the specific order item
4. Set the initial request status to "pending"
5. Allow optional text content but require at least one of reason or text

IF the order item status is not "delivered", THE system SHALL reject the request.
IF more than 7 days have passed since the item was delivered, THE system SHALL reject the request.
IF a refund request already exists for the same item with status "pending", THE system SHALL reject the duplicate request.

### 7-Day Refund Window Enforcement

WHEN calculating the 7-day refund eligibility window, THE system SHALL:
1. Use the delivery confirmation timestamp as the reference point
2. Count exactly 7 × 24 hours from delivery time
3. Allow refund requests if the request time is on or before the 7-day deadline
4. Reject refund requests if the request time is after the 7-day deadline

WHEN the delivery timestamp is not available, THE system SHALL:
1. Use the date when the customer confirmed delivery
2. If no confirmation exists, use the automatic delivery timestamp (7 days after shipping)

WHERE a customer has multiple units of the same product in one order, THE system SHALL:
1. Calculate the refund eligibility window per delivered shipment, not per order

### Seller Approval Workflow

WHEN a seller reviews a pending refund request, THE system SHALL:
1. Display the request reason, customer information, and order item details
2. Allow the seller to approve or reject the request with optional notes
3. Store the seller's decision and timestamp
4. Create a snapshot of the request state at the time of seller response

IF the seller approves the refund, THE system SHALL:
1. Update the order item status to "refunded"
2. Trigger stock restoration for the variant
3. Initiate refund payment processing
4. Notify the customer of the approval

IF the seller rejects the refund, THE system SHALL:
1. Update the request status to "rejected"
2. Notify the customer with the rejection reason
3. Keep the order item status unchanged

### Stock Restoration on Refund

WHEN a refund is approved, THE system SHALL:
1. Create an inventory record with positive quantity change
2. Set the reason to "refund"
3. Link the record to the product variant
4. Add the order ID and order item ID as reference identifiers

WHERE a product has multiple variants, THE system SHALL:
1. Restore stock only for the variant associated with the refunded item
2. Maintain separate inventory tracking for each variant

WHILE a refund request is pending, THE system SHALL:
1. Prevent the seller from deleting the associated product or variant
2. Allow inventory operations unrelated to the refund
3. Block inventory adjustments for the variant if they would compromise fulfillment capability

### Partial Refund Handling

WHEN a customer requests a refund for one item in an order containing multiple items, THE system SHALL:
1. Process the refund for only the selected order item
2. Keep other order items in their current status (paid, shipped, or delivered)
3. Preserve the overall order status based on remaining items

WHERE some items in an order are already refunded while others remain active, THE system SHALL:
1. Set the overall order status to "partially completed"
2. Maintain individual item statuses independently

WHEN all items in an order are refunded, THE system SHALL:
1. Update the overall order status to "refunded"
2. Record the final refund timestamp for the entire order

## Review Actions

Customers write one review per product per order after the item reaches 'delivered' status. Reviews include a 1–5 star rating and optional text content. Customers can edit or delete their reviews at any time; edits create snapshots. Reviews appear on the product detail page and contribute to the average rating. Deleted reviews remain in snapshots but no longer affect the rating. Reviews are sorted newest first. Customers cannot review a product they never purchased or that is not yet delivered.

### Review Creation Eligibility

WHEN a customer attempts to write a review for a product, THE system SHALL:
1. Verify that the customer has purchased at least one item of that product
2. Verify that the purchased item has reached 'delivered' status
3. Verify that the customer has not already written a review for that product in that order
4. Only allow review creation if all three conditions are met

IF the customer has not purchased the product, THE system SHALL reject the request.
IF the purchased item has not reached 'delivered' status, THE system SHALL reject the request.
IF the customer has already reviewed the product in that order, THE system SHALL reject the request.

### Rating-Only Option

WHEN a customer writes a review, THE system SHALL:
1. Require a rating between 1 and 5 stars (inclusive)
2. Allow optional text content
3. Accept submission even if text content is empty

IF the rating is outside the 1-5 range, THE system SHALL reject the request.
IF the rating is missing, THE system SHALL reject the request.

### Review Editing Workflow

WHEN a customer edits their review, THE system SHALL:
1. Allow editing of rating and/or text content
2. Preserve the original creation timestamp
3. Update the last edited timestamp
4. Require either rating or content to differ from current values

IF neither rating nor content differs from current values, THE system SHALL reject the request.
IF the new rating is outside the 1-5 range, THE system SHALL reject the request.
IF the review does not belong to the customer, THE system SHALL reject the request.

### Snapshot Capture on Edit

WHEN a review is edited, THE system SHALL:
1. Create a new review snapshot record
2. Store the previous rating and text content in the snapshot
3. Record the edit timestamp and snapshot type 'edit'
4. Preserve the original snapshot as immutable
5. Update the current review with new values after snapshot creation

WHILE a review snapshot exists, THE system SHALL:
1. Prevent deletion of the snapshot
2. Allow administrators to view the snapshot for dispute resolution
3. Allow the original reviewer to view their edit history

THE system SHALL include the snapshot in review edit history but not in the product's average rating calculation.

### Average Rating Calculation

WHEN calculating a product's average rating, THE system SHALL:
1. Include all non-deleted reviews for that product
2. Exclude reviews where the customer has deleted their account
3. Exclude reviews linked to deleted review snapshots
4. Calculate the average as the sum of ratings divided by the count of included reviews
5. Round to one decimal place

WHEN a review is edited, THE system SHALL:
1. Recalculate the product's average rating using the updated rating value
2. Preserve the historical average for the product snapshot at time of order

WHEN a review is deleted, THE system SHALL:
1. Exclude the review from future average rating calculations
2. Immediately recalculate the product's average rating
3. Preserve the historical average for existing order snapshots

## ReviewSnapshot Actions

Every review edit creates an immutable snapshot preserving rating and text content as of that edit. Snapshots ensure accurate audit trails and support dispute resolution. Review snapshots are not editable or deletable. Sellers and administrators may view review snapshots. When reviewing historical product ratings, snapshots reflect the review state at the time of purchase, not later edits. Customers can view their own review history via snapshots. Snapshot versioning enables chronological review evolution tracking.

### Review Snapshot Creation

WHEN a customer edits an existing review, THE system SHALL automatically create a review snapshot.

WHEN a review is created for the first time (no prior edit), THE system SHALL create a review snapshot with initial rating and text content.

THE system SHALL include the following data in each review snapshot:
1. Rating value at the time of edit
2. Text content at the time of edit (may be null)
3. Timestamp of the edit
4. Reference to the original review

WHILE a review exists, THE system SHALL maintain a full history of review snapshots showing all editions.

### Review Edit Immutability

WHEN a review snapshot is created, THE system SHALL prevent any modification to its contents.

THE system SHALL store review snapshots in an immutable format that cannot be altered, deleted, or overwritten.

IF an attempt is made to modify a review snapshot, THE system SHALL reject the request.

Review snapshots SHALL persist even after the original review is deleted by the customer.

### Historical Rating Retrieval

WHEN a customer views their review history, THE system SHALL display each review snapshot in chronological order.

WHEN a product detail page is viewed, THE system SHALL calculate the average rating using only the latest version of each non-deleted review.

WHEN reviewing historical product ratings for a specific point in time, THE system SHALL retrieve ratings from snapshots taken at that time.

IF a review was edited multiple times, THE system SHALL preserve all snapshots so historical rating states are fully reconstructible.

### Seller Snapshot Access

WHEN a seller views product details for their shop, THE system SHALL allow them to view review snapshots for reviews associated with those products.

SELLERS SHALL be able to view the full edit history of reviews, including all snapshot versions.

Sellers SHALL NOT be able to modify or delete any review snapshots.

WHEN a seller views a review snapshot, THE system SHALL display the timestamp of the edit, rating value, and text content (if any).

### Customer Review History View

WHEN a customer views their own review history, THE system SHALL display all their review snapshots in reverse chronological order.

THE system SHALL indicate which snapshot represents the current version of each review.

WHEN a customer views a specific review snapshot, THE system SHALL show the rating, text content (if provided), and edit timestamp.

IF a customer deletes a review, THE system SHALL retain all snapshots for audit purposes and make them viewable to the customer.

WHEN displaying review snapshots, THE system SHALL clearly distinguish between the latest snapshot and prior versions.

## AdminRequest Actions

Users submit a request to become an administrator with a reason. Requests are pending until reviewed by super administrators. Super administrators approve or reject with optional notes. Rejected requests may be resubmitted with revisions. Approved users become regular administrators and gain oversight access. Suspended or banned users cannot submit new admin requests. Admin requests are not linked to user profile edits or role changes after creation. Request history is preserved for audit but status cannot be changed retroactively.

### Admin Request Submission

WHEN a user submits an admin request, THE system SHALL:
1. Require a reason (text description)
2. Set the initial status to pending
3. Record the timestamp of submission
4. Prevent submission if the user already has a pending admin request
5. Prevent submission if the user is currently banned
6. Prevent submission if the user is already an administrator

THE system SHALL reject the request if the reason is missing or empty.

### Super Administrator Approval

WHEN a super administrator reviews an admin request, THE system SHALL:
1. Allow approval with optional approval notes
2. On approval, assign the user the regular administrator role
3. Set the request status to approved
4. Record the approver and timestamp

WHEN a super administrator rejects an admin request, THE system SHALL:
1. Require rejection notes (reason)
2. Set the request status to rejected
3. Record the approver and timestamp

### Request Resubmission Flow

WHEN an admin request is rejected, THE system SHALL:
1. Preserve the rejected request and its notes for audit
2. Allow the user to submit a new request with revised information
3. Set the new request status to pending
4. Create a new request record (not update the previous one)

THE system SHALL NOT allow resubmission if the user is banned or already an administrator.

### Status Tracking Workflow

WHEN a user views their admin request history, THE system SHALL:
1. Show all submitted requests with status (pending|approved|rejected)
2. Include submission timestamp and review timestamp
3. Display rejection reasons when status is rejected
4. Display approval notes when status is approved

WHEN a super administrator views pending requests, THE system SHALL:
1. List all pending requests with submitter information
2. Sort requests by submission time (oldest first)
3. Allow filtering by submitter role (customer|seller)

## AdminRole Actions

Super administrators promote regular administrators to super or demote them, except themselves. Demotion or promotion updates the role record with new grade and timestamp. Super administrators can see all admin roles and their grades. Admin roles are unique per user and reflect current permissions. Role changes are immediate and affect dashboard and action access. Regular administrators cannot promote or demote others; only super administrators have this authority. Role history is preserved, but only the latest grade determines permissions.

### Role Promotion Workflow

WHEN a super administrator promotes a regular administrator to super administrator, THE system SHALL:
1. Update the AdminRole record with grade 'super'
2. Record the timestamp of the promotion
3. Require explicit approval by the super administrator
4. Log the actor (super administrator) who performed the promotion

THE system SHALL NOT allow a regular administrator to perform promotions.
WHILE the target user is not currently a super administrator, THE system SHALL allow promotion.
IF the target user is already a super administrator, THE system SHALL reject the request.

### Super Admin Demotion Authority

WHEN a super administrator demotes another super administrator to regular administrator, THE system SHALL:
1. Update the AdminRole record with grade 'regular'
2. Record the timestamp of the demotion
3. Require explicit approval by the demoting super administrator
4. Log the actor (demoting super administrator) who performed the demotion

WHEN a super administrator demotes a regular administrator, THE system SHALL:
1. Update the AdminRole record with grade 'regular' (if currently 'super')
2. Record the timestamp of the demotion

THE system SHALL NOT allow demotion if the target user is the demoting super administrator.
THE system SHALL allow only super administrators to perform demotions.
IF a regular administrator attempts to demote another user, THE system SHALL reject the request.

### Self-Demotion Prevention

WHEN a super administrator attempts to demote their own role, THE system SHALL reject the request.

THE system SHALL compare the super administrator's userId with the target userId before any demotion operation.
IF the super administrator is the target user, THE system SHALL reject the request with a validation error.

WHILE a super administrator tries to promote themselves, THE system SHALL allow the action (promotion to same grade is permitted).

IF a super administrator attempts to change their own grade to any value via demotion, THE system SHALL reject the request.

### Role-Based Access Control

WHEN a user accesses a dashboard or action requiring administrator permissions, THE system SHALL:
1. Check the current grade in AdminRole
2. Allow access only if the grade matches required level
3. Update the user's effective permissions based on current grade

THE system SHALL use AdminRole.grade to determine dashboard access:
- 'regular' grade grants regular admin dashboard
- 'super' grade grants both regular and super admin dashboard

WHILE a user has no AdminRole record, THE system SHALL treat them as non-admin.

THE system SHALL deny access to promotion/demotion actions when the acting user's AdminRole grade is 'regular'.

WHEN a user's AdminRole grade changes, THE system SHALL update all session and access control context immediately.

### Permission Update Immediacy

WHEN an AdminRole grade change occurs, THE system SHALL:
1. Immediately update in-memory and session-based permission state
2. Reflect the new grade in all subsequent authorization checks
3. Log the permission change with timestamp and actor

WHILE a super administrator performs a promotion or demotion, THE system SHALL apply the new grade before completing the request.

IF a user with an updated AdminRole grade attempts an action within the same session, THE system SHALL evaluate permissions using the new grade.

WHEN a dashboard or operation loads for a user, THE system SHALL read the current AdminRole grade for permission evaluation.

THE system SHALL NOT buffer or delay permission updates; all changes are effective immediately.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

When a user attempts to register with an email that already exists, the system rejects the registration and prompts them to log in or recover their password. Login attempts with incorrect credentials fail silently to avoid revealing user existence. Users who submit registration requests with invalid email formats are notified of proper formatting. Account deletion by a user fails if they are a seller with pending orders or unresolved requests, and they must resolve those first. Sellers attempting to delete their account while having active orders are blocked and shown which orders prevent deletion. Users cannot log in if their account has been banned by an administrator; they see only a generic suspension message. Duplicate login attempts from the same session are silently ignored to prevent session conflicts. Password reset tokens expire after a defined period, and users must re-request resets if expired. Users may only have one active account per email, regardless of role (customer/seller/admin).

### Duplicate Email Registration

WHEN a user attempts to register with an email address that already exists in the system, THE system SHALL reject the registration request.

IF an email address is already registered for any role (customer, seller, or admin), THE system SHALL return a generic "email already in use" message.

THE system SHALL NOT reveal which role or user type is associated with the existing email address.

### Invalid Email Format Handling

WHEN a user submits registration or login with an email that does not match standard email format (e.g., missing '@', invalid domain), THE system SHALL reject the input.

IF the email format is invalid, THE system SHALL prompt the user to enter a valid email address without specifying exact format requirements.

THE system SHALL validate email format before attempting any user lookup or account creation.

### Existing User Login Prompt

WHEN a user attempts to register with an email that already exists, THE system SHALL prompt them to log in or use password recovery.

THE system SHALL NOT suggest whether the existing account is active, suspended, or deleted.

IF the user selects "log in", THE system SHALL redirect them to the login page.

### Account Deletion with Active Orders

WHEN a customer attempts to delete their account while having active orders (paid, shipped, or delivered), THE system SHALL block the deletion.

IF the customer has pending cancellation or refund requests, THE system SHALL block account deletion.

WHEN deletion is blocked, THE system SHALL display which orders and requests prevent deletion.

### Suspended Account Login Blocking

WHEN a user with a suspended account attempts to log in, THE system SHALL deny authentication.

THE system SHALL NOT reveal that the account exists or why access was denied.

IF login is denied due to suspension, THE system SHALL return a generic "invalid credentials" response.

### Password Reset Token Expiration

WHEN a user attempts to reset their password using an expired token, THE system SHALL reject the request.

IF the token has expired, THE system SHALL prompt the user to request a new password reset.

THE system SHALL NOT reveal whether the email address exists or whether the token was invalid.

### Role-Based Account Uniqueness

WHEN a user registers with an email that already exists for another role (e.g., customer tries to register as seller), THE system SHALL reject the registration.

IF an email is already in use by any user type, THE system SHALL prevent creation of a new account with that email regardless of role.

THE system SHALL maintain email uniqueness across all roles (customer, seller, admin).

### Nonexistent User Masking

WHEN a user attempts to log in with a non-existent email, THE system SHALL return a generic "invalid credentials" response.

IF a user enters an incorrect password for an existing account, THE system SHALL NOT indicate whether the email was valid.

THE system SHALL treat nonexistent and incorrect password attempts identically to prevent user enumeration

## CustomerProfile Error Scenarios

Customers attempting to update their phone number with an invalid format are prevented and shown a clear validation message. Display name changes must not duplicate another active user’s display name; conflicts are flagged and resolution is requested. When a customer deletes their account, associated profile data is removed automatically, but orphaned references in orders or reviews remain intact as 'deleted user'. If two profiles are edited simultaneously with overlapping fields, the last write wins with no conflict warning, as profile edits are idempotent. Email updates are not allowed—only login credential changes are possible, and profile email cannot be altered separately. Customers cannot add phone numbers that are already in use by another customer profile. Phone number changes trigger account-wide notifications only if valid and unique per system rules. Profile updates during order processing do not affect already-placed orders, preserving snapshot integrity.

### Invalid Phone Format

WHEN a customer submits a phone number that does not conform to the expected international format, THE system SHALL reject the update and display a clear validation message indicating the required format.

IF the submitted phone number contains non-numeric characters (except leading '+' for international dialing code) or has fewer than 7 digits or more than 15 digits, THE system SHALL reject the update.

WHILE the customer is editing their profile, THE system SHALL validate phone number format in real time only after form submission, not during typing.

### Duplicate Display Name

WHEN a customer attempts to update their display name to a value already used by another active customer profile, THE system SHALL reject the update and indicate that the display name is unavailable.

IF the display name matches an existing active user's display name (case-insensitive, trimmed whitespace), THE system SHALL reject the update.

INACTIVE accounts (deleted, banned, or unverified) are excluded from duplicate detection—only active profiles are considered.

THE system SHALL allow temporary profile name changes during account migration if explicitly flagged by administrators.

### Profile Cleanup on Account Deletion

WHEN a customer account is deleted, THE system SHALL automatically delete the associated CustomerProfile record.

THE system SHALL preserve all historical references to the deleted customer in orders and reviews by anonymizing profile data to "deleted user" without removing records.

Profile deletion occurs only after confirming no active sessions exist and no pending order items are associated with the account.

Profile snapshots (e.g., from order creation) remain intact and are not deleted during account cleanup.

### Phone Number Uniqueness Constraint

WHEN a customer attempts to add or update a phone number that is already assigned to another active customer profile, THE system SHALL reject the operation.

THE system SHALL enforce uniqueness across all active profiles regardless of account role.

INACTIVE profiles (deleted or banned) do not prevent reuse of their phone number by other customers.

A customer may update their own phone number even if it matches their previously used (now deleted) profile phone number.

### Profile Edit Isolation from Active Orders

WHILE a customer has active orders (paid, shipped, or delivered status), THE system SHALL allow profile edits (display name, phone number) without affecting those orders.

THE system SHALL NOT propagate profile changes to historical order items—each order retains the profile snapshot captured at purchase time.

Profile edits made during order processing are immediately effective for new orders, but order items already created use the old profile data.

If a profile edit fails, the previous profile data remains unchanged, ensuring consistency for any in-progress orders.

### Email Immutability in Profile

THE system SHALL NOT allow customers to change the email address stored in the CustomerProfile—even if they also update login credentials.

IF a customer attempts to submit a new email address in their profile form, THE system SHALL ignore the field and retain the original email value.

Email change is only permitted via account registration or recovery workflows—not profile editing.

The email address used for login is always the original registration email and is preserved in historical records like orders, regardless of profile edits.

### Last-Write-Wins Conflict Behavior

WHEN two profile updates are submitted concurrently for the same customer, THE system SHALL apply the last received update without warning or conflict resolution.

THE system SHALL NOT use optimistic locking or version numbers to detect concurrent edits to CustomerProfile.

Profile updates are idempotent—the final state reflects the latest request regardless of timing.

Snapshots are still created for individual edits, allowing audit of the sequence, but no rollback or merge is attempted.

## SellerProfile Error Scenarios

Sellers cannot submit profile edits (shop name, description, logo) while their account is suspended; attempts are rejected and explained. Shop name must be unique across all sellers; duplicate submissions are blocked and sellers are asked to choose another. During profile edits, logo uploads larger than the allowed size are rejected before storage. Seller profile snapshots are not created on suspended sellers’ behalf—changes are only recorded when active. Sellers with rejected registration attempts may reapply but cannot reuse the same shop name until approval status is reviewed. If a seller deletes their account, the profile is deleted only after confirming no pending orders or requests, and snapshots of past profile states remain in order history. Profile edits while marketplace is under maintenance succeed but snapshot creation is deferred until maintenance ends.

### Suspended Profile Edit Denial

WHEN a seller with a suspended account attempts to edit their shop profile (shop name, description, or logo), THE system SHALL reject the request.\n\nWHEN a seller attempts to edit their shop profile while their account is suspended, THE system SHALL provide a clear rejection message indicating account suspension.\n\nWHILE a seller’s account is in suspended status, THE system SHALL prohibit all profile editing operations (shop name, shop description, logo upload/edit).

### Duplicate Shop Name Rejection

WHEN a seller submits a shop name that already exists for another active seller, THE system SHALL reject the request.\n\nWHEN a shop name duplication is detected, THE system SHALL provide the seller with an actionable message indicating the shop name is already in use and must be unique.\n\nTHE system SHALL enforce shop name uniqueness across all approved and pending seller accounts.

### Logo Size Limit Enforcement

WHEN a seller uploads a logo image larger than 10MB, THE system SHALL reject the upload before processing or storage.\n\nTHE system SHALL validate logo file size during upload and deny requests exceeding the 10MB limit.\n\nWHEN logo file size exceeds the allowed limit, THE system SHALL provide a rejection message specifying the maximum file size allowed.

### Profile Edit During Suspension

WHEN a seller attempts to edit their profile while account suspension is active, THE system SHALL NOT generate a profile snapshot.\n\nTHE system SHALL retain the most recent valid snapshot and defer any snapshot creation until the seller account is unsuspended.\n\nIF a suspension ends concurrently with a profile edit request, THE system SHALL validate the account status before proceeding and creating a snapshot.

### Shop Name Uniqueness Constraint

THE system SHALL ensure shop names are globally unique across all sellers in the platform.\n\nWHEN a seller attempts to register or change their shop name to one already used by another active seller, THE system SHALL block the operation.\n\nReused shop names (e.g., from a previously deleted or rejected seller) SHALL remain unavailable until at least 90 days have passed since last use.

### Profile Deletion Preconditions

WHEN a seller attempts to delete their profile, THE system SHALL verify that no pending orders (paid or shipped status) exist for their products.\n\nWHEN a seller attempts to delete their profile, THE system SHALL verify that no pending cancellation or refund requests exist for their products.\n\nIF pending orders or requests exist, THE system SHALL reject the profile deletion request and provide a list of blocking items.

### Maintenance-Aware Snapshot Deferral

WHEN a profile edit occurs during platform maintenance windows, THE system SHALL allow the edit but defer snapshot creation until maintenance ends.\n\nWHILE the platform is under maintenance, THE system SHALL store the edited values transiently without creating a permanent snapshot until maintenance completes.\n\nIF maintenance ends before the edit is persisted, THE system SHALL discard all unsaved profile changes and notify the seller.

## Address Error Scenarios

Customers cannot add an address if all required fields (recipient name, phone, street, city, state, postal code, country) are not provided; partial data is rejected. When setting a new default address, existing defaults are silently overridden. Deleting an address that is currently set as default automatically reassigns the next most recent address as default. If a customer tries to use an address not owned by them (e.g., via direct request ID manipulation), the operation fails with access denied. Address edits cannot change ownership; only the owning customer may modify it. Addresses linked to active or shipped orders cannot be deleted; deletion fails until orders are completed. When a customer deletes their account, all associated addresses are removed without affecting other users’ addresses. Customers may have up to a reasonable number of saved addresses—exceeding this triggers an error prompt to delete unused ones.

### Required Field Validation

WHEN a customer submits a new address, THE system SHALL reject the request if any required field (recipient name, phone number, street address, city, state/province, postal code, country) is missing or empty.

IF the submitted data contains only partial values, THE system SHALL reject the request.

WHERE address fields are submitted with whitespace-only values, THE system SHALL treat them as missing and reject the request.

### Default Address Reassignment

WHEN a customer sets a new address as default shipping address, THE system SHALL automatically reassign that address as default without requiring explicit unsetting of the previous default.

WHILE multiple addresses exist for a customer, THE system SHALL ensure exactly one address is marked as default at all times.

IF no address is explicitly set as default, THE system SHALL designate the most recently created address as default when the first address is added.

### Default Address Deletion Protection

WHEN a customer attempts to delete an address that is currently set as default, THE system SHALL prevent deletion and return an error.

THE system SHALL require the customer to first select a new default address or mark another address as default before deleting the current default address.

### Ownership-Based Access Control

WHEN a customer attempts to view, edit, or delete an address not owned by them, THE system SHALL reject the request with access denied.

IF a request includes an address ID belonging to a different customer, THE system SHALL ignore it and return an access error regardless of authentication status.

WHERE address ownership is ambiguous, THE system SHALL verify ownership using the authenticated user's ID before performing any operation.

### Address Locking During Active Orders

WHEN a customer attempts to delete an address that is currently associated with an order having status paid, shipped, or delivered, THE system SHALL prevent deletion and return an error.

THE system SHALL allow deletion of addresses only when no active or completed orders reference them.

IF an address is used in a historical order that has been fully completed (delivered or cancelled), THE system SHALL allow deletion after the order reaches completed status.

### Account Deletion Cascading Cleanup

WHEN a customer deletes their account, THE system SHALL automatically delete all addresses associated with that customer.

WHILE preserving order history and snapshots, THE system SHALL remove all address records that reference the deleted account.

WHERE addresses are shared across accounts (theoretically impossible per model), THE system SHALL ensure no cross-account deletion occurs by strictly enforcing one-to-many address-user relationship.

### Maximum Address Count Limit

WHEN a customer attempts to add an address beyond the maximum allowed number, THE system SHALL reject the request and prompt the customer to delete unused addresses.

THE system SHALL track the total number of addresses per customer and enforce a reasonable limit.

IF a customer exceeds the limit due to system error, THE system SHALL prevent further additions until the count falls within limits.

## Category Error Scenarios

Administrators attempting to create a subcategory when no parent category is selected are prompted to choose a valid parent; nesting beyond one level is strictly prevented. Category deletion fails if any products are still assigned to it; administrators must first reassign or clear products. If two administrators attempt to rename the same category simultaneously, the system resolves to the last successful update with no conflict notification. Category names must be unique only within the same parent, allowing identical names under different parents. Categories cannot be renamed to match an existing sibling name—duplicate sibling names are blocked. Attempting to view products in a deleted category shows a graceful fallback (e.g., ‘uncategorized’ or empty state). Deleting a parent category does not delete its subcategories, but leaves them orphaned until re-parented or deleted.

### Category Error Scenarios

WHEN an administrator attempts to create a subcategory without selecting a parent category, THE system SHALL reject the request and prompt them to choose a valid parent category.

WHEN an administrator attempts to create a subcategory with a parent that already has a subcategory of the same name, THE system SHALL reject the request to prevent duplicate sibling names.

WHEN an administrator attempts to nest a subcategory deeper than one level (e.g., creating a subcategory under an existing subcategory), THE system SHALL reject the request and enforce a maximum nesting depth of one.

WHEN an administrator attempts to delete a category that still has products assigned to it, THE system SHALL reject the deletion and require the administrator to reassign or clear products first.

WHEN an administrator attempts to rename a category to match the name of an existing sibling category (same parent), THE system SHALL reject the rename to maintain unique category names within the same parent.

WHEN a customer attempts to view products in a category that has been deleted, THE system SHALL display a graceful fallback such as ‘uncategorized’ products or an empty state with no errors.

WHEN a parent category is deleted, all its subcategories become orphaned, and THE system SHALL prevent new subcategories from being added to them until they are either re-parented or individually deleted.

## Product Error Scenarios

Sellers attempting to create a product without selecting a category are blocked; products require a non-deleted category. Product names must be unique per seller but may duplicate across sellers. Deleting a product with active inventory records is allowed only if no variants have pending orders or requests; otherwise, deletion is blocked and sellers see which variants prevent removal. Products without any variants become unavailabil—visible in search but disabled for purchase. Editing a product’s category may break inventory linkage if the new category lacks required fields, but this is prevented via validation. When a seller’s account is suspended, their products are hidden, not deleted, and remain in snapshot history. Product edits during checkout race conditions are handled by locking the product record briefly to prevent overselling. Duplicate product creation by rapid submission is prevented via rate limiting on product save endpoints.

### Required Category Selection

WHEN a seller attempts to create a product without selecting a category, THE system SHALL reject the request and display an error: "Category is required. Please select a valid category."

### Product Name Uniqueness Per Seller

WHEN a seller attempts to create a product with a name already used by another product under the same seller, THE system SHALL reject the request and display an error: "A product with this name already exists in your shop. Product names must be unique per seller."

### Inventory-Pending Deletion Lock

WHEN a seller attempts to delete a product that has variants with pending order items (paid or shipped status) or pending cancellation/refund requests, THE system SHALL reject the deletion, identify the blocking variants, and display: "Cannot delete product: variants [list of SKU codes] have pending order items or requests. Complete or cancel those first."

### Unavailable Product Handling

WHEN a product has no variants, THE system SHALL keep it visible in search and category listings but mark it as "unavailable" and disable purchase actions.

### Category Edit Integrity Checks

WHEN an administrator edits a category, and that category is used by existing products, THE system SHALL ensure category edits do not break inventory linkage by preserving required category fields and preventing structural changes that would invalidate product references.

### Suspended Seller Product Masking

WHEN a seller’s account is suspended, THE system SHALL hide their products from search results, category listings, and product detail pages (while preserving snapshots and historical order data).

### Checkout-Time Edit Locking

WHEN a customer initiates checkout while a product they added is being edited by the seller, THE system SHALL lock the product record briefly during checkout to prevent overselling and ensure price/stability consistency.

### Duplicate Product Prevention

WHEN a seller submits two product creation requests simultaneously with identical data, THE system SHALL reject the second request with an error: "Product creation is rate-limited. Please try again later."

## ProductImage Error Scenarios

Image uploads exceeding the maximum file size fail silently, and sellers receive no error details to avoid exposing system limits. Attempting to reorder images while the product is in draft mode (no variants yet) succeeds, but reordering during active orders locks the product briefly. Deleting the main image (first in order) automatically reassigns the next image as thumbnail. Uploading more images than the system limit (e.g., 10) is blocked before storage. Duplicate images (same content uploaded twice) are detected and rejected, preventing storage waste. Image deletion during snapshot creation is disallowed—images in active product snapshots cannot be modified. When a product is deleted, all its images are removed and no longer accessible—even if referenced in old snapshots, image URLs become invalid.

### File Size Limit Enforcement

WHEN a seller uploads an image exceeding the maximum file size (10MB), THE system SHALL reject the upload and store no record of the attempt.

WHEN a seller uploads an image exactly at the 10MB limit, THE system SHALL accept the upload as valid.

IF the uploaded image file is corrupted or unreadable, THE system SHALL reject the upload without generating a product image record.

### Image Ordering During Edit Locks

WHEN a seller attempts to reorder images while the associated product has pending paid or shipped items, THE system SHALL lock reordering and display a warning.

WHEN a seller successfully reorders images during a product edit, THE system SHALL update the sort order but NOT create a product snapshot unless other product fields are modified.

IF reorder attempts occur during a concurrent product snapshot creation, THE system SHALL reject the reorder request.

### Main Image Fallback Reassignment

WHEN the main image (first in sort order) is deleted, THE system SHALL automatically reassign the new first image as the main/thumbnail image.

WHEN a product has only one image and it is deleted, THE system SHALL set the main image flag to null and allow continued product operation.

IF the main image is removed and no other images remain, THE system SHALL mark the product as missing main image for internal reporting, but the product remains viewable with placeholder display.

### Maximum Image Count Cap

WHEN a seller attempts to upload more than 10 images for a product, THE system SHALL block the upload and indicate the maximum count has been reached.

WHEN a seller uploads exactly 10 images, THE system SHALL accept the final image as valid.

IF a seller tries to upload an 11th image after reaching the cap, THE system SHALL reject it even if other images were deleted since the last upload.

### Duplicate Image Detection

WHEN a seller uploads an image identical to one already associated with the same product, THE system SHALL reject the duplicate upload and retain only the original.

WHEN duplicate detection determines two images are identical (by content hash), THE system SHALL provide no error message to the seller to avoid exposing internal hashing logic.

IF a seller re-uploads an image previously deleted from a product, THE system SHALL allow it only if the content hash differs from any existing image for that product.

### Snapshot-Based Deletion Lock

WHEN a seller attempts to delete an image that is included in an active product snapshot, THE system SHALL reject the deletion.

WHEN a product snapshot is created, THE system SHALL lock any images used in that snapshot until the snapshot is preserved permanently.

IF deletion of an image is attempted during an active order snapshot process, THE system SHALL defer the operation until the snapshot is finalized.

### Cascade Product Image Cleanup

WHEN a product is deleted, THE system SHALL automatically remove all associated images from storage.

WHEN a product image record is deleted (via snapshot cleanup or bulk admin action), THE system SHALL only delete the image file if no other product uses the same image URL.

IF a product is restored from deletion (via administrative override), THE system SHALL restore its associated images only if they are still available in storage.

## ProductVariant Error Scenarios

Sellers cannot add a variant with a SKU code that already exists for the same product; duplicates are rejected with a clear message. Price overrides must be numeric and may not be negative, or they trigger validation failure. Stock quantity cannot be set below zero during restock adjustments—negative values are rejected. Deleting a variant with pending order items (paid or shipped) fails until orders complete or cancel; sellers are shown which items block deletion. Editing a variant’s options during an active order locks the variant and prevents changes until the order state stabilizes. Creating a variant with out-of-stock inventory is allowed, but the variant is marked unavailable in the storefront. If a variant is updated while a snapshot is being taken, the system waits for snapshot completion before applying changes to avoid race conditions. SKU code case sensitivity follows platform rules—uppercase and lowercase variants are treated as distinct unless normalized per policy.

### Duplicate SKU Rejection

WHEN a seller attempts to create a product variant with a SKU code that already exists for the same product, THE system SHALL reject the request.

IF the SKU code already exists for another variant of the same product, THE system SHALL provide a clear message that the SKU must be unique per product.

THE system SHALL preserve the original variant when rejection occurs, with no side effects on existing inventory or order items.

### Negative Price Rejection

WHEN a seller enters a price override for a product variant, THE system SHALL reject values that are negative.

THE system SHALL require price overrides to be zero or positive numeric values.

WHEN the price is out of valid range, THE system SHALL prevent the variant from being saved until corrected.

### Negative Stock Prevention

WHEN a seller attempts to restock a product variant with a negative quantity, THE system SHALL reject the request.

WHEN a seller attempts to adjust inventory with a negative quantity change that would result in negative stock, THE system SHALL reject the request.

WHEN inventory deduction is attempted due to order placement and stock reaches zero, THE system SHALL allow the deduction but mark the variant as out of stock.

### Pending Order Variant Lock

WHEN a seller attempts to delete a variant that has pending order items with status paid or shipped, THE system SHALL prevent deletion and show which specific items are blocking.

WHILE any order item for a variant has status paid or shipped, THE system SHALL prevent variant option changes.

WHEN all associated order items reach cancelled, refunded, or delivered status, THE system SHALL allow variant deletion and editing.

### Active Order Edit Prevention

WHEN a variant is associated with an order in paid, shipped, or delivered status, THE system SHALL prevent editing of the variant’s option values.

WHEN a seller attempts to edit option values of a variant linked to active orders, THE system SHALL block the edit and indicate which orders prevent modification.

THE system SHALL allow editing of SKU code, price override, and stock quantity only when no associated orders are in progress.

### Out-of-Stock Variant Visibility

WHEN a product variant has stock quantity of zero, THE system SHALL display it as "out of stock" to customers.

WHILE a variant is out of stock, THE system SHALL prevent it from being added to the shopping cart.

THE system SHALL still allow out-of-stock variants to appear in search results and category listings, with appropriate status indicators.

### Snapshot-Variant Race Handling

WHILE a product snapshot is being created, THE system SHALL delay any variant edits for that product until snapshot completion.

IF a variant edit is initiated during a snapshot, THE system SHALL queue the edit and apply it only after snapshot creation succeeds.

THE system SHALL preserve variant state in the snapshot exactly as it existed at the moment snapshot capture began, with no interleaved changes.

### SKU Normalization Policy

WHEN a seller enters a SKU code, THE system SHALL treat uppercase and lowercase variants as distinct unless the platform specifies normalization.

IF SKU normalization is enabled, THE system SHALL convert all SKU codes to a consistent case (e.g., uppercase) before uniqueness validation.

WHEN a duplicate SKU is detected after normalization, THE system SHALL reject the new variant and indicate the existing SKU conflict.

## ProductSnapshot Error Scenarios

Snapshot creation fails silently if the associated product is deleted before the snapshot process completes; no orphaned snapshots are left. Administrators can view any product snapshot, but sellers can only view snapshots of their own products. Modifying the original product after snapshot creation does not retroactively change the snapshot—snapshots are immutable. If two edits occur nearly simultaneously, only one snapshot is created—the first one succeeds, and the second triggers a new snapshot after. Deleting a product does not delete its snapshots; they persist for dispute resolution. Snapshot access is blocked if the user lacks ownership or admin privileges—even if snapshot URL is guessed, access is denied. When a snapshot is requested for a non-existent product, the system returns an empty result rather than an error, preserving interface stability.

### Orphaned Snapshot Prevention

WHEN a product is deleted, THE system SHALL preserve all associated product snapshots for dispute resolution.
IF a product snapshot creation process starts but the associated product no longer exists during persistence, THE system SHALL discard the incomplete snapshot record.
WHEN a product is deleted, THE system SHALL NOT remove any existing product snapshots.
IF a product snapshot already exists when the product is deleted, THE system SHALL retain that snapshot with no changes.
WHERE a product is deleted, THE system SHALL preserve seller and category references in the snapshot even if those entities are later modified or removed.

### Ownership-Based Access Control

WHEN a seller attempts to view a product snapshot, THE system SHALL allow access only if the seller owns the product.
WHEN a seller attempts to view a product snapshot of another seller’s product, THE system SHALL deny access and return an empty result.
WHEN an administrator attempts to view any product snapshot, THE system SHALL grant access.
WHEN a customer attempts to view a product snapshot, THE system SHALL deny access unless the customer is an administrator.
WHEN a user attempts to view a product snapshot via direct URL or identifier guess, THE system SHALL verify ownership or administrative privileges before returning the snapshot.

### Immutable Snapshot Guarantee

WHEN a product is edited and a snapshot is created, THE system SHALL preserve the exact state of the product, its images, and variants at the moment of creation.
IF a product is modified after snapshot creation, THE system SHALL NOT alter the corresponding snapshot.
WHEN a snapshot is requested, THE system SHALL return the original state without any changes, even if the source product has been deleted or modified.
WHERE a product snapshot includes variants, THE system SHALL preserve variant options, SKU codes, and prices exactly as recorded at snapshot time.
IF a product’s base price changes after snapshot creation, THE system SHALL NOT update the price stored in the snapshot.

### Concurrent Edit Snapshot Deduplication

WHEN two edit requests for the same product occur nearly simultaneously, THE system SHALL ensure only one snapshot is created from the first successful edit.
IF the second edit request completes before the snapshot from the first edit is finalized, THE system SHALL create a second snapshot capturing the newer state.
WHEN a snapshot creation is in progress, THE system SHALL NOT prevent additional edits but shall queue or defer snapshot creation until the current state is captured.
WHERE snapshot creation fails, THE system SHALL NOT store a partial or inconsistent snapshot.
IF two edits occur within the same transaction context, THE system SHALL create a single snapshot reflecting the final state.

### Product Deletion Snapshot Preservation

WHEN a seller deletes a product, THE system SHALL retain all associated product snapshots indefinitely for dispute resolution.
IF a product is deleted, THE system SHALL preserve the product name, description, category, and image references stored in the snapshot.
WHEN a product snapshot includes variants, THE system SHALL retain all variant snapshots even after the original product or variants are deleted.
WHERE a product is deleted by an administrator, THE system SHALL NOT delete or invalidate existing product snapshots.
IF a snapshot is requested for a product that has been deleted, THE system SHALL return the snapshot if it exists.

### Unauthorized Snapshot Access Blocking

WHEN a non-admin user attempts to access a product snapshot for a product they do not own, THE system SHALL block the request.
IF a user attempts to access a product snapshot by guessing its identifier, THE system SHALL verify ownership or administrative privileges before returning data.
WHEN a seller attempts to access a snapshot of a product from another seller, THE system SHALL return an empty result.
WHEN a customer attempts to access a product snapshot, THE system SHALL deny access unless the customer is also an administrator.
WHERE snapshot access is blocked, THE system SHALL return a generic error without revealing whether the snapshot exists.

### Nonexistent Product Snapshot Handling

WHEN a snapshot is requested for a product that no longer exists, THE system SHALL return an empty result rather than an error.
IF a snapshot request references a non-existent snapshot ID, THE system SHALL return an empty result.
WHEN a user searches for snapshots of a product they do not own or an admin snapshot view of a non-existent product, THE system SHALL return an empty list.
IF a snapshot link is generated for a product before snapshot creation, THE system SHALL treat it as a no-op and not create an orphaned record.
WHERE snapshot preservation fails due to system error, THE system SHALL log the failure internally but not expose internal error details.

## ProductSnapshotVariant Error Scenarios

Snapshot variants cannot be created independently—each must belong to an existing product snapshot; orphaned variants are rejected. Option values must be JSON-serializable and conform to the expected format (e.g., key-value pairs); invalid JSON fails snapshot creation. If a product variant is deleted before its snapshot captures it, the snapshot may record only partial data, but the system ensures the snapshot remains consistent (e.g., with null fields). Duplicate snapshots (same product, same edit time) cannot have duplicate variants—SKU-level uniqueness is enforced. Editing a snapshot variant directly (not via product edit) is prohibited; snapshots are read-only. Variant snapshots are included only in product snapshots—not in order item snapshots, ensuring separation of concerns. When restoring from a snapshot, invalid SKU references (deleted product or variant) are ignored with a warning.

### Snapshot-Bound Variant Creation

WHEN a ProductSnapshotVariant is created, THE system SHALL:
1. Require an existing ProductSnapshot ID
2. Reject the creation if the referenced ProductSnapshot does not exist
3. Link the variant to the exact ProductSnapshot and Product at time of snapshot
4. Record creation timestamp at the moment of snapshot generation

IF the referenced ProductSnapshot ID is missing or invalid, THE system SHALL reject the creation request.

### JSON Option Format Validation

WHEN a ProductSnapshotVariant is created, THE system SHALL:
1. Validate that optionValues is valid, non-empty JSON
2. Require optionValues to contain key-value pairs matching the variant’s option names (e.g., "color", "size")
3. Reject creation if optionValues contains malformed JSON or missing required option keys

IF optionValues is invalid JSON, THE system SHALL reject the creation request with an error.
IF optionValues omits required option names present in the original variant, THE system SHALL reject the creation request with an error.

### Partial-Deletion Snapshot Handling

WHEN a product snapshot is created after some variants have been deleted, THE system SHALL:
1. Include all variants that existed at the time of snapshot creation
2. Exclude variants that were deleted before snapshot time
3. Ensure consistency by capturing only valid, non-deleted variants as of the snapshot timestamp

IF a variant is deleted after a snapshot is taken, THE system SHALL NOT affect the existing snapshot variant records.

### SKU-Level Uniqueness in Snapshot

WHEN a ProductSnapshotVariant is added to a ProductSnapshot, THE system SHALL:
1. Enforce SKU-level uniqueness within that snapshot (no duplicate SKUs)
2. Reject attempts to insert a variant with an existing SKU in the same snapshot
3. Preserve original SKU even if the live variant’s SKU has since changed

IF a duplicate SKU is detected for a ProductSnapshot, THE system SHALL reject the variant creation request.

### Read-Only Snapshot Enforcement

WHEN an attempt is made to edit a ProductSnapshotVariant directly, THE system SHALL:
1. Prohibit any modification of snapshot variant fields (including optionValues, SKU, priceOverride)
2. Reject all update attempts with an explicit error
3. Ensure snapshots can only be created, never altered

IF an update operation targets a ProductSnapshotVariant, THE system SHALL deny the operation and log the attempt.

### Snapshot vs Order-Snapshot Separation

WHEN an order item is created, THE system SHALL:
1. Create a separate OrderItemSnapshot with its own variant snapshot
2. Ensure ProductSnapshotVariant is ONLY used for product-edit snapshots, not for order preservation
3. Maintain strict separation between product-edit snapshots and order snapshots

IF an order item snapshot is created, THE system SHALL NOT reference or embed ProductSnapshotVariant directly; instead, it creates its own OrderItemSnapshotVariant.

### Restoration Invalid Reference Handling

WHEN restoring a product from a snapshot that includes ProductSnapshotVariant records, THE system SHALL:
1. Skip snapshot variants whose referenced original ProductVariant no longer exists
2. Log warnings for any missing or orphaned variant references
3. Allow restoration to proceed with remaining valid snapshot variants

IF a snapshot contains references to deleted products or variants, THE system SHALL NOT halt restoration, but shall record the skipped variant as a warning.

## InventoryRecord Error Scenarios

Inventory records with zero quantity change are rejected as meaningless—no-op entries are not stored. Restock entries must have a positive quantity; negative values for restocking fail validation. Adjustment entries require an explicit reason code (e.g., loss, damage, audit); missing reasons are blocked. Inventory subtraction during checkout fails if stock is insufficient—customers see a low-stock warning before cart placement. If a refund is processed after stock has been fully sold again, the system blocks automatic restocking to prevent over-restocking—manual intervention is required. Inventory records cannot be deleted or modified after creation—even admins can only add corrective records, not overwrite history. When stock reaches negative due to race conditions, the system flags the discrepancy and disables checkout until restocked. Duplicate inventory entries (same variant, time, reason, quantity) are silently deduplicated.

### Zero-Change Entry Rejection

WHEN a seller attempts to add inventory with a quantity change of zero, THE system SHALL reject the request. IF the quantity change is zero, THE system SHALL reject the request regardless of reason code or variant ID.

### Negative Restock Rejection

WHEN a seller attempts to restock inventory with a negative quantity, THE system SHALL reject the request. IF the quantity is negative for a restock reason, THE system SHALL reject the request and require a positive value.

### Reason Code Validation for Adjustments

WHEN a seller submits an inventory adjustment entry (not restock or order-related), THE system SHALL require a valid reason code (e.g., loss, damage, audit). IF the reason code is missing or invalid, THE system SHALL reject the adjustment request.

### Insufficient-Stock Failure

WHEN an order placement is attempted for a variant with insufficient stock, THE system SHALL prevent checkout and display a low-stock warning. IF the current stock is less than the requested cart quantity, THE system SHALL block the order creation.

### Over-Restocking Prevention

WHEN a refund is processed and the variant’s stock has already been fully sold again, THE system SHALL block automatic restocking. IF the system detects that restocking would cause net-positive over-restocking, THE system SHALL require manual administrator intervention.

### Immutable Record Guarantee

WHEN an administrator attempts to delete or modify an existing inventory record, THE system SHALL reject the request. THE system SHALL prevent any update, deletion, or suppression of inventory records—even by super administrators—and allow only new corrective entries.

### Negative Stock Detection and Mitigation

WHEN inventory calculations produce a negative stock quantity due to race conditions or errors, THE system SHALL detect the discrepancy. IF negative stock is detected, THE system SHALL flag the variant for administrative review and disable checkout until stock is restored to non-negative.

### Duplicate Record Deduplication

WHEN a duplicate inventory record (same variant, timestamp, reason, quantity) is submitted, THE system SHALL silently deduplicate and retain only the original entry. IF a duplicate is detected during ingestion, THE system SHALL discard the new entry without error.

## CartItem Error Scenarios

Adding a variant to the cart that is out of stock or deleted fails silently, and the item is ignored—no cart update occurs. Adding the same variant with a higher quantity than available stock triggers a warning but allows the cart to store the higher number, blocking checkout until reduced. Cart items cannot be added for products owned by suspended sellers—such items are removed or blocked from addition. Duplicate additions of the same variant (same product + variant + quantity) merge quantities instead of creating duplicates. Removing all items from the cart does not delete the cart record itself—the cart persists for reuse. Adding a variant while its product is in draft mode (no variants) may succeed but shows as unavailable in checkout. Cart quantity changes during checkout race conditions are resolved by revalidating stock at checkout time, potentially failing the transaction if stock is insufficient. Cart items do not capture snapshots—only order items do, ensuring cart remains flexible.

### Out-of-Stock Variant Addition Failure

WHEN a customer attempts to add a variant to their cart that is out of stock (stock quantity equals 0), THE system SHALL reject the addition and leave the cart unchanged.

IF a customer tries to add a variant whose current stock is less than the requested quantity, THE system SHALL reject the addition and leave the cart unchanged.

### Stock-Threshold Warning for Sub-Optimal Quantity

WHEN a customer attempts to add a variant to their cart with a quantity greater than the available stock, THE system SHALL accept the variant into the cart but display a warning indicating that the requested quantity exceeds available stock.

THE system SHALL continue to allow the customer to modify or proceed with the cart item, but flag it as potentially unavailable during checkout.

### Suspended Seller Cart Blocking

WHEN a customer attempts to add a variant from a product owned by a suspended seller to their cart, THE system SHALL block the addition and discard the request.

IF the variant was already in the cart before the seller was suspended, THE system SHALL remove the item from the cart and notify the customer of the removal due to seller suspension.

### Duplicate Variant Merge Behavior

WHEN a customer attempts to add a variant to their cart that already exists with identical product, variant, and selected quantity, THE system SHALL NOT create a duplicate line item but instead merge by retaining the existing quantity.

THE system SHALL treat cart item uniqueness as based on user ID, product ID, and variant ID—any attempt to add the same combination shall update the quantity only if the new quantity is valid.

### Cart Persistence After Empty

WHEN a customer removes all items from their cart, THE system SHALL persist the cart record and maintain the cart for future use rather than deleting it.

WHEN a customer has no items in their cart and returns to their cart page, THE system SHALL display an empty state but preserve the cart context (e.g., session or user ID association) for immediate reuse.

### Draft Product Variant Addition

WHEN a customer attempts to add a variant from a product that has no variants defined (draft state), THE system SHALL accept the variant but mark the cart item as unavailable for checkout.

WHEN a customer adds a variant from a product that transitions to having no variants before checkout, THE system SHALL display the item as unavailable during checkout and allow removal only.

### Checkout-Time Stock Revalidation

WHEN a customer proceeds to checkout, THE system SHALL revalidate stock levels for all cart items.

IF any cart item has insufficient stock at checkout time (due to concurrent purchase or inventory adjustment), THE system SHALL reject the checkout and notify the customer of the unavailable item(s).

WHEN a stock revalidation failure occurs during checkout, THE system SHALL preserve all other cart items and allow the customer to modify the cart before retrying.

### Cart vs Order Snapshot Distinction

THE system SHALL NOT create snapshots for cart items—cart content remains dynamic and changeable until checkout.

WHEN a cart item is converted to an order item during successful checkout, THE system SHALL create a snapshot of the product, variant, and seller profile at that moment, independent of any prior product or variant snapshots.

## WishlistItem Error Scenarios

Customers cannot add a product to their wishlist that has been deleted by the seller—the item is silently ignored. Duplicate wishlist entries (same product, same user) are prevented—subsequent attempts update nothing. Wishlist items are removed automatically if the product is deleted or the seller suspends the seller profile. The wishlist cannot exceed a maximum capacity; exceeding it blocks new additions until items are removed. Attempting to add a product while in draft mode (no variants) succeeds but shows as unavailable in the wishlist UI. Wishlist sorting by newest first may be inconsistent during rapid additions—timeline tie-breaking uses internal timestamps. Wishlist sharing is disabled—items are private to the user and inaccessible to others, even admins. Removing a wishlist item mid-checkout does not affect the order, as wishlist and cart are independent.

### Deleted Product Wishlist Cleanup

WHEN a product is deleted by its seller, THE system SHALL automatically remove all wishlist entries containing that product.

IF a customer views their wishlist after product deletion, THE system SHALL NOT display the removed product, and the wishlist count shall reflect only active products.

### Duplicate Wishlist Prevention

WHEN a customer attempts to add a product they already have in their wishlist, THE system SHALL ignore the request and leave the existing entry unchanged.

THE system SHALL prevent duplicate entries by matching on user ID and product ID, and shall not create a new wishlist item if one exists.

### Seller Suspension Wishlist Removal

WHEN a seller's account is suspended, THE system SHALL automatically remove all wishlist items referencing products owned by that seller.

WHILE a seller is suspended, customers shall see no wishlist items for that seller's products, even if previously added.

### Wishlist Capacity Limit

WHEN a customer attempts to add a product to their wishlist and the wishlist is at maximum capacity, THE system SHALL reject the addition and display a clear message.

MAXIMUM WISHLIST CAPACITY: Customers may hold up to 250 items in their wishlist at any time.

BEFORE adding a new item, THE system SHALL verify the current count and block the operation if the limit is reached.

### Draft Product Wishlist Handling

WHEN a customer adds a product with no variants (draft product) to their wishlist, THE system SHALL allow the addition.

WHEN viewing the wishlist, THE system SHALL display draft products as unavailable, indicating they cannot be purchased until variants are added.

### Timeline Tie-Breaking Resolution

WHEN multiple wishlist items are created at the same timestamp (timeline tie), THE system SHALL use an internal sequence number to ensure deterministic sorting.

THE system SHALL display newly added items as newest first, using combined timestamp-and-sequence for reliable ordering during high-frequency activity.

### Private Wishlist Isolation

THE system SHALL ensure that wishlist items are visible only to the owning customer.

NO OTHER ACTOR—including administrators—SHALL be able to view, access, or export a customer's wishlist items under any circumstances.

### Wishlist-Cart Independence

WHEN a customer removes a product from their wishlist, THE system SHALL NOT affect any existing cart items for that product.

WHEN an item is added to the wishlist but not the cart, THE system SHALL treat wishlist and cart as completely separate data structures with independent state and capacity.

## Order Error Scenarios

Customers cannot place an order if their cart contains unavailable items (e.g., out of stock or deleted)—checkout fails until items are removed. Payment failures during order placement prevent order creation entirely; no partial orders are created. Orders with no valid shipping address (e.g., deleted or unselected) fail at checkout unless a default address exists. Attempting to create two orders simultaneously for the same cart fails—only the first succeeds; the second times out or returns an error. Order total is calculated at checkout time and frozen—price changes after that do not affect the order. Orders cannot be placed during system maintenance; customers see a maintenance banner instead. Order status derivation uses current item statuses—changes in item status automatically update the order status asynchronously. Abandoned carts converted to orders after long periods may contain outdated stock prices, which are honored as long as items are still in stock.

### unavailable cart item checkout failure

WHEN a customer attempts checkout with an unavailable cart item (e.g., out of stock or deleted product/variant), THE system SHALL reject the checkout request and display an error indicating the unavailable item.

IF an unavailable item cannot be removed manually (e.g., due to system limitation), THE system SHALL disable the checkout button until the item is removed or restocked.

WHERE multiple items become unavailable simultaneously, THE system SHALL list all unavailable items in the error message for efficient correction.

### payment failure rollback

WHEN payment processing fails during order placement, THE system SHALL roll back the entire order creation process, including any reserved inventory.

IF payment fails, THE system SHALL restore stock quantities for variants that were decremented during checkout.

IF payment failure occurs after inventory decrement but before order creation, THE system SHALL ensure no orphaned inventory records are created.

### shipping address validation

WHEN a customer proceeds to checkout without selecting a shipping address, THE system SHALL validate the availability of a default address.

IF no shipping address is selected and no default address exists, THE system SHALL block checkout and prompt the customer to add or select an address.

IF the selected/default shipping address is deleted after cart creation but before checkout, THE system SHALL reject checkout with an error.

### concurrent order prevention

WHEN a customer initiates order creation while another order for the same cart is in progress, THE system SHALL detect the concurrent request and reject the second.

IF concurrent order attempts are detected, THE system SHALL preserve the first successful order and return an error for subsequent requests.

WHERE timeout-based conflict resolution is used, THE system SHALL not create partial orders and shall ensure idempotent inventory reservation.

### price freeze at checkout

WHEN an order is placed, THE system SHALL calculate and freeze the total price at checkout time based on current variant prices and quantities.

IF a variant’s price changes after the order is placed, THE system SHALL NOT update the order’s total price—frozen values persist for the order lifetime.

THE system SHALL include the exact price per variant at checkout in each order item snapshot.

### maintenance-mode checkout blocking

WHEN system maintenance is active during checkout attempt, THE system SHALL display a maintenance banner and block order creation.

IF maintenance starts during active checkout, THE system SHALL cancel ongoing order placement attempts and notify the customer.

WHERE maintenance is scheduled, THE system SHALL provide advance notice to customers via UI banners prior to blocking checkout.

### status-driven order status updates

WHEN an order item’s status changes (e.g., from paid to shipped), THE system SHALL asynchronously update the order’s overall status based on the aggregate of its items.

IF some items are delivered while others remain paid, THE system SHALL set order status to "partially completed".

THE system SHALL update the order status in real-time as item statuses change, without requiring manual intervention.

### historical price order validation

WHEN a customer places an order containing items with historical variant pricing (e.g., from long-cached wishlist), THE system SHALL validate stock availability and honor the historical price at checkout time.

IF the historical price no longer corresponds to current inventory (e.g., variant deleted), THE system SHALL reject checkout unless the item is still available.

IF the item is available but stock was updated since historical pricing, THE system SHALL validate sufficient stock for the requested quantity before finalizing the order.

## OrderItem Error Scenarios

Order items cannot be created for deleted products or variants—even if added during cart time, checkout fails if products vanish before payment. Stock deduction during order creation fails if inventory is insufficient at that moment—orders are cancelled automatically with full refund if inventory drops mid-checkout. Order items with duplicate product-variant pairs in the same order are merged into one item with summed quantity. Cancellation or refund requests for items in shipped status are rejected; items must be delivered before refund requests are allowed. Adding an item to an existing order after placement is impossible—orders are immutable once created. Admin-forced cancellations apply only to items with status 'paid' or 'shipped', not 'delivered' or 'refunded'. Order item status transitions follow strict rules: paid → shipped → delivered, with reversals only via cancellation or refund. If an order contains items from multiple sellers, each item maintains its own status independently, regardless of overall order status.

### OrderItem Error Scenarios

### Post-Deletion Item Checkout Failure

WHEN a customer proceeds to checkout with a cart item referencing a product that was deleted after being added to the cart, THE system SHALL reject the checkout.

IF any item in the cart is no longer available (product or variant deleted), THE system SHALL display a checkout error indicating which items are unavailable.

WHILE the customer is on the checkout page, THE system SHALL validate each cart item against current product/variant existence before allowing order placement.

### Mid-Checkout Inventory Rollback

WHEN an order is placed but inventory becomes insufficient during payment processing (e.g., another customer purchased the last stock), THE system SHALL abort the order creation and return an error.

WHEN an order fails due to insufficient inventory after payment confirmation, THE system SHALL automatically issue a full refund for the purchase amount.

IF inventory drops to zero for any variant in the cart after successful payment but before order finalization, THE system SHALL preserve payment records, cancel the order, and restore inventory levels.

### Duplicate Item Merging

WHEN a customer adds the same product variant to their cart multiple times, THE system SHALL merge quantities into a single cart item instead of creating multiple line items.

WHILE merging cart items, THE system SHALL preserve the timestamp of the first addition and update only the quantity and last-updated timestamp.

IF cart item quantities are combined during checkout validation, THE system SHALL display a confirmation that quantities have been merged before proceeding.

### Shipped Item Refund Rejection

WHEN a customer requests a refund for an order item with status "shipped", THE system SHALL reject the request.

IF a refund request is submitted for an item not yet delivered, THE system SHALL return a business rule error stating "Refunds can only be requested after delivery".

THE system SHALL prevent creation of refund requests for items with status "paid", "shipped", "cancelled", or "refunded".

### Order Immutability After Placement

WHEN an order is successfully created, THE system SHALL prevent any modification to its items, shipping address, or pricing.

IF any attempt is made to add, remove, or alter items in an existing order, THE system SHALL reject the operation and preserve the original order record unchanged.

AFTER an order is placed, THE system SHALL maintain all product and variant snapshots associated with order items as they existed at purchase time.

### Admin Cancellation Eligibility Rules

WHEN an administrator attempts to cancel an order item with status "delivered" or "refunded", THE system SHALL reject the request.

THE system SHALL allow admin-initiated cancellation only for order items with status "paid" or "shipped".

WHEN an admin cancels an item, THE system SHALL restore inventory via an inventory record and process a full refund if payment was collected.

### Status Transition Constraints

WHILE processing an order item, THE system SHALL enforce status transitions in the order: "paid" → "shipped" → "delivered".

THE system SHALL reject any direct status change that skips required transitions (e.g., "paid" → "delivered").

AFTER a successful cancellation, THE system SHALL transition the item to "cancelled" and skip further shipping or delivery steps.

### Multi-Seller Item Status Independence

WHEN an order contains items from multiple sellers, THE system SHALL maintain individual status for each item regardless of other items' statuses.

THE overall order status SHALL reflect a composite view (e.g., "paid" if any item is paid but none delivered), but individual item statuses SHALL remain independent.

WHEN one seller ships their items in an order, THE system SHALL mark only those items as "shipped" while leaving items from other sellers in their current status.

## Shipment Error Scenarios

Sellers cannot create a shipment for an order item that has already been shipped—duplicate shipments are rejected. Shipment creation fails if any item in the shipment has been cancelled or refunded—only active items can be shipped. Tracking numbers must be non-empty and valid per carrier format (e.g., alphanumeric length checks); invalid tracking data is rejected. Customers cannot create shipments—only sellers can, ensuring proper business flow. When a shipment is created, all included items transition to 'shipped' status simultaneously—even if partial shipping fails, the transaction rolls back. Shipment carrier selection supports only predefined carriers—custom names are rejected unless pre-approved. Delayed shipment creation (e.g., after time limit) still succeeds, but may affect customer delivery estimates. Multiple shipments for the same seller in one order are allowed, but each must include distinct items.

### Duplicate Shipment Rejection

### Duplicate Shipment Rejection

WHEN a seller attempts to create a shipment containing an order item that has already been shipped, THE system SHALL reject the shipment creation and display: "This item has already been shipped and cannot be included in a new shipment."

WHEN a seller attempts to create a shipment where any order item belongs to a shipment that is already in 'shipped' or 'delivered' status, THE system SHALL reject the entire shipment and preserve all inventory and status states unchanged.


### Cancelled or Refunded Item Blocking

### Cancelled or Refunded Item Blocking

WHEN a seller attempts to create a shipment containing an order item with status 'cancelled' or 'refunded', THE system SHALL reject the shipment and display: "This item has been cancelled or refunded and cannot be shipped."

WHEN a shipment creation request includes a mix of active and non-active (cancelled/refunded) items, THE system SHALL reject the entire shipment unless all items are valid for shipping.

WHILE an item's status is 'delivered', THE system SHALL prevent it from being included in any new shipment—delivery is the final shipping state.


### Tracking Format Validation

### Tracking Format Validation

WHEN a seller enters tracking information, THE system SHALL validate the tracking number format according to the selected carrier's rules (e.g., length, alphanumeric pattern).

IF the tracking number fails format validation for the selected carrier, THE system SHALL reject the shipment creation and display: "Tracking number format is invalid for {carrierName}. Please verify and try again."

THE system SHALL reject empty or whitespace-only tracking numbers.

IF the carrier is not in the approved list (see Carrier Whitelist Enforcement), THE system SHALL reject tracking entry and display: " carrier '{carrierName}' is not approved. Please select a supported carrier."


### Seller-Only Shipment Creation

### Seller-Only Shipment Creation

WHEN a customer, admin, or guest attempts to create a shipment, THE system SHALL reject the request and display: "Only sellers can create shipments."

WHEN a seller attempts to create a shipment for another seller’s order items, THE system SHALL reject the request and display: "You may only ship items belonging to your own shop."

THE system SHALL enforce that only the seller who fulfilled the order items may create shipments for them.


### Atomic Shipment-Item Transition

### Atomic Shipment-Item Transition

WHEN a shipment is created, THE system SHALL atomically transition all included order items to 'shipped' status simultaneously.

IF any item in the shipment fails status validation (e.g., already delivered), THE system SHALL roll back all changes—including the shipment record—and preserve all original statuses.

WHILE partial shipment creation is attempted (e.g., one item valid, one invalid), THE system SHALL abort the entire operation to ensure consistency.


### Carrier Whitelist Enforcement

### Carrier Whitelist Enforcement

THE system SHALL maintain a pre-approved list of carriers and reject shipments with unapproved carrier names.

IF a seller enters a carrier name not on the whitelist, THE system SHALL reject the shipment and display: "Carriers must be selected from the approved list. '{carrierName}' is not currently supported."

THE system SHALL allow administrators to add or remove carriers, but sellers cannot modify the whitelist.

THE system SHALL require a carrier name selection before tracking number entry is accepted.


### Delayed Shipment Allowance

### Delayed Shipment Allowance

WHEN a seller creates a shipment after the ideal shipping window (e.g., days passed since payment), THE system SHALL allow the shipment as long as item status remains 'paid' or 'shipped' eligible.

THE system SHALL record the shipment creation timestamp regardless of delay and preserve it for audit.

WHEN a delayed shipment is created, THE system SHALL still automatically start the 14-day delivery estimation timer.


### Multi-Shipment Per Seller

### Multi-Shipment Per Seller

WHEN a seller ships multiple items from the same order, THE system SHALL allow multiple shipments as long as each shipment contains distinct, non-overlapping order items.

THE system SHALL enforce that no order item appears in more than one shipment for the same seller.

WHEN a seller creates a second shipment for the same order, THE system SHALL allow it and preserve shipment independence—including separate tracking numbers and delivery confirmations.


## ShipmentItem Error Scenarios

Shipment items cannot reference order items that belong to different orders—even within the same seller’s order, each shipment item links to one order item only. Attempting to add the same order item to two shipment items for the same shipment is blocked—duplicate entry is prevented. Shipment items cannot be created for items already marked as delivered—this avoids inconsistent delivery records. Removing an order item from the cart before checkout removes all shipment intent, preventing orphan shipment items. Sellers cannot manually edit shipment items after shipment creation—only carrier updates are allowed. If a shipment is split after creation (e.g., partial shipping), new shipment items must be created separately—updates are not permitted. Shipment item deletion mid-shipment (before carrier submission) is allowed, and items revert to 'paid' status. Snapshotting shipment items is not performed—their data (product, variant, seller) is preserved in order items instead.

### ShipmentItem Error Scenarios

### Cross-Order Shipment Rejection

WHEN a seller attempts to create a shipment that includes order items from different orders, THE system SHALL reject the request.

WHEN a seller adds an order item to a shipment, THE system SHALL verify that all order items belong to the same order.

IF any order item in the proposed shipment belongs to a different order, THE system SHALL reject the request with an appropriate error.

### Duplicate Order Item in Shipment

WHEN a seller attempts to add an order item that is already associated with a shipment item in the same shipment, THE system SHALL reject the request.

THE system SHALL enforce uniqueness of order items within a single shipment.

IF an attempt is made to associate the same order item multiple times to one shipment, THE system SHALL return a validation error.

### Delivered Item Shipment Blocking

WHEN a seller attempts to create a shipment containing order items with status "delivered", THE system SHALL reject the request.

THE system SHALL verify that all order items in a shipment have status "paid" or "shipped" before allowing shipment creation.

IF any item in the proposed shipment has status "delivered", THE system SHALL block shipment creation.

### Cart Removal Shipment Invalidation

WHEN a customer removes an order item from their cart before checkout, THE system SHALL invalidate any pending shipment intent for that item.

THE system SHALL ensure no shipment items can be created for items no longer in the cart at checkout time.

IF cart item removal occurs before order placement, THE system SHALL clear any associated shipment intent records.

### Post-Shipment Edit Prevention

WHEN a seller attempts to modify an existing shipment item after the shipment has been created, THE system SHALL reject the request.

THE system SHALL prevent all updates to shipment items—including quantity changes, item swapping, or reassignment—once the shipment is confirmed.

Only carrier name and tracking number may be updated after shipment creation.

### Shipment Splitting Requirements

WHEN a seller partially ships an order (e.g., ships some items now and others later), THE system SHALL require creation of new shipments rather than modifying existing shipment items.

IF a shipment must be split, THE system SHALL create a new shipment with its own set of shipment items.

THE system SHALL NOT allow reassignment of existing shipment items to a different shipment.

### Pre-Carrier Deletion Allowance

WHEN a shipment has been created but carrier tracking has not yet been entered, THE system SHALL allow deletion of the entire shipment.

WHEN a shipment is deleted before carrier submission, THE system SHALL revert all associated order items to status "paid".

IF the shipment has already been marked as "shipped", THE system SHALL prevent deletion of the shipment and its items.

### Shipment Item Snapshot Avoidance

WHEN a shipment item is created, THE system SHALL NOT generate a snapshot of the shipment item.

THE system SHALL ensure that all required data (product name, variant options, seller profile) is preserved at order time and accessible via the linked order item.

SHIPSMENT item data SHALL NOT be duplicated into immutable snapshots—redundant storage is avoided because the order item and its snapshots already preserve the necessary context.

## CancellationRequest Error Scenarios

Customers can request cancellation only for items with status 'paid'—requests for shipped or delivered items are rejected. Sellers cannot respond to cancellation requests for items not belonging to them; unauthorized responses are blocked. Cancellation requests without a reason (empty text) are rejected—validation requires non-empty input. If an item is already cancelled or refunded, further requests are ignored. Seller responses (approve/reject) create a snapshot of the request state; duplicate responses are rejected. Cancellation during payment processing (status: pending-payment) fails—items must first reach 'paid'. Multiple simultaneous cancellation requests for the same item are merged—only the first creates a request, others are discarded. Sellers cannot approve their own cancellation request—self-cancellation requires admin intervention or special permission.

### Status-based Cancellation Eligibility

### Cancellation Request Eligibility by Item Status

WHEN a customer submits a cancellation request for an item with status "paid", THE system SHALL accept the request.

WHEN a customer submits a cancellation request for an item with status "shipped", THE system SHALL reject the request.

WHEN a customer submits a cancellation request for an item with status "delivered", THE system SHALL reject the request.

WHEN a customer submits a cancellation request for an item with status "cancelled", THE system SHALL ignore the request.

WHEN a customer submits a cancellation request for an item with status "refunded", THE system SHALL ignore the request.

WHILE an item's payment status is "pending-payment", THE system SHALL prevent cancellation request creation.

IF an item's order is already fully cancelled or fully refunded, THE system SHALL reject any new cancellation requests for its items.

### Item Ownership Validation

### Seller Ownership Verification for Cancellation Requests

WHEN a seller attempts to respond to a cancellation request for an item belonging to a different seller, THE system SHALL reject the response.

WHEN a seller receives a cancellation request, THE system SHALL verify that the item's sellerId matches the responding seller's userId.

IF the ownership verification fails, THE system SHALL log the attempt and notify the correct seller.

IF the system detects an unauthorized seller response, THE system SHALL invalidate the response and restore the request to "pending" status.

### Reason Requirement for Requests

### Cancellation Request Reason Validation

WHEN a customer submits a cancellation request with an empty or whitespace-only reason, THE system SHALL reject the request.

WHEN a cancellation request is submitted, THE system SHALL require a non-empty text value for the reason field.

IF the reason text exceeds reasonable length (e.g., too long for display), THE system SHALL reject the request.

THE system SHALL preserve the exact reason text when creating the request snapshot.

### Already-Cancelled Request Rejection

### Duplicate Request Handling for Same Item

WHEN a customer submits a cancellation request for an item that already has an active "pending" request, THE system SHALL discard the new request.

WHEN a customer submits a cancellation request for an item that has been "approved" (cancelled) or "rejected", THE system SHALL reject the new request.

THE system SHALL return a clear error message indicating that a request already exists for that item.

IF the item's status changes after cancellation (e.g., item is shipped post-request), THE system SHALL mark the original request as obsolete.

### Response Snapshot Guarantee

### Seller Response Snapshot Integrity

WHEN a seller responds to a cancellation request (approve or reject), THE system SHALL create a snapshot of the request in its current state.

WHEN the snapshot is created, THE system SHALL record: request ID, requester ID, responder ID, response type, timestamp, and reason.

THE system SHALL prevent any modification of the request state after the snapshot is created.

IF the snapshot creation fails, THE system SHALL abort the response and revert to the previous state.

### Pending-Payment Cancellation Lock

### Payment-Processing Item Cancellation Block

WHEN an item's status is "pending-payment", THE system SHALL prevent the creation of a cancellation request.

WHEN an item transitions from "pending-payment" to "paid", THE system SHALL validate that no cancellation request was created during the pending state.

IF a cancellation request exists for an item in "pending-payment" status due to system timing, THE system SHALL automatically mark the request as invalid.

### Duplicate Request Deduplication

### Concurrent Cancellation Request Deduplication

WHEN multiple cancellation requests for the same item are submitted simultaneously, THE system SHALL ensure only the first request is persisted.

WHEN the system detects a duplicate request, THE system SHALL return a user-friendly message indicating a request is already in progress.

THE system SHALL use atomic operations to guarantee no two requests for the same item are created.

IF a duplicate request bypasses validation, THE system SHALL automatically reject the duplicate and retain the original.

### Self-Cancellation Restriction

### Seller Self-Cancellation Prevention

WHEN a seller attempts to submit a cancellation request for their own order item, THE system SHALL reject the request.

WHEN a seller attempts to approve their own cancellation request, THE system SHALL block the approval.

IF the system detects a self-cancellation attempt, THE system SHALL log the event and require administrator intervention for resolution.

THE system SHALL display a clear message that sellers cannot cancel their own items.

## RefundRequest Error Scenarios

Customers cannot request refunds for items with status 'delivered' older than 7 days—the system blocks requests after the window closes. Refund requests for cancelled items are rejected, as cancellation already implies reimbursement. Sellers cannot approve refund requests for items they do not own—ownership is enforced before response. Requesting a refund for an item with no payment (e.g., zero-value item) still triggers processing but may skip actual money transfer. Refund requests during shipping are allowed if delivery is delayed, but sellers may reject if item is in transit. Duplicate refund requests (same item, same reason) are silently merged—only one active request exists per item. Sellers cannot revoke a refund approval after issuing the refund—only admins can reverse it. Refund requests for delivered items must include delivery confirmation evidence if disputed; otherwise, the request is auto-rejected.

### 7-Day Refund Eligibility Window

WHEN a customer attempts to submit a refund request for a delivered item, THE system SHALL verify that the item's delivery date is within the past 7 days.

IF the item was delivered more than 7 days ago, THE system SHALL reject the refund request with a clear message indicating the eligibility window has expired.

THE system SHALL NOT allow refund requests for items with status 'shipped' or 'paid'—only items with status 'delivered' are eligible for refund consideration.

THE system SHALL enforce the 7-day window consistently across all sellers, regardless of seller status or account type.

### Cancelled Item Refund Rejection

WHEN a customer submits a refund request for an order item with status 'cancelled', THE system SHALL reject the request immediately.

THE system SHALL treat cancelled items as already reimbursed through cancellation processing, so refund requests for such items are invalid and disallowed.

WHEN a seller responds to a refund request for an item that was cancelled after the request was submitted, THE system SHALL invalidate the request and log the status change.

### Item Ownership Validation

WHEN a refund request is submitted or approved, THE system SHALL verify that the requesting customer and responding seller are correctly associated with the order item.

IF the requesting user is not the original customer for the item, THE system SHALL reject the refund request.

IF the responding user is not the seller who fulfilled the item, THE system SHALL reject the approval/rejection response.

Ownership validation occurs independently for each order item, ensuring sellers cannot influence refunds for items they did not supply.

### Zero-Value Refund Handling

WHEN a refund request is approved for an item with zero payment (e.g., free item, promotional credit applied), THE system SHALL process the refund flow but skip actual monetary transfer.

IF the item had no actual payment made at purchase time, THE system SHALL record the refund transaction but set the refund amount to zero.

THE system SHALL still restore stock quantities for zero-value items upon refund approval, maintaining inventory integrity.

### In-Transit Refund Eligibility

WHEN a customer submits a refund request for an item with status 'shipped' but not yet 'delivered', THE system SHALL permit the request.

THE system SHALL allow sellers to approve or reject such refund requests, acknowledging that the item may still be in transit.

IF the item arrives after a refund request is approved, THE system SHALL process a return receipt or cancellation of delivery, depending on logistics capabilities.

### Duplicate Request Merging

WHEN a customer submits a refund request for an item that already has an active (pending) request with the same reason and recipient, THE system SHALL silently merge the new request into the existing one.

THE system SHALL NOT create duplicate refund request records—only one active request per (orderItemId, reason, status=pending) combination is allowed.

THE system SHALL update the timestamp of the existing request when a duplicate is merged, preserving the most recent activity.

### Post-Approval Revocation Prevention

WHEN a seller approves a refund request and the refund transaction is initiated, THE system SHALL prevent the seller from revoking or reversing their approval.

IF a reversal is required after approval, THE system SHALL restrict this action to super administrators only, with full audit logging.

THE system SHALL enforce revocation restrictions immediately upon initiating the refund, regardless of whether the actual monetary transfer completed.

### Evidence Requirement for Disputes

WHEN a customer submits a refund request and the seller disputes it, THE system SHALL require the customer to provide delivery confirmation evidence if the item was delivered.

IF the customer fails to provide evidence within 3 days of the seller's dispute, THE system SHALL auto-reject the refund request.

THE system SHALL allow administrators to override the evidence requirement in special cases (e.g., loss in transit, confirmed non-delivery).

## Review Error Scenarios

Customers can write a review only after an order item reaches 'delivered' status—reviews for pending items are blocked. A customer cannot write more than one review per product per order—even if they purchased the same product multiple times, only one review per order is allowed. Review edits after snapshotting (e.g., for dispute resolution) are allowed, but every edit creates a new snapshot. Reviews with no rating (missing star input) are rejected; empty ratings are invalid. Deleting a review hides it from the product page but preserves its snapshot for audit. Reviews for deleted products still exist but show as 'product unavailable' in listing. Sellers cannot flag or delete customer reviews—even if inappropriate, reviews are editable only by the author or admins. Rating updates via review edits do not affect the average until the new snapshot is recorded.

### Delivered Status Prerequisite

WHEN a customer attempts to write a review, THE system SHALL verify that the order item status is "delivered".

IF the order item status is not "delivered", THE system SHALL reject the review attempt.

A review may be written only after delivery confirmation or after the 14-day automatic delivery confirmation period.

Reviews for items with status "paid", "shipped", or "cancelled" are not permitted.

### One Review Per Product Per Order Constraint

WHEN a customer submits a review for a product, THE system SHALL verify that no existing review from that customer exists for the same product within the same order.

IF a review already exists for that customer-product-order combination, THE system SHALL reject the new review.

Customers who purchase the same product multiple times in one order may submit only one review for that order.

Each order item belongs to exactly one order, so multiple reviews for different items of the same product in one order are allowed, but only one per item.

### Missing Rating Rejection

WHEN a customer submits a review, THE system SHALL require a rating value between 1 and 5 stars.

IF no rating is provided, THE system SHALL reject the submission.

IF a rating is provided outside the 1-5 range, THE system SHALL reject the submission.

Text content is optional; only rating is mandatory.

Empty rating input (e.g., null, 0, or missing field) must be rejected with a clear error.

### Edit-Triggered Snapshot Creation

WHEN a customer edits an existing review, THE system SHALL create a new review snapshot.

THE snapshot SHALL preserve the rating and text content as they were before the edit.

THE system SHALL record the edit timestamp in the snapshot.

Review edits after snapshotting do not modify the original snapshot; all edits produce new snapshots.

Only the author may edit a review; sellers and admins cannot edit it directly.

### Deleted Product Review Handling

WHEN a customer views a product that has been deleted, THE system SHALL display a placeholder indicating "product unavailable".

Reviews for deleted products are preserved and remain accessible through the customer's review history.

THE system SHALL not link deleted product reviews to active product pages.

Deleted product reviews retain their rating, text content, and snapshot history.

Reviews for deleted products do not contribute to any product rating averages.

### Seller Review Manipulation Prevention

Sellers SHALL NOT be allowed to delete, edit, flag, or hide customer reviews—even for inappropriate content.

Sellers SHALL NOT be allowed to influence review ratings or content through technical means.

Reviews can be edited only by their author or an administrator with elevated privileges.

THE system SHALL enforce seller read-only access to reviews at all times.

Any attempt to modify a review by a seller shall be logged and rejected.

### Rating Update Snapshot Sync

WHEN a review is edited and the rating changes, THE system SHALL create a new review snapshot with the updated rating.

THE product's average rating SHALL be recalculated only after the new snapshot is recorded.

THE system SHALL preserve both the old snapshot (with the previous rating) and the new snapshot (with the updated rating).

THE snapshot's timestamp SHALL reflect when the rating update was applied.

Review snapshots must include the rating value to support accurate historical average calculations.

## ReviewSnapshot Error Scenarios

Snapshot creation fails silently if the associated review is deleted before the snapshot completes—no orphaned snapshots are stored. Reviews without text content are allowed (only ratings); empty text is stored as null in snapshots. Snapshot timestamps reflect when the edit occurred—not when the review was originally created. If two edits occur simultaneously, both snapshots are preserved in order of creation. Deleting a review does not delete its snapshots—audit trails remain intact. Admins can view all review snapshots for dispute resolution, but regular users see only the current review state. Snapshot integrity is verified during retrieval—if a review ID no longer exists, the snapshot returns null gracefully. Rating calculations use only non-deleted reviews, excluding snapshots from deleted reviews.

### Orphaned Snapshot Prevention

WHEN a review snapshot is created due to an edit, THE system SHALL verify that the associated review still exists in active state.\n\nIF the review has been deleted prior to snapshot creation, THE system SHALL abort the snapshot creation and record no entry.\n\nTHE system SHALL ensure that no ReviewSnapshot record exists without a valid Review.id reference at time of creation.

### Text-Optional Rating Support

WHEN a review is edited with no text content provided, THE system SHALL preserve the original textContent as null in the new snapshot.\n\nWHEN a review snapshot is created, THE system SHALL capture rating values (1–5) as required, while textContent may be omitted (stored as null) or present as text.\n\nIF a snapshot contains a null textContent, THE system SHALL allow retrieval of the rating value without requiring text content.\n\nTHE system SHALL treat null textContent and empty string as equivalent when storing—normalizing to null.

### Edit Timestamp Preservation

WHEN a review is edited, THE system SHALL capture the exact timestamp of the edit in the ReviewSnapshot.createdAt field.\n\nTHE system SHALL NOT use the original review creation timestamp for snapshot records—only the edit event timestamp.\n\nIF concurrent edits occur, each snapshot’s timestamp shall reflect the precise moment of the edit request—no deduplication by timestamp.\n\nSnapshot timestamps SHALL be stored in UTC and sortable by chronological order.

### Concurrent Snapshot Ordering

WHEN two or more simultaneous edits to the same review occur, THE system SHALL create separate ReviewSnapshot records for each edit.\n\nTHE system SHALL preserve creation order using database-level timestamp sequencing with millisecond precision.\n\nEach snapshot shall be uniquely identifiable and retain its individual edit timestamp.\n\nNo deduplication or merging shall be performed on snapshots generated from concurrent edits.

### Review Deletion Snapshot Persistence

WHEN a review is deleted, THE system SHALL preserve all associated ReviewSnapshot records without deletion.\n\nTHE system SHALL NOT remove any snapshot due to review deletion—audit trail remains intact.\n\nAfter review deletion, snapshots may be retrieved using ReviewSnapshot.reviewId, but references to the review entity itself will return null.\n\nSnapshots retain full fidelity: rating, textContent (if present), snapshotType, and createdAt.

### Admin Snapshot Access Control

WHEN an administrator requests review snapshots for a specific review, THE system SHALL return all historical snapshots regardless of review deletion status.\n\nWHEN a regular user requests snapshots for a review they own, THE system SHALL return only current review state—snapshots are excluded from public-facing review displays.\n\nTHE system SHALL allow super administrators to access all snapshots for any review on the platform.\n\nAdmins SHALL NOT be able to modify or delete any snapshot—access is read-only.

### Invalid Reference Snapshot Handling

WHEN a snapshot is retrieved and its associated review.id no longer exists in the system, THE system SHALL return the snapshot data gracefully, with null review reference.\n\nTHE system SHALL NOT reject or error when querying snapshots where the parent review is deleted.\n\nAll snapshot retrieval endpoints MUST validate reviewId existence before filtering, and include orphaned snapshots in results when explicitly requested by authorized users.\n\nIf a snapshot’s reference to the user (customerId) or product (productId) is invalid, the system SHALL still serve the snapshot but flag the invalid reference in internal logs.

### Rating Calculation Exclusions

WHEN calculating a product’s average rating, THE system SHALL include only ratings from non-deleted reviews.\n\nSnapshots from deleted reviews SHALL NOT contribute to rating calculations—even if they retain rating values.\n\nOnly the latest non-deleted review entry per user per product SHALL be used in rating aggregation.\n\nIf a user edits a review multiple times before deletion, only the most recent non-deleted version shall be counted.

## AdminRequest Error Scenarios

Users attempting to submit an admin request while already holding an admin role are rejected—role duplication is prevented. Requests without a reason (empty or whitespace-only) are rejected during submission. Admin requests can only be submitted once per user—duplicate submissions for the same user are ignored unless rejected and re-applied. Super administrators cannot request admin status themselves—they are already admins. Requests are automatically expired after 30 days if not acted upon; status becomes 'expired' and requires re-submission. Multiple simultaneous requests from the same user for different roles are allowed but handled sequentially to avoid privilege escalation conflicts. Sellers or customers can request admin status, but the role cannot exceed 'regular' unless explicitly promoted later. Admin approval with no reason for rejection triggers an audit log but still blocks the request.

### Duplicate Role Prevention

WHEN a user with an existing administrator role submits an admin request, THE system SHALL reject the request.\n\nIF the user already holds any grade of administrator role, THEN THE system SHALL reject the request.\n\nTHE system SHALL NOT create duplicate admin role assignments.

### Reason Requirement for Submissions

WHEN a user submits an admin request, THE system SHALL require a non-empty reason.\n\nIF the reason field is empty or contains only whitespace, THEN THE system SHALL reject the request.\n\nIF the reason field is missing, THEN THE system SHALL reject the request.

### Single-Request-Per-User Constraint

WHEN a user submits an admin request while having an existing pending, approved, or rejected request, THE system SHALL ignore the new submission.\n\nIF a user already has an active request (status != expired), THEN THE system SHALL not create a duplicate request.\n\nIF a user submits a new request after a rejected one, THEN THE system SHALL allow resubmission with new request details.

### Self-Admin Request Blocking

WHEN an existing administrator (regular or super) submits an admin request, THE system SHALL reject the request.\n\nIF the user already holds the "admin" role, THEN THE system SHALL not allow a new admin request.\n\nTHE system SHALL preserve the existing admin grade without modification.

### Request Expiration Policy

WHEN an admin request has been pending for 30 days without action, THE system SHALL automatically change its status to "expired".\n\nIF the status is expired, THEN the request shall be treated as inactive and require resubmission.\n\nEXPIRED requests shall not block new admin requests from the same user.

### Concurrent Role Request Handling

WHEN a user submits multiple admin requests for different roles, THE system SHALL process them sequentially, not in parallel.\n\nIF concurrent requests exist, THEN the system SHALL ensure no privilege escalation occurs between them.\n\nTHE system SHALL process each request independently while preserving the original submission order.

### Cross-Role Eligibility

WHEN a user without a customer or seller role attempts to submit an admin request, THE system SHALL reject the request.\n\nONLY customers and sellers are eligible to request administrator status.\n\nIF the user has neither customer nor seller role, THEN THE system SHALL reject the request.

### Rejection Audit Logging

WHEN an administrator rejects an admin request without providing a reason, THE system SHALL still create an audit log entry.\n\nIF rejection occurs, THEN THE system SHALL record the rejection timestamp and approver ID.\n\nTHE system SHALL preserve the rejection audit trail regardless of whether a reason was provided.

## AdminRole Error Scenarios

Users with no existing admin request cannot have admin roles assigned directly—roles require a formal request process. Super administrators cannot demote themselves to regular admin—self-demotion is blocked to prevent accidental power loss. Regular admins cannot promote other regular admins to super—they must be promoted by an existing super admin. Role grade changes (e.g., regular to super) require a new admin role entry with a new timestamp, preserving history. Attempting to demote a super admin without sufficient privilege throws an access denied error with no further details. Role assignments during account suspension are allowed but become active only upon unsuspension. Duplicate grade assignments (e.g., two regular admin entries for same user) are rejected; each user has at most one active grade at a time. Admin role deletion (revoking all admin access) requires an admin request to be re-submitted later, as roles are immutable once granted.

### Formal Request Prerequisite

WHEN a user has no existing AdminRequest, THE system SHALL NOT assign an AdminRole directly—roles require a formal request process.

IF an admin attempts to grant a role without a corresponding approved AdminRequest, THE system SHALL reject the request with a role assignment error.

A role assignment is only valid when linked to an AdminRequest with status 'approved'.

### Self-Demotion Prevention

WHEN a super administrator attempts to demote themselves to regular administrator, THE system SHALL reject the demotion and return a self-demotion prevention error.

THE system SHALL preserve the existing super administrator grade without modification when the operation originates from the same user's own admin role entry.

Self-demotion attempts are blocked regardless of privilege level or administrative authority.

### Super-Admin Promotion Control

WHEN a regular administrator attempts to promote another regular administrator to super administrator, THE system SHALL reject the promotion request.

Only an existing super administrator can grant the super administrator grade.

IF a promotion request lacks a super administrator's authorization signature, THE system SHALL mark the request as invalid and discard the change.

### Grade-Change Entry Duplication

WHEN an attempt is made to create a second AdminRole entry with the same user ID and grade as an existing active entry, THE system SHALL reject the request.

THE system SHALL ensure only one active grade exists per user at any given time.

Each grade change creates a new AdminRole entry with a unique timestamp, preserving full history but enforcing single-active-grade constraint.

### Insufficient Privilege Rejection

WHEN a user attempts an admin role operation (promotion, demotion) without sufficient authority (i.e., not holding super administrator grade), THE system SHALL reject the operation with an insufficient privilege error.

THE system SHALL NOT disclose which roles exist or their hierarchy—it only returns a generic access denied message.

Unauthorized attempts to modify admin roles are logged for security audit without exposing role structure details.

### Suspended Role Activation Delay

WHEN a user’s account is suspended while holding an admin role, THE system SHALL suspend role functionality but preserve the admin role entry.

THE system SHALL NOT activate admin roles until the user’s account is unsuspended—even if a new AdminRole entry was created during suspension.

Role effects (permissions, access) are applied only when both the AdminRole entry exists AND the user account is active (unsuspended).

### Single-Active-Grade Enforcement

WHEN an AdminRole entry is created or updated, THE system SHALL deactivate any previous role entry for the same user ID.

THE system SHALL ensure exactly one active grade (regular|super) per user at all times.

Any attempt to create overlapping active grades (e.g., two simultaneous regular or mixed regular/super active entries) is rejected.

### Role Revocation Requirement

WHEN an admin role needs to be removed (e.g., for policy violation or resignation), THE system SHALL NOT delete the AdminRole entry directly—revocation requires an admin request to be re-submitted later.

IF a user's admin access needs to be revoked, THE system SHALL set the active flag to false and log a revocation reason, but preserve the historical entry.

Role history is immutable and preserved indefinitely—revoked roles are marked inactive, not deleted.

# End-to-End User Scenarios

Cross-domain user scenarios, multi-step business flows, and end-to-end use cases.

## User User Scenarios

Users begin by registering an account with email and password; email must be unique and accounts start unverified until email confirmation. After verification, users can log in to access personalized experiences. Users can change their passwords at any time through a secure process. Users may delete their accounts, which deletes profile data but preserves orders and reviews (shown as 'deleted user'). Users can request to become administrators, providing a reason; once approved by a super administrator, they gain elevated privileges. Banned users cannot log in or perform any actions. Super administrators can promote or demote regular administrators (except themselves), enabling role changes for platform oversight.

### Account Registration Flow

WHEN a user registers with their email and password, THE system SHALL:
1. Require a unique email address
2. Require a password that meets security requirements
3. Create an unverified user account with role 'customer'
4. Initiate an email verification process

IF the email is already registered, THE system SHALL reject the registration.
WHEN registration is successful, THE system SHALL send a verification email to the provided address.

### Email Verification Process

WHEN a user clicks the verification link in the email, THE system SHALL:
1. Validate the verification token
2. Mark the user account as verified
3. Enable full account access

IF the token is invalid or expired, THE system SHALL reject the verification.
WHILE an account is unverified, THE system SHALL restrict login attempts to a verification-required message.

### Password Change Workflow

WHEN a user requests a password change, THE system SHALL:
1. Require the current password for verification
2. Require a new password meeting security requirements
3. Update the password hash after validation

IF the current password is incorrect, THE system SHALL reject the change.
WHEN the password is successfully changed, THE system SHALL invalidate all existing sessions.

WHERE a user has forgotten their password, THE system SHALL allow a password reset request via email.

### Account Deletion Behavior

WHEN a user deletes their account, THE system SHALL:
1. Delete the user's profile information (display name, phone number)
2. Preserve all order records associated with the user
3. Preserve all reviews, but mark them as created by 'deleted user'
4. Remove all cart items and wishlist items
5. Delete all addresses associated with the user

IF the user has any pending seller registration or admin role requests, THE system SHALL retain those records.

WHEN deletion is complete, THE system SHALL log the user out and prevent future authentication.

### Administrator Request Lifecycle

WHEN a user submits a request to become an administrator, THE system SHALL:
1. Store the request with status 'pending'
2. Include the user's reason for requesting
3. Prevent duplicate pending requests

WHEN a super administrator approves the request, THE system SHALL:
1. Create an admin role with grade 'regular' for the user
2. Update the request status to 'approved'
3. Grant admin-level access

IF the request is rejected, THE system SHALL:
1. Update the request status to 'rejected'
2. Store rejection notes
3. Allow the user to resubmit a new request with updated reasons.

### Account Ban and Unban

WHEN an administrator bans a user, THE system SHALL:
1. Mark the user account as banned
2. Immediately prevent login attempts
3. Preserve all existing data (orders, reviews, etc.)
4. Log the ban action with administrator and reason

WHEN an administrator unbans a user, THE system SHALL:
1. Remove the ban status
2. Restore login capability
3. Preserve all historical data integrity

IF a banned user attempts to log in, THE system SHALL show a banned-account message.

### Super Admin Role Hierarchy

WHEN a super administrator promotes a regular administrator, THE system SHALL:
1. Update the administrator's role grade to 'super'
2. Log the promotion with administrator details

WHEN a super administrator demotes another super administrator to regular grade, THE system SHALL:
1. Update the role grade to 'regular'
2. Log the demotion action
3. Preserve the role history

WHERE a super administrator attempts to demote themselves, THE system SHALL reject the request.

IF a user has no admin role, THE system SHALL deny all administrator access requests.

## CustomerProfile User Scenarios

After account creation, customers complete their profile by providing a display name and phone number. Customers can update these details at any time, and changes are recorded with snapshots for dispute resolution. The display name appears on reviews and public views; the phone number is used for delivery contact and shipping. When a customer deletes their account, the profile is removed, but related records like orders are preserved separately. Customers may also use profile information during checkout to prefill address details. Profile edits do not affect historical records of past purchases.

### Profile Setup After Registration

WHEN a customer completes registration, THE system SHALL require them to provide a display name and phone number before they can access the full platform.

IF the display name is missing, THE system SHALL reject the request with a clear message.
IF the phone number is missing or in invalid format, THE system SHALL reject the request.
IF the display name exceeds character limits, THE system SHALL reject the request.

A customer cannot browse products or access cart features until their profile is fully set up.

Profile setup is a one-time requirement after registration; it cannot be skipped.

### Editing Display Name and Phone Number

WHEN a customer edits their display name, THE system SHALL:
1. Validate the new display name for required format
2. Store the updated value
3. Reflect the change in profile listings and public views (e.g., reviews)

WHEN a customer edits their phone number, THE system SHALL:
1. Validate the new phone number format
2. Store the updated value
3. Require confirmation if format verification fails initially

IF the display name is already in use by another active profile, THE system SHALL reject the request.
IF the phone number fails format validation, THE system SHALL reject the request.

Customers may update both fields at any time after profile creation.

Editing display name or phone number does not affect historical records or snapshots.

### Profile Snapshot on Edit

WHEN a customer edits their display name or phone number, THE system SHALL automatically create a profile snapshot with:
1. Timestamp of the edit
2. Previous value of display name
3. Previous value of phone number
4. New value of display name
5. New value of phone number

THE snapshot SHALL be immutable and un-deletable.

WHEN a customer views their profile edit history, THE system SHALL display:
1. All snapshots in chronological order
2. Timestamp and values before and after each edit
3. Access control based on profile ownership

Profile snapshots support dispute resolution and audit compliance but do not affect existing orders or reviews.

### Profile Removal on Account Deletion

WHEN a customer deletes their account, THE system SHALL:
1. Remove the customer profile record (display name and phone number)
2. Preserve all related data in isolation (e.g., order records, reviews)
3. Mark the profile as deleted without deleting historical references

WHEN a deleted profile appears in public views, THE system SHALL display:
1. Placeholder text "deleted user" instead of real name
2. No visible phone number
3. Retained association with historical records

THE system SHALL NOT delete or modify order items, reviews, or other records referencing the deleted profile.

Profile removal occurs only when the account is permanently deleted, not during profile edits or suspension.

### Profile Data Used at Checkout

WHEN a customer proceeds to checkout, THE system SHALL prefill the shipping address form with:
1. Display name from profile as the default recipient name
2. Phone number from profile as the default contact number

IF the customer has no saved addresses, THE system SHALL require them to confirm or update profile-based fields.

THE system SHALL NOT automatically use profile data for future orders unless explicitly selected by the customer.

Changing profile data after an order is placed does not retroactively affect the shipping address of existing orders.

### Profile Independence from Historical Records

WHEN a customer updates their display name or phone number, THE system SHALL:
1. Apply changes only to the current profile version
2. Preserve historical values in snapshots
3. Leave all historical records (orders, reviews) unchanged

WHEN viewing historical data (past orders, reviews), THE system SHALL:
1. Show the display name as it existed at the time of the record
2. Show the phone number as it existed at the time of the record
3. Maintain integrity even after profile edits or account deletion

Profile modifications do not propagate to or affect any existing snapshots, order items, or review records.

Profile deletion preserves all related business records with anonymized identifiers where needed.

## SellerProfile User Scenarios

Sellers create a profile during registration by entering shop name, shop description, and uploading a logo image. Sellers can edit these details at any time, and each edit creates a new profile snapshot preserving the previous state. Profile information appears on product listings and seller detail pages. Seller profiles are approved by administrators before the seller can list products; if rejected, sellers see the reason and can resubmit. Suspended sellers retain access to edit orders but cannot modify their profile. When a seller deletes their account (only if no pending orders), their shop profile is removed but preserved in order history.

### Seller Profile Creation During Registration

WHEN a new seller completes registration with email and password, THE system SHALL prompt the seller to provide shop name, shop description (optional), and logo image.

WHEN the seller submits the initial profile information, THE system SHALL set the approvalStatus to "pending".

WHEN the seller submits the initial profile information, THE system SHALL create a profile snapshot with snapshotType "registration", preserving the initial shop name, description, and logo URL.

THE system SHALL prevent profile creation without a unique shop name across the platform.

THE system SHALL reject the registration if the shop name is empty, exceeds 100 characters, or contains prohibited content as defined by platform policy.

### Profile Edit with Snapshot Capture

WHEN a seller edits their profile (shop name, description, or logo), THE system SHALL create a new profile snapshot capturing the previous state before applying the change.

THE system SHALL store the snapshot type as "edit" and record the timestamp, the user who made the change, and the before/after values for each modified field.

THE system SHALL allow the seller to re-upload a logo image, and the new URL shall replace the previous one in the profile, with the old URL preserved in the snapshot.

IF the shop name is changed and another seller already uses that name, THE system SHALL reject the change and return a uniqueness error.

WHEN a seller attempts to update their profile while their account is suspended, THE system SHALL reject the request and indicate the account is suspended.

### Profile Approval Workflow

WHEN a seller submits a new or resubmitted registration request, administrators (including super administrators) SHALL be able to view the request in a pending list, including the original profile data and reason for rejection if previously rejected.

WHEN an administrator approves a seller registration, THE system SHALL set the seller's approvalStatus to "approved", allow the seller to begin listing products, and preserve the profile snapshot.

WHEN an administrator rejects a seller registration, THE system SHALL set the approvalStatus to "rejected", store the rejection reason provided by the administrator, and notify the seller.

THE system SHALL preserve all snapshot data, including prior snapshots, even after approval or rejection, for audit and dispute resolution.

WHEN a seller resubmits a new registration request after rejection, THE system SHALL create a new seller account (same email allowed), set approvalStatus to "pending", and create a new initial profile snapshot with type "registration".

### Profile Editing Under Suspension

WHEN a seller's account is suspended by an administrator, THE system SHALL prohibit all profile editing (shop name, description, logo) and return an appropriate error response.

WHEN a seller's account is unsuspended, THE system SHALL restore the seller's ability to edit their profile.

THE system SHALL allow suspended sellers to view their current profile and snapshots, but not modify it.

IF a profile edit request is made while the account is suspended, THE system SHALL return an error indicating the account is suspended and specify that profile editing is unavailable.

### Profile Removal on Account Deletion

WHEN a seller deletes their account (after satisfying deletion conditions), THE system SHALL remove the active seller profile.

THE system SHALL preserve all seller profile snapshots (registration, edits) indefinitely, including those created during the active period.

THE system SHALL NOT delete the profile snapshots simply because the seller profile has been removed.

THE system SHALL continue to reference the original shop name (from profile snapshots) in historical order records and other preserved data.

### Profile Preservation in Order History

WHEN an order item is created (i.e., product purchased), THE system SHALL create a snapshot of the seller's profile at that moment, including shop name, shop description, and logo URL.

THE system SHALL attach this profile snapshot to each order item and prevent subsequent profile edits from affecting historical order records.

WHEN an order item is displayed to the buyer (e.g., in order history, delivery confirmation), THE system SHALL show the shop name and logo from the order-time snapshot, not the seller's current profile.

WHEN an order item is displayed to administrators for oversight, THE system SHALL show the shop name and logo from the profile snapshot captured at the time of purchase.

THE system SHALL allow sellers and administrators to view the full profile snapshot history for audit purposes, with full data integrity and immutability guaranteed.

## Address User Scenarios

Customers can add multiple shipping addresses, each including recipient name, phone number, street address, city, state/province, postal code, and country. Customers can edit any address or delete one they no longer need. One address can be designated as the default for faster checkout. During checkout, customers select a shipping address—either the default or another—and that choice is locked in after ordering. Deleting an address removes it from the address list but does not affect past orders that used it. Addresses are tied to customer accounts and cannot be shared across users.

### Adding Multiple Shipping Addresses

WHEN a customer adds a new shipping address, THE system SHALL:
1. Require recipient name, phone number, street address, city, state/province, postal code, and country
2. Validate all required fields are present and properly formatted
3. Link the address to the customer's account
4. Set the new address as the default if no default exists yet

IF any required field is missing, THE system SHALL reject the request.
IF the phone number format is invalid, THE system SHALL reject the request.
IF the postal code format is invalid for the selected country, THE system SHALL reject the request.

### Editing and Deleting Addresses

WHEN a customer edits an address, THE system SHALL:
1. Allow modification of recipient name, phone number, street address, city, state/province, postal code, and country
2. Validate updated fields meet the same requirements as address creation
3. Update the address record with the new values

WHEN a customer deletes an address, THE system SHALL:
1. Remove the address from the customer's address list
2. Preserve the address record for historical order integrity
3. Automatically reassign default status to another address if the deleted address was the default

IF the address is currently set as the default shipping address, THE system SHALL select a new default address (if available) before deletion.
IF the customer has no other addresses, THE system SHALL clear the default address field.

### Setting Default Shipping Address

WHEN a customer sets an address as the default shipping address, THE system SHALL:
1. Designate the selected address as the default for that customer
2. Automatically clear default status from the previously designated address
3. Update the default address reference on the customer's profile

WHERE an address has been used in past orders, THE system SHALL:
1. Preserve the default address designation for future use
2. Not affect the historical shipping address used in those orders

IF the customer attempts to set an address as default that belongs to another customer, THE system SHALL reject the request.

### Address Selection at Checkout

WHEN a customer begins checkout, THE system SHALL:
1. Display all addresses associated with the customer's account
2. Highlight the default shipping address by default
3. Allow the customer to select any of their addresses for the current order

WHEN a customer selects an address for checkout, THE system SHALL:
1. Lock the selected address in the order at the time of placement
2. Prevent subsequent changes to the shipping address after order placement
3. Use the selected address for order fulfillment and tracking

IF the customer attempts to checkout with no addresses defined, THE system SHALL prompt them to add at least one address first.
IF a selected address has been deleted by the system (e.g., business rule enforcement), THE system SHALL reject the checkout and notify the customer to select a different address.

### Address Immutability in Historical Orders

WHERE an order has been placed with a specific address, THE system SHALL:
1. Preserve the exact address values as they were at checkout time
2. Not reflect subsequent address edits or deletions in the historical order record
3. Display the order's shipping address independently from the customer's current address list

WHEN a customer or administrator views an order, THE system SHALL:
1. Show the shipping address as it existed at the time of order placement
2. Include all address fields as captured during checkout
3. Maintain the address data even after the customer deletes the address from their current list

IF a customer deletes an address that was previously used in orders, THE system SHALL:
1. Keep the historical address records intact
2. Not cascade the deletion to past order records

### Address Ownership by Customer

WHEN a customer creates, edits, or deletes an address, THE system SHALL:
1. Ensure only the address owner can perform these operations
2. Prevent customers from viewing, modifying, or deleting addresses belonging to other customers
3. Validate that all address operations reference addresses owned by the authenticated customer

IF an address operation attempts to access an address belonging to another customer, THE system SHALL reject the request with ownership validation error.
IF an address referenced in an order is accessed by a different customer, THE system SHALL restrict access to read-only historical view.

WHERE a customer account is deleted, THE system SHALL:
1. Remove all addresses associated with that customer
2. Preserve order records with their historical address snapshots

## Category User Scenarios

Customers can browse all categories and subcategories, but cannot create, edit, or delete them—only administrators can. Categories help customers find products by organizing them into hierarchical groups (one level of nesting only). When viewing a category page, customers see all products in that category and subcategories. If a category is deleted by an administrator, products in it become uncategorized but remain visible. Customers cannot directly interact with category metadata beyond browsing; they use categories to filter search results or navigate product lists.

### Browsing Category Hierarchy

WHEN a customer views the category list, THE system SHALL display all top-level categories with their names and descriptions.

WHEN a customer expands a top-level category, THE system SHALL display its subcategories (one level deep) including their names and descriptions.

WHILE a customer navigates the category hierarchy, THE system SHALL allow them to drill down into subcategories without exceeding one level of nesting.

IF the category tree exceeds one level of nesting, THE system SHALL reject the category creation or update request.

### Category-Based Product Navigation

WHEN a customer selects a category, THE system SHALL display all products assigned to that category, including products in its subcategories.

WHEN a customer views a category page, THE system SHALL include the category name and description in the page header.

WHILE viewing a category page, THE system SHALL display products in paginated view with sorting and filtering options available.

IF a category has no products, THE system SHALL display an empty state message: "No products in this category."

IF a category is deleted by an administrator, THE system SHALL automatically mark its associated products as uncategorized but still visible.

### Category Filtering in Search

WHEN a customer performs a product search, THE system SHALL provide a filter for category selection.

WHEN the customer selects a category for filtering, THE system SHALL include products from both the selected category and its subcategories.

WHEN a customer applies a category filter, THE system SHALL update the product list and pagination to reflect the filtered results.

WHEN the customer removes the category filter, THE system SHALL reset the product list to show all products matching other active filters.

### Administrator-Only Category Management

WHEN a non-administrator attempts to access category creation functionality, THE system SHALL deny the request and show an access denial message.

WHEN an administrator creates a category, THE system SHALL require a name and allow an optional description.

WHEN an administrator creates a subcategory, THE system SHALL require selecting a parent category.

WHEN an administrator updates a category, THE system SHALL record a snapshot of the category name and description before modification.

WHILE an administrator edits a category name, THE system SHALL validate uniqueness within the same parent category.

### Category Deletion Impact on Products

WHEN an administrator deletes a category, THE system SHALL mark all products assigned to that category as uncategorized.

WHEN a product becomes uncategorized due to category deletion, THE system SHALL preserve the product’s visibility in search and category browsing under other categories (if assigned).

WHILE a customer searches products after a category deletion, THE system SHALL include previously categorized products in the uncategorized view.

IF a customer views a deleted category, THE system SHALL display a 404 or redirect to a no-longer-available indicator page.

### Category Metadata Visibility

WHEN a customer views any category page, THE system SHALL display the category name and description.

WHEN a customer hovers over or selects a category, THE system SHALL NOT expose administrative metadata (e.g., creation date, update timestamp, ID).

WHEN a seller or customer views a product detail page, THE system SHALL display the product’s category path (name hierarchy) but not internal identifiers.

IF a customer clicks on a category in a product detail page, THE system SHALL navigate to the category page.

## Product User Scenarios

Sellers create products by entering name, description, selecting a category, and setting a base price. Sellers can add images and variants, then publish the product for sale. Customers can search and filter products, view listings and details. Sellers can edit their products at any time—each edit creates a snapshot. Sellers can delete products only if no pending orders exist for any variant. Deleted products disappear from search and listings but their order snapshots remain. Customers cannot create or modify products; they only browse and purchase them.

### Product Creation by Sellers

### Product Creation by Sellers

WHEN a seller creates a product, THE system SHALL:
1. Require a name (non-empty string)
2. Require a description (non-empty string)
3. Require selection of a valid category (including subcategory)
4. Require a non-negative base price
5. Associate the product with the creating seller
6. Set the product status as active

WHEN the seller submits the product creation request, THE system SHALL:
- Verify the seller’s account is approved
- Verify the category exists and is not deleted
- Record the creation timestamp

IF the seller’s account is not approved, THE system SHALL reject the request.
IF the category does not exist or is deleted, THE system SHALL reject the request.
IF the base price is negative, THE system SHALL reject the request.
IF the name or description is empty, THE system SHALL reject the request.

### Product Editing with Snapshot Preservation

### Product Editing with Snapshot Preservation

WHEN a seller edits a product, THE system SHALL:
1. Preserve the existing product state in a new product snapshot
2. Allow edits to name, description, category, and base price
3. Allow edits to images (upload, reorder, delete)
4. Update the modified timestamp
5. Store the updated product state

WHERE product editing is allowed, THE system SHALL:
- Prevent editing of categories marked as deleted
- Reject edits when the seller’s account is suspended
- Ensure all images comply with format and size constraints

WHEN a product is edited, THE system SHALL create a product snapshot that:
- Records the product name, description, category, base price, and image list at that time
- Includes snapshots of all current product variants with their SKU, options, and price
- Is marked with the type "edit" and timestamp of modification

### Product Deletion Eligibility Rules

### Product Deletion Eligibility Rules

WHEN a seller requests product deletion, THE system SHALL:
1. Verify that no order items exist with status paid or shipped for any variant
2. Verify that no pending cancellation or refund requests exist for any variant
3. If both checks pass, delete the product and all its variants and images
4. If any checks fail, reject the deletion request

WHEN a product is deleted, THE system SHALL:
- Preserve all snapshots of the product and its variants
- Preserve all snapshots of order items referencing the product or variants
- Mark the product as logically deleted (not visible in listings)
- Remove the product from all wishlists automatically

IF any variant has a paid or shipped order item, THE system SHALL reject the deletion.
IF any variant has a pending cancellation or refund request, THE system SHALL reject the deletion.

### Product Visibility After Deletion

### Product Visibility After Deletion

WHILE a product is deleted, THE system SHALL:
- Exclude the product from search results
- Exclude the product from category listings
- Return "not found" or "unavailable" for product detail page requests

WHERE deleted products are referenced in existing order items, THE system SHALL:
- Preserve the product name, images, and price as recorded in the order snapshot
- Continue showing the product in customer order history and seller order items
- Show the product as unavailable (non-purchasable) in wishlists

WHEN an admin views all products, THE system SHALL:
- Show deleted products separately marked as "deleted"
- Allow admin to view snapshots of deleted products
- Allow admin to restore deleted products (revert logical deletion)

### Customer Browsing and Searching

### Customer Browsing and Searching

WHEN a customer searches products, THE system SHALL:
1. Allow keyword-based search by product name
2. Allow filtering by category (including subcategories)
3. Allow filtering by price range (minimum and maximum)
4. Allow filtering for in-stock products only
5. Sort by newest, lowest price, or highest price
6. Paginate results with consistent ordering

WHEN displaying product listings (search results, category view), THE system SHALL:
- Show main product image (thumbnail)
- Show product name
- Show seller shop name
- Show base price or price range (if variants differ)
- Show average rating (if reviews exist)
- Indicate out-of-stock variants

WHERE a customer views a product detail page, THE system SHALL:
- Show all product images in order
- Show name, description, and category
- Show seller shop name with link to seller profile
- Show all available variants with prices and stock status
- Show average rating and total review count
- Show all reviews sorted by newest first

### Product Status in Cart and Checkout

### Product Status in Cart and Checkout

WHEN a customer adds a variant to their cart, THE system SHALL:
1. Require selection of a specific variant (not just product)
2. Require a positive quantity
3. Check variant availability (stock > 0)
4. Merge with existing cart item if same variant already present

WHEN the cart is displayed, THE system SHALL:
- Show each item with product name, variant options, price, quantity, subtotal
- Highlight variants with insufficient stock
- Show warning when cart quantity exceeds available stock
- Mark unavailable variants (deleted or out of stock) as unavailable

WHEN a customer proceeds to checkout, THE system SHALL:
- Exclude unavailable cart items from checkout
- Show order summary with all items, shipping address, and total
- Lock the selected shipping address for the order
- Prevent checkout if any item violates availability or stock rules

WHEN an unavailable item is encountered at checkout, THE system SHALL:
- Block checkout until the item is removed
- Show error message indicating why the item is unavailable

## ProductImage User Scenarios

Sellers upload multiple images for each product and can reorder them, with the first image designated as the main thumbnail. Sellers can delete images from a product, and image changes are included in product snapshots. Customers see all images on the product detail page. If the main image is deleted, the next image in order becomes the new thumbnail. Deleted images are not accessible, but their order positions and associations are preserved in snapshots. Image changes do not affect order items or history.

### Product Image Upload Workflow

WHEN a seller uploads an image to a product, THE system SHALL:
1. Store the image URL and associate it with the product
2. Assign the next available sort order based on current images
3. Set isMain to true only if this is the first image for the product
4. Create a product snapshot that includes all existing and new images

IF the product already has images, THE system SHALL automatically set the new image's sortOrder to the highest existing sortOrder plus one.

WHERE multiple images are uploaded in a single request, THE system SHALL assign sortOrder sequentially, starting from the next available position.

IF an image fails to upload due to storage or format issues, THE system SHALL reject the request and preserve existing image order.

### Product Image Reordering

WHEN a seller reorders product images, THE system SHALL:
1. Accept new sortOrder values for each image
2. Update the sortOrder of all affected images atomically
3. Ensure each sortOrder value is unique within the product
4. Create a product snapshot that captures the previous and new image order

IF two or more images share the same sortOrder after reordering, THE system SHALL reject the request.

WHERE an image is excluded from the reorder request, THE system SHALL preserve its current sortOrder unchanged.

### Product Image Deletion Behavior

WHEN a seller deletes an image, THE system SHALL:
1. Remove the image from active product listings
2. Reassign sortOrder values for remaining images so that they form a continuous sequence starting at 1
3. Update isMain to true on the first remaining image if the deleted image was the main image
4. Create a product snapshot that includes the full list of images with updated sortOrder values

WHERE the main image is deleted, THE system SHALL automatically promote the new first image to be the main thumbnail.

IF a product would have zero images after deletion, THE system SHALL allow it but mark the product as having no main image until a new image is added.

### Image Changes in Product Snapshots

WHEN a product is edited by a seller, THE system SHALL:
1. Create a product snapshot that includes the current list of images with all fields (URL, sortOrder, isMain)
2. Preserve all images and their order at the time of the edit
3. Associate the snapshot with the edited product

WHERE images are deleted or reordered after a product snapshot was taken, THE system SHALL ensure the snapshot maintains its original image set and order.

THE system SHALL NOT create a new product snapshot solely for image changes unless they occur as part of a product edit request.

### Image Display in Product Detail View

WHEN a customer views a product detail page, THE system SHALL:
1. Display all product images ordered by sortOrder
2. Show the main image (isMain = true) as the primary thumbnail in lists and on the detail page
3. Allow navigation through all images in sortOrder sequence
4. Show all image URLs regardless of their deletion status in the current product

WHERE an image has been deleted, THE system SHALL still display it if included in a product snapshot referenced by an order or historical record.

THE system SHALL preserve the original image order even if the current active product has a different image sequence.

### Image Immutability in Order Snapshots

WHEN a product is purchased, THE system SHALL:
1. Create a product snapshot at the time of order placement
2. Include all current images with their sortOrder and isMain values in the snapshot
3. Preserve that snapshot in each order item for that product
4. Ensure the snapshot is immutable and independent of future image changes

WHERE images are added, deleted, or reordered after an order is placed, THE system SHALL NOT affect the image data stored in the order's snapshot.

THE system SHALL maintain the original image order and properties within the order snapshot for audit and dispute resolution purposes.

## ProductVariant User Scenarios

Sellers define variants for a product, specifying unique SKU codes, option values (e.g., color/size), optional price overrides, and stock quantities. Customers must select a specific variant when adding to cart or purchasing; out-of-stock variants cannot be selected. Sellers can edit variant details (except SKU code in most cases), and every edit creates a snapshot. Sellers can delete variants only if no pending orders exist. If all variants of a product are deleted, the product becomes unavailable but remains listed. Variant prices may differ from base price, and cart/checkout reflects variant-specific pricing.

### ProductVariant Creation

### ProductVariant Creation

WHEN a seller creates a product variant, THE system SHALL:
1. Require a unique SKU code for the product
2. Require option values (e.g., color, size) expressed as a structured set of key-value pairs
3. Accept an optional price override that may differ from the product’s base price
4. Require a non-negative initial stock quantity (starting at 0)
5. Associate the variant with its parent product

IF the SKU code is already used for another variant of the same product, THE system SHALL reject the creation.
IF the stock quantity is negative, THE system SHALL reject the creation.
WHERE a price override is provided, THE system SHALL allow it to be lower or higher than the base price.

### Variant Selection by Customers

### Variant Selection by Customers

WHEN a customer views a product’s detail page, THE system SHALL:
1. Display all available variants with their option values
2. Show each variant’s price (base price or variant-specific override)
3. Indicate stock status for each variant

WHEN a customer adds a product to their cart, THE system SHALL:
1. Require selection of a specific variant, not just the product
2. Record the selected variant’s SKU code and option values at that time
3. Store the variant price used at selection time for cart/checkout consistency

IF the customer selects an out-of-stock variant, THE system SHALL block the addition to cart.

### Out-of-Stock Variant Blocking

### Out-of-Stock Variant Blocking

WHEN a customer attempts to add an out-of-stock variant to their cart, THE system SHALL:
1. Reject the request and display a clear out-of-stock message
2. Prevent order placement for that variant

WHERE an out-of-stock variant exists in the cart before restocking, THE system SHALL:
1. Allow the customer to retain the item if stock becomes available
2. Show a restock warning if quantity exceeds available stock

WHILE a variant has zero available stock, THE system SHALL NOT allow selection during:
- Product detail view purchase flow
- Checkout confirmation
- Order item modification

### Variant Editing and Snapshot Capture

### Variant Editing and Snapshot Capture

WHEN a seller edits a variant’s details (option values, price, or stock), THE system SHALL:
1. Create a product variant snapshot at the time of edit
2. Capture the variant’s SKU code, option values, price override, and stock quantity before modification
3. Store the edit timestamp and indicate it as an ‘edit’ type snapshot
4. Allow the seller to retain the variant with updated values

WHERE a variant is part of a pending order or has active cancellation/refund requests, THE system SHALL:
1. Block editing of SKU code and price override
2. Allow stock quantity adjustments only via inventory records (not direct edit)

WHEN a variant is deleted, THE system SHALL preserve all associated snapshots for historical integrity.

### Variant Deletion Eligibility

### Variant Deletion Eligibility

WHEN a seller attempts to delete a variant, THE system SHALL:
1. Verify that no order items exist for this variant with status ‘paid’ or ‘shipped’
2. Verify that no pending cancellation or refund requests exist for this variant
3. Only permit deletion if both conditions are satisfied

IF the variant fails eligibility, THE system SHALL:
1. Reject the deletion and explain why
2. List the affected order items or pending requests

WHERE deletion succeeds, THE system SHALL:
1. Remove the variant from active listings and cart availability
2. Preserve all historical snapshots and inventory records
3. Maintain order item records referencing the variant for audit and dispute resolution

### Variant-Specific Pricing in Checkout

### Variant-Specific Pricing in Checkout

WHEN a variant with a price override is included in an order, THE system SHALL:
1. Use the variant’s overridden price (not the product base price) for item pricing
2. Lock that price at checkout time (no subsequent price changes affect the order)
3. Include the variant’s price in the cart subtotal and order total calculations

WHERE variant prices differ among items in the same order, THE system SHALL:
1. Display each item’s unit price and total separately in the order summary
2. Sum individual item totals to compute the order total

WHEN a variant’s price changes after an order item is created, THE system SHALL:
1. Preserve the original variant price in the order snapshot linked to that item
2. Not retroactively update any already-confirmed orders

## ProductSnapshot User Scenarios

Every time a seller edits a product, a snapshot is created preserving the full product state—including name, description, category, base price, and image set—at that moment. Customers viewing product detail pages can see snapshots, but sellers and administrators have full access. Snapshots appear in order items to preserve exact product details at time of purchase. Even if a product is deleted, its snapshots remain. Sellers can view their own product snapshots for dispute resolution or reference. Administrators can view all product snapshots across the platform.

### Automatic Snapshot on Product Edit

WHEN a seller edits a product, THE system SHALL automatically create a product snapshot.

THE system SHALL record the exact timestamp when the snapshot is created.

THE system SHALL NOT allow snapshot creation if the edit fails validation.

WHILE the product edit is in progress, THE system SHALL prevent concurrent snapshot creation for the same edit operation.

IF the product has no existing variants, THE system SHALL still create a snapshot preserving the current product state.

### Snapshot Contents

WHEN a product snapshot is created, THE system SHALL include:
1. Product name
2. Product description
3. Product category (including category ID and name)
4. Base price at time of snapshot
5. All product images in their current order and main image designation

WHERE a snapshot is created for a product edit, THE system SHALL include product snapshots of all variants at that moment.

WHERE a variant exists, THE system SHALL include the variant’s SKU code, option values, price override (if any), and stock quantity at the time of snapshot.

### Snapshot Use in Order Preservation

WHEN an order item is created from a purchased product, THE system SHALL create a snapshot of the product and all its variants.

THE system SHALL associate the order item with the product snapshot ID and preserve all variant snapshot IDs.

WHEN a seller profile is attached to an order item, THE system SHALL create a snapshot of the seller profile and link it to the order item.

THE snapshot data SHALL remain unchanged even if the original product or variant is later modified or deleted.

WHEN an order is viewed, THE system SHALL display product name, variant options, and price exactly as captured in the snapshot.

### Snapshot Retention After Product Deletion

WHEN a seller deletes a product, THE system SHALL preserve all existing product snapshots.

THE system SHALL NOT delete product snapshots even if all associated products and variants are removed.

THE system SHALL maintain the link between product snapshots and all related order items.

WHERE a product is deleted, THE system SHALL allow retrieval of its product snapshots using the snapshot ID alone.

### Seller Access to Own Snapshots

WHEN a seller views a product they own, THE system SHALL provide access to all its product snapshots.

THE system SHALL allow sellers to view a list of snapshots sorted by creation time (newest first).

WHERE a snapshot is retrieved, THE system SHALL show the timestamp, edit reason (if provided), and link to view variant snapshots.

WHEN a seller views a snapshot of their product, THE system SHALL display the complete product and variant state as it existed at that moment.

WHERE a seller deletes their own product, THE system SHALL retain snapshot access for dispute resolution purposes.

### Administrator Access to All Snapshots

WHEN an administrator accesses the platform, THE system SHALL allow them to view any product snapshot across all sellers.

THE system SHALL provide administrators with filters to search snapshots by product name, seller, or timestamp range.

WHERE an administrator views a snapshot, THE system SHALL display the full product and variant state, including original pricing and images.

THE system SHALL allow administrators to compare two snapshots of the same product to identify changes.

WHERE a product is suspended or banned, THE system SHALL retain snapshot accessibility for audit and enforcement purposes.

## ProductSnapshotVariant User Scenarios

When a product snapshot is created, all its variants at that time—including SKU code, option values, price, and stock snapshot—are preserved as product-snapshot-variants. This ensures that at any point, customers and administrators can see exactly how variants looked and were priced when purchased. Order items reference product-snapshot-variants to maintain fidelity of what was bought. If a variant is later deleted or edited, its snapshot record remains unchanged. Sellers and administrators use these to resolve disputes or audit changes.

### Variant Snapshot Creation at Product Edit Time

WHEN a seller edits a product, THE system SHALL:
1. Capture a snapshot of the product (including name, description, category, and images)
2. Create one or more product-snapshot-variants representing all variants at that moment
3. Preserve each variant’s SKU code, option values, price override, and stock quantity as it existed at edit time
4. Link each product-snapshot-variant to its parent product-snapshot via snapshotId
5. Ensure each product-snapshot-variant has an immutable creation timestamp

IF a variant has been deleted before the edit, it SHALL NOT appear in the new snapshot.

WHERE multiple sellers edit the same product concurrently, THE system SHALL create separate snapshots for each edit, each containing the variant state at that exact moment.

### SKU, Option Values, and Price Preservation

WHEN a product-snapshot-variant is created, THE system SHALL:
1. Preserve the exact SKU code at the time of snapshot
2. Preserve the complete option values JSON object (e.g., {color: "Red", size: "Large"})
3. Preserve the price override if present, or null if using base price
4. Preserve the stock quantity as it was at snapshot time, not current stock
5. Ensure all preserved values are immutable and cannot be altered after creation

IF a variant has no price override, THE snapshot SHALL store priceOverride as null.

IF a variant’s option values are empty, THE snapshot SHALL preserve the empty JSON object, not omit them.

### Variant Snapshot Usage in Order Items

WHEN an order is placed, THE system SHALL:
1. Create an order-item for each purchased variant
2. Link the order-item to a product-snapshot and the corresponding product-snapshot-variant
3. Include in the order-item the product name, variant SKU, option values, and price as preserved in the snapshot
4. Ensure the order-item’s seller profile snapshot references the seller at time of purchase

IF the original variant is later edited or deleted, THE system SHALL NOT update the order-item or its linked snapshot.

WHERE a customer reorders the same product-variant combination, THE system SHALL create a new snapshot (with current values), not reuse the old one.

### Snapshot Integrity After Variant Deletion

WHEN a product variant is deleted by its seller, THE system SHALL:
1. NOT delete any existing product-snapshot-variants referencing that variant
2. Retain all product-snapshot-variants with their original SKU, options, and price
3. Prevent deletion if any product-snapshot-variant is linked to an order-item
4. Mark the variant as deleted in its parent product, but preserve all historical snapshots

WHERE a product is deleted, THE system SHALL:
1. Preserve all associated product-snapshots and product-snapshot-variants
2. Maintain linkage between snapshots and preserved order-items

THE system SHALL provide access to variant snapshots even after product or variant deletion.

### Dispute Resolution with Variant Snapshots

WHEN a dispute arises about an order item’s details, THE system SHALL:
1. Allow the customer and seller to view the exact product-snapshot-variant used for that order
2. Display the variant’s SKU code, option values, and price as captured at purchase time
3. Provide audit metadata showing when the snapshot was created and by whom

WHERE the seller disputes the variant description, THE system SHALL:
1. Prioritize the snapshot version over any current or future edits
2. Present the snapshot as the authoritative record for resolution

WHILE reviewing a dispute, THE system SHALL:
1. Show variant options in the same format used at time of purchase
2. Preserve any price differences that caused billing to occur

WHERE no dispute exists, THE system SHALL NOT display snapshot details to avoid confusion.

### Administrator Access to Variant Snapshots

WHEN an administrator views a product-snapshot or product-snapshot-variant, THE system SHALL:
1. Allow access regardless of seller or customer ownership
2. Display all preserved fields including SKU code, option values, price override, and stock quantity at snapshot time
3. Provide creation timestamp and snapshot type (edit/order/refund/cancel)

WHERE an administrator investigates a policy violation, THE system SHALL:
1. Enable viewing all historical variant snapshots for the affected product
2. Allow export of snapshot variant data for forensic review

THE system SHALL ensure administrator access is logged, including which snapshots were viewed and when.

## InventoryRecord User Scenarios

Sellers restock variants by adding positive inventory records with a reason, and subtract stock via adjustments or losses. When a customer purchases a variant, a negative inventory record is created automatically, reducing available stock. If an order is cancelled or refunded, a positive record restores the stock. Sellers can view a full inventory history for each variant, showing all changes over time. Stock quantities are recalculated as the sum of all records, and variants go 'out of stock' when the total reaches zero. Out-of-stock variants cannot be added to cart or purchased.

### Restocking with Inventory Records

WHEN a seller adds inventory to a variant, THE system SHALL create a positive inventory record with the quantity change, reason (e.g., "restock"), and associated variant.

THE system SHALL require the seller to specify a positive quantity and a valid reason code for restocking.

IF the quantity is zero or negative, THE system SHALL reject the request.

IF the reason code is not recognized, THE system SHALL reject the request.

### Automatic Deduction on Purchase

WHEN a customer successfully places an order containing a variant, THE system SHALL automatically create a negative inventory record for that variant.

THE inventory deduction SHALL match the purchased quantity.

THE system SHALL create the inventory record at the moment of successful payment, not at checkout initiation.

IF insufficient stock is available at the time of payment, THE system SHALL reject the order and restore the cart availability state.

### Stock Restoration on Cancellation/Refund

WHEN a cancellation request for an order item is approved, THE system SHALL create a positive inventory record for the corresponding variant with the cancelled quantity.

WHEN a refund request for an order item is approved, THE system SHALL create a positive inventory record for the corresponding variant with the refunded quantity.

THE system SHALL create the inventory record immediately upon approval of the cancellation or refund request.

IF the request is rejected, THE system SHALL NOT create any inventory record.

### Adjustment/Loss Tracking

WHEN a seller records an inventory adjustment (e.g., damage, theft, or error), THE system SHALL create a negative inventory record with the adjusted quantity and a valid reason code (e.g., "adjustment" or "loss").

THE system SHALL require a positive quantity and a valid reason code for adjustments.

IF the quantity is zero or negative, THE system SHALL reject the adjustment request.

IF the adjustment would cause current stock to go negative, THE system SHALL allow it but log a warning for administrative review.

### Inventory History View for Sellers

WHEN a seller views the inventory history for a variant, THE system SHALL display all inventory records associated with that variant.

Each inventory record shall include: quantity change, reason code, timestamp, and reference ID (e.g., order ID, cancellation/refund ID, adjustment ID).

THE system SHALL calculate and display the current stock quantity as the sum of all inventory records.

THE system SHALL present records in reverse chronological order (newest first).

WHERE a variant has no inventory records, THE system SHALL show current stock as zero.

### Out-of-Stock Blocking Behavior

WHEN a customer attempts to add a variant to their cart and its current stock is zero, THE system SHALL prevent the addition and display an out-of-stock warning.

WHEN checking cart availability, THE system SHALL mark variants with zero stock as unavailable.

THE system SHALL continue to show unavailable variants in the cart but disable checkout for those items.

IF a variant’s stock drops to zero after being added to cart, THE system SHALL immediately mark it as unavailable in the cart UI.

## CartItem User Scenarios

Customers add variants to their cart, selecting quantity for each; if the same variant is already in cart, quantities merge. Customers can view, update quantities, or remove items from cart. Cart warns if stock is lower than cart quantity or if a variant is out of stock. If a variant is deleted or becomes unavailable, it is marked as unavailable in cart and cannot be checked out. Only available items can proceed to checkout. Cart totals reflect current prices and availability. During checkout, unavailable items are excluded from order creation.

### Adding Cart Items

WHEN a customer adds a variant to their cart, THE system SHALL:
1. Require selection of a specific variant (not just a product)
2. Require a positive integer quantity (minimum 1)
3. If the same variant already exists in the cart, merge quantities (do not create duplicate line items)
4. Store the variant's current price and product name at the time of addition

WHERE the variant is unavailable (deleted or out of stock), THE system SHALL reject the addition and display an appropriate error message.

### Stock-Based Cart Warnings

WHEN a customer views or updates their cart, THE system SHALL:
1. Compare each item's quantity to the variant's current stock
2. IF the stock quantity is less than the cart quantity, THEN display a warning that the available stock is insufficient
3. WHERE the variant is out of stock (stock = 0), THEN display a clear out-of-stock indicator
4. Prevent cart quantity updates that exceed available stock

WHERE a variant becomes unavailable (deleted or out of stock) after being added to the cart, THE system SHALL mark the item as unavailable and display a clear indicator.

### Quantity Updates and Removal

WHEN a customer updates the quantity of a cart item, THE system SHALL:
1. Validate that the new quantity is a positive integer
2. Validate that the new quantity does not exceed the variant's available stock
3. Update the item's subtotal and cart total

WHEN a customer removes an item from the cart, THE system SHALL:
1. Remove the item entirely
2. Recalculate and update the cart total immediately
3. Preserve cart state until explicit removal

WHERE the seller of a cart item is suspended, THE system SHALL allow removal but prevent quantity increases beyond the current quantity.

### Unavailable Variant Handling

WHEN a variant in the cart becomes unavailable (deleted or out of stock) after addition, THE system SHALL:
1. Mark the item as unavailable in the cart interface
2. Disable quantity adjustments for that item
3. Exclude the item from checkout eligibility
4. Retain the item in cart until explicitly removed by customer

WHERE a customer attempts to checkout while unavailable items exist, THE system SHALL prevent checkout until all unavailable items are removed or become available again.

### Cart Validation Before Checkout

WHEN a customer initiates checkout, THE system SHALL validate:
1. All cart items are associated with active, non-suspended sellers
2. All cart items are associated with available variants (not deleted and in stock)
3. All cart items have sufficient stock for their quantities

IF any validation fails, THE system SHALL:
1. Display a clear summary of failed items
2. Provide options to remove unavailable items or adjust quantities
3. Block checkout until all validations pass

WHERE the cart is empty, THE system SHALL prevent checkout initiation and display an appropriate message.

### Cart Item Exclusion at Checkout

WHEN an item is removed from the cart during checkout preparation, THE system SHALL:
1. Update the cart total and item count immediately
2. Re-validate remaining items against current stock and availability
3. Clear any previously stored failed validations

WHERE a cart item becomes unavailable between validation and order placement, THE system SHALL:
1. Block order creation
2. Clear the cart of that item
3. Display a clear explanation to the customer

THE system SHALL ensure that only items passing all validations at checkout time are included in the resulting order.

## WishlistItem User Scenarios

Customers can add products to their wishlist (not specific variants), and view or manage it over time. Wishlist items are paginated and remain until manually removed by the customer. If a product is deleted by the seller, it is automatically removed from all customer wishlists. Wishlists do not affect stock, pricing, or availability—customers must still add items to cart to purchase. Customers can revisit their wishlist across sessions to compare or plan purchases. Wishlist items do not create inventory records or affect order processing.

### Adding Products to Wishlist

WHEN a customer selects a product to add to their wishlist, THE system SHALL:
1. Allow the customer to add the product (not a specific variant)
2. Ensure the product is not already in their wishlist
3. Record the addition with the current timestamp
4. Make the item visible in the customer's wishlist immediately

IF the customer attempts to add a product already in their wishlist, THE system SHALL reject the request and show a duplicate warning.

WHERE the customer has multiple devices, THE system SHALL synchronize the wishlist state across sessions.

### Viewing and Managing Wishlist

WHEN a customer views their wishlist, THE system SHALL:
1. Show products sorted by newest first
2. Display pagination with a fixed number of items per page
3. Include product name, main image, base price, and seller shop name
4. Show available stock status for each product

WHEN a customer removes a product from their wishlist, THE system SHALL:
1. Delete the wishlist item immediately
2. Remove it from the displayed list
3. Reflect the removal in subsequent views

WHEN a customer revisits their wishlist, THE system SHALL preserve all items from previous sessions until manually removed.

### Automatic Removal on Product Deletion

WHEN a seller deletes a product, THE system SHALL:
1. Automatically remove all wishlist items referencing that product
2. Do so regardless of which customer owns the wishlist item
3. Not require manual intervention by the customer
4. Not trigger inventory adjustments

IF a wishlist item references a product that has been deleted, THE system SHALL treat the item as non-existent for display purposes.

### Wishlist Persistence Across Sessions

WHEN a customer logs in and accesses their wishlist, THE system SHALL:
1. Restore all wishlist items from previous sessions
2. Preserve the original addition timestamps
3. Maintain product state as of last access (product name, price, images)
4. Continue to show items even if product details change later

WHILE a customer is logged out, THE system SHALL:
1. Not store wishlist data persistently
2. Require login to access or modify wishlists
3. Reject wishlist actions from unauthenticated users

### Wishlist Independence from Stock and Orders

WHERE a product is out of stock, THE system SHALL:
1. Allow it to remain in the customer's wishlist
2. Show the out-of-stock status in the wishlist view
3. Not prevent the customer from viewing the wishlist
4. Only block purchase attempts when the item is added to cart

WHERE a product is deleted by the seller, THE system SHALL:
1. Keep the wishlist item until automatic cleanup
2. Not create inventory records
3. Not affect order processing
4. Not influence payment or shipping workflows

### No Inventory Impact from Wishlist

WHEN items are added to or removed from the wishlist, THE system SHALL:
1. Not modify any inventory records
2. Not affect stock quantities
3. Not create or alter inventory history
4. Not influence future product availability calculations

WHERE a product in the wishlist is purchased, THE system SHALL:
1. Not automatically remove the item from wishlist
2. Allow the customer to keep it for future reference
3. Require explicit removal if desired

THE system SHALL:
1. Not use wishlist data for inventory forecasting
2. Not use wishlist data for restocking decisions
3. Not generate inventory alerts based on wishlist counts

## Order User Scenarios

After successful payment, a customer order is created containing one or more order items from potentially multiple sellers. Customers review order summary including items, shipping address, and total before confirming. Once confirmed, the order is locked, and the shipping address cannot be changed. Orders can be viewed in a history list, sorted by newest first, with pagination. Customers can view full order details, including item statuses and shipment tracking. Orders transition through statuses like paid, shipped, delivered, cancelled, or refunded based on item states.

### Order Creation After Payment

WHEN a customer confirms payment for their cart, THE system SHALL:
1. Create an order with a unique order number
2. Include all items in the cart as order items
3. Lock the shipping address used at checkout
4. Decrease stock quantities for each purchased variant
5. Remove items from the customer's cart
6. Capture snapshots of each product, variant, and seller profile at the time of purchase
7. Set initial status for each order item to "paid"

IF payment fails, THE system SHALL NOT create an order and SHALL preserve the cart items for retry.

WHERE multiple order items exist from different sellers, THE system SHALL group items by seller for shipment processing while maintaining a single order record.

### Order Summary Review and Confirmation

WHEN a customer reviews their order summary before confirming payment, THE system SHALL:
1. Display all items in the cart with product name, variant options, unit price, quantity, and subtotal
2. Display the selected shipping address (recipient name, street address, city, state, postal code, country)
3. Calculate and display the total order price (sum of all item subtotals)
4. Indicate the final order status as "pending payment"

WHEN a customer confirms the order, THE system SHALL:
1. Lock the shipping address to prevent future changes
2. Initiate payment processing through the external payment gateway
3. Freeze all prices and product snapshots at the time of confirmation

IF unavailable items (deleted, out of stock) are present in the cart, THE system SHALL prevent checkout and display an error.

### Shipping Address Locking

WHEN a customer proceeds to payment confirmation, THE system SHALL:
1. Lock the selected shipping address from that point forward
2. Prevent any future edits to the address for that order
3. Preserve the exact address values at order time in the order record

WHEN a customer attempts to modify the shipping address after order confirmation, THE system SHALL reject the request and display an error message.

WHERE an order requires multiple shipments from different sellers, THE system SHALL maintain one immutable shipping address per order (not per shipment).

### Order History View

WHEN a customer views their order history, THE system SHALL:
1. Display a paginated list of orders sorted by newest first
2. Show for each order: order number, date, total price, and overall order status
3. Show the count of order items and distinct sellers

WHEN a customer views details of a specific order, THE system SHALL:
1. Display the list of order items with product name, variant options, quantity, unit price, and item status
2. Display the locked shipping address
3. Display the list of shipments with tracking information
4. Display the order creation timestamp and last updated timestamp

WHERE a customer requests a different customer's order history, THE system SHALL reject the request.

### Order Status Transitions

WHEN an order is created, THE system SHALL set the overall order status to "paid" if all items are paid.

WHEN any item in an order transitions to "shipped", THE system SHALL update the overall order status to "shipped".

WHEN all items in an order transition to "delivered", THE system SHALL update the overall order status to "delivered".

WHEN all items in an order transition to "cancelled", THE system SHALL update the overall order status to "cancelled".

WHEN all items in an order transition to "refunded", THE system SHALL update the overall order status to "refunded".

WHEN an order contains items in mixed statuses (e.g., some delivered, some cancelled), THE system SHALL set the overall order status to "partially completed".

WHERE the last item in an order is refunded, THE system SHALL update the overall order status to "refunded".

### Multi-Seller Order Composition

WHEN a customer places an order containing items from multiple sellers, THE system SHALL:
1. Create a single order record with a unique order number
2. Group order items by seller for shipping purposes
3. Create separate shipments for each seller
4. Preserve each seller's profile snapshot with their respective items

WHEN an order is split across multiple shipments from different sellers, THE system SHALL:
1. Allow each seller to independently create and track their shipment
2. Maintain one shipping address for the entire order (not per shipment)
3. Enable the customer to view each shipment separately in the order details

WHERE a seller in an order is deleted, THE system SHALL:
1. Remove the seller's products from future listings
2. Preserve the seller's profile snapshot with all related order items
3. Allow the customer to view the deleted seller's shop name in past orders

## OrderItem User Scenarios

Each purchased variant becomes an order item with quantity, preserving product and variant snapshots at time of purchase. Order items track individual statuses: paid, shipped, delivered, cancelled, or refunded. Customers can request cancellation or refund per item, and sellers respond accordingly. When cancelled or refunded, the item’s stock is restored via inventory records. The overall order status reflects the collective state of its items. Customers see item-level details in order history and can act on them independently.

### Order Item Creation and Status Tracking

### Order Item Creation

WHEN a customer completes checkout after successful payment, THE system SHALL:
1. Create one order item for each unique product variant in the cart
2. Set the quantity equal to the cart item quantity
3. Capture and preserve the product name at the time of purchase
4. Link the order item to the selected product variant
5. Store the variant's current price (including overrides) as the item price
6. Record the seller profile at time of purchase (shop name and logo)
7. Assign initial status as "paid"
8. Create product and product variant snapshots linked to the order item

WHERE a customer adds the same variant multiple times in cart, THE system SHALL:
1. Merge quantities into a single order item instead of creating separate items
2. Use the highest variant price if prices differ across cart entries

IF payment fails, THE system SHALL NOT create any order items.
IF a variant is deleted after checkout but before fulfillment, THE system SHALL preserve the order item with its snapshots.

### Item Status Tracking

WHEN an order item is created, THE system SHALL:
1. Assign initial status "paid"
2. Record the creation timestamp

WHEN a seller ships items in a shipment, THE system SHALL:
1. Change the status of all items in the shipment to "shipped"
2. Record the shipment timestamp

WHEN a customer confirms delivery of a shipment, THE system SHALL:
1. Change the status of all items in that shipment to "delivered"
2. Record the delivery confirmation timestamp

WHERE no delivery confirmation is made, THE system SHALL:
1. Automatically change status to "delivered" after 14 days from shipping

WHEN a cancellation request is approved for an item, THE system SHALL:
1. Change the item status to "cancelled"

WHEN a refund request is approved for an item, THE system SHALL:
1. Change the item status to "refunded"

WHILE an order item has status "paid", THE system SHALL:
1. Allow the customer to request cancellation
2. Prevent shipment creation for the item

WHILE an order item has status "shipped", THE system SHALL:
1. Prevent new cancellation requests
2. Allow refund requests (if delivered or delivered automatically)

WHILE an order item has status "delivered", THE system SHALL:
1. Allow the customer to request refund
2. Allow the customer to write a review

### Item-Level Cancellation Requests

WHEN a customer requests cancellation for a "paid" item, THE system SHALL:
1. Require a text reason
2. Create a cancellation request with status "pending"
3. Create a snapshot of the cancellation request state
4. Block seller from shipping the item

WHEN a seller responds to a cancellation request, THE system SHALL:
1. Update the request status to "approved" or "rejected"
2. Create a snapshot of the request state after response
3. Allow only one response per request

IF a cancellation request is approved, THE system SHALL:
1. Change the item status to "cancelled"
2. Restore the variant's stock quantity via inventory record
3. Process a refund for the item amount
4. If all items in the order are cancelled, change the order status to "cancelled"

IF a cancellation request is rejected, THE system SHALL:
1. Keep the item status unchanged
2. Allow seller to proceed with shipping

WHEN an item is "paid" but the variant stock is insufficient for new orders, THE system SHALL:
1. Block new cancellation requests until stock is verified
2. Notify the customer if stock has changed since purchase

### Item-Level Refund Requests

WHEN a customer requests a refund for a "delivered" item, THE system SHALL:
1. Require a text reason
2. Create a refund request with status "pending"
3. Create a snapshot of the refund request state

WHERE a delivery confirmation was automatic (14-day rule), THE system SHALL:
1. Start the 7-day refund eligibility window from the automatic delivery date

IF the item status is not "delivered", THE system SHALL:
1. Reject the refund request
2. Return an error indicating delivery status requirement

WHEN a seller responds to a refund request, THE system SHALL:
1. Update the request status to "approved" or "rejected"
2. Create a snapshot of the request state after response
3. Allow only one response per request

IF a refund request is approved, THE system SHALL:
1. Change the item status to "refunded"
2. Restore the variant's stock quantity via inventory record
3. Process a refund for the item amount
4. If all items in the order are refunded, change the order status to "refunded"

IF a refund request is rejected, THE system SHALL:
1. Keep the item status unchanged
2. Allow the customer to keep the item

### Order Status Derivation

WHEN any item status changes, THE system SHALL:
1. Recalculate the order status based on its items
2. Update the order status field

THE order status SHALL be:
- "paid" when all items are "paid"
- "shipped" when any item is "shipped" and none are "delivered"
- "delivered" when all items are "delivered"
- "cancelled" when all items are "cancelled"
- "refunded" when all items are "refunded"
- "partially completed" for any mixed state (e.g., some delivered, some refunded)

WHILE an order status is "paid", THE system SHALL:
1. Show all items as waiting for shipment
2. Allow item-level cancellations

WHILE an order status is "shipped", THE system SHALL:
1. Show all items as shipped
2. Prevent new cancellations
3. Allow item-level refunds for delivered items

WHERE an order contains items from multiple sellers, THE system SHALL:
1. Track status per item independently
2. Apply the above rules across all items regardless of seller


### Snapshot Capture and Stock Management

### Order Item Snapshots for Preservation

WHEN an order is placed, THE system SHALL:
1. Create a product snapshot for each order item's product
2. Create a product variant snapshot for each order item's variant
3. Include all current product data (name, description, category, images, price)
4. Include all variant data (SKU, options, price override, stock)
5. Link the snapshots to the order item for historical reference

WHEN a product is edited after an order is placed, THE system SHALL:
1. Update the live product data
2. Preserve the original snapshot linked to existing order items
3. Ensure new orders use updated data, not old snapshots

WHEN a product is deleted after an order is placed, THE system SHALL:
1. Keep all order item snapshots intact
2. Maintain product name and variant details in order history
3. Preserve snapshots for audit and dispute resolution

WHERE an order item's variant price changed after purchase, THE system SHALL:
1. Use the original snapshot price for billing and history
2. Show the current variant price as informational only

### Stock Restoration on Item Cancellation/Refund

WHEN an item cancellation request is approved, THE system SHALL:
1. Create an inventory record with positive quantity change
2. Specify reason as "cancel"
3. Reference the order item ID in the record
4. Update the variant's current stock quantity

WHEN an item refund request is approved, THE system SHALL:
1. Create an inventory record with positive quantity change
2. Specify reason as "refund"
3. Reference the order item ID in the record
4. Update the variant's current stock quantity

WHERE stock restoration would exceed original quantity (e.g., customer returns damaged item but full stock is restored), THE system SHALL:
1. Record the full restoration amount
2. Allow sellers to track adjustments separately

WHEN inventory restoration occurs, THE system SHALL:
1. Make the variant available for new orders
2. Update the variant's "in-stock" status in the product detail page

WHERE multiple items in the same order are cancelled or refunded, THE system SHALL:
1. Create separate inventory records for each item
2. Preserve the original order and item linkage in each record


## Shipment User Scenarios

Sellers group one or more of their order items into shipments, entering carrier and tracking details. Each shipment includes only items from the same seller and order. Customers receive shipment notifications with tracking links. Customers confirm delivery per shipment, which updates all items in the shipment to delivered status. If no confirmation occurs within 14 days, items automatically move to delivered. Shipment timing is independent per seller, enabling flexible fulfillment.

### Seller Shipment Grouping

WHEN a seller creates a shipment, THE system SHALL:
1. Group only order items belonging to that seller
2. Group only order items from the same order
3. Require selection of one or more items for inclusion in the shipment
4. Prevent inclusion of items that are already shipped or cancelled

WHEN a seller selects items for a shipment, THE system SHALL:
1. Ensure all selected items have the same order ID and seller ID
2. Prevent mixing items from different sellers into a single shipment
3. Block shipment creation if no items are selected

### Carrier and Tracking Entry

WHEN a seller creates a shipment, THE system SHALL:
1. Allow entry of carrier name (optional)
2. Require entry of tracking number (optional)
3. Accept tracking number input without validation of carrier-format alignment
4. Store tracking information as part of the shipment record

IF carrier name or tracking number is provided, THE system SHALL:
1. Store the values exactly as entered
2. Display the values unchanged for tracking access

### Customer Shipment Confirmation

WHEN a customer receives a shipment, THE system SHALL:
1. Allow the customer to confirm delivery of the shipment
2. Accept delivery confirmation without requiring a reason
3. Allow confirmation only once per shipment

WHEN a customer confirms delivery, THE system SHALL:
1. Update status of all items in that shipment to "delivered"
2. Record confirmation timestamp
3. Preserve the confirmation as part of shipment history

### Automatic Delivery Status

WHILE a shipment has status "shipped" and no customer confirmation exists, THE system SHALL:
1. Automatically change shipment status to "delivered" after 14 days from the shipping date
2. Automatically change status of all items in the shipment to "delivered"

WHERE automatic delivery status change occurs, THE system SHALL:
1. Record the automatic status change timestamp
2. Mark the change as system-initiated

### Multi-Seller Shipment Independence

WHEN an order contains items from multiple sellers, THE system SHALL:
1. Create separate shipments for each seller's items
2. Allow each seller to manage their shipment independently
3. Enable each seller to enter their own carrier and tracking information

WHEN a seller ships items, THE system SHALL:
1. Update only that seller's items to "shipped" status
2. Leave other sellers' items in their current status unchanged

### Shipment Tracking Access

WHEN viewing an order, THE system SHALL:
1. Show each shipment with its carrier name and tracking number
2. Display shipment status (pending or shipped)
3. List which order items are included in each shipment

WHERE a shipment has tracking information, THE system SHALL:
1. Provide a linkable tracking number for customer reference
2. Preserve tracking information immutably in shipment records

## ShipmentItem User Scenarios

Each shipment contains one or more shipment items that map order items to the shipment. Shipment items link an order item to its corresponding shipment and track creation time. When a seller ships, all associated shipment items are created and the linked order items move to shipped status. Customers view which items are included in each shipment during delivery tracking. Shipment item records do not change once created—they remain as a permanent log of fulfillment grouping.

### Shipment Item Creation During Shipping

WHEN a seller creates a shipment for an order, THE system SHALL create one or more shipment items to map each selected order item to the new shipment.

WHEN a shipment item is created, THE system SHALL:
1. Link the shipment item to the shipment, the order item, and the order
2. Record the creation timestamp
3. Preserve the order item's product name, variant, and price at creation time

WHEN the seller selects an order item for inclusion in a shipment, THE system SHALL:
1. Validate the order item is part of the same order
2. Validate the order item belongs to the same seller
3. Validate the order item is not already assigned to another shipment
4. Validate the order item has not been previously delivered

WHEN a seller attempts to include a cancelled or refunded order item in a shipment, THE system SHALL reject the request.

### Mapping of Order Items to Shipment

WHEN a shipment is created, THE system SHALL:
1. Create one shipment item per order item included in the shipment
2. Ensure each order item appears in only one shipment per fulfillment cycle

WHEN a seller ships multiple order items together, THE system SHALL:
1. Assign the same carrier and tracking number to all shipment items in the shipment
2. Record each order item's inclusion timestamp

WHEN a seller splits order items into multiple shipments, THE system SHALL:
1. Create separate shipment items for each shipment
2. Allow the same order item to appear in only one shipment per order

THE system SHALL maintain a one-to-many relationship between shipments and shipment items.

THE system SHALL NOT allow reassignment of an order item to a different shipment once the shipment item is created.

### Creation Time Tracking

WHEN a shipment item is created, THE system SHALL:
1. Record the exact timestamp of creation
2. Preserve the timestamp in UTC format
3. Include the creation timestamp in all historical views

WHEN viewing shipment contents, THE system SHALL display the creation timestamp for each shipment item.

WHEN generating fulfillment reports, THE system SHALL:
1. Sort shipment items by creation timestamp within each shipment
2. Group shipment items by shipment creation time

THE system SHALL NOT allow modification of the creation timestamp after shipment item creation.

### Shipment Contents Visibility

WHEN a customer views an order's details, THE system SHALL:
1. Display all shipments associated with the order
2. Show the list of order items included in each shipment
3. Include product name, variant options, and quantity for each shipment item

WHEN a seller views shipment details, THE system SHALL:
1. Display all shipment items in the shipment
2. Show which order items are included and their quantities
3. Provide links to the original order items for reference

WHEN an administrator views shipment contents, THE system SHALL:
1. Display full visibility across all shipment items in any shipment
2. Allow viewing shipment-to-order mapping for audit purposes

WHEN a shipment item's order item is deleted, THE system SHALL:
1. Retain the shipment item record with preserved order item name and details
2. Mark the reference as "product no longer available"
3. Preserve historical mapping for fulfillment integrity.

### Fulfillment Log Integrity

THE system SHALL ensure shipment items are immutable after creation—no edits to linkage or timestamps.

WHEN an order item's status changes due to shipment, THE system SHALL:
1. Log the status change event with timestamp
2. Preserve the original order item status prior to shipment
3. Maintain audit trail linking status change to the shipment item

WHEN a seller attempts to modify shipment contents after creation, THE system SHALL:
1. Reject the request
2. Return a clear error indicating shipment item immutability

WHEN a shipment is cancelled or invalidated, THE system SHALL:
1. Preserve all shipment items as historical records
2. Not delete or alter shipment item entries
3. Update shipment status without affecting shipment item history

THE system SHALL provide administrators with read-only access to all shipment items for dispute resolution and auditing purposes.

### Item Status Update Trigger

WHEN a shipment is marked as shipped by the seller, THE system SHALL:
1. Update the status of all associated order items to "shipped"
2. Record the timestamp of status change
3. Link the status change event to the shipment

WHEN a customer confirms delivery for a shipment, THE system SHALL:
1. Update the status of all shipment items' order items to "delivered"
2. Preserve the delivery confirmation timestamp
3. Update the overall order status if all items are now delivered

IF a delivery confirmation is not provided by the customer, THE system SHALL automatically update all shipment items' order items to "delivered" after 14 days from shipment creation.

WHEN an administrator force-cancels an order item, THE system SHALL:
1. Update the order item status to "cancelled"
2. Restore inventory for the variant
3. Not affect shipment item records (preserve for audit)

### Shipment Item Access Control

Customers can view shipment items only for orders they placed.

Sellers can view shipment items only for order items they fulfilled.

Administrators can view all shipment items across all orders and sellers.

Super administrators have the same access as administrators, plus the ability to view all system logs and export shipment item data for compliance.

## CancellationRequest User Scenarios

Customers can request cancellation for order items with status paid (not yet shipped) and include a reason. Sellers receive the request and can approve or reject it, with a snapshot of the request state preserved. If approved, the item is cancelled and stock is restored. The remaining items in the order continue processing. If all items are cancelled, the full order becomes cancelled. Sellers cannot cancel items they have already shipped, and customers cannot cancel delivered items.

### Cancellation Request Creation

WHEN a customer selects an order item with status "paid", THE system SHALL allow them to submit a cancellation request.

WHEN a customer submits a cancellation request, THE system SHALL:
1. Require a cancellation reason
2. Associate the request with the selected order item
3. Set the request status to "pending"

IF the order item status is not "paid", THE system SHALL reject the request.
IF the order item is already cancelled, THE system SHALL reject the request.

### Seller Cancellation Approval Workflow

WHEN a seller views their pending cancellation requests, THE system SHALL display:
1. The request reason
2. The customer who submitted it
3. The order item details (product name, variant, quantity)

WHEN a seller responds to a pending cancellation request, THE system SHALL:
1. Allow approval or rejection
2. Record the response with timestamp
3. Update the request status to "approved" or "rejected"

IF the seller rejects the request, THE system SHALL capture the rejection reason.

WHILE the request status is "pending", THE system SHALL prevent the order item from being shipped.

### Snapshot Capture of Request State

WHEN a cancellation request is created, THE system SHALL create an immutable snapshot.

WHEN a seller responds to a cancellation request (approval or rejection), THE system SHALL create a new snapshot.

Each snapshot SHALL include:
1. The request reason at that moment
2. The request status at that moment
3. The timestamp of the snapshot
4. The ID of the user who made the response (customer or seller)

Snapshots SHALL be preserved indefinitely and cannot be deleted.

### Stock Restoration on Cancellation

WHEN a cancellation request is approved, THE system SHALL:
1. Change the order item status to "cancelled"
2. Restore stock quantity for the variant by adding a positive inventory record
3. Remove the item from the customer's cart if present
4. Preserve an immutable snapshot of the cancelled order item with product and variant details

WHEN stock is restored via inventory record, THE system SHALL:
1. Record the quantity change as positive
2. Specify the reason as "cancel"
3. Reference the cancellation request ID

THE system SHALL NOT restore stock if the cancellation request is rejected.

### Order-wide Cancellation Trigger

WHEN all order items in an order are cancelled, THE system SHALL automatically update the order status to "cancelled".

IF some items are cancelled but others remain active, THE system SHALL set the order status to "partially completed".

WHILE the order status is "cancelled", THE system SHALL prevent:
1. Any further shipments for the order
2. Any new cancellation or refund requests for the order

### Ineligible Item Statuses

THE system SHALL reject cancellation requests for order items with the following statuses:
1. Shipped
2. Delivered
3. Cancelled
4. Refunded

THE system SHALL reject attempts to approve cancellation requests for items that:
1. Have already been shipped
2. Are part of a shipment that is in transit

IF a seller attempts to approve a cancellation for an ineligible item, THE system SHALL return an error with the reason that the item status is not eligible for cancellation.

## RefundRequest User Scenarios

Customers can request a refund for delivered order items within 7 days, including a reason. Sellers can approve or reject the request, and a snapshot of the request state is preserved. If approved, the item is refunded and stock is restored. The remaining items in the order are unaffected. Refund requests cannot be made for undelivered items, and the system enforces the 7-day window strictly. Customers can view refund request history and outcomes.

### Refund Request Submission

WHEN a customer initiates a refund request for an order item with status "delivered", THE system SHALL: 1. Require a reason text field, 2. Verify the item was delivered within the last 7 days, 3. Accept the request with status "pending".

IF the item status is not "delivered", THE system SHALL reject the request.
IF the delivery date exceeds 7 days ago, THE system SHALL reject the request.
IF a refund request already exists for the same order item with status "pending" or "approved", THE system SHALL reject the request.

### 7-Day Refund Window Enforcement

THE system SHALL calculate the refund eligibility window as 7 calendar days from the delivery date of the order item.

WHEN a customer attempts to submit a refund request, THE system SHALL: 1. Compare the current date to the delivery date of the item, 2. Reject the request if the delivery occurred more than 7 days ago, 3. Accept the request only if the delivery occurred on or after the eligibility cutoff date.

THE system SHALL treat the delivery date as the trigger for the 7-day window, regardless of when the customer confirms delivery.

IF an item is automatically marked as "delivered" after 14 days, the 7-day refund window begins at that point.

### Seller Approval Workflow

WHEN a seller reviews a pending refund request, THE system SHALL: 1. Allow the seller to approve or reject the request, 2. Require the seller to select the response type, 3. Store the response with a timestamp.

IF the seller approves the refund request, THE system SHALL: 1. Change the request status to "approved", 2. Change the associated order item status to "refunded", 3. Restore the stock quantity for the variant (via inventory record).

IF the seller rejects the refund request, THE system SHALL: 1. Change the request status to "rejected", 2. Notify the customer of the rejection, 3. Maintain the order item status as "delivered".

THE system SHALL prevent sellers from responding to requests with status "approved" or "rejected".

### Snapshot Capture of Request State

WHEN a refund request is created, THE system SHALL create a refund request snapshot with: 1. The request ID, 2. The original status ("pending"), 3. The reason text at time of submission, 4. Timestamp of creation.

WHEN a seller responds to a refund request, THE system SHALL create a new snapshot with: 1. The updated status ("approved" or "rejected"), 2. The response timestamp, 3. References to both the original request and the response.

ALL snapshots are immutable and stored separately from the live request record.

THE system SHALL preserve all snapshots for audit and dispute resolution, even after request deletion.

### Stock Restoration on Refund

WHEN a refund request is approved, THE system SHALL: 1. Create an inventory record with negative quantity change (restoring stock), 2. Set the inventory reason to "refund", 3. Link the record to the refunded variant, 4. Add the order ID as a reference.

WHEN a refund is processed, THE system SHALL: 1. Update the order item status to "refunded", 2. Restore the stock quantity to reflect the return, 3. Preserve historical stock values in the inventory history.

Stock restoration occurs only for the specific item being refunded, leaving other items in the same order unaffected.

IF a variant has insufficient stock records for restoration, THE system SHALL allow negative stock balances for accurate inventory tracking.

### Refund Request Visibility and History

WHEN a customer views their order details, THE system SHALL display: 1. A list of refund requests associated with that order, 2. The status of each request (pending/approved/rejected), 3. The reason text for approved or rejected requests.

WHEN a customer views their refund request history, THE system SHALL: 1. Show all past refund requests, 2. Display the associated order and item, 3. Include timestamps for submission and resolution.

WHEN a seller views their shop's refund history, THE system SHALL: 1. Show all refund requests for items in their products, 2. Allow filtering by status and date range, 3. Include customer and item details.

WHEN an administrator views refund requests, THE system SHALL: 1. Show all requests across the platform, 2. Allow filtering by seller, customer, or date range, 3. Provide access to snapshots for audit purposes.

## Review User Scenarios

Customers can write a review for a product they purchased only after all items are delivered. Each review includes a 1–5 star rating (required) and optional text. Customers can edit their reviews, and each edit creates a snapshot. Reviews appear on product detail pages, sorted newest first, and contribute to the product’s average rating. Customers can delete their reviews, but deleted ones still count as zero in rating calculations. Reviews cannot be written for undelivered or cancelled items.

### Review Eligibility

WHEN a customer attempts to create a review for a product, THE system SHALL ensure the associated order item has status "delivered".

IF the associated order item status is not "delivered", THE system SHALL reject the review creation request.

WHILE a customer has not purchased a product, THE system SHALL prevent them from writing a review for that product.

A customer may write only one review per product per order, even if multiple identical items were purchased in that order.

### Rating and Optional Text Entry

WHEN a customer submits a review, THE system SHALL require a numeric rating between 1 and 5 stars.

WHERE the rating is provided, THE system SHALL allow optional text content.

IF the rating is missing or outside the 1–5 range, THE system SHALL reject the request.

THE system SHALL preserve the rating value exactly as submitted, including fractional ratings if supported by UI.

A review may be submitted with no text content, but never without a rating.

### Review Edit with Snapshot Preservation

WHEN a customer edits an existing review, THE system SHALL create a review snapshot preserving the previous rating and text content.

THE review snapshot SHALL include the timestamp of the edit and snapshot type "edit".

THE system SHALL allow the customer to update both rating and text content, or either field independently.

A review edit creates only one snapshot per edit action, regardless of how many fields changed.

Review snapshots are immutable and cannot be deleted or modified after creation.

### Average Rating Calculation

THE system SHALL calculate a product’s average rating by averaging all non-deleted review ratings.

Deleted reviews SHALL contribute a value of zero to the average rating calculation.

THE system SHALL recalculate the average rating immediately after any review is added, edited, or deleted.

IF a product has no non-deleted reviews, the average rating SHALL be displayed as zero stars.

THE system SHALL include in the average rating only reviews for which the associated product has not been deleted.

### Review Deletion Behavior

WHEN a customer deletes their review, THE system SHALL mark it as deleted but preserve it in the database.

THE system SHALL preserve all associated review snapshots even after the review is deleted.

WHEN a review is deleted, THE system SHALL trigger a recalculation of the product’s average rating.

THE system SHALL not restore or undelete reviews after deletion.

Deleted reviews SHALL still appear in review counts but with no visible rating or content.

### Review Order on Product Pages

WHEN displaying reviews on a product detail page, THE system SHALL sort reviews by creation timestamp, newest first.

THE system SHALL display the product’s average rating and total review count prominently above the review list.

The review list SHALL include deleted reviews in the count but show no content or rating for them.

Customers without access to review snapshots shall see only the current version of each review.

Administrators and sellers may view review edit history via review snapshots for dispute resolution purposes.

## ReviewSnapshot User Scenarios

Every time a customer edits a review, a snapshot is created preserving the rating and text content at that moment. Snapshots enable accurate historical review data for dispute resolution or analytics. Deleted reviews still have their latest snapshot preserved for integrity. Sellers and administrators can view snapshots for audit purposes, but cannot edit or delete them. Snapshots ensure transparency in rating changes over time, especially before and after edits or deletions.

### Automatic Snapshot on Review Edit

WHEN a customer edits their own review, THE system SHALL automatically create a review snapshot preserving the rating and text content immediately before the edit.

IF the review edit is attempted on a review without an associated order item status "delivered", THE system SHALL reject the request.

WHEN a review snapshot is created due to an edit, THE system SHALL include:
1. The rating value before the edit (1–5)
2. The text content before the edit (optional)
3. The exact timestamp of the snapshot creation
4. The type indicator "edit"

### Rating and Text Preservation

THE system SHALL ensure every review snapshot records the rating value and text content exactly as they existed at the time of the snapshot.

IF a review has no text content at the time of editing, THE system SHALL store null or empty string in the snapshot’s text content field, not omit it.

WHILE a customer is viewing a snapshot, THE system SHALL display only the preserved rating and text content, without any current edit state.

Review snapshots MUST NOT be updated after creation, even if the original review is edited again.

### Snapshot Retention After Deletion

WHEN a customer deletes their own review, THE system SHALL preserve the most recent snapshot of that review.

THE system SHALL retain all previous review snapshots even after review deletion, ensuring full edit history is available.

No action (including user request or system cleanup) SHALL remove review snapshots, regardless of deletion status of the associated review or product.

Each review deletion event creates no new snapshot, but retains existing snapshots for audit continuity.

### Snapshot Access for Sellers and Administrators

WHEN a seller views a product detail page, THE system SHALL allow them to view all review snapshots for reviews associated with that product.

WHEN an administrator views a product detail page or order history, THE system SHALL allow them to view all review snapshots for reviews associated with that product or order.

IF a seller attempts to view snapshots for a product they do not own, THE system SHALL block access.

IF an administrator requests a full review edit history, THE system SHALL return all snapshots for the specified review in chronological order.

### Review Edit History Tracking

WHEN a review has been edited at least once, THE system SHALL show a visual indicator that edit history exists.

WHILE viewing review edit history, THE system SHALL display each snapshot with:
1. Timestamp of the snapshot
2. Rating value at that time
3. Text content at that time
4. A field indicating "snapshot" (not current review)

IF a review has never been edited, THE system SHALL NOT display any snapshot records.

THE system SHALL NOT allow customers to view who made edits, only the preserved state of the review.

### Audit and Dispute Use Cases

WHEN a dispute arises over a rating history, THE system SHALL allow administrators to retrieve all review snapshots for that review.

WHEN analyzing rating trends, THE system SHALL enable data exports of all review snapshots with timestamps and ratings for analytics.

IF a seller disputes the authenticity of a customer review, THE system SHALL provide snapshot data showing the rating and content at the time of each edit.

Review snapshots are immutable and tamper-proof, and SHALL be used as authoritative source for historical review data during audits or disputes.

## AdminRequest User Scenarios

Users (customers or sellers) can request to become administrators by submitting a reason. Admin requests start as pending and appear in a list for super administrators. Super administrators can approve or reject requests; rejections may be resent with revised reasons. Once approved, the user becomes a regular administrator with standard oversight powers. Requests are immutable snapshots and cannot be altered after submission. Users can view their own request status and history.

### Admin Request Submission

WHEN a customer or seller submits an admin request, THE system SHALL:
1. Require the user to provide a reason for the request
2. Set the request status to "pending"
3. Record the request creation timestamp
4. Associate the request with the submitting user
5. Prevent the user from having another pending admin request
6. Allow the user to view their own request status and reason
7. Store the request as an immutable record (no edits allowed)

WHEN a user attempts to submit an admin request while already having a pending request, THE system SHALL reject the request with an error.

### Super Admin Approval Workflow

WHEN a super administrator views the pending admin requests list, THE system SHALL:
1. Display all pending requests with submitter identity and reason
2. Show request creation timestamp
3. Allow super administrators to approve or reject each request
4. Prevent regular administrators from viewing or acting on requests

WHEN a super administrator approves a request, THE system SHALL:
1. Change the request status to "approved"
2. Create an AdminRole record with grade "regular" for the user
3. Set the approval timestamp and super administrator's ID
4. Preserve the original request as an immutable snapshot

WHEN a super administrator rejects a request, THE system SHALL:
1. Change the request status to "rejected"
2. Record the rejection timestamp and reason
3. Preserve the original request as an immutable snapshot
4. Allow the user to submit a new request with revised reasoning

### Request Status Tracking

WHEN a user checks the status of their admin request, THE system SHALL:
1. Show the current status: pending, approved, or rejected
2. Display the request creation timestamp
3. If rejected, display the rejection reason provided by the super administrator
4. If approved, show the approval timestamp and grant date for admin access
5. Allow the user to view their request history (all previous requests)

WHEN a request status changes, THE system SHALL:
1. Preserve the previous state as an immutable snapshot
2. Update the current status in real-time for the user
3. Notify the user of status changes via platform alerts

### Rejection Resubmission

WHEN a super administrator rejects an admin request, THE system SHALL:
1. Require the super administrator to provide a rejection reason
2. Store the rejection reason with the request record
3. Allow the user to view the rejection reason before resubmitting
4. Permit the user to submit a new admin request with a revised reason
5. Create a new request record for each resubmission (no edits to original)

WHEN a user resubmits a rejected admin request, THE system SHALL:
1. Allow submission of a new request with updated reasoning
2. Set the new request status to "pending"
3. Record the original rejection reason in the new request context
4. Prevent concurrent pending requests for the same user

### Role Promotion to Regular Admin

WHEN a super administrator approves an admin request, THE system SHALL:
1. Promote the user to regular administrator status
2. Create an AdminRole record with grade "regular"
3. Assign the "admin" role to the user's account
4. Immediately grant administrator permissions based on grade
5. Record the approval timestamp and approving super administrator
6. Preserve the original request as an immutable snapshot

WHERE an admin has been suspended, THE system SHALL prevent promotion to administrator until unsuspended.

WHERE a user previously held administrator status, THE system SHALL allow re-approval for admin access.

### Request Immutability and History

WHEN an admin request is created, THE system SHALL:
1. Store the request as an immutable record (no edits possible)
2. Preserve the request state at creation time (user identity, reason, timestamp)
3. Prevent any modification to the request content after submission
4. Maintain a history log of all status changes and approvals

WHEN an admin request status changes (approved/rejected), THE system SHALL:
1. Create a snapshot preserving the request state at that point
2. Record who performed the action and when
3. Ensure snapshots are immutable and cannot be deleted
4. Allow super administrators to view all historical request states

WHERE a user has multiple admin requests, THE system SHALL:
1. Maintain separate immutable records for each request
2. Allow viewing of all request history with timestamps
3. Link related requests (e.g., resubmissions of rejected requests)

## AdminRole User Scenarios

After admin approval, users gain a role with either regular or super grade. Super administrators can promote regular admins to super, and demote other supers (but not themselves). Roles are immutable once assigned and cannot be downgraded by the holder. Regular admins can manage sellers, categories, orders, and ban users, but cannot promote others. Super admins have full authority, including demoting themselves (to regular) by an external action. Role changes are logged but not stored as snapshots—only the current grade matters operationally.

### Admin Role Assignment After Approval

WHEN a super administrator approves an admin request, THE system SHALL:
1. Assign the requesting user the role of a regular administrator
2. Create an AdminRole record with grade "regular"
3. Set the role assignment timestamp
4. Immediately grant the user administrator privileges

IF the admin request status is not "pending" when approval is attempted, THE system SHALL reject the request.
IF the user already holds an admin role, THE system SHALL reject the request.


### Super Admin Promotion

WHEN a super administrator promotes a regular administrator to super administrator, THE system SHALL:
1. Update the AdminRole record with grade "super"
2. Record the super administrator who performed the promotion
3. Preserve the original role assignment timestamp (no reset)
4. Immediately grant full administrative authority

WHILE the promoted user has no role, THE system SHALL NOT allow promotion attempts.
WHEN a promotion is recorded, THE system SHALL create an immutable log entry showing promoter, promotee, timestamp, and old/new grades.

### Super Admin Demotion

WHEN a super administrator demotes another super administrator to regular administrator, THE system SHALL:
1. Update the AdminRole record with grade "regular"
2. Record the demoting super administrator
3. Preserve the original role assignment timestamp
4. Immediately revoke super-level privileges

IF a regular administrator attempts to demote another user, THE system SHALL reject the request.
IF the demoter and demotee are the same user, THE system SHALL reject the request.


### Role Downgrade Restrictions

THE system SHALL NOT allow any user to downgrade their own role grade without super administrator authority.

IF a regular administrator attempts to demote themselves or another regular administrator, THE system SHALL reject the request.
IF a super administrator attempts to demote themselves using a non-super administrator account, THE system SHALL reject the request.

WHILE an admin’s role is active, THE system SHALL prevent any downgrade action initiated by non-super administrators.


### Super Admin Self-Demotion

WHEN a super administrator initiates a self-demotion to regular administrator, THE system SHALL:
1. Reject the request regardless of super admin authority
2. Return an error stating self-demotion is not permitted
3. Preserve the current role grade unchanged

WHEN a super administrator requests demotion via an external super admin action, THE system SHALL:
1. Process the request only if initiated by a different super administrator
2. Update the AdminRole to grade "regular"
3. Record the external admin who performed the action


### Authority Scope by Grade

REGULAR administrators SHALL be able to:
- Manage seller accounts (approve, reject, suspend, unsuspend)
- Manage categories (create, edit, delete)
- View and manage orders (force cancel, force refund)
- Ban or unban users (customers and sellers)

SUPER administrators SHALL have all regular administrator privileges AND:
- Promote regular administrators to super administrators
- Demote super administrators to regular administrators
- Access all system-level data for oversight purposes
- Override any administrative decision made by regular administrators

WHEN an admin performs an action, THE system SHALL verify the requesting user’s AdminRole grade and restrict functionality accordingly.

### Immutable Role State at Time of Action

WHEN an admin action is performed (e.g., approve seller, ban user), THE system SHALL:
1. Capture and freeze the admin’s grade and assigned permissions at that moment
2. Log the grade used for authorization (not the current grade at time of audit)
3. Preserve the immutable role state for dispute resolution and audit trails

IF an admin’s role is demoted after an action is performed, THE system SHALL NOT retroactively invalidate that action.
WHEN reviewing an admin action in a snapshot or audit, THE system SHALL display the admin’s grade at the time the action occurred, not their current grade.


# External Integrations

Third-party API contracts, webhook handlers, and integration specifications.

## Integration Contracts

Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.

### Payment Gateway Integration

WHEN a customer proceeds to checkout, THE system SHALL initiate payment through an external payment gateway.

WHEN payment succeeds, THE system SHALL:
1. Create the order record
2. Reduce stock quantities for purchased variants
3. Remove items from customer's cart
4. Generate order confirmation

WHEN payment fails, THE system SHALL:
1. Cancel the checkout process
2. Preserve cart contents
3. Return an error message to the customer
4. Not create any order records

WHERE payment is processed, THE system SHALL:
- Freeze product prices at checkout time
- Lock inventory for the duration of payment processing
- Ensure idempotent order creation on retry

IF payment gateway communication times out, THE system SHALL:
- Mark payment status as 'pending'
- Allow customer to retry payment
- Restore inventory if retry fails or times out again
- Notify administrator after repeated failures

### OAuth Provider Integration

WHEN a seller registers with email and password, THE system SHALL authenticate the user and create an account without requiring OAuth.

WHERE a user submits a request to become an administrator, THE system SHALL allow OAuth-based authentication if configured by the administrator.

THE system SHALL support external OAuth providers only for administrative access, not for customer or seller account creation.

IF OAuth token expires during an admin session, THE system SHALL:
- Redirect the user to re-authenticate
- Preserve pending administrative actions
- Resume the action after successful re-authentication

WHEN OAuth provider returns an error, THE system SHALL:
- Log the error for administrator review
- Return a user-friendly message without exposing provider details
- Allow fallback to email/password authentication for admin access

### Webhook Handling

WHEN the payment gateway sends a payment confirmation webhook, THE system SHALL:
1. Verify webhook signature using configured secret
2. Validate the payload data
3. Update order status to 'paid' if valid
4. Create inventory deduction records
5. Remove cart items if checkout was pending

WHEN the shipping carrier sends a tracking update webhook, THE system SHALL:
1. Update shipment status if new
2. Store new tracking information
3. Notify the customer via in-app notification
4. Update delivery countdown if applicable

WHEN a seller suspends or unsuspends their account, THE system SHALL:
- Send a webhook to related services (e.g., analytics, inventory sync)
- Include seller ID, new status, and timestamp
- Retry failed deliveries with exponential backoff

IF webhook signature verification fails, THE system SHALL:
- Reject the webhook
- Log the attempt for security review
- Return HTTP 401 without processing

WHILE processing webhooks, THE system SHALL:
- Ensure idempotency using payload hash
- Process webhooks in order of timestamp
- Log all successful and failed webhook deliveries

### External API Contracts

THE system SHALL use HTTPS with TLS 1.2+ for all external integrations.

WHERE payment gateway integration is configured, THE system SHALL:
- Support PCI-compliant integrations only
- Never store full card numbers or CVV codes
- Pass only required payment data to the gateway
- Return masked payment reference IDs to the customer

WHERE OAuth provider integration is configured, THE system SHALL:
- Support OAuth 2.0 authorization code flow
- Use refresh tokens for session extension
- Store access tokens with expiry timestamps
- Rotate tokens before expiry

WHEN calling external APIs, THE system SHALL:
- Include request ID headers for traceability
- Log API requests and responses at debug level
- Mask sensitive data in logs (tokens, passwords)
- Apply request rate limits per integration

IF an external API returns a 5xx error, THE system SHALL:
- Retry the request up to 3 times with exponential backoff
- Notify administrators after 3 failed attempts
- Preserve request state for manual retry

### Webhook Configuration and Management

ADMINISTRATORS CAN configure webhook endpoints for:
- Payment gateway notifications
- Shipping carrier tracking updates
- Third-party analytics integrations
- Inventory sync services

ADMINISTRATORS CAN enable or disable each webhook endpoint individually.

THE system SHALL store webhook configuration in encrypted storage.

WHEN a webhook endpoint is modified, THE system SHALL:
- Create a configuration snapshot preserving previous and new values
- Record the modification time and modifier ID
- Allow rollback to previous configuration if needed

WHERE webhook configuration is set, THE system SHALL:
- Validate endpoint URLs for security (no localhost or private IPs)
- Require webhook secrets for signature verification
- Support HMAC-SHA256 signature validation for incoming webhooks

# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### Product Image Upload

WHEN a seller uploads a product image, THE system SHALL:
1. Accept image files in JPEG, PNG, or GIF format
2. Enforce a maximum file size of 5MB per image
3. Limit total images per product to 10
4. Set the first uploaded image as the main image by default
5. Generate a thumbnail version automatically

IF the file format is not supported, THE system SHALL reject the upload with an error.
IF the file size exceeds 5MB, THE system SHALL reject the upload with an error.
IF the product already has 10 images, THE system SHALL reject the upload with an error.

WHERE multiple images are uploaded in a single request, THE system SHALL process each image individually and capture all successful uploads even if one fails.

### File Storage Capacity Management

WHEN a seller uploads a product image, THE system SHALL:
1. Automatically archive unused images after 90 days of inactivity
2. Remove all product images when a product is permanently deleted
3. Maintain backup copies of product images for disaster recovery
4. Provide notifications when total file storage reaches 80% capacity

WHILE a file upload is in progress, THE system SHALL maintain transactional integrity so that partial uploads do not persist.

### File Access Control

WHEN any user requests access to a product image, THE system SHALL verify:
1. The requesting user is authenticated
2. The product image is associated with an active product
3. The requesting user has appropriate viewing permissions

IF a user attempts to access an image they are not authorized to view, THE system SHALL deny access and log the event.

### File Versioning and History

WHEN a seller replaces a product image, THE system SHALL:
1. Retain previous versions of the image for 30 days
2. Update image metadata to include version number and replacement timestamp
3. Allow rollback to any previous version within the retention period

WHERE an image replacement fails validation, THE system SHALL preserve the existing image and report the error.

### Performance and Scalability

WHILE product images are being uploaded, THE system SHALL:
1. Maintain response times under 2 seconds for standard upload operations
2. Support concurrent uploads from multiple sellers without degradation
3. Automatically scale storage capacity as file count grows

WHEN file operations exceed defined thresholds, THE system SHALL queue additional requests and process them in order.

# Background Processing

Asynchronous job definitions, queue specifications, and scheduled task configurations.

## Job Specifications

Define background jobs, queue configurations, retry policies, and scheduling rules for asynchronous processing.

### Background Job Creation

WHEN a system event requires asynchronous processing, THE system SHALL create a background job with the event type, payload, and target actor.

WHEN a background job is created, THE system SHALL assign it a unique identifier and initial status of "pending".

WHEN a background job fails to be created, THE system SHALL reject the request and log the error.

A background job may include a priority level to influence processing order.

WHEN a job is marked for immediate execution, THE system SHALL place it in the high-priority queue.

WHEN a job includes time-sensitive operations, THE system SHALL specify a minimum execution time window.

### Queue Management

WHEN a background job is created, THE system SHALL place it in the appropriate queue based on job type.

WHEN a job queue reaches capacity, THE system SHALL queue new jobs in order of creation time until capacity is available.

THE system SHALL support multiple queues with independent processing capacity.

WHEN a job is cancelled, THE system SHALL remove it from the queue and mark its status as "cancelled".

WHEN a job is moved between queues, THE system SHALL record the reason and timestamp of the change.

WHEN a job fails repeatedly (exceeding retry limit), THE system SHALL move it to the error queue for manual review.

### Scheduled Task Execution

WHEN a scheduled task's configured time arrives, THE system SHALL trigger execution of the task.

WHEN a scheduled task includes recurring intervals, THE system SHALL create new instances of the task at each interval.

WHEN a scheduled task execution fails, THE system SHALL attempt to retry according to the task's retry policy.

A scheduled task may be configured to execute only during specific time windows each day.

THE system SHALL pause all scheduled tasks during maintenance windows.

WHEN a scheduled task depends on external conditions, THE system SHALL verify those conditions before starting execution.

### Asynchronous Processing Workflow

WHEN a background job begins processing, THE system SHALL update its status to "processing".

WHEN asynchronous processing completes successfully, THE system SHALL update the job status to "completed" and record the result.

WHEN asynchronous processing fails, THE system SHALL update the job status to "failed" and record error details.

WHEN a job has a deadline, THE system SHALL mark it as "expired" if it cannot be processed by that time.

WHEN a job produces multiple outputs, THE system SHALL store each output with its corresponding result metadata.

WHEN an asynchronous operation affects multiple entities, THE system SHALL process each entity individually with separate status tracking.

### Cron Job Configuration

WHEN a cron job is configured, THE system SHALL store the schedule expression and associated job type.

WHEN a cron job's schedule expression changes, THE system SHALL apply the new schedule starting from the next execution.

WHEN a cron job is disabled, THE system SHALL skip all scheduled executions until re-enabled.

A cron job may specify a maximum execution duration after which the system shall terminate it.

WHEN a cron job depends on system resources, THE system SHALL verify resource availability before initiating execution.

THE system SHALL provide an audit trail of all cron job executions including start time, end time, and status.