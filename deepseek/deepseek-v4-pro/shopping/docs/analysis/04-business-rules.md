**shoppingMall — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Every user on the platform must have a unique email address — the system rejects duplicate email registrations for any role including customer, seller, and administrator. The email must be in a valid format and the password must meet minimum security requirements. A user's role determines what actions they can perform: customers browse and purchase products, sellers manage products and fulfill orders, and administrators oversee the platform. A user can hold multiple roles simultaneously (for example, a seller may also be a customer). When a user deletes their account as a customer, their profile information is removed but their orders and reviews are preserved — reviews display as being from a deleted user. When a seller deletes their account, all their products are removed from listings, but order history and snapshots remain intact. Sellers can only delete their account when no pending orders, cancellations, or refund requests exist for any of their products. Administrators can ban customer accounts, preventing login, and can ban seller accounts, which also prevents login while preserving existing orders. Banned users cannot access the platform until an administrator unbans them. Super administrators are a special grade that can promote or demote other administrators but cannot demote themselves.

### Email Validation and Uniqueness

IF a registration or email change attempt uses an email address that is already associated with any user account on the platform, THEN the system SHALL reject the request.

Email uniqueness applies across all roles — a seller cannot register with an email already used by a customer, and a customer cannot register with an email already used by a seller or administrator.

THE system SHALL validate that the email address conforms to a standard email format before accepting any registration.

IF the email address does not conform to a valid email format, THEN the system SHALL reject the registration.

### Password Security Requirements

THE system SHALL enforce minimum password requirements for all user registrations and password changes, regardless of the user's role.

IF a password does not meet the minimum length requirement, THEN the system SHALL reject the registration or password change.

Password requirements apply equally to all roles: customer, seller, and administrator.

### Multiple Roles per User

THE system SHALL allow a user to hold multiple roles simultaneously.

WHEN a user holds multiple roles, they may perform actions permitted by any of their assigned roles. A user's role determines what actions they can perform on the platform.

A user registered as a customer who later becomes a seller retains their customer capabilities for browsing and purchasing products.

A user registered as a seller retains their customer capabilities for purchasing products from other sellers.

Administrators may also hold customer or seller roles in addition to their administrative role.

### Customer Account Deletion Rules

THE system SHALL NOT require a display name at the time of customer sign-up. The display name is optional and may be provided later or omitted entirely.

WHEN a customer deletes their account, THE system SHALL delete their profile information including display name (if provided) and phone number.

WHEN a customer deletes their account, THE system SHALL preserve all orders and order history associated with that customer for seller records and legal purposes.

WHEN a customer deletes their account, THE system SHALL preserve all reviews written by that customer.

WHILE a review's author account has been deleted, THE system SHALL display the review as being from a deleted user.

### Seller Account Deletion Conditions

IF a seller has any order items in paid or shipped status for any of their products, THEN the system SHALL reject the account deletion request.

IF a seller has any pending cancellation requests for any of their products, THEN the system SHALL reject the account deletion request.

IF a seller has any pending refund requests for any of their products, THEN the system SHALL reject the account deletion request.

WHEN a seller's account deletion is accepted and processed, THE system SHALL delete all their products from listings.

WHEN a seller's account is deleted, THE system SHALL preserve the seller's shop name in past orders and order history.

### Account Banning Rules

THE system SHALL allow administrators to ban customer accounts.

WHILE a customer account is banned, THE system SHALL prevent that customer from logging in to the platform.

THE system SHALL allow administrators to ban seller accounts.

WHILE a seller account is banned, THE system SHALL prevent that seller from logging in to the platform. Existing orders associated with the banned seller remain preserved.

THE system SHALL allow administrators to unban previously banned customer or seller accounts, restoring their ability to log in.

### Administrator Grade Rules

THE system SHALL support two administrator grades: regular administrator and super administrator.

The system SHALL allow super administrators to promote regular administrators to super administrator grade.

THE system SHALL allow super administrators to demote other super administrators to regular administrator grade.

IF a super administrator attempts to demote themselves, THEN the system SHALL reject the request. A super administrator cannot demote their own grade under any circumstances.

## CustomerProfile Rules

Each customer must have a profile containing a display name and a phone number. The display name is required — a customer cannot have an empty or missing display name. The phone number must be provided and stored in a valid format, though the exact format may vary by country. A customer can edit their display name and phone number at any time. Editing the display name does not affect the customer's ability to place orders or write reviews — existing reviews continue to show the current display name unless the account is deleted. The customer profile is created at the time of customer registration. There are no restrictions on how frequently a customer can change their profile information. The display name does not need to be unique across the platform; multiple customers can share the same display name.

### Display Name Validation

The display name is a required field. A customer profile cannot exist without a display name, and the display name cannot be empty or consist solely of whitespace characters. If a customer attempts to save their profile with a missing or blank display name, the request is rejected.

Display name uniqueness is not enforced across the platform. Multiple customers may share the same display name without restriction.

The display name may be changed at any time by the customer. There is no cooldown period or restriction on how frequently changes can occur. When the display name is changed, the new name is immediately reflected wherever the customer's name is shown, including on existing reviews. Reviews continue to show the customer's current display name unless the account is deleted, in which case reviews display as "deleted user."


### Phone Number Validation

The phone number is a required field. A customer profile cannot be saved without a phone number, and the phone number cannot be empty.

The phone number must conform to a valid format. The system shall accept international phone number formats, including country codes. The phone number must contain only digits, an optional leading plus sign, and allowable separators such as spaces, hyphens, or parentheses. If the phone number contains invalid characters or does not match a recognized format, the request is rejected with an indication that the phone number format is invalid.


### Profile Edit Constraints

There are no frequency restrictions on profile edits. A customer may change their display name and phone number as many times as they wish, including multiple consecutive changes within a short period. No rate limits apply to profile editing operations.

Editing the customer profile does not affect existing orders. Orders placed before a profile change retain the shipping address and order details as they were at the time of purchase; they are not retroactively updated to reflect new profile information. Editing the profile also does not affect the customer's ability to place new orders, write reviews, or use any other platform features.


### Profile Lifecycle Rules

The customer profile is created automatically at the time of customer registration. The registration process requires the customer to provide a phone number as part of the initial sign-up. A display name is not required at registration; the customer may set or update their display name at any later time through profile editing. If no display name is set, the profile exists without a display name until one is provided. Once a display name has been set, the validation rules from Display Name Validation apply — the display name cannot be saved as empty or blank.

A customer profile cannot be deleted independently of the customer account. The profile exists for the duration of the account's active lifetime. When a customer deletes their account, the profile information is deleted along with the account, while orders and reviews are preserved according to the account deletion rules (defined in User Rules).


## SellerProfile Rules

Every seller must have a profile consisting of a shop name, a shop description, and a logo image. The shop name is required and serves as the public-facing identity of the seller on the platform. The shop description is required and helps customers understand what the seller offers. The logo image is optional but when provided, it visually represents the shop. Every time a seller edits their shop name, description, or logo, a snapshot is created that records the previous state — this ensures traceability for dispute resolution. Sellers can edit their profile information at any time, provided their account is not suspended. When a seller account is deleted, the shop name in past order snapshots is preserved so that historical order records remain accurate. Customers can view any seller's profile, including the shop name, description, and logo, from product detail pages and order histories. When a seller is suspended by an administrator, their profile remains visible but their products are hidden from search and category listings.

### Shop Name Requirements

The shop name is not required at the time a seller creates their account. A seller may register and have an active account without immediately setting a shop name. However, a shop name must be provided before the seller can list any products or have their shop become visible to customers on the platform. Once set, the shop name serves as the public-facing identity of the seller across the platform, appearing on product listings, search results, order histories, and the seller's own profile page. There is no uniqueness constraint enforced on shop names — different sellers may operate under the same shop name.

### Shop Description Requirements

The shop description is not required at the time a seller creates their account. A seller may register without immediately providing a shop description. However, a shop description must be provided before the seller can list any products or have their shop become visible to customers on the platform. Once set, the shop description helps customers understand what the seller offers and is displayed on the seller's profile page.

### Logo Image Rules

The logo image is optional for seller profiles. A seller may choose to provide a logo to visually represent their shop, or they may leave it unset. When provided, the logo is displayed on the seller's profile page alongside the shop name and description. There is no default logo — if no logo is uploaded, no image placeholder is shown for the seller profile.

### Profile Edit and Snapshot Rules

Every time a seller edits their profile — whether changing the shop name, shop description, or logo image — a snapshot is created. The snapshot records the previous state of the profile fields before the edit was applied, along with the timestamp of when the change was made and the identity of the user who made the change. Snapshots are immutable and cannot be deleted by the seller or any other actor. Sellers can view the snapshots of their own profile. Administrators can view the snapshots of any seller's profile for oversight and dispute resolution purposes.

### Account Status and Edit Restrictions

A seller can edit their profile only if their account is not suspended. When a seller account is suspended by an administrator, the seller is prevented from editing their shop name, shop description, or logo image. The seller can resume editing their profile once the suspension is lifted. There are no restrictions on how frequently a non-suspended seller may edit their profile.

### Profile Visibility Rules

Seller profiles are visible to customers. A customer can view any seller's profile page, which displays the shop name, shop description, and logo image. Seller profiles are accessible from product detail pages (via the seller shop name link) and from the customer's order history. When a seller account is suspended by an administrator, the seller's profile — including the shop name, description, and logo — remains visible to customers. Suspension only hides the seller's products from search and category listings; it does not hide the seller's profile itself.

### Shop Name Preservation in Order History

When a seller deletes their account, their shop name as it appeared in past orders is preserved. The order item snapshots created at the time of purchase retain the seller's shop name and logo exactly as they were when the order was placed. This ensures that a customer's order history remains accurate and complete even after the seller is no longer on the platform. The preserved shop name in order snapshots is immutable and cannot be changed by any actor.

## SellerApproval Rules

Every seller registration must go through an administrator approval process before the seller can list products. The approval has three possible statuses: pending, approved, and rejected. A newly registered seller starts in the pending status and cannot sell until approved. When an administrator rejects a seller, they must provide a rejection reason — the reason is visible to the seller so they understand what needs to be corrected. Rejected sellers can submit a new registration request, which resets the approval status to pending. Approved sellers can immediately begin creating products and selling on the platform. Administrators manage approvals through a dedicated list of pending requests. There is no automatic approval or expiration — a seller remains in pending status indefinitely until an administrator acts on the request. The approval status is visible to the seller so they can check whether they are pending, approved, or rejected at any time.

### Approval Status Rules

THE system SHALL assign every seller registration the status "pending" upon initial submission.

THE system SHALL support exactly three approval statuses: "pending", "approved", and "rejected".

WHEN a seller registration is submitted, THE system SHALL set the status to "pending" and the seller cannot list or sell products until the status changes to "approved".

THE system SHALL NOT automatically approve any seller registration — an administrator must explicitly approve or reject each request.

THE system SHALL NOT expire pending approvals — a seller remains in "pending" status indefinitely until an administrator acts on the request.

THE system SHALL allow the seller to view their current approval status at any time.

### Pending Seller Restrictions

WHILE a seller's approval status is "pending", THE system SHALL prevent the seller from creating products.

WHILE a seller's approval status is "pending", THE system SHALL prevent the seller from editing products.

WHILE a seller's approval status is "pending", THE system SHALL prevent the seller's products from appearing in search results and category listings.

WHEN a seller's approval status changes to "approved", THE system SHALL immediately allow the seller to create products and begin selling.

WHEN a seller is suspended, THE system SHALL apply suspension restrictions regardless of approval status — an approved but suspended seller cannot create or edit products (see suspension rules).

### Rejection Requirements

WHEN an administrator rejects a seller registration, THE system SHALL require a rejection reason as text.

IF the rejection reason is empty or not provided, THEN THE system SHALL reject the administrator's action and prevent the status change.

THE system SHALL store the rejection reason and make it visible to the rejected seller.

THE system SHALL record the timestamp when the rejection occurred.

WHEN a seller views their approval status and the status is "rejected", THE system SHALL display the rejection reason alongside the status.

### Reapplication Process

WHEN a rejected seller submits a new registration request, THE system SHALL reset the approval status to "pending".

THE system SHALL preserve the previous rejection record, including the reason and timestamp, even after the seller reapplies and the status resets to "pending".

WHEN the approval status resets to "pending" due to reapplication, THE system SHALL treat the new request as a fresh submission for administrator review.

THE system SHALL allow rejected sellers to reapply any number of times — there is no limit on reapplication attempts.

### Administrator Approval Management

THE system SHALL provide administrators with a list of all seller registrations that have the "pending" approval status.

THE system SHALL allow administrators to approve a pending seller registration, changing the status to "approved".

THE system SHALL allow administrators to reject a pending seller registration with a required reason, changing the status to "rejected".

WHEN a seller registration is approved, THE system SHALL record the approving administrator and the approval timestamp.

WHEN a seller registration is rejected, THE system SHALL record the rejecting administrator, the rejection reason, and the rejection timestamp.

THE system SHALL allow administrators to view the full history of a seller's approval requests, including previous rejections and re-submissions.

## Address Rules

Customers can add multiple shipping addresses to their account. Each address must have a recipient name, phone number, street address, city, state or province, postal code, and country — all fields are required. A customer can designate exactly one address as the default shipping address; when checking out, the default address is pre-selected unless the customer chooses a different one. If a customer has only one address, it is automatically treated as the default. Addresses can be edited and deleted by the customer at any time. When an address is deleted, it cannot be used for future orders, but it remains associated with any past orders that used it — the order preserves the shipping address as a snapshot at the time of purchase. There is no limit on how many addresses a customer can add. Each address is independent; editing one address does not affect any others.

### Address Field Validation

WHEN a customer creates or edits a shipping address, THE system SHALL require all of the following fields to be provided:

- Recipient name
- Phone number
- Street address
- City
- State or province
- Postal code
- Country

IF any of the above fields is missing, empty, or consists only of whitespace, THEN THE system SHALL reject the address submission.

IF all required fields are provided, THEN THE system SHALL accept the address.

### Default Address Rule

A customer SHALL have exactly one default shipping address at all times.

WHEN a customer has only one address on file, THE system SHALL automatically treat that address as the default.

WHEN a customer sets a different address as the default, THE system SHALL designate the newly selected address as the default and remove the default designation from the previously default address. The previously default address remains available as a non-default address.

WHEN the current default address is deleted, THE system SHALL reject the deletion unless another address exists to take over the default role. IF another address exists, THE system SHALL automatically designate the most recently created remaining address as the new default upon deletion of the old default.

### Address Lifecycle and Past Order Preservation

WHEN a customer deletes an address, THE system SHALL remove it from the customer's active address list. The deleted address SHALL no longer be available for selection in future checkouts.

WHEN an address has been used in any past order, THE system SHALL preserve that address as part of the order record — the order retains its own copy of the shipping address as it existed at the time of purchase. Deletion of the address from the customer's profile does not affect the address data stored with past orders.

### Address Limits and Independence

A customer SHALL have no upper limit on the number of shipping addresses they can add to their account.

Each address SHALL be independent. Editing one address — including changing its recipient name, phone number, street address, city, state or province, postal code, or country — SHALL NOT affect any other address on the customer's account. Changes to one address do not propagate to other addresses.

## Category Rules

Categories organize products on the platform and can have at most one level of nesting — a category can be a top-level category or a subcategory of another category, but subcategories cannot have their own subcategories. Each category must have a name and a description. Category names should be unique within their parent scope to avoid confusion. Only administrators can create, edit, or delete categories. When a category is deleted, products that were assigned to that category become uncategorized — they are not deleted, but they no longer appear under that category in browsing or search filters. Customers can browse the full list of all categories and view products within any specific category. Products must be assigned to a category at creation, but they can be assigned to either a top-level category or a subcategory. Administrators can edit the name and description of existing categories at any time.

### Category Nesting Constraints

The platform supports at most one level of category nesting. A category is either a top-level category (having no parent category) or a subcategory of exactly one top-level category.

THE system SHALL NOT permit a subcategory to have its own child subcategories. Any attempt to create a subcategory under an existing subcategory SHALL be rejected.

THE system SHALL treat all top-level categories as peers and all subcategories as children of their respective parent categories. There is no deeper hierarchical structure beyond this single nesting level.

### Category Name and Description Requirements

Every category requires a name and a description. Both fields are mandatory for creation and must be present when editing.

IF the category name is missing or empty at creation or edit, THEN the system SHALL reject the request.

IF the category description is missing or empty at creation or edit, THEN the system SHALL reject the request.

A category name may consist of any displayable text. There is no enforced minimum or maximum character length beyond what the system architecture naturally supports, unless explicitly specified by platform policy.

### Category Name Uniqueness

Category names must be unique within their parent scope to avoid confusion for customers and administrators.

For top-level categories: no two top-level categories may share the same name.

For subcategories: no two subcategories under the same parent category may share the same name. However, two subcategories under different parent categories may have the same name (for example, both an "Electronics" parent and a "Books" parent may each have an "Accessories" subcategory).

IF an administrator attempts to create or rename a category to a name already in use within the same parent scope, THEN the system SHALL reject the request.

### Administrator-Only Category Management

Only administrators may create, edit, or delete categories. Customers and sellers do not have access to category management functions.

IF a user who is not an administrator attempts to create, edit, or delete a category, THEN the system SHALL reject the request.

Administrators may edit an existing category's name and description at any time. There is no restriction on how frequently a category may be edited.

### Category Deletion Consequences

When an administrator deletes a category, the products assigned to that category are not deleted. Instead, those products become uncategorized — they lose their category assignment and no longer appear when browsing or searching by that category.

WHEN a category is deleted, THE system SHALL remove the category assignment from all products that were assigned to it.

Uncategorized products remain visible in general search results (when matching by name or other criteria) but do not appear under any category listing. Administrators may later reassign uncategorized products to another category.

IF a deleted category was a parent category, THEN all of its subcategories SHALL also be deleted, and products in those subcategories SHALL become uncategorized as well.

### Product Category Assignment Rules

Every product must be assigned to a category at the time of creation. The assignment may be to either a top-level category or a subcategory.

IF a product is created without a category assignment, THEN the system SHALL reject the creation request.

A product is assigned to exactly one category at any given time. Assigning a product to a new category replaces the previous assignment.

Sellers may change the category of their own products at any time, provided the target category exists and is not deleted.

### Category Browsing Expectations

All users — including customers, sellers, and administrators — may browse the full list of all categories on the platform. The category list displays all top-level categories and their subcategories.

When a user selects a category, the system shows products assigned to that category. Products are displayed with their main image, name, base price (or price range if variants differ), seller shop name, and average rating.

WHEN browsing a top-level category, THE system SHALL show products assigned directly to that top-level category as well as products assigned to any of its subcategories.

Category browsing results follow the standard product listing rules for pagination, sorting, and filtering as defined in the product search and listing requirements.

## Product Rules

Every product must have a name, a description, a category, and a base price — all four fields are required for creation. The category can be either a top-level category or a subcategory. The base price serves as the default price for the product when no variant-specific price override is set. Products belong exclusively to the seller who created them; only that seller can edit or delete their own products. Every product edit creates a snapshot that preserves the complete state of the product at that point, including its variants. A product must have at least one variant to be purchasable; products with no variants remain visible in search results but are shown as unavailable. Sellers can delete their own products only when no pending order items exist for any variant — pending means paid or shipped status — and no pending cancellation or refund requests exist. Deleting a product also removes all its variants and inventory records. Deleted products no longer appear in search results or category listings. When a seller is suspended, all their products are hidden from search and category listings and cannot be purchased, though the seller can still process existing orders for those products.

### Product Creation Validation

THE system SHALL require a name for every product.

THE system SHALL require a description for every product.

THE system SHALL require a category for every product.

THE system SHALL require a base price for every product.

IF any of these four fields is missing, THEN THE system SHALL reject the product creation.

THE system SHALL allow the assigned category to be either a top-level category or a subcategory.

THE system SHALL use the base price as the default price for the product when no variant sets a price override.

### Product Ownership

THE system SHALL assign each newly created product to the seller who created it.

IF a seller other than the owning seller attempts to edit or delete the product, THEN THE system SHALL reject the request.

### Product Edit and Snapshot Creation

WHEN a seller edits a product, THE system SHALL create a snapshot that captures the complete product state before the edit.

The snapshot SHALL include all product fields and the state of all variants at the moment of the edit, as defined in the Snapshot Rules.

### Product Purchasability

THE system SHALL require a product to have at least one variant to be purchasable.

WHILE a product has no variants, THE system SHALL display it as "unavailable" in search results and category listings.

IF a customer attempts to add a product with no variants to their cart, THEN THE system SHALL reject the request.

### Product Deletion Constraints

IF any variant of the product has an order item with "paid" or "shipped" status, THEN THE system SHALL block deletion of the product.

IF any variant of the product has a pending cancellation request, THEN THE system SHALL block deletion of the product.

IF any variant of the product has a pending refund request, THEN THE system SHALL block deletion of the product.

WHEN a product is deleted, THE system SHALL also delete all of its variants and inventory records.

WHEN a product is deleted, THE system SHALL preserve all existing product snapshots.

### Product Visibility

WHEN a product is deleted, THE system SHALL remove it from all search results and category listings.

WHEN a seller is suspended, THE system SHALL hide all of that seller's products from search results and category listings.

WHILE a seller is suspended, THE system SHALL block purchases of their products; however, the seller can still process existing orders for those products, including shipping items and responding to cancellation and refund requests.

## ProductImage Rules

Sellers can upload multiple images for each product. Images have a display order that determines their sequence — the first image in the order serves as the main or thumbnail image shown in search results and product listings. Images can be reordered by the seller at any time, changing which image appears as the main thumbnail. Sellers can delete individual images from their products without affecting the product itself. All image changes — including uploads, reordering, and deletions — are captured in product snapshots, preserving the image state at the time of the snapshot. There is no explicit limit on the number of images a product can have, but each image must be associated with exactly one product. When a product is deleted, all its images are also removed from the system. Image changes are only allowed for the product's owner and only when the seller account is not suspended.

### Image Association

Each image must be associated with exactly one product. An image cannot exist independently of a product.

A product may have multiple images. There is no upper limit on the number of images a product can have.

When a product is deleted by its owner or an administrator, all images associated with that product are deleted from the system. No images remain orphaned after product deletion.

### Display Order and Main Thumbnail

Each image has a display order value that determines its position in the sequence for the product.

The image occupying the first position in the display order — the lowest order value — serves as the main thumbnail image. This thumbnail is displayed in product listings, search results, category views, and anywhere a compact representation of the product is shown.

Sellers can reorder images at any time by modifying the display order values. When the display order changes, the image that becomes first in sequence becomes the new main thumbnail. The remaining images follow in their updated sequence positions.

### Image Modification Permissions

Only the seller who owns the product can add new images, reorder existing images, or delete images from that product. No other seller, customer, or administrator can modify a product's images.

WHILE a seller account is suspended, THE system SHALL prevent that seller from adding, reordering, or deleting images for any of their products. Existing images remain visible to customers during the suspension period, but no image modifications are permitted until the suspension is lifted.

### Image Deletion

Sellers can delete individual images from their products. Deleting a single image removes only that image — the product and all other images are unaffected.

After an image is deleted, the remaining images maintain their relative display order positions. IF the deleted image was the main thumbnail (first in display order), THEN the next image in sequence becomes the new main thumbnail.

IF a seller attempts to delete an image that does not exist or is not associated with the specified product, THEN the system SHALL reject the request.

### Snapshot Capture for Image Changes

All image-related changes are captured in product snapshots. This includes:
- Uploading a new image
- Reordering images (changing display order values)
- Deleting an image

WHEN a product snapshot is created, THE system SHALL record the complete state of all images at that moment, including each image's URL and its display order position. This ensures the full visual presentation of a product at any point in time is preserved and can be reviewed by authorized parties (the product owner and administrators) for dispute resolution.

## ProductVariant Rules

Each product variant must have a unique SKU code that identifies it within the seller's inventory. The SKU code is required for every variant. Variants represent specific combinations of option values — for example, a red color and large size — and these option values are required. Each variant can optionally have a price that overrides the product's base price; if no price is set, the variant defaults to the base price. Stock quantity is required and starts at zero until the seller adds inventory. A product must have at least one variant to be purchasable. Variants can be edited by the product's owner, and every edit creates a snapshot capturing the previous state of the SKU code, option values, and price. Variants can be deleted only when no pending order items exist for that variant — pending means paid or shipped — and no pending cancellation or refund requests exist. When a variant is deleted, its inventory records are also removed. Out-of-stock variants are still visible on the product detail page but are shown as unavailable and cannot be added to the cart.

### SKU Code Uniqueness

Every product variant must have a SKU code. The SKU code is a required field and cannot be empty or blank. Within a single seller's inventory, no two active variants may share the same SKU code — each SKU code must be unique across all of that seller's products and variants. If a seller attempts to create or edit a variant to use a SKU code already in use by another of their active variants, the request is rejected.

When a variant is deleted, its SKU code is released and may be reused by the seller for a new variant. Variants belonging to different sellers may have the same SKU code without conflict, as uniqueness is scoped per seller.

### Option Values Requirement

Each variant must define its option values — the specific combination of attributes that distinguish it from other variants of the same product. Option values are required and cannot be empty. For example, a clothing product might have variants defined by color and size, such as "Red / Large" or "Blue / Small".

A variant with missing or empty option values is rejected at creation or edit time. Option values serve as the primary way for customers to differentiate between variants when making a purchase decision.

### Variant Price Override

A variant may optionally specify its own price that overrides the product's base price. Setting a variant-specific price is not required — it is entirely optional. This allows sellers to charge different amounts for different variants (for example, a larger size or premium color may cost more).

If a variant does not have an explicit price set, the product's base price is used as the effective price for that variant for all purposes including display, search, cart, and order calculations.

If a variant does specify a price, that price must be a positive number. A variant price of zero or a negative value is rejected.

### Stock Initialization

When a variant is first created, its stock quantity is zero by default. No stock is assumed — the seller must explicitly add inventory through restocking before the variant can be purchased.

Stock quantity cannot be set to a negative value manually. The only way stock decreases is through order placement (automatic negative inventory record) or seller-initiated adjustments. The effective stock at any moment is the sum of all inventory records for that variant.

### Minimum Variant Requirement

A product must have at least one variant to be purchasable. If a product has no variants, it is still visible in search results and category listings but is displayed as "unavailable" — customers can view the product but cannot add it to their cart or proceed to checkout with it.

If a seller deletes the last remaining variant of a product, the product automatically becomes unpurchasable and is shown as unavailable. The seller can restore purchasability by adding at least one new variant.

### Variant Edit and Snapshot Creation

When a seller edits a variant — changing its SKU code, option values, or price — a snapshot is automatically created before the changes are applied. The snapshot captures the variant's state immediately prior to the edit, recording the previous values of the SKU code, option values, and price.

Snapshots are immutable and cannot be deleted. They serve as an audit trail for dispute resolution and allow the seller to review the history of changes made to each variant.

### Variant Deletion Rules

A variant cannot be deleted if there are any pending order items associated with it. An order item is considered pending when its status is "paid" or "shipped" — meaning the item has been purchased but not yet delivered, cancelled, or refunded.

Additionally, a variant cannot be deleted if there is any pending cancellation request or pending refund request for any order item associated with that variant. A cancellation or refund request is pending while it awaits the seller's response (approval or rejection).

If any of these blocking conditions exist, the deletion attempt is rejected and the seller is informed of which orders or requests are preventing deletion.

When a variant is successfully deleted, all inventory records belonging to that variant are also removed. The variant no longer appears on the product detail page and cannot be purchased. Order items that already reference the deleted variant are unaffected — their snapshots preserve the variant's information at the time of purchase.

### Out-of-Stock Visibility and Cart Restrictions

When a variant's current stock quantity reaches zero, it is displayed as "out of stock" on the product detail page. The variant remains visible — customers can see that it exists and view its option values and price — but it is clearly marked as unavailable.

Out-of-stock variants cannot be added to the shopping cart. If a customer attempts to add an out-of-stock variant, the request is rejected. If a variant is already in a customer's cart and its stock subsequently drops to zero, the cart displays a warning and the item is marked as unavailable; it cannot proceed to checkout until the variant is restocked or the item is removed from the cart.

If a variant's stock is greater than zero but less than the quantity a customer has in their cart, a warning is shown in the cart indicating insufficient stock for the full quantity. The customer may reduce the quantity or wait for restocking before checking out.

## InventoryRecord Rules

Each variant's stock quantity is managed through inventory history records rather than a single stock field. Every inventory record contains a quantity change — positive for restocking, negative for orders or adjustments — along with a reason and a timestamp. The current stock of a variant is calculated by summing all its inventory records; the system never directly sets a stock value. When a seller adds inventory during restocking, the quantity change must be positive. When a seller subtracts inventory for adjustments or loss, the quantity change must be negative. Order placement automatically creates a negative inventory record reflecting the purchased quantity. When an order item is cancelled or refunded, a positive inventory record is automatically created to restore the stock. Inventory records are immutable — once created, they cannot be edited or deleted. Sellers can view the full inventory history of each variant, showing every addition, subtraction, and automatic adjustment.

### Stock Calculation Rule

THE system SHALL calculate the current stock of a variant by summing the quantity change values of all inventory records belonging to that variant. IF no inventory records exist for a variant, THEN THE system SHALL treat its current stock as zero. The stock quantity SHALL NOT be directly set or updated as a single value; it SHALL always be derived from the inventory history.

WHEN the current stock reaches zero, THE system SHALL display the variant as "out of stock." Out of stock variants SHALL NOT be added to the cart.


### Immutability of Inventory Records

THE system SHALL NOT allow any inventory record to be edited after it has been created. THE system SHALL NOT allow any inventory record to be deleted. Once an inventory record is recorded, it SHALL be permanent and immutable for the lifetime of the system.

Any attempt to edit or delete an inventory record SHALL be rejected. The inventory history SHALL serve as a permanent, tamper-proof audit trail of all stock movements.


### Quantity Sign Rules

WHEN a seller creates a restocking record, THE system SHALL require the quantity change to be a positive value. IF the quantity change is zero or negative, THEN THE system SHALL reject the record.

WHEN a seller creates an adjustment or loss record, THE system SHALL require the quantity change to be a negative value. IF the quantity change is zero or positive, THEN THE system SHALL reject the record.

WHEN an order is placed successfully, THE system SHALL automatically create an inventory record for each purchased variant with a negative quantity change equal to the purchased quantity.

WHEN an order item cancellation is approved, THE system SHALL automatically create an inventory record for that variant with a positive quantity change equal to the cancelled quantity to restore the stock.

WHEN an order item refund is approved, THE system SHALL automatically create an inventory record for that variant with a positive quantity change equal to the refunded quantity to restore the stock.

IF the automatic creation of any inventory record fails, THEN THE system SHALL NOT complete the triggering operation. The order SHALL not be placed, the cancellation SHALL not be approved, or the refund SHALL not be approved. The operation and its inventory record creation SHALL succeed or fail together as an atomic unit.


### Reason and Timestamp Requirements

THE system SHALL require a reason on every inventory record.

WHEN a seller manually creates an inventory record for restocking or adjustment, THE system SHALL require the seller to provide a reason. IF the seller does not provide a reason or provides an empty reason, THEN THE system SHALL reject the record.

WHEN the system automatically creates an inventory record for an order placement, cancellation approval, or refund approval, THE system SHALL generate a reason that references the triggering event. The generated reason SHALL include the order number, cancellation request identifier, or refund request identifier as appropriate.

THE system SHALL record a timestamp on every inventory record at the moment of creation. The timestamp SHALL be set automatically by the system and SHALL NOT be editable by any user.


### Inventory History Visibility

Sellers can view the full inventory history of each variant belonging to their products. The history SHALL include every inventory record for the variant — restocking events, adjustments, and automatically generated records from orders, cancellations, and refunds — without omission.

Each record in the history SHALL display the quantity change, reason, and timestamp.

The inventory history SHALL be ordered by timestamp, with the most recent records shown first. The inventory history SHALL be paginated.

IF a seller attempts to view inventory history for a variant that does not belong to their products, THEN THE system SHALL reject the request.


## WishlistItem Rules

Customers can add products to their wishlist — the wishlist tracks products, not specific variants, so a wishlist item references a product rather than a variant. A customer cannot add the same product to their wishlist more than once; duplicate wishlist entries for the same product are prevented. The wishlist is paginated for display purposes. If a seller deletes a product that is on any customer's wishlist, that product is automatically removed from all wishlists that contain it — customers do not need to manually clean up entries for deleted products. There is no limit on how many products a customer can add to their wishlist. Wishlist items are purely for the customer's reference and do not affect product availability, pricing, or stock. A product appearing on a wishlist does not guarantee its availability — the product may still go out of stock or be deleted.

### Wishlist Product Scope

THE wishlist SHALL track products, not specific variants. When a customer adds a product to their wishlist, the wishlist entry references the product as a whole regardless of which variants are available. A wishlist item does not lock in or reserve any particular variant, price, or stock status.


### Duplicate Prevention

WHEN a customer attempts to add a product that is already in their wishlist, THEN THE system SHALL reject the request. A customer SHALL have at most one wishlist entry per product. The check for duplicates SHALL consider only the product, not any variant or price differences.


### Wishlist Pagination

THE wishlist SHALL be displayed with pagination. Each page SHALL contain a fixed number of wishlist items. THE system SHALL provide navigation between pages when the total number of wishlist items exceeds the page size.


### Product Deletion Cascade

IF a seller deletes a product, THEN THE system SHALL automatically remove that product from all wishlists that contain it. The removal SHALL cascade across all customers without requiring manual cleanup. THE system SHALL ensure that after product deletion, no wishlist retains a reference to the deleted product. Wishlist items for deleted products SHALL not appear in any customer's wishlist view.


### Wishlist Size

THE wishlist SHALL have no maximum size limit. A customer MAY add any number of products to their wishlist without restriction.


### Availability Independence

THE presence of a product on a wishlist SHALL NOT guarantee its availability for purchase. A product on a wishlist MAY become out of stock, be deleted by the seller, or change in price without notice to the wishlist holder. THE system SHALL NOT reserve stock or prevent product changes based on wishlist membership.


## CartItem Rules

Customers must select a specific variant — not just a product — when adding items to their cart. Each cart item includes the selected variant and a quantity specified by the customer. If a customer adds a variant that is already in their cart, the quantities are combined into a single cart item rather than creating a duplicate line. The cart displays each item showing the product name, variant options, price, quantity, and subtotal. The cart also shows the total price calculated from all cart items. If a variant's current stock is less than the quantity in the cart, the system shows a warning but does not automatically adjust the quantity. If a variant becomes out of stock or is deleted by the seller, the cart item is marked as unavailable and cannot proceed to checkout. Customers can change the quantity of any cart item at any time, and can remove items from the cart entirely. Out-of-stock variants cannot be added to the cart in the first place.

### Adding Items to Cart

#### Variant Selection Requirement

THE system SHALL require a customer to select a specific variant when adding an item to the cart.

IF a customer attempts to add a product without specifying a variant, THEN the system SHALL reject the request.

#### Quantity Specification

THE system SHALL require the customer to specify a quantity when adding a variant to the cart. The quantity must be a positive whole number (1 or greater).

IF the specified quantity is zero or a negative number, THEN the system SHALL reject the request.

#### Out-of-Stock Prevention

IF a variant's current stock quantity is zero, THEN the system SHALL reject any attempt to add that variant to the cart.

#### Same Variant Combination

WHEN a customer adds a variant that is already present in their cart, THE system SHALL combine the quantities into a single cart item rather than creating a separate line. The resulting quantity SHALL be the sum of the existing cart quantity and the newly added quantity.

### Cart Display

#### Per-Item Display

THE system SHALL display each cart item with the following information: the product name, the variant's option values, the price of the variant, the quantity in the cart, and the subtotal for that item (calculated as price multiplied by quantity).

#### Total Price

THE system SHALL display the total price of all cart items, calculated as the sum of all item subtotals.

#### Low Stock Warning

IF the quantity of a variant in the cart exceeds the variant's current stock quantity, THEN the system SHALL display a warning on that cart item indicating that the stock is insufficient for the requested quantity. The system SHALL NOT automatically reduce the cart quantity; the customer must adjust it manually.

### Unavailable Items

#### Deleted Variant

IF a variant has been deleted by the seller after it was added to a cart, THEN the system SHALL mark that cart item as unavailable. The item SHALL remain visible in the cart but cannot proceed to checkout.

#### Out-of-Stock Variant in Cart

IF a variant's stock quantity reaches zero after it was added to a cart, THEN the system SHALL mark that cart item as unavailable. The item SHALL remain visible in the cart but cannot proceed to checkout.

#### Checkout Restriction

IF any item in the cart is marked as unavailable, THEN the system SHALL prevent the customer from proceeding to checkout until the unavailable items are removed from the cart.

### Modifying Cart Contents

#### Quantity Changes

THE system SHALL allow a customer to change the quantity of any cart item at any time. The new quantity must be a positive whole number (1 or greater).

IF the new quantity is zero or a negative number, THEN the system SHALL reject the change.

#### Item Removal

THE system SHALL allow a customer to remove any cart item from their cart at any time. Removal is immediate and requires no confirmation.

#### Unrestricted Modification

THE system SHALL allow quantity changes and item removals regardless of the item's stock status or availability.

## Order Rules

An order is created only after successful payment. Each order contains one or more order items representing purchased variants. The order has a unique order number and records the total price at the time of purchase. The shipping address selected during checkout is saved with the order and cannot be changed after the order is placed. The overall order status is derived from the statuses of its individual items — it is never set directly. If all items are in paid status, the order is paid. If any item is shipped and none are delivered, the order is shipped. If all items are delivered, the order is delivered. If all items are cancelled, the order is cancelled. If all items are refunded, the order is refunded. When items have mixed statuses — for example, some delivered and some refunded — the order status becomes partially completed. Orders are displayed in the customer's order history paginated and sorted newest first. Administrators can view all orders on the platform and can force-cancel items or entire orders.

### Order Creation Validation

THE system SHALL create an order only after successful payment confirmation from the payment gateway.

THE system SHALL assign a unique order number to each order at the time of creation. No two orders on the platform may share the same order number.

THE system SHALL record the total price at the time of purchase. The total price is the sum of all order item prices multiplied by their quantities at the moment the order is placed. The recorded total price SHALL not be recalculated or changed after the order is created.

IF payment fails, THEN THE system SHALL not create the order, and the customer may retry the payment without losing their selected items or shipping address.

THE system SHALL require at least one order item to create an order. An attempt to place an order with no items SHALL be rejected.

### Shipping Address Immutability

WHEN an order is placed, THE system SHALL save the shipping address selected during checkout as part of the order record.

THE system SHALL not permit the shipping address to be modified, replaced, or removed after the order is placed — not by the customer, not by the seller, and not by an administrator.

IF a customer attempts to change the shipping address of an existing order, THEN THE system SHALL reject the request and indicate that the shipping address is frozen after order placement.

### Order Status Derivation

THE system SHALL derive the overall order status exclusively from the statuses of its individual order items. The order status SHALL never be set directly.

WHEN all order items are in "paid" status, THE system SHALL display the order status as "paid".

WHEN any order item is in "shipped" status and no order item is in "delivered" status, THE system SHALL display the order status as "shipped".

WHEN all order items are in "delivered" status, THE system SHALL display the order status as "delivered".

WHEN all order items are in "cancelled" status, THE system SHALL display the order status as "cancelled".

WHEN all order items are in "refunded" status, THE system SHALL display the order status as "refunded".

WHEN order items are in mixed statuses — for example, some "delivered" and some "refunded", or some "delivered" and some "cancelled" — THE system SHALL display the order status as "partially completed".

THE system SHALL recalculate the order status whenever any order item status changes. The derived status SHALL reflect the current state of all items at all times.

### Order History Browsing and Access

WHEN a customer views their order history, THE system SHALL display orders paginated with the most recently placed orders shown first.

THE system SHALL maintain consistent pagination behavior: each page SHALL contain the same number of orders, and navigating between pages SHALL not reorder or duplicate results.

Administrators SHALL be able to view the full list of all orders across the entire platform. Administrators SHALL be able to browse, filter, and paginate through all orders regardless of which customer or seller they belong to.

IF a customer has no orders, THEN THE system SHALL display an empty order history with an appropriate message rather than an error.

## OrderItem Rules

Each order item represents a purchased product variant and records the quantity purchased, the price at the time of purchase, and its current status. If a customer buys multiple units of the same variant in a single order, they are combined into one order item with the corresponding quantity rather than being separate line items. Each order item has its own independent status — items from the same order can have different statuses because they can be individually cancelled, refunded, or shipped. The possible item statuses are paid, shipped, delivered, cancelled, and refunded. At order creation, every item starts in the paid status. Order items from different sellers can exist within the same order. Each order item preserves snapshots of the product, variant, and seller profile at the time of purchase so that historical records remain accurate even if the product or shop is later modified or deleted. Order items are grouped into shipments when shipped — each shipment can contain one or more items from the same seller.

### Order Item Creation and Quantity Combining

When an order is created after successful payment, each purchased variant becomes an order item. If the customer purchases multiple units of the same variant within a single order, those units are combined into one order item with the quantity reflecting the total number of units purchased. The quantity recorded at purchase is immutable — it does not change even if the variant is later edited or deleted. The quantity must be at least one; attempts to create an order item with a quantity of zero or less are rejected. This ensures that the purchase record accurately reflects what the customer bought at that moment.

### Price Freezing at Purchase

The price of an order item is frozen at the time of purchase. The recorded price is the variant's price at the moment the order was placed, and it does not change even if the seller later modifies the variant's price. This ensures that customers pay exactly what was displayed at checkout, and sellers receive the amount agreed upon at the time of purchase. The frozen price is used for all subsequent calculations including refund amounts, cancellation settlements, and order total summaries.

### Order Item Status Lifecycle

Each order item has its own independent status. Items within the same order can have different statuses because each item can be individually cancelled, refunded, or shipped without affecting other items. At creation, every order item starts with the status "paid."

The allowed status transitions for an order item are:
- From "paid": an item can transition to "shipped" (when the seller ships it) or to "cancelled" (when a cancellation request is approved).
- From "shipped": an item can transition to "delivered" (when the customer confirms delivery or when 14 days pass automatically from the shipping date).
- From "delivered": an item can transition to "refunded" (when a refund request is approved within 7 calendar days of delivery).
- "cancelled" and "refunded" are terminal statuses and cannot transition further.

The overall order status is derived from the statuses of its items as defined in the Order Rules.

### Multi-Seller Order Items

An order can contain order items from different sellers. Each order item retains its association with the seller who created the purchased product. Different sellers process their own items independently — a seller can only manage (ship, cancel, or refund) items belonging to their own products. Sellers cannot view or modify order items that belong to other sellers, even if those items are in the same order.

### Purchase-Time Snapshots

When an order is created, snapshots are preserved for each order item to maintain an accurate historical record. These snapshots capture the state of the purchased product, the purchased variant, and the seller's profile at the moment of purchase. The snapshots are immutable and cannot be deleted.

The product snapshot includes the product name, description, category, and base price at the time of purchase. The variant snapshot includes the SKU code, option values, and price at the time of purchase. The seller profile snapshot includes the shop name and logo at the time of purchase.

If the referenced product, variant, or seller profile no longer exists at the time the order is viewed, the order item still displays the snapshot data. This ensures that order history remains complete and accurate regardless of later changes or deletions.

### Order Item Grouping into Shipments

Order items are grouped into shipments by the seller during the shipping process. A shipment can contain one or more order items, but all items in a single shipment must belong to the same seller. A seller may choose to ship items individually, with one item per shipment, or bundle multiple items into a single shipment. When a shipment is created, all order items included in that shipment transition to "shipped" status and share the same tracking information (carrier name and tracking number). Order items from different sellers are always shipped separately and cannot be combined into the same shipment.

## Shipment Rules

A shipment represents a physical package sent by a seller and can contain one or more order items that belong to that same seller. Items from different sellers must be shipped separately — a shipment cannot contain items from multiple sellers. A seller can choose to ship items individually in separate shipments or bundle multiple items into a single shipment. Every shipment requires tracking information: a carrier name and a tracking number, both of which are required. All items in the same shipment share the same tracking information. When a shipment is created, all items included in it change their status to shipped. Customers confirm delivery per shipment, not per individual item — when delivery is confirmed for a shipment, all items within it change to delivered status. If the customer does not manually confirm delivery, items automatically transition to delivered status after 14 days from the shipping date. A shipment is always associated with exactly one order, though an order may have multiple shipments from different sellers.

### Shipment Composition Constraints

A shipment shall only contain order items that belong to the same seller.

IF a seller attempts to include order items from a different seller in a shipment, THEN the system shall reject the shipment creation and inform the seller that items from different sellers must be shipped separately.

WHEN a seller creates a shipment, the seller may choose to bundle multiple order items of theirs into a single shipment or ship each item individually in separate shipments. The system shall not restrict the seller's choice between individual and bundled shipping.

An order may have multiple shipments. These shipments may originate from the same seller — when the seller opts to ship items separately — or from different sellers — each shipping their own items. The system shall not impose a limit on the number of shipments per order.

### Tracking Information Validation

WHEN a seller creates a shipment, THE system shall require the seller to provide a carrier name.

WHEN a seller creates a shipment, THE system shall require the seller to provide a tracking number.

IF the carrier name is not provided or consists only of whitespace characters, THEN the system shall reject the shipment creation and require a valid carrier name.

IF the tracking number is not provided or consists only of whitespace characters, THEN the system shall reject the shipment creation and require a valid tracking number.

All order items included in the same shipment share the same carrier name and tracking number. A shipment has exactly one carrier name and one tracking number, and these apply to every order item within that shipment.

### Shipment Status Transition Rules

WHEN a shipment is created, THE system shall change the status of every order item included in that shipment to "shipped."

Delivery confirmation is handled at the shipment level. WHEN a customer confirms delivery for a shipment, THE system shall change the status of all order items within that shipment to "delivered."

IF the customer does not manually confirm delivery for a shipment within 14 calendar days from the date the shipment was created, THEN the system shall automatically change the status of all order items in that shipment to "delivered."

IF a customer attempts to confirm delivery for a shipment whose items have already been automatically marked as delivered, THEN the system shall reject the confirmation.

WHILE all order items in a shipment have reached "delivered" status, no further status transitions shall be permitted for that shipment.

## CancellationRequest Rules

Cancellation requests are handled per order item, not per entire order. A customer can request cancellation only for items in the paid status — once an item has been shipped, it can no longer be cancelled. Each cancellation request must include a reason provided as text by the customer. The reason is required and cannot be empty. The seller who owns the item reviews the request and can either approve or reject it. When the seller responds, a snapshot of the request state is created to preserve the decision for dispute resolution. If the cancellation is approved, the item's status changes to cancelled, a refund is processed for that item only, and the item's stock quantity is restored through a positive inventory record. If the cancellation is rejected, the item remains in paid status and continues processing. Cancellation of one item does not affect other items in the same order — they continue normally. Administrators can also force-cancel items on behalf of customers.

### Cancellation Scope

Cancellation is processed per order item — a customer may cancel one item without affecting others in the same order.

WHEN a customer requests cancellation of an order item, THE system SHALL process the request only for that specific item.

WHILE a cancellation is being processed for one order item, THE system SHALL allow all other items in the same order to continue through their normal lifecycle without interruption.

IF all order items in an order are cancelled, THEN THE system SHALL derive the overall order status as "cancelled" (order status derivation defined in Order Rules).

### Cancellation Eligibility

Only order items in the "paid" status are eligible for cancellation.

WHEN a customer submits a cancellation request, THE system SHALL verify that the target order item's current status is "paid."

IF the order item's status is "shipped," THEN THE system SHALL reject the cancellation request.

IF the order item's status is "delivered," THEN THE system SHALL reject the cancellation request. Delivered items follow the refund request process (see RefundRequest Rules).

IF the order item's status is already "cancelled" or "refunded," THEN THE system SHALL reject the cancellation request.

### Cancellation Reason Requirements

Every cancellation request must include a reason provided as text by the requesting customer.

WHEN a customer submits a cancellation request, THE system SHALL require the reason text to be present.

IF the reason text is missing, empty, or consists only of whitespace, THEN THE system SHALL reject the request.

THE system SHALL store the reason text as part of the cancellation request record for seller review and audit purposes.

### Seller Response and Snapshot

The seller who owns the cancelled order item reviews each cancellation request and must respond with either an approval or a rejection.

WHEN a seller approves a cancellation request, THE system SHALL change the order item's status to "cancelled."

WHEN a seller rejects a cancellation request, THE system SHALL leave the order item's status as "paid."

IF a seller has not yet responded to a cancellation request, THEN THE system SHALL keep the request in a pending state.

WHEN the seller responds to a cancellation request (approval or rejection), THE system SHALL create a snapshot of the request state capturing the decision, the response timestamp, and the identity of the responding seller. The snapshot is immutable and preserved for dispute resolution (snapshot structure defined in Snapshot Rules).

THE system SHALL record the date and time when the seller response was submitted.

### Approval Outcomes

When a cancellation request is approved by the seller, the system processes the cancellation, refund, and stock restoration for that item.

WHEN a seller approves a cancellation request, THE system SHALL:
- Change the order item's status to "cancelled."
- Process a refund for the cancelled item only, for the quantity purchased (refund processing defined in RefundRequest Rules).
- Create a positive inventory record for the item's variant to restore the stock quantity (inventory rules defined in InventoryRecord Rules).

WHEN restoring stock for an approved cancellation, THE system SHALL create an inventory record with a positive quantity equal to the purchased quantity and a reason indicating "cancellation."

### Rejection Outcomes

When a cancellation request is rejected, the order item continues through the normal order processing flow unchanged.

WHEN a seller rejects a cancellation request, THE system SHALL:
- Leave the order item's status as "paid."
- Not process any refund.
- Not modify the item's inventory.

The order item remains eligible for shipping by the seller.

### Administrator Force Cancel

Administrators have the authority to force-cancel individual order items, bypassing the seller approval step.

WHEN an administrator force-cancels an order item, THE system SHALL:
- Change the order item's status to "cancelled" immediately without waiting for seller approval.
- Process a refund for the cancelled item.
- Create a positive inventory record to restore the item's stock quantity.

WHEN an administrator performs a force cancellation, THE system SHALL create a snapshot recording the administrator's identity, the action taken, and the timestamp.

Administrators may force-cancel order items regardless of the item's current status.

## RefundRequest Rules

Refund requests are handled per order item, not per entire order. A customer can request a refund only for items that have been delivered. The refund must be requested within 7 days of the item's delivery date — requests submitted after the 7-day window are rejected. Each refund request must include a reason provided as text by the customer; the reason is required and cannot be empty. The seller who owns the item reviews the request and can either approve or reject it. When the seller responds, a snapshot of the request state is created to preserve the decision. If the refund is approved, the item's status changes to refunded and the item's stock quantity is restored through a positive inventory record. If the refund is rejected, the item remains in delivered status. Refunding one item does not affect other items in the same order. Administrators can also force-refund items on behalf of customers, bypassing the normal seller approval flow.

### Refund Scope Rule

Refund requests are handled per order item, not per entire order. THE system SHALL process each refund request independently for the specific order item identified by the customer.

WHEN a refund request is submitted for one order item, THE system SHALL NOT affect the status, processing, or fulfillment of any other order items within the same order. Each order item retains its own independent status and lifecycle.

IF all items in an order are refunded, THEN the system SHALL set the overall order status to "refunded." Otherwise, the order status is derived from the remaining items as defined in the Order Rules.

### Refund Eligibility Rule

Only order items with status "delivered" are eligible for refund. THE system SHALL reject any refund request submitted for an order item whose status is "paid," "shipped," "cancelled," or already "refunded."

WHEN a customer's order item has been delivered, THE system SHALL allow a refund request to be submitted within 7 calendar days of that item's delivery date. The 7-day window begins on the delivery date and includes the delivery date itself.

IF a refund request is submitted after the 7-day window has expired, THEN THE system SHALL reject the request. The item remains in "delivered" status and the customer is informed that the refund window has closed.

IF the delivery was confirmed by the customer manually, THE system SHALL use the customer's confirmation date as the delivery date. IF the delivery was confirmed automatically after 14 days from shipping without customer confirmation, THE system SHALL use the auto-confirmation date as the delivery date.

### Refund Reason Validation

Every refund request must include a reason provided as text by the customer. THE system SHALL require a reason for every refund request submitted.

IF the reason text is empty, contains only whitespace, or is not provided at all, THEN THE system SHALL reject the request and inform the customer that a reason is required.

### Seller Response Rule

WHEN a refund request is submitted for an order item, THE system SHALL notify the seller who owns that item. The seller may either approve or reject the refund request.

WHEN the seller responds to a refund request — whether approving or rejecting — THE system SHALL create a snapshot of the refund request state at that moment, recording the decision, the responding party, and the timestamp of the response (as defined in Snapshot Rules).

IF the seller approves the refund request, THEN THE system SHALL change the order item status to "refunded" and process the refund as described in the Approved Refund Rule.

IF the seller rejects the refund request, THEN THE system SHALL keep the order item in "delivered" status. No refund is issued and no stock adjustment occurs. The item remains unchanged.

### Approved Refund Rule

WHEN a refund request is approved — either by the seller or by an administrator via force refund — THE system SHALL change the order item status to "refunded."

WHEN the order item status changes to "refunded," THE system SHALL restore the item's stock quantity by creating a positive inventory record for the corresponding variant. The inventory record records the quantity being restored and the reason as "refund" (as defined in InventoryRecord Rules).

IF the refund is processed for one item in an order, THE system SHALL NOT trigger refunds for any other items in the same order.

### Administrator Force Refund Rule

An administrator may force-refund individual order items or entire orders. THE system SHALL allow administrators to initiate a refund for any order item regardless of its current status, bypassing the normal seller approval flow.

WHEN an administrator force-refunds an order item, THE system SHALL apply the same processing rules as an approved refund: the item status changes to "refunded" and stock is restored via a positive inventory record (as defined in the Approved Refund Rule).

IF an administrator force-refunds an entire order, THE system SHALL process each order item individually, changing each item's status to "refunded" and restoring stock for each corresponding variant.

A snapshot of the refund action is created when an administrator performs a force refund (as defined in Snapshot Rules).

## Review Rules

Customers can write reviews only for products they have purchased and only after that order item has been delivered. A customer can write at most one review per product per order — if they purchased the same product in multiple orders, they can write one review per order. Each review must include a rating from 1 to 5 stars; the rating is required. Text content is optional — a review can consist of a star rating alone. When a customer edits their review, a snapshot is created to preserve the previous rating and text content. Customers can delete their own reviews, but the snapshot of the review is preserved for historical accuracy. When a customer deletes their account, their reviews are preserved but displayed as being from a deleted user. A product's average rating is calculated from all non-deleted reviews. Reviews are displayed on the product detail page sorted newest first.

### Review Eligibility

WHEN a customer attempts to write a review for a product, THE system SHALL verify that the customer has purchased that product and that the corresponding order item has a status of "delivered". THE system SHALL verify that the order item belongs to the customer submitting the review.

IF the order item does not exist or does not belong to the customer, THEN THE system SHALL reject the review submission.

IF the order item status is "paid", "shipped", "cancelled", or "refunded", THEN THE system SHALL reject the review submission — only "delivered" items are eligible for review.

IF a paid item has not yet been shipped but a review is submitted, THEN THE system SHALL reject the review submission.

### Review Uniqueness

THE system SHALL allow at most one review per product per order from the same customer.

IF a customer attempts to write a second review for the same product within the same order, THEN THE system SHALL reject the submission regardless of whether the first review is active or deleted.

WHERE a customer has purchased the same product across multiple different orders, THE system SHALL allow one review per order. THE system SHALL treat each order independently for the purpose of review uniqueness.

### Rating Validation

THE system SHALL require each review to include a rating. THE system SHALL accept only whole number ratings from 1 to 5 stars.

IF the rating is missing, THEN THE system SHALL reject the review submission.

IF the rating is less than 1 or greater than 5, THEN THE system SHALL reject the review submission.

IF the rating is a fractional value (e.g., 3.5), THEN THE system SHALL reject the review submission.

THE system SHALL accept text content as an optional field. A review consisting of a star rating alone without text content is valid and must be accepted.

### Review Edit and Snapshot

WHEN a customer edits an existing review, THE system SHALL create a snapshot recording the previous rating and text content before the edit, along with the new rating and text content after the edit, the timestamp of the change, and the identity of the customer who made the change.

THE system SHALL preserve review snapshots as immutable records. THE system SHALL NOT delete review snapshots even when the corresponding review is deleted by the customer.

WHERE a customer deletes their own review, THE system SHALL mark the review as deleted. THE system SHALL retain all snapshots created for that review.

### Deleted User Reviews

WHEN a customer deletes their account, THE system SHALL preserve all reviews written by that customer. THE system SHALL display these reviews with the author shown as "deleted user".

The system SHALL NOT delete or hide reviews when the author's account is deleted. The review content, rating, and creation date remain visible; only the author attribution changes to indicate the former author's account is no longer active.

### Average Rating Calculation

THE system SHALL calculate a product's average rating as the arithmetic mean of all ratings from non-deleted reviews for that product.

IF a review is deleted by the customer, THEN THE system SHALL exclude that review's rating from the average rating calculation.

IF a review's author deletes their account but the review is preserved and shown as "deleted user", THEN THE system SHALL still include that review's rating in the average rating calculation, provided the review itself has not been deleted.

IF there are zero non-deleted reviews for a product, THEN THE system SHALL indicate that no rating is available rather than displaying a rating of zero.

### Review Display Order

THE system SHALL display reviews on the product detail page sorted by newest first, based on the review creation date.

WHEN a review is edited, THE system SHALL NOT change its position in the sort order; the original creation date determines the display order.

## AdminRequest Rules

Any user — whether a customer or a seller — can submit a request to become an administrator. Each request must include a reason explaining why the user wants to become an administrator; the reason is required and cannot be empty. Requests are reviewed by super administrators who can view the list of all pending requests. A super administrator can approve a request, which promotes the user to a regular administrator, or reject it. There is no automatic approval or expiration of requests. An approved user becomes a regular administrator with standard administrator privileges. Regular administrators can later be promoted to super administrator by an existing super administrator. Super administrators can also demote other super administrators down to regular administrator, but a super administrator cannot demote themselves. There is no limit on how many times a user can submit an administrator request.

### Request Submission Rules

THE system SHALL accept admin request submissions from any user who is a customer or a seller.

THE system SHALL require a reason text with every admin request submission.

IF the reason text is missing or contains only whitespace characters, THEN THE system SHALL reject the request submission.

A user who is already an administrator may also submit a request; each request is handled independently.

### Request Review Rules

THE system SHALL restrict the review of admin requests exclusively to super administrators. No other actor may approve or reject an admin request.

WHEN a super administrator approves an admin request, THE system SHALL promote the requesting user to a regular administrator.

WHEN a super administrator rejects an admin request, THE system SHALL close the request as rejected. The requesting user may submit a new request thereafter.

### Request Lifecycle Constraints

THE system SHALL NOT automatically approve any admin request. Every request requires an explicit action by a super administrator to change its status.

THE system SHALL NOT expire any admin request. Requests that have not yet been reviewed SHALL remain in a pending state indefinitely.

THE system SHALL NOT impose a deadline or time limit on the review process.

### Administrator Grade Transition Rules

THE system SHALL allow a super administrator to promote a regular administrator to the super administrator grade.

THE system SHALL allow a super administrator to demote another super administrator to the regular administrator grade.

IF a super administrator attempts to demote themselves, THEN THE system SHALL reject the action. A super administrator cannot reduce their own grade.

### Resubmission Rules

THE system SHALL allow a user to submit a new admin request regardless of the status of any previous requests submitted by that user.

THE system SHALL NOT impose any limit on the number of admin requests a user may submit. A user may resubmit indefinitely.

## Snapshot Rules

Snapshots are the platform's mechanism for preserving historical states of all editable data where money is involved. Every snapshot records what entity was changed, when the change occurred, and the values before and after the modification. Snapshots are immutable — once created, they cannot be edited or deleted by any user, including administrators. The snapshot principle applies to products including all their fields and images, product variants including SKU code and price, seller profiles including shop name and logo, order items capturing product and variant state at purchase time, reviews capturing rating and text content, and cancellation and refund requests capturing reason and status changes. Snapshots are viewable by the relevant owners and by administrators for dispute resolution. Product snapshots include nested snapshots of all variants at that moment, preserving the complete state of a product hierarchy. Snapshots are preserved even after the original entity is deleted — for example, product snapshots remain after a product is deleted, and review snapshots remain after a review or account is deleted.

### Snapshot Content and Creation Rules

THE shoppingMall system SHALL create a snapshot whenever editable data is modified for any entity subject to the snapshot principle: products, product variants, seller profiles, order items, reviews, cancellation requests, and refund requests.

THE shoppingMall system SHALL record in every snapshot: the timestamp when the change occurred, the entity type and identifier of what was changed, the identity of who made the change, and the complete values before and after the modification.

WHEN an order is placed successfully, THE shoppingMall system SHALL create a snapshot of each purchased product at the time of purchase, preserving the product name, description, and base price as they existed at purchase time.

WHEN an order is placed successfully, THE shoppingMall system SHALL create a snapshot of each purchased variant at the time of purchase, preserving the variant options and price as they existed at purchase time.

WHEN an order is placed successfully, THE shoppingMall system SHALL create a snapshot of each seller's profile at the time of purchase, preserving the shop name and logo as they existed at purchase time.

WHEN a seller edits their profile (shop name, description, or logo), THE shoppingMall system SHALL create a snapshot of the seller profile preserving the previous state before the edit.

WHEN a customer edits a review, THE shoppingMall system SHALL create a snapshot preserving the previous rating and text content before the edit.

WHEN a seller responds to a cancellation request (approval or rejection), THE shoppingMall system SHALL create a snapshot of the cancellation request state preserving the reason and status before the response was made.

WHEN a seller responds to a refund request (approval or rejection), THE shoppingMall system SHALL create a snapshot of the refund request state preserving the reason and status before the response was made.

### Product and Variant Snapshot Structure

WHEN a product is edited, THE shoppingMall system SHALL create a product snapshot that includes all product fields: name, description, category assignment, and base price.

WHEN a product is edited, THE shoppingMall system SHALL include all product images in the product snapshot, preserving each image's URL and display order as they existed at the time of the edit.

WHEN a product is edited, THE shoppingMall system SHALL nest snapshots of all product variants within the product snapshot, capturing the complete state of every variant — including SKU code, option values, and price — at the moment the product was changed. This preserves the full product hierarchy at any point in time.

WHEN a product variant is edited independently (without the parent product being edited), THE shoppingMall system SHALL create a variant snapshot that includes the SKU code, option values, and price of that variant.

### Snapshot Immutability and Preservation

THE shoppingMall system SHALL treat all snapshots as immutable. Once a snapshot is created, it cannot be modified by any user, including administrators.

THE shoppingMall system SHALL prevent deletion of any snapshot. No user — including administrators — may delete a snapshot under any circumstances.

IF a user attempts to modify a snapshot, THEN THE shoppingMall system SHALL reject the request.

IF a user attempts to delete a snapshot, THEN THE shoppingMall system SHALL reject the request.

THE shoppingMall system SHALL preserve snapshots even after the original entity is deleted. Specifically:
- Product snapshots remain after a product is deleted by its seller or by an administrator.
- Variant snapshots remain after a variant is deleted.
- Review snapshots remain after a review is deleted or after the customer's account is deleted.
- Cancellation request snapshots remain after the request is resolved or the related order item's status changes.
- Refund request snapshots remain after the request is resolved or the related order item's status changes.
- Seller profile snapshots remain after the seller deletes their account.
- Order item snapshots remain for the lifetime of the order record, even if the original product or variant no longer exists.

### Snapshot Access Rules

THE shoppingMall system SHALL allow sellers to view snapshots of their own products, including nested variant snapshots within each product snapshot.

THE shoppingMall system SHALL allow administrators to view snapshots of any product on the platform.

THE shoppingMall system SHALL allow the owner of a review to view snapshots of that review.

THE shoppingMall system SHALL allow a seller to view snapshots of cancellation requests and refund requests related to their own products.

THE shoppingMall system SHALL allow a customer to view snapshots of cancellation requests and refund requests they have submitted.

THE shoppingMall system SHALL allow a seller to view snapshots of their own seller profile.

THE shoppingMall system SHALL allow administrators to view all snapshots for dispute resolution purposes.

IF a user who is neither the owner nor an administrator attempts to view a snapshot, THEN THE shoppingMall system SHALL deny access.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Pagination

### Paginated Lists

THE system SHALL paginate product search results.

THE system SHALL paginate the wishlist.

THE system SHALL paginate the order history.

WHEN a paginated list is displayed, THE system SHALL show a subset of results per page.

WHEN a user navigates between pages, THE system SHALL display the corresponding subset of results.

### Filter and Sort Preservation Across Pages

WHEN a user has applied filters or a sort order to a paginated list, THE system SHALL preserve the filters and sort order across page navigation within that same list.

### Empty State

IF a paginated list has no results, THEN THE system SHALL display an empty state to the user.

### Filtering

### Product Search Filters

WHEN a customer searches for products, THE system SHALL support filtering by category.

IF a category filter is applied, THEN THE system SHALL limit results to products within that category or its subcategories.

WHEN a customer searches for products, THE system SHALL support filtering by price range.

IF a minimum price is specified, THEN THE system SHALL include only products whose price is at least the minimum.

IF a maximum price is specified, THEN THE system SHALL include only products whose price is at most the maximum.

WHEN a customer searches for products, THE system SHALL support an in-stock only filter.

IF the in-stock only filter is applied, THEN THE system SHALL include only products that have at least one variant with stock greater than zero.

### Combining Filters

WHEN multiple product search filters are applied simultaneously, THE system SHALL include only products matching all applied filters.

### Seller Order Item Filtering

WHEN a seller views order items for their products, THE system SHALL support filtering by status.

IF a seller applies a status filter, THEN THE system SHALL include only order items with that status. Available status values are: paid, shipped, delivered, cancelled, and refunded.

### Filtered Result Count

WHEN filters are applied to a list, THE system SHALL reflect the filtered count in the total result count, not the unfiltered total.

### No Matching Results

IF no results match the applied filters, THEN THE system SHALL display a message indicating that no items were found.

### Sorting

### Product Search Sorting Options

WHEN a customer searches for products, THE system SHALL support sorting by newest first, where products are ordered by creation date with the most recent first.

WHEN a customer searches for products, THE system SHALL support sorting by price low to high, where products are ordered by price in ascending order.

WHEN a customer searches for products, THE system SHALL support sorting by price high to low, where products are ordered by price in descending order.

### Fixed Sort Orders

THE system SHALL sort order history by newest first, with the most recently placed order at the top. This sort order SHALL be fixed and cannot be changed.

THE system SHALL sort reviews on the product detail page by newest first, with the most recently written review at the top. This sort order SHALL be fixed and cannot be changed.

### Sort Before Pagination

THE system SHALL apply sorting before pagination, so that the sort order determines which items appear on each page.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication and Authorization Errors

### Login Failures

IF a login attempt uses an email address not associated with any account, THEN THE system SHALL reject the request with a message indicating the credentials are invalid.

IF a login attempt uses a correct email but an incorrect password, THEN THE system SHALL reject the request with a message indicating the credentials are invalid. The system SHALL NOT disclose whether the email exists.

WHEN a customer banned by an administrator attempts to log in, THE system SHALL reject the login and inform the customer that the account has been suspended.

WHEN a seller banned by an administrator attempts to log in, THE system SHALL reject the login and inform the seller that the account has been suspended.

### Registration Conflicts

IF a registration attempt uses an email address already associated with an existing account, THEN THE system SHALL reject the registration and indicate that the email is already in use.

IF a registration attempt uses an email that does not match a valid email format, THEN THE system SHALL reject the registration and request a properly formatted email address.

### Unauthorized Seller Actions

IF an unapproved seller attempts to create a product, THEN THE system SHALL reject the request. The seller's approval status must be "approved" before any selling activity is permitted.

IF a rejected seller attempts to create a product without submitting and receiving approval on a new registration request, THEN THE system SHALL reject the request.

### Suspended Seller Restrictions

WHEN a seller is suspended by an administrator, THE system SHALL reject any attempt by that seller to create new products or edit existing products. The seller may still process existing orders (ship items, respond to cancellation and refund requests).

### Access Denied for Unauthenticated Users

IF a guest (unauthenticated user) attempts any action that requires an account, THEN THE system SHALL reject the request and prompt for login. This includes adding items to cart, placing orders, writing reviews, and accessing account-specific features.

### Forbidden Access

IF a customer attempts to perform an action reserved for sellers (such as creating a product or shipping an order item), THEN THE system SHALL reject the request.

IF a seller attempts to view or modify another seller's products or orders, THEN THE system SHALL reject the request.

IF a customer attempts to view or modify another customer's orders, wishlist, cart, or profile, THEN THE system SHALL reject the request.

### Account Deletion Errors

### Seller Account Deletion Blocked by Pending Obligations

IF a seller requests account deletion while they have order items in "paid" or "shipped" status, THEN THE system SHALL reject the deletion request and inform the seller of the pending orders that must be resolved first.

IF a seller requests account deletion while they have pending cancellation requests (neither approved nor rejected), THEN THE system SHALL reject the deletion request and inform the seller to resolve those requests first.

IF a seller requests account deletion while they have pending refund requests (neither approved nor rejected), THEN THE system SHALL reject the deletion request and inform the seller to resolve those requests first.

### Deletion of Non-Existent Account

IF an account deletion request references an account that does not exist or has already been deleted, THEN THE system SHALL reject the request.

### Customer Account Deletion

WHEN a customer deletes their account, THE system SHALL delete their profile information (display name, phone number). Their orders and order history SHALL be preserved. Their reviews SHALL be preserved but displayed as "deleted user".

### Seller Account Deletion Consequences

WHEN a seller successfully deletes their account, THE system SHALL remove their products from listings. Order history and snapshots SHALL be preserved. The seller's shop name in past orders SHALL be preserved.

### Product and Variant Operation Errors

### Product Creation Validation

IF a seller attempts to create a product without providing a name, THEN THE system SHALL reject the request and indicate that the name is required.

IF a seller attempts to create a product without providing a description, THEN THE system SHALL reject the request and indicate that the description is required.

IF a seller attempts to create a product without selecting a category, THEN THE system SHALL reject the request and indicate that the category is required.

IF a seller attempts to create a product without providing a base price, THEN THE system SHALL reject the request and indicate that the base price is required.

### Product Editing Restrictions

IF a seller attempts to edit a product that belongs to another seller, THEN THE system SHALL reject the request.

IF a seller attempts to edit a product while their account is suspended, THEN THE system SHALL reject the request.

### Product Deletion Blocked by Pending Orders

IF a seller attempts to delete a product while any variant of that product has order items in "paid" or "shipped" status, THEN THE system SHALL reject the deletion request and inform the seller which variants have pending orders.

IF a seller attempts to delete a product while any variant of that product has pending cancellation or refund requests, THEN THE system SHALL reject the deletion request and inform the seller to resolve those requests first.

### Variant Deletion Blocked by Pending Orders

IF a seller attempts to delete a variant while it has order items in "paid" or "shipped" status, THEN THE system SHALL reject the deletion request.

IF a seller attempts to delete a variant while it has pending cancellation or refund requests, THEN THE system SHALL reject the deletion request.

### Variant Validation

IF a seller attempts to create a variant with a SKU code that is already in use by another variant, THEN THE system SHALL reject the request and indicate the SKU code must be unique.

IF a seller attempts to create a variant without providing option values, THEN THE system SHALL reject the request.

### Product Purchasability

WHERE a product has no variants, THE system SHALL display the product in search and category listings but mark it as "unavailable". The system SHALL reject any attempt to add the product to a cart.

### Product Visibility After Deletion

WHEN a product is deleted, THE system SHALL remove it from search results and category listings. Any attempt to access the deleted product's detail page SHALL result in a not-found rejection.

### Cart and Checkout Errors

### Adding to Cart

IF a customer attempts to add a variant that is out of stock (stock quantity is zero) to their cart, THEN THE system SHALL reject the request and inform the customer the variant is unavailable.

IF a customer attempts to add a variant that has been deleted to their cart, THEN THE system SHALL reject the request.

IF a customer attempts to add a variant from a product whose seller is suspended, THEN THE system SHALL reject the request.

### Cart Quantity Validation

IF the quantity of a variant in the cart exceeds the available stock, THEN THE system SHALL display a warning within the cart view indicating the stock is insufficient. The warning SHALL NOT prevent checkout, but the item SHALL be flagged for the customer's attention.

### Unavailable Items at Checkout

WHEN a customer attempts to checkout, THE system SHALL verify that all items in the cart are still available. IF any item's variant has been deleted or is out of stock, THEN THE system SHALL prevent checkout and mark those items as unavailable in the cart.

### Missing Shipping Address

IF a customer attempts to checkout without selecting a shipping address and no default address exists, THEN THE system SHALL reject the checkout and prompt the customer to add or select a shipping address.

### Cart Empty at Checkout

IF a customer attempts to checkout with an empty cart, THEN THE system SHALL reject the request.

### Payment Processing Errors

### Payment Failure

IF the payment gateway returns a failure response during checkout, THEN THE system SHALL not create the order. The system SHALL inform the customer that the payment failed and allow the customer to retry payment.

IF payment fails, THE system SHALL preserve the customer's cart contents so they can attempt checkout again.

### Payment Timeout

IF the payment processing exceeds a reasonable waiting period and times out, THEN THE system SHALL treat this as a failed payment. The order SHALL not be created, and the customer SHALL be allowed to retry.

### Order Creation Atomicity

WHERE a payment succeeds, THE system SHALL create the order, decrease stock quantities, create order items with status "paid", save product and variant snapshots for each order item, save seller profile snapshots for each order item, and remove purchased items from the customer's cart. IF any of these steps fails after payment succeeds, THEN THE system SHALL ensure the order is still created consistently or initiate a refund for the payment.

### Order Cancellation Errors

### Eligibility for Cancellation

IF a customer requests cancellation for an order item that is not in "paid" status (e.g., already shipped, already delivered, already cancelled, or already refunded), THEN THE system SHALL reject the request and indicate the current status of the item prevents cancellation.

IF a seller attempts to approve or reject a cancellation request that does not exist or has already been resolved, THEN THE system SHALL reject the request.

### Cancellation Reason Validation

IF a customer submits a cancellation request with an empty reason text, THEN THE system SHALL reject the request and require a non-empty reason.

### Seller Response to Cancellation

IF a seller rejects a cancellation request, THEN THE system SHALL record the rejection, create a snapshot of the request state, and notify the customer. The order item SHALL continue processing.

IF a seller approves a cancellation request, THEN THE system SHALL change the order item status to "cancelled", create a snapshot of the request state, initiate a refund for that item, and restore the item's stock quantity via a positive inventory record.

### Cancellation After Shipping

WHEN an order item has been shipped (status is "shipped"), THE system SHALL reject any cancellation request for that item. The item can only be refunded after delivery.

### Refund Request Errors

### Eligibility for Refund

IF a customer requests a refund for an order item that has not yet been delivered (status is not "delivered"), THEN THE system SHALL reject the request and indicate that refunds are only available after delivery.

IF a customer requests a refund for an order item where more than 7 days have passed since delivery, THEN THE system SHALL reject the request and indicate that the refund window has closed.

IF a customer requests a refund for an order item that is already refunded or cancelled, THEN THE system SHALL reject the request.

IF a seller attempts to approve or reject a refund request that does not exist or has already been resolved, THEN THE system SHALL reject the request.

### Refund Reason Validation

IF a customer submits a refund request with an empty reason text, THEN THE system SHALL reject the request and require a non-empty reason.

### Seller Response to Refund

IF a seller rejects a refund request, THEN THE system SHALL record the rejection, create a snapshot of the request state, and notify the customer. The order item SHALL retain its "delivered" status.

IF a seller approves a refund request, THEN THE system SHALL change the order item status to "refunded", create a snapshot of the request state, initiate a refund for that item, and restore the item's stock quantity via a positive inventory record.

### Automatic Delivery Confirmation

IF a customer does not confirm delivery within 14 days of shipping, THEN THE system SHALL automatically change the status of all items in that shipment to "delivered". After this automatic confirmation, the 7-day refund window SHALL begin.

### Review Errors

### Review Eligibility

IF a customer attempts to write a review for a product whose order item has not been delivered (status is not "delivered"), THEN THE system SHALL reject the request and indicate that reviews can only be written after delivery.

IF a customer attempts to write a second review for the same product within the same order, THEN THE system SHALL reject the request and indicate that only one review per product per order is allowed.

IF a customer who has never purchased a product attempts to review it, THEN THE system SHALL reject the request.

### Rating Validation

IF a review is submitted with a rating less than 1 or greater than 5, THEN THE system SHALL reject the request and require a rating between 1 and 5 stars inclusive.

IF a review is submitted without a rating, THEN THE system SHALL reject the request and indicate that the rating is required.

### Review Editing and Deletion

IF a customer attempts to edit a review that belongs to another customer, THEN THE system SHALL reject the request.

IF a customer attempts to delete a review that belongs to another customer, THEN THE system SHALL reject the request.

WHEN a customer deletes a review, THE system SHALL mark the review as deleted. The deleted review SHALL no longer appear on the product detail page, but its snapshot SHALL be preserved. The product's average rating SHALL be recalculated excluding the deleted review.

### Administrative Action Errors

### Administrator Grade Restrictions

IF a regular administrator attempts to promote or demote another administrator, THEN THE system SHALL reject the request. Only super administrators may perform these actions.

IF a super administrator attempts to demote themselves, THEN THE system SHALL reject the request.

### Seller Approval Validation

IF an administrator attempts to approve a seller registration that has already been approved or rejected, THEN THE system SHALL reject the request.

IF an administrator rejects a seller registration without providing a reason, THEN THE system SHALL reject the rejection and require a reason text. The reason SHALL be visible to the seller.

### Seller Suspension

IF an administrator attempts to suspend a seller account that is already suspended, THEN THE system SHALL reject the request.

IF an administrator attempts to unsuspend a seller account that is not currently suspended, THEN THE system SHALL reject the request.

### User Banning

IF an administrator attempts to ban a customer account that is already banned, THEN THE system SHALL reject the request.

IF an administrator attempts to unban a customer account that is not currently banned, THEN THE system SHALL reject the request.

IF an administrator attempts to ban a seller account that is already banned, THEN THE system SHALL reject the request.

### Administrator Request Validation

IF a user submits an administrator request with an empty reason text, THEN THE system SHALL reject the request and require a non-empty reason.

IF a super administrator attempts to review an administrator request that has already been approved or rejected, THEN THE system SHALL reject the request.

### Force Cancellation and Refund

WHEN an administrator force-cancels an order item, THE system SHALL process the cancellation regardless of the item's current status. The customer SHALL be refunded and stock SHALL be restored.

WHEN an administrator force-refunds an order item, THE system SHALL process the refund regardless of the 7-day window or current status. The customer SHALL be refunded and stock SHALL be restored.

### Category Deletion

WHEN an administrator deletes a category, THE system SHALL remove the category assignment from all products in that category, leaving them uncategorized. Products SHALL remain in search results and listings but without a category label.

### Stock and Inventory Errors

### Inventory Record Validation

IF a seller submits an inventory record with a quantity change of zero, THEN THE system SHALL reject the request. An inventory adjustment must have a non-zero quantity change.

IF a seller attempts to create an inventory record for a variant that does not exist or has been deleted, THEN THE system SHALL reject the request.

### Out of Stock Behavior

WHEN a variant's calculated stock quantity reaches zero, THE system SHALL mark the variant as "out of stock". Any attempt to add an out-of-stock variant to a cart SHALL be rejected.

IF an order is placed and the stock for a variant becomes negative due to the inventory deduction, THEN THE system SHALL still process the order but flag the variant for seller review.

### Order-Related Inventory Deduction

WHEN an order is placed successfully, THE system SHALL create a negative inventory record for each purchased variant reflecting the purchased quantity. IF the stock becomes insufficient between cart addition and order placement, THEN the order SHALL still be created if payment succeeds, but the variant SHALL be flagged for the seller's attention.

### Order Cancellation and Refund Stock Restoration

WHEN an order item is cancelled or refunded, THE system SHALL create a positive inventory record to restore the stock quantity. This record SHALL reference the order item and indicate the reason as cancellation or refund.

### Not Found and General Error Conditions

### Not Found Errors

IF a customer requests a product detail page for a product that does not exist or has been deleted, THEN THE system SHALL respond with a not-found indication and suggest browsing available products.

IF a customer requests an order that does not belong to them, THEN THE system SHALL respond with a not-found indication rather than revealing whether the order exists.

IF a seller requests an order item that does not belong to their shop, THEN THE system SHALL respond with a not-found indication.

IF a user requests a seller profile for a seller that does not exist or has deleted their account, THEN THE system SHALL respond with a not-found indication.

IF a user requests a category that does not exist, THEN THE system SHALL respond with a not-found indication.

### Snapshot Access Errors

IF a seller requests a snapshot of a product that does not belong to them, THEN THE system SHALL reject the request.

IF a customer requests a snapshot they are not authorized to view, THEN THE system SHALL reject the request. Only owners and administrators may view snapshots.

### Duplicate Actions

IF a seller attempts to create a shipment that includes an order item already assigned to another shipment, THEN THE system SHALL reject the request and indicate which items are already shipped.

IF a customer attempts to confirm delivery for a shipment that has already been confirmed or automatically delivered, THEN THE system SHALL reject the request.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Type Restrictions

Requirements for what file types can be uploaded to the platform.

- THE system SHALL accept only image files for all upload operations, including seller logo images and product images.
- IF a file is not an image file, THEN THE system SHALL reject the upload and inform the user that only image files are allowed.
- THE system SHALL validate the file type at the time of upload, before storing the file.
- WHERE a seller uploads a logo image, THE system SHALL accept exactly one logo image per seller profile.
- THE system SHALL accept multiple image files for a single product upload operation.

### Virus and Security Scanning

Requirements for security scanning of uploaded files before they are stored and served.

- THE system SHALL scan every uploaded file for malicious content before the file is stored.
- IF a file is found to contain a security threat, THEN THE system SHALL reject the upload and not store the file.
- THE system SHALL notify the uploading user when a file is rejected due to security concerns, indicating the rejection reason.

### Content Type Verification

Requirements for verifying that uploaded files are valid and match their declared content type.

- THE system SHALL verify that the actual content of each uploaded file matches its declared content type.
- IF a file's actual content does not match its declared content type, THEN THE system SHALL reject the upload.
- IF an uploaded file is corrupted or cannot be processed as a valid image, THEN THE system SHALL reject the upload and inform the user that the file is invalid.
- THE system SHALL perform content type verification before the file is stored.

### File Retention Policy

Requirements for how long uploaded files are retained in active storage and when they are removed.

- THE system SHALL retain uploaded files in active storage as long as the associated entity — seller profile or product — exists.
- WHEN a product is deleted, THE system SHALL remove all images associated with that product from active storage.
- WHEN a seller deletes a specific product image, THE system SHALL remove that image from active storage.
- WHEN a seller deletes their account, THE system SHALL remove their logo image and all product images from active storage.
- THE system SHALL preserve image files that are part of snapshots indefinitely, in accordance with the snapshot retention rules (defined in 05-non-functional.md).
- WHERE a file is preserved in a snapshot, THE system SHALL continue to serve it for snapshot viewing purposes even after the original entity has been deleted.
- WHEN a file is removed from active storage, THE system SHALL ensure it is no longer accessible through regular product listings, search results, or seller profiles.

# Integration Error Handling

Error handling and retry policies for external integrations.

## Integration Failure Policies

Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

### Payment Retry Rules

IF payment processing fails during order placement, THEN THE system SHALL allow the customer to retry the payment without re-entering cart items or shipping information.

THE system SHALL preserve the customer's cart contents and selected shipping address between payment retry attempts within the same checkout session.

WHEN a payment retry succeeds, THE system SHALL proceed with order creation as described in the Order Creation rules.

THE system SHALL limit the number of consecutive payment retry attempts a customer may make within a single checkout session. When the retry limit is reached, THE system SHALL reject further payment attempts for that session and display a message advising the customer to try again later.

THE system SHALL treat each customer-initiated retry as a new, independent payment request to the external payment gateway. The system SHALL NOT reuse or cache prior payment authorization tokens across retry attempts.

### Payment Gateway Circuit Breaker

WHEN the external payment gateway returns consecutive failures across multiple checkout sessions beyond an established threshold, THE system SHALL temporarily suspend all new payment processing requests to the gateway.

WHILE payment processing is suspended, THE system SHALL prevent customers from proceeding to the payment step during checkout and SHALL display a notice informing them that payments are temporarily unavailable.

THE system SHALL automatically attempt to verify payment gateway connectivity after a recovery period. IF a trial request succeeds, THEN THE system SHALL restore full payment processing capability and remove the suspension notice. IF the trial request fails, THEN THE system SHALL extend the suspension.

THE system SHALL record each circuit breaker state change — including suspension start time, recovery attempt results, and restoration time — for administrator review.

### Payment Failure Fallback

IF payment fails and the customer does not complete a successful retry within the same checkout session, THEN THE system SHALL NOT create the order.

THE system SHALL preserve the customer's cart contents, including all items and their quantities, after an unsuccessful checkout session. The customer SHALL be able to return to checkout at a later time with the same items.

THE system SHALL preserve the customer's selected shipping address from the failed checkout session. When the customer resumes checkout, the previously selected address SHALL be pre-selected if it still exists on the customer's account.

THE system SHALL display a clear message to the customer after payment failure, stating that payment was not processed, the order was not created, and the cart and shipping address have been preserved for later use.

### Integration Error Recording and Classification

WHEN an error occurs during communication with the external payment gateway, THE system SHALL record the error for diagnostic purposes. The recording SHALL include the error type returned by the gateway, the timestamp of the failure, and the affected checkout session.

THE system SHALL classify payment gateway errors into two categories based on the error response:

- Transient errors: Temporary failures where retrying may succeed (for example, network timeouts or temporary gateway unavailability).
- Permanent errors: Failures indicating the payment cannot succeed on retry (for example, invalid payment details or insufficient funds).

IF an error is classified as transient, THEN THE system SHALL apply the Payment Retry Rules and the customer SHALL be permitted to retry the payment.

IF an error is classified as permanent, THEN THE system SHALL reject the payment attempt without offering a retry and SHALL display a message to the customer describing the nature of the failure.

THE system SHALL provide administrators with access to recorded integration errors for troubleshooting purposes.