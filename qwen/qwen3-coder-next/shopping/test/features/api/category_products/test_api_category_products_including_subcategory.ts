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
 * Test category product browsing including subcategory products.
 * Setup: Use existing test data in the system.
 * Execution: Call the parent category products endpoint.
 * Verification: Check that the endpoint returns paginated products correctly.
 */
export async function test_api_category_products_including_subcategory(
  connection: api.IConnection,
): Promise<void> {
  // Use a sample category ID for testing
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Test category products endpoint
  const result = await api.functional.shoppingMall.categories.products.index(
    connection,
    {
      categoryId: categoryId,
    },
  );
  typia.assert(result);
  // Validate response structure
  TestValidator.equals(
    "response has pagination",
    result.pagination !== null,
    true,
  );
  TestValidator.predicate("has data array", Array.isArray(result.data));
  TestValidator.predicate("pagination is valid", result.pagination.pages >= 0);
}
