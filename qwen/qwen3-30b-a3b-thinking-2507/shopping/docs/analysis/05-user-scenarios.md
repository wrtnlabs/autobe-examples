# Enhanced Functional Requirements

## Customer Account Management

### Account Creation and Authentication

WHEN a new customer visits the platform for the first time, THE system SHALL require email and password registration with validation for standard email format and password strength (minimum 8 characters, containing at least one number and special character).
WHEN a customer attempts login, THE system SHALL allow email/password entry with session management including automatic logout after 30 minutes of inactivity.
WHEN a customer initiates password change, THE system SHALL require current password verification before accepting new password.

### Account Deletion

WHEN a customer requests account deletion, THE system SHALL:
- Delete profile information (name, phone number)
- Preserve all order history and product reviews
- Mark reviews as associated with 'deleted user'
- Prevent any new account creation with same email address

## Customer Profile Management

### Profile Data

WHEN a customer updates their display name, THE system SHALL allow alphanumeric characters only (max 50 characters) with space validation.
WHEN a customer updates their phone number, THE system SHALL validate against country-specific formats (e.g., +1-XXX-XXX-XXXX for US).

### Data Preservation

WHEN a customer updates their profile, THE system SHALL store a snapshot with time marker and previous values for audit purposes.

## Address Management

### Address Structure

WHEN a customer adds a new shipping address, THE system SHALL require:
- Recipient name (letters only, max 50 characters)
- International format phone number
- Street address with apartment/unit number optional
- City, state/province, postal code, and country

### Address Operations

WHEN a customer updates an address, THE system SHALL:
- Allow changes to any field
- Preserve previous address data in snapshot
- Maintain all related order shipping records

WHEN a customer sets a default address, THE system SHALL update the user's default flag and store previous default in history.

## Seller Account Management

### Registration and Approval

WHEN a seller registers with email and password, THE system SHALL:
- Create pending account with approval status
- Send confirmation email with registration details
- Require administrator review of seller documentation within 48 hours

WHEN a seller's registration is rejected, THE system SHALL:
- Notify seller via email with rejection reason
- Allow resubmission via new registration workflow

### Seller Status and Deletion

WHEN a seller requests account deletion, THE system SHALL:
- Check for pending orders (status paid or shipped)
- Check for pending cancellation/refund requests
- Prevent deletion if any violations exist
- Upon deletion, preserve product listings in order history

## Seller Profile Management

### Profile Details

WHEN a seller updates shop name, THE system SHALL require:
- Alphanumeric characters only
- Max 30 characters
- Uniqueness validation against existing shop names

WHEN a seller uploads a logo image, THE system SHALL:
- Support JPEG/PNG formats (max 5MB)
- Generate responsive thumbnail sizes
- Preserve original image in immutable storage

### Snapshot Requirements

WHEN a seller modifies any profile field, THE system SHALL create a snapshot containing:
- Timestamp of modification
- Previous values for all changed fields
- Seller ID and modification reason

## Product Snapshot Principle

### Snapshot Coverage

WHEN a product is modified, THE system SHALL capture:
- All product fields (name, description, category)
- Base price and variant values
- Current images and their ordered positions

WHEN a product variant is modified, THE system SHALL:
- Record new SKU code and option values
- Capture price changes
- Maintain variant stock history

### Immutable Record

WHEN a snapshot is created, THE system SHALL:
- Store it in unmodifiable storage
- Generate unique snapshot ID
- Associate with relevant business entity (product/seller)

## Product Management

### Product Creation

WHEN a seller creates a new product, THE system SHALL:
- Require name (max 100 characters, letters/numbers)
- Require description (min 10 characters)
- Require category selection with subcategory hierarchy
- Set base price (min $0.01)

### Product Edits and Deletion

WHEN a seller edits a product, THE system SHALL:
- Create product snapshot with all current values
- Allow changes to all product fields
- Preserve previous values unchanged

WHEN a product is deleted, THE system SHALL:
- Check for pending order items (paid/shipped)
- Check for pending cancellation/refund requests
- Delete all product variants and inventory
- Preserve snapshots for audit purposes

## Product Variant Management

### Variant Requirements

WHEN a seller adds a new product variant, THE system SHALL:
- Require unique SKU format (e.g. PROD-001-A)
- Record option values (color, size, etc.)
- Set price (optional, defaults to base price)
- Require starting stock quantity (min 0)

### Variant Modification

WHEN a seller modifies a variant, THE system SHALL:
- Create variant snapshot with before/after values
- Allow changes to SKU, option values, price
- Block modification if pending orders exist

## Inventory Management

### Stock Tracking

WHEN an order is placed, THE system SHALL:
- Decrease stock quantity by order quantity
- Create negative inventory record with reason 'order'
- Update current stock count via summing inventory records

WHEN inventory is adjusted, THE system SHALL:
- Record addition (positive quantity) with 'restock' reason
- Record reduction (negative quantity) with 'adjustment' reason

### Stock Availability

WHEN stock reaches zero, THE system SHALL:
- Mark variant as 'out of stock' in product listing
- Prevent item from being added to cart
- Display availability status to customers

## Order Processing

### Order Creation

WHEN a customer completes checkout after payment success, THE system SHALL:
- Create order record with timestamp
- Create order items with quantity and price at time of purchase
- Record product and seller snapshots for each item
- Decrease stock by ordered quantities

### Order Items

WHEN multiple items of same variant are added to cart, THE system SHALL:
- Combine into single order line item
- Display correct total quantity
- Maintain individual items in order history

## Order Status Management

### Item Status

WHEN an order item is paid, THE system SHALL set item status 'paid'
WHEN a seller ships the item, THE system SHALL set item status 'shipped' and create shipment
WHEN customer confirms delivery, THE system SHALL set item status 'delivered'

### Order Status

WHEN all items in an order become 'delivered', THE system SHALL set overall order status 'delivered'
WHEN any item remains 'paid', THE system SHALL set order status 'paid'
WHEN all items are cancelled, THE system SHALL set order status 'cancelled'

## Shipping and Tracking

### Shipment Handling

WHEN a seller ships items, THE system SHALL:
- Create shipment record with carrier and tracking number
- Group items by seller
- Assign all items in shipment to same tracking number
- Update all affected items to 'shipped'

### Delivery Confirmation

WHEN a customer confirms delivery, THE system SHALL:
- Update affected items to 'delivered'
- Remove shipment from active tracking
- Send delivery confirmation email to customer

WHEN customer does not confirm delivery within 14 days, THE system SHALL auto-update items to 'delivered'
