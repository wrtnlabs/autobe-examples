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

export async function test_api_superadministrator_analysis_filtered_performance(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
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
  // Test performance metrics filtering with recent timeframe
  const now = new Date();
  const twoHoursAgo = new Date(
    now.getTime() - 2 * 60 * 60 * 1000,
  ).toISOString();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  // Test Case 1: Performance metrics with aggregation
  const aggregatedResults =
    await api.functional.ecommerce.superAdministrator.analysis.index(
      adminConnection,
      {
        body: {
          metric_category: "performance",
          collection_timestamp_start: twoHoursAgo,
          collection_timestamp_end: now.toISOString(),
          is_aggregated: true,
          page: 1,
          limit: 20,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(aggregatedResults);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    typeof aggregatedResults.pagination === "object",
  );
  TestValidator.predicate(
    "current page positive",
    aggregatedResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit reasonable",
    aggregatedResults.pagination.limit >= 0 &&
      aggregatedResults.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records non-negative",
    aggregatedResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    aggregatedResults.pagination.pages >= 0,
  );
  // Test Case 2: Raw performance metrics with specific metric names
  const rawResults =
    await api.functional.ecommerce.superAdministrator.analysis.index(
      adminConnection,
      {
        body: {
          metric_category: "performance",
          metric_name: "response_time",
          collection_timestamp_start: oneHourAgo,
          collection_timestamp_end: now.toISOString(),
          is_aggregated: false,
          page: 1,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(rawResults);
  // Test Case 3: Multiple performance metrics with category grouping
  const categoryResults =
    await api.functional.ecommerce.superAdministrator.analysis.index(
      adminConnection,
      {
        body: {
          metric_category: "performance",
          metric_name: "active_users",
          collection_timestamp_start: twoHoursAgo,
          is_aggregated: undefined,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(categoryResults);
  // Validate metric entries have required properties
  if (aggregatedResults.data.length > 0) {
    const metric = aggregatedResults.data[0];
    TestValidator.predicate("has metric id", metric.id.length > 0);
    TestValidator.predicate("has metric name", metric.metric_name.length > 0);
    TestValidator.predicate(
      "has valid value",
      typeof metric.metric_value === "number",
    );
    TestValidator.predicate(
      "has collection timestamp",
      metric.collection_timestamp.length > 0,
    );
    TestValidator.equals(
      "category is performance",
      metric.metric_category,
      "performance",
    );
    TestValidator.equals(
      "aggregation status matches",
      metric.is_aggregated,
      true,
    );
  }
  // Test Case 4: Pagination behavior with different page sizes
  const pageResults =
    await api.functional.ecommerce.superAdministrator.analysis.index(
      adminConnection,
      {
        body: {
          metric_category: "performance",
          collection_timestamp_start: twoHoursAgo,
          limit: 5,
          page: 1,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(pageResults);
}
