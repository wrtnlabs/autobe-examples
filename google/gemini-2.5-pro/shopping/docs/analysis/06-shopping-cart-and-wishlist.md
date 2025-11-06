# Shopping Cart and Wishlist Functional Requirements

## 1. Introduction

This document specifies the functional requirements for the shopping cart and wishlist features of the shopping mall platform. The primary goal is to provide a clear and unambiguous set of rules for how users can collect, manage, and save products they are interested in purchasing. The shopping cart is a temporary holding area for items before checkout, while the wishlist allows authenticated users to save items for future consideration.

Adherence to these requirements is critical for ensuring a seamless, reliable, and intuitive pre-purchase experience for all users.

## 2. Shopping Cart Functional Requirements

The shopping cart is the central component of the purchasing workflow. It must accurately reflect the user's selections, including product variants, quantities, and real-time pricing and availability.

### 2.1. Adding, Updating, and Removing Cart Items

- **Event-driven:** WHEN a user elects to add a product variant (SKU) to their shopping cart, THE system SHALL add the selected item and quantity to the cart.
- **Unwanted Behavior:** IF an identical SKU already exists in the cart, THEN THE system SHALL increment the quantity of the existing line item rather than creating a new, separate entry.
- **Unwanted Behavior:** IF a user attempts to add a quantity of a SKU that exceeds the currently available inventory, THEN THE system SHALL prevent the action and present a notification to the user indicating the available stock.
- **Event-driven:** WHEN a user updates the quantity of an item directly within the cart, THE system SHALL adjust the quantity for that specific SKU accordingly.
- **Unwanted Behavior:** IF a user updates an item's quantity to zero, THEN THE system SHALL remove the item entirely from the cart.
- **Event-driven:** WHEN a user chooses to remove an item from the cart, THE system SHALL delete that specific line item from the user's cart session.

### 2.2. Cart Viewing and Display

- **Ubiquitous:** THE system SHALL provide a view where users can see all items currently in their shopping cart.
- **Ubiquitous:** THE cart display SHALL, for each line item, show: the product name, a representative image, selected variant details (e.g., color, size), the current unit price, the quantity, and the total price for that line item (unit price * quantity).
- **Event-driven:** WHEN a user views their cart, THE system SHALL refresh the price and availability of all items to reflect the most current information.

### 2.3. Cart Persistence and Management

- **State-driven:** WHILE a user identified as a "customer" is authenticated, THE system SHALL persist their shopping cart contents across multiple sessions and devices.
- **State-driven:** WHILE a guest (unauthenticated) user is browsing, THE system SHALL maintain their shopping cart contents only for the duration of the current browser session.
- **Event-driven:** WHEN a guest user who has items in their session cart logs in as a "customer", THE system SHALL merge the items from the session cart into their persistent-account cart. In case of duplicate SKUs, the quantities shall be summed, respecting inventory limits.

### 2.4. Cart Calculations

- **Ubiquitous:** THE system SHALL accurately calculate and display the subtotal, which is the sum of all line item totals in the cart.
- **Event-driven:** WHEN the cart contents are modified (item added, removed, or quantity updated), THE system SHALL immediately recalculate all totals.
- **Ubiquitous:** THE cart view SHALL clearly display the subtotal, estimated shipping fees, applicable taxes, and the final grand total.

## 3. Wishlist Functional Requirements

The wishlist is a feature exclusive to authenticated "customer" actors, allowing them to save products for future reference.

### 3.1. Managing Wishlist Items

- **Event-driven:** WHEN a "customer" elects to add a product to their wishlist, THE system SHALL add the specified product variant (SKU) to their personal wishlist.
- **Unwanted Behavior:** IF the same SKU already exists in the customer's wishlist, THEN THE system SHALL NOT add a duplicate entry and shall notify the user that the item is already saved.
- **Event-driven:** WHEN a "customer" chooses to remove an item from their wishlist, THE system SHALL delete that item from their wishlist data.

### 3.2. Wishlist Viewing and Interaction

- **Ubiquitous:** THE system SHALL provide a dedicated view for a "customer" to see all items in their wishlist.
- **Ubiquitous:** THE wishlist view SHALL display each item's name, image, variant details, current price, and current stock status (e.g., "In Stock," "Out of Stock").
- **Event-driven:** WHEN a "customer" chooses to move an item from their wishlist to their shopping cart, THE system SHALL add the item to the cart and subsequently remove it from the wishlist.

### 3.3. Wishlist Sharing (Optional)

- **Optional:** WHERE a customer views their wishlist, THE system SHALL provide an option to generate a unique, shareable link.
- **Optional:** WHEN another user accesses this unique link, THE system SHALL display a public, read-only version of that wishlist.

## 4. User Scenarios and Flows

### 4.1. Cart Management Flow (Diagram)

This diagram illustrates the typical user flow for managing items in the shopping cart, including the critical stock validation step.

```mermaid
graph LR
    A["Start: View Product Page"] --> B{"Add to Cart?"}
    B -->|"Yes"| C["System checks stock for SKU"]
    C --> D{"Stock Available?"}
    D -->|"Yes"| E{"Item already in cart?"}
    D -->|"No"| F["Show 