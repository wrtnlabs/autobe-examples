import { tags } from "typia";

export namespace IShoppingMallCatalogSearch {
  /**
   * Request DTO for performing an advanced, multi-dimensional catalog search
   * over shoppingMall products.
   *
   * This structure captures free-text keywords, filter constraints, and
   * pagination/sorting instructions used by the /shoppingMall/catalog/search
   * endpoint to build SQL queries over products, SKUs, categories, brands,
   * visibility configuration, and compliance metadata.
   *
   * It is designed to power search boxes, category pages, and complex filter
   * panels while keeping the wire format explicit and cache-friendly.
   */
  export type IRequest = {
    /**
     * Free-text search keyword used to match products by name, description,
     * brand, or other indexed text fields.
     *
     * When null, the search behaves like a pure filter-based catalog browse
     * without keyword matching.
     */
    keyword?: string | null | undefined;

    /**
     * Optional list of category codes restricting results to products that
     * are assigned to at least one of the specified categories.
     *
     * Codes typically correspond to shopping_mall_categories.code values.
     * When null, no explicit category filter is applied.
     */
    category_codes?: string[] | null | undefined;

    /**
     * Optional list of brand identifiers limiting results to products
     * associated with one of the given brands.
     *
     * Each value usually corresponds to shopping_mall_brands.id. When null,
     * brand is not used as a filtering dimension.
     */
    brand_ids?: (string & tags.Format<"uuid">)[] | null | undefined;

    /**
     * Lower bound for product pricing in the search results.
     *
     * Represents the minimum allowed effective price (for example, across
     * SKUs) for a product to be included in the result set. Nullable to
     * omit a lower price constraint, in which case only other filters
     * determine the minimum price boundary.
     */
    min_price?: number | null | undefined;

    /**
     * Upper bound for product pricing in the search results.
     *
     * Represents the maximum allowed effective price for a product to be
     * included in the result set. Nullable to omit an upper price
     * constraint so that high-priced products are only excluded by other
     * filters.
     */
    max_price?: number | null | undefined;

    /**
     * When true, limits results to products that have at least one SKU
     * currently available in inventory.
     *
     * When false or null, out-of-stock products may still appear depending
     * on other visibility rules and business decisions (for example,
     * allowing backorderable items to remain visible).
     */
    in_stock_only?: boolean | null | undefined;

    /**
     * Region or market code representing the shopper’s context.
     *
     * Used to enforce region-specific visibility, shipping availability,
     * and compliance restrictions (for example, hiding products not allowed
     * in a specific country or jurisdiction). Nullable to use platform
     * default behavior derived from the request context.
     */
    region_code?: string | null | undefined;

    /**
     * Sort key applied to the search results.
     *
     * Typical values include semantic options such as "relevance",
     * "createdAt", "priceAsc", "priceDesc", or "ratingDesc". When null, the
     * backend applies its default relevance-based ordering appropriate for
     * the given query and storefront.
     */
    sort_by?: string | null | undefined;

    /**
     * 1-based page index indicating which page of search results to return.
     *
     * A value of 1 refers to the first page. Values less than 1 are
     * rejected by validation. If the requested page is greater than the
     * total number of available pages for the current criteria, the backend
     * typically returns an empty `data` array while preserving accurate
     * pagination metadata so clients can gracefully handle the end of the
     * result set.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Maximum number of search result items to return in a single page.
     *
     * Must be a positive integer. The backend may enforce a sensible upper
     * bound (for example, a few hundred items) and clamp excessively large
     * client-provided values down to that maximum to protect performance.
     * Clients should choose limits that balance UX needs (fewer page
     * transitions) with response size and latency considerations.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1>;
  };
}
