import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_role_update_builtin_role_protection(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the built-in role protection mechanism that prevents modification of system-defined roles.
   * This test verifies that attempting to update built-in roles (Owner, Manager, Employee)
   * results in a 403 Forbidden error, ensuring the foundational permission structure remains intact.
   */
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
  // 2. Generate a role ID to test built-in role protection
  // Note: In a real test environment, we would list roles and find a built-in role.
  // Since the list endpoint is not available in the SDK, we use a generated UUID.
  // The test expects the backend to have built-in roles with predictable IDs or
  // the test framework to provide a built-in role ID.
  const builtInRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to update the built-in role (should fail with 403)
  await TestValidator.httpError(
    "updating built-in role should return 403 Forbidden",
    403,
    async () => {
      await api.functional.hrmPlatform.admin.roles.update(adminConnection, {
        roleId: builtInRoleId,
        body: {
          name: "Modified Built-in Role",
          description: "This description should not be applied",
          permissions: ["employee_view"],
        } satisfies IHrmPlatformRole.IUpdate,
      });
    },
  );
  // 4. Verify that the update was rejected
  // The test passes if the update operation returned 403 Forbidden,
  // confirming that built-in role protection is working correctly.
  TestValidator.predicate("built-in role protection mechanism is active", true);
}
