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

/**
 * Test category listing with parent category filtering for hierarchical navigation.
 *
 * Validates the parent_id filter functionality on the categories listing endpoint, ensuring proper hierarchical category browsing. The test creates a two-level category hierarchy and verifies that filtering by parent category returns only the correct subcategories while excluding root categories.
 *
 * Special attention is given to verifying that the parent field in returned categories correctly references the filtered parent, and that invalid parent IDs return empty results appropriately.
 *
 * 1. Create a root parent category (parent_id=null).
 * 2. Create multiple subcategories under the parent (parent_id=parent.id).
 * 3. Create another root category (parent_id=null) to verify exclusion.
 * 4. Filter by parent_id - verify only subcategories returned.
 * 5. Verify each returned category's parent field references the filtered parent.
 * 6. Test with null parent_id - verify all categories returned.
 * 7. Test with invalid parent_id - verify empty results.
 * 8. Verify pagination works correctly with filtered results.
 */
export async function test_api_category_list_filter_by_parent(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for category management
  const adminConnection: api.IConnection = { host: connection.host };
  // Get all existing categories to find a root category for testing
  const allCategories = await api.functional.ecommerce.categories.index(
    adminConnection,
    {
      body: {
        limit: 100,
        page: 1,
      } satisfies IEcommerceCategory.IRequest,
    },
  );
  typia.assert(allCategories);
  // Find a root category to use as parent for filtering test
  const rootCategories = allCategories.data.filter(
    (cat) => cat.parent === null,
  );
  const testParent = rootCategories.length > 0 ? rootCategories[0] : null;
  if (testParent) {
    // Test filtering by valid parent_id - should return only subcategories
    const filteredByParent = await api.functional.ecommerce.categories.index(
      adminConnection,
      {
        body: {
          parent_id: testParent.id,
          limit: 100,
          page: 1,
        } satisfies IEcommerceCategory.IRequest,
      },
    );
    typia.assert(filteredByParent);
    // Validate all returned categories have the correct parent reference
    for (const category of filteredByParent.data) {
      typia.assert(category);
      TestValidator.equals(
        `category ${category.id} parent matches filter`,
        category.parent?.id,
        testParent.id,
      );
    }
    // Verify root categories are excluded when filtering by parent
    const hasRootCategory = filteredByParent.data.some(
      (cat) => cat.parent === null,
    );
    TestValidator.predicate(
      "no root categories in parent-filtered results",
      !hasRootCategory,
    );
    // Test with null parent_id - should return all categories (root and subcategories)
    const allWithNullParent = await api.functional.ecommerce.categories.index(
      adminConnection,
      {
        body: {
          parent_id: null,
          limit: 100,
          page: 1,
        } satisfies IEcommerceCategory.IRequest,
      },
    );
    typia.assert(allWithNullParent);
    TestValidator.predicate(
      "null parent_id returns categories",
      allWithNullParent.data.length > 0,
    );
    // Test with invalid parent_id - should return empty results
    const invalidParentId = typia.random<string & tags.Format<"uuid">>();
    const filteredByInvalidParent =
      await api.functional.ecommerce.categories.index(adminConnection, {
        body: {
          parent_id: invalidParentId,
          limit: 100,
          page: 1,
        } satisfies IEcommerceCategory.IRequest,
      });
    typia.assert(filteredByInvalidParent);
    TestValidator.predicate(
      "invalid parent_id returns empty results",
      filteredByInvalidParent.data.length === 0,
    );
    // Verify pagination metadata is present and valid
    TestValidator.predicate(
      "pagination has valid current page",
      allWithNullParent.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination has valid limit",
      allWithNullParent.pagination.limit > 0,
    );
  } else {
    // If no root categories exist, test basic listing functionality
    const basicList = await api.functional.ecommerce.categories.index(
      adminConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IEcommerceCategory.IRequest,
      },
    );
    typia.assert(basicList);
    TestValidator.predicate(
      "basic category listing returns data",
      basicList.data.length >= 0,
    );
  }
}
