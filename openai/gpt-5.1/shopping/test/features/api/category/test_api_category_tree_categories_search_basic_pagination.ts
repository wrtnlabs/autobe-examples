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
 * Validate basic paginated category search within a specific category tree for
 * a platform administrator.
 *
 * Business context
 *
 * - Platform admins manage catalog category trees and need to inspect categories
 *   within a particular tree using paginated search.
 * - This test ensures that, given proper admin authentication and a valid
 *   category tree, the tree-scoped category search endpoint returns a
 *   well-formed paginated response and enforces tree scoping.
 *
 * Steps
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join. This must
 *    establish an authenticated context for subsequent admin-only endpoints.
 * 2. Create a category tree using POST /shoppingMall/platformAdmin/categoryTrees
 *    with a unique `code` and some basic metadata.
 * 3. Call PATCH
 *    /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories
 *    (api.functional.shoppingMall.platformAdmin.categoryTrees.categories.index)
 *    with an IShoppingMallCategory.IRequest body where:
 *
 *    - Page = 1
 *    - Limit = small number (e.g., 10)
 *    - All other filters are left undefined so that the search is a simple paginated
 *         listing for that tree.
 * 4. Assert that the response:
 *
 *    - Is a valid IPageIShoppingMallCategory.ISummary via typia.assert
 *    - Has pagination.current >= 0 and pagination.limit equals the requested limit
 *         (or at least > 0, depending on backend normalization)
 *    - Has pagination.records >= 0 and pagination.pages >= 0 and their relationship
 *         is coherent with limit (e.g., pages is 0 iff records is 0)
 *    - All data[] elements are valid IShoppingMallCategory.ISummary via typia.assert
 *         and have categoryTree.code equal to the created tree code.
 * 5. Implicitly validate authorization by the fact that the call succeeds without
 *    throwing (no 401/403). If the endpoint throws, the test should fail
 *    naturally.
 */
export async function test_api_category_tree_categories_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (also establishes Authorization header)
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    // ip is optional and can be omitted entirely
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree with a unique business code
  const treeCode: string = `tree-${RandomGenerator.alphaNumeric(8)}`;

  const createTreeBody = {
    code: treeCode,
    name: `Tree ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: createTreeBody },
    );
  typia.assert(tree);

  // 3. Perform a basic paginated category search within that tree
  const requestedLimit = 10 as const;
  const searchRequest = {
    page: 1,
    limit: requestedLimit,
    // All other filters left undefined to get a simple listing for this tree
    // The tree scoping is provided by the path param categoryTreeCode
  } satisfies IShoppingMallCategory.IRequest;

  const pageResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.index(
      connection,
      {
        categoryTreeCode: treeCode,
        body: searchRequest,
      },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;

  // 4. Validate pagination metadata is coherent
  TestValidator.predicate(
    "pagination.current should be zero-based and non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination.limit should be positive when there are records or equal to requested limit if backend honors it",
    pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination.records should be non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination.pages should be non-negative",
    pagination.pages >= 0,
  );

  // If there are no records, pages should be 0.
  if (pagination.records === 0) {
    TestValidator.equals(
      "when records is 0, pages should be 0",
      pagination.pages,
      0,
    );
  }

  // pages should be at least 1 when there are records
  if (pagination.records > 0) {
    TestValidator.predicate(
      "when records > 0, pages should be at least 1",
      pagination.pages >= 1,
    );
  }

  // 5. Validate each category summary belongs to the created tree
  for (const category of pageResult.data) {
    // typia.assert on the whole pageResult has already validated structure,
    // but we can still access the fields for business checks.
    TestValidator.equals(
      "each category's categoryTree.code must equal requested tree code",
      category.categoryTree.code,
      treeCode,
    );
  }
}
