import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallShipment } from "../../../../structures/IPageIShoppingMallShipment";
import { IShoppingMallShipment } from "../../../../structures/IShoppingMallShipment";

export * as trackingInfos from "./trackingInfos/index";

/**
 * Create a new fulfillment shipment that groups one or more purchased order items from the same seller into a single package and records the shared tracking information for that package.
 *
 * This operation is part of the seller-side fulfillment workflow for marketplace orders. In the domain model, `shopping_mall_shipments` represents seller fulfillment packages that group one or more purchased order items from the same seller within a single order for shipping and delivery, while `shopping_mall_tracking_infos` stores the carrier and tracking identifier details attached to that shipment as a normalized one-to-one dependent entity. The request therefore creates both the shipment-level lifecycle record and the shipment-level tracking reference used by sellers and customers to monitor package transit.
 *
 * The operation must be available to the responsible seller for the selected order items, and may also be used by administrative oversight flows if the platform permits operational correction. Customers must not use this endpoint because customers only view shipment and tracking details from order history and confirm delivery after shipment creation. Seller ownership boundaries are strict: the selected order items must all belong to the authenticated seller, and they must all belong to the same `shopping_mall_orders` record. Items from different sellers are never combined into one shipment, even when purchased together in the same customer order.
 *
 * Business behavior follows the shipment grouping requirements exactly. A seller may create one bundled shipment for multiple eligible order items or separate shipments for separate items, but every order item included in one shipment shares the same shipment identity and the same tracking information. The system must preserve the list of included order items so the customer can later understand how purchased items were grouped for delivery in the order detail view. Because tracking is attached to the shipment, carrier name and tracking number apply to all included items and must not vary by item within the same package.
 *
 * Validation must ensure that the selected order items are eligible for shipment creation, are not already assigned to another shipment through `shopping_mall_order_items.shopping_mall_shipment_id`, and are in an order-item lifecycle state that can progress to shipped. The implementation must reject any mixed-seller grouping, any mixed-order grouping, and any attempt to record tracking information across seller boundaries. If validation fails for any selected item, the shipment must not be created and no shipment-level tracking information may be recorded.
 *
 * This operation is commonly followed by customer-facing order detail retrieval flows, where the created shipment becomes visible inside the order's shipment list together with its included items and tracking information. Later, when the customer confirms delivery for that shipment, all order items included in the shipment transition together to delivered, consistent with the shipment-level delivery confirmation rules.
 *
 * @param props.connection
 * @param props.body Shipment creation data including selected order items and tracking information
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Implement this operation as a single database transaction.
 *
 * 1. Authenticate the caller and resolve the acting seller context unless the caller is an authorized administrator performing oversight. For seller callers, require that every selected order item belongs to that seller by matching `shopping_mall_order_items.shopping_mall_seller_id` to the authenticated seller's `shopping_mall_sellers.id`.
 * 2. Validate the request body contains at least one order item identifier and shipment-level tracking data. Load all referenced `shopping_mall_order_items` rows together with their parent `shopping_mall_orders` and existing `shopping_mall_shipments` assignment state.
 * 3. Reject the request when any referenced order item does not exist, is soft deleted, belongs to a different seller, belongs to a different order than the first selected item, or already has a non-null `shopping_mall_shipment_id`. Also reject when the selected set would cross seller boundaries or order boundaries.
 * 4. Validate business-state eligibility for shipment creation using the order-item `status`. Only items in a pre-shipment fulfillment state should be accepted; items already shipped, delivered, cancelled, or refunded must be rejected. If platform-specific allowed statuses are enumerated elsewhere, enforce that exact whitelist.
 * 5. Create one `shopping_mall_shipments` row using the shared `shopping_mall_order_id` and `shopping_mall_seller_id` derived from the validated order items. Set `shipped_at` to the shipment creation timestamp, set `delivered_at` to null, and calculate `auto_deliver_at` according to the marketplace delivery auto-completion policy.
 * 6. Create one `shopping_mall_tracking_infos` row linked by `shopping_mall_shipment_id`, storing `carrier_name`, `tracking_number`, and optional `tracking_url`. Enforce the schema-level uniqueness of `(carrier_name, tracking_number)` and the one-to-one uniqueness on `shopping_mall_shipment_id`.
 * 7. Update all selected `shopping_mall_order_items` rows in the same transaction by setting `shopping_mall_shipment_id` to the new shipment id, updating `status` to the shipped lifecycle value, updating `updated_at`, and leaving `delivered_at` null at shipment creation time.
 * 8. Recompute or propagate any aggregate `shopping_mall_orders.status` change if the order header is derived from its item states. For example, transition the order to a shipped or partially completed state depending on whether all shippable items are now shipped.
 * 9. Return the created shipment resource including shipment identifiers, order and seller references, shipment timestamps, tracking information, and the grouped order items as represented by the shipment DTO.
 *
 * Error handling: return not-found for unknown order items, forbidden for seller ownership violations, and conflict or bad-request for invalid grouping such as mixed-seller, mixed-order, duplicate shipment assignment, duplicate tracking tuple, or ineligible order-item statuses. Ensure rollback on every failure so no partial shipment or tracking record is persisted.
 * @path /shoppingMall/seller/shipments
 * @accessor api.functional.shoppingMall.seller.shipments.create
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
     * Shipment creation data including selected order items and tracking information
     */
    body: IShoppingMallShipment.ICreate;
  };
  export type Body = IShoppingMallShipment.ICreate;
  export type Response = IShoppingMallShipment;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/seller/shipments",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/seller/shipments";
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
 * Retrieve a filtered and paginated list of shipment packages for customer order tracking and oversight use cases.
 *
 * This operation returns shipment-level records from the shopping_mall_shipments table, which represents seller fulfillment packages that group one or more purchased order items from the same seller within a single order for shipping and delivery. It is designed for the order detail experience described in the requirements, where customers can open an order, see the list of shipments created for that order, distinguish separate packages, and understand which purchased items were grouped together for delivery. Because a shipment is distinct from an order, one order may produce multiple shipment records, especially when different sellers fulfill different order items or when one seller splits items across multiple packages.
 *
 * The response is centered on shipment-level transit and delivery state rather than item-level tracking. This matches the database model where carrier and tracking identifiers are stored in shopping_mall_tracking_infos as a dependent one-to-one record of a shipment, and where shopping_mall_order_items references shopping_mall_shipments to show which items belong to each package. All order items inside the same shipment share the same carrier name and tracking number, and customers view tracking by shipment rather than by individual item. The list result should therefore surface summary information that is sufficient to present package identity, shipment timestamps such as shipped_at, delivered_at, and auto_deliver_at, seller context, and shipment-specific tracking context for order-detail displays.
 *
 * Security must enforce ownership and oversight boundaries. A customer may use this operation only for shipments belonging to that customer's own orders. An administrator may use the same operation for platform oversight of orders and fulfillment records. The implementation must not expose shipments from unrelated orders or other customers. If seller access is later enabled through shared DTOs, seller visibility must be restricted to shipments where shopping_mall_seller_id belongs to the authenticated seller, but this endpoint is primarily documented for customer tracking and administrative review based on the loaded requirements.
 *
 * Business behavior must preserve shipment grouping rules from the requirements. The shipment list must reflect that items from different sellers are never combined into one shipment, while multiple same-seller items may be bundled into a single package. Each shipment shown in the result should therefore correspond to a single responsible seller and one package-level tracking context. When an order has multiple shipments, the client can use this operation before any detail retrieval or delivery-confirmation action to identify the correct package. Related operations may include a shipment detail endpoint for a single shipment and a shipment delivery-confirmation endpoint, because delivery confirmation applies to all order items within the chosen shipment together rather than item by item.
 *
 * Expected behavior for empty or filtered results should be straightforward. If an order has no created shipments yet, the response should return an empty page rather than an error. If filters are invalid or access rules fail, the implementation should reject the request according to standard validation and authorization handling. Sorting and pagination should be stable so customers and administrators can browse shipment history consistently across orders and fulfillment timelines.
 *
 * @param props.connection
 * @param props.body Shipment search criteria and pagination options
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Implement a paginated shipment search over shopping_mall_shipments with structured filters provided by IShoppingMallShipment.IRequest.
 *
 * Build the base query from shopping_mall_shipments and support filtering at minimum by order identity, shipment identity, seller identity for authorized oversight views, delivery state inferred from delivered_at, and shipping timeline fields such as shipped_at date range when such fields exist in the request DTO. Join shopping_mall_orders to validate customer ownership and to allow filtering by order code when requested. Join shopping_mall_tracking_infos as an optional one-to-one relation so shipment summaries can include carrier_name, tracking_number, and tracking_url context when the DTO requires it. Join shopping_mall_order_items to compute or load included item summaries or item counts for presentation, but avoid duplicating shipment rows by using aggregation or nested mapping after the shipment page is selected.
 *
 * Enforce authorization before returning data. For customer access, constrain results to shipments whose parent shopping_mall_orders.shopping_mall_customer_id matches the authenticated customer. For administrator access, allow broader visibility without customer ownership filtering. If seller access is implemented for reuse, constrain results to shopping_mall_shipments.shopping_mall_seller_id equal to the authenticated seller ID. Reject requests that attempt to access shipments outside the caller's permitted scope.
 *
 * Preserve shipment-domain rules during projection. A shipment must represent only one seller's grouped order items, and tracking information is attached at the shipment level, not per item. The query logic should therefore treat shopping_mall_tracking_infos as shipment metadata shared by all included order items. Do not attempt to represent conflicting tracking information within one shipment. If related order items are loaded, ensure they are exactly the items whose shopping_mall_shipment_id matches the shipment row.
 *
 * Apply deterministic pagination and sorting. Default sorting should favor the most recently created or most recently shipped shipments, using created_at or shipped_at with a secondary stable key such as id. Return IPageIShoppingMallShipment.ISummary with pagination metadata and shipment summary rows. Each summary row should be derived from shopping_mall_shipments and may include selected joined values from shopping_mall_orders, shopping_mall_sellers, shopping_mall_tracking_infos, and aggregated shopping_mall_order_items data as defined by the DTO schema.
 *
 * Handle edge cases explicitly. When the filtered order exists but has no shipments yet, return an empty page. When a referenced order or shipment filter exists outside the caller's scope, return an authorization or not-found style failure according to platform conventions without leaking whether another user's shipment exists. Exclude logically removed records by respecting deleted_at on shopping_mall_shipments and joined records where applicable. Keep the implementation read-only; shipment creation, tracking assignment, and delivery confirmation are separate workflows and must not be performed here.
 * @path /shoppingMall/seller/shipments
 * @accessor api.functional.shoppingMall.seller.shipments.index
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
     * Shipment search criteria and pagination options
     */
    body: IShoppingMallShipment.IRequest;
  };
  export type Body = IShoppingMallShipment.IRequest;
  export type Response = IPageIShoppingMallShipment.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/seller/shipments",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/seller/shipments";
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
 * Retrieve the complete details of a single shipment package within a customer order.
 *
 * This operation returns one shipment record from the seller fulfillment package domain represented by `shopping_mall_shipments`, including the shipment-level transit reference data stored in `shopping_mall_tracking_infos` and the purchased order items from `shopping_mall_order_items` that are linked to that shipment. In the business model, a shipment is separate from the overall order: one order may contain multiple shipments, especially when fulfillment is split across sellers or across packages. This endpoint therefore allows an API consumer to inspect one specific package in isolation while preserving its relationship to the parent order.
 *
 * From the customer perspective, this operation supports the order detail experience described in the requirements. Customers can open an order, distinguish separate shipments, and inspect which purchased items are included in each package. Because tracking is attached at the shipment level rather than the individual item level, the returned shipment detail must present the carrier name and tracking number that apply to every order item contained in that package. When an order has multiple shipments, each shipment may have independent tracking information, and this endpoint is the package-specific retrieval that exposes that distinction clearly.
 *
 * Security and data ownership rules are critical. A customer must only be able to access a shipment that belongs to an order they own. The responsible seller may access shipments they fulfill, and administrators may access shipments for marketplace oversight, but ordinary callers must never be able to retrieve shipment data outside their ownership or governance scope. The API should therefore validate the caller's relationship to the parent `shopping_mall_orders` record and the shipment's `shopping_mall_seller_id` before returning data.
 *
 * This operation is closely related to the broader order detail retrieval flow. In a typical customer journey, the order detail endpoint is used first to obtain the order and its summarized shipment list, and this shipment-detail endpoint is then used when the client needs a package-focused view with included order items and shipment-specific tracking. Delivery confirmation is also defined at the shipment level in the business requirements, so consumers may use this response to determine whether the package has been shipped, delivered, or is awaiting confirmation, but this endpoint itself performs no status transition and does not allow customers to modify carrier or tracking data.
 *
 * If the shipment does not exist, is removed from active access, or does not belong to the authenticated actor's permitted scope, the operation must fail without exposing unrelated order, seller, or tracking information. The response should reflect the persisted shipment lifecycle fields such as `shipped_at`, `delivered_at`, and `auto_deliver_at`, along with the package tracking data and the exact set of included order items, so clients can render an accurate package-level detail view.
 *
 * @param props.connection
 * @param props.shipmentId Target shipment's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Implement a read-only shipment detail lookup service for `shopping_mall_shipments`.
 *
 * 1. Accept `shipmentId` as a UUID path parameter and load the shipment by `shopping_mall_shipments.id`. Exclude records that should not be exposed to the current caller, including cases where the shipment cannot be found or is not accessible under authorization rules.
 * 2. Join or separately load the parent `shopping_mall_orders` record using `shopping_mall_order_id` so the service can verify ownership and provide parent-order context if the DTO requires it.
 * 3. Load the one-to-one tracking record from `shopping_mall_tracking_infos` by `shopping_mall_shipment_id`. Because the schema enforces `@@unique([shopping_mall_shipment_id])`, at most one tracking record may exist for the shipment.
 * 4. Load all related `shopping_mall_order_items` where `shopping_mall_shipment_id` equals the target shipment id. Include enough related purchase context for the response DTO to show the exact items grouped into the package.
 * 5. Authorization rules:
 *    - Customer: allow only when the shipment's parent order belongs to the authenticated customer via `shopping_mall_orders.shopping_mall_customer_id`.
 *    - Seller: allow only when the shipment's `shopping_mall_seller_id` equals the authenticated seller id.
 *    - Administrator or superAdministrator: allow for oversight purposes.
 *    - Reject all other access attempts.
 * 6. Map the result into `IShoppingMallShipment`, including shipment lifecycle fields, nested tracking info, and the included order items. Ensure the tracking information is represented as shipment-level data shared by all items in the package, consistent with the requirements.
 * 7. Do not mutate any state. This endpoint must not change `delivered_at`, `updated_at`, order-item status, or tracking data.
 * 8. Error handling:
 *    - Return not found when the shipment id does not resolve to an accessible shipment.
 *    - Return forbidden when the shipment exists but the caller lacks permission.
 *    - Return a consistent domain error when relational data is unexpectedly inconsistent, such as a shipment without a valid parent order reference.
 * 9. Performance considerations: fetch shipment, parent order ownership fields, tracking info, and included order items in an efficient query plan to support order-detail navigation without unnecessary round trips.
 * @path /shoppingMall/seller/shipments/:shipmentId
 * @accessor api.functional.shoppingMall.seller.shipments.at
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
     * Target shipment's ID
     */
    shipmentId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallShipment;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/seller/shipments/:shipmentId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/seller/shipments/${encodeURIComponent(props.shipmentId ?? "null")}`;
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
 * Update a specific shipment record and apply shipment-level delivery state changes for the identified package.
 *
 * This operation manages a single seller-bounded shipment in the marketplace order domain. The underlying shipment record groups one or more purchased order items from the same seller within one order, as described by the shipment model, and exists as the package-level unit that customers review in order details. The shipment resource stores shipment lifecycle facts such as `shipped_at`, `auto_deliver_at`, and `delivered_at`, while carrier-level transit data is normalized into the related `shopping_mall_tracking_infos` record through `carrier_name`, `tracking_number`, and optional `tracking_url`. Together, these records let the system present one distinct package with one set of tracking details and one delivery outcome.
 *
 * This endpoint is primarily intended for shipment-level state completion after the package has been shipped. The loaded requirements state that customers view shipments from order details, can distinguish multiple shipments within one order, and confirm delivery at the shipment level rather than for each individual order item. When delivery is confirmed for one shipment, the confirmation affects only the order items contained in that shipment and must change those grouped items to delivered together. This preserves the business rule that shipment grouping remains seller-specific and that package-level tracking and package-level delivery remain consistent for all items assigned to the same shipment.
 *
 * Security and ownership checks are essential. A customer may update only a shipment that belongs to that customer’s own order, and administrative actors may be permitted to perform oversight corrections according to platform governance needs. The implementation must not allow a caller to act on an unrelated shipment, and it must never cause updates to order items outside the target shipment. Because the shipment belongs to both an order and a responsible seller, ownership verification should traverse the `shopping_mall_orders` relation for customer access and should preserve marketplace separation between different sellers’ packages inside the same order.
 *
 * This operation is tightly related to shipment viewing and tracking presentation flows. Customers typically reach this endpoint after opening order details and reviewing the shipment list that shows how purchased items were grouped for delivery. The shipment detail view should already expose the included order items and the shipment-level tracking information, including carrier name and tracking number. After that review, the customer can confirm delivery for the specific package represented by `shipmentId`. If an order contains multiple shipments, this endpoint should be executed separately for each package as it arrives.
 *
 * Expected error handling must cover missing shipments, unauthorized shipment access, invalid shipment lifecycle transitions, and attempts to confirm delivery for a shipment that has not yet been shipped or has already been completed. The implementation should also reject any update shape that would imply cross-shipment or cross-seller item movement through this endpoint, because shipment composition and seller-boundary rules are established during shipment creation workflows and not during delivery confirmation updates.
 *
 * @param props.connection
 * @param props.shipmentId Target shipment's ID
 * @param props.body Shipment update information
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Load the target `shopping_mall_shipments` record by `id = shipmentId` together with its `order`, `seller`, `trackingInfo`, and grouped `orderItems`.
 *
 * Authorize access before mutation. For customer execution, join through `shopping_mall_orders` and verify the shipment's `shopping_mall_order_id` belongs to the authenticated customer. For administrator execution, allow oversight access according to administrative permissions. Reject access when the shipment does not exist or is outside the caller's ownership boundary.
 *
 * Interpret the `IShoppingMallShipment.IUpdate` body as a constrained shipment update request. The primary supported business mutation is delivery confirmation. Validate that the shipment has already been shipped (`shipped_at` exists by schema), has not already been delivered when duplicate confirmation is disallowed, and is in a state where confirmation is meaningful. Do not allow this endpoint to regroup order items or reassign the shipment to another order or seller.
 *
 * When delivery confirmation is requested, execute the shipment update and order-item propagation in a single transaction. Set `shopping_mall_shipments.delivered_at` to the confirmation timestamp or current server time. Update all `shopping_mall_order_items` where `shopping_mall_shipment_id = shipmentId` so that `status` becomes the delivered lifecycle value and `delivered_at` is set consistently for every grouped item. Do not update any order item outside the target shipment. Preserve the invariant that one shipment confirmation affects only its included order items.
 *
 * After item updates, recalculate or synchronize any order-level aggregate lifecycle if the order service depends on item status convergence for `shopping_mall_orders.status`. Ensure this recalculation only derives from actual item states and does not overwrite unrelated concurrent fulfillment progress from other shipments in the same order.
 *
 * Return the refreshed shipment resource as `IShoppingMallShipment`, populated from the updated shipment row and its related tracking information and grouped item composition as defined by the DTO. Handle edge cases including nonexistent shipment, ownership mismatch, invalid lifecycle transition, empty shipment composition, and idempotent re-confirmation according to domain policy.
 * @path /shoppingMall/seller/shipments/:shipmentId
 * @accessor api.functional.shoppingMall.seller.shipments.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * Target shipment's ID
     */
    shipmentId: string & tags.Format<"uuid">;

    /**
     * Shipment update information
     */
    body: IShoppingMallShipment.IUpdate;
  };
  export type Body = IShoppingMallShipment.IUpdate;
  export type Response = IShoppingMallShipment;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/seller/shipments/:shipmentId",
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
    `/shoppingMall/seller/shipments/${encodeURIComponent(props.shipmentId ?? "null")}`;
  export const random = (): IShoppingMallShipment =>
    typia.random<IShoppingMallShipment>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
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
 * Permanently remove a specific shipment record and its dependent tracking information.
 *
 * This operation targets a single seller fulfillment package stored in the shopping_mall_shipments table. That table represents shipment-level lifecycle facts for one package that belongs to one order and one responsible seller, including shipped_at, auto_deliver_at, and delivered_at timestamps. The shipment groups one or more purchased order items from the same seller, and those order items reference the shipment through shopping_mall_order_items.shopping_mall_shipment_id so that delivery tracking and delivery confirmation can be managed consistently.
 *
 * Access to this operation must be restricted to the seller who owns the shipment or to an administrator performing marketplace oversight. Customers must not call this operation, because the requirements state that customers can only view shipments from the order detail view in order to understand how purchased items were grouped for delivery. Deletion is therefore an operational fulfillment action, not a customer-facing order-history action.
 *
 * The implementation must carefully handle the relationship between shopping_mall_shipments and shopping_mall_tracking_infos. Tracking information is a one-to-one dependent entity containing the carrier_name, tracking_number, and optional tracking_url used for transit lookup. Because the tracking record belongs to the shipment and the relation is defined with cascading deletion, removing the shipment also removes its dependent tracking information. The operation must also account for shopping_mall_order_items that were grouped into the shipment, because those items are linked to the shipment for shipping visibility and downstream delivery processing.
 *
 * This endpoint should only succeed when deletion does not violate shipment and order-history integrity. If the shipment has already progressed to a preserved delivery state or is otherwise required for ongoing fulfillment, dispute handling, or historical visibility, the request must be rejected. When deletion is allowed, related order items must no longer reference the removed shipment, and any shipment-dependent workflow state must be updated consistently so order details do not expose a non-existent package.
 *
 * This operation is related to the customer order-detail shipment viewing flow. That viewing flow depends on shipment records being present so customers can inspect the shipment list for an order and see which order items were included in each package. Removing a shipment therefore changes what appears in order detail responses and must be performed only when the shipment should no longer participate in active or historical presentation.
 *
 * @param props.connection
 * @param props.shipmentId Target shipment's ID.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Authorize the caller as either an administrator or the seller who owns the shipment. For seller access, load the target shopping_mall_shipments row and verify shopping_mall_seller_id matches the authenticated seller account.
 * 2. Load the shipment by id from shopping_mall_shipments, including its related order items from shopping_mall_order_items and optional trackingInfo from shopping_mall_tracking_infos. If not found, return a not-found error.
 * 3. Validate that the shipment is eligible for deletion. Reject the request if the shipment has already reached a preserved downstream state that should remain in customer order history, such as a completed delivered flow, or if business policy forbids removing a shipment that is still required for active tracking, dispute resolution, or historical integrity.
 * 4. Within a transaction, clear the shipment association from all linked shopping_mall_order_items by setting shopping_mall_shipment_id to null for rows referencing this shipment. Recalculate or normalize per-item status only if the fulfillment model requires reversing an invalid shipped association; do not invent status values not supported by the service's existing order-item state machine.
 * 5. Delete the dependent shopping_mall_tracking_infos row if present. Because the Prisma relation is cascading from shipment to tracking info, direct deletion of the shipment may already remove it, but the implementation should preserve transactional clarity.
 * 6. Delete the shopping_mall_shipments row.
 * 7. After deletion, ensure any order-detail query path no longer returns the removed shipment for the related shopping_mall_orders record. If aggregate order status depends on shipment existence, trigger the existing order-status reconciliation routine.
 * 8. Return success with no response body.
 * 9. Error handling: return not found when shipmentId does not exist; return forbidden when a seller attempts to remove another seller's shipment; return conflict when the shipment cannot be removed because it is already required for preserved fulfillment or historical order visibility; return validation error for malformed UUID input.
 * @path /shoppingMall/seller/shipments/:shipmentId
 * @accessor api.functional.shoppingMall.seller.shipments.erase
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
     * Target shipment's ID.
     */
    shipmentId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/seller/shipments/:shipmentId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/seller/shipments/${encodeURIComponent(props.shipmentId ?? "null")}`;
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
