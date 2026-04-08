import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_tasks_create } from "../../../generate/generate_random_hrm_platform_member_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_deletion_access_denied_owner_other_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Manager user (will have organization with Owner role)
  const managerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Manager@123456",
    name: RandomGenerator.name(),
    org_name: RandomGenerator.name(3),
    org_currency: "USD",
    org_description: "Manager's organization",
    href: "https://test.example.com/join",
    referrer: "https://test.example.com/signup",
  } satisfies IHrmPlatformMember.IJoin;
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: managerJoinInput,
  });
  typia.assert(managerAuth);
  // 2. Manager creates department
  const department =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      managerConnection,
      {
        organizationId: managerAuth.member.id,
        body: {
          name: RandomGenerator.alphabets(5),
        },
      },
    );
  typia.assert(department);
  // 3. Manager creates project
  const project = await api.functional.hrmPlatform.member.projects.create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        color_code: `#${Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0")}`,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Register Employee user in the SAME organization
  const employeeJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Employee@123456",
    name: RandomGenerator.name(),
    org_name: managerJoinInput.org_name, // Same org as Manager
    org_currency: "USD",
    org_description: managerJoinInput.org_description,
    href: "https://test.example.com/join",
    referrer: "https://test.example.com/signup",
  } satisfies IHrmPlatformMember.IJoin;
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: employeeJoinInput,
  });
  typia.assert(employeeAuth);
  // 5. Employee creates project in their organization
  const employeeProject =
    await api.functional.hrmPlatform.member.projects.create(
      employeeConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          color_code: `#${Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0")}`,
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(employeeProject);
  // 6. Create timelog entry for the employee (without task, task_id is optional)
  const timelogStart = new Date();
  timelogStart.setHours(9, 0, 0, 0);
  const timelogEnd = new Date();
  timelogEnd.setHours(17, 0, 0, 0);
  const timelog = await api.functional.hrmPlatform.member.timelogs.create(
    employeeConnection,
    {
      body: {
        employee_id: employeeAuth.member.id,
        project_id: employeeProject.id,
        start_datetime: timelogStart.toISOString(),
        end_datetime: timelogEnd.toISOString(),
        duration_minutes: 480,
        description: "Work session for testing timesheet deletion",
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 7. Create timesheet for the employee (status: pending)
  const timesheetStartDate = new Date();
  timesheetStartDate.setDate(1);
  timesheetStartDate.setHours(0, 0, 0, 0);
  const timesheetEndDate = new Date();
  timesheetEndDate.setDate(7);
  timesheetEndDate.setHours(23, 59, 59, 999);
  const timesheet = await api.functional.hrmPlatform.member.timesheets.create(
    employeeConnection,
    {
      body: {
        start_date: timesheetStartDate.toISOString(),
        end_date: timesheetEndDate.toISOString(),
        hrm_platform_employee_id: employeeAuth.member.id,
        notes: "Timesheet for testing deletion access control",
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // Verify timesheet is in pending status
  TestValidator.equals("timesheet is pending", timesheet.status, "pending");
  // 8. Attempt to delete the employee's timesheet as the Manager
  // Manager does not have time:manage permission, so deletion should fail with 403
  await TestValidator.error(
    "manager cannot delete other employee's timesheet without time:manage permission",
    async () => {
      await api.functional.hrmPlatform.member.timesheets.erase(
        managerConnection,
        {
          timesheetId: timesheet.id,
        },
      );
    },
  );
}
