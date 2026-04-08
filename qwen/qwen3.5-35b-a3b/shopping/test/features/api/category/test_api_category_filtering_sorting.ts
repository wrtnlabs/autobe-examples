import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test name filter (partial match, case-insensitive)
  const nameFilterResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: { name: "elec" },
    },
  );
  typia.assert(nameFilterResult);
  // Validate response structure
  TestValidator.equals(
    "name filter response - pagination structure",
    nameFilterResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "name filter response - data is array",
    Array.isArray(nameFilterResult.data),
    true,
  );
  // 2. Test parent_id filter (subcategories)
  const parentFilterResult =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: { parent_id: null },
    });
  typia.assert(parentFilterResult);
  TestValidator.equals(
    "parent_id filter - returns parent null categories",
    parentFilterResult.data.every((c) => c.parent === null),
    true,
  );
  // 3. Test sorting by name ascending (default)
  const sortAscResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: { sort: "name", order: "asc" },
    },
  );
  typia.assert(sortAscResult);
  const namesAsc = sortAscResult.data.map((c) => c.name);
  // Verify names are sorted ascending
  const isSortedAsc = namesAsc.every((name, i) => {
    if (i === 0) return true;
    return namesAsc[i - 1] <= name;
  });
  TestValidator.equals(
    "sort name asc - categories ordered alphabetically ascending",
    isSortedAsc,
    true,
  );
  // 4. Test sorting by name descending
  const sortDescResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: { sort: "name", order: "desc" },
    },
  );
  typia.assert(sortDescResult);
  const namesDesc = sortDescResult.data.map((c) => c.name);
  // Verify names are sorted descending
  const isSortedDesc = namesDesc.every((name, i) => {
    if (i === 0) return true;
    return namesDesc[i - 1] >= name;
  });
  TestValidator.equals(
    "sort name desc - categories ordered alphabetically descending",
    isSortedDesc,
    true,
  );
  // 5. Test sorting by sort_order (priority)
  const sortOrderResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: { sort: "sort_order" },
    },
  );
  typia.assert(sortOrderResult);
  const sortOrders = sortOrderResult.data.map((c) => c.sort_order);
  // Filter out null values for validation
  const nonNullOrders = sortOrders.filter((s): s is number => s !== null);
  const isSortOrderSorted = nonNullOrders.every((order, i) => {
    if (i === 0) return true;
    return nonNullOrders[i - 1] <= order;
  });
  TestValidator.equals(
    "sort sort_order - categories ordered by priority ascending",
    isSortOrderSorted,
    true,
  );
  // 6. Test pagination with custom limit
  const paginationResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: { limit: 5, page: 1 },
    },
  );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination - limit=5 returns max 5 items",
    paginationResult.data.length <= 5,
    true,
  );
  TestValidator.equals(
    "pagination - limit parameter respected",
    paginationResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination - current page is 1",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination - pages calculation",
    paginationResult.pagination.pages > 0 ||
      paginationResult.pagination.records === 0,
    true,
  );
  // 7. Test pagination with page=2
  const paginationPage2Result =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: { limit: 3, page: 2 },
    });
  typia.assert(paginationPage2Result);
  TestValidator.equals(
    "pagination page 2 - current page",
    paginationPage2Result.pagination.current,
    2,
  );
  // 8. Test combined filters: name + parent_id
  const combinedFilterResult =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: { name: "test", parent_id: null },
    });
  typia.assert(combinedFilterResult);
  // Verify all returned categories match both filters
  const allMatchFilters = combinedFilterResult.data.every((category) => {
    const nameMatches = category.name
      .toLowerCase()
      .includes("test".toLowerCase());
    const parentMatches = category.parent === null;
    return nameMatches && parentMatches;
  });
  TestValidator.equals(
    "combined filter - all results match both filters",
    allMatchFilters,
    true,
  );
  // 9. Test sorting with custom pagination
  const sortWithPaginationResult =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: { sort: "name", order: "desc", page: 1, limit: 10 },
    });
  typia.assert(sortWithPaginationResult);
  TestValidator.equals(
    "sort+pagination - current page",
    sortWithPaginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "sort+pagination - limit respected",
    sortWithPaginationResult.pagination.limit,
    10,
  );
  // Verify items are sorted on this page
  const pageNames = sortWithPaginationResult.data.map((c) => c.name);
  const isPageSorted = pageNames.every((name, i) => {
    if (i === 0) return true;
    return pageNames[i - 1] >= name;
  });
  TestValidator.equals(
    "sort+pagination - page items sorted correctly",
    isPageSorted,
    true,
  );
  // 10. Test empty results when no match
  const noMatchResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: { name: "NonExistentCategoryXYZ123" },
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match - empty data array",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no match - zero records",
    noMatchResult.pagination.records,
    0,
  );
  // 11. Test with invalid sort field (should use default)
  const invalidSortResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: { sort: "invalid_field" as any },
    },
  );
  typia.assert(invalidSortResult);
  TestValidator.predicate(
    "invalid sort - response still valid",
    Array.isArray(invalidSortResult.data),
  );
}
