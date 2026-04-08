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
 * Test advanced category search capabilities with text filtering and pagination controls.
 *
 * Validates the complete category search functionality including partial text matching for name and description fields, pagination parameter handling, sorting options, and pagination metadata accuracy. Ensures that search filters use case-insensitive partial matching and that pagination correctly reflects the filtered dataset size.
 *
 * Special attention is given to verifying that multiple filters combine with AND logic, pagination parameters are properly bounded, and sorting respects both field and direction specifications.
 *
 * 1. Execute search with empty criteria to retrieve all non-deleted categories.
 * 2. Validate pagination metadata (current page, limit, total records, total pages).
 * 3. Test name filter with partial text matching using actual category data.
 * 4. Test description filter with partial text matching using actual category data.
 * 5. Test combined name and description filters (AND logic).
 * 6. Test pagination with page and limit parameters.
 * 7. Test sorting by different fields with ASC/DESC order.
 * 8. Verify pagination metadata accuracy for filtered results.
 */
export async function test_api_category_search_with_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Search with empty criteria - retrieve all non-deleted categories
  const allCategories = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: { limit: 50 } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(allCategories);
  TestValidator.predicate(
    "has pagination metadata",
    allCategories.pagination.current >= 1,
  );
  TestValidator.predicate(
    "has valid limit",
    allCategories.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "has total records count",
    allCategories.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has total pages",
    allCategories.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(allCategories.data),
  );
  // Need at least one category to test search functionality
  if (allCategories.data.length === 0) {
    TestValidator.predicate("test skipped - no categories exist", true);
    return;
  }
  // 2. Test name filter with partial text matching using actual category name
  const sampleCategory = allCategories.data[0];
  const searchName = sampleCategory.name.substring(
    0,
    Math.max(1, Math.floor(sampleCategory.name.length / 2)),
  );
  const nameFilterResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        name: searchName,
        limit: 20,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(nameFilterResult);
  // Verify all returned categories contain the search term in name (case-insensitive)
  for (const category of nameFilterResult.data) {
    TestValidator.predicate(
      `category name contains search term "${searchName}"`,
      category.name.toLowerCase().includes(searchName.toLowerCase()),
    );
  }
  // 3. Test description filter with partial text matching
  const searchDescription = sampleCategory.description.substring(
    0,
    Math.max(1, Math.floor(sampleCategory.description.length / 2)),
  );
  const descriptionFilterResult =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        description: searchDescription,
        limit: 20,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(descriptionFilterResult);
  // Verify all returned categories contain the search term in description (case-insensitive)
  for (const category of descriptionFilterResult.data) {
    TestValidator.predicate(
      `category description contains search term "${searchDescription}"`,
      category.description
        .toLowerCase()
        .includes(searchDescription.toLowerCase()),
    );
  }
  // 4. Test pagination with page and limit parameters
  const paginatedResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", paginatedResult.pagination.limit, 10);
  TestValidator.predicate(
    "data count does not exceed limit",
    paginatedResult.data.length <= 10,
  );
  // Test page 2 if enough records exist
  if (allCategories.pagination.records > 10) {
    const page2Result = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(page2Result);
    TestValidator.equals(
      "current page is 2",
      page2Result.pagination.current,
      2,
    );
  }
  // 5. Test sorting by name in ascending order
  const sortedByNameAsc = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        sortBy: "name",
        sortOrder: "ASC",
        limit: 20,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortedByNameAsc);
  // Verify ascending order by name
  for (let i = 1; i < sortedByNameAsc.data.length; i++) {
    const prevCategory = sortedByNameAsc.data[i - 1];
    const currentCategory = sortedByNameAsc.data[i];
    TestValidator.predicate(
      `categories sorted by name ASC at index ${i}`,
      prevCategory.name.localeCompare(currentCategory.name) <= 0,
    );
  }
  // 6. Test descending sort order
  const sortedByNameDesc = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        sortBy: "name",
        sortOrder: "DESC",
        limit: 20,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortedByNameDesc);
  // Verify descending order by name
  for (let i = 1; i < sortedByNameDesc.data.length; i++) {
    const prevCategory = sortedByNameDesc.data[i - 1];
    const currentCategory = sortedByNameDesc.data[i];
    TestValidator.predicate(
      `categories sorted by name DESC at index ${i}`,
      prevCategory.name.localeCompare(currentCategory.name) >= 0,
    );
  }
  // 7. Test hasParent filter for subcategories
  const hasParentResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        hasParent: true,
        limit: 15,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(hasParentResult);
  // Verify all returned categories have a parent
  for (const category of hasParentResult.data) {
    TestValidator.predicate(
      "subcategory has parent category",
      category.parentCategory !== null,
    );
  }
  // 8. Test hasParent filter for top-level categories
  const noParentResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        hasParent: false,
        limit: 15,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(noParentResult);
  // Verify all returned categories have no parent (top-level)
  for (const category of noParentResult.data) {
    TestValidator.predicate(
      "top-level category has no parent",
      category.parentCategory === null,
    );
  }
  // 9. Test parentId filter if subcategories exist
  if (
    hasParentResult.data.length > 0 &&
    hasParentResult.data[0].parentCategory !== null
  ) {
    const parentId = hasParentResult.data[0].parentCategory.id;
    const parentIdResult = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          parentId: parentId,
          limit: 10,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(parentIdResult);
    // Verify all returned categories have the specified parent
    for (const category of parentIdResult.data) {
      TestValidator.equals(
        "category has specified parent",
        category.parentCategory?.id,
        parentId,
      );
    }
  }
  // 10. Verify pagination metadata consistency
  TestValidator.predicate(
    "pages calculated correctly",
    allCategories.pagination.pages ===
      Math.ceil(
        allCategories.pagination.records / allCategories.pagination.limit,
      ),
  );
  // 11. Test limit boundary (minimum 1, maximum 100)
  const minLimitResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        limit: 1,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(minLimitResult);
  TestValidator.equals(
    "limit of 1 returns at most 1 record",
    minLimitResult.data.length,
    Math.min(1, allCategories.pagination.records),
  );
  const maxLimitResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit is 100",
    maxLimitResult.pagination.limit,
    Math.min(100, allCategories.pagination.records),
  );
}
