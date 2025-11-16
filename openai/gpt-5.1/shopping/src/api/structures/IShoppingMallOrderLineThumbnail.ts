import { tags } from "typia";

import { IShoppingMallProduct } from "./IShoppingMallProduct";
import { IShoppingMallProductSku } from "./IShoppingMallProductSku";

export namespace IShoppingMallOrderLineThumbnail {
  /**
   * Compact thumbnail representation of an order line used inside order
   * summaries.
   *
   * This DTO is backed by the `shopping_mall_order_lines` Prisma model and is
   * intended for use in list views and lightweight order overviews where only
   * key product and pricing information is required. It exposes immutable
   * snapshot fields such as `product_name_snapshot` and `line_total_amount`
   * from the order line so that historical pricing and naming remain accurate
   * even if catalog data changes after the order is placed.
   *
   * For full operational workflows such as fulfillment, returns, or dispute
   * handling, richer DTOs expose additional properties including unit price,
   * discounts, taxes, status history, and timestamps. The thumbnail focuses
   * on the fields typically needed to quickly show what was ordered and at
   * what total line amount.
   */
  export type ISummary = {
    /**
     * Identifier of the underlying order line record that this thumbnail
     * represents.
     *
     * This value directly maps to the primary key `id` of the
     * `shopping_mall_order_lines` table and is used to correlate the
     * thumbnail with the full order line entity when more detailed data is
     * required.
     */
    order_line_id: string & tags.Format<"uuid">;

    /**
     * Summary of the ordered product for quick visualisation of what was
     * purchased.
     *
     * The information is derived from the related `shopping_mall_products`
     * record and is meant for catalog-level context such as brand,
     * category, and primary imagery. Pricing and naming in the thumbnail
     * are, however, taken from snapshot fields on the order line to
     * preserve the state at the time of ordering.
     */
    product: IShoppingMallProduct.ISummary;

    /**
     * Summary of the concrete SKU (variant) that was ordered, if
     * applicable.
     *
     * This summary is resolved from the `shopping_mall_product_skus` record
     * referenced by `shopping_mall_product_sku_id` on
     * `shopping_mall_order_lines`, allowing UIs to show variant-specific
     * information such as color or size alongside the order line
     * thumbnail.
     */
    sku?: IShoppingMallProductSku.ISummary | undefined;

    /**
     * Product name as displayed to the customer at the time of ordering,
     * stored as an immutable snapshot.
     *
     * This field maps directly to the `product_name_snapshot` column on
     * `shopping_mall_order_lines` and is not updated when the catalog
     * product name changes later. Order detail and history views should
     * prefer this snapshot for rendering the line title to ensure
     * historical accuracy.
     */
    product_name_snapshot: string;

    /**
     * Final total amount charged for this line after discounts and taxes,
     * recorded at order creation.
     *
     * This value is taken from the non-nullable `line_total_amount` column
     * on `shopping_mall_order_lines` and already reflects the ordered
     * quantity, any per-line discounts, and applicable taxes. It is the
     * primary monetary figure shown in order summaries for each line item.
     */
    line_total_amount: number;

    /**
     * Quantity of this SKU purchased on the order line represented by this
     * thumbnail.
     *
     * The value is sourced from the `quantity` column on
     * `shopping_mall_order_lines` and represents the number of units the
     * customer ordered. It does not directly represent shipped or returned
     * quantities, which may be tracked separately at fulfillment or
     * after-sales layers.
     */
    quantity: number & tags.Type<"int32">;
  };
}
