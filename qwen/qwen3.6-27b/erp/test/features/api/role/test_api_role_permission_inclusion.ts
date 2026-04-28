import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Validates role-permission mapping retrieval for custom roles with specific permission keys.
 *
 * Authenticates a new member, creates a custom role with non-default permission keys
 * (`time:view_all` and `report:view`), then retrieves the role to validate the complete
 * role-permission mapping structure including nested role summary information.
 *
 * Validates that:
 * - The role response contains exactly two permission mappings.
 * - Each permission has correct `id` (UUID), `permission_key` (matching input),
 *   `role` summary (containing `id`, `name`, `builtIn`, timestamps).
 * - The permission array matches the count of assigned permissions.
 * - No duplicate permission keys exist within the role.
 *
 * 1. Register and authenticate a new member account.
 * 2. Create a custom role with specific permission keys.
 * 3. Retrieve the role by its unique identifier.
 * 4. Validate the role-permission mapping structure and completeness.
 */
export async function test_api_role_permission_inclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: undefined,
  });
  // 2. Create a custom role with specific permission keys.
  const role: IHrmPlatformRole =
    await generate_random_hrm_platform_member_roles_create(memberConnection, {
      body: {
        name: "Test Role with Specific Permissions",
        permissionKeys: ["time:view_all", "report:view"],
        description: "Testing role-permission inclusion validation",
      } satisfies IHrmPlatformRole.ICreate,
    });
  typia.assert(role);
  // 3. Validate the role structure.
  TestValidator.equals(
    "role name matches input",
    role.name,
    "Test Role with Specific Permissions",
  );
  TestValidator.equals("role is not built-in", role.built_in, false);
  // 4. Retrieve the role by its ID.
  const retrievedRole: IHrmPlatformRole =
    await api.functional.hrmPlatform.member.roles.at(memberConnection, {
      roleId: role.id,
    });
  typia.assert(retrievedRole);
  // 5. Validate role-permission mapping structure.
  TestValidator.equals(
    "retrieved role has correct ID",
    retrievedRole.id,
    role.id,
  );
  TestValidator.equals("role name matches", retrievedRole.name, role.name);
  TestValidator.predicate(
    "role has permissions array",
    Array.isArray(retrievedRole.rolePermissions),
  );
  TestValidator.equals(
    "permissions array has correct length",
    retrievedRole.rolePermissions.length,
    2,
  );
  // 6. Validate each permission object.
  const permissionKeys = retrievedRole.rolePermissions.map(
    (p) => p.permission_key,
  );
  TestValidator.predicate(
    "contains time:view_all permission",
    permissionKeys.includes("time:view_all"),
  );
  TestValidator.predicate(
    "contains report:view permission",
    permissionKeys.includes("report:view"),
  );
  // 7. Validate no duplicate permission keys.
  const uniqueKeys = new Set(permissionKeys);
  TestValidator.equals(
    "no duplicate permission keys",
    uniqueKeys.size,
    permissionKeys.length,
  );
  // 8. Validate nested role summary in each permission.
  await ArrayUtil.asyncForEach(
    retrievedRole.rolePermissions,
    async (permission, _index, _array) => {
      typia.assertGuard(permission);
      TestValidator.equals(
        "permission summary has role ID",
        permission.role.id,
        retrievedRole.id,
      );
      TestValidator.equals(
        "permission summary has role name",
        permission.role.name,
        retrievedRole.name,
      );
      TestValidator.equals(
        "permission summary builtIn flag",
        permission.role.builtIn,
        false,
      );
    },
  );
}
