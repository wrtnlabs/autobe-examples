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
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_personal_dashboard_partial_data(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a new member (creates organization context automatically)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(memberAuth);
  // Step 2: Create a project
  const project: IErpHrmProject =
    await generate_random_erp_hrm_member_projects_create(memberConnection, {});
  typia.assert(project);
  // Step 3: Create a task assigned to the current employee
  // Note: We need employee_id - this is the member's employee record in the organization
  // The task creation requires knowing the employee_id
  const task: IErpHrmTask =
    await generate_random_erp_hrm_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "open",
          priority: "medium",
        },
      },
    );
  typia.assert(task);
  // Step 4: Create timelog entries for earlier in the week (not today)
  // Calculate dates for earlier this week
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const startOfWeek = new Date(now);
  // Monday is day 1, Sunday is day 0
  // If today is Sunday (0), Monday was 6 days ago
  // If today is Monday (1), Monday is today
  // If today is Tuesday (2), Monday was 1 day ago
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(now.getDate() - daysFromMonday);
  startOfWeek.setHours(0, 0, 0, 0);
  // Create timelogs for earlier days this week (not today)
  const timelogDurations: number[] = [120, 90, 150]; // 2h, 1.5h, 2.5h in minutes
  const createdTimelogs: IErpHrmTimelog[] = [];
  // Create timelogs for days 0, 1, 2 of the week (Monday, Tuesday, Wednesday)
  // as long as they are before today
  for (let i = 0; i < timelogDurations.length; i++) {
    const timelogDate = new Date(startOfWeek);
    timelogDate.setDate(startOfWeek.getDate() + i); // Day i of the week (0 = Monday)
    // Skip if this would be today or in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (timelogDate.getTime() >= today.getTime()) continue;
    const timelog: IErpHrmTimelog =
      await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
        body: {
          project_id: project.id,
          task_id: task.id,
          date: timelogDate.toISOString(),
          duration: timelogDurations[i],
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable: true,
        },
      });
    typia.assert(timelog);
    createdTimelogs.push(timelog);
  }
  // Calculate expected hours from actually created timelogs
  const expectedHoursThisWeek = createdTimelogs.reduce(
    (sum, timelog) => sum + timelog.duration / 60,
    0,
  );
  // Step 5: Create a draft timesheet for the current week
  const weekStartDate = new Date(startOfWeek);
  const timesheet: IErpHrmTimesheet =
    await generate_random_erp_hrm_member_timesheets_create(memberConnection, {
      body: {
        week_start_date: weekStartDate.toISOString(),
      },
    });
  typia.assert(timesheet);
  // Step 6: Get the personal dashboard
  const dashboard: IErpHrmPersonalDashboard =
    await api.functional.erpHrm.member.dashboards.personal.at(memberConnection);
  typia.assert(dashboard);
  // Verification: hoursToday should be 0 (no timelogs today)
  TestValidator.equals("hoursToday should be 0", dashboard.hoursToday, 0);
  // Verification: hoursThisWeek should show sum of week's timelog durations
  TestValidator.predicate(
    "hoursThisWeek should match sum of created timelogs",
    createdTimelogs.length === 0
      ? dashboard.hoursThisWeek === 0
      : Math.abs(dashboard.hoursThisWeek - expectedHoursThisWeek) < 0.01,
  );
  // Verification: activeTimer should be null (no timer running)
  TestValidator.equals(
    "activeTimer should be null",
    dashboard.activeTimer,
    null,
  );
  // Verification: recentTimelogs should contain the created timelogs
  if (createdTimelogs.length > 0) {
    TestValidator.predicate(
      "recentTimelogs should contain created timelogs",
      createdTimelogs.every((created) =>
        dashboard.recentTimelogs.some((recent) => recent.id === created.id),
      ),
    );
  }
  // Verification: pendingTimesheet should show draft timesheet
  TestValidator.predicate(
    "pendingTimesheet should exist and have draft status",
    dashboard.pendingTimesheet !== null &&
      dashboard.pendingTimesheet.status === "draft",
  );
  // Verification: assignedTasks should show the assigned task
  TestValidator.predicate(
    "assignedTasks should contain the created task",
    dashboard.assignedTasks.some((assignedTask) => assignedTask.id === task.id),
  );
  // Business rule validation: Dashboard aggregation distinguishes between today and this week
  if (createdTimelogs.length > 0) {
    TestValidator.predicate(
      "Dashboard correctly handles zero today hours with positive week hours",
      dashboard.hoursToday === 0 && dashboard.hoursThisWeek > 0,
    );
  }
}
