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
 * Test admin subscription metrics retrieval with various filters and validation.
 */
export async function test_api_admin_subscription_metrics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Test basic metrics retrieval with pagination
  const basicMetrics =
    await api.functional.communityPlatform.admin.subscriptions.metrics.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 20 satisfies number as number,
        } satisfies ICommunityPlatformSystemMetric.IRequest,
      },
    );
  typia.assert(basicMetrics);
  // Validate pagination structure
  TestValidator.equals(
    "basic metrics pagination structure",
    basicMetrics.pagination.current,
    1,
  );
  TestValidator.equals(
    "basic metrics page limit",
    basicMetrics.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "basic metrics has valid pages count",
    basicMetrics.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "basic metrics has valid records count",
    basicMetrics.pagination.records >= 0,
  );
  // Validate all metrics have component = 'subscriptions'
  for (const metric of basicMetrics.data) {
    TestValidator.equals(
      `metric ${metric.id} component should be subscriptions`,
      metric.component,
      "subscriptions",
    );
  }
  // 3. Test date range filtering
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilteredMetrics =
    await api.functional.communityPlatform.admin.subscriptions.metrics.index(
      adminConnection,
      {
        body: {
          period_start_gte: oneMonthAgo.toISOString(),
          period_end_lte: now.toISOString(),
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies ICommunityPlatformSystemMetric.IRequest,
      },
    );
  typia.assert(dateFilteredMetrics);
  // Validate date filtered metrics
  for (const metric of dateFilteredMetrics.data) {
    const periodStart = new Date(metric.period_start);
    const periodEnd = new Date(metric.period_end);
    TestValidator.predicate(
      `metric ${metric.id} period_start >= filter start`,
      periodStart >= oneMonthAgo,
    );
    TestValidator.predicate(
      `metric ${metric.id} period_end <= filter end`,
      periodEnd <= now,
    );
  }
  // 4. Test aggregation period filtering
  const aggregationPeriods = ["daily", "weekly", "monthly"] as const;
  for (const period of aggregationPeriods) {
    const periodMetrics =
      await api.functional.communityPlatform.admin.subscriptions.metrics.index(
        adminConnection,
        {
          body: {
            aggregation_period: period,
            page: 1 satisfies number as number,
            limit: 5 satisfies number as number,
          } satisfies ICommunityPlatformSystemMetric.IRequest,
        },
      );
    typia.assert(periodMetrics);
    for (const metric of periodMetrics.data) {
      TestValidator.equals(
        `metric ${metric.id} aggregation period matches filter`,
        metric.aggregation_period,
        period,
      );
    }
  }
  // 5. Test metric name filtering
  const metricNameMetrics =
    await api.functional.communityPlatform.admin.subscriptions.metrics.index(
      adminConnection,
      {
        body: {
          metric_name: "daily_new_subscribers",
          page: 1 satisfies number as number,
          limit: 5 satisfies number as number,
        } satisfies ICommunityPlatformSystemMetric.IRequest,
      },
    );
  typia.assert(metricNameMetrics);
}