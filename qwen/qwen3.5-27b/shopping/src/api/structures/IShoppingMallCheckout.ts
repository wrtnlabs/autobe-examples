import { tags } from "typia";

export namespace IShoppingMallCheckout {
  /**
   * Checkout request containing shipping address selection and payment information for order placement.
   *
   * This request initiates the checkout process by specifying which shipping address to use and providing payment credentials. The system validates that the address belongs to the authenticated customer, checks cart item availability, processes payment through the external gateway, and creates the order with all order items.
   *
   * The shipping address is locked at checkout time and cannot be changed after order placement. Payment must be successful for the order to be created; if payment fails, the cart remains intact and no order is created.
   */
  export type ICreate = {
    /**
     * The shipping address to use for order delivery.
     *
     * This UUID references a customer address from the authenticated customer's address book. The address must be active (not soft-deleted) and belongs to the customer placing the order. The shipping address is locked at checkout time and cannot be modified after the order is created.
     *
         * @x-autobe-specification UUID reference to
         *   shopping_mall_customer_addresses table. Validated to exist, belong
         *   to authenticated customer (from JWT), and not be soft-deleted
         *   (deleted_at IS NULL). This value is used to set
         *   shopping_mall_orders.shopping_mall_customer_address_id FK when
         *   creating the order.
     */
    shopping_mall_customer_address_id: string & tags.Format<"uuid">;

    /**
     * Payment token for processing the order payment.
     *
     * This token is issued by the external payment gateway and used to authorize the payment for the total order amount. The payment is processed before the order is created. If payment fails, no order is created and the cart remains unchanged. If payment succeeds, the order is created and the cart is cleared.
     *
         * @x-autobe-specification Payment token from external payment gateway.
         *   This token is processed through the payment gateway before order
         *   creation. If payment fails, the order is not created and the cart
         *   remains intact. If payment succeeds, the order and order items are
         *   created, inventory is deducted, and the cart is cleared.
     */
    payment_token: string;
  };
}
