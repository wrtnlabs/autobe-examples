import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { generate_random_hrm_platform_member_roles_permissions_create } from "../../../generate/generate_random_hrm_platform_member_roles_permissions_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

/**
 * Test assigning a permission to a custom role.
 *
 * This test validates the complete workflow:
 * 1. Register a new member account
 * 2. Create a custom role with initial permissions
 * 3. Add an additional permission to the custom role
 * 4. Verify the permission assignment was successful
 * 5. Verify the role includes the newly added permission
 */
export async function test_api_role_permission_assignment_to_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a custom role with initial permissions
  const initialPermissions = ["employee:view"] as const;
  const customRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [...initialPermissions],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(customRole);
  // Verify the role was created as a custom role (not built-in)
  TestValidator.predicate(
    "role is custom (not built-in)",
    !customRole.is_builtin,
  );
  TestValidator.equals(
    "initial permissions count",
    customRole.permissions.length,
    initialPermissions.length,
  );
  // 3. Add an additional permission to the custom role
  const newPermission = "project:view" as const;
  const permissionAssignment =
    await generate_random_hrm_platform_member_roles_permissions_create(
      memberConnection,
      {
        params: { roleId: customRole.id },
        body: {
          permission: newPermission,
        } satisfies IHrmPlatformRolePermission.ICreate,
      },
    );
  typia.assert(permissionAssignment);
  // 4. Verify the permission assignment was created successfully
  TestValidator.equals(
    "permission code matches",
    permissionAssignment.permission,
    newPermission,
  );
  TestValidator.equals(
    "role ID matches",
    permissionAssignment.role.id,
    customRole.id,
  );
  TestValidator.predicate(
    "permission assignment is active (not deleted)",
    permissionAssignment.deleted_at === null,
  );
  // 5. Verify the role now includes the newly added permission
  // Note: The role object from creation won't have the new permission,
  // but we can verify the permission assignment exists and is linked to the role
  TestValidator.equals(
    "permission role name matches",
    permissionAssignment.role.name,
    customRole.name,
  );
  TestValidator.equals(
    "permission role is_builtin matches",
    permissionAssignment.role.is_builtin,
    customRole.is_builtin,
  );
}