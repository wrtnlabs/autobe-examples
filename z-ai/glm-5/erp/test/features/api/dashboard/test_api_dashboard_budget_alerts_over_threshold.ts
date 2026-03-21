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

export async function test_api_dashboard_budget_alerts_over_threshold(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account (also creates organization)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth: IErpHrmMember.IAuthorized = await authorize_member_join(
    ownerConnection,
    {},
  );
  typia.assert(ownerAuth);
  // 2. Create project with budget that will exceed 80% threshold (81% utilization)
  const projectOverBudget =
    await generate_random_erp_hrm_member_projects_create(ownerConnection, {
      body: {
        name: `Project Over Budget ${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#FF5733",
        budget_hours: 100, // Will log 81 hours for 81% utilization
      } satisfies IErpHrmProject.ICreate,
    });
  typia.assert(projectOverBudget);
  // 3. Create project that will be exactly at 79% threshold (should NOT appear in alerts)
  const projectAt79 = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {
      body: {
        name: `Project At 79 Percent ${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498DB",
        budget_hours: 100, // Will log 79 hours for 79% utilization
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(projectAt79);
  // 4. Create project without budget (should be excluded from alerts)
  const projectNoBudget = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {
      body: {
        name: `Project No Budget ${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#2ECC71",
        budget_hours: null,
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(projectNoBudget);
  // 5. Create employees and assign to projects
  const employee1 = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    { body: { employmentType: "full_time" } },
  );
  typia.assert(employee1);
  const employee2 = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    { body: { employmentType: "full_time" } },
  );
  typia.assert(employee2);
  // 6. Assign employees to projects
  await generate_random_erp_hrm_member_projects_members_create(
    ownerConnection,
    {
      params: { projectId: projectOverBudget.id },
      body: {
        employee_id: employee1.id,
        role: "member",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  await generate_random_erp_hrm_member_projects_members_create(
    ownerConnection,
    {
      params: { projectId: projectAt79.id },
      body: {
        employee_id: employee2.id,
        role: "member",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  await generate_random_erp_hrm_member_projects_members_create(
    ownerConnection,
    {
      params: { projectId: projectNoBudget.id },
      body: {
        employee_id: employee1.id,
        role: "member",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  // 7. Create timelogs for the project that will exceed 80%
  // Need 81 hours = 4860 minutes to achieve 81% utilization on 100-hour budget
  const timelogMinutesFor81 = 81 * 60; // 4860 minutes
  const timelogCount81 = 10;
  const minutesPerTimelog81 = Math.floor(timelogMinutesFor81 / timelogCount81);
  for (let i = 0; i < timelogCount81; i++) {
    const remainingMinutes =
      i === timelogCount81 - 1
        ? timelogMinutesFor81 - minutesPerTimelog81 * (timelogCount81 - 1)
        : minutesPerTimelog81;
    await generate_random_erp_hrm_member_timelogs_create(ownerConnection, {
      body: {
        project_id: projectOverBudget.id,
        date: new Date().toISOString(),
        duration: remainingMinutes,
        description: `Work session ${i + 1}`,
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    });
  }
  // 8. Create timelogs for the project at 79% threshold
  // Need 79 hours = 4740 minutes to achieve 79% utilization on 100-hour budget
  const timelogMinutesFor79 = 79 * 60; // 4740 minutes
  const timelogCount79 = 10;
  const minutesPerTimelog79 = Math.floor(timelogMinutesFor79 / timelogCount79);
  for (let i = 0; i < timelogCount79; i++) {
    const remainingMinutes =
      i === timelogCount79 - 1
        ? timelogMinutesFor79 - minutesPerTimelog79 * (timelogCount79 - 1)
        : minutesPerTimelog79;
    await generate_random_erp_hrm_member_timelogs_create(ownerConnection, {
      body: {
        project_id: projectAt79.id,
        date: new Date().toISOString(),
        duration: remainingMinutes,
        description: `Work session ${i + 1}`,
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    });
  }
  // 9. Create timelogs for the project without budget
  const timelogMinutesNoBudget = 50 * 60; // 50 hours
  const timelogCountNoBudget = 5;
  const minutesPerTimelogNoBudget = Math.floor(
    timelogMinutesNoBudget / timelogCountNoBudget,
  );
  for (let i = 0; i < timelogCountNoBudget; i++) {
    const remainingMinutes =
      i === timelogCountNoBudget - 1
        ? timelogMinutesNoBudget -
          minutesPerTimelogNoBudget * (timelogCountNoBudget - 1)
        : minutesPerTimelogNoBudget;
    await generate_random_erp_hrm_member_timelogs_create(ownerConnection, {
      body: {
        project_id: projectNoBudget.id,
        date: new Date().toISOString(),
        duration: remainingMinutes,
        description: `Work session ${i + 1}`,
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    });
  }
  // 10. Call the dashboard endpoint
  const dashboard: IErpHrmDashboard.IOrganization =
    await api.functional.erpHrm.member.reports.dashboard(ownerConnection);
  typia.assert(dashboard);
  // 11. Verify budget alerts
  const alerts = dashboard.budgetAlerts;
  // Find the alert for our project that should exceed threshold
  const overBudgetAlert = alerts.find(
    (alert) => alert.project_id === projectOverBudget.id,
  );
  const at79Alert = alerts.find((alert) => alert.project_id === projectAt79.id);
  const noBudgetAlert = alerts.find(
    (alert) => alert.project_id === projectNoBudget.id,
  );
  // Verify the project with >80% utilization appears in alerts
  TestValidator.predicate(
    "project over 80% threshold should appear in budget alerts",
    overBudgetAlert !== undefined,
  );
  // Verify the project at exactly 79% does NOT appear
  TestValidator.predicate(
    "project at 79% threshold should NOT appear in budget alerts",
    at79Alert === undefined,
  );
  // Verify the project without budget does NOT appear
  TestValidator.predicate(
    "project without budget should NOT appear in budget alerts",
    noBudgetAlert === undefined,
  );
  // Verify alert details for the over-budget project
  if (overBudgetAlert) {
    TestValidator.equals(
      "alert project_id matches",
      overBudgetAlert.project_id,
      projectOverBudget.id,
    );
    TestValidator.equals(
      "alert project_name matches",
      overBudgetAlert.project_name,
      projectOverBudget.name,
    );
    TestValidator.equals(
      "alert budget_hours matches",
      overBudgetAlert.budget_hours,
      100,
    );
    TestValidator.equals(
      "alert actual_hours should be 81",
      overBudgetAlert.actual_hours,
      81,
    );
    TestValidator.equals(
      "alert utilization_percentage should be 81",
      overBudgetAlert.utilization_percentage,
      81,
    );
  }
  // Verify alerts are sorted by utilization_percentage descending
  if (alerts.length > 1) {
    for (let i = 0; i < alerts.length - 1; i++) {
      TestValidator.predicate(
        "alerts should be sorted by utilization_percentage descending",
        alerts[i].utilization_percentage >=
          alerts[i + 1].utilization_percentage,
      );
    }
  }
}
