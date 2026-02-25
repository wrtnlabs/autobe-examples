import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallSellerSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_settings_update_partial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResponse);
  // Use the connection that was updated with token by authorize_seller_join
  // 2. Get current settings to have baseline values
  // Note: There's no GET endpoint provided, so we'll use the join response
  // to get the seller ID and then verify update works
  // 3. Update only specific settings (partial update)
  const updatedSettings =
    await api.functional.shoppingMall.seller.settings.update(sellerConnection, {
      body: {
        font_family: "Arial",
        show_reviews: false,
      } satisfies IShoppingMallSellerSetting.IUpdate,
    });
  typia.assert(updatedSettings);
  // 4. Verify the update
  TestValidator.equals(
    "font_family updated",
    updatedSettings.font_family,
    "Arial",
  );
  TestValidator.equals(
    "show_reviews updated",
    updatedSettings.show_reviews,
    false,
  );
}
