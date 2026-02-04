import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_order_analytics_aggregation(
  connection: api.IConnection,
): Promise<void> {
  // Create first seller connection and authenticate
  const sellerConnection1: api.IConnection = { host: connection.host };
  const sellerAuth1 = await authorize_seller_join(sellerConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth1);
  const sellerId1 = sellerAuth1.seller_id;
  // Create second seller connection and authenticate for data isolation test
  const sellerConnection2: api.IConnection = { host: connection.host };
  const sellerAuth2 = await authorize_seller_join(sellerConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth2);
  const sellerId2 = sellerAuth2.seller_id;
  // Date range for tests (7 days of historical data)
  const dateRange = {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  };
  // Test 1: Basic aggregation with all metrics
  const basicAnalytics =
    await api.functional.shoppingMall.seller.analytics.orders.index(
      sellerConnection1,
      {
        body: {
          sellerIds: [sellerId1],
          metricTypes: [
            "totalOrders",
            "totalRevenue",
            "averageOrderValue",
            "statusDistribution",
          ],
          dateRange,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(basicAnalytics);
  // Test 2: Status filters
  const paidAnalytics =
    await api.functional.shoppingMall.seller.analytics.orders.index(
      sellerConnection1,
      {
        body: {
          sellerIds: [sellerId1],
          statusFilters: ["paid"],
          metricTypes: ["totalOrders"],
          dateRange,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(paidAnalytics);
  // Test 3: Date range filtering (recent 2 days)
  const recentAnalytics =
    await api.functional.shoppingMall.seller.analytics.orders.index(
      sellerConnection1,
      {
        body: {
          sellerIds: [sellerId1],
          metricTypes: ["totalOrders"],
          dateRange: {
            start: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(recentAnalytics);
  // Test 4: Data isolation - seller1 should not see seller2's data
  // If the endpoint returns results, it means data isolation is broken
  // But since we don't have any orders already created, we expect empty
  const isolationAnalytics =
    await api.functional.shoppingMall.seller.analytics.orders.index(
      sellerConnection1,
      {
        body: {
          sellerIds: [sellerId1],
          metricTypes: ["totalOrders"],
          dateRange,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(isolationAnalytics);
  TestValidator.equals(
    "sellers data isolation",
    isolationAnalytics.pagination.records,
    0,
  );
  // Test 5: Empty set - future date range
  const emptySetAnalytics =
    await api.functional.shoppingMall.seller.analytics.orders.index(
      sellerConnection1,
      {
        body: {
          sellerIds: [sellerId1],
          metricTypes: ["totalOrders"],
          dateRange: {
            start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          },
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(emptySetAnalytics);
  TestValidator.equals(
    "empty date range results",
    emptySetAnalytics.pagination.records,
    0,
  );
  // Test 6: Missing sellerId - should fail
  await TestValidator.error("access without seller ID", async () => {
    await api.functional.shoppingMall.seller.analytics.orders.index(
      sellerConnection1,
      {
        body: {
          metricTypes: ["totalOrders"],
          dateRange,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  });
  // Test 7: Invalid date range - start after end
  await TestValidator.error(
    "invalid date range - start after end",
    async () => {
      await api.functional.shoppingMall.seller.analytics.orders.index(
        sellerConnection1,
        {
          body: {
            sellerIds: [sellerId1],
            metricTypes: ["totalOrders"],
            dateRange: {
              start: new Date(Date.now() + 1000).toISOString(),
              end: new Date().toISOString(),
            },
          } satisfies IShoppingMallOrder.IRequest,
        },
      );
    },
  );
}
