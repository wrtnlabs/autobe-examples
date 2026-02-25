import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_history_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
      shopName: RandomGenerator.name(),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(joinResult);
  // Use token for authenticated connection
  sellerConnection.headers = {
    Authorization: `Bearer ${joinResult.token.access}`,
  };
  // 2. Create an inventory history record using valid sample data via simulation
  // Since no utility explicitly creates inventory history, we simulate one
  const randomInventoryHistory = typia.random<IShoppingMallInventoryHistory>();
  // 3. Retrieve inventory history by ID for the authorized seller
  const got = await api.functional.shoppingMall.seller.inventoryHistories.at(
    sellerConnection,
    { inventoryHistoryId: randomInventoryHistory.id },
  );
  typia.assert(got);
  // 4. Verify the response matches expected schema property keys
  TestValidator.equals(
    "inventory history id",
    got.id,
    randomInventoryHistory.id,
  );
  TestValidator.equals(
    "quantity delta",
    got.quantityDelta,
    randomInventoryHistory.quantityDelta,
  );
  TestValidator.equals("reason present", typeof got.reason, "string");
  // 5. Validate product variant summary is present and valid
  typia.assert(got.productVariant);
  TestValidator.equals(
    "product variant id",
    got.productVariant.id,
    randomInventoryHistory.productVariant.id,
  );
  TestValidator.equals(
    "product variant sku code",
    got.productVariant.skuCode,
    randomInventoryHistory.productVariant.skuCode,
  );
  // 6. Validate timestamps are ISO date-time strings and logically ordered
  const createdAt = new Date(got.createdAt);
  const updatedAt = new Date(got.updatedAt);
  const deletedAt = got.deletedAt ? new Date(got.deletedAt) : null;
  TestValidator.predicate(
    "createdAt is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updatedAt is valid date",
    !isNaN(updatedAt.getTime()),
  );
  if (deletedAt !== null) {
    TestValidator.predicate(
      "deletedAt is valid date",
      !isNaN(deletedAt.getTime()),
    );
  }
  TestValidator.predicate(
    "updatedAt is equal or after createdAt",
    updatedAt >= createdAt,
  );
  // 7. Check no unauthorized/leaking data present (basic check)
  const allowedKeys = new Set([
    "id",
    "shoppingMallProductVariantId",
    "quantityDelta",
    "reason",
    "createdAt",
    "updatedAt",
    "deletedAt",
    "productVariant",
  ]);
  for (const key of Object.keys(got)) {
    TestValidator.predicate(
      `no unauthorized property ${key}`,
      allowedKeys.has(key),
    );
  }
}
