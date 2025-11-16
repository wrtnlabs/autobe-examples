import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Ensure platform admin config creation enforces (namespace, key) uniqueness.
 *
 * Business goal
 *
 * - Verify that POST /shoppingMall/platformAdmin/configs refuses to create a
 *   second configuration row with the same (namespace, key) pair and instead
 *   throws a client-side error for duplicates.
 *
 * Steps
 *
 * 1. Join as a new platform admin using POST /auth/platformAdmin/join to get an
 *    authorized admin session (SDK auto-binds Authorization header).
 * 2. Create an initial config with namespace "payment" and key
 *    "payment_timeout_seconds".
 * 3. Attempt to create another config with the same namespace+key but different
 *    value/description.
 * 4. Assert that the second creation call fails (throws) using
 *    TestValidator.error, without asserting a specific HTTP status code.
 */
export async function test_api_platform_admin_config_key_uniqueness_violation(
  connection: api.IConnection,
) {
  // 1. Bootstrap a platform admin session via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create the initial configuration entry
  const namespace = "payment";
  const key = "payment_timeout_seconds";

  const firstConfigBody = {
    namespace,
    key,
    value: "300",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const created: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: firstConfigBody,
    });
  typia.assert<IShoppingMallConfig>(created);

  // Basic sanity check that server echoed namespace/key correctly
  TestValidator.equals(
    "created config namespace should match input",
    created.namespace,
    namespace,
  );
  TestValidator.equals(
    "created config key should match input",
    created.key,
    key,
  );

  // 3. Attempt to create a duplicate configuration with same (namespace, key)
  const duplicateConfigBody = {
    namespace,
    key,
    value: "600", // different value, should still hit uniqueness constraint
    description: RandomGenerator.paragraph({ sentences: 2 }),
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  // 4. Assert that the duplicate attempt fails with some error
  await TestValidator.error(
    "duplicate config (namespace, key) must be rejected",
    async () => {
      await api.functional.shoppingMall.platformAdmin.configs.create(
        connection,
        {
          body: duplicateConfigBody,
        },
      );
    },
  );
}
