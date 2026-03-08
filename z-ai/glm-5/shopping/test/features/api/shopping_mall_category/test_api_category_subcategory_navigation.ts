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
 * Test category subcategory navigation in the shopping mall category hierarchy.
 *
 * This test validates:
 * 1. Retrieving top-level categories with topLevelOnly filter
 * 2. Retrieving subcategories using parentId filter
 * 3. Parent reference structure in subcategories
 * 4. Equivalence of parentId=null and topLevelOnly=true
 * 5. Subcategory uniqueness from parent
 */
export async function test_api_category_subcategory_navigation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Retrieve top-level categories using topLevelOnly=true
  const topLevelCategories = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        topLevelOnly: true,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(topLevelCategories);
  // Validate we have at least one top-level category
  TestValidator.predicate(
    "should have at least one top-level category",
    topLevelCategories.data.length > 0,
  );
  // All returned categories should have parent === null
  for (const category of topLevelCategories.data) {
    TestValidator.equals(
      "top-level category should have null parent",
      category.parent,
      null,
    );
  }
  // Pick a parent category for subcategory testing
  const parentCategory = topLevelCategories.data[0]!;
  // Step 2: Retrieve subcategories using parentId filter
  const subcategories = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        parentId: parentCategory.id,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(subcategories);
  // Step 3 & 6: Verify subcategories have correct parent references
  for (const subcategory of subcategories.data) {
    // Each subcategory must have parent populated (use assertGuard to narrow type)
    typia.assertGuard(subcategory.parent!);
    // Parent reference should match the queried parent
    TestValidator.equals(
      "subcategory parent id should match",
      subcategory.parent.id,
      parentCategory.id,
    );
    TestValidator.equals(
      "subcategory parent name should match",
      subcategory.parent.name,
      parentCategory.name,
    );
    // Parent's parent should be null (top-level parent)
    TestValidator.equals(
      "parent's parent should be null for top-level parent",
      subcategory.parent.parent,
      null,
    );
    // Subcategories should have unique IDs different from parent
    TestValidator.notEquals(
      "subcategory id should differ from parent id",
      subcategory.id,
      parentCategory.id,
    );
    TestValidator.notEquals(
      "subcategory name should differ from parent name",
      subcategory.name,
      parentCategory.name,
    );
  }
  // Step 5: Confirm parentId=null returns top-level categories only
  const nullParentCategories =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        parentId: null,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(nullParentCategories);
  // All returned categories should have parent === null
  for (const category of nullParentCategories.data) {
    TestValidator.equals(
      "parentId=null should return only top-level categories",
      category.parent,
      null,
    );
  }
  // The behavior should be equivalent to topLevelOnly=true
  TestValidator.equals(
    "parentId=null should return same count as topLevelOnly=true",
    nullParentCategories.data.length,
    topLevelCategories.data.length,
  );
}
