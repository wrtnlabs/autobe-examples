import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallShipmentConfirmation } from "../../../../../api/structures/IShoppingMallShipmentConfirmation";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { postShoppingMallMemberShipmentsShipmentIdConfirmations } from "../../../../../providers/postShoppingMallMemberShipmentsShipmentIdConfirmations";

@Controller("/shoppingMall/member/shipments/:shipmentId/confirmations")
export class ShoppingmallMemberShipmentsConfirmationsController {
  /**
   * Submit seller shipment confirmation data for a specific shipment.
   *
   * When a seller ships items, the seller records confirmation details that represent the fulfillment transition for that shipment. This endpoint creates a new {@link shopping_mall_shipment_confirmations} record linked to exactly one {@link shopping_mall_shipments} row via `shopping_mall_shipment_id`. The created confirmation data is intended to be used for shipment status transitions and for dispute resolution/audit, where optional tracking metadata (tracking URL, tracking number, and carrier name) and an optional seller note preserve what was provided at confirmation time.
   *
   * This endpoint is called in the seller fulfillment workflow after selecting eligible order items for a seller-scoped shipment and before the customer-facing tracking state advances. The business rules also require that tracking information shown to customers corresponds to tracking details provided when the shipment was created and that shipment creation failures do not make the shipment appear as created for customers; therefore, confirmation submission should be treated as part of the shipment’s progression rather than as an ad-hoc tracking overwrite.
   *
   * Security/authorization: Only the authenticated seller responsible for the shipment’s seller-specific order context should be able to submit confirmations for that shipmentId. Administrators can have read/oversight capabilities; this write operation must still be restricted to the appropriate seller scope.
   *
   * Validation and behavior: The request must provide `confirmation_type` and `confirmed_at`-time semantics are recorded as part of the confirmation. Optional fields (`tracking_url`, `tracking_number`, `carrier_name`, `note`) are persisted if provided. If the target shipment is not eligible for confirmation (e.g., already progressed beyond the allowed transition, or does not exist), the operation should return an error and must not create the confirmation record.
   *
   * Related operations: Order detail views and administrator order oversight rely on shipments and their tracking information; those views should automatically reflect the newly stored shipment confirmation data when the shipment progresses. Customer shipment tracking visibility is expected to exist only when shipments exist with proper tracking context.
   *
   * Error handling: Return appropriate client errors when the shipmentId is invalid/non-existent, when authorization fails, or when confirmation submission violates shipment state/business workflow rules.
   *
   * @param connection
   * @param shipmentId Target shipment identifier whose seller confirmation is being created.
   * @param body Shipment confirmation creation payload submitted by the seller for the given shipment.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement POST
     *   /shipments/{shipmentId}/confirmations.
   *
   * 1) Authorization
   * - Resolve the authenticated actor from context.
   * - Verify the caller is allowed to confirm this shipmentId (seller must own/operate within the shipment’s seller scope; admins are not assumed to be allowed to submit confirmations unless explicitly permitted by the auth layer).
   * - If not authorized, return 403.
   *
   * 2) Input validation
   * - Parse request body as IShoppingMallShipmentConfirmation.ICreate.
   * - Validate `confirmation_type` is a non-empty string.
   * - Validate/normalize `confirmed_at` and other provided fields as per DTO schema.
   * - If `tracking_url` is provided, ensure it is stored as a string URL (no binary payload; store in tracking_url column).
   * - Optional `tracking_number`, `carrier_name`, `note` may be null/omitted per DTO definition.
   *
   * 3) Load shipment
   * - Query shopping_mall_shipments by id = shipmentId, excluding any records treated as removed (respect deleted_at handling consistently with the rest of the system).
   * - If shipment does not exist or is not eligible for confirmation based on shipment.status, return 400/409 per system conventions.
   *
   * 4) Create confirmation record
   * - Insert into shopping_mall_shipment_confirmations with:
   *   - shopping_mall_shipment_id = shipmentId
   *   - confirmation_type = request.confirmation_type
   *   - confirmed_at = request.confirmed_at (or the DTO’s confirmed_at field)
   *   - tracking_url / tracking_number / carrier_name / note = request optional fields
   * - Ensure transactionality:
   *   - Use a DB transaction that includes both the confirmation insert and any shipment.status update driven by the confirmation workflow.
   *
   * 5) Update shipment status (if required by workflow)
   * - Determine the next shipment status based on confirmation_type and current shipment.status (per shipment confirmation process rules from the service layer).
   * - Update shopping_mall_shipments.status accordingly.
   *
   * 6) Return response
   * - Return the created confirmation entity DTO (IShoppingMallShipmentConfirmation) populated from the inserted row.
   *
   * Edge cases
   * - Duplicate confirmation constraints: if the system restricts multiple confirmations for a shipment, detect via unique constraints or business rules; return an error without creating duplicates.
   * - If tracking display for customers must remain consistent, do not modify/override any tracking context that should have been locked at shipment creation; only confirmation-provided tracking fields should be persisted to confirmation record and used by tracking views.
   *
   * No pagination, no list queries.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("shipmentId")
    shipmentId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallShipmentConfirmation.ICreate,
  ): Promise<IShoppingMallShipmentConfirmation> {
    try {
      return await postShoppingMallMemberShipmentsShipmentIdConfirmations({
        member,
        shipmentId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
