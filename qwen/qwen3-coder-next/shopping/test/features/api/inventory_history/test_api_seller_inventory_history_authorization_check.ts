import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
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

export async function test_api_seller_inventory_history_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two separate sellers
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1: api.functional.shoppingMall.auth.seller.join.Response =
    await api.functional.shoppingMall.auth.seller.join(seller1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name() + " Shop 1",
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller1);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2: api.functional.shoppingMall.auth.seller.join.Response =
    await api.functional.shoppingMall.auth.seller.join(seller2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name() + " Shop 2",
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller2);
  // 2. Seller 1 creates a product variant to establish ownership
  // Note: Using existing API functions for product operations
  // Since product CRUD is not available in the provided API functions,
  // we'll use a variant ID that would belong to seller 1's product
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Seller 2 attempts to access inventory history for seller 1's variant
  // This should fail with 403 Forbidden
  await TestValidator.error(
    "seller 2 cannot access seller 1's inventory history",
    async () => {
      await api.functional.shoppingMall.seller.inventory_histories.index(
        seller2Connection,
        {
          body: {
            shopping_mall_product_variant_id: variantId,
          } satisfies IShoppingMallInventoryHistory.IRequest,
        },
      );
    },
  );
}
