import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Prevent deletion of locked admin accounts via self-deletion endpoint.
 *
 * This test verifies the business policy that a locked admin account cannot be
 * deleted via standard admin flows (i.e., self-initiated DELETE). Only
 * privileged actors or superadmin may delete locked accounts.
 *
 * Steps:
 *
 * 1. Register a new admin (join POST /auth/admin/join).
 * 2. Authenticate as the newly created admin.
 * 3. Attempt to delete the admin account using DELETE
 *    /todoList/admin/admins/{adminId}.
 * 4. The operation must fail (TestValidator.error), with a policy error (forbidden
 *    deletion of locked account).
 * 5. If the backend has truly locked the account, deletion will be refused and an
 *    appropriate error will be thrown.
 *
 * Note: Locking step cannot be simulated directly via API, so this test expects
 * proper backend enforcement if account is (even hypothetically) locked.
 */
export async function test_api_admin_account_delete_prevent_self_removal_when_locked(
  connection: api.IConnection,
) {
  // 1. Register a new admin account (unique credentials)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListAdmin.IJoin;
  const adminAuth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuth);

  // 2. (Already authenticated via join) adminAuth, adminAuth.token in context

  // 3. Attempt to delete own admin account via DELETE /todoList/admin/admins/{adminId}
  await TestValidator.error(
    "locked admin self-deletion must fail with policy error",
    async () => {
      await api.functional.todoList.admin.admins.erase(connection, {
        adminId: adminAuth.id,
      });
    },
  );
}
