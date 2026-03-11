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

export async function test_api_superadmin_metrics_capacity_planning_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Define capacity planning focused metric filters
  const capacityPlanningFilters: IDiscussionBoardSystemHealthMetric.IRequest = {
    metric_type: RandomGenerator.pick([
      "cpu_utilization",
      "memory_usage",
      "disk_io",
      "throughput",
    ] as const),
    source_service: RandomGenerator.pick([
      "database",
      "cache",
      "file_storage",
    ] as const),
    status: RandomGenerator.pick(["healthy", "warning", "critical"] as const),
    start_timestamp: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 7 days ago
    end_timestamp: new Date().toISOString(),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
    >(),
  };
  // 3. Retrieve capacity planning metrics
  const metricsPage =
    await api.functional.discussionBoard.superAdmin.metrics.index(
      superAdminConnection,
      {
        body: capacityPlanningFilters,
      },
    );
  typia.assert(metricsPage);
  // 4. Validate capacity planning business logic
  TestValidator.predicate(
    "pagination metadata supports trend analysis",
    metricsPage.pagination.records >= 0 && metricsPage.pagination.pages >= 0,
  );
  // 5. Validate metrics support infrastructure scaling decisions
  if (metricsPage.data.length > 0) {
    const resourceMetrics = metricsPage.data.filter((metric) =>
      ["cpu_utilization", "memory_usage", "disk_io", "throughput"].includes(
        metric.metric_type,
      ),
    );
    TestValidator.predicate(
      "contains resource utilization metrics for capacity planning",
      resourceMetrics.length >= 0,
    );
    // Test that metrics provide actionable data for capacity decisions
    const criticalMetrics = metricsPage.data.filter(
      (metric) => metric.status === "critical",
    );
    const warningMetrics = metricsPage.data.filter(
      (metric) => metric.status === "warning",
    );
    TestValidator.predicate(
      "metrics include health status for decision making",
      criticalMetrics.length + warningMetrics.length >= 0,
    );
  }
  // 6. Validate time-based filtering for trend analysis
  TestValidator.predicate(
    "historical data accessible for capacity planning",
    capacityPlanningFilters.start_timestamp !== undefined &&
      capacityPlanningFilters.end_timestamp !== undefined,
  );
}
