# Order Processing Requirements

## Business Context

This document outlines the complete order processing requirements for the e-commerce shopping mall platform. Order processing is a critical system capability that manages the entire customer journey from adding items to the shopping cart through final delivery and post-purchase activities.

The system handles complex business scenarios including multi-seller environments, inventory management, payment processing, shipping coordination, and dispute resolution. Every aspect of the order lifecycle must be meticulously tracked and preserved for legal, business intelligence, and customer service purposes.

## Core Order Processing Workflows

### Cart to Checkout Flow

#### Shopping Cart Management

Customers maintain personalized shopping carts containing selected product variants with specified quantities. The cart serves as an intermediate state before finalizing orders.

**Adding Products to Cart**
- Customers can add specific product variants to their cart (products must be selected by variant, not just product)
- When adding a variant, customers specify the desired quantity
- If the same variant is already in the cart, quantities are combined rather than creating duplicate entries
- When a variant is out of stock or deleted, it cannot be added to the cart
- Cart items show real-time stock availability information

**Editing Cart Items**
- Customers can modify the quantity of existing cart items
- Quantity changes must respect current stock levels
- If quantity exceeds available stock, appropriate warnings are displayed
- Customers can remove individual items from their cart
- Cart totals update automatically when items are added, modified, or removed

**Cart Validation**
- Cart items are validated against current product status before checkout
- Deleted variants are marked as unavailable
- Out-of-stock variants show clear availability warnings
- Product price changes after cart addition are noted but don't affect cart totals until checkout

**Cart Persistence**
- Shopping carts persist across sessions for authenticated users
- Carts are automatically cleared after successful order placement
- Abandoned carts may be cleared after 30 days of inactivity

**Cart Limits**
- Maximum cart quantity per variant is limited by available stock
- System may implement total cart item limits for performance
- Out-of-stock variants in existing carts are marked as unavailable but remain visible

#### Checkout Process

**Address Selection**
- Customers must select a shipping address (or use their default address)
- Only addresses belonging to the customer can be selected
- Selected address cannot be changed after order placement
- Address validation ensures required fields are present

**Order Review**
- Before finalizing, customers can review complete order summary including:
  - List of all items with variant details, quantities, and prices
  - Selected shipping address
  - Total order price (sum of all item subtotals)
  - Estimated delivery timeline
  - Order placement timestamp

**Payment Processing**
- Customers confirm and initiate payment through external gateway integration
- Payment processing states: pending, successful, failed
- If payment fails, order is not created and customer can retry
- If payment succeeds, order creation proceeds

**Order Creation Trigger**
- Order is created only after successful payment confirmation
- All cart items are converted to order items
- Customer cart is cleared after successful order placement
- Order confirmation is displayed and sent via email

### Order Placement Process

#### Order Creation Sequence

**Order Record Generation**
- When payment succeeds, a master order record is created
- Each unique seller in the order gets their own order item group
- Order number is generated using business-appropriate format
- Order timestamp is recorded at creation
- Initial order status is set to "paid"

**Order Item Creation**
- Each purchased variant becomes an order item
- Order items maintain their own status independent of other items
- Order items include product and variant snapshots at time of purchase
- Order items preserve seller profile snapshots at time of purchase

**Inventory Impact**
- Stock quantities are immediately decremented for each purchased variant
- Inventory records are created with negative quantities for orders
- Inventory history tracks the reason as "order fulfillment"
- Stock reductions are permanent until order cancellation/refund

**Cart Clearing**
- All items from the customer's cart are removed after successful order placement
- Cart totals reset to zero
- Customer can immediately add new items to cart

#### Order Structure

**Order Header**
- Order number (unique identifier)
- Customer reference
- Order timestamp
- Shipping address
- Payment information
- Order status (derived from items)
- Total order price

**Order Items**
- Product name and description (snapshot at purchase time)
- Variant details (SKU, options, price)
- Quantity ordered
- Item price at time of purchase
- Item subtotal
- Item status (independent from other items)
- Seller reference and shop name
- Product snapshot reference
- Variant snapshot reference
- Seller profile snapshot reference

**Order Item Grouping**
- Items from same seller are grouped for shipping purposes
- Items from different sellers ship separately
- Multiple items from same seller can be combined in one shipment

### Order Status Management

#### Order Item Status States

**Paid Status**
- Initial status after successful payment
- Waiting for seller to fulfill the order
- Customer can request cancellation at this stage
- Inventory is reserved but not yet deducted permanently
- Sellers can process fulfillment

**Shipped Status**
- Applied when seller creates shipment record
- Tracking information becomes available
- Customer receives shipping notification
- Items cannot be cancelled but can be returned
- Delivery timeline becomes active

**Delivered Status**
- Applied when customer confirms delivery or 14 days after shipping
- Final status for completed items
- Customer can write reviews for delivered items
- Refund requests become eligible
- Order items can no longer be cancelled

**Cancelled Status**
- Applied when cancellation is approved
- Stock quantities are restored
- Payment is refunded to customer
- Order item is closed and cannot be changed
- Full history is preserved for audit

**Refunded Status**
- Applied when refund request is approved
- Stock quantities are restored
- Payment is returned to customer
- Item status is permanently closed
- All associated snapshots are preserved

#### Order Status Calculation

**Order Status Derivation**
The overall order status is calculated from its items using these rules:

**Paid Status**
- Order status is "paid" when all items have status "paid"
- Only applies when no items have progressed beyond paid status

**Shipped Status**
- Order status is "shipped" when any item has status "shipped" and no items are "delivered"
- Indicates at least one seller has begun fulfillment
- Applies even if other items remain in earlier statuses

**Delivered Status**
- Order status is "delivered" when all items have status "delivered"
- Indicates complete fulfillment for all sellers
- Only applies when no items remain in active statuses

**Cancelled Status**
- Order status is "cancelled" when all items have status "cancelled"
- Indicates complete order cancellation
- Only applies when no items remain in active statuses

**Refunded Status**
- Order status is "refunded" when all items have status "refunded"
- Indicates complete order refund
- Only applies when no items remain in active statuses

**Partially Completed Status**
- Order status is "partially completed" when items are in mixed final states
- Examples: some delivered + some refunded, some cancelled + some paid
- Indicates incomplete resolution of all order items

**Status Calculation Rules**
- Status evaluation happens in priority order: paid → shipped → delivered → cancelled → refunded → partially completed
- Status changes occur automatically when item statuses change
- Status history is preserved for audit purposes
- Status transitions follow business logic rules, not arbitrary changes

### Shipping and Tracking Process

#### Shipment Concept

**Shipment Definition**
- A shipment is a physical package sent from seller to customer
- Each shipment contains order items from the same seller
- Different sellers always create separate shipments
- A seller can choose to bundle multiple items into one shipment or ship individually

**Shipment Creation**
- Sellers view order items requiring shipping for their products
- Sellers select items to include in each shipment
- Sellers enter shipping carrier and tracking information
- Shipment record is created with all selected items
- All items in shipment change status to "shipped" simultaneously

**Shipment Options**
- Individual shipping: One item per shipment
- Combined shipping: Multiple items from same seller in one package
- Partial shipping: Some items shipped immediately, others later
- Sellers choose shipping strategy based on inventory and logistics

**Shipping Information**
- Carrier name and tracking number are required
- Estimated delivery dates can be included
- Shipping instructions and special handling notes are supported
- Tracking information is visible to customers

#### Delivery Confirmation

**Customer Confirmation**
- Customers receive shipping notifications with tracking details
- Customers can confirm delivery for each shipment
- Delivery confirmation triggers item status change to "delivered"

**Automatic Delivery**
- If customer does not confirm, items automatically become "delivered" after 14 days
- This protects customers from undelivered orders
- Sellers can view delivery confirmation status

**Delivery Evidence**
- Tracking history and delivery confirmation timestamps are recorded
- Delivery disputes are resolved using shipment records
- Signature requirements can be implemented for high-value items

**Partial Delivery Handling**
- If only some items arrive, only those items become "delivered"
- Other items remain in "shipped" status until delivered
- Customer can report missing items for investigation

#### Tracking Display

**Customer Tracking View**
- Each shipment shows: carrier name, tracking number, shipping date
- Tracking status updates from shipping carrier are displayed
- Estimated delivery timeline is shown
- Shipping history is accessible

**Seller Tracking Dashboard**
- Sellers can view all shipment tracking information
- Delivery confirmation status is tracked
- Shipping performance metrics are available
- Tracking issues are highlighted for attention

### Order Cancellation Process

#### Cancellation Workflow

**Eligibility Requirements**
- Only items with status "paid" can be cancelled
- Items already shipped cannot be cancelled
- Items already delivered cannot be cancelled (must use refund process)
- Cancellation is per order item, not per entire order

**Cancellation Request**
- Customer initiates cancellation request for specific items
- Customer provides cancellation reason (text field)
- Request includes item details and customer contact information
- Cancellation request is logged with timestamp

**Seller Response**
- Seller receives cancellation notification
- Seller can approve or reject the cancellation
- Seller provides response reason if rejecting
- Seller response is recorded in system history

**Snapshot Preservation**
- Cancellation request and response are preserved as snapshots
- Full context of cancellation is maintained for audit
- Historical cancellation patterns are tracked for analytics

**Stock Restoration**
- When approved, stock quantities are restored to available inventory
- Inventory records are created with positive quantity for restocking
- Reason is recorded as "cancellation refund"
- Inventory history reflects the complete lifecycle

**Payment Processing**
- Approved cancellations trigger automatic refund to customer
- Refund amount equals original payment for cancelled items
- Original payment method is used when possible
- Refund confirmation is sent to customer

**Order Status Update**
- Canceled item status changes to "cancelled"
- Order status is recalculated based on remaining items
- If all items cancelled, order status becomes "cancelled"
- Remaining items continue processing normally

#### Cancellation Limitations

**Seller Cancellation**
- Sellers can also cancel items with justification
- Seller cancellations follow same approval workflow
- Seller-initiated cancellations may have different priority
- Sellers cannot cancel delivered items

**System Cancellation**
- Administrators can force-cancel items for policy violations
- Force cancellations require administrator justification
- Force cancellations preserve all original snapshots
- Force cancellations restore inventory and process refunds

**Cancellation History**
- All cancellation attempts are recorded, regardless of approval
- Cancellation patterns are analyzed for quality improvement
- High cancellation rates trigger seller performance reviews
- Cancellation reasons are tracked for root cause analysis

### Refund Process

#### Refund Workflow

**Eligibility Requirements**
- Only items with status "delivered" can be refunded
- Refund requests must be made within 7 days of delivery
- Items can only be refunded once (no double refunds)
- Refund is per order item, not per entire order

**Refund Request**
- Customer initiates refund request for specific items
- Customer provides refund reason (text field)
- Request includes item condition description and photos if applicable
- Request timestamp must be within 7-day window

**Seller Response**
- Seller receives refund notification
- Seller can approve or reject the refund request
- Seller may request additional information or photos
- Seller response is recorded with timestamp and justification

**Snapshot Preservation**
- Refund request and all communications are preserved as snapshots
- Full dispute resolution history is maintained
- Return shipping costs and logistics are documented
- Customer satisfaction metrics are tracked

**Stock Restoration**
- When approved, stock quantities are restored
- Inventory records are created for restocked items
- Reason is recorded as "return refund"
- Inventory history tracks complete item lifecycle

**Payment Processing**
- Approved refunds trigger payment return to customer
- Refund amount may include or exclude original shipping
- Original payment method is used when possible
- Refund confirmation is sent to customer

**Return Shipping**
- Sellers can specify return shipping requirements
- Return address and instructions are communicated to customer
- Return shipping costs may be customer or seller responsibility
- Return confirmation is tracked when package arrives

**Order Status Update**
- Refunded item status changes to "refunded"
- Order status is recalculated based on remaining items
- If all items refunded, order status becomes "refunded"
- Remaining items continue normal processing

#### Refund Limitations

**Seller Refund Decision**
- Sellers cannot refund delivered items without customer initiating request
- Seller-initiated refunds follow same workflow
- Sellers can refuse refunds for damaged items outside policy
- Seller judgment is balanced against customer satisfaction

**System Refund**
- Administrators can force-refund items for policy violations
- Force refunds require administrator justification
- Force refunds preserve all original snapshots
- Force refunds restore inventory and process refunds

**Refund History**
- All refund attempts are recorded regardless of approval
- Refund patterns are analyzed for product quality improvement
- High refund rates trigger seller performance reviews
- Refund reasons are tracked for root cause analysis

**Return Logistics**
- Return shipping logistics are tracked in system
- Return confirmation timestamps are recorded
- Return inspection results are documented
- Return processing times are monitored

### Snapshot Principle Implementation

#### Order-Specific Snapshots

**Product and Variant Snapshots**
- When order items are created, product and variant snapshots are saved
- Snapshots capture all product fields at time of purchase
- Snapshots include all variant specifications and pricing
- Snapshots preserve images and descriptions as they appeared

**Seller Profile Snapshots**
- Seller shop name, description, and logo are snapshotted at order time
- Snapshots preserve seller identity for historical accuracy
- Changes to seller profile after order don't affect historical orders
- All seller information is preserved for dispute resolution

**Review Snapshots**
- When reviews are written for order items, reviews are snapshotted
- Review content, rating, and timestamp are preserved
- Review edits maintain history while showing current version
- Deleted reviews maintain snapshot history

**Snapshot Storage**
- All snapshots are immutable and cannot be deleted
- Snapshots are linked to original order items
- Snapshot version history is maintained for audit
- Snapshot access is granted to relevant parties

#### Snapshot Access Control

**Customer Access**
- Customers can view snapshots of their own order items
- Customers can see product and seller snapshots at time of purchase
- Customers can access their review snapshots
- Customers cannot view other users' order snapshots

**Seller Access**
- Sellers can view snapshots of their own products in orders
- Sellers can view their own profile snapshots
- Sellers can view review snapshots related to their products
- Sellers cannot view customer order history beyond their products

**Administrator Access**
- Administrators can view any order snapshot for oversight
- Administrators can view any product and seller snapshots
- Administrators can access all review snapshots
- Audit trail is maintained for all snapshot access

**Super Administrator Access**
- Super administrators have ultimate snapshot access
- Full system visibility for compliance and policy enforcement
- Complete audit trail across all system data
- Access is logged and monitored for security