import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductViewStat";
import type { IShoppingMallProductViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_trending_products_data_flow(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Call the trending products endpoint
  const trendingProducts: IPageIShoppingMallProductViewStat =
    await api.functional.shoppingMall.analytics.trending.index(connection);
  typia.assert(trendingProducts);
  // Step 2: Verify trending data contains at least one product
  TestValidator.predicate(
    "trending data contains at least one product",
    trendingProducts.data.length > 0,
  );
  // Step 3: Verify pagination metadata has valid values
  const { current, limit, records, pages } = trendingProducts.pagination;
  TestValidator.equals("pagination current page", current, 1);
  TestValidator.equals("pagination page limit", limit, 20);
  TestValidator.predicate("pagination records count", records > 0);
  TestValidator.predicate("pagination page count", pages > 0);
}
