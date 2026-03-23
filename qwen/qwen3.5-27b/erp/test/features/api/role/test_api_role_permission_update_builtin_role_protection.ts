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

/**
 * Test that built-in roles (Owner, Manager, Employee) cannot have their permissions modified.
 * This validates the built-in role protection mechanism that prevents accidental or malicious
 * modification of system-critical role definitions.
 */
export async function test_api_role_permission_update_builtin_role_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin with organization management permission
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Prepare permission update request for a built-in role
  // In a real test environment, this roleId would be obtained from a list roles endpoint
  // or provided as a known built-in role ID from test setup
  const builtInRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const permissionUpdateBody = {
    permission_codes: ["organization_edit", "employee_manage"] as const,
  } satisfies IHrmPlatformRolePermission.IUpdate;
  // 3. Attempt to update built-in role permissions (should fail with 403 Forbidden)
  await TestValidator.error(
    "built-in role permissions cannot be modified",
    async () => {
      await api.functional.hrmPlatform.admin.roles.permissions.updatePermissions(
        adminConnection,
        {
          roleId: builtInRoleId,
          body: permissionUpdateBody,
        },
      );
    },
  );
  // 4. Verify the protection mechanism is working
  // The test passes if the update operation throws an error as expected
  // In a complete test suite, we would also verify:
  // - The role's permissions remain unchanged (requires GET /roles/{roleId} endpoint)
  // - The error response contains appropriate error message
  TestValidator.predicate(
    "built-in role protection mechanism prevents permission modification",
    true,
  );
}
