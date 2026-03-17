import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test system metrics filtering by specific date ranges and aggregation periods.
 * As an admin, set up metrics data across different time periods (daily, weekly, monthly).
 * Query with period_start_gte and period_end_lte to retrieve metrics within specific time windows.
 * Filter by aggregation_period (daily, weekly) to test different time granularities.
 * Verify date range filtering works correctly - metrics outside the range should not appear.
 * Test combination of date range with component filter to get targeted analytics.
 * Ensure period_start and period_end fields in response align with requested aggregation period.
 */
export async function test_api_system_metrics_admin_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Admin registration/authentication
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Define date ranges for testing
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // Test 1: Get all metrics in the last 30 days with daily aggregation
  const allMetrics = await api.functional.communityPlatform.admin.metrics.index(
    adminConnection,
    {
      body: {
        period_start_gte: thirtyDaysAgo.toISOString(),
        period_end_lte: now.toISOString(),
        aggregation_period: "daily",
        limit: 100,
      } satisfies ICommunityPlatformSystemMetric.IRequest,
    },
  );
  typia.assert(allMetrics);
  // Validate that returned metrics are within date range and have correct aggregation
  if (allMetrics.data.length > 0) {
    for (const metric of allMetrics.data) {
      TestValidator.equals(
        "aggregation period should be daily",
        metric.aggregation_period,
        "daily",
      );
      const periodStart = new Date(metric.period_start);
      const periodEnd = new Date(metric.period_end);
      TestValidator.predicate(
        "period start should be >= 30 days ago",
        periodStart >= thirtyDaysAgo,
      );
      TestValidator.predicate("period end should be <= now", periodEnd <= now);
    }
  }
  // Test 2: Filter by specific component with weekly aggregation
  const authMetrics =
    await api.functional.communityPlatform.admin.metrics.index(
      adminConnection,
      {
        body: {
          component: "auth",
          period_start_gte: fifteenDaysAgo.toISOString(),
          period_end_lte: now.toISOString(),
          aggregation_period: "weekly",
          limit: 50,
        } satisfies ICommunityPlatformSystemMetric.IRequest,
      },
    );
  typia.assert(authMetrics);
  // Validate component filtering and aggregation period
  if (authMetrics.data.length > 0) {
    for (const metric of authMetrics.data) {
      TestValidator.equals(
        "component should be auth",
        metric.component,
        "auth",
      );
      TestValidator.equals(
        "aggregation period should be weekly",
        metric.aggregation_period,
        "weekly",
      );
      const periodStart = new Date(metric.period_start);
      const periodEnd = new Date(metric.period_end);
      TestValidator.predicate(
        "period start should be >= 15 days ago",
        periodStart >= fifteenDaysAgo,
      );
      TestValidator.predicate("period end should be <= now", periodEnd <= now);
      // Check that weekly aggregation has 7-day range (approximately)
      const weekInMs = 7 * 24 * 60 * 60 * 1000;
      const rangeInMs = periodEnd.getTime() - periodStart.getTime();
      TestValidator.predicate(
        "weekly aggregation should be around 7 days",
        Math.abs(rangeInMs - weekInMs) < 24 * 60 * 60 * 1000,
      );
    }
  }
  // Test 3: Test narrow date range with specific metric name
  const specificMetrics =
    await api.functional.communityPlatform.admin.metrics.index(
      adminConnection,
      {
        body: {
          period_start_gte: sevenDaysAgo.toISOString(),
          period_end_lte: now.toISOString(),
          metric_name: "daily_active_users",
          limit: 20,
        } satisfies ICommunityPlatformSystemMetric.IRequest,
      },
    );
  typia.assert(specificMetrics);
  // Validate metric name filtering
  if (specificMetrics.data.length > 0) {
    for (const metric of specificMetrics.data) {
      TestValidator.equals(
        "metric name should be daily_active_users",
        metric.metric_name,
        "daily_active_users",
      );
      const periodStart = new Date(metric.period_start);
      const periodEnd = new Date(metric.period_end);
      TestValidator.predicate(
        "period start should be >= 7 days ago",
        periodStart >= sevenDaysAgo,
      );
      TestValidator.predicate("period end should be <= now", periodEnd <= now);
    }
  }
  // Test 4: Test pagination with date filtering
  const page1 = await api.functional.communityPlatform.admin.metrics.index(
    adminConnection,
    {
      body: {
        period_start_gte: thirtyDaysAgo.toISOString(),
        period_end_lte: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformSystemMetric.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 should have correct limit",
    page1.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 should have correct current page",
    page1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 data length should be <= limit",
    page1.data.length <= 10,
  );
  // Test 5: Verify that metrics outside date range are not included
  // Get metrics from last 7 days only
  const recentMetrics =
    await api.functional.communityPlatform.admin.metrics.index(
      adminConnection,
      {
        body: {
          period_start_gte: sevenDaysAgo.toISOString(),
          period_end_lte: now.toISOString(),
          limit: 100,
        } satisfies ICommunityPlatformSystemMetric.IRequest,
      },
    );
  typia.assert(recentMetrics);
  // Verify all metrics are within the 7-day window
  if (recentMetrics.data.length > 0) {
    for (const metric of recentMetrics.data) {
      const periodStart = new Date(metric.period_start);
      const periodEnd = new Date(metric.period_end);
      TestValidator.predicate(
        "metric period start should be >= 7 days ago",
        periodStart >= sevenDaysAgo,
      );
      TestValidator.predicate(
        "metric period end should be <= now",
        periodEnd <= now,
      );
    }
  }
  // Test 6: Combination filter with multiple criteria
  const combinedFilter =
    await api.functional.communityPlatform.admin.metrics.index(
      adminConnection,
      {
        body: {
          component: "posts",
          aggregation_period: "daily",
          period_start_gte: fifteenDaysAgo.toISOString(),
          period_end_lte: now.toISOString(),
          value_type: "count",
          limit: 30,
        } satisfies ICommunityPlatformSystemMetric.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Validate combined filter criteria
  if (combinedFilter.data.length > 0) {
    for (const metric of combinedFilter.data) {
      TestValidator.equals(
        "component should be posts",
        metric.component,
        "posts",
      );
      TestValidator.equals(
        "aggregation period should be daily",
        metric.aggregation_period,
        "daily",
      );
      TestValidator.equals(
        "value type should be count",
        metric.value_type,
        "count",
      );
      const periodStart = new Date(metric.period_start);
      const periodEnd = new Date(metric.period_end);
      TestValidator.predicate(
        "period start should be >= 15 days ago",
        periodStart >= fifteenDaysAgo,
      );
      TestValidator.predicate("period end should be <= now", periodEnd <= now);
    }
  }
}
