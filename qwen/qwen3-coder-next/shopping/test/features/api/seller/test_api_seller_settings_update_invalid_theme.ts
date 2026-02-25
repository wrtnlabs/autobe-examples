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

export async function test_api_seller_settings_update_invalid_theme(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection for authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register and authenticate seller
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: sellerCredentials,
  });
  typia.assert(authorizedSeller);
  // Update connection with token from authorization
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorizedSeller.token.access,
    },
  };
  // Try to update seller settings with invalid theme_mode value
  const invalidThemeBody = {
    theme_mode: typia.assert<IShoppingMallSellerSetting.IUpdate["theme_mode"]>("blue" as const),
  } as const satisfies IShoppingMallSellerSetting.IUpdate;
  // Should fail with validation error for invalid theme_mode
  await TestValidator.error(
    "should reject invalid theme_mode value",
    async () => {
      await api.functional.shoppingMall.seller.settings.update(
        authenticatedSellerConnection,
        {
          body: invalidThemeBody,
        },
      );
    },
  );
}