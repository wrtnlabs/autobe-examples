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

export async function test_api_seller_inventory_summary_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving the overall inventory summary for a seller user.
  // 1. Register a new seller
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {},
  });
  typia.assert(sellerAuth);
  // Create authorized seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: sellerAuth.token.access,
  };
  // 2. Call inventory summary endpoint with authorized seller
  const inventorySummary =
    await api.functional.shoppingMall.seller.inventory.summary.summaryInventory(
      sellerConnection,
    );
  typia.assert(inventorySummary);
  // 3. Validate presence of expected keys and their types
  // Since IShoppingMallInventoryHistory definition is empty, we can only assert type successfully
  // 4. Call inventory summary endpoint WITHOUT authorization and expect failure
  await TestValidator.httpError("unauthorized access", 401, async () => {
    await api.functional.shoppingMall.seller.inventory.summary.summaryInventory(
      connection,
    );
  });
}
