import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_seller_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const registered = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: sellerCredentials,
    },
  );
  typia.assert(registered);
  // Step 2: Login seller to establish session with tokens
  const loginCredentials = {
    email: sellerCredentials.email,
    password: sellerCredentials.password,
  } satisfies IShoppingMallSeller.ILogin;
  const loggedin = await api.functional.shoppingMall.auth.seller.login(
    sellerConnection,
    {
      body: loginCredentials,
    },
  );
  typia.assert(loggedin);
  // Step 3: Test refresh with invalid token (simulating expired token scenario)
  const invalidRefreshToken = "invalid.token.data";
  // Step 4: Attempt refresh with invalid token should fail
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.shoppingMall.auth.seller.refresh(sellerConnection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );
  // Step 5: Verify that the seller account still exists and can login again
  const reLogin = await api.functional.shoppingMall.auth.seller.login(
    sellerConnection,
    {
      body: loginCredentials,
    },
  );
  typia.assert(reLogin);
  TestValidator.equals(
    "seller ID matches",
    reLogin.data.profile.id,
    registered.data.profile.id,
  );
}
