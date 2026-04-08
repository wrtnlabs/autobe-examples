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
 * Test subcategory filtering by parent category ID.
 *
 * Validates the category listing endpoint's ability to filter subcategories by parent category ID. Ensures that when a parent_id filter is applied, only direct subcategories of that parent are returned, with correct parent references and pagination metadata.
 *
 * The test covers both positive scenarios (filtering existing parent categories) and edge cases (filtering with non-existent parent IDs, handling empty result sets).
 *
 * 1. Retrieve all categories to identify existing parent categories.
 * 2. Find a top-level category (parent=null) to use as filter target.
 * 3. Call endpoint with parent_id filter set to the parent category's ID.
 * 4. Verify all returned categories are subcategories of the specified parent.
 * 5. Verify parent field correctly references the parent category.
 * 6. Test edge case: filter with non-existent parent_id returns empty data array.
 * 7. Validate pagination metadata reflects filtered result count accurately.
 */
export async function test_api_category_subcategory_filter_by_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Retrieve all categories to find existing parent categories
  const allCategories = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(allCategories);
  // 2. Find a top-level category (parent=null) to use as parent_id filter
  const topLevelCategory = allCategories.data.find(
    (category) => category.parent === null,
  );
  // 3. Test filtering by parent_id if a top-level category exists
  if (topLevelCategory) {
    const filteredResult = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          parent_id: topLevelCategory.id,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(filteredResult);
    // 4. Verify all returned categories are subcategories of the specified parent
    TestValidator.predicate(
      "all results are subcategories",
      filteredResult.data.every((category) => category.parent !== null),
    );
    // 5. Verify parent field correctly references the parent category
    filteredResult.data.forEach((category) => {
      TestValidator.equals(
        "parent id matches filter",
        category.parent?.id,
        topLevelCategory.id,
      );
      TestValidator.equals(
        "parent name matches",
        category.parent?.name,
        topLevelCategory.name,
      );
    });
    // 6. Verify pagination metadata reflects filtered result count
    TestValidator.equals(
      "pagination current page",
      filteredResult.pagination.current,
      1,
    );
    TestValidator.predicate(
      "pagination records match data length",
      filteredResult.pagination.records >= filteredResult.data.length,
    );
    TestValidator.predicate(
      "pagination pages calculated correctly",
      filteredResult.pagination.pages >= 1,
    );
  }
  // 7. Test edge case: filter with non-existent parent_id returns empty results
  const nonExistentParentId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        parent_id: nonExistentParentId,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(emptyResult);
  // 8. Verify empty result set for non-existent parent
  TestValidator.equals(
    "empty data for non-existent parent",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records zero",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages zero",
    emptyResult.pagination.pages,
    0,
  );
}
