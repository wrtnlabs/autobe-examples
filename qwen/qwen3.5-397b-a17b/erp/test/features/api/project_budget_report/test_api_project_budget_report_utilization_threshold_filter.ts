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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_project_budget_report_utilization_threshold_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create projects with different budget hours
  // Project A: 100 budget hours (will have ~30% utilization = 30 hours logged)
  const projectA = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Low Utilization Project",
        color_code: "#FF0000",
        status: "active",
        budget_hours: 100,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(projectA);
  // Project B: 200 budget hours (will have ~60% utilization = 120 hours logged)
  const projectB = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Medium Utilization Project",
        color_code: "#00FF00",
        status: "active",
        budget_hours: 200,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(projectB);
  // Project C: 50 budget hours (will have ~90% utilization = 45 hours logged)
  const projectC = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "High Utilization Project",
        color_code: "#0000FF",
        status: "active",
        budget_hours: 50,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(projectC);
  // 3. Create timelogs to generate different utilization percentages
  // For Project A: 30 hours = 1800 minutes (30% of 100 hours budget)
  const timelogA = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: new Date().toISOString(),
        durationMinutes: 1800,
        projectId: projectA.id,
        description: "Low utilization timelog",
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelogA);
  // For Project B: 120 hours = 7200 minutes (60% of 200 hours budget)
  const timelogB = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: new Date().toISOString(),
        durationMinutes: 7200,
        projectId: projectB.id,
        description: "Medium utilization timelog",
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelogB);
  // For Project C: 45 hours = 2700 minutes (90% of 50 hours budget)
  const timelogC = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: new Date().toISOString(),
        durationMinutes: 2700,
        projectId: projectC.id,
        description: "High utilization timelog",
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelogC);
  // 4. Test with min_utilization=50 (should return Project B and C only)
  const report50 = await api.functional.hrmPlatform.member.reports.budget.index(
    memberConnection,
    {
      body: {
        min_utilization: 50,
        project_status: "active",
      } satisfies IHrmPlatformProjectBudgetReport.IRequest,
    },
  );
  typia.assert(report50);
  TestValidator.predicate(
    "min_utilization=50 should return 2 projects (B and C)",
    () => report50.data.length === 2,
  );
  const projectIds50 = report50.data.map((p) => p.id);
  TestValidator.predicate(
    "Project A (30%) should be excluded with min_utilization=50",
    () => !projectIds50.includes(projectA.id),
  );
  TestValidator.predicate(
    "Project B (60%) should be included with min_utilization=50",
    () => projectIds50.includes(projectB.id),
  );
  TestValidator.predicate(
    "Project C (90%) should be included with min_utilization=50",
    () => projectIds50.includes(projectC.id),
  );
  // 5. Test with min_utilization=0 (should return all 3 projects)
  const report0 = await api.functional.hrmPlatform.member.reports.budget.index(
    memberConnection,
    {
      body: {
        min_utilization: 0,
        project_status: "active",
      } satisfies IHrmPlatformProjectBudgetReport.IRequest,
    },
  );
  typia.assert(report0);
  TestValidator.predicate(
    "min_utilization=0 should return all 3 projects",
    () => report0.data.length === 3,
  );
  const projectIds0 = report0.data.map((p) => p.id);
  TestValidator.predicate(
    "All projects should be included with min_utilization=0",
    () =>
      projectIds0.includes(projectA.id) &&
      projectIds0.includes(projectB.id) &&
      projectIds0.includes(projectC.id),
  );
  // 6. Test with min_utilization=100 (should return 0 projects)
  const report100 =
    await api.functional.hrmPlatform.member.reports.budget.index(
      memberConnection,
      {
        body: {
          min_utilization: 100,
          project_status: "active",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(report100);
  TestValidator.predicate(
    "min_utilization=100 should return 0 projects",
    () => report100.data.length === 0,
  );
  // 7. Test sorting by utilization_percentage descending
  const reportSorted =
    await api.functional.hrmPlatform.member.reports.budget.index(
      memberConnection,
      {
        body: {
          min_utilization: 0,
          project_status: "active",
          sort: "utilization_percentage",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(reportSorted);
  TestValidator.predicate(
    "Sorted results should have utilization in descending order",
    () => {
      for (let i = 0; i < reportSorted.data.length - 1; i++) {
        if (
          reportSorted.data[i].utilization_percentage <
          reportSorted.data[i + 1].utilization_percentage
        ) {
          return false;
        }
      }
      return true;
    },
  );
  // 8. Verify utilization percentage calculations are accurate
  const projectAReport = report0.data.find((p) => p.id === projectA.id);
  if (projectAReport) {
    const expectedUtilization = (30 / 100) * 100; // 30%
    TestValidator.predicate(
      "Project A utilization should be approximately 30%",
      () =>
        Math.abs(projectAReport.utilization_percentage - expectedUtilization) <
        1,
    );
  }
  const projectBReport = report0.data.find((p) => p.id === projectB.id);
  if (projectBReport) {
    const expectedUtilization = (120 / 200) * 100; // 60%
    TestValidator.predicate(
      "Project B utilization should be approximately 60%",
      () =>
        Math.abs(projectBReport.utilization_percentage - expectedUtilization) <
        1,
    );
  }
  const projectCReport = report0.data.find((p) => p.id === projectC.id);
  if (projectCReport) {
    const expectedUtilization = (45 / 50) * 100; // 90%
    TestValidator.predicate(
      "Project C utilization should be approximately 90%",
      () =>
        Math.abs(projectCReport.utilization_percentage - expectedUtilization) <
        1,
    );
  }
  // 9. Test combination of min_utilization and project_status filters
  const reportCombined =
    await api.functional.hrmPlatform.member.reports.budget.index(
      memberConnection,
      {
        body: {
          min_utilization: 50,
          project_status: "active",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(reportCombined);
  TestValidator.predicate("Combined filters should work correctly", () =>
    reportCombined.data.every(
      (p) => p.status === "active" && p.utilization_percentage >= 50,
    ),
  );
}
