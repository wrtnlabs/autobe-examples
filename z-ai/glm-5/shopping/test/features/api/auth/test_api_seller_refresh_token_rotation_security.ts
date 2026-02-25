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

/**
 * Test seller refresh token rotation security.
 *
 * Validates that refresh tokens are invalidated after use,
 * preventing replay attacks on refresh tokens.
 *
 * 1. Register seller to get initial tokens
 * 2. Store the first refresh token
 * 3. Refresh tokens - get new token pair
 * 4. Validate new tokens differ from old (rotation)
 * 5. Attempt to reuse OLD refresh token - should fail with 401
 */
export async function test_api_seller_refresh_token_rotation_security(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller to get initial tokens
  // Using join endpoint which returns tokens directly
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(sellerConnection, {});
  typia.assert(joinResult);
  // 2. Store the first refresh token
  const firstRefreshToken = joinResult.token.refresh;
  // 3. Refresh tokens using first refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedResult = await authorize_seller_refresh(refreshConnection, {
    body: {
      refreshToken: firstRefreshToken,
    },
  });
  typia.assert(refreshedResult);
  // 4. Validate new tokens differ from old tokens (token rotation)
  TestValidator.notEquals(
    "access token changed after refresh",
    refreshedResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed after refresh",
    refreshedResult.token.refresh,
    firstRefreshToken,
  );
  // 5. Attempt to reuse OLD refresh token - should fail with 401
  // This tests the critical security feature preventing replay attacks
  await TestValidator.httpError(
    "old refresh token rejected (token rotation security)",
    401,
    async () => {
      const reuseConnection: api.IConnection = { host: connection.host };
      await authorize_seller_refresh(reuseConnection, {
        body: {
          refreshToken: firstRefreshToken,
        },
      });
    },
  );
}
