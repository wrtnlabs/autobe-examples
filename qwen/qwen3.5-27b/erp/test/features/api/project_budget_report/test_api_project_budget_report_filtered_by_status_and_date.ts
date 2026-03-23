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
import { generate_random_hrm_platform_admin_timelogs_create } from "../../../generate/generate_random_hrm_platform_admin_timelogs_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test filtering capabilities of the project budget reports endpoint.
 *
 * This test validates that the project budget reports endpoint correctly
 * filters results by project status, date range, and search term. It also
 * verifies that budget consumption calculations are accurate based on
 * filtered timelogs and that pagination works correctly with applied filters.
 */
export async function test_api_project_budget_report_filtered_by_status_and_date(
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
  // Member authentication for project creation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: `member_${typia.random<string & tags.Format<"email">>()}`,
      password: "1234",
      href: "https://test.com/member/join",
      referrer: "https://test.com",
    },
  });
  // 2. Create multiple projects with different statuses and budget_hours
  const activeProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Active Marketing Campaign",
          description: "Current marketing initiative",
          status: "active",
          color_code: "#FF5733",
          budget_hours: 100,
        },
      },
    );
  typia.assert(activeProject);
  const completedProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Completed Website Redesign",
          description: "Website redesign project finished last month",
          status: "completed",
          color_code: "#33FF57",
          budget_hours: 200,
        },
      },
    );
  typia.assert(completedProject);
  const archivedProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Archived Legacy System",
          description: "Old system migration project",
          status: "archived",
          color_code: "#3357FF",
          budget_hours: 150,
        },
      },
    );
  typia.assert(archivedProject);
  const activeProjectWithoutBudget =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Active Internal Tools",
          description: "Internal tooling without budget tracking",
          status: "active",
          color_code: "#FF33F5",
          budget_hours: null,
        },
      },
    );
  typia.assert(activeProjectWithoutBudget);
  // 3. Create timelogs with various dates for these projects
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  // Timelogs for active project - within date range
  const activeTimelog1 =
    await generate_random_hrm_platform_admin_timelogs_create(adminConnection, {
      body: {
        project_id: activeProject.id,
        date: today.toISOString(),
        duration: 480, // 8 hours
        billable: true,
        description: "Marketing campaign work today",
      },
    });
  typia.assert(activeTimelog1);
  const activeTimelog2 =
    await generate_random_hrm_platform_admin_timelogs_create(adminConnection, {
      body: {
        project_id: activeProject.id,
        date: yesterday.toISOString(),
        duration: 360, // 6 hours
        billable: true,
        description: "Marketing campaign work yesterday",
      },
    });
  typia.assert(activeTimelog2);
  // Timelog for active project - outside date range (last week)
  const activeTimelogOld =
    await generate_random_hrm_platform_admin_timelogs_create(adminConnection, {
      body: {
        project_id: activeProject.id,
        date: lastWeek.toISOString(),
        duration: 240, // 4 hours
        billable: true,
        description: "Old marketing work",
      },
    });
  typia.assert(activeTimelogOld);
  // Timelogs for completed project
  const completedTimelog1 =
    await generate_random_hrm_platform_admin_timelogs_create(adminConnection, {
      body: {
        project_id: completedProject.id,
        date: today.toISOString(),
        duration: 600, // 10 hours
        billable: true,
        description: "Website redesign final work",
      },
    });
  typia.assert(completedTimelog1);
  // Timelogs for archived project
  const archivedTimelog1 =
    await generate_random_hrm_platform_admin_timelogs_create(adminConnection, {
      body: {
        project_id: archivedProject.id,
        date: today.toISOString(),
        duration: 300, // 5 hours
        billable: false,
        description: "Legacy system documentation",
      },
    });
  typia.assert(archivedTimelog1);
  // 4. Call the endpoint with project_status filter set to 'active'
  const activeProjectsReport =
    await api.functional.hrmPlatform.admin.project_budget_reports.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          project_status: "active",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(activeProjectsReport);
  // 5. Verify only active projects with budgets are returned
  TestValidator.equals(
    "active projects count",
    activeProjectsReport.data.length,
    1,
  );
  TestValidator.equals(
    "active project id matches",
    activeProjectsReport.data[0].id,
    activeProject.id,
  );
  TestValidator.predicate(
    "active project has budget",
    activeProjectsReport.data[0].budget_hours === 100,
  );
  // 6. Call the endpoint with date_range_start and date_range_end filters
  const dateRangeReport =
    await api.functional.hrmPlatform.admin.project_budget_reports.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          date_range_start: yesterday.toISOString().split("T")[0],
          date_range_end: today.toISOString().split("T")[0],
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(dateRangeReport);
  // 7. Verify actual_hours only include timelogs within the specified date range
  const activeProjectInRange = dateRangeReport.data.find(
    (p) => p.id === activeProject.id,
  );
  TestValidator.predicate(
    "active project exists in date range report",
    activeProjectInRange !== undefined,
  );
  // Should only include timelogs from yesterday and today (8 + 6 = 14 hours), not last week
  TestValidator.equals(
    "active project actual hours in date range",
    activeProjectInRange!.actual_hours,
    14,
  );
  // 8. Verify budget_consumption_percentage is recalculated based on filtered timelogs
  TestValidator.equals(
    "active project budget consumption percentage",
    activeProjectInRange!.budget_consumption_percentage,
    14,
  );
  // 9. Test search functionality by providing a project name search term
  const searchReport =
    await api.functional.hrmPlatform.admin.project_budget_reports.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          search: "Marketing",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(searchReport);
  // 10. Verify only projects matching the search term are returned
  TestValidator.predicate(
    "search returns matching projects",
    searchReport.data.length >= 1,
  );
  TestValidator.equals(
    "search result contains marketing project",
    searchReport.data.some((p) => p.name.includes("Marketing")),
    true,
  );
  // 11. Verify pagination works correctly with filters applied
  const paginationReport =
    await api.functional.hrmPlatform.admin.project_budget_reports.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 2,
          project_status: "completed",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(paginationReport);
  TestValidator.equals(
    "pagination limit respected",
    paginationReport.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination current page",
    paginationReport.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records count valid",
    paginationReport.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginationReport.pagination.pages >= 0,
  );
}
