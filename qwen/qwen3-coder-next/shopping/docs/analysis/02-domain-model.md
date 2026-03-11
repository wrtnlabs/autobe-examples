**ecommerceMall — Business concepts, relationships, and states from user perspective**

Business concepts, relationships, and states from user perspective

# Domain Concepts

Describe what each concept means to users and why it exists.

## User Concept

A User represents an account holder who interacts with the platform as a customer, seller, or administrator. Every interaction begins with account registration and authentication using email and password. Users are assigned roles that determine their available features and permissions. A user can hold only one primary role at a time, though role changes are possible through administrative action. Once registered, users maintain a persistent identity across sessions, orders, and platform activity. Account deletion by users preserves certain data (like orders and reviews) to maintain business integrity and legal compliance.

### User Account

WHEN a user registers, THE system SHALL:
1. Require a unique email address
2. Require a password
3. Assign a default role of "customer"
4. Create an account with status "active"

WHEN a user logs in, THE system SHALL:
1. Authenticate using email and password
2. Create an authenticated session
3. Return the user's current role

WHEN a user logs out, THE system SHALL:
1. Terminate the current session
2. Invalidate the session token

IF the email is already registered, THE system SHALL reject the registration.
IF authentication fails, THE system SHALL reject the login request.

A user can only hold one primary role at a time.

### Role Assignment

WHEN a user registers, THE system SHALL assign role "customer" by default.

WHEN a seller completes registration, THE system SHALL set role to "seller" with approval status "pending".

WHEN an administrator approves a seller registration, THE system SHALL set the seller's role to "seller" and approval status to "approved".

WHEN a user submits an admin request and it is approved, THE system SHALL:
1. Assign role "admin" with grade "regular"
2. Preserve any existing customer or seller profile data

WHEN a super administrator promotes a regular administrator, THE system SHALL:
1. Upgrade the grade to "super"
2. Record the promotion timestamp

WHEN a super administrator demotes another super administrator, THE system SHALL:
1. Downgrade the grade to "regular"
2. Record the demotion timestamp
3. Prevent demotion of the user demoting (self-demotion prevention)

IF a user submits an admin request without being authenticated, THE system SHALL reject the request.

SUPER administrators have elevated privileges: they can promote/demote other admins, approve/reject seller registrations, suspend accounts, and delete any product.

### Authentication

WHEN a user changes their password, THE system SHALL:
1. Require current password for verification
2. Accept a new password
3. Invalidate all active sessions after successful change
4. Require re-authentication for all devices

WHEN a user attempts to log in after their account is banned, THE system SHALL:
1. Reject the login request
2. Return an appropriate error message

WHEN a seller's account is suspended, THE system SHALL:
1. Allow the seller to log in
2. Restrict access to product management features
3. Permit access to order processing features

WHEN an admin request is approved, THE system SHALL:
1. Grant admin privileges immediately
2. Update role hierarchy access

WHEN an admin request is rejected, THE system SHALL:
1. Notify the user of rejection
2. Preserve the original role
3. Allow resubmission of admin request

WHEN a user's account is deleted, THE system SHALL:
1. Invalidate all sessions
2. Preserve profile data for orders and reviews as required by retention policy
3. Change role to "deleted" logically but maintain technical references

THE system SHALL use secure session tokens with expiration.

### Customer/Seller/Admin Identity

WHEN a customer logs in, THE system SHALL:
1. Identify the user as a customer
2. Enable customer-specific features (shopping cart, wishlist, ordering)
3. Display the user's customer profile data (display name, phone)

WHEN a seller logs in, THE system SHALL:
1. Identify the user as a seller
2. Enable seller-specific features (product management, inventory, order fulfillment)
3. Display the user's seller profile data (shop name, logo)

WHEN an admin logs in, THE system SHALL:
1. Identify the user by their admin grade (regular or super)
2. Enable admin-specific features based on grade permissions
3. Display admin role and applicable management options

WHEN a user's role changes, THE system SHALL:
1. Update the displayed identity accordingly
2. Refresh accessible features based on new role
3. Maintain identity continuity for historical records

WHEN viewing a product page, THE system SHALL display seller identity (shop name and logo) as it existed at the time of the product listing, even after seller account updates.

### Account Lifecycle

WHEN a user account is created, THE system SHALL set status to "active".

WHEN a customer deletes their account, THE system SHALL:
1. Mark the account as "deleted"
2. Preserve profile information for order and review history
3. Hide profile from public view
4. Prevent login and session reuse

WHEN a seller is suspended by an administrator, THE system SHALL:
1. Set the seller's status to "suspended"
2. Hide their products from search and category listings
3. Prevent new product creation and editing
4. Allow continued access to order management and fulfillment
5. Permit pending order processing (shipping, cancellation/refund responses)

WHEN a seller is unsuspended, THE system SHALL:
1. Restore the seller's status to "active"
2. Make products visible again
3. Restore access to product management features

WHEN a customer or seller account is banned by an administrator, THE system SHALL:
1. Set status to "banned"
2. Prevent login for the user
3. Preserve all order and historical data
4. Maintain audit trail for compliance

WHEN a seller account is banned, THE system SHALL:
1. Set seller status to "banned"
2. Hide products from public view
3. Maintain order fulfillment records for existing orders
4. Allow order status tracking for customers

WHEN a seller's approval status changes to "rejected", THE system SHALL:
1. Set seller role status to "rejected"
2. Notify seller of rejection
3. Allow resubmission of registration request
4. Preserve rejection reason for future reference

WHEN a user revises their profile information, THE system SHALL create a snapshot of the previous state.

### Role-Based Access

WHEN a customer performs an action, THE system SHALL:
1. Allow access to shopping features (cart, wishlist, checkout)
2. Restrict product management capabilities
3. Permit viewing of other sellers' products and reviews
4. Allow viewing of own order history and profile

WHEN a seller performs an action, THE system SHALL:
1. Allow product creation, editing, and inventory management
2. Permit order fulfillment operations (shipping, tracking)
3. Allow viewing of their own customers' orders
4. Restrict access to other sellers' products
5. Permit viewing of their own shop analytics

WHEN a regular administrator performs an action, THE system SHALL:
1. Allow seller approval workflows
2. Permit product oversight and deletion
3. Allow order oversight and forced cancellation/refund
4. Permit user suspension/banning
5. Restrict access to super-admin functions

WHEN a super administrator performs an action, THE system SHALL:
1. Allow all regular administrator capabilities
2. Permit promotion and demotion of other administrators
3. Allow all system management functions
4. Restrict self-demotion capability

WHEN a user attempts an action beyond their role permissions, THE system SHALL reject the request and return an appropriate error message.

WHEN a seller profile is edited, THE system SHALL apply the changes to active listings but preserve previous states for order history fidelity.

### Profile Persistence

WHEN a user logs in across multiple sessions, THE system SHALL:
1. Retrieve and maintain profile data consistently
2. Preserve all profile attributes across sessions
3. Apply profile updates immediately to all active and future sessions

WHEN a user profile is updated, THE system SHALL:
1. Update the current profile state
2. Create a snapshot of the previous profile state
3. Preserve the snapshot for audit and dispute resolution
4. Maintain profile consistency in historical orders

WHEN viewing a seller's profile, THE system SHALL:
1. Display the most recent profile information
2. Show historical profile states in snapshots where relevant
3. Preserve the profile state at time of order for order history fidelity

WHEN a customer views their own profile, THE system SHALL:
1. Display current display name and phone number
2. Show all their shipping addresses
3. Allow profile editing functionality

WHEN a seller views their own profile, THE system SHALL:
1. Display current shop name, description, and logo
2. Show all their products and order statistics
3. Allow profile editing functionality

WHEN a customer profile is updated, THE system SHALL apply changes to future orders but preserve profile state at time of purchase in order records.

### Deletion Preservation

WHEN a customer deletes their account, THE system SHALL:
1. Delete the user profile information
2. Preserve all orders associated with the account
3. Preserve all reviews associated with the account
4. Replace the customer's display name in reviews with "deleted user"
5. Maintain all order snapshots for legal and business continuity
6. Prevent login and session reuse
7. Invalidate all addresses associated with the profile

WHEN a seller deletes their account, THE system SHALL:
1. Delete the seller profile information
2. Delete all products and variants from listings
3. Preserve all order records with product and variant snapshots
4. Preserve order snapshots including seller profile state at time of purchase
5. Allow order completion by sellers for existing orders before deletion
6. Enforce business rules: account can only be deleted if no pending orders or requests

WHEN a product is deleted by a seller, THE system SHALL:
1. Remove the product from all search and category listings
2. Delete all product variants and inventory records
3. Preserve product snapshots for order history fidelity
4. Maintain order items referencing the deleted product

WHEN a user account is banned by an administrator, THE system SHALL:
1. Preserve all historical data including orders and reviews
2. Prevent future login attempts
3. Maintain data for auditing and compliance
4. Allow order fulfillment for existing orders by sellers

WHEN a seller is suspended, THE system SHALL:
1. Preserve all products in database
2. Hide products from public view but retain references in order history
3. Maintain order fulfillment capability for existing orders
4. Allow order history access for both sellers and customers

WHEN a review is deleted by the author, THE system SHALL:
1. Mark the review as deleted
2. Preserve the review snapshot
3. Update the product's average rating calculation (excluding deleted reviews)
4. Maintain review history for audit purposes

WHEN a product snapshot is created, THE system SHALL:
1. Preserve all product fields at that moment
2. Include all variant states at that moment
3. Maintain the snapshot indefinitely
4. Prevent modification of the snapshot after creation

WHEN an order item is cancelled or refunded, THE system SHALL:
1. Restore inventory quantities via inventory records
2. Preserve the order item state in snapshots
3. Maintain snapshot fidelity for dispute resolution
4. Update order status appropriately

## CustomerProfile Concept

A CustomerProfile holds personal identifying information for a customer, including their display name and phone number. Every customer account has exactly one profile, which is separate from their core User account. Customers can edit their profile details at any time to update how they appear to sellers and how they’re contacted. This profile is used in orders, reviews, and communications but never contains sensitive data like passwords or addresses. Changes to the profile do not trigger snapshots unless explicitly part of a larger data modification.

### Display Name

THE system SHALL store a display name for each customer profile, used to identify the customer in public contexts (e.g., reviews, order history).

WHEN a customer updates their display name, THE system SHALL accept text up to 100 characters.

WHEN a seller views a product review, THE system SHALL display the display name (not the email or internal user ID).

IF a customer has not set a display name, THE system SHALL display 'Customer' as the default.

### Phone Number

THE system SHALL store a phone number for each customer profile to enable contact for shipping and order-related communications.

WHEN a customer enters their phone number, THE system SHALL require at least 7 digits and allow optional country code formatting.

WHEN displaying the phone number to sellers (e.g., during shipping preparation), THE system SHALL show the raw digits only, preserving the entered format.

WHEN a customer deletes their account, THE system SHALL delete their profile including the phone number but preserve historical phone numbers in order snapshots (if any were saved).

### Profile Management

WHEN a customer account is created, THE system SHALL automatically create a corresponding CustomerProfile with empty display name and phone number.

WHEN a customer navigates to the profile management page, THE system SHALL display current display name and phone number.

WHEN a customer edits their profile, THE system SHALL allow independent updates to display name and phone number.

IF a profile does not exist when an operation attempts to access it (e.g., during order placement), THE system SHALL create it automatically with minimal required fields.

### Customer Identity Display

WHEN a customer interacts with the system, THE system SHALL use their display name in all user-facing communications where identity is shown (e.g., confirmation emails, order history headers).

WHEN viewing a product detail page, THE system SHALL show the display name of reviewers (not their email or account ID).

WHEN a seller views an order or review, THE system SHALL display only the customer's display name, never their email or internal identifiers.

THE system SHALL NOT expose phone number to customers other than sellers during active order fulfillment.

### Profile Editing

WHEN a customer submits an update to their display name, THE system SHALL validate the input is non-empty and within 100 characters.

WHEN a customer submits an update to their phone number, THE system SHALL validate it contains at least 7 digits.

WHEN both display name and phone number are updated in a single operation, THE system SHALL record the change even if only one field was modified.

IF an update fails due to validation or system error, THE system SHALL revert to previous values and notify the customer.

### Non-Sensitive User Info

THE system SHALL treat CustomerProfile fields (display name, phone number) as non-sensitive personal information.

WHEN a customer account is deleted, THE system SHALL purge all associated CustomerProfile data.

THE system SHALL NOT encrypt display name and phone number at rest, but SHALL apply access controls limiting visibility to relevant parties (customer, sellers during fulfillment, administrators for dispute resolution).

IF a profile is queried without proper authorization, THE system SHALL reject the request with a 'permission denied' error.

## SellerProfile Concept

A SellerProfile represents a seller’s storefront identity, including their shop name, description, and logo. Only approved sellers can have a profile, and it becomes public-facing once activated. Sellers can update their profile at any time, and each edit creates a snapshot for audit and dispute resolution. Customers view seller profiles to assess credibility and understand what the shop offers. Profile changes are visible immediately, except during suspension when edits are blocked.

### SellerProfile Content and Visibility

WHEN a seller account is approved, THE system SHALL create a public SellerProfile associated with their user account.

THE system SHALL require the following SellerProfile fields: shopName (string), shopDescription (text), logoUrl (string).

WHEN a SellerProfile is visible to customers, THE system SHALL display:
1. shopName as the storefront name
2. shopDescription as the shop overview
3. logoUrl as the shop logo image

IF a seller’s account is suspended, THE system SHALL hide their shop logo, name, and description from all public listings and search results.

THE system SHALL NOT display any SellerProfile field before the seller’s account approval status becomes "approved".

### Approval-Dependent Access

WHEN a seller registers, THE system SHALL set the approvalStatus to "pending".

WHEN approvalStatus is "pending", THE system SHALL prohibit access to SellerProfile editing features.

WHEN approvalStatus is "rejected", THE system SHALL:
1. Prevent display of the SellerProfile to customers
2. Allow the seller to submit a new registration request with updated information

WHEN approvalStatus changes to "approved", THE system SHALL:
1. Make the SellerProfile visible to customers immediately
2. Enable SellerProfile editing features
3. Enable seller product creation and management

WHEN an administrator suspends a seller, THE system SHALL set approvalStatus to "suspended" and prohibit all SellerProfile edits until unsuspended.

### Profile Editing and Snapshots

WHEN a seller edits their ShopProfile (shopName, shopDescription, or logoUrl), THE system SHALL create a SellerProfile snapshot.

A SellerProfile snapshot SHALL record:
1. The previous values of shopName, shopDescription, and logoUrl
2. The timestamp of the edit
3. The user who performed the edit

THE system SHALL preserve SellerProfile snapshots immutably and shall NOT delete them.

WHEN a seller views their ShopProfile history, THE system SHALL display all SellerProfile snapshots in reverse chronological order.

WHEN a seller is suspended, THE system SHALL prohibit any profile editing, and any attempted edit SHALL be rejected.

### Seller Storefront Behavior

THE SellerProfile acts as the storefront identity visible to customers when browsing or viewing products.

WHEN a customer views a product listing, THE system SHALL display the seller’s shopName as part of the listing.

WHEN a customer clicks the seller’s shopName, THE system SHALL navigate to the SellerProfile page.

THE SellerProfile page SHALL display:
1. shopName as the header
2. shopDescription as the shop overview
3. logoUrl as the primary visual identity
4. List of active products offered by the seller

WHEN a seller is suspended, THE system SHALL prevent the storefront from being accessed, but existing product listings linked from orders SHALL still reference the preserved shop name at time of purchase.

### Profile Preservation and Deletion

WHEN a seller deletes their account, THE system SHALL:
1. Preserve all SellerProfile snapshots for audit and dispute resolution
2. Preserve the shopName and logoUrl as part of historical order records
3. Remove the active SellerProfile from public view

WHEN an order item references a seller’s ShopProfile, THE system SHALL:
1. Use the seller’s ShopProfile state at time of order (snapshot preserved with order item)
2. Ensure that future SellerProfile edits do not affect the historical record

THE system SHALL NOT delete any SellerProfile snapshot even after seller account deletion.

WHEN an administrator deletes a seller’s account, THE system SHALL NOT delete SellerProfile snapshots, but SHALL remove active profile visibility.

## Address Concept

An Address is a shipping destination defined by a customer, containing full delivery details like recipient name, phone, street, city, state, postal code, and country. Customers can maintain multiple addresses and assign one as the default for faster checkout. Addresses are always tied to a customer and are never shared between accounts. Customers can add, edit, or delete their addresses as needed, though active orders may temporarily restrict deletion. Each address is immutable once linked to a completed order.

### Shipping Destination Definition

WHEN a customer provides a delivery location, THE system SHALL store it as an Address with the following required details:
1. Recipient name
2. Phone number
3. Street address
4. City
5. State/province
6. Postal code
7. Country

IF any required field is missing, THE system SHALL reject the request.

WHERE an Address is linked to an active order, THE system SHALL prevent its deletion until the order is completed or cancelled.

### Default Address Assignment

WHEN a customer creates their first Address, THE system SHALL automatically set it as the default shipping address.

WHEN a customer adds a new Address, THE system SHALL allow them to set it as the default address.

WHEN a customer changes the default address, THE system SHALL update the default flag on the previous default address.

WHERE a customer has no default address, THE system SHALL require them to select a default before checkout.

### Multi-Address Support

WHEN a customer adds an Address, THE system SHALL allow multiple addresses per customer account.

WHEN viewing their addresses, THE system SHALL display all addresses associated with the customer.

WHERE a customer has saved multiple addresses, THE system SHALL allow them to select any address during checkout.

THE system SHALL enforce a maximum of 20 saved addresses per customer account.

### Address Management Operations

WHEN a customer requests to edit an Address, THE system SHALL allow modification of all address fields.

WHEN a customer requests to delete an Address, THE system SHALL check for order linkage before proceeding.

WHERE a customer selects an Address during checkout, THE system SHALL freeze the address fields from that point until order completion.

WHEN a customer creates an Address, THE system SHALL associate it with their profile and user account.

### Order Linkage and Deletion Restrictions

WHEN a customer has an active order with a specific Address, THE system SHALL prevent deletion of that Address until the order status changes from "paid" or "shipped" to "delivered" or "cancelled".

IF a customer attempts to delete an Address linked to an active order, THE system SHALL return an error message explaining the restriction.

WHERE an Address was used for a completed order, THE system SHALL preserve the Address data as part of the order record.

THE system SHALL maintain the original recipient details, phone number, and full address structure at the time of purchase for legal and seller records.

## Category Concept

A Category is a product classification used to organize items for browsing and discovery. Categories support one level of subcategory nesting, allowing clear groupings like 'Electronics > Smartphones'. Each category has a name and optional description and is managed exclusively by administrators. Customers browse categories to navigate the catalog but cannot create or edit them. Deleting a category detaches products without removing them from the platform.

### Category as Product Classification

WHEN a customer browses the product catalog, THE system SHALL group products into named categories to support discovery.
WHEN a customer navigates to a category page, THE system SHALL display all products assigned to that category.
WHEN an administrator creates a category, THE system SHALL require a unique name and allow an optional description.
A category name serves as the primary identifier for product grouping across the platform.
Every product MUST be assigned to exactly one top-level category (which may have a subcategory).

### Category Hierarchy

WHEN an administrator creates a category, THE system SHALL allow assignment to a parent category to establish hierarchy.
WHEN a category has a parent, THE system SHALL display the category with its parent's name as a prefix (e.g., "Electronics > Smartphones").
THE system SHALL support navigation from parent to child categories via links on the parent's page.
WHILE a customer views a category page, THE system SHALL display all descendant subcategories as navigable links.

### One-Level Nesting Restriction

THE system SHALL NOT permit nesting beyond one level of subcategories.
IF an administrator attempts to assign a category as a child of a subcategory, THE system SHALL reject the request with an error.
A category is classified as a subcategory if it has a parent category.
A subcategory cannot have its own children—only top-level categories may have subcategories.

### Admin-Only Management

WHEN a customer accesses the product catalog, THE system SHALL NOT allow category creation, editing, or deletion.
WHEN a customer views a category page, THE system SHALL display only category name, description, and products—not management options.
WHEN an administrator edits a category, THE system SHALL update the category name and/or description.
THE system SHALL track who made the last edit (for audit purposes), but this information is not visible to customers.

### Product Grouping Behavior

WHEN a product is created, THE system SHALL require assignment to a single category (which may be a subcategory).
WHEN a product's category is changed, THE system SHALL update the product's association to the new category.
WHEN a customer views products in a category, THE system SHALL include products assigned to that category or any of its subcategories.
A product appearing under a subcategory is also listed when navigating the parent category page.

### Category Deletion Impact

WHEN an administrator deletes a category, THE system SHALL detach all products from that category.
WHEN a category is deleted and its products are detached, THE system SHALL display those products as "uncategorized".
WHILE a category is in use (has products or subcategories), THE system SHALL NOT prevent deletion—products are simply reassigned.
Deletion of a category does NOT delete products or create orphaned records—products remain on the platform with no category assignment.

### Subcategory Display and Navigation

WHEN a customer views a category that has subcategories, THE system SHALL display each subcategory as a clickable card or link.
WHEN a customer clicks a subcategory, THE system SHALL navigate to that subcategory's page and show only products assigned directly or indirectly to it.
A subcategory's name is displayed with a visual separator (e.g., arrow or slash) from its parent name.
WHILE navigating, THE system SHALL preserve the full hierarchical path in the page title and breadcrumbs for clarity.

## Product Concept

A Product represents an item offered for sale, defined by its name, description, category, and base price. Products are created and owned by sellers, and each belongs to exactly one seller. Sellers can edit or delete their products, but deletion requires no pending orders or requests. Customers browse and search products but do not edit them. Deleted products disappear from listings but remain accessible via order history and snapshots.

### Product Listing

WHEN a customer views a list of products (e.g., search results or category page), THE system SHALL display: main image (thumbnail), product name, seller shop name, base price or price range, and average rating (if available). IF a product has no variants, THE system SHALL show it as 'unavailable' in the list. WHEN filtering by category, THE system SHALL include products from both parent and child categories. WHEN filtering by in-stock only, THE system SHALL exclude products where all variants have stock quantity zero.

### Seller-Owned Item

A product is owned by exactly one seller, identified at creation time. WHEN a product is created, THE system SHALL associate it with the creating seller. WHEN retrieving a product, THE system SHALL include the seller shop name. WHEN editing or deleting a product, THE system SHALL verify the requesting user is the owner. WHEN a seller account is suspended, THE system SHALL hide all their products from public listings but preserve them in order history.

### Name and Description

WHEN a seller creates or edits a product, THE system SHALL require a name and description. THE system SHALL NOT allow empty or whitespace-only name or description values. WHEN displaying a product, THE system SHALL show the name and description exactly as provided by the seller.

### Category Association

WHEN a seller creates or edits a product, THE system SHALL require a category selection. THE system SHALL accept either a parent category or a direct subcategory (one level deep). WHEN a product is listed, THE system SHALL display its category path (e.g., 'Electronics > Phones'). WHEN a category is deleted, THE system SHALL set the product's category to null and mark it as 'uncategorized' in displays.

### Base Price

WHEN a seller creates a product, THE system SHALL require a base price. THE system SHALL accept positive decimal values only. WHEN displaying a product's price, THE system SHALL show the base price IF all variants use the base price. WHEN variants have different prices, THE system SHALL show the minimum and maximum variant price as a range.

### Product Editing

WHEN a seller edits a product, THE system SHALL create a product snapshot preserving the previous state. THE snapshot SHALL include all product fields (name, description, category, base price, images) and all variant snapshots (SKU code, option values, price at the time of edit). WHEN a product is edited, THE system SHALL update the product record with the new values. WHEN a product is edited, THE system SHALL NOT affect existing order items that reference earlier snapshots.

### Product Deletion Criteria

WHEN a seller requests to delete a product, THE system SHALL verify: (1) no order items for any variant have status 'paid' or 'shipped', and (2) no pending cancellation or refund requests exist for any variant. IF any order items are pending, THE system SHALL reject the deletion and provide a list of affected order items. IF all criteria are met, THE system SHALL delete the product and all its variants and inventory records. DELETED products SHALL remain accessible in order history and snapshots but SHALL NOT appear in search, category listings, or seller product dashboards.

## ProductImage Concept

A ProductImage is a visual representation of a product that sellers can upload, reorder, and delete. Each image is associated with a specific product and includes a sort order to define which image is primary (used as thumbnail). Sellers manage images directly: they can upload multiple, change display order, and remove outdated ones. Image changes are included in product snapshots so that historical views accurately reflect visual appearance.

### Product Visuals and Image Purpose

THE system SHALL allow sellers to upload multiple images to visually represent each product.

WHEN a seller uploads an image, THE system SHALL store it as part of the product's visual identity.

WHEN customers browse product listings, THE system SHALL display product images to help them evaluate products before clicking for details.

### Thumbnail Image Selection

WHEN a seller uploads or manages images, THE system SHALL designate one image as the main thumbnail for the product.

THE system SHALL use the main thumbnail image as the primary visual in:
1. Product search results
2. Category browsing pages
3. Cart and order summaries
4. Wishlist displays

WHEN a product has no images, THE system SHALL display a placeholder visual.

### Image Ordering

WHEN a seller manages images for a product, THE system SHALL allow reordering images to change which appears first.

WHEN the first image in the order is changed, THE system SHALL automatically update the main thumbnail to reflect this change.

IF the seller reorders images while editing, THE system SHALL apply changes only when the product edit is saved.

### Seller Image Management

WHEN a seller uploads, reorders, or deletes images, THE system SHALL associate the action with the seller who performed it.

WHEN a seller deletes an image, THE system SHALL remove it from the product unless it is the last remaining image.

IF deleting an image would leave the product with no images, THE system SHALL prevent the deletion and require at least one image to remain.

### Primary vs Secondary Images

THE primary image (first in the order, or designated main) is used for:
1. Listing previews
2. Search result thumbnails
3. Product card displays

Secondary images are used only on the product detail page in image galleries.

THE system SHALL NOT use secondary images in listing previews or search results.

### Snapshot Inclusion

WHEN a product is edited, THE system SHALL create a product snapshot that includes all images at that moment, including:
1. Image URLs
2. Sort order
3. Designation of main thumbnail

WHEN an order is placed, THE system SHALL capture the complete image set (including ordering and main thumbnail) as part of the product snapshot preserved with each order item.

WHEN a product is deleted, THE system SHALL preserve all product snapshots including image data for audit and historical accuracy.

### Image Deletion Rules

WHEN a seller deletes a product image, THE system SHALL record the deletion event but not remove it from existing product snapshots.

THE system SHALL allow sellers to delete secondary images at any time, provided at least one image remains.

WHEN the last image of a product is about to be deleted, THE system SHALL prevent deletion and notify the seller that at least one image must remain.

## ProductVariant Concept

A ProductVariant represents a specific configuration of a product, such as 'Red / Large' or 'Blue / Small', identified by a unique SKU code. Each variant includes optional price overrides and stock quantities. Sellers define variants when setting up a product and can add, edit, or delete them under strict business rules. Customers select variants during purchase, and each order item references a specific variant. Variant stock controls real-time availability and cart warnings.

### SKU Configuration and Structure

WHEN a seller adds a variant to a product, THE system SHALL require a unique SKU code, required option values, and a stock quantity.

A variant must include at least one option (e.g., color, size) represented as key-value pairs in JSON format.

WHEN a product is created, THE system SHALL ensure it has at least one variant to be purchasable.

WHILE a product has no variants, THE system SHALL show it as "unavailable" in listings and detail views.

WHERE a variant has price override, THE system SHALL use the override price; otherwise, THE system SHALL use the product base price.

THE system SHALL prevent duplicate SKU codes across all variants in the platform.

IF the SKU code is missing or empty, THE system SHALL reject the request.

IF option values are not provided or invalid JSON, THE system SHALL reject the request.

IF the stock quantity is negative, THE system SHALL reject the request.

### Option Values Format

OPTION values SHALL be stored as JSON objects with key-value pairs (e.g., {"color": "Red", "size": "Large"}).

OPTION key names SHALL be consistent across variants of the same product.

OPTION values SHALL be compared case-insensitively for duplicate detection.

### Stock Quantity Initialization

WHEN a new variant is added, THE system SHALL initialize stock quantity to 0.

WHEN inventory is added via restock, THE system SHALL update current stock by adding the recorded quantity.

THE current stock quantity SHALL be calculated as the sum of all inventory records for that variant.

### Variant Editing Workflow

WHEN a seller edits a product variant, THE system SHALL create a product-snapshot-SKU to preserve the previous state.

THE snapshot SHALL record: SKU code, option values, price override, and stock quantity at the time of edit.

WHEN a variant is edited, THE system SHALL require the same SKU code (no SKU change allowed).

WHEN a variant is edited, THE system SHALL allow updating option values only if the new combination does not duplicate an existing variant of the same product.

IF duplicate option values exist for the same product, THE system SHALL reject the edit.

IF the SKU code is changed during edit, THE system SHALL reject the request.

THE system SHALL update current stock quantity by recording an inventory adjustment with reason 'adjustment'.

### Stock Adjustment Rules

WHEN variant stock is manually adjusted, THE system SHALL create an inventory record with reason 'adjustment'.

THE inventory record SHALL include the quantity change (positive or negative) and timestamp.

Current stock SHALL be recalculated by summing all inventory records.

### Variant Deletion Conditions

WHEN a seller requests deletion of a variant, THE system SHALL verify eligibility before proceeding.

IF the variant has any order items with status 'paid' or 'shipped', THE system SHALL reject the request.

IF the variant has pending cancellation requests (status 'pending'), THE system SHALL reject the request.

IF the variant has pending refund requests (status 'pending'), THE system SHALL reject the request.

IF the variant is the last remaining variant of its product, THE system SHALL reject the request.

WHEN a variant is successfully deleted, THE system SHALL delete all inventory records associated with that variant.

IF the product has zero variants after deletion, THE system SHALL mark the product as "unavailable".

### Immediate State Changes on Deletion

WHEN a variant deletion is rejected, THE system SHALL show the specific reason in the error response.

WHEN a variant is deleted, THE system SHALL remove it from product detail page variants list.

WHEN a variant is deleted, THE system SHALL update the product's display to show 'unavailable' if no variants remain.

### Cart and Checkout Behavior

WHEN a customer adds a variant to their cart, THE system SHALL verify the variant exists and is not deleted.

WHEN the same variant is already in the cart, THE system SHALL combine quantities instead of creating duplicate items.

WHEN cart quantity exceeds current stock, THE system SHALL show a warning message.

WHEN a variant is out of stock (stock quantity = 0), THE system SHALL prevent adding it to cart.

WHEN a variant is deleted or becomes out of stock while in cart, THE system SHALL mark it as 'unavailable' in cart view.

WHILE an unavailable item is in cart, THE system SHALL prevent checkout for that item.

IF a customer proceeds to checkout with unavailable items, THE system SHALL remove them from checkout and notify the customer.

### Price Calculation at Checkout

THE system SHALL use the variant's current price override (or base price if no override) at checkout.

THE system SHALL calculate subtotal as: price × quantity for each item.

### Snapshot Integration for Orders

WHEN an order is placed, THE system SHALL create a product-snapshot-SKU for each purchased variant.

THE snapshot SHALL capture: SKU code, option values, price override (if any), and current stock quantity.

This snapshot ensures exact fidelity of variant state at time of purchase.

IF a variant is edited after purchase, THE system SHALL NOT affect the snapshot stored with the order.

IF a variant is deleted after purchase, THE system SHALL preserve the snapshot with the order item.

THE system SHALL prevent modification or deletion of order-related snapshots.

## ProductSnapshot Concept

A ProductSnapshot preserves the complete state of a product at a specific point in time, including name, description, category, price, and all associated images and variants. Snapshots are created automatically whenever a product or its variants are edited. Sellers and administrators can view snapshots to resolve disputes or audit changes. Even deleted products remain accessible through snapshots, ensuring historical accuracy for orders and reviews.

### Immutable Product State

WHEN a product snapshot is created, THE system SHALL preserve the complete product state at that moment.

WHEN a product snapshot exists, THE system SHALL NOT allow any modifications to its content.

THE system SHALL ensure all product fields (name, description, base price, category) are captured and remain unchanged after snapshot creation.

WHEN a product is edited, THE system SHALL create a new snapshot and preserve the previous snapshot intact.

### Edit-Triggered Creation

WHEN a seller edits any product field (name, description, category, base price), THE system SHALL automatically create a product snapshot.

WHEN a seller edits any variant of a product (SKU code, option values, price override, stock quantity), THE system SHALL automatically create a product snapshot.

WHEN a seller deletes images or changes image ordering, THE system SHALL automatically create a product snapshot.

NO manual snapshot creation is required — all edits MUST trigger automatic snapshot creation.

### Snapshot Audit Trail

THE system SHALL record the timestamp of each snapshot creation.

WHEN a snapshot is created, THE system SHALL store a unique identifier linking it to the original product and the triggering edit event.

WHEN reviewing snapshots, users SHALL be able to see the chronological sequence of changes.

THE system SHALL preserve all snapshots indefinitely and not allow deletion of any snapshot.

### Product History

WHEN a seller views a product’s history, THE system SHALL display all product snapshots in reverse chronological order (most recent first).

WHEN viewing snapshot history, THE system SHALL show the date and type of change (e.g., edit, deletion, order) for each snapshot.

Customers viewing a product detail page SHALL see the current snapshot state, not historical versions.

THE system SHALL NOT display snapshot history to customers.

### Admin Access to Snapshots

WHEN an administrator requests a product snapshot, THE system SHALL allow viewing any snapshot for any product.

THE system SHALL allow administrators to compare two snapshots to identify all differences in product fields and variants.

WHEN investigating a dispute, THE system SHALL allow administrators to access the snapshot state at the time of purchase.

Administrators SHALL NOT be able to modify any snapshot data.

### Snapshot Preservation After Deletion

WHEN a seller deletes a product, THE system SHALL preserve all existing product snapshots.

WHEN a product is deleted, THE system SHALL still allow access to its snapshots for order fulfillment, reviews, and dispute resolution.

WHEN viewing historical orders, THE system SHALL reference and display the preserved snapshot version of the product and its variants.

Product deletion MUST NOT affect the availability or integrity of snapshots.

### Full Variant State Capture

WHEN a product snapshot is created, THE system SHALL capture the complete state of all variants at that moment, including SKU code, option values, price override, and stock quantity.

Each product snapshot SHALL contain one or more product-snapshot-variants representing all variants in their exact state at the time of snapshot.

WHEN an order item references a product snapshot, THE system SHALL ensure the product-snapshot-variant state matches what was sold at that time.

VARIANT price overrides, option names, and stock levels MUST all be preserved accurately in the snapshot.

## ProductSnapshotVariant Concept

A ProductSnapshotVariant represents a specific variant as it existed at the time of a product snapshot. It captures the SKU code, option values, and price exactly as recorded in that moment. These snapshots are embedded within ProductSnapshot records to ensure order-item fidelity. Unlike editable variants, snapshots are immutable and cannot be modified or deleted. They provide legal and historical accuracy for orders, refunds, and disputes.

### ProductSnapshotVariant Definition

A ProductSnapshotVariant represents the exact state of a product variant at the time a product snapshot was created.

WHEN a product snapshot is created (during edit, order placement, refund, or cancellation), THE system SHALL:
1. Capture each variant's SKU code as it existed at that moment
2. Preserve its option values (e.g., {"color": "Red", "size": "Large"}) as a JSON object
3. Record its price override value (or null if no override)
4. Include the variant's creation timestamp in the snapshot context

WHEN a product has no variants, THE system SHALL NOT create ProductSnapshotVariant records.

A ProductSnapshotVariant MUST reference exactly one ProductSnapshot and MUST NOT exist independently.

### Immutable Snapshot Variants

ProductSnapshotVariant records are permanently fixed and cannot be modified.

WHEN a ProductSnapshotVariant is created, THE system SHALL NOT allow any field updates.

WHEN any user attempts to modify a ProductSnapshotVariant, THE system SHALL reject the operation.

WHEN any user attempts to delete a ProductSnapshotVariant, THE system SHALL reject the operation.

WHEN a product is deleted by a seller or administrator, THE system SHALL preserve all associated ProductSnapshotVariant records.

### Embedded in Product Snapshot

ProductSnapshotVariant records exist only as part of a ProductSnapshot and are created atomically with it.

WHEN a new ProductSnapshot is created, THE system SHALL:
- Create one or more ProductSnapshotVariant records reflecting the variants present at that time
- Include all variants whether they are in-stock, out-of-stock, or deleted

WHEN a product edit creates a ProductSnapshot, THE system SHALL NOT create ProductSnapshotVariant records for variants that existed before but were removed.

ProductSnapshotVariant records are read-only references and do not affect current variant state or inventory.

### SKU and Option Values Capture

Each ProductSnapshotVariant preserves critical identifying and configuration data from the moment of snapshot.

WHEN capturing a variant in a snapshot, THE system SHALL:
1. Store the exact SKU code as a string (no normalization)
2. Store option values as the original JSON structure (e.g., {"color":"Red","size":"Large"})
3. Preserve the priceOverride value (including null when no override existed)

IF the original variant had empty or null option values, THE system SHALL store an empty JSON object {}.

THE system SHALL NOT infer, derive, or recalculate option values when creating snapshots.

### Read-Only Access and Visibility

ProductSnapshotVariant records are accessible only for reference and audit purposes.

WHEN a seller views a snapshot of their own product, THE system SHALL include all ProductSnapshotVariant records for that snapshot.

WHEN an administrator views any product snapshot, THE system SHALL include all ProductSnapshotVariant records for that snapshot.

WHEN a customer views product history related to their order, THE system SHALL include ProductSnapshotVariant records for order-embedded snapshots.

THE system SHALL NOT expose ProductSnapshotVariant creation or modification timestamps beyond those in the parent ProductSnapshot.

No user role can modify, delete, or create ProductSnapshotVariant records outside of automated snapshot processes.

## InventoryRecord Concept

An InventoryRecord tracks every stock change for a variant, including positive entries (restock, adjustment) and negative entries (orders, cancellations, refunds). Each record includes the quantity change amount, a reason code, and a timestamp. Sellers manage restocking and adjustments manually, while the system automatically creates records for purchases and returns. Current stock is derived by summing all records, and inventory history provides full transparency for reconciliation.

### InventoryRecord as Stock Change Tracker

WHEN stock for a variant changes, THE system SHALL create an InventoryRecord.

Each InventoryRecord MUST include:
1. The variant being affected
2. A quantity change value (positive for addition, negative for deduction)
3. A reason code explaining why the change occurred
4. A timestamp when the change happened

WHEN a restock occurs, THE system SHALL create an InventoryRecord with a positive quantity change.
WHEN inventory is deducted (e.g., from order, cancellation, or adjustment), THE system SHALL create an InventoryRecord with a negative quantity change.

THE system SHALL not allow manual modification of existing InventoryRecords.

WHERE an InventoryRecord exists, THE system SHALL associate it with exactly one variant.

### Reason Codes

WHEN an InventoryRecord is created, THE system SHALL require a reason code.

PERMITTED reason codes are:
- restock: seller manually added stock
- adjustment: seller manually corrected stock (loss, gain, error correction)
- order: customer purchase reduced stock
- cancel: order cancellation restored stock
- refund: refund processed restored stock

IF a seller creates an InventoryRecord with an unapproved reason code, THE system SHALL reject the request.

### Seller-Initiated Restock and Adjustment

WHEN a seller adds inventory to a variant, THE system SHALL create an InventoryRecord with reason code "restock".

WHEN a seller adjusts inventory for a variant, THE system SHALL create an InventoryRecord with reason code "adjustment" and include the adjustment reason provided by the seller.

THE system SHALL allow sellers to view the full inventory history of any variant they own.

WHEN an InventoryRecord is created by the seller, THE system SHALL include the seller-provided adjustment reason in the record.

### Order-Triggered Deduction

WHEN a customer places an order successfully, THE system SHALL create InventoryRecords with reason code "order" for each purchased variant.

THE quantity change for each order-triggered InventoryRecord SHALL equal the negative of the order item quantity.

THE system SHALL create the InventoryRecord before marking the order item as "paid".

IF insufficient stock exists for a variant, THE system SHALL reject the order before creating any InventoryRecords.

### Refund-Triggered Restoration

WHEN a refund is approved, THE system SHALL create an InventoryRecord with reason code "refund" for the refunded variant.

THE quantity change for each refund-triggered InventoryRecord SHALL equal the positive value of the refunded quantity.

THE system SHALL restore stock from the exact variant that was originally purchased.

IF a product variant has been deleted since purchase, THE system SHALL create the InventoryRecord against the preserved variant snapshot.

### Inventory History and Current Stock

THE system SHALL store all InventoryRecords indefinitely and never delete them.

WHEN calculating current stock for a variant, THE system SHALL sum all InventoryRecords for that variant.

WHEN displaying inventory history to sellers, THE system SHALL show records in chronological order with latest first by default.

WHERE a seller views inventory history, THE system SHALL include for each record: timestamp, quantity change, reason code, and optional reference to the triggering event (order ID, adjustment note).

WHEN stock quantity reaches zero, THE system SHALL show the variant as "out of stock" to customers.

## CartItem Concept

A CartItem represents a variant selected by a customer for potential purchase, including the chosen quantity. Customers add variants to their cart, and quantities are aggregated if the same variant is added again. Customers can view, edit, or remove cart items before checkout. Cart behavior enforces stock limits and warns customers if inventory is insufficient. Cart items do not become part of an order until checkout is completed successfully.

### Variant Selection in Cart

WHEN a customer adds a product variant to their cart, THE system SHALL:
1. Require selection of a specific variant (not just a product)
2. Display variant options (e.g., color, size) to the customer before adding
3. Store the selected variant’s SKU code and option values at addition time
4. Associate the cart item with the selected variant

IF the customer attempts to add a deleted or out-of-stock variant, THE system SHALL prevent addition and display an appropriate message.

### Quantity Management

WHEN a customer adds a variant to their cart, THE system SHALL:
1. Accept a quantity (minimum 1, maximum inventory available for that variant)
2. Store the selected quantity with the cart item

WHEN a customer views their cart, THE system SHALL display:
1. The quantity for each cart item
2. A per-item subtotal (quantity × unit price)

WHEN a customer changes the quantity of a cart item, THE system SHALL:
1. Update the stored quantity immediately
2. Recalculate the per-item subtotal
3. Recalculate the cart total

### Cart Aggregation Logic

WHEN a customer attempts to add a variant that is already in their cart, THE system SHALL:
1. Detect the existing cart item with matching variant
2. Combine quantities (not create a duplicate line item)
3. Update the subtotal and cart total accordingly

THE system SHALL maintain only one cart item per variant per customer.

THE system SHALL persist cart items across sessions until explicitly removed or the cart is cleared upon checkout.

### Stock Limit Enforcement

WHEN a customer views their cart, THE system SHALL:
1. For each cart item, compare the stored quantity to current variant stock
2. If stock is less than cart quantity, display a warning indicating the current available quantity

WHEN a customer attempts to increase a cart item quantity beyond available stock, THE system SHALL:
1. Prevent the quantity change
2. Display an error message specifying the maximum available quantity

IF stock drops to zero after adding an item to cart (e.g., by another customer), THE system SHALL:
1. Mark that cart item as unavailable
2. Continue to display the item with status indicating unavailability

### Cart Editing

WHEN a customer edits their cart, THE system SHALL:
1. Allow increasing or decreasing quantity per item
2. Allow removal of individual cart items
3. Preserve other items when one is removed

WHEN a customer removes a cart item, THE system SHALL:
1. Permanently delete that cart item
2. Recalculate the cart total
3. Update the item count in the cart summary

WHEN a customer edits quantity or removes an item, THE system SHALL persist the change immediately.

### Unavailable Item Handling

IF a cart item’s variant is deleted by the seller, THE system SHALL:
1. Mark the cart item as unavailable
2. Continue to display it in the cart but flag it as unavailable
3. Prevent checkout of that item

IF a cart item’s variant becomes out of stock, THE system SHALL:
1. Mark the cart item as unavailable
2. Display a warning when the customer attempts to checkout
3. Prevent adding more of that variant if stock reaches 0

WHEN a customer attempts to proceed to checkout with unavailable items, THE system SHALL:
1. Prevent checkout until unavailable items are removed
2. Show a summary of which items are unavailable

### Pre-Order State

A cart item exists in a pre-order state and has no impact on inventory until checkout.

WHILE a cart item remains in the cart, THE system SHALL:
1. Reserve no stock for that item
2. Allow other customers to purchase the same variant if available
3. Not generate any inventory records

WHEN a cart item is successfully checked out, THE system SHALL:
1. Convert the cart item into an order item with status 'paid'
2. Decrement inventory for the variant via an inventory record
3. Remove the cart item from the cart

WHEN a customer removes an item from cart, THE system SHALL:
1. Discard the cart item
2. Not generate any inventory changes

## WishlistItem Concept

A WishlistItem represents a product a customer intends to buy later. Customers add products (not variants) to their wishlist and can view or remove items at any time. Wishlists are private and persistent, supporting pagination for large collections. When a wishlist product is deleted by its seller, it is automatically removed from all customers' wishlists. Wishlist items do not affect stock or pricing directly but may influence future purchase decisions.

### Wishlist Creation and Product Selection

WHEN a customer adds a product to their wishlist, THE system SHALL:
1. Require selection of a product (not a specific variant)
2. Allow only one wishlist entry per product per customer
3. Store the addition timestamp
4. Display a confirmation that the product has been added

WHEN a customer attempts to add the same product again, THE system SHALL:
- Not create a duplicate entry
- Instead, either ignore the request or show a message indicating the product is already in the wishlist

IF the customer is not authenticated, THE system SHALL reject the request before processing.

### Wishlist Viewing and Private Collection

WHEN a customer views their wishlist, THE system SHALL:
1. Display only the customer’s own wishlist items
2. Show each item’s product thumbnail, name, base price, and seller shop name
3. Indicate stock availability (in stock, out of stock, or unavailable)
4. Not expose other customers’ wishlists (private collection)

WHILE a wishlist is being viewed, THE system SHALL:
- Load items in paginated batches
- Support moving to next/previous pages using cursor-based pagination
- Maintain the total count of wishlist items for the UI

### Wishlist Persistence and Auto-Removal on Seller Deletion

WHEN a wishlist item is created, THE system SHALL persist it indefinitely until:
1. The customer manually removes it
2. The product is deleted by its seller
3. The customer deletes their account ( wishlisted items are deleted with the account)

WHEN the seller of a wishlist item deletes the associated product, THE system SHALL:
- Automatically remove the wishlist item from all customers’ wishlists
- Record the removal in system logs for audit purposes
- Not leave orphaned wishlist items in the database

WHERE a product becomes unavailable (e.g., hidden due to seller suspension), THE system SHALL:
- Leave the wishlist item intact
- Display it with an appropriate indicator (e.g., "Seller inactive")
- Not automatically remove it unless the product itself is deleted

### Wishlist Editing and Removal

WHEN a customer removes a wishlist item, THE system SHALL:
1. Immediately delete the wishlist item
2. Not require additional confirmation (if deletion is intentional)
3. Not create a snapshot (wishlists are mutable personal collections)

WHERE a wishlist item is deleted via bulk removal, THE system SHALL:
- Support selecting multiple items for removal
- Apply deletion in a single operation
- Return the number of items successfully removed

### Pagination Support and Performance Expectations

WHEN pagination is applied to the wishlist list view, THE system SHALL:
1. Return up to 20 items per page by default
2. Support a custom page size (up to 100 items per page)
3. Provide next and previous page tokens for cursor-based pagination
4. Include total item count in the response for UI rendering

WHILE the customer navigates through wishlist pages, THE system SHALL:
- Maintain consistency of the wishlist state during navigation
- Avoid stale or duplicated items across pages due to concurrent modifications

### Customer Intent Tracking and Business Value

THE system SHALL capture and preserve each wishlist item’s creation timestamp to enable:
1. Sorting by newest-added
2. Analytics on customer intent and interest trends
3. Later recommendation personalization

WHERE an item remains in a customer’s wishlist for an extended period, THE system SHALL:
- Not expire or auto-delete it (unless the seller deletes the product or customer account is deleted)
- Maintain the item as evidence of long-term intent

THE system SHALL NOT treat wishlist items as:
- Reservations
- Pre-orders
- Stock holds
- Price lock commitments

## Order Concept

An Order represents a confirmed purchase made by a customer after successful checkout and payment. It links one or more order items, the customer’s shipping address, and the total price at checkout. Orders cannot be modified after creation—addresses, items, and prices are locked. Customers view their order history sorted by recency and can access full details, including shipments and item statuses. Orders preserve snapshots for legal and dispute resolution purposes.

### Order Creation

WHEN a customer completes checkout and payment succeeds, THE system SHALL create an order.

THE system SHALL create an order only when:
1. Payment has been successfully processed
2. All items in the cart are available (not deleted or permanently unavailable)
3. The selected shipping address exists and belongs to the customer

IF payment fails, THE system SHALL NOT create an order.
IF any cart item becomes unavailable during checkout, THE system SHALL block order creation and display the availability issue.

WHEN an order is created, THE system SHALL:
1. Lock the shipping address used at checkout
2. Lock the list of items, quantities, and prices at checkout time
3. Generate a unique order number
4. Set the order status to 'paid'
5. Create a snapshot of each purchased product and variant with the order
6. Create a snapshot of the seller profile at the time of purchase
7. Decrease stock quantity for each purchased variant
8. Clear the customer's cart
9. Link each order item to its respective seller

### Immutable After Creation

WHEN an order is created, THE system SHALL prevent all future modifications to the order's:
1. Shipping address
2. List of order items (cannot add, remove, or change quantities)
3. Prices at checkout time (cannot adjust item prices or totals)
4. Selected shipping method (if applicable)

THE system SHALL preserve the original state for dispute resolution and legal compliance.

A customer can only modify order details via official processes:
1. Request cancellation for individual items with status 'paid'
2. Request refund for delivered items
3. Contact support for exceptional cases

IF a request attempts to modify a locked field after creation, THE system SHALL reject the request and explain the modification is not allowed.

### Order History Access

WHEN a customer views their order history, THE system SHALL:
1. Display all orders associated with their account
2. Sort orders by creation date, newest first
3. Show pagination controls when the result set exceeds the page limit
4. Show order summary: order number, creation date, total price, and overall status

THE system SHALL only display orders where the customer is the buyer.

IF a customer requests an order they do not own, THE system SHALL reject the request and return an error.

WHEN an order is partially cancelled or refunded, THE system SHALL reflect the updated status in order history.

### Full Order Detail Access

WHEN a customer views the full details of an order, THE system SHALL:
1. Display the order number and creation timestamp
2. Show the locked shipping address (recipient name, address, phone)
3. List all order items with: product name, variant options, quantity, price at purchase, and current status
4. Display the original seller profiles at checkout time (shop name and logo)
5. List all shipments for the order with tracking information and status
6. Show cancellation and refund requests for each order item
7. Show the total price breakdown (item subtotals, taxes, shipping if applicable)

THE system SHALL include product and variant snapshots that preserve the exact state at checkout time.

WHEN an order has no shipments yet, THE system SHALL indicate 'Not shipped' as the shipment status.

### Snapshot Linkage for Orders

WHEN an order is created, THE system SHALL create snapshots for each order item containing:
1. Product snapshot: product name, description, base price, and main image at checkout time
2. Product variant snapshot: SKU code, option values, and price at checkout time
3. Seller profile snapshot: shop name, description, and logo at checkout time

THE system SHALL link each order item to its snapshots using immutable references.

WHEN a product is edited or deleted after an order is placed, THE system SHALL NOT affect existing order snapshots.

WHEN an order is cancelled or refunded, THE system SHALL preserve the snapshots with the order record.

Administrators can view all order snapshots for dispute resolution and audit purposes.

### Order Status and Status Derivation

WHEN an order is created, THE system SHALL assign status 'paid'.

THE system SHALL derive the overall order status from its items:
- If all items are 'paid' → order status is 'paid'
- If any item is 'shipped' and none are 'delivered' → order status is 'shipped'
- If all items are 'delivered' → order status is 'delivered'
- If all items are 'cancelled' → order status is 'cancelled'
- If all items are 'refunded' → order status is 'refunded'
- If items have mixed statuses (e.g., some delivered, some cancelled) → order status is 'partially completed'

WHEN an item's status changes, THE system SHALL update the order status accordingly.

THE system SHALL preserve historical order status for reporting and auditing.

## OrderItem Concept

An OrderItem represents a specific product variant purchased in an order, including its quantity and status at that time. Each item maintains its own lifecycle independent of others in the same order. Order items can be individually cancelled or refunded, allowing partial fulfillment. Every order item is linked to a snapshot of the product and variant as they existed at purchase time, preserving pricing and description. Status flows reflect real-world fulfillment progress.

### Purchased Variant and Quantity

WHEN a customer purchases a product variant, THE system SHALL create an OrderItem representing that purchase.

An OrderItem records the specific variant (by SKU) that was bought, including its option values.

The quantity in an OrderItem reflects how many units of that variant were purchased in a single order.

Multiple purchases of the same variant in one checkout are aggregated into one OrderItem (not duplicated).

### Quantity and Status

WHEN an OrderItem is created, THE system SHALL record:
1. The exact quantity purchased
2. The unit price at purchase time (from product snapshot)
3. The total price (quantity × unit price)
4. Initial status of "paid" once payment succeeds

WHILE an OrderItem exists, THE system SHALL:
- Allow its status to change through the fulfillment lifecycle
- Track status independently from other items in the same order
- Update status only through valid business events (shipment, delivery, cancellation, refund)

### Independent Lifecycle

WHEN an order contains multiple OrderItems, THE system SHALL:
- Allow each item to progress through its status independently
- Permit cancellation of one item while others ship or remain paid
- Permit refund of one item while others are delivered
- Allow items to have different statuses simultaneously

WHERE an item is cancelled or refunded, THE system SHALL:
- Restore stock for that variant only
- Leave other items in the order unaffected
- Maintain separate tracking for each item's fulfillment path

### Item-Level Cancellation

WHEN a customer requests cancellation of an OrderItem with status "paid", THE system SHALL:
1. Accept a cancellation reason from the customer
2. Create a CancellationRequest with status "pending"
3. Wait for the seller to approve or reject the request

WHEN a seller approves a cancellation request, THE system SHALL:
1. Change the OrderItem status to "cancelled"
2. Restore stock for the variant via an InventoryRecord with reason "cancel"
3. Trigger a refund for the cancelled amount
4. Create a snapshot of the cancellation request state

### Item-Level Refund

WHEN a customer requests a refund for an OrderItem with status "delivered", THE system SHALL:
1. Accept a refund reason from the customer
2. Create a RefundRequest with status "pending"
3. Require the request be made within 7 days of delivery
4. Wait for the seller to approve or reject the request

WHEN a seller approves a refund request, THE system SHALL:
1. Change the OrderItem status to "refunded"
2. Restore stock for the variant via an InventoryRecord with reason "refund"
3. Process the refund amount to the customer
4. Create a snapshot of the refund request state

### Purchase-Time Snapshot Preservation

WHEN an OrderItem is created, THE system SHALL:
1. Capture a snapshot of the product as it existed at purchase time
2. Capture a snapshot of the variant as it existed at purchase time
3. Preserve the product name, description, category, and variant options
4. Record the exact price paid (including any price overrides)

WHERE a product or variant is later edited or deleted, THE system SHALL:
- Not affect the OrderItem’s preserved snapshot
- Maintain the purchase-time values permanently
- Allow historical fidelity for dispute resolution or auditing

### Status Tracking per Item

THE system SHALL track the following statuses for each OrderItem:
- "paid": payment successful, waiting for shipping
- "shipped": seller has recorded shipment
- "delivered": customer has confirmed delivery or 14 days have passed
- "cancelled": cancellation approved, item voided
- "refunded": refund approved, item voided

WHEN any status change occurs, THE system SHALL:
- Update the OrderItem’s status field
- Record the change timestamp
- Trigger any associated business rules (e.g., stock restoration on cancel/refund)

WHERE an order has mixed item statuses (e.g., some delivered, some refunded), THE system SHALL:
- Assign the order status "partially completed"
- Maintain each item’s independent status
- Enable granular fulfillment reporting

## Shipment Concept

A Shipment represents a physical package sent by a seller, containing one or more order items from the same seller. Sellers create shipments by selecting items and entering carrier and tracking information. All items in a shipment share tracking details and change to 'shipped' status simultaneously. Customers view shipments to track delivery and confirm receipt. Multiple shipments per order are allowed when items are from different sellers.

### Shipment Creation and Core Behavior

### Seller-Created Package

WHEN a seller ships one or more order items from an order, THE system SHALL allow the seller to create a new shipment for those items. THE system SHALL require at least one order item to be included in each shipment.

A shipment represents a physical package that a seller sends to a customer. Shipment creation is initiated only by sellers and is tied to one or more of their own order items.

IF no order items are selected for a shipment, THE system SHALL reject the request.

### Tracking Information

WHEN a shipment is created, THE system SHALL accept and store: carrier name, tracking number, and shipment status (initially "pending").

ALL items in the same shipment share identical tracking information. THE system SHALL ensure consistency: editing tracking details for a shipment updates them for all associated items.

Customers CAN view the carrier name and tracking number on the order detail page, but CANNOT edit them.

### Multi-Item Consolidation

WHEN a seller selects multiple order items for shipment, THE system SHALL combine them into a single shipment. THE system SHALL allow sellers to choose which of their items to include in each shipment.

IF a seller wants to ship items to different addresses, THE system SHALL require creating separate shipments per destination.

WHILE items are part of a shipment, THE system SHALL enforce that they share the same shipping status and tracking information.

### Shipped Status Trigger

WHEN a shipment is created, THE system SHALL automatically update the status of all included order items to "shipped".

THE system SHALL record the shipment creation timestamp as the trigger for this status change.

IF a shipment is deleted before items are marked as delivered, THE system SHALL revert the included order items’ status to their previous state (typically "paid").

### Customer Delivery Confirmation

WHEN a customer receives a shipment, THE system SHALL allow the customer to confirm delivery per shipment.

THE system SHALL show a "Confirm Delivery" action for each shipment with status "shipped".

WHEN the customer confirms delivery, THE system SHALL update the status of all items in that shipment to "delivered".

IF delivery is not confirmed, THE system SHALL NOT require any action—the system handles settlement automatically.

### Automated Delivery Settlement

WHILE a shipment has status "shipped" for 14 days without customer confirmation, THE system SHALL automatically change the status of all items in that shipment to "delivered".

THIS rule applies regardless of whether the customer explicitly confirmed delivery.

The 14-day period begins at the time of shipment creation and is calculated using system clock time.

### Inter-Seller Separation

THE system SHALL ensure that a shipment contains ONLY order items belonging to the same seller.

IF an order contains items from multiple sellers, THE system SHALL prevent combining those items into one shipment.

WHEN creating a shipment, THE system SHALL pre-filter available order items to show only those belonging to the seller who is initiating the shipment.

## ShipmentItem Concept

A ShipmentItem is the link between a shipment and an order item, recording which items are included in which package. It includes the timestamp of shipment creation and ensures traceability from physical package to purchase. These records are immutable and created only when a seller finalizes a shipment. Customers and sellers use shipment items to understand exactly what was included in each delivery.

### Shipment-Order Item Linkage

WHEN a seller finalizes a shipment, THE system SHALL create one or more shipment items, each linking the shipment to a specific order item included in that shipment.

WHEN a shipment item is created, THE system SHALL record the timestamp of shipment creation.

THE system SHALL ensure shipment items are immutable—no edits, deletions, or status changes are allowed after creation.

WHILE a shipment item exists, THE system SHALL maintain a permanent traceability link from the physical package (shipment) to the purchased item (order item).

IF a shipment item is missing for an order item, THE system SHALL prevent shipment creation for that order item until linkage is established.

WHERE a seller includes multiple items from the same order in one package, THE system SHALL create separate shipment items for each order item, all sharing the same shipment reference.

THE system SHALL preserve shipment items for the lifetime of the associated order, even if the underlying order item or shipment is archived or logically deleted.

### Shipment Contents Record

WHEN a shipment is created, THE system SHALL record the complete set of order items included in that shipment as shipment items.

WHEN viewing a shipment, THE system SHALL display the list of order items (product name, variant, quantity) contained in the shipment via their shipment items.

WHEN viewing an order item, THE system SHALL indicate which shipment (if any) it belongs to, using the associated shipment item as the source.

IF a shipment item is deleted or modified, THE system SHALL reject the action—shipment items must remain a permanent record.

WHEN a shipment is cancelled before shipping, THE system SHALL delete the shipment and all associated shipment items.

THE system SHALL prevent creation of duplicate shipment items for the same (shipment, order item) pair.

### Immutable Association

WHEN a shipment item is created, THE system SHALL lock the association between shipment and order item.

WHILE a shipment item exists, THE system SHALL prohibit any modification to the shipment reference or order item reference.

THE system SHALL ensure that once a shipment item is created, the linkage persists for auditing and dispute resolution.

IF a shipment or order item is logically deleted, THE system SHALL preserve the shipment item record to maintain traceability.

WHEN a shipment item is queried, THE system SHALL return only complete linkage data—no partial or inferred links.

### Creation Timestamp

WHEN a shipment item is created, THE system SHALL capture the exact timestamp of shipment finalization.

THE system SHALL use the shipment creation timestamp as the authoritative record for when the shipment item linkage was established.

WHEN retrieving shipment items, THE system SHALL sort them by creation timestamp in ascending order unless otherwise specified.

IF multiple shipment items are created in the same shipment batch, THE system SHALL preserve their distinct timestamps, even if generated in rapid succession.

THE system SHALL include the shipment creation timestamp in audit logs for compliance and dispute resolution.

### Traceability Link

WHEN a customer views an order, THE system SHALL display the chain from order item → shipment item → shipment for delivery tracking.

WHEN a seller ships an item, THE system SHALL ensure the shipment item provides a verifiable trail: order item → shipment item → tracking number.

THE system SHALL expose shipment items in audit interfaces for administrators to review physical delivery vs. order history alignment.

WHEN investigating a delivery dispute, THE system SHALL use shipment items to verify exactly which items were included in which packages.

IF a shipment item is missing for an expected order item, THE system SHALL flag it as a system integrity issue for administrator review.

### Delivery Verification

WHEN a customer confirms delivery of a shipment, THE system SHALL verify the shipment items associated with that shipment.

THE system SHALL use the shipment item linkage to ensure all items in the shipment transition to ‘delivered’ status only after confirmation.

WHEN delivery confirmation is not provided, THE system SHALL automatically update the status of all shipment items in that shipment to ‘delivered’ after 14 days from shipment timestamp.

IF any shipment item references an order item with a mismatched status, THE system SHALL trigger a reconciliation alert for administrators.

### Package-to-Item Mapping

WHEN a seller includes an order item in a shipment, THE system SHALL create a one-to-one shipment item mapping per order item.

THE system SHALL support many-to-one mapping—multiple shipment items can reference the same shipment, but each shipment item references exactly one shipment and one order item.

WHEN a seller splits a large order across multiple shipments, THE system SHALL create separate shipment items for each shipment-order item pairing.

IF an order item is already included in a shipped shipment, THE system SHALL prevent creation of additional shipment items for that order item in other shipments.

WHEN a shipment item is queried, THE system SHALL return the complete package-to-item mapping with no missing links.

## CancellationRequest Concept

A CancellationRequest represents a customer’s request to cancel an order item with status 'paid' (not yet shipped). Customers provide a reason text, and sellers review and respond by approving or rejecting. Every response creates a snapshot of the request state for audit. Approved cancellations trigger refunds and restore inventory. Only pending (non-shipped) items are eligible, and the request is scoped to a single item.

### Cancellation Request Initiation

WHEN a customer initiates a cancellation request, THE system SHALL:
1. Require the customer to select a specific order item with status 'paid' (not yet shipped)
2. Require the customer to provide a reason text (non-empty)
3. Associate the request with the selected order item and current customer account

IF the customer selects an order item with status 'shipped', 'delivered', 'cancelled', or 'refunded', THE system SHALL reject the request with a clear message that cancellation is only possible for paid items.

WHERE a customer attempts to request cancellation for multiple items, THE system SHALL process each as a separate request.

### Pending Item Eligibility

WHEN an order item is eligible for cancellation, THE system SHALL:
1. Allow cancellation requests only when the item status is 'paid'
2. Prevent cancellation requests for items with status 'shipped', 'delivered', 'cancelled', or 'refunded'

WHERE an order contains multiple items, THE system SHALL show cancellation eligibility status per item.

IF an order item has already been processed (shipped), THE system SHALL display a message indicating delivery confirmation is required before refund can be requested.

### Seller Approval Workflow

WHEN a seller receives a cancellation request, THE system SHALL:
1. Display the request with reason text, item details, and order context
2. Provide options to approve or reject the request
3. Record the timestamp of the seller's response

WHEN a seller approves a cancellation request, THE system SHALL:
1. Change the associated order item status to 'cancelled'
2. Process a refund to the customer for the cancelled item amount
3. Restore the inventory for the cancelled variant

WHEN a seller rejects a cancellation request, THE system SHALL:
1. Keep the order item status as 'paid'
2. Record the rejection reason provided by the seller
3. Notify the customer of the rejection

WHERE the order contains other items, THE system SHALL continue processing those items normally after cancellation resolution.

### Reason Text Input

WHEN a customer submits a cancellation request, THE system SHALL:
1. Require non-empty reason text (minimum 1 character)
2. Accept up to 1000 characters in the reason field
3. Display character count during input

WHEN a seller responds to a cancellation request, THE system SHALL:
1. Allow optional reason text for rejection (if provided, display to customer)
2. Store the seller's reason as part of the request snapshot

WHERE the reason text exceeds 1000 characters, THE system SHALL reject the submission with an error message.

### Snapshot Creation on Response

WHEN a seller responds to a cancellation request (approval or rejection), THE system SHALL:
1. Create an immutable snapshot of the request state at that moment
2. Include the request ID, order item ID, customer ID, seller ID, original reason, status before response, and response details
3. Preserve the snapshot timestamp

WHERE an administrator needs to review a cancellation request for dispute resolution, THE system SHALL allow viewing all historical snapshots for the request.

THE system SHALL preserve cancellation request snapshots even after associated orders are completed or items are refunded.

### Inventory Restoration

WHEN a cancellation request is approved, THE system SHALL:
1. Create an inventory record with positive quantity change for the cancelled variant
2. Set the reason code to 'cancel' in the inventory record
3. Associate the inventory record with the order ID and order item ID
4. Update the variant's current stock quantity accordingly

WHERE the cancellation request was approved after inventory was reserved for the order, THE system SHALL release the reserved quantity back to available stock.

WHEN inventory restoration occurs, THE system SHALL log the restoration event for audit purposes.

### Item-Level Scope and Order Impact

WHEN a cancellation request is processed, THE system SHALL:
1. Affect only the specific order item referenced in the request
2. Leave other items in the same order unaffected
3. Maintain separate statuses for each item within the order

WHERE all items in an order are cancelled, THE system SHALL change the overall order status to 'cancelled'.

WHERE the order contains items from multiple sellers, THE system SHALL process cancellation requests independently per seller (different sellers handle their own items separately).

THE system SHALL NOT allow cancellation requests for entire orders—cancellation is strictly item-level only.

## RefundRequest Concept

A RefundRequest represents a customer’s request to refund a delivered order item. Customers must request within 7 days of delivery and include a reason. Sellers can approve or reject the request, and every response creates a snapshot. Approved refunds restore inventory and complete the return process. Like cancellations, refunds are handled per item and do not affect other items in the same order.

### Refund Request Initiation

WHEN a customer initiates a refund request for a delivered order item, THE system SHALL:
1. Require the customer to provide a reason text
2. Limit the request to within 7 days after the item's delivery date
3. Associate the request with the specific order item and its seller

IF the item has not been delivered yet, THE system SHALL reject the request.
IF more than 7 days have passed since delivery, THE system SHALL reject the request.

### Seller Approval Workflow

WHEN a seller receives a pending refund request for an item they fulfilled, THE system SHALL:
1. Allow the seller to approve or reject the request
2. Require the seller to provide approval notes when rejecting
3. Update the request status based on the seller's decision
4. Create a snapshot of the request state at the time of response

WHEN the seller approves the request, THE system SHALL:
1. Process a refund for the item
2. Restore the item's stock quantity (via an inventory record)
3. Update the order item status to "refunded"

WHEN the seller rejects the request, THE system SHALL:
1. Update the order item status to remain unchanged
2. Preserve the refund request record and rejection reason for audit

### Request State Snapshots

WHEN a seller responds to a refund request, THE system SHALL:
1. Create a refund request snapshot that records the request state before the change
2. Include the original reason, status, and any relevant timestamps
3. Preserve the snapshot permanently as part of the audit trail

WHILE a refund request exists, THE system SHALL:
1. Allow administrators and involved parties (customer, seller) to view associated snapshots
2. Ensure snapshots cannot be modified or deleted

### Inventory Restoration

WHEN a refund request is approved, THE system SHALL:
1. Create a positive inventory record for the variant with reason code "refund"
2. Include the order reference ID for traceability
3. Restore the stock quantity to available inventory

WHERE inventory restoration occurs, THE system SHALL:
1. Recalculate the variant's current stock quantity by summing all inventory records
2. Allow the variant to become available again if stock increases above zero

### Refund Request Visibility

Customers can view all refund requests they initiated, including status and reason.
Sellers can view all refund requests for items they fulfilled, including status and approval notes.
Administrators can view all refund requests and associated snapshots for dispute resolution.

## Review Concept

A Review represents a customer’s rating and optional feedback for a product they purchased. Reviews can only be written after an item reaches 'delivered' status, and one review per product per order is allowed. Customers can edit or delete their own reviews, but deleted reviews remain in snapshot form. Reviews contribute to the product’s average rating and are displayed on the product detail page, sorted newest first.

### Review Concept

### Post-Delivery Review Submission

WHEN a customer has received an order item with status "delivered", THE system SHALL allow them to submit a review for the purchased product.

WHEN a customer submits a review for a product, THE system SHALL:
1. Require a rating between 1 and 5 stars
2. Accept optional text content (review description)
3. Associate the review with the specific order item and product
4. Ensure the customer has purchased the product (order item ownership)
5. Prevent multiple reviews for the same product per order

IF a customer attempts to review a product before the item is delivered, THE system SHALL reject the request.
IF a customer attempts to review the same product in the same order more than once, THE system SHALL reject the request.

### Review Visibility and Display

WHEN displaying a product detail page, THE system SHALL:
1. Show the average rating calculated from all non-deleted reviews for that product
2. Display the total number of non-deleted reviews
3. List all reviews sorted by newest first
4. Show reviewer display name or "deleted user" for reviews from deleted accounts
5. Show rating stars (1–5) for each review

WHEN displaying the average rating, THE system SHALL round to one decimal place.

### Review Editing

WHEN a customer edits their own review, THE system SHALL:
1. Create a review snapshot preserving the previous rating and text content
2. Update the current rating and text content
3. Update the review's updatedAt timestamp

IF a customer attempts to edit a review for a product they did not purchase, THE system SHALL reject the request.

### Review Deletion

WHEN a customer deletes their own review, THE system SHALL:
1. Create a review snapshot preserving the rating and text content before deletion
2. Mark the review as deleted
3. Update the product's average rating to exclude the deleted review

THE system SHALL:
- Continue to display review snapshots for audit and dispute resolution purposes
- Not allow deletion of review snapshots
- Preserve review data even if the customer account is deleted

### Rating Calculation Rules

THE system SHALL calculate the average rating for a product as:
- Sum of all non-deleted rating values divided by the count of non-deleted reviews
- Round to one decimal place
- Show 0.0 if no reviews exist

WHILE calculating average ratings, THE system SHALL:
- Exclude reviews that have been marked as deleted
- Include snapshots used for audit purposes in review count display (not in average calculation)
- Not include ratings from deleted customer accounts in average calculation

### Review Lifecycle and Permissions

### Review Lifecycle States

A review transitions through these states:
1. Draft: When created but before submission (optional state for UI flow)
2. Published: After successful submission and validation
3. Edited: After customer edit operation (creates snapshot but remains active)
4. Deleted: After customer deletion request (snapshot preserved, not included in calculations)

WHEN a review reaches the "published" state, THE system SHALL:
1. Calculate and update the product's average rating
2. Increment the product's review count
3. Make the review visible on the product detail page

WHEN a review reaches the "deleted" state, THE system SHALL:
1. Recalculate the product's average rating excluding the deleted review
2. Decrement the product's review count
3. Mark the review as "(deleted)" in display contexts
4. Preserve the review snapshot indefinitely for audit purposes

### One Review Per Product Per Order Rule

WHEN a customer attempts to submit a review, THE system SHALL:
1. Check if a non-deleted review already exists for that customer, product, and order combination
2. Reject the request if a review already exists
3. Allow the request only if no existing review is found

THE system SHALL prevent both:
- Multiple reviews for the same product in the same order by the same customer
- Creating a new review after an existing one has been submitted (even if later deleted)

### Review Content Requirements

WHEN submitting or editing a review, THE system SHALL:
1. Require exactly one rating value between 1 (inclusive) and 5 (inclusive)
2. Accept text content of any length up to 10,000 characters
3. Allow empty text content (text-only ratings are permitted)

IF the rating value is outside 1-5 range, THE system SHALL reject the request.
IF the text content exceeds 10,000 characters, THE system SHALL reject the request.

### Review Ownership and Permissions

A review is owned by the customer who submitted it.

THE system SHALL:
- Allow only the review owner to edit or delete their review
- Prevent other customers from viewing review submission timestamps
- Prevent sellers from editing or deleting customer reviews
- Allow sellers to view all reviews for their products
- Allow administrators to view all reviews on the platform

IF a customer attempts to edit or delete another customer's review, THE system SHALL reject the request.

### Review Display in Product Context

WHEN displaying reviews on a product detail page, THE system SHALL:
1. Show each review with its rating (visual 1-5 star indicator)
2. Show review text content (or "No text content" for empty text reviews)
3. Show the review creation timestamp
4. Show reviewer display name or "deleted user" if account was deleted
5. Not show review edit timestamps (edit history only for admins)

THE system SHALL exclude reviews from the display when:
- The review has been marked as deleted
- The associated product has been deleted by the seller

### Review Visibility for Deleted Accounts

WHEN a customer account is deleted, THE system SHALL:
1. Preserve all existing reviews and their snapshots
2. Update review display to show "deleted user" instead of the customer's name
3. Continue including the review in average rating calculations
4. Maintain all review metadata (timestamp, rating, content)

WHEN viewing a product's reviews, THE system SHALL:
- Display reviews from deleted accounts as "deleted user"
- Not reveal the deleted account's email or other PII

## ReviewSnapshot Concept

A ReviewSnapshot preserves the complete content of a review at a point in time—its rating and text—whenever it is edited. Snapshots are immutable and created automatically on edit; deleted reviews also leave snapshots behind. This ensures transparency for disputes and maintains historical integrity even if customers later change or remove their feedback. Customers and administrators can view snapshots for auditing purposes.

### Immutable Review State

WHEN a review is created or edited, THE system SHALL preserve its complete content (rating and text) in an immutable ReviewSnapshot.

THE system SHALL NOT allow any modification to an existing ReviewSnapshot.

WHEN a review is deleted, THE system SHALL create a final ReviewSnapshot preserving the last known rating and text content.

Every ReviewSnapshot shall be permanently retained and inaccessible for modification by any user or system process.

### Edit-Triggered Snapshot

WHEN a customer edits their review, THE system SHALL automatically create a new ReviewSnapshot BEFORE applying the update.

THE new ReviewSnapshot SHALL capture the complete state of the review just prior to the edit, including rating and text content.

Each edit action SHALL produce exactly one ReviewSnapshot.

ReviewSnapshots created by edits shall be timestamped with the exact date and time of the edit.

### Deleted Review Preservation

WHEN a customer deletes their review, THE system SHALL create a ReviewSnapshot containing the final rating and text content before deletion.

THE system SHALL NOT delete any ReviewSnapshot when the parent review is deleted.

Deleted reviews and their ReviewSnapshots SHALL remain accessible to administrators and customers for auditing purposes.

THE system SHALL NOT allow permanent deletion of review history, even after account deletion.

### Rating and Text Capture

WHEN a ReviewSnapshot is created, THE system SHALL capture the rating value (integer from 1 to 5) as it existed at that moment.

WHEN a ReviewSnapshot is created, THE system SHALL capture the text content (if any) exactly as written at that time.

THE system SHALL preserve the original formatting and characters in text content, including any special symbols or line breaks.

IF a review has no text content (only a rating), THE system SHALL record null/empty text in the ReviewSnapshot.

### Audit Trail for Reviews

WHEN a review's history is requested, THE system SHALL provide a chronological list of all ReviewSnapshots associated with that review.

Each ReviewSnapshot in the audit trail SHALL include its creation timestamp and type (edit or deletion).

THE system SHALL allow administrators to view the full review history for any product.

THE system SHALL allow customers to view their own review history, including snapshots.

### Historical Integrity

WHEN an order item is refunded, THE system SHALL ensure all ReviewSnapshots for reviews related to that order item remain unchanged and accessible.

WHEN a seller deletes their shop or account, THE system SHALL preserve all ReviewSnapshots for reviews written about that seller's products.

THE system SHALL guarantee ReviewSnapshots retain their fidelity regardless of subsequent product edits, seller changes, or system migrations.

THE system SHALL NOT recalculate or alter ratings reflected in ReviewSnapshots.

### Read-Only Review Version

ReviewSnapshots SHALL be accessible only for viewing purposes.

WHEN a customer or administrator views a ReviewSnapshot, THE system SHALL present the data in read-only mode without any editing controls.

THE system SHALL NOT allow any API, UI, or background process to modify ReviewSnapshot content.

ReviewSnapshots MAY be used for display in dispute resolution interfaces but shall never be editable within those interfaces.

## AdminRequest Concept

An AdminRequest represents a user’s application to gain administrative privileges. Users submit a reason text, and the request enters a pending state. Super administrators review pending requests and approve or reject them. Approved users become regular administrators and can later be promoted to super administrator. Rejected requests do not expire but can be resubmitted with updated reasons.

### Admin Role Application

WHEN a user submits a request to become an administrator, THE system SHALL:
1. Collect a reason text explaining why the user wants administrative privileges
2. Set the request status to pending
3. Assign the request to the submitting user
4. Create a timestamp for when the request was made

THE system SHALL allow users to submit only one pending admin request at a time.
IF a user has an existing pending request, THE system SHALL reject any new admin role application requests until the pending request is resolved.

### Reason Text Input

WHEN a user submits an admin role application, THE system SHALL:
1. Require a reason text explaining why the user wants administrative privileges
2. Accept the reason text as plain text content
3. Store the reason text as part of the request record
4. Display the reason text to super administrators reviewing the request

IF the reason text is empty, THE system SHALL reject the application request.
IF the reason text exceeds reasonable length, THE system SHALL reject the application request.

### Pending Status

WHEN an admin role application is submitted, THE system SHALL:
1. Automatically set the request status to pending
2. Make the request visible to super administrators for review
3. Prevent the requesting user from having another pending admin request

WHILE a request has pending status, THE system SHALL:
1. Allow the user to view their pending request
2. Allow super administrators to view the request and its reason text
3. Prevent the user from receiving administrative privileges
4. Allow the user to withdraw their pending request

THE system SHALL NOT process pending requests automatically.
THE system SHALL NOT change the status of pending requests without super administrator action.

### Super-Admin Approval Workflow

WHEN a super administrator reviews a pending admin request, THE system SHALL:
1. Allow the super administrator to view the request details including the reason text
2. Provide options to approve or reject the request
3. Allow the super administrator to add approval notes when approving
4. Require approval notes when rejecting the request

WHEN a super administrator approves an admin request, THE system SHALL:
1. Create an admin role record for the user with regular administrator grade
2. Set the request status to approved
3. Record the timestamp and approval details

WHEN a super administrator rejects an admin request, THE system SHALL:
1. Set the request status to rejected
2. Store the rejection reason
3. Record the timestamp and rejection details

### Role Promotion Path

WHEN a user's admin request is approved, THE system SHALL:
1. Grant the user regular administrator privileges
2. Create an admin role record with the grade "regular"
3. Allow the user to access administrative functions
4. Update the user's role to "admin"

WHEN a super administrator promotes a regular administrator, THE system SHALL:
1. Update their admin role grade to "super"
2. Record the promotion timestamp
3. Grant additional privileges for managing other administrators

WHILE a user has regular administrator grade, THE system SHALL:
1. Prevent them from promoting other users to super administrator
2. Allow them to approve or reject seller registrations
3. Allow them to manage categories, products, and orders

WHILE a user has super administrator grade, THE system SHALL:
1. Allow them to promote regular administrators to super administrator
2. Allow them to demote other super administrators to regular administrator
3. Prevent super administrators from demoting themselves

### Rejection Resubmission

WHEN an admin request is rejected, THE system SHALL:
1. Store the rejection status and reason
2. Allow the user to view their rejection reason
3. Permit the user to submit a new admin request

WHEN a user submits a new admin request after rejection, THE system SHALL:
1. Create a new admin request record
2. Set the new request status to pending
3. Require the user to provide a new reason text

THE system SHALL treat each admin request as a separate record.
THE system SHALL NOT automatically remove rejected requests from history.

### Status Tracking

WHEN an admin request is created, THE system SHALL:
1. Record the creation timestamp
2. Set the initial status to pending
3. Associate all status changes with timestamps

WHEN an admin request status changes, THE system SHALL:
1. Record the new status and timestamp
2. Preserve the previous status in the request history
3. Allow relevant users to view the request status and timeline

WHEN a super administrator approves or rejects an admin request, THE system SHALL:
1. Update the request status to approved or rejected
2. Record the approver's ID
3. Record the timestamp of the action
4. Store any approval or rejection notes

THE system SHALL allow users to view the current status of their own requests.
THE system SHALL allow super administrators to view the status and history of all admin requests.

## AdminRole Concept

An AdminRole defines a user’s administrative grade—regular or super—and when it was assigned. Regular administrators have broad platform oversight, while super administrators can manage other roles. Role changes are exclusive to super administrators, and self-demotion is disallowed. Admin roles determine access to seller approval, category management, product deletion, order overrides, and user banning. Each role grant or demotion is timestamped and immutable.

### Admin Role Definition

THE system SHALL assign an administrative grade to users who become administrators.

Every administrator SHALL have exactly one administrative grade at any time: "regular" or "super".

The administrative grade determines the level of platform control the user possesses.

### Regular Administrator Capabilities

WHEN a user has the "regular" administrative grade, THE system SHALL allow them to:
1. View pending seller registration requests
2. Approve or reject seller registrations with a reason
3. Suspend or unsuspend seller accounts
4. View and manage all categories (create, edit, delete)
5. View all products on the platform
6. Delete any product for policy violations
7. View all customer accounts and ban/unban them
8. View all seller accounts and ban/unban them
9. View all orders and force-cancel or force-refund items/orders

### Super Administrator Capabilities

WHEN a user has the "super" administrative grade, THE system SHALL allow them to:
1. Perform all actions available to regular administrators
2. Promote regular administrators to super administrators
3. Demote super administrators to regular administrators
4. View all pending administrator requests and their approval history

### Self-Demotion Prevention

THE system SHALL NOT allow a super administrator to demote themselves to regular administrator.

IF a user attempts to demote themselves, THE system SHALL reject the request with an error condition defined in [04-business-rules.md](./04-business-rules.md).

### Role Assignment Timestamp

WHEN a user is assigned a new administrative grade, THE system SHALL record the exact timestamp of the assignment.

THE timestamp SHALL be immutable and stored as part of the AdminRole record.

THE system SHALL preserve all historical role assignments for audit and compliance.

### Immutable Role Record

WHEN an administrative grade is assigned or changed, THE system SHALL create a new immutable AdminRole record.

Previous AdminRole records SHALL NOT be modified or deleted.

AdminRole records SHALL be used exclusively for role history tracking and compliance auditing.

### Role Access Control Determination

WHEN a request is made by an administrator, THE system SHALL determine permissions based on the user’s current administrative grade.

Admin operations SHALL be granted or denied according to the grade-specific access rules defined in [01-actors-and-auth.md](./01-actors-and-auth.md).

# Domain Relationships

Describe how concepts relate to each other from a business perspective.

## Conceptual Relationships

Describe how concepts relate to each other in business terms.

### Customer and User Relationship

WHEN a customer registers, THE system SHALL create a user account with role 'customer'.
WHEN a customer logs in, THE system SHALL authenticate using the user account's email and password.
WHEN a customer account is deleted, THE system SHALL preserve order history and reviews but mark reviews as 'deleted user'.
WHERE a customer account exists, THE system SHALL associate one customer profile with the user.
WHERE a customer has addresses, THE system SHALL associate each address with the customer's user account.


### Seller and User Relationship

WHEN a seller registers, THE system SHALL create a user account with role 'seller' and approval status 'pending'.
WHEN a seller logs in, THE system SHALL authenticate using the user account's email and password.
WHEN a seller account is deleted, THE system SHALL preserve order history and seller name in past orders.
WHERE a seller account exists, THE system SHALL associate one seller profile with the user.
WHEN a seller has products, THE system SHALL associate each product with the seller's user account.


### Product Ownership and Category Association

WHEN a product is created, THE system SHALL associate the product with a seller (via sellerId) and a category (via categoryId).
WHERE a product exists, THE system SHALL associate multiple product images with the product.
WHERE a product exists, THE system SHALL associate multiple product variants with the product.
WHERE a category has subcategories, THE system SHALL associate subcategories with the parent category via categoryId.
WHEN a seller owns products, THE system SHALL allow the seller to view only their own products.


### Order Item Ownership and Shipment Association

WHEN an order item is created, THE system SHALL associate the order item with a product, variant, seller, and customer.
WHERE an order item exists, THE system SHALL associate one cancellation request per order item.
WHERE an order item exists, THE system SHALL associate one refund request per order item.
WHERE an item is shipped, THE system SHALL associate shipment items with the order item.
WHERE multiple items belong to the same seller in one order, THE system SHALL allow them to be grouped into a single shipment.


### Review and Order Item Association

WHEN a review is created, THE system SHALL associate the review with a customer, product, and the specific order item purchased.
WHERE a review exists, THE system SHALL ensure the review is linked to a delivered order item.
WHERE a customer has purchased a product multiple times, THE system SHALL allow one review per product per order item.
WHEN a review is edited, THE system SHALL create a review snapshot preserving the prior state.
WHEN a review is deleted, THE system SHALL preserve the review snapshot but mark the review as deleted.


### Wishlist and Product Ownership

WHEN a customer adds a product to their wishlist, THE system SHALL create a wishlist item associated with the customer and product.
WHERE a product exists, THE system SHALL allow multiple customers to have wishlist items for it.
WHEN a seller deletes a product, THE system SHALL automatically remove the product from all wishlist items.
WHERE a customer has wishlist items, THE system SHALL paginate and display them.
WHEN a customer views their wishlist, THE system SHALL show product details but not variant-specific information.


### Inventory Record and Variant Association

WHEN stock changes occur, THE system SHALL create an inventory record associated with the variant.
WHERE an order item is paid, THE system SHALL create a negative inventory record for the purchased variant.
WHERE an order item is cancelled or refunded, THE system SHALL create a positive inventory record for the variant.
WHERE a seller restocks inventory, THE system SHALL create a positive inventory record with reason 'restock'.
WHERE stock adjustment is needed, THE system SHALL allow sellers to create inventory records with reason 'adjustment'.


### Snapshot and State Preservation

WHEN a product is edited, THE system SHALL create a product snapshot preserving all product fields at that moment.
WHEN a product variant is edited, THE system SHALL create a product snapshot variant preserving SKU code, options, and price.
WHERE an order is placed, THE system SHALL create product and variant snapshots associated with each order item.
WHERE a review is edited, THE system SHALL create a review snapshot preserving the rating and text content at the time of edit.
WHERE a seller profile is edited, THE system SHALL create a snapshot of the shop name, description, and logo.


### Administrative Role Ownership

WHEN a user requests admin role, THE system SHALL create an admin request associated with the user.
WHERE an admin request is approved, THE system SHALL create an admin role associated with the user and assign grade.
WHERE a super administrator exists, THE system SHALL allow them to promote regular administrators to super administrator.
WHERE an admin role exists, THE system SHALL associate all administrative actions with the role holder.
WHERE a user has an admin role, THE system SHALL prevent them from demoting themselves from super administrator.


## Lifecycle and Retention

Describe business rules for concept lifecycle and data retention from a user perspective.

### Product Lifecycle

WHEN a seller creates a product, THE system SHALL create the product with initial status "active".

WHEN a seller deletes a product, THE system SHALL:
- Remove the product from active listings
- Preserve the product snapshot for historical and legal purposes
- Mark the product as "deleted" in the system

WHILE a product has active inventory records or order items, THE system SHALL:
- Maintain all snapshots and inventory history regardless of deletion
- Preserve the relationship between product snapshots and associated order items

IF a seller attempts to delete a product that has pending order items with status "paid" or "shipped", THE system SHALL reject the deletion.

WHEN a product has been deleted by a seller, THE system SHALL:
- Prevent the product from appearing in search results
- Prevent new orders from being placed for the product
- Preserve all snapshots for audit and compliance purposes

### Variant Lifecycle

WHEN a seller adds a product variant, THE system SHALL assign initial stock quantity of 0.

WHEN a seller edits a product variant, THE system SHALL create a product variant snapshot.

WHEN a seller deletes a product variant, THE system SHALL:
- Remove the variant from active product listings
- Preserve all variant snapshots and inventory history
- Ensure the product remains visible in listings as "unavailable" if no variants remain

IF a seller attempts to delete a variant that has pending order items with status "paid" or "shipped", THE system SHALL reject the deletion.

WHILE a product has at least one active variant, THE system SHALL allow the product to be purchased.

WHEN all variants of a product are deleted, THE system SHALL mark the product as "unavailable" in search and category listings

### Order and Order Item Lifecycle

WHEN an order is successfully placed, THE system SHALL:
- Assign status "paid" to each order item
- Create snapshots of each product and variant at time of purchase
- Create snapshots of each seller profile at time of purchase
- Deduct stock quantities via inventory records
- Remove items from customer's cart

WHEN all items in an order are paid, THE system SHALL set the order status to "paid".

WHEN a seller ships all items in a shipment, THE system SHALL change those items' status to "shipped".

WHEN all items in an order are delivered, THE system SHALL set the order status to "delivered".

WHEN all items in an order are cancelled, THE system SHALL set the order status to "cancelled".

WHEN all items in an order are refunded, THE system SHALL set the order status to "refunded".

WHEN items in an order have mixed statuses (e.g., some delivered, some refunded), THE system SHALL set the order status to "partially completed".

WHEN an order item reaches status "delivered", THE system SHALL allow the customer to request a refund within 7 days.

### Review Lifecycle

WHEN a customer's order item reaches status "delivered", THE system SHALL allow the customer to write a review for that product.

WHEN a customer writes a review, THE system SHALL create the review with status "active".

WHEN a customer edits a review, THE system SHALL create a review snapshot preserving the previous state.

WHEN a customer deletes a review, THE system SHALL:
- Mark the review as "deleted"
- Preserve the review snapshot for audit purposes
- Recalculate the product's average rating excluding deleted reviews

WHILE a product has at least one non-deleted review, THE system SHALL display the product's average rating.

WHEN a customer deletes a product they purchased, THE system SHALL:
- Preserve existing reviews for that product
- Mark reviews from deleted customers as "deleted user"

### Data Retention and Archival

WHEN a customer deletes their account, THE system SHALL:
- Delete their profile information
- Preserve all order history and order snapshots
- Preserve all reviews and review snapshots
- Mark their reviews as "deleted user"

WHEN a seller deletes their account, THE system SHALL:
- Delete their shop profile information
- Preserve all order history and order snapshots
- Preserve all product snapshots
- Preserve product names in past orders as part of order snapshots

WHEN an order is completed, THE system SHALL preserve the order record indefinitely for legal and audit purposes.

WHEN an inventory record is created, THE system SHALL preserve it indefinitely to maintain complete stock history.

WHEN a snapshot is created, THE system SHALL preserve it immutably to maintain audit trail of all business state changes.

WHEN a cancellation or refund request is resolved, THE system SHALL preserve the request and its snapshots for dispute resolution purposes.

### Deletion Policy

THE system SHALL NOT permanently delete the following data:
- Order records and order snapshots
- Product snapshots and product variant snapshots
- Inventory records
- Review snapshots
- Seller profiles in historical order snapshots
- Cancellation and refund request records and snapshots

WHEN a seller deletes a product, THE system SHALL:
- Delete the product and its active variants
- Preserve all associated snapshots and inventory history
- Preserve order items containing the product or its variants

WHEN a seller deletes a variant, THE system SHALL:
- Delete the variant from active listings
- Preserve all snapshots and inventory records for the variant
- Preserve order items containing the variant

WHEN a customer deletes their account, THE system SHALL:
- Delete profile information (display name, phone number)
- Delete addresses associated with their account
- Preserve order history and order snapshots
- Preserve reviews and review snapshots

### Recovery Mechanisms

WHEN an order item is cancelled, THE system SHALL:
- Restore stock quantities via positive inventory records
- Update the order status appropriately
- Preserve cancellation request snapshots for audit

WHEN an order item is refunded, THE system SHALL:
- Restore stock quantities via positive inventory records
- Update the order status appropriately
- Preserve refund request snapshots for audit

WHEN an administrator forces cancels an order item, THE system SHALL:
- Restore stock quantities via positive inventory records
- Process refund if payment was received
- Preserve the force-cancel action in audit logs

WHEN a seller edits their profile, THE system SHALL create a snapshot preserving the previous state for dispute resolution.

WHEN a product is restored from archival for legal reasons, THE system SHALL allow administrators to view all associated snapshots and historical states.

# Business Categories and State Flows

Business category classifications and state flow definitions.

## Business Category Definitions

Define all business category classifications with their allowed values and descriptions.

### User Role Classification

THE system SHALL classify users into exactly one of the following roles: customer, seller, or admin.

WHEN a user is created, THE system SHALL assign a role from the allowed values.

WHEN a user submits an administrator request and it is approved, THE system SHALL change their role to admin.

Roles are immutable after creation except through administrator request approval or super administrator action.

### Seller Approval Status Type

THE system SHALL classify seller accounts into one of the following statuses: pending, approved, or rejected.

WHEN a seller registers, THE system SHALL set the approval status to pending.

WHEN an administrator approves a seller, THE system SHALL change the approval status to approved and allow selling.

WHEN an administrator rejects a seller, THE system SHALL set the approval status to rejected and store the rejection reason.

A seller with rejected status may submit a new registration request to reset the approval status to pending.

### Product Variant Stock Status Type

THE system SHALL classify product variant availability into the following states: in stock or out of stock.

A variant is in stock when its current stock quantity is greater than 0.

A variant is out of stock when its current stock quantity equals 0.

WHILE a variant is out of stock, THE system SHALL prevent it from being added to the cart.

WHEN a variant's stock is restored via inventory record, THE system SHALL update its availability to in stock.

### Order Item Status Type

THE system SHALL classify each order item into one of the following statuses: paid, shipped, delivered, cancelled, or refunded.

WHEN payment succeeds for an order, THE system SHALL set all order items to paid.

WHEN a seller creates a shipment for items, THE system SHALL set those items to shipped.

WHEN a customer confirms delivery or 14 days pass since shipping, THE system SHALL set the items in that shipment to delivered.

WHEN a cancellation request is approved, THE system SHALL set the corresponding item to cancelled and restore its stock.

WHEN a refund request is approved, THE system SHALL set the corresponding item to refunded and restore its stock.

### Order Overall Status Type

THE system SHALL derive the overall order status from its items using the following rules:

- IF all items are paid, THEN the order status is paid.
- IF any item is shipped and no item is delivered, THEN the order status is shipped.
- IF all items are delivered, THEN the order status is delivered.
- IF all items are cancelled, THEN the order status is cancelled.
- IF all items are refunded, THEN the order status is refunded.
- IF items are in mixed states, THEN the order status is partially completed.

THE system SHALL automatically update the order status when any item status changes.

### Cancellation/Refund Request Status Type

THE system SHALL classify both cancellation and refund requests into one of the following statuses: pending, approved, or rejected.

WHEN a customer submits a request, THE system SHALL set the status to pending.

WHEN a seller responds to a request, THE system SHALL update the status to either approved or rejected.

WHEN a request status changes to approved or rejected, THE system SHALL create a snapshot of the request state at that moment.

### Review Status Type

THE system SHALL classify reviews as active or deleted.

A review is active when it has not been deleted by its author.

WHEN a customer deletes a review, THE system SHALL mark it as deleted but preserve it for audit purposes.

THE system SHALL calculate average ratings only from active (non-deleted) reviews.

A deleted review's snapshot is preserved indefinitely and remains viewable to administrators.

### Snapshot Type Classification

THE system SHALL classify snapshots into the following types based on their triggering event:

- For product snapshots: edit, order, refund, cancel
- For product variant snapshots: edit, order, refund, cancel
- For seller profile snapshots: order, cancel, refund
- For order item snapshots: order, cancel, refund
- For review snapshots: edit

WHEN a product is edited, THE system SHALL create a product snapshot of type edit.

WHEN an order is placed, THE system SHALL create order-type snapshots for product, variant, seller profile, and order item.

WHEN a cancellation or refund is processed, THE system SHALL create corresponding snapshot types and preserve original state at the time of resolution.

## State Transitions

Define valid state transition paths for stateful concepts.

### Order Item Status Transitions

WHEN an order item is created, THE system SHALL set its status to "paid".

WHEN a seller records a shipment for an order item, THE system SHALL change its status to "shipped".

WHEN a customer confirms delivery for the shipment containing an order item, THE system SHALL change its status to "delivered".

WHEN 14 days have elapsed since the shipment status became "shipped" and the customer has not confirmed delivery, THE system SHALL automatically change the order item status to "delivered".

WHEN a cancellation request is approved, THE system SHALL change the associated order item status to "cancelled".

WHEN a refund request is approved, THE system SHALL change the associated order item status to "refunded".

IF an order contains items with mixed statuses (e.g., some delivered, some refunded), THE system SHALL set the overall order status to "partially completed".

WHILE an order item status is "paid", THE customer SHALL be able to request cancellation.

WHILE an order item status is "delivered", THE customer SHALL be able to request a refund.

WHILE an order item status is "cancelled" or "refunded", THE system SHALL prevent additional cancellation or refund requests.

### Shipment Status Transitions

WHEN a seller creates a shipment, THE system SHALL set its status to "pending".

WHEN a seller enters tracking information for a shipment, THE system SHALL change its status to "shipped".

WHILE a shipment status is "shipped", THE customer SHALL be able to confirm delivery.

WHILE a shipment status is "pending", THE system SHALL prevent delivery confirmation.

WHEN delivery is confirmed for a shipment, THE system SHALL set the shipment status to "delivered".

IF a shipment is removed (e.g., due to order cancellation), THE system SHALL set its status to "cancelled" and prevent further actions.

### Cancellation Request Workflow

WHEN a customer requests cancellation for an order item with status "paid", THE system SHALL create a cancellation request with status "pending".

WHEN a seller responds to a pending cancellation request (approve or reject), THE system SHALL update the request status accordingly and create a snapshot.

WHEN a cancellation request is approved, THE system SHALL:
1. Change the order item status to "cancelled"
2. Restore the variant's stock quantity via an inventory record
3. Process a refund if payment was already received

WHEN a cancellation request is rejected, THE system SHALL retain the order item's current status.

WHEN all items in an order are cancelled, THE system SHALL set the overall order status to "cancelled".

IF an order item has status other than "paid", THE system SHALL reject the cancellation request.

### Refund Request Workflow

WHEN a customer requests a refund for an order item with status "delivered" and within 7 days of delivery, THE system SHALL create a refund request with status "pending".

WHEN a seller responds to a pending refund request (approve or reject), THE system SHALL update the request status accordingly and create a snapshot.

WHEN a refund request is approved, THE system SHALL:
1. Change the order item status to "refunded"
2. Restore the variant's stock quantity via an inventory record
3. Process a refund to the customer

WHEN a refund request is rejected, THE system SHALL retain the order item's current status.

WHEN all items in an order are refunded, THE system SHALL set the overall order status to "refunded".

IF the item status is not "delivered", THE system SHALL reject the refund request.

IF the delivery confirmation occurred more than 7 days ago, THE system SHALL reject the refund request.

### Seller Approval State Transitions

WHEN a seller registers, THE system SHALL set their account approval status to "pending".

WHEN an administrator reviews a pending seller application, THE system SHALL allow approval or rejection.

WHEN a seller application is approved, THE system SHALL change the approval status to "approved" and enable selling capabilities.

WHEN a seller application is rejected, THE system SHALL set the status to "rejected" and store the rejection reason.

WHEN a seller's account is suspended by an administrator, THE system SHALL change the approval status to "suspended" and disable product creation/editing.

WHEN a seller's account is unsuspended by an administrator, THE system SHALL restore the approval status to "approved".

IF a seller has status "rejected" or "suspended", THE system SHALL prevent them from creating or editing products.

### Seller Account Deletion Conditions

WHEN a seller initiates account deletion, THE system SHALL validate that:
1. They have no pending orders with status "paid" or "shipped"
2. They have no pending cancellation or refund requests

IF validation fails, THE system SHALL reject the deletion and provide details.

WHEN validation succeeds, THE system SHALL:
1. Delete the seller's active products and inventory records
2. Preserve order history and product snapshots
3. Preserve the seller's shop name in past orders
4. Permanently delete the seller profile and associated data

### Product Availability State Transitions

WHEN a product has no variants or all variants are deleted/out of stock, THE system SHALL set its availability status to "unavailable".

WHEN at least one variant has stock quantity > 0, THE system SHALL set its availability status to "available".

WHEN a variant's stock reaches 0, THE system SHALL mark it as "out of stock".

WHILE a variant is "out of stock", THE system SHALL prevent it from being added to the cart.

WHEN the last variant of a product is deleted, THE system SHALL set the product's availability to "unavailable" and remove it from listings.

WHEN a seller adds at least one new variant with stock > 0, THE system SHALL restore the product's availability to "available".

### Review Eligibility and State Transitions

WHEN an order item status changes to "delivered", THE system SHALL make the associated product eligible for review.

WHEN a customer writes a review for an eligible product, THE system SHALL create a review with rating and optional text.

WHEN a customer edits a review, THE system SHALL create a review snapshot and preserve the previous state.

WHEN a customer deletes a review, THE system SHALL:
1. Mark the review as deleted
2. Preserve the snapshot
3. Recalculate the product's average rating from non-deleted reviews

WHILE an order item status is not "delivered", THE system SHALL prevent review submission for its product.

WHEN a product is deleted by the seller, THE system SHALL preserve all existing reviews (as deleted user) and snapshots.

### Admin Role Management State Transitions

WHEN a user submits an administrator request, THE system SHALL set the request status to "pending".

WHEN a super administrator approves a pending request, THE system SHALL:
1. Grant the user an admin role with grade "regular"
2. Set the request status to "approved"

WHEN a super administrator promotes a regular administrator, THE system SHALL change their grade to "super".

WHEN a super administrator demotes a super administrator (not themselves), THE system SHALL change their grade to "regular".

WHEN an administrator request is rejected, THE system SHALL set the status to "rejected" and store notes.

WHILE an admin role exists, THE system SHALL enforce grade-based access controls (super admins can manage users and sellers; regular admins have limited management capabilities).

### Product Snapshot Creation Triggers

WHEN a seller edits a product, THE system SHALL create a product snapshot with type "edit".

WHEN an order is placed including a product variant, THE system SHALL create a product snapshot with type "order" and preserve the variant state.

WHEN a cancellation is approved, THE system SHALL create a product snapshot with type "cancel".

WHEN a refund is approved, THE system SHALL create a product snapshot with type "refund".

WHEN a product is deleted by the seller or administrator, THE system SHALL preserve all existing snapshots.

WHILE a product exists, THE system SHALL allow sellers and administrators to view all associated snapshots.

THE system SHALL NOT allow modification of any existing snapshot.

THE system SHALL preserve product snapshots indefinitely.