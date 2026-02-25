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

export async function test_api_seller_inventory_history_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create first seller connection
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await api.functional.shoppingMall.auth.seller.join(
    seller1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: `Seller1 Shop ${RandomGenerator.name()}`,
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller1);
  // Create second seller connection
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await api.functional.shoppingMall.auth.seller.join(
    seller2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: `Seller2 Shop ${RandomGenerator.name()}`,
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller2);
  // Try to access another seller's variant inventory history (should fail with 403)
  const invalidVariantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "access another seller's variant should fail",
    async () => {
      await api.functional.shoppingMall.seller.inventory_history.variants.index(
        seller1Connection,
        {
          variantId: invalidVariantId,
          body: {},
        },
      );
    },
  );
  // Try to access non-existent variant ID (should fail with 404)
  const nonExistentVariantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "access non-existent variant should fail",
    async () => {
      await api.functional.shoppingMall.seller.inventory_history.variants.index(
        seller1Connection,
        {
          variantId: nonExistentVariantId,
          body: {},
        },
      );
    },
  );
}
