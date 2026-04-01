import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
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
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timelog_update_approved_timesheet_locked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create employee member account
  const employeeAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAuth);
  // 2. Create employee-specific connection and organization
  const employeeConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: employeeAuth.token.access },
  };
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      employeeConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Select organization context
  await api.functional.hrmPlatform.member.organizations.select(
    employeeConnection,
    {
      organizationId: organization.id,
    },
  );
  // 4. Create project for timelog
  const project = await generate_random_hrm_platform_member_projects_create(
    employeeConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF0000",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Get employee record (automatically created with organization)
  const employees = await api.functional.hrmPlatform.member.employees.index(
    employeeConnection,
    { body: {} },
  );
  typia.assert(employees);
  const employee = employees.data[0];
  typia.assert(employee);
  // 6. Assign employee to project as member
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      employeeConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 7. Create timelog for the employee
  const today = new Date();
  const timelogDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        date: timelogDate.toISOString(),
        durationMinutes: 60,
        projectId: project.id,
        description: "Test timelog entry",
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 8. Calculate week start (Monday) for timesheet
  const dayOfWeek = timelogDate.getDay();
  const diff = timelogDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const weekStart = new Date(timelogDate);
  weekStart.setDate(diff);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  // 9. Create draft timesheet for the week
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: weekStart.toISOString().split("T")[0],
        week_end_date: weekEnd.toISOString().split("T")[0],
      },
    },
  );
  typia.assert(timesheet);
  // 10. Submit timesheet for approval
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      employeeConnection,
      { timesheetId: timesheet.id },
    );
  typia.assert(submittedTimesheet);
  // 11. Approve timesheet (using same connection - Owner has time:approve permission)
  const approvedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.approve(
      employeeConnection,
      { timesheetId: timesheet.id },
    );
  typia.assert(approvedTimesheet);
  // 12. Attempt to update the timelog (should fail - locked by approved timesheet)
  await TestValidator.error(
    "timelog update should fail when timesheet is approved",
    async () => {
      await api.functional.hrmPlatform.member.timelogs.update(
        employeeConnection,
        {
          timelogId: timelog.id,
          body: {
            duration_minutes: 90,
            description: "Updated description",
          },
        },
      );
    },
  );
}
