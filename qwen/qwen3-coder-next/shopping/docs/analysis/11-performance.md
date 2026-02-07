# E-Commerce Shopping Mall Platform - Functional Requirements Specification

## Document Purpose

This document provides comprehensive functional requirements for the E-Commerce Shopping Mall Platform, covering all aspects from user registration to order management and administration. These requirements serve as the authoritative specification for backend development teams building this no-code e-commerce solution.

## Table of Contents

1. [User Authentication and Authorization](#1-user-authentication-and-authorization)
2. [Customer Account Management](#2-customer-account-management)
3. [Customer Profile Management](#3-customer-profile-management)
4. [Address Management](#4-address-management)
5. [Seller Account Management](#5-seller-account-management)
6. [Seller Profile Management](#6-seller-profile-management)
7. [Category Management](#7-category-management)
8. [Product Management](#8-product-management)
9. [Product Variants and Inventory](#9-product-variants-and-inventory)
10. [Product Search and Listing](#10-product-search-and-listing)
11. [Wishlist Management](#11-wishlist-management)
12. [Shopping Cart](#12-shopping-cart)
13. [Order Processing](#13-order-processing)
14. [Payment Processing](#14-payment-processing)
15. [Order Management](#15-order-management)
16. [Shipping and Tracking](#16-shipping-and-tracking)
17. [Cancellation and Refund Systems](#17-cancellation-and-refund-systems)
18. [Review and Rating System](#18-review-and-rating-system)
19. [Seller Dashboard](#19-seller-dashboard)
20. [Administrator System](#20-administrator-system)
21. [Snapshot System](#21-snapshot-system)

---

## 1. User Authentication and Authorization

### 1.1 User Accounts and Login

**Authentication System Overview**

- WHEN a user visits the platform without authentication, THE system SHALL redirect them to the login page or require login for any feature access.
- WHEN a customer registers with email and password, THE system SHALL create a new account with unique email validation.
- WHEN a customer logs in with email and password, THE system SHALL authenticate credentials and establish a secure session.
- WHEN a customer changes their password, THE system SHALL require current password verification before applying the new password.
- WHEN a customer deletes their account, THE system SHALL permanently remove personal data while preserving orders and reviews as required.

**Customer Account Deletion**

- WHEN a customer deletes their account, THE system SHALL immediately remove all profile information including display name and phone number.
- WHEN a customer deletes their account, THE system SHALL preserve all order history and order items for seller records and legal compliance.
- WHEN a customer deletes their account, THE system SHALL preserve all reviews but display them with "deleted user" identifier instead of the customer's name.
- WHEN a customer deletes their account, THE system SHALL immediately terminate all active sessions for that user.

**Seller Account Management**

- WHEN a seller registers with email and password, THE system SHALL create a seller account with "pending" approval status.
- WHEN a seller logs in with email and password, THE system SHALL authenticate credentials and check account approval status.
- WHEN a seller changes their password, THE system SHALL require current password verification before applying the new password.
- WHEN a seller deletes their account, THE system SHALL only allow deletion if no pending orders (paid or shipped status) exist.
- WHEN a seller deletes their account, THE system SHALL only allow deletion if no pending cancellation or refund requests exist.
- WHEN a seller deletes their account, THE system SHALL remove all active products from listings but preserve order history and product snapshots.
- WHEN a seller deletes their account, THE system SHALL preserve shop name references in past orders for audit trail completeness.

### 1.2 Permission-Based Access Control

**Customer Permissions**

- WHEN a customer accesses customer-only features, THE system SHALL verify authentication and grant access based on account status.
- WHEN a customer attempts to access unauthorized features, THE system SHALL return appropriate error response with permission denial message.
- WHEN a customer accesses order management, THE system SHALL only show orders associated with that customer's account.

**Seller Permissions**

- WHEN a seller accesses seller-only features, THE system SHALL verify authentication and check account approval status.
- WHEN a seller with pending approval attempts to access selling features, THE system SHALL deny access and display approval status.
- WHEN a seller with rejected approval attempts to access selling features, THE system SHALL deny access and show rejection reason if provided.
- WHEN an approved seller accesses product management, THE system SHALL only allow management of products owned by that seller.

**Administrator Permissions**

- WHEN an administrator accesses admin-only features, THE system SHALL verify authentication and administrator grade (regular or super).
- WHEN a regular administrator attempts admin operations requiring super privileges, THE system SHALL deny access with appropriate error message.
- WHEN an administrator bans a user, THE system SHALL log the ban action with administrator ID and timestamp for audit trail.

---

## 2. Customer Account Management

### 2.1 Account Registration and Profile

**Registration Process**

- WHEN a user registers as a customer with email and password, THE system SHALL create an account with initial status "active".
- WHEN a customer submits registration information, THE system SHALL validate email format and password strength requirements.
- WHEN registration is successful, THE system SHALL automatically log the customer in and create a secure session.
- WHEN email already exists, THE system SHALL return error indicating email is already registered.

**Account Configuration**

- WHEN a customer completes registration, THE system SHALL create an empty customer profile with only email information.
- WHEN a customer logs in for the first time, THE system SHALL prompt them to complete profile setup including display name and phone number.

### 2.2 Account Security and Management

**Password Management**

- WHEN a customer requests password change, THE system SHALL require verification of current password before accepting new password.
- WHEN password change is successful, THE system SHALL immediately invalidate all existing sessions and require re-authentication.
- WHEN a customer attempts to set a weak password, THE system SHALL provide specific guidance for stronger password requirements.

**Account Deletion Process**

- WHEN a customer initiates account deletion, THE system SHALL require password verification for security.
- WHEN account deletion is confirmed, THE system SHALL immediately display confirmation message and log the user out.
- WHEN account deletion completes, THE system SHALL permanently remove profile information but preserve related business data.

---

## 3. Customer Profile Management

### 3.1 Profile Information and Editing

**Profile Structure**

- WHEN a customer profile is created, THE system SHALL initialize with display name and phone number fields.
- WHEN a customer profile is displayed, THE system SHALL show current values for display name and phone number.

**Profile Editing**

- WHEN a customer edits their display name, THE system SHALL update the profile with new value and return success confirmation.
- WHEN a customer edits their phone number, THE system SHALL validate phone format and update the profile.
- WHEN profile editing fails validation, THE system SHALL return specific error messages for each invalid field.
- WHEN profile editing is successful, THE system SHALL return updated profile information.

---

## 4. Address Management

### 4.1 Address Operations

**Address Creation and Validation**

- WHEN a customer adds a new address, THE system SHALL require all address fields: recipient name, phone number, street address, city, state/province, postal code, country.
- WHEN address validation fails, THE system SHALL return specific error messages for each missing or invalid field.
- WHEN address is successfully added, THE system SHALL return the complete address with generated ID.

**Address Management**

- WHEN a customer edits an existing address, THE system SHALL update the address with new values and return updated address data.
- WHEN a customer deletes an address, THE system SHALL remove the address from their address list and return success confirmation.
- WHEN a customer has no addresses, THE system SHALL indicate this state when address list is requested.

**Default Address Management**

- WHEN a customer sets an address as default, THE system SHALL update the default flag and clear any existing default address.
- WHEN a customer has a default address, THE system SHALL return it when default address is requested.
- WHEN a customer has no default address, THE system SHALL return error or null when default address is requested.

---

## 5. Seller Account Management

### 5.1 Registration and Approval Process

**Seller Registration**

- WHEN a user registers as a seller with email and password, THE system SHALL create a seller account with "pending" approval status.
- WHEN registration is successful, THE system SHALL require email verification before the seller can log in.
- WHEN a pending seller attempts to log in, THE system SHALL display their approval status and next steps.

**Approval Workflow**

- WHEN a seller is pending approval, THE system SHALL allow access to limited features but prevent selling activities.
- WHEN a seller is approved, THE system SHALL enable all seller features and notify the seller via email.
- WHEN a seller is rejected, THE system SHALL provide rejection reason and allow resubmission with new information.
- WHEN a seller resubmits registration, THE system SHALL create new approval request and reset approval status to "pending".

**Account Deletion Validation**

- WHEN a seller requests account deletion, THE system SHALL check for pending orders (paid or shipped status).
- WHEN pending orders exist, THE system SHALL prevent account deletion and return specific error with order details.
- WHEN pending cancellation or refund requests exist, THE system SHALL prevent account deletion and return specific error.
- WHEN no pending items exist, THE system SHALL allow account deletion and process removal of seller data.

### 5.2 Account Status Management

**Suspension and Unsuspension**

- WHEN an administrator suspends a seller account, THE system SHALL immediately hide all seller products from search and listings.
- WHEN products are hidden, THE system SHALL return 0 items when customer searches or browses by that seller.
- WHEN a suspended seller attempts to access product management, THE system SHALL deny access and display suspension status.
- WHEN an administrator unsuspends a seller account, THE system SHALL immediately make products visible again.
- WHEN suspended seller can still access order management, THE system SHALL allow processing of existing orders.

---

## 6. Seller Profile Management

### 6.1 Profile Operations and Snapshots

**Profile Creation and Editing**

- WHEN a seller creates their profile, THE system SHALL require shop name, shop description, and logo image.
- WHEN a seller edits their shop name, THE system SHALL create a profile snapshot recording the change.
- WHEN a seller edits their description, THE system SHALL create a profile snapshot recording the change.
- WHEN a seller changes their logo image, THE system SHALL create a profile snapshot and upload new image.

**Profile Display and Access**

- WHEN customers view a seller profile, THE system SHALL display shop name, description, and logo.
- WHEN customers view a seller profile, THE system SHALL show the most recent profile snapshot timestamp.
- WHEN a seller's shop name appears in order history, THE system SHALL use the snapshot value from time of purchase.

**Profile Snapshots**

- WHEN a profile snapshot is created, THE system SHALL record timestamp, seller ID, and all profile field values.
- WHEN a snapshot is created, THE system SHALL preserve the previous state before any changes are applied.
- WHEN profile snapshots are requested, THE system SHALL return chronological list with timestamps.

---

## 7. Category Management

### 7.1 Category Structure and Hierarchy

**Category Creation and Organization**

- WHEN administrators create categories, THE system SHALL support one level of subcategory nesting only.
- WHEN a category is created, THE system SHALL require name and description fields.
- WHEN categories are displayed, THE system SHALL show parent-child relationships and nesting structure.

**Category Management**

- WHEN a category is edited, THE system SHALL update category name and/or description as specified.
- WHEN a category is deleted, THE system SHALL set all products in that category to "uncategorized" status.
- WHEN categories are listed for product creation, THE system SHALL show hierarchical structure with subcategories indented.

---

## 8. Product Management

### 8.1 Product Creation and Editing

**Product Requirements**

- WHEN a seller creates a product, THE system SHALL require product name, description, category selection, and base price.
- WHEN product creation is successful, THE system SHALL return created product with generated ID and initial status.
- WHEN product validation fails, THE system SHALL return specific error messages for each missing or invalid field.

**Product Editing**

- WHEN a seller edits their product, THE system SHALL create a product snapshot preserving the previous state.
- WHEN product editing fails validation, THE system SHALL return specific error messages without applying changes.
- WHEN product editing is successful, THE system SHALL return updated product information.

**Product Deletion Validation**

- WHEN a seller requests product deletion, THE system SHALL check for pending order items (paid or shipped status).
- WHEN pending order items exist, THE system SHALL prevent deletion and return specific error with order details.
- WHEN pending cancellation or refund requests exist, THE system SHALL prevent deletion and return specific error.
- WHEN no pending items exist, THE system SHALL delete product and all its variants.
- WHEN product deletion completes, THE system SHALL return success confirmation.

### 8.2 Product Visibility and Status

**Active and Inactive Status**

- WHEN a product is deleted by seller, THE system SHALL immediately remove it from search results and category listings.
- WHEN a product is suspended by administrator, THE system SHALL immediately hide it from public listings.
- WHEN a product has no variants, THE system SHALL display it as "unavailable" but keep it visible in search results.

---

## 9. Product Variants and Inventory

### 9.1 Variant Management

**Variant Creation and Configuration**

- WHEN a seller adds variants to their product, THE system SHALL require SKU code, option values, and stock quantity.
- WHEN variant creation is successful, THE system SHALL return created variant with generated ID and inventory record.
- WHEN duplicate SKU code is detected, THE system SHALL return error indicating SKU must be unique per product.

**Variant Editing**

- WHEN a seller edits a variant, THE system SHALL create a variant snapshot preserving the previous state.
- WHEN variant editing fails validation, THE system SHALL return specific error messages without applying changes.
- WHEN a product must have at least one variant, THE system SHALL prevent deletion of last variant if product is active.

**Variant Deletion Validation**

- WHEN a seller requests variant deletion, THE system SHALL check for pending order items (paid or shipped status).
- WHEN pending order items exist, THE system SHALL prevent deletion and return specific error with order details.
- WHEN pending cancellation or refund requests exist, THE system SHALL prevent deletion and return specific error.
- WHEN no pending items exist, THE system SHALL delete variant and return success confirmation.

### 9.2 Inventory Management

**Inventory Operations**

- WHEN inventory is added to a variant, THE system SHALL create an inventory record with positive quantity and reason.
- WHEN inventory is subtracted from a variant, THE system SHALL create an inventory record with negative quantity and reason.
- WHEN order placement reduces inventory, THE system SHALL create negative inventory record with reason "order_placed".
- WHEN order cancellation restores inventory, THE system SHALL create positive inventory record with reason "order_cancelled".
- WHEN refund restores inventory, THE system SHALL create positive inventory record with reason "refund_processed".

**Inventory Display and Status**

- WHEN inventory is viewed, THE system SHALL calculate current stock by summing all inventory records.
- WHEN stock reaches 0, THE system SHALL display variant as "out of stock" and prevent addition to cart.
- WHEN inventory history is requested, THE system SHALL return chronological list with timestamps and reasons.

---

## 10. Product Search and Listing

### 10.1 Search Functionality

**Basic Search**

- WHEN a customer searches products by name, THE system SHALL search across all sellers and return matching results.
- WHEN search results are returned, THE system SHALL include product name, main image, base price, seller shop name, and average rating.
- WHEN no products match search, THE system SHALL return empty results with appropriate message.

**Advanced Filtering**

- WHEN a customer filters by category, THE system SHALL return only products in that category and subcategories.
- WHEN a customer filters by price range, THE system SHALL return only products with prices within the specified range.
- WHEN a customer filters by in-stock only, THE system SHALL return only products with variants having stock > 0.

**Sorting Options**

- WHEN a customer sorts by newest first, THE system SHALL order results by creation date descending.
- WHEN a customer sorts by price low to high, THE system SHALL order results by base price ascending.
- WHEN a customer sorts by price high to low, THE system SHALL order results by base price descending.

**Pagination**

- WHEN a customer requests a specific page, THE system SHALL return products for that page with total count.
- WHEN pagination parameters are invalid, THE system SHALL return error with valid parameter range.

### 10.2 Product Listing Display

**Listing Format**

- WHEN product list is displayed, THE system SHALL show main image thumbnail, name, base price, seller shop name.
- WHEN product has variants with different prices, THE system SHALL display price range (e.g., "$10 - $20").
- WHEN product has no variants, THE system SHALL display "unavailable" status and disable purchase.

---

## 11. Wishlist Management

### 11.1 Wishlist Operations

**Wishlist Management**

- WHEN a customer adds a product to their wishlist, THE system SHALL create wishlist entry and return success confirmation.
- WHEN a customer views their wishlist, THE system SHALL return paginated list of products in their wishlist.
- WHEN a customer removes a product from their wishlist, THE system SHALL delete wishlist entry and return success confirmation.

**Wishlist Persistence**

- WHEN a product is deleted by seller, THE system SHALL automatically remove it from all customer wishlists.
- WHEN a product becomes unavailable, THE system SHALL mark it as unavailable in wishlists but retain wishlist entry.

---

## 12. Shopping Cart

### 12.1 Cart Operations

**Cart Management**

- WHEN a customer adds a variant to their cart, THE system SHALL require specific variant selection and quantity.
- WHEN same variant already in cart, THE system SHALL combine quantities rather than create duplicate entries.
- WHEN customer views their cart, THE system SHALL display each item with product name, variant options, price, quantity, and subtotal.
- WHEN cart total is calculated, THE system SHALL sum all item subtotals for grand total.

**Cart Validation and Warnings**

- WHEN variant stock is less than cart quantity, THE system SHALL display warning but allow checkout.
- WHEN variant is deleted or out of stock, THE system SHALL mark it as unavailable in cart with clear indication.
- WHEN customer attempts to checkout with unavailable items, THE system SHALL prevent checkout and return error.

**Cart Modification**

- WHEN customer changes item quantity, THE system SHALL update cart and recalculate totals.
- WHEN customer removes item from cart, THE system SHALL remove entry and recalculate totals.
- WHEN cart becomes empty after modification, THE system SHALL indicate empty cart state.

---

## 13. Order Processing

### 13.1 Order Creation Process

**Order Placement**

- WHEN customer proceeds to checkout, THE system SHALL require shipping address selection or use default.
- WHEN customer reviews order summary, THE system SHALL display list of items with prices, shipping address, and total price.
- WHEN customer confirms and places order, THE system SHALL process payment and create order upon payment success.
- WHEN payment fails, THE system SHALL return error and preserve cart state for retry.

**Order Creation**

- WHEN order is successfully placed, THE system SHALL decrease stock quantities for each purchased variant.
- WHEN order is successfully placed, THE system SHALL remove items from customer's cart.
- WHEN order is successfully placed, THE system SHALL create order record with unique order number.
- WHEN order is successfully placed, THE system SHALL create order items with status "paid".
- WHEN order is successfully placed, THE system SHALL save product and variant snapshots for each order item.
- WHEN order is successfully placed, THE system SHALL save seller profile snapshots for each order item.

**Order Structure**

- WHEN order contains multiple items, THE system SHALL allow items from different sellers.
- WHEN order contains items from same seller, THE system SHALL group them for potential shipment bundling.
- WHEN order item quantity is specified, THE system SHALL store exact quantity purchased.

---

## 14. Payment Processing

### 14.1 Payment Integration

**Payment Workflow**

- WHEN customer confirms order, THE system SHALL initiate payment through external payment gateway integration.
- WHEN payment succeeds, THE system SHALL create order record and proceed with order fulfillment.
- WHEN payment fails, THE system SHALL return error message and preserve cart state for retry.
- WHEN payment timeout occurs, THE system SHALL indicate timeout state and allow retry.

**Payment Security**

- WHEN payment processing occurs, THE system SHALL encrypt all sensitive payment information.
- WHEN payment gateway response is received, THE system SHALL validate response authenticity.

---

## 15. Order Management

### 15.1 Order Status and History

**Order Status Workflow**

**Order Item Status**

- WHEN item status is "paid", THE system SHALL indicate payment completed and waiting for seller to ship.
- WHEN item status is "shipped", THE system SHALL indicate seller has shipped the item.
- WHEN item status is "delivered", THE system SHALL indicate item has been delivered to customer.
- WHEN item status is "cancelled", THE system SHALL indicate item was cancelled and refund processed.
- WHEN item status is "refunded", THE system SHALL indicate item was refunded.

**Order Status Calculation**

- WHEN all items in order are "paid", THE system SHALL set order status to "paid".
- WHEN any item is "shipped" and none "delivered", THE system SHALL set order status to "shipped".
- WHEN all items in order are "delivered", THE system SHALL set order status to "delivered".
- WHEN all items in order are "cancelled", THE system SHALL set order status to "cancelled".
- WHEN all items in order are "refunded", THE system SHALL set order status to "refunded".
- WHEN order has mixed states, THE system SHALL set order status to "partially completed".

**Order History Display**

- WHEN customer views order history, THE system SHALL return paginated list sorted by newest first.
- WHEN order list is displayed, THE system SHALL show order number, date, total price, and overall status.
- WHEN order details are requested, THE system SHALL show list of items with product name, variant, quantity, price, and status.

**Order Snapshots**

- WHEN product snapshot is created for order item, THE system SHALL preserve product name, description, and images.
- WHEN variant snapshot is created for order item, THE system SHALL preserve SKU code, option values, and price.
- WHEN seller profile snapshot is created for order item, THE system SHALL preserve shop name and logo at purchase time.

---

## 16. Shipping and Tracking

### 16.1 Shipment Management

**Shipment Creation**

- WHEN seller ships items, THE system SHALL allow selection of one or more items from their products.
- WHEN shipment is created, THE system SHALL require carrier name and tracking number.
- WHEN shipment is created, THE system SHALL create shipment record with tracking information.
- WHEN shipment is created, THE system SHALL change all included items to "shipped" status.

**Shipment Display**

- WHEN customer views shipment, THE system SHALL show which items are included in that shipment.
- WHEN customer views tracking, THE system SHALL display carrier name and tracking number.
- WHEN customer views tracking, THE system SHALL provide tracking link if carrier supports it.

**Delivery Confirmation**

- WHEN customer confirms delivery, THE system SHALL change all items in that shipment to "delivered" status.
- WHEN no confirmation occurs, THE system SHALL automatically change items to "delivered" after 14 days.

---

## 17. Cancellation and Refund Systems

### 17.1 Order Cancellation

**Cancellation Request**

- WHEN customer requests cancellation, THE system SHALL require reason text and target specific order item.
- WHEN cancellation request is submitted, THE system SHALL change item status to "cancellation_requested".
- WHEN seller approves cancellation, THE system SHALL change item status to "cancelled" and restore stock.
- WHEN seller rejects cancellation, THE system SHALL notify customer and restore item status.
- WHEN all items in order are cancelled, THE system SHALL set order status to "cancelled".

**Snapshot Requirements**

- WHEN cancellation request state changes, THE system SHALL create snapshot of request with timestamp and status.
- WHEN cancellation is processed, THE system SHALL record the change in inventory history.

### 17.2 Refund Requests

**Refund Workflow**

- WHEN customer requests refund, THE system SHALL require reason text and target specific order item.
- WHEN refund request is submitted, THE system SHALL validate item status is "delivered" and within 7 days.
- WHEN seller approves refund, THE system SHALL process refund and change item status to "refunded".
- WHEN seller rejects refund, THE system SHALL notify customer and maintain current item status.
- WHEN all items in order are refunded, THE system SHALL set order status to "refunded".

**Inventory Restoration**

- WHEN refund is approved, THE system SHALL create positive inventory record and restore stock quantity.
- WHEN refund is processed, THE system SHALL record refund transaction for financial reconciliation.

---

## 18. Review and Rating System

### 18.1 Review Creation and Management

**Review Eligibility**

- WHEN customer writes review, THE system SHALL verify item status is "delivered" and associated with customer order.
- WHEN customer writes review, THE system SHALL require rating between 1 and 5 stars.
- WHEN customer writes review, THE system SHALL allow optional text content.
- WHEN customer writes review, THE system SHALL restrict one review per product per order.

**Review Editing and Deletion**

- WHEN customer edits review, THE system SHALL create review snapshot and preserve previous version.
- WHEN customer deletes review, THE system SHALL mark it as deleted but preserve snapshot for audit.
- WHEN review is deleted, THE system SHALL exclude it from average rating calculation.

**Rating Calculation**

- WHEN average rating is calculated, THE system SHALL average all non-deleted ratings for the product.
- WHEN review count is displayed, THE system SHALL count all non-deleted reviews for the product.
- WHEN no reviews exist, THE system SHALL display "No reviews yet" or similar message.

---

## 19. Seller Dashboard

### 19.1 Dashboard Features

**Dashboard Summary**

- WHEN seller views dashboard, THE system SHALL display total products count.
- WHEN seller views dashboard, THE system SHALL display total order items count for their products.
- WHEN seller views dashboard, THE system SHALL display pending cancellation requests count.
- WHEN seller views dashboard, THE system SHALL display pending refund requests count.

**Order Management**

- WHEN seller views order items, THE system SHALL display list filtered by their products.
- WHEN seller filters by status, THE system SHALL return items matching specified status.
- WHEN seller reviews pending requests, THE system SHALL display list with customer details and reasons.

---

## 20. Administrator System

### 20.1 Administrator Management

**Administrator Creation**

- WHEN user submits administrator request, THE system SHALL require reason text.
- WHEN request is submitted, THE system SHALL set status to "pending".
- WHEN super administrator approves request, THE system SHALL promote user to administrator.
- WHEN super administrator rejects request, THE system SHALL preserve request for audit.

**Administrator Grades**

- WHEN super administrator promotes regular administrator, THE system SHALL update grade to "super".
- WHEN super administrator demotes another super administrator, THE system SHALL update grade to "regular".
- WHEN super administrator attempts self-demotion, THE system SHALL prevent the action.

### 20.2 Seller Management

**Seller Approval**

- WHEN administrator reviews pending seller approval, THE system SHALL display list with registration details.
- WHEN administrator approves seller, THE system SHALL set status to "approved" and notify seller.
- WHEN administrator rejects seller, THE system SHALL require rejection reason and notify seller.
- WHEN seller resubmits, THE system SHALL create new approval request.

**Seller Oversight**

- WHEN administrator suspends seller, THE system SHALL hide products and prevent new product creation.
- WHEN administrator unsuspends seller, THE system SHALL make products visible again.
- WHEN administrator bans seller, THE system SHALL prevent login but maintain existing order processing.

### 20.3 Category Management

**Category Operations**

- WHEN administrator creates category, THE system SHALL require name, description, and optional parent category.
- WHEN administrator edits category, THE system SHALL update name and/or description.
- WHEN administrator deletes category, THE system SHALL set products in category to "uncategorized".

### 20.4 Product Oversight

**Product Management**

- WHEN administrator views products, THE system SHALL display all products on platform.
- WHEN administrator views snapshots, THE system SHALL display snapshots for any product.
- WHEN administrator deletes product, THE system SHALL remove product and notify seller.

### 20.5 Order Oversight

**Order Management**

- WHEN administrator views orders, THE system SHALL display all orders on platform.
- WHEN administrator force-cancels item, THE system SHALL cancel item, refund customer, and restore stock.
- WHEN administrator force-refunds item, THE system SHALL refund customer and restore stock.

### 20.6 User Management

**User Oversight**

- WHEN administrator views customers, THE system SHALL display all customer accounts.
- WHEN administrator bans customer, THE system SHALL prevent login and notify customer.
- WHEN administrator unbans customer, THE system SHALL restore login capability.
- WHEN administrator views sellers, THE system SHALL display all seller accounts.
- WHEN administrator bans seller, THE system SHALL prevent login but maintain order processing.

---

## 21. Snapshot System

### 21.1 Snapshot Requirements

**Snapshot Creation Triggers**

- WHEN product is edited, THE system SHALL create product snapshot preserving all fields at time of edit.
- WHEN product variant is edited, THE system SHALL create variant snapshot preserving all fields.
- WHEN seller profile is edited, THE system SHALL create profile snapshot preserving shop name and description.
- WHEN order item is created, THE system SHALL create product, variant, and seller profile snapshots.
- WHEN review is edited, THE system SHALL create review snapshot preserving previous state.
- WHEN cancellation request status changes, THE system SHALL create snapshot of request state.
- WHEN refund request status changes, THE system SHALL create snapshot of request state.

**Snapshot Structure**

**Product Snapshot**

- WHEN product snapshot is created, THE system SHALL preserve all product fields including images.
- WHEN product snapshot is created, THE system SHALL preserve snapshots of all variants at that moment.
- WHEN product snapshot is accessed, THE system SHALL display complete state as it existed at snapshot time.

**Variant Snapshot**

- WHEN variant snapshot is created, THE system SHALL preserve SKU code, option values, and price.
- WHEN variant snapshot is created, THE system SHALL preserve inventory snapshot if applicable.

**Profile Snapshots**

- WHEN seller profile snapshot is created, THE system SHALL preserve shop name, description, and logo.
- WHEN seller profile snapshot is accessed, THE system SHALL display profile as it existed at snapshot time.

**Immutable Storage**

- WHEN snapshot is created, THE system SHALL prevent any modification to snapshot data.
- WHEN snapshot is created, THE system SHALL preserve snapshot for audit and dispute resolution.
- WHEN snapshot is requested, THE system SHALL return unmodified historical state.

---

## Document Information

**Document Type**: Requirements Specification

**Target Audience**: Backend Development Team

**Purpose**: Provides comprehensive functional requirements for building the E-Commerce Shopping Mall Platform backend system

**Next Steps**: Backend developers will use this document to design and implement the API specifications, database schema, and business logic according to the requirements defined in this document.

**Version**: 1.0

**Last Updated**: 2026-02-06
