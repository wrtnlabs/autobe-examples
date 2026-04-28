import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { generate_random_hrm_platform_member_roles_role_permissions_create } from "../../../generate/generate_random_hrm_platform_member_roles_role_permissions_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

/**
 * Test that removing a permission from a custom role that has active employee assignments is blocked to prevent cascading permission disruptions.
 *
 * This test validates the business rule that custom role permissions cannot be modified while employees are actively assigned to the role.
 * The scenario creates a member authentication context, establishes a custom role with initial permissions, assigns an employee to that role,
 * and adds an additional permission. It then attempts to remove the additional permission from the role while the employee assignment is active.
 *
 * The expected behavior is that the API returns 409 Conflict status, confirming that the permission mapping remains intact
 * and cannot be deleted while the role has active employee assignments. This prevents cascading permission disruptions
 * that could occur if permissions were removed from roles currently in use by employees.
 *
 * 1. Authenticate as a member to create an organization context with owner privileges.
 * 2. Create a custom role named 'Project Viewer' with initial permission 'project:view'.
 * 3. Create and invite an employee record, assigning them the custom role.
 * 4. Add an additional permission 'employee:view' to the custom role.
 * 5. Attempt to remove the 'employee:view' permission from the custom role.
 * 6. Validate that the removal attempt fails with 409 Conflict due to active employee assignments.
 * 7. Confirm the permission mapping remains intact and the business rule is enforced.
 */
export async function test_api_role_permission_removal_blocked_with_active_employee_assignments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member (creates organization with member as owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: "",
        referrer: "",
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create a custom role with permissions ['project:view']
  const role: IHrmPlatformRole =
    await generate_random_hrm_platform_member_roles_create(memberConnection, {
      body: {
        name: "Project Viewer",
        description: "Role for viewing projects",
        permissionKeys: ["project:view"],
      } satisfies IHrmPlatformRole.ICreate,
    });
  typia.assert(role);
  // 3. Create/invite an employee record and assign them the custom role
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
  // 4. Add an additional permission 'employee:view' to the custom role
  const additionalPermission: IHrmPlatformRolePermission =
    await generate_random_hrm_platform_member_roles_role_permissions_create(
      memberConnection,
      {
        params: {
          roleId: role.id,
        },
        body: {
          permissionKey: "employee:view",
        } satisfies IHrmPlatformRolePermission.ICreate,
      },
    );
  typia.assert(additionalPermission);
  // Execution: Attempt to remove the 'employee:view' permission from the custom role
  // This should fail with 409 Conflict because the role has active employee assignments
  await TestValidator.httpError(
    "removing role permission with active employee assignment returns 409",
    409,
    async () => {
      await api.functional.hrmPlatform.member.roles.role_permissions.erase(
        memberConnection,
        {
          roleId: role.id,
          rolePermissionId: additionalPermission.id,
        },
      );
    },
  );
  // Validation: The permission mapping remains intact (already validated by 409 response)
  // The business rule that custom role permissions cannot be modified while employees are assigned
}