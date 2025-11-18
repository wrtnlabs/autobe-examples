import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

/**
 * Validate admin-driven reorganization of configuration namespace and key.
 *
 * Business context: Administrators manage global configuration entries in
 * `shopping_mall_configs`. Each entry is identified logically by (namespace,
 * config_key, environment, is_active) and physically by an immutable UUID `id`.
 * Admin tools may need to "re-group" configurations by migrating them to new
 * namespaces or renaming config_key, while preserving history (id, created_at,
 * deleted_at) and respecting uniqueness constraints.
 *
 * This test covers:
 *
 * 1. Authenticated admin bootstrap via POST /auth/admin/join
 * 2. Seeding of baseline configurations via POST /shoppingMall/admin/configs
 * 3. Successful update that changes namespace and config_key for one row, keeping
 *    environment the same, and verifies:
 *
 *    - Id is unchanged
 *    - Created_at is unchanged
 *    - Deleted_at remains null/undefined
 *    - Updated_at is advanced (different from original)
 *    - Namespace and config_key reflect new values
 * 4. A conflicting update attempt on another config that tries to move it into an
 *    already-occupied (namespace, config_key, environment, is_active)
 *    combination, expecting the API to fail and leave the original row intact.
 */
export async function test_api_admin_config_update_namespace_and_key_reorganization(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // ip is optional; omit to let server derive or accept absence
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Ensure we have a logically active admin (basic sanity checks)
  TestValidator.predicate(
    "admin join should produce active admin status",
    adminAuthorized.status.length > 0,
  );
  TestValidator.predicate(
    "admin join deleted_at should be null",
    adminAuthorized.deleted_at === null,
  );

  // 2. Seed a baseline active configuration that we'll later rename
  const baseNamespace = "checkout";
  const baseKey = "maxCartItems";
  const environment = "production";

  const createBodyPrimary = {
    namespace: baseNamespace,
    config_key: baseKey,
    environment,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    value_json: JSON.stringify({ maxCartItems: 50 }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const primaryConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: createBodyPrimary,
    });
  typia.assert(primaryConfig);

  TestValidator.equals(
    "created primary config should echo namespace",
    primaryConfig.namespace,
    baseNamespace,
  );
  TestValidator.equals(
    "created primary config should echo config_key",
    primaryConfig.config_key,
    baseKey,
  );
  TestValidator.equals(
    "created primary config should echo environment",
    primaryConfig.environment,
    environment,
  );
  TestValidator.predicate(
    "primary config deleted_at should be null or undefined",
    primaryConfig.deleted_at === null || primaryConfig.deleted_at === undefined,
  );

  const originalCreatedAt = primaryConfig.created_at;
  const originalUpdatedAt = primaryConfig.updated_at;

  // 3. Perform a successful namespace + key rename on the primary config
  const newNamespace = "cart";
  const newKey = "max_cart_items_limit";

  const updateBodyRename = {
    namespace: newNamespace,
    config_key: newKey,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    value_json: JSON.stringify({ maxCartItems: 100, unit: "items" }),
  } satisfies IShoppingMallConfig.IUpdate;

  const updatedConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.update(connection, {
      configId: primaryConfig.id,
      body: updateBodyRename,
    });
  typia.assert(updatedConfig);

  // Verify immutable & lifecycle behavior
  TestValidator.equals(
    "config id must remain unchanged after rename",
    updatedConfig.id,
    primaryConfig.id,
  );
  TestValidator.equals(
    "created_at must remain unchanged after rename",
    updatedConfig.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should be changed after update",
    updatedConfig.updated_at !== originalUpdatedAt,
  );
  TestValidator.predicate(
    "deleted_at remains null/undefined after successful update",
    updatedConfig.deleted_at === null || updatedConfig.deleted_at === undefined,
  );

  // Verify logical field changes
  TestValidator.equals(
    "namespace should reflect new value after update",
    updatedConfig.namespace,
    newNamespace,
  );
  TestValidator.equals(
    "config_key should reflect new value after update",
    updatedConfig.config_key,
    newKey,
  );
  TestValidator.equals(
    "environment must remain unchanged after namespace/key update",
    updatedConfig.environment,
    environment,
  );

  // 4. Prepare a second configuration to test uniqueness conflict
  const conflictNamespace = "payments";
  const conflictKey = "retry_policy";

  const createBodySecondary = {
    namespace: conflictNamespace,
    config_key: conflictKey,
    environment,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    value_json: JSON.stringify({ maxRetries: 3, backoff: "linear" }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const secondaryConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: createBodySecondary,
    });
  typia.assert(secondaryConfig);

  TestValidator.equals(
    "secondary config namespace should match initial value",
    secondaryConfig.namespace,
    conflictNamespace,
  );
  TestValidator.equals(
    "secondary config key should match initial value",
    secondaryConfig.config_key,
    conflictKey,
  );

  // Attempt to update secondary config into the same logical combo as updatedConfig.
  // If uniqueness over (namespace, config_key, environment, is_active) is enforced
  // on update, this should fail.
  const conflictUpdateBody = {
    namespace: updatedConfig.namespace,
    config_key: updatedConfig.config_key,
    environment: updatedConfig.environment,
    is_active: updatedConfig.is_active,
  } satisfies IShoppingMallConfig.IUpdate;

  await TestValidator.error(
    "updating secondary config into duplicate (namespace, key, env, active) should fail",
    async () => {
      await api.functional.shoppingMall.admin.configs.update(connection, {
        configId: secondaryConfig.id,
        body: conflictUpdateBody,
      });
    },
  );
}
