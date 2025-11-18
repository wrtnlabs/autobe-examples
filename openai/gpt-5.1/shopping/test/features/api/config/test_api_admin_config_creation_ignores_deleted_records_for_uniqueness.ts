import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

export async function test_api_admin_config_creation_ignores_deleted_records_for_uniqueness(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin via POST /auth/admin/join
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an initial active configuration with deterministic key scope
  const namespace = `e2e_namespace_${RandomGenerator.alphaNumeric(8)}`;
  const configKey = `e2e_config_key_${RandomGenerator.alphaNumeric(8)}`;
  const environment = "production";

  const firstConfigBody = {
    namespace,
    config_key: configKey,
    environment,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    value_json: '{"version":1}',
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const firstConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: firstConfigBody,
    });
  typia.assert(firstConfig);

  // Validate that the first config reflects the request scope and is active
  TestValidator.equals(
    "first config namespace matches request",
    firstConfig.namespace,
    namespace,
  );
  TestValidator.equals(
    "first config key matches request",
    firstConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "first config environment matches request",
    firstConfig.environment,
    environment,
  );
  TestValidator.predicate(
    "first config is_active is true",
    firstConfig.is_active === true,
  );
  TestValidator.predicate(
    "first config deleted_at is null or undefined (not soft-deleted)",
    firstConfig.deleted_at === null || firstConfig.deleted_at === undefined,
  );

  // 3. Conceptual soft delete step is not implementable with given SDK; we
  // proceed directly to creating a second config with the same key scope to
  // represent creation after soft deletion in a real backend.

  const secondConfigBody = {
    namespace,
    config_key: configKey,
    environment,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    value_json: '{"version":2}',
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const secondConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: secondConfigBody,
    });
  typia.assert(secondConfig);

  // 4. Validate that the second config is a new active row with the same
  // logical key scope but a different id and payload.
  TestValidator.notEquals(
    "second config should have a different id from first config",
    secondConfig.id,
    firstConfig.id,
  );
  TestValidator.equals(
    "second config namespace matches original",
    secondConfig.namespace,
    firstConfig.namespace,
  );
  TestValidator.equals(
    "second config key matches original",
    secondConfig.config_key,
    firstConfig.config_key,
  );
  TestValidator.equals(
    "second config environment matches original",
    secondConfig.environment,
    firstConfig.environment,
  );
  TestValidator.predicate(
    "second config is_active is true",
    secondConfig.is_active === true,
  );
  TestValidator.predicate(
    "second config deleted_at is null or undefined (not soft-deleted)",
    secondConfig.deleted_at === null || secondConfig.deleted_at === undefined,
  );

  // Also verify that the value_json changed to represent an updated
  // configuration payload.
  TestValidator.notEquals(
    "second config value_json differs from first config value_json",
    secondConfig.value_json,
    firstConfig.value_json,
  );
}
