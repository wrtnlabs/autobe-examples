import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallShipment } from "../../../../../structures/IPageIShoppingMallShipment";
import { IShoppingMallShipment } from "../../../../../structures/IShoppingMallShipment";

export * as items from "./items/index";

/**
 * Create a new shipment for a specific order as an authenticated seller.
 *
 * This operation allows a seller to create a shipment record for one or more of their own order items within the specified order. A shipment (corresponding to the `shopping_mall_shipments` table) groups together a set of order items that will be physically dispatched together by the seller. The seller must provide logistics information including the carrier name and a tracking number — both fields are required and a shipment cannot be created without them. The seller may additionally provide an optional dispatch timestamp and an optional estimated delivery date.
 *
 * Only the seller who owns the products associated with the selected order items may create a shipment containing those items. The system enforces strict seller isolation: every order item included in the shipment must belong to a product owned by the authenticated seller. If any selected order item belongs to a different seller, the entire shipment creation request is rejected.
 *
 * All order items included in a shipment must have a current status of `paid`. Items that are in any other status (e.g., `pending`, `shipped`, `delivered`, `cancelled`, `refunded`) cannot be added to a new shipment. The system validates the status of each selected item before creating the shipment record.
 *
 * A shipment must contain at least one order item. Creating an empty shipment with no items is not allowed and will result in a rejection. The seller may group any number of their eligible `paid` items into a single shipment, or create multiple separate shipments for different subsets of their items — the grouping decision is at the seller's discretion.
 *
 * Because orders may contain items from multiple sellers, each seller is responsible for creating their own shipments independently. Items from different sellers are always dispatched in separate shipments and can never be combined into a single cross-seller shipment. This separation is enforced at the system level.
 *
 * Upon successful creation, the shipment record is immediately visible to the customer who placed the order, along with the carrier name and tracking number. The status of all included order items transitions from `paid` to `shipped`. The association between the shipment and its order items is stored in the `shopping_mall_shipment_items` junction table.
 *
 * To retrieve the list of eligible order items for a given order, use `GET /orders/{orderId}/items` beforehand to identify which items have `paid` status and belong to the authenticated seller.
 *
 * @param props.connection
 * @param props.orderId The UUID of the order for which the shipment is being created. Must be an existing order in the platform.
 * @param props.body Shipment creation payload containing logistics details (carrier name and tracking number, both required) and the list of order item IDs to include in this shipment.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Authenticate the request as a seller actor.
 *   Extract the authenticated seller's ID from the session. 2. Validate that
 *   the order identified by `orderId` exists in the `shopping_mall_orders`
 *   table. If not found, return 404. 3. Parse the request body to extract:
 *   carrier name, optional tracking_number, list of order item IDs to include,
 *   optional shipped_at timestamp, optional estimated_delivery_at timestamp. 4.
 *   Validate that at least one order item ID is provided. If the list is empty,
 *   return 400 (at least one item required). 5. Query
 *   `shopping_mall_order_items` for each provided order item ID, filtering by
 *   `shopping_mall_order_id = orderId`. Verify all items exist and belong to
 *   the specified order. 6. For each order item, join with
 *   `shopping_mall_product_variants` → `shopping_mall_products` to confirm the
 *   owning seller ID matches the authenticated seller's ID. If any item belongs
 *   to a different seller, reject the entire request with 403. 7. Verify that
 *   all selected order items have `status = 'paid'`. If any item has a
 *   different status, return 422 with details. 8. Check that none of the
 *   selected order items already have an entry in
 *   `shopping_mall_shipment_items` (each order item can belong to at most one
 *   shipment, enforced by the unique constraint on
 *   `shopping_mall_order_item_id`). If any item is already assigned to a
 *   shipment, return 409. 9. Within a database transaction: a. Insert a new
 *   record into `shopping_mall_shipments` with: `shopping_mall_order_id =
 *   orderId`, `shopping_mall_seller_id = authenticatedSellerId`, `carrier`,
 *   `tracking_number`, `shipped_at`, `estimated_delivery_at`, `created_at =
 *   now()`, `updated_at = now()`, `deleted_at = null`. b. Insert records into
 *   `shopping_mall_shipment_items` for each selected order item, linking each
 *   `shopping_mall_order_item_id` to the newly created shipment ID. c. Update
 *   each selected `shopping_mall_order_items` record: set `status = 'shipped'`,
 *   `updated_at = now()`. d. Recalculate and update the parent
 *   `shopping_mall_orders.status` based on the aggregate status of all order
 *   items. 10. Return the created shipment entity including its ID, carrier,
 *   tracking_number, timestamps, and the list of associated shipment items.
 * @path /shoppingMall/seller/orders/:orderId/shipments
 * @accessor api.functional.shoppingMall.seller.orders.shipments.create
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
          path: create.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * The UUID of the order for which the shipment is being created. Must be an existing order in the platform.
     */
    orderId: string & tags.Format<"uuid">;

    /**
     * Shipment creation payload containing logistics details (carrier name and tracking number, both required) and the list of order item IDs to include in this shipment.
     */
    body: IShoppingMallShipment.ICreate;
  };
  export type Body = IShoppingMallShipment.ICreate;
  export type Response = IShoppingMallShipment;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/seller/orders/:orderId/shipments",
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
    `/shoppingMall/seller/orders/${encodeURIComponent(props.orderId ?? "null")}/shipments`;
  export const random = (): IShoppingMallShipment =>
    typia.random<IShoppingMallShipment>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(props),
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
 * Retrieve a paginated list of shipments associated with a specific order.
 *
 * This operation allows authenticated customers and sellers to browse all shipments that have been created for a given order. Each shipment record represents a physical delivery package dispatched by a seller and contains logistics details including the carrier name, tracking number, dispatch timestamp, estimated delivery date, and confirmation of actual delivery.
 *
 * As described in the platform's shipment model, a single order may have multiple shipments — one per seller participating in the order, or more if a seller chose to split their items across multiple packages. Each shipment belongs to exactly one seller, and items from different sellers are always shipped separately. This endpoint returns all shipments for the given order regardless of which seller created them, so the customer gets a complete delivery picture.
 *
 * The response includes, per shipment, the list of order items bundled in that shipment. Customers can use the carrier name and tracking number to check real-time delivery status externally. Tracking information is visible to the customer as soon as the seller creates the shipment record.
 *
 * Access control is strictly enforced: a customer may only retrieve shipments for orders that belong to their own account. A seller may only view shipments belonging to their own seller account within the order. Any attempt to access shipments for an order that does not belong to the authenticated actor will be denied.
 *
 * This operation corresponds to the `shopping_mall_shipments` table, which records the carrier, tracking number, shipped_at, estimated_delivery_at, delivered_at, and the seller responsible. Associated order items are linked through the `shopping_mall_shipment_items` junction table. The `deleted_at` field on shipments is respected — only active (non-deleted) shipments are returned.
 *
 * Related operations:
 * - `GET /orders/{orderId}` should be used first to retrieve the order's basic details and verify ownership before listing its shipments.
 * - `POST /orders/{orderId}/shipments` (seller only) is used to create new shipments for the order.
 * - `PUT /orders/{orderId}/shipments/{shipmentId}/confirm` (customer) is used to confirm delivery of a specific shipment.
 *
 * @param props.connection
 * @param props.orderId The unique identifier (UUID) of the order whose shipments are being listed.
 * @param props.body Pagination and optional filtering criteria for the shipment list.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Extract the authenticated actor's identity
 *   (customer or seller) from the JWT session. 2. Look up the order by orderId
 *   in shopping_mall_orders. If not found, return 404. 3. Authorization check:
 *   - If actor is a customer: verify
 *   shopping_mall_orders.shopping_mall_customer_id matches the authenticated
 *   customer's ID. If not, return 403. - If actor is a seller: verify that at
 *   least one shipment in the order belongs to this seller
 *   (shopping_mall_shipments.shopping_mall_seller_id). If no association,
 *   return 403. 4. Query shopping_mall_shipments WHERE shopping_mall_order_id =
 *   orderId AND deleted_at IS NULL. - Apply pagination from the request body
 *   (page/limit). - Apply optional filters from request body: status filter (by
 *   checking delivered_at/shipped_at nullability), carrier filter, etc. - Order
 *   by created_at DESC by default. 5. For each shipment, join
 *   shopping_mall_shipment_items and their associated shopping_mall_order_items
 *   to produce the list of bundled order items. 6. Return paginated results
 *   with IPageIShoppingMallShipment.ISummary structure, including: - id,
 *   carrier, tracking_number, shipped_at, estimated_delivery_at, delivered_at,
 *   created_at, updated_at - seller summary (seller id) - list of order item
 *   summaries within the shipment 7. Edge cases: - Order with no shipments yet
 *   → return empty paginated result (not 404). - Deleted shipments (deleted_at
 *   IS NOT NULL) must be excluded. - Seller actor: return all shipments in the
 *   order (not just their own) if the requirement is customer-centric, or
 *   restrict to their own shipments if seller-centric. Since path is
 *   /orders/{orderId}/shipments without seller scoping, return all shipments
 *   for the order to any authorized actor.
 * @path /shoppingMall/seller/orders/:orderId/shipments
 * @accessor api.functional.shoppingMall.seller.orders.shipments.index
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
          path: index.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * The unique identifier (UUID) of the order whose shipments are being listed.
     */
    orderId: string & tags.Format<"uuid">;

    /**
     * Pagination and optional filtering criteria for the shipment list.
     */
    body: IShoppingMallShipment.IRequest;
  };
  export type Body = IShoppingMallShipment.IRequest;
  export type Response = IPageIShoppingMallShipment.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/seller/orders/:orderId/shipments",
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
    `/shoppingMall/seller/orders/${encodeURIComponent(props.orderId ?? "null")}/shipments`;
  export const random = (): IPageIShoppingMallShipment.ISummary =>
    typia.random<IPageIShoppingMallShipment.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(props),
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
 * Retrieve the full details of a specific shipment associated with a customer's order.
 *
 * This operation allows an authenticated customer to view detailed tracking and fulfillment information for a single shipment within one of their orders. Shipments are created by sellers to group and dispatch one or more order items from the same order. Each shipment record in `shopping_mall_shipments` contains the logistics carrier name, carrier-assigned tracking number, dispatch timestamp (`shipped_at`), estimated delivery timestamp (`estimated_delivery_at`), and actual delivery confirmation timestamp (`delivered_at`).
 *
 * The response includes the complete list of order items grouped in this shipment, sourced from the `shopping_mall_shipment_items` junction table. Each item is enriched with its snapshot data from `shopping_mall_order_item_snapshots`, capturing the product name, variant options, unit price, and seller profile as they existed at the time of purchase. This ensures customers can always view accurate purchase-time information regardless of subsequent product edits or deletions.
 *
 * Access is strictly scoped to the authenticated customer's own orders. The system verifies that the order identified by `orderId` belongs to the requesting customer, and that the shipment identified by `shipmentId` is associated with that order. If either check fails, the request is rejected. Customers cannot view shipments belonging to other customers' orders.
 *
 * Tracking information becomes available to the customer as soon as the seller creates the shipment record. Customers can use the provided carrier name and tracking number to check real-time delivery status externally.
 *
 * Note that an order may have multiple shipments — one per seller involved, or more if a seller chose to dispatch their items in multiple packages. Each shipment is tracked independently. Use `GET /orders/{orderId}` or related endpoints to view all shipments associated with an order.
 *
 * The shipment delivery status ('shipped' or 'delivered') is reflected through the `shipped_at` and `delivered_at` fields respectively. When a customer confirms delivery, the `delivered_at` timestamp is set and all order items in the shipment transition to 'delivered' status simultaneously.
 *
 * @param props.connection
 * @param props.orderId The UUID of the parent order. Must belong to the authenticated customer.
 * @param props.shipmentId The UUID of the specific shipment to retrieve. Must belong to the specified order.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Authenticate the calling user as a customer actor.
 *   2. Lookup the order by `orderId` in `shopping_mall_orders`. Verify that
 *   `shopping_mall_orders.shopping_mall_customer_id` matches the authenticated
 *   customer's ID. If not found or does not belong to the customer, return
 *   403/404. 3. Lookup the shipment by `shipmentId` in
 *   `shopping_mall_shipments`. Verify that
 *   `shopping_mall_shipments.shopping_mall_order_id` matches the `orderId` path
 *   parameter. If not found or mismatched, return 404. 4. Exclude records where
 *   `shopping_mall_shipments.deleted_at IS NOT NULL`. 5. Join
 *   `shopping_mall_shipment_items` on `shopping_mall_shipment_id = shipmentId`
 *   to get all shipment items. 6. For each shipment item, join
 *   `shopping_mall_order_items` on `shopping_mall_order_item_id` to retrieve
 *   item details (quantity, unit_price, status). 7. For each order item, join
 *   `shopping_mall_order_item_snapshots` to retrieve the product snapshot
 *   (`product_snapshot_id`), variant SKU snapshot (`product_snapshot_skus_id`),
 *   and seller profile snapshot (`seller_profile_snapshot_id`). 8. Optionally
 *   join `shopping_mall_product_snapshots` and
 *   `shopping_mall_product_snapshot_skuses` for product name and variant
 *   options. 9. Assemble and return a `IShoppingMallShipment` response object
 *   containing: - shipment id, carrier, tracking_number, shipped_at,
 *   estimated_delivery_at, delivered_at, created_at, updated_at - nested list
 *   of shipment items with order item details and snapshot information. 10.
 *   Handle edge cases: order not found, shipment not found, order not belonging
 *   to the customer, shipment not belonging to the order.
 * @path /shoppingMall/seller/orders/:orderId/shipments/:shipmentId
 * @accessor api.functional.shoppingMall.seller.orders.shipments.at
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
     * The UUID of the parent order. Must belong to the authenticated customer.
     */
    orderId: string & tags.Format<"uuid">;

    /**
     * The UUID of the specific shipment to retrieve. Must belong to the specified order.
     */
    shipmentId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallShipment;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/seller/orders/:orderId/shipments/:shipmentId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/seller/orders/${encodeURIComponent(props.orderId ?? "null")}/shipments/${encodeURIComponent(props.shipmentId ?? "null")}`;
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
      assert.param("orderId")(() => typia.assert(props.orderId));
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
 * Update the logistics details of an existing shipment within an order.
 *
 * This operation allows an authenticated seller to update the mutable logistics fields of a shipment they own — such as the carrier name, tracking number, estimated delivery date, and dispatch timestamp. The shipment must belong to an order identified by the `orderId` path parameter, and the specific shipment is identified by the `shipmentId` path parameter.
 *
 * The `shopping_mall_shipments` table records logistics metadata at the shipment level. The `carrier` field stores the name of the logistics provider (e.g., FedEx, UPS, DHL), and the `tracking_number` field holds the carrier-assigned tracking code that customers use to monitor delivery progress externally. These details are surfaced to the customer as soon as they are available on the shipment record, as required by the platform's shipment tracking visibility rules.
 *
 * Access control is strict: only the seller who owns the shipment (i.e., the seller associated via `shopping_mall_shipments.shopping_mall_seller_id`) is permitted to update it. If a seller attempts to update a shipment that belongs to another seller, the request is rejected. Similarly, if the specified shipment does not belong to the specified order, the request is rejected.
 *
 * The `shipped_at` timestamp represents when the seller physically dispatched the package. The `estimated_delivery_at` field captures the projected delivery date provided by the carrier or the seller. The `delivered_at` field is managed separately through the delivery confirmation workflow initiated by the customer and should not be set via this endpoint.
 *
 * Pre-requisites: The shipment must already exist (created via `POST /orders/{orderId}/shipments`) and must belong to the authenticated seller. Use `GET /orders/{orderId}/shipments/{shipmentId}` to retrieve the current state of the shipment before updating.
 *
 * @param props.connection
 * @param props.orderId The UUID of the parent order that this shipment belongs to.
 * @param props.shipmentId The UUID of the specific shipment to update.
 * @param props.body Updated logistics details for the shipment, including carrier name, tracking number, dispatch timestamp, and estimated delivery date.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Authenticate the requesting seller and extract
 *   their seller ID from the session. 2. Look up the order
 *   (shopping_mall_orders) by `orderId` path parameter. Return 404 if not
 *   found. 3. Look up the shipment (shopping_mall_shipments) by `shipmentId`
 *   path parameter. Return 404 if not found. 4. Verify that the shipment's
 *   `shopping_mall_order_id` matches the provided `orderId`. Return 404 if they
 *   do not match. 5. Verify that the shipment's `shopping_mall_seller_id`
 *   matches the authenticated seller's ID. Return 403 if the seller does not
 *   own this shipment. 6. Validate the request body fields: - `carrier`:
 *   Required non-empty string. - `tracking_number`: Optional string, may be
 *   null. - `shipped_at`: Optional ISO 8601 datetime string representing the
 *   actual dispatch time. - `estimated_delivery_at`: Optional ISO 8601 datetime
 *   string for the projected delivery date. 7. Update the
 *   shopping_mall_shipments record with the provided field values and set
 *   `updated_at` to the current timestamp. 8. Do NOT update `delivered_at`
 *   through this endpoint — that field is managed by the customer delivery
 *   confirmation flow. 9. Fetch the updated shipment record, including its
 *   associated shipment items (shopping_mall_shipment_items joined with
 *   shopping_mall_order_items). 10. Return the full updated
 *   IShoppingMallShipment entity as the response.
 * @path /shoppingMall/seller/orders/:orderId/shipments/:shipmentId
 * @accessor api.functional.shoppingMall.seller.orders.shipments.update
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
     * The UUID of the parent order that this shipment belongs to.
     */
    orderId: string & tags.Format<"uuid">;

    /**
     * The UUID of the specific shipment to update.
     */
    shipmentId: string & tags.Format<"uuid">;

    /**
     * Updated logistics details for the shipment, including carrier name, tracking number, dispatch timestamp, and estimated delivery date.
     */
    body: IShoppingMallShipment.IUpdate;
  };
  export type Body = IShoppingMallShipment.IUpdate;
  export type Response = IShoppingMallShipment;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/seller/orders/:orderId/shipments/:shipmentId",
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
    `/shoppingMall/seller/orders/${encodeURIComponent(props.orderId ?? "null")}/shipments/${encodeURIComponent(props.shipmentId ?? "null")}`;
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
      assert.param("orderId")(() => typia.assert(props.orderId));
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
 * Remove a shipment record from the specified order by marking it as deleted.
 *
 * This operation allows a seller to retract a shipment they previously created for a given order. Only the seller who owns the shipment is permitted to perform this action — a seller cannot delete shipments belonging to another seller's products. Administrators may also perform this operation as part of platform oversight.
 *
 * The underlying `shopping_mall_shipments` table uses a `deleted_at` timestamp column to record the moment of deletion. When this operation succeeds, `deleted_at` is set to the current timestamp, effectively hiding the shipment from active listings while preserving its historical record in the database.
 *
 * The shipment being deleted must belong to the specified order (`orderId`). If the `shipmentId` does not correspond to a shipment within that order, the request is rejected. Cross-seller access is strictly forbidden: if the authenticated seller is not the owner of the shipment, the system denies the request.
 *
 * Deleting a shipment does not automatically revert the status of the associated order items. Any order items that were previously assigned to this shipment via the `shopping_mall_shipment_items` junction table will lose their shipment assignment. Depending on the platform's post-sale business rules, administrators or sellers may need to re-assign those items to a new shipment as appropriate.
 *
 * This operation depends on a prior call to `GET /shoppingMall/seller/orders/{orderId}/shipments/{shipmentId}` to inspect the shipment's current state before performing deletion. Sellers should ensure there are no delivery-confirmed items in the shipment before retracting it.
 *
 * @param props.connection
 * @param props.orderId The UUID of the parent order to which the shipment belongs.
 * @param props.shipmentId The UUID of the shipment to be deleted.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Authenticate the requesting actor (seller or
 *   admin). Extract their identity from the JWT session. 2. Look up the
 *   shipment by shipmentId in shopping_mall_shipments. Verify that
 *   shopping_mall_order_id matches the provided orderId — if not, return 404.
 *   3. If the actor is a seller, verify that shopping_mall_seller_id on the
 *   shipment matches the authenticated seller's ID. If not, return 403
 *   Forbidden. 4. Check that deleted_at is currently null. If it is already
 *   set, the shipment is already deleted — return 404 or 409 as appropriate. 5.
 *   Set deleted_at = current timestamp (NOW()) and update updated_at on the
 *   shipment record using a single UPDATE query. 6. Return the updated shipment
 *   record with deleted_at populated to confirm the operation. 7. Edge case: if
 *   the shipment has delivered_at set (delivery was already confirmed),
 *   consider whether the platform policy allows deletion. If it does not,
 *   return 422 Unprocessable Entity with an appropriate message. 8. No
 *   cascading hard-delete on shopping_mall_shipment_items is performed — those
 *   records remain, but the shipment is logically removed from active views.
 * @path /shoppingMall/seller/orders/:orderId/shipments/:shipmentId
 * @accessor api.functional.shoppingMall.seller.orders.shipments.erase
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
     * The UUID of the parent order to which the shipment belongs.
     */
    orderId: string & tags.Format<"uuid">;

    /**
     * The UUID of the shipment to be deleted.
     */
    shipmentId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/seller/orders/:orderId/shipments/:shipmentId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/seller/orders/${encodeURIComponent(props.orderId ?? "null")}/shipments/${encodeURIComponent(props.shipmentId ?? "null")}`;
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
