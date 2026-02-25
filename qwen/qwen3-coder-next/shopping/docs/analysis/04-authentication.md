# E-Commerce Shopping Mall Platform - Requirements Specification

## Overview

This document provides a comprehensive requirements specification for the E-Commerce Shopping Mall Platform, a multi-actor e-commerce system supporting customers, sellers, and administrators with complex business workflows for product management, order processing, inventory management, and administrative oversight.

The platform implements a **Snapshot Principle** for data integrity in financial transactions, where all modifications to critical data are recorded as immutable snapshots for dispute resolution and audit trails.

## Core System Principles

### Platform Architecture

**Multi-Actor System:**
- **Customers**: Regular users who browse, purchase, and review products
- **Sellers**: Business entities who list, manage, and ship products
- **Administrators**: Platform operators who oversee the entire system

**Snapshot Principle:**
- Every editable data modification creates an immutable snapshot
- Snapshots record: timestamp, modifier, before/after values
- Critical for dispute resolution in financial transactions
- Applies to: products, variants, seller profiles, order items, reviews, cancellations, refunds

**Payment Processing:**
- External payment gateway integration
- Payment failures prevent order creation
- Payment success triggers order processing and inventory reduction

**Order Processing:**
- Per-item cancellation and refund (not full order)
- Partial order fulfillment support
- Shipment-based delivery tracking

### Business Model Overview

**Revenue Model:**
- Commission-based revenue from seller transactions
- Optional premium features for sellers
- Potential advertising revenue from product placement

**Target Market:**
- Individual consumers seeking diverse product selection
- Small to medium businesses looking to expand online presence
- Platform administrators ensuring fair marketplace operation

**Key Differentiators:**
- Comprehensive seller dashboard and management tools
- Advanced inventory tracking and snapshot system
- Robust administrative oversight capabilities
- Multi-seller support with individual shop profiles

## User Actor System

### Customer Actor

**Description:**
Customers are the primary consumers of the platform. They register to browse products, make purchases, leave reviews, and manage their profiles. All customers must register before accessing any platform features—guest browsing is not supported.

**Permissions:**
- Register new account
- Browse and search products
- Add products to wishlist
- Add products to shopping cart
- Place orders
- Manage shipping addresses
- Cancel or request refunds for their orders
- Write and edit reviews
- Manage their profile and password
- View order history
- View seller profiles

**Restrictions:**
- Cannot access seller-specific features
- Cannot view other customers' private information
- Cannot manage platform administration
- Cannot view seller inventory or internal metrics

### Seller Actor

**Description:**
Sellers are business entities that list products for sale on the platform. They manage their shop profiles, inventory, products, and order fulfillment. Seller accounts require administrator approval before full access is granted, ensuring platform quality and compliance.

**Permissions:**
- Register seller account (pending approval)
- Manage shop profile (name, description, logo)
- Create, edit, and delete products
- Manage product variants and inventory
- Process orders (ship items, respond to cancellations/refunds)
- View seller dashboard analytics
- Access inventory history
- View customer reviews for their products

**Restrictions:**
- Cannot access other sellers' data
- Cannot manage platform administration
- Cannot view other sellers' inventory or internal metrics
- Cannot access customers' private information beyond order fulfillment needs
- Products cannot be deleted if orders are pending

**Account Approval Workflow:**
- Initial registration creates account with "pending_admin_approval" status
- Administrator review process before activation
- Rejection with reason allows resubmission
- Approved sellers gain full access to seller features

### Administrator Actor

**Description:**
Administrators are platform operators responsible for overseeing the marketplace. They manage user accounts, approve sellers, handle disputes, and ensure platform compliance. Administrators are granted through a formal request and approval process.

**Permissions:**
- View all users and accounts
- Approve or reject seller registrations
- Suspend or unsuspend seller accounts
- Ban or unban users
- View all products and orders
- Force-cancel or refund orders
- Create and manage categories
- Delete products for policy violations
- Access all snapshots for dispute resolution

**Roles and Grades:**
- **Regular Administrator**: Standard administrative capabilities
- **Super Administrator**: All capabilities plus ability to promote/demote other administrators
- Super administrators cannot demote themselves

**Restrictions:**
- Cannot view other administrators' private information
- Administrative actions are logged for audit purposes
- Sensitive operations require justification and logging

## Functional Requirements

### Customer Account Management

**Registration Process:**

WHEN a user navigates to the registration page, THE system SHALL provide a registration form with the following required fields:

- Email address (valid email format required)
- Password (minimum 8 characters, must include uppercase, lowercase, number, and special character)
- Password confirmation (must match the password field)
- Display name (required for profile, 2-50 characters)
- Phone number (required for order fulfillment, must be valid format)

WHEN the user submits the registration form, THE system SHALL:

1. Validate all required fields are present and properly formatted
2. Check that the email address is not already registered
3. Verify password strength meets minimum requirements
4. Confirm password and password confirmation match
5. Create a new customer account with status "active" (no email verification required by default)
6. Create a default customer profile with provided display name and phone number
7. Return a success response with account creation details

IF email validation is enabled (optional configuration), THE system SHALL:

- Create account with status "pending_email_verification"
- Send verification email with time-limited token (24 hours)
- Prevent login until verification completed
- Allow users to request new verification email if expired

**Login Process:**

WHEN a customer accesses the login page, THE system SHALL:

1. Display login form with email and password fields
2. Validate form inputs when submitted
3. Process login request with provided credentials

WHEN a customer submits login credentials, THE system SHALL:

1. Verify the email exists in the system
2. Validate the password matches the stored hash
3. Check the account status is "active" (not banned, suspended, or unverified)
4. Generate JWT tokens (access token: 30 minutes, refresh token: 7 days)
5. Set tokens in httpOnly cookie (recommended) or localStorage
6. Update the last login timestamp
7. Return success response with customer profile information

IF credentials are invalid, THE system SHALL return generic error "Invalid email or password" to prevent account enumeration.

**Password Management:**

WHEN a customer wishes to change their password, THE system SHALL:

1. Require current password verification
2. Require new password meeting all requirements
3. Require password confirmation
4. Validate current password is correct
5. Hash the new password using bcrypt with cost factor 12
6. Update password in database
7. Invalidate all active sessions (force re-login)
8. Send password change confirmation email

IF current password is incorrect, THE system SHALL:

- Return error "Current password is incorrect"
- Increment failed password change counter
- Lock password change after 3 consecutive failures

**Forgot Password Flow:**

WHEN a user navigates to the "Forgot Password" page, THE system SHALL:

1. Display form with email field
2. Validate email format
3. Check if account exists

WHERE account exists, THE system SHALL:

- Generate password reset token (1 hour expiration)
- Create reset request record
- Send reset email with secure token link
- Return success message "If an account exists, a reset link has been sent"

WHERE no account exists, THE system SHALL:

- Return same success message (prevent enumeration)
- Log the request for security monitoring

**Account Deletion:**

WHEN a customer requests account deletion, THE system SHALL:

1. Validate account ownership
2. Verify customer has no pending orders
3. Mark account as "deleted"
4. Delete customer profile information
5. Preserve order history (for seller records and legal purposes)
6. Preserve reviews but show "deleted user" as author
7. Clear all sessions and invalidate tokens
8. Return success response

**Customer Profile Management:**

WHEN a customer accesses their profile page, THE system SHALL:

- Display current display name and phone number
- Show account status and registration date
- Provide edit capability for profile information

WHEN a customer edits their profile, THE system SHALL:

1. Validate new display name (2-50 characters)
2. Validate new phone number format
3. Update profile in database
4. Return success response with updated profile

### Address Management

**Address Creation:**

WHEN a customer adds a new shipping address, THE system SHALL:

1. Display address form with required fields:
   - Recipient name
   - Phone number
   - Street address
   - City
   - State/Province
   - Postal code
   - Country
2. Validate all required fields
3. Create address record linked to customer
4. Set as default if no other addresses exist
5. Return success response

**Address Management:**

WHEN a customer accesses their address management page, THE system SHALL:

- Display list of all addresses with:
  - Recipient name and address details
  - Default indicator
  - Edit and delete buttons
- Show validation for phone number and address format

WHERE a customer sets an address as default, THE system SHALL:

- Update the default address flag
- Set previous default as non-default
- Return success response

WHERE a customer deletes an address, THE system SHALL:

- Verify address is not default if other addresses exist
- Delete address record
- Return success response
- If deleted address was default, set another address as default

**Address Validation:**

The system shall validate:
- Recipient name: 1-100 characters
- Phone number: valid international format
- Street address: 1-200 characters
- City: 1-100 characters
- State/Province: 1-100 characters
- Postal code: valid format for selected country
- Country: valid ISO 3166-1 alpha-2 code

### Seller Account Management

**Registration Process:**

WHEN a user navigates to the seller registration page, THE system SHALL:

1. Display seller registration form with required fields:
   - Email address (valid format)
   - Password (minimum 8 characters with complexity requirements)
   - Password confirmation
   - Shop name (3-100 characters, unique)
   - Shop description (optional, up to 1000 characters)
   - Business registration number (optional)

2. Validate all required fields
3. Check email uniqueness
4. Verify password strength
5. Confirm password match
6. Check shop name uniqueness
7. Create seller account with status "pending_admin_approval"
8. Send notification to administrators
9. Return success response with pending approval message

**Approval Workflow:**

WHEN an administrator reviews a seller registration, THE system SHALL:

- Display seller application with:
  - Registration details
  - Business information
  - Shop name and description
- Provide approve/reject buttons

WHERE an administrator approves, THE system SHALL:

- Update seller status to "active"
- Send approval notification email
- Allow seller to access seller features

WHERE an administrator rejects, THE system SHALL:

- Update seller status to "rejected"
- Store rejection reason
- Send rejection notification with reason
- Allow seller to resubmit registration

**Login Process:**

WHERE a seller attempts to log in, THE system SHALL:

- Validate credentials against seller accounts
- Check account status
- Generate seller-specific JWT tokens

WHERE seller status is "pending_admin_approval", THE system SHALL:

- Allow login but restrict seller features
- Display pending approval status
- Show when seller features become available

WHERE seller status is "rejected", THE system SHALL:

- Prevent login
- Show rejection notification with reason
- Provide link to resubmit registration

**Seller Profile Management:**

WHEN a seller accesses their profile management, THE system SHALL:

- Display current shop name, description, and logo
- Show approval status
- Provide edit capability for shop information

WHERE a seller edits their profile, THE system SHALL:

1. Validate new shop name (3-100 characters, unique)
2. Validate new description (up to 1000 characters)
3. Create snapshot of profile before changes
4. Update profile in database
5. Return success response

**Account Deletion:**

WHERE a seller requests account deletion, THE system SHALL:

1. Verify seller has no pending orders (paid or shipped status)
2. Verify no pending cancellation or refund requests
3. Mark seller account as "deleted"
4. Delete shop profile
5. Delete products and variants
6. Preserve order history and snapshots
7. Preserve shop name in past orders
8. Clear sessions and invalidate tokens

**Seller Dashboard:**

WHEN a seller accesses their dashboard, THE system SHALL display:

- Total number of products
- Total number of order items for their products
- Number of pending cancellation requests
- Number of pending refund requests
- Recent order summary
- Inventory health metrics

WHEN a seller filters order items, THE system SHALL:

- Support filtering by status (paid, shipped, delivered, cancelled, refunded)
- Support date range filtering
- Support search by product name or order ID
- Return paginated results

### Product Management

**Product Creation:**

WHEN a seller creates a new product, THE system SHALL:

1. Display product creation form with required fields:
   - Name (required, 1-200 characters)
   - Description (required, 1-10,000 characters)
   - Category (required, from available categories)
   - Base price (required, positive number with 2 decimal places)
   - Images (multiple upload supported)
   - SKU variants (minimum 1 variant required)

2. Validate all required fields
3. Create product record with seller ID
4. Create initial product snapshot
5. Create inventory records for variants
6. Return success response with product details

**Product Editing:**

WHERE a seller edits a product, THE system SHALL:

1. Create product snapshot before changes
2. Validate new product name (1-200 characters)
3. Validate new description (1-10,000 characters)
4. Update product fields in database
5. Update product snapshot with new state
6. Return success response

**Product Deletion:**

WHERE a seller deletes a product, THE system SHALL:

1. Verify no pending order items (paid or shipped status)
2. Verify no pending cancellation or refund requests
3. Create product snapshot marking deletion
4. Delete product record
5. Delete all variants and inventory records
6. Remove from search indexes
7. Return success response

**Product Visibility:**

**Search Indexing:**

- Deleted products removed from search indexes
- Products without variants shown as "unavailable"
- Suspended seller products hidden from search
- Category browsing includes active products only

**Image Management:**

WHEN a seller uploads images to a product, THE system SHALL:

- Support multiple image uploads (maximum configurable)
- Validate image formats (JPEG, PNG, WebP)
- Create image records with order index
- Set first image as main thumbnail
- Generate thumbnails in multiple sizes

WHERE a seller reorders images, THE system SHALL:

- Update image order index
- Create product snapshot
- Return success response

WHERE a seller deletes an image, THE system SHALL:

- Delete image record
- Update product snapshot
- If deleted image was main, set next image as main
- Return success response

**SKU Variant Management:**

**Variant Creation:**

WHEN a seller adds variants to a product, THE system SHALL:

1. Display variant form with required fields:
   - SKU code (required, 1-50 characters, unique per product)
   - Option values (e.g., color: Red, size: Large)
   - Price (optional, overrides base price)
   - Stock quantity (required, non-negative integer)

2. Validate SKU uniqueness within product
3. Create variant records
4. Create inventory records with initial stock
5. Create product snapshot
6. Return success response

**Variant Editing:**

WHERE a seller edits a variant, THE system SHALL:

1. Validate new SKU code (1-50 characters, unique)
2. Validate option values format
3. Validate price (positive number with 2 decimal places)
4. Create variant snapshot before changes
5. Update variant in database
6. Create product snapshot with updated variant
7. Return success response

**Variant Deletion:**

WHERE a seller deletes a variant, THE system SHALL:

1. Verify no pending order items (paid or shipped status)
2. Verify no pending cancellation or refund requests
3. Create variant snapshot
4. Create product snapshot
5. Delete variant record
6. Delete inventory records
7. Ensure product has at least one variant remaining
8. Return success response

**Stock Quantity Validation:**

- Stock must be non-negative integer
- Out of stock variants (stock = 0) cannot be added to cart
- Cart quantity must not exceed variant stock
- Order placement reduces stock for each variant

### Inventory Management

**Stock Tracking:**

**Inventory History:**

WHEN inventory changes occur, THE system SHALL:

1. Create inventory history record with:
   - Variant ID
   - Quantity change (positive for restocking, negative for orders)
   - Reason (order, restock, adjustment, cancellation, refund)
   - Timestamp
   - Related order or adjustment ID (if applicable)
   - User ID (if manual adjustment)

2. Calculate current stock by summing all history records
3. Update variant stock quantity
4. Return success response

**Stock Adjustments:**

WHERE a seller manually adjusts inventory, THE system SHALL:

1. Display adjustment form with quantity and reason
2. Validate quantity (integer, can be negative for adjustments)
3. Create inventory history record
4. Update variant stock quantity
5. Create product snapshot
6. Return success response

**Restocking Process:**

WHERE a seller adds inventory, THE system SHALL:

1. Display restock form with:
   - Variant selection
   - Quantity to add (positive integer)
   - Reason (optional, up to 255 characters)

2. Validate variant exists and is active
3. Validate quantity is positive
4. Create inventory history record
5. Update variant stock quantity
6. Create product snapshot
7. Return success response

**Order Impact on Inventory:**

WHEN an order is placed successfully, THE system SHALL:

1. Identify all purchased variants
2. For each variant, create negative inventory record:
   - Quantity: ordered quantity
   - Reason: "order"
   - Related order ID
   - Timestamp
3. Update variant stock quantity
4. Verify sufficient stock available before order completion
5. If insufficient stock, prevent order and show error

**Order Cancellation Impact:**

WHERE an order item is cancelled, THE system SHALL:

1. Create positive inventory record:
   - Quantity: cancelled quantity
   - Reason: "cancellation"
   - Related order ID
   - Timestamp
2. Update variant stock quantity
3. Return success response

**Order Refund Impact:**

WHERE an order item is refunded, THE system SHALL:

1. Create positive inventory record:
   - Quantity: refunded quantity
   - Reason: "refund"
   - Related order ID
   - Timestamp
2. Update variant stock quantity
3. Return success response

**Low Stock Management:**

**Out of Stock Handling:**

- Variant with stock = 0 shown as "out of stock"
- Out of stock variants cannot be added to cart
- Existing cart items marked as unavailable if variant goes out of stock
- Product with all variants out of stock shown as "unavailable"

**Inventory History Access:**

WHERE a seller accesses inventory history, THE system SHALL:

- Display chronological list of inventory changes
- Show quantity change, reason, timestamp, related order (if applicable)
- Support filtering by date range, reason, or order
- Support pagination
- Show current stock total calculated from history

### Order Processing

**Shopping Cart:**

**Cart Creation:**

WHERE a customer adds a product variant to cart, THE system SHALL:

1. Validate variant exists and is active
2. Validate quantity requested (positive integer)
3. Validate stock availability
4. Check if variant already in cart

WHERE variant already in cart, THE system SHALL:

- Combine quantities (not create duplicate entries)
- Update cart item with new quantity
- Verify combined quantity does not exceed stock

WHERE variant not in cart, THE system SHALL:

- Create new cart item with:
  - Product ID
  - Variant ID
  - Quantity
  - Unit price (variant price or base price)
  - Subtotal calculation
  - Timestamp
- Return success response

**Cart Management:**

WHERE a customer views their cart, THE system SHALL:

- Display all cart items with:
  - Product name and main image
  - Variant options
  - Unit price
  - Quantity
  - Subtotal
  - Stock availability indicator
- Show total cart price
- Show warnings for:
  - Stock less than cart quantity
  - Out of stock variants
  - Deleted variants

WHERE a customer changes cart quantity, THE system SHALL:

1. Validate new quantity (positive integer)
2. Validate stock availability
3. Update cart item quantity
4. Recalculate subtotal
5. Recalculate total cart price
6. Return success response

WHERE a customer removes cart item, THE system SHALL:

- Delete cart item record
- Recalculate total cart price
- Return success response

**Checkout Process:**

WHEN a customer proceeds to checkout, THE system SHALL:

1. Validate cart items:
   - Remove unavailable items
   - Check stock availability
   - Update prices (in case of price changes)

2. Display checkout summary with:
   - List of items with prices and quantities
   - Shipping address selection (default or new)
   - Total price breakdown
   - Payment method selection

3. Require shipping address selection
4. Validate order total
5. Allow order review before confirmation

**Order Creation:**

WHEN a customer confirms and places an order, THE system SHALL:

1. Validate all cart items are available
2. Verify stock availability for all items
3. Create order record with:
   - Order number (unique)
   - Customer ID
   - Shipping address ID
   - Order status: "paid" (upon payment success)
   - Timestamp

4. For each cart item, create order item with:
   - Order ID
   - Product ID
   - Variant ID
   - Quantity
   - Unit price (at time of purchase)
   - Subtotal calculation
   - Seller ID
   - Initial status: "paid" (upon payment success)
   - Timestamp

5. Create product snapshot for each purchased product
6. Create variant snapshot for each purchased variant
7. Create seller profile snapshot for each seller
8. Create inventory records for stock reduction
9. Clear customer cart
10. Process payment (external gateway integration)
11. Return order confirmation with order details

**Payment Processing:**

**Payment Gateway Integration:**

- External payment gateway integration (payment processor configured separately)
- Payment request includes:
  - Order total
  - Customer information
  - Order items description
- Payment response includes:
  - Transaction ID
  - Success/failure status
  - Error messages (if applicable)

**Payment Success Flow:**

WHERE payment succeeds, THE system SHALL:

1. Update order status to "paid"
2. Create order items with "paid" status
3. Reduce inventory for all purchased variants
4. Clear customer cart
5. Send order confirmation email
6. Return order confirmation to customer

**Payment Failure Flow:**

WHERE payment fails, THE system SHALL:

1. Return error response to customer
2. Do not create order record
3. Do not reduce inventory
4. Do not clear cart
5. Allow customer to retry payment

**Order Status Management:**

**Order Item Status Workflow:**

- **Paid**: Payment completed, waiting for seller to ship
- **Shipped**: Seller has shipped the item
- **Delivered**: Item has been delivered (customer confirmation or 14-day auto)
- **Cancelled**: Item was cancelled by seller approval
- **Refunded**: Item was refunded by seller approval

**Order Status Derivation:**

- If all items are paid → order status: "paid"
- If any item is shipped (none delivered) → order status: "shipped"
- If all items are delivered → order status: "delivered"
- If all items are cancelled → order status: "cancelled"
- If all items are refunded → order status: "refunded"
- Mixed states → order status: "partially completed"

**Order History:**

WHERE a customer views their order history, THE system SHALL:

- Display paginated list of orders
- Show newest first
- For each order, display:
  - Order number
  - Order date
  - Total price
  - Overall order status
  - Number of items

WHERE a customer views order details, THE system SHALL:

- Display order header with:
  - Order number and date
  - Customer information
  - Shipping address
  - Payment information
  - Overall order status

- Display order items list with:
  - Product name and main image
  - Variant options
  - Quantity
  - Unit price
  - Item status
  - Seller shop name

- Display shipment list with:
  - Shipment ID
  - Tracking number
  - Carrier name
  - Items included
  - Shipment status
  - Delivery confirmation status

**Order Cancellation:**

**Cancellation Request:**

WHERE a customer requests cancellation for an order item, THE system SHALL:

1. Validate item status is "paid" (not shipped)
2. Display cancellation form with reason field
3. Create cancellation request with:
   - Order item ID
   - Reason (text, required)
   - Status: "pending"
   - Customer ID
   - Timestamp
4. Return success response

**Seller Response:**

WHERE a seller responds to cancellation request, THE system SHALL:

1. Validate seller owns the order item
2. Update cancellation request with:
   - Response: "approved" or "rejected"
   - Timestamp
   - Seller ID
3. Create cancellation request snapshot
4. If approved:
   - Update order item status to "cancelled"
   - Create positive inventory record
   - Create refund transaction (if paid)
5. If rejected:
   - Update order item status to "paid"
   - Return success response

**Impact on Order:**

- Cancelled items restore stock quantities
- Remaining items continue normal processing
- If all items cancelled → order status: "cancelled"

**Refund Requests:**

**Refund Request:**

WHERE a customer requests refund for an order item, THE system SHALL:

1. Validate item status is "delivered"
2. Validate delivery date is within 7 days
3. Display refund form with reason field
4. Create refund request with:
   - Order item ID
   - Reason (text, required)
   - Status: "pending"
   - Customer ID
   - Timestamp
5. Return success response

**Seller Response:**

WHERE a seller responds to refund request, THE system SHALL:

1. Validate seller owns the order item
2. Update refund request with:
   - Response: "approved" or "rejected"
   - Timestamp
   - Seller ID
3. Create refund request snapshot
4. If approved:
   - Update order item status to "refunded"
   - Create positive inventory record
   - Create refund transaction
   - If item was paid, initiate refund payment
5. If rejected:
   - Update order item status to "delivered"
   - Return success response

**Impact on Order:**

- Refunded items restore stock quantities
- Remaining items unaffected
- If all items refunded → order status: "refunded"

### Shipping and Tracking

**Shipment Creation:**

**Seller Shipment Process:**

WHERE a seller processes shipping for order items, THE system SHALL:

1. Display items ready to ship (status: "paid")
2. Allow seller to select items to include in shipment
3. Validate all selected items belong to same seller
4. Allow seller to include multiple items in one shipment

**Tracking Information:**

WHERE a seller enters tracking information, THE system SHALL:

1. Display tracking form with:
   - Carrier name (required)
   - Tracking number (required)
   - Estimated delivery date (optional)

2. Validate carrier name (1-100 characters)
3. Validate tracking number format
4. Create shipment record with:
   - Order ID
   - Seller ID
   - Tracking information
   - Status: "pending"

5. Create shipment items linking to order items
6. Update selected order items status to "shipped"
7. Return success response

**Delivery Confirmation:**

**Customer Delivery Confirmation:**

WHERE a customer confirms delivery, THE system SHALL:

1. Display shipment items for confirmation
2. Validate customer owns the order
3. Confirm delivery for all items in shipment
4. Update all shipment items status to "delivered"
5. Return success response

**Automatic Delivery:**

WHERE 14 days have passed since shipping, THE system SHALL:

- Automatically mark all items in shipment as "delivered"
- Update shipment status to "completed"
- Return success response

**Shipment Status Workflow:**

- **Pending**: Shipment created, awaiting carrier
- **In Transit**: Carrier has picked up shipment
- **Out for Delivery**: Carrier en route to customer
- **Delivered**: Customer has confirmed delivery or auto-delivery
- **Exception**: Delivery issue encountered

### Review System

**Review Creation:**

WHERE a customer writes a review, THE system SHALL:

1. Validate customer purchased the product (item status: "delivered")
2. Validate customer has not reviewed this product in this order
3. Display review form with:
   - Rating (1-5 stars, required)
   - Review text (optional, up to 2000 characters)

4. Create review record with:
   - Product ID
   - Customer ID
   - Order ID
   - Rating (1-5)
   - Review text
   - Status: "active"
   - Timestamp

5. Recalculate product average rating
6. Return success response

**Review Editing:**

WHERE a customer edits their review, THE system SHALL:

1. Validate ownership of review
2. Create review snapshot before changes
3. Validate new rating (1-5)
4. Validate new text (up to 2000 characters)
5. Update review in database
6. Update review snapshot
7. Recalculate product average rating
8. Return success response

**Review Deletion:**

WHERE a customer deletes their review, THE system SHALL:

1. Validate ownership of review
2. Create review snapshot marking deletion
3. Update review status to "deleted"
4. Recalculate product average rating
5. Return success response

**Review Display:**

WHERE a customer views product reviews, THE system SHALL:

- Display all active (non-deleted) reviews
- Sort by newest first
- Show for each review:
  - Customer name (or "deleted user" if review author deleted)
  - Rating (star display)
  - Review text
  - Review date
  - Verified purchase indicator

**Rating Calculation:**

- Average rating calculated from all active (non-deleted) reviews
- Rating displayed as decimal with one decimal place
- Total review count shown

**Wishlist Management:**

**Wishlist Creation:**

WHERE a customer adds product to wishlist, THE system SHALL:

1. Validate customer owns wishlist
2. Validate product exists and is active
3. Check if product already in wishlist
4. Create wishlist item with:
   - Customer ID
   - Product ID
   - Timestamp
5. Return success response

**Wishlist Management:**

WHERE a customer views their wishlist, THE system SHALL:

- Display paginated list of wishlist items
- Show for each product:
  - Product name and main image
  - Current price or price range
  - Seller shop name
  - Stock status
  - Remove button

WHERE a customer removes item from wishlist, THE system SHALL:

- Delete wishlist item record
- Return success response

**Product Deletion Impact:**

WHERE a seller deletes a product, THE system SHALL:

- Automatically remove product from all wishlists
- Return success response

### Search and Filtering

**Product Search:**

**Search Functionality:**

WHERE a customer searches products, THE system SHALL:

1. Accept search query string
2. Search product names and descriptions
3. Support fuzzy matching for typos
4. Return paginated results

**Filtering Options:**

WHERE a customer applies filters, THE system SHALL:

- Filter by category (including subcategories)
- Filter by price range (minimum and maximum)
- Filter by stock availability (in-stock only)
- Support multiple simultaneous filters

**Sorting Options:**

WHERE a customer sorts search results, THE system SHALL:

- Sort by newest first (default)
- Sort by price low to high
- Sort by price high to low
- Sort by rating high to low

**Search Results Display:**

WHERE search results are displayed, THE system SHALL:

- Show for each product:
  - Main image thumbnail
  - Product name
  - Price (base price or price range for variants)
  - Seller shop name (linked to seller profile)
  - Average rating (if reviews exist)
  - Stock availability indicator

**Product Detail Page:**

**Product Display:**

WHERE a customer views product details, THE system SHALL:

- Display:
  - All product images (carousel or grid)
  - Product name and description
  - Category (with breadcrumb navigation)
  - Seller shop name and link to seller profile
  - Average rating and total review count
  - All available variants with prices and stock status
  - All reviews

**Variant Selection:**

WHERE a customer selects a variant, THE system SHALL:

- Display variant options clearly
- Show stock availability per variant
- Show price difference from base price
- Enable add to cart with selected variant

### Administrator System

**Seller Management:**

**Seller Approval Workflow:**

WHERE an administrator reviews seller applications, THE system SHALL:

1. Display pending seller list with:
   - Registration date
   - Email and shop name
   - Business information
   - Approval status

2. Provide approve/reject functionality
3. Require rejection reason when rejecting
4. Send appropriate notifications

**Seller Suspension:**

WHERE an administrator suspends a seller, THE system SHALL:

1. Display seller management list
2. Provide suspension button with reason field
3. Validate suspension reason (required)
4. Create seller suspension record
5. Hide seller products from search and category listings
6. Prevent new product creation and editing
7. Allow existing order processing (shipping, cancellation, refund)
8. Return success response

**Seller Unsuspension:**

WHERE an administrator unsuspends a seller, THE system SHALL:

1. Display suspended seller list
2. Provide unsuspension button
3. Remove seller suspension
4. Restore product visibility
5. Allow product creation and editing
6. Return success response

**Category Management:**

**Category Creation:**

WHERE an administrator creates a category, THE system SHALL:

1. Display category form with:
   - Name (required, 1-100 characters)
   - Description (optional, up to 500 characters)
   - Parent category (optional, for subcategories)

2. Validate name uniqueness
3. Create category record
4. Return success response

**Category Editing:**

WHERE an administrator edits a category, THE system SHALL:

1. Validate new name (1-100 characters)
2. Validate parent category (if selected)
3. Update category record
4. Return success response

**Category Deletion:**

WHERE an administrator deletes a category, THE system SHALL:

1. Check for products in category
2. Move products to parent category if exists
3. If no parent category, set products as uncategorized
4. Delete category record
5. Return success response

**Product Oversight:**

**Product Viewing:**

WHERE an administrator views products, THE system SHALL:

- Display all products on platform
- Show seller information
- Show product status
- Show stock availability
- Support search and filtering

**Product Snapshot Access:**

WHERE an administrator views product snapshots, THE system SHALL:

- Display complete snapshot history
- Show snapshot timestamp and modifier
- Show before and after values
- Support comparison between snapshots

**Product Deletion:**

WHERE an administrator deletes a product, THE system SHALL:

1. Validate administrative credentials
2. Create product snapshot marking deletion
3. Delete product record
4. Delete all variants and inventory records
5. Remove from search indexes
6. Return success response

**Order Oversight:**

**Order Viewing:**

WHERE an administrator views orders, THE system SHALL:

- Display all orders on platform
- Show customer information
- Show seller information
- Show order status and total
- Support search and filtering

**Force Cancellation:**

WHERE an administrator force-cancels an order item, THE system SHALL:

1. Validate administrative credentials
2. Update order item status to "cancelled"
3. Create positive inventory record
4. Create refund transaction
5. Return success response

**Force Refund:**

WHERE an administrator force-refunds an order item, THE system SHALL:

1. Validate administrative credentials
2. Update order item status to "refunded"
3. Create positive inventory record
4. Create refund transaction
5. Return success response

**User Management:**

**Customer Banning:**

WHERE an administrator bans a customer, THE system SHALL:

1. Validate administrative credentials
2. Update customer status to "banned"
3. Invalidate all active sessions
4. Return success response

**Customer Unbanning:**

WHERE an administrator unbans a customer, THE system SHALL:

1. Validate administrative credentials
2. Update customer status to "active"
3. Return success response

**Seller Banning:**

WHERE an administrator bans a seller, THE system SHALL:

1. Validate administrative credentials
2. Update seller status to "banned"
3. Invalidate all active sessions
4. Allow existing order processing
5. Return success response

**Report Functions:**

**Sales Reports:**

WHERE an administrator generates sales reports, THE system SHALL:

- Display total sales by date range
- Show sales by category
- Show sales by seller
- Support export to CSV/Excel

**User Reports:**

WHERE an administrator generates user reports, THE system SHALL:

- Display total users by type
- Show active users by date range
- Show banned users count
- Support export to CSV/Excel

## Business Rules and Validations

### Order Processing Rules

**Payment Timing:**

- Payment must succeed before order is created
- Payment failure prevents order creation
- Payment success triggers inventory reduction
- Cart cleared only upon successful payment

**Inventory Availability:**

- Stock must be available at cart addition time
- Stock must be available at order placement time
- Stock reduced upon successful order placement
- Stock restored upon cancellation or refund

**Variant Constraints:**

- Product must have at least one variant to be purchasable
- Products with no variants shown as "unavailable"
- Out of stock variants cannot be added to cart
- Variant price can override base price

### Seller Account Rules

**Account Deletion Constraints:**

- No pending orders (paid or shipped status)
- No pending cancellation requests
- No pending refund requests
- All constraints must be verified before deletion

**Product Deletion Constraints:**

- No pending order items for any variant
- No pending cancellation requests for any variant
- No pending refund requests for any variant
- All constraints must be verified before deletion

**Variant Deletion Constraints:**

- No pending order items for that variant
- No pending cancellation requests for that variant
- No pending refund requests for that variant
- Product must retain at least one variant
- All constraints must be verified before deletion

### Snapshot Requirements

**Mandatory Snapshots:**

- Product edits (all fields including images)
- Product variant edits (SKU code, option values, price)
- Seller profile edits (shop name, description, logo)
- Order item creation (product, variant, seller profile at time of purchase)
- Review edits (rating, text content)
- Cancellation request state changes (reason, status)
- Refund request state changes (reason, status)

**Snapshot Content:**

- Complete data state at time of snapshot
- Timestamp and modifier information
- Before and after values for audit trail
- Immutable storage (no deletion or modification allowed)

## Implementation Notes

### Technology Stack

- **Backend Framework**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **File Storage**: Cloud storage (AWS S3, Cloudinary)
- **Email Service**: SendGrid, Mailgun, or AWS SES
- **Payment Integration**: External payment gateway API
- **Caching**: Redis for session management and caching

### Security Considerations

- All authentication traffic must use HTTPS
- Password hashing with bcrypt cost factor 12
- JWT token expiration and refresh mechanisms
- Rate limiting on authentication endpoints
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- XSS prevention with output encoding
- CSRF protection for state-changing operations

### Performance Optimization

- Database indexing on frequently queried fields
- Pagination for list endpoints
- Caching for frequently accessed data
- Lazy loading for large image collections
- Optimistic concurrency control for inventory updates

This requirements specification provides comprehensive coverage of all functional requirements, business rules, and validation constraints for the E-Commerce Shopping Mall Platform. The specification is implementation-ready for backend development using TypeScript, NestJS, and Prisma ORM.