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
 * Test that projects without budget_hours are excluded from the project budget report.
 *
 * This test validates the filtering logic of the project budget reports endpoint
 * to ensure only projects with defined budget hours appear in the results.
 */
export async function test_api_project_budget_report_excludes_projects_without_budgets(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication for budget report access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/login",
      referrer: "https://test.com",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Member authentication for project and timelog creation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      href: "https://test.com/member/join",
      referrer: "https://test.com",
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 3. Create project with budget hours (100 hours)
  const projectWithBudget =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Project With Budget",
          description: "This project has a defined budget",
          status: "active",
          color_code: "#FF5733",
          budget_hours: 100,
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(projectWithBudget);
  // 4. Create project without budget hours (null)
  const projectWithoutBudget =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Project Without Budget",
          description: "This project has no budget defined",
          status: "active",
          color_code: "#33FF57",
          budget_hours: null,
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(projectWithoutBudget);
  // 5. Create project with budget hours = 0 (edge case)
  const projectZeroBudget =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Project Zero Budget",
          description: "This project has zero budget hours",
          status: "active",
          color_code: "#3357FF",
          budget_hours: 0,
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(projectZeroBudget);
  // 6. Create timelogs for project with budget
  const timelogWithBudget =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: projectWithBudget.id,
          date: new Date().toISOString(),
          duration: 480, // 8 hours in minutes
          billable: true,
          description: "Work on budgeted project",
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(timelogWithBudget);
  // 7. Create timelogs for project without budget
  const timelogWithoutBudget =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: projectWithoutBudget.id,
          date: new Date().toISOString(),
          duration: 240, // 4 hours in minutes
          billable: true,
          description: "Work on non-budgeted project",
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(timelogWithoutBudget);
  // 8. Create timelogs for project with zero budget
  const timelogZeroBudget =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: projectZeroBudget.id,
          date: new Date().toISOString(),
          duration: 120, // 2 hours in minutes
          billable: true,
          description: "Work on zero budget project",
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(timelogZeroBudget);
  // 9. Call the project budget reports endpoint
  const report =
    await api.functional.hrmPlatform.admin.project_budget_reports.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(report);
  // 10. Verify only 2 projects are in the report (with budget and zero budget)
  TestValidator.equals(
    "report should include only projects with budget_hours not null",
    report.data.length,
    2,
  );
  // 11. Verify project with budget is included
  const projectWithBudgetInReport = report.data.find(
    (p) => p.id === projectWithBudget.id,
  );
  TestValidator.predicate(
    "project with budget should be in report",
    projectWithBudgetInReport !== undefined,
  );
  // 12. Verify project without budget is NOT included
  const projectWithoutBudgetInReport = report.data.find(
    (p) => p.id === projectWithoutBudget.id,
  );
  TestValidator.equals(
    "project without budget should be excluded from report",
    projectWithoutBudgetInReport,
    null,
  );
  // 13. Verify project with zero budget is included
  const projectZeroBudgetInReport = report.data.find(
    (p) => p.id === projectZeroBudget.id,
  );
  TestValidator.predicate(
    "project with zero budget should be in report",
    projectZeroBudgetInReport !== undefined,
  );
  // 14. Verify budget_consumption_percentage for project with budget
  if (projectWithBudgetInReport !== undefined) {
    TestValidator.predicate(
      "budget consumption percentage should be calculated for project with budget",
      projectWithBudgetInReport.budget_consumption_percentage > 0,
    );
    TestValidator.equals(
      "budget consumption percentage should match actual hours",
      projectWithBudgetInReport.budget_hours,
      100,
    );
    TestValidator.equals(
      "actual hours should be 8 hours (480 minutes)",
      projectWithBudgetInReport.actual_hours,
      8,
    );
  }
  // 15. Verify budget_consumption_percentage for project with zero budget
  if (projectZeroBudgetInReport !== undefined) {
    TestValidator.equals(
      "budget hours should be 0",
      projectZeroBudgetInReport.budget_hours,
      0,
    );
    TestValidator.predicate(
      "budget consumption percentage should handle zero budget",
      projectZeroBudgetInReport.budget_consumption_percentage >= 0,
    );
  }
  // 16. Verify pagination data
  TestValidator.equals(
    "pagination should show correct total records",
    report.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination should show correct current page",
    report.pagination.current,
    1,
  );
}
