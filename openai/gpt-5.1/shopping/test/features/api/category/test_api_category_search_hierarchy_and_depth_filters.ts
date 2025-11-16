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
 * Validate that category search respects hierarchical parentCategoryCode and
 * depth filters.
 *
 * Business flow:
 *
 * 1. Join as a platform admin.
 * 2. Create a category tree.
 * 3. Create categories forming a small hierarchy: A (root), A1, A2 (children of
 *    A), A2a (child of A2).
 * 4. Search categories in that tree without filters to capture all active
 *    categories and verify baseline structure.
 * 5. Search with parentCategoryCode = A.code (and a broad depth window) and verify
 *    only A1 and A2 appear.
 * 6. Search with parentCategoryCode = A2.code (and a broad depth window) and
 *    verify only A2a appears.
 * 7. Assert that result sets contain only expected nodes and that all results
 *    belong to the created tree.
 */
export async function test_api_category_search_hierarchy_and_depth_filters(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (auth + token handled by SDK)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree
  const treeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: treeBody },
    );
  typia.assert(tree);

  // 3. Create category hierarchy within that tree.
  // Root A
  const categoryAInput = {
    code: `A-${RandomGenerator.alphaNumeric(6)}`,
    name: "Category A",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 1,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;
  const categoryA: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: categoryAInput,
      },
    );
  typia.assert(categoryA);

  // Child A1 under A
  const categoryA1Input = {
    code: `A1-${RandomGenerator.alphaNumeric(6)}`,
    name: "Category A1",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 2,
    isActive: true,
    parentCategoryCode: categoryA.code,
  } satisfies IShoppingMallCategory.ICreate;
  const categoryA1: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: categoryA1Input,
      },
    );
  typia.assert(categoryA1);

  // Child A2 under A
  const categoryA2Input = {
    code: `A2-${RandomGenerator.alphaNumeric(6)}`,
    name: "Category A2",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 3,
    isActive: true,
    parentCategoryCode: categoryA.code,
  } satisfies IShoppingMallCategory.ICreate;
  const categoryA2: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: categoryA2Input,
      },
    );
  typia.assert(categoryA2);

  // Grandchild A2a under A2
  const categoryA2aInput = {
    code: `A2a-${RandomGenerator.alphaNumeric(6)}`,
    name: "Category A2a",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 4,
    isActive: true,
    parentCategoryCode: categoryA2.code,
  } satisfies IShoppingMallCategory.ICreate;
  const categoryA2a: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: categoryA2aInput,
      },
    );
  typia.assert(categoryA2a);

  // 4. Baseline search: all active categories in this tree
  const baselineRequest = {
    treeCode: tree.code,
    isActive: true,
  } satisfies IShoppingMallCategory.IRequest;

  const baselinePage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.search.categories.index(connection, {
      body: baselineRequest,
    });
  typia.assert(baselinePage);

  TestValidator.predicate(
    "baseline search must include at least the created categories",
    baselinePage.data.length >= 4,
  );

  // Find our specific categories by code in the baseline results
  const findByCode = (code: string) =>
    baselinePage.data.find((c) => c.code === code);

  const summaryA = findByCode(categoryA.code);
  const summaryA1 = findByCode(categoryA1.code);
  const summaryA2 = findByCode(categoryA2.code);
  const summaryA2a = findByCode(categoryA2a.code);

  TestValidator.predicate(
    "summaryA should be found in baseline results",
    !!summaryA,
  );
  TestValidator.predicate(
    "summaryA1 should be found in baseline results",
    !!summaryA1,
  );
  TestValidator.predicate(
    "summaryA2 should be found in baseline results",
    !!summaryA2,
  );
  TestValidator.predicate(
    "summaryA2a should be found in baseline results",
    !!summaryA2a,
  );

  // All baseline results should belong to our created tree
  for (const item of baselinePage.data) {
    TestValidator.equals(
      "each baseline item should belong to the created tree",
      item.categoryTree.code,
      tree.code,
    );
  }

  // 5. Search for direct children of A using parentCategoryCode and a broad depth window
  const childrenOfARequest = {
    treeCode: tree.code,
    parentCategoryCode: categoryA.code,
    isActive: true,
    minDepth: 0,
    maxDepth: 10,
  } satisfies IShoppingMallCategory.IRequest;

  const childrenOfAPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.search.categories.index(connection, {
      body: childrenOfARequest,
    });
  typia.assert(childrenOfAPage);

  TestValidator.predicate(
    "children search for A should return at least one category",
    childrenOfAPage.data.length > 0,
  );

  const childrenCodes = childrenOfAPage.data.map((c) => c.code);

  TestValidator.predicate(
    "children search should include A1",
    childrenCodes.includes(categoryA1.code),
  );
  TestValidator.predicate(
    "children search should include A2",
    childrenCodes.includes(categoryA2.code),
  );
  TestValidator.predicate(
    "children search should NOT include A (the parent)",
    !childrenCodes.includes(categoryA.code),
  );
  TestValidator.predicate(
    "children search should NOT include A2a (grandchild)",
    !childrenCodes.includes(categoryA2a.code),
  );

  // 6. Search for descendants of A2 (should include only A2a in this test hierarchy)
  const descendantsOfA2Request = {
    treeCode: tree.code,
    parentCategoryCode: categoryA2.code,
    isActive: true,
    minDepth: 0,
    maxDepth: 10,
  } satisfies IShoppingMallCategory.IRequest;

  const descendantsOfA2Page: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.search.categories.index(connection, {
      body: descendantsOfA2Request,
    });
  typia.assert(descendantsOfA2Page);

  TestValidator.predicate(
    "descendants search for A2 should return at least one category",
    descendantsOfA2Page.data.length > 0,
  );

  const descendantsCodes = descendantsOfA2Page.data.map((c) => c.code);

  TestValidator.predicate(
    "descendants search should include A2a",
    descendantsCodes.includes(categoryA2a.code),
  );
  TestValidator.predicate(
    "descendants search should NOT include A2 itself",
    !descendantsCodes.includes(categoryA2.code),
  );
  TestValidator.predicate(
    "descendants search should NOT include A or A1",
    !descendantsCodes.includes(categoryA.code) &&
      !descendantsCodes.includes(categoryA1.code),
  );
}
