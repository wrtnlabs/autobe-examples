## Seller Inventory Management

### Introduction

This document details the complete business requirements for seller product and inventory management within the shopping mall platform. Sellers, as distinct user actors, require precise control over their product catalog and real-time inventory visibility to ensure accurate fulfillment and customer trust. This workflow reconciles product listing with stock tracking at the SKU level, ensuring consistency across orders, refunds, and platform-wide inventory reporting.

### Adding a New Product

THE seller SHALL be able to create a new product listing by providing a product name, description, category, and at least one primary image.

WHEN a seller initiates product creation, THE system SHALL require the seller to define at least one product variant (SKU) with attribute values (e.g., color, size, material) for immediate inventory setup. 

THE system SHALL assign a unique product ID upon successful creation and display it to the seller for reference.

IF the product name or description contains profanity or explicit content, THEN THE system SHALL reject the submission and display a message: "Your product name or description contains inappropriate content. Please revise and try again."

WHILE a product is being created, THE system SHALL restrict other sellers from uploading identical products with identical names and attributes to prevent duplication.

### Managing SKU Variants

THE seller SHALL be able to create multiple SKU variants for each product, each representing a unique combination of attributes such as color, size, and material.

WHEN a seller adds a new SKU variant, THE system SHALL generate a unique SKU ID based on the product ID and attribute combination (e.g., PROD-123-COLOR-BLUE-SIZE-L).

THE seller SHALL be able to edit or rename SKU attribute values (e.g., change "Dark Blue" to "Navy") but SHALL NOT be able to change the SKU ID itself once the SKU has received orders.

WHILE the product is active and has open or pending orders, THE system SHALL prevent the deletion of any SKU variant that has received any order in the past 365 days.

IF the seller attempts to create a duplicate SKU variant with identical attribute values for the same product, THEN THE system SHALL display an error message: "This exact combination of attributes already exists. Please select different values."

### Inventory Entry and Updates

WHEN a seller sets initial inventory for a product SKU, THE system SHALL require the value to be zero or a positive integer — negative inventory is not permitted.

WHEN an order is confirmed by the customer (regardless of payment status), THE system SHALL automatically reduce the inventory level for each SKU in the order by the quantity purchased.

WHEN the seller manually updates inventory (e.g., receives new stock), THE system SHALL allow the seller to enter a new inventory count for each SKU, and SHALL overwrite the existing value with the new input.

WHILE inventory is being updated, THE system SHALL lock the SKU from further concurrent edits to prevent race conditions — under no circumstance shall two simultaneous edits result in an inconsistent inventory value.

### Low Stock Alerts

WHILE a SKU’s inventory level is 3 units or fewer, THE system SHALL flag the SKU as "Low Stock" in the seller’s dashboard.

WHEN a SKU transitions from 4 to 3 units, THE system SHALL send an automated email notification to the seller: "Low Stock Alert: [Product Name] - [SKU Variant] has only 3 units remaining. Please replenish soon."

THE system SHALL continue to send this alert every 24 hours until inventory reaches 10 or more units.

### Product Status Controls

THE seller SHALL be able to set a product or any of its SKUs to "Draft", "Active", or "Frozen" status.

WHEN a product or SKU is set to "Draft", THE system SHALL hide it from all customer-facing views (catalog, search, categories).

WHEN a product or SKU is set to "Frozen", THE system SHALL hide it from customer-facing views, prevent any further orders, but retain its order history and existing inventory data. 

THE seller SHALL be able to change status from "Frozen" to "Active" at any time.

IF the seller attempts to set a product to "Active" while all its SKUs have zero inventory, THEN THE system SHALL display the warning: "All variants of this product are out of stock. Customers will not be able to purchase until at least one SKU has inventory."

### Inventory Sync Across Sales Channels

THE system SHALL treat the platform’s inventory as the single source of truth for all seller inventory data. 

WHERE a seller has linked external sales channels (e.g., Amazon, eBay), THE system SHALL maintain separate inventory pools for each channel, and SHALL NOT automatically sync between them.

WHEN the seller manages inventory for a product on this platform, THE system SHALL NOT modify inventory levels on any external channel.

THE seller SHALL be able to view inventory levels per sales channel in separate tabs within the inventory management interface, but SHALL NOT initiate sync actions from within the platform.

### Inventory Audit Reports

THE seller SHALL be able to generate a downloadable report for any 30-day period showing the following:
- Daily inventory level for each SKU
- Number of sales per SKU per day
- Total units restocked manually
- Total units sold via automation (order confirmation)
- Average daily turnover rate

WHEN the seller generates an inventory report, THE system SHALL include the threshold alert concentration: percentage of SKUs that triggered a low-stock alert during the period.

THE report SHALL be exported as a CSV file and SHALL include timestamped records with granular unit-level changes.

THE system SHALL cache the most recent 3 reports per seller to improve response speed and reduce server load.

### Conclusion

This document defines the complete end-to-end business logic for seller inventory and product management on the shopping mall platform. Sellers must be able to reliably list products, manage variants, control visibility, receive proactive low-stock notifications, and audit performance — all while the system maintains atomic inventory consistency and prevents unauthorized or inaccurate updates. Every requirement here is designed to directly support product availability, order fulfillment accuracy, and seller operational autonomy, without requiring technical intervention from platform administrators.