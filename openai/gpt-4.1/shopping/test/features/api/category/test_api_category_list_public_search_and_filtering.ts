import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test the public search and listing of shopping mall categories with various
 * filter, sort, and pagination options. Validate retrieval of active, inactive,
 * and deprecated categories, filtering by name and parent_id, and sorting by
 * sort_order and status. Ensure correct pagination metadata is returned and
 * that the endpoint is accessible without authentication for all users,
 * supporting hierarchical and flat category structures.
 */
export async function test_api_category_list_public_search_and_filtering(
  connection: api.IConnection,
) {
  // 1. List all categories with default pagination (no filters)
  const allCategories = await api.functional.shoppingMall.mallCategories.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(allCategories);
  TestValidator.predicate(
    "default results return at least 1 category",
    allCategories.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination metadata is present and well-formed",
    () =>
      typeof allCategories.pagination.current === "number" &&
      typeof allCategories.pagination.limit === "number" &&
      typeof allCategories.pagination.records === "number" &&
      typeof allCategories.pagination.pages === "number",
  );

  // 2. Filter by status: active
  const activeCategories =
    await api.functional.shoppingMall.mallCategories.index(connection, {
      body: { status: "active" },
    });
  typia.assert(activeCategories);
  TestValidator.predicate(
    "all results are active categories",
    activeCategories.data.every((c) => c.status === "active"),
  );

  // 3. Filter by status: inactive
  const inactiveCategories =
    await api.functional.shoppingMall.mallCategories.index(connection, {
      body: { status: "inactive" },
    });
  typia.assert(inactiveCategories);
  TestValidator.predicate(
    "all results are inactive categories",
    inactiveCategories.data.every((c) => c.status === "inactive"),
  );

  // 4. Filter by status: deprecated
  const deprecatedCategories =
    await api.functional.shoppingMall.mallCategories.index(connection, {
      body: { status: "deprecated" },
    });
  typia.assert(deprecatedCategories);
  TestValidator.predicate(
    "all results are deprecated categories",
    deprecatedCategories.data.every((c) => c.status === "deprecated"),
  );

  // 5. Filter by partial name (if there are any categories)
  if (allCategories.data.length > 0) {
    const sampleCategory = RandomGenerator.pick(allCategories.data);
    const fragment = RandomGenerator.substring(sampleCategory.name);
    const filteredByName =
      await api.functional.shoppingMall.mallCategories.index(connection, {
        body: { name: fragment },
      });
    typia.assert(filteredByName);
    TestValidator.predicate(
      "all returned categories' names include the search fragment",
      filteredByName.data.every((cat) => cat.name.includes(fragment)),
    );
  }

  // 6. Filter by parent_id (if there are categories with parent_id)
  const withParent = allCategories.data.find(
    (cat) => cat.parent_id !== null && cat.parent_id !== undefined,
  );
  if (withParent) {
    const filteredByParent =
      await api.functional.shoppingMall.mallCategories.index(connection, {
        body: { parent_id: withParent.parent_id! },
      });
    typia.assert(filteredByParent);
    TestValidator.predicate(
      "all returned categories have the specified parent_id",
      filteredByParent.data.every(
        (cat) => cat.parent_id === withParent.parent_id,
      ),
    );
  }

  // 7. Filter root categories (parent_id: null)
  const filteredByRoot = await api.functional.shoppingMall.mallCategories.index(
    connection,
    {
      body: { parent_id: null },
    },
  );
  typia.assert(filteredByRoot);
  TestValidator.predicate(
    "all returned categories are root categories (parent_id === null)",
    filteredByRoot.data.every(
      (cat) => cat.parent_id === null || cat.parent_id === undefined,
    ),
  );

  // 8. Test sort by sort_order ascending
  const sortedAsc = await api.functional.shoppingMall.mallCategories.index(
    connection,
    {
      body: { sort_field: "sort_order", sort_order: "asc" },
    },
  );
  typia.assert(sortedAsc);
  const ascList = sortedAsc.data.map((cat) => cat.sort_order);
  TestValidator.predicate(
    "sort_order ascending is correct",
    ascList.every((v, i, arr) => i === 0 || arr[i - 1] <= v),
  );

  // 9. Test sort by sort_order descending
  const sortedDesc = await api.functional.shoppingMall.mallCategories.index(
    connection,
    {
      body: { sort_field: "sort_order", sort_order: "desc" },
    },
  );
  typia.assert(sortedDesc);
  const descList = sortedDesc.data.map((cat) => cat.sort_order);
  TestValidator.predicate(
    "sort_order descending is correct",
    descList.every((v, i, arr) => i === 0 || arr[i - 1] >= v),
  );

  // 10. Pagination: page 2, limit 1
  const paged = await api.functional.shoppingMall.mallCategories.index(
    connection,
    {
      body: { page: 2, limit: 1 },
    },
  );
  typia.assert(paged);
  TestValidator.equals("requested limit applied", paged.pagination.limit, 1);
  TestValidator.equals("requested page applied", paged.pagination.current, 2);
  TestValidator.predicate(
    "paged data has at most 1 record",
    paged.data.length <= 1,
  );

  // 11. Accessible without authentication: endpoint works for any user (implicit, no token set for connection)
  // No explicit authentication calls are made in this test.
}
