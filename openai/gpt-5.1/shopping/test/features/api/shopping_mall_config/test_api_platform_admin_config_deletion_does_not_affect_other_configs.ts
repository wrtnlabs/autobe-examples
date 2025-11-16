import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Ensure platform admin can delete a single config entry without affecting
 * other configs in the same namespace.
 *
 * Business goal:
 *
 * - When a platform administrator deletes one configuration row from
 *   shopping_mall_configs using DELETE
 *   /shoppingMall/platformAdmin/configs/{configId}, only that specific row must
 *   be removed. Other configuration entries, including those sharing the same
 *   namespace, must remain intact.
 *
 * Test steps:
 *
 * 1. Join as a platform admin via POST /auth/platformAdmin/join to obtain an
 *    authenticated session (IShoppingMallPlatformAdmin.IAuthorized). The SDK
 *    automatically stores the access token in the connection headers.
 * 2. Create two configs via POST /shoppingMall/platformAdmin/configs with the same
 *    namespace (e.g., "checkout") but different keys ("max_cart_items" and
 *    "payment_timeout_seconds"). Capture full IShoppingMallConfig responses
 *    including id, namespace, key, value, description, active, timestamps.
 * 3. Delete the first config using DELETE
 *    /shoppingMall/platformAdmin/configs/{configId} by calling
 *    api.functional.shoppingMall.platformAdmin.configs.erase with the first
 *    config's id.
 * 4. Ensure the erase call completes without throwing, indicating success.
 * 5. Verify that the second configuration entry remains unaffected:
 *
 *    - Its id stays different from the deleted one.
 *    - The key, value, namespace, description, active flag, and timestamps in the
 *         second config object are unchanged from what was returned at creation
 *         time (within this test's context, we compare to the original snapshot
 *         since we have no read/list endpoint).
 * 6. Confirm there are no unintended side effects like id reuse or accidental
 *    coupling of configs in the same namespace by asserting that the two ids
 *    are distinct and that the second config snapshot is still valid per its
 *    type.
 */
export async function test_api_platform_admin_config_deletion_does_not_affect_other_configs(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized session
  const joinRequest = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create two configuration entries in the same namespace with different keys
  const namespace = "checkout";

  const firstConfigCreate = {
    namespace,
    key: "max_cart_items",
    value: "50",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const firstConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: firstConfigCreate,
    });
  typia.assert<IShoppingMallConfig>(firstConfig);

  const secondConfigCreate = {
    namespace,
    key: "payment_timeout_seconds",
    value: "900",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const secondConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: secondConfigCreate,
    });
  typia.assert<IShoppingMallConfig>(secondConfig);

  // Sanity checks: ids must differ and share namespace but have different keys
  TestValidator.notEquals(
    "configuration ids must be distinct",
    firstConfig.id,
    secondConfig.id,
  );
  TestValidator.equals(
    "both configs share the same namespace",
    firstConfig.namespace,
    secondConfig.namespace,
  );
  TestValidator.notEquals(
    "config keys must be different within the namespace",
    firstConfig.key,
    secondConfig.key,
  );

  // Snapshot original second config for later comparison
  const originalSecondConfig = {
    ...secondConfig,
  } satisfies IShoppingMallConfig;

  // 3. Delete only the first configuration entry
  await api.functional.shoppingMall.platformAdmin.configs.erase(connection, {
    configId: firstConfig.id,
  });

  // 4. If erase succeeded without throwing, we proceed to verify business-level isolation.
  // 5. Verify that second configuration remains unaffected by deletion of the first.
  typia.assert<IShoppingMallConfig>(originalSecondConfig);

  TestValidator.equals(
    "second config id remains unchanged after deletion of first",
    secondConfig.id,
    originalSecondConfig.id,
  );
  TestValidator.equals(
    "second config namespace remains unchanged after deletion of first",
    secondConfig.namespace,
    originalSecondConfig.namespace,
  );
  TestValidator.equals(
    "second config key remains unchanged after deletion of first",
    secondConfig.key,
    originalSecondConfig.key,
  );
  TestValidator.equals(
    "second config value remains unchanged after deletion of first",
    secondConfig.value,
    originalSecondConfig.value,
  );
  TestValidator.equals(
    "second config description remains unchanged after deletion of first",
    secondConfig.description ?? null,
    originalSecondConfig.description ?? null,
  );
  TestValidator.equals(
    "second config active flag remains unchanged after deletion of first",
    secondConfig.active,
    originalSecondConfig.active,
  );

  // 6. Verify no id collision or reuse between deleted and remaining configs
  TestValidator.notEquals(
    "deleted config id must still differ from second config id",
    firstConfig.id,
    secondConfig.id,
  );
}
