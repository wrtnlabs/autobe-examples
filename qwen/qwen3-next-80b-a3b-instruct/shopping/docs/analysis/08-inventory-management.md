## Inventory Management Requirements

### Inventory per SKU

THE shoppingMall system SHALL track inventory levels at the individual SKU (Stock Keeping Unit) level for every product variant. Each SKU represents a unique combination of product attributes such as size, color, material, or configuration, and must have its own independent inventory count that is separate from other variants of the same product. For example, a t-shirt product with variants 'Small/Red', 'Medium/Blue', and 'Large/Black' must have three separate inventory counters, each tracking only its specific variant.

WHEN a new product variant is created by a seller, THE system SHALL automatically initialize its inventory to zero and require the seller to explicitly set an initial stock level before the variant becomes available for sale.

WHILE any product variant is listed as available for sale, THE system SHALL ensure its inventory level cannot be negative under any circumstances.

### Stock Level Tracking

THE system SHALL maintain real-time, up-to-date inventory counts for every SKU across all sellers. All inventory changes must be recorded with an audit trail that includes:
- The timestamp of the change
- The seller ID responsible
- The type of change (sale, return, adjustment, transfer)
- The previous and new inventory levels
- The order ID or reason associated with the change

WHEN a customer adds a product variant to their cart, THE system SHALL record the current inventory level before applying any reservations to prevent race conditions during concurrent purchases.

### Reservations

WHEN a customer initiates checkout and selects items to purchase, THE system SHALL reserve the exact quantities of each SKU in their cart for a period of 15 minutes. During this time, the reserved inventory must not be available for purchase by other customers.

WHILE a cart remains active with reserved inventory, THE system SHALL display 'Reserved' status to other users attempting to view the same product variant and reduce the publicly displayed available quantity by the reserved amount.

IF a user abandons their checkout process and does not complete payment within 15 minutes, THE system SHALL automatically release the reserved inventory back to the available stock.

THEN THE system SHALL log the release event and notify the seller if the reserved quantity was greater than 10 units, as a potential sign of cart abandonment abuse.

### Threshold Alerts

WHILE inventory for any SKU falls below a threshold of 5 units, THE system SHALL trigger an automated low-stock alert to the associated seller.

THE system SHALL send the alert via both in-app notification and email, including:
- Product name and SKU identifier
- Current inventory level
- Historical sales trend for the SKU over the past 30 days
- Recommended minimum reorder quantity based on average weekly sales
- Link to the seller's inventory management dashboard

WHEN an SKU reaches zero inventory, THE system SHALL automatically change its status to 'Out of Stock' and disable the 'Add to Cart' button on the product page for all customers.

### Stock Transfers

WHERE a seller operates multiple warehouse locations, THE system SHALL allow manual transfer of inventory between locations.

WHEN a seller initiates a stock transfer between warehouses, THE system SHALL require the seller to specify:
- The source warehouse
- The destination warehouse
- The SKU being transferred
- The quantity to transfer
- A reason for the transfer (e.g., 'seasonal redistribution', 'damaged stock replacement')

THEN THE system SHALL deduct the specified quantity from the source warehouse and add it to the destination warehouse, creating a transfer record that is visible only to the seller and system administrators.

### Inventory Adjustment

WHERE a seller needs to correct inventory discrepancies due to damage, theft, or counting errors, THE system SHALL allow manual inventory adjustments.

WHEN a seller performs an inventory adjustment, THE system SHALL require:
- The SKU being adjusted
- The difference in quantity (positive for increase, negative for decrease)
- A mandatory reason field with minimum 20 characters of explanation
- Acknowledgment that the adjustment may trigger audit review

THE system SHALL then update the inventory count and create an audit trail entry that is visible to administrators and includes the seller’s stated reason.

IF the adjustment amount exceeds 20% of the SKU’s average weekly sales volume, THE system SHALL temporarily freeze the product listing and notify an admin for fraud detection review.

### Reordering Logic

THE system SHALL provide automated reordering recommendations to sellers based on historical sales data and current inventory levels.

WHEN a seller’s inventory for a SKU has been below the threshold of 5 units for more than 72 consecutive hours, THE system SHALL generate a reordering suggestion with:
- Recommended order quantity = 1.5x average weekly sales
- Estimated delivery timeframe (based on supplier lead time)
- Historical cost per unit and projected profit margin
- Link to preferred supplier catalog or suggested restock vendors

WHILE a seller has not reordered a SKU within 14 days of the last recommendation, THE system SHALL send a final 'Payment Required' alert indicating that failure to restock may result in listing suspension.

### Stock Discrepancy Handling

WHEN inventory reconciliation reports identify discrepancies between recorded inventory and actual physical count (e.g., due to scanning errors or system failures), THE system SHALL initiate a discrepancy resolution workflow.

IF a discrepancy exceeds 10% of total inventory value for a seller’s entire catalog in a single month, THE system SHALL:
- Automatically suspend the seller’s ability to list new products
- Initiate a mandatory inventory audit with photo verification of stock
- Notify both the seller and admin team
- Hold all payouts until resolution is confirmed

THEN THE system SHALL provide the seller with a 48-hour window to upload corrected inventory data with supporting documentation (label photos, warehouse logs, etc.).

WHEN discrepancies are resolved, THE system SHALL update inventory records and restore seller privileges, with all actions logged for compliance.

IF discrepancies remain unresolved after 7 days, THE system SHALL permanently suspend the seller account and initiate financial recovery procedures.

WHILE inventory data is being reconciled, THE system SHALL make all affected product variants unavailable for purchase and display a 'Inventory Verification in Progress' message to customers.