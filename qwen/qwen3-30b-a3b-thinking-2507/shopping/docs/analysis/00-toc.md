# Functional Requirements

## 1. Customer Account Management

WHEN a new user wants to register, THE system SHALL require email and password with minimum 8-character complexity, SHALL verify email format validity, AND SHALL store credentials with secure hashing. WHEN a user attempts login, THE system SHALL authenticate credentials securely using bcrypt, SHALL generate JWT tokens with 30-minute expiration, AND SHALL provide error messages specific to authentication failures. WHEN a user changes their password, THE system SHALL require current password verification, SHALL enforce new password complexity, AND SHALL invalidate existing tokens. WHEN a user deletes their account, THE system SHALL permanently remove profile data except order history and reviews, SHALL preserve order history for legal compliance, AND SHALL mark reviews as belonging to deleted user.

## 2. Customer Profile Management

WHEN a customer updates their display name, THE system SHALL allow changes with maximum 50 characters, SHALL validate against prohibited terms, AND SHALL reflect changes immediately. WHEN a customer updates their phone number, THE system SHALL validate international format using E.164 standards, SHALL store as standardized normalized format, AND SHALL update all existing references. WHEN a customer views their profile, THE system SHALL display complete verified information with last update timestamp.

## 3. Address Management

WHEN a customer adds a new shipping address, THE system SHALL require recipient name, phone, street address, city, state, postal code, and country, SHALL validate international postal codes, AND SHALL assign sequential identifier. WHEN a customer edits an address, THE system SHALL allow modifications to all fields except country, SHALL maintain historical records of changes, AND SHALL preserve address integrity. WHEN a customer sets a default address, THE system SHALL ensure only one default exists, SHALL update all future order deliveries, AND SHALL notify customer of current default status.

## 4. Seller Account Management

WHEN a new seller registers, THE system SHALL require email, password, business documents, AND SHALL queue for administrator review. WHEN a seller's account is pending, THE system SHALL display approval status, SHALL notify seller of review timeline, AND SHALL prevent selling attempts. WHEN an administrator rejects a seller, THE system SHALL require reason documentation, SHALL provide email notification with specific reason, AND SHALL allow new registration attempt. WHEN a seller deletes their account, THE system SHALL verify no pending orders, SHALL confirm account deletion with required warnings, AND SHALL process deletion only after all pending status validations.

## 5. Seller Profile Management

WHEN a seller updates their shop name, THE system SHALL validate uniqueness across all existing shops, SHALL display real-time availability status, AND SHALL update all references immediately. WHEN a seller modifies their description, THE system SHALL allow 500-character maximum, SHALL provide character counter, AND SHALL capture revision timestamp. WHEN a seller uploads a logo, THE system SHALL resize to 300x300px, SHALL validate image format, AND SHALL generate versioned filename. WHEN a customer views a seller profile, THE system SHALL display current shop name, description, logo, and active product count without historical snapshot access.

## 6. Product and Category Management

WHEN administrators create categories, THE system SHALL allow one-level subcategories, SHALL validate category names against predefined terms, AND SHALL prevent deletion of categories with existing products. WHEN sellers add products, THE system SHALL require product name (min 5 chars), description (min 10 chars), category selection, AND base price (min $0.01), AND SHALL prevent creation without at least one variant. WHEN sellers edit a product, THE system SHALL create immutable snapshot with all product fields, SHALL update current version, AND SHALL reflect changes to future customer views.

## 7. Snapshot Principle Implementation

WHEN any editable data is modified, THE system SHALL automatically create snapshot with timestamp, user ID, and before/after values, SHALL store in immutable data store, AND SHALL preserve forever regardless of subsequent deletions. WHEN a customer views product changes, THE system SHALL display complete change history with before/after fields, SHALL enable comparison of versions, AND SHALL prevent snapshot modification. WHEN administrators view snapshots, THE system SHALL allow filtering by entity type, timestamp range, OR user, AND SHALL display comprehensive metadata.

## 8. Product Listing and Search

WHEN customers search products, THE system SHALL return paginated results (12 per page), SHALL process name searches case-insensitively, AND SHALL apply search filters in real-time. WHEN filtering by category, THE system SHALL load hierarchical categories with parent/child relationships, SHALL highlight active filters, AND SHALL clear when user removes filter. WHEN customers sort by price, THE system SHALL sort products with variants by minimum price range, SHALL handle price variations clearly, AND SHALL update sort indicator in UI.

## 9. Wishlist Functionality

WHEN a customer adds a product to wishlist, THE system SHALL associate with their account, SHALL verify product exists, AND SHALL update wishlist timestamp. WHEN a customer views their wishlist, THE system SHALL display products with main image, name, and price range, SHALL paginate results (12 per page), AND SHALL show deletion confirmation prompt. WHEN a seller deletes a product, THE system SHALL automatically remove from all wishlists with notification to affected customers, AND SHALL update wishlist count metrics.

## 10. Shopping Cart Requirements

WHEN a customer adds a variant to cart, THE system SHALL check stock quantity, SHALL update existing cart item if identical variant, AND SHALL display current cart items count. WHEN a customer views cart, THE system SHALL display each variant with product name, selected options, price, quantity, and subtotal, SHALL calculate total accurately, AND SHALL display stock warnings for insufficient quantities. WHEN quantities change, THE system SHALL update total immediately, SHALL validate against stock limits, AND SHALL notify of cart adjustment success.

## 11. Checkout and Payment Flow

WHEN a customer proceeds to checkout, THE system SHALL validate cart contains purchasable items, SHALL verify shipping address exists, AND SHALL display order summary. WHEN payment is processed, THE system SHALL route through payment gateway integration, SHALL handle success/failure responses, AND SHALL create order only on payment success. WHEN payment fails, THE system SHALL display specific error message, SHALL allow retry with same cart, AND SHALL not modify inventory.

## 12. Order Processing Requirements

WHEN an order is created, THE system SHALL decrease variant stock by ordered quantities, SHALL remove items from cart, SHALL create order record with status 'paid', AND SHALL store snapshots of all ordered items including product variant details and seller profile. WHEN items are shipped, THE system SHALL update order status per item, SHALL record tracking information, AND SHALL provide tracking number to customer. WHEN an item is delivered, THE system SHALL update item status to 'delivered', SHALL enable review creation, AND SHALL update order summary.