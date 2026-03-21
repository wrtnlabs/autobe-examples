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

export async function test_api_project_budget_report_active_projects(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(member);
  // 2. Create 3 projects with different budget hours
  const project1 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
        budget_hours: 100,
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#33FF57",
        budget_hours: 200,
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project2);
  const project3 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3357FF",
        budget_hours: 50,
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project3);
  // 3. Log hours against each project
  // Project 1: 80 hours = 4800 minutes (80% utilization of 100 hours)
  await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
    body: {
      project_id: project1.id,
      date: new Date().toISOString(),
      duration: 4800,
    } satisfies IErpHrmTimelog.ICreate,
  });
  // Project 2: 150 hours = 9000 minutes (75% utilization of 200 hours)
  await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
    body: {
      project_id: project2.id,
      date: new Date().toISOString(),
      duration: 9000,
    } satisfies IErpHrmTimelog.ICreate,
  });
  // Project 3: 60 hours = 3600 minutes (120% utilization of 50 hours - budget overrun)
  await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
    body: {
      project_id: project3.id,
      date: new Date().toISOString(),
      duration: 3600,
    } satisfies IErpHrmTimelog.ICreate,
  });
  // 4. Call budget report endpoint with status filter for active projects
  const budgetReport: IPageIErpHrmProject.IBudgetSummary =
    await api.functional.erpHrm.member.reports.projects.budget.index(
      memberConnection,
      {
        body: {
          status: "active",
        } satisfies IErpHrmProject.IBudgetRequest,
      },
    );
  typia.assert(budgetReport);
  // 5. Validate response contains our projects
  TestValidator.predicate("has projects", budgetReport.data.length >= 3);
  // Find our projects in the response
  const project1Summary = budgetReport.data.find((p) => p.id === project1.id);
  const project2Summary = budgetReport.data.find((p) => p.id === project2.id);
  const project3Summary = budgetReport.data.find((p) => p.id === project3.id);
  // 6. Validate project 1 (80% utilization)
  TestValidator.predicate(
    "project 1 exists in report",
    project1Summary !== undefined,
  );
  if (project1Summary !== undefined) {
    TestValidator.equals(
      "project 1 budget_hours",
      project1Summary.budget_hours,
      100,
    );
    TestValidator.predicate(
      "project 1 actual_hours ~80",
      Math.abs(project1Summary.actual_hours - 80) < 0.01,
    );
    TestValidator.predicate(
      "project 1 utilization ~80%",
      Math.abs(project1Summary.utilization_percentage - 80) < 0.1,
    );
    TestValidator.equals("project 1 status", project1Summary.status, "active");
    TestValidator.predicate(
      "project 1 has name",
      project1Summary.name.length > 0,
    );
    TestValidator.predicate(
      "project 1 has color_code",
      /^#[0-9A-Fa-f]{6}$/.test(project1Summary.color_code),
    );
  }
  // 7. Validate project 2 (75% utilization)
  TestValidator.predicate(
    "project 2 exists in report",
    project2Summary !== undefined,
  );
  if (project2Summary !== undefined) {
    TestValidator.equals(
      "project 2 budget_hours",
      project2Summary.budget_hours,
      200,
    );
    TestValidator.predicate(
      "project 2 actual_hours ~150",
      Math.abs(project2Summary.actual_hours - 150) < 0.01,
    );
    TestValidator.predicate(
      "project 2 utilization ~75%",
      Math.abs(project2Summary.utilization_percentage - 75) < 0.1,
    );
    TestValidator.equals("project 2 status", project2Summary.status, "active");
  }
  // 8. Validate project 3 (120% utilization - budget overrun)
  TestValidator.predicate(
    "project 3 exists in report",
    project3Summary !== undefined,
  );
  if (project3Summary !== undefined) {
    TestValidator.equals(
      "project 3 budget_hours",
      project3Summary.budget_hours,
      50,
    );
    TestValidator.predicate(
      "project 3 actual_hours ~60",
      Math.abs(project3Summary.actual_hours - 60) < 0.01,
    );
    TestValidator.predicate(
      "project 3 utilization ~120%",
      Math.abs(project3Summary.utilization_percentage - 120) < 0.1,
    );
    TestValidator.equals("project 3 status", project3Summary.status, "active");
  }
  // 9. Validate sorting by utilization percentage (descending: 120% > 80% > 75%)
  const projectIds = [project1.id, project2.id, project3.id];
  const ourProjects = budgetReport.data.filter((p) =>
    projectIds.includes(p.id),
  );
  if (ourProjects.length >= 3) {
    // Find positions in sorted array
    const position3 = budgetReport.data.findIndex((p) => p.id === project3.id);
    const position1 = budgetReport.data.findIndex((p) => p.id === project1.id);
    const position2 = budgetReport.data.findIndex((p) => p.id === project2.id);
    TestValidator.predicate(
      "project 3 (120%) comes before project 1 (80%)",
      position3 < position1,
    );
    TestValidator.predicate(
      "project 1 (80%) comes before project 2 (75%)",
      position1 < position2,
    );
  }
  // 10. Validate pagination metadata
  TestValidator.predicate(
    "pagination current >= 1",
    budgetReport.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    budgetReport.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 3",
    budgetReport.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    budgetReport.pagination.pages >= 1,
  );
}
