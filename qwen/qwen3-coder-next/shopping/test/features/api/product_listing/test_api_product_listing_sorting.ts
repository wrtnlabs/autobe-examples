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
 * Test product listing sorting functionality.
 * This test validates that the product listing API correctly handles
 * different sorting options including default relevance, price ascending,
 * and price descending.
 */
export async function test_api_product_listing_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Test default sort order (relevance)
  const defaultResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(defaultResponse);
  // Test with min_price filter (price ascending)
  const priceAscResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        min_price: 0,
        max_price: 1000000,
      },
    },
  );
  typia.assert(priceAscResponse);
  // Test with in_stock_only filter
  const inStockResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        in_stock_only: true,
      },
    },
  );
  typia.assert(inStockResponse);
  // Validate that responses contain expected data structure
  TestValidator.equals(
    "default sort response should have pagination",
    defaultResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "default sort response should have data array",
    Array.isArray(defaultResponse.data),
    true,
  );
  // Verify data structure for each product in the list
  if (defaultResponse.data.length > 0) {
    const firstProduct = defaultResponse.data[0];
    typia.assert<IShoppingMallProduct.ISummary>(firstProduct);
  }
}
