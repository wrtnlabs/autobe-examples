# Product Catalog and Inventory Management

## Overview

The Product Catalog and Inventory Management system is the core infrastructure that enables the e-commerce shopping mall platform to organize, present, and manage products across multiple sellers. This system handles product organization through categories, manages complex product variants with individual SKU tracking, controls inventory at the granular level, and ensures accurate availability information across the platform.

The catalog serves as the primary discovery mechanism for customers while providing sellers with tools to manage their product offerings and inventory efficiently.

## Product Catalog Structure

### Product Entity Definition

Products are the fundamental entities in the catalog representing items available for sale on the platform. Each product is uniquely identified and contains core descriptive and organizational information.

**Product Core Attributes:**
- Product ID (unique identifier, format: PRD-[TIMESTAMP]-[RANDOM])
- Product name (3-200 characters)
- Product description (10-5000 characters, detailed information about the product)
- Product category (primary classification, must reference valid category ID)
- Seller ID (which seller owns this product)
- Creation date and timestamp (UTC format)
- Last updated date and timestamp (updates when any field changes)
- Product status (active, inactive, discontinued, pending_review)

**WHEN a seller creates a new product, THE system SHALL store the product with default status of "active" and record the creation timestamp.**

**WHEN a product description is modified, THE system SHALL update the last_updated timestamp to reflect the change.**

### Product Metadata

Products maintain descriptive metadata that enhances discoverability and organization:

- **Short description**: Brief summary (up to 255 characters) displayed in catalog and search results
- **Long description**: Comprehensive product details (up to 5000 characters) displayed on product detail page
- **Brand**: Product manufacturer or brand name (up to 100 characters)
- **Model/SKU base**: Foundational SKU prefix for variant generation (e.g., "SHIRT-" for shirts)
- **Product images**: Multiple images supporting product visualization
- **Specifications**: Technical and functional product specifications in structured key-value format
- **Tags/Keywords**: Search optimization tags (up to 20 tags, 50 characters each)
- **Country of origin**: Manufacturing country (ISO 3166-1 alpha-2 code)
- **Warranty information**: Standard warranty details (text field, up to 500 characters)

**THE system SHALL allow sellers to upload up to 20 product images per product.**

**EACH product image SHALL meet these requirements:**
- Minimum resolution: 400×400 pixels
- Maximum resolution: 4000×4000 pixels
- Supported formats: JPEG, PNG (no other formats accepted)
- Maximum file size: 10 MB per image
- Should display product clearly without excessive background

**THE system SHALL store product specifications as structured data enabling filtering and comparison. Product specifications are stored as key-value pairs:**
- Key: specification name (e.g., "Color", "Material", "Weight")
- Value: specification value (e.g., "Red", "Cotton", "250g")
- Data type: Text, Number, Boolean, or Selection from predefined list

**THE system SHALL allow sellers to include up to 50 specification key-value pairs per product.**

### Multi-Seller Product Listing

The same physical product can be listed by multiple sellers on the platform. Each seller maintains their own pricing, inventory, and availability for their version of the product.

**WHEN multiple sellers list the same product, THE system SHALL maintain separate inventory tracking, pricing, and fulfillment information for each seller.**

**WHEN a customer searches for a product, THE system SHALL display all seller offerings of that product, sorted by relevance and seller rating (higher-rated sellers appear first).**

**THE system SHALL allow customers to compare prices across sellers for the same product, displaying side-by-side price and seller rating information.**

---

## Categories and Filtering

### Category Taxonomy

Categories provide the primary organizational structure for the product catalog, enabling customers to browse and discover products intuitively.

**Category Attributes:**
- Category ID (unique identifier, format: CAT-[CATEGORY_CODE])
- Category name (2-100 characters, unique within parent category)
- Category slug (URL-friendly identifier, lowercase alphanumeric with hyphens, 3-50 characters)
- Parent category ID (for hierarchical structure; null if top-level category)
- Category description (0-500 characters, optional)
- Category image (visual representation, 200×200 pixels minimum)
- Display order (integer, used for sorting within parent category)
- Active status (boolean, controls visibility)
- Product count (denormalized count, updated when products are added/removed)

### Hierarchical Category Structure

Categories are organized in a hierarchical tree structure with multiple levels of nesting to accommodate diverse product types.

**THE system SHALL support category hierarchies with unlimited depth levels (no maximum nesting constraint).**

**EACH category SHALL be assigned at least one and at most one parent category (forming a tree, not a graph structure).**

**WHEN displaying categories to customers, THE system SHALL show parent categories with their child subcategories in a hierarchical navigation structure with expandable/collapsible interface.**

**THE system SHALL maintain category paths (e.g., "Electronics > Computers > Laptops > Gaming Laptops") for breadcrumb navigation and SEO purposes.**

**WHEN a customer navigates to a category, THE system SHALL display all products within that category and its subcategories (recursive display, showing products from all child categories).**

**THE system SHALL calculate product count for each category by counting all products in that category and all descendant categories.**

### Product-Category Assignment

Products are assigned to one or more categories for organizational purposes and discovery.

**WHEN a seller lists a product, THE system SHALL require assignment to at least one primary category.**

**THE system SHALL allow products to be assigned to up to 5 secondary categories for improved discoverability (primary + 4 additional categories maximum).**

**WHEN changing a product's category assignment, THE system SHALL update the product's visibility in category listings and search index within 5 minutes.**

**WHEN a product is assigned to a new category, THE system SHALL automatically recalculate product counts for affected categories.**

### Advanced Filtering Capabilities

The system provides sophisticated filtering mechanisms enabling customers to refine their search results by multiple criteria.

**Filterable Attributes:**
- Price range (minimum and maximum filter with slider interface)
- Seller/brand (multi-select filter showing top 20 sellers/brands by product count)
- Product ratings (minimum average rating filter: 3.0, 4.0, 4.5, 5.0 options)
- Availability status (In Stock, Out of Stock, Pre-Order toggle switches)
- Product variant attributes (color, size, material, etc. - varies by category)
- Discount/promotional status (On Sale, New Arrival, etc.)
- Newly added products (within X days - configurable: last 7, 30, 90 days)
- Price per unit (for bulk items, shows unit pricing)

**WHEN a customer applies filters, THE system SHALL return products matching ALL selected filter criteria (AND logic between filters, OR logic within same filter type) within 2 seconds.**

**WHEN no products match the applied filters, THE system SHALL display message "No products found matching your filters" and suggest relaxing specific filters or similar categories.**

**THE system SHALL remember customer filter preferences for 30 days and offer quick-restore option ("Use previous filters?") on next category visit.**

**THE system SHALL provide analytics to seller management about which filters are used most frequently, enabling data-driven product decisions.**

---

## Product Variants and SKU Management

### Variant Concept and Purpose

Product variants represent different options of the same product (colors, sizes, materials, configurations) that customers can choose from. Each variant has its own SKU for inventory tracking, pricing, and fulfillment.

**Variant Attributes:**
- Variant ID (unique identifier within product, format: VAR-[PRODUCT_ID]-[SEQUENCE])
- Parent product ID (reference to the main product)
- SKU (Stock Keeping Unit) - unique identifier for inventory tracking (6-50 characters)
- Variant name (descriptive label like "Red - Size M", 3-100 characters)
- Variant attributes (specific option values: color=Red, size=M, material=Cotton, etc.)
- Base variant price (can differ from product base price)
- Variant cost price (for seller's cost tracking and profitability analysis, not displayed to customers)
- Inventory quantity on hand (non-negative integer)
- Availability status (active, inactive, discontinued, pre-order)
- Images specific to variant (optional, overrides product base images)
- Variant weight and dimensions (optional, if different from base product)
- Seller for this specific variant (inherited from product, same seller typically)
- Created timestamp and last updated timestamp

### SKU Structure and Management

Each product variant receives a unique SKU that serves as the primary identifier for inventory management, order fulfillment, and financial tracking.

**SKU Format Requirements:**
- Length: 6-50 characters (alphanumeric with hyphens and underscores allowed)
- Format: Alphanumeric characters only, hyphens (-), and underscores (_) - no spaces or special characters
- Uniqueness: Each SKU must be globally unique within the platform (not just per-seller)
- Seller identification: SKU should include seller identifier to prevent conflicts across sellers
- Example formats: 
  - "SEL001-SHIRT-RED-M" (seller ID + product type + variant attributes)
  - "SELLER_001_BLUE_SHOE_SIZE_10" (alternative format)
  - "BLU-SHU-10-001" (compressed format)

**THE system SHALL generate a default SKU for each variant or allow sellers to specify their own SKU following the format requirements.**

**WHEN a seller creates a variant, THE system SHALL validate that the SKU:**
- Is not already used by that seller for a different product
- Is not already used by any other seller in the platform
- Matches the required format (6-50 alphanumeric characters with allowed special characters)
- Does not contain reserved keywords (system prefixes like "TEST-", "TEMP-")

**WHEN a seller attempts to use a duplicate SKU, THE system SHALL return error: "This SKU is already in use. Please choose a unique identifier."**

**THE system SHALL maintain a SKU registry tracking the mapping between SKU and variant across all sellers, enabling rapid lookup and preventing duplication.**

**WHEN a seller needs to change a SKU after initial creation, THE system SHALL allow changes ONLY if:**
- No orders have been placed for this SKU, OR
- All historical orders are marked as complete/returned (admin action required for change)

**WHEN a seller changes a SKU, THE system SHALL:**
- Create new SKU entry in system
- Maintain redirect from old SKU to new SKU for historical tracking
- Update all active listings to use new SKU
- Notify affected orders and tracking systems

### Variant Attribute Management

Variants are distinguished by specific attributes that customers use to select their preferred option.

**Common Variant Attributes:**
- **Color** (e.g., Red, Blue, Black, Green, Yellow, Multi-color)
- **Size** (e.g., XS, S, M, L, XL, XXL for clothing; numeric measurements for other products like 5cm, 10cm, etc.)
- **Material** (e.g., Cotton, Polyester, Silk, Wool, Linen, Synthetic, Mixed blend)
- **Capacity** (e.g., 64GB, 128GB, 256GB for storage devices; 500ml, 1L, 2L for liquids)
- **Configuration** (e.g., With Screen, Without Screen, Single Pack, Twin Pack, Bundle)
- **Style** (e.g., Long Sleeve, Short Sleeve, V-neck, Crew Neck, Graphic Print, Solid Color)
- **Pattern** (e.g., Striped, Plaid, Floral, Geometric, Solid)
- **Finish** (e.g., Matte, Glossy, Textured, Smooth)
- **Model/Version** (e.g., 2023 Model, 2024 Model, Version 1.0, Version 2.0)
- **Season** (e.g., Spring, Summer, Fall, Winter)

**Attribute Value Types:**
- **Text values** (e.g., color names "Red", "Blue"; material types "Cotton", "Polyester")
- **Numeric values** (e.g., sizes 8, 9, 10; capacities 32GB, 64GB, 128GB)
- **Boolean values** (e.g., with/without features using true/false)
- **Enumerated values** (e.g., selected from predefined list of options)
- **Date values** (e.g., edition year, season)

**THE system SHALL support product-specific variant attributes defined by sellers during product setup.**

**EACH product SHALL define 1-5 variant attributes (minimum 1, maximum 5 to prevent explosive variant combinations).**

**WHEN a customer selects variant attributes during browsing, THE system SHALL filter available options to show only valid combinations (e.g., not show "Red" + "Size XXL" if that combination doesn't exist for this product).**

**THE system SHALL generate all possible variant combinations from defined attributes:**
- If Product has: Color (Red, Blue, Green) and Size (S, M, L), system auto-generates 9 variants
- If Product has: Color (10 options), Size (5 options), Material (3 options), system auto-generates 150 variants
- Sellers must provide information for all auto-generated combinations before publishing

**WHEN a seller creates a product with 50+ auto-generated variant combinations, THE system SHALL require sellers to:**
- Confirm they intend to manage all combinations
- Bulk-import variant data via CSV (not enter individually)
- Provide default inventory quantity for all combinations

**THE system SHALL display variant attributes clearly on product detail pages enabling customers to understand all options before purchase.**

**WHEN a customer hovers over variant attribute values, THE system SHALL display:**
- How many items available for this specific combination
- Price difference (if variant has different price than base)
- Any variant-specific notes or restrictions

### Variant-Specific Pricing

Each variant can have different pricing, allowing sellers to charge different prices for variants with different costs or perceived value.

**Variant Pricing Model:**
- **Base price per variant**: Specific price set for this variant (e.g., $29.99)
- **Variant markup/discount**: Adjustment applied to product base price (e.g., "+$5.00" or "-10%")
- **Currency**: All prices in platform's base currency (USD assumed for international markets, local currency display on customer view)
- **Seller determines variant pricing**: Seller has full authority over pricing strategy

**THE system SHALL support two pricing strategies per variant:**
1. **Absolute pricing**: Specific price set for this variant
   - Example: Product base price $20.00, variant Red-M priced at $29.99
   - All pricing calculations use the $29.99 value
2. **Relative pricing**: Markup or discount applied to product base price
   - Example: Product base price $20.00, variant XL has "+$5.00" markup
   - Final variant price = $20.00 + $5.00 = $25.00
   - Example: Product base price $50.00, variant Clearance has "-30%" discount
   - Final variant price = $50.00 * 0.70 = $35.00

**WHEN displaying products in search results or catalog, THE system SHALL:**
- If all variants have same price: display single price ("$29.99")
- If variants have different prices: display price range ("$19.99 - $49.99") with "Starting from" format
- Display lowest variant price as primary, highest as secondary

**WHEN a customer selects a specific variant, THE system SHALL display that variant's exact price prominently on product detail page.**

**WHEN a seller updates variant pricing, THE system SHALL:**
- Apply the change within 5 minutes to all affected product listings
- NOT retroactively change prices for existing orders already placed
- Update search index and product feeds within 5 minutes
- Notify customers who wishlisted this product if price decreased by 10% or more

**THE system SHALL prevent sellers from setting variant prices lower than:**
- Product cost (if cost tracking is enabled)
- Platform's minimum price threshold ($0.01)
- Competitor's average price (optional; can be disabled per seller request)

### Variant Image Management

Variants can have specific images showing the variant in action (e.g., showing the red version of a shirt).

**THE system SHALL allow sellers to upload up to 5 images specific to each variant (beyond the 20 product-level images).**

**EACH variant image SHALL meet these requirements:**
- Minimum resolution: 400×400 pixels
- Maximum resolution: 4000×4000 pixels
- Supported formats: JPEG, PNG
- Maximum file size: 10 MB per image
- Should clearly show the specific variant (e.g., red shirt must show the color red clearly)

**WHEN variant-specific images are available, THE system SHALL:**
- Display them in the product detail view when that variant is selected
- Update product image carousel to show variant images
- Display variant images before product-level generic images (variant images have priority)

**IF no variant-specific images exist, THE system SHALL display the product's main product-level images.**

**THE system SHALL allow sellers to drag-and-drop reorder variant images to control display sequence.**

---

## Pricing and Promotional Management

### Base Pricing Strategy

Products have base pricing established by sellers that forms the foundation for all pricing displays and calculations.

**Base Price Definition:**
- Minimum value: $0.01 USD (or equivalent in local currency)
- Maximum value: $999,999.99
- Currency: Platform uses USD for internal calculations, displays in customer's local currency
- Precision: Two decimal places (cents/paise precision)
- No hidden fees or markup applied to base price display

**WHEN a seller sets a product price, THE system SHALL:**
- Validate that price falls within acceptable range ($0.01 - $999,999.99)
- Require exactly two decimal places
- Store in database with full precision
- Calculate and store cost per unit for profitability tracking

**THE system SHALL store pricing history enabling tracking of price changes over time:**
- Original price set date and amount
- Each price change with date and new amount
- Price change reason (optional field: promotion, cost adjustment, competitor response, etc.)
- Admin review required flag (if price change exceeds 50% increase/decrease)

**WHEN displaying prices to customers, THE system SHALL always show prices in USD with two decimal places with symbol ("$29.99", not "29.99").**

**THE system SHALL allow sellers to view their pricing history and analytics:**
- Average price by product
- Price trend over time (chart showing price changes)
- Price comparison to competitor products (if data available)
- Pricing recommendations based on demand and inventory levels

### Variant-Specific Pricing

As described in the Variant section, each variant can have its own price or a relative adjustment to the base price.

**WHEN a product has variants with different prices, THE system SHALL:**
- Display the price range in catalog views (e.g., "$19.99 - $49.99")
- Add text "Starting from" before lowest price
- Display number of variant options ("Available in 5 colors")
- Show exact variant price when specific variant is selected

**WHEN variants have identical pricing, THE system SHALL:**
- Display a single price without range notation
- Not show "Starting from" text
- Simplify pricing display

**WHEN displaying variant price differences:**
- If variant costs $5 more: display as "Size XL: +$5.00"
- If variant costs 10% more: display as "Premium: +10%"
- Show savings/premium clearly in variant selector

### Promotional Pricing and Discounts

The system supports temporary discounts and promotional pricing to drive sales and manage inventory.

**Discount Types Supported:**
- **Fixed amount discount**: Reduce price by specific dollar amount (e.g., "-$10.00")
- **Percentage discount**: Reduce price by percentage of original price (e.g., "-20%")
- **Bundle discounts**: Special pricing when purchasing multiple items together (e.g., "Buy 2, get 15% off")
- **Volume discounts**: Tiered pricing based on quantity (e.g., 1-10 units @ $10, 11-50 @ $9, 50+ @ $8)
- **Promotional codes**: Customer-entered codes providing specific discounts
- **BOGO (Buy One Get One)**: Free or discounted second item with purchase
- **Seasonal promotions**: Automatic discounts during specific time periods

**Discount Attributes:**
- Discount ID (unique identifier)
- Discount type (fixed, percentage, bundle, volume, code, BOGO, seasonal)
- Discount amount or percentage value
- Applicable products/categories/sellers (targeting rules)
- Start date and time (when discount becomes active)
- End date and time (when discount expires)
- Maximum discount cap (for percentage discounts, e.g., max $50 off)
- Applicable once per customer or unlimited usage
- Minimum purchase requirement (e.g., min $50 order, min 3 items)
- Maximum discount uses (total times discount can be applied across all customers)
- Quantity limits (max qty per customer, max qty total)
- Applicable on sale/clearance items (yes/no flag)

**WHEN a discount is active, THE system SHALL:**
- Display both original price (strikethrough) and discounted price
- Show discount amount and percentage saved ("Save $15 (20%)")
- Clearly communicate discount expiration ("Ends in 2 days" if within 3 days of expiration)
- Apply discount automatically at checkout without requiring code entry

**WHEN multiple discounts apply to a product, THE system SHALL:**
- Calculate the benefit of each discount
- Apply the single best discount for customer (not stacking multiple discounts)
- Display which discount was applied and why (to be transparent)
- Allow discounts to stack ONLY if explicitly configured as stackable

**WHEN a discount period ends, THE system SHALL:**
- Automatically deactivate the discount within 5 minutes of end time
- Revert pricing to non-discounted rates
- Update search index and product feeds
- Notify sellers of discount expiration

**WHEN a promotional code is entered at checkout, THE system SHALL:**
- Validate that code is active and not expired
- Verify code is applicable to products in cart
- Check customer hasn't exceeded maximum uses (if per-customer limit exists)
- Verify minimum purchase requirements are met
- Apply discount immediately showing new total
- Show discount validation message confirming code accepted

**IF a promotional code is invalid or expired, THE system SHALL display specific error:**
- "This code has expired" (if end date passed)
- "This code is not active yet" (if start date in future)
- "This code doesn't apply to items in your cart" (if category/product restriction)
- "You've already used this code maximum times" (if usage limit exceeded)
- "Invalid code" (if code doesn't exist or is misspelled)

**THE system SHALL track promotional code usage for analytics:**
- How many times each code was used
- Total discount amount given
- Revenue impact (sales that happened due to discount)
- Customer segments that used each code

### Seller Authority Over Pricing

Sellers have authority to set prices for their products while the admin maintains platform-wide pricing guidelines.

**THE system SHALL allow sellers to:**
- Set and modify prices for their own products independently
- Create seller-specific discounts and promotions
- Override default pricing at any time before order placement

**THE system SHALL prevent sellers from:**
- Accessing or modifying prices set by other sellers
- Setting prices for products they don't own
- Viewing competitor pricing details (except in aggregate analytics)

**WHEN admin implements platform-wide discounts, THE system SHALL:**
- Apply discounts to all eligible seller products
- Maintain seller's original price in system records
- Calculate final price as: (seller's price) - (admin discount)
- Ensure seller payout is based on original price minus only the admin discount, not the final customer price

**WHEN a seller's pricing appears to violate policies (too low, predatory pricing, etc.), THE system SHALL:**
- Automatically flag for admin review
- Send warning to seller if prices are suspicious
- Require seller justification for steep price changes (>50% change in 24 hours)
- Potentially require admin approval before prices take effect (configurable by admin)

---

## Inventory Tracking

### Inventory Tracking at SKU Level

Inventory is tracked at the individual SKU level, not at the product level. This ensures accurate availability information and prevents overselling.

**SKU Inventory Attributes:**
- SKU ID (reference to specific variant)
- Seller ID (which seller owns this SKU inventory)
- Quantity on hand (current stock quantity, non-negative integer)
- Quantity reserved (items in active carts or pre-orders, non-negative integer)
- Quantity committed (items allocated to confirmed orders, non-negative integer)
- Quantity available = (on hand - reserved - committed)
- Last inventory count date (timestamp of last manual inventory count)
- Last inventory update (timestamp of most recent inventory change)
- Reorder level (automatic notification trigger, default 10 units)
- Reorder quantity (suggested reorder amount, default 50 units)
- Warehouse location (optional, for multi-location sellers)
- Inventory status (on-hand, back-order, discontinued)

**THE system SHALL track inventory separately for each SKU-Seller combination, allowing the same product variant to have different inventory levels across sellers.**

**EXAMPLE:**
- Product "Blue Cotton T-Shirt, Size M" (SKU: SHIRT-BLUE-M)
- Seller A has: 100 on hand, 15 reserved, 20 committed = 65 available
- Seller B has: 50 on hand, 5 reserved, 10 committed = 35 available
- Customer sees both options with different availability and prices

**WHEN inventory changes (sale, restock, adjustment), THE system SHALL immediately update all inventory counters to maintain accuracy:**
- Recalculate available quantity
- Update database with new counts
- Trigger downstream notifications if thresholds crossed

### Real-Time Inventory Updates

The system maintains real-time inventory accuracy through immediate updates upon specific business events.

**Inventory Decrease Events (reduce available quantity):**
- **Customer adds item to shopping cart**: Reserve inventory temporarily (15-minute hold)
- **Order is placed**: Commit inventory to order (prevents resale)
- **Admin adjusts inventory downward**: Reduce on-hand count (damage, loss, inventory correction)
- **Inventory correction due to damage or loss**: Remove damaged items from available pool
- **Return rejected and item disposed**: Remove returned item from available inventory

**Inventory Increase Events (increase available quantity):**
- **Customer removes item from shopping cart**: Release reservation (item becomes available again)
- **Order is cancelled**: Release committed inventory (return to available)
- **Seller restocks product**: Add new stock to on-hand quantity
- **Seller receives returned items**: Add returned quantity back to inventory (with condition inspection)
- **Admin adjusts inventory upward**: Increase on-hand count (inventory correction, stock discovered)
- **Admin processes approved returns**: Add returned item quantity back to seller inventory

**WHEN an inventory-changing event occurs, THE system SHALL:**
1. Update inventory count within 1 second in the database
2. Propagate change to product search index within 5 seconds
3. Update customer-visible product listing within 10 seconds
4. Log the change in inventory audit trail
5. Evaluate if notifications are needed (low stock, restock alert, etc.)

**WHEN inventory falls below the reorder level, THE system SHALL:**
- Notify the seller immediately via email and in-app alert
- Provide reorder level, current stock, and suggested reorder quantity
- Track notification sent timestamp in audit log

**THE system SHALL maintain complete audit trail of all inventory movements:**
- Log entry created with: timestamp, SKU, seller, quantity change (positive/negative)
- Reason for movement (sale, restock, return, adjustment, damage, loss)
- Order or transaction ID (reference to what triggered the change)
- Admin/user ID who initiated the change
- Before and after inventory counts
- System status at time of change

**THE system SHALL retain complete inventory movement history for minimum 5 years for audit purposes and trend analysis.**

**WHEN an inventory operation fails (database connection lost, transaction timeout), THE system SHALL:**
1. Automatically retry the operation up to 3 times over 30 seconds
2. If retry succeeds, complete normally
3. If retry fails, log error with full context
4. Alert admin team for manual investigation
5. NOT lose inventory data or orders in progress

### Inventory Reservation System

The system prevents overselling through an inventory reservation mechanism that temporarily holds inventory when customers add items to carts.

**Reservation Process:**
1. **Customer adds item to cart** → system reserves quantity (holds for this customer)
2. **Quantity moves from "available" to "reserved"** (now unavailable for other customers)
3. **Reserved inventory persists for cart lifetime or 24 hours** (whichever expires first)
4. **On order placement** → quantity moves from "reserved" to "committed" (converted to confirmed sale)
5. **On order cancellation** → quantity moves from "committed" back to "available" (released for resale)
6. **On cart abandonment** → quantity moves from "reserved" back to "available" after timeout

**WHEN a customer adds an item to cart, THE system SHALL:**
1. Check current available inventory (on hand - reserved - committed)
2. Verify available inventory >= requested quantity
3. If sufficient: add to cart and reserve inventory
4. If insufficient: display maximum available quantity and suggest that amount
5. Decrement available count immediately

**EXAMPLE:**
- Product on-hand: 100 units
- Reserved: 20 units (other customers' carts)
- Committed: 30 units (existing orders)
- Available: 50 units
- Customer A requests 30 units
- System checks: 50 >= 30? Yes, proceed
- New state: Available becomes 20, Reserved becomes 50

**IF insufficient inventory is available, THE system SHALL display message:**
- "This item is currently limited to X units available"
- "Would you like to add X units to your cart instead?"
- Show countdown timer on when more stock might be available

**WHEN a customer removes an item from cart, THE system SHALL immediately release the reservation:**
1. Decrement reserved count
2. Increment available count back to original value
3. Remove from cart
4. Make inventory available to other customers

**WHEN reservation period expires (24 hours), THE system SHALL:**
1. Check if cart still active (customer hasn't abandoned session)
2. If cart active, extend reservation another 24 hours automatically (don't interrupt customer's shopping)
3. If customer hasn't interacted in 24 hours, release reservation
4. Make inventory available to other customers

**WHEN multiple customers attempt to purchase the last available unit:**
- Customer A clicks "Place Order" at 2:00:00 PM
- Customer B clicks "Place Order" at 2:00:05 PM
- System processes A's payment successfully at 2:00:10 PM → order confirmed
- System attempts B's payment at 2:00:12 PM → insufficient inventory error
- Customer B receives message: "This item sold out while you were checking out. Similar items available below."

---

### Stock Movement History

The system maintains complete records of all inventory movements for auditing, analytics, and troubleshooting.

**Tracked Movement Information:**
- Movement ID (unique identifier)
- SKU and Seller (which inventory was affected)
- Movement type (sale, restock, adjustment, return, refund, damage, loss, correction)
- Quantity change (positive or negative, integer)
- Previous quantity (on hand before movement)
- New quantity (on hand after movement)
- Timestamp with timezone and exact second
- User who initiated movement (system, customer ID, seller ID, admin ID)
- Related order/transaction ID (if applicable)
- Notes/reason for movement (comment field, up to 500 characters)
- Status of movement (completed, pending, failed, reversed)

**Example Movements:**
- Customer A purchases 2 units → movement type: sale, quantity: -2
- Seller restocks 50 units → movement type: restock, quantity: +50
- Admin adjusts due to damage → movement type: damage, quantity: -5
- Return processed → movement type: return, quantity: +3

**THE system SHALL retain complete inventory movement history for minimum 5 years for audit, compliance, and trend analysis purposes.**

**THE system SHALL provide inventory movement reports to sellers showing:**
- Daily/weekly/monthly movement summary
- Trending products (fastest moving)
- Stock-out incidents and duration
- Seasonal patterns and demand fluctuations
- Inventory turnover metrics

**THE system SHALL provide admin access to view movement history across all sellers for:**
- Platform-wide inventory insights
- Detection of fraud patterns (unusual movements)
- Seller performance analysis
- Inventory accuracy verification

---

## Stock Visibility and Availability

### Availability Status Determination

The system determines and displays availability status based on current inventory levels, helping customers understand if they can purchase.

**Availability Status Options:**
- **In Stock**: Quantity available is greater than 0 (product purchasable)
- **Low Stock**: Quantity available is less than or equal to reorder level but greater than 0 (e.g., "Only 3 left in stock")
- **Out of Stock**: Quantity available is 0 (product not purchasable, shows restock notification option)
- **Discontinued**: Product variant is no longer available for purchase (never to be restocked)
- **Pre-Order**: Product not yet in stock but customers can reserve with guaranteed order

**THE system SHALL calculate availability status in real-time based on current inventory levels and inventory deductions from active orders.**

**WHEN a product variant reaches zero available inventory, THE system SHALL:**
1. Immediately change its status to "Out of Stock"
2. Update within 1 second in all customer-facing displays
3. Remove from active sales (cannot be added to cart)
4. Mark product with out-of-stock badge
5. Update search index and remove from rankings

**WHEN inventory becomes available for a previously out-of-stock variant, THE system SHALL:**
1. Update status to "In Stock" within 1 second
2. Update search index to include in results
3. Notify all customers who wishlist-added the product
4. Send email: "[Product Name] is back in stock!"
5. Display re-stock badge for first 7 days

**THE system SHALL display Low Stock status when inventory levels reach the reorder threshold (typically 10 units, configurable per seller).**

**WHEN Low Stock status is active, THE system SHALL display:**
- Badge text: "Only [X] left in stock"
- Urgency indicator: "Hurry, limited availability"
- Recommendation: "Popular item, order now to avoid disappointment"
- Time-limited callout if selling out fast

### Stock Level Visibility

Different user types have different visibility into stock information based on their role and need-to-know basis.

**Customer Stock Visibility:**
- **In Stock**: Display green "In Stock" badge or availability indicator
- **Low Stock**: Display "Only X units remaining" with X visible only if < 10
- **Out of Stock**: Display "Out of Stock" badge with restock date estimate (if available)
- **Expected Restock**: "Expected [Date]" if seller provided restock date
- **Exact quantity numbers**: NOT displayed to customers (prevents hoarding in scarcity situations)
- **Notify Me**: Wishlist option to get notified when item is back in stock

**Seller Stock Visibility:**
- **Exact quantity on hand**: Display precise number (e.g., 247 units)
- **Reserved inventory**: Show items in customer carts (e.g., 12 units reserved)
- **Committed inventory**: Show items in pending orders (e.g., 35 units committed)
- **Available for sale**: Calculate and display 247 - 12 - 35 = 200 available
- **Detailed inventory history**: View all movements, timestamps, and reasons
- **Low stock alerts**: Notifications when approaching reorder level
- **Reorder recommendations**: Suggested reorder quantity based on sales velocity
- **Stock location**: If multi-warehouse, location of inventory
- **Inventory analytics**: Turnover rate, days of supply, forecasted stockout date

**Admin Stock Visibility:**
- **All seller stock information**: Complete view of all SKU inventories across all sellers
- **Ability to view and adjust inventory levels**: Manual correction capability with audit trail
- **Complete inventory audit trail**: All movement history and user actions
- **Inventory movement analytics**: Trends, patterns, suspicious activities
- **Seller inventory performance metrics**: Stockout frequency, turnover rates
- **Stock anomaly detection**: Automatic alerts for unusual movements

**THE system SHALL prevent exact quantity display to customers to prevent panic buying and hoarding during product scarcity.**

**THE system SHALL provide sellers with recommended inventory levels based on:**
- Historical sales velocity (units sold per day/week/month)
- Seasonal demand patterns
- Lead time from suppliers
- Storage capacity constraints
- Cash flow considerations

### Out-of-Stock Handling

When a product variant runs out of stock, the system handles it gracefully to maintain customer experience.

**Out-of-Stock Behavior:**
- **Search Results**: Product/variant removed from active search results
- **Product Detail Page**: Still accessible via direct URL, shows "Out of Stock" prominently
- **Related Products**: Shown to customer as alternative ("Out of stock? Try these similar items")
- **"Add to Cart" Button**: Disabled or hidden (cannot purchase)
- **"Notify Me" Button**: Available for customer to request restock notification
- **Wishlist Option**: Available to add to wishlist for future notification
- **Backorder Option**: May be available if seller allows backorders (pre-order at current price)

**WHEN a customer attempts to add an out-of-stock item to cart, THE system SHALL:**
1. Prevent addition to cart
2. Display message: "This item is currently out of stock"
3. Show expected restock date (if seller provided)
4. Offer "Notify Me" option to request notification when back in stock
5. Suggest 3 similar in-stock alternatives

**WHEN a customer adds an item to their "Notify Me" list, THE system SHALL:**
1. Store the notification preference
2. Send confirmation: "We'll notify you when this item is back in stock"
3. Watch for inventory increases
4. Send notification email when item returns to stock

**WHEN a customer follows/watches an out-of-stock item, THE system SHALL:**
- Send notification email when stock becomes available again
- Include link to product
- Mention quantity available
- Remind of previous wishlist status

**WHEN an out-of-stock item receives new inventory, THE system SHALL:**
1. Automatically notify all customers (up to 100 email notifications)
2. Update product status to "In Stock"
3. Display restock badge for 7 days
4. Include restock info in product detail ("Just restocked!")
5. Prioritize in search results for 7 days

---

### Low Stock Notifications

The seller system alerts sellers when inventory approaches minimum levels to enable timely restocking.

**WHEN inventory for a SKU falls to the reorder level (default: 10 units, configurable), THE system SHALL:**
1. Send notification to seller immediately via email and in-app alert
2. Include current quantity, reorder level, and suggested reorder quantity
3. Provide quick-action link to place reorder or adjust inventory
4. Track notification timestamp in audit log
5. Remind seller if notification not acted upon after 7 days

**THE system SHALL include in the low stock notification:**
- Product name and SKU
- Current inventory level
- Reorder level threshold
- Suggested reorder quantity (based on sales velocity)
- Days of supply at current sales rate
- Link to sales velocity data for this product
- One-click access to suppliers/reorder process
- Estimated delivery date if supplier data available

**THE system SHALL allow sellers to customize:**
- Reorder level threshold (minimum quantity at which alert triggers)
- Alert frequency (once when threshold hit, daily reminders, etc.)
- Alert method (email, SMS, in-app notifications)
- Suggested reorder quantity calculation method

---

### Restock Management

Sellers manage restocking through the inventory management interface.

**Restock Process:**
1. **Seller receives new shipment** of inventory from supplier
2. **Seller inspects items** for quality and accuracy
3. **Seller records receipt** in system with receipt details
4. **Seller updates quantity** on hand for affected SKUs
5. **System updates available inventory** immediately
6. **System updates availability status** if applicable
7. **Customers and search results** reflect new stock automatically

**WHEN a seller adds inventory to a previously out-of-stock SKU, THE system SHALL:**
1. Update availability status to "In Stock" within 1 second
2. Update search index within 5 seconds
3. Notify waiting customers via email
4. Include notification in customer app/dashboard
5. Restore product to search results and recommendations

**THE system SHALL track restock history enabling analysis of:**
- Restock frequency and timing
- Inventory turn rate (how quickly inventory sells after restock)
- Restock-to-stockout cycle patterns
- Supplier reliability and lead times
- Optimal restock quantities

**WHEN a seller performs bulk inventory update via CSV import:**
1. System validates all rows for data integrity
2. System checks SKU validity and seller ownership
3. System prevents negative inventory values
4. System shows preview of changes before committing
5. System commits all updates atomically (all-or-nothing)
6. System generates audit trail for each inventory change
7. System notifies seller of successful import with summary

**THE system SHALL prevent unintentional large inventory adjustments by:**
- Requiring confirmation for adjustments > 50 units
- Requiring manual entry for adjustments > 200 units (no copy-paste)
- Providing 30-second undo window after inventory update
- Sending email notification to seller for any inventory adjustment

---

## Business Rules and Constraints

### Data Validation Rules

**Product Name Constraints:**
- Minimum: 3 characters
- Maximum: 200 characters
- WHEN a seller creates a product, the name must be between these limits
- Allowed characters: letters, numbers, spaces, hyphens, parentheses, ampersand
- NOT allowed: special characters that might break formatting

**Product Description Constraints:**
- Minimum: 10 characters
- Maximum: 5,000 characters
- WHEN a seller enters description, THE system SHALL validate length
- HTML/markup not allowed (auto-stripped if attempted)
- Line breaks preserved for readability

**Category Assignment Constraints:**
- Minimum: 1 category (primary category is mandatory)
- Maximum: 5 categories (1 primary + 4 secondary)
- WHEN assigning to secondary categories, THE system SHALL verify they're in same parent category tree (e.g., all in "Electronics" tree, not mixed with "Clothing")

**SKU Constraints:**
- Minimum length: 6 characters
- Maximum length: 50 characters
- Allowed characters: alphanumeric (A-Z, 0-9), hyphens (-), underscores (_)
- NOT allowed: spaces, special characters (#, $, %, &, @, etc.)
- WHEN a seller creates SKU, THE system validates against these rules
- WHEN a seller creates SKU, THE system checks for global uniqueness (must be unique across ALL sellers)

**Price Constraints:**
- Minimum: $0.01
- Maximum: $999,999.99
- Precision: exactly 2 decimal places
- WHEN a seller sets price, THE system validates range and precision
- WHEN price is outside range, THE system returns error: "Price must be between $0.01 and $999,999.99"

**Inventory Constraints:**
- Minimum: 0 units (zero is allowed, indicates out of stock)
- Maximum: 999,999 units per SKU
- Type: non-negative integer (no decimals)
- WHEN a seller sets inventory, THE system validates type and range
- WHEN inventory is adjusted below zero, THE system prevents adjustment and returns error

---

## Integration with Related Business Processes

### Connection to Shopping Cart and Orders

Inventory system integrates with shopping cart and order management to prevent overselling.

**WHEN a customer places an order, THE system SHALL:**
1. Verify current available inventory is sufficient for all items
2. Commit the inventory to the order (deduct from available)
3. Remove from available inventory permanently (marked as sold)
4. Prevent other customers from purchasing the same inventory
5. Record order-inventory linkage for tracking

**WHEN an order is cancelled, THE system SHALL:**
1. Release committed inventory back to available pool immediately
2. Notify seller that inventory was released
3. Update product availability status if previously out of stock
4. Notify waiting customers if product just became available

### Connection to Returns and Refunds

When customers return items, inventory system updates to reflect restocked goods.

**WHEN a return is approved by seller, THE system SHALL:**
1. Add the returned quantity back to seller's inventory for that SKU
2. Update availability status if inventory reaches "In Stock" threshold again
3. Log the return movement in inventory history
4. Notify seller of inventory restoration

**WHEN a return is denied, THE system SHALL:**
1. Update inventory status showing item as permanently removed from saleable inventory
2. NOT add quantity back to available pool
3. Record the disposition (return denied, item lost, etc.)

### Connection to Seller Management

Sellers manage their inventory through their seller dashboard, with system enforcing business rules.

**WHEN a seller updates inventory in dashboard, THE system SHALL:**
1. Validate new quantity is non-negative integer
2. Prevent setting inventory to negative values
3. Record the change in audit trail
4. Update available quantity immediately
5. Notify of any inventory threshold changes

**WHEN a seller delists a product, THE system SHALL:**
1. Mark inventory as non-saleable (but retain for audit purposes)
2. Prevent further sales of the product
3. Preserve historical inventory data
4. Allow reactivation if seller changes mind (within 30 days)

**WHEN a seller's account is suspended, THE system SHALL:**
1. Mark their inventory as unavailable for sale
2. NOT deallocate existing reserved inventory
3. Allow existing orders to proceed to fulfillment
4. Prevent new orders for this seller

---

## Success Criteria and Metrics

The Product Catalog and Inventory Management system is considered successful when:

- ✅ **Inventory Accuracy**: System inventory matches physical inventory within 2% variance (monthly audit)
- ✅ **Overselling Prevention**: Zero overselling incidents (never selling more than available inventory)
- ✅ **Real-time Updates**: Inventory changes visible to customers within 10 seconds of occurrence
- ✅ **Search Performance**: Product search completes within 2 seconds even with 1M+ products
- ✅ **Variant Management**: Sellers can manage products with 50+ variants without performance degradation
- ✅ **Pricing Accuracy**: All pricing calculations correct 100% of the time (accounting audit confirmed)
- ✅ **Stock Visibility**: Customers always see accurate availability status
- ✅ **Seller Satisfaction**: Sellers rate inventory management tools 4.0+ stars out of 5.0
- ✅ **System Reliability**: Inventory system uptime 99.9% (max 43 minutes downtime monthly)
- ✅ **Concurrent Operations**: System handles 1,000 simultaneous inventory operations without data loss

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, inventory synchronization algorithms, real-time update mechanisms, caching strategies, etc.) are at the discretion of the development team. The development team has full autonomy over technical solutions that satisfy these business requirements.*
