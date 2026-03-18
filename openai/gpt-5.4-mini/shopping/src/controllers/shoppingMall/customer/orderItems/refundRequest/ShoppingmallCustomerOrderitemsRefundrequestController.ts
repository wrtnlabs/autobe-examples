import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallRefundRequest } from "../../../../../api/structures/IShoppingMallRefundRequest";
import { CustomerAuth } from "../../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../../decorators/payload/CustomerPayload";
import { patchShoppingMallCustomerOrderItemsOrderItemIdRefundRequest } from "../../../../../providers/patchShoppingMallCustomerOrderItemsOrderItemIdRefundRequest";

@Controller("/shoppingMall/customer/orderItems/:orderItemId/refundRequest")
export class ShoppingmallCustomerOrderitemsRefundrequestController {
  /**
   * Review and process a refund request for a single purchased order item.
   *
   * This operation is the seller-side decision point in the item-level refund workflow. A refund request belongs to exactly one order item and one customer, and the request stores the customer-provided reason, the current workflow status, the review timestamp, and the seller's review reason. The related order item tracks the purchased variant, quantity, and current fulfillment state, while inventory history is recorded separately in the inventory record table so stock changes can be reconstructed over time.
   *
   * Only the seller associated with the target order item may process this request. The service must load the order item by `orderItemId`, confirm that a refund request exists for that item, and reject the operation if the request is not pending. When the seller approves the refund request, the order item status must become refunded, the refunded timestamp must be written, and a positive inventory record must be created for the affected product variant to restore stock through inventory history. When the seller rejects the request, the order item remains unchanged and the decision is stored only as review metadata.
   *
   * The operation is intentionally item-scoped rather than order-scoped because refund handling is defined per purchased line item, not for the entire order. The caller should use the refund request detail view first if it needs to inspect the current reason or state before making the review decision. Because the refund decision is final once recorded, the implementation must prevent reprocessing of requests that are already approved or rejected.
   *
   * @param connection
   * @param orderItemId Target order item identifier.
   * @param body Seller decision and optional review reason for the refund request.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Implement this as a transactional seller review workflow for an existing refund request attached to one order item.
   *
   * 1. Resolve the authenticated seller and verify ownership: join the order item to its parent order and then to the purchased product variant's product seller, or use the domain's existing seller ownership relation. Deny access if the caller is not the seller responsible for the item.
   * 2. Load the order item by `orderItemId` with its refund request. If no refund request exists, return a not-found error.
   * 3. Enforce a pending-only state transition. If the refund request status is already approved, rejected, or cancelled, reject the request as a conflict/final-state violation.
   * 4. Validate the request body decision value. Use a small closed set such as approve/reject, and map it to the stored refund request status and the order item status transition.
   * 5. If approved:
   *    - Update shopping_mall_refund_requests.status to approved.
   *    - Set reviewed_at to the current timestamp.
   *    - Store reviewed_reason from the request body if provided.
   *    - Update the related shopping_mall_order_items.status to refunded and set refunded_at.
   *    - Insert a shopping_mall_inventory_records row with a positive quantity_change equal to the refunded item quantity.
   *    - Set the inventory reason to a refund-restoration business reason consistent with existing inventory history semantics.
   * 6. If rejected:
   *    - Update shopping_mall_refund_requests.status to rejected.
   *    - Set reviewed_at to the current timestamp.
   *    - Store reviewed_reason from the request body if provided.
   *    - Do not modify the order item status.
   *    - Do not insert inventory history.
   * 7. Commit all changes in one transaction so the request decision, item status, and inventory history remain consistent.
   * 8. Return the updated refund request resource, including review metadata.
   *
   * Edge cases:
   * - If the order item is already refunded, the refund request should not be processed again.
   * - If the request body attempts to provide an invalid status value, reject validation before touching the database.
   * - If inventory insertion fails, roll back the entire transaction so the refund decision is not partially applied.
   * - Keep the implementation idempotency-safe at the database level by guarding against concurrent double review with a status check in the update query.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async processRefundRequest(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("orderItemId")
    orderItemId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallRefundRequest.IProcess,
  ): Promise<IShoppingMallRefundRequest> {
    try {
      return await patchShoppingMallCustomerOrderItemsOrderItemIdRefundRequest({
        customer,
        orderItemId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
