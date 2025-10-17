
# Product Catalog and SKU Management Requirements

## 1. Product Catalog Overview

### 1.1 Purpose and Scope

This document defines the complete requirements for the product catalog system, SKU variant management, category organization, inventory tracking, and product discovery capabilities for the e-commerce shopping mall platform. The product catalog serves as the foundation of the marketplace, enabling sellers to list products with multiple variants and customers to browse, search, and discover products efficiently.

The system must support a multi-vendor marketplace where multiple sellers can list products across diverse categories, each product potentially having multiple variants (SKUs) with different combinations of attributes such as color, size, and custom options. Inventory must be tracked independently for each SKU to ensure accurate stock availability.

### 1.2 Business Context

The product catalog is the core asset of the e-commerce platform. A well-organized, searchable, and flexible catalog directly impacts:
- **Customer experience**: Easy product discovery through intuitive categorization and powerful search
- **Seller productivity**: Efficient product listing management with variant support
- **Inventory accuracy**: Real-time stock tracking at the most granular level (SKU)
- **Sales conversion**: Clear product information with images, attributes, and availability status
- **Platform scalability**: Support for growing product volume across multiple categories and sellers

## 2. Product Category System

### 2.1 Category Hierarchy

The platform uses a hierarchical category structure that allows products to be organized in a tree-like taxonomy, supporting multiple levels of categorization from broad to specific.

**Category Levels:**
- **Level 1 (Root Categories)**: Broad product classifications (e.g., "Electronics", "Clothing", "Home & Garden")
- **Level 2 (Subcategories)**: More specific classifications (e.g., under "Electronics": "Computers", "Mobile Phones", "Audio")
- **Level 3+ (Deep Categories)**: Highly specific classifications (e.g., under "Computers" > "Laptops" > "Gaming Laptops")

**Category Characteristics:**
- Categories can have unlimited depth levels to accommodate diverse product taxonomies
- Each category has a unique identifier, name, and optional description
- Categories can be active or inactive (affecting product visibility)
- Each category can specify its parent category (null for root categories)
- Categories maintain a hierarchical path for breadcrumb navigation (e.g., "Electronics > Computers > Laptops")

### 2.2 Category Attributes

Categories can define specific attributes that are relevant to products within that category:
- **Electronics categories** might define attributes like "Brand", "Warranty Period", "Power Consumption"
- **Clothing categories** might define attributes like "Material", "Care Instructions", "Season"
- **Food categories** might define attributes like "Expiration Date", "Dietary Information", "Origin Country"

These category-specific attributes help standardize product information and enable more effective filtering and search within each category.

### 2.3 Category Management

**Category Creation and Updates:**
- Administrators can create, update, and delete categories
- Sellers can view the category hierarchy but cannot modify it
- Categories can be reorganized (moved to different parent categories)
- Category names must be unique within the same parent level

**Category Assignment:**
- Each product must be assigned to exactly one category (the most specific applicable category)
- Products inherit the full category path for navigation and filtering purposes
- Changing a product's category updates its discoverability and applicable attributes

## 3. Product Variants and SKU Architecture

### 3.1 Base Product Concept

A **base product** represents the general product offering with shared information across all variants:
- Product name and description
- Category assignment
- Brand information
- General product images
- Shared attributes that apply to all variants

The base product serves as a container for one or more SKUs (Stock Keeping Units), which represent the actual purchasable items.

### 3.2 SKU (Stock Keeping Unit)

Each **SKU** represents a specific, unique variant of the base product with its own:
- Unique SKU identifier (must be unique across the entire platform)
- Variant-specific attributes (color, size, and other options)
- Independent pricing
- Independent inventory quantity
- Variant-specific images (optional, supplements base product images)
- Availability status

**SKU Uniqueness:**
- Each combination of variant attributes creates a distinct SKU
- Example: A T-shirt product might have SKUs for "Red-Small", "Red-Medium", "Blue-Small", "Blue-Medium", etc.
- SKU identifiers can be auto-generated or manually specified by sellers

### 3.3 Variant Attribute Types

The system supports flexible variant attributes that can be defined per product:

**1. Color Variants:**
- Color name (e.g., "Navy Blue", "Forest Green")
- Optional color code (hex value for display purposes)
- Color swatch image (optional)

**2. Size Variants:**
- Size value (e.g., "Small", "Medium", "Large" or "38", "40", "42")
- Size category (e.g., "US Sizes", "EU Sizes", "One Size")
- Size chart reference (optional)

**3. Custom Option Variants:**
- Option name (e.g., "Storage Capacity", "Material Type", "Package Quantity")
- Option value (e.g., "128GB", "256GB" or "Cotton", "Polyester")
- Sellers can define product-specific custom options beyond standard color and size

**Variant Attribute Combinations:**
- Products can have any combination of variant types:
  - Color only (e.g., a lamp in different colors, all same size)
  - Size only (e.g., a plain white T-shirt in different sizes)
  - Color + Size (e.g., a shirt in multiple colors and sizes)
  - Color + Size + Custom Options (e.g., a phone in different colors, storage capacities, and carrier options)
  - Custom Options only (e.g., software licenses with different subscription periods)
  - No variants (single SKU product with no variations)

### 3.4 SKU Pricing

Each SKU maintains independent pricing:
- **Base price**: The standard selling price for this SKU
- **Sale price**: Optional discounted price (when set, overrides base price)
- **Cost price**: Seller's cost (for profit calculation, not visible to customers)
- **Currency**: Platform currency (e.g., USD)

Pricing can vary across SKUs of the same product, allowing:
- Higher prices for larger sizes
- Premium pricing for certain colors or materials
- Volume-based pricing for different package quantities

### 3.5 Variant Display and Selection

**Customer Product Browsing:**
- Customers see the base product with starting price (lowest SKU price)
- Product listing shows "from $X.XX" when SKU prices vary
- Main product image shows default variant or first available SKU

**Customer Variant Selection:**
- Customers select variant attributes sequentially (color → size → options)
- System shows availability and price updates as selections are made
- Out-of-stock combinations are clearly indicated
- Selected SKU's price, images, and stock status are displayed
- Only valid attribute combinations are selectable (no invalid SKU combinations)

## 4. Product Attributes and Metadata

### 4.1 Required Product Information

Every product must include:
- **Product name**: Clear, descriptive title (3-200 characters)
- **Category**: Assignment to a specific category
- **Description**: Detailed product description (minimum 50 characters, supports rich text formatting)
- **At least one SKU**: Products cannot exist without at least one purchasable SKU
- **At least one product image**: Minimum one image required for product listing

### 4.2 Optional Product Information

Products may include:
- **Brand name**: Manufacturer or brand identifier
- **Product specifications**: Technical details in key-value pairs (e.g., "Weight: 500g", "Dimensions: 10x20x5cm")
- **Tags**: Keywords for improved searchability (e.g., "waterproof", "eco-friendly", "bestseller")
- **Video URLs**: Product demonstration or review videos
- **Shipping information**: Weight, dimensions, special shipping requirements
- **Warranty information**: Warranty period and terms

### 4.3 Category-Specific Attributes

Based on the assigned category, products may have additional required or optional attributes:
- Electronics: Warranty period, brand, model number, technical specifications
- Clothing: Material composition, care instructions, country of origin
- Food: Expiration date, nutritional information, storage instructions
- Books: ISBN, author, publisher, publication date, page count

Sellers must provide all required category-specific attributes when listing products in those categories.

## 5. Inventory Management Requirements

### 5.1 Inventory Tracking Level

Inventory is tracked at the **SKU level**, meaning each unique product variant maintains its own independent stock quantity. This granular tracking ensures:
- Accurate availability for specific color/size/option combinations
- Prevention of overselling specific variants
- Clear visibility into which variants are low stock or out of stock
- Ability to fulfill orders precisely

### 5.2 Inventory Quantities

Each SKU maintains:
- **Available quantity**: Current stock available for purchase
- **Reserved quantity**: Stock allocated to pending orders (not yet shipped)
- **Total quantity**: Available + Reserved = Total inventory on hand

**Stock Calculations:**
- When a customer adds an item to cart: No inventory change (cart is not a commitment)
- When a customer places an order: Available quantity decreases, reserved quantity increases
- When an order is shipped: Reserved quantity decreases (total quantity decreases)
- When an order is cancelled: Reserved quantity decreases, available quantity increases

### 5.3 Stock Status

Each SKU has an automatic stock status based on available quantity:
- **In Stock**: Available quantity > 0
- **Low Stock**: Available quantity ≤ low stock threshold (configurable per SKU, default 10 units)
- **Out of Stock**: Available quantity = 0
- **Discontinued**: Product variant no longer available (manually set by seller)

### 5.4 Inventory Updates

**Seller Inventory Management:**
- Sellers can update available quantity for each SKU
- Sellers can view reserved quantity but cannot directly modify it
- Sellers can set low stock threshold per SKU for alert notifications
- Sellers can discontinue specific SKUs while keeping others active

**Automatic Inventory Adjustments:**
- Inventory decreases automatically when orders are placed
- Inventory restores automatically when orders are cancelled (before shipping)
- Inventory adjustments are logged with timestamp and reason for audit purposes

### 5.5 Inventory Alerts

**Low Stock Notifications:**
- Sellers receive notifications when SKU inventory falls below the low stock threshold
- Notifications include SKU identifier, current quantity, and restock recommendations
- Alerts are sent via email and visible in seller dashboard

**Out of Stock Handling:**
- Out-of-stock SKUs are clearly marked on product pages
- Customers cannot add out-of-stock SKUs to cart
- Product remains visible with "Out of Stock" indication
- Customers can optionally sign up for restock notifications

### 5.6 Inventory Synchronization

Inventory updates must be processed in real-time to prevent overselling:
- Multiple simultaneous purchases of the same SKU are handled with transaction-level locking
- Inventory checks occur at checkout to verify availability before order confirmation
- If inventory becomes insufficient during checkout, customer is notified immediately
- Cart items are re-validated against current inventory before order placement

## 6. Product Search and Filtering

### 6.1 Search Functionality

The platform provides comprehensive product search capabilities to help customers discover products quickly:

**Search Scope:**
- Product names
- Product descriptions
- Brand names
- Product tags
- SKU identifiers
- Category names

**Search Features:**
- **Keyword search**: Full-text search across product information
- **Auto-suggest**: Real-time search suggestions as customer types
- **Search highlighting**: Matched keywords highlighted in results
- **Fuzzy matching**: Tolerance for minor spelling errors
- **Multi-word search**: Support for phrases and multiple keywords

**Search Ranking:**
Search results are ranked by relevance:
1. Exact product name matches (highest priority)
2. Partial product name matches
3. Brand name matches
4. Description matches
5. Tag matches
6. Category matches (lowest priority)

Within same relevance level, products are further sorted by:
- Product popularity (sales volume)
- Seller rating
- Recently added products

### 6.2 Filtering Capabilities

Customers can refine search results and category browsing using multiple filters:

**Standard Filters (Available for All Products):**
- **Price range**: Minimum and maximum price bounds
- **Seller**: Filter by specific seller(s)
- **Availability**: In stock only, include out of stock
- **Rating**: Minimum product rating (1-5 stars)
- **Brand**: Filter by brand name(s)

**Variant Attribute Filters:**
- **Color**: Filter by available color variants
- **Size**: Filter by available size variants
- **Custom options**: Filter by custom variant attributes specific to product type

**Category-Specific Filters:**
- Dynamic filters based on category-specific attributes
- Example for Electronics: "Warranty Period", "Brand", "Screen Size"
- Example for Clothing: "Material", "Season", "Occasion"

**Filter Behavior:**
- Multiple filters can be applied simultaneously (AND logic within filter type, OR logic across selections within same filter)
- Filter options show count of matching products
- Applied filters are clearly displayed with ability to remove individual filters
- Filters update dynamically based on other applied filters (showing only relevant options)

### 6.3 Sorting Options

Customers can sort product listings by:
- **Relevance**: Best match to search query (default for search results)
- **Price: Low to High**: Ascending price order
- **Price: High to Low**: Descending price order
- **Newest First**: Recently added products first
- **Best Selling**: Products with highest sales volume
- **Top Rated**: Products with highest average ratings
- **Name: A to Z**: Alphabetical order by product name

Sorting is independent of filtering and can be changed without losing filter selections.

### 6.4 Search Performance

Product search and filtering must meet performance expectations:
- **Instant results**: Search results appear within 500 milliseconds for common queries
- **Auto-suggest speed**: Suggestions appear within 200 milliseconds of keystroke
- **Filter updates**: Filter application updates results within 300 milliseconds
- **Large catalogs**: Performance maintained for catalogs with 100,000+ products
- **Concurrent searches**: System handles multiple simultaneous search requests without degradation

## 7. Product Media Management

### 7.1 Product Images

**Image Requirements:**
- **Minimum**: At least 1 image required per product
- **Maximum**: Up to 10 images per product
- **Format**: JPEG, PNG, or WebP
- **Resolution**: Minimum 800x800 pixels, recommended 2000x2000 pixels for zoom functionality
- **File size**: Maximum 5MB per image
- **Aspect ratio**: Square (1:1) or rectangular (4:3, 16:9) accepted

**Image Types:**
- **Main product image**: Primary image shown in listings and search results (required)
- **Additional product images**: Gallery images showing different angles, details, lifestyle shots
- **Variant-specific images**: Optional images for specific SKUs (e.g., showing actual color variant)

**Image Ordering:**
- Sellers can set the order of product images
- First image is automatically the main product image
- Image order affects gallery display on product detail pages

**Image Display:**
- Product listings show main image with hover preview of second image
- Product detail pages show main image with thumbnail gallery
- Clicking images opens full-size view with zoom capability
- Variant selection updates main image to variant-specific image if available

### 7.2 Image Processing

**Automatic Image Processing:**
- System generates multiple sizes for responsive display:
  - Thumbnail (150x150): For cart, wishlist, order history
  - Medium (600x600): For product listings
  - Large (1200x1200): For product detail pages
  - Original: Stored for zoom and download
- Images are optimized for web delivery (compression without significant quality loss)

**Image Validation:**
- Uploaded images are validated for format, size, and content
- Explicit or inappropriate content detection (basic safety checks)
- Corrupted or invalid image files are rejected with clear error messages

### 7.3 Video Content

**Product Videos (Optional):**
- Sellers can add video URLs (YouTube, Vimeo) to product listings
- Maximum 3 video URLs per product
- Videos are embedded on product detail pages
- Video thumbnails appear in media gallery alongside images

## 8. Product Lifecycle and Status Management

### 8.1 Product Status States

Each product exists in one of the following states:

**1. Draft**
- Product is being created but not yet published
- Visible only to the seller who created it
- Not searchable or browsable by customers
- Can have incomplete information
- Sellers can edit freely without affecting live listings

**2. Active**
- Product is published and visible to customers
- Appears in search results and category browsing
- Customers can view, add to cart, and purchase (if SKUs are in stock)
- Requires all required information to be complete
- Sellers can edit, but changes are immediately live

**3. Inactive**
- Product is temporarily hidden from customers
- Not visible in search or browsing
- Existing cart items remain but cannot be purchased
- Sellers can reactivate at any time
- Used for seasonal products or temporary unavailability

**4. Discontinued**
- Product is permanently removed from active catalog
- Not visible to customers in search or browsing
- Previous purchases and reviews remain in order history
- Cannot be reactivated (permanent status)
- Used when product is no longer offered

### 8.2 Product Visibility Rules

**Customer Visibility:**
- Customers can only see products in "Active" status
- Products must have at least one SKU with available quantity > 0 to be purchasable
- Products with all SKUs out of stock remain visible but show "Out of Stock" status
- Inactive and discontinued products are hidden from all customer-facing views

**Seller Visibility:**
- Sellers see all their products regardless of status
- Status is clearly indicated in seller product management interface
- Sellers can filter their products by status
- Draft products show completion percentage and required fields

**Admin Visibility:**
- Admins can view all products across all sellers and statuses
- Admins can change product status (e.g., deactivate inappropriate products)
- Admins have override capabilities for moderation purposes

### 8.3 Product Activation Requirements

To transition from "Draft" to "Active", a product must satisfy:
- Product name is provided (3-200 characters)
- Category is assigned
- Description is provided (minimum 50 characters)
- At least one product image is uploaded
- At least one SKU exists with:
  - Valid variant attributes (if applicable)
  - Price is set (greater than zero)
  - SKU identifier is unique
- All required category-specific attributes are completed

Products failing validation cannot be activated and show specific error messages indicating missing requirements.

### 8.4 Product Status Transitions

**Draft → Active:**
- Seller initiates activation
- System validates all requirements
- If validation passes, product becomes visible to customers immediately
- If validation fails, specific errors are shown

**Active → Inactive:**
- Seller temporarily deactivates product
- Product is immediately hidden from customers
- No validation required
- Can be reversed at any time

**Active → Discontinued:**
- Seller permanently discontinues product
- Confirmation required (irreversible action)
- Product is removed from catalog
- Historical data (orders, reviews) is preserved

**Inactive → Active:**
- Seller reactivates product
- System re-validates product requirements
- If validation passes, product becomes visible again
- If requirements are no longer met, activation fails with errors

**Admin Status Override:**
- Admins can force any status transition for moderation purposes
- Admin actions are logged with reason
- Sellers are notified of admin-initiated status changes

## 9. Functional Requirements (EARS Format)

### 9.1 Product Creation and Management

**FR-PC-001**: WHEN a seller creates a new product, THE system SHALL initialize the product in "Draft" status.

**FR-PC-002**: THE system SHALL require product name, category, description, at least one image, and at least one SKU before allowing activation.

**FR-PC-003**: WHEN a seller uploads a product image, THE system SHALL validate the file format (JPEG, PNG, WebP), size (max 5MB), and minimum resolution (800x800 pixels).

**FR-PC-004**: IF an uploaded image fails validation, THEN THE system SHALL reject the upload and display a specific error message indicating the validation failure reason.

**FR-PC-005**: WHEN a seller assigns a product to a category, THE system SHALL display category-specific required attributes that must be completed.

**FR-PC-006**: THE system SHALL allow sellers to update product information for products in any status.

**FR-PC-007**: WHEN a seller updates an active product, THE system SHALL apply changes immediately without requiring re-approval.

**FR-PC-008**: THE system SHALL allow sellers to delete products only if they are in "Draft" status and have no associated orders.

**FR-PC-009**: WHEN a seller attempts to delete a product with existing orders, THE system SHALL prevent deletion and suggest discontinuation instead.

**FR-PC-010**: THE system SHALL auto-save draft products every 60 seconds to prevent data loss.

### 9.2 Category Management

**FR-CM-001**: THE system SHALL support hierarchical categories with unlimited depth levels.

**FR-CM-002**: WHEN an admin creates a category, THE system SHALL require a unique category name within the same parent level.

**FR-CM-003**: THE system SHALL allow each product to be assigned to exactly one category.

**FR-CM-004**: WHEN a category is deactivated, THE system SHALL hide all products in that category from customer view while maintaining product data.

**FR-CM-005**: THE system SHALL generate breadcrumb paths for each product based on its category hierarchy (e.g., "Electronics > Computers > Laptops").

**FR-CM-006**: WHEN a seller selects a category for their product, THE system SHALL display the full category path for clarity.

**FR-CM-007**: THE system SHALL allow admins to reorganize category hierarchies by changing parent category assignments.

**FR-CM-008**: WHEN a category is moved, THE system SHALL update breadcrumb paths for all affected products automatically.

### 9.3 SKU and Variant Management

**FR-SKU-001**: THE system SHALL require each SKU to have a unique identifier across the entire platform.

**FR-SKU-002**: WHEN a seller creates product variants, THE system SHALL generate unique SKUs for each combination of variant attributes.

**FR-SKU-003**: THE system SHALL allow sellers to define color variants with color name and optional hex color code.

**FR-SKU-004**: THE system SHALL allow sellers to define size variants with size value and optional size category.

**FR-SKU-005**: THE system SHALL allow sellers to define custom option variants with option name and value pairs.

**FR-SKU-006**: WHEN a seller creates a product with no variants, THE system SHALL create a single default SKU for that product.

**FR-SKU-007**: THE system SHALL require each SKU to have a base price greater than zero.

**FR-SKU-008**: THE system SHALL allow sellers to set an optional sale price for each SKU that overrides the base price.

**FR-SKU-009**: WHEN a customer views a product with multiple SKUs, THE system SHALL display the lowest available SKU price as "from $X.XX".

**FR-SKU-010**: WHEN a customer selects variant attributes, THE system SHALL show only valid attribute combinations that correspond to existing SKUs.

**FR-SKU-011**: WHEN a customer selects a complete SKU, THE system SHALL update the displayed price and stock status to that specific SKU.

**FR-SKU-012**: THE system SHALL allow sellers to discontinue individual SKUs without affecting other SKUs of the same product.

**FR-SKU-013**: IF all SKUs of a product are discontinued, THEN THE system SHALL automatically set the product status to "Discontinued".

### 9.4 Inventory Management

**FR-INV-001**: THE system SHALL track inventory quantity independently for each SKU.

**FR-INV-002**: WHEN a customer places an order, THE system SHALL decrease the available quantity and increase the reserved quantity for each ordered SKU.

**FR-INV-003**: WHEN an order is shipped, THE system SHALL decrease the reserved quantity for each shipped SKU.

**FR-INV-004**: WHEN an order is cancelled before shipping, THE system SHALL increase the available quantity and decrease the reserved quantity for each cancelled SKU.

**FR-INV-005**: THE system SHALL prevent customers from adding SKUs to cart when available quantity is zero.

**FR-INV-006**: WHEN available quantity reaches zero, THE system SHALL automatically set SKU status to "Out of Stock".

**FR-INV-007**: WHEN available quantity falls below the low stock threshold, THE system SHALL notify the seller via email and dashboard notification.

**FR-INV-008**: THE system SHALL allow sellers to set low stock threshold per SKU (default 10 units).

**FR-INV-009**: WHEN a seller updates SKU inventory quantity, THE system SHALL log the change with timestamp, previous quantity, new quantity, and seller identifier.

**FR-INV-010**: THE system SHALL validate inventory at checkout to ensure sufficient stock before confirming order placement.

**FR-INV-011**: IF inventory becomes insufficient during checkout, THEN THE system SHALL notify the customer and prevent order completion.

**FR-INV-012**: WHEN multiple customers attempt to purchase the same SKU simultaneously, THE system SHALL handle inventory decrements with transaction-level locking to prevent overselling.

**FR-INV-013**: THE system SHALL allow sellers to view current available quantity, reserved quantity, and total quantity for each SKU.

**FR-INV-014**: THE system SHALL prevent sellers from directly modifying reserved quantity (system-managed only).

### 9.5 Product Search and Discovery

**FR-SEARCH-001**: THE system SHALL provide full-text search across product names, descriptions, brands, tags, SKU identifiers, and category names.

**FR-SEARCH-002**: WHEN a customer types in the search box, THE system SHALL display auto-suggestions within 200 milliseconds.

**FR-SEARCH-003**: THE system SHALL return search results within 500 milliseconds for common queries.

**FR-SEARCH-004**: THE system SHALL rank search results by relevance (exact matches highest, then partial matches, then related content).

**FR-SEARCH-005**: WHEN search results have equal relevance, THE system SHALL further sort by product popularity, seller rating, and recency.

**FR-SEARCH-006**: THE system SHALL highlight matched search keywords in product names and descriptions in search results.

**FR-SEARCH-007**: THE system SHALL support fuzzy matching to tolerate minor spelling errors in search queries.

**FR-SEARCH-008**: THE system SHALL only return products with "Active" status in customer search results.

**FR-SEARCH-009**: THE system SHALL allow customers to search within specific categories.

**FR-SEARCH-010**: WHEN a search query returns no results, THE system SHALL suggest alternative search terms or popular products.

### 9.6 Product Filtering and Sorting

**FR-FILTER-001**: THE system SHALL allow customers to filter products by price range (minimum and maximum).

**FR-FILTER-002**: THE system SHALL allow customers to filter products by availability (in stock only, include out of stock).

**FR-FILTER-003**: THE system SHALL allow customers to filter products by seller.

**FR-FILTER-004**: THE system SHALL allow customers to filter products by brand.

**FR-FILTER-005**: THE system SHALL allow customers to filter products by minimum rating (1-5 stars).

**FR-FILTER-006**: THE system SHALL allow customers to filter products by available color variants.

**FR-FILTER-007**: THE system SHALL allow customers to filter products by available size variants.

**FR-FILTER-008**: THE system SHALL allow customers to filter products by category-specific attributes.

**FR-FILTER-009**: WHEN customers apply multiple filters, THE system SHALL combine filters using AND logic (all filters must match).

**FR-FILTER-010**: WHEN customers select multiple values within the same filter, THE system SHALL use OR logic (any value can match).

**FR-FILTER-011**: THE system SHALL update filter results within 300 milliseconds of filter application.

**FR-FILTER-012**: THE system SHALL display the count of matching products for each filter option.

**FR-FILTER-013**: THE system SHALL update available filter options dynamically based on currently applied filters.

**FR-FILTER-014**: THE system SHALL allow customers to clear individual filters or all filters at once.

**FR-FILTER-015**: THE system SHALL allow customers to sort products by relevance, price (ascending/descending), newest first, best selling, top rated, and alphabetical order.

**FR-FILTER-016**: THE system SHALL maintain applied filters when customers change sort order.

**FR-FILTER-017**: THE system SHALL maintain search performance with filters applied for catalogs with 100,000+ products.

### 9.7 Product Media Management

**FR-MEDIA-001**: THE system SHALL require at least one product image before product activation.

**FR-MEDIA-002**: THE system SHALL allow up to 10 images per product.

**FR-MEDIA-003**: WHEN a seller uploads an image, THE system SHALL automatically generate thumbnail (150x150), medium (600x600), and large (1200x1200) versions.

**FR-MEDIA-004**: THE system SHALL optimize uploaded images for web delivery while preserving visual quality.

**FR-MEDIA-005**: THE system SHALL validate image files for format (JPEG, PNG, WebP), size (max 5MB), and minimum resolution (800x800 pixels).

**FR-MEDIA-006**: THE system SHALL allow sellers to reorder product images by drag-and-drop or position numbering.

**FR-MEDIA-007**: WHEN a seller reorders images, THE system SHALL automatically update the main product image to the first image in the sequence.

**FR-MEDIA-008**: THE system SHALL allow sellers to assign specific images to specific SKUs for variant visualization.

**FR-MEDIA-009**: WHEN a customer selects a product variant, THE system SHALL display the variant-specific image if available, otherwise show the main product image.

**FR-MEDIA-010**: THE system SHALL allow sellers to add up to 3 video URLs (YouTube, Vimeo) per product.

**FR-MEDIA-011**: THE system SHALL embed product videos on product detail pages with playback controls.

**FR-MEDIA-012**: THE system SHALL validate video URLs for format and accessibility before accepting them.

**FR-MEDIA-013**: WHEN an image upload fails, THE system SHALL display a specific error message indicating the reason (format, size, resolution).

### 9.8 Product Status and Lifecycle

**FR-STATUS-001**: WHEN a seller creates a new product, THE system SHALL initialize it in "Draft" status.

**FR-STATUS-002**: THE system SHALL prevent product activation unless all required fields are completed (name, category, description, image, SKU).

**FR-STATUS-003**: WHEN a seller activates a product, THE system SHALL validate all requirements and display specific errors if validation fails.

**FR-STATUS-004**: WHEN a product transitions to "Active" status, THE system SHALL make it immediately visible in customer search and browsing.

**FR-STATUS-005**: WHEN a seller deactivates a product, THE system SHALL immediately hide it from customer view.

**FR-STATUS-006**: WHEN a seller marks a product as discontinued, THE system SHALL require confirmation and make the status change irreversible.

**FR-STATUS-007**: THE system SHALL allow sellers to reactivate inactive products if they still meet all activation requirements.

**FR-STATUS-008**: IF all SKUs of an active product are out of stock, THEN THE system SHALL keep the product visible but display "Out of Stock" status.

**FR-STATUS-009**: THE system SHALL allow admins to override product status for moderation purposes.

**FR-STATUS-010**: WHEN an admin changes product status, THE system SHALL log the action with admin identifier, timestamp, and reason.

**FR-STATUS-011**: WHEN an admin changes product status, THE system SHALL notify the seller via email and dashboard notification.

**FR-STATUS-012**: THE system SHALL prevent deletion of products with existing orders.

**FR-STATUS-013**: THE system SHALL allow deletion of draft products with no orders.

**FR-STATUS-014**: THE system SHALL preserve order history and reviews for discontinued products.

### 9.9 Product Display and Customer Interaction

**FR-DISPLAY-001**: WHEN a customer views a product listing, THE system SHALL display the main product image, product name, starting price, and average rating.

**FR-DISPLAY-002**: WHEN a customer hovers over a product in listings, THE system SHALL preview the second product image if available.

**FR-DISPLAY-003**: WHEN a customer clicks a product, THE system SHALL display the product detail page with full information, image gallery, description, specifications, variants, and reviews.

**FR-DISPLAY-004**: THE system SHALL display product breadcrumb navigation showing the category hierarchy path.

**FR-DISPLAY-005**: WHEN a product has multiple SKUs with different prices, THE system SHALL display "from $X.XX" where X.XX is the lowest SKU price.

**FR-DISPLAY-006**: WHEN a product has a single price across all SKUs, THE system SHALL display the exact price without "from" prefix.

**FR-DISPLAY-007**: THE system SHALL display stock status for the selected SKU ("In Stock", "Low Stock", "Out of Stock").

**FR-DISPLAY-008**: WHEN a SKU is out of stock, THE system SHALL disable the "Add to Cart" button and show "Out of Stock" message.

**FR-DISPLAY-009**: THE system SHALL allow customers to zoom product images by clicking or hovering.

**FR-DISPLAY-010**: THE system SHALL display seller name and seller rating on product detail pages.

**FR-DISPLAY-011**: THE system SHALL allow customers to navigate between product images using thumbnail gallery or arrow controls.

**FR-DISPLAY-012**: THE system SHALL display product tags as clickable links that show related products with the same tag.

**FR-DISPLAY-013**: WHEN a customer selects incomplete variant attributes, THE system SHALL show available options for the next attribute selection.

**FR-DISPLAY-014**: THE system SHALL display variant-specific price updates immediately when customers change variant selections.

### 9.10 Performance and Scalability

**FR-PERF-001**: THE system SHALL return product search results within 500 milliseconds for common queries.

**FR-PERF-002**: THE system SHALL display search auto-suggestions within 200 milliseconds of keystroke.

**FR-PERF-003**: THE system SHALL apply product filters and update results within 300 milliseconds.

**FR-PERF-004**: THE system SHALL load product detail pages within 1 second on standard broadband connections.

**FR-PERF-005**: THE system SHALL handle concurrent product searches from 1,000+ simultaneous users without performance degradation.

**FR-PERF-006**: THE system SHALL support product catalogs with 100,000+ products while maintaining search and filter performance.

**FR-PERF-007**: THE system SHALL handle concurrent inventory updates with transaction-level locking to prevent race conditions.

**FR-PERF-008**: THE system SHALL process image uploads and generate thumbnails within 5 seconds per image.

**FR-PERF-009**: THE system SHALL cache frequently accessed product data to reduce database load.

**FR-PERF-010**: THE system SHALL update product search indexes within 1 minute of product changes.

## 10. Integration Points with Other Systems

### 10.1 User Roles and Authentication
- Product management permissions are role-based (Seller, Admin)
- Sellers can only manage their own products
- Admins can manage all products across the platform
- Detailed role-based access control is defined in [User Roles and Authentication Document](./02-user-roles-authentication.md)

### 10.2 Shopping Cart and Wishlist
- Products and SKUs are referenced in shopping cart and wishlist functionality
- Inventory validation at cart and checkout ensures availability
- Cart items display current SKU pricing and stock status
- Detailed cart and wishlist functionality is defined in the Shopping Cart and Wishlist Document

### 10.3 Order Management
- Orders reference specific SKUs with quantity and price at time of purchase
- Inventory is reserved and decremented based on order placement and fulfillment
- Order management system triggers inventory updates
- Detailed order processes are defined in the Order Management Document

### 10.4 Reviews and Ratings
- Product reviews and ratings aggregate at the product level
- Customers can review products after purchase
- Review data influences search ranking and product display
- Detailed review functionality is defined in the Product Reviews and Ratings Document

### 10.5 Seller Management
- Sellers manage their product catalog through seller dashboard
- Inventory management and product analytics are provided to sellers
- Seller performance metrics include product listing quality
- Detailed seller capabilities are defined in the Seller Management Document

### 10.6 Admin Dashboard
- Admins have full visibility and control over all products
- Product moderation and status override capabilities
- Platform-wide product analytics and reporting
- Detailed admin functions are defined in the Admin Dashboard Document

## 11. Business Rules Summary

### Product Rules
- Products must have at least one SKU to be activated
- Products must belong to exactly one category
- Products must have at least one image
- Draft products can have incomplete information; active products cannot
- Discontinued products cannot be reactivated
- Products with existing orders cannot be deleted

### SKU Rules
- Each SKU must have a unique identifier across the platform
- SKU prices must be greater than zero
- Sale prices override base prices when set
- SKUs inherit category from parent product
- Discontinued SKUs cannot be purchased but remain visible in order history

### Inventory Rules
- Inventory is tracked independently per SKU
- Available quantity + reserved quantity = total quantity
- Customers cannot purchase SKUs with zero available quantity
- Multiple simultaneous purchases are handled with locking to prevent overselling
- Inventory updates are logged for audit purposes
- Low stock alerts trigger at configurable thresholds per SKU

### Category Rules
- Category names must be unique within the same parent level
- Categories can be nested to unlimited depth
- Deactivating a category hides all products in that category
- Moving categories updates breadcrumbs automatically for all affected products

### Media Rules
- Minimum 1 image, maximum 10 images per product
- First image is always the main product image
- Variant-specific images are optional
- Images must meet format, size, and resolution requirements
- Videos are supplementary and limited to 3 URLs per product

### Search and Discovery Rules
- Only active products appear in customer search results
- Search results rank by relevance first, then secondary factors
- Filters combine using AND logic across filter types
- Filters combine using OR logic within the same filter type
- Out-of-stock products remain visible unless explicitly filtered out

### Performance Requirements
- Search results within 500ms
- Auto-suggestions within 200ms
- Filter updates within 300ms
- Product pages load within 1 second
- Support for 100,000+ product catalogs
- Handle 1,000+ concurrent users without degradation

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-13  
**Target Audience**: Backend Development Team  
**Related Documents**: [Service Overview](./01-service-overview.md), [User Roles and Authentication](./02-user-roles-authentication.md)
