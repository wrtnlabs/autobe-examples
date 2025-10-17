# User Flow Documentation for E-commerce Shopping Mall Platform

## User Registration and Login

### User Journey

1. **Guest User**:
   - Browses the product catalog
   - Adds items to the cart
   - Proceeds to checkout
   - Creates an account during checkout
   - Logs in to complete the purchase

2. **Registered User**:
   - Logs in to the platform
   - Views their profile and order history
   - Updates their personal information
   - Manages their addresses

### Interaction Flow

- **Guest User**:
  - WHEN a guest adds an item to the cart, THE system SHALL prompt them to create an account or log in to proceed to checkout.
  - WHEN a guest creates an account, THE system SHALL verify their email address and send a confirmation email.
  - WHEN a guest logs in, THE system SHALL authenticate their credentials and grant access to their account.

- **Registered User**:
  - WHEN a user logs in, THE system SHALL authenticate their credentials and grant access to their account.
  - WHEN a user updates their profile, THE system SHALL validate the input and update their information.
  - WHEN a user manages their addresses, THE system SHALL allow them to add, edit, or delete addresses.

## Product Catalog and Search

### User Journey

1. **Guest User**:
   - Browses the product catalog
   - Searches for products using keywords
   - Filters products by categories, price range, and ratings
   - Views product details

2. **Registered User**:
   - Browses the product catalog
   - Searches for products using keywords
   - Filters products by categories, price range, and ratings
   - Views product details
   - Adds items to the wishlist

### Interaction Flow

- **Guest User**:
  - WHEN a guest searches for products, THE system SHALL display a list of matching products.
  - WHEN a guest filters products, THE system SHALL update the list based on the selected criteria.
  - WHEN a guest views product details, THE system SHALL display the product information, including images, description, and price.

- **Registered User**:
  - WHEN a user searches for products, THE system SHALL display a list of matching products.
  - WHEN a user filters products, THE system SHALL update the list based on the selected criteria.
  - WHEN a user views product details, THE system SHALL display the product information, including images, description, and price.
  - WHEN a user adds an item to the wishlist, THE system SHALL save the item to their wishlist.

## Product Details and Variants

### User Journey

1. **Guest User**:
   - Views product details
   - Selects product variants (SKU) based on color, size, and options
   - Adds items to the cart

2. **Registered User**:
   - Views product details
   - Selects product variants (SKU) based on color, size, and options
   - Adds items to the cart
   - Adds items to the wishlist

### Interaction Flow

- **Guest User**:
  - WHEN a guest views product details, THE system SHALL display the product information, including images, description, and price.
  - WHEN a guest selects product variants, THE system SHALL update the product information based on the selected options.
  - WHEN a guest adds an item to the cart, THE system SHALL save the item to their cart.

- **Registered User**:
  - WHEN a user views product details, THE system SHALL display the product information, including images, description, and price.
  - WHEN a user selects product variants, THE system SHALL update the product information based on the selected options.
  - WHEN a user adds an item to the cart, THE system SHALL save the item to their cart.
  - WHEN a user adds an item to the wishlist, THE system SHALL save the item to their wishlist.

## Shopping Cart and Wishlist

### User Journey

1. **Guest User**:
   - Adds items to the cart
   - Views the cart
   - Updates the quantity of items in the cart
   - Removes items from the cart
   - Proceeds to checkout

2. **Registered User**:
   - Adds items to the cart
   - Views the cart
   - Updates the quantity of items in the cart
   - Removes items from the cart
   - Proceeds to checkout
   - Adds items to the wishlist
   - Views the wishlist
   - Moves items from the wishlist to the cart
   - Removes items from the wishlist

### Interaction Flow

- **Guest User**:
  - WHEN a guest adds an item to the cart, THE system SHALL save the item to their cart.
  - WHEN a guest views the cart, THE system SHALL display the items in the cart, including the product information, quantity, and total price.
  - WHEN a guest updates the quantity of items in the cart, THE system SHALL update the total price.
  - WHEN a guest removes an item from the cart, THE system SHALL remove the item from the cart.
  - WHEN a guest proceeds to checkout, THE system SHALL prompt them to create an account or log in to complete the purchase.

- **Registered User**:
  - WHEN a user adds an item to the cart, THE system SHALL save the item to their cart.
  - WHEN a user views the cart, THE system SHALL display the items in the cart, including the product information, quantity, and total price.
  - WHEN a user updates the quantity of items in the cart, THE system SHALL update the total price.
  - WHEN a user removes an item from the cart, THE system SHALL remove the item from the cart.
  - WHEN a user proceeds to checkout, THE system SHALL redirect them to the checkout page.
  - WHEN a user adds an item to the wishlist, THE system SHALL save the item to their wishlist.
  - WHEN a user views the wishlist, THE system SHALL display the items in the wishlist, including the product information.
  - WHEN a user moves an item from the wishlist to the cart, THE system SHALL remove the item from the wishlist and add it to the cart.
  - WHEN a user removes an item from the wishlist, THE system SHALL remove the item from the wishlist.

## Order Placement and Payment

### User Journey

1. **Registered User**:
   - Reviews the items in the cart
   - Selects a shipping address
   - Chooses a shipping method
   - Selects a payment method
   - Enters payment information
   - Places the order
   - Receives an order confirmation

### Interaction Flow

- **Registered User**:
  - WHEN a user reviews the items in the cart, THE system SHALL display the items, including the product information, quantity, and total price.
  - WHEN a user selects a shipping address, THE system SHALL save the selected address.
  - WHEN a user chooses a shipping method, THE system SHALL update the shipping cost and total price.
  - WHEN a user selects a payment method, THE system SHALL save the selected payment method.
  - WHEN a user enters payment information, THE system SHALL validate the payment information.
  - WHEN a user places the order, THE system SHALL process the payment and create the order.
  - WHEN a user receives an order confirmation, THE system SHALL send an email confirmation to the user.

## Order Tracking and Shipping

### User Journey

1. **Registered User**:
   - Views their order history
   - Tracks the shipping status of their order
   - Receives shipping updates
   - Confirms the delivery of their order

### Interaction Flow

- **Registered User**:
  - WHEN a user views their order history, THE system SHALL display the list of their orders, including the order number, date, and status.
  - WHEN a user tracks the shipping status of their order, THE system SHALL display the shipping status, including the tracking number and estimated delivery date.
  - WHEN a user receives shipping updates, THE system SHALL send an email notification to the user.
  - WHEN a user confirms the delivery of their order, THE system SHALL update the order status to "Delivered".

## Product Reviews and Ratings

### User Journey

1. **Registered User**:
   - Views product reviews and ratings
   - Writes a product review
   - Rates a product
   - Edits or deletes their review

### Interaction Flow

- **Registered User**:
  - WHEN a user views product reviews and ratings, THE system SHALL display the list of reviews, including the user's name, rating, and review text.
  - WHEN a user writes a product review, THE system SHALL save the review and update the product's average rating.
  - WHEN a user rates a product, THE system SHALL save the rating and update the product's average rating.
  - WHEN a user edits or deletes their review, THE system SHALL update the review or remove it from the list.

## Seller Account Management

### User Journey

1. **Seller**:
   - Logs in to their seller account
   - Views their product listings
   - Adds or edits product listings
   - Manages inventory for their products
   - Views sales reports

### Interaction Flow

- **Seller**:
  - WHEN a seller logs in to their seller account, THE system SHALL authenticate their credentials and grant access to their account.
  - WHEN a seller views their product listings, THE system SHALL display the list of their products, including the product name, price, and inventory level.
  - WHEN a seller adds or edits a product listing, THE system SHALL save the product information and update the product listing.
  - WHEN a seller manages inventory for their products, THE system SHALL allow them to update the inventory level for each product.
  - WHEN a seller views sales reports, THE system SHALL display the sales data, including the number of orders, revenue, and average order value.

## Inventory Management

### User Journey

1. **Seller**:
   - Views inventory levels for their products
   - Updates inventory levels
   - Receives low inventory alerts
   - Manages stock for product variants (SKU)

### Interaction Flow

- **Seller**:
  - WHEN a seller views inventory levels for their products, THE system SHALL display the inventory level for each product, including the product name, SKU, and quantity.
  - WHEN a seller updates inventory levels, THE system SHALL save the updated inventory level and notify the user if the inventory level is low.
  - WHEN a seller receives low inventory alerts, THE system SHALL send an email notification to the seller.
  - WHEN a seller manages stock for product variants (SKU), THE system SHALL allow them to update the inventory level for each SKU.

## Order History and Refunds

### User Journey

1. **Registered User**:
   - Views their order history
   - Requests a refund for an order
   - Tracks the status of their refund request
   - Cancels an order

### Interaction Flow

- **Registered User**:
  - WHEN a user views their order history, THE system SHALL display the list of their orders, including the order number, date, and status.
  - WHEN a user requests a refund for an order, THE system SHALL process the refund request and update the order status.
  - WHEN a user tracks the status of their refund request, THE system SHALL display the status of the refund request.
  - WHEN a user cancels an order, THE system SHALL cancel the order and update the inventory levels for the products in the order.

## Admin Dashboard

### User Journey

1. **Admin**:
   - Logs in to the admin dashboard
   - Views and manages user accounts
   - Views and manages product listings
   - Views and manages orders
   - Manages system settings

### Interaction Flow

- **Admin**:
  - WHEN an admin logs in to the admin dashboard, THE system SHALL authenticate their credentials and grant access to the dashboard.
  - WHEN an admin views and manages user accounts, THE system SHALL display the list of user accounts and allow the admin to edit or delete user accounts.
  - WHEN an admin views and manages product listings, THE system SHALL display the list of product listings and allow the admin to edit or delete product listings.
  - WHEN an admin views and manages orders, THE system SHALL display the list of orders and allow the admin to update the order status or process refund requests.
  - WHEN an admin manages system settings, THE system SHALL allow the admin to update the system settings, including payment methods, shipping methods, and tax rates.

## Conclusion

This document outlines the user journey and interaction flow for the e-commerce shopping mall platform, ensuring a seamless experience for all user roles. The document provides a comprehensive guide for developers on how to implement the platform, including technical specifications and best practices.