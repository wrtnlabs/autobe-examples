# E-Commerce Shopping Mall Platform Requirements

## Customer Account Management

WHEN a customer wants to register, THE system SHALL require email and password registration, with the email being unique and valid.

WHEN a customer submits registration details, THE system SHALL validate email format and password strength (minimum 12 characters, including special characters), and create an account.

WHEN a customer signs in with email and password, THE system SHALL authenticate credentials and grant access to the platform.

WHEN a customer requests password change, THE system SHALL require current password verification and create new password hash with password strength validation.

WHEN a customer requests account deletion, THE system SHALL remove their personal profile data but preserve their order history, reviews (displayed as 'deleted user'), and related metadata for legal compliance.

## Customer Profile Management

EVERY customer SHALL have a profile containing display name and phone number.

WHEN a customer updates their display name or phone number, THE system SHALL allow changes to be submitted and stored with timestamp of modification.

## Address Management

WHEN a customer adds a shipping address, THE system SHALL store recipient name, phone number, street address, city, state/province, postal code, and country.

WHEN a customer edits their address, THE system SHALL update the specific fields without altering other existing addresses.

WHEN a customer sets an address as default, THE system SHALL mark it as the primary shipping option for future orders.

## Seller Account Management

WHEN a seller registers, THE system SHALL require email and password and submit for administrator approval.

WHEN a seller requests password change, THE system SHALL require previous password verification and set new password hash.

WHEN a seller's account is rejected, THE system SHALL provide a rejection reason and allow resubmission.

WHEN a seller deletes their account, THE system SHALL ensure they have no pending orders (paid or shipped status) and no pending cancellation/refund requests.

## Seller Profile Management

EVERY seller SHALL have a profile containing shop name, description, and logo image.

WHEN a seller updates their shop name, description, or logo, THE system SHALL create a snapshot of the previous version.

## Categories

WHEN an administrator creates a category, THE system SHALL allow name and description creation with a hierarchical structure (one level of subcategories).

WHEN a customer browses categories, THE system SHALL display all categories with subcategories, allowing navigation to product listings.

## Snapshot Principle

WHEN editable data is modified, THE system SHALL immediately create an immutable snapshot recording: timestamp, details of change, and values before/after modification.

WHEN a product is edited, THE system SHALL preserve a snapshot of all product fields (name, description, category, pricing) and snapshots of all variants at the moment of change.

## Product Management

WHEN a seller creates a product, THE system SHALL require name, description, category, and base price.

WHEN a seller edits a product, THE system SHALL create a product snapshot and update the current version.

WHEN a seller deletes a product, THE system SHALL ensure no pending order items (paid or shipped status) for any product variant and no pending cancellation/refund requests, then preserve product history but remove from public listing.

## Product Variants and Inventory

WHEN a seller creates a variant, THE system SHALL require SKU code, option values, price (optional), and starting stock quantity.

WHEN a customer adds a variant to cart, THE system SHALL check stock quantity against current inventory.

WHEN stock reaches zero, THE system SHALL mark the variant as "out of stock" and remove from public visibility.

## Product Search

WHEN a customer searches products, THE system SHALL allow by name, with paginated results.

WHEN results are filtered by category or price range, THE system SHALL dynamically refine the product listing based on criteria.

## Order Management

WHEN an order is placed successfully, THE system SHALL decrease stock for purchased variants, create order records, update order status to "paid," and store snapshots of all product/variant/seller data.

WHEN an order item status changes, THE system SHALL update the order's overall status based on all item statuses.

## Order Cancellation

WHEN a customer requests cancellation of an item with status "paid," THE system SHALL store the request, allow seller approval/rejection, and create a snapshot upon seller response.

WHEN a cancellation is approved, THE system SHALL restore stock and adjust order status, while maintaining historical order data.

## Refund Requests

WHEN a customer requests refund for an item with status "delivered" within 7 days, THE system SHALL store the request and allow seller response.

WHEN a refund is approved, THE system SHALL restore stock and update item status, while maintaining complete order history.

## Reviews And Ratings

WHEN a customer makes a purchase and the item status is "delivered," THE system SHALL enable product reviews.

WHEN a customer submits a review, THE system SHALL record the rating (1-5 stars) and optional text.

## Seller Dashboard

WHEN a seller logs in, THE system SHALL display summary statistics: total products, order items, pending cancellations, pending refunds.

## Administrator System

WHEN an administrator reviews seller registration, THE system SHALL allow approval or rejection with reason provided.

WHEN an administrator suspends a seller, THE system SHALL hide their products from search and prevent new listings without halting existing order processing.

## Business Value Summary

WHEN users interact with the platform, THE system SHALL deliver a transparent, trustworthy environment with comprehensive audit trails while supporting seamless shopping and selling experiences through the snapshot mechanism, ensuring business continuity and customer trust.