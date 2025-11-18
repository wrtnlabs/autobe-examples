import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

/**
 * Validate behavior when requesting admin config detail with an unknown ID.
 *
 * Business goal:
 *
 * - Ensure that GET /shoppingMall/admin/configs/{configId} does not successfully
 *   return a configuration entity when the requested configId does not exist.
 * - The original scenario wants a 404 Not Found; in the e2e SDK layer we validate
 *   this by asserting that the SDK call fails rather than returning an
 *   IShoppingMallConfig, without asserting on any specific HTTP status code or
 *   error payload.
 *
 * High-level workflow:
 *
 * 1. Join an admin account using POST /auth/admin/join to obtain an authenticated
 *    admin session and Authorization header.
 * 2. Generate a fresh random UUID string to use as a non-existent configuration
 *    ID. We intentionally do not create any configs in this test, so this ID
 *    should not correspond to any row in shopping_mall_configs.
 * 3. Call GET /shoppingMall/admin/configs/{configId} with the random UUID as
 *    configId.
 * 4. Use TestValidator.error to assert that the call fails, meaning that the
 *    backend does not treat the unknown ID as a successful lookup returning
 *    IShoppingMallConfig. We do not assert on the exact HTTP status code or
 *    error body, only that an error occurs.
 *
 * Key validations:
 *
 * - An authenticated admin context is required before accessing the configs
 *   endpoint; join establishes this context.
 * - For a fresh, likely non-existent configId, the configs.at call must NOT
 *   succeed and return an IShoppingMallConfig.
 * - We respect e2e constraints by not inspecting HTTP status codes or error
 *   payloads directly; instead, we validate that the API call throws via
 *   TestValidator.error.
 */
export async function test_api_admin_config_detail_returns_404_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Generate a random UUID to serve as a non-existent configId
  const unknownConfigId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3 & 4. Assert that requesting this unknown configId causes an error
  await TestValidator.error(
    "admin config detail should fail for unknown configId",
    async () => {
      const result: IShoppingMallConfig =
        await api.functional.shoppingMall.admin.configs.at(connection, {
          configId: unknownConfigId,
        });
      typia.assert(result);
    },
  );
}
