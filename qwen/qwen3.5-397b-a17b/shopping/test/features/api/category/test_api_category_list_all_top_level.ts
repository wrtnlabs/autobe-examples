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
 * Test browsing all top-level categories without any filters.
 *
 * Validates the complete category listing flow for top-level categories. Ensures that the API returns a properly paginated list of categories with all required fields and correct parent hierarchy (null for top-level).
 *
 * Special attention is given to verifying that all returned categories have null parent fields, confirming they are top-level categories, and that pagination metadata accurately reflects the dataset.
 *
 * 1. Call PATCH /shoppingMall/categories with empty request body to retrieve all top-level categories.
 * 2. Validate response structure matches IPageIShoppingMallCategory.ISummary schema.
 * 3. Verify all categories have parent field set to null (top-level indicator).
 * 4. Verify each category contains required fields: id, name, parent, created_at.
 * 5. Validate pagination metadata is correct and consistent.
 * 6. Verify categories are sorted by creation date in descending order.
 */
export async function test_api_category_list_all_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Call API with empty request body to get all top-level categories
  const response: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {} satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(response);
  // 2. Validate pagination metadata exists and is correct
  TestValidator.predicate(
    "current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 3. Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 4. Verify all categories are top-level (parent is null) - critical business validation
  for (const category of response.data) {
    // Critical: Verify parent is null for top-level categories (business logic, not type)
    TestValidator.equals(
      "category is top-level (parent is null)",
      category.parent,
      null,
    );
  }
  // 5. Validate pagination consistency
  if (response.pagination.records === 0) {
    TestValidator.equals(
      "empty result has zero pages",
      response.pagination.pages,
      0,
    );
    TestValidator.equals(
      "empty result has empty data array",
      response.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "pages calculated correctly",
      response.pagination.pages ===
        Math.ceil(response.pagination.records / response.pagination.limit),
    );
    TestValidator.predicate(
      "data length does not exceed limit",
      response.data.length <= response.pagination.limit,
    );
  }
  // 6. Verify categories are sorted by created_at descending (if multiple categories exist)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prevDate = new Date(response.data[i - 1].created_at).getTime();
      const currDate = new Date(response.data[i].created_at).getTime();
      TestValidator.predicate(
        "categories sorted by created_at descending",
        prevDate >= currDate,
      );
    }
  }
}
