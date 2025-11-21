import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function test_api_product_search_price_range_only(
  connection: api.IConnection,
) {
  const priceFilter = '{"min": 50, "max": 100}';
  const result: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: priceFilter,
    });
  typia.assert(result);

  // Ensure we have at least two products in results to test sorting
  TestValidator.predicate(
    "at least two products exist",
    result.data.length >= 2,
  );

  // Validate all returned products are within price range
  const productsWithinRange = result.data.filter(
    (product) => product.price >= 50 && product.price <= 100,
  );
  TestValidator.equals(
    "all products in price range",
    result.data.length,
    productsWithinRange.length,
  );

  // Validate sorting by price ascending without modifying original array
  const priceValues = result.data.map((p) => p.price);
  const sortedPriceValues = [...priceValues].sort((a, b) => a - b);
  TestValidator.equals(
    "products sorted by price ascending",
    priceValues,
    sortedPriceValues,
  );
}
