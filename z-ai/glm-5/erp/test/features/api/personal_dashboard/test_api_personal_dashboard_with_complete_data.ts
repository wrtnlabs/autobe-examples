import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPersonalDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPersonalDashboard";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_personal_dashboard_with_complete_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create tasks assigned to the employee
  const task1 = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: { status: "open", priority: "high" },
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: { status: "in-progress", priority: "medium" },
    },
  );
  typia.assert(task2);
  const task3 = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: { status: "open", priority: "urgent" },
    },
  );
  typia.assert(task3);
  // Get current date and week boundaries
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // 4. Create timelogs for today
  const todayTimelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: today.toISOString(),
        duration: 120, // 2 hours
        description: "Morning work",
        billable: true,
      },
    },
  );
  typia.assert(todayTimelog1);
  const todayTimelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: today.toISOString(),
        duration: 90, // 1.5 hours
        description: "Afternoon work",
        billable: true,
      },
    },
  );
  typia.assert(todayTimelog2);
  // Create timelogs earlier in the week
  const weekTimelogs = [];
  // Yesterday's timelog (if in same week)
  if (diffToMonday > -6) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayTimelog =
      await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
        body: {
          project_id: project.id,
          date: yesterday.toISOString(),
          duration: 180, // 3 hours
          description: "Yesterday work",
          billable: true,
        },
      });
    typia.assert(yesterdayTimelog);
    weekTimelogs.push(yesterdayTimelog);
  }
  // Two days ago timelog (if in same week)
  if (diffToMonday > -5) {
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    const twoDaysAgoTimelog =
      await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
        body: {
          project_id: project.id,
          date: twoDaysAgo.toISOString(),
          duration: 240, // 4 hours
          description: "Two days ago work",
          billable: true,
        },
      });
    typia.assert(twoDaysAgoTimelog);
    weekTimelogs.push(twoDaysAgoTimelog);
  }
  // 5. Start an active timer
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        description: "Current task timer",
      },
    },
  );
  typia.assert(timer);
  // 6. Create draft timesheet for current week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: monday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 7. Get personal dashboard
  const dashboard =
    await api.functional.erpHrm.member.dashboards.personal.at(memberConnection);
  typia.assert(dashboard);
  // 8. Verify hoursToday (120 + 90 = 210 minutes = 3.5 hours)
  const expectedHoursToday = (120 + 90) / 60;
  TestValidator.equals("hoursToday", dashboard.hoursToday, expectedHoursToday);
  // 9. Verify hoursThisWeek (includes all timelogs in the week)
  const allDurations = [120, 90, ...weekTimelogs.map((t) => t.duration)];
  const expectedHoursThisWeek =
    allDurations.reduce((sum: number, d: number) => sum + d, 0) / 60;
  TestValidator.equals(
    "hoursThisWeek",
    dashboard.hoursThisWeek,
    expectedHoursThisWeek,
  );
  // 10. Verify activeTimer
  TestValidator.predicate("activeTimer exists", dashboard.activeTimer !== null);
  if (dashboard.activeTimer !== null) {
    TestValidator.equals(
      "activeTimer project id",
      dashboard.activeTimer.project.id,
      project.id,
    );
    TestValidator.equals(
      "activeTimer description",
      dashboard.activeTimer.description,
      "Current task timer",
    );
  }
  // 11. Verify recentTimelogs (up to 5, ordered by created_at descending)
  TestValidator.predicate(
    "recentTimelogs length valid",
    dashboard.recentTimelogs.length > 0 && dashboard.recentTimelogs.length <= 5,
  );
  // Verify descending order
  for (let i = 0; i < dashboard.recentTimelogs.length - 1; i++) {
    const currentCreatedAt = new Date(
      dashboard.recentTimelogs[i].createdAt,
    ).getTime();
    const nextCreatedAt = new Date(
      dashboard.recentTimelogs[i + 1].createdAt,
    ).getTime();
    TestValidator.predicate(
      "recentTimelogs ordered by created_at descending",
      currentCreatedAt >= nextCreatedAt,
    );
  }
  // 12. Verify pendingTimesheet (should be draft)
  TestValidator.predicate(
    "pendingTimesheet exists",
    dashboard.pendingTimesheet !== null,
  );
  if (dashboard.pendingTimesheet !== null) {
    TestValidator.equals(
      "pendingTimesheet status",
      dashboard.pendingTimesheet.status,
      "draft",
    );
  }
  // 13. Verify assignedTasks (open or in-progress status)
  TestValidator.predicate(
    "assignedTasks length valid",
    dashboard.assignedTasks.length >= 2,
  );
  for (const task of dashboard.assignedTasks) {
    TestValidator.predicate(
      "assignedTask status is open or in-progress",
      task.status === "open" || task.status === "in-progress",
    );
  }
  // 14. Verify all tasks belong to the employee
  const assignedTaskIds = dashboard.assignedTasks.map((t) => t.id);
  TestValidator.predicate(
    "task1 in assignedTasks",
    assignedTaskIds.includes(task1.id),
  );
  TestValidator.predicate(
    "task2 in assignedTasks",
    assignedTaskIds.includes(task2.id),
  );
  TestValidator.predicate(
    "task3 in assignedTasks",
    assignedTaskIds.includes(task3.id),
  );
}
