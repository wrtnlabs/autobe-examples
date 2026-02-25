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
import { generate_random_shopping_mall_seller_inventory_histories_adjustment_adjust } from "../../../generate/generate_random_shopping_mall_seller_inventory_histories_adjustment_adjust";
import { prepare_random_shopping_mall_inventory_history } from "../../../prepare/prepare_random_shopping_mall_inventory_history";

export async function test_api_inventory_restock_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration (setup)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerResponse);
  // 2. Create seller-specific connection with auth token
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: sellerResponse.token.access,
    },
  };
  // 3. Generate a product variant for restocking
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const quantityChange = 50;
  // 4. Perform inventory restock adjustment
  const result =
    await api.functional.shoppingMall.seller.inventory_histories.adjustment.adjust(
      sellerAuthConnection,
      {
        body: {
          variant_id: variantId,
          quantity_change: quantityChange,
          reason: "restock",
          metadata: JSON.stringify({
            restocked_by: "seller1",
            note: "Inventory restocking test",
          }),
        } satisfies IShoppingMallInventoryHistory.ICreate,
      },
    );
  typia.assert(result);
  // 5. Validate restock result
  TestValidator.equals("variant_id matches", result.variant_id, variantId);
  TestValidator.equals(
    "quantity_change is positive",
    (result as any).quantity_change ?? null,
    quantityChange,
  );
  TestValidator.equals("reason is restock", result.reason, ["restock"]);
}