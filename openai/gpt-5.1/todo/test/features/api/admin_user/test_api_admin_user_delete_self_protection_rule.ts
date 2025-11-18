import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate self-deletion protection for administrative users.
 *
 * This test verifies that an adminUser cannot delete their own account via
 * DELETE /todoApp/adminUser/adminUsers/{adminUserId}, while a different admin
 * can delete that same account, reflecting typical self-protection rules for
 * privileged accounts.
 *
 * Flow:
 *
 * 1. Register adminA with POST /auth/adminUser/join; the SDK automatically
 *    authenticates the connection as adminA and returns
 *    ITodoAppAdminUser.IAuthorized.
 * 2. While still authenticated as adminA, attempt to delete adminA by calling
 *    api.functional.todoApp.adminUser.adminUsers.erase with adminUserId =
 *    adminA.id and assert that the call fails (business rule: self-deletion is
 *    forbidden).
 * 3. Register adminB with POST /auth/adminUser/join; this re-authenticates the
 *    connection as adminB.
 * 4. As adminB, call api.functional.todoApp.adminUser.adminUsers.erase targeting
 *    adminUserId = adminA.id and assert that it succeeds (no error thrown).
 * 5. Optionally, call erase again with the same adminUserId and assert that it now
 *    fails (either not-found or authorization), proving that the first deletion
 *    took effect.
 */
export async function test_api_admin_user_delete_self_protection_rule(
  connection: api.IConnection,
) {
  // 1. Register adminA and authenticate as that admin
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminA: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminA);

  // 2. Attempt self-deletion as adminA and expect failure
  await TestValidator.error("adminA cannot delete itself", async () => {
    await api.functional.todoApp.adminUser.adminUsers.erase(connection, {
      adminUserId: adminA.id,
    });
  });

  // 3. Register adminB and authenticate as that admin
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminB: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminB);

  // 4. As adminB, delete adminA successfully
  await api.functional.todoApp.adminUser.adminUsers.erase(connection, {
    adminUserId: adminA.id,
  });

  // 5. Subsequent deletion attempts on the same id should fail
  await TestValidator.error(
    "cannot delete already deleted adminA",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.erase(connection, {
        adminUserId: adminA.id,
      });
    },
  );
}
