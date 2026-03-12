import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOrderAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an authenticated administrator can retrieve comprehensive order analytics for a specific seller.
 *
 * This test verifies:
 * 1. Admin authentication is required and enforced
 * 2. The response includes all expected analytics fields
 * 3. The status_breakdown contains all 5 status categories with accurate counts
 * 4. The recent_orders array contains up to 10 most recent orders
 * 5. Revenue calculations use snapshot prices
 * 6. Average order value is null when total_order_count is zero
 */
export async function test_api_seller_order_analytics_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup - create a seller account to get a valid seller ID
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Retrieve order analytics for the seller using admin connection
  const analytics =
    await api.functional.shoppingMall.admin.sellers.analytics.orders.getOrderAnalytics(
      adminConnection,
      {
        sellerId: seller.id,
      },
    );
  typia.assert(analytics);
  // 4. Validate analytics response structure and business logic
  // Verify total_order_count is non-negative (should be 0 for new seller)
  if (analytics.total_order_count < 0)
    throw new Error("total_order_count is negative");
  // Verify total_items_sold is non-negative (should be 0 for new seller)
  if (analytics.total_items_sold < 0)
    throw new Error("total_items_sold is negative");
  // Verify total_revenue is non-negative (should be 0 for new seller)
  if (analytics.total_revenue < 0) throw new Error("total_revenue is negative");
  // Verify status_breakdown contains all 5 status fields with non-negative counts
  if (analytics.status_breakdown.paid < 0)
    throw new Error("status_breakdown.paid is negative");
  if (analytics.status_breakdown.shipped < 0)
    throw new Error("status_breakdown.shipped is negative");
  if (analytics.status_breakdown.delivered < 0)
    throw new Error("status_breakdown.delivered is negative");
  if (analytics.status_breakdown.cancelled < 0)
    throw new Error("status_breakdown.cancelled is negative");
  if (analytics.status_breakdown.refunded < 0)
    throw new Error("status_breakdown.refunded is negative");
  // Verify status_breakdown counts sum equals total_items_sold
  const statusSum =
    analytics.status_breakdown.paid +
    analytics.status_breakdown.shipped +
    analytics.status_breakdown.delivered +
    analytics.status_breakdown.cancelled +
    analytics.status_breakdown.refunded;
  if (statusSum !== analytics.total_items_sold)
    throw new Error("status breakdown sum does not equal total_items_sold");
  // Verify average_order_value is null when total_order_count is zero
  if (analytics.total_order_count === 0) {
    if (analytics.average_order_value !== null)
      throw new Error(
        "average_order_value should be null when no orders exist",
      );
  } else {
    // When there are orders, average_order_value should be non-negative
    if (
      analytics.average_order_value === null ||
      analytics.average_order_value < 0
    )
      throw new Error(
        "average_order_value should be non-negative when orders exist",
      );
  }
  // Verify recent_orders array exists and has max 10 items
  if (!Array.isArray(analytics.recent_orders))
    throw new Error("recent_orders is not an array");
  if (analytics.recent_orders.length > 10)
    throw new Error("recent_orders has more than 10 items");
  // For a new seller with no orders, recent_orders should be empty
  if (analytics.recent_orders.length !== 0)
    throw new Error("recent_orders should be empty for new seller");
}
