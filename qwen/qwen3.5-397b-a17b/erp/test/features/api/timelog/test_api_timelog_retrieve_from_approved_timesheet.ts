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

export async function test_api_timelog_retrieve_from_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create employee record for the authenticated member
  // Note: role_id is required but not available via API - using DeepPartial
  // to let prepare function handle it
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        employment_type: "full-time",
      } as DeepPartial<IHrmPlatformEmployee.ICreate>,
    },
  );
  typia.assert(employee);
  // 3. Create a project to log time against
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Assign employee to project as member
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 5. Create a timelog entry for the employee
  const timelogDate = new Date().toISOString();
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: timelogDate,
        duration_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 6. Calculate the Monday of the week containing the timelog
  const timelogDateObj = new Date(timelogDate);
  const dayOfWeek = timelogDateObj.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayDate = new Date(
    timelogDateObj.getTime() + mondayOffset * 24 * 60 * 60 * 1000,
  );
  mondayDate.setHours(0, 0, 0, 0);
  // 7. Create a draft timesheet for the week containing the timelog
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: mondayDate.toISOString(),
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 8. Submit the timesheet for approval
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      memberConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  // 9. Approve the timesheet (locking the timelog)
  const approvedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.approve(
      memberConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(approvedTimesheet);
  TestValidator.equals(
    "timesheet status after approve",
    approvedTimesheet.status,
    "approved",
  );
  // 10. Retrieve the timelog using the GET endpoint
  const retrievedTimelog = await api.functional.hrmPlatform.member.timelogs.at(
    memberConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // 11. Verify the response contains complete timelog information
  TestValidator.equals("timelog ID matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals(
    "employee ID matches",
    retrievedTimelog.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "project ID matches",
    retrievedTimelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "timelog date matches",
    retrievedTimelog.date,
    timelog.date,
  );
  TestValidator.equals(
    "duration matches",
    retrievedTimelog.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "description matches",
    retrievedTimelog.description,
    timelog.description,
  );
  TestValidator.equals(
    "billable flag matches",
    retrievedTimelog.billable,
    timelog.billable,
  );
  // 12. Verify the timelog is associated with the approved timesheet
  TestValidator.predicate(
    "timelog has timesheet association",
    retrievedTimelog.timesheet !== null,
  );
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimelog.timesheet!.id,
    timesheet.id,
  );
  TestValidator.equals(
    "timesheet status is approved",
    retrievedTimelog.timesheet!.status,
    "approved",
  );
}
