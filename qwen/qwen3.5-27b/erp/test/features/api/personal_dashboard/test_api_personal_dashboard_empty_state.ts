import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformPersonalDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPersonalDashboard";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the personal dashboard endpoint for an authenticated member with no activity data (empty state scenario).
 *
 * This test verifies that the personal dashboard correctly handles empty states:
 * - No timelogs exist (hours worked = 0)
 * - No active timer session
 * - No recent timelogs
 * - No pending timesheets
 * - No assigned tasks
 */
export async function test_api_personal_dashboard_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Call personal dashboard endpoint with authenticated member
  const dashboard =
    await api.functional.hrmPlatform.member.personal_dashboard.personalDashboard(
      memberConnection,
      {
        body: {} satisfies IHrmPlatformPersonalDashboard.IRequest,
      },
    );
  typia.assert(dashboard);
  // 3. Validate empty state values
  TestValidator.equals("hoursWorkedToday is 0", dashboard.hoursWorkedToday, 0);
  TestValidator.equals(
    "hoursWorkedThisWeek is 0",
    dashboard.hoursWorkedThisWeek,
    0,
  );
  TestValidator.equals("activeTimer is null", dashboard.activeTimer, null);
  TestValidator.equals(
    "recentTimelogs is empty array",
    dashboard.recentTimelogs.length,
    0,
  );
  TestValidator.equals(
    "pendingTimesheets is empty array",
    dashboard.pendingTimesheets.length,
    0,
  );
  TestValidator.equals(
    "assignedTasks is empty array",
    dashboard.assignedTasks.length,
    0,
  );
}
