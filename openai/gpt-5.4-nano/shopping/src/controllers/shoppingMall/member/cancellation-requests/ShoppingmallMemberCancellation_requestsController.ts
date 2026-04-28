import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallCancellationRequest } from "../../../../api/structures/IPageIShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequest } from "../../../../api/structures/IShoppingMallCancellationRequest";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteShoppingMallMemberCancellationRequestsCancellationRequestId } from "../../../../providers/deleteShoppingMallMemberCancellationRequestsCancellationRequestId";
import { getShoppingMallMemberCancellationRequestsCancellationRequestId } from "../../../../providers/getShoppingMallMemberCancellationRequestsCancellationRequestId";
import { patchShoppingMallMemberCancellationRequests } from "../../../../providers/patchShoppingMallMemberCancellationRequests";
import { postShoppingMallMemberCancellationRequests } from "../../../../providers/postShoppingMallMemberCancellationRequests";
import { putShoppingMallMemberCancellationRequestsCancellationRequestId } from "../../../../providers/putShoppingMallMemberCancellationRequestsCancellationRequestId";

@Controller("/shoppingMall/member/cancellation-requests")
export class ShoppingmallMemberCancellation_requestsController {
  /**
   * Create a customer-initiated cancellation request for a specific order item and start the seller-approval workflow.
   *
   * This operation creates a record in `shopping_mall_cancellation_requests` that is attached to exactly one `shopping_mall_order_items` row via `shopping_mall_cancellation_requests.shopping_mall_order_item_id`. The created request captures the customer-provided `reason` and stores the initial request placement time (`requested_at` and `created_at`) while `status` remains in the seller-approval phase until a seller decision is made.
   *
   * Security and authorization: this endpoint must be callable only by an authenticated member who owns the target order item. The service must reject attempts where the provided `shopping_mall_order_item_id` does not belong to the currently authenticated customer, preventing cross-customer cancellation requests.
   *
   * Business rules and workflow: cancellation requests are scoped to a single order item. The service must ensure that the requested cancellation can be accepted at the current order-item lifecycle stage (using the order item’s current `line_item_status`). If the order item cannot accept a new cancellation request due to its state, the operation must reject the request without applying any changes.
   *
   * Data integrity: upon successful creation, the platform should persist the request record with consistent timestamps (`requested_at`, `created_at`) and initialize seller decision fields as null until the seller responds (`seller_decisioned_at`, `seller_response_reason`).
   *
   * Related behaviors: once the seller decides (approve/reject), the system will update downstream order-item outcomes through the cancellation workflow. For administrators forcing cancellation status updates, separate admin operations apply to order items and must keep inventory/status transitions consistent.
   *
   * Expected errors: unauthorized access, non-existent target order item, or invalid order-item state should result in an error response and no cancellation request row should be created.
   *
   * @param connection
   * @param body Payload to create a cancellation request targeting a single order item, including the customer-provided reason.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation steps: 1) Authenticate actor and
     *   resolve current member/customer identity. 2) Parse request body
     *   (ICreate) including target `orderItemId` (maps to
     *   shopping_mall_order_items.id) and `reason`. 3) Load
     *   `shopping_mall_order_items` by id, ensuring it belongs to an order
     *   whose `shopping_customer_id` equals the authenticated member id. If not
     *   found or not owned, reject. 4) Validate that the order item is eligible
     *   for cancellation-request creation based on
     *   `shopping_mall_order_items.line_item_status` (exact accepted states are
     *   defined in domain rules; reject if terminal or incompatible). 5) Create
     *   `shopping_mall_cancellation_requests` row: - set
     *   `shopping_mall_order_item_id` to the provided orderItemId - set
     *   `reason` from request - set `requested_at` to current timestamp - set
     *   `status` to the initial seller-approval pending value (as defined in
     *   the system) - set `seller_decisioned_at` to null - set
     *   `seller_response_reason` to null - set `created_at` and `updated_at` to
     *   current timestamp - set `deleted_at` to null 6) Return the created
     *   cancellation request entity representation. Transactionality: wrap
     *   steps (3)-(5) in a single transaction so that no partial records are
     *   produced. Edge cases: if multiple cancellation requests are submitted
     *   concurrently for the same order item, enforce the single-active-request
     *   or idempotency constraint if specified by business rules; otherwise
     *   reject conflicting creation attempts to keep workflow consistent.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async createCancellationRequest(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IShoppingMallCancellationRequest.ICreate,
  ): Promise<IShoppingMallCancellationRequest> {
    try {
      return await postShoppingMallMemberCancellationRequests({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered, paginated list of cancellation requests raised by customers for specific order items, and (when permitted) support seller-side workflow transitions via controlled approval-related fields.
   *
   * This operation targets the `shopping_mall_cancellation_requests` table, which stores the cancellation request lifecycle for a single `shopping_mall_order_items` record through `shopping_mall_order_item_id`. Each record captures `reason` provided by the customer, `requested_at` (customer request time), `status` (seller approval workflow state), `seller_decisioned_at` (set when the seller decides), and the optional `seller_response_reason` explaining the seller outcome. The table also retains audit metadata (`created_at`, `updated_at`) and a `deleted_at` timestamp to remove records from active views while keeping historical traceability.
   *
   * Security and authorization are required because cancellation requests are customer-owned but include seller-decision data. The system must ensure:
   *
   * - An unauthenticated guest cannot access or submit cancellation request queries that require account identity.
   * - A customer can only view cancellation requests that belong to their own order items (i.e., the cancellation request’s `shopping_mall_order_item_id` resolves to an order owned by the requesting customer).
   * - A seller (for the relevant seller-managed shipment/order items) and an administrator can view and perform approval workflow actions only for cancellation requests that fall within their permitted scope.
   *
   * Validation and consistency rules must be applied before updates: requested filters must be well-formed; the operation must not apply any seller decision fields if business rules for status transitions are not satisfied.
   *
   * When the operation is used to perform workflow transitions, it must ensure the update is atomic: cancellation request fields (`status`, `seller_decisioned_at`, `seller_response_reason`) must be updated consistently with the related order item workflow (`shopping_mall_order_items.line_item_status`) handled by the service layer. If the seller approval decision would conflict with the current order item terminal state or eligibility, the operation must reject the request and leave existing persisted data unchanged.
   *
   * Related endpoints: clients typically pair this operation with order-item views (e.g., viewing order items or shipments) so users can understand the context of each cancellation request and its current `status`. This endpoint is responsible for returning the cancellation request records that match the provided search criteria; detailed order item fields should be obtained via the order-item-related operations.
   *
   * @param connection
   * @param body Cancellation request search criteria (filters), pagination, and optional workflow action inputs when permitted for the caller.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement a paginated, criteria-driven list/query
     *   over shopping_mall_cancellation_requests, with optional seller-side
     *   approval update behavior depending on request payload.
   *
   * Algorithm:
   * 1. Parse request body (IShoppingMallCancellationRequest.IRequest) for:
   *    - pagination (page size / page cursor)
   *    - sorting (default by created_at desc)
   *    - filters: shopping_mall_order_item_id (optional), status (optional), requested_at range (optional), created_at range (optional)
   * 2. Build a base query over shopping_mall_cancellation_requests selecting rows where deleted_at is null (active view) unless the request explicitly asks to include deleted items (if supported by IRequest DTO).
   * 3. Apply authorization scoping:
   *    - For customer actor: join to shopping_mall_order_items -> shopping_mall_orders via shopping_mall_order_id, enforce shopping_mall_orders.shopping_customer_id equals authenticated customer member id.
   *    - For seller actor: scope cancellation requests by seller ownership of the relevant order items through the order’s seller shipment grouping (via shopping_mall_shipment_id -> shopping_mall_shipments seller linkage). Use the service-layer permission utilities.
   *    - For admin actor: allow broader visibility.
   * 4. If the payload includes workflow action fields (e.g., target status transition intent), validate:
   *    - Only allowed statuses can be set.
   *    - seller_decisioned_at must be set when status moves out of pending state.
   *    - seller_response_reason required/optional according to the chosen status.
   *    - Business conflict checks: ensure related shopping_mall_order_items.line_item_status allows the transition; reject when terminal/conflicting.
   * 5. For list-only behavior:
   *    - Fetch a page of cancellation request rows plus minimal joined context if required by the ISummary DTO.
   * 6. For workflow-update behavior:
   *    - Perform updates in a transaction:
   *      a) Update shopping_mall_cancellation_requests (status, seller_decisioned_at, seller_response_reason, updated_at).
   *      b) Update corresponding shopping_mall_order_items.line_item_status as required by business logic in the service layer.
   *    - Ensure that on validation failure or rejected status transition, no rows are updated.
   * 7. Return IPageIShoppingMallCancellationRequest.ISummary (paged summaries).
   *
   * Edge cases:
   * - If filters yield no rows, return an empty page with valid pagination metadata.
   * - Reject when any requested workflow action refers to cancellation requests outside the actor’s scope.
   * - Concurrency: if multiple decisions race for the same request, the service layer must use optimistic checks (e.g., current status) and reject/serialize conflicting changes so the final outcome remains consistent.
   *
   * Error handling:
   * - Use standardized error responses for authorization failures, invalid filters, and invalid status transitions.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IShoppingMallCancellationRequest.IRequest,
  ): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
    try {
      return await patchShoppingMallMemberCancellationRequests({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single cancellation request identified by `cancellationRequestId`.
   *
   * This operation returns the customer-created cancellation request that is associated with exactly one order item, as described by the cancellation request concept (item-specific decision workflow between customer and seller). The response includes the cancellation reason provided by the customer and the current seller decision state.
   *
   * Authorization is enforced based on the caller’s role and ownership of the underlying order item: a customer must only be able to view cancellation requests tied to their own order items, while a seller must only be able to view cancellation requests for order items that are within the seller’s responsibility. Administrators may view additional information for dispute resolution governance.
   *
   * If the identifier does not match any existing cancellation request, the operation returns a not-found error. If the cancellation request exists but is not viewable by the caller, the operation returns an authorization/forbidden error. This endpoint is read-only and does not create any new snapshot records.
   *
   * For UI flows, this operation can be used after a cancellation-request search/list operation to display details, and it can be shown alongside order-item context endpoints so that users can understand which purchased item the cancellation applies to.
   *
   * @param connection
   * @param cancellationRequestId Target cancellation request identifier.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1) Parse `cancellationRequestId` from path.
   *
   * 2) Authorize the caller:
   *    - Identify the caller actor (customer/member/seller/admin) from the session.
   *    - Load the cancellation request row by `id`.
   *    - If not found: return 404.
   *    - If found:
   *      - Enforce visibility:
   *        * Customer: allow only if the cancellation request’s `shopping_mall_order_item_id` belongs to an order owned by the customer.
   *        * Seller: allow only if the related order item’s `seller_snapshot_id` corresponds to the seller’s view context.
   *        * Admin: allow.
   *      - If `deleted_at` is set:
   *        * Non-admin: deny visibility (treated as removed from active views).
   *        * Admin: allow.
   *
   * 3) Return the cancellation request fields from shopping_mall_cancellation_requests:
   *    - id, shopping_mall_order_item_id, reason, requested_at, status, seller_decisioned_at, seller_response_reason, created_at, updated_at.
   *    - Include any representation needed by IShoppingMallCancellationRequest.
   *
   * 4) Implementation details:
   *    - Use a single transaction-free read (no writes).
   *    - Ensure indexes can be used by querying primarily on `id`.
   *    - For seller/customer authorization checks, perform necessary joins to shopping_mall_order_items (and, if needed, shopping_mall_orders and snapshots via seller_snapshot_id) using the ORM relations.
   *
   * 5) Error handling:
   *    - 400: if path parameter is malformed.
   *    - 403/401 depending on auth failure.
   *    - 404 when the cancellation request id does not exist.
   *
   * Dependencies:
   * - None required as a pre-execution, but authorization may require joining shopping_mall_order_items to confirm the caller’s relationship.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":cancellationRequestId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("cancellationRequestId")
    cancellationRequestId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await getShoppingMallMemberCancellationRequestsCancellationRequestId(
        {
          member,
          cancellationRequestId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing cancellation request by identifier.
   *
   * This endpoint modifies the seller-approval workflow outcome for a single record in `shopping_mall_cancellation_requests`. Each cancellation request belongs to exactly one `shopping_mall_order_items` record (`shopping_mall_order_item_id`), ensuring that seller decisions are scoped to one order item’s cancellation process.
   *
   * Security and authorization must be enforced according to actor roles: only the authorized party that is allowed to decide or act on cancellation requests should be able to apply changes. Unauthorized attempts must be rejected without changing stored cancellation request data.
   *
   * This operation updates the decision-related fields (for example, the approval/rejection `status` and any seller-provided explanation fields) on the targeted `shopping_mall_cancellation_requests` row. The database linkage ensures the request is always associated with the correct `shopping_mall_order_items` row and its workflow status progression.
   *
   * Validation rules:
   * - The target `cancellationRequestId` must identify an existing cancellation request record.
   * - Updates must be consistent with the cancellation workflow so that once a seller decision is finalized, contradictory updates are prevented.
   * - When the seller provides a rejection explanation (`seller_response_reason`) it must be consistent with the decision outcome.
   *
   * Behavior and errors:
   * - If the cancellation request does not exist, reject the operation.
   * - If the cancellation request is already decided in a way that would conflict with the requested update, reject the operation and do not alter the stored record.
   * - If authorization fails, reject the operation and do not change what is stored.
   *
   * Related operations:
   * - A customer-facing cancellation request creation endpoint would create records in `shopping_mall_cancellation_requests` tied to `shopping_mall_order_items`.
   * - Order item, shipment, and refund/cancellation status operations must remain consistent with this decision because `shopping_mall_order_items.line_item_status` is derived from the business workflow progression.
   *
   * This endpoint is designed to be the single record update mechanism for cancellation request decision handling.
   *
   * @param connection
   * @param cancellationRequestId Identifier of the cancellation request record to update.
   * @param body Update payload for modifying the seller decision outcome of a specific cancellation request.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation steps: 1) Parse
     *   `cancellationRequestId` (UUID). 2) Load
     *   `shopping_mall_cancellation_requests` by `id` inside a transaction. 3)
     *   Authorization: verify the caller is permitted to update seller decision
     *   outcome for this request record. 4) Business validation: - If
     *   `seller_decisioned_at` is already non-null and the incoming update
     *   attempts to change the decision outcome, reject. - Ensure `status`
     *   transitions are allowed per cancellation workflow rules. - If status
     *   indicates rejection, require or allow `seller_response_reason` per DTO
     *   rules; if status indicates approval, ignore/clear
     *   seller_response_reason according to DTO update semantics. 5) Apply
     *   updates on the row, set `seller_decisioned_at` when decision is first
     *   finalized, and update `updated_at`. 6) Commit transaction. 7) Return
     *   the updated cancellation request.
   *
   * Database operations:
   * - SELECT by primary key (id)
   * - UPDATE single row
   * - Transaction scope ensures atomicity between approval decision fields and any derived workflow triggers.
   *
   * Error handling:
   * - Not found -> 404-like rejection.
   * - Validation failure or rule conflict -> 400-like rejection.
   * - Authorization failure -> 403-like rejection.
   * - Do not create snapshots here; snapshot creation for this domain must happen only after successful edits at the business layer.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":cancellationRequestId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("cancellationRequestId")
    cancellationRequestId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallCancellationRequest.IUpdate,
  ): Promise<IShoppingMallCancellationRequest> {
    try {
      return await putShoppingMallMemberCancellationRequestsCancellationRequestId(
        {
          member,
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
   * Permanently removes a single cancellation request identified by its ID.
   *
   * This endpoint targets the cancellation workflow record that is attached to a specific order item (the record is backed by `shopping_mall_cancellation_requests`, which includes `shopping_mall_order_item_id`, customer `reason`, workflow `status`, and timestamps such as `requested_at`, `seller_decisioned_at`, `created_at`, `updated_at`, plus `deleted_at` for administrative visibility rules). Deleting this record removes the cancellation request from active views used to drive order-item state transitions and seller-approval handling.
   *
   * Access control must ensure that only permitted actors (e.g., the member who owns the order item’s customer side, the seller responsible for approving/rejecting, or an administrator who has governance authority) can invoke this operation for the targeted cancellation request. Unauthorized attempts must be rejected without changing any existing cancellation request data.
   *
   * Business integrity: cancellation requests participate in dispute/workflow history. This endpoint must not modify any snapshot records used for dispute resolution; snapshot records are treated as immutable by the system (`shopping_mall_snapshots` is immutable and cannot be altered or removed). If the system relies on snapshot linkage for historical truth, deletion should either be disallowed or performed in a way that preserves the snapshot history by not touching snapshot tables.
   *
   * Error handling: if the cancellation request does not exist, or if the caller does not have permission for it, the operation must return an error and keep the current state unchanged.
   *
   * @param connection
   * @param cancellationRequestId Target cancellation request ID to remove.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation steps:
   *
   * 1) Authentication & actor authorization
   * - Resolve caller actor from session context.
   * - Identify the target `shopping_mall_cancellation_requests` row by `id = cancellationRequestId`.
   * - Determine ownership/permission scope by joining to `shopping_mall_order_items` via `shopping_mall_order_item_id`.
   * - Authorize based on business rules: allow if caller is the customer who owns the related order, the seller who handles approval for that order item (via the seller snapshot context on the order item), or an admin.
   * - If unauthorized, throw an authorization error.
   *
   * 2) Existence check
   * - If no `shopping_mall_cancellation_requests` row exists for the given ID, throw not-found.
   *
   * 3) Immutability/snapshot integrity
   * - Do not modify or delete records in `shopping_mall_snapshots` and related snapshot payload tables.
   * - If the deletion would require changing snapshot-based dispute resolution context, reject the request.
   *
   * 4) Deletion transaction
   * - Perform the deletion in a transaction.
   * - Prefer marking the record as deleted if the system’s entity policy uses `deleted_at` for visibility; otherwise perform hard deletion if that is the platform’s rule for this endpoint.
   * - Ensure referential integrity: `shopping_mall_cancellation_requests` references `shopping_mall_order_items` with `onDelete: Cascade`, so the delete must not cause unintended cascades beyond the cancellation request itself.
   *
   * 5) Response
   * - Return 200/204 success without returning body content (responseBody is null).
   *
   * Edge cases:
   * - Concurrent seller decision or status transition: re-check current `status` and current linkage to order item before deletion.
   * - If the cancellation request is already deleted (non-null `deleted_at`), treat according to deletion policy (either idempotent success or reject as already removed), but never modify snapshot records.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":cancellationRequestId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("cancellationRequestId")
    cancellationRequestId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallMemberCancellationRequestsCancellationRequestId(
        {
          member,
          cancellationRequestId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
