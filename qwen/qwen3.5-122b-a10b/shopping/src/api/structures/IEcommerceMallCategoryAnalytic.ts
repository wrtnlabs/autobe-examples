import { tags } from "typia";

import { IEcommerceMallCategory } from "./IEcommerceMallCategory";

export namespace IEcommerceMallCategoryAnalytic {
  /**
   * Request parameters for filtering and paginating category analytics data.
   *
   * This request body supports comprehensive filtering capabilities for category analytics queries. Administrators can search categories by name or description using LIKE matching, filter by parent category ID to get subcategories, specify creation date ranges, and optionally include soft-deleted categories in results.
   *
   * Pagination is supported through both traditional page/limit parameters and cursor-based pagination for efficient handling of large datasets. All filter parameters are optional, allowing flexible query construction based on specific reporting needs.
   *
   * By default, soft-deleted categories are excluded from results unless explicitly requested via the include_deleted parameter. This endpoint is designed for admin dashboards and category management reporting tools.
   */
  export type IRequest = {
    /**
     * Search term for filtering categories by name or description using LIKE matching
     *
     * @x-autobe-specification Filter categories by name or description using SQL LIKE matching. Applied to categories.name and categories.description columns. Case-insensitive partial match.
     */
    search?: string | undefined;

    /**
     * Filter categories by parent category ID
     *
     * @x-autobe-specification Filter categories where parent_id matches this UUID value. Returns only subcategories of the specified parent category. Null for top-level categories.
     */
    parent_category_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter categories created on or after this date
     *
     * @x-autobe-specification Filter categories where created_at is on or after this timestamp. Used for date range filtering on categories.created_at column.
     */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter categories created on or before this date
     *
     * @x-autobe-specification Filter categories where created_at is on or before this timestamp. Used for date range filtering on categories.created_at column.
     */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Include soft-deleted categories in results. Defaults to false.
     *
     * @x-autobe-specification When true, include categories where deleted_at IS NOT NULL in results. When false (default), filter out soft-deleted categories where deleted_at IS NOT NULL.
     */
    include_deleted?: boolean | undefined;

    /**
     * Page number for traditional pagination. Starts from 1.
     *
     * @x-autobe-specification Page number for traditional pagination, 1-indexed. Used with limit parameter for offset-based pagination. Minimum value is 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of results per page. Maximum 100.
     *
     * @x-autobe-specification Number of results per page. Maximum value is 100. Used with page for traditional pagination or cursor for cursor-based pagination.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Cursor token for cursor-based pagination. Use when fetching next/previous page.
     *
     * @x-autobe-specification Cursor token for cursor-based pagination. Used to fetch next or previous page of results. Encodes the last record's sorting key for efficient pagination.
     */
    cursor?: string | undefined;
  };

  /**
   * Category analytics summary providing administrators with aggregated product statistics for category performance monitoring. Combines category entity metadata with real-time computed metrics including total product count and active product count. Includes parent category reference for hierarchical navigation within the platform's category taxonomy. Used in paginated analytics responses for admin dashboards and category management reporting.
   */
  export type ISummary = {
    /**
     * Unique identifier for the category.
     *
     * @x-autobe-specification Direct mapping from ecommerce_mall_categories.id column via JOIN. UUID primary key for category identification in the aggregation result.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Category name used for display and product filtering.
     *
     * @x-autobe-specification Direct mapping from ecommerce_mall_categories.name column via JOIN. Unique constraint enforced at database level.
     */
    name: string;

    /**
     * Optional category description providing additional context about the category's purpose and product types.
     *
     * @x-autobe-specification Direct mapping from ecommerce_mall_categories.description column via JOIN. Nullable field providing additional context about the category.
     */
    description?: string | null | undefined;

    /**
     * Parent category for hierarchical navigation, or null if this is a top-level category.
     *
     * @x-autobe-specification LEFT JOIN from categories.parent_id to categories.id. Returns IEcommerceMallCategory.ISummary for parent category, or null for top-level categories where parent_id IS NULL.
     */
    parent: IEcommerceMallCategory.ISummary | null;

    /**
     * Total count of all products assigned to this category, excluding soft-deleted products.
     *
     * @x-autobe-specification Computed aggregation: COUNT(products.id) from JOIN with ecommerce_mall_products WHERE products.deleted_at IS NULL. Counts all products (active, suspended, deleted) assigned to this category excluding soft-deleted products.
     */
    total_product_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Count of products with active status assigned to this category.
     *
     * @x-autobe-specification Computed aggregation: COUNT(CASE WHEN products.status = 'active' THEN 1 END) from JOIN with ecommerce_mall_products WHERE products.deleted_at IS NULL. Counts only products with status = 'active'.
     */
    active_product_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Timestamp when the category was created.
     *
     * @x-autobe-specification Direct mapping from ecommerce_mall_categories.created_at column via JOIN. Timestamp with timezone (timestamptz).
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the category was last modified.
     *
     * @x-autobe-specification Direct mapping from ecommerce_mall_categories.updated_at column via JOIN. Updated on every category modification. Timestamp with timezone (timestamptz).
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the category was soft-deleted, or null if the category is still active.
     *
     * @x-autobe-specification Direct mapping from ecommerce_mall_categories.deleted_at column via JOIN. Nullable timestamp with timezone (timestamptz). Null for active categories, set to current timestamp on soft-deletion.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };
}
