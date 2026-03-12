import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAnalytic";
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
 * Test analytics retrieval for a newly registered seller with no products or orders.
 * Validates that the system correctly handles null rate metrics when there is no order history.
 */
export async function test_api_seller_analytics_new_seller_no_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create new seller account (will have 'pending' approval status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Retrieve seller analytics via admin endpoint
  const analytics =
    await api.functional.shoppingMall.admin.analytics.sellers.getSellerAnalytics(
      adminConnection,
    );
  typia.assert(analytics);
  // The endpoint returns analytics for all sellers (array)
  const analyticsArray = Array.isArray(analytics) ? analytics : [analytics];
  // 4. Find the newly created seller in analytics
  const newSellerAnalytics = analyticsArray.find((a) => a.id === seller.id);
  TestValidator.predicate(
    "new seller appears in analytics",
    newSellerAnalytics !== undefined,
  );
  // 5. Validate analytics data for new seller with no orders
  if (newSellerAnalytics !== undefined) {
    // Validate approval status is 'pending'
    TestValidator.equals(
      "approval status is pending",
      newSellerAnalytics.approvalStatus,
      "pending",
    );
    // Validate product count is 0
    TestValidator.equals(
      "product count is zero",
      newSellerAnalytics.productCount,
      0,
    );
    // Validate total order items is 0
    TestValidator.equals(
      "total order items is zero",
      newSellerAnalytics.totalOrderItems,
      0,
    );
    // Validate rate metrics are null (no order history)
    TestValidator.equals(
      "shipment completion rate is null",
      newSellerAnalytics.shipmentCompletionRate,
      null,
    );
    TestValidator.equals(
      "cancellation rate is null",
      newSellerAnalytics.cancellationRate,
      null,
    );
    TestValidator.equals(
      "refund rate is null",
      newSellerAnalytics.refundRate,
      null,
    );
    // Validate creation timestamp is valid
    TestValidator.predicate(
      "created at timestamp is valid",
      new Date(newSellerAnalytics.createdAt).getTime() > 0,
    );
  }
}
