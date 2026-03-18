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

/**
 * Test project budget utilization report with timelogs.
 *
 * This test validates the project budget report endpoint by:
 * 1. Creating a member account and organization
 * 2. Creating an employee record
 * 3. Creating multiple projects with different budget_hours values
 * 4. Assigning the employee to all projects
 * 5. Creating timelogs with specific durations
 * 6. Verifying the budget report calculates actual_hours and utilization_percentage correctly
 */
export async function test_api_project_budget_report_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (automatically gains Owner role)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create employee record (using the authenticated member's ID)
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: authorized.member.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Create projects with different budget_hours values
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Alpha - 100 hours budget",
        color_code: "#FF5733",
        budget_hours: 100,
        status: "active",
      },
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Beta - 50 hours budget",
        color_code: "#33FF57",
        budget_hours: 50,
        status: "active",
      },
    },
  );
  typia.assert(project2);
  const project3 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Gamma - No budget",
        color_code: "#3357FF",
        budget_hours: null,
        status: "active",
      },
    },
  );
  typia.assert(project3);
  // 5. Assign employee to all projects as project member
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project1.id },
      body: {
        hrm_platform_employee_id: employee.id,
        role: "member",
      } satisfies IHrmPlatformProjectMember.ICreate,
    },
  );
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project2.id },
      body: {
        hrm_platform_employee_id: employee.id,
        role: "member",
      } satisfies IHrmPlatformProjectMember.ICreate,
    },
  );
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project3.id },
      body: {
        hrm_platform_employee_id: employee.id,
        role: "member",
      } satisfies IHrmPlatformProjectMember.ICreate,
    },
  );
  // 6. Create timelogs for the employee on these projects
  // Project 1: 3000 minutes = 50 hours (50% of 100 hours budget)
  const workDate = new Date().toISOString();
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project1.id,
        date: workDate,
        duration_minutes: 3000,
        description: "Development work on Project Alpha",
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  // Project 2: 1800 minutes = 30 hours (60% of 50 hours budget)
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project2.id,
        date: workDate,
        duration_minutes: 1800,
        description: "Design work on Project Beta",
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  // Project 3: 600 minutes = 10 hours (no budget, should show null utilization)
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project3.id,
        date: workDate,
        duration_minutes: 600,
        description: "Research work on Project Gamma",
        billable: true,
      },
    },
  );
  typia.assert(timelog3);
  // 7. Call the budget report endpoint
  const report =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(report);
  // 8. Validate pagination metadata
  TestValidator.predicate("pagination exists", report.pagination !== undefined);
  TestValidator.predicate("has data array", Array.isArray(report.data));
  TestValidator.predicate("has at least 3 projects", report.data.length >= 3);
  TestValidator.predicate("current page >= 1", report.pagination.current >= 1);
  TestValidator.predicate("limit >= 1", report.pagination.limit >= 1);
  TestValidator.predicate("records >= 3", report.pagination.records >= 3);
  TestValidator.predicate("pages >= 1", report.pagination.pages >= 1);
  // 9. Find projects in the report
  const project1Report = report.data.find((r) => r.id === project1.id);
  const project2Report = report.data.find((r) => r.id === project2.id);
  const project3Report = report.data.find((r) => r.id === project3.id);
  TestValidator.predicate("project 1 in report", project1Report !== undefined);
  TestValidator.predicate("project 2 in report", project2Report !== undefined);
  TestValidator.predicate("project 3 in report", project3Report !== undefined);
  // 10. Validate project 1: 100 budget hours, 50 actual hours, 50% utilization
  if (project1Report) {
    TestValidator.equals(
      "project 1 budget_hours",
      project1Report.budget_hours,
      100,
    );
    TestValidator.equals(
      "project 1 actual_hours",
      project1Report.actual_hours,
      50,
    );
    TestValidator.equals(
      "project 1 utilization_percentage",
      project1Report.utilization_percentage,
      50,
    );
    TestValidator.equals(
      "project 1 name",
      project1Report.name,
      "Project Alpha - 100 hours budget",
    );
    TestValidator.equals(
      "project 1 color_code",
      project1Report.color_code,
      "#FF5733",
    );
    TestValidator.equals("project 1 status", project1Report.status, "active");
  }
  // 11. Validate project 2: 50 budget hours, 30 actual hours, 60% utilization
  if (project2Report) {
    TestValidator.equals(
      "project 2 budget_hours",
      project2Report.budget_hours,
      50,
    );
    TestValidator.equals(
      "project 2 actual_hours",
      project2Report.actual_hours,
      30,
    );
    TestValidator.equals(
      "project 2 utilization_percentage",
      project2Report.utilization_percentage,
      60,
    );
    TestValidator.equals(
      "project 2 name",
      project2Report.name,
      "Project Beta - 50 hours budget",
    );
    TestValidator.equals(
      "project 2 color_code",
      project2Report.color_code,
      "#33FF57",
    );
    TestValidator.equals("project 2 status", project2Report.status, "active");
  }
  // 12. Validate project 3: null budget hours (shown as 0), 10 actual hours, null utilization
  if (project3Report) {
    TestValidator.equals(
      "project 3 budget_hours",
      project3Report.budget_hours,
      0,
    );
    TestValidator.equals(
      "project 3 actual_hours",
      project3Report.actual_hours,
      10,
    );
    TestValidator.equals(
      "project 3 utilization_percentage",
      project3Report.utilization_percentage,
      null,
    );
    TestValidator.equals(
      "project 3 name",
      project3Report.name,
      "Project Gamma - No budget",
    );
    TestValidator.equals(
      "project 3 color_code",
      project3Report.color_code,
      "#3357FF",
    );
    TestValidator.equals("project 3 status", project3Report.status, "active");
  }
}
