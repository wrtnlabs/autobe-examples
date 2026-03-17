import { IConnection, PlainFetcher } from "@nestia/fetcher";
import typia from "typia";

import { IShoppingMallSeller } from "../../../../structures/IShoppingMallSeller";

/**
 * Retrieve the authenticated seller's dashboard summary displaying key business metrics for their shop.
 *
 * This endpoint provides sellers with an at-a-glance view of their shop's performance and pending tasks. The dashboard aggregates statistics across multiple domains to help sellers manage their business efficiently.
 *
 * **Authentication and Authorization**:
 * - Requires seller authentication
 * - Seller must have 'approved' approval_status
 * - Suspended sellers (suspended=true) are denied access
 * - Banned sellers (banned=true) are denied access
 *
 * **Metrics Returned**:
 * 1. **Total Products Count**: Number of active (non-deleted) products owned by the seller, referenced from shopping_mall_products table where shopping_mall_seller_id matches the authenticated seller and deleted_at is null.
 *
 * 2. **Total Order Items Count**: Count of all order items for the seller's products across all statuses (paid, shipped, delivered, cancelled, refunded), queried from shopping_mall_order_items where shopping_mall_seller_id matches the authenticated seller.
 *
 * 3. **Pending Cancellation Requests Count**: Number of cancellation requests with status='pending' awaiting seller response, queried from shopping_mall_cancellation_requests where shopping_mall_seller_id matches the authenticated seller and status='pending'.
 *
 * 4. **Pending Refund Requests Count**: Number of refund requests with status='pending' awaiting seller response, joined through shopping_mall_order_items to find requests for the seller's products.
 *
 * 5. **Low Stock Variants Count**: Product variants with stock quantity below a defined threshold (e.g., 10 units), calculated from inventory records.
 *
 * **Dashboard Purpose**: Enables sellers to quickly identify items requiring attention (pending requests, low stock) and monitor overall shop activity without navigating through multiple list pages.
 *
 * **Related Operations**: Sellers can drill down into specific metrics using GET /seller/products, GET /seller/orders, GET /seller/cancellation-requests, and GET /seller/refund-requests endpoints.
 *
 * @param props.connection
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Implementation steps:
 *
 * 1. **Authentication Check**: Extract seller ID from JWT token in Authorization header. Validate session is active.
 *
 * 2. **Authorization Check**: Query shopping_mall_sellers table to verify:
 *    - approval_status = 'approved'
 *    - suspended = false
 *    - banned = false
 *    Return 403 Forbidden if any check fails with appropriate error message.
 *
 * 3. **Product Count Query**:
 *    ```sql
 *    SELECT COUNT(*) FROM shopping_mall_products
 *    WHERE shopping_mall_seller_id = :sellerId
 *    AND deleted_at IS NULL
 *    ```
 *
 * 4. **Order Items Count Query**:
 *    ```sql
 *    SELECT COUNT(*) FROM shopping_mall_order_items
 *    WHERE shopping_mall_seller_id = :sellerId
 *    AND deleted_at IS NULL
 *    ```
 *
 * 5. **Pending Cancellation Requests Query**:
 *    Use index on (shopping_mall_seller_id, status) for optimal performance:
 *    ```sql
 *    SELECT COUNT(*) FROM shopping_mall_cancellation_requests
 *    WHERE shopping_mall_seller_id = :sellerId
 *    AND status = 'pending'
 *    ```
 *
 * 6. **Pending Refund Requests Query**:
 *    Join through order_items to find refund requests for seller's products:
 *    ```sql
 *    SELECT COUNT(*) FROM shopping_mall_refund_requests r
 *    JOIN shopping_mall_order_items oi ON r.shopping_mall_order_item_id = oi.id
 *    WHERE oi.shopping_mall_seller_id = :sellerId
 *    AND r.status = 'pending'
 *    ```
 *
 * 7. **Low Stock Variants Query**:
 *    Calculate current stock from inventory records:
 *    ```sql
 *    SELECT COUNT(DISTINCT pv.id)
 *    FROM shopping_mall_product_variants pv
 *    JOIN shopping_mall_products p ON pv.shopping_mall_product_id = p.id
 *    LEFT JOIN (
 *      SELECT shopping_mall_product_variant_id, SUM(quantity_change) as stock
 *      FROM shopping_mall_inventory_records
 *      GROUP BY shopping_mall_product_variant_id
 *    ) ir ON pv.id = ir.shopping_mall_product_variant_id
 *    WHERE p.shopping_mall_seller_id = :sellerId
 *    AND COALESCE(ir.stock, 0) < :lowStockThreshold
 *    ```
 *
 * 8. **Response Assembly**: Construct IShoppingMallSeller.IDashboard response with all computed counts.
 *
 * 9. **Caching Consideration**: Consider caching dashboard metrics for 60 seconds to reduce database load during repeated dashboard refreshes. Invalidate on product/order/request state changes.
 *
 * Error Handling:
 * - 401 Unauthorized: Missing or invalid authentication token
 * - 403 Forbidden: Seller not approved, suspended, or banned
 * @path /shoppingMall/seller/dashboard
 * @accessor api.functional.shoppingMall.seller.dashboard.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(connection: IConnection): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection)
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
          path: at.path(),
          status: null,
        },
      );
}
export namespace at {
  export type Response = IShoppingMallSeller.IDashboard;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/seller/dashboard",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/seller/dashboard";
  export const random = (): IShoppingMallSeller.IDashboard =>
    typia.random<IShoppingMallSeller.IDashboard>();
  export const simulate = (_connection: IConnection): Response => {
    return random();
  };
}
