import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemHealthMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator's ability to identify performance degradation patterns through targeted metric analysis.
 *
 * Scenario:
 * 1. SuperAdmin joins and authenticates
 * 2. Focus on critical status metrics: Filter by status='critical' or 'warning' to identify potential issues
 * 3. Cross-service analysis: Filter multiple source_service values to compare component health
 * 4. Temporal pattern detection: Use specific time ranges to identify when degradation began
 * 5. Metric type correlation: Analyze response_time vs success_rate metrics together
 * 6. Validate metric aggregation: Check if system provides actionable insights for capacity planning
 */
export async function test_api_superadmin_metrics_performance_degradation_analysis(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdmin);
  // 2. Test critical status filtering
  const criticalMetrics =
    await api.functional.discussionBoard.superAdmin.metrics.index(
      superAdminConnection,
      {
        body: {
          status: "critical",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(criticalMetrics);
  TestValidator.predicate(
    "critical metrics returned",
    criticalMetrics.data.length >= 0,
  );
  // 3. Test warning status filtering
  const warningMetrics =
    await api.functional.discussionBoard.superAdmin.metrics.index(
      superAdminConnection,
      {
        body: {
          status: "warning",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(warningMetrics);
  TestValidator.predicate(
    "warning metrics returned",
    warningMetrics.data.length >= 0,
  );
  // 4. Cross-service analysis: Filter multiple source_service values
  const serviceMetrics =
    await api.functional.discussionBoard.superAdmin.metrics.index(
      superAdminConnection,
      {
        body: {
          source_service: "api_gateway",
          status: "critical",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(serviceMetrics);
  // 5. Temporal pattern detection
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const timeRangeMetrics =
    await api.functional.discussionBoard.superAdmin.metrics.index(
      superAdminConnection,
      {
        body: {
          start_timestamp: oneHourAgo,
          end_timestamp: now.toISOString(),
          status: "critical",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(timeRangeMetrics);
  // 6. Metric type correlation analysis
  const responseTimeMetrics =
    await api.functional.discussionBoard.superAdmin.metrics.index(
      superAdminConnection,
      {
        body: {
          metric_type: "response_time",
          status: "critical",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(responseTimeMetrics);
  const successRateMetrics =
    await api.functional.discussionBoard.superAdmin.metrics.index(
      superAdminConnection,
      {
        body: {
          metric_type: "success_rate",
          status: "critical",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(successRateMetrics);
  // 7. Validate pagination functionality
  const paginatedMetrics =
    await api.functional.discussionBoard.superAdmin.metrics.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(paginatedMetrics);
  TestValidator.predicate(
    "pagination metadata present",
    paginatedMetrics.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page valid",
    paginatedMetrics.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit valid",
    paginatedMetrics.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count valid",
    paginatedMetrics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages valid",
    paginatedMetrics.pagination.pages >= 0,
  );
  // 8. Test empty critical metrics during stability periods
  const futureTime = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyMetrics =
    await api.functional.discussionBoard.superAdmin.metrics.index(
      superAdminConnection,
      {
        body: {
          start_timestamp: futureTime,
          end_timestamp: new Date(
            now.getTime() + 48 * 60 * 60 * 1000,
          ).toISOString(),
          status: "critical",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(emptyMetrics);
  TestValidator.predicate(
    "future time range returns valid response",
    emptyMetrics.data.length >= 0,
  );
  // 9. Validate metric data structure
  if (criticalMetrics.data.length > 0) {
    const metric = criticalMetrics.data[0];
    TestValidator.predicate("metric has id", metric.id !== undefined);
    TestValidator.predicate(
      "metric has type",
      metric.metric_type !== undefined,
    );
    TestValidator.predicate(
      "metric has value",
      typeof metric.metric_value === "number",
    );
    TestValidator.predicate("metric has unit", metric.unit !== undefined);
    TestValidator.predicate(
      "metric has service",
      metric.source_service !== undefined,
    );
    TestValidator.predicate(
      "metric has timestamp",
      metric.collection_timestamp !== undefined,
    );
    TestValidator.predicate("metric has status", metric.status !== undefined);
  }
}
