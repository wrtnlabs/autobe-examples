# Product Concept

THE shoppingMall system SHALL enable customers to discover, compare, and purchase physical goods through a structured digital catalog. Each product represents a tangible item available for sale, with unique identifying attributes and associated inventory. Products are not abstract services but concrete items with measurable physical characteristics such as weight, dimensions, or material composition.

## Category Hierarchy

WHEN a seller lists a new product, THE system SHALL assign it to exactly one primary category that exists in a predefined hierarchical taxonomy. The category structure SHALL support at least three nested levels to enable granular product organization. The category tree SHALL be maintained by administrative staff and SHALL be consistent across all user interfaces.

WHILE browsing the catalog, THE system SHALL display categories in a collapsible tree navigation structure with the following hierarchy example: "Electronics > Phones > Smartphones". Subcategories SHALL only be visible when their parent category is expanded. A product SHALL NOT be assigned to multiple categories simultaneously; a single product SHALL belong to exactly one leaf-node category.

THE system SHALL support category-level metadata for each node, including a display name, description, and representative icon. Category names SHALL be human-readable and written in clear, non-technical language suitable for general consumers.

## Variant Management

WHEN a product has multiple variations, THE system SHALL represent each variation as a unique SKU (Stock Keeping Unit). Each SKU SHALL be a distinct entity within the system and SHALL have a globally unique identifier that differentiates it from all other SKUs across all products. Each SKU SHALL be defined by a specific combination of variant attributes.

THE system SHALL allow sellers to define variant attributes such as color, size, material, storage capacity, or configuration. Each variant attribute SHALL have a defined set of valid values (e.g., color: ["Red", "Blue", "Black"], size: ["S", "M", "L", "XL"]). A product SHALL support any number of variant attributes, but each attribute SHALL be used consistently across all products in the same category.

WHEN a product has multiple variants, THE system SHALL generate a unique SKU by combining all defined variant attribute values in a deterministic sequence (e.g., "iphone-15-pro-256gb-black"). All SKUs SHALL be immutable once created and SHALL not be reused for different products or combinations.

THE system SHALL require every product with variants to have at least one SKU defined. A product SHALL NOT be listed for sale unless it has at least one active SKU with available inventory.

## Search and Filtering

WHEN a customer enters search terms in the navigation bar, THE system SHALL return products whose name, brand name, or primary category matches the query including partial matches, typo tolerance, and natural language understanding.

THE system SHALL support exact-match, prefix-match, and fuzzy-match search modes simultaneously, automatically adjusting results based on query length and character accuracy. For example, searching for "iph" SHALL return all products with "iPhone", "iPhon", or "iPh" in their name.

WHEN executing a search, THE system SHALL allow filtering by the following dimensions:

- Category (selected from the hierarchical tree)
- Brand (extracted from product metadata)
- Price range (min and max values)
- Product ratings (minimum average score, e.g., 4 stars and above)
- Available colors or sizes (selected from variant attributes)

Each filter SHALL be applied as a cumulative condition. Filtering by multiple attributes SHALL return only products that satisfy ALL selected conditions simultaneously.

WHEN no search term is entered, THE system SHALL display a default homepage featured product collection and popular categories. When any filter is active, the visual display SHALL indicate currently active filters with an option to clear them.

## Product Display Rules

WHEN a product details page is loading, THE system SHALL display for each product: product name, brand, primary category path, manufacturer, images (at least three high-resolution views), and a descriptive summary of features.

THE system SHALL display product pricing information as a range when multiple SKUs exist, with the format "From $XX.XX". When a product has only one SKU, THE system SHALL display the exact price without a range.

WHEN a product has variants, THE system SHALL render an interactive selector UI for variant attributes immediately beneath the product image. The UI SHALL display all possible values for each attribute as selectable options, with incompatible combinations visually disabled (e.g., if "Red" size "XL" is not available, the option SHALL be grayed out and unselectable instead of being completely disabled).

ALL product descriptions SHALL be written in full sentences using professional English. No markdown, HTML, or rich text formatting SHALL be allowed in product title or description fields.

## Inventory Display Logic

WHEN a product is displayed in search results, category listings, or homepage feeds, THE system SHALL display the available inventory status of its most popular or lowest-price SKU if multiple exist.

WHEN a product has multiple SKUs, THE system SHALL show a combined inventory status based on the total across all SKUs, with a nuanced display:

- If all SKUs have inventory ≤ 5 units total: "Only 5 left!"
- If any SKU has inventory ≤ 5 units: "Low stock alert"
- If any SKU has exactly 0 units but others have inventory: "Some sizes/colors unavailable"
- If all SKUs have inventory > 5: "In stock"

WHEN viewing a product's variants directly, THE system SHALL display inventory status for each SKU independently with exact count visible.

## OutOfStock Behavior

IF a product's SKU is out of stock (inventory = 0), THE system SHALL prevent users from adding that specific SKU to their cart. The add-to-cart button for that SKU SHALL be disabled with a tooltip reading: "Currently out of stock."

IF a product's main display trait shows an "In stock" status but one specific variant is out of stock, THE system SHALL allow customers to select other available variants. Inventory indicators SHALL be updated dynamically when a variant is selected.

IF a customer attempts to purchase a product that has become out of stock between viewing the product and completing checkout, THE system SHALL interrupt the checkout process, display a clear warning: "The selected item has sold out. Please choose another option or remove from cart.", and offer to remove the item automatically or let the customer proceed without it.

IF ANY product becomes permanently unavailable (discontinued or delisted), THE system SHALL display a "Product discontinued" banner on its details page and redirect search results to similar products with mass recommendations.

IF a seller updates inventory levels for a SKU, THE system SHALL update the inventory display for that SKU across all locations (search results, category pages, product pages) within 2 seconds of the update.

IF a customer selects a variant that has insufficient inventory for their requested quantity, THE system SHALL show a notification: "Only X of this variant are available. Adjust your quantity or choose another option."

THE system SHALL not display "out of stock" status on any product unless the inventory count for every associated SKU is zero. A product with at least one SKU in stock SHALL always be listed as available for purchase.