import { HttpError, IConnection } from "@nestia/fetcher";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia, { tags } from "typia";

import { IEcommerceMallOrder } from "../../../../structures/IEcommerceMallOrder";

export * as items from "./items/index";
export * as force_cancel from "./force_cancel/index";
export * as force_refund from "./force_refund/index";

/**
 * Administratively update an existing order with force-actions or corrections for order management oversight.
 *
 * This operation enables administrators (regular or super) to override order status, force-cancel orders, or force-refund orders and individual items when necessary for dispute resolution or policy enforcement.
 *
 * **Authorization Requirements**: Only administrators with regular or super grade privileges can access this endpoint. The operation validates the caller's admin role and logs all modifications in the audit trail for compliance purposes.
 *
 * **Order Entity Structure**: The operation modifies the `ecommerce_mall_orders` table which stores main order records with unique order numbers, embedded shipping address snapshots, total price, and overall status derived from order items. The shipping address fields (shipping_recipient_name, shipping_phone_number, shipping_street_address, shipping_city, shipping_state, shipping_postal_code, shipping_country) are captured at order creation time and remain locked thereafter, preserving the address even if the customer later modifies their saved addresses in the `ecommerce_mall_addresses` table.
 *
 * **Force-Action Behavior**: When updating the `status` field to `cancelled` or `refunded`:
 * - For `cancelled`: The system automatically creates inventory records in `ecommerce_mall_inventory_records` to restore stock quantities for all order items, and creates audit snapshots in `ecommerce_mall_order_item_snapshots` capturing the cancellation action
 * - For `refunded`: The system processes the refund, restores stock via inventory records, and creates snapshots of the refund action
 * - The order `status` field is derived from order item statuses: paid, shipped, delivered, cancelled, refunded, or partiallyCompleted
 *
 * **Status Transition Rules**: The operation enforces valid status transitions based on order lifecycle:
 * - `paid` → `cancelled`, `shipped`, `refunded`
 * - `shipped` → `delivered`, `cancelled`, `refunded`
 * - `delivered` → `refunded`
 * - Any status → `cancelled` (admin force-action)
 * - Any status → `refunded` (admin force-action)
 *
 * **Immutability Constraints**: The following fields cannot be modified through this operation:
 * - `order_number`: Unique identifier generated at order creation (enforced by @@unique constraint)
 * - `ecommerce_mall_customer_id`: Customer association is immutable
 * - `created_at`, `updated_at`: System-managed timestamps
 * - All `shipping_*` fields: Address locked at order time
 *
 * **Related Operations**:
 * - Pre-requisite: `GET /ecommerceMall/admin/orders/{orderId}` to retrieve current order state
 * - For item-level actions: Update operations on `ecommerce_mall_order_items` table
 * - For customer-initiated cancellation: `POST /order-items/{orderItemId}/cancellation-requests`
 * - For customer-initiated refund: `POST /order-items/{orderItemId}/refund-requests`
 *
 * **Expected Behavior**: Upon successful update, the system validates admin authorization, checks status transition validity, updates the order status, triggers cascading effects (inventory restoration in `ecommerce_mall_inventory_records`, snapshot creation in `ecommerce_mall_order_item_snapshots`), and returns the updated order with new status and timestamps.
 *
 * @param props.connection
 * @param props.orderId Unique identifier of the order to update (UUID format)
 * @param props.body Administrative update payload containing new status value and optional administrative notes for audit trail
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implementation steps for PUT /orders/{orderId}:
 *
 * 1. **Authorization Check**: Verify caller has admin role (regular or super). Reject with 403 Forbidden if not admin.
 *
 * 2. **Order Retrieval**: Fetch order by UUID from ecommerce_mall_orders table. Return 404 Not Found if not exists.
 *
 * 3. **Soft Delete Check**: If order.deleted_at is not null, return 404 (treat as not found).
 *
 * 4. **Request Validation**:
 *    - Validate status field is present and valid enum value
 *    - Ensure no immutable fields (order_number, shipping_*, customer_id) are in request body
 *    - Validate status transition: check current status against allowed transitions
 *
 * 5. **Force-Action Processing** (if status changes to cancelled or refunded):
 *    - For each order item in the order:
 *      a. Create inventory record with positive quantityChange equal to item.quantity
 *      b. Set reason to "admin_force_cancel" or "admin_force_refund"
 *      c. Update order_item.status to the new status
 *      d. Create order_item_snapshot capturing before/after values with changedBy=admin_id
 *    - If order contains items from multiple sellers, process all items uniformly
 *
 * 6. **Status Update**: Update order.status and order.updated_at in database within transaction.
 *
 * 7. **Order Status Derivation** (if updating individual items via other means): Recalculate order status based on order item statuses:
 *    - All items cancelled → order.status = 'cancelled'
 *    - All items refunded → order.status = 'refunded'
 *    - All items delivered → order.status = 'delivered'
 *    - All items shipped → order.status = 'shipped'
 *    - All items paid → order.status = 'paid'
 *    - Mixed statuses → order.status = 'partiallyCompleted'
 *
 * 8. **Snapshot Creation**: Create ecommerce_mall_order_item_snapshots for each affected item with:
 *    - snapshotType = 'orderItem'
 *    - previousValues = JSON of old state
 *    - currentValues = JSON of new state
 *    - changedBy = admin_id
 *
 * 9. **Transaction Commit**: Ensure all changes (status update, inventory records, snapshots) are atomic.
 *
 * 10. **Response**: Return updated order object with new status and timestamps.
 *
 * Edge cases:
 * - If order already in target status, return 400 Bad Request with message "Order already in target status"
 * - If inventory restoration fails, rollback entire transaction
 * - If snapshot creation fails, rollback entire transaction
 * - Handle concurrent modifications using optimistic locking (check updated_at timestamp)
 * @path /ecommerceMall/admin/orders/:orderId
 * @accessor api.functional.ecommerceMall.admin.orders.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * Unique identifier of the order to update (UUID format)
     */
    orderId: string & tags.Format<"uuid">;

    /**
     * Administrative update payload containing new status value and optional administrative notes for audit trail
     */
    body: IEcommerceMallOrder.IUpdate;
  };
  export type Body = IEcommerceMallOrder.IUpdate;
  export type Response = IEcommerceMallOrder;

  export const METADATA = {
    method: "PUT",
    path: "/ecommerceMall/admin/orders/:orderId",
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
    `/ecommerceMall/admin/orders/${encodeURIComponent(props.orderId ?? "null")}`;
  export const random = (): IEcommerceMallOrder =>
    typia.random<IEcommerceMallOrder>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
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

/**
 * Submit a cancellation request for an entire order. This operation allows customers to request cancellation of all items within an order when they are still in 'paid' status (before shipment). The system will create individual cancellation requests for each order item and track their approval workflow.
 *
 * This endpoint validates that all order items are eligible for cancellation (status must be 'paid', not 'shipped', 'delivered', 'cancelled', or 'refunded'). If any item is ineligible, the entire cancellation request is rejected. A cancellation reason is required to explain why the customer wants to cancel the order.
 *
 * Upon successful submission, the system creates cancellation request records for each order item with 'pending' status. The seller will then review and either approve or reject each cancellation request. Approved cancellations will restore stock quantities via inventory records and process refunds for the customer.
 *
 * Related operations: GET /orders/{orderId} to view order details before cancellation, PATCH /orders/{orderId}/cancellation-requests to view pending cancellation requests for the order.
 *
 * @param props.connection
 * @param props.orderId Target order's unique identifier (UUID scope)
 * @param props.body Cancellation request information including reason for cancellation
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification 1. Validate orderId exists and belongs to authenticated customer. 2. Fetch order with all order items. 3. Verify all order items have status 'paid' (not shipped/delivered). 4. Verify no existing cancellation requests for any order item. 5. For each order item, create ecommerce_mall_order_item_cancellation_request with reason and pending status. 6. Create snapshot for each cancellation request. 7. Update order status to reflect cancellation workflow. 8. Return updated order information. Edge cases: Order already cancelled/refunded, items in shipped/delivered status, duplicate cancellation requests.
 * @path /ecommerceMall/admin/orders/:orderId/cancel
 * @accessor api.functional.ecommerceMall.admin.orders.cancel
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function cancel(
  connection: IConnection,
  props: cancel.Props,
): Promise<cancel.Response> {
  return true === connection.simulate
    ? cancel.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...cancel.METADATA,
          path: cancel.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace cancel {
  export type Props = {
    /**
     * Target order's unique identifier (UUID scope)
     */
    orderId: string & tags.Format<"uuid">;

    /**
     * Cancellation request information including reason for cancellation
     */
    body: IEcommerceMallOrder.ICancel;
  };
  export type Body = IEcommerceMallOrder.ICancel;
  export type Response = IEcommerceMallOrder;

  export const METADATA = {
    method: "POST",
    path: "/ecommerceMall/admin/orders/:orderId/cancel",
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
    `/ecommerceMall/admin/orders/${encodeURIComponent(props.orderId ?? "null")}/cancel`;
  export const random = (): IEcommerceMallOrder =>
    typia.random<IEcommerceMallOrder>();
  export const simulate = (
    connection: IConnection,
    props: cancel.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: cancel.path(props),
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

/**
 * Force-refund an entire order for policy enforcement.
 *
 * This operation allows administrators to override the normal refund request workflow and process immediate refunds for entire orders. Unlike customer-initiated refund requests that require seller approval and are subject to the 7-day delivery window, administrator force-refunds can be applied to any order regardless of status for policy enforcement, dispute resolution, or administrative corrections.
 *
 * When executed, the system processes refunds for all order items in the order, restores stock quantities via inventory records, updates all item statuses to 'refunded', and changes the overall order status to 'refunded'. A snapshot is created for each action to maintain an audit trail of the administrator's decision.
 *
 * The operation requires a reason field documenting the justification for the force-refund action. This reason is recorded in the system for audit purposes and visibility to other administrators.
 *
 * After successful processing, the system integrates with the payment gateway to process refund transactions for the total order amount. Both the customer and seller receive notifications indicating that an administrator initiated the force-refund action.
 *
 * This endpoint is restricted to administrator accounts only. Regular customers and sellers cannot access this operation.
 *
 * @param props.connection
 * @param props.orderId Target order's unique identifier (UUID format)
 * @param props.body Force-refund request with reason for administrator action
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement force-refund operation for administrators to override normal refund workflows. Steps:
 *
 * 1. Validate orderId exists and retrieve the order with all orderItems
 * 2. Verify caller has admin authorization (regular or super admin)
 * 3. Validate all order items are eligible for refund (status must be 'paid', 'shipped', or 'delivered')
 * 4. For each order item:
 *    - Create refund request record with status 'approved'
 *    - Record daysSinceDelivery from delivery timestamp (null for non-delivered items)
 *    - Update orderItem status to 'refunded'
 *    - Create inventory record to restore stock quantity
 *    - Create snapshot of the refund action with changedBy=admin
 * 5. Update order status to 'refunded' if all items refunded
 * 6. Process payment gateway refund transaction for total_price
 * 7. Record refund transaction status in order history
 * 8. Notify customer and seller of administrator force-refund action
 * 9. Return updated order with new status
 *
 * Edge cases:
 * - If any item already 'cancelled' or 'refunded', reject entire operation
 * - If refund transaction fails, rollback all status changes and notify admin
 * - Validate reason text is not empty (min length 10 characters)
 * @path /ecommerceMall/admin/orders/:orderId/refund
 * @accessor api.functional.ecommerceMall.admin.orders.refund
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function refund(
  connection: IConnection,
  props: refund.Props,
): Promise<refund.Response> {
  return true === connection.simulate
    ? refund.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...refund.METADATA,
          path: refund.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace refund {
  export type Props = {
    /**
     * Target order's unique identifier (UUID format)
     */
    orderId: string & tags.Format<"uuid">;

    /**
     * Force-refund request with reason for administrator action
     */
    body: IEcommerceMallOrder.IRefund;
  };
  export type Body = IEcommerceMallOrder.IRefund;
  export type Response = IEcommerceMallOrder;

  export const METADATA = {
    method: "POST",
    path: "/ecommerceMall/admin/orders/:orderId/refund",
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
    `/ecommerceMall/admin/orders/${encodeURIComponent(props.orderId ?? "null")}/refund`;
  export const random = (): IEcommerceMallOrder =>
    typia.random<IEcommerceMallOrder>();
  export const simulate = (
    connection: IConnection,
    props: refund.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: refund.path(props),
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
