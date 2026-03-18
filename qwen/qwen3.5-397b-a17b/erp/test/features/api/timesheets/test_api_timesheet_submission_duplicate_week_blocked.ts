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

export async function test_api_timesheet_submission_duplicate_week_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authenticated connection
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
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 2. Create employee record for the member
  const employee = await api.functional.hrmPlatform.member.employees.create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 3. Create project for timelog assignment
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Assign employee to project
  const projectMember =
    await api.functional.hrmPlatform.member.projects.members.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 5. Create timelog for the employee
  const testDate = new Date();
  testDate.setHours(0, 0, 0, 0);
  const timelog = await api.functional.hrmPlatform.member.timelogs.create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: testDate.toISOString(),
        duration_minutes: 120,
        description: "Test work entry",
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 6. Calculate week start date (Monday)
  const weekStartDate = new Date(testDate);
  const dayOfWeek = weekStartDate.getDay();
  const diff = weekStartDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  weekStartDate.setDate(diff);
  weekStartDate.setHours(0, 0, 0, 0);
  // 7. Create first draft timesheet for the week
  const firstTimesheet =
    await api.functional.hrmPlatform.member.timesheets.create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDate.toISOString(),
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(firstTimesheet);
  // 8. Submit first timesheet successfully
  const submittedFirstTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      memberConnection,
      {
        timesheetId: firstTimesheet.id,
      },
    );
  typia.assert(submittedFirstTimesheet);
  TestValidator.equals(
    "first timesheet status after submit",
    submittedFirstTimesheet.status,
    "submitted",
  );
  // 9. Create second draft timesheet for the SAME week
  const secondTimesheet =
    await api.functional.hrmPlatform.member.timesheets.create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDate.toISOString(),
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(secondTimesheet);
  TestValidator.equals(
    "second timesheet initial status",
    secondTimesheet.status,
    "draft",
  );
  // 10. Attempt to submit second timesheet - should fail with conflict error
  await TestValidator.error(
    "duplicate week timesheet submission blocked",
    async () => {
      await api.functional.hrmPlatform.member.timesheets.submit(
        memberConnection,
        {
          timesheetId: secondTimesheet.id,
        },
      );
    },
  );
}
