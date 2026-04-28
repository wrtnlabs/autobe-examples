import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
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
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_update_remove_timelogs(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: "test_member@e2e.test",
        password: "123456",
        display_name: "Test Member",
        href: "https://test.example.com",
        referrer: "https://test.example.com/join",
        ip: "192.168.1.1",
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  const role: IHrmPlatformRole =
    await generate_random_hrm_platform_member_roles_create(memberConnection, {
      body: {
        name: "Time Manager",
        description: "Role with time management permissions",
        permissionKeys: ["time:manage", "project:view", "employee:view"],
      } satisfies IHrmPlatformRole.ICreate,
    });
  typia.assert(role);
  const employee: IHrmPlatformEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      {
        body: {
          memberId: member.id,
          roleId: role.id,
          employmentType: "full-time",
        } satisfies IHrmPlatformEmployee.ICreate,
      },
    );
  typia.assert(employee);
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Test Project" + RandomGenerator.alphabets(3),
          color_code: "#FF5733",
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(project);
  const projectMembership: IHrmPlatformProjectMembership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        body: {
          employeeId: employee.id,
          capacityRole: "member",
        } satisfies IHrmPlatformProjectMembership.ICreate,
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMembership);
  const timelogs: IHrmPlatformTimelog[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      return await generate_random_hrm_platform_member_timelogs_create(
        memberConnection,
        {
          body: {
            projectId: project.id,
            date: new Date().toISOString(),
            durationMinutes: 60,
            billable: true,
            workDescription: "Test work " + RandomGenerator.alphabets(5),
          } satisfies IHrmPlatformTimelog.ICreate,
        },
      );
    },
  );
  timelogs.forEach((timelog) => {
    typia.assert(timelog);
  });
  const timesheet: IHrmPlatformTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: new Date().toISOString(),
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheet);
  const updatedTimesheet: IHrmPlatformTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          timelogIds: [],
        } satisfies IHrmPlatformTimesheet.IUpdate,
      },
    );
  typia.assert(updatedTimesheet);
  TestValidator.equals(
    "total_hours should be 0 after removing all timelogs",
    updatedTimesheet.total_hours,
    0,
  );
  TestValidator.equals(
    "timelogs array should be empty",
    updatedTimesheet.timelogs.length,
    0,
  );
}
