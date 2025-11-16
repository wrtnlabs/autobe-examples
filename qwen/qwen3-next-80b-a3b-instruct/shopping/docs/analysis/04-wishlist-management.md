## Wishlist Management

## Overview

The wishlist feature enables authenticated users to save products for future consideration, enhancing user engagement, reducing purchase friction, and increasing conversion rates through personalized product discovery. It serves as a digital bookmarking system that allows users to curate items of interest without immediately committing to a purchase. This functionality directly complements the shopping cart by separating intent (wishlist) from action (cart). Wishlist data is stored persistently per authenticated user and is never exposed to public access or sharing.

## User Actors and Access Control

The wishlist feature is accessible only to authenticated users. Guest users do not have access to this functionality. Specific actor permissions are defined as follows:

- **Guest**: Cannot view, add, remove, or interact with any wishlist content. Attempting to access the wishlist endpoint will trigger authentication redirection.
- **Customer**: Full control over their own wishlist. May add, remove, view, and manage their personal wishlist items. Cannot access or modify other users' wishlists.
- **Seller**: Has same access as customer (as they are also authenticated users). May add products to their own wishlist, but no special seller-only wishlist functionality exists.
- **Admin**: May view aggregated analytics about wishlist usage (e.g., most-wished products), but cannot view or modify individual user wishlists. Basis for product recommendations may be derived from wishlists, but no direct access to user data is granted.

## Functional Requirements

### Adding Products to Wishlist

WHEN a customer selects the "Add to Wishlist" button from a product detail page, THE system SHALL add the product's unique SKU identifier to the customer's active wishlist.

WHEN the customer attempts to add a product they have already added to their wishlist, THE system SHALL NOT create a duplicate entry and SHALL display a notification: "This item is already in your wishlist."

WHEN a customer tries to add a product that is out of stock or inactive (product.status !== "ACTIVE"), THE system SHALL prevent addition to the wishlist and display: "This product is currently unavailable."

WHEN a guest user attempts to add a product to their wishlist, THE system SHALL redirect to the login page with a message: "Please sign in to save items to your wishlist." and SHALL NOT persist any wishlist data.

### Viewing Wishlist

WHEN a customer navigates to their wishlist page (e.g., /wishlist), THE system SHALL display a list of all products in their wishlist with the following details:

- Product name
- Image preview (primary variant)
- Price (current SKU price)
- Available variants as "Available in: [color], [size]"
- Stock status indicator ("In Stock", "Limited Stock", "Out of Stock")
- Date added (YYYY-MM-DD format)
- Button to "Add to Cart" from wishlist
- Button to "Remove from Wishlist"

WHILE the wishlist contains items, THE system SHALL display the total count of items (e.g., "Your Wishlist (7 items)").

WHILE the wishlist contains zero items, THE system SHALL display an empty state message: "Your wishlist is empty. Add products you love to see them here." with a call-to-action button to "Browse Products".

WHEN a product in the wishlist is updated (e.g., price change, stock update, status change), THE system SHALL immediately reflect the update in the customer's wishlist view without requiring refresh.

### Removing Items from Wishlist

WHEN a customer selects "Remove from Wishlist" for an item, THE system SHALL remove that SKU from their wishlist and decrement the item count.

WHEN a customer selects "Remove from Wishlist" from the wishlist page, THE system SHALL immediately update the wishlist view and return them to the same page with a confirmation message: "Item removed from wishlist."

WHEN a customer selects "Remove from Wishlist" from a product detail page, THE system SHALL immediately remove the item and display: "Removed from wishlist."

WHEN a customer adds an item to their wishlist and then removes it before any cart activity, THE system SHALL permanently delete the association — no retention or undo functionality is required.

### Wishlist Notifications

WHEN a product in a customer’s wishlist becomes available again (stock changes from "Out of Stock" to "In Stock"), THE system SHALL send an email and push notification to the customer with subject: "🌟 [Product Name] is back in stock!"

WHEN a product in a customer’s wishlist is discounted by 15% or more from the original price when added, THE system SHALL send a notification: "🎉 [Product Name] is now 15% off!"

WHEN a product in a customer’s wishlist is discontinued or permanently removed from inventory, THE system SHALL display in the customer’s wishlist UI: "This item is no longer available" and SHALL gray out the associated UI components (button, image, price) — but SHALL NOT auto-remove the item.

### Wishlist Integration with Cart

WHEN a customer selects "Add to Cart" from within the wishlist page, THE system SHALL add the selected SKU to their shopping cart with current quantity (default: 1) and current price.

WHEN a customer selects "Add to Cart" from the wishlist, THE system SHALL NOT remove the item from the wishlist — the item should remain in the wishlist for future reference.

WHEN a customer adds an item to their cart from the wishlist, THE system SHALL update the cart summary in real-time and redirect to the cart page.

WHEN a customer attempts to add a wishlist item to cart that is out of stock or inactive, THE system SHALL prevent cart addition and display: "This item is currently unavailable. Try selecting another variant or check back later."

WHEN a wishlist item is added to cart, the system SHALL preserve the wishlist item in case the customer wants to repurchase it later.

## Business Rules

### Wishlist Item Limit

THE system SHALL allow a customer to store up to 200 products in their wishlist at any time.

IF a customer attempts to add a 201st item, THE system SHALL prevent the addition and display a message: "Your wishlist is full. Remove some items to add more."

WHILE a customer’s wishlist contains 200 items, THE system SHALL continue to monitor inventory changes and trigger notifications for any fluctuation (e.g., restock, price drop) as defined above.

### Wishlist Persistence

WHILE a customer is logged in, THEIR wishlist SHALL persist across all devices and browser sessions.

WHEN a customer logs out, THEIR wishlist SHALL remain stored on the server and SHALL return to the active state upon next login.

WHEN a customer deletes their account, THE system SHALL permanently delete all associated wishlist data.

### Data Integrity

THE system SHALL prevent wishlist items from being associated with non-existent or deleted products.

IF a product referenced in a wishlist is deleted from the catalog, THE system SHALL preserve the wishlist entry with a placeholder value: "Product unavailable" in place of product name and "N/A" for price, but SHALL retain the original SKU ID for reference.

THE system SHALL validate on every wishlist read that each SKU still exists in the product catalog (even if inactive). If a SKU is invalid, it SHALL be flagged for background cleanup.

### Session and API Security

WHILE a user is authenticated, THEIR wishlist access SHALL be protected via JWT authentication token.

IF a customer attempts to access another customer’s wishlist using a manipulated JWT or direct API request, THE system SHALL return HTTP 403 Forbidden with message: "You do not have permission to access this wishlist."

THE system SHALL record all wishlist modification events (add, remove) in audit logs with timestamp, user ID, SKU, and operation type for security and analytics.

## Exception Handling and Error Recovery

IF the wishlist database record is corrupted for a customer, THEN THE system SHALL display: "We're sorry, your wishlist is temporarily unavailable. Try refreshing this page. If the issue persists, contact support." and SHALL activate a background recovery process to rebuild the wishlist from scratch.

IF the wishlist service experiences outage, THEN THE system SHALL cache pending add/remove operations locally in browser storage and retry when connection is restored, with user visibility of a "Saving..." state.

IF a product is no longer loadable from the catalog due to external API failure, THEN THE system SHALL display a placeholder: "Product information temporarily unavailable" while retaining the relationship so it can be restored once the product is available again.

IF a customer disconnects during a wishlist modification (e.g., removing item), THEN THE system SHALL revert to the last known server state and prompt: "The change was not completed. Your wishlist has been restored."

## Performance Requirements

WHEN opening the wishlist page, THE system SHALL render the full list in under 1.5 seconds on moderate network conditions (LTE).

WHEN adding or removing an item from wishlist, THE system SHALL update the UI within 500 milliseconds of API response.

WHEN loading wishlist with 200 items, THE system SHALL use lazy-loading techniques to avoid performance degradation — first 25 items render immediately, rest load progressively as user scrolls.

WHEN fetching wishlist on mobile with poor network (2G), THE system SHALL display a loading spinner and fall back to cached data when possible, with retry mechanism after 3 seconds.

## Mermaid Diagram: Wishlist User Journey

```mermaid
graph LR
  A[Customer Navigates to Product] --> B{Is Customer Logged In?}
  B -->|No| C[Show Login Prompt]
  C --> D[Redirect to Login Page]
  D --> E[Customer Logs In]
  E --> F[Return to Product Page]
  B -->|Yes| G[Display "Add to Wishlist" Button]
  G --> H[Customer Clicks "Add to Wishlist"]
  H --> I[Send Add to Wishlist API Request]
  I --> J{Is SKU Valid & In Stock?}
  J -->|No| K[Show "Unavailable" Message]
  J -->|Yes| L[Add SKU to Wishlist Database]
  L --> M[Update Wishlist Count on UI]
  M --> N[Show Success Message: "Added to wishlist"]
  N --> O[Customer Navigates to Wishlist Page]
  O --> P[Fetch Wishlist via JWT-Authenticated API]
  P --> Q[Render Product List with Images, Prices, Stock Status]
  Q --> R[Customer Clicks "Add to Cart" on Item]
  R --> S[Add Item to Shopping Cart w/ Quantity = 1]
  S --> T[Display Cart Updated]
  T --> U[Item Remains in Wishlist]
  R --> V[Customer Clicks "Remove from Wishlist"]
  V --> W[Delete SKU from Wishlist Database]
  W --> X[Update UI Count]
  X --> Y[Show Confirmation: "Removed from wishlist"]
  Q --> Z[Stock Status Changes?]
  Z -->|Restock| AA[Send Email & Push Notification]
  Z -->|Price Drop >15%| AA
  Z -->|Discontinued| AB[Display "Unavailable" Placeholder]
  AB --> AC[Keep Item in List for Reference]
```

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.