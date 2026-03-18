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
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_timelog_auto_association_with_draft_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create employee record for the authenticated member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: authorized.id,
        employment_type: "full-time",
        role_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 3. Create an active project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Assign employee to the project as a member
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 5. Calculate current week's Monday and Wednesday dates (Asia/Seoul timezone)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const wednesday = new Date(monday);
  wednesday.setDate(monday.getDate() + 2);
  wednesday.setHours(10, 0, 0, 0);
  const mondayISOString = monday.toISOString();
  const wednesdayISOString = wednesday.toISOString();
  // 6. Create a timelog for Wednesday of current week (within the week period)
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: wednesdayISOString,
        duration_minutes: 120,
        billable: true,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 7. Validate timelog properties
  TestValidator.equals(
    "timelog project matches",
    timelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "timelog employee matches",
    timelog.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "timelog duration matches",
    timelog.duration_minutes,
    120,
  );
  TestValidator.equals("timelog billable flag", timelog.billable, true);
  TestValidator.predicate(
    "timelog has description",
    timelog.description !== null,
  );
  // Validate timelog date is within the week period (Monday to Sunday)
  const timelogDate = new Date(timelog.date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  TestValidator.predicate(
    "timelog date is within week period",
    timelogDate >= monday && timelogDate <= sunday,
  );
  // Validate timesheet association if present
  if (timelog.timesheet !== null) {
    TestValidator.equals(
      "timesheet status is draft",
      timelog.timesheet.status,
      "draft",
    );
    TestValidator.predicate(
      "timesheet week encompasses timelog date",
      new Date(timelog.timesheet.week_start_date) <= timelogDate &&
        new Date(timelog.timesheet.week_end_date) >= timelogDate,
    );
    TestValidator.predicate(
      "timesheet total_hours includes timelog",
      timelog.timesheet.total_hours >= timelog.duration_minutes / 60,
    );
  }
}