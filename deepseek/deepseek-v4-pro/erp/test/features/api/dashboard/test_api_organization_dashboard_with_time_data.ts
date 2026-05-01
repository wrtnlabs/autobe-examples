import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_organization_dashboard_with_time_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member — creates an organization and establishes session context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project with a defined budget so it can appear in the projects_over_budget metric
  const budgetHours = 10;
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    { body: { budget_hours: budgetHours } },
  );
  typia.assert(project);
  // 3. Assign the authenticated employee as a project member to enable timelog creation
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      { params: { projectId: project.id } },
    );
  typia.assert(projectMember);
  // 4. Create three timelog entries within the current calendar week (Mon 2026-04-27 – Sun 2026-05-03)
  //    Total duration: 240 + 200 + 180 = 620 minutes = 10.33 hours, exceeding 80% of budget (8.0 hrs)
  const duration1 = 240;
  const duration2 = 200;
  const duration3 = 180;
  const totalDurationMinutes = duration1 + duration2 + duration3;
  const expectedTotalHours =
    Math.round((totalDurationMinutes / 60) * 100) / 100;
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: "2026-04-28",
        duration_minutes: duration1,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: "2026-04-29",
        duration_minutes: duration2,
      },
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: "2026-04-30",
        duration_minutes: duration3,
      },
    },
  );
  typia.assert(timelog3);
  // 5. Create a draft timesheet for the current week — auto-includes ungrouped timelogs
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: "2026-04-27T00:00:00.000Z",
      },
    },
  );
  typia.assert(timesheet);
  // 6. Submit the timesheet to generate a pending entry in the dashboard
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // 7. Query the organization dashboard
  const dashboard =
    await api.functional.erpHrm.member.dashboard.organization.at(
      memberConnection,
    );
  typia.assert(dashboard);
  // 8. Validate all five dashboard metrics
  // 8.1. active_employee_count — must be at least 1 (the authenticated member)
  TestValidator.predicate(
    "active employee count >= 1",
    dashboard.active_employee_count >= 1,
  );
  // 8.2. total_hours_this_week — must match the sum of created timelog durations
  TestValidator.predicate(
    "total hours this week matches sum of timelog durations",
    Math.abs(dashboard.total_hours_this_week - expectedTotalHours) < 0.01,
  );
  // 8.3. pending_timesheets_count — must be at least 1 (the submitted timesheet)
  TestValidator.predicate(
    "pending timesheets count >= 1",
    dashboard.pending_timesheets_count >= 1,
  );
  // 8.4. projects_over_budget — must include the created project with correct budget vs actual comparison
  const overBudgetProject = dashboard.projects_over_budget.find(
    (p) => p.project_id === project.id,
  );
  TestValidator.predicate(
    "project appears in projects_over_budget",
    overBudgetProject !== undefined,
  );
  if (overBudgetProject) {
    TestValidator.equals(
      "over budget project name matches",
      overBudgetProject.project_name,
      project.name,
    );
    TestValidator.equals(
      "over budget project budget_hours matches",
      overBudgetProject.budget_hours,
      budgetHours,
    );
    TestValidator.predicate(
      "over budget project actual_hours matches total timelog hours",
      Math.abs(overBudgetProject.actual_hours - expectedTotalHours) < 0.01,
    );
    TestValidator.predicate(
      "actual hours exceed 80% of budget hours",
      overBudgetProject.actual_hours > 0.8 * budgetHours,
    );
  }
  // 8.5. top_employees — must include the authenticated employee ranked by total hours this week
  const topEmployee = dashboard.top_employees.find(
    (e) => e.employee_id === projectMember.employee.id,
  );
  TestValidator.predicate(
    "authenticated employee appears in top_employees",
    topEmployee !== undefined,
  );
  if (topEmployee) {
    TestValidator.predicate(
      "top employee total hours match expected",
      Math.abs(topEmployee.total_hours - expectedTotalHours) < 0.01,
    );
  }
}
