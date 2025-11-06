# 08. Order Management and Tracking

## 1. Introduction

This document outlines the complete set of requirements for managing and tracking orders after a purchase has been successfully completed. It details the functionalities and workflows available to the three primary actors: `customers`, `sellers`, and `admins`. The primary goal is to ensure a transparent, efficient, and consistent order fulfillment process, providing clarity for all parties involved from the moment an order is created to its final delivery.

This document is a critical source of truth for backend developers. It builds upon the processes defined in the [Order and Payment Processing](./07-order-and-payment-processing.md) document and precedes the exception handling described in the [Cancellation and Refund Policy](./09-cancellation-and-refund-policy.md). All implemented functionality must strictly adhere to the requirements specified herein.

## 2. Order Lifecycle and Statuses

The order is the central entity in the post-purchase workflow. Its status reflects its current stage in the fulfillment process. The system must manage a discrete and consistent set of statuses to ensure clarity and predictable state transitions across the platform.

THE system SHALL enforce that every order is associated with exactly one of the predefined statuses.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> "PaymentPending" : "Order Created"

    "PaymentPending" --> "Processing" : "Payment Confirmed"
    "PaymentPending" --> "Cancelled": "Payment Failed or Timed Out"

    "Processing" --> "Shipped" : "Seller Ships Items"
    "Processing" --> "Cancelled" : "Customer/Seller/Admin Cancels"

    "Shipped" --> "Delivered" : "Delivery Confirmed"
    "Shipped" --> "Cancelled" : "Shipping Issue / Return to Sender"

    "Delivered" --> [*] : "Order Complete"
    "Cancelled" --> [*] : "Order Closed"
```

### Status Definitions:

*   **Payment Pending**: The order has been created, but payment has not yet been confirmed. This is a transient state. No inventory is held.
*   **Processing**: Payment has been successfully confirmed, and the seller is now responsible for preparing the order for shipment. Inventory has been allocated and decremented for the items in the order.
*   **Shipped**: The seller has handed the order over to a shipping carrier and has provided the necessary tracking information in the system.
*   **Delivered**: The shipping carrier has confirmed the delivery of the package to the customer. This is typically the final successful state.
*   **Cancelled**: The order has been cancelled by a `customer`, `seller`, or `admin` before fulfillment. Any allocated stock is returned to inventory, and a refund process is initiated.

## 3. Customer-Facing Order Management

Customers require a clear, self-service, and detailed view of their past and present orders to foster trust and reduce the need for customer support inquiries.

### 3.1. Order History

*   **WHEN** a `customer` navigates to their account section, **THE** system **SHALL** provide access to their complete order history.
*   **THE** system **SHALL** display a paginated list of all orders the `customer` has placed, sorted with the most recent order first.
*   **THE** system **SHALL** display a summary for each order in the history list, including:
    - Order ID (e.g., "ORD-12345-ABCDE")
    - Order Date
    - Total Price
    - Overall Order Status (e.g., "Shipped")
    - A primary product image from one of the items in the order.

### 3.2. Detailed Order View

*   **WHEN** a `customer` selects a specific order from their order history, **THE** system **SHALL** display a detailed view of that order.
*   This detailed view **SHALL** contain:
    - Order ID and Order Date.
    - The current `Order Status` displayed prominently.
    - A complete list of all items included in the order, specifying:
        - Product Name
        - SKU details (e.g., Color: Red, Size: Large)
        - Quantity ordered
        - Price per item at the time of purchase
        - Subtotal for the line item
    - Shipping Address provided for the order.
    - Payment Information (e.g., "Paid with Credit Card ending in 1234," total amount).
*   **WHERE** the order status is "Shipped" or "Delivered", **THE** system **SHALL** display the shipping carrier name (e.g., "FedEx") and the full `tracking number`.
*   **IF** the `tracking number` is available, **THEN THE** system **SHALL** provide a direct, clickable link that opens the carrier's tracking page in a new window.

## 4. Seller-Facing Order Fulfillment

Sellers are responsible for the timely and accurate fulfillment of orders for their products. The system must provide them with a clear, efficient, and unambiguous workflow to manage this core responsibility.

```mermaid
graph LR
    A["New Order Received (Status: Processing)"] --> B{"Review Order Details"}
    B -->|"Items in Stock and Verified"| C["Prepare Package for Shipment"]
    B -->|"Item Out of Stock / Issue Found"| D["Contact Customer or Admin / Cancel Order"]
    C --> E["Enter Shipping & Tracking Info into System"]
    E --> F["System Validates Tracking Info Format"]
    F -->|"Valid"| G["Update Status to 