import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectBudgetReport";
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
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

/**
 * Validate the project budget report returns correct data across projects in different states — with timelogs, without timelogs, and excluded (no budget).
 *
 * Sets up a controlled environment with three projects at varying budget utilization levels and verifies the report endpoint aggregates data correctly. The test confirms that both billable and non-billable timelogs contribute to actual hours, that projects without budgets are excluded, and that projects with budgets but no timelogs still appear with zero actual hours.
 *
 * 1. Authenticate a member via join, which grants Owner role with report:view permission.
 * 2. Create Project A with 40 budget hours, then log 10 actual hours across two timelogs: one billable (6h / 360 min) and one non-billable (4h / 240 min) to verify both billing types are included.
 * 3. Create Project B with 20 budget hours but log zero timelogs against it.
 * 4. Create Project C with no budget hours to verify exclusion from the report.
 * 5. Retrieve the project budget report and validate:
 *    - Project A: budget_hours=40, actual_hours=10, utilization_percentage=25.0
 *    - Project B: budget_hours=20, actual_hours=0, utilization_percentage=0
 *    - Project C is absent from the report
 *    - Summary totals: total_budget_hours=60, total_actual_hours=10, overall_utilization≈16.67
 *    - Each project item contains all six required fields
 */
export async function test_api_project_budget_report_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create Project A with 40 budget hours
  const projectA = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    { body: { budget_hours: 40 } },
  );
  typia.assert(projectA);
  // 3. Create Project B with 20 budget hours
  const projectB = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    { body: { budget_hours: 20 } },
  );
  typia.assert(projectB);
  // 4. Create Project C with no budget hours (excluded from report)
  const projectC = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    { body: { budget_hours: null } },
  );
  typia.assert(projectC);
  // 5. Log 6 billable hours (360 minutes) against Project A
  const today = new Date().toISOString().substring(0, 10);
  await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
    body: {
      project_id: projectA.id,
      duration_minutes: 360,
      billable: true,
      date: today,
    },
  });
  // 6. Log 4 non-billable hours (240 minutes) against Project A
  await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
    body: {
      project_id: projectA.id,
      duration_minutes: 240,
      billable: false,
      date: today,
    },
  });
  // 7. Retrieve project budget report
  const report =
    await api.functional.erpHrm.member.reports.project_budget.at(
      memberConnection,
    );
  typia.assert(report);
  // 8. Verify Project A in report
  const reportItemA = report.projects.find((p) => p.project_id === projectA.id);
  TestValidator.predicate(
    "Project A exists in report",
    reportItemA !== undefined,
  );
  typia.assertGuard<NonNullable<typeof reportItemA>>(reportItemA);
  TestValidator.equals(
    "Project A name",
    reportItemA.project_name,
    projectA.name,
  );
  TestValidator.equals("Project A budget hours", reportItemA.budget_hours, 40);
  TestValidator.equals("Project A actual hours", reportItemA.actual_hours, 10);
  TestValidator.equals(
    "Project A utilization percentage",
    reportItemA.utilization_percentage,
    25,
  );
  TestValidator.equals(
    "Project A status",
    reportItemA.project_status,
    projectA.status,
  );
  // 9. Verify Project B in report
  const reportItemB = report.projects.find((p) => p.project_id === projectB.id);
  TestValidator.predicate(
    "Project B exists in report",
    reportItemB !== undefined,
  );
  typia.assertGuard<NonNullable<typeof reportItemB>>(reportItemB);
  TestValidator.equals(
    "Project B name",
    reportItemB.project_name,
    projectB.name,
  );
  TestValidator.equals("Project B budget hours", reportItemB.budget_hours, 20);
  TestValidator.equals(
    "Project B actual hours (zero)",
    reportItemB.actual_hours,
    0,
  );
  TestValidator.equals(
    "Project B utilization (zero)",
    reportItemB.utilization_percentage,
    0,
  );
  TestValidator.equals(
    "Project B status",
    reportItemB.project_status,
    projectB.status,
  );
  // 10. Verify Project C is absent
  TestValidator.predicate(
    "Project C absent from report",
    !report.projects.some((p) => p.project_id === projectC.id),
  );
  // 11. Verify summary totals
  TestValidator.equals(
    "Summary total budget hours",
    report.summary.total_budget_hours,
    60,
  );
  TestValidator.equals(
    "Summary total actual hours",
    report.summary.total_actual_hours,
    10,
  );
  TestValidator.predicate(
    "Summary overall utilization close to 16.67",
    Math.abs(report.summary.overall_utilization - (100 * 10) / 60) < 0.01,
  );
}
