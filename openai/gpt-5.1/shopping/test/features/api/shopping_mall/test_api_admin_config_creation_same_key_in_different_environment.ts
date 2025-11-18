import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

/**
 * Validate that admins can create environment-specific configs sharing the same
 * key.
 *
 * Business goal: Ensure that a shopping mall administrator, once authenticated,
 * can create two configuration records under the same logical key (namespace +
 * config_key) but targeting different environments ("production" and
 * "staging"). This demonstrates that uniqueness is scoped by environment and
 * that per-environment overrides work as intended.
 *
 * Steps:
 *
 * 1. Register an admin via POST /auth/admin/join, which also issues JWT tokens and
 *    configures the connection with Authorization header.
 * 2. Create a production configuration via POST /shoppingMall/admin/configs for
 *    namespace "checkout" and config_key "maxCartItems".
 * 3. Create a staging configuration via the same endpoint, reusing namespace and
 *    config_key but environment="staging" and a different value_json.
 * 4. Assert that both creations succeed, return valid IShoppingMallConfig objects,
 *    and have distinct identifiers while sharing logical key fields where
 *    appropriate.
 */
export async function test_api_admin_config_creation_same_key_in_different_environment(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create production configuration
  const namespace = "checkout";
  const configKey = "maxCartItems";
  const prodEnvironment = "production";
  const stagingEnvironment = "staging";

  const prodValue = { maxItems: 100 };
  const prodCreateBody = {
    namespace,
    config_key: configKey,
    environment: prodEnvironment,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    value_json: JSON.stringify(prodValue),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const prodConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: prodCreateBody,
    });
  typia.assert(prodConfig);

  // Validate production config fields
  TestValidator.equals(
    "production config namespace matches request",
    prodConfig.namespace,
    namespace,
  );
  TestValidator.equals(
    "production config key matches request",
    prodConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "production config environment is production",
    prodConfig.environment,
    prodEnvironment,
  );
  TestValidator.equals(
    "production config value_json matches payload",
    prodConfig.value_json,
    JSON.stringify(prodValue),
  );
  TestValidator.equals(
    "production config is_active is true",
    prodConfig.is_active,
    true,
  );

  // 3. Create staging configuration with same namespace/config_key
  const stagingValue = { maxItems: 10 };
  const stagingCreateBody = {
    namespace,
    config_key: configKey,
    environment: stagingEnvironment,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    value_json: JSON.stringify(stagingValue),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const stagingConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: stagingCreateBody,
    });
  typia.assert(stagingConfig);

  // 4. Cross-validate that both configs coexist correctly
  TestValidator.notEquals(
    "staging config id differs from production config id",
    stagingConfig.id,
    prodConfig.id,
  );

  TestValidator.equals(
    "staging config shares namespace with production",
    stagingConfig.namespace,
    prodConfig.namespace,
  );
  TestValidator.equals(
    "staging config shares config_key with production",
    stagingConfig.config_key,
    prodConfig.config_key,
  );

  TestValidator.equals(
    "staging config environment is staging",
    stagingConfig.environment,
    stagingEnvironment,
  );
  TestValidator.notEquals(
    "staging environment differs from production environment",
    stagingConfig.environment,
    prodConfig.environment,
  );

  TestValidator.equals(
    "staging config value_json matches staging payload",
    stagingConfig.value_json,
    JSON.stringify(stagingValue),
  );

  TestValidator.equals(
    "staging config is_active is true",
    stagingConfig.is_active,
    true,
  );
}
