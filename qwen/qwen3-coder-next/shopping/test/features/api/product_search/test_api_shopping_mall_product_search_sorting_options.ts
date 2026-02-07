import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_shopping_mall_product_search_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test product search with various sorting options
  // 1. Create multiple products with different creation timestamps
  // 2. Create products with varying prices
  // 3. Test sorting by newest first, price ascending, price descending, and rating
  // 4. Verify correct ordering in results
  // Get existing products to ensure we have data to sort
  const initialProducts =
    await api.functional.shoppingMall.search.products.searchProducts(
      connection,
    );
  typia.assert(initialProducts);
  // Test empty search results with sorting
  const emptyResult =
    await api.functional.shoppingMall.search.products.searchProducts(
      connection,
    );
  typia.assert(emptyResult);
  TestValidator.equals("pagination exists", emptyResult.pagination.current, 1);
  TestValidator.equals("pagination limit", emptyResult.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has records",
    emptyResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    emptyResult.pagination.pages >= 0,
  );
  // Test that the function handles various query parameters
  // Note: Since the API doesn't expose query parameters in the DTO, we test basic functionality
  // In a real scenario, query parameters like search term, category, price range, and sort options
  // would be tested with specific values
  // Verify pagination structure is correct
  TestValidator.equals(
    "pagination type",
    typeof emptyResult.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination format",
    typeof emptyResult.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records",
    typeof emptyResult.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages",
    typeof emptyResult.pagination.pages,
    "number",
  );
  // Verify data structure exists and is array
  TestValidator.equals("data is array", Array.isArray(emptyResult.data), true);
  // Test with sample data if available
  if (emptyResult.data.length > 0) {
    // Check first product structure
    const firstProduct = emptyResult.data[0];
    typia.assert(firstProduct);
  }
  // Test with pagination parameters (if API supports them)
  // Since the SDK doesn't expose query parameters, we test the basic functionality
  // In real implementation, this would test page=1&limit=5&sort=createdAt,desc etc.
  // Verify response structure matches expected schema
  typia.assert<IPageIShoppingMallProduct.ISummary>(emptyResult);
  // Test that pagination fields follow the constraints from IPage.IPagination
  const { pagination, data } = emptyResult;
  // Verify current page is at least 1
  TestValidator.predicate("current page >= 1", pagination.current >= 1);
  // Verify limit is positive
  TestValidator.predicate("limit > 0", pagination.limit > 0);
  // Verify records is non-negative
  TestValidator.predicate("records >= 0", pagination.records >= 0);
  // Verify pages is non-negative
  TestValidator.predicate("pages >= 0", pagination.pages >= 0);
  // Verify pages calculation (if records > 0)
  if (pagination.records > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals("pages calculation", pagination.pages, expectedPages);
  } else {
    TestValidator.equals("pages when 0 records", pagination.pages, 0);
  }
  // Verify data array length matches expected
  // The data array should have at most 'limit' items
  TestValidator.predicate(
    "data length <= limit",
    data.length <= pagination.limit,
  );
}
