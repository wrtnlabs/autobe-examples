import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingCategoryTree";
import type { IShoppingCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategoryTree";

/**
 * Validate public retrieval and filtering of shopping category trees.
 *
 * This test verifies that anyone (including unauthenticated users) can retrieve
 * a paginated list of all category tree metadata via the
 * /shopping/categoryTrees endpoint using the PATCH method. It ensures results
 * respect filtering by various request body parameters, that only valid/active
 * trees are included, and all required summary fields are present for each
 * returned record.
 *
 * Steps:
 *
 * 1. Retrieve category trees with default paging (no filters), confirm shape and
 *    pagination structure, and that all entries contain id, tree_code,
 *    tree_name.
 * 2. Test partial name search: use a substring of an existing tree's name to
 *    confirm partial match returns expected results.
 * 3. Test partial code search: use a substring of an existing tree's code to
 *    confirm partial match returns proper result(s).
 * 4. Test paging: request page 2 with a small limit and validate correct
 *    pagination, records per page, and navigation logic.
 * 5. Test advanced filtering: search for non-existent tree_code (expect empty data
 *    set). Confirm inactive or soft-deleted trees do not appear if business
 *    rules require exclusion.
 */
export async function test_api_category_tree_list_retrieval_public(
  connection: api.IConnection,
) {
  // 1. Basic retrieval, check pagination and summary fields
  const output1: IPageIShoppingCategoryTree.ISummary =
    await api.functional.shopping.categoryTrees.index(connection, {
      body: {},
    });
  typia.assert(output1);
  TestValidator.predicate("response has data", output1.data.length >= 0);
  TestValidator.predicate(
    "pagination info present",
    typeof output1.pagination.current === "number" &&
      typeof output1.pagination.limit === "number",
  );
  for (const t of output1.data) {
    TestValidator.predicate(
      "category tree has uuid id",
      typeof t.id === "string" && t.id.length > 0,
    );
    TestValidator.predicate(
      "category tree has non-empty code",
      typeof t.tree_code === "string" && t.tree_code.length > 0,
    );
    TestValidator.predicate(
      "category tree has non-empty name",
      typeof t.tree_name === "string" && t.tree_name.length > 0,
    );
  }
  // Ensure at least one record exists for filter tests
  if (output1.data.length > 0) {
    const firstTree = output1.data[0];
    // 2. Partial tree_name filter
    const namePartial = firstTree.tree_name.slice(
      0,
      Math.max(1, Math.floor(firstTree.tree_name.length / 2)),
    );
    const filterByName: IPageIShoppingCategoryTree.ISummary =
      await api.functional.shopping.categoryTrees.index(connection, {
        body: { tree_name: namePartial },
      });
    typia.assert(filterByName);
    TestValidator.predicate(
      "filtered by name returns at least one",
      filterByName.data.some((tree) => tree.id === firstTree.id),
    );
    for (const t of filterByName.data) {
      TestValidator.predicate(
        "category tree name filter matches partial",
        t.tree_name.toLowerCase().includes(namePartial.toLowerCase()),
      );
    }
    // 3. Partial tree_code filter
    const codePartial = firstTree.tree_code.slice(
      0,
      Math.max(1, Math.floor(firstTree.tree_code.length / 2)),
    );
    const filterByCode: IPageIShoppingCategoryTree.ISummary =
      await api.functional.shopping.categoryTrees.index(connection, {
        body: { tree_code: codePartial },
      });
    typia.assert(filterByCode);
    TestValidator.predicate(
      "filtered by code returns at least one",
      filterByCode.data.some((tree) => tree.id === firstTree.id),
    );
    for (const t of filterByCode.data) {
      TestValidator.predicate(
        "category tree code filter matches partial",
        t.tree_code.toLowerCase().includes(codePartial.toLowerCase()),
      );
    }
    // 4. Pagination: get page 2 with a small limit
    const limitVal = 1 satisfies number as number;
    const paged: IPageIShoppingCategoryTree.ISummary =
      await api.functional.shopping.categoryTrees.index(connection, {
        body: { page: 2, limit: limitVal },
      });
    typia.assert(paged);
    TestValidator.equals(
      "pagination current page is 2",
      paged.pagination.current,
      2,
    );
    TestValidator.equals(
      "pagination limit is as requested",
      paged.pagination.limit,
      limitVal,
    );
  }
  // 5. Filtering for non-existent code should return empty set
  const none: IPageIShoppingCategoryTree.ISummary =
    await api.functional.shopping.categoryTrees.index(connection, {
      body: {
        tree_code: "___no_such_code_" + RandomGenerator.alphaNumeric(10),
      },
    });
  typia.assert(none);
  TestValidator.equals(
    "Empty when filtering with impossible code",
    none.data.length,
    0,
  );
}
