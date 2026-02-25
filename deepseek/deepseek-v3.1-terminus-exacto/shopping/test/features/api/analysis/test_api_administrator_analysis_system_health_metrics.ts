import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_analysis_system_health_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  // Generate timestamp ranges for filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  // Test 1: Filter by system_health category with timestamp range
  const systemHealthMetrics =
    await api.functional.ecommerce.administrator.analysis.index(
      adminConnection,
      {
        body: {
          metric_category: "system_health",
          collection_timestamp_start: oneWeekAgo.toISOString(),
          collection_timestamp_end: now.toISOString(),
          page: 1 satisfies number as number,
          limit: 20 satisfies number as number,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(systemHealthMetrics);
  // Validate system_health category filtering
  TestValidator.equals(
    "all metrics have system_health category",
    systemHealthMetrics.data.length,
    systemHealthMetrics.data.filter(
      (item) => item.metric_category === "system_health",
    ).length,
  );
  // Validate timestamp range
  const collectionStart = new Date(oneWeekAgo.toISOString());
  const collectionEnd = new Date(now.toISOString());
  for (const metric of systemHealthMetrics.data) {
    const metricTime = new Date(metric.collection_timestamp);
    TestValidator.predicate(
      `metric timestamp within range - ${metric.metric_name}`,
      metricTime >= collectionStart && metricTime <= collectionEnd,
    );
  }
  // Test 2: Filter aggregated metrics only
  const aggregatedMetrics =
    await api.functional.ecommerce.administrator.analysis.index(
      adminConnection,
      {
        body: {
          metric_category: "system_health",
          is_aggregated: true,
          collection_timestamp_start: twoDaysAgo.toISOString(),
          collection_timestamp_end: now.toISOString(),
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(aggregatedMetrics);
  // Validate aggregated flag
  TestValidator.equals(
    "all metrics are aggregated",
    aggregatedMetrics.data.length,
    aggregatedMetrics.data.filter((item) => item.is_aggregated === true).length,
  );
  // Test 3: Filter non-aggregated metrics only
  const nonAggregatedMetrics =
    await api.functional.ecommerce.administrator.analysis.index(
      adminConnection,
      {
        body: {
          metric_category: "system_health",
          is_aggregated: false,
          collection_timestamp_start: twoDaysAgo.toISOString(),
          collection_timestamp_end: now.toISOString(),
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(nonAggregatedMetrics);
  // Validate non-aggregated flag
  TestValidator.equals(
    "all metrics are non-aggregated",
    nonAggregatedMetrics.data.length,
    nonAggregatedMetrics.data.filter((item) => item.is_aggregated === false)
      .length,
  );
  // Test 4: Test pagination
  const page1 = await api.functional.ecommerce.administrator.analysis.index(
    adminConnection,
    {
      body: {
        metric_category: "system_health",
        page: 1 satisfies number as number,
        limit: 5 satisfies number as number,
      } satisfies IEcommerceCacheConfigurationParameter.IRequest,
    },
  );
  typia.assert(page1);
  const page2 = await api.functional.ecommerce.administrator.analysis.index(
    adminConnection,
    {
      body: {
        metric_category: "system_health",
        page: 2 satisfies number as number,
        limit: 5 satisfies number as number,
      } satisfies IEcommerceCacheConfigurationParameter.IRequest,
    },
  );
  typia.assert(page2);
  // Validate pagination metadata
  TestValidator.equals(
    "page1 has correct current page",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page1 has correct limit", page1.pagination.limit, 5);
  TestValidator.equals(
    "page2 has correct current page",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page2 has correct limit", page2.pagination.limit, 5);
  // Validate no overlapping results between pages
  const page1Ids = new Set(page1.data.map((item) => item.id));
  const page2Ids = new Set(page2.data.map((item) => item.id));
  const intersection = [...page1Ids].filter((id) => page2Ids.has(id));
  TestValidator.equals(
    "no overlapping IDs between pages",
    intersection.length,
    0,
  );
  // Validate response provides meaningful monitoring information
  for (const metric of page1.data.concat(page2.data)) {
    TestValidator.predicate(
      `metric has name - ${metric.id}`,
      metric.metric_name.length > 0,
    );
    TestValidator.predicate(
      `metric has valid value - ${metric.metric_name}`,
      typeof metric.metric_value === "number",
    );
    TestValidator.predicate(
      `metric has valid timestamp - ${metric.metric_name}`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(metric.collection_timestamp),
    );
    TestValidator.predicate(
      `metric has valid category - ${metric.metric_name}`,
      metric.metric_category === "system_health",
    );
  }
}
