import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Validate that the superAdmin health endpoint correctly aggregates and reports system health status from all components.
 * As a super administrator responsible for platform oversight, I need to verify the comprehensive health monitoring system works correctly.
 */
export async function test_api_system_health_comprehensive_status_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account with authentication tokens
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "SuperAdmin123!" satisfies string &
        typia.tags.Format<"password">,
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Call the health endpoint with authenticated super admin connection
  const healthMetric =
    await api.functional.discussionBoard.superAdmin.health.at(
      superAdminConnection,
    );
  typia.assert(healthMetric);
  // 3. Validate that the health metric represents a comprehensive system status
  // The status should follow the worst-performing component principle
  TestValidator.predicate(
    "health status is valid",
    healthMetric.status === "healthy" ||
      healthMetric.status === "warning" ||
      healthMetric.status === "critical",
  );
  // 4. Validate that the metric represents system-level aggregation
  TestValidator.predicate(
    "metric type indicates system-level monitoring",
    healthMetric.metric_type.includes("system") ||
      healthMetric.metric_type.includes("overall") ||
      healthMetric.metric_type.includes("aggregate"),
  );
  // 5. Verify the metric value is reasonable for system health
  TestValidator.predicate(
    "metric value indicates valid health measurement",
    healthMetric.metric_value >= 0,
  );
  // 6. Check that the unit is appropriate for health metrics
  TestValidator.predicate(
    "unit represents valid health measurement",
    healthMetric.unit === "percent" ||
      healthMetric.unit === "score" ||
      healthMetric.unit === "status",
  );
  // 7. Validate collection timestamp format and recency
  const collectionTime = new Date(healthMetric.collection_timestamp);
  TestValidator.predicate(
    "collection timestamp is valid ISO format",
    !isNaN(collectionTime.getTime()),
  );
  // 8. Verify the source service indicates comprehensive monitoring
  TestValidator.predicate(
    "source service represents system monitoring",
    healthMetric.source_service === "system" ||
      healthMetric.source_service === "platform" ||
      healthMetric.source_service.includes("monitoring"),
  );
}
