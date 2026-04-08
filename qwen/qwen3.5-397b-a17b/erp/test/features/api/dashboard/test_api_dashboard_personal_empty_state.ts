import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
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
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test personal dashboard endpoint for authenticated employee with no activity data (empty state).
 *
 * Validates the dashboard response when a newly registered member has no time tracking activity, no timer sessions, no timesheets, and no assigned tasks. This empty state scenario ensures the dashboard gracefully handles the absence of data with appropriate default values.
 *
 * The test verifies that numeric aggregates return 0, optional objects return null, and list fields return empty arrays. This confirms the dashboard endpoint properly initializes all fields even when the underlying data sources are empty.
 *
 * 1. Member joins with randomized credentials and receives authentication tokens.
 * 2. Dashboard endpoint is called with the authenticated member connection.
 * 3. Validates hoursToday equals 0 (no timelogs for current date).
 * 4. Validates hoursThisWeek equals 0 (no timelogs in current week).
 * 5. Validates activeTimer is null (no running timer session).
 * 6. Validates recentTimelogs is empty array (no timelog entries).
 * 7. Validates pendingTimesheet is null (no timesheet for current week).
 * 8. Validates assignedTasks is empty array (no open or in-progress tasks).
 */
export async function test_api_dashboard_personal_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Fetch personal dashboard
  const dashboard: IHrmPlatformDashboard.IPersonal =
    await api.functional.hrmPlatform.member.dashboard.personal(
      memberConnection,
    );
  typia.assert(dashboard);
  // 3. Validate empty state values
  TestValidator.equals("hours today is zero", dashboard.hoursToday, 0);
  TestValidator.equals("hours this week is zero", dashboard.hoursThisWeek, 0);
  TestValidator.equals("active timer is null", dashboard.activeTimer, null);
  TestValidator.equals(
    "recent timelogs is empty",
    dashboard.recentTimelogs,
    [],
  );
  TestValidator.equals(
    "pending timesheet is null",
    dashboard.pendingTimesheet,
    null,
  );
  TestValidator.equals("assigned tasks is empty", dashboard.assignedTasks, []);
}
