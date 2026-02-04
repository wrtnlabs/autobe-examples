# E-Commerce Shopping Mall Platform

## Business Model Overview

The shoppingMall platform is a multi-seller e-commerce marketplace designed to empower independent businesses to establish their online storefronts within a unified, trustworthy platform. Unlike traditional e-commerce models where a single entity controls inventory and pricing, shoppingMall enables independent sellers to maintain full autonomy over their products, pricing, branding, and customer relationships — all within a secure, transaction-verified ecosystem built on immutable data records.

This platform solves a critical market gap: the friction between small businesses seeking digital presence and the complex, high-friction platforms that demand centralized control over product listings, customer interactions, and transactional integrity. By implementing the Snapshot Principle as a foundational architectural requirement, shoppingMall uniquely addresses the trust deficit in digital commerce — ensuring that every price change, product revision, or order confirmation is permanently preserved as auditable evidence.

The vision is to become the preferred digital marketplace for independent retailers, artisans, and small manufacturers who prioritize brand integrity, transactional transparency, and customer trust over aggressive platform-driven growth metrics.

## Core Value Proposition

shoppingMall offers a radical alternative built on three foundational pillars:

### 1. Unbreakable Trust Through the Snapshot Principle

Every editable business data element is permanently captured as an immutable snapshot upon modification. This includes:

- **Product changes**: When a seller updates a product’s description, price, or image, a complete snapshot of the previous state is created and preserved. This ensures that when a customer receives an item, they can verify they received exactly what was advertised at the moment of purchase.
- **Variant pricing**: Each SKU variant’s price and inventory level at the time of sale is captured, preventing post-purchase disputes about pricing changes.
- **Seller profiles**: Shop name, logo, and description changes are tracked, ensuring buyers always have a clear record of which seller they transacted with.
- **Reviews and ratings**: Every edit or deletion of a review is recorded with its historical state, maintaining the integrity of the public rating system.
- **Order items**: Every product and variant in an order is captured as a snapshot at purchase time — preserving exact product name, description, base price, variant configuration, and seller profile.

These snapshots are not merely backups — they are auditable legal records that serve as definitive evidence in disputes. Buyers know exactly what they purchased, sellers have protected proof of product state, and administrators can resolve conflicts with complete transparency.

### 2. Dual-Actor Autonomy: Customers and Sellers as Equitable Partners

Unlike platforms that treat sellers as inventory suppliers and customers as data points, shoppingMall treats both parties as independent actors with defined rights:

- **Customers** have full control over their profile, addresses, wishlist, and cart.
- **Sellers** control their products, pricing, shop branding, inventory, and response to cancellation/refund requests.
- **Neither side is subject to unilateral platform decisions** on pricing, product removal, or dispute outcomes.

This autonomy is reinforced by:
- Seller approval requiring administrator consent (not platform algorithm)
- Order cancellation/refund requiring seller discretion
- Reviews only permitted after delivery confirmation

The platform acts as a secure facilitator — not an arbiter of business relationships.

### 3. Transparent, Auditable Transaction Lifecycle

All business transactions follow a fully traceable path:

1. **Product Creation** → Snapshot captured
2. **Product Edit** → Snapshot captured (previous state preserved)
3. **Customer Adds to Cart** → Snapshot of variant and price used
4. **Checkout** → Snapshot of shipping address and total at time of purchase
5. **Payment Confirmation** → Order created with all snapshots attached
6. **Shipping** → Shipment created with tracking ID
7. **Delivery Confirmation** → Status updated
8. **Review Submission** → Snapshot of the review state recorded
9. **Refund/Cancellation Request** → Snapshot of request state preserved

Every step in this lifecycle creates an audit trail. The order history doesn’t just show “You bought a red shirt for $49.99” — it shows: 
> “On January 14, 2026 at 14:23:12, you purchased a product named \"Modern Canvas Shirt\" with variant \"Color: Red, Size: L\" at price \$49.99 from seller \"Artsy Threads\". This snapshot was created when the product was last edited on January 5, 2026. The description at time of purchase included: \"Handwoven cotton with organic dyes.\"”

This level of verifiable detail transforms transactional interactions from ambiguous agreements into legally defensible contracts.

## User Actors

### Customer

A customer is a registered end-user who browses products, places orders, manages their profile and addresses, manages their wishlist, and leaves reviews.

#### Permissions and Capabilities

- THE customer SHALL register using email and password
- THE customer SHALL authenticate via email and password to access their account
- THE customer SHALL edit their display name and phone number
- THE customer SHALL add, edit, and delete multiple shipping addresses
- THE customer SHALL designate one address as default
- THE customer SHALL add products to their wishlist
- THE customer SHALL remove products from their wishlist
- THE customer SHALL add product variants to their shopping cart
- THE customer SHALL modify quantities of items in cart
- THE customer SHALL remove items from cart
- THE customer SHALL proceed to checkout
- THE customer SHALL select shipping address for order
- THE customer SHALL view order history
- THE customer SHALL request cancellation for "paid" order items
- THE customer SHALL request refund for "delivered" order items
- THE customer SHALL write, edit, and delete reviews for delivered products
- THE customer SHALL view seller product details and reviews
- THE customer SHALL search, filter, and sort products
- THE customer SHALL view their cart total and summary before checkout

#### Restrictions

- THE customer SHALL NOT access seller dashboards
- THE customer SHALL NOT create or edit products
- THE customer SHALL NOT modify seller profiles
- THE customer SHALL NOT approve or reject cancellation/refund requests
- THE customer SHALL NOT manage inventory levels
- THE customer SHALL NOT suspend or ban sellers
- THE customer SHALL NOT create categories
- THE customer SHALL NOT view administrative functions
- THE customer SHALL NOT access other customers' accounts

### Seller

A seller is a registered business entity that creates, manages, and sells products on the platform. Sellers operate independently but under platform governance.

#### Permissions and Capabilities

- THE seller SHALL register using email and password
- THE seller SHALL authenticate via email and password to access the seller dashboard
- THE seller SHALL edit shop name, description, and logo
- THE seller SHALL manage product listings (create, edit, delete)
- THE seller SHALL manage inventory for product variants
- THE seller SHALL respond to cancellation and refund requests
- THE seller SHALL view order items assigned to their products
- THE seller SHALL view seller profile snapshots
- THE seller SHALL view approval status and rejection reasons

#### Restrictions

- THE seller SHALL NOT sell products without administrator approval
- THE seller SHALL NOT delete account if pending order items exist
- THE seller SHALL NOT edit product listings if suspended
- THE seller SHALL NOT bypass the approval workflow
- THE seller SHALL NOT access customer accounts or financial records
- THE seller SHALL NOT suspend other sellers
- THE seller SHALL NOT create or edit categories

### Administrator

Administrators manage seller onboarding and platform compliance.

#### Permissions and Capabilities

- THE administrator SHALL review pending seller registrations
- THE administrator SHALL approve or reject seller applications
- THE administrator SHALL suspend seller accounts
- THE administrator SHALL unsuspend seller accounts
- THE administrator SHALL view all seller profiles and histories
- THE administrator SHALL view rejection reasons provided by other administrators
- THE administrator SHALL create and edit product categories
- THE administrator SHALL delete product categories
- THE administrator SHALL view all products on the platform
- THE administrator SHALL view snapshots of any product
- THE administrator SHALL delete any product (for policy violations)
- THE administrator SHALL view all orders on the platform
- THE administrator SHALL force-cancel individual items or entire orders
- THE administrator SHALL force-refund individual items or entire orders
- THE administrator SHALL view all customer accounts
- THE administrator SHALL ban customers (preventing login)
- THE administrator SHALL unban customers
- THE administrator SHALL view all seller accounts
- THE administrator SHALL ban sellers (preventing login)
- THE administrator SHALL unban sellers
- THE administrator SHALL submit a request to become a super administrator

#### Restrictions

- THE administrator SHALL NOT approve sellers with fraudulent documentation
- THE administrator SHALL NOT delete seller accounts directly
- THE administrator SHALL NOT modify seller login credentials
- THE administrator SHALL NOT bypass the snapshot system
- THE administrator SHALL NOT edit customer profile information
- THE administrator SHALL NOT change customer order history

### Super Administrator

Super administrators have elevated privileges for platform governance and administrator management.

#### Permissions and Capabilities

- ALL permissions of a regular administrator
- THE super administrator SHALL promote regular administrators to super administrator
- THE super administrator SHALL demote super administrators to regular administrator
- THE super administrator SHALL view and approve administrator promotion requests
- THE super administrator SHALL view all audit logs
- THE super administrator SHALL manage platform-wide settings

#### Restrictions

- THE super administrator SHALL NOT demote themselves
- THE super administrator SHALL NOT delete administrator accounts
- THE super administrator SHALL NOT bypass the snapshot system
- THE super administrator SHALL NOT directly modify data in databases

## Customer Account Management

### Account Registration

WHEN a user initiates registration, THE system SHALL collect and store the following mandatory information:
- Email address (unique, validated format)
- Password (minimum 8 characters, stored securely with bcrypt hashing)
- Registration timestamp (ISO 8601 format)
- Account activation status (default: active)

IF the provided email address already exists in the system, THEN THE system SHALL reject the registration request with a specific error message indicating the email is already registered.

WHEN registration is successful, THE system SHALL create a customer account record with a unique internal customer ID and send a welcome confirmation email.

### Authentication Flow

WHEN a customer attempts to log in, THE system SHALL validate the following:
- Email address exists in the system
- Provided password matches the stored hash
- Account is not suspended or banned

IF authentication fails due to invalid credentials, THEN THE system SHALL return a generic "Invalid email or password" error message and increment a failed login counter.

IF an account exceeds 5 consecutive failed login attempts within 15 minutes, THEN THE system SHALL temporarily lock the account for 30 minutes and notify the customer via email.

WHEN authentication succeeds, THE system SHALL issue a JSON Web Token (JWT) with the following payload structure:
- customerId: unique identifier (string)
- role: "customer"
- iat: issued at timestamp (number)
- exp: expiration timestamp (number)
- email: the customer's email address

THE system SHALL enforce access token expiration of 15 minutes and refresh token expiration of 7 days for persistent sessions.

### Password Management

WHEN a customer requests to change their password, THE system SHALL:
- Validate the current password using the existing hash
- Require the new password to be at least 8 characters long
- Ensure the new password differs from the old password
- Re-hash the new password with bcrypt before storage
- Record the password change timestamp
- Immediately invalidate all existing JWT sessions

WHEN a customer forgets their password, THE system SHALL:
- Accept a password reset request with the customer's email address
- Generate a unique, cryptographically secure reset token with 1-hour expiration
- Send an email containing a password reset link with the token
- Allow password reset only through the verified link
- Delete the reset token after successful password change
- Invalidate all existing sessions after password change

### Account Deletion

WHEN a customer requests account deletion, THE system SHALL:
- Verify the account belongs to the authenticated user
- Require explicit confirmation from the customer
- Begin an irreversible deletion process with a 7-day grace period

DURING the grace period, THE system SHALL:
- Display a warning banner on the customer's dashboard
- Prevent any actions that modify account data
- Allow the customer to cancel the deletion request

AFTER the 7-day grace period expires, THE system SHALL permanently delete the following:
- Customer profile data (display name, phone number)
- Customer authentication credentials (email, password hash)
- Wishlist entries
- Cart contents
- Review submission privileges

The following data SHALL be preserved permanently even after account deletion:
- Order history and order items
- Order snapshots (product, variant, seller profile)
- Customer's reviews (but displayed as "Deleted User")
- Customer's address history (for legal and fulfillment records)

IF a customer attempts to re-register with a previously deleted email address, THEN THE system SHALL treat it as a completely new account and allow registration.

## Customer Profile Management

THE customer profile SHALL contain the following editable fields:
- Display name (up to 100 characters, alphanumeric plus spaces, special characters allowed)
- Phone number (international format: +[country code][number], max 15 digits)

WHEN a customer updates their display name or phone number, THE system SHALL:
- Validate the new values according to length and format constraints
- Store the updated values in the customer profile
- Record the change timestamp
- Do not generate snapshots for profile changes (non-critical business data)
- Update display name in all relevant context (cart, wishlist, reviews)

IF a customer provides an invalid phone number format, THEN THE system SHALL reject the update with a specific error message indicating the correct format.

## Address Management

THE system SHALL allow each customer to maintain multiple shipping addresses with the following fields:
- Recipient name (required, 1-100 characters)
- Phone number (required, international format)
- Street address (required, 1-255 characters)
- City (required, 1-100 characters)
- State/Province (required, 1-100 characters)
- Postal code (required, format varies by country)
- Country (required, ISO 3166-1 Alpha-2 code)
- Default indicator (boolean, exactly one address per customer can be default)

WHEN a customer adds a new address, THE system SHALL:
- Validate all required fields are provided
- Ensure all field lengths are within limits
- Store the address with a unique identifier and creation timestamp
- Do not automatically set it as default

WHEN a customer updates an existing address, THE system SHALL:
- Validate the new values
- Record the change timestamp
- Preserve the original address in its state at time of modification

WHEN a customer deletes an address, THE system SHALL:
- Verify the address belongs to the authenticated customer
- Permit deletion only if the address is not the default address
- IF the deleted address was the default, THEN THE system SHALL automatically set the most recently added address as default

WHEN a customer sets an address as default, THE system SHALL:
- Unset the previously designated default address for that customer
- Mark the selected address as default
- Record the change timestamp

IF a customer attempts to set an address as default that does not belong to them, THEN THE system SHALL reject the request with an access denial error.

WHEN a customer checks out, THE system SHALL:
- Default to the customer's designated default shipping address
- Allow selection of any other valid address from their address book
- Lock the selected shipping address at the time of order placement (no changes permitted after order submission)

## Wishlist Functionality

THE system SHALL allow each customer to maintain a wishlist containing products they wish to purchase.

WHEN a customer adds a product to their wishlist, THE system SHALL:
- Verify the product exists and is active/sellable
- Associate the product ID with the customer's wishlist
- Store the addition timestamp
- Do not save variant specificity (wishlist operates at the product level)

WHEN a customer removes a product from their wishlist, THE system SHALL:
- Verify the product is in their wishlist
- Remove the product association
- Record the removal timestamp

WHEN a product is deleted by its seller, THE system SHALL automatically remove that product from ALL customers' wishlists.

WHEN a product becomes unavailable (out of stock, hidden, or unlisted), THE system SHALL still retain it in the customer's wishlist but mark it as "Unavailable" during wishlist display.

WHEN a customer views their wishlist, THE system SHALL:
- Return all products in the wishlist in reverse chronological order (newest first)
- Display each item with product name, thumbnail image, base price, and seller name
- Indicate "Unavailable" status if the product is no longer sellable
- Paginate results with 20 items per page

THE system SHALL enforce a wishlist limit of 500 products per customer.

IF a customer attempts to add a product to their wishlist that already exists in their wishlist, THEN THE system SHALL treat it as a no-op and not create a duplicate entry.

## Seller Account Management

### Seller Registration

WHEN a new seller registers, THE system SHALL collect:

- Email address (required, validated format)
- Password (required, minimum 12 characters, must contain uppercase, lowercase, digit, special character)
- Business name (required)
- Business registration document (optional upload)
- Contact phone number (optional)

WHEN the registration form is submitted, THE system SHALL:

- Validate all required fields
- Verify email format
- Check if email is already registered (customer or seller)
- Encrypt password using bcrypt
- Generate unique seller ID
- Send confirmation email to provided email address
- Set initial status to "pending_verification"

WHILE the account is "pending_verification", THE system SHALL:

- Block login attempts
- Block access to seller dashboard
- Hide shop from product listings
- Prevent product creation or editing

WHEN the email verification link is clicked, THE system SHALL:

- Set account status to "pending_approval"
- Send notification to all administrators of new pending application
- Log registration timestamp and IP address

WHEN a user attempts to register with an email already registered as a customer, THE system SHALL NOT create a duplicate account and SHALL return error message: "This email is already associated with an existing account. Please log in or contact support."

### Approval Workflow

WHEN a seller’s status is "pending_approval", THE system SHALL display to administrators: "New seller application [Business Name]" in admin dashboard with "Review" button.

WHEN an administrator clicks "Review", THE system SHALL display:

- Business name
- Registered email
- Contact phone number
- Uploaded business documentation (if any)
- Registration date and time
- IP address at registration

WHEN an administrator approves a seller, THE system SHALL:

- Set seller status to "approved"
- Notify seller via email: "Your application has been approved. You may now list products."
- Log approval timestamp, administrator ID, and IP address
- Grant selling privileges to seller dashboard
- Make shop name visible in product listings
- Allow product creation and editing

WHEN an administrator rejects a seller, THE system SHALL:

- Set seller status to "rejected"
- Require administrator to enter a rejection reason (minimum 10 characters)
- Notify seller via email: "Your application has been denied. Reason: [reason]"
- Log rejection timestamp, administrator ID, IP address, and reason
- Block seller from login until new registration

WHEN a seller submits a new registration after rejection, THE system SHALL:

- Set status to "pending_approval" again
- Clear previous rejection reason
- Reset all previous application data
- Create new approval request
- Notify administrators of new application

WHEN an administrator attempts to approve a seller with incomplete documentation and no justification, THE system SHALL NOT allow approval and SHALL display error: "A rejection reason must be provided when denying an application."

### Status Tracking

THE system SHALL track the following statuses for each seller:

- "pending_verification" — email not yet confirmed
- "pending_approval" — waiting for admin review
- "approved" — authorized to sell
- "rejected" — application denied, no selling privileges
- "suspended" — temporarily disabled by administrator

WHEN a seller’s status is "approved", THE system SHALL:

- Allow login to seller dashboard
- Display products in category and search listings
- Allow product creation, editing, and deletion (if no pending orders)
- Allow inventory management
- Allow responses to cancellation/refund requests

WHEN a seller’s status is "suspended", THE system SHALL:

- Prevent login to seller dashboard
- Hide all products from search and category listings
- Prevent new product creation or edits
- Keep existing order items active (shipping, cancellations, refunds)
- Display "Shop Suspended" instead of shop name on product detail pages
- Retain all previous snapshots

WHEN a seller’s status is "rejected" or "suspended", THE system SHALL:

- Prevent access to seller dashboard
- Prevent any product editing
- Allow viewing of existing products, inventory, and order history (read-only)

WHEN a suspended seller is unsuspended, THE system SHALL:

- Set status to "approved"
- Notify seller via email: "Your account has been reinstated. Your products are now visible."
- Make products visible again in search and category listings
- Restore full selling privileges

WHEN an administrator changes a seller’s status, THE system SHALL create a snapshot of:

- Seller’s profile (shop name, description, logo)
- Current approval status
- Timestamp of change
- Administrator ID who made change
- Reason (if provided)

### Account Deletion Conditions

WHEN a seller requests account deletion, THE system SHALL check:

- Are there any pending order items where status is "paid" or "shipped"?
- Are there any pending cancellation requests?
- Are there any pending refund requests?

IF any of the above conditions are true, THEN THE system SHALL:

- Return error message: "Account deletion is not allowed. You have pending orders/refunds/cancellations. Please resolve all outstanding issues before deleting your account."
- Block deletion request

IF none of the above conditions are true, THEN THE system SHALL:

- Set account status to "deletion_requested"
- Send confirmation email to seller with 7-day wait period
- During the 7-day period, seller SHALL be able to cancel deletion request
- After 7 days without cancellation, THE system SHALL:
  - Delete seller profile (shop name, description, logo)
  - Delete all products and variants
  - Delete all inventory records
  - Archive seller account record (keep for legal compliance)
  - Preserve all order history and associated snapshots
  - Preserve all cancellation and refund requests and their snapshots
  - Preserve all review history (reviews become "deleted seller" with no shop name)

WHEN seller account is deleted, THE system SHALL:

- Change all product listings linked to that seller to: "Seller: [Deleted Seller]"
- Preserve order records with:
  - Seller ID
  - Product name
  - Variant options
  - Quantity
  - Price at time of purchase
  - Seller profile snapshot at time of order
- Preserve order item history and shipping records
- Retain buyer contact information for delivery and dispute purposes

WHEN a seller account is deleted, THE system SHALL notify all customers who purchased from that seller: "The seller \"[Shop Name]\" has closed their store. Your order history and delivery details are preserved. For concerns, contact customer support."

## Seller Profile Management

### Requirements

WHEN a seller updates their shop name, description, or logo, THE system SHALL:

- Create a snapshot of the previous profile state (shop name, description, logo, timestamp)
- Store the snapshot with immutable audit trail
- Apply updated values to active profile
- Do not remove or delete prior snapshots

WHEN a seller edits shop name, THE system SHALL:

- Validate against existing shop names (no duplicates)
- Enforce limits: 5–120 characters, alphanumeric with spaces, no special characters except hyphens and underscores
- Allow Unicode characters (internationalized shop names)

WHEN a seller uploads a logo image, THE system SHALL:

- Accept: JPEG, PNG, WebP formats
- Enforce size: ≤5MB
- Enforce aspect ratio: 1:1 recommended, 4:3 maximum
- Auto-resize to 512x512px for standardization
- Generate thumbnail (128x128px)
- Store original and optimized versions
- Add watermark: "[Shop Name] Official Logo" in bottom-right corner (opacity 20%)

WHEN a seller removes their logo, THE system SHALL:

- Set logo field to null
- Keep previous logo snapshot intact
- Default to placeholder image: "[Shop Name] Logo"

WHEN a customer views a seller profile, THE system SHALL display:

- Current shop name
- Current shop description
- Current logo
- Average product rating (from all non-deleted reviews)
- Total number of products
- Total number of completed orders
- Date of first product listing
- Last update timestamp (for profile)

WHEN a seller edits their profile, customers SHALL see the updated information immediately in search and product listings.

## Product Lifecycle

### Product Creation

WHEN a seller creates a new product, THE system SHALL:

- Require name (required, 1–200 characters)
- Require description (required, 1–5,000 characters)
- Require category selection (must be a valid category/subcategory)
- Require base price (minimum $0.01, maximum $99,999.99)
- Require at least one variant to be created simultaneously

THE product SHALL be associated with the seller who created it.

WHEN a product is created, THE system SHALL:

- Assign a unique product ID
- Record creation timestamp
- Create a snapshot of the product with all initial values
- Set status to "active"
- Set inventory for all variants to 0

### Product Editing

WHEN a seller edits an existing product, THE system SHALL:

- Allow modification of: name, description, category, base price, images
- Prevent modification of: product ID, creation timestamp, seller ID
- Require at least one variant to remain after edits (must not delete all variants)

WHEN a product is edited, THE system SHALL:

- Create a snapshot of the product state BEFORE the change
- Store the snapshot with:
  - Timestamp of edit
  - Seller ID who made change
  - All product fields as they existed pre-edit
- Apply the new values to the active product record
- Preserve old snapshots (immutable)

### Product Deletion

WHEN a seller requests to delete a product, THE system SHALL:

- Verify the product belongs to the authenticated seller
- Check for pending order items with status "paid" or "shipped"
- Check for pending cancellation requests
- Check for pending refund requests

IF any of the above conditions are true, THEN THE system SHALL:

- Return error message: "Cannot delete product. There are pending orders, cancellations, or refunds for this product."
- Block deletion request

IF none of the above conditions are true, THEN THE system SHALL:

- Set product status to "deletion_requested"
- Send confirmation email to seller with 48-hour grace period
- During the grace period, seller SHALL be able to cancel deletion request
- After 48 hours without cancellation, THE system SHALL:
  - Delete all product variants and their inventory records
  - Delete all product images
  - Archive product record (keep for legal compliance)
  - Preserve product snapshots (including variant data at time of deletion)
  - Preserve reviews associated with the product (displayed as "Product deleted by seller")
  - Make product invisible in search and category listings immediately

WHEN a product is deleted, THE system SHALL:

- Remove product from all customer wishlists
- Replace product references in order items with preserved snapshot data
- Notify customers who had the product in their wishlist: "The product '[Product Name]' has been removed by the seller. It has been removed from your wishlist."

### Product Image Management

WHEN a seller uploads a product image:

- Accept: JPEG, PNG, WebP formats
- Enforce size: ≤10MB per image
- Enforce minimum dimensions: 800x800px
- Auto-resize to thumbnail (300x300px)
- Store original and thumbnail versions
- Assign unique ID to image
- Assign sequence number (first image becomes main thumbnail)

WHEN a seller reorders images, THE system SHALL:

- Update sequence number for each image
- The first sequence number becomes the main thumbnail
- Create a snapshot of the product image order before and after change

WHEN a seller deletes an image:

- Verify the image belongs to the product
- Remove the image from the product
- Preserve the image in product snapshots
- Keep thumbnail updated if deleted image was the main image
- Make the next image in sequence the new thumbnail

### Product Visibility

WHEN a product has no variants, THE system SHALL:

- Display product in search results and category listings
- Show status: "Unavailable: No variants available"
- Allow customers to view product detail page
- Prevent adding to cart
- Allow wishlist addition

WHEN a product's seller is suspended:

- Hide product from search and category listings
- Keep product accessible via direct URL
- Show: "Product unavailable — seller suspended" on product detail page
- Allow viewing of product snapshots

WHEN a product's seller is deleted:

- Hide product from search and category listings
- Keep product accessible via direct URL
- Show: "Product unavailable — seller deleted" on product detail page
- Preserve all snapshots and reviews
- Display "Seller: [Deleted Seller]" on product detail page

### Snapshot Preservation

A product snapshot SHALL contain:

- Product ID
- Product name
- Product description
- Base price
- Category ID and name
- Image URLs and sequence
- Creation timestamp
- Modification timestamp
- Seller ID
- Product status
- Snapshot creation timestamp

A product-snapshot-SKU (variant snapshot) SHALL contain:

- Product ID
- Variant ID
- SKU code (unique, required)
- Option values (JSON: {"color": "Red", "size": "Large"})
- Price (can override base price)
- Stock quantity at time of snapshot
- Snapshot creation timestamp

SNAPSHOTS SHALL be:

- Immutable (no delete, update, or modify operations allowed)
- Accessible to seller (own products only)
- Accessible to administrators (all products)
- Accessible to super administrators (all products)
- Archived for legal compliance (minimum 7 years)
- Visible to customers during order history and review viewing
- Not visible in public search or product listings

THE system SHALL NOT permit:

- Deletion of any snapshot
- Alteration of any snapshot data
- External access to snapshots outside platform
- Direct database access to snapshot tables

## Product Variants (SKU)

### Variant Creation

WHEN a seller adds a new variant to a product, THE system SHALL:

- Require SKU code (unique within the platform, alphanumeric format)
- Require at least one option value (e.g., color, size)
- Require stock quantity (minimum 0)
- Optionally set a price override (must be ≥ 0)

THE system SHALL ensure SKU uniqueness across all products (not just within the seller's products).

WHEN a variant is created, THE system SHALL:

- Assign a unique variant ID
- Create an initial inventory record with quantity change = 0
- Create a snapshot of the variant with initial values
- Associate the variant with the parent product

### Variant Editing

WHEN a seller edits a variant, THE system SHALL:

- Allow modification of: SKU code, option values, price, stock quantity
- Prevent modification of: product ID, variant ID, creation timestamp
- Require SKU code to remain unique

WHEN a variant is edited, THE system SHALL:

- Create a snapshot of the variant state BEFORE the change
- Store the snapshot with:
  - Timestamp of edit
  - Seller ID who made change
  - All variant fields as they existed pre-edit
- Apply the new values to the active variant record
- Preserve old snapshots (immutable)

### Variant Deletion

WHEN a seller requests to delete a variant, THE system SHALL:

- Verify the variant belongs to the authenticated seller
- Check for pending order items with status "paid" or "shipped"
- Check for pending cancellation requests
- Check for pending refund requests

IF any of the above conditions are true, THEN THE system SHALL:

- Return error message: "Cannot delete variant. There are pending orders, cancellations, or refunds for this variant."
- Block deletion request

IF none of the above conditions are true, THEN THE system SHALL:

- Set variant status to "deletion_requested"
- Send confirmation email to seller with 48-hour grace period
- During the grace period, seller SHALL be able to cancel deletion request
- After 48 hours without cancellation, THE system SHALL:
  - Delete the variant record
  - Archive the variant
  - Preserve the variant snapshot
  - Remove variant from stock inventory

### SKU Uniqueness

THE system SHALL ensure SKU codes are unique across the entire platform:

- No two variants from any seller may have the same SKU code
- SKU codes are case-sensitive
- SKU codes may contain alphanumeric characters, hyphens, underscores
- SKU codes must be 3–50 characters long
- SKU codes cannot be reused after deletion
- THE system SHALL validate SKU uniqueness upon creation and edit
- THE system SHALL return specific error code "SKU_DUPLICATE" if duplicate is found

### Stock Quantity Management

Each variant SHALL have a stock quantity managed through inventory history records, not snapshots.

Each inventory record SHALL contain:

- Variant ID
- Quantity change (positive for restocking, negative for orders/adjustments)
- Change reason (e.g., "Order #1234", "Manual adjustment", "Refund #5678")
- Timestamp (ISO 8601)
- Actor ID (seller ID or system)
- Actor type ("seller" or "system")

Current stock quantity SHALL be calculated by summing all inventory records for a variant.

The system SHALL not permit negative stock quantities — inventory records must be valid and non-negative in total.

### Variant Availability

WHEN a variant's stock quantity is 0:

- The variant SHALL be shown as "Out of stock" in product detail pages
- The variant SHALL NOT be available for selection in the cart
- The variant SHALL NOT be selectable for purchase
- THE system SHALL display: "Out of stock" next to the variant option

WHEN a variant's stock quantity is greater than 0:

- The variant SHALL be available for selection
- The variant SHALL be selectable for purchase
- THE system SHALL display: "In stock" next to the variant option

WHEN a variant's stock quantity becomes 0 due to order:

- The system SHALL immediately update UI to "Out of stock"
- The system SHALL prevent any further add-to-cart attempts
- The system SHALL maintain existing cart items

WHEN a variant's stock quantity increases from 0:

- The system SHALL immediately update UI to "In stock"
- The system SHALL allow add-to-cart attempts

## Inventory Management

### Inventory Records

Each variant SHALL have its own inventory history stored as discrete records.

Each inventory record SHALL be created when:

- A product variant is purchased in a confirmed order
- A seller performs a restock (positive adjustment)
- A seller performs an inventory adjustment (negative adjustment)
- A customer cancels an order item
- A customer receives a refund for an order item

Each inventory record SHALL include:

- variantId: string
- quantityChange: number (positive for restock, negative for reduction)
- reason: string (max 500 characters)
- timestamp: ISO 8601 string
- actorId: string (seller ID or system identifier)
- actorType: enum ("seller" | "system")

### Restocking Process

WHEN a seller restocks a product variant, THE system SHALL:

- Accept quantity (positive integer > 0)
- Accept reason (mandatory, 1–500 characters)
- Create an inventory record with positive quantity change
- Update current stock quantity by adding the restocked quantity

WHEN restocking occurs, THE system SHALL:

- Log the restock event
- Notify seller: "Restocked [quantity] units of [SKU]. New stock: [total]"

### Adjustment Process

WHEN a seller performs an inventory adjustment, THE system SHALL:

- Accept quantity (positive or negative integer)
- Accept reason (mandatory, 1–500 characters)
- Create an inventory record with specified quantity change
- Update current stock quantity

WHEN a negative adjustment is made, THE system SHALL:

- Verify the adjustment does not result in negative total stock
- Log the reason as an inventory loss (theft, damage, miscount)
- Notify seller: "Adjusted [quantity] units of [SKU]. New stock: [total]"

### Order Impact

WHEN an order is successfully placed:

- For each order item:
  - Verify the variant has sufficient stock for the requested quantity
  - Create an inventory record with negative quantity change equal to order quantity
  - Record reason as "Order #[orderId]"
  - Update current stock quantity
- If stock is insufficient for any variant, prevent order completion

### Cancellation/Refund Impact

WHEN an order item is cancelled or refunded:

- Create an inventory record with positive quantity change equal to the item quantity
- Record reason as "Cancellation #[cancellationId]" or "Refund #[refundId]"
- Update current stock quantity

### Stock Calculation

Current stock for a variant SHALL be calculated as:

> sum(all inventory records for this variant)

The system SHALL maintain this sum in real-time and update it with every new inventory record.

The system SHALL NOT use a separate "current stock" field — it SHALL always calculate dynamically.

### Out-of-Stock Behavior

WHEN a variant's stock reaches 0:

- The variant SHALL be marked "Out of stock" in:
  - Product detail pages
  - Product search results
  - Shopping cart (items already added remain)
- The variant SHALL NOT be available for selection in cart or checkout
- Customers SHALL see: "Out of stock" next to the variant option
- THE system SHALL prevent users from adding it to cart
- THE system SHALL prevent checkout if cart contains out-of-stock variants

WHEN a variant's stock increases from 0:

- The variant SHALL be immediately marked "In stock" in UI
- THE system SHALL allow users to add it to cart
- THE system SHALL allow checkout if cart only contains in-stock items

## Shopping Cart

### Add to Cart

WHEN a customer adds a product variant to their cart, THE system SHALL:

- Verify the variant is available (stock > 0)
- Require a quantity (minimum 1, maximum 99)
- Verify the product is active and not suspended
- Verify the seller is approved

WHEN the same variant is already in the cart, THE system SHALL:

- Combine quantities (add to existing cart item)
- NOT create a duplicate entry
- Update subtotal automatically
- Show new total quantity

WHEN a customer adds a variant to cart, THE system SHALL:

- Store product name, variant options, price, quantity, subtotal
- Store variant ID for reference
- Store product ID for reference
- Store seller ID for reference
- Store cart item ID
- Create timestamp

### Quantity Management

WHEN a customer changes the quantity of an item in their cart, THE system SHALL:

- Validate new quantity (1–99)
- Calculate new subtotal = price × quantity
- If new quantity exceeds available stock:
  - Display warning: "Only [available] in stock. Quantity adjusted to [available]."
  - Automate reduction of quantity to stock limit
  - Store adjusted quantity in cart
- If new quantity is 0:
  - Remove item from cart

WHEN a customer reduces quantity and it goes below 1, THE system SHALL:

- Remove the item from cart
- Show confirmation: "Item removed from cart."

### Cart Display

WHEN a customer views their cart, THE system SHALL display for each item:

- Product name (clickable link to product detail)
- Variant option values (e.g., Color: Red, Size: Large)
- Unit price
- Quantity
- Subtotal (price × quantity)
- Stock status indicator ("In stock", "Only X left", "Out of stock")
- Action buttons (remove, adjust quantity)

The cart SHALL display:

- Item count (total number of items, not items in cart)
- Total quantity
- Total price (sum of all subtotals)
- Shipping costs (estimated or zero)
- Order total
- Button to checkout

### Stock Validation

WHEN a variant's stock quantity is less than its cart quantity:

- THE system SHALL NOT prevent cart display
- THE system SHALL display: "Only [X] available in stock."
- THE system SHALL indicate the cart quantity exceeds stock
- THE system SHALL allow proceeding to checkout, but block order submission
- THE system SHALL display error during checkout: "Not enough stock. [Variant] only has [stock] units available. Please reduce quantity."

WHEN a variant's stock reaches 0:

- THE system SHALL NOT remove the item from cart automatically
- THE system SHALL display "Out of stock" next to item
- THE system SHALL NOT allow checkout if cart contains out-of-stock variants

### Cart Removal

WHEN a customer removes an item from their cart, THE system SHALL:

- Verify the item belongs to the authenticated customer
- Remove the cart item entirely
- Update cart total automatically
- Record removal timestamp
- Do not create a snapshot

### Cart Persistence

THE system SHALL persist cart state across sessions:

- Cart items are stored in database with customer ID
- Items are not deleted on browser close
- Items remain until removed by customer or until expired (30 days of inactivity)
- On login, cart is restored from database
- If cart items become unavailable (out of stock, deleted, seller suspended), they remain in cart but are marked as unavailable

## Checkout and Payment

### Checkout Initiation

WHEN a customer initiates checkout, THE system SHALL:

- Verify cart is not empty
- Verify all cart items are "In stock" (stock ≥ quantity)
- Verify all items are from active sellers
- Verify customer has at least one valid shipping address

IF any cart item is out of stock, unavailable, or from a suspended seller, THE system SHALL:

- Display error: "Cannot checkout. One or more items are unavailable."
- Prevent proceeding to checkout
- Display list of unavailable items

### Address Selection

WHEN a customer proceeds to checkout, THE system SHALL:

- Display list of customer's saved shipping addresses
- Pre-select the default address
- Allow selection of any address
- Allow adding a new address (if none exist)

WHEN a customer selects an address, THE system SHALL:

- Store selected address in temporary checkout session
- Verify address is valid (belongs to customer, not deleted)

THE address SHALL remain modifiable until order submission.

### Order Review

WHEN a customer reviews the order before submission, THE system SHALL display:

- List of items with:
  - Product name
  - Variant options
  - Quantity
  - Unit price
  - Subtotal
- Shipping address
- Estimated delivery date
- Total price
- Order summary

THE system SHALL validate:

- All items are still in stock
- Address is valid
- Product prices haven't changed since cart addition
- Seller still active

### Payment Processing

WHEN a customer confirms the order, THE system SHALL:

- Freeze cart quantity (prevent stock changes)
- Create order header with:
  - Order number (unique)
  - Order date
  - Customer ID
  - Selected shipping address
  - Order total
  - Order status: "paid"
- Link all cart items as order items

WHEN payment is processed:

- THE system SHALL integrate with external payment gateway
- Payment success or failure shall be returned synchronously

### Payment Failure Handling

IF payment fails, THE system SHALL:

- Return error to customer: "Payment failed. Please try again."
- Do not create order
- Release cart items (restore stock to original pre-checkout levels)
- Keep cart items intact for customer to retry
- Allow customer to change address, quantity, or payment method

### Order Creation

IF payment succeeds, THE system SHALL:

- Create order with status "paid"
- Remove cart items
- Decrease inventory for each variant (negative inventory record)
- Create order item snapshots for:
  - Product: name, description, category, images, base price, seller ID
  - Variant: SKU, option values, price, stock quantity
  - Seller: shop name, description, logo
- Record order item with status "paid"
- Send confirmation email: "Order [order number] confirmed. Payment received."
- Clear cart

## Order Structure

### Order Composition

An order SHALL contain one or more order items.

Each order item SHALL represent a single product variant with a quantity.

If a customer buys 3 of the same variant, it SHALL be represented as one order item with quantity = 3.

Order items can be from different sellers.

Each order SHALL have a unique order number.

Each order SHALL have a single shipping address.

Order items SHALL NOT be grouped by seller — items from different sellers appear as separate entries.

### Order Item Statuses

Each order item SHALL have its own status:

- Paid: payment completed, waiting for seller to ship
- Shipped: seller has shipped the item
- Delivered: item has been delivered
- Cancelled: item was cancelled
- Refunded: item was refunded

Order item status transitions are mutually exclusive and sequential.

### Order Status Derivation

The overall order status SHALL be derived from its items:

- If all items are paid → order is "paid"
- If any item is shipped (and none delivered yet) → order is "shipped"
- If all items are delivered → order is "delivered"
- If all items are cancelled → order is "cancelled"
- If all items are refunded → order is "refunded"
- If mixed states (e.g., some delivered, some refunded) → order is "partially completed"

Order status updates SHALL be computed in real-time upon any item status change.

### Multi-Seller Orders

An order SHALL contain items from one or multiple sellers.

Each item SHALL retain its seller ID for fulfillment tracking.

THE system SHALL:

- Group items for shipment per seller
- Create separate shipments for each seller
- Allow sellers to manage their own fulfillment
- Allow customers to track multiple shipments from different sellers in one order

### Sellers per Item

Each order item SHALL be associated with exactly one seller.

Order items from the same seller in the same order SHALL be eligible for bundling into one shipment.

When viewing order details, customers SHALL see:

- Each order item
- Seller name at time of purchase (from snapshot)

### Order History

Customers SHALL be able to view a list of all their orders.

The list SHALL be:

- Paginated (20 orders per page)
- Sorted by newest first (order creation timestamp)
- Displayed with:
  - Order number
  - Date of order
  - Total price
  - Overall order status
  - Number of items

Customers SHALL be able to click on an order to view its full details:

- Order number
- Order date
- Shipping address
- List of items with:
  - Product name
  - Variant options
  - Quantity
  - Unit price
  - Subtotal
  - Item status
- Order status
- List of shipments with:
  - Shipment ID
  - Carrier name
  - Tracking number
  - Tracking URL
  - Items included
  - Shipping date
  - Delivery status

## Shipping and Tracking

### Shipment Concept

A shipment is a physical package sent by a seller.

A shipment SHALL contain one or more order items from the same seller.

Different sellers SHALL always ship separately — never combine items from multiple sellers into one shipment.

A seller SHALL have discretion to ship:

- Items individually
- Items bundled (multiple items in one box)

The system SHALL NOT auto-bundle items — this decision is left to the seller.

### Shipping Process

WHEN a seller ships an order item, THE system SHALL:

- Allow seller to select one or more of their own order items marked as "paid"
- Allow seller to group items into one or more shipments
- Require tracking information for each shipment:
  - Carrier name (e.g., "USPS", "FedEx", "DHL")
  - Tracking number (required)
  - Optional: estimated delivery date

WHEN a shipment is created, THE system SHALL:

- Set status of all included order items to "shipped"
- Store shipment record with:
  - Shipment ID
  - Seller ID
  - Order ID
  - List of order item IDs
  - Carrier name
  - Tracking number
  - Tracking URL
  - Shipment timestamp
  - Estimated delivery date

WHEN a shipment is created, THE system SHALL:

- Notify customer: "Your order is on the way. Tracking: [tracking number]"
- Show tracking information on customer order detail page

### Delivery Confirmation

Customers SHALL be able to confirm delivery for each shipment.

WHEN a customer confirms delivery of a shipment:

- THE system SHALL change status of all order items in that shipment to "delivered"
- THE system SHALL record delivery confirmation timestamp
- THE system SHALL notify seller: "Delivery confirmed for shipment #[shipmentId]"

WHEN a customer does not confirm delivery:

- THE system SHALL automatically change status of all order items in the shipment to "delivered" after 14 calendar days from shipping date
- THE system SHALL notify customer: "Your delivery has been automatically marked as delivered. You have 7 days to report any issues."

WHEN delivery is confirmed (by customer or auto), THE system SHALL:

- Allow the customer to leave a review for each purchased product
- Trigger eligibility for review submission

## Order Cancellation

### Cancellation Request

Cancellations are handled per order item, not per entire order.

WHEN a customer requests cancellation for an order item, THE system SHALL:

- Only allow if item status is "paid" (not yet shipped)
- Require reason text (minimum 10 characters, max 500)
- Create a cancellation request record with:
  - Cancellation ID
  - Order item ID
  - Reason
  - Request timestamp
  - Customer ID
  - Status: "pending"

THE system SHALL NOT allow cancellation for:
- Items with status "shipped" or higher
- Items that are part of a shipment already created

### Cancellation Approval

WHEN a cancellation request is submitted, THE system SHALL:

- Notify the seller of the item: "Cancellation request submitted for item #[itemId]. Reason: [reason]"
- Display cancellation request in seller dashboard

WHEN a seller responds to a cancellation request, THE system SHALL:

- Allow seller to approve or reject
- Require reason if rejecting (minimum 10 characters)
- Create a snapshot of the cancellation request state at time of response:
  - Original request fields
  - Seller response
  - Response timestamp
- If approved:
  - Change order item status to "cancelled"
  - Increase stock quantity (positive inventory record for refund)
  - Notify customer: "Cancellation approved. Refund initiated."
  - Start refund process automatically
- If rejected:
  - Change cancellation request status to "rejected"
  - Notify customer: "Cancellation request denied. Reason: [seller reason]"

WHEN a cancellation request is approved, THE system SHALL:

- Trigger refund process for the item amount
- Restore inventory for the variant (positive inventory record with reason "Cancellation #[cancellationId]")
- Mark item as cancelled in order
- Update order status if all items are cancelled

### Order Status Updates

WHEN an item is cancelled:

- If all other items in the order are cancelled → order status becomes "cancelled"
- If some items remain paid or shipped → order status becomes "partially completed"

WHEN an order is fully cancelled:

- Notify customer: "Your entire order #[orderId] has been cancelled. Full refund in process."
- Notify seller: "Order #[orderId] cancelled. Items refunded and stock restored."

### Cancellation Timeline

Cancellations SHALL only be possible within 24 hours of payment confirmation.

Cancellation requests submitted after 24 hours SHALL be automatically rejected.

## Refund Requests

### Refund Request

Refunds are handled per order item, not per entire order.

WHEN a customer requests a refund for an order item, THE system SHALL:

- Only allow if item status is "delivered"
- Only allow if delivery confirmation happened within the last 7 calendar days
- Require reason text (minimum 10 characters, max 500)
- Create a refund request record with:
  - Refund ID
  - Order item ID
  - Reason
  - Request timestamp
  - Customer ID
  - Status: "pending"

THE system SHALL NOT allow refund for:
- Items with status other than "delivered"
- Items whose delivery confirmation was more than 7 days ago
- Items that were already refunded

### Refund Approval

WHEN a refund request is submitted, THE system SHALL:

- Notify the seller of the item: "Refund request submitted for item #[itemId]. Reason: [reason]"
- Display refund request in seller dashboard

WHEN a seller responds to a refund request, THE system SHALL:

- Allow seller to approve or reject
- Require reason if rejecting (minimum 10 characters)
- Create a snapshot of the refund request state at time of response:
  - Original request fields
  - Seller response
  - Response timestamp
- If approved:
  - Change order item status to "refunded"
  - Increase stock quantity (positive inventory record for refund)
  - Notify customer: "Refund approved. Amount will be credited within 3–5 business days."
  - Start refund process automatically
- If rejected:
  - Change refund request status to "rejected"
  - Notify customer: "Refund request denied. Reason: [seller reason]"

WHEN a refund request is approved, THE system SHALL:

- Initiate refund to customer's original payment method
- Restore inventory for the variant (positive inventory record with reason "Refund #[refundId]")
- Mark item as refunded in order
- Update order status if all items are refunded

### Order Status Updates

WHEN an item is refunded:

- If all other items in the order are refunded → order status becomes "refunded"
- If some items remain paid, shipped, or delivered → order status becomes "partially completed"

WHEN an order is fully refunded:

- Notify customer: "Your entire order #[orderId] has been refunded. Amount credited."
- Notify seller: "Order #[orderId] fully refunded. Items returned and stock restored."

### Refund Timeline

Refund requests SHALL only be possible within 7 calendar days of delivery confirmation.

Refund requests submitted after 7 days SHALL be automatically rejected.

## Reviews and Ratings

### Review Eligibility

A customer SHALL only be able to write a review for a product if:

- They purchased the product
- The order item status is "delivered"
- Delivery was confirmed (by customer or auto after 14 days)
- At least 24 hours have passed since delivery confirmation
- They have not already written a review for that product in that order (one review per product per order)

THE system SHALL prevent review submission if any of these conditions are not met.

### Review Creation

WHEN a customer writes a review, THE system SHALL:

- Require a rating (1–5 stars)
- Allow optional text content (0–2,000 characters)
- Require product ID and order item ID
- Record review timestamp
- Record customer ID
- Assign unique review ID
- Set status: "active" by default

THE system SHALL NOT allow:

- Rating outside 1–5 range
- Text exceeding 2,000 characters
- Duplicate review for same product in same order
- Review for any product without "delivered" status

### Review Editing

WHEN a customer edits their own review, THE system SHALL:

- Allow editing of: rating, text content
- Prevent editing of: reviewer, product, timestamp
- Create a snapshot of the review state before edit:
  - Original rating
  - Original text
  - Edit timestamp
  - Customer ID
- Apply new values
- Preserve all snapshots (immutable)

WHEN a review is edited, THE system SHALL:

- Update the current visible review on product detail page
- Maintain editable history via snapshots for dispute resolution
- Update product average rating based on latest non-deleted review

### Review Deletion

WHEN a customer deletes their own review, THE system SHALL:

- Set review status to "deleted"
- Preserve the review in its original state as a snapshot
- Remove review from public display and rating calculations
- Keep snapshot available for auditors, administrators, or sellers

THE system SHALL NOT allow:

- Deletion by anyone other than the reviewer
- Deletion if review has been flagged as abusive
- Deletion if review is under administrative review

### Rating Calculation

The product average rating SHALL be calculated as:

> sum(all active, non-deleted reviews for the product) / count(all active, non-deleted reviews for the product)

ONLY non-deleted reviews SHALL be included in average calculation.

When a review is deleted or edited, THE system SHALL recalculate the average immediately.

Ratings SHALL be displayed with one decimal place (e.g., 4.2).

### Review Visibility

Reviews SHALL be displayed:

- On the product detail page
- Sorted by newest first (by review timestamp)
- With reviewer information (display name or "Deleted User")
- With rating (1–5 stars)
- With optional text content
- With timestamp (e.g., "Posted 2 days ago")

When a reviewer's account is deleted:

- Their reviews shall remain
- Reviewer display name shall show: "Deleted User"
- Reviewer profile link shall be removed

When a product's seller is deleted:

- Reviews shall remain
- Seller name and logo shall show as "Deleted Seller"
- Link to seller profile shall be removed

WHEN a product is deleted, customers shall still be able to view:

- Product name
- Product images (as captured in snapshot)
- All reviews
- Average rating

## Snapshot Principle

### Snapshot Definition

A snapshot is an immutable, timestamped record of a business data entity at a specific point in time.

Snapshots SHALL NOT be editable, deletable, or modifiable in any way.

Snapshots SHALL be created whenever a user or system modifies a tracked entity.

### Trigger Conditions

Snapshots SHALL be triggered by the following actions:

- Product edit (name, description, category, base price, images)
- Product deletion (final state preserved)
- Product variant edit (SKU, options, price, stock)
- Seller profile edit (shop name, description, logo)
- Seller approval status change (pending, approved, rejected, suspended)
- Order item creation (snapshot of product, variant, seller)
- Review creation (rating, text)
- Review edit (rating, text)
- Review deletion (preserved state)
- Cancellation request (status changes)
- Refund request (status changes)
- Address update
- Order status change (paid → shipped → delivered → cancelled → refunded)
- Inventory adjustment
- Customer account deletion (profile data preserved for order history)

### Data Captured per Entity

**Product snapshot**: product ID, name, description, category, base price, image URLs, seller ID, creation timestamp, modification timestamp, status.

**Product variant snapshot**: product ID, variant ID, SKU, option values, price, stock quantity, creation timestamp, modification timestamp.

**Seller profile snapshot**: seller ID, shop name, description, logo URL, status, creation timestamp, modification timestamp.

**Order item snapshot**: order ID, product ID, variant ID, product name, product description, category, base price, variant options, price, seller ID, shop name, shop logo, quantity, status, item creation timestamp.

**Review snapshot**: review ID, product ID, customer ID, rating, text content, status, creation timestamp, modification timestamp, deletion timestamp (if applicable).

**Cancellation request snapshot**: cancellation ID, order item ID, reason, status, requested by, responded by, response timestamp, response reason (if rejected).

**Refund request snapshot**: refund ID, order item ID, reason, status, requested by, responded by, response timestamp, response reason (if rejected).

**Address snapshot**: address ID, recipient name, phone, street, city, state, postal, country, is_default, timestamp of change.

### Snapshot Immutability

SNAPSHOTS SHALL be:

- Immutable (no delete, update, or modify operations allowed)
- Permanent (retained indefinitely)
- Accessible via unique ID
- Accessible for audit purposes
- Protected from data loss

THE system SHALL not delete any snapshot under any circumstances.

### Access Control

Customers SHALL be able to view:

- Snapshots of their own orders (item data)
- Snapshots of their own reviews
- Snapshots of addresses they modified

Sellers SHALL be able to view:

- Snapshots of their own products
- Snapshots of their own product variants
- Snapshots of their own profile changes
- Snapshots of order items they are responsible for
- Snapshots of cancellation/refund requests associated with their products

Administrators SHALL be able to view:

- All product snapshots
- All variant snapshots
- All seller profile snapshots
- All order item snapshots
- All review snapshots
- All cancellation/refund snapshots
- All address snapshots

Super administrators SHALL have complete access.

### Use Cases

**1. Price Dispute Resolution**

A customer claims they paid $49.99 for a product, but later saw the price changed to $69.99.

- They can view their order snapshot, which shows: "Price at time of purchase: $49.99"
- The seller can verify the price was changed after the purchase
- Both parties have evidence of transaction integrity

**2. Product Description Discrepancy**

A customer receives a product with different features than described.

- The customer can show their order snapshot: "Description at purchase: Handwoven cotton, organic dyes."
- The seller cannot claim the description changed later — the snapshot proves what was presented

**3. Review Authenticity**

A seller claims a negative review was edited by the customer.

- The review snapshot shows the original text and rating
- The editor snapshot shows the revision
- Both versions are preserved for review

**4. Seller Brand Change**

A seller changes their shop name after a purchase.

- Customers still see the original shop name and logo from their order snapshot
- The change is tracked and auditable

**5. Fraud Prevention**

A seller tries to falsely claim a customer's item was "wrongly returned."

- The delivery timestamp and snapshot are immutable proof
- No one can alter the history

The Snapshot Principle ensures that the platform operates as a trustworthy, immutable ledger of commerce — preserving the truth of every transaction."}}}}