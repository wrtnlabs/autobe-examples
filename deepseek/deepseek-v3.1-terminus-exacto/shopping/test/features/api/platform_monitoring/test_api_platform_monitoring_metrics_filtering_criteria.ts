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

export async function test_api_platform_monitoring_metrics_filtering_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // Update connection with authorization token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Test 1: Filter by partial metric name match
  const nameFilterResponse =
    await api.functional.ecommerce.administrator.platform_monitoring_metrics.index(
      adminConnection,
      {
        body: {
          metric_name: "response",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(nameFilterResponse);
  TestValidator.predicate(
    "Name filter returns valid pagination",
    nameFilterResponse.pagination.current >= 1,
  );
  // Test 2: Filter by metric category
  const categoryFilterResponse =
    await api.functional.ecommerce.administrator.platform_monitoring_metrics.index(
      adminConnection,
      {
        body: {
          metric_category: "performance",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(categoryFilterResponse);
  // Validate category filter results
  if (categoryFilterResponse.data.length > 0) {
    TestValidator.equals(
      "All results match category filter",
      categoryFilterResponse.data.every(
        (metric) => metric.metric_category === "performance",
      ),
      true,
    );
  }
  // Test 3: Filter by aggregation status
  const aggregationFilterResponse =
    await api.functional.ecommerce.administrator.platform_monitoring_metrics.index(
      adminConnection,
      {
        body: {
          is_aggregated: true,
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(aggregationFilterResponse);
  // Validate aggregation filter results
  if (aggregationFilterResponse.data.length > 0) {
    TestValidator.equals(
      "All results match aggregation filter",
      aggregationFilterResponse.data.every(
        (metric) => metric.is_aggregated === true,
      ),
      true,
    );
  }
  // Test 4: Filter by date range
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateFilterResponse =
    await api.functional.ecommerce.administrator.platform_monitoring_metrics.index(
      adminConnection,
      {
        body: {
          collection_timestamp_start: oneWeekAgo.toISOString(),
          collection_timestamp_end: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(dateFilterResponse);
  // Validate date range filter results
  if (dateFilterResponse.data.length > 0) {
    TestValidator.predicate(
      "All results within date range",
      dateFilterResponse.data.every((metric) => {
        const metricDate = new Date(metric.collection_timestamp);
        return metricDate >= oneWeekAgo && metricDate <= now;
      }),
    );
  }
  // Test 5: Combined filtering
  const combinedFilterResponse =
    await api.functional.ecommerce.administrator.platform_monitoring_metrics.index(
      adminConnection,
      {
        body: {
          metric_name: "user",
          metric_category: "usage",
          is_aggregated: false,
          collection_timestamp_start: oneWeekAgo.toISOString(),
          collection_timestamp_end: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Validate combined filter results
  if (combinedFilterResponse.data.length > 0) {
    for (const metric of combinedFilterResponse.data) {
      await TestValidator.predicate(
        "Metric has required properties",
        Boolean(metric.id && metric.metric_name && metric.metric_value !== undefined),
      );
      await TestValidator.predicate(
        "Metric name contains search term",
        metric.metric_name.includes("user"),
      );
      await TestValidator.equals(
        "Metric matches category",
        metric.metric_category,
        "usage",
      );
      await TestValidator.equals(
        "Metric matches aggregation status",
        metric.is_aggregated,
        false,
      );
      const metricDate = new Date(metric.collection_timestamp);
      await TestValidator.predicate(
        "Metric within date range",
        metricDate >= oneWeekAgo && metricDate <= now,
      );
    }
  }
  // Validate pagination structure exists
  TestValidator.predicate(
    "Valid pagination current page",
    combinedFilterResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "Valid pagination limit",
    combinedFilterResponse.pagination.limit >= 1 &&
      combinedFilterResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "Valid pagination records count",
    combinedFilterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Valid pagination pages count",
    combinedFilterResponse.pagination.pages >= 0,
  );
}