import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallOrder } from "../../../../structures/IPageIShoppingMallOrder";
import { IShoppingMallOrder } from "../../../../structures/IShoppingMallOrder";

export * as items from "./items/index";

/**
 * Place a new order on the shopping mall platform.
 *
 * This operation creates a formal purchase record in the `shopping_mall_orders` table on behalf of the authenticated customer. The customer must supply a shipping address and specify the product variants they wish to purchase (referencing items from their cart). Upon successful order creation, each line item is persisted as a `shopping_mall_order_items` record, and an immutable `shopping_mall_order_item_snapshots` record is automatically generated for each item, capturing the exact product snapshot, variant SKU snapshot, and seller profile snapshot as they exist at the moment of purchase. These snapshots guarantee that the transaction history remains accurate and auditable even if the underlying product, variant, or seller profile is later modified or removed.
 *
 * The shipping address provided in the request is captured inline as a denormalized snapshot on the `shopping_mall_orders` record — fields such as `recipient_name`, `recipient_phone`, `shipping_address_line1`, `shipping_city`, `shipping_postal_code`, and `shipping_country` are stored directly and become immutable after the order is placed. Any subsequent edits or deletions of the customer's saved address entries have no effect on this captured delivery destination.
 *
 * The overall order `status` is a derived field initialized from the aggregate of all constituent order item statuses. Each order item begins with status `paid` once payment is confirmed. Valid lifecycle values for individual items are: `pending`, `paid`, `shipped`, `delivered`, `cancelled`, and `refunded`. The order-level status is recomputed automatically whenever any child item changes state and may be one of: `paid`, `shipped`, `delivered`, `cancelled`, `refunded`, or `partially_completed`.
 *
 * Access to this endpoint is restricted to authenticated customers. Only the authenticated customer can create orders on their own behalf. Guests, sellers, and administrators do not use this endpoint to place orders. If the customer account has been banned, the order creation request will be rejected.
 *
 * After successfully creating an order, the response returns the full order detail including all order items and their snapshots. Customers can subsequently track the status of individual items via `GET /shoppingMall/customer/orders/{orderId}/items/{orderItemId}` and view their full order list via `PATCH /shoppingMall/customer/orders`.
 *
 * @param props.connection
 * @param props.body Shipping address and list of product variants with quantities to purchase
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification 1. Authenticate the requesting customer via their JWT session. Reject the request with 401 if unauthenticated, or 403 if the account is banned (shopping_mall_customers.is_banned = true).
 *
 * 2. Validate the request body:
 *    - Shipping address fields (recipient_name, recipient_phone, shipping_address_line1, shipping_city, shipping_postal_code, shipping_country) must all be non-empty strings.
 *    - The items array must contain at least one entry.
 *    - Each item entry must reference a valid product_variant_id and a positive integer quantity.
 *
 * 3. For each requested order item:
 *    a. Look up the shopping_mall_product_variants record. If not found or the variant's product is deleted/not purchasable, reject the request.
 *    b. Check available inventory via shopping_mall_inventory_records. If insufficient stock, reject with an appropriate error indicating which variant is unavailable.
 *    c. Retrieve the latest shopping_mall_product_snapshots record for the variant's product (create one if not already current).
 *    d. Retrieve the matching shopping_mall_product_snapshot_skuses record for this variant from the snapshot.
 *    e. Retrieve the latest shopping_mall_seller_profile_snapshots for the variant's owning seller.
 *    f. Record the unit_price from the snapshot SKU.
 *
 * 4. Within a single database transaction:
 *    a. Create the shopping_mall_orders record with:
 *       - shopping_mall_customer_id = authenticated customer's id
 *       - status = 'paid' (assuming immediate payment confirmation)
 *       - total_price = sum of (unit_price × quantity) for all items
 *       - Shipping address fields copied from the request body
 *       - created_at and updated_at = now()
 *    b. For each item, create a shopping_mall_order_items record with:
 *       - shopping_mall_order_id = new order's id
 *       - shopping_mall_product_variant_id = the requested variant id
 *       - quantity = requested quantity
 *       - unit_price = from the snapshot SKU
 *       - status = 'paid'
 *       - created_at and updated_at = now()
 *    c. For each order item, create a shopping_mall_order_item_snapshots record with:
 *       - order_item_id = new order item's id
 *       - product_snapshot_id = the product snapshot id
 *       - product_snapshot_skus_id = the SKU snapshot id
 *       - seller_profile_snapshot_id = the seller profile snapshot id
 *       - created_at = now()
 *    d. Append inventory deduction records (shopping_mall_inventory_records) for each variant to reflect the consumed quantity.
 *    e. Optionally remove or mark as 'ordered' the corresponding shopping_mall_cart_items entries for the customer.
 *
 * 5. Return the fully constructed order record with nested order items and their snapshots.
 * @path /shoppingMall/customer/orders
 * @accessor api.functional.shoppingMall.customer.orders.create
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
     * Shipping address and list of product variants with quantities to purchase
     */
    body: IShoppingMallOrder.ICreate;
  };
  export type Body = IShoppingMallOrder.ICreate;
  export type Response = IShoppingMallOrder;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/customer/orders",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/customer/orders";
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
 * Retrieve a paginated and filtered list of orders placed on the shopping mall platform.
 *
 * For authenticated customers, this operation returns only the orders that belong to the requesting customer's account. Orders are sorted with the most recently placed orders appearing first by default, allowing customers to quickly review their latest purchases. Each order summary in the response includes the unique order identifier, the date the order was placed, the total monetary amount, and the overall derived order status.
 *
 * For administrators, this operation provides a platform-wide view of all orders regardless of which customer placed them. Administrators can apply the same search filters and pagination controls, enabling efficient oversight of orders across the entire platform. This is essential for order intervention workflows such as force-cancellation and force-refund operations.
 *
 * The overall `status` field on each order is a derived, cached value computed from the aggregate statuses of all constituent order items (stored in `shopping_mall_order_items`). Possible status values are `paid`, `shipped`, `delivered`, `cancelled`, `refunded`, and `partially_completed`. This value is automatically updated whenever any child order item changes state, reflecting the business rule that cancellation operates at the individual item level rather than the entire order level.
 *
 * Shipping address data is captured as a denormalized snapshot at the time of order placement and is immutable — subsequent changes to the customer's saved addresses have no effect on existing orders. The order list summary does not expose the full address snapshot; detailed address information is available through the single-order retrieval endpoint.
 *
 * Search filters support filtering by order status, date range (created_at window), and partial recipient name matching (powered by GIN trigram index on `recipient_name`). Pagination uses cursor-based or page-based navigation with configurable page sizes.
 *
 * Related operations: Use `GET /orders/{orderId}` to retrieve the complete detail of a specific order including all order items, shipment tracking, and full address snapshot.
 *
 * @param props.connection
 * @param props.body Search criteria and pagination parameters for filtering and browsing the order list
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification 1. Authenticate the requesting actor and determine their role (customer or admin).
 * 2. If the actor is a customer, add a WHERE clause filtering `shopping_mall_customer_id = <authenticated customer id>`.
 * 3. If the actor is an admin or superAdmin, no customer-scoping filter is applied — all orders are visible.
 * 4. Apply any additional filters from the request body:
 *    - `status`: exact match filter on the `status` column (string enum).
 *    - `createdAtFrom` / `createdAtTo`: range filter on `created_at`.
 *    - `recipientName`: partial text search using trigram similarity on `recipient_name` (GIN index available).
 * 5. Apply sorting — default is `created_at DESC` (most recent first). Support ascending order if requested.
 * 6. Apply pagination: compute OFFSET/LIMIT from page number and page size, or use cursor-based approach with `created_at` + `id` as composite cursor.
 * 7. Query `shopping_mall_orders` with JOINs as needed; return summary fields: id, status, total_price, created_at (for display as order date), and optionally recipient_name.
 * 8. Return paginated result with total count and page metadata wrapped in `IPageIShoppingMallOrder.ISummary`.
 * 9. Edge cases: if page is out of bounds, return empty data array with correct pagination metadata. If no orders match the filters, return empty data with pagination.
 * @path /shoppingMall/customer/orders
 * @accessor api.functional.shoppingMall.customer.orders.index
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
     * Search criteria and pagination parameters for filtering and browsing the order list
     */
    body: IShoppingMallOrder.IRequest;
  };
  export type Body = IShoppingMallOrder.IRequest;
  export type Response = IPageIShoppingMallOrder.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/customer/orders",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/customer/orders";
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
 * Retrieve the full details of a single order by its unique identifier.
 *
 * This endpoint returns a comprehensive view of an order record from the `shopping_mall_orders` table, including the denormalized shipping address snapshot captured at checkout time, the derived overall order status, the total price, and all associated order items. Each order item includes its independent lifecycle status, quantity, unit price, product variant reference, and the immutable `shopping_mall_order_item_snapshots` record that preserves the product name, description, variant options, and seller profile as they existed at the moment of purchase.
 *
 * Shipment information associated with the order items is also included in the response. Each `shopping_mall_shipments` record groups one or more order items dispatched by a single seller, and provides carrier name, tracking number, and delivery timestamps (`shipped_at`, `estimated_delivery_at`, `delivered_at`).
 *
 * Access to this endpoint is governed by strict authorization rules. A logged-in customer may only retrieve orders that belong to their own account — identified by matching the authenticated customer's ID against the order's `shopping_mall_customer_id` field. Any attempt to access an order belonging to a different customer is denied. Regular administrators (`admin`) and super administrators (`superAdmin`) have unrestricted access to all orders on the platform and may retrieve any order without customer ownership checks, supporting their oversight, dispute resolution, and platform management responsibilities.
 *
 * Order records are permanent and are never removed from the database, even after a customer deletes their account. Historical integrity is maintained through the immutable snapshots on child entities. This means an administrator will always be able to view the full order details including the snapshot data of what was purchased, at what price, and from which seller.
 *
 * Related operations: use `PATCH /orders` to list and search orders (customer's own orders or platform-wide for admins), and `GET /orders/{orderId}/items/{itemId}` to access a specific order item in isolation.
 *
 * @param props.connection
 * @param props.orderId The unique identifier (UUID) of the target order to retrieve.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification 1. Extract orderId from the path parameter and validate it as a valid UUID.
 * 2. Authenticate the caller — determine whether the requester is a customer, admin, or superAdmin based on the JWT session.
 * 3. Query shopping_mall_orders by id = orderId. If no record is found, return 404.
 * 4. Authorization check:
 *    - If the caller is a customer: verify that shopping_mall_orders.shopping_mall_customer_id matches the authenticated customer's ID. If not, return 403.
 *    - If the caller is an admin or superAdmin: no ownership check required; proceed.
 * 5. Load related data eagerly:
 *    - shopping_mall_order_items (all items for this order, ordered by created_at ascending).
 *    - For each order item: load shopping_mall_order_item_snapshots (1:1), and through the snapshot load references to shopping_mall_product_snapshots, shopping_mall_product_snapshot_skuses, and shopping_mall_seller_profile_snapshots.
 *    - shopping_mall_shipment_items and their parent shopping_mall_shipments for shipment tracking info.
 * 6. Compose the full order response DTO including: order metadata (id, status, total_price, created_at, updated_at), denormalized shipping address fields (recipient_name, recipient_phone, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country), the list of order items with their statuses, quantities, unit prices, snapshot details (product name, description, variant options, price, seller shop name), and shipment info per item.
 * 7. Return the composed IShoppingMallOrder DTO.
 * @path /shoppingMall/customer/orders/:orderId
 * @accessor api.functional.shoppingMall.customer.orders.at
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
     * The unique identifier (UUID) of the target order to retrieve.
     */
    orderId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallOrder;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/customer/orders/:orderId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/customer/orders/${encodeURIComponent(props.orderId ?? "null")}`;
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
