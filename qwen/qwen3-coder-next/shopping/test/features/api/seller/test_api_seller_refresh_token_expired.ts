import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
  // 1. Create seller account
  const sellerJoinInput = {
    name: "Test Seller",
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shopName: "Test Shop",
    shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallSeller.IJoin;
  const joinResult = await api.functional.shoppingMall.auth.seller.join(
    connection,
    {
      body: sellerJoinInput,
    },
  );
  typia.assert(joinResult);
  // 2. Login to obtain tokens
  const sellerLoginInput = {
    email: sellerJoinInput.email,
    password: sellerJoinInput.password,
  } satisfies IShoppingMallSeller.ILogin;
  const loginResult = await api.functional.shoppingMall.auth.seller.login(
    connection,
    {
      body: sellerLoginInput,
    },
  );
  typia.assert(loginResult);
  // 3. Simulate expired refresh token by using an old/invalid token
  // The refresh endpoint should reject any token that has exceeded its refreshable_until deadline
  const expiredRefreshToken =
    "expired-refresh-token-" + RandomGenerator.alphaNumeric(32);
  const refreshInput = {
    refresh: expiredRefreshToken,
  } satisfies IShoppingMallSeller.IRefresh;
  // 4. Try to refresh with expired token - expect failure
  await TestValidator.error("should reject expired refresh token", async () => {
    await api.functional.shoppingMall.auth.seller.refresh(connection, {
      body: refreshInput,
    });
  });
  // 5. Verify seller must re-authenticate with credentials to get new tokens
  const newLoginResult = await api.functional.shoppingMall.auth.seller.login(
    connection,
    {
      body: sellerLoginInput,
    },
  );
  typia.assert(newLoginResult);
  // 6. New login should provide fresh tokens (different from original)
  TestValidator.notEquals(
    "new access token different from original",
    newLoginResult.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token different from original",
    newLoginResult.token.refresh,
    loginResult.token.refresh,
  );
}
