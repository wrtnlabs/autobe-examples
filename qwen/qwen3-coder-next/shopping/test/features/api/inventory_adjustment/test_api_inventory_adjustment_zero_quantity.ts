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
import { generate_random_shopping_mall_seller_inventory_adjust_adjust_inventory } from "../../../generate/generate_random_shopping_mall_seller_inventory_adjust_adjust_inventory";
import { prepare_random_shopping_mall_inventory_history } from "../../../prepare/prepare_random_shopping_mall_inventory_history";

export async function test_api_inventory_adjustment_zero_quantity(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection for login
  const sellerConnection: api.IConnection = { host: connection.host };
  // Login as seller (seller account should already exist in database)
  const seller = await api.functional.shoppingMall.auth.seller.login(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(seller);
  // Create new connection with seller token for authenticated requests
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  sellerAuthConnection.headers = { Authorization: seller.token.access };
  // Test 1: Attempt inventory adjustment with zero quantity (should fail validation)
  const variantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("zero quantity should be rejected", async () => {
    await api.functional.shoppingMall.seller.inventory.adjust.adjustInventory(
      sellerAuthConnection,
      {
        body: {
          variant_id: variantId,
          quantity_change: 0, // Zero quantity should be rejected
          reason: "test adjustment",
        } satisfies IShoppingMallInventoryHistory.ICreate,
      },
    );
  });
  // Test 2: Attempt inventory adjustment with negative quantity (should also be rejected)
  await TestValidator.error(
    "negative quantity should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.inventory.adjust.adjustInventory(
        sellerAuthConnection,
        {
          body: {
            variant_id: variantId,
            quantity_change: -5, // Negative quantity should be rejected
            reason: "test negative adjustment",
          } satisfies IShoppingMallInventoryHistory.ICreate,
        },
      );
    },
  );
}
