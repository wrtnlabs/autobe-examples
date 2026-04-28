import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallCancellationRequestSnapshot } from "../../../../../api/structures/IPageIShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCancellationRequestSnapshot } from "../../../../../api/structures/IShoppingMallCancellationRequestSnapshot";
import { CustomerAuth } from "../../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../../decorators/payload/CustomerPayload";
import { getShoppingMallCustomerCancellationRequestsCancellationRequestIdSnapshotsSnapshotId } from "../../../../../providers/getShoppingMallCustomerCancellationRequestsCancellationRequestIdSnapshotsSnapshotId";
import { patchShoppingMallCustomerCancellationRequestsCancellationRequestIdSnapshots } from "../../../../../providers/patchShoppingMallCustomerCancellationRequestsCancellationRequestIdSnapshots";

@Controller(
  "/shoppingMall/customer/cancellation-requests/:cancellationRequestId/snapshots",
)
export class ShoppingmallCustomerCancellation_requestsSnapshotsController {
  /**
   * Retrieve the preserved decision-history snapshots for a specific cancellation request.
   *
   * This operation returns the immutable historical records attached to a single live cancellation request so that relevant parties can review how the case evolved over time. In the underlying data model, `shopping_mall_cancellation_request_snapshots` is an append-only child table of `shopping_mall_cancellation_requests`. The child records preserve audit-readable metadata such as the `reviewer_display_name` and the snapshot `created_at` timestamp, while the parent cancellation request continues to hold the current mutable operational fields such as `status`, `reason`, `reviewed_by_type`, `reviewed_at`, and `decision_note`. This separation exists specifically so the platform can answer both what the cancellation request looks like now and what it looked like at earlier change points.
   *
   * The business purpose of this endpoint is audit review, timeline inspection, and dispute support. Requirements state that the owner of the cancellation request, the seller responsible for the related order item, and administrators overseeing orders must be able to view the preserved cancellation decision history for the selected request. When they do so, the platform must present when each change was made, what changed in the cancellation request, and the before-and-after values captured for each preserved change. The snapshot history therefore acts as stable historical evidence for cancellation-related review and resolution activities.
   *
   * This endpoint is read-only even though it uses the PATCH method. PATCH is used here to support structured search and browsing criteria in the request body, such as pagination, sort direction, and timeline-oriented filtering, while still returning data rather than mutating it. Snapshot records themselves are immutable by business rule: once created, they cannot be edited and cannot be deleted. They are created automatically as part of recording a seller or administrator response to a cancellation request, and earlier snapshots remain available even if later decisions change the current request state.
   *
   * From a security perspective, callers must not gain access merely by knowing a `cancellationRequestId`. The service implementation must verify that the authenticated customer owns the cancellation request, that the authenticated seller is responsible for the related order item, or that the authenticated administrator has order-oversight authority. Requests that fail these ownership or oversight checks must be rejected as not accessible. This endpoint is typically used together with the live cancellation request detail endpoint so a caller can inspect the current state first and then browse the preserved snapshot timeline for historical context.
   *
   * @param connection
   * @param cancellationRequestId Target cancellation request ID
   * @param body History browsing criteria and pagination options
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Implement a paginated history query scoped to one
     *   parent row in `shopping_mall_cancellation_requests`.
   *
   * 1. Resolve the path parameter `cancellationRequestId` as a UUID and load the parent cancellation request from `shopping_mall_cancellation_requests` by `id`, excluding logically removed records as appropriate for active-history access if the service layer treats `deleted_at` as non-browsable to normal actors.
   * 2. Authorize access before loading snapshot history:
   *    - customer: allow only when `shopping_mall_customer_id` on the parent request matches the authenticated customer account;
   *    - seller: allow only when the authenticated seller is operationally responsible for the related order item referenced by `shopping_mall_order_item_id`;
   *    - administrator: allow for order-oversight access.
   *    Reject unrelated actors.
   * 3. Query `shopping_mall_cancellation_request_snapshots` where `shopping_mall_cancellation_request_id = cancellationRequestId`.
   * 4. Apply request-body list controls from `IShoppingMallCancellationRequestSnapshot.IRequest`, limited to read concerns such as page, limit, cursor or offset, created-at range filters, and sort direction. Default sorting should be chronological by `created_at` descending for recent-first review, unless the request explicitly asks otherwise.
   * 5. For each snapshot row, compose the summary DTO from snapshot fields and, where required by the DTO contract, enrich with current or preserved parent-context values needed for human-readable decision history. Do not mutate any snapshot data and do not infer non-existent columns.
   * 6. Return `IPageIShoppingMallCancellationRequestSnapshot.ISummary` with pagination metadata and ordered data.
   *
   * Validation and error handling:
   * - If `cancellationRequestId` is not a valid UUID, reject the request.
   * - If the parent cancellation request does not exist, return a not-found error.
   * - If the caller lacks ownership or oversight authority, return a forbidden or not-found style access denial according to platform policy.
   * - If pagination or sort inputs are invalid, return validation errors.
   *
   * Implementation notes:
   * - Use the existing index on `[shopping_mall_cancellation_request_id, created_at]` for efficient timeline retrieval.
   * - Preserve immutable-history semantics: this operation must never create, edit, or remove snapshot rows.
   * - Keep parent and child concerns separated. The parent record remains the source of current request state, while the snapshot table is the source of preserved event-history entries.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("cancellationRequestId")
    cancellationRequestId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallCancellationRequestSnapshot.IRequest,
  ): Promise<IPageIShoppingMallCancellationRequestSnapshot.ISummary> {
    try {
      return await patchShoppingMallCustomerCancellationRequestsCancellationRequestIdSnapshots(
        {
          customer,
          cancellationRequestId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a specific immutable cancellation request snapshot for a cancellation request.
   *
   * This operation returns one preserved historical record from the cancellation decision history of a selected cancellation request. In the domain model, a cancellation request snapshot is an immutable historical record that captures a past point in the progression of a cancellation case, rather than the current active state. The underlying snapshot table, `shopping_mall_cancellation_request_snapshots`, is described as an append-only child audit structure attached to `shopping_mall_cancellation_requests`, and each row preserves child-specific audit metadata for operational traceability and dispute review. The endpoint is therefore intended for historical inspection of a single recorded decision event, not for reading or modifying the live request state itself.
   *
   * Access to this operation must be restricted to the relevant parties identified by the requirements for viewing cancellation decision history. The owner customer of the cancellation request may inspect the preserved history of their own case. The seller responsible for the related order item may inspect the same history because the seller participates in cancellation review for that item. Administrators overseeing orders may also inspect the history for oversight and resolution purposes. The implementation must not expose snapshot data for unrelated cancellation requests, and it must confirm that the requested snapshot belongs to the cancellation request identified in the path before returning any data.
   *
   * This endpoint is closely related to the current cancellation request record stored in `shopping_mall_cancellation_requests`. That parent table stores the current mutable workflow state, including fields such as `status`, `reason`, `reviewed_by_type`, `reviewed_at`, and `decision_note`, while the snapshot table preserves immutable audit readability data such as `reviewer_display_name` and `created_at`. The requirements state that cancellation decision history must show when each change was made, what changed, and the before and after values captured for each preserved change. Because the loaded snapshot schema intentionally avoids duplicating all parent request attributes, the implementation may need to assemble a detailed response by combining the snapshot row with the related parent request context or with derived history content defined in the DTO schema.
   *
   * This operation supports post-purchase audit review and dispute resolution. The requirements explicitly state that preserved cancellation request snapshots are used as supporting evidence for cancellation-related review and resolution activities, and that snapshots remain available even after later responses change the current state of the related cancellation request. For that reason, this operation must behave as a read-only historical lookup. It must never alter the snapshot, the parent cancellation request, or the order item. If the parent cancellation request does not exist, if the snapshot does not exist, if the snapshot is not associated with the specified parent request, or if the caller is not one of the permitted parties, the operation must fail without revealing unauthorized history.
   *
   * @param connection
   * @param cancellationRequestId Identifier of the parent cancellation request
   * @param snapshotId Identifier of the cancellation request snapshot
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Implement a read-only detail query for a single
     *   `shopping_mall_cancellation_request_snapshots` row scoped by its parent
     *   cancellation request.
   *
   * 1. Parse `cancellationRequestId` and `snapshotId` as UUID values.
   * 2. Load the parent row from `shopping_mall_cancellation_requests` by `id = cancellationRequestId`. If not found, return a not-found error.
   * 3. Load the target snapshot from `shopping_mall_cancellation_request_snapshots` by `id = snapshotId` and `shopping_mall_cancellation_request_id = cancellationRequestId`. If not found, return a not-found error. This parent-child check is mandatory even if `snapshotId` is globally unique.
   * 4. Authorize the caller according to business rules for viewing cancellation decision history:
   *    - customer: allowed only when the caller owns `shopping_mall_cancellation_requests.shopping_mall_customer_id`;
   *    - seller: allowed only when the caller is the seller operationally responsible for the related order item referenced by `shopping_mall_cancellation_requests.shopping_mall_order_item_id`; resolve this through the related order item record;
   *    - administrator: allowed for order oversight;
   *    - all other actors must be rejected.
   * 5. Construct the response DTO as `IShoppingMallCancellationRequestSnapshot`. Map snapshot fields directly from the snapshot row, including `id`, `reviewer_display_name`, and `created_at`. Include parent-linked historical context required by the DTO from the associated cancellation request and any snapshot history representation defined in schema components so the consumer can understand the preserved decision event in context.
   * 6. Do not update any timestamps or state during retrieval. This is a pure read operation over immutable history.
   *
   * Implementation notes:
   * - Use a single transaction or consistent read boundary if additional joins are needed for authorization and response shaping.
   * - Do not trust only the snapshot ID; always verify its association with the provided parent cancellation request ID.
   * - Treat snapshots as immutable evidence. No edit, delete, or restoration logic belongs here.
   * - If the parent cancellation request has been logically removed through `deleted_at`, preserve the ability to read historical snapshots only if the broader authorization and product policy allow historical review; otherwise return not found or forbidden according to platform conventions.
   * - Keep error responses generic enough to avoid leaking the existence of another user's cancellation history.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":snapshotId")
  public async at(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("cancellationRequestId")
    cancellationRequestId: string & tags.Format<"uuid">,
    @TypedParam("snapshotId")
    snapshotId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallCancellationRequestSnapshot> {
    try {
      return await getShoppingMallCustomerCancellationRequestsCancellationRequestIdSnapshotsSnapshotId(
        {
          customer,
          cancellationRequestId,
          snapshotId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
