import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
export async function test_api_seller_active_sellers_only(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve seller list
  const sellers = await api.functional.shoppingMall.sellers.index(connection);
  typia.assert(sellers);
  // Validate that all sellers in the results are verified
  for (const seller of sellers.data) {
    TestValidator.equals("seller should be verified", seller.verified, true);
  }
}
