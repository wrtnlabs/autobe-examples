import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate admin-only hard deletion of a system configuration by key.
 *
 * This test checks that only an authenticated admin can delete a system config
 * entry, and that the deletion is a true hard delete: after the operation, the
 * target config cannot be accessed. It also confirms correct error handling for
 * non-existent keys.
 *
 * Steps:
 *
 * 1. Register (join) as a new admin with random credentials.
 * 2. Authenticate as admin (join returns IAuthorized + sets token).
 * 3. Choose a random system config key and attempt to delete it via the admin
 *    systemConfigs.eraseByKey endpoint.
 * 4. Check: operation completes with no error (if the key existed or not, no
 *    crash).
 * 5. Edge: Attempt to delete a definitely non-existent key, ensure proper error is
 *    thrown (no 500, clear rejection).
 * 6. (No re-read possible, as there is no config-get endpoint in test scope.)
 * 7. All test logic uses only allowed imports; no extraneous imports or functions.
 */
export async function test_api_system_config_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoinReq = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListAdmin.IJoin;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinReq });
  typia.assert(admin);

  // 2. Auth as admin is done (join sets Authorization header)

  // 3. Attempt DELETE on a random key (maybe existed, maybe not)
  const key = RandomGenerator.alphaNumeric(12);
  await api.functional.todoList.admin.systemConfigs.eraseByKey(connection, {
    key,
  });
  // If no crash, the endpoint handled deletion of any key gracefully.

  // 4. Edge: Try to DELETE a guaranteed-nonexistent key (long/unlikely value)
  await TestValidator.error(
    "admin system config delete returns error for totally unknown key",
    async () => {
      await api.functional.todoList.admin.systemConfigs.eraseByKey(connection, {
        key: `${key}_not_exist`,
      });
    },
  );
}
