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

export async function test_api_inventory_adjustment_with_metadata(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url:
        Math.random() > 0.5
          ? null
          : typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create new connection with seller token
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  sellerAuthConnection.headers = {
    authorization: seller.token.access,
  };
  // 2. Perform inventory adjustment with metadata
  const adjustment =
    await api.functional.shoppingMall.seller.inventory_histories.adjustment.adjust(
      sellerAuthConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity_change: 5,
          reason: "adjustment",
          metadata: JSON.stringify({
            adjustment_notes: "Stock correction due to physical count",
            reference_number: `REF-${RandomGenerator.alphaNumeric(8)}`,
            adjusted_by: "inventory_manager",
          }),
        } satisfies IShoppingMallInventoryHistory.ICreate,
      },
    );
  typia.assert(adjustment);
  // 3. Validate adjustment results
  TestValidator.equals("reason is adjustment", adjustment.reason, [
    "adjustment",
  ]);
  TestValidator.predicate(
    "variant_id exists",
    adjustment.variant_id !== undefined,
  );
  TestValidator.predicate(
    "variant_id is valid uuid",
    adjustment.variant_id !== undefined &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        adjustment.variant_id,
      ),
  );
}
