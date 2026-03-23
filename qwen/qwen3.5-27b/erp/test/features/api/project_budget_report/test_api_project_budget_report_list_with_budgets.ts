import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetReport";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectBudgetReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test project budget report listing with budget hours verification.
 *
 * This test validates the project budget report endpoint by:
 * 1. Authenticating as admin
 * 2. Creating multiple projects with budget_hours defined
 * 3. Creating timelogs for these projects to generate actual hours
 * 4. Retrieving project budget reports
 * 5. Verifying budget consumption calculations and pagination
 */
export async function test_api_project_budget_report_list_with_budgets(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/login",
      referrer: "https://test.com",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Create projects with budget hours (at least 3 projects)
  const project1 = await api.functional.hrmPlatform.member.projects.create(
    adminConnection,
    {
      body: {
        name: "Project Alpha",
        description: "High priority project with budget",
        status: "active",
        color_code: "#FF5733",
        budget_hours: 100,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project1);
  const project2 = await api.functional.hrmPlatform.member.projects.create(
    adminConnection,
    {
      body: {
        name: "Project Beta",
        description: "Medium priority project with budget",
        status: "active",
        color_code: "#33FF57",
        budget_hours: 200,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project2);
  const project3 = await api.functional.hrmPlatform.member.projects.create(
    adminConnection,
    {
      body: {
        name: "Project Gamma",
        description: "Low priority project with budget",
        status: "active",
        color_code: "#3357FF",
        budget_hours: 150,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project3);
  // 3. Create timelogs for projects to generate actual hours
  // Project Alpha: 30 hours (1800 minutes)
  const timelog1 = await api.functional.hrmPlatform.member.timelogs.create(
    adminConnection,
    {
      body: {
        project_id: project1.id,
        date: new Date().toISOString(),
        duration: 1800,
        billable: true,
        description: "Development work",
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  // Project Beta: 60 hours (3600 minutes)
  const timelog2 = await api.functional.hrmPlatform.member.timelogs.create(
    adminConnection,
    {
      body: {
        project_id: project2.id,
        date: new Date().toISOString(),
        duration: 3600,
        billable: true,
        description: "Design work",
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  // Project Gamma: 15 hours (900 minutes)
  const timelog3 = await api.functional.hrmPlatform.member.timelogs.create(
    adminConnection,
    {
      body: {
        project_id: project3.id,
        date: new Date().toISOString(),
        duration: 900,
        billable: true,
        description: "Testing work",
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog3);
  // 4. Retrieve project budget reports with default pagination
  const reports =
    await api.functional.hrmPlatform.admin.project_budget_reports.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(reports);
  // 5. Verify pagination metadata
  TestValidator.equals("current page", reports.pagination.current, 1);
  TestValidator.equals("limit", reports.pagination.limit, 20);
  TestValidator.equals("total records", reports.pagination.records, 3);
  TestValidator.equals("total pages", reports.pagination.pages, 1);
  // 6. Verify response contains only projects with budget_hours
  TestValidator.predicate("has 3 projects", reports.data.length === 3);
  // 7. Verify each project's budget consumption calculation
  const alphaReport = reports.data.find((r) => r.id === project1.id)!;
  const betaReport = reports.data.find((r) => r.id === project2.id)!;
  const gammaReport = reports.data.find((r) => r.id === project3.id)!;
  typia.assert(alphaReport);
  typia.assert(betaReport);
  typia.assert(gammaReport);
  // Project Alpha: 30 hours actual / 100 hours budget = 30%
  TestValidator.equals("alpha budget hours", alphaReport.budget_hours, 100);
  TestValidator.equals("alpha actual hours", alphaReport.actual_hours, 30);
  TestValidator.equals(
    "alpha budget consumption percentage",
    alphaReport.budget_consumption_percentage,
    30,
  );
  TestValidator.equals("alpha timelog count", alphaReport.timelog_count, 1);
  // Project Beta: 60 hours actual / 200 hours budget = 30%
  TestValidator.equals("beta budget hours", betaReport.budget_hours, 200);
  TestValidator.equals("beta actual hours", betaReport.actual_hours, 60);
  TestValidator.equals(
    "beta budget consumption percentage",
    betaReport.budget_consumption_percentage,
    30,
  );
  TestValidator.equals("beta timelog count", betaReport.timelog_count, 1);
  // Project Gamma: 15 hours actual / 150 hours budget = 10%
  TestValidator.equals("gamma budget hours", gammaReport.budget_hours, 150);
  TestValidator.equals("gamma actual hours", gammaReport.actual_hours, 15);
  TestValidator.equals(
    "gamma budget consumption percentage",
    gammaReport.budget_consumption_percentage,
    10,
  );
  TestValidator.equals("gamma timelog count", gammaReport.timelog_count, 1);
  // 8. Verify default sorting by budget_consumption_percentage descending
  TestValidator.predicate(
    "sorted by budget consumption descending",
    reports.data[0].budget_consumption_percentage >=
      reports.data[1].budget_consumption_percentage &&
      reports.data[1].budget_consumption_percentage >=
        reports.data[2].budget_consumption_percentage,
  );
  // 9. Test with project status filter
  const activeReports =
    await api.functional.hrmPlatform.admin.project_budget_reports.index(
      adminConnection,
      {
        body: {
          project_status: "active",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(activeReports);
  TestValidator.equals("active projects count", activeReports.data.length, 3);
  // 10. Test with date range filter (should include all timelogs)
  const today = new Date().toISOString().split("T")[0];
  const dateFilteredReports =
    await api.functional.hrmPlatform.admin.project_budget_reports.index(
      adminConnection,
      {
        body: {
          date_range_start: today,
          date_range_end: today,
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(dateFilteredReports);
  TestValidator.equals(
    "date filtered projects count",
    dateFilteredReports.data.length,
    3,
  );
  // 11. Test search functionality
  const searchReports =
    await api.functional.hrmPlatform.admin.project_budget_reports.index(
      adminConnection,
      {
        body: {
          search: "Alpha",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(searchReports);
  TestValidator.equals("search results count", searchReports.data.length, 1);
  TestValidator.equals(
    "search result name",
    searchReports.data[0].name,
    "Project Alpha",
  );
  // 12. Test custom sorting by name ascending
  const sortedByNameReports =
    await api.functional.hrmPlatform.admin.project_budget_reports.index(
      adminConnection,
      {
        body: {
          sort: "name",
          sortOrder: "asc",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(sortedByNameReports);
  TestValidator.equals(
    "first project name alphabetically",
    sortedByNameReports.data[0].name,
    "Project Alpha",
  );
  TestValidator.equals(
    "last project name alphabetically",
    sortedByNameReports.data[2].name,
    "Project Gamma",
  );
}
