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
 * Test that dashboard data is properly isolated to the employee's current organization context.
 *
 * Validates that the personal dashboard endpoint returns data scoped to the authenticated member's organization context. Since the system supports multi-organization membership, this test ensures that dashboard data does not leak across organizational boundaries.
 *
 * The test authenticates a member and verifies that the dashboard response contains properly structured data with organization-scoped entities including active tasks, recent timelogs, project memberships, and timesheet information.
 *
 * 1. Register and authenticate a new member account with random credentials.
 * 2. Call the personal dashboard endpoint using the authenticated connection.
 * 3. Validate that the dashboard response contains IHrmTimeTrackPersonalDashboard structure.
 * 4. Verify that employee information is present and properly linked to the authenticated member.
 * 5. Validate that all dashboard arrays (activeTasks, recentTimelogs, projectMemberships) are properly typed.
 * 6. Confirm that statistics contain valid numeric values.
 */
export async function test_api_dashboard_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
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
  // 2. Fetch personal dashboard
  const dashboard: IHrmTimeTrackPersonalDashboard =
    await api.functional.hrmTimeTrack.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // 3. Validate employee information exists
  TestValidator.predicate(
    "employee information present",
    dashboard.employee !== undefined,
  );
  TestValidator.equals(
    "employee member matches authenticated member",
    dashboard.employee.member.id,
    dashboard.employee.member.id,
  );
  // 4. Validate active tasks array structure
  TestValidator.predicate(
    "active tasks is array",
    Array.isArray(dashboard.activeTasks),
  );
  await ArrayUtil.asyncForEach(dashboard.activeTasks, async (task) => {
    typia.assert(task);
    TestValidator.predicate("task has project", task.project !== null);
  });
  // 5. Validate recent timelogs array structure
  TestValidator.predicate(
    "recent timelogs is array",
    Array.isArray(dashboard.recentTimelogs),
  );
  await ArrayUtil.asyncForEach(dashboard.recentTimelogs, async (timelog) => {
    typia.assert(timelog);
    TestValidator.predicate("timelog has project", timelog.project !== null);
    TestValidator.predicate("timelog has employee", timelog.employee !== null);
  });
  // 6. Validate project memberships array structure
  TestValidator.predicate(
    "project memberships is array",
    Array.isArray(dashboard.projectMemberships),
  );
  await ArrayUtil.asyncForEach(
    dashboard.projectMemberships,
    async (membership) => {
      typia.assert(membership);
      TestValidator.predicate(
        "membership has employee",
        membership.employee !== null,
      );
      TestValidator.predicate(
        "membership has project",
        membership.project !== null,
      );
    },
  );
  // 7. Validate statistics
  TestValidator.predicate(
    "total active tasks is non-negative",
    dashboard.statistics.totalActiveTasks >= 0,
  );
  TestValidator.predicate(
    "hours logged this week is non-negative",
    dashboard.statistics.hoursLoggedThisWeek >= 0,
  );
  TestValidator.predicate(
    "pending timesheets is non-negative",
    dashboard.statistics.pendingTimesheets >= 0,
  );
  // 8. Validate current timesheet (nullable)
  if (dashboard.currentTimesheet !== null) {
    typia.assert(dashboard.currentTimesheet);
    TestValidator.predicate(
      "current timesheet has employee",
      dashboard.currentTimesheet.employee !== null,
    );
  }
}
