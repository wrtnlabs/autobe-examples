import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

/**
 * Ensure duplicate active config creation is rejected.
 *
 * Business goal:
 *
 * - Verify that at most one active configuration exists for a given (namespace,
 *   config_key, environment) combination.
 * - Creating a second active configuration with the same logical key should fail
 *   with an error, while the original configuration remains valid.
 *
 * Steps:
 *
 * 1. Admin join to obtain an authenticated admin context.
 * 2. Create an initial active configuration for (namespace="checkout",
 *    config_key="maxCartItems", environment="production").
 * 3. Attempt to create a second active configuration with the same logical key but
 *    different description/value_json; expect the call to fail.
 * 4. Validate that the first configuration object still matches the initially
 *    requested key fields and is_active=true.
 */
export async function test_api_admin_config_creation_duplicate_active_key_rejected(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication bootstrap)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // keep ip undefined to let backend derive from request; href/referrer must be valid URIs
    href: "https://admin.console.example.com/settings/configs", // valid URI
    referrer: "https://admin.console.example.com/login", // valid URI
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create initial active configuration
  const namespace = "checkout";
  const configKey = "maxCartItems";
  const environment = "production";

  const firstConfigBody = {
    namespace,
    config_key: configKey,
    environment,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    value_json: JSON.stringify({ maxItems: 100 }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const firstConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: firstConfigBody,
    });
  typia.assert(firstConfig);

  // validate key identity fields of first config
  TestValidator.equals(
    "first config namespace must match request",
    firstConfig.namespace,
    namespace,
  );
  TestValidator.equals(
    "first config key must match request",
    firstConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "first config environment must match request",
    firstConfig.environment,
    environment,
  );
  TestValidator.equals(
    "first config must be active",
    firstConfig.is_active,
    true,
  );

  // 3. Attempt to create duplicate active configuration; expect error
  const secondConfigBody = {
    namespace,
    config_key: configKey,
    environment,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    value_json: JSON.stringify({ maxItems: 200 }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  await TestValidator.error(
    "duplicate active config for same key must be rejected",
    async () => {
      await api.functional.shoppingMall.admin.configs.create(connection, {
        body: secondConfigBody,
      });
    },
  );

  // 4. Ensure first configuration object stayed logically consistent
  TestValidator.equals(
    "original config namespace remains unchanged",
    firstConfig.namespace,
    namespace,
  );
  TestValidator.equals(
    "original config key remains unchanged",
    firstConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "original config environment remains unchanged",
    firstConfig.environment,
    environment,
  );
  TestValidator.equals(
    "original config active flag remains true",
    firstConfig.is_active,
    true,
  );
}
