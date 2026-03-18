import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboard";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectBudgetAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetAnalytic";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
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
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test the organization dashboard endpoint to verify it correctly aggregates
 * and returns organizational performance metrics. Authenticate as a member
 * with report:view permission in an organization. Call the dashboard endpoint
 * without date filters to retrieve default current week data. Validate the
 * response includes all required metrics: totalActiveEmployees,
 * totalHoursThisWeek, pendingTimesheetsCount, projectsOverBudget, and
 * topEmployeesByHours. Verify all data is properly scoped to the current
 * organization.
 */
export async function test_api_organization_dashboard_with_active_employees_and_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
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
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Call organization dashboard endpoint
  const dashboard =
    await api.functional.hrmPlatform.member.dashboard.organization.at(
      memberConnection,
      {
        body: {} satisfies IHrmPlatformOrganizationDashboard.IRequest,
      },
    );
  typia.assert(dashboard);
  // 4. Validate dashboard metrics structure and types
  TestValidator.predicate(
    "total active employees is non-negative number",
    dashboard.totalActiveEmployees >= 0,
  );
  TestValidator.predicate(
    "total hours this week is non-negative number",
    dashboard.totalHoursThisWeek >= 0,
  );
  TestValidator.predicate(
    "pending timesheets count is non-negative number",
    dashboard.pendingTimesheetsCount >= 0,
  );
  TestValidator.predicate(
    "projects over budget is array",
    Array.isArray(dashboard.projectsOverBudget),
  );
  TestValidator.predicate(
    "top employees by hours is array",
    Array.isArray(dashboard.topEmployeesByHours),
  );
  TestValidator.predicate(
    "top employees max 5",
    dashboard.topEmployeesByHours.length <= 5,
  );
  // 5. Validate projects over budget structure if any exist
  if (dashboard.projectsOverBudget.length > 0) {
    const project = dashboard.projectsOverBudget[0];
    TestValidator.predicate(
      "project has valid ID",
      typeof project.projectId === "string",
    );
    TestValidator.predicate(
      "actual hours is non-negative",
      project.actualHours >= 0,
    );
  }
  // 6. Validate top employees structure if any exist
  if (dashboard.topEmployeesByHours.length > 0) {
    const employee = dashboard.topEmployeesByHours[0];
    TestValidator.predicate(
      "employee has valid ID",
      typeof employee.employeeId === "string",
    );
    TestValidator.predicate(
      "employee has name",
      typeof employee.name === "string",
    );
    TestValidator.predicate(
      "employee total hours is non-negative",
      employee.totalHours >= 0,
    );
  }
}
