import { tags } from "typia";

export namespace IShoppingMallProductVariantSnapshot {
  /**
   * Summary view of product variant snapshot for audit trail display. Contains essential information about the variant's state at a specific point in time.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property sku_code
     */
    sku_code: string;
    /**
     * @x-autobe-database-schema-property option_values_json
     */
    option_values_json: string;
    /**
     * @x-autobe-database-schema-property price_override
     */
    price_override: number | null;
    /**
     * @x-autobe-database-schema-property stock_quantity
     */
    stock_quantity: number & tags.Type<"int32">;
    /**
     * @x-autobe-database-schema-property created_at
     */
    created_at: string & tags.Format<"date-time">;
    /**
     * @x-autobe-database-schema-property updated_at
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
