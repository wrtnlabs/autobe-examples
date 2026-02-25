import { tags } from "typia";

import { IShoppingMallCategory } from "./IShoppingMallCategory";
import { IShoppingMallProduct } from "./IShoppingMallProduct";

export namespace IShoppingMallOrderProductSnapshots {
  /**
   * Summary view of an order product snapshot with essential display information including product identity, description, price, and reference to its category and seller for historical product state preservation.
   */
  export type ISummary = {
    /**
     * Unique identifier for this order product snapshot record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_order_product_snapshots.id. Primary key identifying this snapshot record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Product name as it was at the time of order placement, preserved for historical reference.
     *
     * @x-autobe-database-schema-property name
     * @x-autobe-specification Direct mapping from shopping_mall_order_product_snapshots.name. Product name at the time of snapshot (order time).
     */
    name: string;

    /**
     * Product description as it was at the time of order placement, preserved for historical reference.
     *
     * @x-autobe-database-schema-property description
     * @x-autobe-specification Direct mapping from shopping_mall_order_product_snapshots.description. Product description at the time of snapshot (order time).
     */
    description: string;

    /**
     * Product base price as it was at the time of order placement, preserved for historical reference.
     *
     * @x-autobe-database-schema-property base_price
     * @x-autobe-specification Direct mapping from shopping_mall_order_product_snapshots.base_price. Product base price at the time of snapshot (order time).
     */
    base_price: number;

    /**
     * Product information at the time of order placement, preserved for historical reference.
     *
     * @x-autobe-database-schema-property product
     * @x-autobe-specification Join via shopping_mall_order_product_snapshots.shopping_mall_product_id to shopping_mall_products.id. Returns IShoppingMallProduct.ISummary.
     */
    category: IShoppingMallCategory.ISummary;

    /**
     * Product information at the time of order placement, preserved for historical reference.
     *
     * @x-autobe-database-schema-property product
     * @x-autobe-specification Join via shopping_mall_order_product_snapshots.shopping_mall_product_id to shopping_mall_products.id. Returns IShoppingMallProduct.ISummary.
     */
    product: IShoppingMallProduct.ISummary;
  };
}
