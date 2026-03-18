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
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_retrieve_another_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register manager member account
  const managerAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Manager123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(managerAuth);
  // 2. Create manager connection with authentication token
  const managerConnection: api.IConnection = { host: connection.host };
  managerConnection.headers = { Authorization: managerAuth.token.access };
  // 3. Register employee member account
  const employeeAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Employee123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 4. Create employee connection with authentication token
  const employeeConnection: api.IConnection = { host: connection.host };
  employeeConnection.headers = { Authorization: employeeAuth.token.access };
  // 5. Create employee record for the employee member
  const employee = await generate_random_hrm_platform_member_employees_create(
    employeeConnection,
    {
      body: {
        member_id: employeeAuth.member.id,
        employment_type: "full-time",
        role_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 6. Create a project using employee connection
  const project = await generate_random_hrm_platform_member_projects_create(
    employeeConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 7. Assign employee to the project
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      employeeConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 8. Create a timelog for the employee
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        date: new Date().toISOString(),
        duration_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 9. Calculate week start date (Monday) for the timesheet
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  // 10. Create a timesheet for the employee
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: monday.toISOString(),
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 11. Submit the timesheet
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      employeeConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // 12. Manager retrieves the employee's timesheet (validates permission-based access)
  const retrievedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.at(managerConnection, {
      timesheetId: submittedTimesheet.id,
    });
  typia.assert(retrievedTimesheet);
  // 13. Validate the timesheet details
  TestValidator.equals(
    "timesheet id matches",
    retrievedTimesheet.id,
    submittedTimesheet.id,
  );
  TestValidator.equals(
    "employee id matches",
    retrievedTimesheet.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "timesheet status",
    retrievedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "has timelogs",
    retrievedTimesheet.timelogs.length > 0,
  );
  TestValidator.equals(
    "reviewer is null before approval",
    retrievedTimesheet.reviewedBy,
    null,
  );
}