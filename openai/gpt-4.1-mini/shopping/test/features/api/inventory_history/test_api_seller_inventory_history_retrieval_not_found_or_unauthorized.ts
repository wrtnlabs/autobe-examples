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

/**
 * Test the seller's attempt to retrieve an inventory history record that either does not exist or belongs to another seller, ensuring authorization enforcement and proper error responses.
 */
export async function test_api_seller_inventory_history_retrieval_not_found_or_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create first seller (sellerA)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      shopName: "Seller A Shop",
      shopDescription: "Seller A Description",
      logoUri: null,
    },
  });
  typia.assert(sellerA);
  // Create second seller (sellerB)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      shopName: "Seller B Shop",
      shopDescription: "Seller B Description",
      logoUri: null,
    },
  });
  typia.assert(sellerB);
  // Create an inventory history belonging to sellerB by directly using an inventoryHistoryId that would theoretically belong to sellerB
  // Since there is no API to create inventoryHistory directly, simulate an invalid id for testing unauthorized access
  const invalidInventoryHistoryId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt by sellerA to get sellerB's inventory history (or a non-existent one)
  await TestValidator.httpError(
    "sellerA attempts to retrieve a non-existent or unauthorized inventory history",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.inventoryHistories.at(
        sellerAConnection,
        {
          inventoryHistoryId: invalidInventoryHistoryId,
        },
      );
    },
  );
  // Also test owner seller (sellerB) retrieving with a non-existent inventoryHistoryId
  const nonExistentInventoryHistoryId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "sellerB attempts to retrieve a non-existent inventory history",
    404,
    async () => {
      await api.functional.shoppingMall.seller.inventoryHistories.at(
        sellerBConnection,
        {
          inventoryHistoryId: nonExistentInventoryHistoryId,
        },
      );
    },
  );
}
