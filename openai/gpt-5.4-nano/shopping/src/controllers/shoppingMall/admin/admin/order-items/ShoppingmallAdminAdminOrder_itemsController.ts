import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallOrderItem } from "../../../../../api/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallOrderItem } from "../../../../../api/structures/IShoppingMallOrderItem";
import { AdminAuth } from "../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../decorators/payload/AdminPayload";
import { deleteShoppingMallAdminAdminOrderItemsOrderItemId } from "../../../../../providers/deleteShoppingMallAdminAdminOrderItemsOrderItemId";
import { getShoppingMallAdminAdminOrderItemsOrderItemId } from "../../../../../providers/getShoppingMallAdminAdminOrderItemsOrderItemId";
import { patchShoppingMallAdminAdminOrderItems } from "../../../../../providers/patchShoppingMallAdminAdminOrderItems";
import { putShoppingMallAdminAdminOrderItemsOrderItemId } from "../../../../../providers/putShoppingMallAdminAdminOrderItemsOrderItemId";

@Controller("/shoppingMall/admin/admin/order-items")
export class ShoppingmallAdminAdminOrder_itemsController {
  /**
   * Admin oversight endpoint to retrieve a filtered, paginated list of order line items across the platform.
   *
   * This operation targets `shopping_mall_order_items`, the persisted unit of purchased-variant workflow. Each order item includes its purchased variant reference (`shopping_mall_product_variant_id`), seller snapshot reference (`seller_snapshot_id`), the optional shipment linkage (`shopping_mall_shipment_id`), and the current workflow status stored as `line_item_status`. For dispute-resolution correctness and customer/seller inspection, the endpoint must also support display needs that depend on related records (order context and seller snapshot context).
   *
   * Security and authorization: only authenticated `admin` actors may call this endpoint. The endpoint must not allow `guest` or `member` to access other customers’ order items. When building the response, it must respect the snapshot visibility model stored in `shopping_mall_snapshot_parties`.
   *
   * Filtering and sorting: administrator oversight typically requires non-trivial filtering (such as status-based filtering and time-based windows using the item’s `created_at`/`placed_at`, plus sorting). Therefore, the API uses a request body (PATCH) rather than only query parameters.
   *
   * Soft-deletion handling: the underlying tables define `deleted_at` fields (on orders, order items, shipments, and related request tables). This operation must exclude deleted records from the active oversight views by applying `deleted_at IS NULL` constraints consistently.
   *
   * Relationship coverage for UI: the result summaries should include enough data for administrative order/item inspection (order code from `shopping_mall_orders` and seller-context identity via `shopping_mall_snapshots`), and reflect the current shipment status when `shopping_mall_order_items.shopping_mall_shipment_id` is present.
   *
   * Related operations: dedicated write endpoints handle forced cancellation/refund. This endpoint must only provide the current state for oversight displays.
   *
   * Error handling: if filtering criteria are invalid (e.g., malformed pagination or unsupported sort fields), the service must return a validation error. If no records match, return an empty paginated result rather than an error.
   *
   * @param connection
   * @param body Admin-side search criteria for filtering and paginating order items across the platform.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification 1) Authorization: verify caller is an authenticated admin actor. Reject non-admin access.
   *
   * 2) Parse request body (IShoppingMallOrderItem.IRequest):
   *    - pagination
   *    - filters: at minimum filter by line_item_status; optionally support order_code match and date ranges using shopping_mall_order_items.created_at/placed_at.
   *    - sorting: map allowed sort keys to database columns.
   *
   * 3) Base query:
   *    - FROM shopping_mall_order_items oi
   *    - JOIN shopping_mall_orders o ON o.id = oi.shopping_mall_order_id
   *    - LEFT JOIN shopping_mall_shipments s ON s.id = oi.shopping_mall_shipment_id
   *    - JOIN shopping_mall_snapshots ss ON ss.id = oi.seller_snapshot_id
   *
   * 4) Soft-deletion constraints:
   *    - oi.deleted_at IS NULL
   *    - o.deleted_at IS NULL
   *    - s.deleted_at IS NULL when joining shipments
   *    - ss.deleted_at IS NULL when joining snapshots
   *
   * 5) Snapshot visibility:
   *    - When assembling any snapshot-derived payload for the summary, enforce admin visibility via shopping_mall_snapshot_parties (can_view=true).
   *
   * 6) Apply filters and sorting.
   *
   * 7) Pagination:
   *    - Apply LIMIT/OFFSET or cursor-based pagination per the request DTO.
   *
   * 8) Response mapping:
   *    - For each order item, map fields required by IShoppingMallOrderItem.ISummary (including order_code and shipment status when available).
   *
   * 9) Consistency expectation:
   *    - After admin force-cancel/force-refund actions performed by separate endpoints, line_item_status must be reflected immediately in this list.
   *
   * 10) Error handling:
   *    - Unknown filter/sort fields -> validation error
   *    - DB failures -> internal error
   *
   * 11) Performance:
   *    - Use joins to avoid N+1 queries; rely on indexes involving line_item_status/created_at and order linkage.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdminAuth()
    admin: AdminPayload,
    @TypedBody()
    body: IShoppingMallOrderItem.IRequest,
  ): Promise<IPageIShoppingMallOrderItem.ISummary> {
    try {
      return await patchShoppingMallAdminAdminOrderItems({
        admin,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information for one order item so that an administrator can perform order-item oversight across the platform.
   *
   * This operation targets a single {@link shopping_mall_order_items} record identified by {orderItemId}. The returned data includes the order item’s purchase context fields such as the linked {@link shopping_mall_order_items.shopping_mall_order_id} (parent order), the purchased {@link shopping_mall_order_items.shopping_mall_product_variant_id} (variant purchased at checkout), the seller snapshot context {@link shopping_mall_order_items.seller_snapshot_id}, and fulfillment linkage via {@link shopping_mall_order_items.shopping_mall_shipment_id} when present.
   *
   * The response also exposes the order item’s workflow state through {@link shopping_mall_order_items.line_item_status}, allowing the administrator to inspect how the item currently sits within the cancellation/refund/shipment lifecycle. Timestamps such as {@link shopping_mall_order_items.placed_at}, {@link shopping_mall_order_items.created_at}, and {@link shopping_mall_order_items.updated_at} are included to support audit and investigation.
   *
   * Authorization: only authenticated administrators (and potentially super administrators) should be able to access this endpoint, because administrative oversight requires platform-wide visibility that regular members do not have.
   *
   * Related behaviors and consistency expectations:
   *
   * - Seller and customer cancellations/refunds are represented by related {@link shopping_mall_cancellation_requests} and {@link shopping_mall_refund_requests} records that are attached to the same order item. Administrator-level forced outcomes must preserve snapshot trail integrity and avoid conflicting transitions; therefore the order-item detail should reflect the current, authoritative {@link shopping_mall_order_items.line_item_status} after any administrative oversight action.
   *
   * Error handling:
   *
   * - If {orderItemId} does not exist (or is not visible under the system’s active query rules), return a 404 error.
   * - If the caller lacks administrative privileges, return an authorization error (e.g., 403).
   *
   * This endpoint is intended to be used together with order-related admin list/detail operations so administrators can navigate from an order to its constituent items, and inspect each item’s current status.
   *
   * @param connection
   * @param orderItemId Target order item ID for administrative inspection.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification 1. Validate path parameter {orderItemId} as UUID.
   *
   * 2. Authorization: verify the caller is an authenticated administrator. Deny non-admin actors before any database access.
   *
   * 3. Database query:
   * - Query shopping_mall_order_items by id = {orderItemId}.
   * - Join/augment with:
   *   a) order linkage fields (from shopping_mall_orders.shopping_customer_id, shipping fields if exposed by the DTO), only as required by the IShoppingMallOrderItem response DTO.
   *   b) product variant linkage identifiers as needed by the IShoppingMallOrderItem response DTO.
   *   c) seller snapshot linkage identifier (seller_snapshot_id) so the administrator can correlate to snapshot history.
   *   d) shipment linkage identifier (shopping_mall_shipment_id) when present.
   * - Apply query rules consistent with the project’s active-view semantics for records with deleted_at fields (the ORM layer should already encapsulate this).
   *
   * 4. Mapping:
   * - Map database fields to the response DTO, including seller_price_at_purchase, quantity, placed_at, line_item_status, created_at, updated_at, and linkage IDs.
   *
   * 5. Edge cases:
   * - If no record is found, return a 404.
   * - Do not mutate any data (read-only).
   *
   * 6. Return the detailed order item representation as JSON.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":orderItemId")
  public async at(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("orderItemId")
    orderItemId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallOrderItem> {
    try {
      return await getShoppingMallAdminAdminOrderItemsOrderItemId({
        admin,
        orderItemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an order item under administrator oversight.
   *
   * This operation is designed for platform-wide governance where an administrator forces a targeted order item to an administrative outcome (for example, a forced cancellation or a forced refund). The business expectation is that administrator oversight updates the order item’s line-item status to the appropriate terminal outcome for that single item, while applying the same business outcomes that the normal customer-approval workflows would apply (including refund behavior and stock reconciliation when applicable).
   *
   * Because the underlying data model for {@link shopping_mall_order_items} includes a dedicated {@link shopping_mall_order_items.line_item_status} workflow value, this endpoint updates that workflow status for the specified {@link shopping_mall_order_items.id}. Administrator force actions must also be compatible with item-level rules: if the requested administrative transition would conflict with cancellation/refund eligibility or would break the ordering of statuses (for example, attempting to move to an earlier terminal state when the item is already in a later terminal state), the system must reject the operation or handle it in a way that keeps statuses consistent.
   *
   * When the admin forces an item outcome, the operation must ensure inventory restoration and customer reimbursement outcomes are consistent with the forced cancellation/refund behavior. The order item is linked to the purchased product variant via {@link shopping_mall_order_items.shopping_mall_product_variant_id}, and inventory history is managed via {@link shopping_mall_inventory_records}. The endpoint implementation must therefore restore inventory quantities in a way consistent with the forced outcome, and avoid creating inconsistent inventory when shipments are already linked.
   *
   * If the targeted order item is associated with a shipment (linked through {@link shopping_mall_order_items.shopping_mall_shipment_id}), the operation must reconcile shipment-linked item outcomes so customer shipment and tracking information remain consistent with the new order item outcome. Additionally, administrator oversight must preserve snapshot trail integrity: dispute-resolution snapshots required for auditing must remain intact and must not be removed or retroactively modified. If a new final decision snapshot is required for the new outcome, it must be created in a way that follows immutability and single-final-decision principles, and remains retry-safe (avoiding multiple conflicting snapshots for the same final state).
   *
   * This endpoint complements the administrator oversight viewing endpoints (order and order-item inspection) by providing the write capability that actually applies the forced outcome. For retrieving the current state before deciding, administrators can use the corresponding order/order-item view operations (read-only) and then call this operation to apply the administrative change to a single {@link shopping_mall_order_items.id}.
   *
   * @param connection
   * @param orderItemId Target order item identifier to apply the administrator forced outcome.
   * @param body Administrative update payload specifying the forced outcome to apply to the targeted order item.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implementation steps:
   * 1) Validate authorization: allow only administrators (admin actor) to access this route.
   * 2) Parse path parameter orderItemId (uuid) and load {@link shopping_mall_order_items} by id.
   * 3) Validate request body (IShoppingMallOrderItem.IUpdate) for the requested administrative outcome/action. Map the request to a target {@link shopping_mall_order_items.line_item_status}.
   * 4) Eligibility and transition checks:
   *    - Determine current line_item_status and current related workflow context (e.g., presence/status of cancellation/refund request records linked to this order item) as needed by the domain rules.
   *    - Enforce rule that forced update must not create rule-breaking status transitions (reject if transition would contradict item workflow ordering).
   *    - Enforce rule that forced cancel/refund at item level changes only the targeted order item, not other items.
   * 5) Transactional update:
   *    - Start a DB transaction.
   *    - Update {@link shopping_mall_order_items.line_item_status} to the new forced outcome.
   *    - Apply inventory restoration consistent with forced cancellation/refund:
   *      * Use {@link shopping_mall_order_items.shopping_mall_product_variant_id} to locate relevant {@link shopping_mall_inventory_records} history.
   *      * Append/update inventory quantities in a consistent manner (do not fabricate derived fields; preserve audit semantics with inventory history records).
   *    - Reconcile shipment-linked outcomes if {@link shopping_mall_order_items.shopping_mall_shipment_id} is not null:
   *      * Ensure any shipment status/outcome and any seller confirmation-linked displays remain consistent with the new item outcome.
   *      * Do not leave the shipment tracking display inconsistent.
   *    - Snapshot trail integrity:
   *      * Do not remove or retroactively alter existing snapshots.
   *      * If the forced outcome requires a new snapshot for dispute resolution, create a new snapshot record in {@link shopping_mall_snapshots} with the proper source linkage fields (source_type/source_entity_id/source_order_item_id/source_order_id/source_seller_id as applicable) and create its payload record in {@link shopping_mall_snapshot_payloads}.
   *      * Ensure retry safety: detect if a conflicting snapshot for the same final outcome already exists for this item, and avoid creating multiple conflicting final-decision snapshots.
   * 6) Commit transaction.
   * 7) Return the updated order item representation as IShoppingMallOrderItem.
   *
   * Edge cases:
   * - If orderItemId does not exist or is deleted/hidden in active views, return an error.
   * - If the requested forced transition is incompatible with current terminal state ordering, reject.
   * - If shipment reconciliation encounters constraints, reject to avoid inconsistent tracking displays.
   * - Ensure idempotency behavior for retries by using snapshot detection and by preventing duplicate conflicting final transitions.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":orderItemId")
  public async update(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("orderItemId")
    orderItemId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallOrderItem.IUpdate,
  ): Promise<IShoppingMallOrderItem> {
    try {
      return await putShoppingMallAdminAdminOrderItemsOrderItemId({
        admin,
        orderItemId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes an order item record from administrative context.
   *
   * This endpoint is intended for administrators who manage order item oversight across the platform. It targets a single order item identified by {orderItemId} in the shopping_mall_order_items table, which stores the purchased product variant reference, seller snapshot context for dispute resolution, item quantity and seller price at purchase time, and the current line_item_status driven by fulfillment and post-purchase actions.
   *
   * Because shopping_mall_order_items are the unit that can receive cancellation/refund requests and are included in shipments via shopping_mall_shipments, the implementation must ensure that the removal does not leave the system in an inconsistent fulfillment state. Any dependent records and derived outcomes (for example, shipment membership and any inventory restoration outcome that would have been applied by explicit admin force actions) must be handled according to the existing business rules for item-level cancellation/refund and administrator oversight. The operation must affect only the specified order item and must not change other order items automatically.
   *
   * Security and authorization: only the admin actor is allowed to call this operation. If the request is made by a non-admin actor, the system must reject the attempt.
   *
   * Validation rules: the system must verify that the target order item exists and is accessible for administrative operations. If the order item does not exist, the system must reject with an appropriate not-found error and must not perform any side effects.
   *
   * Error handling: if removal would conflict with business workflow constraints (for example, preventing contradictory item status transitions), the operation must reject the request and leave existing order item data unchanged. After a successful call, the specified order item should no longer be returned by active administrative queries; historical dispute resolution that depends on snapshots must remain consistent with the snapshot mechanism already in place for order-item dispute contexts.
   *
   * @param connection
   * @param orderItemId Target order item identifier to remove (shopping_mall_order_items.id).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implementation steps:
   *
   * 1) Authorization gate
   * - Verify the caller has admin-level permissions.
   *
   * 2) Load and validate target
   * - Query shopping_mall_order_items by id == {orderItemId}.
   * - If not found: throw NotFound.
   *
   * 3) Consistency checks for workflow state
   * - Read shopping_mall_order_items.line_item_status and shopping_mall_order_items.shopping_mall_shipment_id.
   * - Apply business-rule constraints to ensure this removal does not produce contradictory fulfillment/cancellation/refund outcomes.
   * - If constraints are violated (e.g., would break ordering of statuses or conflict with already-processed administrative outcomes), reject the operation.
   *
   * 4) Dependency handling
   * - If the order item belongs to a shipment (shopping_mall_shipment_id not null), ensure the shipment remains consistent after the operation.
   * - If the implementation model uses a retention strategy (historical integrity via snapshot references), ensure those references remain valid.
   *
   * 5) Perform removal
   * - Execute the deletion in the appropriate manner supported by the service/data layer for shopping_mall_order_items (implementation decides whether it is truly permanent or marked out of active views).
   * - Ensure no other shopping_mall_order_items rows are modified.
   *
   * 6) Transaction boundaries
   * - Wrap the consistency checks and removal into a single database transaction.
   *
   * 7) Response
   * - Return 204/empty JSON as represented by responseBody=null in this API operation contract.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":orderItemId")
  public async erase(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("orderItemId")
    orderItemId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallAdminAdminOrderItemsOrderItemId({
        admin,
        orderItemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
