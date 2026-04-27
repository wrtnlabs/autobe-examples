import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller account to obtain initial tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult: IECommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    });
  typia.assert(joinResult);
  const oldAccessToken: string = joinResult.token.access;
  const oldRefreshToken: string = joinResult.token.refresh;
  // 2. Create a new connection for the refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Refresh the token using the refresh utility function
  const refreshResult: IECommerceMallSeller.IAuthorized =
    await authorize_seller_refresh(refreshConnection, {
      body: {
        refreshToken: oldRefreshToken,
      } satisfies IECommerceMallSeller.IRefresh,
    });
  typia.assert(refreshResult);
  // 4. Verify token rotation
  // New refresh token should be different from the old one
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.token.refresh,
    oldRefreshToken,
  );
  // New access token should be different from the old one
  TestValidator.notEquals(
    "access token rotated",
    refreshResult.token.access,
    oldAccessToken,
  );
  // 5. Verify that the OLD refresh token is now invalidated
  // The old refresh token was rotated, so using it again should fail
  const oldRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "old refresh token invalidated",
    401,
    async () =>
      await authorize_seller_refresh(oldRefreshConnection, {
        body: {
          refreshToken: oldRefreshToken,
        } satisfies IECommerceMallSeller.IRefresh,
      }),
  );
  // 6. Verify the new access token is set in the connection headers
  TestValidator.equals(
    "new access token set in connection",
    refreshConnection.headers?.Authorization,
    refreshResult.token.access,
  );
}
