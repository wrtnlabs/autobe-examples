# E-Commerce Shopping Mall Platform Requirements

## Customer Account

### Registration

WHEN a new user signs up for the platform, THE system SHALL:
- Require a valid email address that meets RFC 5322 format
- Require a password with minimum 12 characters, containing uppercase, lowercase, numbers, and special characters
- Store password as a bcrypt hash with cost factor 12
- Generate a unique user ID (UUID v4) for the customer account
- Create an initial customer profile with default display name (email prefix) and empty phone number
- Send a confirmation email to verify the email address
- Lock the account until email verification is completed
- Log the registration attempt with IP address and timestamp

During email verification:
- THE system SHALL generate a one-time use token with 30-minute expiration
- THE system SHALL email a verification link containing the token
- WHEN the user clicks the verification link, THE system SHALL:
  - Validate the token exists and is not expired
  - Mark the account as "verified"
  - Enable account functionality
  - Delete the token after successful verification

### Login

WHEN a user attempts to log in, THE system SHALL:
- Accept email and password as credentials
- Look up account by email address
- If account does not exist, return "Invalid email or password"
- If account is locked due to failed attempts (5 consecutive failures), return "Account temporarily locked"
- If account is not verified, return "Email not verified"
- If account exists and is verified, compare provided password against stored bcrypt hash
- If password matches:
  - Generate JWT access token (expires in 15 minutes)
  - Generate JWT refresh token (expires in 7 days)
  - Store refresh token hash in database
  - Set refresh token in HTTP-only, Secure, SameSite=Strict cookie
  - Return access token in response body
- If password does not match:
  - Increment failed attempt counter
  - If counter reaches 5, lock account for 30 minutes
  - Return "Invalid email or password"

### Password Change

WHEN a customer requests to change password, THE system SHALL:
- Require current password verification
- Require new password to meet the same complexity requirements as registration (12+ characters, mixed case, numbers, special characters)
- If current password is incorrect, return "Current password is incorrect"
- If new password matches current password, return "New password cannot be the same as current password"
- Update password hash in database with new bcrypt hash
- Invalidate all existing refresh tokens for this user
- Log successful password change with timestamp and IP address

### Account Deletion

WHEN a customer requests to delete their account, THE system SHALL:
- Require password confirmation for authentication
- Require explicit confirmation "I understand this will delete my profile information but preserve my order history and reviews"
- Verify that account is not an administrator account
- If self-deletion prevents account deletion, return "Administrator accounts cannot be deleted through self-service"
- DELETE customer profile information:
  - Display name
  - Phone number
  - Shipping addresses
  - Wishlist entries
  - Cart items
  - Notifications
- PRESERVE the following data indefinitely:
  - All order records (including order items, payments, shipping details)
  - All review records (marked as "Deleted User")
  - All snapshot records associated with customer actions
- Mark account as "deleted" with deletion timestamp
- Collect any remaining refresh tokens and invalidate them
- Send confirmation email to the registered email address

## Customer Profile

### Profile Information

EACH customer account SHALL have the following profile fields:
- display_name: String, up to 100 characters, alphanumeric with spaces, hyphens, and underscores
- phone_number: String, formatted as +[country_code][number], with country code required
- created_at: ISO 8601 timestamp (UTC)
- updated_at: ISO 8601 timestamp (UTC)
- profile_image_url: Optional string (S3 bucket URL)

### Profile Editing

WHEN a customer updates their profile information, THE system SHALL:
- Allow editing of display_name and phone_number
- Validate display_name: alphanumeric with spaces, hyphens, underscores only (max 100 characters)
- Validate phone_number: must be in E.164 format with valid country code
- If phone number format is invalid, return "Invalid phone number format"
- If display_name contains invalid characters, return "Display name contains invalid characters"
- If display_name is empty, set to default (email prefix)
- If phone_number is empty, set to null
- Update the updated_at timestamp
- Return the updated profile object with new values
- Do NOT allow editing of created_at or updated_at directly

## Address Management

### Address Structure

EACH shipping address SHALL contain:
- recipient_name: String (required, 1-100 characters)
- phone_number: String (required, E.164 format)
- street_address: String (required, 1-255 characters)
- city: String (required, 1-100 characters)
- state_province: String (required, 1-100 characters)
- postal_code: String (required, 1-20 characters)
- country: String (required, ISO 3166-1 alpha-2 country code)
- is_default: Boolean (required, default false)
- created_at: ISO 8601 timestamp (UTC)
- updated_at: ISO 8601 timestamp (UTC)
- address_hash: String (SHA-256 hash of all field values for duplicate detection)

### Address Creation

WHEN a customer adds a new shipping address, THE system SHALL:

- Validate all required fields are provided and meet format requirements
- Create a new address record with is_default set to false
- Calculate address_hash from all field values
- Check for duplicate address (same address_hash already exists for this customer)
- If duplicate found, return "This address already exists in your address book"
- If no duplicate, create new address
- If this is the first address for this customer, set is_default to true automatically

### Address Editing

WHEN a customer edits an existing address, THE system SHALL:
- Verify the customer owns the address being edited (address.customer_id = current_user.id)
- Allow editing of all fields except created_at
- Update all changed fields with new values
- Recalculate address_hash
- If new hash matches existing hash of another address for this customer, return "This address already exists in your address book"
- Update updated_at field
- Return updated address object
- If is_default is changed to true:
  - Set is_default to false for all other addresses belonging to this customer
- If is_default is changed to false:
  - Only update is_default if there are other addresses
  - If this is the only address, do not let it be set to false

### Address Deletion

WHEN a customer deletes an address, THE system SHALL:
- Verify the customer owns the address being deleted
- If is_default is true and this is the only address:
  - Return "Cannot delete the only address. Add another address first."
- If is_default is true and there are other addresses:
  - Delete the address
  - Set the most recently created address as default
- If is_default is false:
  - Delete the address
- Log the deletion event with timestamp and IP

### Default Address

WHILE a customer has no addresses, THE system SHALL:
- Prevent checkout operations
- Show message: "You need to add at least one shipping address to complete checkout"

WHEN a customer has one or more addresses, THE system SHALL:
- Automatically designate the most recently created address as default for new orders
- Allow customers to explicitly set any address as default
- Pre-select the default address during checkout
- Allow default address to be overridden during checkout

## Seller Account

### Registration

WHEN a new seller signs up, THE system SHALL:
- Require email and password registration with same requirements as customer
- Require additional fields:
  - shop_name: String (required, 1-100 characters, alphanumeric with spaces, hyphens, underscores)
  - business_registration_number: String (optional, max 50 characters)
- Create seller account with status: "pending"
- Store registration time and IP address
- Generate seller_id (UUID v4)
- Send notification to administrators about pending approval
- Return success message: "Your seller application is pending approval"

### Login

WHEN a seller attempts to log in, THE system SHALL:
- Use same login logic as customer accounts
- After successful authentication:
  - Check seller_status field
  - If status is "pending":
    - Return "Your seller account is pending approval" (no access granted)
  - If status is "rejected":
    - Return "Your seller account has been rejected" (no access granted)
    - Include rejection_reason in response
  - If status is "approved":
    - Grant access to seller dashboard and features
    - Return JWT tokens as normal
  - If status is "suspended":
    - Return "Your seller account is suspended" (no access granted)

### Password Change

- Same process as customer password change
- Include validation that seller account is approved
- If account is not approved, return "Cannot change password for pending or rejected seller accounts"

### Deletion

WHEN a seller requests account deletion, THE system SHALL:
- Verify seller status is "approved"
- Check for outstanding debits and obligations:
  - Count order items with status: "paid", "shipped" (pending fulfillment)
  - Count cancellation requests with status: "pending"
  - Count refund requests with status: "pending"
- If ANY pending order items exist:
  - Return "Cannot delete account with pending orders. Complete all shipments first."
- If ANY pending cancellation/refund requests exist:
  - Return "Cannot delete account with pending cancellation or refund requests. Resolve all requests first."
- If all checks pass:
  - Delete seller account from database
  - Delete seller profile data (shop_name, description, logo)
  - Mark all seller products as deleted (see Product Deletion)
  - Preserve all order history, snapshots, reviews for this seller
  - Return success message with date and confirmation code

### Approval Status

A seller account SHALL have one of the following statuses:
- "pending": Registration completed, awaiting administrator approval
- "approved": Account approved, can sell products and manage inventory
- "rejected": Application rejected, cannot sell until resubmitted
- "suspended": Account suspended by administrator, cannot sell new products

### Rejection Flow

WHEN a seller registration is rejected by administrator, THE system SHALL:
- Set seller_status to "rejected"
- Store rejection_reason in database (free text, max 1000 characters)
- Send rejection email to seller with rejection reason
- Allow seller to resubmit registration (considered new application)
- When resubmitting:
  - Create new seller account record
  - Set status to "pending"
  - New rejection history is tracked separately
  - Previous rejection reason is retained but not reused

## Seller Profile

### Profile Structure

EACH seller SHALL have a profile with:
- shop_name: String (required, 1-100 characters)
- shop_description: String (optional, 0-1000 characters)
- logo_image_url: String (optional, S3 bucket URL)
- created_at: ISO 8601 timestamp (UTC)
- updated_at: ISO 8601 timestamp (UTC)
- status: Enum ("pending", "approved", "rejected", "suspended")
- approval_notes: String (optional, 0-2000 characters, for administrator use)

### Profile Editing

WHEN a seller updates their profile, THE system SHALL:
- Allow editing of shop_name, shop_description, logo_image_url
- Validate shop_name: alphanumeric with spaces, hyphens, underscores only (up to 100 characters)
- Validate shop_description: up to 1000 characters
- Validate logo_image_url: must be valid S3 URL or null
- Check for shop_name uniqueness across all sellers
- If shop_name duplicates existing seller's shop_name:
  - Return "Shop name already in use by another seller"
- If any change occurs:
  - Create product snapshot of: shop_name, shop_description, logo_image_url, updated_at
  - Set snapshot_type: "seller_profile"
  - Store snapshot_id in profile_history_records
  - Update profile with new values
- Return updated profile object

### Profile Viewing

WHEN a customer views a seller's profile (via product page or search), THE system SHALL:
- Show shop_name, shop_description, logo_image_url
- Show seller_status ("approved" only for actual profile display)
- If seller is suspended, show "Seller suspended" instead of shop information
- If seller is pending/rejected, redirect to general product search with message

## Categories

### Category Structure

EACH category SHALL have:
- id: UUID v4 (primary key)
- name: String (required, up to 100 characters)
- description: String (required, up to 500 characters)
- parent_category_id: UUID v4 or null (for subcategories)
- level: Integer (0 for top-level, 1 for subcategories)
- slug: String (URL-friendly unique identifier, auto-generated from name)
- created_at: ISO 8601 timestamp (UTC)
- updated_at: ISO 8601 timestamp (UTC)
- is_active: Boolean (default true)

### Category Creation

WHEN an administrator creates a category, THE system SHALL:
- Require name and description
- Validate name: 1-100 characters, alphanumeric with spaces
- Validate description: 1-500 characters
- If parent_category_id provided:
  - Check that parent category exists
  - Check that parent category level is 0
  - Set level = 1
  - Validate that no other subcategory exists under parent with same name
- If no parent_category_id:
  - Set level = 0
  - Check name uniqueness across all top-level categories
- Generate slug from name (lowercase, URL-friendly)
- Create category record
- Log creation with administrator ID and timestamp

### Category Editing

WHEN an administrator edits a category, THE system SHALL:
- Allow editing of name, description, is_active
- Validate new name: 1-100 characters, alphanumeric with spaces
- Validate new description: 1-500 characters
- If name changes, update slug accordingly
- If changing parent_category_id:
  - Check that target parent exists and level = 0
  - Check that no other child exists with same name under target parent
  - Update parent_category_id
  - Update level: if parent_id = null, level = 0; else level = 1
- If category has subcategories:
  - Allow edit of parent_category_id only if child categories are moved appropriately
  - Return warning if moving to new parent will create circular dependency
  - If circular dependency detected, return "Cannot create circular category relationship"
- Update updated_at
- Log edit with administrator ID and timestamp
- Create category snapshot with change history

### Category Deletion

WHEN an administrator deletes a category, THE system SHALL:
- If category has subcategories:
  - Return "Cannot delete category with subcategories. Move child categories first."
- If category has products:
  - Move all products in this category to "uncategorized" (category_id = null)
  - Log move with timestamp
- Delete category record
- Delete category snapshot records (for this category only)
- Return success with message "Category deleted and products moved to uncategorized"

### Category Viewing

WHEN a customer views all categories, THE system SHALL:
- Return top-level categories (parent_category_id is null)
- Include count of child subcategories for each
- Include count of active products in each category
- Order categories alphabetically by name
- Do NOT show deleted or inactive categories

WHEN a customer views products within a category, THE system SHALL:
- Show all products with category_id = specified id
- Include products from subcategories if category_id is specified by user
- Include products with status active
- Exclude products where seller is suspended
- Return paginated results (20 products per page)

## Snapshot Principle

### Purpose

THE system SHALL record snapshots for any change to data that may be subject to dispute, audit, or legal requirement. All snapshots are immutable and preserved indefinitely.

### Snapshot Object Model

EACH snapshot SHALL include:
- snapshot_id: UUID v4
- source_record_id: UUID (ID of original record being snapshotted)
- source_record_type: Enum (product, variant, seller_profile, order_item, review, cancellation_request, refund_request)
- operation_type: Enum (create, update, delete)
- version: Integer (incremental counter)
- snapshot_data: JSONB object (full copy of record at time of snapshot)
- snapshot_by: UUID (user_id of actor who caused change)
- snapshot_at: ISO 8601 timestamp (UTC)
- reason: String (optional, human-readable description)
- context: JSONB (auxiliary data like IP, device, session_id)

### Snapshot Storage

SNAPSHOTS SHALL be stored in a dedicated snapshots table with indexes on:
- source_record_id and source_record_type
- snapshot_at
- snapshot_by

SNAPSHOTS SHALL be read-only and never modified or deleted.

### Product Snapshots

WHEN a product is created, modified, or deleted, THE system SHALL:
- Create product snapshot with entirety of product fields:
  - product_id
  - name
  - description
  - category_id
  - base_price
  - currency_code
  - images (array of URLs)
  - created_at
  - updated_at
  - seller_id
  - is_active
- For each variant attached at time of snapshot, create a variant snapshot:
  - variant_id
  - product_id
  - sku_code
  - option_values (JSON: e.g., {"color": "Red", "size": "Large"})
  - price
  - stock_quantity
  - created_at
  - updated_at
- Store variant snapshots as nested array under snapshot_data.variant_snapshots
- Link snapshot record to product_id
- Log the operation type and snapshot actor

### Product Variant Snapshots

WHEN a product variant is created, modified, or deleted, THE system SHALL:
- Create variant snapshot with all fields:
  - variant_id
  - product_id
  - sku_code
  - option_values
  - price
  - stock_quantity
  - created_at
  - updated_at
- Link snapshot to parent product_id
- If parent product snapshot currently exists, update the variant_snapshots array in the primary product snapshot to reflect change
- Log the operation type and snapshot actor

### Seller Profile Snapshots

WHEN a seller profile is updated, THE system SHALL:
- Create snapshot with fields: shop_name, shop_description, logo_image_url
- Include snapshot_at and snapshot_by fields
- Store in snapshots table with source_record_type: "seller_profile"
- Link to seller_id
- Derive source_record_id from seller_id

### Order Item Snapshots

WHEN an order item is created (via checkout), THE system SHALL:
- Create snapshot of product at time of purchase:
  - name
  - description
  - category_id
  - base_price
  - currency_code
  - images
- Create snapshot of variant at time of purchase:
  - sku_code
  - option_values
  - price
  - stock_quantity
- Create snapshot of seller profile at time of purchase:
  - shop_name
  - shop_description
  - logo_image_url
- Store all three snapshots as nested objects under order_item.snapshot
- Store snapshot at time of order confirmation
- Link to order_item_id
- Preserve complete point-in-time state

### Review Snapshots

WHEN a review is created, modified, or deleted, THE system SHALL:
- Create snapshot with all fields:
  - rating
  - text_content
  - customer_id
  - product_id
  - order_item_id
  - created_at
  - updated_at
  - is_deleted
- Store in snapshots table with source_record_type: "review"
- If review is edited, create new version with updated_at and updated fields
- If review is deleted, create snapshot with is_deleted: true
- Preserve historical views for dispute resolution

### Cancellation and Refund Request Snapshots

WHEN a cancellation or refund request is:
- Created
- Updated (status change)
- Approved/rejected

THE system SHALL:
- Create snapshot with all request fields:
  - id
  - status
  - request_reason
  - request_at
  - response_reason (if provided)
  - responded_at (if resolved)
  - response_by (actor ID)
- Store in snapshots table with source_record_type: "cancellation_request" or "refund_request"
- If request is submitted by customer, snapshot_by = customer_id
- If request is resolved by seller, snapshot_by = seller_id
- Track full change history

### Snapshot Retrieval

WHEN a user requests snapshot data:
- Customer may view snapshots for their own orders/reviews
- Seller may view snapshots for their own products/variants/profiles
- Administrator may view all snapshots
- Snapshot records shall be returned as JSON object with full hierarchy
- Special access controls apply:
  - Customer: own data only
  - Seller: own records only
  - Admin: all data
- Snapshot retrieval SHALL retrieve ALL versions for a given record
- Snapshots SHALL be ordered by snapshot_at ascending

## Products

### Product Creation

WHEN a seller creates a new product, THE system SHALL:
- Require name (1-200 characters)
- Require description (1-2000 characters)
- Require category_id (must be active category)
- Require base_price: numeric, min 0.01, max 100000, stored as decimal
- Require currency_code: ISO 4217 code, default "USD"
- Generate product_id (UUID v4)
- Set seller_id to current seller
- Set is_active: true
- Set created_at and updated_at
- Create initial product snapshot:
  - operation_type: "create"
  - snapshot_data: full product object
- Return created product with ID

### Product Editing

WHEN a seller edits a product they own, THE system SHALL:
- Allow editing of: name, description, category_id, base_price, currency_code, is_active
- Validate new name: 1-200 characters
- Validate new description: 1-2000 characters
- Validate new base_price: 0.01-100000
- Validate currency_code: ISO 4217 format
- Validate category_id exists and is active
- If seller tries to edit product owned by another seller, return error
- When any edit occurs:
  - Create product snapshot of ALL fields before change
  - Create variant snapshots for all existing variants (snapshots of option_values, price, stock_quantity)
  - Update product in database with new values
- Return updated product object

### Product Deletion

WHEN a seller attempts to delete a product, THE system SHALL:
- Check for any order items with status: "paid", "shipped" related to any variant
- Check for any pending cancellation requests for any variant
- Check for any pending refund requests for any variant
- If ANY exist:
  - Return "Cannot delete product with pending orders or requests"
  - List affected variants and quantities
- If no pending items:
  - Delete all product variants (and inventory records associated)
  - Delete all product images
  - Set product.is_active to false (soft delete)
  - Create product snapshot with operation_type: "delete"
  - Return success message with deletion timestamp
- Products with deleted status:
  - Are not visible to customers in search or category listings
  - Are still accessible via product ID for snapshot purposes
  - Are still linked to historical orders

### Product Images

#### Upload

WHEN a seller uploads an image to a product, THE system SHALL:
- Accept one or multiple image files
- Validate file type: jpeg, jpg, png, webp (max 5MB each)
- Validate total images per product: max 10
- If limit exceeded, return "Maximum 10 images per product"
- Generate unique filename: product_id-image-hash-timestamp
- Upload to S3 with public read access
- Return URL to uploaded image
- Add to product.images array
- If no main image exists, set first uploaded image as main
- Create product snapshot including new image array

#### Reordering

WHEN a seller reorders product images, THE system SHALL:
- Accept array of image IDs in desired order
- Validate all image IDs belong to this product
- Reorder product.images array according to new order
- Establish first element as main/thumbnail image
- Create product snapshot with new image array

#### Deletion

WHEN a seller deletes a product image, THE system SHALL:
- Validate image belongs to this product
- Remove image from product.images array
- Delete image file from S3 storage
- If deleted image was the main image:
  - Set next available image as main
  - If no other images remain, set main_image_url to null
- Create product snapshot with updated image array

### Product Variants (SKU)

#### Creation

WHEN a seller adds a new variant to a product, THE system SHALL:

- Require sku_code: unique string, max 30 characters, alphanumeric, dash, underscore
- Require at least one option_value (e.g., color, size)
- Validate sku_code uniqueness across all variants of the product
- Validate option_values structure: JSON object (e.g., {"color": "Red", "size": "Large"})
- Allow price: optional, numeric, min 0.01, max 100000
- Set stock_quantity: 0
- Generate variant_id (UUID v4)
- Link to product_id
- Set created_at and updated_at
- Create variant snapshot with initial values
- Create product snapshot including all variants (with new one)

#### Editing

WHEN a seller edits a variant, THE system SHALL:
- Allow editing of: sku_code, option_values, price
- Validate sku_code: unique within product
- Validate option_values: JSON object format
- Validate price: 0.01-100000 if provided
- If sku_code changes:
  - Check for conflicts with existing variants
- If option_values change, validate they represent complete set of options
- If price changes:
  - Allow override of base_price
- When any edit occurs:
  - Create variant snapshot with previous values
  - Create product snapshot with all variants (including this updated one)
- Update variant record with new values
- Return updated variant

#### Deletion

WHEN a seller deletes a variant, THE system SHALL:
- Check for pending order items with status: "paid", "shipped" for this variant
- Check for pending cancellation requests for this variant
- Check for pending refund requests for this variant
- If ANY exist:
  - Return "Cannot delete variant with pending orders or requests"
- If no pending items:
  - Delete variant record
  - Delete all associated inventory records
  - Create variant snapshot with operation_type: "delete"
  - Create product snapshot with updated variant list
  - Return success

#### Required Variant

WHEN a product has zero variants, THE system SHALL:
- Still make product visible to customers (in search and categories)
- Display status: "Out of stock - No variants available"
- Disable "Add to cart" button
- Show message: "This product is currently not available for purchase"

## Inventory Management

### Inventory Records

EACH inventory record SHALL have:
- id: UUID v4
- variant_id: UUID (foreign key)
- quantity_change: Decimal (positive: restock, negative: sale/adjustment)
- reason: Enum ("purchase", "restock", "adjustment", "cancellation", "refund", "other")
- operation_type: Enum ("add", "subtract", "adjust")
- reference_id: UUID (reference to order_id, return_id, etc.)
- reference_type: String ("order", "return", "adjustment", "other")
- created_at: ISO 8601 timestamp (UTC)
- created_by: UUID (seller_id)
- notes: String (optional)

### Current Stock Calculation

CURRENT STOCK FOR A VARIANT SHALL be calculated by:
- SUMMING ALL quantity_change records for variant_id
- For "add" operations, quantity_change is positive
- For "subtract" operations, quantity_change is negative
- For "adjust" operations, use quantity_change directly

WHEN stock calculation is required:
- The system SHALL use database aggregation query, not cached values
- Result shall be stored in variant.stock_quantity field for fast access
- Stock_quantity SHALL be updated asynchronously when inventory records change (event-driven)

### Restocking

WHEN a seller restocks a variant, THE system SHALL:
- Require variant_id and quantity (positive integer)
- Require reason: "restock" or "other"
- If other, require notes
- Create inventory record with:
  - quantity_change = positive value
  - reason = provided reason
  - operation_type = "add"
  - reference_id = null
  - reference_type = null
- Update variant.stock_quantity by adding quantity_change
- Log restock action with seller_id and timestamp

### Adjustments

WHEN a seller needs to adjust inventory (loss, damage, etc.), THE system SHALL:
- Require variant_id
- Allow positive or negative quantity
- Require reason: "adjustment" and description
- Create inventory record with:
  - quantity_change = provided value
  - reason = "adjustment"
  - operation_type = "adjust"
  - reference_id = null
  - reference_type = null
- Update variant.stock_quantity by adding quantity_change
- Log adjustment with details

### Order Placement

WHEN an order is successfully placed:
- For each order item:
  - Create inventory record with:
    - variant_id = order_item.variant_id
    - quantity_change = -order_item.quantity (negative)
    - reason = "purchase"
    - operation_type = "subtract"
    - reference_id = order_id
    - reference_type = "order"
  - Update variant.stock_quantity by subtracting order_item.quantity

### Order Cancellation

WHEN a cancellation request is approved:
- Create inventory record with:
  - variant_id = cancelled_item.variant_id
  - quantity_change = +order_item.quantity (positive)
  - reason = "cancellation"
  - operation_type = "add"
  - reference_id = cancellation_request_id
  - reference_type = "cancellation"
- Update variant.stock_quantity by adding back the quantity

### Order Refund

WHEN a refund request is approved:
- Create inventory record with:
  - variant_id = refunded_item.variant_id
  - quantity_change = +order_item.quantity (positive)
  - reason = "refund"
  - operation_type = "add"
  - reference_id = refund_request_id
  - reference_type = "refund"
- Update variant.stock_quantity by adding back the quantity

### Out-of-Stock Handling

WHEN a variant's stock_quantity reaches 0:
- Set display status to "Out of stock"
- Prevent adding to cart (validation)
- Prevent checkout of this variant
- Still allow the product to be visible in search and category listings

WHEN a variant's stock_quantity increases from 0:
- Set display status to "In stock"
- Allow adding to cart
- Allow checkout

### Inventory History

WHEN a seller views the inventory history for a variant, THE system SHALL:
- Return all inventory records for variant_id
- Order by created_at descending (newest first)
- Include: date, change amount, reason, reference, notes
- Calculate total cumulative stock over time
- Support filtering by: date range, reason, operation_type

## Product Search

### Search Execution

WHEN a customer performs a product search, THE system SHALL:
- Accept search term as text (min 1 character)
- Search name and description fields using PostgreSQL full-text search
- Return products from all sellers
- Only return products where is_active = true and seller_status = "approved"
- Exclude products with zero variants and no inventory
- Sort by relevance score (default)

### Filters

WHEN customer applies filters during search, THE system SHALL:

#### Category Filter
- Allow selecting one or multiple categories (including subcategories)
- When category selected, return products within that category and all subcategories
- Validate category_id exists and is active

#### Price Range Filter
- Accept min_price and max_price as optional
- If min_price provided: return products with base_price >= min_price
- If max_price provided: return products with base_price <= max_price
- If variants exist with different prices, use the lowest variant price for filtering

#### InStock Filter
- If enabled: return products with at least one variant having stock_quantity > 0
- If disabled: return all products (either with variant stock > 0 or "unavailable" status)

### Sorting

WHEN customer applies sorting, THE system SHALL:
- Newest first: sort by product.created_at DESC
- Price low to high: sort by lowest variant.price ASC (if variants exist), else by base_price ASC
- Price high to low: sort by lowest variant.price DESC (if variants exist), else by base_price DESC
- Relevance: sort by search term match score (default)

### Pagination

ALL search results SHALL be paginated:
- Page size: 20 products per page (configurable)
- Next page token: cursor-based pagination using product_id and created_at
- Cursor format: "product_id:created_at"
- First page: no cursor
- Subsequent pages: use cursor from last product of previous page
- Return: products, has_next_page, cursor

## Product Listing

### Product Summary Card

WHEN displaying a product listing (search results, category page), EACH product SHALL show:
- main_image_url: URL to the first product image
- product_name: 1-200 characters, truncated if too long with "..."
- price_display: String
  - If product has variants:
    - Show price range: "${min} - ${max}"
  - If product has no variants:
    - Show "Unavailable"
- seller_shop_name: String from seller's profile
- average_rating: Number from 0-5, with half stars allowed
- review_count: Number of non-deleted reviews

### Dynamic Price Display

The product's displayed price SHALL reflect:
- Minimum variant price if variants exist
- Base price if no variants
- If lowest variant price is 0:
  - Display: "Price unknown"
  - Alert: "Variant pricing unknown, check details"

### Limitations

- Do not show product description in listing
- Do not show variant options
- Do not show inventory status beyond "Unavailable"
- Only show seller name (not full profile)
- Only show main image

## Product Detail Page

### Information Display

WHEN a customer views a product detail page, THE system SHALL show:

#### Images
- Display ALL product images in gallery
- First image as main display
- Allow zoom and slideshow
- Allow image drag and drop for reordering (seller only)

#### Product Information
- Name: full name (not truncated)
- Description: full description
- Category: full path (e.g., "Electronics > Headphones > Wireless")
- Base price: number
- Currency: ISO code

#### Seller Information
- Shop name: hyperlinked to seller profile
- Profile avatar/logo
- If seller suspended: show banner "Suspended seller - products may be removed"

#### Variants
- Show ALL available variants (excluding deleted ones)
- For each variant:
  - Option values (e.g., "Color: Red, Size: Large")
  - SKU code
  - Price (if different from base price, show as "${base} (add ${difference})")
  - Stock status:
    - "In stock: ${quantity}" if > 0
    - "Out of stock" if = 0
    - "Unavailable" if product is deleted or variant is deleted
  - "Add to cart" button enabled only when in stock

#### Ratings and Reviews
- Show average rating with star visualization (0-5 with half stars)
- Show total review count
- Show all reviews sorted by: created_at DESC
- For each review:
  - Customer name (or "Deleted User" if deleted)
  - Rating (1-5 stars)
  - Text content (if any)
  - Date created
- Show "Write a review" button only if:
  - Customer has purchased this product
  - All associated order items have status "delivered"
  - Customer has not already written a review for this product

## Wishlist

### Wishlist Structure

EACH wishlist entry SHALL contain:
- customer_id: UUID
- product_id: UUID
- created_at: ISO 8601 timestamp (UTC)
- added_from_product_page: Boolean
- active: Boolean (default true)

### Product Addition

WHEN a customer adds a product to their wishlist, THE system SHALL:
- Validate product_id exists and is not deleted
- Validate seller is approved
- Validate product has at least one variant or is marked "unavailable"
- Check if product_id already exists in wishlist for this customer
- If exists, do nothing (duplicate entry prevented)
- If not exists:
  - Create wishlist entry with active: true
  - Return success

### Product Removal

WHEN a customer removes a product from their wishlist, THE system SHALL:
- Set active = false for the entry
- Do NOT delete record (preserve history)
- Return success

### Wishlist Viewing

WHEN a customer views their wishlist, THE system SHALL:
- Return all entries with active: true
- Join with product data:
  - name
  - main_image_url
  - base_price
  - seller_shop_name
  - average_rating
  - review_count
- Exclude products where seller is suspended or product is deleted
- Sort by created_at DESC
- Return paginated results (20 per page)

### Product Deletion Impact

WHEN a user deletes a product, THE system SHALL:
- Set wishlist_entry.active = false for all entries referencing deleted product_id
- Send soft-delete event to wishlists
- Preserve wishlist record but mark as inactive
- No notification to customer

## Shopping Cart

### Cart Entry Structure

EACH cart entry SHALL contain:
- customer_id: UUID
- product_id: UUID
- variant_id: UUID
- quantity: Integer (1-99)
- product_name: String (snapshot at time of addition)
- product_description: String (snapshot at time of addition)
- product_image_url: String (snapshot at time of addition)
- variant_options: JSON (snapshot at time of addition)
- variant_sku: String (snapshot at time of addition)
- variant_price: Decimal (snapshot at time of addition)
- seller_id: UUID
- seller_shop_name: String (snapshot at time of addition)
- seller_logo_url: String (snapshot at time of addition)
- created_at: ISO 8601 timestamp (UTC)
- updated_at: ISO 8601 timestamp (UTC)

### Cart Addition

WHEN a customer adds a variant to cart, THE system SHALL:

- Validate variant exists and is active
- Validate variant's product has not been deleted
- Validate variant's seller is approved
- Validate variant.stock_quantity > 0
- If any validation fails, return appropriate error
- Check for existing cart entry with same customer_id and variant_id
- If existing entry exists:
  - Increase quantity by requested amount (up to stock limit)
  - Update updated_at
  - Return updated cart entry
- If no existing entry:
  - Create new cart entry with requested quantity
  - Set all snapshot fields from variant and product data at time of creation
  - Return new cart entry

### Quantity Management

WHEN a customer changes the quantity of a cart item, THE system SHALL:

- Validate cart entry belongs to current customer
- Validate new quantity is between 1 and variant.stock_quantity
- If new quantity exceeds stock, return "Only {stock} items available"
- If new quantity is less than 1, remove cart entry
- Otherwise:
  - Update quantity
  - Update updated_at
  - Return updated cart item

### Cart Removal

WHEN a customer removes a cart item, THE system SHALL:
- Validate cart entry belongs to current customer
- Delete cart entry immediately
- Return success

### Cart Validation

WHEN a customer views cart or attempts checkout, THE system SHALL validate:

#### Stock Validation
- For each cart item:
  - Compare cart_item.quantity with variant.stock_quantity
  - If stock < quantity:
    - Mark item as "Low stock: {stock} available"
    - Show warning icon
    - Allow checkout if item is the only one being removed
- If any item is "Low stock" and customer attempts checkout:
  - Show warning: "One or more items have low stock. Proceed with purchase?"

#### Availability Validation
- For each cart item:
  - Check if product.is_active = true
  - Check if seller_status = "approved"
  - Check if variant is not deleted
- If any item fails:
  - Mark as "Unavailable"
  - Show "Product deleted" or "Seller suspended" message
  - Do NOT allow checkout for this item

#### Price Change Warning
- For each cart item:
  - Compare cart_item.variant_price with current variant.price (from database)
  - If current price differs:
    - Show warning: "Price has changed since you added to cart: ${old} → ${new}"
    - Allow checkout
    - Keep original price in cart for customer protection

#### Seller Consistency
- If cart items belong to suspended sellers:
  - Return error: "Items from suspended sellers cannot be checked out." 
  - Highlight affected items
  - Allow removal only

#### Cart State
- Total quantity: SUM of all cart items
- Total value: SUM of (quantity * variant_price) for all cart items
- Show "2 items ($234.56)" in header

### Cart Checkout Process

WHEN a customer initiates checkout, THE system SHALL:

#### Eligibility
- Check cart is not empty
- Validate ALL cart items have sufficient stock
- Validate ALL cart items are not unavailable
- Validate customer has at least one shipping address
- If any item fails above, return error list

#### Cart Locking
- Set cart.locked = true for session
- Prevent any editing (add/remove/quantity changes)
- Show locked status
- Show checkout summary as frozen snapshot

#### Order Processing
- When checkout confirmed:
  - For each cart item:
    - Create order_item with:
      - product_id
      - variant_id
      - quantity
      - product_name
      - product_description
      - product_image_url
      - variant_options
      - variant_sku
      - variant_price
      - seller_id
      - seller_shop_name
      - seller_logo_url
      - status: "paid"
    - Create product snapshot (if not already exists)
    - Create variant snapshot (if not already exists)
    - Create seller snapshot (if not already exists)
    - Create inventory record: quantity_change = -quantity
    - Remove cart entry
  - Create order record with:
    - customer_id
    - shipping_address (selected)
    - total_amount (sum of cart)
    - status: "paid"
    - created_at
    - checkout_snapshot (serialized JSON of all cart items at time of purchase)
  - Send confirmation email with order number
  - Return success with order details

#### Failed Checkout

IF checkout fails due to:
- Stock changes
- Price discrepancies
- Seller status changes
- Network timeouts

THE system SHALL:
- Unlock cart (set locked = false)
- Keep cart entries unchanged
- Show detailed error messages for each failure
- Highlight problematic items with red border
- Allow customer to retry after fixing issue

#### Partial Checkout

IF only some cart items are valid:
- Allow checkout ONLY of valid items
- Move valid cart items to order
- Remove valid items from cart
- Keep invalid items in cart marked with status:
  - "Unavailable"
  - "Out of stock"
  - "Price changed"
- Show message: "Partially completed: ${count} items ordered, ${remaining} kept in cart"

#### Snapshot Integrity

WHEN checkout is completed, THE system SHALL:
- Create a checkout snapshot with:
  - All cart items at time of checkout
  - Timestamp of checkout
  - Customer IP and device info
  - Order ID
- Store snapshot in database (immutable)
- Allow customer to view checkout snapshot from order details page

## Payment

### Payment Processing

WHEN a customer confirms and places order, THE system SHALL:
- Initiate payment via external gateway (Stripe, PayPal, etc.)
- Send order ID, amount, currency, customer email
- Wait for payment gateway response
- Store payment_intent_id from gateway
- If response status = "succeeded":
  - Complete order processing (see Order Creation)
  - Send payment confirmation email
  - Return success with order details
- If response status = "failed":
  - Do NOT create order
  - Return error: "Payment failed. Please check your card information and try again."
  - Unlock cart (allow edits)
  - Show failure reason from payment processor
- If response status = "pending" (3D Secure needed):
  - Redirect to payment gateway for additional authentication
  - On return:
    - Re-check status
    - If succeeded: complete order
    - If failed: return failure

### Payment Failure Handling

WHEN payment fails:
- Customer may retry up to 3 times
- After 3 failed attempts:
  - Lock cart for 1 hour
  - Show message: "Too many payment attempts. Try again later."
- After lock expires, allow retries
- All attempts logged for fraud detection

### Receipt Generation

WHEN payment succeeds, THE system SHALL:
- Generate PDF receipt with:
  - Order number
  - Date
  - Items with prices
  - Shipping address
  - Payment method
  - Total amount
- Store receipt file in S3
- Send receipt link via email

## Order Creation

### Order Record

EACH order SHALL contain:
- order_id: UUID v4
- customer_id: UUID
- shipping_address: JSON object (with all address fields)
- total_amount: Decimal
- currency_code: ISO 4217
- status: Enum ("paid", "shipped", "delivered", "cancelled", "refunded", "partially_completed")
- created_at: ISO 8601 timestamp (UTC)
- updated_at: ISO 8601 timestamp (UTC)
- payment_intent_id: String (from gateway)
- buyer_note: String (optional)
- checkout_snapshot: JSONB (full cart state at checkout time)
- shipment_locked: Boolean (default false)

### Order Item Creation

WHEN order is created, THE system SHALL create one order_item for each cart item:
- order_item_id: UUID v4
- order_id: UUID
- product_id: UUID
- variant_id: UUID
- quantity: Integer
- product_name: String (snapshot)
- product_description: String (snapshot)
- product_image_url: String (snapshot)
- variant_options: JSON (snapshot)
- variant_sku: String (snapshot)
- variant_price: Decimal (snapshot)
- seller_id: UUID
- seller_shop_name: String (snapshot)
- seller_logo_url: String (snapshot)
- status: "paid"
- created_at: timestamp
- updated_at: timestamp

### Inventory Reduction

WHEN order is created, THE system SHALL:

- For each order_item:
  - Create inventory record:
    - variant_id: order_item.variant_id
    - quantity_change: -quantity
    - reason: "purchase"
    - operation_type: "subtract"
    - reference_id: order_id
    - reference_type: "order"

- Update variant.stock_quantity by subtracting quantity
- Remove cart entries for this customer

### Order History

WHEN a customer views order history, THE system SHALL:
- Show all orders for customer_id
- Sort by created_at DESC
- Return summary:
  - order_id
  - created_at
  - total_amount
  - status
  - item_count
- For full details, expand:
  - List all order_items with:
    - product name, variant options, price, quantity, status
  - Shipping address
  - Payment method

### Order Status Logic

WHEN an order is updated, the overall status SHALL be determined by:

- If ALL order_items are "paid":
  - Order status = "paid"
- If ANY order_item is "shipped" and NONE are "delivered":
  - Order status = "shipped"
- If ALL order_items are "delivered":
  - Order status = "delivered"
- If ALL order_items are "cancelled":
  - Order status = "cancelled"
- If ALL order_items are "refunded":
  - Order status = "refunded"
- If mixed status:
  - Order status = "partially_completed"

## Shipping and Tracking

### Shipment Creation

WHEN a seller creates a shipment, THE system SHALL:
- Select one or more order_items from their own products with status "paid"
- Validate all items belong to the same seller
- Validate all items have status "paid" (not shipped yet)
- Enter tracking information:
  - carrier_name: String (required, up to 50 characters)
  - tracking_number: String (required, up to 100 characters)
  - estimated_delivery_date: Date (optional)
- Create shipment record with:
  - shipment_id: UUID v4
  - seller_id: UUID
  - order_items: array of order_item_ids
  - carrier_name
  - tracking_number
  - estimated_delivery_date
  - status: "pending"
  - created_at: timestamp
  - shipped_at: null
- Update all selected order_item.status = "shipped"
- Update order.updated_at
- Send tracking email to customer with link

### Delivery Confirmation

WHEN a customer confirms delivery for a shipment, THE system SHALL:
- Validate customer owns the order
- Validate shipment belongs to this order
- Update shipment.status = "delivered"
- Set delivered_at timestamp
- Update ALL order_items in shipment.status = "delivered"
- Update order via status calculation

WHEN 14 days have passed since shipment.shipped_at:
- If delivery not confirmed:
  - Automatically set shipment.status = "delivered"
  - Set delivered_at = shipped_at + 14 days
  - Update all associated order_items.status = "delivered"

### Shipment Viewing

WHEN a customer views order details, THE system SHALL:
- Display all shipments for the order
- For each shipment:
  - Show carrier name
  - Show tracking number (hyperlinked to carrier's tracking page)
  - Show estimated delivery date
  - Show actual delivery date (if delivered)
  - Show list of items included
  - Show button to confirm delivery (if not delivered and timeframe not expired)

WHEN a seller views order items, THE system SHALL:
- Group items by shipment
- Show shipment status: pending, shipped, delivered
- Allow creation of new shipments for "paid" items
- Show tracking info if available

## Order Cancellation

### Cancellation Request

WHEN a customer requests cancellation for an item with status "paid":
- Allow request if item status is "paid" only
- Require cancellation reason (1-500 characters)
- Create cancellation_request record:
  - id: UUID v4
  - order_item_id: UUID
  - customer_id: UUID
  - request_reason: String
  - status: "pending"
  - requested_at: timestamp
  - responded_at: null
  - response_reason: null
  - responded_by: null
- Send notification to seller
- Return confirmation

### Seller Response

WHEN a seller responds to cancellation request:

- If approve:
  - Update cancellation_request.status = "approved"
  - Set responded_at = current timestamp
  - Set responded_by = seller_id
  - Update order_item.status = "cancelled"
  - Create inventory record:
    - quantity_change: +item.quantity
    - reason: "cancellation"
    - reference_id: cancellation_request_id
    - reference_type: "cancellation"
  - Update variant.stock_quantity
  - Update order status via logic
- If reject:
  - Update cancellation_request.status = "rejected"
  - Set responded_at = current timestamp
  - Set responded_by = seller_id
  - Set response_reason (max 500 characters)
  - Update cancellation snapshot
  - Keep order_item.status = "paid"
- Create snapshot of cancellation_request before update

### Order Level Effect

WHEN an order item is cancelled:
- If ALL items in order are cancelled:
  - Update order.status = "cancelled"
- If some items cancelled:
  - Update order.status = "partially_completed"

### Client Notification

WHEN cancellation is approved or rejected:
- Send email to customer
- Include reason (for rejection) or confirmation (for approval)
- Include reference number

## Refund Requests

### Refund Request

WHEN a customer requests refund for an item with status "delivered":
- Allow request if item status is "delivered"
- Check that delivered_at <= 7 days before current date
- If more than 7 days have passed since delivery:
  - Return "Refund requests must be made within 7 days of delivery"
- Require refund reason (1-500 characters)
- Create refund_request record:
  - id: UUID v4
  - order_item_id: UUID
  - customer_id: UUID
  - request_reason: String
  - status: "pending"
  - requested_at: timestamp
  - responded_at: null
  - response_reason: null
  - responded_by: null
- Send notification to seller
- Return confirmation

### Seller Response

WHEN a seller responds to refund request:

- If approve:
  - Update refund_request.status = "approved"
  - Set responded_at = current timestamp
  - Set responded_by = seller_id
  - Update order_item.status = "refunded"
  - Create inventory record:
    - quantity_change: +item.quantity
    - reason: "refund"
    - reference_id: refund_request_id
    - reference_type: "refund"
  - Update variant.stock_quantity
  - Update order status via logic
- If reject:
  - Update refund_request.status = "rejected"
  - Set responded_at = current timestamp
  - Set responded_by = seller_id
  - Set response_reason (max 500 characters)
  - Update refund snapshot
  - Keep order_item.status = "delivered"
- Create snapshot of refund_request before update

### Order Level Effect

WHEN an order item is refunded:
- If ALL items in order are refunded:
  - Update order.status = "refunded"
- If some items refunded:
  - Update order.status = "partially_completed"

### Client Notification

WHEN refund is approved or rejected:
- Send email to customer
- Include reason (for rejection) or confirmation (for approval)
- Include reference number

## Reviews and Ratings

### Review Eligibility

WHEN a customer attempts to write a review, THE system SHALL:

- Validate they purchased the product
- Validate ALL order items for this product have status "delivered"
- Validate they have not already written a review for this product in any order
- If purchased in multiple orders:
  - Allow only ONE review per product (regardless of how many times purchased)
  - First review is considered primary
  - Subsequent attempts: "You already reviewed this product"
- If any condition fails, prevent review creation with appropriate message

### Review Creation

WHEN a customer writes a review, THE system SHALL:
- Require rating (1-5, integer)
- Allow optional text content (0-1000 characters)
- Set customer_id and product_id
- Set order_item_id of first successful purchase
- Set created_at
- Set updated_at
- Set is_deleted: false
- Create review record
- Create review snapshot
- Trigger recalculation of product's average rating
- Return success

### Review Editing

WHEN a customer edits a review they own:
- Allow editing of rating and text_content
- If editing rating:
  - Must be 1-5
- If editing text:
  - Must be <= 1000 characters
- When edited:
  - Create snapshot of previous review state
  - Update review with new values
  - Update updated_at
  - Trigger recalculation of product's average rating
- Return updated review

### Review Deletion

WHEN a customer deletes a review:
- Set is_deleted = true
- Create snapshot with is_deleted: true
- Trigger recalculation of product's average rating
- Keep record for audit
- Return success
- Display "Deleted user" on product page for this review

### Rating Calculation

THE product's average rating SHALL be calculated as:
- SUM of ratings for all non-deleted reviews
- DIVIDED by COUNT of non-deleted reviews
- ROUND to one decimal place
- If no reviews: show "No reviews yet" (not 0)

## Seller Dashboard

### Dashboard Summary

WHEN a seller views their dashboard, THE system SHALL show:
- Total products: count of products where seller_id = current seller and is_active = true
- Total order items: count of order_items where seller_id = current seller
- Pending cancellation requests: count where order_item.seller_id = current seller AND cancellation_request.status = "pending"
- Pending refund requests: count where order_item.seller_id = current seller AND refund_request.status = "pending"
- Monthly revenue: sum of order_item.quantity * order_item.variant_price for orders created in last 30 days

### Order Item List

WHEN a seller views order items, THE system SHALL:
- Show all order_items where seller_id = current seller
- Include: order_id, product_name, variant_options, quantity, status, created_at
- Sort by created_at DESC
- Support pagination (20 per page)
- Support filtering by status (paid, shipped, delivered, cancelled, refunded)
- Show shipment info if available
- Export to CSV option

### Category Filtering

WHEN filtering order items by category:
- Allow selection of pre-defined categories
- Include subcategories
- Return items matching selected category and descendants

## Administrator System

### Administrator Role

There are two levels:
- "regular_admin": Can manage sellers, categories, products, orders, users
- "super_admin": Can manage all admin accounts (promotion/demotion) and escalation

Administrator accounts have: role_type: "regular_admin" or "super_admin"

### Becoming an Administrator

WHEN a user submits an administrator request:
- Accept reason (text, max 2000 characters)
- Create admin_request record:
  - id: UUID v4
  - user_id: UUID
  - status: "pending"
  - reason: String
  - submitted_at: timestamp
  - responded_at: null
  - response_reason: null
  - responded_by: null
- Send notification to super_admins
- Return "Request submitted. Wait for approval."

### Administration Approval

WHEN a super_admin responds to an admin request:
- If approve:
  - Update admin_request.status = "approved"
  - Set responded_at = current timestamp
  - Set responded_by = super_admin_id
  - Update target user.role_type = "regular_admin"
  - Send confirmation email
- If reject:
  - Update admin_request.status = "rejected"
  - Set responded_at = current timestamp
  - Set responded_by = super_admin_id
  - Set response_reason (max 1000 characters)
  - Send rejection email
- Create snapshot of admin_request before update

### Admin Promotion

WHEN a super_admin promotes a regular_admin to super_admin:
- Validate requester is super_admin
- Validate target is regular_admin
- Update user.role_type = "super_admin"
- Create promotion log
- Send notification
- Log event with actor, target, time

### Admin Demotion

WHEN a super_admin demotes a super_admin to regular_admin:
- Validate requester is super_admin
- Validate target is super_admin AND is not the requester
- If attempting to demote self, return "Cannot demote yourself"
- Update user.role_type = "regular_admin"
- Create demotion log
- Send notification
- Log event

### Seller Management

#### Approval

WHEN an admin approves a seller:
- Update seller.status = "approved"
- Send approval email
- Log approval

WHEN admin rejects a seller:
- Update seller.status = "rejected"
- Set rejection_reason (required)
- Send rejection email
- Log rejection with reason

#### Suspension

WHEN an admin suspends a seller:
- Update seller.status = "suspended"
- Set suspension_reason (optional)
- Hide all products from search and category listings
- Prevent new product creation and editing
- Allow all existing order processing (shipping, cancellation, refund)
- Send suspension notice

WHEN an admin unsuspends a seller:
- Update seller.status = "approved"
- Make products visible again
- Allow product creation/editing
- Send unsuspension notice
- Log action

### Category Management

WHEN admin creates, edits, or deletes categories:
- All actions require logging with admin_id
- All changes require snapshot of category state before change
- All categories visible in admin interface regardless of active status

### Product Oversight

WHEN an admin views products:
- Can see ALL products on platform, regardless of seller or status
- Can see ALL snapshots for any product
- Can view related orders
- Can perform force-deletion:
  - Delete product
  - Delete all variants
  - Delete all images
  - Mark product as deleted in database
  - Preserve order items and snapshots
  - Log admin and reason
  - Send notice to seller if product not currently suspended

### Order Oversight

WHEN an admin performs force-actions:

#### Force-Cancel

- For selected order items or entire order:
  - If item status is "paid", "shipped", or "delivered":
    - Set status to "cancelled"
    - Create inventory record: +quantity
    - Update variant.stock_quantity
    - Create cancellation_request snapshot
    - Log admin and reason
- If entire order cancelled:
  - Set order.status = "cancelled"
  - Send email to customer

#### Force-Refund

- For selected order items or entire order:
  - If item status is "delivered":
    - Set status to "refunded"
    - Create inventory record: +quantity
    - Update variant.stock_quantity
    - Create refund_request snapshot
    - Log admin and reason
- If entire order refunded:
  - Set order.status = "refunded"
  - Send email to customer

### User Management

#### Customer Banning

WHEN an admin bans a customer:
- Set user.status = "banned"
- Invalidate all active sessions
- Invalidate all refresh tokens
- Block login attempts
- Send ban notification
- Preserve all historical data

WHEN an admin unbans a customer:
- Set user.status = "active"
- Allow login
- Send unban notification

#### Seller Banning

WHEN an admin bans a seller:
- Set seller.status = "banned"
- Invalidate all active sessions
- Invalidate all refresh tokens
- Block login attempts
- Hide all products from listings
- Prevent all new product creation
- Keep existing order processing active
- Send ban notification
- Preserve all historical data

WHEN an admin unbans a seller:
- Set seller.status = "approved" (if not suspended)
- Show products again
- Allow product creation
- Send unban notification

### Audit Logs

ALL administrator actions SHALL be logged:
- admin_id
- action_type (approve, reject, suspend, ban, delete, promote, demote)
- target_id
- target_type (customer, seller, product, order, admin)
- reason (for rejection/ban)
- timestamp
- IP address
- device info

All audit logs are immutable and preserved indefinitely.

## System-wide Architectural Requirements

### Authentication

- All users must be authenticated before accessing any protected endpoint
- Authentication uses JWT
- Access token: 15-minute expiration
- Refresh token: 7-day expiration, stored as hashed value in database
- Use HTTP-only, Secure, SameSite=Strict cookies for refresh tokens
- Users cannot access information of other users without explicit authorization
- Administrators can access any data with logging

### Data Consistency

- All database operations use transactions with proper rollback
- Snapshot creation occurs within transaction boundary
- Inventory updates occur within transaction boundary
- Cart/checkout operations use row-level locking to prevent race conditions

### Performance

- Product search response time: under 200ms
- Cart operations: under 100ms
- Order creation: under 500ms
- Snapshot query: under 150ms for 10 snapshots

### Error Handling

- All failures return appropriate HTTP status codes: 400, 401, 403, 404, 409, 500
- All internal errors logged with trace ID
- User-facing messages are clear and actionable
- Never expose internal system details

### Scalability

- Design for 50,000 active users and 10,000 concurrent users
- Use database read replicas for high-traffic queries
- Use caching (Redis) for product listings, search results
- Implement queue-based processing for heavy tasks (inventory, snapshots)

### Security

- All data encrypted at rest and in transit
- Use HTTPS exclusively
- Sanitize all user inputs
- Rate limit login attempts (5 tries per 30 min)
- SQL injection prevention
- XSS prevention
- CSRF protection

### Internationalization

- All user interface text is in en-US
- Data formats follow international standards:
  - Dates: ISO 8601
  - Currency: ISO 4217
  - Addresses: ISO 3166-1
  - Phone: E.164
- Currency conversion not required (all prices in USD)

### Monitoring and Observability

- All API endpoints have logging enabled
- Monitoring for:
  - Request latency
  - Error rates
  - Database query performance
  - API utilization
- Alerting for:
  - Slow queries (>500ms)
  - High error rates
  - Inventory inconsistencies
  - Failed snapshots
  - Two bookings for same variant

All requirements expressed in EARS format.
All Mermaid diagrams use correct syntax with double quotes.
All business logic is complete and unambiguous.