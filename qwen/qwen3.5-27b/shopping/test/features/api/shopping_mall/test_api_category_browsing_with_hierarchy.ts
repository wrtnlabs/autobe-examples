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

export async function test_api_category_browsing_with_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary success path for browsing categories with hierarchical structure.
   *
   * Scenario: A customer browses the shopping mall categories to discover products
   * organized by category taxonomy. The test validates that categories are returned
   * with proper hierarchical relationships, pagination metadata, and field validation.
   */
  // 1. Create customer-specific connection from base connection
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Prepare request body to include subcategories
  const body = {
    includeSubcategories: true,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallCategory.IRequest;
  // 3. Call PATCH /shoppingMall/categories endpoint
  const output = await api.functional.shoppingMall.categories.index(
    customerConnection,
    { body },
  );
  // 4. Validate response structure with typia (complete type validation)
  typia.assert(output);
  // 5. Validate pagination metadata
  TestValidator.equals("current page is 1", output.pagination.current, 1);
  TestValidator.equals("limit is 20", output.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    output.pagination.pages >= 0,
  );
  // 6. Handle empty categories case gracefully
  if (output.data.length === 0) {
    TestValidator.equals(
      "records is 0 when no categories exist",
      output.pagination.records,
      0,
    );
    TestValidator.equals(
      "pages is 0 when no categories exist",
      output.pagination.pages,
      0,
    );
    return;
  }
  // 7. Validate pagination consistency
  TestValidator.predicate(
    "data length does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  // 8. Validate hierarchical structure
  const topLevelCategories = output.data.filter((cat) => cat.parent === null);
  const subcategories = output.data.filter((cat) => cat.parent !== null);
  TestValidator.predicate(
    "has top-level categories",
    topLevelCategories.length > 0,
  );
  // 9. Validate that subcategories reference existing parent categories
  const parentIds = new Set(output.data.map((cat) => cat.id));
  for (const subcat of subcategories) {
    TestValidator.predicate(
      `subcategory ${subcat.id} parent exists in results`,
      parentIds.has(subcat.parent!.id),
    );
  }
  // 10. Validate hierarchical ordering (parent categories appear before children)
  const categoryOrder = new Map<string, number>();
  output.data.forEach((cat, index) => {
    categoryOrder.set(cat.id, index);
  });
  for (const subcat of subcategories) {
    const parentIndex = categoryOrder.get(subcat.parent!.id);
    const childIndex = categoryOrder.get(subcat.id);
    TestValidator.predicate(
      `subcategory ${subcat.id} appears after its parent`,
      parentIndex !== undefined &&
        childIndex !== undefined &&
        parentIndex < childIndex,
    );
  }
  // 11. Validate parent-child relationship consistency
  for (const subcat of subcategories) {
    TestValidator.equals(
      `subcategory ${subcat.id} parent name matches referenced category`,
      subcat.parent!.name,
      output.data.find((cat) => cat.id === subcat.parent!.id)?.name,
    );
  }
}
