import { tags } from "typia";

export namespace IShoppingMallProductVariant {
  /**
   * Lightweight product variant summary for display in shopping cart and product listing contexts.
   *
   * This type represents a product variant (SKU) with essential information needed for customers to identify and select specific product options. It includes the variant's unique identifier, SKU code, option specifications (such as size, color, or other attributes), optional price override (uses product base price if null), current stock quantity, and availability status.
   *
   * Used in cart item responses, product variant selectors, and inventory displays. The summary excludes timestamps and relational data to keep responses lightweight for efficient rendering.
   */
  export type ISummary = {
    /**
     * Unique identifier for the product variant.
     *
     * @x-autobe-specification Placeholder for future shopping_mall_product_variants.id (UUID primary key). Currently served by backend mock data until database table is implemented.
     */
    id: string & tags.Format<"uuid">;

    /**
     * SKU (Stock Keeping Unit) code uniquely identifying this variant.
     *
     * @x-autobe-specification Placeholder for future shopping_mall_product_variants.sku_code (unique text column). Currently served by backend mock data until database table is implemented.
     */
    sku_code: string;

    /**
     * Option values defining this variant (e.g., 'Size: Large, Color: Blue').
     *
     * @x-autobe-specification Placeholder for future shopping_mall_product_variants.option_values (text column). Stores variant option specifications as formatted string. Currently served by backend mock data until database table is implemented.
     */
    option_values: string;

    /**
     * Optional price override for this variant. If null, uses the product's base price.
     *
     * @x-autobe-specification Placeholder for future shopping_mall_product_variants.price_override (nullable number column). When set, this price is used instead of product's base_price. Currently served by backend mock data until database table is implemented.
     */
    price_override: number | null;

    /**
     * Current available stock quantity for this variant.
     *
     * @x-autobe-specification Placeholder for future shopping_mall_product_variants.stock_quantity (integer column with minimum 0 constraint). Represents current available inventory count. Currently served by backend mock data until database table is implemented.
     */
    stock_quantity: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Boolean indicating whether this variant is currently in stock (stock_quantity > 0).
     *
     * @x-autobe-specification Computed boolean field. Calculation: available = (stock_quantity > 0). This field is not stored in the database but derived from the stock_quantity column at query time. Returns true when the variant has inventory available for purchase, false when out of stock.
     */
    available: boolean;
  };
}
