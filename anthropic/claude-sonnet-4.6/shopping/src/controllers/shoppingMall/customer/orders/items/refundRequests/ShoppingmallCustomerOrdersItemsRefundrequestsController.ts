import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallRefundRequest } from "../../../../../../api/structures/IShoppingMallRefundRequest";
import { CustomerAuth } from "../../../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../../../decorators/payload/CustomerPayload";
import { getShoppingMallCustomerOrdersOrderIdItemsOrderItemIdRefundRequestsRefundRequestId } from "../../../../../../providers/getShoppingMallCustomerOrdersOrderIdItemsOrderItemIdRefundRequestsRefundRequestId";
import { postShoppingMallCustomerOrdersOrderIdItemsOrderItemIdRefundRequests } from "../../../../../../providers/postShoppingMallCustomerOrdersOrderIdItemsOrderItemIdRefundRequests";

@Controller(
  "/shoppingMall/customer/orders/:orderId/items/:orderItemId/refundRequests",
)
export class ShoppingmallCustomerOrdersItemsRefundrequestsController {
  /**
   * Submit a refund request for a delivered order item.
   *
   * This operation allows a registered customer to formally request a monetary refund for a specific order item that has reached 'delivered' status. The refund request is recorded in the `shopping_mall_refund_requests` table and initiates the post-sale refund workflow between the customer and the responsible seller.
   *
   * The customer must supply a written reason explaining why the refund is being requested. This reason is preserved verbatim in the system for audit and dispute resolution purposes. Upon successful submission, the refund request is created with a status of 'pending', awaiting the seller's review and response.
   *
   * Eligibility rules are strictly enforced. The target order item must currently be in 'delivered' status — items in 'paid', 'shipped', 'cancelled', or 'refunded' status are not eligible. Additionally, the request must be submitted within 7 calendar days of the item's delivery date; requests submitted beyond this window are rejected by the service layer. Each order item may have at most one refund request, enforced by a unique database constraint on `order_item_id`.
   *
   * Once submitted, the seller associated with the order item receives the request for review. The seller may approve or reject the refund. Upon approval, the order item transitions to 'refunded' status and stock is restored via an inventory record. Upon rejection, the item remains 'delivered'. Each seller response creates an immutable `shopping_mall_refund_request_snapshots` record that preserves the full audit trail.
   *
   * Administrators can bypass the standard workflow and force-refund items directly without requiring a pending refund request. This endpoint is exclusively for customers initiating a standard refund request.
   *
   * Prerequisites: The order must exist and belong to the authenticated customer. The order item identified by `orderItemId` must belong to the specified order. Use `GET /orders/{orderId}/items/{orderItemId}` to verify the item's current status and delivery date before submitting.
   *
   * @param connection
   * @param orderId The UUID of the parent order that contains the order item.
   * @param orderItemId The UUID of the specific order item for which the refund request is being submitted.
   * @param body The customer's refund request details, including the written reason for the refund.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification 1. Authenticate the caller as a customer. Verify
     *   the order (shopping_mall_orders) identified by orderId belongs to the
     *   authenticated customer (shopping_mall_customer_id matches). Return 403
     *   if not.
   *
   * 2. Verify the order item (shopping_mall_order_items) identified by orderItemId belongs to the specified order (shopping_mall_order_id == orderId). Return 404 if not found.
   *
   * 3. Check the order item's status is 'delivered'. If status is anything else ('paid', 'shipped', 'cancelled', 'refunded', 'pending'), return 422 with an appropriate error message.
   *
   * 4. Determine the delivery timestamp. Since the schema does not have a dedicated delivered_at column, use the order item's updated_at (the last status update timestamp, which corresponds to when it transitioned to 'delivered'). Compute the difference from now. If it exceeds 7 days, return 422 indicating the refund eligibility window has expired.
   *
   * 5. Check for an existing refund request on this order item: query shopping_mall_refund_requests WHERE order_item_id = orderItemId. If one already exists, return 409 Conflict.
   *
   * 6. Insert a new shopping_mall_refund_requests record:
   *    - id: new UUID
   *    - order_item_id: orderItemId
   *    - reason: from request body
   *    - status: 'pending'
   *    - created_at: current UTC timestamp
   *    - updated_at: current UTC timestamp
   *
   * 7. Return the newly created shopping_mall_refund_requests record as IShoppingMallRefundRequest, including its snapshots array (empty at creation).
   *
   * All steps should be wrapped in a single database transaction.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("orderItemId")
    orderItemId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallRefundRequest.ICreate,
  ): Promise<IShoppingMallRefundRequest> {
    try {
      return await postShoppingMallCustomerOrdersOrderIdItemsOrderItemIdRefundRequests(
        {
          customer,
          orderId,
          orderItemId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the detailed information of a specific refund request submitted for an individual order item.
   *
   * This endpoint returns the complete details of a single {@link shopping_mall_refund_requests refund request}, including the customer's written reason for the refund, the current resolution status (pending, approved, or rejected), and the full chronological audit trail of all seller or administrator responses captured as immutable {@link shopping_mall_refund_request_snapshots snapshots}.
   *
   * The request is scoped to the full resource hierarchy: the target {@link shopping_mall_orders order} → the specific {@link shopping_mall_order_items order item} → the associated refund request. All three identifiers must match to locate the record; if any of the path parameters are inconsistent with the database relationships, the endpoint will return a not-found error.
   *
   * A refund request can only exist for a {@link shopping_mall_order_items order item} that has reached 'delivered' status, and each order item may have at most one refund request (enforced by a unique constraint in the database). The request carries a customer-provided reason and transitions through statuses: 'pending' (awaiting seller response), 'approved' (refund processed; item transitions to 'refunded'), or 'rejected' (item remains 'delivered').
   *
   * Authorized access is granted to: the customer who placed the original order (can view their own refund request), the seller whose product variant was purchased (can view refund requests for their items), and administrators (can view any refund request on the platform as part of order oversight). Any actor outside these groups is denied access.
   *
   * Snapshot records (shopping_mall_refund_request_snapshots) embedded in the response are preserved indefinitely and remain accessible even if the seller's account is subsequently deleted or the order is removed from active records, ensuring the historical audit trail is always available for dispute resolution.
   *
   * @param connection
   * @param orderId The UUID of the parent order that contains the target order item.
   * @param orderItemId The UUID of the specific order item for which the refund request was submitted.
   * @param refundRequestId The UUID of the refund request to retrieve.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification 1. Validate that the orderId path parameter
     *   corresponds to an existing order in shopping_mall_orders. 2. Validate
     *   that the orderItemId path parameter corresponds to a
     *   shopping_mall_order_items record that belongs to the order identified
     *   by orderId (shopping_mall_order_id = orderId). 3. Validate that the
     *   refundRequestId path parameter corresponds to a
     *   shopping_mall_refund_requests record whose order_item_id matches the
     *   orderItemId. 4. Authorization check: - If the caller is a customer,
     *   verify that shopping_mall_orders.shopping_mall_customer_id matches the
     *   authenticated customer's ID. - If the caller is a seller, verify that
     *   the product variant in the order item (shopping_mall_product_variants)
     *   belongs to the seller. - If the caller is an admin or superAdmin, allow
     *   access unconditionally. 5. Join shopping_mall_refund_requests with
     *   shopping_mall_refund_request_snapshots (ordered by created_at ASC) to
     *   include the full snapshot history. 6. Return the complete refund
     *   request object including: id, reason, status, created_at, updated_at,
     *   and the ordered list of snapshots. 7. If any of the validation checks
     *   fail (record not found or hierarchy mismatch), return a 404 Not Found
     *   error. 8. If authorization fails, return a 403 Forbidden error.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":refundRequestId")
  public async at(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("orderItemId")
    orderItemId: string & tags.Format<"uuid">,
    @TypedParam("refundRequestId")
    refundRequestId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallRefundRequest> {
    try {
      return await getShoppingMallCustomerOrdersOrderIdItemsOrderItemIdRefundRequestsRefundRequestId(
        {
          customer,
          orderId,
          orderItemId,
          refundRequestId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
