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
 * Test hierarchical navigation through the two-level category structure.
 *
 * Validates the category filtering system supporting:
 * - Top-level categories (parentId = null)
 * - Subcategories (parentId = specific UUID)
 * - All categories (parentId omitted)
 * - Name uniqueness within sibling groups
 */
export async function test_api_categories_hierarchy_navigation(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // 1. Get all categories (parentId omitted)
  // ========================================
  const allCategories = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(allCategories);
  // ========================================
  // 2. Get top-level categories (parentId = null)
  // ========================================
  const topLevelCategories = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        parentId: null,
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(topLevelCategories);
  // Verify all returned categories have parentId = null
  for (const category of topLevelCategories.data) {
    TestValidator.equals(
      "top-level category has parentId null",
      category.parentId,
      null,
    );
  }
  // ========================================
  // 3. Verify name uniqueness within top-level siblings
  // ========================================
  const topLevelNames = topLevelCategories.data.map((c) => c.name);
  const uniqueTopLevelNames = new Set(topLevelNames);
  TestValidator.equals(
    "top-level category names are unique",
    topLevelNames.length,
    uniqueTopLevelNames.size,
  );
  // ========================================
  // 4. Get subcategories under a specific parent
  // ========================================
  if (topLevelCategories.data.length > 0) {
    const parentCategory = topLevelCategories.data[0];
    const subcategories = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          parentId: parentCategory.id,
          limit: 100,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(subcategories);
    // Verify all returned subcategories have the correct parentId
    for (const subcategory of subcategories.data) {
      TestValidator.equals(
        "subcategory has correct parentId",
        subcategory.parentId,
        parentCategory.id,
      );
    }
    // Verify name uniqueness within sibling subcategories
    if (subcategories.data.length > 1) {
      const subcategoryNames = subcategories.data.map((c) => c.name);
      const uniqueSubcategoryNames = new Set(subcategoryNames);
      TestValidator.equals(
        "subcategory names are unique within parent",
        subcategoryNames.length,
        uniqueSubcategoryNames.size,
      );
    }
  }
  // ========================================
  // 5. Verify parentId references valid categories
  // ========================================
  const allParentIds = allCategories.data
    .map((c) => c.parentId)
    .filter((id): id is string => id !== null);
  const allCategoryIds = new Set(allCategories.data.map((c) => c.id));
  for (const parentId of allParentIds) {
    TestValidator.predicate(
      "parentId references a valid category",
      allCategoryIds.has(parentId),
    );
  }
  // ========================================
  // 6. Verify pagination works correctly
  // ========================================
  TestValidator.predicate(
    "pagination records count is valid",
    allCategories.pagination.records >= allCategories.data.length,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    allCategories.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    allCategories.pagination.limit >= 1,
  );
}
