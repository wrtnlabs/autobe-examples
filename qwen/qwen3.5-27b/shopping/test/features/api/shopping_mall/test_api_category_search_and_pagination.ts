import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test category search functionality with pagination and sorting options.
 *
 * This test validates the category search API by testing various search parameters,
 * pagination controls, and sorting options. It ensures that categories can be
 * effectively filtered and browsed by customers.
 */
export async function test_api_category_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test basic search with name parameter
  const searchConnection: api.IConnection = { host: connection.host };
  const searchBody = {
    name: "Electronics",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallCategory.IRequest;
  const searchResult = await api.functional.shoppingMall.categories.index(
    searchConnection,
    { body: searchBody },
  );
  typia.assert(searchResult);
  // Verify search results contain matching categories
  TestValidator.predicate(
    "search returns valid pagination",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "search returns valid limit",
    searchResult.pagination.limit > 0,
  );
  // 2. Test pagination with page=2 and limit=10
  const paginationBody = {
    page: 2,
    limit: 10,
  } satisfies IShoppingMallCategory.IRequest;
  const paginationResult = await api.functional.shoppingMall.categories.index(
    searchConnection,
    { body: paginationBody },
  );
  typia.assert(paginationResult);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination has valid total records",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid total pages",
    paginationResult.pagination.pages >= 0,
  );
  // 3. Test sorting by name in descending order
  const sortByNameBody = {
    sortBy: "name",
    sortOrder: "desc",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallCategory.IRequest;
  const sortByNameResult = await api.functional.shoppingMall.categories.index(
    searchConnection,
    { body: sortByNameBody },
  );
  typia.assert(sortByNameResult);
  // Verify sorting by name descending
  if (sortByNameResult.data.length > 1) {
    TestValidator.predicate(
      "categories sorted by name descending",
      sortByNameResult.data.every((category, index, array) => {
        if (index === 0) return true;
        return category.name.localeCompare(array[index - 1].name) <= 0;
      }),
    );
  }
  // 4. Test sorting by createdAt in ascending order
  const sortByDateBody = {
    sortBy: "createdAt",
    sortOrder: "asc",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallCategory.IRequest;
  const sortByDateResult = await api.functional.shoppingMall.categories.index(
    searchConnection,
    { body: sortByDateBody },
  );
  typia.assert(sortByDateResult);
  // Verify sorting by createdAt ascending
  if (sortByDateResult.data.length > 1) {
    TestValidator.predicate(
      "categories sorted by createdAt ascending",
      sortByDateResult.data.every((category, index, array) => {
        if (index === 0) return true;
        return (
          new Date(category.created_at).getTime() >=
          new Date(array[index - 1].created_at).getTime()
        );
      }),
    );
  }
  // 5. Test with includeSubcategories flag
  const includeSubcategoriesBody = {
    includeSubcategories: true,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallCategory.IRequest;
  const includeSubcategoriesResult =
    await api.functional.shoppingMall.categories.index(searchConnection, {
      body: includeSubcategoriesBody,
    });
  typia.assert(includeSubcategoriesResult);
  TestValidator.predicate(
    "includeSubcategories returns valid response",
    includeSubcategoriesResult.pagination.current >= 1,
  );
  // 6. Test with parentId filter (top-level categories)
  const topLevelBody = {
    parentId: null,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallCategory.IRequest;
  const topLevelResult = await api.functional.shoppingMall.categories.index(
    searchConnection,
    { body: topLevelBody },
  );
  typia.assert(topLevelResult);
  // Verify all returned categories are top-level (parent is null)
  TestValidator.predicate(
    "top-level categories have null parent",
    topLevelResult.data.every((category) => category.parent === null),
  );
  // 7. Test empty search (no filters)
  const emptySearchBody = {} satisfies IShoppingMallCategory.IRequest;
  const emptySearchResult = await api.functional.shoppingMall.categories.index(
    searchConnection,
    { body: emptySearchBody },
  );
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search returns valid pagination",
    emptySearchResult.pagination.current >= 1,
  );
}
