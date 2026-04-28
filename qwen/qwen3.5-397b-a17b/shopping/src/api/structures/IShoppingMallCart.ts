import { tags } from "typia";

import { IShoppingMallProductVariant } from "./IShoppingMallProductVariant";

export namespace IShoppingMallCart {
  /**
   * Shopping cart line item with complete product variant details.
   *
   * Represents a specific product variant added to a customer's shopping cart with a specified quantity. This DTO is used when retrieving the customer's cart to display all items with their variant information including SKU code, option values, pricing, and the parent product details.
   *
   * The quantity field indicates how many units of this variant the customer wants to purchase. When customers add the same variant multiple times, the quantity is combined rather than creating duplicate cart items. The productVariant field provides complete variant information including the nested product summary for display purposes.
   */
  export type IInvert = {
    /**
     * Unique identifier for the cart item.
     *
     * This is the primary key of the cart item record in the database. Used internally for cart item management operations such as updating quantity or removing items from the cart.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   shopping_mall_cart_items.id. UUID format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The product variant added to the cart.
     *
     * Contains complete variant information including the SKU code, option combination text (e.g., 'Color: Red, Size: Large'), optional price override, and current stock quantity. The nested product summary provides the product name, base price, category, and seller information for display purposes.
     *
     * This relation allows customers to see exactly which variant they are purchasing with all relevant details without needing separate API calls.
     *
         * @x-autobe-database-schema-property productVariant
         * @x-autobe-specification JOIN from
         *   shopping_mall_cart_items.shopping_mall_product_variant_id to
         *   shopping_mall_product_variants.id. Returns
         *   IShoppingMallProductVariant.ISummary with nested product summary.
     */
    productVariant: IShoppingMallProductVariant.ISummary;

    /**
     * Quantity of the product variant in this cart item.
     *
     * Represents how many units of this specific variant the customer wants to purchase. When customers add the same variant to cart multiple times, this quantity is incremented rather than creating a new cart item row.
     *
     * The quantity must be a positive integer and is validated against the variant's available stock during checkout.
     *
         * @x-autobe-database-schema-property quantity
         * @x-autobe-specification Direct mapping from
         *   shopping_mall_cart_items.quantity. Integer type representing the
         *   number of units.
     */
    quantity: number & tags.Type<"int32">;

    /**
     * Timestamp when this cart item was created.
     *
     * Records when the customer first added this product variant to their shopping cart. Used for cart analytics and sorting items by recency if needed.
     *
     * Format: ISO 8601 date-time string (e.g., '2024-01-15T10:30:00Z').
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   shopping_mall_cart_items.created_at. ISO 8601 date-time format.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this cart item was last updated.
     *
     * Updated whenever the cart item's quantity is modified. Used for tracking cart activity and determining if the cart has been recently modified.
     *
     * Format: ISO 8601 date-time string (e.g., '2024-01-15T10:30:00Z').
     *
         * @x-autobe-database-schema-property updated_at
         * @x-autobe-specification Direct mapping from
         *   shopping_mall_cart_items.updated_at. ISO 8601 date-time format.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
