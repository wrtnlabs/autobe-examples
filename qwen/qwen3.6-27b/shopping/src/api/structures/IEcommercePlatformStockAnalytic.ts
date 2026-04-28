import { tags } from "typia";

export namespace IEcommercePlatformStockAnalytic {
  /**
   * Current stock levels for product variants, aggregating data from the product inventory system.
   *
   * Provides the real-time availability status, computed from the immutable inventory ledger. Includes variant details, product information, seller shop identification, and category assignment. The current stock quantity is calculated from all inventory events (restocking, order fulfillment, cancellations, refunds). Only active (non-deleted) variants and products are included.
   *
   * This type does not map to a single database table but represents cross-table joins with aggregation from:
   *
   * - ecommerce_platform_product_variants
   * - ecommerce_platform_products
   * - ecommerce_platform_seller_profiles
   * - ecommerce_platform_categories
   * - ecommerce_platform_inventory_records
   */
  export type ISummary = {
    /**
     * Unique identifier for the product variant.
     *
     * This field identifies the specific variant configuration being tracked in this stock analytic summary. Serves as the primary key reference to the variant in the ecommerce_platform_product_variants table.
     *
         * @x-autobe-specification Direct mapping from
         *   ecommerce_platform_product_variants.id. This is the variant's
         *   primary key UUID that serves as the anchor for all other joined
         *   data in this aggregation.
     */
    variantId: string & tags.Format<"uuid">;

    /**
     * The Stock Keeping Unit (SKU) code.
     *
     * Uniquely identifies this variant within its product scope. Used for tracking specific variant options.
     *
         * @x-autobe-specification Direct mapping from
         *   ecommerce_platform_product_variants.sku_code.
     */
    skuCode: string;

    /**
     * The variant-specific price when present.
     *
     * When set, overrides the product base price for this specific variant. Represents the selling price of this variant (e.g., specific color, size). When null, the product's base_price applies as the default.
     *
         * @x-autobe-specification Direct mapping from
         *   ecommerce_platform_product_variants.price. Nullable — when null,
         *   the product base_price applies instead.
     */
    variantPrice: number | null;

    /**
     * Unique identifier for the product.
     *
     * References the parent product that this variant belongs to, enabling traceability back to the product level.
     *
         * @x-autobe-specification Direct mapping from
         *   ecommerce_platform_products.id. Joined from
         *   variant.ecommerce_platform_product_id = product.id.
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Display name of the product.
     *
     * Appears in search results, category listings, and product detail pages. The primary human-readable identifier for the product.
     *
         * @x-autobe-specification Direct mapping from
         *   ecommerce_platform_products.name. Joined from product.id =
         *   variant.ecommerce_platform_product_id.
     */
    productName: string;

    /**
     * The base price for the product.
     *
     * Default price for variants when no variant-specific price is set. Individual variant-specific price overrides this value when stored in variantPrice.
     *
         * @x-autobe-specification Direct mapping from
         *   ecommerce_platform_products.base_price. Joined from product.id =
         *   variant.ecommerce_platform_product_id.
     */
    productBasePrice: number;

    /**
     * Unique identifier for the seller profile.
     *
     * References the seller's business profile that owns this product.
     *
         * @x-autobe-specification Direct mapping from
         *   ecommerce_platform_seller_profiles.id. Joined from
         *   seller_profile.id = product.ecommerce_platform_seller_profile_id.
     */
    sellerProfileId: string & tags.Format<"uuid">;

    /**
     * The seller's business/shop name.
     *
     * Appears on product pages and seller storefront. Identifies the merchant selling this product variant.
     *
         * @x-autobe-specification Direct mapping from
         *   ecommerce_platform_seller_profiles.shop_name. Joined from
         *   product.ecommerce_platform_seller_profile_id = seller_profile.id.
     */
    shopName: string;

    /**
     * Unique identifier for the product category.
     *
     * The classification hierarchy that the product belongs to, for browsing and filtering.
     *
         * @x-autobe-specification Direct mapping from
         *   ecommerce_platform_categories.id. Joined from category.id =
         *   product.ecommerce_platform_category_id.
     */
    categoryId: string & tags.Format<"uuid">;

    /**
     * Display name of the product category.
     *
     * Appears in browsing interfaces as the classification label for this product.
     *
         * @x-autobe-specification Direct mapping from
         *   ecommerce_platform_categories.name. Joined from category.id =
         *   product.ecommerce_platform_category_id.
     */
    categoryName: string;

    /**
     * Computational current stock quantity.
     *
     * Represents calculated result of summing all inventory_records.quantity_delta entries. Includes restocking (+ positive), orders (- negative), cancellations (+ positive), and refunds (+positive) events. When no records exist for a variant, defaults to 0 units.
     *
         * @x-autobe-specification Computed aggregate formula:
     *
     * COALESCE(SUM(inventory_records.quantity_delta), 0).
     *
     * Joined on: inventory_records.ecommerce_platform_product_variant_id = variant.id.
     *
     * Business rules:
     * - Variants with no inventory entries compute to 0 units.
     * - Negative values permitted in calculation.
     * - REPEATABLE READ transactions for consistent aggregate results.
     */
    currentStock: number & tags.Type<"int32">;

    /**
     * The stock availability status.
     *
     * Computed enum indicating stock availability from currentStock:
     * - 'in_stock' if currentStock > 0: Available for purchase.
     * - 'out_of_stock' if currentStock <= 0: Not available for purchase.
     *
     * Derived from the aggregate currentStock value across inventory events.
     *
         * @x-autobe-specification Computed enum formula:
     *
     * IF currentStock > 0 THEN 'in_stock' ELSE 'out_of_stock'.
     *
     * Derived from the sum of inventory_records.quantity_delta values joined on: inventory_records.ecommerce_platform_product_variant_id = variant.id.
     */
    availabilityStatus: "in_stock" | "out_of_stock";
  };

  /**
   * Request parameters for filtering, sorting, and paginating product variant stock analytics results.
   *
   * This query object enables sellers and administrators to browse inventory levels across product variants with flexible filtering options. All fields are optional — omitting all filters returns stock data for all active variants platform-wide.
   *
   * Filtering is supported by seller profile, category, product, SKU code (partial match), stock availability status, and numeric stock level ranges. Results can be sorted by stock quantity, SKU code, product name, shop name, or creation date in ascending or descending order.
   *
   * Pagination uses cursor-based navigation for efficient large-dataset browsing, with an alternative offset-based page/limit mode available.
   */
  export type IRequest = {
    /**
     * Filter results to only show stock levels for variants belonging to a specific seller profile.
     *
     * Expects a valid UUID referencing an ecommerce_platform_seller_profiles record. Only variants from products owned by the matching seller will be included in results. Omit this field to retrieve stock data across all sellers on the platform.
     *
         * @x-autobe-specification Filter parameter: WHERE seller_profile.id =
         *   value. Matches against ecommerce_platform_seller_profiles.id in the
         *   JOIN chain. UUID format. When provided, returns only stock data for
         *   variants belonging to products owned by the specified seller
         *   profile. When omitted, no seller filtering is applied.
     */
    seller_profile_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter results to only show stock levels for variants belonging to products in a specific category.
     *
     * Expects a valid UUID referencing an ecommerce_platform_categories record. Includes products assigned to the specified category (whether top-level or subcategory). Omit this field to retrieve stock data across all categories.
     *
         * @x-autobe-specification Filter parameter: WHERE category.id = value.
         *   Matches against ecommerce_platform_categories.id in the JOIN chain.
         *   UUID format. When provided, returns only stock data for variants
         *   belonging to products in the specified category or subcategory.
         *   When omitted, no category filtering is applied.
     */
    category_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter results to only show stock levels for variants of a specific product.
     *
     * Expects a valid UUID referencing an ecommerce_platform_products record. Returns stock data for all variants (including their individual stock levels) belonging to the matching product. Omit this field to retrieve stock data across all products.
     *
         * @x-autobe-specification Filter parameter: WHERE product.id = value.
         *   Matches against ecommerce_platform_products.id in the JOIN chain.
         *   UUID format. When provided, returns stock data for all variants
         *   belonging to the specified product. When omitted, no product
         *   filtering is applied.
     */
    product_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter results to only show variants whose SKU code matches the provided value.
     *
     * Supports partial string matching — for example, 'SKU-001' will match 'SKU-001-RED', 'SKU-001-BLUE', etc. Useful for finding related variants by SKU prefix. Omit this field to retrieve all variants regardless of SKU code.
     *
         * @x-autobe-specification Filter parameter: WHERE
         *   product_variants.sku_code LIKE value. Partial string match against
         *   the sku_code column in ecommerce_platform_product_variants.
         *   Supports partial/suffix matching. When provided, returns only
         *   variants whose SKU code matches the pattern. When omitted, no SKU
         *   filtering is applied.
     */
    sku_code?: string | undefined;

    /**
     * Filter results by stock availability status.
     *
     * Accepts 'in_stock' to show only variants with positive current stock, or 'out_of_stock' to show only variants with zero or negative stock. The status is computed from the running total of all inventory ledger entries. Omit this field to retrieve variants regardless of availability status.
     *
         * @x-autobe-specification Filter parameter on computed field: WHERE
         *   availability_status = value. Matches against the derived enum
         *   'in_stock' (current_stock > 0) or 'out_of_stock' (current_stock <=
         *   0). When provided, returns only variants matching the availability
         *   status. When omitted, returns both in-stock and out-of-stock
         *   variants.
     */
    availability_status?: "in_stock" | "out_of_stock" | undefined;

    /**
     * Filter results to only show variants with current stock at or above the specified quantity.
     *
     * Integer value representing the minimum stock threshold. Variants with current_stock >= this value are included. Useful for finding well-stocked variants. Omit this field to include all stock levels regardless of quantity.
     *
         * @x-autobe-specification Filter parameter on computed field: WHERE
         *   current_stock >= value. Filters variants whose computed
         *   current_stock aggregation is greater than or equal to the specified
         *   integer. When provided, excludes variants with stock below this
         *   threshold. When omitted, no minimum stock filtering is applied.
     */
    min_stock_level?: (number & tags.Type<"int32">) | undefined;

    /**
     * Filter results to only show variants with current stock at or below the specified quantity.
     *
     * Integer value representing the maximum stock threshold. Variants with current_stock <= this value are included. Useful for identifying low-stock or overstocked variants. Can be combined with min_stock_level to define a stock range. Omit this field to include all stock levels.
     *
         * @x-autobe-specification Filter parameter on computed field: WHERE
         *   current_stock <= value. Filters variants whose computed
         *   current_stock aggregation is less than or equal to the specified
         *   integer. When provided, excludes variants with stock above this
         *   threshold. When omitted, no maximum stock filtering is applied.
     */
    max_stock_level?: (number & tags.Type<"int32">) | undefined;

    /**
     * Field to sort the results by.
     *
     * Accepts one of: 'current_stock' (stock quantity), 'sku_code', 'product_name', 'shop_name', or 'created_at' (variant creation date). Defaults to 'created_at' if not specified. Combine with sort_order to control ascending or descending order.
     *
         * @x-autobe-specification Sorting parameter: ORDER BY field mapping.
         *   Enum values map to: 'current_stock' → aggregated current_stock
         *   value, 'sku_code' → product_variants.sku_code, 'product_name' →
         *   products.name, 'shop_name' → seller_profiles.shop_name,
         *   'created_at' → product_variants.created_at. Default: 'created_at'
         *   if not specified.
     */
    sort_by?:
      | "current_stock"
      | "sku_code"
      | "product_name"
      | "shop_name"
      | "created_at"
      | undefined;

    /**
     * Sort direction for the results.
     *
     * Accepts 'asc' for ascending order or 'desc' for descending order. Defaults to 'desc' if not specified. Applied to whichever field is specified in sort_by.
     *
         * @x-autobe-specification Sorting direction: ORDER BY ASC or DESC.
         *   'asc' for ascending order, 'desc' for descending order. Default:
         *   'desc' if not specified. Applies to the field specified in sort_by.
     */
    sort_order?: "asc" | "desc" | undefined;

    /**
     * Number of stock summary records to return per page.
     *
     * Integer value between 1 and 100. Defaults to 20 if not specified. Used with cursor for cursor-based pagination. Larger page sizes reduce the number of round-trips but increase individual response size.
     *
         * @x-autobe-specification Cursor-based pagination parameter: controls
         *   the number of items returned per page. Integer value, minimum 1,
         *   maximum 100. Default: 20 if not specified. Used together with
         *   cursor for efficient large-dataset pagination.
     */
    page_size?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Pagination cursor for retrieving the next page of results.
     *
     * Opaque string token returned in the pagination metadata of a previous response. Include this value to fetch results starting from where the previous page ended. Omit on the first request to retrieve the initial page of results. Enables efficient pagination without offset calculations.
     *
         * @x-autobe-specification Cursor-based pagination token: opaque string
         *   returned from previous page's pagination metadata. Used to retrieve
         *   the next page of results after the current cursor position. On
         *   first request, this field should be omitted or omitted entirely.
         *   Server uses variant.created_at and variant.id as composite cursor
         *   position.
     */
    cursor?: string | undefined;

    /**
     * Page number for offset-based pagination (1-indexed).
     *
     * Specifies which page of results to return. Starts from 1. Defaults to page 1 if omitted, null, or undefined. This is an alternative pagination mode — use with 'limit' instead of 'page_size' and 'cursor'. Requesting pages beyond the available range returns an empty result set.
     *
         * @x-autobe-specification Offset-based pagination parameter: 1-indexed
         *   page number. Defaults to 1 if not provided. Alternative to
         *   cursor-based pagination. Used together with limit (not page_size).
         *   Integer >= 0 (validated to >= 1 server-side) or null.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page for offset-based pagination.
     *
     * Controls how many stock summary records are included in each page. Defaults to 100 records per page if omitted, null, or undefined. Used together with 'page' in offset-based pagination mode. The server may enforce maximum limits to prevent excessive resource consumption.
     *
         * @x-autobe-specification Offset-based pagination parameter: maximum
         *   number of records per page. Defaults to 100 if not provided.
         *   Alternative to page_size used in cursor-based pagination. Used
         *   together with 'page'. Integer >= 0 or null. Server may enforce
         *   upper bounds to prevent excessive resource consumption.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
