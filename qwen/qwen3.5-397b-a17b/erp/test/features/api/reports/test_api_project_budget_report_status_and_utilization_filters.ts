import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEHrmPlatformProjectStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEHrmPlatformProjectStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetReport";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
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
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_project_budget_report_status_and_utilization_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with report:view permission
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create employee record (member becomes employee)
  // Note: In production, role_id would be obtained from organization's roles
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.member.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
        status: "active",
      },
    },
  );
  typia.assert(employee);
  // 4. Create projects with different statuses and budget utilization levels
  // Project 1: Active, low utilization (~25%)
  const projectLowUtilization =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Low Utilization Project",
          color_code: "#FF0000",
          status: "active",
          budget_hours: 100,
        },
      },
    );
  typia.assert(projectLowUtilization);
  // Project 2: Active, high utilization (~85%)
  const projectHighUtilization =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "High Utilization Project",
          color_code: "#00FF00",
          status: "active",
          budget_hours: 100,
        },
      },
    );
  typia.assert(projectHighUtilization);
  // Project 3: Active, over budget (~120%)
  const projectOverBudget =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Over Budget Project",
          color_code: "#0000FF",
          status: "active",
          budget_hours: 50,
        },
      },
    );
  typia.assert(projectOverBudget);
  // Project 4: Archived project
  const projectArchived =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Archived Project",
          color_code: "#FFFF00",
          status: "archived",
          budget_hours: 80,
        },
      },
    );
  typia.assert(projectArchived);
  // Project 5: Completed project
  const projectCompleted =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Completed Project",
          color_code: "#FF00FF",
          status: "completed",
          budget_hours: 60,
        },
      },
    );
  typia.assert(projectCompleted);
  // Project 6: No budget (null budget_hours)
  const projectNoBudget =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "No Budget Project",
          color_code: "#00FFFF",
          status: "active",
          budget_hours: null,
        },
      },
    );
  typia.assert(projectNoBudget);
  // 5. Assign employee to all projects
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: projectLowUtilization.id },
      body: {
        hrm_platform_employee_id: employee.id,
        role: "member",
      },
    },
  );
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: projectHighUtilization.id },
      body: {
        hrm_platform_employee_id: employee.id,
        role: "member",
      },
    },
  );
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: projectOverBudget.id },
      body: {
        hrm_platform_employee_id: employee.id,
        role: "member",
      },
    },
  );
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: projectArchived.id },
      body: {
        hrm_platform_employee_id: employee.id,
        role: "member",
      },
    },
  );
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: projectCompleted.id },
      body: {
        hrm_platform_employee_id: employee.id,
        role: "member",
      },
    },
  );
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: projectNoBudget.id },
      body: {
        hrm_platform_employee_id: employee.id,
        role: "member",
      },
    },
  );
  // 6. Create timelogs to establish different utilization percentages
  const workDate = new Date().toISOString();
  // Low utilization: 25 hours out of 100 budget (25%)
  await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
    body: {
      project_id: projectLowUtilization.id,
      date: workDate,
      duration_minutes: 25 * 60,
      billable: true,
    },
  });
  // High utilization: 85 hours out of 100 budget (85%)
  await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
    body: {
      project_id: projectHighUtilization.id,
      date: workDate,
      duration_minutes: 85 * 60,
      billable: true,
    },
  });
  // Over budget: 60 hours out of 50 budget (120%)
  await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
    body: {
      project_id: projectOverBudget.id,
      date: workDate,
      duration_minutes: 60 * 60,
      billable: true,
    },
  });
  // Archived: 40 hours out of 80 budget (50%)
  await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
    body: {
      project_id: projectArchived.id,
      date: workDate,
      duration_minutes: 40 * 60,
      billable: true,
    },
  });
  // Completed: 30 hours out of 60 budget (50%)
  await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
    body: {
      project_id: projectCompleted.id,
      date: workDate,
      duration_minutes: 30 * 60,
      billable: true,
    },
  });
  // No budget: 20 hours (utilization should be null)
  await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
    body: {
      project_id: projectNoBudget.id,
      date: workDate,
      duration_minutes: 20 * 60,
      billable: true,
    },
  });
  // 7. Test scenario 1: Filter by status=active
  const activeProjectsReport =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          status: "active",
          sort: "utilization_percentage",
          direction: "desc",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(activeProjectsReport);
  TestValidator.predicate("active filter returns only active projects", () =>
    activeProjectsReport.data.every((p) => p.status === "active"),
  );
  TestValidator.predicate(
    "active filter includes low utilization project",
    () =>
      activeProjectsReport.data.some((p) => p.id === projectLowUtilization.id),
  );
  TestValidator.predicate("active filter includes over budget project", () =>
    activeProjectsReport.data.some((p) => p.id === projectOverBudget.id),
  );
  TestValidator.predicate(
    "active filter excludes archived project",
    () => !activeProjectsReport.data.some((p) => p.id === projectArchived.id),
  );
  // 8. Test scenario 2: Filter by minUtilization=80 (high utilization projects)
  const highUtilizationReport =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          minUtilization: 80,
          sort: "utilization_percentage",
          direction: "desc",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(highUtilizationReport);
  TestValidator.predicate(
    "minUtilization filter returns only projects >= 80%",
    () =>
      highUtilizationReport.data.every(
        (p) =>
          p.utilization_percentage === null || p.utilization_percentage >= 80,
      ),
  );
  TestValidator.predicate("minUtilization includes over budget project", () =>
    highUtilizationReport.data.some((p) => p.id === projectOverBudget.id),
  );
  TestValidator.predicate(
    "minUtilization includes high utilization project",
    () =>
      highUtilizationReport.data.some(
        (p) => p.id === projectHighUtilization.id,
      ),
  );
  TestValidator.predicate(
    "minUtilization excludes low utilization project",
    () =>
      !highUtilizationReport.data.some(
        (p) => p.id === projectLowUtilization.id,
      ),
  );
  // 9. Test scenario 3: Filter by maxUtilization=50 (low utilization projects)
  const lowUtilizationReport =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          maxUtilization: 50,
          sort: "utilization_percentage",
          direction: "asc",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(lowUtilizationReport);
  TestValidator.predicate(
    "maxUtilization filter returns only projects <= 50%",
    () =>
      lowUtilizationReport.data.every(
        (p) =>
          p.utilization_percentage === null || p.utilization_percentage <= 50,
      ),
  );
  TestValidator.predicate(
    "maxUtilization includes low utilization project",
    () =>
      lowUtilizationReport.data.some((p) => p.id === projectLowUtilization.id),
  );
  // 10. Test scenario 4: Filter by status=archived
  const archivedProjectsReport =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          status: "archived",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(archivedProjectsReport);
  TestValidator.predicate(
    "archived filter returns only archived projects",
    () => archivedProjectsReport.data.every((p) => p.status === "archived"),
  );
  TestValidator.predicate("archived filter includes archived project", () =>
    archivedProjectsReport.data.some((p) => p.id === projectArchived.id),
  );
  TestValidator.predicate(
    "archived project has actual hours from timelogs",
    () =>
      archivedProjectsReport.data.some(
        (p) => p.id === projectArchived.id && p.actual_hours > 0,
      ),
  );
  // 11. Test scenario 5: Search by project name (case-insensitive)
  const searchReport =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          search: "budget",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(searchReport);
  TestValidator.predicate("search returns projects with matching name", () =>
    searchReport.data.every((p) => p.name.toLowerCase().includes("budget")),
  );
  TestValidator.predicate("search finds Over Budget Project", () =>
    searchReport.data.some((p) => p.id === projectOverBudget.id),
  );
  TestValidator.predicate("search finds No Budget Project", () =>
    searchReport.data.some((p) => p.id === projectNoBudget.id),
  );
  // 12. Test sorting by utilization_percentage descending
  const sortedReport =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          sort: "utilization_percentage",
          direction: "desc",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(sortedReport);
  TestValidator.predicate("sorting desc puts highest utilization first", () => {
    const withUtilization = sortedReport.data.filter(
      (p) => p.utilization_percentage !== null,
    );
    for (let i = 1; i < withUtilization.length; i++) {
      if (
        withUtilization[i - 1].utilization_percentage! <
        withUtilization[i].utilization_percentage!
      ) {
        return false;
      }
    }
    return true;
  });
  // 13. Test null budget_hours handling
  const allProjectsReport =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          limit: 100,
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(allProjectsReport);
  const noBudgetProject = allProjectsReport.data.find(
    (p) => p.id === projectNoBudget.id,
  );
  TestValidator.predicate(
    "no budget project has null utilization_percentage",
    () => noBudgetProject?.utilization_percentage === null,
  );
  TestValidator.predicate(
    "no budget project has actual hours",
    () => noBudgetProject !== undefined && noBudgetProject.actual_hours > 0,
  );
}
