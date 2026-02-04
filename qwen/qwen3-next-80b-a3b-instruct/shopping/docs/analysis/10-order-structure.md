# Order Structure Specification

## Order Composition

An order represents a collection of one or more order items purchased by a customer in a single transaction. Each order is created when a customer successfully completes checkout with a valid payment.

WHEN a customer completes checkout with successful payment, THE system SHALL create a new order record. The order SHALL contain:
- Customer identifier (linked to the customer account)
- Shipping address (exact values captured at checkout time)
- Order creation timestamp
- Total monetary value of the order at time of purchase
- List of one or more order items
- Payment method identifier
- Payment transaction identifier

WHEN an order is created, THE system SHALL preserve immutable snapshots of:
- Each product's state at the time of purchase (product name, description, category, base price)
- Each product variant's state (SKU code, option values, price)
- Each seller's profile state (shop name, shop description, logo image)

IF an order is created, THEN THE system SHALL remove the purchased items from the customer's shopping cart.

WHILE an order status is "paid", THE system SHALL allow cancellation or refund requests for individual order items.

## Order Item Statuses

Each order item has its own independent status that reflects its progress through the fulfillment lifecycle. The status of each order item is maintained independently of other items in the same order.

Order item statuses are:
- "paid" - payment has been successfully processed, item is awaiting shipment
- "shipped" - seller has dispatched the item with tracking information
- "delivered" - customer has confirmed delivery or 14 days have passed since shipment
- "cancelled" - cancellation request was approved and order item was cancelled
- "refunded" - refund request was approved and customer has been refunded

WHEN an order item status changes, THE system SHALL create a snapshot recording:
- Previous status value
- New status value
- Timestamp of change
- Reason provided (if applicable)
- User or system that initiated the change

WHEN a customer requests cancellation of an order item, THE system SHALL set the order item status to "paid" (if not already) and create a cancellation request record.

WHEN a customer requests refund of an order item, THE system SHALL set the order item status to "delivered" (if not already) and create a refund request record.

WHERE an order item status is "cancelled" or "refunded", THE system SHALL restore the corresponding inventory quantity via an inventory record.

## Order Status Derivation

The overall order status is derived dynamically based on the statuses of its constituent order items. The order status is not directly editable but is automatically calculated from the individual item states.

WHEN an order contains only items with status "paid", THE system SHALL set the order status to "paid".

WHEN an order contains one or more items with status "shipped" and no items with status "delivered", THE system SHALL set the order status to "shipped".

WHEN all items in the order have status "delivered", THE system SHALL set the order status to "delivered".

WHEN all items in the order have status "cancelled", THE system SHALL set the order status to "cancelled".

WHEN all items in the order have status "refunded", THE system SHALL set the order status to "refunded".

WHEN an order contains a mix of item statuses (e.g., some delivered, some refunded), THE system SHALL set the order status to "partially completed".

IF any item in an order has status "paid" or "shipped", THEN THE system SHALL not set the order status to "cancelled" or "refunded".

## Multi-Seller Orders

An order may contain items from multiple sellers. Each seller operates independently in fulfilling their portion of the order.

THE system SHALL support orders containing products from multiple sellers simultaneously.

THE system SHALL ensure each item in an order is associated with exactly one seller.

WHEN an order contains items from multiple sellers, THE system SHALL create separate shipment entities for each seller's items.

WHEN a seller receives a new order item, THE system SHALL display only items from that seller in their seller dashboard.

WHILE an order status is "shipped", THE system SHALL show separate tracking information for each seller's shipment.

## Sellers per Item

Each order item is exclusively associated with the seller who created the product being purchased. The seller association is fixed at order creation and cannot be changed.

WHEN a product is purchased, THE system SHALL capture and preserve a snapshot of the seller's profile at that exact moment.

THE seller profile snapshot SHALL include:
- Shop name
- Shop description
- Logo image URL

WHEN an order item status changes from "paid" to "shipped", THE system SHALL associate the item with the seller's current tracking information.

WHEN an order is created, THE system SHALL record the seller's unique identifier for each order item.

WHERE a seller's shop name or logo changes after an order has been placed, THE system SHALL NOT update the seller profile snapshot stored with existing order items.

WHILE an order status is "delivered" or higher, THE system SHALL maintain the original seller profile snapshot for historical accuracy.

## Order History

Customers can access their complete order history, including details of past purchases. Sellers can access order items related to their products.

WHEN a customer views their order history, THE system SHALL display:
- List of all orders sorted by newest first
- For each order: order number, date, total price, and derived order status

WHEN a customer selects an individual order to view in detail, THE system SHALL display:
- List of items with: product name, variant options, quantity, price, and individual item status
- Shipping address used at time of purchase
- Complete shipping information for each seller's shipment

WHEN an administrator views any order, THE system SHALL display the complete snapshot data of:
- All products and variants at time of purchase
- All seller profiles at time of purchase
- All order item statuses and their change history

WHEN a seller views their order items history, THE system SHALL display:
- Only items related to their products
- Order status for their items
- Complete snapshot data of their own seller profile as it was at time of purchase

WHEN an order item has been cancelled or refunded, THE system SHALL maintain the original snapshot of the product and seller data as it existed at purchase time.

WHILE a customer's account is deleted, THE system SHALL preserve all order history and associated snapshots for legal and business continuity purposes.