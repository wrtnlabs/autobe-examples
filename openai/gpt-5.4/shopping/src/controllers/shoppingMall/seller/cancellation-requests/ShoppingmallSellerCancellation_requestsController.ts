import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallCancellationRequest } from "../../../../api/structures/IShoppingMallCancellationRequest";
import { SellerAuth } from "../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../decorators/payload/SellerPayload";
import { putShoppingMallSellerCancellationRequestsCancellationRequestId } from "../../../../providers/putShoppingMallSellerCancellationRequestsCancellationRequestId";

@Controller("/shoppingMall/seller/cancellation-requests/:cancellationRequestId")
export class ShoppingmallSellerCancellation_requestsController {
  /**
   * Update the current mutable state of an individual cancellation request for a purchased order item.
   *
   * This operation targets one active record in the shopping_mall_cancellation_requests table, which is the operational store for a customer-submitted cancellation workflow. The target record is identified by its primary key and is linked to exactly one shopping_mall_order_items row through shopping_mall_order_item_id. The underlying schema describes this table as the current mutable state of the workflow, holding the customer-provided reason, the current status, and the latest review-routing and decision fields such as reviewed_by_type, reviewed_at, and decision_note. This makes the endpoint appropriate for updating the live decision state of a request while leaving immutable audit history to shopping_mall_cancellation_request_snapshots.
   *
   * Access to this endpoint must be restricted to authorized reviewers. A seller may update only a cancellation request whose linked order item belongs to that seller, reflecting the platform rule that operational control is scoped to owned commerce records. An administrator may update any cancellation request as part of platform oversight. A customer must not use this endpoint to alter review outcomes after submission. The implementation should therefore resolve the linked order item and seller relationship before applying changes and reject attempts by unrelated sellers or unauthenticated actors.
   *
   * The business rules require cancellation processing to remain strictly item-scoped. A cancellation request applies to exactly one order item and must never be converted into an order-wide action. The endpoint must preserve that boundary by forbidding any attempt to rebind the request to another order item or otherwise broaden its scope. It should update only mutable workflow fields on the existing request record and must continue to respect eligibility and ownership constraints already established by the submission workflow.
   *
   * This operation works together with the cancellation request creation flow. A request is first created through a submission endpoint after the customer selects one eligible order item and provides a reason. After that initial creation, this endpoint is used by the responsible seller or an administrator to record the review outcome on the existing request. Consumers that need the current review trail should use the detailed cancellation request retrieval flow after this update so they can observe the latest request state alongside any preserved snapshot history.
   *
   * When the update succeeds, the service should return the refreshed cancellation request representation. If the request does not exist, if the caller is not authorized to review it, or if the requested transition is not valid for the current state, the service must reject the operation without modifying the record. The service should also preserve audit traceability by creating a related shopping_mall_cancellation_request_snapshots entry that captures reviewer readability context for the change.
   *
   * @param connection
   * @param cancellationRequestId Target cancellation request identifier
   * @param body Updated review and status information for the cancellation request
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Load the target shopping_mall_cancellation_requests row by id where deleted_at is null. Join or subsequently load the related shopping_mall_order_items row, its shopping_mall_seller_id, and the parent shopping_mall_orders row if needed for contextual validation.
   *
   * Authorize based on actor type. If the caller is a seller, verify the linked order item's shopping_mall_seller_id matches the authenticated seller id. If the caller is an administrator or super administrator, allow oversight update. Reject customer and unauthenticated callers.
   *
   * Validate the incoming IShoppingMallCancellationRequest.IUpdate payload against allowed mutable fields only. Do not allow reassignment of shopping_mall_order_item_id or shopping_mall_customer_id. Permit updating workflow state fields such as status and decision_note. Derive reviewed_by_type from the authenticated reviewer actor rather than trusting a client-supplied value. Set reviewed_at to the current timestamp when a review decision is recorded.
   *
   * Enforce business rules for state transitions. The request must remain scoped to the existing single order item. Reject invalid transitions, duplicate finalization attempts, or attempts to move a request back into an inconsistent state. If the current request is already in a terminal reviewed state and the business policy does not allow further edits, reject the update.
   *
   * Execute the mutation in a transaction. Update shopping_mall_cancellation_requests.status, decision_note, reviewed_by_type, reviewed_at, and updated_at as appropriate. After a successful update, insert a new shopping_mall_cancellation_request_snapshots row linked by shopping_mall_cancellation_request_id and populate reviewer_display_name with a readable reviewer identity if available.
   *
   * Return the refreshed cancellation request entity after the transaction commits. Report not found when cancellationRequestId does not resolve to an active row. Report forbidden for seller ownership mismatches. Report validation failure for unsupported field edits, missing required decision data, or invalid workflow transitions.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put()
  public async update(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("cancellationRequestId")
    cancellationRequestId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallCancellationRequest.IUpdate,
  ): Promise<IShoppingMallCancellationRequest> {
    try {
      return await putShoppingMallSellerCancellationRequestsCancellationRequestId(
        {
          seller,
          cancellationRequestId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
