import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
import type { IHrmPlatformDashboardIOrgMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboardIOrgMetric";
import type { IHrmPlatformDashboardIPersonalMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboardIPersonalMetric";
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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_dashboard_personal_metrics_display(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberResponse);
  // Step 2: Request personal dashboard metrics
  const dashboardRequest: IHrmPlatformDashboard.IRequest = {
    dashboard_type: "personal" as const,
  };
  const dashboardResponse: IHrmPlatformDashboard.IResponse =
    await api.functional.hrmPlatform.member.dashboard.metrics(
      memberConnection,
      { body: dashboardRequest },
    );
  typia.assert(dashboardResponse);
  // Step 3: Validate response structure
  TestValidator.equals(
    "dashboard type matches request",
    dashboardResponse.dashboard_type,
    "personal",
  );
  // Step 4: Validate personal_metrics exists
  TestValidator.notEquals(
    "personal_metrics is present",
    dashboardResponse.personal_metrics,
    null,
  );
  // Step 5: Validate personal_metrics structure
  const personalMetrics = dashboardResponse.personal_metrics!;
  typia.assert(personalMetrics);
  // Step 6: Validate hours_logged_today is non-negative integer
  TestValidator.predicate(
    "hours_logged_today is non-negative integer",
    () => personalMetrics.hours_logged_today >= 0,
  );
  // Step 7: Validate active_timer (can be null or valid timer)
  if (personalMetrics.active_timer !== null) {
    typia.assert(personalMetrics.active_timer);
    // Timer structure validated by typia.assert, verify references
    if (personalMetrics.active_timer.project !== null) {
      typia.assert(personalMetrics.active_timer.project);
    }
    if (personalMetrics.active_timer.task !== null) {
      typia.assert(personalMetrics.active_timer.task);
    }
  }
  // Step 8: Validate recent_timelogs (array with max 5 items)
  typia.assert(personalMetrics.recent_timelogs);
  TestValidator.predicate(
    "recent_timelogs is array with max 5 items",
    () => personalMetrics.recent_timelogs.length <= 5,
  );
  for (const timelog of personalMetrics.recent_timelogs) {
    typia.assert(timelog);
    // Timelog structure validated by typia.assert, verify references
    if (timelog.project !== null) {
      typia.assert(timelog.project);
    }
    if (timelog.task !== null) {
      typia.assert(timelog.task);
    }
  }
  // Step 9: Validate pending_timesheet_status
  typia.assert(personalMetrics.pending_timesheet_status);
  const timesheetStatus = personalMetrics.pending_timesheet_status;
  TestValidator.predicate("timesheet_status has valid status", () =>
    ["pending", "submitted", "approved", "rejected", "cancelled"].includes(
      timesheetStatus.status,
    ),
  );
  TestValidator.predicate(
    "rejection_reason is string or null",
    () =>
      timesheetStatus.rejection_reason === null ||
      typeof timesheetStatus.rejection_reason === "string",
  );
  // Step 10: Validate assigned_tasks (array)
  typia.assert(personalMetrics.assigned_tasks);
  TestValidator.predicate("assigned_tasks is array", () =>
    Array.isArray(personalMetrics.assigned_tasks),
  );
  for (const task of personalMetrics.assigned_tasks) {
    typia.assert(task);
    // Task structure validated by typia.assert, verify project reference
    if (task.project !== null) {
      typia.assert(task.project);
    }
    if (task.assignedEmployee !== null) {
      typia.assert(task.assignedEmployee);
    }
  }
  // Step 11: Validate org_metrics is null for personal dashboard
  TestValidator.equals(
    "org_metrics is null for personal dashboard",
    dashboardResponse.org_metrics,
    null,
  );
}
