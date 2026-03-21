import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
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
 * Test budget utilization report identifying projects that have exceeded their budget.
 *
 * This test validates that the budget report endpoint correctly:
 * 1. Returns projects with their budget utilization metrics
 * 2. Calculates utilization percentage correctly (actual_hours / budget_hours * 100)
 * 3. Identifies over-budget projects (utilization_percentage > 100)
 * 4. Sorts results by utilization percentage (highest first)
 */
export async function test_api_project_budget_report_over_budget_projects(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create two projects with budget hours
  // Helper function to generate valid hex color code
  const generateHexColor = (): string => {
    const hexChars = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += hexChars.charAt(Math.floor(Math.random() * 16));
    }
    return color;
  };
  // Project 1: 50 hours budget (will be over budget)
  const project1 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Over Budget Project ${RandomGenerator.alphabets(6)}`,
        description: "Project with budget overrun for testing",
        color_code: generateHexColor(),
        budget_hours: 50,
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project1);
  // Project 2: 100 hours budget (will be within budget)
  const project2 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Within Budget Project ${RandomGenerator.alphabets(6)}`,
        description: "Project within budget for testing",
        color_code: generateHexColor(),
        budget_hours: 100,
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project2);
  // 3. Log excessive time against project 1 (75 hours = 4500 minutes, 150% of 50 hours)
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project1.id,
        date: new Date().toISOString(),
        duration: 4500,
        description: "Time entry exceeding budget",
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  // 4. Log within-budget time against project 2 (80 hours = 4800 minutes, 80% of 100 hours)
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project2.id,
        date: new Date().toISOString(),
        duration: 4800,
        description: "Time entry within budget",
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  // 5. Call budget report endpoint for active projects
  const budgetReport =
    await api.functional.erpHrm.member.reports.projects.budget.index(
      memberConnection,
      {
        body: {
          status: "active",
        } satisfies IErpHrmProject.IBudgetRequest,
      },
    );
  typia.assert(budgetReport);
  // 6. Validate both projects appear in results
  TestValidator.predicate(
    "both projects should appear in budget report",
    budgetReport.data.some((p) => p.id === project1.id) &&
      budgetReport.data.some((p) => p.id === project2.id),
  );
  // 7. Find the project summaries
  const project1Summary = budgetReport.data.find((p) => p.id === project1.id);
  const project2Summary = budgetReport.data.find((p) => p.id === project2.id);
  TestValidator.predicate(
    "project 1 summary should exist",
    project1Summary !== undefined,
  );
  TestValidator.predicate(
    "project 2 summary should exist",
    project2Summary !== undefined,
  );
  // 8. Validate project 1 is over budget (utilization > 100%)
  TestValidator.predicate(
    "project 1 should be over budget",
    project1Summary!.utilization_percentage > 100,
  );
  // 9. Validate project 2 is within budget (utilization < 100%)
  TestValidator.predicate(
    "project 2 should be within budget",
    project2Summary!.utilization_percentage < 100,
  );
  // 10. Validate projects are sorted by utilization (highest first)
  // Over-budget project (~150%) should appear before within-budget project (~80%)
  const project1Index = budgetReport.data.findIndex(
    (p) => p.id === project1.id,
  );
  const project2Index = budgetReport.data.findIndex(
    (p) => p.id === project2.id,
  );
  TestValidator.predicate(
    "over-budget project should appear first (sorted by utilization desc)",
    project1Index < project2Index,
  );
  // 11. Validate utilization percentage calculation (with floating point tolerance)
  // Project 1: 75 hours / 50 hours = 150% (actual_hours calculated from duration / 60)
  TestValidator.predicate(
    "project 1 utilization should be approximately 150%",
    Math.abs(project1Summary!.utilization_percentage - 150) < 1,
  );
  // Project 2: 80 hours / 100 hours = 80%
  TestValidator.predicate(
    "project 2 utilization should be approximately 80%",
    Math.abs(project2Summary!.utilization_percentage - 80) < 1,
  );
}
