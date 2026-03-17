import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallOrderItem } from "../../../../../structures/IPageIShoppingMallOrderItem";
import { IShoppingMallOrderItem } from "../../../../../structures/IShoppingMallOrderItem";

export * as productPurchaseSnapshots from "./productPurchaseSnapshots/index";
export * as sellerProfilePurchaseSnapshots from "./sellerProfilePurchaseSnapshots/index";

/**
 * Retrieve a filtered and paginated list of order items that belong to a specific preserved order record.
 *
 * This operation supports the order detail experience for a confirmed purchase. In the shopping mall domain, an order is the formal purchase record created only after payment succeeds, and it remains preserved as historical commercial evidence after creation. The response therefore exposes the line-level purchase records within that order so the client can present what was bought, how each purchased item is progressing, and which item-level after-sales outcomes apply. This is especially important because cancellation and refund processing is defined at the order-item level rather than at the whole-order level.
 *
 * The operation is designed to help customers inspect a multi-item order in a structured way. When an order contains merchandise from different sellers, the returned order items can be correlated with shipment grouping so the client can explain how delivery is split across seller fulfillment packages. The requirements state that customers view shipments from the order detail screen and can distinguish separate shipments created by different sellers, while each shipment contains one or more same-seller items. For that reason, the order-item listing should be suitable for rendering shipment-related status and package membership together with preserved purchase information.
 *
 * Access to this operation must respect ownership and oversight boundaries. A customer may retrieve only items belonging to that customer's own order. Administrators may retrieve items for any order as part of platform-wide order oversight, because administrators can inspect all preserved orders without changing their historical character. The operation is read-only and must not alter order records, shipment groupings, review history, or other preserved historical data.
 *
 * The returned records should reflect the historical purchase context of each line item, not merely current catalog state. Order items in this platform are tied to purchase-time preserved information such as product purchase snapshots and seller profile purchase snapshots so that later catalog or profile changes do not rewrite past order history. Any item-level cancellation or refund outcome shown by the API must remain scoped to the affected item only, leaving sibling items in the same order unaffected.
 *
 * This operation is commonly used after the client has already identified the target order from an order list or order detail navigation flow. It complements shipment-detail and after-sales interfaces by giving the client the item-level baseline needed to present fulfillment progress, seller grouping, and per-item issue outcomes inside a single preserved order context.
 *
 * @param props.connection
 * @param props.orderId Target preserved order identifier
 * @param props.body List filtering, sorting, and pagination options for order items within the target order
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Validate that the caller is authenticated as either the customer who owns the target order or an administrator with platform oversight authority.
 *
 * Load the target order by its identifier and verify that it exists as a preserved confirmed purchase record. If the caller is a customer, enforce ownership by matching the order's customer account to the authenticated principal. If the caller is an administrator, allow cross-platform read access without modifying any data.
 *
 * Query order items belonging only to the specified order. Never broaden the query to other orders, and never interpret the request as an order-wide cancellation or refund action because business rules define cancellation and refund scope strictly per item. Apply request-body search options, pagination, and sorting to the order-item dataset within this order boundary only.
 *
 * Join or include the related shipment association so the response can support order-detail shipment presentation. If an order item belongs to a shipment, expose enough item detail for the DTO mapper to include shipment linkage and shipped-state presentation. Preserve the same-seller fulfillment semantics already established by shipment creation logic; this endpoint only reads those results. Also include purchase-time snapshot relations needed for stable historical display, such as the product purchase snapshot and seller profile purchase snapshot, so later catalog or seller profile changes do not distort past purchase information.
 *
 * Include item-level operational status and any relevant after-sales outcome references needed to render cancellation or refund results on the affected order item. Ensure these outcomes remain item-scoped and do not imply changes to sibling items.
 *
 * Return a paginated response mapped to summary DTOs optimized for order-detail item listing. If the order does not exist, return a not-found error. If the caller is not permitted to view the order, return a forbidden error. Invalid pagination or filtering input should be rejected before query execution. The operation must perform no writes, no status transitions, and no mutation of preserved order history.
 * @path /shoppingMall/customer/orders/:orderId/items
 * @accessor api.functional.shoppingMall.customer.orders.items.index
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
     * Target preserved order identifier
     */
    orderId: string & tags.Format<"uuid">;

    /**
     * List filtering, sorting, and pagination options for order items within the target order
     */
    body: IShoppingMallOrderItem.IRequest;
  };
  export type Body = IShoppingMallOrderItem.IRequest;
  export type Response = IPageIShoppingMallOrderItem.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/customer/orders/:orderId/items",
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
    `/shoppingMall/customer/orders/${encodeURIComponent(props.orderId ?? "null")}/items`;
  export const random = (): IPageIShoppingMallOrderItem.ISummary =>
    typia.random<IPageIShoppingMallOrderItem.ISummary>();
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
 * Retrieve the detailed record for one purchased order item inside a preserved customer order.
 *
 * This operation is used from the order detail experience after a customer opens an order from order history. The parent order is the immutable commercial transaction record stored in shopping_mall_orders, where the business-facing code is shown to customers and administrators for lookup and history display. The targeted line item is the shopping_mall_order_items record that represents one aggregated purchase of a specific product variant, including its quantity, captured unit price, responsible seller, current per-item lifecycle status, and delivery timestamp when applicable.
 *
 * The response is intended to preserve historical purchase understanding rather than re-read mutable catalog state. For that reason, the detailed item view should be assembled primarily from the purchase-time snapshot tables related to the order item. shopping_mall_product_purchase_snapshots preserves the frozen product name, product description, purchased SKU code, and effective unit price that the customer actually bought, while shopping_mall_seller_profile_purchase_snapshots preserves the seller shop name and logo URI that were visible at purchase time. This allows the order item detail view to remain accurate even if the seller later edits catalog content, changes storefront presentation, suspends operations, or removes the original listing.
 *
 * When shipment data exists, the operation should expose the shipment created for the order item through shopping_mall_shipments and the associated tracking details from shopping_mall_tracking_infos. This reflects the requirement that customers can view shipments associated with an order, distinguish separate packages when different sellers are involved, and understand which order items were grouped into each package. Because a shipment belongs to one order and one seller and only same-seller items may be grouped together, the shipment information returned here explains the fulfillment context of the selected item without implying that all items in the order share the same package.
 *
 * The operation should also surface any current after-sales workflow state that belongs specifically to the selected item. shopping_mall_cancellation_requests and shopping_mall_refund_requests each exist at most once per order item and represent active request state such as customer reason, current review status, reviewer metadata, and latest decision note. This is important because cancellation and refund decisions are processed strictly at the order-item level. The endpoint must therefore describe only the selected item’s cancellation or refund outcome and must not aggregate or misrepresent the status of sibling items in the same order.
 *
 * Access to this operation must respect ownership and oversight boundaries. A customer may retrieve only items belonging to their own order history, while an administrator may retrieve any item for platform-wide order oversight. If the parent order code does not exist, if the item UUID does not exist, or if the item does not belong to the specified order, the operation should fail rather than leak information across orders. If the caller is a customer and the order is not owned by that customer, the system must reject access. Clients typically reach this endpoint after listing orders from the order-history API and opening a specific order detail view, where this per-item detail call provides the most granular purchase, fulfillment, and after-sales context.
 *
 * @param props.connection
 * @param props.orderCode Business order number of the preserved order record (global scope)
 * @param props.itemId Unique identifier of the order item within the specified order
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implement a read-only detail query for a single order item under a specific preserved order.
 *
 * 1. Resolve the parent order by shopping_mall_orders.code using the orderCode path parameter. Do not resolve the parent order by UUID for this endpoint. Reject the request if no order exists for the supplied code.
 *
 * 2. Apply authorization before returning data. For customer callers, verify that shopping_mall_orders.shopping_mall_customer_id matches the authenticated customer identity. For administrator callers, allow platform-wide access. Do not allow seller access through this customer-order resource because seller shipment scope is handled through seller-specific workflows rather than customer order history browsing.
 *
 * 3. Query shopping_mall_order_items by id and shopping_mall_order_id together, ensuring the selected item belongs to the resolved order. Reject the request if the item does not exist or if it exists under a different order. This scoped lookup is required because cancellation and refund handling is per-item and must not be confused with whole-order actions.
 *
 * 4. Eager-load the related historical and operational context needed for a complete response: shopping_mall_product_purchase_snapshots, shopping_mall_seller_profile_purchase_snapshots, shopping_mall_shipments, shopping_mall_tracking_infos, shopping_mall_cancellation_requests, and shopping_mall_refund_requests. When shipment exists, include shipment-level timestamps such as shipped_at, delivered_at, and auto_deliver_at, plus tracking fields carrier_name, tracking_number, and tracking_url. When cancellation or refund requests exist, include only the selected item's active request record and its current decision metadata.
 *
 * 5. Build the response DTO from immutable purchase snapshots first for customer-visible product and seller presentation fields. Use shopping_mall_order_items for transactional fields such as quantity, status, delivered_at, and the assigned shipment reference. Use shopping_mall_orders only for parent-order context that is part of the detailed item representation. Avoid re-deriving product display information from live catalog tables because historical order detail must remain stable after later product or seller edits.
 *
 * 6. Handle absent optional relations gracefully. A paid item may not yet have a shipment. An item may have neither a cancellation request nor a refund request. Tracking information should be returned only when a shipment exists and tracking has been recorded for that shipment. Nullability in the response must reflect these real workflow states.
 *
 * 7. Error handling: return not-found when the order code is unknown, when the item id is unknown, or when the item is not nested under the resolved order. Return forbidden when a customer attempts to access another customer's order item. Return success for preserved historical orders even if related live catalog entities were later changed or removed, as long as the purchase snapshots remain available.
 *
 * 8. No mutation, transaction, or status recalculation is performed by this endpoint. It is a pure retrieval operation intended for order-history detail inspection and administrative oversight.
 * @path /shoppingMall/customer/orders/:orderCode/items/:itemId
 * @accessor api.functional.shoppingMall.customer.orders.items.at
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
     * Business order number of the preserved order record (global scope)
     */
    orderCode: string & tags.Format<"uuid">;

    /**
     * Unique identifier of the order item within the specified order
     */
    itemId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallOrderItem;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/customer/orders/:orderCode/items/:itemId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/customer/orders/${encodeURIComponent(props.orderCode ?? "null")}/items/${encodeURIComponent(props.itemId ?? "null")}`;
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
      assert.param("orderCode")(() => typia.assert(props.orderCode));
      assert.param("itemId")(() => typia.assert(props.itemId));
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
