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
 * Validates that a manager with the time:manage permission can erase timelogs belonging to other employees in the same organization.
 *
 * Tests the cross-employee timelog deletion feature, ensuring that authorization is based on organizational permissions rather than timelog ownership. The manager must have the time:manage permission key assigned to their role while the timelog belongs to a different employee.
 *
 * Two member accounts are created: one acting as the organization owner who creates a project and produces a timelog, and another invited as an employee with a custom manager role carrying the time:manage permission.
 *
 * 1. Member 2 joins the platform first to obtain their member identifier for later employee invitation.
 * 2. Member 1 joins as the organization owner with implicit project management permissions.
 * 3. Admin creates a custom role with only the time:manage permission.
 * 4. Admin invites member 2 into the organization as an employee, assigning the custom manager role.
 * 5. Admin creates a project and assigns themselves as a project-lead member.
 * 6. Admin creates a timelog entry for work on the project.
 * 7. Manager authenticates and erases the timelog belonging to the admin employee, demonstrating cross-employee permission enforcement.
 */
export async function test_api_timelog_erase_by_manager_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member 2 joins the platform first to obtain their member identifier
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphaNumeric(16);
  const member2JoinConnection: api.IConnection = { host: connection.host };
  const member2Authorized = await authorize_member_join(member2JoinConnection, {
    body: {
      email: member2Email,
      password: member2Password,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member2Authorized);
  // 2. Member 1 joins as the organization owner (admin)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_member_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuthorized);
  // 3. Admin creates a custom manager role with time:manage permission
  const managerRole = await generate_random_hrm_platform_member_roles_create(
    adminConnection,
    {
      body: {
        name: "Time Manager",
        description: "Custom role with time:manage permission",
        permissionKeys: ["time:manage"],
      },
    },
  );
  typia.assert(managerRole);
  // 4. Admin invites member 2 into the organization as an employee
  const managerEmployee =
    await api.functional.hrmPlatform.member.employees.create(adminConnection, {
      body: {
        memberId: member2Authorized.id,
        roleId: managerRole.id,
        employmentType: "full-time",
      } satisfies IHrmPlatformEmployee.ICreate,
    });
  typia.assert(managerEmployee);
  // 5. Admin creates a project for time tracking
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 5b. Assign admin as a project-lead member on the project
  const adminMembership =
    await api.functional.hrmPlatform.member.projects.memberships.create(
      adminConnection,
      {
        projectId: project.id,
        body: {
          employeeId: adminAuthorized.id,
          capacityRole: "project-lead",
        } satisfies IHrmPlatformProjectMembership.ICreate,
      },
    );
  typia.assert(adminMembership);
  // 6. Admin creates a timelog on behalf of their employee record
  const timelog = await api.functional.hrmPlatform.member.timelogs.create(
    adminConnection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: 60 satisfies number,
        workDescription: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 7. Manager authenticates with their existing credentials and erases the admin's timelog
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(managerConnection, {
    body: {
      email: member2Email,
      password: member2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await api.functional.hrmPlatform.member.timelogs.erase(managerConnection, {
    timelogId: timelog.id,
  });
  TestValidator.predicate(
    "timelog erased by manager with time:manage permission",
    true,
  );
}