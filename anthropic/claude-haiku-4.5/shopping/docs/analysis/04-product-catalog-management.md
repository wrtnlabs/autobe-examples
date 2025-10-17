# Product Catalog Management

## Product Catalog Architecture Overview

### System Purpose and Scope

THE shopping mall platform's product catalog system SHALL provide a comprehensive catalog of products offered by multiple sellers. THE system SHALL organize products into hierarchical categories, support product variants with different options (colors, sizes, etc.), manage pricing at the variant level, and enable dynamic search and filtering for customers to discover products.

THE product catalog serves as the central repository for all product information, linking customers to seller offerings and enabling inventory management at the SKU (Stock Keeping Unit) level. THE system SHALL maintain complete product information including descriptions, specifications, pricing, variants, and availability status.

### Core Components and Relationships

THE product catalog consists of the following primary entities:

1. **Products**: Core product records that represent a specific item offered by a seller (e.g., "Blue Cotton T-Shirt")
2. **Categories**: Hierarchical organization structure that groups related products (e.g., Clothing > Tops > T-Shirts)
3. **Variants**: Product variants representing different combinations of options for a single product (e.g., T-shirt in Size M + Color Blue)
4. **SKUs**: Stock Keeping Units that uniquely identify each variant for inventory tracking
5. **Pricing**: Individual prices defined at the variant level
6. **Inventory**: Real-time stock quantities tied to specific SKUs (detailed in separate inventory management document)

THE relationships between these entities enable sellers to manage diverse product catalogs while allowing the system to track inventory at granular SKU levels and maintain accurate pricing information.

---

## Product Categories and Organization

### Category Hierarchy

THE system SHALL support a hierarchical category structure with multiple levels of categorization. THE categories SHALL be organized with the following structure:

- **Primary Categories**: Top-level categories representing major product types (e.g., Electronics, Clothing, Home & Garden, Sports)
- **Secondary Categories**: Mid-level categories that refine the primary category (e.g., Electronics > Computers, Electronics > Mobile Devices)
- **Tertiary Categories**: Detailed categories for specific product types (e.g., Computers > Laptops, Computers > Desktops)

THE system SHALL support up to three levels of category hierarchy. Products SHALL be assigned to one or more tertiary categories, enabling customers to browse and filter by specific product types.

### Category Management Capabilities

THE admin users SHALL have the following category management capabilities:

- WHEN an admin creates a new category, THE system SHALL validate the category name, optional description, and parent category assignment
- THE system SHALL assign a unique category identifier to each category
- THE system SHALL support category name and description updates by admin users
- THE system SHALL prevent deletion of categories that contain active products
- THE system SHALL enable admin users to reorganize categories by changing parent category assignments
- THE system SHALL track category creation and modification timestamps

### Product-to-Category Relationships

- THE system SHALL allow each product to be assigned to one or more tertiary categories
- WHEN a product is created, THE system SHALL require assignment to at least one category
- THE system SHALL enable updates to product category assignments
- THE system SHALL update category product counts when products are added or removed from categories

---

## Product Information Structure

### Complete Product Attributes

A complete product record SHALL contain the following mandatory information:

| Attribute | Type | Purpose | Validation |
|-----------|------|---------|-----------:|
| Product ID | UUID | Unique identifier | Auto-generated, immutable |
| Product Name | String (1-200 chars) | Display name for product | Required, unique per seller within category |
| Description | String (10-5000 chars) | Detailed product information | Required, minimum 10 characters |
| Category IDs | Array of UUIDs | Categories for organization | Required, at least one category |
| Seller ID | UUID | Identifying product owner | Required, immutable after creation |
| Product Status | Enum | Publication state | Required, one of: DRAFT, ACTIVE, INACTIVE, ARCHIVED |
| Created Timestamp | ISO 8601 DateTime | Product creation time | Auto-generated, immutable |
| Updated Timestamp | ISO 8601 DateTime | Last modification time | Auto-updated on changes |
| Brand | String (1-100 chars) | Product brand/manufacturer | Optional |
| Product Images | Array of URLs | Product photos | Optional, up to 10 images per product |
| Specifications | JSON Object | Product-specific attributes | Optional, flexible structure |

### Optional Product Attributes

THE system SHALL support the following optional attributes that sellers can provide:

- **Brand**: The manufacturer or brand name of the product
- **SKU Prefix**: Optional prefix for generated SKUs (e.g., "TSHIRT" for a t-shirt product)
- **Weight**: Product weight for shipping calculations
- **Dimensions**: Product dimensions (length, width, height)
- **Material Composition**: Material details and composition percentages
- **Care Instructions**: Product maintenance and care guidelines
- **Warranty Information**: Warranty period and coverage details
- **Product Tags**: Searchable tags for additional categorization
- **Features**: Array of key product features or highlights
- **Return Policy**: Product-specific return eligibility

### Data Validation Requirements

- THE system SHALL validate that product names are non-empty strings with maximum 200 characters
- THE system SHALL validate that descriptions contain minimum 10 characters and maximum 5000 characters
- THE system SHALL validate that at least one category is assigned to each product
- THE system SHALL validate that product images are valid URLs pointing to actual image files
- THE system SHALL validate that weight and dimension values are positive numbers when provided
- THE system SHALL validate that all JSON specifications conform to expected data types
- THE system SHALL reject product names that contain only special characters or whitespace

---

## SKU and Variants System

### SKU Definition and Purpose

A Stock Keeping Unit (SKU) is a unique identifier assigned to each specific variant combination of a product. THE SKU system enables:

1. **Inventory Tracking**: Each SKU has independent inventory quantity management
2. **Variant Pricing**: Each SKU can have different pricing
3. **Order Fulfillment**: Orders reference specific SKUs for accurate fulfillment
4. **Tracking**: Detailed tracking of sales and stock movement by specific variant

THE system SHALL generate unique SKUs automatically for each variant combination, using the format: `[SELLER_PREFIX]-[PRODUCT_ID_SHORT]-[VARIANT_COMBINATION_CODE]`

Example: `SELLER-PRD123-BLU-M` for Blue Medium variant

### Variant Options and Configuration

THE system SHALL support the following standard variant option types:

1. **Color/Finish**: The color or finish of the product (e.g., Blue, Red, Black, Silver)
2. **Size**: The size dimension or measurement (e.g., S, M, L, XL for clothing; 32GB, 64GB for electronics)
3. **Style**: Alternative style or design of the product (e.g., V-Neck, Crew Neck)
4. **Material**: Primary material composition (e.g., Cotton, Polyester, Wool)
5. **Pattern**: Visual pattern (e.g., Solid, Striped, Checkered)
6. **Configuration**: Product-specific configurations (e.g., Hard Drive Capacity, RAM Size)

Sellers SHALL define which variant options apply to each product. For example, a t-shirt might have Color and Size options, while a laptop might have Color, RAM Size, and Storage Capacity options.

### Variant Combinations and Relationships

WHEN a seller creates a product with variant options, THE system SHALL:

1. Accept the product base information (name, description, category, etc.)
2. Accept the list of variant option types (e.g., Color, Size)
3. Accept the values for each option type (e.g., Color: Blue, Red, Black; Size: S, M, L, XL)
4. Generate all possible variant combinations (e.g., Blue-S, Blue-M, Blue-L, Blue-XL, Red-S, etc.)
5. Create a unique SKU for each variant combination
6. Allow the seller to set individual pricing and inventory for each SKU

THE system SHALL validate that:
- At least one variant option is defined for products with variants
- Each variant option has at least one valid value
- Variant combinations do not exceed 1000 combinations per product (to prevent system performance issues)
- No duplicate variant combinations exist for the same product

### Example: T-Shirt Product with Variants

Product: "Classic Cotton T-Shirt"
- Variant Options: Color (Blue, Red, White), Size (S, M, L, XL)
- Generated Variants: 12 combinations
  - Blue-S (SKU: SELLER-TSH001-BLU-S)
  - Blue-M (SKU: SELLER-TSH001-BLU-M)
  - Blue-L (SKU: SELLER-TSH001-BLU-L)
  - Blue-XL (SKU: SELLER-TSH001-BLU-XL)
  - Red-S through Red-XL (4 variants)
  - White-S through White-XL (4 variants)

---

## Product Pricing and Currency

### Pricing Structure at Variant Level

THE system SHALL manage pricing at the SKU (variant) level, not at the product level. Each SKU SHALL have:

1. **Base Price**: The standard retail price in the platform's base currency
2. **Currency**: The currency of the price (default: USD, but platform supports multiple currencies)
3. **Price Effective Date**: The date from which the price is active
4. **Price History**: Complete audit trail of all price changes

WHEN a product has multiple variants (SKUs), THE system SHALL allow each SKU to have different pricing based on variant-specific factors (e.g., larger sizes cost more, premium colors cost more).

### Price Management and Updates

- WHEN a seller creates a new SKU, THE seller SHALL specify the base price for that SKU
- THE system SHALL validate that prices are positive decimal numbers with maximum two decimal places (e.g., $19.99)
- THE system SHALL support price updates by sellers through their product management interface
- WHEN a seller updates a price, THE system SHALL record the previous price and timestamp in the price history
- THE system SHALL allow price changes to take effect immediately or be scheduled for a future date
- THE system SHALL prevent prices from being set to zero or negative values
- THE system SHALL calculate and display effective prices including any applicable platform fees or taxes

### Currency Handling

- THE platform SHALL support multiple currencies for international commerce
- WHEN a product is created by a seller, THE seller SHALL specify the currency for pricing (default: USD)
- THE system SHALL store all prices in the seller's specified currency
- WHEN a customer from a different country views products, THE system MAY display converted prices based on current exchange rates
- THE system SHALL clearly indicate the currency for all displayed prices to prevent confusion

### Price Validation Rules

- IF a seller attempts to set a price below the cost floor (if configured), THE system SHALL warn the seller but allow the price
- IF a seller attempts to set a price above the cost ceiling (if configured), THE system SHALL warn the seller but allow the price
- THE system SHALL validate prices are numeric values with maximum 2 decimal places
- THE system SHALL validate prices are not null or empty

---

## Product Status and Visibility

### Product Lifecycle States

THE product catalog SHALL track product status through the following lifecycle states:

1. **DRAFT**: Product is being created/edited by seller but not visible to customers
   - Seller can save product information and come back to edit later
   - Product is not searchable or visible in catalog
   - Seller can add/edit all product information

2. **ACTIVE**: Product is published and available for purchase
   - Product is searchable and visible in customer catalog
   - Product information is locked from major changes (can only update pricing and inventory)
   - Product appears in category listings and search results
   - Customers can add product to cart and wishlist

3. **INACTIVE**: Product is temporarily unavailable but not deleted
   - Product is hidden from customer view
   - Seller can reactivate the product without losing product data
   - Existing orders for inactive products continue to be fulfilled
   - Product information is preserved for historical records

4. **ARCHIVED**: Product is permanently removed from catalog
   - Product is not visible to customers
   - Product data is retained for historical and audit purposes
   - Seller cannot modify archived products
   - Orders for archived products can still be viewed in order history

### Product Visibility and Publication Rules

- WHEN a seller completes product entry in DRAFT status, THE seller SHALL explicitly change status to ACTIVE to publish
- THE system SHALL validate all required product fields before allowing status change from DRAFT to ACTIVE
- WHEN a product is ACTIVE, THE system SHALL display it in:
  - Category listings
  - Search results (when relevant to search query)
  - Seller storefront (if seller has public storefront feature)
  - Product recommendations (if applicable)
- WHEN a product changes from ACTIVE to INACTIVE, THE system SHALL:
  - Remove it from search results and category listings
  - Prevent new orders
  - Allow existing orders to complete normally
- THE system SHALL track status change timestamps and the user who made the change

### Approval Workflows

- THE system SHALL support optional admin approval for new products before they become active
- IF product approval is enabled, WHEN a seller attempts to publish a product (DRAFT to ACTIVE), THE product SHALL:
  - Enter a PENDING_APPROVAL status
  - Be reviewed by an admin user
  - Transition to ACTIVE if approved
  - Remain in DRAFT if rejected with admin feedback provided
- THE system SHALL track admin approval actions and timestamps

---

## Seller Product Management

### Seller Capabilities and Permissions

Seller users SHALL have the following product management capabilities:

- Sellers can create new products and add them to categories
- Sellers can edit products they created (subject to status restrictions)
- Sellers can change product status (DRAFT, ACTIVE, INACTIVE, ARCHIVED)
- Sellers can manage variant options and create/configure SKUs
- Sellers can update pricing for their products and SKUs
- Sellers can upload and manage product images
- Sellers can view their products and their current status
- Sellers can view sales data and performance metrics for their products (detailed in seller dashboard)

Sellers CANNOT:
- View, edit, or manage other sellers' products
- Change product categories after initial publication (for data consistency)
- Delete products (products must be archived instead)
- View other sellers' pricing or inventory data
- Modify product information that affects existing orders

### Product Listing Operations

**Creating a New Product:**

WHEN a seller creates a new product, THE system SHALL:

1. Accept product base information (name, description, categories, brand, images)
2. Accept variant option configuration
3. Generate all variant combinations and create SKUs
4. Set initial product status to DRAFT
5. Require pricing and inventory information for each SKU before publishing
6. Assign the product to the seller's account
7. Store creation timestamp and seller information
8. Enable seller to save the product and return to edit later if needed

**Publishing a Product:**

WHEN a seller changes product status from DRAFT to ACTIVE, THE system SHALL:

1. Validate all required information is complete
2. Validate pricing is set for all SKUs
3. Validate inventory is allocated for all SKUs
4. Set status to ACTIVE (or PENDING_APPROVAL if approval is required)
5. Record publication timestamp
6. Make product visible in catalog and search

**Updating an Active Product:**

WHEN a seller updates an ACTIVE product, THE system SHALL:

- Allow updates to: pricing, inventory, images, descriptions, specifications, tags
- Prevent changes to: variant options (would affect existing order fulfillment), base product name
- Update the product's "last modified" timestamp
- Maintain audit trail of all changes

### Product Editing and Updates

- WHEN a seller edits a DRAFT product, THE system SHALL allow changes to all product fields
- WHEN a seller edits an ACTIVE product, THE system SHALL:
  - Allow pricing updates (takes effect immediately)
  - Allow inventory updates (integrated with inventory system)
  - Allow description and specification updates
  - Allow image updates
  - Prevent variant option modifications (creates data integrity issues)
  - Record all changes with timestamps for audit purposes
- WHEN a seller attempts to edit another seller's product, THE system SHALL deny access and log the attempt
- THE system SHALL validate all edited product information before confirming changes
- THE system SHALL display change confirmation and validation errors to sellers

---

## Product Search and Filtering

### Search Functionality Requirements

THE system SHALL provide comprehensive search capabilities enabling customers to find products efficiently:

**Text Search:**

- WHEN a customer enters a search query, THE system SHALL search across:
  - Product names
  - Product descriptions
  - Product specifications
  - Product tags
  - Brand names
  - Category names
- THE system SHALL return search results ordered by relevance (most relevant first)
- THE system SHALL support partial text matching (e.g., searching "shirt" returns results containing "t-shirt")
- THE system SHALL be case-insensitive (searching "BLUE" and "blue" return same results)
- THE system SHALL support wildcard patterns for flexible searching

**Search Result Structure:**

Search results SHALL include:
- Product name and primary image
- Seller information and store name
- Price range (minimum and maximum price across all active SKUs)
- Product rating and number of reviews (if available)
- Product availability status (in stock, low stock, out of stock)
- Quick add to cart or wishlist buttons

### Filter Capabilities

THE system SHALL support filtering search results by the following criteria:

| Filter Type | Options | Purpose |
|---|---|---|
| Category | Hierarchical category tree | Narrow results to specific product types |
| Price Range | Min/Max price inputs | Filter by budget range |
| Brand | Brand name list | Filter by manufacturer/brand |
| Rating | 1-5 star minimum rating | Filter by customer satisfaction |
| Availability | In Stock, Low Stock, Out of Stock | Filter by purchase availability |
| Seller | Seller name/store list | Filter by specific sellers |
| Color | Color options for variant | Filter by product color (if applicable) |
| Size | Size options for variant | Filter by product size (if applicable) |
| Condition | New, Refurbished, Used | Filter by product condition (if applicable) |
| Discount | Has discount, Discount % range | Filter discounted products |

- WHEN a customer applies filters, THE system SHALL update search results to show only products matching all selected filters
- THE system SHALL allow combining multiple filters (e.g., Category + Price Range + Brand)
- THE system SHALL display the count of results for each filter option
- THE system SHALL enable customers to reset filters and start new search

### Search Performance and Expectations

- THE system SHALL return search results within 2 seconds for typical queries
- WHEN a search query returns more than 100 results, THE system SHALL:
  - Display first 20 results per page
  - Enable pagination to navigate results
  - Allow sorting by: Relevance, Price (Low to High), Price (High to Low), Newest, Ratings
- THE system SHALL cache frequently searched queries to improve response time
- THE system SHALL track search queries for analytics purposes

### Search Sorting Options

- **Relevance**: Default sort using text relevance scoring
- **Price: Low to High**: Sort SKUs by lowest to highest price
- **Price: High to Low**: Sort SKUs by highest to lowest price
- **Newest**: Sort by most recently published products
- **Most Popular**: Sort by number of orders (sales volume)
- **Best Rated**: Sort by average customer rating
- **Trending**: Sort by recent spike in sales

---

## Business Rules and Constraints

### Validation Rules

**Product Name Validation:**

- THE system SHALL validate product names are between 1 and 200 characters
- THE system SHALL validate product names do not contain leading/trailing whitespace
- THE system SHALL validate product names contain at least one meaningful word (not just special characters)
- THE system SHALL prevent duplicate product names from the same seller within the same category

**Product Description Validation:**

- THE system SHALL validate descriptions are between 10 and 5000 characters
- THE system SHALL validate descriptions contain meaningful content (not just repeated characters)
- THE system SHALL allow HTML formatting in descriptions (basic tags only for styling)
- THE system SHALL sanitize descriptions to prevent XSS attacks

**Image Validation:**

- THE system SHALL validate product images are valid image file formats (JPEG, PNG, WebP, GIF)
- THE system SHALL validate each image is under 10MB in file size
- THE system SHALL validate image dimensions are at least 400x400 pixels for product thumbnail display
- THE system SHALL require at least one primary product image (can be optional)
- THE system SHALL allow maximum 10 images per product

**Category Assignment Validation:**

- THE system SHALL require at least one category assignment for each product
- THE system SHALL validate all assigned categories exist in the system
- THE system SHALL prevent assignment to inactive or archived categories
- THE system SHALL allow up to 5 category assignments per product

**Variant and SKU Validation:**

- THE system SHALL validate at least one variant option is defined for products with variants
- THE system SHALL validate each variant option has at least one valid value
- THE system SHALL prevent variant combinations from exceeding 1000 per product
- THE system SHALL validate all generated SKUs are unique within the seller's product catalog
- THE system SHALL validate that each SKU has pricing and inventory assigned before product publication

**Pricing Validation:**

- THE system SHALL validate prices are positive decimal numbers
- THE system SHALL validate prices have maximum 2 decimal places
- THE system SHALL prevent prices from being zero or negative
- THE system SHALL validate prices do not exceed 999,999,999.99 (system maximum)
- THE system SHALL validate currency codes follow ISO 4217 standard

### Data Integrity Requirements

- THE system SHALL prevent concurrent modifications to the same product by multiple sellers
- THE system SHALL maintain referential integrity between products, SKUs, and inventory records
- THE system SHALL ensure SKU identifiers remain immutable after creation
- THE system SHALL maintain complete audit trail of all product changes including:
  - Change timestamp
  - User who made the change
  - Previous and new values
  - Change reason (if provided)
- THE system SHALL validate no orphaned SKUs exist (every SKU must belong to an active product)
- THE system SHALL validate no orphaned inventory records exist (every inventory record must reference a valid SKU)

### Seller Restrictions and Enforcement

- THE system SHALL ensure sellers can only view and manage their own products
- WHEN a seller attempts to access another seller's product, THE system SHALL deny access and log the attempt
- THE system SHALL prevent sellers from modifying product information after a product has orders
- THE system SHALL enforce that sellers cannot change primary product category after publication
- THE system SHALL prevent sellers from modifying variant options after SKUs have been created with inventory
- THE system SHALL track and log all unauthorized access attempts for security audit
- WHERE a seller account is deactivated or suspended, THE system SHALL:
  - Archive all active products
  - Prevent new product listings
  - Allow existing orders to continue processing
  - Preserve all product and order data for compliance

---

## Product-to-Inventory Integration

### SKU-Inventory Linkage

THE product catalog system SHALL maintain tight integration with the inventory management system (detailed in [Inventory Management Document](./05-inventory-management.md)):

- EACH created SKU SHALL automatically trigger creation of corresponding inventory record
- WHEN a seller updates inventory for a specific SKU, THE inventory is immediately reflected in the product catalog
- THE system SHALL display current inventory status for each SKU:
  - In Stock (quantity > threshold)
  - Low Stock (quantity < threshold but > 0)
  - Out of Stock (quantity = 0)
- WHEN a product's inventory changes, THE system SHALL update product availability status in search results within 5 seconds

### Product Availability for Ordering

- WHEN a customer views a product, THE system SHALL display current availability for each SKU variant
- IF all SKUs for a product are out of stock, THE system SHALL mark the product as unavailable in search results
- WHEN a customer adds a product to cart, THE system SHALL check real-time inventory and show warning if quantity is limited
- THE system SHALL prevent adding SKUs to cart if current inventory is insufficient

---

## Relationship with Other System Components

### Connection to Order Processing

Products in the catalog are referenced in orders through their SKU identifiers:

- WHEN a customer places an order, THE order captures the specific SKU, current price, and description at time of order (for audit trail)
- THE system SHALL maintain complete product and pricing information with orders for historical accuracy
- For detailed order processing requirements, refer to [Order Processing Document](./08-order-processing.md)

### Connection to Seller Dashboard

Sellers access product management through their seller dashboard:

- THE seller dashboard provides interface for all product management operations
- Sellers view product performance metrics and sales analytics through the dashboard
- For detailed seller dashboard features, refer to [Seller Dashboard Document](./12-seller-dashboard.md)

### Connection to Inventory Management

The inventory system manages stock quantities tied to product SKUs:

- Each product SKU has a corresponding inventory record
- Real-time inventory updates affect product availability
- For detailed inventory management, refer to [Inventory Management Document](./05-inventory-management.md)

---

## Document Navigation

This document is part of the comprehensive shopping mall platform requirements. For related information, please refer to:

- [Inventory Management](./05-inventory-management.md) - Real-time inventory tracking at SKU level
- [Seller Dashboard](./12-seller-dashboard.md) - Seller interface for product management
- [Order Processing](./08-order-processing.md) - How products are ordered

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*