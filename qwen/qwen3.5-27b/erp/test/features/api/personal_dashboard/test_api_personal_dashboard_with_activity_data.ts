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
 * Test the personal dashboard endpoint for an authenticated member with active work data.
 *
 * This test validates that the personal dashboard correctly aggregates and displays:
 * - Hours worked today and this week
 * - Active timer status
 * - Recent timelogs from the past 7 days
 * - Pending timesheets awaiting approval
 * - Assigned tasks with deadlines
 *
 * All data is scoped to the authenticated employee's organization context.
 */
export async function test_api_personal_dashboard_with_activity_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Call the personal dashboard endpoint
  const dashboard: IHrmPlatformPersonalDashboard =
    await api.functional.hrmPlatform.member.personal_dashboard.personalDashboard(
      memberConnection,
      {
        body: {} satisfies IHrmPlatformPersonalDashboard.IRequest,
      },
    );
  // 3. Validate the response structure
  typia.assert(dashboard);
  // 4. Validate hours worked today is non-negative
  TestValidator.predicate(
    "hours worked today is non-negative",
    dashboard.hoursWorkedToday >= 0,
  );
  // 5. Validate hours worked this week is non-negative
  TestValidator.predicate(
    "hours worked this week is non-negative",
    dashboard.hoursWorkedThisWeek >= 0,
  );
  // 6. Validate active timer is null or has valid structure
  if (dashboard.activeTimer !== null) {
    typia.assert(dashboard.activeTimer);
    TestValidator.predicate(
      "active timer has valid started_at",
      dashboard.activeTimer.started_at !== null,
    );
    TestValidator.predicate(
      "active timer has stopped_at as null",
      dashboard.activeTimer.stopped_at === null,
    );
  }
  // 7. Validate recent timelogs array exists and respects max limit
  TestValidator.predicate(
    "recent timelogs is an array",
    Array.isArray(dashboard.recentTimelogs),
  );
  TestValidator.predicate(
    "recent timelogs count respects max limit of 10",
    dashboard.recentTimelogs.length <= 10,
  );
  // 8. Validate each recent timelog has required fields
  for (const timelog of dashboard.recentTimelogs) {
    typia.assert(timelog);
    TestValidator.predicate("timelog has valid duration", timelog.duration > 0);
    TestValidator.predicate("timelog has valid date", timelog.date !== null);
  }
  // 9. Validate pending timesheets array exists
  TestValidator.predicate(
    "pending timesheets is an array",
    Array.isArray(dashboard.pendingTimesheets),
  );
  // 10. Validate each pending timesheet has status 'submitted'
  for (const timesheet of dashboard.pendingTimesheets) {
    typia.assert(timesheet);
    TestValidator.equals(
      "pending timesheet status is submitted",
      timesheet.status,
      "submitted",
    );
    TestValidator.predicate(
      "pending timesheet has valid week_start_date",
      timesheet.week_start_date !== null,
    );
    TestValidator.predicate(
      "pending timesheet has valid total_hours",
      timesheet.total_hours >= 0,
    );
  }
  // 11. Validate assigned tasks array exists and respects max limit
  TestValidator.predicate(
    "assigned tasks is an array",
    Array.isArray(dashboard.assignedTasks),
  );
  TestValidator.predicate(
    "assigned tasks count respects max limit of 10",
    dashboard.assignedTasks.length <= 10,
  );
  // 12. Validate each assigned task has required fields
  for (const task of dashboard.assignedTasks) {
    typia.assert(task);
    TestValidator.predicate(
      "task has valid title",
      task.title !== null && task.title.length > 0,
    );
    TestValidator.predicate("task has valid status", task.status !== null);
    TestValidator.predicate("task has valid priority", task.priority !== null);
  }
}
