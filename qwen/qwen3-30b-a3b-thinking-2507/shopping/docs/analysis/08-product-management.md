# Functional Requirements

## Customer Account Management

### Account Registration

WHEN a user attempts to register for the platform, THE system SHALL require:
- Valid email address (must follow standard email format)
- Password with minimum 8 characters (including uppercase, lowercase, and special characters)
- Password confirmation matching

THE system SHALL validate the email address for format correctness and uniqueness.

WHEN registration is successful, THE system SHALL create a pending account status and send a confirmation email with verification link.

WHEN the user verifies their email, THE system SHALL activate the account and redirect to login.

### Account Authentication

WHEN a user attempts to log in with email and password, THE system SHALL validate:
- Email exists in the system
- Password matches the stored hash
- Account is active (not pending/banned)

THE system SHALL reject invalid credentials within 3 attempts with lockout after 5 failures.

### Account Modification

WHEN a user requests to change their password, THE system SHALL:
- Require current password verification
- Enforce new password complexity
- Confirm new password matches
- Create a password change snapshot

THE system SHALL require email confirmation for password reset requests.

WHEN a user deletes their account, THE system SHALL:
- Mark profile data as deleted (but not remove from database)
- Preserve orders and order history
- Flag reviews as 'deleted user'

## Customer Profile Management

### Profile Information

WHEN a customer edits their profile, THE system SHALL allow modification of:
- Display name (max 50 characters)
- Phone number (with validation)

THE system SHALL not allow changes to email address through profile edits.

## Address Management

### Address Operations

WHEN a customer adds a new shipping address, THE system SHALL require:
- Recipient name
- Phone number
- Street address (min 5 characters)
- City
- State/province
- Postal code
- Country

THE system SHALL allow up to 10 shipping addresses per customer.

WHEN a customer sets an address as default, THE system SHALL automatically uncheck all other addresses.

## Seller Account Management

### Seller Registration

WHEN a user requests to become a seller, THE system SHALL:
- Require business documentation
- Create a pending registration status
- Notify administrator for approval

THE system SHALL send rejection reasons with specific documentation requirements.

### Account Approval

WHEN an administrator approves a seller, THE system SHALL:
- Mark account status as 'approved'
- Notify seller via email
- Allow seller to create products

WHEN an administrator rejects a seller, THE system SHALL:
- Mark account status as 'rejected'
- Provide rejection reason
- Allow resubmission

## Seller Profile Management

### Seller Information

WHEN a seller edits their shop information, THE system SHALL:
- Allow changes to shop name (max 30 characters)
- Allow changes to shop description (max 500 characters)
- Allow logo upload (max 5MB, JPG/PNG)

THE system SHALL create a profile snapshot for every edit.

## Product Management

### Product Creation

WHEN a seller creates a new product, THE system SHALL:
- Require product name (min 3 characters)
- Require product description (min 10 characters)
- Require category selection
- Require base price ($0.01+)

THE system SHALL validate against category-specific price ranges.

WHEN a product is saved without variants, THE system SHALL mark it as 'unavailable' in search results.

### Product Variants

WHEN a seller adds a new product variant, THE system SHALL:
- Require unique SKU code
- Require option values (color, size, etc.)
- Require stock quantity (>= 0)

THE system SHALL automatically create a snapshot for all variant edits.

WHEN removing a variant, THE system SHALL:
- Verify no active orders
- Check no pending requests
- Prevent deletion if conditions fail

## Order Management

### Order Lifecycle

WHEN an order is placed successfully, THE system SHALL:
- Deduct inventory for all purchased variants
- Create order record with status 'paid'
- Save product snapshots with order items
- Remove items from cart

WHEN all order items are delivered, THE system SHALL update order status to 'delivered'.

### Order Cancellation

WHEN a customer requests cancellation for a single item, THE system SHALL:
- Verify item status is 'paid'
- Create cancellation request with reason
- Allow seller approval/rejection

WHEN seller approves, THE system SHALL:
- Update item status to 'cancelled'
- Create inventory adjustment
- Update order status accordingly

## Snapshot System

### Snapshot Requirements

WHEN any editable data is modified, THE system SHALL create a snapshot including:
- Timestamp of change
- Previous values
- Current values
- User who made change
- Change type (create/update/delete)

THE system SHALL preserve all snapshots permanently and make them accessible to:
- Owners of the data
- Administrators
- For dispute resolution

## Product Catalog

### Search and Browsing

WHEN a customer searches for products by name, THE system SHALL:
- Return 20 products per page
- Show main image, name, base price, seller, and average rating
- Support case-insensitive search

WHEN filtering results, THE system SHALL allow:
- Category selection
- Price range (min/max)
- In-stock only filter
- Sort by newest/price low-high/price high-low

## Administrator System

### Seller Management

WHEN an administrator approves a new seller registration, THE system SHALL:
- Change status to 'approved'
- Notify seller
- Allow product creation

WHEN suspending a seller, THE system SHALL:
- Hide products from search
- Prevent new product creation
- Allow existing order processing

THE system SHALL not restrict access to pending order items during suspension.

## Error Scenarios

### Authentication

WHEN user attempts to log in with invalid credentials, THE system SHALL return:
- 'Invalid email or password' message
- 3 attempts remaining
- Lockout after 5 failed attempts for 30 minutes

### Product Unavailability

WHEN a product has no variants, THE system SHALL:
- Display 'Product unavailable' message
- Show in category listings
- Prevent addition to cart

WHEN variant stock reaches 0, THE system SHALL:
- Mark as 'out of stock'
- Show warning in cart
- Prevent new cart additions

## Business Rule Integration

### Payment Validation

WHEN payment fails, THE system SHALL:
- Cancel order creation
- Return to cart
- Allow retry with same payment method
- Log failure reason

THE system SHALL not allow checkout without successful payment confirmation.

### Refund Handling

WHEN an order item is refunded, THE system SHALL:
- Update item status to 'refunded'
- Create inventory restoration record
- Notify customer via email
- Preserve all related snapshots

This completes the functional requirements specification for the e-commerce platform.