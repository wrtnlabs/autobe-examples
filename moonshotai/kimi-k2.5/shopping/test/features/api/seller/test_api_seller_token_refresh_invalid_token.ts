import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test token refresh failure scenarios with invalid or revoked refresh tokens.
 *
 * 1. Test refresh with a completely invalid/non-existent token string
 * 2. Test refresh with a revoked token (previously valid but invalidated after successful refresh)
 *
 * Both scenarios should result in authentication errors rejecting the refresh request.
 */
export async function test_api_seller_token_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Non-existent/invalid refresh token
  const invalidConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "should reject non-existent refresh token",
    async () => {
      await authorize_seller_refresh(invalidConnection, {
        body: {
          refreshToken: RandomGenerator.alphaNumeric(64),
        } satisfies IEcommerceMallSeller.IRefresh,
      });
    },
  );
  // Test 2: Revoked token (token that existed but was invalidated)
  // First, create a seller and get valid tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const originalRefreshToken = seller.token.refresh;
  // Refresh once to get new tokens (this invalidates the original token)
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_seller_refresh(refreshConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IEcommerceMallSeller.IRefresh,
  });
  typia.assert(refreshed);
  // Test that the original token is now revoked and cannot be used again
  const revokedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("should reject revoked refresh token", async () => {
    await authorize_seller_refresh(revokedConnection, {
      body: {
        refreshToken: originalRefreshToken,
      } satisfies IEcommerceMallSeller.IRefresh,
    });
  });
}
