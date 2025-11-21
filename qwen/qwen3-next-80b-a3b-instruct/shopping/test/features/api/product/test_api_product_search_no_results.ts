import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function test_api_product_search_no_results(
  connection: api.IConnection,
) {
  // Generate a search term that is guaranteed to have no matching products
  const searchTerm = RandomGenerator.alphaNumeric(32); // 32-character alphanumeric string — extremely unlikely to match any real product title

  // Perform the product search with the non-existent search term
  const result: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: searchTerm,
    });

  // Validate the response structure and pagination metadata
  typia.assert(result);

  // Verify that the data array is empty
  TestValidator.equals("data array should be empty", result.data.length, 0);

  // Verify pagination metadata is correctly populated
  TestValidator.equals(
    "current page should be 0",
    result.pagination.current,
    0,
  );
  TestValidator.equals("records should be 0", result.pagination.records, 0);
  TestValidator.equals("pages should be 0", result.pagination.pages, 0);
  TestValidator.predicate(
    "limit is a positive integer (1-100)",
    result.pagination.limit >= 1 && result.pagination.limit <= 100,
  );
}
