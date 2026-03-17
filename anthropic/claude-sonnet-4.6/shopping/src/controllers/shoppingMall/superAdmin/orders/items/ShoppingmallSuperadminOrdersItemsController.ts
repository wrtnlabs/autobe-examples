import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallOrderItem } from "../../../../../api/structures/IShoppingMallOrderItem";
import { SuperadminAuth } from "../../../../../decorators/SuperadminAuth";
import { SuperadminPayload } from "../../../../../decorators/payload/SuperadminPayload";
import { postShoppingMallSuperAdminOrdersOrderIdItemsItemIdForceCancel } from "../../../../../providers/postShoppingMallSuperAdminOrdersOrderIdItemsItemIdForceCancel";
import { postShoppingMallSuperAdminOrdersOrderIdItemsItemIdForceRefund } from "../../../../../providers/postShoppingMallSuperAdminOrdersOrderIdItemsItemIdForceRefund";

@Controller("/shoppingMall/superAdmin/orders/:orderId/items/:itemId")
export class ShoppingmallSuperadminOrdersItemsController {
  /**
   * Force-cancel an individual order item as an administrator, bypassing the standard cancellation request workflow.
   *
   * This operation allows administrators (both regular and super administrators) to immediately cancel a specific order item without requiring a pending cancellation request from the customer and without requiring seller approval. Administrator force-cancellation is an exceptional intervention mechanism designed for handling policy violations, disputes, fraud cases, or other circumstances that require immediate administrative action.
   *
   * When an administrator force-cancels an order item, the following changes occur atomically: the targeted order item's `status` field in `shopping_mall_order_items` is set to `'cancelled'`; a positive inventory record is appended to `shopping_mall_inventory_records` for the associated product variant (with `reason_type` set to `'order_cancellation'`) to restore the stock quantity; the overall derived `status` field on the parent `shopping_mall_orders` record is recalculated based on the combined statuses of all its child order items. If all items in the order become cancelled, the order status becomes `'cancelled'`; if some items remain in active statuses while others are cancelled, the order status reflects `'partially_completed'`.
   *
   * This operation does NOT require an existing `shopping_mall_cancellation_requests` record for the target item. It bypasses the entire cancellation request lifecycle (pending → approved/rejected) and acts directly on the order item status. Any existing pending cancellation request for this item is effectively superseded by this force-cancellation.
   *
   * Access is strictly limited to authenticated administrators and super administrators. Customers and sellers cannot invoke this endpoint. Attempting to use this endpoint as a customer or seller will result in an authorization error.
   *
   * The administrator must supply a mandatory reason explaining why the force-cancellation is being applied. This reason is recorded for audit purposes. The `orderId` path parameter identifies the parent order (referencing `shopping_mall_orders.id`), and the `itemId` path parameter identifies the specific order item to cancel (referencing `shopping_mall_order_items.id`). Both must be valid UUIDs corresponding to existing records, and the item must belong to the specified order.
   *
   * Related operations: `GET /orders/{orderId}` retrieves full order details including all item statuses; `PATCH /orders` provides the administrator-level paginated order list for oversight; `POST /orders/{orderId}/items/{itemId}/forceRefund` applies a force-refund for delivered items.
   *
   * @param connection
   * @param orderId The unique identifier (UUID) of the parent order containing the target item. References shopping_mall_orders.id.
   * @param itemId The unique identifier (UUID) of the specific order item to force-cancel. References shopping_mall_order_items.id. Must belong to the specified order.
   * @param body Administrator force-cancellation request payload containing the mandatory reason for the cancellation.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor superAdmin
   * @x-autobe-specification 1. Authentication: Verify the caller is an authenticated admin or superAdmin. Reject with 403 if the caller is a customer or seller.
   *
   * 2. Existence validation:
   *    - Look up the order by `orderId` in `shopping_mall_orders`. Return 404 if not found.
   *    - Look up the order item by `itemId` in `shopping_mall_order_items` where `shopping_mall_order_id = orderId`. Return 404 if the item does not exist or does not belong to the specified order.
   *
   * 3. Status check: Verify the order item's current `status` is eligible for force-cancellation. Typically items in 'pending' or 'paid' status are eligible. Items already in 'cancelled' or 'refunded' status should return a 422 with an appropriate business error message.
   *
   * 4. Atomic transaction (within a single database transaction):
   *    a. Update `shopping_mall_order_items.status` to `'cancelled'` and set `updated_at` to the current timestamp for the target item.
   *    b. Insert a new `shopping_mall_inventory_records` record:
   *       - `id`: new UUID
   *       - `shopping_mall_product_variant_id`: from the order item
   *       - `quantity`: the order item's `quantity` (positive, restoring stock)
   *       - `reason_type`: `'order_cancellation'`
   *       - `note`: null (system-generated)
   *       - `created_at`: current timestamp
   *    c. Recalculate the parent order's derived `status` by querying all sibling order items' statuses:
   *       - All 'cancelled' → set order status to 'cancelled'
   *       - All 'refunded' or 'cancelled' → set order status to 'refunded' or 'cancelled' appropriately
   *       - Mix of terminal and active statuses → set to 'partially_completed'
   *       - Otherwise maintain the most advanced active status
   *       Update `shopping_mall_orders.status` and `updated_at`.
   *
   * 5. Return the updated `shopping_mall_order_items` record with its full detail (including the new status, associated snapshot data, and any linked cancellation request) as `IShoppingMallOrderItem`.
   *
   * 6. Edge cases:
   *    - If the item already has a pending `shopping_mall_cancellation_requests` record, it can remain as a historical record; the force-cancellation supersedes it (no need to delete it, but its status may be updated to 'approved' for audit consistency).
   *    - Ensure idempotency: if the item is already cancelled, return 422 rather than silently succeeding.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("forceCancel")
  public async forceCancel(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("itemId")
    itemId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallOrderItem.IForceCancel,
  ): Promise<IShoppingMallOrderItem> {
    try {
      return await postShoppingMallSuperAdminOrdersOrderIdItemsItemIdForceCancel(
        {
          superAdmin,
          orderId,
          itemId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Force-refund an individual order item on behalf of an administrator, bypassing the standard seller approval workflow.
   *
   * This administrative operation immediately transitions the target order item — identified by both its parent `orderId` and its own `itemId` within the `shopping_mall_order_items` table — to the `refunded` status. Unlike the customer-initiated refund request flow (which requires the seller's response within a 7-day window), this force-refund takes effect instantly and does not depend on any pending `shopping_mall_refund_requests` record or seller availability.
   *
   * Upon execution, the system performs three coordinated database operations in a single transaction: it updates the `status` column of the target `shopping_mall_order_items` row to `'refunded'`; it inserts a new `shopping_mall_inventory_records` entry with a positive `quantity` (equal to the order item's purchased quantity) and `reason_type` of `'order_refund'`, thereby restoring the variant's stock to the available pool; and it recalculates and persists the derived `status` field on the parent `shopping_mall_orders` record to reflect the updated aggregate state of all its child items.
   *
   * This action is strictly limited to actors with administrator privileges (`admin` or `superAdmin`). It is intended to resolve exceptional circumstances such as platform policy violations, disputes where the seller is unresponsive, or other situations requiring administrative intervention. The complete audit trail of the status change is preserved via the immutable `shopping_mall_inventory_records` ledger and the `updated_at` timestamps on both the order item and parent order.
   *
   * The endpoint targets items in `delivered` status. If the item is already in a terminal state (`cancelled` or `refunded`), the system returns a 422 error. Unaffected sibling items in the same order continue progressing through their independent status lifecycles without interruption.
   *
   * Related operations: `POST /orders/{orderId}/items/{itemId}/forceCancel` for administrator force-cancellation of paid items; `PATCH /orders` for listing all platform orders; `GET /orders/{orderId}` for viewing full order details including all item statuses and shipment tracking.
   *
   * @param connection
   * @param orderId The UUID of the parent order containing the target order item.
   * @param itemId The UUID of the specific order item to be force-refunded.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor superAdmin
   * @x-autobe-specification ## Purpose
   * Administrator-only action to immediately force-refund a specific order item without requiring a pending refund request or seller approval.
   *
   * ## Authorization
   * Only `admin` and `superAdmin` actors may call this endpoint. Reject all other actors with 403 Forbidden.
   *
   * ## Pre-conditions & Validation
   * 1. Verify the order (shopping_mall_orders) identified by `orderId` exists — 404 if not.
   * 2. Verify the order item (shopping_mall_order_items) identified by `itemId` exists and belongs to the specified order — 404 if not, 422 if it belongs to a different order.
   * 3. The requirements state administrators can force-refund any individual delivered order item. Validate item status is 'delivered'; if status is already 'refunded' or 'cancelled', return 422 with a descriptive error.
   *
   * ## Business Logic (within a single DB transaction)
   * 1. Update `shopping_mall_order_items.status` to `'refunded'` and set `updated_at` to NOW().
   * 2. Insert a new `shopping_mall_inventory_records` row:
   *    - `shopping_mall_product_variant_id`: from the order item's `shopping_mall_product_variant_id`
   *    - `quantity`: +`quantity` (positive, restoring the stock that was decremented at order placement)
   *    - `reason_type`: `'order_refund'`
   *    - `note`: null (system-generated record)
   *    - `created_at`: NOW()
   * 3. Recalculate and update the parent order's derived `status` in `shopping_mall_orders` based on the combined statuses of all sibling order items:
   *    - All 'cancelled' → 'cancelled'
   *    - All 'refunded' → 'refunded'
   *    - All 'delivered' → 'delivered'
   *    - Mix of terminal statuses → 'partially_completed'
   *    - Otherwise follow the standard derived status logic.
   * 4. Set `shopping_mall_orders.updated_at` to NOW().
   * 5. Commit the transaction.
   *
   * ## Response
   * Return the fully populated `IShoppingMallOrderItem` including the new `status: 'refunded'` and any relevant snapshot/shipment associations.
   *
   * ## Edge Cases
   * - If `itemId` does not belong to `orderId`: 422 Unprocessable Entity.
   * - If item is already in a terminal state ('cancelled', 'refunded'): 422 with message explaining the item cannot be force-refunded from its current status.
   * - Concurrent force-refund attempts on the same item: use SELECT FOR UPDATE to serialize access.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("forceRefund")
  public async forceRefund(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("itemId")
    itemId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallOrderItem> {
    try {
      return await postShoppingMallSuperAdminOrdersOrderIdItemsItemIdForceRefund(
        {
          superAdmin,
          orderId,
          itemId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
