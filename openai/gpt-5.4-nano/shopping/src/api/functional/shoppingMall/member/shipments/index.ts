import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallShipment } from "../../../../structures/IPageIShoppingMallShipment";
import { IShoppingMallShipment } from "../../../../structures/IShoppingMallShipment";

export * as tracking from "./tracking/index";
export * as confirmations from "./confirmations/index";

/**
 * Create a new shipment grouping for items within an existing order.
 *
 * This operation creates a {@link shopping_mall_shipments} record that belongs to a single {@link shopping_mall_orders} and is scoped to the seller purchase context captured in {@link shopping_mall_shipments.seller_snapshot_id}. The shipment is the seller-specific fulfillment batch that groups one or more {@link shopping_mall_order_items} so they can be shipped together and displayed to customers with coherent tracking per seller.
 *
 * Shipment grouping rules ensure that all included order items come from the same seller context: if the selected order items would require including multiple sellers inside a single shipment, the operation must not create the shipment and must instead require the seller to create separate shipments per seller scope. This preserves the invariant that shipments are seller-scoped within the order.
 *
 * Customer-facing visibility depends on tracking context: customers can view shipment tracking information only for shipments that exist in the system with tracking context available. If shipment creation fails during the workflow (e.g., required tracking data is missing), the shipment must not become visible as created for customers. When shipment confirmation data is submitted for the shipment, the associated {@link shopping_mall_shipment_confirmations} record stores confirmation_type and optional tracking_url/tracking_number/carrier_name to support status transitions and dispute resolution.
 *
 * Security and authorization: this endpoint is intended for the seller who is responsible for fulfillment of the seller-context items inside the target order. Administrators may also create/override shipments for oversight workflows. The implementation must enforce ownership/scope based on the seller snapshot context referenced by the shipment and the order items included.
 *
 * Validation and business logic includes:
 * - Verify the target {@link shopping_mall_orders} exists and is accessible under the caller’s permissions.
 * - Verify every selected {@link shopping_mall_order_items} belongs to the target order.
 * - Verify every selected order item shares the same seller purchase context (the shipment seller_snapshot_id derived from the items' {@link shopping_mall_order_items.seller_snapshot_id}); otherwise reject.
 * - Update {@link shopping_mall_order_items.shopping_mall_shipment_id} for each included item to point to the newly created shipment.
 * - Set {@link shopping_mall_shipments.status} to the initial shipment status consistent with confirmation workflow.
 * - If the request supplies shipment tracking/confirmation details, create the initial {@link shopping_mall_shipment_confirmations} record so that tracking visibility requirements are satisfied.
 *
 * Related operations: order details may show shipments and their tracking to customers and administrators through order oversight views. After shipment creation, use shipment confirmation processing to transition shipment and order-item states as shipment progresses.
 *
 * @param props.connection
 * @param props.body Create request specifying the target order and which seller-scoped order items should be included in the new shipment, optionally including seller confirmation/tracking details to initialize tracking visibility.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps (transactional): 1) Start a DB
 *   transaction. 2) Validate input DTO: target order id, list of order item
 *   ids, and optional tracking/confirmation fields. 3) Load
 *   shopping_mall_orders by id and ensure it is accessible to the caller
 *   (seller ownership or admin oversight). 4) Load shopping_mall_order_items
 *   for provided ids with constraint shopping_mall_order_id == target order id
 *   and deleted_at == null when applicable. 5) Ensure all loaded order items
 *   are present and the input list matches exactly. 6) Determine
 *   sellerSnapshotId from the first order item.seller_snapshot_id; verify all
 *   order items share identical seller_snapshot_id. 7) Create
 *   shopping_mall_shipments with shopping_mall_order_id, seller_snapshot_id,
 *   and an initial status. 8) Bulk update shopping_mall_order_items set
 *   shopping_mall_shipment_id = new shipment id for all included order items.
 *   9) If the request includes tracking/confirmation details, create
 *   shopping_mall_shipment_confirmations for the new shipment: set
 *   shopping_mall_shipment_id, confirmation_type, confirmed_at,
 *   tracking_url/tracking_number/carrier_name, and optional note. 10) Commit
 *   transaction. 11) Post-conditions: shipment exists in DB; included order
 *   items now reference it; if confirmation was created, tracking visibility is
 *   satisfied.
 *
 * Edge cases:
 * - If any selected order item belongs to a different order, reject.
 * - If order items belong to different seller_snapshot_id values, reject (do not create a mixed-seller shipment).
 * - If required tracking context is absent for a customer-visible tracking workflow, create should fail or omit customer-visible transition by not creating confirmation (depending on business rules in requirements; default to failing when confirmation_type/tracking is mandatory).
 *
 * Error handling:
 * - Return 404 when order or order items are not found.
 * - Return 400/422 for invalid grouping selection (mixed seller snapshots, inconsistent order id).
 * - Return 403 for permission/scope violations.
 *
 * Database operations:
 * - Use indexes on shopping_mall_order_items(shopping_mall_order_id, created_at) and seller_snapshot_id to efficiently validate selection.
 * - Use shopping_mall_shipment_confirmations unique constraint on shopping_mall_shipment_id to avoid duplicate confirmations when creating confirmation as part of this call.
 * @path /shoppingMall/member/shipments
 * @accessor api.functional.shoppingMall.member.shipments.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Create request specifying the target order and which seller-scoped order items should be included in the new shipment, optionally including seller confirmation/tracking details to initialize tracking visibility.
     */
    body: IShoppingMallShipment.ICreate;
  };
  export type Body = IShoppingMallShipment.ICreate;
  export type Response = IShoppingMallShipment;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/member/shipments",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/member/shipments";
  export const random = (): IShoppingMallShipment =>
    typia.random<IShoppingMallShipment>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve shipments using complex filtering criteria.
 *
 * This endpoint exposes shipment resources that represent seller-scoped fulfillment batches within an order (each shipment belongs to a single order and groups one or more order items originating from the same seller). The domain meaning of a shipment is that it is the unit for customer-facing tracking visibility and seller fulfillment grouping, while also serving as the tie-point for order oversight and dispute resolution.
 *
 * Shipments in this system are closely tied to the fulfillment timeline that is advanced through the related shipment confirmation records. When returning shipment data, the service must ensure that shipment tracking information corresponds to the shipment confirmation data associated with that shipment, and that shipments are only shown to customers when the shipment actually exists and has the tracking context established through the confirmation flow.
 *
 * Authorization is required: customers must only be able to view shipment information through their own orders (and only for shipments that exist), sellers must be limited to shipments that involve their seller purchase context within orders, and administrators can view shipments via order oversight for dispute resolution without modifying shipment confirmation data through this read/search endpoint.
 *
 * Validation and filtering rules should support list browsing expectations, including pagination and sorting, and should allow narrowing results by order scope, shipment status, and seller snapshot context. When filtering by order scope or seller scope, the service must enforce ownership boundaries before returning any result rows.
 *
 * For detailed shipment tracking and included order items, API consumers should combine this operation with order-details retrieval patterns; shipment views should remain consistent with how order-details show shipments and tracking for customers and admins. If the underlying product content was deleted after purchase, the system must still show shipment item contents in the relevant order details view for past orders; shipment search results must remain consistent with those dispute-resolution requirements.
 *
 * Errors should be returned when the provided filter criteria are invalid, pagination parameters are out of range, or when the actor does not have permission to view the targeted shipments (returning an authorization failure rather than leaking existence.
 *
 * @param props.connection
 * @param props.body Shipment search criteria including pagination, sorting, and optional filters for order scope and shipment status.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement as a shipment list/search operation.
 *
 * 1) Parse request body (IShoppingMallShipment.IRequest) for:
 * - pagination parameters (page size / cursor)
 * - sorting options
 * - optional filters such as: shopping_mall_order_id (order scope), status (shopping_mall_shipments.status), seller_snapshot_id (shopping_mall_shipments.seller_snapshot_id), and shipment code/status predicates if present in the request DTO.
 *
 * 2) Build base query on shopping_mall_shipments:
 * - Apply soft-deletion exclusion using shopping_mall_shipments.deleted_at IS NULL when producing active views (also apply similar filtering to shipment confirmations when included).
 *
 * 3) Enforce authorization boundaries:
 * - If actor is customer/member: derive accessible order ids from shopping_mall_orders where shopping_customer_id matches the member, then restrict shipments to those orders.
 * - If actor is seller/member: restrict shipments by seller snapshot context that belongs to the seller in question. Use order items and seller snapshot linkage when needed (shopping_mall_order_items.seller_snapshot_id) to ensure the shipment contains items purchasable under that seller context.
 * - If actor is admin: allow full access for oversight.
 *
 * 4) Optional joining:
 * - For filtering/sorting by confirmation-based fields, LEFT JOIN shopping_mall_shipment_confirmations on shopping_mall_shipment_confirmations.shopping_mall_shipment_id.
 * - Ensure returned tracking fields (tracking_url/tracking_number/carrier_name) come from the confirmation record associated with the shipment.
 *
 * 5) Pagination & ordering:
 * - Apply ORDER BY according to request sort.
 * - Return an IPageIShoppingMallShipment.ISummary payload containing pagination metadata and shipment summary rows.
 *
 * 6) Edge cases:
 * - If shipment creation/confirmation failed such that confirmation context is missing, customer-visible tracking fields must not be presented as if they exist. Use LEFT JOIN and return null/empty tracking fields in summaries when confirmation is absent.
 * - If request includes order scope, ensure only shipments that actually exist are returned.
 *
 * 7) Performance:
 * - Use indexes from schema: shopping_mall_shipments(shopping_mall_order_id, created_at) and (status, created_at), and join keys to confirmations.
 *
 * 8) Error handling:
 * - Invalid filter values or invalid pagination should return validation errors.
 * - Unauthorized access should return an authorization failure without leaking existence of filtered shipments.
 * @path /shoppingMall/member/shipments
 * @accessor api.functional.shoppingMall.member.shipments.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Shipment search criteria including pagination, sorting, and optional filters for order scope and shipment status.
     */
    body: IShoppingMallShipment.IRequest;
  };
  export type Body = IShoppingMallShipment.IRequest;
  export type Response = IPageIShoppingMallShipment.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/member/shipments",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/member/shipments";
  export const random = (): IPageIShoppingMallShipment.ISummary =>
    typia.random<IPageIShoppingMallShipment.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve the detailed information for a single shipment identified by `shipmentId`, including the shipment’s status and the fulfillment context needed to present customer/seller tracking.
 *
 * A shipment belongs to exactly one order (`shopping_mall_shipments.shopping_mall_order_id`) and is the seller-scoped fulfillment grouping for that order (via `shopping_mall_shipments.seller_snapshot_id`). The response must include the order association and the included order-item context that belongs to this shipment (from `shopping_mall_order_items.shopping_mall_shipment_id`), so that the customer view and the administrator oversight view match the shipment boundary.
 *
 * Tracking information is derived from the seller’s shipment confirmation record. This endpoint should expose carrier name and tracking URL/number only when a corresponding `shopping_mall_shipment_confirmations` row exists for the shipment (`shopping_mall_shipment_confirmations.shopping_mall_shipment_id`). If the shipment has no confirmation row (or the confirmation record is treated as removed because its `shopping_mall_shipment_confirmations.deleted_at` is set), the endpoint must still return the shipment status and included items, but must omit tracking details.
 *
 * Authorization: if the shipment cannot be accessed under the caller’s permissions (for example, because it is not part of the caller’s eligible order context), the system must reject the request using a not-found style outcome.
 *
 * Related behavior: the customer and administrator order-details screens list shipments for an order; this endpoint is the per-shipment detail view used to show tracking for a selected shipment.
 *
 * @param props.connection
 * @param props.shipmentId The unique identifier of the shipment record to retrieve (UUID).
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1) Authenticate/authorize caller according to actor
 *   visibility rules for shipments.
 *
 * 2) Parse `shipmentId` from path as UUID and query `shopping_mall_shipments` where `id = shipmentId`.
 *    - Select shipment core columns: id, shopping_mall_order_id, seller_snapshot_id, status, created_at, updated_at.
 *    - Exclude rows where `deleted_at` is set when the system’s query rules treat `deleted_at` as hidden for active views.
 *
 * 3) Load related order items included in this shipment:
 *    - Query `shopping_mall_order_items` where `shopping_mall_shipment_id = shipmentId`.
 *    - Return the included order-item context required by the Shipment DTO.
 *    - Ensure that only order items linked to this shipment are included (seller boundary is guaranteed by shipment construction and the FK linkage).
 *
 * 4) Load shipment confirmation (tracking context) for this shipment:
 *    - Query `shopping_mall_shipment_confirmations` where `shopping_mall_shipment_id = shipmentId`.
 *    - If present and not deleted, map `confirmation_type`, `confirmed_at`, and optional tracking fields: tracking_url, tracking_number, carrier_name, note.
 *    - If absent (or deleted), omit tracking-related fields dependent on the confirmation row.
 *
 * 5) Compose and return `IShoppingMallShipment` response DTO.
 *
 * Edge cases:
 * - Shipment exists but confirmation row does not exist: still return shipment identity/status, but do not expose tracking_url/tracking_number/carrier_name.
 * - Shipment exists but caller is not authorized for the related order/seller context: treat as not found.
 * - Database errors: return an internal error without leaking sensitive SQL/stack details.
 * @path /shoppingMall/member/shipments/:shipmentId
 * @accessor api.functional.shoppingMall.member.shipments.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * The unique identifier of the shipment record to retrieve (UUID).
     */
    shipmentId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallShipment;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/member/shipments/:shipmentId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/member/shipments/${encodeURIComponent(props.shipmentId ?? "null")}`;
  export const random = (): IShoppingMallShipment =>
    typia.random<IShoppingMallShipment>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("shipmentId")(() => typia.assert(props.shipmentId));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Update a specific shipment's fulfillment transition state by submitting the seller confirmation data that the platform uses to drive shipment progression.
 *
 * A shipment is a seller-scoped fulfillment batch inside an order; all order items included in one shipment belong to the same seller purchase context. Shipment lifecycle progression is handled through the dedicated seller confirmation flow, where the seller submits confirmation details for the shipment and the system uses it to update the shipment status.
 *
 * This operation maps to the underlying persistence models:
 *
 * - The target resource is `shopping_mall_shipments`, which stores the shipment identity, its parent `shopping_mall_orders` linkage, the seller purchase context (`seller_snapshot_id`), and the current `status`.
 * - The seller submission details are stored in `shopping_mall_shipment_confirmations`, which belongs to exactly one shipment (`shopping_mall_shipment_confirmations.shopping_mall_shipment_id` is unique), and includes `confirmation_type`, `confirmed_at`, and optional tracking metadata such as `tracking_url`, `tracking_number`, `carrier_name`, plus an optional seller `note`.
 *
 * Security and authorization behavior:
 *
 * - Sellers can submit confirmation for shipments that are in their seller context and require fulfillment updates.
 * - Administrators may oversee shipment information via order details and visibility flows; this endpoint is intended for seller-driven fulfillment transitions. If the caller is not permitted to update the target shipment, the request must be rejected with an authorization error.
 *
 * Validation rules and state safety:
 *
 * - `shipmentId` must identify an existing shipment.
 * - The confirmation submission must include `confirmation_type` and `confirmed_at`, matching the shipment confirmation record model.
 * - Optional tracking fields (`tracking_url`, `tracking_number`, `carrier_name`) and `note` are persisted if present.
 * - Because there is exactly one confirmation record per shipment (unique on `shopping_mall_shipment_id`), repeated confirmation submissions for the same shipment must follow the platform’s update semantics (e.g., update the confirmation data or reject if a confirmation already exists), while keeping the shipment status consistent with the confirmation.
 *
 * Error handling expectations:
 *
 * - If the shipment does not exist, return a not-found error.
 * - If the shipment cannot be updated due to business state constraints (for example, when confirmation for that shipment state has already been completed), return a conflict or invalid-state error.
 * - If the seller is not allowed to update this shipment, return an authorization error.
 *
 * Related operations:
 *
 * - Customer-facing and administrative visibility of shipment information is provided through order details views that list shipments along with tracking information. Those views depend on shipment and shipment confirmation data existing for the shipment.
 * - If shipment creation fails, the system must not expose the shipment as created to customers; this endpoint assumes the shipment already exists and is eligible for transition.
 *
 * @param props.connection
 * @param props.shipmentId Target shipment identifier.
 * @param props.body Seller confirmation data used to transition the shipment state. This payload is stored in `shopping_mall_shipment_confirmations` and drives updates to `shopping_mall_shipments.status`.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps (service layer):
 *
 * 1) Resolve and validate target shipment
 * - Load `shopping_mall_shipments` by `id = shipmentId`.
 * - Ensure caller authorization for the shipment’s seller context (compare seller identity to `seller_snapshot_id` scope via application auth/session mapping).
 *
 * 2) Upsert/replace the shipment confirmation data
 * - Because `shopping_mall_shipment_confirmations` has a unique constraint on `shopping_mall_shipment_id`, enforce a single confirmation record per shipment.
 * - If no confirmation exists yet for this shipment, create one with:
 *   - `shopping_mall_shipment_id`
 *   - `confirmation_type` (from request)
 *   - `confirmed_at` (from request)
 *   - optional: `tracking_url`, `tracking_number`, `carrier_name`, `note`
 * - If confirmation already exists, apply the operation’s chosen semantics:
 *   - Either update the existing confirmation fields and keep `confirmed_at` consistent with the request,
 *   - or reject with an invalid-state error, depending on business rule implementation.
 *
 * 3) Update shipment status based on confirmation
 * - Update `shopping_mall_shipments.status` to reflect the transition implied by `confirmation_type`.
 * - Persist within a single transaction that includes confirmation record insert/update and shipment status update.
 *
 * 4) Return updated shipment representation
 * - Map the persisted shipment row (and, if needed for response DTO, its latest confirmation tracking metadata) into `IShoppingMallShipment` response type.
 *
 * Database operations:
 * - Transaction:
 *   - SELECT shipment by id
 *   - INSERT or UPDATE confirmation by unique `shopping_mall_shipment_id`
 *   - UPDATE shipment status
 *
 * Edge cases:
 * - Shipment exists but is not eligible for transition: return conflict/invalid-state.
 * - Seller authorization mismatch: return forbidden/unauthorized.
 * - Optional tracking fields may be null; store as null when omitted.
 *
 * @path /shoppingMall/member/shipments/:shipmentId
 * @accessor api.functional.shoppingMall.member.shipments.updateShipment
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function updateShipment(
  connection: IConnection,
  props: updateShipment.Props,
): Promise<updateShipment.Response> {
  return true === connection.simulate
    ? updateShipment.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...updateShipment.METADATA,
          path: updateShipment.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace updateShipment {
  export type Props = {
    /**
     * Target shipment identifier.
     */
    shipmentId: string & tags.Format<"uuid">;

    /**
     * Seller confirmation data used to transition the shipment state. This payload is stored in `shopping_mall_shipment_confirmations` and drives updates to `shopping_mall_shipments.status`.
     */
    body: IShoppingMallShipment.IUpdate;
  };
  export type Body = IShoppingMallShipment.IUpdate;
  export type Response = IShoppingMallShipment;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/member/shipments/:shipmentId",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/shoppingMall/member/shipments/${encodeURIComponent(props.shipmentId ?? "null")}`;
  export const random = (): IShoppingMallShipment =>
    typia.random<IShoppingMallShipment>();
  export const simulate = (
    connection: IConnection,
    props: updateShipment.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: updateShipment.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("shipmentId")(() => typia.assert(props.shipmentId));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Permanently removes the shipment record identified by `shipmentId`.
 *
 * This endpoint targets the `shopping_mall_shipments` entity, which groups `shopping_mall_order_items` within a customer order on a per-seller basis. The shipment’s lifecycle progression (including shipped/delivered state) is driven by the related `shopping_mall_shipment_confirmations` record, and the shipment is also referenced from `shopping_mall_order_items.shopping_mall_shipment_id`.
 *
 * Security and authorization are critical: customers are only allowed to view shipment tracking information for shipments that exist within their own orders and only where tracking context is present. Deleting a shipment must therefore be restricted to actors who own or govern fulfillment data (for example, the responsible seller in the shipment context or an administrator). If an actor does not have access to the shipment that belongs to a different party’s order context, the system must reject the request.
 *
 * Validation and error handling: when `shipmentId` does not correspond to an existing shipment record (or is not accessible to the caller), the system must reject the request with an appropriate not-found/forbidden error. Deletion must also respect relational integrity: because shipment confirmations and related order-item linkage are defined with cascading relations, removing the shipment must not leave orphaned confirmation records. After successful removal, the shipment must no longer appear in order details views; for customers, this prevents shipment tracking information from being shown for non-existing shipments, aligning with the rule that tracking is displayed only when the shipment exists with valid tracking context.
 *
 * Related operations: order oversight for administrators relies on shipment visibility through order details; after deletion, the order details view must reflect that the shipment no longer exists. Shipment confirmation and order-item status transitions are handled through shipment confirmation flows, which should not be invoked after the shipment is removed.
 *
 * @param props.connection
 * @param props.shipmentId Target shipment identifier to remove permanently.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement DELETE /shipments/{shipmentId}.
 *
 * 1) Extract `shipmentId` from path.
 * 2) Authorization:
 *    - Load the shipment by `shopping_mall_shipments.id`.
 *    - Determine caller permissions against the shipment’s parent `shopping_mall_orders.shopping_customer_id` and the shipment’s seller grouping context via `shopping_mall_shipments.seller_snapshot_id` and related snapshot ownership rules (use snapshot access rules used elsewhere in the system).
 *    - Allow only actors who manage fulfillment/fulfillment dispute data (responsible seller and/or admin). Reject customers who do not manage the fulfillment record.
 *    - If shipment does not exist or is not accessible, throw not-found/forbidden.
 * 3) Transaction:
 *    - Start a DB transaction.
 *    - Delete the `shopping_mall_shipments` row.
 *    - Rely on schema-defined cascading relations to delete the related `shopping_mall_shipment_confirmations` (relation is optional 1:1 and maps with onDelete: Cascade) and to delete references from `shopping_mall_order_items` rows that are tied to this shipment (order items relation includes onDelete: Cascade for the shipment foreign key; ensure the DB handles it as defined).
 *    - Commit.
 * 4) Post-conditions:
 *    - The shipment must not be returned by any order details shipment listing.
 *    - Customers must not receive tracking information for the removed shipment.
 * 5) Error handling:
 *    - Map DB foreign key/transaction failures to internal error responses.
 *    - Ensure idempotency is handled explicitly: if the shipment is already removed, return not-found as a rejection (do not treat as success).
 * @path /shoppingMall/member/shipments/:shipmentId
 * @accessor api.functional.shoppingMall.member.shipments.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * Target shipment identifier to remove permanently.
     */
    shipmentId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/member/shipments/:shipmentId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/member/shipments/${encodeURIComponent(props.shipmentId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("shipmentId")(() => typia.assert(props.shipmentId));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
