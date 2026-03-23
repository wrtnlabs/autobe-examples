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

export async function test_api_category_filtering_by_parent(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test category filtering functionality by parent category relationship.
   *
   * This test validates that the shopping mall category API correctly filters
   * categories based on parent category relationships. It tests retrieving
   * top-level categories, subcategories of a specific parent, and handling
   * non-existent parent IDs.
   */
  // 1. Create actor-specific connection from base connection
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Retrieve all top-level categories by filtering with parentId=null
  const topLevelCategories = await api.functional.shoppingMall.categories.index(
    customerConnection,
    {
      body: {
        parentId: null,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(topLevelCategories);
  // 3. Validate response contains top-level categories with parent=null
  TestValidator.predicate(
    "top-level categories exist",
    topLevelCategories.data.length > 0,
  );
  // Verify all top-level categories have parent=null
  for (const category of topLevelCategories.data) {
    TestValidator.equals(
      `category ${category.id} has no parent`,
      category.parent,
      null,
    );
  }
  // 4. Select one top-level category ID from the results
  const selectedParentId = topLevelCategories.data[0].id;
  // 5. Call PATCH /shoppingMall/categories with parentId set to the selected category ID
  const subcategories = await api.functional.shoppingMall.categories.index(
    customerConnection,
    {
      body: {
        parentId: selectedParentId,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(subcategories);
  // 6. Verify response contains only subcategories of the selected parent
  // Note: There may be 0 or more subcategories, both are valid
  // 7. Confirm all returned categories have the correct parent field
  for (const subcategory of subcategories.data) {
    TestValidator.equals(
      `subcategory ${subcategory.id} has correct parent`,
      subcategory.parent?.id,
      selectedParentId,
    );
  }
  // 8. Test with a non-existent parent ID (generate random UUID)
  const nonExistentParentId = typia.random<string & tags.Format<"uuid">>();
  const emptyResults = await api.functional.shoppingMall.categories.index(
    customerConnection,
    {
      body: {
        parentId: nonExistentParentId,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(emptyResults);
  // 9. Verify empty results are returned for non-existent parent
  TestValidator.equals(
    "non-existent parent returns empty results",
    emptyResults.data.length,
    0,
  );
  // 10. Validate pagination metadata reflects filtered results count
  TestValidator.equals(
    "top-level pagination records match data length",
    topLevelCategories.pagination.records,
    topLevelCategories.data.length,
  );
  TestValidator.equals(
    "subcategories pagination records match data length",
    subcategories.pagination.records,
    subcategories.data.length,
  );
  TestValidator.equals(
    "empty results pagination records is zero",
    emptyResults.pagination.records,
    0,
  );
}
