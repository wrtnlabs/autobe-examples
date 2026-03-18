import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallCancellationRequest } from "../../../../../api/structures/IPageIShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequest } from "../../../../../api/structures/IShoppingMallCancellationRequest";
import { AdminAuth } from "../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../decorators/payload/AdminPayload";
import { deleteShoppingMallAdminAdminCancellationRequestsCancellationRequestId } from "../../../../../providers/deleteShoppingMallAdminAdminCancellationRequestsCancellationRequestId";
import { getShoppingMallAdminAdminCancellationRequestsCancellationRequestId } from "../../../../../providers/getShoppingMallAdminAdminCancellationRequestsCancellationRequestId";
import { patchShoppingMallAdminAdminCancellationRequests } from "../../../../../providers/patchShoppingMallAdminAdminCancellationRequests";
import { putShoppingMallAdminAdminCancellationRequestsCancellationRequestId } from "../../../../../providers/putShoppingMallAdminAdminCancellationRequestsCancellationRequestId";

@Controller("/shoppingMall/admin/admin/cancellation-requests")
export class ShoppingmallAdminAdminCancellation_requestsController {
  /**
   * Admin users can retrieve a paginated, filterable list of customer-initiated cancellation requests.
   *
   * This operation is designed for administrative oversight of the cancellation workflow that starts when a customer raises a cancellation request for a specific `shopping_mall_order_items` record and proceeds through seller-approval status handling stored on `shopping_mall_cancellation_requests` (including `reason`, `requested_at`, `status`, and seller decision metadata such as `seller_decisioned_at` and `seller_response_reason`). Because cancellation requests are tied to order-item level fulfillment and may require dispute resolution, the operation focuses on returning enough information to identify the target order item and understand the current request state, without modifying any records.
   *
   * Authorization must be limited to the `admin` actor. Requests from unauthenticated users or non-admin actors must be rejected with an authorization failure response. This endpoint does not perform any authentication/session management; it relies on existing middleware.
   *
   * Filtering and sorting must operate only on fields defined for `shopping_mall_cancellation_requests` (and allowed joined views via the referenced `shopping_mall_order_items`), such as request `status` and the timeline (`requested_at`, `created_at`, and `seller_decisioned_at`). Pagination is required to support large history volumes. The response includes summary items intended for list UIs and an overall pagination container.
   *
   * Error handling: if the provided filter criteria are invalid or out of supported bounds, return a validation error. If no cancellation requests match, return an empty `data` list with pagination metadata.
   *
   * Related operations: administrators can inspect the broader order lifecycle (e.g., order item and shipment state) through their dedicated admin endpoints. This operation complements those read endpoints by focusing specifically on cancellation request workflow records.
   *
   * @param connection
   * @param body Admin search criteria and pagination settings for cancellation requests.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implement an admin-scoped search endpoint over `shopping_mall_cancellation_requests` joined with `shopping_mall_order_items` for identifying context.
   *
   * 1) Parse `IShoppingMallCancellationRequest.IRequest` from request body.
   * 2) Build a query:
   *    - Base: shopping_mall_cancellation_requests where `deleted_at` is null to represent active/visible records in admin views (apply consistent visibility rules used across the service).
   *    - Optional filters from request DTO:
   *      - status equals one or multiple provided values.
   *      - requested_at range (start/end) if provided.
   *      - seller_decisioned_at range if provided.
   *      - created_at range if provided.
   *      - search by order item id or other allowed identifiers that correspond to `shopping_mall_order_items.id`.
   *    - Sorting:
   *      - Allow sorting by `requested_at`, `created_at`, and `seller_decisioned_at` in ascending/descending order.
   * 3) Join strategy:
   *    - Left-join `shopping_mall_order_items` on `shopping_mall_order_item_id` to enrich list summaries (e.g., order id reference, product variant reference, line_item_status).
   * 4) Apply pagination (limit/offset or cursor as per DTO contract). Always return deterministic ordering.
   * 5) Select only fields needed by `IShoppingMallCancellationRequest.ISummary` to reduce payload size.
   * 6) Return `IPageIShoppingMallCancellationRequest.ISummary` with pagination metadata and the resulting `data` array.
   *
   * Edge cases:
   * - If pagination limit is missing, use server default; if it exceeds maximum supported, clamp or reject per DTO validation.
   * - If filtering references non-existent status values, validation should reject before query execution.
   *
   * No writes: this endpoint must not change any row in `shopping_mall_cancellation_requests` or related tables.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdminAuth()
    admin: AdminPayload,
    @TypedBody()
    body: IShoppingMallCancellationRequest.IRequest,
  ): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
    try {
      return await patchShoppingMallAdminAdminCancellationRequests({
        admin,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a specific cancellation request that targets an individual order item, as visible to platform administrators.
   *
   * This endpoint is designed for administrator oversight of the cancellation workflow associated with a customer’s order item. In the underlying model, a cancellation request is represented by `shopping_mall_cancellation_requests`, which stores the target `shopping_mall_order_items` reference, the customer’s `reason`, the seller-side `status`, and timestamps such as `requested_at` and `seller_decisioned_at`. The administrator can use this information to investigate the decision outcome and any seller-provided `seller_response_reason`, while keeping the historical trace required for dispute resolution.
   *
   * Authorization: only authenticated administrators are allowed to call this operation. Requests from unauthenticated users or non-administrator actors must be rejected.
   *
   * Data relationships and dispute context: the cancellation request is linked to a single `shopping_mall_order_items` record. Related snapshot visibility must remain consistent with dispute resolution requirements; the system must not mutate existing snapshot history during this read.
   *
   * Validation and error handling: if `cancellationRequestId` does not exist or refers to an entry that is not accessible for administrative viewing, the system must return an appropriate error response (e.g., not found / access denied). The operation returns a single detailed cancellation-request payload, not a list.
   *
   * Related operations: administrators may also use separate endpoints to oversee order-item cancellation/refund actions and their force outcomes. This operation is the read counterpart used to inspect the current cancellation request state before or after any administrative force action.
   *
   * @param connection
   * @param cancellationRequestId Target cancellation request ID to retrieve (UUID).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification 1) Validate path parameter `cancellationRequestId` as UUID.
   * 2) Query `shopping_mall_cancellation_requests` by `id` with `deleted_at` consideration consistent with read rules (exclude entries where `deleted_at` is set unless the system’s admin policy allows viewing them; default to excluding from normal views, but allow admin if policy exists—implementation should follow the service read policy).
   * 3) Load the related `shopping_mall_order_items` row by `shopping_mall_cancellation_requests.shopping_mall_order_item_id`.
   * 4) For any returned dispute context, rely on existing snapshot links already present in the involved tables (e.g., `shopping_mall_order_items.seller_snapshot_id`) and snapshot visibility rules enforced at the service/repository layer (e.g., via `shopping_mall_snapshot_parties`). Do not modify or create snapshots.
   * 5) Compose and return the detailed administrator DTO.
   * 6) Error handling: if not found, return 404/not found; if authorization fails, return 401/403.
   *
   * No transaction is required because this endpoint is read-only.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":cancellationRequestId")
  public async at(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("cancellationRequestId")
    cancellationRequestId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallCancellationRequest> {
    try {
      return await getShoppingMallAdminAdminCancellationRequestsCancellationRequestId(
        {
          admin,
          cancellationRequestId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing cancellation request on behalf of an administrator.
   *
   * This endpoint is used by platform governance to decide the outcome of a customer-initiated cancellation request that targets a specific order item. The underlying record is {@link shopping_mall_cancellation_requests}, which stores the customer-provided {@link shopping_mall_cancellation_requests.reason} plus a seller-approval workflow outcome in {@link shopping_mall_cancellation_requests.status}. When the administrator updates the request, the operation must set the administrator decision fields: {@link shopping_mall_cancellation_requests.seller_response_reason} (when provided) and {@link shopping_mall_cancellation_requests.seller_decisioned_at} (when a decision is made).
   *
   * The administrator must only be able to update the cancellation request within valid workflow progression rules. If the cancellation request is already decided or in a terminal state, the operation must reject the update to prevent contradictory status outcomes.
   *
   * This operation drives downstream effects for the linked {@link shopping_mall_order_items} record referenced by {@link shopping_mall_cancellation_requests.shopping_mall_order_item_id}. Per requirements for administrative oversight, item-level actions must not change other order items automatically; only the targeted order item status may change as a result of this decision. When the decision results in cancellation, the system must restore stock quantities for the purchased variant associated with that order item by appending a consistent {@link shopping_mall_inventory_records} entry. When the decision results in refund, the system must update the order item status to “refunded” and restore stock quantities consistently as required.
   *
   * Security and authorization: only authenticated administrators may call this endpoint. If the acting administrator does not have sufficient privilege grade for the required capability, the platform must deny the action and must not perform the update. Additionally, an administrator must not be able to demote themselves, but this operation does not change administrator grades; access control must still follow the same governance boundary enforcement.
   *
   * Related operations: customers and sellers manage their own cancellation/refund workflows through their respective endpoints, while administrators use this endpoint to force an outcome. Clients that need to browse cancellation requests can use the corresponding listing/search operations (not defined here), then call this endpoint for a specific {@code cancellationRequestId}.
   *
   * Expected behavior and errors: if {@code cancellationRequestId} does not exist, if the cancellation request belongs to an order item that cannot be transitioned consistently, or if the requested status transition breaks workflow ordering, the operation must reject the request rather than writing partial changes.
   *
   *
   * @param connection
   * @param cancellationRequestId Target cancellation request identifier to update (UUID).
   * @param body Administrator update payload for deciding the cancellation request outcome. Carries the target decided status and optional seller/administrator response reason to store with the decision.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implementation steps (transactional):
   *
   * 1) Authenticate request and authorize actor as administrator.
   *    - Enforce grade restrictions: if decision capability is restricted to super-administrator, deny when acting admin grade is insufficient.
   *
   * 2) Parse {@code cancellationRequestId} as UUID and load the {@link shopping_mall_cancellation_requests} row.
   *    - If not found, return 404.
   *
   * 3) Validate workflow state for the loaded cancellation request.
   *    - Only allow updates when {@link shopping_mall_cancellation_requests.status} is in an “awaiting decision” state as defined by domain workflow.
   *    - If seller_decisioned_at is already set or if status indicates a terminal outcome, reject with 409 (or domain-specific conflict).
   *
   * 4) Apply requested administrator decision.
   *    - Update {@link shopping_mall_cancellation_requests.status} to the target decided outcome.
   *    - If request includes {@link shopping_mall_cancellation_requests.seller_response_reason}, write it to {@link shopping_mall_cancellation_requests.seller_response_reason}.
   *    - Set {@link shopping_mall_cancellation_requests.seller_decisioned_at} to current time when a decision is applied.
   *    - Update {@link shopping_mall_cancellation_requests.updated_at}.
   *
   * 5) Drive item-level outcome effects (only the linked order item):
   *    - Load {@link shopping_mall_order_items} by {@link shopping_mall_cancellation_requests.shopping_mall_order_item_id}.
   *    - Validate that updating the order item to the target state would not break business workflow ordering (no contradictory terminal transitions).
   *
   *    For cancellation decision:
   *    - Set {@link shopping_mall_order_items.line_item_status} to the cancellation terminal state as defined by the system’s order item status model.
   *    - Restore stock quantities for {@link shopping_mall_order_items.shopping_mall_product_variant_id} by appending a new {@link shopping_mall_inventory_records} entry that reflects the restored stock. Inventory restoration must be consistent and derived from the current inventory baseline; do not mutate past inventory records.
   *
   *    For refund decision:
   *    - Set {@link shopping_mall_order_items.line_item_status} to the refunded terminal state.
   *    - Restore stock quantities by appending a new {@link shopping_mall_inventory_records} entry for the same {@link shopping_mall_order_items.shopping_mall_product_variant_id}.
   *
   * 6) Ensure scope isolation:
   *    - Do not modify other {@link shopping_mall_order_items} rows within the same order. Only the target order item referenced by the cancellation request may be updated.
   *
   * 7) Use a single database transaction:
   *    - The cancellation request update, order item status update, and inventory record append must commit atomically.
   *
   * 8) Return the updated {@link shopping_mall_cancellation_requests} data as response DTO.
   *
   * Edge cases:
   * - If inventory restoration computation detects insufficient or inconsistent reserved quantities, reject to avoid inconsistent inventory.
   * - If the order item is already in a later terminal state that would conflict with the requested decision, reject the operation.
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":cancellationRequestId")
  public async updateCancellationRequest(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("cancellationRequestId")
    cancellationRequestId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallCancellationRequest.IUpdate,
  ): Promise<IShoppingMallCancellationRequest> {
    try {
      return await putShoppingMallAdminAdminCancellationRequestsCancellationRequestId(
        {
          admin,
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
   * Permanently removes a single administrator-targeted cancellation request record identified by its ID.
   *
   * This endpoint is used by platform administrators to clear up erroneous or obsolete customer cancellation requests that are tied to a specific purchased order item (shopping_mall_order_items). The cancellation request itself is represented by shopping_mall_cancellation_requests, which stores the customer-provided reason (reason), the business event time when the request was placed (requested_at), and seller-approval workflow data including status (status), optional seller decision time (seller_decisioned_at), and optional seller rejection explanation (seller_response_reason).
   *
   * Access control is limited to administrators (admin actor). Non-admin actors must be rejected by the authorization layer before any database access is performed.
   *
   * Because shopping_mall_cancellation_requests is linked to shopping_mall_order_items via shopping_mall_order_item_id, this operation must ensure referential integrity: the deletion of the cancellation request record must not delete or alter the associated order item. Instead, the system should remove only the cancellation request row while leaving the related order item and its fulfillment state unchanged.
   *
   * Validation rules:
   * - If cancellationRequestId does not match an existing shopping_mall_cancellation_requests.id, the operation must return an appropriate not-found error without side effects.
   *
   * Expected behavior and error handling:
   * - The system should treat the deletion as a single atomic operation.
   * - If database-level constraints prevent the deletion, the operation must fail and return an error, leaving all data unchanged.
   *
   * This endpoint complements administrative oversight workflows that also involve order-item status changes (for example, administrator force cancellation/refund operations) and snapshot trail integrity. When implementing deletion logic, ensure it does not retroactively modify any already-captured dispute/snapshot history (e.g., records managed via shopping_mall_snapshots and related snapshot parties).
   *
   * @param connection
   * @param cancellationRequestId Target cancellation request ID to permanently remove (UUID).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implementation steps:
   * 1) Authorization: Require admin actor. Reject guests and members.
   * 2) Parameter validation: Treat cancellationRequestId as UUID string; if it is not a valid UUID, fail fast with a 400-level validation error.
   * 3) Lookup: Query shopping_mall_cancellation_requests by id = cancellationRequestId.
   *    - If not found, return 404.
   * 4) Deletion semantics:
   *    - Remove the shopping_mall_cancellation_requests row for that id.
   *    - Do NOT modify shopping_mall_order_items or any related shipment/payment records.
   *    - Use a transaction for the delete operation.
   * 5) Integrity and audit considerations:
   *    - Ensure cascading behaviors are respected only for relations where the schema defines cascade from cancellation request to its snapshot/history tables (if any exist). Specifically, keep shopping_mall_order_items intact.
   *    - Avoid altering shopping_mall_snapshots; if snapshots exist for this cancellation request, do not delete or mutate them as part of this operation.
   * 6) Response: Return 204/empty JSON body as responseBody is null.
   *
   * Edge cases:
   * - If the cancellation request has been soft-deleted (deleted_at not null), decide behavior according to repository policy: either allow idempotent deletion (return success) or treat as not found. Prefer idempotent success for admin tooling, but keep consistent with global error-handling rules.
   * - Concurrency: if the record is being deleted concurrently, ensure the final outcome is deterministic (either one succeeds and others see not-found).
   *
   * Queries:
   * - SELECT by primary key from shopping_mall_cancellation_requests
   * - DELETE by primary key from shopping_mall_cancellation_requests
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":cancellationRequestId")
  public async erase(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("cancellationRequestId")
    cancellationRequestId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallAdminAdminCancellationRequestsCancellationRequestId(
        {
          admin,
          cancellationRequestId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
