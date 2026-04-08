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
 * Test that an authenticated employee can retrieve their personal dashboard with active work data.
 *
 * Validates the dashboard endpoint returns properly structured data for an authenticated member. The test registers a new member, authenticates them, and retrieves their personal dashboard containing active tasks, recent timelogs, current timesheet status, project memberships, and summary statistics.
 *
 * The dashboard consolidates work activity data scoped to the employee's current organization context. All data fields are validated for proper structure even when empty or null, ensuring the API handles cases where the employee has no tasks, timelogs, or project assignments.
 *
 * 1. Register and authenticate a new member using authorize_member_join utility.
 * 2. Call GET /hrmTimeTrack/member/dashboard with the authenticated member connection.
 * 3. Validate response structure using typia.assert for complete type checking.
 * 4. Verify employee field contains the authenticated member's employee record.
 * 5. Verify activeTasks array exists and contains properly typed task summaries.
 * 6. Verify recentTimelogs array exists and contains properly typed timelog summaries.
 * 7. Verify currentTimesheet is present (may be null if no timesheet for current week).
 * 8. Verify projectMemberships array exists and contains properly typed membership summaries.
 * 9. Verify statistics object contains hoursLoggedThisWeek, totalActiveTasks, and pendingTimesheets.
 */
export async function test_api_dashboard_employee_with_active_work(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
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
  const dashboard =
    await api.functional.hrmTimeTrack.member.dashboard.at(memberConnection);
  // 3. Validate response structure - typia.assert performs complete type validation
  typia.assert<IHrmTimeTrackPersonalDashboard>(dashboard);
  // 4. Verify employee field exists and has valid structure
  TestValidator.predicate(
    "dashboard contains employee information",
    dashboard.employee !== undefined,
  );
  // 5. Verify statistics values are non-negative (business logic validation)
  TestValidator.predicate(
    "totalActiveTasks is non-negative",
    dashboard.statistics.totalActiveTasks >= 0,
  );
  TestValidator.predicate(
    "hoursLoggedThisWeek is non-negative",
    dashboard.statistics.hoursLoggedThisWeek >= 0,
  );
  TestValidator.predicate(
    "pendingTimesheets is non-negative",
    dashboard.statistics.pendingTimesheets >= 0,
  );
}
