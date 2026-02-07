# Seller Requirements Specification

## Business Overview

This document defines the comprehensive requirements for seller account management in the e-commerce shopping mall platform. Sellers are business users who create products, manage inventory, and interact with customers through the platform. The system must support a complete seller lifecycle from registration through ongoing shop management.

## Seller Account Lifecycle

### Registration and Approval Process

Sellers must complete a multi-step registration process that includes verification and approval by administrators before they can begin selling. This ensures platform quality and protects both buyers and legitimate sellers.

#### Registration Requirements

WHEN a prospective seller submits a registration request, THE system SHALL collect the following information:
- Email address (used as login credential)
- Password (following security requirements)
- Shop name (business name or brand identifier)
- Shop description (text describing the business and products)
- Logo image (business branding asset)

WHEN a seller completes registration submission, THE system SHALL create an account with status "pending" and require administrator approval.

#### Approval Workflow

WHILE a seller account has status "pending", THE system SHALL prevent the seller from accessing seller features including product creation and order management.

WHEN an administrator reviews a pending seller application, THE system SHALL allow the administrator to either approve or reject the application.

IF an application is rejected, THEN THE system SHALL require the administrator to provide a rejection reason and THE system SHALL update the seller account status to "rejected".

IF a seller receives a rejection notification, THEN THE system SHALL allow the seller to submit a new registration request with updated information.

WHEN a seller submits a new registration request after rejection, THE system SHALL create a new application with status "pending" and maintain the rejection history for audit purposes.

WHEN an administrator approves a seller application, THE system SHALL update the account status to "approved" and THE system SHALL notify the seller via email.

#### Account Status Types

THE system SHALL support the following seller account statuses:
- "pending": Registration submitted, awaiting administrator review
- "approved": Application approved, seller can access all features
- "rejected": Application rejected, seller cannot sell but can reapply
- "suspended": Account temporarily disabled by administrator

#### Account Deletion Requirements

A seller can only delete their account if all of the following conditions are met:
- No pending orders with status "paid" or "shipped"
- No pending cancellation requests
- No pending refund requests

WHEN a seller attempts to delete their account, THE system SHALL validate all conditions above and ONLY proceed if all conditions are satisfied.

IF conditions are not met, THEN THE system SHALL return specific error information about which conditions remain unmet.

WHEN a seller account is deleted, THE system SHALL preserve historical data for legal and business continuity requirements:
- Order history and order snapshots are retained
- Product listings are removed from active catalog
- Shop name is preserved in historical order records
- All audit trails remain intact

### Login and Authentication

WHEN a seller attempts to log in, THE system SHALL authenticate using email and password credentials.

IF authentication fails, THEN THE system SHALL return appropriate error without revealing whether email or password was incorrect.

WHEN a seller successfully logs in, THE system SHALL create a session and THE system SHALL grant access to seller dashboard and features.

## Shop Profile Management

### Profile Information

Each seller has a shop profile consisting of the following elements:
- Shop name (required, displayed to customers)
- Shop description (optional text area for business overview)
- Logo image (business branding, can be updated)

WHEN a seller creates their profile, THE system SHALL require a shop name and store the created timestamp.

WHEN a seller updates their profile information, THE system SHALL create a profile snapshot preserving the previous state.

### Profile Snapshots

WHEN a seller modifies any profile attribute (shop name, description, logo), THE system SHALL create a profile snapshot that includes:
- Timestamp of the change
- Previous values of all modified attributes
- New values of all modified attributes
- User ID of the seller making the change
- Administrator who approved the change (if applicable)

WHEN a seller views their profile history, THE system SHALL display all snapshots in reverse chronological order with the most recent first.

WHEN a customer views a seller's profile from a product listing, THE system SHALL display the current active profile values.

#### Profile Visibility

WHEN a customer views a seller's shop page, THE system SHALL display:
- Current shop name as primary identifier
- Current shop description (if provided)
- Current logo image
- Date the shop profile was created

WHEN a seller views their own profile, THE system SHALL provide access to profile edit features.

### Profile Editing

WHEN a seller accesses the profile editing interface, THE system SHALL show current values for all editable fields.

WHEN a seller saves changes to their profile, THE system SHALL validate the input and update the profile.

IF validation fails, THEN THE system SHALL return specific error messages for each invalid field.

WHEN profile updates are successful, THE system SHALL create a new profile snapshot and clear any cached profile data.

## Product Management

### Product Creation Requirements

WHEN a seller creates a new product, THE system SHALL require the following information:
- Product name (required text field)
- Product description (required text field)
- Category selection (must be a valid category from system catalog)
- Base price (required numeric value with positive constraint)

WHEN a product is created, THE system SHALL associate it with the creating seller and set initial status to "active".

WHEN a product is created, THE system SHALL create the first product snapshot preserving initial values.

#### Product Naming Constraints

THE system SHALL enforce the following product naming rules:
- Minimum 3 characters
- Maximum 200 characters
- No HTML or special characters for security
- Unique within the seller's product catalog (sellers can have same product names)

#### Category Hierarchy

WHEN selecting a category for a product, THE system SHALL support two-level hierarchy:
- Top-level category (required)
- Subcategory (optional, must belong to selected top-level category)

IF a customer tries to select a subcategory without a top-level category, THEN THE system SHALL require the top-level category first.

### Product Editing

WHEN a seller edits an existing product, THE system SHALL allow modification of:
- Product name
- Product description
- Category (can change top-level and subcategory)
- Base price
- Product images
- Product variants

WHEN any product attribute is modified, THE system SHALL create a product snapshot that preserves the previous state of all product attributes.

WHEN a product is edited, THE system SHALL update the "last modified" timestamp and the seller who made the change.

### Product Images

#### Image Upload

WHEN a seller uploads images to a product, THE system SHALL:
- Accept multiple image files in a single operation
- Validate image file types (JPEG, PNG, WebP)
- Validate image size limits (maximum 5MB per image)
- Store original and resized versions for responsive display
- Generate thumbnail versions for listings

WHEN images are uploaded, THE system SHALL allow the seller to reorder them.

WHEN images are reordered, THE system SHALL create a product snapshot preserving the previous image order.

#### Image Display Hierarchy

THE system SHALL use the following image display rules:
- First image in the list becomes the main thumbnail for product listings
- Additional images are displayed on the product detail page
- If no images exist, a default placeholder is shown

#### Image Deletion

WHEN a seller deletes an image from a product, THE system SHALL:
- Verify the seller owns the product
- Remove the image files from storage
- Update the image list (reindexing remaining images)
- Create a product snapshot documenting the change
- Update the main thumbnail if the first image was deleted

### Product Variants (SKU Management)

#### Variant Structure

Each product can have multiple variants representing different options such as color, size, material, etc. Each variant must include:
- SKU code (required, unique identifier for this variant)
- Option values (collection of option name-value pairs, e.g., {"color": "red", "size": "large"})
- Price (optional, can override base price)
- Stock quantity (required, starts at 0)

#### Variant Creation

WHEN a seller creates variants for a product, THE system SHALL:
- Require at least one variant with valid SKU and option values
- Validate SKU uniqueness across all seller products
- Allow optional price overrides for each variant
- Initialize stock quantity to 0 for each variant

WHEN variants are created, THE system SHALL create a product snapshot preserving the variant configuration.

#### Variant Editing

WHEN a seller edits an existing variant, THE system SHALL allow modification of:
- SKU code (can be changed, requires validation)
- Option values (can be updated)
- Price (can be changed or removed)
- Stock quantity (only through inventory management, not direct edit)

WHEN a variant is edited, THE system SHALL create a product snapshot and a variant snapshot preserving the previous state.

#### Variant Deletion

WHEN a seller attempts to delete a variant, THE system SHALL validate the following conditions:
- No order items exist with status "paid" or "shipped" for this variant
- No pending cancellation requests for this variant
- No pending refund requests for this variant

IF deletion conditions are not met, THEN THE system SHALL prevent deletion and return specific error information.

IF deletion conditions are met, THEN THE system SHALL delete the variant and create a product snapshot documenting the change.

#### Product Availability Rules

A product with zero variants is considered "unavailable" and will:
- Still appear in search results
- Display as "Out of Stock" or "Unavailable"
- Not allow customers to add to cart
- Not appear in category listings with available products

### Product Deletion

WHEN a seller attempts to delete a product, THE system SHALL validate:
- No order items exist with status "paid" or "shipped" for any variant
- No pending cancellation requests for any variant
- No pending refund requests for any variant

IF deletion conditions are not met, THEN THE system SHALL return specific error messages identifying which conditions prevent deletion.

WHEN a product is successfully deleted, THE system SHALL:
- Remove the product from active catalog and search results
- Delete all associated images and variants
- Delete inventory history for all variants
- Create product snapshots for all variants at time of deletion
- Preserve order history and order snapshots that reference the product

### Product Snapshots

#### Snapshot Content

WHEN a product snapshot is created, THE system SHALL include:
- Product ID and seller ID
- Product name, description, and category at time of snapshot
- Base price at time of snapshot
- Complete image list with order at time of snapshot
- All variants with their complete state (SKU, options, price, stock)
- Timestamp of snapshot creation
- User ID of the editing seller

#### Snapshot Access Control

WHEN a seller views product snapshots for their products, THE system SHALL:
- Display all snapshots in reverse chronological order
- Allow viewing of complete snapshot content
- Show snapshot metadata (timestamp, seller)

WHEN an administrator views any product snapshot, THE system SHALL grant access to view the complete snapshot.

#### Snapshot Preservation

IF a product is deleted, THEN THE system SHALL preserve all existing product snapshots.

WHEN an order references a product variant, THE system SHALL store a snapshot of the variant with the order to preserve historical pricing and specifications.

## Inventory Management

### Inventory Tracking

Each product variant maintains an inventory count that changes through specific events:
- Initial stock setting (via inventory records)
- Restocking (positive inventory change)
- Order fulfillment (negative inventory change)
- Stock adjustment (positive or negative, for corrections)
- Order cancellation/refund (positive inventory change)

#### Inventory History Records

THE system SHALL maintain an immutable inventory history for each variant containing:
- Timestamp of the change
- Quantity change (positive for additions, negative for reductions)
- Reason for the change (system-defined or seller-provided)
- Related entity ID (order ID, adjustment ID, etc.)
- User ID of the person making the change (if applicable)

#### Current Stock Calculation

THE system SHALL calculate current stock by summing all inventory history records for a variant.

WHEN inventory history is empty, THE system SHALL treat current stock as 0.

#### Stock Level Thresholds

THE system SHALL define the following stock states:
- Stock > 0: "In Stock" - available for purchase
- Stock = 0: "Out of Stock" - unavailable for purchase
- Stock < 0: "Negative Stock" - error condition requiring investigation

#### Restocking Process

WHEN a seller restocks a variant, THE system SHALL:
- Require the seller to specify quantity and reason
- Validate that quantity is positive
- Create a positive inventory record
- Update the current stock calculation
- Allow the variant to be purchased again (if stock > 0)

#### Stock Adjustments

WHEN a seller performs a stock adjustment, THE system SHALL:
- Require the seller to specify quantity (positive or negative) and reason
- Allow negative adjustments for loss, damage, or theft
- Allow positive adjustments for corrections or found inventory
- Create an appropriate inventory record
- Update the current stock calculation

#### Stock Validation

WHEN a customer adds a variant to their cart, THE system SHALL:
- Check if current stock is greater than or equal to requested quantity
- Display warning if requested quantity exceeds available stock
- Prevent cart addition if stock is 0 or negative

WHEN a customer checks out, THE system SHALL validate:
- All cart items have sufficient stock
- No item has stock less than cart quantity
- No item is out of stock

### Inventory Snapshots (for Orders)

WHEN an order is placed, THE system SHALL:
- Capture the current stock level of each variant in the order
- Store this snapshot with the order for reference
- Reduce stock levels after order confirmation
- This stock snapshot is used for order history reference only

## Seller Dashboard

### Dashboard Overview

WHEN a seller accesses their dashboard, THE system SHALL display:
- Total number of active products
- Total number of order items (for their products) in all statuses
- Number of pending cancellation requests
- Number of pending refund requests
- Summary of recent sales activity
- Recent order notifications

#### Order Management Section

WHEN a seller views their orders, THE system SHALL allow filtering by:
- Order item status (paid, shipped, delivered, cancelled, refunded)
- Date range
- Product name or variant
- Customer name or order ID

WHEN a seller views a specific order, THE system SHALL show:
- Order number and timestamp
- List of order items with variant details
- Customer shipping address
- Current status of each item
- Shipping information (if applicable)

#### Inventory Management Section

WHEN a seller views their products, THE system SHALL show:
- Product name and category
- Variant count and stock status
- Sales volume metrics
- Recent inventory changes
- Quick actions (edit, view snapshots, restock)

### Shipping Management

WHEN a seller accesses shipping features, THE system SHALL:
- Show all order items with status "paid" awaiting shipment
- Allow grouping of multiple items into single shipments
- Allow entry of tracking information (carrier name, tracking number)
- Automatically update item status to "shipped" when shipment is created

WHEN a shipment is created, THE system SHALL:
- Associate all selected items with the shipment
- Store tracking information for the shipment
- Update the status of all associated items to "shipped"
- Allow customers to view tracking information

## Snapshots and Audit Trail

### Complete Snapshot Requirements

The platform implements a comprehensive snapshot system to preserve the state of critical entities at specific points in time. This supports dispute resolution, historical analysis, and legal compliance.

#### Snapshot Triggers

Snapshots are created when the following modifications occur:
- Seller profile changes (shop name, description, logo)
- Product creation or modification (all fields including images)
- Product variant creation or modification (SKU, options, price)
- Order item creation (product, variant, seller profile at purchase time)
- Review creation or modification (rating, content)
- Cancellation request changes (reason, status)
- Refund request changes (reason, status)

#### Snapshot Storage Requirements

WHEN a snapshot is created, THE system SHALL store:
- Complete snapshot data representing the entity at that moment
- Timestamp of snapshot creation
- User ID of the person making the change
- Snapshot type identifier
- Related entity IDs (order ID, product ID, etc.)

#### Snapshot Access Control

 Sellers can view snapshots of their own entities.
Administrators can view any snapshot for oversight purposes.
Customers can view snapshots of products and sellers relevant to their purchases.

#### Snapshot Persistence

Snapshots are immutable and cannot be deleted by users.
Snapshots persist even if the original entity is deleted.
This ensures historical data remains available for auditing and dispute resolution.

## Business Rules and Validation

### Core Seller Rules

1. **Seller Ownership**: Sellers can only manage products they created
2. **Approval Requirement**: Sellers cannot create products until approved
3. **Order Priority**: Existing orders take priority over seller actions
4. **Inventory Consistency**: Stock levels must be validated before order fulfillment
5. **Data Integrity**: Snapshots are immutable and create historical records

### Validations That Must Occur

WHEN a seller attempts to create, edit, or delete any entity, THE system SHALL validate:
- Seller has appropriate permissions
- All required fields are present and valid
- Business constraints are satisfied
- No conflicting orders exist
- Data integrity is maintained

IF validation fails, THEN THE system SHALL return specific error information that helps the seller understand and correct the issue.

## Error Handling

### Common Error Scenarios

WHEN a seller profile update fails validation, THEN THE system SHALL return:
- Specific field-level error messages
- Clear indication of what validation failed
- Guidance on how to correct the issue

WHEN a seller attempts to delete a product with active orders, THEN THE system SHALL:
- Prevent the deletion
- Return specific information about which orders prevent deletion
- Provide options for next steps

WHEN a seller attempts to delete a variant with pending orders, THEN THE system SHALL:
- Prevent the deletion
- Return specific information about pending order items
- Suggest waiting until orders are completed

WHEN a seller attempts to perform an unauthorized action, THEN THE system SHALL:
- Return HTTP 403 Forbidden
- Provide generic error message for security
- Log the unauthorized access attempt

## Performance Requirements

### Response Time Targets

- Seller profile load: Under 1 second for standard profile
- Product list load: Under 2 seconds for up to 50 products
- Product detail load: Under 1 second
- Inventory update: Immediate feedback on success/failure
- Snapshot creation: Asynchronous, no user delay

### Availability Requirements

WHEN a seller logs in, THE system SHALL be available 99.9% of business hours.

WHEN seller features fail temporarily, THE system SHALL show appropriate error message and allow retry.

## Business Continuity

### Account Suspension

WHEN an administrator suspends a seller account, THE system SHALL:
- Immediately disable seller features
- Hide seller products from search and listings
- Allow existing orders to be processed (ship items, respond to requests)
- Prevent new product creation and existing product editing
- Display suspension status to the seller

WHEN an administrator unsuspends a seller account, THE system SHALL:
- Immediately restore seller features
- Make seller products visible in search and listings
- Restore ability to create and edit products
- Clear suspension status

### Data Preservation

WHEN a seller account is deleted, THE system SHALL:
- Remove seller login capability
- Delete seller profile and products
- Preserve all order history and snapshots
- Maintain audit trail for all actions
- Ensure legal compliance for data retention