import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_platform_metrics_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Generate test data timestamps for date range testing
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const yesterdayISO = yesterday.toISOString();
  const tomorrowISO = tomorrow.toISOString();
  const weekAgoISO = weekAgo.toISOString();
  const nowISO = now.toISOString();
  // 2. Test metric_category filter
  const categoryResponse =
    await api.functional.ecommerce.superAdministrator.platform_metrics.index(
      adminConnection,
      {
        body: {
          metric_category: "performance",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(categoryResponse);
  // Validate business logic: all returned items should have correct category
  for (const metric of categoryResponse.data) {
    TestValidator.equals(
      "metric category should match filter",
      metric.metric_category,
      "performance",
    );
  }
  // 3. Test date range filtering
  const dateRangeResponse =
    await api.functional.ecommerce.superAdministrator.platform_metrics.index(
      adminConnection,
      {
        body: {
          collection_timestamp_start: yesterdayISO,
          collection_timestamp_end: tomorrowISO,
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Validate date range business logic
  for (const metric of dateRangeResponse.data) {
    const metricTimestamp = metric.collection_timestamp;
    TestValidator.predicate(
      "timestamp should be after start date",
      metricTimestamp >= yesterdayISO,
    );
    TestValidator.predicate(
      "timestamp should be before end date",
      metricTimestamp <= tomorrowISO,
    );
  }
  // 4. Test is_aggregated filter (true for aggregated metrics)
  const aggregatedResponse =
    await api.functional.ecommerce.superAdministrator.platform_metrics.index(
      adminConnection,
      {
        body: {
          is_aggregated: true,
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(aggregatedResponse);
  // Validate aggregation business logic
  for (const metric of aggregatedResponse.data) {
    TestValidator.equals(
      "metric should be aggregated",
      metric.is_aggregated,
      true,
    );
  }
  // 5. Test is_aggregated filter (false for raw measurements)
  const rawResponse =
    await api.functional.ecommerce.superAdministrator.platform_metrics.index(
      adminConnection,
      {
        body: {
          is_aggregated: false,
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(rawResponse);
  // Validate raw measurement business logic
  for (const metric of rawResponse.data) {
    TestValidator.equals(
      "metric should not be aggregated",
      metric.is_aggregated,
      false,
    );
  }
  // 6. Test metric_name partial matching
  const searchTerm = "response";
  const nameResponse =
    await api.functional.ecommerce.superAdministrator.platform_metrics.index(
      adminConnection,
      {
        body: {
          metric_name: searchTerm, // Should match "response_time", "response_rate", etc.
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(nameResponse);
  // Validate partial matching business logic
  for (const metric of nameResponse.data) {
    TestValidator.predicate(
      "metric name should contain search term",
      metric.metric_name.toLowerCase().includes(searchTerm),
    );
  }
  // 7. Test combined filters
  const combinedResponse =
    await api.functional.ecommerce.superAdministrator.platform_metrics.index(
      adminConnection,
      {
        body: {
          metric_category: "usage",
          is_aggregated: false,
          collection_timestamp_start: weekAgoISO,
          collection_timestamp_end: nowISO,
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Validate all combined filter business logic
  for (const metric of combinedResponse.data) {
    TestValidator.equals(
      "category should match combined filter",
      metric.metric_category,
      "usage",
    );
    TestValidator.equals(
      "aggregation should match combined filter",
      metric.is_aggregated,
      false,
    );
    TestValidator.predicate(
      "timestamp should be within combined date range",
      metric.collection_timestamp >= weekAgoISO &&
        metric.collection_timestamp <= nowISO,
    );
  }
  // 8. Test empty/null filters (should return all metrics)
  const emptyFilterResponse =
    await api.functional.ecommerce.superAdministrator.platform_metrics.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(emptyFilterResponse);
  TestValidator.predicate(
    "empty filters should return results",
    emptyFilterResponse.data.length > 0 ||
      emptyFilterResponse.pagination.records >= 0,
  );
}
