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

/**
 * Test successful timesheet submission workflow with timelogs.
 *
 * This test validates the complete timesheet submission process:
 * 1. Member account creation and authentication
 * 2. Employee record creation for the member
 * 3. Project creation and employee assignment
 * 4. Timelog creation for work tracking
 * 5. Draft timesheet creation for the week
 * 6. Timesheet submission and status validation
 */
export async function test_api_timesheet_submission_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
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
  // Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 2. Create employee record for the member
  // The generate function will handle role_id and other required fields
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 3. Create project for timelog assignment
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
      },
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
        },
      },
    );
  typia.assert(projectMember);
  // 5. Create timelog for the employee on the project
  // Calculate Monday of current week for the work date
  const currentDate = new Date();
  const dayOfWeek = currentDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayDate = new Date(currentDate);
  mondayDate.setDate(currentDate.getDate() + mondayOffset);
  mondayDate.setHours(0, 0, 0, 0);
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: mondayDate.toISOString(),
        duration_minutes: 480,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 6. Create draft timesheet for the week containing the timelog date
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: mondayDate.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Verify timesheet is in draft status before submission
  TestValidator.equals("timesheet initial status", timesheet.status, "draft");
  TestValidator.equals("timesheet has timelogs", timesheet.timelogs.length, 1);
  // 7. Submit the draft timesheet
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      memberConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // 8. Validate submission results - business logic validation
  TestValidator.equals(
    "timesheet status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is populated",
    submittedTimesheet.submitted_at !== null &&
      submittedTimesheet.submitted_at !== undefined,
  );
  TestValidator.equals(
    "timesheet owner matches employee",
    submittedTimesheet.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "timelogs count preserved",
    submittedTimesheet.timelogs.length,
    1,
  );
  TestValidator.equals(
    "timelog id matches",
    submittedTimesheet.timelogs[0].id,
    timelog.id,
  );
}
