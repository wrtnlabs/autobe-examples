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

export async function test_api_inventory_history_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller and create sellerConnection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "strongpassword",
        shopName: RandomGenerator.name(2),
      },
    });
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create a new inventory history record
  const createdInventoryHistory =
    await generate_random_shopping_mall_seller_inventory_histories_create_inventory_history(
      sellerConnection,
      { body: {} },
    );
  typia.assert(createdInventoryHistory);
  // 3. Prepare update data with random positive or negative quantityDelta and non-empty reason
  const quantityDeltaUpdate = RandomGenerator.pick([-10, -5, -1, 1, 5, 10]);
  const updateBody: IShoppingMallInventoryHistory.IUpdate = {
    quantityDelta: quantityDeltaUpdate,
    reason: RandomGenerator.paragraph({ sentences: 2 }) || "stock adjustment",
  };
  // 4. Update the created inventory history
  const updatedInventoryHistory =
    await api.functional.shoppingMall.seller.inventoryHistories.update(
      sellerConnection,
      {
        inventoryHistoryId: createdInventoryHistory.id,
        body: updateBody,
      },
    );
  typia.assert(updatedInventoryHistory);
  // 5. Validate the updated fields
  TestValidator.equals(
    "quantityDelta updated",
    updatedInventoryHistory.quantityDelta,
    updateBody.quantityDelta,
  );
  TestValidator.equals(
    "reason updated",
    updatedInventoryHistory.reason,
    updateBody.reason,
  );
  TestValidator.equals(
    "productVariant id",
    updatedInventoryHistory.productVariant.id,
    createdInventoryHistory.productVariant.id,
  );
  // 6. Validate that the quantityDelta is positive or negative integer
  TestValidator.predicate(
    "quantityDelta is valid integer",
    Number.isInteger(updatedInventoryHistory.quantityDelta) &&
      updatedInventoryHistory.quantityDelta !== 0,
  );
  // 7. Validate that reason is non-empty string
  TestValidator.predicate(
    "reason is non-empty string",
    typeof updatedInventoryHistory.reason === "string" &&
      updatedInventoryHistory.reason.length > 0,
  );
}
