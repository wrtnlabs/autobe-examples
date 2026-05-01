import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallOrder } from "../../../../../api/structures/IShoppingMallOrder";
import { AdminAuth } from "../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../decorators/payload/AdminPayload";
import { postShoppingMallAdminOrdersOrderIdForceCancel } from "../../../../../providers/postShoppingMallAdminOrdersOrderIdForceCancel";

@Controller("/shoppingMall/admin/orders/:orderId/force-cancel")
export class ShoppingmallAdminOrdersForce_cancelController {
  /**
   * Force-cancel an entire order as an administrator, cancelling all order items regardless of their current status.
   *
   * This operation provides administrators with emergency override capability. It cancels every order item in the specified order — including items that are paid, shipped, delivered, or even already refunded — bypassing the normal seller approval workflow entirely. For each cancelled item, the system processes a customer refund and restores the variant's stock quantity via a positive inventory record.
   *
   * **Authorization**
   *
   * Only administrators (regular or super) can invoke this operation. Customer and seller actors receive a 403 Forbidden response.
   *
   * **Processing**
   *
   * When executed, the operation iterates through all order items. For items that already have a cancellation request (whether pending or rejected by the seller), the request is overridden and marked as approved. For items without an existing cancellation request, one is created on the administrator's behalf and immediately approved. A cancellation request snapshot is created for every cancelled item, recording the administrator's identity and the timestamp of the action for audit purposes.
   *
   * **Side Effects**
   *
   * Each cancelled item triggers a refund to the customer and a stock restoration via a positive inventory record. The inventory record's reason field documents that the restoration was due to administrator force-cancellation.
   *
   * **Order Status Derivation**
   *
   * After all items are processed, the order's status is re-evaluated. Since all items will be in "cancelled" status, the order status becomes "cancelled". If some items were already cancelled before this operation, the result is the same — all items end up cancelled.
   *
   * **Atomicity**
   *
   * The entire force-cancellation — including all item status changes, cancellation request creation, snapshot creation, refund processing, and inventory record creation — executes as a single atomic transaction. If any step fails, all changes roll back.
   *
   * @param connection
   * @param orderId The unique identifier of the order to force-cancel. This is the UUID primary key of the shopping_mall_orders record.
   * @param body Force-cancellation details including the reason for the administrative action. The reason is used when creating cancellation requests for order items that do not already have one.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification Process administrator force-cancellation of an
     *   entire order. This operation cancels ALL order items in the order
     *   regardless of their current status.
   *
   * Implementation steps:
   * 1. Verify the authenticated actor is an administrator (regular or super). Reject with 403 if not.
   * 2. Look up the order by orderId (UUID). Return 404 if not found.
   * 3. Load all order items for the order with their current status and variant references.
   * 4. Begin a database transaction — all item cancellations, inventory records, refund processing, and snapshot creation must succeed atomically or roll back entirely.
   * 5. For each order item that is NOT already in "cancelled" status:
   *    a. Check if a cancellation request already exists for this order item (any status). If one exists and is "rejected", override it: change its status to "approved", update updated_at.
   *    b. If no cancellation request exists, create a new shopping_mall_cancellation_requests record with status "approved", using the reason from the request body, linked to the order item.
   *    c. Create a shopping_mall_cancellation_request_snapshots record capturing: the reason text, status "approved", and the current timestamp. The snapshot records that this was force-approved by an administrator — include administrator identity in the reason or a dedicated field context.
   *    d. Set the order item's status to "cancelled".
   *    e. Process a refund for the item (external payment gateway integration).
   *    f. Create a shopping_mall_inventory_records entry for the item's variant: positive quantity_change equal to the order item's quantity, reason describing the administrator force-cancellation, and the current timestamp.
   * 6. Skip any order items already in "cancelled" status — they have already been cancelled and should not be double-processed.
   * 7. After processing all items, derive the new order status. Since all items are now "cancelled", the order status MUST be set to "cancelled".
   * 8. Commit the transaction.
   * 9. Return the updated order with all order items.
   *
   * Edge cases:
   * - If all items are already "cancelled", the operation is effectively a no-op but still returns success with the unchanged order.
   * - Items in "refunded" or "delivered" status are still force-cancellable — administrator force-cancel overrides all statuses.
   * - Suspended seller's items are processed identically (per section 423).
   * - Items already assigned to a shipment ("shipped" status) can still be force-cancelled — the shipment relationship is severed.
   * - The order's deleted_at is never populated — orders are permanent records.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async forceCancel(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallOrder.IForceCancel,
  ): Promise<IShoppingMallOrder> {
    try {
      return await postShoppingMallAdminOrdersOrderIdForceCancel({
        admin,
        orderId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
