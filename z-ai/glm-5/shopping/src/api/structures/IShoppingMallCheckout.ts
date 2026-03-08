import { tags } from "typia";

export namespace IShoppingMallCheckout {
  /**
   * Request body for creating a new order from the authenticated customer's shopping cart. The customer can specify a shipping address by providing address_id, or leave it empty to use their default shipping address.
   */
  export type ICreate = {
    /**
     * ID of the shipping address to use for this order. If not provided, the customer's default shipping address will be used.
     *
     * @x-autobe-specification UUID reference to shopping_mall_addresses.id for the shipping address to use. The address must belong to the authenticated customer (shopping_mall_customer_id matches customer's id) If not provided, system resolves to the customer's default address (is_default = true).
     */
    address_id?: (string & tags.Format<"uuid">) | null | undefined;
  };
}
