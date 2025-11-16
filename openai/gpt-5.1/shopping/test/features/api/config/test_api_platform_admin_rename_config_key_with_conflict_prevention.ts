import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that renaming a platform configuration entry to a conflicting
 * namespace+key pair is rejected while non-conflicting updates still succeed.
 *
 * Business context: Platform administrators manage global configs in
 * `shopping_mall_configs`. Each config is identified by a stable `id` and by a
 * logical `(namespace, key)` pair that is unique. Admins may update configs,
 * but must not be allowed to change a config’s identity to collide with another
 * existing entry.
 *
 * This test follows a focused admin workflow:
 *
 * 1. Register a new platform admin (join) to obtain an authenticated context.
 * 2. Create two distinct configs A and B under the same namespace but with
 *    different keys.
 * 3. Attempt to update B so that its key becomes equal to A’s key, expecting an
 *    error due to uniqueness constraints on (namespace, key).
 * 4. Verify that a subsequent, non-conflicting update on B still succeeds.
 * 5. Indirectly ensure that A remains unchanged by relying on its in-memory
 *    representation (no read endpoint available in this scope).
 */
export async function test_api_platform_admin_rename_config_key_with_conflict_prevention(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin to obtain an authorized session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  TestValidator.predicate("platform admin should be active", admin.isActive);

  // 2. Create Config A and Config B under namespace "checkout" with distinct keys.
  const createConfigABody = {
    namespace: "checkout",
    key: "max_cart_items",
    value: "100",
    description: "Maximum number of items allowed in a cart.",
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const configA: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: createConfigABody,
    });
  typia.assert(configA);

  const createConfigBBody = {
    namespace: "checkout",
    key: "max_cart_value",
    value: "100000",
    description: "Maximum total cart value in cents.",
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const configB: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: createConfigBBody,
    });
  typia.assert(configB);

  // Sanity checks: both configs share namespace but differ in key.
  TestValidator.equals(
    "configA namespace should be 'checkout'",
    configA.namespace,
    "checkout",
  );
  TestValidator.equals(
    "configB namespace should be 'checkout'",
    configB.namespace,
    "checkout",
  );
  TestValidator.notEquals(
    "configA and configB must have different keys",
    configA.key,
    configB.key,
  );

  // 3. Attempt to rename Config B so that its key collides with Config A.
  const conflictingUpdateBody = {
    key: configA.key,
  } satisfies IShoppingMallConfig.IUpdate;

  await TestValidator.error(
    "updating configB key to configA key should fail with uniqueness violation",
    async () => {
      await api.functional.shoppingMall.platformAdmin.configs.update(
        connection,
        {
          configId: configB.id,
          body: conflictingUpdateBody,
        },
      );
    },
  );

  // 4. Perform a non-conflicting update on Config B to prove it is still modifiable.
  const nonConflictingUpdateBody = {
    value: "99999",
    description: "Adjusted maximum total cart value in cents.",
  } satisfies IShoppingMallConfig.IUpdate;

  const updatedConfigB: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.update(connection, {
      configId: configB.id,
      body: nonConflictingUpdateBody,
    });
  typia.assert(updatedConfigB);

  // 5. Validate that updatedConfigB kept its original identity but changed value.
  TestValidator.equals(
    "updated configB id should stay the same",
    updatedConfigB.id,
    configB.id,
  );
  TestValidator.equals(
    "updated configB namespace should remain 'checkout'",
    updatedConfigB.namespace,
    configB.namespace,
  );
  TestValidator.equals(
    "updated configB key should remain original (non-conflicting) key",
    updatedConfigB.key,
    configB.key,
  );
  TestValidator.equals(
    "updated configB value should reflect the non-conflicting update",
    updatedConfigB.value,
    nonConflictingUpdateBody.value,
  );

  // 6. Indirectly ensure Config A identity remains unchanged in-memory.
  TestValidator.equals(
    "configA key remains its original key after failed conflicting update",
    configA.key,
    createConfigABody.key,
  );
  TestValidator.equals(
    "configA namespace remains its original namespace after failed conflicting update",
    configA.namespace,
    createConfigABody.namespace,
  );
}
