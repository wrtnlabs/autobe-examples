import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallTrackingInfo } from "../../../../../api/structures/IShoppingMallTrackingInfo";
import { SellerAuth } from "../../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../../decorators/payload/SellerPayload";
import { deleteShoppingMallSellerShipmentsShipmentIdTrackingInfosTrackingInfoId } from "../../../../../providers/deleteShoppingMallSellerShipmentsShipmentIdTrackingInfosTrackingInfoId";
import { getShoppingMallSellerShipmentsShipmentIdTrackingInfosTrackingInfoId } from "../../../../../providers/getShoppingMallSellerShipmentsShipmentIdTrackingInfosTrackingInfoId";
import { postShoppingMallSellerShipmentsShipmentIdTrackingInfos } from "../../../../../providers/postShoppingMallSellerShipmentsShipmentIdTrackingInfos";
import { putShoppingMallSellerShipmentsShipmentIdTrackingInfosTrackingInfoId } from "../../../../../providers/putShoppingMallSellerShipmentsShipmentIdTrackingInfosTrackingInfoId";

@Controller("/shoppingMall/seller/shipments/:shipmentId/trackingInfos")
export class ShoppingmallSellerShipmentsTrackinginfosController {
  /**
   * Create shipment-level tracking information for a specific shipment.
   *
   * This operation records the carrier and tracking identifier set for a shipment represented by the `shopping_mall_shipments` table, which stores seller fulfillment packages that group one or more purchased order items from the same seller within a single order for shipping and delivery. The created tracking record is stored in `shopping_mall_tracking_infos`, a dependent one-to-one entity that exists specifically to hold carrier-specific transit reference data such as `carrier_name`, `tracking_number`, and optional `tracking_url` without duplicating order, seller, or order-item attributes already available through the shipment relationship.
   *
   * The operation is intended for the seller responsible for the shipment, and may also be used by an administrator performing marketplace order oversight. According to the requirements, the seller must enter the carrier name and tracking number for each shipment they create, and those values are captured as a single tracking set for the shipment. Customers are not allowed to create or edit this data. Customers consume the result later through order detail views where shipment-specific tracking is displayed separately for each package.
   *
   * Business behavior is strictly shipment-centric. All order items placed into the same shipment share one carrier name and one tracking number, and the platform must not manage separate tracking details for different items inside the same shipment. If different items require different tracking details, they must be placed into separate shipments instead of attempting to create multiple tracking sets for one shipment. Because `shopping_mall_tracking_infos` has a unique constraint on `shopping_mall_shipment_id`, a shipment can have at most one active tracking information record created through this endpoint.
   *
   * Before this operation is executed, the shipment must already exist. The shipment itself is the fulfillment package defined in the order domain, and the customer later views it through the order detail flow described by the shipment and order-detail requirements. In particular, order details show which order items belong to each shipment, and if tracking information exists, the customer can view the carrier name and tracking number for that shipment. This means this creation endpoint is operationally upstream of customer-facing tracking display APIs.
   *
   * Validation must ensure that the target shipment exists, that the caller has authority over that shipment, and that tracking information has not already been recorded for the shipment. Validation must also preserve the business rule that tracking applies at the shipment level only and cannot cross seller boundaries. If an invalid shipment grouping had somehow been attempted earlier, no tracking information should be created for that invalid grouping. Errors should be returned when the shipment does not exist, does not belong to the acting seller, has been removed from active use, or already has a tracking record.
   *
   * @param connection
   * @param shipmentId Target shipment's ID
   * @param body Tracking details to attach to the shipment
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Implement this operation as creation of the
     *   dependent `shopping_mall_tracking_infos` record for an existing
     *   `shopping_mall_shipments` parent.
   *
   * 1. Authorize the caller. Allow the responsible seller when the shipment's `shopping_mall_seller_id` matches the authenticated seller account. Allow administrators according to platform oversight permissions. Reject customers and unrelated sellers.
   *
   * 2. Load the parent shipment from `shopping_mall_shipments` by `id = shipmentId` and ensure `deleted_at` is null for active use. If no active shipment exists, return a not-found error.
   *
   * 3. Enforce ownership and shipment integrity rules. For seller callers, verify the shipment belongs to them through `shopping_mall_seller_id`. The shipment is already the grouping boundary for same-seller order items, so this endpoint must not accept or process any item-level tracking input.
   *
   * 4. Check whether a tracking record already exists for the shipment by querying `shopping_mall_tracking_infos` where `shopping_mall_shipment_id = shipmentId` and `deleted_at` is null. Because the schema has `@@unique([shopping_mall_shipment_id])`, reject duplicate creation with a conflict error instead of overwriting existing data.
   *
   * 5. Validate request fields according to the DTO and schema-backed business meaning: `carrier_name` is required, `tracking_number` is required, and `tracking_url` is optional. If a tracking URL is provided, persist it exactly as the shipment-level carrier tracking page URL. Do not accept shipment identifiers in the body because shipment context comes from the path.
   *
   * 6. Create the tracking record inside a write transaction. Insert a new row into `shopping_mall_tracking_infos` with a generated UUID, `shopping_mall_shipment_id = shipmentId`, body-provided `carrier_name`, `tracking_number`, optional `tracking_url`, and current timestamps for `created_at` and `updated_at`. Allow database uniqueness on `(carrier_name, tracking_number)` and `shopping_mall_shipment_id` to protect against duplicates; translate unique-constraint failures into clear conflict responses.
   *
   * 7. Return the created tracking information resource as `IShoppingMallTrackingInfo`. Include shipment linkage and the persisted carrier and tracking fields defined by the response DTO.
   *
   * Edge cases: if the shipment has been logically removed, reject creation; if the same carrier and tracking number combination already exists elsewhere and violates the global unique constraint, surface a conflict explaining that the tracking set is already registered; if concurrent requests race to create tracking for the same shipment, rely on the unique constraint and transaction handling to ensure only one succeeds.
   *
   * Related operations: this endpoint should be used as part of shipment preparation flow before customer-facing order detail and tracking-view operations display shipment-specific transit information.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("shipmentId")
    shipmentId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallTrackingInfo.ICreate,
  ): Promise<IShoppingMallTrackingInfo> {
    try {
      return await postShoppingMallSellerShipmentsShipmentIdTrackingInfos({
        seller,
        shipmentId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the tracking information recorded for a specific shipment.
   *
   * This operation returns the shipment-level carrier and tracking reference data stored in the tracking information record that belongs to the specified shipment. According to the underlying database design, `shopping_mall_tracking_infos` is a dependent one-to-one entity of `shopping_mall_shipments`, and it stores only the carrier-specific transit reference fields such as `carrier_name`, `tracking_number`, and optional `tracking_url`. The shipment entity itself stores shipment lifecycle timestamps such as `shipped_at`, `auto_deliver_at`, and `delivered_at`, while the tracking information entity stores the seller-entered transit identifiers used to follow the package.
   *
   * The endpoint is intended to support shipment-oriented tracking visibility. The requirements state that customers can view tracking information for each shipment from the order detail view, and that tracking must be presented by shipment rather than by individual order item. This means the returned tracking data applies to every order item grouped into the referenced shipment. When an order contains multiple shipments, clients should call or resolve this operation in the context of the correct shipment so that one package's carrier name and tracking number are not confused with another shipment in the same order.
   *
   * Authorization for this operation must follow shipment visibility rules. Customers may access the tracking information only for shipments that belong to their own orders. Sellers may access the tracking information only for shipments they are responsible for fulfilling. Administrators and super administrators may access the record for marketplace oversight and support workflows. The system must not allow unauthorized users to read shipment tracking details outside their ownership or governance scope.
   *
   * The implementation must verify both path parameters together. Even though `trackingInfoId` uniquely identifies a tracking information record, the route also carries `shipmentId` to assert the parent-child relationship expressed in the database schema and API path. If the tracking information record does not belong to the specified shipment, the request must fail rather than returning an unrelated record. This protects against cross-resource access and preserves the requirement that tracking information is attached only to one shipment.
   *
   * This operation is commonly used together with order detail retrieval. In many user flows, the client first obtains an order detail view that includes the list of shipments associated with the order, then accesses shipment-specific tracking details for one selected shipment. The returned data is read-only from the perspective of customer tracking views; customers must be able to inspect seller-provided carrier and tracking values, but must not be able to modify them through this endpoint.
   *
   * @param connection
   * @param shipmentId Target shipment's ID
   * @param trackingInfoId Target tracking information record's ID
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Implement a read-only service that fetches one
     *   `shopping_mall_tracking_infos` record by `id` and verifies that its
     *   `shopping_mall_shipment_id` matches the `shipmentId` path parameter.
   *
   * Load the parent `shopping_mall_shipments` record as part of authorization and consistency checks. Reject the request if either the shipment does not exist, the tracking information does not exist, the tracking information is soft deleted, the shipment is soft deleted when active visibility rules treat it as inaccessible, or the tracking information belongs to a different shipment than the one identified in the route.
   *
   * Apply actor-specific authorization before returning the record. For a customer, confirm that the parent shipment belongs to an order owned by that authenticated customer. For a seller, confirm that the parent shipment's `shopping_mall_seller_id` matches the authenticated seller. For administrators and super administrators, allow access as part of oversight capabilities. Deny all other actors.
   *
   * Map the database result to `IShoppingMallTrackingInfo`. Include the shipment-linked tracking fields from `shopping_mall_tracking_infos`, especially the seller-entered `carrier_name`, `tracking_number`, and optional `tracking_url`. Preserve immutable read semantics; this endpoint must not alter shipment or tracking state.
   *
   * Return a not-found style failure when the parent-child relationship is invalid or when either resource is unavailable in the accessible scope. This prevents ID probing across shipments. No transaction is required beyond a consistent read, but the query should be structured to filter by both tracking info ID and shipment ID for efficiency and safety.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":trackingInfoId")
  public async at(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("shipmentId")
    shipmentId: string & tags.Format<"uuid">,
    @TypedParam("trackingInfoId")
    trackingInfoId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallTrackingInfo> {
    try {
      return await getShoppingMallSellerShipmentsShipmentIdTrackingInfosTrackingInfoId(
        {
          seller,
          shipmentId,
          trackingInfoId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the tracking information recorded for a specific shipment.
   *
   * This operation modifies the carrier and transit reference data stored in the tracking information record that belongs to the specified shipment. In the underlying data model, `shopping_mall_tracking_infos` is a dependent one-to-one entity of `shopping_mall_shipments`, and it exists specifically to store shipment-level carrier details such as the shipping carrier name, the carrier-issued tracking identifier, and an optional direct carrier tracking page URL. Because the shipment entity groups one or more purchased order items from the same seller into a single fulfillment package, the tracking information updated here applies to the entire package rather than to individual order items.
   *
   * Access to this operation must be restricted to the responsible seller of the shipment and to administrative actors with marketplace oversight authority. Customers are intentionally excluded from modification authority. The requirements state that customers can later view shipment tracking details from the order detail screen, but they must not be able to edit the seller-provided carrier name or tracking number. This endpoint therefore supports seller-side correction or administrative maintenance of shipment-level transit data while preserving the customer-facing rule that tracking remains read-only for buyers.
   *
   * This operation is directly tied to the shipment grouping rules. A shipment may contain one or more order items, but only when those items belong to the same seller. All order items included in the same shipment must share one carrier name and one tracking number, and the system must reject any design that would try to assign different tracking sets to separate items inside the same shipment. For that reason, updating this resource changes the shared tracking context for the package identified by `{shipmentId}` and its dependent tracking record `{trackingInfoId}`. Different shipments in the same order may still carry different tracking information because each shipment is tracked independently.
   *
   * Clients typically use this operation after a shipment has already been created and a tracking record already exists for it, for example when the seller needs to correct a carrier name typo, replace an incorrectly entered tracking number, or add or revise the optional tracking URL. Before invoking this endpoint, the seller or administrator would ordinarily identify the correct shipment from shipment management or order detail flows. After completion, customer order detail views can present the revised shipment-level tracking values consistently for every order item included in that package.
   *
   * The system must validate that the specified tracking information record actually belongs to the specified shipment, because tracking information cannot be reassigned across seller boundaries or across unrelated shipments. If either identifier does not exist, or if the tracking record is not the dependent record of the target shipment, the request must fail. The system should also enforce the database-level uniqueness of the `(carrier_name, tracking_number)` combination and must preserve the normalized one-to-one relationship in which a shipment owns at most one active tracking information record.
   *
   * @param connection
   * @param shipmentId Target shipment's ID
   * @param trackingInfoId Target tracking information record's ID
   * @param body Replacement values for the shipment tracking information
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Implement this operation as a shipment-scoped
     *   update of the dependent `shopping_mall_tracking_infos` record.
   *
   * 1. Authorize the caller. Allow the seller who owns `shopping_mall_shipments.shopping_mall_seller_id` for the target shipment, and allow administrator or superAdministrator actors according to platform oversight permissions. Reject customers and any seller who does not own the shipment.
   * 2. Load the shipment by `shipmentId` from `shopping_mall_shipments` using `deleted_at IS NULL` for active access unless administrative policy explicitly allows historical access. If not found, return a not-found error.
   * 3. Load the tracking info by `trackingInfoId` from `shopping_mall_tracking_infos`, again excluding logically removed rows for normal operation. If not found, return a not-found error.
   * 4. Verify relational integrity: `shopping_mall_tracking_infos.shopping_mall_shipment_id` must exactly equal the target shipment's `id`. If the tracking record does not belong to the specified shipment, reject the request as invalid or not found from the caller perspective.
   * 5. Validate the request body against the update DTO. Allow mutation only of shipment-level tracking fields represented by the schema: `carrier_name`, `tracking_number`, and optional `tracking_url` as exposed through `IShoppingMallTrackingInfo.IUpdate`. Do not accept reassignment of `shopping_mall_shipment_id`, seller ownership, order ownership, or timestamp identity fields through the body.
   * 6. Enforce business rules from the requirements: tracking remains shipment-level, not item-level; updating this record changes the shared tracking set for all order items already grouped into the shipment. No per-item override logic is allowed.
   * 7. Before writing, check whether another active `shopping_mall_tracking_infos` row already uses the same `(carrier_name, tracking_number)` pair, excluding the current row. If so, fail with a conflict error to respect the database unique constraint.
   * 8. Update the row in `shopping_mall_tracking_infos`, set the new mutable fields, and refresh `updated_at` to the current timestamp. Preserve `created_at`, `deleted_at`, and `shopping_mall_shipment_id`.
   * 9. Return the updated tracking information resource as `IShoppingMallTrackingInfo`.
   *
   * Use a single transaction for the integrity check and update if the implementation cannot guarantee consistency otherwise. Error handling should distinguish among missing shipment, missing tracking info, shipment-tracking mismatch, forbidden actor, and duplicate carrier-plus-tracking-number conflicts. Do not perform any order-item level tracking writes because the domain model explicitly centralizes tracking on the shipment entity.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":trackingInfoId")
  public async update(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("shipmentId")
    shipmentId: string & tags.Format<"uuid">,
    @TypedParam("trackingInfoId")
    trackingInfoId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallTrackingInfo.IUpdate,
  ): Promise<IShoppingMallTrackingInfo> {
    try {
      return await putShoppingMallSellerShipmentsShipmentIdTrackingInfosTrackingInfoId(
        {
          seller,
          shipmentId,
          trackingInfoId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently remove the tracking information record associated with a specific shipment.
   *
   * This operation deletes one shipment-level tracking information resource from the tracking data attached to a shipment. In the database model, `shopping_mall_tracking_infos` stores the carrier-specific transit reference data for a single `shopping_mall_shipments` record through the `shopping_mall_shipment_id` foreign key, and the schema enforces a one-to-one relationship with `@@unique([shopping_mall_shipment_id])`. As a result, this endpoint is not deleting item-level tracking details, but rather the single carrier name, tracking number, and optional tracking URL that represent the package-level transit identity for the shipment.
   *
   * Access to this operation is restricted to actors who are allowed to manage shipment fulfillment records. The responsible seller may remove tracking information only for shipments that belong to that seller, and administrators may remove tracking information as part of marketplace oversight or corrective intervention. Customers must not use this operation because business requirements state that customers can view shipment tracking details but must not modify the seller-provided carrier name or tracking number.
   *
   * This endpoint must be interpreted in the context of shipment-level tracking behavior. Requirements specify that all order items included in the same shipment share one carrier name and one tracking number, and that tracking information cannot be assigned across mixed-seller item groupings. Deleting a tracking record therefore affects the shipment as a whole and, by extension, every order item associated with that package from the customer's tracking view. If an order contains multiple shipments, only the targeted shipment's tracking information is removed; other shipments in the order remain unchanged.
   *
   * Before this operation is executed, clients will typically have retrieved shipment details through a shipment lookup or order-detail workflow in order to identify the correct shipment and tracking record. The server must verify that the `trackingInfoId` belongs to the `shipmentId` provided in the route. If the shipment does not exist, if the tracking record does not exist, if the tracking record belongs to another shipment, or if the caller does not have authority over the shipment, the operation must fail without removing any data.
   *
   * The underlying schema includes `deleted_at` columns on both `shopping_mall_shipments` and `shopping_mall_tracking_infos`, so implementation may use the platform's deletion policy for active-use removal while preserving historical integrity where required by infrastructure conventions. Regardless of internal persistence technique, the API contract of this endpoint is removal of the targeted tracking information from active shipment tracking usage. The operation must never alter seller ownership, shipment grouping, order composition, or delivery confirmation state while removing the tracking record.
   *
   * @param connection
   * @param shipmentId Identifier of the shipment that owns the tracking information record.
   * @param trackingInfoId Identifier of the tracking information record to remove from the shipment.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Implement a shipment-tracking removal service for
     *   the dependent `shopping_mall_tracking_infos` entity.
   *
   * 1. Authenticate the caller and authorize only the responsible seller for the shipment or an administrator-level actor. Customers must be rejected because they have view-only tracking access.
   * 2. Load the target shipment by `shopping_mall_shipments.id = shipmentId` and ensure it is still a valid shipment record for mutation according to platform deletion policy. If not found, return a not-found error.
   * 3. Load the target tracking record by `shopping_mall_tracking_infos.id = trackingInfoId`. If not found, return a not-found error.
   * 4. Verify relational consistency: `shopping_mall_tracking_infos.shopping_mall_shipment_id` must equal `shipmentId`. If the tracking record belongs to a different shipment, reject the request as invalid or not found to avoid cross-resource deletion.
   * 5. For seller callers, verify `shopping_mall_shipments.shopping_mall_seller_id` matches the authenticated seller account. Administrators may bypass seller ownership but must still pass administrative authorization.
   * 6. Remove the tracking record according to the system's persistence convention for this table. Because the schema contains `deleted_at`, implementation may perform an active-use removal by setting `deleted_at` and updating `updated_at`, or perform physical deletion if the service layer's deletion standard for this resource requires it. The API behavior must be consistent with erasing the tracking info from active shipment tracking usage.
   * 7. Do not modify `shopping_mall_shipments.shipped_at`, `delivered_at`, `auto_deliver_at`, seller ownership, or any order-item relationships as part of this operation. This endpoint affects only the dependent tracking information resource.
   * 8. Return success with no response body.
   *
   * Error handling:
   * - Return not found when the shipment or tracking record does not exist in active scope.
   * - Return forbidden when the caller lacks permission.
   * - Return conflict or bad request when the tracking record does not belong to the specified shipment.
   * - Ensure the mutation is atomic so no partial state is exposed.
   *
   * Implementation note: because business rules state that tracking is shared by all items in the same shipment, downstream read models for customer order tracking must treat the shipment as having no active tracking details after successful deletion.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":trackingInfoId")
  public async erase(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("shipmentId")
    shipmentId: string & tags.Format<"uuid">,
    @TypedParam("trackingInfoId")
    trackingInfoId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallSellerShipmentsShipmentIdTrackingInfosTrackingInfoId(
        {
          seller,
          shipmentId,
          trackingInfoId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
