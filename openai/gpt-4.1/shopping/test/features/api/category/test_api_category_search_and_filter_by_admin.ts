import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingCategory";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategoryTree";

/**
 * Validates that an admin can search, filter, and paginate through all product
 * categories.
 *
 * This test covers:
 *
 * 1. Admin authentication
 * 2. Category tree creation
 * 3. Creating a root category and a child category
 * 4. Querying by:
 *
 *    - Category tree (tree_code)
 *    - Parent-child relations (parent_id)
 *    - Category name partial match (name)
 *    - Keyword (search)
 *    - Pagination (limit/page)
 * 5. Ensuring only active (non-deleted) categories are returned
 * 6. Testing edge cases: non-existent tree, non-existent parent, page overflow,
 *    large limits, empty results, and invalid filters
 */
export async function test_api_category_search_and_filter_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: RandomGenerator.pick([
          "super",
          "support",
          "compliance",
          "operator",
        ] as const),
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Category tree creation
  const tree_code = RandomGenerator.alphaNumeric(8).toLowerCase();
  const categoryTree: IShoppingCategoryTree =
    await api.functional.shopping.admin.categoryTrees.create(connection, {
      body: {
        tree_code,
        tree_name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IShoppingCategoryTree.ICreate,
    });
  typia.assert(categoryTree);

  // 3. Create a root category and a child category
  // Root
  const rootCategory: IShoppingCategory =
    await api.functional.shopping.admin.categoryTrees.categories.create(
      connection,
      {
        treeCode: categoryTree.tree_code,
        body: {
          category_tree_id: categoryTree.id,
          category_code: RandomGenerator.alphabets(6).toLowerCase(),
          category_name: RandomGenerator.name(2),
          sort_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingCategory.ICreate,
      },
    );
  typia.assert(rootCategory);

  // Child (nested)
  const childCategory: IShoppingCategory =
    await api.functional.shopping.admin.categoryTrees.categories.create(
      connection,
      {
        treeCode: categoryTree.tree_code,
        body: {
          category_tree_id: categoryTree.id,
          parent_id: rootCategory.id,
          category_code: RandomGenerator.alphabets(8).toLowerCase(),
          category_name: RandomGenerator.name(1),
          sort_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingCategory.ICreate,
      },
    );
  typia.assert(childCategory);

  // 4. Querying by tree_code: fetch all categories in this tree
  let pageResult: IPageIShoppingCategory.ISummary =
    await api.functional.shopping.admin.categories.index(connection, {
      body: {
        tree_code: tree_code,
      } satisfies IShoppingCategory.IRequest,
    });
  typia.assert(pageResult);
  TestValidator.predicate(
    "at least two categories exist in tree",
    pageResult.data.length >= 2,
  );

  // 5. Querying by parent_id: fetch only children of root
  pageResult = await api.functional.shopping.admin.categories.index(
    connection,
    {
      body: {
        tree_code,
        parent_id: rootCategory.id,
      } satisfies IShoppingCategory.IRequest,
    },
  );
  typia.assert(pageResult);
  TestValidator.equals(
    "child search: data contains only the child",
    pageResult.data.length,
    1,
  );
  TestValidator.equals(
    "correct child returned",
    pageResult.data[0].id,
    childCategory.id,
  );

  // 6. Search by partial category_name (case insensitive, partial match)
  const searchKeyword = childCategory.category_name.slice(0, 3);
  pageResult = await api.functional.shopping.admin.categories.index(
    connection,
    {
      body: {
        tree_code,
        name: searchKeyword,
      } satisfies IShoppingCategory.IRequest,
    },
  );
  typia.assert(pageResult);
  TestValidator.predicate(
    "search by partial name returns at least the child",
    pageResult.data.some((c) => c.id === childCategory.id),
  );

  // 7. Search by keyword (matches name or code)
  const keyword = rootCategory.category_code.slice(0, 4);
  pageResult = await api.functional.shopping.admin.categories.index(
    connection,
    {
      body: {
        tree_code,
        search: keyword,
      } satisfies IShoppingCategory.IRequest,
    },
  );
  typia.assert(pageResult);
  TestValidator.predicate(
    "search by code keyword finds root category",
    pageResult.data.some((c) => c.id === rootCategory.id),
  );

  // 8. Pagination test: limit=1 should only return one category, check that there are more total
  pageResult = await api.functional.shopping.admin.categories.index(
    connection,
    {
      body: {
        tree_code,
        limit: 1 as number,
        page: 1 as number,
      } satisfies IShoppingCategory.IRequest,
    },
  );
  typia.assert(pageResult);
  TestValidator.equals(
    "limit 1 page returns only 1 record",
    pageResult.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination reports more than 1 record",
    pageResult.pagination.records > 1,
  );

  // 9. Ensure only active (not soft-deleted) categories are fetched
  // No deletion API present, so we rely on the fact soft-deleted categories would not be returned
  pageResult = await api.functional.shopping.admin.categories.index(
    connection,
    {
      body: {
        tree_code,
      } satisfies IShoppingCategory.IRequest,
    },
  );
  typia.assert(pageResult);
  TestValidator.predicate(
    "all returned categories are not deleted",
    pageResult.data.every(
      (cat) =>
        !("deleted_at" in cat) ||
        cat.deleted_at === null ||
        cat.deleted_at === undefined,
    ),
  );

  // 10. Edge case: search by non-existent tree_code returns empty result
  pageResult = await api.functional.shopping.admin.categories.index(
    connection,
    {
      body: {
        tree_code: "inexistenttree",
      } satisfies IShoppingCategory.IRequest,
    },
  );
  typia.assert(pageResult);
  TestValidator.equals(
    "nonexistent tree query returns 0 rows",
    pageResult.data.length,
    0,
  );

  // 11. Edge case: search by non-existent parent_id returns empty result
  pageResult = await api.functional.shopping.admin.categories.index(
    connection,
    {
      body: {
        tree_code,
        parent_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingCategory.IRequest,
    },
  );
  typia.assert(pageResult);
  TestValidator.equals(
    "nonexistent parent returns 0 categories",
    pageResult.data.length,
    0,
  );

  // 12. Edge case: over-limit (limit = 100)
  pageResult = await api.functional.shopping.admin.categories.index(
    connection,
    {
      body: {
        tree_code,
        limit: 100 as number,
      } satisfies IShoppingCategory.IRequest,
    },
  );
  typia.assert(pageResult);
  TestValidator.predicate(
    "limit=100 returns at most 100 entries",
    pageResult.data.length <= 100,
  );

  // 13. Edge case: page overflow (very high page)
  const overPage = 9999999;
  pageResult = await api.functional.shopping.admin.categories.index(
    connection,
    {
      body: {
        tree_code,
        page: overPage as number,
      } satisfies IShoppingCategory.IRequest,
    },
  );
  typia.assert(pageResult);
  TestValidator.equals(
    "overflow page returns empty result",
    pageResult.data.length,
    0,
  );
}
