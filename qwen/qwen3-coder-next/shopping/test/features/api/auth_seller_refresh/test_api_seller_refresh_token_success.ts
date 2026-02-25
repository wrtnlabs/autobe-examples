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

export async function test_api_seller_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and establishes initial session
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResult);
  // 2. Seller logs in to establish refresh token session
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: joinResult.data.profile.shop_name + "@test.com",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResult);
  // 3. Extract refresh token from login session
  const refreshToken = loginResult.token.refresh;
  typia.assert(refreshToken);
  // 4. Call refresh endpoint with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshResult);
  // 5. Validate refresh result structure
  TestValidator.equals(
    "new access token exists",
    refreshResult.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "new refresh token exists",
    refreshResult.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate(
    "access token expired_at is date-time format",
    () => {
      typia.assert<string & tags.Format<"date-time">>(refreshResult.token.expired_at);
      return true;
    }
  );
  // 6. Validate seller profile is unchanged
  TestValidator.equals(
    "seller id unchanged",
    refreshResult.data.profile.id,
    loginResult.data.profile.id,
  );
  TestValidator.equals(
    "shop name unchanged",
    refreshResult.data.profile.shop_name,
    loginResult.data.profile.shop_name,
  );
  TestValidator.equals(
    "approval status unchanged",
    refreshResult.data.profile.approval_status,
    loginResult.data.profile.approval_status,
  );
  // 7. Validate metadata
  TestValidator.equals("version is 1.0", refreshResult.meta.version, "1.0");
}