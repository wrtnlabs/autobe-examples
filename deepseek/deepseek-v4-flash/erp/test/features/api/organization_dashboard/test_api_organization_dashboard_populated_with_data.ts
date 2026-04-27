import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationDashboard";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_tasks_create";
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { generate_random_hrm_time_tracking_member_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_member_timesheets_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_organization_dashboard_populated_with_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create a project with budget_hours = 40
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          budget_hours: 40,
        },
      },
    );
  typia.assert(project);
  // 4. Create a task within the project
  const task =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(task);
  // 5. Log 6 timelogs totaling ~36 hours (2160 minutes) across the current work week
  // Current week: Mon 2026-04-20 to Sun 2026-04-26
  const timelogEntries = [
    { date: "2026-04-20T09:00:00.000Z", duration_minutes: 480 }, // Mon - 8h
    { date: "2026-04-20T14:00:00.000Z", duration_minutes: 360 }, // Mon - 6h
    { date: "2026-04-21T09:00:00.000Z", duration_minutes: 480 }, // Tue - 8h
    { date: "2026-04-22T09:00:00.000Z", duration_minutes: 480 }, // Wed - 8h
    { date: "2026-04-23T09:00:00.000Z", duration_minutes: 240 }, // Thu - 4h
    { date: "2026-04-24T09:00:00.000Z", duration_minutes: 120 }, // Fri - 2h
  ] as const;
  // Total: 480+360+480+480+240+120 = 2160 minutes = 36 hours
  for (const entry of timelogEntries) {
    const timelog =
      await generate_random_hrm_time_tracking_member_timelogs_create(
        memberConnection,
        {
          body: {
            date: entry.date,
            duration_minutes: entry.duration_minutes,
            project_id: project.id,
            task_id: task.id,
            billable: true,
          },
        },
      );
    typia.assert(timelog);
  }
  // 6. Create a draft timesheet for the current work week (Monday = 2026-04-20)
  const timesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: "2026-04-20",
        },
      },
    );
  typia.assert(timesheet);
  // 7. Submit the timesheet for approval
  const submittedTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.submit(
      memberConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // 8. Fetch the organization dashboard
  const dashboard =
    await api.functional.hrmTimeTracking.member.dashboard.organization.at(
      memberConnection,
    );
  typia.assert(dashboard);
  // 9. Validate dashboard metrics
  TestValidator.predicate(
    "activeEmployeeCount >= 1",
    () => dashboard.activeEmployeeCount >= 1,
  );
  TestValidator.predicate("weeklyHours > 0", () => dashboard.weeklyHours > 0);
  TestValidator.predicate(
    "weeklyHours approximately 36",
    () => Math.abs(dashboard.weeklyHours - 36) < 5,
  );
  TestValidator.predicate(
    "pendingTimesheetCount >= 1",
    () => dashboard.pendingTimesheetCount >= 1,
  );
  TestValidator.predicate(
    "budgetAlerts is non-empty",
    () => dashboard.budgetAlerts.length > 0,
  );
  TestValidator.predicate(
    "topEmployees is non-empty",
    () => dashboard.topEmployees.length > 0,
  );
  // Validate budget alert details
  const alert = dashboard.budgetAlerts[0];
  TestValidator.equals("budget alert project id", alert.projectId, project.id);
  TestValidator.predicate(
    "budget alert budget hours equals 40",
    () => alert.budgetHours === 40,
  );
  TestValidator.predicate(
    "budget alert utilization > 80%",
    () => alert.utilizationPercent > 80,
  );
  // Validate top employee details
  TestValidator.predicate(
    "top employee has valid employeeId",
    () => typeof dashboard.topEmployees[0].employeeId === "string",
  );
  TestValidator.predicate(
    "top employee has valid totalHours",
    () => dashboard.topEmployees[0].totalHours > 0,
  );
}
