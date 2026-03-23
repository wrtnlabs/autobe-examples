import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAnalytic";
import type { IShoppingMallOrderAnalyticDailyTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAnalyticDailyTrend";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test order analytics retrieval with default period (last 30 days).
 * Validates comprehensive order statistics including totals, status distribution,
 * daily trends, and fulfillment metrics for the shopping mall platform.
 */
export async function test_api_order_analytics_default_period(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve order analytics with default period
  const analytics =
    await api.functional.shoppingMall.admin.analytics.orders.getAnalytics(
      adminConnection,
    );
  typia.assert(analytics);
  // 3. Validate total orders is non-negative
  TestValidator.predicate(
    "total_orders is non-negative",
    analytics.total_orders >= 0,
  );
  // 4. Validate total revenue is non-negative
  TestValidator.predicate(
    "total_revenue is non-negative",
    analytics.total_revenue >= 0,
  );
  // 5. Validate average order value is non-negative
  TestValidator.predicate(
    "average_order_value is non-negative",
    analytics.average_order_value >= 0,
  );
  // 6. Validate status distribution contains all 5 statuses
  TestValidator.equals(
    "status_distribution has paid count",
    typeof analytics.status_distribution.paid,
    "number",
  );
  TestValidator.equals(
    "status_distribution has shipped count",
    typeof analytics.status_distribution.shipped,
    "number",
  );
  TestValidator.equals(
    "status_distribution has delivered count",
    typeof analytics.status_distribution.delivered,
    "number",
  );
  TestValidator.equals(
    "status_distribution has cancelled count",
    typeof analytics.status_distribution.cancelled,
    "number",
  );
  TestValidator.equals(
    "status_distribution has refunded count",
    typeof analytics.status_distribution.refunded,
    "number",
  );
  // 7. Validate status distribution sum equals total_orders
  const statusSum =
    analytics.status_distribution.paid +
    analytics.status_distribution.shipped +
    analytics.status_distribution.delivered +
    analytics.status_distribution.cancelled +
    analytics.status_distribution.refunded;
  TestValidator.equals(
    "status_distribution sum equals total_orders",
    statusSum,
    analytics.total_orders,
  );
  // 8. Validate daily_trends array exists
  TestValidator.predicate(
    "daily_trends is an array",
    Array.isArray(analytics.daily_trends),
  );
  // 9. Validate daily_trends is sorted by date ascending (if not empty)
  if (analytics.daily_trends.length > 1) {
    for (let i = 1; i < analytics.daily_trends.length; i++) {
      TestValidator.predicate(
        `daily_trends[${i}] date >= daily_trends[${i - 1}] date`,
        analytics.daily_trends[i].date >= analytics.daily_trends[i - 1].date,
      );
    }
  }
  // 10. Validate fulfillment_metrics structure
  TestValidator.predicate(
    "fulfillment_metrics has avg_ship_time_hours",
    analytics.fulfillment_metrics.avg_ship_time_hours === null ||
      typeof analytics.fulfillment_metrics.avg_ship_time_hours === "number",
  );
  TestValidator.predicate(
    "fulfillment_metrics has avg_delivery_time_hours",
    analytics.fulfillment_metrics.avg_delivery_time_hours === null ||
      typeof analytics.fulfillment_metrics.avg_delivery_time_hours === "number",
  );
  // 11. Validate period_start timestamp exists
  TestValidator.predicate(
    "period_start is a valid date-time string",
    typeof analytics.period_start === "string" &&
      analytics.period_start.length > 0,
  );
  // 12. Validate period_end timestamp exists
  TestValidator.predicate(
    "period_end is a valid date-time string",
    typeof analytics.period_end === "string" && analytics.period_end.length > 0,
  );
  // 13. Validate period_end >= period_start
  TestValidator.predicate(
    "period_end >= period_start",
    new Date(analytics.period_end).getTime() >=
      new Date(analytics.period_start).getTime(),
  );
  // 14. Validate business logic: if total_orders > 0, average_order_value should be > 0
  if (analytics.total_orders > 0) {
    TestValidator.predicate(
      "average_order_value > 0 when total_orders > 0",
      analytics.average_order_value > 0,
    );
  }
  // 15. Validate daily_trends order_count and revenue are non-negative
  for (const trend of analytics.daily_trends) {
    TestValidator.predicate(
      `daily_trend order_count >= 0 for date ${trend.date}`,
      trend.order_count >= 0,
    );
    TestValidator.predicate(
      `daily_trend revenue >= 0 for date ${trend.date}`,
      trend.revenue >= 0,
    );
  }
}
