import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that deleting a ShoppingMall category tree without an admin token is
 * rejected by the platform and that the same operation succeeds when properly
 * authenticated.
 *
 * Business intent:
 *
 * - Category tree deletion is a privileged operation restricted to platform-level
 *   administrators.
 * - Any attempt to call DELETE
 *   /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode} without a
 *   valid platform admin session must fail with an authorization error and must
 *   not proceed to execute deletion logic.
 * - When a platform admin is properly joined (and thus authenticated via the
 *   SDK), the same erase API should be callable without authorization errors.
 *
 * Test steps:
 *
 * 1. Build an "unauthenticated" connection object by cloning the provided
 *    connection and setting an empty headers object. This avoids any existing
 *    Authorization header while complying with the rule of not mutating
 *    connection.headers after creation.
 * 2. Generate a random categoryTreeCode string, representing the target category
 *    tree code. The actual existence of the tree is irrelevant for
 *    authorization testing.
 * 3. Invoke api.functional.shoppingMall.platformAdmin.categoryTrees.erase with the
 *    unauthenticated connection and the random categoryTreeCode inside
 *    TestValidator.error, asserting that the call fails due to missing/invalid
 *    authentication.
 * 4. For contrast, perform a happy-path flow on the original connection: 4-1. Call
 *    api.functional.auth.platformAdmin.join with a random
 *    IShoppingMallPlatformAdminJoin.IRequest body to bootstrap a platform
 *    admin. The SDK will automatically set connection.headers.Authorization to
 *    the issued access token. 4-2. Call erase again with the authenticated
 *    connection and another random categoryTreeCode, expecting the call to
 *    complete without throwing.
 *
 * Notes:
 *
 * - We do not assert HTTP status codes or error payloads; instead, we rely on
 *   TestValidator.error to ensure that an error is thrown in the
 *   unauthenticated case.
 * - We cannot verify actual persistence impact (that a category tree was or was
 *   not deleted) because no read/list APIs are provided for
 *   shopping_mall_category_trees in the current SDK surface.
 */
export async function test_api_category_tree_delete_unauthorized_without_admin_token(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection by cloning and overriding headers.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Generate a random categoryTreeCode for the unauthorized attempt.
  const unauthorizedCategoryTreeCode: string = typia.random<string>();

  // 3. Expect erase() to fail when called without admin Authorization header.
  await TestValidator.error(
    "erase category tree must fail without platform admin token",
    async () => {
      await api.functional.shoppingMall.platformAdmin.categoryTrees.erase(
        unauthenticatedConnection,
        {
          categoryTreeCode: unauthorizedCategoryTreeCode,
        },
      );
    },
  );

  // 4-1. Join as a platform admin on the original connection to obtain
  //      an authenticated session (SDK sets Authorization header internally).
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(admin);

  // 4-2. Attempt erase() again using the authenticated connection. We expect
  //      no error to be thrown here (authorization is satisfied).
  const authorizedCategoryTreeCode: string = typia.random<string>();

  await api.functional.shoppingMall.platformAdmin.categoryTrees.erase(
    connection,
    {
      categoryTreeCode: authorizedCategoryTreeCode,
    },
  );
}
