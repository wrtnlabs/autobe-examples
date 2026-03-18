import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IShoppingMallOrder } from "../../../../../structures/IShoppingMallOrder";

/**
 * Admin oversight operation to force-cancel or force-refund orders via the order overview screen.
 *
 * This endpoint is designed for administrators to apply governance actions to customer orders and the corresponding purchased line items. Business behaviors covered by this operation align with the platform requirement that administrators can:
 * - Force-cancel an individual order item, resulting in the order item line_item_status being updated to the cancelled outcome and triggering the corresponding refund/inventory restoration outcomes.
 * - Force-cancel an entire order, resulting in cancellation being applied to all order items within that order.
 * - Force-refund an individual order item, resulting in the order item line_item_status being updated to the refunded outcome and triggering inventory restoration.
 * - Force-refund an entire order, resulting in refund being applied consistently to all relevant order items in that order.
 *
 * The operation acts on the underlying shopping_mall_orders and shopping_mall_order_items records. The administrator-targeted outcomes must preserve snapshot trail integrity: when order-item outcomes are affected, the system must not retroactively modify existing snapshot histories; instead, if a new record of decision is required, it must follow immutable snapshot principles and avoid creating conflicting multiple final decision records on retries. After any force action, the derived overall order status must remain consistent with the derived rules based on the updated shopping_mall_order_items statuses.
 *
 * Security and authorization: this operation must be accessible only to authenticated administrators. Requests from non-admin actors must be rejected.
 *
 * Expected behavior and error handling:
 * - Validate that the referenced order/items exist.
 * - Validate that the targeted item transitions are compatible with ordering of terminal states so that contradictory updates are rejected.
 * - Ensure that inventory restoration occurs for the affected shopping_mall_order_items' purchased variants (shopping_mall_order_items.shopping_mall_product_variant_id), and that other items not targeted by the force action are not modified automatically.
 *
 * Related operations that are typically used together:
 * - Order item and refund/cancellation request reads (to display current statuses in the admin UI) should be called before applying force actions so administrators can make an informed selection.
 *
 * Note: This endpoint is an oversight write action and therefore requires a request body describing the target and the desired admin force action.
 *
 * @param props.connection
 * @param props.body Administrator oversight request payload describing which order (and optionally which order items) to force-cancel or force-refund, including the desired outcome and any required context for the admin decision.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implementation steps:
 *
 * 1) Parse request body to determine oversight action type (force-cancel vs force-refund), scope (single order item vs entire order), and target identifiers (orderId and/or orderItemId(s) as provided by the request DTO).
 *
 * 2) Authorization:
 * - Verify caller has administrator privileges.
 *
 * 3) Load targets:
 * - Always load shopping_mall_orders by id.
 * - For item-scoped actions, load shopping_mall_order_items by id and ensure shopping_mall_order_items.shopping_mall_order_id matches the provided order.
 * - For order-scoped actions, load all shopping_mall_order_items where shopping_mall_order_id equals the provided order id.
 *
 * 4) Validate status transition compatibility:
 * - For each targeted shopping_mall_order_items record, verify that updating shopping_mall_order_items.line_item_status to the corresponding final outcome does not conflict with existing later terminal outcomes.
 * - If any targeted item would break ordering of statuses, reject the operation (or follow the business rule for partial failure if specified by DTO/logic).
 *
 * 5) Apply force outcome (transactional):
 * - For each targeted order item:
 *   a) Update shopping_mall_order_items.line_item_status to the final cancelled/refunded outcome.
 *   b) Insert/update associated workflow records only if required by the domain rules (e.g., cancellation_requests/refund_requests) so that admin decisions are auditable; do not create conflicting duplicate final decision records on retry.
 *   c) Restore inventory stock quantities for shopping_mall_order_items.shopping_mall_product_variant_id according to the force-cancel/refund inventory restoration behavior.
 *   d) Preserve snapshot trail integrity by not altering existing snapshot records; create new immutable snapshot decision records only if required and only once per final outcome.
 *
 * - After updating items, recompute/ensure derived order status consistency based on the updated shopping_mall_order_items statuses (as required by business rules).
 *
 * 6) Shipment and fulfillment consistency:
 * - If the targeted items belong to a shopping_mall_shipments record, ensure that resulting statuses remain consistent with shipment state visibility rules; do not modify other shipments/items outside the target scope.
 *
 * 7) Return response:
 * - Return an updated order representation or order summary view that reflects the latest overall order status and targeted item statuses.
 *
 * Edge cases:
 * - Soft-deleted shopping_mall_orders or shopping_mall_order_items must be handled according to existing query/view rules.
 * - Retried requests must be idempotent in terms of final outcome and snapshot trail: avoid creating multiple conflicting final decision artifacts.
 * @path /shoppingMall/admin/admin/orders
 * @accessor api.functional.shoppingMall.admin.admin.orders.processAdminOrderOversight
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function processAdminOrderOversight(
  connection: IConnection,
  props: processAdminOrderOversight.Props,
): Promise<processAdminOrderOversight.Response> {
  return true === connection.simulate
    ? processAdminOrderOversight.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...processAdminOrderOversight.METADATA,
          path: processAdminOrderOversight.path(),
          status: null,
        },
        props.body,
      );
}
export namespace processAdminOrderOversight {
  export type Props = {
    /**
     * Administrator oversight request payload describing which order (and optionally which order items) to force-cancel or force-refund, including the desired outcome and any required context for the admin decision.
     */
    body: IShoppingMallOrder.IUpdate;
  };
  export type Body = IShoppingMallOrder.IUpdate;
  export type Response = IShoppingMallOrder.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/admin/admin/orders",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/admin/admin/orders";
  export const random = (): IShoppingMallOrder.ISummary =>
    typia.random<IShoppingMallOrder.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: processAdminOrderOversight.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: processAdminOrderOversight.path(),
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
 * Retrieve a single order by identifier for administrative oversight.
 *
 * This endpoint is intended for administrators who need to inspect a specific customer order across the platform. It returns the core order header information (including the customer reference and payment linkage) as well as the order’s current state details required to perform order-level investigations and item-level follow-up actions. The returned data is aligned with the persisted fields in `shopping_mall_orders` such as `order_code`, ship-to contact fields captured at placement time (`ship_to_name`, `ship_to_phone`, `ship_to_postal_code`, `ship_to_region`, `ship_to_city`, `ship_to_street_address`, `ship_to_detail_address`), and timestamps (`placed_at`, `created_at`, `updated_at`).
 *
 * For order-item level oversight (e.g., viewing each purchased line item’s `line_item_status`, or coordinating cancellation/refund decisions), administrators typically use this endpoint as the starting point to locate the target order and then follow up with item-focused operations based on the order’s `orderItems` relationship to `shopping_mall_order_items`. This endpoint itself does not perform any cancellation/refund logic; it only reads order data.
 *
 * Security and authorization: this operation must be restricted to authenticated administrator actors. Requests from guests or non-administrator members must be rejected with an authorization failure, consistent with the platform’s administrative access restriction rules.
 *
 * Soft-deleted records: because `shopping_mall_orders` includes a `deleted_at` column used to hide orders from normal queries while preserving dispute history, the service implementation should apply the system’s active-record filtering policy for administrative reads (i.e., it must only return orders that the administrative actor is allowed to inspect, based on the `deleted_at` handling used across the service).
 *
 * Error handling: if the provided `orderId` does not correspond to an accessible order, return a not-found response. If the caller lacks administrator privileges, return an authorization failure response. Unexpected database errors should return a generic server error.
 *
 * @param props.connection
 * @param props.orderId Target order identifier to inspect (UUID).
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement admin-only order detail retrieval.
 *
 * 1) Authorization
 * - Require administrator privileges before accessing any order data.
 *
 * 2) Input
 * - Read `orderId` from path.
 *
 * 3) Data access
 * - Query `shopping_mall_orders` by `id = orderId`.
 * - Join/load associated entities only as required for the DTO `IShoppingMallOrder` response shape (commonly the order items via `shopping_mall_orders.orderItems`, and shipment/payment relations depending on how the DTO is defined in components).
 * - Respect the `deleted_at` behavior consistently with other admin read operations: only return orders that the admin is allowed to view (implementation should follow the established repository/query filters for administrative scopes).
 *
 * 4) Consistency checks
 * - If the record exists but is not viewable due to access policy (e.g., deleted visibility rules), treat as not-found for the caller.
 *
 * 5) Response
 * - Return the mapped DTO `IShoppingMallOrder`.
 *
 * 6) Errors
 * - Not found: return 404 when no accessible order matches.
 * - Authorization failure: return 401/403 per platform convention.
 * - Internal error: return 500 for unexpected exceptions.
 *
 * No state changes occur; do not write to `shopping_mall_*` tables.
 * @path /shoppingMall/admin/admin/orders/:orderId
 * @accessor api.functional.shoppingMall.admin.admin.orders.at
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
     * Target order identifier to inspect (UUID).
     */
    orderId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallOrder;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/admin/admin/orders/:orderId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/admin/admin/orders/${encodeURIComponent(props.orderId ?? "null")}`;
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
 * Update a specific order under administrator oversight.
 *
 * This operation targets a single order identified by its UUID and allows administrators to apply an administrative decision that results in consistent order-item workflow outcomes. The system must ensure that any order-item status changes produced by this administrator action remain consistent with the derived order status rules and that the affected fulfillment and dispute-resolution records remain intact.
 *
 * An order (shopping_mall_orders) belongs to a member (shopping_mall_members) and is associated with a payment attempt (shopping_mall_payments). The order contains multiple order items (shopping_mall_order_items), each of which references a purchased product variant (shopping_mall_product_variants) and a seller snapshot captured at purchase time (shopping_mall_snapshots). Because order-item workflow state drives fulfillment and customer-visible history, administrator updates that change item outcomes must not arbitrarily alter unrelated items.
 *
 * When this administrator update represents an oversight decision such as forced cancellation or forced refund, the service must apply the corresponding outcomes to the relevant order items: set affected shopping_mall_order_items.line_item_status to the appropriate terminal state, restore inventory quantities for the purchased variant associated with each affected item, and recalculate the overall order status so it remains consistent with the updated item statuses. Administrator item-level actions must not automatically change other order items unless the request explicitly targets the entire order.
 *
 * This operation also must preserve snapshot trail integrity for dispute resolution. If an administrator action affects order-item outcomes, the system must not retroactively modify existing snapshots; instead, it may create new snapshot records for the final decision transition while keeping snapshot immutability and ensuring retry safety (no conflicting multiple-final snapshots for the same final outcome).
 *
 * Authorization: only authenticated administrator actors are permitted to call this endpoint. If a non-administrator calls it, the system must reject with an authorization failure.
 *
 * Error handling: if the order does not exist, or the administrator update request would cause an invalid or contradictory order-item status transition (for example, conflicting terminal outcomes), the system must reject the request. When the update targets forced cancellation/refund behavior, the system must ensure eligibility/transition compatibility and return an error if the action would break ordering of statuses.
 *
 * Related operations: administrators can use dedicated force-action flows for order-item and entire-order oversight; this endpoint encapsulates the administrator update entry point for a specific orderId and should be used together with order viewing/inspection endpoints so the administrator can select the intended target outcome.
 *
 * @param props.connection
 * @param props.orderId UUID of the order to update (targeted by administrator oversight).
 * @param props.body Administrator update payload for the target order. The payload expresses the intended administrator decision and any permitted update fields, with side effects applied to associated order items and related workflow outcomes as required by business rules.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement PUT /admin/orders/{orderId} as an administrator-scoped order update.
 *
 * 1) Authenticate and authorize:
 * - Require an authenticated administrator actor.
 * - Enforce admin-only access boundary. Reject non-admin requests.
 *
 * 2) Load and validate target order:
 * - Fetch shopping_mall_orders by id = {orderId}.
 * - If not found (or hidden by deleted_at semantics as applicable in the service layer), return a not-found error.
 *
 * 3) Validate request payload semantics:
 * - Parse body as IShoppingMallOrder.IUpdate.
 * - Validate that only allowed fields/intent variants for administrator updates are accepted.
 * - If the update request carries an administrative force decision intent (e.g., cancel/refund outcomes), validate eligibility/transition compatibility for order items using shopping_mall_order_items.line_item_status and business rules (reject contradictory terminal transitions).
 *
 * 4) Transactional updates (single DB transaction):
 * - If update affects the entire order outcome:
 *   - Iterate over shopping_mall_order_items where shopping_mall_order_id = {orderId} and not deleted_at (if filtered by active views in service).
 *   - For each targeted item, update line_item_status to the requested terminal state.
 *   - Apply the corresponding side-effects required by the business flow:
 *     - For cancellation outcomes: restore inventory for shopping_mall_product_variants referenced by shopping_mall_order_items.shopping_mall_product_variant_id.
 *     - For refund outcomes: restore inventory similarly.
 *   - Do not change items not targeted by the request.
 * - If update affects a specific subset (if the DTO supports item targeting): apply changes only to explicitly targeted item ids, leaving other items unchanged.
 *
 * 5) Recalculate derived order status:
 * - After item updates, recompute the overall order status according to derived status rules (implemented in service layer from the updated shopping_mall_order_items statuses).
 * - Persist any order-level status representation available in shopping_mall_orders (only if such a column exists in the schema; otherwise keep order header consistent with item-derived behavior).
 *
 * 6) Snapshot trail integrity:
 * - Ensure any snapshot records required to record the final decision are created without modifying existing snapshot records.
 * - If the same oversight action is retried, ensure the system avoids creating multiple conflicting final snapshots for the same final outcome.
 *
 * 7) Response:
 * - Return the updated order representation as IShoppingMallOrder.
 *
 * 8) Edge cases:
 * - Reject invalid status transitions for order items already in a later terminal state.
 * - Ensure idempotency where appropriate for retries, using existing snapshots and workflow status checks to prevent conflicting transitions.
 * @path /shoppingMall/admin/admin/orders/:orderId
 * @accessor api.functional.shoppingMall.admin.admin.orders.update
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
     * UUID of the order to update (targeted by administrator oversight).
     */
    orderId: string & tags.Format<"uuid">;

    /**
     * Administrator update payload for the target order. The payload expresses the intended administrator decision and any permitted update fields, with side effects applied to associated order items and related workflow outcomes as required by business rules.
     */
    body: IShoppingMallOrder.IUpdate;
  };
  export type Body = IShoppingMallOrder.IUpdate;
  export type Response = IShoppingMallOrder;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/admin/admin/orders/:orderId",
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
    `/shoppingMall/admin/admin/orders/${encodeURIComponent(props.orderId ?? "null")}`;
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
 * Permanently removes an order record identified by {orderId} from the system for administrative cleanup and governance.
 *
 * This operation is available to administrators and addresses administrative use cases where an order must be removed from active records. The order is the customer-owned header stored in `shopping_mall_orders`, linked to its payment attempt via `shopping_mall_payments` and associated fulfillment groups via `shopping_mall_shipments`. The line items stored in `shopping_mall_order_items` represent the unit that can receive cancellation/refund requests and shipment assignment; removing the order also removes its associated line items and shipments in the database according to the configured relations.
 *
 * Security and authorization: only the `admin` actor can call this endpoint. The system must verify that the caller is authenticated as an administrator before performing any deletion.
 *
 * Data and relationship behavior: `shopping_mall_orders` belongs to `shopping_mall_members` (customer) and `shopping_mall_payments` (payment attempt), and has related `shopping_mall_order_items` and `shopping_mall_shipments`. `shopping_mall_order_items` belongs to a purchased product variant and references `seller_snapshot_id` from `shopping_mall_snapshots` for dispute resolution, and may also reference an optional `shopping_mall_shipments` row. `shopping_mall_shipments` groups order items per seller context inside the order. Implementations must delete these related rows in a single database transaction to avoid orphaned records.
 *
 * Snapshot trail integrity: administrative oversight actions must preserve snapshot history needed for dispute resolution and must not retroactively alter or remove snapshot trail entries required for prior states. Therefore, this operation must ensure that any snapshot trail data required for dispute resolution is not invalidated unintentionally by the cascade behavior. If the schema uses snapshots as separate records, deletion must either be disallowed when snapshots are required to remain viewable, or it must delete only the order-centric records while leaving snapshot records intact and reachable for dispute resolution.
 *
 * Expected behavior and error handling:
 * - If the order does not exist (or is already removed), the system returns an appropriate not-found error.
 * - If database constraints prevent deletion (for example, due to other required references), the system returns an error indicating the deletion could not be completed.
 *
 * Related operations you may use together:
 * - Administrative listing or retrieval endpoints for orders to confirm the target `orderId` before removal.
 * - Administrative force cancellation/refund operations at the order-item level, which must create final decision snapshots without creating conflicting snapshot history when retried; these are conceptually different from this permanent removal endpoint.
 *
 * @param props.connection
 * @param props.orderId Target order identifier to permanently remove.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implementation steps:
 * 1) Authorization: verify the caller has `admin` privileges.
 * 2) Load target order by `shopping_mall_orders.id = orderId`.
 *    - If not found, return not-found.
 * 3) Start a single database transaction.
 * 4) Deletion execution (order-centric):
 *    - Delete `shopping_mall_order_items` rows belonging to the order (where shopping_mall_order_id = orderId). These rows may have shipment linkage; ensure dependent shipment-item relations (via foreign keys/cascades) are satisfied.
 *    - Delete `shopping_mall_shipments` rows belonging to the order (where shopping_mall_order_id = orderId).
 *    - Delete the `shopping_mall_orders` row itself.
 *    - Because `shopping_mall_orders.shopping_payment_id` is uniquely constrained (`@@unique([shopping_payment_id])`) and linked to `shopping_mall_payments` with `onDelete` semantics defined in the Prisma schema, apply the cascade rules consistently: either allow payment deletion if configured, or avoid deleting payment if it is referenced elsewhere (implementation must follow the actual DB FK constraints).
 * 5) Snapshot trail integrity safeguards:
 *    - Before committing, ensure the cascade will not remove snapshot records required for dispute resolution. If snapshots are stored in `shopping_mall_snapshots` and are linked from order items by `seller_snapshot_id`, validate that foreign keys do not cascade-delete snapshot records. If snapshots would be removed, abort and return an error.
 * 6) Commit transaction and return no content (null response body).
 *
 * Edge cases:
 * - Order may already be soft-deleted (`shopping_mall_orders.deleted_at` not null). This endpoint must still deterministically remove the record; if the record is not present in active tables but exists in the DB, deletion should still proceed by primary key.
 * - Retried requests: ensure idempotency at the API level by treating already-removed targets as not-found or already-removed according to the standard error mapping used by the service.
 *
 * Database operations:
 * - Use a SELECT by primary key for the order.
 * - Use bulk DELETE operations for order items and shipments by foreign key.
 * - Delete the order row last (or rely on cascades but keep deterministic ordering if the service enforces it).
 * @path /shoppingMall/admin/admin/orders/:orderId
 * @accessor api.functional.shoppingMall.admin.admin.orders.erase
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
     * Target order identifier to permanently remove.
     */
    orderId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/admin/admin/orders/:orderId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/admin/admin/orders/${encodeURIComponent(props.orderId ?? "null")}`;
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
