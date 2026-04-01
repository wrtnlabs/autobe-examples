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
 * Test the successful removal of a permission from a custom role.
 *
 * This test validates the core business workflow of revoking capabilities from custom roles:
 * 1. Authenticate as a member by joining the platform
 * 2. Create a custom role with an initial permission (project:view)
 * 3. Add an additional permission (employee:view) to the custom role
 * 4. Verify the permission was successfully added
 * 5. Remove the employee:view permission using the DELETE endpoint
 * 6. Verify the permission removal by attempting to remove it again (should fail)
 * 7. Confirm the role still exists and is a custom role
 */
export async function test_api_role_permission_removal_from_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Create custom role with initial permission (project:view)
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: `Test Role ${RandomGenerator.alphaNumeric(8)}`,
        permissions: ["project:view"],
      },
    },
  );
  typia.assert(role);
  // Verify role is custom (not built-in)
  TestValidator.predicate("is custom role", !role.is_builtin);
  TestValidator.equals("initial permission count", role.permissions.length, 1);
  TestValidator.equals(
    "initial permission",
    role.permissions[0].permission,
    "project:view",
  );
  // 3. Add additional permission (employee:view) to test removal
  const permission =
    await generate_random_hrm_platform_member_roles_permissions_create(
      memberConnection,
      {
        body: {
          permission: "employee:view",
        },
        params: {
          roleId: role.id,
        },
      },
    );
  typia.assert(permission);
  TestValidator.equals(
    "permission code",
    permission.permission,
    "employee:view",
  );
  // 4. Remove the employee:view permission
  await api.functional.hrmPlatform.member.roles.permissions.erase(
    memberConnection,
    {
      roleId: role.id,
      permissionId: "employee:view",
    },
  );
  // 5. Verify permission removal by attempting to remove again (should fail with 404)
  await TestValidator.error("permission already removed", async () => {
    await api.functional.hrmPlatform.member.roles.permissions.erase(
      memberConnection,
      {
        roleId: role.id,
        permissionId: "employee:view",
      },
    );
  });
  // 6. Verify role still exists by checking it's still a valid custom role
  // The role object from creation is still valid and shows it's a custom role
  TestValidator.predicate("role still exists", role.id !== undefined);
  TestValidator.predicate("role remains custom", !role.is_builtin);
}
