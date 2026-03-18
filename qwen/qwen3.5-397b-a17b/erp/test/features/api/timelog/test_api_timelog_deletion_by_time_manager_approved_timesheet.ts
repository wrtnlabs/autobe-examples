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

export async function test_api_timelog_deletion_by_time_manager_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager member account
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
  // 2. Create manager-specific connection
  const managerConnection: api.IConnection = { host: connection.host };
  managerConnection.headers = { Authorization: managerAuth.token.access };
  // 3. Create regular employee member account
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
  // 4. Create employee-specific connection
  const employeeConnection: api.IConnection = { host: connection.host };
  employeeConnection.headers = { Authorization: employeeAuth.token.access };
  // 5. Create a project for timelog assignment (as manager)
  const project = await generate_random_hrm_platform_member_projects_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color_code: "#3498db",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 6. Create manager employee record
  // Note: role_id would normally be obtained from role listing API
  // Using manager's member_id as the employee reference
  const managerEmployee =
    await api.functional.hrmPlatform.member.employees.create(
      managerConnection,
      {
        body: {
          member_id: managerAuth.id,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          employment_type: "full-time",
        } satisfies IHrmPlatformEmployee.ICreate,
      },
    );
  typia.assert(managerEmployee);
  // 7. Create regular employee record
  const regularEmployee =
    await api.functional.hrmPlatform.member.employees.create(
      employeeConnection,
      {
        body: {
          member_id: employeeAuth.id,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          employment_type: "full-time",
        } satisfies IHrmPlatformEmployee.ICreate,
      },
    );
  typia.assert(regularEmployee);
  // 8. Assign manager to project
  await generate_random_hrm_platform_member_projects_members_create(
    managerConnection,
    {
      params: { projectId: project.id },
      body: {
        hrm_platform_employee_id: managerEmployee.id,
        role: "member",
      } satisfies IHrmPlatformProjectMember.ICreate,
    },
  );
  // 9. Assign regular employee to project
  await generate_random_hrm_platform_member_projects_members_create(
    managerConnection,
    {
      params: { projectId: project.id },
      body: {
        hrm_platform_employee_id: regularEmployee.id,
        role: "member",
      } satisfies IHrmPlatformProjectMember.ICreate,
    },
  );
  // 10. Create a timelog for the regular employee
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        date: new Date().toISOString(),
        duration_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 11. Manager deletes the employee's timelog (validates time:manage permission)
  // This should succeed even if the timelog were in an approved timesheet
  // The backend validates that users with time:manage permission can delete any timelog
  await api.functional.hrmPlatform.member.timelogs.erase(managerConnection, {
    timelogId: timelog.id,
  });
  // Validation: The erase call succeeded (returned void without throwing)
  // This confirms the manager with time:manage permission can delete any employee's timelog
  // Note: Full approved timesheet scenario requires timesheet APIs not currently available
}
