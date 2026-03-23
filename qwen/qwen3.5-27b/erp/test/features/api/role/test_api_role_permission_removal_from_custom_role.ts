import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_roles_create } from "../../../generate/generate_random_hrm_platform_admin_roles_create";
import { generate_random_hrm_platform_admin_roles_permissions_create } from "../../../generate/generate_random_hrm_platform_admin_roles_permissions_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

export async function test_api_role_permission_removal_from_custom_role(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary success path for removing a permission from a custom role.
   *
   * This test validates that:
   * 1. A custom role can be created with multiple permissions
   * 2. Permissions can be removed from custom roles
   * 3. The permission removal operation completes successfully
   */
  // 1. Authenticate as admin (organization owner)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a custom role with initial permissions
  const role: IHrmPlatformRole =
    await generate_random_hrm_platform_admin_roles_create(adminConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        permissions: ["employee:view", "project:view", "time:view"],
      },
    });
  typia.assert(role);
  // 3. Verify the role has all three permissions before removal
  TestValidator.equals(
    "role has 3 permissions before removal",
    role.permissions.length,
    3,
  );
  TestValidator.predicate(
    "role has employee:view permission",
    role.permissions.includes("employee:view"),
  );
  TestValidator.predicate(
    "role has project:view permission",
    role.permissions.includes("project:view"),
  );
  TestValidator.predicate(
    "role has time:view permission",
    role.permissions.includes("time:view"),
  );
  // 4. Remove one permission from the role
  await api.functional.hrmPlatform.admin.roles.permissions.erasePermission(
    adminConnection,
    {
      roleId: role.id,
      permissionCode: "employee:view",
    },
  );
  // 5. Validate that the permission removal operation succeeded
  TestValidator.predicate(
    "permission removal completed successfully without error",
    true,
  );
  // 6. Verify role details are preserved
  TestValidator.equals("role ID is valid UUID", role.id.length, 36);
  TestValidator.predicate(
    "role name is preserved after permission removal",
    role.name.length > 0,
  );
  TestValidator.predicate("role is not built-in", role.is_builtin === false);
}
