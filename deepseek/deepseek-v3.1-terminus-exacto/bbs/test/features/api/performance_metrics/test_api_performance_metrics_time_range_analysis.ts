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

export async function test_api_performance_metrics_time_range_analysis(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as superAdmin using base connection
  const superAdminAuth = await authorize_super_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdminAuth);
  // Create authenticated superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminAuth.token.access}`,
  };
  // Test 1: Retrieve metrics with specific time range
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const timeRangeRequest: IDiscussionBoardPerformanceMetric.IRequest = {
    collection_timestamp_start: twoHoursAgo.toISOString(),
    collection_timestamp_end: oneHourAgo.toISOString(),
    limit: 10,
    page: 1,
    sort: "desc",
  };
  const timeRangeMetrics =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      { body: timeRangeRequest },
    );
  typia.assert(timeRangeMetrics);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof timeRangeMetrics.pagination,
    "object",
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(timeRangeMetrics.data),
  );
  // Test 2: Retrieve all metrics with default sorting (most recent first)
  const allMetricsRequest: IDiscussionBoardPerformanceMetric.IRequest = {
    limit: 5,
    page: 1,
    sort: "desc",
  };
  const allMetrics =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      { body: allMetricsRequest },
    );
  typia.assert(allMetrics);
  // Test 3: Filter by specific metric type
  const metricTypes = [
    "response_time",
    "cpu_usage",
    "memory_usage",
    "error_rate",
    "request_count",
  ] as const;
  for (const metricType of metricTypes) {
    const typeRequest: IDiscussionBoardPerformanceMetric.IRequest = {
      metric_type: metricType,
      limit: 3,
      page: 1,
    };
    const typeMetrics =
      await api.functional.discussionBoard.superAdmin.performance_metrics.index(
        superAdminConnection,
        { body: typeRequest },
      );
    typia.assert(typeMetrics);
    // Validate all returned metrics match the requested type
    for (const metric of typeMetrics.data) {
      TestValidator.equals(
        `metric type ${metricType}`,
        metric.metric_type,
        metricType,
      );
    }
  }
  // Test 4: Filter by source component
  const sourceComponents = [
    "api_gateway",
    "database",
    "cache",
    "frontend",
  ] as const;
  for (const sourceComponent of sourceComponents) {
    const sourceRequest: IDiscussionBoardPerformanceMetric.IRequest = {
      source_component: sourceComponent,
      limit: 2,
      page: 1,
    };
    const sourceMetrics =
      await api.functional.discussionBoard.superAdmin.performance_metrics.index(
        superAdminConnection,
        { body: sourceRequest },
      );
    typia.assert(sourceMetrics);
    // Validate all returned metrics match the requested source
    for (const metric of sourceMetrics.data) {
      TestValidator.equals(
        `source component ${sourceComponent}`,
        metric.source_component,
        sourceComponent,
      );
    }
  }
  // Test 5: Pagination validation
  const paginationRequest: IDiscussionBoardPerformanceMetric.IRequest = {
    limit: 2,
    page: 1,
  };
  const firstPage =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      { body: paginationRequest },
    );
  typia.assert(firstPage);
  // Test second page
  const secondPageRequest: IDiscussionBoardPerformanceMetric.IRequest = {
    limit: 2,
    page: 2,
  };
  const secondPage =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      { body: secondPageRequest },
    );
  typia.assert(secondPage);
  // Ensure pages have different data if both have data
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.notEquals(
      "different page data",
      firstPage.data[0].id,
      secondPage.data[0].id,
    );
  }
  // Test 6: Ascending sorting
  const ascendingRequest: IDiscussionBoardPerformanceMetric.IRequest = {
    sort: "asc",
    limit: 5,
    page: 1,
  };
  const ascendingMetrics =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      { body: ascendingRequest },
    );
  typia.assert(ascendingMetrics);
  // Validate that metrics are properly structured
  for (const metric of allMetrics.data) {
    TestValidator.predicate(
      "has id",
      typeof metric.id === "string" && metric.id.length > 0,
    );
    TestValidator.predicate(
      "has metric_type",
      typeof metric.metric_type === "string" && metric.metric_type.length > 0,
    );
    TestValidator.predicate(
      "has metric_value",
      typeof metric.metric_value === "number",
    );
    TestValidator.predicate(
      "has metric_unit",
      typeof metric.metric_unit === "string" && metric.metric_unit.length > 0,
    );
    TestValidator.predicate(
      "has source_component",
      typeof metric.source_component === "string" &&
        metric.source_component.length > 0,
    );
    TestValidator.predicate(
      "has collection_timestamp",
      typeof metric.collection_timestamp === "string" &&
        metric.collection_timestamp.length > 0,
    );
  }
}
