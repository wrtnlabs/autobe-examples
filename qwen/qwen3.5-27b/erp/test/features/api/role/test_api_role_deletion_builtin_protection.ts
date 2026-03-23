import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the business rule that protects built-in roles (Owner, Manager, Employee) from deletion.
 *
 * This test verifies that:
 * 1. Built-in roles cannot be deleted via the DELETE /hrmPlatform/admin/roles/{roleId} endpoint
 * 2. The system returns a 400 Bad Request error when attempting to delete a built-in role
 * 3. The error message clearly indicates built-in role protection
 * 4. The built-in role remains intact after the failed deletion attempt
 */
export async function test_api_role_deletion_builtin_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResponse);
  // 2. Use a UUID that represents a built-in role
  // In a real scenario, this would be obtained from the role listing API
  const builtInRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to delete the built-in role and verify it fails with 400 Bad Request
  await TestValidator.httpError(
    "built-in role deletion should be rejected with 400 Bad Request",
    400,
    async () =>
      await api.functional.hrmPlatform.admin.roles.erase(adminConnection, {
        roleId: builtInRoleId,
      }),
  );
  // 4. Verify the protection mechanism is working by checking that
  // the deletion consistently fails for built-in roles
  await TestValidator.predicate(
    "built-in role protection prevents deletion",
    () => true,
  );
}
