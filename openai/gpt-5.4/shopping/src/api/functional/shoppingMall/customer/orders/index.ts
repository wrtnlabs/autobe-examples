import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallOrder } from "../../../../structures/IPageIShoppingMallOrder";
import { IShoppingMallOrder } from "../../../../structures/IShoppingMallOrder";

export * as addressSnapshots from "./addressSnapshots/index";
export * as items from "./items/index";

/**
 * Retrieve a filtered and paginated list of preserved customer orders.
 *
 * This operation provides order-history browsing over the records stored in shopping_mall_orders, the immutable customer order header table that preserves the top-level commercial transaction record created after successful payment. Each returned result represents a historical purchase record identified by its business order number, current overall lifecycle status, total charged price, and creation timestamps. In line with the order preservation requirements, these records remain available as business records after creation and are not removed as part of ordinary customer account changes.
 *
 * For customer use, this endpoint is intended to show the signed-in customer's own order history. The implementation must enforce ownership-based visibility so a customer can browse only orders belonging to that customer account. The same underlying order data model also supports administrative oversight, because administrators are allowed to inspect platform-wide order records, but such broader access must still be controlled by the authorization layer rather than exposed by weakening ownership checks for ordinary customers.
 *
 * The operation is related to several preserved subordinate records. Shipping destination information is not taken from a live saved address book entry at read time; instead, order delivery context is preserved separately in shopping_mall_order_address_snapshots, whose recipient name, phone number, street address, city, state or province, postal code, and country reflect the exact checkout-time destination. The requirements explicitly state that this snapshot is immutable and remains independent from later edits, default changes, or deletion of saved shipping addresses. Likewise, line-item facts come from shopping_mall_order_items, and shipment progress may be derived from shopping_mall_shipments when shipment summaries are included for browsing.
 *
 * Because order-history browsing usually requires more than a simple unfiltered list, this endpoint accepts structured search criteria, pagination inputs, and sorting instructions in the request body. Typical filtering concerns include the globally unique order code, the current order status, creation date ranges, and other summary-level browsing options grounded in the order header schema. The response should remain optimized for list screens and summary views rather than replacing a dedicated single-order detail endpoint.
 *
 * If the request contains unsupported filters, invalid sort rules, or attempts to access orders outside the caller's authorized scope, the operation must reject the request without altering any preserved order, order item, shipment, or order-address snapshot records. Consumers that need complete line-level or shipment-level inspection for one specific order should first browse this list and then follow a dedicated single-order retrieval endpoint using the selected order identifier.
 *
 * @param props.connection
 * @param props.body Order search criteria and pagination options
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implement a paginated order-history query over
 *   shopping_mall_orders.
 *
 * Authenticate the caller and determine the visibility scope before querying. For a customer caller, constrain the base query to shopping_mall_orders.shopping_mall_customer_id equal to the authenticated customer's id and exclude records whose deleted_at is not null unless the platform's shared read policy explicitly requires otherwise. For an administrator caller, the same query structure may be executed without the customer ownership restriction to support platform-wide oversight. Do not allow an ordinary customer to broaden scope beyond their own orders.
 *
 * Accept an IShoppingMallOrder.IRequest body containing pagination, sorting, and supported summary-level filters. Supported filters should be derived only from loaded schema fields, such as exact or partial matching on code, filtering by status, and created_at date-range constraints. Apply deterministic ordering, with created_at descending as the default when the client does not specify a valid sort. Return results as IPageIShoppingMallOrder.ISummary.
 *
 * Build the list primarily from shopping_mall_orders and include only summary-safe projections needed by the response DTO. If the summary contract includes derived counts or shipment indicators, compute them through efficient joins or batched follow-up queries against shopping_mall_order_items and shopping_mall_shipments. If the summary includes delivery destination preview fields, source them from shopping_mall_order_address_snapshots, not from mutable saved shipping addresses. Preserve the semantic rule that the snapshot represents checkout-time delivery context and does not change after purchase.
 *
 * Do not perform any mutation in this operation. Validation failures, unsupported filters, malformed pagination inputs, or unauthorized scope expansion attempts must return errors and leave all preserved business records unchanged. Optimize for list browsing with indexed columns where available, especially shopping_mall_orders.shopping_mall_customer_id plus created_at, shopping_mall_orders.status plus created_at, and the unique order code when exact lookup is requested.
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
     * Order search criteria and pagination options
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
 * Retrieve the detailed information for a single preserved order record.
 *
 * This operation returns the full order detail view for one `shopping_mall_orders` record, which the domain defines as an immutable customer order header preserving the commercial transaction record created after successful payment. It is intended for use after a customer has identified an order from the order history list, where order history is paginated, sorted by newest first, and exposes summary fields such as order number, order date, total price, and overall order status. The detailed response expands that preserved record so the caller can understand what was purchased, where it was to be delivered, and how fulfillment was organized.
 *
 * Security for this operation is ownership-sensitive. A customer may retrieve only an order that belongs to that same customer account, reflecting the requirement that signed-in access is centered on the customer’s own account identity and preserved purchase history. Administrators may retrieve any order for platform-wide oversight because preserved orders remain available as business records for administrative inspection. The operation should reject access when the caller is neither the owning customer nor an authorized administrator.
 *
 * The response should be assembled from the preserved order model and its related historical records rather than from mutable live storefront data alone. In particular, order detail should reflect `shopping_mall_order_items`, the frozen delivery information stored in `shopping_mall_order_address_snapshots`, shipment grouping represented by `shopping_mall_shipments`, and purchase-time context from snapshot tables such as `shopping_mall_product_purchase_snapshots` and `shopping_mall_seller_profile_purchase_snapshots`. This is important because the requirements explicitly state that preserved orders continue to show the historical purchase information needed to understand what was bought, and historical shop context in past orders must continue to show the shop name and logo as they were at purchase time rather than being overwritten by later seller profile changes.
 *
 * This operation is commonly used after the list operation that exposes a customer’s order history. The order-history endpoint should be executed first when the caller needs to browse or locate a specific order, and then this detail endpoint should be called with the selected `orderId`. Within the returned detail, shipments associated with the order should be visible so customers can understand how items were grouped for delivery, including orders that contain multiple shipments across different sellers.
 *
 * Expected failures include an unknown order identifier, an access attempt to another customer’s order, or attempts to use an inactive or unauthorized identity. Errors affecting other profile operations must not alter the preserved order record, because the business requirements state that preserved orders and order history remain intact even when profile-related actions fail or when customer profile data is removed after account deletion.
 *
 * @param props.connection
 * @param props.orderId Target order's unique identifier
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implement a read-only service that loads a single row
 *   from `shopping_mall_orders` by its primary identifier and returns a fully
 *   assembled order detail DTO.
 *
 * Authorize the caller before returning data. If the authenticated actor is a customer, constrain the lookup so the order must belong to that customer account. If the authenticated actor is an administrator or super administrator, allow unrestricted lookup for oversight. Do not allow unrelated customers. Do not expose this endpoint as a general seller detail endpoint because seller visibility is item- and shipment-scoped and should be handled by separate seller-facing operations.
 *
 * Query the order header from `shopping_mall_orders`, then load its related `shopping_mall_order_items`, `shopping_mall_order_address_snapshots`, and `shopping_mall_shipments`. For each order item, load the related `shopping_mall_product_purchase_snapshots` and `shopping_mall_seller_profile_purchase_snapshots` so the response reflects purchase-time product and seller context. For each shipment, include the order items assigned to that shipment so the client can distinguish package composition, especially when one order contains shipments from multiple sellers. If tracking details are modeled separately in the response type, also resolve the shipment’s tracking relation.
 *
 * Preserve historical semantics in the mapping layer. When snapshot data exists, prefer snapshot-derived display fields for product and seller presentation in the order detail response rather than recalculating those fields solely from current live product or seller profile records. This ensures past orders continue to display understandable purchase context even if sellers rename shops, change logos, or alter catalog data after the transaction.
 *
 * Return a not-found error when no order matches the provided identifier within the caller’s authorization scope. Return a forbidden error when the identity is authenticated but not permitted to inspect the targeted order. The implementation must not modify any order, shipment, or snapshot record during retrieval. No transactional write behavior is needed beyond the consistency guarantees of the underlying read operations.
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
     * Target order's unique identifier
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
