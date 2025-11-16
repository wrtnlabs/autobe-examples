## Seller Product and Inventory Management

This document defines the complete end-to-end business requirements for seller product and inventory management within the shoppingMall platform. It specifies seller onboarding, product creation, variant management, inventory tracking, and sales analytics as functional business processes—not technical implementation details. All requirements are written in EARS format where applicable, using natural language anchored in business context.

### Seller Onboarding

Sellers are not granted immediate access to product listing capabilities. Registration as a seller is a two-phase process: registration and approval.

- A customer may upgrade their account to become a seller through the platform UI.
- Upon requesting seller status, THE system SHALL create an unapproved seller record and notify the admin team.
- WHILE the seller account status is pending, THE system SHALL prevent the seller from creating, editing, or deleting any products.
- WHEN an admin approves a seller application, THE system SHALL update the seller account status to "approved" and send a confirmation email.
- IF a seller application is rejected by an admin, THE system SHALL update the seller account status to "rejected" and notify the seller with a reason.
- WHERE seller status is "rejected", THE system SHALL prevent the user from reapplying for 30 days.
- THE seller SHALL only be able to access product and inventory management features after their account has been approved by an admin.
- THE system SHALL associate each approved seller with a unique seller ID for internal reference.

### Product Listing Creation

Each seller is permitted to create and manage their own product listings independently.

- WHEN a seller logs in and selects "Create Product", THE system SHALL display a form with required and optional fields.
- THE seller SHALL provide at minimum: product name, description, primary image, category, and base price.
- WHERE product category is selected, THE system SHALL validate the category exists in the platform’s approved taxonomy.
- THE system SHALL not allow product creation if any required field is empty or invalid.
- THE system SHALL generate a unique product ID for each new product listing.
- THE product listing SHALL be created in "draft" state by default and not visible to customers until published.
- WHEN a seller clicks "Publish", THE system SHALL validate all required fields and the minimum number of SKUs.
- THEN THE system SHALL set the product status to "published" and make it visible in the catalog.
- IF the product has no SKUs defined, THE system SHALL prevent publication and display an error: "At least one variant (SKU) must be defined before publishing."

### SKU Variant Definition

Products on shoppingMall must support multiple variants defined as SKUs (Stock Keeping Units), differentiated by combinations of attributes such as color, size, material, or configuration.

- THE seller SHALL be able to define one or more variants (SKUs) for any product.
- THE seller SHALL define each SKU with one or more attribute selections from predefined attribute sets (e.g., Color: Red, Blue, Green; Size: S, M, L).
- WHERE multiple attributes are selected, THE system SHALL generate a unique SKU string for each combination (e.g., "Red-S", "Blue-M").
- THE system SHALL display a grid or table view of all defined SKUs with controls for per-SKU configuration.
- FOR each SKU, THE seller SHALL set: inventory quantity, price adjustment, and SKU image (optional).
- THE price adjustment for each SKU SHALL be a percentage or absolute value added/subtracted from the base price.
- THE system SHALL enforce that no two SKUs for the same product have identical attribute combinations.
- WHERE a SKU is required but not provided, THE system SHALL show a validation alert: "Every product must have at least one SKU variant."
- THE system SHALL not allow deletion of a SKU that has order history.
- WHEN a customer selects a specific SKU variant during purchase, THE system SHALL display the exact SKU name (e.g., "Red - Size L") and its associated price.

### Inventory Level Management

Inventory must be tracked and managed at the SKU level—not at the product level—to ensure accurate availability per variant.

- THE system SHALL maintain a real-time inventory count for each SKU.
- WHEN an order is placed and payment is confirmed, THE system SHALL reduce the inventory count for each SKU in the order by the quantity purchased.
- WHILE inventory for a SKU is zero, THE system SHALL display "Out of Stock" to all customers and disable selection of that SKU.
- THE system SHALL prevent sellers from reducing inventory below zero via manual adjustment.
- THE system SHALL allow only admins to manually override inventory levels for any SKU.
- WHEN a seller attempts to edit or create a SKU, THE system SHALL display the current inventory level as read-only information.
- THE system SHALL maintain a historical log of all inventory adjustments, including who made the change and when.

### Stock Alerts

To prevent lost sales due to stockouts, sellers must be proactively alerted as inventory approaches zero.

- WHILE inventory for any SKU is less than or equal to 5% of the original stock quantity, THE system SHALL notify the seller via dashboard alert and email.
- WHILE inventory for any SKU is less than or equal to 1% of the original stock quantity, THE system SHALL send an urgent alert to the seller via email and in-app notification.
- WHERE a seller has enabled "low stock email notifications," THE system SHALL send an automated email to the seller’s registered email when a SKU triggers a 5% or 1% threshold.
- THE system SHALL not send duplicate alerts for the same SKU within a 24-hour window.
- THE alert message SHALL include: Product name, SKU identifier, current inventory, original stock, and a direct link to edit inventory.

### Product Edit and Deletion

Sellers may modify existing product listings, but with constraints to maintain transactional integrity and customer trust.

- WHEN a seller edits a published product, THE system SHALL allow changes to: product name, description, images, category, base price, and SKU attribute labels.
- WHERE a product has existing order history, THE system SHALL prohibit deletion of any SKU that has been purchased.
- THE system SHALL allow deletion of a product only if ALL SKUs have zero sales history.
- IF a seller attempts to delete a product with prior sales, THE system SHALL display: "This product cannot be deleted because it has sales history. To archive, unpublish instead."
- WHEN a product is unpublished, THE system SHALL remove it from public search and category views but retain the listing for order history and reporting.
- THE system SHALL preserve all historical SKUs for a product even after editing.

### Pricing Management

Sellers have full control over SKU pricing, subject to platform policy on transparency and fairness.

- THE seller SHALL set a base price for the product and apply individual price adjustments per SKU.
- Price adjustments SHALL be limited to a range of -90% to +500% of the base price.
- WHERE a SKU’s adjusted price exceeds the platform’s maximum price ceiling (e.g., $10,000), THE system SHALL display an error: "SKU price exceeds platform maximum allowed price."
- THE system SHALL calculate and display the final SKU price to the seller in real-time as adjustments are made.
- THE system SHALL not allow negative pricing (i.e., free products enabled only via promo codes, not direct SKU pricing).
- THE product base price SHALL be visible to customers as the "starting from" price.
- WHEN a seller changes the base price, THE system SHALL NOT retroactively adjust the prices of existing SKUs—only new SKUs will inherit the new base price.

### Sales Analytics

Sellers require actionable, real-time insights into their product performance to optimize inventory and marketing.

- THE system SHALL display to each seller: total products listed, total sales revenue, total units sold, average order value, and best-selling SKU.
- WHEN a seller navigates to sales analytics, THE system SHALL show data for the last 7, 30, or 90 days (user selectable).
- THE system SHALL allow the seller to filter analytics by product, category, or SKU.
- THE seller SHALL be able to export sales data as a CSV file including: date, product name, SKU, quantity sold, revenue, and shipping region.
- THE system SHALL generate a weekly summary email to sellers with top-selling products, inventory alerts, and trend graphs.
- THE system SHALL not display customer identification data or contact information in any analytics view.
- WHERE a seller has multiple products, THE system SHALL rank products by total revenue and show percent contribution to overall sales.
- THE system SHALL calculate earnings after platform commission (displayed as net profit) and provide a tax-ready summary.

### Business Context & Integration

This document defines the business requirements for seller operations within the shoppingMall platform. It assumes the customer and admin workflows described in related documents (e.g., 03-account-and-address-management.md, 06-order-placement-and-payment.md, 11-admin-dashboard.md).

The flow begins when a customer registers and chooses to become a seller. Their application is reviewed by an admin. Once approved, they can begin creating products with multiple SKUs. Each SKU carries its own inventory, which is dynamically reduced upon purchase. As inventory declines, automated alerts trigger to notify the seller. The seller can view their sales performance and adjust pricing or inventory as needed. Products with purchase history cannot be deleted to maintain order integrity.

Seller operations are deliberately isolated from customer operations to prevent interference and ensure business fairness. Admins retain ultimate authority to approve, suspend, or override for platform integrity.




> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*