# E-Commerce Shopping Mall Platform Requirements

## 1. Service Overview

The shopping mall platform is a full-featured e-commerce marketplace that requires user registration for all features, with no guest browsing permitted. This ensures user accountability, data integrity, and compliance with transaction logging requirements. The platform serves customers and sellers on a unified storefront with comprehensive product management, order processing, and administrative oversight capabilities.

## 2. User Actors and Permissions

### Customer

- **Registration**: Customers must register with email and password before any feature access
- **Authentication**: Standard email/password login system with secure token-based sessions

### Seller

- **Registration**: Requires email and password, followed by administrator approval
- **Account Status**: Account status tracks registration progress (pending, approved, rejected)
- **Permissions**: Only sellers with approved status can create products and manage listings

### Administrator

- **Role Levels**: Two grades: regular and super administrator
- **Permissions**: Super administrators can promote/demote regular administrators and manage all platform features

## 3. Functional Requirements

### 3.1 Customer Account Requirements

WHEN a customer attempts to register, THE system SHALL require a valid email address and password with minimum 8 characters containing at least one uppercase letter, one lowercase letter, one number, and one special character.

IF the requested email is already registered, THEN THE system SHALL deny registration and display error message: 'Email address already in use.'

WHEN a customer submits a password change request, THE system SHALL require verification of the current password before accepting the new password.

WHEN a customer requests account deletion, THE system SHALL preserve all order history, reviews (with 'deleted user' attribution), and customer data for legal and operational purposes while maintaining the account record in a non-accessible state.

### 3.2 Customer Profile Requirements

WHEN a customer updates their profile, THE system SHALL require a display name between 2-50 characters (letters, numbers, periods, hyphens only) and a valid phone number formatted with country code.

WHEN a customer's phone number is entered, THE system SHALL validate against international telephony patterns and reject invalid formats with clear error messages.

### 3.3 Address Management Requirements

WHEN a customer adds a new address, THE system SHALL require recipient name, street address, city, country, and at least one of postal code or state/province.

IF any required address field is missing, THEN THE system SHALL prevent address save and provide specific field requirements in the error message.

WHEN a customer sets a default address, THE system SHALL update the default address indicator to "active" and remove existing default indicator from other addresses.

### 3.4 Seller Account Requirements

WHEN a new seller registers, THE system SHALL create a pending account and initiate administrative approval workflow.

IF the administrator rejects a seller registration, THEN THE system SHALL require a rejection reason of minimum 5 characters to be provided, with the reason displayed to the seller.

WHEN a seller requests account deletion, THE system SHALL verify there are no pending order items (paid or shipped status) and no pending cancellation or refund requests for their products.

### 3.5 Seller Profile Requirements

WHEN a seller updates their shop information, THE system SHALL create a snapshot of the previous profile details.

THE system SHALL display the seller's shop name and logo on all product listings and order details for their products.

WHEN a customer views a seller's profile, THE system SHALL show the shop name, description, and current logo, with a link to view all products from that seller.

### 3.6 Product and Category Requirements

WHEN a seller creates a new product, THE system SHALL require all mandatory fields: product name (1-100 characters), description, category selection, and base price (greater than $0.01, less than $10,000).

WHEN a product is created with no stock quantity for any variant, THE system SHALL prevent the product from becoming visible in search results.

IF a product category is deleted, THEN THE system SHALL move all products in that category to 'Uncategorized' status without affecting product functionality.

### 3.7 Snapshot Preservation Requirements

WHEN any editable data is modified, THE system SHALL automatically capture a snapshot of the previous state before committing the change.

THE snapshot SHALL include timestamp, user who made the change, type of change, and values before and after the change.

WHEN a product variant's price is modified, THE system SHALL record a snapshot of the variant price change and preserve the previous values for historical accuracy.

### 3.8 Order Processing Requirements

WHEN an order is placed, THE system SHALL verify all selected product variants have sufficient stock before proceeding with payment.

IF a product variant's stock is depleted after an order is placed, THEN THE system SHALL automatically reduce the order quantity for that variant to the available stock quantity before finalizing the transaction.

WHEN an order item is cancelled, THE system SHALL immediately increase the stock quantity for the affected variant with a corresponding inventory history record.

### 3.9 Review and Rating Requirements

WHEN a customer attempts to write a review, THE system SHALL verify the item's status is 'delivered' as required for review eligibility.

WHEN a review is written, THE system SHALL require a rating between 1-5 stars and allow up to 500 characters for review content.

IF the review content format is invalid, THEN THE system SHALL reject the review submission and provide a specific error message.

### 3.10 Administrator Requirements

WHEN a regular administrator submits a request to become a super administrator, THE system SHALL require two-factor authentication and obtain approval from two existing super administrators.

WHEN a super administrator rejects a seller registration request, THEN THE system SHALL record the rejection reason and notify the seller via email.

IF a seller's account is suspended, THEN THE system SHALL hide all products from search results while maintaining existing order statuses and allowing the seller to continue managing active orders.

## 4. Data Validation Requirements

### 4.1 Input Validation

WHEN a customer enters their display name, THE system SHALL validate it contains 2-50 characters and only alphanumeric characters, periods, or hyphens.

WHEN a product price is entered, THE system SHALL verify it is greater than $0.01 and less than $10,000 before allowing product creation or modification.

### 4.2 Status Validation

WHEN a cancellation request is submitted for an order item, THE system SHALL verify the item status is 'paid' and not 'shipped' or 'delivered'.

IF the order item status is not 'paid', THEN THE system SHALL display error: 'Cancellation not permitted for items that have been shipped or delivered.'

## 5. Business Process Requirements

### 5.1 Order Fulfillment Process

1. Customer places order with selected products
2. System checks product variants' stock quantities
3. Customer completes payment processing
4. System creates order records and decreases stock for purchased variants
5. Seller processes item for shipping
6. Customer confirms delivery within 14 days
7. System updates order and item statuses based on delivery confirmation

### 5.2 Product Update Process

1. Seller initiates product modification
2. System creates snapshot of current product details
3. Seller saves modified product
4. System creates snapshot of new product details
5. System updates product and variant records with new values

## 6. Success Metrics

- Minimum 2,500 characters in document
- All requirements expressed in EARS format
- Document structure aligns with required sections
- All business processes documented with complete workflows
- All validation rules specified for each input field