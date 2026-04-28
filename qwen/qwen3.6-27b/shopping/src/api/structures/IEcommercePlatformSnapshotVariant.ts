import { tags } from "typia";

import { IEcommercePlatformProductVariant } from "./IEcommercePlatformProductVariant";
import { IEcommercePlatformSnapshot } from "./IEcommercePlatformSnapshot";

export namespace IEcommercePlatformSnapshotVariant {
  /**
   * Search criteria and pagination parameters for querying product variant snapshot history through paginated list endpoints.
   *
   * This request DTO enables filtering the immutable audit trail of product variant states by SKU code, price, stock quantity, and creation date ranges, combined with pagination controls to navigate through large historical result sets. Used by sellers to browse snapshots of their own product variants and by administrators to audit any variant snapshot across the marketplace.
   */
  export type IRequest = {
    /**
     * Optional filter to narrow variant snapshot results by SKU code.
     *
     * Accepts exact SKU code matching or partial substring matching against historical variant identifiers. Useful for auditing specific variant configurations across time. Leave empty or omit to retrieve all SKU codes in the result set.
     *
         * @x-autobe-specification Server-side filter against
         *   ecommerce_platform_snapshot_variants.sku_code column. Supports
         *   exact match when full SKU code provided, or partial substring match
         *   when abbreviated text supplied. No type transformation required.
     *
     * Examples: 'SKU-12345' (exact match), 'SKU-123' (partial match matching any code containing this substring)
     */
    sku_code?: string | undefined;

    /**
     * Optional filter to narrow variant snapshot results by exact price value.
     *
     * Requires exact price match (double-precision floating-point) against the price recorded at snapshot time. Useful for auditing pricing history or identifying snapshots at specific price points. Omit this filter to retrieve snapshots at all price levels.
     *
         * @x-autobe-specification Server-side filter against
         *   ecommerce_platform_snapshot_variants.price column. Exact
         *   double-precision floating-point match — snapshots must have price
         *   exactly equal to the provided value. Accepts null check by omitting
         *   filter.
     *
     * No rounding or approximate matching applied. Example: filtering price=29.99 returns only snapshots recorded at precisely $29.99.
     */
    price?: number | undefined;

    /**
     * Optional filter to narrow variant snapshot results by exact stock quantity.
     *
     * Requires precise integer match against inventory quantity recorded at snapshot time. Useful for auditing stockout events (quantity=0) or specific inventory thresholds. Omit this filter to retrieve snapshots across all stock quantity levels.
     *
         * @x-autobe-specification Server-side filter against
         *   ecommerce_platform_snapshot_variants.stock_quantity column. Exact
         *   integer match — returned snapshots must have stock_quantity exactly
         *   equal to the specified integer value.
     *
     * No range matching — use pagination or multiple requests for range-based queries. Example: filtering stock_quantity=0 returns only snapshots where variant was out of stock.
     */
    stock_quantity?: (number & tags.Type<"int32">) | undefined;

    /**
     * Optional filter specifying the start boundary for snapshot creation date range.
     *
     * Accepts RFC 3339 date-time string. Inclusive — snapshots created at exactly this timestamp are included. Combine with created_at_to to filter snapshots within a specific time window. Omit to include all snapshots regardless of creation date.
     *
         * @x-autobe-specification Server-side range filter boundary against
         *   ecommerce_platform_snapshot_variants.created_at column. Inclusive
         *   lower bound — snapshots created_at timestamps greater than or equal
         *   to this value are included.
     *
     * Format: RFC 3339 date-time string (ISO 8601). Combined with created_at_to for range filtering; used alone returns snapshots from this timestamp onward. Example: '2024-01-15T00:00:00Z' retrieves all snapshots created on or after January 15, 2024.
     */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional filter specifying the end boundary for snapshot creation date range.
     *
     * Accepts RFC 3339 date-time string. Inclusive — snapshots created at exactly this timestamp are included. Combine with created_at_from to filter snapshots within a specific time window. Omit to include all snapshots regardless of creation date.
     *
         * @x-autobe-specification Server-side range filter boundary against
         *   ecommerce_platform_snapshot_variants.created_at column. Inclusive
         *   upper bound — snapshots created_at timestamps less than or equal to
         *   this value are included.
     *
     * Format: RFC 3339 date-time string (ISO 8601). Combined with created_at_from for range filtering; used alone returns snapshots up to and including this timestamp. Example: '2024-06-30T23:59:59Z' retrieves all snapshots through end of June 2024.
     */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Pagination page number for navigating through paginated snapshot result sets.
     *
     * 1-indexed integer (minimum 1). Determines which subset of filtered results to retrieve. Combined with limit parameter to control result set size. Check pagination metadata in response to determine valid page range and total pages available.
     *
         * @x-autobe-specification Pagination control parameter. 1-indexed
         *   integer specifying which page of results to return. Minimum value
         *   is 1 (first page). No maximum limit enforced server-side — clients
         *   should validate page bounds using total pages from pagination
         *   response.
     *
     * Combined with limit parameter to calculate result offset: offset = (page - 1) * limit. Example: page=2 with limit=25 returns records 26-50.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of variant snapshot records to return per page.
     *
     * Integer between 1 and 100 (inclusive). Controls pagination page size. Higher values reduce number of API calls needed but increase response payload size. Default behavior if omitted follows server-side defaults. Check total records and total pages in response pagination metadata for complete result set bounds.
     *
         * @x-autobe-specification Pagination control parameter specifying
         *   maximum number of snapshot records to return per page. Integer
         *   value between 1 and 100 (inclusive).
     *
     * Controls result set size for each page request. Combined with page parameter. Server caps at 100; if client requests limit > 100, server returns exactly 100 records. Final page may contain fewer records than limit when total results don't evenly divide by limit value.
     *
     * Example: limit=20 returns up to 20 snapshot records per page.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Summary representation of a product variant snapshot, capturing the immutable historical state of a variant's SKU code, price, and stock quantity at the moment it was recorded.
   *
   * This type serves as an audit trail entry for platform administrators and dispute resolution workflows. It links to the parent polymorphic {@link snapshot} header containing metadata such as entity type and creation timestamp, and references the source {@link variant} catalog entity for contextual identification. Normalized option attributes or nested compositions are omitted to maintain a lightweight summary structure.
   */
  export type ISummary = {
    /**
     * Unique identifier for this product variant snapshot record.
     *
     * Serves as the primary key for retrieving or referencing specific variant state records within the immutable audit trail. Used as part of the polymorphic snapshot hierarchy to isolate variant-specific historical data.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Primary key UUID for the snapshot variant
         *   record. Direct mapping from
         *   ecommerce_platform_snapshot_variants.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The Stock Keeping Unit (SKU) code assigned to the variant when this snapshot was captured.
     *
     * Preserves the exact inventory tracking identifier used at the moment of recording, independent of any subsequent SKU reassignments or updates to the live product variant.
     *
         * @x-autobe-database-schema-property sku_code
         * @x-autobe-specification Direct mapping from
         *   ecommerce_platform_snapshot_variants.sku_code. Captures the exact
         *   SKU code at the time of the snapshot.
     */
    sku_code: string;

    /**
     * The price of the product variant at the moment this snapshot was recorded.
     *
     * Preserves the exact monetary value for audit and dispute resolution, independent of subsequent price changes to the live variant.
     *
         * @x-autobe-database-schema-property price
         * @x-autobe-specification Direct mapping from
         *   ecommerce_platform_snapshot_variants.price. Captures the exact
         *   price at the time of the snapshot.
     */
    price: number;

    /**
     * The available stock quantity of the variant when this snapshot was created.
     *
     * Captures the exact inventory state for historical reconstruction, allowing the system to calculate availability at the point of event regardless of subsequent restocking or order depletion.
     *
         * @x-autobe-database-schema-property stock_quantity
         * @x-autobe-specification Direct mapping from
         *   ecommerce_platform_snapshot_variants.stock_quantity. Captures the
         *   exact inventory count at the time of the snapshot.
     */
    stock_quantity: number & tags.Type<"int32">;

    /**
     * Reference to the polymorphic snapshot header, containing metadata such as the entity type and creation timestamp.
     *
     * Links this variant-specific state to its overarching audit trail record, which categorizes the event and maintains chronological integrity across all snapshotted entities.
     *
         * @x-autobe-database-schema-property snapshot
         * @x-autobe-specification BELONGS-TO relation mapped from FK
         *   ecommerce_platform_snapshot_variants.ecommerce_platform_snapshot_id.
         *   Returns IEcommercePlatformSnapshot.ISummary. Provides the
         *   polymorphic header context for the audit trail.
     */
    snapshot: IEcommercePlatformSnapshot.ISummary;

    /**
     * Reference to the product variant entity that was snapshotted.
     *
     * Provides catalog context such as name, category, and current availability, linking the historical state back to its originating catalog record.
     *
         * @x-autobe-database-schema-property variant
         * @x-autobe-specification BELONGS-TO relation mapped from FK
         *   ecommerce_platform_snapshot_variants.ecommerce_platform_product_variant_id.
         *   Returns IEcommercePlatformProductVariant.ISummary. Links the
         *   snapshot to the original product variant catalog entity.
     */
    variant: IEcommercePlatformProductVariant.ISummary;

    /**
     * The exact timestamp when this variant snapshot was created and recorded.
     *
     * Used for chronological ordering, auditing, and timeline reconstruction of inventory or pricing changes.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   ecommerce_platform_snapshot_variants.created_at. ISO 8601 datetime
         *   format capturing when the snapshot record was immutably generated.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
