**ecommerceMall — Data isolation, business rules, data browsing expectations, error scenarios**

Data isolation, business rules, data browsing expectations, error scenarios

# Data Isolation and Ownership

Data ownership rules and tenant/user-level isolation policies.

## Ownership and Isolation Rules

Define data ownership semantics and isolation boundaries for multi-user access.

### Customer Data Ownership

WHEN a customer creates an address, THE system SHALL associate the address with that customer's user account only.

WHEN a customer adds an item to their wishlist, THE system SHALL associate it with their user account only.

WHEN a customer adds an item to their cart, THE system SHALL associate it with their user account only.

WHEN a customer creates a review, THE system SHALL associate it with their user account only.

WHEN a customer creates a cancellation or refund request, THE system SHALL associate it with their user account only.

THE system SHALL NOT allow one customer to view another customer’s private data, including: addresses, wishlist items, cart contents, order history, and review content.

IF a customer deletes their account, THE system SHALL delete their profile and private data, but preserve all orders, reviews, and other business records for compliance.

WHILE an order exists, THE system SHALL maintain immutable links between the order and the original customer, even after account deletion.

### Seller Data Ownership

WHEN a seller creates a product, THE system SHALL associate it with their seller profile only.

WHEN a seller edits a product, THE system SHALL create a new product snapshot and retain all prior versions.

WHEN a seller edits a product variant, THE system SHALL create a new product snapshot variant record and retain all prior versions.

THE system SHALL allow sellers to view only their own products, product variants, product snapshots, inventory records, and related order items.

IF a seller’s account is suspended, THE system SHALL hide their products from public listings and search, but retain access for existing order fulfillment and dispute resolution.

WHEN a seller deletes their account (if eligible), THE system SHALL delete their product listings and inventory records, but preserve order history and snapshots for compliance.

WHILE a product is part of an active order, THE system SHALL NOT delete the product or its snapshots until all associated order items reach terminal status.

### Customer-Seller Data Isolation

WHEN a customer views a product list, THE system SHALL show product details and seller shop name, but NOT reveal the seller’s internal inventory, order data, or other non-public information.

WHEN a seller views their own product sales, THE system SHALL allow viewing order items and shipments for their products only, without exposing any other seller’s order data.

WHEN a customer places an order, THE system SHALL ensure that each order item is linked only to the purchasing customer, selling seller, and purchased variant — no cross-actor data leakage.

IF a shipment is created for one seller’s items, THE system SHALL prevent that shipment from including items from another seller.

THE system SHALL isolate all financial calculations and order statuses per seller and per customer — no cross-tenant data blending.

WHEN a product is deleted by a seller, THE system SHALL ensure it is removed only from that seller’s listings and not from other sellers’ or customers’ views unrelated to that product.

### Admin Access Control and Auditing

WHILE an admin is logged in, THE system SHALL enforce role-based access control: regular admins can view and manage orders, categories, sellers, and users; super admins can additionally manage admin roles.

THE system SHALL allow administrators to view all product snapshots for audit and dispute resolution, but SHALL NOT expose passwords or internal system credentials.

WHEN an admin suspends a seller, THE system SHALL immediately hide the seller’s products from all non-order contexts.

WHEN an admin force-cancels or force-refunds an item, THE system SHALL record the action, restore inventory, and preserve full snapshot history.

THE system SHALL store immutable audit logs of all admin-triggered actions, including timestamp, actor, target entity, and action type.

WHILE a dispute exists (cancellation or refund request pending), THE system SHALL allow both parties and admins to view related snapshots, inventory records, and order history for resolution.

### Immutable Snapshots and Historical Data Access

WHEN a product is edited, THE system SHALL create a new snapshot and retain the previous version without deletion.

WHEN an order is placed, THE system SHALL create immutable snapshots of product, variant, and seller profile at that moment — even if the original product is later modified or deleted.

WHEN a review is edited, THE system SHALL create a new snapshot preserving prior content, but the product’s average rating shall be recalculated from non-deleted snapshots only.

WHEN a seller profile is updated, THE system SHALL retain all profile snapshots and link each to corresponding order items.

THE system SHALL ensure that all snapshots are append-only: no updates, deletions, or overwrites allowed.

WHEN a snapshot is linked to an order item or review, THE system SHALL prevent its deletion, even if the owner deletes their account.

### Cross-Actor Data Access Rules

WHEN a customer views a seller’s profile, THE system SHALL show only the shop name, description, and logo — never internal seller account status or approval notes.

WHEN a seller views a customer’s review, THE system SHALL show only the rating and text content — never the customer’s contact or profile details.

WHEN a customer or seller views a snapshot, THE system SHALL restrict visibility: owners can view their own snapshots; admins can view all snapshots; other parties cannot view unrelated snapshots.

IF a product is deleted, THE system SHALL make all related snapshots read-only and immutable, and preserve them for at least 7 years for legal compliance.

WHEN data is accessed for dispute resolution, THE system SHALL present the snapshot version that was active at the time of the event (e.g., purchase, shipment, review creation).

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Every user must register with a unique email address and a password meeting security requirements. Registration requires email verification before the account becomes active. Users can log in only after verification. Users may change their password at any time. Account deletion is allowed for both customers and sellers, but sellers must clear all pending orders and requests first. Users cannot register with an email already associated with an active account. Account roles (customer, seller, admin) are immutable after registration unless elevated by administrator action. Super administrators cannot be demoted by regular administrators. When a user account is deleted, their profile data is removed but associated business records (orders, reviews) are preserved for auditability.

### Email Uniqueness

WHEN a user registers with an email address, THE system SHALL verify that no other active account exists with that email.
IF the email is already associated with an active account, THE system SHALL reject the registration request.
A deleted user's email MAY be reused for a new registration.
WHEN a user attempts to change their email, THE system SHALL validate that the new email is not in use by another active account.
IF the new email is already in use, THE system SHALL reject the change request.
WHEN an administrator creates an account, THE system SHALL allow duplicate emails only if the existing account is deleted and the new account belongs to a different user.

### Duplicate Email Detection

WHEN a registration request is submitted, THE system SHALL query the user repository for any active account with the provided email.
THE system SHALL check only accounts where role matches the request (customer, seller, or admin).

### Password Requirements

WHEN a user registers, THE system SHALL require a password that meets the following:
- Minimum length of 8 characters
- Contains at least one uppercase letter
- Contains at least one lowercase letter
- Contains at least one numeric character
- Contains at least one special character

WHEN a user changes their password, THE system SHALL enforce the same complexity requirements.
IF a password does not meet the requirements, THE system SHALL reject the request with a clear explanation of the missing criteria.

### Password Security Enforcement

THE system SHALL hash passwords using a strong cryptographic algorithm (e.g., bcrypt) before storage.
WHEN password verification is required, THE system SHALL compare the hashed input against the stored hash.
THE system SHALL NOT store passwords in plaintext or reversible format.

### Account Verification

WHEN a user registers, THE system SHALL mark the account status as unverified and require email verification.
THE system SHALL send a verification email containing a time-limited verification link to the user's registered email address.
WHEN the user clicks a valid verification link, THE system SHALL mark the account as verified and activate it.

### Verification Window and Expiry

WHEN a user attempts to log in with an unverified account, THE system SHALL reject the login request and prompt for verification.
IF the verification link expires (e.g., 24 hours after generation), THE system SHALL consider the link invalid.
WHEN an expired link is used, THE system SHALL reject the verification request and allow the user to request a new verification email.

### Role Immutability

A user's role (customer, seller, admin) SHALL NOT be changed after registration except by a super administrator.
WHEN an admin role change is requested by a super administrator, THE system SHALL update the role in the user record.

### Role Change Workflow

WHEN a user submits a request to become an administrator, THE system SHALL create an admin request record with status pending.
THE system SHALL notify super administrators of pending requests.
WHEN a super administrator approves the request, THE system SHALL create an admin role record with grade 'regular' and set the user's role to 'admin'.
A regular administrator CANNOT promote other users to administrator status.

### Role Restriction Enforcement

IF a user attempts to self-promote to admin, THE system SHALL reject the request and record the attempt as a security event.
IF a regular administrator attempts to promote another user, THE system SHALL reject the request.

### Account Deletion Constraints

WHEN a customer requests account deletion, THE system SHALL permanently remove the customer profile and address records.
WHEN a seller requests account deletion, THE system SHALL verify that:
- No pending orders exist (all orders must be delivered, cancelled, or refunded)
- No pending cancellation requests exist for their products
- No pending refund requests exist for their products

IF any pending orders or requests exist, THE system SHALL reject the deletion request and list the specific pending items.
WHEN a seller account is successfully deleted, THE system SHALL:
- Delete the seller profile and shop images
- Delete all products and associated variants
- Preserve order history and snapshots
- Preserve shop name in historical orders

### Deletion Isolation

WHEN an account deletion is initiated, THE system SHALL suspend the account immediately to prevent further actions.
THE system SHALL not delete data until all business records are archived for audit purposes.

### Super Admin Protection

A super administrator CANNOT demote themselves to a regular administrator.
WHEN a super administrator attempts to demote themselves, THE system SHALL reject the demotion request.

### Demotion Authorization

THE system SHALL allow only super administrators to change admin role grades.
A regular administrator CANNOT demote any user, including themselves.
WHEN a super administrator demotes another super administrator, THE system SHALL update the role grade to 'regular' and preserve the user's admin status.

### Self-Preservation Check

BEFORE any admin role update, THE system SHALL verify if the target user is demoting themselves.
IF the operation would reduce the user's own role grade, THE system SHALL reject the request.

### Audit Preservation

WHEN a user account is deleted, THE system SHALL preserve all business records associated with the user:
- Order history and snapshots
- Review records and review snapshots
- Order items and related shipments
- Cancellation and refund request records

WHEN a review is deleted, THE system SHALL preserve the review snapshot record and set the review text to '[Deleted user]'.
WHEN an order is referenced after account deletion, THE system SHALL display 'Unknown user' for the customer name while preserving order data.

### Data Retention Enforcement

THE system SHALL NOT delete audit records even if the associated user account is deleted.
WHEN an administrator requests account data export, THE system SHALL include all preserved audit records.
WHEN an audit request is made by regulators, THE system SHALL provide deleted user data through preserved snapshots.

## CustomerProfile Rules

Every customer must have exactly one profile linked to their account, created automatically during registration. Display name and phone number are required and must be non-empty strings. Customers can update their profile at any time, but changes do not affect historical records (e.g., past orders retain the profile data as it was at purchase time). Profiles cannot be deleted independently of user accounts. Phone numbers follow standard international formatting conventions. Display names cannot exceed reasonable length to ensure readability across interfaces. Customers may not use profile names that impersonate others or violate platform policies.

### Profile Uniqueness per User

WHEN a customer account is created, THE system SHALL automatically generate one customer profile linked to that account.
THE system SHALL NOT allow a customer to register without a corresponding profile.
IF a user account does not have an associated profile, THE system SHALL treat it as invalid.
WHEN a customer deletes their account, THE system SHALL retain the profile record for historical reference but mark it as inactive.

### Required Fields and Validation

WHEN a customer profile is created, THE system SHALL require:
1. A non-empty display name
2. A non-empty phone number
3. A valid user linkage
IF the display name is missing or consists only of whitespace, THE system SHALL reject the profile creation.
IF the phone number does not conform to standard international format, THE system SHALL reject the profile creation.
THE system SHALL prevent profile updates that would result in an empty display name or phone number.

### Immutable Historical Profile Data

WHEN an order is placed, THE system SHALL capture a snapshot of the customer’s profile at that moment, including display name and phone number.
WHEN an order is referenced (e.g., in history or detail views), THE system SHALL use the profile snapshot, not the current profile.
WHILE a profile is updated, THE system SHALL preserve previous versions as historical snapshots.
THE system SHALL not retroactively modify historical order records when the current profile is updated.

### Name Policy Compliance

WHEN a customer updates their display name, THE system SHALL validate that the name does not:
1. Impersonate another user, brand, or public figure
2. Contain offensive or prohibited content as defined by platform policy
3. Exceed 100 characters in length
IF the display name violates name policy rules, THE system SHALL reject the update.
THE system SHALL retain the previous display name as a snapshot if the new name is invalid.

### Profile Update Scope

WHEN a customer updates their profile, THE system SHALL allow modification of:
1. Display name
2. Phone number
THE system SHALL NOT allow customers to:
1. Change the linked user account
2. Delete the profile independently of the user account
3. Modify timestamps (createdAt, updatedAt)
WHILE a profile is linked to a user account, THE system SHALL maintain the linkage and integrity of all related historical data.

## SellerProfile Rules

Seller profiles are created upon seller registration and remain pending until administrative approval. Shop name must be unique across all sellers and cannot contain prohibited terms. Shop description supports rich text formatting but is limited in length for UI consistency. Logo images are optional at registration but required before the seller can list products. Sellers may edit their profile only after approval; edits create snapshots of prior states. Suspended sellers retain their profile data but cannot update it until reinstated. Profile deletion follows account deletion rules: it occurs only after resolving all pending items.

### Approval-Required Activation

WHEN a seller registers, THE system SHALL set their approval status to "pending" and block selling permissions.

WHEN a seller's approval status is "pending", THE system SHALL prevent them from:
1. Listing new products
2. Editing existing products or inventory
3. Processing orders or shipments
4. Accessing seller dashboard metrics

WHEN an administrator approves a seller registration, THE system SHALL:
1. Update the approval status to "approved"
2. Enable full seller permissions
3. Record the approval timestamp and administrator who approved

WHEN an administrator rejects a seller registration, THE system SHALL:
1. Update the approval status to "rejected"
2. Store the rejection reason provided by the administrator
3. Notify the seller of the rejection with the reason

### Shop Name Uniqueness

WHEN a seller creates or updates their profile, THE system SHALL require the shop name to be unique across all active sellers.

THE system SHALL reject shop name changes IF:
1. The requested shop name is already used by another approved seller
2. The requested shop name matches a suspended seller's shop name

WHILE a seller's profile is pending approval or suspended, THE system SHALL allow duplicate shop names temporarily.

THE system SHALL treat shop name comparisons as case-insensitive and ignore leading/trailing whitespace.

### Optional but Recommended Logo

A seller profile MAY have an optional logo URL at registration.

THE system SHALL allow sellers to upload or update their logo after registration.

WHEN a seller profile has no logo URL, THE system SHALL display a placeholder logo for all seller-facing contexts.

WHEN a seller lists their first product, THE system SHALL require a logo to be present, rejecting listing if missing.

### Profile Edit Snapshots

WHEN a seller updates their shop name, description, or logo, THE system SHALL create a profile edit snapshot.

A profile snapshot SHALL include:
1. Timestamp of the edit
2. Previous values of shop name, description, and logo URL
3. New values of shop name, description, and logo URL
4. The seller ID and user ID responsible

Profile snapshots SHALL be immutable and stored separately from the live profile.

A seller MAY view their own profile history via a dedicated audit page.

Administrators MAY view any seller's profile history for dispute resolution or compliance purposes.

### Suspended State Restrictions

WHEN a seller account is suspended by an administrator, THE system SHALL:
1. Hide all their products from search and category listings
2. Block product creation, editing, and inventory updates
3. Block profile edits (shop name, description, logo)
4. Allow access to existing order management (ship items, respond to requests)
5. Preserve all profile data and history

WHEN a seller account is unsuspended, THE system SHALL:
1. Restore product visibility to search and category listings
2. Re-enable full seller permissions including profile and product editing
3. Re-sync inventory states with current product listings

Suspended sellers retain their profile data indefinitely and may be reinstated without re-registration.

## Address Rules

Customers may add multiple shipping addresses per account, each requiring full address components: recipient name, phone number, street address, city, state/province, postal code, and country. Addresses must be validated for completeness before saving. Customers can designate one address as default shipping; this is used automatically during checkout if no alternative is selected. Address editing is allowed for all active addresses except those in pending or shipped orders. Deleted addresses are not recoverable, but their data remains linked to past orders for fulfillment records. Address sharing between users is not permitted.

### Full Address Requirement

WHEN a customer adds or updates an address, THE system SHALL require all of the following fields:
1. Recipient name
2. Phone number
3. Street address
4. City
5. State or province
6. Postal code
7. Country

IF any field is missing or empty, THE system SHALL reject the request.

WHERE country requires a specific postal code format, THE system SHALL validate the postal code against that format.

### Default Shipping Designation

WHEN a customer sets an address as the default shipping address, THE system SHALL:
1. Update the address's isDefault flag to true
2. Set isDefault to false for all other addresses owned by that customer

IF multiple addresses attempt to be designated as default simultaneously, THE system SHALL process only the latest request and reject previous concurrent requests.

WHERE no default address exists, THE system SHALL mark the first valid address added as default automatically.

### Customer-Only Ownership

WHEN an address is created, THE system SHALL associate it with exactly one customer via userId and profileId.

IF a customer attempts to access, edit, or delete an address not owned by them, THE system SHALL reject the request.

WHERE address data is requested via API or interface, THE system SHALL filter results to include only addresses belonging to the current customer.

### Order-Locked Edit Prevention

IF an address is linked to any order item with status 'paid' or 'shipped', THE system SHALL prevent editing of that address.

IF an address is linked to any order item with status 'paid' or 'shipped', THE system SHALL prevent deletion of that address.

WHEN an order transitions to status 'cancelled' or 'refunded', THE system SHALL unlock the associated address for editing and deletion.

WHERE an order item is in 'delivered' status, THE system SHALL allow address editing but flag the historical address snapshot for audit trails.

### Address Reuse Restrictions

WHEN a customer deletes an address, THE system SHALL remove it from active use but preserve it in historical records for order fulfillment.

IF a deleted address is referenced by a past order, THE system SHALL NOT allow reuse of that address record (even with identical data) by the same or different customer.

WHERE a customer adds a new address with identical data to a previously deleted address, THE system SHALL allow the new address to be created, but it shall be treated as a distinct record.

## Category Rules

Categories support one level of nesting, meaning subcategories may not themselves have children. Each category requires a name and optional description, and administrators manage all categories. A parent category cannot be deleted if any subcategories exist beneath it. Products without categories become uncategorized upon parent deletion. Category names must be unique within their hierarchy level. Categories cannot be renamed while associated with active products to preserve historical consistency. Customers may browse all categories but cannot modify them. Subcategories inherit the visibility status of their parent.

### One-Level Nesting Only

WHEN a category is created or edited, THE system SHALL ensure it has at most one level of nesting (i.e., subcategories may not themselves have children).

IF an attempt is made to set a parent category that itself has a parent, THE system SHALL reject the request.

THE system SHALL NOT allow creation of subcategories of subcategories.

WHILE a category has no subcategories, THE system SHALL allow it to be deleted if it is empty.

IF a category's parent is changed, THE system SHALL verify the new parent does not already have children (to prevent multiple nesting levels).

### Admin-Only Management

WHEN a category is created, THE system SHALL require the action to be performed by an administrator.

WHEN a category is edited, THE system SHALL require the action to be performed by an administrator.

WHEN a category is deleted, THE system SHALL require the action to be performed by an administrator.

THE system SHALL reject any category management request initiated by non-administrative users.

WHERE a customer browses categories, THE system SHALL allow read-only access to the full category tree but prohibit modification attempts.

### Parent Deletion Constraints

THE system SHALL prevent deletion of a category if any subcategories exist beneath it.

WHEN deletion of a category is requested, THE system SHALL verify that no subcategories are assigned.

IF any product is assigned directly to a category (regardless of subcategory), THE system SHALL allow deletion only after reassigning or marking those products as uncategorized.

WHEN a category deletion is approved, THE system SHALL assign all direct child products to an 'uncategorized' state.

### Category Name Uniqueness

WHEN a category is created or renamed, THE system SHALL require the name to be unique among all categories that share the same parent.

THE system SHALL allow categories with identical names as long as they have different parents.

IF a name conflict exists under the same parent, THE system SHALL reject the creation or update request.

WHILE checking name uniqueness, THE system SHALL treat names case-insensitively for comparison purposes.

### Visibility Inheritance

WHEN a category is accessed by a customer, THE system SHALL consider its visibility to be inherited from its parent hierarchy.

IF any ancestor category is marked hidden, THE system SHALL prevent the descendant category from appearing in browsing or search results.

THE system SHALL allow administrators to independently set visibility on any category, but customer-visible listings shall respect the full ancestor visibility chain.

WHEN a category is hidden, THE system SHALL automatically hide all of its descendant subcategories.

## Product Rules

Products must belong to exactly one category and cannot be listed without a valid category reference. Every product requires a name, description, base price, and at least one variant. Sellers own their products and can only edit or delete those they created. Product deletion is blocked if any variant has pending order items or unresolved requests. Products with zero variants appear in search but show as unavailable. Product ownership transfers with account suspension but not deletion. Deleted products are hidden from listings and search, though snapshots preserve historical data. Pricing changes require creating new variants rather than modifying existing base prices directly.

### Single Category Assignment

THE system SHALL ensure every product is assigned to exactly one category.
WHEN a seller creates or edits a product, THE system SHALL require a valid category ID.
IF the assigned category does not exist, THE system SHALL reject the request.
IF the category ID points to a deleted category, THE system SHALL reject the request.
IF a category is deleted, THE system SHALL reassign its products to the root category or mark them as uncategorized (per platform policy).
WHILE a product has no valid category assignment, THE system SHALL display its listing status as "unavailable".


### Variant Dependency

WHEN a seller creates a product, THE system SHALL require at least one variant to be associated with it.
IF a product has zero variants, THE system SHALL prevent it from appearing in search or category listings as purchasable.
WHEN a seller deletes the last variant of a product, THE system SHALL automatically mark the product as unavailable.
THE system SHALL prevent order placement for products that have zero variants in stock.
WHEN a variant is added to a product, THE system SHALL update the product’s availability status accordingly.
WHEN a product has at least one in-stock variant, THE system SHALL make it available for purchase.


### Owner-Only Editing

WHEN a user attempts to edit a product, THE system SHALL verify the user is the original seller who created the product.
IF the user is not the owner of the product, THE system SHALL reject the edit request.
WHILE a seller account is suspended, THE system SHALL prohibit the seller from editing any product, even those created before suspension.
IF a product’s ownership were to transfer, THE system SHALL preserve the original creator as the editing authority for all historical edits (snapshots).
THE system SHALL NOT allow editing of a product by any user other than its original seller.


### Pending-Item Deletion Blocks

WHEN a seller requests to delete a product, THE system SHALL verify no variant of the product has associated pending order items in status "paid" or "shipped".
IF any variant of the product has pending order items, THE system SHALL reject the deletion request.
WHEN a seller requests to delete a product, THE system SHALL verify no variant has pending cancellation or refund requests.
IF any variant has pending cancellation or refund requests, THE system SHALL reject the deletion request.
IF a product deletion is allowed, THE system SHALL delete all variants and inventory records associated with the product.
IF a product deletion succeeds, THE system SHALL remove the product from active search and category listings.


### Zero-Variant Status

WHEN a product has zero variants, THE system SHALL display the product as "unavailable" in search and category listings.
WHILE a product has zero variants, THE system SHALL prevent customers from adding it to cart or placing orders.
THE system SHALL allow zero-variant products to remain in the system for administrative review but block purchase flows.
IF a variant is added to a previously zero-variant product, THE system SHALL update its availability status to "available".
IF all variants of a product become out of stock, THE system SHALL mark them as unavailable but preserve product visibility for inventory and review purposes.


## ProductImage Rules

Images must be uploaded by the product owner and linked to a valid product. The first image in sort order becomes the main thumbnail. Sellers can reorder images to change visibility priority and delete images at any time. Image deletion affects the product's visual representation but does not block product editing. All image changes are included in product snapshots, preserving the full set of images at each point in time. Images cannot be shared across products; each image belongs to exactly one product. No image limit per product is enforced by business rules, though system constraints may apply.

### Main Image Designation

THE system SHALL designate the image with the lowest sort order value as the main image for a product.\n\nWHEN a seller reorders images, THE system SHALL automatically update the main image designation based on the new sort order.\n\nWHEN the main image is deleted, THE system SHALL automatically reassign the main image to the image with the next lowest sort order value.

### Seller-Only Management

WHEN a seller attempts to upload, edit, or delete a product image, THE system SHALL verify that the user is the owner of the product.\n\nIF the user is not the owner of the product, THE system SHALL reject the request.\n\nOnly sellers can manage images for products they own; administrators and customers cannot upload, edit, or delete product images.

### Snapshot Inclusion

WHEN a product snapshot is created, THE system SHALL include all current images for that product in the snapshot.\n\nTHE system SHALL record each image's URL, sort order, and isMain flag as it existed at the time of the snapshot.\n\nWHEN a seller edits images on a product, THE system SHALL create a new product snapshot that captures the complete image set at that moment.

### Non-Sharable Ownership

WHEN a seller uploads an image, THE system SHALL associate it with exactly one product.\n\nIF an image is attempted to be linked to multiple products, THE system SHALL reject the request.\n\nEach image MUST belong to one and only one product; images cannot be shared across products.

### Sort Order Persistence

WHEN a seller reorders images, THE system SHALL persist the new sort order values for each image.\n\nTHE system SHALL enforce uniqueness of sort order values within each product; no two images for the same product can have the same sort order.\n\nTHE system SHALL preserve sort order values across all operations except explicit reordering; they are not reset during image deletion or reassignment.

## ProductVariant Rules

Each variant must have a unique SKU code across the platform and be tied to one product. Variants define stock quantity, which starts at zero by default, and may override the base price. Sellers can add, edit, or delete variants, subject to pending order or request constraints. A product must have at least one active variant to be purchasable; products with no variants are marked unavailable. Variant edits trigger versioned snapshots. Stock levels affect cart availability: out-of-stock variants cannot be added to cart. Option values (e.g., color, size) must be provided as structured JSON, not free text.

### SKU Uniqueness

WHEN a seller creates a new product variant, THE system SHALL ensure the SKU code is unique across all products in the system.

IF another variant with the same SKU code already exists, THE system SHALL reject the request.

WHEN a seller edits a variant’s SKU code, THE system SHALL validate that the new SKU code is not used by any other variant in the system.

IF the new SKU code matches an existing variant, THE system SHALL reject the request and preserve the current SKU code.

### Option Values Structure

WHEN a seller creates or edits a variant, THE system SHALL require option values to be provided as structured JSON.

Option values SHALL define key-value pairs for each configurable attribute (e.g., color, size), such as {"color": "Red", "size": "Large"}.

IF the option values are missing, malformed, or not valid JSON, THE system SHALL reject the request.

IF an option values object is empty (no key-value pairs), THE system SHALL reject the request.

### Stock Quantity Management

WHEN a variant is created, THE system SHALL initialize its stock quantity to zero.

WHEN a seller adds inventory, THE system SHALL increase the stock quantity by the specified amount.

WHEN an order is placed for a variant, THE system SHALL decrease the stock quantity by the purchased quantity.

WHEN an order is cancelled or refunded, THE system SHALL increase the stock quantity by the restored quantity.

WHEN a seller attempts to edit a variant’s stock quantity directly, THE system SHALL NOT allow manual adjustments—stock must only change via inventory records.

IF a customer attempts to add an out-of-stock variant to their cart, THE system SHALL prevent the action and display an out-of-stock warning.

### Base Price Override

WHEN a seller creates a variant, THE system SHALL allow an optional price override value.

IF the price override is omitted, THE system SHALL use the product’s base price for that variant.

IF the price override is provided, THE system SHALL use the override value instead of the base price.

WHEN displaying prices for a product with variants, THE system SHALL show either a single price (if all variants share the same price) or a price range (if variant prices differ).

### Deletion Constraints

WHEN a seller attempts to delete a variant, THE system SHALL verify that:
1. No pending order items exist for that variant with status "paid" or "shipped"
2. No pending cancellation or refund requests exist for that variant

IF either condition is not met, THE system SHALL reject the deletion and preserve the variant.

WHEN a deletion is approved, THE system SHALL delete the variant and all associated inventory records.

WHEN all variants of a product are deleted, THE system SHALL mark the product as "unavailable" in listings but preserve its visibility for search and historical records.

## ProductSnapshot Rules

A product snapshot is created every time a product is edited, capturing the full state including name, description, category, price, and associated images at that moment. Sellers may only view snapshots of their own products; administrators may view any. Snapshots are immutable and cannot be deleted, even if the original product is removed. Each snapshot preserves all variant snapshots that existed at the time, maintaining referential consistency. Snapshots are used to reconstruct product states for dispute resolution and order fulfillment. Product owner identity at snapshot time is recorded, ensuring correct provenance even after account changes.

### Snapshot Creation Triggers

WHEN a seller edits a product, THE system SHALL create a product snapshot.

WHEN a product is purchased, THE system SHALL create a product snapshot with status 'order'.

WHEN a refund is approved, THE system SHALL create a product snapshot with status 'refund'.

WHEN a cancellation is approved, THE system SHALL create a product snapshot with status 'cancel'.

THE system SHALL NOT allow any user to create a snapshot manually or modify existing snapshots.

### Immutable Versioning

ALL product snapshots are immutable after creation.

NO user or system process SHALL modify any field in an existing product snapshot.

NO user or system process SHALL delete any product snapshot, even if the original product is deleted.

Every product snapshot captures the complete state of the product at the moment of creation, including all image associations.

### Owner-Provenance Tracking

WHEN a product snapshot is created, THE system SHALL record the sellerId, customerId (if applicable), and snapshot type.

THE seller identity at the time of snapshot creation is permanently preserved, even if the seller's account changes ownership, shop name, or approval status.

IF the user who owned the product changes roles (e.g., customer to seller), all existing snapshots retain the original owner reference.

### Full Variant Encapsulation

WHEN a product snapshot is created, THE system SHALL include all product variant snapshots that existed at that moment.

Each product-snapshot-variant MUST include: SKU code, option values (as JSON), and price override (nullable).

The relationship between product snapshot and its variant snapshots MUST be immutable and preserved exactly as it was at the time of purchase or edit.

### Administrator Read Access

Administrators MAY view all product snapshots on the platform, regardless of seller ownership.

Regular administrators MAY view snapshots of any product for dispute resolution or compliance purposes.

Sellers MAY only view snapshots of products they owned at the time of snapshot creation.

### Dispute Resolution Source

WHEN a dispute arises about a past product state, THE system SHALL use the most relevant product snapshot (e.g., 'order' snapshot for order-related disputes, 'edit' snapshot for description disputes).

Product snapshots SHALL be the sole authoritative source for reconstructing product states during dispute resolution.

Product-snapshot-variants provide exact variant specification, enabling precise fulfillment or return verification.

### Snapshot Preservation After Product Deletion

IF a product is deleted, ALL associated product snapshots MUST remain intact and accessible to administrators.

IF a product is deleted, ALL associated product-snapshot-variants MUST remain intact and linked to their parent snapshot.

The snapshot chain SHALL be preserved even if the seller account is deleted.

### Error Conditions

THE system SHALL reject snapshot creation attempts by non-seller users.

THE system SHALL reject manual deletion attempts on any product snapshot.

THE system SHALL reject modification attempts on any snapshot field or relationship.

THE system SHALL reject attempts to create duplicate snapshots for the same edit event.

### Snapshot Snapshot Typing

Product snapshots MUST include a 'snapshotType' field with exact values: 'edit', 'order', 'refund', or 'cancel'.

THE system SHALL NOT allow snapshot type changes after creation.

Snapshot types enable filtering by usage context (e.g., 'order' snapshots for fulfillment reconstruction).

## ProductSnapshotVariant Rules

Each product snapshot includes one or more variant snapshots reflecting the exact configuration at the moment of change. SKU codes, option values, prices, and stock quantities are preserved in these snapshots. Snapshot variants maintain links to their parent snapshot and cannot exist independently. Order items reference product snapshot variants, not live variants, ensuring price and spec fidelity at purchase time. Variant snapshots are never updated or deleted, supporting audit integrity. Stock quantity in a snapshot represents the value at time of product edit, not runtime availability.

### Time-Capture Fidelity

WHEN a product is edited, THE system SHALL create a product snapshot that includes all variant snapshots at that moment.

WHEN a variant snapshot is created, THE system SHALL capture:
1. The exact SKU code at the time of snapshot
2. The exact option values (e.g., color: "Red", size: "Large")
3. The exact price override value (or null if none)
4. The creation timestamp of the snapshot variant

WHEN a product snapshot is created for an order, THE system SHALL create variant snapshots with identical data to those at the time of purchase.

WHERE variant prices differ from base price, THE system SHALL preserve the override value exactly as configured.

### Order Item Linkage

WHEN an order item is created, THE system SHALL reference a product snapshot variant—not the live variant—to ensure price and specification fidelity.

THE system SHALL ensure that each order item’s variant data matches the corresponding product snapshot variant at the time of order.

IF a variant snapshot is referenced by an order item, THE system SHALL NOT allow deletion of that snapshot.

THE system SHALL preserve variant option values and price in the order item snapshot even if the live variant is later modified or deleted.

### Invariant Record

WHEN a product snapshot variant is created, THE system SHALL treat it as immutable and non-updatable.

THE system SHALL NOT allow modification, deletion, or archival of product snapshot variants after creation.

WHEN a variant edit occurs, THE system SHALL create a new snapshot variant record rather than updating the existing one.

IF a user attempts to modify a product snapshot variant, THE system SHALL reject the request.

### Snapshot-Parent Dependency

WHEN a product snapshot variant is created, THE system SHALL require a valid product snapshot ID and reject requests without it.

THE system SHALL NOT allow product snapshot variants to exist independently without a parent product snapshot.

WHEN a product snapshot is deleted, THE system SHALL NOT cascade-delete product snapshot variants—variants must be orphaned, not removed.

IF a product snapshot is referenced by an order item, THE system SHALL prohibit deletion of that snapshot and its associated variants.

### Spec Preservation

WHEN a product variant’s options (e.g., color, size) are edited, THE system SHALL capture the exact previous option values in the snapshot variant.

THE system SHALL preserve SKU codes exactly as they were at the time of snapshot—even if the live variant’s SKU is later changed or reused.

WHERE a product variant price is overridden, THE system SHALL capture the override value—even if it equals the base price (e.g., 0.00 difference).

WHEN a product variant is deleted, THE system SHALL ensure that its snapshot variants retain the full specification as of deletion time.

THE system SHALL include all variant specs (SKU, options, price) in the snapshot, ensuring complete fidelity for dispute resolution and audit trails.

## InventoryRecord Rules

Every inventory change results in a record that is never deleted but included in the cumulative stock calculation. Records include positive (restock, refund) and negative (orders, adjustments) quantity changes with reasons (restock, order, adjustment, cancel, refund). Sellers initiate restocking and adjustment records manually. Order placement automatically generates a negative record, and cancellation/refund creates a positive one. Inventory records are timestamped and tied to specific variants. Negative stock balances are not permitted by business rules; systems must prevent over-selling. Historical inventory tracking supports reconciliation and audit.

### Inventory Record Creation and Calculation

WHEN a seller adds inventory to a variant, THE system SHALL create an inventory record with a positive quantity change and reason 'restock'.

WHEN an order is successfully placed, THE system SHALL automatically create an inventory record with a negative quantity change equal to the purchased quantity and reason 'order'.

WHEN an item is cancelled, THE system SHALL automatically create an inventory record with a positive quantity change and reason 'cancel'.

WHEN an item is refunded, THE system SHALL automatically create an inventory record with a positive quantity change and reason 'refund'.

WHEN a seller performs a stock adjustment (loss/damage), THE system SHALL create an inventory record with a negative quantity change and reason 'adjustment'.

THE system SHALL calculate the current stock quantity for each variant by summing all inventory records associated with that variant.

WHILE inventory records are created, THE system SHALL never delete or modify them—records are immutable and preserved for audit.

IF an inventory change would result in a negative stock balance, THE system SHALL reject the operation and prevent the order placement or adjustment.

### Allowed Inventory Record Reasons

THE system SHALL only accept the following reasons for inventory records: 'restock', 'order', 'adjustment', 'cancel', 'refund'.

IF a request includes an inventory reason not in the allowed list, THE system SHALL reject the operation.

WHEN a seller submits a restock request, THE system SHALL require a non-empty reason description for audit purposes.

WHEN a seller submits an adjustment request, THE system SHALL require a non-empty reason description for audit purposes.

### Negative Stock Balance Prevention

WHEN a seller attempts to restock or adjust a variant’s stock, THE system SHALL verify that the resulting stock after the operation will not be negative.

IF the operation would result in a negative stock balance, THE system SHALL reject the operation and return an error.

WHILE a customer adds items to cart, THE system SHALL ensure the requested quantity does not exceed the variant’s current stock.

IF a customer attempts to order more items than available stock, THE system SHALL reject the checkout and display an out-of-stock warning.

THE system SHALL prevent sellers from creating inventory records that would cause negative stock balances on any variant.

## CartItem Rules

Customers add specific variants—not products—to their cart, selecting a quantity of at least one. The same variant cannot appear twice in the cart; quantities are combined instead. Cart item quantities may exceed available stock only temporarily; warnings display when exceeding actual inventory. Unavailable items (deleted or out-of-stock variants) are flagged in the cart but may remain until checkout. Cart contents persist across sessions for logged-in users. Items cannot be added to cart if the variant's price is null or negative. Cart totals update dynamically based on variant prices at the time of viewing.

### Variant-Specific Addition

WHEN a customer adds a variant to their cart, THE system SHALL:
1. Require the customer to select a specific variant, not just a product
2. Accept a quantity of at least one
3. Reject requests where the variant does not exist
4. Reject requests where the variant belongs to a suspended seller
5. Reject requests where the variant's price is null or negative

IF the selected product is unavailable (no variants exist), THE system SHALL reject the request.

WHERE the variant is unavailable due to deletion, THE system SHALL store the item with a warning flag.

### Quantity Combination

WHEN a customer adds a variant that already exists in their cart, THE system SHALL:
1. Combine quantities instead of creating a duplicate cart item
2. Update the combined quantity to the sum of existing and new quantity
3. Update the cart total price using the variant’s current price

WHERE the same variant is added multiple times in separate actions, THE system SHALL ensure only one cart item record exists for that variant.

WHEN the cart quantity is updated manually, THE system SHALL NOT create a new item.

IF the combined quantity exceeds available stock, THE system SHALL continue to store the item but mark it for warning display.

### Stock-Based Warning

WHEN a cart item’s quantity exceeds the variant’s current stock, THE system SHALL:
1. Display a warning to the customer indicating insufficient stock
2. Allow the customer to reduce the quantity to available stock
3. Prevent checkout for items where quantity exceeds available stock

WHERE a cart item’s variant has zero stock, THE system SHALL mark the item as unavailable and show a warning.

IF the variant becomes unavailable during checkout due to stock changes, THE system SHALL reject the checkout attempt and notify the customer.

### Availability Flags

WHEN a cart item’s variant is deleted by the seller, THE system SHALL:
1. Mark the cart item as unavailable
2. Display a message indicating the product is no longer available
3. Prevent checkout of unavailable items

WHEN a cart item’s variant has zero stock and is not deleted, THE system SHALL:
1. Mark the cart item as unavailable
2. Display a message indicating the product is out of stock
3. Prevent checkout of unavailable items

WHERE a seller’s account is suspended, THE system SHALL mark all their variants’ cart items as unavailable.

WHILE a cart item is unavailable, THE system SHALL display a clear visual indicator to the customer.

### Price Validation

WHEN a variant’s price is modified, THE system SHALL:
1. Ensure the price is a non-negative decimal value
2. Reject price updates where the value is null or negative

WHEN a cart item is added or updated, THE system SHALL:
1. Use the variant’s current price to calculate the item subtotal
2. Ensure the price used is the latest approved version at that moment
3. Recalculate the cart total based on the updated item price

WHERE a cart item’s variant price changes after it was added to the cart, THE system SHALL:
1. Update the displayed subtotal to reflect the new price
2. Warn the customer if the price increased significantly
3. Allow the customer to remove or adjust quantity before checkout

IF a variant’s price is null or negative, THE system SHALL prevent the variant from being added to the cart.

## WishlistItem Rules

Customers may add any product to their wishlist, not specific variants. Wishlist items are owned solely by the customer and cannot be shared. Removing a product from the wishlist does not affect other users' wishlists. Wishlist items automatically disappear if the product is deleted by the seller. Customers may view their wishlist in paginated form and reorder items via drag-and-drop UI logic, though ordering is not enforced by business rules. Wishlist capacity is unlimited; no item count limits apply. Removing an item is permanent; no recovery mechanism exists.

### Product-level Addition

WHEN a customer adds a product to their wishlist, THE system SHALL:
1. Require selection of a specific product (not a variant)
2. Accept the request even if the product has no available variants
3. Store the relationship between the customer and product
4. Ignore any variant-specific data in the request

IF the product does not exist, THE system SHALL reject the request.
IF the product is already in the customer's wishlist, THE system SHALL NOT create a duplicate.

### Auto-removal on Product Deletion

WHEN a seller deletes a product, THE system SHALL:
1. Automatically remove all wishlist items referencing that product
2. Preserve no record of the removed wishlist items (except as part of the product deletion snapshot)
3. Not affect the wishlists of other customers

WHILE a product exists, THE system SHALL ensure its presence in every customer's wishlist remains valid.

### Customer-only Ownership

ONLY the customer who added a wishlist item can view or manage it.

THE system SHALL NOT allow any other user (including the seller of the product, other customers, or administrators) to view, modify, or delete another customer's wishlist items.

WHEN a customer deletes their account, THE system SHALL:
1. Permanently remove all their wishlist items
2. Preserve no trace of the wishlist items after account deletion

### No Sharing or Duplication

A wishlist item is owned exclusively by one customer and cannot be shared, transferred, or duplicated.

THE system SHALL NOT support:
1. Shared wishlists across users
2. Public wishlists visible to other users
3. Copying or duplicating wishlist items between users

WHEN a product is deleted by a seller, THE system SHALL ensure the removal affects only the specific customer-product relationship and does not create side effects on other entities.

### Unlimited Capacity

The wishlist system has no item count limit for any customer.

THE system SHALL allow customers to add an unlimited number of wishlist items.

IF a customer reaches a theoretically high wishlist item count, THE system SHALL continue to accept new additions without imposing artificial barriers.

## Order Rules

Orders are created only after successful payment and contain one or more order items. Each order links to a shipping address selected at checkout, which becomes immutable once the order is placed. Orders can include items from multiple sellers, each with its own shipment. Total price reflects the sum of all order item subtotals at checkout time. Order status derives from item statuses: paid, shipped, delivered, cancelled, refunded, or partially completed. Unavailable cart items (deleted or out-of-stock) cannot proceed to checkout. A customer may not place an order with no items in their cart. Order creation triggers stock deduction and cart cleanup.

### Post-Payment Order Creation

WHEN a customer successfully completes payment, THE system SHALL create an order.

WHEN an order is created, THE system SHALL:
1. Link the order to the customer who initiated the checkout
2. Store the selected shipping address at the time of checkout
3. Include all valid cart items as order items
4. Set each order item's initial status to "paid"
5. Deduct stock quantities for all purchased variants via inventory records
6. Remove all items from the customer's cart
7. Generate and preserve snapshots of each product, variant, and seller profile at the time of purchase

IF payment processing fails, THE system SHALL NOT create an order.
IF the cart is empty at checkout time, THE system SHALL reject the checkout attempt.
IF any cart item variant is deleted or out of stock at checkout time, THE system SHALL prevent that item from being included in the order.

### Immutable Shipping Address

WHEN an order is created, THE system SHALL copy and freeze the selected shipping address.

THE system SHALL NOT allow the shipping address to be modified after order creation.

WHEN a customer views an order, THE system SHALL display the frozen shipping address as it was at checkout time.

IF a customer attempts to update their shipping address after placing an order, THE system SHALL reject the update request.

### Multi-Seller Order Support

WHEN an order contains items from multiple sellers, THE system SHALL create separate shipments for each seller.

WHEN an order is created with items from multiple sellers, THE system SHALL:
1. Include all order items in the order record
2. Assign each order item to its respective seller
3. Preserve the seller profile information for each seller at the time of purchase

THE system SHALL allow customers to view all items in an order regardless of seller.

WHEN a seller ships items, THE system SHALL create a shipment record containing only that seller's items from the order.

### Order Status Aggregation

WHEN an order contains multiple items, THE system SHALL derive the overall order status from the statuses of its items.

THE system SHALL use the following aggregation rules:
1. IF all items have status "paid" → order status = "paid"
2. IF any item has status "shipped" and no items have status "delivered" → order status = "shipped"
3. IF all items have status "delivered" → order status = "delivered"
4. IF all items have status "cancelled" → order status = "cancelled"
5. IF all items have status "refunded" → order status = "refunded"
6. FOR all other combinations → order status = "partially completed"

WHEN an item's status changes, THE system SHALL automatically recalculate and update the order's overall status.

### Cart Integrity Validation

WHEN a customer initiates checkout, THE system SHALL validate cart integrity before proceeding.

THE system SHALL allow checkout only when:
1. The cart contains at least one item
2. All items in the cart have valid variants
3. All items in the cart have sufficient stock for their requested quantities

IF any cart item's variant has been deleted since being added to the cart, THE system SHALL mark it as unavailable and prevent checkout until removed.

IF any cart item's variant stock is insufficient for its requested quantity, THE system SHALL show a warning and allow the customer to adjust quantities or remove the item before proceeding.

## OrderItem Rules

Each order item represents a purchased product variant with quantity and status, independent of other items in the same order. Status transitions are sequential: paid to shipped to delivered, with optional intermediate cancelled or refunded states. Order items capture product and variant snapshots at purchase time to preserve original specs and pricing. Stock is decremented per item upon purchase, and restored on cancellation or refund. Sellers process cancellations and refunds per item, not per order. An item cannot be shipped unless its status is paid, and cannot be refunded unless delivered. Order items may not exist outside an order container.

### Per-Item Status Control

WHEN an order item is created, THE system SHALL set its status to "paid".

WHILE an order item has status "paid", THE system SHALL allow the seller to change its status to "shipped".

WHILE an order item has status "shipped", THE system SHALL allow the customer to confirm delivery, which SHALL change its status to "delivered".

WHILE an order item has status "delivered", THE system SHALL allow the customer to request a refund.

IF an order item is cancelled, THE system SHALL set its status to "cancelled".

IF an order item is refunded, THE system SHALL set its status to "refunded".

WHILE an order item has status "paid", THE system SHALL allow the customer to request cancellation.

THE system SHALL NOT allow status transitions that violate the sequential flow (paid → shipped → delivered).

### Snapshot Capture at Purchase

WHEN an order item is created during checkout, THE system SHALL capture a snapshot of the product name, description, and base price.

WHEN an order item is created during checkout, THE system SHALL capture a snapshot of the variant's SKU code, option values, and price at that time.

WHEN an order item is created during checkout, THE system SHALL capture a snapshot of the seller's shop name and logo URL.

THE system SHALL store all product snapshots with the order item to preserve exact specifications at time of purchase.

IF the product or variant is later edited or deleted, THE system SHALL NOT affect the order item's captured snapshot data.

WHEN a refund request is approved for an order item, THE system SHALL preserve a snapshot of the item state at approval time.

### Stock Adjustment Timing

WHEN an order item is created during checkout, THE system SHALL create a negative inventory record for the purchased variant.

WHEN an order item's cancellation request is approved, THE system SHALL create a positive inventory record restoring the stock.

WHEN an order item's refund request is approved, THE system SHALL create a positive inventory record restoring the stock.

THE system SHALL calculate the current stock quantity by summing all inventory records for the variant.

WHEN stock reaches zero, THE system SHALL mark the variant as "out of stock" for future purchases.

WHILE an order item has status "paid", THE system SHALL NOT allow inventory adjustments that would cause negative stock.

### Seller-Responsibility Lifecycle

WHEN an order item is created, THE system SHALL associate it with the seller who owns the product.

WHILE an order item has status "paid", THE system SHALL allow only its associated seller to process cancellation or refund requests.

WHILE an order item has status "paid", THE system SHALL allow only its associated seller to mark it as "shipped".

WHEN an order item's status changes to "shipped", THE system SHALL trigger shipment creation by its associated seller.

IF a seller deletes their account after order fulfillment, THE system SHALL preserve the seller identity in the order item snapshot.

WHEN a seller's shop is suspended, THE system SHALL allow them to continue processing existing order items for shipment.

### Non-Standalone Existence

AN order item SHALL NOT exist without being associated with an order.

THE system SHALL NOT allow creation of an order item outside of a successful order placement.

WHEN an order is cancelled, THE system SHALL set all associated order items to "cancelled" status.

WHEN an order is refunded, THE system SHALL set all associated order items to "refunded" status.

AN order item SHALL NOT be created if the cart is empty at checkout time.

AN order item SHALL NOT be created for a product variant that was deleted before order placement.

## Shipment Rules

A shipment groups one or more order items from the same seller into a single package. Shipment creation triggers status change of included items to shipped. Tracking information (carrier name, tracking number) is optional at creation but expected before delivery. Sellers may choose how to bundle items, including shipping each separately. Shipment items cannot span across sellers; cross-seller orders always produce separate shipments. Delivery confirmation by the customer (or automatic after 14 days) updates all associated items to delivered. Shipping address in the shipment matches the order's address and cannot be changed mid-shipment.

### Seller-Bound Bundling

WHEN a seller creates a shipment, THE system SHALL ensure all included order items belong to the same seller.

IF an order item from a different seller is included, THE system SHALL reject the shipment creation request.

WHERE a shipment is created, THE system SHALL verify seller ID consistency across all selected order items.

### Item Status Transition Trigger

WHEN a shipment is created, THE system SHALL transition all included order items to status 'shipped'.

WHILE an order item is included in a shipment with status 'pending', THE system SHALL keep its status as 'paid'.

THE system SHALL NOT transition an order item to 'shipped' until a valid shipment record exists for it.

### Tracking Information Linkage

WHEN a shipment is created, THE system SHALL allow optional entry of carrier name and tracking number.

WHERE tracking information is provided, THE system SHALL associate it with the shipment, not individual order items.

WHEN a customer views a shipment, THE system SHALL display the carrier name and tracking number for all items in that shipment.

### Cross-Seller Separation

WHEN an order contains items from multiple sellers, THE system SHALL create one shipment per seller, never bundling items across sellers.

THE system SHALL NOT split an order item’s seller assignment across shipments.

WHERE an order includes items from three sellers, THE system SHALL generate exactly three shipments.

### Delivery Confirmation Window

WHEN a shipment is marked as shipped, THE system SHALL start a 14-day delivery confirmation window.

IF no delivery confirmation occurs within 14 days, THE system SHALL automatically transition all items in that shipment to status 'delivered'.

WHEN a customer confirms delivery for a shipment, THE system SHALL immediately transition all items in that shipment to status 'delivered'.

## ShipmentItem Rules

A shipment item links exactly one order item to a shipment, with creation timestamp. Shipment items are created only when a shipment is initiated and cannot be added or removed afterward. All shipment items share the same tracking data and delivery confirmation. The system records when shipment items were included, supporting fulfillment audit trails. Shipment items persist even if the associated order item is later cancelled or refunded. Each shipment must contain at least one shipment item; empty shipments are not allowed.

### One-to-One Order Item Mapping

WHEN a shipment is created, THE system SHALL create exactly one shipment item for each order item included in that shipment. Each shipment item links precisely one order item to the shipment and establishes a one-to-one mapping that cannot be altered afterward.

### Immutable Composition

WHEN a shipment item is created, THE system SHALL record the creation timestamp and immutable association between the shipment and the order item. AFTER creation, NO user or system process SHALL add, remove, or reassign shipment items to the shipment.

### Shared Delivery Event

WHEN a shipment is marked as shipped, THE system SHALL update the status of all shipment items in that shipment to "shipped" simultaneously. WHEN a customer confirms delivery (or 14 days pass), THE system SHALL update all shipment items in that shipment to "delivered" simultaneously.

### Fulfillment Audit Support

WHEN any shipment item change is needed for audit or dispute resolution, THE system SHALL allow authorized users (customer, seller, admin) to view the complete history of shipment items, including creation timestamp, shipment status at time of inclusion, and delivery confirmation timestamp.

### Non-Empty Shipment Requirement

IF a shipment is created without any shipment items, THE system SHALL reject the shipment creation. THE system SHALL ensure that every shipment contains at least one shipment item at all times.

## CancellationRequest Rules

Cancellation requests are per-order-item and can only be initiated by customers for items with status paid (not yet shipped). Requests must include a text reason and cannot be submitted for delivered or cancelled items. Sellers receive the request and may approve or reject it; responses generate a snapshot of the request state. Approval triggers cancellation of the item and restoration of stock. Partial cancellation (some items cancelled, others remain) is supported. Cancellation requests expire after a time window if unresponded, reverting the item to paid status. Multiple requests for the same item are not allowed.

### Paid-Only Initiation

WHEN a customer submits a cancellation request, THE system SHALL:
1. Allow initiation only for order items with status 'paid'
2. Reject requests for items with status 'shipped', 'delivered', or 'cancelled'
3. Prevent multiple active requests for the same order item

IF the target order item has status 'shipped', THE system SHALL reject the request.
IF the target order item has status 'delivered', THE system SHALL reject the request.
IF the target order item has status 'cancelled', THE system SHALL reject the request.
IF the target order item already has a pending cancellation request, THE system SHALL reject the request.

### Reason Requirement

WHEN a customer submits a cancellation request, THE system SHALL:
1. Require a non-empty text reason
2. Enforce a minimum length of 1 character
3. Enforce a maximum length of 1000 characters

IF the reason is empty, THE system SHALL reject the request with 'reason_required'.
IF the reason exceeds 1000 characters, THE system SHALL reject the request with 'reason_too_long'.

### Seller Approval Workflow

WHEN a cancellation request is created, THE system SHALL:
1. Set the request status to 'pending'
2. Notify the seller via their preferred notification method

WHEN a seller responds to a pending request, THE system SHALL:
1. Update the request status to 'approved' or 'rejected'
2. Record the response timestamp
3. Create a snapshot of the request state before updating
4. Store the seller's approval notes (if any)

IF the request has already been resolved, THE system SHALL reject any further response attempts.

### Stock Restoration on Approval

WHEN a cancellation request is approved, THE system SHALL:
1. Change the associated order item status to 'cancelled'
2. Restore stock quantities by creating an inventory record with reason 'cancel'
3. Remove the item from the seller's pending shipment queue
4. Recalculate the order status based on remaining items

WHILE an order item is cancelled, THE system SHALL:
1. Restore inventory stock exactly to pre-purchase levels
2. Associate the inventory record with the cancellation request ID
3. Record the cancellation timestamp for audit purposes

### One-Request-Per-Item Limit

WHEN a customer attempts to create a cancellation request for an order item, THE system SHALL:
1. Check for existing pending requests for the same order item
2. Block creation of any new request if an active request exists
3. Only allow new requests after the previous one is resolved (approved or rejected)

IF a customer attempts to create a second pending request for the same order item, THE system SHALL reject the request with 'request_already_pending'.

## RefundRequest Rules

Refund requests are per-order-item and can only be initiated by customers for items with status delivered. Requests must be submitted within 7 days of delivery and require a text reason. Sellers may approve or reject refund requests, with response creating an immutable snapshot. Approved refunds restore stock and mark the item as refunded. Refunds can occur even if the item is not physically returned, based on seller discretion. Multiple refund requests for the same item are blocked. Partial refunds are not supported; each request applies to the full item quantity. Refund requests cannot be submitted after the 7-day window expires.

### Refund Initiation Conditions

WHEN a customer submits a refund request for an order item, THE system SHALL:
1. Require the item status to be 'delivered'
2. Require the request to be submitted within 7 days of the delivery confirmation date
3. Require a text reason for the refund request
4. Block submission if any pending or approved refund request already exists for that item
5. Store the request status as 'pending'

IF the item status is not 'delivered', THE system SHALL reject the request with a message indicating delivery status is required.
IF the delivery confirmation date is older than 7 days, THE system SHALL reject the request with a time-window expiration message.
IF the request reason is empty or whitespace-only, THE system SHALL reject the request with a required reason error.

### Seller Response and Approval Workflow

WHEN a seller responds to a refund request, THE system SHALL:
1. Allow only the seller of the associated product to approve or reject the request
2. Record the response decision and timestamp
3. Create an immutable refund request snapshot preserving pre-response state
4. Update the request status to 'approved' or 'rejected'

WHEN a seller approves a refund request, THE system SHALL:
1. Restore the stock quantity for the variant by creating a positive inventory record with reason 'refund'
2. Change the associated order item status to 'refunded'
3. Preserve a product snapshot of the variant at current state for audit

WHEN a seller rejects a refund request, THE system SHALL:
1. Preserve the current order item status (e.g., 'delivered')
2. Maintain the stock quantity without restoration
3. Record the rejection decision without snapshot re-creation

WHEN an administrator approves a refund request directly, THE system SHALL:
1. Execute all stock restoration and status update steps as seller approval
2. Record administrator ID as the decision actor in the snapshot

IF a non-owner seller attempts to respond, THE system SHALL reject the request.

### Refund Item Status and Order Impact

WHEN a refund request is approved, THE system SHALL:
1. Change only the affected order item status to 'refunded'
2. Leave other items in the same order unaffected
3. Recalculate and update the overall order status based on remaining items
4. Ensure the order reflects 'refunded' only if all items are refunded, or 'partiallyCompleted' if mixed

IF a refund request is for the last remaining item in an order and is approved, THE system SHALL change the order status to 'refunded'.

WHEN a refund is processed, THE system SHALL:
1. Record the inventory restoration with reference ID linked to the original order item
2. Preserve stock quantity non-negativity (never allow negative balances)
3. Log the refund decision actor and timestamp in the inventory record reason

IF a variant with zero stock is refunded, THE system SHALL restore stock to at least 0 and allow positive adjustments as needed.

### Restrictions on Refund Scope

THE system SHALL reject refund requests when:
1. The refund amount or quantity would result in partial fulfillment (partial refunds are not supported)
2. The refund request attempts to exceed the original purchased quantity for the item
3. The refund is submitted after the 7-day delivery window expires
4. A previous refund request (pending, approved, or rejected) exists for the same order item

WHERE a customer submits a refund request for an item with status 'delivered', THE system SHALL:
1. Allow the full quantity of that item to be refunded only
2. Prohibit splitting the refund into multiple partial requests
3. Maintain one-to-one mapping between refund request and order item

IF a seller attempts to process multiple refund requests for the same item, THE system SHALL block additional requests with an error indicating one active refund per item.

### Snapshot and Audit Requirements

WHEN a refund request is created, THE system SHALL:
1. Capture the order item status, reason, and timestamps for audit
2. Preserve a refund request snapshot upon any status change (approved/rejected)
3. Store the snapshot as immutable and non-deletable
4. Include the refund reason, decision actor ID, and timestamp

WHEN a seller edits the refund request reason before submission, THE system SHALL NOT create a snapshot
because reason edits before submission are allowed inline without versioning.

WHEN a refund is approved, THE system SHALL:
1. Create a refund request snapshot capturing pre-approval state
2. Store the snapshot alongside the original refund request
3. Preserve the variant price and options as they existed at time of refund

WHEN an administrator reviews a refund, THE system SHALL:
1. Allow viewing all snapshots and current status
2. Permit historical audit but prohibit modification of snapshots
3. Ensure no snapshot can be deleted or altered post-creation

## Review Rules

Reviews can only be written after an order item reaches delivered status and must reference the original order item. Customers may write only one review per product per order, even if multiple items were purchased. Reviews require a rating (1 to 5 stars) and optionally include text content. Reviews are editable by the author at any time, with edits captured as snapshots. Deleted reviews are hidden from average rating calculation but remain in snapshots. Reviews cannot be attached to products that were never purchased by the reviewer. Rating value validation ensures only integers from 1 to 5 are accepted.

### Delivered-Only Eligibility

WHEN a customer attempts to create a review for an order item, THE system SHALL verify the item status is "delivered".

IF the order item status is not "delivered", THE system SHALL reject the review creation request.

The delivered status requirement applies even if the item was automatically marked delivered after 14 days.

The system SHALL accept reviews submitted on the same day as delivery confirmation.

### One-Review-Per-Product-Per-Order

WHEN a customer attempts to create a review for a product in an order, THE system SHALL verify no existing review exists for that product in that specific order.

IF a review already exists for the same product and order combination, THE system SHALL reject the review creation request.

This rule applies even if the customer purchased multiple units of the same product in the same order (e.g., 3 items of Product A still count as one eligible review opportunity).

The system SHALL treat reviews as per-product-per-order, not per-item-per-order.

### Rating Validation

WHEN a customer submits a review, THE system SHALL require a rating value.

IF the rating value is not an integer between 1 and 5 (inclusive), THE system SHALL reject the review submission.

WHEN a customer edits a review, THE system SHALL validate the rating field meets the same constraints (1-5 integer).

The rating field SHALL be stored as an integer, not a decimal or string.

### Snapshot Capture on Edit

WHEN a customer edits an existing review, THE system SHALL create a review snapshot preserving the previous rating and text content.

THE system SHALL record the timestamp when the edit occurred in the snapshot.

Review snapshots SHALL be immutable and cannot be deleted.

THE system SHALL include the snapshot ID in the updated review record.

WHEN calculating average ratings, THE system SHALL use only the most recent review content, not snapshot values.

### Purchase Requirement

WHEN a customer attempts to create a review, THE system SHALL verify the referenced order item was purchased by that customer.

IF the order item does not belong to the submitting customer, THE system SHALL reject the review creation request.

THE system SHALL validate that the review references a valid order item with a non-null product and variant reference.

Reviews cannot be attached to products that were never purchased by the customer.

## ReviewSnapshot Rules

Every edit to a review creates a snapshot preserving the original rating and text content at that moment. Snapshots are immutable and stored indefinitely. Review authorship cannot be changed after creation, even in snapshots. Snapshots do not affect the live review's current state or average rating calculation directly; they serve only for audit and history. Reviewers cannot delete snapshots—only hide the live review, which removes its average rating influence. Snapshots include timestamps and reviewer identifiers for accountability. Snapshot content cannot be modified or merged with other records.

### Edit-Triggered Versioning

WHEN a customer edits a review, THE system SHALL create a ReviewSnapshot immediately before applying the change.

WHEN a ReviewSnapshot is created, THE system SHALL include the rating value, text content, and timestamp at the moment of the edit.

THE system SHALL NOT allow a review to be edited without creating a ReviewSnapshot.

WHEN a ReviewSnapshot is created, THE system SHALL preserve the current rating and text content exactly as they existed before the edit, regardless of whether the new values differ.

WHEN a review edit is attempted with invalid input (e.g., rating outside 1–5 range), THE system SHALL reject the request and NOT create a ReviewSnapshot.

### Authorship Immutability

THE ReviewSnapshot SHALL permanently retain the original reviewer's user identifier at the time of the snapshot.

WHEN a ReviewSnapshot is created, THE system SHALL NOT allow the reviewer identifier to be modified or overwritten.

IF a customer attempts to change reviewer attribution (via any interface or API), THE system SHALL reject the request.

THE ReviewSnapshot SHALL preserve reviewer identity even if the original user account is deleted or anonymized later.

A ReviewSnapshot can reference a deleted user as "anonymous" but MUST retain its original reviewer ID internally.

### Audit-Only Purpose

THE ReviewSnapshot SHALL serve exclusively for audit, dispute resolution, and history preservation.

WHEN calculating a product's average rating, THE system SHALL use ONLY the current (live) review values and NOT include ReviewSnapshot ratings.

WHEN displaying review history, THE system SHALL present ReviewSnapshots as read-only audit entries.

ReviewSnapshots SHALL NOT be used for public display, filtering, sorting, or analytics beyond historical transparency.

Administrators and the original reviewer MAY view ReviewSnapshots, but no other party MAY access them.

### Rating Influence Removal

WHEN a live review is deleted (hidden), THE system SHALL remove its rating from the product's average rating calculation.

THE system SHALL NOT retroactively adjust the average rating using ReviewSnapshot data when a live review is deleted.

ReviewSnapshots SHALL have no effect on rating computation, search ranking, or recommendation logic.

IF a live review is restored from deletion, its current rating SHALL be re-included in the average, but ReviewSnapshots from its previous deletion period SHALL remain excluded.

### Snapshot Immutability

THE system SHALL ensure ReviewSnapshots are immutable—no field, including rating or text content, MAY be modified after creation.

IF a user, seller, or administrator attempts to edit a ReviewSnapshot, THE system SHALL reject the request.

ReviewSnapshots SHALL persist indefinitely, even if the associated live review is deleted or the reviewer account is deleted.

WHEN a snapshot is requested, THE system SHALL return the exact data recorded at the time of creation, unmodified and unsummarized.

ReviewSnapshots can be archived for storage efficiency but MUST remain readable and unaltered.

## AdminRequest Rules

Any user may submit a request to become an administrator with a text reason. Requests start in pending status and require action by super administrators. Super administrators may approve or reject requests; rejection requires providing a reason. Rejected requests may be resubmitted with revised information. Admin requests are per-user and cannot be shared. Approved users become regular administrators unless elevated to super by another super administrator. Pending requests cannot be modified after submission; only status and response may change. No workflow automation processes these requests—only human administrators.

### User-Initiated Submission

WHEN any user submits an administrator request, THE system SHALL:
1. Require the user to provide a reason text
2. Store the request with status "pending"
3. Prevent duplicate pending requests from the same user
4. Record the exact timestamp of submission
5. Associate the request with the submitting user

IF a user already has a pending request, THE system SHALL reject the new submission.
IF the reason text is empty, THE system SHALL reject the request.

### Super-Admin-Only Approval

WHEN an administrator reviews a pending AdminRequest, THE system SHALL:
1. Only permit users with grade "super" to approve or reject requests
2. Reject approval/rejection attempts by regular administrators
3. Require the approving/demoting super administrator to provide response notes if rejecting
4. Update the request status upon successful action
5. Log which super administrator performed the action

IF a non-super administrator attempts to act on a request, THE system SHALL reject the action.
IF a super administrator approves a request, THE system SHALL automatically grant the submitting user the "admin" role.

### Reason Requirement

WHEN a user submits an AdminRequest, THE system SHALL:
1. Require the reason text field to be non-empty
2. Accept up to 1000 characters in the reason text
3. Reject submissions where the reason is missing or consists only of whitespace
4. Store the reason text exactly as submitted without modification

WHEN a super administrator rejects an AdminRequest, THE system SHALL:
5. Require the rejection reason to be recorded and stored
6. Prevent status change to "rejected" without providing a reason
7. Preserve the original reason text provided by the user alongside the rejection note

IF either required reason field is missing or invalid, THE system SHALL reject the operation.

### Resubmission Allowance

WHEN an AdminRequest is rejected, THE system SHALL:
1. Allow the original user to submit a new request with revised information
2. Permit resubmission only after the previous request status becomes "rejected"
3. Maintain a new request as a separate record (not modify the rejected one)
4. Assign the new request a fresh timestamp and unique identifier

WHEN a user resubmits an AdminRequest, THE system SHALL:
5. Require a new reason text (even if similar to previous submission)
6. Reset the request status to "pending"
7. Ignore the previous request’s rejection notes for future decisions

IF a user attempts to resubmit while a pending request exists, THE system SHALL reject the attempt.

### Manual Workflow Only

WHILE an AdminRequest has status "pending", THE system SHALL:
1. Not automatically change the request status without explicit human action
2. Not send automatic notifications beyond internal audit logging
3. Not permit expiration-based rejection or approval
4. Not trigger escalation workflows

THE system SHALL:
5. Allow only super administrators to view pending requests
6. Require human-initiated actions for every status transition
7. Preserve all request history including timestamps and approver identities
8. Maintain audit trail immutability—no automated cleanup or archival

IF a request remains pending for 90 days, THE system SHALL:
9. Retain the request in "pending" status with no automatic action
10. Continue to require manual super administrator intervention for resolution

IF an automated process attempts to modify a pending request, THE system SHALL reject the modification.

## AdminRole Rules

Admin roles have two grades: regular and super, assigned at approval time. Super administrators can promote regular administrators to super, and demote other super administrators (but not themselves). Demotion by a super admin requires explicit selection of the new grade. Regular administrators have no role management capabilities. Role assignments are tracked with timestamps and creator identifiers. An admin may hold only one role at a time; multiple concurrent roles are not permitted. Role changes do not affect existing admin permissions in progress; they apply to future actions. Roles are tied to user accounts and persist through account updates unless explicitly changed.

### Grade Hierarchy and Roles

### Admin Role Grades

THE system SHALL support exactly two grades for admin roles: "regular" and "super".

WHEN an admin request is approved, THE system SHALL assign a grade based on the approval decision.

A user SHALL hold only one active admin role at a time.

WHILE an admin role is active, THE system SHALL enforce grade-specific permissions:
- Regular admins can manage sellers, categories, products, orders, and users (banning/unbanning).
- Super admins can perform all regular admin actions AND manage other admin roles (promote/demote).

IF an admin role is demoted to "regular", THE system SHALL remove all role management capabilities.

### Super Admin Promotion Authority

### Promotion Authority Limitation

IF a user attempts to promote another user to "super" grade, THE system SHALL verify that the requesting user holds a "super" admin role.

WHEN a regular admin attempts to promote another user, THE system SHALL reject the request.

WHEN a super admin promotes another user, THE system SHALL:
1. Set the target user’s grade to "super"
2. Record the promotion timestamp and the promoting super admin’s user ID
3. Preserve the previous role state for audit purposes

### Self-Demotion Prevention

### Self-Demotion Constraint

THE system SHALL prevent a super admin from demoting themselves to "regular" grade.

WHEN a super admin submits a demotion request for themselves, THE system SHALL:
1. Reject the request with an error
2. Preserve their current "super" grade and permissions
3. Log the failed attempt for audit

IF a super admin attempts to demote another user, THE system SHALL allow the demotion and update the target user’s grade.

### Single Active Role Constraint

### Role Uniqueness Enforcement

WHEN a new admin role is created or updated for a user, THE system SHALL:
1. Deactivate any existing admin role for that user
2. Set the effective date of the new role
3. Ensure only one active admin role exists per user at any time

THE system SHALL reject any request that would result in a user holding multiple active admin roles.

WHEN an admin role is deleted, THE system SHALL mark the end timestamp and ensure no role remains active for that user.

### Time-Tracking of Role Assignments

### Assignment Timestamps and Auditability

WHEN an admin role is assigned, THE system SHALL record:
1. The exact timestamp of assignment
2. The user ID of the assigning super admin (if applicable)
3. The grade assigned and the previous grade (if any)

WHEN an admin role is changed (e.g., promotion/demotion/deactivation), THE system SHALL:
1. Archive the previous role with an end timestamp
2. Create a new role entry with a start timestamp
3. Preserve immutable history for dispute resolution

WHILE querying current admin role status, THE system SHALL use the most recent active role entry where the current datetime falls between start and end timestamps.

# Business Validation Criteria

Business-level validation expectations and data quality criteria.

## User Validation Criteria

Users must provide a unique email address among active accounts. Email addresses must follow standard email format and cannot be already registered or previously deleted. Passwords must meet minimum complexity (e.g., length and character variety). Users must select a role at registration—customer or seller—and cannot change it later without formal administrative action. Deleted user accounts cannot be re-registered with the same email until restoration by an administrator. Registration attempts are subject to rate limiting to prevent abuse. Account deletion by users preserves system integrity: orders, snapshots, and reviews remain intact.

### Email Uniqueness and Validation

WHEN a user registers, THE system SHALL ensure the email address is unique among active accounts.

IF the email address is already registered, THE system SHALL reject the registration request.

IF the email address was previously deleted, THE system SHALL reject the registration request unless restored by an administrator.

THE system SHALL validate the email format against standard email syntax requirements.

WHERE email format is invalid, THE system SHALL reject the registration request with an appropriate error message.

### Password Complexity Requirements

WHEN a user sets or changes their password, THE system SHALL enforce a minimum length of 12 characters.

THE system SHALL require the password to contain at least one uppercase letter, one lowercase letter, one numeric character, and one special character.

IF password complexity requirements are not met, THE system SHALL reject the request and specify the missing criteria.

WHERE a password has been compromised (per known breach databases), THE system SHALL reject the password with a security recommendation.

### Role Assignment Constraint

WHEN a user registers, THE system SHALL require selection of exactly one role: customer or seller.

THE system SHALL prevent users from changing their role after registration without administrative intervention.

WHERE a user attempts to modify their role directly, THE system SHALL reject the request and indicate role immutability.

THE system SHALL associate the user's role with their account profile, making it non-editable through standard user interfaces.

### Deleted Email Re-registration Policy

WHEN a user deletes their account, THE system SHALL preserve the email address as unavailable for re-registration.

IF a user attempts to register with a previously deleted email, THE system SHALL reject the request.

THE system SHALL allow administrators to restore deleted accounts, reactivating the original email address.

WHERE an email has been deleted for more than 90 days, THE system MAY allow re-registration with that email after administrator approval.

### Registration Rate Limiting

WHEN multiple registration attempts originate from the same IP address within a short timeframe, THE system SHALL implement rate limiting.

THE system SHALL reject registration requests exceeding the limit with a 'too many attempts' error.

THE system SHALL temporarily lock the IP address for registration attempts after repeated failures.

IF rate limiting is triggered, THE system SHALL log the event for security monitoring.

### User Account Deletion Impact

WHEN a user deletes their account, THE system SHALL remove all profile information (display name, phone number).

THE system SHALL preserve all order history and order snapshots for legal and seller record purposes.

WHERE a user has written reviews, THE system SHALL replace their name with 'deleted user' while preserving the review content.

THE system SHALL not delete inventory records, product snapshots, or other system-preserved data during account deletion.

### Non-Editable Role Field

WHEN a user account is created, THE system SHALL set the role field and prevent modification through user interfaces.

THE system SHALL enforce role field immutability at the business logic level.

IF any request attempts to modify the role field directly, THE system SHALL reject the request with an authorization error.

THE system SHALL allow role changes only through explicit administrative action with documented approval.

### Duplicate Account Prevention

WHEN any registration request is submitted, THE system SHALL perform a uniqueness check against all active and recently deleted accounts.

THE system SHALL prevent creation of duplicate accounts using the same email address.

WHERE duplicate account detection identifies a potential conflict, THE system SHALL halt registration and notify the user.

THE system SHALL maintain a permanent record of deleted email addresses to prevent immediate re-registration.

### Email Format Validation

WHEN a user enters an email address during registration or profile update, THE system SHALL validate against standard email format (RFC 5322).

IF the email format does not conform to standard syntax (e.g., missing '@', invalid domain), THE system SHALL reject the input.

THE system SHALL perform format validation before checking uniqueness to prevent invalid data storage.

## CustomerProfile Validation Criteria

Each customer profile must be linked to an active user account with role customer. Display name must be non-empty and avoid malicious content. Phone number must follow a recognized international format and be valid. A customer can have multiple addresses, but at least one must be marked as default shipping. Editing profile fields does not affect linked user account credentials. Profile updates are persisted only after successful validation of all fields. Multiple profiles per user are not allowed.

### Customer Profile Validation Requirements

### Customer Profile Uniqueness

THE system SHALL ensure each user account has at most one customer profile.
WHEN a user attempts to create a second customer profile, THE system SHALL reject the request.
WHEN a user attempts to register with a role of "customer" but already has an active seller profile, THE system SHALL reject registration.

### Display Name Non-Empty Requirement

WHEN a customer updates their display name, THE system SHALL require a non-empty string.
IF the display name is empty or contains only whitespace, THE system SHALL reject the update.

### Phone Number Format Validation

WHEN a customer updates their phone number, THE system SHALL validate that it follows E.164 international format.
IF the phone number does not conform to E.164 format, THE system SHALL reject the update.

### Default Shipping Address Requirement

WHEN a customer has multiple addresses, THE system SHALL require exactly one address to be marked as default shipping.
IF a customer deletes their default address without first designating a new default, THE system SHALL reject the deletion.
WHEN a customer adds their first address, THE system SHALL automatically mark it as default shipping.

### Profile-User Linkage

WHEN a customer profile is created, THE system SHALL link it to an existing user account with role "customer".
IF no matching user account exists, THE system SHALL reject profile creation.
WHEN the linked user account is deleted, THE system SHALL automatically delete the associated customer profile.

### Immutable User Credentials During Profile Update

WHEN a customer edits their profile (display name, phone number), THE system SHALL ensure the linked user credentials (email, password) remain unchanged.
IF a profile update attempt modifies user credentials, THE system SHALL reject the request and log the incident.

### Single Profile Per Customer

WHILE a user account has an active role of "customer", THE system SHALL allow only one active customer profile.
IF a customer attempts to register again after deletion, THE system SHALL create a new profile with fresh identifiers.

### Malicious Content Filter for Display Name

WHEN a customer enters or updates their display name, THE system SHALL scan for malicious content including SQL injection attempts, XSS payloads, and profanity.
IF malicious content is detected, THE system SHALL reject the update and retain the previous display name.
WHEN a display name is flagged, THE system SHALL store a hash of the rejected value for security auditing purposes.

## SellerProfile Validation Criteria

Seller profiles require approval before becoming active, and approval status must be one of pending, approved, or rejected. Shop name must be unique across all sellers and cannot be empty. Shop description may be empty but must not contain prohibited content. Logo image must be provided during registration and can be updated later. Each seller profile links to exactly one user with role seller. Profile edits are tracked via snapshots; a new snapshot is created on each update. Sellers cannot delete their profile if pending orders, cancellations, or refunds exist.

### Seller Approval Status Values

WHEN a seller registers, THE system SHALL set the approval status to "pending".

WHEN an administrator approves a seller registration, THE system SHALL change the approval status to "approved".

WHEN an administrator rejects a seller registration, THE system SHALL change the approval status to "rejected" and store the rejection reason.

WHILE the approval status is "pending", THE system SHALL prevent the seller from listing products.

WHILE the approval status is "rejected", THE system SHALL prevent the seller from logging in and listing products.

### Shop Name Uniqueness Constraint

WHEN a seller submits a shop name, THE system SHALL ensure the shop name is unique across all active seller profiles.

THE system SHALL reject the registration or edit request when the shop name already exists.

THE system SHALL allow a previously rejected shop name to be reused after the original owner's account is fully deleted.

THE system SHALL treat shop name comparisons case-insensitively for uniqueness checks.

### Prohibited Content in Shop Description

WHEN a seller updates the shop description, THE system SHALL validate that it does not contain prohibited content.

PROHIBITED content includes:
1. Hate speech or discriminatory language
2. Explicit sexual content
3. Illegal activity promotion
4. Threats or incitement to violence
5. Impersonation of other entities

IF prohibited content is detected, THE system SHALL reject the update request and provide a clear error message.

### Logo Image Requirement

WHEN a seller registers, THE system SHALL require a logo image.

THE system SHALL accept common image formats (JPEG, PNG, GIF) with maximum file size of 5MB.

WHEN a seller updates their logo, THE system SHALL require a new image if the current one is missing.

THE system SHALL maintain a default placeholder image if no logo has been uploaded.

WHEN a seller deletes their logo, THE system SHALL replace it with the default placeholder image.

### Profile-User Linkage

WHEN a seller registers, THE system SHALL create exactly one seller profile linked to the user with role "seller".

THE system SHALL prevent a user with role "customer" from creating a seller profile.

WHEN a seller deletes their account, THE system SHALL also delete the associated seller profile.

THE system SHALL ensure that each user has at most one seller profile.

### Snapshot Creation on Edit

WHEN a seller edits their shop name, description, or logo, THE system SHALL create a new seller profile snapshot.

THE snapshot SHALL record:
1. Timestamp of the change
2. Previous values of all editable fields (shop name, description, logo URL)
3. User ID who performed the edit

THE snapshot SHALL be immutable and persist even if the profile is later deleted.

 Sellers can view their own profile snapshots; administrators can view all snapshots.

### Profile Deletion Business Gate

THE system SHALL prevent a seller from deleting their account if any of the following exist:
1. Pending orders with status "paid" or "shipped"
2. Pending cancellation requests
3. Pending refund requests

WHEN all pending items are resolved, THE system SHALL allow the seller to delete their account.

WHEN the seller account is deleted, THE system SHALL:
1. Delete the seller profile and associated products
2. Preserve order history, snapshots, and shop name in past orders
3. Mark remaining active products as unavailable

THE system SHALL NOT delete the seller's inventory history records.

### Single Seller Profile Per User

THE system SHALL ensure that each user account can have at most one seller profile.

WHEN a user attempts to register as a seller while already having a seller profile, THE system SHALL reject the request.

WHEN a user changes their role from "seller" to another role, THE system SHALL delete the associated seller profile.

WHEN a seller profile is created, THE system SHALL verify no existing profile exists for that user.

## Address Validation Criteria

Each address must belong to a specific user and be assigned to a profile (customer or seller). Recipient name, street address, city, and country are required. State/province is optional but must be valid if provided. Postal code must match the expected format for the selected country. Only one address per user can be marked as default shipping. Deleting an address automatically deselects it as default if it was the default. Addresses cannot be shared across users.

### Address-User Linkage

WHEN an address is created, THE system SHALL require linkage to a specific user and assign it to that user's profile (customer or seller).

IF the user does not exist, THE system SHALL reject the request.

IF the profile ID does not belong to the specified user, THE system SHALL reject the request.

### Required Address Fields

WHEN an address is created or updated, THE system SHALL require the following fields: recipient name, street address, city, and country.

IF any of these fields are missing or empty, THE system SHALL reject the request.

WHERE recipient name and street address are required, THE system SHALL reject the request if they contain only whitespace.

### Default Shipping Address Uniqueness

WHEN an address is saved, THE system SHALL ensure only one address per user can be marked as the default shipping address.

IF a new address is designated as default while another address for the same user is already marked as default, THE system SHALL automatically deselect the previous default address.

### Country-Specific Postal Code Format

WHERE postal code is provided, THE system SHALL validate it against country-specific format rules.

WHEN a user selects a country, THE system SHALL apply the appropriate postal code format for that country.

IF the postal code does not match the expected format for the selected country, THE system SHALL reject the request.

### Optional State/Province Validation

WHEN state/province is provided, THE system SHALL validate that it is a recognized administrative division for the selected country.

WHERE state/province is omitted, THE system SHALL allow the address to be saved without it.

IF an invalid state/province value is provided, THE system SHALL reject the request.

### Non-Shareable Addresses

WHEN an address is created, THE system SHALL ensure it is assigned to exactly one user and cannot be shared across users.

IF an attempt is made to assign an existing address to multiple users, THE system SHALL reject the request.

### Default Address Auto-Deselection on Delete

WHEN a user deletes an address that is currently marked as their default shipping address, THE system SHALL automatically deselect it as default.

IF multiple addresses exist for the user, THE system SHALL not automatically promote another address to default.

WHERE no address exists after deletion, THE user's default shipping address field SHALL be set to null.

## Category Validation Criteria

Categories must have a non-empty, unique name within the same parent. Descriptions may be empty but should avoid prohibited content. Parent category must be either null (top-level) or another existing category—no loops allowed. Only administrators can create, edit, or delete categories. A category with active products cannot be deleted unless those products are reassigned to another category. Categories support exactly one level of nesting (parent-child only). Subcategory names must be unique under the same parent.

### Category Name Requirements

### Category Name Uniqueness

WHEN an administrator creates or edits a category, THE system SHALL:
1. Require the category name to be non-empty
2. Ensure the category name is unique among all categories that share the same parent
3. Allow top-level categories (where parentId is null) to have names unique among all top-level categories
4. Reject the request if a category with the same name and same parent already exists

IF the category name is empty, THE system SHALL reject the request.
IF a category with the same name under the same parent already exists, THE system SHALL reject the request.

### Category Parent Validation

WHEN an administrator creates or edits a category, THE system SHALL:
1. Validate that the parent category is either null (for top-level) or an existing category ID
2. Prevent the creation of cyclic parent-child relationships (no nesting loops)
3. Ensure the selected parent is not the category being edited itself

IF the parent category ID does not exist, THE system SHALL reject the request.
IF assigning the parent would create a cycle (e.g., A becomes child of B while B is child of A), THE system SHALL reject the request.


### Category Management Authorization

### Administrator-Only Category Management

WHEN any user attempts to create, edit, or delete a category, THE system SHALL:
1. Verify the user has the 'admin' role
2. Reject the request immediately if the user lacks administrative privileges

IF a non-administrator attempts to manage categories, THE system SHALL reject the request.

### Category Deletion Protection

WHEN an administrator requests to delete a category, THE system SHALL:
1. Check if any products are currently assigned to that category
2. Prevent deletion if any active products exist in that category
3. Require reassignment of products to another category before deletion

IF the category has active products assigned to it, THE system SHALL reject the request.


### Single-Level Nesting Constraint

### One-Level Nesting Rule

WHEN an administrator creates or edits a category, THE system SHALL:
1. Enforce exactly one level of nesting (parent → child only)
2. Prevent deeper hierarchies (e.g., child → grandchild)
3. Set the new child category's parent to the selected category

IF a category with an existing child is selected as a parent for another category, THE system SHALL reject the request.

### Subcategory Name Uniqueness Enforcement

WHEN an administrator creates or edits a subcategory, THE system SHALL:
1. Ensure the subcategory name is unique among all other subcategories of the same parent
2. Allow identical names only if the parents differ

IF a subcategory with the same name under the same parent already exists, THE system SHALL reject the request.


## Product Validation Criteria

Products must be associated with a seller and a valid category (including subcategories). Product name must be non-empty. Description must be non-empty and avoid prohibited content. Base price must be positive and valid currency amount. A product must have at least one variant to be purchasable. Deleting a product is only allowed if no order items exist in paid or shipped status for any of its variants. Sellers can only edit or delete their own products. Products with no variants remain visible but marked as unavailable.

### Product-Seller and Category Linkage

WHEN a product is created, THE system SHALL:
1. Require the seller ID to match an approved seller account
2. Require the category ID to exist and belong to a valid category hierarchy (one level of nesting only)
3. Reject the request if the seller's account is suspended or not approved
4. Reject the request if the category has been deleted or does not exist

A product cannot exist without a valid seller and category association.

### Required Product Name and Description

WHEN a product is created or edited, THE system SHALL:
1. Require a non-empty product name
2. Require a non-empty product description
3. Reject the request if the name is blank or contains only whitespace
4. Reject the request if the description is blank or contains only whitespace

THE system SHALL reject any attempt to save a product with an empty or whitespace-only name or description.

### Positive Base Price Validation

WHEN a product is created or edited, THE system SHALL:
1. Require a base price greater than zero
2. Reject the request if the base price is zero, negative, or null
3. Validate the price format conforms to standard currency representation

WHILE a product has a base price of zero or less, THE system SHALL treat the product as invalid for purchase.

### At-Least-One-Variant Requirement

WHEN a product is created or saved, THE system SHALL:
1. Require at least one variant to exist for the product
2. Ensure all variants have unique SKU codes across the platform
3. Reject the request if no variants are provided during product creation
4. Reject the request if all variants are deleted in an edit operation

WHEN a product has no valid variants, THE system SHALL:
1. Display the product as "unavailable"
2. Prevent the product from being added to cart
3. Show clear messaging that no variants are currently available

A product with no variants may still appear in search results but cannot be purchased.

### Product Deletion Order-Status Gate

WHEN a seller attempts to delete a product, THE system SHALL:
1. Check for any order items associated with the product that have status "paid" or "shipped"
2. Check for any pending cancellation or refund requests for variants of the product
3. Reject the deletion if any such items or requests exist
4. Allow deletion only if all related order items have status "cancelled", "refunded", or "delivered"

WHEN deletion is rejected due to existing orders, THE system SHALL return the IDs of conflicting order items.

### Seller-Only Edit/Delete Rights

WHEN a user attempts to edit or delete a product, THE system SHALL:
1. Verify that the user is the owner of the product (i.e., their seller account created the product)
2. Verify that the seller's account is active (not suspended or rejected)
3. Reject the operation if the user is not the seller owner
4. Reject the operation if the seller's account is suspended

THE system SHALL reject any edit or delete attempt by users who are not the owner seller, regardless of other permissions.

### Unavailable Status for Variant-Less Products

WHEN a product has zero valid variants, THE system SHALL:
1. Display the product in search results and category listings as "unavailable"
2. Show clear messaging that no variants are currently available
3. Prevent the product from appearing in "in-stock only" filtered results
4. Allow viewing of the product detail page with appropriate unavailable status

WHEN a customer tries to view a product with no variants, THE system SHALL:
1. Show the product name and description
2. Indicate clearly that no variants are available for purchase
3. Disable the "Add to Cart" functionality
4. Preserve historical snapshots even after deletion

## ProductImage Validation Criteria

Each image must be linked to a valid product and belong to the same seller who owns the product. Image URL must be a valid, accessible path. Sort order must be a non-negative integer and unique within the product’s image set. Removing an image does not affect product deletion eligibility unless the last image remains. The first image in sort order becomes the main thumbnail for listings. Images must be uploaded and stored as allowed by file validation rules.

### Image-Product Linkage

WHEN a ProductImage is created or updated, THE system SHALL ensure the image is associated with an existing product.

THE system SHALL verify that the product belongs to the seller who owns the image.

WHEN a product is deleted, THE system SHALL automatically delete all associated ProductImages.

IF the referenced product does not exist, THE system SHALL reject the image creation or update request.

IF the product does not belong to the seller attempting to manage the image, THE system SHALL reject the request.

### Valid Image URL Format

WHEN a ProductImage is uploaded, THE system SHALL validate that the image URL is a non-empty, well-formed absolute URL or valid cloud storage path.

THE system SHALL reject images with malformed, empty, or inaccessible URLs.

IF the URL scheme is not supported (e.g., only http, https, or secure CDN paths allowed), THE system SHALL reject the request.

THE system SHALL ensure that the image URL points to an actual image file (e.g., PNG, JPEG, WebP) and not to a document or executable.

### Unique Sort Order Per Product

WHEN a ProductImage is added or reordered, THE system SHALL ensure the sortOrder is unique among all images for that product.

WHEN a sort order change is requested, THE system SHALL check for duplicates across the product’s existing images.

IF a duplicate sortOrder value is detected for the same product, THE system SHALL reject the request and indicate the conflict.

THE system SHALL automatically renumber remaining sortOrder values to maintain integrity when an image is deleted.

### First Image as Thumbnail

WHEN a product’s images are managed, THE system SHALL designate the image with sortOrder = 0 as the main thumbnail.

THE system SHALL use this main image in product listing previews, search results, and category browsing.

IF the main image is deleted, THE system SHALL promote the next lowest sortOrder image as the new thumbnail.

WHEN an image’s sortOrder is updated to 0, THE system SHALL immediately update the designated main thumbnail.

### Non-Negative Sort Order Requirement

WHEN a ProductImage is created or updated, THE system SHALL enforce that sortOrder is a non-negative integer (≥ 0).

THE system SHALL reject any request with a negative sortOrder value.

WHEN multiple images are uploaded or reordered, THE system SHALL validate that all sortOrder values remain ≥ 0.

IF a sortOrder value exceeds system-defined maximum (e.g., 1000), THE system SHALL reject the request.

### Seller Ownership Enforcement

WHEN a seller attempts to upload, edit, or delete a ProductImage, THE system SHALL confirm the image belongs to a product owned by that seller.

IF the product linked to the image does not belong to the acting seller, THE system SHALL reject the operation.

WHEN a seller deletes their account, THE system SHALL delete all images associated with their products.

Admins and super admins MAY manage images for any product, but regular customers and other sellers MUST NOT access or modify non-owned images.

### Image Deletion Business Rule

WHEN a ProductImage is deleted, THE system SHALL allow deletion unless it is the last remaining image for the product.

WHEN deletion would leave a product with zero images, THE system SHALL reject the request unless the product is also being deleted.

WHEN an image is deleted, THE system SHALL update the product’s image list, reassign sortOrder values if necessary, and ensure the main thumbnail remains valid.

Deleting an image does NOT affect the product’s eligibility for deletion (e.g., pending orders, variants).

## ProductVariant Validation Criteria

Each variant must belong to a single product with valid options in JSON format (e.g., {color: 'Red', size: 'Large'}). SKU code must be unique across the entire platform. Option values must be complete and match the product’s defined options. Stock quantity must be a non-negative integer starting at zero. A product’s base price applies unless variant price overrides it. Deleting a variant is only allowed if no order items exist in paid or shipped status for that variant. Sellers can only edit variants of their own products.

### Variant-Product Linkage

WHEN a product variant is created or edited, THE system SHALL require the variant to be associated with a valid, existing product owned by the same seller.

IF the product does not exist, THE system SHALL reject the request.

IF the product does not belong to the submitting seller, THE system SHALL reject the request.

WHILE a variant exists, THE system SHALL ensure its parent product remains present and unaltered in its core identity (name, description, base price, category).

### Global SKU Uniqueness

THE system SHALL enforce uniqueness of SKU codes across all variants on the platform.

WHEN a seller creates or edits a variant, THE system SHALL reject the request if the SKU code already exists on any product on the platform.

IF duplicate SKU detection fails due to race conditions, THE system SHALL roll back the operation and report the conflict.

SKU uniqueness applies regardless of product ownership, category, or variant options.

### Complete Option Values in JSON

WHEN a product variant is created or edited, THE system SHALL require optionValues to be a complete JSON object containing all defined options for the parent product.

IF optionValues is missing required options present in the product definition, THE system SHALL reject the request.

IF optionValues includes extra options not defined by the product, THE system SHALL reject the request.

Option values must be strings, non-empty, and match the allowed values defined for the product.

### Non-Negative Stock Quantity

WHEN a product variant is created, THE system SHALL initialize stockQuantity to zero or higher.

WHEN a seller restocks or adjusts inventory, THE system SHALL require the resulting stockQuantity to be greater than or equal to zero.

IF inventory adjustment would result in negative stockQuantity, THE system SHALL reject the request and preserve existing stock levels.

### Variant Price Override

WHEN a product variant is created or edited, THE system SHALL allow an optional priceOverride.

IF priceOverride is provided, THE system SHALL use it as the variant’s sale price.

IF priceOverride is omitted, THE system SHALL use the parent product’s basePrice as the variant’s sale price.

THE system SHALL NOT accept negative or null price values for priceOverride.

### Variant Deletion Order-Status Gate

WHEN a seller attempts to delete a variant, THE system SHALL check for pending order items with status 'paid' or 'shipped'.

IF any such order items exist for the variant, THE system SHALL reject the deletion request and report the conflicting order item IDs.

IF no pending order items exist, THE system SHALL allow deletion, removing all variant-related inventory records.

IF deletion fails due to external constraints (e.g., database constraints), THE system SHALL roll back and return a descriptive error.

### Seller-Only Variant Edit Rights

WHEN a variant edit is requested, THE system SHALL verify the seller owns the parent product.

IF the requesting seller is not the owner of the parent product, THE system SHALL reject the request.

Seller edits include: SKU code, optionValues, priceOverride, and stockQuantity adjustments via inventory records.

Sellers cannot edit variants for products they do not own, including via bulk operations.

### JSON Option Structure Validation

WHEN a variant is created or edited, THE system SHALL validate the structure of optionValues as a JSON object.

Each key in optionValues MUST correspond to a valid option name defined for the product.

Each value in optionValues MUST be a non-empty string.

IF the optionValues structure is malformed, non-JSON, or contains invalid types, THE system SHALL reject the request with structure-specific validation details.

## ProductSnapshot Validation Criteria

Snapshots are created automatically on every product edit or deletion. Each snapshot captures the product’s state at the time: name, description, category, base price, and image list. Seller ID, product ID, and category ID must be valid at the time of snapshot creation. Snapshot timestamps are immutable and cannot be altered. Snapshots preserve images with their sort order and image URLs. Snapshots support full auditability and cannot be deleted by any user. A snapshot must include all variant IDs (not the variants themselves) at time of capture.

### Snapshot-on-Edit Requirement

WHEN a seller edits a product, THE system SHALL automatically create a ProductSnapshot.

WHEN a seller deletes a product, THE system SHALL automatically create a ProductSnapshot.

WHEN an order is placed, THE system SHALL automatically create a ProductSnapshot for each unique product variant in the order.

WHERE a snapshot is created for an edit, the snapshotType field SHALL be 'edit'.

WHERE a snapshot is created during order placement, the snapshotType field SHALL be 'order'.

### Immutable Timestamp

WHEN a ProductSnapshot is created, THE system SHALL record the createdAt timestamp at the moment of creation.

THE system SHALL NOT allow any user or process to modify the createdAt timestamp after snapshot creation.

THE system SHALL preserve the exact moment of snapshot creation, including microseconds, in the createdAt field.

### Product ID Snapshot Linkage

WHEN a ProductSnapshot is created, THE system SHALL require a valid productId.

THE system SHALL prevent creation of a ProductSnapshot if the referenced product does not exist at the time of snapshot creation.

Every ProductSnapshot SHALL maintain a reference to its original productId, regardless of whether the product is later deleted.

### Category ID Snapshot Linkage

WHEN a ProductSnapshot is created, THE system SHALL require a valid categoryId.

THE system SHALL preserve the categoryId that was assigned to the product at the time of snapshot creation.

THE system SHALL NOT update the categoryId in a snapshot even if the product’s category is later changed or the category is deleted.

### Image List Preservation

WHEN a ProductSnapshot is created, THE system SHALL capture all ProductImages associated with the product at that time.

THE system SHALL preserve the sortOrder and imageUrl for each image in the snapshot.

THE system SHALL preserve the isMain designation for each image.

THE system SHALL preserve the complete order of images as configured at snapshot time.

### Variant ID Snapshot Linkage

WHEN a ProductSnapshot is created, THE system SHALL capture all ProductVariants associated with the product at that time.

Each ProductSnapshotVariant SHALL reference the original ProductVariant’s id.

THE system SHALL NOT preserve variant data in snapshots — only variant IDs.

THE system SHALL preserve the complete variant list, including variants that were later deleted from the product.

### Non-Deletable Snapshot

THE system SHALL prohibit deletion of any ProductSnapshot by any user, including administrators.

THE system SHALL prevent deletion of a ProductSnapshot even if the referenced product is deleted.

THE system SHALL prevent deletion of a ProductSnapshot even if the referenced seller is deleted.

### Full Audit Trail Requirement

WHEN any change occurs to a product or during order placement, THE system SHALL create a complete ProductSnapshot including all variant IDs at that moment.

THE system SHALL preserve all snapshots indefinitely, regardless of user actions such as account deletion or product deletion.

Every ProductSnapshot SHALL be accessible to administrators and the original seller for dispute resolution and historical review.

## ProductSnapshotVariant Validation Criteria

Each product snapshot variant records the variant’s SKU code, option values, and price at the time of snapshot. Option values must match the format and completeness of the original variant. SKU code must match the variant’s SKU. Price can be null (indicating base price is used). This entity must be linked to a valid product snapshot and cannot exist independently. Snapshots of variants are immutable and preserve all variant state needed for order reconstruction.

### SKU Preservation in Snapshot Variant

WHEN a product snapshot variant is created, THE system SHALL preserve the exact SKU code from the original product variant at the time of snapshot.\n\nTHE system SHALL NOT allow the SKU code in a product snapshot variant to be modified after creation.\n\nIF a product variant is deleted, THE system SHALL preserve its SKU code in all associated product snapshot variants.\n\nWHEN an order item is created, THE system SHALL reference the product snapshot variant's SKU code to ensure product identity remains consistent even if the original variant was modified or deleted.

### Option Values Consistency

WHEN a product snapshot variant is created, THE system SHALL capture all option values from the original product variant in their complete JSON structure.\n\nTHE system SHALL preserve the exact structure and content of option values (e.g., {"color": "Red", "size": "Large"}) without transformation or interpretation.\n\nIF the original product variant has option values, THE system SHALL ensure the snapshot variant contains identical key-value pairs.\n\nWHEN a product snapshot variant is created, THE system SHALL NOT allow missing option values when the original variant had them defined.

### Nullable Price Handling

WHEN a product snapshot variant is created, THE system SHALL preserve the variant's priceOverride field, which may be null.\n\nIF priceOverride is null in the snapshot, THE system SHALL indicate that the base price of the original product should be used for price calculation.\n\nIF priceOverride is present, THE system SHALL store the exact price value from the variant at the time of snapshot.\n\nWHEN calculating order item prices, THE system SHALL use the stored priceOverride if present, otherwise the base price from the product snapshot.

### Product Snapshot Linkage

WHEN a product snapshot variant is created, THE system SHALL require linkage to an existing product snapshot.\n\nTHE system SHALL NOT allow a product snapshot variant to exist without being associated with a valid product snapshot.\n\nIF the referenced product snapshot is deleted, THE system SHALL cascade deletion to all associated product snapshot variants.\n\nWHEN querying product snapshots, THE system SHALL include all associated product snapshot variants.

### Immutable Snapshot Variant

WHEN a product snapshot variant is created, THE system SHALL enforce immutability — no modifications to any field are permitted after creation.\n\nTHE system SHALL reject all attempts to update the SKU code, option values, or priceOverride in a product snapshot variant.\n\nWHEN a new variant edit is made, THE system SHALL create a new product snapshot variant rather than updating existing ones.\n\nWHEN a dispute resolution is requested, THE system SHALL reference the immutable snapshot variant state as the authoritative record.

### Variant Price Snapshot Accuracy

WHEN a product snapshot variant is created, THE system SHALL capture the variant's price at the exact moment the snapshot was taken.\n\nTHE system SHALL preserve any price override that was active at the time of snapshot, including null values indicating base price usage.\n\nIF the original variant price changed after snapshot creation, THE system SHALL NOT update the snapshot variant price.\n\nWHEN reconstructing an order, THE system SHALL use the preserved price from the product snapshot variant for accurate billing.

### Complete Option Capture

WHEN a product snapshot variant is created, THE system SHALL capture all option definitions that were active in the original variant at snapshot time.\n\nTHE system SHALL ensure no option keys or values are omitted from the snapshot variant's option values structure.\n\nIF the original variant uses standard options (e.g., color, size), THE system SHALL ensure these are fully preserved in the snapshot.\n\nWHEN a product snapshot variant is used for dispute resolution, THE system SHALL ensure all option values match the customer's purchase configuration.

## InventoryRecord Validation Criteria

Each inventory record must link to a valid variant and specify a quantity change (positive for restock, negative for order/adjustment). Reason must be one of restock, order, adjustment, cancel, or refund. Timestamps must be in UTC and precise. Records must be immutable once created. Stock quantity is recalculated as the cumulative sum of all records. Negative current stock is not allowed; attempts to go negative are blocked. Sellers can add or subtract inventory only for their own variants.

### Valid Reason Enum

WHEN an inventory record is created, THE system SHALL require the reason to be one of: restock, order, adjustment, cancel, or refund.
IF the reason is not in this list, THE system SHALL reject the request.

### Positive or Negative Quantity Change

WHEN an inventory record is created, THE system SHALL require a non-zero integer quantity change.
FOR restock or refund, THE system SHALL accept only positive quantity change.
FOR order, adjustment, or cancel, THE system SHALL accept only negative or positive quantity change as appropriate.
IF quantity change is zero, THE system SHALL reject the request.

### Variant Linkage

WHEN an inventory record is created, THE system SHALL require a valid product variant ID.
IF the variant does not exist, THE system SHALL reject the request.
WHEN inventory records are created, THE system SHALL enforce linkage to the variant that exists at the time of the change.

### Non-negative Stock Enforcement

WHEN inventory records would cause a variant’s current stock to become negative, THE system SHALL reject the operation.
WHEN stock reaches zero, THE system SHALL mark the variant as out of stock and prevent further negative adjustments.
THE system SHALL not allow manual adjustments to bypass this enforcement.

### Seller-only Inventory Editing

WHEN a seller attempts to add or subtract inventory, THE system SHALL verify they own the product variant.
IF the seller does not own the variant, THE system SHALL reject the request.
ONLY sellers may directly modify inventory for their own variants; other users may not.

### Immutable Record Creation

WHEN an inventory record is created, THE system SHALL mark it as immutable and prevent deletion or modification.
WHEN system-generated inventory records are created (e.g., on order placement or cancellation), THE system SHALL not allow user override of the values.
All inventory history must be preserved forever.

### UTC Timestamp Requirement

WHEN an inventory record is created, THE system SHALL record the timestamp in UTC.
ALL timestamps shall use ISO 8601 format with timezone indicator.
IF a timestamp is missing, malformed, or not in UTC, THE system SHALL reject the request.

### Cumulative Stock Calculation

THE system SHALL calculate current stock quantity for each variant as the sum of all inventory records linked to that variant.
WHEN inventory records change, THE system SHALL recalculate and update the current stock atomically.
Stock calculation SHALL be consistent and repeatable regardless of record order.

## CartItem Validation Criteria

Each cart item must belong to a valid user and variant, with a quantity of at least 1. The same variant cannot appear multiple times in one cart; quantities are merged instead. Cart items must reference a variant that is in stock (not out of stock). If a variant becomes unavailable (deleted or out of stock), the cart item is marked as unavailable. Cart items are not locked for long periods and are cleared on checkout. Users cannot add variants from other sellers in a single cart action—each cart is user-specific.

### CartItem Validation Criteria

### Minimum Cart Item Quantity

WHEN a customer adds a product variant to their cart, THE system SHALL require a minimum quantity of 1.

IF the requested quantity is less than 1, THE system SHALL reject the request with a validation error.

### Variant Availability Check

WHEN a customer adds a variant to their cart, THE system SHALL verify the variant exists and is still available.

IF the variant has been deleted by the seller, THE system SHALL reject the request and mark the variant as unavailable.

IF the variant's stock quantity is 0 (out of stock), THE system SHALL reject the request and show the variant as unavailable.

### Quantity Merge on Duplicate Variant

WHEN a customer adds a variant that already exists in their cart, THE system SHALL merge the quantities instead of creating a new cart line.

THE system SHALL update the existing cart item's quantity to the sum of the existing quantity and the new addition.

### Unavailable Item Marking

WHILE a cart item's variant is out of stock or has been deleted, THE system SHALL mark the cart item as unavailable.

WHEN a cart item is unavailable, THE system SHALL NOT include it in checkout operations.

WHILE a cart item is unavailable, THE system SHALL display a warning to the customer indicating the item is no longer available.

### User-Specific Cart Isolation

WHILE retrieving a customer's cart, THE system SHALL return only items belonging to that specific user.

THE system SHALL prevent any user from viewing or modifying another user's cart items.

### Non-Cross-Seller Cart Limitation

WHEN a customer attempts to add a variant from a different seller to their existing cart, THE system SHALL reject the request.

THE system SHALL require the customer to clear their cart before adding items from a different seller.

### Out of Stock Blocking

IF a customer tries to add a variant with stock quantity of 0 to their cart, THE system SHALL block the addition.

WHILE viewing their cart, IF any item's variant becomes out of stock, THE system SHALL mark that item as unavailable and prevent it from being checked out.

IF a customer attempts to checkout with out of stock items, THE system SHALL reject the checkout and display available alternatives or removed items.

## WishlistItem Validation Criteria

Each wishlist item must link a user and a product (not a variant). A user cannot add the same product more than once to their wishlist. Wishlist items are automatically removed if the product is deleted by the seller. Wishlist does not enforce ordering or prioritization—only existence matters. A product in Wishlist is only visible to the owner. Wishlist items do not affect stock or ordering.

### Wishlist Item Creation

WHEN a customer adds a product to their wishlist, THE system SHALL:
1. Require the product to exist and be visible (not deleted by seller)
2. Ensure the product has at least one variant (unless explicitly unavailable)
3. Prevent duplicate entries for the same product-customer pair
4. Automatically set the creation timestamp

IF the product has been deleted by the seller, THE system SHALL reject the addition request.
IF the customer already has this product in their wishlist, THE system SHALL reject the duplicate addition request.

### Automatic Wishlist Cleanup

WHEN a product is deleted by its seller, THE system SHALL:
1. Automatically remove all wishlist items referencing the deleted product
2. Preserve the wishlist structure for remaining items
3. Ensure no dangling references remain in the wishlist

THE system SHALL NOT require manual intervention to clean up deleted product entries.

### User Privacy and Visibility

WHILE a customer views their wishlist, THE system SHALL:
1. Show only products added by that customer
2. Exclude products from other customers' wishlists
3. Not expose wishlist contents to sellers or other users

THE system SHALL NOT display wishlist contents to other users, including sellers of the listed products.

### Stock Independence

WHEN wishlist item quantities are displayed or managed, THE system SHALL:
1. Not affect inventory stock levels
2. Not prevent out-of-stock products from appearing in the wishlist
3. Allow wishlist items to remain after stock reaches zero

THE system SHALL NOT block wishlist actions due to stock unavailability.

### No Ordering or Priority Constraint

WHEN wishlist items are listed, THE system SHALL:
1. Show items in creation order (newest first)
2. Not enforce prioritization or sorting by any criteria other than creation time
3. Not require customers to set priority levels or order preferences

THE system SHALL NOT enforce required ordering fields or complex ranking mechanisms.

### User-Product Linkage Only

WHEN a wishlist item is created, THE system SHALL:
1. Require only user ID and product ID (not variant-specific)
2. Not require variant selection, quantity, or other attributes
3. Ensure each wishlist item links exactly one user to one product

IF variant information is included for display purposes only, THE system SHALL treat it as supplementary and not part of the core linkage constraint.

## Order Validation Criteria

Each order must belong to a valid customer and have a selected shipping address (either default or chosen during checkout). Total price must be calculated from order items and match the sum of their subtotals. Shipping address cannot be changed after order placement. An order cannot be created if the cart is empty or contains only unavailable items. The order creation timestamp is recorded in UTC and immutable. Order status is derived from its items and updates automatically.

### Order Validation Criteria

### Customer-Order Linkage

WHEN an order is created, THE system SHALL:
1. Link the order to exactly one customer
2. Require the customer to be an active (non-banned) account
3. Prevent order creation if the customer account has been deleted
4. Store the customer ID at order creation time

IF the customer ID is missing or invalid, THE system SHALL reject the order request.
IF the customer account has been banned, THE system SHALL reject the order request.

### Valid Shipping Address

WHEN an order is created, THE system SHALL:
1. Require a shipping address to be selected or default
2. Validate that the address belongs to the customer
3. Ensure the address has all required fields: recipient name, phone number, street address, city, state/province, postal code, and country
4. Prevent order creation if the selected address is deleted

IF the shipping address is not selected and no default address exists, THE system SHALL reject the order request.
IF the shipping address belongs to a different customer, THE system SHALL reject the order request.
IF any required address field is missing, THE system SHALL reject the order request.

### Total Price Consistency

WHEN an order is created, THE system SHALL:
1. Calculate the order total as the sum of all order item subtotals
2. Verify that each order item subtotal equals its variant price × quantity
3. Reject the order if calculated total does not match the stored total
4. Preserve the total price at order creation time

IF the sum of item subtotals differs from the stored total, THE system SHALL reject the order request.
IF any item subtotal calculation is incorrect, THE system SHALL reject the order request.

### Address Locked After Checkout

WHILE an order status is not "cancelled" or "refunded", THE system SHALL:
1. Prevent any changes to the shipping address
2. Treat any attempt to modify the address as a new order creation
3. Preserve the original shipping address in the order history

IF a shipping address modification is attempted after order placement, THE system SHALL reject the request.

### Empty Cart Rejection

WHEN a customer initiates checkout, THE system SHALL:
1. Verify the cart contains at least one available item
2. Reject checkout if the cart is empty
3. Reject checkout if all items are unavailable (deleted, out of stock, or removed)
4. Refresh cart availability status at checkout time

IF the cart is empty, THE system SHALL reject the checkout request.
IF all cart items are unavailable, THE system SHALL reject the checkout request.

### UTC Order Timestamp

WHEN an order is created, THE system SHALL:
1. Record the timestamp in UTC using ISO 8601 format
2. Preserve the timestamp as immutable data
3. Reject any request specifying a custom timestamp
4. Use the recorded timestamp for all time-based operations

IF the timestamp is missing or not in UTC format, THE system SHALL reject the order request.
IF the timestamp is adjusted by the customer or seller, THE system SHALL reject the request.

### Status Derived from Items

WHEN any order item status changes, THE system SHALL:
1. Evaluate all items in the order to determine the overall status
2. Set order status to "paid" when all items are paid
3. Set order status to "shipped" when any item is shipped and none are delivered
4. Set order status to "delivered" when all items are delivered
5. Set order status to "cancelled" when all items are cancelled
6. Set order status to "refunded" when all items are refunded
7. Set order status to "partially completed" for mixed states

IF an item status changes, THE system SHALL automatically update the order status within 5 seconds.
IF order status does not match its items, THE system SHALL flag the order for review.



## OrderItem Validation Criteria

Each order item must belong to a valid order and variant, with a quantity of at least 1. Product and variant IDs at the time of purchase are preserved in snapshot fields. Order item status must be one of paid, shipped, delivered, cancelled, or refunded. Status transitions follow strict rules: paid → shipped → delivered, or paid → cancelled. Item-level cancellation or refund does not affect other items in the same order. Snapshots of product, variant, and seller profile are preserved at creation time.

### Order-Item Linkage

WHEN an order item is created, THE system SHALL:
1. Require a valid order ID that exists in the system
2. Require a valid product ID associated with the order
3. Require a valid variant ID that belongs to the product
4. Require a valid seller ID associated with the product
5. Ensure the order item is never created without an order

IF the order does not exist, THE system SHALL reject the order item creation.
IF the variant does not belong to the product, THE system SHALL reject the order item creation.
IF the seller ID does not match the product's seller, THE system SHALL reject the order item creation.

### Variant Snapshot Preservation

WHEN an order item is created, THE system SHALL:
1. Capture and preserve the product name at that moment
2. Capture and preserve the variant SKU code and option values
3. Capture and preserve the variant price used for calculation
4. Store all preserved data in immutable snapshot fields
5. Maintain this snapshot regardless of future product or variant edits

WHILE a product or variant is edited after order placement, THE system SHALL:
1. Ignore the new values for existing order items
2. Preserve the original snapshot values unchanged

THE system SHALL ensure no manual edits are possible to order item snapshot data.

### Status Enum Constraints

WHEN an order item status is updated, THE system SHALL:
1. Accept only the following status values: paid, shipped, delivered, cancelled, refunded
2. Reject any status value not in this enumeration
3. Ensure the status field cannot be set to an empty or null value

WHILE an order item is created, THE system SHALL:
1. Assign the initial status as "paid" after successful payment
2. Reject status assignment attempts outside the allowed enumeration

THE system SHALL reject any operation attempting to store invalid status values.

### Status Transition Rules

WHEN an order item status changes, THE system SHALL:
1. Allow transition from paid to shipped only
2. Allow transition from shipped to delivered only
3. Allow transition from paid to cancelled only
4. Allow transition from shipped to cancelled only
5. Block any transition not in the defined sequence

WHILE an order item is cancelled or refunded, THE system SHALL:
1. Permit status to change directly to cancelled or refunded from paid
2. Permit status to change directly to cancelled or refunded from shipped
3. Block transitions from delivered back to paid, shipped, or cancelled
4. Block transitions from cancelled back to any other status

THE system SHALL reject any status transition that violates these rules.

### Item-Level Independent Status

WHEN one order item in an order changes status, THE system SHALL:
1. Allow other items in the same order to maintain their independent status
2. Permit item-level cancellation without affecting other items
3. Permit item-level refund without affecting other items
4. Reflect only the affected item's status in its own record

WHILE processing order-wide operations, THE system SHALL:
1. Calculate overall order status based on the collection of item statuses
2. Not enforce status changes across all items unless explicitly required

THE system SHALL maintain separate status tracking for each order item.

### Snapshot Preservation at Creation

WHEN an order item is created, THE system SHALL:
1. Capture and store snapshot of product name and description
2. Capture and store snapshot of variant SKU code and option values
3. Capture and store snapshot of variant price and stock quantity
4. Capture and store snapshot of seller profile information
5. Ensure all snapshots are immutable and time-stamped

WHILE the product or variant is edited after order placement, THE system SHALL:
1. Preserve the original snapshot without modification
2. Not reflect any future changes in the order item

THE system SHALL ensure order items retain historical fidelity regardless of downstream edits.

### Quantity Minimum of One

WHEN an order item is created, THE system SHALL:
1. Require quantity to be at least 1
2. Reject any order item with quantity less than 1
3. Reject updates that reduce quantity below 1

WHILE an order item is edited, THE system SHALL:
1. Validate quantity remains greater than or equal to 1
2. Prevent saving any order item with zero or negative quantity

IF a cart item quantity is edited to zero, THE system SHALL remove the item instead of creating a zero-quantity order item.

### Snapshot of Seller Profile in Item

WHEN an order item is created, THE system SHALL:
1. Capture and store seller's shop name at time of purchase
2. Capture and store seller's logo URL at time of purchase
3. Preserve seller profile data in the order item snapshot
4. Maintain this profile data regardless of seller profile edits

WHILE a seller's profile is edited after order placement, THE system SHALL:
1. Ignore all future profile updates for existing order items
2. Ensure order items retain original profile data exactly as captured

THE system SHALL ensure sellers' historical identity is preserved in order items.

## Shipment Validation Criteria

Each shipment must belong to an order and be linked to a seller (all items in the shipment must be from that seller). A shipment can contain multiple order items from the same seller. Tracking carrier and number are optional but required for tracking visibility. Once created, a shipment’s items cannot be changed. All items in a shipment share the same status and tracking information. Delivery confirmation per shipment automatically updates all items to delivered status.

### Shipment-Seller Linkage

WHEN a shipment is created, THE system SHALL require that all order items included in the shipment belong to the same seller.

THE system SHALL NOT allow creating a shipment that includes items from multiple sellers.

WHEN a shipment is created, THE system SHALL associate it with exactly one seller (the seller of all included order items).

THE system SHALL reject shipment creation requests if any included order item belongs to a different seller.

### Single-Seller Item Grouping

WHEN a seller prepares a shipment, THE system SHALL allow grouping one or more of their own order items into a single shipment.

THE system SHALL prevent mixing order items from different sellers in a single shipment.

IF an order contains items from multiple sellers, THE system SHALL require the seller to create separate shipments for each seller’s items.

Each shipment item must correspond to exactly one order item and one seller.

### Optional Tracking Fields

WHEN a shipment is created, THE system SHALL accept optional tracking information (carrier name and tracking number).

THE system SHALL allow shipment creation without tracking information.

WHEN tracking information is entered, THE system SHALL validate that the tracking number is present if the carrier name is provided, and vice versa.

THE system SHALL NOT require tracking information for shipment creation or status transition to 'shipped'.

### Immutable Item List After Creation

WHEN a shipment is created, THE system SHALL lock the list of included order items.

THE system SHALL NOT allow adding, removing, or replacing order items in an existing shipment.

IF a seller needs to adjust shipment contents, THE system SHALL require creation of a new shipment.

THE system SHALL reject any request to modify shipment items after confirmation.

### Shared Status Across Shipment Items

WHEN a shipment is created, THE system SHALL set all included order items to status 'shipped'.

WHEN a shipment’s status changes (e.g., due to delivery confirmation), THE system SHALL update the status of all included order items to match.

THE system SHALL enforce that all items in a shipment share the same status at all times.

THE system SHALL preserve historical status per shipment, even after individual item status updates.

### Delivery Confirmation Per Shipment

WHEN a customer confirms delivery for a shipment, THE system SHALL set all items in that shipment to status 'delivered'.

WHEN no delivery confirmation is received, THE system SHALL automatically set all items in the shipment to 'delivered' after 14 days from shipping.

THE system SHALL only allow delivery confirmation at shipment level—not per individual item.

THE system SHALL record the delivery confirmation timestamp per shipment for audit and SLA tracking.

### Carrier and Tracking Number Requirement for Visibility

WHEN tracking visibility is requested by a customer or seller, THE system SHALL require both carrier name and tracking number to be present.

THE system SHALL not display tracking information if either field is missing.

WHEN both fields are provided, THE system SHALL provide a clickable link or tracking portal reference to the carrier.

THE system SHALL consider a shipment 'trackable' only when both carrier name and tracking number are non-empty and valid.

## ShipmentItem Validation Criteria

Each shipment item must link a valid shipment and order item. Order item must belong to the same seller as the shipment and have status shipped when added. Shipment item creation triggers status change for the order item to shipped. Shipment items are immutable after creation and cannot be reassigned. Each shipment item records the time of shipment association.

### Shipment-Item Linkage Consistency

WHEN a shipment item is created, THE system SHALL: 1. Require a valid shipment ID and a valid order item ID, 2. Verify the order item belongs to the same seller as the shipment, 3. Ensure the order item is not already associated with another shipment item.

IF the shipment ID does not exist, THE system SHALL reject the request. IF the order item ID does not exist, THE system SHALL reject the request. IF the order item seller ID does not match the shipment seller ID, THE system SHALL reject the request. IF the order item is already linked to an existing shipment item, THE system SHALL reject the request.

### Order Item Shipment Eligibility

WHEN adding an order item to a shipment, THE system SHALL: 1. Verify the order item status is "paid" or "shipped", 2. Verify the order item belongs to the same seller as the shipment, 3. Prevent adding items from cancelled or refunded orders.

IF the order item status is not "paid" or "shipped", THE system SHALL reject the request. IF the order item belongs to a different seller than the shipment, THE system SHALL reject the request. IF the order item belongs to an order that is fully cancelled or fully refunded, THE system SHALL reject the request.

### Shipment Status Trigger

WHEN all order items in a shipment are added, THE system SHALL automatically update the shipment status to "shipped".

WHEN the last shipment item is removed from a shipment (e.g., during shipment cancellation), THE system SHALL update the shipment status to "pending".

IF the shipment becomes empty after removal, THE system SHALL still allow status to revert to "pending".

### Immutable Shipment Item Association

WHEN a shipment item is created, THE system SHALL record the association as immutable.

THE system SHALL NOT allow: 1. Changing the shipment ID or order item ID of an existing shipment item, 2. Deleting a shipment item without deleting the entire shipment, 3. Reassigning the same order item to a different shipment.

IF any attempt is made to modify shipment item linkage after creation, THE system SHALL reject the request with an error.

### Seller Consistency Requirement

WHEN a shipment item is created, THE system SHALL verify the seller ID of the shipment matches the seller ID of the linked order item.

WHEN a shipment is created, THE system SHALL require all items in the shipment to belong to the same seller.

IF an order item from a different seller is added to an existing shipment, THE system SHALL reject the request.

IF a shipment contains items from multiple sellers, THE system SHALL prevent shipment creation.

### Shipment Timestamp Requirement

WHEN a shipment item is created, THE system SHALL record the exact timestamp of association.

THE system SHALL store the timestamp in UTC and preserve it immutably.

The timestamp SHALL be used for audit purposes and SHALL NOT be editable by users or sellers.

## CancellationRequest Validation Criteria

Cancellation requests can only be created for order items with status paid. A reason text is required. Request owner (customer) and seller must match the order item’s owners. Request status must be pending until resolved. Sellers can only approve or reject requests for their own items. Approval triggers item cancellation and stock restoration. Rejecting preserves item status as paid.

### Status Prerequisite for Cancellation

WHEN a customer requests cancellation for an order item, THE system SHALL require the item status to be "paid".
IF the item status is "shipped", "delivered", "cancelled", or "refunded", THE system SHALL reject the cancellation request.

WHERE an item status is "paid", THE system SHALL allow the customer to initiate a cancellation request.

WHILE an order item status is "paid", THE system SHALL permit only one active cancellation request per item.

IF a cancellation request for the same item is already pending, THE system SHALL reject the new request.

### Required Cancellation Reason

WHEN a customer submits a cancellation request, THE system SHALL require a non-empty reason text.
IF the reason text is missing or contains only whitespace, THE system SHALL reject the request.

WHERE a cancellation request is submitted with a valid reason, THE system SHALL store the reason for audit purposes.

THE system SHALL NOT impose length limits on the reason text.

### Customer-Seller Ownership Match

WHEN a cancellation request is created, THE system SHALL ensure the requesting customer is the original buyer of the order item.
IF the requesting customer does not match the order item's customerId, THE system SHALL reject the request.

WHEN a cancellation request is created, THE system SHALL ensure the order item belongs to the seller referenced in the request.
IF the sellerId in the request does not match the order item's sellerId, THE system SHALL reject the request.

### Pending Status Enforcement

WHEN a cancellation request is submitted, THE system SHALL set its status to "pending".

WHILE a cancellation request status is "pending", THE system SHALL prevent any status change by non-seller parties.

IF a cancellation request has been approved or rejected, THE system SHALL NOT accept duplicate requests for the same order item until the existing request is cleared.

### Seller-Only Resolution Rights

WHEN a cancellation request needs resolution, ONLY the seller of the associated order item SHALL be permitted to approve or reject it.
IF a non-seller attempts to approve or reject a cancellation request, THE system SHALL reject the action.

WHERE a seller approves a cancellation request, THE system SHALL transition the associated order item status to "cancelled" and restore stock quantities.

WHERE a seller rejects a cancellation request, THE system SHALL preserve the order item status as "paid".

### Stock Restoration on Approval

WHEN a seller approves a cancellation request, THE system SHALL restore the quantity of the associated product variant via an inventory record.

THE inventory record created on approval SHALL include: negative quantity change (restoration), reason "cancel", and reference to the order item.

WHERE multiple cancellation requests exist for the same item, THE system SHALL apply stock restoration only for the first approved request.

### Status Preservation on Rejection

WHEN a seller rejects a cancellation request, THE system SHALL preserve the associated order item status as "paid".

THE system SHALL NOT modify inventory quantities when a cancellation request is rejected.

WHERE an order item has a rejected cancellation request, THE system SHALL permit the customer to submit a new request only after a new paid status is re-established (e.g., after a return and restock scenario).

## RefundRequest Validation Criteria

Refund requests can only be created for order items with status delivered, within 7 days of delivery. A reason text is required. Request owner (customer) and seller must match the order item’s owners. Request status must be pending until resolved. Sellers can only approve or reject requests for their own items. Approval triggers item refund and stock restoration. Delayed confirmation of delivery resets the 7-day window.

### Refund Request Eligibility - Post-Delivery Window

### Refund Request Eligibility - Post-Delivery Window

WHEN a customer initiates a refund request for an order item, THE system SHALL:
1. Verify that the order item status is 'delivered'
2. Calculate the elapsed time since the delivery confirmation (or auto-delivery date if not confirmed)
3. Reject the request if more than 7 calendar days have passed since delivery

IF the order item status is not 'delivered', THEN THE system SHALL reject the request.
IF the delivery occurred more than 7 days ago, THEN THE system SHALL reject the request with a clear indication of the expired window.

WHERE delivery confirmation was not manually provided by the customer, THE system SHALL consider the item delivered as of 14 days from the 'shipped' status timestamp.

### Required Refund Reason

### Required Refund Reason

WHEN a customer submits a refund request, THE system SHALL:
1. Require non-empty text content in the reason field
2. Reject the request if the reason is missing or consists only of whitespace
3. Truncate reasons exceeding reasonable length (e.g., 500 characters) before storage

IF the reason is empty or whitespace-only, THEN THE system SHALL reject the request.
IF the reason exceeds the maximum allowed length, THEN THE system SHALL reject the request.

### Customer-Seller Ownership Match

### Customer-Seller Ownership Match

WHEN a refund request is submitted, THE system SHALL:
1. Verify that the requesting customer ID matches the order item's customer ID
2. Verify that the target seller ID matches the order item's seller ID
3. Associate the request with the correct seller and order item owners

IF the requesting customer is not the original buyer of the item, THEN THE system SHALL reject the request.
IF the seller associated with the request does not match the order item's seller, THEN THE system SHALL reject the request.

### Pending Status Enforcement

### Pending Status Enforcement

WHEN a refund request is created, THE system SHALL:
1. Initialize the request status to 'pending'
2. Prevent direct status changes by customers or system automations
3. Only allow status transitions via explicit seller approval or rejection

WHILE a refund request status is 'pending', THE system SHALL:
1. Show the request as unresolved in both customer and seller dashboards
2. Block duplicate requests for the same order item
3. Preserve the request until resolution or until it is superseded by approval/rejection

IF a request status is not 'pending' when a resolution action is attempted, THEN THE system SHALL reject the action.

### Seller-Only Resolution Rights

### Seller-Only Resolution Rights

WHEN a seller attempts to resolve a refund request, THE system SHALL:
1. Verify the requesting user is the seller who owns the item in the order
2. Only accept 'approved' or 'rejected' status updates
3. Record a snapshot of the request state before the resolution

IF a customer, admin, or unauthorized party attempts to resolve the request, THEN THE system SHALL reject the action.
IF the seller attempts to approve or reject a request for an item they do not own, THEN THE system SHALL reject the request.

### Stock Restoration on Approval

### Stock Restoration on Approval

WHEN a seller approves a refund request, THE system SHALL:
1. Change the order item status to 'refunded'
2. Add a positive inventory record for the refunded quantity with reason 'refund'
3. Restore the stock quantity by the amount previously sold
4. Preserve an immutable record of the stock restoration

WHERE inventory records are created automatically, THE system SHALL:
1. Reference the refund request ID as the reason context
2. Maintain audit trail linking inventory adjustment to specific refund approval

IF the variant stock would exceed historical capacity after restoration, THE system SHALL still record the restoration for audit purposes.

### Delivery Confirmation Window Reset

### Delivery Confirmation Window Reset

WHEN a customer manually confirms delivery before the automatic 14-day window expires, THE system SHALL:
1. Update the delivery timestamp to the manual confirmation time
2. Reset the 7-day refund window to begin from the manual confirmation timestamp
3. Recalculate the expiration date for all related refund requests

WHERE a customer delays manual confirmation beyond 14 days, THE system SHALL:
1. Automatically mark the item as delivered at the 14-day timestamp
2. Use this timestamp as the base for the 7-day refund window
3. Ignore any later manual confirmation for window calculation purposes

IF a refund request is submitted after the calculated expiration date, THEN THE system SHALL reject it regardless of manual confirmation timing.

## Review Validation Criteria

Reviews can only be written after the associated order item’s status is delivered. Each review must link to a customer, product, and order item. Rating must be an integer between 1 and 5 stars. Text content is optional but must avoid prohibited content. Customers can write only one review per product per order. Reviews are visible on the product detail page. Editing a review creates a new snapshot; deletion does not remove snapshots.

### Post-Delivery Review Eligibility

WHEN a customer attempts to write a review, THE system SHALL verify that at least one order item for the product has status 'delivered'.

IF no related order item has status 'delivered', THE system SHALL reject the review submission.

WHILE the associated order item status is 'delivered' or better (e.g., automatically 'delivered' after 14 days), THE system SHALL permit the customer to write or edit a review.

### Rating Range Validation

WHEN a review is created or updated, THE system SHALL enforce that the rating is an integer between 1 and 5 inclusive.

IF the rating is outside the range 1–5, THE system SHALL reject the request.

THE system SHALL store the rating as an integer without fractional values.

### One Review Per Product Per Order

WHEN a customer submits a review for a product, THE system SHALL ensure the customer has not already submitted a review for that same product within the same order.

IF a review already exists for the customer–product–order combination, THE system SHALL reject the duplicate submission.

This rule applies only to non-deleted reviews; deleted reviews do not block new submissions.

### Optional Text Content

WHEN a review is created, THE system SHALL accept review submissions with or without text content.

IF text content is provided, THE system SHALL store it as-is.

IF text content is empty or omitted, THE system SHALL record the review as text-content-only (i.e., rating-only review).

### Non-Deletable Review Snapshots

WHEN a review is edited, THE system SHALL create a new review snapshot record with the previous rating and text content.

WHEN a review is deleted, THE system SHALL preserve all prior review snapshots and mark the current review as deleted.

THE system SHALL prevent deletion of review snapshots.

Review snapshots SHALL remain accessible to administrators and the original reviewer for audit purposes.

### Product Visibility and Review Display

WHEN a customer views a product detail page, THE system SHALL display all non-deleted reviews for that product.

Deleted reviews SHALL NOT appear in the review list, but their snapshots SHALL remain for historical audit.

THE system SHALL compute and display the product's average rating using only non-deleted reviews.

IF a product has no non-deleted reviews, THE system SHALL show zero reviews with a null average rating.

### Customer-Product-Order Linkage

WHEN a review is created, THE system SHALL require a valid link to a customer, a product, and one order item for that product.

THE system SHALL ensure the order item was purchased by the same customer submitting the review.

IF the order item does not belong to the customer, THE system SHALL reject the review submission.

### Prohibited Content Filter

WHEN a review is submitted, THE system SHALL scan text content for prohibited terms (e.g., obscenities, personally identifiable information, hate speech).

IF prohibited content is detected, THE system SHALL reject the submission and indicate which field contains the issue.

THE system SHALL store no explicit prohibited term content in any persistent data store.

Prohibited content detection SHALL be applied at submission and during review edits.

## ReviewSnapshot Validation Criteria

Each review snapshot captures rating and text content at the time of edit. Rating must be an integer between 1 and 5, or null if rating was removed. Text content is preserved as entered or null if cleared. Snapshots are immutable and linked to the review ID. Snapshot creation happens only on review edits—not on initial creation or deletion. Snapshots enable historical view of review changes for disputes.

### Rating Range Validation

### Review Snapshot Rating

WHEN a review snapshot is created, THE system SHALL:
1. Record the rating value at the time of review edit
2. Accept only integer values between 1 and 5 inclusive
3. Allow null values if the rating was removed during the edit
4. Reject any value outside the 1-5 range or non-integer types

IF the rating value is null, THE system SHALL allow the snapshot to be created as a valid state.
IF the rating value is not an integer, THE system SHALL reject the snapshot creation.
IF the rating value is less than 1 or greater than 5, THE system SHALL reject the snapshot creation.

### Text Content Preservation

### Review Snapshot Text Content

WHEN a review snapshot is created, THE system SHALL:
1. Preserve the exact text content as entered by the customer at the time of edit
2. Allow text content to be null if the customer cleared the text during the edit
3. Preserve special characters and formatting exactly as provided
4. Not modify or sanitize text content

IF the text content is null, THE system SHALL allow the snapshot to be created as a valid state.
IF the text content has been modified, THE system SHALL preserve both the previous and new values across snapshots.

### Immutable Snapshot Data

### Review Snapshot Immutability

WHEN a review snapshot is created, THE system SHALL:
1. Make the snapshot data immutable after creation
2. Prevent any modification to rating, text content, or timestamp
3. Allow no deletion of review snapshots under any circumstances
4. Preserve the snapshot permanently regardless of review deletion

THE system SHALL NOT allow updates to rating, text content, or timestamp after snapshot creation.
THE system SHALL NOT allow deletion of review snapshots even when the associated review is deleted.

### Edit-Triggered Snapshot Creation

### Review Snapshot Creation Logic

WHEN a customer edits an existing review, THE system SHALL:
1. Create a new review snapshot capturing the state before the edit
2. Include the rating and text content immediately before the edit
3. NOT create a snapshot when the review is initially created
4. NOT create a snapshot when the review is deleted

IF a review is created for the first time, THE system SHALL NOT create a snapshot.
IF a review is deleted, THE system SHALL NOT create a final snapshot.
IF a review is edited, THE system SHALL create exactly one snapshot before applying the edit.

### Review ID Linkage

### Review Snapshot Linkage

WHEN a review snapshot is created, THE system SHALL:
1. Link the snapshot to its associated review via review ID
2. Preserve the review ID permanently in the snapshot record
3. Allow snapshot retrieval by review ID
4. Maintain linkage even if the review is later deleted

THE system SHALL NOT allow review snapshots to exist without a valid review ID.
WHEN the associated review is deleted, THE system SHALL preserve the review ID in the snapshot.
IF a snapshot is requested by review ID, THE system SHALL return all snapshots for that review.

### Historical Dispute Support

### Historical Dispute Resolution

WHEN a dispute requires historical review data, THE system SHALL:
1. Provide access to all historical review snapshots for the product
2. Display the rating and text content as they existed at each edit point
3. Support chronological ordering of snapshots by creation time
4. Preserve evidence of rating changes and text modifications over time

THE system SHALL allow administrators to view all historical review snapshots during dispute resolution.
WHEN a dispute involves review changes, THE system SHALL provide complete audit trail of all snapshot states.

## AdminRequest Validation Criteria

Admin requests can only be submitted by users (customer or seller) who are not already administrators. A reason text is required. Status must be one of pending, approved, or rejected. Requests can be resolved only by super administrators. Rejected requests must include a rejection reason. Users can submit a new request after rejection. Approved users become regular administrators and gain admin privileges.

### Non-Admin Eligibility Requirement

WHEN a user submits an AdminRequest, THE system SHALL:
1. Verify the user does not currently hold any admin role (regular or super)
2. Reject the request if the user is already an administrator

IF the user already holds an admin role, THE system SHALL reject the request with a clear error message indicating the user is already an administrator.

### Required Reason Text

WHEN a user submits an AdminRequest, THE system SHALL:
1. Require a non-empty reason text field
2. Reject the request if the reason is empty or contains only whitespace

IF the reason is missing or invalid, THE system SHALL reject the request and indicate that a valid reason must be provided.

### Admin Status Enum

THE AdminRequest status SHALL be one of:
1. "pending" (initial state after submission)
2. "approved" (after super administrator approval)
3. "rejected" (after super administrator rejection)

WHEN a request is created, THE system SHALL set status to "pending".
THE system SHALL NOT allow status values outside the defined enum.

### Super-Admin-Only Resolution

WHEN a request status changes from "pending" to "approved" or "rejected", THE system SHALL:
1. Require the action to be performed by a user with super administrator grade
2. Reject the action if performed by a regular administrator or non-admin user

IF a regular administrator or non-admin user attempts to resolve a request, THE system SHALL reject the request and indicate that only super administrators may resolve admin requests.

### Rejection Reason Requirement

WHEN a super administrator rejects an AdminRequest, THE system SHALL:
1. Require a non-empty rejection reason text
2. Store the rejection reason alongside the request
3. Reject the action if the rejection reason is empty or whitespace-only

IF the rejection reason is missing or invalid, THE system SHALL reject the rejection attempt and indicate that a reason must be provided for rejection.

### New Request After Rejection

WHEN an AdminRequest has status "rejected", THE system SHALL:
1. Allow the original submitter to create a new AdminRequest
2. Permit resubmission only after the previous request is marked as rejected

IF a user attempts to submit a new request while a pending or approved request exists, THE system SHALL reject the new request and indicate that no duplicate or overlapping requests are allowed.

### Regular Admin Assignment on Approval

WHEN a super administrator approves an AdminRequest, THE system SHALL:
1. Create a new AdminRole record for the user with grade "regular"
2. Set the createdAt timestamp to the approval time
3. Assign the user as a regular administrator
4. Update the AdminRequest status to "approved"

IF an AdminRole already exists for the user, THE system SHALL reject the approval attempt and indicate that the user already has an admin role.

## AdminRole Validation Criteria

Admin roles must be linked to a valid user. Grade must be one of regular or super. Super administrators can promote regular administrators to super and demote others (except themselves). Each user can have only one active admin role. Demotion does not delete the role—only deactivates it. Super administrators can view all pending admin requests. An admin role is created only upon approval of an admin request.

### Admin Role Grade Enum

THE system SHALL restrict the grade of an admin role to exactly one of the following values: regular or super.

WHEN an admin role is created or updated, THE system SHALL reject the request IF the grade value is not one of the allowed enum values.

IF a super administrator attempts to assign a grade other than regular or super, THE system SHALL reject the request with a validation error.

### One Active Role Per User

WHEN a user is assigned a new admin role, THE system SHALL automatically deactivate any existing admin role for that user.

THE system SHALL ensure that at most one active admin role exists per user at any time.

IF a user already has an active admin role, THE system SHALL reject any new admin role assignment unless the existing role is first deactivated.

WHILE a user has no active admin role, THE system SHALL deny all admin-level access for that user.

### Super-Admin-Only Promotion and Demotion

WHEN an attempt is made to promote or demote an admin role grade, THE system SHALL permit the operation ONLY if the requesting user has an active super-admin grade role.

IF the requesting user does not have a super-admin grade role, THE system SHALL reject the promotion/demotion request with a permission error.

SUPER admins may promote a regular admin to super-admin and demote another super-admin to regular-admin.

A regular admin cannot perform any grade changes on other admin roles.

### Self-Demotion Prohibition

WHEN a super administrator attempts to demote their own role from super to regular, THE system SHALL reject the request.

THE system SHALL enforce self-demotion prohibition even if the user is the only super administrator in the system.

IF a super administrator tries to demote themselves, THE system SHALL return an error indicating self-demotion is not allowed.

### Non-Deletion on Demotion

WHEN a super administrator is demoted to regular, THE system SHALL retain the admin role record in the database with an inactive grade.

THE system SHALL NOT delete or archive the admin role upon demotion—only its grade value shall be updated to regular.

Demoted super administrators may retain all historical admin privileges and audit logs associated with the role.

### Role Creation from Request Approval

WHEN a super administrator approves an admin request, THE system SHALL create a new admin role with grade set to regular.

THE system SHALL NOT create an admin role unless the associated admin request has been explicitly approved.

WHEN the admin request is rejected, THE system SHALL NOT create any admin role for that user.

### Admin Role Visibility to Super Admins

WHEN a super administrator requests the list of all admin roles, THE system SHALL return all admin roles regardless of grade.

THE system SHALL include pending admin requests only visible to super administrators.

A regular administrator SHALL NOT be able to view admin roles or requests for other users.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Product Search and Listing Expectations

### Product Search Results

WHEN a customer searches products by name, THE system SHALL:
1. Return all matching products from all sellers
2. Include products regardless of seller approval status (pending sellers’ products visible)
3. Exclude deleted products
4. Include products with zero variants as "unavailable"

WHERE a search term is empty, THE system SHALL:
- Return no results unless combined with filters

### Category-Based Product Listing

WHEN a customer views a category page, THE system SHALL:
1. Show products assigned to that category
2. Include products in subcategories (one level of nesting only)
3. Exclude products from unrelated categories or suspended sellers

### Filtered Search Results

WHEN a customer applies filters, THE system SHALL:
1. Filter results by selected category (including subcategories)
2. Filter by minimum and maximum price range (inclusive)
3. Show only products with at least one in-stock variant when "in-stock only" is enabled
4. Exclude products from suspended sellers regardless of filter combination

### Search Result Sorting

WHEN a customer selects a sort option, THE system SHALL:
1. Sort by newest first (descending by product creation date)
2. Sort by price ascending (lowest to highest base or variant price)
3. Sort by price descending (highest to lowest base or variant price)
4. Maintain consistent tie-breaking (e.g., by name alphabetically) when sort values are equal

### Pagination Controls

WHILE browsing any list of products, THE system SHALL:
1. Limit list items to 20 per page (configurable page size)
2. Return total count of matching results
3. Support navigation via page number or cursor
4. Return empty list with count zero when no results match filters

### Cart Item Availability Check

WHEN a customer views products in search or category results, THE system SHALL:
1. Indicate stock status for each product’s variants
2. Show "Out of Stock" if no variants are in stock
3. Show variant-specific availability (e.g., "Red / Large - Out of Stock")

### Wishlist Listing

WHEN a customer views their wishlist, THE system SHALL:
1. List products (not variants) added to the wishlist
2. Exclude deleted products (automatically removed)
3. Paginate results with 20 items per page
4. Show stock status and whether the product has at least one purchasable variant


### Order, Product, and Review Browsing Expectations

### Order History Listing

WHEN a customer views their order history, THE system SHALL:
1. Show all orders placed by the customer
2. Sort by newest first (descending by order creation date)
3. Paginate with 20 orders per page
4. Include order summary: order number, date, total price, and overall status

### Seller Order Item List

WHEN a seller views their order items, THE system SHALL:
1. Show only order items for products they own
2. Include item details: product name, variant, customer, quantity, and status
3. Support filtering by order item status (paid, shipped, delivered, cancelled, refunded)
4. Paginate results with 20 items per page

### Seller Dashboard Summary

WHEN a seller opens their dashboard, THE system SHALL:
1. Show total products count (excluding deleted)
2. Show total order items count (for their products)
3. Show count of pending cancellation requests
4. Show count of pending refund requests
5. Exclude orders from suspended sellers if seller is suspended

### Customer Review Listing on Product Page

WHEN a customer views product reviews, THE system SHALL:
1. Show all non-deleted reviews for the product
2. Sort by newest first (descending by review creation date)
3. Show average rating (calculated from non-deleted reviews)
4. Show total review count
5. Mark reviews as from "deleted user" if reviewer account was deleted

### Seller Product Snapshots Listing

WHEN a seller views product snapshots, THE system SHALL:
1. Show only snapshots of products they own
2. Include snapshot type: 'edit', 'order', 'refund', 'cancel'
3. Sort by most recent first (descending by snapshot timestamp)
4. Allow filtering by snapshot type

### Admin Product Oversight

WHEN an admin views all products on the platform, THE system SHALL:
1. Show all products regardless of seller status
2. Include products from suspended sellers but mark them as hidden
3. Exclude deleted products unless explicitly requested
4. Allow filtering by seller, category, or approval status


### Inventory, Reviews, and Snapshots Browsing Expectations

### Inventory History Display

WHEN a seller views inventory history for a variant, THE system SHALL:
1. Show all inventory records for that variant
2. Include: quantity change, reason (restock|order|adjustment|cancel|refund), timestamp, and optional reference ID
3. Calculate and display current stock (sum of all records)
4. Sort by most recent first (descending by timestamp)

### Review Snapshot History

WHEN a customer views their review edit history, THE system SHALL:
1. Show all snapshots for reviews they authored
2. Include rating and text content at each snapshot time
3. Sort by most recent first (descending by snapshot timestamp)

### Seller Profile Snapshot History

WHEN a seller or admin views seller profile snapshots, THE system SHALL:
1. Show all profile snapshots (e.g., shop name, description, logo changes)
2. Include snapshot timestamp and changed fields
3. Sort by most recent first

### Product Variant Stock Status in List Views

WHEN displaying product lists, THE system SHALL:
1. For single-variant products: show single stock status (in stock, out of stock)
2. For multi-variant products: show availability status for each variant (in stock, some in stock, out of stock)
3. For products with zero variants: show "unavailable"

### Filtered Product Availability in Lists

IF a filter is applied that excludes currently unavailable items, THE system SHALL:
1. Hide products with no in-stock variants when "in-stock only" filter is active
2. Still include products with at least one variant in stock
3. Display current stock status for remaining variants in list view


# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### User Account Deletion Errors

WHEN a customer attempts to delete their account while having pending order items (status: paid or shipped), THE system SHALL reject the deletion request.

WHEN a seller attempts to delete their account while having pending order items (status: paid or shipped), THE system SHALL reject the deletion request.

WHEN a seller attempts to delete their account while having pending cancellation or refund requests, THE system SHALL reject the deletion request.

WHEN a seller attempts to delete their account with no pending items or requests, THE system SHALL proceed with account deletion.

WHILE a seller account is suspended, THE system SHALL reject any request to create or edit products.

### Product Management Errors

WHEN a seller attempts to delete a product that has pending order items (status: paid or shipped) for any variant, THE system SHALL reject the deletion request.

WHEN a seller attempts to delete a product that has pending cancellation or refund requests for any variant, THE system SHALL reject the deletion request.

WHEN a seller attempts to delete the last variant of a product, THE system SHALL mark the product as unavailable instead of deleting the variant.

WHEN a seller attempts to add a product without at least one variant, THE system SHALL reject the creation request.

WHEN a seller attempts to edit a product that has pending order items for any variant, THE system SHALL allow the edit but create a new product snapshot.

### Product Variant Errors

WHEN a seller attempts to delete a product variant that has pending order items (status: paid or shipped), THE system SHALL reject the deletion request.

WHEN a seller attempts to delete a product variant that has pending cancellation or refund requests, THE system SHALL reject the deletion request.

WHEN a seller attempts to create a product variant with a duplicate SKU code across all products, THE system SHALL reject the creation request.

WHEN a seller attempts to update a product variant to have negative stock quantity, THE system SHALL reject the update request.

### Cart and Wishlist Errors

WHEN a customer attempts to add a variant to their cart that is out of stock (stock quantity ≤ 0), THE system SHALL reject the addition and show a warning.

WHEN a customer attempts to add a variant to their cart that has been deleted by the seller, THE system SHALL reject the addition and show a warning.

WHEN a customer attempts to proceed to checkout with items in their cart that are unavailable (deleted, out of stock, or variant deleted), THE system SHALL exclude unavailable items from checkout and show warnings.

WHEN a customer adds a variant with quantity exceeding available stock, THE system SHALL cap the quantity at available stock and show a warning.

### Order and Shipment Errors

WHEN a customer attempts to place an order with an empty cart, THE system SHALL reject the checkout request.

WHEN a seller attempts to create a shipment with no order items, THE system SHALL reject the shipment creation request.

WHEN a customer attempts to request cancellation for an order item with status other than 'paid', THE system SHALL reject the cancellation request.

WHEN a customer attempts to request a refund for an order item more than 7 days after 'delivered' status, THE system SHALL reject the refund request.

WHEN a customer attempts to request a refund for an order item with status other than 'delivered', THE system SHALL reject the refund request.

### Review Errors

WHEN a customer attempts to submit a review for a product without having 'delivered' order items of that product, THE system SHALL reject the review submission request.

WHEN a customer attempts to submit multiple reviews for the same product in the same order, THE system SHALL reject the duplicate review request.

WHEN a customer attempts to submit a review with a rating outside 1-5 range, THE system SHALL reject the review submission request.

### Seller and Admin Approval Errors

WHEN a seller registration is rejected by an administrator, THE system SHALL require the seller to provide a reason for rejection before resubmitting.

WHEN an administrator attempts to reject a seller registration without providing a rejection reason, THE system SHALL reject the rejection request.

WHEN a user with role 'admin' attempts to request promotion to super administrator, THE system SHALL reject the request with a warning.

### Permission and Ownership Validation Errors

WHEN a user attempts to edit a product not owned by them, THE system SHALL reject the edit request.

WHEN a user attempts to delete an address that is set as default shipping for an existing order, THE system SHALL reject the deletion request.

WHEN a user attempts to view snapshots for products or orders they do not own, THE system SHALL reject the request unless the user has admin role.

WHEN a user attempts to view another user's private information (email, phone number), THE system SHALL reject the request.

### Financial and Inventory Failures

WHEN payment processing fails during checkout, THE system SHALL not create any order records and return the customer to the cart.

WHEN stock quantity falls below the required amount during checkout, THE system SHALL reject the order and update the cart with current stock levels.

WHEN inventory deduction results in negative stock quantity, THE system SHALL revert the transaction and raise a failure alert.

WHEN an inventory adjustment would cause stock quantity to go negative, THE system SHALL reject the adjustment request.

### Snapshot and Audit Trail Exceptions

WHEN a product with existing snapshots is deleted, THE system SHALL preserve all prior snapshots and not delete them.

WHEN a review is deleted, THE system SHALL preserve the review snapshot for audit purposes.

WHEN an attempt is made to modify an existing snapshot, THE system SHALL reject the modification request.

WHEN an attempt is made to delete inventory records, THE system SHALL reject the deletion request.

# Integration Error Handling

Error handling and retry policies for external integrations.

## Integration Failure Policies

Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

### Retry Policy for External Integration Calls

WHEN an external integration call (e.g., payment gateway, shipping carrier API) fails due to a transient error (e.g., timeout, network error), THE system SHALL automatically retry the call up to three times.

WHEN the retry limit is reached and all attempts fail, THE system SHALL log the final error and return an appropriate user-facing error message.

IF a call fails with a non-retryable error (e.g., authentication failure, invalid input), THE system SHALL NOT retry and shall immediately notify the user.

WHERE a retry delay is required, THE system SHALL use exponential backoff with a base delay of 500 milliseconds and a maximum delay of 10 seconds.

### Circuit Breaker Policy

WHEN consecutive failures from a specific external integration exceed five attempts within a 60-second window, THE system SHALL open the circuit breaker for that integration.

WHILE a circuit breaker is open for an integration, THE system SHALL NOT attempt any new calls to that integration and SHALL immediately return a service unavailable error to the user.

AFTER a waiting period of 120 seconds following circuit breaker opening, THE system SHALL allow one probe call to the integration.

IF the probe call succeeds, THE system SHALL close the circuit breaker and resume normal operation.

IF the probe call fails, THE system SHALL re-open the circuit breaker and restart the waiting period.

### Fallback Behavior for Critical Integrations

WHEN an external payment gateway is unavailable, THE system SHALL allow users to select an alternative payment method from those configured by the seller.

WHEN a shipping carrier API is unreachable, THE system SHALL allow sellers to proceed with manual tracking entry and continue order fulfillment.

WHEN inventory validation fails due to an external warehouse system timeout, THE system SHALL proceed with order creation but flag the order for manual review and hold it in 'pending inventory confirmation' status.

THE system SHALL always preserve the original error and integration state for audit and recovery purposes, even when fallback mechanisms are used.

### Error Escalation for Persistent Integration Failures

WHEN the circuit breaker remains open for more than 30 minutes without successful probe recovery, THE system SHALL escalate the incident to the platform operations team via alerting channel.

WHEN three or more different external integrations fail simultaneously within a 15-minute window, THE system SHALL escalate to the platform operations team as a systemic outage.

THE system SHALL include in escalation alerts: timestamp of first failure, affected integrations, current circuit state, and number of failed retries per integration.

WHEN integration recovery occurs after an escalation, THE system SHALL send a follow-up notification confirming restoration and summarizing the incident duration.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Upload Validation

WHEN a seller uploads a file, THE system SHALL:
1. Require all file uploads to originate from authenticated sellers
2. Accept only image files with MIME types: image/jpeg, image/png, image/gif
3. Reject files larger than 10MB
4. Ensure filenames contain only ASCII letters, digits, hyphens, underscores, and periods
5. Validate that uploaded content matches the declared MIME type

IF the file type is not permitted, THE system SHALL reject the request with an error.
IF the file size exceeds 10MB, THE system SHALL reject the request with an error.
IF the filename contains disallowed characters, THE system SHALL reject the request with an error.
IF the MIME type verification fails, THE system SHALL reject the request with an error.

### Virus Scanning Policy

WHEN any file is uploaded, THE system SHALL:
1. Automatically route all image files to a virus scanning service
2. Block file association with user profiles until scanning completes
3. Preserve the file temporarily in quarantine storage during scan
4. Only expose the file to users after successful scan clearance

IF the virus scan fails, THE system SHALL:
1. Delete the file permanently
2. Log the incident with user and file metadata
3. Reject the file association request with an error

IF the virus scan service is unavailable, THE system SHALL:
1. Temporarily quarantine the file
2. Notify administrators via internal ticketing
3. Allow pending actions (e.g., product creation) to proceed without the file
4. Attempt rescan every 30 minutes for up to 24 hours

### Content Validation Rules

WHEN a seller uploads a product logo or image, THE system SHALL:
1. Reject files with dimensions smaller than 100x100 pixels
2. Reject files with dimensions larger than 4000x4000 pixels
3. Reject files where EXIF orientation data indicates corruption
4. Reject files containing embedded scripts or executable code
5. Reject files exceeding 5MB for logos and 10MB for product images

IF image dimensions are invalid, THE system SHALL reject the request with an error.
IF embedded executable content is detected, THE system SHALL reject the request with an error.
IF file size limits are exceeded, THE system SHALL reject the request with an error.

### File Retention Policy

THE system SHALL retain uploaded files according to the following schedule:
1. Active product images and logos: retained indefinitely while associated with active products
2. Deleted product images and logos: retained for 90 days after removal
3. Suspended seller profile images: retained for 365 days after suspension
4. Rejected registration files: retained for 30 days after rejection
5. All files: permanently retained after administrator-initiated deletion for compliance purposes

WHEN a file reaches its retention threshold, THE system SHALL:
1. Automatically delete the file
2. Log the deletion event with timestamp and reason
3. Ensure no user can access the file after deletion

WHERE a file is part of an active order or investigation, THE system SHALL:
1. Extend retention until the order is delivered or investigation is closed
2. Notify the user if file deletion is delayed due to legal hold
3. Prevent user-initiated deletion during legal hold

# Job Failure Policies

Failure handling and dead-letter queue policies for background jobs.

## Job Failure and Recovery

Define failure handling, recovery procedures, and notification requirements for background jobs.

### Job Failure Identification

WHEN a background job does not complete within its expected timeframe, THE system SHALL record the failure time and reason.

IF a job fails due to a condition where retry would not succeed, THE system SHALL record that no further retry attempts will be made.

WHEN a job fails due to a condition where retry may succeed, THE system SHALL record the attempt count and retain job context.

THE system SHALL retain full failure records with job ID, reason, and history.

### Retry Policies

WHERE a job is eligible for retry, THE system SHALL attempt retry up to three times.

IF retry attempts are exhausted, THE system SHALL record that no further automatic retry will occur.

WHEN retry occurs for transient issues, THE system SHALL wait a defined interval (minimum 5 minutes) between attempts.

Administrators MAY request manual retry without waiting.

### Recovery Procedures

WHEN no further retry attempts are allowed, THE system SHALL retain full failure context for review.

WHERE manual recovery is requested, THE system SHALL allow restart from a defined point or full re-execution.

WHERE job recovery affects data, THE system SHALL verify data consistency before proceeding.

THE system SHALL record who performed recovery, when, and the outcome.

### Failure Notification

WHEN no further retry is allowed, THE system SHALL notify designated administrators.

WHEN retry attempts are exhausted, THE system SHALL notify senior administrators.

WHERE failure impacts customers, THE system SHALL notify stakeholders with description of impact.

THE system SHALL retain notification records for audit.