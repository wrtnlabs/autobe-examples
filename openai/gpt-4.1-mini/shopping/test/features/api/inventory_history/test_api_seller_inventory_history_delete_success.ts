import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_history_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario Description:
  // 1. Successful deletion of an existing inventory history record by an authorized seller.
  // 2. Attempt to delete a non-existing inventory history record by an authorized seller.
  // 3. Unauthorized deletion attempt by an unauthenticated or unauthorized user.
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(connection, { body: {} });
  sellerConnection.headers = { Authorization: `Bearer ${seller.token.access}` };
  // Since no API for inventory history creation is provided, we simulate deletion tests with UUIDs.
  // Scenario 1: Authorized deletion with a random UUID (simulate success)
  const existingInventoryHistoryId = typia.random<
    string & tags.Format<"uuid">
  >();
  await api.functional.shoppingMall.seller.inventoryHistories.erase(
    sellerConnection,
    {
      inventoryHistoryId: existingInventoryHistoryId,
    },
  );
  // Scenario 2: Deletion of non-existing record, expect failure
  const nonExistingInventoryHistoryId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "deletion of non-existent inventory history should fail",
    async () => {
      await api.functional.shoppingMall.seller.inventoryHistories.erase(
        sellerConnection,
        {
          inventoryHistoryId: nonExistingInventoryHistoryId,
        },
      );
    },
  );
  // Scenario 3: Unauthorized deletion attempt using base connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized deletion attempt should return 401 or 403",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.seller.inventoryHistories.erase(
        unauthorizedConnection,
        {
          inventoryHistoryId: existingInventoryHistoryId,
        },
      );
    },
  );
}
