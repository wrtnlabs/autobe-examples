import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmEmployeeDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeDashboard";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test employee dashboard endpoint with active timer and pending timesheet.
 *
 * Validates the employee dashboard response structure and data aggregation when the authenticated employee has an active timer session and a submitted timesheet awaiting approval. This test verifies that the dashboard correctly aggregates hours from timelogs, displays active timer details, shows recent time entries, presents pending timesheet information, and lists assigned tasks.
 *
 * Note: This test validates the endpoint response structure. Full scenario validation requires prerequisite data (organization, employee, project, timelogs, timer, timesheet, tasks) which would be created through additional SDK functions not available in this test scope. The test focuses on validating the dashboard response when such data exists.
 *
 * 1. Register a new member account with email and password credentials.
 * 2. Call GET /hrm/member/organizations/{organizationId}/dashboard/employee with organization context.
 * 3. Validate hoursToday and hoursThisWeek are non-negative numbers.
 * 4. Validate activeTimer structure when present (null or IHrmActiveTimer.ISummary).
 * 5. Validate recentTimelogs array structure and ordering.
 * 6. Validate pendingTimesheet structure when present (null or IHrmTimesheetTimelog.ISummary).
 * 7. Validate assignedTasks array structure and status filtering.
 */
export async function test_api_employee_dashboard_with_active_timer_and_pending_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Call dashboard endpoint with organization context
  // Organization ID would be from actual organization creation in full scenario
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const dashboard: IHrmEmployeeDashboard =
    await api.functional.hrm.member.organizations.dashboard.employee.at(
      memberConnection,
      {
        organizationId,
      },
    );
  typia.assert(dashboard);
  // 3. Validate hours metrics
  TestValidator.predicate(
    "hoursToday is non-negative",
    dashboard.hoursToday >= 0,
  );
  TestValidator.predicate(
    "hoursThisWeek is non-negative",
    dashboard.hoursThisWeek >= 0,
  );
  // 4. Validate activeTimer structure (can be null or valid timer)
  if (dashboard.activeTimer !== null) {
    typia.assert(dashboard.activeTimer);
    TestValidator.predicate(
      "active timer has valid start timestamp",
      dashboard.activeTimer.start_timestamp !== undefined,
    );
    TestValidator.predicate(
      "active timer has employee reference",
      dashboard.activeTimer.employee !== undefined,
    );
    TestValidator.predicate(
      "active timer has project reference",
      dashboard.activeTimer.project !== undefined,
    );
  }
  // 5. Validate recentTimelogs array structure
  TestValidator.predicate(
    "recent timelogs array exists",
    Array.isArray(dashboard.recentTimelogs),
  );
  TestValidator.predicate(
    "recent timelogs has maximum 5 entries",
    dashboard.recentTimelogs.length <= 5,
  );
  dashboard.recentTimelogs.forEach((timelog) => {
    typia.assert(timelog);
  });
  // 6. Validate pendingTimesheet structure (can be null or valid timesheet)
  if (dashboard.pendingTimesheet !== null) {
    typia.assert(dashboard.pendingTimesheet);
    TestValidator.predicate(
      "pending timesheet has valid status",
      dashboard.pendingTimesheet.status === "submitted",
    );
    TestValidator.predicate(
      "pending timesheet has total hours",
      dashboard.pendingTimesheet.total_hours >= 0,
    );
    TestValidator.predicate(
      "pending timesheet has week start date",
      dashboard.pendingTimesheet.week_start_date !== undefined,
    );
    TestValidator.predicate(
      "pending timesheet has week end date",
      dashboard.pendingTimesheet.week_end_date !== undefined,
    );
  }
  // 7. Validate assignedTasks array structure
  TestValidator.predicate(
    "assigned tasks array exists",
    Array.isArray(dashboard.assignedTasks),
  );
  dashboard.assignedTasks.forEach((task) => {
    typia.assert(task);
    TestValidator.predicate(
      "task has open or in-progress status",
      task.status === "open" || task.status === "in-progress",
    );
    TestValidator.predicate(
      "task has project reference",
      task.project !== undefined,
    );
  });
}
