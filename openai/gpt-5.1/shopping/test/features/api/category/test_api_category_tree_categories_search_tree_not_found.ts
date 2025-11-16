import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate search categories behavior when category tree code does not exist.
 *
 * Business goal: Ensure that the platform-admin category listing endpoint for a
 * given category tree does NOT silently return an empty page when the
 * referenced tree code does not exist. Instead, the backend must treat this as
 * a domain-level not-found error and respond by failing the request.
 *
 * Flow:
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join to obtain an
 *    authenticated admin session (token handling is done inside the SDK).
 * 2. Choose a categoryTreeCode value that is guaranteed to not exist within this
 *    test (for example, by using a random string and never creating any
 *    category tree with that code).
 * 3. Call PATCH
 *    /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories
 *    with that non-existent code and a simple IShoppingMallCategory.IRequest
 *    body (e.g., default pagination fields, no filters).
 * 4. Verify that the call does NOT succeed and instead throws an error, implying
 *    that the handler has treated the missing tree as a not-found situation
 *    instead of returning a normal IPageIShoppingMallCategory.ISummary payload
 *    (including an empty data array).
 *
 * Notes and constraints:
 *
 * - We must not deliberately send invalid types or omit required fields; the
 *   request DTO must be valid IShoppingMallCategory.IRequest.
 * - We must not inspect HTTP status codes or error message details according to
 *   the global E2E rules; the only assertion is that an error is thrown when
 *   calling the endpoint with a non-existent tree code.
 * - Authentication header management is handled internally by the SDK's join
 *   function; the test code must not manipulate connection.headers.
 */
export async function test_api_category_tree_categories_search_tree_not_found(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain an authenticated session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Choose a clearly non-existent categoryTreeCode.
  // Use a random value with a prefix to reduce any chance of collision with
  // real test data created elsewhere.
  const nonExistentTreeCode: string = `non-existent-tree-${RandomGenerator.alphaNumeric(16)}`;

  // 3. Prepare a simple, valid IShoppingMallCategory.IRequest body with
  // default-like pagination settings and no specific filters.
  const requestBody = {
    page: undefined,
    limit: undefined,
    sortKey: undefined,
    sortOrder: undefined,
    keyword: undefined,
    treeCode: undefined,
    parentCategoryCode: undefined,
    minDepth: undefined,
    maxDepth: undefined,
    isActive: undefined,
  } satisfies IShoppingMallCategory.IRequest;

  // 4. Assert that calling the categories.index endpoint with a non-existent
  // tree code results in an error instead of a normal page response. We use
  // TestValidator.error with an async callback and await, without inspecting
  // status codes or error payload details.
  await TestValidator.error(
    "searching categories with non-existent tree code must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.index(
        connection,
        {
          categoryTreeCode: nonExistentTreeCode,
          body: requestBody,
        },
      );
    },
  );
}
