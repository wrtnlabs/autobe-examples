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

/**
 * Test the maintenance schedule dashboard with completed maintenance records.
 * Since maintenance schedule creation endpoints are not available in the provided API,
 * this test validates that the dashboard endpoint returns valid data structure
 * and handles the existing maintenance records correctly.
 */
export async function test_api_maintenance_schedule_dashboard_with_completed_maintenance(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Get dashboard data
  const dashboard =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.dashboard(
      superAdminConnection,
    );
  typia.assert(dashboard);
  // Validate business logic constraints that typia.assert() doesn't cover
  TestValidator.predicate(
    "completion_rate valid range",
    dashboard.completion_rate >= 0 && dashboard.completion_rate <= 100,
  );
  // Validate breakdown arrays contain valid data
  for (const breakdown of dashboard.maintenance_type_breakdown) {
    TestValidator.predicate(
      "maintenance_type_breakdown count non-negative",
      breakdown.count >= 0,
    );
  }
  for (const breakdown of dashboard.impact_level_breakdown) {
    TestValidator.predicate(
      "impact_level_breakdown count non-negative",
      breakdown.count >= 0,
    );
  }
  // Note: Since maintenance schedule creation endpoints are not available,
  // we cannot create test data with specific statuses to validate the
  // filtering logic described in the scenario. This test validates the
  // basic functionality and structure of the dashboard endpoint.
}
