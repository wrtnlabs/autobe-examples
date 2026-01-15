import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
export async function test_api_category_hierarchical_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Since no createCategory function exists, we must rely on existing categories
  // Fetch all categories to work with pre-loaded data
  const allCategoriesResponse =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {} satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(allCategoriesResponse);
  // Find a category that has children (a parent category)
  // This creates a mapping of parent_id to child count
  const parentChildCount = new Map<string, number>();
  const parentCategoryCandidates: IShoppingMallCategory.ISummary[] = [];
  for (const category of allCategoriesResponse.data) {
    if (category.parent_id) {
      const parentCount = parentChildCount.get(category.parent_id) || 0;
      parentChildCount.set(category.parent_id, parentCount + 1);
    }
  }
  // Find the first parent category that has at least one child
  const parentWithChildren = allCategoriesResponse.data.find(
    (category) =>
      parentChildCount.has(category.id) &&
      parentChildCount.get(category.id)! > 0,
  );
  // Validate that we found a parent category with children
  typia.assert(parentWithChildren !== undefined);
  const parentCategoryId = parentWithChildren!.id;
  // Test hierarchical filtering using parent_id
  const filteredResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        parent_id: parentCategoryId,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(filteredResult);
  // Get the expected direct children of the parent
  const expectedDirectChildren = allCategoriesResponse.data.filter(
    (category) => category.parent_id === parentCategoryId,
  );
  // Validate the filtering results
  TestValidator.equals(
    "pagination records should match direct children count",
    filteredResult.pagination.records,
    expectedDirectChildren.length,
  );
  TestValidator.equals(
    "returned categories count should match direct children count",
    filteredResult.data.length,
    expectedDirectChildren.length,
  );
  // For each returned category, verify it's a direct child and has correct properties
  for (const returnedCategory of filteredResult.data) {
    // Find the corresponding expected category
    const expectedChild = expectedDirectChildren.find(
      (c) => c.id === returnedCategory.id,
    );
    // Ensure the returned category is actually a direct child
    TestValidator.predicate(
      `returned category ${returnedCategory.id} is a direct child of ${parentCategoryId}`,
      () => expectedChild !== undefined,
    );
    // Validate each property of the returned category
    TestValidator.equals(
      `returned category ${returnedCategory.id} name`,
      returnedCategory.name,
      expectedChild!.name,
    );
    TestValidator.equals(
      `returned category ${returnedCategory.id} slug`,
      returnedCategory.slug,
      expectedChild!.slug,
    );
    TestValidator.equals(
      `returned category ${returnedCategory.id} parent_id`,
      returnedCategory.parent_id,
      parentCategoryId,
    );
    TestValidator.equals(
      `returned category ${returnedCategory.id} level`,
      returnedCategory.level,
      expectedChild!.level,
    );
    TestValidator.equals(
      `returned category ${returnedCategory.id} order`,
      returnedCategory.order,
      expectedChild!.order,
    );
    TestValidator.equals(
      `returned category ${returnedCategory.id} is_active`,
      returnedCategory.is_active,
      expectedChild!.is_active,
    );
  }
  // Verify no grandchild categories are in the result
  // Grandchildren would be categories whose parent is one of the direct children
  const grandchildIds = allCategoriesResponse.data
    .filter(
      (category) =>
        category.parent_id &&
        expectedDirectChildren.some((child) => child.id === category.parent_id),
    )
    .map((child) => child.id);
  for (const grandchildId of grandchildIds) {
    TestValidator.predicate(
      `does not contain grandchild ${grandchildId}`,
      () => !filteredResult.data.some((c) => c.id === grandchildId),
    );
  }
  // Verify no unrelated root categories are in the result
  // Root categories have null parent_id and are not the parent we're filtering on
  const unrelatedRootIds = allCategoriesResponse.data
    .filter(
      (category) =>
        category.parent_id === undefined && category.id !== parentCategoryId,
    )
    .map((root) => root.id);
  for (const rootId of unrelatedRootIds) {
    TestValidator.predicate(
      `does not contain unrelated root ${rootId}`,
      () => !filteredResult.data.some((c) => c.id === rootId),
    );
  }
}
