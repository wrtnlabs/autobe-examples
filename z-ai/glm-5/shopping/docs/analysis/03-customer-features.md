# Customer Features Requirements

This document specifies the detailed functional requirements for customer-specific features in the e-commerce shopping mall platform. It covers account management, profile management, address management, wishlist functionality, and shopping cart operations.

## Customer Account Management

### Registration Requirements

The platform requires mandatory registration before any features can be accessed. There is no guest browsing capability.

**Registration Flow**:

WHEN a new customer attempts to register, THE system SHALL accept the following required information:
- Email address (must be unique across all customer accounts)
- Password (must meet security requirements)

WHEN a customer submits registration information, THE system SHALL validate:
- Email format conforms to RFC 5322 standard
- Email is not already registered in the customer database
- Password contains minimum 8 characters including at least one uppercase letter, one lowercase letter, one number, and one special character

IF the email is already registered, THEN THE system SHALL reject the registration with the error message "Email already registered. Please log in or use a different email."

IF the password does not meet security requirements, THEN THE system SHALL reject the registration and display specific password requirements not met.

IF validation passes, THEN THE system SHALL create a new customer account with:
- Unique customer identifier (UUID v4 format)
- Email address (stored in lowercase)
- Hashed password (using bcrypt with cost factor 10 or higher)
- Account creation timestamp (ISO 8601 format)
- Initial profile with empty display name and no phone number
- Empty wishlist collection
- Empty shopping cart
- Empty address list
- Account status set to "active"

### Authentication Requirements

**Login Process**:

WHEN a registered customer attempts to log in, THE system SHALL validate:
- Email address exists in the system (case-insensitive comparison)
- Password matches the stored credentials using constant-time comparison

IF credentials are invalid, THEN THE system SHALL reject the login attempt with the generic error message "Invalid email or password" without revealing which field is incorrect.

IF the customer account status is "banned", THEN THE system SHALL reject the login attempt with the message "This account has been suspended. Please contact support."

IF credentials are valid and account is active, THEN THE system SHALL:
- Generate a JWT access token with 30-minute expiration
- Generate a JWT refresh token with 14-day expiration
- Create a session record with unique session identifier
- Store session metadata including IP address and user agent
- Return authentication tokens to the client

**JWT Token Structure**:

THE JWT access token SHALL contain the following claims:
- `sub`: Customer ID (UUID string)
- `role`: "customer" (string literal)
- `permissions`: Array of permission strings for customer actions
- `iat`: Token issued at timestamp
- `exp`: Token expiration timestamp

**Session Management**:

WHEN a refresh token expires, THE system SHALL require the customer to log in again with email and password.

WHEN a customer logs out, THE system SHALL:
- Invalidate the current session record
- Mark the refresh token as revoked
- Clear any client-side authentication state

THE system SHALL support concurrent sessions with a maximum of 5 active sessions per customer.

WHEN a sixth session is created, THE system SHALL automatically invalidate the oldest session.

### Password Management

**Password Change**:

WHEN an authenticated customer requests to change their password, THE system SHALL require:
- Current password verification
- New password (must meet security requirements)
- New password confirmation (must match new password)

IF the current password is incorrect, THEN THE system SHALL reject the password change with the error message "Current password is incorrect."

IF the new password does not meet security requirements, THEN THE system SHALL display specific requirements not met.

IF the new password confirmation does not match, THEN THE system SHALL reject with "New password and confirmation do not match."

IF validation passes, THEN THE system SHALL:
- Update the password hash using bcrypt
- Invalidate all existing sessions except the current session
- Record the password change timestamp in the customer record
- Send a password change notification email to the registered email address

**Password Requirements**:

THE system SHALL enforce the following password requirements:
- Minimum 8 characters in length
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one numeric digit (0-9)
- At least one special character from the set: !@#$%^&*()_+-=[]{}|;:',.<>?
- Maximum length of 128 characters
- Password must not be in a list of common weak passwords
- Password must not be the same as the email address

### Account Deletion and Data Preservation

**Deletion Prerequisites**:

WHEN a customer requests to delete their account, THE system SHALL allow deletion without any prerequisites. Customers can delete their accounts at any time regardless of order history, pending orders, or other account state.

**Deletion Process**:

WHEN a customer confirms account deletion, THE system SHALL:
- Delete the customer profile information (display name, phone number)
- Delete all shipping addresses associated with the account
- Delete the entire wishlist
- Delete the entire shopping cart
- Delete the authentication credentials (email and password hash)
- Anonymize the email address by replacing it with "deleted_customer_[timestamp]@anonymous.invalid"
- Set the account status to "deleted"
- Record the deletion timestamp

**Data Preservation Rules**:

WHEN a customer account is deleted, THE system SHALL preserve the following data with appropriate anonymization:

| Data Type | Preservation Action | Justification |
|-----------|---------------------|---------------|
| Order records | Preserved intact with customer reference | Seller business records requirement |
| Order history | Preserved intact with customer reference | Legal compliance and audit trail |
| Reviews | Preserved with author shown as "deleted user" | Community content preservation |
| Cancellation requests | Preserved with anonymized customer info | Dispute resolution records |
| Refund requests | Preserved with anonymized customer info | Financial audit requirements |

THE preserved data SHALL remain accessible to:
- Sellers (for their order items only)
- Administrators (for full oversight purposes)
- NOT accessible to the deleted customer

IF a deleted customer's review is displayed on a product page, THEN THE system SHALL show "deleted user" as the author name instead of the original display name.

## Customer Profile Management

### Profile Data Structure

Each customer has a profile containing the following optional information:

| Field | Type | Required | Max Length | Description |
|-------|------|----------|------------|-------------|
| Display Name | String | No | 100 characters | Customer's display name shown in reviews, orders, and interactions |
| Phone Number | String | No | 20 characters | Customer's contact phone number for delivery coordination |

**Initial State**:

WHEN a customer account is created, THE system SHALL initialize the profile with:
- Display name: null (empty)
- Phone number: null (empty)

IF a display name is null when displayed in the UI, THE system SHALL show "Customer" as the default display name.

### Profile Editing

**Edit Operations**:

WHEN an authenticated customer edits their profile, THE system SHALL allow changes to:
- Display name (optional, can be set, changed, or cleared)
- Phone number (optional, can be set, changed, or cleared)

**Validation Rules**:

WHEN a customer updates their display name, THE system SHALL validate:
- Maximum length does not exceed 100 characters
- Does not contain profanity or offensive content (checked against a content filter)
- Does not impersonate administrators or contain "admin", "seller", or similar reserved terms

WHEN a customer updates their phone number, THE system SHALL validate:
- Matches valid international phone number format (E.164 standard recommended)
- Maximum length of 20 characters including formatting characters
- Acceptable formats: +[country code][number], with optional spaces, hyphens, or parentheses

IF validation fails for any field, THEN THE system SHALL reject the entire update with specific error messages indicating which field failed and why.

IF validation passes, THEN THE system SHALL:
- Update the profile information atomically
- Record the update timestamp
- Return the updated profile data to the client

**Display Name Usage**:

THE display name SHALL be used in the following contexts:
- Review author display on product pages
- Order communication notifications (if set)
- Customer service interactions

IF display name is not set, THE system SHALL display "Customer" in all contexts.

## Address Management

### Address Data Structure

Each shipping address contains the following information:

| Field | Type | Required | Max Length | Validation |
|-------|------|----------|------------|------------|
| Recipient Name | String | Yes | 100 characters | Non-empty string |
| Phone Number | String | Yes | 20 characters | Valid phone format |
| Street Address | String | Yes | 200 characters | Non-empty string |
| City | String | Yes | 100 characters | Non-empty string |
| State/Province | String | Yes | 100 characters | Non-empty string |
| Postal Code | String | Yes | 20 characters | Non-empty string |
| Country | String | Yes | 100 characters | Non-empty string |
| Is Default | Boolean | Yes | N/A | True/False flag |

### Adding Addresses

**Creation Process**:

WHEN an authenticated customer adds a new shipping address, THE system SHALL require all mandatory fields:
- Recipient name (required, 1-100 characters)
- Phone number (required, valid phone format, max 20 characters)
- Street address (required, 1-200 characters)
- City (required, 1-100 characters)
- State/Province (required, 1-100 characters)
- Postal code (required, 1-20 characters)
- Country (required, 1-100 characters)

**Validation Rules**:

WHEN a customer submits a new address, THE system SHALL validate each field:

| Field | Validation Rules |
|-------|-----------------|
| Recipient Name | 1-100 characters, no special characters except hyphen, apostrophe, space |
| Phone Number | Valid phone format per E.164, max 20 characters |
| Street Address | 1-200 characters, alphanumeric with common punctuation |
| City | 1-100 characters, letters, spaces, and hyphens only |
| State/Province | 1-100 characters, letters, spaces, and hyphens only |
| Postal Code | 1-20 characters, alphanumeric with hyphens and spaces |
| Country | 1-100 characters, letters and spaces only |

IF any validation fails, THEN THE system SHALL reject the address creation with specific error messages for each invalid field.

**Default Address Handling**:

IF this is the customer's first address being added, THEN THE system SHALL automatically set the `is_default` flag to `true` regardless of customer input.

IF the customer marks the new address as default, THEN THE system SHALL:
- Set `is_default` to `false` for all existing addresses of this customer
- Set `is_default` to `true` for the new address
- Ensure exactly one default address exists after the operation

IF validation passes, THEN THE system SHALL:
- Create the address record with a unique identifier
- Associate it with the customer account
- Record the creation timestamp
- Return the created address with all fields

### Viewing Addresses

**Address List Display**:

WHEN a customer views their addresses, THE system SHALL display:
- All saved addresses (up to maximum limit)
- Which address is marked as default (indicated visually)
- All address fields for each entry
- Edit and delete options for each address

THE addresses SHALL be sorted in the following order:
1. Default address first (if exists)
2. Remaining addresses sorted by creation date (newest first)

**Address Limits**:

THE system SHALL enforce a maximum limit of 20 addresses per customer.

WHEN a customer attempts to add an address beyond the limit, THE system SHALL reject with an error message and suggest deleting unused addresses.

### Editing Addresses

**Edit Operations**:

WHEN an authenticated customer edits an existing address, THE system SHALL allow changes to:
- Recipient name
- Phone number
- Street address
- City
- State/Province
- Postal code
- Country
- Default status flag

**Validation Rules**:

WHEN a customer updates an address, THE system SHALL apply the same validation rules as address creation for all modified fields.

**Default Address Update**:

IF the customer marks the edited address as default, THEN THE system SHALL:
- Set `is_default` to `false` for all other addresses
- Set `is_default` to `true` for the edited address
- Ensure exactly one default address exists after the operation

IF validation passes, THEN THE system SHALL:
- Update the address record atomically
- Record the update timestamp
- Return the updated address data

### Deleting Addresses

**Deletion Process**:

WHEN a customer deletes an address, THE system SHALL:
- Remove the address from the customer's address list
- Permanently delete the address record from the database
- Record the deletion in an audit log

**Default Address Reassignment**:

IF the deleted address was marked as the default address, THEN THE system SHALL:
- Automatically select the next most recent address (by creation date) and set it as default
- IF no other addresses exist, THEN leave the customer with no default address

**Constraints**:

THE system SHALL NOT prevent address deletion based on:
- Past order history (orders retain address information as snapshots)
- Pending orders (address is copied to order at checkout time)
- Any other historical reference

THE system SHALL allow deletion of any address at any time.

### Default Address Management

**Setting Default Address**:

WHEN a customer explicitly sets an address as default, THE system SHALL:
- Verify the address belongs to the customer
- Set `is_default` to `false` for all other addresses atomically
- Set `is_default` to `true` for the selected address
- Record the update timestamp
- Return success confirmation

**Using Default Address in Checkout**:

WHEN a customer proceeds to checkout, THE system SHALL:
- Pre-select the default shipping address if one exists
- Display the default address in the shipping address selector
- Allow the customer to select a different saved address
- Allow the customer to add a new address during checkout

IF no default address exists and no addresses are saved, THEN THE system SHALL require the customer to add a shipping address before proceeding with checkout.

## Wishlist Functionality

### Adding Products to Wishlist

**Add Operation**:

WHEN an authenticated customer adds a product to their wishlist, THE system SHALL:
- Identify the product by product ID (UUID)
- Verify the product exists in the database and is not deleted
- Verify the product is visible (seller not suspended)
- Add the product to the customer's wishlist if not already present

**Duplicate Handling**:

IF the product is already in the customer's wishlist, THEN THE system SHALL:
- Not create a duplicate entry
- Return a success response indicating the product is already in the wishlist
- Update the "last viewed" timestamp for analytics

**Wishlist Entry Data**:

WHEN a product is added to a wishlist, THE system SHALL store:
- Customer ID (UUID, foreign key)
- Product ID (UUID, foreign key)
- Date added (ISO 8601 timestamp)
- Last checked timestamp (for availability status updates)

**Note**: The wishlist tracks products at the product level, not specific variants. Customers add the entire product and can select variants when adding to cart.

### Viewing Wishlist

**Wishlist Display**:

WHEN a customer views their wishlist, THE system SHALL display each product with:
- Product main image (thumbnail URL)
- Product name
- Product base price or price range (if variants have different prices)
- Seller shop name with link to seller profile
- Average rating (if reviews exist) and total review count
- Availability status indicator

**Availability Status Indicators**:

THE system SHALL display the following status indicators for wishlist products:

| Status | Display Text | Condition |
|--------|--------------|-----------|
| Available | "In Stock" | At least one variant has stock > 0 |
| Out of Stock | "Out of Stock" | All variants have stock = 0 |
| No Variants | "Unavailable" | Product has no variants configured |
| Deleted | "Product Removed" | Product has been deleted by seller |
| Seller Suspended | "Temporarily Unavailable" | Seller account is suspended |

**Pagination**:

THE wishlist display SHALL use pagination:
- Default page size: 20 products
- Maximum page size: 50 products
- Sorted by date added (newest first)
- Total count displayed at top
- Page navigation controls

**Wishlist Limits**:

THE system SHALL enforce a maximum limit of 200 products per customer wishlist.

WHEN a customer attempts to add a product beyond the limit, THE system SHALL reject with an error message and suggest removing products before adding new ones.

### Removing Products from Wishlist

**Single Product Removal**:

WHEN a customer removes a product from their wishlist, THE system SHALL:
- Delete the wishlist entry from the database
- Permanently remove the product from the customer's wishlist
- Return success confirmation

**Bulk Operations**:

THE system SHALL support the following bulk operations:
- Remove multiple selected products at once
- Clear entire wishlist (with confirmation prompt)

WHEN a customer clears their entire wishlist, THE system SHALL:
- Display a confirmation dialog
- Delete all wishlist entries for that customer upon confirmation
- Return success confirmation with count of removed items

### Automatic Removal Rules

**Seller Product Deletion**:

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customer wishlists.

THE system SHALL perform the following steps:
- Query all wishlist entries containing the deleted product ID
- Delete all matching wishlist entries
- Log the automatic removal for audit purposes

**Variant Stock Changes**:

THE system SHALL NOT automatically remove products from wishlists when:
- Variants go out of stock (temporary condition, customer may want to wait)
- All variants are out of stock (restock may occur)
- Product price changes

**Notification of Changes**:

THE system MAY notify customers when:
- A wishlist product's price changes (optional feature)
- A wishlist product comes back in stock (optional feature)

## Shopping Cart Operations

### Adding Items to Cart

**Add Operation**:

WHEN an authenticated customer adds an item to their cart, THE system SHALL require:
- Product variant ID (specific SKU UUID, not just product ID)
- Quantity (positive integer, minimum 1)

**Pre-Add Validation**:

WHEN a customer adds an item to the cart, THE system SHALL validate:
- The variant exists in the database
- The variant is not marked as deleted
- The parent product exists and is not deleted
- The parent product's seller is not suspended
- The requested quantity is greater than 0
- The requested quantity does not exceed system maximum (typically 99 per item)

IF the variant does not exist or is deleted, THEN THE system SHALL reject the addition with "This item is no longer available."

IF the product is deleted or seller is suspended, THEN THE system SHALL reject with "This product is currently unavailable."

**Quantity Combination Logic**:

IF the same variant is already in the customer's cart, THEN THE system SHALL:
- Add the new quantity to the existing cart item quantity
- NOT create a duplicate cart entry
- Update the cart item's last modified timestamp
- Enforce maximum quantity limit (99 units per variant)

IF the combined quantity would exceed the maximum limit, THEN THE system SHALL:
- Cap the quantity at the maximum limit
- Notify the customer with "Maximum quantity (99) reached for this item."

**Stock Validation at Add Time**:

WHEN adding items to the cart, THE system SHALL NOT block additions when stock is insufficient.

However, THE system SHALL record the current stock level for display purposes and warn the customer during cart viewing.

**Cart Entry Data Structure**:

WHEN an item is added to the cart, THE system SHALL store:
- Customer ID (UUID, foreign key)
- Product variant ID (UUID, foreign key)
- Quantity (integer)
- Date added (ISO 8601 timestamp)
- Last updated timestamp (ISO 8601)
- Unit price at time of addition (for price change detection)

### Viewing Cart

**Cart Item Display**:

WHEN a customer views their cart, THE system SHALL display each item with:
- Product name
- Product main image (thumbnail URL, 200x200px)
- Variant option values formatted as a string (e.g., "Red / Large")
- Variant SKU code
- Unit price (variant price if set, otherwise product base price)
- Quantity with increment/decrement controls
- Subtotal (unit price × quantity)
- Stock status indicator
- Remove item button

**Stock Status Display**:

THE system SHALL display the following stock status indicators for cart items:

| Stock Status | Display Condition | Visual Indicator |
|--------------|-------------------|------------------|
| In Stock | Stock ≥ cart quantity | Green checkmark, "In Stock" |
| Low Stock | 0 < Stock < cart quantity | Yellow warning, "Only X available" |
| Out of Stock | Stock = 0 | Red indicator, "Out of Stock" |
| Unavailable | Variant deleted | Gray indicator, "No longer available" |
| Product Deleted | Product deleted | Gray indicator, "Product removed" |

**Cart Summary Section**:

THE cart display SHALL include a summary section showing:
- Total number of items (sum of all quantities)
- Total number of distinct products
- Subtotal (sum of all item subtotals)
- Estimated shipping (if calculable, or "Calculated at checkout")
- Estimated total
- "Proceed to Checkout" button

**Empty Cart Display**:

IF the cart is empty, THEN THE system SHALL:
- Display an empty cart message
- Show suggested products or categories
- Provide a "Continue Shopping" button
- Not display the checkout button

**Cart Limits**:

THE system SHALL enforce the following cart limits:
- Maximum quantity per cart item: 99 units
- Maximum distinct variants in cart: 50 items
- Maximum cart value: Determined by payment gateway limits

### Modifying Cart Contents

**Update Quantity**:

WHEN a customer updates the quantity of a cart item, THE system SHALL:
- Accept a new quantity (positive integer)
- Validate the variant still exists
- Enforce minimum quantity of 1
- Enforce maximum quantity of 99
- Update the cart item quantity
- Update the last modified timestamp
- Recalculate the cart subtotal

IF the new quantity is 0 or negative, THEN THE system SHALL treat this as a removal request and delete the cart item.

IF the new quantity exceeds available stock, THEN THE system SHALL:
- Allow the update
- Display a low stock warning
- Block checkout until quantity is adjusted

**Remove Single Item**:

WHEN a customer removes an item from the cart, THE system SHALL:
- Delete the cart entry from the database
- Update the cart summary
- Return success confirmation

**Clear Entire Cart**:

WHEN a customer clears the cart, THE system SHALL:
- Display a confirmation dialog
- Delete all cart entries for that customer upon confirmation
- Reset the cart to empty state
- Return success confirmation

### Cart Validation Rules

**Pre-Checkout Validation**:

WHEN a customer attempts to proceed to checkout, THE system SHALL validate:
- At least one item exists in the cart
- All cart items reference existing, non-deleted variants
- All cart items reference existing, non-deleted products
- All cart items have stock > 0
- All cart items have sellers who are not suspended

IF any item fails validation, THEN THE system SHALL:
- Block checkout with the message "Some items in your cart are no longer available"
- Display specific error messages for each problematic item
- Suggest removing or updating problematic items
- Highlight problematic items visually

**Price Change Detection**:

WHEN a customer proceeds to checkout, THE system SHALL compare:
- Current unit price of each variant
- Unit price recorded when item was added to cart

IF any price has changed, THEN THE system SHALL:
- Display a price change notification
- Show old price (strikethrough) and new price
- Require customer confirmation to proceed
- Update cart item prices to current prices upon confirmation

### Checkout Process

**Address Selection**:

WHEN a customer begins checkout, THE system SHALL:
- Load all saved addresses for the customer
- Pre-select the default shipping address if one exists
- Allow selection of any saved address
- Provide option to add a new address

IF the customer has no saved addresses, THEN THE system SHALL:
- Require address creation before proceeding
- Provide an address creation form
- Offer to save the new address for future use

**Order Review Page**:

WHEN a customer reviews their order before placement, THE system SHALL display:
- Complete list of items with:
  - Product name
  - Variant options display string
  - Quantity
  - Unit price
  - Line total
- Selected shipping address (full formatted address)
- Shipping breakdown by seller (if items from multiple sellers)
- Order subtotal
- Total price
- "Place Order" button
- "Back to Cart" option

**Payment Processing**:

WHEN a customer confirms the order, THE system SHALL:
- Initiate payment processing through the configured payment gateway
- Display a processing indicator to the customer
- Handle the payment gateway response

**Payment Success Flow**:

IF payment succeeds, THEN THE system SHALL:
- Create the order record with unique order number
- Create order items for each cart item
- Decrease inventory for each purchased variant
- Create inventory history records for each stock decrease
- Clear the purchased items from the cart
- Create snapshots of products, variants, and seller profiles
- Send order confirmation email to customer
- Redirect to order confirmation page

**Payment Failure Flow**:

IF payment fails, THEN THE system SHALL:
- NOT create any order record
- Preserve all cart contents unchanged
- Display the error message from the payment gateway
- Allow the customer to retry payment
- Provide alternative payment methods if available

**Payment Gateway Errors**:

THE system SHALL handle the following payment error scenarios:

| Error Type | System Action |
|------------|---------------|
| Card declined | Display "Payment declined. Please try a different payment method." |
| Insufficient funds | Display "Insufficient funds. Please try a different payment method." |
| Network error | Display "Payment processing failed. Please try again." |
| Gateway timeout | Display "Payment processing timed out. Please try again." |
| Fraud detected | Display "Payment blocked for security. Please contact support." |

## Customer-Specific Business Rules

### Validation Rules Summary

**Email Validation**:

THE system SHALL validate email addresses with the following rules:
- Must conform to RFC 5322 email format
- Must be unique across all customer accounts (case-insensitive)
- Maximum length: 255 characters
- Normalized to lowercase for storage and comparison
- Cannot be changed after registration (only through special support process)

**Phone Number Validation**:

THE system SHALL validate phone numbers with the following rules:
- Must match valid international phone number format
- Maximum length: 20 characters including formatting
- Accepted formats: +[country code][number], with optional spaces, hyphens, parentheses
- Examples: +1-555-123-4567, +82 10 1234 5678, (555) 123-4567
- Stored in normalized format for consistency

**Address Field Validation**:

THE system SHALL validate all address fields:
- Recipient name: 1-100 characters, letters, spaces, hyphens, apostrophes only
- Phone number: valid phone format, max 20 characters
- Street address: 1-200 characters, alphanumeric with common punctuation
- City: 1-100 characters, letters, spaces, hyphens only
- State/Province: 1-100 characters, letters, spaces, hyphens only
- Postal code: 1-20 characters, alphanumeric with hyphens and spaces
- Country: 1-100 characters, letters and spaces only

### Constraint Rules

**Registration Constraint**:

THE platform SHALL NOT allow guest browsing or guest checkout.

All platform features require authentication, including:
- Product browsing and search
- Product detail viewing
- Category browsing
- Seller profile viewing

**Cart Constraints**:

THE system SHALL enforce the following cart constraints:
- Minimum cart value for checkout: None (empty cart blocked)
- Maximum cart value: Determined by payment gateway limits
- Maximum items per cart: 50 distinct variants
- Maximum quantity per item: 99 units
- Cart expiration: Items remain in cart indefinitely (no automatic clearing)

**Wishlist Constraints**:

THE system SHALL enforce the following wishlist constraints:
- Maximum products: 200 per customer
- No duplicate products allowed
- Wishlist persists indefinitely (no expiration)

**Address Constraints**:

THE system SHALL enforce the following address constraints:
- Maximum addresses: 20 per customer
- Exactly one default address (if any addresses exist)
- Cannot delete default address if it's the only address (must add new first or delete account)

### Error Handling

**Registration Errors**:

| Error Condition | HTTP Status | Error Code | System Response |
|----------------|-------------|------------|----------------|
| Email already exists | 409 Conflict | EMAIL_EXISTS | "Email already registered. Please log in or use a different email." |
| Invalid email format | 400 Bad Request | INVALID_EMAIL | "Please enter a valid email address." |
| Weak password | 400 Bad Request | WEAK_PASSWORD | "Password must contain at least 8 characters including uppercase, lowercase, number, and special character." |
| Missing required fields | 400 Bad Request | MISSING_FIELDS | "[Field name] is required." |

**Authentication Errors**:

| Error Condition | HTTP Status | Error Code | System Response |
|----------------|-------------|------------|----------------|
| Invalid credentials | 401 Unauthorized | INVALID_CREDENTIALS | "Invalid email or password." |
| Account banned | 403 Forbidden | ACCOUNT_BANNED | "This account has been suspended. Please contact support." |
| Session expired | 401 Unauthorized | SESSION_EXPIRED | "Session expired. Please log in again." |
| Token invalid | 401 Unauthorized | INVALID_TOKEN | "Invalid authentication token." |

**Cart Errors**:

| Error Condition | HTTP Status | Error Code | System Response |
|----------------|-------------|------------|----------------|
| Variant deleted | 400 Bad Request | VARIANT_DELETED | "This item is no longer available." |
| Product deleted | 400 Bad Request | PRODUCT_DELETED | "This product has been removed." |
| Seller suspended | 400 Bad Request | SELLER_SUSPENDED | "This product is currently unavailable." |
| Out of stock | 400 Bad Request | OUT_OF_STOCK | "This item is out of stock." |
| Insufficient stock | 400 Bad Request | INSUFFICIENT_STOCK | "Only X units available. Please update quantity." |
| Quantity exceeds max | 400 Bad Request | QUANTITY_EXCEEDED | "Maximum quantity (99) per item exceeded." |

**Checkout Errors**:

| Error Condition | HTTP Status | Error Code | System Response |
|----------------|-------------|------------|----------------|
| Empty cart | 400 Bad Request | EMPTY_CART | "Your cart is empty." |
| Items unavailable | 400 Bad Request | ITEMS_UNAVAILABLE | "Some items are no longer available. Please review your cart." |
| Payment failed | 402 Payment Required | PAYMENT_FAILED | "Payment could not be processed: [gateway error message]" |
| Address required | 400 Bad Request | ADDRESS_REQUIRED | "Please select or add a shipping address." |
| Price changed | 400 Bad Request | PRICE_CHANGED | "Prices have changed. Please review and confirm." |

**Address Errors**:

| Error Condition | HTTP Status | Error Code | System Response |
|----------------|-------------|------------|----------------|
| Invalid phone format | 400 Bad Request | INVALID_PHONE | "Please enter a valid phone number." |
| Field too long | 400 Bad Request | FIELD_TOO_LONG | "[Field name] must be [X] characters or less." |
| Required field missing | 400 Bad Request | REQUIRED_FIELD | "[Field name] is required." |
| Address limit exceeded | 400 Bad Request | ADDRESS_LIMIT | "Maximum of 20 addresses allowed. Please delete unused addresses." |

## Permission Summary

The following table summarizes customer permissions for all features covered in this document:

| Action | Permission Level | Authentication Required | Owner Only |
|--------|------------------|------------------------|------------|
| Register account | Guest | No | No |
| Log in | Registered | No | No |
| Log out | Authenticated | Yes | No |
| Change password | Authenticated | Yes | Yes |
| Delete account | Authenticated | Yes | Yes |
| View own profile | Authenticated | Yes | Yes |
| Edit own profile | Authenticated | Yes | Yes |
| Add address | Authenticated | Yes | Yes |
| View own addresses | Authenticated | Yes | Yes |
| Edit own address | Authenticated | Yes | Yes |
| Delete own address | Authenticated | Yes | Yes |
| Set default address | Authenticated | Yes | Yes |
| Add to wishlist | Authenticated | Yes | Yes |
| View own wishlist | Authenticated | Yes | Yes |
| Remove from wishlist | Authenticated | Yes | Yes |
| Clear wishlist | Authenticated | Yes | Yes |
| Add to cart | Authenticated | Yes | Yes |
| View own cart | Authenticated | Yes | Yes |
| Update cart quantity | Authenticated | Yes | Yes |
| Remove from cart | Authenticated | Yes | Yes |
| Clear cart | Authenticated | Yes | Yes |
| Proceed to checkout | Authenticated | Yes | Yes |
| Place order | Authenticated | Yes | Yes |
| View own orders | Authenticated | Yes | Yes |
| View own order details | Authenticated | Yes | Yes |

**Cross-Customer Access Restrictions**:

THE system SHALL prevent customers from:
- Viewing other customers' profiles
- Viewing other customers' addresses
- Viewing other customers' wishlists
- Viewing other customers' carts
- Viewing other customers' orders
- Modifying other customers' data

**Seller Data Access**:

Customers SHALL be able to:
- View seller public profiles (shop name, description, logo)
- View seller products in search and listings
- See seller shop name in order details

Customers SHALL NOT be able to:
- View seller private account information
- View seller sales data or analytics
- View other customers' orders with the same seller