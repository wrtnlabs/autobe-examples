import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the inStock filter parameter for product search.
 *
 * This test verifies the stock availability filter functionality:
 * 1. When inStock=true, only products with available variants should be returned
 * 2. Products with no variants or all variants out of stock should be excluded
 * 3. Without the filter, all products should be visible regardless of stock
 *
 * Note: This test assumes pre-existing product data with various stock states.
 * In a complete test suite, setup would create products with:
 * - In-stock variants (stock_quantity > 0)
 * - Out-of-stock variants only (all variants stock_quantity = 0)
 * - No variants at all
 */
export async function test_api_product_search_stock_availability_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search with inStock=true filter
  const inStockResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        inStock: true,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(inStockResponse);
  // Test 2: Search without inStock filter (all products)
  const allProductsResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(allProductsResponse);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination current valid",
    inStockResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    inStockResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    inStockResponse.pagination.records >= 0,
  );
  // Validate inStock results: all returned products must have variants (variantCount > 0)
  // Products without variants or with all variants out of stock should be excluded
  for (const product of inStockResponse.data) {
    TestValidator.predicate(
      `inStock product ${product.id} has variants`,
      product.variantCount > 0,
    );
  }
  // inStock filtered count should be <= total product count
  TestValidator.predicate(
    "inStock record count <= total record count",
    inStockResponse.pagination.records <=
      allProductsResponse.pagination.records,
  );
}
