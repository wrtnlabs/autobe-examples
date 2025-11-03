## Product Management System Requirements

### Business Model & Context
The shopping mall platform serves as the central commerce hub where sellers list products, customers browse, and the system manages all product-related transactions. Product catalog completeness directly impacts conversion rates, average order value, and seller satisfaction metrics.

### User Actors & Permissions

#### Customer Actor
- Can view all product catalog entries
- Can filter products by category/price/color/size
- Can view product variants (colors/sizes)
- Cannot manage product catalog entries

#### Seller Actor
- SHALL create new products with catalog entry
- SHALL define product variants (color/size) as predefined options
- SHALL edit product descriptions and pricing
- SHALL track inventory per SKU
- SHALL view sales reports per product
- CANNOT modify other sellers' products

#### Admin Actor
- SHALL view all product catalog entries
- SHALL override inventory levels
- SHALL categorize products
- SHALL manage product approval workflow
- CANNOT directly edit seller-managed product data

##### Key Permission Differences:
| Function | Customer | Seller | Admin |
|----------|----------|--------|-------|
| Create Product | ❌ | ✅ | ❌ |
| Edit Product Variants | ❌ | ✅ | ✅ |
| View All Inventory | ❌ | ✅ (per SKU) | ✅ (global) |
| Approve Product Listings | ❌ | ❌ | ✅ |

### Product Catalog Structure

#### Core Requirements

> **WHEN** a seller submits a new product listing,
> **THE** system SHALL create a catalog category entry with the following structure:
>
> - Product title (max 100 characters)
> - Primary category (required)
> - Secondary categories (optional, max 3)
> - Product description (max 2000 characters)
> - Base price (USD, $9.99-$999.99)
> - Default image URL
> - Active status (default: pending)
>
> **IF** base price is outside range, THEN **THE** system SHALL reject the product with error 'PRICE_OUT_OF_RANGE'

#### Category Taxonomy

> **WHEN** a new product is created,
> **THE** system SHALL require assignment to at least one primary category
> **IF** primary category doesn't exist, THEN **THE** system SHALL create it
> **WHILE** managing categories, **THE** system SHALL enforce:
> - Maximum 3-level category hierarchy
> - All category names must be unique per level
> - Category descriptions are optional (max 200 characters)
>
> **MERMAID GRAPH**:
> graph LR
> A["Root Category"] --> B["Electronics"]
> A --> C["Fashion"]
> B --> D["Smartphones"]
> B --> E["Headphones"]
> C --> F["T-Shirts"]
> C --> G["Jeans"]
> D --> H["Phone Cases"]
> D --> I["Accessories"]

### Product Variants Management

#### Variant Definition Rules

> **WHEN** a seller adds a product,
> **THE** system SHALL allow defining variants with:
> - Predefined color options (up to 10 colors)
> - Predefined size options (up to 7 sizes)
> - Individual SKU code per variant (automatic format: COLOR-SIZE, e.g., 'BLUE-LARGE')
>
> **IF** no color/size options defined, THEN **THE** system SHALL treat product as single-variant
> **WHERE** the product has variants, **THE** system SHALL require:
> - Price adjustment per variant (±$5.00 max)
> - Separate image per variant
> - Unique variant-specific inventory tracking

#### Variant Example

> **WHEN** a seller creates a t-shirt product,
> **THE** system SHALL allow:
> - Color variants: 'Red', 'Blue', 'Green' (predefined choices)
> - Size variants: 'S', 'M', 'L', 'XL' (predefined choices)
> - SKU format: COLOR-SIZE (e.g., 'RED-S', 'BLUE-L')
> - Each SKU has separate price and inventory

### SKU Inventory Tracking

#### Inventory Management Requirements

> **WHEN** a customer selects a variant (e.g., 'RED-S') for purchase,
> **THE** system SHALL reduce the inventory count for that specific SKU by the purchase quantity
> **IF** the chosen SKU has zero inventory, THEN **THE** system SHALL display 'Out of Stock' and prevent checkout
> **WHEN** a seller edits a variant's inventory,
> **THE** system SHALL record the change with timestamp and user ID in audit log
> **WHERE** inventory levels drop below threshold (10 units), **THE** system SHALL send inventory alert to seller

#### Inventory Flow:
> **WHEN** order is confirmed,
> **THE** system SHALL immediately reserve stock
> **IF** payment fails within 15 minutes, THEN **THE** system SHALL release inventory reservation
> **WHILE** processing payment, **THE** system SHALL maintain inventory reservation status to prevent overselling

### Search & Filtering Requirements

#### Core Search Rules

> **WHEN** a user performs product search,
> **THE** system SHALL return results within 1.5 seconds for standard queries
> **WHILE** typing, **THE** system SHALL show live search suggestions
> **IF** search term is ambiguous, THEN **THE** system SHALL show results with best match
>
> **WHEN** filtering by category,
> **THE** system SHALL display products from all subcategories of selected category
> **WHERE** filtering by multiple tags, **THE** system SHALL return products matching ALL selected tags
>
> **WHEN** filtering by price range,
> **THE** system SHALL include products at exact price points of range boundaries

#### Search Examples

> **WHEN** user searches 'blue t-shirt',
> **THE** system SHALL prioritize:
> - Exact matches in title/description
> - Products with 'blue' in color variant
> - Products with 't-shirt' in category
> **WHERE** no exact match found,
> **THE** system SHALL suggest similar products

### Performance & Error Handling

#### Performance Requirements

> **WHEN** displaying category pages with 50-100 products,
> **THE** system SHALL load all items within 2.5 seconds
> **WHILE** viewing product details, **THE** system SHALL display variant selector within 0.8 seconds
> **IF** search function exceeds 2.5 seconds, THEN **THE** system SHALL show "Processing" status and continue without interruption

#### Critical Errors & Handling

> **IF** a variant SKU has inventory but display shows "Out of Stock",
> **THE** system SHALL require manual inventory reconciliation
> **IF** product image fails to load, THEN **THE** system SHALL display default fallback image within 2 seconds
> **IF** search fails due to system error, THEN **THE** system SHALL display "Search Temporarily Unavailable" with retry button within 3 seconds

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*