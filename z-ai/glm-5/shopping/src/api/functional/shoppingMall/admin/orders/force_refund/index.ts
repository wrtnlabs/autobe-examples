import { HttpError, IConnection } from "@nestia/fetcher";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia, { tags } from "typia";

import { IShoppingMallOrder } from "../../../../../structures/IShoppingMallOrder";

/**
 * Administrator force-refunds an entire order, processing refunds for all order items and restoring stock quantities without requiring seller approval or adhering to the 7-day refund window.
 *
 * This operation is available only to administrators (both regular and super admin grades) and serves as an override mechanism for resolving disputes, handling exceptional circumstances, or addressing platform-level issues that require immediate refund action.
 *
 * The force-refund operation bypasses normal refund restrictions: it does not require seller approval, does not enforce the 7-day refund window applicable to customer-initiated refunds, and can be applied to orders with items in 'delivered' status. This is distinct from the standard customer-initiated refund process which operates at the individual order item level.
 *
 * When executed, the system performs the following atomic operations:
 *
 * 1. **Order Item Status Update:** All order items within the specified order are changed to 'refunded' status, regardless of their previous status (paid, shipped, or delivered).
 *
 * 2. **Refund Processing:** The system initiates refund processing for all order items. The refund amount is calculated as the sum of (quantity × unit_price) for each order item.
 *
 * 3. **Stock Restoration:** For each order item's variant, a positive inventory record is created to restore the stock quantity. The inventory record includes the variant reference, positive quantity equal to the order item quantity, reason indicating force-refund, and timestamp.
 *
 * 4. **Order Status Derivation:** The overall order status is updated to 'refunded' since all items now have 'refunded' status.
 *
 * 5. **Audit Trail Creation:** An administrative audit log entry is created recording the force-refunding administrator's identity, the target order, the provided reason, IP address, and timestamp.
 *
 * 6. **Notifications:** Both the customer and affected seller(s) are notified of the force-refund action.
 *
 * This operation requires administrator authentication and authorization. The administrator must provide a reason for the force-refund, which is recorded for audit and compliance purposes.
 *
 * @param props.connection
 * @param props.orderId Unique identifier of the order to be force-refunded. The order must exist in the system and contain order items eligible for refund processing.
 * @param props.body Force-refund request containing the mandatory reason for the administrative action
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification ## Implementation Steps:
 *
 * 1. **Authentication & Authorization:**
 *    - Extract administrator identity from JWT token
 *    - Verify user has 'admin' or 'super_admin' role
 *    - Return 401 Unauthorized if not authenticated
 *    - Return 403 Forbidden if not an administrator
 *
 * 2. **Order Validation:**
 *    - Query shopping_mall_orders table by orderId
 *    - Return 404 Not Found if order does not exist
 *    - Validate order contains order items (should always have at least one)
 *
 * 3. **Atomic Transaction - Force Refund Processing:**
 *
 *    a. **Update All Order Items:**
 *    ```sql
 *    UPDATE shopping_mall_order_items
 *    SET status = 'refunded'
 *    WHERE shopping_mall_order_id = :orderId
 *    ```
 *
 *    b. **Create Inventory Restoration Records:**
 *    For each order item:
 *    - Query variant reference from order item
 *    - Create positive inventory record in shopping_mall_product_inventory_histories:
 *      - shopping_mall_product_variant_id: variant_id
 *      - quantity_change: +order_item.quantity
 *      - reason: 'Order force-refund - Order #{order_number}'
 *      - created_at: now()
 *
 *    c. **Update Order Status:**
 *    ```sql
 *    UPDATE shopping_mall_orders
 *    SET status = 'refunded', updated_at = now()
 *    WHERE id = :orderId
 *    ```
 *
 *    d. **Create Admin Audit Log:**
 *    Insert into shopping_mall_admin_audit_logs:
 *    - shopping_mall_admin_id: administrator_id from token
 *    - action: 'order_force_refund'
 *    - target_type: 'order'
 *    - target_id: orderId
 *    - details: JSON with reason and order_number
 *    - ip: client_ip_address
 *    - created_at: now()
 *
 * 4. **Response Construction:**
 *    - Query complete order with all order items
 *    - Include shipping address snapshot
 *    - Include all order items with updated 'refunded' status
 *    - Return IShoppingMallOrder structure
 *
 * 5. **Notifications (Async):**
 *    - Send notification to customer about refund processing
 *    - Send notification to affected seller(s) about order refund
 *
 * **Error Handling:**
 * - 404: Order not found
 * - 401: Not authenticated
 * - 403: Not authorized (not an admin)
 * - 400: Invalid request body (missing reason)
 * - 500: Database transaction failure (rollback all changes)
 *
 * **Database Considerations:**
 * - Use database transaction to ensure atomicity
 * - All updates must succeed or all rollback
 * - Lock order row during processing to prevent concurrent modifications
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
        props.body,
      );
}
export namespace forceRefund {
  export type Props = {
    /**
     * Unique identifier of the order to be force-refunded. The order must exist in the system and contain order items eligible for refund processing.
     */
    orderId: string & tags.Format<"uuid">;

    /**
     * Force-refund request containing the mandatory reason for the administrative action
     */
    body: IShoppingMallOrder.IForceRefund;
  };
  export type Body = IShoppingMallOrder.IForceRefund;
  export type Response = IShoppingMallOrder;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/admin/orders/:orderId/force-refund",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
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
