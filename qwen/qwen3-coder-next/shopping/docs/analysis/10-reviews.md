# E-Commerce Shopping Mall Platform Requirements Specification

## Service Overview

### Business Vision

This is a comprehensive e-commerce shopping mall platform that connects customers with sellers in a secure, scalable environment. The platform enables customers to browse products, make purchases, and leave reviews while providing sellers with tools to manage their inventory, process orders, and grow their business.

The platform emphasizes trust, transparency, and reliability through features like:
- Comprehensive review and rating system
- Immutable snapshot principle for all business-critical data changes
- Complete order tracking and shipping visibility
- Dispute resolution mechanisms through detailed transaction history

### Market Position

This platform competes in the multi-vendor e-commerce space by offering:
- Rich feature set comparable to major platforms
- Flexible seller onboarding with approval workflows
- Advanced inventory and order management
- Robust administrative oversight

### Target Users

**Customers**: Individual shoppers looking for products from various sellers
**Sellers**: Businesses and individuals wanting to sell products on the platform
**Administrators**: Platform operators managing sellers, categories, and platform policies

### Core Features

- Multi-vendor marketplace with seller onboarding
- Product catalog with variants, inventory, and images
- Shopping cart and checkout flow
- Payment processing integration
- Order tracking and shipping management
- Customer review and rating system
- Wishlist functionality
- Advanced search and filtering
- Comprehensive administrator controls

### Business Model

The platform operates as a marketplace where sellers list products and pay fees based on sales volume. Revenue is generated through:
- Commission fees on successful transactions
- Seller subscription tiers for premium features
- Featured product listings and advertising

### Success Metrics

- Number of active sellers
- Total gross merchandise value (GMV)
- Customer retention rate
- Review submission rate
- Order completion rate
- Average response time for sellers

## User Actors

### Customer

Customers are individuals who register with the platform to browse and purchase products. They have the following capabilities:

**Authentication and Account Management**
- Register with email and password
- Log in to their account
- Change their password
- Edit their display name and phone number
- Delete their account (preserving order history and reviews)

**Shopping Experience**
- Browse products by category or search
- View product details including variants, images, and specifications
- Add products to their wishlist
- Add product variants to their shopping cart
- Manage cart items (change quantity, remove items)
- Complete checkout with shipping address selection
- View order history and tracking information
- Request order item cancellations
- Request order item refunds
- Write reviews for purchased products
- Edit and delete their own reviews

**Access Restrictions**
- Cannot browse without registration (no guest access)
- Cannot view other customers' private information
- Cannot manage products or orders for other sellers

### Seller

Sellers are businesses or individuals who register to sell products on the platform. They must be approved by administrators before listing products.

**Registration and Approval Process**
- Register with email and password
- Submit shop information (name, description, logo)
- Wait for administrator approval
- View approval status and rejection reasons if applicable
- Resubmit registration if initially rejected

**Account Management**
- Log in to their account
- Change their password
- Edit shop name, description, and logo (creating snapshots)
- View inventory levels and history
- Manage products, variants, and inventory
- Process orders and handle cancellations/refunds
- Delete their account (only when no pending orders exist)

**Product Management**
- Create new products with variants
- Edit existing products (creating snapshots)
- Upload and manage product images
- Add and remove inventory
- Delete products (only when no pending orders exist)
- View product snapshots

**Order Management**
- View order items for their products
- Filter order items by status
- Process cancellations and refunds
- Create shipments with tracking information
- Update order item statuses

**Access Restrictions**
- Cannot access other sellers' accounts or data
- Cannot modify products from other sellers
- Cannot access administrative functions

### Administrator

Administrators are platform operators with oversight capabilities to maintain platform integrity and enforce policies.

**Seller Management**
- Approve or reject new seller registrations
- View seller approval status
- Suspend or unsuspend seller accounts
- View all seller accounts and products

**Category Management**
- Create, edit, and delete categories
- Manage category hierarchy (one level of subcategories)
- Assign products to categories

**Product Oversight**
- View all products on the platform
- View all product snapshots
- Delete any product (for policy violations)
- Hide products from public view

**Order Oversight**
- View all orders across the platform
- Force-cancel orders and items
- Force-refund orders and items
- View order details and history

**User Management**
- View all customer accounts
- Ban or unban customer accounts
- View all seller accounts
- Ban or unban seller accounts

**Review Moderation**
- View all reviews across the platform
- Flag inappropriate reviews
- Delete reviews that violate platform policies

### Super Administrator

Super administrators have elevated privileges including the ability to manage other administrators.

**Administrator Management**
- Promote regular administrators to super administrator
- Demote other super administrators to regular administrator (except themselves)
- View all administrator requests and actions

**Platform Configuration**
- Configure system-wide settings
- Manage platform policies and rules
- Oversee all platform operations

## Authentication System

### Registration Process

**Customer Registration**
WHEN a customer registers, THE system SHALL:
1. Collect email address and password
2. Validate email format and password strength
3. Create a new customer account with status "active"
4. Generate a confirmation token (optional, for email verification)
5. Store password hashed using industry-standard encryption

IF registration fails validation, THEN THE system SHALL:
1. Return appropriate error messages for each validation failure
2. Preserve entered data for correction
3. Provide clear guidance on password requirements

**Seller Registration**
WHEN a seller registers, THE system SHALL:
1. Collect email address and password
2. Validate email format and password strength
3. Create a seller account with status "pending_approval"
4. Store password hashed using industry-standard encryption
5. Require submission of shop information (name, description, logo)
6. Send notification to administrators for approval review

WHEN a seller submits shop information, THE system SHALL:
1. Validate shop name uniqueness
2. Validate shop description length
3. Accept and store logo image files
4. Link shop information to seller account

IF a seller registration is rejected, THEN THE system SHALL:
1. Store rejection reason provided by administrator
2. Allow seller to view rejection reason
3. Enable seller to resubmit registration with modifications

**Administrator Registration**
WHEN a user wants to become an administrator, THE system SHALL:
1. Allow any user to submit an administrator request
2. Collect request reason and background information
3. Store request with status "pending"
4. Notify super administrators of new request

### Login Flow

WHEN a user logs in, THE system SHALL:
1. Accept email and password credentials
2. Verify credentials against stored hashed password
3. Check account status (active, suspended, banned)
4. Generate authentication tokens (access and refresh)
5. Set appropriate session cookies

IF login fails, THEN THE system SHALL:
1. Return appropriate error code (invalid credentials, account suspended, account banned)
2. Log failed login attempts for security monitoring
3. Implement rate limiting for repeated failures

### Session Management

WHILE a session is active, THE system SHALL:
1. Validate authentication tokens on each request
2. Refresh tokens before expiration
3. Track active sessions per user
4. Allow users to view and terminate active sessions

WHEN a session expires, THE system SHALL:
1. Return appropriate error for subsequent requests
2. Require re-authentication for new requests
3. Allow automatic session renewal using refresh tokens

### Password Management

WHEN a user requests a password change, THE system SHALL:
1. Verify current password (for authenticated changes)
2. Validate new password meets security requirements
3. Store new password with updated hash
4. Invalidate existing sessions after password change (optional security)

WHEN a user requests a password reset, THE system SHALL:
1. Validate user identity through email verification
2. Generate temporary password reset token
3. Allow password change with new token
4. Invalidate token after use for security

### Security Requirements

WHILE handling authentication, THE system SHALL:
1. Use industry-standard password hashing (bcrypt, argon2)
2. Implement HTTPS for all authentication endpoints
3. Store authentication tokens securely
4. Implement rate limiting for login attempts
5. Log security-relevant events for audit purposes

### Token Management

**Access Tokens**
- Short-lived tokens for API authentication
- Include user ID, role, and permissions
- Validate on each API request
- Expires after 15-30 minutes

**Refresh Tokens**
- Longer-lived tokens for session renewal
- Stored securely on client
- Revoked on password change or manual logout
- Expires after 7-30 days

**Token Revocation**
WHEN a user logs out, THE system SHALL:
1. Invalidate current session tokens
2. Remove session from active session store
3. Prevent token reuse until expiration

WHEN an administrator bans a user, THE system SHALL:
1. Immediately invalidate all active sessions
2. Block new authentication attempts
3. Log security action for audit

## Product Management

### Product Creation

WHEN a seller creates a product, THE system SHALL:
1. Collect product details (name, description, category, base price)
2. Validate required fields are present and valid
3. Create the product with status "active"
4. Assign ownership to the creating seller
5. Initialize inventory for any variants created

WHILE creating a product, THE system SHALL:
1. Require product name (minimum 3 characters, maximum 200)
2. Require product description (minimum 10 characters, maximum 5000)
3. Require category selection (from valid categories)
4. Require base price (positive decimal value)
5. Allow optional images upload during creation
6. Allow variant creation during product creation

IF product creation fails validation, THEN THE system SHALL:
1. Return specific error messages for each validation failure
2. Preserve entered data for correction
3. Provide clear guidance on requirements

### Product Editing

WHEN a seller edits a product, THE system SHALL:
1. Verify ownership or administrative privileges
2. Create a product snapshot preserving previous state
3. Update the product with new information
4. Update modification timestamp
5. Return success confirmation

WHILE editing a product, THE system SHALL:
1. Allow modification of name, description, category, base price
2. Allow addition/removal of product images
3. Allow modification of product variants
4. Validate all changes against same rules as creation
5. Create snapshot before applying changes

IF product deletion fails validation, THEN THE system SHALL:
1. Return appropriate error codes
2. Show specific error messages for validation failures
3. Preserve existing product if changes fail

### Product Images

WHEN a seller uploads images for a product, THE system SHALL:
1. Accept image files in standard formats (JPEG, PNG, WEBP)
2. Validate image size and dimensions
3. Store images in appropriate storage system
4. Associate images with the product
5. Set first uploaded image as main thumbnail

WHEN a seller reorders product images, THE system SHALL:
1. Allow dragging/dropping image order
2. Update main thumbnail to first image in order
3. Preserve all images in their new sequence

WHEN a seller deletes a product image, THE system SHALL:
1. Verify ownership or administrative privileges
2. Remove image from product association
3. Delete image file from storage
4. Update main thumbnail if deleted image was primary
5. Create product snapshot preserving image order

### Product Variants (SKU)

WHEN a seller adds variants to a product, THE system SHALL:
1. Collect variant options (color, size, etc.)
2. Assign unique SKU code for each variant
3. Set initial stock quantity (minimum 0)
4. Allow optional price override per variant
5. Validate SKU code uniqueness

WHEN a seller edits a product variant, THE system SHALL:
1. Verify ownership or administrative privileges
2. Create a variant snapshot preserving previous state
3. Update variant with new information
4. Update modification timestamp
5. Validate SKU code uniqueness

WHEN a seller deletes a product variant, THE system SHALL:
1. Verify no pending order items exist for the variant
2. Verify no pending cancellation or refund requests
3. Delete inventory records for the variant
4. Remove variant from product
5. Create variant snapshot preserving deletion state

### Categories and Subcategories

**Category Structure**
- Categories can have exactly one level of subcategories
- Parent category must exist before subcategory creation
- Subcategory inherits parent category's position in hierarchy
- Products can be assigned to any category or subcategory

**Category Management**
WHEN an administrator creates a category, THE system SHALL:
1. Collect category name (unique, required)
2. Collect category description
3. Validate name uniqueness and format
4. Allow optional parent category selection
5. Create category with "active" status

WHEN an administrator edits a category, THE system SHALL:
1. Verify administrative privileges
2. Allow modification of name and description
3. Prevent changing parent category if subcategories exist
4. Create category snapshot preserving previous state
5. Update modification timestamp

WHEN an administrator deletes a category, THE system SHALL:
1. Verify no subcategories exist (must delete subcategories first)
2. Move products in deleted category to "uncategorized"
3. Create category snapshot preserving deletion state
4. Update product category references

## Inventory Management

### Stock Tracking

WHILE tracking inventory, THE system SHALL:
1. Maintain current stock quantity for each variant
2. Calculate current stock by summing all inventory history records
3. Update stock when orders are placed or cancelled
4. Update stock when inventory adjustments are made
5. Show "out of stock" when quantity is zero or negative

WHEN a variant's stock is modified, THE system SHALL:
1. Create an inventory history record with quantity change
2. Include reason for the change
3. Record timestamp of the change
4. Update current stock quantity
5. Log the action for audit purposes

### Inventory History

**History Record Structure**
- Type: Positive for restocking, negative for reductions
- Quantity: Absolute value of change
- Reason: Business justification (order, adjustment, etc.)
- Timestamp: When the change occurred
- Reference: Link to related order or adjustment record

**History Requirements**
WHILE recording inventory history, THE system SHALL:
1. Capture all stock changes regardless of source
2. Include complete metadata for each transaction
3. Maintain immutable history records
4. Support historical stock reconstruction
5. Allow inventory traceability

### Stock Adjustments

WHEN a seller performs an inventory adjustment, THE system SHALL:
1. Collect adjustment quantity and reason
2. Validate adjustment reason is provided
3. Create inventory history record
4. Update current stock quantity
5. Log the adjustment for audit purposes

ADJUSTMENT TYPES:
- Restocking: Positive quantity change
- Loss/Write-off: Negative quantity change
- Correction: Adjust for inventory system discrepancies

### Restocking Process

WHEN a seller restocks a variant, THE system SHALL:
1. Collect quantity to add and restock reason
2. Validate quantity is positive
3. Create inventory history record with positive quantity
4. Update current stock quantity
5. Update product availability if stock was previously zero

### Low Stock Management

WHERE stock quantity drops below threshold, THE system SHALL:
1. Mark variant as "low stock" in interface
2. Alert seller through dashboard notifications
3. Continue to allow purchases until zero stock
4. No automatic order restriction at low stock levels

### Out of Stock Handling

WHERE a variant reaches zero stock, THE system SHALL:
1. Mark variant as "out of stock"
2. Prevent addition to cart by customers
3. Show availability status on product pages
4. Allow cart validation warnings for existing cart items

## Order Processing

### Shopping Cart

**Cart Item Management**
WHEN a customer adds a variant to their cart, THE system SHALL:
1. Validate customer is authenticated
2. Validate variant exists and is available
3. Validate stock quantity is sufficient
4. If variant already in cart, combine quantities
5. If variant not in cart, create new cart item
6. Validate cart does not exceed maximum item count

WHEN a customer changes cart item quantity, THE system SHALL:
1. Validate customer owns the cart item
2. Validate new quantity is positive
3. Validate stock quantity is sufficient for new quantity
4. Update cart item quantity
5. Show warning if quantity exceeds available stock

WHEN a customer removes an item from cart, THE system SHALL:
1. Validate customer owns the cart item
2. Remove cart item from customer's cart
3. Update cart totals

**Cart Validation**
WHEN a customer views their cart, THE system SHALL:
1. Show all cart items with product details
2. Display variant options and prices
3. Calculate and show subtotal for each item
4. Calculate and show cart total
5. Show stock availability warnings
6. Show unavailable items as marked

WHEN a cart item becomes unavailable, THE system SHALL:
1. Mark the item as unavailable in cart
2. Show appropriate error message to customer
3. Prevent checkout of unavailable items
4. Allow customer to remove unavailable items

### Checkout Process

WHEN a customer proceeds to checkout, THE system SHALL:
1. Validate customer has items in cart
2. Validate at least one cart item is available
3. Show shipping address selection
4. Allow use of default shipping address
5. Show order summary with items and totals
6. Require shipping address confirmation

WHEN a customer selects shipping address, THE system SHALL:
1. Allow selection from saved addresses
2. Allow use of default shipping address
3. Allow creation of new shipping address
4. Validate address fields are complete
5. Set selected address as shipping address for order

WHEN a customer confirms order, THE system SHALL:
1. Validate payment method is available
2. Initiate payment processing
3. Show order confirmation message
4. Clear cart after successful order
5. Send order confirmation notification

### Order Creation

WHEN payment processing succeeds, THE system SHALL:
1. Create order record with status "paid"
2. Create order items for each cart item
3. Reduce stock quantities for purchased variants
4. Clear customer cart
5. Generate order confirmation number
6. Send order confirmation notification

WHILE creating an order item, THE system SHALL:
1. Snapshot product name and description
2. Snapshot variant options and price
3. Snapshot seller profile information
4. Set order item status to "paid"
5. Link order item to order and product

**Order Item Structure**
- Order reference
- Product variant reference
- Quantity purchased
- Price at time of purchase (snapshot)
- Seller profile reference (snapshot)
- Initial status: "paid"

### Payment Processing

**Payment Gateway Integration**
WHEN a customer initiates payment, THE system SHALL:
1. Generate payment request with order details
2. Send request to integrated payment gateway
3. Wait for payment response
4. Handle success or failure response

**Payment Status Management**
- Payment initiated: Payment processing started
- Payment successful: Payment confirmed by gateway
- Payment failed: Payment rejected by gateway
- Payment refunded: Full or partial refund processed

**Payment Failure Handling**
IF payment processing fails, THEN THE system SHALL:
1. Return to cart with error message
2. Allow customer to retry payment
3. Allow customer to modify order before retry
4. Log payment failure for monitoring

### Order Status Management

**Order Item Statuses**
- Paid: Payment completed, waiting for shipment
- Shipped: Item has been shipped by seller
- Delivered: Item has been delivered to customer
- Cancelled: Item was cancelled by seller or administrator
- Refunded: Item was refunded to customer

**Order Status Calculation**
WHILE calculating overall order status, THE system SHALL:
1. If all items are cancelled → "cancelled"
2. If all items are refunded → "refunded"
3. If any item is shipped (and none delivered) → "shipped"
4. If all items are delivered → "delivered"
5. If mixed status → "partially completed"
6. Otherwise → "paid"

**Status Transitions**
- Paid → Shipped: When seller creates shipment
- Shipped → Delivered: When customer confirms or 14 days pass
- Paid → Cancelled: When cancellation is approved
- Delivered → Refunded: When refund is approved
- Any → Cancelled/Refunded: By administrator action

### Order History

WHEN a customer views order history, THE system SHALL:
1. Show all orders for the customer
2. Sort by newest first
3. Paginate results (10 per page)
4. Show order summary (number, date, total, status)
5. Allow navigation to order details

WHEN a customer views order details, THE system SHALL:
1. Show order information (number, date, status)
2. Show list of order items with details
3. Show shipping address
4. Show shipment information and tracking
5. Show cancellation and refund options

**Order Data Preservation**
WHEN an order is completed, THE system SHALL:
1. Preserve all order data indefinitely
2. Keep snapshots of products and variants at time of purchase
3. Keep snapshots of seller profiles at time of purchase
4. Maintain order history for legal and audit purposes

## Shipping System

### Shipment Creation

WHEN a seller creates a shipment, THE system SHALL:
1. Select one or more of their order items for the shipment
2. Enter carrier name and tracking number
3. Create shipment record with selected items
4. Update order item statuses to "shipped"
5. Link tracking information to shipment

**Shipment Rules**
- One shipment can contain multiple order items from same seller
- Different sellers always create separate shipments
- Sellers can choose to ship items individually or in bundles
- Once created, shipment cannot be modified (tracking can be updated)

### Tracking Information

WHEN tracking information is entered, THE system SHALL:
1. Validate carrier name is provided
2. Validate tracking number format
3. Store tracking information with shipment
4. Provide tracking URL when available
5. Allow customer to view tracking information

**Tracking Updates**
WHEN tracking information changes, THE system SHALL:
1. Update tracking number and carrier
2. Log tracking update for audit
3. Update tracking URL if carrier provides one
4. Notify customer of tracking update (optional)

### Delivery Confirmation

**Customer Confirmation**
WHEN a customer confirms delivery, THE system SHALL:
1. Mark all items in the shipment as "delivered"
2. Update order status calculation
3. Enable review creation for delivered items
4. Log delivery confirmation timestamp

**Automatic Delivery**
WHERE delivery is not confirmed, THE system SHALL:
1. Automatically mark items as "delivered" after 14 days
2. Update order status calculation
3. Enable review creation for "delivered" items
4. Log automatic delivery confirmation

### Shipment Status

**Status Flow**
- Created: Shipment record created, items marked "shipped"
- In Transit: Item in carrier's possession
- Out for Delivery: Item near destination
- Delivered: Item delivered to customer
- Returned: Item returned to seller

**Status Management**
- Sellers cannot update shipment status beyond "shipped"
- Customers confirm delivery
- Automatic status updates after time period

### Order Cancellation

**Customer Cancellation Request**
WHEN a customer requests cancellation, THE system SHALL:
1. Only allow cancellation for items with status "paid"
2. Require cancellation reason
3. Create cancellation request record
4. Set request status to "pending"
5. Notify seller of cancellation request

**Seller Response**
WHEN a seller responds to cancellation, THE system SHALL:
1. Approve or reject the cancellation request
2. Create snapshot of request state
3. If approved:
   - Update item status to "cancelled"
   - Restore stock quantity
   - Initiate refund process
   - Update order status calculation
4. If rejected:
   - Keep item status unchanged
   - Notify customer of rejection

**Cancellation Rules**
- Cancellation is per order item, not per entire order
- Cancelled items can be refunded if payment was processed
- Remaining order items continue processing normally
- If all items cancelled, order status becomes "cancelled"

### Order Refunds

**Customer Refund Request**
WHEN a customer requests a refund, THE system SHALL:
1. Only allow refund for items with status "delivered"
2. Require refund reason
3. Only allow within 7 days of delivery
4. Create refund request record
5. Set request status to "pending"
6. Notify seller of refund request

**Seller Response**
WHEN a seller responds to refund, THE system SHALL:
1. Approve or reject the refund request
2. Create snapshot of request state
3. If approved:
   - Update item status to "refunded"
   - Restore stock quantity
   - Process refund transaction
   - Update order status calculation
4. If rejected:
   - Keep item status unchanged
   - Notify customer of rejection

**Refund Rules**
- Refund is per order item, not per entire order
- Refunded items restore stock quantities
- Remaining order items continue normally
- If all items refunded, order status becomes "refunded"

## Payment Integration

### Payment Gateway Integration

**Gateway Requirements**
WHILE integrating payment gateway, THE system SHALL:
1. Support major payment methods (credit cards, digital wallets)
2. Implement PCI compliance standards
3. Securely handle payment tokenization
4. Provide real-time payment verification
5. Support refund processing

**Payment Flow**
1. Customer initiates payment from checkout
2. System generates payment request with order details
3. Customer is redirected to payment gateway
4. Customer completes payment on gateway
5. Gateway sends payment confirmation to system
6. System processes order upon successful payment

### Refund Processing

WHEN a refund is processed, THE system SHALL:
1. Initiate refund through payment gateway
2. Validate refund amount (cannot exceed original payment)
3. Update order item status to "refunded"
4. Restore stock quantity for item
5. Create refund record with timestamp and amount
6. Update order status calculation

**Partial Refunds**
- System supports partial refunds per item
- Track total refunded amount per order item
- Prevent refund amount from exceeding original payment

## Review System

### Review Creation

**Eligibility Requirements**
WHEN a customer attempts to write a review, THE system SHALL:
1. Verify customer is authenticated
2. Verify customer has purchased the product (delivered order item)
3. Verify customer has not already reviewed this product
4. If any requirement fails, deny review submission

**Review Content Requirements**
WHILE a customer writes a review, THE system SHALL:
1. Require rating (integer 1-5)
2. Allow optional review text (0-2000 characters)
3. Validate rating is integer between 1-5
4. Validate text does not exceed 2000 characters
5. Validate text is not purely profanity or spam

**Review Submission**
WHEN a customer submits a review, THE system SHALL:
1. Validate all requirements are met
2. Create review record with rating and text
3. Link review to specific order item
4. Set review status to "active"
5. Update product's average rating
6. Return success confirmation

### Review Editing

WHEN a customer edits a review, THE system SHALL:
1. Verify ownership of the review
2. Validate new content meets same requirements as creation
3. Create review snapshot preserving previous state
4. Update review with new content
5. Update "last modified" timestamp
6. Return success confirmation

### Review Deletion

WHEN a customer deletes a review, THE system SHALL:
1. Verify ownership of the review
2. Mark review as "deleted" (soft delete)
3. Create review snapshot preserving deletion state
4. Update product's average rating
5. Keep review record for audit purposes
6. Return success confirmation

### Rating System

**Rating Calculation**
WHILE calculating a product's average rating, THE system SHALL:
1. Include only non-deleted reviews
2. Calculate arithmetic mean of all valid ratings
3. Round to one decimal place
4. Handle edge case of zero valid reviews (return 0.0)

**Rating Display**
WHILE displaying product information, THE system SHALL:
1. Show average rating as star indicators (1-5 stars)
2. Show total count of non-deleted reviews
3. Display average rating to one decimal place
4. Show "No reviews yet" when count is 0

### Review Moderation

**Content Screening**
WHEN a review is submitted, THE system SHALL:
1. Check for prohibited content (explicit language, hate speech, spam)
2. Flag reviews with prohibited content for administrator review
3. Display flagged reviews with "Pending Review" indicator
4. Allow administrators to approve or reject flagged reviews

**Administrator Actions**
WHEN an administrator reviews a flagged review, THE system SHALL:
1. Allow approval (review becomes public)
2. Allow rejection (review is hidden)
3. Allow deletion (review is permanently hidden)
4. Log all administrative actions for audit

**User Reporting**
WHEN a customer reports a review, THE system SHALL:
1. Queue reported review for administrator review
2. Hide reported review from public view while pending
3. Notify administrators of report
4. Allow customer to view report status

## Administrator System

### Seller Management

**Seller Approval**
WHEN an administrator reviews a seller application, THE system SHALL:
1. View seller application details
2. Approve or reject the application
3. If approved:
   - Update seller status to "approved"
   - Enable seller to create products
   - Send notification to seller
4. If rejected:
   - Update seller status to "rejected"
   - Store rejection reason (required)
   - Send notification to seller with rejection reason

**Seller Suspension**
WHEN an administrator suspends a seller, THE system SHALL:
1. Update seller status to "suspended"
2. Hide all seller's products from search and listings
3. Prevent seller from creating or editing products
4. Allow seller to continue processing existing orders
5. Send notification to seller of suspension

**Seller Unsuspension**
WHEN an administrator unsuspends a seller, THE system SHALL:
1. Update seller status to "approved"
3. Restore seller's products to search and listings
4. Enable seller to create and edit products
5. Send notification to seller of unsuspension

### Category Management

**Category Creation**
WHEN an administrator creates a category, THE system SHALL:
1. Collect category name and description
2. Allow optional parent category selection
3. Validate category name uniqueness
4. Create category with "active" status
5. Update category hierarchy

**Category Editing**
WHEN an administrator edits a category, THE system SHALL:
1. Verify administrative privileges
2. Allow modification of name and description
3. Prevent changing parent if subcategories exist
4. Create category snapshot preserving previous state
5. Update modification timestamp

**Category Deletion**
WHEN an administrator deletes a category, THE system SHALL:
1. Verify no subcategories exist
2. Move products to "uncategorized"
3. Create category snapshot preserving deletion state
4. Update product category references

### Product Oversight

**Product Viewing**
WHEN an administrator views products, THE system SHALL:
1. Show all products on the platform
2. Filter by seller, category, or status
3. Search products by name or description
4. Sort by various criteria (date, stock, rating)

**Product Deletion**
WHEN an administrator deletes a product, THE system SHALL:
1. Verify administrative privileges
2. Delete product and all variants
3. Delete all inventory records
4. Remove from search index
5. Preserve order history and snapshots

**Snapshot Viewing**
WHEN an administrator views product snapshots, THE system SHALL:
1. Show all snapshots for the product
2. Display snapshot creation timestamp
3. Show product state at time of snapshot
4. Enable comparison between snapshots

### Order Oversight

**Order Viewing**
WHEN an administrator views orders, THE system SHALL:
1. Show all orders across the platform
2. Filter by customer, seller, or status
3. Search orders by order number or customer
4. View order details and history

**Order Cancellation**
WHEN an administrator force-cancels an order, THE system SHALL:
1. Cancel selected order items or entire order
2. Process refunds for paid items
3. Restore stock quantities
4. Update order status calculation
5. Log administrative action

**Order Refunding**
WHEN an administrator force-refunds an order, THE system SHALL:
1. Refund selected order items or entire order
2. Initiate refund transaction
3. Update order item status to "refunded"
4. Restore stock quantities
5. Update order status calculation

### User Management

**Customer Ban**
WHEN an administrator bans a customer, THE system SHALL:
1. Update customer status to "banned"
2. Invalidate all active sessions
3. Block future authentication attempts
4. Preserve customer data for audit
5. Log administrative action

**Customer Unban**
WHEN an administrator unbans a customer, THE system SHALL:
1. Update customer status to "active"
2. Restore authentication capability
3. Allow normal platform usage
4. Log administrative action

**Seller Ban**
WHEN an administrator bans a seller, THE system SHALL:
1. Update seller status to "banned"
2. Invalidate all active sessions
3. Block future authentication attempts
4. Hide seller's products from public view
5. Allow seller to continue processing existing orders

**Seller Unban**
WHEN an administrator unbans a seller, THE system SHALL:
1. Update seller status to "approved"
2. Restore authentication capability
3. Restore product visibility
4. Allow normal platform usage

## Snapshot Principle

### Snapshot Requirements

**Data Protection**
WHEN editable data is modified, THE system SHALL:
1. Create a snapshot preserving previous state
2. Record timestamp of modification
3. Identify modifier (user or system)
4. Preserve snapshot data immutably
5. Enable historical reconstruction

**Snapshot Storage**
- Snapshots are immutable and cannot be deleted
- All snapshots are preserved indefinitely
- Snapshots support audit and dispute resolution
- Snapshots can be viewed by relevant parties

### Product Snapshots

**Snapshot Content**
WHEN a product is edited or deleted, THE system SHALL create a snapshot with:
1. Product name and description at time of snapshot
2. Category reference at time of snapshot
3. Base price at time of snapshot
4. All images at time of snapshot
5. All variants at time of snapshot
6. Snapshot timestamp
7. Modifier reference

**Product-Snapshot-SKU Structure**
Each product snapshot includes all variant snapshots:
1. Variant SKU code at time of snapshot
2. Variant option values at time of snapshot
3. Variant price at time of snapshot
4. Variant stock quantity at time of snapshot

### Order Snapshots

**Snapshot Content**
WHEN an order is placed, THE system SHALL create snapshots with:
1. Product name and description at time of purchase
2. Variant options and price at time of purchase
3. Seller profile name and logo at time of purchase
4. Order item quantity and price at time of purchase
5. Snapshot timestamp
6. Order reference

### Seller Profile Snapshots

**Snapshot Content**
WHEN a seller profile is edited, THE system SHALL create a snapshot with:
1. Shop name at time of snapshot
2. Shop description at time of snapshot
3. Shop logo at time of snapshot
4. Snapshot timestamp
5. Modifier reference

### Review Snapshots

**Snapshot Content**
WHEN a review is edited or the customer account is deleted, THE system SHALL create a snapshot with:
1. Rating value at time of snapshot
2. Review text at time of snapshot
3. Snapshot timestamp
4. Modifier reference
5. Original review ID

### Cancellation and Refund Snapshots

**Request Snapshots**
WHEN a cancellation or refund request is modified, THE system SHALL create a snapshot with:
1. Request status at time of snapshot
2. Request reason at time of snapshot
3. Response status and reason (if applicable)
4. Snapshot timestamp
5. Modifier reference

## Business Rules Summary

### Account Management Rules
1. Customer accounts cannot be deleted if pending orders exist
2. Seller accounts require approval before selling
3. Seller accounts can only be deleted when no pending orders exist
4. Account deletions preserve order history and reviews

### Product Management Rules
1. Products can only be deleted when no pending orders exist
2. Variants can only be deleted when no pending orders exist
3. Every product must have at least one variant to be purchasable
4. All product edits create snapshots
5. Deleted products remain in order history but not in listings

### Inventory Rules
1. Stock is calculated from inventory history records
2. Order placement reduces stock automatically
3. Order cancellation/refund restores stock automatically
4. Out of stock variants cannot be purchased
5. All stock changes are recorded in history

### Order Rules
1. Orders can only be cancelled for paid items (not shipped)
2. Refunds can only be requested within 7 days of delivery
3. Cancellation and refund are per item, not per order
4. Order snapshots preserve product state at time of purchase
5. All order items are individually manageable

### Shipping Rules
1. Shipment can contain multiple items from same seller
2. Delivery is confirmed by customer or automatic after 14 days
3. Tracking information is linked to shipments, not individual items
4. All shipments have tracking information

### Review Rules
1. Reviews can only be written for delivered products
2. One review per customer per product
3. Reviews can be edited or deleted by customer
4. Review ratings affect product average ratings
5. Admin moderation for inappropriate content

### Payment Rules
1. Payment processing must be completed before order creation
2. Refunds cannot exceed original payment amount
3. All payments are processed through integrated gateway
4. Payment failures do not create orders

### Administrator Rules
1. Sellers require approval before listing products
2. Administrators can suspend sellers without affecting existing orders
3. All administrator actions are logged for audit
4. Product deletion by admin preserves order history
5. User banning invalidates all active sessions

## Acceptance Criteria

### Functional Success
- 99% of registered users can successfully log in
- 95% of product searches return relevant results within 2 seconds
- 99% of reviews are processed within 5 seconds
- 99.9% of order snapshots are created correctly
- All validation rules enforced with appropriate error messages

### Performance Requirements
- Page load time under 2 seconds for standard pages
- Search results returned within 2 seconds
- Review submission processed within 5 seconds
- Inventory updates reflected within 1 second
- Snapshot creation completed within 2 seconds

### Data Integrity Requirements
- All transactions are atomic and consistent
- Snapshots are immutable and non-deletable
- Inventory calculations are accurate and up-to-date
- Order history is complete and tamper-proof
- User data privacy is maintained

### Security Requirements
- All authentication endpoints use HTTPS
- Passwords are hashed using industry standards
- API rate limiting prevents abuse
- Sensitive data is encrypted at rest and in transit
- Administrative actions are logged and auditable

## Implementation Notes

### Technical Architecture
- Backend: TypeScript + NestJS + Prisma ORM
- Database: PostgreSQL for relational data and JSON storage
- Authentication: JWT tokens with refresh rotation
- File Storage: Cloud storage for product images and documents
- Search: Elasticsearch for product search and filtering

### Domain Model
- Customers, Sellers, Administrators as user types
- Products with variants and inventory
- Orders with order items and shipments
- Reviews with ratings and snapshots
- Categories with hierarchy

### Key Domain Events
- Customer registered, logged in, account deleted
- Seller registered, approved, suspended, account deleted
- Product created, edited, deleted, variant added/edited/deleted
- Order placed, payment successful/failed, item shipped/delivered
- Review created, edited, deleted, reported
- Inventory adjusted, restocked, reduced

### Data Persistence
- All business-critical data has immutable snapshots
- Deleted records preserved in snapshots for audit
- Order data preserved indefinitely for legal compliance
- User data preserved according to retention policies

This requirements specification provides the foundation for the e-commerce shopping mall platform implementation. All subsystems are designed to work together while maintaining data integrity, security, and user experience quality.