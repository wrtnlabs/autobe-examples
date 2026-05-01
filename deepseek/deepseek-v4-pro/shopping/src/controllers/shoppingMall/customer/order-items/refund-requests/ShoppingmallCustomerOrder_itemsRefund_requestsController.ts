import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallRefundRequest } from "../../../../../api/structures/IShoppingMallRefundRequest";
import { CustomerAuth } from "../../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../../decorators/payload/CustomerPayload";
import { postShoppingMallCustomerOrderItemsItemIdRefundRequests } from "../../../../../providers/postShoppingMallCustomerOrderItemsItemIdRefundRequests";

@Controller("/shoppingMall/customer/order-items/:itemId/refund-requests")
export class ShoppingmallCustomerOrder_itemsRefund_requestsController {
  /**
   * Submit a refund request for a delivered order item.
   *
   * A refund request allows a customer to request a return and refund for an order item that has been delivered. The request is submitted per individual order item — different items within the same order require separate refund requests and are processed independently.
   *
   * **Eligibility**: The targeted order item must be in `delivered` status and the request must be submitted within 7 calendar days from the date that item was marked as delivered. Orders still in `paid`, `shipped`, `cancelled`, or `refunded` status are not eligible.
   *
   * **Request Content**: The customer must provide a reason explaining why the refund is sought. This reason is preserved immutably and is visible to the seller when reviewing the request. The reason cannot be empty or whitespace-only.
   *
   * **Workflow**: Upon successful creation, the refund request enters the `pending` state. The seller of the item is notified and can respond by approving or rejecting the request. If approved, the payment is returned for that item, stock is restored via a positive inventory record, and the order item status changes to `refunded`. If rejected, the order item remains in `delivered` status with no changes. A snapshot of the request state is automatically created when the seller responds.
   *
   * **Duplicate Prevention**: Only one refund request can be active per order item at a time. If a pending or approved refund request already exists for the same order item, the submission is rejected.
   *
   * @param connection
   * @param itemId The unique identifier of the order item for which the refund is being requested. The order item must be in `delivered` status and owned by the authenticated customer.
   * @param body The refund request payload containing the customer's reason for seeking a refund. The reason must be a non-empty string explaining why the customer wants to return the item.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Implement customer-initiated refund request
     *   creation for a single order item.
   *
   * **Authorization**: The authenticated customer must be the owner of the order containing the target order item. Verify via the FK chain: order_item → order → shopping_mall_customer_id matches the authenticated customer ID. Reject with 403 if the customer does not own the order.
   *
   * **Item Status Validation**: Query the order item by `id` matching the `{itemId}` path parameter. Verify the order item's `status` is `delivered`. If the status is `paid`, `shipped`, or `cancelled`, respond with 422 and an appropriate message indicating the item is not eligible for refund. If the status is already `refunded`, respond with 409 (conflict). If the order item does not exist, respond with 404.
   *
   * **Time Window Validation**: Calculate the 7-calendar-day refund window from the order item's most recent `updated_at` timestamp (which reflects when the status was last changed to `delivered`). Compare the current timestamp against this window. If more than 7 calendar days have elapsed, respond with 422 and a message indicating the refund window has expired.
   *
   * **Duplicate Check**: Query `shopping_mall_refund_requests` for existing records where `shopping_mall_order_item_id` equals `{itemId}` and `status` is `pending` or `approved`, and `deleted_at` is null. If any such record exists, respond with 409 (conflict) indicating a refund request is already in progress for this item.
   *
   * **Reason Validation**: Validate that the `reason` field in the request body is present, a non-empty string, and not whitespace-only. Reject with 422 if the reason is missing or invalid.
   *
   * **Record Creation**: Insert a new row into `shopping_mall_refund_requests` with:
   * - `id`: generated UUID
   * - `shopping_mall_order_item_id`: from `{itemId}` path parameter
   * - `reason`: from request body
   * - `status`: set to `pending`
   * - `responded_at`: set to null (not yet responded)
   * - `created_at`: current timestamp
   * - `updated_at`: current timestamp
   * - `deleted_at`: null
   *
   * Execute within a transaction to ensure atomicity.
   *
   * **Response**: Return the created refund request with all fields populated, including the generated `id`, `status` as `pending`, `reason`, `created_at`, `updated_at`, and `responded_at` as null.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("itemId")
    itemId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallRefundRequest.ICreate,
  ): Promise<IShoppingMallRefundRequest> {
    try {
      return await postShoppingMallCustomerOrderItemsItemIdRefundRequests({
        customer,
        itemId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
