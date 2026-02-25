# E-Commerce Shopping Mall Platform

## Service Overview

This platform is a comprehensive marketplace enabling customers to discover, purchase, and review products from multiple sellers while providing robust tools for seller management and administrative oversight. The system supports end-to-end shopping workflows with strict data preservation requirements through the snapshot principle.

## User Actors

- **Customer**: Registered users who can browse, purchase products, and manage shopping activities
- **Seller**: Registered sellers with approved accounts who can list products and manage their shop
- **Administrator**: System administrators with elevated permissions for platform management
- **Super Administrator**: Specialized administrators with authority to manage other administrators

## Core Business Requirements

### 1. Customer Account Management

WHEN a new customer registers with a valid email and password, THE system SHALL create a new account with default profile fields.

WHEN a customer attempts to register with an email already associated with another account, THE system SHALL reject registration with a friendly error message.

WHEN a customer deletes their account, THE system SHALL delete their profile information but preserve orders, order history, and reviews (displayed as 'deleted user').

### 2. Seller Account Approval System

WHEN a seller submits registration with valid credentials, THE system SHALL mark the account as 'pending approval' with no selling privileges.

WHEN an administrator reviews a pending registration, THE system SHALL update the status to either 'approved' or 'rejected' with a rejection reason if applicable.

WHEN a rejected seller resubmits a registration, THE system SHALL reset the approval status to 'pending' and require new submission.

### 3. Snapshot Principle Implementation

WHEN editable data is modified (products, seller profiles, reviews), THE system SHALL create a snapshot recording the exact timestamp, previous values, and the new values.

WHEN a product is edited, THE system SHALL create a product snapshot that includes all fields and snapshots of all variants at that moment.

WHEN a customer deletes a product, THE system SHALL preserve the product snapshot and associated variant snapshots even though the product becomes invisible in listings.

### 4. Product Management Requirements

#### Product Creation

WHEN a seller creates a new product with required fields (name, description, category, base price), THE system SHALL validate all required fields and create a new product record.

WHEN a product has no variants, THE system SHALL mark it as "unavailable" but still allow it to appear in search with that status label.

#### Product Deletion

WHEN a seller requests to delete a product, THE system SHALL verify no pending order items exist for any variant or pending cancellation/refund requests.

WHEN deletion is approved, THE system SHALL delete all variants and inventory records while preserving product and variant snapshots.

### 5. Performance Requirements

#### Search and Filter Performance

WHEN a customer performs a product search by name, THE system SHALL return the first page of results within 1.2 seconds for 95% of all search requests.

WHEN a customer applies all four filter options (category, price range, in-stock only, sorting), THE system SHALL return results within 1.5 seconds for 95% of all requests.

#### Catalog and Listing Performance

WHEN a customer navigates to a category listing page, THE system SHALL load the page including all product thumbnails within 1.5 seconds for 95% of all requests.

WHEN a customer views product listings with all filters applied, THE system SHALL load filtered results within 2.0 seconds for 95% of all requests.

#### Checkout Process

WHEN a customer proceeds to checkout, THE system SHALL load the checkout page within 1.0 seconds for 95% of all requests.

WHEN a customer confirms their order, THE system SHALL process the request and display confirmation within 1.5 seconds for 95% of all requests.

### 6. Order Status Management

#### Order Item Status

WHEN an order item is paid but not shipped, THE system SHALL display status as 'paid'.

WHEN a seller ships an item, THE system SHALL update all items in the shipment to 'shipped' status and provide tracking information.

WHEN a customer confirms delivery for a shipment, THE system SHALL update all items in that shipment to 'delivered' status.

#### Order Status Aggregation

WHEN all items in an order are paid, THE system SHALL display the order status as 'paid'.

WHEN any item is shipped but not all delivered, THE system SHALL display the order status as 'shipped'.

WHEN all items are delivered, THE system SHALL display the order status as 'delivered'.

### 7. Seller and Product Management

WHEN a seller edits their shop profile, THE system SHALL create a new snapshot of the shop's current state.

WHEN a seller manages product variants, THE system SHALL validate against stock quantities before allowing changes to be saved.

WHEN an administrator reviews a seller registration, THE system SHALL provide the ability to approve with no reason or reject with a specific reason.

## Authentication and Authorization

### Authentication Workflow

WHEN a user attempts to log in with valid credentials, THE system SHALL authenticate and provide access to appropriate features based on user role.

WHEN a user's session expires, THE system SHALL automatically log them out and redirect to login page within 30 minutes of inactivity.

### Authorization Rules

WHEN a customer attempts to access seller-specific features, THE system SHALL deny access and display an appropriate error message.

WHEN a regular administrator attempts to promote another administrator to super admin, THE system SHALL deny permission and require verification from a super administrator.

## Administrative Functions

### Seller Management

WHEN an administrator suspends a seller, THE system SHALL hide all products from listings while allowing existing order processing.

WHEN an administrator reinstates a suspended seller, THE system SHALL immediately restore product visibility and accessibility.

### Product Oversight

WHEN an administrator views a product snapshot, THE system SHALL display the full state of the product and all variants at that moment in history.

WHEN an administrator deletes a product for policy violation, THE system SHALL permanently remove visibility but preserve all snapshots.

## Conclusion

This specification defines the complete business requirements for the e-commerce shopping mall platform. All requirements are stated in EARS format to ensure they are testable, measurable, and clear. The document incorporates specific performance requirements from 07-performance-requirements.md to ensure user experience meets critical benchmarks. The snapshot principle ensures all data modifications are fully auditable for dispute resolution, and all business processes are documented to guide development.