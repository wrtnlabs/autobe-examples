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
 * Test monitoring endpoint for performance trend analysis capabilities.
 * Validate that the system provides recent metrics suitable for identifying
 * performance patterns and trends. Check that metric values include proper
 * timestamps for temporal analysis and that different metric types
 * (response_time, success_rate, error_rate, cpu_utilization, memory_usage)
 * are properly aggregated for dashboard display. Verify that the data supports
 * capacity planning decisions by providing quantitative measurements across
 * key performance indicators.
 */
export async function test_api_superadmin_monitoring_performance_trends(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Retrieve system health metrics
  const metrics =
    await api.functional.discussionBoard.superAdmin.monitoring.at(
      superAdminConnection,
    );
  typia.assert(metrics);
  // Validate essential fields for performance analysis
  TestValidator.predicate("metric has valid ID", metrics.id.length > 0);
  TestValidator.predicate(
    "metric type is defined",
    metrics.metric_type.length > 0,
  );
  TestValidator.predicate(
    "metric value is numeric",
    typeof metrics.metric_value === "number",
  );
  TestValidator.predicate("unit is defined", metrics.unit.length > 0);
  TestValidator.predicate(
    "source service is defined",
    metrics.source_service.length > 0,
  );
  TestValidator.predicate(
    "collection timestamp is valid",
    new Date(metrics.collection_timestamp).getTime() > 0,
  );
  TestValidator.predicate("status is defined", metrics.status.length > 0);
  // Verify temporal data integrity
  const collectionTime = new Date(metrics.collection_timestamp);
  const now = new Date();
  TestValidator.predicate(
    "collection timestamp is recent",
    now.getTime() - collectionTime.getTime() < 24 * 60 * 60 * 1000,
  );
}
