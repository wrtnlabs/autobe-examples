import { tags } from "typia";

import { IEcommerceMallProduct } from "./IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "./IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "./IEcommerceMallSeller";

export namespace IEcommerceMallOrderItem {
  /**
   * Lightweight order item for lists, including identification, quantity, status, and minimal snapshot details.
   */
  export type ISummary = {
    /**
     * Unique order item identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_order_items.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Number of units purchased, minimum 1.
     *
     * @x-autobe-database-schema-property quantity
     * @x-autobe-specification Direct mapping from ecommerce_mall_order_items.quantity.
     */
    quantity: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Product name at time of purchase.
     *
     * @x-autobe-database-schema-property product_name
     * @x-autobe-specification Direct mapping from ecommerce_mall_order_items.product_name. Snapshot of product name at purchase time.
     */
    product_name: string;

    /**
     * Variant option values as JSON string (e.g., {"color": "red", "size": "large"}).
     *
     * @x-autobe-database-schema-property variant_options
     * @x-autobe-specification Direct mapping from ecommerce_mall_order_items.variant_options. JSON string of variant option values at purchase time.
     */
    variant_options: string;

    /**
     * Product price at time of purchase.
     *
     * @x-autobe-database-schema-property product_price
     * @x-autobe-specification Direct mapping from ecommerce_mall_order_items.product_price. Snapshot of product price at purchase time.
     */
    product_price: number;

    /**
     * Status of the order item.
     *
     * @x-autobe-database-schema-property item_status
     * @x-autobe-specification Direct mapping from ecommerce_mall_order_items.item_status. Status: paid, shipped, delivered, cancelled, refunded.
     */
    item_status: "paid" | "shipped" | "delivered" | "cancelled" | "refunded";

    /**
     * Product details at time of purchase.
     *
     * @x-autobe-database-schema-property product
     * @x-autobe-specification Join from ecommerce_mall_order_items.product_id to ecommerce_mall_products.id. Returns ISummary with essential product info.
     */
    product: IEcommerceMallProduct.ISummary;

    /**
     * Product variant details at time of purchase.
     *
     * @x-autobe-database-schema-property variant
     * @x-autobe-specification Join from ecommerce_mall_order_items.variant_id to ecommerce_mall_product_variants.id. Returns ISummary with variant details.
     */
    variant: IEcommerceMallProductVariant.ISummary;

    /**
     * Seller details at time of purchase.
     *
     * @x-autobe-database-schema-property seller
     * @x-autobe-specification Join from ecommerce_mall_order_items.seller_id to ecommerce_mall_sellers.id. Returns ISummary with seller shop info.
     */
    seller: IEcommerceMallSeller.ISummary;
  };

  /**
   * Request body for updating specific order item quantities in an order. Contains only the identifier and mutable quantity field for item modifications.
   */
  export type IUpdate = {
    /**
     * Unique identifier of the order item to update.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Identifier-only update: id identifies target order item. Must be UUID.
     */
    id: string & tags.Format<"uuid">;

    /**
     * New quantity for the order item.
     *
     * @x-autobe-database-schema-property quantity
     * @x-autobe-specification Optional integer (minimum 1) to update. If omitted, quantity remains unchanged.
     */
    quantity?:
      | (number & tags.Type<"int32"> & tags.Minimum<1>)
      | null
      | undefined;
  };
}
