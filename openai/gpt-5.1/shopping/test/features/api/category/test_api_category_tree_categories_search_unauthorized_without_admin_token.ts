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
 * Verify that category search by platform admin category tree endpoint rejects
 * requests when no admin authorization token is present.
 *
 * Business context: The PATCH
 * /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories
 * endpoint is a privileged administrative search API scoped to a specific
 * category tree by its business code. Only authenticated platform
 * administrators should be able to list categories for a given tree. Any
 * request missing a valid platform admin token must fail with an
 * authentication/authorization error before any tree-specific business logic is
 * evaluated.
 *
 * Scenario steps:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join, using a
 *    realistic IShoppingMallPlatformAdminJoin.IRequest body. The join call must
 *    succeed and will attach an Authorization token to the provided connection
 *    automatically.
 * 2. Using the authenticated connection, perform a baseline category search
 *    against PATCH
 *    /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories
 *    with some arbitrary categoryTreeCode and an IShoppingMallCategory.IRequest
 *    body. This call is expected to succeed under the platform's mock/simulate
 *    configuration, and its response must be validated with typia.assert as
 *    IPageIShoppingMallCategory.ISummary.
 * 3. Construct a fresh unauthenticated connection by shallow-cloning the original
 *    connection but overriding headers with an empty object, so there is no
 *    Authorization header. Do not modify headers on the original connection
 *    directly.
 * 4. Call the same category search endpoint with the unauthenticated connection,
 *    same categoryTreeCode and a valid IShoppingMallCategory.IRequest body.
 *    Wrap this call with TestValidator.error to assert that an error is thrown
 *    due to missing authentication/authorization. The test must not assert on
 *    specific HTTP status codes or error payload structure—only that the call
 *    fails.
 * 5. Ensure that the positive (authorized) path and the negative (unauthorized)
 *    path are clearly separated, with descriptive TestValidator titles
 *    documenting the intent of each assertion.
 */
export async function test_api_category_tree_categories_search_unauthorized_without_admin_token(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin so that the system has a valid
  //    administrative actor, and capture the authorized session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Perform a baseline authorized category search using the authenticated
  //    connection to ensure that the endpoint works with proper credentials.
  const categoryTreeCode: string = RandomGenerator.alphaNumeric(8);

  const authorizedRequestBody = {
    page: 1 satisfies number,
    limit: 10 satisfies number,
    sortKey: "name",
    sortOrder: "asc",
    keyword: undefined,
    treeCode: categoryTreeCode,
    parentCategoryCode: undefined,
    minDepth: undefined,
    maxDepth: undefined,
    isActive: null,
  } satisfies IShoppingMallCategory.IRequest;

  const authorizedPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.index(
      connection,
      {
        categoryTreeCode,
        body: authorizedRequestBody,
      },
    );
  typia.assert(authorizedPage);

  TestValidator.predicate(
    "authorized category search should return a page structure",
    authorizedPage.pagination.records >= 0,
  );

  // 3. Build an unauthenticated connection by cloning and dropping headers.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt the same category search without an Authorization token and
  //    verify that it fails.
  const unauthorizedRequestBody = {
    page: 1 satisfies number,
    limit: 5 satisfies number,
    sortKey: "name",
    sortOrder: "asc",
    keyword: undefined,
    treeCode: categoryTreeCode,
    parentCategoryCode: undefined,
    minDepth: undefined,
    maxDepth: undefined,
    isActive: null,
  } satisfies IShoppingMallCategory.IRequest;

  await TestValidator.error(
    "unauthorized category search without admin token must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.index(
        unauthenticatedConnection,
        {
          categoryTreeCode,
          body: unauthorizedRequestBody,
        },
      );
    },
  );
}
