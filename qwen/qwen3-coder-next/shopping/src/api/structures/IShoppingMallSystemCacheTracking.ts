import { tags } from "typia";

import { IShoppingMallAdmin } from "./IShoppingMallAdmin";
import { IShoppingMallSystemReferenceData } from "./IShoppingMallSystemReferenceData";

export namespace IShoppingMallSystemCacheTracking {
  /**
   * Request parameters for filtering and paginating cache invalidation tracking records.
   */
  export type IRequest = {
    /**
     * Cache key pattern to filter by (partial match supported).
     *
     * @x-autobe-specification Optional filter for cache key pattern matching using LIKE operations.
     */
    cache_key_pattern?: string | undefined;

    /**
     * Table name to filter by (exact match).
     *
     * @x-autobe-specification Optional filter for specific table name using exact match.
     */
    table_name?: string | undefined;

    /**
     * Start date for invalidation timestamp range (inclusive, ISO 8601 format).
     *
     * @x-autobe-specification Optional start date for filtering by invalidated_at timestamp range.
     */
    created_at_from?: string | undefined;

    /**
     * End date for invalidation timestamp range (inclusive, ISO 8601 format).
     *
     * @x-autobe-specification Optional end date for filtering by invalidated_at timestamp range.
     */
    created_at_to?: string | undefined;

    /**
     * Target page number to retrieve (1-indexed). Defaults to 1 if not provided.
     *
     * @x-autobe-specification Page number for pagination (1-indexed). Defaults to 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records to return per page. Maximum is 100. Defaults to 100 if not provided.
     *
     * @x-autobe-specification Maximum records per page (max 100). Defaults to 100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Maximum<100> & tags.MultipleOf<1>)
      | undefined;
  };

  /**
   * Lightweight cache invalidation tracking summary for list displays in the admin dashboard, showing essential information about cache invalidation events without exposing raw database identifiers or large text fields.
   */
  export type ISummary = {
    /**
     * Unique identifier for the cache invalidation tracking record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_system_cache_trackings.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Pattern of cache keys that were invalidated.
     *
     * @x-autobe-database-schema-property cache_key_pattern
     * @x-autobe-specification Direct mapping from shopping_mall_system_cache_trackings.cache_key_pattern.
     */
    cache_key_pattern: string;

    /**
     * Description of what was invalidated and why.
     *
     * @x-autobe-database-schema-property description
     * @x-autobe-specification Direct mapping from shopping_mall_system_cache_trackings.description.
     */
    description: string;

    /**
     * Timestamp when the cache invalidation was performed.
     *
     * @x-autobe-database-schema-property invalidated_at
     * @x-autobe-specification Direct mapping from shopping_mall_system_cache_trackings.invalidated_at.
     */
    invalidated_at: string;

    /**
     * The reference data table that was invalidated.
     *
     * @x-autobe-database-schema-property table_name
     * @x-autobe-specification Join via table_name foreign key to shopping_mall_system_reference_data.id. Returns IShoppingMallSystemReferenceData.ISummary.
     */
    table_name: IShoppingMallSystemReferenceData.ISummary;

    /**
     * The administrator who triggered the cache invalidation, if applicable.
     *
     * @x-autobe-database-schema-property admin_id
     * @x-autobe-specification Join via admin_id foreign key to shopping_mall_admins.id (nullable). Returns IShoppingMallAdmin.ISummary.
     */
    admin: IShoppingMallAdmin.ISummary | null;
  };
}
