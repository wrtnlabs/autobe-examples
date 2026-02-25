import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_hierarchy_integrity_circular_references(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Retrieve categories with hierarchical structure
  const categories = await api.functional.ecommerce.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IEcommerceCategory.IRequest,
    },
  );
  typia.assert(categories);
  // Test 2: Validate categories have proper parent-child relationships
  const categoryMap = new Map<string, IEcommerceCategory.ISummary>();
  for (const category of categories.data) {
    categoryMap.set(category.id, category);
  }
  // Test 3: Verify no circular references in hierarchy
  for (const category of categories.data) {
    if (category.parent) {
      // Ensure parent exists in the dataset
      TestValidator.predicate(
        "parent category should exist in response",
        categoryMap.has(category.parent.id),
      );
      // Ensure parent is not the same as current category (direct circular reference)
      TestValidator.notEquals(
        "category cannot be its own parent",
        category.id,
        category.parent.id,
      );
      // Test hierarchical depth (one-level nesting limit)
      let currentParent: IEcommerceCategory.ISummary | null = category.parent;
      let depth = 0;
      while (currentParent !== null && currentParent !== undefined && depth < 10) {
        // Prevent infinite loops
        TestValidator.predicate(
          "hierarchical depth should be reasonable",
          depth < 5,
        );
        currentParent = currentParent.parent;
        depth++;
      }
    }
  }
  // Test 4: Validate products count field
  for (const category of categories.data) {
    TestValidator.predicate(
      "products count should be non-negative",
      category.products_count >= 0,
    );
  }
  // Test 5: Test filtering by specific category IDs
  if (categories.data.length > 0) {
    // Use manual sampling instead of ArrayUtil to avoid import issues
    const sampleCategoryIds: (string & tags.Format<"uuid">)[] = [];
    const sampleSize = Math.min(3, categories.data.length);
    for (let i = 0; i < sampleSize; i++) {
      sampleCategoryIds.push(categories.data[i].id);
    }
    const filteredCategories = await api.functional.ecommerce.categories.index(
      connection,
      {
        body: {
          category_ids: sampleCategoryIds,
          page: 1,
          limit: 10,
        } satisfies IEcommerceCategory.IRequest,
      },
    );
    typia.assert(filteredCategories);
    // Verify filtered categories match requested IDs
    const filteredIds = new Set(filteredCategories.data.map((cat) => cat.id));
    for (const requestedId of sampleCategoryIds) {
      TestValidator.predicate(
        "requested category ID should be in filtered results",
        filteredIds.has(requestedId),
      );
    }
  }
  // Test 6: Test pagination functionality
  const paginatedCategories = await api.functional.ecommerce.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IEcommerceCategory.IRequest,
    },
  );
  typia.assert(paginatedCategories);
  TestValidator.predicate(
    "pagination should return correct page size",
    paginatedCategories.data.length <= 5,
  );
  TestValidator.predicate(
    "pagination metadata should be valid",
    paginatedCategories.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination records should be accurate",
    paginatedCategories.pagination.records >= 0,
  );
  // Test 7: Test date filtering (optional parameters)
  const dateFilteredCategories =
    await api.functional.ecommerce.categories.index(connection, {
      body: {
        start_date: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        end_date: new Date().toISOString(),
        metric_types: ["products"],
        page: 1,
        limit: 10,
      } satisfies IEcommerceCategory.IRequest,
    });
  typia.assert(dateFilteredCategories);
}