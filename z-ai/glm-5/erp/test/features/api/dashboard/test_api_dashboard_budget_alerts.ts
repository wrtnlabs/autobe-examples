import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDashboard";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationDashboard";
import type { IErpHrmPersonalDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPersonalDashboard";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
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
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_dashboard_budget_alerts(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the dashboard budget alert feature when a project exceeds 80% budget utilization.
   *
   * 1. Create a member (owner has report viewing permission)
   * 2. Create a project with budget_hours set to 100 hours
   * 3. Create timelog entries totaling more than 80% of budget (> 80 hours)
   * 4. Verify budget_alerts contains the over-budget project
   * 5. Verify utilization_percentage is correctly calculated
   * 6. Create another project below 80% threshold and verify it doesn't appear in alerts
   */
  // 1. Create member (becomes owner of organization - has report viewing permission)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a project with budget_hours = 100 hours (project that will exceed 80%)
  const overBudgetProject =
    await generate_random_erp_hrm_member_projects_create(ownerConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
        budget_hours: 100,
        description: "Project for budget alert testing",
      },
    });
  typia.assert(overBudgetProject);
  // 3. Create timelog entries totaling more than 80% of budget (85 hours = 5100 minutes)
  // To trigger the alert, we need > 80% utilization (more than 80 hours)
  const totalMinutes = 85 * 60;
  const entriesPerProject = 5;
  const minutesPerEntry = Math.floor(totalMinutes / entriesPerProject);
  await ArrayUtil.asyncRepeat(entriesPerProject, async () => {
    const timelog = await generate_random_erp_hrm_member_timelogs_create(
      ownerConnection,
      {
        body: {
          project_id: overBudgetProject.id,
          date: new Date().toISOString(),
          duration: minutesPerEntry,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable: true,
        },
      },
    );
    typia.assert(timelog);
  });
  // 4. Create another project below 80% threshold (project that will NOT trigger alert)
  const underBudgetProject =
    await generate_random_erp_hrm_member_projects_create(ownerConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3366FF",
        budget_hours: 100,
        description: "Project under budget threshold",
      },
    });
  typia.assert(underBudgetProject);
  // Create timelog entries totaling less than 80% of budget (e.g., 50 hours)
  const underBudgetMinutes = 50 * 60;
  const underBudgetEntries = 3;
  const underBudgetMinutesPerEntry = Math.floor(
    underBudgetMinutes / underBudgetEntries,
  );
  await ArrayUtil.asyncRepeat(underBudgetEntries, async () => {
    const timelog = await generate_random_erp_hrm_member_timelogs_create(
      ownerConnection,
      {
        body: {
          project_id: underBudgetProject.id,
          date: new Date().toISOString(),
          duration: underBudgetMinutesPerEntry,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable: true,
        },
      },
    );
    typia.assert(timelog);
  });
  // 5. Get dashboard and check budget_alerts
  const dashboard =
    await api.functional.erpHrm.member.dashboard.at(ownerConnection);
  typia.assert(dashboard);
  // Owner should have organization dashboard access
  TestValidator.predicate(
    "owner should have organization dashboard",
    dashboard.organization !== null,
  );
  if (dashboard.organization !== null) {
    const orgDashboard = dashboard.organization;
    typia.assert(orgDashboard);
    // 6. Find the over-budget project in budget_alerts
    const overBudgetAlert = orgDashboard.budget_alerts.find(
      (alert) => alert.project_id === overBudgetProject.id,
    );
    TestValidator.predicate(
      "over-budget project should appear in budget_alerts",
      overBudgetAlert !== undefined,
    );
    if (overBudgetAlert !== undefined) {
      // Validate alert fields
      TestValidator.equals(
        "project_name should match",
        overBudgetAlert.project_name,
        overBudgetProject.name,
      );
      TestValidator.equals(
        "budget_hours should match",
        overBudgetAlert.budget_hours,
        100,
      );
      // Validate actual_hours is approximately 85 (converted from minutes)
      TestValidator.predicate(
        "actual_hours should be approximately 85",
        overBudgetAlert.actual_hours >= 84 &&
          overBudgetAlert.actual_hours <= 86,
      );
      // Validate utilization_percentage is correctly calculated
      // utilization_percentage = (actual_hours / budget_hours) * 100
      const expectedUtilization =
        (overBudgetAlert.actual_hours / overBudgetAlert.budget_hours) * 100;
      TestValidator.predicate(
        "utilization_percentage should be correctly calculated",
        Math.abs(overBudgetAlert.utilization_percentage - expectedUtilization) <
          0.5,
      );
      // Verify utilization is above 80%
      TestValidator.predicate(
        "utilization_percentage should be above 80%",
        overBudgetAlert.utilization_percentage > 80,
      );
    }
    // 7. Verify under-budget project does NOT appear in budget_alerts
    const underBudgetAlert = orgDashboard.budget_alerts.find(
      (alert) => alert.project_id === underBudgetProject.id,
    );
    TestValidator.predicate(
      "under-budget project should NOT appear in budget_alerts",
      underBudgetAlert === undefined,
    );
  }
}
