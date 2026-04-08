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
 * Test personal dashboard endpoint for authenticated member with empty activity state.
 *
 * Validates the personal dashboard endpoint returns correct structure and handles empty state gracefully for a newly authenticated member. Since the available API functions only include member authentication and dashboard retrieval (no functions to create timelogs, timers, timesheets, tasks, projects, or organizations), this test focuses on validating the response structure and type correctness.
 *
 * The test ensures that all dashboard sections are present in the response with appropriate default values when no activity data exists: zero hours logged, null active timer, empty timelogs array, null pending timesheet, and empty assigned tasks array.
 *
 * 1. Member registers with randomized credentials and receives authentication tokens.
 * 2. Dashboard endpoint is called with authenticated connection.
 * 3. Response structure is validated using typia.assert() for complete type checking.
 * 4. Key fields are verified: hoursToday and hoursThisWeek are 0, activeTimer is null, recentTimelogs is empty array, pendingTimesheet is null, assignedTasks is empty array.
 */
export async function test_api_dashboard_personal_with_activity_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Get personal dashboard
  const dashboard =
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
    dashboard.recentTimelogs.length,
    0,
  );
  TestValidator.equals(
    "pending timesheet is null",
    dashboard.pendingTimesheet,
    null,
  );
  TestValidator.equals(
    "assigned tasks is empty",
    dashboard.assignedTasks.length,
    0,
  );
}
