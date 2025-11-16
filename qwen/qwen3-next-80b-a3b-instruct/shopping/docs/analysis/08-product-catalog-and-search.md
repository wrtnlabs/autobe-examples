## Product Catalog and Search Requirements

### Product Categories and Hierarchy

THE shoppingMall platform SHALL organize products into a hierarchical category structure supporting up to three levels of nesting. Categories represent logical groupings of products based on business domains and customer browsing behavior.

WHEN a product is created by a seller, THE system SHALL require the assignment of at least one primary category from the approved category tree. THE system SHALL prevent sellers from creating new top-level categories; only admins can create or modify the category hierarchy.

WHILE a customer browses the catalog, THE system SHALL display categories in a collapsible tree structure with at most three levels visible at once. Subcategories SHALL be loaded dynamically on user interaction to improve performance.

IF a category contains no active products, THE system SHALL still display the category but indicate "No products available" in its listing.

WHERE a product is assigned to multiple categories, THE system SHALL display it in each category's listing while maintaining a single product record.

### Product Attributes

THE shoppingMall platform SHALL capture the following mandatory product attributes for every product listing:

- Product name (minimum 3 characters, maximum 200 characters)
- Product description (minimum 10 characters, maximum 2,000 characters)
- Product image (at least one image, maximum 5 images; each image URL must be HTTPS and point to a valid image file)
- Base price (positive number with exactly two decimal places, minimum $0.01)
- Product status (active/inactive; default: active)
- SKU prefix (automatically generated based on category path and seller ID)
- Created timestamp (ISO 8601 format, automatically set at creation)
- Last updated timestamp (ISO 8601 format, updated on every modification)

WHEN a product is edited, THE system SHALL validate that the product name remains unique within the seller's product portfolio. Multiple sellers may list products with identical names, but within a single seller's catalog, product names must be unique.

IF the product description contains profanity or offensive terms as defined by the system's moderation dictionary, THE system SHALL reject the update and return an error message: "Product description contains restricted content."

### Product Variants (SKU) Definition

THE shoppingMall platform SHALL model products with multiple physical variants using Stock Keeping Units (SKUs). Each SKU represents a distinct combination of product attributes that can be manufactured, stocked, and shipped separately.

WHEN a seller creates a product listing, THE system SHALL allow the seller to define between 1 and 20 SKU variants based on the following attribute combinations:
- Color (up to 10 color options)
- Size (up to 8 size options)
- Material (up to 5 material options)
- Additional option set (up to 2 custom option sets with up to 10 values each)

WHEN a SKU variant is created, THE system SHALL generate a unique SKU code following the pattern: {SKU_PREFIX}-{COLOR_CODE}-{SIZE_CODE}-{MATERIAL_CODE}-{OPTION_CODE}. Where each code is a 3-character alphanumeric identifier.

THE system SHALL require that each SKU variant must have:
- A unique SKU code
- A distinct price (can be same as base price, but must be specified)
- A distinct inventory count (integer, minimum 0)
- A distinct image (optional; if not provided, use the primary product image)
- A distinct availability status (in-stock/out-of-stock)

IF a SKU variant's inventory count is set to 0, THE system SHALL automatically mark it as "out-of-stock".

WHILE an order is being processed, THE system SHALL validate that the requested SKU quantity does not exceed the available inventory for that specific SKU. If inventory is insufficient, THE system SHALL block checkout and return error: "Insufficient stock for selected variant."

### Search Functionality Requirements

WHEN a customer enters search terms in the global search bar, THE system SHALL execute a full-text search across the following product fields:
- Product name
- Product description
- Category names (including parent and child categories)
- SKU variants (SKU code and attribute values)

THE system SHALL implement partial match search, meaning a search for "red" SHALL return products with names or descriptions containing "red", "reddish", "yellowred", etc.

THE system SHALL support phrase search using double quotes, so a search for "blue jeans" SHALL only return products containing that exact phrase.

WHEN a customer uses the search function, THE system SHALL prioritize results based on:
1. Exact match in product name
2. Partial match in product name
3. Exact match in product description
4. Partial match in product description
5. Match in category name
6. Match in SKU variant attributes

IF no products match the search query, THE system SHALL display a message: "No products found matching \"{search_term}\". Try searching for something else."

WHERE a product search term contains typos that are common (e.g., "womens" instead of "women", "shose" instead of "shoes"), THE system SHALL automatically suggest corrected terms with: "Did you mean: {suggested_term}?"

### Filtering Options

WHEN a product category page is loaded or after a search is performed, THE system SHALL display the following filtering controls:

- Price range slider (minimum: $0.00, maximum: $10,000.00)
- Available colors (checkboxes for each color present in active SKUs)
- Available sizes (checkboxes for each size present in active SKUs)
- Available materials (checkboxes for each material present in active SKUs)
- Customer ratings (checkboxes for 1 star, 2 stars, 3 stars, 4 stars, 5 stars)
- Brand filtering (when products are attributed to branded sellers)

WHEN a filter is applied, THE system SHALL update the product results immediately without page reload.

IF a customer selects a color filter but no products with that color are available in the current category or search result, THE system SHALL disable that color checkbox and display: "No products available in this color."

WHILE filters are active, THE system SHALL show applied filters as removable tags above the product list.

WHERE a product has multiple variants, THE system SHALL filter products based on the availability of any active SKU variant matching the filter condition.

### Sorting Options

WHEN a customer views product listings (category or search result), THE system SHALL offer the following sorting options:

- Price: Low to High
- Price: High to Low
- Popularity (descending by number of units sold in the last 30 days)
- New Arrivals (descending by product creation date)
- Customer Rating (descending by average rating)

WHEN a sorting option is selected, THE system SHALL apply sorting across all visible product results immediately.

IF a customer selects "Popularity" sorting but no sales data exists for any products, THE system SHALL revert to "New Arrivals" sorting and display: "No sales data available - showing newest products instead."

WHEN a customer changes the sorting option, THE system SHALL preserve all active filters.

### Product Display Rules

THE system SHALL display products in a grid layout of 20 items per page.

WHEN a product has no inventory in any of its SKU variants, THE system SHALL display the product with a "Sold Out" badge and disable the "Add to Cart" button.

WHEN a product has at least one SKU variant in stock, THE system SHALL display the lowest available price for any variant.

WHEN a product uses SKU variants, THE system SHALL display the total number of available variants in the product listing as: "{n} variants available."

IF a product has been reviewed by at least 3 customers, THE system SHALL display its average rating as stars (e.g., ★★★★☆) and the number of reviews next to it in the listing.

WHILE a customer is browsing product lists, THE system SHALL load additional products automatically via scroll (infinite scroll) when the user reaches the bottom of the current page.

THE system SHALL cache product listings for 5 minutes for anonymous users and 1 minute for authenticated users to improve performance during repeated searches or category navigation.

THE system SHALL serve product images via a CDN with lazy loading to optimize page load speed.

WHERE a product is categorized under multiple parent categories, THE system SHALL display the primary category as the main category for listing purposes but retain all category assignments for search and filtering.