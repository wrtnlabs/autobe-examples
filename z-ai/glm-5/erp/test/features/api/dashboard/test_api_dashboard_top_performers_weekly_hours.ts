import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDashboard";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationDashboard";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_dashboard_top_performers_weekly_hours(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create multiple employees (6 employees to test top 5 ranking)
  const employees = await ArrayUtil.asyncRepeat(6, async () => {
    const employee = await generate_random_erp_hrm_member_employees_create(
      ownerConnection,
      {},
    );
    return employee;
  });
  // 4. Assign all employees to the project
  await ArrayUtil.asyncForEach(employees, async (employee) => {
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employee.id,
          role: "member",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  });
  // 5. Create timelogs for current week with varying durations
  // Calculate current week's Monday
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentWeekMonday = new Date(now);
  currentWeekMonday.setDate(now.getDate() - daysToMonday);
  currentWeekMonday.setHours(12, 0, 0, 0); // Use noon to avoid timezone edge cases
  // Durations in minutes: 8h, 7h, 6h, 5h, 4h, 3h for distinguishable ranking
  const durations = [480, 420, 360, 300, 240, 180];
  const totalMinutes = durations.reduce((sum, d) => sum + d, 0);
  const expectedWeeklyHours = totalMinutes / 60;
  // Create timelogs using owner connection (owner can log time on behalf of assigned members)
  for (let i = 0; i < employees.length; i++) {
    await generate_random_erp_hrm_member_timelogs_create(ownerConnection, {
      body: {
        project_id: project.id,
        date: currentWeekMonday.toISOString(),
        duration: durations[i],
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    });
  }
  // 6. Call dashboard API
  const dashboard =
    await api.functional.erpHrm.member.reports.dashboard(ownerConnection);
  typia.assert(dashboard);
  // 7. Verify weeklyHours equals sum of all timelog durations converted to hours
  const hoursDiff = Math.abs(dashboard.weeklyHours - expectedWeeklyHours);
  TestValidator.predicate(
    "weeklyHours should match sum of timelogs",
    hoursDiff < 0.01,
  );
  // 8. Verify topPerformers array is sorted by hours_logged descending
  const topPerformers = dashboard.topPerformers;
  for (let i = 0; i < topPerformers.length - 1; i++) {
    TestValidator.predicate(
      "topPerformers should be sorted by hours_logged descending",
      topPerformers[i].hours_logged >= topPerformers[i + 1].hours_logged,
    );
  }
  // 9. Verify each top performer entry has valid employee summary with correct hours_logged
  // Top 5 should have hours corresponding to first 5 durations (since we have 6 employees)
  const topCount = Math.min(5, topPerformers.length);
  for (let i = 0; i < topCount; i++) {
    typia.assert(topPerformers[i].employee);
    const expectedHours = durations[i] / 60;
    const hoursDiffPerformer = Math.abs(
      topPerformers[i].hours_logged - expectedHours,
    );
    TestValidator.predicate(
      "hours_logged should match expected value",
      hoursDiffPerformer < 0.01,
    );
  }
  // 10. Validate that only current week timelogs are included
  // Create a timelog outside current week (previous week)
  const previousWeekMonday = new Date(currentWeekMonday);
  previousWeekMonday.setDate(currentWeekMonday.getDate() - 7);
  await generate_random_erp_hrm_member_timelogs_create(ownerConnection, {
    body: {
      project_id: project.id,
      date: previousWeekMonday.toISOString(),
      duration: 1000, // Large duration that shouldn't affect weekly hours
      billable: true,
    } satisfies IErpHrmTimelog.ICreate,
  });
  // Re-fetch dashboard and verify weeklyHours unchanged
  const dashboardAfterOffWeek =
    await api.functional.erpHrm.member.reports.dashboard(ownerConnection);
  typia.assert(dashboardAfterOffWeek);
  const hoursDiffAfterOffWeek = Math.abs(
    dashboardAfterOffWeek.weeklyHours - expectedWeeklyHours,
  );
  TestValidator.predicate(
    "weeklyHours should not include off-week timelogs",
    hoursDiffAfterOffWeek < 0.01,
  );
  // 11. Verify topPerformers contains at most 5 entries
  TestValidator.predicate(
    "topPerformers should have at most 5 entries",
    topPerformers.length <= 5,
  );
}
