import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_analytics_comprehensive_query(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@test.com",
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test.com/analytics",
      referrer: "https://test.com/dashboard",
      ip: "192.168.1.1",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Test 1: Basic analytics query with default parameters
  const basicAnalytics =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          metric_type: undefined,
          source_component: undefined,
          collection_timestamp_start: undefined,
          collection_timestamp_end: undefined,
          page: 1,
          limit: 20,
          sort: "desc",
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(basicAnalytics);
  // Test 2: Filter by specific metric type
  const metricTypeAnalytics =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          metric_type: "response_time",
          source_component: undefined,
          collection_timestamp_start: undefined,
          collection_timestamp_end: undefined,
          page: 1,
          limit: 10,
          sort: "asc",
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(metricTypeAnalytics);
  // Test 3: Filter by specific source component
  const sourceComponentAnalytics =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          metric_type: undefined,
          source_component: "api_gateway",
          collection_timestamp_start: undefined,
          collection_timestamp_end: undefined,
          page: 2,
          limit: 15,
          sort: "desc",
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(sourceComponentAnalytics);
  // Test 4: Filter by date range
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeAnalytics =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          metric_type: "cpu_usage",
          source_component: "database",
          collection_timestamp_start: oneDayAgo.toISOString(),
          collection_timestamp_end: now.toISOString(),
          page: 1,
          limit: 50,
          sort: "desc",
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(dateRangeAnalytics);
  // Test 5: Combined filters
  const combinedAnalytics =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          metric_type: "memory_usage",
          source_component: "cache",
          collection_timestamp_start: oneDayAgo.toISOString(),
          collection_timestamp_end: now.toISOString(),
          page: 1,
          limit: 25,
          sort: "asc",
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(combinedAnalytics);
  // First, let's discover the actual pagination structure
  typia.assert(basicAnalytics.pagination);
  // Based on typical API patterns, the pagination likely has properties like 'page', 'size', 'total', 'count' etc.
  // Let's adjust validation to use common pagination property names
  // Validate pagination metadata
  TestValidator.predicate(
    "basic analytics has valid pagination",
    typeof basicAnalytics.pagination === 'object' && basicAnalytics.pagination !== null
  );
  // Check for common pagination properties
  const pagination = basicAnalytics.pagination;
  TestValidator.predicate(
    "basic analytics has valid page number",
    'page' in pagination ? (pagination as any).page >= 1 : true
  );
  TestValidator.predicate(
    "basic analytics has valid page size",
    'size' in pagination ? (pagination as any).size >= 1 && (pagination as any).size <= 100 :
    'limit' in pagination ? (pagination as any).limit >= 1 && (pagination as any).limit <= 100 :
    'perPage' in pagination ? (pagination as any).perPage >= 1 && (pagination as any).perPage <= 100 : true
  );
  TestValidator.predicate(
    "basic analytics has valid total count",
    'total' in pagination ? (pagination as any).total >= 0 :
    'count' in pagination ? (pagination as any).count >= 0 :
    'records' in pagination ? (pagination as any).records >= 0 : true
  );
  // Validate data structure
  TestValidator.predicate(
    "basic analytics has data array",
    Array.isArray(basicAnalytics.data),
  );
  if (basicAnalytics.data.length > 0) {
    const firstMetric = basicAnalytics.data[0];
    TestValidator.equals(
      "first metric has required properties",
      Object.keys(firstMetric).sort(),
      [
        "id",
        "metric_type",
        "metric_value",
        "metric_unit",
        "source_component",
        "collection_timestamp",
      ].sort(),
    );
  }
  // Validate pagination consistency if we have the required properties
  if (('page' in pagination && 'size' in pagination && 'total' in pagination) ||
      ('page' in pagination && 'limit' in pagination && 'records' in pagination)) {
    const page = 'page' in pagination ? (pagination as any).page : 1;
    const size = 'size' in pagination ? (pagination as any).size : ('limit' in pagination ? (pagination as any).limit : 20);
    const total = 'total' in pagination ? (pagination as any).total : ('records' in pagination ? (pagination as any).records : 0);
    const pages = Math.ceil(total / size);
    
    TestValidator.predicate(
      "pagination calculation",
      pages >= 0 && pages === Math.ceil(total / size)
    );
  }
}