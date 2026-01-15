# Product Catalog Requirements

## Catalog Structure Overview

The product catalog serves as the central repository of all products available for sale on the shopping mall platform. It must support hierarchical organization, efficient searching, and flexible filtering to enable customers to discover products quickly and accurately.

The catalog is structured around three core components: categories, products, and product variants. Categories provide the organizational taxonomy, products represent individual items with their core attributes, and variants represent the specific SKUs of each product with unique combinations of attributes such as color, size, or material.

Products are organized in a hierarchical category tree that can extend to multiple levels. Each product belongs to exactly one primary category, though it may be associated with secondary categories for improved discoverability. Category navigation must support breadcrumb trails, side-by-side filtering, and deep linking.

Product visibility is governed by business rules that determine whether a product is visible to customers based on its status, inventory levels, and seller approval status.

## Category Hierarchy Requirements

### Category Structure Design

Categories must be arranged in a hierarchical tree structure with a minimum of two levels and support for up to five levels of nesting. The root level represents broad product domains, with deeper levels representing increasingly specific classifications.

- Each category must have a unique identifier
- Each category must have a display name in English
- Each category must have an optional description
- Each category must have an optional parent category reference
- Each category must have a display order number
- Each category must have a visibility flag

### Category Navigation Requirements

- THE system SHALL support expanding and collapsing category trees
- THE system SHALL display up to three levels of categories simultaneously on category pages
- WHEN a customer selects a category, THE system SHALL display all products in that category and its subcategories
- WHEN a customer navigates to a category page, THE system SHALL show a breadcrumb trail indicating their path from root to current category
- THE system SHALL display category names and icons on all category listing pages

### Business Rules for Categories

- IF a category has no active products in it or any of its subcategories, THEN THE system SHALL hide the category from customer view
- IF a category has at least one product that is active and in stock, THEN THE system SHALL display the category
- WHERE a category is marked as "hidden" by admin, THEN THE system SHALL NOT display it to customers
- WHERE a category ID is modified by admin, THEN THE system SHALL automatically redirect all existing category URLs to the new ID with HTTP 301 redirect
- WHILE a product is in draft status, THEN THE system SHALL NOT assign it to any customer-visible category
- THE system SHALL prevent creation of circular category relationships (category cannot be its own parent)

## Product Listing Requirements

### Product Core Attributes

- Each product SHALL have a unique product ID
- Each product SHALL have a display title
- Each product SHALL have an optional subtitle
- Each product SHALL have a detailed description in markdown format
- Each product SHALL have a primary image URL
- Each product SHALL have up to five additional gallery images
- Each product SHALL have a canonical URL path
- Each product SHALL belong to exactly one primary category
- Each product SHALL have optional secondary categories (up to three)
- Each product SHALL have a brand name
- Each product SHALL have an optional brand logo URL
- EACH product SHALL have a SKU count, representing the number of unique variants available
- Each product SHALL have a product status: "draft", "pending_approval", "approved", or "inactive"
- Each product SHALL have an optional meta title
- Each product SHALL have an optional meta description
- EACH product SHALL have a canonical product URL
- EACH product SHALL have creation and update timestamps
- EACH product SHALL have an active flag

### Product Availability Rules

- IF a product's status is "draft" or "inactive", THEN THE system SHALL NOT display the product in any catalog listings
- IF a product's status is "pending_approval", THEN THE system SHALL NOT display the product to customers
- IF a product's status is "approved", THEN THE system SHALL display the product only if at least one variant is in stock
- WHEN a product is marked as "inactive", THEN THE system SHALL immediately hide it from all customer-facing views
- WHILE a product is in "pending_approval" status, THEN THE system SHALL enable admins to review and approve/reject it

### Product Display Requirements

- THE system SHALL display products in list view with the following elements:
  - Thumbnail image
  - Product title
  - Brand name
  - Primary category
  - Price range (min to max variant price)
  - Average customer rating
  - Review count
  - Stock status indicator (in stock, low stock, out of stock)
- WHEN a product has multiple price variants, THE system SHALL display a price range (e.g., "$29.99 - $99.99")
- IF a product has no variants, THE system SHALL display a single price
- WHEN a product is out of stock, THE system SHALL display "Out of Stock" instead of a price
- IF multiple images are available, THE system SHALL show the first image as thumbnail and enable gallery view
- THE system SHALL display product tags for promoted, featured, or new items
- THE system SHALL display "New" badge if product was created within last 7 days
- THE system SHALL display "Best Seller" badge if product has sold at least 100 units in the last 30 days
- IF a product has the "out of stock" status, THE system SHALL show "Notify Me When Available" button

### Product Search Relevancy

- WHEN a customer performs a search, THE system SHALL rank results by weighted relevance score computed as:
  - 40% match in product title
  - 25% match in product description
  - 20% match in brand name
  - 15% match in category name
- WHERE a search term appears in the product title, THE system SHALL give it twice the weighting of the same term in description
- IF a search term matches exactly with product ID or SKU, THE system SHALL rank it as first result regardless of other criteria
- THE system SHALL apply fuzzy matching for typos with a maximum edit distance of 2
- WHEN a search yields no exact matches, THE system SHALL apply auto-correction suggestions ("Did you mean: ...")

## Search Functionality Requirements

### Search Input Requirements

- WHEN a user enters text in the search bar, THE system SHALL initiate search with no delay (real-time)
- THE system SHALL support queries of 1 to 100 characters
- THE system SHALL accept single words, phrases, and compound queries
- THE system SHALL ignore case, punctuation, and extra whitespace
- THE system SHALL not require quotation marks for phrase matching
- THE system SHALL support special characters used in product names (e.g., "iPhone 14 Pro Max")

### Search Output Requirements

- WHEN a search query returns more than 50 results, THE system SHALL paginate with 20 results per page
- WHEN a search returns fewer than 10 results, THE system SHALL display "No products found" message
- THE system SHALL return a maximum of 500 results during any single search
- THE system SHALL display the total result count above the product grid
- THE system SHALL highlight search terms in resulting product titles and descriptions
- WHEN a search query is empty or only consists of whitespace, THE system SHALL display recommended categories and featured products
- IF a search query matches only a category name, THE system SHALL redirect to that category page

### Search Behavior Rules

- WHILE typing, THE system SHALL trigger search after 300ms of user inactivity
- IF a user changes search term during an active request, THE system SHALL abort the previous request and initiate a new one
- WHEN search results load, THE system SHALL maintain scroll position of previous results
- THE system SHALL cache search results for 5 minutes to improve performance on repeated queries
- THE system SHALL limit search to products with status "approved" and at least one variant with inventory > 0

## Filter and Sort Requirements

### Filter System Design

The catalog filter system must allow customers to narrow down search results using dynamically generated filters based on available products in the current context.

### Dynamic Attribute Filtering

- WHEN a user navigates to a category or performs a search, THE system SHALL generate available filters based on:
  - Product variants (color, size, material, etc.)
  - Price ranges
  - Brand names
  - Customer ratings
- THE system SHALL filter out any attributes that have no matching products in the current result set
- WHERE a filter has zero matching products, THE system SHALL hide the filter option
- THE system SHALL display the number of matching products for each filter option

### Core Filter Types

1. **Price Filter**
   - THE system SHALL automatically calculate min and max price of current results
   - WHEN a price range is selected, THE system SHALL show products with at least one variant in that range
   - THE system SHALL allow range selection via slider or manual input
   - WHERE a product has a single price, THE system SHALL use that price in range calculations
   - WHERE a product has a price range, THE system SHALL use the min price for filtering

2. **Attribute Filters**
   - THE system SHALL group all unique variant attributes
   - Attributes include: color, size, material, style, pattern, gender, age group
   - EACH attribute must be marked as filterable in product configuration
   - THE system SHALL display filters as checkboxes with count indicators
   - WHEN multiple attributes are selected, THE system SHALL apply AND logic (product must match ALL selected attributes)
   - IF no products match the combined filters, THE system SHALL show "No products match your filters"

3. **Brand Filters**
   - THE system SHALL list all unique brand names from visible products
   - EACH brand must be displayed with a count of matching products
   - WHERE a brand has zero products visible, THE system SHALL hide it

4. **Rating Filters**
   - THE system SHALL offer rating filters: 4 stars and up, 3 stars and up
   - WHEN selected, THE system SHALL display products with average rating meeting the criteria
   - WHERE a product has no reviews, THE system SHALL exclude it from rating-based filters

### Sort Functionality

- THE system SHALL offer the following sort options:
  - "Featured" (products marked as featured by admin)
  - "Best Selling" (total units sold in last 30 days)
  - "Price: Low to High"
  - "Price: High to Low"
  - "Newest" (by creation date)
  - "Top Rated" (by average customer rating)
  - "Customer Reviews" (by total number of reviews)
- WHEN a sort option is selected, THE system SHALL re-sort the current result set
- WHERE multiple items have identical rank, THE system SHALL maintain original order for consistency
- THE system SHALL preserve sort preference per user session

## Product Visibility Rules

### Visibility Determination

A product is visible to customers only if ALL of the following conditions are met:

1. Product status is "approved"
2. Product active flag is true
3. Product has at least one variant with inventory > 0
4. Product primary category is visible to customers
5. Seller account is active and approved

### Visibility Exceptions

- IF a product is flagged by moderation system as potentially violating content policy, THEN THE system SHALL hide it from public view pending review
- When a product is out of stock, THE system SHALL still display it if "Notify Me When Available" feature is enabled, but shall mark it as "Out of Stock"
- WHERE an admin manually forces a product to be hidden, THEN THE system SHALL ignore all other conditions
- IF a customer has placed a pending order for a product, THE system SHALL continue to display it to that customer even if inventory drops to zero

### Category Visibility

- IF a category has no products (direct or indirect) with active inventory, THEN THE system SHALL hide it from navigation menus
- WHERE an admin explicitly marks a category as "hidden", THEN THE system SHALL ignore its product content and hide it
- THE system SHALL always show top-level categories in main navigation, even if they currently have no visible products
- WHEN a category becomes hidden due to zero inventory, THE system SHALL retain its path and redirects to avoid broken links

### Seller-Based Visibility

- IF a seller's account is suspended or terminated, THEN THE system SHALL immediately hide all products belonging to that seller
- IF a seller is in "pending_approval" status, THEN THE system SHALL hide all their products from catalog
- WHEN a seller removes a product from their catalog, THE system SHALL immediately remove it from public view

## Related Documents

- Refer to [User Actor Definitions](./01-user-actors.md) for actor permissions related to product management
- Refer to [Product Variants](./04-product-variants.md) for detailed SKU, attribute, and inventory tracking requirements
- Refer to [Shopping Cart](./05-shopping-cart.md) for product selection and cart addition workflows
- Refer to [Order Placement](./06-order-placement.md) for validation constraints when customers select products
- Refer to [Admin Dashboard](./11-admin-dashboard.md) for product approval and visibility controls

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*