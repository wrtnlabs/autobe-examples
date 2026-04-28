import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformProjectWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectWeeklySummary";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProjectWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectWeeklySummary";
import type { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Verifies weekly time tracking report aggregates project timelogs correctly.
 *
 * Validates that retrieving the weekly summary report for a project with timelogs correctly aggregates the total hours logged, number of timelog entries, and count of distinct employees who contributed time during the week.
 *
 * The test establishes a complete setup by registering a member, creating a project, assigning the member as an employee with the built-in Employee role, creating project membership, logging time, and then retrieving the weekly report for validation.
 *
 * 1. Member joins the platform, creating account and default organization.
 * 2. Project is created within the organization.
 * 3. Built-in roles are fetched to locate the Employee role ID.
 * 4. Employee record is created linking the authenticated member with the Employee role.
 * 5. Project membership assigns the employee to the project with member capacity.
 * 6. A timelog is created for the project against the current week.
 * 7. Weekly summary report is retrieved and validated for correct aggregation.
 */
export async function test_api_project_weekly_report_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member - creates account and default organization
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Create project within the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(project);
  // 3. Fetch built-in roles to find Employee role ID
  const rolesPage = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: { builtIn: true },
    },
  );
  typia.assert(rolesPage);
  const employeeRole = rolesPage.data.find((r) => r.name === "Employee");
  TestValidator.predicate(
    "Employee role exists in built-in roles",
    employeeRole !== undefined,
  );
  typia.assertGuard(employeeRole!);
  // 4. Create employee record for the authenticated member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        memberId: authorized.id,
        roleId: employeeRole.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 5. Assign employee to project as member
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employeeId: employee.id,
          capacityRole: "member",
        },
      },
    );
  typia.assert(membership);
  // 6. Create timelog for the project
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: { projectId: project.id },
    },
  );
  typia.assert(timelog);
  // 7. Retrieve weekly summary report
  const weeklyReport =
    await api.functional.hrmPlatform.member.projects.reports.weekly.at(
      memberConnection,
      { projectId: project.id },
    );
  typia.assert(weeklyReport);
  // Validate report contains data
  TestValidator.predicate(
    "weekly report contains summary data",
    weeklyReport.data.length > 0,
  );
  // Find the week summary that contains our timelog's week
  const summaryData = weeklyReport.data[0];
  typia.assert(summaryData);
  // Validate aggregation: at least 1 timelog, 1 employee, positive hours
  TestValidator.predicate(
    "timelogs count is at least 1",
    summaryData.timelogs_count >= 1,
  );
  TestValidator.predicate(
    "employee count is at least 1",
    summaryData.employee_count >= 1,
  );
  TestValidator.predicate(
    "total hours is positive",
    summaryData.total_hours > 0,
  );
}
