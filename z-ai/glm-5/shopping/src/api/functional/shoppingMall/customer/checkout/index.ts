import { HttpError, IConnection } from "@nestia/fetcher";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia from "typia";

import { IShoppingMallCheckout } from "../../../../structures/IShoppingMallCheckout";
import { IShoppingMallOrder } from "../../../../structures/IShoppingMallOrder";

/**
 * Create a new order from the authenticated customer's shopping cart.
 *
 * This operation converts the customer's shopping cart into a formal purchase order. The customer must have at least one item in their cart, all items must be available (not marked unavailable), and sufficient stock must exist for all requested quantities.
 *
 * Before order creation, the system validates cart contents, verifies stock availability for all product variants, and processes payment through an external payment gateway. If payment fails, no order is created and the customer can retry. If payment succeeds, the order is created with all items transitioning from cart items to order items.
 *
 * The shipping address is captured immutably at checkout time. The address fields are copied directly into the order record, preserving the destination details exactly as they were provided. This ensures historical accuracy even if the customer later modifies or deletes the address from their address book.
 *
 * Upon successful order creation, the system performs several automated actions:
 * - Stock quantities are decreased for each purchased product variant through inventory records
 * - Purchased items are removed from the customer's shopping cart
 * - Order item snapshots are created to preserve product names, descriptions, variant options, prices, and seller shop information at the time of purchase for dispute resolution and historical accuracy
 * - Each order item receives a status of 'paid', indicating successful payment and awaiting seller shipment
 *
 * The order receives a unique order number for customer reference and tracking. The overall order status is 'paid', derived from all order items being in the 'paid' state.
 *
 * Prerequisites:
 * - Customer must be authenticated
 * - Cart must contain at least one item
 * - All cart items must be available (variant exists and not marked unavailable)
 * - All cart item quantities must not exceed available stock
 * - A valid shipping address must be selected
 *
 * Related operations:
 * - GET /cart - View cart contents before checkout
 * - GET /addresses - View available shipping addresses
 * - GET /orders/{orderId} - View created order details
 *
 * @param props.connection
 * @param props.body Checkout request containing the shipping address selection for order delivery
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implementation Steps:
 *
 * 1. **Authentication & Authorization**: Verify customer is authenticated. Reject if not logged in.
 *
 * 2. **Cart Retrieval**: Fetch customer's cart with all cart items, including product variant details, product info, and seller info.
 *
 * 3. **Cart Validation**:
 *    - Check cart is not empty (return error if empty)
 *    - Check all items have unavailable=false (reject checkout with specific item list if any unavailable)
 *    - Check stock quantities for all variants (fetch current stock from inventory_records sum)
 *    - Verify each cart item's quantity <= variant's current stock (reject with insufficient stock details if any fail)
 *
 * 4. **Address Validation**:
 *    - Fetch the address by addressId
 *    - Verify address belongs to the authenticated customer
 *    - Verify address is not deleted (deleted_at is null)
 *
 * 5. **Order Number Generation**: Generate unique order number (e.g., timestamp-based or sequential with prefix).
 *
 * 6. **Total Price Calculation**: Sum (cart item quantity × variant price or product base price) for all items.
 *
 * 7. **Payment Processing** (External Integration):
 *    - Call external payment gateway with order total
 *    - Handle payment success/failure
 *    - On failure: return error without creating order
 *    - On success: proceed with order creation
 *
 * 8. **Database Transaction** (all-or-nothing):
 *    a. Create order record with:
 *       - order_number (generated)
 *       - total_price (calculated)
 *       - status = 'paid'
 *       - shipping address fields (copied from selected address)
 *
 *    b. For each cart item, create order_item with:
 *       - order_id, product_id, variant_id, seller_id
 *       - quantity and price (captured at purchase time)
 *       - status = 'paid'
 *
 *    c. For each order item, create order_item_snapshot with:
 *       - product_name, product_description, price
 *       - seller_shop_name, seller_logo_image
 *       - Create variant option records in order_item_snapshot_variant_options
 *
 *    d. For each cart item, create inventory_record with:
 *       - variant_id, order_id
 *       - quantity_change = -quantity (negative for deduction)
 *       - reason = 'Order placed'
 *
 *    e. Delete cart items that were converted to order items
 *
 * 9. **Response**: Return complete order with order items.
 *
 * Edge Cases:
 * - Concurrent checkout: Use transaction isolation to prevent stock race conditions
 * - Payment timeout: Implement idempotency key to prevent duplicate orders
 * - Partial checkout not supported: All or nothing approach
 * @path /shoppingMall/customer/checkout
 * @accessor api.functional.shoppingMall.customer.checkout.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Checkout request containing the shipping address selection for order delivery
     */
    body: IShoppingMallCheckout.ICreate;
  };
  export type Body = IShoppingMallCheckout.ICreate;
  export type Response = IShoppingMallOrder;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/customer/checkout",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/customer/checkout";
  export const random = (): IShoppingMallOrder =>
    typia.random<IShoppingMallOrder>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
