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
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test custom role permission update functionality.
 * 1. Authenticate as admin with organization management permission
 * 2. Create a custom role with initial permissions
 * 3. Update the role's permissions to a different set
 * 4. Verify the response contains the updated role with new permissions
 * 5. Verify the old permissions were removed and new ones were added
 */
export async function test_api_role_permission_update_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create a custom role with initial permissions
  const initialRole = await generate_random_hrm_platform_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: ["employee_view", "project_view"] as const,
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(initialRole);
  // Verify initial permissions
  TestValidator.equals("initial permissions", initialRole.permissions, [
    "employee_view",
    "project_view",
  ]);
  // 3. Update the role's permissions to a different set
  const updatedRole =
    await api.functional.hrmPlatform.admin.roles.permissions.updatePermissions(
      adminConnection,
      {
        roleId: initialRole.id,
        body: {
          permission_codes: ["employee_manage", "time_view"] as const,
        } satisfies IHrmPlatformRolePermission.IUpdate,
      },
    );
  typia.assert(updatedRole);
  // 4. Verify the response contains the updated role
  TestValidator.equals("role id matches", updatedRole.id, initialRole.id);
  TestValidator.equals(
    "role name unchanged",
    updatedRole.name,
    initialRole.name,
  );
  // 5. Verify the permissions were updated correctly
  TestValidator.equals("updated permissions", updatedRole.permissions, [
    "employee_manage",
    "time_view",
  ]);
  // 6. Verify old permissions were removed
  TestValidator.predicate(
    "old permission employee_view removed",
    !updatedRole.permissions.includes("employee_view"),
  );
  TestValidator.predicate(
    "old permission project_view removed",
    !updatedRole.permissions.includes("project_view"),
  );
  // 7. Verify new permissions were added
  TestValidator.predicate(
    "new permission employee_manage added",
    updatedRole.permissions.includes("employee_manage"),
  );
  TestValidator.predicate(
    "new permission time_view added",
    updatedRole.permissions.includes("time_view"),
  );
}
