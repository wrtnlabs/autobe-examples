import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallOrder } from "../../../../structures/IPageIShoppingMallOrder";
import { IShoppingMallOrder } from "../../../../structures/IShoppingMallOrder";

export * as history from "./history/index";
export * as order_items from "./order_items/index";

/**
 * Create a new customer order from a successful checkout/payment attempt.
 *
 * This endpoint is the system entry point for turning a payment-confirmed purchase attempt into a persistent order owned by the authenticated customer. The resulting order record stores customer shipping destination details captured at the moment the order was placed (recipient name/phone, postal code, region, city, street address, detail address, optional shipping instructions), ensuring delivery destination consistency for historical record and dispute resolution.
 *
 * The created order is linked to the payment attempt via `shopping_mall_orders.shopping_payment_id` and stores a human-readable `order_code` for customer reference. The order also serves as the parent container for purchased line items stored in `shopping_mall_order_items`, where each order item references the purchased product variant (`shopping_mall_order_items.shopping_mall_product_variant_id`) and the seller snapshot context (`shopping_mall_order_items.seller_snapshot_id`) captured at purchase time.
 *
 * This operation must be called by authenticated `member` actors (customers). It should reject unauthenticated callers and must ensure the caller can only create orders within their own ownership context (the payment attempt referenced by the request must belong to the logged-in customer, based on `shopping_mall_orders.shopping_customer_id`). Administrators are not the typical caller for customer order placement and should not be used to bypass ownership checks.
 *
 * Implementation must wrap order and order-item creation in a single database transaction. Validate that the referenced `shopping_mall_payments.id` exists and is successful according to `shopping_mall_payments.status` (and only create the order when payment is confirmed successful). Validate quantities and product variant purchaseability rules in the service layer, then create `shopping_mall_orders` and its related `shopping_mall_order_items` rows. The order-item workflow status should be initialized consistently with the business workflow at placement time and stored in `shopping_mall_order_items.line_item_status`. The service also needs to record `placed_at`, `ship_to_*` fields, and `order_code`.
 *
 * After creation, shipments are represented by `shopping_mall_shipments` records that will later be progressed via shipment confirmation. If the system design requires pre-creating shipments at order creation time, the operation should insert shipments grouped by seller snapshot context (`shopping_mall_shipments.seller_snapshot_id`) and attach order items through `shopping_mall_order_items.shopping_mall_shipment_id`; otherwise, shipments may be created in a later workflow step. In either case, the created order must remain consistent such that order items reference valid parent order and seller snapshot records.
 *
 * Expected behavior: on success, return the created order with its associated details as defined by the `IShoppingMallOrder` response schema. On failure, return validation/authorization errors without creating partially persisted order data.
 *
 * @param props.connection
 * @param props.body Order creation payload constructed from the customer’s successful checkout/payment placement context, including the payment reference, captured shipping destination fields, and purchased line item requests.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Service-layer implementation steps:
 *
 * 1) Authenticate and authorize caller as `member` (customer). Reject unauthenticated requests.
 *
 * 2) Parse request body (IShoppingMallOrder.ICreate) and extract:
 *    - target payment attempt reference (shopping_mall_payments.id)
 *    - line item requests (each with shopping_mall_product_variant_id, quantity)
 *    - shipping address fields captured at placement time (ship_to_name/phone/postal/region/city/street/detail, optional shipping_instructions)
 *    - seller snapshot context linkage required per line item (seller_snapshot_id) or derivable input required by the DTO.
 *
 * 3) Transactional database work (single DB transaction):
 *    a) Load `shopping_mall_payments` by id and verify:
 *       - it is not deleted (respect shopping_mall_payments.deleted_at if applicable in runtime)
 *       - its `status` indicates success for order creation
 *       - it corresponds to the authenticated customer (by checking that `shopping_mall_orders.shopping_customer_id` matches the caller, or by deriving from order-for-payment relation when available).
 *    b) Create `shopping_mall_orders` row:
 *       - set `shopping_customer_id` from the authenticated member
 *       - set `shopping_payment_id` to the validated payment id
 *       - set `order_code` (ensure uniqueness; if an order_code generator is used, retry on conflict)
 *       - set `ship_to_*` fields exactly from request captured-at-placement inputs
 *       - set `placed_at` to current time (service time)
 *       - initialize `created_at`/`updated_at`.
 *    c) Create `shopping_mall_order_items` rows for each requested purchased product variant:
 *       - set `shopping_mall_order_id` to the newly created order id
 *       - set `shopping_mall_product_variant_id` and `quantity`
 *       - set `seller_snapshot_id` to the correct seller snapshot context for dispute resolution
 *       - set `seller_price_at_purchase` using the purchase context rules (from request if provided, otherwise compute from variant pricing at checkout)
 *       - initialize `line_item_status` to the placement initial status allowed by business workflow
 *       - set `placed_at` for line items
 *       - set `created_at`/`updated_at`.
 *    d) Ensure shipment consistency:
 *       - If shipments must be created now, group created order items by `seller_snapshot_id` and insert `shopping_mall_shipments` rows with `shopping_mall_order_id`, `seller_snapshot_id`, and initial `status`.
 *       - Update each corresponding `shopping_mall_order_items.shopping_mall_shipment_id`.
 *       - If shipments are created later, leave `shopping_mall_shipment_id` as null while ensuring order items can still be updated later consistently.
 *
 * 4) Return the created order by loading it (and related collections as required by IShoppingMallOrder) to ensure response matches persisted state.
 *
 * Edge cases and error handling:
 * - If payment id is invalid or payment status is not success, reject with an error and do not create an order.
 * - If ownership check fails (payment does not belong to caller), reject.
 * - If request line items are inconsistent (e.g., duplicate variants in same request when business rules forbid it), reject.
 * - On any failure inside the transaction, roll back all inserts.
 *
 * Integration notes:
 * - The endpoint must not create audit snapshots directly; snapshot creation for seller snapshot context is expected to be part of the checkout/purchase preparation workflow or derived by the service layer before passing seller_snapshot_id into this operation.
 * @path /shoppingMall/member/orders
 * @accessor api.functional.shoppingMall.member.orders.create
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
     * Order creation payload constructed from the customer’s successful checkout/payment placement context, including the payment reference, captured shipping destination fields, and purchased line item requests.
     */
    body: IShoppingMallOrder.ICreate;
  };
  export type Body = IShoppingMallOrder.ICreate;
  export type Response = IShoppingMallOrder;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/member/orders",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/member/orders";
  export const random = (): IShoppingMallOrder =>
    typia.random<IShoppingMallOrder>();
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
 * Retrieve a filtered, sorted, and paginated list of orders for the currently authenticated customer.
 *
 * This endpoint is intended for customer-facing order history browsing. The system sorts order history by newest orders first and paginates the results so customers can reliably locate their orders across pages. Each order entry includes the order number, the order date, the order total, and the overall order status.
 *
 * Authorization is required: a member can only access orders that belong to themselves. Administrators may have additional oversight permissions depending on platform governance rules.
 *
 * Implementation reads order history data from the order header and derives list-time summary fields (such as total price and overall status) using the related order item and shipment records that reflect the order fulfillment and cancellation/refund workflow. The filtering and sorting behavior must be consistent across pages for the active browsing context.
 *
 * Request validation includes pagination bounds and validation for optional filter criteria (for example, an order date range and/or an overall status filter). Sorting defaults to newest-first (descending by the order date field used in the order header) unless the request specifies an explicitly supported sort option.
 *
 * Related operations: for a full order view (items and shipment details), use the separate order detail retrieval operation. Review creation/display is a separate feature and is not handled by this listing endpoint.
 *
 * @param props.connection
 * @param props.body Order history search criteria including pagination, sorting, and optional filters such as an order-date range and/or an overall status filter.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement a PATCH-based order history search.
 *
 * Algorithm:
 * 1) Authenticate request actor.
 * 2) Build a query over shopping_mall_orders with base predicate:
 *    - If actor is a member: shopping_mall_orders.shopping_customer_id == actor.customerId
 *    - Exclude records where shopping_mall_orders.deleted_at is not null.
 * 3) Apply filters from request body:
 *    - placed_at range filters using shopping_mall_orders.placed_at
 *    - optional overall status filter: compute/derive by joining order items (shopping_mall_order_items.line_item_status) and shipments (shopping_mall_shipments.status) as required by the domain’s status derivation logic.
 * 4) Compute list fields needed for summaries:
 *    - order number: shopping_mall_orders.order_code
 *    - order date: shopping_mall_orders.placed_at
 *    - total price: derive from shopping_mall_order_items.seller_price_at_purchase * quantity (sum across order items) or use a domain-specific total derivation consistent with order creation/fulfillment.
 *    - overall status: derive consistently from the set of shopping_mall_order_items statuses and shipment statuses (e.g., shipped/delivered/cancelled/refunded terminal states).
 * 5) Sorting:
 *    - default newest-first: shopping_mall_orders.placed_at desc.
 *    - If request specifies sort direction/field, allow only fields that are supported and map them to actual columns.
 * 6) Pagination:
 *    - Apply cursor/offset pagination per IShoppingMallOrder.IRequest contract.
 *    - Return IPageIShoppingMallOrder.ISummary containing pagination metadata and an array of order summaries.
 *
 * Database access:
 * - Primary query: shopping_mall_orders (filtering by customer scope and deleted_at).
 * - For computed fields requiring joins: join shopping_mall_order_items and/or shopping_mall_shipments with aggregation grouped by shopping_mall_orders.id.
 *
 * Edge cases:
 * - If no orders match, return an empty page with valid pagination metadata.
 * - If filter combinations are invalid (e.g., start date after end date), reject with validation error.
 *
 * Error handling:
 * - Authorization failures: 403/401.
 * - Validation failures: 400.
 * - Unexpected errors: 500 without leaking internal details.
 * @path /shoppingMall/member/orders
 * @accessor api.functional.shoppingMall.member.orders.index
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
     * Order history search criteria including pagination, sorting, and optional filters such as an order-date range and/or an overall status filter.
     */
    body: IShoppingMallOrder.IRequest;
  };
  export type Body = IShoppingMallOrder.IRequest;
  export type Response = IPageIShoppingMallOrder.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/member/orders",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/member/orders";
  export const random = (): IPageIShoppingMallOrder.ISummary =>
    typia.random<IPageIShoppingMallOrder.ISummary>();
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
 * Retrieve the details of a specific customer order by order identifier.
 *
 * This endpoint is intended for viewing a single order in the customer order history flow. The system stores orders as customer-owned records created only after checkout/payment succeeds, and it preserves the recipient address fields captured at the time the order was placed. The returned order detail must therefore expose the order header data (e.g., order code and ship-to fields) and the purchase context necessary to show each purchased order item and its current line-item status.
 *
 * Authorization is based on ownership and actor role: authenticated customers may only view orders that belong to their own account, while administrators may inspect orders across the platform for oversight and dispute resolution. Unauthenticated requests must be rejected.
 *
 * Order status shown in the response must remain consistent with the derived status model: an order’s overall status is determined from the statuses of its associated order items (line_item_status), not set independently. The implementation should also respect visibility rules driven by the existence of related records: if an order is hidden due to order-level deleted_at, it must not be returned.
 *
 * Related behaviors: this operation complements the customer order history list endpoint, where the list shows each order’s order number, order date, total price, and overall status in a paginated newest-first sequence. When building a full order detail view, this operation should provide the order items and their current statuses so that customer, seller, and administrative interfaces can handle shipment/cancellation/refund workflows consistently.
 *
 * If the requested orderId does not exist or is not visible to the actor, the system should return a not-found style error rather than leaking information about other customers’ orders.
 *
 * @param props.connection
 * @param props.orderId Target order identifier to retrieve. Must match an existing shopping_mall_orders.id (UUID).
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1) Parse `orderId` from path.
 *
 * 2) Authorization/visibility checks:
 * - Require an authenticated actor.
 * - If actor is admin: visibility is allowed across all orders.
 * - If actor is member (customer): load shopping_mall_orders where id = orderId AND shopping_customer_id = actor.member.id.
 * - If no matching visible record exists (including when shopping_mall_orders.deleted_at is not null), return 404.
 *
 * 3) Load order data in a single transaction-less read flow:
 * - Query shopping_mall_orders by id.
 * - Eager-load related orderItems (shopping_mall_order_items) that belong to the order, excluding those where shopping_mall_order_items.deleted_at is not null.
 * - Eager-load shipments (shopping_mall_shipments) for the order, excluding those where deleted_at is not null.
 * - Eager-load shipment confirmations only if the order detail DTO requires it; ensure confirmations are excluded if deleted_at is not null.
 * - Eager-load the payment relation (shopping_mall_payments) for the order; ensure deleted payments are excluded if deleted_at is not null.
 *
 * 4) Consistency rules:
 * - Derive order overall status from order item line_item_status values (do not use any independent order-level status field).
 * - Ensure order item status fields are returned in a way consistent with the stored line_item_status.
 *
 * 5) DTO mapping:
 * - Map shopping_mall_orders fields to IShoppingMallOrder.
 * - Include order items with their quantities, seller_price_at_purchase, placed_at, line_item_status, and linkage identifiers required by the response schema.
 * - Include shipments grouped by seller context as represented in the shipment rows.
 *
 * 6) Error handling:
 * - 401/unauthorized if not authenticated.
 * - 404 when order is not found or not visible.
 * - 500 for unexpected database/runtime errors.
 * @path /shoppingMall/member/orders/:orderId
 * @accessor api.functional.shoppingMall.member.orders.at
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
     * Target order identifier to retrieve. Must match an existing shopping_mall_orders.id (UUID).
     */
    orderId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallOrder;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/member/orders/:orderId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/member/orders/${encodeURIComponent(props.orderId ?? "null")}`;
  export const random = (): IShoppingMallOrder =>
    typia.random<IShoppingMallOrder>();
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
      assert.param("orderId")(() => typia.assert(props.orderId));
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
 * Update an existing order header for the specified customer-owned order.
 *
 * This endpoint is intended for scenarios where a member needs to adjust order header information after placement, while preserving the historical purchasing context required for order integrity and dispute resolution. The order is a customer-owned record in the orders table (and related items/shipments represent fulfillment context). Any update must be scoped to the caller’s own order and must not alter data that is tied to already-locked purchase context.
 *
 * Authorization is enforced by verifying that the authenticated member is the owner of the order record. Administrators may be allowed to update under governance rules if the platform-wide authorization layer grants such permission.
 *
 * Validation and business rules:
 *
 * - The target order must exist; orders that are not intended to be shown to normal views should be treated as not found.
 * - The update must be rejected if the order has progressed to a fulfillment state where header changes are no longer permitted.
 * - When updates are allowed, the operation may update only the mutable order-header fields supported by the implementation; it must not modify fulfillment/derived state represented by related order item status and shipment status.
 *
 * This operation complements order browsing (list/search and retrieving order details) by providing a controlled order-header change workflow aligned with data preservation guarantees.
 *
 * Error handling includes not-found for invalid order identifiers, authorization/forbidden when ownership checks fail, and a validation/state error when the order cannot be updated due to workflow progression.
 *
 * @param props.connection
 * @param props.orderId Target order identifier (UUID).
 * @param props.body Order header update payload. Only fields that are mutable by this endpoint should be provided/overwritten.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement PUT /orders/{orderId} as an order-header update with strict ownership and state validation.
 *
 * 1) Authenticate caller and identify actor/member.
 * 2) Load shopping_mall_orders where id = orderId and deleted_at is null.
 * 3) Authorization:
 *    - Ensure shopping_mall_orders.shopping_customer_id matches the authenticated member id.
 *    - Allow admin override only if your system-wide authorization layer permits it for governance.
 * 4) State validation:
 *    - Determine whether header updates are allowed based on fulfillment progression.
 *    - Use shopping_mall_order_items and/or shopping_mall_shipments to detect whether the order has advanced beyond a point where recipient/shipping fields must remain consistent with placement-time context.
 *    - If not allowed, throw a domain validation/state error.
 * 5) Apply updates:
 *    - Update only fields present in shopping_mall_orders that are intended to be mutable by this endpoint: ship_to_name, ship_to_phone, ship_to_postal_code, ship_to_region, ship_to_city, ship_to_street_address, ship_to_detail_address, shipping_instructions.
 *    - Do not modify shopping_mall_orders.shopping_payment_id, order_code, or immutable placement fields beyond what this endpoint explicitly supports.
 * 6) Persist:
 *    - Perform a single transaction for the order header update.
 *    - Update shopping_mall_orders.updated_at.
 * 7) Response:
 *    - Return the updated shopping_mall_orders record mapped to IShoppingMallOrder.
 *
 * Edge cases:
 * - Concurrency: if multiple updates are attempted, rely on optimistic concurrency if the project implements it; otherwise ensure consistent reads within the transaction.
 * - Soft-deleted orders (deleted_at set) must be treated as not found for normal views.
 * @path /shoppingMall/member/orders/:orderId
 * @accessor api.functional.shoppingMall.member.orders.update
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
     * Target order identifier (UUID).
     */
    orderId: string & tags.Format<"uuid">;

    /**
     * Order header update payload. Only fields that are mutable by this endpoint should be provided/overwritten.
     */
    body: IShoppingMallOrder.IUpdate;
  };
  export type Body = IShoppingMallOrder.IUpdate;
  export type Response = IShoppingMallOrder;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/member/orders/:orderId",
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
    `/shoppingMall/member/orders/${encodeURIComponent(props.orderId ?? "null")}`;
  export const random = (): IShoppingMallOrder =>
    typia.random<IShoppingMallOrder>();
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
      assert.param("orderId")(() => typia.assert(props.orderId));
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
 * Permanently removes an order record owned by the authenticated customer.
 *
 * This endpoint targets the order identified by `orderId` and enforces ownership so that customers can only remove their own orders. The domain explicitly requires that order history relevant to seller records and legal/dispute purposes remains available after customer account deletion. To keep dispute resolution consistent, this operation must not modify immutable snapshot records; instead, it should only remove or hide the active order representation while leaving preserved historical references intact.
 *
 * The order being removed is represented by `shopping_mall_orders`, which links to the owning member (`shopping_customer_id`) and to the payment attempt (`shopping_payment_id`). Order line items are stored in `shopping_mall_order_items` and contain seller snapshot references (via `seller_snapshot_id`) that must remain intact for dispute resolution. Therefore, this endpoint must be implemented so that the deletion process does not attempt to delete or alter snapshot records.
 *
 * Permission and safety constraints:
 * - Only an authenticated member who owns the order may call this endpoint.
 * - If the order does not exist or is not owned by the caller, the system must reject the request.
 * - If the implementation uses record hiding through `deleted_at`, it must align with the database schema for orders and must not break referential integrity needed for dispute resolution.
 *
 * Related behavior:
 * - This operation is conceptually aligned with customer account deletion behavior that preserves orders and order history. If the system is configured to preserve dispute-resolution history, this endpoint should preserve the same history characteristics (immutability and availability of snapshot-based dispute resolution truth) even though the active order is removed from normal customer views.
 *
 * Expected results and error handling:
 * - On success, the order is removed/hidden and no longer appears in normal order listings.
 * - On failure (unauthorized, not found, or invariant violations preventing deletion), the system must return an error with a clear message so the client can act accordingly.
 *
 *
 * @param props.connection
 * @param props.orderId Target order identifier to remove. The caller must own this order.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps:
 * 1) Authenticate the caller as a member (customer). Extract the caller member/account id.
 * 2) Validate `orderId` as a UUID.
 * 3) Fetch `shopping_mall_orders` by `id` and verify `shopping_customer_id` equals the caller id.
 *    - If not found or ownership mismatch: return 404 or 403 per system error conventions.
 * 4) Perform deletion/hiding of the order:
 *    - Use `deleted_at` on `shopping_mall_orders` if the codebase treats orders as hidden rather than physically deleted.
 *    - Ensure the deletion does not delete immutable snapshot records referenced by `shopping_mall_order_items.seller_snapshot_id` (and any other snapshot-linked entities).
 * 5) Dealing with dependent rows:
 *    - `shopping_mall_order_items` have `deleted_at`; mark them as deleted as needed so they disappear from active views, but do not delete/alter referenced `shopping_mall_snapshots`.
 *    - Any dependent workflow entities reachable from order items (e.g., `shopping_mall_cancellation_requests`, `shopping_mall_refund_requests`) must be handled consistently with their invariants and privacy rules. Prefer marking them deleted via their own `deleted_at` rather than hard deletion.
 * 6) Ensure transactional consistency:
 *    - Execute the order/item deletion/hiding in a single database transaction.
 * 7) Return success with no body.
 *
 * Edge cases:
 * - Orders with existing shipments, confirmations, cancellation/refund requests: ensure the operation does not attempt to modify or delete shipment-confirmation records in a way that violates dispute resolution needs.
 * - Snapshot immutability rule: do not call any update/delete on `shopping_mall_snapshots` (or snapshot payload-related tables) because snapshot records must be treated as immutable.
 *
 * Database queries:
 * - SELECT shopping_mall_orders WHERE id=? AND shopping_customer_id=?
 * - Optional: SELECT order_items by shopping_mall_order_id to mark `deleted_at`.
 * - Update shopping_mall_orders.deleted_at (and shopping_mall_order_items.deleted_at if required) within a transaction.
 *
 * @path /shoppingMall/member/orders/:orderId
 * @accessor api.functional.shoppingMall.member.orders.erase
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
     * Target order identifier to remove. The caller must own this order.
     */
    orderId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/member/orders/:orderId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/member/orders/${encodeURIComponent(props.orderId ?? "null")}`;
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
      assert.param("orderId")(() => typia.assert(props.orderId));
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
