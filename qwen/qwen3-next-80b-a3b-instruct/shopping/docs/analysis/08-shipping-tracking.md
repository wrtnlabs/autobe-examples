# E-Commerce Shopping Mall Platform

## Customer Account

WHEN a user attempts to access any feature of the platform, THE system SHALL require the user to have a registered account. THE system SHALL NOT permit guest browsing under any circumstances.

WHEN a user initiates registration, THE system SHALL require the following: a valid email address and a password that meets complexity requirements (minimum 12 characters, including uppercase, lowercase, numeric, and special characters).

WHEN a user logs in, THE system SHALL authenticate using the provided email and password. THE system SHALL require email verification before account activation.

WHEN a user requests a password change, THE system SHALL require authentication of the current password. THE system SHALL validate the new password against complexity rules and require confirmation.

WHEN a user requests account deletion, THE system SHALL:
- Immediately remove all profile data (display name, phone number, address history)
- Preserve all order records, order history, and payment transactions
- Preserve reviews but anonymize them by displaying "deleted user" as the reviewer name
- Mark account status as "deleted" and prevent future login attempts
- Initiate a 14-day grace period before permanent data purge, during which the user may cancel the deletion request

## Customer Profile

WHEN a customer logs in, THE system SHALL display their profile with: display name and phone number.

WHEN a customer edits their display name, THE system SHALL:
- Validate that the name contains only alphanumeric characters, spaces, and allowed punctuation
- Limit the name length to 50 characters
- Preserve the previous display name in profile edit history (not as a snapshot)

WHEN a customer edits their phone number, THE system SHALL:
- Validate the format against international E.164 standard
- Send a confirmation code to the new number
- Require confirmation before update is finalized
- Preserve the previous number in profile edit history

## Address Management

WHEN a customer adds a new shipping address, THE system SHALL require the following fields:
- Recipient name (required, max 100 characters)
- Phone number (required, E.164 format)
- Street address (required, min 5 characters)
- City (required, max 50 characters)
- State/Province (required, max 50 characters)
- Postal code (required, validated by country format)
- Country (required, selected from ISO 3166-1 alpha-2 code list)

WHEN a customer edits an existing address, THE system SHALL:
- Allow modification of any field except the address ID
- Preserve the previous version in address edit history (not as a snapshot)

WHEN a customer deletes an address, THE system SHALL:
- Remove the address from the list of active addresses
- Preserve the address record for order fulfillment historical integrity
- Prevent deletion of the default address if it's the only remaining address

WHEN a customer sets an address as default, THE system SHALL:
- Mark the selected address as default
- Remove default designation from all other addresses
- Record the timestamp of the change
- Preserve previous default address in audit trail

## Seller Account

WHEN a user attempts to register as a seller, THE system SHALL require:
- Valid email address
- Password meeting complexity requirements
- Business registration number (optional but recommended)
- Tax ID (optional but recommended)

WHEN a seller attempts to log in, THE system SHALL authenticate using email and password, but SHALL restrict access to seller dashboard until approval status is "approved".

WHEN a seller requests a password change, THE system SHALL enforce the same rules as for customer password changes.

WHEN a seller account is registered, THE system SHALL set status to "pending" and notify administrators.

WHEN a seller views their account status, THE system SHALL display one of: "pending", "approved", or "rejected".

WHEN a seller is rejected, THE system SHALL:
- Store the rejection reason provided by the administrator
- Allow the seller to view the reason in their dashboard
- Permit re-registration with a new application

WHEN a seller attempts to delete their account, THE system SHALL validate:
- No order items with status "paid" or "shipped" exist
- No pending cancellation requests exist
- No pending refund requests exist

WHEN a seller deletes their account, THE system SHALL:
- Immediately remove the seller profile (shop name, description, logo)
- Remove access to seller dashboard
- Delete all products and related inventory records
- Preserve all order records and snapshots
- Preserve the seller's shop name in past order records
- Mark account status as "deleted"

## Seller Profile

WHEN a seller edits any of their profile data (shop name, description, logo), THE system SHALL create a snapshot that records:
- The exact state of the shop name before change
- The exact state of the shop description before change
- The exact state of the logo image URL before change
- The timestamp of the change
- The ID of the seller who made the change

WHEN a customer views a seller's profile, THE system SHALL display:
- The current shop name
- The current shop description
- The current logo image
- A button to view full registration history of profile changes
- A link to view the seller's product catalog

WHEN a buyer views a seller's previous profile snapshot, THE system SHALL display:
- The shop name and description as they appeared at the time of the snapshot
- The logo image as it existed at that time
- The timestamp when the change occurred
- No visible indication of subsequent changes

## Categories

WHEN an administrator creates a category, THE system SHALL require:
- Category name (required, unique, max 100 characters)
- Category description (optional, max 500 characters)
- Parent category ID (optional, for subcategories)

WHEN an administrator edits a category, THE system SHALL:
- Allow renaming and description updates
- Prevent renaming if the category has products assigned (unless in draft mode)
- Prevent changing parent category if products exist in the category
- Preserve old category data in edit history

WHEN a category is deleted, THE system SHALL:
- Mark the category as inactive
- Reassign all products in that category to their parent category (if exists) or to "uncategorized"
- Preserve category data in admin audit log
- Prevent deletion if the category has child subcategories

WHEN a customer views all categories, THE system SHALL list:
- All top-level categories with their descriptions
- Each category's subcategories indented below (one level deep)
- The number of products in each category
- Ability to expand/collapse subcategories

WHEN a customer views products within a category, THE system SHALL:
- List all products assigned to that category
- Include products assigned to all subcategories of that category
- Hide products that are deleted, suspended, or unavailable
- Maintain category hierarchy in breadcrumbs

## Snapshot Principle

WHEN any entity subject to direct modification is changed, THE system SHALL create a snapshot immediately. Snapshots are immutable and permanently stored.

WHEN a snapshot is created, THE system SHALL record:
- Timestamp of the change (ISO 8601 format)
- Actor performing the change (userID)
- Entity type ('Product', 'ProductVariant', 'SellerProfile', 'OrderItem', 'Review', 'CancellationRequest', 'RefundRequest')
- Entity ID
- Previous values (as JSON)
- New values (as JSON)
- Change reason (if provided by actor)
- IP address of the actor (if available)
- Device signature (if available)

WHEN a product is edited, THE system SHALL create a product snapshot that includes:
- All product fields (name, description, base price, category, images)
- All active variants associated with the product at that moment
- Each variant's SKU code, option values, price, and stock quantity

WHEN a product variant is edited, THE system SHALL create a product-snapshot-SKU that includes:
- SKU code
- Option values
- Price
- Stock quantity at time of change
- Parent product ID
- Timestamp of change

WHEN a seller's profile is edited, THE system SHALL create a seller-profile snapshot that includes:
- Shop name
- Shop description
- Logo image URL
- Profile update timestamp

WHEN an order item is created, THE system SHALL create an order-item snapshot that includes:
- Product name at time of purchase
- Product description at time of purchase
- Category name at time of purchase
- Variant option values at time of purchase
- Variant price at time of purchase
- Seller shop name at time of purchase
- Seller logo URL at time of purchase
- Timestamp of order creation

WHEN a review is edited, THE system SHALL create a review snapshot that includes:
- Rating before change
- Text content before change
- Rating after change
- Text content after change
- Timestamp of edit

WHEN a cancellation request changes status, THE system SHALL create a cancellation-request snapshot that includes:
- Previous status
- New status
- Reason provided
- Timestamp of change
- Admin or seller response (if applicable)

WHEN a refund request changes status, THE system SHALL create a refund-request snapshot that includes:
- Previous status
- New status
- Reason provided
- Timestamp of change
- Admin or seller response (if applicable)

WHEN a customer views any snapshot record, THE system SHALL:
- Display all recorded field values in their original form
- Show who made the change and when
- Use visual indicators to distinguish snapshot from current data
- Prohibit any modification of snapshot content

WHEN an administrator views a snapshot, THE system SHALL:
- Enable verification of changes for dispute resolution
- Allow comparison with current version when applicable
- Enable filtering by date, actor, and entity type

## Products

WHEN a seller creates a new product, THE system SHALL require:
- Product name (required, min 3 characters, max 200 characters)
- Product description (required, min 20 characters)
- Category selection (required, must be an approved category)
- Base price (required, greater than 0.00, max 1,000,000.00)

WHEN a seller edits an existing product, THE system SHALL:
- Allow modification of name, description, category, and base price
- Create a product snapshot before applying changes
- Maintain product ID and entity relationships
- Prevent modification if any variant has active "paid" or "shipped" order items

WHEN a seller deletes a product, THE system SHALL validate:
- No variants of the product have order items with status "paid" or "shipped"
- No pending cancellation requests exist for any variant
- No pending refund requests exist for any variant

WHEN a product is deleted, THE system SHALL:
- Remove the product from all search results and category listings
- Immediately delete all active variants
- Delete all inventory records associated with those variants
- Create a deletion snapshot preserving all product data and variants
- Allow administrators to restore the product from snapshot (if policy allows)

WHEN a seller views their own product snapshots, THE system SHALL display:
- List of all snapshots with timestamps
- View options for comparing two snapshots side-by-side
- Download functionality for export

WHEN an administrator views any product's snapshots, THE system SHALL have access to:
- All product snapshots regardless of seller ownership
- Full historical audit trail
- Ability to compare versions
- Ability to export snapshots

## Product Images

WHEN a seller uploads an image for a product, THE system SHALL:
- Accept JPG, PNG, and WebP formats
- Limit image size to 5MB
- Validate dimensions (minimum 800x800 pixels recommended)
- Assign a unique filename generated from product ID and timestamp
- Store the image in a secure content delivery network

WHEN a seller reorders product images, THE system SHALL:
- Move the selected image to the first position
- Update the main/thumbnail image index
- Record the reordering event
- Include the new order in the next snapshot

WHEN a seller deletes a product image, THE system SHALL:
- Remove the image from the product's image array
- Update the thumbnail image if the deleted image was the primary
- Create a product snapshot that records the deletion
- Preserve the image file in backup archive (not immediately deleted)

## Product Variants (SKU)

WHEN a seller adds a new variant to a product, THE system SHALL require:
- SKU code (required, unique across all products, alphanumeric, 8-20 characters)
- Option values (required, at least one option, format: "Color: Red", "Size: Large")
- Stock quantity (required, integer ≥ 0)
- Price (optional, positive number, with 2 decimal max)

WHEN a seller edits a product variant, THE system SHALL:
- Allow modification of SKU code, option values, price, and stock quantity
- Prevent changes if the variant has order items with status "paid" or "shipped"
- Create a product-snapshot-SKU record for each change
- Validate SKU uniqueness across all products

WHEN a seller deletes a product variant, THE system SHALL validate:
- No order items with status "paid" or "shipped" exist for that variant
- No pending cancellation requests exist for that variant
- No pending refund requests exist for that variant

WHEN a product has no variants, THE system SHALL:
- Display the product as "unavailable" in search and category results
- Prevent adding to cart
- Allow viewing of product details
- Permit adding variants by seller

## Inventory Management

WHEN a seller adds inventory (restock), THE system SHALL:
- Accept a positive integer quantity
- Require a reason (e.g., "Restock - Supplier shipment")
- Record timestamp, seller ID, product variant ID, change type (restock), and reason
- Increase current inventory level by the added quantity

WHEN a seller subtracts inventory (adjustment/loss), THE system SHALL:
- Accept a negative integer quantity
- Require a reason (e.g., "Damage", "Theft")
- Record timestamp, seller ID, product variant ID, change type (adjustment), and reason
- Decrease current inventory level by the subtracted quantity

WHEN a customer places an order, THE system SHALL automatically create an inventory record:
- Change type: "order"
- Quantity: negative (equal to ordered quantity)
- Reason: "Order #{{orderId}} - Customer purchase"
- Timestamp: order creation time
- Seller ID: product seller
- Variant ID: product variant ID
- Records change in another `