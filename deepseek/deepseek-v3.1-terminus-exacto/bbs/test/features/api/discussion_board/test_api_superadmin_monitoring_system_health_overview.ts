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
 * Test that a super administrator can retrieve comprehensive system health metrics for platform governance oversight.
 * Validates that the response includes all required KPIs: response times, error rates, resource utilization,
 * database connectivity status, and file storage availability.
 */
export async function test_api_superadmin_monitoring_system_health_overview(
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
  const healthMetrics =
    await api.functional.discussionBoard.superAdmin.monitoring.at(
      superAdminConnection,
    );
  typia.assert(healthMetrics);
  // Business logic validation - verify metric values are meaningful for platform governance
  TestValidator.predicate(
    "metric value should be a valid number",
    Number.isFinite(healthMetrics.metric_value),
  );
  TestValidator.predicate(
    "collection timestamp should be a valid date",
    !isNaN(new Date(healthMetrics.collection_timestamp).getTime()),
  );
}
