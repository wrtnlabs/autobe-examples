import { tags } from "typia";

export namespace IShoppingMallOrderVariantSnapshots {
  /**
   * Lightweight variant information for order item summaries, containing essential identifying information about the product variant at time of purchase. Includes SKU code, pricing information, stock status, and variant identification for display in order history and management interfaces.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property product_snapshot_id
     */
    product_snapshot_id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property sku_code
     */
    sku_code: string;

    /**
     * Variant-specific price override or null when using base price.
     *
     * @x-autobe-database-schema-property variant_price_override
     * @x-autobe-specification Nullable in DB, so DTO allows null. When null, use product base price. When set, use this override price.
     */
    variant_price_override?: number | null | undefined;
    /**
     * @x-autobe-database-schema-property stock_quantity
     */
    stock_quantity: number & tags.Type<"int32">;
    /**
     * @x-autobe-database-schema-property is_in_stock
     */
    is_in_stock: boolean;
  };
}
