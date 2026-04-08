import { tags } from "typia";

export namespace IEcommerceMallProductSnapshotVariant {
  /**
   * Lightweight product snapshot variant summary for order item displays, showing frozen SKU, price override, and stock quantity at the time of purchase.
   */
  export type ISummary = {
    /**
     * Unique identifier for the product snapshot variant record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_product_snapshot_variants.id. UUID primary key assigned at snapshot creation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique SKU code of the product variant at snapshot time.
     *
     * @x-autobe-database-schema-property sku
     * @x-autobe-specification Direct mapping from ecommerce_mall_product_snapshot_variants.sku. Unique SKU code of the product variant frozen at snapshot creation time.
     */
    sku: string;

    /**
     * Variant-specific price override. Null if using product base price.
     *
     * @x-autobe-database-schema-property price_override
     * @x-autobe-specification Direct mapping from ecommerce_mall_product_snapshot_variants.price_override. Nullable Float. When null, the parent product snapshot's base_price applies.
     */
    price_override: number | null;

    /**
     * Stock quantity of the variant at snapshot time.
     *
     * @x-autobe-database-schema-property stock_quantity
     * @x-autobe-specification Direct mapping from ecommerce_mall_product_snapshot_variants.stock_quantity. Integer representing stock quantity frozen at snapshot creation.
     */
    stock_quantity: number & tags.Type<"int32">;

    /**
     * Timestamp indicating when this variant snapshot was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_product_snapshot_variants.created_at. DateTime timestamp indicating when this variant snapshot record was created.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
