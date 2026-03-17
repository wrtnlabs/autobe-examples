import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallCancellationRequest } from "../../../../../api/structures/IShoppingMallCancellationRequest";
import { SellerAuth } from "../../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../../decorators/payload/SellerPayload";
import { postShoppingMallSellerCancellationRequestsCancellationRequestIdResponses } from "../../../../../providers/postShoppingMallSellerCancellationRequestsCancellationRequestIdResponses";

@Controller(
  "/shoppingMall/seller/cancellationRequests/:cancellationRequestId/responses",
)
export class ShoppingmallSellerCancellationrequestsResponsesController {
  /**
   * Record a seller or administrator decision for an existing cancellation request tied to one purchased order item.
   *
   * This operation is used after a customer has already submitted a cancellation request against a specific order item in the marketplace. The live cancellation case is stored in the `shopping_mall_cancellation_requests` table, which represents the current mutable state of the workflow, including the customer-provided reason, the current status, the latest reviewer actor type, the latest review timestamp, and the latest decision note. Because the related business rules require cancellation handling to remain strictly item-level, this endpoint applies only to the single `shopping_mall_order_item_id` associated with the targeted cancellation request and must not be used to approve or reject an entire order.
   *
   * The endpoint is intended for seller and administrator review activity. An approved seller may respond only when the related order item belongs to that seller's own commercial scope, reflecting the seller access boundary that limits fulfillment and after-sales authority to the seller's own sales records. An administrator may respond when platform oversight is required. The platform must reject any seller attempt to act on a cancellation request for another seller's order item, and it must also reject responses against requests that have been removed from active use or are otherwise not eligible for further decision handling.
   *
   * This operation updates the active cancellation request record in `shopping_mall_cancellation_requests` by changing fields such as `status`, `reviewed_by_type`, `reviewed_at`, `decision_note`, and `updated_at`. At the same time, the platform must preserve historical evidence in `shopping_mall_cancellation_request_snapshots`, which exists as an immutable audit child of the parent cancellation request. The snapshot history must remain preserved for later review and dispute handling, and previously created snapshot records must never be edited or deleted. In line with the recorded change-history rules, the response-processing flow must preserve when the change was made, what changed, and the values before and after the decision.
   *
   * Clients typically use this endpoint after first retrieving the target cancellation request from a seller or administrator work queue. The resulting updated cancellation request can then be shown in order-item detail views, cancellation review screens, and audit-oriented back-office views. If a client needs the historical trail rather than only the latest state, that history should be retrieved through snapshot-oriented APIs rather than inferred only from the current mutable request row.
   *
   * Validation must ensure that the target cancellation request exists, remains tied to one specific order item, and is in a state that can still accept a response. The submitted decision must be constrained to the supported review outcomes defined by business policy, and any note must be treated as supplemental explanation rather than a substitute for the authoritative status transition. Error handling should clearly distinguish between not found, forbidden ownership scope, already-finalized workflow state, and invalid decision payload cases.
   *
   * @param connection
   * @param cancellationRequestId Target cancellation request ID
   * @param body Decision details for responding to the cancellation request
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Implement a service action that records a review response for an existing cancellation request within a single transaction.
   *
   * 1. Resolve the authenticated actor and authorize only `seller` or `administrator` roles for this operation.
   * 2. Load the target row from `shopping_mall_cancellation_requests` by `id = cancellationRequestId` and `deleted_at IS NULL`. Join `shopping_mall_order_items` through `shopping_mall_order_item_id` to obtain `shopping_mall_seller_id`, item status, and other decision-eligibility context needed by business rules.
   * 3. If no active cancellation request exists, return a not-found error.
   * 4. If the actor is a seller, verify the related `shopping_mall_order_items.shopping_mall_seller_id` matches the authenticated seller account. If it does not match, reject with a forbidden error.
   * 5. Validate that the cancellation request is still eligible to receive a response. Reject attempts to re-process a request that is already in a terminal state according to the service's cancellation workflow policy.
   * 6. Validate the request body decision fields. Require a supported decision outcome and optionally accept a decision note. Do not allow modification of `reason`, `shopping_mall_order_item_id`, `shopping_mall_customer_id`, or any other customer-submitted ownership fields through this endpoint.
   * 7. Capture the pre-change state from the existing cancellation request record for audit purposes.
   * 8. Update `shopping_mall_cancellation_requests` with the new workflow state: set `status` according to the submitted decision, set `reviewed_by_type` to the actor type (`seller` or `administrator`), set `reviewed_at` to the current timestamp, set `decision_note` from the request body, and refresh `updated_at`.
   * 9. Create a new row in `shopping_mall_cancellation_request_snapshots` referencing `shopping_mall_cancellation_requests.id`. Populate `reviewer_display_name` with an audit-readable reviewer label derived from the authenticated actor profile, and set `created_at` to the same transactional timestamp. If the implementation stores richer before/after diff detail in a linked audit facility or serialized metadata layer, persist it as part of the same atomic business action so the historical trail includes what changed and the before/after values required by the business rules.
   * 10. Commit the transaction and return the updated cancellation request aggregate.
   *
   * Additional rules:
   * - Enforce item-level scope only; never expand this response action into an order-wide cancellation decision.
   * - Preserve all existing snapshot rows; never update or remove historical snapshot records.
   * - Keep timestamps consistent within the transaction so `reviewed_at`, snapshot `created_at`, and `updated_at` reflect one response event.
   * - If concurrent review handling is possible, use optimistic or transactional locking so two actors cannot record conflicting decisions simultaneously.
   * - The response DTO should expose the latest cancellation request state, while immutable historical entries remain accessible from separate snapshot retrieval operations.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("cancellationRequestId")
    cancellationRequestId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallCancellationRequest.IResponse,
  ): Promise<IShoppingMallCancellationRequest> {
    try {
      return await postShoppingMallSellerCancellationRequestsCancellationRequestIdResponses(
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
