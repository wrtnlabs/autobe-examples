import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that platform admin configuration detail endpoint returns an error
 * when requested with a non-existent configId, without leaking configuration
 * data and while operating under a valid authenticated admin session.
 *
 * Business context:
 *
 * - Platform admins manage global shopping mall configurations via
 *   /shoppingMall/platformAdmin/configs APIs.
 * - The detail endpoint `/shoppingMall/platformAdmin/configs/{configId}` must
 *   return an error (not-found) when asked for a configuration that does not
 *   exist, while still succeeding for valid existing configuration ids.
 *
 * Test flow:
 *
 * 1. Join as a new platform admin using POST /auth/platformAdmin/join to obtain an
 *    authenticated session.
 * 2. Create a valid configuration using POST /shoppingMall/platformAdmin/configs
 *    to verify that the configs subsystem is operational and to have a
 *    known-good config id.
 * 3. Construct a non-existent configId as a random UUID string that is guaranteed
 *    to differ from the created configuration id.
 * 4. Call GET /shoppingMall/platformAdmin/configs/{configId} with the non-existent
 *    id and assert that the call fails (error is thrown).
 * 5. Re-call GET /shoppingMall/platformAdmin/configs/{configId} with the
 *    _existing_ config id to prove that the endpoint still works for valid
 *    identifiers and that the not-found behavior is specific to non-existent
 *    ids.
 */
export async function test_api_platform_admin_config_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create a baseline configuration entry
  const namespace = `tests:${RandomGenerator.alphabets(6)}`;
  const key = `e2e_not_found_baseline_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    namespace,
    key,
    value: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: createBody,
    });
  typia.assert(createdConfig);

  // 3. Generate a non-existent configId, making sure it differs from the
  //    existing configuration id.
  let nonExistentConfigId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonExistentConfigId === createdConfig.id) {
    // Extremely unlikely, but regenerate once if collision happens.
    nonExistentConfigId = typia.random<string & tags.Format<"uuid">>();
  }

  // 4. Call detail endpoint with non-existent id and assert that it fails.
  await TestValidator.error(
    "platform admin config detail for non-existent id must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.configs.at(connection, {
        configId: nonExistentConfigId,
      });
    },
  );

  // 5. Sanity check: existing config id should still succeed.
  const fetchedConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.at(connection, {
      configId: createdConfig.id,
    });
  typia.assert(fetchedConfig);

  TestValidator.equals(
    "fetched config matches created config id",
    fetchedConfig.id,
    createdConfig.id,
  );
}
