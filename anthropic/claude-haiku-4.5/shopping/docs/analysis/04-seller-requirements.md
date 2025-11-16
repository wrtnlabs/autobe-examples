# Seller Requirements and Capabilities - Enhanced

## Executive Summary

The Seller component of the e-commerce shopping mall platform enables independent merchants to establish and operate online stores, manage product catalogs, control inventory at the SKU level, process customer orders, handle fulfillment and shipping, and track business performance through comprehensive analytics. Sellers represent the supply side of the marketplace, and this document comprehensively defines all capabilities, responsibilities, and business rules that govern seller interactions with the platform.

This document provides detailed requirements for the seller system, encompassing account management, product operations, inventory management, order fulfillment, analytics, and commission tracking. All requirements follow the EARS format to ensure clarity, testability, and actionability for development teams.

---

## 1. Seller Store Setup and Management

### 1.1 Seller Account Registration and Verification

WHEN a new merchant requests to join the platform, THE system SHALL enable them to create a seller account by providing business information, contact details, and banking information for commission payments.

THE system SHALL require sellers to complete account verification before they can list products. Verification includes confirmation of business email, phone number validation, and review of submitted business documentation.

WHEN a seller completes the verification process, THE system SHALL send a confirmation notification and grant them access to the seller dashboard with initial set of management tools.

THE system SHALL require sellers to provide the following mandatory information during registration:
- Business legal name
- Business registration number or tax identification number
- Business contact email address
- Business phone number
- Business address (street, city, state, postal code, country)
- Banking information for commission payments:
  - Bank account holder name
  - Bank name and routing number
  - Account number (for direct deposits)
  - Tax identification number
  - Preferred payment frequency (weekly, bi-weekly, monthly)

IF a seller's application is rejected after submission, THEN THE system SHALL send a notification explaining the reason for rejection and provide options for reapplication or contacting support.

WHEN a seller's registration is approved by an admin, THE system SHALL activate the seller account and send a welcome notification with store dashboard access credentials.

THE seller account verification process SHALL be completed within 5 business days of application submission. IF verification cannot be completed within 5 days, THEN THE system SHALL notify the seller of the delay and expected completion date.

### 1.2 Seller Store Profile and Branding

WHEN a seller accesses their account, THE system SHALL display a store profile section where they can configure:
- Store name (unique, 3-100 characters)
- Store description (500-2000 characters describing their business)
- Store logo image (recommended 200x200px, max 2MB)
- Store banner/header image (recommended 1200x300px, max 5MB)
- Store contact information (phone, email, business hours)
- Store return and refund policies
- Store shipping and delivery policies
- Store location/regions served

THE seller's store profile SHALL be visible to customers on the platform as a distinct storefront. WHEN a customer visits the seller's store page, THE system SHALL display:
- Store name with logo
- Store description and information
- Store ratings and performance metrics
- Store policies
- All products from that seller
- Customer reviews of seller
- Links to contact seller

WHEN a seller updates their store profile information, THE system SHALL validate all required fields and display the changes immediately to customers browsing the storefront (within 2 minutes).

THE system SHALL allow sellers to upload and manage multiple store images for their storefront. THE system SHALL support 10+ images per store profile.

### 1.3 Seller Account Status and Management

THE system SHALL maintain seller account status with the following values:
- "pending_verification" - Application submitted, awaiting verification
- "active" - Account verified and able to list products
- "suspended" - Account suspended due to policy violation (temporary)
- "deactivated" - Account deactivated by seller (voluntary pause)
- "rejected" - Application rejected (cannot be reversed; must reapply)

WHEN a seller's account status is "pending_verification", THE seller SHALL NOT be able to list products or create orders but SHALL be able to prepare product listings (draft mode).

WHEN a seller's account status is "suspended" by admin, THE system SHALL:
- Prevent new product listings and uploads
- Prevent new orders from being accepted
- Continue fulfilling existing orders
- Preserve all order history and data
- Notify seller of suspension reason and duration (if temporary)
- Provide path to appeal suspension

WHEN a seller's account status is "deactivated" by the seller (voluntary), THE system SHALL:
- Remove all products from customer view
- Stop accepting new orders
- Preserve existing orders for fulfillment
- Allow seller to reactivate account at any time by logging in

### 1.4 Seller Onboarding Experience

WHEN a seller completes initial account setup, THE system SHALL provide a guided onboarding experience with a checklist of key tasks:
1. Complete business verification (status shown)
2. Complete store profile (name, description, image)
3. Configure payment information
4. Configure return/refund policies
5. Add first product
6. Set up shipping methods
7. Familiarize with seller dashboard

THE system SHALL display a progress indicator showing completion percentage. WHEN each checklist item is completed, THE system SHALL mark it as done and provide next steps.

THE system SHALL offer educational resources including:
- Getting started guide (PDF)
- Video tutorials on key features
- Best practices for product listings
- Tips for maximizing sales
- Help articles and FAQ
- Link to seller support team

WHEN a new seller completes onboarding, THE system SHALL send them a welcome email with:
- Dashboard login link
- Quick start guide
- First steps to list products
- Support contact information
- Link to merchant community (if applicable)

### 1.5 Seller Suspension and Account Recovery

WHEN a seller violates platform policies (fraudulent activity, policy violations, etc.), THE admin SHALL have authority to suspend the account. THE system SHALL:
- Move account to "suspended" status
- Prevent new product uploads and orders
- Preserve existing order history
- Send suspension notice to seller with reason
- Provide explanation of violation and steps to remediation

THE seller SHALL have the ability to submit an appeal of suspension with explanation. WHEN an appeal is submitted, THEN THE system SHALL route it to a senior admin for review within 3 business days.

IF the appeal is approved, THEN THE system SHALL restore seller account to "active" status and send confirmation to seller.

IF the appeal is denied, THEN THE seller has the option to reapply after 30 days if they believe they have remediated the issues.

---

## 2. Product Catalog Management by Sellers

### 2.1 Product Creation and Information Entry

WHEN a seller clicks to create a new product, THE system SHALL provide a comprehensive product creation form with the following mandatory fields:

**Product Identity Information**:
- Product name (50-255 characters, unique per seller per category)
- Product brand/manufacturer (if applicable)
- Product SKU or model number (seller-defined, up to 50 characters)
- Product description (500-5000 characters with formatting support: bold, italic, lists, links)
- Category selection (required; seller must select from platform taxonomy)
- Primary category and optional secondary categories (up to 3 additional)

**Product Details and Specifications**:
- Product weight (required for shipping calculation)
- Product dimensions (length, width, height in inches or cm)
- Material composition (textile, plastic, metal, etc.)
- Care instructions (washing, storage, maintenance)
- Warranty information (if applicable)
- Safety certifications or standards compliance
- Manufacturing country (required for international shipping)
- Product condition (New, Like New, Refurbished)

**Product Images and Media**:
- Minimum 1 product image (required)
- Recommended minimum 3 product images
- Maximum 20 product images per product
- Support for JPEG, PNG, WebP formats
- Minimum resolution: 500x500 pixels
- Maximum file size: 10MB per image

WHEN a seller submits a new product listing, THE system SHALL:
1. Validate all required information is complete
2. Verify category selection is valid
3. Confirm at least one product image is provided
4. Check product name is unique for this seller in this category
5. Validate description length and formatting
6. Validate image file types and sizes

IF validation fails, THEN THE system SHALL display specific error messages identifying missing or invalid fields.

WHEN validation passes, THEN THE system SHALL:
1. Create product record with "draft" status
2. Display confirmation to seller
3. Allow seller to add pricing and variants
4. Allow seller to preview product before publishing

### 2.2 Product Information Management and Editing

WHEN a seller accesses an existing product, THE seller SHALL be able to edit:
- Product name and description
- Product category and tags
- Product brand and specifications
- Product weight and dimensions
- Product images (add, remove, reorder)
- Care instructions and warranty info
- Material composition and care details

WHEN a seller updates product information, THE system SHALL immediately reflect changes in the product catalog visible to customers (within 2 minutes).

THE system SHALL maintain product creation timestamp and display it to the seller. THE system SHALL also maintain last modified timestamp and display it to the seller.

WHEN a seller updates a product's description or images, THE system SHALL:
- Preserve all previous product information for rollback if needed
- Update customer-visible product page immediately
- Update search index within 5 minutes
- NOT affect existing orders (orders show product details as they were at order time)

THE seller SHALL NOT be able to change the product SKU after initial creation (to prevent confusion with orders and inventory).

### 2.3 Bulk Product Operations

THE system SHALL support sellers importing and updating multiple products at once through:
- CSV file upload with product data
- Bulk edit form for multiple products
- Bulk price changes across multiple SKUs
- Bulk category reassignments
- Bulk status changes (publish/unpublish)

WHEN a seller uploads a bulk product file (CSV format), THE system SHALL:
1. Validate file format (correct columns, data types)
2. Validate each product's information
3. Check for duplicate SKUs
4. Verify category assignments
5. Preview changes before applying (show summary of additions/updates)
6. Allow seller to confirm or cancel
7. Report success count and any errors
8. Generate report of processed items

IF validation errors are found in a bulk operation, THEN THE system SHALL report specific row numbers and error types without applying any changes, allowing the seller to correct and resubmit.

THE system SHALL support bulk operations on up to 1000 products per upload.

---

## 3. Product Variants and SKU Management

### 3.1 Product Variant Structure and Relationships

THE system SHALL define three distinct levels in the product hierarchy:

**Level 1 - Product (Parent)**:
- The logical grouping of all related variants (e.g., "Nike Running Shoe Model XYZ")
- Contains product-level metadata, descriptions, and general information
- Has one or more variants representing different option combinations
- Belongs to one or more categories
- Managed by a single seller

**Level 2 - Variant**:
- A specific combination of product options (e.g., "Nike Running Shoe in Red, Size 10, Wide Width")
- Defined by a unique combination of attributes (colors, sizes, custom options)
- Has its own pricing, inventory, and optionally variant-specific images
- References a unique SKU for inventory tracking
- Can have variant-specific descriptions and specifications

**Level 3 - SKU (Stock-Keeping Unit)**:
- A unique identifier for each distinct product variant
- Tracks inventory quantity for that specific variant
- Links to pricing and availability information
- Used for order fulfillment and inventory management
- One SKU per distinct product variant (one-to-one relationship)

WHEN a seller creates a "Configurable" product (a product with variants), THE system SHALL require selection of which product attributes will define variants (e.g., Color, Size).

THE system SHALL allow sellers to specify attributes from the following list or create custom attributes:
- Standard: Color, Size, Material, Style, Capacity, Weight, Length
- For Apparel: Color, Size, Width, Length, Material, Pattern
- For Electronics: Color, Storage Capacity, Memory (RAM), Screen Size
- Custom attributes (seller-defined for specialty products)

THE system SHALL automatically generate all logical combinations of attribute values as separate variants. EXAMPLE: If a seller selects Color (Red, Blue, Green) and Size (Small, Medium, Large), the system generates 9 variant combinations (3 colors × 3 sizes).

### 3.2 SKU Configuration and Management

FOR each product variant (SKU), THE seller SHALL be able to configure and modify:
- Variant-specific attributes (color name/code, size designation, dimension specifications, weight)
- Variant-specific pricing (can differ from other variants)
- Variant-specific images (can be unique to each variant or inherit from base product)
- Variant availability status (in stock, low stock, out of stock, discontinued)
- Variant minimum and maximum purchase quantities

WHEN a seller creates multiple variants for a single product, THE system SHALL display them in a structured variant table showing:
- Each variant with its attributes
- Individual price for each variant
- Current stock level for each variant
- Availability status for each variant
- Images associated with each variant
- Ability to edit each variant's details

THE seller SHALL be able to add or remove variants from the product at any time, as long as the operation does not affect active customer orders.

IF a seller attempts to delete a variant that has active orders, THEN THE system SHALL prevent deletion and display message: "Cannot delete this variant as it has pending orders. Variant may be marked as discontinued."

### 3.3 SKU Identification and Tracking

THE system SHALL generate or accept unique SKU identifiers for each product variant. THE seller SHALL have two options:

**Option 1 - Seller-Defined SKUs**:
- Seller provides custom alphanumeric SKU codes (maximum 50 characters)
- EXAMPLE: "NIKE-SHOE-BLU-10-WID"
- System validates that SKU is unique per seller within the system
- Seller can update SKU before product is published (not after)
- Helpful for sellers using existing inventory systems

**Option 2 - System-Generated SKUs**:
- System auto-generates SKUs using product ID and variant attributes
- EXAMPLE: Product ID "PROD123", variant generates "PROD123-RED-SMALL-STD"
- System ensures uniqueness automatically
- Seller receives the generated SKU for reference and system operations

WHEN a product is added to a customer's cart or order, THE system SHALL use the SKU to identify the exact variant ordered.

THE system SHALL never allow duplicate SKUs for the same seller. IF a seller attempts to create a duplicate SKU, THEN THE system SHALL display error message: "This SKU already exists for this product. Please use a unique SKU identifier."

### 3.4 Variant Pricing Management

WHEN a seller creates variants, THE system SHALL require pricing configuration with two models:

**Model 1 - Uniform Pricing**:
- Seller sets one base price
- All variants inherit the same price
- EXAMPLE: All shirt colors and sizes are $29.99

**Model 2 - Variant-Specific Pricing**:
- Seller sets different prices for different variants
- Enables capturing different manufacturing or value costs per variant
- EXAMPLE: Small size is $24.99, Medium is $29.99, Large is $34.99

WHEN a seller selects variant-specific pricing, THE system SHALL:
- Display individual prices for each variant combination
- Allow bulk price editing for multiple variants at once (apply price to multiple SKUs simultaneously)
- Support percent-based price adjustments (e.g., "Large sizes add 10% to base price")
- Highlight price differences between variants clearly
- Apply changes immediately to customer-facing product page

THE system SHALL display the lowest price prominently in product listings when variants have different prices (e.g., "From $24.99").

WHEN a seller updates variant pricing, THE system SHALL:
- Apply changes immediately to the product page
- NOT affect orders already placed (pricing locked at order time)
- Update search index within 5 minutes
- Notify seller of successful price update

---

## 4. Pricing and Inventory Management for Sellers

### 4.1 Inventory Tracking Per SKU (Seller Perspective)

WHEN a seller manages their inventory, THE system SHALL display current available stock for each SKU they manage, updated in real-time without requiring page refresh.

THE seller's inventory dashboard SHALL display for each SKU:
- Product name and SKU identifier
- Current available stock quantity
- Stock status (In Stock, Low Stock, Out of Stock, Discontinued)
- Reserved quantity (pending orders)
- Sold quantity (cumulative)
- Configured low stock threshold
- Last updated timestamp

THE system SHALL track the following inventory states for each SKU:
- **Total Stock**: The complete physical inventory quantity available
- **Reserved Stock**: Quantity allocated to pending or placed orders
- **Available Stock**: Calculation (Total Stock - Reserved Stock - Damaged/Defective units)
- **Status**: Current stock status category

WHEN inventory for a specific SKU changes (due to orders, returns, or manual adjustments), THE system SHALL update the seller's inventory dashboard within 10 seconds.

### 4.2 Initial Inventory Setup and Uploads

WHEN a seller creates a product variant (SKU), THE system SHALL require them to enter the initial inventory quantity.

WHEN a seller enters inventory quantity, THE system SHALL accept:
- Numeric value representing physical units in stock
- Minimum: 0 (allowed for pre-order products)
- Maximum: 999,999 units per SKU

THE system SHALL allow sellers to upload initial inventory for multiple SKUs through:
- Individual SKU entry (manual one-by-one input)
- Bulk CSV upload (multiple SKUs in single file)

WHEN a seller uploads a bulk inventory file, THE system SHALL:
1. Validate file format and data types
2. Parse inventory quantities for each SKU
3. Verify SKUs exist in the system
4. Check for format errors or missing data
5. Show preview of changes before applying
6. Allow seller to confirm or cancel
7. Apply changes atomically (all or nothing)
8. Report success count and errors

IF validation errors exist in bulk inventory file, THEN THE system SHALL NOT apply any changes, allowing seller to correct and resubmit.

### 4.3 Inventory Level Thresholds and Alerts

WHEN a seller manages their product inventory, THE seller SHALL be able to configure a custom "low stock alert threshold" for each SKU (e.g., alert when inventory drops below 10 units).

WHEN a seller does not manually set a low stock threshold, THE system SHALL apply a default threshold of 5 units per SKU.

WHEN inventory for a specific SKU falls to or below the configured low stock threshold, THE system SHALL:
1. Change the SKU's status to "Low Stock"
2. Send a notification to the seller via email
3. Display a low stock indicator on the seller's dashboard
4. Show "Low Stock" badge on customer-facing product page ("Only X items left")

THE seller SHALL receive low stock alerts through:
- In-app notification (visible on dashboard)
- Email notification to seller's registered email
- SMS notification (if seller has enabled this preference)

THE system SHALL NOT send duplicate low stock alerts for the same SKU within 24 hours (preventing alert fatigue).

WHEN inventory reaches zero for a specific SKU, THE system SHALL:
1. Change status to "Out of Stock"
2. Disable the "Add to Cart" button for that SKU on product page
3. Send notification to seller
4. Suggest seller update inventory or mark as discontinued
5. Display on seller dashboard as requiring action

### 4.4 Stock Reservations During Orders

WHEN a customer places an order, THE system SHALL:
1. Verify available inventory exists for each ordered SKU
2. Check that Available Stock >= Ordered Quantity
3. Reserve the inventory immediately upon payment confirmation
4. Move the quantity to "Reserved Stock"
5. Reduce "Available Stock" accordingly

THE seller's available inventory SHALL immediately reflect the reservation. WHEN the seller views their inventory dashboard after an order is placed, THE system SHALL display reduced available stock (Reserved - Available = Reserved quantity).

WHEN an order is cancelled, THE system SHALL:
1. Release the reserved inventory
2. Add quantity back to "Available Stock"
3. Update seller's dashboard within 10 seconds
4. Make inventory available for other customers' purchases

WHEN an order is returned and refunded, THE system SHALL:
1. Release the reserved inventory (if not yet fulfilled)
2. Restore the quantity to "Available Stock"
3. Update seller's dashboard

THE system SHALL prevent overselling under all circumstances. THE system SHALL NEVER allow available inventory to go negative.

### 4.5 Manual Inventory Adjustments and Corrections

THE seller SHALL be able to manually adjust inventory quantities for specific SKUs through:
- Individual adjustment form (for single SKUs)
- Bulk adjustment (for multiple SKUs at once)

WHEN a seller submits a manual inventory adjustment, THE system SHALL require:
- The SKU being adjusted
- The quantity change (positive for restock, negative for loss)
- The reason for adjustment (damage, count correction, loss, return, shrinkage, etc.)
- Optional notes explaining the adjustment

THE system SHALL validate that:
- SKU exists and belongs to the seller
- Quantity change is a valid number
- Adjustment reason is selected from predefined list
- (For reductions) New inventory level would not be negative

IF validation fails, THEN THE system SHALL display error message and prevent the adjustment.

WHEN an adjustment is submitted, THE system SHALL:
1. Immediately apply small adjustments (<5 units)
2. Require admin approval for large adjustments (5+ units) to prevent fraud
3. Record adjustment with timestamp and seller ID
4. Update seller's available inventory
5. Log adjustment in inventory audit trail

WHEN an admin approves a pending inventory adjustment, THE system SHALL:
1. Apply the adjustment to inventory
2. Update seller's dashboard
3. Notify seller of approval and new inventory level

---

## 5. Product Visibility and Featured Products

### 5.1 Product Publishing Status and Lifecycle

EACH product listed by a seller SHALL have a publication status indicating its availability:
- "draft" - Product created but not published; not visible to customers
- "published" - Product is live and visible to customers; available for purchase
- "unpublished" - Product temporarily hidden from customers; preserved for future republishing
- "archived" - Product permanently retired from sale; preserved in records only

WHEN a seller creates a product, THE initial status SHALL be "draft" until the seller explicitly publishes it.

WHEN a seller saves a product in draft status, THE seller SHALL be able to:
- Revisit the product and continue editing
- Preview the product as customers will see it
- Publish the product when ready
- Delete the product (if no orders exist)

WHEN a seller clicks "Publish" on a product in draft status, THE system SHALL:
1. Validate all required product information is complete:
   - Product name and description
   - At least one category assigned
   - At least one product image uploaded
   - For configurable products: at least one variant defined
   - For all variants: inventory quantities specified
   - For all items: pricing configured
2. Validate inventory levels are non-negative
3. Validate prices are greater than zero
4. If validation passes: change status to "published" and make product visible to customers
5. If validation fails: display specific error messages and prevent publication

WHEN a product is published, THE system SHALL:
1. Make the product visible in customer search results within 5 minutes
2. Add product to category pages
3. Index product for search engine crawling
4. Display "New" badge for products published within last 7 days
5. Notify seller of successful publication

WHEN a seller clicks "Unpublish" on a published product, THE system SHALL:
1. Immediately remove product from customer search results
2. Remove product from category pages
3. Remove product from related recommendations
4. Change status to "unpublished"
5. Preserve all product data and order history
6. Allow seller to republish product at any time

THE seller SHALL NOT be able to delete or archive a product that has active orders. IF seller attempts deletion when orders exist, THEN THE system SHALL display message: "Product cannot be deleted while active orders are pending. Please wait for all orders to complete or be cancelled."

### 5.2 Featured and Promotional Visibility

THE seller SHALL be able to mark specific products as featured within their store, prioritizing them for display in their storefront.

WHEN a seller marks a product as featured, THE system SHALL:
1. Display product prominently in their store profile (top section)
2. Consider product for platform-wide featured product listings (if meets quality standards)
3. Store featured status with timestamp
4. Display "Featured" badge on product page

THE seller MAY mark up to 10 products as featured. IF seller attempts to feature more than 10 products, THEN THE system SHALL prevent the action and display message: "Maximum 10 featured products allowed. Please unfeature another product first."

THE admin MAY also promote sellers' products to platform-wide featured listings (homepage, category pages) based on performance, quality, and ratings.

### 5.3 Category and Tag Management

WHEN a seller creates or updates a product, THE seller SHALL assign the product to appropriate categories from the platform's product taxonomy.

WHEN assigning categories, THE system SHALL:
1. Require primary category selection (mandatory)
2. Allow secondary category assignment (optional, up to 3 additional categories)
3. Display category hierarchy for easy navigation
4. Validate that selected categories exist in the taxonomy

WHEN a seller assigns categories, THE product SHALL appear in search results when customers filter by those categories.

THE seller SHALL be able to assign multiple tags to products to improve discoverability:
- Material composition (e.g., "cotton", "polyester", "stainless steel")
- Color (e.g., "blue", "red", "multicolor")
- Style (e.g., "casual", "formal", "athletic")
- Seasonal tags (e.g., "summer", "winter", "spring")
- Brand tags (e.g., "Nike", "Samsung", "Dyson")
- Size tags (e.g., "plus-size", "petite", "oversized")

THE seller SHALL be able to enter custom tags relevant to their products. TAGS help customers filter and discover products through search.

---

## 6. Order Management and Fulfillment for Sellers

### 6.1 Order Visibility and Notification

WHEN customers place orders containing products from the seller's catalog, THE system SHALL notify the seller immediately of the new order.

THE notification SHALL be delivered through:
- In-app notification (visible on seller dashboard)
- Email notification to seller's registered email
- SMS notification (if seller has enabled this preference)

WHEN a seller accesses their dashboard, THE system SHALL display all orders containing their products with the following information:
- Order ID and order date/time
- Customer information (name, delivery address, contact number)
- Order items with product names, SKUs, quantities, and prices
- Order total amount
- Current order status
- Seller's fulfillment status (whether seller has shipped yet)

THE seller SHALL be able to view orders with filtering by:
- Order status (new, confirmed, preparing, shipped, delivered, cancelled, refunded)
- Date range
- Order amount range
- Fulfillment status

WHEN a seller clicks on a specific order, THE system SHALL display complete order details including:
- All items ordered with prices and variants
- Customer delivery address (complete address shown)
- Shipping method selected and cost
- Special delivery instructions or requests from customer
- Current order status and timeline
- Any communication or notes from customer or customer support

### 6.2 Order Confirmation and Fulfillment Workflow

WHEN an order is placed and payment is confirmed, THE order is automatically in "confirmed" status and THE seller SHALL see it in their dashboard under "Orders to Fulfill" section.

WHEN a seller receives a new order notification, THE seller SHALL:
1. Review the order details
2. Verify that all items are in stock
3. Confirm that the order can be fulfilled

IF the seller determines they CANNOT fulfill the order (unexpected stock shortage, damaged goods, etc.), THEN THE seller SHALL click "Cannot Fulfill" and provide a reason.

WHEN a seller marks an order as "Cannot Fulfill", THE system SHALL:
1. Notify the customer immediately of the issue
2. Initiate an automatic refund process
3. Release inventory reservations
4. Update order status to "Cannot Be Fulfilled"
5. Allow customer to reorder from other sellers if applicable

WHEN the seller is ready to prepare the order, THE seller SHALL:
1. Pick items from inventory
2. Inspect items for quality and damage
3. Pack items securely for shipment
4. Mark items as ready to ship in the system

THE system SHALL NOT require any manual action until the seller clicks "Mark as Shipped".

### 6.3 Shipment Creation and Tracking Information

WHEN a seller is ready to ship an order, THE seller SHALL click "Mark as Shipped" and provide:
- Shipping carrier name (UPS, FedEx, USPS, DHL, regional carrier, etc.)
- Tracking number assigned by carrier
- Estimated delivery date
- Shipping method used (for reference)
- Optional: Upload of shipping label or carrier receipt

WHEN a seller submits shipment information, THE system SHALL:
1. Validate tracking number format matches the selected carrier (if possible)
2. Store tracking number in the order record
3. Update order status to "Shipped"
4. Immediately notify customer with:
   - Tracking number and carrier information
   - Tracking link to carrier's tracking system
   - Estimated delivery date
   - Instructions for following shipment
5. Update seller's order fulfillment status to "Shipped"
6. Move order from "Orders to Fulfill" to "Shipped Orders"
7. Trigger automatic tracking updates from carrier

THE system SHALL begin polling the shipping carrier for tracking updates every 6 hours once a shipment is created.

### 6.4 Bulk Shipment Updates

THE system SHALL support bulk shipment updates where sellers can update multiple orders at once.

WHEN a seller uploads a bulk shipment file (CSV format), THE system SHALL:
1. Accept format: Order ID, Carrier, Tracking Number
2. Validate each row (Order ID exists, Carrier is valid, Tracking format looks correct)
3. Preview changes before applying (show summary of orders to update)
4. Apply updates atomically (all orders updated or none)
5. Notify customer for each updated order
6. Report success count and any errors to seller

IF validation errors exist, THEN THE system SHALL report specific row numbers and error types without applying any changes.

THE seller SHALL be able to update up to 100 orders per bulk upload.

### 6.5 Fulfillment Timeline and SLAs

THE system SHALL track seller fulfillment performance and expect sellers to meet the following Service Level Agreements (SLAs):

- **Standard Fulfillment SLA**: Seller should mark as shipped within 2 business days of order confirmation
- **Express Fulfillment SLA**: Seller should mark as shipped within 1 business day for "Express" orders
- **Emergency Fulfillment**: For high-priority orders, seller should acknowledge within 4 hours

THE system SHALL send reminder notifications if seller has not shipped within 24 hours of order confirmation: "This order is awaiting shipment. Please confirm shipment status."

IF a seller does not ship an order within 3 business days, THEN THE system SHALL:
1. Send escalation notice to seller
2. Allow customer to request cancellation (which will be automatically approved)
3. If customer requests cancellation, initiate refund immediately
4. Dock seller's fulfillment rating due to SLA violation

THE seller's fulfillment performance (% of orders shipped within SLA) SHALL be calculated and displayed on their seller profile and seller dashboard for customer visibility.

---

## 7. Sales Analytics and Performance Dashboard

### 7.1 Sales Dashboard Overview

WHEN a seller logs into their dashboard, THE system SHALL display a sales overview showing key metrics for their store:

**Key Metrics Displayed**:
- Total orders placed in current period (today, this week, this month)
- Total sales revenue in current period
- Average order value (AOV)
- Number of active product listings
- Total units sold in current period
- Conversion rate (percentage of product views that result in purchases)
- Returns and refund rate
- Average customer satisfaction rating
- Seller rating (stars)

THE sales dashboard SHALL display metric trends over selectable time periods (daily, weekly, monthly views).

WHEN a seller selects a time period, THE system SHALL display:
- Current period metrics
- Previous period comparison
- Trend direction (up/down arrow with percentage change)
- Visual charts showing metric progression

### 7.2 Product Performance Analytics

WHEN a seller accesses their product performance analytics, THE system SHALL display metrics for each product including:
- Units sold
- Revenue generated
- View count (how many times product was viewed)
- Add-to-cart count
- Conversion rate (views to purchases percentage)
- Average rating (from customer reviews)
- Number of reviews received
- Return rate (percentage of orders returned)

THE system SHALL allow sellers to sort products by:
- Revenue (highest to lowest)
- Units sold (most to least)
- Conversion rate (best to worst)
- Rating (highest to lowest)

THE system SHALL identify and highlight:
- **Top Performing Products**: Products generating most revenue or units sold
- **Underperforming Products**: Products with low conversion rates or views
- **Recently Added Products**: Products listed in last 30 days and how they're performing vs. benchmarks

THE system SHALL allow sellers to click on a product to see detailed analytics:
- Daily/weekly/monthly sales trend
- Traffic source (organic search, direct, referral, etc., if available)
- Customer demographics (age range, location distribution if available)
- Reviews and feedback for this product

### 7.3 Variant-Level Performance Comparison

FOR products with multiple variants (SKUs), THE system SHALL allow sellers to compare performance across variants.

WHEN a seller views a configurable product's analytics, THE system SHALL display for each variant:
- Variant identifier (SKU, color, size, etc.)
- Units sold per variant
- Revenue per variant
- Conversion rate per variant (views to purchases)
- Average rating per variant (if reviewed separately)
- Return rate per variant

THE seller SHALL be able to identify which variants are most popular and which are slow-moving, informing inventory and pricing decisions.

### 7.4 Revenue and Earnings Tracking

THE system SHALL display cumulative revenue for the seller:
- Total revenue for selected period
- Revenue broken down by product category
- Revenue broken down by date range
- Revenue comparison to previous periods

THE system SHALL clearly show commission deductions:
- Gross order total
- Platform commission deducted (percentage and amount)
- Net earnings payable to seller

EXAMPLE: Gross Revenue: $10,000 | Commission (15%): $1,500 | Net Earnings: $8,500

THE seller SHALL be able to download detailed earnings reports in CSV or PDF format showing:
- All transactions for selected period
- Order-by-order breakdown with dates
- Commission calculations
- Deductions (if any)
- Net payment

### 7.5 Customer Analytics and Insights

THE system SHALL provide sellers with customer analytics including:
- New customers acquired in period
- Repeat customer count (customers who purchased multiple times)
- Repeat customer percentage (of total orders)
- Average customer lifetime value (estimated future purchases)
- Customer retention rate (% who repurchase within 30 days)
- Geographic distribution of customers (if applicable)

THE system SHALL allow sellers to identify:
- Top customers by order value
- Most loyal customers (most repeat purchases)
- Customers at risk of churn (haven't purchased in 90+ days)

THE system SHALL provide actionable recommendations such as:
- "15% of your customers haven't purchased in 60+ days. Consider reaching out with a special offer."
- "Repeat customers spend 3x more than first-time buyers. Implement loyalty program."

### 7.6 Inventory Performance and Turnover

THE system SHALL calculate and display for each SKU:
- Days of inventory (estimated days until stockout based on sales velocity)
- Inventory turnover rate (how many times inventory sold in period)
- Inventory aging (how long items have been in stock)
- Stock status (in stock, low stock, out of stock)
- Slow-moving items (low sales velocity)

THE system SHALL recommend inventory actions:
- "Inventory running low. 7 days until stockout if sales continue."
- "This SKU has been in stock 180+ days with no sales. Consider clearance or discontinuing."
- "High demand: Recommend restocking within 3 days."

### 7.7 Performance Benchmarking

THE system SHALL display industry benchmarks and category averages (anonymized) allowing sellers to compare:
- Average order value (vs. other sellers in category)
- Conversion rate (vs. category average)
- Return rate (vs. category average)
- Customer satisfaction rating (vs. category average)
- Fulfillment speed (vs. category average)

WHEN a seller's metrics fall below category averages, THE system SHALL display specific recommendations for improvement.

---

## 8. Seller Settings and Policies Configuration

### 8.1 Return and Refund Policies

THE seller SHALL be able to configure their return and refund policies by selecting from predefined policy templates or creating custom policies.

**Predefined Policy Options**:
- "No Returns Accepted"
- "30-Day Returns with Restocking Fee"
- "30-Day Returns, Free Returns"
- "14-Day Returns with 20% Restocking Fee"
- "Custom Policy" (seller defines terms)

WHEN a seller configures their return policy, THE seller SHALL specify:
- Return window (number of days from purchase/delivery customer can return items)
- Restocking fee (if applicable, percentage or fixed amount)
- Return shipping costs (who pays for return shipping)
- Condition requirements (items must be unused, unopened, etc.)
- Exclusions (items that cannot be returned)

WHEN a seller updates their return policy, THE system SHALL:
1. Display the policy prominently on all their product pages
2. Show policy to customers during checkout (so they know before purchase)
3. Apply new policy to future orders only (existing orders use original policy)
4. Notify seller of successful policy update

### 8.2 Shipping and Delivery Configuration

THE seller SHALL configure available shipping methods and rates for their products:

WHEN a seller configures shipping, THE seller SHALL specify:
- Available shipping carriers (FedEx, UPS, USPS, local carrier, etc.)
- Available shipping speeds (Standard, Express, Overnight)
- Base shipping rates for each carrier/speed
- Regional surcharges (if applicable, for remote areas, international)
- Free shipping threshold (if any, e.g., free shipping on orders over $50)
- Processing time (how long seller needs before shipping)

THE seller SHALL be able to configure:
- **Flat Rate Shipping**: Fixed rate regardless of weight/distance
- **Weight-Based Shipping**: Rate increases based on total weight
- **Zone-Based Shipping**: Different rates for different regions

WHEN customers proceed to checkout with items from this seller, THE system SHALL:
1. Calculate shipping cost based on seller's configured rates
2. Display shipping options with cost and estimated delivery
3. Allow customer to select shipping method
4. Charge customer the configured shipping cost

### 8.3 Store Operating Hours and Policies

THE seller SHALL be able to configure:
- Store operating hours (hours of the day when store is "open")
- Holiday closures and dates (when store is closed)
- Processing time (how many days to prepare orders before shipping)
- Communication preferences (response time targets for customer inquiries)

WHEN customers view a seller's store, THE system SHALL display:
- Operating hours and next opening time (if currently closed)
- Processing time (e.g., "Ships within 2 business days")
- Expected delivery range based on processing time + shipping time

### 8.4 Store Policies and Messaging

THE seller SHALL be able to configure and display:
- Store-wide return policy
- Shipping policy
- Customer service guarantee
- Special handling instructions (e.g., "Fragile items require signature")
- Communication preferences (how seller prefers to be contacted)

THESE policies SHALL be displayed on the seller's store profile page for customer visibility.

### 8.5 Commission and Payment Settings

THE seller SHALL configure their banking information for commission payment delivery:

**Banking Information Required**:
- Bank account holder name
- Bank name
- Routing number (US) or SWIFT/IBAN (international)
- Account number
- Account type (checking or savings)
- Tax identification number
- Payment frequency preference (weekly, bi-weekly, or monthly)

THE seller SHALL specify:
- Preferred payment frequency (when to receive commissions)
- Alternative payment methods (direct deposit, check, wire transfer)
- Currency preference for payment

WHEN the seller updates banking information, THE system SHALL:
1. Validate bank account details
2. Confirm with seller that information is correct (sent via email)
3. Use new information for next settlement payment
4. Maintain security of banking information (encrypted, restricted access)

### 8.6 Notification and Communication Preferences

THE seller SHALL be able to configure their notification preferences for:

**Order-Related Notifications**:
- New order received (always on)
- Order payment confirmed (always on)
- Cancellation request (always on)
- Customer message (configurable: email, SMS, both)
- Return/refund request (configurable)

**Inventory-Related Notifications**:
- Low stock alerts (configurable threshold)
- Out of stock alerts
- Inventory adjustment approvals

**Performance Notifications**:
- Daily sales summary (optional)
- Weekly sales report (optional)
- Monthly performance summary (optional)
- Rating changes or reviews received (configurable)

**System Notifications**:
- Policy updates
- System maintenance notices
- Platform announcements (required, cannot be disabled)

THE seller SHALL specify delivery preferences for each notification:
- Email delivery
- SMS delivery
- In-app notification only
- Disable notifications

---

## 9. Commission Calculation and Payment Tracking

### 9.1 Commission Structure and Transparency

THE platform SHALL implement a transparent, category-based commission model where sellers are charged a percentage of each order's gross sales amount.

THE system SHALL display commission rates clearly to sellers during registration and throughout their account. Commission rates by product category:

- Electronics: 10-12% (lower rate for higher ticket items)
- Clothing and Fashion: 15-18% (mid-tier products)
- Home and Garden: 12-15% (mixed products)
- Beauty and Personal Care: 18-20% (high-margin items)
- Sports and Outdoors: 12-15%
- Books and Media: 8-10% (lower margin products)

WHEN a seller lists a product in a category, THE system SHALL:
1. Display the commission rate for that category
2. Show commission clearly in seller dashboard
3. Calculate commission accurately on each order

### 9.2 Commission Calculation Per Order

WHEN an order containing a seller's products is placed and paid, THE system SHALL immediately:

1. **Calculate Order Total**:
   - Gross merchandise value (sum of all items from this seller)
   - Taxes (if applicable)
   - Shipping cost collected from customer

2. **Calculate Commission**:
   - Gross Amount = (Item prices) + (Taxes) + (Shipping cost)
   - Commission Rate = rate for product category
   - Commission Amount = Gross Amount × Commission Rate
   - Net Amount = Gross Amount - Commission

3. **Record Commission Details**:
   - Order ID
   - Commission rate applied
   - Gross amount
   - Commission amount
   - Net amount due seller
   - Timestamp of calculation

EXAMPLE CALCULATION:
```
Order Total: $100.00 (items) + $10.00 (tax) + $8.00 (shipping)
Gross Amount: $118.00
Commission Rate: 15% (for that category)
Commission: $118.00 × 0.15 = $17.70
Net to Seller: $118.00 - $17.70 = $100.30
```

### 9.3 Commission Transparency in Seller Dashboard

THE seller SHALL view detailed commission information in their dashboard:

**Commission Summary**:
- Commission rate for each product category they sell in
- Current period commission earned
- Current period net earnings
- Cumulative commission-free products (if any promotions exist)
- Any commission adjustments or refunds

**Order-by-Order Commission Details**:
- Each order shows: Gross amount, Commission rate, Commission deducted, Net amount
- Seller can see precisely how commission is calculated per order

**Commission Reports**:
- Daily commission summary
- Weekly commission breakdown
- Monthly commission statement
- Commission by product category
- Downloadable commission history in CSV format

### 9.4 Commission Payment Settlement and Processing

THE system SHALL aggregate seller's earnings across all orders in a settlement period (weekly, bi-weekly, or monthly based on seller preference).

**Settlement Process**:

1. **Calculate Total Earnings for Period**:
   - Sum of net amounts (gross - commission) for all orders in period
   - Deduct chargebacks or disputes (if applicable)
   - Deduct optional fees (seller's choice of services)

2. **Minimum Settlement Threshold**:
   - Payments only processed if balance exceeds minimum (typically $0.01)
   - If balance below minimum, rolled forward to next period

3. **Process Payment**:
   - Initiate transfer to seller's configured bank account
   - Send settlement notification email within 2 hours of processing
   - Update seller dashboard with payment status (pending/processed)

4. **Send Settlement Report**:
   - Itemized report showing all orders in settlement period
   - Total gross revenue
   - Total commission deducted
   - Total net payment
   - Payment method and expected arrival date
   - Commission rates and policy links

THE seller SHALL be able to download settlement reports in CSV/PDF format for accounting records.

### 9.5 Payment Reconciliation and Dispute Resolution

THE system SHALL maintain complete payment history for each seller showing:
- Settlement payment date
- Amount paid
- Payment method used
- Bank account last four digits
- Transaction confirmation number
- Payment status (processed, failed, returned)

IF a payment fails (e.g., invalid bank account, bank rejects transfer), THE system SHALL:
1. Alert seller immediately via email
2. Mark payment as "Failed"
3. Request seller to update banking information
4. Retry payment within 3 business days
5. After 3 failed attempts, hold payment and require seller contact

WHEN a seller disputes a commission calculation, THE system SHALL:
1. Allow seller to submit dispute with specific order(s) and explanation
2. Create dispute record in system
3. Escalate to admin for investigation
4. Review commission calculation for errors
5. Make determination (uphold or reverse commission)
6. Notify seller of resolution
7. If reversed, issue credit on next settlement payment

THE system SHALL maintain dispute records and resolution history for audit purposes.

### 9.6 Financial Reporting and Tax Documents

WHEN requested, THE system SHALL generate financial documents for sellers' tax purposes:

**Available Reports**:
- Annual earnings statement (total sales, commissions, net earnings)
- 1099-NEC form data (for US sellers, if required)
- Quarterly earnings statements
- Monthly earnings summaries
- Commission history reports

WHEN a seller requests a report, THE system SHALL:
1. Generate document with seller and platform information
2. Provide downloadable PDF version
3. Include all necessary financial details
4. Make available in seller dashboard

THE seller SHALL be able to generate multiple reports covering different date ranges for tax filing.

---

## 10. Cross-System Integration and Dependencies

### 10.1 Integration with Inventory Management System

THE seller's inventory management functions integrate seamlessly with the platform's central inventory system. WHEN orders are placed or cancelled, THE inventory system SHALL:

1. Communicate inventory changes to seller's inventory dashboard in real-time (<10 seconds)
2. Update seller's available inventory to reflect reservations
3. Restore inventory when orders are cancelled
4. Reflect inventory in customer-facing product pages

### 10.2 Integration with Order Management System

THE seller order management functions fully integrate with the central order management system. WHEN a seller updates an order's status (e.g., marks as shipped), THE system SHALL:

1. Automatically update the customer's view of the order
2. Trigger customer notifications
3. Update order analytics
4. Record fulfillment metrics

### 10.3 Integration with Customer Requirements

THE seller capabilities align with customer requirements defined in the Customer Requirements document. WHEN customers review seller information or place orders from sellers, they see the metrics and information that sellers configure (store profile, policies, ratings).

### 10.4 Integration with Admin Requirements

THE seller information and performance metrics integrate with the Admin Requirements system. WHEN admins review platform analytics or manage sellers, they access data about seller performance, commissions, and compliance.

---

## 11. Business Rules and Constraints

### 11.1 Account and Registration Rules

- Each seller account is associated with one business entity (seller cannot operate multiple stores from single account)
- Seller cannot change their business information after initial verification (protect against fraud)
- Seller account requires active, verified email address
- Seller must provide accurate banking information verified by system (failed verification prevents payment)
- Seller cannot operate as both customer and seller from same account (separate login accounts required)

### 11.2 Product Listing Rules

- Seller can list maximum 100,000 products per account (prevents spam)
- Product name must be unique per seller within a category
- Product must have minimum 1 image, maximum 20 images
- SKU must be unique per seller (no duplicate SKUs)
- Product description must be 500-5000 characters
- Product cannot be published without category assignment
- Product cannot be published without pricing configured
- For configurable products, minimum 1 variant must be created before publishing

### 11.3 Inventory Rules

- Inventory quantity must be non-negative (cannot go below 0)
- Inventory must be integer (no fractional units)
- Low stock threshold must be 0 or greater
- Inventory updates from orders are atomic (all or nothing)
- Inventory reservations expire if order not completed within 1 hour (seller cannot hold stock indefinitely)
- Seller cannot reduce inventory below reserved amount (prevents overselling)

### 11.4 Pricing Rules

- Product price must be greater than $0 and less than $100,000
- All prices displayed with 2 decimal places (cents)
- Variant pricing can differ from base product
- Shipping costs must be non-negative
- Seller cannot apply negative prices or unlimited discounts
- Prices locked at order time (subsequent price changes don't affect completed orders)

### 11.5 Commission Rules

- Commission calculated on gross amount (merchandise + tax + shipping)
- Commission rates are set by platform and non-negotiable per category
- Commission percentage clearly disclosed to seller
- Commission deducted from settlement payment
- No refund of commission on cancelled or returned orders (seller bears the risk)
- Commission adjustments only made by admin through formal dispute process

### 11.6 Payment and Settlement Rules

- Settlement payments processed according to seller's chosen frequency
- Minimum settlement threshold prevents very small payments (typically $0.01)
- Payment made only to verified banking information
- Failed payments trigger seller notification and retry process
- Seller must maintain active banking information (account disabled if payment fails 3x)
- Settlement statements provided within 2 hours of payment processing
- Payment history retained for 7 years (tax/legal requirement)

### 11.7 Fulfillment and Shipping Rules

- Order must be shipped within 3 business days or customer can request cancellation
- Tracking number required to mark order as shipped
- Shipping cost calculated at checkout and locked (seller cannot charge differently later)
- Seller responsible for physical item quality and accurate description
- Seller responsible for on-time delivery (platform measures fulfillment SLA)
- Return shipping label provided by platform (free to customer for valid returns)

### 11.8 Policy and Configuration Rules

- Seller policies are enforced uniformly across all their products
- Return policy applies to all products (seller cannot vary per product, except by category)
- Shipping rates apply to all orders (seller cannot change rates per customer)
- Commission rates cannot be negotiated (set by platform)
- Seller cannot disable payment methods (all configured methods must work)

---

## 12. Success Criteria and Key Performance Indicators

### 12.1 Seller Enablement Success

Sellers successfully enabled when:
1. Able to complete registration and verification within 5 business days
2. Able to create and publish first product within 30 minutes of dashboard access
3. Able to understand commission structure and see earnings clearly
4. Able to fulfill orders and track performance
5. Able to update inventory and product information easily

### 12.2 Seller Satisfaction Metrics

Target metrics:
- Seller onboarding completion rate: >90% (sellers complete first product within 7 days)
- Seller dashboard utilization: >80% (sellers regularly access dashboard)
- Average seller net earnings: Positive (sellers earn money after commissions)
- Seller Net Promoter Score (NPS): >40 (would recommend platform to other merchants)
- Seller support response time: <24 hours
- Seller retention rate: >85% after year 1 (sellers don't churn)

### 12.3 Operational Success

Platform succeeds when:
1. Commission calculations are 100% accurate (zero errors)
2. Settlement payments process on schedule (99.9% on-time rate)
3. Order notifications reach sellers within 10 seconds
4. Analytics data updates within 5 minutes
5. Seller dashboards load within 2 seconds
6. All seller features available and functional (99.9% uptime)

---

## 13. Integration with Related Requirements Documents

This seller requirements document integrates with:

- **[User Actors and Authentication](./02-user-actors-and-authentication.md)**: Seller authentication and permission verification
- **[Customer Requirements](./03-customer-requirements.md)**: Sellers fulfill customer orders and manage customer relationships
- **[Admin Requirements](./05-admin-requirements.md)**: Admin oversight and management of sellers
- **[Product Catalog System](./06-product-catalog-system.md)**: Product creation and management by sellers
- **[Inventory Management](./09-inventory-management.md)**: SKU-level inventory tracking for sellers
- **[Order and Fulfillment](./08-order-and-fulfillment.md)**: Order management and fulfillment from seller perspective
- **[Platform Integration and Operations](./11-platform-integration-and-operations.md)**: Commission tracking and payment processing

---

## Conclusion

The Seller Requirements document comprehensively defines all capabilities, responsibilities, and constraints that govern seller participation in the e-commerce shopping mall platform. By implementing these requirements, the platform enables independent merchants to successfully operate online stores, manage complex product catalogs with variants, maintain accurate inventory, process orders efficiently, and track their business performance.

The detailed requirements ensure that sellers have the tools and transparency needed to succeed on the platform while maintaining platform integrity through clear business rules and constraints. The seller system integrates seamlessly with customer-facing features, inventory management, order fulfillment, and admin oversight to create a complete, functional e-commerce marketplace.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*