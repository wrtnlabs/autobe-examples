import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_summary_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Test inventory summary retrieval for multiple sellers to ensure data isolation.
  // Due to lack of detailed product/inventory creation APIs in provided info,
  // this test validates that inventory summaries differ between two sellers after joining.
  // 1. Register first seller account and authorize
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSellerAuth = await authorize_seller_join(firstSellerConnection, {
    body: {},
  });
  typia.assert(firstSellerAuth);
  firstSellerConnection.headers = {
    Authorization: `Bearer ${firstSellerAuth.token.access}`,
  };
  // 2. Register second seller account and authorize
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSellerAuth = await authorize_seller_join(secondSellerConnection, {
    body: {},
  });
  typia.assert(secondSellerAuth);
  secondSellerConnection.headers = {
    Authorization: `Bearer ${secondSellerAuth.token.access}`,
  };
  // 3. Seller 1 requests inventory summary
  const firstSellerSummary =
    await api.functional.shoppingMall.seller.inventory.summary.summaryInventory(
      firstSellerConnection,
    );
  typia.assert(firstSellerSummary);
  // 4. Seller 2 requests inventory summary
  const secondSellerSummary =
    await api.functional.shoppingMall.seller.inventory.summary.summaryInventory(
      secondSellerConnection,
    );
  typia.assert(secondSellerSummary);
  // 5. Assert that summaries of two sellers are different, or at least that
  //    the inventory quantities reflect isolation.
  TestValidator.notEquals(
    "inventory summary isolation",
    firstSellerSummary,
    secondSellerSummary,
  );
}
