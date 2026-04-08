import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
 * Test member dashboard with no timelogs and no active timer.
 *
 * Validates the dashboard API returns correct empty/default state when a member
 * has just registered with an organization but has not created any employee records,
 * projects, tasks, timers, or timelogs yet. Tests that all dashboard fields are
 * properly initialized with zero counts, null references, and empty arrays.
 *
 * This test is critical for ensuring the dashboard handles the initial state
 * gracefully before any work tracking data exists, preventing potential
 * null reference errors or incorrect calculations.
 *
 * 1. Member registers and joins with random credentials via POST /hrmPlatform/auth/member/join.
 *    The system creates an organization with member as Owner.
 *
 * 2. Dashboard is accessed via GET /hrmPlatform/member/dashboard immediately after
 *    registration, before any employee/project/task/timer/timelog resources exist.
 *
 * 3. Validates dashboard returns correct empty state:
 *    - hoursLoggedToday equals 0 (no timelogs exist yet)
 *    - hoursLoggedThisWeek equals 0 (no timelogs exist yet)
 *    - activeTimer is null (no timers exist yet)
 *    - recentTimelogs is empty array (no timelogs exist yet)
 *    - pendingTimesheet is null (no timesheets exist yet)
 *    - assignedTasks is empty array (no tasks assigned yet)
 *
 * 4. Validates dashboard structure integrity - all required fields exist
 *    and have correct types even when empty.
 */
export async function test_api_member_dashboard_active_timer_no_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and create organization
  const joinConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResponse);
  // 2. Create member connection for dashboard access using token from auth response
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { ...connection.headers };
  memberConnection.headers.Authorization = authResponse.token.access;
  // 3. Call dashboard endpoint (no employee/project/task/timer/timelog created yet)
  const dashboard =
    await api.functional.hrmPlatform.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // 4. Validate hours logged today is 0 (no timelogs exist)
  TestValidator.equals("hoursLoggedToday", dashboard.hoursLoggedToday, 0);
  // 5. Validate hours logged this week is 0 (no timelogs exist)
  TestValidator.equals("hoursLoggedThisWeek", dashboard.hoursLoggedThisWeek, 0);
  // 6. Validate activeTimer is null (no timers exist yet)
  TestValidator.equals("activeTimer", dashboard.activeTimer, null);
  // 7. Validate recentTimelogs is empty array
  TestValidator.equals("recentTimelogs array", dashboard.recentTimelogs, []);
  // 8. Validate pendingTimesheet is null (no timesheets exist yet)
  TestValidator.equals("pendingTimesheet", dashboard.pendingTimesheet, null);
  // 9. Validate assignedTasks is empty array (no tasks assigned yet)
  TestValidator.equals("assignedTasks array", dashboard.assignedTasks, []);
  // 10. Validate all dashboard fields have correct types
  TestValidator.predicate(
    "hoursLoggedToday is number",
    typeof dashboard.hoursLoggedToday === "number",
  );
  TestValidator.predicate(
    "hoursLoggedThisWeek is number",
    typeof dashboard.hoursLoggedThisWeek === "number",
  );
  TestValidator.predicate(
    "recentTimelogs is array",
    Array.isArray(dashboard.recentTimelogs),
  );
  TestValidator.predicate(
    "assignedTasks is array",
    Array.isArray(dashboard.assignedTasks),
  );
}