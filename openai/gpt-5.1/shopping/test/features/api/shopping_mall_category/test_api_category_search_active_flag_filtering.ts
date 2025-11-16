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
 * Validate category search active flag filtering.
 *
 * Business goal: Ensure that the public category search endpoint
 * `/shoppingMall/search/categories` correctly respects the `isActive` tri-state
 * filter when searching within a specific category tree. The endpoint must:
 *
 * - Return only active categories when `isActive` is `true`.
 * - Return only inactive categories when `isActive` is `false`.
 * - Return both active and inactive categories when `isActive` is omitted (no
 *   active filter applied).
 *
 * Test steps:
 *
 * 1. Join as a platform admin to obtain an authorized admin session.
 * 2. Create a category tree with a unique business code.
 * 3. Under that tree, create two categories sharing a common keyword:
 *
 *    - One active category (isActive = true).
 *    - One inactive category (isActive = false).
 * 4. Call PATCH `/shoppingMall/search/categories` three times:
 *
 *    - With `isActive = true` and filters constrained by `treeCode` and a keyword
 *         that matches both categories.
 *    - With `isActive = false` and the same filters.
 *    - With `isActive` omitted but the same filters.
 * 5. Validate that results:
 *
 *    - Are structurally valid using `typia.assert`.
 *    - Contain only the appropriate category(ies) for each `isActive` mode using
 *         `TestValidator`.
 */
export async function test_api_category_search_active_flag_filtering(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree
  const treeCode = `tree-${RandomGenerator.alphaNumeric(8)}`;

  const treeBody = {
    code: treeCode,
    name: "ActiveFlag Test Tree",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: treeBody },
    );
  typia.assert(tree);

  // 3. Create two categories under the tree with a shared keyword
  const sharedKeyword = RandomGenerator.paragraph({ sentences: 1 });

  const activeCategoryBody = {
    code: `active-${RandomGenerator.alphaNumeric(6)}`,
    name: `ACTIVE ${sharedKeyword}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const inactiveCategoryBody = {
    code: `inactive-${RandomGenerator.alphaNumeric(6)}`,
    name: `INACTIVE ${sharedKeyword}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 2 as number & tags.Type<"int32">,
    isActive: false,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const activeCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: activeCategoryBody,
      },
    );
  typia.assert(activeCategory);

  const inactiveCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: inactiveCategoryBody,
      },
    );
  typia.assert(inactiveCategory);

  // Helper to extract a keyword that is guaranteed to be present in both
  // names; since we used the same `sharedKeyword` string, we can search
  // directly by that.
  const keyword = sharedKeyword.split(" ")[0] ?? sharedKeyword;

  const commonSearchBase = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sortKey: undefined,
    sortOrder: undefined,
    keyword,
    treeCode: tree.code,
    parentCategoryCode: undefined,
    minDepth: undefined,
    maxDepth: undefined,
  } satisfies IShoppingMallCategory.IRequest;

  // 4a. Search with isActive = true
  const activeSearchRequest = {
    ...commonSearchBase,
    isActive: true,
  } satisfies IShoppingMallCategory.IRequest;

  const activeSearchResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.search.categories.index(connection, {
      body: activeSearchRequest,
    });
  typia.assert(activeSearchResult);

  const activeIds = activeSearchResult.data.map((c) => c.id);

  TestValidator.predicate(
    "active search should include only active category and not inactive",
    () => {
      const hasActive = activeIds.includes(activeCategory.id);
      const hasInactive = activeIds.includes(inactiveCategory.id);
      return hasActive && !hasInactive;
    },
  );

  // Also assert that every returned category has active flag true
  TestValidator.predicate(
    "all categories in isActive=true search are active",
    () => activeSearchResult.data.every((c) => c.active === true),
  );

  // 4b. Search with isActive = false
  const inactiveSearchRequest = {
    ...commonSearchBase,
    isActive: false,
  } satisfies IShoppingMallCategory.IRequest;

  const inactiveSearchResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.search.categories.index(connection, {
      body: inactiveSearchRequest,
    });
  typia.assert(inactiveSearchResult);

  const inactiveIds = inactiveSearchResult.data.map((c) => c.id);

  TestValidator.predicate(
    "inactive search should include only inactive category and not active",
    () => {
      const hasInactive = inactiveIds.includes(inactiveCategory.id);
      const hasActive = inactiveIds.includes(activeCategory.id);
      return hasInactive && !hasActive;
    },
  );

  TestValidator.predicate(
    "all categories in isActive=false search are inactive",
    () => inactiveSearchResult.data.every((c) => c.active === false),
  );

  // 4c. Search with isActive omitted
  const noFlagSearchRequest = {
    ...commonSearchBase,
    isActive: undefined,
  } satisfies IShoppingMallCategory.IRequest;

  const noFlagSearchResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.search.categories.index(connection, {
      body: noFlagSearchRequest,
    });
  typia.assert(noFlagSearchResult);

  const combinedIds = noFlagSearchResult.data.map((c) => c.id);

  TestValidator.predicate(
    "search without isActive filter should be able to return both active and inactive categories",
    () =>
      combinedIds.includes(activeCategory.id) &&
      combinedIds.includes(inactiveCategory.id),
  );
}
