import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_seller_inventory_history_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Create authenticated seller connection
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  // 3. Generate a random variant ID for testing
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve inventory history for variant with no transactions
  const inventoryHistory =
    await api.functional.shoppingMall.seller.inventory.history.index(
      authenticatedSellerConnection,
      {
        variantId: variantId,
      },
    );
  typia.assert(inventoryHistory);
  // 5. Validate empty result structure
  TestValidator.equals("data array is empty", inventoryHistory.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    inventoryHistory.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination current is 1",
    inventoryHistory.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination pages is 0",
    inventoryHistory.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    inventoryHistory.pagination.limit > 0,
  );
}
