import { tags } from "typia";

export namespace IEcommerceMallSearch {
  /**
   * Request body for unified platform search across products, categories, and sellers. Enables authenticated customers to search the entire platform using text query with trigram similarity matching. Supports filtering by category, price range, stock availability, and seller approval status. Results are paginated with configurable sorting options.
   */
  export type IRequest = {
    /**
     * Search query string for text matching across product names, descriptions, seller shop names, and category names. Supports partial matching using trigram similarity.
     *
     * @x-autobe-specification Required search query string. Trigram matching applied on product.name, product.description, seller.shop_name, category.name columns. Min length 1, max length 255 characters.
     */
    query: string & tags.MinLength<1> & tags.MaxLength<255>;

    /**
     * Filter results by category ID. If provided, only products in this category (or its subcategories if parent_id is used) will be included. Null or omitted to include all categories.
     *
     * @x-autobe-specification Optional category filter. If provided, JOIN with ecommerce_mall_categories and filter products by category_id or parent_id for subcategory inclusion. Accepts UUID string or null.
     */
    category_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Minimum price filter for products. Only products with base_price or variant.price >= this value will be included. Null or omitted for no minimum.
     *
     * @x-autobe-specification Optional minimum price filter. Filter products where base_price >= min_price OR any variant.price >= min_price. Accepts number >= 0 or null.
     */
    min_price?: (number & tags.Minimum<0>) | null | undefined;

    /**
     * Maximum price filter for products. Only products with base_price or variant.price <= this value will be included. Null or omitted for no maximum.
     *
     * @x-autobe-specification Optional maximum price filter. Filter products where base_price <= max_price OR any variant.price <= max_price. Accepts number >= 0 or null.
     */
    max_price?: (number & tags.Minimum<0>) | null | undefined;

    /**
     * Filter for in-stock products only. If true, only products with at least one variant having stock_quantity > 0 will be included. Null or omitted to include all products regardless of stock.
     *
     * @x-autobe-specification Optional stock filter. If true, JOIN with ecommerce_mall_product_variants and filter where stock_quantity > 0. Accepts boolean or null.
     */
    in_stock?: boolean | null | undefined;

    /**
     * Filter results by seller approval status. Only products from sellers with this approval status will be included. Null or omitted to include all sellers.
     *
     * @x-autobe-specification Optional seller approval status filter. JOIN with ecommerce_mall_sellers and filter by approval_status IN ('pending', 'approved', 'rejected'). Accepts enum value or null.
     */
    seller_approval_status?:
      | "pending"
      | "approved"
      | "rejected"
      | null
      | undefined;

    /**
     * Field to sort results by. 'relevance' sorts by trigram match quality, 'price' by product price, 'created_at' by creation date, 'name' by product/seller/category name.
     *
     * @x-autobe-specification Sort field selector. 'relevance' orders by trigram match score DESC, 'price' by base_price ASC/DESC, 'created_at' by product.created_at ASC/DESC, 'name' by product.name ASC/DESC. Accepts enum value.
     */
    sort_by?: "relevance" | "price" | "created_at" | "name" | undefined;

    /**
     * Sort direction. 'asc' for ascending order, 'desc' for descending order.
     *
     * @x-autobe-specification Sort direction selector. 'asc' for ascending order, 'desc' for descending order. Works with sort_by parameter. Accepts enum value.
     */
    sort_order?: "asc" | "desc" | undefined;

    /**
     * Page number for pagination. Must be 1 or greater. Default is 1 (first page).
     *
     * @x-autobe-specification Page number for pagination (1-indexed). Default 1. Minimum 1. Used with limit for cursor-based pagination using created_at and id.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Number of results per page. Must be between 1 and 100. Default is 20.
     *
     * @x-autobe-specification Results per page limit. Minimum 1, maximum 100. Default 20. Used with page for cursor-based pagination. Enforced server-side.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;
  };
}
