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
 * Test retrieval of system metrics with comprehensive filters for platform analytics.
 * 1. Setup admin connection using authorization utility
 * 2. Test system metrics endpoint with various filters:
 *    - Component filter (communities, posts, votes)
 *    - Date range filters using period_start_gte and period_end_lte
 *    - Metric name filter for specific analytics
 *    - Value type filter (count, sum, average)
 *    - Pagination with page and limit parameters
 * 3. Validate response includes correct metric records with aggregation periods
 * 4. Verify sorting by period_start descending shows most recent metrics first
 * 5. Test dimension breakdowns where applicable
 */
export async function test_api_system_metrics_admin_filtered_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Test basic metrics retrieval without filters
  const allMetrics = await api.functional.communityPlatform.admin.metrics.index(
    adminConnection,
    {
      body: {} satisfies ICommunityPlatformSystemMetric.IRequest,
    },
  );
  typia.assert(allMetrics);
  TestValidator.predicate(
    "has pagination structure",
    allMetrics.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(allMetrics.data));
  // 3. Test component filtering
  const componentValues = ["communities", "posts", "votes"] as const;
  for (const component of componentValues) {
    const filteredByComponent =
      await api.functional.communityPlatform.admin.metrics.index(
        adminConnection,
        {
          body: {
            component,
          } satisfies ICommunityPlatformSystemMetric.IRequest,
        },
      );
    typia.assert(filteredByComponent);
    // Validate all returned metrics match the component filter
    for (const metric of filteredByComponent.data) {
      TestValidator.equals(
        `metric component matches filter: ${component}`,
        metric.component,
        component,
      );
    }
  }
  // 4. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const recentMetrics =
    await api.functional.communityPlatform.admin.metrics.index(
      adminConnection,
      {
        body: {
          period_start_gte: oneWeekAgo.toISOString(),
        } satisfies ICommunityPlatformSystemMetric.IRequest,
      },
    );
  typia.assert(recentMetrics);
  // Validate all returned metrics are within the date range
  for (const metric of recentMetrics.data) {
    const periodStart = new Date(metric.period_start);
    TestValidator.predicate(
      `period_start >= one week ago: ${metric.id}`,
      periodStart >= oneWeekAgo,
    );
  }
  // 5. Test combined filtering with metric name and value type
  const combinedFilterMetrics =
    await api.functional.communityPlatform.admin.metrics.index(
      adminConnection,
      {
        body: {
          component: "posts",
          metric_name: "daily_active_users",
          value_type: "count",
        } satisfies ICommunityPlatformSystemMetric.IRequest,
      },
    );
  typia.assert(combinedFilterMetrics);
  // Validate combined filter results
  for (const metric of combinedFilterMetrics.data) {
    TestValidator.equals("component matches posts", metric.component, "posts");
    TestValidator.equals(
      "metric_name matches daily_active_users",
      metric.metric_name,
      "daily_active_users",
    );
    TestValidator.equals(
      "value_type matches count",
      metric.value_type,
      "count",
    );
  }
  // 6. Test pagination
  const page1 = await api.functional.communityPlatform.admin.metrics.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformSystemMetric.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 has correct pagination",
    page1.pagination.current,
    1,
  );
  TestValidator.predicate("page 1 limit <= 10", page1.data.length <= 10);
  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.communityPlatform.admin.metrics.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies ICommunityPlatformSystemMetric.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals(
      "page 2 has correct pagination",
      page2.pagination.current,
      2,
    );
    // Ensure page 1 and page 2 don't have overlapping data
    const page1Ids = new Set(page1.data.map((m) => m.id));
    const page2Ids = new Set(page2.data.map((m) => m.id));
    const intersection = new Set(
      [...page1Ids].filter((id) => page2Ids.has(id)),
    );
    TestValidator.equals(
      "pages should not have overlapping records",
      intersection.size,
      0,
    );
  }
  // 7. Validate default sorting by period_start descending (most recent first)
  // We need at least 2 records to validate sorting
  if (allMetrics.data.length >= 2) {
    for (let i = 0; i < allMetrics.data.length - 1; i++) {
      const currentPeriod = new Date(allMetrics.data[i].period_start);
      const nextPeriod = new Date(allMetrics.data[i + 1].period_start);
      TestValidator.predicate(
        `period_start[${i}] >= period_start[${i + 1}] for descending order`,
        currentPeriod >= nextPeriod,
      );
    }
  }
  // 8. Test dimension breakdowns where applicable
  const metricsWithDimensions = allMetrics.data.filter(
    (m) => m.dimensions !== null && m.dimensions !== undefined,
  );
  if (metricsWithDimensions.length > 0) {
    // Verify dimensions field exists and is a string (JSON)
    for (const metric of metricsWithDimensions) {
      TestValidator.predicate(
        `dimensions exists for metric ${metric.id}`,
        typeof metric.dimensions === "string" && metric.dimensions.length > 0,
      );
      // Optionally validate JSON structure
      try {
        JSON.parse(metric.dimensions!);
      } catch {
        // Not valid JSON - that's okay, could be other format
      }
    }
  }
}
