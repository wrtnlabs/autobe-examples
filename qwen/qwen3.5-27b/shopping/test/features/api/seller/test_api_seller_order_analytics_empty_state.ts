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
 * Test that the seller order analytics endpoint correctly handles the empty state when a seller has no orders.
 * Validates that all metrics return zero/null/empty values appropriately for a newly registered seller with no sales history.
 */
export async function test_api_seller_order_analytics_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller account with no orders
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Query analytics for the newly registered seller with no orders
  const analytics =
    await api.functional.shoppingMall.admin.sellers.analytics.orders.getOrderAnalytics(
      adminConnection,
      {
        sellerId: seller.id,
      },
    );
  typia.assert(analytics);
  // 4. Validate total_order_count is 0
  TestValidator.equals(
    "total_order_count is zero",
    analytics.total_order_count,
    0,
  );
  // 5. Validate total_items_sold is 0
  TestValidator.equals(
    "total_items_sold is zero",
    analytics.total_items_sold,
    0,
  );
  // 6. Validate total_revenue is 0
  TestValidator.equals("total_revenue is zero", analytics.total_revenue, 0);
  // 7. Validate status_breakdown contains all 5 status fields with value 0
  TestValidator.equals(
    "paid count is zero",
    analytics.status_breakdown.paid,
    0,
  );
  TestValidator.equals(
    "shipped count is zero",
    analytics.status_breakdown.shipped,
    0,
  );
  TestValidator.equals(
    "delivered count is zero",
    analytics.status_breakdown.delivered,
    0,
  );
  TestValidator.equals(
    "cancelled count is zero",
    analytics.status_breakdown.cancelled,
    0,
  );
  TestValidator.equals(
    "refunded count is zero",
    analytics.status_breakdown.refunded,
    0,
  );
  // 8. Validate average_order_value is null (not 0 or undefined)
  TestValidator.equals(
    "average_order_value is null",
    analytics.average_order_value,
    null,
  );
  // 9. Validate recent_orders is an empty array
  TestValidator.equals(
    "recent_orders is empty array",
    analytics.recent_orders,
    [],
  );
  TestValidator.predicate(
    "recent_orders length is zero",
    analytics.recent_orders.length === 0,
  );
}
