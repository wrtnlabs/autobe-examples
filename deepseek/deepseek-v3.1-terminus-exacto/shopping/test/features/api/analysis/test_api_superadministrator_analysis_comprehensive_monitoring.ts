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

/**
 * Test comprehensive multi-table analytical data retrieval by authenticated super administrator.
 * Test various search filters across platform monitoring metrics, system metrics, audit logs, and oversight activities.
 * Verify pagination works correctly with custom page sizes and validate API returns unified analytical summaries.
 */
export async function test_api_superadministrator_analysis_comprehensive_monitoring(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(authorized);
  // 2. Test basic pagination with default parameters
  const basicPage =
    await api.functional.ecommerce.superAdministrator.analysis.index(
      superAdminConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(basicPage);
  TestValidator.predicate(
    "basic page has pagination metadata",
    basicPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "basic page has data array",
    Array.isArray(basicPage.data),
  );
  TestValidator.equals("page number matches", basicPage.pagination.current, 1);
  TestValidator.equals("limit matches", basicPage.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    basicPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    basicPage.pagination.pages >= 0,
  );
  // 3. Test custom page size (small)
  const smallPage =
    await api.functional.ecommerce.superAdministrator.analysis.index(
      superAdminConnection,
      {
        body: {
          page: 2 satisfies number as number,
          limit: 5 satisfies number as number,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(smallPage);
  TestValidator.equals(
    "small page limit matches",
    smallPage.pagination.limit,
    5,
  );
  TestValidator.equals(
    "small page number matches",
    smallPage.pagination.current,
    2,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    smallPage.data.length <= 5,
  );
  // 4. Test metric category filter
  const testCategory = "performance";
  const categoryFilter =
    await api.functional.ecommerce.superAdministrator.analysis.index(
      superAdminConnection,
      {
        body: {
          metric_category: testCategory,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(categoryFilter);
  TestValidator.predicate(
    "category filter returns data",
    categoryFilter.data.length >= 0,
  );
  if (categoryFilter.data.length > 0) {
    TestValidator.predicate(
      "all items match category filter",
      categoryFilter.data.every(
        (item) => item.metric_category === testCategory,
      ),
    );
  }
  // 5. Test metric name partial match filter
  const metricNameFilter =
    await api.functional.ecommerce.superAdministrator.analysis.index(
      superAdminConnection,
      {
        body: {
          metric_name: "response",
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(metricNameFilter);
  TestValidator.predicate(
    "metric name filter returns data",
    metricNameFilter.data.length >= 0,
  );
  if (metricNameFilter.data.length > 0) {
    TestValidator.predicate(
      "all items contain metric name filter",
      metricNameFilter.data.every((item) =>
        item.metric_name.includes("response"),
      ),
    );
  }
  // 6. Test time range filter
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const timeFilter =
    await api.functional.ecommerce.superAdministrator.analysis.index(
      superAdminConnection,
      {
        body: {
          collection_timestamp_start: oneDayAgo.toISOString(),
          collection_timestamp_end: now.toISOString(),
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(timeFilter);
  TestValidator.predicate(
    "time filter returns data",
    timeFilter.data.length >= 0,
  );
  if (timeFilter.data.length > 0) {
    TestValidator.predicate(
      "all items are within time range",
      timeFilter.data.every((item) => {
        const timestamp = new Date(item.collection_timestamp);
        return timestamp >= oneDayAgo && timestamp <= now;
      }),
    );
  }
  // 7. Test aggregation status filter
  const aggregatedFilter =
    await api.functional.ecommerce.superAdministrator.analysis.index(
      superAdminConnection,
      {
        body: {
          is_aggregated: true,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(aggregatedFilter);
  TestValidator.predicate(
    "aggregated filter returns data",
    aggregatedFilter.data.length >= 0,
  );
  if (aggregatedFilter.data.length > 0) {
    TestValidator.predicate(
      "all items are aggregated",
      aggregatedFilter.data.every((item) => item.is_aggregated === true),
    );
  }
  // 8. Test combined filters
  const combinedFilter =
    await api.functional.ecommerce.superAdministrator.analysis.index(
      superAdminConnection,
      {
        body: {
          metric_category: "business",
          is_aggregated: false,
          page: 1 satisfies number as number,
          limit: 5 satisfies number as number,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter returns data",
    combinedFilter.data.length >= 0,
  );
  if (combinedFilter.data.length > 0) {
    TestValidator.predicate(
      "all items match business category",
      combinedFilter.data.every((item) => item.metric_category === "business"),
    );
    TestValidator.predicate(
      "all items are not aggregated",
      combinedFilter.data.every((item) => item.is_aggregated === false),
    );
  }
  // 9. Test empty result filter (should return empty array)
  const emptyFilter =
    await api.functional.ecommerce.superAdministrator.analysis.index(
      superAdminConnection,
      {
        body: {
          metric_name: "nonexistent_metric_12345",
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(emptyFilter);
  TestValidator.predicate(
    "empty filter returns empty data array",
    emptyFilter.data.length === 0,
  );
  TestValidator.predicate(
    "empty filter has valid pagination",
    emptyFilter.pagination.records >= 0,
  );
  // 10. Validate data structure completeness
  if (basicPage.data.length > 0) {
    const sampleItem = basicPage.data[0];
    TestValidator.predicate("item has id", typeof sampleItem.id === "string");
    TestValidator.predicate(
      "item has metric_name",
      typeof sampleItem.metric_name === "string",
    );
    TestValidator.predicate(
      "item has metric_value",
      typeof sampleItem.metric_value === "number",
    );
    TestValidator.predicate(
      "item has metric_unit",
      sampleItem.metric_unit === null ||
        typeof sampleItem.metric_unit === "string",
    );
    TestValidator.predicate(
      "item has collection_timestamp",
      typeof sampleItem.collection_timestamp === "string",
    );
    TestValidator.predicate(
      "item has metric_category",
      typeof sampleItem.metric_category === "string",
    );
    TestValidator.predicate(
      "item has is_aggregated",
      typeof sampleItem.is_aggregated === "boolean",
    );
  }
}
