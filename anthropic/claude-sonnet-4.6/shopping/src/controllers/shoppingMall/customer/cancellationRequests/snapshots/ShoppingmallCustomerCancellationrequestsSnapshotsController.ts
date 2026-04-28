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
  "/shoppingMall/customer/cancellationRequests/:cancellationRequestId/snapshots",
)
export class ShoppingmallCustomerCancellationrequestsSnapshotsController {
  /**
   * Retrieve a paginated, filterable list of cancellation request snapshots associated with a specific cancellation request.
   *
   * Each entry in the `shopping_mall_cancellation_request_snapshots` table represents an immutable point-in-time record created each time a seller or administrator responded to a cancellation request. The snapshot captures the resolution decision (`approved` or `rejected`), the verbatim reason text submitted by the customer, and the precise timestamp of the response. Together, these snapshots form a chronological, tamper-proof audit trail for the entire lifecycle of a cancellation request.
   *
   * This operation is scoped to a single parent cancellation request identified by `cancellationRequestId`, which must correspond to an existing record in `shopping_mall_cancellation_requests`. The caller may optionally supply filter criteria such as a `status` value, a creation date range, or a keyword search against the reason text. Results are ordered chronologically by default, reflecting the natural progression of decisions from submission through final resolution.
   *
   * Access to this endpoint is granted to three categories of authorized principals: the customer who originally submitted the cancellation request (so they can review the progression of their request), the seller who responded to it (so they can reference their own response history), and any administrator or super-administrator (for dispute investigation and oversight). Unauthorized callers are rejected.
   *
   * Because all snapshot records are permanent and append-only by design, this endpoint exposes read-only access. No modification or deletion of snapshot data is possible through any API operation. This immutability guarantee ensures that the audit trail remains trustworthy and complete for all parties, including for dispute resolution purposes.
   *
   * Related operations: Use `GET /cancellationRequests/{cancellationRequestId}` first to obtain the parent cancellation request and verify its current status before examining its snapshot history.
   *
   * @param connection
   * @param cancellationRequestId UUID of the target cancellation request whose snapshots are to be listed (global scope, unique across all cancellation requests).
   * @param body Pagination, sorting, and optional filter criteria for listing cancellation request snapshots.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification 1. Verify that the cancellation request
     *   identified by `cancellationRequestId` exists in
     *   `shopping_mall_cancellation_requests`. If not found, return 404. 2.
     *   Authorize the caller: the request must originate from the customer who
     *   owns the associated order item, the seller who received the
     *   cancellation request, or any administrator/super-administrator. Reject
     *   unauthorized access with 403. 3. Query
     *   `shopping_mall_cancellation_request_snapshots` where
     *   `cancellation_request_id = cancellationRequestId`. 4. Apply optional
     *   filters from the request body: - `status`: filter snapshots by their
     *   recorded decision status ('approved' or 'rejected'). - `createdAt` date
     *   range: restrict snapshots to those created within the provided
     *   start/end window. - `keyword`: full-text or trigram search against the
     *   `reason` column (the table has a GIN index on `reason` for trigram
     *   search). 5. Order results by `created_at` ascending (chronological
     *   audit trail order) by default, or as specified by the sort criteria in
     *   the request body. 6. Apply cursor-based or offset-based pagination
     *   using the pagination parameters from the request body. 7. Return the
     *   paginated list wrapped in the standard `IPage` envelope with
     *   `pagination` metadata and a `data` array of snapshot summaries. 8.
     *   Because snapshots are immutable records, no write, update, or delete
     *   logic is involved in this operation.
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
   * Retrieve a single, specific cancellation request snapshot record nested under the given cancellation request.
   *
   * Cancellation request snapshots (backed by the `shopping_mall_cancellation_request_snapshots` table) are immutable, append-only records created at the exact moment a seller or administrator responds to a cancellation request. Each snapshot preserves three pieces of information: the resolution `status` decision (either `'approved'` — meaning the cancellation was accepted and the order item will move to cancelled status — or `'rejected'` — meaning the cancellation was denied and the order item remains in paid status), the original `reason` text submitted verbatim by the customer when filing the cancellation request, and the `created_at` timestamp marking the precise moment the response was recorded.
   *
   * Access to cancellation request snapshots is strictly scoped to the parties involved in the underlying transaction. The customer who placed the order containing the cancellation-requested item may retrieve snapshots for that request, enabling them to review the full history of how their request was handled. The seller whose product is associated with the order item may also retrieve these snapshots, providing a clear record of the decisions they made. Administrators (both regular and super administrators) may retrieve any snapshot across the entire platform to support oversight, audit, and dispute resolution activities. No other parties are granted access.
   *
   * Because snapshots are permanent and tamper-proof, this operation returns the record exactly as it was captured at creation time. Once a snapshot is created, its `status`, `reason`, and `created_at` fields remain unchanged indefinitely — even if the parent cancellation request, order item, or associated seller account is later modified or removed. This immutability makes snapshots the authoritative, definitive record relied upon during dispute resolution.
   *
   * To retrieve this snapshot, the caller must first know both the `cancellationRequestId` (obtainable from the cancellation request resource) and the `snapshotId` (obtainable by listing snapshots under `GET /shoppingMall/customer/cancellationRequests/{cancellationRequestId}/snapshots`). Attempting to retrieve a snapshot whose `cancellation_request_id` does not match the path's `cancellationRequestId` will result in a 404 error.
   *
   * @param connection
   * @param cancellationRequestId The UUID of the parent cancellation request to which the snapshot belongs.
   * @param snapshotId The UUID of the specific cancellation request snapshot to retrieve.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Retrieve a single cancellation request snapshot
     *   by its primary key, scoped to the parent cancellation request.
   *
   * 1. Validate that the cancellation request identified by `cancellationRequestId` exists in the `shopping_mall_cancellation_requests` table. If not found, return 404.
   * 2. Validate that the snapshot identified by `snapshotId` exists in the `shopping_mall_cancellation_request_snapshots` table AND that its `cancellation_request_id` matches `cancellationRequestId`. If not found or mismatched, return 404.
   * 3. Authorization check:
   *    - If the caller is a customer, verify that the cancellation request's associated order item belongs to an order owned by that customer (join: shopping_mall_cancellation_request_snapshots → shopping_mall_cancellation_requests → shopping_mall_order_items → shopping_mall_orders → customer). Deny with 403 if not.
   *    - If the caller is a seller, verify that the cancellation request's associated order item's product variant belongs to a product owned by that seller (join: shopping_mall_cancellation_requests → shopping_mall_order_items → shopping_mall_product_variants → shopping_mall_products → seller). Deny with 403 if not.
   *    - If the caller is an admin or superAdmin, allow unconditionally.
   * 4. Return the snapshot record: id, cancellation_request_id, status, reason, created_at.
   * 5. No mutations are performed. This is a pure read operation on an immutable record.
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
