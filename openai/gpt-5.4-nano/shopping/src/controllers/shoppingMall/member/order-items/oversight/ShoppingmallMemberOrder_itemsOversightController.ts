import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IPageIShoppingMallOrderItem } from "../../../../../api/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallOrderItem } from "../../../../../api/structures/IShoppingMallOrderItem";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { patchShoppingMallMemberOrderItemsOversight } from "../../../../../providers/patchShoppingMallMemberOrderItemsOversight";

@Controller("/shoppingMall/member/order-items/oversight")
export class ShoppingmallMemberOrder_itemsOversightController {
  /**
   * Retrieve a filtered, paginated list of order items for seller and administrator oversight.
   *
   * This operation supports the visibility needs described for order-item oversight: sellers can inspect order items that belong to their products, and can filter their visible order items by the stored item status; administrators can view orders across the platform and inspect the corresponding order items for oversight and dispute resolution.
   *
   * The endpoint is implemented as a read-only search over `shopping_mall_order_items` and is expected to return the current stored workflow status for each item (as defined by the order-item status field in the database) along with the correlation identifiers needed by the oversight UI (for example, order/shipment linkage fields and any snapshot context fields included in `IShoppingMallOrderItem.ISummary`). The operation must not create or modify any cancellation requests, refund requests, shipment confirmations, inventory records, or snapshot records.
   *
   * For record eligibility in listings, this operation must exclude records that are not eligible to be shown according to the database model (including any model-defined deletion/archival/visibility markers on order items and any joined order/shipment records used for context). The implementation must use the actual column(s) defined by the `shopping_mall_order_items`, `shopping_mall_orders`, and `shopping_mall_shipments` schemas rather than hard-coding specific column names.
   *
   * Related operations: clients commonly use this list endpoint first to obtain order-item identifiers and current item status, then navigate to order detail, shipment detail, and cancellation/refund request views for deeper information.
   *
   * @param connection
   * @param body Oversight search criteria for order items, including status filtering and pagination/sorting options.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement as a list/search endpoint over
     *   shopping_mall_order_items.
   *
   * 1) Authorization + scoping
   * - Resolve actor from request context.
   * - If actor is seller: constrain results to order items whose purchased product variant belongs to products owned by that seller (join through shopping_mall_product_variants -> shopping_mall_products if available in current codebase).
   * - If actor is admin: no seller-scoping constraint.
   *
   * 2) Base query and joins
   * - Start from shopping_mall_order_items (filter out where shopping_mall_order_items.deleted_at is not null).
   * - Join shopping_mall_orders for order-level context only when requested/needed for sorting/filtering.
   *   - Exclude orders where shopping_mall_orders.deleted_at is not null.
   * - Join shopping_mall_shipments for shipment-level context when required by response columns or filtering.
   *   - Exclude shipments where shopping_mall_shipments.deleted_at is not null.
   *
   * 3) Filtering
   * - Apply request-body filters including:
   *   - line_item_status (string raw value) if provided.
   *   - order id / order code filters if provided by the DTO.
   *   - shipment id filters if provided.
   *   - date range filters based on created_at/placed_at/updated_at if provided by the DTO.
   * - For status-based filtering, treat status as exact match against shopping_mall_order_items.line_item_status.
   *
   * 4) Sorting
   * - Apply sorting options from the request body.
   * - Default sorting: shopping_mall_order_items.created_at descending.
   *
   * 5) Pagination
   * - Implement page slicing at the database layer using page size + cursor/offset rules from the IRequest DTO.
   * - Return a page object that includes pagination metadata and an array of IShoppingMallOrderItem.ISummary items.
   *
   * 6) Returned fields
   * - For each order item summary, include only the summary fields expected by IShoppingMallOrderItem.ISummary, but ensure it at least contains the identity and the current line item status derived from shopping_mall_order_items.line_item_status.
   * - Include minimal correlation keys needed by oversight UIs: shopping_mall_order_id, shopping_mall_product_variant_id, shopping_mall_shipment_id (nullable), and seller_snapshot_id if the summary DTO requires it.
   *
   * 7) Edge cases
   * - If filters match no records, return an empty page with valid pagination metadata.
   * - If a seller tries to filter by an order/shipment outside their scope, the implementation must treat it as no results rather than exposing other sellers’ data.
   *
   * 8) No side effects
   * - This endpoint must not create/update cancellation requests, refund requests, inventory records, shipment confirmations, or snapshots.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IShoppingMallOrderItem.IRequest,
  ): Promise<IPageIShoppingMallOrderItem.ISummary> {
    try {
      return await patchShoppingMallMemberOrderItemsOversight({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
