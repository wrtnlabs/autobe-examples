import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallShipment } from "../../../../../api/structures/IPageIShoppingMallShipment";
import { IShoppingMallShipment } from "../../../../../api/structures/IShoppingMallShipment";
import { AdminAuth } from "../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../decorators/payload/AdminPayload";
import { deleteShoppingMallAdminAdminShipmentsShipmentId } from "../../../../../providers/deleteShoppingMallAdminAdminShipmentsShipmentId";
import { getShoppingMallAdminAdminShipmentsShipmentId } from "../../../../../providers/getShoppingMallAdminAdminShipmentsShipmentId";
import { patchShoppingMallAdminAdminShipments } from "../../../../../providers/patchShoppingMallAdminAdminShipments";
import { putShoppingMallAdminAdminShipmentsShipmentId } from "../../../../../providers/putShoppingMallAdminAdminShipmentsShipmentId";

@Controller("/shoppingMall/admin/admin/shipments")
export class ShoppingmallAdminAdminShipmentsController {
  /**
   * Search and browse platform shipments from the administrative console.
   *
   * This endpoint is designed for administrators who need oversight and dispute-resolution visibility into how orders are being fulfilled. Shipments are the seller-scoped fulfillment packages that group order items belonging to a single seller within a single order. Administrators use this endpoint to find shipments by operational criteria (for example, shipment status or order linkage) and then open shipment details elsewhere for deeper tracking information.
   *
   * The underlying shipment identity and status are stored in `shopping_mall_shipments`, including `status`, parent `shopping_mall_order_id`, and the seller grouping context via `seller_snapshot_id`. Tracking-related information shown to administrators comes from `shopping_mall_shipment_confirmations`, which stores confirmation type plus optional `tracking_url`, `tracking_number`, and `carrier_name`. Shipment display must remain consistent with the confirmation records that represent seller-submitted fulfillment transitions.
   *
   * This operation does not modify any data. It provides read-only browsing capabilities that depend on how the shipment confirmation workflow updates shipped/delivered/cancelled outcomes. It should be used together with order oversight views to ensure administrators can correlate shipment tracking displays with the order item outcomes they observe.
   *
   * Authorization: only the `admin` actor can access this endpoint.
   *
   * Error handling: if the provided search criteria cannot be applied (for example, invalid pagination/sorting inputs), the system must return a validation error. If no shipments match, the response is an empty page rather than an error.
   *
   * @param connection
   * @param body Administrative shipment search criteria (filters, pagination, and sorting).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implement an admin shipment search.
   *
   * 1) Authorization gate
   * - Require admin privileges.
   *
   * 2) Parse request body (search criteria)
   * - Use the request DTO `IShoppingMallShipment.IRequest` for pagination, sorting, and optional filters.
   *
   * 3) Build query
   * - Base query from `shopping_mall_shipments`.
   * - Join to `shopping_mall_orders` via `shopping_mall_order_id` when order-level filters are requested (e.g., order_code, placed_at ranges, customer linkage), returning any needed identifiers only for filtering.
   * - Join to `shopping_mall_shipment_confirmations` via shipment id when search/sort/filter needs confirmation fields (e.g., tracking_number presence, confirmation_type, confirmed_at).
   *
   * 4) Consistency rules
   * - Shipment tracking fields shown in results must correspond to the confirmation records attached to the shipment (`shopping_mall_shipments.shipmentConfirmation` relation). Do not attempt to derive tracking info from order items directly.
   * - When shipments were created/rejected or when admin forced item outcomes change after shipment association, ensure the displayed shipment status/related outcomes remain consistent with the current `shopping_mall_shipments.status` and the latest non-deleted confirmation record(s) as determined by the schema’s confirmation linkage.
   *
   * 5) Pagination and sorting
   * - Apply pagination (limit/offset or cursor semantics per the generated DTO contract).
   * - Apply sorting based on allowed fields defined by `IShoppingMallShipment.IRequest`.
   *
   * 6) Deleted records
   * - Apply the system’s standard handling for rows with `deleted_at` in each table according to the project’s data browsing expectations.
   *
   * 7) Response mapping
   * - Return `IPageIShoppingMallShipment.ISummary`.
   * - Populate summary fields needed for list display; include shipment identity, status, parent order id/code, and the relevant tracking summary fields derived from `shopping_mall_shipment_confirmations` (e.g., latest tracking_number and tracking_url) if the request demands those fields.
   *
   * 8) Edge cases
   * - If a shipment has no shipment confirmations yet, return results with null/empty tracking fields.
   * - If filters imply conflicting constraints (e.g., tracking filters while confirmation joins yield no rows), return an empty page.
   *
   * 9) Transactionality
   * - No transaction required because this is a read-only endpoint.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdminAuth()
    admin: AdminPayload,
    @TypedBody()
    body: IShoppingMallShipment.IRequest,
  ): Promise<IPageIShoppingMallShipment.ISummary> {
    try {
      return await patchShoppingMallAdminAdminShipments({
        admin,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed shipment information for administrator oversight by shipment identifier.
   *
   * This operation is designed for authenticated administrators (admin actor) who need shipment visibility for order oversight and dispute resolution. In the domain model, a shipment (`shopping_mall_shipments`) represents a seller-scoped fulfillment batch inside a single order (`shopping_mall_order_id`) and is driven by the shipment confirmation flow (`shopping_mall_shipment_confirmations`) to produce customer-visible fulfillment outcomes. The shipment record exposes its current workflow state via `status`, and it can be hidden from active views when `deleted_at` is set.
   *
   * The response must include both the shipment identity/status and the tracking context captured in `shopping_mall_shipment_confirmations` (e.g., `confirmation_type`, `tracking_url`, `tracking_number`, `carrier_name`, and `note`), since tracking is provided for the shipment as a whole. It must also include the set of order items included in this shipment, represented by `shopping_mall_order_items` rows linked by `shopping_mall_shipment_id`, including each item’s `line_item_status` and purchase-time display fields as defined by the `IShoppingMallShipment` DTO. This ensures that tracking information and displayed item outcomes remain consistent with the shipment’s included items.
   *
   * If the specified shipment is not visible (no row, or the row/confirmation is treated as removed when `deleted_at` is set), the operation should return a not-found/visibility error. If the shipment exists but no confirmation exists yet, the shipment identity and status should still be returned, while tracking fields must be returned as null/empty according to the `IShoppingMallShipment` contract.
   *
   * Related operations: administrators can also view the same shipment content from order details; this shipment-focused endpoint is the direct alternative that fetches tracking context and included order items by shipment identifier.
   *
   *
   * @param connection
   * @param shipmentId Target shipment identifier to retrieve administrative shipment details.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implementation steps:
   * 1) Accept `shipmentId` (UUID) from path.
   * 2) Authorize requester as admin.
   * 3) Query `shopping_mall_shipments` by `id = shipmentId` and ensure it is visible (filter out rows where `deleted_at` is set if the service treats deleted records as not visible).
   * 4) Load associated shipment confirmation: query `shopping_mall_shipment_confirmations` by `shopping_mall_shipment_id = shipmentId`, again filtering out rows where `deleted_at` is set. If multiple confirmations can exist, select the most relevant one for current status (typically the latest by `confirmed_at`).
   * 5) Load included order items: query `shopping_mall_order_items` where `shopping_mall_shipment_id = shipmentId`, filtering out where `deleted_at` is set if applicable. Return the list of items included in this shipment, including item status (`line_item_status`) and purchase context fields as defined by the DTO.
   * 6) Assemble `IShoppingMallShipment` response object.
   *
   * Edge cases:
   * - Shipment exists but shipment confirmation does not: return shipment data with tracking fields as null/empty per DTO.
   * - Shipment confirmation exists but tracking URL/number fields are null: return nulls.
   * - Ensure admin tracking display remains consistent with included order items when status/outcome transitions occur (administrative forced cancel/refund updates). This endpoint must always reflect the latest persisted state at read time.
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":shipmentId")
  public async at(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("shipmentId")
    shipmentId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallShipment> {
    try {
      return await getShoppingMallAdminAdminShipmentsShipmentId({
        admin,
        shipmentId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing shipment from the administrator console.
   *
   * This endpoint is the administrative control surface for modifying the seller-facing fulfillment container that groups order items under shopping_mall_shipments. A shipment record belongs to exactly one order via shopping_mall_shipments.shopping_mall_order_id and uses shopping_mall_shipments.seller_snapshot_id as the seller purchase context for grouping.
   *
   * The administrator-visible shipment information is used for order oversight and dispute resolution. When an administrator views an order, the system shows the shipments that exist for that order, including the tracking information per shipment, and that tracking information must correspond to the order items included in the shipment. This operation supports that oversight by letting administrators update shipment state and/or confirmation-linked tracking details for a specific shipment.
   *
   * Because shipments are the unit of customer-facing tracking visibility, the implementation must keep shipment-linked item outcomes consistent with the shipment’s updated state. In particular, when an administrator forces cancel/refund at the order-item level after shipment association, the system must ensure shipment-linked item outcomes reflect the new cancelled/refunded state and must not leave inconsistent tracking displays.
   *
   * Authorization and safety: this operation is intended for the admin actor only (governance/oversight). It should validate that the target shipment exists and is reachable by the admin context, then apply the requested update atomically so that shipment status, shipment confirmation data (when provided/required), and any derived order item outcomes remain consistent.
   *
   * Related operations: the system also provides shipment tracking visibility through order detail views, and order/force actions at the item level. This operation complements those flows by reconciling shipment and confirmation details for the specific shipmentId being administered.
   *
   * @param connection
   * @param shipmentId Target shipment identifier to update.
   * @param body Administrator update payload for the specified shipment. Use this body to request changes to shipment status and, when supported, shipment confirmation/tracking fields used for fulfillment tracking visibility.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implement admin shipment update as an atomic transaction.
   *
   * 1) Input validation
   * - Validate shipmentId is a UUID and request body fields conform to IShoppingMallShipment.IUpdate.
   * - Interpret desired update intent (e.g., shipment.status change and/or confirmation attributes) based on non-null fields in the update DTO.
   *
   * 2) Load and verify
   * - Load shopping_mall_shipments by id = shipmentId.
   * - Load related shopping_mall_orders (via shopping_mall_order_id) and, when needed, related shopping_mall_order_items via shopping_mall_order_items where shopping_mall_shipment_id = shipment.id.
   * - Optionally load shopping_mall_shipment_confirmations for the shipment if the update requires modifying confirmation-linked data.
   *
   * 3) Apply update rules
   * - Update shopping_mall_shipments.status when requested.
   * - If the request includes shipment confirmation update fields, upsert shopping_mall_shipment_confirmations for that shipment:
   *   - Ensure confirmation_type and confirmed_at semantics remain consistent.
   *   - Apply tracking_url, tracking_number, carrier_name, note only when provided.
   * - If the update changes an outcome state (e.g., cancelled/refunded-like shipment states), reconcile shipment-linked order items:
   *   - Update shopping_mall_order_items.line_item_status for affected order items so customer shipment/tracking displays are consistent.
   *   - Ensure that only the intended order items are updated (shipment-linked scope).
   *
   * 4) Consistency guarantees
   * - Keep shipment and order-item outcome mapping consistent to avoid inconsistent tracking displays.
   * - Persist changes in one database transaction so list/detail views and order oversight views observe consistent data.
   *
   * 5) Response
   * - Return the updated shipment representation matching IShoppingMallShipment after reload of updated fields.
   *
   * Edge cases
   * - Shipment not found: return 404.
   * - Invalid state transition according to business workflow (enforced by service logic): return 400/409.
   * - If shipment confirmation fields are missing while shipment status requires them, return 400 with validation feedback.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":shipmentId")
  public async update(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("shipmentId")
    shipmentId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallShipment.IUpdate,
  ): Promise<IShoppingMallShipment> {
    try {
      return await putShoppingMallAdminAdminShipmentsShipmentId({
        admin,
        shipmentId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes a specific shipment record by identifier.
   *
   * This endpoint is intended for platform administrators performing operational cleanup or dispute-related maintenance. The shipment identified by `shipmentId` is a seller-specific fulfillment batch grouped under a customer order, stored in the `shopping_mall_shipments` table. Shipments also link to the parent order (`shopping_mall_shipments.shopping_mall_order_id`), carry a seller purchase context snapshot (`shopping_mall_shipments.seller_snapshot_id`), and maintain a current shipment workflow `status`.
   *
   * Because `shopping_mall_shipments` has related order items (`shopping_mall_order_items.shopping_mall_shipment_id`) and may have an associated seller confirmation record (`shopping_mall_shipment_confirmations` has a unique `shopping_mall_shipment_id`), the implementation must execute the deletion in a way that preserves database consistency and avoids orphaned references. The exact cascade behavior should follow the database relation constraints declared for these models.
   *
   * Authorization: only authenticated administrators may call this operation. Requests made by non-admin actors must be rejected by the authorization layer.
   *
   * Expected behavior and error handling:
   *
   * - If `shipmentId` does not exist (or is not accessible under authorization rules), return an appropriate 404/Not Found.
   * - Deleting an existing shipment should complete as a single database transaction so that all related constraints (including any dependent confirmation/order-item references governed by foreign keys) are satisfied.
   *
   * Related operations:
   *
   * - Shipment views used for order oversight should retrieve shipment details without modification; this erase operation performs removal rather than visibility updates. Seller confirmation transitions for shipment status are handled through shipment confirmation flows (separate endpoints), and should not be invoked as a part of this deletion endpoint.
   *
   * @param connection
   * @param shipmentId Target shipment identifier to permanently remove.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implementation steps:
   *
   * 1) Authorization check: verify the caller is an authenticated admin actor authorized to perform shipment maintenance.
   *
   * 2) Validate `shipmentId`:
   * - Ensure it is a UUID string compatible with the database `shopping_mall_shipments.id` type.
   *
   * 3) Transactional delete:
   * - Start a DB transaction.
   * - Fetch the shipment row by `id = shipmentId`.
   * - If not found, throw NotFound.
   * - Execute deletion of the shipment row from `shopping_mall_shipments`.
   * - Rely on the Prisma/database relation rules for dependent rows:
   *   - `shopping_mall_shipment_confirmations` has a required relation to shipment with onDelete: Cascade, and has @@unique([shopping_mall_shipment_id]) so at most one confirmation row should be impacted.
   *   - `shopping_mall_order_items.shopping_mall_shipment_id` is an optional FK; ensure the onDelete behavior matches the schema constraints during deletion (if FK is set to Cascade in the actual migration, dependent rows will be handled accordingly; if not, the implementation must ensure the FK is not left pointing to a missing shipment).
   *
   * 4) Commit transaction.
   *
   * Edge cases:
   * - Concurrent fulfillment/status updates: ensure deletion does not leave the system in an inconsistent state by performing the delete in a transaction and using row existence checks.
   *
   * Errors:
   * - Authorization errors: 403.
   * - Missing shipment: 404.
   * - Any referential integrity violation: 409/400 depending on error mapping conventions.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":shipmentId")
  public async erase(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("shipmentId")
    shipmentId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallAdminAdminShipmentsShipmentId({
        admin,
        shipmentId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
