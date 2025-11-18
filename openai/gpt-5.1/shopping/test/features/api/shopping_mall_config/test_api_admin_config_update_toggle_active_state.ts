import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

/**
 * Validate toggling of admin configuration active state while preserving
 * immutable fields.
 *
 * Business flow:
 *
 * 1. Admin joins via /auth/admin/join and gets JWT wired into connection by SDK.
 * 2. Admin creates a configuration via /shoppingMall/admin/configs with
 *    is_active=true.
 * 3. Admin updates that configuration via /shoppingMall/admin/configs/{configId}
 *    to deactivate it (is_active=false) and adjust description/value_json.
 * 4. Assertions verify that only intended fields change and core identity fields
 *    remain stable.
 * 5. Admin updates again to re-activate (is_active=true) ensuring bidirectional
 *    toggling updates updated_at each time.
 */
export async function test_api_admin_config_update_toggle_active_state(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create initial configuration with is_active=true
  const initialConfigBody = {
    namespace: "checkout", // simple, deterministic values to ease comparison
    config_key: `maxCartItems-${RandomGenerator.alphaNumeric(8)}`,
    environment: "staging",
    description: "Initial active configuration for cart limits",
    value_json: JSON.stringify({ maxCartItems: 50 }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: initialConfigBody,
    });
  typia.assert<IShoppingMallConfig>(createdConfig);

  // Sanity checks after creation
  TestValidator.equals(
    "created config namespace matches input",
    createdConfig.namespace,
    initialConfigBody.namespace,
  );
  TestValidator.equals(
    "created config key matches input",
    createdConfig.config_key,
    initialConfigBody.config_key,
  );
  TestValidator.equals(
    "created config environment matches input",
    createdConfig.environment,
    initialConfigBody.environment,
  );
  TestValidator.equals(
    "created config is_active is true",
    createdConfig.is_active,
    true,
  );
  TestValidator.equals(
    "created config value_json matches input",
    createdConfig.value_json,
    initialConfigBody.value_json,
  );

  const originalId = createdConfig.id;
  const originalNamespace = createdConfig.namespace;
  const originalConfigKey = createdConfig.config_key;
  const originalEnvironment = createdConfig.environment;
  const originalValueJson = createdConfig.value_json;
  const originalCreatedAt = createdConfig.created_at;
  const originalUpdatedAt = createdConfig.updated_at;
  const originalDeletedAt = createdConfig.deleted_at ?? null;

  // 3. Deactivate configuration via update
  const deactivatedDescription =
    "Configuration temporarily deactivated for testing";
  const deactivatedValueJson = JSON.stringify({ maxCartItems: 0 });

  const deactivateBody = {
    is_active: false,
    description: deactivatedDescription,
    value_json: deactivatedValueJson,
  } satisfies IShoppingMallConfig.IUpdate;

  const deactivatedConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.update(connection, {
      configId: createdConfig.id,
      body: deactivateBody,
    });
  typia.assert<IShoppingMallConfig>(deactivatedConfig);

  // 4. Assertions after deactivation
  TestValidator.equals(
    "config id remains unchanged after deactivation",
    deactivatedConfig.id,
    originalId,
  );
  TestValidator.equals(
    "namespace remains unchanged after deactivation",
    deactivatedConfig.namespace,
    originalNamespace,
  );
  TestValidator.equals(
    "config_key remains unchanged after deactivation",
    deactivatedConfig.config_key,
    originalConfigKey,
  );
  TestValidator.equals(
    "environment remains unchanged after deactivation",
    deactivatedConfig.environment,
    originalEnvironment,
  );
  TestValidator.equals(
    "is_active becomes false after deactivation",
    deactivatedConfig.is_active,
    false,
  );
  TestValidator.equals(
    "description updated on deactivation",
    deactivatedConfig.description ?? null,
    deactivatedDescription,
  );
  TestValidator.equals(
    "value_json updated on deactivation",
    deactivatedConfig.value_json,
    deactivatedValueJson,
  );
  TestValidator.equals(
    "created_at unchanged after deactivation",
    deactivatedConfig.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changes after deactivation",
    deactivatedConfig.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "deleted_at unchanged after deactivation",
    deactivatedConfig.deleted_at ?? null,
    originalDeletedAt,
  );

  const deactivatedUpdatedAt = deactivatedConfig.updated_at;

  // 5. Reactivate configuration via update
  const reactivatedDescription = "Configuration reactivated after testing";
  const reactivateBody = {
    is_active: true,
    description: reactivatedDescription,
  } satisfies IShoppingMallConfig.IUpdate;

  const reactivatedConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.update(connection, {
      configId: createdConfig.id,
      body: reactivateBody,
    });
  typia.assert<IShoppingMallConfig>(reactivatedConfig);

  // 6. Assertions after reactivation
  TestValidator.equals(
    "config id remains unchanged after reactivation",
    reactivatedConfig.id,
    originalId,
  );
  TestValidator.equals(
    "namespace remains unchanged after reactivation",
    reactivatedConfig.namespace,
    originalNamespace,
  );
  TestValidator.equals(
    "config_key remains unchanged after reactivation",
    reactivatedConfig.config_key,
    originalConfigKey,
  );
  TestValidator.equals(
    "environment remains unchanged after reactivation",
    reactivatedConfig.environment,
    originalEnvironment,
  );
  TestValidator.equals(
    "is_active becomes true after reactivation",
    reactivatedConfig.is_active,
    true,
  );
  TestValidator.equals(
    "description updated on reactivation",
    reactivatedConfig.description ?? null,
    reactivatedDescription,
  );
  TestValidator.equals(
    "value_json stays as last explicitly set value",
    reactivatedConfig.value_json,
    deactivatedValueJson,
  );
  TestValidator.equals(
    "created_at unchanged after reactivation",
    reactivatedConfig.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changes again after reactivation",
    reactivatedConfig.updated_at,
    deactivatedUpdatedAt,
  );
  TestValidator.equals(
    "deleted_at remains unchanged after reactivation",
    reactivatedConfig.deleted_at ?? null,
    originalDeletedAt,
  );
}
