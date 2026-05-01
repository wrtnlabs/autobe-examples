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
 * Test browsing top-level categories with parent_id filter set to null.
 *
 * Validates that the category browse endpoint correctly returns only top-level
 * categories when parentId is explicitly set to null. Confirms that every
 * returned category has parent_id equal to null, ensuring no subcategories leak
 * into the results. Also verifies that the children_count field on each
 * top-level category accurately reflects the count of its immediate active
 * subcategories by cross-referencing against the complete unfiltered dataset.
 *
 * Pagination is tested with the parentId filter applied to confirm that paging
 * metadata remains correct and that subsequent pages contain distinct,
 * non-overlapping results. The test also implicitly validates that soft-deleted
 * categories are excluded from results, as the endpoint only returns active
 * categories.
 *
 * 1. Fetch all categories without filters to build the complete dataset.
 * 2. Build a parent_id → child count map from the full dataset.
 * 3. Fetch categories with parentId explicitly set to null.
 * 4. Verify every returned category has parent_id === null.
 * 5. Cross-reference children_count against the precomputed child count map.
 * 6. Test pagination with parentId filter — verify metadata and page boundaries.
 */
export async function test_api_category_browse_top_level_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch all active categories to understand the complete dataset
  const allCategories = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(allCategories);
  // Build a map of parent_id → active child count for cross-referencing
  const childCountByParent: Record<string, number> = {};
  for (const cat of allCategories.data) {
    if (cat.parent_id !== null) {
      childCountByParent[cat.parent_id] =
        (childCountByParent[cat.parent_id] ?? 0) + 1;
    }
  }
  // 2. Fetch ONLY top-level categories with parentId explicitly null
  const topLevel = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        parentId: null,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(topLevel);
  // 3. Verify every returned category has parent_id strictly null
  for (const category of topLevel.data) {
    TestValidator.equals(
      `category "${category.name}" parent_id must be null`,
      category.parent_id,
      null,
    );
  }
  // 4. Verify children_count accuracy against the all-categories dataset
  for (const topCat of topLevel.data) {
    const expectedCount = childCountByParent[topCat.id] ?? 0;
    TestValidator.equals(
      `children_count for top-level category "${topCat.name}"`,
      topCat.children_count satisfies number as number,
      expectedCount,
    );
  }
  // 5. Assert no subcategory leaked into top-level results
  TestValidator.predicate(
    "all returned categories have null parent_id",
    topLevel.data.every((c) => c.parent_id === null),
  );
  // 6. Test pagination with parentId filter applied
  if (topLevel.pagination.records > 1) {
    const page1 = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          parentId: null,
          page: 1,
          limit: 5,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(page1);
    TestValidator.equals(
      "page 1 current page",
      page1.pagination.current satisfies number as number,
      1,
    );
    TestValidator.equals(
      "page 1 limit matches request",
      page1.pagination.limit satisfies number as number,
      5,
    );
    // Verify every page 1 item exists in the full top-level set
    for (const item of page1.data) {
      TestValidator.predicate(
        `page 1 item "${item.name}" exists in full top-level set`,
        ArrayUtil.has(topLevel.data, (c) => c.id === item.id),
      );
    }
    // If multiple pages exist, verify page 2 contains distinct, non-overlapping items
    if (topLevel.pagination.pages > 1) {
      const page2 = await api.functional.shoppingMall.categories.index(
        connection,
        {
          body: {
            parentId: null,
            page: 2,
            limit: 5,
          } satisfies IShoppingMallCategory.IRequest,
        },
      );
      typia.assert(page2);
      TestValidator.equals(
        "page 2 current page",
        page2.pagination.current satisfies number as number,
        2,
      );
      // Ensure no overlap between page 1 and page 2
      const page1Ids = new Set(page1.data.map((c) => c.id));
      for (const item of page2.data) {
        TestValidator.predicate(
          `page 2 item "${item.name}" not in page 1`,
          !page1Ids.has(item.id),
        );
      }
    }
  }
}
