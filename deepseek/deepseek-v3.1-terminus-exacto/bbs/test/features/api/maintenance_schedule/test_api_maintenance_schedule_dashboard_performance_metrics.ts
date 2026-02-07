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

export async function test_api_maintenance_schedule_dashboard_performance_metrics(
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
  // Get dashboard data and validate structure
  const dashboard =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.dashboard(
      superAdminConnection,
    );
  typia.assert(dashboard);
  // Validate dashboard structure
  TestValidator.predicate(
    "upcoming_maintenance_count is non-negative",
    dashboard.upcoming_maintenance_count >= 0,
  );
  TestValidator.predicate(
    "completed_maintenance_count is non-negative",
    dashboard.completed_maintenance_count >= 0,
  );
  TestValidator.predicate(
    "completion_rate is valid percentage",
    dashboard.completion_rate >= 0 && dashboard.completion_rate <= 100,
  );
  // Validate breakdown arrays
  TestValidator.predicate(
    "maintenance_type_breakdown is array",
    Array.isArray(dashboard.maintenance_type_breakdown),
  );
  TestValidator.predicate(
    "impact_level_breakdown is array",
    Array.isArray(dashboard.impact_level_breakdown),
  );
  TestValidator.predicate(
    "recent_maintenance_activity is array",
    Array.isArray(dashboard.recent_maintenance_activity),
  );
  // Validate maintenance_type_breakdown structure
  for (const breakdown of dashboard.maintenance_type_breakdown) {
    TestValidator.predicate(
      "breakdown has maintenance_type",
      typeof breakdown.maintenance_type === "string",
    );
    TestValidator.predicate("breakdown has valid count", breakdown.count >= 0);
  }
  // Validate impact_level_breakdown structure
  for (const breakdown of dashboard.impact_level_breakdown) {
    TestValidator.predicate(
      "breakdown has impact_level",
      typeof breakdown.impact_level === "string",
    );
    TestValidator.predicate("breakdown has valid count", breakdown.count >= 0);
  }
  // Validate recent_maintenance_activity structure
  TestValidator.predicate(
    "recent activity has max 5 items",
    dashboard.recent_maintenance_activity.length <= 5,
  );
  for (const activity of dashboard.recent_maintenance_activity) {
    TestValidator.predicate(
      "activity has scheduled_end_time",
      typeof activity.scheduled_end_time === "string",
    );
    TestValidator.predicate(
      "activity has estimated_duration_minutes",
      activity.estimated_duration_minutes >= 0,
    );
    TestValidator.predicate(
      "activity has maintenance_type",
      typeof activity.maintenance_type === "string",
    );
    TestValidator.predicate(
      "activity has description",
      typeof activity.description === "string",
    );
    TestValidator.predicate(
      "activity has scheduled_start_time",
      typeof activity.scheduled_start_time === "string",
    );
    TestValidator.predicate(
      "activity has status",
      typeof activity.status === "string",
    );
    TestValidator.predicate(
      "activity has impact_level",
      typeof activity.impact_level === "string",
    );
    TestValidator.predicate(
      "activity has scheduled_by_admin",
      typeof activity.scheduled_by_admin === "object",
    );
    TestValidator.predicate(
      "activity has created_at",
      typeof activity.created_at === "string",
    );
    TestValidator.predicate(
      "activity has updated_at",
      typeof activity.updated_at === "string",
    );
    // Validate admin summary structure
    const admin = activity.scheduled_by_admin;
    TestValidator.predicate("admin has id", typeof admin.id === "string");
    TestValidator.predicate("admin has email", typeof admin.email === "string");
    TestValidator.predicate(
      "admin has display_name",
      typeof admin.display_name === "string",
    );
    TestValidator.predicate(
      "admin has created_at",
      typeof admin.created_at === "string",
    );
  }
  // Test that average_duration_difference is a number (can be positive, negative, or zero)
  TestValidator.predicate(
    "average_duration_difference is number",
    typeof dashboard.average_duration_difference === "number",
  );
}
