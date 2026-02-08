import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_shopping_mall_seller_sale_snapshot_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving an existing sale snapshot by a valid snapshotId as an authenticated seller.
  // 1. Create seller account and get seller authorization token
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  // 2. Create a new connection with seller's authorization token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorizedSeller.token.access}` },
  };
  // 3. Generate a random snapshotId UUID
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Use the sellerConnection to retrieve the sale snapshot by snapshotId
  const snapshot = await api.functional.shoppingMall.seller.sale_snapshots.at(
    sellerConnection,
    {
      snapshotId,
    },
  );
  // 5. Validate the snapshot object with typia.assert
  typia.assert(snapshot);
  // Validate snapshot is an object
  TestValidator.predicate(
    "snapshot is object",
    snapshot !== null && typeof snapshot === "object"
  );
}
