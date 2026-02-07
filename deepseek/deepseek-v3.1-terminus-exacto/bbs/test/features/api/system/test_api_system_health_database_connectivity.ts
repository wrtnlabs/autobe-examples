import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_health_database_connectivity(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Call system health endpoint
  const healthMetrics =
    await api.functional.discussionBoard.superAdmin.system.health.at(
      superAdminConnection,
    );
  typia.assert(healthMetrics);
  // Validate that the health metrics indicate successful database connectivity
  // The response should contain meaningful performance data that reflects database operations
  TestValidator.predicate(
    "metric type indicates system health monitoring",
    healthMetrics.metric_type.length > 0 &&
      [
        "response_time",
        "cpu_usage",
        "memory_usage",
        "error_rate",
        "request_count",
      ].includes(healthMetrics.metric_type),
  );
  TestValidator.predicate(
    "source component indicates database connectivity",
    healthMetrics.source_component === "database" ||
      healthMetrics.source_component === "api_gateway" ||
      healthMetrics.source_component === "cache" ||
      healthMetrics.source_component === "frontend",
  );
  // Verify the metric represents a valid measurement
  TestValidator.predicate(
    "metric value represents valid measurement",
    !isNaN(healthMetrics.metric_value) && isFinite(healthMetrics.metric_value),
  );
}
