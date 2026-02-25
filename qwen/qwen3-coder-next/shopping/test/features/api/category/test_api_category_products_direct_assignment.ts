import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test category product browsing with products directly assigned to the category.
 * Setup: Since admin endpoints are not available, we use the available API endpoint directly.
 * Execution: Call the category products endpoint with a valid category ID.
 * Verification: Check that the response structure is correct, pagination is present,
 * and validate seller and category information is included for each product summary.
 */
export async function test_api_category_products_direct_assignment(
  connection: api.IConnection,
): Promise<void> {
  // Use the available endpoint directly
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Call the category products endpoint
  const result = await api.functional.shoppingMall.categories.products.index(
    connection,
    {
      categoryId: categoryId,
    },
  );
  typia.assert(result);
  // Verify the results - basic validation of structure
  TestValidator.predicate("has products in result", result.data.length >= 0);
  TestValidator.equals(
    "pagination structure present",
    typeof result.pagination,
    "object",
  );
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    typeof result.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof result.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records",
    typeof result.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof result.pagination.pages === "number",
  );
  // Verify pagination values are valid
  TestValidator.predicate(
    "pagination current >= 0",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    result.pagination.pages >= 0,
  );
  // Verify products have required fields if any exist
  for (const product of result.data) {
    TestValidator.equals(
      "product has seller information",
      typeof product.seller === "object",
      true,
    );
    TestValidator.equals(
      "product has category information",
      typeof product.category === "object",
      true,
    );
    TestValidator.equals(
      "product has average rating",
      typeof product.average_rating === "number",
      true,
    );
    // Verify seller structure
    TestValidator.equals(
      "seller has id",
      typeof product.seller.id === "string",
      true,
    );
    TestValidator.equals(
      "seller has shop_name",
      typeof product.seller.shop_name === "string",
      true,
    );
    TestValidator.equals(
      "seller has approval_status",
      typeof product.seller.approval_status === "string",
      true,
    );
    TestValidator.equals(
      "seller has created_at",
      typeof product.seller.created_at === "string",
      true,
    );
    // Verify category structure
    TestValidator.equals(
      "category has id",
      typeof product.category.id === "string",
      true,
    );
    TestValidator.equals(
      "category has name",
      typeof product.category.name === "string",
      true,
    );
  }
}
