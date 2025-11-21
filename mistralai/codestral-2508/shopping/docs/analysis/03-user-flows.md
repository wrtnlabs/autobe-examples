# User Flows for E-commerce Shopping Mall Platform

## Overview

This document outlines the complete user journeys and scenarios for the e-commerce shopping mall platform, focusing on customer, seller, and admin experiences. It serves as a blueprint for user experience design and development.

## User Registration Flow

### Guest to Customer Journey

```mermaid
graph LR
    A["Start as Guest"] --> B["View Homepage"]
    B --> C["Click Register Button"]
    C --> D["Enter Registration Details"]
    D --> E["Verify Email"]
    E --> F["Complete Profile"]
    F --> G["Registered Customer"]
```

### Address Management Process

```mermaid
graph LR
    A["Registered Customer"] --> B["Go to Account Settings"]
    B --> C["Select Address Management"]
    C --> D["Add New Address"]
    D --> E["Edit Existing Address"]
    E --> F["Set Default Address"]
    F --> G["Delete Address"]
```

## Product Browsing Flow

### Catalog Navigation

```mermaid
graph LR
    A["View Homepage"] --> B["Browse Categories"]
    B --> C["Select Subcategory"]
    C --> D["View Product Listings"]
    D --> E["Filter Products"]
    E --> F["Sort Products"]
```

### Search Functionality

```mermaid
graph LR
    A["Enter Search Query"] --> B["View Search Results"]
    B --> C["Refine Search"]
    C --> D["View Product Details"]
```

### Product Detail View

```mermaid
graph LR
    A["View Product Listing"] --> B["Click Product Image"]
    B --> C["View Product Details"]
    C --> D["Select Variant"]
    D --> E["Add to Cart"]
    E --> F["Add to Wishlist"]
```

## Product Purchase Flow

### Shopping Cart Management

```mermaid
graph LR
    A["Add to Cart"] --> B["View Cart"]
    B --> C["Update Quantity"]
    C --> D["Remove Item"]
    D --> E["Proceed to Checkout"]
```

### Wishlist Integration

```mermaid
graph LR
    A["Add to Wishlist"] --> B["View Wishlist"]
    B --> C["Move to Cart"]
    C --> D["Remove from Wishlist"]
```

### Checkout Process

```mermaid
graph LR
    A["Proceed to Checkout"] --> B["Enter Shipping Address"]
    B --> C["Select Shipping Method"]
    C --> D["Enter Payment Details"]
    D --> E["Review Order"]
    E --> F["Place Order"]
```

### Payment Processing

```mermaid
graph LR
    A["Enter Payment Details"] --> B["Select Payment Method"]
    B --> C["Process Payment"]
    C --> D["Confirm Payment"]
    D --> E["Order Confirmation"]
```

## Order Management Flow

### Order Tracking

```mermaid
graph LR
    A["Place Order"] --> B["View Order Details"]
    B --> C["Track Order"]
    C --> D["View Shipping Status"]
```

### Shipping Status Updates

```mermaid
graph LR
    A["Order Shipped"] --> B["Update Shipping Status"]
    B --> C["Notify Customer"]
    C --> D["Order Delivered"]
```

### Order History

```mermaid
graph LR
    A["View Account"] --> B["Select Order History"]
    B --> C["View Past Orders"]
    C --> D["Reorder Items"]
```

### Cancellation/Refund Requests

```mermaid
graph LR
    A["View Order Details"] --> B["Request Cancellation"]
    B --> C["Request Refund"]
    C --> D["Process Request"]
    D --> E["Confirm Resolution"]
```

## Seller Product Management Flow

### Product Listing

```mermaid
graph LR
    A["Seller Login"] --> B["Go to Seller Dashboard"]
    B --> C["Add New Product"]
    C --> D["Enter Product Details"]
    D --> E["Upload Product Images"]
    E --> F["Set Pricing"]
    F --> G["Publish Product"]
```

### Inventory Management

```mermaid
graph LR
    A["View Product List"] --> B["Select Product"]
    B --> C["Update Inventory"]
    C --> D["Set Low Stock Alerts"]
    D --> E["View Inventory History"]
```

### Order Processing

```mermaid
graph LR
    A["View Orders"] --> B["Process Order"]
    B --> C["Update Order Status"]
    C --> D["Generate Shipping Label"]
    D --> E["Notify Customer"]
```

## Admin Dashboard Flow

### User Management

```mermaid
graph LR
    A["Admin Login"] --> B["Go to Admin Dashboard"]
    B --> C["Manage Users"]
    C --> D["View User Details"]
    D --> E["Suspend/Activate User"]
```

### Product Approval

```mermaid
graph LR
    A["View Pending Products"] --> B["Review Product"]
    B --> C["Approve/Reject Product"]
    C --> D["Notify Seller"]
```

### Order Processing

```mermaid
graph LR
    A["View All Orders"] --> B["Process Order"]
    B --> C["Update Order Status"]
    C --> D["Resolve Disputes"]
```

### System Monitoring

```mermaid
graph LR
    A["View Dashboard"] --> B["Monitor System Health"]
    B --> C["View Analytics"]
    C --> D["Generate Reports"]
```

## Functional Requirements

### User Registration and Login

- WHEN a guest clicks the register button, THE system SHALL display the registration form.
- WHEN a user submits registration details, THE system SHALL validate and create a new account.
- WHEN a user requests password reset, THE system SHALL send a reset link to their email.

### Product Catalog and Search

- WHEN a user browses categories, THE system SHALL display relevant product listings.
- WHEN a user searches for products, THE system SHALL return matching results.
- WHEN a user filters products, THE system SHALL update the product listings accordingly.

### Product Variants and SKUs

- WHEN a user selects a product variant, THE system SHALL display the updated details.
- WHEN a user adds a product to cart, THE system SHALL record the selected variant.

### Shopping Cart and Wishlist

- WHEN a user adds a product to cart, THE system SHALL update the cart count.
- WHEN a user views their cart, THE system SHALL display all added items.
- WHEN a user adds a product to wishlist, THE system SHALL save it for later.

### Order Placement and Payment Processing

- WHEN a user proceeds to checkout, THE system SHALL display the order summary.
- WHEN a user enters payment details, THE system SHALL process the payment.
- WHEN payment is successful, THE system SHALL generate an order confirmation.

### Order Tracking and Shipping Status Updates

- WHEN an order is shipped, THE system SHALL update the shipping status.
- WHEN a user tracks their order, THE system SHALL display the current status.

### Product Reviews and Ratings

- WHEN a user submits a product review, THE system SHALL save the review.
- WHEN a user views product details, THE system SHALL display existing reviews.

### Seller Accounts and Product Management

- WHEN a seller adds a new product, THE system SHALL validate and publish the product.
- WHEN a seller updates inventory, THE system SHALL reflect the changes.

### Inventory Management

- WHEN inventory levels are low, THE system SHALL notify the seller.
- WHEN a seller views inventory, THE system SHALL display current stock levels.

### Order History and Cancellation/Refund Requests

- WHEN a user views order history, THE system SHALL display past orders.
- WHEN a user requests cancellation, THE system SHALL process the request.

### Admin Dashboard

- WHEN an admin manages users, THE system SHALL allow user suspension/activation.
- WHEN an admin approves products, THE system SHALL update the product status.
- WHEN an admin processes orders, THE system SHALL update the order status.

## Conclusion

This document provides a comprehensive overview of the user flows and functional requirements for the e-commerce shopping mall platform. It serves as a foundation for user experience design and development, ensuring that all user journeys are well-understood and implemented effectively.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*