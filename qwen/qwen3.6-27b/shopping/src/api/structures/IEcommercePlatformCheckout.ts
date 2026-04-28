import { tags } from "typia";

export namespace IEcommercePlatformCheckout {
  /**
   * Checkout request specifying the delivery destination for the customer's shopping cart.
   *
   * This request body is submitted when a customer initiates checkout. It captures the shipping address UUID that will be immutably associated with the newly created order. The customer's identity is resolved from the active session, and all order metadata including order number, line items, and fulfillment status are generated automatically by the backend.
   */
  export type ICreate = {
    /**
     * The UUID of the shipping address where the customer's order items will be delivered.
     *
     * This address is captured immutably at checkout time and becomes the contractual delivery destination for the order. The address must be a valid, active shipping address belonging to the authenticated customer's account.
     *
         * @x-autobe-specification UUID string extracted from the request body.
         *   Backend maps this value to
         *   ecommerce_platform_orders.ecommerce_platform_shipping_address_id
         *   during the checkout transaction. Validates that the address exists,
         *   is not soft-deleted (deleted_at IS NULL), and belongs to the
         *   authenticated customer via ecommerce_platform_customer_profiles
         *   lookup. If validation fails, the entire checkout is rejected.
     */
    shipping_address_id: string & tags.Format<"uuid">;
  };
}
