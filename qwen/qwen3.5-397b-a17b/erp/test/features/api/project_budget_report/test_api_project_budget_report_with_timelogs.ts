import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetReport";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectBudgetReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test the project budget utilization report generation with projects that have defined budget hours and associated timelogs.
 *
 * Validates the complete project budget reporting workflow including member authentication, organization creation, project setup with budget hours, timelog creation, and budget utilization report generation. Ensures that the report correctly calculates actual hours from timelogs, computes remaining hours and utilization percentages, and excludes projects without defined budgets.
 *
 * Special attention is given to verifying that projects with null budget_hours are excluded from results, actual hours match the sum of timelog durations divided by 60, and results are sorted by utilization percentage in descending order.
 *
 * 1. Member authenticates via registration.
 * 2. Organization is created to establish context.
 * 3. Multiple projects are created with varying budget_hours (100, 50, 80 hours).
 * 4. One project is created without budget_hours to verify exclusion.
 * 5. Timelogs are created for each budgeted project with various durations.
 * 6. Project budget report is called without filters.
 * 7. Validates response structure, calculations, sorting, and pagination.
 */
export async function test_api_project_budget_report_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  // 3. Create projects with budget_hours
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project High Budget",
        color: "#FF5733",
        budgetHours: 100,
      },
    },
  );
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Medium Budget",
        color: "#33FF57",
        budgetHours: 50,
      },
    },
  );
  const project3 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Low Budget",
        color: "#3357FF",
        budgetHours: 80,
      },
    },
  );
  // Create a project without budget_hours (should be excluded from report)
  const projectNoBudget =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Project No Budget",
          color: "#FFFF33",
        },
      },
    );
  // 4. Create timelogs for projects
  // Project 1: 3 timelogs totaling 6000 minutes = 100 hours (100% utilization)
  await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
    body: {
      date: new Date().toISOString(),
      duration_minutes: 2000,
      hrm_platform_project_id: project1.id,
      billable: true,
    },
  });
  await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
    body: {
      date: new Date().toISOString(),
      duration_minutes: 2000,
      hrm_platform_project_id: project1.id,
      billable: true,
    },
  });
  await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
    body: {
      date: new Date().toISOString(),
      duration_minutes: 2000,
      hrm_platform_project_id: project1.id,
      billable: false,
    },
  });
  // Project 2: 2 timelogs totaling 4500 minutes = 75 hours (150% utilization - over budget)
  await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
    body: {
      date: new Date().toISOString(),
      duration_minutes: 2500,
      hrm_platform_project_id: project2.id,
      billable: true,
    },
  });
  await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
    body: {
      date: new Date().toISOString(),
      duration_minutes: 2000,
      hrm_platform_project_id: project2.id,
      billable: true,
    },
  });
  // Project 3: 1 timelog of 1800 minutes = 30 hours (37.5% utilization)
  await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
    body: {
      date: new Date().toISOString(),
      duration_minutes: 1800,
      hrm_platform_project_id: project3.id,
      billable: true,
    },
  });
  // 5. Call project budget report endpoint
  const report =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(report);
  // 6. Validate response structure
  TestValidator.predicate("has pagination", report.pagination !== undefined);
  TestValidator.predicate("has data array", Array.isArray(report.data));
  TestValidator.predicate(
    "has at least 3 projects with budget",
    report.data.length >= 3,
  );
  // 7. Validate only projects with budget_hours are included
  for (const item of report.data) {
    TestValidator.predicate(
      "budget_hours is defined",
      item.budget_hours !== undefined && item.budget_hours !== null,
    );
    TestValidator.predicate(
      "project has required fields",
      item.project !== undefined,
    );
    TestValidator.predicate(
      "actual_hours is non-negative",
      item.actual_hours >= 0,
    );
    TestValidator.predicate(
      "remaining_hours calculated",
      item.remaining_hours !== undefined,
    );
    TestValidator.predicate(
      "utilization_percentage calculated",
      item.utilization_percentage !== undefined,
    );
  }
  // 8. Verify project without budget is excluded
  const hasNoBudgetProject = report.data.some(
    (item) => item.project.id === projectNoBudget.id,
  );
  TestValidator.predicate(
    "project without budget excluded",
    !hasNoBudgetProject,
  );
  // 9. Validate calculations for each project using predicate for floating point tolerance
  const project1Report = report.data.find(
    (item) => item.project.id === project1.id,
  );
  if (project1Report) {
    TestValidator.equals(
      "project1 budget_hours",
      project1Report.budget_hours,
      100,
    );
    TestValidator.equals(
      "project1 actual_hours (6000 min / 60)",
      project1Report.actual_hours,
      100,
    );
    TestValidator.equals(
      "project1 remaining_hours",
      project1Report.remaining_hours,
      0,
    );
    TestValidator.predicate(
      "project1 utilization_percentage",
      Math.abs(project1Report.utilization_percentage - 100) < 0.01,
    );
  }
  const project2Report = report.data.find(
    (item) => item.project.id === project2.id,
  );
  if (project2Report) {
    TestValidator.equals(
      "project2 budget_hours",
      project2Report.budget_hours,
      50,
    );
    TestValidator.equals(
      "project2 actual_hours (4500 min / 60)",
      project2Report.actual_hours,
      75,
    );
    TestValidator.equals(
      "project2 remaining_hours",
      project2Report.remaining_hours,
      -25,
    );
    TestValidator.predicate(
      "project2 utilization_percentage",
      Math.abs(project2Report.utilization_percentage - 150) < 0.01,
    );
  }
  const project3Report = report.data.find(
    (item) => item.project.id === project3.id,
  );
  if (project3Report) {
    TestValidator.equals(
      "project3 budget_hours",
      project3Report.budget_hours,
      80,
    );
    TestValidator.equals(
      "project3 actual_hours (1800 min / 60)",
      project3Report.actual_hours,
      30,
    );
    TestValidator.equals(
      "project3 remaining_hours",
      project3Report.remaining_hours,
      50,
    );
    TestValidator.predicate(
      "project3 utilization_percentage",
      Math.abs(project3Report.utilization_percentage - 37.5) < 0.01,
    );
  }
  // 10. Verify sorting by utilization_percentage descending
  // Expected order: project2 (150%), project1 (100%), project3 (37.5%)
  if (report.data.length >= 3) {
    for (let i = 0; i < report.data.length - 1; i++) {
      TestValidator.predicate(
        `sorted by utilization descending at index ${i}`,
        report.data[i].utilization_percentage >=
          report.data[i + 1].utilization_percentage,
      );
    }
  }
  // 11. Validate pagination metadata
  TestValidator.equals("pagination current page", report.pagination.current, 1);
  TestValidator.equals("pagination limit", report.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records matches data length",
    report.pagination.records >= report.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    report.pagination.pages >= 1,
  );
}
