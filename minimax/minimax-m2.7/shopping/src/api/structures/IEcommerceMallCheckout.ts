import { tags } from "typia";

export namespace IEcommerceMallCheckout {
  /**
   * Checkout request containing the selected shipping address for the order. If shippingAddressId is not provided, the customer's default shipping address will be used.
   */
  export type ICreate = {
    /**
     * UUID of the shipping address to use for this order. If not provided, the customer's default address will be used.
     *
     * @x-autobe-database-schema-property ecommerce_mall_shipping_address_id
     * @x-autobe-specification Direct mapping to ecommerce_mall_shipping_address_id FK column in ecommerce_mall_orders. Optional: if omitted, system retrieves customer's default address where is_default=true. Must validate address belongs to authenticated customer and is not soft-deleted (deleted_at is null).
     */
    shippingAddressId?: (string & tags.Format<"uuid">) | undefined;
  };
}
