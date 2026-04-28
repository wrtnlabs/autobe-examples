import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallShipmentConfirmation } from "../../../../api/structures/IShoppingMallShipmentConfirmation";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteShoppingMallMemberShipmentConfirmationsShipmentConfirmationId } from "../../../../providers/deleteShoppingMallMemberShipmentConfirmationsShipmentConfirmationId";
import { getShoppingMallMemberShipmentConfirmationsShipmentConfirmationId } from "../../../../providers/getShoppingMallMemberShipmentConfirmationsShipmentConfirmationId";
import { patchShoppingMallMemberShipmentConfirmations } from "../../../../providers/patchShoppingMallMemberShipmentConfirmations";
import { postShoppingMallMemberShipmentConfirmations } from "../../../../providers/postShoppingMallMemberShipmentConfirmations";
import { putShoppingMallMemberShipmentConfirmationsShipmentConfirmationId } from "../../../../providers/putShoppingMallMemberShipmentConfirmationsShipmentConfirmationId";

@Controller("/shoppingMall/member/shipment-confirmations")
export class ShoppingmallMemberShipment_confirmationsController {
  /**
   * Submit seller shipment confirmation details for a single shipment.
   *
   * This endpoint creates a new record in the `shopping_mall_shipment_confirmations` table, which stores the seller’s confirmation intent (the `confirmation_type`) and the seller-provided fulfillment context (such as `tracking_url`, `tracking_number`, `carrier_name`, and an optional `note`) together with a `confirmed_at` timestamp.
   *
   * The shipment confirmation is the input to the shipment fulfillment workflow: the system uses this record to transition all order items included in the referenced shipment in a consistent, shipment-level manner. Per the requirement “Delivery Confirmation Applies Per Shipment (Not Per Item)”, confirming delivery for a shipment results in all order items contained in that shipment being updated to the appropriate status together.
   *
   * If the system also schedules an automatic completion based on the shipment’s shipping time, this operation must ensure consistency when a confirmation is submitted concurrently. If the shipment becomes completed via either customer confirmation or the automatic completion mechanism, repeated confirmations must be handled gracefully so the final delivered state remains correct and no conflicting transitions are produced.
   *
   * Security and authorization: only authenticated seller actors that are allowed to act on the target shipment should be able to create confirmations. The implementation must verify that the caller can access the referenced shipment before persisting the confirmation record and before triggering any downstream status transitions.
   *
   * Validation rules and error handling: the implementation must validate the existence of the referenced `shopping_mall_shipments` record, validate required fields (`shopping_mall_shipment_id`, `confirmation_type`, `confirmed_at`), and store optional tracking fields exactly as provided. If the same shipment is confirmed in a way that would conflict with already-completed states, the operation should reject or no-op in a way that preserves consistent item statuses.
   *
   * Related operations: after creating a shipment confirmation, clients typically read shipment status using the existing shipment data endpoints (e.g., shipment and order item views) to reflect the updated fulfillment progression.
   *
   * @param connection
   * @param body Shipment confirmation submission payload containing the target shipment id, confirmation type, confirmation timestamp, and optional tracking information.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Persist a new
     *   shopping_mall_shipment_confirmations row and trigger
     *   shipment/order-item status transitions according to the submitted
     *   confirmation_type.
   *
   * Implementation steps:
   * 1) Validate request body shape:
   *    - shoppingMallShipmentId (required, UUID string)
   *    - confirmationType (required, string)
   *    - confirmedAt (required, DateTime)
   *    - trackingUrl/carrierName/trackingNumber/note are optional
   * 2) Authorization:
   *    - Resolve the shipment by shopping_mall_shipment_id from shopping_mall_shipments.
   *    - Verify the caller (seller) is permitted to confirm that shipment (ownership/context verification). Reject if not allowed.
   * 3) Idempotency / state conflict handling:
   *    - Load current shipment.status and/or the latest confirmation record(s) for the shipment.
   *    - If the shipment is already in a completed state that would conflict with the new confirmation_type transition, handle gracefully by rejecting with a business error or treating as already-completed (implementation must prevent contradictory transitions).
   *    - If repeated confirmations arrive, ensure final shipment and order item statuses remain consistent.
   * 4) Transaction:
   *    - Use a single database transaction.
   *    - Insert into shopping_mall_shipment_confirmations with:
   *      - shopping_mall_shipment_id
   *      - confirmation_type
   *      - confirmed_at
   *      - tracking_url, tracking_number, carrier_name, note
   *      - created_at/updated_at managed by DB or service layer
   *    - Trigger fulfillment transitions for all shopping_mall_order_items where shopping_mall_shipment_id == this shipment id.
   *      - Apply the rule that confirmation applies per shipment (update all contained items together).
   *      - Ensure consistency vs any concurrently scheduled automatic completion.
   * 5) Return the created confirmation record (including its id and submitted fields).
   *
   * Database operations:
   * - SELECT shipment by id from shopping_mall_shipments.
   * - SELECT existing confirmation(s) or shipment status for conflict checks.
   * - INSERT into shopping_mall_shipment_confirmations.
   * - UPDATE shopping_mall_order_items set line_item_status appropriately for all items in the shipment.
   *
   * Edge cases:
   * - shipment not found -> reject.
   * - null/empty optional tracking fields -> store as null.
   * - conflicting transition (e.g., later terminal state already reached) -> reject or no-op while preserving consistent order item statuses.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IShoppingMallShipmentConfirmation.ICreate,
  ): Promise<IShoppingMallShipmentConfirmation> {
    try {
      return await postShoppingMallMemberShipmentConfirmations({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Submit a seller shipment confirmation to drive fulfillment state transitions within a customer order.
   *
   * This operation records fulfillment confirmation details into the `shopping_mall_shipment_confirmations` table (including `confirmation_type`, `confirmed_at`, and optional tracking fields such as `tracking_url`, `tracking_number`, `carrier_name`, and `note`). A single confirmation is uniquely associated to one shipment via `shopping_mall_shipment_id` (the table enforces uniqueness on that foreign key), and the confirmation timestamp (`confirmed_at`) is used to determine when the confirmation becomes valid for status transitions.
   *
   * After a successful confirmation is persisted, the system updates the related shipment state in `shopping_mall_shipments.status` and transitions each `shopping_mall_order_items` record that belongs to the shipment (via `shopping_mall_order_items.shopping_mall_shipment_id`) to reflect the fulfillment outcome consistent with the confirmation type. This ensures that delivery/customer-visible completion aligns with the shipment-level confirmation workflow.
   *
   * Security and authorization boundaries: only the seller who owns the relevant shipment (based on shipment grouping context stored in `shopping_mall_shipments`, including `seller_snapshot_id`) should be allowed to submit confirmations for that shipment. Administrators may be allowed to view results and, depending on the broader governance rules, correct invalid states.
   *
   * Validation and edge cases: if the request references a non-existent shipment, or the caller is not authorized to confirm that shipment, the operation must reject the request without changing existing order/shipment states and without creating any misleading audit/snapshot history. If an operation is submitted repeatedly for an already-completed transition, the system must avoid contradictory status updates.
   *
   * Related operations: sellers typically create shipments first (not covered by this endpoint), then submit shipment confirmations through this operation; customers later confirm delivery at the shipment level, which is applied per shipment and transitions all included order items together.
   *
   * Expected client behavior: provide the shipment identifier and confirmation payload; the response returns the saved confirmation data (and any derived shipment status) so the client can render the updated fulfillment timeline.
   *
   * @param connection
   * @param body Shipment confirmation submission payload identifying the target shipment and the confirmation details (shipped/delivered) to apply for fulfillment transitions.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1) Validate request payload. - Require:
     *   shoppingMallShipmentConfirmationRequest must include
     *   shoppingMallShipmentId (UUID) and confirmationType (string) and
     *   confirmedAt (date-time). - Optional: trackingUrl, trackingNumber,
     *   carrierName, note.
   *
   * 2) Authorization.
   * - Resolve target shipment by shopping_mall_shipment_confirmations/shopping_mall_shipments using shopping_mall_shipment_id.
   * - Verify actor is the seller allowed to submit confirmation for that shipment (using shipment's seller_snapshot_id as seller purchase context).
   *
   * 3) Upsert/record confirmation.
   * - transaction:
   *   a) Check if a confirmation already exists for shopping_mall_shipment_id (unique constraint on shopping_mall_shipment_confirmations.shopping_mall_shipment_id).
   *   b) If not exists: create shopping_mall_shipment_confirmations with fields.
   *   c) If exists: update the existing confirmation record (replace tracking fields, note, confirmed_at, and confirmation_type).
   *   d) Update shopping_mall_shipments.status to the corresponding fulfillment status derived from confirmation_type.
   *
   * 4) Transition order items.
   * - Update shopping_mall_order_items where shopping_mall_shipment_id equals target shipment id.
   * - Set shopping_mall_order_items.line_item_status according to the same mapping used for shipment confirmation_type.
   * - Ensure all items within the shipment move consistently (no partial transition).
   *
   * 5) Consistency against timing events.
   * - If automatic transitions or previous transitions were scheduled concurrently for the same shipment, ensure final statuses remain consistent; reject or ignore conflicting attempts.
   *
   * 6) Return result.
   * - Fetch the updated confirmation row and (optionally) the updated shipment status fields needed by response.
   *
   * 7) Error handling.
   * - 404 if shipment not found.
   * - 403 if authorization fails.
   * - 409 if request would cause rule-breaking contradictory transitions (depending on existing shipment/order item states).
   * - On any error: do not update shipment status or order item statuses and do not create inconsistent confirmation rows.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async submitShipmentConfirmation(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IShoppingMallShipmentConfirmation.IRequest,
  ): Promise<IShoppingMallShipmentConfirmation> {
    try {
      return await patchShoppingMallMemberShipmentConfirmations({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the seller’s shipment confirmation record identified by `shipmentConfirmationId`.
   *
   * This read operation returns the confirmation metadata stored for a specific shipment in `shopping_mall_shipment_confirmations`, including the confirmation’s `confirmation_type`, `confirmed_at`, and any available logistics details such as `tracking_url`, `tracking_number`, and `carrier_name`. If present, the `note` field is also returned to provide dispute-resolution context.
   *
   * Shipment lifecycle progression is driven by the shipment confirmation flow: delivered transitions are applied at the shipment level, and the resulting status affects all order items included in that shipment. By fetching this confirmation record, clients can display what the seller confirmed for that shipment.
   *
   * Security and authorization: the implementation must verify that the caller has permission to view the shipment referenced by `shopping_mall_shipment_confirmations.shopping_mall_shipment_id` before returning any details. If the record does not exist or is not viewable by the caller, the operation must respond with an appropriate not-found/forbidden error.
   *
   * Related operations: this confirmation record is tied to `shopping_mall_shipments` and used together with shipment tracking or shipment detail endpoints so the client can present shipment-level status alongside seller-provided confirmation metadata.
   *
   * @param connection
   * @param shipmentConfirmationId Unique identifier of the shipment confirmation record to retrieve.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation steps: 1) Parse
     *   shipmentConfirmationId from path as UUID. 2) Query
     *   shopping_mall_shipment_confirmations by id. - Select all columns
     *   required by the response DTO (at minimum: id,
     *   shopping_mall_shipment_id, confirmation_type, confirmed_at,
     *   tracking_url, tracking_number, carrier_name, note, created_at,
     *   updated_at). - Apply retrieval rules: if
     *   shopping_mall_shipment_confirmations.deleted_at is not null, treat as
     *   not found. 3) Authorization/access check: - Load the referenced
     *   shipment (shopping_mall_shipments) using
     *   shopping_mall_shipment_confirmations.shopping_mall_shipment_id. -
     *   Determine caller actor (guest/member/admin) from the request context
     *   and validate whether they can view this shipment confirmation. - The
     *   authorization rule must rely on the relationship between the shipment
     *   and the caller (e.g., customer ownership through
     *   shopping_mall_orders.shopping_customer_id, or seller context via
     *   seller_snapshot_id), using only fields available in schema and loaded
     *   joins. 4) If not found or not viewable, return an error response. 5)
     *   Map the DB row to IShoppingMallShipmentConfirmation response DTO and
     *   return JSON.
   *
   * Edge cases:
   * - Repeated reads of delivered shipments should continue to return the same confirmation data.
   * - If tracking fields are null (tracking_url/tracking_number/carrier_name), return nulls in the response DTO rather than omitting fields.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":shipmentConfirmationId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("shipmentConfirmationId")
    shipmentConfirmationId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallShipmentConfirmation> {
    try {
      return await getShoppingMallMemberShipmentConfirmationsShipmentConfirmationId(
        {
          member,
          shipmentConfirmationId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a seller shipment confirmation record for a specific shipment.
   *
   * This operation targets the seller-side fulfillment confirmation stored in `shopping_mall_shipment_confirmations`. A seller confirmation defines the `confirmation_type` (for example, the confirmation meaning used by the fulfillment workflow) and the `confirmed_at` timestamp, plus optional tracking details (`tracking_url`, `tracking_number`, `carrier_name`) and an optional seller note (`note`). When the confirmation is accepted for the referenced shipment, the system uses the shipment-level confirmation flow to transition the included order items toward the customer-visible fulfillment progress.
   *
   * This endpoint is part of the shipment lifecycle that supports customer delivery confirmation and automatic delivery completion. For delivery progression, customer confirmation must apply at the shipment level (not per item). Similarly, seller confirmations must not create conflicting item status transitions when multiple timing events (e.g., scheduled automatic completion versus manual confirmation) would otherwise overlap. The implementation must ensure that once the shipment reaches a later terminal state, subsequent conflicting confirmation updates are rejected or treated as no-ops to keep statuses consistent.
   *
   * Security and permissions: Only the authorized seller for the shipment context may update the corresponding shipment confirmation. If an unauthenticated actor or an actor without ownership is used, the system must reject the request. The system must also reject updates when the targeted confirmation record is treated as removed (`shopping_mall_shipment_confirmations.deleted_at` is set) so that historical dispute records remain consistent.
   *
   * Validation and business rules: The operation must validate that the referenced shipment exists and is in a state where seller confirmation update is allowed. It must also validate `confirmation_type` and ensure the update results in an allowed state transition for the shipment. Optional tracking fields (`tracking_url`, `tracking_number`, `carrier_name`) and `note` are validated for length/format based on their schema constraints. The update must be applied atomically: update the confirmation record and (when applicable) update the relevant `shopping_mall_order_items` statuses in the same database transaction.
   *
   * Expected behavior on repeated or conflicting updates: If the order items within the shipment have already reached the target fulfilled state due to a prior confirmation or completion path, the system must prevent contradictory transitions. In particular, the operation must prevent situations where only a subset of order items would be updated when the workflow requires shipment-level consistency.
   *
   * Related operations: To understand shipment progress and customer confirmations, this operation is typically used together with shipment and shipment confirmation retrieval endpoints (e.g., viewing the shipment and current confirmation status) and with any customer delivery confirmation operation that marks the shipment’s included order items as delivered.
   *
   * @param connection
   * @param shipmentConfirmationId The unique identifier of the shipment confirmation record to update.
   * @param body Updated seller shipment confirmation details, including confirmation type, confirmed timestamp, and optional tracking information.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation steps:
   *
   * 1) Authenticate and authorize:
   * - Identify the actor (seller) from the session/claims.
   * - Load the `shopping_mall_shipment_confirmations` row by `id = shipmentConfirmationId`.
   * - If not found, return 404.
   * - If `deleted_at` is not null, reject (e.g., 404 or 410 depending on platform convention).
   * - Load the referenced `shopping_mall_shipments` via `shopping_mall_shipments.id = shopping_mall_shipment_confirmations.shopping_mall_shipment_id`.
   * - Verify the acting seller is authorized for the shipment’s context (seller ownership derived from shipment/order grouping; implementation must follow existing service-layer ownership checks).
   *
   * 2) Validate input fields:
   * - Map request body fields to `shopping_mall_shipment_confirmations` columns:
   *   - confirmation_type (required): validate it matches allowed workflow values.
   *   - confirmed_at (required): must be a valid timestamp.
   *   - tracking_url (optional): validate URL length constraints.
   *   - tracking_number (optional): validate nullable string constraints.
   *   - carrier_name (optional): validate nullable string constraints.
   *   - note (optional): validate nullable string constraints.
   *
   * 3) Shipment eligibility and consistency:
   * - Determine the target shipment transition implied by `confirmation_type`.
   * - Load current shipment `status` from `shopping_mall_shipments`.
   * - If the shipment has already progressed beyond the target transition (e.g., already in delivered terminal state), reject the update to avoid conflicting transitions, or treat it as already-completed/no-op according to project error-handling convention.
   *
   * 4) Transactional update:
   * - Start a DB transaction.
   * - Update `shopping_mall_shipment_confirmations` with the provided fields and `updated_at`.
   * - If the updated confirmation implies a status change:
   *   - Update `shopping_mall_order_items` rows where `shopping_mall_order_items.shopping_mall_shipment_id = currentShipmentId`.
   *   - Apply item status changes at the shipment level (update all order items in the shipment set consistently) and ensure no partial updates are committed.
   *   - If some items are already in a later terminal state that would conflict with the implied transition ordering, abort and reject the operation.
   *
   * 5) Commit and return:
   * - Return the updated shipment confirmation record (and any linked computed fields that the DTO includes).
   *
   * Edge cases:
   * - Repeated confirmations: do not generate conflicting transitions.
   * - Missing or invalid shipment association: reject.
   * - Concurrent updates: use row-level locking or optimistic concurrency patterns (based on project conventions) to prevent double transitions.
   *
   * Do not implement customer delivery confirmation logic here; that is handled by the customer confirmation workflow. This operation should only persist seller confirmation details and apply seller-driven shipment status transitions consistent with the confirmation_type rules.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":shipmentConfirmationId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("shipmentConfirmationId")
    shipmentConfirmationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallShipmentConfirmation.IUpdate,
  ): Promise<IShoppingMallShipmentConfirmation> {
    try {
      return await putShoppingMallMemberShipmentConfirmationsShipmentConfirmationId(
        {
          member,
          shipmentConfirmationId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes a single shipment confirmation record identified by its unique identifier.
   *
   * This endpoint targets the seller confirmation entries stored in the shopping_mall_shipment_confirmations table. Each confirmation row is linked to exactly one shipment via shopping_mall_shipment_confirmations.shopping_mall_shipment_id, and contains confirmation_type plus optional logistics details such as tracking_url, tracking_number, and carrier_name.
   *
   * Authorization is required: only permitted actors (typically the seller that owns the related shipment context, or administrators with oversight) may remove a confirmation record. The implementation must verify that the authenticated actor has rights to the underlying shipment that the confirmation belongs to.
   *
   * Validation and behavior:
   * - The server must locate the record by id using shopping_mall_shipment_confirmations.id.
   * - If the record does not exist, the operation must fail with a not-found style error.
   * - If the record exists but the authenticated actor does not own/operate the linked shipment, the operation must fail with an authorization/forbidden style error.
   *
   * After successful deletion, subsequent reads that rely on shipment fulfillment transitions should no longer see this confirmation record. If the business domain expects confirmation presence for status transitions, callers must ensure they have the correct current workflow state before calling this endpoint.
   *
   * Related operations:
   * - Use the shipment confirmation listing/retrieval endpoints (if available in the API) to verify current confirmation details before attempting deletion.
   *
   * @param connection
   * @param shipmentConfirmationId Unique identifier of the shipment confirmation record to remove.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification RealizeAgent steps: 1) Parse path parameter
     *   shipmentConfirmationId (UUID). 2) In a transaction (read + delete
     *   consistency), load shopping_mall_shipment_confirmations by id. - Query:
     *   SELECT * FROM shopping_mall_shipment_confirmations WHERE id = :id AND
     *   (deleted_at IS NULL OR no filter if hard-delete is expected by system
     *   design). - If not found: return not-found error. 3) Fetch the related
     *   shipment (shopping_mall_shipments) by shopping_mall_shipment_id to
     *   support authorization. 4) Authorization check: - Determine the
     *   authenticated actor’s permissions and the shipment’s seller ownership
     *   context. - If not permitted: return forbidden/unauthorized. 5)
     *   Permanently remove the confirmation row: - Execute: DELETE FROM
     *   shopping_mall_shipment_confirmations WHERE id = :id. 6) Commit
     *   transaction. 7) Return 204-like semantics if supported by the
     *   framework; otherwise return an empty JSON body with HTTP 200/204.
   *
   * Edge cases:
   * - If the shipment is in a state where confirmations are expected, the service should either allow deletion only when domain rules permit, or rely on higher-level workflow checks. This spec does not implement those domain rules unless they are enforced elsewhere; at minimum, ensure referential integrity and authorization.
   *
   * No request body is required.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":shipmentConfirmationId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("shipmentConfirmationId")
    shipmentConfirmationId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallMemberShipmentConfirmationsShipmentConfirmationId(
        {
          member,
          shipmentConfirmationId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
