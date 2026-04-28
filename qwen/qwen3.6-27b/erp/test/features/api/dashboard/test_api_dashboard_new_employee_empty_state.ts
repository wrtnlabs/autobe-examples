import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPersonalDashboardView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPersonalDashboardView";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that the personal dashboard correctly returns zero/null values for a newly registered member with no activity data.
 *
 * Validates the complete dashboard initialization flow for a brand new member. Ensures that the dashboard gracefully handles empty data states without errors and correctly aggregates zero values for hours and empty arrays for list fields.
 *
 * Special attention is given to verifying that all nullable and array fields are properly initialized to their default empty states (null or empty array) when no timelogs, timers, timesheets, or tasks exist for the new employee.
 *
 * 1. Member joins the platform and automatically creates an organization.
 * 2. Member authenticates and retrieves the personal dashboard.
 * 3. Validates dashboard fields match expected empty state defaults.
 */
export async function test_api_dashboard_new_employee_empty_state(
  connection: api.IConnection,
) {
  // 1. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: "Test Member",
      href: "https://test.com",
      referrer: "https://test.com/ref",
      ip: "127.0.0.1",
    },
  });
  // 2. Retrieve personal dashboard
  const dashboard: IPersonalDashboardView =
    await api.functional.hrmPlatform.member.personal_dashboard.at(
      memberConnection,
    );
  typia.assert(dashboard);
  // 3. Validate empty state
  TestValidator.equals("hoursToday is 0", dashboard.hoursToday, 0);
  TestValidator.equals("hoursThisWeek is 0", dashboard.hoursThisWeek, 0);
  TestValidator.equals("activeTimer is null", dashboard.activeTimer, null);
  TestValidator.predicate(
    "recentTimelogs is empty",
    dashboard.recentTimelogs.length === 0,
  );
  TestValidator.equals(
    "pendingTimesheet is null",
    dashboard.pendingTimesheet,
    null,
  );
  TestValidator.predicate(
    "assignedTasks is empty",
    dashboard.assignedTasks.length === 0,
  );
}
