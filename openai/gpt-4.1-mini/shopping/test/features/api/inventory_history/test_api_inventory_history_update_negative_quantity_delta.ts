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
import { generate_random_shopping_mall_seller_inventory_histories_create_inventory_history } from "../../../generate/generate_random_shopping_mall_seller_inventory_histories_create_inventory_history";
import { prepare_random_shopping_mall_inventory_history } from "../../../prepare/prepare_random_shopping_mall_inventory_history";

export async function test_api_inventory_history_update_negative_quantity_delta(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Create a positive inventory history record
  const createdHistory =
    await generate_random_shopping_mall_seller_inventory_histories_create_inventory_history(
      sellerConnection,
      { body: { quantityDelta: 10 } },
    );
  typia.assert(createdHistory);
  // 3. Update inventory history record with negative quantityDelta
  const negativeDelta = -5;
  const updateBody: IShoppingMallInventoryHistory.IUpdate = {
    quantityDelta: negativeDelta,
    reason: "Stock decrease due to damage",
  };
  const updatedHistory =
    await api.functional.shoppingMall.seller.inventoryHistories.update(
      sellerConnection,
      {
        inventoryHistoryId: createdHistory.id,
        body: updateBody,
      },
    );
  typia.assert(updatedHistory);
  // 4. Validate updated response fields
  TestValidator.equals(
    "updated quantityDelta",
    updatedHistory.quantityDelta,
    negativeDelta,
  );
  TestValidator.equals(
    "updated reason",
    updatedHistory.reason,
    updateBody.reason,
  );
  TestValidator.predicate(
    "createdAt unchanged",
    updatedHistory.createdAt === createdHistory.createdAt,
  );
  TestValidator.predicate(
    "updatedAt changed",
    updatedHistory.updatedAt !== createdHistory.updatedAt,
  );
  TestValidator.equals("deletedAt unchanged", updatedHistory.deletedAt, null);
}
