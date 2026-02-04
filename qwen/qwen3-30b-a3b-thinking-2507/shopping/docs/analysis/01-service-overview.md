# Detailed Requirements Specification: E-Commerce Shopping Mall Platform

## 1. Core Principles

The Shopping Mall Platform operates under the following foundational principles:

- **Snapshot Principle**: Every editable data modification creates a historical record for compliance and dispute resolution
- **Legal-Compliant Data Preservation**: Account deletion preserves transactional data while anonymizing personal information
- **Business Continuity**: All operations maintain transaction integrity regardless of user account status
- **Transparent Data Handling**: Clear communication about data that will be preserved or deleted

## 2. Customer Account Management

### 2.1 Account Creation and Authentication

WHEN a new customer attempts to register WITH their email and password, THE system SHALL:
- ✅ Validate email format against RFC 5322 standards
- ✅ Require password strength of at least 12 characters with letter, number, and special character
- ✅ Store password using bcrypt with 12 cost factor
- ✅ Send account verification email with unique token
- ✅ Verify email address before account activation

WHEN a customer attempts to log in via email and password, THE system SHALL:
- ✅ Enforce maximum 5 failed login attempts per hour per email
- ✅ Lock accounts after 5 consecutive failures for 30 minutes
- ✅ Invalidate all active sessions after password change
- ✅ Provide secure password reset via verified email

### 2.2 Account Modification

WHEN a customer requests a password change, THE system SHALL:
- ✅ Require current password verification
- ✅ Require new password meeting strength requirements
- ✅ Send confirmation email of password change
- ✅ Invalidate all current sessions immediately after change

WHEN a customer initiates account deletion, THE system SHALL:
- ✅ Preserve all order history with "deleted user" designation
- ✅ Preserve all product reviews with anonymized attribution
- ✅ Delete all personal profile information (display name, phone number, address)
- ✅ Explicitly inform customers which data will be preserved before final deletion
- ✅ Require 48-hour waiting period between initiation and confirmation

## 3. Customer Profile and Address Management

### 3.1 Profile Management

WHEN a customer modifies their display name or phone number, THE system SHALL:
- ✅ Record a snapshot with timestamp and modifier ID
- ✅ Validate phone number format against E.164 standards
- ✅ Ensure display name contains only alphanumeric characters and spaces
- ✅ Preserve historical profile variations for audit purposes

### 3.2 Address Management

WHEN a customer adds a shipping address, THE system SHALL:
- ✅ Validate postal code format against country-specific standards
- ✅ Validate city and state/province against country datasets
- ✅ Require street address with building number
- ✅ Allow up to 5 shipping addresses per customer
- ✅ Record new address as non-default until explicitly set

WHEN a customer sets an address as default, THE system SHALL:
- ✅ Automatically set all other addresses to non-default
- ✅ Preserve historical address relationships
- ✅ Display default address in checkout summary prominently

## 4. Seller Account Management

### 4.1 Seller Registration

WHEN a new seller submits a registration request with email and password, THE system SHALL:
- ✅ Mark registration status as "pending"
- ✅ Initiate administrator review workflow
- ✅ Send confirmation email to seller

WHEN a seller registration is rejected, THE system SHALL:
- ✅ Require administrator to provide specific rejection reason
- ✅ Send detailed rejection explanation to seller
- ✅ Allow seller to submit new registration within 24 hours

### 4.2 Account Deletion

WHEN a seller requests account deletion, THE system SHALL:
- ✅ Check for pending order items (status: paid or shipped)
- ✅ Verify no pending cancellation or refund requests
- ✅ Only permit deletion when requirements are met

WHEN a seller account is deleted, THE system SHALL:
- ✅ Preserve all order history with shop name attribution
- ✅ Delete visible product listings immediately
- ✅ Maintain preserved order items in historical records
- ✅ Remove shop name from active product search results

## 5. Snapshot Preservation System

### 5.1 Snapshot Requirements

WHEN any editable business asset is modified, THE system SHALL:
- ✅ Create a snapshot with timestamp of modification
- ✅ Capture complete before-and-after values
- ✅ Record the identity of the modifier (user ID)
- ✅ Ensure snapshots are immutable
- ✅ Store snapshots in dedicated historical storage system

### 5.2 Snapshot Accessibility

WHEN a customer reviews their account deletion confirmation, THE system SHALL:
- ✅ Clearly state preserved data components
- ✅ Explicitly list preserved order history
- ✅ State the data retention period (6 years minimum)
- ✅ Provide access options for historical records

WHEN an administrator accesses a snapshot, THE system SHALL:
- ✅ Present before-and-after values clearly
- ✅ Show the complete modification history
- ✅ Restrict access to authorized personnel only
- ✅ Maintain audit trail of snapshot access

## 6. Product and Inventory Management

### 6.1 Product Lifecycle

WHEN a seller creates a new product, THE system SHALL:
- ✅ Require product name (min 3 characters, max 100)
- ✅ Require product description (min 10 characters)
- ✅ Require category selection from approved categories
- ✅ Assign base price (minimum $0.01)
- ✅ Create initial default variant

WHEN a seller deletes a product, THE system SHALL:
- ✅ Verify no active order items for any variant
- ✅ Confirm no pending cancellation/refund requests
- ✅ Delete product from search results immediately
- ✅ Preserve product snapshots and historical images for legal records

### 6.2 Inventory Handling

WHEN a seller adds inventory, THE system SHALL:
- ✅ Record quantity change as positive
- ✅ Require reason for restock (e.g., 'stock replenishment')
- ✅ Update current inventory count immediately
- ✅ Allow maximum restock quantity of 9999 per transaction

WHEN an order is placed, THE system SHALL:
- ✅ Create negative inventory record with quantity
- ✅ Record reason as "order" with order number
- ✅ Decrease current stock quantity by order quantity
- ✅ Automatically flag variants with stock = 0 as out of stock

## 7. Order Management System

### 7.1 Order Status Lifecycle

WHEN an order item is paid, THE system SHALL:
- ✅ Set item status to 'paid'
- ✅ Initiate seller fulfillment workflow
- ✅ Create snapshot of product details
- ✅ Add item to pending shipments for seller

WHEN a shipment is marked as delivered, THE system SHALL:
- ✅ Change item status to 'delivered'
- ✅ Calculate average rating for product
- ✅ Update product's active review count
- ✅ Trigger loyalty points calculation for customer

### 7.2 Order Cancellation

WHEN a customer requests cancellation for an item with status 'paid', THE system SHALL:
- ✅ Create a cancellation request with reason
- ✅ Notify seller with request details
- ✅ Allow seller to approve/reject within 24 hours
- ✅ If approved, update item status to 'cancelled'
- ✅ Return stock quantity via inventory adjustment

## 8. Seller Dashboard

### 8.1 Summary Metrics

WHEN a seller accesses their dashboard, THE system SHALL:
- ✅ Display total products (active and inactive)
- ✅ Show total order items across all orders
- ✅ Count pending cancellation requests
- ✅ Count pending refund requests
- ✅ Show average order fulfillment time

### 8.2 Order Item Filtering

WHEN a seller filters order items by status, THE system SHALL:
- ✅ Allow filtering by individual statuses
- ✅ Show current filter in UI clearly
- ✅ Maintain filter selection across pages
- ✅ Update count metrics in real-time

## 9. Administrator System

### 9.1 Seller Approval Workflow

WHEN an administrator reviews a seller registration, THE system SHALL:
- ✅ Display all registration details with submission timestamp
- ✅ Show all required seller information
- ✅ Present rejection reason input field when rejecting
- ✅ Require a reason for rejection
- ✅ Allow approval without restrictions

### 9.2 Account Suspension

WHEN an administrator suspends a seller account, THE system SHALL:
- ✅ Hide all products from search results
- ✅ Prevent new product listings
- ✅ Prevent product edits
- ✅ Maintain existing order processing capabilities
- ✅ Mark seller account as suspended in UI

## 10. Legal and Compliance

### 10.1 Data Retention

WHEN an account is deleted, THE system SHALL:
- ✅ Preserve all transactional data for minimum 6 years
- ✅ Preserve product history for minimum 6 years
- ✅ Anonymize customer profiles immediately after deletion
- ✅ Maintain full historical snapshots for dispute resolution
- ✅ Comply with GDPR, CCPA, and other applicable regulations

### 10.2 Audit Trail

WHEN any system operation occurs, THE system SHALL:
- ✅ Record user ID of performing action
- ✅ Timestamp all actions with millisecond precision
- ✅ Store all audit entries in dedicated immutable logs
- ✅ Include relevant business context within entries
- ✅ Allow administrator access to complete audit trails
