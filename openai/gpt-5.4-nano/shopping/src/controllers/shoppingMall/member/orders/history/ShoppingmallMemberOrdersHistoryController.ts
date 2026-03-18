import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IPageIShoppingMallOrder } from "../../../../../api/structures/IPageIShoppingMallOrder";
import { IShoppingMallOrder } from "../../../../../api/structures/IShoppingMallOrder";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { patchShoppingMallMemberOrdersHistory } from "../../../../../providers/patchShoppingMallMemberOrdersHistory";

@Controller("/shoppingMall/member/orders/history")
export class ShoppingmallMemberOrdersHistoryController {
  /**
   * Retrieve the authenticated customer’s order history as a paginated list of order summaries.
   *
   * This operation supports browsing by applying pagination and ordering so customers can reliably locate their newest orders first. The list entries include each order’s human reference (order code/number), placed date (order date), computed total price, and the overall order status. The operation is designed specifically for the customer’s “order history” use case described in the requirements: the customer can view a list of their orders in a paginated format sorted by newest first.
   *
   * Only orders that are considered successfully created after checkout/payment succeeded are included. If a customer has no successful orders, the result must be an empty list rather than an error.
   *
   * Data is backed by the order header records in shopping_mall_orders (ownership via shopping_customer_id) and must be filtered by the success state of the related payment attempt in shopping_mall_payments (shopping_payment_id). Order fulfillment-related state shown as the “overall order status” is derived from the associated order items and shipment workflow, using the status fields stored in shopping_mall_order_items (line_item_status) and shipment records in shopping_mall_shipments (status).
   *
   * Security and data isolation: the authenticated actor must be constrained to their own orders via shopping_mall_orders.shopping_customer_id. This endpoint must not expose other customers’ orders.
   *
   * Related operations: customers may also view full order details (a different endpoint) where each order item’s current item status is displayed within the order details view. That detailed view is separate from this history-list operation which returns only the summary fields optimized for list browsing.
   *
   * Expected behavior: when the requested page has no items, return an empty page data set with pagination metadata corresponding to the requested parameters.
   *
   * @param connection
   * @param body Order history browsing criteria including pagination controls (and any supported filters) for the authenticated customer.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement a customer-scoped order history list operation.
   *
   * 1) Authorization / scope
   * - Require authentication as a member.
   * - Resolve the authenticated member’s id (shopping_mall_members.id).
   * - Only consider shopping_mall_orders where shopping_customer_id == authenticatedMemberId.
   *
   * 2) Input handling (request body)
   * - Parse shopping_mall_orders list request criteria from IShoppingMallOrder.IRequest.
   * - Apply pagination (page size / cursor / offset depending on DTO definition) and sorting.
   * - Enforce newest-first ordering by using shopping_mall_orders.placed_at (descending) as the primary sort key.
   *
   * 3) “Successfully created” rule
   * - Join shopping_mall_orders with shopping_mall_payments using shopping_payment_id.
   * - Filter to include only orders whose related payment.status represents success (exact success value must be inferred from implementation/config in Realize Agent; if the DTO/status mapping exists, use it).
   * - Ensure failed payment attempts do not contribute any orders to the list.
   *
   * 4) Overall order status derivation
   * - For each candidate order, derive overall order status based on associated workflow:
   *   - Use shopping_mall_order_items.line_item_status for item-level state.
   *   - Use shopping_mall_shipments.status when shipment grouping affects shipped/delivered/cancelled outcomes.
   * - Return the aggregated/overall status in the order summary according to existing business-rule conventions used by other order endpoints.
   *
   * 5) Total price computation for summary
   * - Compute order total price as the sum of purchased line totals using:
   *   - shopping_mall_order_items.seller_price_at_purchase * shopping_mall_order_items.quantity.
   * - Do not recompute from payments unless required by the existing DTO; prefer item totals for consistency with line-item captures.
   *
   * 6) Pagination query strategy
   * - Use a two-phase approach for large datasets:
   *   a) Query order ids with applied filters and newest-first ordering plus pagination.
   *   b) Load aggregates (overall status, total price, and summary fields) for only those ids.
   *
   * 7) Soft-deletion visibility
   * - Apply shopping_mall_orders.deleted_at: exclude orders where deleted_at is not null from active views.
   *
   * 8) Edge cases
   * - If no successful orders exist for the customer, return an empty data array with pagination metadata.
   * - If a requested page is beyond the last page, return empty data with metadata consistent with the pagination implementation.
   *
   * 9) Response mapping
   * - Map each selected order to IShoppingMallOrder.ISummary fields (order code/number, placed_at as order date, computed total, overall status, and any summary identifiers required by the DTO).
   *
   * 10) Error handling
   * - Return appropriate error responses for unauthenticated access (authorization middleware), malformed request body (validation), and internal failures during aggregation queries.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IShoppingMallOrder.IRequest,
  ): Promise<IPageIShoppingMallOrder.ISummary> {
    try {
      return await patchShoppingMallMemberOrdersHistory({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
