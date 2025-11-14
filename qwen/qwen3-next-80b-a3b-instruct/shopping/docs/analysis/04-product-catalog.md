## Product Catalog System Requirements

### Product Discovery Flow

THE customer SHALL be able to navigate the product catalog through a hierarchical category structure, with direct access to featured, new, and trending products on the homepage.

WHEN a customer clicks on a category, THE system SHALL display all products assigned to that category and its subcategories, ordered by popularity by default.

WHILE browsing the product catalog, THE system SHALL persist the customer's current filtering and sorting state in browser storage, so that page refreshes or back navigation preserve their settings.

IF a customer accesses the product catalog via a deep link (e.g., search result or external promotion), THEN THE system SHALL load the exact filtered and sorted view specified in the URL parameters.

WHERE a customer has previously viewed a product, THE system SHALL highlight that product with a 'Recently Viewed' badge on product tiles within the catalog.

### Category Hierarchy

THE system SHALL support a multi-level category hierarchy with up to three tiers: Primary Category > Subcategory > Product Group.

A category SHALL be defined by a unique identifier, a human-readable name (localized to en-US), and an optional description.

A category SHALL have exactly one parent category, except for top-level categories which have no parent.

A product SHALL be assigned to at least one category and MAY be assigned to multiple categories simultaneously.

WHEN a category is deleted, THE system SHALL reassign all its products to its parent category, if one exists. If the category has no parent, the products shall remain assigned but marked as 'orphaned'.

A category SHALL be visible to customers only if it contains at least one active product with inventory greater than zero.

WHEN a category becomes empty (no active products with inventory), THEN THE system SHALL hide it from customer views but retain it in the system for seller access and historical tracking.

### Product Attribute System

A product SHALL be defined by a base entity holding common attributes, including title, description, images, brand, warranty period, and weight.

A product SHALL support up to 10 custom attributes that define variations, such as color, size, material, flavor, or gender.

THE system SHALL require at least three variable attributes to be defined for each product that supports variants (SKUs).

An attribute SHALL be defined by a unique name (e.g., 'color'), a display label (e.g., 'Color'), and a data type: text (freeform), select (dropdown), or range (numeric with min/max).

An attribute value SHALL be unique within the scope of its attribute name across all products.

WHEN a new product is created, THE system SHALL prompt the seller to select at least three available attribute templates from the platform-defined set, or define new ones if no suitable template exists.

THE system SHALL support the following predefined attribute templates: 
- Color (text/select): {"values": ["Red", "Blue", "Green", "Black", "White", "Silver", "Gold", "Purple", "Pink", "Orange"]}
- Size (select): {"values": ["XS", "S", "M", "L", "XL", "XXL", "30", "32", "34", "36", "38", "40"]}
- Material (text/select): {"values": ["Cotton", "Polyester", "Wool", "Silk", "Leather", "Denim", "Nylon", "Velvet", "Ceramic", "Glass"]}
- Capacity (range): {"min": 1, "max": 1000, "unit": "ml"}
- Age Range (select): {"values": ["Infant", "Toddler", "Child", "Teen", "Adult", "Senior"]}

### SKU Variant Management

A SKU (Stock Keeping Unit) SHALL be a distinct, purchasable variation of a product defined by the unique combination of its assigned attribute values.

Each SKU SHALL be a separate entity, not a field on the product entity, with its own:
- Unique identifier (SKU ID)
- Inventory count (minimum 0, no negative allowed)
- Price (optional override from base product price)
- Weight (optional override from base product weight)
- Status (active/inactive/deleted)
- Creation timestamp
- Last updated timestamp

WHEN a seller creates a product with attributes, THE system SHALL automatically generate all possible combinations of attribute values as SKUs, but set their initial inventory to zero and status to 'inactive'.

A SKU SHALL become active and visible to customers only when its inventory is set to a value greater than zero.

WHEN inventory for a SKU reaches zero, THE system SHALL automatically set its status to 'out of stock' and hide it from catalog search and category listings.

A modified SKU (e.g., updated price or inventory) SHALL not affect other SKUs for the same product.

WHEN a product's base price is changed, THE system SHALL NOT automatically update the prices of existing SKUs—only SKUs with null price inherit the product's base price.

WHEN a seller deletes a product, THE system SHALL mark all associated SKUs as 'deleted' but preserve their historical data for reporting and order reconciliation.

### Search and Filter Behavior

THE system SHALL support keyword search across product title, description, brand, and SKU attribute values.

Search shall support:
- Partial word matching (e.g., "phone" matches "smartphone", "cellphone")
- Typos tolerance (e.g., "smrtphn" still returns "smartphone" for specific typos)
- Accent-insensitive matching (e.g., "café" matches "cafe")
- Case-insensitive matching (e.g., "RED" matches "red")

WHEN a customer begins typing in the search bar, THE system SHALL return real-time autocomplete suggestions (up to 8 results) based on product title and brand.

A search result set SHALL include products whose base entity or associated SKUs match the query.

WHEN displaying search results, THE system SHALL sort by default by 'relevance' (determined by matching precision, product popularity, and seller rating).

THE system SHALL offer persistent filters on the left sidebar, including:
- Category (tree-view, multiple selection)
- Price range (slider from $0 to $5000)
- Availability ('In Stock' only toggle)
- Brand (multi-select list)
- Rating (1 star and up, 2 stars and up, etc.)
- Attributes (dynamic dropdowns based on products in current result set)

WHEN a filter is applied, THE system SHALL update the URL with query parameters and persist current filter state in browser storage.

WHEN a customer applies the 'Price' filter, THE system SHALL display only SKUs whose price (or product base price if no SKU selected) falls within the selected range.

WHEN a customer selects an attribute filter (e.g., 'Color: Blue'), THE system SHALL show only products that have at least one SKU with that attribute value.

A SKU that is out of stock (inventory=0) SHALL NOT appear in search results unless the customer enables 'Show Out of Stock Items' (which is disabled by default).

### Product Visibility Rules

A product SHALL be visible to customers only if it has at least one associated SKU with inventory > 0 and status = 'active'.

A product SHALL be hidden from the public catalog (but remain accessible to admin and seller) if:
- All its SKUs have inventory = 0
- All its SKUs have status = 'inactive'
- The product itself has status = 'hidden'

A seller SHALL be able to manually set a product's status to 'hidden' regardless of inventory levels.

WHEN a product is set to 'hidden', THE system SHALL immediately remove all its SKUs from customer-facing interfaces, including search, category views, and wishlists.

IF a product is hidden, THEN THE system SHALL still allow the seller to edit its details, add new SKUs, and reactivate it.

A product's visibility status SHALL NOT be affected by seller suspension or termination.

### Stock Notification Requirements

WHEN a customer adds an out-of-stock product (or SKU) to their wishlist, THE system SHALL subscribe them to automated notifications for that item.

WHEN inventory for a specific SKU increases from zero to any positive number, THEN THE system SHALL send an email and in-app notification to all customers who have that SKU on their wishlist.

The notification SHALL include:
- Product title and image
- SKU details (e.g., size, color)
- Direct link to the product page
- Expected restock date (if provided by seller)
- One-click 'Buy Now' button

A customer SHALL be able to unsubscribe from restock notifications for a specific item at any time.

WHEN inventory for a SKU drops from above zero to zero, THE system SHALL display a ' Out of Stock (Notify Me)' button on the product page and SKU variant selector.

THE system SHALL allow sellers to enable/disable automatic restock notifications for products under their account.

ALL restock notifications SHALL include an unsubscribe link compliant with global email legislation (CAN-SPAM/GDPR).