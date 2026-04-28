import { tags } from "typia";

import { IMallPlatformProductSnapshot } from "./IMallPlatformProductSnapshot";
import { IMallPlatformProductVariantSnapshot } from "./IMallPlatformProductVariantSnapshot";

export namespace IMallPlatformProductSnapshotVariant {
  /**
   * Pagination, search, and sorting criteria for browsing historical product variant snapshot rows within a specific product snapshot.
   *
   * This request is used by seller and administrator history views to inspect immutable snapshot data. It carries only list controls for paging, filtering, and ordering; the path supplies the product and snapshot identifiers, and nothing in this body is persisted.
   */
  export type IRequest = {
    /**
     * Current page number for browsing preserved snapshot-variant rows.
     *
     * This value selects which page of historical product variant snapshot results should be returned. It is a request-only control and is not stored in the database.
     *
         * @x-autobe-specification Use this as the 1-indexed page number when
         *   querying preserved product snapshot variant rows. It affects only
         *   the list query and does not map to any stored column or relation.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of snapshot-variant rows to return per page.
     *
     * This value controls the page size for browsing immutable product snapshot variant history. It is a request-only control and is not stored in the database.
     *
         * @x-autobe-specification Use this as the maximum number of preserved
         *   product snapshot variant rows returned per page. It affects only
         *   the list query and does not map to any stored column or relation.
     */
    limit?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Keyword text used to filter preserved snapshot-variant rows.
     *
     * This value narrows the historical variant list to rows whose textual fields match the supplied term. It is a request-only filter and is not stored in the database.
     *
         * @x-autobe-specification Use this as an optional keyword filter
         *   against textual snapshot-variant fields such as sku_code and
         *   option_values, and include joined historical variant text if the
         *   implementation needs broader matching. It is query-only logic and
         *   does not map to a persisted column or relation.
     */
    search?: string | undefined;

    /**
     * Sort expression for ordering preserved snapshot-variant rows.
     *
     * This value determines the order in which immutable historical results are returned. It is a request-only instruction and is not stored in the database.
     *
         * @x-autobe-specification Use this as the ordering instruction for
         *   preserved product snapshot variant rows. Interpret it in the query
         *   layer according to the endpoint's supported sort rules, such as
         *   newest-first or field-based ordering over snapshot columns. It is
         *   request-only logic and does not map to any database property.
     */
    sort?: string | undefined;
  };

  /**
   * A preserved product variant row inside a product snapshot.
   *
   * This object represents one immutable historical variant record captured at snapshot time. It includes the snapshot row identity, the parent product snapshot, the optional linked live product variant snapshot, the preserved SKU code, option values, price override, availability flag, and creation timestamp.
   *
   * Use this schema for browsing and reviewing historical product snapshot variant rows. It is read-only and intended for audit, dispute review, and historical reconstruction of a product snapshot's variant state.
   */
  export type ISummary = {
    /**
     * The unique identifier of this preserved product snapshot variant row.
     *
     * This value identifies one immutable historical row inside a product snapshot and is used to reference the record in read-only history views.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   mall_platform_product_snapshot_variants.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The product snapshot that owns this preserved variant row.
     *
     * This is the historical product snapshot in which the variant values were captured, allowing consumers to place the row in its full snapshot context.
     *
         * @x-autobe-database-schema-property productSnapshot
         * @x-autobe-specification Join from
         *   mall_platform_product_snapshot_variants.mall_platform_product_snapshot_id
         *   to mall_platform_product_snapshots.id. Return
         *   IMallPlatformProductSnapshot.ISummary as the parent snapshot
         *   reference.
     */
    productSnapshot: IMallPlatformProductSnapshot.ISummary;

    /**
     * The linked product variant snapshot for this preserved row, if one exists.
     *
     * Some historical rows are linked to a dedicated variant snapshot source, while others are not. When absent, this property is null.
     *
         * @x-autobe-database-schema-property productVariantSnapshot
         * @x-autobe-specification Join from
         *   mall_platform_product_snapshot_variants.mall_platform_product_variant_snapshot_id
         *   to mall_platform_product_variant_snapshots.id when present. Return
         *   IMallPlatformProductVariantSnapshot.ISummary, or null when the row
         *   is not linked to a dedicated variant snapshot source.
     */
    productVariantSnapshot: IMallPlatformProductVariantSnapshot.ISummary | null;

    /**
     * The SKU code preserved for the variant at snapshot time.
     *
     * This is the historical seller-defined identifier for the variant as captured in the immutable snapshot row.
     *
         * @x-autobe-database-schema-property sku_code
         * @x-autobe-specification Direct mapping from
         *   mall_platform_product_snapshot_variants.sku_code.
     */
    skuCode: string;

    /**
     * The preserved option values for the variant at snapshot time.
     *
     * This field stores the human-readable variant option combination exactly as it appeared when the snapshot was recorded.
     *
         * @x-autobe-database-schema-property option_values
         * @x-autobe-specification Direct mapping from
         *   mall_platform_product_snapshot_variants.option_values.
     */
    optionValues: string;

    /**
     * The preserved variant price override captured at snapshot time, if any.
     *
     * When a variant did not override the product base price at the time of the snapshot, this field is null.
     *
         * @x-autobe-database-schema-property price_override
         * @x-autobe-specification Direct mapping from
         *   mall_platform_product_snapshot_variants.price_override. Preserve
         *   null when no override was recorded.
     */
    priceOverride: number | null;

    /**
     * Whether the variant was available for purchase when the snapshot was recorded.
     *
     * This reflects the historical availability state of the variant at the time the immutable row was captured.
     *
         * @x-autobe-database-schema-property is_available
         * @x-autobe-specification Direct mapping from
         *   mall_platform_product_snapshot_variants.is_available.
     */
    isAvailable: boolean;

    /**
     * The timestamp when this preserved variant snapshot row was created.
     *
     * This value marks when the immutable historical record was written and is used for ordering and audit review.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   mall_platform_product_snapshot_variants.created_at.
     */
    createdAt: string & tags.Format<"date-time">;
  };
}
