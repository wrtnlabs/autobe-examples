import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test performance metrics filtering by specific metric types.
 * 1. Authenticate as super admin using authorize_super_admin_join utility
 * 2. Test filtering by 'response_time' metric type with pagination
 * 3. Test filtering by 'cpu_usage' metric type
 * 4. Test filtering by 'memory_usage' metric type
 * 5. Validate that returned metrics match the requested metric type
 * 6. Validate pagination metadata for proper pagination support
 */
export async function test_api_system_metrics_performance_filter_by_metric_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Test filtering by response_time metric type
  const responseTimeMetrics =
    await api.functional.discussionBoard.superAdmin.system.metrics.performance.index(
      superAdminConnection,
      {
        body: {
          metric_type: "response_time",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(responseTimeMetrics);
  // Validate all returned metrics are response_time type
  for (const metric of responseTimeMetrics.data) {
    TestValidator.equals(
      "response_time metric type",
      metric.metric_type,
      "response_time",
    );
  }
  // Validate pagination metadata - navigate through nested pagination structure
  const actualPagination =
    responseTimeMetrics.pagination.pagination.pagination.pagination;
  TestValidator.predicate(
    "pagination has valid current page",
    actualPagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    actualPagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    actualPagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    actualPagination.pages >= 0,
  );
  // 3. Test filtering by cpu_usage metric type
  const cpuUsageMetrics =
    await api.functional.discussionBoard.superAdmin.system.metrics.performance.index(
      superAdminConnection,
      {
        body: {
          metric_type: "cpu_usage",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(cpuUsageMetrics);
  // Validate all returned metrics are cpu_usage type
  for (const metric of cpuUsageMetrics.data) {
    TestValidator.equals(
      "cpu_usage metric type",
      metric.metric_type,
      "cpu_usage",
    );
  }
  // 4. Test filtering by memory_usage metric type with ascending sort
  const memoryUsageMetrics =
    await api.functional.discussionBoard.superAdmin.system.metrics.performance.index(
      superAdminConnection,
      {
        body: {
          metric_type: "memory_usage",
          sort: "asc",
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(memoryUsageMetrics);
  // Validate all returned metrics are memory_usage type
  for (const metric of memoryUsageMetrics.data) {
    TestValidator.equals(
      "memory_usage metric type",
      metric.metric_type,
      "memory_usage",
    );
  }
  // Validate metric structure
  for (const metric of memoryUsageMetrics.data) {
    TestValidator.predicate("metric has valid id", metric.id.length > 0);
    TestValidator.predicate(
      "metric has valid metric_value",
      metric.metric_value >= 0,
    );
    TestValidator.predicate(
      "metric has valid metric_unit",
      metric.metric_unit.length > 0,
    );
    TestValidator.predicate(
      "metric has valid source_component",
      metric.source_component.length > 0,
    );
    TestValidator.predicate(
      "metric has valid collection_timestamp",
      metric.collection_timestamp.length > 0,
    );
  }
}
