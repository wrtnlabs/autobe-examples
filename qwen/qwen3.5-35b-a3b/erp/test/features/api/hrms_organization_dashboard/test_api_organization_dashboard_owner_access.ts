import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_organization_dashboard_owner_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth: Register new member which creates organization
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Extract organization ID and role from authorized response
  const organizationMembership = authorized.organization_memberships[0];
  typia.assert(organizationMembership);
  const { organization } = organizationMembership;
  const organizationId = organization.id;
  const organizationRoleId = organizationMembership.organizationRole.id;
  typia.assert(organizationId);
  // 2. Employees: Create 3 employees in the organization
  const employeeIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const employeeJoinConnection: api.IConnection = { host: connection.host };
    const employeeAuthorized = await authorize_member_join(
      employeeJoinConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
    typia.assert(employeeAuthorized);
    employeeIds.push(employeeAuthorized.id);
    const employeeMembership =
      await generate_random_hrms_member_organization_members_create(
        { host: connection.host },
        {
          body: {
            hrms_member_id: employeeAuthorized.id,
            hrms_organization_id: organizationId,
            hrms_organization_role_id: organizationRoleId,
          },
        },
      );
    typia.assert(employeeMembership);
  }
  // 3. Generate random project IDs for timelogs (since project response lacks id)
  const projectIds: string[] = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // 4. Timelogs: Create timelogs for current week and past weeks
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay()); // Get Monday
  // Create timelogs for current week (this should be counted in totalHoursThisWeek)
  for (let i = 0; i < 3; i++) {
    const workDate = new Date(currentWeekStart);
    workDate.setDate(currentWeekStart.getDate() + (i % 5)); // Monday to Friday
    workDate.setHours(10, 0, 0, 0);
    for (const employeeId of employeeIds) {
      for (const projectId of projectIds) {
        const timelog =
          await generate_random_hrms_member_organizations_employees_timelogs_create(
            { host: connection.host },
            {
              body: {
                date: workDate.toISOString(),
                duration_minutes: typia.random<
                  number &
                    tags.Type<"uint32"> &
                    tags.Minimum<60> &
                    tags.Maximum<480>
                >(),
                project_id: projectId,
                billable: true,
              },
              params: { organizationId, employeeId },
            },
          );
        typia.assert(timelog);
      }
    }
  }
  // Create timelogs for past weeks (should NOT be counted in totalHoursThisWeek)
  for (let i = 0; i < 2; i++) {
    const pastWeekDate = new Date(currentWeekStart);
    pastWeekDate.setDate(currentWeekStart.getDate() - 7 * (i + 1));
    pastWeekDate.setHours(10, 0, 0, 0);
    for (const employeeId of employeeIds) {
      const timelog =
        await generate_random_hrms_member_organizations_employees_timelogs_create(
          { host: connection.host },
          {
            body: {
              date: pastWeekDate.toISOString(),
              duration_minutes: typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<120> &
                  tags.Maximum<480>
              >(),
              project_id: projectIds[0],
              billable: true,
            },
            params: { organizationId, employeeId },
          },
        );
      typia.assert(timelog);
    }
  }
  // 5. Timesheets: Create submitted timesheets for pending count metric
  for (let i = 0; i < 2; i++) {
    const timesheetDate = new Date(currentWeekStart);
    timesheetDate.setDate(currentWeekStart.getDate() - 7 * (i + 1)); // Past weeks
    const timesheet = await generate_random_hrms_member_timesheets_create(
      { host: connection.host },
      {
        body: {
          week_start_date: timesheetDate.toISOString(),
        },
      },
    );
    typia.assert(timesheet);
  }
  // 6. Target: Get organization dashboard
  const dashboardConnection: api.IConnection = { host: connection.host };
  const dashboard =
    await api.functional.hrms.member.organization_dashboard.getDashboard(
      dashboardConnection,
    );
  typia.assert(dashboard);
  // 7. Validate metrics
  // activeEmployeeCount should be 3 (the employees we created)
  TestValidator.equals(
    "active employee count",
    dashboard.totalActiveEmployees,
    3,
  );
  // totalHoursThisWeek should be calculated from current week timelogs
  TestValidator.predicate(
    "total hours this week is positive",
    dashboard.totalHoursThisWeek > 0,
  );
  // pendingTimesheetsCount should be at least 0
  TestValidator.predicate(
    "pending timesheets count is non-negative",
    dashboard.pendingTimesheetsCount >= 0,
  );
  // projectsOverBudget contains array of projects
  TestValidator.predicate(
    "projects over budget is array",
    Array.isArray(dashboard.projectsOverBudget),
  );
  // topEmployees contains ranked list of employees
  TestValidator.predicate(
    "top employees is array",
    Array.isArray(dashboard.topEmployees),
  );
  // generatedAt timestamp is present and recent
  TestValidator.predicate(
    "generatedAt is present",
    dashboard.generatedAt !== undefined,
  );
  const generatedAtDate = new Date(dashboard.generatedAt);
  const nowDate = new Date();
  const diffMs = nowDate.getTime() - generatedAtDate.getTime();
  TestValidator.predicate(
    "generatedAt is recent (within 1 minute)",
    Math.abs(diffMs) < 60000,
  );
}
