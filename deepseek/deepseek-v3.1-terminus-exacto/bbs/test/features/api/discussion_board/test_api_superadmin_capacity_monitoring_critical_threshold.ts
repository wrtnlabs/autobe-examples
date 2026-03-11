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
 * Test capacity monitoring when storage utilization reaches critical threshold (above 85%).
 * Verify that the response correctly identifies the critical status for storage utilization
 * and provides comprehensive system metrics. Validate that the alert status transitions
 * to 'critical' when utilization exceeds 85%, ensuring super administrators receive
 * immediate alerts for urgent capacity issues that could impact platform performance.
 */
export async function test_api_superadmin_capacity_monitoring_critical_threshold(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Get capacity metrics
  const capacitySummary =
    await api.functional.discussionBoard.superAdmin.alerts.capacity.at(
      superAdminConnection,
    );
  typia.assert(capacitySummary);
  // 3. Validate critical threshold logic
  if (capacitySummary.storage_utilization.current_value > 85) {
    TestValidator.equals(
      "alert status should be critical when utilization exceeds 85%",
      capacitySummary.storage_utilization.alert_status,
      "critical",
    );
  }
}
