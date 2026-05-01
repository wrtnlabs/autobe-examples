import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IShoppingMallOrder } from "../../../../../structures/IShoppingMallOrder";

/**
 * Force-refunds an entire order as an administrator override, bypassing seller approval and the 7-calendar-day refund window.
 *
 * This administrative operation processes every order item in the specified order regardless of each item's current status — paid, shipped, delivered, cancelled, or already refunded. For each item, the status is changed to "refunded", the refund is processed, and stock quantities are restored through positive inventory records referencing the associated product variant.
 *
 * A refund request record is created or updated to "approved" status for each item, and an immutable snapshot is captured recording the state at the moment of the administrator's action for audit and dispute resolution purposes.
 *
 * The operation is atomic — all items are processed within a single database transaction, and the entire operation rolls back if any individual item processing fails.
 *
 * After successful processing, the order's derived status is recalculated: if all items are now refunded, the order status becomes "refunded"; if some items remain in other states (which should not occur under normal circumstances since all items are processed), the order status reflects the mixed state as "partially_completed".
 *
 * This endpoint is restricted to administrator actors only.
 *
 * @param props.connection
 * @param props.orderId Unique identifier of the order to force-refund, in UUID format. Must reference an existing order in the system.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Administrator-only endpoint that force-refunds every
 *   order item in the specified order, overriding all normal refund constraints
 *   including seller approval flow and the 7-calendar-day delivery window.
 *
 * **Authorization**: Only administrators may access this endpoint. The caller's administrator identity must be available for audit trail recording.
 *
 * **Order retrieval**: Query shopping_mall_orders by id matching the given orderId. If not found, return 404. Load all shopping_mall_order_items where shopping_mall_order_id matches the order, including their quantity, price, shopping_mall_product_variant_id, and current status.
 *
 * **Processing per order item** (execute for each item in a single transaction):
 *
 * 1. **Refund request resolution**: Query shopping_mall_refund_requests where shopping_mall_order_item_id matches the item.
 *    - If an existing refund request is found: update its status to "approved", set responded_at to the current timestamp, and set updated_at to the current timestamp.
 *    - If no refund request exists: create a new shopping_mall_refund_requests record with status "approved", responded_at set to the current timestamp, reason set to "Administrator force-refund", shopping_mall_order_item_id referencing the item, and created_at set to the current timestamp.
 *
 * 2. **Snapshot creation**: Create an immutable shopping_mall_refund_request_snapshots record capturing:
 *    - shopping_mall_refund_request_id: the ID from step 1
 *    - seller_id: derived through the FK chain (order item → shopping_mall_product_variants.product → shopping_mall_products → shopping_mall_seller_profiles → seller user ID)
 *    - reason: the reason text from the refund request
 *    - status: "approved"
 *    - created_at: current timestamp
 *
 * 3. **Order item status update**: Set the order item's status to "refunded" and updated_at to the current timestamp.
 *
 * 4. **Inventory restoration**: Create a positive inventory record in shopping_mall_inventory_records:
 *    - shopping_mall_product_variant_id: from the order item
 *    - quantity_change: +{order item quantity} (positive integer)
 *    - reason: "Administrator force-refund for order {order.code}"
 *    - created_at: current timestamp
 *
 * 5. **Audit trail**: Record the administrator action in shopping_mall_admin_audit_logs with action type "force_refund_order", the order ID, and the acting administrator's ID.
 *
 * **Order status recalculation**: After all items are processed, update the order's status:
 *    - All items "refunded" → order status "refunded"
 *    - Mixed states → order status "partially_completed"
 *    Set updated_at to the current timestamp.
 *
 * **Atomicity**: Wrap all operations in a single database transaction. If any step fails — refund request creation/update, snapshot creation, item status update, inventory record creation, or order status update — roll back the entire transaction and return an appropriate error response.
 *
 * **Edge cases**:
 * - Order not found → 404 error with message "Order not found"
 * - Order has no order items → 404 error with message "Order has no items"
 * - All order items already have status "refunded" → idempotent; return the order as-is without creating duplicate inventory records or snapshots
 * - Items with "cancelled" status → processed like any other item; status changes to "refunded" per administrator override authority (section 432)
 * @path /shoppingMall/admin/orders/:orderId/force-refund
 * @accessor api.functional.shoppingMall.admin.orders.force_refund.forceRefund
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function forceRefund(
  connection: IConnection,
  props: forceRefund.Props,
): Promise<forceRefund.Response> {
  return true === connection.simulate
    ? forceRefund.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...forceRefund.METADATA,
          path: forceRefund.path(props),
          status: null,
        },
      );
}
export namespace forceRefund {
  export type Props = {
    /**
     * Unique identifier of the order to force-refund, in UUID format. Must reference an existing order in the system.
     */
    orderId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallOrder;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/admin/orders/:orderId/force-refund",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/admin/orders/${encodeURIComponent(props.orderId ?? "null")}/force-refund`;
  export const random = (): IShoppingMallOrder =>
    typia.random<IShoppingMallOrder>();
  export const simulate = (
    connection: IConnection,
    props: forceRefund.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: forceRefund.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("orderId")(() => typia.assert(props.orderId));
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
