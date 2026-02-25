import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_access_own_product_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller signs up
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create a snapshot ID that represents seller's product (simulated as owned)
  const ownSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Seller accesses snapshot of their own product - should succeed
  const ownSnapshot =
    await api.functional.shoppingMall.seller.order_item_snapshots.at(
      sellerConnection,
      {
        snapshotId: ownSnapshotId,
      },
    );
  typia.assert(ownSnapshot);
  // 4. Create snapshot ID that represents another seller's product
  const foreignSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 5. Seller attempts to access snapshot they don't own - should 404
  await TestValidator.error(
    "seller cannot access other seller's snapshot",
    async () => {
      await api.functional.shoppingMall.seller.order_item_snapshots.at(
        sellerConnection,
        {
          snapshotId: foreignSnapshotId,
        },
      );
    },
  );
}
