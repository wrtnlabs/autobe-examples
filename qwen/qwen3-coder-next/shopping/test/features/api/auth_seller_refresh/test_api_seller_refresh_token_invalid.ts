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

export async function test_api_seller_refresh_token_invalid(
  connection: api.IConnection,
): Promise<void> {
  // Create seller account with known credentials
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: joinEmail,
        password: joinPassword,
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 3 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(joinResult);
  // Login to establish valid session with refresh token
  const loginResult = await api.functional.shoppingMall.auth.seller.login(
    sellerConnection,
    {
      body: {
        email: joinEmail,
        password: joinPassword,
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(loginResult);
  // Extract the refresh token from the valid session
  const validRefreshToken = loginResult.data.token.refresh;
  // Test Case 1: Invalid format refresh token (malformed JWT)
  await TestValidator.error("invalid format refresh token", async () => {
    await api.functional.shoppingMall.auth.seller.refresh(connection, {
      body: {
        refresh_token: "invalid-token-format",
      } satisfies IShoppingMallSeller.IRefresh,
    });
  });
  // Test Case 2: Tampered refresh token (modify first character)
  const tamperedToken =
    validRefreshToken.length > 1
      ? "X" + validRefreshToken.substring(1)
      : "X" + validRefreshToken;
  await TestValidator.error("tampered refresh token", async () => {
    await api.functional.shoppingMall.auth.seller.refresh(connection, {
      body: {
        refresh_token: tamperedToken,
      } satisfies IShoppingMallSeller.IRefresh,
    });
  });
  // Test Case 3: Completely random token
  await TestValidator.error("random token", async () => {
    await api.functional.shoppingMall.auth.seller.refresh(connection, {
      body: {
        refresh_token: RandomGenerator.alphaNumeric(128),
      } satisfies IShoppingMallSeller.IRefresh,
    });
  });
  // Test Case 4: Empty string token
  await TestValidator.error("empty token", async () => {
    await api.functional.shoppingMall.auth.seller.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies IShoppingMallSeller.IRefresh,
    });
  });
  // Verify valid token still works
  const refreshResult = await api.functional.shoppingMall.auth.seller.refresh(
    connection,
    {
      body: {
        refresh_token: validRefreshToken,
      } satisfies IShoppingMallSeller.IRefresh,
    },
  );
  typia.assert(refreshResult);
  TestValidator.notEquals(
    "new tokens issued",
    refreshResult.data.token.refresh,
    validRefreshToken,
  );
}
