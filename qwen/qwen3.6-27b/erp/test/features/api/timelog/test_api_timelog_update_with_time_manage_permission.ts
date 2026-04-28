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
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test permission-based access control where a user with time:manage can update another employee's timelog.
 *
 * Validates that employees with the time:manage permission can modify any employee's timelog records within their organization, overriding the default restriction that only log owners can edit their own entries. This permission is essential for time managers, HR personnel, and supervisors who need to correct or adjust time entries across the team.
 *
 * 1. Auth as Alpha member (auto-created Owner with organization).
 * 2. Create employee role and assign Alpha as employee in the org.
 * 3. Auth as Beta member (regular member joining the platform).
 * 4. Create time manager role with time:manage permission and assign Beta as employee with that role.
 * 5. Create a project and assign both Alpha and Beta as members.
 * 6. Alpha creates a timelog under the project.
 * 7. Beta uses time:manage to update Alpha's timelog (duration, description, billable).
 * 8. Validate updated timelog reflects new values and still belongs to Alpha.
 */
export async function test_api_timelog_update_with_time_manage_permission(
  connection: api.IConnection,
) {
  // 1. Auth as Alpha (Owner, auto-creates organization)
  const alphaConnection: api.IConnection = { host: connection.host };
  const alphaMember = await authorize_member_join(alphaConnection, {
    body: {
      email: "alpha@e2etest.com",
      password: "password123",
    },
  });
  typia.assert(alphaMember);
  // 2. Create employee role and assign Alpha as employee in the org
  const employeeRole = await generate_random_hrm_platform_member_roles_create(
    alphaConnection,
    {
      body: {
        name: "Employee Role",
        permissionKeys: [],
      },
    },
  );
  typia.assert(employeeRole);
  const employeeAlpha =
    await api.functional.hrmPlatform.member.employees.create(alphaConnection, {
      body: {
        memberId: alphaMember.id,
        roleId: employeeRole.id,
        employmentType: "full-time",
      } satisfies IHrmPlatformEmployee.ICreate,
    });
  typia.assert(employeeAlpha);
  // 3. Auth as Beta (regular member)
  const betaConnection: api.IConnection = { host: connection.host };
  const betaMember = await authorize_member_join(betaConnection, {
    body: {
      email: "beta@e2etest.com",
      password: "password123",
    },
  });
  typia.assert(betaMember);
  // 4. Create time manager role with time:manage permission (use alphaConnection still has Owner auth)
  const timeManagerRole =
    await generate_random_hrm_platform_member_roles_create(alphaConnection, {
      body: {
        name: "Time Manager",
        permissionKeys: ["time:manage"],
      },
    });
  typia.assert(timeManagerRole);
  // Assign Beta as employee with time:manage role
  const employeeBeta = await api.functional.hrmPlatform.member.employees.create(
    alphaConnection,
    {
      body: {
        memberId: betaMember.id,
        roleId: timeManagerRole.id,
        employmentType: "full-time",
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employeeBeta);
  // 5. Create project and assign both employees as members
  const project = await generate_random_hrm_platform_member_projects_create(
    alphaConnection,
    {},
  );
  typia.assert(project);
  await generate_random_hrm_platform_member_projects_memberships_create(
    alphaConnection,
    {
      body: {
        employeeId: employeeAlpha.id,
        capacityRole: "member",
      },
      params: {
        projectId: project.id,
      },
    },
  );
  await generate_random_hrm_platform_member_projects_memberships_create(
    alphaConnection,
    {
      body: {
        employeeId: employeeBeta.id,
        capacityRole: "member",
      },
      params: {
        projectId: project.id,
      },
    },
  );
  // 6. Alpha creates their own timelog (alphaConnection still has Alpha's auth from step 1)
  const timelogCreated =
    await generate_random_hrm_platform_member_timelogs_create(alphaConnection, {
      body: {
        projectId: project.id,
      },
    });
  typia.assert(timelogCreated);
  // 7. Beta (time:manage permission) updates Alpha's timelog
  const newDuration = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const newBillable = !timelogCreated.billable;
  const timelogUpdated =
    await api.functional.hrmPlatform.member.timelogs.update(betaConnection, {
      timelogId: timelogCreated.id,
      body: {
        durationMinutes: newDuration,
        workDescription: newDescription,
        billable: newBillable,
      } satisfies IHrmPlatformTimelog.IUpdate,
    });
  typia.assert(timelogUpdated);
  // 8. Validate updated timelog reflects new values and still belongs to Alpha
  TestValidator.equals(
    "Employee unchanged",
    timelogUpdated.employee.id,
    employeeAlpha.id,
  );
  TestValidator.equals(
    "Duration updated",
    timelogUpdated.duration_minutes,
    newDuration,
  );
  TestValidator.equals(
    "Description updated",
    timelogUpdated.work_description,
    newDescription,
  );
  TestValidator.equals(
    "Billable flipped",
    timelogUpdated.billable,
    newBillable,
  );
}
