import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_search_include_inactive(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a connection object for the test
  const testConnection: api.IConnection = { host: connection.host };
  // Step 2: Search with include_inactive=true to include both active and inactive products
  const responseWithInactive = await api.functional.shoppingMall.products.index(
    testConnection,
    {
      body: { include_inactive: true },
    },
  );
  typia.assert(responseWithInactive);
  // Step 3: Search with include_inactive=false to verify only active products are returned
  const responseWithoutInactive =
    await api.functional.shoppingMall.products.index(testConnection, {
      body: { include_inactive: false },
    });
  typia.assert(responseWithoutInactive);
  // Step 4: Verify that include_inactive=true returns products with mixed status
  const hasActive = responseWithInactive.data.some(
    (product) => product.status === "active",
  );
  const hasInactive = responseWithInactive.data.some(
    (product) => product.status === "inactive",
  );
  TestValidator.equals(
    "include_inactive=true should include both active and inactive products",
    hasActive && hasInactive,
    true,
  );
  // Step 5: Verify that include_inactive=false returns only active products
  const onlyActive = responseWithoutInactive.data.every(
    (product) => product.status === "active",
  );
  TestValidator.equals(
    "include_inactive=false should include only active products",
    onlyActive,
    true,
  );
}
