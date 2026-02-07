import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_maintenance_schedule_dashboard_overview(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Access the maintenance schedule dashboard
  const dashboard =
    await api.functional.discussionBoard.admin.maintenance_schedules.dashboard(
      adminConnection,
    );
  typia.assert(dashboard);
  // Validate dashboard structure contains expected maintenance schedule properties
  TestValidator.predicate("dashboard has id", typeof dashboard.id === "string");
  TestValidator.predicate(
    "dashboard has maintenance type",
    typeof dashboard.maintenance_type === "string",
  );
  TestValidator.predicate(
    "dashboard has status",
    typeof dashboard.status === "string",
  );
  TestValidator.predicate(
    "dashboard has impact level",
    typeof dashboard.impact_level === "string",
  );
  TestValidator.predicate(
    "dashboard has description",
    typeof dashboard.description === "string",
  );
  TestValidator.predicate(
    "dashboard has scheduled start time",
    typeof dashboard.scheduled_start_time === "string",
  );
  TestValidator.predicate(
    "dashboard has scheduled end time",
    typeof dashboard.scheduled_end_time === "string",
  );
  TestValidator.predicate(
    "dashboard has estimated duration",
    typeof dashboard.estimated_duration_minutes === "number",
  );
  // Note: The dashboard endpoint returns a single maintenance schedule summary,
  // not aggregated statistics. The actual aggregation would be handled by
  // the backend service logic which we cannot directly test through this endpoint.
  // This test validates that the dashboard endpoint returns a valid maintenance
  // schedule structure as expected.
}
