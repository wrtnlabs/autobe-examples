import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

/**
 * Ensure shopping mall admin configuration detail is inaccessible without
 * authentication.
 *
 * Business goal:
 *
 * - The configuration detail endpoint `/shoppingMall/admin/configs/{configId}`
 *   must not be publicly accessible.
 * - Only authenticated admin actors are allowed to read configuration records.
 *
 * Test workflow:
 *
 * 1. Register an admin via POST /auth/admin/join using valid
 *    IShoppingMallAdminJoin.ICreate data.
 *
 *    - This call also sets the Authorization header on the shared connection through
 *         the SDK.
 * 2. As the authenticated admin, create a configuration via POST
 *    /shoppingMall/admin/configs using IShoppingMallConfig.ICreate and capture
 *    the created config id.
 * 3. Build an unauthenticated connection object by shallow-cloning the original
 *    connection and setting `headers` to an empty object literal, without
 *    mutating the original connection.headers reference.
 * 4. Call GET /shoppingMall/admin/configs/{configId} with the unauthenticated
 *    connection and verify with TestValidator.error that the call fails due to
 *    missing authentication.
 * 5. Do not assert on HTTP status codes or error shapes; only assert that an error
 *    is thrown.
 */
export async function test_api_admin_config_detail_inaccessible_without_auth(
  connection: api.IConnection,
) {
  // 1. Register an admin (join) to obtain an authenticated admin session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a configuration as the authenticated admin
  const createConfigBody = {
    namespace: "checkout",
    config_key: "maxCartItems",
    environment: "test",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    value_json: JSON.stringify({ maxItems: 50 }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: createConfigBody,
    });
  typia.assert(createdConfig);

  // 3. Prepare an unauthenticated connection by clearing headers via shallow copy
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to fetch config detail without authentication and expect failure
  await TestValidator.error(
    "config detail must be inaccessible without admin auth",
    async () => {
      await api.functional.shoppingMall.admin.configs.at(
        unauthenticatedConnection,
        { configId: createdConfig.id },
      );
    },
  );
}
