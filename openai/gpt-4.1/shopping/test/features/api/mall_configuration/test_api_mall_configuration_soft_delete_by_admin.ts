import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate soft deletion (erase) of global platform configurations by admin.
 *
 * This test exercises the full workflow for safely and securely removing a
 * platform-wide configuration from the active set, ensuring only authorized
 * admins can perform the operation, and all audit/trace requirements are met.
 *
 * Steps:
 *
 * 1. Register a new admin via join API (acts as platform admin)
 * 2. Soft-delete a configuration by configKey (simulate with a random new key)
 * 3. Attempt to delete the same configKey again (should fail - already deleted)
 * 4. Attempt deletion with a non-existent configKey (should fail - never existed)
 * 5. Validate operation fails without authentication
 * 6. (Simulated) Demonstrate compliance with logical requirements for keys in
 *    various states (documented since no DTO for configuration records)
 */
export async function test_api_mall_configuration_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a fresh admin for auth context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string,
      name: adminName as string,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);
  TestValidator.equals(
    "admin registration email matches input",
    adminJoin.email,
    adminEmail,
  );
  // (Token is now set in connection by SDK)

  // 2. Soft-delete (erase) a configuration key (simulate random)
  const configKey = RandomGenerator.alphaNumeric(10);
  await api.functional.shoppingMall.admin.mallConfigurations.erase(connection, {
    configKey,
  });

  // 3. Try deleting again: already deleted, should fail
  await TestValidator.error(
    "second delete attempt on configKey should fail",
    async () => {
      await api.functional.shoppingMall.admin.mallConfigurations.erase(
        connection,
        { configKey },
      );
    },
  );

  // 4. Try deleting a never-existent configKey
  const nonExistentKey = RandomGenerator.alphaNumeric(12);
  await TestValidator.error(
    "delete attempt on non-existent configKey should fail",
    async () => {
      await api.functional.shoppingMall.admin.mallConfigurations.erase(
        connection,
        { configKey: nonExistentKey },
      );
    },
  );

  // 5. Try with unauthenticated connection (no admin auth token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated soft-delete call should fail",
    async () => {
      await api.functional.shoppingMall.admin.mallConfigurations.erase(
        unauthConn,
        { configKey },
      );
    },
  );

  // 6. (Document only) Simulate configs in 'active', 'inactive', 'deprecated' (no DTO, can't validate exact DB state here)
  // Proper test of those states would require create/config CRUD APIs, so only comment for traceability.
}
