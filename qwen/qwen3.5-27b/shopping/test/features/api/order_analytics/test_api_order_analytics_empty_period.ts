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
 * Test order analytics endpoint when no orders exist in the period.
 * Validates that the endpoint returns zeros and nulls appropriately when
 * there are no orders to analyze, ensuring graceful handling of empty data scenarios.
 */
export async function test_api_order_analytics_empty_period(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
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
  // 2. Call order analytics endpoint
  const analytics =
    await api.functional.shoppingMall.admin.analytics.orders.getAnalytics(
      adminConnection,
    );
  typia.assert(analytics);
  // 3. Validate empty period analytics response
  // Total orders should be 0
  TestValidator.equals("total_orders is zero", analytics.total_orders, 0);
  // Total revenue should be 0
  TestValidator.equals("total_revenue is zero", analytics.total_revenue, 0);
  // Average order value should be 0 (division by zero handled)
  TestValidator.equals(
    "average_order_value is zero",
    analytics.average_order_value,
    0,
  );
  // Status distribution should have all zeros
  TestValidator.equals(
    "status_distribution.paid is zero",
    analytics.status_distribution.paid,
    0,
  );
  TestValidator.equals(
    "status_distribution.shipped is zero",
    analytics.status_distribution.shipped,
    0,
  );
  TestValidator.equals(
    "status_distribution.delivered is zero",
    analytics.status_distribution.delivered,
    0,
  );
  TestValidator.equals(
    "status_distribution.cancelled is zero",
    analytics.status_distribution.cancelled,
    0,
  );
  TestValidator.equals(
    "status_distribution.refunded is zero",
    analytics.status_distribution.refunded,
    0,
  );
  // Daily trends should be empty array
  TestValidator.equals(
    "daily_trends is empty array",
    analytics.daily_trends.length,
    0,
  );
  // Fulfillment metrics should have null values
  TestValidator.equals(
    "avg_ship_time_hours is null",
    analytics.fulfillment_metrics.avg_ship_time_hours,
    null,
  );
  TestValidator.equals(
    "avg_delivery_time_hours is null",
    analytics.fulfillment_metrics.avg_delivery_time_hours,
    null,
  );
  // Period start and end should be populated with valid date-time strings
  TestValidator.predicate("period_start is valid date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      analytics.period_start,
    ),
  );
  TestValidator.predicate("period_end is valid date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      analytics.period_end,
    ),
  );
  // Period end should be after or equal to period start
  TestValidator.predicate(
    "period_end is after period_start",
    () => new Date(analytics.period_end) >= new Date(analytics.period_start),
  );
}
