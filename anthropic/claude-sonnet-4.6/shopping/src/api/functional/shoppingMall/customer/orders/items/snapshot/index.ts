import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IShoppingMallOrderItemSnapshot } from "../../../../../../structures/IShoppingMallOrderItemSnapshot";

/**
 * Retrieve the immutable order item snapshot associated with a specific order item.
 *
 * Every order item in the shopping mall platform has exactly one corresponding snapshot record (`shopping_mall_order_item_snapshots`), created automatically and atomically at the moment the order is placed. This snapshot captures the complete state of the transaction at purchase time, including the full product details, the specific variant SKU configuration and price, and the seller's shop profile — all as they existed at the exact instant of checkout. Because the snapshot is immutable, it provides a permanent, tamper-proof reference for what was actually purchased, independent of any subsequent changes the seller may make to the product, variant pricing, or shop profile.
 *
 * The snapshot data returned by this endpoint includes the product name, description, base price, and category name as preserved in `shopping_mall_product_snapshots`; the ordered set of product images from `shopping_mall_product_snapshot_images`; the variant SKU code, price, and option key-value pairs (e.g., color: red, size: XL) from `shopping_mall_product_snapshot_skuses` and `shopping_mall_product_snapshot_skus_options`; and the seller's shop name, description, and logo URL from `shopping_mall_seller_profile_snapshots`. All of this information is presented exactly as it was at the moment of purchase, even if the seller has since modified or deleted any of these records.
 *
 * Access to this endpoint is strictly scoped by actor role. A customer may only retrieve the snapshot for an order item that belongs to one of their own orders — attempts to access another customer's order item snapshot are rejected with a 403 error. A seller may only retrieve snapshots for order items whose underlying product variant belongs to their seller account — they cannot access snapshots from other sellers' products. Both regular administrators and super administrators have unrestricted access to any order item snapshot on the platform, supporting their oversight, dispute resolution, and audit responsibilities.
 *
 * This endpoint is typically consumed as part of the order detail view. Clients should first retrieve the order via `GET /orders/{orderId}` or the admin order list, then use this endpoint to load the full snapshot details for each order item. The snapshot serves as the authoritative record for what the customer purchased and at what price, making it essential for handling cancellation and refund workflows as well as any disputes that may arise.
 *
 * @param props.connection
 * @param props.orderId The UUID of the parent order that contains the target order item.
 * @param props.itemId The UUID of the specific order item whose snapshot is to be retrieved.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification 1. Authenticate the requesting actor (customer, seller, or admin).
 * 2. Validate that the order identified by `orderId` exists in `shopping_mall_orders`. If not found, return 404.
 * 3. Validate that the order item identified by `itemId` exists in `shopping_mall_order_items` AND belongs to the given `orderId`. If not found or mismatched, return 404.
 * 4. Authorization checks:
 *    - If the actor is a customer: verify that `shopping_mall_orders.shopping_mall_customer_id` matches the authenticated customer's ID. If not, deny access with 403.
 *    - If the actor is a seller: verify that the order item's `shopping_mall_product_variant_id` references a product variant belonging to the authenticated seller. Join through `shopping_mall_product_variants` → `shopping_mall_products` and check `seller_id`. If not the seller's product, deny with 403.
 *    - If the actor is an admin or superAdmin: allow access unconditionally (platform-wide oversight).
 * 5. Load the `shopping_mall_order_item_snapshots` record where `order_item_id = itemId` (unique 1:1 constraint).
 * 6. Eagerly join and include:
 *    - `shopping_mall_product_snapshots` (name, description, base_price, category_name, created_at)
 *    - `shopping_mall_product_snapshot_images` (url, sequence — ordered by sequence ASC)
 *    - `shopping_mall_product_snapshot_skuses` (sku_code, price, options via `shopping_mall_product_snapshot_skus_options`)
 *    - `shopping_mall_seller_profile_snapshots` (shop_name, shop_description, logo_url)
 * 7. Return the fully composed snapshot response even if the underlying product, variant, or seller has since been deleted — the snapshot data is self-contained.
 * 8. If the snapshot record does not exist (e.g., the order item was created before the snapshot system was in place), return 404.
 * @path /shoppingMall/customer/orders/:orderId/items/:itemId/snapshot
 * @accessor api.functional.shoppingMall.customer.orders.items.snapshot.at
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
     * The UUID of the parent order that contains the target order item.
     */
    orderId: string & tags.Format<"uuid">;

    /**
     * The UUID of the specific order item whose snapshot is to be retrieved.
     */
    itemId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallOrderItemSnapshot;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/customer/orders/:orderId/items/:itemId/snapshot",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/customer/orders/${encodeURIComponent(props.orderId ?? "null")}/items/${encodeURIComponent(props.itemId ?? "null")}/snapshot`;
  export const random = (): IShoppingMallOrderItemSnapshot =>
    typia.random<IShoppingMallOrderItemSnapshot>();
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
