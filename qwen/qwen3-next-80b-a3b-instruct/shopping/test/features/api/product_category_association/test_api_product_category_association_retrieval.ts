import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

export async function test_api_product_category_association_retrieval(
  connection: api.IConnection,
) {
  // Generate a random product ID for testing
  const productId = typia.random<string & tags.Format<"uuid">>();

  // Create a random request object for category retrieval
  const requestParams = {
    limit: RandomGenerator.pick([10, 25, 50, 100]) as number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    page: RandomGenerator.pick([1, 2, 3]) as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    sort: RandomGenerator.pick([
      "+name",
      "-name",
      "+display_order",
      "-display_order",
    ]) as string,
  };

  // Call the API endpoint to retrieve categories associated with the product
  const result: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.products.categories.index(connection, {
      productId,
      body: JSON.stringify(requestParams),
    });

  // Validate the response structure and types
  typia.assert(result);

  // Verify pagination properties match the request
  TestValidator.equals(
    "pagination current page matches request",
    result.pagination.current,
    requestParams.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    result.pagination.limit,
    requestParams.limit,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    () => result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is at least 1",
    () => result.pagination.pages >= 1,
  );

  // Verify data array is present and populated
  TestValidator.predicate("data array exists", () =>
    Array.isArray(result.data),
  );
  TestValidator.predicate("data array not empty", () => result.data.length > 0);

  // Validate each category in the response
  for (const category of result.data) {
    TestValidator.equals(
      "category has valid UUID id",
      typeof category.id,
      "string",
    );
    TestValidator.equals("category has name", typeof category.name, "string");
    TestValidator.notEquals("category name not empty", category.name, "");
    TestValidator.equals(
      "category has valid URI slug",
      typeof category.slug,
      "string",
    );
    TestValidator.equals(
      "category has is_active boolean",
      typeof category.is_active,
      "boolean",
    );
    TestValidator.equals(
      "category has display_order number",
      typeof category.display_order,
      "number",
    );
    TestValidator.predicate(
      "display_order is non-negative",
      () => category.display_order >= 0,
    );

    // Validate optional properties
    if (category.description !== undefined) {
      TestValidator.equals(
        "category description is string",
        typeof category.description,
        "string",
      );
    }

    if (category.parent_category_id !== undefined) {
      TestValidator.equals(
        "parent_category_id is string or null",
        typeof category.parent_category_id,
        "string",
      );
      if (category.parent_category_id !== null) {
        TestValidator.equals(
          "parent_category_id is valid UUID",
          typeof category.parent_category_id,
          "string",
        );
      }
    }
  }
}
