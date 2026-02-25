import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_inventory_histories_create } from "../../../generate/generate_random_shopping_mall_seller_inventory_histories_create";
import { prepare_random_shopping_mall_inventory_history } from "../../../prepare/prepare_random_shopping_mall_inventory_history";

export async function test_api_inventory_history_seller_adjustment(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData = typia.random<IShoppingMallSeller.IJoin>();
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerData,
  });
  typia.assert(sellerAuthorized);
  // Create new connection with seller token
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerAuthorized.token.access,
    },
  };
  // Step 2: Create inventory history directly
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const adjustmentQuantity = -10;
  const adjustmentReason = "loss";
  const inventoryHistory =
    await api.functional.shoppingMall.seller.inventory_histories.create(
      sellerAuthConnection,
      {
        body: {
          variant_id: variantId,
          quantity_change: adjustmentQuantity,
          reason: adjustmentReason,
          metadata: JSON.stringify({
            note: "Test inventory adjustment for stock loss",
            adjusted_by: "seller",
            timestamp: new Date().toISOString(),
          }),
        } satisfies IShoppingMallInventoryHistory.ICreate,
      },
    );
  typia.assert(inventoryHistory);
  // Step 3: Validate the inventory history record
  // Using the correct property names from the DTO
  TestValidator.equals(
    "variant_id matches",
    inventoryHistory.variant_id,
    variantId,
  );
  TestValidator.equals("reason is 'loss'", inventoryHistory.reason, [
    adjustmentReason,
  ]);
}
