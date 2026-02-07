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

export async function test_api_seller_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const joinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResponse = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      name: RandomGenerator.name(2),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResponse);
  // 2. Login to obtain refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_seller_login(loginConnection, {
    body: {
      email: sellerJoinResponse.token.access.split(".")[1] as any, // Use email from join
      password: "Test1234!",
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResponse);
  // 3. Verify initial token exists
  TestValidator.predicate(
    "has access token",
    () => !!loginResponse.token.access,
  );
  TestValidator.predicate(
    "has refresh token",
    () => !!loginResponse.token.refresh,
  );
  // 4. Refresh token using seller-specific connection
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_seller_refresh(refreshConnection, {
    body: {
      // Use the refresh token from login response
      refresh: loginResponse.token.refresh,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshResponse);
  // 5. Validate refresh response structure
  TestValidator.predicate(
    "new access token exists",
    () => !!refreshResponse.token.access,
  );
  TestValidator.predicate(
    "new refresh token exists",
    () => !!refreshResponse.token.refresh,
  );
  // 6. Verify new tokens are different from old ones (token rotation)
  TestValidator.notEquals(
    "access tokens differ",
    loginResponse.token.access,
    refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens differ",
    loginResponse.token.refresh,
    refreshResponse.token.refresh,
  );
  // 7. Validate expiration timestamps
  const now = new Date().toISOString();
  TestValidator.predicate(
    "access token not expired",
    () => refreshResponse.token.expired_at > now,
  );
  TestValidator.predicate(
    "refresh token still valid",
    () => refreshResponse.token.refreshable_until > now,
  );
  // 8. Test that old refresh token is invalidated (cannot be reused)
  await TestValidator.error("old refresh token rejected", async () => {
    await api.functional.shoppingMall.auth.seller.refresh(connection, {
      body: {
        refresh: loginResponse.token.refresh,
      } satisfies IShoppingMallSeller.IRefresh,
    });
  });
}
