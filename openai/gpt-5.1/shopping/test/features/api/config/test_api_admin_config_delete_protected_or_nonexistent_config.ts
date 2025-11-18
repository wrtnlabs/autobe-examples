import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

/**
 * Validate deletion behavior of shopping mall admin configuration entries.
 *
 * This e2e test exercises the DELETE /shoppingMall/admin/configs/{configId}
 * endpoint in realistic admin workflows:
 *
 * 1. Authenticate an admin via POST /auth/admin/join so that subsequent
 *    configuration operations run in an authorized context.
 * 2. Create a baseline configuration via POST /shoppingMall/admin/configs, then
 *    delete it once to establish the successful deletion path.
 * 3. Immediately attempt a second deletion of the same configuration id and assert
 *    that the API fails with an error, demonstrating proper handling of
 *    non-existent (already-deleted) resources.
 *
 * The test focuses on business behavior around idempotent safety and error
 * handling without inspecting concrete HTTP status codes, using only
 * error/no-error semantics through TestValidator.error().
 */
export async function test_api_admin_config_delete_protected_or_nonexistent_config(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain authorized context for admin-only APIs
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a baseline configuration that we will delete
  const baseConfigBody = {
    namespace: "e2e.config.deletion",
    config_key: `baseline-${RandomGenerator.alphaNumeric(8)}`,
    environment: "test",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    value_json: JSON.stringify({
      featureFlag: true,
      threshold: 10,
      mode: "baseline",
    }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const baseConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: baseConfigBody,
    });
  typia.assert(baseConfig);

  // 3. First deletion should succeed without throwing
  await api.functional.shoppingMall.admin.configs.erase(connection, {
    configId: baseConfig.id,
  });

  // 4. Second deletion of the same id should result in an error
  await TestValidator.error(
    "second deletion of already-deleted config should fail",
    async () => {
      await api.functional.shoppingMall.admin.configs.erase(connection, {
        configId: baseConfig.id,
      });
    },
  );
}
