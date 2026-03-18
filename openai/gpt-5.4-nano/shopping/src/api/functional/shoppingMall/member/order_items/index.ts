import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallOrderItem } from "../../../../structures/IPageIShoppingMallOrderItem";
import { IShoppingMallOrderItem } from "../../../../structures/IShoppingMallOrderItem";

export * as oversight from "./oversight/index";

/**
 * Create a new order line item representing a purchased product variant within a specific customer order.
 *
 * This operation persists a new row in `shopping_mall_order_items`, which stores the purchased `shopping_mall_product_variant_id`, the immutable `seller_snapshot_id` for dispute resolution, the ordered `quantity`, and the workflow `line_item_status` for fulfillment/cancellation/refund progression.
 *
 * Because `shopping_mall_orders` owns the customer context (via `shopping_customer_id`) and `shopping_mall_product_variants` define the sellable unit (with optional `deleted_at` and `is_active` flags), the service must validate that the referenced order and variant are compatible with the creation request before inserting the order item.
 *
 * If the creation request includes a `shopping_mall_shipment_id`, the created order item must be linked consistently to that shipment; otherwise, the order item can be created without a shipment linkage and will be grouped later as part of the order’s per-seller fulfillment lifecycle.
 *
 * Security and authorization: access must be restricted so that only an authenticated member operating in the proper order ownership context (or an allowed seller/admin workflow) can create order items for an order. Input validation must ensure that no order item is created for a mismatched order/customer context, and that inventory/fulfillment preconditions are respected by the surrounding checkout workflow.
 *
 * Validation behavior: if any referenced record is missing, inactive/unavailable, or inconsistent (for example, the shipment/order seller grouping does not match), the operation must reject the request with an error and must not create any misleading snapshot records as part of the failed attempt.
 *
 * Related operations: after successful creation, the order item participates in shipment grouping and status transitions via shipment-related flows, and later supports cancellation/refund request creation when permitted by the order item workflow status.
 *
 * Expected response: returns the full created order item representation as defined by the `IShoppingMallOrderItem` DTO.
 *
 * @param props.connection
 * @param props.body Order item creation payload including order linkage, purchased product variant, seller snapshot context, quantity, unit price at purchase, initial workflow status, and optional shipment linkage.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement POST /order-items as follows:
 *
 * 1) Parse request body as `IShoppingMallOrderItem.ICreate`.
 *
 * 2) Start a database transaction.
 *
 * 3) Validate referenced entities:
 *    - `shopping_mall_order_id` must exist in `shopping_mall_orders` and not be hidden for normal views by `deleted_at` policy (follow existing query conventions).
 *    - The referenced `shopping_mall_product_variant_id` must exist in `shopping_mall_product_variants`, and must be eligible for purchase at the business level (check `is_active` and `deleted_at` according to current availability rules).
 *    - `seller_snapshot_id` must exist in `shopping_mall_snapshots` (schema not loaded here; validate referential integrity via FK and handle FK violation).
 *
 * 4) Validate workflow fields:
 *    - Ensure `line_item_status` is set to the correct initial status value expected by the order-item lifecycle for new items (the exact allowed values are enforced by application rules; reject unknown/invalid statuses).
 *    - Set/validate `placed_at` for consistency with order placement time.
 *
 * 5) Shipment linkage (optional):
 *    - If `shopping_mall_shipment_id` is provided, ensure it exists in `shopping_mall_shipments` and belongs to the same `shopping_mall_order_id` as requested.
 *    - Ensure status and grouping rules are compatible with immediate linkage; if inconsistent, reject.
 *
 * 6) Insert `shopping_mall_order_items` row with:
 *    - `shopping_mall_order_id`, `shopping_mall_product_variant_id`, `seller_snapshot_id`, optional `shopping_mall_shipment_id`
 *    - `seller_price_at_purchase`, `quantity`
 *    - `line_item_status`, `placed_at`
 *    - rely on DB/application to set `created_at` and `updated_at` (if timestamps are handled by ORM defaults, use them).
 *
 * 7) Ensure atomicity:
 *    - If any validation fails or FK constraints fail, roll back the transaction.
 *    - Do not create or persist any snapshot-related records in this operation unless the insertion succeeds; this prevents misleading snapshot history on failed creation attempts.
 *
 * 8) Return the inserted row mapped to `IShoppingMallOrderItem`.
 *
 * Error handling:
 * - 400 for validation errors (missing/invalid references, incompatible shipment linkage, invalid status).
 * - 404 if the referenced order or variant cannot be found (follow existing error mapping conventions).
 * - 409 if the request conflicts with current workflow rules (e.g., already-inconsistent status or disallowed transition).
 * - 500 for unexpected database errors.
 *
 * Performance:
 * - Use indexed columns for lookups (`shopping_mall_order_items.shopping_mall_order_id`, `shopping_mall_order_items.created_at`, and variant composite uniqueness patterns as applicable).
 * @path /shoppingMall/member/order-items
 * @accessor api.functional.shoppingMall.member.order_items.create
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
     * Order item creation payload including order linkage, purchased product variant, seller snapshot context, quantity, unit price at purchase, initial workflow status, and optional shipment linkage.
     */
    body: IShoppingMallOrderItem.ICreate;
  };
  export type Body = IShoppingMallOrderItem.ICreate;
  export type Response = IShoppingMallOrderItem;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/member/order-items",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/member/order-items";
  export const random = (): IShoppingMallOrderItem =>
    typia.random<IShoppingMallOrderItem>();
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
 * Retrieve a filtered and paginated list of order line items.
 *
 * This operation is the query entry point for browsing order items stored in `shopping_mall_order_items`, including their workflow `line_item_status`, pricing-at-purchase (`seller_price_at_purchase`), quantity, placement timestamp (`placed_at`), and linkage context to the parent order (`shopping_mall_order_id`), purchased variant (`shopping_mall_product_variant_id`), seller snapshot (`seller_snapshot_id`), and optional shipment membership (`shopping_mall_shipment_id`).
 *
 * Use this endpoint when the client needs to find order items using multiple criteria (for example: restrict by order id, product variant, shipment presence, or line item status) and when simple query string parameters are insufficient. The operation returns a list optimized for UI and client-side pagination using the `IShoppingMallOrderItem` summary representation.
 *
 * Security and authorization: returned order items must be scoped to the authenticated actor. For customers, items must belong to orders owned by the requesting customer in `shopping_mall_orders.shopping_customer_id`. For sellers, items must be visible only when they are part of fulfillment under the seller-specific shipment grouping (items included in `shopping_mall_shipments` for which the seller snapshot context matches the seller’s allowed scope). For administrators, wider access is allowed to support oversight and dispute resolution. Any attempt to query items outside the actor’s scope must return an error (typically authorization failure) and must not reveal existence details via filtering behavior.
 *
 * Validation and filtering rules: the server validates filter fields against the allowed business workflow and schema relationships. Filters must be applied consistently with nullable foreign keys (e.g., `shopping_mall_shipment_id` can be null while the item is not yet included in a shipment). Sorting must be deterministic, and pagination must be stable under concurrent updates by using consistent ordering keys.
 *
 * Error handling: if the provided filter criteria are invalid (e.g., malformed UUIDs or unsupported status values), the operation returns a validation error. If the actor has no matching items under their authorization scope, the operation returns an empty page with pagination metadata rather than an error.
 *
 * Related operations: once order items are identified via this endpoint, clients typically proceed to retrieve or act on related shipment state and confirmation history using dedicated shipment and order-item workflow endpoints. For example, shipment confirmation records in `shopping_mall_shipment_confirmations` drive updates to items’ shipped/delivered states, while cancellation/refund workflows are represented by separate request entities and status transitions that must preserve snapshot integrity rules (snapshots are created only after successful edits/edits that actually apply).
 *
 * @param props.connection
 * @param props.body Order item search criteria and pagination/sorting options.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement PATCH /order-items as a paginated order item query.
 *
 * 1) Input handling
 * - Parse pagination/sorting/filtering from IShoppingMallOrderItem.IRequest.
 * - Validate UUID formats for any provided ids (shoppingOrderId, productVariantId, shipmentId, sellerSnapshotId) according to schema types.
 * - Validate line item status values against the allowed workflow category used by the system (reject unknown values with 400).
 *
 * 2) Authorization scoping
 * - Determine actor from authentication context.
 * - If actor is customer/member: join shopping_mall_orders and constrain shopping_mall_orders.shopping_customer_id to the actor’s member id.
 * - If actor is seller: constrain visibility to order items that are included in shipments whose seller snapshot context is within the seller’s scope (via shopping_mall_shipments.seller_snapshot_id and/or seller snapshot ownership rules implemented in the service layer).
 * - If actor is admin: no additional ownership filter beyond excluding records that are deleted per the framework’s query policy.
 * - Always apply the authorization constraints before applying pagination to avoid leaking counts outside scope.
 *
 * 3) Database query strategy
 * - Base table: shopping_mall_order_items.
 * - Apply optional filters:
 *   - shopping_mall_order_id (if provided)
 *   - shopping_mall_product_variant_id (if provided)
 *   - seller_snapshot_id (if provided)
 *   - shopping_mall_shipment_id presence and/or exact id (support null/non-null logic when filter requests “unshipped” or shipmentId).
 *   - line_item_status (if provided)
 *   - placed_at date range (if provided in request)
 * - Join shopping_mall_orders only when needed for customer scoping or when order-level sorting/filtering requires it.
 * - Join shopping_mall_shipments only when needed for seller scoping or shipment-related filtering.
 *
 * 4) Pagination and sorting
 * - Use stable ordering. Default order should be by placed_at DESC and then created_at DESC (or updated_at) if available in the schema-derived ordering keys.
 * - Apply limit/offset (or cursor-based pagination if the DTO supports it). Ensure consistent results across pages.
 *
 * 5) Response mapping
 * - Return IPageIShoppingMallOrderItem.ISummary where each item summary includes identifiers and the key display fields required by the summary DTO (at minimum: orderItem id, order id, product variant id, seller snapshot id, shipment id nullable, line_item_status, quantity, seller_price_at_purchase, placed_at).
 *
 * 6) Edge cases
 * - If filters result in zero rows, return an empty page with pagination metadata.
 * - If shipment id filter is provided and it references an item not visible under authorization, treat as no matching rows (do not disclose).
 * @path /shoppingMall/member/order-items
 * @accessor api.functional.shoppingMall.member.order_items.index
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
     * Order item search criteria and pagination/sorting options.
     */
    body: IShoppingMallOrderItem.IRequest;
  };
  export type Body = IShoppingMallOrderItem.IRequest;
  export type Response = IPageIShoppingMallOrderItem.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/member/order-items",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/member/order-items";
  export const random = (): IPageIShoppingMallOrderItem.ISummary =>
    typia.random<IPageIShoppingMallOrderItem.ISummary>();
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
 * Retrieve detailed information for a single shopping mall order item.
 *
 * This endpoint is the canonical way to read the current purchased line-item record from `shopping_mall_order_items`. Each order item represents one purchased product variant within a customer order and is tracked independently through its `line_item_status` lifecycle (for example, statuses used to drive shipment, seller approval flows for cancellation/refund requests, and final states).
 *
 * The response includes order-item level data captured at purchase time, including the purchased product variant linkage (`shopping_mall_product_variant_id`) and the seller purchase snapshot context (`seller_snapshot_id`). This snapshot linkage is used by the system to keep dispute resolution and historical views consistent with the seller/product context at the time the order was placed.
 *
 * Authorization and data ownership: the operation must ensure that only permitted actors can read the targeted order item. In practice, ownership is validated by comparing the target `shopping_mall_order_items.shopping_mall_order_id` to the requesting customer’s orders; sellers can read only order items that belong to their products through the stored seller-context snapshot; administrators can read across the platform for oversight and inspection.
 *
 * Validation and error handling: if `orderItemId` does not match any existing `shopping_mall_order_items` record (or is hidden by record removal rules reflected by `deleted_at` in related list queries), the service must return a not-found error.
 *
 * Related operations: for browsing an order’s items as part of order details, clients typically call the order detail operation and then render each order item’s status. For dispute workflows, cancellation and refund requests are represented by `shopping_mall_cancellation_requests` and `shopping_mall_refund_requests`, and seller fulfillment transitions are driven by shipment confirmation records in `shopping_mall_shipment_confirmations`. This endpoint provides the base order-item state that those workflows reference.
 *
 * @param props.connection
 * @param props.orderItemId Target order item ID to retrieve (UUID).
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps:
 * 1) Parse `orderItemId` from path as UUID.
 * 2) Query `shopping_mall_order_items` by `id = orderItemId`.
 * 3) Join required linked records needed by `IShoppingMallOrderItem` representation:
 *    - `shopping_mall_orders` via `shopping_mall_order_id` only if needed for authorization scoping and derived display fields.
 *    - `shopping_mall_product_variants` via `shopping_mall_product_variant_id` only if the response DTO requires variant details.
 *    - `shopping_mall_snapshots` via `seller_snapshot_id` to provide seller snapshot context.
 *    - If shipment context is needed by the response DTO, left join `shopping_mall_shipments` via `shopping_mall_shipment_id`.
 * 4) Authorization:
 *    - If requester is a customer/member: ensure the order belongs to them by checking `shopping_mall_orders.shopping_customer_id`.
 *    - If requester is a seller/member: ensure the order item seller snapshot context is readable for that seller (use snapshot seller linkage logic available via `shopping_mall_snapshots.source_seller_id` when present in the loaded schema).
 *    - If requester is an admin: allow.
 * 5) Deleted/visibility handling:
 *    - If the implementation requires hiding records with `deleted_at` in `shopping_mall_order_items`, treat them as not-found for this operation.
 * 6) Return a single response DTO matching `IShoppingMallOrderItem`.
 *
 * Edge cases:
 * - If joins for optional shipment exist: missing shipment record should not fail the read; it should simply reflect null/absence in the response DTO fields.
 * - If the order exists but is not readable due to authorization, return authorization error (not found is acceptable only if that is the system’s chosen security posture, but the service must remain consistent).
 * @path /shoppingMall/member/order-items/:orderItemId
 * @accessor api.functional.shoppingMall.member.order_items.at
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
     * Target order item ID to retrieve (UUID).
     */
    orderItemId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallOrderItem;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/member/order-items/:orderItemId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/member/order-items/${encodeURIComponent(props.orderItemId ?? "null")}`;
  export const random = (): IShoppingMallOrderItem =>
    typia.random<IShoppingMallOrderItem>();
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
      assert.param("orderItemId")(() => typia.assert(props.orderItemId));
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
 * Updates a specific purchased order item identified by `orderItemId`.
 *
 * This operation targets the `shopping_mall_order_items` table, which represents a single purchased line item within a customer order. The record includes the purchased product variant (`shopping_mall_product_variant_id`), the seller snapshot context for dispute resolution (`seller_snapshot_id`), the purchased quantity (`quantity`), the captured unit price at purchase (`seller_price_at_purchase`), the current workflow status stored as raw string (`line_item_status`), and timestamps such as `placed_at` and `updated_at`. The record can also be linked to a fulfillment shipment (`shopping_mall_shipment_id`) and may be removed from active views via `deleted_at`.
 *
 * Security and authorization are required because order items can affect fulfillment and refunds/cancellations. The service layer must verify that the caller is allowed to update this order item (e.g., the owning customer can only apply operations permitted to customers for order-item updates, while a seller or administrator must satisfy their role-specific boundaries). If the update requires special transitions (for example, administrative forced cancellation or forced refund), those transitions must follow the business rules so that the item status becomes the correct terminal state and no rule-breaking transition is applied.
 *
 * Validation and consistency rules:
 * - The `orderItemId` path parameter must resolve to an existing `shopping_mall_order_items` record.
 * - Updates must never create a contradictory workflow progression. Any requested `line_item_status` change must be validated against the allowed state transitions for order items.
 * - If the record is already in a later terminal state, the update must be rejected when the requested status transition would conflict.
 * - If the update would affect fulfillment linkage (such as setting/changing `shopping_mall_shipment_id`), the change must remain consistent with the shipment state.
 *
 * This operation is complementary to other order-item operations such as viewing order items (not defined here) and processing cancellation/refund request workflows. For forced administrative actions that set the final status (cancelled/refunded), the operation must also ensure the related inventory restoration behavior is handled consistently with cancellation/refund semantics.
 *
 * On success, the system returns the updated order item representation as defined by `IShoppingMallOrderItem`.
 *
 *
 * @param props.connection
 * @param props.orderItemId Target order item identifier (UUID).
 * @param props.body Update payload for the specified order item. Contains the fields that may be changed for this order item workflow.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps:
 * 1) Extract `orderItemId` from the path parameter.
 * 2) Authorization: determine caller actor context (customer/member/admin/seller) and verify they are allowed to update this `shopping_mall_order_items` record. Enforce ownership via the related `shopping_mall_orders` record when needed.
 * 3) Load the target record by id and ensure it is not marked removed for active views (respect `deleted_at` semantics used by the system).
 * 4) Parse request body as `IShoppingMallOrderItem.IUpdate`.
 * 5) Validate incoming fields:
 *    - If `line_item_status` is present/changed: validate allowed status transition(s) for order item workflow.
 *    - If `quantity` or `seller_price_at_purchase` are provided for update: only allow if business rules permit editing; otherwise reject.
 *    - If `shopping_mall_shipment_id` is provided/changed: validate consistency with the shipment workflow state.
 * 6) Special rule handling:
 *    - For administrator forced cancellation/refund requests (when the update intent corresponds to those actions), translate/validate to the correct terminal `line_item_status` value (cancelled or refunded) and ensure inventory restoration and status-compatibility rules are satisfied.
 * 7) Perform the update inside a transaction:
 *    - Update fields on `shopping_mall_order_items`.
 *    - Update `updated_at` automatically via application or DB default.
 * 8) Re-read the updated record and map to `IShoppingMallOrderItem`.
 * 9) Return the response.
 *
 * Edge cases and errors:
 * - 404 if the order item does not exist.
 * - 403 if caller lacks permission for this order item.
 * - 400/409 when requested transitions are incompatible with current `line_item_status` or when business validation fails.
 *
 * @path /shoppingMall/member/order-items/:orderItemId
 * @accessor api.functional.shoppingMall.member.order_items.update
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
     * Target order item identifier (UUID).
     */
    orderItemId: string & tags.Format<"uuid">;

    /**
     * Update payload for the specified order item. Contains the fields that may be changed for this order item workflow.
     */
    body: IShoppingMallOrderItem.IUpdate;
  };
  export type Body = IShoppingMallOrderItem.IUpdate;
  export type Response = IShoppingMallOrderItem;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/member/order-items/:orderItemId",
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
    `/shoppingMall/member/order-items/${encodeURIComponent(props.orderItemId ?? "null")}`;
  export const random = (): IShoppingMallOrderItem =>
    typia.random<IShoppingMallOrderItem>();
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
      assert.param("orderItemId")(() => typia.assert(props.orderItemId));
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
 * Permanently removes the specified purchased order item.
 *
 * This operation is intended for member/customer or privileged back-office flows to erase a single order-item record identified by `orderItemId`. The system must enforce authorization boundaries so that a member can only remove order items they own, and it must reject the request when the actor is unauthenticated or not permitted.
 *
 * When an order item is removed, the system must preserve immutable historical truth used for dispute resolution and audit. If the order item is linked to snapshot records that represent historical states, those snapshot records must not be deleted or altered. Additionally, the operation must keep referential integrity consistent with existing database relationships; the removal should fail safely (without changing existing data) when constraints would be violated or the removal would create an invalid state.
 *
 * On successful deletion, the API returns no response body.
 *
 * @param props.connection
 * @param props.orderItemId Identifier of the order item to remove.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement delete handler for shopping_mall_order_items by PK `id`.
 *
 * Steps:
 * 1) Parse and validate `orderItemId` as UUID.
 * 2) Fetch the target `shopping_mall_order_items` row by `id`.
 *    - If not found, return 404.
 * 3) Authorization:
 *    - Determine actor identity and permitted scope.
 *    - If the current actor is a customer, verify they own the parent `shopping_mall_orders` via `shopping_mall_order_items.shopping_mall_order_id -> shopping_mall_orders.shopping_customer_id`.
 *    - Apply admin/seller boundaries per system permission matrix.
 *    - If unauthorized, return 403/404 as appropriate.
 * 4) Business rule checks:
 *    - Validate that removing this order item does not conflict with cancellation/refund workflow and shipment grouping.
 *    - If the line item status transition would be contradictory, reject.
 * 5) Data integrity:
 *    - Deleting the row must respect FK constraints to `shopping_mall_snapshots` (seller snapshot linkage) and related dependent rows (review, cancellation requests, refund requests, shipment link).
 *    - If the system uses soft deletion for active views, prefer setting `deleted_at` on `shopping_mall_order_items` instead of physical removal when the table supports it; however do not delete/alter immutable snapshot records.
 * 6) Execute deletion/update in a transaction.
 * 7) Return success with no response body.
 *
 * Error handling:
 * - Validation errors: 400
 * - Not found: 404
 * - Unauthorized/forbidden: 403
 * - Status/workflow conflicts: 409
 * - Unexpected failures: 500
 * @path /shoppingMall/member/order-items/:orderItemId
 * @accessor api.functional.shoppingMall.member.order_items.erase
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
     * Identifier of the order item to remove.
     */
    orderItemId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/member/order-items/:orderItemId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/member/order-items/${encodeURIComponent(props.orderItemId ?? "null")}`;
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
      assert.param("orderItemId")(() => typia.assert(props.orderItemId));
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
