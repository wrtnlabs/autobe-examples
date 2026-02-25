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

export async function test_api_inventory_loss_deduction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@test.com",
      password: "1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Get seller profile to extract seller ID
  const profile = seller.data.profile;
  typia.assert(profile);
  // 3. Create a product variant for inventory testing
  // Since we don't have direct product creation API in this test scope, we'll use the
  // inventory adjustment endpoint which requires a variant_id
  // For testing purposes, we'll create a variant ID using random UUID
  const variantId =
    RandomGenerator.alphaNumeric(8) +
    "-" +
    RandomGenerator.alphaNumeric(4) +
    "-" +
    RandomGenerator.alphaNumeric(4) +
    "-" +
    RandomGenerator.alphaNumeric(4) +
    "-" +
    RandomGenerator.alphaNumeric(12);
  // 4. Perform inventory loss deduction
  const inventoryHistory =
    await api.functional.shoppingMall.seller.inventory_histories.adjustment.adjust(
      sellerConnection,
      {
        body: {
          variant_id: variantId,
          quantity_change: -10,
          reason: "loss",
          metadata: JSON.stringify({
            reason_detail: "Product damaged during storage",
            reported_by: profile.id,
          }),
        } satisfies IShoppingMallInventoryHistory.ICreate,
      },
    );
  typia.assert(inventoryHistory);
  // 5. Validate inventory history record
  TestValidator.equals(
    "variant_id matches",
    inventoryHistory.variant_id,
    variantId,
  );
  // Skip validation of non-existent fields since IShoppingMallInventoryHistory
  // doesn't have quantity_change, id, or created_at properties
  TestValidator.equals("reason is loss", inventoryHistory.reason, ["loss"]);
}
