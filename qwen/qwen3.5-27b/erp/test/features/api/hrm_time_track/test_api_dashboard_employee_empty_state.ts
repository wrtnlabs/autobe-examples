import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackPersonalDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackPersonalDashboard";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import type { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated employee with no active work data receives an empty dashboard.
 *
 * Validates the dashboard empty state scenario where an authenticated employee has no active tasks, no timelogs for the current week, no project memberships, and no timesheet. Ensures the dashboard correctly returns empty arrays, null timesheet, and zero statistics while still providing the employee's identity information.
 *
 * Special attention is given to verifying that the dashboard handles the empty state gracefully without errors, and that all computed statistics correctly reflect zero values when no work data exists.
 *
 * 1. Register and authenticate as a member using authorize_member_join utility.
 * 2. Call GET /hrmTimeTrack/member/dashboard with authenticated member connection.
 * 3. Validate response structure with typia.assert.
 * 4. Verify employee field contains authenticated employee's information.
 * 5. Verify activeTasks array is empty.
 * 6. Verify recentTimelogs array is empty.
 * 7. Verify currentTimesheet is null (no timesheet for current week).
 * 8. Verify projectMemberships array is empty.
 * 9. Verify statistics.totalActiveTasks equals 0.
 * 10. Verify statistics.hoursLoggedThisWeek equals 0.
 * 11. Verify statistics.pendingTimesheets equals 0.
 */
export async function test_api_dashboard_employee_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Call dashboard endpoint
  const dashboard: IHrmTimeTrackPersonalDashboard =
    await api.functional.hrmTimeTrack.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // 3. Verify employee information is present (business logic validation)
  TestValidator.predicate(
    "employee has valid ID",
    dashboard.employee.id.length > 0,
  );
  TestValidator.predicate(
    "employee member has valid email",
    dashboard.employee.member.email.length > 0,
  );
  // 4. Verify activeTasks array is empty
  TestValidator.equals("activeTasks is empty", dashboard.activeTasks.length, 0);
  // 5. Verify recentTimelogs array is empty
  TestValidator.equals(
    "recentTimelogs is empty",
    dashboard.recentTimelogs.length,
    0,
  );
  // 6. Verify currentTimesheet is null
  TestValidator.equals(
    "currentTimesheet is null",
    dashboard.currentTimesheet,
    null,
  );
  // 7. Verify projectMemberships array is empty
  TestValidator.equals(
    "projectMemberships is empty",
    dashboard.projectMemberships.length,
    0,
  );
  // 8. Verify statistics.totalActiveTasks equals 0
  TestValidator.equals(
    "totalActiveTasks is zero",
    dashboard.statistics.totalActiveTasks,
    0,
  );
  // 9. Verify statistics.hoursLoggedThisWeek equals 0
  TestValidator.equals(
    "hoursLoggedThisWeek is zero",
    dashboard.statistics.hoursLoggedThisWeek,
    0,
  );
  // 10. Verify statistics.pendingTimesheets equals 0
  TestValidator.equals(
    "pendingTimesheets is zero",
    dashboard.statistics.pendingTimesheets,
    0,
  );
}
