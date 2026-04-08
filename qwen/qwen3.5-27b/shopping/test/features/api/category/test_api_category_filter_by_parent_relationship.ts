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
 * Test filtering categories by their parent-child relationship to support hierarchical browsing.
 *
 * Validates the category filtering functionality that enables hierarchical navigation through parent and subcategory relationships. Tests that categories can be filtered by whether they have a parent, by specific parent ID, and that the hierarchical relationships are correctly represented in responses.
 *
 * The test verifies that the parent-child relationship filtering works correctly for both top-level categories and subcategories, ensuring proper data structure and pagination support.
 *
 * 1. Fetch all categories to identify top-level and subcategory examples
 * 2. Filter by hasParent=true to verify only subcategories are returned
 * 3. Filter by hasParent=false to verify only top-level categories are returned
 * 4. Filter by parentId to verify only direct children of a specific parent are returned
 * 5. Filter by invalid parentId to verify empty results are returned
 * 6. Validate that parentCategory field correctly represents hierarchical relationships
 * 7. Verify pagination metadata is accurate for filtered results
 */
export async function test_api_category_filter_by_parent_relationship(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch all categories to identify examples
  const allCategories = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(allCategories);
  // Separate top-level and subcategories for testing
  const topLevelCategories = allCategories.data.filter(
    (cat) => cat.parentCategory === null,
  );
  const subcategories = allCategories.data.filter(
    (cat) => cat.parentCategory !== null,
  );
  // 2. Test hasParent=true filter (should return only subcategories)
  const hasParentResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        hasParent: true,
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(hasParentResult);
  TestValidator.equals(
    "hasParent=true returns only subcategories",
    hasParentResult.data.length,
    subcategories.length,
  );
  TestValidator.predicate(
    "all results have parent",
    hasParentResult.data.every((cat) => cat.parentCategory !== null),
  );
  // 3. Test hasParent=false filter (should return only top-level categories)
  const hasParentFalseResult =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        hasParent: false,
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(hasParentFalseResult);
  TestValidator.equals(
    "hasParent=false returns only top-level categories",
    hasParentFalseResult.data.length,
    topLevelCategories.length,
  );
  TestValidator.predicate(
    "all results have no parent",
    hasParentFalseResult.data.every((cat) => cat.parentCategory === null),
  );
  // 4. Test parentId filter with valid parent
  if (topLevelCategories.length > 0) {
    const parentCategory = topLevelCategories[0];
    const parentIdResult = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          parentId: parentCategory.id,
          limit: 100,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(parentIdResult);
    // All results should be direct children of the specified parent
    TestValidator.predicate(
      "all results have correct parent",
      parentIdResult.data.every(
        (cat) => cat.parentCategory?.id === parentCategory.id,
      ),
    );
    // Verify parentCategory field is correctly populated
    if (parentIdResult.data.length > 0) {
      TestValidator.equals(
        "parentCategory name matches",
        parentIdResult.data[0].parentCategory?.name,
        parentCategory.name,
      );
    }
  }
  // 5. Test parentId filter with invalid parent (non-existent UUID)
  const invalidParentIdResult =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        parentId: "00000000-0000-0000-0000-000000000000",
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(invalidParentIdResult);
  TestValidator.equals(
    "invalid parentId returns empty results",
    invalidParentIdResult.data.length,
    0,
  );
  TestValidator.equals(
    "invalid parentId pagination records is 0",
    invalidParentIdResult.pagination.records,
    0,
  );
  // 6. Test pagination with hasParent filter
  const paginatedResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        hasParent: true,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data count matches limit or records",
    paginatedResult.data.length <= paginatedResult.pagination.limit,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    paginatedResult.pagination.pages ===
      Math.ceil(
        paginatedResult.pagination.records / paginatedResult.pagination.limit,
      ),
  );
  // 7. Test sorting with hasParent filter
  const sortedAscResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        hasParent: false,
        sortBy: "name",
        sortOrder: "ASC",
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortedAscResult);
  const sortedDescResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        hasParent: false,
        sortBy: "name",
        sortOrder: "DESC",
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortedDescResult);
  // Verify sorting order
  if (sortedAscResult.data.length > 1) {
    const namesAsc = sortedAscResult.data.map((cat) => cat.name);
    const namesDesc = sortedDescResult.data.map((cat) => cat.name);
    const namesAscReversed = [...namesAsc].reverse();
    TestValidator.equals(
      "DESC order is reverse of ASC order",
      namesDesc,
      namesAscReversed,
    );
  }
  // 8. Validate response structure consistency
  if (hasParentResult.data.length > 0) {
    const sampleCategory = hasParentResult.data[0];
    // Verify all required fields are present
    TestValidator.predicate(
      "category has valid UUID",
      /^[0-9a-f-]{36}$/i.test(sampleCategory.id),
    );
    TestValidator.predicate(
      "category has name",
      sampleCategory.name.length > 0,
    );
    TestValidator.predicate(
      "category has description",
      sampleCategory.description.length >= 0,
    );
    TestValidator.predicate(
      "category has created_at",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        sampleCategory.created_at,
      ),
    );
    TestValidator.predicate(
      "category has updated_at",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        sampleCategory.updated_at,
      ),
    );
    TestValidator.predicate(
      "category is not deleted",
      sampleCategory.deleted_at === null,
    );
  }
}
