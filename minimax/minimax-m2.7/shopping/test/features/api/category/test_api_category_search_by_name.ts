import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { ArrayUtil, TestValidator } from "@nestia/e2e";
import typia from "typia";

export async function test_api_category_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Get all categories to find valid category names for testing
  const allCategories = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        limit: 100,
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(allCategories);
  // Step 2: Test partial name matching search
  const searchTerm =
    allCategories.data.length > 0
      ? allCategories.data[0].name.substring(0, 3)
      : "test";
  const searchResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        search: searchTerm,
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search results contain partial match",
    () =>
      searchResult.data.length === 0 ||
      searchResult.data.some((cat) =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );
  // Step 3: Test search with parentId filter (combined filters)
  if (allCategories.data.length > 0 && allCategories.data[0].parent) {
    const parentId = allCategories.data[0].parent.id;
    const searchWithParent =
      await api.functional.ecommerceMall.categories.index(connection, {
        body: {
          search: searchTerm,
          parentId: parentId,
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallCategory.IRequest,
      });
    typia.assert(searchWithParent);
    TestValidator.predicate(
      "combined search and parent filter works",
      () =>
        searchWithParent.data.length === 0 ||
        searchWithParent.data.every((cat) => cat.parent?.id === parentId),
    );
  }
  // Step 4: Test search with pagination - verify limit is respected
  const paginatedSearch = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        search: searchTerm,
        limit: 2,
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "pagination limit is respected",
    paginatedSearch.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination object exists",
    paginatedSearch.pagination !== undefined,
  );
  // Step 5: Test includeDeleted flag
  const includeDeletedSearch =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        search: searchTerm,
        includeDeleted: true,
        limit: 100,
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(includeDeletedSearch);
  TestValidator.predicate(
    "includeDeleted returns valid response",
    includeDeletedSearch.data !== undefined,
  );
  // Step 6: Test empty search results
  const nonExistentSearch = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        search: "xyznonexistentcategory12345",
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(nonExistentSearch);
  TestValidator.equals(
    "empty search returns empty data array",
    nonExistentSearch.data.length,
    0,
  );
  TestValidator.predicate(
    "empty search has valid pagination",
    nonExistentSearch.pagination !== undefined,
  );
  // Step 7: Test case-insensitive matching
  const upperCaseSearch = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        search: searchTerm.toUpperCase(),
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(upperCaseSearch);
  const lowerCaseSearch = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        search: searchTerm.toLowerCase(),
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(lowerCaseSearch);
  TestValidator.equals(
    "case-insensitive search returns same count",
    upperCaseSearch.data.length,
    lowerCaseSearch.data.length,
  );
  // Step 8: Test pagination with page 2
  const secondPageSearch = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        search: searchTerm,
        limit: 2,
        page: 2,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(secondPageSearch);
  TestValidator.predicate(
    "second page returns valid response structure",
    secondPageSearch.data !== undefined && secondPageSearch.pagination !== undefined,
  );
}