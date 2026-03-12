import { tags } from "typia";

import { IShoppingMallCategory } from "./IShoppingMallCategory";
import { IShoppingMallSeller } from "./IShoppingMallSeller";

export namespace IShoppingMallProduct {
  /**
   * Request parameters for filtering, sorting, and paginating product listings in the shopping mall platform. Supports text search, category filtering (including subcategories), price range filtering, stock availability check, and multiple sorting options (newest, price ascending, price descending). All parameters are optional to enable flexible product browsing for both authenticated customers and unauthenticated guests.
   */
  export type IRequest = {
    /**
     * Search text to filter products by name or description. Performs case-insensitive partial matching on both product name and description fields.
     *
     * @x-autobe-specification Text search parameter for product name and description fields. Implements partial match search using ILIKE on shopping_mall_products.name and shopping_mall_products.description columns. Example: 'laptop' matches 'Gaming Laptop Pro' and 'Laptop Stand'. Case-insensitive search for better user experience.
     */
    search?: string | undefined;

    /**
     * Filter products by category ID. When provided, returns products in the specified category. If the category has subcategories, products from subcategories are also included.
     *
     * @x-autobe-specification Category filter parameter. Filters products by shopping_mall_products.category_id. Supports hierarchical filtering: when a parent category ID is provided, include products from that category AND all its subcategories. Implementation: JOIN shopping_mall_categories with recursive CTE or subquery to find all descendant category IDs. Exclude soft-deleted categories (deleted_at IS NULL).
     */
    category_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Minimum price threshold for product filtering. Only products with base price greater than or equal to this value will be included in results.
     *
     * @x-autobe-specification Minimum price filter for shopping_mall_products.base_price. Uses >= operator. Can be used independently or combined with price_max for range filtering. Example: price_min=100 filters products with base_price >= 100. Decimal precision maintained for accurate price comparisons.
     */
    price_min?: number | undefined;

    /**
     * Maximum price threshold for product filtering. Only products with base price less than or equal to this value will be included in results.
     *
     * @x-autobe-specification Maximum price filter for shopping_mall_products.base_price. Uses <= operator. Can be used independently or combined with price_min for range filtering. Example: price_max=500 filters products with base_price <= 500. Decimal precision maintained for accurate price comparisons.
     */
    price_max?: number | undefined;

    /**
     * Filter products by stock availability. When set to true, only returns products that have at least one variant with available inventory (stock quantity greater than zero).
     *
     * @x-autobe-specification Boolean filter for product availability based on variant stock. When true, requires JOIN with shopping_mall_product_variants and checks EXISTS (SELECT 1 FROM shopping_mall_product_variants WHERE product_id = shopping_mall_products.id AND stock_quantity > 0). Product is considered in stock if at least one variant has stock_quantity > 0. When false or not provided, no stock filtering is applied.
     */
    in_stock?: boolean | undefined;

    /**
     * Sort order for product listing. Options: 'newest' (most recently added first), 'price_asc' (lowest price first), or 'price_desc' (highest price first).
     *
     * @x-autobe-specification Sorting parameter with three enum values:
     * - 'newest': ORDER BY shopping_mall_products.created_at DESC (most recently added first)
     * - 'price_asc': ORDER BY shopping_mall_products.base_price ASC (lowest price first)
     * - 'price_desc': ORDER BY shopping_mall_products.base_price DESC (highest price first)
     *
     * Default sort order is 'newest' when not specified. Secondary sort by id ASC for consistent ordering when primary sort values are equal.
     */
    sort?: "newest" | "price_asc" | "price_desc" | undefined;

    /**
     * Page number for pagination. 1-indexed, minimum value is 1. Use this along with 'limit' to navigate through paginated product results.
     *
     * @x-autobe-specification Page number for offset-based pagination. 1-indexed (first page is 1, not 0). Minimum value is 1. Used to calculate OFFSET in SQL query: OFFSET = (page - 1) * limit. Example: page=2 with limit=20 returns records 21-40. Default value is 1 when not provided.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of products per page. Range: 1-100, default is 20. Controls how many products are returned in each paginated response.
     *
     * @x-autobe-specification Number of records per page for pagination. Range: 1-100. Default value is 20 when not provided. Used as LIMIT clause in SQL query. Maximum enforced at 100 to prevent excessive database load. Combined with page parameter to implement offset-based pagination: LIMIT = min(limit, 100), OFFSET = (page - 1) * limit.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Lightweight product summary optimized for list displays in product browsing. Contains essential product information including name, price, category, seller details, main thumbnail image, and availability status. This summary type excludes detailed information like full image arrays, variant details, and reviews to keep responses small for efficient list rendering. Use the full product detail endpoint for complete product information.
   */
  export type ISummary = {
    /**
     * Unique identifier for the product.
     *
     * @x-autobe-specification Product unique identifier from shopping_mall_products.id. Primary key of the product entity, used to reference this product in orders, cart items, and other related entities.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Product name displayed to customers in browsing and search results.
     *
     * @x-autobe-specification Product name from shopping_mall_products.name. Display name shown in product listings, search results, and browsing interfaces.
     */
    name: string;

    /**
     * Product description providing details about features and specifications.
     *
     * @x-autobe-specification Product description from shopping_mall_products.description. Detailed text providing information about product features, specifications, and usage.
     */
    description: string;

    /**
     * Base price of the product before any variant-specific price adjustments.
     *
     * @x-autobe-specification Base price from shopping_mall_products.base_price. Default price before any variant-specific price overrides are applied.
     */
    basePrice: number;

    /**
     * Category this product belongs to, including category name and parent category if applicable.
     *
     * @x-autobe-specification Category information from shopping_mall_categories joined via products.category_id. Returns IShoppingMallCategory.ISummary with category name, description, and parent category if applicable.
     */
    category: IShoppingMallCategory.ISummary;

    /**
     * Seller who owns and manages this product, including shop name and seller details.
     *
     * @x-autobe-specification Seller information from shopping_mall_sellers joined via products.seller_id. Returns IShoppingMallSeller.ISummary with shop name, description, and seller details.
     */
    seller: IShoppingMallSeller.ISummary;

    /**
     * URL of the main product thumbnail image, or null if no images are available.
     *
     * @x-autobe-specification Computed from shopping_mall_product_images: SELECT image_url WHERE product_id = products.id AND display_order = 1. Returns NULL if no images exist. Main thumbnail image used in product listings.
     */
    imageUrl: (string & tags.Format<"url">) | null;

    /**
     * Boolean indicating whether this product is currently available for purchase (has at least one variant in stock).
     *
     * @x-autobe-specification Computed boolean: EXISTS (SELECT 1 FROM shopping_mall_product_variants WHERE product_id = products.id AND stock_quantity > 0). True if any variant has stock, false otherwise.
     */
    available: boolean;

    /**
     * Total number of product variants (different sizes, colors, options) available for this product.
     *
     * @x-autobe-specification Computed integer: COUNT(*) FROM shopping_mall_product_variants WHERE product_id = products.id. Total number of product variants (SKUs) available.
     */
    variantCount: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
