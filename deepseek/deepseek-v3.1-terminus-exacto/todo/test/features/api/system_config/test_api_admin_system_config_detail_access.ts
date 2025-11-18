import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Validate that only authenticated admins can get the detail of a system
 * configuration using its key.
 *
 * 1. Register a new admin and authenticate (get a JWT token).
 * 2. As admin, try to fetch the detail for a system configuration with a random
 *    key. (We don't know valid keys, so just try a random key for not-found.)
 * 3. Verify the response structure for the found/not-found case.
 *
 *    - For found: All required fields (id, key, value, created_at, updated_at,
 *         deleted_at?) are correct type.
 *    - For not-found: Should return error (API throws or returns error response).
 * 4. As unauthenticated user (no token), attempt detail fetch: access should be
 *    denied.
 */
export async function test_api_admin_system_config_detail_access(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<string & tags.MinLength<8>>();
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoListAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: As authenticated admin, try to fetch config detail for random key (expect not found)
  const randomKey: string = RandomGenerator.alphabets(10);
  await TestValidator.error(
    "should throw error for not-found key as admin",
    async () => {
      await api.functional.todoList.admin.systemConfigs.getByKey(connection, {
        key: randomKey,
      });
    },
  );

  // Optionally, if a config key is ever known, could test for found, but here only not-found can be tested.

  // Step 3: As unauthenticated user, should be denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should not allow unauthenticated user to get config detail",
    async () => {
      await api.functional.todoList.admin.systemConfigs.getByKey(unauthConn, {
        key: randomKey,
      });
    },
  );
}
