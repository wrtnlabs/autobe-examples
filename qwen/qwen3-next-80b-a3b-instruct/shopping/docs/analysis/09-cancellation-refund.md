# E-Commerce Shopping Mall Platform Requirements Specification

## Customer Account Management

### Registration and Authentication

WHEN a new customer wishes to use the platform, THE system SHALL require registration before granting access to any feature. Guests are prohibited from browsing, searching, or viewing product details.

WHEN a customer registers, THE system SHALL collect and validate two mandatory fields:
- Email address (format: standard RFC 5322 email syntax)
- Password (minimum 12 characters, containing at least one uppercase letter, one lowercase letter, one numeric digit, and one special character)

THE system SHALL hash the password using bcrypt with a cost factor of 12 before storage. Plaintext passwords SHALL Never be stored.

WHEN a customer logs in, THE system SHALL authenticate using email and password combination. The system SHALL accept case-sensitive email input but normalize it to lowercase before comparison.

IF the authentication credentials are invalid, THEN THE system SHALL return error code: AUTH_INVALID_CREDENTIALS and log the failed attempt.

THE system SHALL implement account lockout after 5 consecutive failed login attempts within 15 minutes. Account remains locked for 30 minutes.

WHEN a customer successfully logs in, THE system SHALL issue a JWT token with the following claims:
- sub: user ID
- role: customer
- exp: validity period of 24 hours
- iat: issuance timestamp
- aud: e-commerce-platform

THE system SHALL refresh the JWT token automatically every 12 hours during active sessions.

### Password Management

WHEN a customer requests to change their password, THE system SHALL:
- Require the customer to provide their current password
- Require a new password matching the same strength requirements as registration
- Require confirmation of the new password
- Verify the current password matches the stored hash

WHEN the password change is approved, THE system SHALL:
- Generate a new bcrypt hash of the new password
- Replace the old password hash
- Invalidate all active JWT tokens for this customer
- Send a confirmation email with timestamp of password change

THE system SHALL prevent password reuse for any of the last 5 passwords. The system SHALL maintain a history of hashed passwords.

### Account Deletion

WHEN a customer requests to delete their account, THE system SHALL:
- Request confirmation with a "DELETE" text input (case-sensitive)
- Require the customer to enter their password for authentication
- Verify the deletion request is not made within 24 hours of last order placement

WHEN the deletion request passes all validations, THE system SHALL:
- Mark the account as "deleted" with timestamp
- Immediately remove all personally identifying information:
  - Email address → replaced with "deleted_user_" + UUID + "@proxy.example.com"
  - Display name → "Deleted User"
  - Phone number → set to null
  - All address records → permanently purged
- Preserve:
  - All order records associated with the customer (for legal and seller compliance)
  - All reviews associated with the customer (but displayed as "Deleted User")
  - All wishlist items (but displayed as anonymous)
  - All cart items (but displayed as anonymous and marked as unassigned)

THE system SHALL retain authentication records for 7 years for auditing purposes.

THE system SHALL send a final confirmation email to the registered email address (before deletion) with summary of preserved data.

WHEN the customer account status is deleted, THE system SHALL revoke all access tokens and deny any subsequent login attempts with error: ACCOUNT_DELETED.

## Customer Profile Management

### Profile Structure

EVERY customer account SHALL have an associated profile with the following fields:
- display_name: String (minimum 2 characters, maximum 50 characters)
- phone_number: String (valid phone number format according to E.164 international standard, optional)
- profile_image_url: String (optional, uploaded image URL)
- created_at: ISO 8601 timestamp
- updated_at: ISO 8601 timestamp

### Profile Editing

WHEN a customer modifies their display name, THE system SHALL:
- Validate that the new name is between 2 and 50 characters
- Check for profanity and automated spam patterns using the platform's content filter
- Prevent duplicate display names across customers
- Update the updated_at timestamp

WHEN a customer modifies their phone number, THE system SHALL:
- Validate E.164 format compliance
- Send a one-time verification code to the new number via SMS
- Require the customer to enter the code within 5 minutes
- Only update the phone number after successful verification

THE system SHALL provide an option to remove the phone number entirely. Removal SHALL be immediate without verification.

### Profile Privacy

THE system SHALL NOT display customer phone numbers to other customers, sellers, or administrators except:
- To the customer themselves
- To an administrator who has initiated a compliance investigation

THE system SHALL mask phone numbers in all UI listings with the format: +** ***-***-**56

## Address Management

### Address Structure

EVERY shipping address SHALL contain the following mandatory fields:
- recipient_name: String (minimum 2 characters, maximum 100 characters)
- phone_number: String (E.164 format)
- street_address: String (minimum 5 characters)
- city: String (minimum 2 characters)
- state_province: String (maximum 100 characters, optional)
- postal_code: String (valid for country format)
- country: String (ISO 3166-1 alpha-2 code, e.g., "JP", "US")
- is_default: Boolean (default: false)
- created_at: ISO 8601 timestamp
- updated_at: ISO 8601 timestamp

### Address Operations

WHEN a customer adds a new address, THE system SHALL:
- Validate all fields against format requirements
- Set is_default to false automatically
- Limit total addresses per customer to 10

WHEN a customer edits an existing address, THE system SHALL:
- Validate all fields
- Update the updated_at timestamp
- Maintain all historical versions

WHEN a customer deletes an address, THE system SHALL:
- Permanently remove the address record
- Cannot delete the last address (must have at least one address)
- Automatically promote the next address as default if deleted address was the default

WHEN a customer sets an address as default, THE system SHALL:
- Set is_default to true for the selected address
- Set is_default to false for all other addresses belonging to the same customer
- Update the updated_at timestamp of the default address

WHEN a customer has no default address set, THE system SHALL:
- Automatically set the most recently created address as default
- Show a notification: "Your most recent address has been set as default."

### Address Prioritization

THE system SHALL always use the default address for:
- Checkout processes
- Autocomplete features
- Order confirmation defaults
- Seller fulfillment targets
- Any automated shipping processes

## Seller Account Management

### Seller Registration and Authentication

WHEN a seller wishes to register, THE system SHALL:
- Collect email address and password meeting the same requirements as customer accounts
- Require additional information:
  - Business license number (mandatory)
  - Business name (mandatory)
  - Business registration country (ISO 3166-1 alpha-2)

THE system SHALL send a verification email to the seller with a unique activation link.

WHEN the seller clicks the activation link, THE system SHALL:
- Mark seller account as "pending approval"
- Add the registration to the administrator approval queue

WHEN a seller logs in before account approval, THE system SHALL:
- Allow login with email and password
- Display this message: "Your seller account is pending administrator approval. You can view your dashboard but cannot list or edit products."

### Approval Workflow

WHEN an administrator reviews a seller registration, THE system SHALL:
- Display:
  - Business license evidence (uploaded by seller)
  - Business name
  - Registration country
  - Contact email
  - Registration timestamp
- Allow administrator to select one of three actions:
  - Approve
  - Reject (with mandatory reason)
  - Request more information (with mandatory reason)

WHEN an administrator rejects a seller, THE system SHALL:
- Send an email to the seller with the rejection reason
- Allow the seller to submit a new registration request with modified information
- Preserve the rejection reason in audit logs

WHEN an administrator approves a seller, THE system SHALL:
- Mark the account as "approved"
- Send an email notification to the seller
- Grant access to seller dashboard
- Enable product creation and management functions
- Create an empty store profile (shop name, description, logo)

### Password Management

Seller password change operations SHALL follow identical requirements as customer password changes:
- Must provide current password
- Must meet strength requirements
- Must confirm new password
- Must invalidate all active tokens
- Must prevent reuse of last 5 passwords
- Must send confirmation email

### Account Deletion

WHEN a seller requests to delete their account, THE system SHALL:
- Require confirmation with "DELETE" text input
- Require password authentication
- Validate that:
  - No order items have status "paid" or "shipped"
  - No pending cancellation requests exist
  - No pending refund requests exist
  - No products are listed (all products deleted)

IF any validation fails, THE system SHALL return error with list of violations:
- "You have 2 paid order items (Order #12345, #67890)"
- "You have 3 pending cancellation requests"
- "You have 5 products still listed"

WHEN all validations pass, THE system SHALL:
- Mark the seller account as "deleted" with timestamp
- Immediately remove:
  - Shop name
  - Shop description
  - Logo URL
  - Contact information
- Preserve:
  - All order history (including order items with "Seller name: [previous name]")
  - All product snapshots (with original seller ID and shop name)
  - All inventory history records
  - All review records (with seller name preserved)
- Hide the seller's shop name from all future listings

THE system SHALL generate a unique identifier for former sellers: "deleted_seller_" + UUID

## Seller Profile Management

### Profile Structure

EVERY approved seller SHALL have a profile with the following fields:
- shop_name: String (minimum 3 characters, maximum 100 characters, unique across platform)
- shop_description: String (minimum 10 characters, maximum 1000 characters)
- logo_url: String (valid URL to image, required)
- approval_status: Enum ("pending", "approved", "rejected")
- created_at: ISO 8601 timestamp
- updated_at: ISO 8601 timestamp
- approved_at: ISO 8601 timestamp (nullable)

### Profile Editing

WHEN a seller edits their shop name, description, or logo, THE system SHALL:
- Validate shop name is unique (case-insensitive comparison)
- Validate shop description is between 10 and 1000 characters
- Validate logo URL is a valid HTTPS URL to an image file (jpg, png, webp up to 5MB)
- Update the updated_at timestamp
- Create a snapshot BEFORE the change
- Log the change in profile history

### Profile Snapshots

WHEN a seller updates any profile field, THE system SHALL create an immutable snapshot record containing:
- snapshot_id: UUIDv7
- seller_id: reference to seller account
- shop_name: snapshot value
- shop_description: snapshot value
- logo_url: snapshot value
- created_at: snapshot timestamp
- changed_by: seller user ID
- change_reason: text field (optional)
- platform_version: string

EVERY access to a seller's current profile SHALL be accompanied by a "recent changes" indicator showing:
- Number of snapshots created
- Date of last successful update
- Link to view full history

### Profile Visibility

WHEN a customer views a seller's profile (from product detail, search results, or direct navigation):
- The system SHALL display:
  - Shop name
  - Shop description
  - Logo
  - Total products listed
  - Products available count
  - Number of verified purchases
  - Number of reviews
  - Average rating
  - Date seller was approved
  - Link to view all products

THE system SHALL NOT display:
- Seller's email
- Seller's phone number
- Seller's business license number
- Any private contact information
- Any user ID or internal identifiers

## Category Management

### Category Structure

EVERY category SHALL have the following fields:
- id: UUIDv7 (primary key)
- name: String (minimum 2 characters, maximum 100 characters, unique)
- description: String (minimum 5 characters, maximum 500 characters)
- parent_category_id: UUIDv7 (nullable, references self)
- position: Integer (sort order for UI display)
- slug: String (URL-safe version of name)
- created_at: ISO 8601 timestamp
- updated_at: ISO 8601 timestamp
- created_by: UUIDv7 (administrator ID)

### Nested Categories

THE system SHALL support exactly one level of nesting:
- Main categories (parent_category_id = null)
- Subcategories (parent_category_id references a main category)

WHEN an administrator creates a category, THE system SHALL:
- Validate that parent_category_id, if provided, points to an existing main category
- Enforce that no category can be its own parent (circular validation)
- Generate slug from name (lowercase, hyphen-separated, alphanumeric only)
- Set position to highest existing position + 1

WHEN an administrator deletes a category, THE system SHALL:
- If category has subcategories, move all subcategories to "Uncategorized" (system-generated root category)
- If category has no subcategories, remove it entirely
- Preserve all product-category associations (products become uncategorized)
- Create a snapshot recording the deletion

WHEN an administrator updates a category name or description, THE system SHALL:
- Create a snapshot of the previous state
- Update the updated_at timestamp
- Recalculate slug if name changed

### Category Access

WHEN a customer browses categories:
- THE system SHALL display main categories with number of subcategories in parentheses
- THE system SHALL display subcategories as indented list under their parent
- THE system SHALL NOT display categories with 0 products
- THE system SHALL not allow direct access to parent_category_id

## Snapshot Principle

### Purpose

THE platform SHALL maintain an immutable record of all business-critical state changes to ensure:
- Historical accuracy for dispute resolution
- Transparent change tracking
- Regulatory compliance
- Accurate representation of product state at time of purchase

SNAPSHOTS are NEVER editable or deletable by anyone, including super administrators.

### General Structure

EVERY snapshot SHALL contain:
- snapshot_id: UUIDv7
- entity_type: String ("product", "product_variant", "seller_profile", "order_item", "review", "cancellation_request", "refund_request")
- entity_id: String (the UUID of the affected entity)
- created_at: ISO 8601 timestamp
- created_by: UUIDv7 (user ID of actor who triggered change)
- action: String ("created", "updated", "deleted")
- previous_state: JSON object (serialized state before change)
- current_state: JSON object (serialized state after change)
- platform_version: String (version tag of the platform at time of change)
- reason: String (optional, text explanation for the change)
- external_reference: String (optional, link to order ID, ticket ID, etc.)

### Product Snapshots

WHEN a seller modifies any field of a product, THE system SHALL create a product snapshot.

A product snapshot SHALL contain:
- product_id: UUIDv7
- name: String
- description: String
- category_id: UUIDv7
- base_price: Decimal (2 decimal places)
- images: Array of objects
  - image_id: UUIDv7
  - url: String
  - position: Integer
  - is_thumbnail: Boolean
  - uploaded_at: ISO 8601 timestamp
- variant_count: Integer
- created_at: ISO 8601 timestamp
- updated_at: ISO 8601 timestamp (timestamp of change)
- seller_id: UUIDv7
- status: Enum ("active", "inactive", "deleted")

WHEN a product snapshot is created for an update:
- The previous_state SHALL contain the product state BEFORE the change
- The current_state SHALL contain the product state AFTER the change
- Snapshots SHALL be created even if only one field is modified

WHEN a product snapshot is created for deletion:
- previous_state SHALL contain the complete product state
- current_state SHALL be an empty object {}

### Product Variant Snapshots (SKU)

WHEN a seller modifies a product variant, THE system SHALL create a variant-level snapshot.

A product variant snapshot SHALL contain:
- product_snapshot_id: UUIDv7 (link to parent product snapshot)
- variant_id: UUIDv7
- sku_code: String (unique across platform, case-sensitive)
- option_values: Object (key-value pairs of options, e.g., {"color": "red", "size": "large"})
- price: Decimal (2 decimal places, nullable)
- stock_quantity: Integer
- created_at: ISO 8601 timestamp
- updated_at: ISO 8601 timestamp

EVERY product variant snapshot SHALL be linked to exactly one product snapshot (parent).

EVERY time a product snapshot is created, the system SHALL create a snapshot of ALL variants associated with that product at that moment.

### Seller Profile Snapshots

WHEN a seller updates any profile field (shop name, description, logo), THE system SHALL create a seller profile snapshot as described in the General Structure section.

Key fields remain:
- shop_name
- shop_description
- logo_url
- approval_status
- approved_at

### Order Item Snapshots

WHEN an order item is created (purchase), THE system SHALL create item-level snapshots for:
- Product state at time of purchase
- Product variant state at time of purchase
- Seller profile state at time of purchase

An order item snapshot SHALL contain:
- order_item_id: UUIDv7
- product_snapshot_id: UUIDv7
- variant_snapshot_id: UUIDv7
- seller_profile_snapshot_id: UUIDv7
- quantity: Integer
- unit_price: Decimal
- total_price: Decimal
- status: Enum ("paid", "shipped", "delivered", "cancelled", "refunded")
- created_at: ISO 8601 timestamp

All snapshot IDs are invariant and reference the state at time of purchase.

### Review Snapshots

WHEN a customer updates their review, THE system SHALL create a review snapshot.

A review snapshot SHALL contain:
- review_id: UUIDv7
- product_id: UUIDv7
- customer_id: UUIDv7
- rating: Integer (1-5)
- text_content: String (nullable)
- created_at: ISO 8601 timestamp
- updated_at: ISO 8601 timestamp
- status: Enum ("active", "deleted")

WHEN a review is deleted, THE system SHALL:
- Create a snapshot with status="deleted"
- Keep all original content
- Preserve the snapshot permanently
- Calculate average rating based only on active reviews

### Cancellation and Refund Request Snapshots

WHEN a cancellation or refund request is created or responded to, THE system SHALL create a request snapshot as defined in 09-cancellation-refund.md.

Each snapshot SHALL include:
- request_id: UUIDv7
- order_item_id: UUIDv7
- requester_id: UUIDv7
- requester_type: "customer"
- request_type: "cancellation" | "refund"
- reason: String (min 10, max 500)
- status: "pending" | "approved" | "rejected"
- response_id: UUIDv7 (if response exists)
- response_by: UUIDv7 (if response exists)
- response_reason: String (if rejection, min 10, max 500)
- response_at: ISO 8601 timestamp (if response exists)
- created_at: ISO 8601 timestamp
- updated_at: ISO 8601 timestamp

### Snapshot Retrieval

THE system SHALL expose a dedicated read-only endpoint for snapshots:
- GET /snapshots/{snapshot_id}
- GET /snapshots?entity_type={type}&entity_id={id}
- GET /snapshots?product_id={id}

Access permissions:
- Customer: Only their own snapshots
- Seller: Only snapshots for their products/products
- Administrator: All snapshots
- Super Administrator: All snapshots

ALL snapshot data SHALL be served read-only. No update or delete operations allowed on snapshot records.

## Product Management

### Product Creation

WHEN a seller creates a product, THE system SHALL:
- Require: name, description, category_id, base_price
- Require at least one variant (must be created simultaneously)
- Validate name length (≥5, ≤200)
- Validate description length (≥20, ≤5000)
- Validate base_price > 0 (minimum $0.01)
- Validate category exists and is active
- Generate unique product_id: UUIDv7
- Set status: "active"
- Set created_at and updated_at
- Set seller_id to the current seller

THE system SHALL NOT permit product creation if:
- Seller account is suspended
- Seller has exceeded 1000 active products threshold
- Product name duplicates existing product name for same seller

### Product Editing

WHEN a seller edits a product, THE system SHALL:
- Allow modification of: name, description, category_id, base_price
- Require snapshot creation BEFORE change
- Require re-validation of all fields
- Prevent modification if:
  - Product has paid or shipped items
  - Seller account is suspended

WHEN product name changes, THE system SHALL:
- Update product name in all existing order items (display purposes)
- Create a snapshot of previous name

WHEN category changes, THE system SHALL:
- Update category association
- Create a snapshot of old category_id

WHEN base price changes, THE system SHALL:
- Trigger price update in all existing variants (variants with custom prices remain unchanged)
- Create a snapshot of previous base price

### Product Deletion

WHEN a seller requests to delete a product, THE system SHALL:
- Verify:
  - No order items exist with status "paid" or "shipped"
  - No pending cancellation requests
  - No pending refund requests
- If any condition fails, return specific error list

WHEN deletion is approved, THE system SHALL:
- Mark product status as "deleted"
- Remove from search index and category listings
- Delete all variants and associated inventory records
- Freeze product snapshots (no further changes allowed)
- Preserve all existing snapshots permanently
- Send confirmation notification

### Product Images

### Image Management

EVERY product SHALL support:
- Up to 10 images per product
- Each image: URL (valid HTTPS), position (0-9), uploaded_at, image_id

WHEN a seller adds an image, THE system SHALL:
- Validate file type (jpg, png, webp)
- Validate file size ≤ 5MB
- Generate unique image_id: UUIDv7
- Upload to CDN
- Assign position = highest existing position + 1

WHEN a seller modifies image position, THE system SHALL:
- Reorder all images within the product
- Update positions accordingly
- Create a product snapshot

WHEN a seller deletes an image, THE system SHALL:
- Remove from database and CDN
- Assign new thumbnail if deleted image was thumbnail
- Create a product snapshot

The first image in position order SHALL be the thumbnail (main image).

### Product Variants (SKU)

### Variant Creation

WHEN a seller adds a variant to a product, THE system SHALL:
- Validate product exists and is active
- Validate SKU code is unique across platform
- Validate at least one option value is provided
- Validate price is either null or greater than or equal to 0
- Validate stock_quantity is integer ≥ 0
- Create variant entity
- Create a variant snapshot
- Set price = base_price if null

WHEN a seller creates a variant, THE system SHALL automatically:
- Assign next available SKU code: {product_id}-{hex_color_code}-{hex_size_code}
- Validate SKU uniqueness (no duplicate SKU codes)

### Variant Editing

WHEN a seller edits a variant, THE system SHALL:
- Allow change of: sku_code, option_values, price, stock_quantity
- Require snapshot creation BEFORE change
- Validate sku_code remains unique
- Validate price ≥ 0
- If price is changed, ensure it does not violate system pricing policy (e.g., ≥50% of base price)
- If stock_quantity is changed, validate inventory logic

WHEN variant option_values change, THE system SHALL:
- Note: this does NOT delete or recreate the variant
- Create snapshot of previous option values
- Maintain same variant_id and sku_code
- Preserve order history

### Variant Deletion

WHEN a seller requests to delete a variant, THE system SHALL:
- Validate:
  - No order items exist with this variant in "paid" or "shipped" status
  - No pending cancellation requests for this variant
  - No pending refund requests for this variant
- If any fails, return specific error message

WHEN deletion is approved, THE system SHALL:
- Mark variant as "deleted" with timestamp
- Remove from product's variant list
- Freeze all variant snapshots
- Delete inventory history records
- Preserve all snapshots permanently
- Recalculate product availability (if no variants left: product status becomes "unavailable")

WHEN a product has zero variants, THE system SHALL switch product status to "unavailable" and hide from normal browse/list results.

## Inventory Management

### Inventory History

EVERY inventory change SHALL be recorded as an immutable history record.

An inventory history record SHALL contain:
- record_id: UUIDv7 (primary key)
- variant_id: UUIDv7
- change_amount: Integer (positive = restock, negative = sale/adjustment)
- reason_code: Enum ("ORDER_PLACED", "CANCELLATION_APPROVED", "REFUND_APPROVED", "ADJUSTMENT_LOSS", "ADJUSTMENT_GAIN", "RETURN_FULFILLED")
- actor_id: UUIDv7 (seller ID or admin ID)
- reference_id: UUIDv7 (for link to order item, cancellation, refund, etc.)
- timestamp: ISO 8601 timestamp
- before_quantity: Integer (stock before this change)
- after_quantity: Integer (stock after this change)
- platform_version: String

### Current Stock Calculation

THE current stock of a variant SHALL be computed by summing ALL inventory history records:
- Sum all change_amount values where variant_id matches
- The result is the current inventory level

THE system SHALL NOT store current_stock as a direct field — it is ALWAYS calculated from history.

### Inventory Operations

WHEN an order is placed:
- THE system SHALL create a record with:
  - change_amount: -{quantity}
  - reason_code: "ORDER_PLACED"
  - actor_id: customer_id
  - reference_id: order_item_id
  - before_quantity: current stock before reduction
  - after_quantity: current stock after reduction

WHEN a cancellation is approved:
- THE system SHALL create a record with:
  - change_amount: +{quantity}
  - reason_code: "CANCELLATION_APPROVED"
  - actor_id: customer_id
  - reference_id: cancellation_request_id

WHEN a refund is approved:
- THE system SHALL create a record with:
  - change_amount: +{quantity}
  - reason_code: "REFUND_APPROVED"
  - actor_id: customer_id
  - reference_id: refund_request_id

WHEN a seller manually restocks:
- THE system SHALL require:
  - quantity > 0
  - reason text (min 5 chars)
- MAY populate reason_code: "ADJUSTMENT_GAIN"
- MAY set actor_id to seller_id

WHEN a seller manually adjusts inventory (loss):
- THE system SHALL require:
  - quantity > 0
  - reason text (min 5 chars)
- MAY populate reason_code: "ADJUSTMENT_LOSS"
- MAY set actor_id to seller_id

WHEN a return is fulfillment: if a customer returns a product and it is restocked:
- THE system SHALL create a record with:
  - change_amount: +{quantity}
  - reason_code: "RETURN_FULFILLED"
  - actor_id: admin_id
  - reference_id: return_id

### Stock Status Display

THE system SHALL evaluate stock status for each variant as follows:
- If after_quantity > 0 → DISPLAY: "In stock"
- If after_quantity == 0 → DISPLAY: "Out of stock"
- If after_quantity < 0 → DISPLAY: "Inventory error" (alert to admin)

Variants with "Out of stock" status SHALL be:
- Not available for purchase
- Not addressable in cart
- Not includable in wishlist

BUT:
- Previous orders and snapshots with these variants SHALL retain historical integrity
- Past purchases with these variants SHALL remain visible

### Inventory History Access

WHEN a seller views inventory history for a variant, THE system SHALL display:
- All history records for that variant
- Sorted by timestamp (newest first)
- Formatted change amounts (e.g., +3, -2)
- Reason text
- Actor name (seller or admin)
- Associated order/refund ID

WHEN an administrator views inventory history, THE system SHALL have access to ALL variants

## Product Search

### Search Criteria

WHEN a customer performs a product search:
- THE system SHALL index products using:
  - Name (full text search)
  - Description (full text search)
  - Category hierarchy (for filter)
  - Seller shop name (for filter)
  - SKU code (exact match only)
- Search shall be case-insensitive
- Search shall support partial matches ("red t" matches "Red T-Shirt")
- Search shall use stemming where applicable ("running" matches "runs")

### Search Filters

THE system SHALL support these filters:

1. Category:
- Filter by category_id
- May include subcategories (recursive)
- Filter expires if parent category deleted

2. Price Range:
- Filter by minimum price (≥)
- Filter by maximum price (≤)
- If variant price exists, use variant price
- If multiple variants, use lowest variant price as product price for filtering
- If only base price, use base price

3. In Stock Only:
- Include only products with at least one variant with stock > 0
- Exclude products where all variants are out of stock

4. Seller (optional advanced):
- Filter by seller_id
- Visibility limited to own products for sellers

### Search Sorting

THE system SHALL support these sorting options:

1. Newest First:
- Sort by product.created_at descending

2. Price (Low to High):
- Sort by minimum variant price (if variants exist)
- If no variants, use base price

3. Price (High to Low):
- Sort by maximum variant price (if variants exist)
- If no variants, use base price

4. Rating (High to Low):
- Sort by average customer rating (from reviews)
- Only products with at least 3 reviews included

5. Popularity:
- Sort by number of sales in last 30 days
- Limited to products with at least 10 sales

THE system SHALL default to "Newest First" sorting.

### Search Results

Search results SHALL be paginated:
- 20 results per page
- First page: 1-20
- Second page: 21-40
- etc.

Search results SHALL display each product with:
- Main image (thumbnail)
- Product name
- Base price or price range (e.g., "$29.99 - $49.99")
- Seller shop name
- Average rating (if ≥3 reviews exist)
- Review count
- "In stock" or "Out of stock" badge
- Product status tag (e.g., "New", "Sale", "Featured")

## Product Listing

### List Views

Product listing appears in:
- Search results
- Category pages (main and subcategory)
- Recommended products
- Featured collections
- Seller storefront

Common elements for all product list entries:
- Thumbnail image (first image of product)
- Product name (truncated at 80 characters with ellipsis)
- Price (minimum variant price if multiple, base price if none)
- Seller shop name (linked to seller profile)
- Average rating (if ≥3 reviews exist)
- Review count
- In stock badge

THE system SHALL NOT display:
- Product description
- Option variants
- Variant prices
- Inventory levels
- Seller contact info
- Copyright tags

### Product Count

ON EACH CATEGORY PAGE:
- Display the total number of products in that category (and subcategories)
- Format: "Found 128 products in Electronics"

ON SEARCH RESULTS:
- Display exact number of results
- Format: "128 results for 'blue shirt'"

## Product Detail Page

### Product Display

On product detail page, the system SHALL display:

1. Product Images
- All images in a horizontal carousel
- First image is pinned as large main image
- Users may drag to reorder images in edit mode
- Clicking any image shows it in full-screen viewer

2. Product Information
- Product name
- Product description
- Category path (e.g., Electronics > Phones > Smartphones)
- Seller shop name (as link to seller profile)

3. Variant Selection
- All variants available as selectable options
- Each option displays:
  - SKU code
  - Option values ("Color: Red, Size: Large")
  - Price (if differs from base price)
  - Stock status ("2 in stock", "Out of stock")
  - Add to cart button
- If no variants available, display: "This product is currently unavailable."

4. Rating and Reviews
- Average rating (e.g., 4.2 ★)
- Total number of reviews
- Review list (newest first)
- Each review displays:
  - Customer display name (or "Deleted User")
  - Rating (1-5 stars)
  - Review text (if any)
  - Date posted
  - "Edit" button (if authored by current user)
  - "Delete" button (if authored by current user)

5. Final Price Calculation
- If customer selects a variant, the price updates instantly
- The "Add to Cart" button activates only when a variant is selected
- The total price shown includes selected variant's price

### Dynamic Behavior

WHEN a customer selects a variant that is out of stock:
- THE system SHALL display warning: "Not enough in stock. Only 2 available."
- THE system SHALL disable Add to Cart button
- THE system SHALL NOT allow cart addition

WHEN a customer is not logged in:
- THE system SHALL display login prompt for reviews
- THE system SHALL show reviews but disable "Add to Wishlist" and "Add to Cart"

WHEN a seller views their own product:
- THE system SHALL show "Edit Product" button
- THE system SHALL show inventory management controls
- THE system SHALL highlight "Snapshot History" link

## Wishlist Management

### Wishlist Structure

EVERY customer SHALL have a wishlist identified by customer_id.

Each wishlist item SHALL contain:
- wishlist_item_id: UUIDv7
- customer_id: UUIDv7
- product_id: UUIDv7
- added_at: ISO 8601 timestamp
- position: Integer (sort order)

### Wishlist Operations

WHEN a customer adds a product to their wishlist, THE system SHALL:
- Validate customer is logged in
- Validate product exists and is active
- Validate product is not already in wishlist (prevent duplicates)
- Add entry with current timestamp
- Set position = highest existing position + 1

WHEN a customer removes a product from wishlist, THE system SHALL:
- Remove the wishlist item
- Re-index the remaining items

WHEN a product is deleted by the seller, THE system SHALL:
- Automatically remove the wishlist item for all customers
- Preserve the deletion timestamp for audit
- Send rejection to user if they try to add deleted product

WHEN a customer views their wishlist, THE system SHALL:
- Return items sorted by added_at descending (newest first)
- Paginate results (20 per page)
- Display:
  - Product thumbnail
  - Product name
  - Seller shop name
  - Price (minimum variant price)
  - Stock status
  - "Remove from wishlist" button
- Show:
  - "Wishlist is empty" if no items
  - "Found 8 products in your wishlist" if items exist

### Wishlist Privacy

THE system SHALL NOT allow:
- Public sharing of wishlist
- Viewing other users' wishlists
- Exporting wishlist to file
- Email notifications about wishlist changes
- Social media integration

Wishlist items are personal, private, and browser-local.

## Shopping Cart

### Cart Structure

EVERY customer SHALL have a shopping cart associated with their account.

A shopping cart item SHALL contain:
- cart_item_id: UUIDv7
- customer_id: UUIDv7
- variant_id: UUIDv7
- quantity: Integer (≥1)
- added_at: ISO 8601 timestamp
- updated_at: ISO 8601 timestamp

### Cart Operations

WHEN a customer adds a variant to cart:
- THE system SHALL:
  - Validate customer is logged in
  - Validate variant exists and is active
  - Validate variant has stock > 0
  - Validate seller account is not suspended
  - If cart already contains this variant, increase quantity by X
  - Else, add new cart item
  - Update updated_at timestamp

WHEN a customer changes quantity of an item:
- THE system SHALL:
  - Validate quantity ≥1 and ≤50
  - Validate new quantity ≤ available stock
  - Update quantity and updated_at
  - If quantity becomes 0, delete the item from cart

WHEN a customer removes an item from cart:
- THE system SHALL delete the cart item record

WHEN a customer views cart:
- THE system SHALL display:
  - Product name
  - Variant options (e.g., "Color: Blue, Size: Large")
  - Unit price (variant price)
  - Quantity
  - Subtotal (unit price × quantity)
  - Delete button per item
  - "Update quantity" option
- THE system SHALL display:
  - Total quantity sum
  - Total price sum
- THE system SHALL display warning if:
  - Any variant has stock < cart quantity: "Only 2 left in stock, but you have 3."
  - Any variant is out of stock: "This item is currently out of stock."
  - Any product is deleted: "Product no longer available. Removed from cart."

### Cart Validation

WHEN a customer proceeds to checkout:
- THE system SHALL validate:
  - All cart items have variant_id pointing to active products
  - All variants have stock ≥ cart quantity
  - No variant belongs to a suspended seller
  - Cart is not empty
- If any validation fails, THE system SHALL:
  - Block checkout
  - Highlight invalid items
  - Display specific error messages (e.g., "Product: 'Red Shirt' is no longer available")

THE system SHALL NOT permit checkout if any item is "unavailable".

## Checkout and Payment

### Checkout Process

WHEN a customer proceeds to checkout:
- THE system SHALL display:
  - Cart summary (products, variant options, quantities, prices)
  - Shipping address selection (default if none selected)
  - Total price
- THE system SHALL display button: "Proceed to Payment"

WHEN customer selects shipping address:
- THE system SHALL lock address choice
- THE system SHALL store selected address_id with order

WHEN customer clicks "Proceed to Payment":
- THE system SHALL validate:
  - Cart is not empty
  - All item quantities ≤ available stock
  - All sellers active
  - Address is valid and belongs to customer
- If valid, redirect to payment gateway

### Payment Processing

WHEN payment is processed:
- THE system SHALL:
  - Receive notification from payment gateway
  - Record payment status: "success" or "failure"
  - Log payment ID, timestamp, amount, currency
- IF payment fails:
  - THE system SHALL:
    - Clear cart items
    - Keep cart history for audit
    - Show error message: "Payment failed. Please try again."
    - Allow retry
- IF payment succeeds:
  - THE system SHALL:
    - Create order record
    - Remove cart items
    - Reduce variant inventories
    - Create order items with status "paid"
    - Create snapshots of products, variants, and seller profiles
    - Send order confirmation email

### Order Creation

WHEN payment succeeds:
- THE system SHALL create a new order with:
  - order_id: UUIDv7
  - customer_id: UUIDv7
  - shipping_address_id: UUIDv7
  - total_price: Decimal
  - currency: "USD" (fixed)
  - status: "pending" → will be derived from items
  - created_at: ISO 8601 timestamp
  - updated_at: ISO 8601 timestamp

FOR EACH cart item:
- THE system SHALL create an order item with:
  - order_item_id: UUIDv7
  - order_id: UUIDv7
  - product_id: UUIDv7
  - variant_id: UUIDv7
  - seller_id: UUIDv7
  - quantity: Integer
  - price_at_time_of_purchase: Decimal (variant price)
  - status: "paid"
  - created_at: ISO 8601 timestamp
  - product_snapshot_id: UUIDv7 (from snapshot created at order time)
  - variant_snapshot_id: UUIDv7 (from snapshot created at order time)
  - seller_profile_snapshot_id: UUIDv7 (from snapshot created at order time)
  - external_transaction_id: NULL (will be filled on payment success)

ALL snapshots created in order creation SHALL be immutable and permanently preserved.

## Order Structure and Status

### Order Item Status

EVERY order item SHALL have one status from:
- "paid": payment received, awaiting shipment
- "shipped": seller has shipped the item
- "delivered": customer has confirmed delivery
- "cancelled": item cancelled following approval
- "refunded": item refunded following approval

THE system SHALL assign status per item automatically based on events:

- Pay: "paid"
- Shipment created: "shipped"
- Delivery confirmed or 14-day window passed: "delivered"
- Cancellation approved: "cancelled"
- Refund approved: "refunded"

### Order Status

The overall order status SHALL be derived from its items:

- If all items are "paid" → order status: "paid"
- If any item is "shipped" and no item is "delivered" → order status: "shipped"
- If all items are "delivered" → order status: "delivered"
- If all items are "cancelled" → order status: "cancelled"
- If all items are "refunded" → order status: "refunded"
- If mixed statuses → order status: "partially completed"

THE system SHALL update order status automatically as item statuses change.

THE system SHALL display the order status as a banner on the order details page.

## Shipping and Tracking

### Shipment Creation

WHEN a seller prepares to ship, THE system SHALL:
- Display all order items belonging to seller with status "paid"
- Allow selection of one or multiple items
- Allow seller to specify:
  - Carrier name (free text)
  - Tracking number (as provided by carrier)
- Create a shipment record:
  - shipment_id: UUIDv7
  - seller_id: UUIDv7
  - address_id: UUIDv7
  - items: [order_item_id, ...]
  - carrier_name: String
  - tracking_number: String
  - created_at: ISO 8601 timestamp
  - shipped_at: ISO 8601 timestamp (now)

WHEN a shipment is created, THE system SHALL:
- Change status of ALL associated order items to "shipped"
- Mark shipment as active
- Send tracking email to customer

### Delivery Confirmation

WHEN a customer views order with shipment:
- THE system SHALL display:
  - Carrier name
  - Tracking number (clickable, open tracking URL)
  - Status: "Shipped" or "Delivered"
- Customer may click "Confirm Delivery" button

WHEN customer clicks "Confirm Delivery":
- THE system SHALL:
  - Change status of ALL items in this shipment to "delivered"
  - Record confirmation timestamp
  - Send confirmation to seller

WHEN 14 days elapse since shipment without confirmation:
- THE system SHALL:
  - Automatically change status of items to "delivered"
  - Log automated confirmation
  - Send system email to customer: "Your order has been marked as delivered because no response was received within 14 days."

### Rejection of Delivery

IF customer refuses delivery:
- Customer may open return request workflow
- Return request creates new order item status "return_requested"
- Refund process follows standard refund workflow

## Order Cancellation

### Cancellation Request

WHEN a customer requests cancellation for an order item:
- THE system SHALL:
  - Allow only if status == "paid"
  - Require reason text (min 10 characters, max 500)
  - Create request snapshot (as defined in snapshot section)
  - Set status: "pending"
  - Block seller from shipping this item

WHEN seller responds to cancellation request:
- THE system SHALL:
  - Allow "approve" or "reject" only
  - Require reason for rejection (min 10 chars)
  - Create response snapshot
  - If approved:
    - Change item status to "cancelled"
    - Restore inventory (+quantity)
    - Trigger refund workflow
  - If rejected:
    - Keep item status "paid"
    - Unblock shipping

WHEN seller does not respond within 48 hours:
- THE system SHALL automatically approve cancellation
- Create automated approval snapshot
- Trigger inventory restoration

## Refund Requests

### Refund Request

WHEN a customer requests refund for an order item:
- THE system SHALL:
  - Allow only if status == "delivered"
  - Allow only if delivery timestamp is within 7 days (168 hours)
  - Require reason text (min 10 chars, max 500)
  - Create refund request snapshot
  - Set status: "pending"

WHEN seller responds to refund request:
- THE system SHALL:
  - Allow "approve" or "reject" only
  - Require reason for rejection (min 10 chars)
  - Create response snapshot
  - If approved:
    - Change item status to "refunded"
    - Restore inventory (+quantity)
    - Initiate refund to customer
  - If rejected:
    - Keep item status "delivered"

WHEN seller does not respond within 72 hours:
- THE system SHALL automatically approve refund
- Create automated approval snapshot
- Trigger inventory restoration
- Initiate refund to customer

## Reviews and Ratings

### Review Eligibility

WHEN a customer attempts to write a review:
- THE system SHALL allow only if:
  - Customer has purchased the product
  - At least one item with that product has status "delivered"
  - Review has not been written for this product in this order
  - The review is submitted within 90 days of delivery

WHEN review eligibility fails, THE system SHALL:
- Return error: "You can only review products after delivery and only once per order."

### Review Creation

WHEN a customer creates a review:
- THE system SHALL:
  - Require rating (1-5 stars)
  - Allow optional text (min 0, max 5000 characters)
  - Validate customer is the purchaser
  - Validate eligibility
  - Set status: "active"
  - Create review snapshot
  - Record review timestamp

### Review Editing

WHEN a customer edits a review:
- THE system SHALL:
  - Allow only if review is "active" and created within last 7 days
  - Update text and rating
  - Create new snapshot (preserve original)
  - Update updated_at timestamp
  - Allow only one edit

WHEN 7 days pass after review creation:
- THE system SHALL lock review from further editing
- Display message: "This review cannot be edited."

### Review Deletion

WHEN a customer deletes a review:
- THE system SHALL:
  - Set status to "deleted"
  - Create snapshot of previous state
  - Preserve all original content
  - Update product average rating (excluding deleted reviews)

WHEN an administrator deletes a review (for policy violations):
- THE system SHALL:
  - Set status to "deleted_by_admin"
  - Log admin ID and reason
  - Preserve snapshot
  - Update average rating

### Rating Calculation

THE average rating of a product SHALL be calculated as:

Average = Sum of all active review ratings / Count of active reviews

ONLY reviews with status "active" SHALL be included.

Deleted reviews (status == "deleted" or "deleted_by_admin") SHALL be excluded.

The system SHALL update average rating whenever:
- A review is created
- A review is edited
- A review is deleted
- An admin deletes a review

## Seller Dashboard

### Dashboard Overview

WHEN a seller accesses their dashboard, THE system SHALL display:
- Total products listed
- Total products sold (total quantity, not orders)
- Total revenue (sum of all payment-confirmed order items)
- Number of pending cancellation requests
- Number of pending refund requests
- Customer rating average
- Total customer reviews

These stats SHALL be updated in real-time and reflect live data.

### Order Item List

WHEN a seller views their order items, THE system SHALL:
- Display all items where seller_id matches
- Sort by created_at descending (newest first)
- Allow filtering by:
  - Status: paid, shipped, delivered, cancelled, refunded
  - Date range
- Display:
  - Product name
  - Variant options
  - Quantity
  - Unit price
  - Total price
  - Customer name (display name)
  - Order number
  - Shipping address (city, country)
  - Status badge
  - "Request cancellation" button (if status="paid")
  - "Request refund" button (if status="delivered")

## Administrator System

### Administrator Role Assignment

WHEN a user (customer or seller) requests administrator status:
- THE system SHALL:
  - Accept a role request form with optional reason
  - Record request with timestamp
  - Assign status: "pending"
  - Notify super administrators via internal dashboard

WHEN a super administrator reviews request:
- THE system SHALL:
  - Allow approve/reject
  - If approved:
    - Change role to "administrator"
    - Record approval timestamp and administrator ID
    - Send confirmation email
  - If rejected:
    - Send rejection email with reason
    - Record rejection in audit log

### Administrator Grades

The system SHALL support two grades:
- Regular administrator
- Super administrator

All new administrators shall start as regular administrators.

WHEN a super administrator promotes a regular to super:
- THE system SHALL:
  - Verify actor has super status
  - Change role to "super_administrator"
  - Log promotion with influencer ID and timestamp
  - Send notification

WHEN a super administrator demotes another super:
- THE system SHALL:
  - Verify actor has super status
  - Verify target is NOT the actor themselves
  - Change target's role to "administrator"
  - Log demotion with actor ID and timestamp
  - Send notification

THE system SHALL NOT allow:
- Self-demotion of super administrators
- Regular administrators to promote or demote others
- Role removal without explicit administrative action

### Seller Management

WHEN an administrator views pending seller approvals:
- THE system SHALL display:
  - Seller ID
  - Business name
  - Business license file
  - Registration timestamp
  - Email
  - Action buttons: Approve, Reject (with reason), Ignore (for now)

WHEN an administrator rejects a seller:
- THE system SHALL:
  - Mark seller as "rejected"
  - Require reason text (min 10 chars)
  - Send rejection email
  - Allow seller to reapply

WHEN an administrator suspends a seller:
- THE system SHALL:
  - Mark seller status as "suspended"
  - Hide all associated products from search and category lists
  - Block product creation and editing
  - Allow processing of existing orders (shipping, cancellation, refund responses)
  - Send suspension notice

WHEN an administrator unsuspends a seller:
- THE system SHALL:
  - Mark seller status as "approved"
  - Re-enable product visibility
  - Re-enable product management
  - Send notification

### Category Management

WHEN an administrator creates a category:
- THE system SHALL:
  - Require name (≥2 chars)
  - Require description (≥5 chars)
  - Assign parent (if nesting)
  - Validate uniqueness of name
  - Generate slug
  - Create snapshot

WHEN an administrator edits a category:
- THE system SHALL:
  - Allow modification of name/description
  - Require snapshot creation
  - Prevent name duplication

WHEN an administrator deletes a category:
- THE system SHALL:
  - Move all subcategories to "Uncategorized" if exist
  - Leave products uncategorized
  - Delete category record
  - Create deletion snapshot

### Product Oversight

WHEN an administrator views all products:
- THE system SHALL:
  - Display all products regardless of seller
  - Show product name, seller name, category, status, active variants
  - Allow filtering by status, seller, category
- THE system SHALL:
  - Provide button: "View Snapshots" for each product
  - Provide button: "Delete Product" (confirmation required)

WHEN an administrator deletes a product:
- THE system SHALL:
  - Perform same action as seller deletion (inventory purge, snapshot preservation)
  - Log administrator action
  - Send notification to seller

### Order Oversight

WHEN an administrator views all orders:
- THE system SHALL have access to:
  - All order records
  - All order item records
  - All snapshots
  - All seller and customer data

WHEN an administrator forces a cancellation:
- THE system SHALL:
  - Allow cancellation of any item (even after shipment)
  - Choose reason: "Admin Intervention"
  - Create cancellation snapshot
  - Restore inventory
  - Initiate refund
  - Log admin ID and reason

WHEN an administrator forces a refund:
- THE system SHALL:
  - Allow refund of any item
  - Choose reason: "Admin Refund"
  - Create refund snapshot
  - Restore inventory
  - Initiate refund
  - Log admin ID and reason

### User Management

WHEN an administrator views customers:
- THE system SHALL:
  - Display: display_name, email, phone, created_at, last_login
  - Allow filtering by ban status

WHEN an administrator bans a customer:
- THE system SHALL:
  - Mark account as "banned"
  - Revoke all active sessions
  - Block login attempts
  - Log admin action with reason

WHEN an administrator unbans a customer:
- THE system SHALL:
  - Remove ban status
  - Restore access
  - Log admin action

WHEN an administrator views sellers:
- THE system SHALL:
  - Display: shop_name, approval_status, created_at, suspended status

WHEN an administrator bans a seller:
- THE system SHALL:
  - Mark as "banned"
  - Block login
  - Unhide products
  - Allow processing of existing orders
  - Send notification

WHEN an administrator unbans a seller:
- THE system SHALL:
  - Remove ban status
  - Restore access
  - Log action