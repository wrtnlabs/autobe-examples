import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
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

export async function test_api_maintenance_schedule_dashboard_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin using the utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: "test-admin@example.com",
      password: "test-password-123",
      privilege_level: "super_admin",
    },
  });
  // Call the dashboard endpoint
  const dashboard =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.dashboard(
      superAdminConnection,
    );
  typia.assert(dashboard);
  // Validate empty state metrics
  TestValidator.equals(
    "upcoming maintenance count should be 0",
    dashboard.upcoming_maintenance_count,
    0,
  );
  TestValidator.equals(
    "completed maintenance count should be 0",
    dashboard.completed_maintenance_count,
    0,
  );
  TestValidator.equals(
    "completion rate should be 0.0",
    dashboard.completion_rate,
    0.0,
  );
  TestValidator.equals(
    "average duration difference should be 0.0",
    dashboard.average_duration_difference,
    0.0,
  );
  // Validate empty arrays
  TestValidator.equals(
    "maintenance type breakdown should be empty",
    dashboard.maintenance_type_breakdown.length,
    0,
  );
  TestValidator.equals(
    "impact level breakdown should be empty",
    dashboard.impact_level_breakdown.length,
    0,
  );
  TestValidator.equals(
    "recent maintenance activity should be empty",
    dashboard.recent_maintenance_activity.length,
    0,
  );
}
