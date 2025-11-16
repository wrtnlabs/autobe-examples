import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia, { tags } from "typia";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";

import { IShoppingMallOrder } from "../../../../structures/IShoppingMallOrder";
import { IPageIShoppingMallOrder } from "../../../../structures/IPageIShoppingMallOrder";
export * as sellerSegments from "./sellerSegments/index";
export * as addresses from "./addresses/index";
export * as lines from "./lines/index";
export * as statusEvents from "./statusEvents/index";
export * as cancellationRequests from "./cancellationRequests/index";
export * as returnRequests from "./returnRequests/index";
export * as disputes from "./disputes/index";
export * as search from "./search/index";
export * as fulfillments from "./fulfillments/index";
export * as shipments from "./shipments/index";

/**
 * Search and paginate orders from the `shopping_mall_orders` table.
 *
 * Search and retrieve a filtered, paginated list of orders from the
 * `shopping_mall_orders` table.
 *
 * This operation is built on the `shopping_mall_orders` Prisma model, whose
 * fields include business-facing identifiers and monetary snapshots such as
 * `order_code`, `currency_code`, `items_subtotal_amount`,
 * `discount_total_amount`, `shipping_total_amount`, `tax_total_amount`, and
 * `grand_total_amount`. It also uses lifecycle fields like `order_status`,
 * `payment_status`, `placed_at`, `confirmed_at`, `cancelled_at`,
 * `completed_at`, `created_at`, `updated_at`, and `deleted_at`. The
 * `order_code` column is uniquely indexed for human-friendly lookup, while
 * other composite indexes on `(shopping_mall_customer_id, created_at)`,
 * `(order_status, created_at)`, and `(payment_status, created_at)` support
 * common search patterns. The description comments in the schema emphasize that
 * this table stores immutable monetary snapshots taken at checkout time and
 * mutable lifecycle states that evolve as the order is processed.
 *
 * Clients send a JSON request body shaped by `IShoppingMallOrder.IRequest` to
 * express search criteria. Typical fields in this request DTO include page
 * number and page size, optional free-text or exact matching on `order_code`,
 * filters by `shopping_mall_customer_id`, lists of allowed `order_status` and
 * `payment_status` values, and date range filters targeting either `placed_at`
 * or `created_at`. Implementations must always apply a default filter that only
 * includes orders where `deleted_at` is null, thereby hiding logically removed
 * records from normal administrative views while still preserving them at the
 * database level. Sorting options should leverage the Prisma indexes, for
 * example defaulting to `created_at` or `placed_at` in descending order to show
 * the most recent orders first.
 *
 * The response body uses `IPageIShoppingMallOrder.ISummary`, a paginated
 * container composed of pagination metadata (such as total count, page size,
 * and current page) and an array of order summary objects. Each summary should
 * expose the most relevant fields for list UIs: `order_code`, `currency_code`,
 * `order_status`, `payment_status`, subtotal/discount/shipping/tax/grand
 * totals, and key timestamps like `placed_at` and `created_at`. It may also
 * include lightweight customer context such as a denormalized customer display
 * name if modeled in the summary type. More detailed per-order information is
 * intentionally omitted here and should instead be retrieved via the detail
 * endpoint `GET /orders/{orderId}`.
 *
 * From a security perspective, this list endpoint should be restricted to
 * privileged back-office actors such as platform administrators or seller
 * support staff, because it exposes full order histories, monetary amounts, and
 * potentially customer-related information. Authorization should therefore
 * require an authenticated `platformAdmin` actor, with any finer-grained
 * role-based filtering implemented in business logic rather than via separate
 * endpoints. Rate limiting and maximum page sizes should be enforced to prevent
 * expensive unbounded scans over the `shopping_mall_orders` table.
 *
 * This operation is typically used together with the order detail retrieval
 * endpoint `GET /orders/{orderId}`. Clients first call this PATCH endpoint to
 * obtain a list of matching orders along with their identifiers and codes, then
 * select a specific order and call the detail endpoint to load the full entity
 * for investigation or manual processing. Errors should be reported
 * consistently: invalid filter combinations or malformed request bodies return
 * validation errors, while unexpected internal failures return generic 5xx
 * responses without leaking implementation details.
 *
 * @param props.connection
 * @param props.body Search criteria, pagination, and sorting parameters used to
 *   filter and list orders from `shopping_mall_orders`. Path-level context is
 *   not duplicated here.
 * @path /shoppingMall/platformAdmin/orders
 * @accessor api.functional.shoppingMall.platformAdmin.orders.index
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
     * Search criteria, pagination, and sorting parameters used to filter
     * and list orders from `shopping_mall_orders`. Path-level context is
     * not duplicated here.
     */
    body: IShoppingMallOrder.IRequest;
  };
  export type Body = IShoppingMallOrder.IRequest;
  export type Response = IPageIShoppingMallOrder.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/platformAdmin/orders",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/platformAdmin/orders";
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
 * Get detailed information for a single order from `shopping_mall_orders` by
 * its UUID id.
 *
 * Retrieve a single detailed order from the `shopping_mall_orders` table using
 * its UUID primary key.
 *
 * The `shopping_mall_orders` Prisma model represents master orders that
 * aggregate items across multiple sellers for a single customer. Its primary
 * key field `id` is a UUID stored in the `id` column and is exposed here as the
 * path parameter `orderId`. Other important fields include `order_code` (a
 * unique human-readable business code such as "ORD-20251114-0001"),
 * `currency_code` (ISO 4217 currency code like "USD" or "KRW"), monetary
 * snapshot fields (`items_subtotal_amount`, `discount_total_amount`,
 * `shipping_total_amount`, `tax_total_amount`, `grand_total_amount`), and
 * lifecycle status fields `order_status` and `payment_status` whose
 * descriptions clarify example values like `pending_payment`, `processing`,
 * `shipped`, `delivered`, `cancelled`, and `refunded`.
 *
 * When handling this endpoint, the implementation should query
 * `shopping_mall_orders` for the row whose `id` equals the supplied `orderId`
 * and where `deleted_at` is null so that logically removed orders are not
 * accidentally exposed through normal detail views. In addition to raw scalar
 * fields, the DTO `IShoppingMallOrder` may include projections of relations
 * such as the owning customer, referenced through `shopping_mall_customer_id`,
 * or the originating cart referenced through `shopping_mall_customer_cart_id`.
 * The schema comments emphasize that `placed_at` marks when the order was
 * successfully created after checkout, `confirmed_at` indicates readiness for
 * fulfillment, `cancelled_at` signals complete cancellation, and `completed_at`
 * denotes a successfully finished lifecycle beyond the return window.
 *
 * This operation is typically used in back-office tools by actors such as
 * platform administrators, finance or support staff, and possibly seller
 * support users when investigating problems with a specific order. As such, the
 * endpoint should be restricted to a `platformAdmin` actor to avoid leaking
 * detailed monetary and lifecycle data to unauthorized users. If the requested
 * `orderId` does not correspond to a visible record (for example, non-existent
 * UUID or a record with `deleted_at` set), the implementation should respond
 * with a 404-like error indicating that the order cannot be found. Validation
 * errors, such as malformed UUIDs in `orderId`, should result in 400-level
 * responses with clear messaging but without revealing internal details.
 *
 * @param props.connection
 * @param props.orderId UUID primary key of the target order in
 *   `shopping_mall_orders`. This must be a valid UUID string corresponding to
 *   the `id` column.
 * @path /shoppingMall/platformAdmin/orders/:orderId
 * @accessor api.functional.shoppingMall.platformAdmin.orders.at
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
     * UUID primary key of the target order in `shopping_mall_orders`. This
     * must be a valid UUID string corresponding to the `id` column.
     */
    orderId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallOrder;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/platformAdmin/orders/:orderId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/platformAdmin/orders/${encodeURIComponent(props.orderId ?? "null")}`;
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
 * Permanently delete a master order record from the shopping_mall_orders table
 * by ID.
 *
 * Permanently delete a master order entity from the shopping_mall_orders table
 * by its unique identifier.
 *
 * This operation targets the shopping_mall_orders Prisma model, which
 * represents customer-facing master orders created as the result of checkout
 * flows. The orderId path parameter is expected to be a UUID-formatted string
 * that uniquely identifies a row in shopping_mall_orders. On execution, the
 * service should look up the corresponding order and verify that it is eligible
 * for deletion under current business policies, considering obligations around
 * financial reconciliation, dispute handling, tax reporting, and regulatory
 * data retention.
 *
 * From an authorization perspective, access must be limited to platform-level
 * administrative actors, represented here as the platformAdmin role in
 * authorizationActors. Normal customers and sellers must never be allowed to
 * directly delete master order records. The implementation should also record
 * audit entries for any successful deletion, potentially in tables like
 * shopping_mall_admin_action_audits, to preserve an administrative trail even
 * after the order data is removed.
 *
 * When the deletion proceeds, the implementation must ensure referential
 * integrity by cleaning up or cascading dependent records such as related
 * seller segments, order lines, addresses, and status history entries. If the
 * specified orderId does not correspond to any existing record, the endpoint
 * should return a not-found error. If business or regulatory rules block
 * deletion, a conflict-style error should be returned describing why the
 * operation cannot be completed.
 *
 * @param props.connection
 * @param props.orderId Unique identifier of the target master order in the
 *   shopping_mall_orders table, typically a UUID-formatted primary key string.
 * @path /shoppingMall/platformAdmin/orders/:orderId
 * @accessor api.functional.shoppingMall.platformAdmin.orders.erase
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
     * Unique identifier of the target master order in the
     * shopping_mall_orders table, typically a UUID-formatted primary key
     * string.
     */
    orderId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/platformAdmin/orders/:orderId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/platformAdmin/orders/${encodeURIComponent(props.orderId ?? "null")}`;
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
